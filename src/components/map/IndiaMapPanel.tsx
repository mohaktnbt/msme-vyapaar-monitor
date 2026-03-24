import { useState, useCallback } from 'react'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { Map } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

// India-centered view
const INDIA_VIEW = {
  longitude: 82.0,
  latitude: 22.5,
  zoom: 4.2,
  pitch: 0,
  bearing: 0,
}

// MSME Industrial Clusters data (hardcoded)
const MSME_CLUSTERS = [
  { id: 'ludhiana', name: 'Ludhiana Textiles', lat: 30.9, lng: 75.85, sector: 'textile', size: 5000, units: 7000 },
  { id: 'surat', name: 'Surat Diamonds/Textiles', lat: 21.17, lng: 72.83, sector: 'textile', size: 6000, units: 10000 },
  { id: 'tirupur', name: 'Tirupur Garments', lat: 11.1, lng: 77.34, sector: 'textile', size: 4000, units: 8000 },
  { id: 'rajkot', name: 'Rajkot Engineering', lat: 22.3, lng: 70.78, sector: 'manufacturing', size: 3000, units: 4000 },
  { id: 'moradabad', name: 'Moradabad Brass', lat: 28.84, lng: 78.77, sector: 'manufacturing', size: 2000, units: 3000 },
  { id: 'agra', name: 'Agra Footwear', lat: 27.18, lng: 78.02, sector: 'manufacturing', size: 2500, units: 5000 },
  { id: 'meerut', name: 'Meerut Sports Goods', lat: 28.98, lng: 77.7, sector: 'manufacturing', size: 1500, units: 2000 },
  { id: 'aligarh', name: 'Aligarh Locks', lat: 27.88, lng: 78.08, sector: 'manufacturing', size: 1200, units: 1500 },
  { id: 'firozabad', name: 'Firozabad Glass', lat: 27.15, lng: 78.39, sector: 'manufacturing', size: 1000, units: 1200 },
  { id: 'ambur', name: 'Ambur Leather', lat: 12.79, lng: 78.72, sector: 'manufacturing', size: 1800, units: 2500 },
  { id: 'coimbatore', name: 'Coimbatore Engineering', lat: 11.0, lng: 76.95, sector: 'manufacturing', size: 4500, units: 6000 },
  { id: 'howrah', name: 'Howrah Engineering', lat: 22.58, lng: 88.32, sector: 'manufacturing', size: 3000, units: 4500 },
  { id: 'pune-auto', name: 'Pune Auto Components', lat: 18.52, lng: 73.86, sector: 'manufacturing', size: 5000, units: 4000 },
  { id: 'hyderabad-pharma', name: 'Hyderabad Pharma', lat: 17.38, lng: 78.49, sector: 'pharma', size: 4000, units: 2000 },
  { id: 'chennai-auto', name: 'Chennai Auto Hub', lat: 13.08, lng: 80.27, sector: 'manufacturing', size: 5500, units: 5000 },
  { id: 'noida-it', name: 'Noida IT/Electronics', lat: 28.54, lng: 77.39, sector: 'it', size: 3500, units: 2000 },
]

// Sample tender hotspots (would come from API in production)
const SAMPLE_TENDERS = [
  { id: 't1', lat: 28.6, lng: 77.2, value: 5000000, title: '3 GeM tenders', state: 'Delhi', count: 3 },
  { id: 't2', lat: 19.07, lng: 72.87, value: 25000000, title: '7 GeM tenders', state: 'Mumbai', count: 7 },
  { id: 't3', lat: 12.97, lng: 77.59, value: 15000000, title: '5 CPPP tenders', state: 'Bengaluru', count: 5 },
  { id: 't4', lat: 17.38, lng: 78.49, value: 8000000, title: '4 State tenders', state: 'Hyderabad', count: 4 },
  { id: 't5', lat: 22.57, lng: 88.36, value: 3000000, title: '2 GeM tenders', state: 'Kolkata', count: 2 },
  { id: 't6', lat: 23.02, lng: 72.57, value: 12000000, title: '6 tenders', state: 'Ahmedabad', count: 6 },
  { id: 't7', lat: 26.84, lng: 80.94, value: 18000000, title: '8 State tenders', state: 'Lucknow', count: 8 },
  { id: 't8', lat: 13.08, lng: 80.27, value: 20000000, title: '9 tenders', state: 'Chennai', count: 9 },
]

type LayerType = 'tenders' | 'clusters' | 'both'

const SECTOR_COLORS: Record<string, [number, number, number]> = {
  textile: [255, 153, 51],
  manufacturing: [0, 48, 135],
  it: [99, 102, 241],
  pharma: [16, 185, 129],
  default: [107, 114, 128],
}

function getTenderColor(value: number): [number, number, number] {
  if (value > 20000000) return [239, 68, 68]   // red for > 20L
  if (value > 5000000) return [245, 158, 11]    // amber for 5-20L
  return [16, 185, 129]                          // green for < 5L
}

interface PopupInfo {
  x: number
  y: number
  title: string
  details: string
}

export default function IndiaMapPanel() {
  const [activeLayer, setActiveLayer] = useState<LayerType>('both')
  const [popup, setPopup] = useState<PopupInfo | null>(null)

  const layers = [
    activeLayer !== 'clusters' && new ScatterplotLayer({
      id: 'tender-layer',
      data: SAMPLE_TENDERS,
      getPosition: (d) => [d.lng, d.lat],
      getRadius: (d) => Math.sqrt(d.count) * 12000,
      getFillColor: (d) => getTenderColor(d.value),
      getLineColor: [255, 255, 255],
      lineWidthMinPixels: 1,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      radiusMinPixels: 8,
      radiusMaxPixels: 40,
      onClick: ({ object, x, y }) => {
        if (object) {
          setPopup({ x, y, title: object.title, details: `${object.state} — ${object.count} active tenders` })
        }
      },
    }),
    activeLayer !== 'tenders' && new ScatterplotLayer({
      id: 'cluster-layer',
      data: MSME_CLUSTERS,
      getPosition: (d) => [d.lng, d.lat],
      getRadius: Math.sqrt(3000) * 800,
      getFillColor: (d) => SECTOR_COLORS[d.sector] || SECTOR_COLORS.default,
      getLineColor: [255, 255, 255],
      lineWidthMinPixels: 1,
      pickable: true,
      opacity: 0.6,
      stroked: true,
      radiusMinPixels: 5,
      radiusMaxPixels: 25,
      onClick: ({ object, x, y }) => {
        if (object) {
          setPopup({ x, y, title: object.name, details: `${object.units.toLocaleString('en-IN')} MSME units` })
        }
      },
    }),
    new TextLayer({
      id: 'cluster-labels',
      data: MSME_CLUSTERS.filter(() => activeLayer !== 'tenders'),
      getPosition: (d) => [d.lng, d.lat + 0.5],
      getText: (d) => d.name.split(' ')[0],
      getSize: 11,
      getColor: [255, 255, 255],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      visible: activeLayer !== 'tenders',
    }),
  ].filter(Boolean)

  const handleDismissPopup = useCallback(() => setPopup(null), [])

  return (
    <div style={{ position: 'relative', height: '480px', borderRadius: '8px', overflow: 'hidden', background: '#0a0e1a' }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'rgba(0,0,0,0.7)', padding: '8px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(4px)',
      }}>
        <span style={{ color: '#FF9933', fontWeight: 700, fontSize: 14 }}>
          🗺️ India Intelligence Map
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['both', 'tenders', 'clusters'] as LayerType[]).map(layer => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              style={{
                padding: '3px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                background: activeLayer === layer ? '#FF9933' : 'rgba(255,255,255,0.1)',
                color: activeLayer === layer ? '#000' : '#fff',
                border: 'none', fontWeight: activeLayer === layer ? 700 : 400,
              }}
            >
              {layer === 'both' ? 'All' : layer === 'tenders' ? 'Tenders' : 'Clusters'}
            </button>
          ))}
        </div>
      </div>

      <DeckGL
        initialViewState={INDIA_VIEW}
        controller={true}
        layers={layers}
        onClick={handleDismissPopup}
      >
        <Map
          mapStyle="https://demotiles.maplibre.org/style.json"
          attributionControl={false}
        />
      </DeckGL>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 10,
        background: 'rgba(0,0,0,0.75)', borderRadius: 6, padding: '8px 10px',
        backdropFilter: 'blur(4px)',
      }}>
        {activeLayer !== 'clusters' && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ color: '#9ca3af', fontSize: 10, marginBottom: 4 }}>TENDERS</div>
            {[['#10b981', '<₹5L'], ['#f59e0b', '₹5-20L'], ['#ef4444', '>₹20L']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <span style={{ color: '#d1d5db', fontSize: 10 }}>{label}</span>
              </div>
            ))}
          </div>
        )}
        {activeLayer !== 'tenders' && (
          <div>
            <div style={{ color: '#9ca3af', fontSize: 10, marginBottom: 4 }}>MSME CLUSTERS</div>
            {[['#FF9933', 'Textile'], ['#003087', 'Manufacturing'], ['#6366f1', 'IT'], ['#10b981', 'Pharma']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <span style={{ color: '#d1d5db', fontSize: 10 }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Popup */}
      {popup && (
        <div style={{
          position: 'absolute', left: popup.x + 10, top: popup.y - 20,
          zIndex: 20, background: '#1f2937', border: '1px solid #374151',
          borderRadius: 6, padding: '8px 12px', minWidth: 160,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}>
          <div style={{ color: '#f9fafb', fontWeight: 600, fontSize: 13, marginBottom: 3 }}>
            {popup.title}
          </div>
          <div style={{ color: '#9ca3af', fontSize: 12 }}>{popup.details}</div>
          <button
            onClick={handleDismissPopup}
            style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14 }}
          >×</button>
        </div>
      )}
    </div>
  )
}
