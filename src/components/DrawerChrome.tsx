// Shared drawer chrome (Aug 2026): the chamber tabs under the title, and the
// prev/next state navigation pinned to the drawer's bottom corners.
//
// Arrows are the design system's Tabler icons (the DS icon set — the promo
// bar's arrow is `tabler-icon-arrow-right`), drawn with Tabler's official
// paths.
import type { Chamber } from '../data/types';
import { CHAMBER_LABEL } from '../data/summary';

const CHAMBERS: Chamber[] = ['house', 'senate', 'governor'];

export interface StateRef {
  id: string;
  name: string;
}

interface ChamberTabsProps {
  chamber: Chamber;
  /** Whether the zoomed state has a race in each chamber — absent = disabled tab. */
  availability: Record<Chamber, boolean>;
  onChamber: (chamber: Chamber) => void;
}

/** DS tabs: switch the drawer (and the map behind it) between chambers.
 *  Replaces the floating dock while the drawer is open. */
export function ChamberTabs({ chamber, availability, onChamber }: ChamberTabsProps) {
  return (
    <div className="drawer-tabs" role="tablist" aria-label="Chamber">
      {CHAMBERS.map((c) => (
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={chamber === c}
          disabled={!availability[c]}
          title={availability[c] ? undefined : `No ${CHAMBER_LABEL[c]} race in this state`}
          className={`drawer-tab${chamber === c ? ' is-active' : ''}`}
          onClick={() => onChamber(c)}
        >
          {CHAMBER_LABEL[c]}
        </button>
      ))}
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
