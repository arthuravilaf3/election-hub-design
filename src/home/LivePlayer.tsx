/**
 * The stream — the anchor of the night (PRD: "live video stream, primary
 * visual weight").
 *
 * Built to DW 3.0 Source of Truth, "Desktop - Default" 11123:6768 (Sep 22
 * 2026): the video frame at 912x502 with 8px radius, then the text block
 * under it — status line, heading, show · date, dek — and the three share
 * circles 28px wide, 12px apart, at the foot. The file's two burnt-in
 * watermarks came out on Oct 21 2026: they belong to the broadcast's own
 * picture, not to the player chrome, and a real feed carries its own.
 *
 * MOCK: a poster, not a video element. Nothing here plays.
 *
 * WHAT THE FILE DOES NOT DRAW. The file shows a clean frame, so the controls
 * are a small cluster top-right (captions and the persistent player are P1/P2
 * in the PRD and have to be visible somewhere), and the viewer count rides the
 * status line below rather than a bar over the picture.
 *
 * THE STATUS LINE IS THE DS BADGE (Oct 21 2026), the same LiveBadge the
 * results dock uses — translucid black, 4px radius, the 8px brand dot
 * pulsing while the stream is on air. It had been a bare dot and a word.
 * Status is still TEXT + ICON, never colour alone (hub a11y rule): the dot
 * is decoration on top of the word, not the carrier of it.
 *
 * FOUR STATES (Oct 8 2026, see stream.ts). Live is the frame as the file
 * draws it. The other three put one plain message over a dimmed picture —
 * when it starts, that it is reconnecting, or the replay — and swap the
 * status line under it; the title, the dek and the share row never move, so
 * the page does not jump when the broadcast changes state.
 */
import { formatET } from '../data/time';
import { LiveBadge } from './LiveBadge';
import { STREAM } from './homeContent';
import { STREAM_STARTS_MS, startsIn, type StreamStatus } from './stream';

/* The badge asks one thing of each state: is the dot on? It is on only while
   the reader is actually watching live — "Reconnecting" is the stream off the
   air, so the dot stops and the line goes to the warning tone instead. */
const STATUS: Record<StreamStatus, { label: string; dot: boolean }> = {
  live: { label: 'Live', dot: true },
  upcoming: { label: 'Upcoming', dot: false },
  interrupted: { label: 'Reconnecting', dot: false },
  ended: { label: 'Replay', dot: false },
};


const CONTROLS: Array<{ id: string; label: string; path: React.ReactNode }> = [
  {
    id: 'cc',
    label: 'Captions',
    path: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 10.2a2 2 0 1 0 0 3.6M17 10.2a2 2 0 1 0 0 3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'pip',
    label: 'Keep playing while I scroll',
    path: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="12" y="11" width="7" height="5.5" rx="1.2" fill="currentColor" />
      </>
    ),
  },
  {
    id: 'full',
    label: 'Full screen',
    path: (
      <path
        d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    ),
  },
];

/* The file's three share circles (391:150010): Facebook, X, email — 28px,
   12px apart. Real share links now (Oct 9 2026), each to the watch page;
   the glyphs are drawn on a 28px box so they sit centred in the circle. */
const SHARE_URL = 'https://www.dailywire.com/watch/election-night-2026';
const SHARE_TEXT = 'Election Night 2026: live results, race calls and analysis on DailyWire+';
const SHARE: Array<{ id: string; label: string; href: string; path: React.ReactNode }> = [
  {
    id: 'fb',
    label: 'Share on Facebook',
    href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`,
    path: <path d="M15.3 9.5H17V7h-2c-2 0-3.2 1.3-3.2 3.2V12H10v2.5h1.8V21h2.6v-6.5h2.1l.4-2.5h-2.5v-1.6c0-.6.3-.9.9-.9Z" fill="currentColor" />,
  },
  {
    id: 'x',
    label: 'Share on X',
    href: `https://x.com/intent/post?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`,
    path: <path d="M8.5 8h3.1l2.6 3.5L17.2 8h1.4l-3.8 4.3L19.5 20h-3.1l-2.9-3.9L10.1 20H8.7l4.1-4.6L8.5 8Zm2 1 6.4 10h1.1L11.6 9h-1.1Z" fill="currentColor" />,
  },
  {
    id: 'email',
    label: 'Share by email',
    href: `mailto:?subject=${encodeURIComponent(SHARE_TEXT)}&body=${encodeURIComponent(SHARE_URL)}`,
    path: (
      <>
        <rect x="8" y="9.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="m8.5 10.5 5.5 4 5.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </>
    ),
  },
];

/** What the picture says when it is not the broadcast. */
function StageMessage({ status, at }: { status: StreamStatus; at: number | null }) {
  if (status === 'upcoming') {
    return (
      <div className="en-stage-msg">
        <p className="en-stage-eyebrow">Starts at {formatET(STREAM_STARTS_MS)}</p>
        {/* Forced from the switch while the clock is already past 7, the
            countdown would read "in 0 min" and look broken. On the real night
            the state flips to live at that moment and this never shows. */}
        <p className="en-stage-big">
          {at !== null && at >= STREAM_STARTS_MS ? 'Starting soon' : startsIn(at)}
        </p>
      </div>
    );
  }
  if (status === 'interrupted') {
    return (
      <div className="en-stage-msg" role="status">
        <span className="en-spinner" aria-hidden="true" />
        <p className="en-stage-title">The stream is reconnecting</p>
        <p className="en-stage-sub">The chat and the results below keep updating.</p>
        <button type="button" className="en-stage-btn en-stage-btn--quiet">
          Try again
        </button>
      </div>
    );
  }
  return (
    <div className="en-stage-msg">
      <button type="button" className="en-stage-play" aria-label="Watch the replay">
        <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" />
        </svg>
      </button>
      <p className="en-stage-title">Watch the replay</p>
      <p className="en-stage-sub">{STREAM.replayLength} · aired Nov 3</p>
    </div>
  );
}

export function LivePlayer({ status: kind, at }: { status: StreamStatus; at: number | null }) {
  const status = STATUS[kind];
  const viewers = new Intl.NumberFormat('en-US').format(STREAM.viewers);
  const live = kind === 'live';

  return (
    <div className={`en-player en-player--${kind}`}>
      <div className="en-stage">
        <img className="en-poster" src={STREAM.poster} alt="" />

        {live ? (
          <div className="en-controls">
            {CONTROLS.map((c) => (
              <button key={c.id} type="button" className="en-ctrl" aria-label={c.label} title={c.label}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  {c.path}
                </svg>
              </button>
            ))}
          </div>
        ) : (
          <StageMessage status={kind} at={at} />
        )}
      </div>

      <div className="en-text">
        <p className={`en-status en-status--${kind}`}>
          <LiveBadge label={status.label} dot={status.dot} />
          {live && <span className="en-viewers">{viewers} watching</span>}
          {kind === 'upcoming' && <span className="en-viewers">Tonight, {formatET(STREAM_STARTS_MS)}</span>}
          {kind === 'interrupted' && <span className="en-viewers">Back in a moment</span>}
          {kind === 'ended' && <span className="en-viewers">{viewers} watched live</span>}
        </p>
        <h2 className="en-title">{STREAM.title}</h2>
        <p className="en-meta">
          <a className="en-meta-link" href="https://www.dailywire.com/watch">
            {STREAM.show}
          </a>
          <span aria-hidden="true">•</span>
          {STREAM.date}
        </p>
        <p className="en-dek">{STREAM.dek}</p>

        <div className="en-share">
          {SHARE.map((s) => (
            <a
              key={s.id}
              className={`en-share-btn en-share-btn--${s.id}`}
              href={s.href}
              target={s.id === 'email' ? undefined : '_blank'}
              rel={s.id === 'email' ? undefined : 'noopener noreferrer'}
              aria-label={s.label}
              title={s.label}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                {s.path}
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
