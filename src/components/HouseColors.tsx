// "House Colors" (Figma frame 10222:111601, Sep 2026): a 258px strip of the
// Capitol between the seat dots and the map, washed in the chamber's
// colours. The photo is desaturated and three colour bands sit over it —
// blue, the toss-up purple, red — whose widths ARE the race's shares under
// the active source, so the strip moves with the dots. The photo drifts
// vertically inside its frame as the page scrolls (parallax), a touch
// slower than the page; still under reduced motion.
import { useEffect, useRef } from 'react';
import { asset } from '../data/assets';
import type { ForecastData } from '../data/hero';

const DRIFT_PX = 44; // total travel of the photo across the strip's time on screen (the photo is 48px taller than its frame)

export function HouseColors({ forecast }: { forecast: ForecastData }) {
  const frame = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = frame.current;
    const img = photo.current;
    if (!el || !img) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      // 0 when the strip enters at the bottom of the viewport, 1 when it
      // leaves at the top; clamped so an off-screen strip does not stretch.
      const t = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
      img.style.transform = `translateY(${((0.5 - t) * DRIFT_PX).toFixed(1)}px)`;
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // Same carve-out as the dots: the toss-up gap sits between the two blocs.
  const gap = forecast.tossupShare;
  const dem = Math.max(0, forecast.demShare - gap / 2);
  const rep = Math.max(0, 100 - dem - gap);

  return (
    <div
      className="house-colors"
      ref={frame}
      role="img"
      aria-label={`The Capitol, coloured by the projected split: Democrats ${Math.round(dem)}%, toss-ups ${Math.round(gap)}%, Republicans ${Math.round(rep)}%.`}
      style={{ '--dem': `${dem}%`, '--toss': `${gap}%` } as React.CSSProperties}
    >
      <img className="house-colors-photo" src={asset('house-colors.png')} alt="" ref={photo} />
      <span className="house-colors-band house-colors-band--dem" />
      <span className="house-colors-band house-colors-band--toss" />
      <span className="house-colors-band house-colors-band--rep" />
    </div>
  );
}
