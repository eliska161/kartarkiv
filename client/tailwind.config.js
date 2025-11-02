/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
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
        brand: {
          50: '#f2fbf6',
          100: '#d3f1df',
          200: '#a7e3c0',
          300: '#74d19a',
          400: '#41ba72',
          500: '#1f9d59',
          600: '#17834c',
          700: '#13693d',
          800: '#0f4e2f',
          900: '#0a3421',
        },
        brandDark: {
          50: '#ecf4ef',
          100: '#cfe1d7',
          200: '#9fc3af',
          300: '#6fa688',
          400: '#3f8860',
          500: '#1f5b3f',
          600: '#184a33',
          700: '#123827',
          800: '#0c261b',
          900: '#06150f',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}