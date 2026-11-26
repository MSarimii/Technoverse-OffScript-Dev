/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#111827',
        border: 'rgba(255, 255, 255, 0.1)',
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
        },
        accent: '#8B5CF6',
      },
    },
  },
  plugins: [],
}
