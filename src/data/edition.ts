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
export const EDITION: Edition = fromUrl() ?? (built === 'base' ? 'base' : 'creative');
export const IS_CREATIVE = EDITION === 'creative';
