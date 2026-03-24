import React from 'react'
import { formatINR } from '../../utils/formatters.js'

interface ValueDisplayProps {
  value?: number | null
  currency?: 'INR' | 'USD'
  className?: string
}

export const ValueDisplay: React.FC<ValueDisplayProps> = ({
  value,
  currency = 'INR',
  className,
}) => {
  if (value === undefined || value === null || isNaN(value)) {
    return (
      <span className={className} style={{ color: '#9ca3af', fontSize: 'inherit' }}>
        —
      </span>
    )
  }

  if (currency === 'USD') {
    return (
      <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
        ${value.toLocaleString('en-US')}
      </span>
    )
  }

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {formatINR(value)}
    </span>
  )
}

export default ValueDisplay
