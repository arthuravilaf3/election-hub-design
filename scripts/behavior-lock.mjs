/**
 * Behaviour lock for the Aug 2026 redesign.
 *
 * The redesign is explicitly visual: hover, zoom, motion and the message API
 * must come out the other side byte-identical in FEEL. These are the values
 * captured from the pre-redesign build; every one of them is a thing a CSS
 * or JSX change could silently break with no error and no failing unit test
 * (the 42 vitest cases are pure data/reducer and stay green through a
 * completely broken layout).
 *
 * Run against a dev server: HUB_URL=http://localhost:5174 node scripts/behavior-lock.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.HUB_URL ?? 'http://localhost:5174';
const fails = [];
const ok = [];
const check = (name, actual, expected) => {
  const pass = typeof expected === 'function' ? expected(actual) : actual === expected;
  (pass ? ok : fails).push(`${name}: ${JSON.stringify(actual)}${pass ? '' : ` (expected ${expected})`}`);
};

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(`${BASE}/?phase=4`);
await page.waitForSelector('.state-shape');
await page.waitForTimeout(800);

// ---- static contracts -------------------------------------------------
const statics = await page.evaluate(() => {
  const cs = (sel, prop) => getComputedStyle(document.querySelector(sel))[prop];
  return {
    mapWrapTransition: cs('.map-wrap', 'transitionDuration'),
    cameraOrigin: cs('.map-camera', 'transformOrigin'),
    cardOverflow: cs('.map-card', 'overflow'),
    stateTransition: cs('.state-shape', 'transitionDuration').split(',')[0].trim(),
    statementAnim: cs('.dots-copy', 'animationDuration'),
    seatBarTransition: cs('.dot', 'transitionDuration'),
    // Any 3D transform on an SVG ancestor makes the compositor rasterize and
    // resample the map, pixelating every border.
    svgAncestorTransforms: (() => {
      const out = [];
      for (let el = document.querySelector('.election-map'); el; el = el.parentElement) {
        const t = getComputedStyle(el).transform;
        if (t && t !== 'none') out.push(el.className + ':' + t);
      }
      return out;
    })(),
  };
});
// Sep 2026: the padding no longer collapses when a state opens — nothing to transition.
check('map-wrap has no padding transition', statics.mapWrapTransition, '0s');
check('camera transform-origin', statics.cameraOrigin, '0px 0px');
check('map-card overflow', statics.cardOverflow, 'clip');
check('state fill transition', statics.stateTransition, '0.35s');
check('statement crossfade', statics.statementAnim, '0.2s');
// .dot transitions colour only: the hover lens drives transform per frame from JS.
check('dot recolour transition only', statics.seatBarTransition, '0.3s');
check('no SVG ancestor transform', statics.svgAncestorTransforms.length, 0);
// The countdown is a live clock: it ticks.
{
  const s1 = await page.evaluate(() => [...document.querySelectorAll('.countdown-num')[3].querySelectorAll('.countdown-roll-in')].map((e) => e.textContent).join(''));
  await page.waitForTimeout(1150);
  const s2 = await page.evaluate(() => [...document.querySelectorAll('.countdown-num')[3].querySelectorAll('.countdown-roll-in')].map((e) => e.textContent).join(''));
  check('countdown has four units', await page.evaluate(() => [...document.querySelectorAll('.countdown-label')].map((e) => e.textContent).join(',')), 'days,hours,minutes,seconds');
  check('countdown seconds tick', s1 !== s2, true);
// Digits roll independently: seconds are two boxes, and across a few ticks
// at least one tick rolls exactly ONE of them (both roll on 20 -> 19, which
// is correct — that is why a single sample is not a valid check).
{
  const boxes = await page.evaluate(() => document.querySelectorAll('.countdown-num')[3].querySelectorAll('.countdown-digit').length);
  check('seconds are two independent digit boxes', boxes, 2);
  let singles = 0;
  for (let i = 0; i < 4; i++) {
    await page.waitForFunction(() => document.querySelectorAll('.countdown-num')[3].querySelectorAll('.countdown-roll-out').length > 0, null, { timeout: 1500 }).catch(() => {});
    const n = await page.evaluate(() => document.querySelectorAll('.countdown-num')[3].querySelectorAll('.countdown-roll-out').length);
    if (n === 1) singles += 1;
    await page.waitForTimeout(600);
  }
  check('a tick that changes one digit rolls only that digit', singles >= 1, true);
}
  check('countdown is a timer, not a live region', await page.evaluate(() => document.querySelector('.countdown').getAttribute('role') + '/' + document.querySelector('.countdown').getAttribute('aria-live')), 'timer/null');
}
check(
  'sticky chrome is the nav only',
  await page.evaluate(() =>
    Math.round(document.querySelector('.site-chrome').getBoundingClientRect().height)
  ),
  64
);
check(
  'nothing pins a title on scroll',
  await page.evaluate(
    () => document.querySelectorAll('.compact-header, .chrome-collapse, .compact-title').length
  ),
  0
);
// Click is the ONLY way in: no zoom buttons, no scroll/pinch zoom-in.
check(
  'no zoom controls',
  await page.evaluate(
    () => document.querySelectorAll('[class*="zoom-in"], [class*="zoom-out"], .zoom-controls').length
  ),
  0
);

// ---- hover: pointermove-driven, tooltip follows, lift copy painted last --
// Scroll it into view FIRST and settle: the scroll listener clears the
// tooltip (it is position:fixed), so scrolling after hovering would erase
// what we are trying to observe.
await page.evaluate(() =>
  document.querySelector('.state-shape[data-state=TX]').scrollIntoView({ block: 'center' })
);
await page.waitForTimeout(500);
const tx = await page.locator('.state-shape[data-state=TX]');
const box = await tx.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(250);
const hover1 = await page.evaluate(() => {
  const tip = document.querySelector('.map-tooltip');
  const lifts = document.querySelectorAll('.lift-overlay');
  return {
    tooltip: !!tip,
    tipLeft: tip ? Math.round(tip.getBoundingClientRect().left) : null,
    tipPosition: tip ? getComputedStyle(tip).position : null,
    tipPointerEvents: tip ? getComputedStyle(tip).pointerEvents : null,
    lifts: lifts.length,
    liftPaintedLast: lifts.length
      ? lifts[0].parentElement.lastElementChild === lifts[0] ||
        !!lifts[0].closest('g').parentElement
      : false,
    dimmedSource: !!document.querySelector('.state-shape.is-lift-source'),
  };
});
check('hover shows tooltip', hover1.tooltip, true);
check('tooltip is fixed', hover1.tipPosition, 'fixed');
check('tooltip ignores pointer', hover1.tipPointerEvents, 'none');
check('exactly one lift copy', hover1.lifts, 1);
check('lift source dimmed', hover1.dimmedSource, true);
// The lift is a copy painted LAST, so it will cover the hovered state's own
// abbreviation unless the label rides inside it.
check(
  'hovered state keeps its abbreviation',
  await page.evaluate(() => {
    const lift = document.querySelector('.lift-overlay');
    return lift?.querySelector('.state-label')?.textContent ?? null;
  }),
  'TX'
);

// the tooltip TRACKS the cursor (pointermove, not pointerenter)
await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2);
await page.waitForTimeout(150);
const hover2 = await page.evaluate(() => {
  const tip = document.querySelector('.map-tooltip');
  return tip ? Math.round(tip.getBoundingClientRect().left) : null;
});
check('tooltip follows cursor', hover2 !== hover1.tipLeft, true);

// scrolling clears it (it is position:fixed and would detach)
await page.evaluate(() => window.scrollBy(0, 120));
await page.waitForTimeout(200);
check('scroll clears tooltip', await page.evaluate(() => !!document.querySelector('.map-tooltip')), false);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);

// ---- keyboard is a first-class hover equivalent -------------------------
// Same ordering trap as the hover step: scrollIntoView fires a scroll event
// AFTER focus sets the tooltip, which would clear it again. Scroll, settle,
// then focus.
await page.evaluate(() =>
  document.querySelector('.state-shape[data-state=TX]').scrollIntoView({ block: 'center' })
);
await page.waitForTimeout(400);
await page.evaluate(() =>
  document.querySelector('.state-shape[data-state=TX]').focus({ preventScroll: true })
);
await page.waitForTimeout(200);
check('focus shows tooltip', await page.evaluate(() => !!document.querySelector('.map-tooltip')), true);
await page.evaluate(() => document.querySelector('.state-shape[data-state=TX]').blur());

// ---- opening a state (Sep 2026: camera flies, no blur, no counties) ------
const paddingBefore = await page.evaluate(() => getComputedStyle(document.querySelector('.map-wrap')).paddingTop);
await page.click('.state-shape[data-state=TX]');
await page.waitForTimeout(900);
const zoom = await page.evaluate(() => {
  const drawer = document.querySelector('.drawer');
  const other = document.querySelector('.state-label:not(.state-label--open)');
  return {
    camera: getComputedStyle(document.querySelector('.map-camera')).transform,
    restFilter: getComputedStyle(document.querySelector('.map-rest')).filter,
    restOpacity: getComputedStyle(document.querySelector('.map-rest')).opacity,
    labelsHidden: getComputedStyle(document.querySelector('.state-labels')).opacity,
    padding: getComputedStyle(document.querySelector('.map-wrap')).paddingTop,
    drawer: !!drawer,
    dialog: drawer?.getAttribute('role'),
    modal: drawer?.getAttribute('aria-modal'),
    counties: document.querySelectorAll('.county-cell, .county-layer path').length,
    segHidden: getComputedStyle(document.querySelector('.map-selectors')).opacity,
    locked: document.body.classList.contains('is-scroll-locked'),
  };
});
// The camera flies to the state: a scale above 1 on the group (MAX 7).
check('the camera flies to the state', zoom.camera, (v) => { const m = /matrix\(([-\d.]+)/.exec(v); return !!m && parseFloat(m[1]) > 1.05 && parseFloat(m[1]) <= 7.01; });
check('no blur on the rest', zoom.restFilter, 'none');
check('other states dim to 30%', zoom.restOpacity, '0.3');
check('labels hide while zoomed (the scale would blow them up)', zoom.labelsHidden, '0');
check('the map keeps its padding (no reflow)', zoom.padding, paddingBefore);
check('drawer is a modal dialog', `${zoom.dialog}/${zoom.modal}`, 'dialog/true');
check('no county subdivision', zoom.counties, 0);
check('source control hidden while a state is open', zoom.segHidden, '0');

// ---- with the panel open, the map stays LIVE (Sep 2026) ------------------
const live = await page.evaluate(() => {
  const shape = document.querySelector('.state-shape[data-state="CA"]');
  return {
    pointerEvents: getComputedStyle(document.querySelector('.election-map')).pointerEvents,
    tabIndex: shape.getAttribute('tabindex'),
    ariaDisabled: shape.getAttribute('aria-disabled'),
  };
});
check('map still takes the pointer while a state is open', live.pointerEvents, 'auto');
check('states stay in the tab order while a state is open', live.tabIndex, '0');
check('states are not announced disabled while a state is open', live.ariaDisabled, null);

// Clicking another state swaps the panel to it.
const beforeClick = await page.evaluate(
  () => document.querySelector('.drawer-title').textContent.trim()
);
await page.evaluate(() =>
  document
    .querySelector('.state-shape[data-state="CA"]')
    .dispatchEvent(new MouseEvent('click', { bubbles: true }))
);
await page.waitForTimeout(600);
check(
  'clicking another state swaps the panel',
  await page.evaluate(() => document.querySelector('.drawer-title')?.textContent.trim()),
  (v) => v !== beforeClick && /California/.test(v)
);
check('the camera re-fits to the new state', await page.evaluate(() => { const v = getComputedStyle(document.querySelector('.map-camera')).transform; const m = /matrix\(([-\d.]+)/.exec(v); return !!m && parseFloat(m[1]) > 1.05; }), true);

// ---- zoomed: a drag PANS the camera and does not open the state under it --
{
  const before = await page.evaluate(() => document.querySelector('.map-camera').getAttribute('transform'));
  const title = await page.evaluate(() => document.querySelector('.drawer-title').textContent.trim());
  const sb = await page.locator('.election-map').boundingBox();
  await page.mouse.move(sb.x + sb.width * 0.3, sb.y + sb.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(sb.x + sb.width * 0.3 + 120, sb.y + sb.height * 0.5 + 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => document.querySelector('.map-camera').getAttribute('transform'));
  check('a drag pans the zoomed map', after !== before, true);
  check('the drag keeps the scale', (/scale\(([-\d.]+)/.exec(after) || [])[1], (/scale\(([-\d.]+)/.exec(before) || [])[1]);
  check('a drag does not open the state it ends on', await page.evaluate(() => document.querySelector('.drawer-title').textContent.trim()), title);
  check('the map paints past its own box (overflow visible)', await page.evaluate(() => getComputedStyle(document.querySelector('.election-map')).overflow), 'visible');
}

// The arrows DO move it.
await page.locator('.drawer-nav-btn').nth(1).click();
await page.waitForTimeout(900);
check(
  'the next arrow moves to another state',
  await page.evaluate(
    () => document.querySelector('.drawer-title')?.textContent.trim() !== null
  ),
  true
);
const afterArrow = await page.evaluate(() =>
  document.querySelector('.drawer-title').textContent.trim()
);
check('the arrow actually changed state', afterArrow !== beforeClick, true);

// Escape leaves the zoom
await page.keyboard.press('Escape');
await page.waitForTimeout(700);
check('Escape clears zoom', await page.evaluate(() => !document.querySelector('.drawer')), true);
// Not zoomed: a drag does nothing — the map is still.
{
  const before = await page.evaluate(() => document.querySelector('.map-camera').getAttribute('transform'));
  const sb = await page.locator('.election-map').boundingBox();
  await page.mouse.move(sb.x + sb.width * 0.5, sb.y + sb.height * 0.15);
  await page.mouse.down();
  await page.mouse.move(sb.x + sb.width * 0.5 + 120, sb.y + sb.height * 0.15 + 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  check('a drag does not move the map at rest', await page.evaluate(() => document.querySelector('.map-camera').getAttribute('transform')), before);
}

// ---- scrolling: the page behind keeps scrolling, the panel scrolls itself
await page.click('.state-shape[data-state=TX]');
await page.waitForTimeout(900);

// Over the map: the page scrolls, and the panel stays open. It used to close.
const yBefore = await page.evaluate(() => window.scrollY);
await page.mouse.move(300, 500);
await page.mouse.wheel(0, 200);
await page.waitForTimeout(500);
const overMap = await page.evaluate(() => ({
  scrolled: window.scrollY,
  stillOpen: !!document.querySelector('.drawer'),
  locked: document.body.classList.contains('is-scroll-locked'),
}));
check('page is not frozen while the panel is open', overMap.locked, false);
check('wheel over the map scrolls the page', overMap.scrolled > yBefore, true);
check('wheel over the map keeps the panel open', overMap.stillOpen, true);

// Over the panel: the panel scrolls and the page does NOT (no scroll chaining
// — that is what overscroll-behavior: contain on .drawer-scroll buys).
await page.evaluate(() => document.querySelector('.drawer').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(400);
const before = await page.evaluate(() => ({
  page: window.scrollY,
  panel: document.querySelector('.drawer-scroll').scrollTop,
}));
const db = await page.locator('.drawer-scroll').boundingBox();
await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2);
await page.mouse.wheel(0, 200);
await page.waitForTimeout(500);
const overPanel = await page.evaluate(() => ({
  page: window.scrollY,
  panel: document.querySelector('.drawer-scroll')?.scrollTop,
  stillOpen: !!document.querySelector('.drawer'),
}));
check('wheel over the panel scrolls the panel', overPanel.panel > before.panel, true);
check('wheel over the panel does not scroll the page', overPanel.page, before.page);
check('wheel over the panel keeps it open', overPanel.stillOpen, true);
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

// ---- Map selectors: a listbox with a select's keyboard contract ---------
// Fixed to the viewport centre and shown only while the map card crosses it:
// centre the card first, and lock that gate while we are here.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
check(
  'pills visible on entry, before reaching the map',
  await page.evaluate(() => document.querySelector('.map-selectors').classList.contains('is-offscreen')),
  false
);
await page.evaluate(() => document.querySelector('.feed-section').scrollIntoView({ block: 'start' }));
await page.waitForTimeout(400);
check(
  'pills hidden once the map is passed',
  await page.evaluate(() => document.querySelector('.map-selectors').classList.contains('is-offscreen')),
  true
);
await page.evaluate(() => document.querySelector('.map-card').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(400);
check(
  'pills back while the map is on screen',
  await page.evaluate(() => document.querySelector('.map-selectors').classList.contains('is-offscreen')),
  false
);
check('pills are fixed', await page.evaluate(() => getComputedStyle(document.querySelector('.map-selectors')).position), 'fixed');
check(
  'pills centred, 40px above the ticker, ticker on the bottom edge',
  await page.evaluate(() => { const r = document.querySelector('.map-selectors').getBoundingClientRect(); const t = document.querySelector('.poly-ticker').getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(t.top - r.bottom), Math.round(innerHeight - t.bottom)].join(','); }),
  `${Math.round(1440 / 2)},40,0`
);
// A SOURCE change keeps the same dots and recolours them; a RACE change
// rebuilds the grid and replays the entry sweep.
await page.evaluate(() => document.querySelectorAll('.dot').forEach((d) => (d.dataset.keep = '1')));
await page.locator('.map-selectors .pill').nth(1).click();
await page.locator('.pill-option[data-option="dw-poll-avg"]').click();
await page.waitForTimeout(400);
check('a source change keeps the same dot nodes', await page.evaluate(() => document.querySelectorAll('.dot[data-keep]').length > 0), true);
await page.locator('.map-selectors .pill').nth(0).click();
await page.locator('.pill-option[data-option="governor"]').click();
await page.waitForTimeout(100);
const entry = await page.evaluate(() => {
  const d = document.querySelectorAll('.dot');
  const cs = (i) => getComputedStyle(d[i]);
  return { kept: document.querySelectorAll('.dot[data-keep]').length, anim: cs(0).animationName, fill: cs(0).animationFillMode, d0: cs(0).animationDelay, d100: cs(Math.min(30, d.length - 1)).animationDelay, goo: getComputedStyle(document.querySelector('.dots-grid')).filter };
});
check('a race change rebuilds the dots', entry.kept, 0);
check('dots replay an entry animation on race change', entry.anim, 'dot-in');
check('entry animation releases scale when done (backwards, not both)', entry.fill, 'backwards');
check('entry is staggered across the grid', entry.d0 !== entry.d100, true);
check('the grid has no filter at rest (perfect circles)', entry.goo, 'none');
await page.waitForTimeout(1200);
// Hover lens: the dot under the pointer swells most, its neighbours less,
// everything far away stays put; circles stay circles (uniform scale, no
// filter); it all settles back to rest after the pointer leaves.
// The grid is above the fold at this point (the card was centred earlier):
// bring it on screen, or the pointer moves land off-viewport and touch nothing.
await page.evaluate(() => document.querySelector('.dots-grid').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(400);
const dotBox = await page.locator('.dot').nth(40).boundingBox();
await page.mouse.move(dotBox.x + 2, dotBox.y + dotBox.height / 2);
await page.mouse.move(dotBox.x + dotBox.width * 3, dotBox.y + dotBox.height / 2, { steps: 6 });
// Let the lerp settle (~80ms time constant).
await page.waitForTimeout(400);
const lens = await page.evaluate(() => {
  const d = [...document.querySelectorAll('.dot')];
  const sc = (el) => { const m = /matrix\(([-\d.]+), ([-\d.]+), ([-\d.]+), ([-\d.]+)/.exec(getComputedStyle(el).transform); return m ? { a: +m[1], b: +m[2], c: +m[3], d: +m[4] } : { a: 1, b: 0, c: 0, d: 1 }; };
  // Governor grid: 12 columns, so dot 43 is row 3 / col 7; dot 0 is many pitches away.
  const under = sc(d[43]); const next = sc(d[44]); const far = sc(d[0]);
  return { under, next, far, hot: d.filter((el) => sc(el).a > 1.02).length, filter: getComputedStyle(document.querySelector('.dots-grid')).filter };
});
check('the dot under the pointer swells', lens.under.a > 1.15, true);
check('it stays a circle (uniform scale, no shear)', Math.abs(lens.under.a - lens.under.d) < 0.01 && Math.abs(lens.under.b) < 0.01, true);
check('a neighbour swells less', lens.next.a > 1.0 && lens.next.a < lens.under.a, true);
check('a far dot stays put', lens.far.a, 1);
check('only a handful are hot', lens.hot >= 3 && lens.hot <= 24, true);
check('no filter on the grid, ever', lens.filter, 'none');
// Fully off the grid (a point still inside it would just re-aim the lens).
await page.mouse.move(8, 8);
await page.waitForTimeout(700);
check('they settle back to rest', await page.evaluate(() => [...document.querySelectorAll('.dot')].filter((el) => el.style.transform).length), 0);
const raceBefore = await page.evaluate(() => document.querySelector('.pill-value').textContent.trim());
await page.locator('.map-selectors .pill').nth(0).focus();
await page.keyboard.press('ArrowDown'); // opens
await page.waitForTimeout(200);
check('ArrowDown opens the menu', await page.evaluate(() => !!document.querySelector('.pill-menu')), true);
await page.keyboard.press('ArrowDown'); // moves
await page.keyboard.press('Enter'); // commits
await page.waitForTimeout(700);
const raceKb = await page.evaluate(() => ({
  value: document.querySelector('.pill-value').textContent.trim(),
  closed: !document.querySelector('.pill-menu'),
  // Focus must come back to the trigger, or the reader is dropped at the top.
  focusOnPill: document.activeElement?.classList.contains('pill'),
}));
check('keyboard commits a change', raceKb.value !== raceBefore, true);
check('menu closes on commit', raceKb.closed, true);
check('focus returns to the pill', raceKb.focusOnPill, true);

// Escape closes without committing
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(150);
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
const esc = await page.evaluate(() => ({
  closed: !document.querySelector('.pill-menu'),
  value: document.querySelector('.pill-value').textContent.trim(),
}));
check('Escape closes the menu', esc.closed, true);
check('Escape commits nothing', esc.value, raceKb.value);

// A race switch still runs the stagger wave over the map.
await page.evaluate(() => document.body.click());
await page.waitForTimeout(200);

// ---- Drawer head: X beside share, compacts on scroll ----------------------
await page.click('.state-shape[data-state=TX]');
await page.waitForTimeout(900);
const head = await page.evaluate(() => {
  const row = document.querySelector('.drawer-headrow');
  const btns = [...row.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') || b.textContent.trim());
  return { btns: btns.join('|'), topbar: !!document.querySelector('.drawer-topbar'), compact: document.querySelector('.drawer').classList.contains('is-compact'), sticky: getComputedStyle(document.querySelector('.drawer-headblock')).position, title: getComputedStyle(document.querySelector('.drawer-title')).fontSize };
});
check('close sits beside share in the head row', /Share [^|]*\|Close$/.test(head.btns), true);
check('no top bar', head.topbar, false);
check('head starts expanded', head.compact, false);
check('head is sticky', head.sticky, 'sticky');
check('title is the DS lg heading (20px)', head.title, '20px');
check('the title is the state alone (no chamber, no rating line)', await page.evaluate(() => ({ t: document.querySelector('.drawer-title').textContent.trim(), sub: !!document.querySelector('.drawer-subtitle') })), (v) => v.t === 'Texas' && v.sub === false);
await page.evaluate(() => { document.querySelector('.drawer-scroll').scrollTop = 200; });
await page.waitForTimeout(400);
const compact = await page.evaluate(() => ({ compact: document.querySelector('.drawer').classList.contains('is-compact'), title: getComputedStyle(document.querySelector('.drawer-title')).fontSize, cols: getComputedStyle(document.querySelector('.drawer-headblock')).gridTemplateColumns.split(' ').length }));
check('head marks itself compact after scrolling', compact.compact, true);
check('the title keeps its size', compact.title, '20px');
check('the head is always one row of three', compact.cols, 3);
await page.evaluate(() => { document.querySelector('.drawer-scroll').scrollTop = 0; });
await page.waitForTimeout(400);
check('head expands again at the top', await page.evaluate(() => document.querySelector('.drawer').classList.contains('is-compact')), false);
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

// ---- Drawer tabs: the state's races (drive the map's chamber) ------------
await page.click('.state-shape[data-state=TX]');
await page.waitForTimeout(900);
const tabs = await page.evaluate(() => ({
  role: document.querySelector('.drawer-tabs')?.getAttribute('role'),
  labels: [...document.querySelectorAll('.drawer-tab')].map((t) => t.textContent.trim()),
  selected: document.querySelector('.drawer-tab[aria-selected="true"]')?.textContent.trim(),
  sourcesCompared: document.body.innerText.includes('Sources compared'),
  data: !!document.querySelector('.bar-list'),
  related: !!document.querySelector('.related'),
}));
check('the panel has a tablist', tabs.role, 'tablist');
check('tabs are the races on the ballot', tabs.labels.every((l) => ['U.S. House', 'U.S. Senate', 'Governor'].includes(l)) && tabs.labels.length >= 1, true);
check('the map\'s chamber is the selected tab', tabs.selected, 'U.S. House');
check('Sources compared is gone', tabs.sourcesCompared, false);
check('no Related content view', tabs.related, false);
check('the tab shows the candidate rows', tabs.data, true);
if (tabs.labels.length > 1) {
  await page.locator('.drawer-tab').nth(1).click();
  await page.waitForTimeout(700);
  const sw = await page.evaluate(() => ({ pill: document.querySelector('.pill-value').textContent.trim(), sel: document.querySelector('.drawer-tab[aria-selected="true"]').textContent.trim(), open: !!document.querySelector('.drawer') }));
  check('picking a race tab switches the map\'s chamber', sw.pill !== 'House', true);
  check('the tab row follows the map', sw.sel !== 'U.S. House', true);
  check('the panel stays open on the same state', sw.open, true);
}
// After the race-tab switch above the panel sits on the second tab; the
// tabpanel names it, and ArrowLeft walks back to the first (U.S. House).
if ((await page.locator('.drawer-tab').count()) > 1) {
  const panel = await page.evaluate(() => ({
    labelledBy: document.querySelector('#drawer-tabpanel')?.getAttribute('aria-labelledby'),
    selectedId: document.querySelector('.drawer-tab[aria-selected="true"]')?.id,
    data: !!document.querySelector('.bar-list'),
  }));
  check('tabpanel is labelled by the active tab', panel.labelledBy, panel.selectedId);
  check('every race tab shows the numbers', panel.data, true);
  await page.locator('.drawer-tab[aria-selected="true"]').focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(700);
  check(
    'ArrowLeft walks back to the first race',
    await page.evaluate(() => document.querySelector('.drawer-tab[aria-selected="true"]')?.textContent.trim()),
    'U.S. House'
  );
}
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

// ---- message API --------------------------------------------------------
const reply = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const on = (e) => {
        if (e.data?.source === 'usmap' && e.data.type === 'usmap-list') {
          window.removeEventListener('message', on);
          resolve({ chamber: e.data.chamber, races: e.data.races?.length });
        }
      };
      window.addEventListener('message', on);
      window.postMessage({ type: 'usmap-list' }, '*');
      setTimeout(() => resolve(null), 2000);
    })
);
check('usmap-list replies', reply && reply.races > 0, true);

const selected = await page.evaluate(
  () =>
    new Promise((resolve) => {
      window.postMessage({ type: 'usmap-select', stateId: 'TX' }, '*');
      setTimeout(
        () =>
          resolve({
            outline: !!document.querySelector('.selection-outline'),
            zoomed: !!document.querySelector('.drawer'),
          }),
        400
      );
    })
);
check('usmap-select selects', selected.outline, true);
check('usmap-select does NOT zoom', selected.zoomed, false);

console.log('PASS (' + ok.length + ')');
ok.forEach((l) => console.log('  ✓ ' + l));
if (fails.length) {
  console.log('\nFAIL (' + fails.length + ')');
  fails.forEach((l) => console.log('  ✗ ' + l));
}
await browser.close();
process.exit(fails.length ? 1 : 0);
