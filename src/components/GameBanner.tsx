// The prediction game's campaign banner (Sep 2026): "The nation speaks,
// can you predict their voices?" Four placements behind ?banner=a|b|c|d so
// they can be compared in place; none by default until one is chosen.
//   a  stage   full width between the map and the feed
//   b  ribbon  one line between the countdown and the dots
//   c  rail    a card at the top of the feed's right ad rail
//   d  float   a pill pinned bottom-left, the pills' mirror
import { useEffect, useState } from 'react';
import { track } from '../data/analytics';

export type GameBannerVariant = 'a' | 'b' | 'c' | 'd';

export const GAME_BANNER: GameBannerVariant | null = (() => {
  try {
    const v = new URLSearchParams(window.location.search).get('banner');
    return v === 'a' || v === 'b' || v === 'c' || v === 'd' ? v : null;
  } catch {
    return null;
  }
})();

const TITLE = (
  <>
    The nation speaks, <em>can you predict their voices?</em>
  </>
);
const SUB = 'Call every race before Election Day and track your streak against the market.';

function Cta({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      className="game-cta"
      onClick={() => track('game_banner_cta_click', { variant: GAME_BANNER, size })}
    >
      Make your prediction
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** a: the stage. */
export function GameStage() {
  return (
    <section className="game-banner game-banner--stage" aria-label="Prediction game">
      <div>
        <p className="game-eyebrow">The Midterms prediction game</p>
        <h2 className="game-title">{TITLE}</h2>
        <p className="game-sub">{SUB}</p>
      </div>
      <Cta />
    </section>
  );
}

/** b: the ribbon. */
export function GameRibbon() {
  return (
    <section className="game-banner game-banner--ribbon" aria-label="Prediction game">
      <h2 className="game-title">{TITLE}</h2>
      <Cta size="sm" />
    </section>
  );
}

/** c: the rail card. */
export function GameRailCard() {
  return (
    <section className="game-banner game-banner--rail" aria-label="Prediction game">
      <h2 className="game-title">{TITLE}</h2>
      <p className="game-sub">{SUB}</p>
      <Cta size="sm" />
    </section>
  );
}

/** d: the floating pill — shown while the map is on screen, like the
    Race/Source pills. */
export function GameFloat() {
  const [offscreen, setOffscreen] = useState(false);
  useEffect(() => {
    const card = document.querySelector('.map-card');
    if (!card || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setOffscreen(!e.isIntersecting), {
      rootMargin: '-50% 0px 200% 0px',
      threshold: 0,
    });
    io.observe(card);
    return () => io.disconnect();
  }, []);
  return (
    <aside className={`game-banner game-banner--float${offscreen ? ' is-offscreen' : ''}`} aria-label="Prediction game">
      <p className="game-title">{TITLE}</p>
      <Cta size="sm" />
    </aside>
  );
}
