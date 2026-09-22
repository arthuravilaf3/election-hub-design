/**
 * The stream — the anchor of the night (PRD: "live video stream, primary
 * visual weight").
 *
 * Built to DW 3.0 Source of Truth, "Desktop - Default" 11123:6768 (Sep 22
 * 2026): the video frame at 912x502 with 8px radius and the two burnt-in
 * watermarks, then the text block INSET 56px from the video's left edge —
 * status line, heading, show · date, dek — and the three share circles 28px
 * wide, 12px apart, at the foot.
 *
 * MOCK: a poster, not a video element. Nothing here plays.
 *
 * WHAT THE FILE DOES NOT DRAW. The file shows a clean frame, so the controls
 * are a small cluster top-right (captions and the persistent player are P1/P2
 * in the PRD and have to be visible somewhere), and the viewer count rides the
 * status line below rather than a bar over the picture.
 *
 * Status is TEXT + ICON, never colour alone (hub a11y rule) — the dot is
 * decoration on top of the word "Live", not the carrier of it.
 */
import { STREAM } from './homeContent';

const STATUS: Record<'live' | 'upcoming' | 'ended', { label: string; icon: 'dot' | 'clock' | 'replay' }> = {
  live: { label: 'Live', icon: 'dot' },
  upcoming: { label: 'Upcoming', icon: 'clock' },
  ended: { label: 'Replay', icon: 'replay' },
};

function StatusIcon({ kind }: { kind: 'dot' | 'clock' | 'replay' }) {
  if (kind === 'dot') return <span className="en-status-dot" aria-hidden="true" />;
  if (kind === 'clock') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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

/* The file's three circles: Facebook blue, X black, send on a light chip. */
const SHARE: Array<{ id: string; label: string; path: React.ReactNode }> = [
  { id: 'fb', label: 'Share on Facebook', path: <path d="M15.2 9.6h1.8V7.2h-1.8c-1.6 0-2.9 1.3-2.9 2.9v1.3h-1.6v2.4h1.6v5h2.4v-5h1.8l.5-2.4h-2.3v-1.3c0-.3.2-.5.5-.5Z" fill="currentColor" /> },
  { id: 'x', label: 'Share on X', path: <path d="M8.4 7.8 12.6 13 8.6 18.2h1.4l3.3-4.3 3.2 4.3h3.1l-4.2-5.4 3.8-5h-1.4l-3 3.9-2.9-3.9H8.4Z" fill="currentColor" /> },
  { id: 'send', label: 'Send', path: <path d="M20 7 6.5 12.8l4.8 1.9 1.9 4.8L20 7Z" fill="currentColor" /> },
];

export function LivePlayer() {
  const status = STATUS[STREAM.status];
  const viewers = new Intl.NumberFormat('en-US').format(STREAM.viewers);

  return (
    <div className="en-player">
      <div className="en-stage">
        <img className="en-poster" src={STREAM.poster} alt="" />
        <span className="en-mark en-mark--dw">
          DAILY WIRE<i aria-hidden="true">+</i>
        </span>
        <span className="en-mark en-mark--show">ELECTION NIGHT</span>

        <div className="en-controls">
          {CONTROLS.map((c) => (
            <button key={c.id} type="button" className="en-ctrl" aria-label={c.label} title={c.label}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {c.path}
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="en-text">
        <p className="en-status">
          <StatusIcon kind={status.icon} />
          {status.label}
          <span className="en-viewers">{viewers} watching</span>
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
            <button
              key={s.id}
              type="button"
              className={`en-share-btn en-share-btn--${s.id}`}
              aria-label={s.label}
              title={s.label}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <g transform="translate(2 2)">{s.path}</g>
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
