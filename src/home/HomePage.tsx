/**
 * dailywire.com on election night.
 *
 * The home is transcribed from the live site (Sep 22 2026) so the takeover
 * can be judged in place: promo bar, ad slot, the nav the hub already owns,
 * the date/wordmark line, then the sections. The election-night block goes
 * ABOVE all of it and everything else moves down intact — option A, approved
 * Sep 22 2026.
 *
 * DARK, END TO END (Arthur, Sep 22: the nav is dark "assim como o resto da
 * pagina"). The site's own home is a light surface; on election night this
 * page is a DW+ dark one, so nothing here sets a theme and every token
 * resolves to its dark-mode value — nav, sections and footer included. The
 * map's encoding is identical in both themes, so no result changes with it.
 *
 * The hero carousel and Top Stories are gone by the same round's call: the
 * stream IS the lead on this night, and a second full-width promo right under
 * it only competed with it. The page runs takeover, then Opinion Board.
 *
 * BEFORE ELECTION DAY (Oct 9 2026). The same page carries the site's own
 * home up to the night: the banner carousel led by the Midterms slide
 * (Figma 376:135725) beside Top Stories, then the sections, with the
 * Midterms strip (376:136521) between Opinion Board and Hosts. A DEV switch
 * flips between the two.
 */
import { useEffect, useRef, useState } from 'react';
import { DWNav } from '../components/DWNav';
import { SiteFooter } from '../components/SiteFooter';
import { NightClock } from '../components/NightClock';
import { ElectionNight } from './ElectionNight';
import { ResultsDock } from './ResultsDock';
import { GAME_URL, HUB_URL } from './ResultsBand';
import { EPISODES, HOSTS, OPINION, TOP_STORIES } from './homeContent';
import { HeroCarousel } from './HeroCarousel';
import { MidtermsStrip } from './MidtermsPromo';
import { PhaseSwitch, phaseFromUrl, type HomePhase } from './PhaseSwitch';
import { useElectionData } from '../state/useElectionData';
import { useNightClock } from '../state/useNightClock';
import { msOfMinute } from '../data/night';
import { StreamSwitch } from './StreamSwitch';
import { ChatSwitch } from './ChatSwitch';
import { parseStreamParam, streamStatusAt, type StreamStatus } from './stream';
import { parseChatParam, type ChatStatus } from './chat';

/** `?chat=on|down` forces the chat's health, independently of the stream. */
function chatFromUrl(): ChatStatus {
  try {
    return parseChatParam(new URLSearchParams(window.location.search).get('chat')) ?? 'on';
  } catch {
    return 'on';
  }
}

/** `?stream=upcoming|live|down|ended` forces the broadcast's state. */
function streamFromUrl(): StreamStatus | null {
  try {
    return parseStreamParam(new URLSearchParams(window.location.search).get('stream'));
  } catch {
    return null;
  }
}

/* 9:41 PM ET — the moment the block's header names, and a good one to open
   on: the east is called, the midwest is counting, the west is still too
   early. `?night=HH:MM` overrides it (useNightClock reads the param). */
const OPENS_AT = msOfMinute(3 * 60 + 41);

const DEV_KEY = 'dw-home-dev';

export function HomePage() {
  const { state, dispatch } = useElectionData();

  /* The page opens mid-night, on the hub's own simulated clock (night.ts) —
     the same authored outcome the full map runs on, so the two can never
     disagree about who has been called. Senate is the chamber on the map: 35
     states on the ballot read as a map, the curated 29 House districts read
     as scattered dots. */
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    dispatch({ type: 'SET_CHAMBER', chamber: 'senate' });
    dispatch({ type: 'NIGHT_TICK', at: OPENS_AT });
  }, [dispatch]);
  useNightClock(state, dispatch, true);

  /* The broadcast follows the clock unless the prototype forces a state
     (null = follow the clock). */
  const [forcedStream, setForcedStream] = useState<StreamStatus | null>(streamFromUrl);
  const stream = forcedStream ?? streamStatusAt(state.night.at);
  /* The chat's health is its own: the PRD requires the surfaces to fail
     independently, so nothing about the stream can set this. */
  const [chat, setChat] = useState<ChatStatus>(chatFromUrl);
  /* Election day unless the link says otherwise: /election-day/ keeps
     opening on the night it was shared for. */
  const [phase, setPhase] = useState<HomePhase>(() => phaseFromUrl() ?? 'day');
  const day = phase === 'day';

  /* Prototype chrome on/off, remembered per browser (a convenience, so it
     tolerates storage being blocked). */
  const [devHidden, setDevHidden] = useState(() => {
    try {
      return window.localStorage.getItem(DEV_KEY) === 'hidden';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const root = document.documentElement;
    if (devHidden) root.dataset.dev = 'hidden';
    else delete root.dataset.dev;
    try {
      window.localStorage.setItem(DEV_KEY, devHidden ? 'hidden' : 'shown');
    } catch {
      /* storage blocked: the toggle still works for this view */
    }
  }, [devHidden]);

  return (
    <div className="home">
      {/* Promo, ad slot, nav and masthead are one banner landmark — loose
          blocks above the fold otherwise sit outside every landmark. */}
      <header className="home-chrome">
        <a className="home-promo" href="https://get.dailywire.com/">
          <span className="home-promo-art" aria-hidden="true">
            RUN HIDE FIGHT
          </span>
          <span className="home-promo-line">
            <b>40% OFF</b> ANNUAL PLANS · NOW STREAMING
          </span>
          <span className="home-promo-cta">
            Join The Fight <span aria-hidden="true">→</span>
          </span>
        </a>

        <div className="home-ad" role="presentation">
          <span>ADVERTISEMENT</span>
        </div>

        <DWNav links={{ hub: HUB_URL, game: GAME_URL }} />

        <div className="home-masthead">
          <span className="home-date">
            {day
              ? 'Tuesday, November 3, 2026'
              : new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'America/New_York',
                })}
          </span>
          <span className="home-wordmark">DAILYWIRE</span>
          <span className="home-tagline">Unfiltered Honest News.</span>
        </div>
      </header>

      {/* THE TAKEOVER — first thing on the page, on the night only. */}
      {day && <ElectionNight state={state} stream={stream} chat={chat} />}

      <main className={`home-main${day ? '' : ' home-main--pre'}`}>
        {!day && (
          <>
            <div className="home-hero-row">
              <HeroCarousel />
              <section className="home-top" aria-labelledby="home-top-title">
                <h2 id="home-top-title" className="home-section-title">
                  Top Stories
                </h2>
                <ol className="home-top-list">
                  {TOP_STORIES.map((s) => (
                    <li key={s.title} className="home-top-item">
                      <img src={s.image} alt="" />
                      <div>
                        <h3>{s.title}</h3>
                        <p className="home-byline">
                          {s.byline} <span aria-hidden="true">·</span> {s.read}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        )}

        {/* Opinion is set in the exclusive serif — commentary is never
            dressed as reporting (Coverage Feed rule, applied to the home). */}
        <section className="home-section" aria-label="Opinion Board">
          <h2 className="home-section-title">Opinion Board</h2>
          <div className="home-row home-row--4">
            {OPINION.map((s) => (
              <article key={s.title} className="home-card">
                <img src={s.image} alt="" />
                <h3 className="home-card-title home-card-title--opinion">{s.title}</h3>
                <p className="home-byline">
                  {s.byline} <span aria-hidden="true">·</span> {s.read}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* The Midterms strip sits between Opinion Board and Hosts (Arthur,
            Oct 9 2026), before Election Day only. */}
        {!day && <MidtermsStrip />}

        <section className="home-section" aria-label="Hosts">
          <h2 className="home-section-title">Hosts</h2>
          <div className="home-row home-row--8">
            {HOSTS.map((h) => (
              <article key={h.name} className="home-host">
                <img src={h.image} alt="" />
                <p>{h.name}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section" aria-label="Latest Episodes">
          <h2 className="home-section-title">
            Latest Episodes <span aria-hidden="true">›</span>
          </h2>
          <div className="home-row home-row--4">
            {EPISODES.map((e) => (
              <article key={e.title} className="home-card">
                <img src={e.image} alt="" />
                <h3 className="home-card-title">{e.title}</h3>
                <p className="home-byline">{e.show}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Race calls and cutover notices, announced politely. */}
        <div aria-live="polite" className="visually-hidden">
          {state.announcement}
        </div>
      </main>

      <SiteFooter />

      {/* The night's results, fixed to the bottom of the window. */}
      {day && <ResultsDock state={state} />}

      {/* Prototype chrome: the hub's own clock. Playing the night moves the
          band exactly as it moves the full map — one reducer, one outcome. */}
      {day && <NightClock night={state.night} dispatch={dispatch} />}
      <div className="home-dev" role="region" aria-label="Prototype controls">
        <button type="button" className="dev-toggle" aria-pressed={!devHidden} onClick={() => setDevHidden((h) => !h)}>
          <span className="dev-chip">Dev</span>
          {devHidden ? 'Show' : 'Hide'}
        </button>
        {day && <StreamSwitch forced={forcedStream} current={stream} onChange={setForcedStream} />}
        {day && <ChatSwitch chat={chat} onChange={setChat} />}
        <PhaseSwitch phase={phase} onChange={setPhase} />
      </div>
    </div>
  );
}
