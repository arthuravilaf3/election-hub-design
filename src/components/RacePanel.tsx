/**
 * The state drawer (redesign Aug 2026, "Tapping on Any State" frame):
 * header (state, share, close), Candidates with photo-bars that count up
 * from 0, the cross-source comparison, and a Finance Data placeholder.
 * (The source tab bar was dropped — the comparison below covers it.)
 *
 * TENET 2 GUARD: in results mode the drawer shows only results (status,
 * reporting, feed attribution) — no estimates beside a live count.
 */
import { useEffect, useState } from 'react';
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
import { SOURCES } from '../data/sources';
import { CHAMBER_LABEL } from '../data/summary';
import type { Candidate, Chamber, StateRace } from '../data/types';

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

interface RacePanelProps {
  stateName: string;
  race: StateRace;
  sourceId: string;
  chamber: Chamber;
  availability: Record<Chamber, boolean>;
  prev: StateRef;
  next: StateRef;
  onChamber: (chamber: Chamber) => void;
  onNavigate: (stateId: string) => void;
  onClose: () => void;
}

export function RacePanel({
  stateName,
  race,
  sourceId,
  chamber,
  availability,
  prev,
  next,
  onChamber,
  onNavigate,
  onClose,
}: RacePanelProps) {
  const isResults = race.mode === 'results';
  // Follow is per-visit prototype state (the panel is keyed by state id).
  // PRD: anonymous follow first; a free account persists it — neither wired.
  const [following, setFollowing] = useState(false);

  return (
    <section className="drawer" aria-label={`${stateName} race detail`}>
      <header className="drawer-head">
        <h2>{stateName}</h2>
        <div className="drawer-actions">
          <button
            type="button"
            className={`btn-follow${following ? ' is-following' : ''}`}
            aria-pressed={following}
            onClick={() => setFollowing((v) => !v)}
          >
            {following ? 'Following' : 'Follow'}
          </button>
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
          <ul className="drawer-reads">
            {SOURCES.map((s) => {
              const read = race.reads.find((r) => r.sourceId === s.id);
              const freshness = freshnessOf(read);
              return (
                <li key={s.id}>
                  <span
                    className={`district-chip district-chip-${read ? leanOf(read) : 'tossup'}`}
                    aria-hidden="true"
                  />
                  <span className="drawer-read-label">{s.label}</span>
                  <span className="drawer-read-value">
                    {read ? `${RATING_LABEL[ratingOf(read)]} — ${readLine(read)}` : 'Not rated'}
                  </span>
                  <span className={`drawer-read-meta${freshness.stale ? ' is-stale' : ''}`}>
                    {freshness.stale ? '⚠ ' : ''}
                    {freshness.label}
                  </span>
                </li>
              );
            })}
          </ul>
          {/* PRD tenet 4: every comparison view carries a sourcing disclaimer. */}
          <p className="drawer-note">
            Estimates, not results — measured in different units (points vs implied
            probability) and never combined.
          </p>

          {/* House: the curated competitive districts, same drawer layout as
              every other chamber — just one extra section. */}
          {race.districts && (
            <>
              <h3 className="drawer-sec">Districts ({race.districts.length})</h3>
              <ul className="drawer-districts">
                {race.districts.map((d) => {
                  const read = readFor(d, sourceId);
                  const lean = read ? leanOf(read) : 'tossup';
                  const freshness = freshnessOf(read);
                  return (
                    <li key={d.id}>
                      <span className={`district-chip district-chip-${lean}`} aria-hidden="true" />
                      <span className="district-id">{d.id}</span>
                      <span className="district-read">
                        {read ? readLine(read) : 'Not rated'}
                      </span>
                      <span className="district-meta">
                        {PARTY_LABEL[d.incumbent]} held
                        {' · '}
                        <span className={freshness.stale ? 'is-stale' : undefined}>
                          {freshness.stale ? '⚠ ' : ''}
                          {freshness.label}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <h3 className="drawer-sec">Finance Data</h3>
          <p className="drawer-note">Coming soon.</p>
        </>
      )}

      <DrawerNav prev={prev} next={next} onNavigate={onNavigate} />
    </section>
  );
}
