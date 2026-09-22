/**
 * THE RACE ON ELECTION NIGHT (Sep 2026, PRD "Election Results Map"): the
 * drawer's results view — the provider's word on the race (Called ✓ /
 * Leading → / Too early …), how much of the expected vote is in, each
 * candidate's votes and share, and for the House every curated seat with
 * its own status. Only the feed's numbers: no estimate sits beside a live
 * count (tenet 2), and "Called" is the provider's, not ours (tenet 1).
 */
import { PARTY_LABEL, fmtLead, statusLabel } from '../data/encoding';
import { districtLabel } from '../data/districts';
import { resultsLabel } from '../data/sources';
import { formatET } from '../data/time';
import type { District, Results, StateRace } from '../data/types';
import { photoFor } from './candidatePhoto';

function StatusChip({ r }: { r: Results | undefined }) {
  const s = statusLabel(r);
  return (
    <span className={`race-chip race-chip--${s.tone}`}>
      <span aria-hidden="true">{s.icon}</span>
      {s.label}
      {s.tone === 'leading' && r ? ` — ${fmtLead(r)}` : ''}
    </span>
  );
}

function Reporting({ r }: { r: Results }) {
  return (
    <div className="reporting">
      <div
        className="reporting-bar"
        role="progressbar"
        aria-label="Expected vote reported"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={r.reporting}
      >
        <span style={{ width: `${r.reporting}%` }} />
      </div>
      <span className="reporting-pct">{r.reporting}% of expected vote in</span>
    </div>
  );
}

function VoteRows({ r }: { r: Results }) {
  if (!r.votes || r.reporting === 0) return <p className="drawer-note">No votes counted yet.</p>;
  const winner = r.status === 'called' ? r.leader : undefined;
  return (
    <ul className="bar-list">
      {r.votes.map((c) => (
        <li className={`bar-row bar-row--${c.party}`} key={c.name}>
          <span className="bar-fill" style={{ width: `${c.pct}%` }} aria-hidden="true" />
          <span className="bar-id">
            <span className="cand-avatar" aria-hidden="true">
              <img className="cand-photo" src={photoFor(c.name)} alt="" />
            </span>
            <span className="bar-lines">
              <span className="bar-title">
                {winner && c.party === winner && (
                  <span className="bar-win" aria-label="Winner">
                    ✓{' '}
                  </span>
                )}
                {c.name}
              </span>
              <span className="bar-sub">{c.party === 'ind' ? 'Independent' : PARTY_LABEL[c.party]}</span>
            </span>
          </span>
          <span className="bar-value bar-value--votes">
            {c.pct.toFixed(1)}%
            <span className="bar-votes">{c.votes.toLocaleString('en-US')} votes</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The House: every curated seat with the provider's status and its lead. */
function DistrictResults({ districts }: { districts: District[] }) {
  const seats = districts.filter((d) => d.curated);
  return (
    <ul className="bar-list district-list">
      {seats.map((d) => {
        const r = d.results;
        const s = statusLabel(r);
        const lean = r?.leader ?? 'tossup';
        const fill = r?.leader && r.margin !== undefined ? 50 + Math.min(50, Math.abs(r.margin) * 2) : 0;
        return (
          <li key={d.id} className={`bar-row bar-row--${lean}`}>
            <span className="bar-fill" style={{ width: `${fill}%` }} aria-hidden="true" />
            <span className="bar-id">
              <span className="bar-lines">
                <span className="bar-title">{districtLabel(d.id)}</span>
                <span className="bar-sub">
                  <span aria-hidden="true">{s.icon} </span>
                  {s.label}
                  {r ? ` · ${r.reporting}% in` : ''}
                </span>
              </span>
            </span>
            <span className="bar-value">{r?.leader && r.margin !== undefined ? fmtLead(r).replace(/^\w+/, (w) => w[0]) : '—'}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function ResultsBlock({ race, showDistricts }: { race: StateRace; showDistricts: boolean }) {
  const r = race.results;
  const stamp = r?.asOf ? formatET(new Date(r.asOf).getTime()) : null;
  return (
    <>
      <section className="drawer-block">
        <div className="drawer-block-head">
          <h3 className="drawer-sec">Results</h3>
          <p className="drawer-meta">
            {resultsLabel(r?.providerId ?? '')}
            {stamp && (
              <>
                <span className="drawer-meta-dot" aria-hidden="true">
                  ·
                </span>
                <span>updated {stamp}</span>
              </>
            )}
          </p>
        </div>
        <StatusChip r={r} />
        {r && <Reporting r={r} />}
        {r && <VoteRows r={r} />}
        <p className="drawer-note">Votes counted so far, per {resultsLabel(r?.providerId ?? '')}. A lead is not a result.</p>
      </section>
      {showDistricts && race.districts && race.districts.some((d) => d.curated) && (
        <>
          <hr className="drawer-divider" />
          <section className="drawer-block">
            <div className="drawer-block-head">
              <h3 className="drawer-sec">Districts ({race.districts.filter((d) => d.curated).length})</h3>
              <p className="drawer-meta">The curated seats, each on its own count.</p>
            </div>
            <DistrictResults districts={race.districts} />
          </section>
        </>
      )}
    </>
  );
}
