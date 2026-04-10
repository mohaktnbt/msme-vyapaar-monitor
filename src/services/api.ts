import type {
  AIBrief,
  NewsItem,
  TenderItem,
  MarketPrice,
  SchemeInfo,
  ApiResponse,
  PaginatedResponse,
} from '../types/index.js'

const BASE = '/api'

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return q ? `?${q}` : ''
}

export const api = {
  // ── News ──────────────────────────────────────────────────────────────────
  getNewsAggregated: (params?: { category?: string; language?: string }) =>
    apiFetch<ApiResponse<PaginatedResponse<NewsItem>>>(
      `news-aggregator${buildQuery(params ?? {})}`
    ),

  getPIBFeed: () =>
    apiFetch<ApiResponse<NewsItem[]>>('pib-feed'),

  // ── Tenders ───────────────────────────────────────────────────────────────
  getTenderAggregator: (params?: { keyword?: string; state?: string; page?: number }) =>
    apiFetch<ApiResponse<PaginatedResponse<TenderItem>>>(
      `tender-aggregator${buildQuery(params ?? {})}`
    ),

  getGemTenders: () =>
    apiFetch<ApiResponse<TenderItem[]>>('gem-tenders'),

  getCpppTenders: (state?: string) =>
    apiFetch<ApiResponse<TenderItem[]>>(`cppp-tenders${buildQuery({ state: state ?? '' })}`),

  // ── Market ────────────────────────────────────────────────────────────────
  getCommodityPrices: () =>
    apiFetch<ApiResponse<MarketPrice[]>>('commodity-prices'),

  getForex: () =>
    apiFetch<ApiResponse<MarketPrice[]>>('forex'),

  getStockIndices: () =>
    apiFetch<ApiResponse<MarketPrice[]>>('stock-indices'),

  // ── AI ────────────────────────────────────────────────────────────────────
  getAIBrief: () =>
    apiFetch<ApiResponse<AIBrief>>('ai-brief'),

  classifyText: (text: string) =>
    apiFetch<ApiResponse<{ category: string; severity: string; sectors: string[] }>>(
      'classify',
      {
        method: 'POST',
        body: JSON.stringify({ text }),
      }
    ),

  // ── Schemes ───────────────────────────────────────────────────────────────
  getSchemes: (params?: { sector?: string; category?: string }) =>
    apiFetch<ApiResponse<SchemeInfo[]>>(
      `schemes${buildQuery(params ?? {})}`
    ),

  matchSchemes: (params: {
    sector?: string
    state?: string
    turnover?: number
    category?: string
  }) =>
    apiFetch<ApiResponse<(SchemeInfo & { matchScore: number })[]>>(
      `scheme-match${buildQuery(params)}`
    ),

  // ── Data.gov ──────────────────────────────────────────────────────────────
  getDataGov: (dataset: string) =>
    apiFetch<ApiResponse<unknown>>(`data-gov${buildQuery({ dataset })}`),

  // ── Weather ───────────────────────────────────────────────────────────────
  fetchWeather: (state?: string, district?: string) =>
    apiFetch<ApiResponse<unknown>>(
      `weather${buildQuery({ state: state ?? '', district: district ?? '' })}`
    ),

  // ── Utilities: Dam / Reservoir levels ─────────────────────────────────────
  fetchDamLevels: (state?: string) =>
    apiFetch<ApiResponse<unknown>>(`dam-levels${buildQuery({ state: state ?? '' })}`),

  // ── Utilities: Power grid ─────────────────────────────────────────────────
  fetchPowerStatus: () =>
    apiFetch<ApiResponse<unknown>>('power-status'),

  // ── District budget ───────────────────────────────────────────────────────
  fetchDistrictBudget: (state: string, district: string) =>
    apiFetch<ApiResponse<unknown>>(
      `district-budget${buildQuery({ state, district })}`
    ),

  // ── Transport projects ────────────────────────────────────────────────────
  fetchTransportProjects: (filters?: {
    state?: string
    type?: string
    status?: string
    minValueCr?: number
  }) =>
    apiFetch<ApiResponse<unknown>>(
      `transport-projects${buildQuery(filters ?? {})}`
    ),

  // ── Hyperlocal news ───────────────────────────────────────────────────────
  fetchHyperlocalNews: (state: string, district: string) =>
    apiFetch<ApiResponse<unknown>>(
      `hyperlocal-news${buildQuery({ state, district })}`
    ),

  // ── Electricity tariff ────────────────────────────────────────────────────
  fetchElectricityTariff: (state?: string) =>
    apiFetch<ApiResponse<unknown>>(
      `electricity-tariff${buildQuery({ state: state ?? '' })}`
    ),
}
