/**
 * Page-scroll lock for the state drawer/modal: while it is open the page
 * behind holds still, so a scroll gesture belongs to the drawer's own
 * content and reading is never disturbed.
 *
 * Technique: overflow:hidden on <body> — not on <html>, and not
 * position:fixed. Both of those break the sticky chrome:
 *   - fixed body: sticky resolves against a scrollport that is no longer
 *     scrolled, so the nav drops out of view the moment the lock lands;
 *   - hidden html: body itself becomes the scroll container, so the nav's
 *     scrollport is a box that never scrolls — it un-sticks and scrolls away.
 * Body's overflow PROPAGATES to the viewport (html stays visible), which
 * clips the page without making body a scroll container: no user scrolling,
 * scroll offset kept, sticky chrome still pinned.
 *
 * The classic-scrollbar gutter (0 under macOS overlay scrollbars) is handed
 * to CSS as a custom property, so the page cannot jump sideways when the bar
 * disappears.
 */
import { useEffect } from 'react';

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.setProperty('--scroll-lock-gutter', `${gutter}px`);
    document.body.classList.add('is-scroll-locked');

    // overflow:hidden stops WHEEL and drag; it does not stop PROGRAMMATIC
    // scrolling — and the browser scrolls a focused element into view. So
    // the offset is re-pinned: while the modal is up, the page is exactly
    // where it was, whatever asks otherwise.
    const y = window.scrollY;
    const repin = () => {
      if (window.scrollY !== y) window.scrollTo(0, y);
    };
    window.addEventListener('scroll', repin);

    return () => {
      window.removeEventListener('scroll', repin);
      document.body.classList.remove('is-scroll-locked');
      document.body.style.removeProperty('--scroll-lock-gutter');
    };
  }, [locked]);
}
