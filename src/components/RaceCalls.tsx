/**
 * THE RACES ALREADY CALLED (Sep 25 2026).
 *
 * They used to be three rows pushed on top of the coverage feed, where they
 * read as a headline among headlines and got lost. A call is not coverage:
 * it is the night's running score, and it belongs next to the thing it
 * changes. So it is told twice, in two shapes, from one component:
 *
 *   rail  — anchored inside the map on the left, newest first, with the
 *           winner's face. The map is what a call repaints; the list sits
 *           on it and clicking a row opens that state.
 *   row   — the same call as a feed row, behind a "Races called" filter of
 *           its own, for a reader working through the feed.
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

/** The call as a feed row, under its own filter. */
export function RaceCallRow({ c }: { c: FeedCall }) {
  return (
    <button type="button" className="call-row" onClick={() => open(c, 'feed')}>
      <Face c={c} />
      <span className="call-row-copy">
        <span className="call-row-kicker">
          <span aria-hidden="true">✓ </span>
          {c.stateName} {c.chamberLabel}
          <span className="feed-sep" aria-hidden="true">
            •
          </span>
          <span className="feed-time">{c.time}</span>
        </span>
        <span className="call-row-name">{c.winner}</span>
      </span>
      <span className={`call-chip call-chip--${c.party}`}>{c.party === 'rep' ? 'R' : 'D'}</span>
    </button>
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
