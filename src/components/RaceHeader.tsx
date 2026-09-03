/**
 * The page header, above the map card: the countdown, the headline, the
 * freshness line, then the seat bar.
 *
 * Redesign Sep 2026 — the headline is STATIC page copy now. It used to be the
 * forecast read ("Democrats have a 61% chance of winning the House"), driven
 * by the race tabs that sat here; both are gone. The race is chosen from the
 * RACE pill over the map instead, and the forecast sentence retires with the
 * tabs that drove it.
 *
 * Heading semantics: with a stable headline, the visible line IS the h1 —
 * the old arrangement (hidden h1 + h2 at title scale) existed only because
 * the visible one changed on every interaction.
 */
import { Countdown } from './Countdown';
import type { ForecastData } from '../data/hero';

/** Document-level title, mirrored in <title>. Deliberately shorter than the
 *  visible headline: a browser tab has no room for the full sentence. */
export const PAGE_TITLE = '2026 Midterms';

/** The visible headline. */
export const PAGE_HEADLINE = '2026 Midterms Elections and Predictions.';

interface RaceHeaderProps {
  byline: string;
  forecast: ForecastData;
  resultsMode: boolean;
  /** Races already called — the seat bar's tail in results mode. */
  called: number;
}

export function RaceHeader({ byline, forecast, resultsMode, called }: RaceHeaderProps) {
  return (
    <header className="race-header">
      {/* Countdown above the headline, freshness below it. Only the freshness
          line moves, so it alone is keyed for the crossfade. */}
      <div className="race-statement">
        <Countdown />
        <h1 className="race-title">{PAGE_HEADLINE}</h1>
        <p className="race-byline" key={byline}>
          {byline}
        </p>
      </div>

      <SeatBar forecast={forecast} resultsMode={resultsMode} called={called} />
    </header>
  );
}

interface SeatBarProps {
  forecast: ForecastData;
  resultsMode: boolean;
  called: number;
}

/**
 * Current composition as one bar: Democratic bloc, a NEUTRAL gap for the
 * races still in play, Republican bloc.
 *
 * Redesign Aug 2026 — the numbers no longer hang off the bar's ends with the
 * count anchored under the gap. They are a three-up label row underneath,
 * spread end to end, with the contested middle finally named rather than
 * implied. The bar's own aria-label is unchanged and still carries the whole
 * sentence, including the "N seats up" figure the visible row drops.
 */
export function SeatBar({ forecast, resultsMode, called }: SeatBarProps) {
  const gap = forecast.tossupShare;
  const dem = Math.max(0, forecast.demShare - gap / 2);
  const rep = Math.max(0, 100 - dem - gap);
  const tail = resultsMode
    ? `${called} called`
    : `${forecast.tossups} toss-up${forecast.tossups === 1 ? '' : 's'}`;

  return (
    <div className="seat-bar">
      <div
        className="seat-bar-track"
        role="img"
        aria-label={`Current seats: Democrats ${forecast.dem}, Republicans ${forecast.rep}, of ${
          forecast.dem + forecast.rep
        }. ${forecast.seatsUp} seats up, ${tail}.`}
      >
        <span className="seat-bar-dem" style={{ width: `${dem}%` }} />
        <span className="seat-bar-gap" style={{ width: `${gap}%` }} />
        <span className="seat-bar-rep" style={{ width: `${rep}%` }} />
      </div>
      <div className="seat-bar-labels" aria-hidden="true">
        <p className="seat-bar-label">
          Democrats: <b className="seat-bar-num seat-bar-num--dem">{forecast.dem}</b>
        </p>
        <p className="seat-bar-label">
          {resultsMode ? 'Called' : 'Toss-ups'}:{' '}
          <b className="seat-bar-num">{resultsMode ? called : forecast.tossups}</b>
        </p>
        <p className="seat-bar-label">
          Republicans: <b className="seat-bar-num seat-bar-num--rep">{forecast.rep}</b>
        </p>
      </div>
    </div>
  );
}
