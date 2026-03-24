// ============================================================
// MSME Vyapaar Monitor — data.gov.in API Edge Function
// ============================================================

import type { ApiResponse } from '../src/types/index.js'
import {
  corsHeaders,
  withCors,
  errorResponse,
  getRedisClient,
  cacheGet,
  cacheSet,
  getEnv,
} from './_utils.js'

export const config = { runtime: 'edge' }

type DatasetId = 'udyam-stats' | 'mandi-prices' | 'msme-loans'

interface DatasetConfig {
  resourceId: string
  description: string
}

const DATASET_CONFIG: Record<DatasetId, DatasetConfig> = {
  'udyam-stats': {
    resourceId: '5c2f1c44-56b9-4a44-b9c9-56cd2d4b09a0',
    description: 'Udyam Registration Statistics',
  },
  'mandi-prices': {
    resourceId: '9ef84268-d588-465a-a308-a864a43d0070',
    description: 'Agmarknet Mandi Prices',
  },
  'msme-loans': {
    resourceId: 'd58f5938-a4d3-4fd4-b5bc-4b5a75ca2c72',
    description: 'MSME Loan Disbursement Data',
  },
}

const VALID_DATASETS: DatasetId[] = ['udyam-stats', 'mandi-prices', 'msme-loans']

function getMockData(dataset: DatasetId): unknown {
  if (dataset === 'udyam-stats') {
    return {
      records: [
        { state: 'Maharashtra', micro: 1200000, small: 85000, medium: 12000 },
        { state: 'Uttar Pradesh', micro: 980000, small: 62000, medium: 8500 },
        { state: 'Tamil Nadu', micro: 850000, small: 71000, medium: 9200 },
        { state: 'Gujarat', micro: 740000, small: 68000, medium: 11000 },
        { state: 'Karnataka', micro: 620000, small: 54000, medium: 7800 },
      ],
      note: 'Mock data — configure DATA_GOV_API_KEY for live data',
    }
  }
  if (dataset === 'mandi-prices') {
    return {
      records: [
        { commodity: 'Wheat', market: 'Delhi', min_price: 1900, max_price: 2300, modal_price: 2100 },
        { commodity: 'Rice', market: 'Mumbai', min_price: 2500, max_price: 3100, modal_price: 2800 },
        { commodity: 'Cotton', market: 'Ahmedabad', min_price: 6000, max_price: 7000, modal_price: 6500 },
        { commodity: 'Onion', market: 'Nashik', min_price: 1500, max_price: 2200, modal_price: 1800 },
        { commodity: 'Tomato', market: 'Bengaluru', min_price: 600, max_price: 1100, modal_price: 800 },
      ],
      note: 'Mock data — configure DATA_GOV_API_KEY for live data',
    }
  }
  if (dataset === 'msme-loans') {
    return {
      records: [
        { bank: 'SBI', sanctioned_amount: 85000, disbursed_amount: 78000, no_of_accounts: 12500 },
        { bank: 'PNB', sanctioned_amount: 42000, disbursed_amount: 38500, no_of_accounts: 6800 },
        { bank: 'Canara Bank', sanctioned_amount: 38000, disbursed_amount: 35000, no_of_accounts: 5900 },
      ],
      note: 'Mock data — configure DATA_GOV_API_KEY for live data',
    }
  }
  return { records: [], note: 'Mock data' }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const dataset = url.searchParams.get('dataset') as DatasetId | null

    if (!dataset || !VALID_DATASETS.includes(dataset)) {
      return errorResponse(
        `Invalid or missing dataset param. Valid values: ${VALID_DATASETS.join(', ')}`,
        400
      )
    }

    const apiKey = getEnv('DATA_GOV_API_KEY')
    if (!apiKey) {
      const mockData = getMockData(dataset)
      const response: ApiResponse<unknown> = {
        data: mockData,
        cached: false,
        source: 'data.gov.in (mock)',
        fetchedAt: new Date().toISOString(),
        error: 'DATA_GOV_API_KEY not configured — returning demo data',
      }
      return new Response(JSON.stringify(response), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const cacheKey = `data-gov:${dataset}`
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'data.gov.in',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    const config = DATASET_CONFIG[dataset]
    const apiUrl =
      `https://api.data.gov.in/resource/${config.resourceId}` +
      `?api-key=${apiKey}&format=json&offset=0&limit=100`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)

    let data: unknown
    try {
      const res = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)',
        },
      })
      clearTimeout(timeoutId)
      if (!res.ok) {
        return errorResponse(`data.gov.in API error: HTTP ${res.status}`, 502)
      }
      data = await res.json()
    } catch (err) {
      clearTimeout(timeoutId)
      const msg = err instanceof Error ? err.message : 'Fetch failed'
      return errorResponse(`data.gov.in fetch error: ${msg}`, 502)
    }

    // Cache 1 hour
    await cacheSet(redis, cacheKey, data, 3600)

    const response: ApiResponse<unknown> = {
      data,
      cached: false,
      source: 'data.gov.in',
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
