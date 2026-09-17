// "House Colors" (Figma frame 10222:111601, Sep 2026): a strip of the
// Capitol between the seat dots and the map, in the chamber's colours. Two
// prints of the same photo — house_red and house_blue — share the frame the
// way the Figma lays them (10373:204131): both at the photo's own scale
// (1052 of 1440 wide) and sitting on the frame's bottom edge, the red one
// flush left, the blue one flush right. The red print shows up to the
// Republican share plus the toss-ups, the blue from the Republican share
// on, and where they overlap the blue LIGHTENS over the red, so the toss-up
// band is the two colours fused.
// The split IS the race's projected split under the active source, so the
// strip moves with the dots. Both prints drift vertically together as the
// page scrolls (parallax), a touch slower than the page; still under
// reduced motion.
import '../house-colors.css';
import { useEffect, useRef } from 'react';
import { asset } from '../data/assets';
import type { ForecastData } from '../data/hero';

const DRIFT_PX = 44; // total travel of the photo across the strip's time on screen (the photo is 48px taller than its frame)

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
      aria-label={`The Capitol, coloured by the projected split: Republicans ${Math.round(rep)}%, toss-ups ${Math.round(gap)}%, Democrats ${Math.round(dem)}%.`}
      style={{ '--rep': `${rep}%`, '--toss': `${gap}%` } as React.CSSProperties}
    >
      {/* Red on the left, blue on the right — the order of the seat dots
          above. The blue print is on top and lightens over the red. */}
      <span className="house-colors-print house-colors-print--rep">
        <img className="house-colors-photo house-colors-photo--rep" src={asset('house_red.png')} alt="" ref={red} />
      </span>
      <span className="house-colors-print house-colors-print--dem">
        <img className="house-colors-photo house-colors-photo--dem" src={asset('house_blue.png')} alt="" ref={blue} />
      </span>
    </div>
  );
}
