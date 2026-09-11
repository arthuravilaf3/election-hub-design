import { DISTRICT_COUNT, districtId } from './districts';
import type { Ballot, Candidate, Chamber, District, Party, Results, SourceRead, StateRace } from './types';

const RESULTS_SOURCE = 'AP vote count (mock)';

// Poll-close waves (ET, mock election night) used for per-state cutoverAt.
const CLOSE: Record<string, string> = {
  '19': '2026-11-03T19:00:00-05:00',
  '19.5': '2026-11-03T19:30:00-05:00',
  '20': '2026-11-03T20:00:00-05:00',
  '21': '2026-11-03T21:00:00-05:00',
  '22': '2026-11-03T22:00:00-05:00',
  '23': '2026-11-03T23:00:00-05:00',
  '25': '2026-11-04T01:00:00-05:00',
};

const WAVE: Record<string, string> = {
  IN: '19', KY: '19', GA: '19', SC: '19', VT: '19', VA: '19', FL: '19',
  NC: '19.5', OH: '19.5', WV: '19.5', AR: '19.5',
  AL: '20', CT: '20', DE: '20', DC: '20', IL: '20', ME: '20', MD: '20', MA: '20',
  MS: '20', MO: '20', NH: '20', NJ: '20', OK: '20', PA: '20', RI: '20', TN: '20',
  AZ: '21', CO: '21', KS: '21', LA: '21', MI: '21', MN: '21', NE: '21', NM: '21',
  NY: '21', ND: '21', SD: '21', TX: '21', WI: '21', WY: '21',
  IA: '22', MT: '22', NV: '22', UT: '22',
  CA: '23', ID: '23', OR: '23', WA: '23',
  AK: '25', HI: '25',
};

/**
 * Seed row: [stateId, polling margin (signed pts, +dem/-rep),
 *            Kalshi P(dem win) 0-100, Polymarket P(dem win) 0-100].
 *
 * The three numbers are authored INDEPENDENTLY, not converted from one
 * another — that is the point of the product. Several rows carry a deliberate
 * 7-9 point poll/market disagreement, and a few have the two markets
 * straddling even money, so the source toggle has something real to show.
 */
type Seed = [string, number, number, number];

/** 2026 Senate: 33 Class-2 seats plus FL and OH specials. 16 states have none. */
const SENATE: Seed[] = [
  ['AL', -24.0, 3, 4], ['AK', -8.5, 18, 22], ['AR', -26.5, 2, 3], ['CO', 9.8, 88, 85],
  ['DE', 18.2, 96, 95], ['FL', -5.2, 26, 33], ['GA', 1.4, 44, 52], ['ID', -29.0, 2, 2],
  ['IL', 13.5, 93, 91], ['IA', -6.8, 22, 31], ['KS', -13.2, 8, 11], ['KY', -21.7, 4, 5],
  ['LA', -17.9, 5, 6], ['ME', 3.1, 58, 49], ['MA', 27.4, 98, 97], ['MI', 2.2, 53, 61],
  ['MN', 6.9, 76, 70], ['MS', -12.4, 9, 14], ['MT', -15.6, 6, 8], ['NE', -14.8, 7, 12],
  ['NH', 5.4, 71, 64], ['NJ', 11.3, 90, 87], ['NM', 8.7, 84, 82], ['NC', -1.1, 46, 38],
  ['OH', -4.3, 31, 40], ['OK', -30.2, 1, 2], ['OR', 12.6, 92, 89], ['RI', 16.1, 95, 94],
  ['SC', -10.5, 12, 16], ['SD', -23.3, 3, 4], ['TN', -20.1, 4, 6], ['TX', -4.9, 28, 37],
  ['VA', 7.2, 80, 74], ['WV', -33.8, 1, 1], ['WY', -40.5, 1, 1],
];

/** 2026 Governor: 36 states. */
const GOVERNOR: Seed[] = [
  ['AL', -22.6, 4, 5], ['AK', -6.2, 24, 30], ['AZ', 0.8, 50, 57], ['AR', -25.1, 3, 3],
  ['CA', 21.9, 97, 96], ['CO', 10.4, 89, 86], ['CT', 12.8, 91, 90], ['FL', -7.6, 19, 27],
  ['GA', -2.4, 39, 47], ['HI', 19.7, 96, 95], ['ID', -28.4, 2, 3], ['IL', 14.2, 93, 92],
  ['IA', -5.7, 25, 34], ['KS', 1.9, 52, 44], ['ME', 6.1, 74, 68], ['MD', 17.5, 95, 94],
  ['MA', 15.3, 94, 93], ['MI', 3.7, 62, 55], ['MN', 5.9, 73, 67], ['NE', -18.3, 5, 7],
  ['NV', 1.2, 51, 59], ['NH', -3.3, 36, 43], ['NM', 9.1, 86, 83], ['NY', 13.9, 92, 91],
  ['OH', -8.9, 16, 24], ['OK', -26.7, 2, 3], ['OR', 11.7, 90, 88], ['PA', 4.6, 66, 58],
  ['RI', 14.8, 93, 92], ['SC', -11.2, 11, 15], ['SD', -21.4, 4, 5], ['TN', -19.8, 4, 6],
  ['TX', -6.4, 23, 32], ['VT', 24.3, 98, 97], ['WI', 2.8, 57, 49], ['WY', -38.9, 1, 1],
];

/**
 * House: the 29 curated closest districts, grouped by state.
 *
 * A 50-state choropleth cannot draw 435 districts, so the state fill shows the
 * NET lean of that state's curated districts — authored as its own read, not
 * averaged from the rows below — and the per-district detail lives in the
 * zoomed frame. Curation owner is still an open question (see the context skill).
 */
const HOUSE: Array<{ state: Seed; districts: Array<[string, Party, number, number, number]> }> = [
  { state: ['AZ', -0.6, 47, 53], districts: [['AZ-01', 'rep', -1.2, 45, 51], ['AZ-06', 'rep', -2.8, 41, 48]] },
  { state: ['CA', 2.9, 58, 51], districts: [
    ['CA-13', 'rep', 1.4, 54, 47], ['CA-22', 'rep', -0.9, 47, 53], ['CA-27', 'rep', 3.6, 62, 55],
    ['CA-41', 'rep', -3.1, 38, 45], ['CA-45', 'rep', 4.2, 66, 58]] },
  { state: ['CO', 1.8, 55, 48], districts: [['CO-08', 'dem', 1.8, 55, 48]] },
  { state: ['IA', -3.4, 35, 42], districts: [['IA-01', 'rep', -2.6, 40, 46], ['IA-03', 'rep', -4.1, 32, 39]] },
  { state: ['ME', 4.2, 65, 57], districts: [['ME-02', 'dem', 4.2, 65, 57]] },
  { state: ['MI', 1.1, 51, 58], districts: [['MI-07', 'rep', -0.7, 48, 54], ['MI-08', 'dem', 2.9, 57, 62]] },
  { state: ['NE', -2.7, 40, 46], districts: [['NE-02', 'rep', -2.7, 40, 46]] },
  { state: ['NV', 2.2, 56, 49], districts: [['NV-01', 'dem', 1.9, 54, 47], ['NV-03', 'dem', 2.5, 58, 51]] },
  { state: ['NJ', 3.6, 62, 55], districts: [['NJ-07', 'rep', 3.6, 62, 55]] },
  { state: ['NM', 5.1, 70, 63], districts: [['NM-02', 'dem', 5.1, 70, 63]] },
  { state: ['NY', 1.6, 53, 60], districts: [
    ['NY-04', 'dem', 2.8, 58, 64], ['NY-17', 'rep', -1.4, 45, 52],
    ['NY-19', 'rep', 0.6, 50, 57], ['NY-22', 'rep', -0.3, 48, 55]] },
  { state: ['OH', -4.1, 32, 40], districts: [['OH-09', 'dem', -4.1, 32, 40]] },
  { state: ['PA', 0.4, 49, 56], districts: [
    ['PA-07', 'dem', 1.1, 52, 59], ['PA-08', 'dem', -0.8, 47, 54], ['PA-10', 'rep', -2.2, 42, 49]] },
  { state: ['TX', -5.3, 27, 35], districts: [['TX-34', 'dem', -5.3, 27, 35]] },
  { state: ['VA', 2.4, 57, 50], districts: [['VA-02', 'rep', 2.4, 57, 50]] },
  { state: ['WI', -1.3, 45, 52], districts: [['WI-03', 'rep', -1.3, 45, 52]] },
];

/** Stable per-id pseudo-variety so fixtures are deterministic across reloads. */
function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return h;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * MARKET COVERAGE GAPS — authored, not derived. Prediction markets list the
 * contests that draw volume; safe seats and small races often have no market
 * at all. Keeping real holes in the fixture is what keeps the "no data from
 * this source" state honest: a source with nothing to say must SAY nothing,
 * never inherit another provider's number (and a trust pick pointed at a hole
 * stays empty too).
 */
const MARKET_GAPS: Record<string, string[]> = {
  kalshi: ['governor:VT', 'governor:WY', 'senate:WV', 'house:NE'],
  polymarket: ['governor:VT', 'senate:ID', 'house:CO'],
};

/**
 * Polling averages refresh a few times a day; markets tick continuously. The
 * gap is deliberate — it is what the freshness line has to communicate.
 */
function buildReads(id: string, [, poll, kalshi, poly]: Seed, now: number): SourceRead[] {
  const h = hash(id);
  const reads: SourceRead[] = [
    { sourceId: 'dw-poll-avg', kind: 'poll', margin: poll, asOf: new Date(now - (2 * HOUR + (h % 90) * MINUTE)).toISOString() },
    { sourceId: 'kalshi', kind: 'market', demOdds: kalshi, asOf: new Date(now - (3 + (h % 14)) * MINUTE).toISOString() },
    // FIXTURE DISAGREEMENT (Sep 2026): in every third race the market reads
    // the Republican 9 points stronger than the poll does, so switching
    // sources visibly moves leans — the product's whole premise on show.
    { sourceId: 'polymarket', kind: 'market', demOdds: h % 3 === 0 ? Math.max(3, poly - 9) : poly, asOf: new Date(now - (2 + (h % 21)) * MINUTE).toISOString() },
  ];
  return reads.filter((r) => !MARKET_GAPS[r.sourceId]?.includes(id));
}

/**
 * FIXTURE ONLY — results are derived from the polling margin so the existing
 * election-night simulation still has something to play. Nothing at runtime
 * may infer a result from a prediction (hub tenet 3).
 */
function seedResults(id: string, poll: number): Results {
  const abs = Math.abs(poll);
  const leader: Party = poll >= 0 ? 'dem' : 'rep';
  const h = hash(id);
  if (abs >= 15) {
    return { status: 'called', reporting: 70 + (h % 27), leader, margin: poll, source: RESULTS_SOURCE };
  }
  if (h % 11 === 0) return { status: 'uncalled', reporting: 0, source: RESULTS_SOURCE };
  if (abs >= 6) {
    return { status: 'counting', reporting: 45 + (h % 45), leader, margin: poll, source: RESULTS_SOURCE };
  }
  return { status: 'counting', reporting: 8 + (h % 60), leader, margin: poll, source: RESULTS_SOURCE };
}

/** FIXTURE candidate names — deterministic per race so reloads are stable. */
const DEM_NAMES = ['Becky Stille', 'Laura Chen', 'Marcus Webb', 'Angela Torres', 'David Kim', 'Sarah Whitfield', 'James Porter', 'Maria Alvarez'];
const REP_NAMES = ['Adrian Smith', 'Tom Hardin', 'Grace Miller', 'Frank Delgado', 'Nancy Cole', 'Peter Vance', 'Rachel Boone', 'Carl Jensen'];
const IND_NAMES = ['Mark Cohen', 'Jill Sanders', 'Ray Otto', 'Dana Fox'];

/**
 * Candidate shares derive from the polling margin (margin IS a share
 * difference, so the inversion invents nothing); every ~5th race carries a
 * small independent, carved out of both sides.
 */
function buildCandidates(key: string, poll: number): Candidate[] {
  const h = hash(key);
  const ind = h % 5 === 0 ? 1 + (h % 4) : 0;
  const demShare = ((100 - ind) * (50 + poll / 2)) / 100;
  const repShare = 100 - ind - demShare;
  const list: Candidate[] = [
    { name: DEM_NAMES[h % DEM_NAMES.length], party: 'dem', pct: Math.round(demShare * 10) / 10 },
    { name: REP_NAMES[(h >> 2) % REP_NAMES.length], party: 'rep', pct: Math.round(repShare * 10) / 10 },
  ];
  if (ind) list.push({ name: IND_NAMES[h % IND_NAMES.length], party: 'ind', pct: ind });
  return list.sort((a, b) => b.pct - a.pct);
}

/**
 * The state's FULL 2026 delegation, not just the curated rows: every seat
 * the state actually elects (2020 apportionment, see districts.ts).
 *
 * The curated "closest races" keep their authored numbers — those are the
 * ones the map and the game are scoped to. Every other seat is generated
 * around the STATE's own read, deterministically, so the list can never
 * contradict the color the state carries on the map. Each district still
 * owns its three separate reads: nothing here is a blended number.
 */
function buildDelegation(seed: Seed, curated: District[], now: number): District[] {
  const [stateId, poll, kalshi, poly] = seed;
  const total = DISTRICT_COUNT[stateId] ?? curated.length;
  const authored = new Map(curated.map((d) => [d.id, d]));
  const clamp = (v: number) => Math.max(3, Math.min(97, Math.round(v)));
  const out: District[] = [];

  for (let seat = 1; seat <= total; seat++) {
    const id = districtId(stateId, seat);
    const known = authored.get(id);
    if (known) {
      out.push(known);
      continue;
    }
    const h = hash(`${id}:seat`);
    // Seats spread around the statewide margin: most safe, a few close.
    const swing = ((h % 29) - 14) * 0.9; // ±12.6 pts
    const districtPoll = Math.round((poll + swing) * 10) / 10;
    const shift = swing * 2.4;
    // ~1 in 7 seats is held by the party it does NOT lean toward — the
    // seats that make a delegation interesting.
    const lean: Party = districtPoll >= 0 ? 'dem' : 'rep';
    out.push({
      id,
      incumbent: h % 7 === 0 ? (lean === 'dem' ? 'rep' : 'dem') : lean,
      reads: buildReads(id, [id, districtPoll, clamp(kalshi + shift), clamp(poly + shift)], now),
    });
  }
  return out;
}

function buildRace(seed: Seed, chamber: Chamber, now: number, districts?: District[]): StateRace {
  const [id, poll] = seed;
  return {
    id,
    chamber,
    mode: 'prediction',
    reads: buildReads(`${chamber}:${id}`, seed, now),
    candidates: buildCandidates(`${chamber}:${id}`, poll),
    districts,
    results: seedResults(`${chamber}:${id}`, poll),
    cutoverAt: CLOSE[WAVE[id] ?? '21'],
  };
}

/**
 * Every race starts in prediction mode; results are pre-seeded so cutover
 * (global or per-state) reveals a night already in progress.
 *
 * A state absent from a chamber's record has no race in that chamber.
 */
export function buildBallot(now: number = Date.now()): Ballot {
  const senate: Record<string, StateRace> = {};
  for (const seed of SENATE) senate[seed[0]] = buildRace(seed, 'senate', now);

  const governor: Record<string, StateRace> = {};
  for (const seed of GOVERNOR) governor[seed[0]] = buildRace(seed, 'governor', now);

  const house: Record<string, StateRace> = {};
  for (const { state, districts } of HOUSE) {
    const curated: District[] = districts.map(([id, incumbent, poll, kalshi, poly]) => ({
      id,
      incumbent,
      reads: buildReads(id, [id, poll, kalshi, poly], now),
      curated: true,
    }));
    house[state[0]] = buildRace(state, 'house', now, buildDelegation(state, curated, now));
  }

  return { senate, house, governor };
}

/** Total curated House districts — the hub's "29 closest races" set. */
export const HOUSE_DISTRICT_COUNT = HOUSE.reduce((n, s) => n + s.districts.length, 0);
