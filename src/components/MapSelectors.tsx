/**
 * The map's two controls (redesign Sep 2026): RACE and SOURCE, side by side
 * as labelled pills over the map card.
 *
 * They replace the header's race tabs and the three-up source segments. Note
 * what that costs: the segments showed all three providers at once precisely
 * so no single source could look like the truth (hub tenet 2), and a dropdown
 * shows one. The side-by-side comparison still exists — it moved to "Sources
 * compared" inside the state drawer, which is now the only place the three
 * reads sit together.
 *
 * A listbox, not a native <select>: the pill carries a label above its value
 * and the options carry a second line, neither of which a <select> can style.
 * The keyboard contract is the one a select has — arrows move, Enter/Space
 * commits, Escape closes and hands focus back.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { SOURCES, sourceKind, sourceLabel } from '../data/sources';
import { CHAMBER_LABEL } from '../data/summary';
import type { Chamber } from '../data/types';

export interface PillOption {
  id: string;
  label: string;
  /** Optional second line in the menu — what kind of number a source is. */
  hint?: string;
}

interface PillSelectProps {
  label: string;
  value: string;
  options: PillOption[];
  onChange: (id: string) => void;
}

function Chevron() {
  return (
    <svg className="pill-chevron" width="14" height="8" viewBox="0 0 14 8" fill="none" aria-hidden="true">
      <path d="m1 1 6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PillSelect({ label, value, options, onChange }: PillSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const selected = options.findIndex((o) => o.id === value);
  const current = options[selected] ?? options[0];

  // Opening starts on the current value, not at the top.
  const openMenu = () => {
    setActive(selected < 0 ? 0 : selected);
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Move DOM focus with the active option so a screen reader follows along.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.focus({ preventScroll: true });
  }, [open, active]);

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(options[active].id);
      close();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className="pill-wrap" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={`pill${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            openMenu();
          }
        }}
      >
        <span className="pill-text">
          <span className="pill-label" id={`${id}-label`}>
            {label}
          </span>
          <span className="pill-value" id={`${id}-value`}>
            {current?.label}
          </span>
        </span>
        <Chevron />
      </button>

      {open && (
        <ul className="pill-menu" role="listbox" aria-label={label} ref={listRef}>
          {options.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={o.id === value}
              tabIndex={i === active ? 0 : -1}
              data-option={o.id}
              className={`pill-option${o.id === value ? ' is-selected' : ''}`}
              /* On the option, not the list: focus lives here while the menu
                 is open, so this is where the keys actually land. */
              onKeyDown={onListKey}
              onClick={() => {
                onChange(o.id);
                close();
              }}
            >
              <span className="pill-option-label">{o.label}</span>
              {o.hint && <span className="pill-option-hint">{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const CHAMBERS: Chamber[] = ['house', 'senate', 'governor'];

interface MapSelectorsProps {
  chamber: Chamber;
  sourceId: string;
  /** True once results are live — the source stops being a choice. */
  resultsMode: boolean;
  resultsSource?: string;
  onChamber: (chamber: Chamber) => void;
  onSource: (sourceId: string) => void;
}

export function MapSelectors({
  chamber,
  sourceId,
  resultsMode,
  resultsSource,
  onChamber,
  onSource,
}: MapSelectorsProps) {
  return (
    <div className="map-selectors">
      <PillSelect
        label="Race"
        value={chamber}
        options={CHAMBERS.map((c) => ({ id: c, label: CHAMBER_LABEL[c] }))}
        onChange={(id) => onChamber(id as Chamber)}
      />

      {resultsMode ? (
        /* No choice on election night: one certified feed, named. */
        <p className="source-byline seg-results">Results by {resultsSource ?? 'the certified feed'}</p>
      ) : (
        <PillSelect
          label="Source"
          value={sourceId}
          options={SOURCES.map((s) => ({
            id: s.id,
            label: sourceLabel(s.id),
            hint: sourceKind(s.id),
          }))}
          onChange={onSource}
        />
      )}
    </div>
  );
}
