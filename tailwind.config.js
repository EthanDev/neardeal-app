/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0c0c0f',
        surface: '#1a1a1f',
        'surface-hover': '#242429',
        border: '#2a2a30',
        accent: '#c8e000',
        'accent-muted': '#a0b300',
        'text-primary': '#ffffff',
        'text-secondary': '#8a8a8f',
        'text-tertiary': '#5a5a5f',
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
      },
      fontFamily: {
        heading: ['GoogleSans-Bold'],
        'heading-semi': ['GoogleSans-SemiBold'],
        body: ['GoogleSans-Regular'],
        'body-medium': ['GoogleSans-Medium'],
        'body-bold': ['GoogleSans-Bold'],
        sans: ['GoogleSans-Regular'],
      },
    },
  },
  plugins: [],
};
