# Animation references

The procedural Pokémon animation is tuned to measured references. `src/game/pokemonMotionTargets.ts` holds a target band for every travel mode and motion, and `src/game/pokemonMotionQuality.test.ts` holds all 151 species to those bands.

## Where the references come from

**Authored game clips bundled with the models.** A few GLBs in `public/models/pokemon/` ship real animation. `scripts/measure-animation-references.mjs` measures them with `src/game/pokemonMotionMetrics.ts` and writes [animation-references.json](animation-references.json). Each clip is measured on its own rig, staged at display scale as the game shows it.

| Mode | Species and clips | Key measurements |
| --- | --- | --- |
| Two-legged | Mewtwo, Dragonite: wait, walk, run, attack, damage. Wigglytuff: run | Walk 1.58–1.62 s at 0.62 Hz, thighs and knees 53–67°, feet up to 72°, bob 2.2% (Mewtwo). Run 0.67–0.68 s, thighs 98–124°. Attack 2.18 s, strike at about 30% of the clip, arms 103–105°. Hit 0.68 s, snapping in the first 5–9% |
| Four-legged | Bulbasaur: idle, walk, run, fight | Idle 1.67 s with the body nearly still (0.04% bob). Walk 1.17 s at 0.86 Hz, legs 71–73°, bob 1.4%. Run 0.38 s. Attack 1.75 s with the feet planted (0.03% bob) and the forelegs swiping 44–50° |
| Fly | Zubat: flight loop | Wings about 99°, beating about 3 times a second |
| Hover | Haunter, Magnemite | Float about 12% of height over 3.3 s (Haunter), and 17% over 2 s (Magnemite) |
| Slither | Onix | About 15° per segment, in a slow wave (0.35 Hz) |
| Ooze | Grimer | Feelers and drips carry the motion while the body stays put |

Pikachu's "Impactrueno" (a 4.5 s leaping sequence) and the long Eevee-line and Grimer action sequences are not loops or ordinary attacks, so they don't set targets. Pikachu's clip still supplies its standing rest pose.

**Real animal motion and animation principles**, for modes with no authored clip:

- **Swim**: carangiform swimmers concentrate the motion "in the very rear of the body and tail" ([Fish locomotion](https://en.wikipedia.org/wiki/Fish_locomotion)), so the tail wave grows toward the tip. The beat rate, about 1–2.5 Hz, is a stylised choice; the source gives no figure.
- **Slither**: in lateral undulation, "waves of lateral bending propagate down the snake's body", side to side rather than bouncing ([Undulatory locomotion](https://en.wikipedia.org/wiki/Undulatory_locomotion)). Snakes get no vertical footfall bounce.
- **Crawl**: multi-legged walkers move their legs in a sequential, wave-like metachronal rhythm rather than all together ([Metachronal rhythm](https://en.wikipedia.org/wiki/Metachronal_rhythm)). The body stays level.
- **Hop, roll, ooze, burrow, and every attack**: the classic principles ([Twelve basic principles of animation](https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation)):
  - squash and stretch, for weight
  - anticipation, the wind-up before a strike
  - follow-through and overlapping action, so loose parts keep moving after the body stops
  - slow in and slow out

## What changed to meet them

- **Walk and run**:
  - walk cycles now scale with size, 0.95–1.65 s, up from a fixed 0.7 s, and runs are their own motion
  - legs swing about 55–60° with smooth knee flex and a heel-to-toe foot roll
  - the bob is about 2% of height instead of 4–9%, with a slight hip twist and a head that stays level
- **Idle**: the body stays calm, and tails, wings and ears carry the motion at 15–25°.
- **Attack** (2 s, like the authored 1.75–2.18 s): a wind-up, a strike at about a third of the clip, a hold, and a slow recovery. Four-legged Pokémon keep their feet planted and swipe with the lead foreleg.
- **Hit** (0.7 s): a bigger early snap, then a settle.
- **Moves**:
  - the recorded poses are joined by a Catmull-Rom curve, so motion flows through each pose instead of stopping at it
  - lengths map into 1.8–2.2 s, scaled by each move's speed and number of hits
  - in battle, contact moves close the distance just before the strike and hold contact through it
- **Loose parts**: hair, feelers, tentacles and unnamed joint chains (`Bone001`) follow the body with a delay.
- **Flyers and swimmers**:
  - flyers get fuller wing strokes: birds beat about 2.2 times a second, insects about 3.3
  - swimmers paddle harder and rock gently at rest
- **Seams and transitions**:
  - authored loops with seams (Bulbasaur's walk and run at 32–36°, Zubat's flight at 26°) are blended closed
  - crossfades take 0.3 s between loops and 0.15 s into one-shots, and walk and run keep their phase
- **No foot sliding**: travel playback follows the actual ground speed (`travelPlayback`). A small partner that can't keep up at walking cadence breaks into its run.

## Limits

- Where a mode has an authored reference, the bands check timing, joint range, bob, beat rate, seams and jerk against it. They don't compare pose shapes frame by frame.
- Generated rigs (for models shipped without skeletons) deform more simply than artist-skinned ones.
- The measurements are offline. They don't replace a look in the game.

## Reproduce

```sh
node scripts/measure-animation-references.mjs            # reference measurements -> animation-references.json
node scripts/measure-animation-references.mjs --compare  # every species vs its bands
npx vitest run src/game/pokemonMotionQuality.test.ts
```
