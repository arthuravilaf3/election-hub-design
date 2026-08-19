import { freshnessOf, readFor, sourceOf, statusLine } from '../data/encoding';
import { CHAMBER_LABEL } from '../data/summary';
import type { Chamber, StateRace } from '../data/types';

interface MapTooltipProps {
  name: string;
  /** Undefined when this state has no race in the selected chamber. */
  race: StateRace | undefined;
  chamber: Chamber;
  sourceId: string;
  /** Viewport coordinates of the pointer (or focused state's top center). */
  x: number;
  y: number;
}

const WIDTH = 260;

export function MapTooltip({ name, race, chamber, sourceId, x, y }: MapTooltipProps) {
  // Clamp horizontally, flip above the cursor; keep it dumb — Floating UI
  // is the upgrade path if edge cases ever matter.
  const left = Math.min(Math.max(x - WIDTH / 2, 8), window.innerWidth - WIDTH - 8);
  const top = Math.max(y - 8, 8);

  if (!race) {
    return (
      <div className="map-tooltip" style={{ left, top, width: WIDTH }} role="presentation">
        <p className="map-tooltip-name">{name}</p>
        <p className="map-tooltip-value">No {CHAMBER_LABEL[chamber]} race in 2026</p>
        <p className="map-tooltip-source">Nothing to compare in this chamber.</p>
      </div>
    );
  }

  const freshness = race.mode === 'prediction' ? freshnessOf(readFor(race, sourceId)) : undefined;

  return (
    <div className="map-tooltip" style={{ left, top, width: WIDTH }} role="presentation">
      <p className="map-tooltip-name">{name}</p>
      <p className="map-tooltip-value">{statusLine(race, sourceId)}</p>
      {/* Every number carries its provenance and its age. */}
      <p className="map-tooltip-source">
        {sourceOf(race, sourceId)}
        {freshness && (
          <>
            {' · '}
            <span className={freshness.stale ? 'is-stale' : undefined}>
              {freshness.stale ? '⚠ ' : ''}
              {freshness.label}
            </span>
          </>
        )}
      </p>
      {race.chamber === 'house' && race.districts && (
        <p className="map-tooltip-source">
          {race.districts.length} curated district
          {race.districts.length === 1 ? '' : 's'} — click to zoom in
        </p>
      )}
    </div>
  );
}
