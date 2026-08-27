// Light/dark toggle. Dark is the default (the token source of truth in
// colors.css); light mode is a THEME LAYER in index.css that re-skins the
// UI-chrome tokens under [data-theme='light'] — the data encodings (rating
// scale, party ramps, results steps) are identical in both themes.
import { useState } from 'react';
import { track } from '../data/analytics';
import { IS_PREVIEW_FRAME } from './MobilePreview';

const KEY = 'dw-theme';

// Applied at module-eval time (before first render) so a stored light
// preference doesn't flash dark on load.
const stored = (() => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
})();
if (stored === 'light') document.documentElement.dataset.theme = 'light';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(stored === 'light' ? 'light' : 'dark');

  if (IS_PREVIEW_FRAME) return null; // frame inherits via localStorage

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private mode: the in-session toggle still works.
    }
    track('theme_toggle', { theme: next });
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={theme === 'light'}
      onClick={toggle}
    >
      {theme === 'dark' ? (
        // Sun — offer the light side.
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="3.4" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8.5 1.2v1.9M8.5 13.9v1.9M1.2 8.5h1.9M13.9 8.5h1.9M3.3 3.3l1.35 1.35M12.35 12.35l1.35 1.35M13.7 3.3l-1.35 1.35M4.65 12.35 3.3 13.7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        // Moon — offer the dark side.
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
          <path
            d="M14.2 10.3A6.4 6.4 0 0 1 6.7 2.8a6.4 6.4 0 1 0 7.5 7.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
