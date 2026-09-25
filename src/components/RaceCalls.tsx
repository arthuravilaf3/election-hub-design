/**
 * THE RACES ALREADY CALLED (Sep 25 2026).
 *
 * They used to be three rows pushed on top of the coverage feed, where they
 * read as a headline among headlines and got lost; then a filter of their
 * own, which read no better. A call is not coverage: it is the night's
 * running score, and it belongs next to the thing it changes. So there is
 * one shape left — a rail anchored inside the map, newest first, with the
 * winner's face. Clicking a row opens that state.
 *
 * The photos are the fixture's placeholder portraits (see candidatePhoto).
 */
import { track } from '../data/analytics';
import type { FeedCall } from './CoverageFeed';
import { photoFor } from './candidatePhoto';

/** One call opens its state on the map — the same event the race tags use. */
function open(c: FeedCall, where: string) {
  track('race_call_click', { stateId: c.stateId, where });
  window.dispatchEvent(new CustomEvent('dw-open-map', { detail: { stateId: c.stateId } }));
}

function Face({ c }: { c: FeedCall }) {
  return (
    <span className={`call-face call-face--${c.party}`} aria-hidden="true">
      <img src={photoFor(c.winner)} alt="" loading="lazy" decoding="async" />
    </span>
  );
}

/**
 * The rail, anchored inside the map on the left. It shows the newest calls
 * and says how many there are in total, so it never grows past the map.
 */
export function RaceCallsRail({ calls }: { calls: FeedCall[] }) {
  if (calls.length === 0) return null;
  const shown = calls.slice(0, 5);
  return (
    /* A labelled group, not a complementary landmark: it sits inside the
       map's own region, and a nested <aside> is an axe failure
       (landmark-complementary-is-top-level). */
    <div className="calls-rail" role="group" aria-label="Races called">
      <p className="calls-rail-head">
        <span className="calls-rail-dot" aria-hidden="true" />
        Races called
        <span className="calls-rail-count">{calls.length}</span>
      </p>
      <ul className="calls-rail-list">
        {shown.map((c) => (
          <li key={c.key}>
            <button type="button" className="calls-rail-row" onClick={() => open(c, 'rail')}>
              <Face c={c} />
              <span className="calls-rail-copy">
                <span className="calls-rail-where">
                  {c.stateName} {c.chamberLabel}
                </span>
                <span className="calls-rail-who">{c.winner}</span>
              </span>
              <span className={`call-chip call-chip--${c.party}`}>
                {c.party === 'rep' ? 'R' : 'D'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
