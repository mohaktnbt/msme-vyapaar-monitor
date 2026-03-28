// ============================================================
// useNewsStream — News hook with auto-refresh
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../services/api.js'
import type { NewsItem, Language } from '../types/index.js'

const NEWS_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

interface UseNewsStreamReturn {
  news: NewsItem[]
  loading: boolean
  error: string | null
  refresh: () => void
  hasMore: boolean
  loadMore: () => void
}

export function useNewsStream(
  category?: string,
  language?: Language
): UseNewsStreamReturn {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)

  const fetchNews = useCallback(
    async (_pageNum: number, append: boolean) => {
      try {
        if (!append) setLoading(true)
        setError(null)

        const res = await api.getNewsAggregated({
          category,
          language,
        })

        if (!isMountedRef.current) return

        const items = res.data.items
        if (append) {
          setNews((prev) => {
            const existingIds = new Set(prev.map((n) => n.id))
            const newItems = items.filter((n) => !existingIds.has(n.id))
            return [...prev, ...newItems]
          })
        } else {
          setNews(items)
        }

        setHasMore(res.data.hasMore)
      } catch (err) {
        if (!isMountedRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to fetch news')
      } finally {
        if (isMountedRef.current) setLoading(false)
      }
    },
    [category, language]
  )

  const refresh = useCallback(() => {
    setPage(1)
    fetchNews(1, false)
  }, [fetchNews])

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchNews(nextPage, true)
  }, [hasMore, loading, page, fetchNews])

  // Initial fetch and auto-refresh
  useEffect(() => {
    isMountedRef.current = true
    setPage(1)
    fetchNews(1, false)

    intervalRef.current = setInterval(() => {
      fetchNews(1, false)
    }, NEWS_REFRESH_INTERVAL)

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchNews])

  return { news, loading, error, refresh, hasMore, loadMore }
}
