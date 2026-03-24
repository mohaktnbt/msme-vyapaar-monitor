import React, { useState, useCallback } from 'react'
import type { SchemeInfo, EnterpriseCategory, Sector } from '../../types/index.js'
import { api } from '../../services/api.js'
import { formatINR } from '../../utils/formatters.js'
import { DataFreshness } from '../ui/DataFreshness.js'
import { WhatsAppShare } from '../ui/WhatsAppShare.js'
import { LoadingSkeleton } from '../ui/LoadingSkeleton.js'
import { ErrorFallback } from '../ui/ErrorFallback.js'

// ── Static options ─────────────────────────────────────────────────────────────

const SECTORS: Sector[] = ['manufacturing', 'services', 'trading', 'agriculture', 'it', 'retail', 'export', 'construction', 'healthcare', 'textile', 'pharma', 'food', 'chemical']

const INDIAN_STATES = [
  'All India', 'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
]

const TURNOVER_OPTIONS = [
  { label: '< ₹5 Lakh', value: 500000 },
  { label: '₹5L – ₹25L', value: 2500000 },
  { label: '₹25L – ₹1 Crore', value: 10000000 },
  { label: '₹1Cr – ₹10 Crore', value: 100000000 },
  { label: '> ₹10 Crore', value: 100000001 },
]

const SOCIAL_CATEGORIES = ['General', 'SC', 'ST', 'OBC', 'Women', 'Ex-Servicemen']
const ENTERPRISE_CATEGORIES: { label: string; value: EnterpriseCategory }[] = [
  { label: 'Micro', value: 'micro' },
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
]

const STORAGE_KEY = 'saved-schemes'

function loadSaved(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function toggleSaved(id: string): string[] {
  const saved = loadSaved()
  const next = saved.includes(id) ? saved.filter((s) => s !== id) : [...saved, id]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

// ── Sub-components ────────────────────────────────────────────────────────────

type SchemeWithScore = SchemeInfo & { matchScore?: number }

function MatchGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 34, textAlign: 'right' }}>{score}%</span>
    </div>
  )
}

function SchemeCard({ scheme, savedIds, onToggleSave }: { scheme: SchemeWithScore; savedIds: string[]; onToggleSave: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const isSaved = savedIds.includes(scheme.id)
  const score = scheme.matchScore ?? 0

  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: '12px 14px', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: '#111827' }}>{scheme.name}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{scheme.ministry}</p>
        </div>
        {score > 0 && (
          <div style={{ minWidth: 120 }}>
            <p style={{ margin: '0 0 3px', fontSize: 10, color: '#6b7280', textAlign: 'right' }}>Match Score</p>
            <MatchGauge score={score} />
          </div>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#374151' }}>{scheme.description}</p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18, fontSize: 13, color: '#374151' }}>
            {scheme.benefits.map((b, i) => (
              <li key={i}>
                <strong>{b.type}:</strong> {b.description}
                {b.maxAmount ? ` (up to ${formatINR(b.maxAmount)})` : ''}
                {b.subsidyPercent ? ` – ${b.subsidyPercent}% subsidy` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{ fontSize: 12, color: '#1e3a5f', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
        >
          {expanded ? '▲ Less' : '▼ Details'}
        </button>
        <button
          onClick={() => onToggleSave(scheme.id)}
          style={{
            fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
            border: '1px solid',
            borderColor: isSaved ? '#d97706' : '#d1d5db',
            background: isSaved ? '#fef3c7' : '#fff',
            color: isSaved ? '#d97706' : '#374151',
            cursor: 'pointer',
          }}
        >
          {isSaved ? '★ Saved' : '☆ Save'}
        </button>
        <a
          href={scheme.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: '4px 12px', background: '#1e3a5f', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
        >
          Apply Now
        </a>
        <WhatsAppShare
          title={scheme.name}
          summary={`${scheme.description} — Apply: ${scheme.applicationUrl}`}
          size="sm"
        />
      </div>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export const SchemeFinderPanel: React.FC = () => {
  const [sector, setSector] = useState<string>('')
  const [state, setState] = useState<string>('')
  const [turnover, setTurnover] = useState<number | undefined>()
  const [category, setCategory] = useState<string>('')
  const [social, setSocial] = useState<string>('')
  const [results, setResults] = useState<SchemeWithScore[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [tab, setTab] = useState<'search' | 'saved'>('search')
  const [savedIds, setSavedIds] = useState<string[]>(loadSaved)
  const [lastUpdated, setLastUpdated] = useState<string | undefined>()

  const handleSearch = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const res = await api.matchSchemes({ sector, state, turnover, category })
      setResults(res.data)
      setLastUpdated(res.fetchedAt)
    } catch {
      setError('Could not fetch schemes. Showing sample results.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [sector, state, turnover, category])

  const handleToggleSave = (id: string) => setSavedIds(toggleSaved(id))

  const savedSchemes = results.filter((s) => savedIds.includes(s.id))

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #d1d5db',
    borderRadius: 6, background: '#fff', color: '#374151', cursor: 'pointer',
  }

  return (
    <section style={{ background: '#f8fafc', borderRadius: 12, padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e3a5f' }}>🏦 Scheme Finder</h2>
        <DataFreshness source="Schemes" lastUpdated={lastUpdated} status={loading ? 'loading' : 'fresh'} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderBottom: '2px solid #e5e7eb' }}>
        {(['search', 'saved'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 18px', fontSize: 13, fontWeight: 600, border: 'none', background: 'none',
              cursor: 'pointer', color: tab === t ? '#1e3a5f' : '#6b7280',
              borderBottom: tab === t ? '2px solid #1e3a5f' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            {t === 'search' ? 'Search Schemes' : `Saved (${savedIds.length})`}
          </button>
        ))}
      </div>

      {tab === 'saved' ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {savedSchemes.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingTop: 30 }}>No saved schemes yet.</p>
          ) : (
            savedSchemes.map((s) => <SchemeCard key={s.id} scheme={s} savedIds={savedIds} onToggleSave={handleToggleSave} />)
          )}
        </div>
      ) : (
        <>
          {/* Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>SECTOR</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)} style={selectStyle}>
                <option value="">All Sectors</option>
                {SECTORS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>STATE</label>
              <select value={state} onChange={(e) => setState(e.target.value)} style={selectStyle}>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>ANNUAL TURNOVER</label>
              <select value={turnover ?? ''} onChange={(e) => setTurnover(e.target.value ? Number(e.target.value) : undefined)} style={selectStyle}>
                <option value="">Select Range</option>
                {TURNOVER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>ENTERPRISE CATEGORY</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
                <option value="">All Categories</option>
                {ENTERPRISE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>SOCIAL CATEGORY</label>
              <select value={social} onChange={(e) => setSocial(e.target.value)} style={selectStyle}>
                <option value="">All</option>
                {SOCIAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={handleSearch}
                disabled={loading}
                style={{
                  width: '100%', padding: '8px 16px', background: loading ? '#9ca3af' : '#f59e0b',
                  color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Finding…' : '🔍 Find Schemes'}
              </button>
            </div>
          </div>

          {/* Results */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <LoadingSkeleton lines={6} height={70} />
            ) : error ? (
              <ErrorFallback message={error} onRetry={handleSearch} panelName="Scheme Finder" />
            ) : searched && results.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', paddingTop: 20 }}>
                No schemes found. Try broader filters.
              </p>
            ) : (
              results.map((s) => <SchemeCard key={s.id} scheme={s} savedIds={savedIds} onToggleSave={handleToggleSave} />)
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default SchemeFinderPanel
