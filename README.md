# MSME Vyapaar Monitor — व्यापार मॉनिटर

**Real-time AI-powered intelligence dashboard for Indian MSMEs**

![Dashboard Preview](https://via.placeholder.com/1280x720/0a0e1a/FF9933?text=MSME+Vyapaar+Monitor)

A WorldMonitor-style intelligence dashboard tailored for India's 63+ million Micro, Small and Medium Enterprises. Aggregates 100+ data sources — government schemes, live tenders, commodity prices, policy updates, and AI-classified news — into a single mobile-first dashboard.

---

## Features

| Panel | Data Sources |
|-------|-------------|
| 🤖 **AI Daily Brief** | Groq Llama 3.1 + 50 news feeds |
| 🗺️ **India Map** | Tender hotspots, MSME clusters, infra projects |
| 📋 **Tender Kanban** | GeM, CPPP, 30+ state GePNIC portals |
| 📈 **Market Pulse** | Agmarknet, RBI forex, BSE/NSE |
| 🏛️ **Scheme Finder** | 20+ government schemes with eligibility matching |
| 📰 **Policy Tracker** | PIB, CBIC GST, DGFT, RBI |
| 💰 **Funding Radar** | MUDRA, CGTMSE, VC funding news |
| 📡 **News Stream** | 50 RSS feeds, Hindi/English, AI-classified |
| 📅 **Compliance Calendar** | GST, TDS, MCA, EPFO deadlines |
| 🛠️ **Tools & Tactics** | AI tools, export opportunities |

---

## Quick Start

```bash
git clone https://github.com/your-username/msme-vyapaar-monitor
cd msme-vyapaar-monitor
npm install
cp .env.example .env
# Fill in API keys (optional — app works without them using mock data)
npm run dev
```

Visit `http://localhost:5173`

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Source |
|----------|----------|--------|
| `GROQ_API_KEY` | Recommended | [console.groq.com](https://console.groq.com) — free tier |
| `UPSTASH_REDIS_REST_URL` | Recommended | [upstash.com](https://upstash.com) — free tier |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | [upstash.com](https://upstash.com) |
| `DATA_GOV_API_KEY` | Optional | [data.gov.in](https://data.gov.in/user/register) — free |
| `GEM_API_KEY` | Optional | [gem.gov.in](https://gem.gov.in/docs/api) — partner access |

**The app works with zero API keys** — all panels fall back to sample/mock data.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  (Vite + TypeScript + deck.gl + MapLibre + Recharts)   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│               Vercel Edge Functions (30+)                │
│     api/news-aggregator  api/gem-tenders  api/classify   │
│     api/commodity-prices api/ai-brief     api/schemes    │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    Upstash Redis   Groq API    External APIs
    (Cache layer)  (AI models)  (100+ sources)
```

**Key design decisions:**
- **Edge functions** as lightweight API layer — no monolithic backend
- **Hybrid AI classification**: instant keyword matching + async Groq LLM override
- **Redis cache** for cross-user deduplication of AI calls and scraping
- **Circuit breakers** with 5-min cooldowns per data source
- **Mobile-first** — optimized for Indian businesspeople on phones

---

## Data Sources

See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) for the full reference.

**Quick overview:**
- **Government**: data.gov.in (Udyam stats), PIB RSS, MSME Ministry, DGFT, MyScheme.gov.in
- **Tenders**: GeM (bidplus.gem.gov.in scraping), CPPP (eprocure.gov.in RSS/XML), 30+ state GePNIC portals
- **Market**: Agmarknet mandi prices, RBI reference rates, BSE/NSE
- **News**: 50 RSS feeds (ET, Mint, BS, Inc42, YourStory, Amar Ujala, Loksatta)
- **Compliance**: GST CBIC, Income Tax, MCA, EPFO/ESIC

---

## Deployment (Vercel)

```bash
npm install -g vercel
vercel --prod
```

Add environment variables in Vercel dashboard → Settings → Environment Variables.

For GitHub Actions cron scraper (2-hourly cache refresh):
1. Set `VERCEL_APP_URL` secret in GitHub repo settings
2. Set `CRON_SECRET` secret (any random string)
3. GitHub Actions workflow runs automatically

---

## Project Structure

```
msme-vyapaar-monitor/
├── api/                    # Vercel Edge Functions
│   ├── _utils.ts           # Shared utilities (CORS, Redis, RSS parser)
│   ├── ai-brief.ts         # AI daily intelligence brief
│   ├── classify.ts         # Hybrid keyword + LLM classifier
│   ├── commodity-prices.ts # Agmarknet commodity prices
│   ├── cppp-tenders.ts     # CPPP & state portal tenders
│   ├── data-gov.ts         # data.gov.in adapter
│   ├── forex.ts            # RBI reference rates
│   ├── gem-tenders.ts      # GeM bid scraper
│   ├── news-aggregator.ts  # Multi-feed news aggregator
│   ├── pib-feed.ts         # PIB press releases
│   ├── rss-proxy.ts        # CORS-safe RSS proxy
│   ├── scheme-match.ts     # MSME profile → scheme matcher
│   ├── schemes.ts          # Government schemes API
│   ├── stock-indices.ts    # BSE/NSE indices
│   └── tender-aggregator.ts # Unified tender search
├── data/
│   ├── feeds.json          # 50 RSS feed configurations
│   ├── keywords-en.json    # Classifier keyword dictionary
│   └── schemes.json        # 20+ MSME government schemes
├── docs/
│   └── DATA_SOURCES.md     # Deep research on all data sources
├── src/
│   ├── components/
│   │   ├── map/            # deck.gl India map
│   │   ├── panels/         # 10 dashboard panels
│   │   └── ui/             # Shared components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API client functions
│   ├── store/              # Zustand state management
│   ├── types/              # TypeScript interfaces
│   └── utils/              # Formatters, helpers
├── .github/workflows/      # GitHub Actions cron scrapers
├── .env.example
├── vercel.json
└── tailwind.config.js
```

---

## Contributing

Contributions welcome! Areas that need help:
- Adding more state tender portal parsers
- Hindi UI translations
- More government scheme entries
- Better commodity price sources
- WhatsApp Business API integration

---

## License

MIT License — see [LICENSE](LICENSE) file.

---

*Built with ❤️ for India's 63 million MSMEs*
