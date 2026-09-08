// Election Day countdown (PRD P1). Redesign Sep 2026: a LIVE clock — days,
// hours, minutes, seconds — ticking once a second under the hub header.
// The interval is the only timer in the app; it is cleared on unmount.
import { useEffect, useState } from 'react';

export const ELECTION_DAY = '2026-11-03T00:00:00-05:00';

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  over: boolean;
}

function partsUntil(target: string, now: number): Parts {
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

const pad = (n: number) => String(n).padStart(2, '0');

interface CountdownProps {
  /** Test seam: freeze the clock at a given instant. */
  now?: number;
}

export function Countdown({ now }: CountdownProps) {
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
      className="countdown"
      role="timer"
      aria-label={
        t.over
          ? 'Election Day'
          : `${t.days} days, ${t.hours} hours, ${t.minutes} minutes to Election Day`
      }
    >
      {units.map(([value, label]) => (
        <span className="countdown-unit" key={label}>
          <span className="countdown-num">{value}</span>
          <span className="countdown-label">{label}</span>
        </span>
      ))}
    </div>
  );
}
