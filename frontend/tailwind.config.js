/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#FAF8F3',
          200: '#F4F0E8',
          300: '#EBE6DA',
          400: '#E0D8C8',
          500: '#C8BCAC',
          800: '#44403C',
          900: '#292524',
          950: '#1C1917',
        },
        gold: {
          50: '#FEFCE8',
          100: '#FEF9C3',
          300: '#FDE08B',
          400: '#F0C775',
          500: '#D4A94E',
          600: '#B88D37',
          700: '#8A661C',
        },
        signal: {
          green: '#15803D',
          emerald: '#16A34A',
          amber: '#B45309',
          red: '#B91C1C',
        },
        razorpay: {
          navy: '#1C1917',
          card: '#FDFBF7',
          cardBorder: '#EBE6DA',
          gold: '#B88D37',
          accent: '#2563EB',
          success: '#15803D',
          warning: '#B45309',
          danger: '#B91C1C'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
};
