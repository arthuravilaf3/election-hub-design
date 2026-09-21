// The option switch (Sep 21 2026): one link, three cuts — the base hub, the
// creative edition, the still-arc cut. Prototype chrome, like the theme
// toggle; only the options build shows it, and it never prints inside the
// mobile-preview frame (which inherits the stored choice). Picking one
// reloads the page: the edition is a constant read once at start.
import { OPTION, OPTIONS_BUILD, selectOption, type Extras, type Option } from '../data/edition';
import { IS_PREVIEW_FRAME } from './MobilePreview';

const OPTIONS: Array<{ id: Option; name: string; hint: string }> = [
  { id: 1, name: 'Base', hint: 'The hub with the dots header' },
  { id: 2, name: 'Creative', hint: 'Capitol strip, arc on scroll, The Nation Speaks' },
  { id: 3, name: 'Still arc', hint: 'Pinned timer and controls, still arc, chapter rail' },
];

interface OptionSwitcherProps {
  /** Option 2's extras and their setter — the second row of the switch. */
  extras: Extras;
  onExtras: (next: Extras) => void;
}

export function OptionSwitcher({ extras, onExtras }: OptionSwitcherProps) {
  if (!OPTIONS_BUILD || IS_PREVIEW_FRAME) return null;
  const toggles: Array<{ key: keyof Extras; label: string }> = [
    { key: 'capitol', label: 'Capitol' },
    { key: 'nation', label: 'Nation Speaks' },
  ];
  return (
    /* A landmark of its own (axe "region"): prototype chrome outside the
       page's main. */
    <aside className="switch-stack" aria-label="Prototype options">
      <div className="layout-switch" role="radiogroup" aria-label="Option">
        <span className="layout-switch-label" aria-hidden="true">
          Option
        </span>
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === OPTION}
            className={`layout-switch-option${o.id === OPTION ? ' is-selected' : ''}`}
            title={`${o.id} · ${o.name} — ${o.hint}`}
            onClick={() => {
              if (o.id !== OPTION) selectOption(o.id);
            }}
          >
            {o.id}
            <span className="visually-hidden">
              {' '}
              — {o.name}: {o.hint}
            </span>
          </button>
        ))}
      </div>
      {/* Option 2 only: the two creative pieces that ship off, each on its
          own toggle. */}
      {OPTION === 2 && (
        <div className="layout-switch layout-switch--extras" role="group" aria-label="Option 2 extras">
          {toggles.map((t) => (
            <button
              key={t.key}
              type="button"
              role="switch"
              aria-checked={extras[t.key]}
              className={`extra-toggle${extras[t.key] ? ' is-on' : ''}`}
              onClick={() => onExtras({ ...extras, [t.key]: !extras[t.key] })}
            >
              <span className="extra-toggle-knob" aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
