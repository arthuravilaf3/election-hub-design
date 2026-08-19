import { useEffect, useMemo, useRef, useState } from 'react';
import { DWNav } from './components/DWNav';
import { PromoBar } from './components/PromoBar';
import { Hero } from './components/Hero';
import { ElectionMap } from './components/ElectionMap';
import { DevToolbar } from './components/DevToolbar';
import { CutoverBanner } from './components/CutoverBanner';
import { Dock } from './components/Dock';
import { Legend } from './components/Legend';
import { RacePanel } from './components/RacePanel';
import { useElectionData } from './state/useElectionData';
import { activeRaces } from './state/electionReducer';
import { emitMapEvent, useMessageApi } from './hooks/useMessageApi';
import { isLive } from './data/encoding';
import { heroFor } from './data/hero';
import { summarize } from './data/summary';
import { HOUSE_DISTRICT_COUNT } from './data/mockRaces';
import { STATE_SHAPES } from './data/states';

const POLL_CLOSING_INTERVAL_MS = 900;

/**
 * Scroll chrome: the promo bar hides while scrolling DOWN and returns on
 * scroll UP; the DW nav never moves. (The compact title was removed Aug 2026.)
 *
 * The thresholds carry hysteresis WIDER than the promo bar's own height:
 * hiding it shifts layout, and (via scroll anchoring/clamping) can nudge
 * scrollY, which naive thresholds read as opposite-direction scroll — a
 * visible open/close oscillation. Accumulated-delta detection kills the loop.
 */
function useScrollChrome() {
  const [chromeHidden, setChromeHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let acc = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      acc = Math.sign(dy) === Math.sign(acc) ? acc + dy : dy;
      // Direction flips only after 24px of consistent travel.
      if (acc > 24 && y > 120) setChromeHidden(true);
      else if (acc < -24 || y < 80) setChromeHidden(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return chromeHidden;
}

export default function App() {
  const { state, dispatch } = useElectionData();
  const [devOpen, setDevOpen] = useState(false);
  const chromeHidden = useScrollChrome();
  useMessageApi(state, dispatch);

  const races = activeRaces(state);
  const anyLive = Object.values(races).some(isLive);
  const anyResults = Object.values(races).some((r) => r.mode === 'results');

  const summary = useMemo(
    () => summarize(races, state.chamber, state.sourceId, HOUSE_DISTRICT_COUNT),
    [races, state.chamber, state.sourceId]
  );
  const hero = useMemo(
    () => heroFor(races, state.chamber, state.sourceId, summary.seatsUp),
    [races, state.chamber, state.sourceId, summary.seatsUp]
  );

  const zoomedRace = state.zoomedId ? races[state.zoomedId] : undefined;
  const zoomedName = state.zoomedId
    ? STATE_SHAPES.find((s) => s.id === state.zoomedId)?.name ?? state.zoomedId
    : '';

  // Prev/next state navigation for the drawer: on-ballot states in map order,
  // wrapping at the ends.
  const onBallot = useMemo(() => STATE_SHAPES.filter((s) => races[s.id]), [races]);
  const zoomIndex = state.zoomedId ? onBallot.findIndex((s) => s.id === state.zoomedId) : -1;
  const prevState = zoomIndex >= 0 ? onBallot[(zoomIndex - 1 + onBallot.length) % onBallot.length] : null;
  const nextState = zoomIndex >= 0 ? onBallot[(zoomIndex + 1) % onBallot.length] : null;

  // Which chambers hold a race in the zoomed state — drives the drawer tabs.
  const availability = useMemo(
    () => ({
      house: !!(state.zoomedId && state.ballot.house[state.zoomedId]),
      senate: !!(state.zoomedId && state.ballot.senate[state.zoomedId]),
      governor: !!(state.zoomedId && state.ballot.governor[state.zoomedId]),
    }),
    [state.zoomedId, state.ballot]
  );

  const navigateState = (stateId: string) => {
    dispatch({ type: 'ZOOM_STATE', stateId });
    emitMapEvent('usmap-select', { stateId, chamber: state.chamber });
  };

  const handleSelect = (stateId: string) => {
    dispatch({ type: 'SELECT', stateId });
    emitMapEvent('usmap-select', { stateId, chamber: state.chamber });
  };

  // Per-state cutover simulation: close polls in cutoverAt order, one wave
  // of states per interval — the map hardens region by region.
  const pollTimers = useRef<number[]>([]);
  const runPollClosings = () => {
    pollTimers.current.forEach((t) => window.clearTimeout(t));
    pollTimers.current = [];
    const pending = Object.values(races)
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
  useEffect(() => () => pollTimers.current.forEach((t) => window.clearTimeout(t)), []);

  return (
    <>
      {/* Sticky chrome: nav always visible; promo + compact header collapse
          on scroll-down and return on scroll-up (height animates so content
          reflows smoothly underneath). */}
      {/* <header> at top level = banner landmark, so the promo bar and
          compact header live inside a landmark for AT users. */}
      <header className="site-chrome">
        <DWNav />
        {/* Absolutely positioned under the nav: hiding/showing these bars
            must never change the DOCUMENT height — height changes at the
            scroll extremes get clamp-compensated by the browser, which reads
            back as opposite-direction scroll and oscillates the chrome. */}
        <div className="chrome-overlays">
          <div className={`chrome-collapse${chromeHidden ? ' is-collapsed' : ''}`}>
            <PromoBar />
          </div>
        </div>
      </header>

      <div className={`app${devOpen ? ' app--dev-open' : ''}`}>
        <main className="app-main">
          {anyLive && (
            <div className="live-row">
              <span className="live-badge">
                <span className="live-dot" aria-hidden="true" />
                LIVE
              </span>
              <span className="mode-chip">{anyResults ? 'Results' : 'Predictions'}</span>
            </div>
          )}

          {state.banner && (
            <CutoverBanner text={state.banner} onDismiss={() => dispatch({ type: 'CLEAR_BANNER' })} />
          )}

          <Hero data={hero} />

          <div className="map-card">
            <a
              className="game-chip"
              href="#prediction-game"
              aria-label="Play the Perfect Prediction Map game"
            >
              <span aria-hidden="true">🔮</span>
            </a>

            <div className="map-and-panel">
              <ElectionMap
                races={races}
                chamber={state.chamber}
                sourceId={state.sourceId}
                selectedId={state.selectedId}
                zoomedId={state.zoomedId}
                staggering={state.staggering}
                flash={state.flash}
                onSelect={handleSelect}
                onZoom={(stateId) => {
                  dispatch({ type: 'ZOOM_STATE', stateId });
                  emitMapEvent('usmap-select', { stateId, chamber: state.chamber });
                }}
                onClearZoom={() => dispatch({ type: 'CLEAR_ZOOM' })}
              />

              {zoomedRace && prevState && nextState && (
                <RacePanel
                  key={zoomedRace.id}
                  stateName={zoomedName}
                  race={zoomedRace}
                  sourceId={state.sourceId}
                  chamber={state.chamber}
                  availability={availability}
                  prev={prevState}
                  next={nextState}
                  onChamber={(chamber) => dispatch({ type: 'SET_CHAMBER', chamber })}
                  onNavigate={navigateState}
                  onClose={() => dispatch({ type: 'CLEAR_ZOOM' })}
                />
              )}
            </div>
          </div>

          <Legend mode={anyResults ? 'results' : 'prediction'} />

          {/* Floating dock: chambers + source dropdown, fixed to the viewport.
              Inside <main> so it stays within a landmark. Hidden while the
              drawer is open — the drawer's tabs take over. */}
          <div
            className={`dock-row${devOpen ? ' is-raised' : ''}${zoomedRace ? ' is-dismissed' : ''}`}
          >
            <Dock
              chamber={state.chamber}
              sourceId={state.sourceId}
              sourcesDisabled={anyResults}
              onChamber={(chamber) => dispatch({ type: 'SET_CHAMBER', chamber })}
              onSource={(sourceId) => dispatch({ type: 'SET_SOURCE', sourceId })}
            />
          </div>

          {/* Race calls, cutover notices and control changes are announced politely. */}
          <div aria-live="polite" className="visually-hidden">
            {state.announcement}
          </div>
        </main>

        <DevToolbar
          state={state}
          dispatch={dispatch}
          onRunPollClosings={runPollClosings}
          open={devOpen}
          onToggle={setDevOpen}
        />
      </div>
    </>
  );
}
