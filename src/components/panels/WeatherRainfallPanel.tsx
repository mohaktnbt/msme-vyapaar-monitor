import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { DataFreshness } from '../ui/DataFreshness.js'
import { LoadingSkeleton } from '../ui/LoadingSkeleton.js'
import { ErrorFallback } from '../ui/ErrorFallback.js'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ForecastDay {
  date: string
  dayLabel: string
  emoji: string
  tempMax: number
  tempMin: number
  rainMm: number
  summary: string
}

interface WeatherCurrent {
  city: string
  tempC: number
  feelsLikeC: number
  humidity: number
  windKmh: number
  emoji: string
  condition: string
}

interface WeatherData {
  current: WeatherCurrent
  forecast: ForecastDay[]
  impactAlerts: string[]
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const TOP_CITIES = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Chennai',
  'Kolkata',
  'Hyderabad',
  'Pune',
  'Ahmedabad',
  'Surat',
  'Jaipur',
] as const

type City = (typeof TOP_CITIES)[number]

function buildMumbaiMock(): WeatherData {
  const today = new Date()
  const forecast: ForecastDay[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today.getTime() + i * 86_400_000)
    const rainMm = [85, 120, 45, 15, 5, 60, 95][i] ?? 30
    const emoji = rainMm > 60 ? '⛈️' : rainMm > 20 ? '🌧️' : rainMm > 0 ? '🌦️' : '☁️'
    return {
      date: d.toISOString().slice(0, 10),
      dayLabel: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
      emoji,
      tempMax: 30 - Math.floor(rainMm / 40),
      tempMin: 25 - Math.floor(rainMm / 60),
      rainMm,
      summary: rainMm > 60 ? 'Heavy rain' : rainMm > 20 ? 'Rain' : 'Overcast',
    }
  })
  return {
    current: {
      city: 'Mumbai',
      tempC: 28,
      feelsLikeC: 32,
      humidity: 88,
      windKmh: 22,
      emoji: '🌧️',
      condition: 'Monsoon showers',
    },
    forecast,
    impactAlerts: [
      'Heavy rainfall (120mm) expected tomorrow — logistics & cement curing may be disrupted',
      'High humidity (88%) affecting textile dyeing and food processing units',
      'Waterlogging risk in low-lying industrial estates: Kurla, Bhiwandi, Taloja',
    ],
  }
}

function buildMockFor(city: City): WeatherData {
  const base = buildMumbaiMock()
  return { ...base, current: { ...base.current, city } }
}

// ── Panel ─────────────────────────────────────────────────────────────────────

const WeatherRainfallPanel: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<City>('Mumbai')
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | undefined>()

  const fetchWeather = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(selectedCity)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as WeatherData
      setData(json)
      setLastUpdated(new Date().toISOString())
    } catch {
      setData(buildMockFor(selectedCity))
      setLastUpdated(new Date().toISOString())
    } finally {
      setLoading(false)
    }
  }, [selectedCity])

  useEffect(() => {
    fetchWeather()
  }, [fetchWeather])

  return (
    <section
      style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: 12,
        padding: 16,
        color: '#e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#FF9933' }}>
          🌦️ Weather & Monsoon Watch
        </h2>
        <DataFreshness
          source="Weather"
          lastUpdated={lastUpdated}
          status={loading ? 'loading' : error ? 'error' : 'fresh'}
        />
      </div>

      {loading && !data ? (
        <LoadingSkeleton lines={6} height={14} />
      ) : error && !data ? (
        <ErrorFallback
          message={error}
          onRetry={fetchWeather}
          panelName="Weather & Monsoon"
        />
      ) : data ? (
        <>
          {/* Current conditions */}
          <div
            style={{
              background: '#0a0e1a',
              border: '1px solid #1f2937',
              borderRadius: 10,
              padding: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 52, lineHeight: 1 }}>{data.current.emoji}</span>
              <div>
                <div
                  style={{
                    fontSize: 34,
                    fontWeight: 700,
                    color: '#FF9933',
                    lineHeight: 1,
                  }}
                >
                  {data.current.tempC}°C
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  Feels {data.current.feelsLikeC}° · {data.current.condition}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  Humidity {data.current.humidity}% · Wind {data.current.windKmh} km/h
                </div>
              </div>
            </div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value as City)}
              style={{
                background: '#111827',
                color: '#e5e7eb',
                border: '1px solid #1f2937',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {TOP_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 7-day forecast */}
          <div>
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: 11,
                fontWeight: 700,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              7-Day Forecast
            </h3>
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 4,
              }}
            >
              {data.forecast.map((f) => (
                <div
                  key={f.date}
                  style={{
                    flex: '0 0 auto',
                    minWidth: 90,
                    background: '#0a0e1a',
                    border: '1px solid #1f2937',
                    borderRadius: 8,
                    padding: '8px 10px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                    {f.dayLabel}
                  </div>
                  <div style={{ fontSize: 24, margin: '4px 0' }}>{f.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb' }}>
                    {f.tempMax}° / {f.tempMin}°
                  </div>
                  <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 2 }}>
                    💧 {f.rainMm} mm
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MSME Impact Alerts */}
          {data.impactAlerts.length > 0 && (
            <div
              style={{
                background: 'rgba(255, 153, 51, 0.08)',
                border: '1px solid rgba(255, 153, 51, 0.3)',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#FF9933',
                }}
              >
                ⚠ MSME Impact Alerts
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 12,
                  color: '#e5e7eb',
                  lineHeight: 1.6,
                }}
              >
                {data.impactAlerts.map((alert, i) => (
                  <li key={i}>{alert}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Rainfall chart */}
          <div>
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: 11,
                fontWeight: 700,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              7-Day Cumulative Rainfall (mm)
            </h3>
            <div
              style={{
                background: '#0a0e1a',
                border: '1px solid #1f2937',
                borderRadius: 8,
                padding: 10,
                height: 200,
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.forecast}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    stroke="#374151"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    stroke="#374151"
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#111827',
                      border: '1px solid #1f2937',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#e5e7eb',
                    }}
                    formatter={(v: number) => [`${v} mm`, 'Rainfall']}
                  />
                  <Bar dataKey="rainMm" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}

export default WeatherRainfallPanel
