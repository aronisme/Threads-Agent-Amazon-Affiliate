/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        threads: {
          bg: '#101010',
          card: '#181818',
          border: '#2a2a2a',
          hover: '#222222',
          accent: '#ffffff',
          dim: '#777777',
          badge: '#0095f6'
        }
      }
    },
  },
  plugins: [],
}
