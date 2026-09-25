// Election Coverage Feed (per the Coverage Feed PRD + review decisions):
// latest-shorts row with platform-aware autoplay, content-type filters with
// a secondary host row, opinion-as-premium serif treatment, in-feed ad slots
// with cadence rules, interactive race tags, load-more pagination, empty and
// skeleton states, and Segment analytics stubs on every interaction.
//
// PRD tenets honored: opinion ≠ reporting (exactly two typographic systems),
// ads only for ad-eligible users (isAdFree renders zero slots), race tags
// hand off (stubbed), filter changes announced to screen readers.
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { track } from '../data/analytics';
import { RaceCallRow } from './RaceCalls';
import { ALL_ITEMS, FILTERS, HOSTS, HOST_FILTERABLE, STATE_FILTERABLE, TAGGED_STATE_IDS } from '../data/feedItems';
import { STATE_SHAPES } from '../data/states';
import type { FeedItem, ItemKind } from '../data/feedItems';
import { isVisited, markVisited } from '../data/visited';

/** Mock global flag: ad-free subscribers see ZERO ad slots (PRD tenet 4).
 *  Togglable per-visit via ?adfree for testing both layouts. */
const IS_AD_FREE = new URLSearchParams(window.location.search).has('adfree');

const PAGE_SIZE = 12;
const HOVER_PLAY_DELAY_MS = 400;

/* ------------------------------------------------------------------ */
/* Shorts playback: one card plays at a time, platform-aware triggers. */
/* ------------------------------------------------------------------ */

interface ShortCardProps {
  item: FeedItem;
  playing: boolean;
  /** Hover-capable (desktop) cards manage their own 400ms-delay hover. */
  hoverMode: boolean;
  reducedMotion: boolean;
  onRequestPlay: (id: number, trigger: 'hover' | 'viewport') => void;
  onRequestStop: (id: number) => void;
  /** Viewport mode: report visibility so the most-visible card wins. */
  onVisibility?: (id: number, ratio: number) => void;
}

function ShortCard({
  item,
  playing,
  hoverMode,
  reducedMotion,
  onRequestPlay,
  onRequestStop,
  onVisibility,
}: ShortCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimer = useRef<number | null>(null);
  /* The DS card carries a mute/unmute control (see the Shorts Card page in
     DW 3.0). Starts muted because that is the only way a loop may autoplay;
     a tap unmutes, which the policy allows once the reader has asked. */
  const [muted, setMuted] = useState(true);

  // Viewport mode: report intersection ratios upward; the coordinator picks
  // the single most-visible card.
  useEffect(() => {
    if (hoverMode || reducedMotion || !onVisibility) return;
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => onVisibility(item.id, entry.isIntersecting ? entry.intersectionRatio : 0),
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      // Report "gone" on unmount — otherwise a filtered-out card's last
      // ratio stays in the coordinator map forever and outbids live cards.
      onVisibility(item.id, 0);
    };
  }, [hoverMode, reducedMotion, onVisibility, item.id]);

  // Drive the actual <video>: muted, looped, no controls, inside the card
  // bounds (absolute fill) so playback never shifts layout.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // `muted` has to be set on the element, not through the attribute:
    // React writes the attribute, which the media element ignores after
    // creation, so a JSX-only `muted` leaves the loop audible.
    v.muted = muted;
    if (playing) void v.play().catch(() => undefined);
    else v.pause();
  }, [playing, muted]);

  const enter = (pointerType: string) => {
    if (!hoverMode || reducedMotion || pointerType !== 'mouse') return;
    hoverTimer.current = window.setTimeout(() => {
      onRequestPlay(item.id, 'hover');
    }, HOVER_PLAY_DELAY_MS);
  };
  const leave = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    if (playing) onRequestStop(item.id);
  };
  useEffect(
    () => () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    },
    []
  );

  return (
    <div
      ref={rootRef}
      className={`short-card${playing ? ' is-playing' : ''}`}
      onPointerEnter={(e) => enter(e.pointerType)}
      onPointerLeave={leave}
    >
      <div className="short-thumb" aria-hidden="true">
        {/* The still is the card until the loop takes over — same box, so
            playback and loading never move anything. */}
        <img className="short-img" src={item.imageTall ?? item.image} alt="" loading="lazy" decoding="async" />
        {playing && item.video && (
          <video ref={videoRef} src={item.video} muted loop playsInline autoPlay />
        )}
        <span className="feed-duration">{item.duration}</span>
        <p className="short-caption">
          {/* The clamp lives on the inner span: -webkit-line-clamp counts
              lines inside the padding box, so a padded element leaks the
              next line into its own bottom padding. */}
          <span>{item.headline}</span>
        </p>
      </div>
      {playing && item.video && (
        /* DS: the icon button inside the card is ALWAYS white — it sits over
           a video still, which is dark whatever the app's theme is. It is
           the card's one real control, so it lives OUTSIDE the aria-hidden
           media and names the short it belongs to. */
        <button
          type="button"
          className="short-mute"
          aria-label={`${muted ? 'Unmute' : 'Mute'}: ${item.headline}`}
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
          }}
        >
          {muted ? <VolumeOffIcon /> : <VolumeIcon />}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Skeleton rows — Figma prototype motion: 600ms, bezier(0.8, 0, 0.6, 1). */
/**
 * A horizontal shelf of shorts with the DS "utility" chevron at its right
 * edge: while the row can still scroll, hovering it fades the last cards
 * and shows the chevron; a click pages the row on. Hidden at the end.
 */
function ShortsShelf({ children, label = 'Latest shorts' }: { children: React.ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(true);
  const [back, setBack] = useState(false);
  const measure = () => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 8);
    setBack(el.scrollLeft > 8);
  };
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return (
    <div className={`shorts-shelf${more ? ' has-more' : ''}${back ? ' has-back' : ''}`}>
      {back && (
        <button
          type="button"
          className="utility-btn shorts-prev"
          aria-label="Scroll shorts back"
          onClick={() => ref.current?.scrollBy({ left: -ref.current.clientWidth * 0.8, behavior: 'smooth' })}
        >
          <ChevronLeft />
        </button>
      )}
      {/* Focusable so the keyboard can scroll it (axe: scrollable-region-focusable). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="shorts-row" role="region" aria-label={label} tabIndex={0} ref={ref} onScroll={measure}>
        {children}
      </div>
      {more && (
        <button
          type="button"
          className="utility-btn shorts-next"
          aria-label="Scroll shorts"
          onClick={() => ref.current?.scrollBy({ left: ref.current.clientWidth * 0.8, behavior: 'smooth' })}
        >
          <ChevronRight />
        </button>
      )}
    </div>
  );
}

/* The hosts who are people (vs. shows): only their items get a "go to
   <first name>'s page" entry. */
const PEOPLE_HOSTS = ['Ben Shapiro', 'Matt Walsh', 'Michael Knowles', 'Andrew Klavan'];
const SHOW_OF: Record<string, string> = {
  'Ben Shapiro': 'The Ben Shapiro Show',
  'Matt Walsh': 'The Matt Walsh Show',
  'Michael Knowles': 'The Michael Knowles Show',
  'Andrew Klavan': 'The Andrew Klavan Show',
  'Morning Wire': 'Morning Wire',
  'Crain & Co': 'Crain & Co',
};
const initials = (name: string) =>
  name
    .split(' ')
    .filter((w) => /^[A-Za-z]/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

/**
 * The three-dots menu. Article / short by a person: go to their page (round
 * DS avatar, 3xsm, on the right), share, save. Episode: go to the host's
 * page (round avatar, right), go to the show's page (square DS "Shows"
 * avatar, on the left), share, save. Items are stubs: they log and close.
 */
function ItemMenu({ item, onClose }: { item: FeedItem; onClose: () => void }) {
  const person =
    item.kind === 'opinion' ? item.author : item.host && PEOPLE_HOSTS.includes(item.host) ? item.host : null;
  const show = item.kind === 'episode' && item.host ? SHOW_OF[item.host] ?? item.host : null;
  const first = person ? person.split(' ')[0] : '';
  const act = (what: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    track('feed_item_action', { id: item.id, what });
    onClose();
  };
  return (
    <div className="feed-menu" role="menu" aria-label="Item options">
      {person && (
        <button type="button" role="menuitem" className="feed-menu-item" onClick={act('host')}>
          <span className="feed-menu-avatar feed-menu-avatar--host" aria-hidden="true">
            {initials(person)}
          </span>
          <span>Go to {first}&rsquo;s page</span>
        </button>
      )}
      {show && (
        <button type="button" role="menuitem" className="feed-menu-item" onClick={act('show')}>
          <span className="feed-menu-avatar feed-menu-avatar--show" aria-hidden="true">
            {initials(show.replace(/^The /, ''))}
          </span>
          <span>Go to {show}&rsquo;s page</span>
        </button>
      )}
      <button type="button" role="menuitem" className="feed-menu-item" onClick={act('share')}>
        <ShareIcon />
        <span>Share</span>
      </button>
      <button type="button" role="menuitem" className="feed-menu-item" onClick={act('save')}>
        <BookmarkIcon />
        <span>Save for later</span>
      </button>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15V4m0 0L8 8m4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** DS icon: Tabler volume, 18px at 1.5 stroke — the card's control is
    smaller than the shelf's utility buttons. */
function VolumeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 8a5 5 0 0 1 0 8M17.7 5a9 9 0 0 1 0 14M6 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l3.5-4.5a.8.8 0 0 1 1.5.5v14a.8.8 0 0 1-1.5.5L6 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** DS icon: Tabler volume-off, 18px at 1.5 stroke. */
function VolumeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l3.5-4.5a.8.8 0 0 1 1.5.5v14a.8.8 0 0 1-1.5.5L6 15ZM16 10l4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** DS utility icon: Tabler chevron-left at 20px, 1.5 stroke. */
function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** DS utility icon: Tabler chevron-right at 20px, 1.5 stroke. */
function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Skeleton rows that mirror the card about to appear (DS ".Skeleton-Others"):
 * one bar per TEXT line — attribution, headline (two lines), and the dek
 * where the kind has one — no image block. The rows rise in from below,
 * quick and staggered, and shimmer left to right while they wait.
 */
function SkeletonRows({ count, kind = 'all' }: { count: number; kind?: ItemKind | 'all' }) {
  // Shorts arrive as a grid of portrait cards: their skeleton is that grid.
  if (kind === 'short') {
    return (
      <div className="feed-skeletons feed-skeletons--grid" aria-hidden="true">
        {Array.from({ length: Math.max(count, 5) }, (_, i) => (
          <div className="sk sk-card" key={i} style={{ '--i': i } as React.CSSProperties}>
            <div className="sk-caption">
              <span className="sk" />
              <span className="sk" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  // Everything else is a row: the same grid as .feed-item (48px avatar
  // column, 12px gap, 32px dividers) with one bar per text line at that
  // line's height, then the card's 16:9 media surface. Episodes have no dek.
  const hasDek = kind !== 'episode';
  return (
    <div className="feed-skeletons" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="feed-skeleton" key={i} style={{ '--i': i } as React.CSSProperties}>
          <span className="sk sk-avatar" />
          <div className="sk-body">
            <span className="sk sk-meta" />
            <div className="sk-text">
              <span className="sk sk-headline" />
              <span className="sk sk-headline sk-headline--2" />
              {hasDek && <span className="sk sk-dek" />}
              {hasDek && <span className="sk sk-dek sk-dek--2" />}
            </div>
            <span className="sk sk-media" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A race call, as the feed carries it (election night, P3). */
export interface FeedCall {
  key: string;
  stateId: string;
  headline: string;
  time: string;
  /** Who the provider called it for, and the face to put on the row. */
  stateName: string;
  chamberLabel: string;
  winner: string;
  party: 'dem' | 'rep';
}

export function CoverageFeed({ calls = [] }: { calls?: FeedCall[] }) {
  const [filter, setFilter] = useState<ItemKind | 'all'>('all');
  /* The calls are a view of their own, not a kind of item: turning it on
     replaces the list, turning it off puts the reader back where they were. */
  const [callsOnly, setCallsOnly] = useState(false);
  const [host, setHost] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  /* The three-dots menu: which item's is open. */
  const [menuFor, setMenuFor] = useState<number | null>(null);
  useEffect(() => {
    if (menuFor === null) return;
    const close = () => setMenuFor(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuFor]);
  const [loading, setLoading] = useState(true);
  /* Filter change: a short skeleton beat (DS ".Skeleton-Others") before the
     new rows land, so the swap never pops. */
  const [filtering, setFiltering] = useState(false);
  const filterTimer = useRef(0);
  const settle = () => {
    setFiltering(true);
    window.clearTimeout(filterTimer.current);
    filterTimer.current = window.setTimeout(() => setFiltering(false), 1100);
  };
  useEffect(() => () => window.clearTimeout(filterTimer.current), []);
  const [loadingMore, setLoadingMore] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [stateScope, setStateScope] = useState<string | null>(null);
  const [stateMenuOpen, setStateMenuOpen] = useState(false);
  /* Opinion only: a secondary CONTENT TYPE filter (all / articles / shorts /
     episodes) beside the host one. */
  type TypeScope = 'all' | 'article' | 'short' | 'episode';
  const TYPE_LABEL: Record<TypeScope, string> = { all: 'All Types', article: 'Articles', short: 'Shorts', episode: 'Episodes' };
  const [typeScope, setTypeScope] = useState<TypeScope>('all');
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [stateQuery, setStateQuery] = useState('');
  // The search field takes focus when its menu opens (the menu is the only
  // thing on screen that wants it; done here rather than with autoFocus so
  // it is tied to the menu opening, not to mount).
  const stateSearchRef = useRef<HTMLInputElement>(null);
  const [announcement, setAnnouncement] = useState('');
  // Bumped when an item is marked visited, so the dimmed state paints now.
  const [, bumpVisited] = useState(0);

  const [hoverMode] = useState(() => window.matchMedia('(hover: hover)').matches);
  const [reducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  // Narrow screens wrap the filter bar into rows — the horizontal FLIP
  // choreography can't survive a line break, so the bar swaps instantly.
  const [narrowBar] = useState(() => window.matchMedia('(max-width: 700px)').matches);

  // Initial-load skeletons: the section never pops in fully formed.
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 700);
    return () => window.clearTimeout(t);
  }, []);

  /* ---- playback coordination ---- */
  const visibility = useRef(new Map<number, number>());
  // Mirror of playingId so requestPlay can track OUTSIDE the setState
  // updater (updaters must be pure — StrictMode double-invokes them, which
  // double-fired the analytics event).
  const playingRef = useRef<number | null>(null);
  useEffect(() => {
    playingRef.current = playingId;
  }, [playingId]);
  const requestPlay = (id: number, trigger: 'hover' | 'viewport') => {
    if (playingRef.current !== id) {
      playingRef.current = id;
      track('short_autoplay_start', { id, trigger });
    }
    setPlayingId(id);
  };
  const requestStop = (id: number) => {
    setPlayingId((current) => (current === id ? null : current));
  };
  const onVisibility = (id: number, ratio: number) => {
    visibility.current.set(id, ratio);
    // Most-visible card wins; cards out of view pause.
    let bestId: number | null = null;
    let bestRatio = 0.5; // must be at least half visible to start
    for (const [cardId, r] of visibility.current) {
      if (r > bestRatio) {
        bestRatio = r;
        bestId = cardId;
      }
    }
    if (bestId !== null) requestPlay(bestId, 'viewport');
    else setPlayingId((current) => (current !== null && (visibility.current.get(current) ?? 0) === 0 ? null : current));
  };

  /* ---- filtering + pagination ---- */
  const hostRowOpen = HOST_FILTERABLE.includes(filter);
  const stateRowOpen = STATE_FILTERABLE.includes(filter);
  /* The latest shorts, as a shortcut row above the filters (back by request,
     Sep 2026). Browse mode only: an active filter means the reader asked for
     something specific. */
  const latestShorts = useMemo(() => ALL_ITEMS.filter((i) => i.kind === 'short').slice(0, 8), []);
  const filtered = useMemo(
    () =>
      ALL_ITEMS.filter(
        (i) =>
          // Opinion filters by VOICE (flag spans formats) and only from the
          // hosts who are people; others by format.
          (filter === 'all' ||
            (filter === 'opinion'
              ? !!i.opinion &&
                PEOPLE_HOSTS.includes(i.host ?? i.author) &&
                (typeScope === 'all' || (typeScope === 'article' ? i.kind === 'opinion' : i.kind === typeScope))
              : i.kind === filter)) &&
          (!host || !hostRowOpen || i.host === host) &&
          (!stateScope || !stateRowOpen || (i.tag ?? '').startsWith(stateScope))
      ),
    [filter, host, hostRowOpen, stateRowOpen, stateScope, typeScope]
  );
  // Memoized: a fresh array identity every render would tear down and
  // re-attach the impression observers constantly.
  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = filtered.length > visibleCount;

  /* ---- collapsing-pill filter bar (DW+ app "Home_Page-Articles" motion) ----
     browse:      [All][Articles][Shorts][Episodes][Opinion]
     collapsing:  others fade+collapse (staggered), the picked pill FLIPs left,
                  ✕ scales in at far left, the host trigger slides out FROM
                  BEHIND the pill (z-index below, translateX only).
     selected:    [✕][Pill][All Hosts ⌄]   (no dropdown for Opinion)
     expanding:   exact reverse.
     Transform/opacity only; the bar is fixed-height so the feed below never
     shifts. Reduced motion: instant swap with a plain crossfade. */
  type BarMode = 'browse' | 'collapsing' | 'selected' | 'expanding';
  const [barMode, setBarMode] = useState<BarMode>('browse');
  const [barKind, setBarKind] = useState<ItemKind | null>(null);
  const [hostMenuOpen, setHostMenuOpen] = useState(false);
  const pillRefs = useRef(new Map<string, HTMLButtonElement>());
  const geom = useRef<{ lefts: Record<string, number>; widths: Record<string, number> }>({
    lefts: {},
    widths: {},
  });
  const barTimer = useRef<number | null>(null);
  const hostMenuRef = useRef<HTMLDivElement>(null);

  const X_SLOT = 52; // ✕ — full 52px DS chip circle (touch target included)
  const BAR_GAP = 8;
  const PILL_TARGET_X = X_SLOT + BAR_GAP;
  const SEQUENCE_MS = 540;

  const measurePills = () => {
    const lefts: Record<string, number> = {};
    const widths: Record<string, number> = {};
    for (const [k, el] of pillRefs.current) {
      lefts[k] = el.offsetLeft;
      widths[k] = el.offsetWidth;
    }
    geom.current = { lefts, widths };
  };

  const selectKind = (id: ItemKind | 'all') => {
    if (id === 'all' || barMode !== 'browse') return;
    measurePills();
    setBarKind(id);
    setFilter(id);
    setHost(null);
    setStateScope(null);
    setTypeScope('all');
    settle();
    setVisibleCount(PAGE_SIZE);
    setPlayingId(null);
    const label = FILTERS.find((f) => f.id === id)?.label ?? id;
    setAnnouncement(`Showing ${label}.`);
    track('filter_change', { filter: id });
    if (reducedMotion || narrowBar) {
      setBarMode('selected');
      return;
    }
    setBarMode('collapsing');
    barTimer.current = window.setTimeout(() => setBarMode('selected'), SEQUENCE_MS);
  };

  const exitFilters = () => {
    if (barMode !== 'selected') return;
    track('filter_exit', { from: filter, host });
    setHostMenuOpen(false);
    setStateMenuOpen(false);
    setFilter('all');
    setHost(null); // host and state selections are discarded on exit
    setStateScope(null);
    setTypeScope('all');
    settle();
    setVisibleCount(PAGE_SIZE);
    setPlayingId(null);
    visibility.current.clear();
    setAnnouncement('Filters cleared. Showing all coverage.');
    if (reducedMotion || narrowBar) {
      setBarMode('browse');
      setBarKind(null);
      return;
    }
    setBarMode('expanding');
    barTimer.current = window.setTimeout(() => {
      setBarMode('browse');
      setBarKind(null);
    }, SEQUENCE_MS);
  };
  useEffect(() => () => {
    if (barTimer.current) window.clearTimeout(barTimer.current);
  }, []);

  const pickHost = (name: string | null) => {
    setHost(name);
    settle();
    setVisibleCount(PAGE_SIZE);
    setHostMenuOpen(false);
    setPlayingId(null);
    visibility.current.clear();
    setAnnouncement(name ? `Filtered by ${name}.` : 'Host filter cleared.');
    track('host_filter_change', { host: name });
  };

  // Host/state dropdowns: click-outside and Escape close (both menus live
  // inside the same anchor).
  useEffect(() => {
    if (stateMenuOpen) stateSearchRef.current?.focus();
  }, [stateMenuOpen]);
  useEffect(() => {
    if (!hostMenuOpen && !stateMenuOpen) return;
    const closeBoth = () => {
      setHostMenuOpen(false);
      setStateMenuOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!hostMenuRef.current?.contains(e.target as Node)) closeBoth();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeBoth();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [hostMenuOpen, stateMenuOpen]);
  // Commit a mutation and pin the scroll across it, in the same frame.
  // Needed because Chrome keeps the viewport glued to the document's BOTTOM
  // edge when it grows while fully scrolled down (the reader clicked "Load
  // more" at the very bottom — exactly that case), which yanked the page
  // 1800px past the fresh rows. overflow-anchor: none does not cover it.
  const holdScroll = (mutate: () => void) => {
    const y = window.scrollY;
    flushSync(mutate);
    window.scrollTo(0, y);
  };

  const loadMore = () => {
    track('load_more_click', { visible: visibleCount });
    holdScroll(() => setLoadingMore(true));
    window.setTimeout(() => {
      holdScroll(() => {
        setVisibleCount((c) => c + PAGE_SIZE);
        setLoadingMore(false);
      });
    }, 900);
  };

  /* ---- impressions (once per item / ad) ---- */
  const seen = useRef(new Set<string>());
  const feedRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const key = (e.target as HTMLElement).dataset.impression;
          if (!key || seen.current.has(key)) continue;
          seen.current.add(key);
          track(key.startsWith('ad') ? 'ad_impression' : 'feed_item_impression', { key });
        }
      },
      { threshold: 0.4 }
    );
    root.querySelectorAll('[data-impression]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [visible, loading, filter, host]);

  /* ---- render list: day groups + ad slots ---- */
  /* The DS "Card Feed" row (DailyWire 3.0 App Design System, Card Feed):
     avatar-led — a 48px identity mark on the left (circle; square for an
     episode, where it is the show's art), and one column on the right
     holding the attribution row, the headline block and a full-width media
     surface. One shape for all content types; the type decides the media
     (16:9 still, 9:16 short with a mute mark, episode still with its
     duration badge) and whether the description shows (articles and opinion
     only). No background, no border, no divider — separation belongs to the
     list. Hover changes the headline colour and nothing else. */
  const KIND_LABEL_CARD: Record<FeedItem['kind'], string> = {
    article: 'Article',
    opinion: 'Opinion',
    short: 'Short',
    episode: 'Episode',
  };
  const initialsOf = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('');
  /* Rows arrive the way the panel's candidates do — not all at once: each
     card rises in a beat after the one above it. The nonce re-keys the list
     after every filter change so the entrance replays. */
  const [reveal, setReveal] = useState(0);
  useEffect(() => {
    if (!filtering) setReveal((n) => n + 1);
  }, [filtering]);
  const openItem = (item: FeedItem) => {
    markVisited(item.id);
    bumpVisited((n) => n + 1);
    track('feed_item_click', { id: item.id, kind: item.kind });
  };
  const renderFeedItem = (item: FeedItem, i = 0) => {
    // The DS writes the episode number here ("Ep. 1520"); the fixture has none.
    const kindLabel = KIND_LABEL_CARD[item.kind];
    const showDek = (item.kind === 'article' || item.kind === 'opinion') && !!item.dek;
    return (
      <div
        className={`feed-item feed-item--${item.kind}${item.opinion ? ' feed-item--opinion' : ''}${
          isVisited(item.id) ? ' is-visited' : ''
        }`}
        style={{ '--i': i } as React.CSSProperties}
        key={`${reveal}-${item.id}`}
        data-impression={`item-${item.id}`}
        // No article page yet — a click (or Enter/Space, it is focusable
        // like the link it stands in for) marks the item as visited
        // (persisted) instead of navigating. A div, not an <article>: the
        // link role is what assistive tech should hear for a card that acts
        // as one, and an article may not carry it.
        role="link"
        tabIndex={0}
        onClick={() => openItem(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openItem(item);
          }
        }}
      >
        {/* Identity mark: the show's art for an episode, initials otherwise
            (host photos have not landed). */}
        {item.kind === 'episode' ? (
          <span className="feed-avatar feed-avatar--square" aria-hidden="true">
            <img src={item.image} alt="" loading="lazy" decoding="async" />
          </span>
        ) : (
          <span className="feed-avatar" aria-hidden="true">
            {initialsOf(item.host ?? item.author)}
          </span>
        )}

        <div className="feed-body">
          <div className="feed-card-head">
            <div className="feed-attrib">
              <p className="feed-meta">
                <span className="feed-author">{item.author}</span>
                <span className="feed-sep" aria-hidden="true">•</span>
                <span className="feed-kind">{kindLabel}</span>
                <span className="feed-sep" aria-hidden="true">•</span>
                <span className="feed-time">{item.time}</span>
              </p>
              <button
                type="button"
                className="feed-kebab"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={menuFor === item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  track('feed_item_menu', { id: item.id });
                  setMenuFor((cur) => (cur === item.id ? null : item.id));
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="12" cy="19" r="1.8" />
                </svg>
              </button>
              {menuFor === item.id && <ItemMenu item={item} onClose={() => setMenuFor(null)} />}
            </div>
            <div className="feed-text">
              <h3 className="feed-headline">{item.headline}</h3>
              {showDek && <p className="feed-dek">{item.dek}</p>}
            </div>
          </div>

          {/* The media surface, by content type. Boxes are sized in CSS so an
              image landing later never shifts the row. */}
          {item.kind === 'short' ? (
            <div className="feed-thumb feed-thumb--portrait" aria-hidden="true">
              <img className="feed-img" src={item.imageTall ?? item.image} alt="" loading="lazy" decoding="async" />
              <span className="feed-mute">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                  <path d="m16 9 5 6M21 9l-5 6" />
                </svg>
              </span>
            </div>
          ) : (
            <div className="feed-thumb" aria-hidden="true">
              <img className="feed-img" src={item.imageWide} alt="" loading="lazy" decoding="async" />
              {item.kind === 'episode' && item.duration && (
                <span className="feed-duration">{item.duration}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const shortsGrid = filter === 'short';

  // Rows with ads: cadence runs on the FILTERED, visible list; an ad never
  // sits adjacent to a day divider (pushed one slot down instead).
  type Row = { type: 'divider'; label: string } | { type: 'item'; item: FeedItem } | { type: 'ad'; n: number };
  const rows: Row[] = useMemo(() => {
    if (shortsGrid) return []; // grid view builds separately, no ads
    const out: Row[] = [];
    let count = 0;
    let adN = 0;
    let pendingAd = false;
    visible.forEach((item, idx) => {
      const prev = visible[idx - 1];
      const boundary = !prev || prev.day !== item.day;
      if (boundary) {
        // An ad landing here would touch the divider — push it below the
        // divider's first item.
        out.push({ type: 'divider', label: item.day });
      }
      out.push({ type: 'item', item });
      count += 1;
      const next = visible[idx + 1];
      const nextIsBoundary = !next || next.day !== item.day;
      // One ad every four posts (Sep 2026).
      if (!IS_AD_FREE && (pendingAd || count % 4 === 0) && count > 0) {
        if (nextIsBoundary && next) {
          pendingAd = true; // would touch the upcoming divider — defer
        } else if (next) {
          adN += 1;
          out.push({ type: 'ad', n: adN });
          pendingAd = false;
        }
      }
    });
    return out;
  }, [visible, shortsGrid]);

  return (
    <section className="feed-section" aria-label="All election coverage" ref={feedRef}>
      <div className="feed-rail">
        <header className="feed-head">
          <h2>All Election Coverage</h2>
        </header>

        {/* Collapsing-pill filter bar, on its own row below the title. */}
        <div className={`filter-bar filter-bar--${barMode}`} role="group" aria-label="Filter coverage">
          {/* ✕ — flow slot in selected mode; absolute ghost while animating. */}
          {barMode !== 'browse' && (
            <button
              type="button"
              className={`filter-x filter-x--${barMode}`}
              aria-label="Clear filters"
              onClick={exitFilters}
            >
              {/* DS Close_24px: 10x10 vector, 1.5 stroke. */}
              <span className="filter-x-circle" aria-hidden="true">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="m1 1 8 8M9 1 1 9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
          )}

          {FILTERS.map((f, idx) => {
            const isSel = f.id === barKind;
            // Selected mode: only the chosen pill remains in flow.
            if (barMode === 'selected' && !isSel) return null;
            const fromLeft = geom.current.lefts[f.id] ?? 0;
            const style: React.CSSProperties & Record<string, string> = {};
            let cls = `feed-filter${
              barMode === 'browse' && filter === f.id ? ' is-active' : ''
            }${isSel && barMode !== 'browse' ? ' is-selected' : ''}`;
            if (barMode === 'collapsing') {
              if (isSel) {
                style['--dx'] = `${PILL_TARGET_X - fromLeft}px`;
                cls += ' anim-pill-flip';
              } else {
                style.animationDelay = `${idx * 20}ms`;
                cls += ' anim-pill-out';
              }
            } else if (barMode === 'expanding') {
              if (isSel) {
                style['--dx'] = `${PILL_TARGET_X - fromLeft}px`;
                cls += ' anim-pill-return';
              } else {
                style.animationDelay = `${120 + idx * 20}ms`;
                cls += ' anim-pill-in';
              }
            }
            return (
              <button
                key={f.id}
                type="button"
                ref={(el) => {
                  if (el) pillRefs.current.set(f.id, el);
                  else pillRefs.current.delete(f.id);
                }}
                aria-pressed={barMode === 'browse' ? filter === f.id : isSel}
                className={cls}
                style={style}
                // Clicking the already-selected pill exits too (same as ✕):
                // the pill and the host trigger leave together.
                onClick={() => (barMode === 'selected' && isSel ? exitFilters() : selectKind(f.id))}
              >
                {f.label}
              </button>
            );
          })}

          {/* RACES CALLED, its own filter (Sep 25 2026). It sits OUTSIDE the
              kind pills' collapse choreography on purpose: those animate
              against measured geometry, and a pill that comes and goes with
              the night would fight it. It only exists while the provider
              has called something. The rule under it carries the nav's
              Midterms gradient, and sweeps on hover the same way. */}
          {barMode === 'browse' && calls.length > 0 && (
            <button
              type="button"
              aria-pressed={callsOnly}
              className={`feed-filter feed-filter--calls${callsOnly ? ' is-active' : ''}`}
              onClick={() => {
                setCallsOnly((v) => !v);
                track('feed_filter', { kind: 'call', on: !callsOnly });
              }}
            >
              <span className="feed-filter-calls-label">Races called</span>
              <span className="feed-filter-calls-count">{calls.length}</span>
            </button>
          )}

          {/* Trigger group: slides out FROM BEHIND the pill (lower z-index,
              translateX only). Hosts never render for Opinion; the state
              filter renders for every kind. */}
          {barKind && barMode !== 'browse' && (
            <div
              className={`host-anchor host-anchor--${barMode}`}
              ref={hostMenuRef}
              style={
                barMode !== 'selected'
                  ? ({
                      left: `${PILL_TARGET_X}px`,
                      '--slide': `${(geom.current.widths[barKind] ?? 90) + BAR_GAP}px`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              {/* Secondary HOST filter — every kind (Sep 2026). */}
              {hostRowOpen && (
              <button
                type="button"
                className="host-trigger"
                aria-haspopup="menu"
                aria-expanded={hostMenuOpen}
                disabled={barMode !== 'selected'}
                onClick={() => {
                  setStateMenuOpen(false);
                  setHostMenuOpen((v) => !v);
                }}
              >
                {/* DS host chip: 38px avatar on the left (photo slot —
                    initials once a host is picked, empty until then). */}
                <span className="host-avatar host-avatar--lg" aria-hidden="true">
                  {host ? host.split(' ').map((w) => w[0]).slice(0, 2).join('') : ''}
                </span>
                {host ?? 'All Hosts'}
                {/* DS Chevron: 12x6 vector, 1.5 stroke. */}
                <svg width="12" height="6" viewBox="0 0 12 6" fill="none" aria-hidden="true">
                  <path
                    d="m1 1 5 4 5-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              )}

              {/* Secondary CONTENT TYPE filter — opinion only (Sep 2026). */}
              {filter === 'opinion' && (
              <button
                type="button"
                className="host-trigger type-trigger"
                aria-haspopup="menu"
                aria-expanded={typeMenuOpen}
                disabled={barMode !== 'selected'}
                onClick={() => {
                  setHostMenuOpen(false);
                  setStateMenuOpen(false);
                  setTypeMenuOpen((v) => !v);
                }}
              >
                {TYPE_LABEL[typeScope]}
                <svg width="12" height="6" viewBox="0 0 12 6" fill="none" aria-hidden="true">
                  <path d="m1 1 5 4 5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              )}
              {filter === 'opinion' && typeMenuOpen && (
                <div className="host-menu type-menu" role="menu" aria-label="Filter by content type">
                  {(['all', 'article', 'short', 'episode'] as TypeScope[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="menuitemradio"
                      aria-checked={typeScope === t}
                      className={`dock-menu-item${typeScope === t ? ' is-active' : ''}`}
                      onClick={() => {
                        setTypeScope(t);
                        setTypeMenuOpen(false);
                        settle();
                        track('type_filter_change', { type: t });
                      }}
                    >
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              )}
              {/* Secondary STATE filter — articles only (Sep 2026). */}
              {stateRowOpen && (
              <button
                type="button"
                className="host-trigger state-trigger"
                aria-haspopup="menu"
                aria-expanded={stateMenuOpen}
                disabled={barMode !== 'selected'}
                onClick={() => {
                  setHostMenuOpen(false);
                  setStateQuery('');
                  setStateMenuOpen((v) => !v);
                }}
              >
                {stateScope
                  ? STATE_SHAPES.find((st) => st.id === stateScope)?.name ?? stateScope
                  : 'All States'}
                <svg width="12" height="6" viewBox="0 0 12 6" fill="none" aria-hidden="true">
                  <path
                    d="m1 1 5 4 5-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              )}
              {stateRowOpen && stateMenuOpen && (
                <div className="host-menu state-menu" role="menu" aria-label="Filter by state">
                  {/* Internal search: with a real 50-state list this menu
                      is typed into, not scanned. */}
                  <input
                    type="search"
                    className="menu-search"
                    placeholder="Search states…"
                    aria-label="Search states"
                    value={stateQuery}
                    ref={stateSearchRef}
                    onChange={(e) => setStateQuery(e.target.value)}
                  />
                  {stateQuery.trim() === '' && (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={stateScope === null}
                    className={`dock-menu-item${stateScope === null ? ' is-active' : ''}`}
                    onClick={() => {
                      setStateScope(null);
                      settle();
                      setStateMenuOpen(false);
                      setVisibleCount(PAGE_SIZE);
                      track('state_filter_change', { state: null });
                    }}
                  >
                    All States
                  </button>
                  )}
                  {TAGGED_STATE_IDS.filter((id) => {
                    const q = stateQuery.trim().toLowerCase();
                    if (!q) return true;
                    const name = STATE_SHAPES.find((st) => st.id === id)?.name ?? id;
                    return name.toLowerCase().includes(q) || id.toLowerCase().includes(q);
                  }).map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={stateScope === id}
                      className={`dock-menu-item${stateScope === id ? ' is-active' : ''}`}
                      onClick={() => {
                        setStateScope(id);
                        settle();
                        setStateMenuOpen(false);
                        setVisibleCount(PAGE_SIZE);
                        track('state_filter_change', { state: id });
                      }}
                    >
                      {STATE_SHAPES.find((st) => st.id === id)?.name ?? id}
                    </button>
                  ))}
                </div>
              )}
              {hostMenuOpen && (
                <div className="host-menu" role="menu" aria-label="Filter by host">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={host === null}
                    className={`dock-menu-item${host === null ? ' is-active' : ''}`}
                    onClick={() => pickHost(null)}
                  >
                    All Hosts
                  </button>
                  {HOSTS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      role="menuitemradio"
                      aria-checked={host === h}
                      className={`dock-menu-item host-item${host === h ? ' is-active' : ''}`}
                      onClick={() => pickHost(h)}
                    >
                      {/* Photo slot — initials until real host photos land. */}
                      <span className="host-avatar" aria-hidden="true">
                        {h.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                      </span>
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PRD: filter changes are announced to screen readers. */}
        <div aria-live="polite" className="visually-hidden">
          {announcement}
        </div>

        {loading || filtering ? (
          <SkeletonRows count={4} kind={filter} />
        ) : shortsGrid ? (
          /* Shorts pill: grid of short cards; the top row hides (no dupes). */
          <div className="shorts-grid">
            {visible.map((item) => (
              <div key={item.id} data-impression={`item-${item.id}`}>
                <ShortCard
                  item={item}
                  playing={playingId === item.id}
                  hoverMode={hoverMode}
                  reducedMotion={reducedMotion}
                  onRequestPlay={requestPlay}
                  onRequestStop={requestStop}
                  onVisibility={hoverMode ? undefined : onVisibility}
                />
              </div>
            ))}
            {visible.length === 0 && (
              <div className="feed-empty">
                <p>Nothing matches those filters.</p>
                <button type="button" className="feed-clear" onClick={exitFilters}>
                  Clear filters ✕
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {filter === 'all' && (
              <div className="shorts-row-block">
                <h3 className="shorts-row-title">Latest shorts</h3>
                <ShortsShelf>
                  {latestShorts.map((item) => (
                    <ShortCard
                      key={item.id}
                      item={item}
                      playing={playingId === item.id}
                      hoverMode={hoverMode}
                      reducedMotion={reducedMotion}
                      onRequestPlay={requestPlay}
                      onRequestStop={requestStop}
                      onVisibility={hoverMode ? undefined : onVisibility}
                    />
                  ))}
                </ShortsShelf>
              </div>
            )}

            {visible.length === 0 && (
              <div className="feed-empty">
                <p>Nothing matches those filters.</p>
                <button type="button" className="feed-clear" onClick={exitFilters}>
                  Clear filters ✕
                </button>
              </div>
            )}

            {/* ELECTION NIGHT (PRD tenet 4): every call the map shows is
                also here, so results and the narrative never disagree — but
                behind a filter of its own since Sep 25 2026. Loose on top of
                the feed they read as headlines among headlines and got
                lost. A click still hands off to the map. */}
            {callsOnly && (
              <ul className="call-rows" aria-label="Races called">
                {calls.map((c) => (
                  <li key={c.key}>
                    <RaceCallRow c={c} />
                  </li>
                ))}
              </ul>
            )}

            {!callsOnly && rows.map((row, i) => {
              if (row.type === 'divider') {
                return (
                  <p className="feed-date" key={`d-${row.label}`}>
                    {row.label}
                  </p>
                );
              }
              if (row.type === 'ad') {
                return (
                  <div className="feed-ad" key={`ad-${row.n}`} data-impression={`ad-${row.n}`}>
                    <span className="feed-ad-label">Advertisement</span>
                  </div>
                );
              }
              return renderFeedItem(row.item, i);
                        })}
          </>
        )}

        {/* Load-more: the incoming rows announce themselves as skeletons in
            place, then swap for the real posts. */}
        {!loading && loadingMore && (
          <SkeletonRows count={Math.min(PAGE_SIZE, filtered.length - visibleCount)} />
        )}

        {!loading && hasMore && (
          <div className="feed-more-row">
            <button
              type="button"
              className="feed-more"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore && <span className="feed-spinner" aria-hidden="true" />}
              {loadingMore ? 'Loading…' : 'Load more coverage'}
            </button>
          </div>
        )}
      </div>

      {/* The comp's second column. Above 1080 this rail carries the ad
          inventory and the in-feed slots stand down (see index.css) — running
          both would double it. Ad-free tiers get neither (PRD tenet 4). */}
      {/* Two rails, one per side (Sep 2026). Each is its own landmark. */}
      {!IS_AD_FREE && (
        <div className="feed-ad-rail feed-ad-rail--left" role="group" aria-label="Advertisement, left">
          <div className="feed-ad-rail-inner">
            <p className="feed-ad-rail-label">ADVERTISEMENT</p>
            <div className="feed-ad-rail-slot" data-impression="ad-rail-left" />
          </div>
        </div>
      )}
      {!IS_AD_FREE && (
        <div className="feed-ad-rail feed-ad-rail--right" role="group" aria-label="Advertisement, right">
          {/* The column stretches so its left rule runs the full height of
              the stream; only this inner block sticks. */}
          <div className="feed-ad-rail-inner">
            <p className="feed-ad-rail-label">ADVERTISEMENT</p>
            <div className="feed-ad-rail-slot" data-impression="ad-rail" />
          </div>
        </div>
      )}
    </section>
  );
}
