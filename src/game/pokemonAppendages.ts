import { Bone, Float32BufferAttribute, Mesh, Quaternion, Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3 } from "three";
import type { Object3D } from "three";

export const normalizePokemonBone = (name: string) => name.replace(/^\d+[ _]?/, "").replace(/_\d+$/, "").replace(/_/g, "");

/** Golbat's source is an unskinned mesh. Keep the torso fixed and blend each
 * wing into a shoulder/tip chain. Geometry and skeleton belong to this instance. */
export function rigPokemonAppendages(scene: Object3D, number: number) {
  const owned: SkinnedMesh[] = [];
  if (number !== 42) return () => {};
  const meshes: Mesh[] = [];
  scene.traverse(object => { if (object instanceof Mesh && !(object instanceof SkinnedMesh)) meshes.push(object); });
  for (const mesh of meshes) {
    mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox!;
    // The small separate mouth mesh must remain rigid. Source coordinates: X span, Z up.
    if (bounds.max.x - bounds.min.x < 20) continue;
    const geometry = mesh.geometry.clone();
    const center = (bounds.min.x + bounds.max.x) / 2;
    const span = (bounds.max.x - bounds.min.x) / 2;
    const body = new Bone(); body.name = "GolbatBody";
    const bones = [body];
    for (const side of [1, -1]) {
      const shoulder = new Bone(); shoulder.name = side === 1 ? "LWing" : "RWing";
      shoulder.position.set(center + side * span * 0.15, 0, bounds.max.z * 0.65);
      const tip = new Bone(); tip.name = `${shoulder.name}Tip`;
      tip.position.set(side * span * 0.4, 0, span * 0.1);
      body.add(shoulder); shoulder.add(tip); bones.push(shoulder, tip);
    }
    const positions = geometry.getAttribute("position");
    const indices: number[] = [], weights: number[] = [];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i) - center;
      const distance = Math.abs(x) / span;
      const wingWeight = Math.max(0, Math.min(1, (distance - 0.16) / 0.13));
      const tipWeight = Math.max(0, Math.min(1, (distance - 0.5) / 0.35));
      const shoulderIndex = x >= 0 ? 1 : 3;
      indices.push(0, shoulderIndex, shoulderIndex + 1, 0);
      weights.push(1 - wingWeight, wingWeight * (1 - tipWeight), wingWeight * tipWeight, 0);
    }
    geometry.setAttribute("skinIndex", new Uint16BufferAttribute(indices, 4));
    geometry.setAttribute("skinWeight", new Float32BufferAttribute(weights, 4));
    const skinned = new SkinnedMesh(geometry, mesh.material);
    skinned.name = mesh.name;
    skinned.position.copy(mesh.position); skinned.quaternion.copy(mesh.quaternion); skinned.scale.copy(mesh.scale);
    skinned.castShadow = mesh.castShadow; skinned.receiveShadow = mesh.receiveShadow;
    skinned.add(body);
    mesh.parent!.add(skinned); mesh.removeFromParent();
    skinned.updateWorldMatrix(true, true);
    skinned.bind(new Skeleton(bones));
    // The animated wing span can exceed the bind-pose bounds.
    skinned.frustumCulled = false;
    owned.push(skinned);
  }
  return () => { for (const mesh of owned) { mesh.geometry.dispose(); mesh.skeleton.dispose(); } };
}

const wingRoots: Record<number, RegExp> = {
  6: /^[LR]Feeler1$/, 12: /^[LR]Feeler[AB]1$/, 15: /^[LR]Feeler[AB]$/,
  16: /^[LR]Arm$/, 17: /^[LR]Arm$/, 18: /^[LR]Arm$/, 21: /^[LR]Arm$/, 22: /^[LR]Arm$/,
  42: /^[LR]Wing$/, 49: /^[LR]Feeler[AB]1$/, 83: /^[LR]Arm$/,
  123: /^[LR]Feeler[AB]$/, 142: /^[LR]Arm$/, 144: /^[LR]Arm$/, 145: /^[LR]Shoulder$/,
  146: /^[LR]UpperArm$/,
};
const insectWings = new Set([12, 15, 49, 123]);
const curlBudget: Record<number, number> = { 4: 0.6, 5: 0.6, 6: 0.6, 26: 2.8, 37: 1.4, 38: 2.2, 52: 2.5, 53: 0.8, 144: 0.7, 151: 3.0 };

/** Return a rig-local axis: glTF bones do not share a common local orientation. */
function localAxis(bone: Object3D, world: Vector3) {
  return world.applyQuaternion(bone.getWorldQuaternion(new Quaternion()).invert()).normalize();
}

export function appendageMotion(bone: Object3D, number: number) {
  const name = normalizePokemonBone(bone.name);
  if (wingRoots[number]?.test(name) || (number === 42 && /^[LR]WingTip$/.test(name))) {
    const side = name.startsWith("L") ? 1 : -1;
    const insect = insectWings.has(number);
    const tip = name.endsWith("Tip");
    return { axis: localAxis(bone, new Vector3(0, insect ? 1 : 0, insect ? 0 : 1)),
      offset: side * (insect ? 0.35 : 0.2), amplitude: side * (tip ? 0.18 : insect ? 0.55 : 0.38),
      phase: tip ? -0.5 : /B1?$/.test(name) ? -0.15 : 0, frequency: insect ? 3 : 1 };
  }
  const tail = name.match(/^([LR]?Tail[A-Z]?)(\d*)$/i);
  if (!tail) return undefined;
  // Flame tongues are not separate tails; bending them independently detaches the flame silhouette.
  if ([4, 5, 6, 78].includes(number) && /Tail[A-Z]/i.test(name)) return undefined;
  const chain: Object3D[] = [bone];
  let next = bone.children.find(child => normalizePokemonBone(child.name).match(/^([LR]?Tail[A-Z]?)(\d*)$/i)?.[1] === tail[1]);
  while (next) {
    chain.push(next);
    next = next.children.find(child => normalizePokemonBone(child.name).match(/^([LR]?Tail[A-Z]?)(\d*)$/i)?.[1] === tail[1]);
  }
  const segment = Number(tail[2] || 1);
  const length = Math.max(segment + chain.length - 1, 1);
  const direction = chain.length > 1
    ? chain[1].getWorldPosition(new Vector3()).sub(bone.getWorldPosition(new Vector3())).normalize()
    : bone.getWorldPosition(new Vector3()).sub(bone.parent!.getWorldPosition(new Vector3())).normalize();
  const bendAxis = new Vector3().crossVectors(direction, new Vector3(0, 1, 0));
  if (bendAxis.lengthSq() < 0.01) bendAxis.set(1, 0, 0);
  const alreadyCurved = chain.length > 2 && direction.dot(chain[2].getWorldPosition(new Vector3()).sub(chain[1].getWorldPosition(new Vector3())).normalize()) < 0.95;
  return { axis: localAxis(bone, bendAxis), offset: alreadyCurved ? 0 : (curlBudget[number] ?? 0) / length - (number === 38 && segment === 1 ? 0.7 : 0),
    amplitude: Math.min(0.12, 0.5 / length), phase: -segment * 0.55 + (tail[1].charCodeAt(tail[1].length - 1) % 7) * 0.3, frequency: 1 };
}
