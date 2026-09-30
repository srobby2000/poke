import { Quaternion, Vector3 } from "three";
import type { Object3D } from "three";
import { insectWings, isWingRoot, normalizePokemonBone } from "./pokemonAppendages";

/** Wings that bend like wings. The clips swing each wing from its shoulder; the joints beyond it
 * (elbow, wrist, fingers, feathers, membrane struts) would otherwise hold still, so the wing
 * flaps as one stiff board. After the clip each frame, every joint past the shoulder:
 *  - drags against the air: it bends away from the way it is moving, through a soft spring, so
 *    the tip trails on the downstroke and whips over at the top;
 *  - folds on the upstroke (elbow and wrist tuck the wing back and in) and spreads again for
 *    the downstroke, as birds, bats and dragons do.
 * It reads the motion the clip produced, so it works for every clip: flight, idle, attacks.
 * Insect wings are stiff panels: they only flex a little, and never fold. */
export type WingDriver = { update: (delta: number) => void };

type Joint = {
  bone: Object3D;
  /** Depth past the shoulder along the wing's main chain (1 = elbow); 0 for side branches. */
  fold: number;
  depth: number;
  /** The point this joint swings: its child along the wing, or itself at the tip. */
  end: Object3D;
  clip: Quaternion; output: Quaternion; extra: Quaternion;
  last: Vector3; velocity: Vector3; started: boolean;
};

const isBone = (node: Object3D) => !!(node as Object3D & { isBone?: boolean }).isBone;
// How far each effect goes: bend per unit of speed (display heights a second), its limit, and
// the upstroke fold at the elbow and the wrist.
const DRAG = 0.08, FOLD = [0, 0.55, 0.35];

export function createWingDriver(scene: Object3D, number: number, displayHeight: number): WingDriver | null {
  const roots: Object3D[] = [];
  scene.traverse(node => {
    if (isBone(node) && (isWingRoot(normalizePokemonBone(node.name), number) || (number === 42 && /^[LR]Wing$/.test(normalizePokemonBone(node.name))))) roots.push(node);
  });
  const joints: Joint[] = [];
  for (const root of roots) {
    // The main chain runs to the deepest joint; everything else hangs off it.
    const depthOf = (node: Object3D): number => Math.max(0, ...node.children.filter(isBone).map(child => 1 + depthOf(child)));
    const main = new Set<Object3D>();
    for (let node: Object3D | undefined = root; node;) {
      main.add(node);
      node = node.children.filter(isBone).sort((a, b) => depthOf(b) - depthOf(a))[0];
    }
    const visit = (node: Object3D, depth: number) => {
      for (const child of node.children.filter(isBone)) {
        const next = child.children.filter(isBone).sort((a, b) => depthOf(b) - depthOf(a))[0];
        joints.push({ bone: child, depth, fold: main.has(child) ? depth : 0, end: next ?? child,
          clip: child.quaternion.clone(), output: new Quaternion(NaN, NaN, NaN, NaN), extra: new Quaternion(),
          last: new Vector3(), velocity: new Vector3(), started: false });
        visit(child, depth + 1);
      }
    };
    visit(root, 1);
  }
  if (!joints.length) return null;
  const insect = insectWings.has(number), drag = insect ? DRAG * 0.3 : DRAG;
  const s = { at: new Vector3(), from: new Vector3(), direction: new Vector3(), across: new Vector3(), axis: new Vector3(),
    back: new Vector3(), world: new Quaternion(), target: new Quaternion(), fold: new Quaternion(), up: new Vector3(0, 1, 0) };
  return {
    update(delta) {
      const dt = Math.min(delta, 0.05);
      if (dt <= 0) return;
      // Start from the clip's pose. A joint the clip doesn't animate still shows last frame's
      // output, so restore its own clip pose rather than bending it further.
      for (const joint of joints) {
        if (!joint.bone.quaternion.equals(joint.output)) joint.clip.copy(joint.bone.quaternion);
        joint.bone.quaternion.copy(joint.clip);
      }
      scene.updateWorldMatrix(true, true);
      scene.getWorldQuaternion(s.world);
      s.back.set(0, 0, -1).applyQuaternion(s.world);
      const follow = 1 - Math.exp(-dt * 14);
      for (const joint of joints) {
        const { bone } = joint;
        joint.end.getWorldPosition(s.at);
        if (joint.end === bone) s.at.addScaledVector(bone.getWorldPosition(s.from).sub(bone.parent!.getWorldPosition(new Vector3())), 0.5);
        if (!joint.started) { joint.last.copy(s.at); joint.started = true; }
        const speed = s.from.copy(s.at).sub(joint.last).divideScalar(dt * displayHeight).clampLength(0, 12);
        joint.last.copy(s.at);
        joint.velocity.lerp(speed, 1 - Math.exp(-dt * 20));
        bone.getWorldPosition(s.from);
        s.direction.copy(s.at).sub(s.from).normalize();
        const inverse = bone.getWorldQuaternion(new Quaternion()).invert();
        // Drag: bend toward where it came from, in proportion to how fast it sweeps across.
        s.across.copy(joint.velocity).addScaledVector(s.direction, -joint.velocity.dot(s.direction));
        const sweep = s.across.length();
        s.target.identity();
        if (sweep > 1e-4) {
          s.axis.crossVectors(s.direction, s.across.negate()).normalize().applyQuaternion(inverse);
          s.target.setFromAxisAngle(s.axis, Math.min(drag * sweep, (0.2 + 0.08 * joint.depth) * (insect ? 0.4 : 1)));
        }
        // Fold: on the way up the elbow and wrist tuck the wing back; spread for the downstroke.
        const fold = insect ? 0 : FOLD[joint.fold] ?? 0;
        if (fold) {
          const rising = Math.max(0, Math.min(1, joint.velocity.dot(s.up) / 2.5));
          s.axis.crossVectors(s.direction, s.back);
          if (s.axis.lengthSq() > 1e-6) s.target.multiply(s.fold.setFromAxisAngle(s.axis.normalize().applyQuaternion(inverse), fold * rising * rising * (3 - 2 * rising)));
        }
        joint.extra.slerp(s.target, follow);
        bone.quaternion.copy(joint.clip).multiply(joint.extra);
        joint.output.copy(bone.quaternion);
      }
    },
  };
}
