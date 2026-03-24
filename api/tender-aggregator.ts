// ============================================================
// MSME Vyapaar Monitor — Tender Aggregator Edge Function
// ============================================================

import type { TenderItem, PaginatedResponse, ApiResponse } from '../src/types/index.js'
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

function getBaseUrl(req: Request): string {
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}`
}

async function fetchFromApi<T>(url: string): Promise<T[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) return []
    const json = (await res.json()) as ApiResponse<T[]>
    return json.data || []
  } catch {
    return []
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const keyword = url.searchParams.get('keyword') || ''
    const state = url.searchParams.get('state') || ''
    const minValue = url.searchParams.get('minValue')
      ? Number(url.searchParams.get('minValue'))
      : undefined
    const maxValue = url.searchParams.get('maxValue')
      ? Number(url.searchParams.get('maxValue'))
      : undefined
    const closingWithin = url.searchParams.get('closingWithin')
      ? Number(url.searchParams.get('closingWithin'))
      : undefined
    const portal = url.searchParams.get('portal') || ''
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('pageSize') || '20'))
    )

    const cacheKey = `tender-agg:${simpleHash([keyword, state, String(minValue), String(maxValue), String(closingWithin), portal].join('|'))}`
    const redis = getRedisClient()

    const cachedAll = await cacheGet(redis, cacheKey)
    let allTenders: TenderItem[]

    if (cachedAll) {
      allTenders = cachedAll as TenderItem[]
    } else {
      const base = getBaseUrl(req)

      // Fetch GeM and CPPP concurrently
      const gemUrl = `${base}/api/gem-tenders`
      const cpppUrl = `${base}/api/cppp-tenders${state ? `?state=${encodeURIComponent(state)}` : ''}`

      const [gemTenders, cpppTenders] = await Promise.all([
        fetchFromApi<TenderItem>(gemUrl),
        fetchFromApi<TenderItem>(cpppUrl),
      ])

      // Merge and deduplicate by id
      const seen = new Set<string>()
      allTenders = []
      for (const t of [...gemTenders, ...cpppTenders]) {
        if (!seen.has(t.id)) {
          seen.add(t.id)
          allTenders.push(t)
        }
      }

      // Cache merged list for 20 minutes
      await cacheSet(redis, cacheKey, allTenders, 1200)
    }

    // Apply filters
    let filtered = allTenders

    if (keyword) {
      const kw = keyword.toLowerCase()
      filtered = filtered.filter(
        t =>
          t.title.toLowerCase().includes(kw) ||
          (t.description?.toLowerCase().includes(kw) ?? false) ||
          (t.department?.toLowerCase().includes(kw) ?? false)
      )
    }

    if (state && portal !== 'GeM') {
      filtered = filtered.filter(
        t =>
          !t.state ||
          t.state.toLowerCase() === state.toLowerCase()
      )
    }

    if (portal) {
      filtered = filtered.filter(
        t => t.portal.toLowerCase() === portal.toLowerCase()
      )
    }

    if (minValue !== undefined) {
      filtered = filtered.filter(t => t.value === undefined || t.value >= minValue)
    }

    if (maxValue !== undefined) {
      filtered = filtered.filter(t => t.value === undefined || t.value <= maxValue)
    }

    if (closingWithin !== undefined) {
      const cutoff = Date.now() + closingWithin * 24 * 3600 * 1000
      filtered = filtered.filter(t => {
        const closeTime = new Date(t.closeDate).getTime()
        return closeTime <= cutoff && closeTime >= Date.now()
      })
    }

    // Sort by closeDate ascending
    filtered.sort((a, b) => {
      const ta = new Date(a.closeDate).getTime()
      const tb = new Date(b.closeDate).getTime()
      return ta - tb
    })

    const total = filtered.length
    const startIdx = (page - 1) * pageSize
    const items = filtered.slice(startIdx, startIdx + pageSize)

    const paginatedResponse: PaginatedResponse<TenderItem> = {
      items,
      total,
      page,
      pageSize,
      hasMore: startIdx + pageSize < total,
    }

    return withCors(JSON.stringify({
      data: paginatedResponse,
      cached: false,
      source: 'tender-aggregator',
      fetchedAt: new Date().toISOString(),
    }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
