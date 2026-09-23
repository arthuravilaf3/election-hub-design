// The game's call in the hero (option 1, Sep 21 2026): a compact cousin of
// the plan banner, under the clock and flush with the foot of the dots, so
// the game is offered before the map as well as after it. Same copy, same
// tile (still the placeholder art). The button is out for now (Sep 23 2026).

export function GameCallout() {
  return (
    <aside className="game-callout" aria-label="Prediction game">
      <span className="plan-mark game-callout-mark" aria-hidden="true">
        <svg width="35" height="21" viewBox="0 0 35 21" fill="none">
          <path d="M0 3h22l-4 5H0V3Zm0 7h30l-4 5H0v-5Zm0 7h14l-3 4H0v-4Z" fill="currentColor" />
        </svg>
      </span>
      <p className="game-callout-copy">
        <b>The nation speaks.</b> Can you predict their voices?
      </p>
    </aside>
  );
}
