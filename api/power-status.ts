// ============================================================
// MSME Vyapaar Monitor — Power Grid Status Edge Function
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

const CIRCUIT_KEY = 'power-status'
const CACHE_TTL = 3600 // 1 hour

interface PowerGridSnapshot {
  nationalDemand: { currentMW: number; peakMW: number; frequency: number }
  regions: {
    name: 'NR' | 'WR' | 'SR' | 'ER' | 'NER'
    demandMW: number
    supplyMW: number
    shortageMW: number
    frequency: number
  }[]
  coalStock: {
    plantName: string
    state: string
    daysRemaining: number
    status: 'normal' | 'critical' | 'super-critical'
  }[]
  renewables: { solarGW: number; windGW: number; percentOfGrid: number }
  updatedAt: string
  msmeAlerts: { severity: string; region?: string; message: string }[]
}

function buildFallback(): PowerGridSnapshot {
  const regions: PowerGridSnapshot['regions'] = [
    { name: 'NR', demandMW: 78_500, supplyMW: 77_200, shortageMW: 1_300, frequency: 49.94 },
    { name: 'WR', demandMW: 82_300, supplyMW: 82_150, shortageMW: 150, frequency: 50.02 },
    { name: 'SR', demandMW: 64_800, supplyMW: 64_100, shortageMW: 700, frequency: 49.97 },
    { name: 'ER', demandMW: 31_200, supplyMW: 31_200, shortageMW: 0, frequency: 50.01 },
    { name: 'NER', demandMW: 3_450, supplyMW: 3_420, shortageMW: 30, frequency: 49.98 },
  ]
  const totalDemand = regions.reduce((s, r) => s + r.demandMW, 0)

  const coalStock: PowerGridSnapshot['coalStock'] = [
    { plantName: 'NTPC Vindhyachal', state: 'Madhya Pradesh', daysRemaining: 14, status: 'normal' },
    { plantName: 'NTPC Korba', state: 'Chhattisgarh', daysRemaining: 22, status: 'normal' },
    { plantName: 'NTPC Talcher', state: 'Odisha', daysRemaining: 18, status: 'normal' },
    { plantName: 'Mundra UMPP', state: 'Gujarat', daysRemaining: 5, status: 'critical' },
    { plantName: 'Sasan UMPP', state: 'Madhya Pradesh', daysRemaining: 12, status: 'normal' },
    { plantName: 'Tiroda TPS', state: 'Maharashtra', daysRemaining: 3, status: 'super-critical' },
    { plantName: 'Kudgi TPS', state: 'Karnataka', daysRemaining: 9, status: 'normal' },
    { plantName: 'Tuticorin TPS', state: 'Tamil Nadu', daysRemaining: 4, status: 'critical' },
    { plantName: 'Farakka STPS', state: 'West Bengal', daysRemaining: 16, status: 'normal' },
    { plantName: 'Kahalgaon STPS', state: 'Bihar', daysRemaining: 11, status: 'normal' },
  ]

  const renewables = { solarGW: 82.5, windGW: 46.2, percentOfGrid: 23 }

  const msmeAlerts: PowerGridSnapshot['msmeAlerts'] = []
  for (const r of regions) {
    if (r.shortageMW > 1000) {
      msmeAlerts.push({
        severity: 'high',
        region: r.name,
        message: `${r.name} region facing ${r.shortageMW} MW shortage — load-shedding likely for LT industrial consumers`,
      })
    }
  }
  const criticalCoal = coalStock.filter(p => p.status !== 'normal')
  if (criticalCoal.length > 0) {
    msmeAlerts.push({
      severity: 'medium',
      message: `${criticalCoal.length} thermal plants on critical coal stock — expect regional outages in next 1-2 weeks`,
    })
  }

  return {
    nationalDemand: { currentMW: totalDemand, peakMW: Math.round(totalDemand * 1.05), frequency: 49.98 },
    regions,
    coalStock,
    renewables,
    updatedAt: new Date().toISOString(),
    msmeAlerts,
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const cacheKey = 'power-status:snapshot'
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'POSOCO / Grid India',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    if (circuitBreaker.isOpen(CIRCUIT_KEY)) {
      const data = buildFallback()
      const response: ApiResponse<PowerGridSnapshot> = {
        data,
        cached: false,
        source: 'mock-fallback',
        fetchedAt: new Date().toISOString(),
        error: 'Power status circuit breaker open',
      }
      return withCors(JSON.stringify(response))
    }

    let usedFallback = true
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8_000)
      const probe = await fetch('https://posoco.in/', {
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
      console.error('power-status probe failed', err)
      circuitBreaker.recordFailure(CIRCUIT_KEY)
    }

    const data = buildFallback()
    await cacheSet(redis, cacheKey, data, CACHE_TTL)

    const response: ApiResponse<PowerGridSnapshot> = {
      data,
      cached: false,
      source: usedFallback ? 'mock-fallback' : 'POSOCO / Grid India',
      fetchedAt: new Date().toISOString(),
    }
    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
