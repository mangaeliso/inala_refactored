/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['"Dancing Script"', 'cursive'],
        'sans': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
