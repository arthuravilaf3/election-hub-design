// The map. Encoding rule (see colors.css): LIGHT = ESTIMATE, SOLID = FACT.
// - prediction: saturation encodes the ACTIVE SOURCE's confidence, on that
//   source's own ramp (points for polls, implied probability for markets)
// - results/counting: light leader fill + diagonal hatch, capped below solid
// - results/called: full saturation, reached via the CSS "hardening"
//   transition on fill (+ a one-shot WAAPI flash)
//
// THE CAMERA (House only). Clicking a state flies the map to it and blurs the
// rest, so the curated districts inside have room to be read. The blur is one
// filter on one group, not fifty per-path filters — per-path SVG filters each
// allocate their own filter region and that is the expensive way to do this.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { animate } from 'motion/mini';
import { MAP_VIEWBOX, STATE_SHAPES } from '../data/states';
import { CAMERA_MS, ZOOM_REGION_W } from '../data/layout';
import { buildCounties, type CountyCell } from '../data/counties';
import {
  countingStep,
  describeRace,
  fillFor,
  isHatched,
  hasNoRead,
  labelToneFor,
  ratingOf,
  readFor,
  type Rating,
} from '../data/encoding';
import { CHAMBER_LABEL } from '../data/summary';
import type { Chamber, StateRace } from '../data/types';
import { STAGGER_STEP_MS } from '../state/useElectionData';
import { useFlash } from '../hooks/useFlash';
import { MapTooltip } from './MapTooltip';

interface TooltipState {
  id: string;
  name: string;
  x: number;
  y: number;
}

interface ElectionMapProps {
  races: Record<string, StateRace>;
  chamber: Chamber;
  /** The global source. Per-state trust picks override it (see `trust`). */
  sourceId: string;
  /** stateId -> trusted sourceId for THIS chamber. Resolution is pick first,
   *  global second — and a pick with no data stays empty (never a silent
   *  fallback to the global source). */
  trust: Record<string, string>;
  selectedId: string | null;
  zoomedId: string | null;
  /** True during a coordinated full-map cutover: fills transition with a wave stagger. */
  staggering: boolean;
  flash: { stateId: string; nonce: number } | null;
  /** Phase gate: the mock county choropleth is depth, not the base map. */
  showCounties?: boolean;
  onSelect: (stateId: string) => void;
  onZoom: (stateId: string) => void;
  onClearZoom: () => void;
}

const [, , VIEW_W, VIEW_H] = MAP_VIEWBOX.split(' ').map(Number);
const ZOOM_FILL = 0.78; // fraction of that region the state fills
const MAX_ZOOM = 7;
const REST_BLUR_PX = 2.5;

/**
 * How much of the frame is left of the drawer — the region the zoomed state
 * has to fit inside, silhouette fully visible beside the panel.
 *
 * MEASURED, not declared. This used to be the literal 0.52, hand-matched to
 * `.drawer { width: min(565px, 46%) }` in the stylesheet; the two could drift
 * apart with any width or breakpoint change and the state would slide under
 * the panel. The drawer is absolutely positioned inside `.map-and-panel`, so
 * its offsetLeft IS the left region's width in px.
 *
 * Falls back to the declared fraction when the panel is not mounted, and
 * returns the whole frame when the drawer is not in the frame's flow at all
 * (mobile: it is a fixed bottom sheet, so the map keeps the full width).
 */
function measureRegionW(svg: SVGSVGElement | null): number {
  const frame = svg?.closest('.map-and-panel') as HTMLElement | null;
  if (!frame) return ZOOM_REGION_W;
  const drawer = frame.querySelector('.drawer') as HTMLElement | null;
  if (!drawer) return ZOOM_REGION_W;
  if (drawer.offsetParent !== frame) return 1;
  const frameW = frame.clientWidth;
  if (!frameW) return ZOOM_REGION_W;
  return Math.min(1, Math.max(0.2, drawer.offsetLeft / frameW));
}

/* County choropleth: same encoding as the state map, one level down. Each
   county's read jitters deterministically around the STATE's read — a mock
   of "how each county is voting" until county-level data exists. */
const RATING_ORDER: Rating[] = [
  'safe-dem',
  'likely-dem',
  'lean-dem',
  'tossup',
  'lean-rep',
  'likely-rep',
  'safe-rep',
];

function countyJitter(stateId: string, i: number): number {
  // Deterministic -2..2, stable across renders and sessions.
  const h = (i * 7 + stateId.charCodeAt(0) * 13 + stateId.charCodeAt(1) * 31) % 5;
  return h - 2;
}

function countyPaint(
  race: StateRace,
  sourceId: string,
  stateId: string,
  i: number
): { fill: string; tone: 'dark' | 'light' } {
  const j = countyJitter(stateId, i);
  if (race.mode === 'prediction') {
    const read = readFor(race, sourceId);
    if (!read) return { fill: 'var(--no-read)', tone: 'light' };
    const idx = Math.max(0, Math.min(6, RATING_ORDER.indexOf(ratingOf(read)) + j));
    const rating = RATING_ORDER[idx];
    return {
      fill: `var(--rating-${rating})`,
      tone: rating === 'tossup' || rating.startsWith('lean') ? 'dark' : 'light',
    };
  }
  const res = race.results;
  if (!res || !res.leader) return { fill: 'var(--uncalled)', tone: 'dark' };
  // TENET GUARD: counting counties never reach solid (steps 1-3); only a
  // called race's counties sit at the saturated end (4-5).
  const step =
    res.status === 'called'
      ? j > 0
        ? 5
        : 4
      : Math.max(1, Math.min(3, countingStep(res.reporting) + Math.sign(j)));
  return { fill: `var(--${res.leader}-${step})`, tone: step <= 2 ? 'dark' : 'light' };
}

const IDENTITY = 'translate(0px, 0px) scale(1)';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Label nudges (viewBox units) for states whose bbox CENTER falls outside or
 * at the edge of the land: Louisiana's boot/delta pulls the center southeast,
 * Florida's panhandle+peninsula L-shape parks it over the Gulf bend.
 */
const LABEL_NUDGE: Record<string, { dx: number; dy: number }> = {
  LA: { dx: -10, dy: -2 },
  FL: { dx: 36, dy: 20 },
};

export function ElectionMap({
  races,
  chamber,
  sourceId,
  trust,
  selectedId,
  zoomedId,
  staggering,
  flash,
  showCounties = true,
  onSelect,
  onZoom,
  onClearZoom,
}: ElectionMapProps) {
  const pathRefs = useRef(new Map<string, SVGPathElement>());
  const cameraRef = useRef<SVGGElement>(null);
  const restRef = useRef<SVGGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  /** Geometry centers for the state-abbreviation labels (measured once). */
  const [labelBoxes, setLabelBoxes] = useState<Record<string, Box>>({});
  /** Mock county cells, built lazily per state and cached (geometry is static). */
  const countyCache = useRef(new Map<string, CountyCell[]>());
  /** Counties mount only AFTER the camera lands: polygons + labels inside
   *  the transform-animated group re-raster every frame of the flight —
   *  that cost is exactly what made the zoom stutter. */
  const [zoomSettled, setZoomSettled] = useState(false);

  // Measure every state's bbox once — the geometry is static.
  useLayoutEffect(() => {
    const boxes: Record<string, Box> = {};
    for (const [id, el] of pathRefs.current) {
      const b = el.getBBox();
      boxes[id] = { x: b.x, y: b.y, w: b.width, h: b.height };
    }
    setLabelBoxes(boxes);
  }, []);

  /** THE HYBRID RESOLUTION: this state's trusted source, else the global one. */
  const srcFor = useCallback((id: string) => trust[id] ?? sourceId, [trust, sourceId]);

  const getEl = useCallback((id: string) => pathRefs.current.get(id) ?? null, []);
  useFlash(flash, getEl);

  // Under reduced motion the recolor must be an instant swap: no stagger wave
  // (the fill transition itself already collapses via --harden-ms).
  const [reducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  // Mobile: the drawer is a bottom sheet, not a right panel — the zoomed
  // state centers in the FULL frame width instead of the left region.
  const [narrowMap] = useState(() => window.matchMedia('(max-width: 700px)').matches);

  // The tooltip is position:fixed (viewport-anchored): if it survives a
  // scroll it detaches from its state and floats over unrelated content
  // (e.g. the feed). Kill it on scroll; hover/focus re-summon it.
  useEffect(() => {
    const onScroll = () => setTooltip(null);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /** Cells for one state, built on demand against the live path geometry. */
  const countiesFor = (stateId: string): CountyCell[] => {
    const cached = countyCache.current.get(stateId);
    if (cached) return cached;
    const el = pathRefs.current.get(stateId);
    const box = labelBoxes[stateId];
    if (!el || !box) return [];
    const contains = (x: number, y: number) => {
      try {
        return el.isPointInFill(new DOMPoint(x, y));
      } catch {
        return true; // ancient engines: accept bbox placement
      }
    };
    const cells = buildCounties(stateId, box, contains);
    countyCache.current.set(stateId, cells);
    return cells;
  };

  // Fly the camera. useLayoutEffect so the target geometry is measured after
  // the focused state has moved into its own group.
  const wasZoomedRef = useRef(false);
  // Mirrors the measured region so render-time math matches the camera's.
  const [regionW, setRegionW] = useState(ZOOM_REGION_W);
  useLayoutEffect(() => {
    const camera = cameraRef.current;
    const rest = restRef.current;
    if (!camera) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The blur/dim on the un-focused states animates ONLY on zoom enter/exit.
    // Re-running it on chamber-tab switches or prev/next navigation (still
    // zoomed) restarts it from blur(0), which reads as a background blink.
    const isZoomed = !!zoomedId;
    const zoomToggled = wasZoomedRef.current !== isZoomed;
    wasZoomedRef.current = isZoomed;
    const from = camera.style.transform || IDENTITY;
    let to = IDENTITY;

    if (zoomedId) {
      const target = pathRefs.current.get(zoomedId);
      if (target) {
        const box = target.getBBox();
        // Fit the whole silhouette inside the region left of the drawer
        // (full width on mobile — the sheet rises from the bottom).
        const regionW = narrowMap ? 1 : measureRegionW(camera.ownerSVGElement);
        // Render-time consumers (the county label counter-scale) need the
        // same number; they cannot measure during render.
        setRegionW(regionW);
        const scale = Math.min(
          MAX_ZOOM,
          Math.min(
            (VIEW_W * regionW * ZOOM_FILL) / box.width,
            (VIEW_H * ZOOM_FILL) / box.height
          )
        );
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        // CENTER the state in its region — no cover clamp. The old clamp
        // (keep the scaled map covering the whole frame) shoved edge states
        // like TX/WA/ME off-center with dead space opposite; past the map's
        // edge there is only transparent svg over the same card surface, so
        // centering exposes nothing.
        const tx = (VIEW_W * regionW) / 2 - scale * cx;
        const ty = VIEW_H / 2 - scale * cy;
        to = `translate(${tx}px, ${ty}px) scale(${scale})`;
      }
    }

    // Set the resting style first so the element is correct even if the
    // animation is skipped or interrupted.
    camera.style.transform = to;
    const restStyle = zoomedId ? `blur(${REST_BLUR_PX}px)` : 'blur(0px)';
    const restOpacity = zoomedId ? '0.35' : '1';
    if (rest) {
      rest.style.filter = restStyle;
      rest.style.opacity = restOpacity;
    }
    // County reveal: after the flight (immediately under reduced motion).
    setZoomSettled(false);
    let settleTimer = 0;
    if (zoomedId) {
      if (reduced) setZoomSettled(true);
      else settleTimer = window.setTimeout(() => setZoomSettled(true), CAMERA_MS);
    }
    if (reduced) return () => window.clearTimeout(settleTimer);

    animate(camera, { transform: [from, to] }, { duration: CAMERA_MS / 1000, ease: [0.22, 1, 0.36, 1] });
    if (rest && zoomToggled) {
      animate(
        rest,
        {
          filter: [zoomedId ? 'blur(0px)' : `blur(${REST_BLUR_PX}px)`, restStyle],
          opacity: [zoomedId ? 1 : 0.35, Number(restOpacity)],
        },
        { duration: CAMERA_MS / 1000, ease: 'easeOut' }
      );
    }
    return () => window.clearTimeout(settleTimer);
  }, [zoomedId, chamber]);

  // Escape leaves the zoomed frame. The overlaid "back to full map" button
  // was dropped by request — the panel's own close button (and clicking
  // away) is the way back, on touch as well as pointer.
  useEffect(() => {
    if (!zoomedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClearZoom();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomedId, onClearZoom]);

  const showTooltipAt = (id: string, name: string, x: number, y: number) =>
    setTooltip({ id, name, x, y });

  const showTooltipForElement = (id: string, name: string, el: Element) => {
    const box = el.getBoundingClientRect();
    setTooltip({ id, name, x: box.left + box.width / 2, y: box.top });
  };

  const handleActivate = (stateId: string) => {
    /* While the panel is open the map is INERT. The panel owns the state you
       are reading, and its prev/next arrows are the only way to move between
       states — a stray click on the sliver of map beside it used to re-aim
       the camera mid-read, or drop you out of the zoom entirely. Leaving is
       the close button, Escape, or scrolling away. */
    if (zoomedId) return;
    if (!races[stateId]) {
      onSelect(stateId); // not on the ballot — selection surfaces the empty state
      return;
    }
    // Clicking any on-ballot state dives the camera into it (blur the rest).
    // House fills the frame with district rows, the other chambers with the
    // race detail panel.
    onZoom(stateId);
  };

  // The state under the pointer or keyboard focus — tooltip state already
  // tracks both. Lift is suspended while zoomed (the camera owns the frame)
  // and never applies to not-on-ballot states (they are inert).
  const liftId = !zoomedId && tooltip && races[tooltip.id] ? tooltip.id : null;
  const liftShape = liftId ? STATE_SHAPES.find((s) => s.id === liftId) : undefined;
  const liftRace = liftId ? races[liftId] : undefined;

  const renderState = (shape: (typeof STATE_SHAPES)[number], index: number) => {
    const race = races[shape.id];
    const selected = shape.id === selectedId;
    const src = srcFor(shape.id);
    const trusted = !!trust[shape.id];
    const label = race
      ? `${describeRace(shape.name, race, src)}${trusted ? ', your trusted source' : ''}`
      : `${shape.name}, no ${CHAMBER_LABEL[chamber]} race in 2026`;

    return (
      <g key={shape.id}>
        <path
          ref={(el) => {
            if (el) pathRefs.current.set(shape.id, el);
            else pathRefs.current.delete(shape.id);
          }}
          d={shape.d}
          className={`state-shape${selected ? ' is-selected' : ''}${race ? '' : ' is-empty'}${
            shape.id === liftId ? ' is-lift-source' : ''
          }`}
          style={{
            fill: race ? fillFor(race, src) : 'var(--not-on-ballot)',
            transitionDelay: staggering && !reducedMotion ? `${index * STAGGER_STEP_MS}ms` : '0ms',
          }}
          role="button"
          /* Out of the tab order and announced as disabled while the panel
             is open: the map is inert then, and a focusable control that
             does nothing is worse than no control. */
          tabIndex={zoomedId ? -1 : 0}
          aria-label={label}
          aria-pressed={selected}
          aria-disabled={zoomedId || !race ? true : undefined}
          data-state={shape.id}
          onClick={() => handleActivate(shape.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleActivate(shape.id);
            }
          }}
          onPointerMove={(e) => showTooltipAt(shape.id, shape.name, e.clientX, e.clientY)}
          onPointerLeave={() => setTooltip((t) => (t?.id === shape.id ? null : t))}
          onFocus={(e) => showTooltipForElement(shape.id, shape.name, e.currentTarget)}
          onBlur={() => setTooltip((t) => (t?.id === shape.id ? null : t))}
        />
        {race && isHatched(race) && (
          <path d={shape.d} className="hatch-overlay" fill="url(#hatch-counting)" aria-hidden="true" />
        )}
        {/* This source published nothing for this race: stripes say so. It is
            NEVER backfilled from another provider. */}
        {race && hasNoRead(race, src) && (
          <path d={shape.d} className="hatch-overlay" fill="url(#hatch-no-data)" aria-hidden="true" />
        )}
      </g>
    );
  };

  // Partition so the blur is a single filter on the un-focused group. This
  // moves the zoomed state later in the DOM, which changes its tab position
  // while zoomed; the race list remains the stable non-visual equivalent.
  const rest = STATE_SHAPES.map((s, i) => [s, i] as const).filter(([s]) => s.id !== zoomedId);
  const focused = STATE_SHAPES.map((s, i) => [s, i] as const).filter(([s]) => s.id === zoomedId);
  const selectedShape = selectedId ? STATE_SHAPES.find((s) => s.id === selectedId) : undefined;

  // Camera scale while zoomed (county hairlines/type counter-scale by it).
  const zoomedBox = zoomedId ? labelBoxes[zoomedId] : undefined;
  const camScale =
    zoomedId && zoomedBox
      ? Math.min(
          MAX_ZOOM,
          Math.min(
            (VIEW_W * (narrowMap ? 1 : regionW) * ZOOM_FILL) / zoomedBox.w,
            (VIEW_H * ZOOM_FILL) / zoomedBox.h
          )
        )
      : 1;

  // County subdivision renders for the click-zoomed state only — and only
  // in the phases that carry the zoom depth.
  const countyStates = useMemo(
    () => (zoomedId && showCounties ? [zoomedId] : []),
    [zoomedId, showCounties]
  );

  return (
    <div className={`map-wrap${zoomedId ? ' is-zoomed' : ''}`}>
      {/* Flat rendering on purpose: any 3D transform on an SVG ancestor makes
          the compositor rasterize + resample it, pixelating the borders. */}
          <svg
            viewBox={MAP_VIEWBOX}
            className="election-map"
            role="group"
            aria-label={`United States ${CHAMBER_LABEL[chamber]} map. States are focusable; press Enter or Space to select.`}
          >
            <defs>
              {/* Diagonal hatch: the non-color channel for "counting" (estimate). */}
              <pattern
                id="hatch-counting"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(20, 24, 29, 0.22)" strokeWidth="2" />
              </pattern>
              {/* Wider, lighter stripes on the gray no-read fill — the
                  non-color channel for "this source has no data". */}
              <pattern
                id="hatch-no-data"
                width="7"
                height="7"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(-45)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="7"
                  stroke="var(--ink)"
                  strokeOpacity="0.26"
                  strokeWidth="2.4"
                />
              </pattern>
              {/* County cells are cut by the state silhouettes. */}
              {countyStates.map((id) => {
                const shape = STATE_SHAPES.find((sh) => sh.id === id);
                return shape ? (
                  <clipPath key={`county-clip-${id}`} id={`county-clip-${id}`}>
                    <path d={shape.d} />
                  </clipPath>
                ) : null;
              })}
            </defs>

            <g ref={cameraRef} className="map-camera">
              <g ref={restRef} className="map-rest">
                {rest.map(([shape, index]) => renderState(shape, index))}
              </g>
              <g className="map-focus">
                {focused.map(([shape, index]) => renderState(shape, index))}
              </g>
              {/* State abbreviations at each centroid. Decorative (the path's
                  aria-label already names the state); tone flips per fill so
                  the code stays readable on light and dark ratings. Hidden
                  while zoomed (the camera scale would blow them up) and
                  skipped where the shape is too small to hold two letters. */}
              <g className={`state-labels${zoomedId ? ' is-hidden' : ''}`} aria-hidden="true">
                {STATE_SHAPES.map((shape) => {
                  const box = labelBoxes[shape.id];
                  if (!box || box.w < 30 || box.h < 22) return null;
                  const nudge = LABEL_NUDGE[shape.id] ?? { dx: 0, dy: 0 };
                  return (
                    <text
                      key={`label-${shape.id}`}
                      x={box.x + box.w / 2 + nudge.dx}
                      y={box.y + box.h / 2 + nudge.dy}
                      className={`state-label state-label--${labelToneFor(races[shape.id], srcFor(shape.id))}`}
                    >
                      {shape.id}
                    </text>
                  );
                })}
              </g>
              {/* Override marker: the states the reader re-pointed at their
                  own trusted source. A two-tone dot (dark ring, light core)
                  so it survives EVERY fill — light blues and reds, the
                  no-data gray, the saturated called colors. Hidden while
                  zoomed, like the labels: the camera scale would balloon it. */}
              <g className={`trust-markers${zoomedId ? ' is-hidden' : ''}`} aria-hidden="true">
                {Object.keys(trust).map((id) => {
                  const box = labelBoxes[id];
                  if (!box || !races[id]) return null;
                  const nudge = LABEL_NUDGE[id] ?? { dx: 0, dy: 0 };
                  const cx = box.x + box.w / 2 + nudge.dx;
                  const cy = box.y + box.h / 2 + nudge.dy - Math.min(13, box.h * 0.36);
                  return (
                    <g key={`trust-${id}`}>
                      <circle className="trust-dot-ring" cx={cx} cy={cy} r="4.6" />
                      <circle className="trust-dot" cx={cx} cy={cy} r="2.3" />
                    </g>
                  );
                })}
              </g>
              {/* MOCK county choropleth: Voronoi cells clipped to the
                  silhouette, painted with the SAME encoding as the map one
                  level down (each county's read jitters around the state's).
                  Fades in with the camera flight. */}
              {/* MOCK county choropleth: cells bloom IN SYNC with the
                  camera flight (fade matches CAMERA_MS); the initials wait
                  for landing — text raster inside the flying group is what
                  made the zoom stutter. */}
              {countyStates.length > 0 && (
                <g className="county-layer" aria-hidden="true">
                  {countyStates.map((id) => {
                    const cells = countiesFor(id);
                    const race = races[id];
                    if (cells.length === 0 || !race) return null;
                    return (
                      <g key={`county-${id}`} clipPath={`url(#county-clip-${id})`}>
                        {cells.map((c, i) => {
                          const paint = countyPaint(race, srcFor(id), id, i);
                          return (
                            <polygon
                              key={`p-${c.points}`}
                              points={c.points}
                              className="county-cell"
                              style={{ fill: paint.fill }}
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </g>
              )}
              {zoomSettled && countyStates.length > 0 && (
                <g className="county-labels" aria-hidden="true">
                  {countyStates.map((id) => {
                    const cells = countiesFor(id);
                    const race = races[id];
                    if (cells.length === 0 || !race) return null;
                    return (
                      <g key={`clabels-${id}`} clipPath={`url(#county-clip-${id})`}>
                        {cells.map((c, i) => {
                          const paint = countyPaint(race, srcFor(id), id, i);
                          return (
                            <text
                              key={`t-${c.x}-${c.y}`}
                              x={c.x}
                              y={c.y}
                              className={`county-label state-label--${paint.tone}`}
                              style={{ fontSize: `${10.5 / camScale}px` }}
                            >
                              {c.initials}
                            </text>
                          );
                        })}
                      </g>
                    );
                  })}
                </g>
              )}
              {/* Selection highlight drawn on top so it isn't hidden by
                  neighbors — unless it's the lifted state, in which case the
                  outline rides inside the lift so they move as one. */}
              {selectedShape && selectedId !== liftId && (
                <path d={selectedShape.d} className="selection-outline" aria-hidden="true" />
              )}
              {liftShape && liftRace && (
                <g className="lift-overlay" aria-hidden="true">
                  <path
                    d={liftShape.d}
                    className="lift-shape"
                    style={{ fill: fillFor(liftRace, srcFor(liftShape.id)) }}
                  />
                  {isHatched(liftRace) && (
                    <path d={liftShape.d} className="hatch-overlay" fill="url(#hatch-counting)" />
                  )}
                  {hasNoRead(liftRace, srcFor(liftShape.id)) && (
                    <path d={liftShape.d} className="hatch-overlay" fill="url(#hatch-no-data)" />
                  )}
                  {liftId === selectedId && (
                    <path d={liftShape.d} className="selection-outline" />
                  )}
                  {/* The abbreviation rides along. The lift is a COPY painted
                      last, so without this it covers the very label of the
                      state being hovered — the one code the reader is most
                      likely to be looking for. */}
                  {(() => {
                    const box = labelBoxes[liftShape.id];
                    if (!box || box.w < 30 || box.h < 22) return null;
                    const nudge = LABEL_NUDGE[liftShape.id] ?? { dx: 0, dy: 0 };
                    return (
                      <text
                        x={box.x + box.w / 2 + nudge.dx}
                        y={box.y + box.h / 2 + nudge.dy}
                        className={`state-label state-label--${labelToneFor(
                          liftRace,
                          srcFor(liftShape.id)
                        )}`}
                      >
                        {liftShape.id}
                      </text>
                    );
                  })()}
                </g>
              )}
            </g>
          </svg>

      {/* Suppressed while zoomed: the district panel already says everything the
          tooltip would, and it would sit on top of it. */}
      {tooltip && !zoomedId && (
        <MapTooltip
          name={tooltip.name}
          race={races[tooltip.id]}
          chamber={chamber}
          sourceId={srcFor(tooltip.id)}
          trusted={!!trust[tooltip.id]}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  );
}
