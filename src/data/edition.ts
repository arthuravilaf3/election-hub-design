// Two editions of the hub (Sep 16 2026), one code base:
//   base      the hub without the creative team's additions
//   creative  with the Capitol photo strip (parallax) and the R3 hemicycle +
//             R53 numeral under the map
// Build-time: VITE_EDITION=base|creative (npm run build:pages makes both).
// Dev-only override: ?edition=base|creative on localhost, so both can be
// checked without rebuilding. Default is creative — the edition the work
// continues on.
export type Edition = 'base' | 'creative';

function fromUrl(): Edition | null {
  if (!import.meta.env.DEV) return null;
  try {
    const v = new URLSearchParams(window.location.search).get('edition');
    return v === 'base' || v === 'creative' ? v : null;
  } catch {
    return null;
  }
}

const built = import.meta.env.VITE_EDITION;

/* THE CUTS OF THE HERO (Sep 21 2026; renumbered Sep 24; the bar-on-top cut
   dropped Sep 25 2026 — "a 2 ta melhor"):
     2  the seat line UNDER the headline, its bars thinner, and the block at
        the foot of the column — a hairline, an eyebrow, the figures —
        landing level with the arc's end. THE HUB, now: what the base build
        and the options link both show.
     3  the full creative edition (Capitol strip, arc on scroll, The Nation
        Speaks) — never on the switch; it lives on as the /creative/ build
   Option 1 ran the seat line across the top of the hero with the clock
   under a hairline. It is gone: nothing reads ?option=1 any more, and a
   stored '1' from an earlier visit is ignored rather than honoured. With
   one cut left the switch renders nothing (see OptionSwitcher). */
export type Option = 2 | 3;
// Dev serves the options build too, so both can be checked on one port.
export const OPTIONS_BUILD = built === 'options' || import.meta.env.DEV;

export const OPTION: Option = OPTIONS_BUILD || built === 'base' ? 2 : 3;
/** The seat line stacks under the headline and the block at the foot of the
    column carries the clock — every build but the creative one. */
export const HERO_STACK = OPTION === 2;

/* The options build proper — or dev with ?option= in the URL. The pieces
   that change the BASE hub's own controls (the race segments) hang
   on this, not on OPTIONS_BUILD, so the base build and the lock/harness
   runs (dev, ?edition=base, no ?option=) keep the pills. */
function hasOptionParam(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('option');
  } catch {
    return false;
  }
}
export const OPTIONS_STRICT = built === 'options' || (import.meta.env.DEV && hasOptionParam());
/** The hub cut: the race as segments beside the source pill. */
export const RACE_SEGMENTS = OPTIONS_STRICT && OPTION !== 3;

export const EDITION: Edition =
  fromUrl() ?? (OPTIONS_BUILD ? (OPTION === 3 ? 'creative' : 'base') : built === 'base' ? 'base' : 'creative');
export const IS_CREATIVE = EDITION === 'creative';
/** The still-arc cut: creative, with its own header, hero, controls and arc. */
export const IS_STILL_ARC = IS_CREATIVE && OPTION === 2;

if (typeof document !== 'undefined') {
  // The switch's own number on <html>, so a cut's CSS can scope to it.
  document.documentElement.dataset.option = IS_CREATIVE ? '3' : '2';
}

/* OPTION 2's extras (Sep 21 2026): the Capitol strip and The Nation Speaks
   are OFF by default and switched on from the option switch — stored, so
   the preview frame and the next visit keep them. */
export interface Extras {
  capitol: boolean;
  nation: boolean;
}
const EXTRAS_KEY = 'dw-extras';

export function readExtras(): Extras {
  try {
    const v = JSON.parse(localStorage.getItem(EXTRAS_KEY) ?? '{}') as Partial<Extras>;
    return { capitol: !!v.capitol, nation: !!v.nation };
  } catch {
    return { capitol: false, nation: false };
  }
}

export function storeExtras(extras: Extras): void {
  try {
    localStorage.setItem(EXTRAS_KEY, JSON.stringify(extras));
  } catch {
    // Private mode: the in-session choice still works.
  }
}

/* OPTION 1's dots shape (Sep 21 2026): the seats as the comp's grid, as a
   full arc, or as a shallower arch — switched from the option switch and
   stored. */
export type DotsShape = 'grid' | 'arc' | 'semi';
const SHAPE_KEY = 'dw-dots-shape';

export function readDotsShape(): DotsShape {
  try {
    const v = localStorage.getItem(SHAPE_KEY);
    return v === 'arc' || v === 'semi' ? v : 'grid';
  } catch {
    return 'grid';
  }
}

export function storeDotsShape(shape: DotsShape): void {
  try {
    localStorage.setItem(SHAPE_KEY, shape);
  } catch {
    // Private mode: the in-session choice still works.
  }
}

/* THE HOMEPAGE EDITION (Sep 22 2026): dailywire.com's home with the
   election-night takeover above the hero — a separate ROOT, not a mode of the
   hub. main.tsx renders HomePage instead of App.

   It deliberately does NOT extend `Edition`. The hub still has two editions;
   everything the takeover borrows (map geometry, the reducer, the chart
   tokens) resolves exactly as it does in the hub, so nothing here can drift
   the map's encoding. Build-time VITE_EDITION=homepage; dev ?edition=homepage. */
export const IS_HOMEPAGE: boolean = (() => {
  if (built === 'homepage') return true;
  if (!import.meta.env.DEV) return false;
  try {
    return new URLSearchParams(window.location.search).get('edition') === 'homepage';
  } catch {
    return false;
  }
})();
