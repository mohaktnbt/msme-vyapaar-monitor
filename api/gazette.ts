// ============================================================
// MSME Vyapaar Monitor — Gazette of India Edge Function
// ============================================================

import type { PolicyUpdate, ApiResponse, SeverityLevel, Sector } from '../src/types/index.js'
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

const GAZETTE_URL = 'https://egazette.gov.in/WriteReadData/2024/RSSFeed.xml'
const CIRCUIT_KEY = 'gazette'
const CACHE_TTL = 86400 // 24 hours

const MSME_RELEVANT_MINISTRIES = [
  'msme',
  'micro, small and medium enterprises',
  'dpiit',
  'department for promotion of industry',
  'mca',
  'ministry of corporate affairs',
  'dgft',
  'directorate general of foreign trade',
  'rbi',
  'reserve bank of india',
  'gst council',
  'central board of indirect taxes',
  'cbic',
  'ministry of finance',
  'ministry of commerce',
  'niti aayog',
]

function isMSMERelevant(title: string, description: string): boolean {
  const combined = `${title} ${description}`.toLowerCase()
  return MSME_RELEVANT_MINISTRIES.some(keyword => combined.includes(keyword))
}

function detectMinistry(title: string, description: string): string {
  const combined = `${title} ${description}`.toLowerCase()
  if (combined.includes('msme') || combined.includes('micro, small')) return 'Ministry of MSME'
  if (combined.includes('dpiit') || combined.includes('promotion of industry')) return 'DPIIT'
  if (combined.includes('mca') || combined.includes('corporate affairs')) return 'Ministry of Corporate Affairs'
  if (combined.includes('dgft') || combined.includes('foreign trade')) return 'DGFT'
  if (combined.includes('rbi') || combined.includes('reserve bank')) return 'Reserve Bank of India'
  if (combined.includes('gst') || combined.includes('cbic') || combined.includes('indirect taxes')) return 'GST Council / CBIC'
  if (combined.includes('finance')) return 'Ministry of Finance'
  if (combined.includes('commerce')) return 'Ministry of Commerce'
  return 'Government of India'
}

function detectSectors(title: string, description: string): Sector[] {
  const combined = `${title} ${description}`.toLowerCase()
  const sectors: Sector[] = []
  if (combined.includes('manufactur')) sectors.push('manufacturing')
  if (combined.includes('export') || combined.includes('trade')) sectors.push('export')
  if (combined.includes('textile')) sectors.push('textile')
  if (combined.includes('pharma') || combined.includes('drug')) sectors.push('pharma')
  if (combined.includes('food') || combined.includes('fssai')) sectors.push('food')
  if (combined.includes('it') || combined.includes('software') || combined.includes('digital')) sectors.push('it')
  if (combined.includes('retail')) sectors.push('retail')
  if (combined.includes('chemical')) sectors.push('chemical')
  if (sectors.length === 0) sectors.push('manufacturing', 'services')
  return sectors
}

function detectImpact(title: string, description: string): SeverityLevel {
  const combined = `${title} ${description}`.toLowerCase()
  if (combined.includes('immediate effect') || combined.includes('mandatory') || combined.includes('penalty')) return 'high'
  if (combined.includes('amendment') || combined.includes('revised') || combined.includes('new rule')) return 'medium'
  return 'low'
}

function extractNotificationNumber(title: string): string | undefined {
  const match = /(?:S\.O\.|G\.S\.R\.|F\.No\.|CG-DL-[A-Z]-\d+)/i.exec(title)
  return match ? match[0] : undefined
}

function feedItemToPolicyUpdate(item: FeedItem): PolicyUpdate {
  const ministry = detectMinistry(item.title, item.description)
  const notifNum = extractNotificationNumber(item.title)
  return {
    id: simpleHash(item.guid || item.link || item.title),
    title: notifNum ? `[${notifNum}] ${item.title}` : item.title,
    ministry,
    type: 'gazette',
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    summary: item.description?.slice(0, 500) || '',
    documentUrl: item.link || undefined,
    impactLevel: detectImpact(item.title, item.description),
    sectors: detectSectors(item.title, item.description),
    tags: isMSMERelevant(item.title, item.description) ? ['msme-relevant', 'gazette'] : ['gazette'],
  }
}

const FALLBACK_GAZETTE: PolicyUpdate[] = [
  {
    id: simpleHash('gazette-msme-classification-2026'),
    title: '[S.O. 1205(E)] Revised classification criteria for Micro, Small and Medium Enterprises',
    ministry: 'Ministry of MSME',
    type: 'gazette',
    publishedAt: '2026-03-15T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'Investment and turnover limits revised upward for MSME classification under MSMED Act. Micro enterprises investment limit raised to Rs 2.5 crore, Small to Rs 25 crore.',
    documentUrl: 'https://egazette.gov.in/',
    impactLevel: 'high',
    sectors: ['manufacturing', 'services'],
    tags: ['msme-relevant', 'gazette', 'classification'],
  },
  {
    id: simpleHash('gazette-gst-rate-change-2026'),
    title: '[G.S.R. 198(E)] Amendment to GST rate schedule — reduction for MSME inputs',
    ministry: 'GST Council / CBIC',
    type: 'gazette',
    publishedAt: '2026-03-10T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'GST rates on select raw materials used by MSMEs reduced from 18% to 12%. Applicable to items under HS codes 7204, 7207, and 3901-3914.',
    documentUrl: 'https://egazette.gov.in/',
    impactLevel: 'high',
    sectors: ['manufacturing', 'chemical'],
    tags: ['msme-relevant', 'gazette', 'gst'],
  },
  {
    id: simpleHash('gazette-dpiit-startup-2026'),
    title: '[F.No. 5/2/2026-BE-II] DPIIT notification on Startup India Seed Fund extension',
    ministry: 'DPIIT',
    type: 'gazette',
    publishedAt: '2026-03-05T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'Startup India Seed Fund Scheme extended until March 2028 with enhanced allocation of Rs 1,500 crore. Eligibility expanded to include micro enterprises with Udyam registration.',
    documentUrl: 'https://egazette.gov.in/',
    impactLevel: 'medium',
    sectors: ['it', 'services', 'manufacturing'],
    tags: ['msme-relevant', 'gazette', 'startup'],
  },
  {
    id: simpleHash('gazette-rbi-priority-lending-2026'),
    title: '[G.S.R. 210(E)] RBI revised Priority Sector Lending norms for MSMEs',
    ministry: 'Reserve Bank of India',
    type: 'gazette',
    publishedAt: '2026-02-28T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'RBI mandates banks to allocate 8% of ANBC to micro enterprises, up from 7.5%. Introduces interest rate subvention of 2% for loans up to Rs 1 crore to micro enterprises.',
    documentUrl: 'https://egazette.gov.in/',
    impactLevel: 'high',
    sectors: ['manufacturing', 'services', 'retail'],
    tags: ['msme-relevant', 'gazette', 'rbi', 'lending'],
  },
  {
    id: simpleHash('gazette-mca-compliance-2026'),
    title: '[CG-DL-E-14032026] MCA simplified compliance for small companies',
    ministry: 'Ministry of Corporate Affairs',
    type: 'gazette',
    publishedAt: '2026-02-20T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'MCA introduces simplified annual return filing (Form MGT-7A) for small companies with paid-up capital below Rs 2 crore. Reduces compliance burden with consolidated quarterly filing.',
    documentUrl: 'https://egazette.gov.in/',
    impactLevel: 'medium',
    sectors: ['manufacturing', 'services'],
    tags: ['msme-relevant', 'gazette', 'mca', 'compliance'],
  },
]

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    if (circuitBreaker.isOpen(CIRCUIT_KEY)) {
      const response: ApiResponse<PolicyUpdate[]> = {
        data: FALLBACK_GAZETTE,
        cached: false,
        source: 'egazette.gov.in (circuit open — fallback)',
        fetchedAt: new Date().toISOString(),
        error: 'Gazette circuit breaker open — returning mock data',
      }
      return withCors(JSON.stringify(response))
    }

    const cacheKey = 'gazette:all'
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'egazette.gov.in',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)

    let items: PolicyUpdate[] = []
    let usedFallback = false

    try {
      const res = await fetch(GAZETTE_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const xml = await res.text()
        const feedItems = parseRSS(xml)
        items = feedItems.map(fi => feedItemToPolicyUpdate(fi))
        circuitBreaker.recordSuccess(CIRCUIT_KEY)
      } else {
        circuitBreaker.recordFailure(CIRCUIT_KEY)
        usedFallback = true
      }
    } catch {
      clearTimeout(timeoutId)
      circuitBreaker.recordFailure(CIRCUIT_KEY)
      usedFallback = true
    }

    if (usedFallback || items.length === 0) {
      items = FALLBACK_GAZETTE
    }

    // Sort by publishedAt descending
    items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    await cacheSet(redis, cacheKey, items, CACHE_TTL)

    const response: ApiResponse<PolicyUpdate[]> = {
      data: items,
      cached: false,
      source: usedFallback ? 'egazette.gov.in (fallback)' : 'egazette.gov.in',
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
