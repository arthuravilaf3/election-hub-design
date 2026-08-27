// Interactive race tag (feed): a status dot INSIDE the tag mirrors the exact
// color that race wears on the map right now (live ballot + active source —
// including results mode after cutover), so the reader recalls who's ahead
// without scrolling back up. Hovering opens a mini version of the map drawer:
// state, race, candidate names with count-up bars in party colors (dem blue,
// rep red). No photos.
import { useEffect, useRef, useState } from 'react';
import { fillFor, ratingOf, readFor } from '../data/encoding';
import { CHAMBER_LABEL } from '../data/summary';
import { STATE_SHAPES } from '../data/states';
import { track } from '../data/analytics';
import type { Ballot, Candidate, Chamber, StateRace } from '../data/types';

const HOVER_OPEN_DELAY_MS = 150;
const GROW_MS = 700;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface ParsedTag {
  stateId: string;
  chamber: Chamber;
  district?: string;
}

function parseTag(tag: string): ParsedTag | null {
  const m = /^([A-Z]{2})-(SEN|GOV|\d{2})$/.exec(tag);
  if (!m) return null;
  const stateId = m[1];
  if (m[2] === 'SEN') return { stateId, chamber: 'senate' };
  if (m[2] === 'GOV') return { stateId, chamber: 'governor' };
  return { stateId, chamber: 'house', district: tag };
}

/** Mini drawer bars: same grow effect as the drawer, party-colored fills. */
function MiniBars({ candidates }: { candidates: Candidate[] }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / GROW_MS);
      setProgress(easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <span className="race-mini-bars">
      {candidates.map((c) => (
        <span className="race-mini-row" key={c.name}>
          <span className="race-mini-head">
            <span className="race-mini-name">{c.name}</span>
            <span className="race-mini-pct">{(c.pct * progress).toFixed(1)}%</span>
          </span>
          <span className="race-mini-track">
            <span
              className={`race-mini-fill race-mini-fill--${c.party}`}
              style={{ width: `${c.pct * progress}%` }}
            />
          </span>
        </span>
      ))}
    </span>
  );
}

interface RaceTagProps {
  tag: string;
  ballot: Ballot;
  sourceId: string;
}

export function RaceTag({ tag, ballot, sourceId }: RaceTagProps) {
  const [open, setOpen] = useState(false);
  const openTimer = useRef<number | null>(null);

  const parsed = parseTag(tag);
  const race: StateRace | undefined = parsed ? ballot[parsed.chamber][parsed.stateId] : undefined;
  const stateName = parsed
    ? STATE_SHAPES.find((s) => s.id === parsed.stateId)?.name ?? parsed.stateId
    : tag;

  // Dot color = exactly what the map paints right now. District tags use the
  // district's own read; state tags use the race fill (mode-aware). After
  // cutover there is no certified district feed, so district dots go neutral
  // — a prediction rating must never pose as a result.
  let dotColor: string | undefined;
  let districtRead: ReturnType<typeof readFor> | undefined;
  const inResults = race?.mode === 'results';
  if (race && parsed) {
    if (parsed.district) {
      const d = race.districts?.find((x) => x.id === parsed.district);
      districtRead = d ? readFor(d, sourceId) : undefined;
      dotColor =
        !inResults && districtRead
          ? `var(--rating-${ratingOf(districtRead)})`
          : 'var(--no-read)';
    } else {
      dotColor = fillFor(race, sourceId);
    }
  }

  const openDelayed = (pointerType: string) => {
    if (pointerType !== 'mouse') return;
    openTimer.current = window.setTimeout(() => setOpen(true), HOVER_OPEN_DELAY_MS);
  };
  const close = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    openTimer.current = null;
    setOpen(false);
  };
  useEffect(
    () => () => {
      if (openTimer.current) window.clearTimeout(openTimer.current);
    },
    []
  );

  return (
    <span
      className="race-tag-wrap"
      onPointerEnter={(e) => openDelayed(e.pointerType)}
      onPointerLeave={close}
    >
      <button
        type="button"
        className="feed-tag"
        onFocus={() => setOpen(true)}
        onBlur={close}
        onClick={(e) => {
          e.stopPropagation();
          track('race_tag_click', { tag });
        }}
      >
        {dotColor && <span className="race-dot" style={{ background: dotColor }} aria-hidden="true" />}
        {tag}
      </button>

      {open && race && (
        <span className="race-hovercard" role="presentation">
          <span className="race-hovercard-title">{stateName}</span>
          <span className="race-hovercard-sub">
            {CHAMBER_LABEL[race.chamber]}
            {parsed?.district ? ` · ${parsed.district}` : ''} · 2026
          </span>
          {/* Count-up bars for every tag (district tags glance at the
              statewide race — districts carry no candidate fixture). */}
          {race.candidates && <MiniBars candidates={race.candidates} />}
          {/* Hand-off to the map for the full drawer. */}
          <button
            type="button"
            className="race-open-map"
            onClick={(e) => {
              e.stopPropagation();
              track('race_tag_open_map', { tag });
              window.dispatchEvent(
                new CustomEvent('dw-open-map', {
                  detail: { stateId: parsed?.stateId, chamber: parsed?.chamber },
                })
              );
              close();
            }}
          >
            View on map
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M2.5 8h10.4m0 0L8.6 3.7M12.9 8l-4.3 4.3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </span>
      )}
    </span>
  );
}
