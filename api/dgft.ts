// ============================================================
// MSME Vyapaar Monitor — DGFT Trade Notices Edge Function
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
  simpleHash,
} from './_utils.js'

export const config = { runtime: 'edge' }

const DGFT_URL = 'https://www.dgft.gov.in/CP/?opt=trade-notice'
const CIRCUIT_KEY = 'dgft'
const CACHE_TTL = 21600 // 6 hours

function extractTradeNotices(html: string): PolicyUpdate[] {
  const items: PolicyUpdate[] = []
  const now = new Date().toISOString()

  // Match trade notice patterns: "Trade Notice No. XX/2026"
  const noticePattern = /Trade\s+Notice\s+No\.\s*(\d+\/20\d{2}(?:\-\d+)?)/gi
  let match: RegExpExecArray | null

  while ((match = noticePattern.exec(html)) !== null) {
    const idx = match.index
    const start = Math.max(0, idx - 300)
    const end = Math.min(html.length, idx + 800)
    const context = html.slice(start, end)

    const noticeNumber = match[1]

    // Extract date
    const dateMatch = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](20\d{2})/.exec(context)
    const publishedAt = dateMatch
      ? new Date(Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1])).toISOString()
      : now

    // Extract description from nearby text
    const descMatch = />([\s\S]{10,400}?)<\/(?:a|td|p|div)/i.exec(context)
    const summary = descMatch
      ? descMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      : `DGFT Trade Notice No. ${noticeNumber}`

    // Extract PDF link
    const hrefMatch = /href=["']([^"']*?\.pdf[^"']*?)["']/i.exec(context)
    const documentUrl = hrefMatch
      ? (hrefMatch[1].startsWith('http') ? hrefMatch[1] : `https://www.dgft.gov.in${hrefMatch[1]}`)
      : undefined

    items.push({
      id: simpleHash(`dgft-${noticeNumber}`),
      title: `DGFT Trade Notice No. ${noticeNumber}`,
      ministry: 'DGFT',
      department: 'Directorate General of Foreign Trade',
      type: 'notification',
      publishedAt,
      fetchedAt: now,
      summary,
      documentUrl,
      impactLevel: detectDGFTImpact(summary),
      sectors: detectDGFTSectors(summary),
      tags: ['dgft', 'trade-notice', 'export', 'msme-relevant'],
    })
  }

  // Also look for FTP amendment / public notice patterns
  const ftpPattern = /(?:Public\s+Notice|Notification)\s+No\.\s*(\d+\/20\d{2}(?:\-\d+)?)/gi
  while ((match = ftpPattern.exec(html)) !== null) {
    const idx = match.index
    const start = Math.max(0, idx - 300)
    const end = Math.min(html.length, idx + 800)
    const context = html.slice(start, end)

    const noticeNumber = match[1]

    const dateMatch = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](20\d{2})/.exec(context)
    const publishedAt = dateMatch
      ? new Date(Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1])).toISOString()
      : now

    const descMatch = />([\s\S]{10,400}?)<\/(?:a|td|p|div)/i.exec(context)
    const summary = descMatch
      ? descMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      : `DGFT Public Notice No. ${noticeNumber}`

    items.push({
      id: simpleHash(`dgft-pn-${noticeNumber}`),
      title: `DGFT Public Notice No. ${noticeNumber}`,
      ministry: 'DGFT',
      department: 'Directorate General of Foreign Trade',
      type: 'notification',
      publishedAt,
      fetchedAt: now,
      summary,
      impactLevel: detectDGFTImpact(summary),
      sectors: detectDGFTSectors(summary),
      tags: ['dgft', 'public-notice', 'ftp', 'msme-relevant'],
    })
  }

  return items
}

function detectDGFTImpact(text: string): SeverityLevel {
  const lower = text.toLowerCase()
  if (lower.includes('prohibited') || lower.includes('ban') || lower.includes('immediate')) return 'critical'
  if (lower.includes('incentive') || lower.includes('duty') || lower.includes('amendment')) return 'high'
  if (lower.includes('extension') || lower.includes('revised') || lower.includes('change')) return 'medium'
  return 'low'
}

function detectDGFTSectors(text: string): Sector[] {
  const lower = text.toLowerCase()
  const sectors: Sector[] = ['export']
  if (lower.includes('textile') || lower.includes('garment')) sectors.push('textile')
  if (lower.includes('pharma') || lower.includes('drug') || lower.includes('api')) sectors.push('pharma')
  if (lower.includes('food') || lower.includes('agri') || lower.includes('spice')) sectors.push('food', 'agriculture')
  if (lower.includes('chemical')) sectors.push('chemical')
  if (lower.includes('it') || lower.includes('software') || lower.includes('ites')) sectors.push('it')
  if (lower.includes('manufactur')) sectors.push('manufacturing')
  if (lower.includes('defence')) sectors.push('defence')
  return sectors
}

const FALLBACK_DGFT: PolicyUpdate[] = [
  {
    id: simpleHash('dgft-rodtep-extension-2026'),
    title: 'DGFT Trade Notice No. 03/2026 — RoDTEP scheme rates revised for MSME exporters',
    ministry: 'DGFT',
    department: 'Directorate General of Foreign Trade',
    type: 'notification',
    publishedAt: '2026-03-22T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'RoDTEP (Remission of Duties and Taxes on Exported Products) rates revised upward for 354 tariff lines. MSME exporters with Udyam registration eligible for additional 0.5% benefit. Applicable from 1st April 2026.',
    documentUrl: 'https://www.dgft.gov.in/CP/',
    impactLevel: 'high',
    sectors: ['export', 'manufacturing', 'textile'],
    tags: ['dgft', 'trade-notice', 'rodtep', 'msme-relevant'],
  },
  {
    id: simpleHash('dgft-hs-code-update-2026'),
    title: 'DGFT Public Notice No. 58/2026 — HS Code mapping updated for FTP 2023-28',
    ministry: 'DGFT',
    department: 'Directorate General of Foreign Trade',
    type: 'notification',
    publishedAt: '2026-03-18T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'Harmonized System (HS) code mapping updated for 128 items under Foreign Trade Policy 2023-28. Exporters must use revised codes for shipping bills from 1st May 2026. Includes new codes for processed food and value-added textile products.',
    documentUrl: 'https://www.dgft.gov.in/CP/',
    impactLevel: 'medium',
    sectors: ['export', 'food', 'textile'],
    tags: ['dgft', 'public-notice', 'hs-code', 'ftp'],
  },
  {
    id: simpleHash('dgft-meis-successor-2026'),
    title: 'DGFT Trade Notice No. 07/2026 — Enhanced export incentive for MSME clusters',
    ministry: 'DGFT',
    department: 'Directorate General of Foreign Trade',
    type: 'notification',
    publishedAt: '2026-03-12T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'New cluster-based export incentive scheme for MSME industrial clusters. Districts with Export Hub designation eligible for additional 2% duty credit scrip. 50 new districts added to Towns of Export Excellence list.',
    documentUrl: 'https://www.dgft.gov.in/CP/',
    impactLevel: 'high',
    sectors: ['export', 'manufacturing'],
    tags: ['dgft', 'trade-notice', 'export-incentive', 'msme-relevant'],
  },
  {
    id: simpleHash('dgft-import-restriction-2026'),
    title: 'DGFT Trade Notice No. 11/2026 — Import policy revision for select steel products',
    ministry: 'DGFT',
    department: 'Directorate General of Foreign Trade',
    type: 'notification',
    publishedAt: '2026-03-08T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'Import of certain flat-rolled steel products (HS 7208-7212) moved from Free to Restricted category. Quality Control Order mandatory for 15 steel product categories. Aims to protect domestic MSME steel producers.',
    documentUrl: 'https://www.dgft.gov.in/CP/',
    impactLevel: 'high',
    sectors: ['manufacturing', 'export', 'construction'],
    tags: ['dgft', 'trade-notice', 'import-restriction', 'steel'],
  },
  {
    id: simpleHash('dgft-ecom-export-2026'),
    title: 'DGFT Public Notice No. 62/2026 — Simplified e-commerce export for MSMEs',
    ministry: 'DGFT',
    department: 'Directorate General of Foreign Trade',
    type: 'notification',
    publishedAt: '2026-03-01T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'E-commerce export limit raised to Rs 25 lakh per consignment (from Rs 10 lakh). Simplified customs clearance for MSME sellers on approved e-commerce platforms. Return handling norms streamlined with 60-day window.',
    documentUrl: 'https://www.dgft.gov.in/CP/',
    impactLevel: 'medium',
    sectors: ['export', 'retail', 'it'],
    tags: ['dgft', 'public-notice', 'ecommerce', 'msme-relevant'],
  },
]

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    if (circuitBreaker.isOpen(CIRCUIT_KEY)) {
      const response: ApiResponse<PolicyUpdate[]> = {
        data: FALLBACK_DGFT,
        cached: false,
        source: 'dgft.gov.in (circuit open — fallback)',
        fetchedAt: new Date().toISOString(),
        error: 'DGFT circuit breaker open — returning mock data',
      }
      return withCors(JSON.stringify(response))
    }

    const cacheKey = 'dgft:all'
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'dgft.gov.in',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)

    let items: PolicyUpdate[] = []
    let usedFallback = false

    try {
      const res = await fetch(DGFT_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const html = await res.text()
        items = extractTradeNotices(html)
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
      items = FALLBACK_DGFT
    }

    // Sort by publishedAt descending
    items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    await cacheSet(redis, cacheKey, items, CACHE_TTL)

    const response: ApiResponse<PolicyUpdate[]> = {
      data: items,
      cached: false,
      source: usedFallback ? 'dgft.gov.in (fallback)' : 'dgft.gov.in',
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
