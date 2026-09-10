// The map. Encoding rule (see colors.css): LIGHT = ESTIMATE, SOLID = FACT.
// - prediction: saturation encodes the ACTIVE SOURCE's confidence, on that
//   source's own ramp (points for polls, implied probability for markets)
// - results/counting: light leader fill + diagonal hatch, capped below solid
// - results/called: full saturation, reached via the CSS "hardening"
//   transition on fill (+ a one-shot WAAPI flash)
//
// OPENING A STATE. Clicking a state opens its panel, the camera flies to it
// (550ms, fitted into the region left of the drawer) and every other state
// dims to 30%. The dim is one opacity on the un-focused GROUP, not fifty
// per-path styles. No blur, no county subdivision (dropped Sep 2026); the
// camera came back by request the same month.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate } from 'motion';
import { MAP_VIEWBOX, STATE_SHAPES } from '../data/states';
import { CAMERA_MS, ZOOM_REGION_W } from '../data/layout';
import { describeRace, fillFor, isHatched, hasNoRead, labelToneFor } from '../data/encoding';
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
  onSelect: (stateId: string) => void;
  onZoom: (stateId: string) => void;
  onClearZoom: () => void;
}

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

const [, , VIEW_W, VIEW_H] = MAP_VIEWBOX.split(' ').map(Number);
const ZOOM_FILL = 0.78; // fraction of the region the state fills
const MAX_ZOOM = 7;

/**
 * How much of the frame is left of the drawer — the region the zoomed state
 * has to fit inside, silhouette fully visible beside the panel. MEASURED:
 * the drawer is absolutely positioned inside `.map-and-panel`, so its
 * offsetLeft IS the left region's width. Falls back to the declared fraction
 * before the panel mounts, and to the whole frame when the drawer is not in
 * the frame's flow (mobile: a fixed bottom sheet).
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

export function ElectionMap({
  races,
  chamber,
  sourceId,
  trust,
  selectedId,
  zoomedId,
  staggering,
  flash,
  onSelect,
  onZoom,
  onClearZoom,
}: ElectionMapProps) {
  const pathRefs = useRef(new Map<string, SVGPathElement>());
  const cameraRef = useRef<SVGGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  /** Geometry centers for the state-abbreviation labels (measured once). */
  const [labelBoxes, setLabelBoxes] = useState<Record<string, Box>>({});

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
  // The tooltip is position:fixed (viewport-anchored): if it survives a
  // scroll it detaches from its state and floats over unrelated content
  // (e.g. the feed). Kill it on scroll; hover/focus re-summon it.
  useEffect(() => {
    const onScroll = () => setTooltip(null);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fly the camera. useLayoutEffect so the target geometry is measured after
  // the focused state has moved into its own group. The SVG `transform`
  // ATTRIBUTE, not a CSS transform: attribute transforms are plain user-space
  // math from the viewBox origin, immune to transform-box/transform-origin
  // (a CSS transform on this group landed every state off-centre). Motion
  // tweens the three numbers; the dim on the rest is CSS on the same clock.
  const camRef = useRef({ s: 1, x: 0, y: 0 });
  const applyCamera = (camera: SVGGElement, c: { s: number; x: number; y: number }) => {
    camRef.current = c;
    camera.setAttribute('transform', `translate(${c.x} ${c.y}) scale(${c.s})`);
  };
  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    const from = { ...camRef.current };
    const to = { s: 1, x: 0, y: 0 };
    if (zoomedId) {
      const target = pathRefs.current.get(zoomedId);
      if (target) {
        const box = target.getBBox();
        const regionW = measureRegionW(camera.ownerSVGElement);
        to.s = Math.min(
          MAX_ZOOM,
          Math.min((VIEW_W * regionW * ZOOM_FILL) / box.width, (VIEW_H * ZOOM_FILL) / box.height)
        );
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        // CENTER the state in its region — no cover clamp: past the map's
        // edge there is only transparent svg over the same card surface.
        to.x = (VIEW_W * regionW) / 2 - to.s * cx;
        to.y = VIEW_H / 2 - to.s * cy;
      }
    }
    const apply = (c: { s: number; x: number; y: number }) => applyCamera(camera, c);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      apply(to);
      return;
    }
    const anim = animate(0, 1, {
      duration: CAMERA_MS / 1000,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (t) =>
        apply({
          s: from.s + (to.s - from.s) * t,
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        }),
    });
    return () => anim.stop();
  }, [zoomedId, chamber]);

  // DRAG TO PAN while zoomed (Sep 2026): the camera is the reader's to
  // move, so the states beside the open one can be brought into view. A
  // press that travels under 4px is still a click (opens that state); past
  // it the click is swallowed. Pointer capture keeps the drag alive when the
  // pointer leaves the svg; the pan is clamped so the map can never be
  // pushed entirely out of the frame. Not zoomed: no pan, the map is still.
  const drag = useRef({ on: false, id: -1, x0: 0, y0: 0, cx: 0, cy: 0, moved: false });
  const [dragging, setDragging] = useState(false);
  const onSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!zoomedId || e.button !== 0) return;
    const d = drag.current;
    d.on = true;
    d.id = e.pointerId;
    d.x0 = e.clientX;
    d.y0 = e.clientY;
    d.cx = camRef.current.x;
    d.cy = camRef.current.y;
    d.moved = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d.on || e.pointerId !== d.id) return;
    const dxPx = e.clientX - d.x0;
    const dyPx = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dxPx, dyPx) < 4) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      setTooltip(null);
    }
    const svg = e.currentTarget;
    const k = VIEW_W / svg.getBoundingClientRect().width; // px -> viewBox units
    const c = camRef.current;
    const margin = 120;
    const x = Math.min(VIEW_W - margin, Math.max(-c.s * VIEW_W + margin, d.cx + dxPx * k));
    const y = Math.min(VIEW_H - margin, Math.max(-c.s * VIEW_H + margin, d.cy + dyPx * k));
    if (cameraRef.current) applyCamera(cameraRef.current, { s: c.s, x, y });
  };
  const onSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d.on || e.pointerId !== d.id) return;
    d.on = false;
    setDragging(false);
    // The click that follows a real drag must not open a state: keep
    // `moved` until it has fired (click comes right after pointerup).
    if (d.moved) window.setTimeout(() => { d.moved = false; }, 0);
  };

  // Escape closes the open state. The panel's own close button is the other
  // way back, on touch as well as pointer.
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
    // A drag that ended on a state is not a click on it.
    if (drag.current.moved) return;
    // The open state itself: nothing to do (close is the X or Escape).
    if (stateId === zoomedId) return;
    if (!races[stateId]) {
      onSelect(stateId); // not on the ballot — selection surfaces the empty state
      return;
    }
    // Clicking any on-ballot state opens its panel and dims the rest — and
    // with a panel already open, clicking another state swaps it (Sep 2026:
    // the map stays live while the panel is up).
    onZoom(stateId);
  };

  // The state under the pointer or keyboard focus — tooltip state already
  // tracks both. Never applies to not-on-ballot states (they are inert), nor
  // to the open state (it is already the one lifted out of the dim).
  const liftId = tooltip && races[tooltip.id] && tooltip.id !== zoomedId ? tooltip.id : null;
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
          tabIndex={0}
          aria-label={label}
          aria-pressed={selected}
          aria-disabled={race ? undefined : true}
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

  // Partition so the dim is ONE opacity on the un-focused group. This moves
  // the open state later in the DOM, which changes its tab position while it
  // is open; the race list remains the stable non-visual equivalent.
  const rest = STATE_SHAPES.map((s, i) => [s, i] as const).filter(([s]) => s.id !== zoomedId);
  const focused = STATE_SHAPES.map((s, i) => [s, i] as const).filter(([s]) => s.id === zoomedId);
  const selectedShape = selectedId ? STATE_SHAPES.find((s) => s.id === selectedId) : undefined;

  return (
    <div className={`map-wrap${zoomedId ? ' is-zoomed' : ''}${dragging ? ' is-dragging' : ''}`}>
      {/* Flat rendering on purpose: any 3D transform on an SVG ancestor makes
          the compositor rasterize + resample it, pixelating the borders. */}
          <svg
            viewBox={MAP_VIEWBOX}
            className="election-map"
            role="group"
            aria-label={`United States ${CHAMBER_LABEL[chamber]} map. States are focusable; press Enter or Space to select.`}
            onPointerDown={onSvgPointerDown}
            onPointerMove={onSvgPointerMove}
            onPointerUp={onSvgPointerUp}
            onPointerCancel={onSvgPointerUp}
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
            </defs>

            <g ref={cameraRef} className="map-camera">
              <g className="map-rest">
                {rest.map(([shape, index]) => renderState(shape, index))}
              </g>
              <g className="map-focus">
                {focused.map(([shape, index]) => renderState(shape, index))}
              </g>
              {/* State abbreviations at each centroid. Decorative (the path's
                  aria-label already names the state); tone flips per fill so
                  the code stays readable on light and dark ratings. Skipped
                  where the shape is too small to hold two letters. Hidden
                  while zoomed (the camera scale would blow them up). */}
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
                      className={`state-label state-label--${labelToneFor(races[shape.id], srcFor(shape.id))}${
                        shape.id === zoomedId ? ' state-label--open' : ''
                      }`}
                    >
                      {shape.id}
                    </text>
                  );
                })}
              </g>
              {/* Override marker: the states the reader re-pointed at their
                  own trusted source. A two-tone dot (dark ring, light core)
                  so it survives EVERY fill — light blues and reds, the
                  no-data gray, the saturated called colors. Dims with the
                  rest while a state is open. */}
              <g className="trust-markers" aria-hidden="true">
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

      {tooltip && (
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
