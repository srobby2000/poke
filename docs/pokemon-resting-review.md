# Resting poses

Flying travel and resting idle now have separate poses. All mapped flyers use static folded wing tracks, with floor compensation after folding. Zubat's authored flight is only selected for travel. The wing flex driver resets during idle and starts fresh on takeoff.

## Serpent references and corrections

The initial implementation incorrectly used the same flat tail loop for all four species and left the upper body straight. The revised poses use the official Pokédex artwork:

| Species | Reference | Resting shape |
| --- | --- | --- |
| Ekans | [Official artwork](https://assets.pokemon.com/assets/cms2/img/pokedex/full/023.png) | Lower loop plus a rising upper turn, short raised neck and lifted rattle |
| Arbok | [Official artwork](https://assets.pokemon.com/assets/cms2/img/pokedex/full/024.png) | Broad curved base, transition into an upright hood, tail tip lifted |
| Dratini | [Official artwork](https://assets.pokemon.com/assets/cms2/img/pokedex/full/147.png) | Open J-shaped body with a gently lifted tail; no closed coil |
| Dragonair | [Official artwork](https://assets.pokemon.com/assets/cms2/img/pokedex/full/148.png) | Sweeping lower loop, curved neck and lifted tail tip |

Both the lower spine and tail are posed, including the hip-to-tail link. Each source span is split into five smaller spans, preserving its total length. Body triangles are subdivided twice and their skin weights are redistributed onto the added joints. New joint inverse binds use the mesh's bind coordinate system. The cached mesh, original inverse-bind buffers and source skeleton are not modified. The head keeps its original world orientation.

Joint counts: Ekans 25 → 109, Arbok 26 → 102, Dratini 16 → 60, Dragonair 24 → 92. Added joints carry vertex weights; they are not only guides. A curve fitted to body length centers Ekans' upper turn over the lower turn. Explicit belly orientation prevents accumulated twist through the coil. Idle tail motion stays lateral. Onix retains its existing body pose.

[Rendered comparison](model-review/serpent-rest/sheet-01.png): rows are Ekans, Arbok, Dratini, Dragonair. Columns are idle front, three-quarter, right, left, back, top, later idle, and travel. These are procedural interpretations constrained by the source mesh proportions and joint counts, rather than exact reproductions of the artwork.

Tentacool, Tentacruel, Omanyte and Omastar have explicit feeler mappings with a resting curl and delays per segment and branch. These mappings are shared by idle, travel, attack, hit and move clips. Tangela retains its generated part rig.

## Additional reference views

- [Ekans game sprites](https://pokemondb.net/sprites/ekans), [Arbok](https://pokemondb.net/sprites/arbok), [Dratini](https://pokemondb.net/sprites/dratini), [Dragonair](https://pokemondb.net/sprites/dragonair): inspected game-derived front/back silhouettes in addition to official artwork.
- [Ekans 3D reference gallery](https://www.turbosquid.com/3d-models/ekans-pokemon-3d-fbx/1134407): inspected side/front, rear, and elevated rear wireframe views to resolve the stacked-turn depth and tail exit. This is a third-party interpretation, not official turnaround art. No complete official orthographic turnaround was found; the depth reconstruction remains an interpretation checked against these views.

## Textured review

Six labeled views per Pokémon, captured through the actual game renderer: front, right, back, left, top and three-quarter.

- [Ekans](model-review/serpent-rest/ekans-views.png)
- [Arbok](model-review/serpent-rest/arbok-views.png)
- [Dratini](model-review/serpent-rest/dratini-views.png)
- [Dragonair](model-review/serpent-rest/dragonair-views.png)

The textured review exposed belly twisting and pinching that were hard to see in the earlier shaded sheets. The body frame now keeps belly scales toward the floor around a horizontal turn and forward on the neck. Source mesh proportions and radial polygon counts still constrain the silhouette.

## Repeatable checks

- `npm test`: all species and five base motions, move samples, landing/takeoff, three-second still-wing checks, serpent silhouettes, preserved total span lengths, raised tips and head orientation. Added coverage checks that the new joints carry weights, weights sum to one and cached source assets remain unchanged.
- `npm run build` and `npm run lint`.
- `node scripts/audit-pokemon-motion.mjs docs/model-review/serpent-rest --serpents`: detailed geometry and joint views.
- Start `npm run dev`, then `node scripts/review-pokemon-serpents.mjs`: six textured views for all four species. Pass output directory and server URL as positional arguments; set `CHROME_PATH` if using a local Chrome installation.

The four resting poses were inspected from every labeled view. Automated checks also cover base motion and representative moves; the screenshots do not certify every frame of every attack.
