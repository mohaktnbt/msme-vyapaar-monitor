// ============================================================
// MSME Vyapaar Monitor — Weather & Rainfall Intelligence Edge Function
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

const CIRCUIT_KEY = 'weather'
const CACHE_TTL = 1800 // 30 minutes

interface WeatherReport {
  location: { state: string; district?: string; lat: number; lng: number }
  current: { tempC: number; precipMm: number; condition: string; updatedAt: string }
  forecast: { date: string; maxC: number; minC: number; precipMm: number; condition: string }[]
  msmeAlert?: { severity: 'critical' | 'high' | 'medium' | 'low'; message: string; messageHi: string }
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number
    precipitation?: number
    weather_code?: number
    time?: string
  }
  daily?: {
    time?: string[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_sum?: number[]
    weather_code?: number[]
  }
}

// WMO weather codes mapping (subset)
function wmoCodeToCondition(code: number): string {
  if (code === 0) return 'Clear sky'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 48) return 'Foggy'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code <= 86) return 'Snow showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Unknown'
}

// Well-known Indian city coordinates
const CITY_COORDS: Record<string, { state: string; district: string; lat: number; lng: number }> = {
  mumbai: { state: 'Maharashtra', district: 'Mumbai', lat: 19.076, lng: 72.8777 },
  delhi: { state: 'Delhi', district: 'New Delhi', lat: 28.6139, lng: 77.209 },
  bangalore: { state: 'Karnataka', district: 'Bengaluru Urban', lat: 12.9716, lng: 77.5946 },
  bengaluru: { state: 'Karnataka', district: 'Bengaluru Urban', lat: 12.9716, lng: 77.5946 },
  chennai: { state: 'Tamil Nadu', district: 'Chennai', lat: 13.0827, lng: 80.2707 },
  kolkata: { state: 'West Bengal', district: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  hyderabad: { state: 'Telangana', district: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  pune: { state: 'Maharashtra', district: 'Pune', lat: 18.5204, lng: 73.8567 },
  ahmedabad: { state: 'Gujarat', district: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
}

function computeAlert(tempC: number, precipMm: number, forecastPrecip: number[]): WeatherReport['msmeAlert'] {
  if (tempC > 45) {
    return {
      severity: 'critical',
      message: 'Extreme heat warning — expect load-shedding, worker safety risks, and refrigeration failures',
      messageHi: 'भीषण गर्मी की चेतावनी — बिजली कटौती, श्रमिक सुरक्षा जोखिम और रेफ्रिजरेशन विफलता की संभावना',
    }
  }
  if (tempC > 42) {
    return {
      severity: 'high',
      message: 'Heat warning — power cuts likely, reduce peak-hour operations',
      messageHi: 'गर्मी की चेतावनी — बिजली कटौती की संभावना, पीक-आवर परिचालन कम करें',
    }
  }
  if (precipMm > 100) {
    return {
      severity: 'critical',
      message: 'Extreme rainfall — flood risk, halt outdoor operations and logistics',
      messageHi: 'अत्यधिक वर्षा — बाढ़ का खतरा, बाहरी परिचालन और लॉजिस्टिक्स रोकें',
    }
  }
  if (precipMm > 50) {
    return {
      severity: 'high',
      message: 'Heavy rain — logistics disruptions expected, secure raw material stocks',
      messageHi: 'भारी बारिश — लॉजिस्टिक्स में व्यवधान की संभावना, कच्चे माल का स्टॉक सुरक्षित करें',
    }
  }
  const maxForecast = Math.max(0, ...forecastPrecip)
  if (maxForecast > 80) {
    return {
      severity: 'medium',
      message: 'Heavy rain forecast in next 7 days — plan inventory and logistics buffers',
      messageHi: 'अगले 7 दिनों में भारी बारिश का पूर्वानुमान — इन्वेंट्री और लॉजिस्टिक्स बफर की योजना बनाएं',
    }
  }
  return undefined
}

function buildFallback(lat: number, lng: number, state: string, district?: string): WeatherReport {
  const now = new Date()
  const month = now.getMonth() // 0-based
  const isMonsoon = month >= 5 && month <= 8 // Jun-Sep
  const isSummer = month >= 2 && month <= 5 // Mar-Jun
  const isWinter = month >= 10 || month <= 1 // Nov-Feb

  const baseTemp = isSummer ? 38 : isWinter ? 20 : 30
  const basePrecip = isMonsoon ? 25 : 2

  const forecast: WeatherReport['forecast'] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getTime() + i * 86_400_000)
    const variance = (i % 3) - 1
    const precip = isMonsoon ? basePrecip + Math.abs(variance) * 15 : basePrecip + Math.abs(variance)
    forecast.push({
      date: date.toISOString().slice(0, 10),
      maxC: baseTemp + variance + 2,
      minC: baseTemp + variance - 8,
      precipMm: Math.round(precip * 10) / 10,
      condition: isMonsoon ? 'Rain showers' : isSummer ? 'Clear sky' : 'Partly cloudy',
    })
  }

  const currentTemp = baseTemp
  const currentPrecip = isMonsoon ? basePrecip : 0

  return {
    location: { state, district, lat, lng },
    current: {
      tempC: currentTemp,
      precipMm: currentPrecip,
      condition: isMonsoon ? 'Rain showers' : isSummer ? 'Clear sky' : 'Partly cloudy',
      updatedAt: now.toISOString(),
    },
    forecast,
    msmeAlert: computeAlert(currentTemp, currentPrecip, forecast.map(f => f.precipMm)),
  }
}

const FALLBACK_CITIES: WeatherReport[] = [
  buildFallback(19.076, 72.8777, 'Maharashtra', 'Mumbai'),
  buildFallback(28.6139, 77.209, 'Delhi', 'New Delhi'),
  buildFallback(12.9716, 77.5946, 'Karnataka', 'Bengaluru Urban'),
  buildFallback(13.0827, 80.2707, 'Tamil Nadu', 'Chennai'),
]

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const stateParam = url.searchParams.get('state') || ''
    const districtParam = url.searchParams.get('district') || ''
    const latParam = url.searchParams.get('lat')
    const lngParam = url.searchParams.get('lng')

    let lat: number | null = latParam ? parseFloat(latParam) : null
    let lng: number | null = lngParam ? parseFloat(lngParam) : null
    let resolvedState = stateParam
    let resolvedDistrict: string | undefined = districtParam || undefined

    if ((lat === null || lng === null) && districtParam) {
      const hit = CITY_COORDS[districtParam.toLowerCase()]
      if (hit) {
        lat = hit.lat
        lng = hit.lng
        resolvedState = resolvedState || hit.state
        resolvedDistrict = resolvedDistrict || hit.district
      }
    }

    const isListRequest = lat === null || lng === null

    const cacheKey = isListRequest
      ? 'weather:fallback-cities'
      : `weather:${lat.toFixed(3)}:${lng.toFixed(3)}`
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'open-meteo.com',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    if (isListRequest) {
      await cacheSet(redis, cacheKey, FALLBACK_CITIES, CACHE_TTL)
      const response: ApiResponse<WeatherReport[]> = {
        data: FALLBACK_CITIES,
        cached: false,
        source: 'mock-fallback',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    if (circuitBreaker.isOpen(CIRCUIT_KEY)) {
      const fb = buildFallback(lat!, lng!, resolvedState || 'Unknown', resolvedDistrict)
      const response: ApiResponse<WeatherReport> = {
        data: fb,
        cached: false,
        source: 'mock-fallback',
        fetchedAt: new Date().toISOString(),
        error: 'Weather circuit breaker open — returning mock data',
      }
      return withCors(JSON.stringify(response))
    }

    const apiUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,precipitation,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
      `&timezone=Asia/Kolkata&forecast_days=7`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)

    let report: WeatherReport | null = null
    let usedFallback = false

    try {
      const res = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MSMEMonitor/1.0)' },
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = (await res.json()) as OpenMeteoResponse
        const current = data.current || {}
        const daily = data.daily || {}
        const times = daily.time || []
        const forecast: WeatherReport['forecast'] = times.map((date, i) => ({
          date,
          maxC: daily.temperature_2m_max?.[i] ?? 0,
          minC: daily.temperature_2m_min?.[i] ?? 0,
          precipMm: daily.precipitation_sum?.[i] ?? 0,
          condition: wmoCodeToCondition(daily.weather_code?.[i] ?? 0),
        }))
        const tempC = current.temperature_2m ?? 0
        const precipMm = current.precipitation ?? 0
        report = {
          location: { state: resolvedState || 'Unknown', district: resolvedDistrict, lat: lat!, lng: lng! },
          current: {
            tempC,
            precipMm,
            condition: wmoCodeToCondition(current.weather_code ?? 0),
            updatedAt: current.time || new Date().toISOString(),
          },
          forecast,
          msmeAlert: computeAlert(tempC, precipMm, forecast.map(f => f.precipMm)),
        }
        circuitBreaker.recordSuccess(CIRCUIT_KEY)
      } else {
        circuitBreaker.recordFailure(CIRCUIT_KEY)
        usedFallback = true
      }
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('weather fetch failed', err)
      circuitBreaker.recordFailure(CIRCUIT_KEY)
      usedFallback = true
    }

    if (!report || usedFallback) {
      report = buildFallback(lat!, lng!, resolvedState || 'Unknown', resolvedDistrict)
    }

    await cacheSet(redis, cacheKey, report, CACHE_TTL)

    const response: ApiResponse<WeatherReport> = {
      data: report,
      cached: false,
      source: usedFallback ? 'mock-fallback' : 'open-meteo.com',
      fetchedAt: new Date().toISOString(),
    }
    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
