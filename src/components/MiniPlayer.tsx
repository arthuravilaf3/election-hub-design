/**
 * THE MINI PLAYER (Sep 25 2026; autoplaying since Sep 28), parked in the
 * bottom-right corner just above the Polymarket ticker: the episode the
 * reader left running, the way a video site keeps one going while you read
 * on. Picture-in-picture on the left of the head, close on the right, the
 * elapsed / total under it and a scrub line across the bottom.
 *
 * It is CHROME, not content: nothing on the page depends on it, closing it
 * is final for the session, and it never covers the page's own controls
 * (see the CSS — it clears the ticker and the map's fixed pills).
 *
 * PLACEHOLDER FOOTAGE: the loop below is one of the fixture's short clips,
 * not the episode it names. The clock is the episode's — a resume point
 * that runs while it plays — so the figures and the scrub line are the
 * episode's own running time, which is the thing being designed here.
 */
import { useEffect, useRef, useState } from 'react';
import { track } from '../data/analytics';
import { asset } from '../data/assets';
import { ALL_ITEMS } from '../data/feedItems';

/** "11:55" from seconds. */
function clock(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** "38:04" -> 2284 seconds. */
function seconds(stamp: string): number {
  const [m, s] = stamp.split(':');
  return Number(m) * 60 + Number(s || 0);
}

/** Tabler picture-in-picture, 18px at 1.5 stroke. */
function PipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="18" height="18">
      <path
        d="M11 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3M14 14h7v6h-7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="18" height="18">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function MiniPlayer() {
  /* The first episode that carries a runtime — "the one you were on",
     without pretending to a history we do not have. */
  const episode = ALL_ITEMS.find((i) => i.kind === 'episode' && i.duration);
  const total = episode?.duration ? seconds(episode.duration) : 0;

  const [open, setOpen] = useState(true);
  // Resumed a little under half way, the way a real one would be.
  const [at, setAt] = useState(() => Math.round(total * 0.47));
  const videoRef = useRef<HTMLVideoElement>(null);
  const raf = useRef<number | null>(null);

  /* It plays on its own now, so the clock runs from the first frame. The
     video element is muted because that is the only way a browser lets a
     loop start without a gesture. */
  useEffect(() => {
    if (total === 0) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setAt((a) => (a + dt >= total ? 0 : a + dt));
      raf.current = window.requestAnimationFrame(step);
    };
    raf.current = window.requestAnimationFrame(step);
    return () => {
      if (raf.current) window.cancelAnimationFrame(raf.current);
    };
  }, [total]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // React writes `muted` as an attribute, which a media element ignores
    // after creation — so autoplay would be blocked without this line.
    v.muted = true;
    void v.play().catch(() => undefined);
  }, []);

  if (!open || !episode) return null;
  const pct = total ? (at / total) * 100 : 0;

  return (
    /* A landmark of its own: it is beside the page, not inside it. */
    <aside className="mini-player" aria-label={`Playing: ${episode.headline}`}>
      <div className="mini-player-frame">
        <video
          ref={videoRef}
          className="mini-player-video"
          src={asset('shorts/short-1.webm')}
          muted
          loop
          playsInline
          autoPlay
          aria-hidden="true"
        />
        <div className="mini-player-scrim" aria-hidden="true" />
        <button type="button" className="mini-player-pip" aria-label="Open picture in picture">
          <PipIcon />
        </button>
        <button
          type="button"
          className="mini-player-close"
          aria-label="Close the player"
          onClick={() => {
            setOpen(false);
            track('mini_player', { what: 'close', id: episode.id });
          }}
        >
          <CloseIcon />
        </button>
        {/* LIVE, not a running time (Sep 28 2026). The dot pulses on the
            page's own live-pulse, the same one the header's LIVE badge
            uses, so the two never drift apart. */}
        <p className="mini-player-live">
          <span className="mini-player-live-dot" aria-hidden="true" />
          Live
        </p>
        {/* The played part of the line, in the brand's red. Not a control:
            role="progressbar" says what it is without promising a scrub. */}
        <div
          className="mini-player-track"
          role="progressbar"
          aria-label="Elapsed"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.round(at)}
          aria-valuetext={`${clock(at)} of ${clock(total)}`}
        >
          <span className="mini-player-played" style={{ width: `${pct.toFixed(2)}%` }} />
        </div>
      </div>
      <div className="mini-player-copy">
        <p className="mini-player-title">{episode.headline}</p>
      </div>
    </aside>
  );
}
