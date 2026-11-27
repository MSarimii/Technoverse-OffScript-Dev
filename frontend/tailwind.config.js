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
        line: {
          DEFAULT: 'var(--border-line)',
          strong: 'var(--line-strong)',
        },
        obsidian: {
          DEFAULT: 'var(--obsidian)',
          border: 'var(--obsidian-border)',
        },
        emeraldPrimary: 'var(--emerald)',
        emeraldBright: 'var(--emerald-bright)',
        emeraldTint: 'var(--emerald-tint)',
        emeraldBorder: 'var(--emerald-border)',
        emeraldInk: 'var(--emerald-ink)',
        champagne: {
          DEFAULT: 'var(--champagne)',
          lit: 'var(--champagne-lit)',
          deep: 'var(--champagne-deep)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          ink: 'var(--accent-ink)',
        },
        navy: {
          50: 'var(--emerald-tint)',
          100: 'var(--emerald-border)',
          600: 'var(--emerald)',
          800: 'var(--emerald-ink)',
          900: 'var(--obsidian)',
        },
        cobalt: 'var(--emerald)',
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
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
