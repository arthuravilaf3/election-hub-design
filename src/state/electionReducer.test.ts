import { describe, expect, it } from 'vitest';
import {
  CUTOVER_BANNER,
  activeRaces,
  electionReducer,
  initialElectionState,
  type ElectionState,
} from './electionReducer';
import type { RaceStatus } from '../data/types';

/** Results mode with the SENATE active — the chamber whose seeds cover every
 *  status (the curated House subset is all close races, so it seeds no
 *  'called' states). */
function resultsState(): ElectionState {
  let s = electionReducer(initialElectionState(), { type: 'SET_CHAMBER', chamber: 'senate' });
  s = electionReducer(s, { type: 'SET_GLOBAL_MODE', mode: 'results' });
  return s;
}

/** First state in the active chamber whose seeded results are in `status`. */
function findByStatus(state: ElectionState, status: RaceStatus): string {
  const hit = Object.values(activeRaces(state)).find((r) => r.results?.status === status);
  if (!hit) throw new Error(`no seeded race with status ${status}`);
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

  it('every race carries a read from all three providers', () => {
    const s = initialElectionState();
    for (const race of Object.values(s.ballot.senate)) {
      expect(race.reads.map((r) => r.sourceId).sort()).toEqual([
        'dw-poll-avg',
        'kalshi',
        'polymarket',
      ]);
    }
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
    const s = resultsState();
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

  it('cutover initializes results for a race without seeded results', () => {
    const init = electionReducer(initialElectionState(), { type: 'SET_CHAMBER', chamber: 'senate' });
    delete init.ballot.senate.GA.results;
    delete init.ballot.governor.GA.results;
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

  it('falls back to the polling read when calling a race with no leader', () => {
    let s = resultsState();
    const id = findByStatus(s, 'uncalled');
    expect(activeRaces(s)[id].results?.leader).toBeUndefined();
    s = electionReducer(s, { type: 'CALL_RACE', stateId: id });
    expect(activeRaces(s)[id].results?.leader).toBeDefined();
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
