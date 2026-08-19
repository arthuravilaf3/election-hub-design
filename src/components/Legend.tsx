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

const RESULTS_ITEMS: Array<[string, string, boolean?]> = [
  ['Uncalled — no results yet', 'var(--uncalled)'],
  ['Leading — counting, not called', 'var(--rep-2)', true],
  ['✓ Called — certified result', 'var(--rep-5)'],
  ['Not on ballot', 'var(--not-on-ballot)'],
];

export function Legend({ mode }: { mode: Mode }) {
  const items = mode === 'results' ? RESULTS_ITEMS : RATING_ITEMS;
  return (
    <section className="legend-strip" aria-label="Map legend">
      <ul>
        {items.map(([label, color, hatched]) => (
          <li key={label}>
            <span
              className={`legend-swatch${hatched ? ' legend-swatch-hatched' : ''}`}
              style={{ background: color }}
            />
            {label}
          </li>
        ))}
      </ul>
      {mode === 'results' && (
        <p className="legend-rule">Solid color means a called race. A lead is not a result.</p>
      )}
    </section>
  );
}
