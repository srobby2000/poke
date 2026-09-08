import { describe, expect, it } from "vitest";
import { AnimationClip, Bone, Group, QuaternionKeyframeTrack } from "three";
import { createPokemonAnimator, selectPokemonClip } from "./pokemonAnimation";
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
