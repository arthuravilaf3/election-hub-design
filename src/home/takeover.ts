/**
 * The Polymarket wallpaper takeover — the ad format UXD-469 asks for:
 * "desktop web background skin, clickable side gutters, safe zones kept
 * clear of content, mobile web fallback", with "ad not served (default Home
 * background)" as its failure state.
 *
 * `on`  the skin is served: a leaderboard across the top and two gutters
 *       either side, with the site's rail narrowed so nothing of ours ever
 *       sits under the creative.
 * `off` nothing was served, and the page is the page. This IS the PRD's
 *       failure state, not a separate mock of it.
 *
 * THE CREATIVE BELOW IS A PLACEHOLDER. UXD-469 puts "Polymarket creative
 * assets (supplied by the advertiser)" out of scope, so these markets, odds
 * and the offer are transcribed from Arthur's reference (Oct 22 2026) to
 * show the format at the right weight — they are not live Polymarket data
 * and must not be read as any. Nothing here touches the hub's own numbers.
 */
export type AdState = 'on' | 'off';

export const POLYMARKET_URL = 'https://polymarket.com/';

/** `?ad=on|off` pins the skin, the way `?stream=` pins the broadcast. */
export function parseAdParam(value: string | null): AdState | null {
  if (!value) return null;
  return value === 'on' || value === 'off' ? value : null;
}

export interface AdMarket {
  race: string;
  dem: { name: string; pct: number };
  rep: { name: string; pct: number };
}

/** Left gutter: head-to-head markets, light cards. */
export const AD_MARKETS: AdMarket[] = [
  { race: 'Georgia Governor', dem: { name: 'Bottoms', pct: 57 }, rep: { name: 'Jackson', pct: 43 } },
  { race: 'Texas Senate', dem: { name: 'Talarico', pct: 51 }, rep: { name: 'Paxton', pct: 49 } },
  { race: 'Maine Senate', dem: { name: 'Jackson', pct: 68 }, rep: { name: 'Collins', pct: 32 } },
  { race: 'Michigan Senate', dem: { name: 'El-Sayed', pct: 59 }, rep: { name: 'Rogers', pct: 41 } },
];

export interface AdOutcome {
  label: string;
  pct: number;
  side: 'dem' | 'rep';
}

export interface AdBet {
  title: string;
  chip: string;
  outcomes: [AdOutcome, AdOutcome];
  /** A single two-sided bar instead of two outcome rows. */
  split?: boolean;
}

/** Right gutter: balance-of-power markets, navy cards. */
export const AD_BETS: AdBet[] = [
  {
    title: '2026 Midterm Balance of Power',
    chip: 'Bal. of Power',
    outcomes: [
      { label: 'D House, R Senate', pct: 33, side: 'dem' },
      { label: 'R House, D Senate', pct: 31, side: 'rep' },
    ],
  },
  {
    title: 'U.S. Senate Midterm Winner',
    chip: 'Bal. of Power',
    outcomes: [
      { label: 'Democratic Party', pct: 60, side: 'dem' },
      { label: 'Republican Party', pct: 40, side: 'rep' },
    ],
  },
  {
    title: 'There’s a 60% chance Dems sweep the Midterms',
    chip: 'Bal. of Power',
    outcomes: [
      { label: 'Dem Sweep', pct: 60, side: 'dem' },
      { label: 'R Senate, Dem House', pct: 33, side: 'rep' },
    ],
  },
  {
    title: 'U.S. House Midterm Winner',
    chip: 'House',
    split: true,
    outcomes: [
      { label: 'DEM', pct: 90, side: 'dem' },
      { label: 'REP', pct: 10, side: 'rep' },
    ],
  },
];

export const AD_OFFER = { line1: 'NEW USERS GET A FREE $50', line2: 'USE CODE: DAILYWIRE' };
