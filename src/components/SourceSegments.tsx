// The source selector, INSIDE the map area: all three providers visible at
// once, each with its brand and what kind of number it publishes. Nothing is
// hidden behind a dropdown — PRD tenet 1, "no single source should look like
// the truth", is a layout decision as much as a copy one.
//
// One source at a time colors the map (never blended); the selection lives in
// the reducer, so it survives race switches.
//
// In results mode there is no choice — static attribution instead.
import { SOURCES, sourceKind, sourceLabel } from '../data/sources';

/* Brand wordmarks painted from the ink token via CSS mask, so the "white" is
   really var(--ink) and the light theme flips it. DDHQ has no public vector —
   its label is styled AS a wordmark until the official SVG lands. */
const LOGO_SLUG: Record<string, string> = {
  kalshi: 'kalshi',
  polymarket: 'polymarket',
};

export function SourceName({ id }: { id: string }) {
  const slug = LOGO_SLUG[id];
  if (!slug) return <span className="source-wordmark">{sourceLabel(id)}</span>;
  return (
    <>
      <i className={`source-logo source-logo--${slug}`} aria-hidden="true" />
      <span className="visually-hidden">{sourceLabel(id)}</span>
    </>
  );
}

interface SourceSegmentsProps {
  sourceId: string;
  /** True once results are live. */
  resultsMode: boolean;
  /** Attribution shown in results mode. */
  resultsSource?: string;
  onSource: (sourceId: string) => void;
}

export function SourceSegments({
  sourceId,
  resultsMode,
  resultsSource,
  onSource,
}: SourceSegmentsProps) {
  if (resultsMode) {
    return (
      <p className="source-byline seg-results">
        Results by {resultsSource ?? 'the certified feed'}
      </p>
    );
  }

  return (
    <div className="seg-control" role="radiogroup" aria-label="Forecast source">
      {SOURCES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={s.id === sourceId}
          aria-label={`Forecast by ${sourceLabel(s.id)}, ${sourceKind(s.id)}`}
          data-source={s.id}
          className={`seg${s.id === sourceId ? ' is-active' : ''}`}
          onClick={() => onSource(s.id)}
        >
          <span className="seg-brand">
            <SourceName id={s.id} />
          </span>
          <span className="seg-kind">{sourceKind(s.id)}</span>
        </button>
      ))}
    </div>
  );
}
