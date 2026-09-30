# Pokémon skin rendering

Every Pokémon is drawn with the same surface and the same lighting balance in every scene. Before this, the bundled models brought their own shading setups, and each scene lit them differently.

## What was different

**The model files ask for five different surfaces.** All 151 GLBs were exported by glTF-Transform, but they come from different sources. No scene has an environment map, so a metallic surface has nothing to reflect and loses its colour.

| Source setup | Species | three.js material | How it looked |
| --- | --- | --- | --- |
| Metalness 0.4, roughness 0.707 | About 100, most of the Kanto rigs | Standard | 40% of colour lost: darker and duller |
| Matte (metalness 0) | About 40, such as Bulbasaur, Charizard, the Eevee line and the rigid-body models | Standard | Normal |
| Fully metallic | Beedrill, Magneton, Grimer, Muk, Koffing, Weezing | Standard | Black (Beedrill, Magneton) or dark navy (Grimer, Muk) |
| KHR_materials_specular | Pikachu's face, Magnemite, Onix, Exeggutor, Moltres | Physical | Different highlights; Moltres near black |
| KHR_materials_unlit | Mewtwo, Dragonite, Ditto | Basic | Flat: no shading, shadows or hit flash |

The vertex colours in about 40 models are pure white, so they change nothing.

**Every scene lit Pokémon differently.** The Pokédex used ambient 1.5, directional 2 and hemisphere 1, which washed colours out to pastels. Battles had no ambient light. The lobby used a fourth mix.

**The review sheets didn't draw skins.** `scripts/audit-pokemon-motion.mjs` rasterises flat blue triangles with no textures, materials or lighting. It checks poses and joints, not how skins look.

The five ways a mesh gets skinned (authored skins, Golbat's wing rig, and the generated rigid-body, quadruped and parts rigs in `src/game/pokemonAppendages.ts`) all produce ordinary GPU-skinned `SkinnedMesh` objects that reuse the mesh's material. They deform differently but shade the same.

## What renders now

- **One surface** (`normalizePokemonMaterial` in `src/game/pokemonMaterials.ts`): every skin becomes a non-metallic, lit MeshStandardMaterial with roughness 0.7.
  - Kept from the source: the colour texture, colour, normal map, occlusion and emissive maps, transparency, alpha test, double-sidedness and vertex colours.
  - Dropped: metalness and roughness factors and maps, the specular extension, and the unlit flag.
  - Flame sheets (Charizard, Rapidash) get their flame shader on top, as before. Hit flashes now work on all 151.
- **One lighting balance** (`src/components/PokemonLighting.tsx`): ambient 0.95, hemisphere 0.8 and a key light of 1.9, which is the overworld's existing balance. The Pokédex, world, cave, battle and lobby differ only in tint, key-light direction and shadows, and caves use less ambient light (0.65).

- **Solid skins exported as blended** (`SOLID_SKINS`): a blended material skips the depth buffer, so a body drawn that way sorts against itself and shows through. Farfetch'd's beak showed through the back of its head and its leek through its wing. Its body texture is 97% opaque, and Moltres' body and eyes have no alpha channel at all, so these render opaque and ignore alpha. Farfetch'd's few low-alpha texels are painted skin, not cut-outs, so cutting them out opens holes at the neck and crown. Eye decals, Gastly's gas and Moltres' fire stay blended. A test re-checks every blended material in the model files.

Weezing is still dark: its UVs sample the dark purple parts of its own texture. That comes from the source art, not the renderer.

## Review sheets

Rendered through the game's own `PokemonModel` and `PokemonLighting`, in the rest pose, 40 per sheet:

- After: [sheet 1](model-review/skins/sheet-01.png), [2](model-review/skins/sheet-02.png), [3](model-review/skins/sheet-03.png), [4](model-review/skins/sheet-04.png)
- Before, with the old materials and Pokédex lights: [sheet 1](model-review/skins/before-sheet-01.png) (Beedrill black), [3](model-review/skins/before-sheet-03.png) (Magneton black, Grimer and Muk navy), [4](model-review/skins/before-sheet-04.png) (Moltres dark; Mewtwo, Dragonite and Ditto flat)

## Reproduce

```sh
npm run dev                                   # serves /review.html (dev only, not in the build)
node scripts/review-pokemon-skins.mjs         # -> docs/model-review/skins/sheet-0N.png
node scripts/review-pokemon-skins.mjs /tmp/x --motion walk
# Other lighting: open /review.html?sheet=4&mood=battle (dex, world, cave, battle, lobby)
npx vitest run src/game/pokemonMaterials.test.ts
```
