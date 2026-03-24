import React, { useState, useEffect } from 'react'
import { formatCountdown } from '../../utils/formatters.js'

interface CountdownTimerProps {
  targetDate: string
  className?: string
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, className }) => {
  const [countdown, setCountdown] = useState(() => formatCountdown(targetDate))

  useEffect(() => {
    setCountdown(formatCountdown(targetDate))
    const id = setInterval(() => setCountdown(formatCountdown(targetDate)), 60_000)
    return () => clearInterval(id)
  }, [targetDate])

  if (countdown.isExpired) {
    return (
      <span
        className={className}
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#dc2626',
          background: '#fee2e2',
          borderRadius: 999,
          padding: '2px 8px',
        }}
      >
        Expired
      </span>
    )
  }

  const totalHours = countdown.days * 24 + countdown.hours
  const isUrgent = totalHours < 24
  const isWarning = totalHours < 72

  const color = isUrgent ? '#dc2626' : isWarning ? '#d97706' : '#16a34a'
  const bg = isUrgent ? '#fee2e2' : isWarning ? '#fef3c7' : '#dcfce7'

  const parts: string[] = []
  if (countdown.days > 0) parts.push(`${countdown.days}d`)
  if (countdown.hours > 0 || countdown.days > 0) parts.push(`${countdown.hours}h`)
  parts.push(`${countdown.minutes}m`)

  return (
    <span
      className={className}
      style={{
        fontSize: 11,
        fontWeight: 700,
        color,
        background: bg,
        borderRadius: 999,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {parts.join(' ')}
    </span>
  )
}

export default CountdownTimer
