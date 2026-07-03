/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Change this to a blue hex code like '#3b82f6' if you prefer blue over green
        primary: '#10b981', 
        primaryHover: '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // A clean, minimalist font
      }
    },
  },
  plugins: [],
}