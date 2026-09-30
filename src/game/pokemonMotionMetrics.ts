import { AnimationMixer, Box3, Group, LoopOnce, Quaternion, Vector3 } from "three";
import type { AnimationClip, Object3D } from "three";
import { normalizePokemonBone } from "./pokemonAppendages";
import { pokemonDisplayHeight, pokemonMeasurement } from "./pokemonScale";

/** Stage a model as the game shows it: scaled to its display height and standing on the
 * floor, inside an animated root. Root motion (hover, hops) is in these display units. */
export function stageForDisplay(scene: Object3D, number: number, heightM: number): Group {
  scene.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(scene);
  const size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3());
  const scale = pokemonDisplayHeight(heightM) / pokemonMeasurement(number, scene, size);
  const body = new Group();
  body.scale.setScalar(scale);
  body.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  body.add(scene);
  const root = new Group();
  root.add(body);
  root.updateMatrixWorld(true);
  return root;
}

/** Body roles recognised from bone names across the bundled rigs (e.g. Mewtwo's
 * "rightleg02", Bulbasaur's "LThigh", generated "Part3"). Order matters: first match wins. */
export const MOTION_ROLES = ["foot", "hand", "knee", "thigh", "forearm", "arm", "spine", "head", "tail", "wing", "ear"] as const;
export type MotionRole = typeof MOTION_ROLES[number];
const ROLE_PATTERNS: [MotionRole, RegExp][] = [
  ["wing", /wing|feeler[ab]?\d*$/],
  ["tail", /tail/],
  ["ear", /ear/],
  ["foot", /foot|toe/],
  ["hand", /hand|finger|thumb|index|middle|ring|pinky/],
  ["knee", /leg0?2|calf|shin|^leg$/],
  ["thigh", /thigh|leg0?1|upleg/],
  ["forearm", /forearm|arm0?2|lowerarm/],
  ["arm", /upperarm|arm0?1|^arm$|shoulder/],
  ["spine", /spine|waist|chest|hips|pelvis|bodycore/],
  ["head", /head|neck|jaw/],
];

export function motionRole(boneName: string): MotionRole | null {
  const name = normalizePokemonBone(boneName).toLowerCase().replace(/^(left|right|[lr])(?=[a-z])/, "");
  return ROLE_PATTERNS.find(([, pattern]) => pattern.test(name))?.[0] ?? null;
}

export type ClipMetrics = {
  duration: number;
  /** Largest rotation range (degrees) of any bone in each role present. */
  roles: Partial<Record<MotionRole, number>>;
  /** Range of the most-moving bone, whatever its role. */
  peakRange: number;
  /** Vertical travel of the hips/root, as % of the model's height. */
  bob: number;
  /** Beats per second of the most-moving bone (wing beats, tail beats, strides). */
  beatHz: number;
  /** Largest rotation difference between the first and last frame (degrees): loop seams. */
  seam: number;
  /** When the fastest motion happens, as a fraction of the clip: an attack's strike. */
  peakSpeedAt: number;
  /** Largest sudden change of angular velocity relative to the bone's typical speed. */
  kink: number;
};

const toDegrees = 180 / Math.PI;

/** Sample `clip` on `root`'s rig at `hz` and measure how it moves. Leaves the rig as found. */
export function measureClip(scene: Object3D, root: Group, clip: AnimationClip, hz = 120): ClipMetrics {
  const bones: Object3D[] = [];
  scene.traverse(node => { if ((node as Object3D & { isBone?: boolean }).isBone) bones.push(node); });
  const saved = [root, ...bones].map(node => ({ node, p: node.position.clone(), q: node.quaternion.clone(), s: node.scale.clone() }));
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(scene);
  const height = Math.max(1e-6, box.max.y - box.min.y);
  const hips = bones.find(b => /^(hips|waist|pelvis|spine1?|bodycore|root)$/i.test(normalizePokemonBone(b.name))) ?? bones[0];
  const mixer = new AnimationMixer(root);
  const action = mixer.clipAction(clip);
  // Play once and hold the last frame, so the end of a loop can be compared with its start.
  action.setLoop(LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  const frames = Math.max(8, Math.round(clip.duration * hz));
  // The animated root counts too: whole-body lean and recoil are part of the motion.
  const tracked = [root, ...bones];
  const angles = new Map(tracked.map(b => [b, [] as number[]]));
  // Signed rotation vectors (axis × angle, relative to the first frame) for beat counting.
  const vectors = new Map(tracked.map(b => [b, [] as Vector3[]]));
  const heights: number[] = [];
  let first: Map<Object3D, Quaternion> | null = null;
  for (let i = 0; i <= frames; i++) {
    mixer.setTime(clip.duration * i / frames);
    root.updateMatrixWorld(true);
    if (!first) first = new Map(tracked.map(b => [b, b.quaternion.clone()]));
    for (const bone of tracked) {
      angles.get(bone)!.push(first.get(bone)!.angleTo(bone.quaternion) * toDegrees);
      const relative = first.get(bone)!.clone().invert().multiply(bone.quaternion);
      if (relative.w < 0) relative.set(-relative.x, -relative.y, -relative.z, -relative.w);
      const half = Math.acos(Math.min(1, relative.w)), sin = Math.sin(half);
      vectors.get(bone)!.push(sin > 1e-9 ? new Vector3(relative.x, relative.y, relative.z).multiplyScalar(2 * half / sin) : new Vector3());
    }
    heights.push((hips ? hips.getWorldPosition(new Vector3()).y : root.position.y));
  }
  action.stop();
  mixer.uncacheRoot(root);
  for (const { node, p, q, s } of saved) { node.position.copy(p); node.quaternion.copy(q); node.scale.copy(s); }
  root.updateMatrixWorld(true);

  const roles: Partial<Record<MotionRole, number>> = {};
  let peakRange = 0, peakSeries: number[] = [], peakBone: Object3D | null = null, seam = 0, kink = 0;
  for (const [bone, series] of angles) {
    const range = Math.max(...series) - Math.min(...series);
    const role = motionRole(bone.name);
    if (role && range > (roles[role] ?? 0)) roles[role] = range;
    if (range > peakRange) { peakRange = range; peakSeries = series; peakBone = bone; }
    seam = Math.max(seam, Math.abs(series[series.length - 1] - series[0]));
    if (range > 2) {
      const velocity = series.slice(1).map((value, i) => (value - series[i]) * hz);
      const rms = Math.sqrt(velocity.reduce((sum, v) => sum + v * v, 0) / velocity.length) || 1;
      for (let i = 1; i < velocity.length; i++) kink = Math.max(kink, Math.abs(velocity[i] - velocity[i - 1]) / rms);
    }
  }
  // Beats: zero crossings of the most-moving bone's dominant rotation component about its mean,
  // with hysteresis (two crossings per beat).
  let crossings = 0;
  if (peakBone) {
    const series = vectors.get(peakBone)!;
    const axis = (["x", "y", "z"] as const).map(k => series.map(v => v[k])).map(values => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return { values: values.map(v => v - mean), spread: Math.max(...values) - Math.min(...values) };
    }).sort((a, b) => b.spread - a.spread)[0];
    const band = axis.spread * 0.15;
    // Sweep twice and count on the second pass: loops are periodic, so this is exact.
    let side = 0;
    for (let pass = 0; pass < 2; pass++) for (const value of axis.values) {
      const now = value > band ? 1 : value < -band ? -1 : side;
      if (pass && side && now !== side) crossings++;
      side = now;
    }
  }
  let peakSpeed = 0, peakSpeedAt = 0;
  for (let i = 1; i < peakSeries.length; i++) {
    const step = Math.abs(peakSeries[i] - peakSeries[i - 1]);
    if (step > peakSpeed) { peakSpeed = step; peakSpeedAt = i / frames; }
  }
  return {
    duration: clip.duration,
    roles,
    peakRange,
    bob: (Math.max(...heights) - Math.min(...heights)) / height * 100,
    beatHz: crossings / 2 / Math.max(1e-6, clip.duration),
    seam,
    peakSpeedAt,
    kink,
  };
}
