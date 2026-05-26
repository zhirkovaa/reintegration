/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#f3f8f5',
          100: '#e2ede7',
          200: '#c4dcd0',
          300: '#9fc3b0',
          400: '#74a58b',
          500: '#5c8a6f',
          600: '#4a7059',
          700: '#3c5a47',
          800: '#30473a',
          900: '#273b30',
        },
        lavender: {
          50:  '#f5f3fb',
          100: '#ebe8f5',
          200: '#d6d1ec',
          300: '#bcb3de',
          400: '#9f8fcc',
          500: '#8a7bc0',
          600: '#7364ae',
          700: '#5e5092',
          800: '#4e4278',
          900: '#423863',
        },
        warm: {
          50:  '#fdf9f5',
          100: '#f9f0e5',
          200: '#f2dfc8',
          300: '#e8c9a0',
          400: '#dba96a',
          500: '#c98a45',
          600: '#b07236',
          700: '#8f5b2b',
          800: '#734925',
          900: '#5f3d22',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
