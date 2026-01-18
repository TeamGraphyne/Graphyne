/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#1e1e1e", // Dark mode base
        panel: "#252526",      // VS Code style panels
        accent: "#2d004b",     // Graphyne Brand Color
      }
    },
  },
  plugins: [],
}