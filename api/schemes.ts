// ============================================================
// MSME Vyapaar Monitor — Schemes Edge Function
// ============================================================

import schemesJson from '../data/schemes.json' assert { type: 'json' }
import type { SchemeInfo } from '../src/types/index.js'
import {
  corsHeaders,
  withCors,
  errorResponse,
} from './_utils.js'

export const config = { runtime: 'edge' }

const schemes = schemesJson as SchemeInfo[]

function matchesQuery(scheme: SchemeInfo, q: string): boolean {
  const lower = q.toLowerCase()
  return (
    scheme.name.toLowerCase().includes(lower) ||
    scheme.description.toLowerCase().includes(lower) ||
    (scheme.nameHi?.toLowerCase().includes(lower) ?? false) ||
    scheme.tags.some(tag => tag.toLowerCase().includes(lower)) ||
    (scheme.ministry?.toLowerCase().includes(lower) ?? false)
  )
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const sector = url.searchParams.get('sector') || ''
    const state = url.searchParams.get('state') || ''
    const category = url.searchParams.get('category') || ''  // micro/small/medium
    const type = url.searchParams.get('type') || ''           // loan/grant/etc
    const q = url.searchParams.get('q') || ''

    let results = schemes.filter(s => s.active)

    // Filter by enterprise category (micro/small/medium)
    if (category) {
      results = results.filter(s =>
        s.eligibility.enterpriseCategories.some(
          c => c.toLowerCase() === category.toLowerCase()
        )
      )
    }

    // Filter by sector
    if (sector) {
      results = results.filter(s =>
        s.eligibility.sectors.some(
          sec => sec.toLowerCase() === sector.toLowerCase()
        )
      )
    }

    // Filter by state (only if scheme has state restrictions)
    if (state) {
      results = results.filter(s => {
        // If scheme has no state restriction, include it
        if (!s.eligibility.states || s.eligibility.states.length === 0) return true
        return s.eligibility.states.some(
          st => st.toLowerCase() === state.toLowerCase()
        )
      })
    }

    // Filter by benefit type
    if (type) {
      results = results.filter(s =>
        s.benefits.some(b => b.type.toLowerCase() === type.toLowerCase())
      )
    }

    // Free-text search
    if (q) {
      results = results.filter(s => matchesQuery(s, q))
    }

    return withCors(JSON.stringify({
      data: results,
      total: results.length,
      cached: false,
      source: 'schemes.json',
      fetchedAt: new Date().toISOString(),
    }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
