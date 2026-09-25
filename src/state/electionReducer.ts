import type { Ballot, Chamber, Mode, Party, RaceStatus, StateRace } from '../data/types';
import { PARTY_LABEL, readFor } from '../data/encoding';
import {
  NIGHT_END_MS,
  NIGHT_START_MS,
  feedAt,
  nightEvents,
  snapshotAt,
  trueLeaderOf,
  type Call,
} from '../data/night';
import { buildBallot } from '../data/mockRaces';
import { DEFAULT_RESULTS_PROVIDER, DEFAULT_SOURCE_ID, sourceLabel } from '../data/sources';
import { CHAMBER_LABEL } from '../data/summary';
import { STATE_SHAPES } from '../data/states';
import { loadTrust, trustKey, type TrustPicks } from '../data/trust';

const CHAMBERS: Chamber[] = ['senate', 'house', 'governor'];

export interface ElectionState {
  ballot: Ballot;
  /** Which chamber the map is showing. */
  chamber: Chamber;
  /** Which provider colors the map. Never blended — one source at a time. */
  sourceId: string;
  selectedId: string | null;
  /** State the camera is zoomed into, or null when showing the whole map. */
  zoomedId: string | null;
  /** Non-blocking banner text (cutover notice), null when hidden. */
  banner: string | null;
  /** Warning = the feed is late; info = a cutover notice. */
  bannerTone: 'info' | 'warning';
  /** Text for the polite aria-live region (race calls, cutover, switches). */
  announcement: string;
  /** One-shot flash signal; nonce distinguishes repeat flashes of a state. */
  flash: { stateId: string; nonce: number } | null;
  /** True while a coordinated full-map cutover wave is animating (drives stagger). */
  staggering: boolean;
  /**
   * Reader-declared trusted source per race, `${chamber}:${stateId}` ->
   * sourceId. A pick overrides the global source for THAT state only — it is
   * never mixed into any aggregate (see summarize()).
   */
  trust: TrustPicks;
  /**
   * ELECTION NIGHT (Sep 2026): the simulated clock. `at` is the moment of
   * the night the map shows (null = the clock is off and the map is
   * pre-election); the ballot is always the night's snapshot at `at`.
   * While the clock is engaged the manual simulator actions are ignored —
   * the night is one function of the clock, not a mix of the two.
   */
  night: NightState;
}

export type NightSpeed = 1 | 5 | 20;

export interface NightState {
  at: number | null;
  playing: boolean;
  speed: NightSpeed;
  /** The provider's last published batch, ISO; null before the night. */
  feedAsOf: string | null;
  /** True inside the provider's outage: nothing new is landing. */
  delayed: boolean;
  /** Every call published so far, oldest first. */
  calls: Call[];
}

export const NIGHT_OFF: NightState = { at: null, playing: false, speed: 5, feedAsOf: null, delayed: false, calls: [] };

export type ElectionAction =
  | { type: 'SELECT'; stateId: string | null }
  | { type: 'SET_CHAMBER'; chamber: Chamber }
  | { type: 'SET_SOURCE'; sourceId: string }
  | { type: 'ZOOM_STATE'; stateId: string }
  | { type: 'CLEAR_ZOOM' }
  | { type: 'SET_GLOBAL_MODE'; mode: Mode }
  | { type: 'CUTOVER_STATE'; stateId: string }
  | { type: 'SET_STATUS'; stateId: string; status: RaceStatus }
  | { type: 'SET_REPORTING'; stateId: string; reporting: number }
  | { type: 'CALL_RACE'; stateId: string }
  | { type: 'FLASH'; stateId: string }
  | { type: 'AGE_DATA' }
  | { type: 'CLEAR_BANNER' }
  | { type: 'STAGGER_DONE' }
  | { type: 'SET_TRUST'; stateId: string; sourceId: string }
  | { type: 'CLEAR_TRUST'; stateId: string }
  | { type: 'NIGHT_TICK'; at: number }
  | { type: 'NIGHT_PLAY' }
  | { type: 'NIGHT_PAUSE' }
  | { type: 'NIGHT_SPEED'; speed: NightSpeed }
  | { type: 'NIGHT_STOP' }
  | { type: 'RESET' };

export const CUTOVER_BANNER = 'Live results have replaced predictions.';
/** The provider has gone quiet: the map holds its last count and says so. */
export const DELAYED_BANNER = 'Results delayed — the provider has not published a new batch. The map holds its last count.';
export const RESUMED_BANNER = 'Results are updating again.';

const STATUS_ORDER: Record<RaceStatus, number> = { uncalled: 0, counting: 1, called: 2 };

export function initialElectionState(): ElectionState {
  return {
    ballot: buildBallot(),
    chamber: 'house', // redesign default — the Figma frames open on House
    sourceId: DEFAULT_SOURCE_ID,
    selectedId: null,
    zoomedId: null,
    banner: null,
    bannerTone: 'info',
    announcement: '',
    flash: null,
    staggering: false,
    trust: loadTrust(),
    night: NIGHT_OFF,
  };
}

/** The simulator's manual actions have no say while the clock runs the night. */
const MANUAL: ReadonlySet<ElectionAction['type']> = new Set([
  'SET_GLOBAL_MODE',
  'CUTOVER_STATE',
  'SET_STATUS',
  'SET_REPORTING',
  'CALL_RACE',
]);

const STATE_NAMES: Record<string, string> = Object.fromEntries(
  STATE_SHAPES.map((s) => [s.id, s.name])
);

function nameOf(id: string): string {
  return STATE_NAMES[id] ?? id;
}

/** The races currently on screen. */
export function activeRaces(state: ElectionState): Record<string, StateRace> {
  return state.ballot[state.chamber];
}

/**
 * Who a race is called for when the dev tools call it by hand: the night's
 * answer key (data/night.ts), never the polling read. Hub tenet 3 / PRD
 * tenet 1: "Called" traces only to the results provider.
 */
function feedLeader(race: StateRace): Party {
  return race.results?.leader ?? trueLeaderOf(`${race.chamber}:${race.id}`);
}

function cutoverRace(race: StateRace): StateRace {
  if (race.mode === 'results') return race;
  return {
    ...race,
    mode: 'results',
    results: race.results ?? { status: 'uncalled', reporting: 0, providerId: DEFAULT_RESULTS_PROVIDER },
  };
}

/** Apply a transform to one state's race in every chamber it appears in. */
function mapStateAcrossChambers(
  ballot: Ballot,
  stateId: string,
  fn: (race: StateRace) => StateRace
): Ballot {
  const next = { ...ballot };
  for (const chamber of CHAMBERS) {
    const race = ballot[chamber][stateId];
    if (!race) continue;
    next[chamber] = { ...ballot[chamber], [stateId]: fn(race) };
  }
  return next;
}

/** Apply a transform to the active chamber's race for one state. */
function mapActiveRace(
  state: ElectionState,
  stateId: string,
  fn: (race: StateRace) => StateRace
): Ballot {
  const race = state.ballot[state.chamber][stateId];
  if (!race) return state.ballot;
  return {
    ...state.ballot,
    [state.chamber]: { ...state.ballot[state.chamber], [stateId]: fn(race) },
  };
}

function mapEveryRace(ballot: Ballot, fn: (race: StateRace) => StateRace): Ballot {
  const next = {} as Ballot;
  for (const chamber of CHAMBERS) {
    next[chamber] = Object.fromEntries(
      Object.entries(ballot[chamber]).map(([id, race]) => [id, fn(race)])
    );
  }
  return next;
}

export function electionReducer(state: ElectionState, action: ElectionAction): ElectionState {
  if (state.night.at !== null && MANUAL.has(action.type)) return state;
  switch (action.type) {
    case 'NIGHT_TICK': {
      const at = Math.max(NIGHT_START_MS, Math.min(NIGHT_END_MS, action.at));
      const prev = state.night.at ?? NIGHT_START_MS;
      if (state.night.at !== null && at === prev) return state;
      const ballot = snapshotAt(state.ballot, at);
      const feed = feedAt(at);
      let calls = state.night.calls;
      let announcement = state.announcement;
      let banner = state.banner;
      let bannerTone = state.bannerTone;
      let staggering = state.staggering;
      let flash = state.flash;
      if (at > prev) {
        const events = nightEvents(state.ballot, prev, at);
        if (events.calls.length) {
          calls = [...calls, ...events.calls];
          const last = [...events.calls].reverse().find((c) => c.chamber === state.chamber);
          if (last) flash = { stateId: last.stateId, nonce: (state.flash?.nonce ?? 0) + 1 };
          const said = events.calls
            .slice(-3)
            .map((c) => `${nameOf(c.stateId)} ${CHAMBER_LABEL[c.chamber]} for ${PARTY_LABEL[c.leader]}`)
            .join(', ');
          announcement = `${events.calls.length === 1 ? 'Race called' : `${events.calls.length} races called`}: ${said}.`;
        } else if (events.cutovers.length) {
          announcement = `${events.cutovers.map(nameOf).join(', ')}: polls closed, live results replacing predictions.`;
        }
        if (events.cutovers.length) {
          const firstCutover = CHAMBERS.every((c) =>
            Object.values(state.ballot[c]).every((r) => r.mode === 'prediction')
          );
          // The notice is for a reader who WATCHED the polls close; one who
          // lands mid-night (the clock pinned by the URL) just sees results.
          if (firstCutover && state.night.at !== null) {
            banner = CUTOVER_BANNER;
            bannerTone = 'info';
          }
          // A wave of closings recolours the map as one sweep, not a scatter.
          if (events.cutovers.length >= 4) staggering = true;
        }
      } else {
        // Scrubbing back: the log is the night up to here, nothing more.
        calls = calls.filter((c) => c.at <= at);
      }
      /* The outage, both ways. NO BANNER for the delay itself (Sep 25 2026,
         by request): the bar across the top of the page was the third place
         saying the same thing, after the chip in the live row and the block
         at the foot of the hero, which turns warning and names the last
         batch. It is still ANNOUNCED — a screen reader has no hero to look
         at — and the feed coming back still gets its note, because that one
         is news and goes away on its own. */
      if (feed.delayed && !state.night.delayed) {
        announcement = DELAYED_BANNER;
      } else if (!feed.delayed && state.night.delayed) {
        announcement = RESUMED_BANNER;
      }
      return {
        ...state,
        ballot,
        flash,
        banner,
        bannerTone,
        staggering,
        announcement,
        night: { ...state.night, at, feedAsOf: feed.asOf, delayed: feed.delayed, calls },
      };
    }

    case 'NIGHT_PLAY':
      if (state.night.at === null) return electionReducer({ ...state, night: { ...state.night, playing: true } }, { type: 'NIGHT_TICK', at: NIGHT_START_MS });
      return state.night.playing ? state : { ...state, night: { ...state.night, playing: true } };

    case 'NIGHT_PAUSE':
      return state.night.playing ? { ...state, night: { ...state.night, playing: false } } : state;

    case 'NIGHT_SPEED':
      return { ...state, night: { ...state.night, speed: action.speed } };

    case 'NIGHT_STOP':
      if (state.night.at === null) return state;
      return {
        ...state,
        ballot: snapshotAt(state.ballot, NIGHT_START_MS - 1),
        banner: null,
        staggering: true,
        announcement: 'Showing pre-election predictions.',
        night: { ...NIGHT_OFF, speed: state.night.speed },
      };

    case 'SELECT':
      return { ...state, selectedId: action.stateId };

    case 'SET_CHAMBER': {
      if (action.chamber === state.chamber) return state;
      const races = state.ballot[action.chamber];
      // Selection and zoom are chamber-scoped: a state selected in one chamber
      // may not be on the ballot in the next.
      const keepSelection = state.selectedId && races[state.selectedId] ? state.selectedId : null;
      return {
        ...state,
        chamber: action.chamber,
        selectedId: keepSelection,
        zoomedId: keepSelection === state.zoomedId ? state.zoomedId : null,
        // Race switches crossfade with the same stagger wave as cutover, so
        // the recolor is perceivable even in peripheral vision.
        staggering: true,
        announcement: `Showing ${CHAMBER_LABEL[action.chamber]} races. ${Object.keys(races).length} on the ballot.`,
      };
    }

    case 'SET_SOURCE': {
      if (action.sourceId === state.sourceId) return state;
      return {
        ...state,
        sourceId: action.sourceId,
        announcement: `Map now colored by ${sourceLabel(action.sourceId)}.`,
      };
    }

    case 'ZOOM_STATE': {
      if (!state.ballot[state.chamber][action.stateId]) return state;
      return { ...state, zoomedId: action.stateId, selectedId: action.stateId };
    }

    case 'CLEAR_ZOOM':
      return state.zoomedId === null ? state : { ...state, zoomedId: null };

    case 'SET_GLOBAL_MODE': {
      if (action.mode === 'prediction') {
        return {
          ...state,
          ballot: mapEveryRace(state.ballot, (r) => ({ ...r, mode: 'prediction' as Mode })),
          banner: null,
          staggering: true,
          announcement: 'Showing pre-election predictions.',
        };
      }
      return {
        ...state,
        ballot: mapEveryRace(state.ballot, cutoverRace),
        // NO BAR (Sep 25 2026, by request): the white notice that sat on
        // top of the page for six seconds is gone. The cutover is still
        // announced for a screen reader, and the page says it out loud in
        // every other way — the LIVE row, the headline, the whole hero.
        banner: null,
        bannerTone: 'info',
        staggering: true,
        announcement: CUTOVER_BANNER,
      };
    }

    case 'CUTOVER_STATE': {
      const race = state.ballot[state.chamber][action.stateId];
      if (!race || race.mode === 'results') return state;
      // Polls closing in a state closes them for every race in that state.
      const firstCutover = CHAMBERS.every((c) =>
        Object.values(state.ballot[c]).every((r) => r.mode === 'prediction')
      );
      return {
        ...state,
        ballot: mapStateAcrossChambers(state.ballot, action.stateId, cutoverRace),
        banner: null,
        bannerTone: firstCutover ? 'info' : state.bannerTone,
        announcement: `${nameOf(action.stateId)}: polls closed, live results replacing prediction.`,
      };
    }

    case 'SET_STATUS': {
      const race = state.ballot[state.chamber][action.stateId];
      if (!race || race.mode !== 'results' || !race.results) return state;
      // Transition rule: status only moves forward (uncalled -> counting -> called).
      if (STATUS_ORDER[action.status] <= STATUS_ORDER[race.results.status]) return state;
      if (action.status === 'called') {
        return electionReducer(state, { type: 'CALL_RACE', stateId: action.stateId });
      }
      const leader = race.results.leader ?? feedLeader(race);
      return {
        ...state,
        ballot: mapActiveRace(state, action.stateId, (r) => ({
          ...r,
          results: {
            ...r.results!,
            status: action.status,
            leader,
            reporting: Math.max(r.results!.reporting, 1),
          },
        })),
      };
    }

    case 'SET_REPORTING': {
      const race = state.ballot[state.chamber][action.stateId];
      if (!race || race.mode !== 'results' || !race.results) return state;
      if (race.results.status === 'called') return state; // facts don't un-count
      const reporting = Math.min(100, Math.max(0, Math.round(action.reporting)));
      const status = race.results.status === 'uncalled' && reporting > 0 ? 'counting' : race.results.status;
      const leader = status === 'counting' ? race.results.leader ?? feedLeader(race) : race.results.leader;
      return {
        ...state,
        ballot: mapActiveRace(state, action.stateId, (r) => ({
          ...r,
          results: { ...r.results!, reporting, status, leader },
        })),
      };
    }

    case 'CALL_RACE': {
      const race = state.ballot[state.chamber][action.stateId];
      if (!race || race.mode !== 'results' || !race.results) return state;
      if (race.results.status === 'called') return state;
      const leader = feedLeader(race);
      return {
        ...state,
        ballot: mapActiveRace(state, action.stateId, (r) => ({
          ...r,
          results: { ...r.results!, status: 'called', leader },
        })),
        flash: { stateId: action.stateId, nonce: (state.flash?.nonce ?? 0) + 1 },
        announcement: `Race called: ${nameOf(action.stateId)} called for ${PARTY_LABEL[leader]}.`,
      };
    }

    case 'FLASH':
      if (!state.ballot[state.chamber][action.stateId]) return state;
      return { ...state, flash: { stateId: action.stateId, nonce: (state.flash?.nonce ?? 0) + 1 } };

    case 'AGE_DATA': {
      // Dev affordance: push every read past STALE_AFTER_MS so the "not
      // silently stale" disclosure can be exercised.
      const aged = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();
      return {
        ...state,
        ballot: mapEveryRace(state.ballot, (r) => ({
          ...r,
          reads: r.reads.map((read) => ({ ...read, asOf: aged })),
        })),
        announcement: 'Simulating a stale data feed.',
      };
    }

    case 'CLEAR_BANNER':
      return state.banner === null ? state : { ...state, banner: null };

    /* Radio semantics: choosing the source already picked clears the pick
       and the state goes back to the global source. */
    case 'SET_TRUST': {
      const key = trustKey(state.chamber, action.stateId);
      const next = { ...state.trust };
      const cleared = next[key] === action.sourceId;
      if (cleared) delete next[key];
      else next[key] = action.sourceId;
      return {
        ...state,
        trust: next,
        announcement: cleared
          ? `${nameOf(action.stateId)} back to the map source, ${sourceLabel(state.sourceId)}.`
          : `${nameOf(action.stateId)} now shows ${sourceLabel(action.sourceId)} on your map.`,
      };
    }

    case 'CLEAR_TRUST': {
      const key = trustKey(state.chamber, action.stateId);
      if (!(key in state.trust)) return state;
      const next = { ...state.trust };
      delete next[key];
      return {
        ...state,
        trust: next,
        announcement: `${nameOf(action.stateId)} back to the map source, ${sourceLabel(state.sourceId)}.`,
      };
    }

    case 'STAGGER_DONE':
      return state.staggering ? { ...state, staggering: false } : state;

    case 'RESET':
      // Dev reset rebuilds the fixture; the reader's picks are theirs to keep.
      return { ...initialElectionState(), trust: state.trust };
  }
}

/** Re-exported so callers don't need to reach into encoding for a lookup. */
export { readFor };
