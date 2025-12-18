/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: [
    'bg-green-500', 'bg-green-600', 'from-green-600', 'to-green-500',
    'bg-blue-500', 'bg-blue-600', 'from-blue-600', 'to-blue-500',
    'bg-orange-500', 'bg-orange-600', 'from-orange-600', 'to-orange-500',
    'bg-red-500', 'bg-red-600', 'from-red-600', 'to-red-500',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
