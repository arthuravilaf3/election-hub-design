/**
 * DELIVERY PHASES — the prototype can show the hub as it would be at each
 * step of the roadmap, instead of showing everything at once and implying
 * it all ships together.
 *
 * One map is the single source of truth about what a phase contains; every
 * component reads a flag off it (same pattern as IS_AD_FREE in the feed).
 * Ordering is by reader value, per ROADMAP.md:
 *
 *   1 — Understand the race    map, sources, drawer, feed  (first delivery)
 *   2 — Follow what matters    + Follow a State, zoom depth
 *   3 — Election night         + cutover and results
 *   4 — Last version           + what is not vital (race tags, hand-off)
 *
 * The trusted-source picker is built but has no place in the roadmap yet
 * (pending the P.O. conversation), so it is off in EVERY phase and only
 * reachable with ?trust=1 — the code stays, no phase promises the feature.
 */
export type Phase = 1 | 2 | 3 | 4;

export interface PhaseFeatures {
  /** Follow a State: one state, all of its races. */
  followState: boolean;
  /** County choropleth + the state's full House delegation in the panel. */
  zoomDepth: boolean;
  /** Election-night mode: cutover, results statuses, the simulation toolbar. */
  results: boolean;
  /** Race tags in the feed and the hand-off into the map. */
  raceTags: boolean;
  /** Reader-declared trusted source (see the note above). */
  trustPicks: boolean;
}

export const PHASES: Phase[] = [1, 2, 3, 4];

export const PHASE_LABEL: Record<Phase, string> = {
  1: 'Phase 1',
  2: 'Phase 2',
  3: 'Phase 3',
  4: 'Last',
};

/** What each phase is FOR, one line — the reader's job it serves. */
export const PHASE_JOB: Record<Phase, string> = {
  1: 'See the same race through two lenses and decide which to believe.',
  2: 'Mark the states I care about and go deeper into them.',
  3: 'At a glance: what has been called and what is still too close.',
  4: 'Improves circulation, but no module depends on it to do its job.',
};

/** The PRD page each phase answers to (Confluence, space BENTKEY). */
export const PHASE_PRD: Record<Phase, { label: string; href: string }> = {
  1: {
    label: 'PRD · Pre-Election Map',
    href: 'https://bentkey.atlassian.net/wiki/spaces/BENTKEY/pages/1843298313',
  },
  2: {
    label: 'PRD · Follow a Race',
    href: 'https://bentkey.atlassian.net/wiki/spaces/BENTKEY/pages/1840283654',
  },
  3: {
    label: 'PRD · Election Results Map',
    href: 'https://bentkey.atlassian.net/wiki/spaces/BENTKEY/pages/1843101710',
  },
  4: {
    label: 'PRD · Election Coverage Feed',
    href: 'https://bentkey.atlassian.net/wiki/spaces/BENTKEY/pages/1842970626',
  },
};

export const PHASE_TITLE: Record<Phase, string> = {
  1: 'Understand the race',
  2: 'Follow what matters to me',
  3: 'Election night',
  4: 'Last version',
};

const BASE: PhaseFeatures = {
  followState: false,
  zoomDepth: false,
  results: false,
  raceTags: false,
  trustPicks: false,
};

export const PHASE_FEATURES: Record<Phase, PhaseFeatures> = {
  1: { ...BASE },
  2: { ...BASE, followState: true, zoomDepth: true },
  3: { ...BASE, followState: true, zoomDepth: true, results: true },
  4: { ...BASE, followState: true, zoomDepth: true, results: true, raceTags: true },
};

const KEY = 'dw-phase';

function readParam(): Phase | null {
  try {
    const raw = new URLSearchParams(window.location.search).get('phase');
    const n = Number(raw);
    return PHASES.includes(n as Phase) ? (n as Phase) : null;
  } catch {
    return null;
  }
}

/** URL wins (that is what gets shared), then the last choice, then everything. */
export function initialPhase(): Phase {
  const fromUrl = readParam();
  if (fromUrl) return fromUrl;
  try {
    const n = Number(localStorage.getItem(KEY));
    if (PHASES.includes(n as Phase)) return n as Phase;
  } catch {
    // Private mode: fall through to the default.
  }
  return 4;
}

export function rememberPhase(phase: Phase): void {
  try {
    localStorage.setItem(KEY, String(phase));
  } catch {
    // Private mode: the in-session choice still works.
  }
}

/** Escape hatch for the picker that has no phase yet. */
const TRUST_OVERRIDE = (() => {
  try {
    return new URLSearchParams(window.location.search).has('trust');
  } catch {
    return false;
  }
})();

export function featuresFor(phase: Phase): PhaseFeatures {
  const features = PHASE_FEATURES[phase];
  return TRUST_OVERRIDE ? { ...features, trustPicks: true } : features;
}
