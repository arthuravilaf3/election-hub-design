/**
 * The top of the page (redesign Sep 2026, "Map Final"): the hub header, then
 * the dots block. The map card and the feed follow unchanged.
 *
 * Header — "The Midterms" with the '26 dot-matrix mark beside it, a
 * "Presented by <source> · Updated <when>" line under it, the tagline on the
 * right, and under the hairline the live countdown to Election Day. This replaces the static sentence headline and
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
import { INTRO_AT, Letters, introDelay } from './Intro';
import { Countdown } from './Countdown';
import { asset } from '../data/assets';
import polymarketLogo from '../images/polymarketlogo.png';
import type { ForecastData } from '../data/hero';
import type { Chamber } from '../data/types';

/** Document-level title, mirrored in <title>. */
export const PAGE_TITLE = '2026 Midterms';


interface RaceHeaderProps {
  chamber: Chamber;
  forecast: ForecastData;
  resultsMode: boolean;
  /** Races already called — the statement's subject in results mode. */
  called: number;
  /** Total races in the chamber view, for the results statement. */
  raceCount: number;
}

export function RaceHeader({
  chamber,
  forecast,
  resultsMode,
  called,
  raceCount,
}: RaceHeaderProps) {
  /* The presenting sponsor is Polymarket, whatever source the map shows —
     "Presented by" is a partnership line, not a data attribution. The data
     source stays named where it lives: the SOURCE pill and the panel. */
  const headline = resultsMode ? `${called} of ${raceCount} races called` : forecast.headline;

  return (
    <>
      <header className="hub-header">
        <div className="hub-brand">
          <h1 className="hub-title">
            {/* Entrance: the letters resolve one by one out of a blur. */}
            <Letters text="The Midterms" base={INTRO_AT.title} step={26} className="hub-title-text" />
            {/* The '26 mark completes the name — it is part of the heading,
                so its alt is the year the type is not spelling out. */}
            <img
              className="hub-mark intro-rise"
              style={introDelay(INTRO_AT.mark)}
              src={asset('logos/midterms-26.svg')}
              alt="'26"
            />
          </h1>
          <p className="hub-byline intro-rise" style={introDelay(INTRO_AT.presented)}>
            <span className="hub-presented">
              <em>Presented by</em>
              <img className="hub-logo" src={polymarketLogo} alt="Polymarket" />
            </span>
          </p>
        </div>
        <p className="hub-tagline intro-rise" style={introDelay(INTRO_AT.statement)}>
          The <strong>right</strong> place to be.
        </p>
      </header>

      <Countdown />

      {/* Keyed on the RACE only: a race change rebuilds the grid and replays
          the entry sweep; a source change keeps the same dots and just
          recolours them in place (the background transition). */}
      <Dots
        key={`${chamber}:${resultsMode ? 'results' : 'forecast'}`}
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
/** Set once the grid has dealt for the first time this page load. */
let dotsDealt = false;

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
  // Only the first deal is an entrance (see the grid below).
  const firstDeal = useRef(!dotsDealt).current;
  useEffect(() => {
    dotsDealt = true;
  }, []);
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
        <h2 className="dots-title intro-rise" style={introDelay(INTRO_AT.statement)}>
          {headline}
        </h2>
        {/* Chamber summary (PRD P1): current seats, seats up, toss-ups — one
            line under the headline, with the freshness of the read below it. */}
        <p className="dots-seats intro-rise" style={introDelay(INTRO_AT.statement + 60)}>
          <span className="dots-num dots-num--dem">{forecast.dem} D</span>
          <span className="hub-dot" aria-hidden="true">
            •
          </span>
          <span className="dots-num dots-num--rep">{forecast.rep} R</span>
          <span className="hub-dot" aria-hidden="true">
            •
          </span>
          <span>{forecast.seatsUp} seats up</span>
          <span className="hub-dot" aria-hidden="true">
            •
          </span>
          <span>{tail}</span>
        </p>
        {(forecast.updated || resultsMode) && (
          <p className="dots-updated intro-rise" style={introDelay(INTRO_AT.statement + 120)}>
            {resultsMode ? 'Updating live' : `Updated ${forecast.updated}`}
          </p>
        )}
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
        {/* Entry stagger, row by row, top to bottom. The row is the delay's
            main term, but a whole row landing on one frame draws a hard bar
            sweeping down the grid, so each dot also carries a small lean
            across the row and a deterministic jitter — enough to break the
            line without losing the downward read. The first deal is the
            page's entrance (520ms, from INTRO_AT.dots); a re-deal on a race
            change runs the same wave short and flat (300ms), so it reads as
            the grid re-forming, not as the page opening again. */}
        {seats.map((party, i) => {
          const row = Math.floor(i / grid.cols);
          const col = i % grid.cols;
          const jitter = ((i * 2654435761) % 1000) / 1000;
          const delay = firstDeal
            ? INTRO_AT.dots + row * 30 + col * 1.6 + jitter * 26
            : row * 12 + jitter * 90;
          return (
            <span
              key={i}
              className={`dot dot--${party}${firstDeal ? '' : ' dot--redeal'}`}
              style={{ '--i': i, '--dot-delay': `${Math.round(delay)}ms` } as React.CSSProperties}
            />
          );
        })}
      </div>
      {/* The goo filter: blur, then push alpha through a steep contrast so
          two blurred shapes that overlap read as one solid one. Sized so a
          resting 4px gap stays a gap. */}
      <svg className="dots-goo-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="dots-goo">
            {/* Small blur + hard threshold: only circles that actually overlap
                fuse, and the neck between them stays thin. */}
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -12" result="goo" />
            {/* `over`, not `atop`: the neck exists only in the blurred layer — the
                source has no pixels there — and atop would discard it. */}
            <feComposite in="SourceGraphic" in2="goo" operator="over" />
          </filter>
        </defs>
      </svg>
    </section>
  );
}
