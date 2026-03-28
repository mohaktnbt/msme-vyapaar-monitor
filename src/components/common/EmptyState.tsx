import React from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: { label: string; onClick: () => void }
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: 16,
            fontSize: 40,
            lineHeight: 1,
            color: '#4b5563',
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          margin: '0 0 6px',
          fontSize: 15,
          fontWeight: 700,
          color: '#d1d5db',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            margin: '0 0 16px',
            fontSize: 13,
            color: '#6b7280',
            maxWidth: 320,
            lineHeight: 1.45,
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            borderRadius: 6,
            background: '#FF9933',
            color: '#0a0e1a',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState
