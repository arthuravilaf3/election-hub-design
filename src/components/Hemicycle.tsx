// R3 + R53 (Figma 10373:204824 / 10373:205502, Sep 2026): a hemicycle of
// every seat in the chamber, rated under the active source, drawn wider than
// the page (1925 across, left-aligned to the rail, clipped on the right —
// as composed), and under it the projected Republican count as a huge beige
// numeral. Both re-deal when the race or the source changes.
//
// Motion: the seats deal in as a wave from the left end of the arc; the
// numeral counts up to its value and settles, once, when it scrolls into view.
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Rating } from '../data/encoding';
import { RATING_ORDER, republicanProjection, seatBuckets } from '../data/seats';
import type { Chamber, StateRace } from '../data/types';

const W = 1925;
const H = 904;
const CX = W / 2;
const CY = H; // the arc's centre sits on the group's bottom edge
const R_OUT = 880;
const R_IN = 372;

interface Seat {
  x: number;
  y: number;
  r: number;
  rating: Rating;
  /** 0 at the left end of the arc, 1 at the right — the deal-in order. */
  t: number;
}

/** Rows and radii for a chamber of `total` seats, then the seats themselves,
    filled left to right (Republican end first) in rating order. */
function layout(total: number, buckets: Record<Rating, number>): Seat[] {
  const rows = total >= 400 ? 12 : total >= 100 ? 6 : 4;
  const step = rows > 1 ? (R_OUT - R_IN) / (rows - 1) : 0;
  const radii = Array.from({ length: rows }, (_, k) => R_IN + k * step);
  const dotR = Math.min(21, (rows > 1 ? step : 120) * 0.47);
  // Seats per row ∝ arc length, largest remainder to land on `total`.
  const arcs = radii.map((r) => Math.PI * r);
  const sum = arcs.reduce((a, b) => a + b, 0);
  const raw = arcs.map((a) => (a / sum) * total);
  const counts = raw.map(Math.floor);
  let left = total - counts.reduce((a, b) => a + b, 0);
  raw
    .map((v, i) => [v - Math.floor(v), i] as const)
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => {
      if (left > 0) {
        counts[i] += 1;
        left -= 1;
      }
    });
  const seats: Seat[] = [];
  radii.forEach((r, k) => {
    const n = counts[k];
    for (let i = 0; i < n; i += 1) {
      const t = (i + 0.5) / n; // 0 = left end
      const a = Math.PI - Math.PI * t;
      seats.push({ x: CX + r * Math.cos(a), y: CY - r * Math.sin(a), r: dotR, rating: 'tossup', t });
    }
  });
  // Rate them by angle, left to right, so each rating is a wedge.
  seats.sort((a, b) => a.t - b.t);
  let idx = 0;
  for (const rating of RATING_ORDER) {
    for (let n = 0; n < buckets[rating] && idx < seats.length; n += 1) {
      seats[idx].rating = rating;
      idx += 1;
    }
  }
  return seats;
}

interface HemicycleProps {
  races: Record<string, StateRace>;
  chamber: Chamber;
  sourceId: string;
}

export function Hemicycle({ races, chamber, sourceId }: HemicycleProps) {
  const buckets = useMemo(() => seatBuckets(races, chamber, sourceId), [races, chamber, sourceId]);
  const total = Object.values(buckets).reduce((a, b) => a + b, 0);
  const seats = useMemo(() => layout(total, buckets), [total, buckets]);
  const rep = republicanProjection(buckets);

  /* The numeral counts up once, when it comes into view; a re-deal (race or
     source change) counts from the previous value to the new one. */
  const numRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const seen = useRef(false);
  const from = useRef(0);
  useEffect(() => {
    const el = numRef.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const run = () => {
      if (reduced) {
        setShown(rep);
        from.current = rep;
        return;
      }
      const start = from.current;
      const t0 = performance.now();
      const dur = 900;
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - t, 3);
        setShown(Math.round(start + (rep - start) * e));
        if (t < 1) raf = requestAnimationFrame(tick);
        else from.current = rep;
      };
      raf = requestAnimationFrame(tick);
    };
    if (seen.current) {
      run();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !seen.current) {
        seen.current = true;
        run();
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [rep]);

  return (
    <div className="hemicycle-block">
      <div
        className="hemicycle"
        role="img"
        aria-label={`${total} seats by rating under the current source: ${RATING_ORDER.map((r) => `${buckets[r]} ${r.replace('-', ' ')}`).join(', ')}.`}
      >
        {/* Keyed on race + source so a change re-deals the wave. */}
        <svg key={`${chamber}:${sourceId}`} viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
          {seats.map((s, i) => (
            <circle
              key={i}
              className={`seat seat--${s.rating}`}
              cx={s.x}
              cy={s.y}
              r={s.r}
              style={{ '--i': s.t } as React.CSSProperties}
            />
          ))}
        </svg>
      </div>
      <div className="r-number" ref={numRef} aria-label={`Projected Republican seats: ${rep}`}>
        <span className="r-number-letter">R</span>
        <span className="r-number-value">{shown}</span>
      </div>
    </div>
  );
}
