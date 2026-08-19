// The editorial hero (redesign Aug 2026): big headline, freshness line,
// blue/red balance bar, stats row. The compact fixed header reuses the same
// BalanceBar so hover behaves identically in both sizes.
import { useState } from 'react';
import type { HeroData } from '../data/hero';

interface BarTooltipState {
  x: number;
  y: number;
}

/**
 * The balance bar. Widths are the CURRENT seat split (a fact about the
 * sitting chamber, not a forecast). Hovering reveals the numbers — required
 * in compact mode, where the stats row is hidden.
 */
export function BalanceBar({ data, compact = false }: { data: HeroData; compact?: boolean }) {
  const [tip, setTip] = useState<BarTooltipState | null>(null);

  return (
    <>
      <div
        className={`balance-bar${compact ? ' balance-bar--compact' : ''}`}
        role="img"
        aria-label={`Current seats: Democrats ${data.dem}, Republicans ${data.rep}. ${data.seatsUp} seats up, ${data.tossups} toss-ups.`}
        onPointerMove={(e) => setTip({ x: e.clientX, y: e.clientY })}
        onPointerLeave={() => setTip(null)}
      >
        <span className="balance-dem" style={{ width: `${data.demShare}%` }} />
        <span className="balance-rep" style={{ width: `${100 - data.demShare}%` }} />
      </div>
      {tip && (
        <div
          className="map-tooltip balance-tooltip"
          style={{ left: Math.min(Math.max(tip.x - 130, 8), window.innerWidth - 268), top: Math.max(tip.y - 8, 8) }}
          role="presentation"
        >
          <p className="map-tooltip-value">
            Democrats: {data.dem} · Republicans: {data.rep}
          </p>
          <p className="map-tooltip-source">
            Seats up: {data.seatsUp} · Toss-ups: {data.tossups}
          </p>
        </div>
      )}
    </>
  );
}

export function Hero({ data }: { data: HeroData }) {
  return (
    <section className="hero" aria-label="Race outlook">
      <h1 className="hero-title">{data.title}</h1>
      <p className="hero-updated">{data.updated}</p>
      <div className="hero-bar-block">
        <BalanceBar data={data} />
        <div className="hero-stats">
          <span>Democrats: {data.dem}</span>
          <span className="hero-stats-mid">
            Seats Up: {data.seatsUp} · Toss-ups: {data.tossups}
          </span>
          <span>Republicans: {data.rep}</span>
        </div>
      </div>
    </section>
  );
}
