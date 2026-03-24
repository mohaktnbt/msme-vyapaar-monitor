import React, { useState, useEffect, useCallback } from 'react'
import type { AIBrief, AIBriefItem, SeverityLevel } from '../../types/index.js'
import { api } from '../../services/api.js'
import { getSeverityColor } from '../../utils/formatters.js'
import { DataFreshness } from '../ui/DataFreshness.js'
import { WhatsAppShare } from '../ui/WhatsAppShare.js'
import { LoadingSkeleton } from '../ui/LoadingSkeleton.js'
import { ErrorFallback } from '../ui/ErrorFallback.js'

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_BRIEF: AIBrief = {
  id: 'mock-brief-1',
  date: new Date().toISOString().slice(0, 10),
  title: "Today's Top 5 for Indian Businesses",
  summary: 'Key updates affecting Indian MSMEs today.',
  generatedAt: new Date().toISOString(),
  modelUsed: 'mock',
  language: 'en',
  items: [
    {
      rank: 1,
      headline: 'RBI holds repo rate at 6.5%',
      whatHappened: 'RBI MPC kept rates unchanged in latest policy review.',
      whyItMatters: 'EMIs on business loans stay stable, supporting cash flow planning.',
      actionToTake: 'Good time to refinance existing loans at current rates.',
      severity: 'medium',
    },
    {
      rank: 2,
      headline: 'GST on textiles remains unchanged',
      whatHappened: 'No rate revision was announced in the latest GST council meeting.',
      whyItMatters: 'Textile MSMEs face continued compliance costs without any relief.',
      actionToTake: 'File GSTR-1 before 11th of this month to avoid penalties.',
      severity: 'low',
    },
    {
      rank: 3,
      headline: 'New GeM portal update: faster onboarding',
      whatHappened: 'GeM reduced new seller onboarding time to under 2 hours.',
      whyItMatters: 'Easier access to the ₹3 Lakh Crore government procurement market.',
      actionToTake: 'Register on GeM at gem.gov.in if you have not already done so.',
      severity: 'high',
    },
    {
      rank: 4,
      headline: 'Steel prices up 3% this week',
      whatHappened: 'HRC steel prices rose to ₹54,500 per tonne on spot markets.',
      whyItMatters: 'Manufacturing input costs are increasing, squeezing margins.',
      actionToTake: 'Consider forward buying or adjust product pricing accordingly.',
      severity: 'medium',
    },
    {
      rank: 5,
      headline: 'MUDRA loan disbursement hits record ₹5 Lakh Crore',
      whatHappened: 'FY25 MUDRA disbursements have broken all previous records.',
      whyItMatters: 'More micro-businesses are gaining access to formal credit channels.',
      actionToTake: 'Apply for MUDRA Kishore or Tarun at your nearest bank branch.',
      severity: 'info',
    },
  ],
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: SeverityLevel }) {
  const color = getSeverityColor(severity)
  const labels: Record<SeverityLevel, string> = {
    critical: 'Critical',
    high: 'High Impact',
    medium: 'Medium',
    low: 'Low',
    info: 'Info',
  }
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color,
        background: `${color}18`,
        border: `1px solid ${color}44`,
        borderRadius: 999,
        padding: '1px 7px',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {labels[severity]}
    </span>
  )
}

function BriefItem({ item }: { item: AIBriefItem }) {
  const [expanded, setExpanded] = useState(false)
  const accentColor = getSeverityColor(item.severity)

  return (
    <div
      style={{
        borderLeft: `4px solid ${accentColor}`,
        background: '#fff',
        borderRadius: '0 8px 8px 0',
        padding: '12px 14px',
        marginBottom: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span
          style={{
            minWidth: 24,
            height: 24,
            borderRadius: '50%',
            background: '#1e3a5f',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {item.rank}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#111827', lineHeight: 1.3 }}>
            {item.headline}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <SeverityBadge severity={item.severity} />
          </div>

          {expanded && (
            <div style={{ fontSize: 13, color: '#374151', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <span style={{ fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>What Happened </span>
                {item.whatHappened}
              </div>
              <div>
                <span style={{ fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Why It Matters </span>
                {item.whyItMatters}
              </div>
              <div>
                <span style={{ fontWeight: 600, color: '#f59e0b', fontSize: 11, textTransform: 'uppercase' }}>Action </span>
                {item.actionToTake}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                fontSize: 12,
                color: '#1e3a5f',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontWeight: 600,
              }}
            >
              {expanded ? '▲ Less' : '▼ More'}
            </button>
            <WhatsAppShare
              title={item.headline}
              summary={`${item.whyItMatters} Action: ${item.actionToTake}`}
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export const AIBriefPanel: React.FC = () => {
  const [brief, setBrief] = useState<AIBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | undefined>()

  const fetchBrief = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getAIBrief()
      setBrief(res.data)
      setLastUpdated(res.fetchedAt)
    } catch {
      setBrief(MOCK_BRIEF)
      setLastUpdated(new Date().toISOString())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBrief() }, [fetchBrief])

  return (
    <section style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 6 }}>
          🤖 AI Daily Brief
        </h2>
        <DataFreshness
          source="AI Brief"
          lastUpdated={lastUpdated}
          status={loading ? 'loading' : error ? 'error' : 'fresh'}
        />
      </div>

      <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
        Today's Top 5 Things Every MSME Owner Should Know
      </p>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <LoadingSkeleton key={i} lines={3} height={14} />
            ))}
          </div>
        ) : error && !brief ? (
          <ErrorFallback message={error} onRetry={fetchBrief} panelName="AI Brief" />
        ) : (
          brief?.items.map((item) => <BriefItem key={item.rank} item={item} />)
        )}
      </div>

      {/* Footer */}
      {!loading && (
        <button
          onClick={fetchBrief}
          style={{
            marginTop: 12,
            padding: '8px 16px',
            background: '#1e3a5f',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          ↻ Refresh Brief
        </button>
      )}
    </section>
  )
}

export default AIBriefPanel
