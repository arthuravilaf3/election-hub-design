interface CutoverBannerProps {
  text: string;
  /** Warning = the results feed is late (election night). */
  tone?: 'info' | 'warning';
  onDismiss: () => void;
}

/** Non-blocking notice shown when live results replace predictions.
 *  role="status" announces politely without stealing focus; it also
 *  auto-dismisses (see useElectionData). */
export function CutoverBanner({ text, tone = 'info', onDismiss }: CutoverBannerProps) {
  return (
    <div className={`cutover-banner${tone === 'warning' ? ' cutover-banner--warning' : ''}`} role="status">
      <span>
        {tone === 'warning' && <span aria-hidden="true">⚠ </span>}
        {text}
      </span>
      <button type="button" className="cutover-banner-close" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
