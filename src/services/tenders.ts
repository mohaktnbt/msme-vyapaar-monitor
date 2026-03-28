// ============================================================
// Tender Service Layer
// Wraps api.ts tender calls with additional aggregation logic
// ============================================================

import { api } from './api.js'
import type { TenderItem, TenderPortal } from '../types/index.js'

export interface TenderFilters {
  portal?: TenderPortal
  state?: string
  minValue?: number
  maxValue?: number
  keyword?: string
  page?: number
}

export interface TenderStats {
  totalCount: number
  byPortal: Record<string, number>
  byState: Record<string, number>
  byValueRange: {
    below1Lakh: number
    lakh1to10: number
    lakh10to1Cr: number
    above1Cr: number
    unspecified: number
  }
  msmeFriendlyCount: number
}

/**
 * Fetch tenders from all portals, apply client-side filters
 */
export async function getTenders(filters?: TenderFilters): Promise<TenderItem[]> {
  const results: TenderItem[] = []

  // Fetch from all sources in parallel
  const [aggregated, gem, cppp] = await Promise.allSettled([
    api.getTenderAggregator({
      keyword: filters?.keyword,
      state: filters?.state,
      page: filters?.page,
    }),
    api.getGemTenders(),
    api.getCpppTenders(filters?.state),
  ])

  if (aggregated.status === 'fulfilled') {
    results.push(...aggregated.value.data.items)
  }
  if (gem.status === 'fulfilled') {
    results.push(...gem.value.data)
  }
  if (cppp.status === 'fulfilled') {
    results.push(...cppp.value.data)
  }

  // Deduplicate by id
  const seen = new Set<string>()
  const unique = results.filter((t) => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })

  // Apply client-side filters
  return unique.filter((t) => {
    if (filters?.portal && t.portal !== filters.portal) return false
    if (filters?.state && t.state && t.state !== filters.state) return false
    if (filters?.minValue !== undefined && (t.value ?? 0) < filters.minValue) return false
    if (filters?.maxValue !== undefined && (t.value ?? Infinity) > filters.maxValue) return false
    return true
  })
}

/**
 * Compute aggregate stats from a set of tenders
 */
export function computeTenderStats(tenders: TenderItem[]): TenderStats {
  const byPortal: Record<string, number> = {}
  const byState: Record<string, number> = {}
  const byValueRange = {
    below1Lakh: 0,
    lakh1to10: 0,
    lakh10to1Cr: 0,
    above1Cr: 0,
    unspecified: 0,
  }
  let msmeFriendlyCount = 0

  for (const t of tenders) {
    // By portal
    byPortal[t.portal] = (byPortal[t.portal] ?? 0) + 1

    // By state
    if (t.state) {
      byState[t.state] = (byState[t.state] ?? 0) + 1
    }

    // By value range
    const val = t.value ?? t.estimatedValueMin
    if (val === undefined || val === null) {
      byValueRange.unspecified++
    } else if (val < 1_00_000) {
      byValueRange.below1Lakh++
    } else if (val < 10_00_000) {
      byValueRange.lakh1to10++
    } else if (val < 1_00_00_000) {
      byValueRange.lakh10to1Cr++
    } else {
      byValueRange.above1Cr++
    }

    if (t.msmeFriendly) msmeFriendlyCount++
  }

  return {
    totalCount: tenders.length,
    byPortal,
    byState,
    byValueRange,
    msmeFriendlyCount,
  }
}

/**
 * Get aggregate tender stats from all portals
 */
export async function getTenderStats(): Promise<TenderStats> {
  const tenders = await getTenders()
  return computeTenderStats(tenders)
}

/**
 * Search tenders by text query across titles and descriptions
 */
export async function searchTenders(query: string): Promise<TenderItem[]> {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) return []

  const tenders = await getTenders({ keyword: query })

  // Additional client-side text matching on title/description
  const terms = normalizedQuery.split(/\s+/)
  return tenders.filter((t) => {
    const searchable = `${t.title} ${t.description ?? ''} ${t.department} ${t.category}`.toLowerCase()
    return terms.every((term) => searchable.includes(term))
  })
}
