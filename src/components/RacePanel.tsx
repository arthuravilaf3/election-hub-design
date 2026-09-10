/**
 * The state drawer (redesign Aug 2026, "map-zoom" frame): a sticky top bar
 * carrying the chamber/state breadcrumb and the close control, a scrolling
 * body (flag + Follow + share, the title, the source row, Candidates with
 * photo-bars that count up from 0, the cross-source comparison and — for the
 * House — the state's delegation), and the prev/next state bar pinned to the
 * bottom.
 *
 * The chamber tabs are gone: the chamber is now a LABEL in the breadcrumb,
 * and the row it vacated belongs to the source. That source row is a local
 * view toggle — it does not repaint the map and it is not the trust pick.
 *
 * TENET 2 GUARD: in results mode the drawer shows only results (status,
 * reporting, feed attribution) — no estimates beside a live count.
 */
import { useEffect, useRef, useState } from 'react';
import { DrawerNav, DrawerTabs, type StateRef } from './DrawerChrome';
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
import { sourceKind } from '../data/sources';
import { CHAMBER_LABEL } from '../data/summary';

/** Long form for the panel title — the comp names the body, not the tab. */
const CHAMBER_TITLE: Record<Chamber, string> = {
  senate: 'U.S. Senate',
  house: 'U.S. House',
  governor: 'Governor',
};
import { districtLabel } from '../data/districts';
import { asset } from '../data/assets';
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
  return asset(`candidates/${pool[h % pool.length]}-cut.png`);
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
    <ul className="bar-list">
      {candidates.map((c) => (
        <li className={`bar-row bar-row--${c.party}`} key={c.name}>
          {/* The bar is the row's ground, not a track beside it: a party tint
              at 15% whose width IS the share. */}
          <span className="bar-fill" style={{ width: `${c.pct * progress}%` }} aria-hidden="true" />
          <span className="bar-id">
            <span className="cand-avatar" aria-hidden="true">
              <img className="cand-photo" src={photoFor(c.name)} alt="" />
            </span>
            <span className="bar-lines">
              <span className="bar-title">{c.name}</span>
              <span className="bar-sub">
                {c.party === 'ind' ? 'Independent' : PARTY_LABEL[c.party]}
              </span>
            </span>
          </span>
          <span className="bar-value">{(c.pct * progress).toFixed(1)}%</span>
        </li>
      ))}
    </ul>
  );
}


/** How many district blocks show before the expander. */
const DISTRICTS_PREVIEW = 10;

/**
 * The provider's own figure for a district, in ITS unit — a market's implied
 * probability for the leader, or a poll's margin in points. One source is
 * selected at a time, so a view never puts the two side by side (tenet: the
 * units are never combined).
 *
 * `fill` is what the bar encodes, 0-100. A market probability maps straight
 * across; a margin saturates at 20 points, past which "competitive" has
 * stopped meaning anything.
 */
function districtValue(read: ReturnType<typeof readFor>): { label: string; fill: number } {
  if (!read) return { label: '—', fill: 0 };
  if (read.kind === 'market') {
    const dem = read.demOdds ?? 50;
    const lead = Math.max(dem, 100 - dem);
    return { label: `${Math.round(lead)}%`, fill: lead };
  }
  const margin = read.margin ?? 0;
  const side = margin >= 0 ? 'D' : 'R';
  return {
    label: `${side}+${Math.abs(margin).toFixed(1)}`,
    fill: Math.min(100, (Math.abs(margin) / 20) * 100),
  };
}

/**
 * The delegation as bar rows, one seat per row — same shape as the candidate
 * rows above, so a district and a candidate read as the same kind of object.
 * The bar's width is the provider's confidence in that seat.
 */
function DistrictGrid({ districts, sourceId }: { districts: District[]; sourceId: string }) {
  const [expanded, setExpanded] = useState(false);
  const total = districts.length;
  const shown = expanded ? districts : districts.slice(0, DISTRICTS_PREVIEW);

  return (
    <>
      <ul className="bar-list district-list">
        {shown.map((d) => {
          const read = readFor(d, sourceId);
          const rating = read ? ratingOf(read) : 'tossup';
          const lean = read ? leanOf(read) : 'tossup';
          const freshness = freshnessOf(read);
          const value = districtValue(read);
          return (
            <li
              key={d.id}
              className={`bar-row bar-row--${lean}${d.curated ? ' is-curated' : ''}`}
            >
              <span className="bar-fill" style={{ width: `${value.fill}%` }} aria-hidden="true" />
              <span className="bar-id">
                <span className="bar-lines">
                  <span className="bar-title">
                    {districtLabel(d.id)}
                    {d.curated && <span className="district-watch">Watchlist</span>}
                  </span>
                  <span className="bar-sub">
                    {RATING_LABEL[rating]} · {PARTY_LABEL[d.incumbent]} held
                    {freshness.stale && <span className="is-stale"> · ⚠ {freshness.label}</span>}
                  </span>
                </span>
              </span>
              <span className="bar-value">{value.label}</span>
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

/**
 * A section heading with the provider line under it. Both Candidates and
 * Districts carry it: every figure on this panel states whose it is and how
 * old it is (hub tenet), and the two sections can be read independently.
 */
function BlockHead({ title, read, sourceId }: { title: string; read: ReturnType<typeof readFor>; sourceId: string }) {
  const freshness = freshnessOf(read);
  return (
    <div className="drawer-block-head">
      <h3 className="drawer-sec">{title}</h3>
      {read && (
        <p className="drawer-meta">
          {sourceKind(sourceId)}
          <span className="drawer-meta-dot" aria-hidden="true">·</span>
          {readLine(read)}
          <span className="drawer-meta-dot" aria-hidden="true">·</span>
          <span className={freshness.stale ? 'is-stale' : undefined}>
            {freshness.stale ? '⚠ ' : ''}
            {freshness.label}
          </span>
        </p>
      )}
    </div>
  );
}

interface RacePanelProps {
  stateName: string;
  race: StateRace;
  /** The global map source — what the "Default" chip points at. */
  sourceId: string;
  prev: StateRef;
  next: StateRef;
  showFollow?: boolean;
  showDistricts?: boolean;
  /** The chambers this state has on the ballot, in tab order. */
  chambers: Chamber[];
  /** Picking a tab switches the map's chamber. */
  onChamber: (chamber: Chamber) => void;
  onNavigate: (stateId: string) => void;
  onClose: () => void;
}

export function RacePanel({
  stateName,
  race,
  sourceId,
  prev,
  next,
  showFollow = true,
  showDistricts = true,
  chambers,
  onChamber,
  onNavigate,
  onClose,
}: RacePanelProps) {
  const isResults = race.mode === 'results';
  // Follow is per-visit prototype state (the panel is keyed by state id).
  // PRD: anonymous follow first; a free account persists it — neither wired.
  const [following, setFollowing] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  /* The panel reads whatever source the map is painting — the provider
     toggle that used to live here is gone (Sep 2026). */
  const viewRead = readFor(race, sourceId);
  /* Head compacts once the title has scrolled under it. Hysteresis so a
     scroll position that sits right on the threshold does not flicker. */
  const [compact, setCompact] = useState(false);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    setCompact((c) => (c ? y > 12 : y > 56));
  };

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
      className={`drawer${compact ? ' is-compact' : ''}`}
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${stateName} race detail`}
    >
      {/* Only the body scrolls; the head sticks to its top and compacts into
          one row once the reader has scrolled past the title (Sep 2026 —
          the top bar with the breadcrumb is gone, the X sits by share). */}
      <div className="drawer-scroll" onScroll={onScroll}>
        <header className="drawer-headblock">
          <img className="drawer-flag" src={asset(`flags/${race.id}.png`)} alt="" aria-hidden="true" />
          <div className="drawer-titleblock">
            {/* The state alone: the race is the tab row's job, and the
                rating is in the candidate block (Sep 2026). */}
            <h2 className="drawer-title">{stateName}</h2>
          </div>
          <div className="drawer-headrow">
            {/* Follow a State: one state, all of its races. */}
            {showFollow && (
              <button
                type="button"
                className={`btn-follow${following ? ' is-following' : ''}`}
                aria-pressed={following}
                onClick={() => setFollowing((v) => !v)}
              >
                {following ? 'Following' : `Follow ${stateName}`}
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
                <path d="m4 4 10 10M14 4 4 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        {isResults ? (
          <section className="drawer-block">
            <p className="race-panel-status">{statusLine(race, sourceId)}</p>
            <p className="drawer-note">Source: {race.results?.source}</p>
          </section>
        ) : (
          <>
            <DrawerTabs
              tabs={chambers.map((c) => ({ id: c, label: CHAMBER_TITLE[c] }))}
              value={race.chamber}
              onChange={(id) => onChamber(id as Chamber)}
            />

            <div role="tabpanel" id="drawer-tabpanel" aria-labelledby={`drawer-tab-${race.chamber}`}>
            <>
            <section className="drawer-block">
              <BlockHead title="Candidates" read={viewRead} sourceId={sourceId} />
              {race.candidates && <CandidateRows candidates={race.candidates} />}
              <p className="drawer-note">
                Support shares from the polling average. {CHAMBER_LABEL[race.chamber]} race, 2026.
              </p>
            </section>

            {/* House: the state's WHOLE delegation. Long delegations
                (California sends 52) stay behind an expander so the panel
                still scans in one screen. */}
            {showDistricts && race.districts && (
              <>
                <hr className="drawer-divider" />
                <section className="drawer-block">
                  <BlockHead
                    title={`Districts (${race.districts.length})`}
                    read={viewRead}
                    sourceId={sourceId}
                  />
                  <DistrictGrid districts={race.districts} sourceId={sourceId} />
                </section>
              </>
            )}
            </>
            </div>
          </>
        )}
      </div>

      <DrawerNav prev={prev} next={next} onNavigate={onNavigate} />
    </section>
  );
}
