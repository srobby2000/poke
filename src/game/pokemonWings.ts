import { Quaternion, Vector3 } from "three";
import type { Object3D } from "three";
import { insectWings, isWingRoot, normalizePokemonBone } from "./pokemonAppendages";

/** Wings that beat like wings. The clips swing each wing up and down from its shoulder, and
 * nothing else: a flat, straight, rigid board. After the clip each frame this reads where each
 * wing is in its beat (from the clip's own motion, so every clip benefits: flight, idle,
 * attacks) and shapes it the way birds, bats and dragons beat:
 *  - downstroke: the wing is spread wide, leading edge pitched down, pushing air;
 *  - upstroke: the elbow and wrist fold the wing in and back (tips pointing back), the upper
 *    arm sweeps back and the leading edge pitches up, so the wing slips up through the air;
 *  - all through: each joint past the shoulder drags against the air through a soft spring,
 *    so the tip trails the beat and whips over at the top and bottom.
 * Insect wings are stiff panels: they twist a little and flex a little, and never fold. */
export type WingDriver = { update: (delta: number) => void };

type Joint = {
  bone: Object3D;
  /** Steps past the shoulder along the wing's main chain (1 = elbow, 2 = wrist); 0 off it. */
  fold: number;
  depth: number;
  /** The point this joint swings: its child along the wing, or itself at the tip. */
  end: Object3D;
  /** `extra` is the springy air drag; `shape` is the beat's fold, sweep and twist, which follow
   * the beat directly (a spring would lag a 2 Hz beat by a quarter of it). */
  clip: Quaternion; output: Quaternion; extra: Quaternion; shape: Quaternion;
  last: Vector3; velocity: Vector3; started: boolean;
};
type Wing = {
  root: Joint;
  /** The first joint out along the wing, whose height gives the wing's elevation. */
  elbow: Object3D;
  joints: Joint[];
  elevation: number; rate: number; peak: number; started: boolean;
};

const isBone = (node: Object3D) => !!(node as Object3D & { isBone?: boolean }).isBone;
const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

// How far each effect goes, in radians: drag per unit of sweep speed (display heights a
// second) and its limit, the upstroke fold at the elbow and wrist, and the shoulder's sweep
// back and twist. Birds fold their wing by well over half on the upstroke.
const BIRD = { drag: 0.07, dragLimit: 0.45, fold: [0, 0.95, 0.75, 0.3], sweep: 0.35, twist: 0.35 };
const INSECT = { drag: 0.025, dragLimit: 0.12, fold: [0, 0, 0, 0], sweep: 0, twist: 0.3 };

const joint = (bone: Object3D, depth: number, fold: number, end: Object3D): Joint => ({
  bone, depth, fold, end, clip: bone.quaternion.clone(), output: new Quaternion(NaN, NaN, NaN, NaN), extra: new Quaternion(), shape: new Quaternion(),
  last: new Vector3(), velocity: new Vector3(), started: false,
});

export function createWingDriver(scene: Object3D, number: number, displayHeight: number): WingDriver | null {
  const roots: Object3D[] = [];
  scene.traverse(node => {
    if (isBone(node) && (isWingRoot(normalizePokemonBone(node.name), number) || (number === 42 && /^[LR]Wing$/.test(normalizePokemonBone(node.name))))) roots.push(node);
  });
  const depthOf = (node: Object3D): number => Math.max(0, ...node.children.filter(isBone).map(child => 1 + depthOf(child)));
  const deepest = (node: Object3D) => node.children.filter(isBone).sort((a, b) => depthOf(b) - depthOf(a))[0];
  const wings: Wing[] = [];
  for (const root of roots) {
    const elbow = deepest(root);
    if (!elbow) continue;
    // The main chain runs to the deepest joint; everything else hangs off it.
    const main = new Set<Object3D>();
    for (let node: Object3D | undefined = root; node; node = deepest(node)) main.add(node);
    const joints: Joint[] = [];
    const visit = (node: Object3D, depth: number, steps: number) => {
      for (const child of node.children.filter(isBone)) {
        const onMain = main.has(child);
        joints.push(joint(child, depth, onMain ? steps : 0, deepest(child) ?? child));
        visit(child, depth + 1, onMain ? steps + 1 : 0);
      }
    };
    visit(root, 1, 1);
    wings.push({ root: joint(root, 0, 0, elbow), elbow, joints, elevation: 0, rate: 0, peak: 1e-3, started: false });
  }
  if (!wings.length) return null;
  const style = insectWings.has(number) ? INSECT : BIRD;
  const all = wings.flatMap(wing => [wing.root, ...wing.joints]);
  const s = { at: new Vector3(), from: new Vector3(), direction: new Vector3(), across: new Vector3(), axis: new Vector3(),
    back: new Vector3(), up: new Vector3(), world: new Quaternion(), toModel: new Quaternion(), inverse: new Quaternion(),
    target: new Quaternion(), shape: new Quaternion(), turn: new Quaternion(), local: new Vector3() };
  /** Rotate `into` further by `angle` about a world-space axis, expressed in the bone's frame. */
  const turn = (into: Quaternion, axis: Vector3, angle: number) => {
    if (!angle || axis.lengthSq() < 1e-8) return;
    into.multiply(s.turn.setFromAxisAngle(s.local.copy(axis).normalize().applyQuaternion(s.inverse), angle));
  };
  return {
    update(delta) {
      const dt = Math.min(delta, 0.05);
      if (dt <= 0) return;
      // Start from the clip's pose. A joint the clip doesn't animate still shows last frame's
      // output, so restore its own clip pose rather than bending it further.
      for (const j of all) {
        if (!j.bone.quaternion.equals(j.output)) j.clip.copy(j.bone.quaternion);
        j.bone.quaternion.copy(j.clip);
      }
      scene.updateWorldMatrix(true, true);
      scene.getWorldQuaternion(s.world);
      s.toModel.copy(s.world).invert();
      s.back.set(0, 0, -1).applyQuaternion(s.world);
      s.up.set(0, 1, 0).applyQuaternion(s.world);
      const follow = 1 - Math.exp(-dt * 16), settle = 1 - Math.exp(-dt * 45);
      for (const wing of wings) {
        // Where the wing is in its beat: its elevation (shoulder to elbow, in the model's frame),
        // how fast that changes, against the fastest it has recently changed.
        wing.root.bone.getWorldPosition(s.from);
        wing.elbow.getWorldPosition(s.at);
        const elevation = Math.asin(Math.max(-1, Math.min(1, s.at.sub(s.from).normalize().applyQuaternion(s.toModel).y)));
        if (!wing.started) { wing.elevation = elevation; wing.started = true; }
        const rate = (elevation - wing.elevation) / dt;
        wing.elevation = elevation;
        wing.rate += (rate - wing.rate) * (1 - Math.exp(-dt * 25));
        wing.peak = Math.max(wing.peak * Math.exp(-dt * 0.8), Math.abs(wing.rate), 0.5);
        const beat = wing.rate / wing.peak;
        // Rising: fold in over the first part of the upstroke; falling: spread for the push.
        const rising = smooth(beat / 0.55), falling = smooth(-beat / 0.55);
        for (const j of [wing.root, ...wing.joints]) {
          const { bone } = j;
          j.end.getWorldPosition(s.at);
          bone.getWorldPosition(s.from);
          if (j.end === bone) s.at.addScaledVector(s.from.clone().sub(bone.parent!.getWorldPosition(new Vector3())), 0.5);
          s.direction.copy(s.at).sub(s.from).normalize();
          bone.getWorldQuaternion(s.inverse).invert();
          s.target.identity();
          s.shape.identity();
          if (j === wing.root) {
            // The upper arm sweeps back on the way up, and the wing pitches: leading edge down
            // on the downstroke, up on the upstroke.
            turn(s.shape, s.axis.crossVectors(s.direction, s.back), style.sweep * rising);
            // About the span, a positive turn tips the leading edge down on the model's left wing
            // (back × up points left) and up on its right.
            turn(s.shape, s.direction, style.twist * (falling - rising) * Math.sign(s.direction.dot(s.axis.crossVectors(s.back, s.up)) || 1));
          } else {
            // Drag: bend toward where it came from, in proportion to how fast it sweeps across.
            if (!j.started) { j.last.copy(s.at); j.started = true; }
            const speed = s.across.copy(s.at).sub(j.last).divideScalar(dt * displayHeight).clampLength(0, 12);
            j.last.copy(s.at);
            j.velocity.lerp(speed, 1 - Math.exp(-dt * 20));
            s.across.copy(j.velocity).addScaledVector(s.direction, -j.velocity.dot(s.direction));
            const sweep = s.across.length();
            if (sweep > 1e-4) turn(s.target, s.axis.crossVectors(s.direction, s.across.negate()), Math.min(style.drag * sweep, style.dragLimit));
            // Fold: elbow and wrist tuck the wing back and in on the upstroke.
            turn(s.shape, s.axis.crossVectors(s.direction, s.back), (style.fold[j.fold] ?? 0) * rising);
          }
          j.extra.slerp(s.target, follow);
          j.shape.slerp(s.shape, settle);
          bone.quaternion.copy(j.clip).multiply(j.shape).multiply(j.extra);
          j.output.copy(bone.quaternion);
          // Children measure against this joint's new pose.
          bone.updateWorldMatrix(false, true);
        }
      }
    },
  };
}
