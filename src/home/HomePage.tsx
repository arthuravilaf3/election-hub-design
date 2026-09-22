/**
 * dailywire.com on election night.
 *
 * The home is transcribed from the live site (Sep 22 2026) so the takeover
 * can be judged in place: promo bar, ad slot, the nav the hub already owns,
 * the date/wordmark line, then the hero and the sections. The one change is
 * that the election-night block is inserted ABOVE the hero and everything
 * else moves down intact — option A, approved Sep 22 2026.
 *
 * The page runs in LIGHT mode (the site is #FAFAFA); the takeover and the
 * results widget re-declare the hub's dark tokens locally, so the same
 * semantic names resolve dark inside them and the map's encoding is
 * untouched. See `.en` and `.results-rail` in home.css.
 */
import { useEffect, useRef, useState } from 'react';
import { DWNav } from '../components/DWNav';
import { SiteFooter } from '../components/SiteFooter';
import { DevToolbar } from '../components/DevToolbar';
import { ElectionNight } from './ElectionNight';
import { ResultsRail } from './ResultsRail';
import { EPISODES, HERO, HOSTS, OPINION, TOP_STORIES } from './homeContent';
import { useElectionData } from '../state/useElectionData';

const POLL_CLOSING_INTERVAL_MS = 900;

export function HomePage() {
  const { state, dispatch } = useElectionData();
  const [devOpen, setDevOpen] = useState(false);

  /* The page opens mid-night: polls have closed, the certified feed is in,
     and the Senate is the chamber on the map (35 states on the ballot reads
     as a map; the curated 29 House districts read as scattered dots). */
  useEffect(() => {
    dispatch({ type: 'SET_CHAMBER', chamber: 'senate' });
    dispatch({ type: 'SET_GLOBAL_MODE', mode: 'results' });
    dispatch({ type: 'CLEAR_BANNER' });
  }, [dispatch]);

  // Same per-state cutover wave the hub's toolbar drives, so the simulator
  // behaves identically on this page.
  const pollTimers = useRef<number[]>([]);
  useEffect(() => () => pollTimers.current.forEach((t) => window.clearTimeout(t)), []);
  const runPollClosings = () => {
    pollTimers.current.forEach((t) => window.clearTimeout(t));
    pollTimers.current = [];
    const pending = Object.values(state.ballot[state.chamber])
      .filter((r) => r.mode === 'prediction')
      .sort((a, b) => (a.cutoverAt ?? '').localeCompare(b.cutoverAt ?? ''));
    const waves = new Map<string, string[]>();
    for (const race of pending) {
      const key = race.cutoverAt ?? 'unknown';
      waves.set(key, [...(waves.get(key) ?? []), race.id]);
    }
    [...waves.values()].forEach((ids, i) => {
      pollTimers.current.push(
        window.setTimeout(() => {
          ids.forEach((stateId) => dispatch({ type: 'CUTOVER_STATE', stateId }));
        }, i * POLL_CLOSING_INTERVAL_MS)
      );
    });
  };

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

      <DWNav />

      <div className="home-masthead">
        <span className="home-date">Tuesday, November 3, 2026</span>
        <span className="home-wordmark">DAILYWIRE</span>
        <span className="home-tagline">Unfiltered Honest News.</span>
      </div>
      </header>

      {/* THE TAKEOVER — first thing on the page, above the hero. */}
      <ElectionNight />

      <main className="home-main">
        <div className="home-col">
        <section className="home-hero-row" aria-label="Featured">
          <article className="home-hero">
            <img className="home-hero-img" src={HERO.image} alt="" />
            <span className="home-hero-kicker">{HERO.kicker}</span>
            <div className="home-hero-body">
              <h2 className="home-hero-title">{HERO.title}</h2>
              <button type="button" className="home-hero-cta">
                <span className="home-hero-play" aria-hidden="true" />
                {HERO.cta}
              </button>
            </div>
            <div className="home-hero-dots" aria-hidden="true">
              {Array.from({ length: HERO.slides }, (_, i) => (
                <span key={i} className={i === 0 ? 'is-on' : undefined} />
              ))}
            </div>
          </article>

          <section className="home-top" aria-label="Top Stories">
            <h2 className="home-section-title">Top Stories</h2>
            <ul className="home-top-list">
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
            </ul>
          </section>
        </section>

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
        </div>

        <ResultsRail state={state} />

        {/* Race calls and cutover notices, announced politely. */}
        <div aria-live="polite" className="visually-hidden">
          {state.announcement}
        </div>
      </main>

      <SiteFooter />

      {/* Prototype chrome: the hub's own election-night simulator, so calling
          a race here moves the widget exactly as it moves the full map. */}
      <DevToolbar
        state={state}
        dispatch={dispatch}
        onRunPollClosings={runPollClosings}
        open={devOpen}
        onToggle={setDevOpen}
      />
    </div>
  );
}
