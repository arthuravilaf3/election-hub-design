# US Election Map — Prototype

One React + TypeScript + Vite component prototyping the shared Election Hub map: **prediction** (pre-election, colored by a chosen data source) and **results** (election night, colored by race status), with a live in-place cutover between them.

Scope of this prototype is the [Pre-Election Map PRD](https://bentkey.atlassian.net/wiki/spaces/BENTKEY/pages/1843298313). Results mode exists because the two are one component with two data sources, not two products.

## The encoding rule

> **Light = estimate. Solid = fact.**

Saturation encodes epistemic confidence. Tossups and low-margin predictions render near-white; counting races are capped at light fills + a diagonal hatch; the fully saturated party color (step 5) is reserved exclusively for **called** races, reached via the ~350ms "hardening" transition plus a one-time flash. The narrative of the night is the map progressively hardening from pale to solid.

### Two ramps, never one

Polling averages are measured in **points**; prediction markets are measured in **implied probability**. Each gets its own ramp, its own legend, and its own tossup band, and nothing converts between them — a market's 61% is not "D+3.4". See [`src/data/encoding.ts`](src/data/encoding.ts).

Colors live in one place: [`src/colors.css`](src/colors.css). Styling follows the Daily Wire design tokens (DW 3.0 Source of Truth), dark-first. The party scales are **data-viz tokens** kept deliberately distinct from the brand red — brand never encodes data, party colors never style chrome.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # reducer, encoding and summary rules (vitest)
npm run lint       # eslint incl. jsx-a11y
npm run build      # typecheck + production build
```

`src/data/states.ts` is generated (already committed). To regenerate from us-atlas: `npm run generate:map`.

## What the map does

- **Chamber selector** — Senate / House / Governor, a macOS-style dock below the map. The ballot is chamber-scoped: 35 Senate contests, 36 Governor, and 16 states holding the 29 curated closest House districts. A state absent from a chamber is **not on the ballot** and says so — for Senate that is the majority of the map. Proximity magnification on the dock is mouse-only sugar; underneath it stays a native radiogroup.
- **Data source toggle** — polling average, Kalshi, Polymarket, at equal visual weight. Switching recolors the map on that source's own ramp and swaps the legend.
- **Chamber summary** — current composition, seats up, and either lean/toss-up counts (pre-election) or called/not-called counts (results). Never both: an estimate must not sit beside a result wearing the same styling.
- **Sourcing disclosure** — provider plus how current the data is. Past `STALE_AFTER_MS` it says so with an icon and text, never silently.
- **House zoom camera** — clicking a state in House flies the camera to it and blurs the rest, with that state's curated districts listed alongside. There is no congressional-district geometry in us-atlas, so the zoom makes room for district *detail*; it does not draw district shapes.
- **3D stage + lift** — the map rests at an 11° tilt (`--tilt-rest`; hard cap 14° before shapes shear) and eases to 5° while the reader is interacting. Hover or keyboard focus lifts the state: since SVG children can't `translateZ` and paint in document order, the lift is an inert top-painted copy (`.lift-overlay`, same pattern as the selection outline) carrying the shadow and stroke highlight above neighbors, while the darkened original underneath keeps every pointer/focus/ARIA duty. Elevation never changes a fill — the copy uses the same `fillFor` — so the encoding rule survives the motion layer.

## Structure

- `src/components/ElectionMap.tsx` — the map: one focusable `<path>` per state, mode-based fills, hatch overlay, zoom camera
- `src/components/RaceList.tsx` — keyboard-first race list, the non-visual equivalent of the map
- `src/components/DistrictPanel.tsx` — curated House districts inside a zoomed state
- `src/components/{ChamberSelector,SourceToggle,ChamberSummary,Countdown,SourcingDisclosure,Legend}.tsx` — the P1 control and disclosure surfaces
- `src/data/sources.ts` — provider definitions behind an interface (licensing is unresolved; nothing hard-codes a provider)
- `src/data/encoding.ts` — every visual and verbal encoding decision
- `src/state/electionReducer.ts` — all transition rules
- `src/hooks/useMessageApi.ts` — window message contract

## Simulating election night

Use the dev toolbar (bottom bar): global mode toggle, per-state cutover, poll-closing waves, call a race, % reporting, and **Simulate stale feed** to exercise the staleness disclosure.

## Window message API

The original three commands are unchanged; `chamber` and `sourceId` are additive.

```js
window.postMessage({ type: 'usmap-select', stateId: 'GA' }, '*');
window.postMessage({ type: 'usmap-flash', stateId: 'GA' }, '*');
window.postMessage({ type: 'usmap-list' }, '*');
```

Replies are marked `source: 'usmap'`. The `usmap-list` reply carries the active `chamber` and `sourceId`, and each race reports `margin` or `demOdds` — in its source's own units, never a converted number.

## Accessibility (WCAG 2.1 AA targets)

- Focusable states in alphabetical order; Enter/Space activates; visible focus ring (stroke — SVG paths don't render `outline`)
- Chamber and source pickers are native radio groups: arrow-key navigation and grouping semantics come free
- Per-state `aria-label` includes the active source's read, e.g. "Georgia, Kalshi gives Republican 56 percent implied odds"
- Race calls, cutovers, chamber and source changes announced via a polite `aria-live` region
- Color is never the only channel: counting has the hatch, called shows a ✓, staleness shows ⚠ plus text
- `prefers-reduced-motion`: hardening collapses to a fast crossfade; flash, pulse and the zoom camera cut instantly; the stage tilt flattens to 0, the lift keeps shadow + stroke with no displacement, and dock magnification is disabled
- Dev tooling: `eslint-plugin-jsx-a11y` (static) + `@axe-core/react` (logs violations to the console in dev)

**Known tradeoff:** while zoomed, the focused state moves into its own SVG group (so the blur is one filter rather than fifty), which changes its tab position. The race list remains the stable non-visual equivalent.

### Manual test script (run at checkpoints)

Keyboard-only (put the mouse down):

1. Tab from the page top — source radios, then into the map at Alabama (proceeding alphabetically), then the chamber dock, then the race list toggle. Focus must be clearly visible on every state, and focusing a state lifts it exactly as hover does.
2. Arrow keys move within each radio group and change the map without a reload. The dock magnification must NOT fire on keyboard focus — it is mouse-only.
3. Press Enter or Space on a state — selection outline appears and `usmap-select` is emitted. In House, it zooms; Escape returns.
4. "Show all N races" → Tab into the list → Arrow Up/Down moves between races, Enter selects.
5. Trigger a cutover from the toolbar — the banner must not steal focus.

VoiceOver (macOS, Cmd+F5):

1. VO+Right through the map — each state reads name + the active source's read, e.g. "Georgia, polling tossup, button".
2. Switch source to Kalshi — the change is announced, and the same state now reads in implied odds.
3. Select Senate and land on California — it must read "no Senate race in 2026", not silence.
4. Press "Call random race" — VoiceOver announces "Race called: [State] called for [Party]" without moving focus.

### Verification harness

`node scripts/verify-browser.mjs` (dev server must be running; uses system Chrome) drives chamber and source switching, the House zoom camera, the stale-feed disclosure, cutover, the message API and keyboard selection, captures axe console output, and writes screenshots to `/tmp/usmap-*.png`.
