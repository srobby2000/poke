import { Box3, AnimationClip, AnimationMixer, Group, LoopOnce, LoopRepeat, NumberKeyframeTrack, PropertyBinding, Quaternion, QuaternionKeyframeTrack, Vector3 } from "three";
import type { AnimationAction, KeyframeTrack, Object3D } from "three";
import { POKEMON_LOCOMOTION, isSuspended } from "./pokemonLocomotion";
import { appendageMotion, normalizePokemonBone } from "./pokemonAppendages";
import type { PokemonModelDefinition } from "./pokemonModels";
import { pokemonDisplayHeight } from "./pokemonScale";
import { MOVE_ARCHETYPES, moveAnimationFor } from "./moveAnimations";
import type { MoveChannel, MovePose } from "./moveAnimations";

export type PokemonMotion = "idle" | "walk" | "run" | "attack" | "hit";
/** A base motion, or one specific move (`move:tackle`). */
export type PokemonAction = PokemonMotion | `move:${string}`;

/** Unknown embedded actions can be attacks/entrances; only use known ambient loops. */
export function selectPokemonClip(clips: AnimationClip[], motion: PokemonMotion) {
  const patterns: Record<PokemonMotion, RegExp[]> = {
    idle: [/defaultwait|battlewait/i, /idle/i],
    walk: [/walk/i, /run/i],
    run: [/run/i],
    attack: [/attack01|fight_b|impactrueno/i, /attack|fight/i],
    hit: [/damage01/i, /damage|hit/i],
  };
  for (const pattern of patterns[motion]) {
    const clip = clips.find(candidate => candidate.duration > 0 && pattern.test(candidate.name));
    if (clip) return clip;
  }
  return undefined;
}

// Pikachu's bind pose lies face-down; its authored attack starts from a standing pose.
const restClipOverrides: Record<number, string> = { 25: "Impactrueno" };

/** Pose a model in the stance every generated clip is built around: the first frame of its
 * authored idle, or of a named clip when the bind pose itself is unusable. Call on the
 * instance's own clone, before measuring it or creating its animator. */
export function applyRestPose(scene: Object3D, number: number, clips: AnimationClip[]) {
  const clip = (number === 41 ? clips.find(candidate => candidate.name === "Take 001") : selectPokemonClip(clips, "idle"))
    ?? clips.find(candidate => candidate.name === restClipOverrides[number]);
  if (!clip) return;
  for (const track of clip.tracks) {
    const { nodeName, propertyName } = PropertyBinding.parseTrackName(track.name);
    if (propertyName !== "quaternion" && propertyName !== "position" && propertyName !== "scale") continue;
    const node = PropertyBinding.findNode(scene, nodeName) as Object3D | undefined;
    if (!node) continue;
    node[propertyName].fromArray(track.createInterpolant().evaluate(0));
  }
  scene.updateMatrixWorld(true);
}

const swayingFamilies = new Set(["snake", "rocksnake", "serpent", "caterpillar", "cocoon", "flower", "bell", "vine"]);
const softFamilies = new Set(["sludge", "blob", "sleeper", "eggs"]);

// These species use arms as arms, not forelegs or flight surfaces.
const relaxedArmSpecies = new Set([
  4, 5, 6, 7, 8, 9, 25, 26, 27, 28, 31, 34, 35, 36, 39, 40, 52,
  54, 55, 56, 57, 61, 62, 63, 64, 65, 66, 67, 68, 74, 75, 80, 94,
  96, 97, 104, 105, 106, 107, 108, 112, 113, 115, 122, 124, 125, 126,
  127, 143, 149, 150, 151,
]);

// Convert anatomical axes to each imported rig's own coordinates. Some rigs
// are Z-up or mirror their left/right bone bases. Axes are given in the model's
// own frame (its animated root, facing +Z), not the world: a mount or battle unit
// may already be turned when its clips are built.
// `rest` is the local rotation the clip animates around; a relaxed arm's axes must follow
// its lowered pose, not the outstretched bind pose, or a forward raise turns into a twist.
function rigAxis(bone: Object3D, frame: Quaternion, rest: Quaternion, x: number, y: number, z: number) {
  const world = bone.getWorldQuaternion(new Quaternion()).multiply(bone.quaternion.clone().invert()).multiply(rest);
  return new Vector3(x, y, z).applyQuaternion(frame).applyQuaternion(world.invert()).normalize();
}
const boneName = normalizePokemonBone;

/** Lower outstretched upper arms using the actual rig axes, including mirrored rigs. */
function relaxedArmPose(bone: Object3D, definition: PokemonModelDefinition, frame: Quaternion) {
  const rest = bone.quaternion.clone();
  if (!relaxedArmSpecies.has(definition.number) || !/^[LR](?:Arm|UpperArm)\d*$/.test(boneName(bone.name))) return rest;
  const elbow = bone.children.find(child => /forearm/i.test(boneName(child.name)));
  if (!elbow || !bone.parent) return rest;
  const toFrame = frame.clone().invert();
  const direction = elbow.getWorldPosition(new Vector3()).sub(bone.getWorldPosition(new Vector3())).applyQuaternion(toFrame).normalize();
  // Keep already lowered/posed arms intact; only replace the outstretched bind pose.
  if (Math.abs(direction.y) > 0.65) return rest;
  const target = new Vector3(direction.x, 0, direction.z).normalize().multiplyScalar(0.45);
  target.y = -0.89;
  target.normalize();
  // Directions above are in the model frame; bring them back to world before the parent's space.
  const parentInverse = bone.parent.getWorldQuaternion(new Quaternion()).invert().multiply(frame);
  const from = direction.applyQuaternion(parentInverse);
  const to = target.applyQuaternion(parentInverse);
  return new Quaternion().setFromUnitVectors(from, to).multiply(rest);
}

const ease = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
/** Shared choreography over normalized clip time u (0..1). Every curve returns to 0 at u = 1
 * so clamped one-shots settle on the rest pose. */
export const choreography = {
  // Attack: draw back for 0.28, strike in 0.12, hold, then recover.
  windup: (u: number) => u < 0.28 ? ease(u / 0.28) : 1 - ease((u - 0.28) / 0.12),
  strike: (u: number) => u < 0.28 ? 0 : u < 0.4 ? ease((u - 0.28) / 0.12) : u < 0.55 ? 1 : 1 - ease((u - 0.55) / 0.45),
  // Hit: a sharp flinch, then a damped wobble.
  flinch: (u: number) => u < 0.08 ? ease(u / 0.08) : 1 - ease((u - 0.08) / 0.62),
  recoil: (u: number) => (u < 0.1 ? ease(u / 0.1) : Math.exp(-(u - 0.1) * 5) * Math.cos((u - 0.1) * 9)) * (1 - ease((u - 0.7) / 0.3)),
};
const MOTION_SECONDS = { walk: 0.7, attack: 0.75, hit: 0.6 } as const;

/** Animate around a relaxed pose without mutating the cached model or its bind matrices. */
export function createPokemonFallback(scene: Object3D, root: Group, definition: PokemonModelDefinition, requested: PokemonMotion): AnimationClip {
  if ((requested === "walk" || requested === "run") && !["biped", "quadruped"].includes(POKEMON_LOCOMOTION[definition.number])) {
    return createLocomotion(scene, root, definition, requested);
  }
  if (requested === "run") {
    if (POKEMON_LOCOMOTION[definition.number] === "quadruped") return createGallop(scene, root, definition);
    // Bipeds and others run as a quicker, fuller walk.
    const clip = createPokemonFallback(scene, root, definition, "walk");
    clip.name = `procedural-${definition.number}-run`;
    for (const track of clip.tracks) track.scale(0.5 / 0.7);
    clip.duration = 0.5;
    return clip;
  }
  const motion = requested;
  scene.updateWorldMatrix(true, true);
  const frame = root.getWorldQuaternion(new Quaternion());
  const floating = isSuspended(definition.number);
  const swaying = swayingFamilies.has(definition.family);
  const quadruped = POKEMON_LOCOMOTION[definition.number] === "quadruped";
  const size = Number.isFinite(definition.heightM) ? pokemonDisplayHeight(definition.heightM) : 1;
  const duration = motion === "idle" ? 2.4 + (definition.number % 7) * 0.13 : MOTION_SECONDS[motion as keyof typeof MOTION_SECONDS];
  const times = Array.from({ length: 97 }, (_, i) => duration * i / 96);
  const cycle = (t: number) => t / duration * Math.PI * 2;
  const { windup, strike, flinch, recoil } = choreography;
  // Delayed curves let heads, tails and tips follow through after the body.
  const late = (curve: (u: number) => number, delay: number) => (u: number) => curve(Math.max(0, u - delay) / (1 - delay));
  let spineBones = 0, headBones = 0;
  scene.traverse(bone => {
    if (!(bone as Object3D & { isBone?: boolean }).isBone) return;
    const name = boneName(bone.name);
    if (/^(Spine|Chest)\d*$/i.test(name)) spineBones++;
    if (/^(Head|Neck)[A-Z]?\d*$/i.test(name)) headBones++;
  });
  const tracks: KeyframeTrack[] = [];
  const scalar = (property: string, sample: (t: number, u: number) => number) => tracks.push(new NumberKeyframeTrack(`${root.uuid}.${property}`, times, times.map(t => sample(t, t / duration))));
  const hover = floating ? 0.12 * size : 0;
  const breathe = softFamilies.has(definition.family) ? 0.018 : 0.006;
  const side = definition.number % 2 ? 1 : -1;
  scalar("position[y]", (t, u) => ({
    idle: hover + (1 - Math.cos(cycle(t))) * (floating ? 0.025 * size : 0.004),
    // Two footfalls per stride; flyers glide with a slower swell.
    walk: floating ? hover + (1 - Math.cos(cycle(t))) * 0.03 : Math.abs(Math.sin(cycle(t))) * 0.035 * size,
    attack: hover + (0.012 * windup(u) + 0.04 * strike(u)) * size,
    hit: hover + 0.03 * flinch(u) * size,
  })[motion]);
  scalar("position[z]", (_, u) => motion === "attack" ? (-0.05 * windup(u) + 0.16 * strike(u)) * size : motion === "hit" ? -0.12 * flinch(u) * size : 0);
  scalar("rotation[x]", (t, u) => ({
    idle: 0,
    walk: floating ? 0.08 : 0.03 + Math.sin(cycle(t) * 2) * 0.012,
    attack: -0.14 * windup(u) + 0.2 * strike(u),
    hit: -0.2 * recoil(u),
  })[motion]);
  scalar("rotation[z]", (t, u) => ({
    idle: Math.sin(cycle(t)) * (swaying ? 0.045 : 0.012),
    walk: Math.sin(cycle(t)) * (swaying ? 0.07 : 0.03),
    attack: 0,
    hit: side * 0.1 * recoil(u),
  })[motion]);
  scalar("scale[y]", (t, u) => ({
    idle: 1 + (1 - Math.cos(cycle(t))) * breathe,
    walk: 1 + (1 - Math.cos(cycle(t) * 2)) * breathe,
    attack: 1 - 0.05 * windup(u) + 0.04 * strike(u),
    hit: 1 - 0.07 * flinch(u),
  })[motion]);
  scene.traverse(bone => {
    if (!(bone as Object3D & { isBone?: boolean }).isBone) return;
    const name = boneName(bone.name);
    const R = name.startsWith("R");
    const appendage = appendageMotion(bone, definition.number, frame);
    if (appendage) {
      const { axis, offset, amplitude, phase, frequency, kind } = appendage;
      const cycles = Math.max(1, Math.round(duration * frequency));
      const tip = late(strike, kind === "wing" ? 0 : 0.06);
      const angle = (t: number, u: number) => offset + ({
        idle: Math.sin(cycle(t) * cycles + phase) * amplitude * 0.8,
        walk: Math.sin(cycle(t) * cycles + phase) * amplitude * 1.5,
        // Cock, then whip or beat through; wings keep a flutter.
        attack: amplitude * (-1.6 * windup(u) + 2.4 * tip(u)) + (kind === "wing" ? Math.sin(cycle(t) * 2 + phase) * amplitude * 0.4 : 0),
        hit: amplitude * 2 * late(recoil, 0.04)(u),
      })[motion];
      const rest = bone.quaternion.clone();
      tracks.push(new QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, times,
        times.flatMap(t => rest.clone().multiply(new Quaternion().setFromAxisAngle(axis, angle(t, t / duration))).toArray())));
      return;
    }
    const rest = relaxedArmPose(bone, definition, frame);
    let axis = rigAxis(bone, frame, rest, 1, 0, 0);
    // Angle in radians at clip time t (u = t / duration). X-axis signs: + leans the torso
    // forward or swings a limb back; - raises a limb forward or bends an elbow.
    let angle: ((t: number, u: number) => number) | undefined;
    const stride = (t: number, offset: number) => Math.sin(cycle(t) + offset);
    const flex = (t: number, offset: number) => Math.max(0, stride(t, offset));
    const legPhase = (R ? Math.PI : 0) + (/Arm/.test(name) ? Math.PI : 0);
    if (/^[LR](Thigh|Arm|UpperArm)[A-Z]?\d*$/.test(name)) {
      const arm = /Arm/.test(name);
      const foreleg = arm && quadruped;
      if (arm && !foreleg) {
        // Arms counter-swing on a stride; the right arm leads a punch.
        const lead = R ? 1 : 0.45;
        angle = (t, u) => ({ idle: stride(t, legPhase) * 0.06, walk: stride(t, legPhase) * 0.35, attack: lead * (0.5 * windup(u) - 0.95 * strike(u)), hit: -0.35 * flinch(u) })[motion];
      } else {
        // Legs and forelegs: diagonal gait; brace for an attack, buckle when hit.
        angle = (t, u) => ({
          idle: stride(t, legPhase) * 0.018,
          walk: stride(t, legPhase) * 0.32,
          attack: foreleg ? -0.1 * windup(u) - 0.3 * strike(u) : quadruped ? 0.1 * windup(u) + 0.2 * strike(u) : (R ? -0.25 : 0.12) * strike(u) - 0.08 * windup(u),
          hit: 0.12 * flinch(u),
        })[motion];
      }
    } else if (/^[LR](Leg|ForeArm)[A-Z]?\d*$/i.test(name)) {
      const elbow = /ForeArm/i.test(name) && !quadruped;
      if (elbow) angle = (t, u) => (floating ? 0 : -0.06) + ({ idle: stride(t, legPhase) * 0.02, walk: -0.22 * flex(t, legPhase), attack: -0.9 * windup(u) - 0.1 * strike(u), hit: -0.4 * flinch(u) })[motion];
      // Knees flex on the swing half of a step, crouch into an attack and buckle on a hit.
      else angle = (t, u) => ({ idle: 0.015 * flex(t, legPhase), walk: 0.4 * flex(t, legPhase), attack: 0.35 * windup(u) + 0.08 * strike(u), hit: 0.3 * flinch(u) })[motion];
    } else if (/^[LR](Foot|Hand)[A-Z]?\d*$/i.test(name)) {
      const hand = /Hand/.test(name);
      angle = (t, u) => ({ idle: 0, walk: -0.12 * flex(t, legPhase), attack: hand ? 0.3 * strike(u) : -0.2 * windup(u), hit: hand ? 0.2 * recoil(u) : -0.15 * flinch(u) })[motion];
    } else if (/^(Spine|Chest)\d*$/i.test(name)) {
      const bend = swaying && (motion === "idle" || motion === "walk");
      if (bend) axis = rigAxis(bone, frame, rest, 0, 0, 1);
      angle = (t, u) => ({ idle: stride(t, -0.4) * (bend ? 0.017 : 0.012), walk: Math.sin(cycle(t) * 2 - 0.4) * (bend ? 0.035 : 0.025), attack: (-0.12 * windup(u) + 0.2 * strike(u)) / Math.max(1, spineBones), hit: -0.25 * recoil(u) / Math.max(1, spineBones) })[motion];
    } else if (/^(Head|Neck)[A-Z]?\d*$/i.test(name)) {
      angle = (t, u) => ({ idle: stride(t, -0.65) * 0.02, walk: Math.sin(cycle(t) * 2 - 0.65) * 0.04, attack: (-0.1 * windup(u) + 0.14 * late(strike, 0.04)(u)) / Math.max(1, headBones), hit: -0.3 * late(recoil, 0.03)(u) / Math.max(1, headBones) })[motion];
    } else if (/^[LR]Ear\d*$/i.test(name)) {
      axis = rigAxis(bone, frame, rest, 0, 0, 1);
      angle = (t, u) => (R ? -1 : 1) * ({ idle: stride(t, R ? 1.2 : 0) * 0.025, walk: Math.sin(cycle(t) * 2 + (R ? 1.2 : 0)) * 0.05, attack: -0.15 * windup(u) + 0.1 * strike(u), hit: 0.3 * recoil(u) })[motion];
    } else if (/^Jaw$/i.test(name)) {
      angle = (_, u) => ({ idle: 0, walk: 0, attack: 0.1 * windup(u) + 0.35 * strike(u), hit: 0.2 * flinch(u) })[motion];
    }
    if (!angle) return;
    const sample = angle;
    const values = times.flatMap(t => rest.clone().multiply(new Quaternion().setFromAxisAngle(axis, sample(t, t / duration))).toArray());
    tracks.push(new QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, times, values));
  });
  return new AnimationClip(`procedural-${definition.number}-${motion}`, duration, tracks);
}

/** Authored ground clips must not override a species' chosen travel mode. */
export function selectSpeciesClip(clips: AnimationClip[], motion: PokemonMotion, number: number) {
  const mode = POKEMON_LOCOMOTION[number];
  if (number === 41 && ["idle", "walk", "run"].includes(motion)) {
    const flight = clips.find(clip => clip.name === "Take 001" && clip.duration > 0);
    if (flight && motion === "run") {
      const fast = flight.clone();
      fast.tracks.forEach(track => track.scale(0.75));
      fast.duration *= 0.75;
      return fast;
    }
    return flight;
  }
  if ((motion === "walk" || motion === "run") && mode !== "biped" && mode !== "quadruped") return undefined;
  if (motion === "idle" && mode === "fly") return undefined;
  const selected = selectPokemonClip(clips, motion);
  if (!selected || (motion !== "walk" && motion !== "run")) return selected;
  const travelTracks = selected.tracks.filter(track => {
    const { nodeName, propertyName } = PropertyBinding.parseTrackName(track.name);
    return propertyName === "position" && /^origin$/i.test(boneName(nodeName));
  });
  if (!travelTracks.length) return selected;
  // Gameplay moves the actor. Embedded origin translation otherwise makes it leave its
  // tile/preview and teleport back at the loop seam (Mewtwo travels 7 units per run).
  const inPlace = selected.clone();
  for (const track of inPlace.tracks) if (travelTracks.some(source => source.name === track.name)) {
    const width = track.getValueSize();
    for (let i = width; i < track.values.length; i++) track.values[i] = track.values[i % width];
  }
  return inPlace;
}

/** Non-walking travel: no alternating knees, footfall bounce or arm-as-wing guesses. */
function createLocomotion(scene: Object3D, root: Group, definition: PokemonModelDefinition, motion: "walk" | "run") {
  scene.updateWorldMatrix(true, true);
  const mode = POKEMON_LOCOMOTION[definition.number];
  const frame = root.getWorldQuaternion(new Quaternion());
  const size = Number.isFinite(definition.heightM) ? pokemonDisplayHeight(definition.heightM) : 1;
  const baseDuration = mode === "swim" || mode === "slither" ? 1.2 : 0.9;
  const duration = baseDuration * (motion === "run" ? 0.7 : 1);
  const times = Array.from({ length: 97 }, (_, i) => duration * i / 96);
  const cycle = (t: number) => t / duration * Math.PI * 2;
  const tracks: KeyframeTrack[] = [];
  const scalar = (property: string, sample: (t: number) => number) => tracks.push(new NumberKeyframeTrack(`${root.uuid}.${property}`, times, times.map(sample)));
  const suspended = isSuspended(definition.number);
  // Roll around the model centre, compensating for the floor-level animation root.
  const center = mode === "roll"
    ? new Box3().setFromObject(scene).applyMatrix4(root.matrixWorld.clone().invert()).getCenter(new Vector3()) : new Vector3();
  scalar("position[y]", t => mode === "roll" ? center.y * (1 - Math.cos(cycle(t))) + center.z * Math.sin(cycle(t))
    : suspended ? size * (0.12 + 0.025 * (1 - Math.cos(cycle(t))))
    : mode === "hop" ? size * 0.07 * (1 - Math.cos(cycle(t)))
    : mode === "crawl" ? size * 0.003 * (1 - Math.cos(cycle(t) * 2)) : 0);
  scalar("position[z]", t => mode === "roll" ? center.z * (1 - Math.cos(cycle(t))) - center.y * Math.sin(cycle(t)) : 0);
  scalar("rotation[x]", t => mode === "roll" ? cycle(t) : mode === "fly" ? 0.04 : mode === "hop" ? 0.05 * Math.sin(cycle(t)) : 0);
  scalar("rotation[z]", t => Math.sin(cycle(t)) * (mode === "burrow" ? 0.018 : suspended ? 0.012 : 0));
  scalar("scale[y]", t => 1 + (1 - Math.cos(cycle(t))) * (mode === "ooze" ? -0.035 : mode === "hop" ? -0.018 : 0));
  scalar("scale[x]", t => 1 + (1 - Math.cos(cycle(t))) * (mode === "ooze" ? 0.018 : 0));
  scene.traverse(bone => {
    if (!(bone as Object3D & { isBone?: boolean }).isBone) return;
    const name = boneName(bone.name);
    const rest = relaxedArmPose(bone, definition, frame);
    const appendage = appendageMotion(bone, definition.number, frame);
    const side = name.startsWith("R") ? -1 : 1;
    const segment = Number(name.match(/\d+$/)?.[0] ?? 1);
    let axis = rigAxis(bone, frame, rest, 1, 0, 0);
    let angle: (t: number) => number = () => 0;
    if (appendage) {
      axis = appendage.axis;
      const beats = appendage.kind === "wing" ? Math.max(1, Math.round(baseDuration * appendage.frequency)) : 1;
      angle = t => appendage.offset + Math.sin(cycle(t) * beats + appendage.phase) * appendage.amplitude * (appendage.kind === "wing" ? 1.5 : 1.2);
      // Fish and snakes propagate a lateral wave along the tail, rather than pitching it.
      if (appendage.kind === "tail" && (mode === "swim" || mode === "slither")) {
        axis = rigAxis(bone, frame, rest, 0, 1, 0);
        angle = t => Math.sin(cycle(t) - segment * 0.55) * (definition.number === 130 ? 0.07 : 0.11);
      }
    } else if ((mode === "swim" || mode === "slither" || mode === "crawl") && /^(Spine|Bone)\d+$/i.test(name)) {
      axis = rigAxis(bone, frame, rest, 0, mode === "crawl" ? 0 : 1, mode === "crawl" ? 1 : 0);
      angle = t => Math.sin(cycle(t) - segment * 0.55) * (mode === "crawl" ? 0.035 : 0.045);
    } else if (mode === "swim" && /^[LR](Arm|ForeArm|Hand)\d*$/i.test(name)) {
      // Fins paddle together; never interpret them as alternating walking arms.
      axis = rigAxis(bone, frame, rest, 0, 0, 1);
      angle = t => side * Math.sin(cycle(t) - segment * 0.3) * 0.14;
    } else if ((mode === "swim" || mode === "crawl") && /^[LR]Feeler[A-Z]?\d*$/i.test(name)) {
      angle = t => Math.sin(cycle(t) - segment * 0.5 + (side < 0 ? Math.PI : 0)) * 0.1;
    } else if (mode === "crawl" && /^[LR](Thigh|Leg|Foot|Arm|ForeArm|Hand)[A-Z]?\d*$/i.test(name)) {
      // Stagger adjacent pairs, including Paras' second rear legs and Weedle's feet.
      const pair = name.match(/(?:Thigh|Leg|Foot|Arm|ForeArm|Hand)([A-Z])/i)?.[1];
      const phase = (side < 0 ? Math.PI : 0) + (pair ? pair.charCodeAt(0) * 0.8 : segment * 1.3);
      angle = t => Math.sin(cycle(t) + phase) * 0.2;
    } else if (/^(Head|Neck)\d*$/i.test(name)) {
      angle = t => Math.sin(cycle(t) - 0.4) * 0.015;
    }
    // Constant tracks hold feet/arms in their own rest pose and clear the previous action.
    tracks.push(new QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, times,
      times.flatMap(t => rest.clone().multiply(new Quaternion().setFromAxisAngle(axis, angle(t))).toArray())));
  });
  return new AnimationClip(`procedural-${definition.number}-${motion}`, duration, tracks);
}

export function createPokemonAnimator(scene: Object3D, root: Group, definition: PokemonModelDefinition, clips: AnimationClip[]) {
  const mixer = new AnimationMixer(root);
  // Capture every fallback from the rest pose before any action changes bones.
  const available = new Map<PokemonAction, AnimationClip>();
  for (const motion of ["idle", "walk", "run", "attack", "hit"] as const) {
    available.set(motion, selectSpeciesClip(clips, motion, definition.number) ?? createPokemonFallback(scene, root, definition, motion));
  }
  // Move clips are built on first use, from this rest pose rather than whatever pose is playing.
  const restPose: { node: Object3D; position: Vector3; quaternion: Quaternion; scale: Vector3 }[] = [];
  root.traverse(node => { if (node === root || (node as Object3D & { isBone?: boolean }).isBone) restPose.push({ node, position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone() }); });
  const clipFor = (action: PokemonAction) => {
    let clip = available.get(action);
    if (clip || !action.startsWith("move:")) return clip!;
    const playing = restPose.map(({ node }) => ({ node, position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone() }));
    const apply = (pose: typeof restPose) => { for (const { node, position, quaternion, scale } of pose) { node.position.copy(position); node.quaternion.copy(quaternion); node.scale.copy(scale); } root.updateWorldMatrix(true, true); };
    apply(restPose);
    clip = createMoveClip(scene, root, definition, action.slice(5));
    apply(playing);
    available.set(action, clip);
    return clip;
  };
  const actions = new Map<PokemonAction, AnimationAction>();
  let current: AnimationAction | undefined;
  let state: PokemonAction | undefined;
  const oneShot = (motion?: PokemonAction) => motion === "attack" || motion === "hit" || !!motion?.startsWith("move:");
  const isAttack = (motion?: PokemonAction) => motion === "attack" || !!motion?.startsWith("move:");
  return {
    getPlayback() { return { action: state, time: current?.time ?? 0, duration: current?.getClip().duration ?? 1 }; },
    update(requested: PokemonAction, delta: number, paused = false) {
      if (paused) return;
      // Battle flags are shorter than a full attack, so a started one-shot plays out.
      // Only a hit may cut an attack short.
      const finishing = oneShot(state) && current?.isRunning() && !(requested === "hit" && isAttack(state));
      const motion = finishing ? state! : requested;
      if (state !== motion) {
        let next = actions.get(motion);
        if (!next) {
          next = mixer.clipAction(clipFor(motion));
          actions.set(motion, next);
        }
        next.reset().setEffectiveWeight(1);
        next.setLoop(oneShot(motion) ? LoopOnce : LoopRepeat, oneShot(motion) ? 1 : Infinity);
        next.clampWhenFinished = oneShot(motion);
        next.play();
        if (current) next.fadeIn(oneShot(motion) ? 0.08 : 0.18);
        current?.fadeOut(oneShot(motion) ? 0.08 : 0.18);
        current = next;
        state = motion;
      }
      mixer.update(Math.max(0, Math.min(delta, 0.1)));
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); },
  };
}

const CHANNELS: MoveChannel[] = ["lunge", "hop", "slide", "lean", "roll", "spin", "swell", "squash", "spine", "head", "jaw", "leadArm", "offArm", "leadElbow", "offElbow", "kick", "knee", "crouch", "tail", "wings", "parts", "ears", "tremble", "shake", "flap", "wag"];
type Pose = Record<MoveChannel, number>;
function poseAt(keys: MovePose[], u: number): Pose {
  const pose = {} as Pose;
  const timeline = [{ t: 0 }, ...keys, { t: 1 }] as MovePose[];
  let i = 0;
  while (i < timeline.length - 2 && timeline[i + 1].t <= u) i++;
  const a = timeline[i], b = timeline[i + 1];
  const f = ease((u - a.t) / Math.max(1e-6, b.t - a.t));
  for (const channel of CHANNELS) pose[channel] = (a[channel] ?? 0) + ((b[channel] ?? 0) - (a[channel] ?? 0)) * f;
  return pose;
}

/** Sample a move's recorded movement: multi-hit moves repeat the strike span, alternating
 * the lead and off limbs, and blend each repeat in from the previous follow-through. */
export function moveTimeline(moveId: string) {
  const animation = moveAnimationFor(moveId);
  const archetype = MOVE_ARCHETYPES[animation.archetype];
  const hits = Math.max(1, animation.hits ?? 1);
  const [a, b] = archetype.strike;
  const span = b - a;
  const total = 1 + (hits - 1) * span;
  const intensity = animation.intensity ?? 1;
  const duration = archetype.seconds * (animation.speed ?? 1) * total;
  const swap = (pose: Pose) => ({ ...pose, leadArm: pose.offArm, offArm: pose.leadArm, leadElbow: pose.offElbow, offElbow: pose.leadElbow });
  const sample = (u: number): Pose => {
    const time = u * total;
    let pose: Pose;
    if (hits === 1 || time <= a) pose = poseAt(archetype.keys, Math.min(time, 1));
    else if (time >= a + hits * span) pose = poseAt(archetype.keys, time - (hits - 1) * span);
    else {
      const repeat = Math.floor((time - a) / span);
      const local = (time - a - repeat * span) / span;
      pose = poseAt(archetype.keys, a + local * span);
      if (repeat % 2 === 1) pose = swap(pose);
      if (repeat > 0 && local < 0.3) {
        // The previous repeat's follow-through, with its own lead limb.
        const previous = poseAt(archetype.keys, b);
        const from = (repeat - 1) % 2 === 1 ? swap(previous) : previous;
        const blend = ease(local / 0.3);
        for (const channel of CHANNELS) pose[channel] = from[channel] + (pose[channel] - from[channel]) * blend;
      }
    }
    if (intensity !== 1) for (const channel of CHANNELS) if (channel !== "spin") pose[channel] *= intensity;
    return pose;
  };
  return { animation, archetype, duration, sample };
}

/** Build a move's clip for any rig from its recorded movement (see moveAnimations.ts). */
export function createMoveClip(scene: Object3D, root: Group, definition: PokemonModelDefinition, moveId: string) {
  scene.updateWorldMatrix(true, true);
  const frame = root.getWorldQuaternion(new Quaternion());
  const { duration, sample } = moveTimeline(moveId);
  const floating = isSuspended(definition.number);
  const quadruped = POKEMON_LOCOMOTION[definition.number] === "quadruped";
  const size = Number.isFinite(definition.heightM) ? pokemonDisplayHeight(definition.heightM) : 1;
  const count = Math.max(61, Math.round(duration * 80));
  const times = Array.from({ length: count }, (_, i) => duration * i / (count - 1));
  const poses = times.map(t => sample(t / duration));
  const wave = (t: number, hertz: number, phase = 0) => Math.sin(2 * Math.PI * hertz * t + phase);
  const tracks: KeyframeTrack[] = [];
  const scalar = (property: string, value: (pose: Pose, t: number) => number) => tracks.push(new NumberKeyframeTrack(`${root.uuid}.${property}`, times, poses.map((pose, i) => value(pose, times[i]))));
  const hover = floating ? 0.12 * size : 0;
  scalar("position[x]", (p, t) => (p.slide + p.tremble * 0.5 * wave(t, 23)) * size);
  scalar("position[y]", p => hover + p.hop * size);
  scalar("position[z]", p => p.lunge * size);
  scalar("rotation[x]", p => p.lean);
  scalar("rotation[y]", p => p.spin * Math.PI * 2);
  scalar("rotation[z]", (p, t) => p.roll + p.tremble * wave(t, 18) + p.shake * wave(t, 4));
  scalar("scale[x]", p => 1 + p.swell);
  scalar("scale[y]", p => 1 + p.swell + p.squash);
  scalar("scale[z]", p => 1 + p.swell);
  // Head/neck and spine chains share their channel so long necks don't over-rotate.
  let headBones = 0, spineBones = 0;
  scene.traverse(bone => { if (!(bone as Object3D & { isBone?: boolean }).isBone) return; const name = boneName(bone.name); if (/^(Head|Neck)[A-Z]?\d*$/i.test(name)) headBones++; if (/^(Spine|Chest)\d*$/i.test(name)) spineBones++; });
  scene.traverse(bone => {
    if (!(bone as Object3D & { isBone?: boolean }).isBone) return;
    const name = boneName(bone.name);
    const lead = name.startsWith("R");
    const appendage = appendageMotion(bone, definition.number, frame);
    const rest = relaxedArmPose(bone, definition, frame);
    let axis = rigAxis(bone, frame, rest, 1, 0, 0);
    let angle: ((pose: Pose, t: number) => number) | undefined;
    if (appendage) {
      axis = appendage.axis;
      const { offset, amplitude, phase, kind } = appendage;
      angle = kind === "wing"
        ? (p, t) => offset + amplitude * (p.wings * 1.2 + p.flap * wave(t, 6, phase))
        : kind === "tail"
          ? (p, t) => offset + amplitude * (p.tail * 2.5 + p.wag * 3 * wave(t, 5, phase) + p.parts * 0.5)
          : (p, t) => offset + amplitude * (p.parts * 3 + p.tail * 1.5 + p.flap * 2 * wave(t, 6, phase));
    } else if (/^[LR](Arm|UpperArm)[A-Z]?\d*$/.test(name)) {
      const raise = (p: Pose) => lead ? p.leadArm : p.offArm;
      angle = p => -raise(p) * (quadruped ? 0.5 : 1);
    } else if (/^[LR]ForeArm[A-Z]?\d*$/i.test(name)) {
      const bend = (p: Pose) => lead ? p.leadElbow : p.offElbow;
      angle = quadruped ? p => bend(p) * 0.5 + p.crouch * 0.7 : p => -bend(p);
    } else if (/^[LR]Thigh[A-Z]?\d*$/.test(name)) {
      // Quadrupeds buck backward with the hind legs; bipeds kick forward.
      angle = p => (lead ? (quadruped ? p.kick * 0.6 : -p.kick) : 0) - p.crouch * 0.35;
    } else if (/^[LR]Leg[A-Z]?\d*$/i.test(name)) {
      angle = p => p.crouch * 0.7 + (lead ? p.knee : 0);
    } else if (/^[LR]Foot[A-Z]?\d*$/i.test(name)) {
      angle = p => -p.crouch * 0.35;
    } else if (/^(Spine|Chest)\d*$/i.test(name)) {
      angle = p => p.spine / Math.max(1, spineBones);
    } else if (/^(Head|Neck)[A-Z]?\d*$/i.test(name)) {
      angle = p => p.head / Math.max(1, headBones) * (headBones > 1 ? 1.5 : 1);
    } else if (/^[LR]Ear\d*$/i.test(name)) {
      axis = rigAxis(bone, frame, rest, 0, 0, 1);
      angle = p => (lead ? -1 : 1) * p.ears;
    } else if (/^Jaw$/i.test(name)) {
      angle = p => p.jaw * 0.7;
    }
    if (!angle) return;
    const sampleAngle = angle;
    tracks.push(new QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, times, poses.flatMap((pose, i) => rest.clone().multiply(new Quaternion().setFromAxisAngle(axis, sampleAngle(pose, times[i]))).toArray())));
  });
  return new AnimationClip(`move-${definition.number}-${moveId}`, duration, tracks);
}

// Dogs and cats gallop with a flexible spine (rotary); horses and others keep a stiff back (transverse).
const rotaryGallopers = new Set([37, 38, 52, 53, 58, 59, 133, 134, 135, 136]);

/** A gallop for four-legged rigs. Rotary (dog): LH, RH, RF, LF with two airborne phases and a
 * spine that flexes when the legs gather and extends when they reach. Transverse (horse):
 * LH, RH, LF, RF with one gathered airborne phase and a stiff back but a pumping neck. */
export function createGallop(scene: Object3D, root: Group, definition: PokemonModelDefinition) {
  scene.updateWorldMatrix(true, true);
  const frame = root.getWorldQuaternion(new Quaternion());
  const rotary = rotaryGallopers.has(definition.number);
  const size = Number.isFinite(definition.heightM) ? pokemonDisplayHeight(definition.heightM) : 1;
  const duration = rotary ? 0.45 : 0.5;
  const samples = 97;
  const us = Array.from({ length: samples }, (_, i) => i / (samples - 1));
  const times = us.map(u => u * duration);
  const stance = rotary ? 0.28 : 0.3;
  const footfall: Record<string, number> = rotary
    ? { LThigh: 0, RThigh: 0.08, RArm: 0.5, LArm: 0.58 }
    : { LThigh: 0, RThigh: 0.12, LArm: 0.3, RArm: 0.42 };
  const wrap = (u: number) => ((u % 1) + 1) % 1;
  const phaseOf = (limb: string, u: number) => wrap(u - footfall[limb]);
  // Contact sweeps the foot from forward (-) to back (+); the swing brings it forward again.
  const sweep = (p: number, reach: number) => p < stance ? -reach + 2 * reach * p / stance : reach - 2 * reach * ease((p - stance) / (1 - stance));
  const fold = (p: number, bend: number) => p < stance ? Math.sin(Math.PI * p / stance) * 0.12 : Math.sin(Math.PI * (p - stance) / (1 - stance)) * bend;
  // Airborne when no foot is down; smoothed so the body floats rather than pops.
  const airborne = us.map(u => Object.keys(footfall).some(limb => phaseOf(limb, u) < stance) ? 0 : 1);
  const lift = airborne.map((_, i) => { let sum = 0; for (let k = -6; k <= 6; k++) sum += airborne[(i + k + samples - 1) % (samples - 1)]; return sum / 13; });
  const hindStrike = (footfall.LThigh + footfall.RThigh) / 2, foreStrike = rotary ? (footfall.RArm + footfall.LArm) / 2 : (footfall.LArm + footfall.RArm) / 2;
  const tracks: KeyframeTrack[] = [];
  const scalar = (property: string, sample: (u: number, i: number) => number) => tracks.push(new NumberKeyframeTrack(`${root.uuid}.${property}`, times, us.map(sample)));
  const pitch = rotary ? 0.09 : 0.07;
  scalar("position[y]", (_, i) => (0.006 + lift[i] * 0.06) * size);
  scalar("position[z]", () => 0);
  // Front rises as the hind legs land and dips as the forelegs land.
  scalar("rotation[x]", u => -pitch * Math.cos(2 * Math.PI * (u - hindStrike)) + 0.04);
  scalar("rotation[z]", u => Math.sin(2 * Math.PI * u) * 0.015);
  scalar("scale[y]", (_, i) => 1 + (lift[i] - 0.5) * 0.02);
  scene.traverse(bone => {
    if (!(bone as Object3D & { isBone?: boolean }).isBone) return;
    const name = boneName(bone.name);
    const appendage = appendageMotion(bone, definition.number, frame);
    const rest = bone.quaternion.clone();
    let axis = rigAxis(bone, frame, rest, 1, 0, 0);
    let angle: ((u: number) => number) | undefined;
    if (appendage) {
      // Tails and parts bounce once per stride, a little behind the body.
      axis = appendage.axis;
      angle = u => appendage.offset + Math.sin(2 * Math.PI * u + appendage.phase - 0.8) * appendage.amplitude * 1.3;
    } else if (/^[LR](Thigh|Arm)$/.test(name)) {
      const fore = name.endsWith("Arm");
      const reach = fore ? (rotary ? 0.7 : 0.6) : (rotary ? 0.62 : 0.55);
      angle = u => sweep(phaseOf(name, u), reach);
    } else if (/^[LR]Shoulder$/.test(name)) {
      // The shoulder blade rotates with the foreleg and lengthens its reach.
      const limb = `${name[0]}Arm`;
      angle = u => 0.35 * sweep(phaseOf(limb, u), 0.6);
    } else if (/^[LR](Leg|ForeArm)$/.test(name)) {
      const fore = name.endsWith("ForeArm");
      const limb = `${name[0]}${fore ? "Arm" : "Thigh"}`;
      angle = u => fold(phaseOf(limb, u), fore ? 1.0 : 0.9);
    } else if (/^[LR](Foot|Hand)$/.test(name)) {
      const limb = `${name[0]}${name.endsWith("Hand") ? "Arm" : "Thigh"}`;
      angle = u => -0.45 * fold(phaseOf(limb, u), 1);
    } else if (/^(Spine|Chest)\d*$/i.test(name)) {
      // Flexed (arched) as the hind legs gather under the body, extended as they push off.
      const flex = rotary ? 0.14 : 0.04;
      angle = u => flex * Math.cos(2 * Math.PI * (u - wrap(hindStrike - 0.07)));
    } else if (/^Neck[A-Z]?\d*$/i.test(name)) {
      // Horses pump the neck; the head drops as the forelegs land.
      const pump = rotary ? 0.05 : 0.1;
      angle = u => pump * Math.cos(2 * Math.PI * (u - foreStrike));
    } else if (/^Head$/i.test(name)) {
      // The head counter-rotates to keep the gaze level.
      angle = u => pitch * 0.8 * Math.cos(2 * Math.PI * (u - hindStrike)) - (rotary ? 0.03 : 0.07) * Math.cos(2 * Math.PI * (u - foreStrike));
    } else if (/^[LR]Ear\d*$/i.test(name)) {
      axis = rigAxis(bone, frame, rest, 0, 0, 1);
      angle = u => (name.startsWith("R") ? 1 : -1) * (0.12 + Math.sin(4 * Math.PI * u) * 0.03);
    } else if (/^Jaw$/i.test(name) && rotary) {
      angle = () => 0.08;
    }
    if (!angle) return;
    const sample = angle;
    tracks.push(new QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, times, us.flatMap(u => rest.clone().multiply(new Quaternion().setFromAxisAngle(axis, sample(u))).toArray())));
  });
  return new AnimationClip(`procedural-${definition.number}-run`, duration, tracks);
}
