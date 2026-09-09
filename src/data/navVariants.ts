// Nav identity explorations (Sep 2026). Seven treatments of the same
// "Header (Web)" bar, switchable from the NavSwitcher so they can be
// compared in place. `comp` is the Figma as drawn; the rest borrow a motif
// from the hub page itself. Remembered like the phase: ?nav= wins, then
// localStorage, then the comp.
export const NAV_VARIANTS = [
  'comp',
  'live',
  'goo',
  'clock',
  'progress',
  'marquee',
  'mark26',
] as const;
export type NavVariant = (typeof NAV_VARIANTS)[number];

export const NAV_VARIANT_LABEL: Record<NavVariant, string> = {
  comp: 'Figma (base)',
  live: 'Bolinhas = placar',
  goo: 'Goo no hover',
  clock: 'Countdown na nav',
  progress: 'Hairline de scroll',
  marquee: 'Dots em marcha',
  mark26: "Logo vira '26",
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
