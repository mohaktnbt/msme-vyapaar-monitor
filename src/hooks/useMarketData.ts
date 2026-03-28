// ============================================================
// useMarketData — Market data hook with auto-refresh
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { getAllMarketData } from '../services/market.js'
import type { MarketPrice } from '../types/index.js'

const MARKET_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

interface UseMarketDataReturn {
  commodities: MarketPrice[]
  forex: MarketPrice[]
  indices: MarketPrice[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useMarketData(): UseMarketDataReturn {
  const [commodities, setCommodities] = useState<MarketPrice[]>([])
  const [forex, setForex] = useState<MarketPrice[]>([])
  const [indices, setIndices] = useState<MarketPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await getAllMarketData()

      if (!isMountedRef.current) return

      setCommodities(data.commodities)
      setForex(data.forex)
      setIndices(data.indices)
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to fetch market data')
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

    intervalRef.current = setInterval(fetchData, MARKET_REFRESH_INTERVAL)

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchData])

  return { commodities, forex, indices, loading, error, refresh }
}
