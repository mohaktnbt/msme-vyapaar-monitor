// ============================================================
// Government Data Service
// Provides access to schemes, gazette, GST, DGFT, and Udyam data
// ============================================================

import { api } from './api.js'
import type { SchemeInfo, PolicyUpdate } from '../types/index.js'

export interface SchemeFilters {
  sector?: string
  state?: string
  category?: string
}

export interface UdyamStats {
  totalRegistered: number
  micro: number
  small: number
  medium: number
  manufacturing: number
  services: number
  state?: string
  asOf: string
}

/**
 * Fetch government schemes with optional filters
 */
export async function getSchemes(filters?: SchemeFilters): Promise<SchemeInfo[]> {
  const res = await api.getSchemes({
    sector: filters?.sector,
    category: filters?.category,
  })
  let schemes = res.data

  // Client-side state filter (API may not support it natively)
  if (filters?.state) {
    schemes = schemes.filter(
      (s) =>
        !s.eligibility.states ||
        s.eligibility.states.length === 0 ||
        s.eligibility.states.includes(filters.state!)
    )
  }

  return schemes
}

/**
 * Fetch gazette notifications since a given date
 */
export async function getGazetteNotifications(since?: string): Promise<PolicyUpdate[]> {
  const res = await api.getDataGov('gazette-notifications')
  const items = (res.data as PolicyUpdate[]) ?? []

  if (since) {
    const sinceDate = new Date(since).getTime()
    return items.filter((item) => new Date(item.publishedAt).getTime() >= sinceDate)
  }

  return items
}

/**
 * Fetch latest GST-related updates
 */
export async function getGSTUpdates(): Promise<PolicyUpdate[]> {
  const res = await api.getDataGov('gst-updates')
  return (res.data as PolicyUpdate[]) ?? []
}

/**
 * Fetch DGFT (Directorate General of Foreign Trade) notices
 */
export async function getDGFTNotices(): Promise<PolicyUpdate[]> {
  const res = await api.getDataGov('dgft-notices')
  return (res.data as PolicyUpdate[]) ?? []
}

/**
 * Fetch Udyam registration statistics, optionally filtered by state
 */
export async function getUdyamStats(state?: string): Promise<UdyamStats> {
  const dataset = state ? `udyam-stats-${state.toLowerCase().replace(/\s+/g, '-')}` : 'udyam-stats'
  const res = await api.getDataGov(dataset)
  return res.data as UdyamStats
}
