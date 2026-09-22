/**
 * Chamber summary stats (PRD P1): current seat counts, seats up, toss-ups.
 *
 * "Current seat counts" is the chamber as it stands TODAY — a static fact about
 * the outgoing Congress, not a forecast. Lean counts are computed live from the
 * active source. The two are labelled separately and never added together into
 * a projected majority: this prototype does not project chamber control, and
 * for House it structurally cannot (29 curated districts is not 435).
 */
import { leanOf, readFor } from './encoding';
import type { Chamber, Results, StateRace } from './types';

export interface SeatCount {
  dem: number;
  rep: number;
  total: number;
}

/** Composition entering the 2026 midterms. */
export const CURRENT_SEATS: Record<Chamber, SeatCount> = {
  senate: { dem: 47, rep: 53, total: 100 },
  house: { dem: 215, rep: 220, total: 435 },
  governor: { dem: 23, rep: 27, total: 50 },
};

export const CHAMBER_LABEL: Record<Chamber, string> = {
  senate: 'Senate',
  house: 'House',
  governor: 'Governor',
};

export interface ChamberSummary {
  seatsUp: number;
  current: SeatCount;
  /** House tracks a curated subset, so "seats up" is not the full contest count. */
  isSubset: boolean;
  /** True once any race here has cut over to the results feed. */
  isResults: boolean;

  /** Prediction-mode counts, from the active source. Meaningless in results mode. */
  leanDem: number;
  leanRep: number;
  tossups: number;
  unrated: number;

  /** Results-mode counts, from the certified feed. Meaningless pre-election. */
  calledDem: number;
  calledRep: number;
  /** Counting races, by who leads. `leading` is their sum (plus any lead
      the feed has not named yet). A lead is not a result. */
  leadingDem: number;
  leadingRep: number;
  leading: number;
  uncalled: number;
}

/**
 * Prediction counts and results counts are computed here but only ONE set is
 * ever rendered (see ChamberSummary). Showing "13 D lean per polling average"
 * beside a live results map is precisely the blur hub tenet 2 forbids — after
 * cutover the estimate stops being a headline number.
 */
export function summarize(
  races: Record<string, StateRace>,
  chamber: Chamber,
  sourceId: string,
  houseDistrictCount: number
): ChamberSummary {
  let leanDem = 0;
  let leanRep = 0;
  let tossups = 0;
  let unrated = 0;
  let calledDem = 0;
  let calledRep = 0;
  let leadingDem = 0;
  let leadingRep = 0;
  let leading = 0;
  let uncalled = 0;
  let isResults = false;

  const count = (r: Results | undefined) => {
    if (r?.status === 'called') {
      if (r.leader === 'dem') calledDem += 1;
      else calledRep += 1;
    } else if (r?.status === 'counting') {
      leading += 1;
      if (r.leader === 'dem') leadingDem += 1;
      else if (r.leader === 'rep') leadingRep += 1;
    } else {
      uncalled += 1;
    }
  };

  for (const race of Object.values(races)) {
    if (race.mode === 'results') {
      isResults = true;
      // The House is counted by SEAT — the curated districts, each with
      // its own count — so the headline numbers add up to the "seats up"
      // the reader was shown all cycle, not to 16 states.
      const seats = chamber === 'house' ? race.districts?.filter((d) => d.curated) : undefined;
      if (seats && seats.length) seats.forEach((d) => count(d.results));
      else count(race.results);
      continue;
    }

    const read = readFor(race, sourceId);
    if (!read) {
      unrated += 1;
      continue;
    }
    const lean = leanOf(read);
    if (lean === 'dem') leanDem += 1;
    else if (lean === 'rep') leanRep += 1;
    else tossups += 1;
  }

  return {
    // House rows are states; the contest count readers care about is districts.
    seatsUp: chamber === 'house' ? houseDistrictCount : Object.keys(races).length,
    current: CURRENT_SEATS[chamber],
    isSubset: chamber === 'house',
    isResults,
    leanDem,
    leanRep,
    tossups,
    unrated,
    calledDem,
    calledRep,
    leadingDem,
    leadingRep,
    leading,
    uncalled,
  };
}
