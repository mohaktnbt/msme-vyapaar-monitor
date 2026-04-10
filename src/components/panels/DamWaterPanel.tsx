import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { DataFreshness } from '../ui/DataFreshness.js'
import { LoadingSkeleton } from '../ui/LoadingSkeleton.js'
import { ErrorFallback } from '../ui/ErrorFallback.js'

// ── Types ─────────────────────────────────────────────────────────────────────

type DamStatus = 'normal' | 'below-normal' | 'deficient' | 'critical'

interface Dam {
  id: string
  name: string
  state: string
  fillPercent: number
  vs10YAvg: number // % deviation
  status: DamStatus
  trend: 'up' | 'down' | 'flat'
  msmeNote?: string
}

interface MonthTrend {
  month: string
  avgFill: number
}

interface DamData {
  dams: Dam[]
  nationalAvg: number
  belowNormalCount: number
  criticalCount: number
  trend12M: MonthTrend[]
}

type SortKey = 'name' | 'state' | 'fillPercent' | 'vs10YAvg'

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_DAMS: Dam[] = [
  { id: 'd1', name: 'Sardar Sarovar', state: 'Gujarat', fillPercent: 68, vs10YAvg: -4, status: 'normal', trend: 'up', msmeNote: 'Supports textile dyeing in Surat, Ahmedabad' },
  { id: 'd2', name: 'Bhakra', state: 'Punjab', fillPercent: 82, vs10YAvg: 6, status: 'normal', trend: 'up' },
  { id: 'd3', name: 'Nagarjuna Sagar', state: 'Telangana', fillPercent: 34, vs10YAvg: -22, status: 'deficient', trend: 'down', msmeNote: 'Critical for agri-processing in Nalgonda cluster' },
  { id: 'd4', name: 'Hirakud', state: 'Odisha', fillPercent: 76, vs10YAvg: 2, status: 'normal', trend: 'flat' },
  { id: 'd5', name: 'Tungabhadra', state: 'Karnataka', fillPercent: 42, vs10YAvg: -18, status: 'deficient', trend: 'down', msmeNote: 'Impacts Hospet steel & Ballari MSMEs' },
  { id: 'd6', name: 'Indira Sagar', state: 'Madhya Pradesh', fillPercent: 55, vs10YAvg: -9, status: 'below-normal', trend: 'down' },
  { id: 'd7', name: 'Krishnarajasagar (KRS)', state: 'Karnataka', fillPercent: 28, vs10YAvg: -31, status: 'critical', trend: 'down', msmeNote: 'Severe shortage affecting Mysuru silk & agri MSMEs' },
  { id: 'd8', name: 'Mettur', state: 'Tamil Nadu', fillPercent: 48, vs10YAvg: -12, status: 'below-normal', trend: 'flat', msmeNote: 'Tiruppur dyeing cluster water stress' },
  { id: 'd9', name: 'Ukai', state: 'Gujarat', fillPercent: 71, vs10YAvg: 3, status: 'normal', trend: 'up' },
  { id: 'd10', name: 'Pong', state: 'Himachal Pradesh', fillPercent: 88, vs10YAvg: 10, status: 'normal', trend: 'up' },
  { id: 'd11', name: 'Rihand', state: 'Uttar Pradesh', fillPercent: 31, vs10YAvg: -28, status: 'critical', trend: 'down' },
  { id: 'd12', name: 'Idukki', state: 'Kerala', fillPercent: 62, vs10YAvg: -5, status: 'below-normal', trend: 'flat' },
]

const MOCK_TREND: MonthTrend[] = [
  { month: 'May', avgFill: 42 },
  { month: 'Jun', avgFill: 39 },
  { month: 'Jul', avgFill: 48 },
  { month: 'Aug', avgFill: 61 },
  { month: 'Sep', avgFill: 72 },
  { month: 'Oct', avgFill: 75 },
  { month: 'Nov', avgFill: 73 },
  { month: 'Dec', avgFill: 68 },
  { month: 'Jan', avgFill: 62 },
  { month: 'Feb', avgFill: 55 },
  { month: 'Mar', avgFill: 49 },
  { month: 'Apr', avgFill: 44 },
]

const STATUS_COLORS: Record<DamStatus, { bg: string; text: string; border: string }> = {
  normal: { bg: 'rgba(22,163,74,0.15)', text: '#16a34a', border: '#16a34a' },
  'below-normal': { bg: 'rgba(217,119,6,0.15)', text: '#d97706', border: '#d97706' },
  deficient: { bg: 'rgba(234,88,12,0.15)', text: '#ea580c', border: '#ea580c' },
  critical: { bg: 'rgba(220,38,38,0.15)', text: '#dc2626', border: '#dc2626' },
}

const STATUS_LABELS: Record<DamStatus, string> = {
  normal: 'Normal',
  'below-normal': 'Below Normal',
  deficient: 'Deficient',
  critical: 'Critical',
}

function computeSummary(dams: Dam[]): { nationalAvg: number; belowNormalCount: number; criticalCount: number } {
  const avg = dams.reduce((s, d) => s + d.fillPercent, 0) / (dams.length || 1)
  return {
    nationalAvg: Math.round(avg),
    belowNormalCount: dams.filter((d) => d.status === 'below-normal' || d.status === 'deficient').length,
    criticalCount: dams.filter((d) => d.status === 'critical').length,
  }
}

// ── Panel ─────────────────────────────────────────────────────────────────────

const DamWaterPanel: React.FC = () => {
  const [data, setData] = useState<DamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | undefined>()
  const [sortKey, setSortKey] = useState<SortKey>('fillPercent')
  const [sortAsc, setSortAsc] = useState(true)

  const fetchDams = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dam-levels')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as DamData
      setData(json)
      setLastUpdated(new Date().toISOString())
    } catch {
      const summary = computeSummary(MOCK_DAMS)
      setData({
        dams: MOCK_DAMS,
        ...summary,
        trend12M: MOCK_TREND,
      })
      setLastUpdated(new Date().toISOString())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDams()
  }, [fetchDams])

  const sortedDams = useMemo(() => {
    if (!data) return []
    const arr = [...data.dams]
    arr.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortAsc ? av - bv : bv - av
      }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
    return arr
  }, [data, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const msmeDams = (data?.dams ?? []).filter((d) => d.msmeNote)

  return (
    <section
      style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: 12,
        padding: 16,
        color: '#e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#FF9933' }}>
          💧 Dam Levels & Water Storage
        </h2>
        <DataFreshness
          source="CWC"
          lastUpdated={lastUpdated}
          status={loading ? 'loading' : error ? 'error' : 'fresh'}
        />
      </div>

      {loading && !data ? (
        <LoadingSkeleton lines={8} height={14} />
      ) : error && !data ? (
        <ErrorFallback
          message={error}
          onRetry={fetchDams}
          panelName="Dam Levels"
        />
      ) : data ? (
        <>
          {/* Stats row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 10,
            }}
          >
            <div
              style={{
                background: '#0a0e1a',
                border: '1px solid #1f2937',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                National Avg Fill
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#FF9933', marginTop: 4 }}>
                {data.nationalAvg}%
              </div>
            </div>
            <div
              style={{
                background: '#0a0e1a',
                border: '1px solid #1f2937',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Below Normal
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706', marginTop: 4 }}>
                {data.belowNormalCount}
              </div>
            </div>
            <div
              style={{
                background: '#0a0e1a',
                border: '1px solid #1f2937',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Critical
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
                {data.criticalCount}
              </div>
            </div>
          </div>

          {/* Dam Table */}
          <div
            style={{
              background: '#0a0e1a',
              border: '1px solid #1f2937',
              borderRadius: 8,
              overflow: 'auto',
              maxHeight: 320,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#0a0e1a' }}>
                <tr>
                  {(
                    [
                      { key: 'name', label: 'Dam' },
                      { key: 'state', label: 'State' },
                      { key: 'fillPercent', label: 'Fill %' },
                      { key: 'vs10YAvg', label: 'vs 10Y Avg' },
                    ] as { key: SortKey; label: string }[]
                  ).map((h) => (
                    <th
                      key={h.key}
                      onClick={() => handleSort(h.key)}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        fontWeight: 700,
                        color: '#9ca3af',
                        borderBottom: '1px solid #1f2937',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      {h.label}
                      {sortKey === h.key && (sortAsc ? ' ▲' : ' ▼')}
                    </th>
                  ))}
                  <th
                    style={{
                      padding: '8px 10px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: '#9ca3af',
                      borderBottom: '1px solid #1f2937',
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: '8px 4px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#9ca3af',
                      borderBottom: '1px solid #1f2937',
                    }}
                  >
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedDams.map((dam) => {
                  const colors = STATUS_COLORS[dam.status]
                  return (
                    <tr
                      key={dam.id}
                      style={{ borderBottom: '1px solid #1f2937' }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#e5e7eb' }}>
                        {dam.name}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#9ca3af' }}>{dam.state}</td>
                      <td
                        style={{
                          padding: '8px 10px',
                          fontWeight: 700,
                          color: colors.text,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {dam.fillPercent}%
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          color: dam.vs10YAvg >= 0 ? '#16a34a' : '#dc2626',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {dam.vs10YAvg >= 0 ? '+' : ''}
                        {dam.vs10YAvg}%
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: colors.text,
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 999,
                            padding: '2px 8px',
                          }}
                        >
                          {STATUS_LABELS[dam.status]}
                        </span>
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'center', fontSize: 14 }}>
                        {dam.trend === 'up' ? '▲' : dam.trend === 'down' ? '▼' : '▬'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* MSME Impact Notes */}
          {msmeDams.length > 0 && (
            <div
              style={{
                background: 'rgba(255,153,51,0.08)',
                border: '1px solid rgba(255,153,51,0.3)',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#FF9933',
                }}
              >
                ⚠ MSME Impact
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 12,
                  color: '#e5e7eb',
                  lineHeight: 1.6,
                }}
              >
                {msmeDams.map((d) => (
                  <li key={d.id}>
                    <strong>{d.name}:</strong> {d.msmeNote}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 12 Month Trend */}
          <div>
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: 11,
                fontWeight: 700,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              National Avg Fill — Last 12 Months
            </h3>
            <div
              style={{
                background: '#0a0e1a',
                border: '1px solid #1f2937',
                borderRadius: 8,
                padding: 10,
                height: 180,
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.trend12M}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="dam-trend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} stroke="#374151" />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} stroke="#374151" />
                  <Tooltip
                    contentStyle={{
                      background: '#111827',
                      border: '1px solid #1f2937',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#e5e7eb',
                    }}
                    formatter={(v: number) => [`${v}%`, 'Avg Fill']}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgFill"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    fill="url(#dam-trend)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}

export default DamWaterPanel
