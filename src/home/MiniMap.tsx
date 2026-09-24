/**
 * The hub's map, small, still and read-only — the same geometry and the same
 * fills, so the widget and the full map can never disagree about a race.
 * `fillFor` is imported, not re-implemented: the encoding rule (light =
 * estimate, solid = fact) has exactly one owner.
 *
 * A11Y: aria-hidden. This is a 150px picture of data the widget already
 * states in words beside it (called / leading / too early counts), and the
 * keyboard-navigable race list lives on the full map, one link away. Adding
 * 51 tab stops to a thumbnail would cost more than it gives.
 */
import { fillFor, isCalled, isHatched } from '../data/encoding';
import { MAP_VIEWBOX, STATE_SHAPES } from '../data/states';
import type { StateRace } from '../data/types';

interface MiniMapProps {
  races: Record<string, StateRace>;
  sourceId: string;
}

export function MiniMap({ races, sourceId }: MiniMapProps) {
  return (
    <svg className="band-map" viewBox={MAP_VIEWBOX} role="presentation" aria-hidden="true" focusable="false">
      <defs>
        {/* Same diagonal hatch as the full map: the non-colour channel for
            "counting", so a leading race can never pass for a called one. */}
        <pattern id="band-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-chart-overlay-hatch)" strokeWidth="2" />
        </pattern>
      </defs>
      {STATE_SHAPES.map((shape) => {
        const race = races[shape.id];
        if (!race) {
          return <path key={shape.id} d={shape.d} fill="var(--color-chart-neutral-offballot)" stroke="var(--color-chart-map-border)" strokeWidth="1" />;
        }
        return (
          <g key={shape.id}>
            <path
              d={shape.d}
              fill={fillFor(race, sourceId)}
              stroke={isCalled(race) ? 'var(--color-chart-map-focus)' : 'var(--color-chart-map-border)'}
              strokeWidth={isCalled(race) ? 1.8 : 1}
            />
            {isHatched(race) && <path d={shape.d} fill="url(#band-hatch)" />}
          </g>
        );
      })}
    </svg>
  );
}
