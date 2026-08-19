import { useEffect, useReducer } from 'react';
import { electionReducer, initialElectionState } from './electionReducer';

const STAGGER_STEP_MS = 12;
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

  // The cutover banner is non-blocking and auto-dismisses.
  useEffect(() => {
    if (state.banner === null) return;
    const t = window.setTimeout(() => dispatch({ type: 'CLEAR_BANNER' }), 6000);
    return () => window.clearTimeout(t);
  }, [state.banner]);

  return { state, dispatch };
}
