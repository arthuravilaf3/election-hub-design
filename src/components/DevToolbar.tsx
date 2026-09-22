// Election-night simulator. Everything here just dispatches reducer actions —
// the toolbar has no privileged access to component internals.
import type { Dispatch } from 'react';
import { STATE_SHAPES } from '../data/states';
import { activeRaces, type ElectionAction, type ElectionState } from '../state/electionReducer';

interface DevToolbarProps {
  state: ElectionState;
  dispatch: Dispatch<ElectionAction>;
  onRunPollClosings: () => void;
  /** Collapsed by default — the floating chamber dock owns the bottom edge;
     the App raises the dock while the toolbar is open. */
  open: boolean;
  onToggle: (open: boolean) => void;
}

export function DevToolbar({ state, dispatch, onRunPollClosings, open, onToggle }: DevToolbarProps) {
  const races = activeRaces(state);
  const onBallot = STATE_SHAPES.filter((s) => races[s.id]);
  const targetId = state.selectedId && races[state.selectedId] ? state.selectedId : onBallot[0]?.id;
  const target = targetId ? races[targetId] : undefined;
  const results = target?.mode === 'results' ? target.results : undefined;
  const globalMode = Object.values(races).some((r) => r.mode === 'results')
    ? 'results'
    : 'prediction';
  // The clock runs the night: the manual controls stand down (the reducer
  // ignores them too), so the two never fight over a race.
  const clockOn = state.night.at !== null;

  const callRandomRace = () => {
    const candidates = Object.values(races).filter(
      (r) => r.mode === 'results' && r.results && r.results.status !== 'called'
    );
    // Prefer races actively counting — that's where the hardening reads best.
    const counting = candidates.filter((r) => r.results?.status === 'counting');
    const pool = counting.length > 0 ? counting : candidates;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) dispatch({ type: 'CALL_RACE', stateId: pick.id });
  };

  if (!open) {
    return (
      <section
        className="dev-toolbar dev-toolbar--collapsed"
        aria-label="Developer toolbar: simulate election night (collapsed)"
      >
        <button type="button" className="dev-fab" onClick={() => onToggle(true)}>
          DEV
        </button>
      </section>
    );
  }

  return (
    <section className="dev-toolbar" aria-label="Developer toolbar: simulate election night">
      {clockOn && (
        <p className="dev-clock-note">Clock engaged — the night control runs the map. Leave the night to use these.</p>
      )}
      <div className="dev-group">
        <span className="dev-group-label">Mode</span>
        <div className="dev-row">
          <button
            type="button"
            aria-pressed={globalMode === 'prediction'}
            disabled={clockOn}
            onClick={() => dispatch({ type: 'SET_GLOBAL_MODE', mode: 'prediction' })}
          >
            Prediction
          </button>
          <button
            type="button"
            aria-pressed={globalMode === 'results'}
            disabled={clockOn}
            onClick={() => dispatch({ type: 'SET_GLOBAL_MODE', mode: 'results' })}
          >
            Results
          </button>
        </div>
      </div>

      <div className="dev-group">
        <label className="dev-group-label" htmlFor="dev-state-select">
          State ({onBallot.length} on ballot)
        </label>
        <div className="dev-row">
          <select
            id="dev-state-select"
            value={targetId ?? ''}
            onChange={(e) => dispatch({ type: 'SELECT', stateId: e.target.value })}
          >
            {onBallot.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {targetId && target?.mode === 'prediction' ? (
            <button type="button" disabled={clockOn} onClick={() => dispatch({ type: 'CUTOVER_STATE', stateId: targetId })}>
              Cut over (close polls)
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={clockOn || !targetId || results?.status !== 'uncalled'}
                onClick={() =>
                  targetId && dispatch({ type: 'SET_STATUS', stateId: targetId, status: 'counting' })
                }
              >
                Start counting
              </button>
              <button
                type="button"
                disabled={clockOn || !targetId || results?.status === 'called'}
                onClick={() => targetId && dispatch({ type: 'CALL_RACE', stateId: targetId })}
              >
                Call race
              </button>
            </>
          )}
        </div>
      </div>

      <div className="dev-group">
        <label className="dev-group-label" htmlFor="dev-reporting">
          % reporting {results ? `(${results.reporting}%)` : ''}
        </label>
        <input
          id="dev-reporting"
          type="range"
          min={0}
          max={100}
          value={results?.reporting ?? 0}
          disabled={clockOn || !targetId || !results || results.status === 'called'}
          onChange={(e) =>
            targetId &&
            dispatch({ type: 'SET_REPORTING', stateId: targetId, reporting: Number(e.target.value) })
          }
        />
      </div>

      <div className="dev-group">
        <span className="dev-group-label">Night</span>
        <div className="dev-row">
          <button type="button" disabled={clockOn} onClick={callRandomRace}>
            Call random race
          </button>
          <button type="button" disabled={clockOn} onClick={onRunPollClosings}>
            Run poll closings
          </button>
          {/* Exercises the "must not silently go stale" disclosure. */}
          <button type="button" onClick={() => dispatch({ type: 'AGE_DATA' })}>
            Simulate stale feed
          </button>
          <button type="button" onClick={() => dispatch({ type: 'RESET' })}>
            Reset
          </button>
          <button type="button" onClick={() => onToggle(false)}>
            Hide
          </button>
        </div>
      </div>
    </section>
  );
}
