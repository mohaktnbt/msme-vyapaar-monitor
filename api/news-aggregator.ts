// ============================================================
// MSME Vyapaar Monitor — News Aggregator Edge Function
// ============================================================

import feedsJson from '../data/feeds.json' assert { type: 'json' }
import type { NewsItem, ApiResponse, FeedConfig } from '../src/types/index.js'
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

const feeds = feedsJson as FeedConfig[]

function feedItemToNewsItem(
  item: FeedItem,
  feed: FeedConfig,
): NewsItem {
  return {
    id: simpleHash(item.guid || item.link || item.title),
    title: item.title,
    summary: item.description?.slice(0, 500) || '',
    source: feed.name,
    sourceTier: feed.tier,
    url: item.link,
    publishedAt: item.pubDate
      ? new Date(item.pubDate).toISOString()
      : new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    category: feed.category,
    sector: feed.sector ? [feed.sector] : undefined,
    language: feed.language,
  }
}

function areSimilar(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim()
  const na = normalize(a).slice(0, 50)
  const nb = normalize(b).slice(0, 50)
  return na === nb
}

async function fetchFeed(feed: FeedConfig): Promise<NewsItem[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch(feed.url, {
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
    return items.map(item => feedItemToNewsItem(item, feed))
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
    const url = new URL(req.url)
    const category = url.searchParams.get('category') || ''
    const language = url.searchParams.get('language') || ''

    // Filter feeds by params
    let matchingFeeds = feeds.filter(f => f.active !== false)
    if (category) {
      matchingFeeds = matchingFeeds.filter(
        f => f.category.toLowerCase() === category.toLowerCase()
      )
    }
    if (language) {
      matchingFeeds = matchingFeeds.filter(
        f => f.language === language
      )
    }

    // Limit to 5 feeds concurrently
    const selectedFeeds = matchingFeeds.slice(0, 5)

    const cacheKey = `news-agg:${simpleHash(category + language + selectedFeeds.map(f => f.url).join(','))}`
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'aggregator',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    // Fetch up to 5 feeds concurrently
    const results = await Promise.allSettled(
      selectedFeeds.map(feed => fetchFeed(feed))
    )

    // Merge
    const allItems: NewsItem[] = []
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value)
      }
    }

    // Deduplicate by title similarity
    const deduped: NewsItem[] = []
    for (const item of allItems) {
      const isDuplicate = deduped.some(existing =>
        areSimilar(existing.title, item.title)
      )
      if (!isDuplicate) {
        deduped.push(item)
      }
    }

    // Sort by publishedAt descending
    deduped.sort((a, b) => {
      const ta = new Date(a.publishedAt).getTime()
      const tb = new Date(b.publishedAt).getTime()
      return tb - ta
    })

    const finalItems = deduped.slice(0, 50)

    // Cache 5 minutes
    await cacheSet(redis, cacheKey, finalItems, 300)

    const response: ApiResponse<NewsItem[]> = {
      data: finalItems,
      cached: false,
      source: 'aggregator',
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
