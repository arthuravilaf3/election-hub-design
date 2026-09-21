// The creative chapter (layout 3, Sep 21 2026): the arc, the Capitol strip
// and "The Nation Speaks" in ONE pinned stage, so the three cost the page
// one stage's height instead of three blocks — the feed ends up about half
// as far from the map. A skip link rides along for readers who came for the
// coverage.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Hemicycle } from './Hemicycle';
import { HouseColors } from './HouseColors';
import { NationSpeaks } from './NationSpeaks';
import { track } from '../data/analytics';
import { createStageSignal } from '../data/stageSignal';
import type { ForecastData } from '../data/hero';
import type { Chamber } from '../data/types';

/* The scenes' slices of the pinned scroll. The arc owns 0 → 0.72 (see
   ARC_SHARE in Hemicycle); the strip and the line follow, each overlapping
   the one before so the handover is a dissolve, never a cut. */
const STRIP = [0.7, 0.88] as const;
const LINE = [0.86, 1] as const;

export function CreativeChapter({ forecast, chamber }: { forecast: ForecastData; chamber: Chamber }) {
  const signal = useMemo(() => createStageSignal(), []);
  const root = useRef<HTMLDivElement>(null);
  const [showSkip, setShowSkip] = useState(false);

  // The skip link only exists while the chapter is on screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSkip(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const skip = () => {
    track('creative_chapter_skip', {});
    const feed = document.querySelector('.feed-section') ?? document.querySelector('.plan-banner');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    feed?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div ref={root}>
      <Hemicycle forecast={forecast} chamber={chamber} chapter signal={signal}>
        <HouseColors forecast={forecast} scene={{ signal, from: STRIP[0], to: STRIP[1] }} />
        <NationSpeaks scene={{ signal, from: LINE[0], to: LINE[1] }} />
      </Hemicycle>
      {showSkip && (
        <button type="button" className="chapter-skip" onClick={skip}>
          Skip to coverage
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3.5 9l4.5 4.5L12.5 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
