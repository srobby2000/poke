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
        // Never below the floor; planted four-legged attacks stay on it.
        expect(root.position.y).toBeGreaterThanOrEqual(0);
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
  // Attacks run about 2 s, like the authored ones; past the end it holds still.
  for (let i = 0; i < 140; i++) animator.update("attack", 1 / 60);
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
  // The battle flag drops after ~0.2 s; the lunge still arrives, after the wind-up.
  let lunge = 0;
  for (let i = 0; i < 70; i++) { animator.update("idle", 1 / 60); lunge = Math.max(lunge, root.position.z); }
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

it("assigns every catalog species a deliberate travel mode, including flightless birds", async () => {
  const { POKEMON_LOCOMOTION } = await import("./pokemonLocomotion");
  expect(Object.keys(POKEMON_LOCOMOTION)).toHaveLength(151);
  for (const definition of Object.values(POKEMON_MODELS)) expect(POKEMON_LOCOMOTION[definition.number]).toBeDefined();
  for (const n of [6, 12, 16, 17, 18, 21, 22, 41, 42, 49, 83, 123, 142, 144, 145, 146, 149]) expect(POKEMON_LOCOMOTION[n]).toBe("fly");
  for (const n of [54, 55, 84, 85, 94]) expect(POKEMON_LOCOMOTION[n]).toBe("biped");
});

it("keeps a flyer's legs still while its real wing hinges flap at both travel speeds", () => {
  for (const motion of ["walk", "run"] as const) {
    const scene = new Group(), root = new Group(); root.add(scene);
    const bones = ["LArm", "RArm", "LThigh", "RThigh", "LLeg", "RLeg"].map(name => { const bone = new Bone(); bone.name = name; scene.add(bone); return bone; });
    const animator = createPokemonAnimator(scene, root, POKEMON_MODELS.pidgeot, []);
    animator.update(motion, 0.1);
    const first = bones.map(b => b.quaternion.clone());
    // Wings beat ~2 times a second, so look for the largest swing across the cycle.
    let swing = 0;
    for (let i = 0; i < 8; i++) { animator.update(motion, 0.05); swing = Math.max(swing, bones[0].quaternion.angleTo(first[0])); }
    expect(swing).toBeGreaterThan(0.1);
    expect(bones[0].rotation.z).toBeCloseTo(-bones[1].rotation.z);
    for (let i = 2; i < bones.length; i++) expect(bones[i].quaternion.angleTo(first[i])).toBeCloseTo(0);
    expect(root.position.y).toBeGreaterThan(0.1);
    animator.dispose();
  }
});

it("does not flap ordinary arms on hovering Pokémon or give snakes footfall bounce", () => {
  for (const species of ["mew", "geodude", "abra", "ekans", "onix", "muk", "diglett"]) {
    const scene = new Group(), root = new Group(); root.add(scene);
    const arm = new Bone(); arm.name = "LArm"; scene.add(arm);
    const animator = createPokemonAnimator(scene, root, POKEMON_MODELS[species], []);
    animator.update("walk", 0.1);
    const pose = arm.quaternion.clone();
    for (let i = 0; i < 4; i++) animator.update("walk", 0.1);
    expect(arm.quaternion.angleTo(pose), species).toBeCloseTo(0);
    if (["ekans", "onix", "muk", "diglett"].includes(species)) expect(root.position.y).toBe(0);
    animator.dispose();
  }
});

it("uses Zubat's known flight clip for travel and excludes authored ground walks for flyers", async () => {
  const { selectSpeciesClip } = await import("./pokemonAnimation");
  const flight = new AnimationClip("Take 001", 2, [new NumberKeyframeTrack(".position[y]", [0, 2], [0, 0])]);
  const walk = new AnimationClip("walk", 1, []);
  expect(selectSpeciesClip([flight, walk], "walk", 41)).toBe(flight);
  expect(selectSpeciesClip([flight], "run", 41)?.duration).toBe(1.5);
  expect(flight.duration).toBe(2);
  expect(flight.tracks[0].times[1]).toBe(2);
  expect(selectSpeciesClip([walk], "walk", 149)).toBeUndefined();
  expect(selectSpeciesClip([walk], "walk", 84)).toBe(walk);
});

it("closes every procedural travel loop without a positional or joint snap", async () => {
  const { createPokemonFallback } = await import("./pokemonAnimation");
  const { Quaternion } = await import("three");
  for (const definition of Object.values(POKEMON_MODELS)) {
    const scene = new Group(), root = new Group(); root.add(scene);
    for (const name of ["LArm", "LThigh", "LLeg", "Tail1", "Spine1"]) { const bone = new Bone(); bone.name = name; scene.add(bone); }
    for (const motion of ["walk", "run"] as const) {
      const clip = createPokemonFallback(scene, root, definition, motion);
      for (const track of clip.tracks) {
        const width = track.getValueSize(), values = track.values;
        const first = Array.from(values.slice(0, width)), last = Array.from(values.slice(-width));
        if (track.name.endsWith("quaternion")) expect(new Quaternion().fromArray(first).angleTo(new Quaternion().fromArray(last)), `${definition.number} ${motion} ${track.name}`).toBeLessThan(0.001);
        else if (track.name.endsWith("rotation[x]") && [100, 101].includes(definition.number)) expect(Math.cos(last[0])).toBeCloseTo(Math.cos(first[0]));
        else first.forEach((value, i) => expect(last[i], `${definition.number} ${motion} ${track.name}`).toBeCloseTo(value, 5));
      }
    }
  }
});

it("matches travel playback to ground speed, breaking small Pokémon into a run", async () => {
  const { MOTION_SECONDS, STRIDE_PER_CYCLE, travelPlayback } = await import("./pokemonAnimation");
  const { pokemonDisplayHeight } = await import("./pokemonScale");
  // Squirtle (0.5 m) following a trainer at 3.6 units/s can't walk that fast; it runs.
  const squirtle = pokemonDisplayHeight(0.5);
  const seconds = { walk: MOTION_SECONDS.walk(squirtle), run: MOTION_SECONDS.run(squirtle) };
  const following = travelPlayback(3.6, squirtle, seconds, "walk");
  expect(following.motion).toBe("run");
  // Feet keep pace: ground covered per second equals the stride per second.
  expect(following.rate * STRIDE_PER_CYCLE.run * squirtle / seconds.run).toBeCloseTo(3.6, 5);
  // A slow stroll stays a walk, and very slow speeds don't freeze the cycle.
  expect(travelPlayback(0.8, squirtle, seconds, "walk").motion).toBe("walk");
  expect(travelPlayback(0.05, squirtle, seconds, "walk").rate).toBeGreaterThanOrEqual(0.6);
  // Arcanine's gallop at ride speed plays close to its natural rate.
  expect(travelPlayback(5.4, pokemonDisplayHeight(1.9), { walk: 1.3, run: 0.45 }, "run").rate).toBeCloseTo(1, 0);
});
