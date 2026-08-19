// The dailywire.com site nav, reproduced from the live site (Aug 2026):
// sticky 68px bar, left section links, centered wordmark, right utilities +
// LOG IN (ghost) + SIGN UP (brand). Structure, order, hrefs, type sizes and
// the two button treatments match the production nav.
//
// The site renders this in light mode (#FAFAFA); the Election Hub is a DW+
// dark-mode surface, so the same semantic tokens resolve dark here. Add
// className="dw-nav--light" to see it exactly as dailywire.com shows it today.
//
// Chrome only: nothing in this bar may use the party data-viz tokens.
import { DWLogo } from './DWLogo';

// Redesign (Aug 2026): section set from the DW WIP Q3 Figma — Shop and Kids
// join, Election Hub leaves the nav (the purple promo bar is the entry point).
const SECTIONS = [
  { label: 'News', href: 'https://www.dailywire.com/', active: true },
  { label: 'Shows & Movies', href: 'https://www.dailywire.com/watch' },
  { label: 'All Access', href: 'https://www.dailywire.com/all-access' },
  { label: 'Shop', href: 'https://store.dailywire.com/' },
  { label: 'Kids', href: 'https://www.dailywire.com/kids' },
  { label: 'DWTV', href: 'https://www.dailywire.com/dwtv' },
];

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2v7.5M8 9.5 5 6.7M8 9.5l3-2.8M2.5 11v1.8c0 .4.3.7.7.7h9.6c.4 0 .7-.3.7-.7V11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="m10.4 10.4 3.1 3.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function DWNav() {
  return (
    <div className="dw-nav-bar">
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
            {/* Logged-in state per the redesign: avatar instead of LOG IN/SIGN UP. */}
            <a
              href="https://www.dailywire.com/account"
              className="dw-nav-avatar"
              aria-label="Account"
            >
              ST
            </a>
          </div>
        </nav>
      </div>
    </div>
  );
}
