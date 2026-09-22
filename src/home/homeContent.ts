/**
 * The home behind the takeover.
 *
 * Headlines, bylines and section order are TRANSCRIBED from dailywire.com as
 * it stood on Sep 22 2026 — the page exists so the takeover can be judged
 * against the real thing, not against a grey box. The art does not belong to
 * these headlines: stills come from the hub's own CDN pool (data/images.ts),
 * deterministically distributed. Nothing here is editorial direction.
 */
import { stillFor } from '../data/images';

export interface Story {
  title: string;
  byline: string;
  read: string;
  image: string;
}

/** The right-hand column beside the hero. */
export const TOP_STORIES: Story[] = [
  {
    title: 'JD Vance Makes Promise To Daily Wire After Bombshell Reporting',
    byline: 'Drew Berkemeyer',
    read: '3 min',
    image: stillFor(0),
  },
  {
    title: 'Trump Warns Iran Of Annihilation At U.N. As Tehran’s Rep Holds Blank Stare',
    byline: 'Kassy Akiva',
    read: '6 min',
    image: stillFor(1),
  },
  {
    title: 'EXCLUSIVE: Why Rick Scott Thinks Mamdani May Be Right ‘On One Thing’',
    byline: 'Brecca Stoll',
    read: '2 min',
    image: stillFor(2),
  },
  {
    title: 'Father Of Flight 93 Hero Lays Into Michigan’s Abdul El-Sayed',
    byline: 'Amanda Prestigiacomo',
    read: '2 min',
    image: stillFor(3),
  },
];

/** The hero carousel's current slide. */
export const HERO = {
  kicker: 'Live Now',
  title: 'SHOCKING: This Is The Worst Example Of Covid Fraud And It’s Not Even Close',
  cta: 'Watch Live Stream',
  image: stillFor(4, 'wide'),
  slides: 8,
};

/** Opinion Board — commentary, set in the exclusive serif (opinion ≠ reporting). */
export const OPINION: Story[] = [
  {
    title: 'How Zohran Mamdani Weaponized Social Media Against The West',
    byline: 'Ayaan Hirsi Ali',
    read: '6 min',
    image: stillFor(5, 'wide'),
  },
  {
    title: 'My Stand With Sophie Cunningham For Women And Girls In The Fight For Women’s Sports',
    byline: 'Jennifer Sey',
    read: '6 min',
    image: stillFor(6, 'wide'),
  },
  {
    title: 'Buck Sexton: Sean Parnell Should Be The Next Secretary Of The Army',
    byline: 'Buck Sexton',
    read: '3 min',
    image: stillFor(7, 'wide'),
  },
  {
    title: 'How Leftist Women Hollow Out The Goodness Of Patrick Clancy',
    byline: 'Chloe Trapanotto',
    read: '5 min',
    image: stillFor(8, 'wide'),
  },
];

export const HOSTS: Array<{ name: string; image: string }> = [
  'Ben Shapiro',
  'Matt Walsh',
  'Michael Knowles',
  'Morning Wire',
  'Jordan B Peterson',
  'Isabel Brown',
  'Matt Fradd',
  'Andrew Klavan',
].map((name, i) => ({ name, image: stillFor(i, 'portrait') }));

/** Latest Episodes — show names are real, episode lines are placeholder. */
export const EPISODES: Array<{ show: string; title: string; image: string }> = [
  { show: 'The Ben Shapiro Show', title: 'Ep. 2510 — The Closing Argument', image: stillFor(9, 'wide') },
  { show: 'Morning Wire', title: 'Midterm Eve: What To Watch', image: stillFor(2, 'wide') },
  { show: 'The Matt Walsh Show', title: 'Ep. 1843 — The Only Question That Matters', image: stillFor(4, 'wide') },
  { show: 'Michael Knowles Show', title: 'Ep. 1645 — Everything Is Downstream', image: stillFor(6, 'wide') },
];

/* ---------------------------------------------------------------------- */
/* Election night                                                          */
/* ---------------------------------------------------------------------- */

/** The stream. `status` is rendered as TEXT + icon, never colour alone. */
export const STREAM = {
  status: 'live' as 'live' | 'upcoming' | 'ended',
  title: 'Election Night 2026: Live Results, Race Calls And Analysis',
  show: 'DailyWire+',
  date: 'Tuesday, November 3, 2026',
  dek:
    'Ben Shapiro, Matt Walsh, Michael Knowles and Andrew Klavan call the midterms live as the ' +
    'results come in, with the full DailyWire+ desk through the night.',
  viewers: 128_400,
  poster: stillFor(7, 'wide'),
};

export interface ChatMessage {
  id: number;
  author: string;
  /** Initials on the avatar. */
  mark: string;
  text: string;
  /** DW's own posts read as the house account, not as another reader. */
  house?: boolean;
}

/**
 * Chat fixture. The first seven render immediately; `CHAT_INCOMING` arrive on
 * a timer so the surface is visibly alive (and so the scroll behaviour and the
 * fade can be judged).
 */
export const CHAT_SEED: ChatMessage[] = [
  { id: 1, author: 'Leslie Alexander', mark: 'LA', text: 'Georgia is closer than anyone said it would be.' },
  { id: 2, author: 'John294', mark: 'J2', text: 'Waiting on the Atlanta suburbs before I believe any of it.' },
  {
    id: 3,
    author: 'DailyWire+',
    mark: 'DW',
    house: true,
    text: 'Race calls come from the certified feed only — we do not call races ourselves.',
  },
  { id: 4, author: 'McKinney', mark: 'MK', text: 'Turnout in Pennsylvania looks enormous tonight.' },
  { id: 5, author: 'JeromeBell_12', mark: 'J1', text: 'What is the threshold for the House again? 218?' },
  { id: 6, author: 'McKinney', mark: 'MK', text: 'Yes, 218. Senate is 51.' },
  { id: 7, author: '850Robb', mark: '8R', text: 'Ben calling Ohio early on the stream, let’s see.' },
];

export const CHAT_INCOMING: ChatMessage[] = [
  { id: 8, author: 'Dana_W', mark: 'DW', text: 'North Carolina at 62% reporting and still nothing.' },
  { id: 9, author: 'RexT', mark: 'RT', text: 'This is the best coverage of the night, not close.' },
  { id: 10, author: 'Marianne O.', mark: 'MO', text: 'Anyone else refreshing the map every ten seconds?' },
  { id: 11, author: 'k_bell', mark: 'KB', text: 'Michigan just moved. Watch Michigan.' },
];

/**
 * FIXTURE — the seats NOT on this ballot, which is what turns "races called"
 * into a chamber balance. The hub's House set is 29 curated districts, not
 * 435, so a projected majority cannot be derived from the fixture: these two
 * rows carry that weight, and the widget labels them as a fixture. Replace
 * both with the certified feed's holdover counts before this is ever real.
 */
export const HOLDOVER: Record<'house' | 'senate', { dem: number; rep: number; total: number; toWin: number }> = {
  house: { dem: 189, rep: 203, total: 435, toWin: 218 },
  senate: { dem: 40, rep: 42, total: 100, toWin: 51 },
};
