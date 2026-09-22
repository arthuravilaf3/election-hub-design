import { useEffect, useReducer } from 'react';
import { electionReducer, initialElectionState } from './electionReducer';
import { saveTrust } from '../data/trust';

/* The recolor wave. 6ms per state (~300ms across 51) keeps the sweep
   perceivable while landing inside the same window as the card's statement
   fade (200ms) and the seat dots' recolour (300ms) — a race switch has to read as
   ONE instrument recalculating, not four things updating in sequence. */
const STAGGER_STEP_MS = 6;
const STAGGER_TOTAL_MS = 51 * STAGGER_STEP_MS + 450; // wave + longest transition

export { STAGGER_STEP_MS };

export function useElectionData() {
  const [state, dispatch] = useReducer(electionReducer, undefined, initialElectionState);

  // The full-map cutover wave sets per-state transition delays; clear the
  // flag once the wave has finished so later transitions start instantly.
  useEffect(() => {
    if (!state.staggering) return;
    const t = window.setTimeout(() => dispatch({ type: 'STAGGER_DONE' }), STAGGER_TOTAL_MS);
    return () => window.clearTimeout(t);
  }, [state.staggering]);

  // Trust picks survive a reload (anonymous-first — no account involved).
  useEffect(() => {
    saveTrust(state.trust);
  }, [state.trust]);

  // The cutover banner is non-blocking and auto-dismisses. A warning (the
  // feed is late) stays up: it is the state of the map, not a notice.
  useEffect(() => {
    if (state.banner === null || state.bannerTone === 'warning') return;
    const t = window.setTimeout(() => dispatch({ type: 'CLEAR_BANNER' }), 6000);
    return () => window.clearTimeout(t);
  }, [state.banner, state.bannerTone]);

  return { state, dispatch };
}
