/**
 * Resolve a file in public/ against the deployment's base path.
 *
 * These are referenced by RUNTIME string, not bundled imports, so Vite never
 * rewrites them. A leading "/" is correct at a domain root (Vercel) and wrong
 * anywhere served from a subpath — GitHub Pages puts the site at
 * /<repo>/, where "/flags/TX.png" 404s.
 *
 * BASE_URL is "/" by default and whatever `vite build --base` was given
 * otherwise, and it always ends in a slash.
 */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
