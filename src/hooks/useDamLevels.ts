// ============================================================
// useDamLevels — Reservoir levels hook with auto-refresh (6h)
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getDamLevels,
  type ReservoirStatus,
} from '../services/utilities.js'

const REFRESH_INTERVAL = 6 * 60 * 60 * 1000 // 6 hours

interface UseDamLevelsReturn {
  dams: ReservoirStatus[]
  loading: boolean
  error: string | null
  criticalCount: number
  nationalAvg: number
  refresh: () => void
}

export function useDamLevels(stateFilter?: string): UseDamLevelsReturn {
  const [dams, setDams] = useState<ReservoirStatus[]>([])
  const [criticalCount, setCriticalCount] = useState(0)
  const [nationalAvg, setNationalAvg] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getDamLevels(stateFilter)
      if (!isMountedRef.current) return
      setDams(res.reservoirs ?? [])
      setCriticalCount(res.criticalCount ?? 0)
      setNationalAvg(res.nationalAverage ?? 0)
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to fetch dam levels')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [stateFilter])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    isMountedRef.current = true
    fetchData()

    intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL)

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchData])

  return { dams, loading, error, criticalCount, nationalAvg, refresh }
}
