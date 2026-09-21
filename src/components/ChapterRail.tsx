// The chapter rail (Sep 21 2026, Figma "Option 2/3" frames): a small index
// of the page's three chapters down the left edge — a dash and a word each.
// The chapter on screen wears a longer white dash; hovering another one
// grows its dash to the right and lights it the same way; a click goes
// there. It does not shorten the page; it makes the coverage reachable from
// the top.
import { useEffect, useState } from 'react';
import { track } from '../data/analytics';

const MARKS = [
  { id: 'forecast', label: 'Forecast', sel: '.dots--creative' },
  { id: 'map', label: 'Map', sel: '.map-card' },
  { id: 'coverage', label: 'Coverage', sel: '.feed-section' },
];

export function ChapterRail() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + window.innerHeight * 0.35;
      let at = 0;
      MARKS.forEach((m, i) => {
        const el = document.querySelector(m.sel);
        if (el && el.getBoundingClientRect().top + window.scrollY <= y) at = i;
      });
      setActive(at);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const go = (i: number) => {
    const el = document.querySelector(MARKS[i].sel);
    if (!el) return;
    track('chapter_rail_jump', { to: MARKS[i].id });
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <nav className="chapter-rail" aria-label="Page chapters">
      {MARKS.map((m, i) => (
        <button
          key={m.id}
          type="button"
          className={`chapter-rail-item${i === active ? ' is-at' : ''}`}
          aria-current={i === active ? 'true' : undefined}
          onClick={() => go(i)}
        >
          <span className="chapter-rail-dash" aria-hidden="true" />
          {m.label}
        </button>
      ))}
    </nav>
  );
}
