# Animation and joint audit

See the newer [per-species locomotion review](pokemon-locomotion-review.md) for flight, swimming, crawling and other travel corrections, including run samples. The report below records the earlier joint audit.

## Changes

- Trainer: six added pivot joints (left/right elbows, knees and ankles). Knees flex during the swing phase and bend while riding; elbows bend toward the riding grip.
- Existing Pokémon rigs: animate previously unused knees, elbows, ankles, spines, necks, ears and attack jaws. Convert motion axes into each imported skeleton’s coordinates. Use a species list for quadrupeds and floating Pokémon, so Meowth is treated as a biped and Gengar/Venonat remain grounded.
- Ten rigid assets receive cloned, weighted torso and neck skeletons: Clefairy, Drowzee, Hypno, Hitmonlee, Lickitung, Chansey, Jynx, Electabuzz, Magmar and Snorlax. Drowzee, Hypno, Hitmonlee, Jynx, Electabuzz and Magmar also receive shoulder/elbow joints to lower their T-pose arms.
- Rigid quadrupeds Ponyta, Rhyhorn and Tauros receive generated four-leg rigs: hip→knee chains for each leg, chest→neck→head, and a two-joint tail. Leg columns and the belly line come from the geometry (median hoof positions in the lowest 5% of the model, so Rhyhorn's low jaw is excluded). Joint names match the existing quadruped trot, so the legs move in a diagonal gait and the knees fold on the swing.
- Kabutops and Snorlax also receive shoulder/elbow joints. Kabutops' scythes pivot at the shoulder; Snorlax's outstretched arms are lowered to its sides. Per-species settings set where the arm starts across the width and how tall it is.
- The remaining 19 unskinned assets get part rigs. Each mesh is split into connected pieces, and every significant piece (fin, claw segment, leg, magnet, egg, floating hand, gas puff, vine) gets its own joint, chained through touching pieces back to the body, so multi-segment crab legs stay attached. Attached pieces pivot where they meet their parent: tails and rear fins wag sideways, side pieces flap, and hanging pieces paddle. Floating pieces orbit the body; grounded ones (Exeggcute's eggs) rock on their base. Small enclosed pieces (eyes, pupils) ride on their host. The body also bends by height (lower body, torso, head). Seaking uses a two-joint swimming tail instead, and Lapras, a single piece, uses neck, head and four flipper zones. Each generated joint stores its swing axis, so the animator needs no per-species name rules.
- Ekans, Arbok, Dratini and Dragonair receive curved tail rest poses before display bounds are measured.
- Procedural clips are rebuilt from shared choreography curves, so every rig (source, generated torso, quadruped and part rigs) moves through the same phases:
  - **Idle**: breathing and a gentle sway; wings, tails and generated parts drift at 0.8× their swing.
  - **Walk** (0.7 s stride): diagonal leg gait with knees folding on the swing, arms counter-swinging, a double bob in the body, spine and head per stride, and appendages at 1.5× swing.
  - **Attack** (0.75 s): 0.28 s wind-up (lean back, crouch, arms cock, tails and wings draw back), a 0.12 s strike (body lunges forward, scaled to display height; right arm leads the punch; forelegs reach; jaw opens; tails and parts whip; head lands a beat later), then recovery.
  - **Hit** (0.6 s): an immediate flinch (knocked back and up, knees buckle, arms thrown forward) and a damped wobble in the spine, head, ears and appendages.
  - All curves return to zero, so clamped one-shots end on the rest pose.
- Mounts gallop instead of playing the walk trot faster (previously 1.5× for Arcanine and 1.75× for Rapidash). The new `run` motion is a real gallop for quadruped rigs: shoulders reach with the forelegs, knees fold through the swing, the body pitches and lifts in the airborne phases, and the neck pumps while the head counters to stay level. Arcanine (and other canines/felines) uses a rotary gallop: left hind, right hind, right fore, left fore, with two airborne phases and a strongly flexing spine. Rapidash (and other horse-like rigs) uses a transverse gallop: left hind, right hind, left fore, right fore, with one gathered airborne phase, a stiff back and a stronger neck pump. Reference: horse and dog gait descriptions (Wikipedia *Horse gait*; rotary vs transverse gallop, Biancardi & Minetti 2012). The source GLBs, including upstream Pokemon-3D-api, carry no authored run clips. The rider is now carried in the mount's animated root, so the trainer rises, pitches and lands with the stride and leans into the gallop. Bipeds' `run` is a quicker walk. The Pokédex preview has a Run button.
- Every move has its own animation. The Red/Blue learnsets for all 151 species (1,090 entries, 145 moves) and the battle roster's own moves (192 in total) each have a recorded movement: an archetype stored as keyframed body poses, plus hits, speed and strength. Each Pokémon plays these as clips on its own rig, in the Pokédex (tap any move) and in battle (the move just used). See [pokemon-move-animations.md](pokemon-move-animations.md).
- All generated clips are built around the species' own standing pose: the first frame of an authored idle, or, for Pikachu, whose bind pose lies face-down, of its authored attack. Relaxed arms now swing around their lowered pose, so a raise lifts the arm instead of twisting it.
- Attack and hit play once per activation. A started one-shot now plays to the end even though the battle flags (`actionPulse` ≈ 0.38 s, `hitFlash` ≈ 0.29 s) drop sooner; only a hit may interrupt an attack. Authored clips (Bulbasaur, Pikachu's attack, Wigglytuff's run, Dragonite, Mewtwo) retain priority.
- Remove the extra floating wrapper from battle models. Species animation now controls hovering; fainting still uses the battle fall pose.
- Pokédex: select idle/walk/attack/hit, click again to replay, pause, and show the current skeleton over the model.

## Visual review

Reviewed all 151 species in offline shaded contact sheets: two sampled times (0.12 s and 0.36 s) for each of idle, walk, attack and hit (for attack these fall in the wind-up and the strike), totaling 1,208 poses. Each row is one species, in Pokédex order. Columns are idle ×2, walk ×2, attack ×2, hit ×2. Yellow lines show joints.

The renderer samples the actual runtime animator and skinned vertex positions. It deliberately uses uniform shading without textures, transparency masks or morph targets, so these images check joint movement and silhouette, not final game appearance. Transparent flame planes therefore appear opaque. Camera framing uses the rest bounds and some authored attacks extend beyond their cell. These samples do not verify every point in a cycle, performance on a device, or live browser behavior.

After the first review, added arm joints for six remaining rigid T-poses and curved the four straight serpent tails, then regenerated the sheets and rechecked the affected rows.

## Remaining asset limits

The source catalog has 34 models without skeletons; all 151 now have a runtime skeleton. Of the 34, Golbat has a wing rig, 11 have torso/arm rigs, Ponyta, Rhyhorn and Tauros have four-leg rigs, and the other 19 have part rigs. These generated rigs are rigid per piece or blended by zone. They are not artist-authored weights: joints bend but do not deform the surface as a hand-skinned model would. Rigging runs once per model instance at load and costs up to about 100 ms on the densest asset (Weezing).

## Reproduce

```sh
node scripts/audit-pokemon-motion.mjs
npm test
npm run build
npm run lint
```

The export includes a machine-readable [rig and clip inventory](model-review/motion/audit.json). Automated tests exercise all 151 actual models, transitions and cached-source preservation; added checks cover new skin weights, unchanged bind geometry, trainer joints, one-shot attacks, the preview overlay and pause behavior. Riding and companion lifecycle regression tests remain in the suite.

## Species index

| Dex | Species | Source joints | Runtime joints | Pose sheet (row) |
| --- | --- | ---: | ---: | --- |
| 001 | bulbasaur | 56 | 56 | [Sheet 01](model-review/motion/sheet-01.png), row 1 |
| 002 | ivysaur | 39 | 39 | [Sheet 01](model-review/motion/sheet-01.png), row 2 |
| 003 | venusaur | 55 | 55 | [Sheet 01](model-review/motion/sheet-01.png), row 3 |
| 004 | charmander | 45 | 45 | [Sheet 01](model-review/motion/sheet-01.png), row 4 |
| 005 | charmeleon | 30 | 30 | [Sheet 01](model-review/motion/sheet-01.png), row 5 |
| 006 | charizard | 72 | 72 | [Sheet 01](model-review/motion/sheet-01.png), row 6 |
| 007 | squirtle | 26 | 26 | [Sheet 01](model-review/motion/sheet-01.png), row 7 |
| 008 | wartortle | 31 | 31 | [Sheet 01](model-review/motion/sheet-01.png), row 8 |
| 009 | blastoise | 42 | 42 | [Sheet 02](model-review/motion/sheet-02.png), row 1 |
| 010 | caterpie | 14 | 14 | [Sheet 02](model-review/motion/sheet-02.png), row 2 |
| 011 | metapod | 6 | 6 | [Sheet 02](model-review/motion/sheet-02.png), row 3 |
| 012 | butterfree | 37 | 37 | [Sheet 02](model-review/motion/sheet-02.png), row 4 |
| 013 | weedle | 25 | 25 | [Sheet 02](model-review/motion/sheet-02.png), row 5 |
| 014 | kakuna | 2 | 2 | [Sheet 02](model-review/motion/sheet-02.png), row 6 |
| 015 | beedrill | 49 | 49 | [Sheet 02](model-review/motion/sheet-02.png), row 7 |
| 016 | pidgey | 40 | 40 | [Sheet 02](model-review/motion/sheet-02.png), row 8 |
| 017 | pidgeotto | 41 | 41 | [Sheet 03](model-review/motion/sheet-03.png), row 1 |
| 018 | pidgeot | 70 | 70 | [Sheet 03](model-review/motion/sheet-03.png), row 2 |
| 019 | rattata | 40 | 40 | [Sheet 03](model-review/motion/sheet-03.png), row 3 |
| 020 | raticate | 50 | 50 | [Sheet 03](model-review/motion/sheet-03.png), row 4 |
| 021 | spearow | 39 | 39 | [Sheet 03](model-review/motion/sheet-03.png), row 5 |
| 022 | fearow | 66 | 66 | [Sheet 03](model-review/motion/sheet-03.png), row 6 |
| 023 | ekans | 25 | 25 | [Sheet 03](model-review/motion/sheet-03.png), row 7 |
| 024 | arbok | 26 | 26 | [Sheet 03](model-review/motion/sheet-03.png), row 8 |
| 025 | pikachu | 45 | 45 | [Sheet 04](model-review/motion/sheet-04.png), row 1 |
| 026 | raichu | 33 | 33 | [Sheet 04](model-review/motion/sheet-04.png), row 2 |
| 027 | sandshrew | 32 | 32 | [Sheet 04](model-review/motion/sheet-04.png), row 3 |
| 028 | sandslash | 57 | 57 | [Sheet 04](model-review/motion/sheet-04.png), row 4 |
| 029 | nidoran-f | 32 | 32 | [Sheet 04](model-review/motion/sheet-04.png), row 5 |
| 030 | nidorina | 34 | 34 | [Sheet 04](model-review/motion/sheet-04.png), row 6 |
| 031 | nidoqueen | 37 | 37 | [Sheet 04](model-review/motion/sheet-04.png), row 7 |
| 032 | nidoran-m | 30 | 30 | [Sheet 04](model-review/motion/sheet-04.png), row 8 |
| 033 | nidorino | 29 | 29 | [Sheet 05](model-review/motion/sheet-05.png), row 1 |
| 034 | nidoking | 39 | 39 | [Sheet 05](model-review/motion/sheet-05.png), row 2 |
| 035 | clefairy | 0 | 9 | [Sheet 05](model-review/motion/sheet-05.png), row 3 |
| 036 | clefable | 42 | 42 | [Sheet 05](model-review/motion/sheet-05.png), row 4 |
| 037 | vulpix | 53 | 53 | [Sheet 05](model-review/motion/sheet-05.png), row 5 |
| 038 | ninetales | 110 | 110 | [Sheet 05](model-review/motion/sheet-05.png), row 6 |
| 039 | jigglypuff | 13 | 13 | [Sheet 05](model-review/motion/sheet-05.png), row 7 |
| 040 | wigglytuff | 25 | 25 | [Sheet 05](model-review/motion/sheet-05.png), row 8 |
| 041 | zubat | 22 | 22 | [Sheet 06](model-review/motion/sheet-06.png), row 1 |
| 042 | golbat | 0 | 5 | [Sheet 06](model-review/motion/sheet-06.png), row 2 |
| 043 | oddish | 23 | 23 | [Sheet 06](model-review/motion/sheet-06.png), row 3 |
| 044 | gloom | 38 | 38 | [Sheet 06](model-review/motion/sheet-06.png), row 4 |
| 045 | vileplume | 25 | 25 | [Sheet 06](model-review/motion/sheet-06.png), row 5 |
| 046 | paras | 26 | 26 | [Sheet 06](model-review/motion/sheet-06.png), row 6 |
| 047 | parasect | 27 | 27 | [Sheet 06](model-review/motion/sheet-06.png), row 7 |
| 048 | venonat | 47 | 47 | [Sheet 06](model-review/motion/sheet-06.png), row 8 |
| 049 | venomoth | 31 | 31 | [Sheet 07](model-review/motion/sheet-07.png), row 1 |
| 050 | diglett | 6 | 6 | [Sheet 07](model-review/motion/sheet-07.png), row 2 |
| 051 | dugtrio | 17 | 17 | [Sheet 07](model-review/motion/sheet-07.png), row 3 |
| 052 | meowth | 57 | 57 | [Sheet 07](model-review/motion/sheet-07.png), row 4 |
| 053 | persian | 46 | 46 | [Sheet 07](model-review/motion/sheet-07.png), row 5 |
| 054 | psyduck | 33 | 33 | [Sheet 07](model-review/motion/sheet-07.png), row 6 |
| 055 | golduck | 49 | 49 | [Sheet 07](model-review/motion/sheet-07.png), row 7 |
| 056 | mankey | 36 | 36 | [Sheet 07](model-review/motion/sheet-07.png), row 8 |
| 057 | primeape | 28 | 28 | [Sheet 08](model-review/motion/sheet-08.png), row 1 |
| 058 | growlithe | 42 | 42 | [Sheet 08](model-review/motion/sheet-08.png), row 2 |
| 059 | arcanine | 50 | 50 | [Sheet 08](model-review/motion/sheet-08.png), row 3 |
| 060 | poliwag | 0 | 24 | [Sheet 08](model-review/motion/sheet-08.png), row 4 |
| 061 | poliwhirl | 25 | 25 | [Sheet 08](model-review/motion/sheet-08.png), row 5 |
| 062 | poliwrath | 30 | 30 | [Sheet 08](model-review/motion/sheet-08.png), row 6 |
| 063 | abra | 50 | 50 | [Sheet 08](model-review/motion/sheet-08.png), row 7 |
| 064 | kadabra | 53 | 53 | [Sheet 08](model-review/motion/sheet-08.png), row 8 |
| 065 | alakazam | 53 | 53 | [Sheet 09](model-review/motion/sheet-09.png), row 1 |
| 066 | machop | 51 | 51 | [Sheet 09](model-review/motion/sheet-09.png), row 2 |
| 067 | machoke | 50 | 50 | [Sheet 09](model-review/motion/sheet-09.png), row 3 |
| 068 | machamp | 85 | 85 | [Sheet 09](model-review/motion/sheet-09.png), row 4 |
| 069 | bellsprout | 51 | 51 | [Sheet 09](model-review/motion/sheet-09.png), row 5 |
| 070 | weepinbell | 26 | 26 | [Sheet 09](model-review/motion/sheet-09.png), row 6 |
| 071 | victreebel | 39 | 39 | [Sheet 09](model-review/motion/sheet-09.png), row 7 |
| 072 | tentacool | 13 | 13 | [Sheet 09](model-review/motion/sheet-09.png), row 8 |
| 073 | tentacruel | 53 | 53 | [Sheet 10](model-review/motion/sheet-10.png), row 1 |
| 074 | geodude | 37 | 37 | [Sheet 10](model-review/motion/sheet-10.png), row 2 |
| 075 | graveler | 44 | 44 | [Sheet 10](model-review/motion/sheet-10.png), row 3 |
| 076 | golem | 32 | 32 | [Sheet 10](model-review/motion/sheet-10.png), row 4 |
| 077 | ponyta | 0 | 28 | [Sheet 10](model-review/motion/sheet-10.png), row 5 |
| 078 | rapidash | 84 | 84 | [Sheet 10](model-review/motion/sheet-10.png), row 6 |
| 079 | slowpoke | 31 | 31 | [Sheet 10](model-review/motion/sheet-10.png), row 7 |
| 080 | slowbro | 32 | 32 | [Sheet 10](model-review/motion/sheet-10.png), row 8 |
| 081 | magnemite | 0 | 42 | [Sheet 11](model-review/motion/sheet-11.png), row 1 |
| 082 | magneton | 0 | 189 | [Sheet 11](model-review/motion/sheet-11.png), row 2 |
| 083 | farfetchd | 67 | 67 | [Sheet 11](model-review/motion/sheet-11.png), row 3 |
| 084 | doduo | 37 | 37 | [Sheet 11](model-review/motion/sheet-11.png), row 4 |
| 085 | dodrio | 54 | 54 | [Sheet 11](model-review/motion/sheet-11.png), row 5 |
| 086 | seel | 30 | 30 | [Sheet 11](model-review/motion/sheet-11.png), row 6 |
| 087 | dewgong | 23 | 23 | [Sheet 11](model-review/motion/sheet-11.png), row 7 |
| 088 | grimer | 68 | 68 | [Sheet 11](model-review/motion/sheet-11.png), row 8 |
| 089 | muk | 57 | 57 | [Sheet 12](model-review/motion/sheet-12.png), row 1 |
| 090 | shellder | 0 | 10 | [Sheet 12](model-review/motion/sheet-12.png), row 2 |
| 091 | cloyster | 22 | 22 | [Sheet 12](model-review/motion/sheet-12.png), row 3 |
| 092 | gastly | 0 | 36 | [Sheet 12](model-review/motion/sheet-12.png), row 4 |
| 093 | haunter | 0 | 25 | [Sheet 12](model-review/motion/sheet-12.png), row 5 |
| 094 | gengar | 31 | 31 | [Sheet 12](model-review/motion/sheet-12.png), row 6 |
| 095 | onix | 18 | 18 | [Sheet 12](model-review/motion/sheet-12.png), row 7 |
| 096 | drowzee | 0 | 14 | [Sheet 12](model-review/motion/sheet-12.png), row 8 |
| 097 | hypno | 0 | 14 | [Sheet 13](model-review/motion/sheet-13.png), row 1 |
| 098 | krabby | 0 | 46 | [Sheet 13](model-review/motion/sheet-13.png), row 2 |
| 099 | kingler | 0 | 69 | [Sheet 13](model-review/motion/sheet-13.png), row 3 |
| 100 | voltorb | 14 | 14 | [Sheet 13](model-review/motion/sheet-13.png), row 4 |
| 101 | electrode | 0 | 9 | [Sheet 13](model-review/motion/sheet-13.png), row 5 |
| 102 | exeggcute | 0 | 66 | [Sheet 13](model-review/motion/sheet-13.png), row 6 |
| 103 | exeggutor | 15 | 15 | [Sheet 13](model-review/motion/sheet-13.png), row 7 |
| 104 | cubone | 31 | 31 | [Sheet 13](model-review/motion/sheet-13.png), row 8 |
| 105 | marowak | 33 | 33 | [Sheet 14](model-review/motion/sheet-14.png), row 1 |
| 106 | hitmonlee | 0 | 14 | [Sheet 14](model-review/motion/sheet-14.png), row 2 |
| 107 | hitmonchan | 27 | 27 | [Sheet 14](model-review/motion/sheet-14.png), row 3 |
| 108 | lickitung | 0 | 6 | [Sheet 14](model-review/motion/sheet-14.png), row 4 |
| 109 | koffing | 0 | 20 | [Sheet 14](model-review/motion/sheet-14.png), row 5 |
| 110 | weezing | 0 | 32 | [Sheet 14](model-review/motion/sheet-14.png), row 6 |
| 111 | rhyhorn | 0 | 42 | [Sheet 14](model-review/motion/sheet-14.png), row 7 |
| 112 | rhydon | 41 | 41 | [Sheet 14](model-review/motion/sheet-14.png), row 8 |
| 113 | chansey | 0 | 9 | [Sheet 15](model-review/motion/sheet-15.png), row 1 |
| 114 | tangela | 0 | 93 | [Sheet 15](model-review/motion/sheet-15.png), row 2 |
| 115 | kangaskhan | 70 | 70 | [Sheet 15](model-review/motion/sheet-15.png), row 3 |
| 116 | horsea | 0 | 8 | [Sheet 15](model-review/motion/sheet-15.png), row 4 |
| 117 | seadra | 0 | 6 | [Sheet 15](model-review/motion/sheet-15.png), row 5 |
| 118 | goldeen | 0 | 24 | [Sheet 15](model-review/motion/sheet-15.png), row 6 |
| 119 | seaking | 0 | 10 | [Sheet 15](model-review/motion/sheet-15.png), row 7 |
| 120 | staryu | 25 | 25 | [Sheet 15](model-review/motion/sheet-15.png), row 8 |
| 121 | starmie | 36 | 36 | [Sheet 16](model-review/motion/sheet-16.png), row 1 |
| 122 | mr-mime | 40 | 40 | [Sheet 16](model-review/motion/sheet-16.png), row 2 |
| 123 | scyther | 24 | 24 | [Sheet 16](model-review/motion/sheet-16.png), row 3 |
| 124 | jynx | 0 | 14 | [Sheet 16](model-review/motion/sheet-16.png), row 4 |
| 125 | electabuzz | 0 | 14 | [Sheet 16](model-review/motion/sheet-16.png), row 5 |
| 126 | magmar | 0 | 42 | [Sheet 16](model-review/motion/sheet-16.png), row 6 |
| 127 | pinsir | 45 | 45 | [Sheet 16](model-review/motion/sheet-16.png), row 7 |
| 128 | tauros | 0 | 28 | [Sheet 16](model-review/motion/sheet-16.png), row 8 |
| 129 | magikarp | 23 | 23 | [Sheet 17](model-review/motion/sheet-17.png), row 1 |
| 130 | gyarados | 40 | 40 | [Sheet 17](model-review/motion/sheet-17.png), row 2 |
| 131 | lapras | 0 | 7 | [Sheet 17](model-review/motion/sheet-17.png), row 3 |
| 132 | ditto | 18 | 18 | [Sheet 17](model-review/motion/sheet-17.png), row 4 |
| 133 | eevee | 69 | 69 | [Sheet 17](model-review/motion/sheet-17.png), row 5 |
| 134 | vaporeon | 69 | 69 | [Sheet 17](model-review/motion/sheet-17.png), row 6 |
| 135 | jolteon | 81 | 81 | [Sheet 17](model-review/motion/sheet-17.png), row 7 |
| 136 | flareon | 73 | 73 | [Sheet 17](model-review/motion/sheet-17.png), row 8 |
| 137 | porygon | 5 | 5 | [Sheet 18](model-review/motion/sheet-18.png), row 1 |
| 138 | omanyte | 24 | 24 | [Sheet 18](model-review/motion/sheet-18.png), row 2 |
| 139 | omastar | 42 | 42 | [Sheet 18](model-review/motion/sheet-18.png), row 3 |
| 140 | kabuto | 0 | 14 | [Sheet 18](model-review/motion/sheet-18.png), row 4 |
| 141 | kabutops | 0 | 14 | [Sheet 18](model-review/motion/sheet-18.png), row 5 |
| 142 | aerodactyl | 44 | 44 | [Sheet 18](model-review/motion/sheet-18.png), row 6 |
| 143 | snorlax | 0 | 7 | [Sheet 18](model-review/motion/sheet-18.png), row 7 |
| 144 | articuno | 68 | 68 | [Sheet 18](model-review/motion/sheet-18.png), row 8 |
| 145 | zapdos | 54 | 54 | [Sheet 19](model-review/motion/sheet-19.png), row 1 |
| 146 | moltres | 22 | 22 | [Sheet 19](model-review/motion/sheet-19.png), row 2 |
| 147 | dratini | 16 | 16 | [Sheet 19](model-review/motion/sheet-19.png), row 3 |
| 148 | dragonair | 24 | 24 | [Sheet 19](model-review/motion/sheet-19.png), row 4 |
| 149 | dragonite | 80 | 80 | [Sheet 19](model-review/motion/sheet-19.png), row 5 |
| 150 | mewtwo | 88 | 88 | [Sheet 19](model-review/motion/sheet-19.png), row 6 |
| 151 | mew | 28 | 28 | [Sheet 19](model-review/motion/sheet-19.png), row 7 |
