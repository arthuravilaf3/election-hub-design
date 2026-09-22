// The option switch (Sep 21 2026): one link, three cuts — the base hub, the
// creative edition, the still-arc cut. Prototype chrome, like the theme
// toggle; only the options build shows it, and it never prints inside the
// mobile-preview frame (which inherits the stored choice). Picking one
// reloads the page: the edition is a constant read once at start.
import {
  OPTION,
  OPTIONS_BUILD,
  selectOption,
  type DotsShape,
  type Option,
} from '../data/edition';
import { IS_PREVIEW_FRAME } from './MobilePreview';

const OPTIONS: Array<{ id: Option; name: string }> = [
  { id: 1, name: 'Base' },
  { id: 2, name: 'Still arc' },
];

const SHAPES: Array<{ id: DotsShape; label: string }> = [
  { id: 'grid', label: 'Grid' },
  { id: 'arc', label: 'Arc' },
  { id: 'semi', label: 'Semi' },
];

interface OptionSwitcherProps {
  /** Option 1's dots shape and its setter — its second row. */
  shape: DotsShape;
  onShape: (next: DotsShape) => void;
}

export function OptionSwitcher({ shape, onShape }: OptionSwitcherProps) {
  if (!OPTIONS_BUILD || IS_PREVIEW_FRAME) return null;
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
            aria-label={`Option ${o.id}: ${o.name}`}
            className={`layout-switch-option${o.id === OPTION ? ' is-selected' : ''}`}
            onClick={() => {
              if (o.id !== OPTION) selectOption(o.id);
            }}
          >
            {o.id}
          </button>
        ))}
      </div>
      {/* Option 1 only: the shape the seats take. */}
      {OPTION === 1 && (
        <div className="layout-switch" role="radiogroup" aria-label="Dots shape">
          <span className="layout-switch-label" aria-hidden="true">
            Dots
          </span>
          {SHAPES.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={o.id === shape}
              className={`layout-switch-option layout-switch-option--word${o.id === shape ? ' is-selected' : ''}`}
              onClick={() => onShape(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
