/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        p2: {
          bg: '#101014',
          sidebar: '#0b0b0f',
          surface: '#19191f',
          input: '#1e1e26',
          accent: '#7c8aff',
          'accent-hover': '#6a79f0',
          hover: '#1c1c24',
          text: '#ececef',
          'text-secondary': '#a0a1b2',
          muted: '#5c5e6e',
          bubble: '#19191f',
          'bubble-out': '#282e54',
          green: '#5ae4a7',
          'green-dim': 'rgba(90, 228, 167, 0.12)',
          border: '#222230',
          danger: '#f87171',
          'danger-dim': 'rgba(248, 113, 113, 0.12)',
          warning: '#fbbf24',
          'warning-dim': 'rgba(251, 191, 36, 0.12)',
          overlay: 'rgba(0, 0, 0, 0.6)',
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(124, 138, 255, 0.15)',
        'glow-sm': '0 0 10px rgba(124, 138, 255, 0.1)',
        modal: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.05)',
        float: '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-up': 'slideInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
