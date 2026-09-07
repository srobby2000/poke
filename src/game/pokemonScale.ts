import { Vector3 } from "three";
import type { Object3D } from "three";

const lengthSpecies = new Set([23, 24, 95, 130, 147, 148]);

// Serpentine Pokédex measurements describe body length. Approximate the
// centerline with the longest connected bone path, preserving the model's pose.
export function pokemonMeasurement(number: number, scene: Object3D, size: Vector3): number {
  if (!lengthSpecies.has(number)) return Math.max(size.y, 0.001);
  let diameter = 0;
  function visit(node: Object3D): number {
    const distances = node.children.filter(child => child.type === "Bone").map(child =>
      visit(child) + node.getWorldPosition(new Vector3()).distanceTo(child.getWorldPosition(new Vector3()))
    ).sort((a, b) => b - a);
    diameter = Math.max(diameter, (distances[0] ?? 0) + (distances[1] ?? 0));
    return distances[0] ?? 0;
  }
  scene.traverse(node => { if (node.type === "Bone" && node.parent?.type !== "Bone") visit(node); });
  return Math.max(diameter, size.x, size.y, size.z, 0.001);
}

// Preserve relative size while compressing extremes for the stylized world.
export function pokemonDisplayHeight(heightM: number): number {
  return 1.1 * Math.pow(heightM, 0.35);
}
