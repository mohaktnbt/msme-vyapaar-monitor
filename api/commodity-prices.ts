// ============================================================
// MSME Vyapaar Monitor — Commodity Prices Edge Function
// ============================================================

import type { MarketPrice, ApiResponse } from '../src/types/index.js'
import {
  corsHeaders,
  withCors,
  errorResponse,
  getRedisClient,
  cacheGet,
  cacheSet,
  getEnv,
  simpleHash,
} from './_utils.js'

export const config = { runtime: 'edge' }

const AGMARKNET_RESOURCE = '9ef84268-d588-465a-a308-a864a43d0070'

interface AgmarknetRecord {
  commodity?: string
  Commodity?: string
  market?: string
  Market?: string
  min_price?: string | number
  max_price?: string | number
  modal_price?: string | number
  Min_x0020_Price?: string | number
  Max_x0020_Price?: string | number
  Modal_x0020_Price?: string | number
  arrival_date?: string
  Arrival_Date?: string
  state?: string
  State?: string
}

const FALLBACK_PRICES: MarketPrice[] = [
  {
    id: simpleHash('wheat'),
    commodity: 'Wheat',
    commodityHi: 'गेहूँ',
    price: 2100,
    unit: 'per quintal',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'Agmarknet (fallback)',
    type: 'agri',
  },
  {
    id: simpleHash('rice'),
    commodity: 'Rice',
    commodityHi: 'चावल',
    price: 2800,
    unit: 'per quintal',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'Agmarknet (fallback)',
    type: 'agri',
  },
  {
    id: simpleHash('cotton'),
    commodity: 'Cotton',
    commodityHi: 'कपास',
    price: 6500,
    unit: 'per quintal',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'Agmarknet (fallback)',
    type: 'agri',
  },
  {
    id: simpleHash('soybean'),
    commodity: 'Soybean',
    commodityHi: 'सोयाबीन',
    price: 4300,
    unit: 'per quintal',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'Agmarknet (fallback)',
    type: 'agri',
  },
  {
    id: simpleHash('onion'),
    commodity: 'Onion',
    commodityHi: 'प्याज',
    price: 1800,
    unit: 'per quintal',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'Agmarknet (fallback)',
    type: 'agri',
  },
  {
    id: simpleHash('tomato'),
    commodity: 'Tomato',
    commodityHi: 'टमाटर',
    price: 800,
    unit: 'per quintal',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'Agmarknet (fallback)',
    type: 'agri',
  },
  {
    id: simpleHash('gold'),
    commodity: 'Gold',
    commodityHi: 'सोना',
    price: 65000,
    unit: 'per 10g',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'MCX (fallback)',
    type: 'metal',
  },
  {
    id: simpleHash('silver'),
    commodity: 'Silver',
    commodityHi: 'चाँदी',
    price: 750,
    unit: 'per 10g',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'MCX (fallback)',
    type: 'metal',
  },
  {
    id: simpleHash('copper'),
    commodity: 'Copper',
    commodityHi: 'ताँबा',
    price: 730,
    unit: 'per kg',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'MCX (fallback)',
    type: 'metal',
  },
  {
    id: simpleHash('crude-oil'),
    commodity: 'Crude Oil',
    commodityHi: 'कच्चा तेल',
    price: 6800,
    unit: 'per barrel (INR)',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'MCX (fallback)',
    type: 'energy',
  },
  {
    id: simpleHash('diesel'),
    commodity: 'Diesel',
    commodityHi: 'डीजल',
    price: 90,
    unit: 'per litre',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'PPAC (fallback)',
    type: 'energy',
  },
]

function agmarknetToMarketPrice(record: AgmarknetRecord): MarketPrice | null {
  const commodity =
    (record.commodity || record.Commodity || '').trim()
  const market =
    (record.market || record.Market || '').trim()
  const state =
    (record.state || record.State || '').trim()
  const modalPrice = parseFloat(
    String(
      record.modal_price ||
      record.Modal_x0020_Price ||
      record.min_price ||
      record.Min_x0020_Price ||
      0
    ).replace(/,/g, '')
  )

  if (!commodity || isNaN(modalPrice) || modalPrice === 0) return null

  return {
    id: simpleHash(`${commodity}-${market}`),
    commodity,
    price: modalPrice,
    unit: 'per quintal',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'Agmarknet / data.gov.in',
    market,
    state,
    type: 'agri',
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const cacheKey = 'commodity-prices:all'
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'Agmarknet',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    const apiKey = getEnv('DATA_GOV_API_KEY')
    if (!apiKey) {
      // Return fallback data
      const sorted = [...FALLBACK_PRICES].sort((a, b) =>
        a.commodity.localeCompare(b.commodity)
      )
      const response: ApiResponse<MarketPrice[]> = {
        data: sorted,
        cached: false,
        source: 'Agmarknet (fallback — no API key)',
        fetchedAt: new Date().toISOString(),
        error: 'DATA_GOV_API_KEY not configured',
      }
      return withCors(JSON.stringify(response))
    }

    const apiUrl =
      `https://api.data.gov.in/resource/${AGMARKNET_RESOURCE}` +
      `?api-key=${apiKey}&format=json&offset=0&limit=100`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)

    let prices: MarketPrice[] = []
    let usedFallback = false

    try {
      const res = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)' },
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = (await res.json()) as { records?: AgmarknetRecord[] }
        const records = data.records || []
        prices = records
          .map(r => agmarknetToMarketPrice(r))
          .filter((p): p is MarketPrice => p !== null)
      } else {
        usedFallback = true
      }
    } catch {
      clearTimeout(timeoutId)
      usedFallback = true
    }

    // Merge with fallback for commodities not in live data
    const liveNames = new Set(prices.map(p => p.commodity.toLowerCase()))
    const missingFallbacks = FALLBACK_PRICES.filter(
      fb => !liveNames.has(fb.commodity.toLowerCase())
    )
    prices = [...prices, ...missingFallbacks]

    // Sort alphabetically
    prices.sort((a, b) => a.commodity.localeCompare(b.commodity))

    // Cache 2 hours
    await cacheSet(redis, cacheKey, prices, 7200)

    const response: ApiResponse<MarketPrice[]> = {
      data: prices,
      cached: false,
      source: usedFallback ? 'Agmarknet (fallback)' : 'Agmarknet / data.gov.in',
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
