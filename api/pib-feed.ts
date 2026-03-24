// ============================================================
// MSME Vyapaar Monitor — PIB Feed Edge Function
// ============================================================

import type { NewsItem, ApiResponse } from '../src/types/index.js'
import {
  corsHeaders,
  withCors,
  errorResponse,
  getRedisClient,
  cacheGet,
  cacheSet,
  parseRSS,
  simpleHash,
  type FeedItem,
} from './_utils.js'

export const config = { runtime: 'edge' }

interface PibFeedSource {
  url: string
  ministry: string
}

const PIB_FEEDS: PibFeedSource[] = [
  {
    url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1',
    ministry: 'Ministry of MSME',
  },
  {
    url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3',
    ministry: 'Ministry of Commerce',
  },
  {
    url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=6',
    ministry: 'Ministry of Finance',
  },
]

function pibItemToNewsItem(item: FeedItem, ministry: string): NewsItem {
  return {
    id: simpleHash(item.guid || item.link || item.title),
    title: item.title,
    summary: item.description?.slice(0, 500) || '',
    source: `PIB — ${ministry}`,
    sourceTier: 1,
    url: item.link,
    publishedAt: item.pubDate
      ? new Date(item.pubDate).toISOString()
      : new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    category: 'government',
    language: 'en',
  }
}

async function fetchPibFeed(source: PibFeedSource): Promise<NewsItem[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    })
    clearTimeout(timeoutId)
    if (!res.ok) return []
    const xml = await res.text()
    const items = parseRSS(xml)
    return items.map(item => pibItemToNewsItem(item, source.ministry))
  } catch {
    clearTimeout(timeoutId)
    return []
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const cacheKey = 'pib-feed:all'
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'pib.gov.in',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    const results = await Promise.allSettled(
      PIB_FEEDS.map(source => fetchPibFeed(source))
    )

    const allItems: NewsItem[] = []
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value)
      }
    }

    // Sort by publishedAt descending
    allItems.sort((a, b) => {
      const ta = new Date(a.publishedAt).getTime()
      const tb = new Date(b.publishedAt).getTime()
      return tb - ta
    })

    // Cache 15 minutes
    await cacheSet(redis, cacheKey, allItems, 900)

    const response: ApiResponse<NewsItem[]> = {
      data: allItems,
      cached: false,
      source: 'pib.gov.in',
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
