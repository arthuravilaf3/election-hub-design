// THE race selector: underlined tabs, one component, two homes — the map
// card header and the state detail panel. Extracted so the two can never
// drift apart (they were a floating pill and a set of panel tabs before; the
// pill read as a global player control, not as "which race am I looking at").
//
// Semantics: a real tablist. Arrow keys/Home/End move AND select (selection
// follows focus, per the ARIA tabs pattern), the selected tab is the single
// tab stop, and disabled chambers — a state with no Senate race, say — are
// skipped by the arrows instead of being landed on.
import { useRef } from 'react';
import { CHAMBER_LABEL } from '../data/summary';
import type { Chamber } from '../data/types';

const CHAMBERS: Chamber[] = ['house', 'senate', 'governor'];

interface RaceTabsProps {
  chamber: Chamber;
  /** Panel only: whether the zoomed state races in each chamber. */
  availability?: Record<Chamber, boolean>;
  /** id of the region these tabs drive (the map, or the panel body). */
  controls?: string;
  /** Tab ids. A second instance of the same tabs (the pinned copy, the
   *  panel) MUST pass its own prefix — duplicate ids on focusable elements
   *  make every aria-labelledby pointing at them ambiguous. */
  idPrefix?: string;
  label?: string;
  className?: string;
  onChamber: (chamber: Chamber) => void;
}

export function RaceTabs({
  chamber,
  availability,
  controls,
  idPrefix = 'race-tab',
  label = 'Race',
  className,
  onChamber,
}: RaceTabsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isOn = (c: Chamber) => availability?.[c] ?? true;
  // If the selected chamber is somehow unavailable, the first live tab keeps
  // the group reachable by keyboard.
  const tabStop = isOn(chamber) ? chamber : CHAMBERS.find(isOn) ?? chamber;

  const onKeyDown = (e: React.KeyboardEvent) => {
    const live = CHAMBERS.filter(isOn);
    if (live.length < 2) return;
    let target: Chamber | undefined;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      target = live[(live.indexOf(chamber) + 1 + live.length) % live.length];
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      target = live[(live.indexOf(chamber) - 1 + live.length) % live.length];
    } else if (e.key === 'Home') {
      target = live[0];
    } else if (e.key === 'End') {
      target = live[live.length - 1];
    }
    if (!target) return;
    e.preventDefault();
    onChamber(target);
    // Focus follows selection; preventScroll because these tabs can sit
    // inside the scroll-locked detail modal.
    ref.current
      ?.querySelector<HTMLButtonElement>(`[data-chamber="${target}"]`)
      ?.focus({ preventScroll: true });
  };

  return (
    <div
      className={`race-tabs${className ? ` ${className}` : ''}`}
      role="tablist"
      aria-label={label}
      ref={ref}
      // Roving tabindex (ARIA tabs pattern): the selected TAB is the tab
      // stop; the list itself only routes the arrow keys.
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      {CHAMBERS.map((c) => (
        <button
          key={c}
          type="button"
          role="tab"
          id={`${idPrefix}-${c}`}
          data-chamber={c}
          aria-selected={chamber === c}
          aria-controls={controls}
          tabIndex={c === tabStop ? 0 : -1}
          disabled={!isOn(c)}
          title={isOn(c) ? undefined : `No ${CHAMBER_LABEL[c]} race in this state`}
          className={`race-tab${chamber === c ? ' is-active' : ''}`}
          onClick={() => onChamber(c)}
        >
          {CHAMBER_LABEL[c]}
        </button>
      ))}
    </div>
  );
}
