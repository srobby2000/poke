# Pokémon model audit

All 151 Kanto GLBs were rendered and individually compared with their numbered Pokémon artwork reference. The previous procedural approximations were replaced with species-specific, locally bundled assets.

**Scope:** species identity, visible anatomy, textures, and obvious rendering defects in front/three-quarter views. The artwork and model poses differ. This review does not certify every animation or rear view. Live browser verification remains pending because no browser is connected.

## Reproduce a model render

The optional `scripts/render-pokemon-model.py` script takes a National Dex number (1–151) and uses Blender’s `bpy` package. The audit used Python 3.11 and bpy 4.5.3 in a temporary environment. It writes to the system temporary directory, or `POKEMON_REVIEW_DIR` when set. This tool is separate from the application dependencies.

## Browser loading compatibility

Assets now use uncompressed geometry and embedded PNG textures. The conversion preserved decoded geometry arrays and node transforms, and the loader disables runtime Draco/Meshopt decoding. A scene integration test loads and mounts all three arena starters while rejecting worker creation. The asset URL version was changed to invalidate previously failed loads.

## Sources

- Models: [Pokémon 3D API assets](https://github.com/Pokemon-3D-api/assets), pinned commit `429de1288cea0d43f5b4f56305d2276e94239d65`.
- References: [PokeAPI official-artwork sprite collection](https://github.com/PokeAPI/sprites/tree/master/sprites/pokemon/other/official-artwork).
- Model and Pokémon artwork rights remain with their respective owners; upstream identifies Nintendo, Creatures Inc. and GAME FREAK inc.

## Corrections

- #006: Flame masks receive warm emissive color and luminance transparency at runtime.
- #012: Removed coincident wing triangles at runtime; surfaces are double-sided. Re-render confirmed intact wing patterns.
- #040: Small source scale; preview framing corrected by excluding renderer helper meshes and adjusting camera clipping. Runtime normalizes bounds.
- #041: Removed opaque outline shell. Re-render confirmed blue body and purple wings.
- #078: Flame masks receive warm emissive color and luminance transparency. Neutral source pose has tall mane/flame planes.
- #082: Small source scale; camera clipping corrected for offline inspection. Runtime normalizes bounds.
- #093: Corrected oversaturated body and tongue material colors.
- #095: Removed opaque outline shell. Re-render confirmed segmented rock body; runtime normalizes small source scale.

## Per-species review

Each comparison shows the rendered GLB on the left and artwork on the right. “Compared” records a visual identity check, not identical poses or pixel matching.

| Dex | Species | Review | Evidence |
| --- | --- | --- | --- |
| 001 | bulbasaur | Compared | [Comparison](model-review/sheet-01.png) |
| 002 | ivysaur | Compared | [Comparison](model-review/sheet-01.png) |
| 003 | venusaur | Compared | [Comparison](model-review/sheet-01.png) |
| 004 | charmander | Compared | [Comparison](model-review/sheet-01.png) |
| 005 | charmeleon | Compared | [Comparison](model-review/sheet-01.png) |
| 006 | charizard | Compared; corrected/rechecked | [Comparison](model-review/sheet-01.png) |
| 007 | squirtle | Compared | [Comparison](model-review/sheet-01.png) |
| 008 | wartortle | Compared | [Comparison](model-review/sheet-01.png) |
| 009 | blastoise | Compared | [Comparison](model-review/sheet-01.png) |
| 010 | caterpie | Compared | [Comparison](model-review/sheet-01.png) |
| 011 | metapod | Compared | [Comparison](model-review/sheet-01.png) |
| 012 | butterfree | Compared; corrected/rechecked | [Comparison](model-review/sheet-01.png) |
| 013 | weedle | Compared | [Comparison](model-review/sheet-02.png) |
| 014 | kakuna | Compared | [Comparison](model-review/sheet-02.png) |
| 015 | beedrill | Compared | [Comparison](model-review/sheet-02.png) |
| 016 | pidgey | Compared | [Comparison](model-review/sheet-02.png) |
| 017 | pidgeotto | Compared | [Comparison](model-review/sheet-02.png) |
| 018 | pidgeot | Compared | [Comparison](model-review/sheet-02.png) |
| 019 | rattata | Compared | [Comparison](model-review/sheet-02.png) |
| 020 | raticate | Compared | [Comparison](model-review/sheet-02.png) |
| 021 | spearow | Compared | [Comparison](model-review/sheet-02.png) |
| 022 | fearow | Compared | [Comparison](model-review/sheet-02.png) |
| 023 | ekans | Compared | [Comparison](model-review/sheet-02.png) |
| 024 | arbok | Compared | [Comparison](model-review/sheet-02.png) |
| 025 | pikachu | Compared | [Comparison](model-review/sheet-03.png) |
| 026 | raichu | Compared | [Comparison](model-review/sheet-03.png) |
| 027 | sandshrew | Compared | [Comparison](model-review/sheet-03.png) |
| 028 | sandslash | Compared | [Comparison](model-review/sheet-03.png) |
| 029 | nidoran-f | Compared | [Comparison](model-review/sheet-03.png) |
| 030 | nidorina | Compared | [Comparison](model-review/sheet-03.png) |
| 031 | nidoqueen | Compared | [Comparison](model-review/sheet-03.png) |
| 032 | nidoran-m | Compared | [Comparison](model-review/sheet-03.png) |
| 033 | nidorino | Compared | [Comparison](model-review/sheet-03.png) |
| 034 | nidoking | Compared | [Comparison](model-review/sheet-03.png) |
| 035 | clefairy | Compared | [Comparison](model-review/sheet-03.png) |
| 036 | clefable | Compared | [Comparison](model-review/sheet-03.png) |
| 037 | vulpix | Compared | [Comparison](model-review/sheet-04.png) |
| 038 | ninetales | Compared | [Comparison](model-review/sheet-04.png) |
| 039 | jigglypuff | Compared | [Comparison](model-review/sheet-04.png) |
| 040 | wigglytuff | Compared; corrected/rechecked | [Comparison](model-review/sheet-04.png) |
| 041 | zubat | Compared; corrected/rechecked | [Comparison](model-review/sheet-04.png) |
| 042 | golbat | Compared | [Comparison](model-review/sheet-04.png) |
| 043 | oddish | Compared | [Comparison](model-review/sheet-04.png) |
| 044 | gloom | Compared | [Comparison](model-review/sheet-04.png) |
| 045 | vileplume | Compared | [Comparison](model-review/sheet-04.png) |
| 046 | paras | Compared | [Comparison](model-review/sheet-04.png) |
| 047 | parasect | Compared | [Comparison](model-review/sheet-04.png) |
| 048 | venonat | Compared | [Comparison](model-review/sheet-04.png) |
| 049 | venomoth | Compared | [Comparison](model-review/sheet-05.png) |
| 050 | diglett | Compared | [Comparison](model-review/sheet-05.png) |
| 051 | dugtrio | Compared | [Comparison](model-review/sheet-05.png) |
| 052 | meowth | Compared | [Comparison](model-review/sheet-05.png) |
| 053 | persian | Compared | [Comparison](model-review/sheet-05.png) |
| 054 | psyduck | Compared | [Comparison](model-review/sheet-05.png) |
| 055 | golduck | Compared | [Comparison](model-review/sheet-05.png) |
| 056 | mankey | Compared | [Comparison](model-review/sheet-05.png) |
| 057 | primeape | Compared | [Comparison](model-review/sheet-05.png) |
| 058 | growlithe | Compared | [Comparison](model-review/sheet-05.png) |
| 059 | arcanine | Compared | [Comparison](model-review/sheet-05.png) |
| 060 | poliwag | Compared | [Comparison](model-review/sheet-05.png) |
| 061 | poliwhirl | Compared | [Comparison](model-review/sheet-06.png) |
| 062 | poliwrath | Compared | [Comparison](model-review/sheet-06.png) |
| 063 | abra | Compared | [Comparison](model-review/sheet-06.png) |
| 064 | kadabra | Compared | [Comparison](model-review/sheet-06.png) |
| 065 | alakazam | Compared | [Comparison](model-review/sheet-06.png) |
| 066 | machop | Compared | [Comparison](model-review/sheet-06.png) |
| 067 | machoke | Compared | [Comparison](model-review/sheet-06.png) |
| 068 | machamp | Compared | [Comparison](model-review/sheet-06.png) |
| 069 | bellsprout | Compared | [Comparison](model-review/sheet-06.png) |
| 070 | weepinbell | Compared | [Comparison](model-review/sheet-06.png) |
| 071 | victreebel | Compared | [Comparison](model-review/sheet-06.png) |
| 072 | tentacool | Compared | [Comparison](model-review/sheet-06.png) |
| 073 | tentacruel | Compared | [Comparison](model-review/sheet-07.png) |
| 074 | geodude | Compared | [Comparison](model-review/sheet-07.png) |
| 075 | graveler | Compared | [Comparison](model-review/sheet-07.png) |
| 076 | golem | Compared | [Comparison](model-review/sheet-07.png) |
| 077 | ponyta | Compared | [Comparison](model-review/sheet-07.png) |
| 078 | rapidash | Compared; corrected/rechecked | [Comparison](model-review/sheet-07.png) |
| 079 | slowpoke | Compared | [Comparison](model-review/sheet-07.png) |
| 080 | slowbro | Compared | [Comparison](model-review/sheet-07.png) |
| 081 | magnemite | Compared | [Comparison](model-review/sheet-07.png) |
| 082 | magneton | Compared; corrected/rechecked | [Comparison](model-review/sheet-07.png) |
| 083 | farfetchd | Compared | [Comparison](model-review/sheet-07.png) |
| 084 | doduo | Compared | [Comparison](model-review/sheet-07.png) |
| 085 | dodrio | Compared | [Comparison](model-review/sheet-08.png) |
| 086 | seel | Compared | [Comparison](model-review/sheet-08.png) |
| 087 | dewgong | Compared | [Comparison](model-review/sheet-08.png) |
| 088 | grimer | Compared | [Comparison](model-review/sheet-08.png) |
| 089 | muk | Compared | [Comparison](model-review/sheet-08.png) |
| 090 | shellder | Compared | [Comparison](model-review/sheet-08.png) |
| 091 | cloyster | Compared | [Comparison](model-review/sheet-08.png) |
| 092 | gastly | Compared | [Comparison](model-review/sheet-08.png) |
| 093 | haunter | Compared; corrected/rechecked | [Comparison](model-review/sheet-08.png) |
| 094 | gengar | Compared | [Comparison](model-review/sheet-08.png) |
| 095 | onix | Compared; corrected/rechecked | [Comparison](model-review/sheet-08.png) |
| 096 | drowzee | Compared | [Comparison](model-review/sheet-08.png) |
| 097 | hypno | Compared | [Comparison](model-review/sheet-09.png) |
| 098 | krabby | Compared | [Comparison](model-review/sheet-09.png) |
| 099 | kingler | Compared | [Comparison](model-review/sheet-09.png) |
| 100 | voltorb | Compared | [Comparison](model-review/sheet-09.png) |
| 101 | electrode | Compared | [Comparison](model-review/sheet-09.png) |
| 102 | exeggcute | Compared | [Comparison](model-review/sheet-09.png) |
| 103 | exeggutor | Compared | [Comparison](model-review/sheet-09.png) |
| 104 | cubone | Compared | [Comparison](model-review/sheet-09.png) |
| 105 | marowak | Compared | [Comparison](model-review/sheet-09.png) |
| 106 | hitmonlee | Compared | [Comparison](model-review/sheet-09.png) |
| 107 | hitmonchan | Compared | [Comparison](model-review/sheet-09.png) |
| 108 | lickitung | Compared | [Comparison](model-review/sheet-09.png) |
| 109 | koffing | Compared | [Comparison](model-review/sheet-10.png) |
| 110 | weezing | Compared | [Comparison](model-review/sheet-10.png) |
| 111 | rhyhorn | Compared | [Comparison](model-review/sheet-10.png) |
| 112 | rhydon | Compared | [Comparison](model-review/sheet-10.png) |
| 113 | chansey | Compared | [Comparison](model-review/sheet-10.png) |
| 114 | tangela | Compared | [Comparison](model-review/sheet-10.png) |
| 115 | kangaskhan | Compared | [Comparison](model-review/sheet-10.png) |
| 116 | horsea | Compared | [Comparison](model-review/sheet-10.png) |
| 117 | seadra | Compared | [Comparison](model-review/sheet-10.png) |
| 118 | goldeen | Compared | [Comparison](model-review/sheet-10.png) |
| 119 | seaking | Compared | [Comparison](model-review/sheet-10.png) |
| 120 | staryu | Compared | [Comparison](model-review/sheet-10.png) |
| 121 | starmie | Compared | [Comparison](model-review/sheet-11.png) |
| 122 | mr-mime | Compared | [Comparison](model-review/sheet-11.png) |
| 123 | scyther | Compared | [Comparison](model-review/sheet-11.png) |
| 124 | jynx | Compared | [Comparison](model-review/sheet-11.png) |
| 125 | electabuzz | Compared | [Comparison](model-review/sheet-11.png) |
| 126 | magmar | Compared | [Comparison](model-review/sheet-11.png) |
| 127 | pinsir | Compared | [Comparison](model-review/sheet-11.png) |
| 128 | tauros | Compared | [Comparison](model-review/sheet-11.png) |
| 129 | magikarp | Compared | [Comparison](model-review/sheet-11.png) |
| 130 | gyarados | Compared | [Comparison](model-review/sheet-11.png) |
| 131 | lapras | Compared | [Comparison](model-review/sheet-11.png) |
| 132 | ditto | Compared | [Comparison](model-review/sheet-11.png) |
| 133 | eevee | Compared | [Comparison](model-review/sheet-12.png) |
| 134 | vaporeon | Compared | [Comparison](model-review/sheet-12.png) |
| 135 | jolteon | Compared | [Comparison](model-review/sheet-12.png) |
| 136 | flareon | Compared | [Comparison](model-review/sheet-12.png) |
| 137 | porygon | Compared | [Comparison](model-review/sheet-12.png) |
| 138 | omanyte | Compared | [Comparison](model-review/sheet-12.png) |
| 139 | omastar | Compared | [Comparison](model-review/sheet-12.png) |
| 140 | kabuto | Compared | [Comparison](model-review/sheet-12.png) |
| 141 | kabutops | Compared | [Comparison](model-review/sheet-12.png) |
| 142 | aerodactyl | Compared | [Comparison](model-review/sheet-12.png) |
| 143 | snorlax | Compared | [Comparison](model-review/sheet-12.png) |
| 144 | articuno | Compared | [Comparison](model-review/sheet-12.png) |
| 145 | zapdos | Compared | [Comparison](model-review/sheet-13.png) |
| 146 | moltres | Compared | [Comparison](model-review/sheet-13.png) |
| 147 | dratini | Compared | [Comparison](model-review/sheet-13.png) |
| 148 | dragonair | Compared | [Comparison](model-review/sheet-13.png) |
| 149 | dragonite | Compared | [Comparison](model-review/sheet-13.png) |
| 150 | mewtwo | Compared | [Comparison](model-review/sheet-13.png) |
| 151 | mew | Compared | [Comparison](model-review/sheet-13.png) |

### Follow-up: browser loads stuck pending

The reported battle screenshot still showed loading labels after the decoder conversion. Browser texture decoding was mocked in the earlier component test, so that test did not establish browser compatibility. The loader now uses standard image elements through Three.js TextureLoader, bypasses the ImageBitmap path, and uses explicit asynchronous state instead of Suspense. Downloads and parsing have a combined 20-second deadline; failures show their reason and a Retry button, and failed cache entries are removed. Tests cover the reported battle species with a deliberately stalled bitmap decoder, as well as a stalled download followed by a successful retry. Actual browser rendering remains to be confirmed on the affected device.

### Confirmed arena root cause: species name casing

`makeUnit` converts species IDs into display names (for example `lapras` → `Lapras`). `PokemonModel` was looking these up in a lowercase catalog and returning its loading placeholder before starting any request. This also explains why the loader timeout never appeared. The model lookup now trims and lowercases the input; unknown species show an explicit unavailable message. A regression test passes actual `createInitialBattleState` unit values into the scene: it failed with zero Lapras meshes before the correction and passes afterward for every unit. Earlier decoder changes were compatibility measures, not the confirmed cause of this battle failure.

### Real-world proportions and exploration trainer

All 151 measurements in `src/game/pokemonHeights.json` were obtained from [PokéAPI's Pokémon table](https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon.csv) on 2026-09-07, converting decimetres to metres. Arena and exploration models use one scene unit per metre. Pokédex close-up previews intentionally fit the viewing window. Standard model bounding-box height is calibrated to the Pokédex height; animation and neutral-pose differences mean these are visual approximations rather than anatomical measurements. For Ekans, Arbok, Onix, Gyarados, Dratini and Dragonair, the longest connected skeletal path approximates body length instead of stretching the curled model to the listed height. Arena formations and camera have more room, and name labels follow species height. Squirtle no longer receives an extra companion shrink factor.

The exploration player and NPCs now use an original stylized trainer, approximately 1.7 metres tall, with cap, face, backpack, clothing, hands and shoes. Player arms and legs swing with movement and settle when idle. The exported scene was rendered offline for visual inspection: [trainer preview](model-review/trainer.png).
