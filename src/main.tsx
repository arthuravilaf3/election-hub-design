import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HomePage } from './home/HomePage';
import { IS_HOMEPAGE } from './data/edition';
import './colors.css';
import './index.css';
import './home/home.css';

/* The homepage edition IS dailywire.com, and the site is a light surface —
   the takeover is the only dark thing on it (see `.en` in home/home.css).
   Both flags are set after the imports, so ThemeToggle's module-eval read of
   a stored 'dark' preference cannot win, and before the first paint, so the
   page never flashes the hub's dark canvas. */
if (IS_HOMEPAGE) {
  document.documentElement.dataset.theme = 'light';
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
