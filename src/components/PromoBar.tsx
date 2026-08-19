// The purple Prediction Game promo bar (Figma: #9527AE, 36px). Lives in the
// sticky chrome; the App hides it while scrolling down and reveals it on
// scroll up. It is promo chrome — it must never block the page (no sticky
// focus, no modal behavior).
export function PromoBar() {
  return (
    <div className="promo-bar">
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
    </div>
  );
}
