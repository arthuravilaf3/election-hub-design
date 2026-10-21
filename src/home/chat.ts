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
 * `locked` the reader is not: they read everything, and the membership gate
 *          meets them at the composer, the moment they try to post.
 * `down`   the service is unreachable, whatever the reader is.
 *
 * READING STAYS OPEN (Arthur, Oct 21 2026). The first cut of `locked` walled
 * the whole room off, as the design drew it. That gated READING on a paid
 * membership, which is further than hub tenet 1 ("anonymous first... a FREE
 * account is the single, consistent gate") and further than this module's
 * PRD, which gates posting only. Arthur's call on the flag: keep reading open
 * and put the gate on the attempt to comment. The design's own language — the
 * padlock, "Join the live chat with a paid membership", "Upgrade Plan" — came
 * with it, in the foot where the action is, instead of over the room.
 */
export type ChatStatus = 'member' | 'locked' | 'down';

export const CHAT_STATUSES: ChatStatus[] = ['member', 'locked', 'down'];

/** `?chat=member|locked|down`, the way `?stream=` pins the broadcast. */
export function parseChatParam(value: string | null): ChatStatus | null {
  if (!value) return null;
  return CHAT_STATUSES.includes(value as ChatStatus) ? (value as ChatStatus) : null;
}
