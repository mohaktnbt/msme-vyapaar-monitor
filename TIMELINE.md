# MSME Vyapaar Monitor — Project Timeline & Context

> This file is the project's institutional memory. Read it first in any new session.
> Last updated: 2026-03-28

## Project Identity
- **Name**: MSME Vyapaar Monitor (व्यापार मॉनिटर)
- **Repo**: https://github.com/mohaktnbt/msme-vyapaar-monitor
- **Vision**: The Bloomberg Terminal for India's 63M MSMEs
- **Target user**: Indian MSME owner — runs business on phone, in Hindi, without analysts
- **Design**: Mobile-first, dark mode, saffron (#FF9933) + navy (#000080) palette

## Tech Stack
- Frontend: Vite + React 18 + TypeScript + Tailwind CSS v4
- Map: deck.gl 9.x + MapLibre GL JS + react-map-gl
- Charts: Recharts
- State: Zustand
- Backend: Vercel Edge Functions (api/ directory, 14 endpoints)
- Cache: Upstash Redis
- AI: Groq (Llama 3.1 8B) for classification and daily briefs
- Deployment: Vercel
- Cron: GitHub Actions (2-hourly)
- Package manager: npm

## Architecture Overview
```
┌─────────────────────────────────────────────────────────┐
│                    DATA SOURCES (100+)                    │
│  PIB RSS │ GeM │ CPPP │ data.gov.in │ MCX │ RBI │ News  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              VERCEL EDGE FUNCTIONS (api/)                 │
│  rss-proxy │ pib-feed │ gem-tenders │ commodity-prices   │
│  news-aggregator │ classify │ ai-brief │ scheme-match    │
│  cppp-tenders │ tender-aggregator │ forex │ stock-indices │
│  schemes │ data-gov │ _utils (shared)                    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              UPSTASH REDIS CACHE                         │
│  vyapaar:{category}:{hash} with TTL per source type      │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              REACT FRONTEND                               │
│  App.tsx → Lazy-loaded panels (10) + UI primitives (7)   │
│  Zustand store │ API service layer │ Formatters           │
│  IndiaMap │ AIBrief │ TenderKanban │ MarketPulse │ ...   │
└─────────────────────────────────────────────────────────┘
```

## Build History

### Session 1 — Initial Build (pre-2026-03-28)
- **Commit `1b12b05`**: Add .gitignore
- **Commit `9f225ac`**: Phase 1 — project foundation (Vite scaffold, types, store, formatters, API service)
- **Commit `fa23e59`**: Phase 2 — 14 Vercel Edge Functions (RSS, tenders, market data, AI, schemes)
- **Commit `7ac4f2e`**: Phase 3 — All 9 dashboard panels + 7 UI components
- **Commit `43946c9`**: Fix: install react-map-gl, update postcss config for Tailwind v4
- **Commit `c8b6ca5`**: docs: add AGENTS.md — comprehensive AI agent context document
- **Build status**: Compiles with 3 unused-variable warnings (fixed in Session 2)

### Session 2 — 2026-03-28 (ClawTeam Audit + Enhancement)
- **What was done**: Deep audit, gap analysis, build fixes, data enrichment, missing services/hooks/components
- **Build status after session**: PASSES cleanly
- **Fixes applied**: Removed unused `i` param in MarketPulsePanel, removed unused `PAGE_SIZE`/`page` in NewsStreamPanel
- **Files created**: GAP_ANALYSIS.md, TIMELINE.md, plus new data files, services, hooks, components (see commits below)
- **Git commits**: [will be updated as work progresses]

## Current State Summary
- **What works**: Full build passes. 14 API endpoints, 10 dashboard panels, 7 UI components, Zustand store, API service layer, formatters, 50 RSS feeds, 20 schemes, 11 keyword categories, GitHub Actions cron, Vercel config
- **What's partially built**: schemes.json (20/30+ target), IndiaMapPanel (hardcoded mock data)
- **What's not started**: Hindi keyword dict, industrial clusters data, compliance calendar data, sectors taxonomy, gazette/GST/DGFT API endpoints, IREPS/state tenders expansion, SME IPO endpoint, React hooks layer, DashboardContext, MarketTicker, CommodityChart, AlertCenter, i18n, PWA
- **Blocking issues**: None — all existing code compiles and the app renders

## Data Sources Target (100+)
- Government APIs: data.gov.in, PIB RSS, MyScheme, Gazette, GST, DGFT
- Tender portals: GeM, CPPP, IREPS, 30+ state GePNIC portals
- Market data: MCX, NCDEX, Agmarknet mandi prices, RBI forex, BSE/NSE
- News RSS: 50 feeds (ET, Mint, BS, Inc42 + Hindi/regional)
- Compliance: GST, Income Tax, MCA, EPFO, ESIC deadlines

## Key Design Rules
1. Every panel answers: "What should I do TODAY as an MSME owner?"
2. Hindi/English bilingual from day 1 (titleHi/summaryHi fields)
3. Mobile-first (Indian businessmen use phones)
4. Works with zero API keys (mock/sample data fallbacks)
5. Indian number formatting: ₹1,00,000 (lakhs/crores)
6. All dates in IST (Asia/Kolkata)
7. WhatsApp share on every insight card
8. Freshness indicator on every data panel
9. Circuit breaker: 3 failures → 5 min cooldown per source

## For Future Sessions
- Read this file + AGENTS.md + GAP_ANALYSIS.md before coding
- Run `npm run build` to verify current state
- Check git log for recent changes
- All API edge functions go in api/ directory
- All shared types in src/types/
- Component library in src/components/ui/
- The project uses npm (not pnpm)
