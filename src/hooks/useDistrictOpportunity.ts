// ============================================================
// useDistrictOpportunity — Aggregates signals across services
// and computes a district opportunity score.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  computeDistrictScore,
  type OpportunityScoreInput,
  type OpportunityScoreResult,
} from '../services/opportunity-score.js'
import { getDamLevels, getPowerStatus } from '../services/utilities.js'
import { api } from '../services/api.js'

interface UseDistrictOpportunityReturn {
  score: number | null
  grade: OpportunityScoreResult['grade'] | null
  breakdown: OpportunityScoreResult['breakdown'] | null
  topFactors: OpportunityScoreResult['topFactors']
  recommendations: string[]
  loading: boolean
  error: string | null
  refresh: () => void
  compareWith: (otherDistrict: string) => Promise<OpportunityScoreResult | null>
}

/**
 * Reasonable connectivity heuristics for well-known districts.
 * Everything else falls back to neutral connectivity defaults.
 */
const CONNECTIVITY_HINTS: Record<
  string,
  OpportunityScoreInput['connectivityData']
> = {
  mumbai: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 5 },
  pune: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 150 },
  'bengaluru urban': {
    hasHighway: true,
    hasRail: true,
    hasAirport: true,
    distanceToPort: 350,
  },
  chennai: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 10 },
  ahmedabad: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 120 },
  hyderabad: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 550 },
  'new delhi': { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 900 },
  kolkata: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 15 },
}

function getConnectivityFor(district: string): OpportunityScoreInput['connectivityData'] {
  const hit = CONNECTIVITY_HINTS[district.toLowerCase()]
  if (hit) return hit
  return { hasHighway: true, hasRail: true, hasAirport: false, distanceToPort: 500 }
}

async function gatherInputs(
  district: string,
  state: string
): Promise<OpportunityScoreInput> {
  const [tenderRes, schemeRes, damRes, powerRes] = await Promise.allSettled([
    api.getTenderAggregator({ state }),
    api.getSchemes(),
    getDamLevels(state),
    getPowerStatus(),
  ])

  let tenderData: OpportunityScoreInput['tenderData']
  if (tenderRes.status === 'fulfilled') {
    const items = tenderRes.value.data.items ?? []
    const totalValueCr =
      items.reduce((sum, t) => sum + (t.value ?? 0), 0) / 1e7 // INR → crores
    tenderData = { count: items.length, totalValueCr: Math.round(totalValueCr) }
  }

  let schemeData: OpportunityScoreInput['schemeData']
  if (schemeRes.status === 'fulfilled') {
    schemeData = { activeCount: (schemeRes.value.data ?? []).filter((s) => s.active).length }
  }

  let waterData: OpportunityScoreInput['waterData']
  if (damRes.status === 'fulfilled') {
    const dams = damRes.value.reservoirs ?? []
    if (dams.length > 0) {
      const avg = dams.reduce((s, d) => s + d.fillPercent, 0) / dams.length
      waterData = { damFillPct: Math.round(avg) }
    }
  }

  let powerData: OpportunityScoreInput['powerData']
  if (powerRes.status === 'fulfilled') {
    const snapshot = powerRes.value
    const totalDemand = snapshot.regions.reduce((s, r) => s + r.demandMW, 0)
    const totalShortage = snapshot.regions.reduce((s, r) => s + r.shortageMW, 0)
    const reliability = totalDemand > 0 ? ((totalDemand - totalShortage) / totalDemand) * 100 : 90
    powerData = { reliabilityPct: Math.round(reliability), tariffRs: 7.5 }
  }

  return {
    district,
    state,
    tenderData,
    schemeData,
    waterData,
    powerData,
    connectivityData: getConnectivityFor(district),
  }
}

export function useDistrictOpportunity(
  district: string,
  state: string
): UseDistrictOpportunityReturn {
  const [result, setResult] = useState<OpportunityScoreResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const input = await gatherInputs(district, state)
      const computed = computeDistrictScore(input)
      if (!isMountedRef.current) return
      setResult(computed)
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to compute opportunity score')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [district, state])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  const compareWith = useCallback(
    async (otherDistrict: string): Promise<OpportunityScoreResult | null> => {
      try {
        const input = await gatherInputs(otherDistrict, state)
        return computeDistrictScore(input)
      } catch {
        return null
      }
    },
    [state]
  )

  useEffect(() => {
    isMountedRef.current = true
    fetchData()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchData])

  return {
    score: result?.score ?? null,
    grade: result?.grade ?? null,
    breakdown: result?.breakdown ?? null,
    topFactors: result?.topFactors ?? [],
    recommendations: result?.recommendations ?? [],
    loading,
    error,
    refresh,
    compareWith,
  }
}
