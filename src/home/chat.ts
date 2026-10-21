/**
 * The chat's own health, kept in a file of its own ON PURPOSE.
 *
 * The PRD's rule for this page is that the three surfaces fail
 * INDEPENDENTLY: "a stream outage must not take down chat or blog". The
 * converse is the half that was never modelled — the chat can go while the
 * broadcast carries on — so its state does not hang off StreamStatus and
 * cannot be set by the stream's switch. Two surfaces, two controls.
 *
 * `on`   the room is live: messages arrive, members can post.
 * `down` the service is unreachable. What has already loaded stays readable
 *        (an empty panel would read as "nobody is talking", which is a
 *        different and wrong message); nothing new arrives; posting is off.
 */
export type ChatStatus = 'on' | 'down';

export const CHAT_STATUSES: ChatStatus[] = ['on', 'down'];

/** `?chat=on|down` pins the chat's health, the way `?stream=` pins the broadcast's. */
export function parseChatParam(value: string | null): ChatStatus | null {
  if (!value) return null;
  return CHAT_STATUSES.includes(value as ChatStatus) ? (value as ChatStatus) : null;
}
