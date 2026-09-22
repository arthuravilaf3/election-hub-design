import type { Ballot, Chamber, Mode, Party, RaceStatus, StateRace } from '../data/types';
import { PARTY_LABEL, readFor } from '../data/encoding';
import { trueLeaderOf } from '../data/night';
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
}

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
  | { type: 'RESET' };

export const CUTOVER_BANNER = 'Live results have replaced predictions.';

const STATUS_ORDER: Record<RaceStatus, number> = { uncalled: 0, counting: 1, called: 2 };

export function initialElectionState(): ElectionState {
  return {
    ballot: buildBallot(),
    chamber: 'house', // redesign default — the Figma frames open on House
    sourceId: DEFAULT_SOURCE_ID,
    selectedId: null,
    zoomedId: null,
    banner: null,
    announcement: '',
    flash: null,
    staggering: false,
    trust: loadTrust(),
  };
}

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
  switch (action.type) {
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
        banner: CUTOVER_BANNER,
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
        banner: firstCutover ? CUTOVER_BANNER : state.banner,
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
