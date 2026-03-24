// ============================================================
// MSME Vyapaar Monitor — CPPP / State Tenders Edge Function
// ============================================================

import type { TenderItem, ApiResponse } from '../src/types/index.js'
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

const STATE_PORTALS: Record<string, string> = {
  maharashtra: 'https://mahatenders.gov.in/nicgep/app/rss',
  karnataka: 'https://eproc.karnataka.gov.in/nicgep/app/rss',
  gujarat: 'https://nprocure.com/nicgep/app/rss',
  tamilnadu: 'https://tntenders.gov.in/nicgep/app/rss',
  up: 'https://etender.up.nic.in/nicgep/app/rss',
  rajasthan: 'https://sppp.rajasthan.gov.in/nicgep/app/rss',
  mp: 'https://mptenders.gov.in/nicgep/app/rss',
  andhra: 'https://tender.apeprocurement.gov.in/nicgep/app/rss',
  telangana: 'https://tender.telangana.gov.in/nicgep/app/rss',
  punjab: 'https://eproc.punjab.gov.in/nicgep/app/rss',
}

const CPPP_RSS = 'https://eprocure.gov.in/eprocure/app/rss'

const MOCK_TENDERS: TenderItem[] = [
  {
    id: 'mock-cppp-001',
    title: 'Supply of Office Furniture — Central Government Office',
    department: 'Ministry of Home Affairs',
    portal: 'CPPP',
    portalUrl: 'https://eprocure.gov.in',
    openDate: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    closeDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
    category: 'office-supplies',
    msmeFriendly: true,
    fetchedAt: new Date().toISOString(),
  },
  {
    id: 'mock-cppp-002',
    title: 'Annual Maintenance Contract for IT Equipment',
    department: 'Department of Revenue',
    portal: 'CPPP',
    portalUrl: 'https://eprocure.gov.in',
    openDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    closeDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    category: 'it-services',
    msmeFriendly: true,
    fetchedAt: new Date().toISOString(),
  },
  {
    id: 'mock-cppp-003',
    title: 'Supply and Installation of Solar Panels',
    department: 'Ministry of New and Renewable Energy',
    portal: 'CPPP',
    portalUrl: 'https://eprocure.gov.in',
    value: 5000000,
    openDate: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    closeDate: new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString(),
    category: 'energy',
    msmeFriendly: true,
    fetchedAt: new Date().toISOString(),
  },
]

function rssItemToTender(
  item: FeedItem,
  portal: 'CPPP' | 'State',
  state?: string,
): TenderItem {
  // Attempt to parse value from description
  const valueMatch = /(?:Rs\.?|INR|₹)\s*([\d,]+)/i.exec(item.description)
  const value = valueMatch
    ? parseInt(valueMatch[1].replace(/,/g, ''), 10)
    : undefined

  // Attempt to extract date from description
  const dateMatch = /(\d{2}[\/\-]\d{2}[\/\-]20\d{2})/.exec(item.description)
  const closeDate = dateMatch
    ? (() => {
        try {
          const [d, m, y] = dateMatch[1].split(/[\/\-]/).map(Number)
          return new Date(y, m - 1, d).toISOString()
        } catch {
          return new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString()
        }
      })()
    : new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString()

  return {
    id: simpleHash(item.guid || item.link || item.title),
    title: item.title,
    description: item.description?.slice(0, 300),
    department: 'Government Department',
    portal,
    portalUrl: item.link || (portal === 'CPPP' ? 'https://eprocure.gov.in' : '#'),
    bidNumber: undefined,
    openDate: item.pubDate
      ? new Date(item.pubDate).toISOString()
      : new Date().toISOString(),
    closeDate,
    value,
    category: 'government-procurement',
    state: state || undefined,
    fetchedAt: new Date().toISOString(),
  }
}

async function fetchTenderFeed(
  url: string,
  portal: 'CPPP' | 'State',
  state?: string,
): Promise<TenderItem[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12_000)

  try {
    const res = await fetch(url, {
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
    return items.map(item => rssItemToTender(item, portal, state))
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
    const state = url.searchParams.get('state')?.toLowerCase() || ''

    const cacheKey = `cppp-tenders:${state || 'central'}`
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: state ? `State:${state}` : 'CPPP',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    let tenders: TenderItem[] = []

    if (state && STATE_PORTALS[state]) {
      // Fetch state-specific portal
      tenders = await fetchTenderFeed(STATE_PORTALS[state], 'State', state)
    } else {
      // Fetch central CPPP
      tenders = await fetchTenderFeed(CPPP_RSS, 'CPPP')
    }

    // Fall back to mock data if fetch returned nothing
    if (tenders.length === 0) {
      tenders = MOCK_TENDERS.map(t => ({
        ...t,
        portal: (state ? 'State' : 'CPPP') as 'CPPP' | 'State',
        state: state || undefined,
      }))
    }

    // Sort by closeDate ascending
    tenders.sort((a, b) => {
      const ta = new Date(a.closeDate).getTime()
      const tb = new Date(b.closeDate).getTime()
      return ta - tb
    })

    await cacheSet(redis, cacheKey, tenders, 1800)

    const response: ApiResponse<TenderItem[]> = {
      data: tenders,
      cached: false,
      source: state ? `State:${state}` : 'CPPP',
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
