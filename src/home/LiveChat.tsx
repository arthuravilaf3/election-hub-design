/**
 * Live chat — a SEPARATE, bounded surface beside the stream. The PRD is
 * explicit that chat is never interleaved into the coverage text, so it owns
 * its own column and its own frame.
 *
 * Built to DW 3.0 Source of Truth, "Desktop - Default" 11123:6768, the
 * Comments panel 11123:6886 (Sep 22 2026): 448 wide, 8px radius, 32px top
 * pad, 24px side pad on a 400px content column, 22px between rows, a hairline
 * under the header, and the composer breaking the inset to run edge to edge.
 * A message is one paragraph: the avatar and the author sit inline with the
 * first line, and wrapped lines hang to the avatar's right (the 26px indent
 * in the file) — so it is a hanging indent here, not three stacked rows.
 *
 * THE TWO BLOCKED STATES (Arthur's designs, Oct 21 2026). Both work the same
 * way and nothing like the notice bar they replaced: the room blurs behind a
 * centred glyph, two lines and one button.
 *   locked — a padlock, "Join the live chat with a paid membership",
 *            "Upgrade Plan". Reading is gated too, not only posting, so the
 *            composer's old sign-in gate is gone: a non-member never reaches
 *            it. See chat.ts for why that is flagged for the P.O.
 *   down   — a crimson alert, "Something went wrong, please try again",
 *            "Reload Comments". The stream is untouched (chat.ts).
 * The blurred room is INERT: it is decoration behind a wall, so it takes no
 * focus and no screen reader reads it. The header stays live above both, so
 * Close always works.
 *
 * ENDED is deliberately NOT one of them. The broadcast finishing winds the
 * room down on purpose — the PRD says it "stays readable" — so it keeps the
 * messages sharp and only swaps the composer for "Chat closed". A fault and a
 * decision should not look alike.
 *
 * A11Y: role="log" with aria-live OFF. A log is the right role, but election
 * night chat arrives several messages a minute — announcing each one would
 * bury the race calls a screen reader actually needs. The calls are announced
 * from the results band instead; the chat is reachable and readable, not
 * narrated. [Deliberate deviation, flagged for a11y review.]
 *
 * THE STREAM'S STATE (Oct 8 2026). The chat follows the broadcast but does
 * not fall with it: before the show it is open with a line saying when the
 * stream starts, during an interruption it keeps running and says so, and
 * once the broadcast ends it closes to new posts and stays readable.
 */
import { useEffect, useRef, useState } from 'react';
import { formatET } from '../data/time';
import { CHAT_INCOMING, CHAT_SEED, type ChatMessage } from './homeContent';
import type { ChatStatus } from './chat';
import { STREAM_STARTS_MS, type StreamStatus } from './stream';

const NOTICE: Partial<Record<StreamStatus, string>> = {
  upcoming: `The stream starts at ${formatET(STREAM_STARTS_MS)}. The chat is already open.`,
  interrupted: 'The stream is reconnecting. The chat is still on.',
  ended: 'The broadcast has ended. The chat is closed and stays readable.',
};

const ARRIVAL_MS = 4200;

function LockIcon() {
  return (
    <svg className="en-block-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="en-block-icon en-block-icon--alert" width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.6v5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.1" r="1.05" fill="currentColor" />
    </svg>
  );
}

/* The designs break each message in a particular place — after "with", after
   "wrong," — so the lines are authored, not left to the wrapper to guess.
   They still wrap inside themselves on a narrow panel. */
const BLOCK_LINES: Record<'locked' | 'down', [string, string]> = {
  locked: ['Join the live chat with', 'a paid membership'],
  down: ['Something went wrong,', 'please try again'],
};

/** The wall over the room. Two states, one shape. */
function ChatBlock({ kind }: { kind: 'locked' | 'down' }) {
  const locked = kind === 'locked';
  return (
    <div className={`en-chat-block en-chat-block--${kind}`} role={locked ? undefined : 'alert'}>
      {locked ? <LockIcon /> : <AlertIcon />}
      <p className="en-block-line">
        {BLOCK_LINES[kind].map((line) => (
          <span key={line}>{line}</span>
        ))}
      </p>
      <button type="button" className="mp-btn mp-btn--primary mp-btn--pill">
        {locked ? 'Upgrade Plan' : 'Reload Comments'}
      </button>
    </div>
  );
}

interface LiveChatProps {
  status: StreamStatus;
  /** What the panel is showing — never derived from the stream (see chat.ts). */
  chat: ChatStatus;
  /** Collapses the panel to the "Join the Conversation" button (Figma 391:150108). */
  onClose: () => void;
}

export function LiveChat({ status, chat, onClose }: LiveChatProps) {
  const block = chat === 'member' ? null : chat;
  const closed = !block && status === 'ended';
  const quiet = block !== null || closed;
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_SEED);
  const pending = useRef(0);

  // Mock traffic: one message every few seconds until the fixture runs out —
  // and none once the room is closed or walled off.
  useEffect(() => {
    if (quiet) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setMessages([...CHAT_SEED, ...CHAT_INCOMING]);
      return;
    }
    const t = window.setInterval(() => {
      const next = CHAT_INCOMING[pending.current];
      if (!next) {
        window.clearInterval(t);
        return;
      }
      pending.current += 1;
      setMessages((prev) => [...prev, next]);
    }, ARRIVAL_MS);
    return () => window.clearInterval(t);
  }, [quiet]);

  return (
    <section className="en-chat" aria-label="Live chat">
      <div className="en-chat-top">
        <header className="en-chat-head">
          <h2 className="en-chat-title">Live Chat</h2>
          <button type="button" className="en-chat-close" onClick={onClose}>
            Close
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>
        <hr className="en-chat-rule" />
        {!block && NOTICE[status] && (
          <p className={`en-chat-notice en-chat-notice--${status}`} role="status">
            {NOTICE[status]}
          </p>
        )}

        <div className="en-chat-main">
          {/* role="log" belongs on the region, not on the <ol> — an ol with a
              non-list role strips its children of their list semantics. */}
          {/* Closed, the rows lose their reply buttons and nothing inside takes
              focus — so the region does, to stay scrollable from the keyboard.
              Walled off, the whole thing goes inert instead. */}
          <div
            className={`en-chat-scroll${block ? ' is-veiled' : ''}`}
            role="log"
            aria-live="off"
            aria-label="Chat messages"
            inert={block !== null}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={closed ? 0 : undefined}
          >
            <ol className="en-chat-list">
              {messages.map((m) => (
                <li key={m.id} className={`en-msg${m.house ? ' en-msg--house' : ''}`}>
                  <p className="en-msg-text">
                    <span className={`en-avatar${m.house ? ' en-avatar--house' : ''}`} aria-hidden="true">
                      {m.mark}
                    </span>
                    <span className="en-msg-author">{m.author}</span> {m.text}
                  </p>
                  {/* The house account posts; it does not invite replies to itself. */}
                  {!m.house && !quiet && (
                    <button type="button" className="en-msg-reply">
                      Reply Comment
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </div>
          {block && <ChatBlock kind={block} />}
        </div>
      </div>

      <div className={`en-chat-foot${block ? ' is-veiled' : ''}`} inert={block !== null}>
        {closed ? (
          <p className="en-chat-closed">Chat closed</p>
        ) : (
          <button type="button" className="en-composer">
            <span className="en-composer-hint">Leave a comment</span>
            <span className="en-composer-send" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 24V9M9 16l7-7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
