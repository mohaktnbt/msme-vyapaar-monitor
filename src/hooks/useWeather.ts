// ============================================================
// useWeather — Weather hook with auto-refresh (30 min)
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getWeatherForLocation,
  type WeatherReport,
} from '../services/weather.js'

const REFRESH_INTERVAL = 30 * 60 * 1000 // 30 minutes

interface UseWeatherReturn {
  weather: WeatherReport | WeatherReport[] | null
  loading: boolean
  error: string | null
  refresh: () => void
  changeLocation: (state?: string, district?: string) => void
}

export function useWeather(
  initialState?: string,
  initialDistrict?: string
): UseWeatherReturn {
  const [state, setState] = useState<string | undefined>(initialState)
  const [district, setDistrict] = useState<string | undefined>(initialDistrict)
  const [weather, setWeather] = useState<WeatherReport | WeatherReport[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)

  const fetchWeather = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getWeatherForLocation(state, district)
      if (!isMountedRef.current) return
      setWeather(data)
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to fetch weather')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [state, district])

  const refresh = useCallback(() => {
    fetchWeather()
  }, [fetchWeather])

  const changeLocation = useCallback((nextState?: string, nextDistrict?: string) => {
    setState(nextState)
    setDistrict(nextDistrict)
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchWeather()

    intervalRef.current = setInterval(fetchWeather, REFRESH_INTERVAL)

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchWeather])

  return { weather, loading, error, refresh, changeLocation }
}
