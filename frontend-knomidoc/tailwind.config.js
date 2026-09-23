/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta "archivo institucional": azul tinta profundo + acento sello dorado
        ink: {
          50: '#eff8f0', 100: '#dceee0', 200: '#bddcc5', 300: '#91c1a0',
          400: '#639875', 500: '#397553', 600: '#286342', 700: '#1b5236',
          800: '#12432e', 900: '#0b3525', 950: '#06251a',
        },
        seal: {
          50: '#fffbea', 100: '#fff2b8', 200: '#ffe56b', 300: '#ffda24',
          400: '#f5c400', 500: '#ddb000', 600: '#b58e00', 700: '#856700',
          800: '#614b00', 900: '#493900',
        },
        paper: '#eaf3eb',
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(20 31 44 / 0.06), 0 1px 3px 0 rgb(20 31 44 / 0.08)',
      },
    },
  },
  plugins: [],
}
