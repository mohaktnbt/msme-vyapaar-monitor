/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: '#fff8ee',
          100: '#ffefd4',
          200: '#ffd9a0',
          300: '#ffbe60',
          400: '#ff9f2a',
          500: '#FF9933',  // Primary saffron
          600: '#e07a00',
          700: '#b85c00',
          800: '#934400',
          900: '#7a3800',
        },
        navy: {
          50: '#eef2ff',
          100: '#dde6ff',
          200: '#aabcff',
          300: '#668cff',
          400: '#2855ff',
          500: '#003087',  // Primary navy
          600: '#002570',
          700: '#001a4d',
          800: '#001030',
          900: '#000820',
        },
        'india-green': '#138808',
        'india-white': '#FFFFFF',
        'india-saffron': '#FF9933',
        'india-navy': '#000080',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
        hindi: ['Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'panel': '0 2px 8px rgba(0, 48, 135, 0.1)',
      },
      borderRadius: {
        'card': '8px',
        'badge': '4px',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
