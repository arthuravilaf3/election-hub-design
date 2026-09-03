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
  let emphasis: string | undefined;
  if (gap === 0) {
    title = `Control of the ${chamber === 'governor' ? 'governorships' : chamber === 'house' ? 'House' : 'Senate'} is a toss-up.`;
  } else {
    // Fixture probability: 55% floor + 3pts per race of lean gap, capped 95.
    const chance = Math.min(95, 55 + 3 * Math.abs(gap));
    const leader = gap > 0 ? 'Democrats' : 'Republicans';
    emphasis = `${chance}%`;
    title = `${leader} have a ${chance}% chance of ${CHAMBER_PHRASE[chamber]}.`;
  }

  const current = CURRENT_SEATS[chamber];
  /* Full date AND time (redesign Sep 2026). The line under the title is the
     only freshness the top of the page carries now, so "1:00PM" alone would
     leave the reader guessing which day. */
  const updated = newest
    ? (() => {
        const d = new Date(newest);
        const date = d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const time = d
          .toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })
          .replace(/\s/g, '');
        return `${date} · ${time}`;
      })()
    : '';

  return {
    title,
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
