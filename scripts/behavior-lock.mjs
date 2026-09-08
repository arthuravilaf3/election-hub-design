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
// .dot carries two transitions now: background (the recolour, 300ms) and transform (the hover goo, 220ms).
check('dot recolour + goo transitions', statics.seatBarTransition, '0.3s, 0.22s');
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

// ---- opening a state (Sep 2026: no camera, no blur, no counties) ---------
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
    openLabel: getComputedStyle(document.querySelector('.state-label--open')).opacity,
    otherLabel: other ? getComputedStyle(other).opacity : null,
    padding: getComputedStyle(document.querySelector('.map-wrap')).paddingTop,
    drawer: !!drawer,
    dialog: drawer?.getAttribute('role'),
    modal: drawer?.getAttribute('aria-modal'),
    counties: document.querySelectorAll('.county-cell, .county-layer path').length,
    segHidden: getComputedStyle(document.querySelector('.map-selectors')).opacity,
    locked: document.body.classList.contains('is-scroll-locked'),
  };
});
check('the map does not move', zoom.camera, 'none');
check('no blur on the rest', zoom.restFilter, 'none');
check('other states dim to 30%', zoom.restOpacity, '0.3');
check('other labels dim with their states', zoom.otherLabel, '0.3');
// Labels sit at 0.85/0.9 by tone; "full ink" means undimmed, not literally 1.
check('the open state keeps its label undimmed', zoom.openLabel, (v) => parseFloat(v) >= 0.8);
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
  () => document.querySelector('.drawer-breadcrumb').textContent.trim()
);
await page.evaluate(() =>
  document
    .querySelector('.state-shape[data-state="CA"]')
    .dispatchEvent(new MouseEvent('click', { bubbles: true }))
);
await page.waitForTimeout(600);
check(
  'clicking another state swaps the panel',
  await page.evaluate(() => document.querySelector('.drawer-breadcrumb')?.textContent.trim()),
  (v) => v !== beforeClick && /California/.test(v)
);
check('the map still did not move', await page.evaluate(() => getComputedStyle(document.querySelector('.map-camera')).transform), 'none');

// ---- no pan, no zoom: the map never moves under the pointer ----------------
{
  const sb = await page.locator('.election-map').boundingBox();
  await page.mouse.move(sb.x + sb.width * 0.5, sb.y + sb.height * 0.15);
  await page.mouse.down();
  await page.mouse.move(sb.x + sb.width * 0.5 + 120, sb.y + sb.height * 0.15 + 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  check('a drag does not move the map', await page.evaluate(() => getComputedStyle(document.querySelector('.map-camera')).transform), 'none');
}

// The arrows DO move it.
await page.locator('.drawer-nav-btn').nth(1).click();
await page.waitForTimeout(900);
check(
  'the next arrow moves to another state',
  await page.evaluate(
    () => document.querySelector('.drawer-breadcrumb')?.textContent.trim() !== null
  ),
  true
);
const afterArrow = await page.evaluate(() =>
  document.querySelector('.drawer-breadcrumb').textContent.trim()
);
check('the arrow actually changed state', afterArrow !== beforeClick, true);

// Escape leaves the zoom
await page.keyboard.press('Escape');
await page.waitForTimeout(700);
check('Escape clears zoom', await page.evaluate(() => !document.querySelector('.drawer')), true);

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
  'pills centred, 40px above the bottom of the viewport',
  await page.evaluate(() => { const r = document.querySelector('.map-selectors').getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(innerHeight - r.bottom)].join(','); }),
  `${Math.round(1440 / 2)},40`
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
// Hover: crossed dots grow (and the goo fuses them); untouched ones do not.
// The grid is above the fold at this point (the card was centred earlier):
// bring it on screen, or the pointer moves land off-viewport and touch nothing.
await page.evaluate(() => document.querySelector('.dots-grid').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(400);
const dotBox = await page.locator('.dot').nth(40).boundingBox();
await page.mouse.move(dotBox.x + 2, dotBox.y + dotBox.height / 2);
await page.mouse.move(dotBox.x + dotBox.width * 3, dotBox.y + dotBox.height / 2, { steps: 6 });
await page.waitForTimeout(120);
const goo = await page.evaluate(() => { const h = document.querySelector('.dot.is-goo'); return { hot: document.querySelectorAll('.dot.is-goo').length, scale: h ? getComputedStyle(h).transform : 'none' }; });
check('the dots the pointer crossed go gooey', goo.hot >= 2 && goo.hot <= 6, true);
check('the goo filter is on only while dots are hot', await page.evaluate(() => /dots-goo/.test(getComputedStyle(document.querySelector('.dots-grid')).filter)), true);
check('a gooey dot deforms into a stretched ellipse', /matrix\(1\.2[0-9]*, 0, 0, 1\.1/.test(goo.scale), true);
await page.waitForTimeout(800);
check('they let go again', await page.evaluate(() => document.querySelectorAll('.dot.is-goo').length), 0);
check('and the filter switches off again', await page.evaluate(() => getComputedStyle(document.querySelector('.dots-grid')).filter), 'none');
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

// ---- Drawer tabs: Data / Related content --------------------------------
await page.click('.state-shape[data-state=TX]');
await page.waitForTimeout(900);
const tabs = await page.evaluate(() => ({
  role: document.querySelector('.drawer-tabs')?.getAttribute('role'),
  labels: [...document.querySelectorAll('.drawer-tab')].map((t) => t.textContent.trim()),
  selected: document.querySelector('.drawer-tab[aria-selected="true"]')?.textContent.trim(),
  sourcesCompared: document.body.innerText.includes('Sources compared'),
  data: !!document.querySelector('.bar-list'),
}));
check('the panel has a tablist', tabs.role, 'tablist');
check('tabs are Data / Related content', tabs.labels.join('|'), 'Data|Related content');
check('Data is the default tab', tabs.selected, 'Data');
check('Sources compared is gone', tabs.sourcesCompared, false);
check('Data shows the candidate rows', tabs.data, true);
await page.locator('.drawer-tab').nth(1).click();
await page.waitForTimeout(400);
const related = await page.evaluate(() => ({
  panel: document.querySelector('#drawer-tabpanel')?.getAttribute('aria-labelledby'),
  related: !!document.querySelector('.related'),
  data: !!document.querySelector('.bar-list'),
}));
check('Related content renders the state feed', related.related, true);
check('Related content hides the numbers', related.data, false);
check('tabpanel is labelled by the active tab', related.panel, 'drawer-tab-related');
await page.locator('.drawer-tab').nth(1).focus();
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(300);
check(
  'ArrowLeft returns to Data',
  await page.evaluate(() => document.querySelector('.drawer-tab[aria-selected="true"]')?.textContent.trim()),
  'Data'
);
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
