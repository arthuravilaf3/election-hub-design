import { describe, expect, it } from 'vitest';
import { summarize } from './summary';
import { buildBallot, HOUSE_DISTRICT_COUNT } from './mockRaces';
import type { StateRace } from './types';

const NOW = new Date('2026-08-14T12:00:00Z').getTime();

function senate(): Record<string, StateRace> {
  return buildBallot(NOW).senate;
}

describe('chamber summary', () => {
  it('counts every seat up exactly once across lean and tossup', () => {
    const s = summarize(senate(), 'senate', 'dw-poll-avg', HOUSE_DISTRICT_COUNT);
    expect(s.seatsUp).toBe(35);
    expect(s.leanDem + s.leanRep + s.tossups + s.unrated).toBe(35);
  });

  it('reports House by district count, not by state count', () => {
    const ballot = buildBallot(NOW);
    const s = summarize(ballot.house, 'house', 'dw-poll-avg', HOUSE_DISTRICT_COUNT);
    expect(Object.keys(ballot.house).length).toBe(16); // states
    expect(s.seatsUp).toBe(29); // the curated districts
    expect(s.isSubset).toBe(true);
  });

  it('shifts the lean counts when the source changes', () => {
    const races = senate();
    const poll = summarize(races, 'senate', 'dw-poll-avg', HOUSE_DISTRICT_COUNT);
    const market = summarize(races, 'senate', 'kalshi', HOUSE_DISTRICT_COUNT);
    // Same races, different reads — the headline numbers must not be identical,
    // otherwise the toggle is decorative.
    expect([market.leanDem, market.leanRep, market.tossups]).not.toEqual([
      poll.leanDem,
      poll.leanRep,
      poll.tossups,
    ]);
  });
});

describe('tenet 2: estimates and results never share the headline', () => {
  it('switches to certified counts once races are in results mode', () => {
    const races = senate();
    for (const id of Object.keys(races)) races[id] = { ...races[id], mode: 'results' };

    const s = summarize(races, 'senate', 'dw-poll-avg', HOUSE_DISTRICT_COUNT);
    expect(s.isResults).toBe(true);
    // Prediction counts go to zero: nothing is left for the UI to render as lean.
    expect(s.leanDem + s.leanRep + s.tossups).toBe(0);
    expect(s.calledDem + s.calledRep + s.leading + s.uncalled).toBe(35);
  });

  it('only counts a seat as called when the feed says called', () => {
    const races = senate();
    for (const id of Object.keys(races)) {
      races[id] = {
        ...races[id],
        mode: 'results',
        results: { status: 'counting', reporting: 99, leader: 'dem', source: 'AP' },
      };
    }
    const s = summarize(races, 'senate', 'dw-poll-avg', HOUSE_DISTRICT_COUNT);
    expect(s.calledDem).toBe(0);
    expect(s.calledRep).toBe(0);
    expect(s.leading).toBe(35);
  });
});
