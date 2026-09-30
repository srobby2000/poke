import { createInitialBattleState } from "../game/battleState";
import { readFile } from "node:fs/promises";
import { afterAll, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { loadPokemonModel } from "../game/loadPokemonModel";
import { mountSeat } from "../game/pokemonModelGeometry";
import { learnsetFor } from "../game/moveAnimations";
import { act, create } from "@react-three/test-renderer";
import { appendageMotion, normalizePokemonBone, rigPokemonAppendages } from "../game/pokemonAppendages";
import { applyRestPose, createMoveClip, createPokemonAnimator, selectSpeciesClip } from "../game/pokemonAnimation";
import { POKEMON_MODELS } from "../game/pokemonModels";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Bone, Box3, Group, SkinnedMesh, Vector3 } from "three";
import { PokemonModel } from "./PokemonModel";
import { WorldParty } from "./WorldParty";
import { createInitialWorldState } from "../game/worldState";
import type { RideSpecies } from "../game/riding";

// Rendering scene objects does not require browser DOM labels or a GPU. The
// actual GLTF parser, skeleton cloning and React effects run. No decoder workers are allowed.
vi.mock("@react-three/drei", async importOriginal => ({
  ...await importOriginal<typeof import("@react-three/drei")>(),
  Html: () => null,
}));
const originalFetch = globalThis.fetch;
const OriginalRequest = globalThis.Request;
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
vi.stubGlobal("Request", class extends OriginalRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(typeof input === "string" && input.startsWith("/") ? `http://model.test${input}` : input, init);
  }
});
const workerConstructor = vi.fn(() => { throw new Error("Model loading must not require a browser worker"); });
vi.stubGlobal("Worker", workerConstructor);
vi.stubGlobal("ProgressEvent", class { constructor(type: string, init: object) { Object.assign(this, { type }, init); } });
vi.stubGlobal("self", globalThis);
const bitmapDecoder = vi.fn(() => new Promise(() => {}));
vi.stubGlobal("createImageBitmap", bitmapDecoder);
vi.stubGlobal("document", {
  createElementNS: () => new class extends EventTarget {
    width = 256;
    height = 256;
    set src(url: string) {
      originalFetch(url).then(response => response.arrayBuffer()).then(bytes => {
        expect([...new Uint8Array(bytes).slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        this.dispatchEvent(new Event("load"));
      });
    }
  }(),
});
vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("/") || url.startsWith("http://model.test/")) {
    const bytes = await readFile(`public${new URL(url, "http://model.test").pathname}`);
    return new Response(bytes);
  }
  return originalFetch(input, init);
});
afterAll(() => {
  vi.unstubAllGlobals();
});

it("renders actual meshes for arena starters and the reported battle team even if bitmap decoding stalls", async () => {
  const renderer = await create(<StrictMode><group>{["bulbasaur", "charmander", "squirtle", "abra", "haunter", "cubone", "psyduck", "meowth"].map(species => <PokemonModel key={species} species={species} />)}</group></StrictMode>);
  try {
    await vi.waitFor(async () => {
      await act(async () => {});
      let count = 0;
      renderer.scene.instance.traverse(node => { if (node.type === "SkinnedMesh" || node.type === "Mesh") count++; });
      expect(count).toBeGreaterThanOrEqual(8);
    }, { timeout: 3000 });
    expect(workerConstructor).not.toHaveBeenCalled();
    expect(bitmapDecoder).not.toHaveBeenCalled();
    await renderer.advanceFrames(2, 1 / 60);
    const bounds = new Box3().setFromObject(renderer.scene.instance).getSize(new Vector3());
    expect(bounds.toArray().every(Number.isFinite)).toBe(true);
    expect(bounds.length()).toBeGreaterThan(0.5);
    expect(bounds.length()).toBeLessThan(10);
  } finally { await renderer.unmount(); }
});

it("times out a stalled download and allows retry", async () => {
  const fetchModel = globalThis.fetch;
  vi.useFakeTimers();
  vi.stubGlobal("fetch", () => new Promise(() => {}));
  try {
    const pending = loadPokemonModel(25);
    const check = expect(pending).rejects.toThrow("Timed out downloading model");
    await vi.advanceTimersByTimeAsync(20000);
    await check;
  } finally {
    vi.useRealTimers();
    vi.stubGlobal("fetch", fetchModel);
  }
  expect((await loadPokemonModel(25)).scene.children.length).toBeGreaterThan(0);
});

it("renders every unit using species values produced by the battle state", async () => {
  const battle = createInitialBattleState(1, { allyIds: ["lapras", "abra", "dratini"] });
  const renderer = await create(<group>{battle.units.map(unit =>
    <group key={unit.id} name={unit.id}><PokemonModel species={unit.sourcePokemon} /></group>
  )}</group>);
  try {
    await vi.waitFor(async () => {
      await act(async () => {});
      for (const unit of battle.units) {
        const group = renderer.scene.instance.getObjectByName(unit.id)!;
        let meshes = 0;
        group.traverse(node => { if (node.type === "SkinnedMesh" || node.type === "Mesh") meshes++; });
        expect(meshes, `${unit.sourcePokemon} must display a model`).toBeGreaterThan(0);
      }
    }, { timeout: 3000 });
  } finally { await renderer.unmount(); }
});

it("keeps species size differences readable without extreme proportions", async () => {
  const expected = { Squirtle: 0.863, Snorlax: 1.427, Lapras: 1.516 };
  const renderer = await create(<group>{Object.keys(expected).map(species =>
    <group key={species} name={species}><PokemonModel species={species} /></group>
  )}</group>);
  try {
    await vi.waitFor(async () => {
      await act(async () => {});
      renderer.scene.instance.updateMatrixWorld(true);
      for (const [species, height] of Object.entries(expected)) {
        const group = renderer.scene.instance.getObjectByName(species)!;
        const size = new Box3().setFromObject(group.getObjectByName("pokemon-body") ?? group).getSize(new Vector3());
        expect(size.y, species).toBeCloseTo(height, 2);
      }
    });
  } finally { await renderer.unmount(); }
});


it("animates all 151 actual rigs without changing their cached source poses", async () => {
  for (const definition of Object.values(POKEMON_MODELS)) {
    const gltf = await loadPokemonModel(definition.number);
    const sourcePose: number[] = [];
    gltf.scene.traverse(node => sourcePose.push(...node.position.toArray(), ...node.quaternion.toArray(), ...node.scale.toArray()));
    const scene = clone(gltf.scene);
    const root = new Group(); root.add(scene);
    const disposeRig = rigPokemonAppendages(scene, definition.number);
    const animator = createPokemonAnimator(scene, root, definition, gltf.animations);
    for (const motion of ["idle", "walk", "run", "attack", "hit", "idle"] as const) {
      for (let i = 0; i < 20; i++) animator.update(motion, 1 / 60);
      root.updateMatrixWorld(true);
      root.traverse(node => expect(node.matrixWorld.elements.every(Number.isFinite), `#${definition.number} ${motion}: ${node.name}`).toBe(true));
    }
    animator.dispose();
    disposeRig();
    const after: number[] = [];
    gltf.scene.traverse(node => after.push(...node.position.toArray(), ...node.quaternion.toArray(), ...node.scale.toArray()));
    expect(after).toEqual(sourcePose);
  }
}, 20000);

it("lowers outstretched arms in actual biped idle rigs, including all four Machamp arms", async () => {
  let checked = 0;
  for (const number of [4, 7, 25, 65, 66, 68, 94, 107, 122]) {
    const gltf = await loadPokemonModel(number);
    const scene = clone(gltf.scene);
    const root = new Group(); root.add(scene); root.updateMatrixWorld(true);
    const arms: { bone: typeof scene; elbow: typeof scene }[] = [];
    scene.traverse(bone => {
      const normalize = (name: string) => name.replace(/^\d+[ _]?/, "").replace(/_\d+$/, "");
      if (!/^[LR]Arm\d*$/.test(normalize(bone.name))) return;
      const elbow = bone.children.find(child => /ForeArm/.test(child.name));
      if (!elbow) return;
      const direction = elbow.getWorldPosition(new Vector3()).sub(bone.getWorldPosition(new Vector3())).normalize();
      if (Math.abs(direction.y) <= 0.65) arms.push({ bone: bone as typeof scene, elbow: elbow as typeof scene });
    });
    const definition = Object.values(POKEMON_MODELS).find(entry => entry.number === number)!;
    const animator = createPokemonAnimator(scene, root, definition, gltf.animations);
    for (let i = 0; i < 30; i++) animator.update("idle", 1 / 60);
    root.updateMatrixWorld(true);
    for (const { bone, elbow } of arms) {
      const direction = elbow.getWorldPosition(new Vector3()).sub(bone.getWorldPosition(new Vector3())).normalize();
      expect(direction.y, `#${number} ${bone.name} should point down from its shoulder`).toBeLessThan(-0.7);
      checked++;
    }
    if (number === 68) expect(arms.length).toBe(4);
    animator.dispose();
  }
  expect(checked).toBeGreaterThanOrEqual(12);
});


it("animates wing hinges and distal tail bones that the old name filter skipped", async () => {
  for (const number of [6, 12, 18, 26, 38, 49, 123, 144, 145, 149, 151]) {
    const gltf = await loadPokemonModel(number);
    const scene = clone(gltf.scene); const root = new Group(); root.add(scene);
    root.updateMatrixWorld(true);
    const appendages: typeof scene[] = [];
    scene.traverse(bone => { if (appendageMotion(bone, number)) appendages.push(bone as typeof scene); });
    expect(appendages.length, `#${number}`).toBeGreaterThan(0);
    const definition = Object.values(POKEMON_MODELS).find(entry => entry.number === number)!;
    const animator = createPokemonAnimator(scene, root, definition, gltf.animations);
    animator.update("idle", 0.05);
    const before = appendages.map(bone => bone.quaternion.clone());
    animator.update("idle", 0.1);
    expect(appendages.every((bone, i) => bone.quaternion.angleTo(before[i]) > 0.00001), `#${number} every appendage should move`).toBe(true);
    animator.dispose();
  }
});

it("skins Golbat wings with normalized weights while keeping the torso and source geometry fixed", async () => {
  const gltf = await loadPokemonModel(42);
  const scene = clone(gltf.scene); const root = new Group(); root.add(scene);
  const dispose = rigPokemonAppendages(scene, 42);
  let mesh: SkinnedMesh | undefined;
  scene.traverse(object => { if (object instanceof SkinnedMesh) mesh = object; });
  expect(mesh).toBeDefined();
  const wing = mesh!;
  expect(wing.skeleton.bones.length).toBe(5);
  const positions = wing.geometry.getAttribute("position");
  const weights = wing.geometry.getAttribute("skinWeight");
  root.updateMatrixWorld(true);
  for (let i = 0; i < positions.count; i++) {
    expect(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i)).toBeCloseTo(1);
    const point = new Vector3().fromBufferAttribute(positions, i);
    expect(wing.applyBoneTransform(i, point.clone()).distanceTo(point)).toBeLessThan(0.00001);
  }
  const animator = createPokemonAnimator(scene, root, POKEMON_MODELS.golbat, gltf.animations);
  for (let i = 0; i < 15; i++) animator.update("idle", 1 / 60);
  root.updateMatrixWorld(true);
  let moved = 0;
  for (let i = 0; i < positions.count; i++) {
    const point = new Vector3().fromBufferAttribute(positions, i);
    const distance = wing.applyBoneTransform(i, point.clone()).distanceTo(point);
    if (weights.getX(i) === 1) expect(distance).toBeLessThan(0.00001);
    else if (distance > 0.01) moved++;
  }
  expect(moved).toBeGreaterThan(100);
  gltf.scene.traverse(object => { if (object instanceof SkinnedMesh) throw new Error("Cached Golbat must remain unmodified"); });
  animator.dispose(); dispose();
});


it("keeps one hidden companion while riding and resumes it beside the trainer without duplicates", async () => {
  const initial = createInitialWorldState();
  const render = (ride: RideSpecies | null, x = initial.x) => <StrictMode><WorldParty state={{ ...initial, ride, x }} /></StrictMode>;
  const renderer = await create(render(null));
  try {
    const scene = renderer.scene.instance;
    const companion = scene.getObjectByName("world-companion")!;
    const actor = scene.getObjectByName("world-actor")!;
    const meshIds = () => {
      const ids: string[] = [];
      companion.traverse(node => { if (node.type === "Mesh" || node.type === "SkinnedMesh") ids.push(node.uuid); });
      return ids;
    };
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(meshIds().length).toBeGreaterThan(0);
    });
    const originalMeshes = meshIds();
    for (let cycle = 0; cycle < 4; cycle++) {
      const destinationX = initial.x + 3 + cycle;
      await renderer.update(render("rapidash", destinationX));
      await vi.waitFor(async () => {
        await act(async () => {});
        const mount = scene.getObjectByName("world-mount")!;
        scene.updateMatrixWorld(true);
        const size = new Box3().setFromObject(mount).getSize(new Vector3());
        expect(size.y).toBeGreaterThan(2.1);
      });
      expect(companion.visible).toBe(false);
      const visibleMeshes: string[] = [];
      scene.traverseVisible(node => visibleMeshes.push(node.uuid));
      expect(originalMeshes.every(id => !visibleMeshes.includes(id))).toBe(true);
      await act(async () => { await renderer.advanceFrames(3, 1 / 60); });
      await renderer.update(render(null, destinationX));
      await act(async () => { await renderer.advanceFrames(1, 1 / 60); });
      expect(companion.visible).toBe(true);
      expect(scene.getObjectByName("world-companion")).toBe(companion);
      expect(scene.getObjectByName("world-actor")).toBe(actor);
      expect(meshIds()).toEqual(originalMeshes);
      expect(companion.position.x).toBeCloseTo(destinationX);
      expect(companion.position.z).toBeCloseTo(initial.z - 0.8);
      expect(scene.getObjectByName("world-mount")).toBeUndefined();
      let companions = 0;
      scene.traverse(node => { if (node.name === "world-companion") companions++; });
      expect(companions).toBe(1);
    }
    const before = companion.position.x;
    await renderer.update(render(null, initial.x + 9));
    await act(async () => { await renderer.advanceFrames(5, 1 / 60); });
    expect(companion.position.x).toBeGreaterThan(before);
  } finally { await renderer.unmount(); }
});

it("gives rigid humanoids normalized torso and neck skins without altering source geometry", async () => {
  for (const number of [35, 96, 97, 106, 108, 113, 124, 125, 126, 141, 143]) {
    const gltf = await loadPokemonModel(number);
    const scene = clone(gltf.scene); const root = new Group(); root.add(scene);
    const sourceGeometries = new Set();
    gltf.scene.traverse(node => { if ("geometry" in node) sourceGeometries.add(node.geometry); });
    const disposeRig = rigPokemonAppendages(scene, number);
    const meshes: SkinnedMesh[] = [];
    scene.traverse(node => { if (node instanceof SkinnedMesh) meshes.push(node); });
    expect(meshes.length, `#${number}`).toBeGreaterThan(0);
    for (const mesh of meshes) {
      expect(sourceGeometries.has(mesh.geometry)).toBe(false);
      expect(mesh.skeleton.bones.slice(0, 3).map(b => b.name)).toEqual(["BodyCore", "Spine1", "Head"]);
      const weights = mesh.geometry.getAttribute("skinWeight");
      for (let i = 0; i < weights.count; i++) {
        const values = [weights.getX(i), weights.getY(i), weights.getZ(i), weights.getW(i)];
        expect(values.every(w => w >= 0 && w <= 1)).toBe(true);
        expect(values.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
      }
      const positions = mesh.geometry.getAttribute("position");
      const original = new Vector3().fromBufferAttribute(positions, 0);
      const bindPose = mesh.applyBoneTransform(0, original.clone());
      expect(bindPose.distanceTo(original)).toBeLessThan(0.0001 * Math.max(1, original.length()));
    }
    const definition = Object.values(POKEMON_MODELS).find(d => d.number === number)!;
    const animator = createPokemonAnimator(scene, root, definition, []);
    animator.update("walk", 0.1);
    expect(meshes.some(mesh => Math.abs(mesh.skeleton.bones[1].rotation.x) + Math.abs(mesh.skeleton.bones[1].rotation.y) + Math.abs(mesh.skeleton.bones[1].rotation.z) > 0.001)).toBe(true);
    animator.dispose(); disposeRig();
    gltf.scene.traverse(node => { if ("geometry" in node) expect((node.geometry as SkinnedMesh["geometry"]).getAttribute("skinWeight")).toBeUndefined(); });
  }
});

it("rigs rigid quadrupeds with hip/knee chains so hooves follow the lower leg", async () => {
  for (const number of [77, 111, 128]) {
    const gltf = await loadPokemonModel(number);
    const scene = clone(gltf.scene); const root = new Group(); root.add(scene);
    const disposeRig = rigPokemonAppendages(scene, number);
    const meshes: SkinnedMesh[] = [];
    scene.traverse(node => { if (node instanceof SkinnedMesh) meshes.push(node); });
    expect(meshes.length, `#${number}`).toBeGreaterThan(0);
    // Ponyta's flame hair has more vertices than its body; pick the mesh that reaches the floor.
    const floor = (mesh: SkinnedMesh) => new Box3().setFromObject(mesh).min.y;
    const body = meshes.reduce((a, b) => floor(a) <= floor(b) ? a : b);
    const names = body.skeleton.bones.map(bone => bone.name);
    for (const name of ["LArm", "LForeArm", "RArm", "RForeArm", "LThigh", "LLeg", "RThigh", "RLeg", "Neck", "Head"]) expect(names, `#${number}`).toContain(name);
    for (const mesh of meshes) {
      const weights = mesh.geometry.getAttribute("skinWeight");
      for (let i = 0; i < weights.count; i++) expect(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i)).toBeCloseTo(1, 5);
      const original = new Vector3().fromBufferAttribute(mesh.geometry.getAttribute("position"), 0);
      expect(mesh.applyBoneTransform(0, original.clone()).distanceTo(original)).toBeLessThan(0.0001 * Math.max(1, original.length()));
    }
    // The lowest vertex is a hoof: it belongs to a lower-leg joint, not the body.
    const positions = body.geometry.getAttribute("position");
    const world = new Vector3();
    let lowest = 0, lowestY = Infinity;
    for (let i = 0; i < positions.count; i++) { body.localToWorld(world.fromBufferAttribute(positions, i)); if (world.y < lowestY) { lowestY = world.y; lowest = i; } }
    const skinIndex = body.geometry.getAttribute("skinIndex"), skinWeight = body.geometry.getAttribute("skinWeight");
    expect(names[skinIndex.getX(lowest)], `#${number}`).toMatch(/^[LR](ForeArm|Leg)$/);
    expect(skinWeight.getX(lowest)).toBeGreaterThan(0.9);
    const definition = Object.values(POKEMON_MODELS).find(d => d.number === number)!;
    const animator = createPokemonAnimator(scene, root, definition, []);
    animator.update("walk", 0.1);
    const thigh = body.skeleton.bones[names.indexOf("LThigh")];
    expect(Math.abs(thigh.quaternion.x) + Math.abs(thigh.quaternion.y) + Math.abs(thigh.quaternion.z)).toBeGreaterThan(0.01);
    animator.dispose(); disposeRig();
  }
});

it("rigs every remaining unskinned model from its separate pieces without altering source geometry", async () => {
  for (const number of [60, 81, 82, 90, 92, 93, 98, 99, 101, 102, 109, 110, 114, 116, 117, 118, 119, 131, 140]) {
    const gltf = await loadPokemonModel(number);
    const scene = clone(gltf.scene); const root = new Group(); root.add(scene);
    const disposeRig = rigPokemonAppendages(scene, number);
    const meshes: SkinnedMesh[] = [];
    let plainMeshes = 0;
    scene.traverse(node => { if (node instanceof SkinnedMesh) meshes.push(node); else if ("isMesh" in node) plainMeshes++; });
    expect(plainMeshes, `#${number}`).toBe(0);
    for (const mesh of meshes) {
      const weights = mesh.geometry.getAttribute("skinWeight");
      for (let i = 0; i < weights.count; i++) expect(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i)).toBeCloseTo(1, 5);
      const original = new Vector3().fromBufferAttribute(mesh.geometry.getAttribute("position"), 0);
      expect(mesh.applyBoneTransform(0, original.clone()).distanceTo(original)).toBeLessThan(0.0001 * Math.max(1, original.length()));
    }
    const definition = Object.values(POKEMON_MODELS).find(d => d.number === number)!;
    const animator = createPokemonAnimator(scene, root, definition, []);
    for (let frame = 0; frame < 20; frame++) animator.update("idle", 1 / 30);
    const moved = meshes.some(mesh => mesh.skeleton.bones.some(bone => bone.parent instanceof Bone && 1 - Math.abs(bone.quaternion.w) > 1e-5));
    expect(moved, `#${number}`).toBe(true);
    animator.dispose(); disposeRig();
    gltf.scene.traverse(node => { if ("geometry" in node) expect((node.geometry as SkinnedMesh["geometry"]).getAttribute("skinWeight")).toBeUndefined(); });
  }
});

it("gives all 151 models a skeleton at runtime", async () => {
  for (const definition of Object.values(POKEMON_MODELS)) {
    const gltf = await loadPokemonModel(definition.number);
    const scene = clone(gltf.scene);
    const disposeRig = rigPokemonAppendages(scene, definition.number);
    let bones = 0;
    scene.traverse(node => { if (node instanceof Bone) bones++; });
    expect(bones, `#${definition.number}`).toBeGreaterThan(1);
    disposeRig();
  }
});

it("carries the rider inside the galloping mount so the stride lifts them", async () => {
  const initial = createInitialWorldState();
  const renderer = await create(<WorldParty state={{ ...initial, ride: "arcanine", moving: true }} />);
  try {
    const scene = renderer.scene.instance;
    await vi.waitFor(async () => {
      await act(async () => {});
      let skinned = 0;
      scene.getObjectByName("world-mount")!.traverse(node => { if (node instanceof SkinnedMesh) skinned++; });
      expect(skinned).toBeGreaterThan(0);
    });
    const rider = scene.getObjectByName("world-rider")!;
    let ancestor = rider.parent, insideMount = false;
    while (ancestor) { if (ancestor.name === "world-mount") insideMount = true; ancestor = ancestor.parent; }
    expect(insideMount).toBe(true);
    const heights: number[] = [];
    for (let frame = 0; frame < 30; frame++) {
      await act(async () => { await renderer.advanceFrames(1, 1 / 60); });
      scene.updateMatrixWorld(true);
      heights.push(rider.getWorldPosition(new Vector3()).y);
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.02);
  } finally { await renderer.unmount(); }
});

it("animates real rigs the same whichever way they face when their clips are built", async () => {
  for (const number of [59, 78, 16, 98, 128]) {
    const gltf = await loadPokemonModel(number);
    const definition = Object.values(POKEMON_MODELS).find(d => d.number === number)!;
    const pose = (facing: number, motion: "walk" | "run" | "attack") => {
      const scene = clone(gltf.scene);
      const disposeRig = rigPokemonAppendages(scene, number);
      const world = new Group(); world.rotation.y = facing;
      const root = new Group(); root.add(scene); world.add(root);
      world.updateMatrixWorld(true);
      const animator = createPokemonAnimator(scene, root, definition, gltf.animations);
      animator.update(motion, 0.1);
      const quaternions: number[] = [];
      scene.traverse(node => { if (node instanceof Bone) quaternions.push(...node.quaternion.toArray()); });
      animator.dispose(); disposeRig();
      return quaternions;
    };
    for (const motion of ["walk", "run", "attack"] as const) {
      const front = pose(0, motion);
      for (const facing of [Math.PI / 2, Math.PI]) {
        const turned = pose(facing, motion);
        expect(turned.length).toBe(front.length);
        const worst = Math.max(...turned.map((value, i) => Math.abs(value - front[i])));
        expect(worst, `#${number} ${motion} facing ${facing}`).toBeLessThan(1e-4);
      }
    }
  }
});

it("seats riders on the mount's back, not on Rapidash's flames or Arcanine's fur ruff", async () => {
  for (const [number, ceiling] of [[78, 3.2], [59, 3.0]] as const) {
    const gltf = await loadPokemonModel(number);
    const scene = clone(gltf.scene);
    const disposeRig = rigPokemonAppendages(scene, number);
    const seat = mountSeat(scene, number);
    scene.updateMatrixWorld(true);
    const flameTop = new Box3().setFromObject(scene).max.y;
    const bone = (name: string) => { let found: Vector3 | undefined; scene.traverse(node => { if (!found && node instanceof Bone && node.name.endsWith(name)) found = node.getWorldPosition(new Vector3()); }); return found!; };
    // Between the hind and front legs, on the flat of the back (source units).
    expect(seat.z, `#${number}`).toBeGreaterThan(bone("LThigh").z);
    expect(seat.z, `#${number}`).toBeLessThan(bone("LArm").z);
    expect(seat.y, `#${number}`).toBeGreaterThan(bone("Spine1").y);
    expect(seat.y, `#${number}`).toBeLessThan(ceiling);
    expect(seat.y, `#${number}`).toBeLessThan(flameTop * 0.6);
    disposeRig();
  }
});

it("builds every species' learnset moves on its real rig with finite, looping-free clips", async () => {
  for (const definition of Object.values(POKEMON_MODELS)) {
    const gltf = await loadPokemonModel(definition.number);
    const scene = clone(gltf.scene); const root = new Group(); root.add(scene);
    applyRestPose(scene, definition.number, gltf.animations);
    const disposeRig = rigPokemonAppendages(scene, definition.number);
    const species = Object.keys(POKEMON_MODELS).find(key => POKEMON_MODELS[key] === definition)!;
    for (const move of learnsetFor(species)) {
      const clip = createMoveClip(scene, root, definition, move.id);
      expect(clip.tracks.length, `${species} ${move.id}`).toBeGreaterThan(5);
      for (const track of clip.tracks) expect(Array.from(track.values).every(Number.isFinite), `${species} ${move.id} ${track.name}`).toBe(true);
    }
    disposeRig();
  }
});

it("stands Pikachu up from its face-down bind pose before building its clips", async () => {
  const gltf = await loadPokemonModel(25);
  const measure = (scene: Group) => { scene.updateMatrixWorld(true); const size = new Vector3(); new Box3().setFromObject(scene, true).getSize(size); return size; };
  const lying = measure(clone(gltf.scene) as Group);
  const scene = clone(gltf.scene) as Group;
  applyRestPose(scene, 25, gltf.animations);
  const standing = measure(scene);
  expect(lying.z).toBeGreaterThan(lying.y * 0.95);
  expect(standing.y).toBeGreaterThan(standing.z * 1.1);
});

it("can pause animation and toggle the live joint overlay without cloning a second model", async () => {
  const renderer = await create(<PokemonModel species="squirtle" showJoints />);
  try {
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(renderer.scene.instance.getObjectByName("pokemon-joints")).toBeDefined();
    });
    const helper = renderer.scene.instance.getObjectByName("pokemon-joints")!;
    let bone: Group | undefined;
    renderer.scene.instance.traverse(node => { if (node.type === "Bone" && !bone) bone = node as Group; });
    await act(async () => { await renderer.advanceFrames(5, 1 / 60); });
    await renderer.update(<PokemonModel species="squirtle" paused showJoints />);
    const pose = bone!.quaternion.clone();
    await act(async () => { await renderer.advanceFrames(30, 1 / 60); });
    expect(bone!.quaternion.equals(pose)).toBe(true);
    expect(renderer.scene.instance.getObjectByName("pokemon-joints")).toBe(helper);
    await renderer.update(<PokemonModel species="squirtle" />);
    expect(renderer.scene.instance.getObjectByName("pokemon-joints")).toBeUndefined();
    expect(bone!.parent).not.toBeNull();
  } finally { await renderer.unmount(); }
});

it("keeps Mewtwo's authored travel in place without modifying the source clip", async () => {
  const gltf = await loadPokemonModel(150);
  for (const motion of ["walk", "run"] as const) {
    const source = gltf.animations.find(clip => clip.name.includes(motion === "walk" ? "00030_walk" : "00100_run"))!;
    const original = source.tracks.find(track => track.name === "origin_75.position")!;
    const before = Array.from(original.values);
    const clip = selectSpeciesClip(gltf.animations, motion, 150)!;
    const track = clip.tracks.find(track => track.name === "origin_75.position")!;
    for (let i = 3; i < track.values.length; i++) expect(track.values[i]).toBe(track.values[i % 3]);
    expect(Array.from(original.values)).toEqual(before);
    expect(before[before.length - 1]).toBeGreaterThan(1);
  }
});

it("poses both caterpillar body branches along the ground before generating crawl clips", async () => {
  for (const number of [10, 13]) {
    const gltf = await loadPokemonModel(number);
    const scene = clone(gltf.scene); const root = new Group(); root.add(scene);
    const disposeRig = rigPokemonAppendages(scene, number);
    root.updateMatrixWorld(true);
    const joints = new Map<string, Bone>();
    scene.traverse(bone => { if (bone instanceof Bone) joints.set(normalizePokemonBone(bone.name), bone); });
    const head = joints.get("Head")!.getWorldPosition(new Vector3());
    const hip = joints.get("Hips")!.getWorldPosition(new Vector3());
    const tail = joints.get("Tail1")!.getWorldPosition(new Vector3());
    expect(head.z).toBeGreaterThan(hip.z);
    expect(tail.z).toBeLessThan(hip.z);
    expect(Math.abs(head.y - hip.y)).toBeLessThan(Math.abs(head.z - hip.z) * 0.2);
    expect(gltf.scene.quaternion.angleTo(scene.quaternion)).toBeCloseTo(Math.PI / 2);
    disposeRig();
  }
});
