// Shared drawer chrome (redesign Aug 2026): the source row under the title,
// and the prev/next state navigation pinned to the drawer's bottom corners.
//
// The tabs row is the state's races (Sep 2026): one tab per chamber the
// state has on the ballot, driving the map's chamber.
//
// Arrows are the design system's Tabler icons (the DS icon set — the promo
// bar's arrow is `tabler-icon-arrow-right`), drawn with Tabler's official
// paths.

export interface StateRef {
  id: string;
  name: string;
}

/** One tab per race the state has on the ballot (Sep 2026): U.S. House,
    U.S. Senate, Governor. Picking one switches the whole map's chamber —
    the panel and the map always show the same race. */
export interface DrawerTabItem {
  id: string;
  label: string;
}

/**
 * A real tablist over one panel: arrows move between tabs, the active one
 * is underlined.
 */
export function DrawerTabs({
  tabs,
  value,
  onChange,
  label = 'Race',
}: {
  tabs: DrawerTabItem[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const onKey = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = tabs.length;
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % n;
    else if (e.key === 'ArrowLeft') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus({ preventScroll: true });
  };
  return (
    <div className="drawer-tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
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
