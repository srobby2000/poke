import { AnimationClip, AnimationMixer, Group, NumberKeyframeTrack, Quaternion, QuaternionKeyframeTrack, Vector3 } from "three";
import type { AnimationAction, KeyframeTrack, Object3D } from "three";
import { appendageMotion } from "./pokemonAppendages";
import type { PokemonModelDefinition } from "./pokemonModels";

export type PokemonMotion = "idle" | "walk" | "attack" | "hit";

/** Unknown embedded actions can be attacks/entrances; only use known ambient loops. */
export function selectPokemonClip(clips: AnimationClip[], motion: PokemonMotion) {
  const patterns: Record<PokemonMotion, RegExp[]> = {
    idle: [/defaultwait|battlewait/i, /idle/i],
    walk: [/walk/i, /run/i],
    attack: [/attack01|fight_b|impactrueno/i, /attack|fight/i],
    hit: [/damage01/i, /damage|hit/i],
  };
  for (const pattern of patterns[motion]) {
    const clip = clips.find(candidate => candidate.duration > 0 && pattern.test(candidate.name));
    if (clip) return clip;
  }
  return undefined;
}

const floatingFamilies = new Set(["butterfly", "bee", "bat", "moth", "jellyfish", "magnet", "ghost", "gas", "fish", "seahorse", "pterosaur"]);
const swayingFamilies = new Set(["snake", "rocksnake", "serpent", "caterpillar", "cocoon", "flower", "bell", "vine"]);
const softFamilies = new Set(["sludge", "blob", "sleeper", "eggs"]);

// These species use arms as arms, not forelegs or flight surfaces.
const relaxedArmSpecies = new Set([
  4, 5, 6, 7, 8, 9, 25, 26, 27, 28, 31, 34, 35, 36, 39, 40, 52,
  54, 55, 56, 57, 61, 62, 63, 64, 65, 66, 67, 68, 74, 75, 80, 94,
  96, 97, 104, 105, 106, 107, 108, 112, 113, 115, 122, 124, 125, 126,
  127, 143, 149, 150, 151,
]);
const boneName = (name: string) => name.replace(/^\d+[ _]?/, "").replace(/_\d+$/, "").replace(/_/g, "");

/** Lower outstretched upper arms using the actual rig axes, including mirrored rigs. */
function relaxedArmPose(bone: Object3D, definition: PokemonModelDefinition) {
  const rest = bone.quaternion.clone();
  if (!relaxedArmSpecies.has(definition.number) || !/^[LR](?:Arm|UpperArm)\d*$/.test(boneName(bone.name))) return rest;
  const elbow = bone.children.find(child => /forearm/i.test(boneName(child.name)));
  if (!elbow || !bone.parent) return rest;
  const direction = elbow.getWorldPosition(new Vector3()).sub(bone.getWorldPosition(new Vector3())).normalize();
  // Keep already lowered/posed arms intact; only replace the outstretched bind pose.
  if (Math.abs(direction.y) > 0.65) return rest;
  const target = new Vector3(direction.x, 0, direction.z).normalize().multiplyScalar(0.45);
  target.y = -0.89;
  target.normalize();
  const parentInverse = bone.parent.getWorldQuaternion(new Quaternion()).invert();
  const from = direction.applyQuaternion(parentInverse);
  const to = target.applyQuaternion(parentInverse);
  return new Quaternion().setFromUnitVectors(from, to).multiply(rest);
}

/** Animate around a relaxed pose without mutating the cached model or its bind matrices. */
export function createPokemonFallback(scene: Object3D, root: Group, definition: PokemonModelDefinition, motion: PokemonMotion) {
  scene.updateWorldMatrix(true, true);
  const floating = floatingFamilies.has(definition.family) || [6, 144, 145, 146, 151].includes(definition.number);
  const swaying = swayingFamilies.has(definition.family);
  const duration = motion === "walk" ? 0.7 : motion === "attack" || motion === "hit" ? 0.5 : 2.4 + (definition.number % 7) * 0.13;
  const times = Array.from({ length: 97 }, (_, i) => duration * i / 96);
  const cycle = (t: number) => t / duration * Math.PI * 2;
  const tracks: KeyframeTrack[] = [];
  const scalar = (property: string, sample: (t: number) => number) => tracks.push(new NumberKeyframeTrack(`${root.uuid}.${property}`, times, times.map(sample)));
  scalar("position[y]", t => (1 - Math.cos(cycle(t))) * (floating ? 0.045 : motion === "walk" ? 0.025 : 0.004));
  scalar("rotation[z]", t => Math.sin(cycle(t)) * (motion === "hit" ? 0.12 : swaying ? 0.045 : 0.012));
  scalar("rotation[x]", t => motion === "attack" ? -Math.sin(cycle(t) / 2) * 0.22 : 0);
  scalar("scale[y]", t => 1 + (1 - Math.cos(cycle(t))) * (softFamilies.has(definition.family) ? 0.018 : 0.006));
  scene.traverse(bone => {
    if (!(bone as Object3D & { isBone?: boolean }).isBone) return;
    const name = boneName(bone.name);
    const appendage = appendageMotion(bone, definition.number);
    if (appendage) {
      const { axis, offset, amplitude, phase, frequency } = appendage;
      const cycles = Math.max(1, Math.round(duration * frequency));
      const rest = bone.quaternion.clone();
      const values = times.flatMap(t => rest.clone().multiply(new Quaternion().setFromAxisAngle(axis,
        offset + Math.sin(cycle(t) * cycles + phase) * amplitude)).toArray());
      tracks.push(new QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, times, values));
      return;
    }
    let axis = new Vector3(1, 0, 0);
    let amplitude = 0;
    let phase = 0;
    if (/^[LR](Thigh|Arm|UpperArm)\d*$/.test(name)) {
      amplitude = motion === "walk" ? 0.3 : /Arm/.test(name) ? 0.065 : 0.018;
      phase = name.startsWith("R") ? Math.PI : 0;
      if (/Arm/.test(name)) { phase += Math.PI; axis = new Vector3(0, 0, 1); }
      if (floating && /Arm/.test(name)) { axis = new Vector3(0, 0, 1); amplitude = 0.18; }

    } else if (/^Head$/i.test(name)) { amplitude = 0.025; }
    if (!amplitude) return;
    const rest = relaxedArmPose(bone, definition);
    const values = times.flatMap(t => rest.clone().multiply(new Quaternion().setFromAxisAngle(axis, Math.sin(cycle(t) + phase) * amplitude)).toArray());
    tracks.push(new QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, times, values));
  });
  return new AnimationClip(`procedural-${definition.number}-${motion}`, duration, tracks);
}

export function createPokemonAnimator(scene: Object3D, root: Group, definition: PokemonModelDefinition, clips: AnimationClip[]) {
  const mixer = new AnimationMixer(root);
  // Capture every fallback from the rest pose before any action changes bones.
  const available = new Map<PokemonMotion, AnimationClip>();
  for (const motion of ["idle", "walk", "attack", "hit"] as const) {
    available.set(motion, (definition.number === 41 && motion === "idle" ? clips.find(clip => clip.name === "Take 001") : selectPokemonClip(clips, motion)) ?? createPokemonFallback(scene, root, definition, motion));
  }
  const actions = new Map<PokemonMotion, AnimationAction>();
  let current: AnimationAction | undefined;
  let state: PokemonMotion | undefined;
  return {
    update(motion: PokemonMotion, delta: number, paused = false) {
      if (paused) return;
      if (state !== motion) {
        let next = actions.get(motion);
        if (!next) {
          next = mixer.clipAction(available.get(motion)!);
          actions.set(motion, next);
        }
        next.reset().setEffectiveWeight(1).play();
        if (current) next.fadeIn(0.18);
        current?.fadeOut(0.18);
        current = next;
        state = motion;
      }
      mixer.update(Math.min(delta, 0.1));
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); },
  };
}
