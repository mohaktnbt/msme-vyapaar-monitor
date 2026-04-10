// ============================================================
// usePowerStatus — Power grid hook with auto-refresh (1h)
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  getPowerStatus,
  type PowerGridSnapshot,
} from '../services/utilities.js'

const REFRESH_INTERVAL = 60 * 60 * 1000 // 1 hour

interface UsePowerStatusReturn {
  status: PowerGridSnapshot | null
  loading: boolean
  error: string | null
  hasShortage: boolean
  criticalRegions: string[]
  refresh: () => void
}

export function usePowerStatus(): UsePowerStatusReturn {
  const [status, setStatus] = useState<PowerGridSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const snapshot = await getPowerStatus()
      if (!isMountedRef.current) return
      setStatus(snapshot)
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to fetch power status')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

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

  const { hasShortage, criticalRegions } = useMemo(() => {
    if (!status) return { hasShortage: false, criticalRegions: [] as string[] }
    const critical = status.regions
      .filter((r) => r.shortageMW > 500)
      .map((r) => r.name)
    return {
      hasShortage: critical.length > 0,
      criticalRegions: critical,
    }
  }, [status])

  return { status, loading, error, hasShortage, criticalRegions, refresh }
}
