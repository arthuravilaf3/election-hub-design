import { useEffect, useMemo, useRef, useState } from 'react';
import { DWNav } from './components/DWNav';
import { RaceHeader } from './components/RaceHeader';
import { MapCard } from './components/MapCard';
import { DevToolbar } from './components/DevToolbar';
import { IS_PREVIEW_FRAME } from './components/MobilePreview';
import { ThemeToggle } from './components/ThemeToggle';
import { CutoverBanner } from './components/CutoverBanner';
import { CoverageFeed } from './components/CoverageFeed';
import { PlanBanner } from './components/PlanBanner';
import { Hemicycle } from './components/Hemicycle';
import { HouseColors } from './components/HouseColors';
import { NationSpeaks } from './components/NationSpeaks';
import { ChapterRail } from './components/ChapterRail';
import { OptionSwitcher } from './components/OptionSwitcher';
import {
  IS_CREATIVE,
  IS_OPTION3,
  readDotsShape,
  readExtras,
  storeDotsShape,
  storeExtras,
  type DotsShape,
  type Extras,
} from './data/edition';
import { SiteFooter } from './components/SiteFooter';
import { PolymarketTicker } from './components/PolymarketTicker';
import { RacePanel } from './components/RacePanel';
import { useElectionData } from './state/useElectionData';
import { activeRaces } from './state/electionReducer';
import { emitMapEvent, useMessageApi } from './hooks/useMessageApi';
import { isLive } from './data/encoding';
import { resultsLabel } from './data/sources';
import { track } from './data/analytics';
import { picksForChamber } from './data/trust';
import { featuresFor, initialPhase, type Phase } from './data/phases';
import { forecastFor } from './data/hero';
import { summarize } from './data/summary';
import { HOUSE_DISTRICT_COUNT } from './data/mockRaces';
import { STATE_SHAPES } from './data/states';
import type { Chamber } from './data/types';

const POLL_CLOSING_INTERVAL_MS = 900;

/** Tab order in the panel: the chambers as the RACE pill lists them. */
const CHAMBERS: Chamber[] = ['house', 'senate', 'governor'];

export default function App() {
  const { state, dispatch } = useElectionData();
  const [devOpen, setDevOpen] = useState(false);
  /* Which delivery phase the prototype is showing. One map decides what a
     phase contains (data/phases.ts); every gate below reads off it. */
  const [phase] = useState<Phase>(initialPhase);
  /* Option 2's extras: the Capitol strip and The Nation Speaks, off unless
     switched on (see OptionSwitcher). */
  const [extras, setExtras] = useState<Extras>(readExtras);
  const onExtras = (next: Extras) => {
    setExtras(next);
    storeExtras(next);
  };
  const isOption2 = IS_CREATIVE && !IS_OPTION3;
  /* Option 1's dots shape (grid, arc, semi-arc), from the same switch. */
  const [shape, setShape] = useState<DotsShape>(readDotsShape);
  const onShape = (next: DotsShape) => {
    setShape(next);
    storeDotsShape(next);
  };
  const features = featuresFor(phase);
  const mapSectionRef = useRef<HTMLElement>(null);
  useMessageApi(state, dispatch);

  const races = activeRaces(state);
  const anyLive = Object.values(races).some(isLive);
  const anyResults =
    features.results && Object.values(races).some((r) => r.mode === 'results');

  const summary = useMemo(
    () => summarize(races, state.chamber, state.sourceId, HOUSE_DISTRICT_COUNT),
    [races, state.chamber, state.sourceId]
  );
  const forecast = useMemo(
    () => forecastFor(races, state.chamber, state.sourceId, summary.seatsUp),
    [races, state.chamber, state.sourceId, summary.seatsUp]
  );
  // Whoever the certified feed is, once results are live.
  const resultsProvider = Object.values(races).find((r) => r.results?.providerId)?.results?.providerId;
  const resultsSource = resultsProvider ? resultsLabel(resultsProvider) : undefined;
  const called = summary.calledDem + summary.calledRep;

  const zoomedRace = state.zoomedId ? races[state.zoomedId] : undefined;

  /* Trust picks for the chamber on screen: stateId -> sourceId. The map
     resolves each state as pick-first, global-source second; the aggregate
     totals in the eyebrow deliberately stay on the global source only —
     mixing providers inside one sum would make the number mean nothing.
     [ASSUMPTION flagged for product review.] */
  const trustPicks = useMemo(
    () => (features.trustPicks ? picksForChamber(state.trust, state.chamber) : {}),
    [state.trust, state.chamber, features.trustPicks]
  );

  /* The page keeps scrolling behind the panel (design decision Sep 2026).
     Opening a state still brings the card into view — the panel is anchored
     inside it, so opening while the card is half past the viewport would
     strand its header above the fold — but nothing freezes afterwards.
     Scrolling over the panel scrolls the panel (overscroll-behavior: contain
     on .drawer-scroll keeps it from chaining to the page); scrolling
     anywhere else scrolls the page, as it would with no panel open.

     REVIEW: the panel still carries role="dialog" aria-modal="true" and the
     focus trap in RacePanel. With the page reachable behind it, that pairing
     is no longer coherent — a non-modal panel should not trap Tab. Parked
     deliberately, pending a call on the panel's semantics; useScrollLock is
     left in the tree for the same reason. */
  useEffect(() => {
    if (!state.zoomedId) return;
    const NAV_H = 64;
    const card = document.querySelector('.map-card');
    if (!card || card.getBoundingClientRect().height > window.innerHeight - NAV_H) return;
    const r = card.getBoundingClientRect();
    if (r.top >= NAV_H - 1 && r.bottom <= window.innerHeight + 1) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  }, [state.zoomedId]);
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
  /* One entry point for every race switch — the header tabs and the panel
     tabs are the same component and now the same handler, so behavior and
     analytics cannot diverge. */
  const selectChamber = (chamber: Chamber, via: 'header' | 'panel') => {
    if (chamber === state.chamber) return;
    track('race_change', { race: chamber, from: state.chamber, via });
    dispatch({ type: 'SET_CHAMBER', chamber });
  };

  const navigateState = (stateId: string) => {
    dispatch({ type: 'ZOOM_STATE', stateId });
    emitMapEvent('usmap-select', { stateId, chamber: state.chamber });
  };

  // Race-tag hovercards hand off here: switch to the tag's chamber, bring
  // the map into view, THEN zoom the state. Order matters now that the
  // drawer locks page scroll — opening it mid-flight would freeze the smooth
  // scroll halfway to the map.
  const openMapTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(openMapTimer.current), []);
  useEffect(() => {
    const onOpenMap = (e: Event) => {
      const { stateId, chamber } = (e as CustomEvent<{ stateId?: string; chamber?: Chamber }>)
        .detail ?? {};
      if (!stateId) return;
      if (chamber && chamber !== state.chamber) dispatch({ type: 'SET_CHAMBER', chamber });
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document
        .querySelector('.map-card')
        ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      const open = () => {
        dispatch({ type: 'ZOOM_STATE', stateId });
        emitMapEvent('usmap-select', { stateId, chamber: chamber ?? state.chamber });
      };
      window.clearTimeout(openMapTimer.current);
      if (reduced) open();
      else openMapTimer.current = window.setTimeout(open, 520);
    };
    window.addEventListener('dw-open-map', onOpenMap);
    return () => window.removeEventListener('dw-open-map', onOpenMap);
  }, [state.chamber, dispatch]);

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
      {/* The nav, and only the nav. The compact title that used to pin here
          on scroll is gone (design decision Sep 2026): with a STATIC headline
          there was nothing to keep in view, and the race selector it also
          carried now lives on the map card. */}
      <header className="site-chrome">
        <DWNav />
      </header>

      <div
        className={`app${devOpen ? ' app--dev-open' : ''}${zoomedRace ? ' app--zoomed' : ''}`}
      >
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

          {/* THE MAP SECTION: tabs, the headline they drive and the seat
              bar, then the card — which owns the map and the source that
              paints it. */}
          <section className="map-section" aria-label="Election map" ref={mapSectionRef}>
          <RaceHeader
            dotsShape={shape}
            chamber={state.chamber}
            forecast={forecast}
            resultsMode={anyResults}
            called={called}
            raceCount={Object.keys(races).length}
          />

          {/* OPTION 3: the still arc between the seat line and the map —
              the chamber's seats, coloured by the same projection, answering
              the pointer the way the dots did, on no scroll. */}
          {IS_OPTION3 && <Hemicycle forecast={forecast} chamber={state.chamber} still />}

          <MapCard
            races={races}
            chamber={state.chamber}
            sourceId={state.sourceId}
            trust={trustPicks}
            selectedId={state.selectedId}
            zoomedId={state.zoomedId}
            staggering={state.staggering}
            flash={state.flash}
            resultsMode={anyResults}
            resultsSource={resultsSource}
            onChamber={(chamber) => selectChamber(chamber, 'header')}
            onSource={(sourceId) => dispatch({ type: 'SET_SOURCE', sourceId })}
            onSelect={handleSelect}
            onZoom={(stateId) => {
              dispatch({ type: 'ZOOM_STATE', stateId });
              emitMapEvent('usmap-select', { stateId, chamber: state.chamber });
            }}
            onClearZoom={() => dispatch({ type: 'CLEAR_ZOOM' })}
            panel={
              zoomedRace && prevState && nextState ? (
                <RacePanel
                  key={zoomedRace.id}
                  stateName={zoomedName}
                  race={zoomedRace}
                  sourceId={state.sourceId}
                  prev={prevState}
                  next={nextState}
                  showFollow={features.followState}
                  showDistricts={features.zoomDepth}
                  onChamber={(c) => selectChamber(c, 'panel')}
                  racesByChamber={Object.fromEntries(
                    CHAMBERS.flatMap((c) => {
                      const r = state.ballot[c][zoomedRace.id];
                      return r ? [[c, r]] : [];
                    })
                  )}
                  onNavigate={navigateState}
                  onClose={() => dispatch({ type: 'CLEAR_ZOOM' })}
                />
              ) : null
            }
          />

          {/* CREATIVE EDITION (option 2): House Colors, the Capitol in the
              chamber's split, right after the map (moved Sep 18 2026). */}
          {isOption2 && extras.capitol && <HouseColors forecast={forecast} />}

          {/* R3 + R53: every seat of the chamber in a hemicycle, and the
              projected Republican count, under the map. The Race/Source
              pills stay pinned through here (the gate watches the section). */}
          {IS_CREATIVE && !IS_OPTION3 && (
            <Hemicycle forecast={forecast} chamber={state.chamber} />
          )}

          {/* OPTION 3: the banner belongs to the section, so the pinned
              timer and controls stay through it (the gate watches the
              section). */}
          {IS_OPTION3 && <PlanBanner />}
          </section>

          {/* CREATIVE EDITION (option 2): the Cosmos Waveform and "The
              Nation Speaks", after the arc and before the feed (Sep 18 2026). */}
          {isOption2 && extras.nation && <NationSpeaks />}

          {/* OPTIONS 2 and 3: the chapter rail down the left edge. */}
          {IS_OPTION3 && <ChapterRail option={3} />}
          {isOption2 && <ChapterRail option={2} />}

          {/* The boundary between map and feed is now editorial, not chromatic:
              the plan banner sits where the surface-step used to be. */}
          {!IS_OPTION3 && <PlanBanner />}

          <CoverageFeed />

          {/* Race calls, cutover notices and control changes are announced politely. */}
          <div aria-live="polite" className="visually-hidden">
            {state.announcement}
          </div>
        </main>

        {/* Preview chrome hides inside the framed copy. */}
        {!IS_PREVIEW_FRAME && features.results && (
          <DevToolbar
            state={state}
            dispatch={dispatch}
            onRunPollClosings={runPollClosings}
            open={devOpen}
            onToggle={setDevOpen}
          />
        )}
        <OptionSwitcher extras={extras} onExtras={onExtras} shape={shape} onShape={onShape} />
        <ThemeToggle />
      </div>

      {/* Full-bleed: the footer runs edge to edge with its own inner rail. */}
      <SiteFooter />

      {/* Fixed to the bottom edge; last in the DOM so it stays out of the
          reading order. */}
      <PolymarketTicker />

    </>
  );
}
