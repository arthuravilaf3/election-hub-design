// The dailywire.com site nav, redrawn from the DW WIP Q3 Figma "Header (Web)"
// (Sep 2026): 64px bar, 64px side padding, hairline underneath, pill-shaped
// 32px items on the left (News is the bold one), the wordmark dead centre,
// Download App / Search / divider / avatar on the right. Midterms joins the
// section links with its own 3×3 dot mark — the one place the hub's dots
// leak into the chrome.
//
// Identity explorations (data/navVariants.ts) layer on top of that base:
//   live     the mark's dots follow the chamber forecast (rep / toss / dem)
//   goo      hovering the mark pulls the dots together through a goo filter
//   clock    a compact countdown appears by the wordmark once the big one
//            scrolls away
//   progress the hairline fills brand-red with the scroll position
//   marquee  a dot pattern marches behind the Midterms label on hover
//   mark26   the wordmark gives way to the '26 mark on hover
//
// The site renders this in light mode (#FAFAFA); the Election Hub is a DW+
// dark-mode surface, so the same semantic tokens resolve dark here.
//
// Chrome only: nothing in this bar may use the party data-viz TOKENS. The
// dot mark's colours are the comp's own literals, kept as an icon palette
// (see .nav-dot), not as a reading of any race — except in `live`, which is
// exactly the point of that exploration.
import { useEffect, useState, type CSSProperties } from 'react';
import { asset } from '../data/assets';
import type { ForecastData } from '../data/hero';
import type { NavVariant } from '../data/navVariants';
import { ELECTION_DAY, Figure, pad, partsUntil } from './Countdown';
import { DWLogo } from './DWLogo';

const SECTIONS = [
  { label: 'News', href: 'https://www.dailywire.com/', active: true },
  { label: 'Shows & Movies', href: 'https://www.dailywire.com/watch' },
  { label: 'All Access', href: 'https://www.dailywire.com/all-access' },
  { label: 'Shop', href: 'https://store.dailywire.com/' },
  { label: 'Kids', href: 'https://www.dailywire.com/kids' },
];

// The mark, row by row, as drawn in the comp: r = red, c = crimson,
// b = blue, n = navy (g = grey, for the live toss-ups). On hover every dot
// hops a little and swaps to the opposite family (red ↔ blue), so the mark
// "flips" while the eye is on it; in `live` the flip stays inside the family
// so the reading is never contradicted.
type DotKey = 'r' | 'c' | 'b' | 'n' | 'g';
const COMP_DOTS: DotKey[] = ['r', 'b', 'n', 'b', 'b', 'c', 'n', 'r', 'c'];
const FLIP_ACROSS: Record<DotKey, DotKey> = { r: 'b', c: 'n', b: 'r', n: 'c', g: 'g' };
const FLIP_WITHIN: Record<DotKey, DotKey> = { r: 'c', c: 'r', b: 'n', n: 'b', g: 'g' };
// Hop vectors, one per dot: a tight scatter that keeps the grid readable.
const DOT_HOP = [
  [-1.5, -1.5], [0, -2], [1.5, -1.5],
  [-2, 0], [0, 0], [2, 0],
  [-1.5, 1.5], [0, 2], [1.5, 1.5],
];
// Pull vectors for the goo: every dot toward the centre one.
const DOT_PULL = [
  [1.2, 1.2], [0, 1.2], [-1.2, 1.2],
  [1.2, 0], [0, 0], [-1.2, 0],
  [1.2, -1.2], [0, -1.2], [-1.2, -1.2],
];

/** Nine dots that read the chamber: rep first, toss-ups, then dem — the
    same left-to-right order as the big grid under the header. */
function liveDots(f: ForecastData): DotKey[] {
  const dem = Math.round((f.demShare / 100) * 9);
  const toss = Math.round((f.tossupShare / 100) * 9);
  const rep = Math.max(0, 9 - dem - toss);
  const out: DotKey[] = [];
  for (let i = 0; i < rep; i += 1) out.push(i % 2 ? 'c' : 'r');
  for (let i = 0; i < toss; i += 1) out.push('g');
  for (let i = 0; i < dem; i += 1) out.push(i % 2 ? 'n' : 'b');
  return out.slice(0, 9);
}

function MidtermsDots({ variant, forecast }: { variant: NavVariant; forecast?: ForecastData }) {
  const dots = variant === 'live' && forecast ? liveDots(forecast) : COMP_DOTS;
  const flip = variant === 'live' ? FLIP_WITHIN : FLIP_ACROSS;
  const move = variant === 'goo' ? DOT_PULL : DOT_HOP;
  return (
    <span className="nav-dots" aria-hidden="true">
      {dots.map((k, i) => (
        <span
          key={i}
          className={`nav-dot nav-dot--${k}`}
          style={
            {
              '--i': i,
              '--flip': `var(--nav-dot-${flip[k]})`,
              '--dx': `${move[i][0]}px`,
              '--dy': `${move[i][1]}px`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

/** `goo`: a small-radius sibling of the header's #dots-goo, tuned for 5px
    dots (blur 1.2 instead of 4). Rendered only for that variant. */
function NavGooDefs() {
  return (
    <svg className="dots-goo-defs" aria-hidden="true" focusable="false">
      <defs>
        <filter id="nav-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.9" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

/** `clock`: the countdown, compact, ticking, shown only while the big one
    under the header is off screen. Same Figure/roll as the big clock. */
function NavClock() {
  const [tick, setTick] = useState(() => Date.now());
  const [away, setAway] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const big = document.querySelector('.countdown');
    if (!big) return;
    const io = new IntersectionObserver(([e]) => setAway(!e.isIntersecting), { threshold: 0 });
    io.observe(big);
    return () => io.disconnect();
  }, []);
  const t = partsUntil(ELECTION_DAY, tick);
  return (
    <span className={`dw-nav-clock${away ? ' is-shown' : ''}`} aria-hidden={!away}>
      <span className="dw-nav-clock-unit">
        <Figure value={String(t.days)} />d
      </span>
      <span className="dw-nav-clock-unit">
        <Figure value={pad(t.hours)} />:<Figure value={pad(t.minutes)} />:<Figure value={pad(t.seconds)} />
      </span>
    </span>
  );
}

/** `progress`: the hairline as a scroll gauge. One passive listener, one
    rAF, one custom property. */
function NavProgress() {
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>('.dw-nav-bar');
    if (!bar) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.setProperty('--nav-progress', p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
      bar.style.removeProperty('--nav-progress');
    };
  }, []);
  return <span className="dw-nav-progress" aria-hidden="true" />;
}

// Tabler icons (download, search) at 20px, as in the comp.
function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 10a7 7 0 1 0 14 0 7 7 0 1 0-14 0M21 21l-6-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface DWNavProps {
  variant?: NavVariant;
  /** The chamber forecast on screen — read by the `live` mark only. */
  forecast?: ForecastData;
}

export function DWNav({ variant = 'comp', forecast }: DWNavProps) {
  return (
    <div className={`dw-nav-bar dw-nav-bar--${variant}`}>
      {variant === 'goo' && <NavGooDefs />}
      {variant === 'progress' && <NavProgress />}
      <div className="dw-nav-inner">
        <nav className="dw-nav" aria-label="Daily Wire">
          <div className="dw-nav-sections">
            {SECTIONS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className={`dw-nav-link${s.active ? ' is-active' : ''}`}
              >
                {s.label}
              </a>
            ))}
            <a
              href="https://www.dailywire.com/midterms"
              className="dw-nav-link dw-nav-link--midterms"
              aria-current="page"
            >
              <MidtermsDots variant={variant} forecast={forecast} />
              Midterms
            </a>
          </div>

          <div className="dw-nav-center">
            <a href="https://www.dailywire.com/" className="dw-nav-logo" aria-label="Daily Wire home">
              <DWLogo />
              {variant === 'mark26' && (
                <img
                  className="dw-nav-mark26"
                  src={asset('logos/midterms-26.svg')}
                  alt=""
                  aria-hidden="true"
                />
              )}
            </a>
            {variant === 'clock' && <NavClock />}
          </div>

          <div className="dw-nav-utils">
            <a href="https://get.dailywire.com/app-download-v2/" className="dw-nav-link dw-nav-util">
              <DownloadIcon />
              Download App
            </a>
            <button type="button" className="dw-nav-link dw-nav-util dw-nav-search">
              <SearchIcon />
              Search
            </button>
            <span className="dw-nav-divider" aria-hidden="true" />
            <a
              href="https://www.dailywire.com/account"
              className="dw-nav-avatar"
              aria-label="Account"
            >
              <span className="dw-nav-avatar-img">ST</span>
            </a>
          </div>
        </nav>
      </div>
    </div>
  );
}
