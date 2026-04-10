import React from 'react'

interface RupeeFormatProps {
  amount: number
  compact?: boolean
  className?: string
}

function formatRupeeCompact(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (abs >= 1_00_00_000) {
    const crore = abs / 1_00_00_000
    const formatted = crore % 1 === 0 ? crore.toString() : crore.toFixed(2).replace(/\.?0+$/, '')
    return `${sign}\u20B9${formatted} Cr`
  }
  if (abs >= 1_00_000) {
    const lakh = abs / 1_00_000
    const formatted = lakh % 1 === 0 ? lakh.toString() : lakh.toFixed(2).replace(/\.?0+$/, '')
    return `${sign}\u20B9${formatted} L`
  }
  if (abs >= 1_000) {
    const k = abs / 1_000
    const formatted = k % 1 === 0 ? k.toString() : k.toFixed(1).replace(/\.?0+$/, '')
    return `${sign}\u20B9${formatted}K`
  }
  return `${sign}\u20B9${abs.toLocaleString('en-IN')}`
}

function formatRupeeFull(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  return `${sign}\u20B9${Math.abs(amount).toLocaleString('en-IN')}`
}

export const RupeeFormat: React.FC<RupeeFormatProps> = ({
  amount,
  compact = false,
  className,
}) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return <span className={className}>{'\u20B9'}0</span>
  }

  const formatted = compact ? formatRupeeCompact(amount) : formatRupeeFull(amount)

  return (
    <span
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      title={formatRupeeFull(amount)}
    >
      {formatted}
    </span>
  )
}

export default RupeeFormat
