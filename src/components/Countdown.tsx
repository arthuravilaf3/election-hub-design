// Election Day countdown (PRD P1). Redesign Sep 2026: plain text on the
// right of the hub header — "Elections will start in N days" — no mark, no
// pill. Whole days only, on purpose: the comp reads "3d 5h 20m", but hours
// and minutes need a live ticker (an interval + a re-render) or the number
// goes stale on a long-lived tab. That is new behavior, and it is a separate
// decision; the day count is exact and needs no clock.
export const ELECTION_DAY = '2026-11-03T00:00:00-05:00';

function daysUntil(target: string, now: number): number {
  const ms = new Date(target).getTime() - now;
  return Math.ceil(ms / 86_400_000);
}

interface CountdownProps {
  now?: number;
}

export function Countdown({ now = Date.now() }: CountdownProps) {
  const days = daysUntil(ELECTION_DAY, now);

  return (
    <p className="countdown">
      {days > 1 ? (
        <>
          Elections will start in <strong>{days}</strong> days
        </>
      ) : days === 1 ? (
        'Election Day is tomorrow'
      ) : days === 0 ? (
        'Election Day'
      ) : (
        'Election Day has passed'
      )}
    </p>
  );
}
