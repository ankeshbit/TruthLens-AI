/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Primary accent — forensic blue
        accent: {
          50:  '#EEF3FF',
          100: '#D9E4FF',
          200: '#B3C9FF',
          300: '#85A8FF',
          400: '#6D8DFF',
          500: '#4F7CFF',
          600: '#3D64E0',
          700: '#2D4DB8',
          800: '#1E3890',
          900: '#132568',
          950: '#0A1540',
        },
        // Surface — pure dark forensic palette
        surface: {
          50:  '#E8EAF0',
          100: '#C8CDD8',
          200: '#A0A8BB',
          300: '#7A849C',
          400: '#667085',
          500: '#4A5568',
          600: '#374151',
          700: '#242B36',
          800: '#141922',
          900: '#0F1319',
          950: '#090B0F',
        },
        // Keep brand as alias for accent for backward compat
        brand: {
          50:  '#EEF3FF',
          100: '#D9E4FF',
          200: '#B3C9FF',
          300: '#85A8FF',
          400: '#6D8DFF',
          500: '#4F7CFF',
          600: '#3D64E0',
          700: '#2D4DB8',
          800: '#1E3890',
          900: '#132568',
          950: '#0A1540',
        },
        risk: {
          genuine:     '#22C55E',
          suspicious:  '#F59E0B',
          manipulated: '#EF4444',
        },
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '16px',
        full: '9999px',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'spin-slow':  'spin 2s linear infinite',
        'shimmer':    'shimmer 1.6s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
      boxShadow: {
        panel:  '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        card:   '0 2px 8px rgba(0,0,0,0.35)',
        accent: '0 0 0 1px rgba(79,124,255,0.4)',
      },
    },
  },
  plugins: [],
}
