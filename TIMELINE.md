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

### Session 2 — 2026-03-28 (Parallel Agent Build)
- **What was done**:
  - Deep audit of entire codebase, created GAP_ANALYSIS.md
  - Fixed 3 TypeScript build errors (unused variables in MarketPulsePanel, NewsStreamPanel)
  - Spawned 4 parallel agents for missing pieces:
    - **Data Architect**: Created `data/keywords-hi.json` (11 Hindi keyword categories), `data/industrial-clusters.json` (30 MSME clusters), `data/compliance-calendar.json` (24 deadlines), `data/sectors.json` (14 sectors)
    - **API Engineer**: Created `api/gazette.ts`, `api/gst-updates.ts`, `api/dgft.ts`, `api/ireps-tenders.ts`, `api/sme-ipo.ts` (5 new edge functions)
    - **Services/Hooks Engineer**: Created `src/services/redis.ts`, `src/services/feeds.ts`, `src/services/tenders.ts`, `src/services/market.ts`, `src/services/govt-data.ts`, `src/hooks/useNewsStream.ts`, `src/hooks/useTenders.ts`, `src/hooks/useMarketData.ts`, `src/hooks/useSchemes.ts`, `src/hooks/useDataFreshness.ts`, `src/context/DashboardContext.tsx`
    - **Frontend Engineer**: Created `src/components/MarketTicker.tsx`, `src/components/CommodityChart.tsx`, `src/components/AlertCenter.tsx`, `src/components/common/Badge.tsx`, `src/components/common/LanguageToggle.tsx`, `src/components/common/SearchBar.tsx`, `src/components/common/RupeeFormat.tsx`, `src/components/common/EmptyState.tsx`
- **Build status after session**: PASSES cleanly (`tsc && vite build` succeeds)
- **Files created**: 29 new files across data/, api/, src/services/, src/hooks/, src/context/, src/components/
- **Known issues**: Large chunk warnings (maplibre 802KB, index 923KB) — cosmetic only

## Current State Summary
- **What works**: Full build passes. 19 API endpoints, 10 dashboard panels + 3 new components + 5 common UI components, Zustand store, API service layer, 5 service modules, 5 React hooks, DashboardContext, formatters, 50 RSS feeds, 20 schemes, 11+11 keyword categories (EN+HI), 30 industrial clusters, 24 compliance deadlines, 14 sector definitions, GitHub Actions cron, Vercel config
- **What's partially built**: IndiaMapPanel (hardcoded mock data), schemes.json (20 schemes — could add more)
- **What's not started**: i18n (react-i18next), PWA manifest/service worker, wiring new components (MarketTicker, AlertCenter, CommodityChart) into App.tsx layout, more state tender portals
- **Blocking issues**: None — all code compiles and the app renders

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
