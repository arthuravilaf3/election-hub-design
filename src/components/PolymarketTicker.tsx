// The Polymarket politics ticker (Sep 2026): a third-party embed pinned to
// the bottom of the viewport, under the RACE/SOURCE pills. Everything about
// it — content, motion, theme — belongs to the embed; this file only places
// it. It needs the network: in the packed single-file build it loads from
// ticker.polymarket.com like any other external resource.
export function PolymarketTicker() {
  return (
    <aside className="poly-ticker" aria-label="Polymarket politics ticker">
      <iframe
        src="https://ticker.polymarket.com/embed?category=Politics&theme=dark&speed=1&displayMode=classic&height=68"
        title="Polymarket politics ticker"
        width="100%"
        height="68"
        scrolling="no"
        loading="lazy"
      />
    </aside>
  );
}
