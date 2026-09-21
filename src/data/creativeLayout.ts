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

/* The two ways to the feed that survived review (Sep 21 2026): the chapter
   rail and the feed's own call under the map. They are independent, so the
   switch carries both and their combination — which is how the page ships
   by default, since they answer different halves of the problem: one says
   there is coverage ahead, the other already hands over a piece of it. */
export type FeedIdea = 0 | 1 | 2 | 3;

const IDEA_KEY = 'dw-feed-idea';

function parseIdea(v: string | null): FeedIdea | null {
  const n = Number(v);
  return v !== null && v !== '' && Number.isInteger(n) && n >= 0 && n <= 3 ? (n as FeedIdea) : null;
}

export function initialFeedIdea(): FeedIdea {
  let fromUrl: FeedIdea | null = null;
  try {
    fromUrl = parseIdea(new URLSearchParams(window.location.search).get('feed'));
  } catch {
    fromUrl = null;
  }
  if (fromUrl !== null) return fromUrl;
  try {
    return parseIdea(localStorage.getItem(IDEA_KEY)) ?? 3;
  } catch {
    return 3;
  }
}

export function storeFeedIdea(idea: FeedIdea): void {
  try {
    localStorage.setItem(IDEA_KEY, String(idea));
  } catch {
    // Private mode: the in-session choice still works.
  }
}

export const FEED_IDEAS: Array<{ id: FeedIdea; label: string; name: string; hint: string }> = [
  { id: 0, label: '—', name: 'Nenhuma', hint: 'O capítulo criativo inteiro entre o mapa e o feed' },
  { id: 1, label: '1', name: 'Trilho', hint: 'Índice fixo: mapa, previsão, cobertura' },
  { id: 2, label: '2', name: 'Chamada', hint: 'Três manchetes logo abaixo do mapa' },
  { id: 3, label: '1+2', name: 'As duas', hint: 'Trilho e chamada juntos' },
];
