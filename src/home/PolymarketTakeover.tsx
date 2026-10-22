/**
 * The Polymarket wallpaper takeover (UXD-469, from Arthur's reference, Oct 22
 * 2026): a leaderboard across the top of the page and two gutters either
 * side of it, with the site's rail narrowed so the creative and the coverage
 * never touch.
 *
 * SAFE ZONES ARE A LAYOUT RULE, NOT A MARGIN. `[data-ad='on']` narrows the
 * page's own `--rail`, and each gutter takes exactly half of what that frees
 * — so the gutter can never grow over the content and the content can never
 * run under the gutter, whatever the window does. Below 1380px there is not
 * enough room for a gutter worth selling, so the gutters drop and the
 * leaderboard carries the buy on its own; that is the task's "mobile web
 * fallback", and it needs no second design.
 *
 * The gutters are CLICKABLE in full, as the format requires. They are fixed
 * and vertically centred, so at the top of the page they sit under the
 * leaderboard and stay put as the page runs past them.
 *
 * PLACEHOLDER CREATIVE — see takeover.ts. The markets, the odds and the
 * offer are the reference's, drawn rather than exported, because the real
 * assets come from the advertiser.
 */
import { photoFor } from '../components/candidatePhoto';
import { HUB_URL } from './ResultsBand';
import { AD_BETS, AD_MARKETS, AD_OFFER, POLYMARKET_URL } from './takeover';
import polymarketLogo from '../images/polymarketlogo.png';

/* The asset already carries the wordmark, so the lockup is the image and
   nothing else — a text "Polymarket" beside it printed the name twice. */
function Lockup({ className = '' }: { className?: string }) {
  return <img className={`pm-lockup ${className}`.trim()} src={polymarketLogo} alt="Polymarket" />;
}

function Offer() {
  return (
    <span className="pm-offer">
      <Lockup />
      <span className="pm-offer-line">{AD_OFFER.line1}</span>
      <span className="pm-offer-line">{AD_OFFER.line2}</span>
    </span>
  );
}

/* A phone standing in for the app shot in the reference: the chrome, a
   headline card and a couple of market rows, drawn at a size where that
   reads and nothing more. */
function Phone({ back = false }: { back?: boolean }) {
  return (
    <span className={`pm-phone${back ? ' pm-phone--back' : ''}`} aria-hidden="true">
      <span className="pm-phone-bar">
        <i>9:41</i>
        <b />
      </span>
      <span className="pm-phone-head">Midterms 2026</span>
      <span className="pm-phone-card">There’s a 48% chance Dems sweep the Midterms</span>
      <span className="pm-phone-rows">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

export function PolymarketTakeover() {
  return (
    <>
      {/* The leaderboard. In flow at the very top, so it scrolls away with
          the page the way a leaderboard does. */}
      <aside className="pm-top" aria-label="Advertisement">
        <a className="pm-top-inner" href={POLYMARKET_URL} target="_blank" rel="noopener noreferrer sponsored">
          <span className="pm-top-copy">
            <Lockup className="pm-lockup--lg" />
            <span className="pm-top-head">
              <b>FOLLOW THE</b>
              <b className="pm-top-grad">MIDTERMS</b>
            </span>
            <span className="pm-top-code">
              $50 ON YOUR FIRST TRADE. USE CODE: <b>DAILYWIRE</b>
            </span>
          </span>
          <span className="pm-top-art" aria-hidden="true">
            <Phone back />
            <Phone />
          </span>
        </a>
        {/* The hub is ours, so this one is a real link out of the creative. */}
        <a className="pm-top-cta" href={HUB_URL}>
          View the Hub
        </a>
      </aside>

      <a
        className="pm-gutter pm-gutter--left"
        href={POLYMARKET_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label="Polymarket: follow the midterms markets"
      >
        <span className="pm-stack">
          {AD_MARKETS.map((m) => (
            <span key={m.race} className="pm-mkt">
              <span className="pm-mkt-faces">
                <img src={photoFor(m.dem.name)} alt="" />
                <img src={photoFor(m.rep.name)} alt="" />
              </span>
              <span className="pm-mkt-title">{m.race}</span>
              <span className="pm-mkt-sub">
                {m.dem.name} (D) v. {m.rep.name} (R)
              </span>
              <span className="pm-mkt-bar">
                <i className="pm-mkt-fill" style={{ width: `${m.dem.pct}%` }} />
              </span>
              <span className="pm-mkt-pcts">
                <i className="pm-pct--dem">{m.dem.pct}%</i>
                <i className="pm-pct--rep">{m.rep.pct}%</i>
              </span>
            </span>
          ))}
        </span>
        <Offer />
      </a>

      <a
        className="pm-gutter pm-gutter--right"
        href={POLYMARKET_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label="Polymarket: balance of power markets"
      >
        <span className="pm-stack">
          {AD_BETS.map((bt) => (
            <span key={bt.title} className="pm-bet">
              <span className="pm-bet-head">
                <span className="pm-bet-title">{bt.title}</span>
                <span className="pm-bet-chip">{bt.chip}</span>
              </span>
              {bt.split ? (
                <span className="pm-bet-split">
                  <span className="pm-bet-splitlabels">
                    <i>{bt.outcomes[0].label}</i>
                    <i>{bt.outcomes[1].label}</i>
                  </span>
                  <span className="pm-bet-bar">
                    <i style={{ width: `${bt.outcomes[0].pct}%` }} />
                  </span>
                  <span className="pm-bet-splitlabels">
                    <i>{bt.outcomes[0].pct}%</i>
                    <i>{bt.outcomes[1].pct}%</i>
                  </span>
                </span>
              ) : (
                <span className="pm-bet-outs">
                  {bt.outcomes.map((o) => (
                    <span key={o.label} className={`pm-out pm-out--${o.side}`}>
                      <span className="pm-out-label">{o.label}</span>
                      <span className="pm-out-pct">{o.pct}%</span>
                    </span>
                  ))}
                </span>
              )}
            </span>
          ))}
        </span>
        <Offer />
      </a>
    </>
  );
}
