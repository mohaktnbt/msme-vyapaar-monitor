import React, { useState, useEffect, useCallback } from 'react'

interface TickerDataItem {
  name: string
  price: number
  changePercent: number
  unit?: string
}

const MOCK_TICKER_DATA: TickerDataItem[] = [
  { name: 'Gold', price: 72500, changePercent: 0.42, unit: '/10g' },
  { name: 'Silver', price: 89000, changePercent: -0.56, unit: '/kg' },
  { name: 'Crude Oil', price: 6850, changePercent: 0.44, unit: '/barrel' },
  { name: 'USD/INR', price: 83.42, changePercent: 0.05 },
  { name: 'BSE SME', price: 9850, changePercent: 0.72 },
  { name: 'Nifty 50', price: 22280, changePercent: 0.36 },
  { name: 'Cotton', price: 6850, changePercent: 0.74, unit: '/qtl' },
  { name: 'Soybean', price: 4420, changePercent: -1.78, unit: '/qtl' },
  { name: 'Steel HRC', price: 54500, changePercent: 3.03, unit: '/t' },
  { name: 'Wheat', price: 2650, changePercent: -0.32, unit: '/qtl' },
  { name: 'Rice', price: 3800, changePercent: 0.18, unit: '/qtl' },
]

function formatTickerPrice(price: number): string {
  if (price < 100) return price.toFixed(2)
  return price.toLocaleString('en-IN')
}

const TICKER_STYLE: React.CSSProperties = {
  background: '#0a0e1a',
  borderBottom: '1px solid rgba(255,153,51,0.2)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  position: 'relative',
  height: 36,
  display: 'flex',
  alignItems: 'center',
}

const MARQUEE_TRACK_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  animation: 'marquee-scroll 40s linear infinite',
}

const ITEM_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 16px',
  fontSize: 12,
  fontWeight: 600,
  borderRight: '1px solid rgba(255,255,255,0.08)',
  height: 36,
}

export const MarketTicker: React.FC = () => {
  const [data, setData] = useState<TickerDataItem[]>(MOCK_TICKER_DATA)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    // In production this would call an API; for now use mock data
    try {
      setData(MOCK_TICKER_DATA)
    } catch {
      setError('Failed to load ticker data')
      setData(MOCK_TICKER_DATA)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (error && data.length === 0) {
    return (
      <div style={{ ...TICKER_STYLE, justifyContent: 'center' }}>
        <span style={{ color: '#dc2626', fontSize: 12 }}>Ticker unavailable</span>
      </div>
    )
  }

  if (loading && data.length === 0) {
    return (
      <div style={{ ...TICKER_STYLE, justifyContent: 'center' }}>
        <span style={{ color: '#6b7280', fontSize: 12 }}>Loading ticker...</span>
      </div>
    )
  }

  // Duplicate data for seamless loop
  const items = [...data, ...data]

  return (
    <div style={TICKER_STYLE}>
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .market-ticker-track:hover {
          animation-play-state: paused !important;
        }
      `}</style>
      <div className="market-ticker-track" style={MARQUEE_TRACK_STYLE}>
        {items.map((item, idx) => {
          const isPositive = item.changePercent >= 0
          const changeColor = isPositive ? '#16a34a' : '#dc2626'
          const arrow = isPositive ? '\u25B2' : '\u25BC'

          return (
            <span key={`${item.name}-${idx}`} style={ITEM_STYLE}>
              <span style={{ color: '#9ca3af' }}>{item.name}</span>
              <span style={{ color: '#fff' }}>
                {'\u20B9'}{formatTickerPrice(item.price)}
              </span>
              <span style={{ color: changeColor, fontSize: 11 }}>
                {arrow} {Math.abs(item.changePercent).toFixed(2)}%
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default MarketTicker
