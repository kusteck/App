/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          dark: '#5b21b6',
        },
      },
      keyframes: {
        pulseSlow: { '0%,100%': { opacity: 1 }, '50%': { opacity: .4 } },
        slideIn: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: { slideIn: 'slideIn .25s ease-out' },
    },
  },
  plugins: [],
}