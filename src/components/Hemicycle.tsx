// R3 + R53 as a scroll-driven stage (creative edition, Sep 16 2026).
//
// The seats are THE SAME seats as the dots under the header — rep, toss-up,
// dem, from the projected split under the active source — drawn 43px wide
// in a 1925 × 904 group (Figma 10373:204824), left on the rail, and the
// numeral is the same count the dots carry.
//
// The stage pins for ~3 screens of scroll and plays, in order:
//   A  the seats appear as a STRAIGHT block, row by row from the top, the
//      way the page's text arrives (blur → sharp, 0 → 1), with "R<n>"
//   B  every seat travels from its slot in the block to its slot on the ARC
//   C  the arc slides LEFT until its blue end is in view; "R<n>" gives way
//      to "D<n>" on the right
// then the pin releases and the page goes on to the feed. Reduced motion:
// the finished arc, static, with both counts.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ForecastData } from '../data/hero';
import type { Chamber } from '../data/types';

const W = 1925;
const H = 904;
const CX = W / 2;
const CY = H;
const R_OUT = 880;
const R_IN = 372;

type Party = 'rep' | 'toss' | 'dem';

interface Seat {
  party: Party;
  row: number;
  /** Radius of the seat's row on the arc. */
  rr: number;
  /** 0 = left end, 1 = right end of the arc; also the order along a row. */
  t: number;
  ax: number; // arc slot
  ay: number;
  r: number;
}

function buildSeats(total: number, rep: number, toss: number): { seats: Seat[]; rows: number; dotR: number } {
  const rows = total >= 400 ? 12 : total >= 100 ? 6 : 4;
  const step = rows > 1 ? (R_OUT - R_IN) / (rows - 1) : 0;
  const radii = Array.from({ length: rows }, (_, k) => R_OUT - k * step); // outer row first (top)
  const dotR = Math.min(21, (rows > 1 ? step : 120) * 0.47);
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
      const t = (i + 0.5) / n;
      const a = Math.PI - Math.PI * t;
      seats.push({ party: 'toss', row: k, rr: r, t, ax: CX + r * Math.cos(a), ay: CY - r * Math.sin(a), r: dotR });
    }
  });
  // Colour by position along the arc, left to right: rep, toss, dem — the
  // dots' own order. Each row ends up split in the same proportion.
  const byT = [...seats].sort((a, b) => a.t - b.t || a.row - b.row);
  byT.forEach((s, i) => {
    s.party = i < rep ? 'rep' : i < rep + toss ? 'toss' : 'dem';
  });
  return { seats, rows, dotR };
}

// The straight block is every arc row UNROLLED: the same seats in the same
// order, laid on a straight line, outer row on top. Between the two states
// each row BENDS — its radius shrinks from "infinite" to its arc radius —
// so no seat ever crosses another and red stays left, blue right, the
// whole way. Straight rows are drawn smaller (the outer row is 60 seats
// wide) and grow into their arc size as they bend.
const BLOCK_TOP = 24;
const BLOCK_PITCH = 3; // row pitch in the block, in seat radii

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

interface HemicycleProps {
  forecast: ForecastData;
  chamber: Chamber;
}

export function Hemicycle({ forecast, chamber }: HemicycleProps) {
  // Identical to the dots under the header, so the two never disagree.
  const total = forecast.dem + forecast.rep;
  const gap = forecast.tossupShare;
  const demShare = Math.max(0, forecast.demShare - gap / 2);
  const dem = Math.round((total * demShare) / 100);
  const toss = Math.round((total * gap) / 100);
  const rep = Math.max(0, total - dem - toss);
  const { seats, rows, dotR } = useMemo(() => buildSeats(total, rep, toss), [total, rep, toss]);

  const stage = useRef<HTMLDivElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const circles = useRef<Array<SVGCircleElement | null>>([]);
  const rowGroups = useRef<Array<SVGGElement | null>>([]);
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const st = stage.current;
    const sk = sticky.current;
    const el = svg.current;
    if (!st || !sk || !el) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const stTop = st.getBoundingClientRect().top + window.scrollY;
      const travel = st.offsetHeight - sk.offsetHeight;
      const p = reduced ? 1 : clamp01((window.scrollY - stTop) / Math.max(1, travel));
      const pA = ease(span(p, 0, 0.3)); // appear, top row first
      const pB = ease(span(p, 0.32, 0.62)); // block → arc
      const pC = ease(span(p, 0.66, 0.92)); // slide left, D count

      // A: rows arrive from the top — blur and opacity per row group.
      rowGroups.current.forEach((g, k) => {
        if (!g) return;
        const local = clamp01(pA * (rows + 2) - k) ; // stagger by row
        g.style.opacity = String(local);
        g.style.filter = local < 1 ? `blur(${((1 - local) * 10).toFixed(1)}px)` : '';
      });
      // xMinYMin meet: the drawing is the box's width or its height × aspect,
      // whichever is smaller — so it never gets clipped by the frame height.
      const box = el.getBoundingClientRect();
      const drawnW = Math.min(box.width, box.height * (W / H));
      const viewW = sk.clientWidth;
      // B: every row bends from a straight line into its arc. The straight
      // block is scaled to fit what the frame shows (in viewBox units) and
      // centred in it; the arc is centred in the drawing.
      const visUnits = (viewW / drawnW) * W;
      const s0 = Math.min(1, (visUnits * 0.94) / (Math.PI * R_OUT));
      const k = Math.max(0.001, pB);
      const w = s0 + (1 - s0) * pB;
      const apexX = visUnits / 2 + (CX - visUnits / 2) * pB;
      const pitchB = BLOCK_PITCH * dotR * s0;
      // The block sits centred in the part of the frame above the numeral
      // band, instead of hugging the top edge the way the arc does.
      const visUnitsH = (sk.clientHeight / drawnW) * W;
      const blockH = (rows - 1) * pitchB + 2 * dotR * s0;
      const blockTop = Math.max(BLOCK_TOP, (visUnitsH * 0.74 - blockH) / 2);
      seats.forEach((s, i) => {
        const c = circles.current[i];
        if (!c) return;
        const alpha = Math.PI * s.t - Math.PI / 2;
        const Rk = (s.rr * w) / k;
        const apexS = blockTop + dotR * s0 + s.row * pitchB;
        const apexF = CY - s.rr;
        const apex = apexS + (apexF - apexS) * pB;
        c.setAttribute('cx', (apexX + Rk * Math.sin(k * alpha)).toFixed(1));
        c.setAttribute('cy', (apex + Rk * (1 - Math.cos(k * alpha))).toFixed(1));
        c.setAttribute('r', (dotR * w).toFixed(1));
      });
      // C: the whole drawing slides left; the numerals cross over.
      const shift = Math.max(0, drawnW - viewW);
      el.style.transform = `translateX(${(-shift * pC).toFixed(1)}px)`;
      // R is gone before D arrives, so the two never overlap half-lit.
      sk.style.setProperty('--num-r', String(1 - Math.min(1, pC * 2.2)));
      sk.style.setProperty('--num-d', String(Math.max(0, pC * 2.2 - 1.2)));
      sk.style.setProperty('--num-in', String(pA));
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
  }, [seats, rows, dotR, reduced]);

  return (
    <div className="r3-stage" ref={stage}>
      <div className="r3-sticky" ref={sticky}>
        <div
          className="r3-seats"
          role="img"
          aria-label={`${total} ${chamber} seats: Republicans ${rep}, toss-ups ${toss}, Democrats ${dem}.`}
        >
          <svg ref={svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMin meet" aria-hidden="true">
            {Array.from({ length: rows }, (_, k) => (
              <g
                key={k}
                className="r3-row"
                ref={(g) => {
                  rowGroups.current[k] = g;
                }}
              >
                {seats.map((s, i) =>
                  s.row === k ? (
                    <circle
                      key={i}
                      className={`r3-seat r3-seat--${s.party}`}
                      cx={s.ax}
                      cy={s.ay}
                      r={s.r}
                      ref={(c) => {
                        circles.current[i] = c;
                      }}
                    />
                  ) : null
                )}
              </g>
            ))}
          </svg>
        </div>
        <div className="r3-number r3-number--rep" aria-label={`Republicans ${rep}`}>
          R{rep}
        </div>
        <div className="r3-number r3-number--dem" aria-label={`Democrats ${dem}`}>
          D{dem}
        </div>
      </div>
    </div>
  );
}
