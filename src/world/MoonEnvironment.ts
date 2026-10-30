import * as THREE from 'three';
import type { Ctx, System } from '../types';

/** Deliberately inexpensive lunar test setting, independent of Sunset Bay's sky. */
export class MoonEnvironment implements System {
  private environment: THREE.WebGLRenderTarget | null = null;
  init(ctx: Ctx) {
    ctx.scene.background = new THREE.Color(0x050912);
    ctx.scene.fog = new THREE.FogExp2(0x18202b, 0.00035);
    const sun = new THREE.DirectionalLight(0xe7efff, 3.4);
    sun.position.set(-160, 240, -100);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -260,
      right: 260,
      top: 260,
      bottom: -260,
      near: 1,
      far: 900,
    });
    sun.shadow.bias = -0.0003;
    ctx.scene.add(sun, sun.target);
    ctx.sun = sun;
    ctx.sunDirection.copy(sun.position).normalize();
    ctx.scene.add(new THREE.HemisphereLight(0xb8cdeb, 0x575762, 1.3));
    const stars: number[] = [];
    let seed = 413;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      return (seed >>> 0) / 4294967296;
    };
    for (let i = 0; i < 900; i++) {
      const y = random() * 0.97 + 0.02,
        a = random() * Math.PI * 2,
        r = Math.sqrt(1 - y * y);
      stars.push(Math.cos(a) * r * 1200, y * 1200, Math.sin(a) * r * 1200);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xe0e9f9, size: 1.5, sizeAttenuation: true, fog: false }),
    );
    points.name = 'moon-stars';
    ctx.scene.add(points);
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(42, 32, 20),
      new THREE.MeshStandardMaterial({
        color: 0x3c86a7,
        emissive: 0x123653,
        emissiveIntensity: 0.4,
        roughness: 0.9,
      }),
    );
    earth.position.set(250, 170, -450);
    earth.name = 'moon-earth';
    ctx.scene.add(earth);
    const ring = new THREE.Mesh(
      new THREE.SphereGeometry(43, 32, 20),
      new THREE.MeshBasicMaterial({
        color: 0xa8dff5,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
      }),
    );
    earth.add(ring);
    this.refreshEnvironment(ctx);
  }
  refreshEnvironment(ctx: Ctx) {
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x596777);
    envScene.add(new THREE.HemisphereLight(0xc4d4e7, 0x777983, 2));
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(100, 1, 100),
      new THREE.MeshBasicMaterial({ color: 0x777d86 }),
    );
    floor.position.y = -10;
    envScene.add(floor);
    const pmrem = new THREE.PMREMGenerator(ctx.renderer);
    const next = pmrem.fromScene(envScene, 0.08, 0.1, 300);
    this.environment?.dispose();
    this.environment = next;
    ctx.envMap = next.texture;
    ctx.scene.environment = next.texture;
    ctx.scene.environmentIntensity = 0.7;
    pmrem.dispose();
    floor.geometry.dispose();
    (floor.material as THREE.Material).dispose();
  }
  dispose() {
    this.environment?.dispose();
  }
}
