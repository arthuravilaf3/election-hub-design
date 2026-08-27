/**
 * The page header, above the map card: race tabs first, then the headline
 * they drive, its byline, and the seat bar.
 *
 * The tabs come FIRST because the title is their consequence — switching to
 * Senate rewrites the sentence directly below the control that changed it.
 * Only the source selector stays inside the map card; everything that reads
 * as page-level copy lives up here.
 *
 * Heading semantics: the visible headline changes on every interaction, so a
 * stable, visually-hidden h1 carries the document's identity (and matches the
 * browser tab), while the headline itself is an h2 at page-title scale.
 */
import { Countdown } from './Countdown';
import { RaceTabs } from './RaceTabs';
import type { ForecastData } from '../data/hero';
import type { Chamber } from '../data/types';

/** Document-level title, mirrored in <title>. */
export const PAGE_TITLE = '2026 Midterms';

/** Splits the headline so the figure it is about can carry the bold weight
 *  (DS mock: statement in regular, the number in bold). */
function Statement({ text, emphasis }: { text: string; emphasis?: string }) {
  const at = emphasis ? text.indexOf(emphasis) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong>{emphasis}</strong>
      {text.slice(at + emphasis!.length)}
    </>
  );
}

interface RaceHeaderProps {
  chamber: Chamber;
  statement: string;
  byline: string;
  forecast: ForecastData;
  resultsMode: boolean;
  /** Races already called — the seat bar's tail in results mode. */
  called: number;
  onChamber: (chamber: Chamber) => void;
}

export function RaceHeader({
  chamber,
  statement,
  byline,
  forecast,
  resultsMode,
  called,
  onChamber,
}: RaceHeaderProps) {
  return (
    <header className="race-header">
      <h1 className="visually-hidden">{PAGE_TITLE}</h1>

      {/* Days to Election Day — the hub's clock, above the controls. */}
      <Countdown />

      <RaceTabs
        chamber={chamber}
        controls="map-region"
        label="Race"
        className="race-tabs--header"
        onChamber={onChamber}
      />

      {/* Headline and byline are ONE block: they are recalculated together,
          so they crossfade together (the key remounts them). */}
      <div className="race-statement" key={`${chamber}:${byline}`}>
        <h2 className="race-title">
          <Statement text={statement} emphasis={forecast.emphasis} />
        </h2>
        <p className="race-byline">{byline}</p>
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
 * races still in play, Republican bloc. The numbers hang off the bar's own
 * ends and the count line sits under the gap, so the row reads as one object
 * instead of three floating labels.
 */
export function SeatBar({ forecast, resultsMode, called }: SeatBarProps) {
  const gap = forecast.tossupShare;
  const dem = Math.max(0, forecast.demShare - gap / 2);
  const rep = Math.max(0, 100 - dem - gap);
  const mid = dem + gap / 2;
  const tail = resultsMode
    ? `${called} called`
    : `${forecast.tossups} toss-up${forecast.tossups === 1 ? '' : 's'}`;

  return (
    <div className="seat-bar">
      <span className="seat-bar-end seat-bar-dem-num">
        {forecast.dem} <abbr title="Democrats">D</abbr>
      </span>
      <div className="seat-bar-mid-col">
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
        {/* Anchored under the gap — the boundary the count is about. */}
        <p className="seat-bar-count" style={{ left: `${mid}%` }}>
          {forecast.seatsUp} seats up · {tail}
        </p>
      </div>
      <span className="seat-bar-end seat-bar-rep-num">
        {forecast.rep} <abbr title="Republicans">R</abbr>
      </span>
    </div>
  );
}

/**
 * The pinned bar, once the real header scrolls under the nav: the headline
 * AND the race tabs. The tabs come along because the reader who has scrolled
 * to the map still wants to switch races without scrolling back up — and the
 * whole bar leaves together when the map section ends.
 *
 * Its tabs carry their own id prefix: two tablists for the same state must
 * not share element ids.
 */
export function CompactHeader({
  title,
  chamber,
  onChamber,
}: {
  title: string;
  chamber: Chamber;
  onChamber: (chamber: Chamber) => void;
}) {
  return (
    <div className="compact-header">
      <p className="compact-title">{title}</p>
      <RaceTabs
        chamber={chamber}
        controls="map-region"
        idPrefix="compact-race-tab"
        label="Race"
        className="race-tabs--compact"
        onChamber={onChamber}
      />
    </div>
  );
}
