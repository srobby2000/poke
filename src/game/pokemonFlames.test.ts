import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { AnimationMixer, Quaternion, Vector3 } from "three";
import type { Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { applyRestPose, createPokemonFallback } from "./pokemonAnimation";
import { normalizePokemonBone, rigPokemonAppendages } from "./pokemonAppendages";
import { createFlameDriver } from "./pokemonFlames";
import { POKEMON_MODELS } from "./pokemonModels";
import { stageForDisplay } from "./pokemonMotionMetrics";

(globalThis as { self?: unknown }).self ??= globalThis;
const load = async (number: number): Promise<GLTF> => {
  const bytes = await readFile(`public/models/pokemon/${number}.glb`);
  const loader = new GLTFLoader();
  loader.register(() => ({ name: "NO_TEXTURE_DECODE", loadTexture: () => Promise.resolve(null) }) as never);
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, "");
};
const charmander = async () => {
  const gltf = await load(4);
  const scene = gltf.scene;
  applyRestPose(scene, 4, gltf.animations);
  rigPokemonAppendages(scene, 4);
  const root = stageForDisplay(scene, 4, POKEMON_MODELS.charmander.heightM);
  const bone = (name: string) => { let found: Object3D | undefined; scene.traverse(node => { if (!found && normalizePokemonBone(node.name) === name) found = node; }); return found!; };
  return { scene, root, bone };
};
const flameDirection = (base: Object3D, next: Object3D) => {
  base.updateWorldMatrix(true, true);
  return next.getWorldPosition(new Vector3()).sub(base.getWorldPosition(new Vector3())).normalize();
};

it("keeps Charmander's flame rising whichever way its tail bends, leaning away from motion", async () => {
  const { scene, root, bone } = await charmander();
  const driver = createFlameDriver(scene, 4, 0.86, { value: 0 })!;
  expect(driver).not.toBeNull();
  const run = (seconds: number, step = () => {}) => { for (let t = 0; t < seconds; t += 1 / 60) { step(); root.updateMatrixWorld(true); driver.update(1 / 60, { fainted: false }); } };
  run(1);
  expect(flameDirection(bone("TailA01"), bone("TailA02")).y).toBeGreaterThan(0.8);
  // Swing the tail hard to one side and down: the flame still points up.
  bone("Tail1").quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.9));
  run(1.5);
  expect(flameDirection(bone("TailA01"), bone("TailA02")).y).toBeGreaterThan(0.75);
  // Carried forward (+Z) steadily, the flame trails backward.
  const still = flameDirection(bone("TailA01"), bone("TailA02"));
  run(0.6, () => { root.position.z += 2 / 60; });
  expect(flameDirection(bone("TailA01"), bone("TailA02")).z).toBeLessThan(still.z - 0.05);
  driver.dispose();
});

it("flickers, and burns low when Charmander faints", async () => {
  const { scene, root, bone } = await charmander();
  const clock = { value: 0 };
  const driver = createFlameDriver(scene, 4, 0.86, clock)!;
  const tip = bone("TailA03");
  const lengths: number[] = [];
  for (let i = 0; i < 90; i++) { root.updateMatrixWorld(true); driver.update(1 / 60, { fainted: false }); lengths.push(Math.max(tip.scale.x, tip.scale.y, tip.scale.z)); }
  expect(clock.value).toBeGreaterThan(1.4);
  expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThan(0.05);
  const lit = bone("TailA01").scale.length();
  for (let i = 0; i < 180; i++) driver.update(1 / 60, { fainted: true });
  expect(bone("TailA01").scale.length()).toBeLessThan(lit * 0.6);
  driver.dispose();
});

it("sways Charmander's tail side to side as it walks, more than it bobs", async () => {
  const { scene, root, bone } = await charmander();
  const clip = createPokemonFallback(scene, root, POKEMON_MODELS.charmander, "walk");
  const mixer = new AnimationMixer(root);
  mixer.clipAction(clip).play();
  const tip = bone("Tail5"), xs: number[] = [], ys: number[] = [];
  for (let i = 0; i <= 60; i++) {
    mixer.setTime(clip.duration * i / 60);
    root.updateMatrixWorld(true);
    const at = tip.getWorldPosition(new Vector3());
    xs.push(at.x); ys.push(at.y);
  }
  const range = (values: number[]) => Math.max(...values) - Math.min(...values);
  expect(range(xs)).toBeGreaterThan(range(ys));
  expect(range(xs)).toBeGreaterThan(0.05);
});

it("gives Charmeleon and Charizard the same burning, rising tail flame", async () => {
  for (const species of ["charmeleon", "charizard"]) {
    const definition = POKEMON_MODELS[species];
    const gltf = await load(definition.number);
    applyRestPose(gltf.scene, definition.number, gltf.animations);
    rigPokemonAppendages(gltf.scene, definition.number);
    const root = stageForDisplay(gltf.scene, definition.number, definition.heightM);
    const driver = createFlameDriver(gltf.scene, definition.number, 1, { value: 0 });
    expect(driver, species).not.toBeNull();
    for (let i = 0; i < 90; i++) { root.updateMatrixWorld(true); driver!.update(1 / 60, { fainted: false }); }
    const bone = (name: string) => { let found: Object3D | undefined; gltf.scene.traverse(node => { if (!found && normalizePokemonBone(node.name) === name) found = node; }); return found!; };
    expect(flameDirection(bone("TailA01"), bone("TailA02")).y, species).toBeGreaterThan(0.75);
    driver!.dispose();
  }
});
