// Three cuts of the creative edition (Sep 21 2026), switchable in the page
// so the three can be compared without rebuilding:
//
//   1  the hub with none of the new creative pieces — no Capitol strip, no
//      big arc, no "The Nation Speaks"
//   2  the arc right after the seat line, then the map; still none of the
//      other creative pieces
//   3  everything, in the order the page has it now
//
// The header (the campaign mark and the Kalshi-style headline + seat line)
// is in all three: the edition WITHOUT any of it is the base build.
//
// Read from ?layout=1|2|3 first (so a link can pin one), then from the
// stored choice; default 3. Stored, like the theme, so the mobile-preview
// frame inherits it.
export type CreativeLayout = 1 | 2 | 3;

const KEY = 'dw-creative-layout';

function parse(v: string | null): CreativeLayout | null {
  return v === '1' || v === '2' || v === '3' ? (Number(v) as CreativeLayout) : null;
}

export function initialCreativeLayout(): CreativeLayout {
  let fromUrl: CreativeLayout | null = null;
  try {
    fromUrl = parse(new URLSearchParams(window.location.search).get('layout'));
  } catch {
    fromUrl = null;
  }
  if (fromUrl) return fromUrl;
  try {
    return parse(localStorage.getItem(KEY)) ?? 3;
  } catch {
    return 3;
  }
}

export function storeCreativeLayout(layout: CreativeLayout): void {
  try {
    localStorage.setItem(KEY, String(layout));
  } catch {
    // Private mode: the in-session choice still works.
  }
}

export const CREATIVE_LAYOUTS: Array<{ id: CreativeLayout; name: string; hint: string }> = [
  { id: 1, name: 'Plain', hint: 'No creative pieces: headline, map, feed' },
  { id: 2, name: 'Arc first', hint: 'The arc after the seat line, then the map' },
  { id: 3, name: 'Full', hint: 'Map, Capitol strip, arc and The Nation Speaks' },
];
