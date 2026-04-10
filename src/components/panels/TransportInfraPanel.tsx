import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DataFreshness } from '../ui/DataFreshness.js'
import { LoadingSkeleton } from '../ui/LoadingSkeleton.js'
import { ErrorFallback } from '../ui/ErrorFallback.js'
import { formatINR } from '../../utils/formatters.js'

// ── Types ─────────────────────────────────────────────────────────────────────

type ProjectType = 'highway' | 'expressway' | 'rail' | 'metro' | 'port' | 'airport'
type ProjectStatus = 'in-progress' | 'delayed' | 'completed'

interface Project {
  id: string
  name: string
  type: ProjectType
  states: string[]
  valueInr: number // rupees
  progress: number // 0-100
  supplierTags: string[]
  expectedCompletion: string
  status: ProjectStatus
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Delhi–Mumbai Expressway (Phase 3)',
    type: 'expressway',
    states: ['Haryana', 'Rajasthan', 'Madhya Pradesh'],
    valueInr: 98_000 * 1_00_00_000,
    progress: 72,
    supplierTags: ['cement', 'steel', 'aggregates', 'bitumen'],
    expectedCompletion: '2026-12',
    status: 'in-progress',
  },
  {
    id: 'p2',
    name: 'Bengaluru Suburban Rail',
    type: 'rail',
    states: ['Karnataka'],
    valueInr: 15_700 * 1_00_00_000,
    progress: 38,
    supplierTags: ['rail-sleepers', 'steel', 'cement', 'cables'],
    expectedCompletion: '2027-06',
    status: 'delayed',
  },
  {
    id: 'p3',
    name: 'Mumbai Trans Harbour Link',
    type: 'highway',
    states: ['Maharashtra'],
    valueInr: 17_800 * 1_00_00_000,
    progress: 100,
    supplierTags: ['steel', 'cement'],
    expectedCompletion: '2024-01',
    status: 'completed',
  },
  {
    id: 'p4',
    name: 'Vizhinjam International Port',
    type: 'port',
    states: ['Kerala'],
    valueInr: 7_525 * 1_00_00_000,
    progress: 88,
    supplierTags: ['aggregates', 'steel', 'marine-equipment'],
    expectedCompletion: '2025-12',
    status: 'in-progress',
  },
  {
    id: 'p5',
    name: 'Noida International Airport',
    type: 'airport',
    states: ['Uttar Pradesh'],
    valueInr: 29_560 * 1_00_00_000,
    progress: 65,
    supplierTags: ['cement', 'glass', 'HVAC', 'electricals'],
    expectedCompletion: '2025-09',
    status: 'in-progress',
  },
  {
    id: 'p6',
    name: 'Chennai Metro Phase-2',
    type: 'metro',
    states: ['Tamil Nadu'],
    valueInr: 61_843 * 1_00_00_000,
    progress: 42,
    supplierTags: ['cement', 'rail-sleepers', 'cables', 'electricals'],
    expectedCompletion: '2028-03',
    status: 'in-progress',
  },
  {
    id: 'p7',
    name: 'Bharatmala NH-148B',
    type: 'highway',
    states: ['Gujarat', 'Rajasthan'],
    valueInr: 4_200 * 1_00_00_000,
    progress: 55,
    supplierTags: ['bitumen', 'aggregates', 'cement'],
    expectedCompletion: '2026-03',
    status: 'delayed',
  },
  {
    id: 'p8',
    name: 'Dedicated Freight Corridor (East)',
    type: 'rail',
    states: ['Punjab', 'Haryana', 'UP', 'Bihar', 'WB'],
    valueInr: 81_459 * 1_00_00_000,
    progress: 93,
    supplierTags: ['rail-sleepers', 'steel', 'electricals'],
    expectedCompletion: '2025-06',
    status: 'in-progress',
  },
]

const TYPE_ICONS: Record<ProjectType, string> = {
  highway: '🛣️',
  expressway: '🛤️',
  rail: '🚆',
  metro: '🚇',
  port: '⚓',
  airport: '✈️',
}

const TYPE_LABELS: Record<ProjectType, string> = {
  highway: 'Highway',
  expressway: 'Expressway',
  rail: 'Rail',
  metro: 'Metro',
  port: 'Port',
  airport: 'Airport',
}

const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string }> = {
  'in-progress': { bg: 'rgba(37,99,235,0.15)', text: '#60a5fa' },
  delayed: { bg: 'rgba(217,119,6,0.15)', text: '#f59e0b' },
  completed: { bg: 'rgba(22,163,74,0.15)', text: '#16a34a' },
}

const TYPE_FILTERS: ('all' | ProjectType)[] = [
  'all',
  'highway',
  'expressway',
  'rail',
  'metro',
  'port',
  'airport',
]
const STATUS_FILTERS: ('all' | ProjectStatus)[] = ['all', 'in-progress', 'delayed', 'completed']

// ── Panel ─────────────────────────────────────────────────────────────────────

const TransportInfraPanel: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | undefined>()
  const [typeFilter, setTypeFilter] = useState<'all' | ProjectType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/transport-projects')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as Project[]
      setProjects(json)
      setLastUpdated(new Date().toISOString())
    } catch {
      setProjects(MOCK_PROJECTS)
      setLastUpdated(new Date().toISOString())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      return true
    })
  }, [projects, typeFilter, statusFilter])

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
          🛣️ Transport & Infrastructure Projects
        </h2>
        <DataFreshness
          source="NHAI"
          lastUpdated={lastUpdated}
          status={loading ? 'loading' : error ? 'error' : 'fresh'}
        />
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 999,
                border: '1px solid',
                borderColor: typeFilter === t ? '#FF9933' : '#1f2937',
                background: typeFilter === t ? 'rgba(255,153,51,0.15)' : '#0a0e1a',
                color: typeFilter === t ? '#FF9933' : '#9ca3af',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t === 'all' ? 'All Types' : `${TYPE_ICONS[t]} ${TYPE_LABELS[t]}`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 999,
                border: '1px solid',
                borderColor: statusFilter === s ? '#003087' : '#1f2937',
                background: statusFilter === s ? 'rgba(0,48,135,0.3)' : '#0a0e1a',
                color: statusFilter === s ? '#60a5fa' : '#9ca3af',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {s === 'all' ? 'All Status' : s.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading && projects.length === 0 ? (
        <LoadingSkeleton lines={6} height={14} />
      ) : error && projects.length === 0 ? (
        <ErrorFallback
          message={error}
          onRetry={fetchProjects}
          panelName="Transport Projects"
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 10,
          }}
        >
          {filtered.map((p) => {
            const status = STATUS_COLORS[p.status]
            return (
              <div
                key={p.id}
                style={{
                  background: '#0a0e1a',
                  border: '1px solid #1f2937',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18 }}>{TYPE_ICONS[p.type]}</div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#e5e7eb',
                        lineHeight: 1.3,
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {p.states.join(' · ')}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: status.text,
                      background: status.bg,
                      borderRadius: 999,
                      padding: '2px 8px',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.status.replace('-', ' ')}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#FF9933' }}>
                    {formatINR(p.valueInr)}
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    ETA: {p.expectedCompletion}
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 10,
                      color: '#9ca3af',
                      marginBottom: 2,
                    }}
                  >
                    <span>Progress</span>
                    <span>{p.progress}%</span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: '#1f2937',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${p.progress}%`,
                        height: '100%',
                        background:
                          p.progress === 100
                            ? '#16a34a'
                            : 'linear-gradient(90deg, #FF9933, #003087)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>
                    MSME supply opportunities:
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {p.supplierTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#FF9933',
                          background: 'rgba(255,153,51,0.1)',
                          border: '1px solid rgba(255,153,51,0.3)',
                          borderRadius: 4,
                          padding: '2px 6px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#16a34a',
                    background: 'rgba(22,163,74,0.1)',
                    border: '1px solid rgba(22,163,74,0.3)',
                    borderRadius: 4,
                    padding: '3px 8px',
                    alignSelf: 'flex-start',
                  }}
                >
                  ✓ MSME Opportunity
                </div>
              </div>
            )
          })}
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
              No projects match the selected filters.
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default TransportInfraPanel
