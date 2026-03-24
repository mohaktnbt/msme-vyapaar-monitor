// ============================================================
// MSME Vyapaar Monitor — RSS Proxy Edge Function
// ============================================================

import type { ApiResponse } from '../src/types/index.js'
import {
  corsHeaders,
  withCors,
  errorResponse,
  getRedisClient,
  cacheGet,
  cacheSet,
  parseRSS,
  simpleHash,
} from './_utils.js'

export const config = { runtime: 'edge' }

const ALLOWED_DOMAINS = [
  'pib.gov.in',
  'livemint.com',
  'economictimes.indiatimes.com',
  'business-standard.com',
  'moneycontrol.com',
  'inc42.com',
  'yourstory.com',
  'cnbctv18.com',
  'amarujala.com',
  'navbharattimes.indiatimes.com',
  'loksatta.com',
  'sandesh.com',
  'thehindu.com',
  'deccanherald.com',
  'financialexpress.com',
  'b2b.economictimes.indiatimes.com',
  'eprocure.gov.in',
  'constructionworld.in',
  'fortuneindia.com',
  'smestreet.in',
  'msmetimes.com',
  'dgft.gov.in',
  'sebi.gov.in',
  'cbic.gov.in',
  'incometax.gov.in',
  'rbi.org.in',
  'entrackr.com',
  'techcircle.in',
]

function isDomainAllowed(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
    return ALLOWED_DOMAINS.some(
      d => hostname === d || hostname.endsWith(`.${d}`)
    )
  } catch {
    return false
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const feedUrl = url.searchParams.get('url')

    if (!feedUrl) {
      return errorResponse('Missing required parameter: url', 400)
    }

    if (!isDomainAllowed(feedUrl)) {
      return errorResponse('URL domain not in allowlist', 400)
    }

    const cacheKey = `rss:${simpleHash(feedUrl)}`
    const redis = getRedisClient()

    // Check cache
    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: feedUrl,
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    // Fetch with 10-second timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    let xmlText: string
    try {
      const res = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
      })
      clearTimeout(timeoutId)
      if (!res.ok) {
        return errorResponse(`Feed fetch failed: HTTP ${res.status}`, 502)
      }
      xmlText = await res.text()
    } catch (err) {
      clearTimeout(timeoutId)
      const msg = err instanceof Error ? err.message : 'Fetch failed'
      return errorResponse(`Feed fetch error: ${msg}`, 502)
    }

    const items = parseRSS(xmlText)

    // Cache for 10 minutes
    await cacheSet(redis, cacheKey, items, 600)

    const response: ApiResponse<typeof items> = {
      data: items,
      cached: false,
      source: feedUrl,
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
