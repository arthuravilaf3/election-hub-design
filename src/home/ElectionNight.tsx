/**
 * THE TAKEOVER — the election-night block that sits between the wordmark and
 * the rest of the home on Nov 3 (option A, approved Sep 22 2026: a dark band
 * above everything, the sections below it intact).
 *
 * Three surfaces, in the order Arthur set on Sep 22: the stream and the chat
 * side by side, then the results band under both. The live blog is
 * deliberately not here yet — "vamos focar no video e no chat do video".
 * When it lands it belongs under the stream, in the left column, because the
 * PRD makes the blog the system of record and the chat its companion.
 *
 * The chat is positioned inside a holder rather than stretched as a grid
 * item: a stretched item still reports its own content height, so a chat with
 * more messages than the stream column is tall would grow the row and leave
 * the panel hanging below the share buttons. In the holder it contributes no
 * height at all, so the row is the stream's, and the panel ends exactly where
 * the text does — the 767px the Figma gives both columns.
 *
 * CLOSING THE CHAT (Oct 9 2026, the DW+ watch page's own behaviour, from
 * Arthur's screenshot): the panel folds away, the stream takes the whole
 * rail, and a vertical "Live Chat" tab on the video's right edge opens it
 * again. (It replaced the floating "Join the Conversation" button of the
 * file's 391:150108.) More Episodes (391:150032) sits under the
 * player in the stream's column.
 *
 * NO RESULTS PANEL IN THE BLOCK (Oct 9 2026: "o banner grande que não é
 * fixo" came out). The results live in the dock fixed to the bottom of the
 * window (ResultsDock), so the block is the stream, the chat and the
 * episodes; ResultsBand.tsx is kept, unrendered, in case the panel returns.
 */
import { useEffect, useRef, useState } from 'react';
import { useScrollLock } from '../hooks/useScrollLock';
import { formatET } from '../data/time';
import { FINAL_MS } from '../data/night';
import { LivePlayer } from './LivePlayer';
import { LiveChat } from './LiveChat';
import { MoreEpisodes } from './MoreEpisodes';
import polymarketLogo from '../images/polymarketlogo.png';
import type { ElectionState } from '../state/electionReducer';
import { STREAM_STARTS_MS, type StreamStatus } from './stream';
import type { ChatStatus } from './chat';

interface ElectionNightProps {
  state: ElectionState;
  stream: StreamStatus;
  chat: ChatStatus;
}

/* The block's own line follows the night (Oct 8 2026): the pill says what
   the broadcast is doing, the line beside it what the results are doing.
   An interruption is the stream's fault, not the night's, so the pill stays
   LIVE and only the player says so. */
function headLine(stream: StreamStatus, at: number | null): string {
  if (stream === 'upcoming') return `On air at ${formatET(STREAM_STARTS_MS)}`;
  if (at !== null && at >= FINAL_MS) return 'Final results';
  return at !== null ? `Results updating · ${formatET(at)}` : 'Results updating';
}

export function ElectionNight({ state, stream, chat }: ElectionNightProps) {
  /* On a phone the chat starts CLOSED (Arthur, Oct 21): opening it takes the
     whole screen, and that is a choice the reader makes, not a state they
     land in. On a wider screen both columns fit, so it opens with the page. */
  const [chatOpen, setChatOpen] = useState(() => {
    try {
      return !window.matchMedia('(max-width: 760px)').matches;
    } catch {
      return true;
    }
  });
  /* WATCH MODE ON A PHONE (Oct 21 2026). With the chat open there is no page
     left to scroll: the video pins to the top, the room takes the rest of the
     screen, and the only scroll is the room's own. Closing the chat gives the
     page back. Nothing of the sort on a wider screen, where both columns fit
     and the page behaves. */
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  const locked = chatOpen && narrow;
  useScrollLock(locked);
  useEffect(() => {
    const root = document.documentElement;
    if (locked) root.dataset.chatLock = 'on';
    else delete root.dataset.chatLock;
    return () => {
      delete root.dataset.chatLock;
    };
  }, [locked]);
  const tabRef = useRef<HTMLButtonElement>(null);
  const touched = useRef(false);

  /* Focus follows the fold: closing the chat hands it to the Live Chat tab,
     opening hands it back to the panel's Close — never dropped on <body>. */
  useEffect(() => {
    if (!touched.current) return;
    if (!chatOpen) tabRef.current?.focus();
    else document.querySelector<HTMLButtonElement>('.en-chat-close')?.focus();
  }, [chatOpen]);
  /* Entering watch mode used to jump: the video was wherever the page had it
     and the overlay snapped it to the top edge. Now the page SCROLLS the
     video up first, smoothly, and the fixed overlay takes over at the pixel
     the scroll lands on — so nothing moves at the swap. Reduced motion skips
     straight to it. */
  const openTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(openTimer.current), []);
  const toggle = (open: boolean) => {
    touched.current = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stage = document.querySelector('.en-stage');
    if (open && narrow && stage && !reduced) {
      stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.clearTimeout(openTimer.current);
      openTimer.current = window.setTimeout(() => setChatOpen(true), 420);
      return;
    }
    window.clearTimeout(openTimer.current);
    setChatOpen(open);
  };

  return (
    <section className="en" aria-label="Election night coverage">
      <div className="en-rail">
        <header className="en-head">
          {/* No live tag up here (Oct 21 2026). The badge under the player is
              the one that says what the broadcast is doing; two of them, one
              above the other, said it twice. This line is the night's: what
              it is, and what the results are doing. */}
          <h2 className="en-head-title">Election Night 2026</h2>
          <span className="en-head-time">{headLine(stream, state.night.at)}</span>
          <span className="en-head-spacer" />
          <span className="en-sponsor">
            Presented by
            <img src={polymarketLogo} alt="Polymarket" />
          </span>
        </header>

        <div className={`en-grid${chatOpen ? '' : ' en-grid--solo'}`}>
          <div className="en-stream-col">
            <LivePlayer status={stream} at={state.night.at} />
            {/* Chat folded: the DW+ watch page's own tab, standing on the
                video's right edge, opens it again. */}
            {!chatOpen && (
              <button ref={tabRef} type="button" className="en-chat-tab" onClick={() => toggle(true)}>
                <span className="en-chat-tab-label">Live Chat</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 12a8 8 0 1 1 3.3 6.5L4 19.5l1-3.2A8 8 0 0 1 4 12Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
          {chatOpen && (
            <div className="en-chat-holder">
              <LiveChat status={stream} chat={chat} onClose={() => toggle(false)} />
            </div>
          )}
          <MoreEpisodes />
        </div>
      </div>
    </section>
  );
}
