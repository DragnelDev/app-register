/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta "archivo institucional": azul tinta profundo + acento sello dorado
        ink: {
          50: '#f2f5f8',
          100: '#e3e9ef',
          200: '#c2d0dd',
          300: '#93a9c1',
          400: '#5f7d9e',
          500: '#3d5c7d',
          600: '#2c4763',
          700: '#233a50',
          800: '#1c2e40',
          900: '#141f2c',
          950: '#0c141d',
        },
        seal: {
          50: '#fdf7e9',
          100: '#f9ecc4',
          200: '#f2d788',
          300: '#e9bd4c',
          400: '#dda526',
          500: '#c1871a',
          600: '#996815',
          700: '#754e14',
          800: '#5f3f16',
          900: '#513516',
        },
        paper: '#faf8f3',
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
