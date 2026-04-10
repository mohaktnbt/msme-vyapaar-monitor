// ============================================================
// MSME Vyapaar Monitor — NHAI / Transport Projects Edge Function
// ============================================================

import type { ApiResponse } from '../src/types/index.js'
import {
  corsHeaders,
  withCors,
  errorResponse,
  getRedisClient,
  cacheGet,
  cacheSet,
  circuitBreaker,
  simpleHash,
} from './_utils.js'

export const config = { runtime: 'edge' }

const CIRCUIT_KEY = 'transport-projects'
const CACHE_TTL = 86400 // 24 hours

interface TransportProject {
  id: string
  name: string
  type: 'highway' | 'expressway' | 'rail' | 'metro' | 'port' | 'airport'
  states: string[]
  districts: string[]
  status: 'announced' | 'bidding' | 'awarded' | 'in-progress' | 'delayed' | 'completed'
  valueCr: number
  contractor?: string
  lengthKm?: number
  startDate?: string
  expectedCompletion?: string
  progressPct?: number
  supplierOpportunities: string[]
}

function proj(
  name: string,
  type: TransportProject['type'],
  states: string[],
  districts: string[],
  status: TransportProject['status'],
  valueCr: number,
  contractor: string | undefined,
  lengthKm: number | undefined,
  startDate: string | undefined,
  expectedCompletion: string | undefined,
  progressPct: number | undefined,
  supplierOpportunities: string[],
): TransportProject {
  return {
    id: simpleHash(`transport-${name}`),
    name,
    type,
    states,
    districts,
    status,
    valueCr,
    contractor,
    lengthKm,
    startDate,
    expectedCompletion,
    progressPct,
    supplierOpportunities,
  }
}

const FALLBACK_PROJECTS: TransportProject[] = [
  proj(
    'Delhi-Mumbai Expressway',
    'expressway',
    ['Delhi', 'Haryana', 'Rajasthan', 'Madhya Pradesh', 'Gujarat', 'Maharashtra'],
    ['Gurugram', 'Dausa', 'Kota', 'Ratlam', 'Vadodara', 'Thane'],
    'in-progress',
    98_000,
    'L&T / Dilip Buildcon / APCO',
    1_386,
    '2019-03-09',
    '2026-12-31',
    78,
    ['cement', 'steel', 'aggregates', 'bitumen', 'earthwork', 'machinery-rental', 'signage'],
  ),
  proj(
    'Bengaluru-Chennai Expressway',
    'expressway',
    ['Karnataka', 'Andhra Pradesh', 'Tamil Nadu'],
    ['Bengaluru Rural', 'Chittoor', 'Kanchipuram'],
    'in-progress',
    17_930,
    'KNR Constructions / Sadbhav / GR Infra',
    262,
    '2021-05-01',
    '2026-06-30',
    65,
    ['cement', 'steel', 'aggregates', 'ready-mix-concrete', 'earthwork'],
  ),
  proj(
    'Bharatmala Phase-2 (selected corridors)',
    'highway',
    ['Pan-India'],
    [],
    'awarded',
    3_40_000,
    'Multiple',
    8_000,
    '2025-04-01',
    '2030-03-31',
    12,
    ['cement', 'steel', 'aggregates', 'bitumen', 'labour', 'machinery-rental', 'diesel'],
  ),
  proj(
    'Delhi-Amritsar-Katra Expressway',
    'expressway',
    ['Haryana', 'Punjab', 'Jammu & Kashmir'],
    ['Jhajjar', 'Patiala', 'Gurdaspur', 'Kathua'],
    'in-progress',
    39_500,
    'IRB Infrastructure / DBL',
    670,
    '2022-01-15',
    '2027-03-31',
    48,
    ['cement', 'steel', 'aggregates', 'earthwork', 'bitumen'],
  ),
  proj(
    'Chennai-Salem Expressway',
    'expressway',
    ['Tamil Nadu'],
    ['Kanchipuram', 'Tiruvannamalai', 'Salem'],
    'bidding',
    10_000,
    undefined,
    277,
    undefined,
    '2029-06-30',
    0,
    ['cement', 'steel', 'aggregates', 'earthwork', 'machinery-rental'],
  ),
  proj(
    'Varanasi-Kolkata Expressway',
    'expressway',
    ['Uttar Pradesh', 'Bihar', 'Jharkhand', 'West Bengal'],
    ['Chandauli', 'Gaya', 'Dhanbad', 'Howrah'],
    'awarded',
    28_500,
    'NHAI EPC package awarded',
    610,
    '2025-06-01',
    '2028-12-31',
    8,
    ['cement', 'steel', 'aggregates', 'bitumen', 'earthwork', 'diesel'],
  ),
  proj(
    'Mumbai-Ahmedabad High Speed Rail (Bullet Train)',
    'rail',
    ['Maharashtra', 'Gujarat'],
    ['Mumbai', 'Thane', 'Valsad', 'Surat', 'Vadodara', 'Ahmedabad'],
    'in-progress',
    1_08_000,
    'L&T / Afcons / JICA',
    508,
    '2017-09-14',
    '2028-08-15',
    42,
    ['precast-concrete', 'steel', 'cement', 'specialty-bearings', 'electrical', 'signalling'],
  ),
  proj(
    'Dedicated Freight Corridor — Eastern',
    'rail',
    ['Punjab', 'Haryana', 'Uttar Pradesh', 'Bihar', 'Jharkhand', 'West Bengal'],
    [],
    'in-progress',
    81_000,
    'DFCCIL',
    1_337,
    '2015-01-01',
    '2026-03-31',
    92,
    ['rails', 'ballast', 'sleepers', 'electrical', 'signalling'],
  ),
  proj(
    'Bengaluru Metro Phase 3',
    'metro',
    ['Karnataka'],
    ['Bengaluru Urban'],
    'awarded',
    15_611,
    'BMRCL',
    44,
    '2025-08-01',
    '2029-12-31',
    5,
    ['cement', 'steel', 'precast', 'tunneling-services', 'electrical'],
  ),
  proj(
    'Vadhavan Port (Maharashtra)',
    'port',
    ['Maharashtra'],
    ['Palghar'],
    'announced',
    76_220,
    undefined,
    undefined,
    '2026-03-01',
    '2034-12-31',
    2,
    ['cement', 'steel', 'marine-works', 'dredging', 'aggregates'],
  ),
  proj(
    'Noida International Airport (Jewar)',
    'airport',
    ['Uttar Pradesh'],
    ['Gautam Buddh Nagar'],
    'in-progress',
    29_650,
    'Zurich Airport International',
    undefined,
    '2021-11-25',
    '2026-09-30',
    82,
    ['cement', 'steel', 'glass', 'hvac', 'electrical', 'interiors'],
  ),
  proj(
    'Navi Mumbai International Airport',
    'airport',
    ['Maharashtra'],
    ['Raigad'],
    'in-progress',
    16_700,
    'Adani Airport Holdings',
    undefined,
    '2022-08-01',
    '2026-12-31',
    74,
    ['cement', 'steel', 'glass', 'hvac', 'electrical', 'runway-materials'],
  ),
]

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const cacheKey = 'transport-projects:all'
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'NHAI / DFCCIL / MoRTH',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    if (circuitBreaker.isOpen(CIRCUIT_KEY)) {
      const response: ApiResponse<TransportProject[]> = {
        data: FALLBACK_PROJECTS,
        cached: false,
        source: 'mock-fallback',
        fetchedAt: new Date().toISOString(),
        error: 'Transport projects circuit breaker open',
      }
      return withCors(JSON.stringify(response))
    }

    let usedFallback = true
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8_000)
      const probe = await fetch('https://nhai.gov.in/', {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)' },
      })
      clearTimeout(timeoutId)
      if (probe.ok) {
        circuitBreaker.recordSuccess(CIRCUIT_KEY)
      } else {
        circuitBreaker.recordFailure(CIRCUIT_KEY)
      }
    } catch (err) {
      console.error('transport-projects probe failed', err)
      circuitBreaker.recordFailure(CIRCUIT_KEY)
    }

    await cacheSet(redis, cacheKey, FALLBACK_PROJECTS, CACHE_TTL)

    const response: ApiResponse<TransportProject[]> = {
      data: FALLBACK_PROJECTS,
      cached: false,
      source: usedFallback ? 'mock-fallback' : 'NHAI / DFCCIL / MoRTH',
      fetchedAt: new Date().toISOString(),
    }
    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
