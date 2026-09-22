// THE NIGHT CLOCK (Sep 2026, PRD "Election Results Map"): the instrument
// that runs election night on the prototype. Off, it is one button —
// "Start election night" — and the map is pre-election. On, it shows the
// time of night, plays it at 1×/5×/20× (simulated minutes per second), and
// lets the reader scrub anywhere between 6 PM and 3 AM ET: polls close by
// wave, counts climb, calls land, one window where the feed goes quiet.
// Prototype chrome like the option switch — bottom-left, above the ticker.
import type { Dispatch } from 'react';
import { DELAY_WINDOW, NIGHT_MINUTES, minuteOf, msOfMinute } from '../data/night';
import { formatET } from '../data/time';
import type { ElectionAction, NightSpeed, NightState } from '../state/electionReducer';
import { IS_PREVIEW_FRAME } from './MobilePreview';

const SPEEDS: NightSpeed[] = [1, 5, 20];
const DELAY_FROM = minuteOf(new Date(DELAY_WINDOW[0]).getTime());
const DELAY_TO = minuteOf(new Date(DELAY_WINDOW[1]).getTime());

interface NightClockProps {
  night: NightState;
  dispatch: Dispatch<ElectionAction>;
}

export function NightClock({ night, dispatch }: NightClockProps) {
  if (IS_PREVIEW_FRAME) return null;
  const { at, playing, speed, delayed } = night;

  if (at === null) {
    return (
      <aside className="night-clock night-clock--off" aria-label="Election night clock">
        <button type="button" className="night-start" onClick={() => dispatch({ type: 'NIGHT_PLAY' })}>
          <span className="night-start-dot" aria-hidden="true" />
          Start election night
        </button>
      </aside>
    );
  }

  const minute = minuteOf(at);
  return (
    /* A landmark of its own (axe "region"): prototype chrome outside main. */
    <aside className="night-clock" aria-label="Election night clock">
      <div className="night-row">
        <button
          type="button"
          className="night-play"
          aria-pressed={playing}
          aria-label={playing ? 'Pause the night' : 'Play the night'}
          onClick={() => dispatch({ type: playing ? 'NIGHT_PAUSE' : 'NIGHT_PLAY' })}
        >
          {playing ? (
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 1l8 5-8 5z" fill="currentColor" />
            </svg>
          )}
        </button>
        <span className="night-time" aria-live="off">
          {formatET(at)}
        </span>
        {delayed && (
          <span className="night-delayed">
            <span aria-hidden="true">⚠</span> Results delayed
          </span>
        )}
        <div className="night-speed" role="radiogroup" aria-label="Speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={s === speed}
              className={`night-speed-option${s === speed ? ' is-selected' : ''}`}
              onClick={() => dispatch({ type: 'NIGHT_SPEED', speed: s })}
            >
              {s}×
            </button>
          ))}
        </div>
        <button type="button" className="night-leave" onClick={() => dispatch({ type: 'NIGHT_STOP' })}>
          Leave night
        </button>
      </div>
      {/* The scrubber: 6 PM → 3 AM in five-minute steps. The provider's
          outage is marked on the track. */}
      <input
        className="night-range"
        type="range"
        min={0}
        max={NIGHT_MINUTES}
        step={5}
        value={minute}
        aria-label="Time of night"
        aria-valuetext={formatET(at)}
        style={
          {
            '--delay-from': `${(DELAY_FROM / NIGHT_MINUTES) * 100}%`,
            '--delay-to': `${(DELAY_TO / NIGHT_MINUTES) * 100}%`,
          } as React.CSSProperties
        }
        onChange={(e) => dispatch({ type: 'NIGHT_TICK', at: msOfMinute(Number(e.target.value)) })}
      />
    </aside>
  );
}
