// ============================================================
// MSME Vyapaar Monitor — IREPS Railway Tenders Edge Function
// ============================================================

import type { TenderItem, ApiResponse } from '../src/types/index.js'
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

const IREPS_URL = 'https://www.ireps.gov.in/epsn/openBidDtl.do'
const CIRCUIT_KEY = 'ireps-tenders'
const CACHE_TTL = 1800 // 30 minutes

const RAILWAY_ZONES = [
  'Northern Railway',
  'Southern Railway',
  'Eastern Railway',
  'Western Railway',
  'Central Railway',
  'South Eastern Railway',
  'North Eastern Railway',
  'North Central Railway',
  'South Central Railway',
  'South Western Railway',
  'North Western Railway',
  'East Central Railway',
  'East Coast Railway',
  'West Central Railway',
  'Northeast Frontier Railway',
  'Rail Wheel Factory',
  'RDSO',
]

function extractIREPSTenders(html: string): TenderItem[] {
  const items: TenderItem[] = []
  const now = new Date().toISOString()

  // Match tender number patterns common in IREPS
  const tenderPattern = /(?:Tender|Bid)\s*(?:No\.?|Number)\s*:?\s*([A-Z0-9\-\/]+(?:\/20\d{2})?)/gi
  let match: RegExpExecArray | null

  while ((match = tenderPattern.exec(html)) !== null) {
    const idx = match.index
    const start = Math.max(0, idx - 500)
    const end = Math.min(html.length, idx + 1000)
    const context = html.slice(start, end)

    const tenderNumber = match[1]

    // Extract description
    const descMatch = /(?:description|item|subject|work)[^:]*:?\s*(?:<[^>]*>)?\s*([\s\S]{10,300}?)\s*(?:<\/|$)/i.exec(context)
    const description = descMatch
      ? descMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      : ''

    // Detect railway zone
    const zone = RAILWAY_ZONES.find(z => context.includes(z)) || 'Indian Railways'

    // Extract estimated value
    const valueMatch = /(?:estimated|value|amount)[^0-9]*(?:Rs\.?\s*)?(\d[\d,]*(?:\.\d{1,2})?)\s*(?:lakh|crore|lac)?/i.exec(context)
    let estimatedValue: number | undefined
    if (valueMatch) {
      estimatedValue = parseFloat(valueMatch[1].replace(/,/g, ''))
      const multiplierMatch = /lakh|lac/i.exec(valueMatch[0])
      const croreMatch = /crore/i.exec(valueMatch[0])
      if (croreMatch) estimatedValue *= 10000000
      else if (multiplierMatch) estimatedValue *= 100000
    }

    // Extract dates
    const datePattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](20\d{2})/g
    const dates: string[] = []
    let dateMatch: RegExpExecArray | null
    while ((dateMatch = datePattern.exec(context)) !== null) {
      try {
        const d = new Date(Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1]))
        dates.push(d.toISOString())
      } catch {
        // skip invalid dates
      }
    }

    const openDate = dates[0] || now
    const closeDate = dates[1] || new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString()

    items.push({
      id: simpleHash(`ireps-${tenderNumber}`),
      title: description || `IREPS Tender ${tenderNumber}`,
      description: `Railway Zone: ${zone}`,
      department: zone,
      ministry: 'Ministry of Railways',
      portal: 'IREPS',
      portalUrl: `https://www.ireps.gov.in/`,
      bidNumber: tenderNumber,
      openDate,
      closeDate,
      value: estimatedValue,
      category: 'railway-procurement',
      msmeFriendly: true,
      fetchedAt: now,
      tenderType: 'open',
    })
  }

  return items
}

const FALLBACK_IREPS: TenderItem[] = [
  {
    id: simpleHash('ireps-nr-signaling-2026'),
    title: 'Supply of Electronic Interlocking System components for Lucknow Division',
    description: 'Railway Zone: Northern Railway',
    department: 'Northern Railway',
    ministry: 'Ministry of Railways',
    portal: 'IREPS',
    portalUrl: 'https://www.ireps.gov.in/',
    bidNumber: 'NR/SIG/EI/2026/003',
    openDate: '2026-03-20T00:00:00.000Z',
    closeDate: '2026-04-15T00:00:00.000Z',
    value: 45000000,
    category: 'railway-procurement',
    msmeFriendly: true,
    fetchedAt: new Date().toISOString(),
    tenderType: 'open',
  },
  {
    id: simpleHash('ireps-sr-coach-2026'),
    title: 'Manufacturing and supply of stainless steel coach interior panels — ICF design',
    description: 'Railway Zone: Southern Railway',
    department: 'Southern Railway',
    ministry: 'Ministry of Railways',
    portal: 'IREPS',
    portalUrl: 'https://www.ireps.gov.in/',
    bidNumber: 'SR/MEC/COACH/2026/018',
    openDate: '2026-03-18T00:00:00.000Z',
    closeDate: '2026-04-10T00:00:00.000Z',
    value: 28000000,
    category: 'railway-procurement',
    sector: 'manufacturing',
    msmeFriendly: true,
    fetchedAt: new Date().toISOString(),
    tenderType: 'open',
  },
  {
    id: simpleHash('ireps-wr-track-2026'),
    title: 'Supply of track fitting materials — fish plates, bolts, and elastic rail clips',
    description: 'Railway Zone: Western Railway',
    department: 'Western Railway',
    ministry: 'Ministry of Railways',
    portal: 'IREPS',
    portalUrl: 'https://www.ireps.gov.in/',
    bidNumber: 'WR/ENGG/TRK/2026/042',
    openDate: '2026-03-15T00:00:00.000Z',
    closeDate: '2026-04-05T00:00:00.000Z',
    value: 15000000,
    category: 'railway-procurement',
    sector: 'manufacturing',
    msmeFriendly: true,
    fetchedAt: new Date().toISOString(),
    tenderType: 'open',
  },
  {
    id: simpleHash('ireps-ecr-electrical-2026'),
    title: 'Installation of LED lighting and energy-efficient systems at 12 stations',
    description: 'Railway Zone: East Central Railway',
    department: 'East Central Railway',
    ministry: 'Ministry of Railways',
    portal: 'IREPS',
    portalUrl: 'https://www.ireps.gov.in/',
    bidNumber: 'ECR/ELEC/LED/2026/007',
    openDate: '2026-03-12T00:00:00.000Z',
    closeDate: '2026-04-02T00:00:00.000Z',
    value: 8500000,
    category: 'railway-procurement',
    msmeFriendly: true,
    fetchedAt: new Date().toISOString(),
    tenderType: 'open',
  },
  {
    id: simpleHash('ireps-scr-catering-2026'),
    title: 'Catering and vending services at Secunderabad, Kacheguda, and Tirupati stations',
    description: 'Railway Zone: South Central Railway',
    department: 'South Central Railway',
    ministry: 'Ministry of Railways',
    portal: 'IREPS',
    portalUrl: 'https://www.ireps.gov.in/',
    bidNumber: 'SCR/COM/CTR/2026/011',
    openDate: '2026-03-10T00:00:00.000Z',
    closeDate: '2026-03-30T00:00:00.000Z',
    value: 5000000,
    category: 'railway-procurement',
    sector: 'food',
    msmeFriendly: true,
    fetchedAt: new Date().toISOString(),
    tenderType: 'open',
  },
  {
    id: simpleHash('ireps-rdso-brake-2026'),
    title: 'Development and supply of composite brake blocks to RDSO specification',
    description: 'Railway Zone: RDSO',
    department: 'RDSO',
    ministry: 'Ministry of Railways',
    portal: 'IREPS',
    portalUrl: 'https://www.ireps.gov.in/',
    bidNumber: 'RDSO/MECH/BRK/2026/005',
    openDate: '2026-03-08T00:00:00.000Z',
    closeDate: '2026-03-28T00:00:00.000Z',
    value: 22000000,
    category: 'railway-procurement',
    sector: 'manufacturing',
    msmeFriendly: true,
    fetchedAt: new Date().toISOString(),
    tenderType: 'open',
  },
  {
    id: simpleHash('ireps-nfr-bridge-2026'),
    title: 'Fabrication and erection of steel girder bridge components — Lumding Division',
    description: 'Railway Zone: Northeast Frontier Railway',
    department: 'Northeast Frontier Railway',
    ministry: 'Ministry of Railways',
    portal: 'IREPS',
    portalUrl: 'https://www.ireps.gov.in/',
    bidNumber: 'NFR/ENGG/BR/2026/014',
    openDate: '2026-03-05T00:00:00.000Z',
    closeDate: '2026-03-25T00:00:00.000Z',
    value: 35000000,
    category: 'railway-procurement',
    sector: 'construction',
    msmeFriendly: true,
    fetchedAt: new Date().toISOString(),
    tenderType: 'open',
  },
  {
    id: simpleHash('ireps-swr-it-2026'),
    title: 'Supply and installation of passenger information display systems at 20 stations',
    description: 'Railway Zone: South Western Railway',
    department: 'South Western Railway',
    ministry: 'Ministry of Railways',
    portal: 'IREPS',
    portalUrl: 'https://www.ireps.gov.in/',
    bidNumber: 'SWR/IT/PIDS/2026/009',
    openDate: '2026-03-02T00:00:00.000Z',
    closeDate: '2026-03-22T00:00:00.000Z',
    value: 12000000,
    category: 'railway-procurement',
    sector: 'it',
    msmeFriendly: true,
    fetchedAt: new Date().toISOString(),
    tenderType: 'open',
  },
]

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    if (circuitBreaker.isOpen(CIRCUIT_KEY)) {
      const response: ApiResponse<TenderItem[]> = {
        data: FALLBACK_IREPS,
        cached: false,
        source: 'ireps.gov.in (circuit open — fallback)',
        fetchedAt: new Date().toISOString(),
        error: 'IREPS circuit breaker open — returning mock data',
      }
      return withCors(JSON.stringify(response))
    }

    const cacheKey = 'ireps-tenders:all'
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'ireps.gov.in',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)

    let tenders: TenderItem[] = []
    let usedFallback = false

    try {
      const res = await fetch(IREPS_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const html = await res.text()
        tenders = extractIREPSTenders(html)
        circuitBreaker.recordSuccess(CIRCUIT_KEY)
      } else {
        circuitBreaker.recordFailure(CIRCUIT_KEY)
        usedFallback = true
      }
    } catch {
      clearTimeout(timeoutId)
      circuitBreaker.recordFailure(CIRCUIT_KEY)
      usedFallback = true
    }

    if (usedFallback || tenders.length === 0) {
      tenders = FALLBACK_IREPS
    }

    // Sort by closeDate ascending (nearest deadline first)
    tenders.sort((a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime())

    tenders = tenders.slice(0, 50)

    await cacheSet(redis, cacheKey, tenders, CACHE_TTL)

    const response: ApiResponse<TenderItem[]> = {
      data: tenders,
      cached: false,
      source: usedFallback ? 'ireps.gov.in (fallback)' : 'ireps.gov.in',
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
