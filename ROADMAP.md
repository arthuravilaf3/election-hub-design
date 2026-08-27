# Election Hub — what to ship first

The **map** and the **coverage feed**, ordered by reader value, with where the
prototype stands on each one. Out of scope here: Prediction Game, election-day
coverage, Voter Information, Surveys and Conversations.

Source: Election Hub PRD (BRD + per-module PRDs, space BENTKEY).
State legend: ✅ built in the prototype · 🟡 partial · ⬜ missing.

---

## The argument

The prototype grew by design rounds, not by product priority. The result is that
**phases 1 and 2 are ahead while phase 3 is uncovered** — and phase 3 is election
night, where a wrong call is not a bug, it is a trust failure.

Three gaps remain, and all three are about credibility rather than polish: the
sentence that explains how sources diverge, the per-candidate vote in races that
have not been called, and the explicit "results delayed" state.

Only the first delivery has a date (the convention, Sep 9–10). The rest is
sequence; the one immovable external anchor is election night itself.

---

## Phase 1 — "Understand the race"
**First delivery — convention, Sep 9–10**

> Reader's job: see the same race through two lenses and decide which to believe.

| Feature | Why first | Today |
|---|---|---|
| Map by chamber: rating scale, legend, not-on-ballot state | It is the surface everything else hangs on | ✅ |
| Source and freshness on every number | A number without provenance is worth nothing here — it is what separates the hub from an infographic | ✅ |
| Three-source comparison inside the race | It is the module's declared job | ✅ |
| **Divergence sentence** ("Kalshi diverges 7 pts toward R vs the average") | Side by side is not deciding; the sentence is what lets the reader choose | ⬜ |
| Chronological feed with type, host and state filters | Coverage is half the hub and depends on nothing in the map | ✅ |
| Opinion with a distinct typographic treatment | A contract with the reader: commentary is not reporting | ✅ |
| **Keyboard-navigable race list** (the map's non-visual equivalent) | The PRD asks for it as a first-class surface | ⬜ |
| Honest degraded states (stale source, no data, source down) | "Never go stale in silence" is a requirement, not polish | 🟡 |
| Countdown and ad slots on a cadence (zero for ad-free) | Temporal framing and the business model from day one | ✅ |

---

## Phase 2 — "Follow what matters to me"

> Reader's job: mark the states I care about and go deeper into them.

| Feature | Why here | Today |
|---|---|---|
| **Follow a State** — following a state brings all of its elections | The reader thinks by place, not by chamber: one follow covers House, Senate and Governor | 🟡 |
| **Account gate** (anonymous first, free account to persist) | A hub tenet and the same door several modules share; Follow is the first to need it | ⬜ |
| Zoom depth: the state's full delegation and counties | Rewards going deeper without cluttering the map | ✅ mock |
| Coverage of the followed state inside the panel | Closes the loop: I follow the state, I get what is published about it | ⬜ |

---

## Phase 3 — "Election night"

> Reader's job: at a glance, what has been called, what is still close, and where control is heading.

| Feature | Why it is the risk | Today |
|---|---|---|
| Automatic cutover from forecast to result, no reload | The most sensitive moment in the product: the two must never blur | ✅ simulated |
| **Called / Too Early / Leading status with text and icon** | A lead is not a result, and color alone does not say that | 🟡 |
| **Per-candidate vote and % reporting in uncalled races** | Required by the PRD; the current data model does not even carry votes | ⬜ |
| **"Results delayed" state** | A declared launch blocker: data frozen in silence is a failure | ⬜ |
| Race calls feed the coverage stream | Map and narrative cannot contradict each other | ⬜ |

---

## Last version — what is not vital

| Feature | Why it waits |
|---|---|
| Race tags in the feed and the map ↔ coverage hand-off | Improves circulation between the modules, but neither depends on it to do its job |
| Embedding the map in other pages | Distribution, not product — and the base is already self-contained |
| Historical margin comparison (2022 / 2024) | Editorial depth on top of a finished base |
| iOS and Android parity | Outside this surface |

---

## What depends on an outside decision

| Subject | What it blocks | State |
|---|---|---|
| DDHQ / Kalshi / Polymarket licensing for comparison | All of phase 1 with real data | Open in the PRD |
| Account system readiness | Follow a State and any cross-device persistence | Schedule risk noted in the PRD |
| Owner and cadence of the 29-district curation | What the House shows on the map | Open in the PRD |
| Certified feed with a < 2 min call-to-map SLA | All of phase 3 | Open |
| Cutover global or per state as polls close | The shape of phase 3 (the prototype supports both) | Open in the PRD |

---

## Seeing each phase in the prototype

The prototype has a phase switcher (bottom right) and accepts `?phase=1|2|3|4`:
each phase shows **only** what it carries, so the MVP can be demonstrated without
a promise built into it. `?phase=1` is the first delivery; `★` is the last version.

Explorations outside the roadmap stay off by default — the per-race trusted-source
picker, for instance, only appears with `?trust=1`.
