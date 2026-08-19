---
name: election-hub-context
description: Product context for the DailyWire+ 2026 Election Hub. Read this before planning or implementing ANY Election Hub feature (maps, prediction game, live coverage, feed) so decisions align with the BRD/PRD requirements and tenets. Trigger whenever the task mentions Election Hub, election map, prediction game, race calls, election night, cutover, or any of the hub's modules.
---

# Election Hub 2026 — Product Context

Distilled from the BRD + 9 PRDs (author: Paul Snyder, Director of Product) in Confluence, space BENTKEY. This is the "what and why" — when a design/implementation decision is ambiguous, resolve it with the tenets below, in this order: hub tenets first, then the relevant module's tenets.

Source of truth: the Confluence pages listed at the bottom. If code conflicts with this doc, this doc wins; if this doc conflicts with Confluence, Confluence wins.

## What this is

A single-page election destination on DW+ (web, iOS, Android; TV gets live-stream playback only) carrying readers through the 2026 midterms (Election Day: **November 3, 2026**) in three phases:

- **Phase 1 (now → Sep 9-10, Republican Convention):** Coverage Feed + Pre-Election Map
- **Phase 2 (Sep 11 → Nov 3):** + Prediction Map Game
- **Phase 3 (Nov 3 → TBD):** + Election Results Map + Election Day Coverage (stream/chat/blog)

Business framing: 2026 is a rehearsal for 2028 — live results, chat, blog, and the game battle-test data partnerships and infra before presidential-cycle traffic. Data partners: **DecisionDeskHQ** (polling avgs + certified results), **Kalshi** and **Polymarket** (market-implied odds), possibly **AP** (results). Licensing for personalization/comparison/grading use (not just editorial display) is an OPEN question — don't hard-couple features to a specific provider.

## Hub-wide tenets (override everything else)

1. **Anonymous first, account to persist.** Every module lets a reader participate anonymously on web; a free account is the single, consistent gate for saving/tracking/updates. Mobile apps require an account to use at all. Never invent per-module gating rules.
2. **Predictions and results must never blur.** Polling/market data, reader predictions, and certified results stay visually AND functionally distinct — including through the live cutover on election night. This is the most important design constraint in the project.
3. **A race call is DW+'s credibility on the line.** "Called" ONLY traces to the certified results feed. Never a DW+ projection, never a trend-based call, even if competitors call first. Showing a wrong "Called" is a trust failure that blocks launch, not a bug.
4. **Funded and fast.** Ad slots, account gates, and membership offers are part of the free experience from day one; no module may degrade hub reliability or crash-free session rate.

Failure mode to design against everywhere: stale, mislabeled, or unofficial data with no fallback state. Every number visible on screen carries a source label and freshness. "Results delayed" is a designed state, never silent staleness.

## The shared map (Pre-Election Map + Results Map = ONE component)

The pre-election map and the results map are **the same product with two data sources**, not two products. It automatically cuts over from prediction data to results data at a defined point on election night — even mid-visit, without a page reload. The prototype exposes a message API contract to preserve: `usmap-select`, `usmap-flash`, `usmap-list`.

### Pre-Election mode (Phase 1-2)

Reader job: see the same race through polling and market lenses side by side and decide which to believe.

- Chamber selector: Senate / House / Governor. Summary stats per chamber: seat counts, seats up, toss-ups. Election Day countdown.
- **Data source toggle**: polling avg vs prediction markets coloring. Tenet: *no single source should look like the truth* — sources get equal visual weight, side by side.
- **"Which read do you trust" voting (P2)**: reader declares trust per race. Trust is user-declared, never assumed. IMPORTANT: reader picks are NOT a 4th data source — they must be visually/functionally distinct from polling/market toggles (hub tenet 2). The P.O.'s prototype puts "Your Picks" in the same control group as data sources; that violates the tenet — separate it.
- Save & track a pick = account-gated (free account). Anonymous voting allowed first.
- Race detail drawer with cross-source comparison + poll-vs-market delta ("market X diverges N points toward R vs polling avg"). Every comparison view carries a sourcing disclaimer.
- Not-on-ballot empty state when a state has no race in the selected chamber.
- Chamber/source switches never trigger a full page reload.

### Results mode (Phase 3)

Reader job: at a glance — which races are called, which are too close, how chamber control is shifting — on the map they already know.

- **Race statuses: `Called` / `Too Early` / `Leading`.** A lead is not a result — never let the map look more certain than the data. Uncalled races ALWAYS show live vote share + % reporting, not just a leaning color.
- "Called" fires only from the certified feed. Target: <2 min from feed call to map update. Zero DW+-specific calls.
- Cutover is automatic at a defined point (open question whether global or per-state as polls close — build for both).
- Results sourcing disclosure: provider name + last-updated timestamp.
- If the feed is delayed/down: explicit "results delayed" state, never frozen data.
- Race calls also fire structured events into the live blog and coverage feed (P3 requirement) — map and narrative coverage must never disagree.
- Race status conveyed through **text + icon, not color alone** (WCAG requirement, also encodes tenet 2).

### Encoding rule (design decision, validated by research)

Light/desaturated = estimate; solid/saturated = fact. Prediction mode uses margin/confidence-scaled color (tossups near-neutral); `Leading` states stay desaturated (+ pattern/hatch); only `Called` gets full saturation. The map visually "hardens" through the night as races are called. Rationale: dichotomized maps mislead readers about margins and perceived voting influence (Furrer et al. 2023); binary color answers "who won", continuous answers "how it's going" — the hub needs both, keyed to race status.

## Prediction Map Game ("Perfect Prediction Map")

Reader job: prove you understand the midterms better than the pundits — call every race, get graded live, compare against everyone else.

- **Exactly 100 races**: every Senate + Governor contest + the 29 closest House races (editor-curated list, updated through the cycle — NOT all 435). Must be completable in one sitting.
- Single-tap auto-fill from polling or market favorites; progress tracker (N/100); edit picks until lock; **all picks lock at a defined cutoff before results**.
- **Live grading pulls EXCLUSIVELY from the same certified results feed as the Results Map.** Never a faster-but-unofficial source. The game cannot grade faster than the newsroom confirms.
- Scoring is framed around the perfect map — calling every race right, no partial-credit framing. Do NOT invent scoring weights (the prototype's "2 pts per toss-up" is not in the PRD; prize rules have legal implications — scoring changes go through the P.O.).
- Aggregate reader comparison is the retention mechanic (my picks vs crowd %). Note: "sorted by most followed"/"% of readers" displays require REAL data — until there's critical mass, ship the unranked state (alphabetical). Design both states.
- **DW+ Picks are revealed only AFTER the reader locks their own ballot** (anti-bias tenet).
- Teams are first-class: create/join, team score vs other teams, leaderboard, shareable result.
- Account links picks to identity (grading needs an identity); anonymous play first on web per hub tenet 1.
- Race-call taps register as optimistic updates; grading must never double-grade or skip a race.

## Election Day Coverage (Nov 3 page)

Reader job: one page with the call, the commentary, and a way to react — no tab-flipping.

- Three surfaces: **live video stream (the anchor — primary visual weight), live chat, live blog**. Chat and blog are companions to the stream.
- **The live blog is the system of record**: every major call/update lands in the blog first; video and chat reference it. Blog SLA: ≤5 min editorial submission → published. Reuses the in-house Live Blog system (Arena replacement) — do not build a second live-text system. The live blog belongs to THIS page, not to the game (prototype misplaces it).
- Chat: separate, clearly bounded surface — never interleaved into the blog. Posting requires sign-in/membership; real-time moderation; removable content without taking chat offline.
- **Independent fallbacks per surface** — a stream outage must not take down chat or blog. Zero outages >2 min is the bar.
- Auto-refresh without reload (blog posts appear automatically). PiP/persistent mini-player while scrolling (P2). Race-call highlighting in the blog (P3).
- Performance bars: stream start <5s pre-warmed, chat propagation <1s, page load-tested for the highest-traffic night of the cycle.
- A11y: captions on the player, blog updates announced to screen readers, chat fully keyboard-navigable.

## Election Coverage Feed

One chronological, filterable stream of ALL midterm content (articles, shorts, episodes, opinion). Key rules: **opinion gets a distinct type treatment** (commentary ≠ reporting is a contract with the reader); in-feed ad slots on a fixed cadence for ad-eligible tiers ONLY (zero ads for ad-free subscribers); race tags on race-specific items hand off into the map/Follow a Race; load-more pagination, day grouping, relative timestamps. Filter changes announced to screen readers.

## Deferred modules (post-v1, design-aware but don't build)

- **Voter Information (Should Have):** address → polling place, ballot preview, key dates. 2024 used a vote.org integration — customization limits unknown; design from what the integration permits.
- **Follow a Race (Should Have):** shortlist races; anonymous follow first, account to persist — the template for hub-wide gating.
- **Conversations (Could Have):** sidebar of host/reporter open threads (Insticator-adjacent integration).
- **Surveys (Could Have):** one midterm question at a time in the sidebar, reveals aggregate after answering (2024 used sided.co; likely a skinned widget, not a fully custom component).

## Cross-cutting requirements (every module)

- WCAG 2.1 AA. The map requires a non-visual equivalent (keyboard-navigable race list) as a first-class surface — the prototype's `usmap-list` API exists for this.
- Segment analytics events on every module.
- No full-page reloads for any data refresh anywhere in the hub.
- Web + iOS + Android at launch; TV = stream playback only.
- Final Figma designs are owned by the design team (Arthur) — PRDs explicitly defer visual decisions to design. Prototypes in PRD comments are directional, not spec; where a prototype conflicts with a PRD tenet, the tenet wins.

## Open questions (don't silently resolve these in code)

1. Data licensing (DDHQ/Kalshi/Polymarket/AP) for comparison/grading use — abstract providers behind interfaces.
2. Cutover: global at one time vs per-state as polls close — support both until decided.
3. Who curates the 29 House races + update cadence.
4. Account system readiness as the single gate across five modules simultaneously.
5. Required degraded states (results delayed, stale data, source down) are launch blockers, not polish — model them as component states from the start.

## Sources (Confluence, space BENTKEY)

- BRD: https://bentkey.atlassian.net/wiki/spaces/BENTKEY/pages/1802108951
- Pre-Election Map: .../pages/1843298313
- Election Results Map: .../pages/1843101710
- Prediction Map Game: .../pages/1843265546
- Election Day Coverage: .../pages/1843134467
- Election Coverage Feed: .../pages/1842970626
- Voter Information: .../pages/1843003395 · Follow a Race: .../pages/1840283654 · Conversations: .../pages/1842675716 · Surveys: .../pages/1842216965
