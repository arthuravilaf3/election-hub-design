/**
 * The Polymarket wallpaper takeover (UXD-469): a leaderboard across the top
 * of the page and two gutters either side of it, with the site's rail
 * narrowed so the creative and the coverage never touch.
 *
 * THE CREATIVE IS THE ADVERTISER'S, as the task says it would be — three
 * images Arthur supplied on Oct 22 2026 (public/polymarket/). They replaced
 * a drawn stand-in; nothing here re-draws any of it, so the only thing this
 * file still owns is where the art sits and what it is clickable for.
 *
 * SAFE ZONES ARE A LAYOUT RULE, NOT A MARGIN. `[data-ad='on']` narrows the
 * page's own `--rail`, and each gutter takes exactly half of what that frees
 * — so the gutter can never grow over the content and the content can never
 * run under the gutter, whatever the window does. Below 1380px there is not
 * enough room for a gutter worth selling, so the gutters drop and the
 * leaderboard carries the buy on its own: the task's mobile fallback, with
 * no second design to keep in step.
 *
 * TWO CLICK TARGETS IN ONE BANNER. The creative draws its own "View the Hub"
 * button, and that one is OURS — it has to reach the midterms hub, not the
 * advertiser. So the banner links out to Polymarket and a hotspot sits over
 * the button, positioned in percentages of the art so it tracks the image at
 * any size. [If the creative is ever recut, the hotspot moves with it.]
 */
import { asset } from '../data/assets';
import { HUB_URL } from './ResultsBand';
import { POLYMARKET_URL } from './takeover';

/** The "View the Hub" button inside the 1000x250 leaderboard, in percent. */
const HUB_HOTSPOT = { left: '84.4%', top: '74%', width: '14.4%', height: '21%' };

export function PolymarketTakeover() {
  return (
    <>
      <aside className="pm-top" aria-label="Advertisement">
        {/* The frame is the art's own box, so the hotspot's percentages are
            of the image and not of the window. The two links are siblings:
            an anchor inside an anchor is not markup. */}
        <div className="pm-top-frame">
          <a
            className="pm-top-link"
            href={POLYMARKET_URL}
            target="_blank"
            rel="noopener noreferrer sponsored"
          >
            <img
              className="pm-top-art"
              src={asset('polymarket/leaderboard.png')}
              alt="Polymarket: follow the midterms. $50 on your first trade with code DAILYWIRE."
            />
          </a>
          <a className="pm-top-hub" href={HUB_URL} style={HUB_HOTSPOT} aria-label="View the midterms hub" />
        </div>
      </aside>

      <a
        className="pm-gutter pm-gutter--left"
        href={POLYMARKET_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
      >
        <img
          src={asset('polymarket/gutter-left.png')}
          alt="Polymarket: midterm race markets. New users get a free $50 with code DAILYWIRE."
        />
      </a>

      <a
        className="pm-gutter pm-gutter--right"
        href={POLYMARKET_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
      >
        <img
          src={asset('polymarket/gutter-right.png')}
          alt="Polymarket: balance of power markets. New users get a free $50 with code DAILYWIRE."
        />
      </a>
    </>
  );
}
