'use client';

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  const [hydrated, setHydrated] = useState(false);

  // Initialize from storage or system preference on mount
  useEffect(() => {
    let initial: Theme = 'light';
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === 'dark' || stored === 'light') {
        initial = stored;
      } else if (
        window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ) {
        initial = 'dark';
      }
    } catch {
      // ignore — fall back to light
    }
    setTheme(initial);
    applyTheme(initial);
    setHydrated(true);
  }, []);

  const setThemePersisted = useCallback((next: Theme) => {
    setTheme(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore quota errors
    }
  }, []);

  const toggle = useCallback(() => {
    setThemePersisted(theme === 'light' ? 'dark' : 'light');
  }, [theme, setThemePersisted]);

  return { theme, toggle, setTheme: setThemePersisted, hydrated };
}
