/**
 * Live chat — a SEPARATE, bounded surface beside the stream. The PRD is
 * explicit that chat is never interleaved into the coverage text, so it owns
 * its own column and its own frame here.
 *
 * Redrawn from the DW+ watch page Arthur sent (Sep 22 2026): title row with
 * CLOSE, avatar + name + message rows with a Reply affordance, the house
 * account on its own tinted card, a fade into the composer at the foot.
 *
 * TWO RULES FROM THE PRD ARE LOAD-BEARING HERE:
 *  - Posting is gated on sign-in. The composer looks like the reference until
 *    it is touched, then states the gate — an anonymous reader can read every
 *    message, and only posting asks for the account (hub tenet 1).
 *  - Moderation is declared, not implied: the header says the room is
 *    moderated rather than leaving the reader to assume it.
 *
 * A11Y: role="log" with aria-live OFF. A log is the right role, but election
 * night chat arrives several messages a minute — announcing each one would
 * bury the race calls a screen reader actually needs. The calls are announced
 * from the results widget instead; the chat is reachable and readable, not
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
      <header className="en-chat-head">
        <h2 className="en-chat-title">Live Chat</h2>
        <button type="button" className="en-chat-close">
          CLOSE <span aria-hidden="true">→</span>
        </button>
      </header>
      <p className="en-chat-note">Moderated live · {messages.length} shown</p>

      {/* role="log" belongs on the region, not on the <ol> — an ol with a
          non-list role strips its children of their list semantics. */}
      <div className="en-chat-scroll" role="log" aria-live="off" aria-label="Chat messages">
        <ol className="en-chat-list">
          {messages.map((m) => (
            <li key={m.id} className={`en-msg${m.house ? ' en-msg--house' : ''}`}>
              <span className={`en-avatar${m.house ? ' en-avatar--house' : ''}`} aria-hidden="true">
                {m.mark}
              </span>
              <div className="en-msg-body">
                <p className="en-msg-text">
                  <span className="en-msg-author">{m.author}</span> {m.text}
                </p>
                <button type="button" className="en-msg-reply">
                  Reply Comment
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="en-chat-foot">
        {composing ? (
          <div className="en-gate" role="status">
            <p className="en-gate-line">Sign in to chat</p>
            <p className="en-gate-sub">A free DailyWire+ account lets you post. Reading stays open.</p>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
