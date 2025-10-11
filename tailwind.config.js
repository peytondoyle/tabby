/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Billy dark theme
        background: '#0C0D10',
        surface: '#121317',
        'surface-elevated': '#1C1F27',
        border: 'rgba(255,255,255,0.14)',
        'border-strong': 'rgba(255,255,255,0.24)',
        'text-primary': '#FFFFFF',
        'text-secondary': '#C9CDD6',
        'text-tertiary': '#8D93A3',
        primary: '#0A84FF',
        'primary-hover': '#3394FF',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Monaco',
          'Inconsolata',
          'Fira Code',
          'monospace',
        ],
      },
      maxWidth: {
        'screen-2lg': '1400px'
      },
    },
  },
  plugins: [],
}
