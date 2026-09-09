// Nav identity options (Sep 2026). Two treatments of the same "Header (Web)"
// bar, switchable from the NavSwitcher so they can be compared in place:
//   comp      the Figma as drawn — the 3×3 dot mark beside "The Midterms"
//   gradient  no mark; "The Midterms" itself set in the blue→red gradient
// Remembered like the phase: ?nav= wins, then localStorage, then the comp.
export const NAV_VARIANTS = ['comp', 'gradient'] as const;
export type NavVariant = (typeof NAV_VARIANTS)[number];

export const NAV_VARIANT_LABEL: Record<NavVariant, string> = {
  comp: 'Bolinhas (Figma)',
  gradient: 'Texto em gradiente',
};

const KEY = 'dw-hub-nav-variant';

function isVariant(v: unknown): v is NavVariant {
  return typeof v === 'string' && (NAV_VARIANTS as readonly string[]).includes(v);
}

export function initialNavVariant(): NavVariant {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('nav');
    if (isVariant(fromUrl)) return fromUrl;
    const stored = localStorage.getItem(KEY);
    if (isVariant(stored)) return stored;
  } catch {
    // Private mode: fall through.
  }
  return 'comp';
}

export function rememberNavVariant(v: NavVariant): void {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // Private mode: the choice just does not persist.
  }
}
