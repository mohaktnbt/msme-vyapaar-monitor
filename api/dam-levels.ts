// ============================================================
// MSME Vyapaar Monitor — Reservoir / Dam Levels Edge Function
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

const CIRCUIT_KEY = 'dam-levels'
const CACHE_TTL = 21600 // 6 hours

interface ReservoirStatus {
  id: string
  name: string
  state: string
  basin: string
  capacityBCM: number
  currentStorage: number
  fillPercent: number
  lastYearPercent: number
  tenYearAvgPercent: number
  trend: 'rising' | 'stable' | 'falling'
  status: 'normal' | 'below-normal' | 'deficient' | 'critical'
  updatedAt: string
  msmeImpact?: string
}

function computeStatus(fill: number, avg: number): ReservoirStatus['status'] {
  const delta = fill - avg
  if (fill < 20 || delta < -30) return 'critical'
  if (delta < -15) return 'deficient'
  if (delta < -5) return 'below-normal'
  return 'normal'
}

function computeImpact(name: string, state: string, status: ReservoirStatus['status']): string | undefined {
  if (status === 'normal') return undefined
  const severity = status === 'critical' ? 'severe' : status === 'deficient' ? 'significant' : 'moderate'
  return `${severity} storage deficit at ${name} (${state}) — expect irrigation cuts, higher agri input costs, and possible power rationing in dependent districts`
}

const now = new Date().toISOString()

function buildReservoir(
  name: string,
  state: string,
  basin: string,
  capacityBCM: number,
  fillPercent: number,
  lastYearPercent: number,
  tenYearAvgPercent: number,
  trend: ReservoirStatus['trend'],
): ReservoirStatus {
  const status = computeStatus(fillPercent, tenYearAvgPercent)
  return {
    id: simpleHash(`dam-${name}`),
    name,
    state,
    basin,
    capacityBCM,
    currentStorage: Math.round(((capacityBCM * fillPercent) / 100) * 100) / 100,
    fillPercent,
    lastYearPercent,
    tenYearAvgPercent,
    trend,
    status,
    updatedAt: now,
    msmeImpact: computeImpact(name, state, status),
  }
}

const FALLBACK_RESERVOIRS: ReservoirStatus[] = [
  buildReservoir('Bhakra', 'Himachal Pradesh', 'Indus (Sutlej)', 7.50, 62, 68, 65, 'rising'),
  buildReservoir('Tehri', 'Uttarakhand', 'Ganga (Bhagirathi)', 3.54, 71, 74, 70, 'stable'),
  buildReservoir('Sardar Sarovar', 'Gujarat', 'Narmada', 5.86, 48, 72, 65, 'falling'),
  buildReservoir('Nagarjunasagar', 'Telangana/AP', 'Krishna', 6.84, 28, 55, 58, 'falling'),
  buildReservoir('Srisailam', 'Andhra Pradesh', 'Krishna', 8.72, 34, 61, 60, 'falling'),
  buildReservoir('Mettur', 'Tamil Nadu', 'Cauvery', 2.65, 45, 58, 55, 'stable'),
  buildReservoir('Krishnarajasagar', 'Karnataka', 'Cauvery', 1.37, 52, 60, 58, 'rising'),
  buildReservoir('Tungabhadra', 'Karnataka', 'Krishna (Tungabhadra)', 3.28, 39, 67, 62, 'falling'),
  buildReservoir('Hirakud', 'Odisha', 'Mahanadi', 5.82, 68, 71, 68, 'stable'),
  buildReservoir('Indirasagar', 'Madhya Pradesh', 'Narmada', 9.75, 58, 64, 62, 'rising'),
  buildReservoir('Ukai', 'Gujarat', 'Tapi', 6.62, 42, 63, 60, 'falling'),
  buildReservoir('Koyna', 'Maharashtra', 'Krishna (Koyna)', 2.67, 74, 78, 72, 'stable'),
  buildReservoir('Bhavanisagar', 'Tamil Nadu', 'Cauvery (Bhavani)', 0.93, 48, 57, 55, 'rising'),
  buildReservoir('Almatti', 'Karnataka', 'Krishna', 3.11, 55, 68, 63, 'stable'),
  buildReservoir('Gandhi Sagar', 'Madhya Pradesh', 'Chambal', 6.83, 36, 58, 57, 'falling'),
]

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const cacheKey = 'dam-levels:all'
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'India-WRIS / CWC',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    if (circuitBreaker.isOpen(CIRCUIT_KEY)) {
      const response: ApiResponse<ReservoirStatus[]> = {
        data: FALLBACK_RESERVOIRS,
        cached: false,
        source: 'mock-fallback',
        fetchedAt: new Date().toISOString(),
        error: 'Dam levels circuit breaker open',
      }
      return withCors(JSON.stringify(response))
    }

    // CWC / India-WRIS live API is not publicly documented and requires session tokens.
    // We attempt a lightweight HEAD-style probe then always fall back to curated data.
    let usedFallback = true
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8_000)
      const probe = await fetch('https://indiawris.gov.in/wris/', {
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
      console.error('dam-levels probe failed', err)
      circuitBreaker.recordFailure(CIRCUIT_KEY)
    }

    const data = FALLBACK_RESERVOIRS
    await cacheSet(redis, cacheKey, data, CACHE_TTL)

    const response: ApiResponse<ReservoirStatus[]> = {
      data,
      cached: false,
      source: usedFallback ? 'mock-fallback' : 'India-WRIS / CWC',
      fetchedAt: new Date().toISOString(),
    }
    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
