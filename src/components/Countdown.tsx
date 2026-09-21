// Election Day countdown (PRD P1). Redesign Sep 2026: a LIVE clock — days,
// hours, minutes, seconds — ticking once a second under the hub header.
// The interval is the only timer in the app; it is cleared on unmount.
import { useEffect, useRef, useState } from 'react';
import { INTRO_AT, introDelay } from './Intro';

export const ELECTION_DAY = '2026-11-03T00:00:00-05:00';

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  over: boolean;
}

export function partsUntil(target: string, now: number): Parts {
  const ms = Math.max(0, new Date(target).getTime() - now);
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86_400),
    hours: Math.floor((s % 86_400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    over: ms === 0,
  };
}

export const pad = (n: number) => String(n).padStart(2, '0');

/**
 * One digit that ROLLS when it changes: the new value rises in from below
 * while the old one leaves upward, inside a clipped box one line tall. Keyed
 * on the value, so React mounts a fresh pair per change; the leaving copy is
 * kept for the length of the animation and then dropped. Reduced motion
 * collapses it to a plain swap (see the CSS pair).
 */
function Roll({ value, intro }: { value: string; intro: number | null }) {
  const prev = useRef(value);
  // The digit this slot was born with: it lands with the page's entrance
  // (from above, on its own delay); every later value rolls normally.
  const born = useRef(value);
  const [leaving, setLeaving] = useState<string | null>(null);
  useEffect(() => {
    if (prev.current === value) return;
    setLeaving(prev.current);
    prev.current = value;
    const id = window.setTimeout(() => setLeaving(null), 450);
    return () => window.clearTimeout(id);
  }, [value]);
  const entering = intro !== null && value === born.current && leaving === null;
  return (
    <span className="countdown-digit">
      <span
        className={`countdown-roll-in${entering ? ' countdown-roll-in--intro' : ''}`}
        style={entering ? introDelay(intro) : undefined}
        key={`in-${value}`}
      >
        {value}
      </span>
      {leaving !== null && (
        <span className="countdown-roll-out" aria-hidden="true" key={`out-${leaving}`}>
          {leaving}
        </span>
      )}
    </span>
  );
}

/** A figure as independent digits, so "19" -> "18" rolls only the 9. */
export function Figure({ value, order = null }: { value: string; order?: number | null }) {
  // Entrance: the digits land one by one, 70ms apart, figure after figure.
  const STEP = 70;
  return (
    <span className="countdown-num">
      {value.split('').map((d, i) => (
        <Roll
          value={d}
          intro={order === null ? null : INTRO_AT.countdown + (order * value.length + i) * STEP}
          key={`${value.length}-${i}`}
        />
      ))}
    </span>
  );
}

interface CountdownProps {
  /** Test seam: freeze the clock at a given instant. */
  now?: number;
  /** The small form (Sep 17 2026): one line of figures, a caption after. */
  compact?: boolean;
  /** The pill (Sep 21 2026): the four figures in one capsule, no caption,
      pinned with the map's controls. */
  pill?: boolean;
}

export function Countdown({ now, compact = false, pill = false }: CountdownProps) {
  const [tick, setTick] = useState(() => now ?? Date.now());
  useEffect(() => {
    if (now !== undefined) return;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [now]);
  const t = partsUntil(ELECTION_DAY, tick);

  const units: Array<[string, string]> = [
    [String(t.days), 'days'],
    [pad(t.hours), 'hours'],
    [pad(t.minutes), 'minutes'],
    [pad(t.seconds), 'seconds'],
  ];

  return (
    /* role=timer, no aria-live: announcing every second would be noise. The
       label reads the whole figure once, on focus or on demand. */
    <div
      className={`countdown${compact ? ' countdown--compact' : ''}${pill ? ' countdown--pill' : ''}`}
      role="timer"
      aria-label={
        t.over
          ? 'Election Day'
          : `${t.days} days, ${t.hours} hours, ${t.minutes} minutes to Election Day`
      }
    >
      {units.map(([value, label], order) => (
        <span className="countdown-unit" key={label}>
          <Figure value={value} order={order} />
          <span
            className="countdown-label intro-rise"
            style={introDelay(INTRO_AT.countdown + order * 140)}
          >
            {label}
          </span>
        </span>
      ))}
      {compact && <span className="countdown-caption">to Election Day</span>}
    </div>
  );
}
