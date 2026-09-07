/** @type {import('tailwindcss').Config} */
export default {
  // ThemeContext already toggles a `dark` class on <html>, but Tailwind defaults
  // to `media`, so `dark:` variants were following the OS preference and
  // ignoring the in-app theme toggle.
  darkMode: 'class',
  content: [
    "./index.html",
    "./feed.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', '"SFMono-Regular"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        canvas: 'var(--canvas)',
        ink: 'var(--ink)',
        rule: 'var(--rule)',
        action: 'var(--action)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        success: 'var(--success)',
        // Muted teal action ramp. Existing primary-* classes remain compatible.
        primary: {
          50: '#eef7f3',
          100: '#d6e5df',
          200: '#b7d5cc',
          300: '#91beb4',
          400: '#6fa9a1',
          500: '#43857f',
          600: '#276d69',
          700: '#205c59',
          800: '#184b49',
          900: '#133d3b',
        },
        surface: {
          50: '#fffdf6',
          100: '#f8f4e9',
          200: '#eee9dc',
          300: '#dfd8c9',
          400: '#968f81',
        },
      },
      boxShadow: {
        'soft': 'var(--shadow-soft)',
        'medium': 'var(--shadow-medium)',
        'elevated': 'var(--shadow-elevated)',
        'glow-violet': 'var(--shadow-medium)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'stagger': 'staggerIn 0.4s ease-out both',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        staggerIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(40px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-40px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
