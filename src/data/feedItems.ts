// The mock coverage stream, shared by the main Coverage Feed and the
// drawer's Related Content mini feed (same items, same order — the mini
// feed is a filtered window onto this list, never a different dataset).
// Deterministic: 36 items over 6 day groups, kinds interleaved so every
// filter and the ad cadence have something to chew on.

import { stillFor } from './images';
import { asset } from './assets';

export type ItemKind = 'article' | 'short' | 'episode' | 'opinion';

export interface FeedItem {
  id: number;
  kind: ItemKind;
  day: string;
  time: string;
  headline: string;
  dek?: string;
  author: string;
  host?: string; // articles/shorts/episodes only — drives the host filter
  metaTail: string;
  tag?: string;
  duration?: string;
  video?: string; // shorts: public/ path to the loop
  /** Row thumbnail (DW CDN), square crop. */
  image: string;
  /** Shorts only — the same still at 9:16 for the card. */
  imageTall?: string;
  /** Editorial voice, independent of format: written pieces (kind
   *  'opinion') plus commentary shorts/episodes. Drives the Opinion
   *  filter's format-sectioned view. */
  opinion?: boolean;
}

export const HOSTS = ['Ben Shapiro', 'Matt Walsh', 'Michael Knowles', 'Andrew Klavan', 'Morning Wire', 'Crain & Co'];
const OPINION_AUTHORS = ['Ben Shapiro', 'Matt Walsh', 'Michael Knowles', 'Andrew Klavan'];

const DAYS = [
  { day: 'Today · Wednesday, August 19', time: (i: number) => `${1 + (i % 9)}h ago` },
  { day: 'Yesterday · Tuesday, August 18', time: () => '1d ago' },
  { day: 'Monday, August 17', time: () => '2d ago' },
  { day: 'Sunday, August 16', time: () => '3d ago' },
  { day: 'Saturday, August 15', time: () => '4d ago' },
  { day: 'Friday, August 14', time: () => '5d ago' },
];

const HEADLINES: Record<ItemKind, string[]> = {
  article: [
    'Maine Senate Race Tightens As Outside Money Pours Into Both Camps',
    'Pennsylvania House Map: Three Districts, One Story About Turnout',
    'Inside The 29: How The Closest House Races Were Chosen',
    'What A 47-47 Senate Actually Means For 2028',
    'Georgia Early-Vote Infrastructure Quietly Doubled Since 2024',
    'The Governor Races Nobody Is Polling — And Why That Matters',
  ],
  short: [
    'The 30-Second Answer That Changed The Georgia Debate',
    'Why Market Odds And Polls Disagree On Georgia',
    'Three Counties That Decide Pennsylvania',
    'The Ad Buy That Backfired In Maine',
    'What 91% Reporting Actually Means',
    'One Chart: The Suburban Shift Since 2024',
    'The Toss-Up States In 40 Seconds',
    'How A Race Gets Called — And Who Calls It',
  ],
  episode: [
    'Morning Wire: Seventy-Seven Days Out, Where The Senate Really Stands',
    'Backstage: The Night The Texas Numbers Moved',
    'The Breakdown: Reading Market Odds Without Fooling Yourself',
    'Morning Wire: The Curated 29, Explained',
    'Crain & Co: Governors, Gerrymanders, And The Long Game',
    'The Breakdown: What The Polling Averages Are Hiding',
  ],
  opinion: [
    'The Toss-Up Map Is Lying To You — Watch The Suburbs Instead',
    'Governors Decide More Than Washington Does — And Nobody Covers Them',
    'Stop Reading National Polls. Seriously.',
    'The Case Against Election-Night Certainty',
    'Markets Beat Pundits Because Markets Pay For Being Wrong',
    'Your County Clerk Matters More Than Your Senator',
  ],
};

const DEKS = [
  'New filings show a record week of ad buys as both parties treat the seat as the majority maker.',
  'Ratings compress what is actually a dozen different suburban stories into one gray bucket.',
  'The methodology behind the curated district list — and what it leaves out on purpose.',
  'PA-07, PA-08 and PA-10 are polling inside the margin — and all three hinge on the same counties.',
];

/* Tags derive from the HEADLINE (not a blind cycle): a state-scoped list
   must never lead with another state's story. Headlines with no state
   angle stay untagged. */
const TAG_BY_KEYWORD: Array<[RegExp, string]> = [
  [/maine/i, 'ME-SEN'],
  [/pennsylvania/i, 'PA-07'],
  [/georgia/i, 'GA-SEN'],
  [/texas/i, 'TX-SEN'],
  [/governor/i, 'WI-GOV'],
];

function tagFor(headline: string): string | undefined {
  return TAG_BY_KEYWORD.find(([re]) => re.test(headline))?.[1];
}

const KIND_CYCLE: ItemKind[] = ['article', 'short', 'episode', 'article', 'opinion', 'short'];

const kindCounters: Record<ItemKind, number> = { article: 0, short: 0, episode: 0, opinion: 0 };

export const ALL_ITEMS: FeedItem[] = Array.from({ length: 36 }, (_, i) => {
  const kind = KIND_CYCLE[i % KIND_CYCLE.length];
  const dayIdx = Math.floor(i / 6);
  const { day, time } = DAYS[dayIdx];
  const pool = HEADLINES[kind];
  // Per-kind occurrence counter: repeats land whole day-groups apart, never
  // as adjacent duplicate rows — and hosts spread across every kind (the old
  // i%6 indexing gave each kind only 1-2 hosts).
  const occurrence = kindCounters[kind];
  const headline = pool[kindCounters[kind]++ % pool.length];
  // Articles deliberately never come from Crain & Co (a show, not a byline):
  // keeps one reachable empty filter combo so the empty state stays testable.
  const hostIdx = occurrence % HOSTS.length;
  const host =
    kind === 'opinion' ? undefined : kind === 'article' && hostIdx === 5 ? HOSTS[0] : HOSTS[hostIdx];
  const author = kind === 'opinion' ? OPINION_AUTHORS[i % OPINION_AUTHORS.length] : host ?? 'DW News';
  const base: FeedItem = {
    id: i + 1,
    kind,
    day,
    time: time(i),
    headline,
    author,
    host,
    // Comp's meta line runs compact: "5 min", not "5 min read".
    metaTail:
      kind === 'short' ? 'Short' : kind === 'episode' ? `${38 + (i % 3) * 9} min` : `${4 + (i % 5)} min`,
    image: stillFor(i),
    tag: tagFor(headline),
    // Opinion voice: every written piece; commentary clips from the flagship
    // opinion hosts; "The Breakdown" analysis episodes.
    opinion:
      kind === 'opinion' ||
      (kind === 'short' && (host === 'Ben Shapiro' || host === 'Matt Walsh')) ||
      (kind === 'episode' && headline.startsWith('The Breakdown')),
  };
  if (kind !== 'short' && kind !== 'episode' && i % 3 === 0) base.dek = DEKS[i % DEKS.length];
  if (kind === 'short') {
    base.imageTall = stillFor(i, 'portrait');
    base.duration = `0:${(11 + ((i * 7) % 48)).toString().padStart(2, '0')}`;
    base.video = asset(`shorts/short-${i % 4}.webm`);
  }
  if (kind === 'episode') base.duration = `${38 + (i % 3) * 9}:0${i % 6}`;
  return base;
});

export const FILTERS: Array<{ id: ItemKind | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'article', label: 'Articles' },
  { id: 'short', label: 'Shorts' },
  { id: 'episode', label: 'Episodes' },
  { id: 'opinion', label: 'Opinion' },
];

export const HOST_FILTERABLE: Array<ItemKind | 'all'> = ['article', 'short', 'episode'];

export const KIND_LABEL: Record<ItemKind, string> = {
  article: 'Article',
  short: 'Short',
  episode: 'Episode',
  opinion: 'Opinion',
};

/** State ids that actually carry tagged coverage (drives the mini feed's
 *  secondary state filter). */
export const TAGGED_STATE_IDS = [
  ...new Set(
    ALL_ITEMS.flatMap((i) => (i.tag ? [i.tag.slice(0, 2)] : []))
  ),
];
