import React, { useState, useEffect } from 'react'
import type { NewsItem } from '../../types/index.js'
import { api } from '../../services/api.js'
import { DataFreshness } from '../ui/DataFreshness.js'
import { LoadingSkeleton } from '../ui/LoadingSkeleton.js'
import { timeAgo } from '../../utils/formatters.js'

// ── Static data ───────────────────────────────────────────────────────────────

const AI_TOOLS = [
  { name: 'ChatGPT Business', description: 'Generate professional emails, tenders, and proposals in minutes.', whyItMatters: 'Saves 2–3 hours per day on writing tasks.', url: 'https://chat.openai.com', category: 'Productivity' },
  { name: 'Canva for Business', description: 'Create product catalogs, social media posts, and pitch decks.', whyItMatters: 'Professional marketing without a designer.', url: 'https://canva.com', category: 'Design' },
  { name: 'Zoho Books GST', description: 'GST-compliant invoicing and accounting built for Indian MSMEs.', whyItMatters: 'Auto-fill GST returns, save CA fees.', url: 'https://zoho.com/books', category: 'Accounting' },
]

const MARKETING_TACTICS = [
  { title: 'WhatsApp Business Catalog', description: 'Set up a free product catalog on WhatsApp Business to let customers browse and order directly.', impact: '3x more leads from existing customers', actionUrl: 'https://business.whatsapp.com' },
  { title: 'Google Business Profile', description: "Claim your free Google Business listing to appear in local searches and Google Maps.", impact: 'Appear in "near me" searches for free', actionUrl: 'https://business.google.com' },
  { title: 'ONDC Seller Registration', description: 'List your products on ONDC (Open Network for Digital Commerce) to reach millions of buyers.', impact: 'Access to Paytm, Meesho, Magicpin customers', actionUrl: 'https://ondc.org' },
]

const EXPORT_OPPORTUNITIES = [
  { market: 'UAE', product: 'Textile & Garments', opportunity: 'CEPA with India: Zero duty on 97% products', actionUrl: 'https://apeda.gov.in' },
  { market: 'Australia', product: 'Pharma & Chemicals', opportunity: 'ECTA agreement: Growing demand for generics', actionUrl: 'https://dgft.gov.in' },
  { market: 'UK', product: 'Engineering Goods', opportunity: 'FTA negotiations in final stages; prep now', actionUrl: 'https://indiantradeportal.in' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  emoji,
  title,
  children,
}: {
  emoji: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '9px 14px',
          background: '#1e3a5f',
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {emoji} {title}
      </div>
      <div style={{ padding: '12px 14px', flex: 1 }}>{children}</div>
    </div>
  )
}

function AIToolCard({ tool, index }: { tool: typeof AI_TOOLS[number]; index: number }) {
  return (
    <div style={{ marginBottom: index < AI_TOOLS.length - 1 ? 10 : 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 13, color: '#111827' }}>{tool.name}</p>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', borderRadius: 4, padding: '1px 6px' }}>{tool.category}</span>
        </div>
        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#1e3a5f', borderRadius: 6, padding: '4px 10px', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          Try Free
        </a>
      </div>
      <p style={{ margin: '6px 0 2px', fontSize: 12, color: '#374151' }}>{tool.description}</p>
      <p style={{ margin: 0, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ {tool.whyItMatters}</p>
    </div>
  )
}

function MarketingCard({ tactic }: { tactic: typeof MARKETING_TACTICS[number] }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: 13, color: '#111827' }}>{tactic.title}</p>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: '#374151' }}>{tactic.description}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>📈 {tactic.impact}</span>
        <a href={tactic.actionUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: '#1e3a5f', textDecoration: 'none' }}>
          Learn more →
        </a>
      </div>
    </div>
  )
}

function ExportCard({ opp }: { opp: typeof EXPORT_OPPORTUNITIES[number] }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#0d9488', borderRadius: 5, padding: '2px 8px' }}>
          {opp.market}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{opp.product}</span>
      </div>
      <p style={{ margin: '0 0 5px', fontSize: 12, color: '#374151' }}>{opp.opportunity}</p>
      <a href={opp.actionUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: '#1e3a5f', textDecoration: 'none' }}>
        Explore opportunity →
      </a>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

const TOOL_INDEX = Math.floor(Date.now() / (7 * 86_400_000)) % AI_TOOLS.length
const TACTIC_INDEX = Math.floor(Date.now() / (7 * 86_400_000)) % MARKETING_TACTICS.length

export const ToolsTacticsPanel: React.FC = () => {
  const [techNews, setTechNews] = useState<NewsItem | null>(null)
  const [loadingTech, setLoadingTech] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | undefined>()

  useEffect(() => {
    api.getNewsAggregated({ category: 'technology' })
      .then((res) => {
        const items = res.data.items
        if (items.length > 0) setTechNews(items[0])
        setLastUpdated(res.fetchedAt)
      })
      .catch(() => {
        setLastUpdated(new Date().toISOString())
      })
      .finally(() => setLoadingTech(false))
  }, [])

  return (
    <section style={{ background: '#f8fafc', borderRadius: 12, padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e3a5f' }}>🛠 Tools & Tactics</h2>
        <DataFreshness source="Tools" lastUpdated={lastUpdated} status={loadingTech ? 'loading' : 'fresh'} />
      </div>

      {/* 2x2 Grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: 'auto auto',
          gap: 12,
          overflow: 'auto',
        }}
      >
        {/* Section 1: AI Tool Spotlight */}
        <SectionCard emoji="🤖" title="AI Tool Spotlight">
          <AIToolCard tool={AI_TOOLS[TOOL_INDEX]} index={0} />
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>More Tools</p>
            {AI_TOOLS.filter((_, i) => i !== TOOL_INDEX).map((tool, i) => (
              <p key={tool.name} style={{ margin: i > 0 ? '4px 0 0' : '0', fontSize: 12 }}>
                <a href={tool.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1e3a5f', fontWeight: 600, textDecoration: 'none' }}>
                  {tool.name}
                </a>
                <span style={{ color: '#6b7280' }}> — {tool.category}</span>
              </p>
            ))}
          </div>
        </SectionCard>

        {/* Section 2: Marketing Tactic */}
        <SectionCard emoji="📣" title="Marketing Tactic">
          <MarketingCard tactic={MARKETING_TACTICS[TACTIC_INDEX]} />
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
            {MARKETING_TACTICS.filter((_, i) => i !== TACTIC_INDEX).map((t) => (
              <p key={t.title} style={{ margin: '4px 0', fontSize: 12 }}>
                <span style={{ fontWeight: 600, color: '#111827' }}>{t.title}</span>
                <span style={{ color: '#9ca3af' }}> — {t.impact}</span>
              </p>
            ))}
          </div>
        </SectionCard>

        {/* Section 3: Tech Breakthrough */}
        <SectionCard emoji="💡" title="Tech Breakthrough">
          {loadingTech ? (
            <LoadingSkeleton lines={3} height={13} />
          ) : techNews ? (
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: '#111827', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {techNews.title}
              </p>
              <p style={{ margin: '0 0 8px', fontSize: 11, color: '#9ca3af' }}>
                {techNews.source} · {timeAgo(techNews.publishedAt)}
              </p>
              <a
                href={techNews.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, fontWeight: 600, color: '#1e3a5f', textDecoration: 'none' }}
              >
                Read full story →
              </a>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: '#111827' }}>AI-powered credit scoring goes mainstream</p>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#374151' }}>Banks are now using AI to assess MSME creditworthiness in minutes, not weeks. Digital footprint matters more than collateral.</p>
              <p style={{ margin: 0, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Maintain digital invoicing trails to improve credit access</p>
            </div>
          )}
        </SectionCard>

        {/* Section 4: Export Opportunity */}
        <SectionCard emoji="🌍" title="Export Opportunity">
          {EXPORT_OPPORTUNITIES.map((opp) => (
            <ExportCard key={opp.market} opp={opp} />
          ))}
          <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
            <a
              href="https://indiantradeportal.in"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, fontWeight: 600, color: '#0d9488', textDecoration: 'none' }}
            >
              Explore all export markets →
            </a>
          </div>
        </SectionCard>
      </div>
    </section>
  )
}

export default ToolsTacticsPanel
