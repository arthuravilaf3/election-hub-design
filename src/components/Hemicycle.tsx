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
//      as the scroll starts they gather into the first (blue) seats
//   B  the arc fills ALONG ITS SWEEP — from the left tip up over the crown
//      and down the other side — each seat rising into place; the camera,
//      close on the tip at first, pulls back and follows the front
//   C  "D<n>" lands once the blue side is complete, "R<n>" when the red side
//      does — on the right, with "The Right Place to Be" under it; both
//      stay, and the finished arc sits centred in the page. Only then do the
//      seats answer the pointer (the divide)
// then the pin releases and the page goes on to the feed. Reduced motion:
// the finished arc, static, with both counts.
import '../r3.css';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type React from 'react';
import type { ForecastData } from '../data/hero';
import type { Chamber } from '../data/types';
import { R3_SEATS } from '../data/r3Layout';
import { asset } from '../data/assets';
import type { StageSignal } from '../data/stageSignal';

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
  // The House's 435 seats are 21 wide (the comp); a smaller chamber gets
  // seats scaled to its looser rows — the Senate's 100 come out ~43, the
  // governors' 50 ~71 — so the arc reads as big as the House's whatever the
  // count. The cap only guards a chamber smaller still.
  const dotR = total >= 400 ? Math.min(21, step * 0.47) : Math.min(80, step * 0.42);
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
  // Colour by position along the arc, left to right: dem, toss, rep — the
  // MIRROR of the dots under the header (decided Sep 16 2026: the R lands on
  // the right, where "The Right Place to Be" goes). Each row ends up split
  // in the same proportion.
  const dem = total - rep - toss;
  const byT = [...seats].sort((a, b) => a.t - b.t || a.row - b.row);
  byT.forEach((s, i) => {
    s.party = i < dem ? 'dem' : i < dem + toss ? 'toss' : 'rep';
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
  countD: [0.54, 0.62],
  countR: [0.86, 0.94],
} as const;

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const easeSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

/** One slot per character: it drops in on its own delay when the count
    lands, and when its value changes while landed (a source or race switch)
    it ROLLS like the countdown's digits — the new figure rises from below
    while the old one leaves upward, inside the slot's clipped box. */
function Slot({ ch, i, n }: { ch: string; i: number; n: number }) {
  const prev = useRef(ch);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [rolled, setRolled] = useState(false);
  useEffect(() => {
    if (prev.current === ch) return;
    setLeaving(prev.current);
    prev.current = ch;
    setRolled(true);
    const id = window.setTimeout(() => setLeaving(null), 450);
    return () => window.clearTimeout(id);
  }, [ch]);
  return (
    <span className="r3-digit" aria-hidden="true">
      <span
        key={`in-${ch}`}
        className={`r3-digit-in${rolled ? ' r3-digit-in--roll' : ''}`}
        style={{ '--i': i, '--n': n } as React.CSSProperties}
      >
        {ch}
      </span>
      {leaving !== null && (
        <span key={`out-${leaving}`} className="r3-digit-out">
          {leaving}
        </span>
      )}
    </span>
  );
}

function Digits({ text }: { text: string }) {
  return (
    <>
      {text.split('').map((ch, i) => (
        <Slot ch={ch} i={i} n={text.length} key={`${text.length}-${i}`} />
      ))}
    </>
  );
}

// Scroll past the pin's end over which the closing curtain plays.
const CLOSE_PX = 320;

// A source or race switch recolours the seats in a WAVE from the left tip
// to the right, at the map's own pace, instead of all at once.
const WAVE_MS = 900;

const CHAMBER_BODY: Record<Chamber, string> = { house: 'House', senate: 'Senate', governor: 'governors' };

/* CHAPTER MODE (Sep 21 2026): the stage hosts the whole creative chapter —
   the arc first, then the Capitol strip and "The Nation Speaks" as scenes
   inside the same pin. The arc's own choreography is squeezed into this
   share of the pinned scroll; the rest belongs to the scenes, which cost
   the page no height of their own. */
const ARC_SHARE = 0.72;

interface HemicycleProps {
  forecast: ForecastData;
  chamber: Chamber;
  /** Host the scenes below: a shorter pin, and the arc bows out at the end. */
  chapter?: boolean;
  /** Where the pinned scroll is, for the scenes to read. */
  signal?: StageSignal;
  /** The scenes, drawn inside the pinned frame after the arc. */
  children?: ReactNode;
}

export function Hemicycle({ forecast, chamber, chapter = false, signal, children }: HemicycleProps) {
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
  const hint = useRef<HTMLParagraphElement>(null);
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Pointer in drawing units (through the camera), and the lens state per
  // seat — scale and offset, lerped each frame toward their targets.
  const lens = useRef({
    px: -1e9,
    py: -1e9,
    s: [] as number[],
    x: [] as number[],
    y: [] as number[],
    moving: false,
  });
  const view = useRef({ scale: 1, ox: 0, tx: 0, ty: 0, zoom: 1 });
  // The parties the seats had before the latest data change, and when the
  // recolour wave started (0 = no wave running).
  const wave = useRef<{ from: Party[]; start: number }>({ from: [], start: 0 });

  useLayoutEffect(() => {
    const st = stage.current;
    const sk = sticky.current;
    const el = svg.current;
    if (!st || !sk || !el) return;
    const sb = seatsBox.current;
    // Same chamber, new split: run the wave from the previous colours.
    // A different chamber is a different arc — it just rebuilds.
    const prevParties = wave.current.from;
    if (!reduced && prevParties.length === seats.length && seats.some((s, i) => s.party !== prevParties[i])) {
      wave.current = { from: prevParties, start: performance.now() };
    } else {
      wave.current = { from: seats.map((s) => s.party), start: 0 };
    }
    let raf = 0;
    let shown = -1; // smoothed progress; -1 = not painted yet
    // How far past the pin's end the page has scrolled, 0 → 1 over the
    // first CLOSE_PX: the curtain that closes the chapter before the feed.
    let over = 0;
    const target = () => {
      if (reduced) return 1;
      const stTop = st.getBoundingClientRect().top + window.scrollY;
      // The pin holds while the stage's bottom is below the sticky's bottom
      // (its top offset included) — past that the frame is pushed up and
      // the crown would slide under the nav.
      const pinTop = parseFloat(window.getComputedStyle(sk).top) || 0;
      const travel = st.offsetHeight - sk.offsetHeight - pinTop;
      const raw = (window.scrollY - stTop) / Math.max(1, travel);
      over = clamp01(((raw - 1) * travel) / CLOSE_PX);
      return clamp01(raw);
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
      signal?.set(p);
      // In chapter mode the arc plays inside its share of the pin; past it
      // the scenes take over and the arc bows out (the curtain, below).
      const pc = chapter ? clamp01(p / ARC_SHARE) : p;
      const pG = ease(span(pc, ...BEAT.gather)); // loose seats gather into the tip
      const pF = span(pc, ...BEAT.fill); // the front travels the sweep
      const pB = easeSine(span(pc, ...BEAT.pullBack)); // camera pulls back, follows the front

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
      // The seats only answer the pointer once the arc is complete.
      const settled = reduced || pc >= BEAT.fill[1];
      const hotParty = settled && hot >= 0 && hotD2 < LENS_R * LENS_R * 4 ? seats[hot].party : null;
      // The recolour wave: seats left of its front already wear the new
      // colour, seats right of it still the old one.
      const wv = wave.current;
      const waveP = wv.start ? clamp01((now - wv.start) / WAVE_MS) : 1;
      const waveFront = waveP * (1 + FRONT_W);
      let lensMoving = false;
      seats.forEach((s, i) => {
        const c = circles.current[i];
        if (!c) return;
        const party = wv.start && s.t > waveFront ? wv.from[i] : s.party;
        const cls = `r3-seat r3-seat--${party}`;
        if (c.getAttribute('class') !== cls) c.setAttribute('class', cls);
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
      // The counts land past their cue — D as the blue side completes, R
      // as the red side does, with the tagline under it — and, scrolling
      // back, leave the way they came (digits climbing back out, last in
      // first out). A count that never landed stays blank.
      const cue = (el: HTMLDivElement | null, on: boolean) => {
        if (!el) return;
        if (on) {
          el.classList.remove('is-out');
          el.classList.add('is-in');
        } else if (el.classList.contains('is-in')) {
          el.classList.remove('is-in');
          el.classList.add('is-out');
        }
      };
      cue(numRep.current, reduced || pc >= BEAT.countR[0]);
      cue(numDem.current, reduced || pc >= BEAT.countD[0]);
      // The invitation shows on the empty frame and goes with the first
      // pixel of scroll.
      hint.current?.classList.toggle('is-hidden', reduced || pc > 0.02);
      // With the arc complete the toss-up seats breathe (CSS, see .is-settled).
      sk.classList.toggle('is-settled', !reduced && settled);
      // The curtain: as the stage scrolls away, the counts shrink and fade a
      // little and the arc dims, so the chapter closes instead of just
      // leaving. Only CSS vars; the rules are in index.css.
      // The curtain: past the pin in the normal stage; at the hand-over to
      // the first scene in chapter mode.
      const close = chapter ? ease(span(p, ARC_SHARE - 0.04, ARC_SHARE + 0.06)) : ease(over);
      sk.style.setProperty('--r3-close', close.toFixed(3));
      if (sb) sb.style.filter = close > 0 ? `brightness(${(1 - 0.15 * close).toFixed(3)})` : '';
      // Keep painting while the scroll is still settling, or while loose
      // seats are drifting in view.
      const drifting = !reduced && pc < BEAT.gather[1] && onScreen();
      if (wv.start && waveP >= 1) wave.current = { from: seats.map((x) => x.party), start: 0 };
      const waving = wave.current.start > 0;
      if ((p !== want || drifting || lensMoving || waving) && !raf) raf = window.requestAnimationFrame(paint);
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
      onScroll();
    };
    const onPointerLeave = () => {
      lens.current.px = -1e9;
      lens.current.py = -1e9;
      onScroll();
    };
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
      // Whatever the seats wore last is where the next wave starts from.
      wave.current = { from: seats.map((x) => x.party), start: 0 };
    };
  }, [seats, reduced, chapter, signal]);

  return (
    <div className={`r3-stage${chapter ? ' r3-stage--chapter' : ''}`} ref={stage}>
      <div className={`r3-sticky${chapter ? ' r3-sticky--chapter' : ''}`} ref={sticky}>
        <div
          className="r3-seats"
          ref={seatsBox}
          role="img"
          aria-label={`${total} ${CHAMBER_BODY[chamber]} seats: Republicans ${rep}, toss-ups ${toss}, Democrats ${dem}.`}
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
            </g>
          </svg>
        </div>
        {/* The frame is empty before the scroll (the loose seats start at 0%),
            so it says what to do — the same voice as "Tap on a state". */}
        <p className="r3-hint" ref={hint} aria-hidden="true">
          Scroll to seat the {CHAMBER_BODY[chamber]}
        </p>
        <div className="r3-number r3-number--dem" ref={numDem}>
          <span className="visually-hidden">Democrats {dem}</span>
          <span className="r3-number-row">
            <Digits text={`D${dem}`} />
          </span>
          {/* Same height as the tagline under the R, so the two counts share
              a top edge. */}
          <span className="r3-tagline r3-tagline--spacer" aria-hidden="true" />
        </div>
        <div className="r3-number r3-number--rep" ref={numRep}>
          <span className="visually-hidden">Republicans {rep}</span>
          <span className="r3-number-row">
            <Digits text={`R${rep}`} />
          </span>
          {/* The R sits on the right, and under it the header logo's own
              lettering — the same artwork, without the hemicycle — in the
              theme's ink. */}
          <span className="r3-tagline" aria-hidden="true">
            <img className="r3-tagline-art r3-tagline-art--dark" src={asset('logos/the-right-place-text.svg')} alt="" />
            <img
              className="r3-tagline-art r3-tagline-art--light"
              src={asset('logos/the-right-place-text-light.svg')}
              alt=""
            />
          </span>
        </div>
        {/* The chapter's later scenes, drawn inside this same pinned frame. */}
        {children}
      </div>
    </div>
  );
}
