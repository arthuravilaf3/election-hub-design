// The Polymarket politics ticker (Sep 2026): a third-party embed pinned to
// the bottom of the viewport, under the RACE/SOURCE pills, at its 32px
// size. Everything about it — content, motion, theme — belongs to the
// embed; this file only places it. It needs the network: polymarket.com is
// DNS-blocked on some networks, where the strip renders empty.
export function PolymarketTicker() {
  return (
    <aside className="poly-ticker" aria-label="Polymarket politics ticker">
      <iframe
        src="https://ticker.polymarket.com/embed?category=Politics&theme=dark&speed=1&displayMode=classic&height=32"
        title="Polymarket politics ticker"
        width="100%"
        height="32"
        scrolling="no"
      />
    </aside>
  );
}
