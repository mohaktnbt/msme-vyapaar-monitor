import React, { useState, useEffect } from 'react'
import { timeAgo } from '../../utils/formatters.js'

interface DataFreshnessProps {
  source: string
  lastUpdated?: string
  status?: 'fresh' | 'stale' | 'error' | 'loading'
}

function getDotColor(status: string, minutesAgo: number): string {
  if (status === 'error') return '#dc2626'
  if (status === 'loading') return '#6b7280'
  if (minutesAgo < 15) return '#16a34a'
  if (minutesAgo < 60) return '#d97706'
  return '#dc2626'
}

export const DataFreshness: React.FC<DataFreshnessProps> = ({
  source,
  lastUpdated,
  status = 'fresh',
}) => {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const minutesAgo = lastUpdated
    ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 60_000)
    : Infinity

  const dotColor = getDotColor(status, minutesAgo)

  const label =
    status === 'loading'
      ? 'Updating…'
      : status === 'error'
      ? 'Error'
      : lastUpdated
      ? timeAgo(lastUpdated)
      : 'Unknown'

  return (
    <span
      title={`${source}: ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        color: '#6b7280',
        background: '#f3f4f6',
        borderRadius: 999,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {status === 'loading' ? (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            border: '2px solid #6b7280',
            borderTopColor: 'transparent',
            display: 'inline-block',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      ) : (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: dotColor,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
      )}
      {label}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  )
}

export default DataFreshness
