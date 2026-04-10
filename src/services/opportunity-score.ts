// ============================================================
// MSME District Opportunity Score
// Inspired by forthepeople.in's district health scoring system.
//
// Produces a 0-100 composite score for a given Indian district
// based on procurement activity, scheme coverage, infrastructure
// investment, power reliability, water availability, and market
// access. Returns a graded breakdown plus concrete recommendations.
// ============================================================

export interface OpportunityScoreInput {
  district: string
  state: string
  tenderData?: { count: number; totalValueCr: number }
  schemeData?: { activeCount: number }
  infraData?: { projectsCount: number; valueCr: number }
  powerData?: { reliabilityPct: number; tariffRs: number }
  waterData?: { damFillPct: number }
  connectivityData?: {
    hasHighway: boolean
    hasRail: boolean
    hasAirport: boolean
    distanceToPort: number // km
  }
}

export type OpportunityGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D'

export interface OpportunityBreakdown {
  tenderActivity: number
  schemeAvailability: number
  infraInvestment: number
  powerReliability: number
  waterAvailability: number
  marketAccess: number
}

export interface OpportunityFactor {
  factor: string
  impact: 'positive' | 'negative'
  weight: number
}

export interface OpportunityScoreResult {
  district: string
  state: string
  score: number
  grade: OpportunityGrade
  breakdown: OpportunityBreakdown
  topFactors: OpportunityFactor[]
  recommendations: string[]
}

// ── Weights (must sum to 1.0) ──────────────────────────────────

export const SCORE_WEIGHTS = {
  tenderActivity: 0.25,
  schemeAvailability: 0.15,
  infraInvestment: 0.2,
  powerReliability: 0.15,
  waterAvailability: 0.1,
  marketAccess: 0.15,
} as const

// ── Sub-score helpers ──────────────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Score tender activity (0-100).
 * High tender count AND high cumulative value both matter.
 * 500+ active tenders and >2000 Cr total → full score.
 */
export function scoreTenderActivity(data?: { count: number; totalValueCr: number }): number {
  if (!data) return 30 // neutral-low for missing data
  const countScore = clamp((data.count / 500) * 100)
  const valueScore = clamp((data.totalValueCr / 2000) * 100)
  return Math.round(countScore * 0.55 + valueScore * 0.45)
}

/**
 * Score scheme availability (0-100).
 * 30+ active schemes at district level considered saturation.
 */
export function scoreSchemeAvailability(data?: { activeCount: number }): number {
  if (!data) return 35
  return Math.round(clamp((data.activeCount / 30) * 100))
}

/**
 * Score infra investment (0-100).
 * 10+ ongoing projects OR >5000 Cr committed → full score.
 */
export function scoreInfraInvestment(data?: { projectsCount: number; valueCr: number }): number {
  if (!data) return 30
  const countScore = clamp((data.projectsCount / 10) * 100)
  const valueScore = clamp((data.valueCr / 5000) * 100)
  return Math.round(countScore * 0.4 + valueScore * 0.6)
}

/**
 * Score power reliability (0-100).
 * Combines uptime reliability (%) with tariff affordability.
 * Reference tariff: Rs 7/kWh for LT industrial.
 */
export function scorePowerReliability(data?: { reliabilityPct: number; tariffRs: number }): number {
  if (!data) return 50
  const reliabilityScore = clamp(data.reliabilityPct)
  // Cheaper tariff = higher score. 5 Rs = 100, 10 Rs = 0.
  const tariffScore = clamp(((10 - data.tariffRs) / 5) * 100)
  return Math.round(reliabilityScore * 0.7 + tariffScore * 0.3)
}

/**
 * Score water availability from reservoir fill %.
 * Note: both drought (<30%) and flood-risk overfill (>110%) are penalised.
 */
export function scoreWaterAvailability(data?: { damFillPct: number }): number {
  if (!data) return 50
  const fill = data.damFillPct
  if (fill < 20) return 15
  if (fill < 40) return 45
  if (fill <= 90) return Math.round(60 + ((fill - 40) / 50) * 40)
  if (fill <= 110) return 90
  return 70 // overfill = flood risk
}

/**
 * Score market access from connectivity signals.
 * Highway/rail/airport each worth 20 points.
 * Port proximity contributes up to 40 points (<100 km = full).
 */
export function scoreMarketAccess(data?: OpportunityScoreInput['connectivityData']): number {
  if (!data) return 40
  let score = 0
  if (data.hasHighway) score += 20
  if (data.hasRail) score += 20
  if (data.hasAirport) score += 20
  const portScore = data.distanceToPort <= 100
    ? 40
    : data.distanceToPort <= 500
      ? Math.round(40 * (1 - (data.distanceToPort - 100) / 400))
      : 0
  score += portScore
  return clamp(score)
}

// ── Grading ────────────────────────────────────────────────────

export function scoreToGrade(score: number): OpportunityGrade {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C+'
  if (score >= 40) return 'C'
  return 'D'
}

// ── Factor extraction ──────────────────────────────────────────

function deriveTopFactors(breakdown: OpportunityBreakdown): OpportunityFactor[] {
  const rows: { key: keyof OpportunityBreakdown; label: string; value: number }[] = [
    { key: 'tenderActivity', label: 'Government tender activity', value: breakdown.tenderActivity },
    { key: 'schemeAvailability', label: 'Scheme availability', value: breakdown.schemeAvailability },
    { key: 'infraInvestment', label: 'Infrastructure investment pipeline', value: breakdown.infraInvestment },
    { key: 'powerReliability', label: 'Power reliability & tariffs', value: breakdown.powerReliability },
    { key: 'waterAvailability', label: 'Water / reservoir availability', value: breakdown.waterAvailability },
    { key: 'marketAccess', label: 'Connectivity & market access', value: breakdown.marketAccess },
  ]

  return rows
    .map((r) => ({
      factor: r.label,
      impact: (r.value >= 60 ? 'positive' : 'negative') as 'positive' | 'negative',
      weight: SCORE_WEIGHTS[r.key],
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
}

function deriveRecommendations(
  breakdown: OpportunityBreakdown,
  input: OpportunityScoreInput
): string[] {
  const recs: { priority: number; text: string }[] = []

  if (breakdown.tenderActivity < 50) {
    recs.push({
      priority: 1,
      text: `Register on GeM and CPPP portals and set alerts for ${input.state} tenders — current district activity is below the national median.`,
    })
  } else {
    recs.push({
      priority: 3,
      text: `High tender activity in ${input.district} — pursue Rule 149 MSME preference clauses and EMD exemptions.`,
    })
  }

  if (breakdown.schemeAvailability < 50) {
    recs.push({
      priority: 1,
      text: 'Check state-level MSME schemes beyond central coverage — district appears underserved. Consider PMEGP or state Single Window portal.',
    })
  }

  if (breakdown.powerReliability < 50) {
    recs.push({
      priority: 2,
      text: 'Consider captive solar or hybrid backup — unreliable grid and/or high tariffs materially hurt unit economics here.',
    })
  }

  if (breakdown.waterAvailability < 50) {
    recs.push({
      priority: 2,
      text: 'Plan for water-intensive processes around monsoon — reservoir levels suggest drought risk in dry months.',
    })
  }

  if (breakdown.infraInvestment >= 70) {
    recs.push({
      priority: 1,
      text: `Significant infra pipeline in ${input.district} — supply construction materials, equipment rental, or logistics services to primes.`,
    })
  }

  if (breakdown.marketAccess < 50) {
    recs.push({
      priority: 2,
      text: 'Factor in higher outbound logistics cost — co-locate warehousing near the nearest highway/rail hub to offset weak connectivity.',
    })
  } else if (breakdown.marketAccess >= 75) {
    recs.push({
      priority: 3,
      text: 'Strong connectivity — this district is well-suited for export-oriented MSME units; explore EPCG and RoDTEP benefits.',
    })
  }

  return recs
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map((r) => r.text)
}

// ── Main entry point ───────────────────────────────────────────

export function computeDistrictScore(input: OpportunityScoreInput): OpportunityScoreResult {
  const breakdown: OpportunityBreakdown = {
    tenderActivity: scoreTenderActivity(input.tenderData),
    schemeAvailability: scoreSchemeAvailability(input.schemeData),
    infraInvestment: scoreInfraInvestment(input.infraData),
    powerReliability: scorePowerReliability(input.powerData),
    waterAvailability: scoreWaterAvailability(input.waterData),
    marketAccess: scoreMarketAccess(input.connectivityData),
  }

  const weighted =
    breakdown.tenderActivity * SCORE_WEIGHTS.tenderActivity +
    breakdown.schemeAvailability * SCORE_WEIGHTS.schemeAvailability +
    breakdown.infraInvestment * SCORE_WEIGHTS.infraInvestment +
    breakdown.powerReliability * SCORE_WEIGHTS.powerReliability +
    breakdown.waterAvailability * SCORE_WEIGHTS.waterAvailability +
    breakdown.marketAccess * SCORE_WEIGHTS.marketAccess

  const score = Math.round(clamp(weighted))

  return {
    district: input.district,
    state: input.state,
    score,
    grade: scoreToGrade(score),
    breakdown,
    topFactors: deriveTopFactors(breakdown),
    recommendations: deriveRecommendations(breakdown, input),
  }
}

// ── Precomputed scores for 15 key districts (mock) ─────────────

const MOCK_INPUTS: OpportunityScoreInput[] = [
  {
    district: 'Mumbai',
    state: 'Maharashtra',
    tenderData: { count: 620, totalValueCr: 3850 },
    schemeData: { activeCount: 34 },
    infraData: { projectsCount: 18, valueCr: 12500 },
    powerData: { reliabilityPct: 96, tariffRs: 8.4 },
    waterData: { damFillPct: 72 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 5 },
  },
  {
    district: 'Pune',
    state: 'Maharashtra',
    tenderData: { count: 410, totalValueCr: 2100 },
    schemeData: { activeCount: 28 },
    infraData: { projectsCount: 14, valueCr: 8200 },
    powerData: { reliabilityPct: 94, tariffRs: 7.9 },
    waterData: { damFillPct: 68 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 150 },
  },
  {
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    tenderData: { count: 540, totalValueCr: 2900 },
    schemeData: { activeCount: 32 },
    infraData: { projectsCount: 16, valueCr: 9800 },
    powerData: { reliabilityPct: 93, tariffRs: 7.5 },
    waterData: { damFillPct: 55 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 350 },
  },
  {
    district: 'Chennai',
    state: 'Tamil Nadu',
    tenderData: { count: 480, totalValueCr: 2600 },
    schemeData: { activeCount: 30 },
    infraData: { projectsCount: 15, valueCr: 11000 },
    powerData: { reliabilityPct: 95, tariffRs: 7.2 },
    waterData: { damFillPct: 62 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 10 },
  },
  {
    district: 'Ahmedabad',
    state: 'Gujarat',
    tenderData: { count: 440, totalValueCr: 2350 },
    schemeData: { activeCount: 29 },
    infraData: { projectsCount: 13, valueCr: 9500 },
    powerData: { reliabilityPct: 97, tariffRs: 6.8 },
    waterData: { damFillPct: 74 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 120 },
  },
  {
    district: 'Surat',
    state: 'Gujarat',
    tenderData: { count: 310, totalValueCr: 1450 },
    schemeData: { activeCount: 24 },
    infraData: { projectsCount: 9, valueCr: 4200 },
    powerData: { reliabilityPct: 96, tariffRs: 6.9 },
    waterData: { damFillPct: 69 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: false, distanceToPort: 60 },
  },
  {
    district: 'Hyderabad',
    state: 'Telangana',
    tenderData: { count: 430, totalValueCr: 2450 },
    schemeData: { activeCount: 27 },
    infraData: { projectsCount: 12, valueCr: 8700 },
    powerData: { reliabilityPct: 94, tariffRs: 7.6 },
    waterData: { damFillPct: 58 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 550 },
  },
  {
    district: 'New Delhi',
    state: 'Delhi',
    tenderData: { count: 720, totalValueCr: 4200 },
    schemeData: { activeCount: 36 },
    infraData: { projectsCount: 20, valueCr: 14500 },
    powerData: { reliabilityPct: 97, tariffRs: 8.2 },
    waterData: { damFillPct: 60 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 900 },
  },
  {
    district: 'Gurugram',
    state: 'Haryana',
    tenderData: { count: 280, totalValueCr: 1600 },
    schemeData: { activeCount: 22 },
    infraData: { projectsCount: 11, valueCr: 6800 },
    powerData: { reliabilityPct: 92, tariffRs: 7.8 },
    waterData: { damFillPct: 54 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 1100 },
  },
  {
    district: 'Noida',
    state: 'Uttar Pradesh',
    tenderData: { count: 260, totalValueCr: 1520 },
    schemeData: { activeCount: 23 },
    infraData: { projectsCount: 10, valueCr: 6200 },
    powerData: { reliabilityPct: 91, tariffRs: 7.9 },
    waterData: { damFillPct: 58 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 1100 },
  },
  {
    district: 'Kolkata',
    state: 'West Bengal',
    tenderData: { count: 350, totalValueCr: 1850 },
    schemeData: { activeCount: 25 },
    infraData: { projectsCount: 10, valueCr: 5400 },
    powerData: { reliabilityPct: 90, tariffRs: 7.4 },
    waterData: { damFillPct: 78 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 15 },
  },
  {
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    tenderData: { count: 220, totalValueCr: 980 },
    schemeData: { activeCount: 20 },
    infraData: { projectsCount: 7, valueCr: 3100 },
    powerData: { reliabilityPct: 93, tariffRs: 7.0 },
    waterData: { damFillPct: 52 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 180 },
  },
  {
    district: 'Indore',
    state: 'Madhya Pradesh',
    tenderData: { count: 190, totalValueCr: 850 },
    schemeData: { activeCount: 21 },
    infraData: { projectsCount: 8, valueCr: 3600 },
    powerData: { reliabilityPct: 89, tariffRs: 7.3 },
    waterData: { damFillPct: 48 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 600 },
  },
  {
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    tenderData: { count: 240, totalValueCr: 1320 },
    schemeData: { activeCount: 22 },
    infraData: { projectsCount: 11, valueCr: 5800 },
    powerData: { reliabilityPct: 87, tariffRs: 7.6 },
    waterData: { damFillPct: 62 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 1000 },
  },
  {
    district: 'Patna',
    state: 'Bihar',
    tenderData: { count: 150, totalValueCr: 640 },
    schemeData: { activeCount: 17 },
    infraData: { projectsCount: 6, valueCr: 2400 },
    powerData: { reliabilityPct: 82, tariffRs: 7.1 },
    waterData: { damFillPct: 70 },
    connectivityData: { hasHighway: true, hasRail: true, hasAirport: true, distanceToPort: 800 },
  },
]

/**
 * Returns precomputed opportunity scores for 15 key MSME districts.
 * Used for dashboards, maps, and leaderboards before live data is wired.
 */
export function getDistrictPrecomputedScores(): OpportunityScoreResult[] {
  return MOCK_INPUTS.map(computeDistrictScore).sort((a, b) => b.score - a.score)
}
