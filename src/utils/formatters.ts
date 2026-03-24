import type { SeverityLevel } from '../types/index.js'

// ── Currency ─────────────────────────────────────────────────────────────────

export function formatINR(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0'

  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (abs >= 1_00_00_000) {
    // >= 1 Crore
    const crore = abs / 1_00_00_000
    const formatted = crore % 1 === 0 ? crore.toString() : crore.toFixed(2).replace(/\.?0+$/, '')
    return `${sign}₹${formatted} Crore`
  }
  if (abs >= 1_00_000) {
    // >= 1 Lakh
    const lakh = abs / 1_00_000
    const formatted = lakh % 1 === 0 ? lakh.toString() : lakh.toFixed(2).replace(/\.?0+$/, '')
    return `${sign}₹${formatted} Lakh`
  }
  // Indian number formatting for smaller amounts
  return `${sign}₹${abs.toLocaleString('en-IN')}`
}

// ── Date / Time ───────────────────────────────────────────────────────────────

export function formatDate(isoString: string): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function timeAgo(isoString: string): string {
  if (!isoString) return ''
  const now = Date.now()
  const then = new Date(isoString).getTime()
  if (isNaN(then)) return ''
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHrs / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`
  return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`
}

export function formatCountdown(isoString: string): {
  days: number
  hours: number
  minutes: number
  isExpired: boolean
} {
  const now = Date.now()
  const target = new Date(isoString).getTime()
  if (isNaN(target) || target <= now) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true }
  }
  const diffMs = target - now
  const totalMinutes = Math.floor(diffMs / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  return { days, hours, minutes, isExpired: false }
}

// ── Colors ────────────────────────────────────────────────────────────────────

export function getSeverityColor(severity: SeverityLevel): string {
  switch (severity) {
    case 'critical': return '#dc2626'
    case 'high':     return '#ea580c'
    case 'medium':   return '#2563eb'
    case 'low':      return '#6b7280'
    case 'info':     return '#0891b2'
    default:         return '#6b7280'
  }
}

const SECTOR_COLORS: Record<string, string> = {
  manufacturing: '#2563eb',
  services:      '#7c3aed',
  agriculture:   '#16a34a',
  retail:        '#ea580c',
  export:        '#0d9488',
  it:            '#4f46e5',
  construction:  '#92400e',
  healthcare:    '#dc2626',
  textile:       '#db2777',
  food:          '#ca8a04',
  trading:       '#0369a1',
  pharma:        '#9333ea',
  defence:       '#374151',
  chemical:      '#b45309',
}

export function getSectorColor(sector: string): string {
  return SECTOR_COLORS[sector.toLowerCase()] ?? '#6b7280'
}

// ── Text ──────────────────────────────────────────────────────────────────────

export function truncate(text: string, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────

export function generateWhatsAppLink(title: string, summary: string, url?: string): string {
  const lines = [
    `🇮🇳 MSME Alert: ${title}`,
    summary,
    '',
    `via Vyapaar Monitor${url ? `: ${url}` : ''}`,
  ]
  const text = encodeURIComponent(lines.join('\n'))
  return `https://wa.me/?text=${text}`
}
