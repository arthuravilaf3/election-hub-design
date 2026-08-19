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
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate } from 'motion/mini';
import { MAP_VIEWBOX, STATE_SHAPES } from '../data/states';
import { describeRace, fillFor, isHatched } from '../data/encoding';
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
  sourceId: string;
  selectedId: string | null;
  zoomedId: string | null;
  /** True during a coordinated full-map cutover: fills transition with a wave stagger. */
  staggering: boolean;
  flash: { stateId: string; nonce: number } | null;
  onSelect: (stateId: string) => void;
  onZoom: (stateId: string) => void;
  onClearZoom: () => void;
}

const [, , VIEW_W, VIEW_H] = MAP_VIEWBOX.split(' ').map(Number);
// The drawer covers the right ~46% of the frame, so the zoomed state must fit
// ENTIRELY in the left region — silhouette fully visible beside the drawer.
const ZOOM_REGION_W = 0.52; // fraction of the frame left of the drawer
const ZOOM_FILL = 0.78; // fraction of that region the state fills
const MAX_ZOOM = 7;
const CAMERA_MS = 550;
const REST_BLUR_PX = 2.5;

const IDENTITY = 'translate(0px, 0px) scale(1)';

interface FlagBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function ElectionMap({
  races,
  chamber,
  sourceId,
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
  const restRef = useRef<SVGGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  /** Bounding box of the zoomed state — positions the clipped flag overlay. */
  const [flagBox, setFlagBox] = useState<FlagBox | null>(null);

  const getEl = useCallback((id: string) => pathRefs.current.get(id) ?? null, []);
  useFlash(flash, getEl);

  // Fly the camera. useLayoutEffect so the target geometry is measured after
  // the focused state has moved into its own group.
  const wasZoomedRef = useRef(false);
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
        setFlagBox({ x: box.x, y: box.y, w: box.width, h: box.height });
        // Fit the whole silhouette inside the region left of the drawer.
        const scale = Math.min(
          MAX_ZOOM,
          Math.min(
            (VIEW_W * ZOOM_REGION_W * ZOOM_FILL) / box.width,
            (VIEW_H * ZOOM_FILL) / box.height
          )
        );
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        let tx = (VIEW_W * ZOOM_REGION_W) / 2 - scale * cx;
        let ty = VIEW_H / 2 - scale * cy;
        // COVER clamp: the scaled map must always cover the whole frame — no
        // bare card background peeking past the map's edges while zoomed.
        tx = Math.min(0, Math.max(VIEW_W - scale * VIEW_W, tx));
        ty = Math.min(0, Math.max(VIEW_H - scale * VIEW_H, ty));
        to = `translate(${tx}px, ${ty}px) scale(${scale})`;
      }
    } else {
      setFlagBox(null);
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
    if (reduced) return;

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
  }, [zoomedId, chamber]);

  // Escape leaves the zoomed frame — paired with a visible control, since
  // Escape alone is neither discoverable nor available on touch.
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
    if (!races[stateId]) {
      onSelect(stateId); // not on the ballot — selection surfaces the empty state
      return;
    }
    // Clicking any on-ballot state dives the camera into it (blur the rest);
    // clicking it again zooms back out. House fills the frame with district
    // rows, the other chambers with the race detail panel.
    if (stateId === zoomedId) onClearZoom();
    else onZoom(stateId);
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
    const label = race
      ? describeRace(shape.name, race, sourceId)
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
            fill: race ? fillFor(race, sourceId) : 'var(--not-on-ballot)',
            transitionDelay: staggering ? `${index * STAGGER_STEP_MS}ms` : '0ms',
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
      </g>
    );
  };

  // Partition so the blur is a single filter on the un-focused group. This
  // moves the zoomed state later in the DOM, which changes its tab position
  // while zoomed; the race list remains the stable non-visual equivalent.
  const rest = STATE_SHAPES.map((s, i) => [s, i] as const).filter(([s]) => s.id !== zoomedId);
  const focused = STATE_SHAPES.map((s, i) => [s, i] as const).filter(([s]) => s.id === zoomedId);
  const selectedShape = selectedId ? STATE_SHAPES.find((s) => s.id === selectedId) : undefined;
  const zoomedShape = zoomedId ? STATE_SHAPES.find((s) => s.id === zoomedId) : undefined;

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
              {/* Clips the flag overlay to the zoomed state's silhouette. */}
              {zoomedShape && (
                <clipPath id="zoom-flag-clip">
                  <path d={zoomedShape.d} />
                </clipPath>
              )}
            </defs>

            <g ref={cameraRef} className="map-camera">
              <g ref={restRef} className="map-rest">
                {rest.map(([shape, index]) => renderState(shape, index))}
              </g>
              <g className="map-focus">
                {focused.map(([shape, index]) => renderState(shape, index))}
              </g>
              {/* State flag ghosted inside the zoomed silhouette (20%). Inert
                  decoration: pointer-events none, hidden from AT. */}
              {zoomedId && zoomedShape && flagBox && (
                <g className="zoom-flag" clipPath="url(#zoom-flag-clip)" aria-hidden="true">
                  <image
                    href={`/flags/${zoomedId}.png`}
                    x={flagBox.x}
                    y={flagBox.y}
                    width={flagBox.w}
                    height={flagBox.h}
                    preserveAspectRatio="xMidYMid slice"
                  />
                </g>
              )}
              {/* Selection highlight drawn on top so it isn't hidden by
                  neighbors — unless it's the lifted state, in which case the
                  outline rides inside the lift so they move as one. */}
              {selectedShape && selectedId !== liftId && (
                <path d={selectedShape.d} className="selection-outline" aria-hidden="true" />
              )}
              {/* The lift: an inert copy painted LAST so its shadow lands on
                  top of neighbors (SVG paints in document order; a filter on
                  the original would be overdrawn). Purely presentational —
                  fill comes from the same fillFor, so elevation never changes
                  what the color means. */}
              {liftShape && liftRace && (
                <g className="lift-overlay" aria-hidden="true">
                  <path
                    d={liftShape.d}
                    className="lift-shape"
                    style={{ fill: fillFor(liftRace, sourceId) }}
                  />
                  {isHatched(liftRace) && (
                    <path d={liftShape.d} className="hatch-overlay" fill="url(#hatch-counting)" />
                  )}
                  {liftId === selectedId && (
                    <path d={liftShape.d} className="selection-outline" />
                  )}
                </g>
              )}
            </g>
          </svg>

      {zoomedId && (
        <button type="button" className="zoom-exit" onClick={onClearZoom}>
          ← Back to full map
        </button>
      )}

      {/* Suppressed while zoomed: the district panel already says everything the
          tooltip would, and it would sit on top of it. */}
      {tooltip && !zoomedId && (
        <MapTooltip
          name={tooltip.name}
          race={races[tooltip.id]}
          chamber={chamber}
          sourceId={sourceId}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  );
}
