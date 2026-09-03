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
    statementAnim: cs('.race-statement', 'animationDuration'),
    seatBarTransition: cs('.seat-bar-dem', 'transitionDuration'),
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
check('map-wrap transition', statics.mapWrapTransition, '0.55s');
check('camera transform-origin', statics.cameraOrigin, '0px 0px');
check('map-card overflow', statics.cardOverflow, 'clip');
check('state fill transition', statics.stateTransition, '0.35s');
check('statement crossfade', statics.statementAnim, '0.2s');
check('seat bar width transition', statics.seatBarTransition, '0.3s');
check('no SVG ancestor transform', statics.svgAncestorTransforms.length, 0);

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

// ---- zoom ---------------------------------------------------------------
await page.click('.state-shape[data-state=TX]');
await page.waitForTimeout(900);
const zoom = await page.evaluate(() => {
  const frame = document.querySelector('.map-and-panel');
  const drawer = document.querySelector('.drawer');
  return {
    camera: getComputedStyle(document.querySelector('.map-camera')).transform,
    restFilter: getComputedStyle(document.querySelector('.map-rest')).filter,
    restOpacity: getComputedStyle(document.querySelector('.map-rest')).opacity,
    drawer: !!drawer,
    dialog: drawer?.getAttribute('role'),
    modal: drawer?.getAttribute('aria-modal'),
    // the camera measures this fraction; it must match the painted layout
    regionW: drawer ? +(drawer.offsetLeft / frame.clientWidth).toFixed(3) : null,
    counties: document.querySelectorAll('.county-cell, .county-layer path').length > 0,
    segHidden: getComputedStyle(document.querySelector('.map-selectors')).opacity,
    locked: document.body.classList.contains('is-scroll-locked'),
  };
});
check('camera transformed', zoom.camera !== 'none', true);
check('rest layer blurred', /blur\(2\.5px\)/.test(zoom.restFilter), true);
check('rest layer dimmed', zoom.restOpacity, '0.35');
check('drawer is a modal dialog', `${zoom.dialog}/${zoom.modal}`, 'dialog/true');
check('counties rendered', zoom.counties, true);
check('source control hidden while zoomed', zoom.segHidden, '0');
check('measured region matches comp', zoom.regionW, (v) => v > 0.55 && v < 0.63);

// Escape leaves the zoom
await page.keyboard.press('Escape');
await page.waitForTimeout(700);
check('Escape clears zoom', await page.evaluate(() => !document.querySelector('.drawer')), true);

// wheel outside the drawer leaves the zoom
await page.click('.state-shape[data-state=TX]');
await page.waitForTimeout(800);
await page.mouse.move(300, 500);
await page.mouse.wheel(0, 120);
await page.waitForTimeout(700);
check('wheel outside drawer clears zoom', await page.evaluate(() => !document.querySelector('.drawer')), true);

// ---- Map selectors: a listbox with a select's keyboard contract ---------
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

// ---- Sources compared: the three cards share one set of columns ---------
await page.click('.state-shape[data-state=TX]');
await page.waitForTimeout(900);
const cols = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.source-card')];
  if (cards.length < 3) return null;
  const col = (i) => cards.map((c) => Math.round(c.children[i].getBoundingClientRect().left));
  const same = (a) => a.every((v) => v === a[0]);
  return {
    aligned: same(col(0)) && same(col(1)) && same(col(2)),
    overflow: cards.some((c) => c.scrollWidth > c.clientWidth),
  };
});
check('source cards share columns', cols?.aligned, true);
check('source cards do not overflow', cols?.overflow, false);
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
