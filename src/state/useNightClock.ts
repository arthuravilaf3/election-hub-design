// The night's clock (Sep 2026): while playing, the simulated time advances
// `speed` minutes for every real second, in quarter-second ticks, and stops
// at 3 AM. On mount, `?night=HH:MM` pins the clock to that moment, paused —
// the way a link is shared and the way the lock harness looks at it.
import { useEffect, type Dispatch } from 'react';
import { NIGHT_END_MS, parseNightParam } from '../data/night';
import type { ElectionAction, ElectionState } from './electionReducer';

const TICK_MS = 250;

export function useNightClock(state: ElectionState, dispatch: Dispatch<ElectionAction>, enabled: boolean) {
  const { at, playing, speed } = state.night;

  useEffect(() => {
    if (!enabled) return;
    let pinned: number | null = null;
    try {
      pinned = parseNightParam(new URLSearchParams(window.location.search).get('night'));
    } catch {
      pinned = null;
    }
    if (pinned !== null) dispatch({ type: 'NIGHT_TICK', at: pinned });
  }, [enabled, dispatch]);

  useEffect(() => {
    if (!enabled || !playing || at === null) return;
    const id = window.setInterval(() => {
      const next = at + speed * 60_000 * (TICK_MS / 1000);
      if (next >= NIGHT_END_MS) {
        dispatch({ type: 'NIGHT_TICK', at: NIGHT_END_MS });
        dispatch({ type: 'NIGHT_PAUSE' });
      } else {
        dispatch({ type: 'NIGHT_TICK', at: next });
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled, playing, at, speed, dispatch]);
}
