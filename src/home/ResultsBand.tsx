/**
 * The results band — the map, the calls and chamber control, under the stream
 * and the chat (Arthur, Sep 22 2026: "logo abaixo do live chat + video").
 *
 * It was a card pinned to the right edge for one round. That fought the chat
 * for the same edge at the top of the page and, as a column, squeezed the
 * sections under it — so it went back to a full-width row where the map can
 * be read at a glance beside both chamber bars.
 *
 * THE HUB'S IDENTITY (Oct 9 2026: "aproximar mais da identidade do branding
 * e dar um pouco mais de destaque"). The band is now a panel that reads as a
 * piece of The Midterms, not as a widget of the home: the hub's name, the
 * Right Place to Be mark, the blue→red rule of the nav's gradient across its
 * top, and each chamber drawn as the hub's own seat line — party avatars at
 * the ends, the figure in ink, rounded runs with gaps, "D needs · R needs"
 * hung over the majority. The map grows to carry the panel.
 *
 * ONE STATE, TWO SURFACES. Map fills, called counts and the bars all come
 * from the same reducer the hub's map runs on, so this cannot drift from the
 * full map — switching to it mid-night shows the same read.
 */
import { forwardRef } from 'react';
import { MiniMap } from './MiniMap';
import { HOLDOVER } from './homeContent';
import { PartyMark } from '../components/PartyMark';
import { asset } from '../data/assets';
import { resultsLabel } from '../data/sources';
import { summarize } from '../data/summary';
import { formatET } from '../data/time';
import { HOUSE_DISTRICT_COUNT } from '../data/mockRaces';
import type { ElectionState } from '../state/electionReducer';

/** The Election Hub and the game, as the prototype links them (Oct 9 2026):
    the hub's live build on election night with picks made, and the Pick 'Em
    prototype. Every "go to the hub" / "play the game" on the home uses these,
    the nav's The Midterms menu included. */
export const HUB_URL = 'https://arthuravilaf3.github.io/election-hub-prototype/?phase=3&night=21:40&picks=23';
export const GAME_URL = 'https://henrique-menezzo.github.io/pick-em-p9/';

export const CHAMBERS: Array<{ id: 'house' | 'senate'; label: string }> = [
  { id: 'house', label: 'House' },
  { id: 'senate', label: 'Senate' },
];

/** One chamber's night, in seats: the holdovers plus tonight's calls, then
    tonight's leads and what is still too early. */
export interface ChamberSeats {
  label: string;
  dem: number;
  rep: number;
  leadDem: number;
  leadRep: number;
  total: number;
  toWin: number;
  calledDem: number;
  calledRep: number;
  /** Seats the party holds that are NOT on this ballot — the night starts
   *  from these, and the dock prints them as "N current". */
  holdDem: number;
  holdRep: number;
  open: number;
}

export function chamberSeats(state: ElectionState, id: 'house' | 'senate', label: string): ChamberSeats {
  const s = summarize(state.ballot[id], id, state.sourceId, HOUSE_DISTRICT_COUNT);
  const hold = HOLDOVER[id];
  return {
    label,
    dem: hold.dem + s.calledDem,
    rep: hold.rep + s.calledRep,
    leadDem: s.leadingDem,
    leadRep: s.leadingRep,
    total: hold.total,
    toWin: hold.toWin,
    calledDem: s.calledDem,
    calledRep: s.calledRep,
    holdDem: hold.dem,
    holdRep: hold.rep,
    open: s.leading + s.uncalled,
  };
}

/* The dock says who HAS won, not how far each side still is (Arthur, Oct 21
   2026: "pode tirar o D needs 27 e o R needs 15"). The arithmetic stays in
   controlLine for the bar's description and the full panel — a screen reader
   still gets it; the fixed bar just stops doing sums at the reader. */
function controlWon(c: ChamberSeats): string | null {
  if (c.toWin - c.rep <= 0) return 'R wins control';
  if (c.toWin - c.dem <= 0) return 'D wins control';
  return null;
}

function controlLine(c: ChamberSeats): string {
  const needD = c.toWin - c.dem;
  const needR = c.toWin - c.rep;
  if (needR <= 0) return 'R wins control';
  if (needD <= 0) return 'D wins control';
  return `D needs ${needD} · R needs ${needR}`;
}

/**
 * The hub's seat line, at the home's scale: called solid, leading hatched,
 * too early grey — five runs, the same encoding as the hub's header, so a
 * lead never passes for a call. `compact` is the dock's one-line cut.
 */
export function SeatBar({ c, compact = false }: { c: ChamberSeats; compact?: boolean }) {
  const pct = (n: number) => `${(n / c.total) * 100}%`;
  const early = Math.max(0, c.total - c.dem - c.rep - c.leadDem - c.leadRep);
  const control = controlLine(c);
  const runs: Array<[string, number]> = [
    ['called-dem', c.dem],
    ['lead-dem', c.leadDem],
    ['early', early],
    ['lead-rep', c.leadRep],
    ['called-rep', c.rep],
  ];
  /* The bar is the whole chamber — seats held plus seats won tonight — while
     the headline numbers above it are only tonight's calls. One sentence
     carries both, because the picture alone cannot say which is which. */
  const barLabel =
    `${c.label}: Democrats ${c.calledDem} called tonight on top of ${c.holdDem} held, ` +
    `Republicans ${c.calledRep} called on top of ${c.holdRep} held, ` +
    `${c.leadDem + c.leadRep} leading, ${early} too early, of ${c.total}. ${control}.`;
  const bar = (
    <div className="hseat-bar" role="img" aria-label={barLabel}>
      {runs.map(([kind, n]) =>
        n > 0 ? <span key={kind} className={`hseat-run hseat-run--${kind}`} style={{ width: pct(n) }} /> : null
      )}
      <span className="hseat-mark" style={{ left: pct(c.toWin) }} aria-hidden="true" />
    </div>
  );

  /* THE DOCK'S LAYOUT (Oct 21 2026, from Arthur's reference): each end is the
     party mark, its name and what it has CALLED tonight — not its seat total,
     which is what the bar draws; the middle is what is still uncalled; and the
     seats each party already held sit under its own end. The chamber and the
     control line share the foot's middle, the one slot the reference leaves
     free, because "who wins" is the question the dock exists to answer. */
  if (compact) {
    return (
      <div className="hseat hseat--compact">
        <div className="hseat-ends">
          <span className="hseat-end">
            <PartyMark party="dem" />
            <abbr className="hseat-party hseat-party--dem" title="Democrats">
              DEM
            </abbr>
            <b className="hseat-big">{c.calledDem}</b>
            <span className="visually-hidden">called tonight</span>
          </span>
          <span className="hseat-open">
            Uncalled: <b>{c.open}</b>
          </span>
          <span className="hseat-end hseat-end--rep">
            <PartyMark party="rep" />
            <abbr className="hseat-party hseat-party--rep" title="Republicans">
              GOP
            </abbr>
            <b className="hseat-big">{c.calledRep}</b>
            <span className="visually-hidden">called tonight</span>
          </span>
        </div>
        {bar}
        <p className="hseat-foot">
          <span className="hseat-held">{c.holdDem} current</span>
          <span className="hseat-foot-control">
            <span className="hseat-chamber">{c.label}</span>
            {controlWon(c)}
          </span>
          <span className="hseat-held">{c.holdRep} current</span>
        </p>
      </div>
    );
  }

  return (
    <div className="hseat">
      <div className="hseat-ends">
        <span className="hseat-end">
          <PartyMark party="dem" />
          <b className="hseat-big">{c.dem}</b>
          <abbr className="hseat-party hseat-party--dem" title="Democrats">
            D
          </abbr>
        </span>
        <span className="hseat-win" style={{ left: pct(c.toWin) }}>
          {control}
        </span>
        <span className="hseat-end">
          <b className="hseat-big">{c.rep}</b>
          <abbr className="hseat-party hseat-party--rep" title="Republicans">
            R
          </abbr>
          <PartyMark party="rep" />
        </span>
      </div>
      {bar}
      <p className="hseat-foot">
        <span>{c.calledDem} called</span>
        <span className="hseat-foot-open">{c.open} uncalled</span>
        <span className="hseat-foot-control">{control}</span>
        <span>{c.calledRep} called</span>
      </p>
    </div>
  );
}

interface ResultsBandProps {
  state: ElectionState;
}

export const ResultsBand = forwardRef<HTMLElement, ResultsBandProps>(function ResultsBand({ state }, ref) {
  const mapRaces = state.ballot[state.chamber];
  const mapSummary = summarize(mapRaces, state.chamber, state.sourceId, HOUSE_DISTRICT_COUNT);
  const resultsSource = resultsLabel(
    Object.values(mapRaces).find((r) => r.results?.providerId)?.results?.providerId ?? ''
  );
  const { feedAsOf, delayed } = state.night;

  return (
    <section ref={ref} className="results-band" aria-labelledby="band-title">
      <header className="band-head">
        <div className="band-head-copy">
          <h2 id="band-title" className="band-title">
            The Midterms
          </h2>
          <p className={`band-fresh${delayed ? ' band-fresh--delayed' : ''}`}>
            {delayed ? 'Results delayed' : 'Live results'}
            {feedAsOf ? ` · updated ${formatET(new Date(feedAsOf).getTime())}` : ''}
          </p>
        </div>
        <img
          className="band-mark"
          src={asset('logos/the-right-place.svg')}
          alt="The Right Place to Be"
          width={210}
          height={103}
        />
      </header>

      <div className="band-body">
        <div className="band-map-block">
          <MiniMap races={mapRaces} sourceId={state.sourceId} />
          <ul className="band-legend">
            <li>
              <span className="band-swatch band-swatch--called" aria-hidden="true" />
              Called <b>{mapSummary.calledDem + mapSummary.calledRep}</b>
            </li>
            <li>
              <span className="band-swatch band-swatch--leading" aria-hidden="true" />
              Leading <b>{mapSummary.leading}</b>
            </li>
            <li>
              <span className="band-swatch band-swatch--early" aria-hidden="true" />
              Too early <b>{mapSummary.uncalled}</b>
            </li>
          </ul>
        </div>

        <div className="band-chambers">
          {CHAMBERS.map(({ id, label }) => (
            <div key={id} className="band-chamber">
              <h3 className="band-chamber-title">{label}</h3>
              <SeatBar c={chamberSeats(state, id, label)} />
            </div>
          ))}
        </div>
      </div>

      <footer className="band-foot">
        {/* Freshness is not optional: the band says who called it and when
            the last batch landed, and says so louder when the feed stalls. */}
        <p className="band-source">
          Calls from {resultsSource}. Seats not on this ballot are a fixture — the hub tracks 29 curated House
          districts, not 435.
        </p>
        <a className="band-full" href={HUB_URL}>
          Open the full map <span aria-hidden="true">→</span>
        </a>
      </footer>
    </section>
  );
});
