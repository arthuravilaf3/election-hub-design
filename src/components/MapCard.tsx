/**
 * THE MAP CARD — the map and the control that decides whose numbers paint it.
 *
 * Only the SOURCE selector lives in here, floating over the map area: it is
 * the one control whose effect is the map itself. The race tabs, the headline,
 * its byline and the seat bar are page-level and live in RaceHeader above.
 *
 * PORTABILITY: this component reads nothing outside itself. Give it props and
 * it renders complete and correct anywhere — no page chrome, no positional
 * coupling.
 */
import { ElectionMap } from './ElectionMap';
import { Legend } from './Legend';
import { MapSelectors } from './MapSelectors';
import type { Chamber, StateRace } from '../data/types';
import { CAMERA_MS, DRAWER_INSET, DRAWER_W } from '../data/layout';
import { CHAMBER_LABEL } from '../data/summary';

interface MapCardProps {
  races: Record<string, StateRace>;
  chamber: Chamber;
  sourceId: string;
  /** stateId -> trusted sourceId for this chamber. */
  trust: Record<string, string>;
  selectedId: string | null;
  zoomedId: string | null;
  staggering: boolean;
  flash: { stateId: string; nonce: number } | null;
  resultsMode: boolean;
  resultsSource?: string;
  /** Phase gate: the county choropleth is depth, not the base map. */
  showCounties?: boolean;
  /** The state detail panel, injected so the card owns no app state. */
  panel?: React.ReactNode;
  onChamber: (chamber: Chamber) => void;
  onSource: (sourceId: string) => void;
  onSelect: (stateId: string) => void;
  onZoom: (stateId: string) => void;
  onClearZoom: () => void;
}

export function MapCard({
  races,
  chamber,
  sourceId,
  trust,
  selectedId,
  zoomedId,
  staggering,
  flash,
  resultsMode,
  resultsSource,
  showCounties = true,
  panel,
  onChamber,
  onSource,
  onSelect,
  onZoom,
  onClearZoom,
}: MapCardProps) {
  return (
    <div className="map-block">
      {/* The card publishes the shared layout metrics, so the stylesheet
          consumes the TS constants instead of mirroring them. */}
      <div
        className={`map-card${zoomedId ? ' is-zoomed' : ''}`}
        style={
          {
            '--drawer-w': `${DRAWER_W}px`,
            '--drawer-inset': `${DRAWER_INSET}px`,
            '--camera-ms': `${CAMERA_MS}ms`,
          } as React.CSSProperties
        }
      >
      {/* Which race and whose data — over the map, because the map is what
          they change. They step aside while a state is zoomed: that frame
          belongs to the state and its panel. */}
      <MapSelectors
        chamber={chamber}
        sourceId={sourceId}
        resultsMode={resultsMode}
        resultsSource={resultsSource}
        onChamber={onChamber}
        onSource={onSource}
      />

      <div
        className="map-and-panel"
        id="map-region"
        aria-label={`United States ${CHAMBER_LABEL[chamber]} map`}
      >
        <ElectionMap
          races={races}
          chamber={chamber}
          sourceId={sourceId}
          trust={trust}
          selectedId={selectedId}
          zoomedId={zoomedId}
          staggering={staggering}
          flash={flash}
          showCounties={showCounties}
          onSelect={onSelect}
          onZoom={onZoom}
          onClearZoom={onClearZoom}
        />
        {panel}
      </div>

      </div>

      {/* Redesign Aug 2026: the read scale left the card and became its own
          row underneath — it documents the map, it is not part of it. The
          wrapper stays inside MapCard so the component keeps reading nothing
          outside its own props, and `.map-card` stays on the card itself
          (App.tsx scrolls to it by that class). */}
      <Legend
        mode={resultsMode ? 'results' : 'prediction'}
        hasTrust={Object.keys(trust).length > 0}
      />
    </div>
  );
}
