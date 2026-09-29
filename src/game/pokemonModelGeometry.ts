import { Box3, BufferGeometry, Mesh, SkinnedMesh, Vector3 } from "three";
import type { Object3D } from "three";

/** Some source wings contain coincident front/back triangles. Keep one surface
 * and render it double-sided to prevent flickering and broken wing patterns. */
export function removeCoincidentTriangles(source: BufferGeometry): BufferGeometry {
  const geometry = source.clone();
  const index = geometry.getIndex();
  const positions = geometry.getAttribute("position");
  if (!index || !positions) return geometry;
  const seen = new Set<string>();
  const clean: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    const vertices = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    const key = vertices.map(v => [positions.getX(v), positions.getY(v), positions.getZ(v)].map(n => n.toFixed(5)).join(",")).sort().join(";");
    if (!seen.has(key)) { seen.add(key); clean.push(...vertices); }
  }
  geometry.setIndex(clean);
  return geometry;
}

/** Transparent flame sheets (Charizard's tail, Rapidash's mane/tail/hooves). */
export function isFlameMaterial(number: number, name: string) {
  return (number === 6 && ["Material_15", "Material_16"].includes(name)) || (number === 78 && /FireCore|FireSten/.test(name));
}

/** The saddle point on a mount's back, in the scene's own coordinates: the dip in the top of
 * the body (flames excluded) between the hind and front legs, where a rider sits. Fur ruffs
 * and rumps rise on either side of it. Call before animation starts. */
export function mountSeat(scene: Object3D, number: number) {
  // Force every bone's world matrix: skinned vertices below are read from them.
  scene.updateMatrixWorld(true);
  const joint = (pattern: RegExp) => { let found: Vector3 | undefined; scene.traverse(node => { if (!found && node.type === "Bone" && pattern.test(node.name.replace(/^\d+[ _]?/, "").replace(/_\d+$/, ""))) found = node.getWorldPosition(new Vector3()); }); return found; };
  const points: Vector3[] = [];
  scene.traverse(node => {
    if (!(node instanceof Mesh)) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    if (materials.some(material => isFlameMaterial(number, material.name))) return;
    const positions = node.geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const vertex = new Vector3().fromBufferAttribute(positions, i);
      if (node instanceof SkinnedMesh) node.applyBoneTransform(i, vertex);
      points.push(vertex.applyMatrix4(node.matrixWorld));
    }
  });
  const bounds = new Box3().setFromPoints(points);
  const size = bounds.getSize(new Vector3()), centre = bounds.getCenter(new Vector3());
  const hind = joint(/^[LR]Thigh$/)?.z ?? centre.z - size.z * 0.2, fore = joint(/^[LR]Arm$/)?.z ?? centre.z + size.z * 0.2;
  const spine = points.filter(p => Math.abs(p.x - centre.x) < size.x * 0.15);
  const step = (fore - hind) / 12;
  let best = { z: (hind + fore) / 2, y: Infinity };
  for (let k = 0; k <= 12; k++) {
    const z = hind + step * k;
    const tops = spine.filter(p => Math.abs(p.z - z) < Math.abs(step) * 0.75).map(p => p.y).sort((a, b) => a - b);
    // The 90th percentile ignores single fur spikes along the ridge.
    const y = tops.length ? tops[Math.floor(tops.length * 0.9)] : Infinity;
    if (y < best.y) best = { z, y };
  }
  return new Vector3(centre.x, Number.isFinite(best.y) ? best.y : bounds.max.y, best.z);
}
