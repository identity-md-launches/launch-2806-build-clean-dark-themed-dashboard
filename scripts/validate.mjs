import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

// All successful payloads come from the public APIs at the time this check runs.
// Changed timestamps, empty lists, HTTP errors and malformed data exist only in
// intercepted test requests. No fixture is included in the production application.
const urls = {
  status: 'https://api.squeekchain.com/v1/status',
  economy: 'https://api.squeekchain.com/v1/economy/state',
  settlements: 'https://api.squeekchain.com/v1/settlements?range=24h',
};
const output = resolve('test/scratch/validation');
await mkdir(`${output}/shots`, { recursive: true });
const results = [];
let browser;
const root = resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (!pathname.startsWith('/dashboard/')) { res.writeHead(404).end(); return; }
  const file = resolve(root, pathname.slice('/dashboard/'.length) || 'index.html');
  if (!file.startsWith(root + '/')) { res.writeHead(403).end(); return; }
  try { const data = await readFile(file); res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404).end('Not found'); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}/dashboard/`;
const record = (name, status, details = '') => { results.push({ name, status, details }); process.stdout.write(`${status.toUpperCase()}: ${name}${details ? ` — ${details}` : ''}\n`); };
async function test(name, run) { try { await run(); record(name, 'passed'); } catch (error) { record(name, 'failed', String(error.message).slice(0, 1500)); } }
const amount = (value, precision, places = 2, group = true) => {
  const shown = Math.min(precision, places);
  const divisor = 10n ** BigInt(precision - shown);
  const n = (BigInt(value) + (shown < precision ? divisor / 2n : 0n)) / divisor;
  const scale = 10n ** BigInt(shown);
  const whole = group ? (n / scale).toLocaleString('en-US') : String(n / scale);
  return whole + (shown ? '.' + (n % scale).toString().padStart(shown, '0') : '');
};
const visible = async (locator) => { await locator.waitFor({ state: 'visible', timeout: 15000 }); };
const idle = async (page) => visible(page.getByRole('button', { name: 'Refresh data', exact: true }));
try {
const live = Object.fromEntries(await Promise.all(Object.entries(urls).map(async ([name, url]) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, `${name} HTTP response`);
  return [name, await response.json()];
})));
const makeFixtures = () => {
  const fixtures = structuredClone(live);
  const now = new Date().toISOString();
  for (const value of Object.values(fixtures)) value.generatedAt = now;
  fixtures.status.measurement.observedAt = now;
  return fixtures;
};
async function mocked({ width = 1440, height = 1000, clock = false, mode = {} } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  if (clock) await page.clock.install();
  const fixtures = makeFixtures();
  const counts = { status: 0, economy: 0, settlements: 0 };
  await page.route('https://api.squeekchain.com/**', async (route) => {
    const name = Object.keys(urls).find((key) => urls[key] === route.request().url());
    if (!name) return route.abort();
    counts[name]++;
    if (mode[name] === 'timeout') return;
    if (mode[name] === 'error') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"status":"unavailable"}' });
    if (mode[name] === 'malformed') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"unexpected":true}' });
    if (typeof mode[name] === 'function') await mode[name]();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixtures[name]) });
  });
  return { page, context, fixtures, counts, mode };
}

  browser = await chromium.launch();
  await test('Live APIs, CORS, field accuracy and local assets under a subpath', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    const missing = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) missing.push(r.url().slice(base.length)); });
    const responses = Object.fromEntries(Object.entries(urls).map(([name, url]) => [name, page.waitForResponse(url)]));
    await page.goto(base);
    await idle(page);
    const bodies = Object.fromEntries(await Promise.all(Object.entries(responses).map(async ([name, promise]) => {
      const response = await promise;
      assert.equal(response.status(), 200);
      assert.equal(response.headers()['access-control-allow-origin'], '*');
      return [name, await response.json()];
    })));
    assert.equal(await page.locator('.metric-value').nth(0).innerText(), BigInt(bodies.status.builder.anchor.blockHeight).toLocaleString('en-US'));
    assert.equal(await page.locator('.metric-value').nth(1).innerText(), BigInt(bodies.status.measurement.cumulativeWorkUnits).toLocaleString('en-US'));
    assert.equal(await page.locator('.supply-value').innerText(), amount(bodies.economy.supply.liveSupplyBaseUnits, bodies.economy.asset.decimals));
    const metaImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    assert.equal((await page.request.get(new URL(metaImage, base).href)).status(), 200);
    assert.equal(await page.evaluate(() => document.fonts.check('400 16px "Manrope Variable"')), true);
    await page.screenshot({ path: `${output}/shots/desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${output}/shots/mobile.png` });
    const boxes = await page.evaluate(() => ({
      product: document.querySelector('.mobile-brand').getBoundingClientRect().bottom,
      refresh: document.querySelector('.primary-button').getBoundingClientRect().bottom,
      metrics: document.querySelector('.metrics-grid').getBoundingClientRect().bottom,
      width: document.documentElement.scrollWidth,
    }));
    assert.ok(boxes.product <= 844 && boxes.refresh <= 844 && boxes.metrics <= 844);
    assert.equal(boxes.width, 390);
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    await page.close();
  });

  await test('Search, empty search, clear, pagination and oldest-first ordering', async () => {
    const { page, context, fixtures } = await mocked();
    await page.goto(base); await idle(page);
    const expected = [...fixtures.settlements.recentSettlements].sort((a, b) => Date.parse(b.blockTimestamp) - Date.parse(a.blockTimestamp));
    assert.ok(expected.length > 5, 'The live API must return enough recent rows to check pagination.');
    assert.equal(await page.locator('.settlement-row').count(), 5);
    await page.getByRole('button', { name: 'Next settlements' }).click();
    assert.ok((await page.locator('.settlement-cell strong').first().innerText()).includes(expected[5].settledThroughRound));
    await page.getByRole('button', { name: 'Previous settlements' }).click();
    await page.getByRole('combobox', { name: 'Settlement order' }).selectOption('oldest');
    assert.ok((await page.locator('.settlement-cell strong').first().innerText()).includes(expected.at(-1).settledThroughRound));
    await page.getByRole('searchbox').fill(expected[0].transactionHash);
    assert.equal(await page.locator('.settlement-row').count(), 1);
    await page.getByRole('searchbox').fill('no-such-transaction');
    await visible(page.getByRole('heading', { name: 'No matching settlements' }));
    await page.getByRole('button', { name: 'Clear search', exact: true }).first().click();
    assert.equal(await page.locator('.settlement-row').count(), 5);
    await context.close();
  });

  await test('Expandable settlement, full hash, clipboard and chain-correct explorer', async () => {
    const { page, context, fixtures } = await mocked();
    await page.goto(base); await idle(page);
    const first = [...fixtures.settlements.recentSettlements].sort((a, b) => Date.parse(b.blockTimestamp) - Date.parse(a.blockTimestamp))[0];
    const control = page.getByRole('button', { name: `Show details for round ${first.settledThroughRound}`, exact: true });
    await control.click();
    assert.equal(await page.locator('.detail-transaction code').innerText(), first.transactionHash);
    assert.equal(await page.locator('.exact-value').innerText(), amount(first.sqkMintedBaseUnits, fixtures.settlements.mining.economy.decimals, fixtures.settlements.mining.economy.decimals, false) + ' ' + fixtures.settlements.mining.economy.symbol);
    assert.equal(await page.getByRole('link', { name: /View transaction/ }).getAttribute('href'), `https://sepolia.etherscan.io/tx/${first.transactionHash}`);
    await page.getByRole('button', { name: 'Copy hash' }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), first.transactionHash);
    await visible(page.getByText('Transaction hash copied.', { exact: true }));
    await page.getByRole('button', { name: `Hide details for round ${first.settledThroughRound}` }).click();
    assert.equal(await page.locator('.detail-row').count(), 0);
    await context.close();
  });

  await test('Activity modes, exact hourly table and full-precision supply disclosure', async () => {
    const { page, context, fixtures } = await mocked();
    await page.goto(base); await idle(page);
    await page.getByRole('button', { name: 'Blocks', exact: true }).click();
    assert.equal(await page.locator('.chart-total strong').innerText(), BigInt(fixtures.settlements.summary.completedBlockCount).toLocaleString('en-US'));
    await page.getByRole('button', { name: 'Settlements', exact: true }).click();
    assert.equal(await page.locator('.chart-total strong').innerText(), BigInt(fixtures.settlements.summary.settlementCount).toLocaleString('en-US'));
    await page.getByText('View hourly data', { exact: true }).click();
    assert.equal(await page.locator('.hourly-table tbody tr').count(), fixtures.settlements.buckets.length);
    await page.getByText('View exact supply', { exact: true }).click();
    assert.equal(await page.locator('.supply-details dd').first().innerText(), amount(fixtures.economy.supply.liveSupplyBaseUnits, fixtures.economy.asset.decimals, fixtures.economy.asset.decimals, false));
    await context.close();
  });

  await test('60-second automatic refresh, pause, and manual refresh while paused', async () => {
    const { page, context, counts } = await mocked({ clock: true });
    await page.goto(base); await idle(page);
    assert.deepEqual(counts, { status: 1, economy: 1, settlements: 1 });
    await page.clock.fastForward(59_000);
    assert.equal(counts.status, 1);
    await page.clock.fastForward(2_000); await idle(page);
    assert.deepEqual(counts, { status: 2, economy: 2, settlements: 2 });
    await page.getByRole('switch').click();
    assert.equal(await page.getByRole('switch').getAttribute('aria-checked'), 'false');
    await page.clock.fastForward(180_000);
    assert.equal(counts.status, 2);
    await page.getByRole('button', { name: 'Refresh data', exact: true }).click(); await idle(page);
    assert.deepEqual(counts, { status: 3, economy: 3, settlements: 3 });
    await context.close();
  });

  await test('Loading state and duplicate refresh prevention', async () => {
    let release;
    const gate = new Promise((done) => { release = done; });
    const { page, context, counts } = await mocked({ mode: { status: () => gate, economy: () => gate, settlements: () => gate } });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await visible(page.getByRole('button', { name: 'Refreshing', exact: true }));
    assert.equal(await page.getByRole('button', { name: 'Refreshing', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('.loading-value').count(), 4);
    release(); await idle(page);
    assert.deepEqual(counts, { status: 1, economy: 1, settlements: 1 });
    await context.close();
  });

  await test('Partial failure retains prior supply and recovers on retry', async () => {
    const { page, context, mode } = await mocked();
    await page.goto(base); await idle(page);
    const previous = await page.locator('.supply-value').innerText();
    mode.economy = 'error';
    await page.getByRole('button', { name: 'Refresh data', exact: true }).click(); await idle(page);
    await visible(page.getByText('Could not update SQK supply.', { exact: true }));
    assert.equal(await page.locator('.supply-value').innerText(), previous);
    assert.equal(await page.locator('.live-badge').innerText(), 'Refresh issue');
    mode.economy = undefined;
    await page.getByRole('button', { name: 'Refresh data', exact: true }).click(); await idle(page);
    assert.equal(await page.locator('.notice-warning').count(), 0);
    assert.equal(await page.locator('.live-badge').innerText(), 'Live data');
    await context.close();
  });

  await test('Initial total API failure shows unavailable values, not invented numbers', async () => {
    const { page, context } = await mocked({ mode: { status: 'error', economy: 'error', settlements: 'error' } });
    await page.goto(base); await idle(page);
    assert.equal(await page.locator('.live-badge').innerText(), 'Data unavailable');
    assert.equal(await page.locator('.missing-value').count(), 4);
    assert.equal(await page.locator('.supply-value').innerText(), 'Unavailable');
    assert.equal(await page.locator('.settlement-row').count(), 0);
    await visible(page.getByRole('heading', { name: 'Settlements are unavailable' }));
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), []);
    await page.screenshot({ path: `${output}/shots/api-failure.png`, fullPage: true });
    await context.close();
  });

  await test('Malformed API payload is isolated and never displayed as live', async () => {
    const { page, context } = await mocked({ mode: { economy: 'malformed' } });
    await page.goto(base); await idle(page);
    assert.equal(await page.locator('.supply-value').innerText(), 'Unavailable');
    assert.equal(await page.locator('.live-badge').innerText(), 'Partial data');
    assert.equal(await page.locator('.settlement-row').count(), 5);
    await context.close();
  });

  await test('12-second request timeout returns a retryable error', async () => {
    const { page, context } = await mocked({ clock: true, mode: { status: 'timeout' } });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await visible(page.getByRole('button', { name: 'Refreshing', exact: true }));
    await page.clock.fastForward(13_000); await idle(page);
    await page.locator('.data-details summary').click();
    await visible(page.getByText('The request timed out after 12 seconds.', { exact: true }));
    assert.equal(await page.locator('.live-badge').innerText(), 'Partial data');
    await context.close();
  });

  await test('Delayed telemetry and responses are visibly distinguished from live data', async () => {
    const { page, context, fixtures } = await mocked();
    const old = new Date(Date.now() - 300_000).toISOString();
    Object.values(fixtures).forEach((value) => { value.generatedAt = old; });
    fixtures.status.measurement.observedAt = old;
    await page.goto(base); await idle(page);
    assert.equal(await page.locator('.live-badge').innerText(), 'Delayed data');
    assert.equal(await page.locator('.status-value').innerText(), 'Stale');
    await visible(page.getByText('The API is returning delayed data.', { exact: true }));
    await context.close();
  });

  await test('Empty settlement response has an honest empty state', async () => {
    const { page, context, fixtures } = await mocked();
    fixtures.settlements.recentSettlements = [];
    fixtures.settlements.buckets = [];
    fixtures.settlements.summary = { ...fixtures.settlements.summary, settlementCount: '0', workAdded: '0', completedBlockCount: '0' };
    await page.goto(base); await idle(page);
    await visible(page.getByRole('heading', { name: 'No recent settlements' }));
    await visible(page.getByText('No hourly activity returned', { exact: true }));
    assert.equal(await page.getByRole('button', { name: 'Next settlements' }).isDisabled(), true);
    await context.close();
  });

  await test('320, 390, 640, 800, 1024, 1440 reflow, mobile details and automated accessibility', async () => {
    const { page, context } = await mocked();
    await page.goto(base); await idle(page);
    for (const width of [320, 390, 640, 800, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, `Overflow at ${width}`);
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      assert.deepEqual(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), [], `Axe at ${width}`);
    }
    await page.setViewportSize({ width: 320, height: 800 });
    await page.locator('.expand-button').first().click();
    await page.getByText('View exact supply', { exact: true }).click();
    await page.locator('.data-details summary').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
    await page.screenshot({ path: `${output}/shots/mobile-expanded.png`, fullPage: true });
    await context.close();
  });

  await test('Keyboard navigation, named compact navigation and visible focus', async () => {
    const { page, context } = await mocked({ width: 900 });
    await page.goto(base); await idle(page);
    for (const name of ['Overview', 'Settlements', 'Data sources']) assert.equal(await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name, exact: true }).count(), 1);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').innerText(), 'Skip to content');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Refresh data', exact: true }).focus();
    const ring = await page.locator(':focus').evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
    assert.equal(ring.style, 'solid'); assert.equal(ring.width, '2px');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').getAttribute('role'), 'switch');
    await page.keyboard.press('Space');
    assert.equal(await page.getByRole('switch').getAttribute('aria-checked'), 'false');
    await page.getByRole('button', { name: 'Blocks', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('button', { name: 'Blocks', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.screenshot({ path: `${output}/shots/keyboard-focus.png` });
    await context.close();
  });

  await test('Reduced motion, forced colors, text enlargement and RTL reflow', async () => {
    const { page, context } = await mocked({ width: 390 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base); await idle(page);
    assert.equal(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length), 0);
    await page.emulateMedia({ forcedColors: 'active' });
    await page.getByRole('button', { name: 'Refresh data', exact: true }).focus();
    assert.equal(await page.locator(':focus').evaluate((el) => getComputedStyle(el).outlineStyle), 'solid');
    await page.emulateMedia({ forcedColors: 'none' });
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390, 'RTL horizontal overflow');
    await page.evaluate(() => { document.documentElement.dir = 'ltr'; document.documentElement.style.fontSize = '200%'; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390, '200% text horizontal overflow');
    await page.screenshot({ path: `${output}/shots/enlarged-text.png`, fullPage: true });
    await context.close();
  });

  let safari;
  try { safari = await webkit.launch(); }
  catch { record('WebKit interaction check', 'not verified', 'The WebKit runtime could not launch because required browser libraries are unavailable.'); }
  if (safari) {
    await test('WebKit refresh, search, activity and disclosures at mobile width', async () => {
      const page = await safari.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(base); await idle(page);
      await page.getByRole('button', { name: 'Refresh data', exact: true }).click(); await idle(page);
      await page.getByRole('button', { name: 'Blocks', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Blocks', exact: true }).getAttribute('aria-pressed'), 'true');
      await page.getByRole('searchbox').fill('no-such-transaction');
      await visible(page.getByRole('heading', { name: 'No matching settlements' }));
      await page.getByRole('button', { name: 'Clear search', exact: true }).first().click();
      await page.locator('.expand-button').first().click();
      assert.equal(await page.locator('.detail-transaction code').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
      await page.screenshot({ path: `${output}/shots/webkit-mobile.png`, fullPage: true });
      await page.close();
    });
    await safari.close();
  }
} catch (error) {
  record('Validation harness', 'failed', String(error.message).slice(0, 1500));
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
  const summary = { checkedAt: new Date().toISOString(), passed: results.filter((r) => r.status === 'passed').length, failed: results.filter((r) => r.status === 'failed').length, notVerified: results.filter((r) => r.status === 'not verified').length, checks: results };
  await writeFile(`${output}/results.json`, JSON.stringify(summary, null, 2));
  process.stdout.write(JSON.stringify({ passed: summary.passed, failed: summary.failed, notVerified: summary.notVerified }) + '\n');
  if (summary.failed) process.exitCode = 1;
}
