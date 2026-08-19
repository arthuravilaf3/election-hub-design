import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './colors.css';
import './index.css';

// Ambient a11y auditing in dev: axe logs WCAG violations to the console.
if (import.meta.env.DEV) {
  import('@axe-core/react').then(({ default: axe }) => {
    axe(React, ReactDOM, 1000);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
