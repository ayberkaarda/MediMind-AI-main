import { useCallback, useEffect, useState } from 'react';
import { readStorage, writeStorage } from './storage';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'medimind.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
let themeTransition: ReturnType<typeof setTimeout> | undefined;

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readThemePreference(): ThemePreference {
  const stored = readStorage(THEME_KEY);
  return isPreference(stored) ? stored : 'system';
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return preference;
}

function setThemeAttributes(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
  const themeColor = getComputedStyle(root).getPropertyValue('--color-bg').trim();
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = themeColor;
  });
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => unknown;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Applies a theme. A real change drops the new theme in from the top with a
 * view transition (see ::view-transition-new in base.css); browsers without
 * view transitions, and reduced-motion users, get a short colour cross-fade or none.
 */
export function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  if (root.getAttribute('data-theme') === theme) {
    setThemeAttributes(theme);
    return;
  }
  const doc = document as ViewTransitionDocument;
  if (typeof doc.startViewTransition === 'function' && !prefersReducedMotion()) {
    doc.startViewTransition(() => setThemeAttributes(theme));
    return;
  }
  clearTimeout(themeTransition);
  root.classList.add('theme-changing');
  themeTransition = setTimeout(() => root.classList.remove('theme-changing'), 200);
  setThemeAttributes(theme);
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(preference));

  useEffect(() => {
    const next = resolveTheme(preference);
    setResolved(next);
    applyTheme(next);
    if (preference !== 'system' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      const value = media.matches ? 'dark' : 'light';
      setResolved(value);
      applyTheme(value);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((value: ThemePreference) => {
    writeStorage(THEME_KEY, value);
    setPreferenceState(value);
  }, []);

  return { preference, resolved, setPreference };
}
