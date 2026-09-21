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
