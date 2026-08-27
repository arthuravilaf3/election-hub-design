export type Party = 'dem' | 'rep';
export type PredictionParty = Party | 'tossup';
export type RaceStatus = 'uncalled' | 'counting' | 'called';
export type Mode = 'prediction' | 'results';

export type Chamber = 'senate' | 'house' | 'governor';

/**
 * Polls and prediction markets do NOT speak the same units.
 *  - a poll average yields a signed point margin
 *  - a market yields an implied probability
 * Keeping them as separate kinds is what stops them being blended into a
 * single misleading number (PRD: Data integrity).
 */
export type SourceKind = 'poll' | 'market';

/**
 * One provider's read of one race.
 *
 * INVARIANT — never derive `margin` from `demOdds` or vice versa. A market's
 * 61% is not "D+3.4"; converting between them invents precision no provider
 * published. Each kind gets its own color ramp and its own legend.
 */
export interface SourceRead {
  /** Provider id, e.g. 'dw-poll-avg' | 'kalshi' | 'polymarket'. */
  sourceId: string;
  kind: SourceKind;
  /** poll only — signed margin in points: positive = dem lead, negative = rep. */
  margin?: number;
  /** market only — implied probability the Democrat wins, 0-100. */
  demOdds?: number;
  /** ISO timestamp this read was published. Required: freshness is not optional. */
  asOf: string;
}

export interface Results {
  status: RaceStatus;
  /** Percent of expected vote reported, 0-100. */
  reporting: number;
  leader?: Party;
  margin?: number;
  source: string;
}

/** A House district within a state — rendered in the zoomed frame, not on the map. */
export interface District {
  /** e.g. 'CA-13', or 'WY-AL' where the state elects at large. */
  id: string;
  incumbent: Party;
  reads: SourceRead[];
  /** One of the editor-curated "29 closest races" — the set the map and the
   *  game are scoped to. The rest of the delegation is context. */
  curated?: boolean;
}

/** One named candidate in a race (drawer redesign, Aug 2026). Mock data. */
export interface Candidate {
  name: string;
  party: Party | 'ind';
  /** Two-party(+ind) support share, 0-100. FIXTURE — real feeds bring real shares. */
  pct: number;
}

export interface StateRace {
  id: string; // 'GA'
  chamber: Chamber;
  mode: Mode;
  /** Every provider's read of this race. Order is presentation order. */
  reads: SourceRead[];
  /** Named candidates for the drawer. Mock in this prototype. */
  candidates?: Candidate[];
  /** House only — the curated competitive districts in this state. */
  districts?: District[];
  results?: Results;
  /** ISO timestamp — per-state cutover moment (poll close). */
  cutoverAt?: string;
}

/**
 * The full ballot, chamber-scoped. A state ABSENT from a chamber's record has
 * no race in that chamber — that is the not-on-ballot state, and for Senate it
 * is the majority case (~35 of 51 have a 2026 contest).
 */
export type Ballot = Record<Chamber, Record<string, StateRace>>;
