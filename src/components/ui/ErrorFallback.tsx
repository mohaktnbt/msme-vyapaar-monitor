import React from 'react'

interface ErrorFallbackProps {
  message?: string
  onRetry?: () => void
  panelName?: string
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  message,
  onRetry,
  panelName,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '24px 16px',
        textAlign: 'center',
        color: '#6b7280',
      }}
    >
      {/* Error icon */}
      <svg
        width={32}
        height={32}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#dc2626"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx={12} cy={12} r={10} />
        <line x1={12} y1={8} x2={12} y2={12} />
        <line x1={12} y1={16} x2="12.01" y2={16} />
      </svg>

      <div>
        <p style={{ margin: 0, fontWeight: 600, color: '#374151', fontSize: 14 }}>
          {panelName ? `${panelName} unavailable` : 'Something went wrong'}
        </p>
        {message && (
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>{message}</p>
        )}
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 4,
            padding: '6px 16px',
            background: '#1e3a5f',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  )
}

export default ErrorFallback
