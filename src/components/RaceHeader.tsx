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
import { useEffect, useRef } from 'react';
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

      {/* Keyed on the filters so every race/source change replays the entry
          sweep — the dots come in from nothing, per the motion reference. */}
      <Dots
        key={`${chamber}:${resultsMode ? 'results' : sourceId}`}
        forecast={forecast}
        chamber={chamber}
        headline={headline}
        resultsMode={resultsMode}
        called={called}
      />
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
/* Columns per chamber, so the grid always spans the comp's 808px and a
   smaller body gets bigger dots: 435 seats at 29 across (24px), 100 at 15
   across (48px, per the Senate comp), governorships at 12 across. The mobile
   pair keeps the same idea on a 358px card. */
const DOT_GRID: Record<Chamber, { cols: number; gap: number; colsM: number; gapM: number }> = {
  house: { cols: 29, gap: 4, colsM: 20, gapM: 3 },
  senate: { cols: 15, gap: 6, colsM: 10, gapM: 4 },
  governor: { cols: 12, gap: 8, colsM: 9, gapM: 4 },
};

function Dots({ forecast, chamber, headline, resultsMode, called }: DotsProps) {
  const total = forecast.dem + forecast.rep;
  const grid = DOT_GRID[chamber];

  /* HOVER GOO. A dot the pointer crosses grows for a moment; the SVG goo
     filter on the grid fuses anything that overlaps, so the dots you swept
     over melt into one another and let go again as they shrink back (the
     reference screenshot). Imperative on purpose: a 435-item re-render per
     pointer move is the wrong tool, a class and a timer per dot is the
     right one. Dots at rest never touch — the filter's threshold is tuned
     to leave the 4px gap alone. */
  const timers = useRef(new Map<Element, number>());
  useEffect(() => {
    const t = timers.current;
    return () => {
      for (const id of t.values()) window.clearTimeout(id);
      t.clear();
    };
  }, []);
  /* The goo filter is on the GRID only while some dot is hot. At rest the
     filter's alpha threshold would leave faint nubs on otherwise perfect
     circles; switching it off between hovers keeps them perfect. */
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dot = (e.target as HTMLElement).closest?.('.dot');
    if (!dot) return;
    const gridEl = e.currentTarget;
    dot.classList.add('is-goo');
    gridEl.classList.add('is-gooing');
    const prev = timers.current.get(dot);
    if (prev) window.clearTimeout(prev);
    timers.current.set(
      dot,
      window.setTimeout(() => {
        dot.classList.remove('is-goo');
        timers.current.delete(dot);
        if (timers.current.size === 0) gridEl.classList.remove('is-gooing');
      }, 520)
    );
  };
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
        style={
          {
            '--dot-cols': grid.cols,
            '--dot-gap': `${grid.gap}px`,
            '--dot-cols-m': grid.colsM,
            '--dot-gap-m': `${grid.gapM}px`,
          } as React.CSSProperties
        }
        role="img"
        aria-label={`Current seats: Democrats ${forecast.dem}, Republicans ${forecast.rep}, of ${total}. ${forecast.seatsUp} seats up, ${tail}.`}
        onPointerMove={onPointerMove}
      >
        {/* --i drives the entry stagger: a sweep across the grid in reading
            order, each dot a hair after the last. */}
        {seats.map((party, i) => (
          <span key={i} className={`dot dot--${party}`} style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>
      {/* The goo filter: blur, then push alpha through a steep contrast so
          two blurred shapes that overlap read as one solid one. Sized so a
          resting 4px gap stays a gap. */}
      <svg className="dots-goo-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="dots-goo">
            {/* Small blur + hard threshold: only circles that actually overlap
                fuse, and the neck between them stays thin. */}
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -12" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
    </section>
  );
}
