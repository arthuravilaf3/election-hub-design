// Election plan CTA banner — lives on the boundary between the map section
// and the feed (replacing the old surface-color separation). Brand-family
// background; buttons borrow the Follow button style for now ("mudamos ele
// depois"). All copy is mock.
//
// Background is brand/600 (--brand-pressed), not brand/500: white body text
// on #DB3D3B measures 4.24:1 (under AA) — same deviation precedent as the
// nav's SIGN UP.
import { track } from '../data/analytics';

export function PlanBanner() {
  return (
    <section className="plan-banner" aria-label="DW+ election plan offer">
      <div className="plan-copy">
        <h2>Election HQ, all access.</h2>
        <p>
          Every race, every call, live results the moment they're certified — plus the full
          prediction game. Zero ads through election night.
        </p>
      </div>
      <div className="plan-actions">
        <button
          type="button"
          className="btn-follow"
          onClick={() => track('plan_banner_cta_click', { cta: 'primary' })}
        >
          Get the Election Pass
        </button>
        <button
          type="button"
          className="plan-btn-secondary"
          onClick={() => track('plan_banner_cta_click', { cta: 'secondary' })}
        >
          Learn more
        </button>
      </div>
    </section>
  );
}
