// ============================================================
// MSME Vyapaar Monitor — Hyperlocal District News Edge Function
// ============================================================

import type { NewsItem, ApiResponse } from '../src/types/index.js'
import {
  corsHeaders,
  withCors,
  errorResponse,
  getRedisClient,
  cacheGet,
  cacheSet,
  circuitBreaker,
  parseRSS,
  simpleHash,
  type FeedItem,
} from './_utils.js'

export const config = { runtime: 'edge' }

const CIRCUIT_KEY = 'hyperlocal-news'
const CACHE_TTL = 3600 // 1 hour

interface HyperlocalNewsItem extends NewsItem {
  location: string
  isLocal: boolean
}

function feedItemToNews(item: FeedItem, location: string): HyperlocalNewsItem {
  return {
    id: simpleHash(item.guid || item.link || item.title),
    title: item.title,
    summary: item.description?.slice(0, 500) || '',
    source: 'Google News — Hyperlocal',
    sourceTier: 3,
    url: item.link,
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    category: 'hyperlocal',
    language: 'en',
    location,
    isLocal: true,
  }
}

function buildFallback(location: string): HyperlocalNewsItem[] {
  const now = new Date()
  const base = [
    {
      title: `${location} MSME cluster wins Rs 42 cr state subsidy for capacity upgrade`,
      summary: `Over 180 small manufacturers in ${location} industrial area cleared for technology upgradation under state MSME scheme. Disbursement to begin next quarter.`,
    },
    {
      title: `New ${location} bypass road construction kicks off — cement and steel demand surges`,
      summary: `State PWD awards 38 km bypass project around ${location} worth Rs 512 cr to L&T-led JV. Construction phase expected to lift local aggregates and labour rates.`,
    },
    {
      title: `${location} district collector announces single-window MSME approval desk`,
      summary: `Udyam-registered enterprises in ${location} can now get 14 industrial clearances within 21 days through the new District Business Facilitation Cell.`,
    },
    {
      title: `Power cuts in ${location} industrial estate — textile units demand feeder separation`,
      summary: `Small textile and dyeing units in ${location} report 4-6 hour outages, citing overloaded 33kV feeder. Discom promises separate industrial feeder by next quarter.`,
    },
    {
      title: `${location} logistics park proposed under PM Gati Shakti`,
      summary: `Multi-modal logistics park planned on 120 acres near ${location} rail head. Expected to reduce freight costs for MSMEs by 15-20% once operational.`,
    },
    {
      title: `${location} banks clear Rs 380 cr MSME loans in Q4 — 35% YoY growth`,
      summary: `Lead bank committee in ${location} reports sharp jump in micro enterprise loan disbursals. CGTMSE-backed loans up 48%.`,
    },
    {
      title: `GST evasion crackdown: 12 fake invoice networks busted in ${location}`,
      summary: `State GST intelligence wing unearths circular trading worth Rs 265 cr in ${location} district. Genuine MSMEs urged to verify counterparty GSTINs.`,
    },
    {
      title: `${location} skill development centre to train 2,000 workers for EV component manufacturing`,
      summary: `New centre under PM Vishwakarma will supply trained workforce to emerging electric vehicle component cluster in ${location} district.`,
    },
  ]

  return base.map((b, i) => ({
    id: simpleHash(`hyperlocal-${location}-${i}`),
    title: b.title,
    summary: b.summary,
    source: 'Hyperlocal Mock Feed',
    sourceTier: 3 as const,
    url: `https://news.google.com/search?q=${encodeURIComponent(location)}+MSME`,
    publishedAt: new Date(now.getTime() - i * 3_600_000).toISOString(),
    fetchedAt: now.toISOString(),
    category: 'hyperlocal',
    language: 'en' as const,
    location,
    isLocal: true,
  }))
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const locationParam = url.searchParams.get('location')
    const state = url.searchParams.get('state') || ''
    const district = url.searchParams.get('district') || ''
    const location = (locationParam || district || state || 'India').trim()

    const cacheKey = `hyperlocal-news:${location.toLowerCase()}`
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'news.google.com',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    if (circuitBreaker.isOpen(CIRCUIT_KEY)) {
      const response: ApiResponse<HyperlocalNewsItem[]> = {
        data: buildFallback(location),
        cached: false,
        source: 'mock-fallback',
        fetchedAt: new Date().toISOString(),
        error: 'Hyperlocal news circuit breaker open',
      }
      return withCors(JSON.stringify(response))
    }

    const query = encodeURIComponent(`${location} MSME OR business OR factory OR industry`)
    const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12_000)

    let items: HyperlocalNewsItem[] = []
    let usedFallback = false

    try {
      const res = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const xml = await res.text()
        const feed = parseRSS(xml)
        items = feed.map(f => feedItemToNews(f, location))
        circuitBreaker.recordSuccess(CIRCUIT_KEY)
      } else {
        circuitBreaker.recordFailure(CIRCUIT_KEY)
        usedFallback = true
      }
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('hyperlocal-news fetch failed', err)
      circuitBreaker.recordFailure(CIRCUIT_KEY)
      usedFallback = true
    }

    if (usedFallback || items.length === 0) {
      items = buildFallback(location)
      usedFallback = true
    }

    items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    await cacheSet(redis, cacheKey, items, CACHE_TTL)

    const response: ApiResponse<HyperlocalNewsItem[]> = {
      data: items,
      cached: false,
      source: usedFallback ? 'mock-fallback' : 'news.google.com',
      fetchedAt: new Date().toISOString(),
    }
    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
