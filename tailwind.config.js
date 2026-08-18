/** @type {import('tailwindcss').Config} */
module.exports = {
  // Update this if you add components outside of the 'app' folder
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}