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
}

export const SOURCES: DataSource[] = [
  {
    id: 'dw-poll-avg',
    label: 'DDHQ',
    attribution: 'DecisionDeskHQ polling average (mock)',
    kind: 'poll',
  },
  {
    id: 'kalshi',
    label: 'Kalshi',
    attribution: 'Kalshi market-implied odds (mock)',
    kind: 'market',
  },
  {
    id: 'polymarket',
    label: 'Polymarket',
    attribution: 'Polymarket market-implied odds (mock)',
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
