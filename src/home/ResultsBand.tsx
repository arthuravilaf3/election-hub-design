/**
 * The results band — the map, the calls and chamber control, under the stream
 * and the chat (Arthur, Sep 22 2026: "logo abaixo do live chat + video").
 *
 * It was a card pinned to the right edge for one round. That fought the chat
 * for the same edge at the top of the page and, as a column, squeezed the
 * sections under it — so it went back to a full-width row where the map can
 * be read at a glance beside both chamber bars.
 *
 * ONE STATE, TWO SURFACES. Map fills, called counts and the bars all come
 * from the same reducer the hub's map runs on, so this cannot drift from the
 * full map — switching to it mid-night shows the same read.
 */
import { MiniMap } from './MiniMap';
import { HOLDOVER } from './homeContent';
import { resultsLabel } from '../data/sources';
import { summarize } from '../data/summary';
import { formatET } from '../data/time';
import { HOUSE_DISTRICT_COUNT } from '../data/mockRaces';
import type { ElectionState } from '../state/electionReducer';

const CHAMBERS: Array<{ id: 'house' | 'senate'; label: string }> = [
  { id: 'house', label: 'House' },
  { id: 'senate', label: 'Senate' },
];

interface BalanceProps {
  label: string;
  dem: number;
  rep: number;
  total: number;
  toWin: number;
  called: number;
}

function Balance({ label, dem, rep, total, toWin, called }: BalanceProps) {
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="band-balance">
      <p className="band-balance-head">
        <span className="band-balance-label">{label}</span>
        <span className="band-balance-sub">
          {called} called <span aria-hidden="true">·</span> {toWin} to win
        </span>
      </p>
      <div
        className="band-bar"
        role="img"
        aria-label={`${label}: ${dem} Democratic, ${rep} Republican, ${total - dem - rep} undecided of ${total}. ${toWin} to win.`}
      >
        <span className="band-bar-seg band-bar-seg--dem" style={{ width: pct(dem) }} />
        <span className="band-bar-seg band-bar-seg--rep" style={{ width: pct(rep) }} />
        <span className="band-bar-mark" style={{ left: pct(toWin) }} aria-hidden="true" />
      </div>
      <p className="band-bar-legend">
        <span className="band-num">{dem} D</span>
        <span className="band-num band-num--win">{toWin} to win</span>
        <span className="band-num">{rep} R</span>
      </p>
    </div>
  );
}

interface ResultsBandProps {
  state: ElectionState;
}

export function ResultsBand({ state }: ResultsBandProps) {
  const mapRaces = state.ballot[state.chamber];
  const mapSummary = summarize(mapRaces, state.chamber, state.sourceId, HOUSE_DISTRICT_COUNT);
  const resultsSource = resultsLabel(
    Object.values(mapRaces).find((r) => r.results?.providerId)?.results?.providerId ?? ''
  );
  const { feedAsOf, delayed } = state.night;

  return (
    <section className="results-band" aria-label="Live results">
      <div className="band-map-block">
        <MiniMap races={mapRaces} sourceId={state.sourceId} />
        <div className="band-map-side">
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
          <a className="band-full" href="https://www.dailywire.com/midterms">
            Full map <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <div className="band-balances">
        {CHAMBERS.map(({ id, label }) => {
          const s = summarize(state.ballot[id], id, state.sourceId, HOUSE_DISTRICT_COUNT);
          const hold = HOLDOVER[id];
          return (
            <Balance
              key={id}
              label={label}
              dem={hold.dem + s.calledDem}
              rep={hold.rep + s.calledRep}
              total={hold.total}
              toWin={hold.toWin}
              called={s.calledDem + s.calledRep}
            />
          );
        })}
        {/* Freshness is not optional: the band says who called it and when
            the last batch landed, and says so louder when the feed stalls. */}
        <p className={`band-source${delayed ? ' band-source--delayed' : ''}`}>
          {delayed ? 'Results delayed' : `Calls from ${resultsSource}`}
          {feedAsOf ? ` · updated ${formatET(new Date(feedAsOf).getTime())}` : ''}. Seats not on this
          ballot are a fixture — the hub tracks 29 curated House districts, not 435.
        </p>
      </div>
    </section>
  );
}
