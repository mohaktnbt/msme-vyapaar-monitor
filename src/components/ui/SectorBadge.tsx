import React from 'react'
import { getSectorColor } from '../../utils/formatters.js'

interface SectorBadgeProps {
  sector: string
  size?: 'sm' | 'md'
}

export const SectorBadge: React.FC<SectorBadgeProps> = ({ sector, size = 'md' }) => {
  const color = getSectorColor(sector)
  const isSmall = size === 'sm'
  const label = sector.charAt(0).toUpperCase() + sector.slice(1)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: `${color}18`,
        color,
        border: `1px solid ${color}44`,
        borderRadius: 999,
        padding: isSmall ? '1px 7px' : '2px 10px',
        fontSize: isSmall ? 10 : 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        lineHeight: 1.5,
      }}
    >
      {label}
    </span>
  )
}

export default SectorBadge
