interface CutoverBannerProps {
  text: string;
  onDismiss: () => void;
}

/** Non-blocking notice shown when live results replace predictions.
 *  role="status" announces politely without stealing focus; it also
 *  auto-dismisses (see useElectionData). */
export function CutoverBanner({ text, onDismiss }: CutoverBannerProps) {
  return (
    <div className="cutover-banner" role="status">
      <span>{text}</span>
      <button type="button" className="cutover-banner-close" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
