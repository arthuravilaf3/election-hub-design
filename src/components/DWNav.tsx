// The dailywire.com site nav, redrawn from the DW WIP Q3 Figma "Header (Web)"
// (Sep 2026): 64px bar, 64px side padding, hairline underneath, pill-shaped
// 32px items on the left, the wordmark dead centre, Download App / Search /
// divider / avatar on the right. "The Midterms" joins the section links set
// in the blue→red gradient (decided Sep 2026 over the dot-mark option).
//
// The site renders this in light mode (#FAFAFA); the Election Hub is a DW+
// dark-mode surface, so the same semantic tokens resolve dark here.
//
// Chrome only: nothing in this bar may use the party data-viz TOKENS. The
// gradient's colours are the comp's own literals, kept as an identity
// palette (see .dw-nav-link--gradient), not as a reading of any race.
import { useEffect, useRef, useState, type MouseEvent } from 'react';
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

/** The Midterms dropdown: the hub's two destinations. */
const MIDTERMS_MENU = [
  { id: 'map', label: 'Midterms Election Map', sub: 'Every race, two sources, one map', href: 'https://www.dailywire.com/midterms' },
  { id: 'play', label: 'Make your Prediction', sub: 'Call the races and track your streak', href: 'https://www.dailywire.com/midterms/predict' },
];

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

export function DWNav() {
  // Which page the nav believes it is on. The hub IS the map page, so it
  // starts on The Midterms.
  const [current, setCurrent] = useState(MIDTERMS_ID);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);
  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    setCurrent(id);
  };
  return (
    <div className="dw-nav-bar">
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
            <div className="dw-nav-menu-wrap" ref={menuRef}>
              <a
                href="https://www.dailywire.com/midterms"
                className={`dw-nav-link dw-nav-link--midterms dw-nav-link--gradient${
                  current === MIDTERMS_ID ? ' is-active' : ''
                }${menuOpen ? ' is-open' : ''}`}
                aria-current={current === MIDTERMS_ID ? 'page' : undefined}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpen((v) => !v);
                }}
              >
                <span className="dw-nav-midterms-label">The Midterms</span>
                {/* DS utility chevron, small: Tabler chevron-down at 14px. */}
                <svg className="dw-nav-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              {menuOpen && (
                <div className="dw-nav-menu" role="menu" aria-label="The Midterms">
                  {MIDTERMS_MENU.map((m) => (
                    <a
                      key={m.id}
                      href={m.href}
                      role="menuitem"
                      className="dw-nav-menu-item"
                      onClick={(e) => {
                        e.preventDefault();
                        setMenuOpen(false);
                        setCurrent(MIDTERMS_ID);
                      }}
                    >
                      <span className="dw-nav-menu-title">{m.label}</span>
                      <span className="dw-nav-menu-sub">{m.sub}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
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
