import { describe, expect, it } from "vitest";
import { AnimationClip, Bone, Group, NumberKeyframeTrack, QuaternionKeyframeTrack } from "three";
import { choreography, createGallop, createPokemonAnimator, selectPokemonClip } from "./pokemonAnimation";
import { POKEMON_MODELS } from "./pokemonModels";

it("chooses state-specific clips without treating attacks or entrances as idle", () => {
  const clips = ["Chariard_dizzy", "Impactrueno", "bd_appear", "defaultidle01", "defaultwait01_loop", "001walk", "damage01"].map(name => new AnimationClip(name, 1, []));
  expect(selectPokemonClip(clips, "idle")?.name).toBe("defaultwait01_loop");
  expect(selectPokemonClip(clips, "walk")?.name).toBe("001walk");
  expect(selectPokemonClip(clips, "hit")?.name).toBe("damage01");
  expect(selectPokemonClip(clips.slice(0, 3), "idle")).toBeUndefined();
});

describe("procedural coverage", () => {
  for (const [species, definition] of Object.entries(POKEMON_MODELS)) {
    it(`animates ${species} through idle, movement, attack and hit`, () => {
      const root = new Group();
      const scene = new Group();
      const bone = new Bone();
      bone.name = "006 LThigh";
      bone.rotation.x = 0.4;
      scene.add(bone); root.add(scene);
      const animator = createPokemonAnimator(scene, root, definition, []);
      for (const state of ["idle", "walk", "attack", "hit"] as const) {
        for (let frame = 0; frame < 10; frame++) animator.update(state, 1 / 60);
        expect(root.position.y).toBeGreaterThan(0);
        expect([...root.position.toArray(), ...bone.quaternion.toArray()].every(Number.isFinite)).toBe(true);
      }
      const position = root.position.clone();
      animator.update("idle", 0.1, true);
      expect(root.position.equals(position)).toBe(true);
      animator.dispose();
      expect(bone.rotation.x).toBeCloseTo(0.4);
      expect(root.scale.y).toBe(1);
    });
  }
});

it("preserves authored bone animation instead of overwriting it with procedural legs", () => {
  const root = new Group();
  const scene = new Group();
  const bone = new Bone(); bone.name = "LThigh";
  scene.add(bone); root.add(scene);
  const clip = new AnimationClip("idle", 1, [new QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, [0, 1], [0, 0, 0, 1, 0.5, 0, 0, Math.sqrt(0.75)])]);
  const animator = createPokemonAnimator(scene, root, POKEMON_MODELS.bulbasaur, [clip]);
  for (let frame = 0; frame < 30; frame++) animator.update("idle", 1 / 60);
  expect(bone.rotation.x).toBeGreaterThan(0.4);
  animator.dispose();
});

it("moves mount forelegs forward and back in a diagonal trot", () => {
  const root = new Group();
  const scene = new Group();
  const foreleg = new Bone(); foreleg.name = "LArm";
  const hindleg = new Bone(); hindleg.name = "LThigh";
  const knee = new Bone(); knee.name = "LLeg";
  scene.add(foreleg, hindleg, knee); root.add(scene);
  const animator = createPokemonAnimator(scene, root, POKEMON_MODELS.arcanine, []);
  animator.update("walk", 0.1);
  expect(Math.abs(foreleg.rotation.x)).toBeGreaterThan(0.1);
  expect(foreleg.rotation.z).toBeCloseTo(0);
  expect(foreleg.rotation.x * hindleg.rotation.x).toBeLessThan(0);
  expect(Math.abs(knee.rotation.x)).toBeGreaterThan(0.01);
  animator.dispose();
});

it("plays a held attack once and crossfades back to idle", () => {
  const scene = new Group(); const root = new Group(); root.add(scene);
  const animator = createPokemonAnimator(scene, root, POKEMON_MODELS.squirtle, []);
  for (let i = 0; i < 60; i++) animator.update("attack", 1 / 60);
  const after = root.rotation.x;
  for (let i = 0; i < 15; i++) animator.update("attack", 1 / 60);
  expect(root.rotation.x).toBeCloseTo(after);
  expect(root.rotation.x).toBeCloseTo(0);
  for (let i = 0; i < 20; i++) animator.update("idle", 1 / 60);
  expect(root.position.y).toBeGreaterThan(0);
  animator.dispose();
});

it("choreography starts and ends at rest, winds up before it strikes and flinches at once", () => {
  for (const curve of Object.values(choreography)) {
    expect(curve(0)).toBeCloseTo(0);
    expect(curve(1)).toBeCloseTo(0);
  }
  expect(choreography.windup(0.28)).toBeCloseTo(1);
  expect(choreography.strike(0.2)).toBe(0);
  expect(choreography.strike(0.45)).toBeCloseTo(1);
  expect(choreography.flinch(0.08)).toBeCloseTo(1);
  expect(choreography.recoil(0.1)).toBeCloseTo(1);
});

it("finishes a started attack after a short battle pulse, but lets a hit interrupt it", () => {
  const scene = new Group(); const root = new Group(); root.add(scene);
  const animator = createPokemonAnimator(scene, root, POKEMON_MODELS.machop, []);
  for (let i = 0; i < 12; i++) animator.update("attack", 1 / 60);
  // The battle flag drops after ~0.2 s; the lunge still arrives.
  let lunge = 0;
  for (let i = 0; i < 20; i++) { animator.update("idle", 1 / 60); lunge = Math.max(lunge, root.position.z); }
  expect(lunge).toBeGreaterThan(0.05);
  animator.update("hit", 1 / 60);
  for (let i = 0; i < 10; i++) animator.update("hit", 1 / 60);
  expect(root.position.z).toBeLessThan(0);
  animator.dispose();
});

describe("mount gallop", () => {
  const rig = () => {
    const scene = new Group(); const root = new Group(); root.add(scene);
    const bones = Object.fromEntries(["Spine1", "LThigh", "RThigh", "LArm", "RArm", "LLeg"].map(name => { const bone = new Bone(); bone.name = name; scene.add(bone); return [name, bone]; }));
    return { scene, root, bones };
  };
  // When each limb is furthest forward (its footfall), from the quaternion's x component.
  const strikeTimes = (clip: AnimationClip, bones: Record<string, Bone>) => Object.fromEntries(Object.entries(bones).map(([name, bone]) => {
    const track = clip.tracks.find(t => t.name === `${bone.uuid}.quaternion`)!;
    let best = 0;
    for (let i = 0; i < track.times.length; i++) if (track.values[i * 4] < track.values[best * 4]) best = i;
    return [name, track.times[best] / clip.duration];
  }));

  it("gives Arcanine a rotary gallop: hind pair, then forelegs in rotary order, with a flexing spine and lift", () => {
    const { scene, root, bones } = rig();
    const clip = createGallop(scene, root, POKEMON_MODELS.arcanine);
    const strikes = strikeTimes(clip, { LThigh: bones.LThigh, RThigh: bones.RThigh, RArm: bones.RArm, LArm: bones.LArm });
    expect(strikes.LThigh).toBeLessThan(strikes.RThigh);
    expect(strikes.RThigh).toBeLessThan(strikes.RArm);
    expect(strikes.RArm).toBeLessThan(strikes.LArm);
    const spine = clip.tracks.find(t => t.name === `${bones.Spine1.uuid}.quaternion`)!;
    const spineX = Array.from({ length: spine.times.length }, (_, i) => spine.values[i * 4]);
    expect(Math.max(...spineX) - Math.min(...spineX)).toBeGreaterThan(0.1);
    const lift = clip.tracks.find(t => t.name === `${root.uuid}.position[y]`) as NumberKeyframeTrack;
    expect(Math.max(...lift.values)).toBeGreaterThan(Math.min(...lift.values) * 3);
  });

  it("gives Rapidash a transverse gallop with a stiffer back than Arcanine", () => {
    const horse = rig(), dog = rig();
    const horseClip = createGallop(horse.scene, horse.root, POKEMON_MODELS.rapidash);
    const dogClip = createGallop(dog.scene, dog.root, POKEMON_MODELS.arcanine);
    const strikes = strikeTimes(horseClip, { LThigh: horse.bones.LThigh, RThigh: horse.bones.RThigh, LArm: horse.bones.LArm, RArm: horse.bones.RArm });
    expect(strikes.LThigh).toBeLessThan(strikes.RThigh);
    expect(strikes.RThigh).toBeLessThan(strikes.LArm);
    expect(strikes.LArm).toBeLessThan(strikes.RArm);
    const flex = (clip: AnimationClip, bone: Bone) => { const t = clip.tracks.find(track => track.name === `${bone.uuid}.quaternion`)!; const x = Array.from({ length: t.times.length }, (_, i) => t.values[i * 4]); return Math.max(...x) - Math.min(...x); };
    expect(flex(horseClip, horse.bones.Spine1)).toBeLessThan(flex(dogClip, dog.bones.Spine1) / 2);
  });

  it("runs bipeds as a quicker walk and loops the run", () => {
    const scene = new Group(); const root = new Group(); root.add(scene);
    const animator = createPokemonAnimator(scene, root, POKEMON_MODELS.machop, []);
    for (let i = 0; i < 90; i++) animator.update("run", 1 / 60);
    expect(root.position.y).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(root.rotation.x)).toBe(true);
    animator.dispose();
  });
});

it("builds the same joint motion whichever way the model faces when its animator is created", () => {
  const sample = (facing: number, motion: "walk" | "run") => {
    const world = new Group(); world.rotation.y = facing;
    const root = new Group(); const scene = new Group();
    const hip = new Bone(); hip.name = "LThigh";
    const shoulder = new Bone(); shoulder.name = "LArm";
    const tail = new Bone(); tail.name = "Tail1";
    const tip = new Bone(); tip.name = "Tail2"; tip.position.set(0, 0, -1); tail.add(tip);
    scene.add(hip, shoulder, tail); root.add(scene); world.add(root);
    world.updateMatrixWorld(true);
    const animator = createPokemonAnimator(scene, root, POKEMON_MODELS.arcanine, []);
    animator.update(motion, 0.1);
    const result = [hip, shoulder, tail].map(bone => bone.quaternion.toArray());
    animator.dispose();
    return result;
  };
  for (const motion of ["walk", "run"] as const) {
    const front = sample(0, motion);
    for (const facing of [Math.PI / 2, Math.PI, -Math.PI / 2]) {
      sample(facing, motion).forEach((quaternion, i) => quaternion.forEach((value, k) => expect(value, `${motion} facing ${facing}`).toBeCloseTo(front[i][k], 5)));
    }
  }
});
