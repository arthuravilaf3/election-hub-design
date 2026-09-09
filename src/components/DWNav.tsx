// The dailywire.com site nav, redrawn from the DW WIP Q3 Figma "Header (Web)"
// (Sep 2026): 64px bar, 64px side padding, hairline underneath, pill-shaped
// 32px items on the left (News is the bold one), the wordmark dead centre,
// Download App / Search / divider / avatar on the right. "The Midterms"
// joins the section links — with its own 3×3 dot mark (`comp`), or set in
// the blue→red gradient with no mark (`gradient`); see data/navVariants.ts.
//
// The site renders this in light mode (#FAFAFA); the Election Hub is a DW+
// dark-mode surface, so the same semantic tokens resolve dark here.
//
// Chrome only: nothing in this bar may use the party data-viz TOKENS. The
// dot mark's and the gradient's colours are the comp's own literals, kept
// as an identity palette (see .nav-dot / .dw-nav-link--gradient), not as a
// reading of any race.
import { useState, type CSSProperties, type MouseEvent } from 'react';
import type { NavVariant } from '../data/navVariants';
import { DWLogo } from './DWLogo';

// Section links. In the prototype a click does not leave the page: it moves
// the "current page" so the nav can be seen from another section — The
// Midterms drops from 600 to the DS label/500/md weight but keeps its
// gradient, and the clicked section takes the bold.
const SECTIONS = [
  { id: 'news', label: 'News', href: 'https://www.dailywire.com/' },
  { id: 'shows', label: 'Shows & Movies', href: 'https://www.dailywire.com/watch' },
  { id: 'all-access', label: 'All Access', href: 'https://www.dailywire.com/all-access' },
  { id: 'sports', label: 'Sports & State', href: 'https://www.dailywire.com/sports-and-state' },
];
const MIDTERMS_ID = 'midterms';

// The mark, row by row, as drawn in the comp: r = red, c = crimson,
// b = blue, n = navy. On hover every dot hops a little and swaps to the
// opposite family (red ↔ blue), so the mark "flips" while the eye is on it.
type DotKey = 'r' | 'c' | 'b' | 'n';
const COMP_DOTS: DotKey[] = ['r', 'b', 'n', 'b', 'b', 'c', 'n', 'r', 'c'];
const DOT_FLIP: Record<DotKey, DotKey> = { r: 'b', c: 'n', b: 'r', n: 'c' };
// Hop vectors, one per dot: a tight scatter that keeps the grid readable.
const DOT_HOP = [
  [-1.5, -1.5], [0, -2], [1.5, -1.5],
  [-2, 0], [0, 0], [2, 0],
  [-1.5, 1.5], [0, 2], [1.5, 1.5],
];

function MidtermsDots() {
  return (
    <span className="nav-dots" aria-hidden="true">
      {COMP_DOTS.map((k, i) => (
        <span
          key={i}
          className={`nav-dot nav-dot--${k}`}
          style={
            {
              '--i': i,
              '--flip': `var(--nav-dot-${DOT_FLIP[k]})`,
              '--dx': `${DOT_HOP[i][0]}px`,
              '--dy': `${DOT_HOP[i][1]}px`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
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
}

export function DWNav({ variant = 'comp' }: DWNavProps) {
  // Which page the nav believes it is on. The hub IS the map page, so it
  // starts on The Midterms.
  const [current, setCurrent] = useState(MIDTERMS_ID);
  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    setCurrent(id);
  };
  return (
    <div className={`dw-nav-bar dw-nav-bar--${variant}`}>
      <div className="dw-nav-inner">
        <nav className="dw-nav" aria-label="Daily Wire">
          <div className="dw-nav-sections">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={s.href}
                className={`dw-nav-link${current === s.id ? ' is-active' : ''}`}
                aria-current={current === s.id ? 'page' : undefined}
                onClick={go(s.id)}
              >
                {s.label}
              </a>
            ))}
            <a
              href="https://www.dailywire.com/midterms"
              className={`dw-nav-link dw-nav-link--midterms${
                variant === 'gradient' ? ' dw-nav-link--gradient' : ''
              }${current === MIDTERMS_ID ? ' is-active' : ''}`}
              aria-current={current === MIDTERMS_ID ? 'page' : undefined}
              onClick={go(MIDTERMS_ID)}
            >
              {variant === 'comp' && <MidtermsDots />}
              <span className="dw-nav-midterms-label">The Midterms</span>
            </a>
          </div>

          <a href="https://www.dailywire.com/" className="dw-nav-logo" aria-label="Daily Wire home">
            <DWLogo />
          </a>

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
