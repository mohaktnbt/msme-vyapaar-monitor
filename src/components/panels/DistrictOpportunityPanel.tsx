import React, { useState, useMemo } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { DataFreshness } from '../ui/DataFreshness.js'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DistrictScore {
  id: string
  district: string
  state: string
  overall: number // 0-100
  tenderActivity: number
  schemeAvailability: number
  infraInvestment: number
  powerReliability: number
  waterAvailability: number
  marketAccess: number
  keyFactors: string[]
  recommendations: string[]
}

// ── Mock data (15 districts) ─────────────────────────────────────────────────

const DISTRICTS: DistrictScore[] = [
  {
    id: 'd1',
    district: 'Pune',
    state: 'Maharashtra',
    overall: 84,
    tenderActivity: 88,
    schemeAvailability: 82,
    infraInvestment: 90,
    powerReliability: 85,
    waterAvailability: 72,
    marketAccess: 92,
    keyFactors: [
      'Auto-ancillary cluster with 5 active industrial parks',
      'Over 1,200 active MSME-reserved tenders in last 90 days',
      'Mumbai port within 150 km + 2 international airports',
      'Water stress moderate (Khadakwasla at 68%)',
      'Power reliability among top 10 districts nationally',
    ],
    recommendations: [
      'Target auto & EV component tenders on GeM',
      'Apply for MSEDCL solar rooftop subsidy',
      'Join Pimpri-Chinchwad MSME association for cluster benefits',
    ],
  },
  {
    id: 'd2',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    overall: 79,
    tenderActivity: 72,
    schemeAvailability: 85,
    infraInvestment: 70,
    powerReliability: 78,
    waterAvailability: 60,
    marketAccess: 82,
    keyFactors: [
      'Textile & pump manufacturing hub',
      'TN state scheme for MSME capital subsidy up to 25%',
      'Access to Chennai and Cochin ports',
      'Water deficit — Siruvani dam at 48%',
    ],
    recommendations: [
      'Avail TN Industrial Policy 2021 capital subsidy',
      'Diversify to water-efficient processes',
      'Target Defence MSME cluster tenders',
    ],
  },
  {
    id: 'd3',
    district: 'Surat',
    state: 'Gujarat',
    overall: 82,
    tenderActivity: 80,
    schemeAvailability: 78,
    infraInvestment: 88,
    powerReliability: 90,
    waterAvailability: 75,
    marketAccess: 86,
    keyFactors: [
      'Diamond & textile export hub',
      'Bullet train + DMIC corridor boost infra spend',
      'Hazira port nearby, Mumbai 250 km',
      'Ukai dam at 71% — normal water availability',
    ],
    recommendations: [
      'Target APEDA export schemes',
      'Apply for Gujarat textile policy incentives',
      'Explore solar park MSME supplier opportunities',
    ],
  },
  {
    id: 'd4',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    overall: 80,
    tenderActivity: 85,
    schemeAvailability: 80,
    infraInvestment: 78,
    powerReliability: 82,
    waterAvailability: 45,
    marketAccess: 95,
    keyFactors: [
      'IT & deeptech startup ecosystem',
      'Metro Phase-2 creates ongoing supply opportunities',
      'High market access but severe Cauvery water stress (KRS at 28%)',
      '400+ active MeitY schemes',
    ],
    recommendations: [
      'Focus on IT services & SaaS on GeM',
      'Tap Startup India seed fund',
      'Reduce water dependency before expansion',
    ],
  },
  {
    id: 'd5',
    district: 'Ahmedabad',
    state: 'Gujarat',
    overall: 78,
    tenderActivity: 76,
    schemeAvailability: 72,
    infraInvestment: 85,
    powerReliability: 88,
    waterAvailability: 70,
    marketAccess: 78,
    keyFactors: [
      'Strong chemical & pharma cluster',
      'DMIC investment region',
      'Sabarmati riverfront-led infra opportunities',
    ],
    recommendations: [
      'Apply for PLI pharma scheme',
      'Target DMIC supplier tenders',
      'Explore Vibrant Gujarat MoUs',
    ],
  },
  {
    id: 'd6',
    district: 'Kanpur Nagar',
    state: 'Uttar Pradesh',
    overall: 62,
    tenderActivity: 68,
    schemeAvailability: 72,
    infraInvestment: 65,
    powerReliability: 55,
    waterAvailability: 50,
    marketAccess: 60,
    keyFactors: [
      'Leather cluster with export history',
      'UP ODOP scheme active',
      'Power reliability below national average',
    ],
    recommendations: [
      'Apply for ODOP credit-linked subsidy',
      'Install DG/solar backup',
      'Target leather SEZ tenders',
    ],
  },
  {
    id: 'd7',
    district: 'Ludhiana',
    state: 'Punjab',
    overall: 70,
    tenderActivity: 72,
    schemeAvailability: 68,
    infraInvestment: 60,
    powerReliability: 82,
    waterAvailability: 78,
    marketAccess: 72,
    keyFactors: [
      'Hosiery & bicycle cluster',
      'Bhakra dam at 82% — good water',
      'Amritsar-Kolkata DFC pass through',
    ],
    recommendations: [
      'Join hosiery export promotion council',
      'Apply for TUFS textile upgrade',
      'Explore DFC supplier schemes',
    ],
  },
  {
    id: 'd8',
    district: 'Hyderabad',
    state: 'Telangana',
    overall: 77,
    tenderActivity: 78,
    schemeAvailability: 75,
    infraInvestment: 82,
    powerReliability: 80,
    waterAvailability: 55,
    marketAccess: 88,
    keyFactors: [
      'Pharma City + IT corridor',
      'T-Hub startup ecosystem',
      'Nagarjuna Sagar deficit (34%)',
    ],
    recommendations: [
      'Target pharma PLI schemes',
      'Apply for TS-iPASS single-window clearance',
      'Explore IT park supplier tenders',
    ],
  },
  {
    id: 'd9',
    district: 'Indore',
    state: 'Madhya Pradesh',
    overall: 68,
    tenderActivity: 65,
    schemeAvailability: 70,
    infraInvestment: 72,
    powerReliability: 75,
    waterAvailability: 58,
    marketAccess: 65,
    keyFactors: [
      'Cleanest city — food processing potential',
      'DMIC Pithampur industrial node',
      'Indira Sagar dam at 55%',
    ],
    recommendations: [
      'Apply for MP food processing incentives',
      'Target Pithampur auto cluster tenders',
      'Explore Mega Leather scheme',
    ],
  },
  {
    id: 'd10',
    district: 'Jaipur',
    state: 'Rajasthan',
    overall: 65,
    tenderActivity: 62,
    schemeAvailability: 68,
    infraInvestment: 70,
    powerReliability: 70,
    waterAvailability: 40,
    marketAccess: 72,
    keyFactors: [
      'Handicraft & gem cluster',
      'Delhi-Mumbai expressway passes through',
      'Severe water constraints',
    ],
    recommendations: [
      'Apply for handicraft cluster dev program',
      'Target expressway supplier tenders',
      'Explore solar manufacturing PLI',
    ],
  },
  {
    id: 'd11',
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    overall: 60,
    tenderActivity: 66,
    schemeAvailability: 72,
    infraInvestment: 68,
    powerReliability: 52,
    waterAvailability: 62,
    marketAccess: 58,
    keyFactors: [
      'Chikankari & food processing ODOP',
      'Purvanchal Expressway connectivity',
      'Power reliability challenges',
    ],
    recommendations: [
      'Apply for ODOP marketing support',
      'Diversify into food processing',
      'Install power backup',
    ],
  },
  {
    id: 'd12',
    district: 'Kochi (Ernakulam)',
    state: 'Kerala',
    overall: 72,
    tenderActivity: 68,
    schemeAvailability: 75,
    infraInvestment: 78,
    powerReliability: 82,
    waterAvailability: 70,
    marketAccess: 85,
    keyFactors: [
      'Cochin port + SEZ',
      'Vizhinjam transshipment link',
      'Strong spice & seafood export base',
    ],
    recommendations: [
      'Target MPEDA seafood schemes',
      'Apply for Kerala KSIDC incentives',
      'Explore port-led supplier tenders',
    ],
  },
  {
    id: 'd13',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    overall: 74,
    tenderActivity: 70,
    schemeAvailability: 72,
    infraInvestment: 85,
    powerReliability: 78,
    waterAvailability: 65,
    marketAccess: 80,
    keyFactors: [
      'Port city + Visakhapatnam-Chennai IC',
      'Petrochemical cluster',
      'AP state capital status boost',
    ],
    recommendations: [
      'Target defense corridor tenders',
      'Apply for AP industrial single-window',
      'Explore pharma bulk drug park supply',
    ],
  },
  {
    id: 'd14',
    district: 'Raipur',
    state: 'Chhattisgarh',
    overall: 58,
    tenderActivity: 60,
    schemeAvailability: 62,
    infraInvestment: 55,
    powerReliability: 82,
    waterAvailability: 68,
    marketAccess: 48,
    keyFactors: [
      'Steel & cement hub',
      'Low market access — distance to ports',
      'Good power & water',
    ],
    recommendations: [
      'Target steel/cement downstream tenders',
      'Apply for CG industrial policy incentives',
      'Explore rail-based logistics schemes',
    ],
  },
  {
    id: 'd15',
    district: 'Guwahati (Kamrup Metro)',
    state: 'Assam',
    overall: 55,
    tenderActivity: 48,
    schemeAvailability: 70,
    infraInvestment: 62,
    powerReliability: 58,
    waterAvailability: 80,
    marketAccess: 50,
    keyFactors: [
      'Gateway to Northeast — strategic location',
      'NE Industrial Development Scheme active',
      'Lower tender volume vs mainland',
    ],
    recommendations: [
      'Apply for NEIDS 30% capital subsidy',
      'Target bamboo & agri-processing schemes',
      'Explore Act East trade corridor opportunities',
    ],
  },
]

function scoreColor(score: number): string {
  if (score >= 75) return '#16a34a'
  if (score >= 50) return '#d97706'
  return '#dc2626'
}

function scoreLabel(score: number): string {
  if (score >= 75) return 'High Opportunity'
  if (score >= 50) return 'Moderate Opportunity'
  return 'Low Opportunity'
}

// ── Panel ─────────────────────────────────────────────────────────────────────

const DistrictOpportunityPanel: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(DISTRICTS[0]?.id ?? '')
  const [compareId, setCompareId] = useState<string | null>(null)
  const [showFactors, setShowFactors] = useState(false)

  const selected = useMemo(
    () => DISTRICTS.find((d) => d.id === selectedId) ?? DISTRICTS[0],
    [selectedId]
  ) as DistrictScore

  const compareDistrict = useMemo(
    () => (compareId ? DISTRICTS.find((d) => d.id === compareId) ?? null : null),
    [compareId]
  )

  const radarData = useMemo(() => {
    return [
      { axis: 'Tender Activity', [selected.district]: selected.tenderActivity, ...(compareDistrict && { [compareDistrict.district]: compareDistrict.tenderActivity }) },
      { axis: 'Scheme Availability', [selected.district]: selected.schemeAvailability, ...(compareDistrict && { [compareDistrict.district]: compareDistrict.schemeAvailability }) },
      { axis: 'Infra Investment', [selected.district]: selected.infraInvestment, ...(compareDistrict && { [compareDistrict.district]: compareDistrict.infraInvestment }) },
      { axis: 'Power Reliability', [selected.district]: selected.powerReliability, ...(compareDistrict && { [compareDistrict.district]: compareDistrict.powerReliability }) },
      { axis: 'Water Availability', [selected.district]: selected.waterAvailability, ...(compareDistrict && { [compareDistrict.district]: compareDistrict.waterAvailability }) },
      { axis: 'Market Access', [selected.district]: selected.marketAccess, ...(compareDistrict && { [compareDistrict.district]: compareDistrict.marketAccess }) },
    ]
  }, [selected, compareDistrict])

  const color = scoreColor(selected.overall)

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
          📊 District Opportunity Score
        </h2>
        <DataFreshness source="Internal" lastUpdated={new Date().toISOString()} status="fresh" />
      </div>

      {/* Selectors */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            background: '#0a0e1a',
            color: '#e5e7eb',
            border: '1px solid #1f2937',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            flex: 1,
            minWidth: 180,
          }}
        >
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.district}, {d.state}
            </option>
          ))}
        </select>
        <select
          value={compareId ?? ''}
          onChange={(e) => setCompareId(e.target.value || null)}
          style={{
            background: '#0a0e1a',
            color: '#e5e7eb',
            border: '1px solid #1f2937',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            flex: 1,
            minWidth: 180,
          }}
        >
          <option value="">Compare with…</option>
          {DISTRICTS.filter((d) => d.id !== selectedId).map((d) => (
            <option key={d.id} value={d.id}>
              {d.district}, {d.state}
            </option>
          ))}
        </select>
      </div>

      {/* Big score */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: '#0a0e1a',
          border: '1px solid #1f2937',
          borderRadius: 10,
          padding: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `conic-gradient(${color} ${selected.overall * 3.6}deg, #1f2937 0deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: '#0a0e1a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 800, color }}>{selected.overall}</div>
            <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase' }}>
              / 100
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e5e7eb' }}>
            {selected.district}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{selected.state}</div>
          <div
            style={{
              marginTop: 8,
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 700,
              color,
              background: `${color}22`,
              border: `1px solid ${color}`,
              borderRadius: 999,
              padding: '3px 10px',
              textTransform: 'uppercase',
            }}
          >
            {scoreLabel(selected.overall)}
          </div>
          {compareDistrict && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
              vs <strong style={{ color: '#60a5fa' }}>{compareDistrict.district}</strong>:{' '}
              <strong style={{ color: scoreColor(compareDistrict.overall) }}>
                {compareDistrict.overall}
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* Radar chart */}
      <div
        style={{
          background: '#0a0e1a',
          border: '1px solid #1f2937',
          borderRadius: 8,
          padding: 10,
          height: 300,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="75%">
            <PolarGrid stroke="#1f2937" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#6b7280' }} />
            <Radar
              name={selected.district}
              dataKey={selected.district}
              stroke="#FF9933"
              fill="#FF9933"
              fillOpacity={0.4}
            />
            {compareDistrict && (
              <Radar
                name={compareDistrict.district}
                dataKey={compareDistrict.district}
                stroke="#60a5fa"
                fill="#60a5fa"
                fillOpacity={0.25}
              />
            )}
            <Tooltip
              contentStyle={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: 6,
                fontSize: 12,
                color: '#e5e7eb',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Why this score */}
      <div
        style={{
          background: '#0a0e1a',
          border: '1px solid #1f2937',
          borderRadius: 8,
          padding: 12,
        }}
      >
        <button
          onClick={() => setShowFactors(!showFactors)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            color: '#FF9933',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <span>Why this score?</span>
          <span>{showFactors ? '▲' : '▼'}</span>
        </button>
        {showFactors && (
          <ul
            style={{
              margin: '10px 0 0',
              paddingLeft: 18,
              fontSize: 12,
              color: '#e5e7eb',
              lineHeight: 1.6,
            }}
          >
            {selected.keyFactors.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Recommended actions */}
      <div
        style={{
          background: 'rgba(22,163,74,0.08)',
          border: '1px solid rgba(22,163,74,0.3)',
          borderRadius: 8,
          padding: 12,
        }}
      >
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 12,
            fontWeight: 700,
            color: '#16a34a',
          }}
        >
          ✓ Top 3 Actions for MSMEs in {selected.district}
        </h3>
        <ol
          style={{
            margin: 0,
            paddingLeft: 20,
            fontSize: 12,
            color: '#e5e7eb',
            lineHeight: 1.6,
          }}
        >
          {selected.recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default DistrictOpportunityPanel
