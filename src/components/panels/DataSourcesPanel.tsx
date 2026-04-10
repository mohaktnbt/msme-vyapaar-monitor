import React, { useState, useMemo } from 'react'
import { DataFreshness } from '../ui/DataFreshness.js'

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceCategory =
  | 'government'
  | 'tenders'
  | 'market'
  | 'news'
  | 'civic'
  | 'sector'

type SourceTier = 1 | 2 | 3
type SourceStatus = 'active' | 'degraded' | 'offline'
type UpdateFreq = 'hourly' | 'daily' | 'weekly' | 'monthly'

interface DataSource {
  id: string
  name: string
  url: string
  category: SourceCategory
  tier: SourceTier
  frequency: UpdateFreq
  status: SourceStatus
  description?: string
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_SOURCES: DataSource[] = [
  { id: 's1', name: 'GeM Portal', url: 'https://gem.gov.in', category: 'tenders', tier: 1, frequency: 'hourly', status: 'active', description: 'Government e-Marketplace tenders' },
  { id: 's2', name: 'CPPP', url: 'https://eprocure.gov.in', category: 'tenders', tier: 1, frequency: 'hourly', status: 'active', description: 'Central Public Procurement Portal' },
  { id: 's3', name: 'Agmarknet', url: 'https://agmarknet.gov.in', category: 'market', tier: 1, frequency: 'daily', status: 'active', description: 'Mandi prices across India' },
  { id: 's4', name: 'RBI Data Warehouse', url: 'https://dbie.rbi.org.in', category: 'government', tier: 1, frequency: 'daily', status: 'active', description: 'Monetary & forex data' },
  { id: 's5', name: 'MCA21', url: 'https://mca.gov.in', category: 'government', tier: 1, frequency: 'daily', status: 'active', description: 'Company filings & registrations' },
  { id: 's6', name: 'MCX', url: 'https://mcxindia.com', category: 'market', tier: 1, frequency: 'hourly', status: 'active', description: 'Commodity exchange' },
  { id: 's7', name: 'NSE', url: 'https://nseindia.com', category: 'market', tier: 1, frequency: 'hourly', status: 'active', description: 'Stock exchange' },
  { id: 's8', name: 'Economic Times', url: 'https://economictimes.com', category: 'news', tier: 1, frequency: 'hourly', status: 'active', description: 'Business news' },
  { id: 's9', name: 'PIB', url: 'https://pib.gov.in', category: 'government', tier: 1, frequency: 'daily', status: 'active', description: 'Press Information Bureau' },
  { id: 's10', name: 'CWC Reservoir Bulletin', url: 'https://cwc.gov.in', category: 'civic', tier: 1, frequency: 'weekly', status: 'active', description: 'Dam storage levels' },
  { id: 's11', name: 'POSOCO NLDC', url: 'https://posoco.in', category: 'civic', tier: 1, frequency: 'hourly', status: 'degraded', description: 'National grid dispatch' },
  { id: 's12', name: 'Textile Commissioner', url: 'https://txcindia.gov.in', category: 'sector', tier: 2, frequency: 'weekly', status: 'active', description: 'Textile sector data' },
]

const CATEGORY_LABELS: Record<SourceCategory | 'all', string> = {
  all: 'All',
  government: 'Government',
  tenders: 'Tenders',
  market: 'Market',
  news: 'News',
  civic: 'Civic',
  sector: 'Sector',
}

const CATEGORY_COLORS: Record<SourceCategory, string> = {
  government: '#003087',
  tenders: '#FF9933',
  market: '#16a34a',
  news: '#7c3aed',
  civic: '#0891b2',
  sector: '#b45309',
}

const STATUS_COLORS: Record<SourceStatus, string> = {
  active: '#16a34a',
  degraded: '#d97706',
  offline: '#dc2626',
}

const TIER_COLORS: Record<SourceTier, string> = {
  1: '#FF9933',
  2: '#60a5fa',
  3: '#9ca3af',
}

// ── Panel ─────────────────────────────────────────────────────────────────────

const DataSourcesPanel: React.FC = () => {
  const [sources] = useState<DataSource[]>(MOCK_SOURCES)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<SourceCategory | 'all'>('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sources.filter((s) => {
      if (category !== 'all' && s.category !== category) return false
      if (q && !s.name.toLowerCase().includes(q) && !(s.description ?? '').toLowerCase().includes(q))
        return false
      return true
    })
  }, [sources, search, category])

  const stats = useMemo(() => {
    return {
      total: sources.length,
      active: sources.filter((s) => s.status === 'active').length,
      government: sources.filter((s) => s.category === 'government').length,
      liveFeeds: sources.filter((s) => s.frequency === 'hourly').length,
    }
  }, [sources])

  const CATEGORIES: ('all' | SourceCategory)[] = [
    'all',
    'government',
    'tenders',
    'market',
    'news',
    'civic',
    'sector',
  ]

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
          📚 Our Data Sources
        </h2>
        <DataFreshness source="Internal" lastUpdated={new Date().toISOString()} status="fresh" />
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 8,
        }}
      >
        {[
          { label: 'Sources', value: stats.total, color: '#FF9933' },
          { label: 'Active', value: stats.active, color: '#16a34a' },
          { label: 'Government', value: stats.government, color: '#60a5fa' },
          { label: 'Live Feeds', value: stats.liveFeeds, color: '#f472b6' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: '#0a0e1a',
              border: '1px solid #1f2937',
              borderRadius: 8,
              padding: 10,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginTop: 2 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="text"
          placeholder="Search data sources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: '#0a0e1a',
            border: '1px solid #1f2937',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 13,
            color: '#e5e7eb',
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 999,
                border: '1px solid',
                borderColor: category === c ? '#FF9933' : '#1f2937',
                background: category === c ? 'rgba(255,153,51,0.15)' : '#0a0e1a',
                color: category === c ? '#FF9933' : '#9ca3af',
                cursor: 'pointer',
              }}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Source cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 8,
        }}
      >
        {filtered.map((s) => (
          <div
            key={s.id}
            style={{
              background: '#0a0e1a',
              border: '1px solid #1f2937',
              borderRadius: 8,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: CATEGORY_COLORS[s.category],
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {s.name.charAt(0)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#e5e7eb',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.name}
                  </div>
                </div>
              </div>
              <span
                title={s.status}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: STATUS_COLORS[s.status],
                  flexShrink: 0,
                }}
              />
            </div>

            {s.description && (
              <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>
                {s.description}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: 4,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#fff',
                  background: CATEGORY_COLORS[s.category],
                  borderRadius: 3,
                  padding: '1px 5px',
                }}
              >
                {CATEGORY_LABELS[s.category].toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: TIER_COLORS[s.tier],
                  border: `1px solid ${TIER_COLORS[s.tier]}`,
                  borderRadius: 3,
                  padding: '0 5px',
                }}
              >
                T{s.tier}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: '#9ca3af',
                  background: '#1f2937',
                  borderRadius: 3,
                  padding: '1px 5px',
                }}
              >
                {s.frequency}
              </span>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginLeft: 'auto',
                  fontSize: 12,
                  color: '#60a5fa',
                  textDecoration: 'none',
                }}
                title={s.url}
              >
                ↗
              </a>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: 20,
              color: '#9ca3af',
              fontSize: 13,
            }}
          >
            No sources match your search.
          </div>
        )}
      </div>
    </section>
  )
}

export default DataSourcesPanel
