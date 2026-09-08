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
import { CURRENT_SEATS } from './summary';
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
  /* Date AND time, in the comp's form: "Sep 1, 2026 9:00 AM ET". Pinned to
     Eastern — the election clock everyone quotes — and labelled as such, so
     a reader elsewhere is not left guessing whose 9:00 that is. */
  const updated = newest
    ? new Date(newest)
        .toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/New_York',
        })
        // "Sep 1, 2026, 9:00 AM" -> "Sep 1, 2026 9:00 AM": only the comma
        // before the time goes.
        .replace(/, (\d{1,2}:)/, ' $1') + ' ET'
    : '';

  return {
    title,
    headline,
    emphasis,
    updated,
    dem: current.dem,
    rep: current.rep,
    seatsUp,
    tossups,
    demShare: (current.dem / current.total) * 100,
    // The toss-up races carved out at the boundary between the two blocs.
    // Floored so the neutral gap never disappears at House scale (6/435).
    tossupShare: Math.max(1.4, (tossups / current.total) * 100),
  };
}
