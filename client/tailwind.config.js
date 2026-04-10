/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        'tour-day':       '#F59E0B',
        'tour-night':     '#6366F1',
        'tour-overnight': '#8B5CF6',
      },
    },
  },
  plugins: [],
}

