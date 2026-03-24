// ============================================================
// MSME Vyapaar Monitor — Forex Rates Edge Function
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

// Fallback rates (realistic March 2025)
const FALLBACK_RATES: MarketPrice[] = [
  {
    id: simpleHash('usd-inr'),
    commodity: 'USD/INR',
    commodityHi: 'डॉलर/रुपया',
    price: 83.5,
    unit: 'per USD',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'RBI (fallback)',
    type: 'forex',
  },
  {
    id: simpleHash('eur-inr'),
    commodity: 'EUR/INR',
    commodityHi: 'यूरो/रुपया',
    price: 90.2,
    unit: 'per EUR',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'RBI (fallback)',
    type: 'forex',
  },
  {
    id: simpleHash('gbp-inr'),
    commodity: 'GBP/INR',
    commodityHi: 'पाउंड/रुपया',
    price: 105.8,
    unit: 'per GBP',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'RBI (fallback)',
    type: 'forex',
  },
  {
    id: simpleHash('jpy-inr'),
    commodity: 'JPY/INR',
    commodityHi: 'येन/रुपया',
    price: 0.56,
    unit: 'per JPY',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'RBI (fallback)',
    type: 'forex',
  },
  {
    id: simpleHash('aed-inr'),
    commodity: 'AED/INR',
    commodityHi: 'दिरहम/रुपया',
    price: 22.7,
    unit: 'per AED',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'RBI (fallback)',
    type: 'forex',
  },
  {
    id: simpleHash('sgd-inr'),
    commodity: 'SGD/INR',
    commodityHi: 'SGD/रुपया',
    price: 61.5,
    unit: 'per SGD',
    currency: 'INR',
    timestamp: new Date().toISOString(),
    source: 'RBI (fallback)',
    type: 'forex',
  },
]

const CURRENCY_PAIRS = ['USD', 'EUR', 'GBP', 'JPY', 'AED', 'SGD']

function parseRbiRatesFromHtml(html: string): Record<string, number> {
  const rates: Record<string, number> = {}

  // RBI reference rate table — look for currency code + numeric rate pairs
  // The table has rows like: <td>USD</td><td>83.5010</td>
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch: RegExpExecArray | null

  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const row = rowMatch[1]
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m =>
      m[1].replace(/<[^>]*>/g, '').trim()
    )

    for (let i = 0; i < cells.length - 1; i++) {
      const curr = cells[i].toUpperCase().trim()
      if (CURRENCY_PAIRS.includes(curr)) {
        const rateStr = cells[i + 1].replace(/,/g, '')
        const rate = parseFloat(rateStr)
        if (!isNaN(rate) && rate > 0) {
          rates[curr] = rate
        }
      }
    }
  }

  return rates
}

function buildRates(parsed: Record<string, number>, now: string): MarketPrice[] {
  return CURRENCY_PAIRS.map(curr => {
    const fallback = FALLBACK_RATES.find(r => r.commodity.startsWith(curr))!
    const price = parsed[curr] ?? fallback.price
    return {
      ...fallback,
      price,
      timestamp: now,
      source: parsed[curr] ? 'RBI Reference Rates' : 'RBI (fallback)',
    }
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const cacheKey = 'forex:rates'
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'RBI',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    const now = new Date().toISOString()
    let rates: MarketPrice[] = FALLBACK_RATES.map(r => ({ ...r, timestamp: now }))
    let usedFallback = true

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12_000)

      const res = await fetch(
        'https://www.rbi.org.in/Scripts/ReferenceRateArchive.aspx',
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)',
            Accept: 'text/html',
          },
        }
      )
      clearTimeout(timeoutId)

      if (res.ok) {
        const html = await res.text()
        const parsed = parseRbiRatesFromHtml(html)
        if (Object.keys(parsed).length > 0) {
          rates = buildRates(parsed, now)
          usedFallback = Object.values(parsed).length < CURRENCY_PAIRS.length
        }
      }
    } catch {
      // Fall through to fallback rates
    }

    // Cache 6 hours
    await cacheSet(redis, cacheKey, rates, 21600)

    const response: ApiResponse<MarketPrice[]> = {
      data: rates,
      cached: false,
      source: usedFallback ? 'RBI (fallback)' : 'RBI Reference Rates',
      fetchedAt: now,
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
