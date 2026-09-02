'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { applyTheme, readStoredTheme, storeTheme, systemTheme, type Theme } from '../model/theme';
import styles from './ThemeToggle.module.css';

// SSR has no layout phase; on the client we need one, to beat the paint.
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function ThemeToggle({ toLight, toDark }: { toLight: string; toDark: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  /*
   * Locale lives in the root layout's segment, so switching it remounts the whole tree and
   * React drops `data-theme` from <html> — an attribute it never set and does not know to
   * keep. The stored preference, not the DOM, is therefore the source of truth, and it is
   * re-applied on every mount. A layout effect, not a plain one: it runs before paint, so
   * the theme does not flicker back to system for a frame during the navigation.
   */
  useBeforePaint(() => {
    const stored = readStoredTheme();
    if (stored) applyTheme(stored);
    setTheme(stored ?? systemTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
    storeTheme(next);
  }

  // Until the effect runs we do not know the theme, so the label would be a guess.
  const label = theme === null ? '' : theme === 'dark' ? toLight : toDark;

  return (
    <button type="button" className={styles.toggle} onClick={toggle} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />
      </svg>
    </button>
  );
}
