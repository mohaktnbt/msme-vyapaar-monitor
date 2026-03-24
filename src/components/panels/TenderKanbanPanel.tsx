import React, { useState, useEffect, useCallback } from 'react'
import type { TenderItem, TenderPortal } from '../../types/index.js'
import { api } from '../../services/api.js'
import { truncate } from '../../utils/formatters.js'
import { DataFreshness } from '../ui/DataFreshness.js'
import { ValueDisplay } from '../ui/ValueDisplay.js'
import { CountdownTimer } from '../ui/CountdownTimer.js'
import { LoadingSkeleton } from '../ui/LoadingSkeleton.js'
import { ErrorFallback } from '../ui/ErrorFallback.js'

// ── Types ─────────────────────────────────────────────────────────────────────

type KanbanColumn = 'new' | 'shortlisted' | 'submitted' | 'closed'
type KanbanState = Record<KanbanColumn, string[]> // tender IDs

const COLUMNS: { id: KanbanColumn; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'submitted', label: 'Bid Submitted' },
  { id: 'closed', label: 'Won / Lost' },
]

const PORTAL_COLORS: Record<TenderPortal, string> = {
  GeM: '#1e40af',
  CPPP: '#065f46',
  IREPS: '#7c3aed',
  State: '#b45309',
  PSU: '#0369a1',
  Defence: '#1f2937',
}

// ── Mock data ─────────────────────────────────────────────────────────────────

function makeDate(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString()
}

const MOCK_TENDERS: TenderItem[] = [
  { id: 't1', title: 'Supply of IT Equipment to District Hospitals', department: 'Health Dept, Maharashtra', value: 4500000, openDate: makeDate(-5), closeDate: makeDate(2), portal: 'GeM', portalUrl: 'https://gem.gov.in', category: 'IT Equipment', sector: 'healthcare', fetchedAt: new Date().toISOString() },
  { id: 't2', title: 'Procurement of Cotton Yarn for KVIC', department: 'KVIC, Ministry of MSME', value: 12000000, openDate: makeDate(-3), closeDate: makeDate(5), portal: 'CPPP', portalUrl: 'https://eprocure.gov.in', category: 'Raw Material', sector: 'textile', fetchedAt: new Date().toISOString() },
  { id: 't3', title: 'Office Furniture Supply — Central Secretariat', department: 'Ministry of Finance', value: 800000, openDate: makeDate(-1), closeDate: makeDate(8), portal: 'GeM', portalUrl: 'https://gem.gov.in', category: 'Furniture', fetchedAt: new Date().toISOString() },
  { id: 't4', title: 'Annual Maintenance Contract for Lifts', department: 'CPWD, New Delhi', value: 2200000, openDate: makeDate(-10), closeDate: makeDate(12), portal: 'CPPP', portalUrl: 'https://eprocure.gov.in', category: 'Maintenance', sector: 'construction', fetchedAt: new Date().toISOString() },
  { id: 't5', title: 'Supply of Surgical Consumables', department: 'AIIMS Bhubaneswar', value: 3800000, openDate: makeDate(-2), closeDate: makeDate(15), portal: 'GeM', portalUrl: 'https://gem.gov.in', category: 'Medical', sector: 'healthcare', msmeFriendly: true, fetchedAt: new Date().toISOString() },
  { id: 't6', title: 'Road Repair & Maintenance Works — UP PWD', department: 'UP PWD', value: 9500000, openDate: makeDate(-7), closeDate: makeDate(20), portal: 'State', portalUrl: 'https://upprocurement.gov.in', category: 'Civil Works', sector: 'construction', fetchedAt: new Date().toISOString() },
  { id: 't7', title: 'Printing & Stationery Supply', department: 'Election Commission of India', value: 650000, openDate: makeDate(-4), closeDate: makeDate(25), portal: 'CPPP', portalUrl: 'https://eprocure.gov.in', category: 'Printing', fetchedAt: new Date().toISOString() },
  { id: 't8', title: 'Electrical Works in Government Quarters', department: 'CPWD, Mumbai', value: 5600000, openDate: makeDate(-6), closeDate: makeDate(30), portal: 'GeM', portalUrl: 'https://gem.gov.in', category: 'Electrical', sector: 'construction', fetchedAt: new Date().toISOString() },
  { id: 't9', title: 'Catering Services for Railway Training Institute', department: 'Indian Railways', value: 1800000, openDate: makeDate(-8), closeDate: makeDate(40), portal: 'IREPS', portalUrl: 'https://ireps.gov.in', category: 'Catering', sector: 'food', fetchedAt: new Date().toISOString() },
  { id: 't10', title: 'Software Development for e-Panchayat Portal', department: 'MoPR, Govt of India', value: 7200000, openDate: makeDate(-12), closeDate: makeDate(45), portal: 'CPPP', portalUrl: 'https://eprocure.gov.in', category: 'Software', sector: 'it', msmeFriendly: true, fetchedAt: new Date().toISOString() },
]

const STORAGE_KEY = 'tender-kanban'

function loadKanban(): KanbanState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return { new: MOCK_TENDERS.map((t) => t.id), shortlisted: [], submitted: [], closed: [] }
}

function saveKanban(state: KanbanState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* ignore */ }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PortalBadge({ portal }: { portal: TenderPortal }) {
  const color = PORTAL_COLORS[portal] ?? '#6b7280'
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: color, borderRadius: 4, padding: '1px 6px' }}>
      {portal}
    </span>
  )
}

function TenderCard({
  tender,
  colId,
  onMove,
}: {
  tender: TenderItem
  colId: KanbanColumn
  onMove: (id: string, dir: 'left' | 'right') => void
}) {
  const colIndex = COLUMNS.findIndex((c) => c.id === colId)
  const daysLeft = Math.floor((new Date(tender.closeDate).getTime() - Date.now()) / 86_400_000)
  const urgencyBorder = daysLeft < 0 ? '#6b7280' : daysLeft < 3 ? '#dc2626' : daysLeft < 7 ? '#d97706' : '#16a34a'

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        border: `1px solid #e5e7eb`,
        borderLeft: `4px solid ${urgencyBorder}`,
        padding: '10px 12px',
        marginBottom: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <p
        style={{
          margin: '0 0 6px',
          fontSize: 13,
          fontWeight: 600,
          color: '#111827',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
        title={tender.title}
      >
        {tender.title}
      </p>

      <p style={{ margin: '0 0 6px', fontSize: 11, color: '#6b7280' }}>
        {truncate(tender.department, 40)}
      </p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <PortalBadge portal={tender.portal} />
        {tender.msmeFriendly && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#065f46', background: '#d1fae5', borderRadius: 4, padding: '1px 5px' }}>
            MSME Pref
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <ValueDisplay value={tender.value} currency="INR" />
        <CountdownTimer targetDate={tender.closeDate} />
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          disabled={colIndex === 0}
          onClick={() => onMove(tender.id, 'left')}
          style={{
            padding: '3px 8px',
            fontSize: 12,
            border: '1px solid #d1d5db',
            borderRadius: 5,
            background: colIndex === 0 ? '#f9fafb' : '#fff',
            color: colIndex === 0 ? '#d1d5db' : '#374151',
            cursor: colIndex === 0 ? 'not-allowed' : 'pointer',
          }}
          title="Move left"
        >
          ←
        </button>
        <button
          disabled={colIndex === COLUMNS.length - 1}
          onClick={() => onMove(tender.id, 'right')}
          style={{
            padding: '3px 8px',
            fontSize: 12,
            border: '1px solid #d1d5db',
            borderRadius: 5,
            background: colIndex === COLUMNS.length - 1 ? '#f9fafb' : '#fff',
            color: colIndex === COLUMNS.length - 1 ? '#d1d5db' : '#374151',
            cursor: colIndex === COLUMNS.length - 1 ? 'not-allowed' : 'pointer',
          }}
          title="Move right"
        >
          →
        </button>
        <a
          href={tender.portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: 'auto',
            padding: '3px 10px',
            fontSize: 12,
            fontWeight: 600,
            background: '#1e3a5f',
            color: '#fff',
            borderRadius: 5,
            textDecoration: 'none',
          }}
        >
          View
        </a>
      </div>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export const TenderKanbanPanel: React.FC = () => {
  const [tenders, setTenders] = useState<TenderItem[]>([])
  const [kanban, setKanban] = useState<KanbanState>({ new: [], shortlisted: [], submitted: [], closed: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | undefined>()
  const [portalFilter, setPortalFilter] = useState<string>('all')

  const fetchTenders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getTenderAggregator()
      const items = res.data.items
      setTenders(items)
      setLastUpdated(res.fetchedAt)
      const stored = loadKanban()
      const allIds = items.map((t) => t.id)
      const placed = new Set(Object.values(stored).flat())
      const unplaced = allIds.filter((id) => !placed.has(id))
      setKanban({ ...stored, new: [...stored.new, ...unplaced] })
    } catch {
      setTenders(MOCK_TENDERS)
      setLastUpdated(new Date().toISOString())
      setKanban(loadKanban())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTenders() }, [fetchTenders])

  const handleMove = useCallback((id: string, dir: 'left' | 'right') => {
    setKanban((prev) => {
      const colIndex = COLUMNS.findIndex((c) => prev[c.id].includes(id))
      if (colIndex === -1) return prev
      const targetIndex = dir === 'left' ? colIndex - 1 : colIndex + 1
      if (targetIndex < 0 || targetIndex >= COLUMNS.length) return prev
      const fromCol = COLUMNS[colIndex].id
      const toCol = COLUMNS[targetIndex].id
      const next: KanbanState = {
        ...prev,
        [fromCol]: prev[fromCol].filter((tid) => tid !== id),
        [toCol]: [...prev[toCol], id],
      }
      saveKanban(next)
      return next
    })
  }, [])

  const tendersById = Object.fromEntries(tenders.map((t) => [t.id, t]))
  const portals = ['all', ...Array.from(new Set(tenders.map((t) => t.portal)))]

  const filterTender = (id: string) => {
    const t = tendersById[id]
    if (!t) return false
    if (portalFilter !== 'all' && t.portal !== portalFilter) return false
    return true
  }

  return (
    <section style={{ background: '#f8fafc', borderRadius: 12, padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e3a5f' }}>
          📋 Tender Kanban
        </h2>
        <DataFreshness
          source="Tenders"
          lastUpdated={lastUpdated}
          status={loading ? 'loading' : error ? 'error' : 'fresh'}
        />
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {portals.map((p) => (
          <button
            key={p}
            onClick={() => setPortalFilter(p)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 999,
              border: '1px solid',
              borderColor: portalFilter === p ? '#1e3a5f' : '#d1d5db',
              background: portalFilter === p ? '#1e3a5f' : '#fff',
              color: portalFilter === p ? '#fff' : '#374151',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {p === 'all' ? 'All Portals' : p}
          </button>
        ))}
      </div>

      {/* Kanban columns */}
      {loading ? (
        <LoadingSkeleton lines={6} height={80} />
      ) : error && tenders.length === 0 ? (
        <ErrorFallback message={error} onRetry={fetchTenders} panelName="Tender Kanban" />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {COLUMNS.map((col) => {
            const colIds = kanban[col.id].filter(filterTender)
            return (
              <div
                key={col.id}
                style={{
                  background: '#f1f5f9',
                  borderRadius: 8,
                  padding: '8px 8px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 200,
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{col.label}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: '#1e3a5f',
                      color: '#fff',
                      borderRadius: 999,
                      padding: '1px 7px',
                      minWidth: 20,
                      textAlign: 'center',
                    }}
                  >
                    {colIds.length}
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {colIds.length === 0 && (
                    <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingTop: 20 }}>
                      No tenders
                    </p>
                  )}
                  {colIds.map((id) =>
                    tendersById[id] ? (
                      <TenderCard
                        key={id}
                        tender={tendersById[id]}
                        colId={col.id}
                        onMove={handleMove}
                      />
                    ) : null
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default TenderKanbanPanel
