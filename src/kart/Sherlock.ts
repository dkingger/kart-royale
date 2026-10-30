import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let template: THREE.Group | null = null;

/** Load before construction so the character is included in the shadow/LOD bake. */
export async function loadSherlock() {
  if (template) return;
  const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/sherlock.glb`);
  template = gltf.scene;
}

export function createSherlock(): THREE.Group {
  if (!template) throw new Error('Sherlock must be loaded before constructing his kart');
  const figure = template.clone(true);
  const bounds = new THREE.Box3().setFromObject(figure);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 1.35 / size.y;
  // Fit the seated silhouette to the narrow cockpit and keep shoes inside the nose.
  figure.scale.set(scale * 0.9, scale, scale * 0.8);
  // Meshy centres the export; the existing driver rig is rooted at the hips.
  figure.position.set(-center.x * scale * 0.9, -bounds.min.y * scale - 0.22, -center.z * scale * 0.8 + 0.35);
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
  root.name = 'sherlock';
  root.add(figure);
  return root;
}
