import React, { useState, useEffect, useRef, useCallback } from 'react'

interface SearchBarProps {
  placeholder: string
  onSearch: (query: string) => void
  debounceMs?: number
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder,
  onSearch,
  debounceMs = 300,
}) => {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedSearch = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onSearch(query)
      }, debounceMs)
    },
    [onSearch, debounceMs]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    debouncedSearch(newValue)
  }

  const handleClear = () => {
    setValue('')
    onSearch('')
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
      }}
    >
      {/* Search icon */}
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke={focused ? '#FF9933' : '#6b7280'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: 'absolute',
          left: 10,
          pointerEvents: 'none',
          flexShrink: 0,
        }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 32px 8px 34px',
          fontSize: 13,
          fontWeight: 500,
          background: '#1f2937',
          border: `1px solid ${focused ? '#FF9933' : '#374151'}`,
          borderRadius: 8,
          color: '#fff',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
      />

      {/* Clear button */}
      {value.length > 0 && (
        <button
          onClick={handleClear}
          style={{
            position: 'absolute',
            right: 8,
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#374151',
            border: 'none',
            borderRadius: '50%',
            color: '#9ca3af',
            fontSize: 12,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 0,
          }}
          aria-label="Clear search"
        >
          {'\u2715'}
        </button>
      )}
    </div>
  )
}

export default SearchBar
