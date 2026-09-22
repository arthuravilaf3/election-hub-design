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

/* THE OPTIONS BUILD (Sep 21 2026): one link, three cuts to pick from —
     1  the base hub (the dots header)
     2  the creative edition with all its pieces (Capitol strip, arc on
        scroll, The Nation Speaks)
     3  the still-arc cut (Figma 11589:227618): timer pinned with the race
        segments and the source chip, still arc under the seat line, rail
   Only VITE_EDITION=options reads the choice (?option= first, then the
   stored one; default 3). The other builds are fixed at their edition. The
   switch reloads the page: the edition is a module-level constant, read
   once, everywhere. */
export type Option = 1 | 2 | 3;
// Dev serves the options build too, so all three can be checked on one port.
export const OPTIONS_BUILD = built === 'options' || import.meta.env.DEV;
const OPTION_KEY = 'dw-option';

function parseOption(v: string | null): Option | null {
  return v === '1' || v === '2' || v === '3' ? (Number(v) as Option) : null;
}

function readOption(): Option {
  try {
    const fromQuery = parseOption(new URLSearchParams(window.location.search).get('option'));
    if (fromQuery) {
      localStorage.setItem(OPTION_KEY, String(fromQuery));
      return fromQuery;
    }
    return parseOption(localStorage.getItem(OPTION_KEY)) ?? 3;
  } catch {
    return 3;
  }
}

export const OPTION: Option = OPTIONS_BUILD ? readOption() : built === 'base' ? 1 : 2;

/* The options build proper — or dev with ?option= in the URL. The pieces
   that change the BASE hub's own controls (option 1's race segments) hang
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
/** Option 1 in the options build: the race as segments beside the source pill. */
export const RACE_SEGMENTS = OPTIONS_STRICT && OPTION === 1;

export function selectOption(next: Option): void {
  try {
    localStorage.setItem(OPTION_KEY, String(next));
  } catch {
    // Private mode: the URL carries it.
  }
  const url = new URL(window.location.href);
  url.searchParams.set('option', String(next));
  window.location.assign(url.toString());
}

export const EDITION: Edition =
  fromUrl() ?? (OPTIONS_BUILD ? (OPTION === 1 ? 'base' : 'creative') : built === 'base' ? 'base' : 'creative');
export const IS_CREATIVE = EDITION === 'creative';
/** The still-arc cut: creative, with its own header, hero, controls and arc. */
export const IS_OPTION3 = IS_CREATIVE && OPTION === 3;

if (typeof document !== 'undefined') {
  document.documentElement.dataset.option = IS_OPTION3 ? '3' : IS_CREATIVE ? '2' : '1';
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
