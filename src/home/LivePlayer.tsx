/**
 * The stream — the anchor of the night (PRD: "live video stream, primary
 * visual weight"). Redrawn from the DW+ watch page Arthur sent (Sep 22 2026):
 * 16:9 frame, the status/title/meta/dek block beneath it, share row at the
 * foot, chat alongside.
 *
 * MOCK: a poster, not a video element. Nothing here plays.
 *
 * Status is TEXT + ICON, never colour alone (hub a11y rule) — the red dot is
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

/* Tabler-style glyphs at 18px, matching the nav's stroke weight. */
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

const SHARE: Array<{ id: string; label: string; path: React.ReactNode }> = [
  { id: 'fb', label: 'Share on Facebook', path: <path d="M13.5 8.5h2V6h-2c-1.7 0-3 1.3-3 3v1.5H9V13h1.5v5H13v-5h2l.5-2.5H13V9c0-.3.2-.5.5-.5Z" fill="currentColor" /> },
  { id: 'x', label: 'Share on X', path: <path d="M7 6.5 11.4 12 7.2 17.5h1.5l3.4-4.5 3.4 4.5H18l-4.4-5.7L17.6 6.5h-1.5l-3.1 4.1-3.1-4.1H7Z" fill="currentColor" /> },
  { id: 'send', label: 'Send', path: <path d="M19 5 5 11l5 2 2 5 7-13Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /> },
];

export function LivePlayer() {
  const status = STATUS[STREAM.status];
  const viewers = new Intl.NumberFormat('en-US').format(STREAM.viewers);

  return (
    <div className="en-player">
      <div className="en-stage">
        <img className="en-poster" src={STREAM.poster} alt="" />
        {/* The two watermarks the real player burns in. They own the bottom
            edge, so the status and the controls take the top one. */}
        <span className="en-mark en-mark--dw">DAILYWIRE+</span>
        <span className="en-mark en-mark--show">ELECTION NIGHT</span>

        <div className="en-controls">
          <span className="en-pill">
            <StatusIcon kind={status.icon} />
            {status.label}
          </span>
          <span className="en-viewers">{viewers} watching</span>
          <span className="en-controls-spacer" />
          {CONTROLS.map((c) => (
            <button key={c.id} type="button" className="en-ctrl" aria-label={c.label} title={c.label}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {c.path}
              </svg>
            </button>
          ))}
        </div>
      </div>

      <p className="en-status">
        <StatusIcon kind={status.icon} />
        {status.label}
      </p>
      <h2 className="en-title">{STREAM.title}</h2>
      <p className="en-meta">
        {STREAM.show} <span aria-hidden="true">·</span> {STREAM.date}
      </p>
      <p className="en-dek">{STREAM.dek}</p>

      <div className="en-share">
        {SHARE.map((s) => (
          <button key={s.id} type="button" className="en-share-btn" aria-label={s.label} title={s.label}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {s.path}
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
