/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f4fb',
          100: '#dde8f4',
          200: '#c1d3eb',
          300: '#96b5de',
          400: '#6491ce',
          500: '#4371bf',
          600: '#3259b1',
          700: '#2b4891',
          800: '#1e3a5f',
          900: '#152d4e',
          950: '#0f1e35',
        },
        secondary: {
          50:  '#f0fdf9',
          100: '#ccfbee',
          200: '#99f5de',
          300: '#5ce7c5',
          400: '#26d1a8',
          500: '#0cb892',
          600: '#089476',
          700: '#0a7560',
          800: '#0c5e4d',
          900: '#0d4d40',
          950: '#022d26',
        },
      },
      fontFamily: {
        sans:   ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        arabic: ['"IBM Plex Sans Arabic"', 'Tahoma', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

