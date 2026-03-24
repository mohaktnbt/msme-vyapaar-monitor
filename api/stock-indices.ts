// ============================================================
// MSME Vyapaar Monitor — Stock Indices Edge Function
// ============================================================

import type { MarketPrice, ApiResponse } from '../src/types/index.js'
import {
  corsHeaders,
  withCors,
  errorResponse,
  getRedisClient,
  cacheGet,
  cacheSet,
  simpleHash,
} from './_utils.js'

export const config = { runtime: 'edge' }

interface YahooChartResult {
  meta?: {
    regularMarketPrice?: number
    previousClose?: number
    regularMarketChange?: number
    regularMarketChangePercent?: number
    currency?: string
  }
  indicators?: {
    quote?: Array<{ close?: number[] }>
  }
  timestamp?: number[]
}

interface YahooResponse {
  chart?: {
    result?: YahooChartResult[]
    error?: unknown
  }
}

const INDEX_CONFIG = [
  {
    symbol: '%5EBSESN',
    displaySymbol: '^BSESN',
    name: 'BSE Sensex',
    nameHi: 'बीएसई सेंसेक्स',
    id: simpleHash('bse-sensex'),
  },
  {
    symbol: '%5ENSEI',
    displaySymbol: '^NSEI',
    name: 'NSE Nifty 50',
    nameHi: 'एनएसई निफ्टी 50',
    id: simpleHash('nse-nifty'),
  },
]

const FALLBACK_INDICES: MarketPrice[] = [
  {
    id: simpleHash('bse-sensex'),
    commodity: 'BSE Sensex',
    commodityHi: 'बीएसई सेंसेक्स',
    price: 73250,
    previousPrice: 72890,
    change: 360,
    changePercent: 0.49,
    unit: 'points',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'BSE (fallback)',
    type: 'equity-index',
    sparkline: [72100, 72400, 72890, 72750, 73100, 72980, 73250],
  },
  {
    id: simpleHash('nse-nifty'),
    commodity: 'NSE Nifty 50',
    commodityHi: 'एनएसई निफ्टी 50',
    price: 22180,
    previousPrice: 22050,
    change: 130,
    changePercent: 0.59,
    unit: 'points',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'NSE (fallback)',
    type: 'equity-index',
    sparkline: [21800, 21950, 22050, 21990, 22100, 22030, 22180],
  },
  {
    id: simpleHash('bse-sme'),
    commodity: 'BSE SME IPO Index',
    commodityHi: 'बीएसई एसएमई आईपीओ',
    price: 38500,
    previousPrice: 38200,
    change: 300,
    changePercent: 0.79,
    unit: 'points',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'BSE SME (fallback)',
    type: 'equity-index',
    sparkline: [37200, 37600, 38000, 37900, 38200, 38100, 38500],
  },
]

async function fetchYahooIndex(config: typeof INDEX_CONFIG[0]): Promise<MarketPrice | null> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${config.symbol}` +
    `?interval=1d&range=7d`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)',
        Accept: 'application/json',
      },
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null

    const data = (await res.json()) as YahooResponse
    const result = data.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta || {}
    const closes = result.indicators?.quote?.[0]?.close || []
    const sparkline = closes
      .filter((v): v is number => v !== null && v !== undefined)
      .slice(-7)

    const price = meta.regularMarketPrice ?? 0
    const previousClose = meta.previousClose ?? 0
    const change = meta.regularMarketChange ?? price - previousClose
    const changePercent = meta.regularMarketChangePercent ?? 0

    return {
      id: config.id,
      commodity: config.name,
      commodityHi: config.nameHi,
      price,
      previousPrice: previousClose,
      change,
      changePercent,
      unit: 'points',
      currency: 'INR',
      timestamp: new Date().toISOString(),
      source: 'Yahoo Finance',
      type: 'equity-index',
      sparkline,
    }
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const cacheKey = 'stock-indices:all'
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'Yahoo Finance',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    const results = await Promise.allSettled(
      INDEX_CONFIG.map(cfg => fetchYahooIndex(cfg))
    )

    const indices: MarketPrice[] = []
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'fulfilled' && result.value) {
        indices.push(result.value)
      } else {
        // Use fallback for this specific index
        const fallback = FALLBACK_INDICES.find(f => f.id === INDEX_CONFIG[i].id)
        if (fallback) {
          indices.push({ ...fallback, timestamp: new Date().toISOString() })
        }
      }
    }

    // Add BSE SME from fallback (Yahoo Finance data for this index is unreliable)
    const smeFallback = FALLBACK_INDICES.find(f => f.commodity === 'BSE SME IPO Index')
    if (smeFallback && !indices.find(i => i.id === smeFallback.id)) {
      indices.push({ ...smeFallback, timestamp: new Date().toISOString() })
    }

    const allLive = results.every(r => r.status === 'fulfilled' && r.value)

    // Cache 15 minutes
    await cacheSet(redis, cacheKey, indices, 900)

    const response: ApiResponse<MarketPrice[]> = {
      data: indices,
      cached: false,
      source: allLive ? 'Yahoo Finance' : 'Yahoo Finance (partial fallback)',
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
