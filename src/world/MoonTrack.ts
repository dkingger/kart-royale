import * as THREE from 'three';
import { Surface, type Ctx, type ITrack, type SurfaceProbe, type TrackSample } from '../types';
import { moonCenterline, MOON_HALF_WIDTH as HW, TOWER } from './MoonLayout';

const UP = new THREE.Vector3(0, 1, 0);
const wrap = (i: number, n: number) => ((i % n) + n) % n;
const frame = (): TrackSample => ({
  pos: new THREE.Vector3(),
  tangent: new THREE.Vector3(),
  normal: new THREE.Vector3(),
  binormal: new THREE.Vector3(),
  halfWidth: HW,
  bank: 0,
  distance: 0,
  t: 0,
});

/** Independent multi-level track. A progress-local search is essential: an XZ-only
 * nearest-road lookup would snap a wheel onto a different floor of the spiral. */
export class MoonTrack implements ITrack {
  readonly group = new THREE.Group();
  readonly startGrid: { pos: THREE.Vector3; yaw: number }[] = [];
  readonly checkpointCount = 40;
  readonly bounds = new THREE.Box3();
  readonly length: number;
  readonly stations: THREE.Vector3[];
  readonly ds: number;
  private probes: SurfaceProbe[] = Array.from({ length: 32 }, () => ({
    y: 0,
    normal: new THREE.Vector3(0, 1, 0),
    surface: Surface.Road,
    lateral: 0,
    t: 0,
    edgeRatio: 0,
  }));
  private probeAt = 0;
  private scratch = frame();
  private foot = new THREE.Vector3();
  private wall = { push: new THREE.Vector3(), normal: new THREE.Vector3() };
  private segment = 0;
  private segmentU = 0;

  constructor() {
    const data = moonCenterline();
    this.stations = data.stations;
    this.length = data.length;
    this.ds = data.ds;
    this.group.name = 'moon-track';
    for (const p of this.stations) this.bounds.expandByPoint(p);
    this.bounds.expandByScalar(HW + 2);
    for (let i = 0; i < 8; i++) {
      const s = this.sampleByDistance(-11 - (i >> 1) * 8 - (i % 2) * 4);
      this.startGrid.push({
        pos: s.pos.clone().addScaledVector(s.binormal, i % 2 ? 2.6 : -2.6),
        yaw: Math.atan2(s.tangent.x, s.tangent.z),
      });
    }
  }

  sample(t: number, out: TrackSample = frame()): TrackSample {
    t -= Math.floor(t);
    const n = this.stations.length,
      f = t * n,
      i = Math.floor(f),
      u = f - i;
    const a = this.stations[i],
      b = this.stations[(i + 1) % n];
    out.pos.copy(a).lerp(b, u);
    // Blend station tangents to avoid visible suspension steps between rings.
    const prev = this.stations[wrap(i - 1, n)],
      next = this.stations[(i + 2) % n];
    out.tangent
      .set(
        (b.x - prev.x) * (1 - u) + (next.x - a.x) * u,
        (b.y - prev.y) * (1 - u) + (next.y - a.y) * u,
        (b.z - prev.z) * (1 - u) + (next.z - a.z) * u,
      )
      .normalize();
    out.binormal.crossVectors(out.tangent, UP).normalize();
    out.normal.crossVectors(out.binormal, out.tangent).normalize();
    out.halfWidth = HW;
    out.bank = 0;
    out.t = t;
    out.distance = t * this.length;
    return out;
  }
  sampleByDistance(d: number, out?: TrackSample) {
    return this.sample(d / this.length, out);
  }
  checkpointAt(t: number) {
    return Math.floor((t - Math.floor(t)) * this.checkpointCount);
  }
  minimapPath(count: number) {
    return Array.from({ length: count }, (_, i) => {
      const s = this.sample(i / count);
      return { x: s.pos.x, z: s.pos.z };
    });
  }

  private score(p: THREE.Vector3, i: number): number {
    const a = this.stations[i],
      b = this.stations[(i + 1) % this.stations.length];
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const u = THREE.MathUtils.clamp(
      ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz),
      0,
      1,
    );
    const ex = p.x - a.x - dx * u,
      ez = p.z - a.z - dz * u,
      ey = p.y - a.y - (b.y - a.y) * u;
    return ex * ex + ez * ez + ey * ey * 0.5;
  }
  private nearest(p: THREE.Vector3, hint: number) {
    const n = this.stations.length;
    let best = 0,
      bestScore = Infinity;
    if (hint >= 0) {
      const center = Math.floor((hint - Math.floor(hint)) * n),
        radius = Math.ceil(38 / this.ds);
      for (let k = -radius; k <= radius; k += 4) {
        const i = wrap(center + k, n),
          d = this.score(p, i);
        if (d < bestScore) {
          bestScore = d;
          best = i;
        }
      }
    } else
      for (let i = 0; i < n; i += 4) {
        const d = this.score(p, i);
        if (d < bestScore) {
          bestScore = d;
          best = i;
        }
      }
    // Stale hints (e.g. teleporting for a test) must not pin a kart to a remote road.
    if (bestScore > 10000 && hint >= 0)
      for (let i = 0; i < n; i += 4) {
        const d = this.score(p, i);
        if (d < bestScore) {
          bestScore = d;
          best = i;
        }
      }
    const coarse = best;
    for (let k = -5; k <= 5; k++) {
      const i = wrap(coarse + k, n),
        d = this.score(p, i);
      if (d < bestScore) {
        bestScore = d;
        best = i;
      }
    }
    const a = this.stations[best],
      b = this.stations[(best + 1) % n],
      dx = b.x - a.x,
      dz = b.z - a.z;
    this.segment = best;
    this.segmentU = THREE.MathUtils.clamp(
      ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz),
      0,
      1,
    );
  }
  probe(p: THREE.Vector3, hint: number): SurfaceProbe {
    this.nearest(p, hint);
    const t = (this.segment + this.segmentU) / this.stations.length;
    const s = this.sample(t, this.scratch),
      out = this.probes[this.probeAt++ % this.probes.length];
    this.foot.copy(p).sub(s.pos);
    out.lateral = this.foot.dot(s.binormal);
    out.edgeRatio = Math.abs(out.lateral) / HW;
    out.t = t % 1;
    if (Math.abs(out.lateral) <= HW + 0.9) {
      out.y = s.pos.y;
      out.normal.copy(s.normal);
      out.surface = Surface.Road;
    } else {
      out.y = 0;
      out.normal.copy(UP);
      out.surface = Surface.Sand;
    }
    return out;
  }
  collideWalls(p: THREE.Vector3, radius: number, hint: number) {
    const pr = this.probe(p, hint),
      limit = HW + 0.5 - radius,
      excess = Math.abs(pr.lateral) - limit;
    if (excess <= 0 || excess > 4) return null;
    const s = this.sample(pr.t, this.scratch);
    if (p.y > s.pos.y + 2.4 || p.y < s.pos.y - 1.5) return null;
    this.wall.normal.copy(s.binormal).multiplyScalar(pr.lateral > 0 ? -1 : 1);
    this.wall.push.copy(this.wall.normal).multiplyScalar(excess);
    return this.wall;
  }

  init(ctx: Ctx) {
    ctx.scene.add(this.group);
    this.buildRoad();
    this.buildGround();
    this.buildTower();
    this.buildSigns();
  }

  private roadMaterial() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!,
      image = g.createImageData(128, 128);
    let seed = 47;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const v = 100 + ((seed >>> 24) % 25);
      image.data.set([v, v + 2, v + 5, 255], i);
    }
    g.putImageData(image, 0, 0);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.86,
      metalness: 0.12,
      side: THREE.DoubleSide,
    });
  }
  private ribbon(
    left: number,
    right: number,
    height: number,
    material: THREE.Material,
    name: string,
    vertical = 0,
  ) {
    const positions: number[] = [],
      uvs: number[] = [],
      indices: number[] = [],
      s = frame(),
      n = this.stations.length;
    for (let i = 0; i <= n; i++) {
      this.sample(i / n, s);
      for (const [offset, y] of [
        [left, height],
        [right, height + vertical],
      ]) {
        positions.push(
          s.pos.x + s.binormal.x * offset,
          s.pos.y + y,
          s.pos.z + s.binormal.z * offset,
        );
        uvs.push(offset / 4, (i * this.ds) / 4);
      }
      if (i < n) {
        const k = i * 2;
        indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }
  /** A ground-to-deck column must clear every lower road, not only its own edge.
   * Check all segments without a progress hint: other spiral floors are exactly
   * the geometry a local physics lookup deliberately excludes. Boot-time only. */
  private supportBlocksRoad(position: THREE.Vector3, top: number): boolean {
    const clearance = HW + 0.6 + Math.SQRT2 * 0.4 + 0.4;
    for (let i = 0; i < this.stations.length; i++) {
      const a = this.stations[i],
        b = this.stations[(i + 1) % this.stations.length];
      const dx = b.x - a.x,
        dz = b.z - a.z;
      const u = THREE.MathUtils.clamp(
        ((position.x - a.x) * dx + (position.z - a.z) * dz) / (dx * dx + dz * dz),
        0,
        1,
      );
      const roadY = a.y + (b.y - a.y) * u;
      if (roadY >= top - 3 || roadY < 0) continue;
      const ex = position.x - a.x - dx * u,
        ez = position.z - a.z - dz * u;
      if (ex * ex + ez * ez < clearance * clearance) return true;
    }
    return false;
  }

  private buildRoad() {
    this.ribbon(-HW - 0.6, HW + 0.6, 0, this.roadMaterial(), 'moon-road');
    const paint = new THREE.MeshStandardMaterial({
      color: 0xc7e5ed,
      roughness: 0.72,
      side: THREE.DoubleSide,
    });
    const wall = new THREE.MeshStandardMaterial({
      color: 0x49616f,
      roughness: 0.7,
      metalness: 0.45,
      side: THREE.DoubleSide,
    });
    for (const side of [-1, 1]) {
      const edge = side * HW;
      this.ribbon(edge - side * 0.32, edge, 0.025, paint, 'moon-edge');
      this.ribbon(side * (HW + 0.5), side * (HW + 0.5), 0, wall, 'moon-barrier', 1.05);
      this.ribbon(side * (HW + 0.28), side * (HW + 0.72), 1.05, paint, 'moon-rail');
    }
    const supports = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.8, 1, 0.8),
      wall,
      Math.ceil(this.length / 28) * 2,
    );
    const brackets = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.4, 0.7, 0.8),
      wall,
      supports.count,
    );
    const mat = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      p = new THREE.Vector3(),
      scale = new THREE.Vector3();
    let count = 0;
    for (let d = 0; d < this.length; d += 28) {
      const s = this.sampleByDistance(d);
      if (s.pos.y < 7) continue;
      for (const side of [-1, 1]) {
        // Outside the complete deck and rail, with space for the column's width.
        p.copy(s.pos).addScaledVector(s.binormal, side * (HW + 2));
        if (this.supportBlocksRoad(p, s.pos.y)) continue;
        p.y = s.pos.y / 2;
        scale.set(1, s.pos.y, 1);
        q.identity();
        mat.compose(p, q, scale);
        supports.setMatrixAt(count, mat);
        // Short cantilevers connect the outboard columns back underneath the deck.
        p.copy(s.pos).addScaledVector(s.binormal, side * (HW + 1));
        p.y -= 0.35;
        q.setFromAxisAngle(UP, Math.atan2(-s.binormal.z, s.binormal.x));
        scale.set(1, 1, 1);
        mat.compose(p, q, scale);
        brackets.setMatrixAt(count++, mat);
      }
    }
    supports.count = count;
    supports.name = 'moon-supports';
    supports.castShadow = true;
    brackets.count = count;
    brackets.name = 'moon-support-brackets';
    brackets.castShadow = true;
    this.group.add(supports, brackets);
  }
  private buildGround() {
    const material = new THREE.MeshStandardMaterial({ color: 0x747880, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    ground.name = 'moon-ground';
    this.group.add(ground);
    const craterMat = new THREE.MeshStandardMaterial({ color: 0x636871, roughness: 1 });
    for (const [x, z, r] of [
      [-190, 100, 25],
      [210, 100, 34],
      [15, -190, 28],
      [220, -160, 40],
      [-210, -135, 30],
    ]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 3, 6, 48), craterMat);
      rim.rotation.x = -Math.PI / 2;
      rim.position.set(x, 0.4, z);
      this.group.add(rim);
      const bowl = new THREE.Mesh(
        new THREE.CircleGeometry(r, 48),
        new THREE.MeshStandardMaterial({ color: 0x484c56, roughness: 1 }),
      );
      bowl.rotation.x = -Math.PI / 2;
      bowl.position.set(x, 0.01, z);
      this.group.add(bowl);
    }
  }
  private buildTower() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x53616d,
      roughness: 0.78,
      metalness: 0.28,
    });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(13, 15, 54, 32), mat);
    shaft.position.set(TOWER.x, 27, TOWER.z);
    shaft.castShadow = true;
    shaft.name = 'moon-tower-core';
    this.group.add(shaft);
    for (let floor = 1; floor <= 4; floor++) {
      const y = TOWER.baseY + floor * TOWER.floorHeight;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(13.2, 0.35, 5, 48),
        new THREE.MeshBasicMaterial({ color: 0x72ddf2 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(TOWER.x, y, TOWER.z);
      this.group.add(ring);
      const label = this.sign(`LEVEL ${floor}`, 0x14202a, 0xb6ebf2);
      label.position.set(TOWER.x + 15, y + 2, TOWER.z);
      label.rotation.y = Math.PI / 2;
      this.group.add(label);
    }
  }
  private sign(text: string, background: number, color: number) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = `#${background.toString(16).padStart(6, '0')}`;
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 60px sans-serif';
    g.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(12, 3),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
    );
  }
  private buildSigns() {
    const start = this.sample(0);
    const sign = this.sign('MOON TOWER', 0x173245, 0xe2f4f5);
    sign.position.copy(start.pos).addScaledVector(UP, 5.5);
    sign.rotation.y = Math.atan2(-start.tangent.x, -start.tangent.z);
    this.group.add(sign);
    const checker = document.createElement('canvas');
    checker.width = 64;
    checker.height = 16;
    const g = checker.getContext('2d')!;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 8; x++) {
        g.fillStyle = (x + y) % 2 ? '#29303c' : '#e2e5e6';
        g.fillRect(x * 8, y * 8, 8, 8);
      }
    const tex = new THREE.CanvasTexture(checker);
    tex.colorSpace = THREE.SRGBColorSpace;
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(HW * 2, 2),
      new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }),
    );
    line.position.copy(start.pos).addScaledVector(UP, 0.03);
    line.rotation.set(-Math.PI / 2, 0, -Math.atan2(start.tangent.x, start.tangent.z));
    this.group.add(line);
  }
}
