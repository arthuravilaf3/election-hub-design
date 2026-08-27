/**
 * Segment analytics stub (PRD cross-cutting requirement: events on every
 * module). One entry point so the real client drops in behind it later.
 * Prototype behavior: console only.
 */
export function track(eventName: string, payload: Record<string, unknown> = {}): void {
  // eslint-disable-next-line no-console
  console.log('[track]', eventName, payload);
}
