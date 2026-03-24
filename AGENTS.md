# AGENTS.md — AI Agent Context for MSME Vyapaar Monitor

This file is the authoritative context document for any AI agent working on this codebase. Read it completely before writing any code, proposing any changes, or asking clarifying questions.

---

## Vision

Become the Bloomberg Terminal for India's 63 million Micro, Small and Medium Enterprises — a single, always-on intelligence layer that surfaces what matters before the MSME owner even knows to look for it.

The average Indian MSME owner runs a business on a phone, in Hindi, without a CFO, a legal team, or a market analyst. They miss tenders worth crores because they checked the wrong portal. They overpay for raw materials because they don't track mandi prices. They lose compliance deadlines because no one built them a calendar. This dashboard fixes all of that.

---

## Mission

Aggregate 100+ government and private data sources — tenders, schemes, commodity prices, policy changes, compliance deadlines, funding news — classify them with AI, and surface the 5 most actionable insights to any MSME owner within 30 seconds of opening the app.

Everything works with zero API keys (mock data fallbacks). Everything gets better as you add keys.

---

## Architecture Principles (Non-Negotiable)

1. **No monolithic backend.** All server logic lives in Vercel Edge Functions (`api/`). Each endpoint is independent, stateless, and cacheable.
2. **Hybrid AI classification.** Stage 1: keyword match (instant, `data/keywords-en.json`). Stage 2: Groq LLM only if confidence < 0.7, result cached 24h. Never call LLM for every request.
3. **Circuit breakers on every external source.** 3 failures in 5 minutes → 5-minute cooldown. Implemented in `api/_utils.ts` (`circuitBreaker` object). Never let one broken source cascade.
4. **Redis for cross-user deduplication.** AI calls and scraped tender data are cached in Upstash Redis, keyed deterministically. Never pay for the same Groq call twice.
5. **Mock-first, API-enhanced.** Every panel must render meaningful mock data when the API is unreachable or unconfigured. The app must never show a blank panel.
6. **Mobile-first.** Indian businesspeople use phones. Every panel is readable on a 360px screen. The sidebar collapses to a bottom tab bar on mobile.

---

## What Has Been Built (Current State)

### Phase 1 — Project Foundation ✅
- Vite + React + TypeScript scaffold
- Full TypeScript interfaces (`src/types/index.ts`) covering all domain entities
- Zustand global store (`src/store/dashboardStore.ts`) — filters, freshness, sidebar, alert count
- Utility formatters (`src/utils/formatters.ts`) — INR Lakh/Crore, timeAgo, countdown, WhatsApp links
- API service layer (`src/services/api.ts`) — typed fetch wrappers for all 14 edge functions
- Static datasets: `data/feeds.json` (49 RSS feeds), `data/schemes.json` (20 govt schemes), `data/keywords-en.json` (11 classifier categories)
- App shell: sticky header with sector filters, sidebar nav, 2-column responsive grid, mobile bottom tab bar

### Phase 2 — Vercel Edge Functions ✅ (14 endpoints)

| File | Purpose |
|------|---------|
| `api/_utils.ts` | Shared: CORS headers, Redis client, RSS parser, circuit breaker, `simpleHash` |
| `api/rss-proxy.ts` | CORS-safe proxy for any RSS/Atom feed URL |
| `api/news-aggregator.ts` | Aggregates 50 feeds by category/language, deduplicates, classifies |
| `api/pib-feed.ts` | PIB press releases — 5 ministry RSS feeds merged |
| `api/classify.ts` | Hybrid keyword + Groq LLM classifier, 24h cache per content hash |
| `api/ai-brief.ts` | Daily 5-point AI brief via Groq Llama 3.1 8B, cached 6h, rich mock fallback |
| `api/gem-tenders.ts` | Scrapes `bidplus.gem.gov.in/all-bids` with regex for bid numbers |
| `api/cppp-tenders.ts` | CPPP RSS/XML + 10-state GePNIC portal map (`?state=` param) |
| `api/tender-aggregator.ts` | Unified tender search across GeM + CPPP + states |
| `api/commodity-prices.ts` | Agmarknet mandi prices via data.gov.in API |
| `api/forex.ts` | RBI reference rates (CSV download) |
| `api/stock-indices.ts` | BSE/NSE indices (bhavcopy scraping) |
| `api/schemes.ts` | Serves `data/schemes.json` with optional sector/state filtering |
| `api/scheme-match.ts` | MSME profile → scheme eligibility matching with scoring |
| `api/data-gov.ts` | data.gov.in generic adapter for Udyam stats, PMEGP, MUDRA |

### Phase 3 — React Dashboard Panels ✅ (10 panels)

| Panel | File | Data Source |
|-------|------|-------------|
| AI Daily Brief | `AIBriefPanel.tsx` | `/api/ai-brief` → Groq |
| India Map | `IndiaMapPanel.tsx` | Hardcoded clusters + `/api/tender-aggregator` |
| Tender Kanban | `TenderKanbanPanel.tsx` | `/api/tender-aggregator`, localStorage for column state |
| Market Pulse | `MarketPulsePanel.tsx` | `/api/commodity-prices`, `/api/forex`, `/api/stock-indices` |
| Scheme Finder | `SchemeFinderPanel.tsx` | `/api/scheme-match` with eligibility form |
| Policy Tracker | `PolicyTrackerPanel.tsx` | `/api/pib-feed` + `/api/news-aggregator?category=policy` |
| Funding Radar | `FundingRadarPanel.tsx` | `/api/schemes` + `/api/news-aggregator?category=funding` |
| News Stream | `NewsStreamPanel.tsx` | `/api/news-aggregator` with category chips + Hindi toggle |
| Compliance Calendar | `ComplianceCalendarPanel.tsx` | Static deadlines + computed next-occurrence dates |
| Tools & Tactics | `ToolsTacticsPanel.tsx` | Static AI tools + `/api/news-aggregator?category=technology` |

### Phase 4 — Integration ✅
- `src/App.tsx` — full layout wired with all 10 panels, lazy-loaded with Suspense
- `vercel.json` — edge runtime for all `api/**/*.ts`, CORS headers
- `.github/workflows/cron-scrapers.yml` — 2-hourly cache refresh for tenders, news, market, AI brief
- `README.md` — full documentation

---

## File Structure

```
msme-vyapaar-monitor/
├── api/                         # Vercel Edge Functions (14 endpoints)
│   ├── _utils.ts                # Shared utilities — TOUCH WITH CARE
│   ├── ai-brief.ts
│   ├── classify.ts
│   ├── commodity-prices.ts
│   ├── cppp-tenders.ts
│   ├── data-gov.ts
│   ├── forex.ts
│   ├── gem-tenders.ts
│   ├── news-aggregator.ts
│   ├── pib-feed.ts
│   ├── rss-proxy.ts
│   ├── scheme-match.ts
│   ├── schemes.ts
│   ├── stock-indices.ts
│   └── tender-aggregator.ts
├── data/
│   ├── feeds.json               # 49 RSS feed configs (url, category, tier, language)
│   ├── keywords-en.json         # 11 classifier categories with Hindi + English keywords
│   └── schemes.json             # 20 govt MSME schemes with full eligibility data
├── docs/
│   └── DATA_SOURCES.md          # Deep research on all 100+ data sources
├── src/
│   ├── components/
│   │   ├── map/
│   │   │   └── IndiaMapPanel.tsx  # deck.gl + MapLibre — 16 MSME clusters + tender hotspots
│   │   ├── panels/              # 9 dashboard panels (see table above)
│   │   └── ui/                  # 7 shared primitives
│   │       ├── DataFreshness.tsx    # Green/amber/red freshness dot pill
│   │       ├── WhatsAppShare.tsx    # WhatsApp deep-link button
│   │       ├── SectorBadge.tsx      # Colored sector pill
│   │       ├── ValueDisplay.tsx     # INR/USD formatted value
│   │       ├── CountdownTimer.tsx   # Live countdown with urgency colors
│   │       ├── LoadingSkeleton.tsx  # Shimmer loading placeholder
│   │       └── ErrorFallback.tsx    # Error state with optional retry
│   ├── services/api.ts          # Typed fetch wrappers for all 14 endpoints
│   ├── store/dashboardStore.ts  # Zustand: filters, freshness, sidebar, alertCount
│   ├── types/index.ts           # All TypeScript interfaces — source of truth
│   └── utils/formatters.ts      # formatINR, timeAgo, formatCountdown, generateWhatsAppLink
├── .github/workflows/
│   └── cron-scrapers.yml        # 2-hourly GitHub Actions cache refresh
├── .env.example                 # All required env vars with sources
├── vercel.json                  # Edge function config + CORS headers
└── CLAUDE.md                    # Project instructions for Claude Code
```

---

## Environment Variables

| Variable | Required | What it unlocks |
|----------|----------|----------------|
| `GROQ_API_KEY` | Recommended | Real AI brief + LLM classification. Free at console.groq.com |
| `UPSTASH_REDIS_REST_URL` | Recommended | Cross-user caching. Free at upstash.com |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | (paired with above) |
| `DATA_GOV_API_KEY` | Optional | Real mandi prices from Agmarknet. Free at data.gov.in |
| `GEM_API_KEY` | Optional | GeM partner API. Requires application |

All panels render with mock data when keys are absent. The app never breaks without keys.

---

## Design System

- **Primary:** `#FF9933` (Saffron — Indian flag)
- **Secondary:** `#003087` (Navy)
- **Background dark:** `#0a0e1a`
- **Card background:** `#111827`
- **Success:** `#10b981`, **Warning:** `#f59e0b`, **Danger:** `#ef4444`
- **Typography:** System font stack, Hindi rendered natively
- **Breakpoint:** `768px` — sidebar becomes bottom tab bar below this
- CSS variables are defined in `src/index.css`

---

## What Does Not Exist Yet (Known Gaps)

These are the next areas of work. Each is independent — pick any:

### High Priority
- **`src/hooks/`** — directory exists but is empty. Needs: `useNewsStream`, `useTenders`, `useMarketData`, `useSchemes` as proper React hooks that own fetch + polling + error state
- **`scripts/`** — empty. Needs Playwright scrapers for GeM and CPPP that run locally/on CI and push results to Redis
- **Real-time WebSocket layer** — currently all panels poll on mount. A shared WebSocket or SSE connection from Vercel would reduce redundant fetches
- **India Map live data** — `IndiaMapPanel.tsx` uses hardcoded mock tender hotspots. Needs wiring to `/api/tender-aggregator` to show real locations

### Medium Priority
- **Hindi UI translations** — all strings are English. Needs i18n setup (react-i18next) with a `hi` locale file
- **WhatsApp Business API** — currently generates `wa.me` deep links. Could upgrade to actual WhatsApp Business API for push alerts
- **PWA / offline support** — service worker + manifest for installability on Android
- **More state tender portals** — `api/cppp-tenders.ts` covers 10 states. 20+ more GePNIC instances exist (Assam, Bihar, Kerala, Odisha, Jharkhand, etc.)
- **GST notification OCR** — `docs/DATA_SOURCES.md` describes scraping `cbic-gst.gov.in` PDFs. Not implemented

### Lower Priority
- **`src/hooks/`** useCompliance hook with push notification scheduling
- **Playwright scraper** for IREPS (Indian Railways tenders) — requires authenticated session management
- **PrivateCircle API** integration for VC funding deal intelligence (paid)
- **Tradestat POST scraper** for export-import volume data (ASP.NET form scraping)

---

## Coding Conventions

- All edge functions: `export const config = { runtime: 'edge' }`, handle `OPTIONS` preflight, use `withCors()` from `_utils.ts`
- All panels: must render `<LoadingSkeleton />` while loading, `<ErrorFallback />` on error, `<DataFreshness />` in panel header
- `formatINR(amount)` for all Indian currency display — never raw numbers
- `timeAgo(isoString)` for all relative timestamps
- `generateWhatsAppLink(text)` for all share buttons
- TypeScript strict mode — no `any` without justification
- Panel components are default exports, UI primitives are named exports

---

## Key Technical Details for Agents

### RSS Parser (`api/_utils.ts → parseRSS`)
Pure string-based — no DOM, no DOMParser, no cheerio. Supports CDATA, both `<item>` (RSS 2.0) and `<entry>` (Atom) tags. This is intentional — Vercel Edge runtime has no DOM.

### Circuit Breaker (`api/_utils.ts → circuitBreaker`)
In-memory object keyed by source name. Threshold: 3 failures. Window: 5 minutes. Cooldown: 5 minutes. Does NOT persist across function cold starts — that's acceptable.

### GeM Scraper (`api/gem-tenders.ts`)
Uses regex `GEM\/20\d{2}\/[BCS]\/\d+` against raw HTML. No HTML parser. The page structure at `bidplus.gem.gov.in/all-bids` changes occasionally — if the scraper returns empty, check the regex against live HTML first.

### Agmarknet API (`api/commodity-prices.ts`)
Endpoint: `api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070`. Requires `api-key` header. Returns `records` array with `Arrival_Date`, `State`, `District`, `Market`, `Commodity`, `Min_Price`, `Max_Price`, `Modal_Price`. Prices are in ₹/quintal.

### Scheme Matching (`api/scheme-match.ts`)
Scores each scheme in `data/schemes.json` against submitted MSME profile. Scoring factors: sector match (+30), enterprise category match (+25), state match (+10), turnover within range (+20), employee count within range (+15). Returns sorted by score descending.

### AI Brief Caching (`api/ai-brief.ts`)
Cache key: `ai-brief:{YYYY-MM-DD}` in IST timezone. The GitHub Actions cron regenerates it during UTC 23:00-00:00 (= 5 AM IST) so the brief is fresh by morning.

---

## Deployment

```bash
npm install
cp .env.example .env
# Fill in API keys (optional)
npm run dev         # → http://localhost:5173

# Production
vercel --prod
```

Add env vars in Vercel dashboard → Settings → Environment Variables.

GitHub Actions cron runs automatically once `VERCEL_APP_URL` and `CRON_SECRET` are set as repository secrets.

---

## Data Source Deep Dive

See `docs/DATA_SOURCES.md` for exhaustive technical documentation on every data source: exact API endpoints, authentication methods, rate limits, data schemas, and access strategies for all 100+ sources including government portals, tender systems, trade data, commodity markets, financial intelligence, and news feeds.

---

*This project is built for India's 63 million MSMEs. Every feature decision should ask: does this help a garment manufacturer in Surat or a machinist in Ludhiana make a better decision today?*
