// The floating dock: House / Senate / Governor chips plus the Sources
// dropdown, one pill fixed to the bottom of the viewport.
//
// Semantics: chambers stay native radios (arrow keys work); the dropdown is a
// disclosure button + menu that opens UPWARD. One source at a time colors the
// map — the trigger names the ACTIVE source (sources are never blended).
// Chips are static: hover changes color only (design decision — no
// magnification).
import { useEffect, useRef, useState } from 'react';
import { SOURCES, sourceLabel } from '../data/sources';
import type { Chamber } from '../data/types';
import { CHAMBER_LABEL } from '../data/summary';

const CHAMBERS: Chamber[] = ['house', 'senate', 'governor'];

interface DockProps {
  chamber: Chamber;
  sourceId: string;
  sourcesDisabled: boolean;
  onChamber: (chamber: Chamber) => void;
  onSource: (sourceId: string) => void;
}

export function Dock({ chamber, sourceId, sourcesDisabled, onChamber, onSource }: DockProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Click-outside and Escape both close the menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div className="dock-pill">
      <fieldset className="dock">
        <legend className="visually-hidden">Chamber</legend>
        <div className="dock-options">
          {CHAMBERS.map((c) => (
            <label key={c} className="dock-option">
              <input
                type="radio"
                name="chamber"
                value={c}
                checked={chamber === c}
                onChange={() => onChamber(c)}
              />
              <span className="dock-label">{CHAMBER_LABEL[c]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <span className="dock-divider" aria-hidden="true" />

      <div className="dock-sources" ref={menuRef}>
        <button
          type="button"
          className="dock-sources-trigger"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          disabled={sourcesDisabled}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {sourceLabel(sourceId)}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className={menuOpen ? 'is-flipped' : undefined}
          >
            <path
              d="m4 6.5 4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {menuOpen && (
          <div className="dock-menu" role="menu" aria-label="Data source">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="menuitemradio"
                aria-checked={s.id === sourceId}
                className={`dock-menu-item${s.id === sourceId ? ' is-active' : ''}`}
                onClick={() => {
                  onSource(s.id);
                  setMenuOpen(false);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
