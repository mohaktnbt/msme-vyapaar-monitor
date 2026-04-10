// ============================================================
// Market Data Service
// Aggregates commodity, forex, and equity index data
// ============================================================

import { api } from './api.js'
import type { MarketPrice } from '../types/index.js'

export interface AllMarketData {
  commodities: MarketPrice[]
  forex: MarketPrice[]
  indices: MarketPrice[]
  fetchedAt: string
}

/**
 * Fetch commodity prices (agri, metals, energy)
 */
export async function getCommodityPrices(): Promise<MarketPrice[]> {
  const res = await api.getCommodityPrices()
  return res.data
}

/**
 * Fetch forex exchange rates
 */
export async function getForexRates(): Promise<MarketPrice[]> {
  const res = await api.getForex()
  return res.data
}

/**
 * Fetch equity/stock indices (Sensex, Nifty, etc.)
 */
export async function getIndices(): Promise<MarketPrice[]> {
  const res = await api.getStockIndices()
  return res.data
}

/**
 * Fetch all market data in parallel and return a combined view
 */
export async function getAllMarketData(): Promise<AllMarketData> {
  const [commoditiesResult, forexResult, indicesResult] = await Promise.allSettled([
    getCommodityPrices(),
    getForexRates(),
    getIndices(),
  ])

  return {
    commodities: commoditiesResult.status === 'fulfilled' ? commoditiesResult.value : [],
    forex: forexResult.status === 'fulfilled' ? forexResult.value : [],
    indices: indicesResult.status === 'fulfilled' ? indicesResult.value : [],
    fetchedAt: new Date().toISOString(),
  }
}
