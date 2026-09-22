import { describe, expect, it } from 'vitest';
import {
  CUTOVER_BANNER,
  activeRaces,
  electionReducer,
  initialElectionState,
  type ElectionState,
} from './electionReducer';
import { fillFor, hasNoRead, readFor } from '../data/encoding';
import { picksForChamber } from '../data/trust';
import type { RaceStatus } from '../data/types';
import { snapshotAt, trueLeaderOf } from '../data/night';

/** Results mode with the SENATE active, the night at 10 PM ET — a moment
 *  with races in every status (data/night.ts is the only source of results). */
const TEN_PM = new Date('2026-11-03T22:00:00-05:00').getTime();
function resultsState(): ElectionState {
  let s = electionReducer(initialElectionState(), { type: 'SET_CHAMBER', chamber: 'senate' });
  s = electionReducer(s, { type: 'SET_GLOBAL_MODE', mode: 'results' });
  return { ...s, ballot: snapshotAt(s.ballot, TEN_PM) };
}

/** First state in the active chamber whose results are in `status`. */
function findByStatus(state: ElectionState, status: RaceStatus): string {
  const hit = Object.values(activeRaces(state)).find((r) => r.results?.status === status);
  if (!hit) throw new Error(`no race with status ${status}`);
  return hit.id;
}

describe('ballot shape', () => {
  it('scopes races per chamber; an absent state is not on the ballot', () => {
    const s = initialElectionState();
    expect(s.chamber).toBe('house'); // redesign default
    // 2026 Senate is 35 of 51 — the majority of states have no race.
    expect(Object.keys(s.ballot.senate).length).toBe(35);
    expect(Object.keys(s.ballot.governor).length).toBe(36);
    expect(s.ballot.senate.CA).toBeUndefined(); // no California Senate race in 2026
    expect(s.ballot.governor.CA).toBeDefined();
  });

  it('every race carries named candidates for the drawer', () => {
    const s = initialElectionState();
    for (const race of Object.values(s.ballot.senate)) {
      expect(race.candidates!.length).toBeGreaterThanOrEqual(2);
      const total = race.candidates!.reduce((a, c) => a + c.pct, 0);
      expect(total).toBeGreaterThan(99);
      expect(total).toBeLessThan(101);
    }
  });

  it('every race carries the polling read; market gaps are explicit, never filled', () => {
    const s = initialElectionState();
    for (const race of Object.values(s.ballot.senate)) {
      expect(race.reads.some((r) => r.sourceId === 'dw-poll-avg')).toBe(true);
      expect(race.reads.length).toBeLessThanOrEqual(3);
    }
    // Markets list what has volume; some races have no market at all. The
    // hole is data — it drives the "no data from this source" state.
    expect(s.ballot.senate.WV.reads.map((r) => r.sourceId)).not.toContain('kalshi');
    expect(s.ballot.senate.ID.reads.map((r) => r.sourceId)).not.toContain('polymarket');
    expect(hasNoRead(s.ballot.senate.WV, 'kalshi')).toBe(true);
    expect(hasNoRead(s.ballot.senate.WV, 'dw-poll-avg')).toBe(false);
  });
});

describe('trust picks (which read do you trust)', () => {
  function zoomedSenate(stateId = 'GA') {
    let s = electionReducer(initialElectionState(), { type: 'SET_CHAMBER', chamber: 'senate' });
    s = { ...s, trust: {} }; // ignore anything a previous session persisted
    s = electionReducer(s, { type: 'ZOOM_STATE', stateId });
    return s;
  }

  it('scopes a pick to one state AND one chamber', () => {
    let s = zoomedSenate('GA');
    s = electionReducer(s, { type: 'SET_TRUST', stateId: 'GA', sourceId: 'kalshi' });
    expect(picksForChamber(s.trust, 'senate').GA).toBe('kalshi');
    expect(picksForChamber(s.trust, 'governor').GA).toBeUndefined();
    expect(picksForChamber(s.trust, 'senate').TX).toBeUndefined();
  });

  it('re-picking the current source clears the pick (radio toggle)', () => {
    let s = zoomedSenate();
    s = electionReducer(s, { type: 'SET_TRUST', stateId: 'GA', sourceId: 'kalshi' });
    s = electionReducer(s, { type: 'SET_TRUST', stateId: 'GA', sourceId: 'kalshi' });
    expect(picksForChamber(s.trust, 'senate').GA).toBeUndefined();
  });

  it('moves the pick between sources', () => {
    let s = zoomedSenate();
    s = electionReducer(s, { type: 'SET_TRUST', stateId: 'GA', sourceId: 'kalshi' });
    s = electionReducer(s, { type: 'SET_TRUST', stateId: 'GA', sourceId: 'polymarket' });
    expect(picksForChamber(s.trust, 'senate').GA).toBe('polymarket');
  });

  it('CLEAR_TRUST resets one race back to the global source', () => {
    let s = zoomedSenate();
    s = electionReducer(s, { type: 'SET_TRUST', stateId: 'GA', sourceId: 'kalshi' });
    s = electionReducer(s, { type: 'CLEAR_TRUST', stateId: 'GA' });
    expect(picksForChamber(s.trust, 'senate').GA).toBeUndefined();
  });

  it('switching the global source leaves picks intact', () => {
    let s = zoomedSenate();
    s = electionReducer(s, { type: 'SET_TRUST', stateId: 'GA', sourceId: 'kalshi' });
    s = electionReducer(s, { type: 'SET_SOURCE', sourceId: 'polymarket' });
    expect(s.sourceId).toBe('polymarket');
    expect(picksForChamber(s.trust, 'senate').GA).toBe('kalshi');
  });

  it('a pick at a source with no data stays empty — never a silent fallback', () => {
    let s = zoomedSenate('WV');
    s = electionReducer(s, { type: 'SET_TRUST', stateId: 'WV', sourceId: 'kalshi' });
    const trusted = picksForChamber(s.trust, 'senate').WV;
    expect(trusted).toBe('kalshi');
    expect(readFor(s.ballot.senate.WV, trusted)).toBeUndefined();
    expect(fillFor(s.ballot.senate.WV, trusted)).toBe('var(--no-read)');
  });
});

describe('chamber and source switching', () => {
  it('switching chamber swaps the visible races and announces the count', () => {
    const s = electionReducer(initialElectionState(), { type: 'SET_CHAMBER', chamber: 'governor' });
    expect(s.chamber).toBe('governor');
    expect(activeRaces(s).CA).toBeDefined();
    expect(s.announcement).toContain('Governor');
  });

  it('drops a selection that is not on the new chamber ballot', () => {
    let s = electionReducer(initialElectionState(), { type: 'SET_CHAMBER', chamber: 'senate' });
    s = electionReducer(s, { type: 'SELECT', stateId: 'WV' });
    expect(activeRaces(s).WV).toBeDefined(); // WV has a 2026 Senate race
    s = electionReducer(s, { type: 'SET_CHAMBER', chamber: 'governor' });
    expect(activeRaces(s).WV).toBeUndefined(); // but no 2026 Governor race
    expect(s.selectedId).toBeNull();
  });

  it('switching source changes only the source, never the underlying data', () => {
    const before = initialElectionState();
    const after = electionReducer(before, { type: 'SET_SOURCE', sourceId: 'kalshi' });
    expect(after.sourceId).toBe('kalshi');
    expect(after.ballot).toBe(before.ballot);
    expect(after.announcement).toContain('Kalshi');
  });
});

describe('cutover', () => {
  it('global cutover flips every race in every chamber and shows the banner', () => {
    let s = electionReducer(initialElectionState(), { type: 'SET_CHAMBER', chamber: 'senate' });
    s = electionReducer(s, { type: 'SET_GLOBAL_MODE', mode: 'results' });
    for (const chamber of ['senate', 'house', 'governor'] as const) {
      expect(Object.values(s.ballot[chamber]).every((r) => r.mode === 'results')).toBe(true);
    }
    expect(s.banner).toBe(CUTOVER_BANNER);
    expect(s.staggering).toBe(true);
    expect(s.announcement).toBe(CUTOVER_BANNER);
  });

  it('per-state cutover flips that state in every chamber it appears in', () => {
    let s = electionReducer(initialElectionState(), { type: 'SET_CHAMBER', chamber: 'senate' });
    s = electionReducer(s, { type: 'CUTOVER_STATE', stateId: 'GA' });
    expect(s.ballot.senate.GA.mode).toBe('results');
    expect(s.ballot.governor.GA.mode).toBe('results'); // polls close for the whole state
    expect(s.ballot.senate.TX.mode).toBe('prediction');
    expect(s.banner).toBe(CUTOVER_BANNER);
  });

  it('cutover initializes an empty count for a race with no results yet', () => {
    const init = electionReducer(initialElectionState(), { type: 'SET_CHAMBER', chamber: 'senate' });
    const s = electionReducer(init, { type: 'CUTOVER_STATE', stateId: 'GA' });
    expect(s.ballot.senate.GA.results).toMatchObject({ status: 'uncalled', reporting: 0 });
  });
});

describe('status transition rules', () => {
  it('moves forward: uncalled -> counting -> called', () => {
    let s = resultsState();
    const id = findByStatus(s, 'uncalled');
    s = electionReducer(s, { type: 'SET_STATUS', stateId: id, status: 'counting' });
    expect(activeRaces(s)[id].results?.status).toBe('counting');
    expect(activeRaces(s)[id].results?.leader).toBeDefined();
    s = electionReducer(s, { type: 'SET_STATUS', stateId: id, status: 'called' });
    expect(activeRaces(s)[id].results?.status).toBe('called');
  });

  it('never moves backward (called is a fact)', () => {
    let s = resultsState();
    const id = findByStatus(s, 'called');
    s = electionReducer(s, { type: 'SET_STATUS', stateId: id, status: 'counting' });
    expect(activeRaces(s)[id].results?.status).toBe('called');
    s = electionReducer(s, { type: 'SET_STATUS', stateId: id, status: 'uncalled' });
    expect(activeRaces(s)[id].results?.status).toBe('called');
  });

  it('ignores status changes while in prediction mode', () => {
    const s = electionReducer(initialElectionState(), {
      type: 'SET_STATUS',
      stateId: 'GA',
      status: 'called',
    });
    expect(s.ballot.senate.GA.mode).toBe('prediction');
    expect(s.ballot.senate.GA.results?.status).not.toBe('called');
  });
});

describe('calling races', () => {
  it('CALL_RACE sets status, fires a flash and announces politely', () => {
    let s = resultsState();
    const id = findByStatus(s, 'counting');
    const leaderBefore = activeRaces(s)[id].results?.leader;
    s = electionReducer(s, { type: 'CALL_RACE', stateId: id });
    expect(activeRaces(s)[id].results?.status).toBe('called');
    expect(activeRaces(s)[id].results?.leader).toBe(leaderBefore); // seeded leader preserved
    expect(s.flash).toMatchObject({ stateId: id });
    expect(s.announcement).toContain('called for');
  });

  it("calls a leaderless race for the night's answer key, never the polling read", () => {
    let s = resultsState();
    const id = findByStatus(s, 'uncalled');
    expect(activeRaces(s)[id].results?.leader).toBeUndefined();
    s = electionReducer(s, { type: 'CALL_RACE', stateId: id });
    expect(activeRaces(s)[id].results?.leader).toBe(trueLeaderOf(`senate:${id}`));
  });

  it('calling twice is a no-op (no second flash)', () => {
    let s = resultsState();
    const id = findByStatus(s, 'counting');
    s = electionReducer(s, { type: 'CALL_RACE', stateId: id });
    const nonce = s.flash?.nonce;
    s = electionReducer(s, { type: 'CALL_RACE', stateId: id });
    expect(s.flash?.nonce).toBe(nonce);
  });
});

describe('reporting', () => {
  it('clamps to 0-100 and promotes uncalled to counting when > 0', () => {
    let s = resultsState();
    const id = findByStatus(s, 'uncalled');
    s = electionReducer(s, { type: 'SET_REPORTING', stateId: id, reporting: 250 });
    expect(activeRaces(s)[id].results?.reporting).toBe(100);
    expect(activeRaces(s)[id].results?.status).toBe('counting');
    expect(activeRaces(s)[id].results?.leader).toBeDefined();
  });

  it('does not change reporting on a called race', () => {
    let s = resultsState();
    const id = findByStatus(s, 'called');
    const before = activeRaces(s)[id].results?.reporting;
    s = electionReducer(s, { type: 'SET_REPORTING', stateId: id, reporting: 10 });
    expect(activeRaces(s)[id].results?.reporting).toBe(before);
  });
});

describe('zoom', () => {
  it('zooms only to a state on the current ballot', () => {
    let s = electionReducer(initialElectionState(), { type: 'SET_CHAMBER', chamber: 'house' });
    s = electionReducer(s, { type: 'ZOOM_STATE', stateId: 'PA' });
    expect(s.zoomedId).toBe('PA');
    expect(s.selectedId).toBe('PA');
    s = electionReducer(s, { type: 'CLEAR_ZOOM' });
    expect(s.zoomedId).toBeNull();
  });

  it('ignores a zoom request for a state with no race here', () => {
    // AL has no curated House race, and House is the default chamber.
    const s = electionReducer(initialElectionState(), { type: 'ZOOM_STATE', stateId: 'AL' });
    expect(s.zoomedId).toBeNull();
  });
});

describe('the night clock', () => {
  const at = (iso: string) => new Date(iso).getTime();
  const nightState = (iso: string) =>
    electionReducer(
      electionReducer(initialElectionState(), { type: 'SET_CHAMBER', chamber: 'senate' }),
      { type: 'NIGHT_TICK', at: at(iso) }
    );

  it('a tick forward publishes the calls of the interval: flash, log and a polite announcement', () => {
    let s = nightState('2026-11-03T19:00:00-05:00');
    expect(s.night.at).toBe(at('2026-11-03T19:00:00-05:00'));
    expect(s.ballot.senate.GA.mode).toBe('results');
    expect(s.ballot.senate.OR.mode).toBe('prediction');
    const before = s.night.calls.length;
    s = electionReducer(s, { type: 'NIGHT_TICK', at: at('2026-11-03T21:30:00-05:00') });
    expect(s.night.calls.length).toBeGreaterThan(before);
    expect(s.flash).not.toBeNull();
    expect(s.announcement).toMatch(/called/);
    expect(s.night.feedAsOf).toBe(new Date(at('2026-11-03T21:30:00-05:00')).toISOString());
  });

  it('scrubbing back reopens the polls and trims the log', () => {
    let s = nightState('2026-11-03T23:30:00-05:00');
    expect(s.ballot.senate.OR.mode).toBe('results');
    const late = s.night.calls.length;
    s = electionReducer(s, { type: 'NIGHT_TICK', at: at('2026-11-03T19:30:00-05:00') });
    expect(s.ballot.senate.OR.mode).toBe('prediction');
    expect(s.ballot.senate.OR.results).toBeUndefined();
    expect(s.night.calls.length).toBeLessThan(late);
    expect(s.night.calls.every((c) => c.at <= at('2026-11-03T19:30:00-05:00'))).toBe(true);
  });

  it('marks the provider outage on the feed', () => {
    const s = nightState('2026-11-03T22:20:00-05:00');
    expect(s.night.delayed).toBe(true);
    expect(s.night.feedAsOf).toBe(new Date(at('2026-11-03T22:10:00-05:00')).toISOString());
  });

  it('ignores the manual simulator while the clock is engaged', () => {
    const s = nightState('2026-11-03T21:00:00-05:00');
    expect(electionReducer(s, { type: 'CALL_RACE', stateId: 'OR' })).toBe(s);
    expect(electionReducer(s, { type: 'SET_GLOBAL_MODE', mode: 'prediction' })).toBe(s);
    expect(electionReducer(s, { type: 'CUTOVER_STATE', stateId: 'OR' })).toBe(s);
  });

  it('leaving the night puts every race back to prediction and clears the clock', () => {
    let s = nightState('2026-11-03T23:30:00-05:00');
    s = electionReducer(s, { type: 'NIGHT_STOP' });
    expect(s.night.at).toBeNull();
    expect(s.night.calls).toHaveLength(0);
    for (const chamber of ['senate', 'house', 'governor'] as const) {
      expect(Object.values(s.ballot[chamber]).every((r) => r.mode === 'prediction' && !r.results)).toBe(true);
    }
    // And the manual simulator is back in charge.
    expect(electionReducer(s, { type: 'CUTOVER_STATE', stateId: 'GA' }).ballot.senate.GA.mode).toBe('results');
  });

  it('play from off starts at 6 PM; reset clears the night', () => {
    let s = electionReducer(initialElectionState(), { type: 'NIGHT_PLAY' });
    expect(s.night.playing).toBe(true);
    expect(s.night.at).toBe(at('2026-11-03T18:00:00-05:00'));
    s = electionReducer(s, { type: 'RESET' });
    expect(s.night.at).toBeNull();
  });
});
