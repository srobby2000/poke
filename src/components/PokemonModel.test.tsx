import { createInitialBattleState } from "../game/battleState";
import { readFile } from "node:fs/promises";
import { afterAll, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { loadPokemonModel } from "../game/loadPokemonModel";
import { act, create } from "@react-three/test-renderer";
import { appendageMotion, rigPokemonAppendages } from "../game/pokemonAppendages";
import { createPokemonAnimator } from "../game/pokemonAnimation";
import { POKEMON_MODELS } from "../game/pokemonModels";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Box3, Group, SkinnedMesh, Vector3 } from "three";
import { PokemonModel } from "./PokemonModel";

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
        const size = new Box3().setFromObject(group).getSize(new Vector3());
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
    for (const motion of ["idle", "walk", "attack", "hit", "idle"] as const) {
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
  for (const number of [6, 12, 18, 26, 38, 49, 123, 144, 145, 151]) {
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
