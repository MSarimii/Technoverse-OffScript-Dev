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
        champagne: {
          DEFAULT: 'var(--champagne)',
          lit: 'var(--champagne-lit)',
          deep: 'var(--champagne-deep)',
        },
        emeraldDeep: 'var(--emerald-deep)',
        emeraldTint: 'var(--emerald-tint)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          ink: 'var(--accent-ink)',
        },
        navy: {
          50: 'rgba(203, 169, 107, 0.12)',
          100: 'rgba(203, 169, 107, 0.22)',
          600: 'var(--champagne)',
          800: 'var(--champagne-lit)',
          900: 'var(--accent)',
        },
        cobalt: 'var(--champagne)',
        violet: 'var(--status-current)',
        status: {
          answered: 'var(--status-answered)',
          review: 'var(--status-review)',
          unanswered: 'var(--status-unanswered)',
          danger: 'var(--status-danger)',
          current: 'var(--status-current)',
        },
      },
      fontFamily: {
        sans: ['"Inter Tight"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
