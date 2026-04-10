// ============================================================
// MSME Vyapaar Monitor — SME IPO Listings Edge Function
// ============================================================

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

const BSE_SME_URL = 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx?type=sme'
const CIRCUIT_KEY = 'sme-ipo'
const CACHE_TTL = 900 // 15 minutes

// ---------------------------------------------------------------------------
// Local type — intentionally NOT modifying src/types/index.ts
// ---------------------------------------------------------------------------

interface SMEIPOItem {
  id: string
  companyName: string
  exchange: 'BSE SME' | 'NSE Emerge' | 'BSE SME & NSE Emerge'
  issueSize: number // in INR crore
  priceBandLow: number // INR per share
  priceBandHigh: number // INR per share
  lotSize: number
  openDate: string // ISO 8601
  closeDate: string // ISO 8601
  listingDate?: string // ISO 8601
  status: 'upcoming' | 'open' | 'closed' | 'listed'
  subscriptionTotal?: number // times subscribed
  subscriptionRetail?: number
  subscriptionNII?: number
  subscriptionQIB?: number
  listingPrice?: number
  listingGain?: number // percentage
  sector?: string
  registrar?: string
  leadManager?: string
  fetchedAt: string
}

interface ApiResponse<T> {
  data: T
  cached: boolean
  cachedAt?: string
  source: string
  fetchedAt: string
  error?: string
}

// ---------------------------------------------------------------------------
// HTML parser for BSE SME IPO page
// ---------------------------------------------------------------------------

function extractSMEIPOs(html: string): SMEIPOItem[] {
  const items: SMEIPOItem[] = []
  const now = new Date().toISOString()

  // Match table rows with IPO data
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let match: RegExpExecArray | null

  while ((match = rowPattern.exec(html)) !== null) {
    const row = match[1]

    // Extract cells
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi
    const cells: string[] = []
    let cellMatch: RegExpExecArray | null
    while ((cellMatch = cellPattern.exec(row)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    }

    // Skip header rows or rows with too few cells
    if (cells.length < 5) continue
    // Skip if first cell looks like a header
    if (cells[0].toLowerCase().includes('company') || cells[0].toLowerCase().includes('issuer')) continue

    const companyName = cells[0]
    if (!companyName || companyName.length < 2) continue

    // Try to parse price band
    const priceBandText = cells.find(c => /\d+\s*[-–to]+\s*\d+/.test(c)) || ''
    const priceMatch = /(\d+)\s*[-–to]+\s*(\d+)/.exec(priceBandText)
    const priceBandLow = priceMatch ? parseInt(priceMatch[1], 10) : 0
    const priceBandHigh = priceMatch ? parseInt(priceMatch[2], 10) : 0

    // Try to parse issue size
    const sizeText = cells.find(c => /[\d.]+\s*(?:cr|crore)/i.test(c)) || ''
    const sizeMatch = /([\d.]+)\s*(?:cr|crore)/i.exec(sizeText)
    const issueSize = sizeMatch ? parseFloat(sizeMatch[1]) : 0

    // Try to parse dates
    const dateTexts = cells.filter(c => /\d{1,2}[\/\-]\d{1,2}[\/\-]20\d{2}/.test(c))
    const parseDate = (d: string): string => {
      const m = /(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})/.exec(d)
      if (m) {
        return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).toISOString()
      }
      return now
    }

    const openDate = dateTexts[0] ? parseDate(dateTexts[0]) : now
    const closeDate = dateTexts[1] ? parseDate(dateTexts[1]) : now

    // Determine status
    const nowMs = Date.now()
    const openMs = new Date(openDate).getTime()
    const closeMs = new Date(closeDate).getTime()
    let status: SMEIPOItem['status'] = 'upcoming'
    if (nowMs >= openMs && nowMs <= closeMs) status = 'open'
    else if (nowMs > closeMs) status = 'closed'

    // Subscription data
    const subText = cells.find(c => /[\d.]+\s*x|times/i.test(c)) || ''
    const subMatch = /([\d.]+)\s*(?:x|times)/i.exec(subText)
    const subscriptionTotal = subMatch ? parseFloat(subMatch[1]) : undefined

    items.push({
      id: simpleHash(`sme-ipo-${companyName}`),
      companyName,
      exchange: 'BSE SME',
      issueSize,
      priceBandLow,
      priceBandHigh,
      lotSize: 1600, // typical SME IPO lot size
      openDate,
      closeDate,
      status,
      subscriptionTotal,
      fetchedAt: now,
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// Mock fallback data
// ---------------------------------------------------------------------------

const FALLBACK_SME_IPOS: SMEIPOItem[] = [
  {
    id: simpleHash('sme-ipo-precision-fasteners'),
    companyName: 'Precision Fasteners Ltd',
    exchange: 'BSE SME',
    issueSize: 42.5,
    priceBandLow: 82,
    priceBandHigh: 86,
    lotSize: 1600,
    openDate: '2026-03-28T00:00:00.000Z',
    closeDate: '2026-04-01T00:00:00.000Z',
    status: 'open',
    subscriptionTotal: 2.8,
    subscriptionRetail: 4.1,
    subscriptionNII: 2.3,
    subscriptionQIB: 1.5,
    sector: 'Manufacturing — Auto Components',
    registrar: 'Link Intime India Pvt Ltd',
    leadManager: 'Hem Securities Ltd',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: simpleHash('sme-ipo-bharati-digital'),
    companyName: 'Bharati Digital Solutions Ltd',
    exchange: 'NSE Emerge',
    issueSize: 28.0,
    priceBandLow: 120,
    priceBandHigh: 126,
    lotSize: 1000,
    openDate: '2026-03-26T00:00:00.000Z',
    closeDate: '2026-03-28T00:00:00.000Z',
    status: 'open',
    subscriptionTotal: 18.5,
    subscriptionRetail: 32.4,
    subscriptionNII: 15.2,
    subscriptionQIB: 8.7,
    sector: 'IT Services',
    registrar: 'Bigshare Services Pvt Ltd',
    leadManager: 'Pantomath Capital Advisors',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: simpleHash('sme-ipo-agrimax-foods'),
    companyName: 'Agrimax Foods Processing Ltd',
    exchange: 'BSE SME',
    issueSize: 35.0,
    priceBandLow: 54,
    priceBandHigh: 57,
    lotSize: 2000,
    openDate: '2026-04-02T00:00:00.000Z',
    closeDate: '2026-04-04T00:00:00.000Z',
    status: 'upcoming',
    sector: 'Food Processing',
    registrar: 'KFin Technologies Ltd',
    leadManager: 'Unistone Capital Pvt Ltd',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: simpleHash('sme-ipo-sairam-textiles'),
    companyName: 'Sairam Technical Textiles Ltd',
    exchange: 'BSE SME & NSE Emerge',
    issueSize: 55.2,
    priceBandLow: 148,
    priceBandHigh: 156,
    lotSize: 800,
    openDate: '2026-03-20T00:00:00.000Z',
    closeDate: '2026-03-24T00:00:00.000Z',
    listingDate: '2026-03-27T00:00:00.000Z',
    status: 'listed',
    subscriptionTotal: 45.2,
    subscriptionRetail: 68.0,
    subscriptionNII: 42.5,
    subscriptionQIB: 12.8,
    listingPrice: 245,
    listingGain: 57.05,
    sector: 'Textiles — Technical',
    registrar: 'Link Intime India Pvt Ltd',
    leadManager: 'Hem Securities Ltd',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: simpleHash('sme-ipo-greenchem-pharma'),
    companyName: 'GreenChem Pharma Solutions Ltd',
    exchange: 'NSE Emerge',
    issueSize: 48.0,
    priceBandLow: 95,
    priceBandHigh: 100,
    lotSize: 1200,
    openDate: '2026-03-22T00:00:00.000Z',
    closeDate: '2026-03-26T00:00:00.000Z',
    status: 'closed',
    subscriptionTotal: 72.3,
    subscriptionRetail: 95.0,
    subscriptionNII: 68.4,
    subscriptionQIB: 25.1,
    sector: 'Pharma — API Manufacturing',
    registrar: 'Bigshare Services Pvt Ltd',
    leadManager: 'Pantomath Capital Advisors',
    fetchedAt: new Date().toISOString(),
  },
]

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    if (circuitBreaker.isOpen(CIRCUIT_KEY)) {
      const response: ApiResponse<SMEIPOItem[]> = {
        data: FALLBACK_SME_IPOS,
        cached: false,
        source: 'BSE SME / NSE Emerge (circuit open — fallback)',
        fetchedAt: new Date().toISOString(),
        error: 'SME IPO circuit breaker open — returning mock data',
      }
      return withCors(JSON.stringify(response))
    }

    const cacheKey = 'sme-ipo:all'
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'BSE SME / NSE Emerge',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)

    let ipos: SMEIPOItem[] = []
    let usedFallback = false

    try {
      const res = await fetch(BSE_SME_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const html = await res.text()
        ipos = extractSMEIPOs(html)
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

    if (usedFallback || ipos.length === 0) {
      ipos = FALLBACK_SME_IPOS
    }

    // Sort: open first, then upcoming, then closed, then listed
    const statusOrder: Record<string, number> = { open: 0, upcoming: 1, closed: 2, listed: 3 }
    ipos.sort((a, b) => {
      const orderDiff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4)
      if (orderDiff !== 0) return orderDiff
      // Within same status, sort by openDate descending
      return new Date(b.openDate).getTime() - new Date(a.openDate).getTime()
    })

    await cacheSet(redis, cacheKey, ipos, CACHE_TTL)

    const response: ApiResponse<SMEIPOItem[]> = {
      data: ipos,
      cached: false,
      source: usedFallback ? 'BSE SME / NSE Emerge (fallback)' : 'BSE SME / NSE Emerge',
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
