// IDEA 2 — the feed's own call, under the map (Sep 21 2026): three recent
// headlines in one compact row, so coverage reaches the reader a fraction of
// a screen after the map, plus a way straight to the full list. They are the
// feed's three newest items and they appear again in the list below — a
// promo, the way a front page repeats its own lead.
import { ALL_ITEMS } from '../data/feedItems';
import { track } from '../data/analytics';

export function FeedTeaser() {
  const items = ALL_ITEMS.slice(0, 3);

  const toFeed = () => {
    track('feed_teaser_jump', {});
    const feed = document.querySelector('.feed-section');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    feed?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <section className="teaser" aria-label="Latest coverage">
      <div className="teaser-head">
        <h2>Latest coverage</h2>
        <button type="button" className="teaser-all" onClick={toFeed}>
          All coverage
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 3v10M3.5 9l4.5 4.5L12.5 9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <ul className="teaser-items">
        {items.map((item) => (
          <li key={item.id}>
            <p className="teaser-meta">
              {item.host ?? item.author} · {item.time}
            </p>
            <p className="teaser-headline">{item.headline}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
