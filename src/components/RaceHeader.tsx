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
import { useEffect, useRef, useState } from 'react';
import { INTRO_AT, Letters, introDelay } from './Intro';

import { Countdown } from './Countdown';
import { PartyMark } from './PartyMark';
import { asset } from '../data/assets';
import { HERO_STATS, IS_CREATIVE, IS_STILL_ARC, type DotsShape } from '../data/edition';
import { CURRENT_SEATS } from '../data/summary';
import polymarketLogo from '../images/polymarketlogo.png';
import type { ForecastData, ResultsData } from '../data/hero';
import type { Chamber } from '../data/types';

/** Document-level title, mirrored in <title>. */
export const PAGE_TITLE = '2026 Midterms';


interface RaceHeaderProps {
  /** Option 1: the shape the seats take under the headline. */
  dotsShape?: DotsShape;
  chamber: Chamber;
  forecast: ForecastData;
  /** Election night: the feed's statement, once any race has results. */
  results?: ResultsData | null;
  resultsMode: boolean;
  /** Races already called — the statement's subject in results mode. */
  called: number;
  /** Total races in the chamber view, for the results statement. */
  raceCount: number;
}

export function RaceHeader({
  dotsShape = 'grid',
  chamber,
  forecast,
  results = null,
  resultsMode,
  called,
  raceCount,
}: RaceHeaderProps) {
  /* The presenting sponsor is Polymarket, whatever source the map shows —
     "Presented by" is a partnership line, not a data attribution. The data
     source stays named where it lives: the SOURCE pill and the panel. */
  const headline = results ? results.headline : resultsMode ? `${called} of ${raceCount} races called` : forecast.headline;
  const updatedLine = results ? results.updatedLine : resultsMode ? 'Updating live' : `Updated ${forecast.updated}`;
  /* The phone's byline has no room for the date: the same stamp, time only. */
  const updatedShort = results
    ? results.updatedShortLine
    : resultsMode
      ? 'Updating live'
      : `Updated ${forecast.updatedShort}`;

  return (
    <>
      <header className={`hub-header${IS_STILL_ARC ? ' hub-header--o3' : ''}`}>
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
                Sep 2026 over three other placements). Option 3 moves it
                under the headline (the comp's hero). */}
            {!IS_STILL_ARC && (forecast.updated || resultsMode) && (
              <>
                <span className="hub-dot" aria-hidden="true">
                  •
                </span>
                <span className="hub-updated">
                  <span className="hub-updated-full">{updatedLine}</span>
                  <span className="hub-updated-short">{updatedShort}</span>
                </span>
              </>
            )}
          </p>
        </div>
        {/* The campaign mark (creative, Sep 2026): the "Right Place to Be"
            hemicycle, in place of the typeset tagline. The entrance runs on
            the wrapper, once; the two theme files sit stacked inside it and
            a theme switch only flips which one is visible — so it recolours
            in place instead of replaying the entrance. */}
        <span className="hub-rightplace intro-rise" style={introDelay(INTRO_AT.statement)}>
          <img
            className="hub-rightplace-art hub-rightplace-art--dark"
            src={asset('logos/the-right-place.svg')}
            alt="The Right Place to Be"
            width={300}
            height={147}
          />
          <img
            className="hub-rightplace-art hub-rightplace-art--light"
            src={asset('logos/the-right-place-light.svg')}
            alt="The Right Place to Be"
            width={300}
            height={147}
          />
        </span>
      </header>


      {/* CREATIVE (Sep 17 2026, after the Kalshi hub): the headline with
          its percentage, the countdown as its caption, then one line with
          the seats — projected counts at the ends, the bar between them
          with the majority marked — and straight on to the map. */}
      {IS_CREATIVE ? (
        <section className="dots dots--creative" aria-label={`${CHAMBER_BODY[chamber]} forecast`}>
          {/* The countdown sits above the headline and OUTSIDE the keyed
              block, so a race or source switch leaves it where it is. In
              option 3 it lives with the map's controls instead. */}
          {!IS_STILL_ARC && !results && <Countdown compact />}
          {!IS_STILL_ARC && results && (
            <p className={`dots-updated dots-updated--night${results.delayed ? ' is-delayed' : ''}`}>{updatedLine}</p>
          )}
          <div className="dots-copy" key={headline}>
            <h2 className="dots-title intro-rise" style={introDelay(INTRO_AT.statement)}>
              {headline}
            </h2>
            {IS_STILL_ARC && (forecast.updated || resultsMode) && (
              <p className="dots-updated intro-rise" style={introDelay(INTRO_AT.statement + 60)}>
                {updatedLine}
              </p>
            )}
          </div>
          <SeatLine forecast={forecast} results={results} chamber={chamber} />
        </section>
      ) : (
      /* Keyed on the RACE only: a race change rebuilds the grid and replays
          the entry sweep; a source change keeps the same dots and just
          recolours them in place (the background transition). */
      <section className="dots" aria-label={`${CHAMBER_BODY[chamber]} forecast`}>
        {/* THE SEAT LINE, first and across both columns. It lives OUT of the
            keyed block below: a race switch re-deals the seats, but the bar
            must GLIDE from the old split to the new one the way a source
            switch does — a remount would snap it. */}
        <div className="dots-seatline">
          <SeatLine forecast={forecast} results={results} chamber={chamber} compact />
        </div>
      <Dots
        key={`${chamber}:${resultsMode ? 'results' : 'forecast'}:${dotsShape}`}
        forecast={forecast}
        results={results}
        chamber={chamber}
        shape={dotsShape}
        headline={headline}
        resultsMode={resultsMode}
        called={called}
      />
      </section>
      )}
    </>
  );
}

const CHAMBER_BODY: Record<Chamber, string> = { house: 'House', senate: 'Senate', governor: 'Governors' };

/**
 * The seat line (creative edition): projected seats at the two ends, the
 * bar between them in five runs — seats each party holds and keeps, seats
 * each gains under this source, the toss-ups — and the majority marked
 * where it falls. Same projection as the dots and the hemicycle.
 */
function SeatLine({
  forecast,
  results,
  chamber,
  compact = IS_STILL_ARC,
}: {
  forecast: ForecastData;
  results: ResultsData | null;
  chamber: Chamber;
  /** The comp's terse form: "203 D", "Toss Ups: N" between the currents. */
  compact?: boolean;
}) {
  const total = forecast.dem + forecast.rep;
  const gap = forecast.tossupShare;
  const cur = CURRENT_SEATS[chamber];
  const majority = Math.floor(total / 2) + 1;
  const pct = (n: number) => `${((n / total) * 100).toFixed(2)}%`;
  /* Election night: the two ends are seats the party HAS (held + called),
     the bar runs called-D, leading-D (hatched), too early, leading-R,
     called-R — the feed's split, a lead never drawn as a result. */
  let pd: number;
  let pr: number;
  let toss: number;
  let runs: Array<[string, number]>;
  if (results) {
    pd = results.demTotal;
    pr = results.repTotal;
    toss = Math.max(0, total - pd - pr - results.leadingDem - results.leadingRep);
    runs = [
      ['called-dem', pd],
      ['lead-dem', results.leadingDem],
      ['early', toss],
      ['lead-rep', results.leadingRep],
      ['called-rep', pr],
    ];
  } else {
    pd = Math.round((total * Math.max(0, forecast.demShare - gap / 2)) / 100);
    toss = Math.round((total * gap) / 100);
    pr = Math.max(0, total - pd - toss);
    const keepD = Math.min(cur.dem, pd);
    const keepR = Math.min(cur.rep, pr);
    runs = [
      ['keep-dem', keepD],
      ['gain-dem', pd - keepD],
      ['toss', toss],
      ['gain-rep', pr - keepR],
      ['keep-rep', keepR],
    ];
  }
  /* ALWAYS the glide: the runs are laid at zero on the first frame and
     take their widths on the next, so the bar assembles itself the way it
     re-splits on a source or race switch (transition in index.css). */
  const [laid, setLaid] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setLaid(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <div className="seatline intro-rise" style={introDelay(INTRO_AT.statement + 120)}>
      <div className="seatline-ends">
        <span className="seatline-end seatline-end--dem">
          <PartyMark party="dem" />
          <b className="seatline-big">{pd}</b>
          {compact ? (
            <abbr className="seatline-label" title="Democrats">
              D
            </abbr>
          ) : (
            <span className="seatline-label">Democrats</span>
          )}
        </span>
        <span className="seatline-win" style={{ left: pct(majority) }}>
          {majority} to win
        </span>
        <span className="seatline-end seatline-end--rep">
          <PartyMark party="rep" />
          {compact ? (
            <>
              <b className="seatline-big">{pr}</b>
              <abbr className="seatline-label" title="Republicans">
                R
              </abbr>
            </>
          ) : (
            <>
              <span className="seatline-label">Republicans</span>
              <b className="seatline-big">{pr}</b>
            </>
          )}
        </span>
      </div>
      <div
        className="seatline-bar"
        role="img"
        aria-label={
          results
            ? `Seats: Democrats ${pd} (${results.leadingDem} more leading), too early ${toss}, Republicans ${pr} (${results.leadingRep} more leading) of ${total}; ${majority} to win.`
            : `Projected: Democrats ${pd}, toss-ups ${toss}, Republicans ${pr} of ${total}; ${majority} to win.`
        }
      >
        {runs.map(([k, n]) => (
          <span key={k} className={`seatline-run seatline-run--${k}`} style={{ width: laid ? pct(n) : '0%' }} />
        ))}
      </div>
      <div className="seatline-current">
        {results ? (
          <>
            <span>{results.calledDem} called</span>
            {compact && <span className="seatline-toss">{results.open} uncalled</span>}
            <span>{results.calledRep} called</span>
          </>
        ) : (
          <>
            <span>{cur.dem} current</span>
            {compact && <span className="seatline-toss">Toss Ups: {toss}</span>}
            <span>{cur.rep} current</span>
          </>
        )}
      </div>
    </div>
  );
}

interface DotsProps {
  forecast: ForecastData;
  results: ResultsData | null;
  chamber: Chamber;
  shape: DotsShape;
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
   across (48px, per the Senate comp), governorships at 10 across (74px, five
   rows — the most the frame holds without growing, Sep 21 2026). The mobile
   pair keeps the same idea on a 358px card. */
/** Set once the grid has dealt for the first time this page load. */
let dotsDealt = false;

const DOT_GRID: Record<Chamber, { cols: number; gap: number; colsM: number; gapM: number }> = {
  house: { cols: 29, gap: 4, colsM: 20, gapM: 3 },
  senate: { cols: 15, gap: 6, colsM: 10, gapM: 4 },
  governor: { cols: 10, gap: 8, colsM: 10, gapM: 4 },
};

/**
 * The seats on an arc (option 1's "Arc" and "Semi", Sep 21 2026): the
 * hemicycle's own geometry — rows of seats along concentric arcs, each row
 * holding its share by length — in a unit box that the container's aspect
 * ratio reproduces. Positions come back as fractions of the box, so the
 * dots are plain absolutely-placed spans and the hover lens works on them
 * unchanged. The full arc sweeps 180°; the semi-arc 140° on a deeper band.
 */
interface ArcLayout {
  /** Box aspect (w / h) for the container. */
  aspect: number;
  /** Dot diameter as a fraction of the box's width. */
  size: number;
  /** [x, y] centres as fractions of the box, in row-then-angle order. */
  pts: Array<[number, number, number]>; // x, y, row
}

function arcLayout(total: number, shape: 'arc' | 'semi'): ArcLayout {
  const rows = total >= 400 ? 12 : total >= 100 ? 6 : 4;
  const R_OUT = 880;
  const R_IN = shape === 'arc' ? 372 : 300;
  const sweep = shape === 'arc' ? Math.PI : (140 * Math.PI) / 180;
  const step = rows > 1 ? (R_OUT - R_IN) / (rows - 1) : 0;
  const radii = Array.from({ length: rows }, (_, k) => R_OUT - k * step);
  const arcs = radii.map((r) => sweep * r);
  const sum = arcs.reduce((a, b) => a + b, 0);
  const raw = arcs.map((a) => (a / sum) * total);
  const counts = raw.map(Math.floor);
  let left = total - counts.reduce((a, b) => a + b, 0);
  raw
    .map((v, i) => [v - Math.floor(v), i] as const)
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => {
      if (left > 0) {
        counts[i] += 1;
        left -= 1;
      }
    });
  // The dot: no bigger than the row pitch or the along-row spacing allow.
  const along = sum / total;
  const dotR = Math.min(total >= 400 ? 21 : 80, step * 0.47, along * 0.47);
  const pts: Array<[number, number, number]> = [];
  radii.forEach((r, k) => {
    const n = counts[k];
    for (let i = 0; i < n; i += 1) {
      const t = (i + 0.5) / n; // 0 = left end, 1 = right end
      const a = Math.PI / 2 + sweep / 2 - sweep * t;
      pts.push([r * Math.cos(a), -r * Math.sin(a), k]);
    }
  });
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - dotR;
  const x1 = Math.max(...xs) + dotR;
  const y0 = Math.min(...ys) - dotR;
  const y1 = Math.max(...ys) + dotR;
  const w = x1 - x0;
  const h = y1 - y0;
  return {
    aspect: w / h,
    size: (dotR * 2) / w,
    pts: pts.map(([x, y, k]) => [(x - x0) / w, (y - y0) / h, k]),
  };
}

function Dots({ forecast, results, chamber, headline, resultsMode, called, shape }: DotsProps) {
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
    // The pitch is the distance between two neighbours — as a distance, not
    // a horizontal difference: on the arcs the first two seats sit almost
    // one above the other, and a horizontal read gave a pitch of nothing,
    // a lens with no reach (fixed Sep 21 2026).
    const a = L.dots[0]?.getBoundingClientRect();
    const b = L.dots[1]?.getBoundingClientRect();
    L.pitch = a && b ? Math.max(8, Math.hypot(b.left - a.left, b.top - a.top)) : 28;
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
    const party = (el: HTMLElement) => el.dataset.party ?? 'toss';
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
          L.dots[i].classList.remove('is-hovered');
        }
        continue;
      }
      moving = true;
      L.s[i] = ns;
      L.x[i] = nx;
      L.y[i] = ny;
      L.dots[i].style.transform = `translate(${nx.toFixed(2)}px, ${ny.toFixed(2)}px) scale(${ns.toFixed(3)})`;
      L.dots[i].style.zIndex = ns > 1.02 ? '1' : '';
      // The seats the lens swells wear the DS hovered colour
      // (background/*/bold/hovered); the ones it pushes away do not.
      L.dots[i].classList.toggle('is-hovered', ns > 1.02);
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
  // Pressed (DS background/*/bold/pressed): the seat under the pointer while
  // the button is down; released on up or leave.
  const pressed = useRef<HTMLElement | null>(null);
  const release = () => {
    pressed.current?.classList.remove('is-pressed');
    pressed.current = null;
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const dot = (e.target as HTMLElement).closest('.dot') as HTMLElement | null;
    release();
    if (!dot) return;
    dot.classList.add('is-pressed');
    pressed.current = dot;
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
  const tail = resultsMode
    ? `${called} called`
    : `${forecast.tossups} toss-up${forecast.tossups === 1 ? '' : 's'}`;

  /* THE SEATS. Pre-election: the projection under the active source (dem,
     the toss-up gap, rep). Election night: the FEED's own split — seats the
     party already has (held or called), seats it leads, seats too early to
     call — in five bands, so a lead and a result never look alike. */
  type Band = 'rep' | 'rep-lead' | 'uncalled' | 'toss' | 'dem-lead' | 'dem';
  const PARTY_OF: Record<Band, 'rep' | 'dem' | 'toss'> = {
    rep: 'rep',
    'rep-lead': 'rep',
    uncalled: 'toss',
    toss: 'toss',
    'dem-lead': 'dem',
    dem: 'dem',
  };
  let bands: Array<[Band, number]>;
  if (results) {
    bands = [
      ['rep', results.repTotal],
      ['rep-lead', results.leadingRep],
      ['uncalled', Math.max(0, total - results.repTotal - results.leadingRep - results.leadingDem - results.demTotal)],
      ['dem-lead', results.leadingDem],
      ['dem', results.demTotal],
    ];
  } else {
    const dem = Math.round((total * demShare) / 100);
    const toss = Math.round((total * gap) / 100);
    const rep = Math.max(0, total - dem - toss);
    bands = [
      ['rep', rep],
      ['toss', toss],
      ['dem', dem],
    ];
  }
  // Top-down reading order: Republicans first, Democrats from the bottom.
  const seats: Band[] = bands.flatMap(([band, n]) => Array<Band>(Math.max(0, n)).fill(band));

  // The arcs: seats coloured by their bearing, left to right — the same
  // bands in the opposite order (dem left, rep right), as on the big arc.
  const arc = shape === 'grid' ? null : arcLayout(total, shape);
  const leftToRight: Array<[Band, number]> = [...bands].reverse();
  const arcParty = (i: number): Band => {
    if (!arc) return 'toss';
    let rank = arcRank[i];
    for (const [band, n] of leftToRight) {
      if (rank < n) return band;
      rank -= n;
    }
    return leftToRight[leftToRight.length - 1][0];
  };
  const arcRank: number[] = [];
  if (arc) {
    // Rank by bearing (x across the box), ties by row.
    const order = arc.pts.map((_, i) => i).sort((a, b) => arc.pts[a][0] - arc.pts[b][0] || arc.pts[a][2] - arc.pts[b][2]);
    order.forEach((i, rank) => {
      arcRank[i] = rank;
    });
  }

  return (
    <>
      <div className="dots-left">
      {/* Keyed on the headline so a race switch crossfades the copy, the way
          the old statement did. */}
      <div className="dots-copy" key={headline}>
        <h2 className="dots-title intro-rise" style={introDelay(INTRO_AT.statement)}>
          {headline}
        </h2>
        {/* OPTION 2 (Sep 24 2026): the chamber in one small line under the
            headline — the seat line above already draws it, this says it. */}
        {HERO_STATS && (
          <p className="dots-seats intro-rise" style={introDelay(INTRO_AT.statement + 60)}>
            <span className="dots-num">
              <b className="dots-party">D</b> {results ? results.demTotal : forecast.dem}
            </span>
            <span className="hub-dot" aria-hidden="true">
              •
            </span>
            <span className="dots-num">
              <b className="dots-party">R</b> {results ? results.repTotal : forecast.rep}
            </span>
            <span className="hub-dot" aria-hidden="true">
              •
            </span>
            {results ? (
              <>
                <span>{results.open} uncalled</span>
                <span className="hub-dot" aria-hidden="true">
                  •
                </span>
                <span>{results.majority} to win</span>
              </>
            ) : (
              <>
                <span>{forecast.seatsUp} seats up</span>
                <span className="hub-dot" aria-hidden="true">
                  •
                </span>
                <span>{tail}</span>
              </>
            )}
          </p>
        )}
        {/* The Election Day clock as the copy's last line (Sep 21 2026):
            with the headline and the seats, not adrift above them. On the
            night, the provider and its last batch take that line. Option 2
            gives it an eyebrow instead of the hairline. */}
        {results ? (
          <p className={`dots-updated dots-updated--night${results.delayed ? ' is-delayed' : ''}`}>
            {results.updatedLine}
          </p>
        ) : HERO_STATS ? (
          <div className="hero-clock">
            <p className="hero-clock-eyebrow">Time to Election Day</p>
            <Countdown compact />
          </div>
        ) : (
          <Countdown compact />
        )}
      </div>
      </div>

      {/* The grid is one image to assistive tech — 435 list items would be
          noise. The sentence is the seat bar's, unchanged. */}
      <div
        className={`dots-grid${arc ? ' dots-grid--arc' : ''}`}
        style={
          {
            '--dot-cols': grid.cols,
            '--dot-gap': `${grid.gap}px`,
            '--dot-cols-m': grid.colsM,
            '--dot-gap-m': `${grid.gapM}px`,
            ...(arc ? { aspectRatio: String(arc.aspect) } : {}),
          } as React.CSSProperties
        }
        role="img"
        aria-label={
          results
            ? `Seats: Democrats ${results.demTotal} (${results.calledDem} called, ${results.leadingDem} leading), Republicans ${results.repTotal} (${results.calledRep} called, ${results.leadingRep} leading), of ${total}. ${results.open} uncalled, ${results.majority} to win.`
            : `Current seats: Democrats ${forecast.dem}, Republicans ${forecast.rep}, of ${total}. ${forecast.seatsUp} seats up, ${tail}.`
        }
        ref={gridRef}
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          release();
          onPointerLeave();
        }}
        onPointerDown={onPointerDown}
        onPointerUp={release}
        onPointerCancel={release}
      >
        {/* Entry stagger, row by row, top to bottom. The row is the delay's
            main term, but a whole row landing on one frame draws a hard bar
            sweeping down the grid, so each dot also carries a small lean
            across the row and a deterministic jitter — enough to break the
            line without losing the downward read. The first deal is the
            page's entrance (520ms, from INTRO_AT.dots); a re-deal on a race
            change runs the same wave short and flat (300ms), so it reads as
            the grid re-forming, not as the page opening again. */}
        {arc
          ? arc.pts.map(([x, y, row], i) => {
              /* The arc fills ALONG ITS SWEEP (Sep 24 2026), left tip to
                 right — the big arc's own choreography — instead of the
                 grid's row-by-row deal, which read as noise on a curve.
                 The row offset keeps the rows from landing as one hard
                 front, and the jitter breaks the line. */
              const jitter = ((i * 2654435761) % 1000) / 1000;
              const delay = firstDeal
                ? INTRO_AT.dots + x * 420 + row * 9 + jitter * 22
                : x * 260 + row * 7 + jitter * 16;
              return (
                <span
                  key={i}
                  className={`dot dot--${arcParty(i)}${firstDeal ? '' : ' dot--redeal'}`}
                  data-party={PARTY_OF[arcParty(i)]}
                  style={
                    {
                      '--i': i,
                      '--dot-delay': `${Math.round(delay)}ms`,
                      left: `${((x - arc.size / 2) * 100).toFixed(3)}%`,
                      top: `${((y - (arc.size * arc.aspect) / 2) * 100).toFixed(3)}%`,
                      width: `${(arc.size * 100).toFixed(3)}%`,
                    } as React.CSSProperties
                  }
                />
              );
            })
          : seats.map((party, i) => {
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
              data-party={PARTY_OF[party]}
              style={{ '--i': i, '--dot-delay': `${Math.round(delay)}ms` } as React.CSSProperties}
            />
          );
        })}
      </div>
    </>
  );
}
