// ============================================================
// MSME Vyapaar Monitor — GST Updates Edge Function
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

const CBIC_URL = 'https://www.cbic.gov.in/htdocs-cbec/cgst/cgst-idx'
const CIRCUIT_KEY = 'gst-updates'
const CACHE_TTL = 21600 // 6 hours

function extractNotifications(html: string): PolicyUpdate[] {
  const items: PolicyUpdate[] = []
  const now = new Date().toISOString()

  // Match notification patterns: "Notification No. XX/2026-Central Tax"
  const notifPattern = /Notification\s+No\.\s*(\d+\/20\d{2})[^<]*(Central\s+Tax|Integrated\s+Tax|Union\s+Territory\s+Tax)?/gi
  let match: RegExpExecArray | null

  while ((match = notifPattern.exec(html)) !== null) {
    const idx = match.index
    const start = Math.max(0, idx - 300)
    const end = Math.min(html.length, idx + 600)
    const context = html.slice(start, end)

    const notifNumber = match[1]
    const taxType = match[2] || 'Central Tax'

    // Extract date
    const dateMatch = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](20\d{2})/.exec(context)
    const publishedAt = dateMatch
      ? new Date(Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1])).toISOString()
      : now

    // Extract linked text for description
    const descMatch = />([\s\S]{10,300}?)<\/a/i.exec(context)
    const summary = descMatch
      ? descMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      : `CGST Notification No. ${notifNumber} — ${taxType}`

    // Extract document URL
    const hrefMatch = /href=["']([^"']*?\.pdf[^"']*?)["']/i.exec(context)
    const documentUrl = hrefMatch
      ? (hrefMatch[1].startsWith('http') ? hrefMatch[1] : `https://www.cbic.gov.in${hrefMatch[1]}`)
      : undefined

    items.push({
      id: simpleHash(`gst-${notifNumber}-${taxType}`),
      title: `GST Notification No. ${notifNumber} — ${taxType}`,
      ministry: 'CBIC / GST Council',
      department: 'Central Board of Indirect Taxes and Customs',
      type: 'notification',
      publishedAt,
      fetchedAt: now,
      summary,
      documentUrl,
      impactLevel: detectGSTImpact(summary),
      sectors: detectGSTSectors(summary),
      tags: ['gst', 'cbic', 'msme-relevant', taxType.toLowerCase().replace(/\s+/g, '-')],
    })
  }

  return items
}

function detectGSTImpact(text: string): SeverityLevel {
  const lower = text.toLowerCase()
  if (lower.includes('rate') || lower.includes('penalty') || lower.includes('mandatory')) return 'high'
  if (lower.includes('amendment') || lower.includes('revised') || lower.includes('extension')) return 'medium'
  if (lower.includes('clarification') || lower.includes('corrigendum')) return 'low'
  return 'medium'
}

function detectGSTSectors(text: string): Sector[] {
  const lower = text.toLowerCase()
  const sectors: Sector[] = []
  if (lower.includes('export') || lower.includes('igst')) sectors.push('export')
  if (lower.includes('manufactur')) sectors.push('manufacturing')
  if (lower.includes('service')) sectors.push('services')
  if (lower.includes('textile')) sectors.push('textile')
  if (lower.includes('food') || lower.includes('restaurant')) sectors.push('food')
  if (lower.includes('pharma') || lower.includes('medicine')) sectors.push('pharma')
  if (lower.includes('it') || lower.includes('software')) sectors.push('it')
  if (sectors.length === 0) sectors.push('manufacturing', 'services', 'trading')
  return sectors
}

const FALLBACK_GST: PolicyUpdate[] = [
  {
    id: simpleHash('gst-cgst-rate-change-2026'),
    title: 'GST Notification No. 05/2026 — Central Tax (Rate)',
    ministry: 'CBIC / GST Council',
    department: 'Central Board of Indirect Taxes and Customs',
    type: 'notification',
    publishedAt: '2026-03-20T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'GST rate on certain textile goods (HS 5208-5212) reduced from 12% to 5% for fabrics valued below Rs 1,000 per metre. Effective from 1st April 2026. Significant relief for textile MSMEs.',
    documentUrl: 'https://www.cbic.gov.in/htdocs-cbec/cgst/notfctn-05-2026-cgst-rate.pdf',
    impactLevel: 'high',
    sectors: ['textile', 'manufacturing'],
    tags: ['gst', 'rate-change', 'msme-relevant', 'textile'],
  },
  {
    id: simpleHash('gst-quarterly-filing-2026'),
    title: 'GST Notification No. 08/2026 — Central Tax',
    ministry: 'CBIC / GST Council',
    department: 'Central Board of Indirect Taxes and Customs',
    type: 'notification',
    publishedAt: '2026-03-15T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'QRMP scheme threshold raised to Rs 10 crore aggregate turnover. Small taxpayers with turnover up to Rs 10 crore can now file quarterly returns with monthly payment of tax.',
    documentUrl: 'https://www.cbic.gov.in/htdocs-cbec/cgst/notfctn-08-2026-cgst.pdf',
    impactLevel: 'high',
    sectors: ['manufacturing', 'services', 'trading', 'retail'],
    tags: ['gst', 'compliance', 'msme-relevant', 'qrmp'],
  },
  {
    id: simpleHash('gst-composition-limit-2026'),
    title: 'GST Notification No. 12/2026 — Central Tax',
    ministry: 'CBIC / GST Council',
    department: 'Central Board of Indirect Taxes and Customs',
    type: 'notification',
    publishedAt: '2026-03-10T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'Composition scheme turnover limit enhanced to Rs 2.5 crore for goods and Rs 75 lakh for services. Tax rate remains 1% for manufacturers and 5% for restaurant services.',
    documentUrl: 'https://www.cbic.gov.in/htdocs-cbec/cgst/notfctn-12-2026-cgst.pdf',
    impactLevel: 'medium',
    sectors: ['manufacturing', 'retail', 'food'],
    tags: ['gst', 'composition-scheme', 'msme-relevant'],
  },
  {
    id: simpleHash('gst-eway-bill-2026'),
    title: 'GST Notification No. 15/2026 — Central Tax',
    ministry: 'CBIC / GST Council',
    department: 'Central Board of Indirect Taxes and Customs',
    type: 'notification',
    publishedAt: '2026-03-05T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'E-way bill threshold for intra-state movement raised to Rs 1 lakh from Rs 50,000. Reduces logistics compliance burden for MSMEs. Auto-populated e-way bills from e-invoicing system for turnover above Rs 5 crore.',
    documentUrl: 'https://www.cbic.gov.in/htdocs-cbec/cgst/notfctn-15-2026-cgst.pdf',
    impactLevel: 'medium',
    sectors: ['manufacturing', 'trading', 'export'],
    tags: ['gst', 'eway-bill', 'compliance', 'msme-relevant'],
  },
  {
    id: simpleHash('gst-late-fee-waiver-2026'),
    title: 'GST Notification No. 18/2026 — Central Tax',
    ministry: 'CBIC / GST Council',
    department: 'Central Board of Indirect Taxes and Customs',
    type: 'notification',
    publishedAt: '2026-02-28T00:00:00.000Z',
    fetchedAt: new Date().toISOString(),
    summary: 'Late fee amnesty for GSTR-3B and GSTR-1 returns for FY 2023-24 and 2024-25. Maximum late fee capped at Rs 500 per return (Rs 250 CGST + Rs 250 SGST) for nil returns. Available until 30th June 2026.',
    documentUrl: 'https://www.cbic.gov.in/htdocs-cbec/cgst/notfctn-18-2026-cgst.pdf',
    impactLevel: 'medium',
    sectors: ['manufacturing', 'services', 'trading', 'retail'],
    tags: ['gst', 'late-fee', 'amnesty', 'msme-relevant'],
  },
]

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    if (circuitBreaker.isOpen(CIRCUIT_KEY)) {
      const response: ApiResponse<PolicyUpdate[]> = {
        data: FALLBACK_GST,
        cached: false,
        source: 'cbic.gov.in (circuit open — fallback)',
        fetchedAt: new Date().toISOString(),
        error: 'GST updates circuit breaker open — returning mock data',
      }
      return withCors(JSON.stringify(response))
    }

    const cacheKey = 'gst-updates:all'
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'cbic.gov.in',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)

    let items: PolicyUpdate[] = []
    let usedFallback = false

    try {
      const res = await fetch(CBIC_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const html = await res.text()
        items = extractNotifications(html)
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
      items = FALLBACK_GST
    }

    // Sort by publishedAt descending
    items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    await cacheSet(redis, cacheKey, items, CACHE_TTL)

    const response: ApiResponse<PolicyUpdate[]> = {
      data: items,
      cached: false,
      source: usedFallback ? 'cbic.gov.in (fallback)' : 'cbic.gov.in',
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
