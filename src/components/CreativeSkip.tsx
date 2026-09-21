// "Skip to coverage" (Sep 21 2026): the creative chapter is several screens
// of scroll between the map and the feed, so while any of it is on screen
// there is one tap to the coverage. Prototype chrome, like the layout
// switch it sits opposite.
import { useEffect, useState } from 'react';
import { track } from '../data/analytics';

export function CreativeSkip() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const parts = [...document.querySelectorAll('.r3-stage, .house-colors, .nation-speaks')];
    if (!parts.length) return;
    const seen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target);
          else seen.delete(e.target);
        }
        setShow(seen.size > 0);
      },
      { threshold: 0 }
    );
    parts.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  if (!show) return null;

  const skip = () => {
    track('creative_chapter_skip', {});
    const feed = document.querySelector('.feed-section') ?? document.querySelector('.plan-banner');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    feed?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <button type="button" className="chapter-skip" onClick={skip}>
      Skip to coverage
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 3v10M3.5 9l4.5 4.5L12.5 9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
