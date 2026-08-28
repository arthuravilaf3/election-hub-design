// Dev-time verification harness (not part of the deliverable): drives the
// redesigned prototype in system Chrome — scroll chrome, race tabs, sources,
// drawer with candidate bars, zoom camera, cutover, message API — captures
// axe console output and screenshots to /tmp.
import { chromium } from 'playwright';

// The harness exercises the FULL prototype: last phase, plus the trusted-
// source picker that has no phase yet (see src/data/phases.ts).
const BASE = process.env.HUB_URL ?? 'http://localhost:5174/?phase=4&trust=1';
const SHOT = (name) => `/tmp/usmap-${name}.png`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const consoleLines = [];
page.on('console', (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));

await page.goto(BASE);
await page.waitForSelector('.state-shape');
await page.waitForTimeout(2500); // let @axe-core/react run its first audit

// 1. Normal view (House + DDHQ by default)
await page.screenshot({ path: SHOT('1-normal') });
console.log(
  'defaults:',
  JSON.stringify(
    await page.evaluate(() => ({
      chamber: document.querySelector('.race-tabs--header .race-tab[aria-selected="true"]')?.dataset.chamber,
      source: document.querySelector('.seg.is-active .seg-brand')?.textContent.trim(),
      statement: document.querySelector('.race-title')?.textContent,
      byline: document.querySelector('.race-byline')?.textContent,
      stateLabels: document.querySelectorAll('.state-label').length,
      txLabel: [...document.querySelectorAll('.state-label')].find((t) => t.textContent === 'TX') ? 'TX' : 'MISSING',
      pageTitle: document.querySelector('h1')?.textContent,
      docTitle: document.title,
    }))
  )
);

// 2. Scroll: the promo bar scrolls away NORMALLY with the page (no hide/
// show effect); the compact title pins past the hero and lives EXACTLY as
// long as the map section is on screen; nav stays.
await page.evaluate(() => window.scrollTo(0, 430));
await page.waitForTimeout(600);
const down = await page.evaluate(() => ({
  promoScrolledAway: document.querySelector('.promo-bar').getBoundingClientRect().bottom < 64,
  mapSectionOnScreen:
    document.querySelector('.map-section').getBoundingClientRect().bottom > window.innerHeight,
  compactVisible: !document
    .querySelector('.chrome-collapse--tall')
    .className.includes('is-collapsed'),
  compactTitle: document.querySelector('.compact-title')?.textContent.slice(0, 24),
  // The pinned bar carries the race tabs too, so the reader can switch
  // without scrolling back up.
  compactTabs: document.querySelectorAll('.race-tabs--compact .race-tab').length,
  compactTabActive: document.querySelector('.race-tabs--compact .race-tab.is-active')?.textContent,
  // Solid page ground, the same fill the nav carries — the two read as one
  // piece of chrome, and the tabs sit under the title.
  compactMatchesNav:
    getComputedStyle(document.querySelector('.compact-header')).backgroundColor ===
    getComputedStyle(document.querySelector('.dw-nav-bar')).backgroundColor,
  compactTabsUnderTitle: (() => {
    const t = document.querySelector('.compact-title').getBoundingClientRect();
    const tabs = document.querySelector('.race-tabs--compact').getBoundingClientRect();
    return tabs.top >= t.bottom - 1;
  })(),
  navVisible: document.querySelector('.dw-nav-bar').getBoundingClientRect().top === 0,
}));
console.log('scroll down:', JSON.stringify(down), '(promo scrolled away; compact pinned over the map section)');
await page.evaluate(() => document.querySelector('.plan-banner').scrollIntoView());
await page.waitForTimeout(600);
const pastMap = await page.evaluate(() => ({
  compactGone: document
    .querySelector('.chrome-collapse--tall')
    .className.includes('is-collapsed'),
}));
console.log('past map   :', JSON.stringify(pastMap), '(compact leaves with the map section)');
await page.evaluate(() => window.scrollTo({ top: 0 }));
await page.waitForTimeout(600);
const up = await page.evaluate(() => ({
  promoBackInView: document.querySelector('.promo-bar').getBoundingClientRect().top >= 60,
}));
console.log('scroll top :', JSON.stringify(up), '(promo back, in flow)');
await page.evaluate(() => window.scrollTo({ top: 0 }));
await page.waitForTimeout(600);

// 3. The card owns every number: static title outside, statement + seat bar
// inside, each datum exactly once on the page.
console.log(
  'card owns the data:',
  JSON.stringify(
    await page.evaluate(() => {
      const card = document.querySelector('.map-card');
      const sec = document.querySelector('.map-section');
      // Redesign order: title first, then the tabs, then the bar.
      const order = [...sec.querySelectorAll('.race-title, .race-tabs--header, .seat-bar, .map-card')].map(
        (e) => e.className.split(' ')[0]
      );
      return {
        order,
        titleTag: document.querySelector('.race-title')?.tagName,
        h1Hidden: getComputedStyle(document.querySelector('h1')).position === 'absolute',
        seatBarLabels: [...document.querySelectorAll('.seat-bar-label')].map((e) =>
          e.textContent.trim()
        ),
        // The label row is decorative — the track's own aria-label is the
        // non-visual equivalent and still carries "N seats up".
        labelsHidden: document.querySelector('.seat-bar-labels')?.getAttribute('aria-hidden'),
        barAlt: document.querySelector('.seat-bar-track')?.getAttribute('aria-label'),
        barOutsideCard: !card.contains(document.querySelector('.seat-bar')),
        segInsideCard: card.contains(document.querySelector('.seg-control')),
        // The legend left the card in the redesign.
        legendOutsideCard: !card.contains(document.querySelector('.legend-strip')),
        staticTitleGone: !document.querySelector('.page-title, .page-dek'),
      };
    })
  )
);

// 4. Source picker: compact dropdown in the card header; selection persists
// across race switches; race switch updates the statement + staggers the map.
await page.locator('.seg[data-source="kalshi"]').click();
await page.waitForTimeout(400);
await page.screenshot({ path: SHOT('3-source-segments') });
console.log(
  'source switched to:',
  await page.locator('.seg.is-active .seg-brand').textContent().then((t) => t.trim())
);
// Race switch: statement + byline + bar crossfade together, stagger wave
// runs on the map, source survives.
await page.locator('.race-tabs--header .race-tab[data-chamber="senate"]').click();
await page.waitForTimeout(80);
const midSwitch = await page.evaluate(() => ({
  staggerDelay: [...document.querySelectorAll('.state-shape')].filter(
    (el) => parseFloat(el.style.transitionDelay) > 0
  ).length,
}));
await page.waitForTimeout(900);
const postSwitch = await page.evaluate(() => ({
  statement: document.querySelector('.race-title')?.textContent,
  byline: document.querySelector('.race-byline')?.textContent,
  seats: [...document.querySelectorAll('.seat-bar-label')].map((e) => e.textContent.trim()).join(' / '),
  source: document.querySelector('.seg.is-active .seg-brand')?.textContent.trim(),
  syncWindow: {
    statement: getComputedStyle(document.querySelector('.race-statement')).animationDuration,
    bar: getComputedStyle(document.querySelector('.seat-bar-dem')).transitionDuration,
    map: getComputedStyle(document.querySelector('.state-shape')).transitionDuration.split(',')[0],
  },
}));
console.log(
  'race switch: stagger paths',
  midSwitch.staggerDelay,
  '| statement now',
  JSON.stringify(postSwitch.statement),
  '| seats',
  postSwitch.seats,
  '| source persisted:',
  postSwitch.source,
  '| durations',
  JSON.stringify(postSwitch.syncWindow)
);
await page.locator('.race-tabs--header .race-tab[data-chamber="house"]').click();
await page.waitForTimeout(600);
await page.locator('.seg[data-source="dw-poll-avg"]').click();
await page.waitForTimeout(400);

// 5. Interaction layer: crisp map (no transformed ancestors), lift, race tabs
const flat = await page.evaluate(() => {
  let n = document.querySelector('.election-map').parentElement;
  const offenders = [];
  while (n && n !== document.body) {
    const s = getComputedStyle(n);
    if (s.transform !== 'none' || s.perspective !== 'none') offenders.push(n.className);
    n = n.parentElement;
  }
  return offenders;
});
console.log('SVG ancestor transforms (crisp = []):', JSON.stringify(flat));
await page.locator('[data-state="TX"]').hover();
await page.waitForTimeout(300);
const lift = await page.evaluate(() => ({
  present: !!document.querySelector('.lift-overlay'),
  paintedLast:
    document.querySelector('.lift-overlay') ===
    document.querySelector('.map-camera')?.lastElementChild,
}));
console.log('lift:', JSON.stringify(lift));
console.log(
  'race tabs (header, tablist semantics):',
  JSON.stringify(
    await page.evaluate(() => {
      const list = document.querySelector('.race-tabs--header');
      const active = list.querySelector('.race-tab.is-active');
      const s = getComputedStyle(active);
      return {
        role: list.getAttribute('role'),
        tabs: [...list.querySelectorAll('.race-tab')].map(
          (t) => `${t.textContent}:${t.getAttribute('aria-selected')}`
        ),
        controls: active.getAttribute('aria-controls'),
        panel: document.querySelector('#map-region')?.getAttribute('role'),
        underline: `${s.borderBottomWidth} ${s.borderBottomColor}`,
        floatingDock: !!document.querySelector('.dock-row, .dock-pill, .dock-option'),
      };
    })
  ),
  '(floatingDock must be false)'
);


// 6. Senate drawer: zoom + candidate bars grow from 0 + tabs
await page.locator('.race-tabs--header .race-tab[data-chamber="senate"]').click();
await page.waitForTimeout(500);
await page.locator('[data-state="GA"]').click();
await page.waitForTimeout(150);
const barsEarly = await page.evaluate(() =>
  [...document.querySelectorAll('.cand-fill')].map((el) => parseFloat(el.style.width) || 0)
);
await page.waitForTimeout(1100);
const drawer = await page.evaluate(() => {
  const svg = document.querySelector('.election-map').getBoundingClientRect();
  const card = document.querySelector('.map-card').getBoundingClientRect();
  return {
    camera: document.querySelector('.map-camera').style.transform !== '',
    blur: document.querySelector('.map-rest').style.filter,
    bars: [...document.querySelectorAll('.cand-fill')].map((el) => el.style.width),
    pcts: [...document.querySelectorAll('.cand-pct')].map((el) => el.textContent),
    // Redesign: the panel's tab row is the SOURCE row now, not chambers.
    sources: [...document.querySelectorAll('.drawer-src')].map((t) => t.textContent.trim()),
    breadcrumb: document.querySelector('.drawer-breadcrumb')?.textContent.trim(),
    flag: document.querySelector('.drawer-flag')?.naturalWidth > 0,
    photos: [...document.querySelectorAll('.cand-photo')].map((i) => i.naturalWidth > 0),
    counties: document.querySelectorAll('.county-cell').length > 0,
    mapFillsCard: Math.abs(svg.width - card.width) < 3,
  };
});
console.log(
  'drawer:',
  JSON.stringify(drawer),
  '(3 SOURCE tabs, breadcrumb chamber/state, flag + photos loaded, counties, fills card)'
);
// The page tabs stay (they are page chrome now); the source control steps
// aside so the zoomed frame belongs to the state and its panel.
console.log(
  'zoomed frame:',
  JSON.stringify(
    await page.evaluate(() => ({
      sourceControlHidden: getComputedStyle(document.querySelector('.seg-control')).opacity === '0',
      // The chamber tabs are GONE from the panel — the chamber is a label in
      // the breadcrumb now, and this row belongs to the source.
      chamberTabsInPanel: document.querySelectorAll('.drawer .race-tab').length,
      sourceRow: document.querySelectorAll('.drawer-src').length,
      sourceRowIsRadiogroup:
        document.querySelector('.drawer-sources')?.getAttribute('role') === 'radiogroup',
    }))
  )
);
// The source row is a LOCAL reading toggle: it must not repaint the map.
const beforePick = await page.evaluate(
  () => document.querySelector('.state-shape[data-state="TX"]')?.style.fill
);
await page.locator('.drawer-src').nth(1).click();
await page.waitForTimeout(400);
console.log(
  'drawer source row (local only):',
  JSON.stringify(
    await page.evaluate((before) => ({
      checked: [...document.querySelectorAll('.drawer-src')].map(
        (t) => `${t.textContent.trim()}:${t.getAttribute('aria-checked')}`
      ),
      meta: document.querySelector('.drawer-meta')?.textContent.trim(),
      // The map keeps the GLOBAL source — this row never repaints it.
      mapUnchanged: document.querySelector('.state-shape[data-state="TX"]')?.style.fill === before,
      globalSegStillActive: document.querySelector('.seg.is-active .seg-brand')?.textContent.trim(),
    }), beforePick)
  )
);
// Follow toggles primary -> secondary.
await page.locator('.drawer .btn-follow').click();
console.log(
  'follow toggled:',
  await page.locator('.drawer .btn-follow').innerText(),
  await page.evaluate(() => document.querySelector('.drawer .btn-follow').className.includes('is-following'))
);
// Prev/next navigation: the right arrow names the destination and lands there.
const nextName = await page.evaluate(
  () => document.querySelectorAll('.drawer-nav-btn')[1].textContent.trim()
);
await page.locator('.drawer-nav-btn').nth(1).click();
await page.waitForTimeout(900);
const landed = await page.evaluate(() => document.querySelector('.drawer-breadcrumb').textContent);
console.log('drawer nav: next said', JSON.stringify(nextName), '→ landed on', JSON.stringify(landed));
await page.screenshot({ path: SHOT('4b-drawer-nav') });
console.log(
  'bars grew from ~0:',
  JSON.stringify(barsEarly),
  '→',
  JSON.stringify(drawer.bars),
  '| animated:',
  barsEarly.every((w, i) => w < parseFloat(drawer.bars[i]))
);
await page.screenshot({ path: SHOT('4-senate-drawer') });

// 6b. TRUST PICKS: the comparison cards are a radio group; a pick re-points
// ONE state at ONE provider (never blended, never silently backfilled).
const fillOf = (id) =>
  page.evaluate((s) => document.querySelector(`[data-state="${s}"]`).style.fill, id);
const trustBefore = await fillOf('GA');
await page.locator('.drawer-nav-btn').nth(0).click(); // back to Georgia
await page.waitForTimeout(700);
await page.locator('.source-card[data-source="kalshi"]').click();
await page.waitForTimeout(400);
console.log(
  'trust pick:',
  JSON.stringify({
    checked: await page.evaluate(() =>
      [...document.querySelectorAll('.source-card')].map(
        (c) => `${c.dataset.source}:${c.getAttribute('aria-checked')}`
      )
    ),
    badge: await page.evaluate(
      () => document.querySelector('.source-card.is-picked .trust-badge')?.textContent
    ),
    copy: await page.evaluate(() => document.querySelector('.trust-copy')?.textContent.trim()),
    fillBefore: trustBefore,
    fillAfter: await fillOf('GA'),
    markers: await page.evaluate(() => document.querySelectorAll('.trust-dot').length),
    legend: await page.evaluate(() =>
      [...document.querySelectorAll('.legend-strip li')].some((l) =>
        l.textContent.includes('Your trusted source')
      )
    ),
  }),
  '(GA recolors to Kalshi, 1 marker, legend documents it)'
);
// Arrow keys move AND select; Space on the pick clears it (radio toggle).
await page.locator('.source-card.is-picked').focus();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(250);
const arrowed = await page.evaluate(() => document.activeElement?.dataset.source);
await page.keyboard.press(' ');
await page.waitForTimeout(300);
console.log(
  'trust keyboard:',
  JSON.stringify({
    arrowMovedTo: arrowed,
    clearedBySpace: await page.evaluate(
      () => ![...document.querySelectorAll('.source-card')].some((c) => c.getAttribute('aria-checked') === 'true')
    ),
    markersAfterClear: await page.evaluate(() => document.querySelectorAll('.trust-dot').length),
  })
);
// A pick with no data stays empty — striped, never backfilled.
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
await page.locator('[data-state="WV"]').click();
await page.waitForTimeout(800);
await page.locator('.source-card[data-source="kalshi"]').click();
await page.waitForTimeout(400);
console.log(
  'trust no-data:',
  JSON.stringify({
    note: await page.evaluate(() => document.querySelector('.trust-warn')?.textContent.trim()),
    fill: await fillOf('WV'),
    striped: await page.evaluate(
      () => !!document.querySelector('[data-state="WV"]')?.parentElement.querySelector('[fill="url(#hatch-no-data)"]')
    ),
  }),
  '(no-read gray + stripes, never the global source)'
);
await page.locator('.trust-reset').click();
await page.waitForTimeout(300);
await page.screenshot({ path: SHOT('4c-trust-picks') });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// 7. House drawer: SAME layout as the others + a Districts section.
await page.locator('.race-tabs--header .race-tab[data-chamber="house"]').click();
await page.waitForTimeout(400);
await page.locator('[data-state="PA"]').click();
await page.waitForTimeout(900);
console.log(
  'house drawer:',
  JSON.stringify(
    await page.evaluate(() => ({
      candidates: document.querySelectorAll('.cand-row').length,
      sources: document.querySelectorAll('.source-card').length,
      districtHeading: document.querySelector('.district-grid')
        ? document.querySelectorAll('.district-block').length
        : 0,
      districtsTotal: document.querySelector('.district-expander')?.textContent ?? 'no expander',
      twoUp: (() => {
        const b = [...document.querySelectorAll('.district-block')];
        return b.length >= 2 && b[0].getBoundingClientRect().top === b[1].getBoundingClientRect().top;
      })(),
      finance: document.body.innerText.includes('Finance Data'),
      backToMap: !!document.querySelector('.zoom-exit'),
      follow: !!document.querySelector('.btn-follow'),
      tabs: document.querySelectorAll('.race-tabs--panel .race-tab').length,
    }))
  ),
  '(10 district blocks 2-up, expander to 17, no finance, no back-to-map)'
);
await page.screenshot({ path: SHOT('5-house-drawer') });
await page.keyboard.press('Escape');
await page.waitForTimeout(700);

// 8. Stale feed: freshness surfaces per-read (tooltip carries ⚠)
await page.locator('.race-tabs--header .race-tab[data-chamber="senate"]').click();
await page.getByRole('button', { name: 'DEV' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Simulate stale feed' }).click();
await page.waitForTimeout(400);
// Park the map first: hovering is what summons the tooltip, and a scroll
// mid-hover dismisses it by design (it is viewport-anchored).
await page.evaluate(() =>
  document.querySelector('.map-and-panel').scrollIntoView({ block: 'center' })
);
await page.waitForTimeout(500);
await page.locator('[data-state="GA"]').hover();
await page.waitForTimeout(400);
const staleTip = await page.locator('.map-tooltip').innerText();
console.log('GA tooltip after stale sim has ⚠:', staleTip.includes('⚠'));
await page.getByRole('button', { name: 'Reset' }).click();
await page.waitForTimeout(400);

// 9. Cutover to results — sources disabled, hardening intact
await page.locator('.race-tabs--header .race-tab[data-chamber="senate"]').click();
await page.getByRole('button', { name: 'Results', exact: true }).click();
await page.waitForTimeout(1600);
console.log(
  'results byline (static attribution):',
  JSON.stringify(await page.locator('.source-byline').innerText())
);
await page.screenshot({ path: SHOT('6-results') });
await page.locator('#dev-state-select').selectOption('GA');
await page.getByRole('button', { name: 'Call race' }).click();
await page.waitForTimeout(1100);
await page.screenshot({ path: SHOT('7-called') });

// 10. Message API round trip
const listReply = await page.evaluate(() => {
  return new Promise((resolve) => {
    function onMsg(e) {
      if (e.data?.type === 'usmap-list' && e.data?.source === 'usmap') {
        window.removeEventListener('message', onMsg);
        resolve({ chamber: e.data.chamber, sourceId: e.data.sourceId, first: e.data.races[0] });
      }
    }
    window.addEventListener('message', onMsg);
    window.postMessage({ type: 'usmap-list' }, '*');
    setTimeout(() => resolve('TIMEOUT'), 2000);
  });
});
console.log('usmap-list reply:', JSON.stringify(listReply));

// 11. Keyboard: focus a state, aria-label speaks the rating, Enter activates
await page.getByRole('button', { name: 'Reset' }).click();
await page.waitForTimeout(400);
await page.locator('[data-state="AZ"]').focus();
console.log(
  'focused label:',
  await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
);
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
console.log(
  'Enter zooms:',
  await page.evaluate(() => document.querySelector('.map-camera').style.transform !== '')
);
await page.keyboard.press('Escape');

// 12. Nothing floats: the race tabs sit in the page header above the card
// and travel with the page, so no control can ever hover over the feed.
await page.getByRole('button', { name: 'Reset' }).click();
await page.getByRole('button', { name: 'Hide' }).click();
await page.waitForTimeout(400);
await page.evaluate(() => window.scrollTo({ top: 300 }));
await page.waitForTimeout(300);
const mid = await page.evaluate(() => {
  const tabs = document.querySelector('.race-tabs--header').getBoundingClientRect();
  const card = document.querySelector('.map-card').getBoundingClientRect();
  return {
    tabsAboveCard: tabs.bottom <= card.top + 1,
    fixedControls: [...document.querySelectorAll('.map-section *')].filter((el) => {
      const p = getComputedStyle(el).position;
      return p === 'fixed' || p === 'sticky';
    }).length,
  };
});
await page.evaluate(() => {
  document.querySelector('.feed-section').scrollIntoView({ block: 'start' });
  window.scrollBy(0, 200);
});
await page.waitForTimeout(400);
const past = await page.evaluate(() => {
  const tabs = document.querySelector('.race-tabs--header').getBoundingClientRect();
  const feed = document.querySelector('.feed-section').getBoundingClientRect();
  return {
    tabsScrolledAway: tabs.bottom <= 0,
    feedVisible: feed.top < window.innerHeight,
    overlap: tabs.bottom > 0 && tabs.bottom > feed.top,
  };
});
console.log('no floating chrome: mid-section', JSON.stringify(mid), '| past section', JSON.stringify(past), '(tabsAboveCard true, fixedControls 0, overlap false)');

// 12b. Delivery phases: each one shows only what it carries. Phase 1 is the
// MVP — no Follow, no zoom depth, no election night, no race tags, no picker.
for (const phase of [1, 2, 3, 4]) {
  const probe = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
  await probe.goto(`http://localhost:5173/?phase=${phase}`, { waitUntil: 'networkidle' });
  await probe.waitForTimeout(700);
  await probe.evaluate(() => document.querySelector('.map-card').scrollIntoView({ block: 'center' }));
  await probe.waitForTimeout(300);
  await probe.locator('[data-state="PA"]').click();
  await probe.waitForSelector('.drawer', { timeout: 4000 });
  await probe.waitForTimeout(800);
  const seen = await probe.evaluate(() => ({
    follow: !!document.querySelector('.drawer .btn-follow'),
    zoomDepth: !!document.querySelector('.district-grid'),
    picker: !!document.querySelector('.drawer-reads[role="radiogroup"]'),
    electionNight: !!document.querySelector('button[class*="dev"]'),
    raceTags: document.querySelectorAll('.feed-tag').length > 0,
  }));
  console.log(`phase ${phase}:`, JSON.stringify(seen));
  await probe.close();
}
await page.screenshot({ path: SHOT('8-feed') });

// Feed filters are their own system and actually filter.
const allCount = await page.locator('.feed-item').count();
// Opinion is signalled by the component's exclusive tone and NOTHING else:
// the comp's rows carry no eyebrow, no lock, no DW+ badge.
const opinionTone = await page.evaluate(() => {
  const o = document.querySelector('.feed-item--opinion .feed-headline');
  return {
    serif: o ? getComputedStyle(o).fontFamily.includes('Caslon') : false,
    kicker: !!document.querySelector('.feed-kicker'),
    badge: !!document.querySelector('.feed-plus'),
    lock: !!document.querySelector('.feed-lock'),
    rowThumbOverlay: !!document.querySelector('.feed-item .feed-thumb > :not(.feed-img)'),
  };
});
await page.getByRole('button', { name: 'Shorts', exact: true }).click();
await page.waitForTimeout(600); // collapse sequence
const shortsGrid = await page.evaluate(() => ({
  cards: document.querySelectorAll('.shorts-grid .short-card').length,
  topRowGone: !document.querySelector('.shorts-row-block'),
  bar: [...document.querySelectorAll('.filter-bar .feed-filter')].map((p) => p.textContent),
  trigger: !!document.querySelector('.host-trigger'),
}));
await page.locator('.filter-x').click(); // exit motion restores browse
await page.waitForTimeout(600);
console.log('feed: all', allCount, '→ shorts grid', JSON.stringify(shortsGrid), '| opinion tone:', JSON.stringify(opinionTone));

const axeLines = consoleLines.filter((l) => /axe|violation/i.test(l));
console.log('--- axe console output ---');
console.log(axeLines.length ? axeLines.join('\n') : '(no axe violations logged)');

await browser.close();
console.log('DONE');
