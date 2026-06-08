import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Driven by CSS variables in globals.css so we can swap on .dark
        primary: 'rgb(var(--rgb-primary) / <alpha-value>)',
        secondary: 'rgb(var(--rgb-secondary) / <alpha-value>)',
        // `page` is identical to primary in light mode, but deeper in dark
        // mode so cards (which use bg-primary) stand out against the bg.
        page: 'rgb(var(--rgb-page) / <alpha-value>)',
        // `footer` is identical to secondary in light mode (dark teal footer).
        // In dark mode it's a muted off-white instead of full secondary, so the
        // card's inverse surface doesn't glare against the dim page.
        footer: 'rgb(var(--rgb-footer) / <alpha-value>)',
        accent: '#FFC857',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        sans: ['var(--font-body)', 'sans-serif'],
      },
      keyframes: {
        'card-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'backdrop-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'grid-fade': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        // No fill-mode on card-in: the locked `translateY(0)` was killing the hover lift.
        // Opacity ends at 1 (CSS default) so there's no visual flash on release.
        'card-in': 'card-in 320ms ease-out',
        'modal-in': 'modal-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'backdrop-in': 'backdrop-in 160ms ease-out both',
        'grid-fade': 'grid-fade 180ms ease-out',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      boxShadow: {
        card: '0 4px 20px rgb(var(--rgb-secondary) / 0.08)',
        'card-hover': '0 8px 30px rgb(var(--rgb-secondary) / 0.14)',
        'card-accent':
          '0 4px 20px rgb(var(--rgb-secondary) / 0.08), inset 4px 0 0 0 #FFC857',
        'card-accent-hover':
          '0 8px 30px rgb(var(--rgb-secondary) / 0.14), inset 4px 0 0 0 #FFC857',
        modal: '0 20px 60px rgb(var(--rgb-secondary) / 0.25)',
        menu: '0 8px 24px rgb(var(--rgb-secondary) / 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
