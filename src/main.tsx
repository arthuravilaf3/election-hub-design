import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HomePage } from './home/HomePage';
import { IS_HOMEPAGE } from './data/edition';
import './colors.css';
import './index.css';
import './home/home.css';

/* ONE THEME (Sep 25 2026): the light/dark button is gone, so nothing can
   choose light any more. The stored preference is cleared here rather than
   ignored — a reader who left the prototype in light mode would otherwise
   be stuck in a theme with no way out. The light layer stays in index.css:
   it is a lot of work to redo and the switch may come back.

   The homepage edition was already dark end to end (Arthur, Sep 22 2026). */
try {
  localStorage.removeItem('dw-theme');
} catch {
  // Private mode: nothing was stored to begin with.
}
delete document.documentElement.dataset.theme;
if (IS_HOMEPAGE) {
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
