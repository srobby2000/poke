# Pokémon model assets

151 regular Kanto GLBs from https://github.com/Pokemon-3D-api/assets
Pinned source commit: 429de1288cea0d43f5b4f56305d2276e94239d65

Pokémon and model rights belong to Nintendo / Creatures Inc. / GAME FREAK inc., as identified by the upstream collection. These are third-party assets, not original meshes authored by this project. See docs/pokemon-model-audit.md for sources, per-species comparisons, corrections, and review limitations.

Local JSON material/outline repairs: scripts/repair-pokemon-models.py.
Runtime wing and flame repairs: src/game/pokemonModelGeometry.ts and src/components/PokemonModel.tsx.
Models are delivered with uncompressed geometry and embedded PNG textures. No browser worker, WebAssembly decoder, or WebP extension is required. Geometry and transforms were checked across conversion.
