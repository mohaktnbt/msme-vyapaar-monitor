// ============================================================
// Power Grid Analysis Utility
// Distils a PowerGridSnapshot into an MSME-friendly assessment.
// ============================================================

import type { PowerGridSnapshot } from '../services/utilities.js'

export interface PowerAnalysis {
  overallHealth: 'good' | 'strained' | 'critical'
  regionalIssues: string[]
  coalCrisisPlants: string[]
  recommendations: string[]
}

const REGION_NAMES: Record<string, string> = {
  NR: 'Northern region',
  WR: 'Western region',
  SR: 'Southern region',
  ER: 'Eastern region',
  NER: 'North-Eastern region',
}

function classifyHealth(
  totalShortageMW: number,
  criticalCoalCount: number,
  worstFrequency: number
): PowerAnalysis['overallHealth'] {
  if (totalShortageMW > 3000 || criticalCoalCount >= 3 || worstFrequency < 49.7) {
    return 'critical'
  }
  if (totalShortageMW > 1000 || criticalCoalCount >= 1 || worstFrequency < 49.85) {
    return 'strained'
  }
  return 'good'
}

export function analyzePowerGrid(snapshot: PowerGridSnapshot): PowerAnalysis {
  const regionalIssues: string[] = []
  let totalShortage = 0
  let worstFrequency = 50.0

  for (const region of snapshot.regions) {
    totalShortage += region.shortageMW
    if (region.frequency < worstFrequency) worstFrequency = region.frequency

    if (region.shortageMW > 1000) {
      regionalIssues.push(
        `${REGION_NAMES[region.name] ?? region.name}: ${region.shortageMW} MW shortage — load-shedding likely for LT industrial consumers.`
      )
    } else if (region.shortageMW > 300) {
      regionalIssues.push(
        `${REGION_NAMES[region.name] ?? region.name}: moderate shortfall of ${region.shortageMW} MW — peak-hour voltage dips possible.`
      )
    }

    if (region.frequency < 49.8) {
      regionalIssues.push(
        `${REGION_NAMES[region.name] ?? region.name}: grid frequency ${region.frequency.toFixed(2)} Hz — use UPS for sensitive equipment.`
      )
    }
  }

  const coalCrisisPlants = snapshot.coalStock
    .filter((p) => p.status !== 'normal')
    .map((p) => `${p.plantName} (${p.state}) — ${p.daysRemaining}d`)

  const overallHealth = classifyHealth(
    totalShortage,
    coalCrisisPlants.length,
    worstFrequency
  )

  const recommendations: string[] = []

  if (overallHealth === 'critical') {
    recommendations.push(
      'Activate diesel generator SLAs now — expect rolling outages within 48 hours.'
    )
    recommendations.push(
      'Defer non-critical energy-intensive production runs to the next 2 weeks.'
    )
  } else if (overallHealth === 'strained') {
    recommendations.push(
      'Top up captive fuel stocks and verify inverter battery health ahead of peak load.'
    )
  } else {
    recommendations.push(
      'Grid is stable — a good window to run energy-intensive batch processes.'
    )
  }

  if (coalCrisisPlants.length > 0) {
    recommendations.push(
      `${coalCrisisPlants.length} thermal plants on critical coal — watch for discom-side power holidays.`
    )
  }

  if (snapshot.renewables.percentOfGrid >= 25) {
    recommendations.push(
      'Renewables share is high — explore open-access solar PPAs for 15-20% tariff savings.'
    )
  }

  if (totalShortage > 1500) {
    recommendations.push(
      'Negotiate time-of-day tariffs with your discom to shift load to off-peak hours.'
    )
  }

  return {
    overallHealth,
    regionalIssues,
    coalCrisisPlants,
    recommendations,
  }
}
