// IDEA 1 — the chapter rail (Sep 21 2026): a small permanent index of the
// page's three chapters, marking where the reader is and taking them to any
// of the others in one click. It does not shorten the page; it makes the
// coverage visible from the top.
import { useEffect, useState } from 'react';
import { track } from '../data/analytics';

const MARKS = [
  { id: 'map', label: 'Map', sel: '.map-card' },
  { id: 'forecast', label: 'Forecast', sel: '.r3-stage' },
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
          <span className="chapter-rail-dot" aria-hidden="true" />
          {m.label}
        </button>
      ))}
    </nav>
  );
}
