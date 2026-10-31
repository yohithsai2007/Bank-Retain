/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0b1329',
          800: '#0f172a',
          700: '#1e293b',
          600: '#334155',
        },
        brand: {
          blue: '#2563eb',
          'blue-dark': '#1d4ed8',
          teal: '#0d9488',
          amber: '#d97706',
          red: '#dc2626',
        },
        risk: {
          low: '#0d9488',
          medium: '#d97706',
          high: '#ea580c',
          critical: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
