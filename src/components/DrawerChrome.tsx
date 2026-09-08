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

export interface StateRef {
  id: string;
  name: string;
}

/** The panel's two views (redesign Sep 2026): the numbers, or the coverage. */
export type DrawerTab = 'data' | 'related';

const DRAWER_TABS: Array<{ id: DrawerTab; label: string }> = [
  { id: 'data', label: 'Data' },
  { id: 'related', label: 'Related content' },
];

/**
 * A real tablist: two tabs over one panel, arrows move between them, the
 * active one is underlined. Replaces the provider toggle that sat here — the
 * panel follows the map's source now, and this row chooses what KIND of
 * thing you are reading about the state, not whose numbers.
 */
export function DrawerTabs({ value, onChange }: { value: DrawerTab; onChange: (t: DrawerTab) => void }) {
  const onKey = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = DRAWER_TABS.length;
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % n;
    else if (e.key === 'ArrowLeft') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(DRAWER_TABS[next].id);
    (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus({ preventScroll: true });
  };
  return (
    <div className="drawer-tabs" role="tablist" aria-label="Panel view">
      {DRAWER_TABS.map((t, i) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`drawer-tab-${t.id}`}
          aria-selected={t.id === value}
          aria-controls="drawer-tabpanel"
          tabIndex={t.id === value ? 0 : -1}
          className={`drawer-tab${t.id === value ? ' is-active' : ''}`}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}
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
