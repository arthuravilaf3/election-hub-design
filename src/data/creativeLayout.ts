// Three cuts of the creative edition (Sep 21 2026, from Arthur's three Figma
// options), switchable in the page so they can be compared without
// rebuilding. All three drop the dots grid and carry the timer pinned with
// the race and source controls:
//
//   1  the plain hub — masthead, headline, seat line, map, legend, banner,
//      feed
//   2  a STILL arc of the chamber's seats between the seat line and the map
//      (same hover as the dots had), a wider map, and the chapter rail
//   3  cut 1 with the giant scroll-driven arc after the banner, before the
//      feed, and the chapter rail
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
  { id: 1, name: 'Plain', hint: 'Headline, seat line, map, banner, feed' },
  { id: 2, name: 'Still arc', hint: 'The seats as a still arc between the seat line and the map' },
  { id: 3, name: 'Big arc', hint: 'The scroll-driven arc after the banner, before the feed' },
];
