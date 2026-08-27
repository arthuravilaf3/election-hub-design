/**
 * Legend strip (redesign Aug 2026): the categorical rating scale as one
 * horizontal row under the map card. Swatch colors are the exact rating
 * tokens; "Not on ballot" uses the same dark swatch the map paints (decision
 * Aug 2026 — the Figma legend's near-white swatch would make no-race states
 * glow on the dark card).
 *
 * Results mode keeps its status legend: rating colors are estimates and the
 * results map speaks status (uncalled/leading/called), never ratings.
 */
import type { Mode } from '../data/types';

const RATING_ITEMS: Array<[string, string]> = [
  ['Safe Democrats', 'var(--rating-safe-dem)'],
  ['Likely Democrats', 'var(--rating-likely-dem)'],
  ['Lean Democrats', 'var(--rating-lean-dem)'],
  ['Toss-up', 'var(--rating-tossup)'],
  ['Lean Republicans', 'var(--rating-lean-rep)'],
  ['Likely Republicans', 'var(--rating-likely-rep)'],
  ['Safe Republicans', 'var(--rating-safe-rep)'],
  ['Not on ballot', 'var(--not-on-ballot)'],
];

/* A source with nothing to say for a race is a designed state, not a blank:
   striped gray, same stripe the map paints. */
const NO_DATA_ITEM: [string, string] = ['No data from this source', 'var(--no-read)'];

const RESULTS_ITEMS: Array<[string, string, boolean?]> = [
  ['Uncalled — no results yet', 'var(--uncalled)'],
  ['Leading — counting, not called', 'var(--rep-2)', true],
  ['✓ Called — certified result', 'var(--rep-5)'],
  ['Not on ballot', 'var(--not-on-ballot)'],
];

/** `hasTrust` — the override marker is documented only while it is on the
 *  map; a legend for an absent glyph is noise. */
export function Legend({ mode, hasTrust = false }: { mode: Mode; hasTrust?: boolean }) {
  const items = mode === 'results' ? RESULTS_ITEMS : [...RATING_ITEMS, NO_DATA_ITEM];
  return (
    <section className="legend-strip" aria-label="Map legend">
      <ul>
        {items.map(([label, color, hatched]) => (
          <li key={label}>
            <span
              className={`legend-swatch${hatched ? ' legend-swatch-hatched' : ''}${
                label === NO_DATA_ITEM[0] ? ' legend-swatch-striped' : ''
              }`}
              style={{ background: color }}
            />
            {label}
          </li>
        ))}
        {hasTrust && (
          <li>
            <span className="legend-swatch legend-swatch-trust" aria-hidden="true" />
            Your trusted source
          </li>
        )}
      </ul>
      {mode === 'results' && (
        <p className="legend-rule">Solid color means a called race. A lead is not a result.</p>
      )}
    </section>
  );
}
