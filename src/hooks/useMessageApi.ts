// Tiny message API on window, mirroring an iframe postMessage contract.
//
// Inbound commands (post these to window):
//   { type: 'usmap-select', stateId: 'GA' }   -> selects a state
//   { type: 'usmap-flash',  stateId: 'GA' }   -> flashes a state
//   { type: 'usmap-list' }                    -> replies with the ordered race list
//
// Outbound events (marked source: 'usmap' so the component ignores its own):
//   { type: 'usmap-select', source: 'usmap', stateId, chamber }  on user selection
//   { type: 'usmap-list', source: 'usmap', chamber, sourceId, races: [...] }
//
// The original three commands are unchanged; chamber and sourceId are additive
// so existing embedders keep working.
import { useEffect, useRef, type Dispatch } from 'react';
import { orderedRaces } from '../data/raceOrder';
import { leanOf, readFor } from '../data/encoding';
import { activeRaces, type ElectionAction, type ElectionState } from '../state/electionReducer';

export const MESSAGE_SOURCE = 'usmap';

export function emitMapEvent(type: string, payload: Record<string, unknown> = {}) {
  window.postMessage({ type, source: MESSAGE_SOURCE, ...payload }, '*');
}

export function useMessageApi(state: ElectionState, dispatch: Dispatch<ElectionAction>) {
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; stateId?: string; source?: string } | null;
      if (!data || typeof data !== 'object') return;
      if (data.source === MESSAGE_SOURCE) return; // ignore our own events

      switch (data.type) {
        case 'usmap-select':
          if (typeof data.stateId === 'string' && activeRaces(stateRef.current)[data.stateId]) {
            dispatch({ type: 'SELECT', stateId: data.stateId });
          }
          break;
        case 'usmap-flash':
          if (typeof data.stateId === 'string') {
            dispatch({ type: 'FLASH', stateId: data.stateId });
          }
          break;
        case 'usmap-list': {
          const current = stateRef.current;
          const { sourceId } = current;
          emitMapEvent('usmap-list', {
            chamber: current.chamber,
            sourceId,
            races: orderedRaces(activeRaces(current), sourceId).map(({ id, name, race }) => {
              const read = readFor(race, sourceId);
              return {
                id,
                name,
                mode: race.mode,
                // Prediction fields are per-source and stay in their own units.
                lean: race.mode === 'prediction' && read ? leanOf(read) : undefined,
                margin: race.mode === 'prediction' ? read?.margin : undefined,
                demOdds: race.mode === 'prediction' ? read?.demOdds : undefined,
                asOf: race.mode === 'prediction' ? read?.asOf : undefined,
                status: race.mode === 'results' ? race.results?.status ?? 'uncalled' : undefined,
                reporting: race.mode === 'results' ? race.results?.reporting : undefined,
                leader: race.mode === 'results' ? race.results?.leader : undefined,
              };
            }),
          });
          break;
        }
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [dispatch]);
}
