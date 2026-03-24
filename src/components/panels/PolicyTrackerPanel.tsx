import React, { useState, useEffect, useCallback } from 'react'
import type { PolicyUpdate, SeverityLevel } from '../../types/index.js'
import { api } from '../../services/api.js'
import { getSeverityColor, timeAgo, truncate } from '../../utils/formatters.js'
import { DataFreshness } from '../ui/DataFreshness.js'
import { SectorBadge } from '../ui/SectorBadge.js'
import { LoadingSkeleton } from '../ui/LoadingSkeleton.js'
import { ErrorFallback } from '../ui/ErrorFallback.js'

// ── Mock data ─────────────────────────────────────────────────────────────────

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString()

const MOCK_POLICIES: PolicyUpdate[] = [
  { id: 'p1', title: 'MSME Definition Updated — Investment & Turnover Limits Revised', ministry: 'Ministry of MSME', type: 'notification', publishedAt: ago(2), fetchedAt: ago(1), summary: 'The government has revised the investment ceiling for Micro enterprises from ₹1 Crore to ₹2.5 Crore, and for Small enterprises from ₹10 Crore to ₹25 Crore under the MSMED Act 2006.', impactLevel: 'critical', sectors: ['manufacturing', 'services', 'trading'], tags: ['MSME', 'definition', 'Udyam'] },
  { id: 'p2', title: 'GST Council: Zero Rating on Export of Services Extended', ministry: 'Ministry of Finance', department: 'CBIC', type: 'circular', publishedAt: ago(6), fetchedAt: ago(5), summary: 'CBIC circular extends the zero-rated GST benefits on export of services till March 2026. Service exporters need to file LUT or bond before each financial year.', impactLevel: 'high', sectors: ['export', 'it', 'services'], tags: ['GST', 'export', 'zero-rating'] },
  { id: 'p3', title: 'New Environmental Clearance Exemption for Micro Units', ministry: 'Ministry of Environment', type: 'order', publishedAt: ago(18), fetchedAt: ago(17), summary: 'Micro manufacturing units with investment below ₹1 Crore are exempt from Environmental Clearance requirement under EIA Notification, subject to pollution control board registration.', impactLevel: 'medium', sectors: ['manufacturing', 'food', 'chemical'], tags: ['environment', 'compliance', 'exemption'] },
  { id: 'p4', title: 'RBI Circular on MSME Loan Restructuring Framework', ministry: 'Reserve Bank of India', type: 'circular', publishedAt: ago(30), fetchedAt: ago(29), summary: 'RBI allows banks to restructure MSME loans up to ₹25 Crore without downgrading asset classification, valid for MSME borrowers with satisfactory track record.', impactLevel: 'high', sectors: ['manufacturing', 'services', 'retail'], tags: ['RBI', 'loan', 'restructuring'] },
  { id: 'p5', title: 'DPIIT Simplifies Startup Recognition Process', ministry: 'DPIIT', type: 'press-release', publishedAt: ago(48), fetchedAt: ago(47), summary: 'DPIIT has simplified the startup recognition process on Startup India portal. The processing time has been reduced to 2 working days. No physical documents required.', impactLevel: 'medium', sectors: ['it', 'services'], tags: ['startup', 'DPIIT', 'recognition'] },
]

// ── Types ─────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<PolicyUpdate['type'], string> = {
  notification: 'Notification',
  circular: 'Circular',
  gazette: 'Gazette',
  'press-release': 'Press Release',
  order: 'Order',
  amendment: 'Amendment',
}

const TYPE_COLORS: Record<PolicyUpdate['type'], string> = {
  notification: '#7c3aed',
  circular: '#0369a1',
  gazette: '#374151',
  'press-release': '#0d9488',
  order: '#b45309',
  amendment: '#dc2626',
}

const MINISTRIES = ['All Ministries', 'Ministry of MSME', 'Ministry of Finance', 'RBI', 'DPIIT', 'Ministry of Commerce', 'Ministry of Environment']

// ── Sub-components ────────────────────────────────────────────────────────────

function ImpactBadge({ level }: { level: SeverityLevel }) {
  const color = getSeverityColor(level)
  const labels: Partial<Record<SeverityLevel, string>> = { critical: 'Critical Impact', high: 'High Impact', medium: 'Medium', low: 'Low', info: 'Info' }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 999, padding: '1px 7px' }}>
      {labels[level]}
    </span>
  )
}

function PolicyCard({ policy }: { policy: PolicyUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const borderColor = getSeverityColor(policy.impactLevel)

  return (
    <div style={{ borderLeft: `4px solid ${borderColor}`, background: '#fff', borderRadius: '0 8px 8px 0', padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#111827', lineHeight: 1.3 }}>{policy.title}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#fff',
              background: TYPE_COLORS[policy.type] ?? '#6b7280',
              borderRadius: 4, padding: '1px 7px',
            }}>
              {TYPE_LABELS[policy.type]}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1e3a5f', background: '#eff6ff', borderRadius: 4, padding: '1px 7px' }}>
              {policy.ministry}
            </span>
            <ImpactBadge level={policy.impactLevel} />
          </div>
        </div>
        <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{timeAgo(policy.publishedAt)}</span>
      </div>

      <p style={{ margin: '6px 0', fontSize: 13, color: '#374151', lineHeight: 1.45 }}>
        {expanded ? policy.summary : truncate(policy.summary, 120)}
        {policy.summary.length > 120 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{ marginLeft: 4, fontSize: 12, color: '#1e3a5f', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
          >
            {expanded ? ' Show less' : ' Read more'}
          </button>
        )}
      </p>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
        {policy.sectors.map((s) => <SectorBadge key={s} sector={s} size="sm" />)}
        {policy.documentUrl && (
          <a
            href={policy.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#1e3a5f', textDecoration: 'none' }}
          >
            View Original →
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export const PolicyTrackerPanel: React.FC = () => {
  const [policies, setPolicies] = useState<PolicyUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | undefined>()
  const [ministry, setMinistry] = useState('All Ministries')
  const [impactFilter, setImpactFilter] = useState<SeverityLevel | 'all'>('all')

  const fetchPolicies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getPIBFeed()
      const items = res.data as unknown as PolicyUpdate[]
      setPolicies(items)
      setLastUpdated(res.fetchedAt)
    } catch {
      setPolicies(MOCK_POLICIES)
      setLastUpdated(new Date().toISOString())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPolicies() }, [fetchPolicies])

  const filtered = policies.filter((p) => {
    if (ministry !== 'All Ministries' && p.ministry !== ministry) return false
    if (impactFilter !== 'all' && p.impactLevel !== impactFilter) return false
    return true
  })

  const impactLevels: Array<SeverityLevel | 'all'> = ['all', 'critical', 'high', 'medium', 'low']

  return (
    <section style={{ background: '#f8fafc', borderRadius: 12, padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e3a5f' }}>📜 Policy Tracker</h2>
        <DataFreshness source="PIB" lastUpdated={lastUpdated} status={loading ? 'loading' : error ? 'error' : 'fresh'} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={ministry}
          onChange={(e) => setMinistry(e.target.value)}
          style={{ padding: '5px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
        >
          {MINISTRIES.map((m) => <option key={m}>{m}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 4 }}>
          {impactLevels.map((level) => (
            <button
              key={level}
              onClick={() => setImpactFilter(level)}
              style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 999,
                border: '1px solid',
                borderColor: impactFilter === level ? (level === 'all' ? '#1e3a5f' : getSeverityColor(level as SeverityLevel)) : '#d1d5db',
                background: impactFilter === level ? (level === 'all' ? '#1e3a5f' : `${getSeverityColor(level as SeverityLevel)}18`) : '#fff',
                color: impactFilter === level ? (level === 'all' ? '#fff' : getSeverityColor(level as SeverityLevel)) : '#6b7280',
                cursor: 'pointer',
              }}
            >
              {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <LoadingSkeleton lines={5} height={90} />
        ) : error && policies.length === 0 ? (
          <ErrorFallback message={error} onRetry={fetchPolicies} panelName="Policy Tracker" />
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingTop: 30 }}>No policies match current filters.</p>
        ) : (
          filtered.map((policy) => <PolicyCard key={policy.id} policy={policy} />)
        )}
      </div>
    </section>
  )
}

export default PolicyTrackerPanel
