import React, { useState, useEffect, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { DataFreshness } from '../ui/DataFreshness.js'
import { LoadingSkeleton } from '../ui/LoadingSkeleton.js'
import { ErrorFallback } from '../ui/ErrorFallback.js'

// ── Types ─────────────────────────────────────────────────────────────────────

type CoalStatus = 'normal' | 'warning' | 'critical'
type Region = 'NR' | 'WR' | 'SR' | 'ER' | 'NER'

interface RegionData {
  code: Region
  name: string
  demandMw: number
  supplyMw: number
  shortageMw: number
  frequencyHz: number
}

interface CoalStock {
  id: string
  plant: string
  state: string
  daysRemaining: number
  status: CoalStatus
}

interface RenewableSplit {
  name: string
  gw: number
  color: string
}

interface PowerData {
  national: {
    demandMw: number
    supplyMw: number
  }
  regions: RegionData[]
  coal: CoalStock[]
  renewables: {
    solarGw: number
    windGw: number
    totalGridGw: number
  }
  alerts: string[]
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK: PowerData = {
  national: { demandMw: 215_000, supplyMw: 218_500 },
  regions: [
    { code: 'NR', name: 'Northern', demandMw: 72_000, supplyMw: 73_200, shortageMw: 0, frequencyHz: 49.98 },
    { code: 'WR', name: 'Western', demandMw: 68_500, supplyMw: 69_800, shortageMw: 0, frequencyHz: 50.01 },
    { code: 'SR', name: 'Southern', demandMw: 55_400, supplyMw: 54_100, shortageMw: 1_300, frequencyHz: 49.91 },
    { code: 'ER', name: 'Eastern', demandMw: 16_800, supplyMw: 17_000, shortageMw: 0, frequencyHz: 50.00 },
    { code: 'NER', name: 'North-East', demandMw: 2_300, supplyMw: 2_280, shortageMw: 20, frequencyHz: 49.96 },
  ],
  coal: [
    { id: 'c1', plant: 'Tanda', state: 'UP', daysRemaining: 3, status: 'critical' },
    { id: 'c2', plant: 'Farakka', state: 'WB', daysRemaining: 5, status: 'warning' },
    { id: 'c3', plant: 'Dadri', state: 'UP', daysRemaining: 9, status: 'normal' },
    { id: 'c4', plant: 'Korba', state: 'CG', daysRemaining: 12, status: 'normal' },
    { id: 'c5', plant: 'Vindhyachal', state: 'MP', daysRemaining: 2, status: 'critical' },
    { id: 'c6', plant: 'Simhadri', state: 'AP', daysRemaining: 4, status: 'warning' },
  ],
  renewables: { solarGw: 82, windGw: 45, totalGridGw: 425 },
  alerts: [
    'Southern Region shortage: 1,300 MW — Tamil Nadu & Karnataka MSMEs may face peak-hour cuts',
    '2 coal plants at critical stock (< 3 days) — watch for regional grid stress',
  ],
}

const STATUS_COLORS: Record<CoalStatus, string> = {
  normal: '#16a34a',
  warning: '#d97706',
  critical: '#dc2626',
}

// ── Panel ─────────────────────────────────────────────────────────────────────

const PowerGridPanel: React.FC = () => {
  const [data, setData] = useState<PowerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | undefined>()

  const fetchPower = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/power-status')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as PowerData
      setData(json)
      setLastUpdated(new Date().toISOString())
    } catch {
      setData(MOCK)
      setLastUpdated(new Date().toISOString())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPower()
  }, [fetchPower])

  const supplyPct = data
    ? Math.min(100, (data.national.supplyMw / data.national.demandMw) * 100)
    : 0

  const renewableSplit: RenewableSplit[] = data
    ? [
        { name: 'Solar', gw: data.renewables.solarGw, color: '#FF9933' },
        { name: 'Wind', gw: data.renewables.windGw, color: '#60a5fa' },
        {
          name: 'Other',
          gw: Math.max(
            0,
            data.renewables.totalGridGw - data.renewables.solarGw - data.renewables.windGw
          ),
          color: '#374151',
        },
      ]
    : []

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
          ⚡ Power Grid Status
        </h2>
        <DataFreshness
          source="POSOCO"
          lastUpdated={lastUpdated}
          status={loading ? 'loading' : error ? 'error' : 'fresh'}
        />
      </div>

      {loading && !data ? (
        <LoadingSkeleton lines={10} height={14} />
      ) : error && !data ? (
        <ErrorFallback
          message={error}
          onRetry={fetchPower}
          panelName="Power Grid"
        />
      ) : data ? (
        <>
          {/* MSME Alert */}
          {data.alerts.length > 0 && (
            <div
              style={{
                background: 'rgba(220,38,38,0.1)',
                border: '1px solid rgba(220,38,38,0.4)',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <h3
                style={{
                  margin: '0 0 6px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#f87171',
                }}
              >
                ⚠ MSME Power Alert
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
                {data.alerts.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {/* National demand vs supply */}
          <div
            style={{
              background: '#0a0e1a',
              border: '1px solid #1f2937',
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  National Grid
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#FF9933' }}>
                  {(data.national.demandMw / 1000).toFixed(1)} GW
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Demand</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>
                  {(data.national.supplyMw / 1000).toFixed(1)} GW
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Supply</div>
              </div>
            </div>
            <div
              style={{
                height: 14,
                background: '#1f2937',
                borderRadius: 7,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${supplyPct}%`,
                  height: '100%',
                  background:
                    supplyPct >= 100
                      ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                      : 'linear-gradient(90deg, #d97706, #dc2626)',
                  transition: 'width 0.4s',
                }}
              />
            </div>
          </div>

          {/* Regional cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 8,
            }}
          >
            {data.regions.map((r) => {
              const isShort = r.shortageMw > 0
              return (
                <div
                  key={r.code}
                  style={{
                    background: '#0a0e1a',
                    border: `1px solid ${isShort ? '#dc2626' : '#1f2937'}`,
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#FF9933' }}>
                    {r.code} — {r.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    Demand: <strong style={{ color: '#e5e7eb' }}>{(r.demandMw / 1000).toFixed(1)} GW</strong>
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>
                    Supply: <strong style={{ color: '#e5e7eb' }}>{(r.supplyMw / 1000).toFixed(1)} GW</strong>
                  </div>
                  <div style={{ fontSize: 11, color: isShort ? '#dc2626' : '#16a34a', marginTop: 2 }}>
                    Shortage: <strong>{r.shortageMw} MW</strong>
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>
                    Freq: <strong style={{ color: r.frequencyHz >= 49.95 && r.frequencyHz <= 50.05 ? '#16a34a' : '#d97706' }}>
                      {r.frequencyHz.toFixed(2)} Hz
                    </strong>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Coal + Renewables */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            {/* Coal */}
            <div
              style={{
                background: '#0a0e1a',
                border: '1px solid #1f2937',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #1f2937',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#FF9933',
                }}
              >
                Coal Stock Status
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#111827' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: '#9ca3af' }}>Plant</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: '#9ca3af' }}>State</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', color: '#9ca3af' }}>Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.coal.map((c) => (
                      <tr key={c.id} style={{ borderTop: '1px solid #1f2937' }}>
                        <td style={{ padding: '6px 8px', color: '#e5e7eb', fontWeight: 600 }}>
                          {c.plant}
                        </td>
                        <td style={{ padding: '6px 8px', color: '#9ca3af' }}>{c.state}</td>
                        <td
                          style={{
                            padding: '6px 8px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: STATUS_COLORS[c.status],
                          }}
                        >
                          {c.daysRemaining}d
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Renewables pie */}
            <div
              style={{
                background: '#0a0e1a',
                border: '1px solid #1f2937',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#FF9933', marginBottom: 6 }}>
                Renewables Mix ({data.renewables.totalGridGw} GW total)
              </div>
              <div style={{ flex: 1, minHeight: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={renewableSplit}
                      dataKey="gw"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={30}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name} ${Math.round((percent ?? 0) * 100)}%`
                      }
                      labelLine={false}
                    >
                      {renewableSplit.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#111827',
                        border: '1px solid #1f2937',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#e5e7eb',
                      }}
                      formatter={(v: number) => [`${v} GW`, '']}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 10, color: '#9ca3af' }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}

export default PowerGridPanel
