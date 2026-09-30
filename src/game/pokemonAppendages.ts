import { Box3, Bone, Float32BufferAttribute, Mesh, Quaternion, Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3 } from "three";
import type { Object3D } from "three";

export const normalizePokemonBone = (name: string) => name.replace(/^\d+[ _]?/, "").replace(/^Bip\d+_?(?=[A-Z])/, "").replace(/_\d+$/, "")
  // Dragonite uses descriptive exporter names instead of the short Kanto rig names.
  .replace(/^(left|right)_leg_01$/i, (_, side: string) => `${side.toLowerCase() === "left" ? "L" : "R"}Thigh`)
  .replace(/^(left|right)_leg_02$/i, (_, side: string) => `${side.toLowerCase() === "left" ? "L" : "R"}Leg`)
  .replace(/^(left|right)_arm_01$/i, (_, side: string) => `${side.toLowerCase() === "left" ? "L" : "R"}Arm`)
  .replace(/^(left|right)_arm_02$/i, (_, side: string) => `${side.toLowerCase() === "left" ? "L" : "R"}ForeArm`)
  .replace(/^left_/i, "L").replace(/^right_/i, "R").replace(/_/g, "")
  .replace(/^(L|R)(wing|hand|foot|shoulder)/i, (_, side: string, part: string) => side + part[0].toUpperCase() + part.slice(1));

/** Golbat's source is an unskinned mesh. Keep the torso fixed and blend each
 * wing into a shoulder/tip chain. Geometry and skeleton belong to this instance. */
export function rigPokemonAppendages(scene: Object3D, number: number) {
  const owned: SkinnedMesh[] = [];
  poseCrawlerRest(scene, number);
  poseSerpentRest(scene, number);
  poseTailCurl(scene, number);
  attachHeldItems(scene, number);
  if (rigidQuadrupeds.has(number)) return rigRigidQuadruped(scene);
  if (partRigs[number]) return rigRigidParts(scene, number);
  if (number !== 42) return rigRigidBody(scene, number);
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

/** Caterpie and Weedle were exported upright on their tail. Put their body along
 * the ground and counter-rotate the head before measuring the display bounds. */
function poseCrawlerRest(scene: Object3D, number: number) {
  if (number !== 10 && number !== 13) return;
  scene.updateWorldMatrix(true, true);
  const bones: Object3D[] = [];
  scene.traverse(node => { if ((node as Bone).isBone) bones.push(node); });
  const head = bones.find(bone => normalizePokemonBone(bone.name) === "Head");
  if (!head) return;
  // Hips and spine are separate root bones in these exports; rotate their common scene.
  scene.quaternion.multiply(new Quaternion().setFromAxisAngle(localAxis(scene, new Vector3(1, 0, 0)), Math.PI / 2));
  scene.updateWorldMatrix(true, true);
  head.quaternion.multiply(new Quaternion().setFromAxisAngle(localAxis(head, new Vector3(1, 0, 0)), -Math.PI / 2));
  scene.updateWorldMatrix(true, true);
}

const wingRoots: Record<number, RegExp> = {
  6: /^[LR]Feeler1$/, 12: /^[LR]Feeler[AB]1$/, 15: /^[LR]Feeler[AB]$/,
  16: /^[LR]Arm$/, 17: /^[LR]Arm$/, 18: /^[LR]Arm$/, 21: /^[LR]Arm$/, 22: /^[LR]Arm$/,
  42: /^[LR]Wing$/, 49: /^[LR]Feeler[AB]1$/, 83: /^[LR]Arm$/,
  123: /^[LR]Feeler[AB]$/, 142: /^[LR]Arm$/, 144: /^[LR]Arm$/, 145: /^[LR]Shoulder$/,
  146: /^[LR]UpperArm$/, 149: /^[LR]Wing01$/,
};
export const insectWings = new Set([12, 15, 49, 123]);
/** Whether this (normalized) bone is where a wing attaches to the body. */
export const isWingRoot = (name: string, number: number) => !!wingRoots[number]?.test(name);
const curlBudget: Record<number, number> = { 4: 0.6, 5: 0.6, 6: 0.6, 26: 2.8, 37: 1.4, 38: 2.2, 52: 2.5, 53: 0.8, 144: 0.7, 151: 3.0 };

/** Return a rig-local axis: glTF bones do not share a common local orientation.
 * `axis` is in the model's own frame; `frame` turns that frame into world space. */
function localAxis(bone: Object3D, axis: Vector3, frame = new Quaternion()) {
  return axis.applyQuaternion(frame).applyQuaternion(bone.getWorldQuaternion(new Quaternion()).invert()).normalize();
}

// Tails that sway side to side (a lizard's), rather than bobbing up and down. Their resting curl
// is baked into the rest pose (poseTailCurl), so the swing axis is free to be the vertical.
const swayingTails = new Set([4, 5, 6]);

export function appendageMotion(bone: Object3D, number: number, frame = new Quaternion()) {
  // Generated rigs store each joint's swing in world space when they build it.
  const swing = bone.userData.swing as Swing | undefined;
  if (swing) return { kind: "part" as const, axis: localAxis(bone, new Vector3(...swing.axis), frame), offset: 0, amplitude: swing.amplitude, phase: swing.phase, frequency: swing.frequency };
  const name = normalizePokemonBone(bone.name);
  if (wingRoots[number]?.test(name) || (number === 42 && /^[LR]WingTip$/.test(name))) {
    const side = name.startsWith("L") ? 1 : -1;
    const insect = insectWings.has(number);
    const tip = name.endsWith("Tip");
    return { kind: "wing" as const, axis: localAxis(bone, new Vector3(0, insect ? 1 : 0, insect ? 0 : 1), frame),
      offset: side * (insect ? 0.35 : 0.2), amplitude: side * (tip ? 0.18 : insect ? 0.55 : 0.38),
      // Zubat's authored flight beats ~3 times a second. Birds ~2.2, insects ~3.3 (real insect
      // wings are a blur, far faster than reads on screen).
      phase: tip ? -0.5 : /B1?$/.test(name) ? -0.15 : 0, frequency: insect ? 3.5 : 2.2 };
  }
  const motion = tailMotion(bone, number, frame);
  if (!motion || !swayingTails.has(number)) return motion;
  // Side to side about the body's vertical, in a wave that travels to the tip and grows there.
  const segment = Number(normalizePokemonBone(bone.name).match(/(\d+)$/)?.[1] ?? 1);
  return { ...motion, axis: localAxis(bone, new Vector3(0, 1, 0), frame), offset: 0, amplitude: 0.05 + 0.012 * segment, phase: -segment * 0.5 };
}

/** Bake a swaying tail's resting curl into its rest pose, so its swing can be purely sideways. */
function poseTailCurl(scene: Object3D, number: number) {
  if (!swayingTails.has(number)) return;
  scene.updateWorldMatrix(true, true);
  const frame = scene.getWorldQuaternion(new Quaternion());
  const curls: { bone: Object3D; axis: Vector3; angle: number }[] = [];
  scene.traverse(node => {
    if (!(node as Bone).isBone) return;
    const motion = tailMotion(node, number, frame);
    if (motion?.offset) curls.push({ bone: node, axis: motion.axis, angle: motion.offset });
  });
  for (const { bone, axis, angle } of curls) bone.quaternion.multiply(new Quaternion().setFromAxisAngle(axis, angle));
  scene.updateWorldMatrix(true, true);
}

function tailMotion(bone: Object3D, number: number, frame: Quaternion) {
  const toFrame = frame.clone().invert();
  const name = normalizePokemonBone(bone.name);
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
  direction.applyQuaternion(toFrame);
  const bendAxis = new Vector3().crossVectors(direction, new Vector3(0, 1, 0));
  if (bendAxis.lengthSq() < 0.01) bendAxis.set(1, 0, 0);
  const alreadyCurved = chain.length > 2 && direction.dot(chain[2].getWorldPosition(new Vector3()).sub(chain[1].getWorldPosition(new Vector3())).applyQuaternion(toFrame).normalize()) < 0.95;
  return { kind: "tail" as const, axis: localAxis(bone, bendAxis, frame), offset: alreadyCurved ? 0 : (curlBudget[number] ?? 0) / length - (number === 38 && segment === 1 ? 0.7 : 0),
    amplitude: Math.min(0.12, 0.5 / length), phase: -segment * 0.55 + (tail[1].charCodeAt(tail[1].length - 1) % 7) * 0.3, frequency: 1 };
}


type Influence = { index: number; weight: number };
const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

/** Replace a rigid mesh with a skinned copy, keeping the four strongest influences per vertex. */
function bindRigidSkin(mesh: Mesh, geometry: Mesh["geometry"], root: Bone, bones: Bone[], influences: (vertex: number) => Influence[]) {
  const count = geometry.getAttribute("position").count;
  const indices: number[] = [], weights: number[] = [];
  for (let i = 0; i < count; i++) {
    const chosen = influences(i).sort((a, b) => b.weight - a.weight).slice(0, 4);
    while (chosen.length < 4) chosen.push({ index: 0, weight: 0 });
    const total = chosen.reduce((sum, c) => sum + c.weight, 0) || 1;
    if (!chosen[0].weight) chosen[0].weight = 1;
    indices.push(...chosen.map(c => c.index)); weights.push(...chosen.map(c => c.weight / total));
  }
  geometry.setAttribute("skinIndex", new Uint16BufferAttribute(indices, 4));
  geometry.setAttribute("skinWeight", new Float32BufferAttribute(weights, 4));
  const skinned = new SkinnedMesh(geometry, mesh.material);
  skinned.name = mesh.name;
  skinned.position.copy(mesh.position); skinned.quaternion.copy(mesh.quaternion); skinned.scale.copy(mesh.scale);
  skinned.castShadow = mesh.castShadow; skinned.receiveShadow = mesh.receiveShadow;
  skinned.add(root);
  mesh.parent!.add(skinned); mesh.removeFromParent();
  skinned.updateWorldMatrix(true, true);
  skinned.bind(new Skeleton(bones));
  // Swinging limbs can leave the bind-pose bounds.
  skinned.frustumCulled = false;
  return skinned;
}

// These rigid humanoid assets have no skin at all. Torso/neck joints add
// breathing and follow-through; T-pose assets also get blended arm joints.
const rigidHumanoids = new Set([35, 96, 97, 106, 108, 113, 124, 125, 126, 141, 143]);
// Shoulder height, where the arm starts across the half-width, and the vertical reach of the arm.
const rigidArms: Record<number, { y: number; inner?: number; band?: number }> = {
  96: { y: 0.65 }, 97: { y: 0.7 }, 106: { y: 0.7 }, 124: { y: 0.56 }, 125: { y: 0.66 }, 126: { y: 0.66 },
  141: { y: 0.72, inner: 0.13, band: 0.3 }, 143: { y: 0.55, inner: 0.3, band: 0.14 },
};
export function rigRigidBody(scene: Object3D, number: number) {
  if (!rigidHumanoids.has(number)) return () => {};
  const meshes: Mesh[] = [];
  scene.updateWorldMatrix(true, true);
  scene.traverse(node => { if (node instanceof Mesh && !(node instanceof SkinnedMesh)) meshes.push(node); });
  const bounds = new Box3().setFromObject(scene);
  const height = bounds.max.y - bounds.min.y;
  if (!meshes.length || height < 0.00001) return () => {};
  const center = bounds.getCenter(new Vector3());
  const width = bounds.max.x - bounds.min.x;
  const arms = rigidArms[number];
  const shoulderHeight = arms?.y;
  const inner = arms?.inner ?? 0.15, band = arms?.band ?? 0.1;
  const owned: SkinnedMesh[] = [];
  for (const mesh of meshes) {
    const geometry = mesh.geometry.clone();
    const core = new Bone(); core.name = "BodyCore";
    const spine = new Bone(); spine.name = "Spine1";
    const head = new Bone(); head.name = "Head";
    spine.position.copy(mesh.worldToLocal(new Vector3(center.x, bounds.min.y + height * 0.42, center.z)));
    head.position.copy(mesh.worldToLocal(new Vector3(center.x, bounds.min.y + height * 0.7, center.z))).sub(spine.position);
    core.add(spine); spine.add(head);
    const bones = [core, spine, head];
    if (shoulderHeight) {
      for (const side of [1, -1]) {
        const arm = new Bone(); arm.name = side > 0 ? "LArm" : "RArm";
        const elbow = new Bone(); elbow.name = side > 0 ? "LForeArm" : "RForeArm";
        const shoulder = mesh.worldToLocal(new Vector3(center.x + side * width * (inner + 0.02), bounds.min.y + height * shoulderHeight, center.z));
        const forearm = mesh.worldToLocal(new Vector3(center.x + side * width * (inner + 0.18), bounds.min.y + height * shoulderHeight, center.z));
        arm.position.copy(shoulder).sub(spine.position);
        elbow.position.copy(forearm).sub(shoulder);
        spine.add(arm); arm.add(elbow); bones.push(arm, elbow);
      }
    }
    const vertex = new Vector3();
    owned.push(bindRigidSkin(mesh, geometry, core, bones, i => {
      vertex.fromBufferAttribute(geometry.getAttribute("position"), i);
      mesh.localToWorld(vertex);
      const y = (vertex.y - bounds.min.y) / height;
      const torso = smooth((y - 0.25) / 0.28);
      const neck = smooth((y - 0.65) / 0.18);
      const candidates = [{ index: 0, weight: 1 - torso }, { index: 1, weight: torso * (1 - neck) }, { index: 2, weight: torso * neck }];
      if (shoulderHeight) {
        const x = (vertex.x - center.x) / width;
        const armWeight = smooth((Math.abs(x) - inner) / 0.1) * (1 - smooth((Math.abs(y - shoulderHeight) - band) / 0.1));
        const elbowWeight = smooth((Math.abs(x) - inner - 0.15) / 0.1);
        for (const candidate of candidates) candidate.weight *= 1 - armWeight;
        const index = x > 0 ? 3 : 5;
        candidates.push({ index, weight: armWeight * (1 - elbowWeight) }, { index: index + 1, weight: armWeight * elbowWeight });
      }
      return candidates;
    }));
  }
  return () => { for (const mesh of owned) { mesh.geometry.dispose(); mesh.skeleton.dispose(); } };
}


/** Give straight bind-pose snakes a curved rest silhouette before measuring
 * their display bounds. Changes affect the cloned rig only, never skin binds. */
function poseSerpentRest(scene: Object3D, number: number) {
  if (![23, 24, 147, 148].includes(number)) return;
  scene.updateWorldMatrix(true, true);
  const tail: Object3D[] = [];
  scene.traverse(bone => { if (bone.type === "Bone" && /^Tail\d+$/.test(normalizePokemonBone(bone.name))) tail.push(bone); });
  const rotations = tail.map(bone => ({ bone, axis: localAxis(bone, new Vector3(1, 0, 0)) }));
  for (const { bone, axis } of rotations) bone.quaternion.multiply(new Quaternion().setFromAxisAngle(axis, 2.8 / tail.length));
  scene.updateWorldMatrix(true, true);
}

// Rigid four-legged assets. Models face +Z; legs are found from the geometry.
const rigidQuadrupeds = new Set([77, 111, 128]);
const percentile = (values: number[], p: number) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0; };

/** Hip/knee chains for each leg, chest-neck-head and a two-joint tail, weighted from
 * where each vertex sits relative to the belly line and the four leg columns. */
export function rigRigidQuadruped(scene: Object3D) {
  const meshes: Mesh[] = [];
  scene.updateWorldMatrix(true, true);
  scene.traverse(node => { if (node instanceof Mesh && !(node instanceof SkinnedMesh)) meshes.push(node); });
  const bounds = new Box3().setFromObject(scene);
  const height = bounds.max.y - bounds.min.y;
  if (!meshes.length || height < 0.00001) return () => {};
  const points: Vector3[] = [];
  for (const mesh of meshes) {
    const positions = mesh.geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) points.push(mesh.localToWorld(new Vector3().fromBufferAttribute(positions, i)));
  }
  const center = bounds.getCenter(new Vector3());
  const width = bounds.max.x - bounds.min.x;
  const floor = bounds.min.y;
  // Hooves: the lowest slice of the model, split into four quadrants around its middle.
  const feet = points.filter(p => p.y < floor + height * 0.05);
  const midZ = percentile(feet.map(p => p.z), 0.5);
  const legs = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([side, front]) => {
    const hoof = feet.filter(p => Math.sign(p.x - center.x || 1) === side && Math.sign(p.z - midZ || 1) === front);
    // Medians ignore low-hanging parts (Rhyhorn's jaw) that share the floor slice.
    const foot = new Vector3(percentile(hoof.map(p => p.x), 0.5), 0, percentile(hoof.map(p => p.z), 0.5));
    const radius = Math.max(percentile(hoof.map(p => Math.hypot(p.x - foot.x, p.z - foot.z)), 0.8) * 1.4, width * 0.06);
    return { side, front, foot, radius };
  });
  const frontZ = (legs[0].foot.z + legs[1].foot.z) / 2, rearZ = (legs[2].foot.z + legs[3].foot.z) / 2;
  // The belly is the underside of the body between the legs, along the centre line.
  const underside = points.filter(p => Math.abs(p.x - center.x) < width * 0.1 && p.z < frontZ && p.z > rearZ && p.y > floor + height * 0.04).map(p => p.y);
  const belly = underside.length ? percentile(underside, 0.05) : floor + height * 0.35;
  const legLength = belly - floor;
  const knee = floor + legLength * 0.45;
  const bodyMid = belly + height * 0.15;
  const front = points.filter(p => p.z > frontZ && p.y > belly);
  const headCentre = front.filter(p => p.z > frontZ + (bounds.max.z - frontZ) * 0.5)
    .reduce((sum, p, _, all) => sum.add(p.clone().divideScalar(all.length)), new Vector3());
  const tailCentre = points.filter(p => p.z < rearZ - (rearZ - bounds.min.z) * 0.4 && p.y > belly)
    .reduce((sum, p, _, all) => sum.add(p.clone().divideScalar(all.length)), new Vector3());
  const neckBase = new Vector3(center.x, bodyMid, frontZ);
  const tailBase = new Vector3(center.x, bodyMid, rearZ);
  const hasTail = tailCentre.lengthSq() > 0 && rearZ - bounds.min.z > height * 0.05;
  const owned: SkinnedMesh[] = [];
  for (const mesh of meshes) {
    const geometry = mesh.geometry.clone();
    const local = (world: Vector3) => mesh.worldToLocal(world.clone());
    const bones: Bone[] = [];
    const joint = (name: string, world: Vector3, parent?: { bone: Bone; world: Vector3 }) => {
      const bone = new Bone(); bone.name = name;
      bone.position.copy(local(world));
      if (parent) { bone.position.sub(local(parent.world)); parent.bone.add(bone); }
      bones.push(bone);
      return { bone, world, index: bones.length - 1 };
    };
    const core = joint("BodyCore", new Vector3(center.x, bodyMid, (frontZ + rearZ) / 2));
    const chest = joint("Spine1", new Vector3(center.x, bodyMid, frontZ), core);
    const neck = joint("Neck", neckBase, chest);
    const head = joint("Head", new Vector3(headCentre.x, (headCentre.y + neckBase.y) / 2, (headCentre.z + neckBase.z) / 2), neck);
    const tail1 = hasTail ? joint("Tail1", tailBase, core) : undefined;
    const tail2 = tail1 ? joint("Tail2", tailBase.clone().lerp(tailCentre, 0.5), tail1) : undefined;
    const legJoints = legs.map(leg => {
      const prefix = leg.side > 0 ? "L" : "R";
      const hip = joint(leg.front > 0 ? `${prefix}Arm` : `${prefix}Thigh`, new Vector3(leg.foot.x, belly + height * 0.04, leg.foot.z), leg.front > 0 ? chest : core);
      const lower = joint(leg.front > 0 ? `${prefix}ForeArm` : `${prefix}Leg`, new Vector3(leg.foot.x, knee, leg.foot.z), hip);
      return { ...leg, hip, lower };
    });
    const vertex = new Vector3();
    const neckReach = Math.max(bounds.max.z - frontZ, height * 0.05);
    const tailReach = Math.max(rearZ - bounds.min.z, height * 0.05);
    owned.push(bindRigidSkin(mesh, geometry, core.bone, bones, i => {
      mesh.localToWorld(vertex.fromBufferAttribute(geometry.getAttribute("position"), i));
      const influences: Influence[] = [];
      // Legs take everything below the belly within their column, fading into the body just above it.
      const legness = 1 - smooth((vertex.y - belly + height * 0.03) / (height * 0.1));
      let remaining = 1;
      if (legness > 0) {
        const nearest = legJoints.reduce((best, leg) => {
          const distance = Math.hypot(vertex.x - leg.foot.x, vertex.z - leg.foot.z) / leg.radius;
          return distance < best.distance ? { leg, distance } : best;
        }, { leg: legJoints[0], distance: Infinity });
        const weight = legness * (1 - smooth((nearest.distance - 1) / 0.6));
        const lower = 1 - smooth((vertex.y - knee + legLength * 0.08) / (legLength * 0.16));
        influences.push({ index: nearest.leg.hip.index, weight: weight * (1 - lower) }, { index: nearest.leg.lower.index, weight: weight * lower });
        remaining -= weight;
      }
      const forward = smooth((vertex.z - frontZ) / (neckReach * 0.35));
      const toHead = smooth((vertex.z - frontZ - neckReach * 0.45) / (neckReach * 0.3));
      const backward = hasTail ? smooth((rearZ - vertex.z) / (tailReach * 0.35)) : 0;
      const tailTip = smooth((rearZ - vertex.z - tailReach * 0.5) / (tailReach * 0.3));
      const toChest = smooth((vertex.z - (frontZ + rearZ) / 2) / Math.max(frontZ - rearZ, 0.00001));
      influences.push(
        { index: head.index, weight: remaining * forward * toHead },
        { index: neck.index, weight: remaining * forward * (1 - toHead) },
        { index: chest.index, weight: remaining * (1 - forward) * toChest * (1 - backward) },
        { index: core.index, weight: remaining * (1 - forward) * (1 - toChest) * (1 - backward) },
      );
      if (tail1 && tail2) influences.push({ index: tail1.index, weight: remaining * backward * (1 - tailTip) }, { index: tail2.index, weight: remaining * backward * tailTip });
      return influences;
    }));
  }
  return () => { for (const mesh of owned) { mesh.geometry.dispose(); mesh.skeleton.dispose(); } };
}

type Swing = { axis: [number, number, number]; amplitude: number; phase: number; frequency: number };
type CoreZones = "torso" | "swimmer" | "lapras";
/** The remaining unskinned assets are built from separate pieces (fins, claws, magnets, eggs,
 * hands, vines). `core` picks how the main body bends; `corePoint` (0..1 of the model bounds)
 * picks the body when a larger piece, such as Goldeen's tail fin, is not the body. */
const partRigs: Record<number, { core: CoreZones; corePoint?: [number, number, number] }> = {
  60: { core: "torso" }, 81: { core: "torso" }, 82: { core: "torso" }, 90: { core: "torso" },
  92: { core: "torso" }, 93: { core: "torso" }, 98: { core: "torso" }, 99: { core: "torso" },
  101: { core: "torso" }, 102: { core: "torso" }, 109: { core: "torso" }, 110: { core: "torso" },
  114: { core: "torso" }, 116: { core: "torso" }, 117: { core: "torso" },
  118: { core: "torso", corePoint: [0.5, 0.4, 0.78] }, 119: { core: "swimmer" }, 131: { core: "lapras" }, 140: { core: "torso" },
};
const MAX_PARTS = 28;

interface Piece { mesh: Mesh; vertices: number[]; points: Vector3[]; box: Box3; centre: Vector3; diag: number }

/** Split a mesh into connected pieces, merging vertices that share a position (UV seams). */
function meshPieces(mesh: Mesh): Piece[] {
  const positions = mesh.geometry.getAttribute("position");
  const index = mesh.geometry.index;
  const size = new Box3().setFromBufferAttribute(positions as Float32BufferAttribute).getSize(new Vector3()).length() || 1;
  const snap = (v: number) => Math.round(v / size * 1e5);
  const canonical = new Map<string, number>();
  const parent = new Int32Array(positions.count);
  for (let i = 0; i < positions.count; i++) {
    const key = `${snap(positions.getX(i))},${snap(positions.getY(i))},${snap(positions.getZ(i))}`;
    const existing = canonical.get(key);
    parent[i] = existing ?? i;
    if (existing === undefined) canonical.set(key, i);
  }
  const find = (x: number) => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
  const corners = index ? index.count : positions.count;
  for (let t = 0; t + 2 < corners; t += 3) {
    const [a, b, c] = [0, 1, 2].map(k => find(index ? index.getX(t + k) : t + k));
    parent[a] = b; parent[find(c)] = b;
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < positions.count; i++) { const root = find(i); if (!groups.has(root)) groups.set(root, []); groups.get(root)!.push(i); }
  return [...groups.values()].map(vertices => {
    const points = vertices.map(i => mesh.localToWorld(new Vector3().fromBufferAttribute(positions, i)));
    const box = new Box3().setFromPoints(points);
    return { mesh, vertices, points, box, centre: box.getCenter(new Vector3()), diag: box.getSize(new Vector3()).length() };
  });
}

function boxGap(a: Box3, b: Box3) {
  const gap = (lo1: number, hi1: number, lo2: number, hi2: number) => Math.max(0, lo2 - hi1, lo1 - hi2);
  return Math.hypot(gap(a.min.x, a.max.x, b.min.x, b.max.x), gap(a.min.y, a.max.y, b.min.y, b.max.y), gap(a.min.z, a.max.z, b.min.z, b.max.z));
}

/** Give every separate piece its own joint, chained through touching pieces to the body,
 * and bend the body itself by zones. Small enclosed pieces (eyes) ride on their host. */
export function rigRigidParts(scene: Object3D, number: number) {
  const config = partRigs[number];
  const meshes: Mesh[] = [];
  scene.updateWorldMatrix(true, true);
  scene.traverse(node => { if (node instanceof Mesh && !(node instanceof SkinnedMesh)) meshes.push(node); });
  const bounds = new Box3().setFromObject(scene);
  const size = bounds.getSize(new Vector3());
  const modelDiag = size.length();
  if (!meshes.length || modelDiag < 0.00001) return () => {};
  const pieces = meshes.flatMap(meshPieces);
  const volume = (box: Box3) => { const s = box.getSize(new Vector3()); const floor = modelDiag * 0.01; return Math.max(s.x, floor) * Math.max(s.y, floor) * Math.max(s.z, floor); };
  const corePoint = config.corePoint && new Vector3(...config.corePoint).multiply(size).add(bounds.min);
  const core = pieces.reduce((best, piece) => {
    const eligible = !corePoint || piece.box.containsPoint(corePoint);
    return eligible && volume(piece.box) > volume(best.box) ? piece : best;
  }, corePoint ? pieces.find(piece => piece.box.containsPoint(corePoint)) ?? pieces[0] : pieces[0]);
  const overlap = (a: Box3, b: Box3) => { const i = a.clone().intersect(b); return i.isEmpty() ? 0 : volume(i) / volume(a); };
  // Features ride on a host; parts get joints.
  const host = new Map<Piece, Piece>();
  let parts: Piece[] = [];
  for (const piece of pieces) {
    if (piece === core) continue;
    const container = pieces.filter(other => other !== piece && other.diag > piece.diag)
      .reduce<{ piece?: Piece; overlap: number }>((best, other) => { const o = overlap(piece.box, other.box); return o > best.overlap ? { piece: other, overlap: o } : best; }, { overlap: 0 });
    if (container.piece && container.overlap > 0.85 && piece.diag < container.piece.diag * 0.5) host.set(piece, container.piece);
    else if (piece.diag < modelDiag * 0.06) host.set(piece, pieces.filter(other => other !== piece && other.diag > piece.diag).reduce((a, b) => boxGap(piece.box, a.box) <= boxGap(piece.box, b.box) ? a : b, core));
    else parts.push(piece);
  }
  parts.sort((a, b) => b.diag - a.diag);
  for (const extra of parts.slice(MAX_PARTS)) host.set(extra, [core, ...parts.slice(0, MAX_PARTS)].reduce((a, b) => boxGap(extra.box, a.box) <= boxGap(extra.box, b.box) ? a : b));
  parts = parts.slice(0, MAX_PARTS);
  const owner = (piece: Piece): Piece => { let current = piece; for (let guard = 0; host.has(current) && guard < 64; guard++) current = host.get(current)!; return current; };
  // Chain touching parts outward from the body so segments (crab legs) stay attached.
  const touching = (a: Piece, b: Piece) => boxGap(a.box, b.box) < modelDiag * 0.015;
  const parentOf = new Map<Piece, Piece>(), depth = new Map<Piece, number>([[core, 0]]);
  const queue = [core];
  while (queue.length) {
    const current = queue.shift()!;
    for (const part of parts) if (!depth.has(part) && touching(current, part)) { parentOf.set(part, current); depth.set(part, depth.get(current)! + 1); queue.push(part); }
  }
  const up = new Vector3(0, 1, 0);
  const joints = parts.map((part, i) => {
    const attached = depth.has(part);
    const parent = attached ? parentOf.get(part)! : core;
    let pivot: Vector3, orbit = false;
    if (attached) pivot = part.points.reduce((a, b) => a.distanceToSquared(parent.centre) <= b.distanceToSquared(parent.centre) ? a : b).clone();
    else if (part.box.min.y < bounds.min.y + size.y * 0.05) pivot = new Vector3(part.centre.x, part.box.min.y, part.centre.z);
    else { pivot = core.centre.clone(); orbit = true; }
    const direction = part.centre.clone().sub(pivot);
    if (direction.lengthSq() < 1e-12) direction.set(0, 1, 0);
    direction.normalize();
    // Tails and rear fins wag sideways; side pieces flap; hanging pieces paddle.
    let axis = direction.z < -0.7 ? up.clone() : new Vector3().crossVectors(direction, up);
    if (axis.lengthSq() < 0.09) axis = new Vector3(1, 0, 0);
    axis.normalize();
    // Floating pieces orbit the body, so a small angle already travels far.
    const amplitude = !attached ? (orbit ? 0.07 : 0.1) : depth.get(part)! > 1 ? 0.1 : 0.16;
    const swing: Swing = { axis: axis.toArray() as Swing["axis"], amplitude, phase: i * 1.7, frequency: 1 };
    return { part, parent: attached ? parent : core, pivot, swing, depth: depth.get(part) ?? 1 };
  }).sort((a, b) => a.depth - b.depth);
  // Body zones, in the core piece's own bounds.
  const coreBox = core.box, coreSize = coreBox.getSize(new Vector3());
  const norm = (p: Vector3) => new Vector3().subVectors(p, coreBox.min).divide(coreSize.clone().max(new Vector3(1e-9, 1e-9, 1e-9)));
  const at = (x: number, y: number, z: number) => new Vector3(x, y, z).multiply(coreSize).add(coreBox.min);
  type Zone = { name: string; world: Vector3; parent?: number; swing?: Swing };
  const zones: Zone[] = [];
  let zoneWeights: (p: Vector3) => Influence[];
  if (config.core === "swimmer") {
    zones.push({ name: "BodyCore", world: core.centre.clone() },
      { name: "Tail1", world: at(0.5, 0.5, 0.45), parent: 0, swing: { axis: [0, 1, 0], amplitude: 0.16, phase: 0, frequency: 1 } },
      { name: "Tail2", world: at(0.5, 0.5, 0.22), parent: 1, swing: { axis: [0, 1, 0], amplitude: 0.22, phase: -0.8, frequency: 1 } });
    zoneWeights = p => { const z = norm(p).z; const tail = 1 - smooth((z - 0.3) / 0.25), tip = 1 - smooth((z - 0.12) / 0.15);
      return [{ index: 0, weight: 1 - tail }, { index: 1, weight: tail * (1 - tip) }, { index: 2, weight: tail * tip }]; };
  } else if (config.core === "lapras") {
    zones.push({ name: "BodyCore", world: core.centre.clone() }, { name: "Neck", world: at(0.5, 0.57, 0.72), parent: 0 }, { name: "Head", world: at(0.5, 0.77, 0.8), parent: 1 });
    for (const [side, front] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      zones.push({ name: `${side > 0 ? "L" : "R"}Fin${front > 0 ? "A" : "B"}`, world: at(0.5 + side * 0.24, 0.1, front > 0 ? 0.62 : 0.2), parent: 0,
        swing: { axis: [0, 0, side], amplitude: 0.22, phase: front > 0 ? 0 : Math.PI, frequency: 1 } });
    }
    zoneWeights = p => {
      const n = norm(p);
      const fin = smooth((Math.abs(n.x - 0.5) * 2 - 0.46) / 0.1);
      const finIndex = 3 + (n.x > 0.5 ? 0 : 1) + (n.z > 0.45 ? 0 : 2);
      const neck = smooth((n.y - 0.54) / 0.08) * smooth((n.z - 0.6) / 0.06), head = smooth((n.y - 0.74) / 0.07);
      return [{ index: finIndex, weight: fin }, { index: 1, weight: (1 - fin) * neck * (1 - head) }, { index: 2, weight: (1 - fin) * neck * head }, { index: 0, weight: (1 - fin) * (1 - neck) }];
    };
  } else {
    zones.push({ name: "BodyCore", world: at(0.5, 0, 0.5) }, { name: "Spine1", world: at(0.5, 0.42, 0.5), parent: 0 }, { name: "Head", world: at(0.5, 0.7, 0.5), parent: 1 });
    zoneWeights = p => { const y = norm(p).y; const torso = smooth((y - 0.25) / 0.28), neck = smooth((y - 0.65) / 0.18);
      return [{ index: 0, weight: 1 - torso }, { index: 1, weight: torso * (1 - neck) }, { index: 2, weight: torso * neck }]; };
  }
  const strongestZone = (p: Vector3) => zoneWeights(p).reduce((a, b) => b.weight > a.weight ? b : a).index;
  const owned: SkinnedMesh[] = [];
  for (const mesh of meshes) {
    const geometry = mesh.geometry.clone();
    const local = (world: Vector3) => mesh.worldToLocal(world.clone());
    const bones: Bone[] = [];
    const add = (name: string, world: Vector3, parent?: { bone: Bone; world: Vector3 }, swing?: Swing) => {
      const bone = new Bone(); bone.name = name;
      bone.position.copy(local(world));
      if (parent) { bone.position.sub(local(parent.world)); parent.bone.add(bone); }
      if (swing) bone.userData.swing = swing;
      bones.push(bone);
      return { bone, world };
    };
    const zoneJoints: { bone: Bone; world: Vector3 }[] = [];
    for (const zone of zones) zoneJoints.push(add(zone.name, zone.world, zone.parent === undefined ? undefined : zoneJoints[zone.parent], zone.swing));
    const partIndex = new Map<Piece, number>();
    const partJoint = new Map<Piece, { bone: Bone; world: Vector3 }>();
    for (const [i, joint] of joints.entries()) {
      const parent = joint.parent === core ? zoneJoints[strongestZone(joint.pivot)] : partJoint.get(joint.parent)!;
      partJoint.set(joint.part, add(`Part${i + 1}`, joint.pivot, parent, joint.swing));
      partIndex.set(joint.part, bones.length - 1);
    }
    const vertexOwner = new Map<number, Piece>();
    for (const piece of pieces) if (piece.mesh === mesh) for (const v of piece.vertices) vertexOwner.set(v, owner(piece));
    const vertex = new Vector3();
    owned.push(bindRigidSkin(mesh, geometry, zoneJoints[0].bone, bones, i => {
      const piece = vertexOwner.get(i);
      const index = piece && partIndex.get(piece);
      if (index !== undefined) return [{ index, weight: 1 }];
      return zoneWeights(mesh.localToWorld(vertex.fromBufferAttribute(geometry.getAttribute("position"), i)));
    }));
  }
  return () => { for (const mesh of owned) { mesh.geometry.dispose(); mesh.skeleton.dispose(); } };
}


// Alakazam's spoons hang off top-level joints; the game keys them to its hands. Re-parent them
// so they follow the hands, keeping their world transform (the skin doesn't move at rest).
const HELD_ITEMS: Record<number, [item: string, hand: string][]> = { 65: [["LFeelerA", "LHand"], ["RFeelerA", "RHand"]] };
function attachHeldItems(scene: Object3D, number: number) {
  const pairs = HELD_ITEMS[number];
  if (!pairs) return;
  scene.updateMatrixWorld(true);
  const byName = new Map<string, Object3D>();
  scene.traverse(node => { if ((node as Object3D & { isBone?: boolean }).isBone) byName.set(normalizePokemonBone(node.name), node); });
  for (const [item, hand] of pairs) {
    const itemBone = byName.get(item), handBone = byName.get(hand);
    if (itemBone && handBone && itemBone.parent !== handBone) handBone.attach(itemBone);
  }
  scene.updateMatrixWorld(true);
}
