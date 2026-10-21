/**
 * The results dock — the night's results, fixed to the bottom of the window
 * (Oct 9 2026: "talvez até deixar sticky na página com a opção de fechar").
 *
 * It replaces the Sep 22 "no fixed ticker" call for this page, and since the
 * same day's later round it is the ONLY results surface on the home: the big
 * panel under the stream came out ("o banner grande que não é fixo"), so the
 * dock is always up from the first paint. The seat lines come from the same
 * reducer as the hub's map; the full map is one primary CTA away.
 *
 * Every number on screen carries its source and freshness (hub rule), so the
 * dock names the provider and the last batch, and says so louder when the
 * feed stalls.
 *
 * Closing it is remembered for the visit (sessionStorage, guarded: a private
 * window simply shows it again on the next load).
 *
 * A11Y: a complementary landmark with its own name; no live region — the race
 * calls are already announced once by the page.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CHAMBERS, HUB_URL, SeatBar, chamberSeats } from './ResultsBand';
import { resultsLabel } from '../data/sources';
import { formatET } from '../data/time';
import type { ElectionState } from '../state/electionReducer';

const DISMISSED_KEY = 'dw-home-dock-closed';

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function ResultsDock({ state }: { state: ElectionState }) {
  const [dismissed, setDismissed] = useState(readDismissed);
  const shown = !dismissed;

  /* The prototype's own chrome (night clock, DEV corner, the chat's Join
     button) sits on the same bottom edge; it reads this to step up.
     --dock-h is MEASURED, not declared: the bar's height moves with its
     padding, with the breakpoint and with whether a chamber has been won,
     and a hand-written number goes stale the first time any of those change
     (it already had). The CSS keeps a value for the first paint. */
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    const node = ref.current;
    if (!shown || !node) {
      delete root.dataset.dock;
      root.style.removeProperty('--dock-h');
      return;
    }
    root.dataset.dock = 'on';
    const measure = () => root.style.setProperty('--dock-h', `${node.offsetHeight}px`);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => {
      ro.disconnect();
      delete root.dataset.dock;
      root.style.removeProperty('--dock-h');
    };
  }, [shown]);

  /* On a phone the bar closes the way a sheet does: the grab bar at its top
     is dragged down past a threshold, or tapped. It is a real <button>, so
     the keyboard and a screen reader get the same door the finger does —
     which is what lets the X go (Arthur, Oct 21). A drag that springs back
     must not also fire the tap, hence `moved`. */
  const [dragPx, setDragPx] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);
  const dragY = useRef(0);
  const moved = useRef(false);

  const onGrabDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    dragging.current = true;
    moved.current = false;
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onGrabMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;
    const dy = Math.max(0, e.clientY - startY.current);
    if (dy > 4) moved.current = true;
    dragY.current = dy;
    setDragPx(dy);
  };
  const onGrabUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const far = dragY.current > 56;
    dragY.current = 0;
    setDragPx(0);
    if (far) close();
  };

  const close = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* storage blocked: closed for this page view only */
    }
  };

  const { delayed, feedAsOf } = state.night;
  const races = state.ballot[state.chamber];
  const source = resultsLabel(Object.values(races).find((r) => r.results?.providerId)?.results?.providerId ?? '');
  const asOf = feedAsOf ? formatET(new Date(feedAsOf).getTime()) : null;

  if (!shown) return null;
  return (
    <aside
      className={`dock is-shown${dragging.current ? ' is-dragging' : ''}`}
      aria-label="Live results"
      ref={ref}
      style={dragPx ? { transform: `translateY(${dragPx}px)` } : undefined}
    >
      <div className="dock-rail">
        <button
          type="button"
          className="dock-grab"
          aria-label="Close live results bar"
          onPointerDown={onGrabDown}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabUp}
          onPointerCancel={onGrabUp}
          onClick={() => {
            if (moved.current) {
              moved.current = false;
              return;
            }
            close();
          }}
        >
          <span className="dock-grab-bar" aria-hidden="true" />
        </button>
        <div className="dock-brand">
          {/* The live tag came out on Oct 21 2026 — the dock is on screen
              only while the night is running, so a chip saying "Live" said
              what the whole bar already said. A STALLED feed is different:
              that is a state the PRD will not let go unsaid, so the source
              line names it in full where the chip used to. */}
          <span className="dock-title">The Midterms</span>
          <span className={`dock-source${delayed ? ' dock-source--delayed' : ''}`}>
            {delayed ? 'Results delayed · ' : ''}
            {source}
            {asOf ? ` · ${delayed ? 'last update' : 'updated'} ${asOf}` : ''}
          </span>
        </div>
        {/* On a phone only ONE chamber shows — both side by side came out
            cramped (Arthur, Oct 21). It is the chamber the map is on, so the
            bar and the map never disagree about what you are looking at, and
            the CTA is the way to the other one. */}
        <div className="dock-chambers" data-only={state.chamber === 'house' ? 'house' : 'senate'}>
          {CHAMBERS.map(({ id, label }) => (
            <div key={id} className="dock-chamber" data-chamber={id}>
              <SeatBar c={chamberSeats(state, id, label)} compact />
            </div>
          ))}
        </div>
        <a className="mp-btn mp-btn--primary dock-cta" href={HUB_URL}>
          Check the election hub
        </a>
        <button type="button" className="dock-close" onClick={close} aria-label="Close live results bar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
