// Dev-time verification harness (not part of the deliverable): drives the
// redesigned prototype in system Chrome — scroll chrome, dock, sources menu,
// drawer with candidate bars, zoom camera, cutover, message API — captures
// axe console output and screenshots to /tmp.
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173/';
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
      chamber: document.querySelector('.dock-option input:checked')?.value,
      source: document.querySelector('.dock-sources-trigger')?.textContent.trim(),
      heroTitle: document.querySelector('.hero-title')?.textContent.slice(0, 40),
    }))
  )
);

// 2. Scroll chrome: DOWN hides the promo bar; UP brings it back; nav stays.
// (Compact title removed Aug 2026.)
await page.mouse.wheel(0, 500);
await page.waitForTimeout(600);
const down = await page.evaluate(() => ({
  collapsed: document.querySelectorAll('.chrome-collapse.is-collapsed').length,
  navVisible: document.querySelector('.dw-nav-bar').getBoundingClientRect().top === 0,
}));
console.log('scroll down:', JSON.stringify(down), '(expect collapsed 1, nav visible)');
await page.mouse.wheel(0, -120);
await page.waitForTimeout(600);
const up = await page.evaluate(() => ({
  collapsed: document.querySelectorAll('.chrome-collapse.is-collapsed').length,
}));
console.log('scroll up  :', JSON.stringify(up), '(expect collapsed 0)');
await page.evaluate(() => window.scrollTo({ top: 0 }));
await page.waitForTimeout(600);

// 3. Balance bar hover tooltip (hero bar)
await page.locator('.hero .balance-bar').hover();
await page.waitForTimeout(300);
console.log(
  'bar tooltip:',
  JSON.stringify(await page.locator('.balance-tooltip').innerText().catch(() => 'MISSING'))
);
await page.mouse.move(10, 400);

// 4. Sources menu (one source at a time, DDHQ default)
await page.locator('.dock-sources-trigger').click();
await page.waitForTimeout(300);
await page.screenshot({ path: SHOT('3-sources-menu') });
await page.getByRole('menuitemradio', { name: 'Kalshi' }).click();
await page.waitForTimeout(500);
console.log(
  'source switched to:',
  await page.locator('.dock-sources-trigger').innerText().then((t) => t.trim())
);
await page.locator('.dock-sources-trigger').click();
await page.getByRole('menuitemradio', { name: 'DDHQ' }).click();
await page.waitForTimeout(400);

// 5. Interaction layer: crisp map (no transformed ancestors), lift, dock magnify
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
  'dock chips (stroke, no transform):',
  JSON.stringify(
    await page.evaluate(() =>
      [...document.querySelectorAll('.dock-label')].map((el) => {
        const s = getComputedStyle(el);
        return { border: s.borderTopWidth + ' ' + (s.borderTopColor.length > 0), transform: s.transform };
      })
    )
  )
);


// 6. Senate drawer: zoom + candidate bars grow from 0 + tabs
await page.locator('.dock-option input[value="senate"]').check({ force: true });
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
    tabs: [...document.querySelectorAll('.drawer-tab')].length,
    photos: [...document.querySelectorAll('.cand-photo')].map((i) => i.naturalWidth > 0),
    flag: !!document.querySelector('.zoom-flag image'),
    mapFillsCard: Math.abs(svg.width - card.width) < 3,
  };
});
console.log('drawer:', JSON.stringify(drawer), '(tabs expected 3 chamber tabs, photos true, flag true, fills card)');
// Dock must leave while the drawer owns navigation.
console.log(
  'dock dismissed while drawer open:',
  await page.evaluate(() => document.querySelector('.dock-row').className.includes('is-dismissed'))
);
// GA has no curated House race: House tab disabled, Governor enabled.
console.log(
  'tab states:',
  JSON.stringify(
    await page.evaluate(() =>
      [...document.querySelectorAll('.drawer-tab')].map((t) => ({
        label: t.textContent,
        disabled: t.disabled,
        active: t.className.includes('is-active'),
      }))
    )
  )
);
// Follow toggles primary -> secondary.
await page.locator('.btn-follow').click();
console.log(
  'follow toggled:',
  await page.locator('.btn-follow').innerText(),
  await page.evaluate(() => document.querySelector('.btn-follow').className.includes('is-following'))
);
// Prev/next navigation: the right arrow names the destination and lands there.
const nextName = await page.evaluate(
  () => document.querySelectorAll('.drawer-nav-btn')[1].textContent.trim()
);
await page.locator('.drawer-nav-btn').nth(1).click();
await page.waitForTimeout(900);
const landed = await page.evaluate(() => document.querySelector('.drawer-head h2').textContent);
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
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// 7. House drawer: SAME layout as the others + a Districts section.
await page.locator('.dock-option input[value="house"]').check({ force: true });
await page.waitForTimeout(400);
await page.locator('[data-state="PA"]').click();
await page.waitForTimeout(900);
console.log(
  'house drawer:',
  JSON.stringify(
    await page.evaluate(() => ({
      candidates: document.querySelectorAll('.cand-row').length,
      sources: document.querySelectorAll('.drawer-reads li').length,
      districts: document.querySelectorAll('.drawer-districts li').length,
      follow: !!document.querySelector('.btn-follow'),
      tabs: document.querySelectorAll('.drawer-tab').length,
    }))
  ),
  '(same layout as other chambers + districts 3)'
);
await page.screenshot({ path: SHOT('5-house-drawer') });
await page.keyboard.press('Escape');
await page.waitForTimeout(700);

// 8. Stale feed: freshness surfaces per-read (tooltip carries ⚠)
await page.locator('.dock-option input[value="senate"]').check({ force: true });
await page.getByRole('button', { name: 'DEV' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Simulate stale feed' }).click();
await page.waitForTimeout(400);
await page.locator('[data-state="GA"]').hover();
await page.waitForTimeout(300);
const staleTip = await page.locator('.map-tooltip').innerText();
console.log('GA tooltip after stale sim has ⚠:', staleTip.includes('⚠'));
await page.getByRole('button', { name: 'Reset' }).click();
await page.waitForTimeout(400);

// 9. Cutover to results — sources disabled, hardening intact
await page.locator('.dock-option input[value="senate"]').check({ force: true });
await page.getByRole('button', { name: 'Results', exact: true }).click();
await page.waitForTimeout(1600);
console.log(
  'sources disabled in results:',
  await page.locator('.dock-sources-trigger').isDisabled()
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

const axeLines = consoleLines.filter((l) => /axe|violation/i.test(l));
console.log('--- axe console output ---');
console.log(axeLines.length ? axeLines.join('\n') : '(no axe violations logged)');

await browser.close();
console.log('DONE');
