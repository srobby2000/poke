import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { AnimationMixer, Group, Quaternion, Vector3 } from "three";
import type { Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { applyRestPose, createPokemonFallback, selectSpeciesClip } from "./pokemonAnimation";
import { normalizePokemonBone, rigPokemonAppendages, SERPENT_HEAD_NOD } from "./pokemonAppendages";
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

it("rests every flying species with still folded wings through landing and takeoff", async () => {
  const { createPokemonAnimator } = await import("./pokemonAnimation");
  const { isWingRoot } = await import("./pokemonAppendages");
  const { POKEMON_LOCOMOTION } = await import("./pokemonLocomotion");
  for (const definition of Object.values(POKEMON_MODELS).filter(d => POKEMON_LOCOMOTION[d.number] === "fly")) {
    const gltf = await load(definition.number);
    applyRestPose(gltf.scene, definition.number, gltf.animations);
    rigPokemonAppendages(gltf.scene, definition.number);
    const root = stageForDisplay(gltf.scene, definition.number, definition.heightM);
    const animator = createPokemonAnimator(gltf.scene, root, definition, gltf.animations);
    const driver = createWingDriver(gltf.scene, definition.number, pokemonDisplayHeight(definition.heightM));
    const wings: Object3D[] = [];
    gltf.scene.traverse(b => { if (isWingRoot(normalizePokemonBone(b.name), definition.number)) wings.push(b); });
    expect(wings.length, `${definition.number} mapped wings`).toBeGreaterThan(0);
    for (const action of ["walk", "idle", "run", "idle"] as const) {
      for (let i = 0; i < 60; i++) { animator.update(action, 1 / 60); driver?.update(1 / 60, action === "idle"); }
      if (action !== "idle") continue;
      const poses = wings.map(b => b.quaternion.clone());
      const y = root.position.y;
      for (let i = 0; i < 180; i++) {
        animator.update("idle", 1 / 60); driver?.update(1 / 60, true);
        wings.forEach((b, k) => expect(b.quaternion.angleTo(poses[k]), `${definition.number} resting wing`).toBeLessThan(0.001));
        expect(root.position.y).toBeCloseTo(y);
        expect(Number.isFinite(y)).toBe(true);
      }
    }
    animator.dispose();
  }
});

it("fits distinct serpent silhouettes, preserving lengths and forward-facing heads", async () => {
  for (const number of [23, 24, 147, 148]) {
    const { scene, animations } = await load(number);
    applyRestPose(scene, number, animations);
    const tails: Object3D[] = [], spines: Object3D[] = [];
    let head: Object3D | undefined;
    scene.traverse(b => {
      const name = normalizePokemonBone(b.name);
      if (/^Tail\d+$/.test(name)) tails.push(b);
      if (/^Spine\d+$/.test(name)) spines.push(b);
      if (name === "Head") head = b;
    });
    const lengths = [...tails, ...spines].map(b => ({ length: b.position.length(), parent: b.parent }));
    const headFacing = head!.getWorldQuaternion(new Quaternion());
    rigPokemonAppendages(scene, number);
    [...tails, ...spines].forEach((b, i) => {
      let length = b.position.length(), parent = b.parent;
      while (parent && parent !== lengths[i].parent) { length += parent.position.length(); parent = parent.parent; }
      expect(length).toBeCloseTo(lengths[i].length);
    });
    // The head only nods forward from its exported orientation (see SERPENT_HEAD_NOD).
    expect(head!.getWorldQuaternion(headFacing.clone()).angleTo(headFacing)).toBeCloseTo(SERPENT_HEAD_NOD[number] ?? 0, 3);
    if (number === 23) {
      // Ekans faces forward, not up: its jaw is further ahead of its head than above it.
      let jaw: Object3D | undefined;
      scene.traverse(b => { if (!jaw && normalizePokemonBone(b.name) === "UpperJaw") jaw = b; });
      const toJaw = jaw!.getWorldPosition(new Vector3()).sub(head!.getWorldPosition(new Vector3()));
      expect(toJaw.z).toBeGreaterThan(toJaw.y);
    }
    const positions = tails.map(b => b.getWorldPosition(new Vector3()));
    // Tips rise out of the base; a completely flat tail is not the reference pose.
    const ys = positions.map(p => p.y);
    expect(ys[ys.length - 1] - Math.min(...ys)).toBeGreaterThan(0.01);
    const first = positions[1].clone().sub(positions[0]).normalize();
    const last = positions[positions.length - 1].clone().sub(positions[positions.length - 2]).normalize();
    // Dratini has an open J-shaped body, not the shared closed loop from the old rule.
    if (number === 147) expect(first.dot(last)).toBeGreaterThan(0.5);
    else expect(first.dot(last)).toBeLessThan(0.5);
    const base = spines[0].getWorldPosition(new Vector3());
    const next = spines[1].getWorldPosition(new Vector3()).sub(base).normalize();
    expect(next.y).toBeLessThan(0.85); // The lower spine joins the curved base.
  }
});

it("gives tentacles distinct delayed motion along each branch", async () => {
  const { appendageMotion } = await import("./pokemonAppendages");
  for (const number of [72, 73, 138, 139]) {
    const { scene } = await load(number);
    const motions: NonNullable<ReturnType<typeof appendageMotion>>[] = [];
    scene.traverse(b => {
      if (/^(?:[LR])?Feeler[A-Z]?\d*$/.test(normalizePokemonBone(b.name))) {
        const motion = appendageMotion(b, number);
        expect(motion?.kind).toBe("part");
        if (motion) motions.push(motion);
      }
    });
    expect(motions.length).toBeGreaterThan(2);
    expect(new Set(motions.map(m => m.phase)).size).toBeGreaterThan(2);
  }
});

it("adds weighted serpent joints and surface samples without changing cached assets", async () => {
  const { clone } = await import("three/examples/jsm/utils/SkeletonUtils.js");
  const { SkinnedMesh } = await import("three");
  for (const number of [23, 24, 147, 148]) {
    const gltf = await load(number);
    const sourceBones: { bone: Object3D; position: Vector3; rotation: Quaternion }[] = [];
    const sourceMeshes: InstanceType<typeof SkinnedMesh>[] = [];
    gltf.scene.traverse(node => {
      if (node.type === "Bone") sourceBones.push({ bone: node, position: node.position.clone(), rotation: node.quaternion.clone() });
      if (node instanceof SkinnedMesh) sourceMeshes.push(node);
    });
    const sourcePositions = sourceMeshes.map(mesh => Array.from(mesh.geometry.attributes.position.array));
    const scene = clone(gltf.scene);
    const dispose = rigPokemonAppendages(scene, number);
    const added: Object3D[] = [];
    scene.traverse(node => { if (node.name.startsWith("Coil_")) added.push(node); });
    expect(added.length).toBeGreaterThan(40);
    let meshIndex = 0;
    const used = new Set<Object3D>();
    scene.traverse(node => {
      if (!(node instanceof SkinnedMesh)) return;
      const source = sourceMeshes[meshIndex++];
      expect(node.geometry).not.toBe(source.geometry);
      expect(node.skeleton).not.toBe(source.skeleton);
      expect(node.geometry.attributes.position.count).toBeGreaterThan(source.geometry.attributes.position.count * 2);
      const indices = node.geometry.attributes.skinIndex, weights = node.geometry.attributes.skinWeight;
      for (let i = 0; i < weights.count; i++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          const weight = weights.getComponent(i, k);
          sum += weight;
          if (weight > 0) used.add(node.skeleton.bones[indices.getComponent(i, k)]);
        }
        expect(sum).toBeCloseTo(1, 5);
      }
    });
    expect(added.filter(b => used.has(b)).length).toBeGreaterThan(added.length * 0.8);
    sourceBones.forEach(({ bone, position, rotation }) => {
      expect(bone.position.equals(position)).toBe(true);
      expect(bone.quaternion.equals(rotation)).toBe(true);
    });
    sourceMeshes.forEach((mesh, i) => expect(Array.from(mesh.geometry.attributes.position.array)).toEqual(sourcePositions[i]));
    dispose();
  }
}, 30000);
