/**
 * More Episodes — the carousel under the player, from the DW 3.0 watch page
 * ("Desktop - Default" 391:149994, frame 391:150032): a 14px Medium label,
 * 20px down to a row of 16:9 cards 16px apart that runs past the column's
 * edge, and a round 32px arrow on the right to page it.
 *
 * The row is a native horizontal scroller with snap points, so a trackpad, a
 * touch swipe and the keyboard (each card is a link) all work without the
 * arrows; the arrows only page it. The left arrow appears once there is
 * something behind it.
 */
import { useEffect, useRef, useState } from 'react';
import { MORE_EPISODES } from './homeContent';

export function MoreEpisodes() {
  const row = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const read = () =>
      setEdge({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
    read();
    el.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    return () => {
      el.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, []);

  const page = (dir: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <section className="en-more" aria-labelledby="en-more-title">
      <h2 id="en-more-title" className="en-more-title">
        More Episodes
      </h2>
      <div className={`en-more-frame${edge.end ? '' : ' has-more'}`}>
        <div className="en-more-row" ref={row}>
          {MORE_EPISODES.map((e) => (
            <a key={e.title} className="en-ep" href="https://www.dailywire.com/watch">
              <span className="en-ep-art">
                <img src={e.image} alt="" loading="lazy" />
                <span className="en-ep-length">{e.length}</span>
              </span>
              <span className="en-ep-show">{e.show}</span>
              <span className="en-ep-title">{e.title}</span>
            </a>
          ))}
        </div>
        {!edge.start && (
          <button type="button" className="en-more-arrow en-more-arrow--prev" onClick={() => page(-1)} aria-label="Previous episodes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {!edge.end && (
          <button type="button" className="en-more-arrow en-more-arrow--next" onClick={() => page(1)} aria-label="More episodes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
