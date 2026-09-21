// The creative-layout switch (Sep 21 2026): three cuts of the creative
// edition, side by side in one build. Prototype chrome, like the theme
// toggle — it sits with the other floating controls and never prints in the
// mobile-preview frame (which inherits the stored choice).
import { track } from '../data/analytics';
import {
  CREATIVE_LAYOUTS,
  FEED_IDEAS,
  storeCreativeLayout,
  storeFeedIdea,
  type CreativeLayout,
  type FeedIdea,
} from '../data/creativeLayout';
import { IS_PREVIEW_FRAME } from './MobilePreview';

interface CreativeSwitcherProps {
  layout: CreativeLayout;
  onChange: (layout: CreativeLayout) => void;
  /** Which feed-reach idea is on — only layout 3 has a chapter to shorten. */
  idea: FeedIdea;
  onIdea: (idea: FeedIdea) => void;
}

export function CreativeSwitcher({ layout, onChange, idea, onIdea }: CreativeSwitcherProps) {
  if (IS_PREVIEW_FRAME) return null;

  const pick = (next: CreativeLayout) => {
    if (next === layout) return;
    onChange(next);
    storeCreativeLayout(next);
    track('creative_layout_change', { layout: next });
  };

  const pickIdea = (next: FeedIdea) => {
    if (next === idea) return;
    onIdea(next);
    storeFeedIdea(next);
    track('feed_idea_change', { idea: next });
  };

  return (
    <div className="switch-stack">
      <div className="layout-switch" role="radiogroup" aria-label="Creative layout">
        <span className="layout-switch-label" aria-hidden="true">
          Layout
        </span>
        {CREATIVE_LAYOUTS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === layout}
            className={`layout-switch-option${o.id === layout ? ' is-selected' : ''}`}
            title={`${o.id} · ${o.name} — ${o.hint}`}
            onClick={() => pick(o.id)}
          >
            {o.id}
            <span className="visually-hidden">
              {' '}
              — {o.name}: {o.hint}
            </span>
          </button>
        ))}
      </div>
      {/* The five ways to the feed, on the layout that has a chapter in
          between. Each is the real page, not a mock. */}
      {layout === 3 && (
        <div className="layout-switch" role="radiogroup" aria-label="Caminho até o feed">
          <span className="layout-switch-label" aria-hidden="true">
            Feed
          </span>
          {FEED_IDEAS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={o.id === idea}
              className={`layout-switch-option${o.id === idea ? ' is-selected' : ''}`}
              title={`${o.label} · ${o.name} — ${o.hint}`}
              onClick={() => pickIdea(o.id)}
            >
              {o.label}
              <span className="visually-hidden">
                {' '}
                — {o.name}: {o.hint}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
