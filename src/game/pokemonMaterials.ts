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

/** A fresh non-metallic, lit material carrying the source's textures, colour and transparency.
 * The source (shared by the cached GLTF) is left untouched; textures stay shared with it. */
export function normalizePokemonMaterial(source: Material): MeshStandardMaterial {
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
  return skin;
}
