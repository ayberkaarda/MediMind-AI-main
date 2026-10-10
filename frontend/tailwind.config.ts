import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      canvas: token('bg'),
      surface: token('surface'),
      'surface-muted': token('surface-muted'),
      ink: token('text'),
      'ink-muted': token('text-muted'),
      line: token('border'),
      'line-strong': token('border-strong'),
      accent: token('accent'),
      'accent-hover': token('accent-hover'),
      'on-accent': token('on-accent'),
      focus: token('focus'),
      error: token('error'),
      uncertainty: token('uncertainty'),
      block: token('block'),
      scrim: token('scrim'),
    },
    fontSize: {
      xs: ['0.8125rem', { lineHeight: '1.25rem' }],
      sm: ['0.9375rem', { lineHeight: '1.375rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.625rem' }],
      xl: ['1.375rem', { lineHeight: '1.875rem' }],
      '2xl': ['1.75rem', { lineHeight: '2.25rem' }],
    },
    fontFamily: {
      sans: ['"Source Sans 3"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      serif: ['"Source Serif 4"', 'Georgia', '"Times New Roman"', 'serif'],
    },
    borderRadius: {
      none: '0',
      sm: '4px',
      DEFAULT: '10px',
      frame: '20px',
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      pop: '0 8px 24px rgb(15 26 46 / 0.12)',
    },
    extend: {
      transitionDuration: {
        tap: 'var(--dur-tap)',
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
      maxWidth: {
        shell: '75rem',
        reading: '60ch',
        prose: '38rem',
      },
      gridTemplateColumns: {
        workspace: 'minmax(360px, 5fr) 7fr',
      },
      spacing: {
        column: '3rem',
      },
      height: {
        row: '2.75rem',
      },
      minHeight: {
        row: '2.75rem',
      },
      minWidth: {
        row: '2.75rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
