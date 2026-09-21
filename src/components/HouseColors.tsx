// "House Colors" (Figma frame 10222:111601, Sep 2026): a strip of the
// Capitol after the map, in the chamber's colours. Two prints of the same
// photo — house_blue and house_red — share the frame at the photo's own
// scale (1052 of 1440 wide), the blue one flush left, the red one flush
// right: the seat line's order (red is always the right-hand side).
//
// The two prints OVERLAP across a band centred on the toss-ups, and the
// band moves with the active source. Revised Sep 21 2026: the overlap is a
// BLEND again, and which one depends on the theme — lighten on the light
// one, darken on the dark one, so the fused band always moves away from the
// page's own ground instead of sinking into it. The band is its own layer
// (the red print, clipped to the band) so the blend touches nothing else.
// The strip runs to the viewport's edges, with no background of its own, so
// the prints arrive from the page edges onto the page itself.
//
// Motion, in order:
//   1. SLIDE IN — when the strip comes into view the blue print slides in
//      from the left and the red from the right, meeting on the split. It
//      replays if the strip has fully left the viewport and comes back.
//   2. PARALLAX — as the page scrolls, both prints travel up inside the
//      frame, together (the seam never breaks): the domes at the top when
//      the strip enters, the colonnade by the time it leaves.
// Reduced motion: neither — the prints sit in place, cropped on the domes.
import '../house-colors.css';
import { useEffect, useRef } from 'react';
import { asset } from '../data/assets';
import type { ForecastData } from '../data/hero';

/* How far the prints travel across the strip's time on screen, as a share
   of the photo's height — about 120px at 1440 wide. Capped by the slack the
   photo leaves below the frame, so an edge never shows. */
const TRAVEL = 0.26;

/* The overlap is the toss-up share widened by this much (in points of the
   strip's width) so it reads as two photographs crossing, not a seam. It is
   centred on the toss-ups, and still grows and shrinks with them. */
const OVERLAP_PAD = 14;

export function HouseColors({ forecast }: { forecast: ForecastData }) {
  const frame = useRef<HTMLDivElement>(null);
  const red = useRef<HTMLImageElement>(null);
  const redBand = useRef<HTMLImageElement>(null);
  const blue = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = frame.current;
    const prints = [red.current, redBand.current, blue.current].filter(
      (x): x is HTMLImageElement => !!x
    );
    if (!el || prints.length < 3) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // 1. The slide: in once a third of the strip shows; reset only once it
    //    is entirely off screen, so it never visibly slides back out.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.33) el.classList.add('is-in');
        else if (!entry.isIntersecting) el.classList.remove('is-in');
      },
      { threshold: [0, 0.33] }
    );
    io.observe(el);

    // 2. The parallax.
    let raf = 0;
    const paint = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      // 0 when the strip enters at the bottom of the viewport, 1 when it
      // leaves at the top; clamped so an off-screen strip does not stretch.
      const t = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
      const photoH = prints[0].offsetHeight;
      const travel = Math.min(Math.max(0, photoH - r.height), photoH * TRAVEL);
      const y = `translateY(${(-travel * t).toFixed(1)}px)`;
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
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // Same carve-out as the seat line: the toss-up gap sits between the two
  // blocs, and the overlap is centred on it.
  const gap = forecast.tossupShare;
  const dem = Math.max(0, forecast.demShare - gap / 2);
  const rep = Math.max(0, 100 - dem - gap);
  const bandStart = Math.max(0, dem - OVERLAP_PAD / 2);
  const bandEnd = Math.min(100, dem + gap + OVERLAP_PAD / 2);

  return (
    <div
      className="house-colors"
      ref={frame}
      role="img"
      aria-label={`The Capitol, coloured by the projected split: Democrats ${Math.round(dem)}%, toss-ups ${Math.round(gap)}%, Republicans ${Math.round(rep)}%.`}
      style={{ '--band-start': `${bandStart}%`, '--band-end': `${bandEnd}%` } as React.CSSProperties}
    >
      {/* Blue on the left, red on the right — the seat line's order. The
          red comes in two layers: the plain one from the band's end on, and
          the band itself, which blends with the blue underneath. */}
      <span className="house-colors-print house-colors-print--dem">
        <img className="house-colors-photo house-colors-photo--dem" src={asset('house_blue.png')} alt="" ref={blue} />
      </span>
      <span className="house-colors-print house-colors-print--rep">
        <img className="house-colors-photo house-colors-photo--rep" src={asset('house_red.png')} alt="" ref={red} />
      </span>
      <span className="house-colors-print house-colors-print--band">
        <img className="house-colors-photo house-colors-photo--rep" src={asset('house_red.png')} alt="" ref={redBand} />
      </span>
    </div>
  );
}
