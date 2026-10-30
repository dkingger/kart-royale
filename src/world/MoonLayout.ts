import * as THREE from 'three';

export const MOON_HALF_WIDTH = 6.5;
export const TOWER = { x: -100, z: -5, radius: 30, floors: 4, floorHeight: 12, baseY: 3 };

/** A driveable greybox inspired by the reference: spiral, high bridge, hairpin,
 * descending diagonal, then ground-level esses returning to the tower. */
export function moonCenterline() {
  const points = [
    new THREE.Vector3(-70, 3, 115),
    new THREE.Vector3(-70, 3, 65),
    new THREE.Vector3(-70, 3, 25),
  ];
  const steps = TOWER.floors * 64;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps,
      angle = -f * Math.PI * 2 * TOWER.floors;
    points.push(
      new THREE.Vector3(
        TOWER.x + Math.cos(angle) * TOWER.radius,
        TOWER.baseY + f * TOWER.floors * TOWER.floorHeight,
        TOWER.z + Math.sin(angle) * TOWER.radius,
      ),
    );
  }
  for (const [x, y, z] of [
    [-70, 51, -35],
    [-55, 51, -75],
    [0, 49, -110],
    [100, 44, -110],
    [145, 40, -95],
    [165, 35, -65],
    [155, 30, -35],
    [120, 25, -15],
    [70, 19, 10],
    [30, 12, 40],
    [-5, 5, 68],
    [-22, 3, 95],
    [0, 3, 125],
    [40, 3, 130],
    [65, 3, 108],
    [85, 3, 80],
    [112, 3, 78],
    [140, 3, 103],
    [132, 3, 145],
    [90, 3, 173],
    [20, 3, 185],
    [-45, 3, 170],
    [-70, 3, 145],
  ])
    points.push(new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  curve.arcLengthDivisions = 20000;
  curve.updateArcLengths();
  const length = curve.getLength();
  const count = Math.ceil(length / 0.9);
  const stations = curve.getSpacedPoints(count);
  stations.pop(); // no duplicate station at the closing seam
  return { stations, length, ds: length / count };
}
