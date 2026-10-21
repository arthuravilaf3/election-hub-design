/**
 * What the chat panel is showing, kept in a file of its own ON PURPOSE.
 *
 * The PRD's rule for this page is that the surfaces fail INDEPENDENTLY — "a
 * stream outage must not take down chat or blog". The converse is the half
 * that was never modelled: the chat can go while the broadcast carries on. So
 * none of this hangs off StreamStatus, and the stream's switch cannot reach
 * it. Two surfaces, two controls.
 *
 * `member` the reader is a paid member: the room is live and they can post.
 * `locked` the reader is not: the room is behind the membership gate.
 * `down`   the service is unreachable, whatever the reader is.
 *
 * READING IS GATED, NOT JUST POSTING (Arthur's designs, Oct 21 2026): the
 * locked state veils the whole room behind "Join the live chat with a paid
 * membership", rather than letting anyone read and gating only the composer.
 * That is further than hub tenet 1 ("anonymous first... a FREE account is the
 * single, consistent gate") and further than the module PRD, which gates
 * posting. [Flagged for the P.O. — the design is built as drawn.]
 */
export type ChatStatus = 'member' | 'locked' | 'down';

export const CHAT_STATUSES: ChatStatus[] = ['member', 'locked', 'down'];

/** `?chat=member|locked|down`, the way `?stream=` pins the broadcast. */
export function parseChatParam(value: string | null): ChatStatus | null {
  if (!value) return null;
  return CHAT_STATUSES.includes(value as ChatStatus) ? (value as ChatStatus) : null;
}
