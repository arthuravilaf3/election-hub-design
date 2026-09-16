import { describe, expect, it } from 'vitest';
import {
  STALE_AFTER_MS,
  fillFor,
  freshnessOf,
  isHatched,
  leanOf,
  ratingOf,
  readLine,
  statusLine,
} from './encoding';
import type { SourceRead, StateRace } from './types';

const NOW = new Date('2026-08-14T12:00:00Z').getTime();

function read(partial: Partial<SourceRead>): SourceRead {
  return {
    sourceId: 'dw-poll-avg',
    kind: 'poll',
    asOf: new Date(NOW).toISOString(),
    ...partial,
  };
}

function race(reads: SourceRead[], overrides: Partial<StateRace> = {}): StateRace {
  return { id: 'GA', chamber: 'senate', mode: 'prediction', reads, ...overrides };
}

describe('results mode keeps the status encoding', () => {
  it('reserves step 5 for called races', () => {
    const base = race([], { mode: 'results' });
    const counting = {
      ...base,
      results: { status: 'counting' as const, reporting: 100, leader: 'rep' as const, source: 'AP' },
    };
    expect(fillFor(counting, 'dw-poll-avg')).toBe('var(--rep-4)');
    const called = {
      ...base,
      results: { status: 'called' as const, reporting: 62, leader: 'rep' as const, source: 'AP' },
    };
    expect(fillFor(called, 'dw-poll-avg')).toBe('var(--rep-5)');
  });

  it('hatches counting races and nothing else', () => {
    const results = (status: 'uncalled' | 'counting' | 'called') =>
      race([], {
        mode: 'results',
        results: { status, reporting: 50, leader: 'dem', source: 'AP' },
      });
    expect(isHatched(results('counting'))).toBe(true);
    expect(isHatched(results('called'))).toBe(false);
    expect(isHatched(results('uncalled'))).toBe(false);
  });
});

describe('categorical ratings: two band sets, never one', () => {
  it('bands polls in points (2 / 5 / 15)', () => {
    expect(ratingOf(read({ margin: 1.4 }))).toBe('tossup');
    expect(ratingOf(read({ margin: 3.2 }))).toBe('lean-dem');
    expect(ratingOf(read({ margin: -9.6 }))).toBe('likely-rep');
    expect(ratingOf(read({ margin: 21.4 }))).toBe('safe-dem');
    expect(ratingOf(read({ margin: -33.8 }))).toBe('safe-rep');
  });

  it('bands markets in winner probability (55 / 70 / 90)', () => {
    expect(ratingOf(read({ kind: 'market', demOdds: 52 }))).toBe('tossup');
    expect(ratingOf(read({ kind: 'market', demOdds: 58 }))).toBe('lean-dem');
    expect(ratingOf(read({ kind: 'market', demOdds: 26 }))).toBe('likely-rep');
    expect(ratingOf(read({ kind: 'market', demOdds: 96 }))).toBe('safe-dem');
    // Symmetric: 10% D is exactly as decisive as 90% D.
    expect(ratingOf(read({ kind: 'market', demOdds: 10 }))).toBe('safe-rep');
  });

  it('colors the same race differently under poll and market reads', () => {
    const r = race([
      read({ sourceId: 'dw-poll-avg', kind: 'poll', margin: -1.1 }),
      read({ sourceId: 'kalshi', kind: 'market', demOdds: 38 }),
    ]);
    expect(fillFor(r, 'dw-poll-avg')).toBe('var(--rating-tossup)');
    expect(fillFor(r, 'kalshi')).toBe('var(--rating-lean-rep)');
  });

  it('derives lean from the rating side', () => {
    expect(leanOf(read({ margin: 1.4 }))).toBe('tossup');
    expect(leanOf(read({ margin: 2.6 }))).toBe('dem');
    expect(leanOf(read({ kind: 'market', demOdds: 42 }))).toBe('rep');
  });

  it('states whose probability a market number is', () => {
    expect(readLine(read({ kind: 'market', demOdds: 38 }))).toBe('Republican 62% implied');
    expect(readLine(read({ kind: 'market', demOdds: 71 }))).toBe('Democrat 71% implied');
  });

  it('speaks the rating in the status line', () => {
    const r = race([read({ margin: -9.6 })]);
    expect(statusLine(r, 'dw-poll-avg')).toContain('Likely Republican');
  });

  it('falls back to an explicit not-rated state', () => {
    const r = race([read({ sourceId: 'dw-poll-avg', margin: 5 })]);
    expect(fillFor(r, 'polymarket')).toBe('var(--no-read)');
    expect(statusLine(r, 'polymarket')).toContain('Not rated');
  });
});

describe('freshness', () => {
  it('labels recent reads without a stale flag', () => {
    const r = read({ asOf: new Date(NOW - 20 * 60_000).toISOString() });
    expect(freshnessOf(r, NOW)).toEqual({ label: 'as of 20 min ago', stale: false });
  });

  it('flags anything past the stale threshold', () => {
    const r = read({ asOf: new Date(NOW - STALE_AFTER_MS - 60_000).toISOString() });
    expect(freshnessOf(r, NOW).stale).toBe(true);
  });

  it('treats a missing read as stale rather than silently fresh', () => {
    expect(freshnessOf(undefined, NOW)).toEqual({ label: 'no data', stale: true });
  });
});
