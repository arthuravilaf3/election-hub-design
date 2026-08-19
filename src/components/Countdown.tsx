// Election Day countdown (PRD P1).
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

  if (days > 1) {
    return (
      <p className="countdown">
        <strong>{days}</strong> days until Election Day
      </p>
    );
  }
  if (days === 1) return <p className="countdown">Election Day is tomorrow</p>;
  if (days === 0) return <p className="countdown">Election Day</p>;
  return <p className="countdown">Election Day has passed</p>;
}
