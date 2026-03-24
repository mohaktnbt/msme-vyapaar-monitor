// ============================================================
// MSME Vyapaar Monitor — Core TypeScript Interfaces
// ============================================================

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type Language = 'en' | 'hi' | 'mr' | 'gu' | 'ta' | 'te' | 'kn' | 'bn'
export type ClassifierType = 'keyword' | 'llm'
export type EnterpriseCategory = 'micro' | 'small' | 'medium'

export type Sector =
  | 'manufacturing'
  | 'services'
  | 'trading'
  | 'agriculture'
  | 'it'
  | 'retail'
  | 'export'
  | 'construction'
  | 'healthcare'
  | 'textile'
  | 'pharma'
  | 'defence'
  | 'food'
  | 'chemical'

export type TenderPortal = 'GeM' | 'CPPP' | 'IREPS' | 'State' | 'PSU' | 'Defence'

// ============================================================
// Tender / Procurement
// ============================================================

export interface TenderItem {
  id: string
  title: string
  description?: string
  department: string
  ministry?: string
  value?: number // in INR
  estimatedValueMin?: number
  estimatedValueMax?: number
  openDate: string // ISO 8601
  closeDate: string // ISO 8601
  portal: TenderPortal
  portalUrl: string
  bidNumber?: string
  tenderType?: 'open' | 'limited' | 'single' | 'eoi' | 'rate-contract'
  category: string
  sector?: Sector
  state?: string
  city?: string
  msmeFriendly?: boolean // Rule 149 / MSME preference clause
  fetchedAt: string
}

// ============================================================
// Government Schemes
// ============================================================

export interface SchemeEligibility {
  enterpriseCategories: EnterpriseCategory[]
  sectors: Sector[]
  states?: string[] // null = all India
  minTurnover?: number
  maxTurnover?: number
  socialCategories?: string[] // SC/ST/Women/OBC/General
  gender?: 'any' | 'female' | 'male'
  registrationRequired?: string // e.g. "Udyam Registration"
  otherCriteria?: string
}

export interface SchemeInfo {
  id: string
  name: string
  nameHi?: string // Hindi name
  ministry: string
  department?: string
  description: string
  descriptionHi?: string
  eligibility: SchemeEligibility
  benefits: {
    type: 'loan' | 'grant' | 'subsidy' | 'equity' | 'guarantee' | 'training' | 'certification' | 'market-access'
    description: string
    maxAmount?: number
    subsidyPercent?: number
    interestRate?: number
    loanTenure?: number // months
  }[]
  applicationUrl: string
  documentationUrl?: string
  nodal?: string // nodal agency
  lastUpdated: string
  category: 'finance' | 'technology' | 'marketing' | 'infrastructure' | 'compliance' | 'skill-development' | 'export'
  tags: string[]
  active: boolean
}

// ============================================================
// News & Media
// ============================================================

export interface NewsItem {
  id: string
  title: string
  titleHi?: string
  summary?: string
  content?: string
  source: string
  sourceTier: 1 | 2 | 3 | 4 // 1=national flagship, 2=leading, 3=niche, 4=regional
  url: string
  publishedAt: string
  fetchedAt: string
  category: string
  sector?: Sector[]
  language: Language
  severity?: SeverityLevel
  relevanceToMSME?: number // 0-100 score from LLM
  classifiedBy?: ClassifierType
  classifierConfidence?: number // 0-1
  imageUrl?: string
}

// ============================================================
// Market Data
// ============================================================

export interface MarketPrice {
  id: string
  commodity: string
  commodityHi?: string
  price: number
  previousPrice?: number
  change?: number
  changePercent?: number
  unit: string // e.g. "per quintal", "per kg", "per USD"
  currency: 'INR' | 'USD' | 'EUR' | 'GBP'
  timestamp: string
  source: string
  market?: string // e.g. "Azadpur Mandi, Delhi"
  state?: string
  type: 'commodity' | 'forex' | 'equity-index' | 'metal' | 'energy' | 'agri'
  sparkline?: number[] // last 7 data points for mini chart
}

// ============================================================
// Funding & Finance
// ============================================================

export interface FundingScheme {
  id: string
  name: string
  provider: string // e.g., "SIDBI", "Nationalised Banks", "NABARD"
  type: 'loan' | 'grant' | 'subsidy' | 'equity' | 'guarantee' | 'refinance'
  subType?: string // e.g. "term loan", "working capital", "equipment finance"
  maxAmount: number // in INR
  minAmount?: number
  interestRate?: number // annual %
  interestRateType?: 'fixed' | 'floating' | 'MCLR-based'
  processingFee?: number // percentage
  tenureMonths?: { min: number; max: number }
  eligibility: SchemeEligibility
  collateralRequired?: boolean
  guaranteeCoverage?: number // % of loan covered by guarantee scheme
  applicationUrl: string
  bankName?: string
  active: boolean
  lastUpdated: string
}

// ============================================================
// Policy & Regulatory
// ============================================================

export interface PolicyUpdate {
  id: string
  title: string
  titleHi?: string
  ministry: string
  department?: string
  type: 'notification' | 'circular' | 'gazette' | 'press-release' | 'order' | 'amendment'
  publishedAt: string
  fetchedAt: string
  summary: string
  summaryHi?: string
  fullText?: string
  documentUrl?: string
  impactLevel: SeverityLevel
  sectors: Sector[]
  tags: string[]
  effectiveDate?: string
  expiryDate?: string
}

// ============================================================
// Infrastructure Projects
// ============================================================

export type InfraType =
  | 'highway'
  | 'expressway'
  | 'port'
  | 'airport'
  | 'rail'
  | 'metro'
  | 'smart-city'
  | 'industrial-corridor'
  | 'msme-cluster'
  | 'logistics-park'
  | 'sez'

export interface InfraProject {
  id: string
  name: string
  type: InfraType
  state: string
  district?: string
  value: number // in INR crores
  status: 'announced' | 'approved' | 'tendering' | 'under-construction' | 'completed'
  contractor?: string
  ministry?: string
  coordinates?: [number, number] // [lng, lat]
  completionDate?: string
  description?: string
  benefitToMSME?: string
  source: string
  fetchedAt: string
}

// ============================================================
// Compliance Calendar
// ============================================================

export interface ComplianceDeadline {
  id: string
  title: string
  titleHi?: string
  authority: 'GST' | 'IncomeTax' | 'MCA' | 'EPFO' | 'ESIC' | 'TDS' | 'Customs' | 'State' | 'Other'
  form?: string // e.g. "GSTR-1", "ITR-6", "MGT-7"
  dueDate: string // ISO 8601
  recurrence?: 'monthly' | 'quarterly' | 'annual' | 'one-time'
  applicableTo: string // e.g. "All GST registered businesses with monthly filing"
  penaltyInfo?: string
  portalUrl?: string
  notes?: string
}

// ============================================================
// AI Intelligence Brief
// ============================================================

export interface AIBriefItem {
  rank: number
  headline: string
  whatHappened: string
  whyItMatters: string
  actionToTake: string
  sector?: Sector[]
  severity: SeverityLevel
  sourceNewsIds?: string[]
}

export interface AIBrief {
  id: string
  date: string // YYYY-MM-DD
  title: string // e.g. "Today's Top 5 for Indian Businesses"
  summary: string // 1-2 sentence overview
  items: AIBriefItem[]
  generatedAt: string
  modelUsed: string
  language: Language
  cachedUntil?: string
}

// ============================================================
// Classification
// ============================================================

export interface ClassifiedItem<T = NewsItem> {
  item: T
  severity: SeverityLevel
  category: string
  sectors: Sector[]
  confidence: number // 0-1
  classifierType: ClassifierType
  relevanceToMSME: number // 0-100
  classifiedAt: string
}

// ============================================================
// Dashboard State (Zustand)
// ============================================================

export interface DashboardFilters {
  sectors: Sector[]
  states: string[]
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d'
  language: Language
  enterpriseCategory?: EnterpriseCategory
  minTenderValue?: number
  maxTenderValue?: number
}

export interface DataFreshnessInfo {
  source: string
  lastUpdated: string
  status: 'fresh' | 'stale' | 'error' | 'loading'
  nextRefresh?: string
}

export interface DashboardState {
  filters: DashboardFilters
  activePanelFocus?: string
  alertCount: number
  freshness: Record<string, DataFreshnessInfo>
  sidebarOpen: boolean
  // Actions
  setFilters: (filters: Partial<DashboardFilters>) => void
  setSectors: (sectors: Sector[]) => void
  setTimeRange: (range: DashboardFilters['timeRange']) => void
  setLanguage: (lang: Language) => void
  setAlertCount: (count: number) => void
  updateFreshness: (source: string, info: Partial<DataFreshnessInfo>) => void
  toggleSidebar: () => void
}

// ============================================================
// API Response Wrappers
// ============================================================

export interface ApiResponse<T> {
  data: T
  cached: boolean
  cachedAt?: string
  source: string
  fetchedAt: string
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ============================================================
// RSS Feed Config
// ============================================================

export interface FeedConfig {
  url: string
  name: string
  category: string
  tier: 1 | 2 | 3 | 4
  language: Language
  sector?: Sector
  active?: boolean
  scrapeMethod?: 'rss' | 'atom' | 'scrape' | 'api'
}

// ============================================================
// Keyword Classifier Config
// ============================================================

export interface KeywordCategory {
  category: string
  severity: SeverityLevel
  keywords: string[]
  keywordsHi?: string[]
  weight: number // multiplier for scoring
}
