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
//   C  "R<n>" lands once the red side is complete, "D<n>" when the blue side
//      does; both stay, and the finished arc sits centred in the page
// then the pin releases and the page goes on to the feed. Reduced motion:
// the finished arc, static, with both counts.
import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { ForecastData } from '../data/hero';
import type { Chamber, District } from '../data/types';
import { R3_SEATS } from '../data/r3Layout';
import { RATING_LABEL, ratingOf, readFor, readLine } from '../data/encoding';
import { sourceLabel } from '../data/sources';

const W = 1925;
const H = 904;
const CX = W / 2;
const CY = H;
const R_OUT = 880;
const R_IN = 372;
const R_MID = (R_OUT + R_IN) / 2;
const CROWN_Y = CY - R_OUT; // y of the arc's crown

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
  /** The race this seat stands for, when the ballot has one. */
  district?: District;
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
  if (total === R3_SEATS.length) {
    // The comp's own arc: every seat where Figma put it. t is its bearing
    // from the arc's centre, left tip = 0, right tip = 1.
    R3_SEATS.forEach(([ax, ay], j) => {
      const bearing = Math.atan2(CY - ay, ax - CX); // π at the left tip → 0 at the right
      seats.push({
        party: 'toss',
        row: 0,
        t: 1 - bearing / Math.PI,
        ax,
        ay,
        r: 21,
        fx: 0,
        fy: 0,
        ph: noise(j, 3) * Math.PI * 2,
      });
    });
  } else {
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
  }
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
    s.fx = tipX + Math.cos(ang) * rr * 1.3 - s.ax;
    s.fy = tipY + Math.sin(ang) * rr - s.ay;
  });
  return { seats };
}

// How close the camera starts on the arc's left tip.
const ZOOM_START = 2.2;
// Room between the frame's top edge and the crown once the camera is all
// the way out — the outer row used to sit right on the edge and get cut.
const TOP_PAD = 40;
// Spacing of the loose seats' spread, in drawing units (≈ 3 seat widths).
const FLOAT_GAP = 64;
const FOLLOW = 0.06; // per-frame fraction of the way to the real scroll position
// Seats with t below this are the loose ones that gather first (~20).
const GATHER_T = 0.045;
// Loose seats start invisible and only fade up as the scroll starts.
const LOOSE_MIN = 0;
// Softness of the fill front, in t: a seat takes this much scroll to land.
const FRONT_W = 0.1;
const DRIFT = 14; // drawing units of bob while a seat floats
// THE DIVIDE, same as the dots under the header (see RaceHeader): the seat
// under the pointer swells, its own colour leans in, the other colours
// recoil and shrink a touch. In drawing units; the row pitch is ~46.
const PITCH = (R_OUT - R_IN) / 11;
const LENS_R = PITCH * 1.6;
const LENS_A = 0.3;
const LENS_B = PITCH * 0.18;
const LENS_PUSH = PITCH * 0.34;
const LENS_K = 0.16;

// Where each beat sits on the pinned scroll (0 → 1). The camera and the
// fill both move from the very first pixel — a static picture under a
// moving finger is what reads as "stuck". One trackpad flick is roughly 0.1.
const BEAT = {
  gather: [0, 0.22],
  fill: [0.16, 0.86],
  pullBack: [0.08, 0.6],
  countR: [0.56, 0.64],
  countD: [0.86, 0.94],
} as const;

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
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
  /** Every House district the ballot knows, so seats can name their race. */
  districts: District[];
  sourceId: string;
}

const PARTY_SEAT: Record<Party, string> = {
  rep: 'Republican seat',
  toss: 'Toss-up seat',
  dem: 'Democratic seat',
};

/** Seats are ordered by lean across the arc; the ballot's districts, sorted
    the same way, sit as one block around the party line — the closest
    races land on the toss-up seats, safe ones stay generic. */
function assignDistricts(seats: Seat[], districts: District[], sourceId: string, rep: number) {
  seats.forEach((s) => {
    s.district = undefined;
  });
  const scored = districts
    .map((d) => ({ d, read: readFor(d, sourceId) }))
    .filter((x): x is { d: District; read: NonNullable<typeof x.read> } => !!x.read)
    .map(({ d, read }) => ({
      d,
      lean: read.kind === 'market' ? (read.demOdds ?? 50) - 50 : read.margin ?? 0,
      toss: ratingOf(read) === 'tossup',
    }))
    .sort((a, b) => a.lean - b.lean); // most Republican first
  if (!scored.length) return;
  const nRep = scored.filter((x) => x.lean < 0 && !x.toss).length;
  const byT = [...seats].sort((a, b) => a.t - b.t || a.row - b.row);
  const start = Math.max(0, Math.min(byT.length - scored.length, rep - nRep));
  scored.forEach((x, i) => {
    const seat = byT[start + i];
    if (seat) seat.district = x.d;
  });
}

function seatTip(s: Seat, sourceId: string): string {
  const d = s.district;
  const read = d && readFor(d, sourceId);
  if (!d || !read) {
    return `<p class="map-tooltip-name">${PARTY_SEAT[s.party]}</p><p class="map-tooltip-source">Not among the 2026 races on the map</p>`;
  }
  const rating = ratingOf(read);
  const line = rating === 'tossup' ? readLine(read) : `${RATING_LABEL[rating]} — ${readLine(read)}`;
  return `<p class="map-tooltip-name">${d.id}</p><p class="map-tooltip-value">${line}</p><p class="map-tooltip-source">${sourceLabel(sourceId)} · Click to open on the map</p>`;
}

export function Hemicycle({ forecast, chamber, districts, sourceId }: HemicycleProps) {
  // Identical to the dots under the header, so the two never disagree.
  const total = forecast.dem + forecast.rep;
  const gap = forecast.tossupShare;
  const demShare = Math.max(0, forecast.demShare - gap / 2);
  const dem = Math.round((total * demShare) / 100);
  const toss = Math.round((total * gap) / 100);
  const rep = Math.max(0, total - dem - toss);
  const { seats } = useMemo(() => buildSeats(total, rep, toss), [total, rep, toss]);
  useMemo(() => assignDistricts(seats, districts, sourceId, rep), [seats, districts, sourceId, rep]);
  const majority = Math.floor(total / 2) + 1;

  const stage = useRef<HTMLDivElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const camera = useRef<SVGGElement>(null);
  const circles = useRef<Array<SVGCircleElement | null>>([]);
  const seatsBox = useRef<HTMLDivElement>(null);
  const numRep = useRef<HTMLDivElement>(null);
  const numDem = useRef<HTMLDivElement>(null);
  const majorityRef = useRef<SVGGElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const tipSeat = useRef(-1);
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Pointer in drawing units (through the camera), and the lens state per
  // seat — scale and offset, lerped each frame toward their targets.
  const lens = useRef({
    px: -1e9,
    py: -1e9,
    clientX: 0,
    clientY: 0,
    s: [] as number[],
    x: [] as number[],
    y: [] as number[],
    moving: false,
  });
  const view = useRef({ scale: 1, ox: 0, tx: 0, ty: 0, zoom: 1 });

  useEffect(() => {
    const st = stage.current;
    const sk = sticky.current;
    const el = svg.current;
    if (!st || !sk || !el) return;
    const sb = seatsBox.current;
    let raf = 0;
    let shown = -1; // smoothed progress; -1 = not painted yet
    const target = () => {
      if (reduced) return 1;
      const stTop = st.getBoundingClientRect().top + window.scrollY;
      // The pin holds while the stage's bottom is below the sticky's bottom
      // (its top offset included) — past that the frame is pushed up and
      // the crown would slide under the nav.
      const pinTop = parseFloat(window.getComputedStyle(sk).top) || 0;
      const travel = st.offsetHeight - sk.offsetHeight - pinTop;
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
      // The tooltip names the seat under the pointer (a little past its
      // edge) and follows it; the seat with a race gets a pointer cursor.
      const under = hot >= 0 && hotD2 < seats[hot].r * seats[hot].r * 2 ? hot : -1;
      const tipEl = tip.current;
      if (tipEl) {
        if (under !== tipSeat.current) {
          tipSeat.current = under;
          if (under >= 0) tipEl.innerHTML = seatTip(seats[under], sourceId);
          tipEl.hidden = under < 0;
          if (sb) sb.style.cursor = under >= 0 && seats[under].district ? 'pointer' : '';
        }
        if (under >= 0) {
          tipEl.style.left = `${L.clientX}px`;
          tipEl.style.top = `${L.clientY}px`;
        }
      }
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
          y += (1 - vis) * 26; // rises into its slot
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

      // xMidYMin meet: the drawing is the frame's width or its height ×
      // aspect, whichever is smaller, centred — so the finished arc sits in
      // the middle of the page at any size. In drawing units the frame's
      // centre is therefore always CX.
      const box = el.getBoundingClientRect();
      const drawnW = Math.min(box.width, box.height * (W / H));
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
      const landX = CX + (focusX - CX) * pB;
      const landY = visUnitsH * 0.45 + (focusY + TOP_PAD - visUnitsH * 0.45) * pB;
      const camTx = landX - zoom * focusX;
      const camTy = landY - zoom * focusY;
      const cam = camera.current;
      if (cam) {
        cam.setAttribute('transform', `translate(${camTx.toFixed(2)} ${camTy.toFixed(2)}) scale(${zoom.toFixed(4)})`);
      }
      view.current = { scale: W / drawnW, ox: (box.width - drawnW) / 2, tx: camTx, ty: camTy, zoom };
      // The counts land the way the countdown's digits do — each digit
      // dropping in on its own delay — once their side of the arc is
      // complete, and they STAY. Scrolling back above the cue resets them.
      numRep.current?.classList.toggle('is-in', reduced || p >= BEAT.countR[0]);
      majorityRef.current?.classList.toggle('is-in', reduced || p >= BEAT.countR[0]);
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
      L.px = ((e.clientX - box.left - v.ox) * v.scale - v.tx) / v.zoom;
      L.py = ((e.clientY - box.top) * v.scale - v.ty) / v.zoom;
      L.clientX = e.clientX;
      L.clientY = e.clientY;
      onScroll();
    };
    const onPointerLeave = () => {
      lens.current.px = -1e9;
      lens.current.py = -1e9;
      if (tip.current) tip.current.hidden = true;
      tipSeat.current = -1;
      if (sb) sb.style.cursor = '';
      onScroll();
    };
    // A click on a seat with a race opens that state on the map above.
    const onClick = () => {
      const i = tipSeat.current;
      const d = i >= 0 ? seats[i].district : undefined;
      if (!d) return;
      window.dispatchEvent(
        new CustomEvent('dw-open-map', { detail: { stateId: d.id.slice(0, 2), chamber: 'house' } })
      );
    };
    sb?.addEventListener('click', onClick);
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
      sb?.removeEventListener('click', onClick);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [seats, reduced, sourceId]);

  return (
    <div className="r3-stage" ref={stage}>
      <div className="r3-sticky" ref={sticky}>
        <div
          className="r3-seats"
          ref={seatsBox}
          role="img"
          aria-label={`${total} ${chamber} seats: Republicans ${rep}, toss-ups ${toss}, Democrats ${dem}.`}
        >
          <svg ref={svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" aria-hidden="true">
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
              {/* The line control sits on: the middle seat of the chamber.
                  Whichever colour crosses it holds the majority. */}
              <g className="r3-majority" ref={majorityRef}>
                <line className="r3-majority-halo" x1={CX} y1={CROWN_Y - 10} x2={CX} y2={CY - R_IN + 140} />
                <line className="r3-majority-line" x1={CX} y1={CROWN_Y - 10} x2={CX} y2={CY - R_IN + 140} />
                <text className="r3-majority-label" x={CX} y={CY - R_IN + 196} textAnchor="middle">
                  {majority} for control
                </text>
              </g>
            </g>
          </svg>
          <div className="map-tooltip r3-tip" ref={tip} role="status" hidden />
        </div>
        <div className="r3-number r3-number--rep" ref={numRep}>
          <span className="visually-hidden">Republicans {rep}</span>
          <Digits text={`R${rep}`} />
        </div>
        <div className="r3-number r3-number--dem" ref={numDem}>
          <span className="visually-hidden">Democrats {dem}</span>
          <Digits text={`D${dem}`} />
        </div>
      </div>
    </div>
  );
}
