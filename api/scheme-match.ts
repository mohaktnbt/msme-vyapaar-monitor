// ============================================================
// MSME Vyapaar Monitor — Scheme Match Edge Function
// ============================================================

import schemesJson from '../data/schemes.json' assert { type: 'json' }
import type { SchemeInfo, EnterpriseCategory } from '../src/types/index.js'
import {
  corsHeaders,
  withCors,
  errorResponse,
} from './_utils.js'

export const config = { runtime: 'edge' }

const schemes = schemesJson as SchemeInfo[]

interface ScoredScheme extends SchemeInfo {
  matchScore: number
  matchReasons: string[]
}

function scoreScheme(
  scheme: SchemeInfo,
  params: {
    sector: string
    state: string
    turnover: number | undefined
    category: EnterpriseCategory | undefined
    socialCategory: string
    gender: string
  },
): ScoredScheme {
  let score = 0
  const reasons: string[] = []

  // Sector match: +30 points
  if (
    params.sector &&
    scheme.eligibility.sectors.some(
      s => s.toLowerCase() === params.sector.toLowerCase()
    )
  ) {
    score += 30
    reasons.push(`Sector match: ${params.sector}`)
  }

  // Category (enterprise size) match: +25 points
  if (
    params.category &&
    scheme.eligibility.enterpriseCategories.includes(params.category)
  ) {
    score += 25
    reasons.push(`Category match: ${params.category}`)
  }

  // Social category match: +15 points
  if (
    params.socialCategory &&
    scheme.eligibility.socialCategories &&
    scheme.eligibility.socialCategories.some(
      sc => sc.toLowerCase() === params.socialCategory.toLowerCase()
    )
  ) {
    score += 15
    reasons.push(`Social category match: ${params.socialCategory}`)
  }

  // Gender match: +5 points
  if (params.gender && scheme.eligibility.gender) {
    if (
      scheme.eligibility.gender === 'any' ||
      scheme.eligibility.gender === params.gender.toLowerCase()
    ) {
      score += 5
      reasons.push('Gender eligible')
    }
  } else if (!scheme.eligibility.gender) {
    // No gender restriction → eligible
    score += 5
  }

  // Turnover within range: +10 points
  if (params.turnover !== undefined) {
    const min = scheme.eligibility.minTurnover ?? 0
    const max = scheme.eligibility.maxTurnover ?? Infinity
    if (params.turnover >= min && params.turnover <= max) {
      score += 10
      reasons.push('Turnover within eligible range')
    }
  }

  // State match: +10 points
  if (params.state) {
    const states = scheme.eligibility.states
    if (!states || states.length === 0) {
      // All-India scheme
      score += 10
      reasons.push('All-India scheme')
    } else if (
      states.some(s => s.toLowerCase() === params.state.toLowerCase())
    ) {
      score += 10
      reasons.push(`State match: ${params.state}`)
    }
  } else {
    // No state filter provided — give benefit of doubt for all-India
    const states = scheme.eligibility.states
    if (!states || states.length === 0) {
      score += 10
    }
  }

  return { ...scheme, matchScore: score, matchReasons: reasons }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const sector = url.searchParams.get('sector') || ''
    const state = url.searchParams.get('state') || ''
    const turnoverStr = url.searchParams.get('turnover')
    const categoryStr = url.searchParams.get('category') || ''
    const socialCategory = url.searchParams.get('socialCategory') || ''
    const gender = url.searchParams.get('gender') || ''

    // Require at least one filter param
    if (!sector && !state && !categoryStr && !socialCategory && !gender && !turnoverStr) {
      return errorResponse(
        'At least one filter parameter is required: sector, state, category, turnover, socialCategory, gender',
        400
      )
    }

    const turnover = turnoverStr ? parseFloat(turnoverStr) : undefined
    const category = ['micro', 'small', 'medium'].includes(categoryStr)
      ? (categoryStr as EnterpriseCategory)
      : undefined

    const params = {
      sector,
      state,
      turnover,
      category,
      socialCategory,
      gender,
    }

    const activeSchemes = schemes.filter(s => s.active)

    const scored: ScoredScheme[] = activeSchemes
      .map(scheme => scoreScheme(scheme, params))
      .filter(s => s.matchScore > 0) // Remove zero-score schemes
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10)

    return withCors(
      JSON.stringify({
        data: scored,
        total: scored.length,
        cached: false,
        source: 'schemes.json',
        fetchedAt: new Date().toISOString(),
      })
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
