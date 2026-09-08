/**
 * The top of the page (redesign Sep 2026, "Map Final"): the hub header, then
 * the dots block. The map card and the feed follow unchanged.
 *
 * Header — "The Midterms" with the '26 dot-matrix mark beside it, a
 * "Presented by <source> · Updated <when>" line under it, and the Election
 * Day countdown on the right. This replaces the static sentence headline and
 * the freshness-only line: the source is named again, up top, because the
 * comp names it.
 *
 * Dots — the forecast read in its short form beside a waffle of every seat
 * in the chamber, one dot per seat, coloured by party. This replaces the
 * seat bar. The ENCODING is the bar's, dot for pixel: the same three shares
 * (dem / the neutral toss-up gap / rep) laid out as a grid instead of a
 * track, so a race switch recolours exactly what the bar used to resize.
 */
import { Countdown } from './Countdown';
import { asset } from '../data/assets';
import type { ForecastData } from '../data/hero';
import { sourceLabel } from '../data/sources';
import type { Chamber } from '../data/types';

/** Document-level title, mirrored in <title>. */
export const PAGE_TITLE = '2026 Midterms';

/** Providers that ship a wordmark in public/logos; the rest are set as text. */
const SOURCE_LOGO: Record<string, string> = {
  kalshi: 'logos/kalshi.svg',
  polymarket: 'logos/polymarket.svg',
};

interface RaceHeaderProps {
  chamber: Chamber;
  forecast: ForecastData;
  /** Which provider's numbers the page is showing right now. */
  sourceId: string;
  resultsMode: boolean;
  /** The certified feed, once results are live. */
  resultsSource?: string;
  /** Races already called — the statement's subject in results mode. */
  called: number;
  /** Total races in the chamber view, for the results statement. */
  raceCount: number;
}

export function RaceHeader({
  chamber,
  forecast,
  sourceId,
  resultsMode,
  resultsSource,
  called,
  raceCount,
}: RaceHeaderProps) {
  const presenter = resultsMode ? (resultsSource ?? 'the certified feed') : sourceLabel(sourceId);
  const logo = resultsMode ? undefined : SOURCE_LOGO[sourceId];
  const headline = resultsMode ? `${called} of ${raceCount} races called` : forecast.headline;

  return (
    <>
      <header className="hub-header">
        <div className="hub-brand">
          <h1 className="hub-title">
            The Midterms
            {/* The '26 mark completes the name — it is part of the heading,
                so its alt is the year the type is not spelling out. */}
            <img className="hub-mark" src={asset('logos/midterms-26.svg')} alt="'26" />
          </h1>
          <p className="hub-byline">
            <span className="hub-presented">
              <em>Presented by</em>
              {logo ? (
                <img className="hub-logo" src={asset(logo)} alt={presenter} />
              ) : (
                <b className="hub-presenter">{presenter}</b>
              )}
            </span>
            {(forecast.updated || resultsMode) && (
              <>
                <span className="hub-dot" aria-hidden="true">
                  •
                </span>
                <span className="hub-updated">
                  {resultsMode ? 'Updating live' : `Updated ${forecast.updated}`}
                </span>
              </>
            )}
          </p>
        </div>
        <Countdown />
      </header>

      <Dots forecast={forecast} chamber={chamber} headline={headline} resultsMode={resultsMode} called={called} />
    </>
  );
}

interface DotsProps {
  forecast: ForecastData;
  chamber: Chamber;
  headline: string;
  resultsMode: boolean;
  called: number;
}

/**
 * One dot per seat. Reproduces the seat bar's split exactly — dem bloc, the
 * neutral gap for the races still in play, rep bloc — as counts of the
 * chamber's seats rather than percentages of a track. Reading order is the
 * comp's: Republican dots first, from the top; Democratic dots fill from the
 * bottom; the contested seats sit where the two meet.
 */
function Dots({ forecast, chamber, headline, resultsMode, called }: DotsProps) {
  const total = forecast.dem + forecast.rep;
  const gap = forecast.tossupShare;
  const demShare = Math.max(0, forecast.demShare - gap / 2);
  const dem = Math.round((total * demShare) / 100);
  const toss = Math.round((total * gap) / 100);
  const rep = Math.max(0, total - dem - toss);
  const tail = resultsMode
    ? `${called} called`
    : `${forecast.tossups} toss-up${forecast.tossups === 1 ? '' : 's'}`;
  const body = chamber === 'governor' ? 'governorships' : chamber === 'house' ? 'House' : 'Senate';

  const seats: Array<'rep' | 'toss' | 'dem'> = [
    ...Array<'rep'>(rep).fill('rep'),
    ...Array<'toss'>(toss).fill('toss'),
    ...Array<'dem'>(dem).fill('dem'),
  ];

  return (
    <section className="dots" aria-label={`${body} forecast`}>
      {/* Keyed on the headline so a race switch crossfades the copy, the way
          the old statement did. */}
      <div className="dots-copy" key={headline}>
        <h2 className="dots-title">{headline}</h2>
        <p className="dots-seats">
          <span>
            <b className="dots-num dots-num--dem">{forecast.dem}</b> democrat seats
          </span>
          <span className="hub-dot" aria-hidden="true">
            •
          </span>
          <span>
            <b className="dots-num dots-num--rep">{forecast.rep}</b> republican seats
          </span>
        </p>
      </div>

      {/* The grid is one image to assistive tech — 435 list items would be
          noise. The sentence is the seat bar's, unchanged. */}
      <div
        className="dots-grid"
        role="img"
        aria-label={`Current seats: Democrats ${forecast.dem}, Republicans ${forecast.rep}, of ${total}. ${forecast.seatsUp} seats up, ${tail}.`}
      >
        {seats.map((party, i) => (
          <span key={i} className={`dot dot--${party}`} />
        ))}
      </div>
    </section>
  );
}
