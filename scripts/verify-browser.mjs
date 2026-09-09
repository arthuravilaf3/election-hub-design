// Dev-time verification harness (not part of the deliverable): drives the
// redesigned prototype in system Chrome — scroll chrome, race tabs, sources,
// drawer with candidate bars, open-state dim, cutover, message API — captures
// axe console output and screenshots to /tmp.
import { chromium } from 'playwright';

// The harness exercises the FULL prototype: last phase, plus the trusted-
// source picker that has no phase yet (see src/data/phases.ts).
const BASE = process.env.HUB_URL ?? 'http://localhost:5174/?phase=4&trust=1';
const SHOT = (name) => `/tmp/usmap-${name}.png`;

/* Redesign Sep 2026: the header's race tabs and the three-up source segments
   are gone — both are pill dropdowns over the map now. */
const PILL = { race: 0, source: 1 };
/* The pills are fixed to the viewport centre and only shown while the map
   card crosses that centreline — anywhere else they are pointer-events:none
   and a click would be refused. Bring the card to the middle first. */
async function revealPills(page) {
  // The pills sit 40px above the bottom of the viewport (z-index 20). The
  // dev toolbar, when a step leaves it expanded, is fixed to the same edge
  // at z-index 30 and swallows the click — collapse it first.
  const hide = page.getByRole('button', { name: 'Hide' });
  if (await hide.count()) {
    await hide.first().click();
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => document.querySelector('.map-card').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(350);
}
async function pick(page, which, optionId) {
  await revealPills(page);
  // Close whatever is open first: clicking a pill TOGGLES it, so a menu left
  // open by an earlier step would make this click close it instead.
  await page.evaluate(() => document.querySelector('.pill-menu') && document.body.click());
  await page.locator('.map-selectors .pill').nth(PILL[which]).click();
  await page.locator(`.pill-option[data-option="${optionId}"]`).click();
  await page.waitForTimeout(120);
}
const pillValues = () => [...document.querySelectorAll('.pill-value')].map((e) => e.textContent.trim());


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
      chamber: [...document.querySelectorAll('.pill-value')][0]?.textContent.trim(),
      source: [...document.querySelectorAll('.pill-value')][1]?.textContent.trim(),
      title: document.querySelector('.hub-title')?.textContent,
      statement: document.querySelector('.dots-title')?.textContent,
      byline: document.querySelector('.hub-byline')?.textContent,
      stateLabels: document.querySelectorAll('.state-label').length,
      txLabel: [...document.querySelectorAll('.state-label')].find((t) => t.textContent === 'TX') ? 'TX' : 'MISSING',
      pageTitle: document.querySelector('h1')?.textContent,
      docTitle: document.title,
    }))
  )
);

// 2. Scroll: the sticky chrome is the nav and nothing else — no pinned title,
// and no fixed bar at the bottom (the prediction-game promo is gone).
await page.evaluate(() => window.scrollTo(0, 430));
await page.waitForTimeout(600);
const down = await page.evaluate(() => ({
  mapSectionOnScreen:
    document.querySelector('.map-section').getBoundingClientRect().bottom > window.innerHeight,
  compactChrome: document.querySelectorAll('.compact-header, .chrome-collapse').length,
  gamePromo: document.querySelectorAll('.promo-bar').length,
  chromeHeight: Math.round(
    document.querySelector('.site-chrome').getBoundingClientRect().height
  ),
  // Nothing fixed may sit over the page bottom now.
  fixedBottomChrome: [...document.querySelectorAll('body *')].filter((el) => {
    const c = getComputedStyle(el);
    if (c.position !== 'fixed' || c.display === 'none') return false;
    const r = el.getBoundingClientRect();
    return r.width > window.innerWidth * 0.5 && r.bottom >= window.innerHeight - 1;
  }).length,
  navVisible: document.querySelector('.dw-nav-bar').getBoundingClientRect().top === 0,
}));
console.log('scroll down:', JSON.stringify(down), '(nav only; no pinned title; no bottom bar)');
await page.evaluate(() => window.scrollTo({ top: 0 }));
await page.waitForTimeout(600);
const up = await page.evaluate(() => ({
  footerReachable:
    document.querySelector('.site-footer').getBoundingClientRect().height > 0,
}));
console.log('scroll top :', JSON.stringify(up), '(footer reachable, nothing covering it)');
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
      const order = [...sec.querySelectorAll('.hub-header, .dots, .map-card')].map(
        (e) => e.className.split(' ')[0]
      );
      return {
        order,
        titleTag: document.querySelector('.hub-title')?.tagName,
        statementTag: document.querySelector('.dots-title')?.tagName,
        seatInfo: document.querySelector('.dots-seats')?.textContent.replace(/\s+/g, ' ').trim(),
        dots: document.querySelectorAll('.dots-grid .dot').length,
        dotsByParty: ['rep', 'toss', 'dem'].map(
          (p) => `${p}:${document.querySelectorAll(`.dot--${p}`).length}`
        ),
        dotsAlt: document.querySelector('.dots-grid')?.getAttribute('aria-label'),
        dotsOutsideCard: !card.contains(document.querySelector('.dots')),
        selectorsInsideCard: card.contains(document.querySelector('.map-selectors')),
        pills: [...document.querySelectorAll('.pill-label')].map((e) => e.textContent.trim()),
        // The legend left the card in the redesign.
        legendOutsideCard: !card.contains(document.querySelector('.legend-strip')),
        staticTitleGone: !document.querySelector('.page-title, .page-dek'),
      };
    })
  )
);

// 4. Source picker: compact dropdown in the card header; selection persists
// across race switches; race switch updates the statement + staggers the map.
await pick(page, 'source', 'dw-poll-avg');
await page.waitForTimeout(400);
await page.screenshot({ path: SHOT('3-source-segments') });
console.log(
  'source switched to:',
  await page.locator('.pill-value').nth(1).textContent().then((t) => t.trim())
);
// Race switch: statement + byline + bar crossfade together, stagger wave
// runs on the map, source survives.
await pick(page, 'race', 'senate');
await page.waitForTimeout(80);
const midSwitch = await page.evaluate(() => ({
  staggerDelay: [...document.querySelectorAll('.state-shape')].filter(
    (el) => parseFloat(el.style.transitionDelay) > 0
  ).length,
}));
await page.waitForTimeout(900);
const postSwitch = await page.evaluate(() => ({
  statement: document.querySelector('.dots-title')?.textContent,
  byline: document.querySelector('.hub-byline')?.textContent,
  seats: document.querySelector('.dots-seats')?.textContent.replace(/\s+/g, ' ').trim(),
  dots: ['rep', 'toss', 'dem'].map((p) => `${p}:${document.querySelectorAll(`.dot--${p}`).length}`).join(' '),
  source: [...document.querySelectorAll('.pill-value')][1]?.textContent.trim(),
  syncWindow: {
    statement: getComputedStyle(document.querySelector('.dots-copy')).animationDuration,
    bar: getComputedStyle(document.querySelector('.dot')).transitionDuration,
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
await pick(page, 'race', 'house');
await page.waitForTimeout(600);
await pick(page, 'source', 'dw-poll-avg');
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
await revealPills(page);
await page.locator('.map-selectors .pill').nth(0).click();
console.log(
  'map selectors (listbox semantics):',
  JSON.stringify(
    await page.evaluate(() => {
      const btn = document.querySelectorAll('.map-selectors .pill')[0];
      const list = document.querySelector('.pill-menu');
      return {
        haspopup: btn.getAttribute('aria-haspopup'),
        expanded: btn.getAttribute('aria-expanded'),
        listRole: list?.getAttribute('role'),
        options: [...(list?.querySelectorAll('[role=option]') ?? [])].map(
          (o) => `${o.querySelector('.pill-option-label').textContent}:${o.getAttribute('aria-selected')}`
        ),
        // The old tabs pointed at a tabpanel; nothing may still claim to.
        danglingTabpanel: document.querySelector('#map-region')?.getAttribute('role'),
        floatingDock: !!document.querySelector('.dock-row, .dock-pill, .dock-option'),
      };
    })
  ),
  '(floatingDock must be false, danglingTabpanel must be null)'
);
await page.keyboard.press('Escape');
await page.waitForTimeout(150);


// 6. Senate drawer: zoom + candidate bars grow from 0 + tabs
await pick(page, 'race', 'senate');
await page.waitForTimeout(500);
await page.locator('[data-state="GA"]').click();
await page.waitForTimeout(150);
const barsEarly = await page.evaluate(() =>
  [...document.querySelectorAll('.bar-list:not(.district-list) .bar-fill')].map(
    (el) => parseFloat(el.style.width) || 0
  )
);
await page.waitForTimeout(1100);
const drawer = await page.evaluate(() => {
  const svg = document.querySelector('.election-map').getBoundingClientRect();
  const card = document.querySelector('.map-card').getBoundingClientRect();
  return {
    // Sep 2026: the camera flies to the state; no blur on the rest.
    cameraScale: (/matrix\(([-\d.]+)/.exec(getComputedStyle(document.querySelector('.map-camera')).transform) || [])[1],
    restOpacity: getComputedStyle(document.querySelector('.map-rest')).opacity,
    bars: [...document.querySelectorAll('.bar-list:not(.district-list) .bar-fill')].map(
      (el) => el.style.width
    ),
    pcts: [...document.querySelectorAll('.bar-list:not(.district-list) .bar-value')].map(
      (el) => el.textContent
    ),
    // The panel's tab row: Data / Related content.
    tabs: [...document.querySelectorAll('.drawer-tab')].map((t) => t.textContent.trim()),
    title: document.querySelector('.drawer-title')?.textContent.trim(),
    flag: document.querySelector('.drawer-flag')?.naturalWidth > 0,
    photos: [...document.querySelectorAll('.cand-photo')].map((i) => i.naturalWidth > 0),
    counties: document.querySelectorAll('.county-cell').length,
    // No reflow: the map keeps its padding instead of filling the card.
    mapKeepsPadding: svg.width < card.width - 60,
  };
});
console.log(
  'drawer:',
  JSON.stringify(drawer),
  '(camera scale > 1, rest at 0.3, Data/Related tabs, title, flag + photos loaded, 0 counties, padding kept)'
);
// The page tabs stay (they are page chrome now); the source control steps
// aside so the zoomed frame belongs to the state and its panel.
console.log(
  'zoomed frame:',
  JSON.stringify(
    await page.evaluate(() => ({
      sourceControlHidden: getComputedStyle(document.querySelector('.map-selectors')).opacity === '0',
      // The chamber tabs are GONE from the panel — the chamber is a label in
      // the breadcrumb now, and this row belongs to the source.
      chamberTabsInPanel: document.querySelectorAll('.drawer .race-tab').length,
      tabRow: document.querySelectorAll('.drawer-tab').length,
      tabRowIsTablist: document.querySelector('.drawer-tabs')?.getAttribute('role') === 'tablist',
    }))
  )
);
// The second tab swaps the numbers for the coverage about this state, and
// back. Neither touches the map.
const beforeTab = await page.evaluate(
  () => document.querySelector('.state-shape[data-state="TX"]')?.style.fill
);
await page.locator('.drawer-tab').nth(1).click();
await page.waitForTimeout(400);
console.log(
  'drawer tabs:',
  JSON.stringify(
    await page.evaluate((before) => ({
      selected: [...document.querySelectorAll('.drawer-tab')].map(
        (t) => `${t.textContent.trim()}:${t.getAttribute('aria-selected')}`
      ),
      related: !!document.querySelector('.related'),
      numbersGone: !document.querySelector('.bar-list'),
      mapUnchanged: document.querySelector('.state-shape[data-state="TX"]')?.style.fill === before,
      globalSegStillActive: [...document.querySelectorAll('.pill-value')][1]?.textContent.trim(),
    }), beforeTab)
  )
);
await page.locator('.drawer-tab').nth(0).click();
await page.waitForTimeout(300);
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
const landed = await page.evaluate(() => document.querySelector('.drawer-title').textContent);
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

// (6b, the trust-pick cards, left with "Sources compared" — Sep 2026.)
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

// 7. House drawer: SAME layout as the others + a Districts section.
await pick(page, 'race', 'house');
await page.waitForTimeout(400);
await page.locator('[data-state="PA"]').click();
await page.waitForTimeout(900);
console.log(
  'house drawer:',
  JSON.stringify(
    await page.evaluate(() => ({
      candidates: document.querySelectorAll('.bar-list:not(.district-list) .bar-row').length,
      districts: document.querySelectorAll('.district-list .bar-row').length,
      districtsTotal: document.querySelector('.district-expander')?.textContent ?? 'no expander',
      // Candidates and districts are the SAME row shape now (the comp's), so
      // a district and a candidate read as the same kind of object.
      sameRowShape: (() => {
        const c = document.querySelector('.bar-list:not(.district-list) .bar-row');
        const d = document.querySelector('.district-list .bar-row');
        if (!c || !d) return false;
        const pick = (el) => {
          const s = getComputedStyle(el);
          return [s.minHeight, s.padding, s.borderRadius].join('|');
        };
        return pick(c) === pick(d);
      })(),
      // Every district bar must be proportional, never a full-width block.
      barsProportional: [...document.querySelectorAll('.district-list .bar-fill')].every(
        (el) => parseFloat(el.style.width) <= 100
      ),
      finance: document.body.innerText.includes('Finance Data'),
      backToMap: !!document.querySelector('.zoom-exit'),
      follow: !!document.querySelector('.btn-follow'),
      chamberTabs: document.querySelectorAll('.drawer .race-tab').length,
    }))
  ),
  '(district rows share the candidate row shape, expander, no finance, no back-to-map)'
);
await page.screenshot({ path: SHOT('5-house-drawer') });
await page.keyboard.press('Escape');
await page.waitForTimeout(700);

// 8. Stale feed: freshness surfaces per-read (tooltip carries ⚠)
await pick(page, 'race', 'senate');
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
await pick(page, 'race', 'senate');
// revealPills collapses the dev toolbar; the cutover needs it open again.
if (await page.locator('.dev-toolbar--collapsed').count()) {
  await page.locator('.dev-fab').click();
  await page.waitForTimeout(300);
}
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
  'Enter opens the state:',
  await page.evaluate(() => !!document.querySelector('.drawer'))
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
  const sel = document.querySelector('.map-selectors').getBoundingClientRect();
  const card = document.querySelector('.map-card').getBoundingClientRect();
  return {
    // The selectors live INSIDE the card now, not above it.
    selectorsInCard: sel.top >= card.top - 1 && sel.bottom <= card.bottom + 1,
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
  const sel = document.querySelector('.map-selectors').getBoundingClientRect();
  const feed = document.querySelector('.feed-section').getBoundingClientRect();
  return {
    selectorsScrolledAway: sel.bottom <= 0,
    feedVisible: feed.top < window.innerHeight,
    overlap: sel.bottom > 0 && sel.bottom > feed.top,
  };
});
console.log('no floating chrome: mid-section', JSON.stringify(mid), '| past section', JSON.stringify(past), '(selectorsInCard true, fixedControls 0, overlap false)');

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
    zoomDepth: !!document.querySelector('.district-list'),
    relatedTab: !!document.querySelector('.drawer-tab'),
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
    rowThumbOverlay: !!document.querySelector('.feed-item--opinion .feed-thumb > :not(.feed-img)'),
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
