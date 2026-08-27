/**
 * "Which read do you trust" (Pre-Election Map PRD, P2): the reader declares,
 * per race, which provider they believe — and the map honors it for that
 * state.
 *
 * TENET GUARD: a pick is NOT a fourth data source. It re-points ONE state at
 * ONE existing provider; no number is averaged, blended or converted, and the
 * pick lives in its own visual language (marker + panel), never inside the
 * source control.
 *
 * Anonymous-first (hub tenet 1): picks persist in localStorage with no
 * account. A free account would carry them across devices — not wired here.
 */
import type { Chamber } from './types';

/** `${chamber}:${stateId}` -> sourceId. Scoped per state AND race: trusting
 *  Kalshi for the Texas Senate says nothing about the Texas Governor race. */
export type TrustPicks = Record<string, string>;

const KEY = 'dw-election-trust';

export function trustKey(chamber: Chamber, stateId: string): string {
  return `${chamber}:${stateId}`;
}

export function loadTrust(): TrustPicks {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, v]) => typeof v === 'string'
      ) as Array<[string, string]>
    );
  } catch {
    return {}; // private mode / corrupt value: start clean, never throw
  }
}

export function saveTrust(picks: TrustPicks): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(picks));
  } catch {
    // Private mode: picks still work for the session.
  }
}

/** The picks that apply to the chamber on screen, as stateId -> sourceId. */
export function picksForChamber(picks: TrustPicks, chamber: Chamber): Record<string, string> {
  const prefix = `${chamber}:`;
  const out: Record<string, string> = {};
  for (const [key, sourceId] of Object.entries(picks)) {
    if (key.startsWith(prefix)) out[key.slice(prefix.length)] = sourceId;
  }
  return out;
}
