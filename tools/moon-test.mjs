/** Lunar prototype correctness test. Synthetic 60 Hz physics, no FPS claims. */
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { startVite } from './vite-server.mjs';
const server = await startVite(5190);
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().endsWith('/favicon.ico'))
      errors.push(`${r.status()} ${r.url()}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource:'))
      errors.push(m.text());
    if (m.text().startsWith('[moon-test]')) console.log(m.text());
  });
  await page.goto('http://localhost:5190/kart-royale/?track=moon&quality=low', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await page.waitForFunction(() => window.__gameReady === true, { timeout: 180000 });
  const geometry = await page.evaluate(() => {
    const tr = window.__ctx.track;
    let maxHeightError = 0,
      maxProgressError = 0;
    for (let i = 0; i < 1600; i++) {
      const t = i / 1600,
        s = tr.sample(t),
        p = s.pos.clone();
      p.y += 0.7;
      const probe = tr.probe(p, t);
      maxHeightError = Math.max(maxHeightError, Math.abs(probe.y - s.pos.y));
      maxProgressError = Math.max(
        maxProgressError,
        Math.abs(((probe.t - t + 1.5) % 1) - 0.5) * tr.length,
      );
    }
    return {
      length: tr.length,
      height: tr.bounds.max.y,
      maxHeightError,
      maxProgressError,
      grid: tr.startGrid.length,
      moon: tr.group.name,
    };
  });
  assert.equal(geometry.moon, 'moon-track');
  assert.equal(geometry.grid, 8);
  assert.ok(geometry.maxHeightError < 0.05, JSON.stringify(geometry));
  assert.ok(geometry.maxProgressError < 0.15, JSON.stringify(geometry));
  console.log('PASS multi-floor projection', geometry);
  const race = await page.evaluate(async () => {
    window.requestAnimationFrame = () => 0;
    await new Promise((r) => setTimeout(r, 10));
    const ctx = window.__ctx,
      r = ctx.race;
    let collisions = 0,
      respawns = 0,
      maxY = 0;
    ctx.bus.on((e) => {
      if (e.type === 'collide') collisions++;
      if (e.type === 'ui' && e.name?.startsWith('respawn')) respawns++;
    });
    r.autoDrive = true;
    r.reset();
    for (let i = 0; i < 60 * 600; i++) {
      ctx.dt = 1 / 60;
      ctx.time += ctx.dt;
      ctx.frame++;
      r.update(ctx, ctx.dt);
      ctx.items.update(ctx, ctx.dt);
      for (const k of r.karts) {
        maxY = Math.max(maxY, k.position.y);
        if (![k.position.x, k.position.y, k.position.z, k.raceDistance].every(Number.isFinite))
          throw new Error('Non-finite kart');
      }
      if (i % 3600 === 0) {
        console.log(
          '[moon-test] ' +
            JSON.stringify({
              seconds: i / 60,
              lap: r.player.lap,
              t: r.player.t,
              y: r.player.position.y,
              respawns,
            }),
        );
        await new Promise((res) => setTimeout(res, 0));
      }
      if (r.karts.every((k) => k.finished)) break;
    }
    return {
      state: r.state,
      time: r.raceTime,
      laps: [...r.lapTimes],
      maxY,
      collisions,
      respawns,
      karts: r.karts.map((k) => ({
        name: k.stats.name,
        finished: k.finished,
        lap: k.lap,
        t: k.t,
        y: k.position.y,
        distance: k.raceDistance,
      })),
    };
  });
  console.log('RACE', JSON.stringify(race));
  assert.ok(
    race.karts.every((k) => k.finished),
    'Every AI must finish three laps',
  );
  assert.ok(race.maxY > 48, 'Race must reach floor four');
  assert.equal(race.laps.length, 3);
  assert.deepEqual(errors, []);
  // Static inspection frames, using the actual kart visual and actual chase rig.
  for (const [name, t] of [
    ['tower', 0.23],
    ['bridge', 0.62],
    ['ground', 0.85],
  ]) {
    await page.evaluate((t) => {
      const ctx = window.__ctx,
        k = ctx.race.player,
        s = ctx.track.sample(t);
      ctx.race.state = 2;
      k.finished = false;
      k.placeAt(s.pos.clone(), Math.atan2(s.tangent.x, s.tangent.z), t);
      k.position.y += 0.5;
      k.forward.set(s.tangent.x, 0, s.tangent.z).normalize();
      k.forwardSpeed = 20;
      k.velocity.copy(k.forward).multiplyScalar(20);
      k.updateVisuals(1 / 60);
      for (let i = 0; i < 180; i++) window.__camRig.lateUpdate(ctx, 1 / 60);
      const root = k.object.children[0]?.children[0];
      if (root) {
        root.visible = true;
        for (const n of root.userData.detailNodes ?? []) n.visible = true;
        if (root.userData.impostor) root.userData.impostor.visible = false;
      }
      k.object.visible = true;
      document.querySelector('.kr').style.display = 'none';
      document.getElementById('boot')?.remove();
      ctx.renderer.render(ctx.scene, ctx.camera);
    }, t);
    await page.screenshot({ path: `/tmp/moon-${name}.png` });
  }
  await page.evaluate(async () => {
    const T = await import('/kart-royale/node_modules/three/build/three.module.js');
    const ctx = window.__ctx;
    const camera = new T.PerspectiveCamera(48, 800 / 600, 0.1, 2000);
    camera.position.set(270, 320, 330);
    camera.lookAt(0, 16, 30);
    ctx.renderer.render(ctx.scene, camera);
  });
  await page.screenshot({ path: '/tmp/moon-overview.png' });
  console.log('PASS lunar three-lap race and inspection frames');
} finally {
  await browser.close();
  server.stop();
}
