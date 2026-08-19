import { leanOf, readFor } from './encoding';
import { STATE_SHAPES } from './states';
import type { Ballot, Chamber, StateRace } from './types';

export interface OrderedRace {
  id: string;
  name: string;
  race: StateRace;
}

/** The races on the ballot for one chamber. An absent state has no race. */
export function racesForChamber(ballot: Ballot, chamber: Chamber): Record<string, StateRace> {
  return ballot[chamber];
}

/** Rank: called first (the facts), then counting, then uncalled, then
 *  races still showing predictions; alphabetical within each group. */
function rank(race: StateRace): number {
  if (race.mode === 'prediction') return 3;
  switch (race.results?.status) {
    case 'called':
      return 0;
    case 'counting':
      return 1;
    default:
      return 2;
  }
}

/** Distance from the neutral band, in that source's own units. */
function closeness(race: StateRace, sourceId: string): number {
  const read = readFor(race, sourceId);
  if (!read) return Number.POSITIVE_INFINITY;
  if (leanOf(read) === 'tossup') return 0;
  return read.kind === 'market'
    ? Math.abs((read.demOdds ?? 50) - 50)
    : Math.abs(read.margin ?? 0);
}

/**
 * The current ordered race list, used by RaceList and the usmap-list reply.
 *
 * Pre-election the reader's question is "where is this actually close?", so
 * prediction-mode races sort by competitiveness rather than alphabetically —
 * otherwise the tossups, which are the whole story, sit buried under Alabama.
 * Once results are live, status ordering takes over.
 */
export function orderedRaces(
  races: Record<string, StateRace>,
  sourceId: string
): OrderedRace[] {
  return STATE_SHAPES.filter((s) => races[s.id])
    .map((s) => ({ id: s.id, name: s.name, race: races[s.id] }))
    .sort((a, b) => {
      const byRank = rank(a.race) - rank(b.race);
      if (byRank !== 0) return byRank;
      if (a.race.mode === 'prediction' && b.race.mode === 'prediction') {
        const byCloseness = closeness(a.race, sourceId) - closeness(b.race, sourceId);
        if (byCloseness !== 0) return byCloseness;
      }
      return a.name.localeCompare(b.name);
    });
}
