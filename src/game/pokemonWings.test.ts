import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { AnimationMixer, Group, Vector3 } from "three";
import type { Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { applyRestPose, createPokemonFallback, selectSpeciesClip } from "./pokemonAnimation";
import { normalizePokemonBone, rigPokemonAppendages } from "./pokemonAppendages";
import { POKEMON_MODELS } from "./pokemonModels";
import { stageForDisplay } from "./pokemonMotionMetrics";
import { pokemonDisplayHeight } from "./pokemonScale";
import { createWingDriver } from "./pokemonWings";

(globalThis as { self?: unknown }).self ??= globalThis;
const load = async (number: number): Promise<GLTF> => {
  const bytes = await readFile(`public/models/pokemon/${number}.glb`);
  const loader = new GLTFLoader();
  loader.register(() => ({ name: "NO_TEXTURE_DECODE", loadTexture: () => Promise.resolve(null) }) as never);
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, "");
};

/** Fly a species' travel clip for two seconds with the wing driver, recording how far `joint`
 * bends away from the clip's own pose (degrees) each frame. */
async function fly(species: string, joint: string, drive = true) {
  const definition = POKEMON_MODELS[species];
  const gltf = await load(definition.number);
  const scene = gltf.scene;
  applyRestPose(scene, definition.number, gltf.animations);
  rigPokemonAppendages(scene, definition.number);
  const root = stageForDisplay(scene, definition.number, definition.heightM);
  const clip = selectSpeciesClip(gltf.animations, "walk", definition.number) ?? createPokemonFallback(scene, root, definition, "walk");
  const mixer = new AnimationMixer(root);
  mixer.clipAction(clip).play();
  const driver = createWingDriver(scene, definition.number, pokemonDisplayHeight(definition.heightM))!;
  let bone: Object3D | undefined;
  scene.traverse(node => { if (!bone && normalizePokemonBone(node.name) === joint) bone = node; });
  const bends: number[] = [];
  for (let frame = 0; frame < 120; frame++) {
    mixer.update(1 / 60);
    const clipPose = bone!.quaternion.clone();
    if (drive) driver.update(1 / 60);
    bends.push(clipPose.angleTo(bone!.quaternion) * 180 / Math.PI);
  }
  return { driver, bends };
}

it("bends a bird's wing at the elbow through the stroke instead of flapping it as a board", async () => {
  const { driver, bends } = await fly("pidgeot", "LForeArm");
  expect(driver).not.toBeNull();
  const late = bends.slice(30);
  // It bends noticeably, varies with the stroke (drag and the upstroke fold), and stays sane.
  expect(Math.max(...late)).toBeGreaterThan(5);
  expect(Math.max(...late) - Math.min(...late)).toBeGreaterThan(4);
  expect(Math.max(...late)).toBeLessThan(60);
});

it("flexes Charizard's wing membrane struts along the whole chain", async () => {
  for (const joint of ["LFeeler2", "LFeeler4"]) {
    const { bends } = await fly("charizard", joint);
    expect(Math.max(...bends.slice(30)), joint).toBeGreaterThan(2);
  }
});

it("keeps insect wings nearly stiff", async () => {
  const bird = Math.max(...(await fly("pidgeot", "LForeArm")).bends.slice(30));
  const insect = Math.max(...(await fly("butterfree", "LFeelerA2")).bends.slice(30));
  expect(insect).toBeLessThan(bird * 0.5);
});

it("leaves species without wing joints alone", () => {
  expect(createWingDriver(new Group(), 1, 1)).toBeNull();
});

it("folds a bird's wing on the upstroke and spreads it for the downstroke", async () => {
  const definition = POKEMON_MODELS.pidgey;
  const gltf = await load(definition.number);
  applyRestPose(gltf.scene, definition.number, gltf.animations);
  rigPokemonAppendages(gltf.scene, definition.number);
  const root = stageForDisplay(gltf.scene, definition.number, definition.heightM);
  const clip = createPokemonFallback(gltf.scene, root, definition, "walk");
  const mixer = new AnimationMixer(root);
  mixer.clipAction(clip).play();
  const driver = createWingDriver(gltf.scene, definition.number, pokemonDisplayHeight(definition.heightM))!;
  const find = (name: string) => { let found: Object3D | undefined; gltf.scene.traverse(node => { if (!found && normalizePokemonBone(node.name) === name) found = node; }); return found!; };
  const shoulder = find("LArm"), elbow = find("LForeArm");
  // The flight clip swings the shoulder only, so the elbow's clip pose is its rest pose.
  const clipPose = elbow.quaternion.clone();
  const up: number[] = [], down: number[] = [];
  let last = 0;
  for (let frame = 0; frame < 180; frame++) {
    mixer.update(1 / 60);
    driver.update(1 / 60);
    root.updateMatrixWorld(true);
    const a = shoulder.getWorldPosition(new Vector3()), b = elbow.getWorldPosition(new Vector3());
    const elevation = (b.y - a.y) / a.distanceTo(b);
    const bend = clipPose.angleTo(elbow.quaternion) * 180 / Math.PI;
    if (frame > 60) (elevation > last ? up : down).push(bend);
    last = elevation;
  }
  const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
  expect(mean(up)).toBeGreaterThan(30);
  expect(mean(up)).toBeGreaterThan(mean(down) + 15);
});
