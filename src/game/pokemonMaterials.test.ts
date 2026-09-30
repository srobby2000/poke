import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Texture } from "three";
import type { Material, Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { inflateSync } from "node:zlib";
import { normalizePokemonMaterial, SKIN_ROUGHNESS, SOLID_SKINS } from "./pokemonMaterials";
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

/** Share of opaque texels in an 8-bit RGBA PNG, or 1 when it has no alpha channel. */
function opaqueShare(png: Buffer) {
  let offset = 8, width = 0, height = 0, type = 0, depth = 0;
  const data: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset), kind = png.toString("ascii", offset + 4, offset + 8), chunk = png.subarray(offset + 8, offset + 8 + length);
    if (kind === "IHDR") { width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4); depth = chunk[8]; type = chunk[9]; }
    if (kind === "IDAT") data.push(chunk);
    offset += 12 + length;
  }
  if (type !== 6 || depth !== 8) return 1;
  const raw = inflateSync(Buffer.concat(data)), stride = width * 4, pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? pixels[y * stride + x - 4] : 0, b = y ? pixels[(y - 1) * stride + x] : 0, c = x >= 4 && y ? pixels[(y - 1) * stride + x - 4] : 0;
      const p = a + b - c, predictor = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      pixels[y * stride + x] = (line[x] + [0, a, b, (a + b) >> 1, predictor][filter]) & 255;
    }
  }
  let opaque = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] >= 250) opaque++;
  return opaque / (width * height);
}

it("renders every solid skin that was exported as blended opaque, and leaves real transparency blended", async () => {
  // A blended material covering most of a model with a solid texture sorts against itself and
  // shows through (Farfetch'd). Decals (eyes) and see-through parts (gas, fire) stay blended.
  const found: Record<number, string[]> = {};
  for (const { number } of Object.values(POKEMON_MODELS)) {
    const bytes = await readFile(`public/models/pokemon/${number}.glb`);
    const jsonLength = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
    const binary = bytes.subarray(28 + jsonLength);
    const vertices = new Map<number, number>();
    let total = 0;
    for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
      const count = gltf.accessors[primitive.attributes.POSITION].count;
      vertices.set(primitive.material, (vertices.get(primitive.material) ?? 0) + count);
      total += count;
    }
    gltf.materials.forEach((material: { name: string; alphaMode?: string; pbrMetallicRoughness?: { baseColorTexture?: { index: number } } }, index: number) => {
      if (material.alphaMode !== "BLEND" || (vertices.get(index) ?? 0) / total < 0.3) return;
      const texture = material.pbrMetallicRoughness?.baseColorTexture;
      const image = texture && gltf.images[gltf.textures[texture.index].source];
      const view = image && gltf.bufferViews[image.bufferView];
      const share = !image ? 1 : image.mimeType !== "image/png" ? 1 : opaqueShare(binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
      if (share >= 0.9) (found[number] ??= []).push(material.name);
    });
  }
  // Moltres' eyes are a small part, but its texture has no alpha either; they're listed too.
  expect(Object.fromEntries(Object.entries(found).map(([n, names]) => [n, names.sort()])))
    .toEqual(Object.fromEntries(Object.entries(SOLID_SKINS).map(([n, names]) => [n, names.filter(name => found[Number(n)]?.includes(name)).sort()])));
  for (const [number, names] of Object.entries(SOLID_SKINS)) {
    const sources = materialsOf(await load(Number(number))).filter(material => names.includes(material.name));
    expect(sources.length, number).toBe(names.length);
    for (const source of sources) {
      expect(source.transparent, `${number} ${source.name} is blended in the file`).toBe(true);
      const skin = normalizePokemonMaterial(source, Number(number));
      expect([skin.transparent, skin.depthWrite, skin.alphaTest], `${number} ${source.name}`).toEqual([false, true, 0]);
    }
  }
  // Farfetch'd's eyes and Gastly's gas stay see-through.
  const eye = materialsOf(await load(83)).find(material => material.name === "material")!;
  expect(normalizePokemonMaterial(eye, 83).transparent).toBe(true);
  expect(materialsOf(await load(92)).filter(material => material.transparent).every(material => normalizePokemonMaterial(material, 92).transparent)).toBe(true);
});
