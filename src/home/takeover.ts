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
 * THE CREATIVE IS THE ADVERTISER'S — three images in public/polymarket/,
 * supplied Oct 22 2026, exactly as UXD-469 says it would be ("Polymarket
 * creative assets (supplied by the advertiser)" is out of our scope). The
 * markets and odds printed in them are the advertiser's, not the hub's, and
 * nothing here reads or writes a number of ours.
 */
export type AdState = 'on' | 'off';

export const POLYMARKET_URL = 'https://polymarket.com/';

/** `?ad=on|off` pins the skin, the way `?stream=` pins the broadcast. */
export function parseAdParam(value: string | null): AdState | null {
  if (!value) return null;
  return value === 'on' || value === 'off' ? value : null;
}
