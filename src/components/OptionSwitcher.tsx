// The option switch (Sep 21 2026): one link, three cuts — the base hub, the
// creative edition, the still-arc cut. Prototype chrome, like the theme
// toggle; only the options build shows it, and it never prints inside the
// mobile-preview frame (which inherits the stored choice). Picking one
// reloads the page: the edition is a constant read once at start.
//
// Every control carries a tooltip (hover or focus) saying what it changes
// and WHERE on the page — the switch is a review tool, and reviewers land
// on it cold.
import { useId } from 'react';
import {
  OPTION,
  OPTIONS_BUILD,
  selectOption,
  type DotsShape,
  type Extras,
  type Option,
} from '../data/edition';
import { IS_PREVIEW_FRAME } from './MobilePreview';

interface TipText {
  /** What this control is / does. */
  what: string;
  /** Where on the page it shows. */
  where: string;
}

const OPTIONS: Array<{ id: Option; name: string; tip: TipText }> = [
  {
    id: 1,
    name: 'Base',
    tip: {
      what: 'The hub as shipped: "The Midterms" masthead, the seats as dots beside the headline, the clock under the seat counts, race segments and the source pill over the map, a game call in the hero.',
      where: 'Whole page. The DOTS row below changes the shape of the seats.',
    },
  },
  {
    id: 2,
    name: 'Creative',
    tip: {
      what: 'The creative edition: the arc mark large in the masthead (no \'26), the seat line under the headline, the arc that builds on scroll after the map, and the chapter rail on the left edge.',
      where: 'Masthead, hero, after the map. The CAPITOL and NATION SPEAKS toggles below add two more pieces.',
    },
  },
  {
    id: 3,
    name: 'Still arc',
    tip: {
      what: 'The still-arc cut (Figma option): the clock pinned with House / Senate / Governor and the Polymarket chip, the seats as a still arc under the seat line, the map edge to edge, the chapter rail.',
      where: 'Hero (between the seat line and the map), the pinned controls at the bottom, the left edge.',
    },
  },
];

const SHAPES: Array<{ id: DotsShape; label: string; tip: TipText }> = [
  { id: 'grid', label: 'Grid', tip: { what: 'The seats as the comp\'s grid — Republicans from the top, Democrats from the bottom, toss-ups where they meet.', where: 'Hero, right of the headline.' } },
  { id: 'arc', label: 'Arc', tip: { what: 'The seats on a full 180° hemicycle — Democrats left, toss-ups at the crown, Republicans right. Same hover as the grid.', where: 'Hero, right of the headline.' } },
  { id: 'semi', label: 'Semi', tip: { what: 'The seats on a shallower 140° arch with deeper rows — same reading and hover as the arc.', where: 'Hero, right of the headline.' } },
];

const EXTRAS: Array<{ key: keyof Extras; label: string; tip: TipText }> = [
  { key: 'capitol', label: 'Capitol', tip: { what: 'Turns on the Capitol strip: a blue and a red print of the dome sliding in from the page edges and overlapping on the toss-ups, with parallax.', where: 'Right after the map card, before the arc.' } },
  { key: 'nation', label: 'Nation Speaks', tip: { what: 'Turns on the Cosmos waveform with "The Nation Speaks. Can you predict their voices?"', where: 'After the arc, before the game banner.' } },
];

/** A control with its tooltip: shown on hover or keyboard focus, read by
    assistive tech through aria-describedby. */
function Tip({ tip, children }: { tip: TipText; children: (describedBy: string) => React.ReactNode }) {
  const id = useId();
  return (
    <span className="tip-wrap">
      {children(id)}
      <span className="tip" role="tooltip" id={id}>
        {tip.what}
        <span className="tip-where">Where: {tip.where}</span>
      </span>
    </span>
  );
}

interface OptionSwitcherProps {
  /** Option 2's extras and their setter — the second row of the switch. */
  extras: Extras;
  onExtras: (next: Extras) => void;
  /** Option 1's dots shape and its setter — its second row. */
  shape: DotsShape;
  onShape: (next: DotsShape) => void;
}

export function OptionSwitcher({ extras, onExtras, shape, onShape }: OptionSwitcherProps) {
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
          <Tip key={o.id} tip={o.tip}>
            {(describedBy) => (
              <button
                type="button"
                role="radio"
                aria-checked={o.id === OPTION}
                aria-label={`Option ${o.id}: ${o.name}`}
                aria-describedby={describedBy}
                className={`layout-switch-option${o.id === OPTION ? ' is-selected' : ''}`}
                onClick={() => {
                  if (o.id !== OPTION) selectOption(o.id);
                }}
              >
                {o.id}
              </button>
            )}
          </Tip>
        ))}
      </div>
      {/* Option 1 only: the shape the seats take. */}
      {OPTION === 1 && (
        <div className="layout-switch" role="radiogroup" aria-label="Dots shape">
          <span className="layout-switch-label" aria-hidden="true">
            Dots
          </span>
          {SHAPES.map((o) => (
            <Tip key={o.id} tip={o.tip}>
              {(describedBy) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={o.id === shape}
                  aria-describedby={describedBy}
                  className={`layout-switch-option layout-switch-option--word${o.id === shape ? ' is-selected' : ''}`}
                  onClick={() => onShape(o.id)}
                >
                  {o.label}
                </button>
              )}
            </Tip>
          ))}
        </div>
      )}
      {/* Option 2 only: the two creative pieces that ship off, each on its
          own toggle. */}
      {OPTION === 2 && (
        <div className="layout-switch layout-switch--extras" role="group" aria-label="Option 2 extras">
          {EXTRAS.map((t) => (
            <Tip key={t.key} tip={t.tip}>
              {(describedBy) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={extras[t.key]}
                  aria-describedby={describedBy}
                  className={`extra-toggle${extras[t.key] ? ' is-on' : ''}`}
                  onClick={() => onExtras({ ...extras, [t.key]: !extras[t.key] })}
                >
                  <span className="extra-toggle-knob" aria-hidden="true" />
                  {t.label}
                </button>
              )}
            </Tip>
          ))}
        </div>
      )}
    </aside>
  );
}
