# Pokémon locomotion review

The motion itself is now tuned to measured references and checked for every species: see [animation references](animation-references.md) for the targets, their sources and what changed.

Reviewed all 151 species individually in runtime pose sheets. Each row below links to its samples. The movement table in `src/game/pokemonLocomotion.ts` records an explicit choice for every species; the game's walk/run inputs select normal/fast travel in that mode.

## Corrections

- Flying birds, bats, insects and dragons flap their mapped wings and hold their legs steady during travel. Doduo and Dodrio keep their ground strides. Charizard, Beedrill, Scyther and Dragonite keep their ordinary arms separate from their wings.
- Zubat uses its authored flight for idle and both travel speeds. Dragonite's descriptive wing and limb names are now recognized. Authored ground walking cannot override the flight selection.
- Hovering species float without flapping their arms. Aquatic species paddle fins or tentacles and wave their tails. Amphibious bipeds such as Psyduck still walk; fish, seals and Lapras use a swimming presentation regardless of terrain.
- Snakes undulate without footfall bounce. Crawlers stagger their limbs; Caterpie and Weedle now rest horizontally, with their heads facing forward. Their source hips and spine are separate roots, so the stance correction rotates their common scene.
- Voltorb and Electrode roll around their centres. Sludge slides with a small squash; burrowers travel without vertical footstep bounce. Cocoons, bell plants and Exeggcute use small hops.
- Quadrupeds retain their diagonal walk and species-specific gallop. Other grounded bipeds keep their walk/run clips.
- Embedded origin translation is held at its starting position during travel. Mewtwo's source run moved seven model units each cycle, sending it out of the preview before snapping back; gameplay now owns that displacement.
- Long spines and necks share attack/recoil rotation across their joints, reducing excessive bending on serpentine models.

## Verification

- 1,510 shaded poses: idle, normal travel, fast travel, attack and hit, each sampled at 0.12 s and 0.36 s. Ten columns per sheet, eight species per sheet, in Pokédex order. Yellow lines show the skeleton.
- The renderer samples the actual runtime animator and deformed vertices, after the same rest pose, rig setup, height scaling and floor alignment used by the app.
- Automated checks cover all 151 actual rigs through travel transitions, finite transforms and cached-source preservation. Regression checks cover mirrored flapping with still legs, hover arms, ground contact for sliding species, Zubat clip selection, Dragonite wing recognition, Mewtwo's in-place travel, crawler stance and procedural loop seams.
- `npm test`: 397 tests pass. `npm run build` and `npm run lint` pass.

These are procedural approximations fitted to the bundled assets. Generated rigs still have simpler deformation than artist-weighted skeletons, and some rigid biped assets have only torso/arm joints. This review checks sampled silhouettes and movement selection; it does not certify every frame or every move-specific attack, and does not include a live browser review. The shaded renderer omits textures, materials, lighting and transparency masks, so flame planes appear solid: these sheets check poses and joints, not how skins look. For skins, see [pokemon-skin-rendering.md](pokemon-skin-rendering.md), whose sheets go through the game's real renderer.

## Reproduce

```sh
node scripts/audit-pokemon-motion.mjs
npm test
npm run build
npm run lint
```

The [machine-readable inventory](model-review/locomotion/audit.json) records movement modes, source/runtime joint counts and selected clips.

## Per-species review

| Dex | Pokémon | Travel | Reviewed samples |
| --- | --- | --- | --- |
| 001 | bulbasaur | Walk / gallop | [Sheet 01, row 1](model-review/locomotion/sheet-01.png) |
| 002 | ivysaur | Walk / gallop | [Sheet 01, row 2](model-review/locomotion/sheet-01.png) |
| 003 | venusaur | Walk / gallop | [Sheet 01, row 3](model-review/locomotion/sheet-01.png) |
| 004 | charmander | Walk / run | [Sheet 01, row 4](model-review/locomotion/sheet-01.png) |
| 005 | charmeleon | Walk / run | [Sheet 01, row 5](model-review/locomotion/sheet-01.png) |
| 006 | charizard | Flight | [Sheet 01, row 6](model-review/locomotion/sheet-01.png) |
| 007 | squirtle | Walk / run | [Sheet 01, row 7](model-review/locomotion/sheet-01.png) |
| 008 | wartortle | Walk / run | [Sheet 01, row 8](model-review/locomotion/sheet-01.png) |
| 009 | blastoise | Walk / run | [Sheet 02, row 1](model-review/locomotion/sheet-02.png) |
| 010 | caterpie | Crawl | [Sheet 02, row 2](model-review/locomotion/sheet-02.png) |
| 011 | metapod | Small hops | [Sheet 02, row 3](model-review/locomotion/sheet-02.png) |
| 012 | butterfree | Flight | [Sheet 02, row 4](model-review/locomotion/sheet-02.png) |
| 013 | weedle | Crawl | [Sheet 02, row 5](model-review/locomotion/sheet-02.png) |
| 014 | kakuna | Small hops | [Sheet 02, row 6](model-review/locomotion/sheet-02.png) |
| 015 | beedrill | Flight | [Sheet 02, row 7](model-review/locomotion/sheet-02.png) |
| 016 | pidgey | Flight | [Sheet 02, row 8](model-review/locomotion/sheet-02.png) |
| 017 | pidgeotto | Flight | [Sheet 03, row 1](model-review/locomotion/sheet-03.png) |
| 018 | pidgeot | Flight | [Sheet 03, row 2](model-review/locomotion/sheet-03.png) |
| 019 | rattata | Walk / gallop | [Sheet 03, row 3](model-review/locomotion/sheet-03.png) |
| 020 | raticate | Walk / gallop | [Sheet 03, row 4](model-review/locomotion/sheet-03.png) |
| 021 | spearow | Flight | [Sheet 03, row 5](model-review/locomotion/sheet-03.png) |
| 022 | fearow | Flight | [Sheet 03, row 6](model-review/locomotion/sheet-03.png) |
| 023 | ekans | Slither | [Sheet 03, row 7](model-review/locomotion/sheet-03.png) |
| 024 | arbok | Slither | [Sheet 03, row 8](model-review/locomotion/sheet-03.png) |
| 025 | pikachu | Walk / run | [Sheet 04, row 1](model-review/locomotion/sheet-04.png) |
| 026 | raichu | Walk / run | [Sheet 04, row 2](model-review/locomotion/sheet-04.png) |
| 027 | sandshrew | Walk / run | [Sheet 04, row 3](model-review/locomotion/sheet-04.png) |
| 028 | sandslash | Walk / run | [Sheet 04, row 4](model-review/locomotion/sheet-04.png) |
| 029 | nidoran-f | Walk / gallop | [Sheet 04, row 5](model-review/locomotion/sheet-04.png) |
| 030 | nidorina | Walk / gallop | [Sheet 04, row 6](model-review/locomotion/sheet-04.png) |
| 031 | nidoqueen | Walk / run | [Sheet 04, row 7](model-review/locomotion/sheet-04.png) |
| 032 | nidoran-m | Walk / gallop | [Sheet 04, row 8](model-review/locomotion/sheet-04.png) |
| 033 | nidorino | Walk / gallop | [Sheet 05, row 1](model-review/locomotion/sheet-05.png) |
| 034 | nidoking | Walk / run | [Sheet 05, row 2](model-review/locomotion/sheet-05.png) |
| 035 | clefairy | Walk / run | [Sheet 05, row 3](model-review/locomotion/sheet-05.png) |
| 036 | clefable | Walk / run | [Sheet 05, row 4](model-review/locomotion/sheet-05.png) |
| 037 | vulpix | Walk / gallop | [Sheet 05, row 5](model-review/locomotion/sheet-05.png) |
| 038 | ninetales | Walk / gallop | [Sheet 05, row 6](model-review/locomotion/sheet-05.png) |
| 039 | jigglypuff | Walk / run | [Sheet 05, row 7](model-review/locomotion/sheet-05.png) |
| 040 | wigglytuff | Walk / run | [Sheet 05, row 8](model-review/locomotion/sheet-05.png) |
| 041 | zubat | Flight | [Sheet 06, row 1](model-review/locomotion/sheet-06.png) |
| 042 | golbat | Flight | [Sheet 06, row 2](model-review/locomotion/sheet-06.png) |
| 043 | oddish | Walk / run | [Sheet 06, row 3](model-review/locomotion/sheet-06.png) |
| 044 | gloom | Walk / run | [Sheet 06, row 4](model-review/locomotion/sheet-06.png) |
| 045 | vileplume | Walk / run | [Sheet 06, row 5](model-review/locomotion/sheet-06.png) |
| 046 | paras | Crawl | [Sheet 06, row 6](model-review/locomotion/sheet-06.png) |
| 047 | parasect | Crawl | [Sheet 06, row 7](model-review/locomotion/sheet-06.png) |
| 048 | venonat | Walk / run | [Sheet 06, row 8](model-review/locomotion/sheet-06.png) |
| 049 | venomoth | Flight | [Sheet 07, row 1](model-review/locomotion/sheet-07.png) |
| 050 | diglett | Burrow | [Sheet 07, row 2](model-review/locomotion/sheet-07.png) |
| 051 | dugtrio | Burrow | [Sheet 07, row 3](model-review/locomotion/sheet-07.png) |
| 052 | meowth | Walk / run | [Sheet 07, row 4](model-review/locomotion/sheet-07.png) |
| 053 | persian | Walk / gallop | [Sheet 07, row 5](model-review/locomotion/sheet-07.png) |
| 054 | psyduck | Walk / run | [Sheet 07, row 6](model-review/locomotion/sheet-07.png) |
| 055 | golduck | Walk / run | [Sheet 07, row 7](model-review/locomotion/sheet-07.png) |
| 056 | mankey | Walk / run | [Sheet 07, row 8](model-review/locomotion/sheet-07.png) |
| 057 | primeape | Walk / run | [Sheet 08, row 1](model-review/locomotion/sheet-08.png) |
| 058 | growlithe | Walk / gallop | [Sheet 08, row 2](model-review/locomotion/sheet-08.png) |
| 059 | arcanine | Walk / gallop | [Sheet 08, row 3](model-review/locomotion/sheet-08.png) |
| 060 | poliwag | Walk / run | [Sheet 08, row 4](model-review/locomotion/sheet-08.png) |
| 061 | poliwhirl | Walk / run | [Sheet 08, row 5](model-review/locomotion/sheet-08.png) |
| 062 | poliwrath | Walk / run | [Sheet 08, row 6](model-review/locomotion/sheet-08.png) |
| 063 | abra | Hover | [Sheet 08, row 7](model-review/locomotion/sheet-08.png) |
| 064 | kadabra | Walk / run | [Sheet 08, row 8](model-review/locomotion/sheet-08.png) |
| 065 | alakazam | Walk / run | [Sheet 09, row 1](model-review/locomotion/sheet-09.png) |
| 066 | machop | Walk / run | [Sheet 09, row 2](model-review/locomotion/sheet-09.png) |
| 067 | machoke | Walk / run | [Sheet 09, row 3](model-review/locomotion/sheet-09.png) |
| 068 | machamp | Walk / run | [Sheet 09, row 4](model-review/locomotion/sheet-09.png) |
| 069 | bellsprout | Walk / run | [Sheet 09, row 5](model-review/locomotion/sheet-09.png) |
| 070 | weepinbell | Small hops | [Sheet 09, row 6](model-review/locomotion/sheet-09.png) |
| 071 | victreebel | Small hops | [Sheet 09, row 7](model-review/locomotion/sheet-09.png) |
| 072 | tentacool | Swim | [Sheet 09, row 8](model-review/locomotion/sheet-09.png) |
| 073 | tentacruel | Swim | [Sheet 10, row 1](model-review/locomotion/sheet-10.png) |
| 074 | geodude | Hover | [Sheet 10, row 2](model-review/locomotion/sheet-10.png) |
| 075 | graveler | Walk / run | [Sheet 10, row 3](model-review/locomotion/sheet-10.png) |
| 076 | golem | Walk / run | [Sheet 10, row 4](model-review/locomotion/sheet-10.png) |
| 077 | ponyta | Walk / gallop | [Sheet 10, row 5](model-review/locomotion/sheet-10.png) |
| 078 | rapidash | Walk / gallop | [Sheet 10, row 6](model-review/locomotion/sheet-10.png) |
| 079 | slowpoke | Walk / gallop | [Sheet 10, row 7](model-review/locomotion/sheet-10.png) |
| 080 | slowbro | Walk / run | [Sheet 10, row 8](model-review/locomotion/sheet-10.png) |
| 081 | magnemite | Hover | [Sheet 11, row 1](model-review/locomotion/sheet-11.png) |
| 082 | magneton | Hover | [Sheet 11, row 2](model-review/locomotion/sheet-11.png) |
| 083 | farfetchd | Flight | [Sheet 11, row 3](model-review/locomotion/sheet-11.png) |
| 084 | doduo | Walk / run | [Sheet 11, row 4](model-review/locomotion/sheet-11.png) |
| 085 | dodrio | Walk / run | [Sheet 11, row 5](model-review/locomotion/sheet-11.png) |
| 086 | seel | Swim | [Sheet 11, row 6](model-review/locomotion/sheet-11.png) |
| 087 | dewgong | Swim | [Sheet 11, row 7](model-review/locomotion/sheet-11.png) |
| 088 | grimer | Slide / squash | [Sheet 11, row 8](model-review/locomotion/sheet-11.png) |
| 089 | muk | Slide / squash | [Sheet 12, row 1](model-review/locomotion/sheet-12.png) |
| 090 | shellder | Swim | [Sheet 12, row 2](model-review/locomotion/sheet-12.png) |
| 091 | cloyster | Swim | [Sheet 12, row 3](model-review/locomotion/sheet-12.png) |
| 092 | gastly | Hover | [Sheet 12, row 4](model-review/locomotion/sheet-12.png) |
| 093 | haunter | Hover | [Sheet 12, row 5](model-review/locomotion/sheet-12.png) |
| 094 | gengar | Walk / run | [Sheet 12, row 6](model-review/locomotion/sheet-12.png) |
| 095 | onix | Slither | [Sheet 12, row 7](model-review/locomotion/sheet-12.png) |
| 096 | drowzee | Walk / run | [Sheet 12, row 8](model-review/locomotion/sheet-12.png) |
| 097 | hypno | Walk / run | [Sheet 13, row 1](model-review/locomotion/sheet-13.png) |
| 098 | krabby | Crawl | [Sheet 13, row 2](model-review/locomotion/sheet-13.png) |
| 099 | kingler | Crawl | [Sheet 13, row 3](model-review/locomotion/sheet-13.png) |
| 100 | voltorb | Roll | [Sheet 13, row 4](model-review/locomotion/sheet-13.png) |
| 101 | electrode | Roll | [Sheet 13, row 5](model-review/locomotion/sheet-13.png) |
| 102 | exeggcute | Small hops | [Sheet 13, row 6](model-review/locomotion/sheet-13.png) |
| 103 | exeggutor | Walk / run | [Sheet 13, row 7](model-review/locomotion/sheet-13.png) |
| 104 | cubone | Walk / run | [Sheet 13, row 8](model-review/locomotion/sheet-13.png) |
| 105 | marowak | Walk / run | [Sheet 14, row 1](model-review/locomotion/sheet-14.png) |
| 106 | hitmonlee | Walk / run | [Sheet 14, row 2](model-review/locomotion/sheet-14.png) |
| 107 | hitmonchan | Walk / run | [Sheet 14, row 3](model-review/locomotion/sheet-14.png) |
| 108 | lickitung | Walk / run | [Sheet 14, row 4](model-review/locomotion/sheet-14.png) |
| 109 | koffing | Hover | [Sheet 14, row 5](model-review/locomotion/sheet-14.png) |
| 110 | weezing | Hover | [Sheet 14, row 6](model-review/locomotion/sheet-14.png) |
| 111 | rhyhorn | Walk / gallop | [Sheet 14, row 7](model-review/locomotion/sheet-14.png) |
| 112 | rhydon | Walk / run | [Sheet 14, row 8](model-review/locomotion/sheet-14.png) |
| 113 | chansey | Walk / run | [Sheet 15, row 1](model-review/locomotion/sheet-15.png) |
| 114 | tangela | Walk / run | [Sheet 15, row 2](model-review/locomotion/sheet-15.png) |
| 115 | kangaskhan | Walk / run | [Sheet 15, row 3](model-review/locomotion/sheet-15.png) |
| 116 | horsea | Swim | [Sheet 15, row 4](model-review/locomotion/sheet-15.png) |
| 117 | seadra | Swim | [Sheet 15, row 5](model-review/locomotion/sheet-15.png) |
| 118 | goldeen | Swim | [Sheet 15, row 6](model-review/locomotion/sheet-15.png) |
| 119 | seaking | Swim | [Sheet 15, row 7](model-review/locomotion/sheet-15.png) |
| 120 | staryu | Swim | [Sheet 15, row 8](model-review/locomotion/sheet-15.png) |
| 121 | starmie | Swim | [Sheet 16, row 1](model-review/locomotion/sheet-16.png) |
| 122 | mr-mime | Walk / run | [Sheet 16, row 2](model-review/locomotion/sheet-16.png) |
| 123 | scyther | Flight | [Sheet 16, row 3](model-review/locomotion/sheet-16.png) |
| 124 | jynx | Walk / run | [Sheet 16, row 4](model-review/locomotion/sheet-16.png) |
| 125 | electabuzz | Walk / run | [Sheet 16, row 5](model-review/locomotion/sheet-16.png) |
| 126 | magmar | Walk / run | [Sheet 16, row 6](model-review/locomotion/sheet-16.png) |
| 127 | pinsir | Walk / run | [Sheet 16, row 7](model-review/locomotion/sheet-16.png) |
| 128 | tauros | Walk / gallop | [Sheet 16, row 8](model-review/locomotion/sheet-16.png) |
| 129 | magikarp | Swim | [Sheet 17, row 1](model-review/locomotion/sheet-17.png) |
| 130 | gyarados | Swim | [Sheet 17, row 2](model-review/locomotion/sheet-17.png) |
| 131 | lapras | Swim | [Sheet 17, row 3](model-review/locomotion/sheet-17.png) |
| 132 | ditto | Slide / squash | [Sheet 17, row 4](model-review/locomotion/sheet-17.png) |
| 133 | eevee | Walk / gallop | [Sheet 17, row 5](model-review/locomotion/sheet-17.png) |
| 134 | vaporeon | Walk / gallop | [Sheet 17, row 6](model-review/locomotion/sheet-17.png) |
| 135 | jolteon | Walk / gallop | [Sheet 17, row 7](model-review/locomotion/sheet-17.png) |
| 136 | flareon | Walk / gallop | [Sheet 17, row 8](model-review/locomotion/sheet-17.png) |
| 137 | porygon | Hover | [Sheet 18, row 1](model-review/locomotion/sheet-18.png) |
| 138 | omanyte | Crawl | [Sheet 18, row 2](model-review/locomotion/sheet-18.png) |
| 139 | omastar | Crawl | [Sheet 18, row 3](model-review/locomotion/sheet-18.png) |
| 140 | kabuto | Crawl | [Sheet 18, row 4](model-review/locomotion/sheet-18.png) |
| 141 | kabutops | Walk / run | [Sheet 18, row 5](model-review/locomotion/sheet-18.png) |
| 142 | aerodactyl | Flight | [Sheet 18, row 6](model-review/locomotion/sheet-18.png) |
| 143 | snorlax | Walk / run | [Sheet 18, row 7](model-review/locomotion/sheet-18.png) |
| 144 | articuno | Flight | [Sheet 18, row 8](model-review/locomotion/sheet-18.png) |
| 145 | zapdos | Flight | [Sheet 19, row 1](model-review/locomotion/sheet-19.png) |
| 146 | moltres | Flight | [Sheet 19, row 2](model-review/locomotion/sheet-19.png) |
| 147 | dratini | Slither | [Sheet 19, row 3](model-review/locomotion/sheet-19.png) |
| 148 | dragonair | Slither | [Sheet 19, row 4](model-review/locomotion/sheet-19.png) |
| 149 | dragonite | Flight | [Sheet 19, row 5](model-review/locomotion/sheet-19.png) |
| 150 | mewtwo | Walk / run | [Sheet 19, row 6](model-review/locomotion/sheet-19.png) |
| 151 | mew | Hover | [Sheet 19, row 7](model-review/locomotion/sheet-19.png) |
