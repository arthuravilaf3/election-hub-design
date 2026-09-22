/**
 * THE TAKEOVER — the election-night block that sits between the wordmark and
 * the home's own hero on Nov 3 (option A, approved Sep 22 2026: a dark band
 * above the hero, everything below it intact).
 *
 * Two surfaces this round: the stream and the chat, laid out as the DW+ watch
 * page lays them out. The live blog is deliberately not here yet — Arthur's
 * call, Sep 22: "vamos focar no video e no chat do video". When it lands it
 * belongs under the stream, in the left column, because the PRD makes the
 * blog the system of record and the chat its companion, never its container.
 *
 * The band carries the sponsor line ("Presented by Polymarket") because the
 * night's coverage is the sponsored surface, not the map inside the widget.
 */
import { LivePlayer } from './LivePlayer';
import { LiveChat } from './LiveChat';
import polymarketLogo from '../images/polymarketlogo.png';

export function ElectionNight() {
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
          <LiveChat />
        </div>
      </div>
    </section>
  );
}
