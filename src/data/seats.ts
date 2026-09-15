// Seat buckets for the hemicycle and the big "R53" (Sep 2026): every seat of
// the chamber sorted into the seven ratings under the active source. Seats
// with a race carry their race's rating; the rest of the chamber is safe for
// whoever holds it, split by the current composition. FIXTURE math — the
// real feed brings real seat-level ratings.
import { ratingOf, readFor, type Rating } from './encoding';
import { CURRENT_SEATS } from './summary';
import type { Chamber, StateRace } from './types';

export const RATING_ORDER: Rating[] = [
  'safe-rep',
  'likely-rep',
  'lean-rep',
  'tossup',
  'lean-dem',
  'likely-dem',
  'safe-dem',
];

export type SeatBuckets = Record<Rating, number>;

const DEM: Rating[] = ['lean-dem', 'likely-dem', 'safe-dem'];

export function seatBuckets(
  races: Record<string, StateRace>,
  chamber: Chamber,
  sourceId: string
): SeatBuckets {
  const b: SeatBuckets = {
    'safe-rep': 0,
    'likely-rep': 0,
    'lean-rep': 0,
    tossup: 0,
    'lean-dem': 0,
    'likely-dem': 0,
    'safe-dem': 0,
  };
  let rated = 0;
  for (const race of Object.values(races)) {
    if (chamber === 'house' && race.districts) {
      for (const d of race.districts) {
        const read = readFor(d, sourceId);
        b[read ? ratingOf(read) : 'tossup'] += 1;
        rated += 1;
      }
    } else {
      const read = readFor(race, sourceId);
      b[read ? ratingOf(read) : 'tossup'] += 1;
      rated += 1;
    }
  }
  const current = CURRENT_SEATS[chamber];
  const rest = Math.max(0, current.total - rated);
  // Seats without a race in the fixture stay with their holders: the
  // Democratic share of the current chamber, less the Democratic-leaning
  // seats already counted, is what remains safe-D; the rest safe-R.
  const demRated = DEM.reduce((n, k) => n + b[k], 0) + b.tossup / 2;
  const demRest = Math.round(Math.max(0, Math.min(rest, current.dem - demRated)));
  b['safe-dem'] += demRest;
  b['safe-rep'] += rest - demRest;
  return b;
}

/** The Republican projection the big numeral shows: R seats plus half the
    toss-ups, rounded. */
export function republicanProjection(b: SeatBuckets): number {
  return Math.round(b['safe-rep'] + b['likely-rep'] + b['lean-rep'] + b.tossup / 2);
}
