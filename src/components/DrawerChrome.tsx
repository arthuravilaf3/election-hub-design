// Shared drawer chrome (redesign Aug 2026): the source row under the title,
// and the prev/next state navigation pinned to the drawer's bottom corners.
//
// The chamber tabs that used to sit here are gone — the redesign moves the
// chamber into the top bar's breadcrumb as a label, and gives this row to the
// source instead. Switching races is the page header's job now.
//
// Arrows are the design system's Tabler icons (the DS icon set — the promo
// bar's arrow is `tabler-icon-arrow-right`), drawn with Tabler's official
// paths.
import { SOURCES, sourceLabel } from '../data/sources';
import { fillFor } from '../data/encoding';
import type { StateRace } from '../data/types';

export interface StateRef {
  id: string;
  name: string;
}

interface SourceTabsProps {
  race: StateRace;
  /** Which read the drawer is currently showing. */
  value: string;
  onChange: (sourceId: string) => void;
}

/**
 * Which provider's read this panel is showing. LOCAL to the drawer: it does
 * NOT repaint the map and it is NOT the trust pick — the map keeps the global
 * source, and "Sources compared" below still shows all three side by side, so
 * no single provider gets to look like the truth (hub tenet 2).
 *
 * A radiogroup, not a tablist: the row switches values inside one view rather
 * than swapping panels, and tab semantics would need tabpanel plumbing that
 * would be a lie about the structure below.
 */
export function SourceTabs({ race, value, onChange }: SourceTabsProps) {
  return (
    <div className="drawer-sources" role="radiogroup" aria-label="Reading from">
      {SOURCES.map((src) => {
        const active = src.id === value;
        return (
          <button
            key={src.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={`drawer-src${active ? ' is-active' : ''}`}
            onClick={() => onChange(src.id)}
          >
            {/* The dot is this provider's own read of THIS race — the row
                previews the disagreement before you switch to it. */}
            <span
              className="drawer-src-dot"
              style={{ background: fillFor(race, src.id) }}
              aria-hidden="true"
            />
            {sourceLabel(src.id)}
          </button>
        );
      })}
    </div>
  );
}

function ArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14M5 12l6 6M5 12l6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14m-6 6 6-6m-6-6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface DrawerNavProps {
  prev: StateRef;
  next: StateRef;
  onNavigate: (stateId: string) => void;
}

/** Prev/next state, bottom corners — the label names the destination so the
 *  reader knows where the arrow lands before clicking. */
export function DrawerNav({ prev, next, onNavigate }: DrawerNavProps) {
  return (
    <footer className="drawer-nav">
      <button
        type="button"
        className="drawer-nav-btn"
        onClick={() => onNavigate(prev.id)}
        aria-label={`Previous state: ${prev.name}`}
      >
        <ArrowLeft />
        {prev.name}
      </button>
      <button
        type="button"
        className="drawer-nav-btn"
        onClick={() => onNavigate(next.id)}
        aria-label={`Next state: ${next.name}`}
      >
        {next.name}
        <ArrowRight />
      </button>
    </footer>
  );
}
