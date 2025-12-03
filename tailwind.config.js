/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Premium Typography System
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      // Logo-Derived Color Palette
      colors: {
        'huttle': {
          // FROM LOGO - Blue side (left of ring)
          blue: '#2B8FC7',
          'blue-dark': '#2480B5',
          'blue-light': '#E3F2FD',
          
          // FROM LOGO - Cyan side (right of ring)
          cyan: '#00BCD4',
          'cyan-dark': '#00ACC1',
          'cyan-light': '#E0F7FA',
          
          // Full scale for flexibility
          50: '#E0F7FA',
          100: '#B2EBF2',
          200: '#80DEEA',
          300: '#4DD0E1',
          400: '#26C6DA',
          500: '#00BCD4',
          600: '#00ACC1',
          700: '#0097A7',
          800: '#00838F',
          900: '#006064',
        },
        // Legacy support (mapped to new colors)
        'huttle-primary': '#2B8FC7',
        'huttle-primary-dark': '#2480B5',
        'huttle-primary-light': '#E3F2FD',
        // Accent colors for variety
        'accent': {
          purple: '#8B5CF6',
          pink: '#EC4899',
          orange: '#F97316',
          green: '#10B981',
          blue: '#3B82F6',
        },
        // Clean surface colors
        'surface': {
          50: '#FAFBFC',
          100: '#F4F5F7',
          200: '#E8EAED',
          300: '#D1D5DB',
        },
      },
      // Refined Keyframes for Micro-animations
      keyframes: {
        // Subtle fade for element reveals
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Smooth slide for lists and cards
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // Gentle scale for interactive feedback
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Subtle pulse for loading/processing states
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        // Ring pulse for notifications
        ringPulse: {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '0.4' },
          '100%': { transform: 'scale(1)', opacity: '0.8' },
        },
        // Bell wiggle for notifications
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-8deg)' },
          '75%': { transform: 'rotate(8deg)' },
        },
        // Shimmer for loading skeletons
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Count up animation helper
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Arrow slide for links
        arrowSlide: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(4px)' },
        },
      },
      // Refined Animation Timings
      animation: {
        'fadeIn': 'fadeIn 0.2s ease-out',
        'fadeIn-slow': 'fadeIn 0.4s ease-out',
        'slideUp': 'slideUp 0.3s ease-out',
        'slideDown': 'slideDown 0.3s ease-out',
        'slideInRight': 'slideInRight 0.3s ease-out',
        'slideInLeft': 'slideInLeft 0.3s ease-out',
        'scaleIn': 'scaleIn 0.2s ease-out',
        'pulse': 'pulse 2s ease-in-out infinite',
        'ringPulse': 'ringPulse 2s ease-in-out infinite',
        'wiggle': 'wiggle 0.4s ease-in-out',
        'shimmer': 'shimmer 2s linear infinite',
        'countUp': 'countUp 0.4s ease-out',
      },
      // Clean Shadow System
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'soft': '0 2px 8px 0 rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 12px 0 rgba(0, 0, 0, 0.06)',
        'elevated': '0 8px 24px 0 rgba(0, 0, 0, 0.08)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 24px 0 rgba(0, 0, 0, 0.08)',
        // Focus rings using logo colors
        'focus-blue': '0 0 0 2px #fff, 0 0 0 4px #2B8FC7',
        'focus-cyan': '0 0 0 2px #fff, 0 0 0 4px #00BCD4',
      },
      // Clean Background Gradients
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        // Logo gradient (blue to cyan)
        'huttle-gradient': 'linear-gradient(135deg, #2B8FC7 0%, #00BCD4 100%)',
        'huttle-gradient-reverse': 'linear-gradient(135deg, #00BCD4 0%, #2B8FC7 100%)',
        'huttle-gradient-vertical': 'linear-gradient(180deg, #2B8FC7 0%, #00BCD4 100%)',
        // Subtle surface gradients
        'surface-gradient': 'linear-gradient(180deg, #ffffff 0%, #FAFBFC 100%)',
      },
      // Border Radius
      borderRadius: {
        'DEFAULT': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      // Backdrop Blur
      backdropBlur: {
        xs: '2px',
      },
      // Transition timing
      transitionDuration: {
        '150': '150ms',
        '250': '250ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
