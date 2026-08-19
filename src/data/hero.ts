/**
 * The editorial headline ("Democrats have a 77% chance of winning the House.")
 * and its supporting numbers, per chamber + ACTIVE source.
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

export interface HeroData {
  title: string;
  updated: string;
  dem: number;
  rep: number;
  seatsUp: number;
  tossups: number;
  /** Balance-bar split, 0-100 (share of current seats). */
  demShare: number;
}

export function heroFor(
  races: Record<string, StateRace>,
  chamber: Chamber,
  sourceId: string,
  seatsUp: number
): HeroData {
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
  if (gap === 0) {
    title = `Control of the ${chamber === 'governor' ? 'governorships' : chamber === 'house' ? 'House' : 'Senate'} is a toss-up.`;
  } else {
    // Fixture probability: 55% floor + 3pts per race of lean gap, capped 95.
    const chance = Math.min(95, 55 + 3 * Math.abs(gap));
    const leader = gap > 0 ? 'Democrats' : 'Republicans';
    title = `${leader} have a ${chance}% chance of ${CHAMBER_PHRASE[chamber]}.`;
  }

  const current = CURRENT_SEATS[chamber];
  const updated = newest
    ? `Last updated ${new Date(newest).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })} · ${new Date(newest).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : '';

  return {
    title,
    updated,
    dem: current.dem,
    rep: current.rep,
    seatsUp,
    tossups,
    demShare: (current.dem / current.total) * 100,
  };
}
