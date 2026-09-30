import * as THREE from "three";

/** Procedural, untextured model; no images, video textures or remote assets. */
export function createKaabaModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = "KaabaGroup";
  const body = new THREE.MeshStandardMaterial({ color: 0x191c1d, roughness: 0.9, metalness: 0.05 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc8aa60, roughness: 0.55, metalness: 0.38 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x9e9a87, roughness: 1 });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  box(1.35, 0.08, 1.35, 0, 0.04, 0, stone);
  box(1.2, 1.3, 1.2, 0, 0.73, 0, body);
  // Four narrow strips preserve the dark roof and the solid box silhouette.
  box(1.22, 0.13, 0.02, 0, 1.13, 0.606, gold);
  box(1.22, 0.13, 0.02, 0, 1.13, -0.606, gold);
  box(0.02, 0.13, 1.2, 0.606, 1.13, 0, gold);
  box(0.02, 0.13, 1.2, -0.606, 1.13, 0, gold);
  box(0.25, 0.46, 0.025, 0.23, 0.52, 0.62, gold);
  // A fixed presentation angle exposes two faces. It never spins.
  group.rotation.y = -0.28;
  return group;
}

export function disposeSceneObjects(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse(object => {
    const renderable = object as THREE.Mesh;
    if (renderable.geometry) geometries.add(renderable.geometry);
    if (renderable.material) {
      for (const material of Array.isArray(renderable.material) ? renderable.material : [renderable.material]) materials.add(material);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  root.clear();
}
