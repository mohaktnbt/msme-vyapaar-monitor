import React, { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import type { MarketPrice } from '../../types/index.js'
import { api } from '../../services/api.js'
import { DataFreshness } from '../ui/DataFreshness.js'
import { LoadingSkeleton } from '../ui/LoadingSkeleton.js'

// ── Mock data ─────────────────────────────────────────────────────────────────

const now = new Date().toISOString()

const MOCK_COMMODITIES: MarketPrice[] = [
  { id: 'c1', commodity: 'Cotton', price: 6850, previousPrice: 6800, change: 50, changePercent: 0.74, unit: '/quintal', currency: 'INR', timestamp: now, source: 'Agmarknet', type: 'agri', sparkline: [6700, 6720, 6780, 6800, 6820, 6800, 6850] },
  { id: 'c2', commodity: 'Soybean', price: 4420, previousPrice: 4500, change: -80, changePercent: -1.78, unit: '/quintal', currency: 'INR', timestamp: now, source: 'Agmarknet', type: 'agri', sparkline: [4600, 4550, 4500, 4480, 4450, 4430, 4420] },
  { id: 'c3', commodity: 'Steel (HRC)', price: 54500, previousPrice: 52900, change: 1600, changePercent: 3.03, unit: '/tonne', currency: 'INR', timestamp: now, source: 'MCX', type: 'metal', sparkline: [52000, 52400, 52900, 53200, 53800, 54200, 54500] },
  { id: 'c4', commodity: 'Crude Oil', price: 6850, previousPrice: 6820, change: 30, changePercent: 0.44, unit: '/barrel', currency: 'INR', timestamp: now, source: 'MCX', type: 'energy', sparkline: [6700, 6720, 6760, 6800, 6820, 6830, 6850] },
  { id: 'c5', commodity: 'Gold', price: 72500, previousPrice: 72200, change: 300, changePercent: 0.42, unit: '/10g', currency: 'INR', timestamp: now, source: 'MCX', type: 'metal', sparkline: [71800, 72000, 72100, 72200, 72300, 72400, 72500] },
  { id: 'c6', commodity: 'Silver', price: 89000, previousPrice: 89500, change: -500, changePercent: -0.56, unit: '/kg', currency: 'INR', timestamp: now, source: 'MCX', type: 'metal', sparkline: [89800, 89700, 89600, 89500, 89400, 89100, 89000] },
]

const MOCK_FOREX: MarketPrice[] = [
  { id: 'f1', commodity: 'USD/INR', price: 83.42, previousPrice: 83.38, change: 0.04, changePercent: 0.05, unit: 'INR per USD', currency: 'INR', timestamp: now, source: 'RBI', type: 'forex', sparkline: [83.20, 83.25, 83.30, 83.35, 83.38, 83.40, 83.42] },
  { id: 'f2', commodity: 'EUR/INR', price: 90.15, previousPrice: 90.05, change: 0.10, changePercent: 0.11, unit: 'INR per EUR', currency: 'INR', timestamp: now, source: 'RBI', type: 'forex', sparkline: [89.80, 89.90, 90.00, 90.05, 90.08, 90.10, 90.15] },
  { id: 'f3', commodity: 'GBP/INR', price: 106.80, previousPrice: 106.90, change: -0.10, changePercent: -0.09, unit: 'INR per GBP', currency: 'INR', timestamp: now, source: 'RBI', type: 'forex', sparkline: [107.20, 107.10, 107.00, 106.90, 106.85, 106.82, 106.80] },
  { id: 'f4', commodity: 'AED/INR', price: 22.70, previousPrice: 22.68, change: 0.02, changePercent: 0.09, unit: 'INR per AED', currency: 'INR', timestamp: now, source: 'RBI', type: 'forex', sparkline: [22.60, 22.62, 22.65, 22.67, 22.68, 22.69, 22.70] },
]

const MOCK_INDICES: MarketPrice[] = [
  { id: 'i1', commodity: 'Sensex', price: 73450, previousPrice: 73200, change: 250, changePercent: 0.34, unit: 'points', currency: 'INR', timestamp: now, source: 'BSE', type: 'equity-index', sparkline: [72800, 72900, 73000, 73100, 73200, 73350, 73450] },
  { id: 'i2', commodity: 'Nifty 50', price: 22280, previousPrice: 22200, change: 80, changePercent: 0.36, unit: 'points', currency: 'INR', timestamp: now, source: 'NSE', type: 'equity-index', sparkline: [22050, 22100, 22150, 22180, 22200, 22250, 22280] },
  { id: 'i3', commodity: 'BSE SME IPO', price: 9850, previousPrice: 9780, change: 70, changePercent: 0.72, unit: 'points', currency: 'INR', timestamp: now, source: 'BSE', type: 'equity-index', sparkline: [9600, 9650, 9700, 9750, 9780, 9820, 9850] },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function changeColor(pct?: number): string {
  if (pct === undefined) return '#6b7280'
  return pct >= 0 ? '#16a34a' : '#dc2626'
}

function Sparkline({ data }: { data: number[] }) {
  const pts = data.map((v) => ({ v }))
  return (
    <ResponsiveContainer width={60} height={28}>
      <LineChart data={pts} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" dot={false} strokeWidth={1.5} stroke={changeColor((data[data.length - 1] ?? 0) - (data[0] ?? 0))} />
        <Tooltip
          contentStyle={{ fontSize: 10, padding: '2px 6px' }}
          formatter={(v: number) => [v.toLocaleString('en-IN'), '']}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function TickerItem({ item }: { item: MarketPrice }) {
  const pct = item.changePercent ?? 0
  const color = changeColor(pct)
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 14px',
        borderRight: '1px solid #e5e7eb',
        whiteSpace: 'nowrap',
        fontSize: 13,
      }}
    >
      <span style={{ fontWeight: 600, color: '#1e3a5f' }}>{item.commodity}</span>
      <span style={{ fontWeight: 700 }}>{item.price.toLocaleString('en-IN')}</span>
      <span style={{ color, fontWeight: 600, fontSize: 12 }}>
        {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
      </span>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export const MarketPulsePanel: React.FC = () => {
  const [commodities, setCommodities] = useState<MarketPrice[]>([])
  const [forex, setForex] = useState<MarketPrice[]>([])
  const [indices, setIndices] = useState<MarketPrice[]>([])
  const [loadingCom, setLoadingCom] = useState(true)
  const [loadingFx, setLoadingFx] = useState(true)
  const [loadingIdx, setLoadingIdx] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | undefined>()

  const fetchAll = useCallback(async () => {
    setLoadingCom(true); setLoadingFx(true); setLoadingIdx(true)

    const [comResult, fxResult, idxResult] = await Promise.allSettled([
      api.getCommodityPrices(),
      api.getForex(),
      api.getStockIndices(),
    ])

    if (comResult.status === 'fulfilled') {
      setCommodities(comResult.value.data)
      setLastUpdated(comResult.value.fetchedAt)
    } else setCommodities(MOCK_COMMODITIES)
    setLoadingCom(false)

    if (fxResult.status === 'fulfilled') setForex(fxResult.value.data)
    else setForex(MOCK_FOREX)
    setLoadingFx(false)

    if (idxResult.status === 'fulfilled') setIndices(idxResult.value.data)
    else setIndices(MOCK_INDICES)
    setLoadingIdx(false)

    if (!lastUpdated) setLastUpdated(new Date().toISOString())
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return (
    <section style={{ background: '#f8fafc', borderRadius: 12, padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e3a5f' }}>
          📈 Market Pulse
        </h2>
        <DataFreshness
          source="Market"
          lastUpdated={lastUpdated}
          status={loadingCom || loadingFx || loadingIdx ? 'loading' : 'fresh'}
        />
      </div>

      {/* Ticker */}
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 12, display: 'flex' }}>
        {(loadingIdx ? MOCK_INDICES : [...indices, ...forex.slice(0, 1)]).map((item, i) => (
          <TickerItem key={item.id} item={item} />
        ))}
      </div>

      {/* Two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1, overflow: 'hidden' }}>
        {/* Commodities */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 13, color: '#374151' }}>
            Commodities & Metals
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingCom ? (
              <div style={{ padding: 12 }}><LoadingSkeleton lines={5} height={14} /></div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Item</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>Price</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>Chg%</th>
                    <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>7d</th>
                  </tr>
                </thead>
                <tbody>
                  {commodities.map((c) => (
                    <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: '#111827' }}>
                        {c.commodity}
                        <span style={{ display: 'block', fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>{c.unit}</span>
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#111827' }}>
                        ₹{c.price.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: changeColor(c.changePercent) }}>
                        {c.changePercent !== undefined ? `${c.changePercent >= 0 ? '+' : ''}${c.changePercent.toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '2px 4px' }}>
                        {c.sparkline && <Sparkline data={c.sparkline} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Forex */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 13, color: '#374151' }}>
            Forex Rates
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingFx ? (
              <div style={{ padding: 12 }}><LoadingSkeleton lines={4} height={14} /></div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Pair</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>Rate</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>Chg%</th>
                    <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>7d</th>
                  </tr>
                </thead>
                <tbody>
                  {forex.map((f) => (
                    <tr key={f.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: '#111827' }}>{f.commodity}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#111827' }}>
                        {f.price.toFixed(2)}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: changeColor(f.changePercent) }}>
                        {f.changePercent !== undefined ? `${f.changePercent >= 0 ? '+' : ''}${f.changePercent.toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '2px 4px' }}>
                        {f.sparkline && <Sparkline data={f.sparkline} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default MarketPulsePanel
