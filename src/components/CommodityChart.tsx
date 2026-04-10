import React, { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface CommodityChartProps {
  commodity: string
  data: { date: string; price: number }[]
  color?: string
}

type TimeRange = '1D' | '1W' | '1M' | '3M'

const RANGES: TimeRange[] = ['1D', '1W', '1M', '3M']

function getDaysForRange(range: TimeRange): number {
  switch (range) {
    case '1D': return 1
    case '1W': return 7
    case '1M': return 30
    case '3M': return 90
  }
}

function formatYAxis(value: number): string {
  if (value >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(1)} Cr`
  if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(1)} L`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString('en-IN')
}

function formatTooltipPrice(value: number): string {
  return `\u20B9${value.toLocaleString('en-IN')}`
}

const CustomTooltip: React.FC<{
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid rgba(255,153,51,0.3)',
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: 12,
      }}
    >
      <div style={{ color: '#9ca3af', marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#fff', fontWeight: 700 }}>
        {formatTooltipPrice(payload[0].value)}
      </div>
    </div>
  )
}

export const CommodityChart: React.FC<CommodityChartProps> = ({
  commodity,
  data,
  color = '#FF9933',
}) => {
  const [range, setRange] = useState<TimeRange>('1M')
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  const filteredData = useMemo(() => {
    if (data.length === 0) return []
    const days = getDaysForRange(range)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const filtered = data.filter((d) => d.date >= cutoffStr)
    return filtered.length > 0 ? filtered : data.slice(-Math.min(data.length, days))
  }, [data, range])

  const currentPrice = filteredData.length > 0 ? filteredData[filteredData.length - 1].price : 0
  const startPrice = filteredData.length > 0 ? filteredData[0].price : 0
  const priceChange = currentPrice - startPrice
  const changePercent = startPrice !== 0 ? (priceChange / startPrice) * 100 : 0
  const isPositive = priceChange >= 0

  if (error) {
    return (
      <div
        style={{
          background: '#111827',
          borderRadius: 12,
          padding: 16,
          border: '1px solid #1f2937',
          textAlign: 'center',
          color: '#dc2626',
          fontSize: 13,
        }}
      >
        Failed to load chart data
      </div>
    )
  }

  if (loading) {
    return (
      <div
        style={{
          background: '#111827',
          borderRadius: 12,
          padding: 16,
          border: '1px solid #1f2937',
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: 13,
        }}
      >
        Loading chart...
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#111827',
        borderRadius: 12,
        padding: 16,
        border: '1px solid #1f2937',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', marginBottom: 2 }}>
            {commodity}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>
              {formatTooltipPrice(currentPrice)}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: isPositive ? '#16a34a' : '#dc2626',
              }}
            >
              {isPositive ? '\u25B2' : '\u25BC'}{' '}
              {Math.abs(changePercent).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Time range buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: range === r ? '#FF9933' : '#1f2937',
                color: range === r ? '#0a0e1a' : '#9ca3af',
                transition: 'background 0.15s',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {filteredData.length === 0 ? (
        <div
          style={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            fontSize: 13,
          }}
        >
          No data available for selected range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={filteredData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`gradient-${commodity}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={{ stroke: '#1f2937' }}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatYAxis}
              domain={['auto', 'auto']}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${commodity})`}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: '#111827', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default CommodityChart
