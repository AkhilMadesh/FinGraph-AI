/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        navy: {
          950: '#050914',
          900: '#0b1020',
          850: '#0f1628',
          800: '#131c34',
          700: '#1a2540',
          600: '#243056',
        },
        accent: {
          blue: '#3b82f6',
          cyan: '#06b6d4',
        },
        risk: {
          low: '#10b981',
          moderate: '#3b82f6',
          elevated: '#f59e0b',
          high: '#f97316',
          critical: '#ef4444',
        },
      },
      boxShadow: {
        'card': '0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)',
        'hover': '0 0 0 1px rgba(59,130,246,0.2), 0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(59,130,246,0.08)',
        'glow-blue': '0 0 20px rgba(59,130,246,0.12)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.10)',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'pulse-ring': 'pulse-ring 2.5s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '50%': { transform: 'scale(1.4)', opacity: '0.3' },
          '100%': { transform: 'scale(0.8)', opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
};
