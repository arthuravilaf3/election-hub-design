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
import { GAME_BANNER, GameRibbon } from './GameBanner';

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
  const updatedLine = resultsMode ? 'Updating live' : `Updated ${forecast.updated}`;

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
            {/* Freshness of the read lives here, after the sponsor (decided
                Sep 2026 over three other placements). */}
            {(forecast.updated || resultsMode) && (
              <>
                <span className="hub-dot" aria-hidden="true">
                  •
                </span>
                <span className="hub-updated">{updatedLine}</span>
              </>
            )}
          </p>
        </div>
        <p className="hub-tagline intro-rise" style={introDelay(INTRO_AT.statement)}>
          The <strong>right</strong> place to be.
        </p>
      </header>

      <Countdown />
      {GAME_BANNER === 'b' && <GameRibbon />}

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

  /* HOVER LENS. The dots near the pointer swell and lean toward it, most
     for the one underneath and less with distance (a Gaussian falloff two
     pitches wide), so the ones you are over touch their neighbours while
     everything else stays put. Driven per frame in JS with a lerp toward
     the target — no CSS transition, no SVG filter — so the circles stay
     perfect circles, the motion is continuous under a moving pointer and
     it settles the same way it rose. 435 dots is fine: only the ones near
     the pointer change, and the loop stops the moment everything is at rest.
     Reduced motion: no lens at all. */
  const gridRef = useRef<HTMLDivElement>(null);
  const lens = useRef({
    dots: [] as HTMLElement[],
    cx: [] as number[],
    cy: [] as number[],
    s: [] as number[],
    x: [] as number[],
    y: [] as number[],
    pitch: 28,
    px: -1e9,
    py: -1e9,
    raf: 0,
    measured: false,
  });
  const measure = () => {
    const grid = gridRef.current;
    if (!grid) return;
    const L = lens.current;
    const g = grid.getBoundingClientRect();
    L.dots = Array.from(grid.querySelectorAll<HTMLElement>('.dot'));
    L.cx = [];
    L.cy = [];
    L.dots.forEach((d, i) => {
      const r = d.getBoundingClientRect();
      L.cx[i] = r.left + r.width / 2 - g.left;
      L.cy[i] = r.top + r.height / 2 - g.top;
      L.s[i] = L.s[i] ?? 1;
      L.x[i] = L.x[i] ?? 0;
      L.y[i] = L.y[i] ?? 0;
    });
    const a = L.dots[0]?.getBoundingClientRect();
    const b = L.dots[1]?.getBoundingClientRect();
    L.pitch = a && b ? Math.max(8, b.left - a.left) : 28;
    L.measured = true;
  };
  const tick = () => {
    const L = lens.current;
    L.raf = 0;
    const R = L.pitch * 1.6; // reach
    const A = 0.3; // swell of the dot under the pointer
    const B = L.pitch * 0.18; // lean toward the pointer
    const PUSH = L.pitch * 0.34; // …or away from it, across the party line
    const k = 0.2; // lerp per frame (~80ms time constant at 60fps)
    // THE DIVIDE (Sep 2026): dots of the SAME colour as the one under the
    // pointer gather toward it; dots of ANOTHER colour push away and shrink
    // a little — the country pulling apart under the reader's hand. The hot
    // dot is the nearest one; parties are read off the classes so a source
    // switch (which only recolours) is picked up without re-measuring.
    const party = (el: HTMLElement) =>
      el.classList.contains('dot--rep') ? 'rep' : el.classList.contains('dot--dem') ? 'dem' : 'toss';
    let hot = -1;
    let hotD2 = Infinity;
    for (let i = 0; i < L.dots.length; i += 1) {
      const dx = L.px - L.cx[i];
      const dy = L.py - L.cy[i];
      const d2 = dx * dx + dy * dy;
      if (d2 < hotD2) {
        hotD2 = d2;
        hot = i;
      }
    }
    const hotParty = hot >= 0 && hotD2 < R * R * 4 ? party(L.dots[hot]) : null;
    let moving = false;
    for (let i = 0; i < L.dots.length; i += 1) {
      const dx = L.px - L.cx[i];
      const dy = L.py - L.cy[i];
      const d2 = dx * dx + dy * dy;
      let ts = 1;
      let tx = 0;
      let ty = 0;
      if (d2 < R * R * 4) {
        const w = Math.exp(-d2 / (R * R));
        const d = Math.sqrt(d2) || 1;
        if (hotParty && party(L.dots[i]) !== hotParty) {
          // Across the line: recoil, and give a little ground.
          ts = 1 - 0.1 * w;
          tx = (-dx / d) * PUSH * w;
          ty = (-dy / d) * PUSH * w;
        } else {
          ts = 1 + A * w;
          tx = (dx / d) * B * w;
          ty = (dy / d) * B * w;
        }
      }
      const ns = L.s[i] + (ts - L.s[i]) * k;
      const nx = L.x[i] + (tx - L.x[i]) * k;
      const ny = L.y[i] + (ty - L.y[i]) * k;
      const rest = Math.abs(ns - 1) < 0.002 && Math.abs(nx) < 0.05 && Math.abs(ny) < 0.05;
      if (rest) {
        if (L.s[i] !== 1 || L.x[i] !== 0 || L.y[i] !== 0) {
          L.s[i] = 1;
          L.x[i] = 0;
          L.y[i] = 0;
          L.dots[i].style.transform = '';
          L.dots[i].style.zIndex = '';
        }
        continue;
      }
      moving = true;
      L.s[i] = ns;
      L.x[i] = nx;
      L.y[i] = ny;
      L.dots[i].style.transform = `translate(${nx.toFixed(2)}px, ${ny.toFixed(2)}px) scale(${ns.toFixed(3)})`;
      L.dots[i].style.zIndex = ns > 1.02 ? '1' : '';
    }
    if (moving) L.raf = window.requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!lens.current.raf) lens.current.raf = window.requestAnimationFrame(tick);
  };
  const reducedLens = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current;
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedLens || e.pointerType === 'touch') return;
    const L = lens.current;
    if (!L.measured) measure();
    const g = e.currentTarget.getBoundingClientRect();
    L.px = e.clientX - g.left;
    L.py = e.clientY - g.top;
    wake();
  };
  const onPointerLeave = () => {
    const L = lens.current;
    L.px = -1e9;
    L.py = -1e9;
    wake();
  };
  useEffect(() => {
    const L = lens.current;
    const onResize = () => {
      L.measured = false;
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (L.raf) window.cancelAnimationFrame(L.raf);
    };
  }, []);
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
          <span className="dots-num">
            {forecast.dem} <b className="dots-party dots-party--dem">D</b>
          </span>
          <span className="hub-dot" aria-hidden="true">
            •
          </span>
          <span className="dots-num">
            {forecast.rep} <b className="dots-party dots-party--rep">R</b>
          </span>
          <span className="hub-dot" aria-hidden="true">
            •
          </span>
          <span>{forecast.seatsUp} seats up</span>
          <span className="hub-dot" aria-hidden="true">
            •
          </span>
          <span>{tail}</span>
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
        ref={gridRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
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
    </section>
  );
}
