/**
 * Sourcing disclosure (PRD P1): where the numbers come from AND how current
 * they are.
 *
 * The PRD's reliability clause is that data "must not silently go stale" — so
 * staleness is a rendered state with its own text and icon, never an absence.
 * The disclaimer is permanent chrome (tenet 4: the map is a starting point,
 * not a verdict), not a dismissible notice.
 */
import type { Freshness } from '../data/encoding';
import { sourceAttribution } from '../data/sources';

interface SourcingDisclosureProps {
  sourceId: string;
  freshness: Freshness;
  /** Results mode swaps the attribution to the certified results feed. */
  resultsSource?: string;
}

export function SourcingDisclosure({ sourceId, freshness, resultsSource }: SourcingDisclosureProps) {
  const attribution = resultsSource ?? sourceAttribution(sourceId);

  return (
    <section className="sourcing" aria-label="Data sourcing and freshness">
      <p className="sourcing-line">
        <span className="sourcing-source">{attribution}</span>
        <span
          className={`sourcing-freshness${freshness.stale ? ' is-stale' : ''}`}
          // Icon + text carry the state; color is never the only channel.
        >
          {freshness.stale ? '⚠ ' : ''}
          {freshness.label}
          {freshness.stale ? ' — may be out of date' : ''}
        </span>
      </p>
      {!resultsSource && (
        <p className="sourcing-disclaimer">
          Polling averages and market odds are estimates, not results. They are
          measured differently and are never combined into a single number.
        </p>
      )}
    </section>
  );
}
