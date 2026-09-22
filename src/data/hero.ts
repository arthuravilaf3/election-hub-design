/**
 * The forecast STATEMENT ("Democrats have a 77% chance of winning the House.")
 * and its supporting numbers, per chamber + ACTIVE source.
 *
 * This is the map card's own dynamic copy — it lives beside the controls that
 * change it, never up in the page title. The page title is static editorial.
 *
 * MOCK MATH, clearly quarantined: the "chance" is a display fixture derived
 * from the lean-count gap in the active source's ratings — it is NOT a model.
 * A real launch replaces chanceFor() with a licensed forecast, or drops the
 * probability framing entirely. Everything else here is real ballot data.
 */
import { leanOf, readFor } from './encoding';
import { CURRENT_SEATS, type ChamberSummary } from './summary';
import { resultsLabel } from './sources';
import { formatDateET, formatET } from './time';
import type { Chamber, StateRace } from './types';

const CHAMBER_PHRASE: Record<Chamber, string> = {
  house: 'winning the House',
  senate: 'winning the Senate',
  governor: 'winning the most governorships',
};

export interface ForecastData {
  /** The statement itself. */
  title: string;
  /** The same read in the comp's short form — "53% chance Democrats take
   *  the House" — for the dots block, where it sits beside the grid at 56px
   *  and has no room for a full sentence. */
  headline: string;
  /** The one number the sentence is about — set in bold inside the headline
   *  (the DS mock sets the statement in regular with the figure in bold). */
  emphasis?: string;
  /** Clock time of the freshest read behind the statement, '' if none. */
  updated: string;
  dem: number;
  rep: number;
  seatsUp: number;
  tossups: number;
  /** Seat-bar split, 0-100 (share of current seats). */
  demShare: number;
  /** Toss-up races as a share of the chamber, 0-100 — the neutral gap. */
  tossupShare: number;
}

export function forecastFor(
  races: Record<string, StateRace>,
  chamber: Chamber,
  sourceId: string,
  seatsUp: number
): ForecastData {
  let demLeans = 0;
  let repLeans = 0;
  let tossups = 0;
  let newest = 0;
  for (const race of Object.values(races)) {
    const read = readFor(race, sourceId);
    if (!read) continue;
    newest = Math.max(newest, new Date(read.asOf).getTime());
    const lean = leanOf(read);
    if (lean === 'dem') demLeans += 1;
    else if (lean === 'rep') repLeans += 1;
    else tossups += 1;
  }

  const gap = demLeans - repLeans;
  let title: string;
  let headline: string;
  let emphasis: string | undefined;
  const body = chamber === 'governor' ? 'governorships' : chamber === 'house' ? 'House' : 'Senate';
  if (gap === 0) {
    title = `Control of the ${body} is a toss-up.`;
    headline = `Control of the ${body} is a toss-up`;
  } else {
    // Fixture probability: 55% floor + 3pts per race of lean gap, capped 95.
    const chance = Math.min(95, 55 + 3 * Math.abs(gap));
    const leader = gap > 0 ? 'Democrats' : 'Republicans';
    emphasis = `${chance}%`;
    title = `${leader} have a ${chance}% chance of ${CHAMBER_PHRASE[chamber]}.`;
    headline =
      chamber === 'governor'
        ? `${chance}% chance ${leader} win the most governorships`
        : `${chance}% chance ${leader} take the ${body}`;
  }

  const current = CURRENT_SEATS[chamber];
  const demHeldUp = Math.round((seatsUp * current.dem) / current.total);
  const projectedDem = Math.max(0, Math.min(current.total, current.dem - demHeldUp + demLeans + tossups / 2));
  // Date and time in the comp's form, pinned to Eastern (data/time.ts).
  const updated = newest ? formatDateET(newest) : '';

  return {
    title,
    headline,
    emphasis,
    updated,
    dem: current.dem,
    rep: current.rep,
    seatsUp,
    tossups,
    // The dots are a PROJECTION under this source (decided Sep 11 2026, so a
    // source switch visibly moves them): seats not up stay with their
    // holders (split by the current composition), seats up go to the
    // source's lean. FIXTURE math — the real feed brings a real projection.
    demShare: (projectedDem / current.total) * 100,
    // The toss-up races carved out at the boundary between the two blocs.
    // Floored so the neutral gap never disappears at House scale (6/435).
    tossupShare: Math.max(1.4, (tossups / current.total) * 100),
  };
}

/**
 * ELECTION NIGHT (Sep 2026): the statement once results are in — what the
 * provider has called, who leads where it has not, and whether control is
 * settled. Every number is the feed's (summarize()); seats not on the
 * ballot stay with their holders, as the forecast did, so the chamber
 * always adds up to itself.
 */
export interface ResultsData {
  headline: string;
  /** "Results by AP · updated 9:42 PM ET", or the delay notice. */
  updatedLine: string;
  delayed: boolean;
  /** Seats already the party's: held (not up) + called. */
  demTotal: number;
  repTotal: number;
  calledDem: number;
  calledRep: number;
  leadingDem: number;
  leadingRep: number;
  /** Races with no call yet — leading or too early. */
  open: number;
  /** Too early to call. */
  early: number;
  majority: number;
  total: number;
  seatsUp: number;
  /** Which party, if any, has reached the majority on called seats alone. */
  control: 'dem' | 'rep' | null;
}

export function resultsFor(
  summary: ChamberSummary,
  chamber: Chamber,
  feed: { asOf: string | null; delayed: boolean },
  providerId: string
): ResultsData {
  const current = CURRENT_SEATS[chamber];
  const seatsUp = summary.seatsUp;
  const demHeldUp = Math.round((seatsUp * current.dem) / current.total);
  const demHeld = current.dem - demHeldUp;
  const repHeld = current.rep - (seatsUp - demHeldUp);
  const demTotal = demHeld + summary.calledDem;
  const repTotal = repHeld + summary.calledRep;
  const majority = Math.floor(current.total / 2) + 1;
  const control = demTotal >= majority ? 'dem' : repTotal >= majority ? 'rep' : null;
  const called = summary.calledDem + summary.calledRep;
  const open = seatsUp - called;
  const body = chamber === 'governor' ? 'governorships' : chamber === 'house' ? 'House' : 'Senate';
  let headline: string;
  if (control) {
    const party = control === 'dem' ? 'Democrats' : 'Republicans';
    const had = (current.dem >= majority ? 'dem' : 'rep') === control;
    headline =
      chamber === 'governor'
        ? `${party} hold the most governorships`
        : `${party} ${had ? 'keep' : 'take'} the ${body}`;
  } else {
    headline = `${called} of ${seatsUp} races called`;
  }
  const stamp = feed.asOf ? formatET(new Date(feed.asOf).getTime()) : '';
  const updatedLine = feed.delayed
    ? `Results delayed · last update ${stamp}`
    : `Results by ${resultsLabel(providerId)}${stamp ? ` · updated ${stamp}` : ''}`;
  return {
    headline,
    updatedLine,
    delayed: feed.delayed,
    demTotal,
    repTotal,
    calledDem: summary.calledDem,
    calledRep: summary.calledRep,
    leadingDem: summary.leadingDem,
    leadingRep: summary.leadingRep,
    open,
    early: summary.uncalled,
    majority,
    total: current.total,
    seatsUp,
    control,
  };
}
