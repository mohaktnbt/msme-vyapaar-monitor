import React, { useMemo } from 'react'
import type { ComplianceDeadline } from '../../types/index.js'
import { DataFreshness } from '../ui/DataFreshness.js'

// ── Static deadlines ──────────────────────────────────────────────────────────

// Helper: next occurrence of a day-of-month deadline
function nextDayOfMonth(day: number): string {
  const now = new Date()
  const candidate = new Date(now.getFullYear(), now.getMonth(), day)
  if (candidate <= now) {
    candidate.setMonth(candidate.getMonth() + 1)
  }
  return candidate.toISOString()
}

function nextMonthDay(month: number, day: number): string {
  const now = new Date()
  const candidate = new Date(now.getFullYear(), month - 1, day)
  if (candidate <= now) candidate.setFullYear(candidate.getFullYear() + 1)
  return candidate.toISOString()
}

const COMPLIANCE_DEADLINES: (Omit<ComplianceDeadline, 'dueDate'> & { dueDate: string })[] = [
  { id: 'gstr1-monthly', title: 'GSTR-1 Filing', authority: 'GST', form: 'GSTR-1', dueDate: nextDayOfMonth(11), recurrence: 'monthly', applicableTo: 'GST registered businesses (monthly filers)', penaltyInfo: '₹50/day up to ₹5,000', portalUrl: 'https://gst.gov.in' },
  { id: 'gstr3b', title: 'GSTR-3B Payment & Filing', authority: 'GST', form: 'GSTR-3B', dueDate: nextDayOfMonth(20), recurrence: 'monthly', applicableTo: 'All GST registered businesses', penaltyInfo: 'Interest at 18% per annum + ₹50/day', portalUrl: 'https://gst.gov.in' },
  { id: 'tds-payment', title: 'TDS Deposit', authority: 'TDS', dueDate: nextDayOfMonth(7), recurrence: 'monthly', applicableTo: 'Businesses liable to deduct TDS', penaltyInfo: 'Interest at 1.5% per month from deduction date', portalUrl: 'https://incometax.gov.in' },
  { id: 'advance-tax-q4', title: 'Advance Tax (Q4 Final)', authority: 'IncomeTax', dueDate: nextMonthDay(3, 15), recurrence: 'quarterly', applicableTo: 'All assessees', portalUrl: 'https://incometax.gov.in' },
  { id: 'advance-tax-q3', title: 'Advance Tax (Q3)', authority: 'IncomeTax', dueDate: nextMonthDay(12, 15), recurrence: 'quarterly', applicableTo: 'Businesses with tax liability >₹10,000', penaltyInfo: 'Interest under sections 234B/C', portalUrl: 'https://incometax.gov.in' },
  { id: 'epfo-ecr', title: 'PF (EPFO) Contribution', authority: 'EPFO', dueDate: nextDayOfMonth(15), recurrence: 'monthly', applicableTo: 'Establishments with 20+ employees', penaltyInfo: 'Damages 5-25% of amount due', portalUrl: 'https://epfindia.gov.in' },
  { id: 'esic-contribution', title: 'ESIC Contribution', authority: 'ESIC', dueDate: nextDayOfMonth(15), recurrence: 'monthly', applicableTo: 'Establishments with 10+ employees', portalUrl: 'https://esic.gov.in' },
  { id: 'gstr1-quarterly', title: 'GSTR-1 (Quarterly filers)', authority: 'GST', form: 'GSTR-1', dueDate: nextDayOfMonth(13), recurrence: 'quarterly', applicableTo: 'GST businesses with <₹1.5 Crore turnover (QRMP)', portalUrl: 'https://gst.gov.in' },
  { id: 'mca-dir3', title: 'DIN KYC (DIR-3 KYC)', authority: 'MCA', form: 'DIR-3 KYC', dueDate: nextMonthDay(9, 30), recurrence: 'annual', applicableTo: 'All Directors with DIN', penaltyInfo: '₹5,000 for late filing; DIN deactivation', portalUrl: 'https://mca.gov.in' },
  { id: 'mca-aoc4', title: 'Financial Statements Filing', authority: 'MCA', form: 'AOC-4', dueDate: nextMonthDay(11, 29), recurrence: 'annual', applicableTo: 'All registered companies', penaltyInfo: '₹100/day', portalUrl: 'https://mca.gov.in' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

const AUTHORITY_COLORS: Record<string, string> = {
  GST: '#059669',
  IncomeTax: '#1e3a5f',
  MCA: '#7c3aed',
  EPFO: '#0369a1',
  ESIC: '#0891b2',
  TDS: '#b45309',
  Customs: '#374151',
  State: '#d97706',
  Other: '#6b7280',
}

function daysUntil(isoString: string): number {
  return Math.ceil((new Date(isoString).getTime() - Date.now()) / 86_400_000)
}

function formatDueDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function googleCalendarLink(title: string, dueDate: string, description: string): string {
  const d = new Date(dueDate)
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${date}/${date}`,
    details: description,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DeadlineCard({ deadline }: { deadline: (typeof COMPLIANCE_DEADLINES)[number] }) {
  const days = daysUntil(deadline.dueDate)
  const isUrgent = days < 3
  const isWarning = days < 7
  const chipColor = isUrgent ? '#dc2626' : isWarning ? '#d97706' : '#16a34a'
  const chipBg = isUrgent ? '#fee2e2' : isWarning ? '#fef3c7' : '#dcfce7'
  const authority = deadline.authority as string
  const authorityColor = AUTHORITY_COLORS[authority] ?? '#6b7280'

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${chipColor}`,
        borderRadius: '0 8px 8px 0',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#111827' }}>
            {deadline.title}
            {deadline.form && (
              <span style={{ marginLeft: 6, fontSize: 11, color: '#6b7280', fontWeight: 500 }}>({deadline.form})</span>
            )}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{deadline.applicableTo}</p>
        </div>
        <span
          style={{
            fontSize: 12, fontWeight: 700, color: chipColor, background: chipBg,
            borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap',
          }}
        >
          {days <= 0 ? 'Today' : `${days}d left`}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#fff',
          background: authorityColor, borderRadius: 4, padding: '1px 6px',
        }}>
          {authority}
        </span>
        <span style={{ fontSize: 11, color: '#374151' }}>Due: {formatDueDate(deadline.dueDate)}</span>
        {deadline.recurrence && (
          <span style={{ fontSize: 10, color: '#9ca3af', background: '#f3f4f6', borderRadius: 4, padding: '1px 5px' }}>
            {deadline.recurrence}
          </span>
        )}
      </div>

      {deadline.penaltyInfo && (
        <p style={{ margin: 0, fontSize: 11, color: '#dc2626' }}>
          ⚠ {deadline.penaltyInfo}
        </p>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <a
          href={googleCalendarLink(deadline.title, deadline.dueDate, deadline.applicableTo + (deadline.penaltyInfo ? '\nPenalty: ' + deadline.penaltyInfo : ''))}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11, fontWeight: 600, color: '#fff', background: '#4285F4',
            borderRadius: 5, padding: '3px 10px', textDecoration: 'none',
          }}
        >
          📅 Set Reminder
        </a>
        {deadline.portalUrl && (
          <a
            href={deadline.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11, fontWeight: 600, color: '#1e3a5f', background: '#eff6ff',
              borderRadius: 5, padding: '3px 10px', textDecoration: 'none',
            }}
          >
            View Portal
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export const ComplianceCalendarPanel: React.FC = () => {
  const sorted = useMemo(
    () => [...COMPLIANCE_DEADLINES].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    []
  )

  const thisWeek = sorted.filter((d) => daysUntil(d.dueDate) <= 7)
  const thisMonth = sorted.filter((d) => { const days = daysUntil(d.dueDate); return days > 7 && days <= 30 })
  const later = sorted.filter((d) => daysUntil(d.dueDate) > 30)

  const urgentCount = sorted.filter((d) => daysUntil(d.dueDate) <= 7).length

  return (
    <section style={{ background: '#f8fafc', borderRadius: 12, padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e3a5f' }}>🗓 Compliance Calendar</h2>
        <DataFreshness source="Compliance" lastUpdated={new Date().toISOString()} status="fresh" />
      </div>

      {/* Summary */}
      <div
        style={{
          background: urgentCount > 0 ? '#fee2e2' : '#dcfce7',
          borderRadius: 8, padding: '8px 14px', marginBottom: 14,
          fontSize: 13, fontWeight: 600,
          color: urgentCount > 0 ? '#dc2626' : '#16a34a',
        }}
      >
        {urgentCount > 0
          ? `⚠ You have ${urgentCount} deadline${urgentCount > 1 ? 's' : ''} in the next 7 days`
          : '✓ No deadlines in the next 7 days'}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* This Week */}
        {thisWeek.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ● This Week
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {thisWeek.map((d) => <DeadlineCard key={d.id} deadline={d} />)}
            </div>
          </div>
        )}

        {/* This Month */}
        {thisMonth.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ● This Month
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {thisMonth.map((d) => <DeadlineCard key={d.id} deadline={d} />)}
            </div>
          </div>
        )}

        {/* Later */}
        {later.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ● Later
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {later.map((d) => <DeadlineCard key={d.id} deadline={d} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ComplianceCalendarPanel
