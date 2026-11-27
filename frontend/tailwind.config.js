/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        ink: {
          DEFAULT: 'var(--ink-primary)',
          muted: 'var(--ink-secondary)',
        },
        line: 'var(--border-line)',
        navy: {
          50: '#EEF2FF',
          100: '#DCE5FF',
          600: '#2F5BFF',
          800: '#2447CC',
          900: '#2F5BFF',
        },
        cobalt: '#2F5BFF',
        violet: '#7A5CFF',
        status: {
          answered: 'var(--status-answered)',
          review: 'var(--status-review)',
          unanswered: 'var(--status-unanswered)',
          danger: 'var(--status-danger)',
          current: 'var(--status-current)',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
