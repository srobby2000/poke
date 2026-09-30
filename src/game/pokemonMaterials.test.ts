import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Texture } from "three";
import type { Material, Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { normalizePokemonMaterial, SKIN_ROUGHNESS } from "./pokemonMaterials";
import { POKEMON_MODELS } from "./pokemonModels";

(globalThis as { self?: unknown }).self ??= globalThis;
// Stand-in textures, so texture slots survive the parse without decoding images in Node.
const load = async (number: number): Promise<GLTF> => {
  const bytes = await readFile(`public/models/pokemon/${number}.glb`);
  const loader = new GLTFLoader();
  loader.register(() => ({ name: "STUB_TEXTURES", loadTexture: () => Promise.resolve(new Texture()) }) as never);
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, "");
};
const materialsOf = (gltf: GLTF) => {
  const found: Material[] = [];
  gltf.scene.traverse(node => { if ((node as Mesh).isMesh) found.push(...[(node as Mesh).material].flat()); });
  return found;
};

describe("one skin surface for every Pokémon", () => {
  for (const [name, { number }] of Object.entries(POKEMON_MODELS)) {
    it(`${name} renders lit and non-metallic, keeping its textures and transparency`, async () => {
      const sources = materialsOf(await load(number));
      expect(sources.length).toBeGreaterThan(0);
      for (const source of sources) {
        const skin = normalizePokemonMaterial(source);
        expect(skin).toBeInstanceOf(MeshStandardMaterial);
        expect(skin).not.toBeInstanceOf(MeshPhysicalMaterial);
        expect([skin.metalness, skin.roughness, skin.metalnessMap, skin.roughnessMap]).toEqual([0, SKIN_ROUGHNESS, null, null]);
        const from = source as MeshStandardMaterial;
        expect(skin.map).toBe(from.map ?? null);
        expect(skin.normalMap).toBe(from.normalMap ?? null);
        expect(skin.color.getHex()).toBe(from.color.getHex());
        expect([skin.transparent, skin.opacity, skin.alphaTest, skin.side, skin.vertexColors, skin.name])
          .toEqual([source.transparent, source.opacity, source.alphaTest, source.side, from.vertexColors, source.name]);
      }
    });
  }
});

it("lights the unlit exports (Ditto, Dragonite, Mewtwo) and un-metals the black ones (Beedrill, Magneton)", async () => {
  for (const number of [132, 149, 150]) {
    const sources = materialsOf(await load(number));
    expect(sources.every(material => material instanceof MeshBasicMaterial)).toBe(true);
    for (const source of sources) expect(normalizePokemonMaterial(source)).toBeInstanceOf(MeshStandardMaterial);
  }
  for (const number of [15, 82]) {
    const sources = materialsOf(await load(number)) as MeshStandardMaterial[];
    expect(sources.some(material => material.metalness === 1)).toBe(true);
    for (const source of sources) expect(normalizePokemonMaterial(source).metalness).toBe(0);
  }
});

it("leaves the cached source material untouched", async () => {
  const [source] = materialsOf(await load(15)) as MeshStandardMaterial[];
  normalizePokemonMaterial(source);
  expect(source.metalness).toBe(1);
});
