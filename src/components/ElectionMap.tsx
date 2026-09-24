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
import { describeRace, fillFor, isCalled, isHatched, hasNoRead, labelToneFor } from '../data/encoding';
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
/** How far two fingers may take the map (phones, Sep 24 2026). */
const MAX_PINCH = 5;

/**
 * Where the zoomed state should land, in viewBox units: the centre of the
 * CARD's area left of the drawer — measured, because the svg sits inset in
 * the card (its side padding) and the drawer is absolutely positioned inside
 * `.map-and-panel`, so its offsetLeft IS the region's width. Falls back to
 * the svg's own box when the frame or the drawer is not there, and to the
 * whole frame when the drawer is out of its flow (mobile bottom sheet).
 */
function measureTarget(svg: SVGSVGElement | null): { fitW: number; fitH: number; cx: number; cy: number } {
  const fallback = { fitW: VIEW_W * ZOOM_REGION_W, fitH: VIEW_H, cx: (VIEW_W * ZOOM_REGION_W) / 2, cy: VIEW_H / 2 };
  const frame = svg?.closest('.map-and-panel') as HTMLElement | null;
  if (!svg || !frame) return fallback;
  const sr = svg.getBoundingClientRect();
  const fr = frame.getBoundingClientRect();
  if (!sr.width || !fr.width) return fallback;
  const drawer = frame.querySelector('.drawer') as HTMLElement | null;
  const inFlow = drawer && drawer.offsetParent === frame;
  const regionPx = inFlow ? Math.max(fr.width * 0.2, drawer.offsetLeft) : fr.width;
  const k = VIEW_W / sr.width; // px -> viewBox units
  /* THE SHEET (phones): the drawer is fixed to the bottom of the screen, so
     the region is not the card — it is the strip of card left ABOVE the
     sheet. Measured from the sheet's height, not its rect, so the entry
     animation does not move the target. */
  let regionH = fr.height;
  if (drawer && !inFlow) {
    const sheetTop = window.innerHeight - drawer.offsetHeight;
    regionH = Math.max(140, Math.min(fr.height, sheetTop - fr.top));
  }
  return {
    fitW: regionPx * k,
    fitH: regionH * k,
    cx: (regionPx / 2 - (sr.left - fr.left)) * k,
    cy: (regionH / 2 - (sr.top - fr.top)) * k,
  };
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
    stopGlide();
    // The fly owns the camera: a reader's pinch does not survive it.
    zoomRef.current = false;
    setUserZoom(false);
    const from = { ...camRef.current };
    const to = { s: 1, x: 0, y: 0 };
    if (zoomedId) {
      const target = pathRefs.current.get(zoomedId);
      if (target) {
        const box = target.getBBox();
        const t = measureTarget(camera.ownerSVGElement);
        to.s = Math.min(MAX_ZOOM, Math.min((t.fitW * ZOOM_FILL) / box.width, (t.fitH * ZOOM_FILL) / box.height));
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        // CENTER the state in the card's region left of the drawer — no
        // cover clamp: past the map's edge there is only transparent svg
        // over the same card surface.
        to.x = t.cx - to.s * cx;
        to.y = t.cy - to.s * cy;
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
  const drag = useRef({ on: false, id: -1, x0: 0, y0: 0, cx: 0, cy: 0, moved: false, vx: 0, vy: 0, t: 0, lx: 0, ly: 0 });
  const glide = useRef(0);
  const stopGlide = () => {
    if (glide.current) window.cancelAnimationFrame(glide.current);
    glide.current = 0;
  };
  const clampCam = (c: { s: number; x: number; y: number }) => {
    const margin = 120;
    return {
      s: c.s,
      x: Math.min(VIEW_W - margin, Math.max(-c.s * VIEW_W + margin, c.x)),
      y: Math.min(VIEW_H - margin, Math.max(-c.s * VIEW_H + margin, c.y)),
    };
  };
  const [dragging, setDragging] = useState(false);

  /* PINCH TO ZOOM (Sep 24 2026, phones): two fingers scale the map about the
     point between them, 1x to 5x, and one finger pans it once it is zoomed.
     The map is small on a phone; this is how a reader gets into it.
     `touch-action` (index.css) hands us the gesture: the page still scrolls
     with one finger at rest, and only stops doing so once the reader has
     zoomed in — with a Reset chip always on screen to give the map back.
     The camera is the same one the open-state fly uses, so a state opened
     while zoomed just flies from wherever the reader is. */
  const [userZoom, setUserZoom] = useState(false);
  const zoomRef = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef({ on: false, d0: 0, s0: 1, cx: 0, cy: 0 });
  const clampPinch = (c: { s: number; x: number; y: number }) => {
    const s = Math.max(1, Math.min(MAX_PINCH, c.s));
    // Never past the map's own edges: the drawing always covers the frame.
    return {
      s,
      x: Math.min(0, Math.max(VIEW_W * (1 - s), c.x)),
      y: Math.min(0, Math.max(VIEW_H * (1 - s), c.y)),
    };
  };
  /** The fingers' midpoint, in the svg's own user space. */
  const midOf = (svg: SVGSVGElement) => {
    const [a, b] = [...pointers.current.values()];
    const r = svg.getBoundingClientRect();
    const k = VIEW_W / r.width;
    return {
      x: ((a.x + b.x) / 2 - r.left) * k,
      y: ((a.y + b.y) / 2 - r.top) * k,
      d: Math.hypot(a.x - b.x, a.y - b.y),
    };
  };
  const resetZoom = () => {
    pinch.current.on = false;
    zoomRef.current = false;
    setUserZoom(false);
    const camera = cameraRef.current;
    if (camera) applyCamera(camera, { s: 1, x: 0, y: 0 });
  };

  const onSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        // A pinch starts: whatever drag was in flight is over.
        const m = midOf(e.currentTarget);
        const c = camRef.current;
        pinch.current = { on: true, d0: m.d, s0: c.s, cx: (m.x - c.x) / c.s, cy: (m.y - c.y) / c.s };
        drag.current.on = false;
        drag.current.moved = true; // the tap that follows must not open a state
        setDragging(false);
        stopGlide();
        return;
      }
    }
    if ((!zoomedId && !zoomRef.current) || e.button !== 0) return;
    const d = drag.current;
    d.on = true;
    d.id = e.pointerId;
    d.x0 = e.clientX;
    d.y0 = e.clientY;
    d.cx = camRef.current.x;
    d.cy = camRef.current.y;
    d.moved = false;
    d.vx = 0;
    d.vy = 0;
    d.t = performance.now();
    d.lx = e.clientX;
    d.ly = e.clientY;
    stopGlide();
    // No capture yet: capturing on press would retarget the click to the
    // svg and the state under the pointer would never open. Capture only
    // once the press has become a drag (below).
  };
  const onSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch' && pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current.on && pointers.current.size === 2) {
        const m = midOf(e.currentTarget);
        const p = pinch.current;
        const s = Math.max(1, Math.min(MAX_PINCH, (p.s0 * m.d) / Math.max(1, p.d0)));
        // The point the fingers grabbed stays under the fingers.
        const next = clampPinch({ s, x: m.x - p.cx * s, y: m.y - p.cy * s });
        if (cameraRef.current) applyCamera(cameraRef.current, next);
        const on = next.s > 1.01;
        if (on !== zoomRef.current) {
          zoomRef.current = on;
          setUserZoom(on);
        }
        return;
      }
    }
    const d = drag.current;
    if (!d.on || e.pointerId !== d.id) return;
    const dxPx = e.clientX - d.x0;
    const dyPx = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dxPx, dyPx) < 4) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      setTooltip(null);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const svg = e.currentTarget;
    const k = VIEW_W / svg.getBoundingClientRect().width; // px -> viewBox units
    const c = camRef.current;
    // Velocity (viewBox units per ms), smoothed, for the glide on release.
    const now = performance.now();
    const dt = Math.max(1, now - d.t);
    d.vx = 0.7 * d.vx + 0.3 * (((e.clientX - d.lx) * k) / dt);
    d.vy = 0.7 * d.vy + 0.3 * (((e.clientY - d.ly) * k) / dt);
    d.t = now;
    d.lx = e.clientX;
    d.ly = e.clientY;
    const panned = { s: c.s, x: d.cx + dxPx * k, y: d.cy + dyPx * k };
    if (cameraRef.current) applyCamera(cameraRef.current, zoomedId ? clampCam(panned) : clampPinch(panned));
  };
  const onSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2 && pinch.current.on) {
        pinch.current.on = false;
        // A pinch that ended back at 1x hands the page its scroll back.
        if (camRef.current.s <= 1.01) resetZoom();
        return;
      }
    }
    const d = drag.current;
    if (!d.on || e.pointerId !== d.id) return;
    d.on = false;
    setDragging(false);
    // The click that follows a real drag must not open a state: keep
    // `moved` until it has fired (click comes right after pointerup).
    if (d.moved) window.setTimeout(() => { d.moved = false; }, 0);
    // GLIDE: the map keeps the hand's velocity and eases out (exponential
    // decay, ~250ms), so a release never stops dead. Off under reduced
    // motion, and a stale velocity (the hand paused before letting go)
    // gives nothing.
    if (!d.moved || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (performance.now() - d.t > 80) return;
    let vx = d.vx;
    let vy = d.vy;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      const c = camRef.current;
      const next = zoomedId
        ? clampCam({ s: c.s, x: c.x + vx * dt, y: c.y + vy * dt })
        : clampPinch({ s: c.s, x: c.x + vx * dt, y: c.y + vy * dt });
      if (cameraRef.current) applyCamera(cameraRef.current, next);
      const decay = Math.exp(-dt / 250);
      vx *= decay;
      vy *= decay;
      if (Math.hypot(vx, vy) > 0.004) glide.current = window.requestAnimationFrame(step);
      else glide.current = 0;
    };
    glide.current = window.requestAnimationFrame(step);
  };

  // TRACKPAD PAN while zoomed: two-finger scrolling over the map moves the
  // camera instead of the page (only while a state is open — at rest the
  // page scrolls as normal). Non-passive so the page scroll can be stopped.
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !zoomedId) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom gesture: leave it to the browser
      e.preventDefault();
      stopGlide();
      const k = VIEW_W / svg.getBoundingClientRect().width;
      const c = camRef.current;
      if (cameraRef.current) applyCamera(cameraRef.current, clampCam({ s: c.s, x: c.x - e.deltaX * k, y: c.y - e.deltaY * k }));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomedId]);

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
          }${race && isCalled(race) ? ' is-called' : ''}`}
          style={{
            fill: race ? fillFor(race, src) : 'var(--color-chart-neutral-offballot)',
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
    <div
      className={`map-wrap${zoomedId ? ' is-zoomed' : ''}${dragging ? ' is-dragging' : ''}${
        userZoom ? ' is-userzoom' : ''
      }`}
    >
      {/* Flat rendering on purpose: any 3D transform on an SVG ancestor makes
          the compositor rasterize + resample it, pixelating the borders. */}
          <svg
            ref={svgRef}
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
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-chart-overlay-hatch)" strokeWidth="2" />
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
                  {/* The slab: three darker copies stepped down under the
                      face, so the state reads as a solid object lifted off
                      the map — an edge, not a shadow alone. */}
                  {[3, 2, 1].map((o) => (
                    <path
                      key={o}
                      d={liftShape.d}
                      className="lift-side"
                      transform={`translate(0 ${o * 1.7})`}
                      style={{ fill: fillFor(liftRace, srcFor(liftShape.id)) }}
                    />
                  ))}
                  <path
                    d={liftShape.d}
                    className={`lift-shape${isCalled(liftRace) ? ' is-called' : ''}`}
                    style={{ fill: fillFor(liftRace, srcFor(liftShape.id)) }}
                  />
                  <path d={liftShape.d} className="lift-face" aria-hidden="true" />
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

      {/* The way back: without it a zoomed reader has no scroll and no map. */}
      {userZoom && (
        <button type="button" className="map-zoom-reset" onClick={resetZoom}>
          Reset zoom
        </button>
      )}

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
