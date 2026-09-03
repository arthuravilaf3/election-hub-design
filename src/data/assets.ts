/**
 * Resolve a file in public/ for the current deployment.
 *
 * These are referenced by RUNTIME string, not bundled imports, so Vite never
 * rewrites them. Two things can move them:
 *
 * 1. A base path. A leading "/" is right at a domain root and wrong anywhere
 *    served from a subpath, so the fallback goes through BASE_URL.
 * 2. The single-file build (scripts/pack-html.mjs), which has no sibling
 *    files at all — it injects __DW_ASSETS__, a map of the same paths to
 *    data URIs, and this consults it first.
 */
declare global {
  var __DW_ASSETS__: Record<string, string> | undefined;
}

export function asset(path: string): string {
  const clean = path.replace(/^\//, '');
  return globalThis.__DW_ASSETS__?.[clean] ?? `${import.meta.env.BASE_URL}${clean}`;
}
