# MSME Vyapaar Monitor — Gap Analysis
Generated: 2026-03-28

## What Exists (DO NOT TOUCH unless broken)

### Core Types
- [x] `src/types/index.ts` — **working** — Comprehensive interfaces for all domain entities (NewsItem, TenderItem, SchemeInfo, MarketPrice, PolicyUpdate, FundingScheme, InfraProject, ComplianceDeadline, AIBrief, DashboardState, ApiResponse, PaginatedResponse, FeedConfig, KeywordCategory)

### API Edge Functions (14 endpoints)
- [x] `api/_utils.ts` (278 lines) — **working** — Shared: CORS, Redis client, RSS parser, circuit breaker
- [x] `api/rss-proxy.ts` (136 lines) — **working** — Generic CORS proxy for RSS/Atom
- [x] `api/news-aggregator.ts` (163 lines) — **working** — Multi-feed aggregator with dedup
- [x] `api/pib-feed.ts` (134 lines) — **working** — PIB press releases
- [x] `api/classify.ts` (275 lines) — **working** — Hybrid keyword + Groq LLM classifier
- [x] `api/ai-brief.ts` (289 lines) — **working** — Daily AI brief via Groq
- [x] `api/gem-tenders.ts` (214 lines) — **working** — GeM bid scraper
- [x] `api/cppp-tenders.ts` (209 lines) — **working** — CPPP + 10 state GePNIC portals
- [x] `api/tender-aggregator.ts` (168 lines) — **working** — Unified tender search
- [x] `api/commodity-prices.ts` (288 lines) — **working** — Agmarknet mandi prices
- [x] `api/forex.ts` (200 lines) — **working** — RBI reference rates
- [x] `api/stock-indices.ts` (221 lines) — **working** — BSE/NSE indices
- [x] `api/schemes.ts` (95 lines) — **working** — Scheme listing with filters
- [x] `api/scheme-match.ts` (173 lines) — **working** — MSME profile → scheme matching
- [x] `api/data-gov.ts` (169 lines) — **working** — data.gov.in adapter

### React Components (17 files)
- [x] `src/App.tsx` — **working** — Full layout with all 10 panels, lazy-loaded
- [x] `src/components/panels/AIBriefPanel.tsx` — **working**
- [x] `src/components/panels/TenderKanbanPanel.tsx` — **working**
- [x] `src/components/panels/MarketPulsePanel.tsx` — **working** (fixed unused var)
- [x] `src/components/panels/SchemeFinderPanel.tsx` — **working**
- [x] `src/components/panels/PolicyTrackerPanel.tsx` — **working**
- [x] `src/components/panels/FundingRadarPanel.tsx` — **working**
- [x] `src/components/panels/NewsStreamPanel.tsx` — **working** (fixed unused vars)
- [x] `src/components/panels/ComplianceCalendarPanel.tsx` — **working**
- [x] `src/components/panels/ToolsTacticsPanel.tsx` — **working**
- [x] `src/components/map/IndiaMapPanel.tsx` — **working** (hardcoded mock data)
- [x] `src/components/ui/LoadingSkeleton.tsx` — **working**
- [x] `src/components/ui/ValueDisplay.tsx` — **working**
- [x] `src/components/ui/ErrorFallback.tsx` — **working**
- [x] `src/components/ui/CountdownTimer.tsx` — **working**
- [x] `src/components/ui/DataFreshness.tsx` — **working**
- [x] `src/components/ui/WhatsAppShare.tsx` — **working**
- [x] `src/components/ui/SectorBadge.tsx` — **working**

### Services & Utils
- [x] `src/services/api.ts` — **working** — Typed fetch wrappers for all 14 endpoints
- [x] `src/store/dashboardStore.ts` — **working** — Zustand store
- [x] `src/utils/formatters.ts` — **working** — INR formatting, timeAgo, WhatsApp links

### Data Files
- [x] `data/feeds.json` (50 feeds) — **working** — RSS feed configs
- [x] `data/schemes.json` (20 schemes) — **partial** — Needs 10+ more schemes
- [x] `data/keywords-en.json` (11 categories) — **working** — Classifier keywords

### Config
- [x] `vite.config.ts` — **working**
- [x] `tailwind.config.js` — **working** — Full saffron/navy palette, dark mode
- [x] `tsconfig.json` — **working**
- [x] `vercel.json` — **working** — Edge runtime, CORS headers
- [x] `.env.example` — **working** — All env vars documented
- [x] `.github/workflows/cron-scrapers.yml` — **working** — 2-hourly cache refresh
- [x] `AGENTS.md` — **working** — Comprehensive project context

## What's Missing (BUILD THESE)

### Priority 1: Missing Data Files
- [ ] `data/keywords-hi.json` — Hindi classification keywords
- [ ] `data/industrial-clusters.json` — 30+ major MSME clusters with coords
- [ ] `data/compliance-calendar.json` — Full year GST/IT/MCA/EPFO/ESIC deadlines
- [ ] `data/sectors.json` — MSME sector taxonomy
- [ ] 10+ more schemes in `data/schemes.json` (currently 20, need 30+)

### Priority 2: Missing API Endpoints
- [ ] `api/gazette.ts` — Gazette of India monitor
- [ ] `api/gst-updates.ts` — GST notification parser
- [ ] `api/dgft.ts` — DGFT trade notices
- [ ] `api/ireps-tenders.ts` — Indian Railways tenders
- [ ] `api/state-tenders.ts` — Additional state portals (20+ more states)
- [ ] `api/sme-ipo.ts` — BSE SME / NSE Emerge IPO listings
- [ ] `api/mandi-prices.ts` — Dedicated mandi price endpoint (distinct from commodity-prices)

### Priority 3: Missing Services & Hooks
- [ ] `src/services/redis.ts` — Upstash Redis client wrapper
- [ ] `src/services/feeds.ts` — Feed service layer
- [ ] `src/services/govt-data.ts` — Government data service
- [ ] `src/services/tenders.ts` — Tender service layer
- [ ] `src/services/market.ts` — Market data service
- [ ] `src/hooks/useNewsStream.ts` — News hook with polling
- [ ] `src/hooks/useTenders.ts` — Tender hook
- [ ] `src/hooks/useMarketData.ts` — Market data hook
- [ ] `src/hooks/useSchemes.ts` — Scheme hook
- [ ] `src/hooks/useDataFreshness.ts` — Freshness tracking hook
- [ ] `src/context/DashboardContext.tsx` — Dashboard context provider

### Priority 4: Missing Frontend Components
- [ ] `src/components/MarketTicker.tsx` — Horizontal scrolling price ticker
- [ ] `src/components/CommodityChart.tsx` — Recharts price chart with time ranges
- [ ] `src/components/AlertCenter.tsx` — Notification feed by severity

### Priority 5: Polish & Integration
- [ ] `scripts/` directory — Cron scripts for tender/data refresh
- [ ] i18n setup (react-i18next) with Hindi locale
- [ ] PWA manifest + service worker
- [ ] IndiaMapPanel wiring to live tender data (currently hardcoded)

## What Needs Improvement (ENHANCE, don't replace)
- `data/schemes.json` — Has 20 schemes, needs 10+ more (MUDRA variants, PM Vishwakarma, PLI, state schemes)
- `src/components/map/IndiaMapPanel.tsx` — Uses hardcoded mock tender hotspots, needs live data wiring
- Chunk sizes are large (800KB maplibre, 900KB index) — could benefit from better code splitting

## Dependencies to Add
- None critical — all major deps are installed (deck.gl, maplibre-gl, recharts, zustand, @upstash/redis, groq-sdk)
- Optional: `react-i18next` + `i18next` for future i18n

## Build Status
- `npm run build`: **PASSES** (after fixing 3 unused variable errors in MarketPulsePanel.tsx and NewsStreamPanel.tsx)
- Warnings: Large chunks (maplibre-gl 802KB, index 923KB) — acceptable for now
- All 14 API endpoints, 10 panels, 7 UI components compile cleanly
