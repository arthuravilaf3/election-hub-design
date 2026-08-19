import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Dev-only: lets the Figma plugin sandbox fetch generated assets (e.g. the
  // colored map SVG) straight off this server during design handoff.
  server: { cors: true },
});
