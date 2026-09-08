// The Polymarket politics ticker (Sep 2026): pinned to the bottom of the
// viewport, under the RACE/SOURCE pills.
//
// STAND-IN: for now this is a static 2x capture of the live embed, because
// polymarket.com is DNS-blocked on the reviewers' network and the iframe
// rendered as a broken page. To go live again, swap the <img> for:
//   <iframe src="https://ticker.polymarket.com/embed?category=Politics&theme=dark&speed=1&displayMode=classic&height=68"
//           title="Polymarket politics ticker" width="100%" height="68" scrolling="no" />
import tickerShot from '../images/polymarket-ticker.png';

export function PolymarketTicker() {
  return (
    <aside className="poly-ticker" aria-label="Polymarket politics ticker">
      <img
        className="poly-ticker-img"
        src={tickerShot}
        width={1440}
        height={68}
        alt="Polymarket politics ticker: live market odds, static preview"
      />
    </aside>
  );
}
