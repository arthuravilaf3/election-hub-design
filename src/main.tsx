import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HomePage } from './home/HomePage';
import { IS_HOMEPAGE } from './data/edition';
import './colors.css';
import './index.css';
import './home/home.css';

/* The homepage edition is dailywire.com on election night, and that page is a
   DW+ DARK surface end to end (Arthur, Sep 22 2026). Dark is the token source
   of truth, so no theme is set — a stored light preference is cleared instead,
   after the imports (ThemeToggle applies it at module eval) and before the
   first paint, so the page cannot flash light. */
if (IS_HOMEPAGE) {
  delete document.documentElement.dataset.theme;
  document.documentElement.dataset.page = 'home';
}

// Ambient a11y auditing in dev: axe logs WCAG violations to the console.
if (import.meta.env.DEV) {
  import('@axe-core/react').then(({ default: axe }) => {
    axe(React, ReactDOM, 1000);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{IS_HOMEPAGE ? <HomePage /> : <App />}</React.StrictMode>
);
