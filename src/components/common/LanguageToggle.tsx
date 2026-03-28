import React from 'react'

interface LanguageToggleProps {
  language: 'en' | 'hi'
  onChange: (lang: 'en' | 'hi') => void
}

const LANGS: Array<{ value: 'en' | 'hi'; label: string }> = [
  { value: 'en', label: 'EN' },
  { value: 'hi', label: '\u0939\u093F\u0902' },
]

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ language, onChange }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: '1px solid #374151',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {LANGS.map((lang) => {
        const isActive = language === lang.value
        return (
          <button
            key={lang.value}
            onClick={() => onChange(lang.value)}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: isActive ? '#FF9933' : '#111827',
              color: isActive ? '#0a0e1a' : '#9ca3af',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {lang.label}
          </button>
        )
      })}
    </div>
  )
}

export default LanguageToggle
