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
 * TWO RULES FROM THE PRD ARE LOAD-BEARING:
 *  - Posting is gated on sign-in. The composer reads as the file draws it
 *    until it is touched, then states the gate — an anonymous reader can read
 *    every message, and only posting asks for the account (hub tenet 1).
 *  - Moderation is declared where it matters, in that gate, rather than as a
 *    label the file does not have.
 *
 * A11Y: role="log" with aria-live OFF. A log is the right role, but election
 * night chat arrives several messages a minute — announcing each one would
 * bury the race calls a screen reader actually needs. The calls are announced
 * from the results band instead; the chat is reachable and readable, not
 * narrated. [Deliberate deviation, flagged for a11y review.]
 */
import { useEffect, useRef, useState } from 'react';
import { CHAT_INCOMING, CHAT_SEED, type ChatMessage } from './homeContent';

const ARRIVAL_MS = 4200;

export function LiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_SEED);
  const [composing, setComposing] = useState(false);
  const pending = useRef(0);

  // Mock traffic: one message every few seconds until the fixture runs out.
  useEffect(() => {
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
  }, []);

  return (
    <section className="en-chat" aria-label="Live chat">
      <div className="en-chat-top">
        <header className="en-chat-head">
          <h2 className="en-chat-title">Live Chat</h2>
          <button type="button" className="en-chat-close">
            Close
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>
        <hr className="en-chat-rule" />

        {/* role="log" belongs on the region, not on the <ol> — an ol with a
            non-list role strips its children of their list semantics. */}
        <div className="en-chat-scroll" role="log" aria-live="off" aria-label="Chat messages">
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
                {!m.house && (
                  <button type="button" className="en-msg-reply">
                    Reply Comment
                  </button>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="en-chat-foot">
        {composing ? (
          <div className="en-gate" role="status">
            <p className="en-gate-line">Sign in to chat</p>
            <p className="en-gate-sub">
              A free DailyWire+ account lets you post in a moderated room. Reading stays open.
            </p>
            <div className="en-gate-actions">
              <button type="button" className="en-gate-btn">
                Sign in
              </button>
              <button type="button" className="en-gate-back" onClick={() => setComposing(false)}>
                Not now
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="en-composer" onClick={() => setComposing(true)}>
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
