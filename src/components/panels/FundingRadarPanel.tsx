import React, { useState, useEffect } from 'react'
import type { NewsItem } from '../../types/index.js'
import { api } from '../../services/api.js'
import { formatINR, timeAgo } from '../../utils/formatters.js'
import { DataFreshness } from '../ui/DataFreshness.js'
import { LoadingSkeleton } from '../ui/LoadingSkeleton.js'

// ── Static data ───────────────────────────────────────────────────────────────

const GOV_SCHEMES = [
  { id: 'mudra', name: 'MUDRA Loan (Shishu/Kishore/Tarun)', maxAmount: 10_00_000, keyBenefit: 'Collateral-free loans up to ₹10 Lakh via banks/NBFCs', url: 'https://mudra.org.in' },
  { id: 'cgtmse', name: 'CGTMSE Credit Guarantee Scheme', maxAmount: 5_00_00_000, keyBenefit: '75-85% guarantee cover on loans — no collateral required', url: 'https://cgtmse.in' },
  { id: 'nsic', name: 'NSIC Credit Support Scheme', maxAmount: 10_00_00_000, keyBenefit: 'Raw material financing & bank credit facilitation for MSMEs', url: 'https://nsic.co.in' },
  { id: 'sidbi-direct', name: 'SIDBI Direct Lending', maxAmount: 25_00_00_000, keyBenefit: 'Long-term loans at concessional rates for equipment & expansion', url: 'https://sidbi.in' },
  { id: 'pmegp', name: 'PMEGP (PM Employment Generation Programme)', maxAmount: 50_00_000, keyBenefit: 'Govt subsidy 15-35% for new manufacturing/service units', url: 'https://msme.gov.in/pmegp' },
  { id: 'stand-up', name: 'Stand-Up India Scheme', maxAmount: 1_00_00_000, keyBenefit: '₹10L–₹1Cr loans for SC/ST and women entrepreneurs', url: 'https://standupmitra.in' },
]

const BANK_RATES = [
  { bank: 'SBI', msme: '8.90%', wc: '9.20%', tenure: '5 years' },
  { bank: 'HDFC Bank', msme: '9.50%', wc: '10.00%', tenure: '5 years' },
  { bank: 'ICICI Bank', msme: '9.20%', wc: '9.80%', tenure: '5 years' },
  { bank: 'Bank of Baroda', msme: '8.70%', wc: '9.00%', tenure: '7 years' },
  { bank: 'Canara Bank', msme: '8.80%', wc: '9.10%', tenure: '5 years' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function GovSchemeCard({ scheme }: { scheme: typeof GOV_SCHEMES[number] }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: '#111827' }}>{scheme.name}</p>
      <p style={{ margin: '0 0 6px', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Up to {formatINR(scheme.maxAmount)}</p>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#374151' }}>{scheme.keyBenefit}</p>
      <a
        href={scheme.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#1e3a5f', borderRadius: 6, padding: '4px 12px', textDecoration: 'none', display: 'inline-block' }}
      >
        Check Eligibility
      </a>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export const FundingRadarPanel: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loadingNews, setLoadingNews] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | undefined>()

  useEffect(() => {
    api.getNewsAggregated({ category: 'startups' })
      .then((res) => {
        setNews(res.data.items.slice(0, 5))
        setLastUpdated(res.fetchedAt)
      })
      .catch(() => {
        // Silently fall back to empty news
        setNews([])
        setLastUpdated(new Date().toISOString())
      })
      .finally(() => setLoadingNews(false))
  }, [])

  return (
    <section style={{ background: '#f8fafc', borderRadius: 12, padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e3a5f' }}>💰 Funding Radar</h2>
        <DataFreshness source="Funding" lastUpdated={lastUpdated} status={loadingNews ? 'loading' : 'fresh'} />
      </div>

      {/* Section 1: Government Schemes */}
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🏛 Government Loans & Subsidies
        </h3>
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {GOV_SCHEMES.map((s) => <GovSchemeCard key={s.id} scheme={s} />)}
        </div>
      </div>

      {/* Section 2: Startup Funding News */}
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🚀 Startup & MSME Funding News
        </h3>
        {loadingNews ? (
          <LoadingSkeleton lines={4} height={14} />
        ) : news.length === 0 ? (
          <p style={{ fontSize: 12, color: '#9ca3af' }}>No funding news available right now.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {news.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  padding: '8px 10px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.title}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{item.source}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(item.publishedAt)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Bank Rates */}
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🏦 Indicative Bank MSME Rates
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#1e3a5f', color: '#fff' }}>
                <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600 }}>Bank</th>
                <th style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>MSME Loan</th>
                <th style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>Working Capital</th>
                <th style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>Max Tenure</th>
              </tr>
            </thead>
            <tbody>
              {BANK_RATES.map((r, i) => (
                <tr key={r.bank} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 600, color: '#111827' }}>{r.bank}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{r.msme}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#d97706', fontWeight: 700 }}>{r.wc}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#6b7280' }}>{r.tenure}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ margin: '4px 0 0', fontSize: 10, color: '#9ca3af' }}>* Rates are indicative. Contact your bank for exact terms.</p>
        </div>
      </div>
    </section>
  )
}

export default FundingRadarPanel
