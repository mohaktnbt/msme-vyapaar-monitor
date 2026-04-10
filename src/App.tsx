import { useState, Suspense, lazy } from 'react'
import './App.css'
import { useDashboardStore } from './store/dashboardStore.js'
import IndiaMapPanel from './components/map/IndiaMapPanel.js'
import AIBriefPanel from './components/panels/AIBriefPanel.js'
import { MarketTicker } from './components/MarketTicker.js'
import { LanguageToggle } from './components/common/LanguageToggle.js'

// Lazy-load heavier panels
const TenderKanbanPanel = lazy(() => import('./components/panels/TenderKanbanPanel.js'))
const MarketPulsePanel = lazy(() => import('./components/panels/MarketPulsePanel.js'))
const SchemeFinderPanel = lazy(() => import('./components/panels/SchemeFinderPanel.js'))
const PolicyTrackerPanel = lazy(() => import('./components/panels/PolicyTrackerPanel.js'))
const FundingRadarPanel = lazy(() => import('./components/panels/FundingRadarPanel.js'))
const NewsStreamPanel = lazy(() => import('./components/panels/NewsStreamPanel.js'))
const ComplianceCalendarPanel = lazy(() => import('./components/panels/ComplianceCalendarPanel.js'))
const ToolsTacticsPanel = lazy(() => import('./components/panels/ToolsTacticsPanel.js'))
const AlertCenter = lazy(() => import('./components/AlertCenter.js'))

// New civic-data panels (forthepeople.in inspired)
const WeatherRainfallPanel = lazy(() => import('./components/panels/WeatherRainfallPanel.js'))
const DamWaterPanel = lazy(() => import('./components/panels/DamWaterPanel.js'))
const PowerGridPanel = lazy(() => import('./components/panels/PowerGridPanel.js'))
const TransportInfraPanel = lazy(() => import('./components/panels/TransportInfraPanel.js'))
const DistrictOpportunityPanel = lazy(() => import('./components/panels/DistrictOpportunityPanel.js'))
const DataSourcesPanel = lazy(() => import('./components/panels/DataSourcesPanel.js'))

type Sector = 'all' | 'manufacturing' | 'services' | 'agriculture' | 'retail' | 'export' | 'it'

const SECTOR_FILTERS: { value: Sector; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'manufacturing', label: '🏭 Manufacturing' },
  { value: 'services', label: '💼 Services' },
  { value: 'agriculture', label: '🌾 Agriculture' },
  { value: 'retail', label: '🛒 Retail' },
  { value: 'export', label: '🚢 Export' },
  { value: 'it', label: '💻 IT' },
]

const NAV_ITEMS = [
  { id: 'brief', icon: '🤖', label: 'AI Brief' },
  { id: 'district', icon: '📊', label: 'District Score' },
  { id: 'map', icon: '🗺️', label: 'Map' },
  { id: 'tenders', icon: '📋', label: 'Tenders' },
  { id: 'market', icon: '📈', label: 'Market' },
  { id: 'weather', icon: '🌦️', label: 'Weather' },
  { id: 'dams', icon: '💧', label: 'Water' },
  { id: 'power', icon: '⚡', label: 'Power' },
  { id: 'transport', icon: '🛣️', label: 'Transport' },
  { id: 'schemes', icon: '🏛️', label: 'Schemes' },
  { id: 'policy', icon: '📜', label: 'Policy' },
  { id: 'funding', icon: '💰', label: 'Funding' },
  { id: 'news', icon: '📡', label: 'News' },
  { id: 'alerts', icon: '🔔', label: 'Alerts' },
  { id: 'compliance', icon: '📅', label: 'Compliance' },
  { id: 'sources', icon: '📚', label: 'Sources' },
  { id: 'tools', icon: '🛠️', label: 'Tools' },
]

function PanelSkeleton({ label }: { label: string }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 8, padding: 16, minHeight: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-secondary)', fontSize: 13,
      border: '1px solid var(--border)',
    }}>
      <span>Loading {label}...</span>
    </div>
  )
}

function PanelWrapper({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <div id={id} style={{ scrollMarginTop: 70 }}>
      {children}
    </div>
  )
}

function App() {
  const [activeSector, setActiveSector] = useState<Sector>('all')
  const [activePanel, setActivePanel] = useState<string>('brief')
  const [language, setLanguage] = useState<'en' | 'hi'>('en')
  const { sidebarOpen, toggleSidebar, alertCount } = useDashboardStore()

  const scrollTo = (id: string) => {
    setActivePanel(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="app">
      {/* ── Top Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <span className="brand-icon">🇮🇳</span>
          <div>
            <h1>MSME Vyapaar Monitor</h1>
            <p className="brand-tagline">व्यापार मॉनिटर — Real-time Intelligence</p>
          </div>
        </div>
        <div className="header-right">
          <div className="sector-filters">
            {SECTOR_FILTERS.map(sf => (
              <button
                key={sf.value}
                className={`sector-chip ${activeSector === sf.value ? 'active' : ''}`}
                onClick={() => setActiveSector(sf.value)}
              >
                {sf.label}
              </button>
            ))}
          </div>
          <LanguageToggle language={language} onChange={setLanguage} />
          <div className="header-status">
            {alertCount > 0 && (
              <span className="alert-badge">{alertCount}</span>
            )}
            <span className="status-dot live" />
            <span className="status-text">LIVE</span>
          </div>
        </div>
      </header>

      {/* ── Market Ticker ── */}
      <MarketTicker />

      <div className="app-body">
        {/* ── Sidebar Navigation ── */}
        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activePanel === item.id ? 'active' : ''}`}
              onClick={() => scrollTo(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* ── Main Content Grid ── */}
        <main className="app-main">
          {/* AI Brief — full width */}
          <PanelWrapper id="brief">
            <AIBriefPanel />
          </PanelWrapper>

          {/* District Opportunity Score — full width, the flagship feature */}
          <PanelWrapper id="district">
            <Suspense fallback={<PanelSkeleton label="District Opportunity Score" />}>
              <DistrictOpportunityPanel />
            </Suspense>
          </PanelWrapper>

          {/* Map + Tender Kanban — side by side */}
          <div className="panel-row-2">
            <PanelWrapper id="map">
              <IndiaMapPanel />
            </PanelWrapper>
            <PanelWrapper id="tenders">
              <Suspense fallback={<PanelSkeleton label="Tender Kanban" />}>
                <TenderKanbanPanel />
              </Suspense>
            </PanelWrapper>
          </div>

          {/* Weather + Dam Water — civic data row 1 */}
          <div className="panel-row-2">
            <PanelWrapper id="weather">
              <Suspense fallback={<PanelSkeleton label="Weather & Monsoon" />}>
                <WeatherRainfallPanel />
              </Suspense>
            </PanelWrapper>
            <PanelWrapper id="dams">
              <Suspense fallback={<PanelSkeleton label="Dam Levels" />}>
                <DamWaterPanel />
              </Suspense>
            </PanelWrapper>
          </div>

          {/* Power Grid + Transport Infra — civic data row 2 */}
          <div className="panel-row-2">
            <PanelWrapper id="power">
              <Suspense fallback={<PanelSkeleton label="Power Grid Status" />}>
                <PowerGridPanel />
              </Suspense>
            </PanelWrapper>
            <PanelWrapper id="transport">
              <Suspense fallback={<PanelSkeleton label="Transport & Infra" />}>
                <TransportInfraPanel />
              </Suspense>
            </PanelWrapper>
          </div>

          {/* Market + Scheme Finder */}
          <div className="panel-row-2">
            <PanelWrapper id="market">
              <Suspense fallback={<PanelSkeleton label="Market Pulse" />}>
                <MarketPulsePanel />
              </Suspense>
            </PanelWrapper>
            <PanelWrapper id="schemes">
              <Suspense fallback={<PanelSkeleton label="Scheme Finder" />}>
                <SchemeFinderPanel />
              </Suspense>
            </PanelWrapper>
          </div>

          {/* Policy Tracker + Funding Radar */}
          <div className="panel-row-2">
            <PanelWrapper id="policy">
              <Suspense fallback={<PanelSkeleton label="Policy Tracker" />}>
                <PolicyTrackerPanel />
              </Suspense>
            </PanelWrapper>
            <PanelWrapper id="funding">
              <Suspense fallback={<PanelSkeleton label="Funding Radar" />}>
                <FundingRadarPanel />
              </Suspense>
            </PanelWrapper>
          </div>

          {/* News Stream + Compliance Calendar */}
          <div className="panel-row-2">
            <PanelWrapper id="news">
              <Suspense fallback={<PanelSkeleton label="News Stream" />}>
                <NewsStreamPanel />
              </Suspense>
            </PanelWrapper>
            <PanelWrapper id="compliance">
              <Suspense fallback={<PanelSkeleton label="Compliance Calendar" />}>
                <ComplianceCalendarPanel />
              </Suspense>
            </PanelWrapper>
          </div>

          {/* Alert Center — full width */}
          <PanelWrapper id="alerts">
            <Suspense fallback={<PanelSkeleton label="Alert Center" />}>
              <AlertCenter />
            </Suspense>
          </PanelWrapper>

          {/* Data Sources transparency — full width */}
          <PanelWrapper id="sources">
            <Suspense fallback={<PanelSkeleton label="Data Sources" />}>
              <DataSourcesPanel />
            </Suspense>
          </PanelWrapper>

          {/* Tools & Tactics — full width */}
          <PanelWrapper id="tools">
            <Suspense fallback={<PanelSkeleton label="Tools & Tactics" />}>
              <ToolsTacticsPanel />
            </Suspense>
          </PanelWrapper>
        </main>
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="bottom-tab-bar">
        {NAV_ITEMS.slice(0, 5).map(item => (
          <button
            key={item.id}
            className={`tab-item ${activePanel === item.id ? 'active' : ''}`}
            onClick={() => scrollTo(item.id)}
          >
            <span>{item.icon}</span>
            <span className="tab-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
