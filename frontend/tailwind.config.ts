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
      uncertainty: token('uncertainty'),
      accent: token('accent'),
      'accent-hover': token('accent-hover'),
      'accent-text': token('accent-text'),
      'on-accent': token('on-accent'),
      focus: token('focus'),
      error: token('error'),
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1.125rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.25rem', { lineHeight: '1.75rem' }],
      xl: ['1.75rem', { lineHeight: '2rem' }],
      '2xl': ['2.5rem', { lineHeight: '2.5rem' }],
    },
    fontFamily: {
      sans: ['"Archivo"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
    },
    borderRadius: {
      none: '0',
      DEFAULT: '0',
      sm: '2px',
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
    },
    extend: {
      transitionDuration: {
        tap: 'var(--dur-tap)',
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        shutter: 'var(--ease-shutter)',
      },
      maxWidth: {
        shell: '80rem',
        prose: '38rem',
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
