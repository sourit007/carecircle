/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        sage: {
          50: '#f4f7f4',
          100: '#e5ece5',
          200: '#cbdacb',
          300: '#a3c0a4',
          400: '#75a077',
          500: '#538255',
          600: '#3f6741',
          700: '#335235',
          800: '#2b422d',
          900: '#243726',
        }
      },
    },
  },
  plugins: [],
}

