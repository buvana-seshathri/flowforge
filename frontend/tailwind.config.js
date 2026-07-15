/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#0b0d12',
          panel: '#12151d',
          border: '#232837',
          accent: '#7c5cff',
          accent2: '#22d3c8',
          text: '#e6e8ef',
          muted: '#8890a4',
          danger: '#ff5c7c',
          success: '#3ddc97',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
