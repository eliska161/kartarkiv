/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'rgb(var(--brand-primary-50) / <alpha-value>)',
          100: 'rgb(var(--brand-primary-100) / <alpha-value>)',
          200: 'rgb(var(--brand-primary-200) / <alpha-value>)',
          300: 'rgb(var(--brand-primary-300) / <alpha-value>)',
          400: 'rgb(var(--brand-primary-400) / <alpha-value>)',
          500: 'rgb(var(--brand-primary-500) / <alpha-value>)',
          600: 'rgb(var(--brand-primary-600) / <alpha-value>)',
          700: 'rgb(var(--brand-primary-700) / <alpha-value>)',
          800: 'rgb(var(--brand-primary-800) / <alpha-value>)',
          900: 'rgb(var(--brand-primary-900) / <alpha-value>)',
        },
        brandText: 'rgb(var(--brand-text) / <alpha-value>)',
        brandSurface: 'rgb(var(--brand-surface) / <alpha-value>)',
        brandForeground: 'rgb(var(--brand-primary-foreground) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
