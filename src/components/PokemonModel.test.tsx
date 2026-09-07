import { createInitialBattleState } from "../game/battleState";
import { readFile } from "node:fs/promises";
import { afterAll, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { loadPokemonModel } from "../game/loadPokemonModel";
import { act, create } from "@react-three/test-renderer";
import { Box3, Vector3 } from "three";
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
