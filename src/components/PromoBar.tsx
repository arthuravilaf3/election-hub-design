// The purple Prediction Game promo bar (Figma: #9527AE, 36px). Sits in
// NORMAL page flow below the nav and scrolls away with the content (design
// decision Aug 2026 — no hide/show scroll behavior).
export function PromoBar() {
  return (
    <aside className="promo-bar" aria-label="Prediction game promotion">
      <p className="promo-copy">
        <span className="promo-dot" aria-hidden="true" />
        <strong>Do you have a crystal ball?</strong> Build your perfect prediction map
      </p>
      <a className="promo-cta" href="#prediction-game">
        Play Now
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2.5 8h10.4m0 0L8.6 3.7M12.9 8l-4.3 4.3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </aside>
  );
}
