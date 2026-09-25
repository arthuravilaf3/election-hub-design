// The option switch (Sep 21 2026): one link, three cuts — the base hub, the
// creative edition, the still-arc cut. Prototype chrome, like the theme
// toggle; only the options build shows it, and it never prints inside the
// mobile-preview frame (which inherits the stored choice). Picking one
// reloads the page: the edition is a constant read once at start.
import { OPTION, OPTIONS_BUILD, type Option } from '../data/edition';
import { IS_PREVIEW_FRAME } from './MobilePreview';

/* Readings of the hero. Add or drop an entry here and the switch follows;
   with one left it renders nothing, which is where this stands since the
   bar-on-top cut was dropped (Sep 25 2026). Kept, rather than deleted, so
   the next pair of cuts is one line of work. */
const OPTIONS: Array<{ id: Option; name: string }> = [
  { id: 2, name: 'Bar under the headline' },
];

export function OptionSwitcher() {
  if (!OPTIONS_BUILD || IS_PREVIEW_FRAME || OPTIONS.length < 2) return null;
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
              if (o.id !== OPTION) {
                const url = new URL(window.location.href);
                url.searchParams.set('option', String(o.id));
                window.location.assign(url.toString());
              }
            }}
          >
            {o.id}
          </button>
        ))}
      </div>
    </aside>
  );
}
