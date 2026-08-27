// Related Content tab inside the map drawer: a mini feed over the SAME
// mock stream as the main Coverage Feed, in the same order, pre-filtered
// to the drawer's state (items whose race tag belongs to it). On top:
// a search bar, compact kind pills, and — once a kind filter is active —
// a secondary STATE dropdown (the drawer state is just the default lens).
// Clicking an item marks it visited (no article page yet), shared with the
// main feed via the persisted visited store.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_ITEMS, FILTERS, KIND_LABEL, TAGGED_STATE_IDS } from '../data/feedItems';
import type { ItemKind } from '../data/feedItems';
import { isVisited, markVisited } from '../data/visited';
import { STATE_SHAPES } from '../data/states';
import { track } from '../data/analytics';

function stateNameOf(id: string): string {
  return STATE_SHAPES.find((s) => s.id === id)?.name ?? id;
}

export function RelatedContent({ stateId }: { stateId: string }) {
  const [kind, setKind] = useState<ItemKind | 'all'>('all');
  const [scope, setScope] = useState(stateId); // secondary state filter
  const [query, setQuery] = useState('');
  const [stateMenuOpen, setStateMenuOpen] = useState(false);
  const [, bumpVisited] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stateMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setStateMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStateMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [stateMenuOpen]);

  // States offered by the secondary filter: every state with tagged
  // coverage, plus the drawer's own state (even when it has none — the
  // empty state is honest, not hidden).
  const scopeOptions = useMemo(
    () => [...new Set([stateId, ...TAGGED_STATE_IDS])],
    [stateId]
  );

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_ITEMS.filter((i) => {
      if (!i.tag || !i.tag.startsWith(scope)) return false;
      if (kind !== 'all' && i.kind !== kind) return false;
      if (q && !`${i.headline} ${i.author}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [scope, kind, query]);

  const pickKind = (id: ItemKind | 'all') => {
    setKind(id);
    // Kind cleared → the secondary filter goes away; return to the drawer's
    // own state so the tab always reopens honest to its context.
    if (id === 'all') setScope(stateId);
    track('related_filter_change', { state: scope, kind: id });
  };

  return (
    <div className="related">
      <input
        type="search"
        className="related-search"
        placeholder={`Search ${stateNameOf(scope)} coverage…`}
        aria-label="Search related coverage"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          track('related_search', { q: e.target.value.length });
        }}
      />

      <div className="related-bar" role="group" aria-label="Filter related content">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`related-pill${kind === f.id ? ' is-active' : ''}`}
            aria-pressed={kind === f.id}
            onClick={() => pickKind(f.id)}
          >
            {f.label}
          </button>
        ))}

        {/* Secondary state filter — only once a content kind is active. */}
        {kind !== 'all' && (
          <div className="related-state-anchor" ref={menuRef}>
            <button
              type="button"
              className="related-pill related-state-trigger"
              aria-haspopup="menu"
              aria-expanded={stateMenuOpen}
              onClick={() => setStateMenuOpen((v) => !v)}
            >
              {stateNameOf(scope)}
              <svg width="10" height="5" viewBox="0 0 12 6" fill="none" aria-hidden="true">
                <path
                  d="m1 1 5 4 5-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {stateMenuOpen && (
              <div className="host-menu related-state-menu" role="menu" aria-label="Filter by state">
                {scopeOptions.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={scope === id}
                    className={`dock-menu-item${scope === id ? ' is-active' : ''}`}
                    onClick={() => {
                      setScope(id);
                      setStateMenuOpen(false);
                      track('related_state_change', { state: id });
                    }}
                  >
                    {stateNameOf(id)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="related-empty">
          No {kind === 'all' ? '' : `${KIND_LABEL[kind as ItemKind].toLowerCase()} `}coverage for{' '}
          {stateNameOf(scope)}
          {query.trim() ? ` matching “${query.trim()}”` : ''} yet.
        </p>
      ) : (
        <ul className="related-list">
          {items.map((item) => {
            const opinion = item.kind === 'opinion';
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`related-item${opinion ? ' related-item--opinion' : ''}${
                    isVisited(item.id) ? ' is-visited' : ''
                  }`}
                  // No article page yet — the click marks the item visited.
                  onClick={() => {
                    markVisited(item.id);
                    bumpVisited((n) => n + 1);
                    track('related_item_click', { id: item.id, kind: item.kind });
                  }}
                >
                  <span className="related-kicker">
                    {KIND_LABEL[item.kind]}
                    {' · '}
                    {item.time}
                  </span>
                  <span className="related-headline">{item.headline}</span>
                  <span className="related-meta">
                    {item.author} · {item.metaTail}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
