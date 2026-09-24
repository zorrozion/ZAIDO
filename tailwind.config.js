/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Microsoft YaHei"',
          '"PingFang SC"',
          '"Noto Sans CJK SC"',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif'
        ]
      }
    },
  },
  plugins: [],
}
