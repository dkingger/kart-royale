/** Raycast the rendered road, independently of the placement/projection algorithm. */
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { startVite } from './vite-server.mjs';
const server = await startVite(5192);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (r) =>
    r.isNavigationRequest()
      ? r.respond({ status: 200, contentType: 'text/html', body: '<body></body>' })
      : r.continue(),
  );
  await page.goto('http://localhost:5192/kart-royale/?track=moon');
  const result = await page.evaluate(async () => {
    const T = await import('/kart-royale/node_modules/three/build/three.module.js');
    const { MoonTrack } = await import('/kart-royale/src/world/MoonTrack.ts');
    const track = new MoonTrack();
    const scene = new T.Scene();
    track.init({ scene });
    scene.updateMatrixWorld(true);
    const road = track.group.getObjectByName('moon-road');
    const supports = track.group.getObjectByName('moon-supports');
    const matrix = new T.Matrix4(),
      position = new T.Vector3(),
      scale = new T.Vector3(),
      q = new T.Quaternion();
    const ray = new T.Raycaster(),
      up = new T.Vector3(0, 1, 0),
      origin = new T.Vector3();
    const blocked = [];
    for (let i = 0; i < supports.count; i++) {
      supports.getMatrixAt(i, matrix);
      matrix.decompose(position, q, scale);
      const top = position.y + scale.y / 2;
      ray.far = top - 3; // exclude the deck this column is meant to support
      let hit = false;
      for (const [dx, dz] of [
        [0, 0],
        [-0.5, -0.5],
        [-0.5, 0.5],
        [0.5, -0.5],
        [0.5, 0.5],
      ]) {
        origin.set(position.x + dx, 0.05, position.z + dz);
        ray.set(origin, up);
        if (ray.intersectObject(road).length) {
          hit = true;
          break;
        }
      }
      if (hit) blocked.push({ index: i, x: position.x, z: position.z, top });
    }
    return { count: supports.count, blocked };
  });
  console.log(JSON.stringify(result));
  if (!process.argv.includes('--report')) {
    assert.ok(result.count > 0, 'Retain supports where they are safe');
    assert.equal(result.blocked.length, 0, 'No support may pass through a lower road deck');
    console.log('PASS lunar support clearance against rendered road');
  }
} finally {
  await browser.close();
  server.stop();
}
