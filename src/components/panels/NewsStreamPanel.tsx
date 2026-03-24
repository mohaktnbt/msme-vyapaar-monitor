import React, { useState, useEffect, useCallback } from 'react'
import type { NewsItem, Language } from '../../types/index.js'
import { api } from '../../services/api.js'
import { getSeverityColor, timeAgo, truncate } from '../../utils/formatters.js'
import { DataFreshness } from '../ui/DataFreshness.js'
import { LoadingSkeleton } from '../ui/LoadingSkeleton.js'
import { ErrorFallback } from '../ui/ErrorFallback.js'

// ── Mock data ─────────────────────────────────────────────────────────────────

const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

const MOCK_NEWS: NewsItem[] = [
  { id: 'n1', title: "India's MSME exports touch record $150 billion in FY25", source: 'Economic Times', sourceTier: 1, url: '#', publishedAt: ago(1), fetchedAt: ago(1), category: 'export', sector: ['export', 'manufacturing'], language: 'en', severity: 'high', relevanceToMSME: 90 },
  { id: 'n2', title: 'GeM onboarding: 1.5 lakh new MSME sellers registered in March', source: 'Mint', sourceTier: 1, url: '#', publishedAt: ago(2), fetchedAt: ago(2), category: 'manufacturing', sector: ['manufacturing'], language: 'en', severity: 'medium', relevanceToMSME: 85 },
  { id: 'n3', title: 'GST refund backlog: MSMEs await ₹25,000 Crore in pending refunds', source: 'Business Standard', sourceTier: 1, url: '#', publishedAt: ago(3), fetchedAt: ago(3), category: 'finance', sector: ['manufacturing', 'services'], language: 'en', severity: 'critical', relevanceToMSME: 95 },
  { id: 'n4', title: 'Agri-tech startup Dehaat raises $60M Series E for rural fintech expansion', source: 'Inc42', sourceTier: 2, url: '#', publishedAt: ago(4), fetchedAt: ago(4), category: 'startups', sector: ['agriculture'], language: 'en', severity: 'info', relevanceToMSME: 60 },
  { id: 'n5', title: 'Steel prices surge 5%: Impact on construction MSMEs', source: 'ET Markets', sourceTier: 1, url: '#', publishedAt: ago(5), fetchedAt: ago(5), category: 'manufacturing', sector: ['construction', 'manufacturing'], language: 'en', severity: 'high', relevanceToMSME: 80 },
  { id: 'n6', title: 'UPI transaction limit for B2B raised to ₹10 Lakh', source: 'YourStory', sourceTier: 2, url: '#', publishedAt: ago(6), fetchedAt: ago(6), category: 'finance', sector: ['retail', 'services'], language: 'en', severity: 'medium', relevanceToMSME: 75 },
  { id: 'n7', title: 'IT sector hiring slows: Impact on IT MSME vendors', source: 'Mint', sourceTier: 1, url: '#', publishedAt: ago(8), fetchedAt: ago(8), category: 'it', sector: ['it', 'services'], language: 'en', severity: 'medium', relevanceToMSME: 65 },
  { id: 'n8', title: 'APEDA launches new digital portal for agri exporters', source: 'Business Line', sourceTier: 2, url: '#', publishedAt: ago(10), fetchedAt: ago(10), category: 'agriculture', sector: ['agriculture', 'export'], language: 'en', severity: 'low', relevanceToMSME: 70 },
  { id: 'n9', title: 'New textile cluster approved in Tiruppur, 10,000 jobs expected', source: 'The Hindu', sourceTier: 1, url: '#', publishedAt: ago(12), fetchedAt: ago(12), category: 'manufacturing', sector: ['textile'], language: 'en', severity: 'medium', relevanceToMSME: 72 },
  { id: 'n10', title: 'MUDRA loan NPA rate falls to 3.2% — lowest in 5 years', source: 'Business Standard', sourceTier: 1, url: '#', publishedAt: ago(14), fetchedAt: ago(14), category: 'finance', sector: ['manufacturing', 'retail'], language: 'en', severity: 'info', relevanceToMSME: 80 },
]

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['all', 'manufacturing', 'services', 'agriculture', 'retail', 'export', 'it', 'startups', 'finance']

const TIER_COLORS: Record<number, string> = { 1: '#1e3a5f', 2: '#065f46', 3: '#7c3aed', 4: '#b45309' }
const TIER_LABELS: Record<number, string> = { 1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4' }

// ── Sub-components ────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: 1 | 2 | 3 | 4 }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, color: '#fff',
      background: TIER_COLORS[tier] ?? '#6b7280',
      borderRadius: 3, padding: '1px 5px',
    }}>
      {TIER_LABELS[tier]}
    </span>
  )
}

function NewsCard({ item }: { item: NewsItem }) {
  const borderColor = getSeverityColor(item.severity ?? 'info')
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        borderLeft: `4px solid ${borderColor}`,
        background: '#fff',
        borderRadius: '0 8px 8px 0',
        padding: '10px 12px',
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <TierBadge tier={item.sourceTier} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{item.source}</span>
          {item.category && (
            <span style={{
              fontSize: 10, color: '#0369a1', background: '#eff6ff',
              borderRadius: 4, padding: '1px 5px', fontWeight: 600,
            }}>
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{timeAgo(item.publishedAt)}</span>
      </div>

      <p style={{
        margin: 0, fontSize: 13, fontWeight: 600, color: '#111827',
        lineHeight: 1.35,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {item.title}
      </p>

      {item.summary && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
          {truncate(item.summary, 100)}
        </p>
      )}
    </a>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

export const NewsStreamPanel: React.FC = () => {
  const [allNews, setAllNews] = useState<NewsItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('all')
  const [language, setLanguage] = useState<Language>('en')
  const [lastUpdated, setLastUpdated] = useState<string | undefined>()

  const fetchNews = useCallback(async (reset = false) => {
    if (reset) { setPage(1); setAllNews([]) }
    setLoading(true)
    setError(null)
    try {
      const res = await api.getNewsAggregated({
        category: category !== 'all' ? category : undefined,
        language,
      })
      const items = res.data.items
      setAllNews((prev) => (reset ? items : [...prev, ...items]))
      setHasMore(res.data.hasMore)
      setLastUpdated(res.fetchedAt)
    } catch {
      if (reset || allNews.length === 0) setAllNews(MOCK_NEWS)
      setHasMore(false)
      setLastUpdated(new Date().toISOString())
    } finally {
      setLoading(false)
    }
  }, [category, language])

  useEffect(() => { fetchNews(true) }, [category, language])

  return (
    <section style={{ background: '#f8fafc', borderRadius: 12, padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e3a5f' }}>📰 News Stream</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Language toggle */}
          <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
            {(['en', 'hi'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                style={{
                  padding: '4px 10px', fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: language === lang ? '#1e3a5f' : '#fff',
                  color: language === lang ? '#fff' : '#374151',
                }}
              >
                {lang === 'en' ? 'English' : 'हिंदी'}
              </button>
            ))}
          </div>
          <DataFreshness source="News" lastUpdated={lastUpdated} status={loading ? 'loading' : error ? 'error' : 'fresh'} />
        </div>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '4px 12px', fontSize: 12, fontWeight: 600,
              borderRadius: 999, border: '1px solid',
              borderColor: category === cat ? '#f59e0b' : '#d1d5db',
              background: category === cat ? '#fef3c7' : '#fff',
              color: category === cat ? '#92400e' : '#374151',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && allNews.length === 0 ? (
          Array.from({ length: 10 }).map((_, i) => <LoadingSkeleton key={i} lines={3} height={14} />)
        ) : error && allNews.length === 0 ? (
          <ErrorFallback message={error} onRetry={() => fetchNews(true)} panelName="News Stream" />
        ) : (
          <>
            {allNews.map((item) => <NewsCard key={item.id} item={item} />)}
            {!loading && hasMore && (
              <button
                onClick={() => fetchNews()}
                style={{
                  marginTop: 4, padding: '8px 16px', background: '#f3f4f6',
                  border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13,
                  fontWeight: 600, color: '#374151', cursor: 'pointer',
                  alignSelf: 'center',
                }}
              >
                Load More
              </button>
            )}
            {loading && <LoadingSkeleton lines={3} height={14} />}
          </>
        )}
      </div>
    </section>
  )
}

export default NewsStreamPanel
