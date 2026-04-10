// ============================================================
// useTenders — Tender hook with auto-refresh
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { getTenders, computeTenderStats } from '../services/tenders.js'
import type { TenderItem, TenderPortal } from '../types/index.js'
import type { TenderStats } from '../services/tenders.js'

const TENDER_REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes

export interface UseTendersFilters {
  portal?: TenderPortal
  state?: string
  minValue?: number
  maxValue?: number
}

interface UseTendersReturn {
  tenders: TenderItem[]
  loading: boolean
  error: string | null
  refresh: () => void
  stats: TenderStats | null
}

export function useTenders(filters?: UseTendersFilters): UseTendersReturn {
  const [tenders, setTenders] = useState<TenderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<TenderStats | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)

  const fetchTenders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const items = await getTenders({
        portal: filters?.portal,
        state: filters?.state,
        minValue: filters?.minValue,
        maxValue: filters?.maxValue,
      })

      if (!isMountedRef.current) return

      setTenders(items)
      setStats(computeTenderStats(items))
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to fetch tenders')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [filters?.portal, filters?.state, filters?.minValue, filters?.maxValue])

  const refresh = useCallback(() => {
    fetchTenders()
  }, [fetchTenders])

  useEffect(() => {
    isMountedRef.current = true
    fetchTenders()

    intervalRef.current = setInterval(fetchTenders, TENDER_REFRESH_INTERVAL)

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchTenders])

  return { tenders, loading, error, refresh, stats }
}
