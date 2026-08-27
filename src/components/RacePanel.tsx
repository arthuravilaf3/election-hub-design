/**
 * The state drawer (redesign Aug 2026, "Tapping on Any State" frame):
 * header (state, share, close), Candidates with photo-bars that count up
 * from 0, the cross-source comparison, and — for the House — the state's
 * full delegation as 2-up district blocks.
 * (The source tab bar was dropped — the comparison below covers it.)
 *
 * TENET 2 GUARD: in results mode the drawer shows only results (status,
 * reporting, feed attribution) — no estimates beside a live count.
 */
import { useEffect, useRef, useState } from 'react';
import { ChamberTabs, DrawerNav, type StateRef } from './DrawerChrome';
import {
  PARTY_LABEL,
  RATING_LABEL,
  freshnessOf,
  leanOf,
  ratingOf,
  readFor,
  readLine,
  statusLine,
} from '../data/encoding';
import { SOURCES, sourceKind, sourceLabel } from '../data/sources';
import { CHAMBER_LABEL } from '../data/summary';
import { districtLabel } from '../data/districts';
import type { Candidate, Chamber, District, StateRace } from '../data/types';

const GROW_MS = 800;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** PLACEHOLDER portraits (mock-licensed stock, public/candidates/) — the same
 *  six faces repeat across states by design; real data brings real photos.
 *  Pools split by the fixture name lists' genders so photo and name agree. */
const PHOTOS_M = ['c0', 'c2', 'c4'];
const PHOTOS_F = ['c1', 'c3', 'c5'];
const FEMALE_FIRST = new Set(['Becky', 'Laura', 'Angela', 'Sarah', 'Maria', 'Grace', 'Nancy', 'Rachel', 'Jill', 'Dana']);

function photoFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  const pool = FEMALE_FIRST.has(name.split(' ')[0]) ? PHOTOS_F : PHOTOS_M;
  // -cut = background removed (macOS Vision), composited over the party color.
  return `/candidates/${pool[h % pool.length]}-cut.png`;
}

/** Candidate photo-bars: bar and number grow in the same animation frame. */
function CandidateRows({ candidates }: { candidates: Candidate[] }) {
  const [progress, setProgress] = useState(0);
  const key = candidates.map((c) => `${c.name}:${c.pct}`).join('|');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1);
      return;
    }
    setProgress(0);
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / GROW_MS);
      setProgress(easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key]);

  return (
    <div className="cand-list">
      {candidates.map((c) => (
        <div className="cand-row" key={c.name}>
          <div className="cand-track">
            <div
              className={`cand-fill cand-fill-${c.party}`}
              style={{ width: `${c.pct * progress}%` }}
            />
            <span className={`cand-avatar cand-avatar-${c.party}`} aria-hidden="true">
              <img className="cand-photo" src={photoFor(c.name)} alt="" />
            </span>
          </div>
          <div className="cand-value">
            <span className="cand-name">{c.name}</span>
            <span className="cand-pct">
              {(c.pct * progress).toFixed(1)}
              <span className="cand-pct-unit">%</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface TrustPickerProps {
  race: StateRace;
  stateName: string;
  chamber: Chamber;
  /** What colors the map everywhere else — the "Default" chip follows it. */
  globalSourceId: string;
  trustedSourceId?: string;
  /** False = the comparison without the control: same three reads, no radio
   *  semantics, no pick. The picker has no phase in the roadmap yet. */
  pickable: boolean;
  onTrust: (sourceId: string) => void;
  onResetTrust: () => void;
}

/**
 * "Which read do you trust": the comparison cards ARE the control. One radio
 * group, one pick per state+race; picking re-points this state at that
 * provider on the map. Choosing the current pick again clears it.
 *
 * TENET GUARD: the pick never becomes a source of its own — the card still
 * shows that provider's own number in that provider's own units.
 */
function TrustPicker({
  race,
  stateName,
  chamber,
  globalSourceId,
  trustedSourceId,
  pickable,
  onTrust,
  onResetTrust,
}: TrustPickerProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const trustedRead = trustedSourceId ? readFor(race, trustedSourceId) : undefined;
  const trustedMissing = !!trustedSourceId && !trustedRead;

  // Radio-group keyboard contract: arrows move AND select, wrapping at the
  // ends; Space/Enter is the button's own default (it toggles).
  const onKeyDown = (e: React.KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1
      : 0;
    if (!dir) return;
    e.preventDefault();
    const cards = [...(groupRef.current?.querySelectorAll<HTMLButtonElement>('.source-card') ?? [])];
    const from = cards.findIndex((c) => c === document.activeElement);
    const next = cards[(((from < 0 ? 0 : from) + dir) + cards.length) % cards.length];
    if (!next) return;
    next.focus({ preventScroll: true });
    const id = next.dataset.source;
    if (id && id !== trustedSourceId) onTrust(id);
  };

  if (!pickable) {
    return (
      <ul className="drawer-reads">
        {SOURCES.map((s) => {
          const read = readFor(race, s.id);
          const freshness = freshnessOf(read);
          return (
            <li key={s.id} className="source-card is-static">
              <span
                className={`district-chip district-chip-${read ? leanOf(read) : 'tossup'}`}
                aria-hidden="true"
              />
              <span className="drawer-read-label">
                {s.label}
                <em className="source-kind">{sourceKind(s.id)}</em>
              </span>
              <span className="drawer-read-value">
                {read ? `${RATING_LABEL[ratingOf(read)]} — ${readLine(read)}` : 'Not rated'}
              </span>
              <span className="source-card-slot">
                <span className={`drawer-read-meta${freshness.stale ? ' is-stale' : ''}`}>
                  {freshness.stale ? '⚠ ' : ''}
                  {freshness.label}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      <p className="trust-copy">
        {trustedSourceId ? (
          <>
            Your map shows {stateName} per {sourceLabel(trustedSourceId)}.{' '}
            <button type="button" className="trust-reset" onClick={onResetTrust}>
              Reset to default
            </button>
            {trustedMissing && (
              <span className="trust-warn"> {sourceLabel(trustedSourceId)} has no data for this race.</span>
            )}
          </>
        ) : (
          <>Tap a source to use it for {stateName} on your map.</>
        )}
      </p>

      <div
        className="drawer-reads"
        role="radiogroup"
        aria-label={`Choose a trusted source for ${stateName} ${CHAMBER_LABEL[chamber]}`}
        ref={groupRef}
        // Roving tabindex (ARIA APG): the RADIOS carry the tab stop, not the
        // group — the group only routes the arrow keys.
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {SOURCES.map((s, i) => {
          const read = readFor(race, s.id);
          const freshness = freshnessOf(read);
          const picked = trustedSourceId === s.id;
          const isDefault = !trustedSourceId && s.id === globalSourceId;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={picked}
              data-source={s.id}
              // Roving tab stop: the group is one stop, the pick (or the
              // first card) is the entry point.
              tabIndex={picked || (!trustedSourceId && i === 0) ? 0 : -1}
              className={`source-card${picked ? ' is-picked' : ''}`}
              onClick={() => onTrust(s.id)}
            >
              <span
                className={`district-chip district-chip-${read ? leanOf(read) : 'tossup'}`}
                aria-hidden="true"
              />
              {/* Same disclaimer the map's source control carries: what KIND
                  of number this provider publishes. */}
              <span className="drawer-read-label">
                {s.label}
                <em className="source-kind">{sourceKind(s.id)}</em>
              </span>
              <span className="drawer-read-value">
                {read ? `${RATING_LABEL[ratingOf(read)]} — ${readLine(read)}` : 'Not rated'}
              </span>
              {/* Right slot stacks pick state over freshness, so the "as of"
                  line is pushed down, never clipped or dropped. */}
              <span className="source-card-slot">
                {picked ? (
                  <span className="trust-badge">✓ Your pick</span>
                ) : isDefault ? (
                  <span className="trust-default">Default</span>
                ) : (
                  <span className="trust-hint" aria-hidden="true">Trust this source</span>
                )}
                <span className={`drawer-read-meta${freshness.stale ? ' is-stale' : ''}`}>
                  {freshness.stale ? '⚠ ' : ''}
                  {freshness.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/** How many district blocks show before the expander. */
const DISTRICTS_PREVIEW = 10;

/**
 * The delegation, two blocks per row — a district reads as a small card
 * (seat, rating chip, its own read, who holds it), not a table row. Odd
 * counts leave the last cell at half width rather than stretching it, so
 * the grid never lies about how many seats there are.
 */
function DistrictGrid({ districts, sourceId }: { districts: District[]; sourceId: string }) {
  const [expanded, setExpanded] = useState(false);
  const total = districts.length;
  const shown = expanded ? districts : districts.slice(0, DISTRICTS_PREVIEW);

  return (
    <>
      <h3 className="drawer-sec">Districts ({total})</h3>
      <ul className="district-grid">
        {shown.map((d) => {
          const read = readFor(d, sourceId);
          const rating = read ? ratingOf(read) : 'tossup';
          const freshness = freshnessOf(read);
          return (
            <li key={d.id} className={`district-block${d.curated ? ' is-curated' : ''}`}>
              <p className="district-block-head">
                {/* The chip carries the FULL rating scale here (the seven
                    Figma steps), not just the lean — same encoding as the
                    map, so a block and its state agree. */}
                <span className={`district-chip district-rating-${rating}`} aria-hidden="true" />
                <span className="district-id">{districtLabel(d.id)}</span>
                {d.curated && <span className="district-watch">Watchlist</span>}
              </p>
              <p className="district-rating">{RATING_LABEL[rating]}</p>
              <p className="district-read">{read ? readLine(read) : 'Not rated'}</p>
              <p className="district-meta">
                {PARTY_LABEL[d.incumbent]} held
                {' · '}
                <span className={freshness.stale ? 'is-stale' : undefined}>
                  {freshness.stale ? '⚠ ' : ''}
                  {freshness.label}
                </span>
              </p>
            </li>
          );
        })}
      </ul>
      {total > DISTRICTS_PREVIEW && (
        <button
          type="button"
          className="district-expander"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show fewer districts' : `Show all ${total} districts`}
        </button>
      )}
    </>
  );
}

interface RacePanelProps {
  stateName: string;
  race: StateRace;
  /** The global map source — what the "Default" chip points at. */
  sourceId: string;
  chamber: Chamber;
  availability: Record<Chamber, boolean>;
  prev: StateRef;
  next: StateRef;
  /** This state+race's trusted source, if the reader declared one. */
  trustedSourceId?: string;
  /** Phase gates: what this delivery of the panel carries. */
  showTrustPicker?: boolean;
  showFollow?: boolean;
  showDistricts?: boolean;
  onChamber: (chamber: Chamber) => void;
  onNavigate: (stateId: string) => void;
  onClose: () => void;
  onTrust: (sourceId: string) => void;
  onResetTrust: () => void;
}

export function RacePanel({
  stateName,
  race,
  sourceId,
  chamber,
  availability,
  prev,
  next,
  trustedSourceId,
  showTrustPicker = true,
  showFollow = true,
  showDistricts = true,
  onChamber,
  onNavigate,
  onClose,
  onTrust,
  onResetTrust,
}: RacePanelProps) {
  const isResults = race.mode === 'results';
  // Follow is per-visit prototype state (the panel is keyed by state id).
  // PRD: anonymous follow first; a free account persists it — neither wired.
  const [following, setFollowing] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  /* The panel is a modal now (the page behind is frozen — see useScrollLock),
     so Tab must stay inside it: focus landing on the page behind would drag
     that frozen page along with it (focus scrolls its target into view, and
     programmatic scrolling ignores the lock). preventScroll for the same
     reason — every focusable here lives in the panel's fixed chrome. */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const restoreTo = document.activeElement as HTMLElement | null;
    const focusables = () =>
      [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !panel.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // Hand focus back to whatever opened the panel, if it is still around.
      if (restoreTo?.isConnected) restoreTo.focus({ preventScroll: true });
    };
  }, []);

  return (
    <section
      className="drawer"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${stateName} race detail`}
    >
      <header className="drawer-head">
        <h2>{stateName}</h2>
        <div className="drawer-actions">
          {/* Follow a State: one state, all of its races. */}
          {showFollow && (
            <button
              type="button"
              className={`btn-follow${following ? ' is-following' : ''}`}
              aria-pressed={following}
              onClick={() => setFollowing((v) => !v)}
            >
              {following ? 'Following' : 'Follow state'}
            </button>
          )}
          <button type="button" className="drawer-icon-btn" aria-label={`Share ${stateName} race`}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M9 11V2.5m0 0L5.5 6M9 2.5 12.5 6M3.5 9.5v4c0 .8.7 1.5 1.5 1.5h8c.8 0 1.5-.7 1.5-1.5v-4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button type="button" className="drawer-icon-btn" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="m4 4 10 10M14 4 4 14"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* DS tabs replace the floating dock while the drawer is open. */}
      <ChamberTabs chamber={chamber} availability={availability} onChamber={onChamber} />

      {/* Only the content scrolls — header, chamber tabs and the state
          navigation stay fixed in the modal frame. */}
      <div className="drawer-scroll" id="drawer-body" role="tabpanel" aria-labelledby={`panel-race-tab-${chamber}`}>
      {isResults ? (
        <>
          <p className="race-panel-status">{statusLine(race, sourceId)}</p>
          <p className="drawer-note">Source: {race.results?.source}</p>
        </>
      ) : (
        <>
          <h3 className="drawer-sec">Candidates ({race.candidates?.length ?? 0})</h3>
          {race.candidates && <CandidateRows candidates={race.candidates} />}
          <p className="drawer-note">
            Support shares from the polling average. {CHAMBER_LABEL[race.chamber]} race, 2026.
          </p>

          <h3 className="drawer-sec">Sources compared</h3>
          <TrustPicker
            race={race}
            stateName={stateName}
            chamber={chamber}
            globalSourceId={sourceId}
            trustedSourceId={trustedSourceId}
            pickable={showTrustPicker}
            onTrust={onTrust}
            onResetTrust={onResetTrust}
          />
          {/* PRD tenet 4: every comparison view carries a sourcing disclaimer. */}
          <p className="drawer-note">
            Estimates, not results — measured in different units (points vs implied
            probability) and never combined.
          </p>

          {/* House: the state's WHOLE delegation, two blocks per row. Long
              delegations (California sends 52) stay behind an expander so
              the panel still scans in one screen. */}
          {showDistricts && race.districts && (
            <DistrictGrid districts={race.districts} sourceId={sourceId} />
          )}

        </>
      )}
      </div>

      <DrawerNav prev={prev} next={next} onNavigate={onNavigate} />
    </section>
  );
}
