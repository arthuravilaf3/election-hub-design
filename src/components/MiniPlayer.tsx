/**
 * THE MINI PLAYER (Sep 25 2026), anchored bottom right: the episode the
 * reader left running, the way a video site keeps one in the corner while
 * you read on. Modelled on the YouTube corner card Arthur sent — still,
 * play button over it, elapsed / total, a scrub line, the title, and a row
 * naming what it is. Picture-in-picture on the left of the head, close on
 * the right.
 *
 * It is CHROME, not content: nothing on the page depends on it, closing it
 * is final for the session, and it never covers the page's own controls
 * (see the CSS — it sits above the theme toggle and clears the map's fixed
 * pills).
 *
 * The clock is a prototype's: a resume point that ticks while it plays, so
 * the scrub line and the figures move. There is no real media element —
 * the still is the frame.
 */
import { useEffect, useRef, useState } from 'react';
import { track } from '../data/analytics';
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

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="28" height="28">
      <path d="M8 5.5v13l11-6.5Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="28" height="28">
      <path d="M8 5h3.2v14H8zM12.8 5H16v14h-3.2z" fill="currentColor" />
    </svg>
  );
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
  /* The episode furthest down the feed that carries a runtime — "the one
     you were on", without pretending to a history we do not have. */
  const episode = ALL_ITEMS.find((i) => i.kind === 'episode' && i.duration);
  const total = episode?.duration ? seconds(episode.duration) : 0;

  const [open, setOpen] = useState(true);
  const [playing, setPlaying] = useState(false);
  // Resumed a little under half way, the way a real one would be.
  const [at, setAt] = useState(() => Math.round(total * 0.47));
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setAt((a) => Math.min(total, a + dt));
      raf.current = window.requestAnimationFrame(step);
    };
    raf.current = window.requestAnimationFrame(step);
    return () => {
      if (raf.current) window.cancelAnimationFrame(raf.current);
    };
  }, [playing, total]);

  if (!open || !episode) return null;
  const pct = total ? (at / total) * 100 : 0;

  return (
    /* A landmark of its own: it is beside the page, not inside it. */
    <aside className="mini-player" aria-label="Continue watching">
      <div className="mini-player-frame">
        <img className="mini-player-still" src={episode.imageWide} alt="" />
        <div className="mini-player-scrim" aria-hidden="true" />
        <button
          type="button"
          className="mini-player-play"
          aria-label={playing ? `Pause ${episode.headline}` : `Play ${episode.headline}`}
          onClick={() => {
            setPlaying((p) => !p);
            track('mini_player', { what: playing ? 'pause' : 'play', id: episode.id });
          }}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
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
        <p className="mini-player-time">
          {clock(at)} / {clock(total)}
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
        <p className="mini-player-meta">
          <span className="mini-player-badge" aria-hidden="true">
            DW
          </span>
          Continue watching
        </p>
      </div>
    </aside>
  );
}
