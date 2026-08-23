import type { Config } from 'tailwindcss';

/**
 * Tailwind 只是 token 的取用方式，真值在 globals.css 的 CSS 变量里。
 * 壳的所有颜色必须从这里取：`bg-page text-ink border-hairline text-accent`，
 * 不得再写 slate、blue、amber、emerald 这些 Tailwind 默认色（注意：块注释里写不了 star-slash）。
 */
const config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--page-bg)',
        card: 'var(--card)',
        'card-muted': 'var(--card-muted)',
        ink: 'var(--text)',
        muted: 'var(--subtext)',
        hairline: 'var(--hairline)',
        accent: {
          DEFAULT: 'var(--accent)',
          strong: 'var(--accent-strong)',
          on: 'var(--accent-on)',
          soft: 'var(--accent-soft)',
          ring: 'var(--accent-ring)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
        },
      },
      boxShadow: {
        card: 'var(--card-shadow)',
        raised: 'var(--card-shadow-raised)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
      },
      fontSize: {
        display: [
          'var(--text-display)',
          { lineHeight: '1.1', letterSpacing: 'var(--text-display-tracking)', fontWeight: '800' },
        ],
        section: ['var(--text-section)', { lineHeight: '1.35', fontWeight: '700' }],
        body: ['var(--text-body)', { lineHeight: '1.6' }],
        caption: ['var(--text-caption)', { lineHeight: '1.5' }],
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
