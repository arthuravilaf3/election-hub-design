/**
 * The results widget — the piece that keeps the night on screen after the
 * stream scrolls away (hub tenet: the coverage is reachable from the whole
 * site, not only from the top of the home).
 *
 * ONE STATE, TWO SURFACES. Map fills, called counts and the balance bars all
 * come from the same reducer the hub's map runs on, so the widget cannot
 * drift from the full map — switching to it mid-night shows the same read.
 *
 * WHERE IT SITS. On wide viewports it is the home's right column, stuck to
 * the top as the sections scroll past. It was a card floating over the page
 * first; that covered Top Stories and the fourth Opinion card, so it took a
 * column of its own instead — the takeover above it still runs full width,
 * and nothing is ever hidden behind it.
 */
import { MiniMap } from './MiniMap';
import { HOLDOVER } from './homeContent';
import { summarize } from '../data/summary';
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
    <div className="rail-balance">
      <p className="rail-balance-head">
        <span className="rail-balance-label">{label}</span>
        <span className="rail-balance-sub">{called} called</span>
      </p>
      <div
        className="rail-bar"
        role="img"
        aria-label={`${label}: ${dem} Democratic, ${rep} Republican, ${total - dem - rep} undecided of ${total}. ${toWin} to win.`}
      >
        <span className="rail-bar-seg rail-bar-seg--dem" style={{ width: pct(dem) }} />
        <span className="rail-bar-seg rail-bar-seg--rep" style={{ width: pct(rep) }} />
        <span className="rail-bar-mark" style={{ left: pct(toWin) }} aria-hidden="true" />
      </div>
      <p className="rail-bar-legend">
        <span className="rail-num rail-num--dem">{dem} D</span>
        <span className="rail-num rail-num--win">{toWin} to win</span>
        <span className="rail-num rail-num--rep">{rep} R</span>
      </p>
    </div>
  );
}

interface ResultsRailProps {
  state: ElectionState;
}

export function ResultsRail({ state }: ResultsRailProps) {
  const mapRaces = state.ballot[state.chamber];
  const mapSummary = summarize(mapRaces, state.chamber, state.sourceId, HOUSE_DISTRICT_COUNT);
  const resultsSource =
    Object.values(mapRaces).find((r) => r.results?.source)?.results?.source ?? 'certified feed';

  return (
    <aside className="results-rail" aria-label="Live results">
      <header className="rail-head">
        <span className="rail-kicker">
          <span className="rail-dot" aria-hidden="true" />
          Live results
        </span>
        <a className="rail-full" href="https://www.dailywire.com/midterms">
          Full map <span aria-hidden="true">→</span>
        </a>
      </header>

      <div className="rail-map-wrap">
        <MiniMap races={mapRaces} chamber={state.chamber} sourceId={state.sourceId} />
        <ul className="rail-legend">
          <li>
            <span className="rail-swatch rail-swatch--called" aria-hidden="true" />
            Called <b>{mapSummary.calledDem + mapSummary.calledRep}</b>
          </li>
          <li>
            <span className="rail-swatch rail-swatch--leading" aria-hidden="true" />
            Leading <b>{mapSummary.leading}</b>
          </li>
          <li>
            <span className="rail-swatch rail-swatch--early" aria-hidden="true" />
            Too&nbsp;early <b>{mapSummary.uncalled}</b>
          </li>
        </ul>
      </div>

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

      <p className="rail-source">
        Calls from {resultsSource}. Seats not on this ballot are a fixture — the hub tracks 29
        curated House districts, not 435.
      </p>
    </aside>
  );
}
