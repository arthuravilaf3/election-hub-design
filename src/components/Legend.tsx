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

/* [label, color, expansion?] — the comp abbreviates the party to a single
   letter so all eight steps fit on one line. The expansion rides along in an
   <abbr title>, so the row stays terse without costing a screen reader the
   word. */
type Item = [string, string, string?];

const RATING_ITEMS: Item[] = [
  ['Safe D', 'var(--rating-safe-dem)', 'Democrats'],
  ['Likely D', 'var(--rating-likely-dem)', 'Democrats'],
  ['Lean D', 'var(--rating-lean-dem)', 'Democrats'],
  ['Toss-up', 'var(--rating-tossup)'],
  ['Lean R', 'var(--rating-lean-rep)', 'Republicans'],
  ['Likely R', 'var(--rating-likely-rep)', 'Republicans'],
  ['Safe R', 'var(--rating-safe-rep)', 'Republicans'],
  ['Not on ballot', 'var(--not-on-ballot)'],
];

/* A source with nothing to say for a race is a designed state, not a blank:
   striped gray, same stripe the map paints. The comp has no swatch for it —
   the map can still paint it, and an unlabelled fill is worse than a ninth
   item. */
const NO_DATA_ITEM: Item = ['No data from this source', 'var(--no-read)'];

const RESULTS_ITEMS: Array<[string, string, boolean?]> = [
  ['Uncalled — no results yet', 'var(--uncalled)'],
  ['Leading, <25% in', 'var(--rep-1)', true],
  ['<50% in', 'var(--rep-2)', true],
  ['<75% in', 'var(--rep-3)', true],
  ['75%+ in', 'var(--rep-4)', true],
  ['✓ Called — certified result', 'var(--rep-5)'],
  ['Not on ballot', 'var(--not-on-ballot)'],
];

/** "Safe R" -> "Safe <abbr title="Republicans">R</abbr>" */
function ItemLabel({ label, expansion }: { label: string; expansion?: string }) {
  if (!expansion) return <>{label}</>;
  const at = label.lastIndexOf(' ');
  return (
    <>
      {label.slice(0, at + 1)}
      <abbr title={expansion}>{label.slice(at + 1)}</abbr>
    </>
  );
}

/** `hasTrust` — the override marker is documented only while it is on the
 *  map; a legend for an absent glyph is noise. */
export function Legend({ mode, hasTrust = false }: { mode: Mode; hasTrust?: boolean }) {
  const items: Array<[string, string, (string | boolean)?]> =
    mode === 'results' ? RESULTS_ITEMS : [...RATING_ITEMS, NO_DATA_ITEM];
  return (
    <section className="legend-strip" aria-label="Map legend">
      <ul>
        {items.map(([label, color, extra]) => (
          <li key={label}>
            <span
              className={`legend-swatch${extra === true ? ' legend-swatch-hatched' : ''}${
                label === NO_DATA_ITEM[0] ? ' legend-swatch-striped' : ''
              }`}
              style={{ background: color }}
            />
            <ItemLabel label={label} expansion={typeof extra === 'string' ? extra : undefined} />
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
