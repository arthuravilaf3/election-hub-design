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
//   A  the camera sits so close to the arc's crown that the rows read as
//      STRAIGHT lines; the seats arrive row by row from the top, the way
//      the page's text arrives (blur → sharp, 0 → 1)
//   B  the camera pulls back; row after row comes into frame until the
//      whole shape is in view and reads as an arc — then "R<n>" comes in
//   C  the arc slides LEFT until its blue end is in view; "R<n>" gives way
//      to "D<n>" on the right
// then the pin releases and the page goes on to the feed. Reduced motion:
// the finished arc, static, with both counts.
import { useEffect, useMemo, useRef, useState } from "react";
import type { ForecastData } from "../data/hero";
import type { Chamber } from "../data/types";

const W = 1925;
const H = 904;
const CX = W / 2;
const CY = H;
const R_OUT = 880;
const R_IN = 372;

type Party = "rep" | "toss" | "dem";

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

function buildSeats(
  total: number,
  rep: number,
  toss: number,
): { seats: Seat[]; rows: number } {
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
      seats.push({
        party: "toss",
        row: k,
        rr: r,
        t,
        ax: CX + r * Math.cos(a),
        ay: CY - r * Math.sin(a),
        r: dotR,
      });
    }
  });
  // Colour by position along the arc, left to right: rep, toss, dem — the
  // dots' own order. Each row ends up split in the same proportion.
  const byT = [...seats].sort((a, b) => a.t - b.t || a.row - b.row);
  byT.forEach((s, i) => {
    s.party = i < rep ? "rep" : i < rep + toss ? "toss" : "dem";
  });
  return { seats, rows };
}

// How close the camera starts: the crown of the arc at this scale is what
// the frame shows first, and at 3.4× a 880-radius row is straight to the eye.
const ZOOM_START = 3.4;
const CROWN_Y = CY - R_OUT; // y of the arc's crown, in drawing units
const CROWN_PAD = 120; // drawing units between the frame's top and the crown
const FOLLOW = 0.09; // per-frame fraction of the way to the real scroll position

// Where each beat sits on the pinned scroll (0 → 1). The camera moves from
// the very first pixel — a static picture under a moving finger is what
// reads as "stuck" — and the counts get their own stretch once it stops.
// One trackpad flick is roughly 0.1.
const BEAT = {
  arrive: [0, 0.4],
  pullBack: [0, 0.56],
  countR: [0.56, 0.66],
  slide: [0.72, 0.92],
} as const;

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
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
  const { seats, rows } = useMemo(
    () => buildSeats(total, rep, toss),
    [total, rep, toss],
  );

  const stage = useRef<HTMLDivElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const camera = useRef<SVGGElement>(null);
  const rowGroups = useRef<Array<SVGGElement | null>>([]);
  const [reduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

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
    const paint = () => {
      raf = 0;
      const want = target();
      shown = shown < 0 || reduced ? want : shown + (want - shown) * FOLLOW;
      if (Math.abs(want - shown) < 0.0005) shown = want;
      const p = shown;
      const pA = span(p, ...BEAT.arrive); // rows arrive, top first
      const pB = easeSine(span(p, ...BEAT.pullBack)); // camera pulls back to the whole arc
      const pR = ease(span(p, ...BEAT.countR)); // "R<n>" comes in once the arc reads as one
      const pC = easeInOut(span(p, ...BEAT.slide)); // slide left, D count

      // A: rows arrive from the top — blur and opacity per row group.
      rowGroups.current.forEach((g, k) => {
        if (!g) return;
        const local = clamp01(pA * (rows + 1.5) - k * 1.0);
        g.style.opacity = String(local);
        g.style.filter =
          local < 1 ? `blur(${((1 - local) * 6).toFixed(1)}px)` : "";
      });
      // xMinYMin meet: the drawing is the box's width or its height × aspect,
      // whichever is smaller — so it never gets clipped by the frame height.
      const box = el.getBoundingClientRect();
      const drawnW = Math.min(box.width, box.height * (W / H));
      const viewW = sk.clientWidth;
      const visUnits = (viewW / drawnW) * W; // what the frame shows, in drawing units
      // B: the camera. Scale about the crown, which travels from the middle
      // of the frame's top edge to its natural spot in the drawing.
      // Log-space zoom: 3.4× → 1.7× looks like the same amount of change as
      // 1.7× → 1×, so the pull-back reads at one steady pace.
      const zoom = Math.exp(Math.log(ZOOM_START) * (1 - pB));
      const crownX = visUnits / 2 + (CX - visUnits / 2) * pB;
      const crownY = CROWN_PAD + (CROWN_Y - CROWN_PAD) * pB;
      const cam = camera.current;
      if (cam) {
        cam.setAttribute(
          "transform",
          `translate(${(crownX - zoom * CX).toFixed(2)} ${(crownY - zoom * CROWN_Y).toFixed(2)}) scale(${zoom.toFixed(4)})`,
        );
      }
      // C: the whole drawing slides left; the numerals cross over.
      const shift = Math.max(0, drawnW - viewW);
      el.style.transform = `translateX(${(-shift * pC).toFixed(1)}px)`;
      // R is gone before D arrives, so the two never overlap half-lit.
      sk.style.setProperty("--num-r", String(1 - Math.min(1, pC * 2.2)));
      sk.style.setProperty("--num-d", String(Math.max(0, pC * 2.2 - 1.2)));
      sk.style.setProperty("--num-in", String(pR));
      if (p !== want && !raf) raf = window.requestAnimationFrame(paint);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [seats, rows, reduced]);

  return (
    <div className="r3-stage" ref={stage}>
      <div className="r3-sticky" ref={sticky}>
        <div
          className="r3-seats"
          role="img"
          aria-label={`${total} ${chamber} seats: Republicans ${rep}, toss-ups ${toss}, Democrats ${dem}.`}
        >
          <svg
            ref={svg}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMinYMin meet"
            aria-hidden="true"
          >
            <g ref={camera} className="r3-cam">
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
                      />
                    ) : null,
                  )}
                </g>
              ))}
            </g>
          </svg>
        </div>
        <div
          className="r3-number r3-number--rep"
          aria-label={`Republicans ${rep}`}
        >
          R{rep}
        </div>
        <div
          className="r3-number r3-number--dem"
          aria-label={`Democrats ${dem}`}
        >
          D{dem}
        </div>
      </div>
    </div>
  );
}
