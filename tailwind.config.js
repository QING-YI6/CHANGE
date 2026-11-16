/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--c-paper) / <alpha-value>)',
        paper2: 'rgb(var(--c-paper2) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        soft: 'rgb(var(--c-soft) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        moss: 'rgb(var(--c-moss) / <alpha-value>)',
        clay: 'rgb(var(--c-clay) / <alpha-value>)',
        dusk: 'rgb(var(--c-dusk) / <alpha-value>)',
        sun: 'rgb(var(--c-sun) / <alpha-value>)'
      },
      fontFamily: {
        serif: [
          '"Songti SC"',
          '"STSong"',
          '"Noto Serif CJK SC"',
          '"Source Han Serif SC"',
          '"Source Han Serif CN"',
          '"SimSun"',
          'Georgia',
          'serif'
        ],
        sans: [
          '"PingFang SC"',
          '"HarmonyOS Sans SC"',
          '"MiSans"',
          '"Microsoft YaHei"',
          '"Noto Sans CJK SC"',
          'system-ui',
          '-apple-system',
          'sans-serif'
        ]
      },
      boxShadow: {
        card: '0 1px 2px rgba(48, 38, 24, 0.04), 0 12px 32px -18px rgba(48, 38, 24, 0.28)',
        lift: '0 2px 4px rgba(48, 38, 24, 0.06), 0 24px 48px -24px rgba(48, 38, 24, 0.35)'
      },
      borderRadius: {
        '4xl': '2rem'
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    }
  },
  plugins: []
};
