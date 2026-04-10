// ============================================================
// Weather Service
// Wraps /api/weather edge function for frontend consumption
// ============================================================

import type { ApiResponse } from '../types/index.js'

const BASE = '/api/weather'

export interface WeatherAlert {
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  messageHi: string
}

export interface WeatherForecast {
  date: string
  maxC: number
  minC: number
  precipMm: number
  condition: string
}

export interface WeatherCurrent {
  tempC: number
  precipMm: number
  condition: string
  updatedAt: string
}

export interface WeatherLocation {
  state: string
  district?: string
  lat: number
  lng: number
}

export interface WeatherReport {
  location: WeatherLocation
  current: WeatherCurrent
  forecast: WeatherForecast[]
  msmeAlert?: WeatherAlert
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

async function weatherFetch<T>(query: string): Promise<T> {
  const res = await fetch(`${BASE}${query}`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

/**
 * Fetch weather report for a specific state/district.
 * If both state and district are omitted, returns fallback list of major cities.
 */
export async function getWeatherForLocation(
  state?: string,
  district?: string
): Promise<WeatherReport | WeatherReport[]> {
  const query = buildQuery({ state, district })
  const res = await weatherFetch<ApiResponse<WeatherReport | WeatherReport[]>>(query)
  return res.data
}

/**
 * Fetch 7-day forecast for specific coordinates.
 */
export async function getForecast(lat: number, lng: number): Promise<WeatherForecast[]> {
  const query = buildQuery({ lat, lng })
  const res = await weatherFetch<ApiResponse<WeatherReport>>(query)
  return res.data.forecast ?? []
}

/**
 * Fetch weather alerts across major Indian cities.
 * Returns only reports that carry an MSME-relevant alert.
 */
export async function getWeatherAlerts(): Promise<WeatherAlert[]> {
  const res = await weatherFetch<ApiResponse<WeatherReport[]>>('')
  const reports = Array.isArray(res.data) ? res.data : [res.data]
  return reports
    .map((r) => r.msmeAlert)
    .filter((a): a is WeatherAlert => Boolean(a))
}
