import React from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  label: string
  variant: BadgeVariant
  size?: BadgeSize
}

const VARIANT_STYLES: Record<BadgeVariant, { background: string; color: string }> = {
  success: { background: '#064e3b', color: '#34d399' },
  warning: { background: '#78350f', color: '#fbbf24' },
  danger: { background: '#7f1d1d', color: '#f87171' },
  info: { background: '#1e3a5f', color: '#60a5fa' },
  neutral: { background: '#1f2937', color: '#9ca3af' },
}

export const Badge: React.FC<BadgeProps> = ({ label, variant, size = 'md' }) => {
  const { background, color } = VARIANT_STYLES[variant]
  const isSmall = size === 'sm'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: isSmall ? 10 : 12,
        fontWeight: 600,
        lineHeight: 1,
        padding: isSmall ? '2px 6px' : '3px 8px',
        borderRadius: 999,
        background,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

export default Badge
