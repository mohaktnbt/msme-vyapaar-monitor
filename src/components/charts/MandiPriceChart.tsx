import React, { useMemo, useState } from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface MandiPriceDatum {
  date: string
  price: number
  arrivals?: number
}

interface MandiPriceChartProps {
  commodity: string
  data: MandiPriceDatum[]
  unit?: string
}

type Range = '1W' | '1M' | '3M' | '6M' | '1Y'

const RANGE_DAYS: Record<Range, number> = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
}

interface TooltipPayloadEntry {
  name?: string
  value?: number
  color?: string
  dataKey?: string
}

interface MandiTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  unit?: string
}

function MandiTooltip({ active, payload, label, unit }: MandiTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      style={{
        background: '#0a0e1a',
        border: '1px solid #1f2937',
        borderRadius: 6,
        padding: '8px 12px',
        fontSize: 12,
        color: '#e5e7eb',
      }}
    >
      <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#FF9933' }}>{label}</p>
      {payload.map((p) => (
        <div
          key={p.dataKey ?? p.name}
          style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}
        >
          <span style={{ color: p.color }}>
            {p.name}:
          </span>
          <span style={{ fontWeight: 600 }}>
            {p.dataKey === 'price'
              ? `₹${(p.value ?? 0).toLocaleString('en-IN')}${unit ? ` ${unit}` : ''}`
              : `${(p.value ?? 0).toLocaleString('en-IN')} qtl`}
          </span>
        </div>
      ))}
    </div>
  )
}

export const MandiPriceChart: React.FC<MandiPriceChartProps> = ({
  commodity,
  data,
  unit = '/quintal',
}) => {
  const [range, setRange] = useState<Range>('3M')

  const filtered = useMemo(() => {
    const days = RANGE_DAYS[range]
    return data.slice(-days)
  }, [data, range])

  const ranges: Range[] = ['1W', '1M', '3M', '6M', '1Y']

  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: '#FF9933',
          }}
        >
          {commodity} <span style={{ color: '#9ca3af', fontWeight: 400 }}>{unit}</span>
        </h4>
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: '#0a0e1a',
            border: '1px solid #1f2937',
            borderRadius: 6,
            padding: 2,
          }}
        >
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                background: range === r ? '#FF9933' : 'transparent',
                color: range === r ? '#0a0e1a' : '#9ca3af',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filtered} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              stroke="#374151"
            />
            <YAxis
              yAxisId="price"
              tick={{ fontSize: 11, fill: '#FF9933' }}
              stroke="#FF9933"
              tickFormatter={(v: number) => `₹${v}`}
            />
            <YAxis
              yAxisId="arrivals"
              orientation="right"
              tick={{ fontSize: 11, fill: '#003087' }}
              stroke="#003087"
            />
            <Tooltip content={<MandiTooltip unit={unit} />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} iconType="circle" />
            <Bar
              yAxisId="arrivals"
              dataKey="arrivals"
              name="Arrivals"
              fill="#1e3a8a"
              opacity={0.6}
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              name="Price"
              stroke="#FF9933"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#FF9933' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
