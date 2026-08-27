// Visual + verbal encoding of race data.
//
// THE RULE: light = estimate, solid = fact (see colors.css for the long form).
// Step 5 of a party scale is only ever returned for status === 'called'.
// Counting races are capped at step 3 no matter how high reporting gets.
//
// TWO RAMPS, NEVER ONE. Polls are measured in points, markets in implied
// probability. Each gets its own ramp and its own legend; nothing here converts
// between them (PRD: "never blended into a single misleading number").

import { sourceAttribution, sourceLabel, getSource } from './sources';
import type { Party, PredictionParty, SourceRead, StateRace } from './types';

export const PARTY_LABEL: Record<Party, string> = {
  dem: 'Democrat',
  rep: 'Republican',
};

/** A read older than this is surfaced as stale rather than shown silently. */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/**
 * Categorical rating (redesign Aug 2026): Safe/Likely/Lean × party + Toss-up.
 * TWO SETS OF BANDS, NEVER ONE — polls are banded in points, markets in win
 * probability. Nothing converts between them.
 */
export type Rating =
  | 'safe-dem'
  | 'likely-dem'
  | 'lean-dem'
  | 'tossup'
  | 'lean-rep'
  | 'likely-rep'
  | 'safe-rep';

export const RATING_LABEL: Record<Rating, string> = {
  'safe-dem': 'Safe Democrat',
  'likely-dem': 'Likely Democrat',
  'lean-dem': 'Lean Democrat',
  tossup: 'Toss-up',
  'lean-rep': 'Lean Republican',
  'likely-rep': 'Likely Republican',
  'safe-rep': 'Safe Republican',
};

export function ratingOf(read: SourceRead): Rating {
  if (read.kind === 'market') {
    const d = read.demOdds ?? 50;
    const side: Party = d >= 50 ? 'dem' : 'rep';
    const p = Math.max(d, 100 - d); // winner's implied probability
    if (p < 55) return 'tossup';
    if (p < 70) return `lean-${side}`;
    if (p < 90) return `likely-${side}`;
    return `safe-${side}`;
  }
  const m = read.margin ?? 0;
  const side: Party = m >= 0 ? 'dem' : 'rep';
  const a = Math.abs(m);
  if (a < 2) return 'tossup';
  if (a < 5) return `lean-${side}`;
  if (a < 15) return `likely-${side}`;
  return `safe-${side}`;
}

/** Counting races: reporting % -> step, hard-capped at 3 (never solid). */
export function countingStep(reporting: number): 1 | 2 | 3 {
  if (reporting < 40) return 1;
  if (reporting < 80) return 2;
  return 3;
}

/** The active provider's read of a race or district, if it published one. */
export function readFor(
  subject: { reads: SourceRead[] },
  sourceId: string
): SourceRead | undefined {
  return subject.reads.find((r) => r.sourceId === sourceId);
}

/** Which way a single read leans — derived from its rating for consistency. */
export function leanOf(read: SourceRead): PredictionParty {
  const r = ratingOf(read);
  if (r === 'tossup') return 'tossup';
  return r.endsWith('dem') ? 'dem' : 'rep';
}

/** Returns the CSS custom property (as a var() expression) for a race fill. */
export function fillFor(race: StateRace, sourceId: string): string {
  if (race.mode === 'prediction') {
    const read = readFor(race, sourceId);
    if (!read) return 'var(--no-read)';
    return `var(--rating-${ratingOf(read)})`;
  }
  const r = race.results;
  if (!r || r.status === 'uncalled') return 'var(--uncalled)';
  if (r.status === 'counting') {
    if (!r.leader) return 'var(--uncalled)';
    return `var(--${r.leader}-${countingStep(r.reporting)})`;
  }
  // called: the only path to full saturation.
  return r.leader ? `var(--${r.leader}-5)` : 'var(--uncalled)';
}

/**
 * Ink tone for the state-abbreviation label drawn ON a fill. Light fills
 * (lean/tossup steps) take dark ink; saturated fills take light ink;
 * not-on-ballot dims. Must track the rating palette in colors.css.
 */
export function labelToneFor(race: StateRace | undefined, sourceId: string): 'dark' | 'light' | 'dim' {
  if (!race) return 'dim'; // not on ballot
  if (race.mode === 'results') {
    const r = race.results;
    if (!r || r.status === 'uncalled') return 'light';
    if (r.status === 'counting') return 'dark'; // steps 1-3 are light fills
    return 'light'; // called: solid party color
  }
  const read = readFor(race, sourceId);
  if (!read) return 'light'; // no-read gray
  const rating = ratingOf(read);
  return rating === 'tossup' || rating.startsWith('lean') ? 'dark' : 'light';
}

/**
 * True when THIS source published nothing for this race — the designed
 * "no data from this source" state. Never resolved by borrowing another
 * provider's number: a gap is information.
 */
export function hasNoRead(race: StateRace, sourceId: string): boolean {
  return race.mode === 'prediction' && !readFor(race, sourceId);
}

/** True when the diagonal hatch overlay (non-color channel) applies. */
export function isHatched(race: StateRace): boolean {
  return race.mode === 'results' && race.results?.status === 'counting' && !!race.results.leader;
}

export function isLive(race: StateRace): boolean {
  return race.mode === 'results' && race.results?.status === 'counting';
}

function fmtMargin(margin: number): string {
  const party = margin >= 0 ? 'D' : 'R';
  return `${party}+${Math.abs(margin).toFixed(1)}`;
}

/** How a single read reads, in that provider's own units. */
export function readLine(read: SourceRead): string {
  const lean = leanOf(read);
  if (read.kind === 'market') {
    const odds = read.demOdds ?? 50;
    // Always state whose probability this is — "61%" alone is ambiguous.
    const shown = odds >= 50 ? odds : 100 - odds;
    const who = odds >= 50 ? 'Democrat' : 'Republican';
    if (lean === 'tossup') return `Tossup (${who} ${shown.toFixed(0)}% implied)`;
    return `${who} ${shown.toFixed(0)}% implied`;
  }
  const margin = read.margin ?? 0;
  if (lean === 'tossup') return `Tossup (${fmtMargin(margin)})`;
  return `${PARTY_LABEL[lean]} ${fmtMargin(margin)}`;
}

/** Short status text used by tooltip and race list. */
export function statusLine(race: StateRace, sourceId: string): string {
  if (race.mode === 'prediction') {
    const read = readFor(race, sourceId);
    if (!read) return `Not rated by ${sourceLabel(sourceId)}`;
    return `${RATING_LABEL[ratingOf(read)]} — ${readLine(read)}`;
  }
  const r = race.results;
  if (!r || r.status === 'uncalled') return 'Uncalled — no results yet';
  if (r.status === 'counting') {
    const lead = r.leader ? `${PARTY_LABEL[r.leader]} leading` : 'no leader yet';
    return `Counting — ${r.reporting}% reporting, ${lead}`;
  }
  // Check mark = non-color channel for "called".
  return `✓ Called for ${r.leader ? PARTY_LABEL[r.leader] : 'unknown'} (${r.reporting}% reporting)`;
}

/** Full aria-label for a map state, e.g.
 *  "Georgia, counting, 43% reporting, Republican leading". */
export function describeRace(name: string, race: StateRace, sourceId: string): string {
  if (race.mode === 'prediction') {
    const read = readFor(race, sourceId);
    if (!read) return `${name}, not rated by ${sourceLabel(sourceId)}`;
    return `${name}, ${RATING_LABEL[ratingOf(read)]} per ${sourceLabel(sourceId)}`;
  }
  const r = race.results;
  if (!r || r.status === 'uncalled') return `${name}, uncalled, no results yet`;
  if (r.status === 'counting') {
    const lead = r.leader ? `${PARTY_LABEL[r.leader]} leading` : 'no leader yet';
    return `${name}, counting, ${r.reporting}% reporting, ${lead}`;
  }
  return `${name}, called for ${r.leader ? PARTY_LABEL[r.leader] : 'unknown'}, ${r.reporting}% reporting`;
}

/** Attribution for whatever is currently on screen for this race. */
export function sourceOf(race: StateRace, sourceId: string): string {
  if (race.mode === 'results') return race.results?.source ?? 'unknown source';
  return readFor(race, sourceId) ? sourceAttribution(sourceId) : 'not published by this source';
}

export interface Freshness {
  label: string;
  stale: boolean;
}

/**
 * PRD reliability: data "must not silently go stale". Every number on screen
 * pairs with one of these, and past STALE_AFTER_MS it says so out loud.
 */
export function freshnessOf(read: SourceRead | undefined, now: number = Date.now()): Freshness {
  if (!read) return { label: 'no data', stale: true };
  const ageMs = Math.max(0, now - new Date(read.asOf).getTime());
  const stale = ageMs > STALE_AFTER_MS;
  return { label: `as of ${formatAge(ageMs)}`, stale };
}

function formatAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** The freshest read across the whole visible chamber, for the header disclosure. */
export function latestFreshness(
  races: Record<string, StateRace>,
  sourceId: string,
  now: number = Date.now()
): Freshness {
  let newest: SourceRead | undefined;
  for (const race of Object.values(races)) {
    const read = readFor(race, sourceId);
    if (!read) continue;
    if (!newest || new Date(read.asOf) > new Date(newest.asOf)) newest = read;
  }
  return freshnessOf(newest, now);
}

/** Kind of the active source — drives which legend the map shows. */
export function kindOf(sourceId: string) {
  return getSource(sourceId)?.kind ?? 'poll';
}
