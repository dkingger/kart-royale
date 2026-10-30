/** Both playable worlds must remain reachable from the title screen. */
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { startVite } from './vite-server.mjs';
const server = await startVite(5191);
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 640, height: 480 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5191/kart-royale/?quality=low', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await page.waitForFunction(() => window.__gameReady === true, { timeout: 180000 });
  assert.equal(await page.evaluate(() => window.__ctx.track.constructor.name), 'Track');
  assert.equal(await page.$$eval('[data-course]', (els) => els.length), 2);
  await page.click('[data-course="sunset"]');
  assert.ok(
    await page.$eval('.kr-s-title', (e) => e.classList.contains('on')),
    'Clicking the active course must not start a race',
  );
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 120000 }),
    page.click('[data-course="moon"]'),
  ]);
  await page.waitForFunction(() => window.__gameReady === true, { timeout: 180000 });
  assert.equal(await page.evaluate(() => window.__ctx.track.constructor.name), 'MoonTrack');
  assert.equal(
    await page.$eval('[data-course="moon"]', (e) => e.getAttribute('aria-pressed')),
    'true',
  );
  assert.equal(await page.$eval('.kr-sub', (e) => e.textContent), 'Månetårnet · Testbane');
  await page.screenshot({ path: '/tmp/moon-title.png' });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 120000 }),
    page.click('[data-course="sunset"]'),
  ]);
  await page.waitForFunction(() => window.__ctx?.track?.constructor.name === 'Track', {
    timeout: 90000,
  });
  assert.ok(!new URL(page.url()).searchParams.has('track'));
  assert.deepEqual(errors, []);
  console.log(
    'PASS original Sunset Bay, title course selection, Moon Tower startup and return to original',
  );
} finally {
  await browser.close();
  server.stop();
}
