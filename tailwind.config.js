/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2933',
        muted: '#6b7280',
        cream: '#fffaf1',
        line: '#e8ded0',
        brand: '#8b5e34',
        brandDark: '#5f3f22',
        accent: '#3f6f52'
      },
      boxShadow: {
        soft: '0 18px 45px rgba(69, 48, 27, 0.10)'
      }
    }
  },
  plugins: []
}
