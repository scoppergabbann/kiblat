import * as THREE from "three";
import { AR_CONFIG as C, directionFactorToTargetX } from "./arMath.ts";

export function createNavigationArrow(): THREE.BufferGeometry {
  // A flat filled chevron, pointing along local -Z. All navigation arrows share it.
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.55); shape.lineTo(0.46, -0.05); shape.lineTo(0.26, -0.23);
  shape.lineTo(0, 0.12); shape.lineTo(-0.26, -0.23); shape.lineTo(-0.46, -0.05); shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Reusable in-place flat ribbon buffers. No TubeGeometry and no per-frame meshes. */
export function createQiblaRoad() {
  const group = new THREE.Group();
  group.name = "QiblaRoad";
  const points = [0, 1, 2, 3, 4].map(i => new THREE.Vector3(0, C.roadY, -C.roadLength * i / 4));
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  curve.arcLengthDivisions = 100;
  const center = new THREE.Vector3(), tangent = new THREE.Vector3(), side = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  function ribbon(offset: number, width: number, material: THREE.Material, name: string) {
    const geometry = new THREE.BufferGeometry();
    const position = new THREE.BufferAttribute(new Float32Array((C.roadSegments + 1) * 6), 3).setUsage(THREE.DynamicDrawUsage);
    const indices: number[] = [];
    for (let i = 0; i < C.roadSegments; i++) {
      const n = i * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
    geometry.setAttribute("position", position); geometry.setIndex(indices);
    const mesh = new THREE.Mesh(geometry, material); mesh.name = name;
    mesh.frustumCulled = false; group.add(mesh);
    return { position, offset, width };
  }
  const roadMaterial = new THREE.MeshBasicMaterial({ color: 0x628f79, transparent: true, opacity: C.roadOpacity, side: THREE.DoubleSide, depthWrite: false });
  const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xd0ddbb, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
  const bands = [
    ribbon(0, C.roadWidth, roadMaterial, "RoadMesh"),
    ribbon(-C.roadWidth / 2, C.edgeWidth, edgeMaterial, "LeftEdge"),
    ribbon(C.roadWidth / 2, C.edgeWidth, edgeMaterial, "RightEdge"),
  ];
  group.children[0].renderOrder = 1; group.children[1].renderOrder = 2; group.children[2].renderOrder = 2;
  const arrows = new THREE.Group(); arrows.name = "NavigationArrows";
  const arrowGeometry = createNavigationArrow();
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xe4edcf, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < C.arrowCount; i++) {
    const mesh = new THREE.Mesh(arrowGeometry, arrowMaterial); mesh.scale.setScalar(C.arrowScale); mesh.renderOrder = 3;
    arrows.add(mesh);
  }
  group.add(arrows);

  function update(factor: number, end: number) {
    const targetX = directionFactorToTargetX(factor);
    const weights = [0, 0.04, 0.28, 0.68, 1];
    for (let i = 0; i < points.length; i++) points[i].x = targetX * weights[i];
    curve.updateArcLengths();
    for (let i = 0; i <= C.roadSegments; i++) {
      const t = i / C.roadSegments * end;
      curve.getPointAt(t, center); curve.getTangentAt(t, tangent);
      side.crossVectors(tangent, up).normalize();
      for (const band of bands) {
        const left = band.offset - band.width / 2, right = band.offset + band.width / 2;
        const lift = band.offset === 0 ? 0 : 0.008;
        band.position.setXYZ(i * 2, center.x + side.x * left, center.y + lift, center.z + side.z * left);
        band.position.setXYZ(i * 2 + 1, center.x + side.x * right, center.y + lift, center.z + side.z * right);
      }
    }
    for (const band of bands) band.position.needsUpdate = true;
  }

  function animateArrows(phase: number, end: number) {
    for (let i = 0; i < arrows.children.length; i++) {
      const progress = (i / C.arrowCount + phase) % 1;
      const t = 0.045 + progress * Math.max(0, end - 0.13);
      const arrow = arrows.children[i];
      curve.getPointAt(t, arrow.position); arrow.position.y += 0.025;
      curve.getTangentAt(t, tangent);
      arrow.rotation.y = Math.atan2(-tangent.x, -tangent.z);
    }
  }
  update(0, 1); animateArrows(0, 1);
  return { group, curve, update, animateArrows, roadMaterial, edgeMaterial };
}
