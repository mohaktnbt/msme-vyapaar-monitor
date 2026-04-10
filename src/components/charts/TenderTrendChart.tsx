import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatINR } from '../../utils/formatters.js'

export interface TenderTrendDatum {
  month: string
  gem: number
  cppp: number
  state: number
}

interface TenderTrendChartProps {
  data: TenderTrendDatum[]
  title?: string
}

interface TooltipPayloadEntry {
  name?: string
  value?: number
  color?: string
  dataKey?: string
}

interface TrendTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0)
  return (
    <div
      style={{
        background: '#0a0e1a',
        border: '1px solid #1f2937',
        borderRadius: 6,
        padding: '8px 12px',
        fontSize: 12,
        color: '#e5e7eb',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#FF9933' }}>{label}</p>
      {payload.map((p) => (
        <div
          key={p.dataKey ?? p.name}
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: p.color ?? '#6b7280',
              display: 'inline-block',
            }}
          />
          <span style={{ flex: 1, textTransform: 'capitalize' }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{formatINR((p.value ?? 0) * 1_00_00_000)}</span>
        </div>
      ))}
      <div
        style={{
          borderTop: '1px solid #1f2937',
          marginTop: 6,
          paddingTop: 6,
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 700,
          color: '#FF9933',
        }}
      >
        <span>Total:</span>
        <span>{formatINR(total * 1_00_00_000)}</span>
      </div>
    </div>
  )
}

export const TenderTrendChart: React.FC<TenderTrendChartProps> = ({ data, title }) => {
  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: 8,
        padding: 12,
      }}
    >
      {title && (
        <h4
          style={{
            margin: '0 0 10px',
            fontSize: 13,
            fontWeight: 700,
            color: '#FF9933',
          }}
        >
          {title}
        </h4>
      )}
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="gem-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF9933" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#FF9933" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="cppp-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#003087" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#003087" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="state-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#16a34a" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              stroke="#374151"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              stroke="#374151"
              tickFormatter={(v: number) => `${v}Cr`}
            />
            <Tooltip content={<TrendTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
              iconType="circle"
            />
            <Area
              type="monotone"
              dataKey="gem"
              name="GeM"
              stackId="1"
              stroke="#FF9933"
              fill="url(#gem-grad)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="cppp"
              name="CPPP"
              stackId="1"
              stroke="#003087"
              fill="url(#cppp-grad)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="state"
              name="State"
              stackId="1"
              stroke="#16a34a"
              fill="url(#state-grad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
