// ============================================================
// MSME Vyapaar Monitor — GeM Tenders Edge Function
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

const GEM_URL = 'https://bidplus.gem.gov.in/all-bids'
const CIRCUIT_KEY = 'gem-tenders'
const CACHE_TTL = 1800 // 30 minutes

function extractBidCards(html: string): TenderItem[] {
  const items: TenderItem[] = []
  const now = new Date().toISOString()

  // Extract bid number patterns: GEM/20xx/B/xxxxx
  const bidPattern = /GEM\/20\d{2}\/B\/\d+/g
  const bidNumbers = [...new Set(html.match(bidPattern) || [])]

  for (const bidNumber of bidNumbers) {
    // Find the surrounding context (±500 chars) for each bid number
    const idx = html.indexOf(bidNumber)
    if (idx === -1) continue

    const start = Math.max(0, idx - 500)
    const end = Math.min(html.length, idx + 800)
    const context = html.slice(start, end)

    // Extract title — look for heading patterns near the bid number
    const titleMatch =
      /class="[^"]*bid[^"]*title[^"]*"[^>]*>([\s\S]{5,200}?)<\//.exec(context) ||
      /class="[^"]*title[^"]*"[^>]*>([\s\S]{5,200}?)<\//.exec(context) ||
      /<h[2-5][^>]*>([\s\S]{5,200}?)<\/h[2-5]>/i.exec(context)

    const rawTitle = titleMatch
      ? titleMatch[1].replace(/<[^>]*>/g, '').trim()
      : `Bid ${bidNumber}`

    const title = rawTitle
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()

    // Extract department
    const deptMatch =
      /(?:buyer|department|ministry|org)[^:]*:?\s*<[^>]*>([^<]{5,100})</i.exec(context) ||
      /class="[^"]*dept[^"]*"[^>]*>([\s\S]{3,100}?)<\//i.exec(context)

    const department = deptMatch
      ? deptMatch[1].replace(/<[^>]*>/g, '').trim()
      : 'Government of India'

    // Extract dates
    const datePattern = /(\d{2}[\/\-]\d{2}[\/\-]20\d{2})/g
    const dates = context.match(datePattern) || []
    const parseDate = (d: string): string => {
      try {
        const [day, month, year] = d.split(/[\/\-]/).map(Number)
        return new Date(year, month - 1, day).toISOString()
      } catch {
        return new Date().toISOString()
      }
    }

    const openDate = dates[0] ? parseDate(dates[0]) : now
    const closeDate = dates[1]
      ? parseDate(dates[1])
      : new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString()

    // Extract quantity
    const qtyMatch = /(?:quantity|qty)[^0-9]*(\d+[\d,]*)/i.exec(context)
    const quantityStr = qtyMatch ? qtyMatch[1].replace(/,/g, '') : ''

    items.push({
      id: simpleHash(bidNumber),
      title: title || `GeM Bid ${bidNumber}`,
      description: quantityStr ? `Quantity: ${quantityStr}` : undefined,
      department,
      portal: 'GeM',
      portalUrl: `https://bidplus.gem.gov.in/bidlists?bidNumber=${encodeURIComponent(bidNumber)}`,
      bidNumber,
      openDate,
      closeDate,
      category: 'government-procurement',
      fetchedAt: now,
      tenderType: 'open',
    })
  }

  return items
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // Circuit breaker check
    if (circuitBreaker.isOpen(CIRCUIT_KEY)) {
      const response: ApiResponse<TenderItem[]> = {
        data: [],
        cached: false,
        source: 'GeM (circuit open)',
        fetchedAt: new Date().toISOString(),
        error: 'GeM portal circuit breaker open — too many recent failures',
      }
      return withCors(JSON.stringify(response))
    }

    const cacheKey = 'gem-tenders:all'
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'GeM',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    // Fetch GeM page
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)

    let html: string
    try {
      const res = await fetch(GEM_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        circuitBreaker.recordFailure(CIRCUIT_KEY)
        const response: ApiResponse<TenderItem[]> = {
          data: [],
          cached: false,
          source: 'GeM',
          fetchedAt: new Date().toISOString(),
          error: `GeM portal returned HTTP ${res.status}`,
        }
        return withCors(JSON.stringify(response))
      }
      html = await res.text()
    } catch (err) {
      clearTimeout(timeoutId)
      circuitBreaker.recordFailure(CIRCUIT_KEY)
      const msg = err instanceof Error ? err.message : 'Fetch failed'
      const response: ApiResponse<TenderItem[]> = {
        data: [],
        cached: false,
        source: 'GeM',
        fetchedAt: new Date().toISOString(),
        error: `GeM portal fetch error: ${msg}`,
      }
      return withCors(JSON.stringify(response))
    }

    circuitBreaker.recordSuccess(CIRCUIT_KEY)

    const tenders = extractBidCards(html)

    // Deduplicate by bid number using Redis Set
    let finalTenders = tenders
    if (redis && tenders.length > 0) {
      const bidNumbers = tenders.map(t => t.bidNumber || t.id)
      await redis.sadd('gem-seen-bids', ...bidNumbers)
    }

    // Sort by closeDate ascending
    finalTenders.sort((a, b) => {
      const ta = new Date(a.closeDate).getTime()
      const tb = new Date(b.closeDate).getTime()
      return ta - tb
    })

    finalTenders = finalTenders.slice(0, 50)

    await cacheSet(redis, cacheKey, finalTenders, CACHE_TTL)

    const response: ApiResponse<TenderItem[]> = {
      data: finalTenders,
      cached: false,
      source: 'GeM',
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
