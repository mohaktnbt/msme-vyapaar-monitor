// ============================================================
// Utilities Service
// Unified access layer for dams, power grid, transport projects,
// and electricity tariffs.
// ============================================================

import type { ApiResponse } from '../types/index.js'

// ── Types ──────────────────────────────────────────────────────

export interface ReservoirStatus {
  id: string
  name: string
  state: string
  basin: string
  capacityBCM: number
  currentStorage: number
  fillPercent: number
  lastYearPercent: number
  tenYearAvgPercent: number
  trend: 'rising' | 'stable' | 'falling'
  status: 'normal' | 'below-normal' | 'deficient' | 'critical'
  updatedAt: string
  msmeImpact?: string
}

export interface DamLevelsResponse {
  reservoirs: ReservoirStatus[]
  nationalAverage: number
  criticalCount: number
  updatedAt: string
}

export interface PowerRegion {
  name: 'NR' | 'WR' | 'SR' | 'ER' | 'NER'
  demandMW: number
  supplyMW: number
  shortageMW: number
  frequency: number
}

export interface CoalPlantStatus {
  plantName: string
  state: string
  daysRemaining: number
  status: 'normal' | 'critical' | 'super-critical'
}

export interface PowerGridSnapshot {
  nationalDemand: { currentMW: number; peakMW: number; frequency: number }
  regions: PowerRegion[]
  coalStock: CoalPlantStatus[]
  renewables: { solarGW: number; windGW: number; percentOfGrid: number }
  updatedAt: string
  msmeAlerts: { severity: string; region?: string; message: string }[]
}

export interface TransportProject {
  id: string
  name: string
  type: 'highway' | 'expressway' | 'rail' | 'metro' | 'port' | 'airport' | 'logistics-park'
  state: string
  district?: string
  valueCr: number
  status: 'announced' | 'approved' | 'tendering' | 'under-construction' | 'completed'
  completionYear?: number
  contractor?: string
  msmeBenefit?: string
}

export interface TransportFilters {
  state?: string
  type?: TransportProject['type']
  status?: TransportProject['status']
  minValueCr?: number
}

export interface ElectricityTariff {
  state: string
  discom: string
  category: 'LT-industrial' | 'HT-industrial' | 'commercial' | 'domestic'
  fixedChargeRsPerKW: number
  energyChargeRsPerKWh: number
  effectiveDate: string
  msmeRebatePct?: number
}

// ── Helpers ────────────────────────────────────────────────────

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

async function apiFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`/api/${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Utilities API error (${endpoint}): ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Fetch reservoir/dam levels, optionally filtered by state.
 */
export async function getDamLevels(state?: string): Promise<DamLevelsResponse> {
  const res = await apiFetch<ApiResponse<DamLevelsResponse>>(
    `dam-levels${buildQuery({ state })}`
  )
  return res.data
}

/**
 * Fetch national power grid snapshot (demand, supply, coal stock).
 */
export async function getPowerStatus(): Promise<PowerGridSnapshot> {
  const res = await apiFetch<ApiResponse<PowerGridSnapshot>>('power-status')
  return res.data
}

/**
 * Fetch transport infrastructure projects with optional filters.
 */
export async function getTransportProjects(
  filters?: TransportFilters
): Promise<TransportProject[]> {
  const query = buildQuery({
    state: filters?.state,
    type: filters?.type,
    status: filters?.status,
    minValueCr: filters?.minValueCr,
  })
  const res = await apiFetch<ApiResponse<TransportProject[]>>(
    `transport-projects${query}`
  )
  return res.data
}

/**
 * Fetch electricity tariff slabs, optionally filtered by state.
 */
export async function getElectricityTariffs(state?: string): Promise<ElectricityTariff[]> {
  const res = await apiFetch<ApiResponse<ElectricityTariff[]>>(
    `electricity-tariff${buildQuery({ state })}`
  )
  return res.data
}
