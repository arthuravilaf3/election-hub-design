import { useEffect } from 'react';

/**
 * One-time flash when a race is called (or on external usmap-flash command).
 * Native WAAPI: fire-and-forget, auto-cleans up, and doesn't fight React's
 * declarative fill (the CSS hardening transition runs underneath it).
 */
export function useFlash(
  flash: { stateId: string; nonce: number } | null,
  getEl: (id: string) => SVGPathElement | null
) {
  useEffect(() => {
    if (!flash) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = getEl(flash.stateId);
    el?.animate(
      [
        { filter: 'brightness(1)' },
        { filter: 'brightness(1.9) saturate(1.25)', offset: 0.22 },
        { filter: 'brightness(1)' },
      ],
      { duration: 750, easing: 'ease-out' }
    );
  }, [flash, getEl]);
}
