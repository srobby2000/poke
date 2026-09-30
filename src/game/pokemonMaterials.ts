import { MeshStandardMaterial } from "three";
import type { Material, MeshBasicMaterial } from "three";

/** One surface for every Pokémon skin. The bundled GLBs come from different sources and ask for
 * five different shading setups (40% metallic, matte, fully metallic, KHR specular, unlit). The
 * scenes have no environment map, so metallic skins lose their colour (Beedrill and Magneton
 * render black) while unlit ones (Mewtwo, Dragonite, Ditto) ignore every light and never flash.
 * See docs/pokemon-skin-rendering.md. */
export const SKIN_ROUGHNESS = 0.7;

type SourceMaterial = Material & Partial<Pick<MeshStandardMaterial,
  "color" | "map" | "normalMap" | "normalScale" | "aoMap" | "aoMapIntensity" | "emissive" | "emissiveMap" | "emissiveIntensity" | "alphaMap" | "flatShading">>
  & Partial<Pick<MeshBasicMaterial, "vertexColors">>;

/** Solid skins exported as alpha-blended. A blended material skips the depth buffer, so a body
 * drawn that way sorts against itself and shows through: Farfetch'd's beak shows through the
 * back of its head and its leek through its wing. These textures are solid (Farfetch'd's body is
 * 97% opaque; Moltres' body and eyes have no alpha channel at all), so they render opaque and
 * ignore alpha. Farfetch'd's few low-alpha texels are painted skin (its dark collar, the crown of
 * its head), not cut-outs: cutting them out opens holes. Eye decals, Gastly's gas and Moltres'
 * fire stay blended. pokemonMaterials.test.ts re-checks every blended material. */
export const SOLID_SKINS: Record<number, string[]> = { 83: ["Body"], 146: ["body", "eye"] };

/** A fresh non-metallic, lit material carrying the source's textures, colour and transparency.
 * The source (shared by the cached GLTF) is left untouched; textures stay shared with it. */
export function normalizePokemonMaterial(source: Material, number?: number): MeshStandardMaterial {
  const from = source as SourceMaterial;
  const skin = new MeshStandardMaterial({ metalness: 0, roughness: SKIN_ROUGHNESS });
  skin.name = source.name;
  if (from.color) skin.color.copy(from.color);
  skin.map = from.map ?? null;
  skin.alphaMap = from.alphaMap ?? null;
  skin.aoMap = from.aoMap ?? null;
  skin.aoMapIntensity = from.aoMapIntensity ?? 1;
  skin.normalMap = from.normalMap ?? null;
  if (from.normalScale) skin.normalScale.copy(from.normalScale);
  if (from.emissive) skin.emissive.copy(from.emissive);
  skin.emissiveMap = from.emissiveMap ?? null;
  skin.emissiveIntensity = from.emissiveIntensity ?? 1;
  skin.flatShading = from.flatShading ?? false;
  skin.vertexColors = from.vertexColors ?? false;
  skin.side = source.side;
  skin.transparent = source.transparent;
  skin.opacity = source.opacity;
  skin.alphaTest = source.alphaTest;
  skin.depthWrite = source.depthWrite;
  skin.depthTest = source.depthTest;
  skin.userData = { ...source.userData };
  if (number !== undefined && SOLID_SKINS[number]?.includes(source.name)) {
    skin.transparent = false;
    skin.depthWrite = true;
    skin.alphaTest = 0;
  }
  return skin;
}
