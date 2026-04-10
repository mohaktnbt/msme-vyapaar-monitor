// ============================================================
// useSchemes — Government schemes hook
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../services/api.js'
import { getSchemes } from '../services/govt-data.js'
import type { SchemeInfo } from '../types/index.js'

export interface UseSchemesFilters {
  sector?: string
  state?: string
  category?: string
}

export interface SchemeMatchProfile {
  sector?: string
  state?: string
  turnover?: number
  category?: string
}

interface UseSchemesReturn {
  schemes: SchemeInfo[]
  loading: boolean
  error: string | null
  matchSchemes: (profile: SchemeMatchProfile) => Promise<(SchemeInfo & { matchScore: number })[]>
}

export function useSchemes(filters?: UseSchemesFilters): UseSchemesReturn {
  const [schemes, setSchemes] = useState<SchemeInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchSchemes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const items = await getSchemes({
        sector: filters?.sector,
        state: filters?.state,
        category: filters?.category,
      })

      if (!isMountedRef.current) return

      setSchemes(items)
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to fetch schemes')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [filters?.sector, filters?.state, filters?.category])

  const matchSchemes = useCallback(
    async (profile: SchemeMatchProfile): Promise<(SchemeInfo & { matchScore: number })[]> => {
      try {
        const res = await api.matchSchemes({
          sector: profile.sector,
          state: profile.state,
          turnover: profile.turnover,
          category: profile.category,
        })
        return res.data
      } catch (err) {
        console.warn('Scheme matching failed:', err)
        return []
      }
    },
    []
  )

  useEffect(() => {
    isMountedRef.current = true
    fetchSchemes()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchSchemes])

  return { schemes, loading, error, matchSchemes }
}
