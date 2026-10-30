import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface CharacterSpec {
  file: string;
  height: number;
  width: number;
  depth: number;
  bottom: number;
  forward: number;
}

const characters: Record<string, CharacterSpec> = {
  Sherlock: { file: 'sherlock', height: 1.35, width: 0.9, depth: 0.8, bottom: -0.22, forward: 0.35 },
  Frankenstein: { file: 'frankenstein', height: 1.40, width: 0.8, depth: 0.65, bottom: -0.22, forward: 0.32 },
};
const templates = new Map<string, THREE.Group>();

/** Load before construction so the character is included in the shadow/LOD bake. */
export async function loadCharacters() {
  await Promise.all(Object.entries(characters).map(async ([name, spec]) => {
    if (templates.has(name)) return;
    const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/${spec.file}.glb`);
    templates.set(name, gltf.scene);
  }));
}

/** Unknown roster entries retain the original procedural driver. */
export function createCharacter(name: string): THREE.Group | null {
  const spec = characters[name];
  if (!spec) return null;
  const template = templates.get(name);
  if (!template) throw new Error(`${name} must be loaded before constructing the kart`);
  const figure = template.clone(true);
  const bounds = new THREE.Box3().setFromObject(figure);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = spec.height / size.y;
  // Fit the seated silhouette to the narrow cockpit and keep shoes inside the nose.
  figure.scale.set(scale * spec.width, scale, scale * spec.depth);
  // Meshy centres the export; the existing driver rig is rooted at the hips.
  figure.position.set(-center.x * scale * spec.width, -bounds.min.y * scale + spec.bottom, -center.z * scale * spec.depth + spec.forward);
  figure.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) material.envMapIntensity = 0.8;
      }
    }
  });
  const root = new THREE.Group();
  root.name = spec.file;
  root.add(figure);
  return root;
}
