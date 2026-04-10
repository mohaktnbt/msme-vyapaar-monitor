// ============================================================
// MSME Vyapaar Monitor — State-wise Electricity Tariff Edge Function
// ============================================================

import type { ApiResponse } from '../src/types/index.js'
import {
  corsHeaders,
  withCors,
  errorResponse,
  getRedisClient,
  cacheGet,
  cacheSet,
  circuitBreaker,
} from './_utils.js'

export const config = { runtime: 'edge' }

const CIRCUIT_KEY = 'electricity-tariff'
const CACHE_TTL = 604_800 // 7 days

interface ElectricityTariff {
  state: string
  discom: string
  ltIndustrial: { perUnit: number; fixedChargePerKVA: number }
  htIndustrial: { perUnit: number; demandChargePerKVA: number }
  timeOfDay: { peak: number; offPeak: number; normal: number }
  openAccessAllowed: boolean
  effectiveFrom: string
  nextRevision?: string
  rankCheapest?: number
}

function tariff(
  state: string,
  discom: string,
  ltUnit: number,
  ltFixed: number,
  htUnit: number,
  htDemand: number,
  peak: number,
  offPeak: number,
  normal: number,
  openAccess: boolean,
  effectiveFrom: string,
  nextRevision?: string,
): ElectricityTariff {
  return {
    state,
    discom,
    ltIndustrial: { perUnit: ltUnit, fixedChargePerKVA: ltFixed },
    htIndustrial: { perUnit: htUnit, demandChargePerKVA: htDemand },
    timeOfDay: { peak, offPeak, normal },
    openAccessAllowed: openAccess,
    effectiveFrom,
    nextRevision,
  }
}

const BASE_TARIFFS: ElectricityTariff[] = [
  tariff('Chhattisgarh', 'CSPDCL', 5.95, 120, 5.55, 320, 6.55, 4.75, 5.55, true, '2025-04-01', '2026-04-01'),
  tariff('Odisha', 'TPCODL/TPNODL', 6.25, 140, 5.85, 340, 6.85, 4.95, 5.85, true, '2025-04-01', '2026-04-01'),
  tariff('Jharkhand', 'JBVNL', 6.45, 150, 6.05, 350, 7.05, 5.15, 6.05, true, '2025-04-01', '2026-04-01'),
  tariff('Uttarakhand', 'UPCL', 6.55, 155, 6.15, 360, 7.15, 5.25, 6.15, true, '2025-04-01', '2026-04-01'),
  tariff('West Bengal', 'WBSEDCL', 6.85, 165, 6.45, 370, 7.45, 5.55, 6.45, true, '2025-04-01', '2026-04-01'),
  tariff('Madhya Pradesh', 'MPPKVVCL', 6.95, 170, 6.55, 380, 7.55, 5.65, 6.55, true, '2025-04-01', '2026-04-01'),
  tariff('Gujarat', 'MGVCL/UGVCL/DGVCL/PGVCL', 7.05, 175, 6.65, 385, 7.65, 5.75, 6.65, true, '2025-04-01', '2026-04-01'),
  tariff('Telangana', 'TSSPDCL/TSNPDCL', 7.15, 180, 6.75, 390, 7.75, 5.85, 6.75, true, '2025-04-01', '2026-04-01'),
  tariff('Andhra Pradesh', 'APSPDCL/APEPDCL', 7.25, 185, 6.85, 395, 7.85, 5.95, 6.85, true, '2025-04-01', '2026-04-01'),
  tariff('Haryana', 'DHBVN/UHBVN', 7.35, 190, 6.95, 400, 7.95, 6.05, 6.95, true, '2025-04-01', '2026-04-01'),
  tariff('Bihar', 'NBPDCL/SBPDCL', 7.45, 195, 7.05, 410, 8.05, 6.15, 7.05, true, '2025-04-01', '2026-04-01'),
  tariff('Punjab', 'PSPCL', 7.55, 200, 7.15, 415, 8.15, 6.25, 7.15, true, '2025-04-01', '2026-04-01'),
  tariff('Uttar Pradesh', 'UPPCL', 7.65, 205, 7.25, 420, 8.25, 6.35, 7.25, true, '2025-04-01', '2026-04-01'),
  tariff('Karnataka', 'BESCOM/MESCOM/HESCOM/GESCOM', 7.75, 210, 7.35, 430, 8.35, 6.45, 7.35, true, '2025-04-01', '2026-04-01'),
  tariff('Tamil Nadu', 'TANGEDCO', 7.95, 220, 7.55, 440, 8.55, 6.65, 7.55, true, '2025-04-01', '2026-04-01'),
  tariff('Kerala', 'KSEB', 8.15, 230, 7.75, 450, 8.75, 6.85, 7.75, true, '2025-04-01', '2026-04-01'),
  tariff('Assam', 'APDCL', 8.25, 235, 7.85, 460, 8.85, 6.95, 7.85, true, '2025-04-01', '2026-04-01'),
  tariff('Himachal Pradesh', 'HPSEBL', 5.85, 115, 5.45, 310, 6.45, 4.65, 5.45, true, '2025-04-01', '2026-04-01'),
  tariff('Jammu & Kashmir', 'JPDCL/KPDCL', 6.15, 135, 5.75, 330, 6.75, 4.85, 5.75, false, '2025-04-01', '2026-04-01'),
  tariff('Goa', 'Goa Electricity Dept', 6.05, 130, 5.65, 325, 6.65, 4.85, 5.65, true, '2025-04-01', '2026-04-01'),
  tariff('Delhi', 'BRPL/BYPL/TPDDL', 8.35, 245, 7.95, 470, 8.95, 7.05, 7.95, true, '2025-04-01', '2026-04-01'),
  tariff('Rajasthan', 'JVVNL/AVVNL/JdVVNL', 8.75, 260, 8.35, 490, 9.35, 7.45, 8.35, true, '2025-04-01', '2026-04-01'),
  tariff('Maharashtra', 'MSEDCL/Tata Power/Adani', 8.95, 270, 8.55, 500, 9.55, 7.65, 8.55, true, '2025-04-01', '2026-04-01'),
  tariff('Sikkim', 'Energy & Power Dept', 6.65, 160, 6.25, 365, 7.25, 5.35, 6.25, false, '2025-04-01', '2026-04-01'),
  tariff('Manipur', 'MSPDCL', 7.15, 180, 6.75, 390, 7.75, 5.85, 6.75, false, '2025-04-01', '2026-04-01'),
  tariff('Meghalaya', 'MePDCL', 7.25, 185, 6.85, 395, 7.85, 5.95, 6.85, false, '2025-04-01', '2026-04-01'),
  tariff('Tripura', 'TSECL', 6.55, 155, 6.15, 360, 7.15, 5.25, 6.15, false, '2025-04-01', '2026-04-01'),
  tariff('Nagaland', 'Dept of Power Nagaland', 7.35, 190, 6.95, 400, 7.95, 6.05, 6.95, false, '2025-04-01', '2026-04-01'),
  tariff('Arunachal Pradesh', 'Dept of Power AP', 7.45, 195, 7.05, 410, 8.05, 6.15, 7.05, false, '2025-04-01', '2026-04-01'),
  tariff('Mizoram', 'P&E Dept Mizoram', 7.55, 200, 7.15, 415, 8.15, 6.25, 7.15, false, '2025-04-01', '2026-04-01'),
  tariff('Puducherry', 'PED Puducherry', 7.85, 215, 7.45, 435, 8.45, 6.55, 7.45, true, '2025-04-01', '2026-04-01'),
  tariff('Chandigarh', 'CED Chandigarh', 6.45, 150, 6.05, 350, 7.05, 5.15, 6.05, true, '2025-04-01', '2026-04-01'),
]

function withRanks(list: ElectricityTariff[]): ElectricityTariff[] {
  const sorted = [...list].sort((a, b) => a.htIndustrial.perUnit - b.htIndustrial.perUnit)
  const rankMap = new Map<string, number>()
  sorted.forEach((t, i) => rankMap.set(t.state, i + 1))
  return list.map(t => ({ ...t, rankCheapest: rankMap.get(t.state) }))
}

const FALLBACK_TARIFFS = withRanks(BASE_TARIFFS)

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const stateFilter = url.searchParams.get('state')

    const cacheKey = `electricity-tariff:${stateFilter?.toLowerCase() || 'all'}`
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'State ERC filings / CEA',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    let filtered = FALLBACK_TARIFFS
    if (stateFilter) {
      filtered = FALLBACK_TARIFFS.filter(t => t.state.toLowerCase() === stateFilter.toLowerCase())
      if (filtered.length === 0) filtered = FALLBACK_TARIFFS
    }

    if (circuitBreaker.isOpen(CIRCUIT_KEY)) {
      const response: ApiResponse<ElectricityTariff[]> = {
        data: filtered,
        cached: false,
        source: 'mock-fallback',
        fetchedAt: new Date().toISOString(),
        error: 'Electricity tariff circuit breaker open',
      }
      return withCors(JSON.stringify(response))
    }

    let usedFallback = true
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8_000)
      const probe = await fetch('https://cea.nic.in/', {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)' },
      })
      clearTimeout(timeoutId)
      if (probe.ok) {
        circuitBreaker.recordSuccess(CIRCUIT_KEY)
      } else {
        circuitBreaker.recordFailure(CIRCUIT_KEY)
      }
    } catch (err) {
      console.error('electricity-tariff probe failed', err)
      circuitBreaker.recordFailure(CIRCUIT_KEY)
    }

    await cacheSet(redis, cacheKey, filtered, CACHE_TTL)

    const response: ApiResponse<ElectricityTariff[]> = {
      data: filtered,
      cached: false,
      source: usedFallback ? 'mock-fallback' : 'State ERC filings / CEA',
      fetchedAt: new Date().toISOString(),
    }
    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
