// "House Colors" (Figma frame 10222:111601, Sep 2026): a strip of the
// Capitol between the seat dots and the map, in the chamber's colours. Two
// prints of the same photo — house_blue and house_red — share the frame:
// both at the photo's own scale (1052 of 1440 wide) and sitting on the
// frame's bottom edge, the blue one flush left, the red one flush right —
// the same order as the seat line above, and as the arc below (decided
// Sep 17 2026: red is always the right-hand side). The blue print shows up
// to the Democratic share plus the toss-ups, the red from the Democratic
// share on, and where they overlap they LIGHTEN into one another, so the
// toss-up band is the two colours fused.
// The split IS the race's projected split under the active source, so the
// strip moves with the dots. Both prints drift vertically together as the
// page scrolls (parallax), a touch slower than the page; still under
// reduced motion.
import '../house-colors.css';
import { useEffect, useRef } from 'react';
import { asset } from '../data/assets';
import type { ForecastData } from '../data/hero';

/* Total travel of the prints across the strip's time on screen. Deep on
   purpose (Sep 17 2026): the photos are ~130px taller than the frame and sit
   65px below its bottom edge, so ±65px of drift is the most the frame can
   take without ever showing an edge. */
const DRIFT_PX = 130;

export function HouseColors({ forecast }: { forecast: ForecastData }) {
  const frame = useRef<HTMLDivElement>(null);
  const red = useRef<HTMLImageElement>(null);
  const blue = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = frame.current;
    const prints = [red.current, blue.current].filter((x): x is HTMLImageElement => !!x);
    if (!el || prints.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      // 0 when the strip enters at the bottom of the viewport, 1 when it
      // leaves at the top; clamped so an off-screen strip does not stretch.
      const t = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
      const y = `translateY(${((0.5 - t) * DRIFT_PX).toFixed(1)}px)`;
      prints.forEach((img) => {
        img.style.transform = y;
      });
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
      {/* Blue on the left, red on the right — the order of the seat line
          above. The red print is on top and lightens over the blue. */}
      <span className="house-colors-print house-colors-print--dem">
        <img className="house-colors-photo house-colors-photo--dem" src={asset('house_blue.png')} alt="" ref={blue} />
      </span>
      <span className="house-colors-print house-colors-print--rep">
        <img className="house-colors-photo house-colors-photo--rep" src={asset('house_red.png')} alt="" ref={red} />
      </span>
    </div>
  );
}
