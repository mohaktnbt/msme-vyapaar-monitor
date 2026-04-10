// ============================================================
// Weather Alerts Utility
// Generates MSME-relevant alerts from a 7-day forecast.
// ============================================================

import type { WeatherForecast } from '../services/weather.js'

export type AlertType = 'heatwave' | 'heavy-rain' | 'cyclone' | 'drought'
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface MSMEAlert {
  type: AlertType
  severity: AlertSeverity
  title: string
  titleHi: string
  message: string
  messageHi: string
  affectedDays: string[] // ISO date strings
  actions: string[]
}

const HEATWAVE_THRESHOLD_C = 42
const HEATWAVE_MIN_DAYS = 3
const HEAVY_RAIN_24H_THRESHOLD_MM = 50
const DROUGHT_WEEK_PRECIP_THRESHOLD_MM = 2

function hasCycloneSignal(forecast: WeatherForecast[]): WeatherForecast[] {
  // Cyclone proxy: any single day with >100mm precipitation coupled with a
  // `condition` string matching storm/cyclone/thunderstorm language.
  return forecast.filter((d) => {
    const condLower = (d.condition || '').toLowerCase()
    const stormy =
      condLower.includes('cyclone') ||
      condLower.includes('storm') ||
      condLower.includes('thunder')
    return stormy && d.precipMm > 100
  })
}

function detectHeatwave(forecast: WeatherForecast[]): WeatherForecast[] {
  const runs: WeatherForecast[][] = []
  let current: WeatherForecast[] = []
  for (const day of forecast) {
    if (day.maxC > HEATWAVE_THRESHOLD_C) {
      current.push(day)
    } else {
      if (current.length >= HEATWAVE_MIN_DAYS) runs.push(current)
      current = []
    }
  }
  if (current.length >= HEATWAVE_MIN_DAYS) runs.push(current)
  return runs.flat()
}

function detectHeavyRain(forecast: WeatherForecast[]): WeatherForecast[] {
  return forecast.filter((d) => d.precipMm > HEAVY_RAIN_24H_THRESHOLD_MM)
}

function detectDrought(forecast: WeatherForecast[]): boolean {
  if (forecast.length < 5) return false
  const totalPrecip = forecast.reduce((s, d) => s + d.precipMm, 0)
  const avgMax = forecast.reduce((s, d) => s + d.maxC, 0) / forecast.length
  return totalPrecip < DROUGHT_WEEK_PRECIP_THRESHOLD_MM && avgMax > 35
}

/**
 * Pick the single highest-priority MSME alert for a 7-day forecast.
 * Priority order: cyclone > heatwave > heavy-rain > drought.
 * Returns null if no alerts apply.
 */
export function generateMSMEAlert(forecast: WeatherForecast[]): MSMEAlert | null {
  if (!forecast || forecast.length === 0) return null

  const cycloneDays = hasCycloneSignal(forecast)
  if (cycloneDays.length > 0) {
    return {
      type: 'cyclone',
      severity: 'critical',
      title: 'Cyclone warning — coastal operations at risk',
      titleHi: 'चक्रवात की चेतावनी — तटीय परिचालन पर जोखिम',
      message:
        'A severe storm system is forecast. Secure warehouses, halt outdoor loading, and notify truckers about potential highway closures along the coast.',
      messageHi:
        'भीषण तूफान प्रणाली का पूर्वानुमान है। गोदामों को सुरक्षित करें, बाहरी लोडिंग बंद करें, और तट के किनारे संभावित राजमार्ग बंद होने के बारे में ट्रक चालकों को सूचित करें।',
      affectedDays: cycloneDays.map((d) => d.date),
      actions: [
        'Secure inventory on elevated pallets',
        'Shift perishables to inland warehouses',
        'Activate logistics backup plans 48h ahead',
      ],
    }
  }

  const heatwaveDays = detectHeatwave(forecast)
  if (heatwaveDays.length > 0) {
    return {
      type: 'heatwave',
      severity: 'high',
      title: 'Heatwave — power cut and worker safety risk',
      titleHi: 'लू — बिजली कटौती और श्रमिक सुरक्षा जोखिम',
      message: `Temperatures above ${HEATWAVE_THRESHOLD_C}°C for ${heatwaveDays.length} day(s). Expect grid stress and load-shedding. Reschedule energy-intensive processes to off-peak hours and ensure worker hydration.`,
      messageHi: `${HEATWAVE_THRESHOLD_C}°C से अधिक तापमान ${heatwaveDays.length} दिन तक। ग्रिड तनाव और लोड-शेडिंग की संभावना। ऊर्जा-गहन प्रक्रियाओं को ऑफ-पीक घंटों में पुनर्निर्धारित करें और श्रमिकों को हाइड्रेशन सुनिश्चित करें।`,
      affectedDays: heatwaveDays.map((d) => d.date),
      actions: [
        'Schedule heavy machinery runs between 22:00-06:00',
        'Top up diesel genset fuel',
        'Issue ORS/water stations on the shop floor',
      ],
    }
  }

  const heavyRainDays = detectHeavyRain(forecast)
  if (heavyRainDays.length > 0) {
    const totalPrecip = heavyRainDays.reduce((s, d) => s + d.precipMm, 0)
    return {
      type: 'heavy-rain',
      severity: totalPrecip > 200 ? 'high' : 'medium',
      title: 'Heavy rain — logistics delays expected',
      titleHi: 'भारी बारिश — लॉजिस्टिक्स में देरी की संभावना',
      message:
        'Rainfall exceeding 50mm in a 24h window is forecast. Expect highway waterlogging and last-mile delivery delays. Build 1-2 day inventory buffer and confirm supplier dispatch schedules.',
      messageHi:
        '24 घंटे की अवधि में 50mm से अधिक वर्षा का पूर्वानुमान है। राजमार्ग जलभराव और अंतिम-मील वितरण में देरी की संभावना। 1-2 दिन का इन्वेंट्री बफर बनाएँ और सप्लायर डिस्पैच शेड्यूल की पुष्टि करें।',
      affectedDays: heavyRainDays.map((d) => d.date),
      actions: [
        'Pre-position critical raw materials',
        'Confirm insurance for in-transit shipments',
        'Cover open storage yards with tarpaulin',
      ],
    }
  }

  if (detectDrought(forecast)) {
    return {
      type: 'drought',
      severity: 'medium',
      title: 'Dry spell — agri supply and water risk',
      titleHi: 'सूखे की अवधि — कृषि आपूर्ति और पानी का जोखिम',
      message:
        'Week-ahead precipitation is near-zero with high temperatures. Agri-input prices may spike and municipal water supply could tighten. Lock-in procurement and inspect captive water storage.',
      messageHi:
        'अगले सप्ताह वर्षा लगभग शून्य और तापमान अधिक। कृषि-इनपुट की कीमतें बढ़ सकती हैं और नगरपालिका जल आपूर्ति कम हो सकती है। खरीद लॉक-इन करें और कैप्टिव जल भंडारण का निरीक्षण करें।',
      affectedDays: forecast.map((d) => d.date),
      actions: [
        'Lock-in agri commodity prices via forward contracts',
        'Audit borewell and tanker capacity',
        'Review water-intensive SOPs',
      ],
    }
  }

  return null
}
