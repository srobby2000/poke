import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { learnsetFor } from "./moveAnimations";
import { applyRestPose, createMoveClip, createPokemonFallback, selectSpeciesClip } from "./pokemonAnimation";
import { rigPokemonAppendages } from "./pokemonAppendages";
import { POKEMON_LOCOMOTION } from "./pokemonLocomotion";
import { POKEMON_MODELS } from "./pokemonModels";
import { measureClip, stageForDisplay } from "./pokemonMotionMetrics";
import { Vector3 } from "three";
import { normalizePokemonBone } from "./pokemonAppendages";
import { checkMotion } from "./pokemonMotionTargets";

(globalThis as { self?: unknown }).self ??= globalThis;
const load = async (number: number): Promise<GLTF> => {
  const bytes = await readFile(`public/models/pokemon/${number}.glb`);
  const loader = new GLTFLoader();
  loader.register(() => ({ name: "NO_TEXTURE_DECODE", loadTexture: () => Promise.resolve(null) }) as never);
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, "");
};
const species = Object.entries(POKEMON_MODELS);

// Every species, every base motion, measured on its real rig at display scale and held to the
// bands measured from the authored clips (see docs/animation-references.md).
describe("motion quality against the reference bands", () => {
  for (const [name, definition] of species) {
    it(`${name} moves like its references`, async () => {
      const gltf = await load(definition.number);
      const problems: string[] = [];
      for (const motion of ["idle", "walk", "run", "attack", "hit"] as const) {
        const scene = gltf.scene.clone(true);
        applyRestPose(scene, definition.number, gltf.animations);
        rigPokemonAppendages(scene, definition.number);
        const root = stageForDisplay(scene, definition.number, definition.heightM);
        const clip = selectSpeciesClip(gltf.animations, motion, definition.number) ?? createPokemonFallback(scene, root, definition, motion);
        for (const issue of checkMotion(measureClip(scene, root, clip, 60), POKEMON_LOCOMOTION[definition.number], motion)) problems.push(`${motion}: ${issue}`);
      }
      expect(problems, name).toEqual([]);
    }, 30000);
  }
});

describe("move clips", () => {
  for (const [name, definition] of species.filter((_, index) => index % 3 === 0)) {
    it(`${name}'s moves take their time, flow and return to rest`, async () => {
      const gltf = await load(definition.number);
      const scene = gltf.scene.clone(true);
      applyRestPose(scene, definition.number, gltf.animations);
      rigPokemonAppendages(scene, definition.number);
      const root = stageForDisplay(scene, definition.number, definition.heightM);
      for (const move of learnsetFor(name).slice(0, 3)) {
        const clip = createMoveClip(scene, root, definition, move.id);
        const metrics = measureClip(scene, root, clip, 60);
        // Around the authored 1.8–2.2 s; quick moves are shorter, multi-hit moves longer.
        expect(clip.duration, `${name} ${move.id}`).toBeGreaterThan(1);
        expect(clip.duration, `${name} ${move.id}`).toBeLessThan(5);
        expect(metrics.seam, `${name} ${move.id} ends at rest`).toBeLessThan(1);
        expect(metrics.kink, `${name} ${move.id} kink`).toBeLessThan(20);
        expect(Number.isFinite(metrics.peakRange)).toBe(true);
      }
    }, 30000);
  }
});

it("keeps Alakazam's spoons in its hands", async () => {
  const gltf = await load(65);
  const scene = gltf.scene.clone(true);
  applyRestPose(scene, 65, gltf.animations);
  const find = (name: string) => { let found: import("three").Object3D | undefined; scene.traverse(node => { if (!found && normalizePokemonBone(node.name) === name) found = node; }); return found!; };
  scene.updateMatrixWorld(true);
  const before = find("LFeelerA").getWorldPosition(new Vector3());
  rigPokemonAppendages(scene, 65);
  const spoon = find("LFeelerA");
  expect(normalizePokemonBone(spoon.parent!.name)).toBe("LHand");
  expect(spoon.getWorldPosition(new Vector3()).distanceTo(before)).toBeLessThan(1e-4);
});
