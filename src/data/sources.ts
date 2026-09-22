/**
 * Data providers, behind an interface.
 *
 * Licensing for DDHQ / Kalshi / Polymarket / AP is an OPEN question, so nothing
 * downstream may hard-code a provider. Components take a `sourceId` and look it
 * up here; swapping or dropping a provider is an edit to this file alone.
 *
 * PRD tenet 1: no single data source should look like the truth. These are
 * rendered side by side at equal visual weight — order here is presentation
 * order, and it is deliberately poll-first-then-markets, not best-first.
 */
import type { SourceKind } from './types';

export interface DataSource {
  id: string;
  /** Short label for the toggle. */
  label: string;
  /** Full attribution shown in the sourcing disclosure. */
  attribution: string;
  kind: SourceKind;
  /** False = known provider, not offered in the SOURCE picker. */
  listed?: boolean;
}

/* Order = the picker's order, and SOURCES[0] is the default. Polymarket leads
   (Sep 2026, the presenting partner). Kalshi stays known but unlisted. */
export const SOURCES: DataSource[] = [
  {
    id: 'polymarket',
    label: 'Polymarket',
    attribution: 'Polymarket market-implied odds (mock)',
    kind: 'market',
  },
  {
    id: 'dw-poll-avg',
    label: 'DDHQ',
    attribution: 'DecisionDeskHQ polling average (mock)',
    kind: 'poll',
  },
  {
    /* Not in the picker (Sep 2026), but still a known provider: its reads
       stay in the fixtures and must keep their label everywhere they show. */
    listed: false,
    id: 'kalshi',
    label: 'Kalshi',
    attribution: 'Kalshi market-implied odds (mock)',
    kind: 'market',
  },
];

export const DEFAULT_SOURCE_ID = SOURCES[0].id;

export function getSource(sourceId: string): DataSource | undefined {
  return SOURCES.find((s) => s.id === sourceId);
}

export function sourceLabel(sourceId: string): string {
  return getSource(sourceId)?.label ?? 'Unknown source';
}

export function sourceAttribution(sourceId: string): string {
  return getSource(sourceId)?.attribution ?? 'Unknown source';
}

/**
 * WHAT KIND OF NUMBER THIS IS — the disclaimer that rides with every source
 * control. A polling average and a market price are not the same measurement
 * (points vs implied probability), and the reader has to know which one they
 * just switched the map to before they read a single number off it.
 */
export const KIND_LABEL: Record<SourceKind, string> = {
  poll: 'Polling Data',
  market: 'Prediction Market',
};

export function sourceKind(sourceId: string): string {
  const kind = getSource(sourceId)?.kind;
  return kind ? KIND_LABEL[kind] : '';
}

/**
 * RESULTS PROVIDERS (election night, Sep 2026) — kept apart from SOURCES on
 * purpose: a vote count is not a prediction, it is never offered in the
 * SOURCE picker, and the map never blends the two. One provider certifies
 * every call (PRD tenet 1); licensing is still open, so the id is the only
 * thing the rest of the app may hold.
 */
export interface ResultsProvider {
  id: string;
  /** Short label — "Results by AP". */
  label: string;
  /** Full attribution for the sourcing disclosure. */
  attribution: string;
}

export const RESULTS_PROVIDERS: ResultsProvider[] = [
  { id: 'ap', label: 'AP', attribution: 'AP vote count (mock)' },
];

export const DEFAULT_RESULTS_PROVIDER = RESULTS_PROVIDERS[0].id;

export function getResultsProvider(providerId: string): ResultsProvider | undefined {
  return RESULTS_PROVIDERS.find((p) => p.id === providerId);
}

export function resultsLabel(providerId: string): string {
  return getResultsProvider(providerId)?.label ?? 'the certified feed';
}

export function resultsAttribution(providerId: string): string {
  return getResultsProvider(providerId)?.attribution ?? 'Certified results feed';
}
