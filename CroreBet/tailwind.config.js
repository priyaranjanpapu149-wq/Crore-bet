/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        celestial: ['Cinzel', 'serif'], // Or whatever font you use
      },
      keyframes: {
        'bubble-up': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '0' },
          '10%': { opacity: '0.6' },
          '90%': { opacity: '0.6' },
          '100%': { transform: 'translateY(-100vh) scale(1.5)', opacity: '0' },
        },
        'float-card': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(5deg)' },
        },
        'spin-slow': {
          '100%': { transform: 'rotate(360deg)' },
        }
      },
      animation: {
        'bubble-up': 'bubble-up 15s linear infinite',
        'float-card': 'float-card 8s ease-in-out infinite',
        'spin-slow': 'spin-slow 20s linear infinite',
      }
    },
  },
  plugins: [],
}