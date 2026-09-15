// The prediction game's campaign card (Sep 2026): "The nation speaks, can
// you predict their voices?" It leads the feed's rail, above the ad slot —
// placement C of the four explored, chosen Sep 15.
import { track } from '../data/analytics';

export function GameRailCard() {
  return (
    <section className="game-banner game-banner--rail" aria-label="Prediction game">
      <h2 className="game-title">
        The nation speaks, <em>can you predict their voices?</em>
      </h2>
      <p className="game-sub">Call every race before Election Day and track your streak against the market.</p>
      <button type="button" className="game-cta" onClick={() => track('game_banner_cta_click', { placement: 'rail' })}>
        Make your prediction
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </section>
  );
}
