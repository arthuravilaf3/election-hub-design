// Mobile preview toggle: opens the SAME app inside a phone-sized iframe
// (390px viewport), so the real `@media (max-width: 700px)` styles and the
// narrow-mode JS flags kick in exactly as they would on a device — no
// browser resizing needed. The framed copy runs its own state (it is a
// second visit, like any device preview tool).
import { useEffect, useState } from 'react';
import { track } from '../data/analytics';

/** The framed copy hides preview chrome (its own toggle + dev toolbar). */
export const IS_PREVIEW_FRAME = new URLSearchParams(window.location.search).has('mobilepreview');

function previewUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.set('mobilepreview', '');
  return url.toString();
}

export function MobilePreview() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (IS_PREVIEW_FRAME) return null;

  return (
    <>
      <button
        type="button"
        className="mobile-toggle"
        aria-label={open ? 'Close mobile preview' : 'Preview the mobile version'}
        aria-pressed={open}
        onClick={() => {
          setOpen((v) => !v);
          track('mobile_preview_toggle', { open: !open });
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect
            x="4.5"
            y="1.75"
            width="9"
            height="14.5"
            rx="2.2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M7.6 14h2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="mobile-overlay" role="dialog" aria-label="Mobile preview">
          {/* The backdrop is a real button, so closing by clicking outside
              the frame is keyboard-reachable too (Escape works as well). */}
          <button
            type="button"
            className="mobile-overlay-backdrop"
            aria-label="Close mobile preview"
            onClick={() => setOpen(false)}
          />
          <div className="mobile-frame">
            <iframe src={previewUrl()} title="Mobile preview (390px viewport)" />
          </div>
        </div>
      )}
    </>
  );
}
