/**
 * Clock text, pinned to Eastern — the election clock everyone quotes — and
 * labelled as such, so a reader elsewhere is not left guessing whose 9:42
 * that is.
 */
const ET = 'America/New_York';

/** "9:42 PM ET" */
export function formatET(ms: number): string {
  return (
    new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: ET }) + ' ET'
  );
}

/** "Sep 1, 2026 9:00 AM ET" — the comp's form for a dated freshness line. */
export function formatDateET(ms: number): string {
  return (
    new Date(ms)
      .toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: ET,
      })
      // "Sep 1, 2026, 9:00 AM" -> "Sep 1, 2026 9:00 AM": only the comma
      // before the time goes.
      .replace(/, (\d{1,2}:)/, ' $1') + ' ET'
  );
}
