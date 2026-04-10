// ============================================================
// useDataFreshness — Freshness tracking hook
// ============================================================

import { useState, useEffect, useRef } from 'react'

type FreshnessStatus = 'fresh' | 'stale' | 'error'

interface UseDataFreshnessReturn {
  status: FreshnessStatus
  timeAgo: string
  color: string
}

const FRESH_THRESHOLD = 5 * 60 * 1000   // 5 minutes
const STALE_THRESHOLD = 30 * 60 * 1000  // 30 minutes
const TICK_INTERVAL = 30 * 1000          // Re-evaluate every 30 seconds

function computeFreshness(lastUpdated?: string): { status: FreshnessStatus; timeAgo: string } {
  if (!lastUpdated) {
    return { status: 'error', timeAgo: 'never' }
  }

  const updatedAt = new Date(lastUpdated).getTime()
  if (isNaN(updatedAt)) {
    return { status: 'error', timeAgo: 'unknown' }
  }

  const diffMs = Date.now() - updatedAt
  if (diffMs < 0) {
    return { status: 'fresh', timeAgo: 'just now' }
  }

  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHrs = Math.floor(diffMin / 60)

  let timeAgo: string
  if (diffSec < 60) {
    timeAgo = 'just now'
  } else if (diffMin < 60) {
    timeAgo = `${diffMin}m ago`
  } else {
    timeAgo = `${diffHrs}h ${diffMin % 60}m ago`
  }

  let status: FreshnessStatus
  if (diffMs <= FRESH_THRESHOLD) {
    status = 'fresh'
  } else if (diffMs <= STALE_THRESHOLD) {
    status = 'stale'
  } else {
    status = 'error'
  }

  return { status, timeAgo }
}

function getStatusColor(status: FreshnessStatus): string {
  switch (status) {
    case 'fresh': return '#16a34a' // green
    case 'stale': return '#ca8a04' // amber
    case 'error': return '#dc2626' // red
  }
}

export function useDataFreshness(
  _source: string,
  lastUpdated?: string
): UseDataFreshnessReturn {
  const [result, setResult] = useState<UseDataFreshnessReturn>(() => {
    const { status, timeAgo } = computeFreshness(lastUpdated)
    return { status, timeAgo, color: getStatusColor(status) }
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function update() {
      const { status, timeAgo } = computeFreshness(lastUpdated)
      setResult({ status, timeAgo, color: getStatusColor(status) })
    }

    update()
    intervalRef.current = setInterval(update, TICK_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [lastUpdated])

  return result
}
