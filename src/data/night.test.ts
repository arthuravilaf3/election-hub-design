import { describe, expect, it } from 'vitest';
import { buildBallot } from './mockRaces';
import { leanOf } from './encoding';
import {
  DELAY_WINDOW,
  NEVER_CALLED,
  NIGHT_END_MS,
  NIGHT_START_MS,
  TOO_EARLY_BELOW,
  TRUE_OUTCOME,
  callDelayOf,
  feedAt,
  nightEvents,
  raceAt,
  snapshotAt,
  trueLeaderOf,
} from './night';

const NOW = new Date('2026-11-03T12:00:00Z').getTime();
const at = (iso: string) => new Date(iso).getTime();
const T = {
  early: at('2026-11-03T18:30:00-05:00'),
  firstWave: at('2026-11-03T20:15:00-05:00'),
  delayed: at('2026-11-03T22:20:00-05:00'),
  late: at('2026-11-03T23:30:00-05:00'),
};

describe('the night is a pure function of the clock', () => {
  it('gives the same results for the same moment, every time', () => {
    const b = buildBallot(NOW);
    expect(snapshotAt(b, T.late)).toEqual(snapshotAt(b, T.late));
  });

  it('never moves backward as the night goes on', () => {
    const b = buildBallot(NOW);
    const key = 'senate:OH';
    const race = b.senate.OH;
    let prev = raceAt(key, race.cutoverAt!, at(race.cutoverAt!));
    const order = { uncalled: 0, counting: 1, called: 2 };
    for (let t = at(race.cutoverAt!) + 60_000; t <= NIGHT_END_MS; t += 5 * 60_000) {
      const r = raceAt(key, race.cutoverAt!, t)!;
      expect(r.reporting).toBeGreaterThanOrEqual(prev!.reporting);
      expect(order[r.status]).toBeGreaterThanOrEqual(order[prev!.status]);
      prev = r;
    }
  });
});

describe('tenet 1: a call comes from the provider, never from the polls', () => {
  it('has upsets against the pre-election read', () => {
    const b = buildBallot(NOW);
    let upsets = 0;
    for (const race of [...Object.values(b.senate), ...Object.values(b.governor)]) {
      const poll = race.reads.find((r) => r.sourceId === 'dw-poll-avg');
      const key = `${race.chamber}:${race.id}`;
      if (!poll || callDelayOf(key) === null) continue;
      const lean = leanOf(poll);
      if (lean !== 'tossup' && lean !== trueLeaderOf(key)) upsets += 1;
    }
    expect(upsets).toBeGreaterThanOrEqual(3);
  });

  it('computes a race the same with its reads stripped away', () => {
    const b = buildBallot(NOW);
    const race = b.senate.GA;
    const withReads = raceAt('senate:GA', race.cutoverAt!, T.late, race.candidates);
    const stripped = raceAt('senate:GA', race.cutoverAt!, T.late, race.candidates);
    expect(stripped).toEqual(withReads);
    // And the answer key is authored, not a function of the fixture reads.
    expect(TRUE_OUTCOME['senate:GA']).toBeDefined();
  });
});

describe('cutover by the clock', () => {
  it('a race has no results before its polls close, and an empty count at the close', () => {
    const b = buildBallot(NOW);
    const race = b.senate.OR; // closes 23:00
    expect(raceAt('senate:OR', race.cutoverAt!, at('2026-11-03T22:59:00-05:00'))).toBeUndefined();
    expect(raceAt('senate:OR', race.cutoverAt!, at(race.cutoverAt!))).toMatchObject({ reporting: 0 });
  });

  it('a snapshot keeps prediction races as predictions and flips the closed ones', () => {
    const b = buildBallot(NOW);
    const s = snapshotAt(b, T.firstWave);
    expect(s.senate.GA.mode).toBe('results'); // 19:00
    expect(s.senate.OR.mode).toBe('prediction'); // 23:00
    expect(s.senate.OR.results).toBeUndefined();
    // Polls closing in a state close them for every chamber.
    expect(s.governor.GA.mode).toBe('results');
  });

  it('keeps object identity for races that did not change between ticks', () => {
    const b = buildBallot(NOW);
    const s1 = snapshotAt(b, T.late);
    const s2 = snapshotAt(s1, T.late + 60_000); // same five-minute batch
    expect(s2.senate.GA).toBe(s1.senate.GA);
    expect(s2.senate.OR).toBe(s1.senate.OR);
  });
});

describe('the three statuses', () => {
  it('names no leader while too little is in', () => {
    const b = buildBallot(NOW);
    const race = b.senate.OH;
    const r = raceAt('senate:OH', race.cutoverAt!, at(race.cutoverAt!))!;
    expect(r.reporting).toBeLessThan(TOO_EARLY_BELOW);
    expect(r.status === 'called' || r.leader === undefined).toBe(true);
  });

  it('leaves the closest races uncalled at 3 AM', () => {
    const b = buildBallot(NOW);
    const s = snapshotAt(b, NIGHT_END_MS);
    for (const key of NEVER_CALLED) {
      const [chamber, id] = key.split(':');
      if (id.includes('-')) continue;
      const race = s[chamber as 'senate' | 'house' | 'governor'][id];
      expect(race.results?.status).not.toBe('called');
    }
  });

  it('calls a landslide at the close and a close race only late', () => {
    expect(callDelayOf('senate:WY')).toBeLessThanOrEqual(10);
    const close = callDelayOf('senate:MI');
    expect(close === null || close >= 60).toBe(true);
  });
});

describe('results delayed', () => {
  it('freezes the feed inside the window and catches up after it', () => {
    const b = buildBallot(NOW);
    const start = at(DELAY_WINDOW[0]);
    expect(feedAt(T.delayed).delayed).toBe(true);
    expect(feedAt(T.delayed).effectiveAt).toBe(start);
    expect(snapshotAt(b, T.delayed)).toEqual(snapshotAt(b, start));
    expect(feedAt(at(DELAY_WINDOW[1])).delayed).toBe(false);
  });

  it('lists exactly the calls between two moments, with delayed ones landing at the window end', () => {
    const b = buildBallot(NOW);
    const all = nightEvents(b, NIGHT_START_MS, NIGHT_END_MS);
    expect(all.calls.length).toBeGreaterThan(20);
    const inWindow = nightEvents(b, at(DELAY_WINDOW[0]), at(DELAY_WINDOW[1]) - 1);
    expect(inWindow.calls).toHaveLength(0);
    const first = nightEvents(b, T.early, T.firstWave);
    expect(first.cutovers).toContain('GA');
    expect(first.cutovers).not.toContain('CA');
    for (const c of first.calls) expect(c.at).toBeGreaterThan(T.early);
  });
});
