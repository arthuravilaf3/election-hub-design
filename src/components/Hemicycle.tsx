// R3 + R53 as a scroll-driven stage (creative edition, Sep 16 2026).
//
// The seats are THE SAME seats as the dots under the header — rep, toss-up,
// dem, from the projected split under the active source — drawn 43px wide
// in a 1925 × 904 group (Figma 10373:204824), left on the rail, and the
// numeral is the same count the dots carry.
//
// The stage pins for ~4 screens of scroll and plays, in order, with the
// scroll position SMOOTHED (each frame closes a fraction of the distance to
// where the scroll actually is), so a wheel notch reads as motion, not a cut:
//   A  a handful of seats FLOAT loose near the arc's left tip, drifting;
//      as the scroll starts they gather into the first red seats
//   B  the arc fills ALONG ITS SWEEP — from the left tip up over the crown
//      and down the other side — each seat rising into place; the camera,
//      close on the tip at first, pulls back and follows the front
//   C  "R<n>" lands once the red side is complete; the drawing slides LEFT
//      so the blue side finishes in view, and "D<n>" lands when it does
// then the pin releases and the page goes on to the feed. Reduced motion:
// the finished arc, static, with both counts.
import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { ForecastData } from '../data/hero';
import type { Chamber } from '../data/types';

const W = 1925;
const H = 904;
const CX = W / 2;
const CY = H;
const R_OUT = 880;
const R_IN = 372;
const R_MID = (R_OUT + R_IN) / 2;

type Party = 'rep' | 'toss' | 'dem';

interface Seat {
  party: Party;
  row: number;
  /** 0 = left end, 1 = right end of the arc — the order the arc fills in. */
  t: number;
  ax: number; // arc slot
  ay: number;
  r: number;
  /** Where the seat floats from before it gathers (drawing units, relative). */
  fx: number;
  fy: number;
  /** Phase of its drift, so the loose seats don't bob in unison. */
  ph: number;
}

// Deterministic per-seat noise: the float positions are the same on every
// visit and in every screenshot.
function noise(i: number, k: number) {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildSeats(total: number, rep: number, toss: number): { seats: Seat[] } {
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
      const j = seats.length;
      seats.push({
        party: 'toss',
        row: k,
        t,
        ax: CX + r * Math.cos(a),
        ay: CY - r * Math.sin(a),
        r: dotR,
        fx: 0,
        fy: 0,
        ph: noise(j, 3) * Math.PI * 2,
      });
    }
  });
  // Colour by position along the arc, left to right: rep, toss, dem — the
  // dots' own order. Each row ends up split in the same proportion.
  const byT = [...seats].sort((a, b) => a.t - b.t || a.row - b.row);
  byT.forEach((s, i) => {
    s.party = i < rep ? 'rep' : i < rep + toss ? 'toss' : 'dem';
  });
  // The loose seats float on a sunflower spread around the tip — evenly
  // spaced, never stacked — dealt out in a shuffled order so neighbours on
  // the arc don't sit next to each other in the cloud.
  const loose = seats.filter((s) => s.t < GATHER_T);
  const order = loose.map((s, k) => [noise(k, 7), s] as const).sort((a, b) => a[0] - b[0]);
  const tipX = CX - R_MID;
  const tipY = CY - 110;
  order.forEach(([, s], k) => {
    const rr = FLOAT_GAP * Math.sqrt(k + 0.6);
    const ang = k * 2.39996 + noise(k, 8) * 0.5;
    s.fx = tipX + Math.cos(ang) * rr * 1.25 - s.ax;
    s.fy = tipY + Math.sin(ang) * rr * 0.8 - s.ay;
  });
  return { seats };
}

// How close the camera starts on the arc's left tip.
const ZOOM_START = 2.2;
// Room between the frame's top edge and the crown once the camera is all
// the way out — the outer row used to sit right on the edge and get cut.
const TOP_PAD = 72;
// Spacing of the loose seats' spread, in drawing units (≈ 1.7 seat widths).
const FLOAT_GAP = 36;
const FOLLOW = 0.09; // per-frame fraction of the way to the real scroll position
// Seats with t below this are the loose ones that gather first (~20).
const GATHER_T = 0.045;
// Loose seats are translucent and only fade up as the scroll starts.
const LOOSE_MIN = 0.14;
// Softness of the fill front, in t: a seat takes this much scroll to land.
const FRONT_W = 0.07;
const DRIFT = 14; // drawing units of bob while a seat floats
// THE DIVIDE, same as the dots under the header (see RaceHeader): the seat
// under the pointer swells, its own colour leans in, the other colours
// recoil and shrink a touch. In drawing units; the row pitch is ~46.
const PITCH = (R_OUT - R_IN) / 11;
const LENS_R = PITCH * 1.6;
const LENS_A = 0.3;
const LENS_B = PITCH * 0.18;
const LENS_PUSH = PITCH * 0.34;
const LENS_K = 0.2;

// Where each beat sits on the pinned scroll (0 → 1). The camera and the
// fill both move from the very first pixel — a static picture under a
// moving finger is what reads as "stuck". One trackpad flick is roughly 0.1.
const BEAT = {
  gather: [0, 0.22],
  fill: [0.16, 0.9],
  pullBack: [0.08, 0.6],
  countR: [0.54, 0.62],
  slide: [0.62, 0.9],
  countD: [0.88, 0.96],
} as const;

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

/** One slot per character, so each can drop in on its own delay. */
function Digits({ text }: { text: string }) {
  return (
    <>
      {text.split('').map((ch, i) => (
        <span className="r3-digit" key={i} aria-hidden="true">
          <span className="r3-digit-in" style={{ '--i': i } as React.CSSProperties}>
            {ch}
          </span>
        </span>
      ))}
    </>
  );
}

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
  const { seats } = useMemo(() => buildSeats(total, rep, toss), [total, rep, toss]);

  const stage = useRef<HTMLDivElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const camera = useRef<SVGGElement>(null);
  const circles = useRef<Array<SVGCircleElement | null>>([]);
  const seatsBox = useRef<HTMLDivElement>(null);
  const numRep = useRef<HTMLDivElement>(null);
  const numDem = useRef<HTMLDivElement>(null);
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Pointer in drawing units (through the camera), and the lens state per
  // seat — scale and offset, lerped each frame toward their targets.
  const lens = useRef({ px: -1e9, py: -1e9, s: [] as number[], x: [] as number[], y: [] as number[], moving: false });
  const view = useRef({ scale: 1, tx: 0, ty: 0, zoom: 1 });

  useEffect(() => {
    const st = stage.current;
    const sk = sticky.current;
    const el = svg.current;
    if (!st || !sk || !el) return;
    let raf = 0;
    let shown = -1; // smoothed progress; -1 = not painted yet
    const target = () => {
      if (reduced) return 1;
      const stTop = st.getBoundingClientRect().top + window.scrollY;
      const travel = st.offsetHeight - sk.offsetHeight;
      return clamp01((window.scrollY - stTop) / Math.max(1, travel));
    };
    const onScreen = () => {
      const r = sk.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    };
    const paint = (now: number) => {
      raf = 0;
      const want = target();
      shown = shown < 0 || reduced ? want : shown + (want - shown) * FOLLOW;
      if (Math.abs(want - shown) < 0.0005) shown = want;
      const p = shown;
      const pG = ease(span(p, ...BEAT.gather)); // loose seats gather into the tip
      const pF = span(p, ...BEAT.fill); // the front travels the sweep
      const pB = easeSine(span(p, ...BEAT.pullBack)); // camera pulls back, follows the front
      const pC = easeInOut(span(p, ...BEAT.slide)); // slide left so the blue side finishes in view

      // A + B: each seat is either loose (gathering) or on the front (landing).
      const front = GATHER_T + (1 - GATHER_T + FRONT_W) * pF;
      const wob = now / 900;
      const L = lens.current;
      // The hot seat: nearest to the pointer, if the pointer is near any.
      let hot = -1;
      let hotD2 = Infinity;
      if (L.px > -1e8) {
        seats.forEach((s, i) => {
          const dx = L.px - s.ax;
          const dy = L.py - s.ay;
          const d2 = dx * dx + dy * dy;
          if (d2 < hotD2) {
            hotD2 = d2;
            hot = i;
          }
        });
      }
      const hotParty = hot >= 0 && hotD2 < LENS_R * LENS_R * 4 ? seats[hot].party : null;
      let lensMoving = false;
      seats.forEach((s, i) => {
        const c = circles.current[i];
        if (!c) return;
        let x = s.ax;
        let y = s.ay;
        let vis = 1;
        if (s.t < GATHER_T) {
          const loose = 1 - pG;
          x += (s.fx + Math.sin(wob + s.ph) * DRIFT) * loose;
          y += (s.fy + Math.cos(wob * 0.8 + s.ph) * DRIFT) * loose;
          // Translucent while loose, each fading up at its own moment of
          // the gather, solid once seated.
          const up = clamp01(pG * 1.6 - s.ph / (Math.PI * 2) * 0.6);
          vis = LOOSE_MIN + (1 - LOOSE_MIN) * up;
        } else {
          vis = clamp01((front - s.t) / FRONT_W);
          y += (1 - vis) * 34; // rises into its slot
        }
        // The lens, on top of wherever the choreography put the seat.
        let ts = 1;
        let tx = 0;
        let ty = 0;
        if (hotParty) {
          const dx = L.px - s.ax;
          const dy = L.py - s.ay;
          const d2 = dx * dx + dy * dy;
          if (d2 < LENS_R * LENS_R * 4) {
            const w = Math.exp(-d2 / (LENS_R * LENS_R));
            const d = Math.sqrt(d2) || 1;
            if (s.party !== hotParty) {
              ts = 1 - 0.1 * w;
              tx = (-dx / d) * LENS_PUSH * w;
              ty = (-dy / d) * LENS_PUSH * w;
            } else {
              ts = 1 + LENS_A * w;
              tx = (dx / d) * LENS_B * w;
              ty = (dy / d) * LENS_B * w;
            }
          }
        }
        const ps = L.s[i] ?? 1;
        const pxo = L.x[i] ?? 0;
        const pyo = L.y[i] ?? 0;
        let ns = ps + (ts - ps) * LENS_K;
        let nx = pxo + (tx - pxo) * LENS_K;
        let ny = pyo + (ty - pyo) * LENS_K;
        if (Math.abs(ns - 1) < 0.002 && Math.abs(nx) < 0.05 && Math.abs(ny) < 0.05) {
          ns = 1;
          nx = 0;
          ny = 0;
        } else {
          lensMoving = true;
        }
        L.s[i] = ns;
        L.x[i] = nx;
        L.y[i] = ny;
        c.setAttribute('cx', (x + nx).toFixed(1));
        c.setAttribute('cy', (y + ny).toFixed(1));
        c.setAttribute('r', (s.r * (0.55 + 0.45 * vis) * ns).toFixed(1));
        c.style.opacity = vis.toFixed(3);
        // Blur → sharp as it appears, the way the page's text arrives. Only
        // the seats still arriving carry a filter.
        c.style.filter = vis < 0.999 ? `blur(${((1 - vis) * 9).toFixed(1)}px)` : '';
      });
      L.moving = lensMoving;

      // xMinYMin meet: the drawing is the box's width or its height × aspect,
      // whichever is smaller — so it never gets clipped by the frame height.
      const box = el.getBoundingClientRect();
      const drawnW = Math.min(box.width, box.height * (W / H));
      const viewW = sk.clientWidth;
      const visUnits = (viewW / drawnW) * W; // what the frame shows, in drawing units
      const visUnitsH = (sk.clientHeight / drawnW) * W;
      // The camera: close on the left tip, then out and along the sweep to
      // the crown. Log-space zoom so the pull-back reads at one steady pace.
      // At pB = 1 it is a plain drop of TOP_PAD, which phase C's slide builds on.
      const zoom = Math.exp(Math.log(ZOOM_START) * (1 - pB));
      // The focus rides the fill front (never past the crown), halfway
      // between the baseline and the front's height, so the tip's bottom
      // seats stay in frame above the numeral band while it climbs.
      const theta = Math.PI - Math.PI * Math.min(0.5, front);
      const focusX = CX + R_MID * Math.cos(theta);
      const focusY = CY - R_MID * Math.sin(theta) * 0.5;
      const landX = visUnits / 2 + (focusX - visUnits / 2) * pB;
      const landY = visUnitsH * 0.45 + (focusY + TOP_PAD - visUnitsH * 0.45) * pB;
      const camTx = landX - zoom * focusX;
      const camTy = landY - zoom * focusY;
      const cam = camera.current;
      if (cam) {
        cam.setAttribute('transform', `translate(${camTx.toFixed(2)} ${camTy.toFixed(2)}) scale(${zoom.toFixed(4)})`);
      }
      view.current = { scale: W / drawnW, tx: camTx, ty: camTy, zoom };
      // C: the whole drawing slides left; the numerals take turns.
      const shift = Math.max(0, drawnW - viewW);
      el.style.transform = `translateX(${(-shift * pC).toFixed(1)}px)`;
      // The counts land the way the countdown's digits do — each digit
      // dropping in on its own delay — once their side of the arc is
      // complete, and they STAY. Scrolling back above the cue resets them.
      numRep.current?.classList.toggle('is-in', reduced || p >= BEAT.countR[0]);
      numDem.current?.classList.toggle('is-in', reduced || p >= BEAT.countD[0]);
      // Keep painting while the scroll is still settling, or while loose
      // seats are drifting in view.
      const drifting = !reduced && p < BEAT.gather[1] && onScreen();
      if ((p !== want || drifting || lensMoving) && !raf) raf = window.requestAnimationFrame(paint);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(paint);
    };
    // The pointer, taken through the svg's own slide and the camera, lands
    // in drawing units — the space the seats are laid out in.
    const onPointerMove = (e: PointerEvent) => {
      if (reduced || e.pointerType === 'touch') return;
      const box = el.getBoundingClientRect();
      const v = view.current;
      const L = lens.current;
      L.px = ((e.clientX - box.left) * v.scale - v.tx) / v.zoom;
      L.py = ((e.clientY - box.top) * v.scale - v.ty) / v.zoom;
      onScroll();
    };
    const onPointerLeave = () => {
      lens.current.px = -1e9;
      lens.current.py = -1e9;
      onScroll();
    };
    const sb = seatsBox.current;
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    sb?.addEventListener('pointermove', onPointerMove);
    sb?.addEventListener('pointerleave', onPointerLeave);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      sb?.removeEventListener('pointermove', onPointerMove);
      sb?.removeEventListener('pointerleave', onPointerLeave);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [seats, reduced]);

  return (
    <div className="r3-stage" ref={stage}>
      <div className="r3-sticky" ref={sticky}>
        <div
          className="r3-seats"
          ref={seatsBox}
          role="img"
          aria-label={`${total} ${chamber} seats: Republicans ${rep}, toss-ups ${toss}, Democrats ${dem}.`}
        >
          <svg ref={svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMin meet" aria-hidden="true">
            <g ref={camera} className="r3-cam">
              {seats.map((s, i) => (
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
              ))}
            </g>
          </svg>
        </div>
        <div className="r3-number r3-number--rep" ref={numRep} aria-label={`Republicans ${rep}`}>
          <Digits text={`R${rep}`} />
        </div>
        <div className="r3-number r3-number--dem" ref={numDem} aria-label={`Democrats ${dem}`}>
          <Digits text={`D${dem}`} />
        </div>
      </div>
    </div>
  );
}
