import React, { useState, useCallback } from 'react'
import type { SeverityLevel } from '../types/index.js'
import { timeAgo } from '../utils/formatters.js'
import { WhatsAppShare } from './ui/WhatsAppShare.js'

// ── Types ────────────────────────────────────────────────────────────────────

interface AlertItem {
  id: string
  title: string
  detail: string
  severity: SeverityLevel
  source: string
  category: string
  timestamp: string
  read: boolean
}

// ── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_DOT_COLOR: Record<SeverityLevel, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#9ca3af',
}

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

// ── Mock data ────────────────────────────────────────────────────────────────

const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

const MOCK_ALERTS: AlertItem[] = [
  {
    id: 'a1',
    title: 'GeM Tender Deadline: Office Furniture Supply',
    detail: 'Tender GEM/2026/B/4521 for office furniture supply to CPWD closes in 48 hours. Estimated value: Rs 25 Lakh. MSE purchase preference applicable under Rule 149.',
    severity: 'critical',
    source: 'GeM Portal',
    category: 'Tender Deadline',
    timestamp: ago(1),
    read: false,
  },
  {
    id: 'a2',
    title: 'GST Return Filing: GSTR-3B Due in 3 Days',
    detail: 'GSTR-3B for the month of February 2026 is due by 20th March 2026. Late filing attracts penalty of Rs 50/day (CGST + SGST). Ensure input tax credit reconciliation is complete.',
    severity: 'critical',
    source: 'GST Portal',
    category: 'Compliance Reminder',
    timestamp: ago(2),
    read: false,
  },
  {
    id: 'a3',
    title: 'Steel Prices Surge 5% This Week',
    detail: 'HRC steel prices have risen to Rs 54,500/tonne from Rs 51,900/tonne last week, driven by global supply constraints and increased infrastructure demand. Construction MSMEs should review material cost estimates.',
    severity: 'high',
    source: 'MCX',
    category: 'Market Movement',
    timestamp: ago(3),
    read: false,
  },
  {
    id: 'a4',
    title: 'New MSME Definition: Turnover Limit Revised',
    detail: 'Ministry of MSME has issued a notification revising the turnover limit for Medium enterprises from Rs 250 Cr to Rs 500 Cr effective from April 1, 2026. This allows more businesses to avail MSME benefits.',
    severity: 'high',
    source: 'Ministry of MSME',
    category: 'Policy Change',
    timestamp: ago(5),
    read: false,
  },
  {
    id: 'a5',
    title: 'PM Vishwakarma Scheme: New Application Window Open',
    detail: 'Applications are now open for PM Vishwakarma scheme for traditional artisans and craftspeople. Benefits include collateral-free loan up to Rs 3 Lakh at 5% interest, skill training, and toolkit incentive.',
    severity: 'medium',
    source: 'MSME Ministry',
    category: 'Scheme Announcement',
    timestamp: ago(8),
    read: false,
  },
  {
    id: 'a6',
    title: 'USD/INR Breaches 83.50 Level',
    detail: 'The Indian Rupee has weakened against the US Dollar, crossing the 83.50 mark. Export-oriented MSMEs may benefit while import-dependent businesses should hedge their forex exposure.',
    severity: 'medium',
    source: 'RBI',
    category: 'Market Movement',
    timestamp: ago(10),
    read: false,
  },
  {
    id: 'a7',
    title: 'SIDBI Emergency Credit Line Extended to March 2027',
    detail: 'SIDBI has extended the Emergency Credit Line Guarantee Scheme (ECLGS) for MSMEs till March 2027. Eligible businesses can avail additional credit up to 20% of outstanding borrowing.',
    severity: 'low',
    source: 'SIDBI',
    category: 'Scheme Announcement',
    timestamp: ago(14),
    read: false,
  },
  {
    id: 'a8',
    title: 'EPFO: Deadline for ECR Filing Approaching',
    detail: 'Monthly ECR (Electronic Challan cum Return) for PF contributions must be filed by the 15th of each month. Delayed filing attracts damages at 5-25% per annum.',
    severity: 'medium',
    source: 'EPFO',
    category: 'Compliance Reminder',
    timestamp: ago(18),
    read: false,
  },
  {
    id: 'a9',
    title: 'Cotton Prices Rise Amid Export Restrictions',
    detail: 'Cotton prices have increased to Rs 6,850/quintal as export curbs tighten supply. Textile MSMEs in Tiruppur and Surat clusters may face higher raw material costs.',
    severity: 'low',
    source: 'Agmarknet',
    category: 'Market Movement',
    timestamp: ago(20),
    read: false,
  },
  {
    id: 'a10',
    title: 'Digital India: Free Cloud Credits for MSMEs',
    detail: 'MeitY has launched a cloud computing subsidy program offering up to Rs 1 Lakh in free cloud credits for registered MSMEs through empanelled service providers.',
    severity: 'info',
    source: 'MeitY',
    category: 'Scheme Announcement',
    timestamp: ago(24),
    read: false,
  },
]

// ── Component ────────────────────────────────────────────────────────────────

export const AlertCenter: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>(
    [...MOCK_ALERTS].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  const unreadCount = alerts.filter((a) => !a.read).length

  const handleMarkAllRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
  }, [])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    )
  }, [])

  if (error) {
    return (
      <section
        style={{
          background: '#111827',
          borderRadius: 12,
          padding: 16,
          border: '1px solid #1f2937',
          textAlign: 'center',
          color: '#dc2626',
          fontSize: 13,
        }}
      >
        Failed to load alerts. Please try again.
      </section>
    )
  }

  if (loading) {
    return (
      <section
        style={{
          background: '#111827',
          borderRadius: 12,
          padding: 16,
          border: '1px solid #1f2937',
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: 13,
        }}
      >
        Loading alerts...
      </section>
    )
  }

  return (
    <section
      style={{
        background: '#111827',
        borderRadius: 12,
        padding: 16,
        border: '1px solid #1f2937',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
            Alert Center
          </h2>
          {unreadCount > 0 && (
            <span
              style={{
                background: '#dc2626',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 999,
                padding: '2px 7px',
                lineHeight: 1.2,
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          style={{
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 600,
            border: '1px solid #374151',
            borderRadius: 6,
            background: unreadCount > 0 ? '#1f2937' : 'transparent',
            color: unreadCount > 0 ? '#FF9933' : '#4b5563',
            cursor: unreadCount > 0 ? 'pointer' : 'default',
          }}
        >
          Mark all read
        </button>
      </div>

      {/* Alert list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: 480,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {alerts.map((alert) => {
          const isExpanded = expandedId === alert.id
          const dotColor = SEVERITY_DOT_COLOR[alert.severity]

          return (
            <div
              key={alert.id}
              style={{
                background: alert.read ? '#0d1117' : '#1a1f2e',
                borderRadius: 8,
                border: `1px solid ${alert.read ? '#1f2937' : '#2d3748'}`,
                padding: '10px 12px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => handleToggleExpand(alert.id)}
            >
              {/* Top row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                {/* Severity dot */}
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: dotColor,
                    flexShrink: 0,
                    marginTop: 3,
                    boxShadow: `0 0 6px ${dotColor}40`,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexWrap: 'wrap',
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: alert.read ? 500 : 700,
                        color: alert.read ? '#9ca3af' : '#fff',
                        lineHeight: 1.3,
                      }}
                    >
                      {alert.title}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#fff',
                        background: '#003087',
                        borderRadius: 3,
                        padding: '1px 6px',
                      }}
                    >
                      {alert.source}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: '#6b7280',
                        fontWeight: 500,
                      }}
                    >
                      {alert.category}
                    </span>
                    <span style={{ fontSize: 10, color: '#4b5563' }}>
                      {timeAgo(alert.timestamp)}
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    color: '#4b5563',
                    fontSize: 14,
                    flexShrink: 0,
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                >
                  {'\u25BC'}
                </span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ marginTop: 10, paddingLeft: 18 }}>
                  <p
                    style={{
                      margin: '0 0 10px',
                      fontSize: 12,
                      color: '#d1d5db',
                      lineHeight: 1.5,
                    }}
                  >
                    {alert.detail}
                  </p>
                  <div onClick={(e) => e.stopPropagation()}>
                    <WhatsAppShare
                      title={alert.title}
                      summary={alert.detail}
                      size="sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default AlertCenter
