// The roadmap, made demonstrable: switch the prototype between delivery
// phases so the MVP can be shown as the MVP — nothing from a later phase
// on screen implying it ships with the first one.
//
// Each chip names its phase on hover/focus and links out to the PRD page it
// answers to, because "Fase 2" alone means nothing three weeks later.
//
// Demo chrome, not product: it sits with the theme/preview controls and is
// hidden inside the mobile preview frame.
import { useState } from 'react';
import { track } from '../data/analytics';
import {
  PHASES,
  PHASE_JOB,
  PHASE_LABEL,
  PHASE_PRD,
  PHASE_TITLE,
  rememberPhase,
  type Phase,
} from '../data/phases';
import { IS_PREVIEW_FRAME } from './MobilePreview';

interface PhaseSwitcherProps {
  phase: Phase;
  onPhase: (phase: Phase) => void;
}

export function PhaseSwitcher({ phase, onPhase }: PhaseSwitcherProps) {
  // The card stays open while the pointer or focus is anywhere inside the
  // chip's wrapper — otherwise the link inside it could never be reached.
  const [open, setOpen] = useState<Phase | null>(null);

  if (IS_PREVIEW_FRAME) return null; // the framed copy inherits the choice

  const pick = (next: Phase) => {
    if (next === phase) return;
    rememberPhase(next);
    track('phase_switch', { phase: next });
    onPhase(next);
  };

  return (
    // The landmark and the radio group are separate elements on purpose: a
    // role on the <aside> would REPLACE its complementary landmark, which is
    // exactly what left this control outside every landmark before.
    <aside className="phase-switcher" aria-label="Prototype controls">
      <span className="phase-switcher-label" aria-hidden="true">
        Phase
      </span>
      <div className="phase-chips" role="radiogroup" aria-label="Delivery phase">
        {PHASES.map((p) => (
          <span
            key={p}
            className="phase-chip-wrap"
            onPointerEnter={() => setOpen(p)}
            onPointerLeave={() => setOpen((cur) => (cur === p ? null : cur))}
            onFocusCapture={() => setOpen(p)}
            onBlurCapture={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setOpen((cur) => (cur === p ? null : cur));
              }
            }}
          >
            <button
              type="button"
              role="radio"
              aria-checked={p === phase}
              aria-label={`${PHASE_LABEL[p]} — ${PHASE_TITLE[p]}`}
              data-phase={p}
              className={`phase-chip${p === phase ? ' is-active' : ''}`}
              onClick={() => pick(p)}
            >
              {p === 4 ? '★' : p}
            </button>

            {open === p && (
              <span className="phase-card" role="presentation">
                <span className="phase-card-eyebrow">{PHASE_LABEL[p]}</span>
                <span className="phase-card-title">{PHASE_TITLE[p]}</span>
                <span className="phase-card-job">{PHASE_JOB[p]}</span>
                <a
                  className="phase-card-link"
                  href={PHASE_PRD[p].href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {PHASE_PRD[p].label}
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M4 2h6v6M10 2 2.5 9.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </span>
            )}
          </span>
        ))}
      </div>
    </aside>
  );
}
