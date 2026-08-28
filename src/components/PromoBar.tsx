// The Prediction Game promo bar. Redesign (Aug 2026): it left the top of the
// page and became a bar FIXED to the bottom of the viewport — dark, not
// purple. It is the hub's one persistent cross-sell, so it outlives the
// scroll instead of scrolling away.
//
// The 2x2 tile is decorative: a miniature of the prediction map the CTA sells.
// The comp letters each chip, but at 7px that text is texture, not content —
// and it cannot reach AA against the rating fills. Colour alone carries it,
// which is fine precisely because it is decorative and aria-hidden.
const TILES = ['rep', 'lean-rep', 'dem', 'lean-dem'] as const;

export function PromoBar() {
  return (
    <aside className="promo-bar" aria-label="Prediction game promotion">
      <span className="promo-tiles" aria-hidden="true">
        {TILES.map((tone) => (
          <span key={tone} className={`promo-tile promo-tile--${tone}`} />
        ))}
      </span>

      <div className="promo-copy">
        <p className="promo-title">Customize your perfect election prediction map</p>
        <p className="promo-sub">
          Compare your map with the Daily Wire hosts, appear on the leaderboard, and try to predict
          the 2026 elections
        </p>
      </div>

      <a className="promo-cta" href="#prediction-game">
        Play Now
      </a>
    </aside>
  );
}
