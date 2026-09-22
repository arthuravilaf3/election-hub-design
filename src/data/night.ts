/**
 * ELECTION NIGHT, SIMULATED (Sep 2026, PRD "Election Results Map").
 *
 * The prototype has no results feed, so the night is a pure function of the
 * clock: given a moment between 6 PM and 3 AM ET, every race's results are
 * computed here — deterministically, the same on every visit and in every
 * screenshot — from three authored facts:
 *
 *   TRUE_OUTCOME   what actually happened, one signed margin per race. THE
 *                  ANSWER KEY. It is authored, not derived from the polls or
 *                  the markets (hub tenet 1 / PRD tenet 1: a call traces to
 *                  the provider, never to a projection). Several races are
 *                  deliberate upsets against the pre-election read.
 *   cutoverAt      when the state's polls close (mockRaces.ts, by wave)
 *   the shape of a count: reporting climbs on a curve, the shown margin
 *                  drifts from an early skew toward the true margin (a red
 *                  mirage here, a blue shift there), and the provider calls
 *                  the race once enough is in and the margin is clear —
 *                  some never before 3 AM
 *
 * Nothing here reads `reads`. A race's prediction and its result are two
 * unrelated numbers, on purpose.
 */
import { DEFAULT_RESULTS_PROVIDER } from './sources';
import type { Ballot, Candidate, CandidateResult, Chamber, Party, Results, StateRace } from './types';

const MINUTE = 60_000;
/** The feed publishes in five-minute batches. */
export const BATCH_MS = 5 * MINUTE;

export const NIGHT_START = '2026-11-03T18:00:00-05:00';
export const NIGHT_END = '2026-11-04T03:00:00-05:00';
export const NIGHT_START_MS = new Date(NIGHT_START).getTime();
export const NIGHT_END_MS = new Date(NIGHT_END).getTime();

/** The provider goes quiet for 25 minutes: nothing new lands, and the map
    must say so rather than sit still (PRD: never stale or silently frozen). */
export const DELAY_WINDOW: [string, string] = ['2026-11-03T22:10:00-05:00', '2026-11-03T22:35:00-05:00'];
const DELAY_START_MS = new Date(DELAY_WINDOW[0]).getTime();
const DELAY_END_MS = new Date(DELAY_WINDOW[1]).getTime();

/** Below this share of the expected vote the provider names no leader:
    the race is "too early to call". */
export const TOO_EARLY_BELOW = 5;

/**
 * THE ANSWER KEY — signed final margin in points, +dem / −rep, keyed
 * `chamber:state` and, for the curated House seats, `house:PA-07`.
 * Authored (Sep 22 2026); the upsets against the pre-election read are
 * IA, NH, FL, ME and GA in the Senate, KS, MI and PA for governor, PA-08,
 * NY-17 and NE-02 in the House.
 */
export const TRUE_OUTCOME: Record<string, number> = {
  'senate:AL': -24.0, 'senate:AK': -9.4, 'senate:AR': -21.1, 'senate:CO': 9.8,
  'senate:DE': 13.7, 'senate:FL': 1.9, 'senate:GA': -0.4, 'senate:ID': -23.6,
  'senate:IL': 14.4, 'senate:IA': 2.1, 'senate:KS': -8.7, 'senate:KY': -23.5,
  'senate:LA': -13.4, 'senate:ME': -0.9, 'senate:MA': 24.7, 'senate:MI': 3.9,
  'senate:MN': 4.2, 'senate:MS': -10.6, 'senate:MT': -12.9, 'senate:NE': -9.4,
  'senate:NH': -2.4, 'senate:NJ': 9.5, 'senate:NM': 9.6, 'senate:NC': 2.3,
  'senate:OH': -6.8, 'senate:OK': -26.6, 'senate:OR': 10.8, 'senate:RI': 11.6,
  'senate:SC': -15.9, 'senate:SD': -27.8, 'senate:TN': -22.8, 'senate:TX': -1.2,
  'senate:VA': 1.8, 'senate:WV': -39.2, 'senate:WY': -43.2, 'governor:AL': -21.7,
  'governor:AK': -6.2, 'governor:AZ': 0.3, 'governor:AR': -30.5, 'governor:CA': 21.9,
  'governor:CO': 11.3, 'governor:CT': 18.2, 'governor:FL': -7.6, 'governor:GA': -7.8,
  'governor:HI': 14.3, 'governor:ID': -33.8, 'governor:IL': 16.0, 'governor:IA': -2.1,
  'governor:KS': -3.4, 'governor:ME': 7.9, 'governor:MD': 18.4, 'governor:MA': 13.5,
  'governor:MI': -2.7, 'governor:MN': 4.1, 'governor:NE': -23.7, 'governor:NV': -1.1,
  'governor:NH': 1.6, 'governor:NM': 10.9, 'governor:NY': 14.8, 'governor:OH': -7.1,
  'governor:OK': -22.2, 'governor:OR': 10.8, 'governor:PA': -1.8, 'governor:RI': 19.3,
  'governor:SC': -7.6, 'governor:SD': -16.9, 'governor:TN': -25.2, 'governor:TX': -2.8,
  'governor:VT': 21.6, 'governor:WI': 4.4, 'governor:WY': -44.3, 'house:AZ': 0.3,
  'house:CA': 1.2, 'house:CO': 1.8, 'house:IA': -0.7, 'house:ME': 5.1,
  'house:MI': 5.6, 'house:NE': 2.7, 'house:NV': -0.5, 'house:NJ': 1.8,
  'house:NM': 6.0, 'house:NY': 1.6, 'house:OH': -3.2, 'house:PA': -0.6,
  'house:TX': -2.6, 'house:VA': 5.1, 'house:WI': 1.4, 'house:AZ-01': 4.2,
  'house:AZ-06': -0.5, 'house:CA-13': 2.3, 'house:CA-22': 1.1, 'house:CA-27': 0.9,
  'house:CA-41': -2.2, 'house:CA-45': 8.7, 'house:CO-08': 5.4, 'house:IA-01': -0.8,
  'house:IA-03': -0.5, 'house:ME-02': -0.3, 'house:MI-07': 3.8, 'house:MI-08': 8.3,
  'house:NE-02': 1.7, 'house:NV-01': -2.6, 'house:NV-03': -0.2, 'house:NJ-07': 6.3,
  'house:NM-02': 9.6, 'house:NY-04': 3.7, 'house:NY-17': 2.6, 'house:NY-19': -1.2,
  'house:NY-22': -3.9, 'house:OH-09': -4.1, 'house:PA-07': 0.9, 'house:PA-08': 0.3,
  'house:PA-10': -1.3, 'house:TX-34': -5.3, 'house:VA-02': 4.2, 'house:WI-03': -1.3,
};

/** Races the provider has NOT called by 3 AM — too close, still counting. */
export const NEVER_CALLED = new Set([
  'senate:GA',
  'senate:ME',
  'senate:NC',
  'governor:AZ',
  'governor:NV',
  'house:PA',
  'house:PA-08',
  'house:CA-22',
  'house:AZ-06',
]);

/** States whose count stalls for hours (mail ballots, the West). */
const SLOW = new Set(['AZ', 'NV', 'CA', 'WA', 'OR', 'AK']);

/** Expected turnout, in thousands, for the big states; the rest are hashed. */
const EXPECTED_VOTES: Record<string, number> = {
  CA: 11200, TX: 8400, FL: 7900, NY: 5800, PA: 5600, IL: 4300, OH: 4600, GA: 4000,
  NC: 3900, MI: 4400, NJ: 3300, VA: 3400, WA: 3200, AZ: 2700, MA: 2900, TN: 2500,
  IN: 2400, MO: 2400, MD: 2300, WI: 2800, CO: 2600, MN: 2700, SC: 2100, AL: 1800,
};

/** Stable per-key pseudo-variety (the fixture's own hash, kept separate). */
function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return h;
}

export function trueLeaderOf(key: string): Party {
  const m = TRUE_OUTCOME[key];
  if (m === undefined) return 'rep';
  return m >= 0 ? 'dem' : 'rep';
}

const stateOf = (key: string) => key.split(':')[1].slice(0, 2);

/** The count's shape for one race — memoised, it is used per tick. */
interface Curve {
  tau: number;
  slowCap: number | null;
  skew: number;
  expected: number;
}
const curves = new Map<string, Curve>();
function curveOf(key: string): Curve {
  let c = curves.get(key);
  if (!c) {
    const h = hash(key);
    const st = stateOf(key);
    c = {
      // Time constant of the count, 45–150 minutes.
      tau: 45 + (h % 106),
      // The slow states stall between 55 and 80% for three hours.
      slowCap: SLOW.has(st) ? 55 + (h % 26) : null,
      // Early skew of the shown margin, ±8 points, fading as the count fills.
      skew: ((h >> 3) % 17) - 8,
      expected: (EXPECTED_VOTES[st] ?? 400 + (h % 140) * 10) * (key.includes('-') ? 0.12 : 1),
    };
    curves.set(key, c);
  }
  return c;
}

/** Share of the expected vote counted, `elapsed` minutes after the close. */
function reportingAt(key: string, elapsed: number): number {
  if (elapsed < 0) return 0;
  const c = curveOf(key);
  let r = 100 * (1 - Math.exp(-elapsed / c.tau));
  if (c.slowCap !== null && elapsed < 180) r = Math.min(r, c.slowCap);
  // A count is never quite "all in" on the night.
  return Math.min(99, Math.round(r));
}

/** The margin the provider shows at this point of the count. */
function shownMarginAt(key: string, reporting: number): number {
  const t = TRUE_OUTCOME[key] ?? 0;
  const c = curveOf(key);
  return Math.round((t + c.skew * (1 - reporting / 100)) * 10) / 10;
}

/**
 * When the provider calls the race, in minutes after the close — or null if
 * it never does before 3 AM. A landslide is called at the close; a clear
 * race once 40% is in and the lead holds 4 points; a close one only at 90%
 * with a lead of a point and a half. Memoised: the search is a scan.
 */
const callTimes = new Map<string, number | null>();
export function callDelayOf(key: string): number | null {
  const known = callTimes.get(key);
  if (known !== undefined) return known;
  let delay: number | null = null;
  if (!NEVER_CALLED.has(key) && TRUE_OUTCOME[key] !== undefined) {
    const abs = Math.abs(TRUE_OUTCOME[key]);
    const [thr, lead] = abs >= 15 ? [0, 0] : abs >= 5 ? [40, 4] : [90, 1.5];
    if (thr === 0) {
      delay = (hash(key) % 3) * 5;
    } else {
      for (let m = 0; m <= 9 * 60; m += 5) {
        const r = reportingAt(key, m);
        if (r >= thr && Math.abs(shownMarginAt(key, r)) >= lead) {
          delay = m;
          break;
        }
      }
    }
  }
  callTimes.set(key, delay);
  return delay;
}

/** The provider's clock: what it has published as of `tMs`. */
export function feedAt(tMs: number): { asOf: string; delayed: boolean; effectiveAt: number } {
  const delayed = tMs >= DELAY_START_MS && tMs < DELAY_END_MS;
  const effectiveAt = delayed ? DELAY_START_MS : tMs;
  const batch = Math.floor(effectiveAt / BATCH_MS) * BATCH_MS;
  return { asOf: new Date(batch).toISOString(), delayed, effectiveAt };
}

function splitVotes(candidates: Candidate[] | undefined, margin: number, total: number): CandidateResult[] {
  const list = candidates ?? [
    { name: 'Democrat', party: 'dem', pct: 0 },
    { name: 'Republican', party: 'rep', pct: 0 },
  ];
  const ind = list.filter((c) => c.party === 'ind').reduce((n, c) => n + c.pct, 0);
  const demShare = ((100 - ind) * (50 + margin / 2)) / 100;
  const repShare = 100 - ind - demShare;
  return list
    .map((c) => {
      const pct = c.party === 'dem' ? demShare : c.party === 'rep' ? repShare : c.pct;
      return { name: c.name, party: c.party, pct: Math.round(pct * 10) / 10, votes: Math.round((total * pct) / 100) };
    })
    .sort((a, b) => b.votes - a.votes);
}

/**
 * One race's results as published at `tMs` — undefined before its polls
 * close. `tMs` should already be the feed's effective time (see feedAt).
 */
export function raceAt(key: string, cutoverAt: string, tMs: number, candidates?: Candidate[]): Results | undefined {
  const close = new Date(cutoverAt).getTime();
  if (tMs < close) return undefined;
  const batchMs = Math.floor((tMs - close) / BATCH_MS) * BATCH_MS;
  const elapsed = batchMs / MINUTE;
  const reporting = reportingAt(key, elapsed);
  const asOf = new Date(close + batchMs).toISOString();
  const callDelay = callDelayOf(key);
  const called = callDelay !== null && elapsed >= callDelay;
  const margin = shownMarginAt(key, reporting);
  const total = Math.round((curveOf(key).expected * 1000 * reporting) / 100);
  const votes = reporting > 0 ? splitVotes(candidates, margin, total) : undefined;
  if (called) {
    return {
      status: 'called',
      reporting,
      leader: trueLeaderOf(key),
      margin: reporting > 0 ? margin : undefined,
      providerId: DEFAULT_RESULTS_PROVIDER,
      votes,
      totalVotes: total,
      asOf,
    };
  }
  if (reporting < TOO_EARLY_BELOW) {
    return { status: 'uncalled', reporting, providerId: DEFAULT_RESULTS_PROVIDER, votes, totalVotes: total, asOf };
  }
  return {
    status: 'counting',
    reporting,
    leader: margin >= 0 ? 'dem' : 'rep',
    margin,
    providerId: DEFAULT_RESULTS_PROVIDER,
    votes,
    totalVotes: total,
    asOf,
  };
}

const CHAMBERS: Chamber[] = ['senate', 'house', 'governor'];

function sameResults(a: Results | undefined, b: Results | undefined): boolean {
  if (!a || !b) return a === b;
  return a.asOf === b.asOf && a.status === b.status && a.reporting === b.reporting;
}

/**
 * The whole ballot as the feed has it at `tMs`: every race whose polls have
 * closed is in results mode with its count; the rest are still predictions.
 * Races that did not change keep their object identity, so a tick that
 * moved nothing costs nothing downstream.
 */
export function snapshotAt(ballot: Ballot, tMs: number): Ballot {
  const { effectiveAt } = feedAt(tMs);
  const next = {} as Ballot;
  for (const chamber of CHAMBERS) {
    const races = ballot[chamber];
    const out: Record<string, StateRace> = {};
    for (const id of Object.keys(races)) {
      const race = races[id];
      const key = `${chamber}:${id}`;
      const results = race.cutoverAt ? raceAt(key, race.cutoverAt, effectiveAt, race.candidates) : undefined;
      if (!results) {
        out[id] = race.mode === 'prediction' && !race.results ? race : { ...race, mode: 'prediction', results: undefined };
        continue;
      }
      let districts = race.districts;
      let districtsChanged = false;
      if (districts) {
        const nextDistricts = districts.map((d) => {
          if (!d.curated) return d;
          const r = raceAt(`house:${d.id}`, race.cutoverAt!, effectiveAt);
          if (sameResults(d.results, r)) return d;
          districtsChanged = true;
          return { ...d, results: r };
        });
        if (districtsChanged) districts = nextDistricts;
      }
      if (race.mode === 'results' && sameResults(race.results, results) && !districtsChanged) {
        out[id] = race;
      } else {
        out[id] = { ...race, mode: 'results', results, districts };
      }
    }
    next[chamber] = out;
  }
  return next;
}

export interface Call {
  chamber: Chamber;
  stateId: string;
  leader: Party;
  /** When the provider published the call (ms). */
  at: number;
}

/**
 * What happened between two moments of the night: which states' polls
 * closed, which races were called. A call that lands inside the delay
 * window reaches the reader when the feed catches up, at its end.
 */
export function nightEvents(ballot: Ballot, prevMs: number, tMs: number): { calls: Call[]; cutovers: string[] } {
  const calls: Call[] = [];
  const cutovers = new Set<string>();
  const publishedAt = (ms: number) => (ms >= DELAY_START_MS && ms < DELAY_END_MS ? DELAY_END_MS : ms);
  for (const chamber of CHAMBERS) {
    for (const race of Object.values(ballot[chamber])) {
      if (!race.cutoverAt) continue;
      const close = new Date(race.cutoverAt).getTime();
      if (close > prevMs && close <= tMs) cutovers.add(race.id);
      const key = `${chamber}:${race.id}`;
      const delay = callDelayOf(key);
      if (delay === null) continue;
      const at = publishedAt(close + delay * MINUTE);
      if (at > prevMs && at <= tMs) calls.push({ chamber, stateId: race.id, leader: trueLeaderOf(key), at });
    }
  }
  calls.sort((a, b) => a.at - b.at);
  return { calls, cutovers: [...cutovers] };
}
