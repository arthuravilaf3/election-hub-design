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
 */
import { LivePlayer } from './LivePlayer';
import { LiveChat } from './LiveChat';
import { ResultsBand } from './ResultsBand';
import polymarketLogo from '../images/polymarketlogo.png';
import type { ElectionState } from '../state/electionReducer';

interface ElectionNightProps {
  state: ElectionState;
}

export function ElectionNight({ state }: ElectionNightProps) {
  return (
    <section className="en" aria-label="Election night coverage">
      <div className="en-rail">
        <header className="en-head">
          <span className="en-live">
            <span className="en-live-dot" aria-hidden="true" />
            LIVE
          </span>
          <h2 className="en-head-title">Election Night 2026</h2>
          <span className="en-head-time">Results updating · 9:41 PM ET</span>
          <span className="en-head-spacer" />
          <span className="en-sponsor">
            Presented by
            <img src={polymarketLogo} alt="Polymarket" />
          </span>
        </header>

        <div className="en-grid">
          <LivePlayer />
          <div className="en-chat-holder">
            <LiveChat />
          </div>
        </div>

        <ResultsBand state={state} />
      </div>
    </section>
  );
}
