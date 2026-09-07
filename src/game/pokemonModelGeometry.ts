import { BufferGeometry } from "three";

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
