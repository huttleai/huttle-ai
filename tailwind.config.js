/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          'huttle-primary': '#00bad3',
          'huttle-primary-dark': '#009ab3',
          'huttle-primary-light': '#1fc9dd',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { transform: 'translateY(20px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-in-out',
          slideUp: 'slideUp 0.3s ease-out',
        },
      },
    },
    plugins: [],
  };
  