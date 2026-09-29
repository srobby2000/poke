import learnsets from "./pokemonLearnsets.json";

/** Recorded movements for every move a Kanto Pokémon learns, plus the game's own battle moves.
 *
 * Each archetype is a movement recorded as keyframed poses over normalized time (0..1). A pose
 * lists body channels; any channel a pose omits is at rest. Signs:
 *   lunge   body travels forward (+) / back (-), in display heights
 *   hop     body rises (+) / sinks (-), in display heights
 *   slide   side-step right (+) / left (-), in display heights
 *   lean    whole body pitches forward (+) / rears back (-), radians
 *   roll    whole body tilts to its right (+), radians
 *   spin    turns about the vertical, in full turns
 *   swell   uniform size change (+0.1 = 10% larger); squash stretches (+) / squats (-) vertically
 *   spine   torso curls forward (+) / arches back (-); head nods down-forward (+) / tips back (-)
 *   jaw     mouth opens (0..1)
 *   leadArm / offArm   arm or foreleg raises forward and up (+) / draws back (-); the lead is the right
 *   leadElbow / offElbow   elbow or foreleg knee bends
 *   kick    lead (right) leg swings forward and up; knee bends the lead knee; crouch bends every leg
 *   tail    tail or tentacles cock up (+) / whip down (-); wings spread up (+) / sweep down (-)
 *   parts   generated pieces (fins, magnets, vines) flare; ears pin back (+)
 * Oscillations add fast motion on top: tremble (body shake), shake (side-to-side rocking),
 * flap (wing and part beats), wag (tail wagging).
 */
export type MoveChannel =
  | "lunge" | "hop" | "slide" | "lean" | "roll" | "spin" | "swell" | "squash"
  | "spine" | "head" | "jaw" | "leadArm" | "offArm" | "leadElbow" | "offElbow"
  | "kick" | "knee" | "crouch" | "tail" | "wings" | "parts" | "ears"
  | "tremble" | "shake" | "flap" | "wag";
export type MovePose = { t: number } & Partial<Record<MoveChannel, number>>;

export type MoveArchetype = {
  label: string;
  /** How the body moves, phase by phase. */
  movement: string;
  seconds: number;
  keys: MovePose[];
  /** The span repeated for multi-hit moves; it starts before the wind-up peaks so every hit winds up. */
  strike: [number, number];
};

export const MOVE_ARCHETYPES = {
  bite: {
    label: "Bite", seconds: 0.7, strike: [0.12, 0.62],
    movement: "Rears back with the mouth opening, snaps forward and clamps the jaws shut, gives a short shake, then lets go.",
    keys: [
      { t: 0.3, lean: -0.12, head: -0.3, jaw: 0.55, crouch: 0.25, lunge: -0.04 },
      { t: 0.42, lunge: 0.28, lean: 0.22, head: 0.25, jaw: 0.65 },
      { t: 0.5, lunge: 0.28, lean: 0.22, head: 0.3, jaw: 0, tremble: 0.01 },
      { t: 0.62, lunge: 0.2, lean: 0.12, head: 0.15, jaw: 0.05 },
    ],
  },
  claw: {
    label: "Claw swipe", seconds: 0.75, strike: [0.1, 0.6],
    movement: "Raises the lead claw high while leaning back, rakes it down and across as the body lunges, then follows through.",
    keys: [
      { t: 0.28, leadArm: 2.0, leadElbow: 0.6, lean: -0.1, spine: -0.1, roll: -0.05 },
      { t: 0.44, leadArm: -0.2, leadElbow: 0.1, lunge: 0.18, lean: 0.2, spine: 0.18, roll: 0.08 },
      { t: 0.6, leadArm: 0.2, lunge: 0.14, lean: 0.12 },
    ],
  },
  punch: {
    label: "Punch", seconds: 0.7, strike: [0.1, 0.56],
    movement: "Crouches and draws the lead fist back with the elbow bent, drives it straight forward as the body steps in, holds the extension, then resets its guard.",
    keys: [
      { t: 0.28, leadArm: -0.2, leadElbow: 1.4, offArm: 0.6, offElbow: 1.0, spine: -0.08, lean: -0.08, crouch: 0.2 },
      { t: 0.4, leadArm: 1.45, leadElbow: 0, offArm: -0.2, offElbow: 1.2, lunge: 0.22, lean: 0.18, spine: 0.12 },
      { t: 0.56, leadArm: 1.35, leadElbow: 0.1, lunge: 0.2, lean: 0.15, spine: 0.1 },
    ],
  },
  chop: {
    label: "Chop", seconds: 0.75, strike: [0.1, 0.58],
    movement: "Lifts the lead arm overhead with a small hop, brings it straight down in a chop while bowing forward, then straightens.",
    keys: [
      { t: 0.3, leadArm: 2.6, leadElbow: 0.4, lean: -0.12, spine: -0.1, hop: 0.03 },
      { t: 0.42, leadArm: 0.6, lean: 0.25, spine: 0.2, lunge: 0.15, crouch: 0.2 },
      { t: 0.58, leadArm: 0.5, lean: 0.2, spine: 0.15, lunge: 0.13, crouch: 0.15 },
    ],
  },
  kick: {
    label: "Kick", seconds: 0.8, strike: [0.1, 0.6],
    movement: "Shifts its weight back and chambers the lead leg with the knee bent, snaps the leg out forward and up, holds, then plants it again.",
    keys: [
      { t: 0.3, kick: 0.3, knee: 1.2, lean: -0.12, offArm: 0.4, leadArm: -0.3, hop: 0.02 },
      { t: 0.44, kick: 1.3, knee: 0, lean: -0.2, lunge: 0.15, spine: -0.05 },
      { t: 0.6, kick: 1.1, knee: 0.2, lean: -0.15, lunge: 0.15 },
    ],
  },
  charge: {
    label: "Body charge", seconds: 0.8, strike: [0.12, 0.6],
    movement: "Crouches low with the head down, bursts forward and rams the target with its whole body, then skids back to its spot.",
    keys: [
      { t: 0.3, crouch: 0.45, lean: 0.2, head: 0.25, lunge: -0.06, squash: -0.06 },
      { t: 0.45, lunge: 0.45, lean: 0.25, head: 0.3, hop: 0.04, squash: 0.04 },
      { t: 0.6, lunge: 0.4, lean: 0.1 },
    ],
  },
  slam: {
    label: "Body slam", seconds: 0.9, strike: [0.12, 0.7],
    movement: "Squats, leaps up and forward, and comes down on the target belly-first with a heavy landing, then pushes itself back up.",
    keys: [
      { t: 0.3, crouch: 0.5, squash: -0.08 },
      { t: 0.45, hop: 0.35, lunge: 0.25, lean: -0.1, spine: -0.1, squash: 0.06 },
      { t: 0.58, hop: 0, lunge: 0.35, lean: 0.35, spine: 0.2, squash: -0.1, crouch: 0.3 },
      { t: 0.7, lunge: 0.33, lean: 0.3, spine: 0.15, crouch: 0.25 },
    ],
  },
  headbutt: {
    label: "Headbutt", seconds: 0.8, strike: [0.12, 0.56],
    movement: "Tucks the head back and crouches, then drives forward head- or horn-first, holds the impact, and pulls back.",
    keys: [
      { t: 0.3, lean: -0.18, head: -0.35, crouch: 0.3, lunge: -0.05 },
      { t: 0.44, lunge: 0.38, lean: 0.3, head: 0.45, hop: 0.03 },
      { t: 0.56, lunge: 0.35, lean: 0.28, head: 0.4 },
    ],
  },
  peck: {
    label: "Peck", seconds: 0.7, strike: [0.08, 0.45],
    movement: "Draws the head back, then jabs forward with the beak, stinger or horn and pulls straight back.",
    keys: [
      { t: 0.25, head: -0.4, lean: -0.1 },
      { t: 0.35, head: 0.55, lean: 0.2, lunge: 0.1 },
      { t: 0.45, head: 0.1, lean: 0.05, lunge: 0.04 },
    ],
  },
  tail: {
    label: "Tail swing", seconds: 0.85, strike: [0.12, 0.62],
    movement: "Twists away and cocks the tail (or vines) up, whips it around and down through the target, then turns back to face it.",
    keys: [
      { t: 0.3, spin: -0.08, roll: 0.05, tail: 1.2, lean: 0.05 },
      { t: 0.45, spin: 0.14, roll: -0.08, tail: -1.4, parts: 1 },
      { t: 0.62, spin: 0.08, tail: -0.9 },
    ],
  },
  wag: {
    label: "Tail wag", seconds: 1.0, strike: [0.25, 0.8],
    movement: "Turns partly away to show its rear, wags the tail from side to side with a playful hip sway, then turns back.",
    keys: [
      { t: 0.25, spin: 0.2, lean: 0.08, tail: 0.6 },
      { t: 0.35, spin: 0.22, tail: 0.6, wag: 0.8, shake: 0.08 },
      { t: 0.8, spin: 0.2, tail: 0.5, wag: 0.8, shake: 0.08 },
    ],
  },
  wrap: {
    label: "Wrap", seconds: 1.0, strike: [0.3, 0.8],
    movement: "Lunges in, curls the body and tail around the target and squeezes with a trembling hold, then uncoils.",
    keys: [
      { t: 0.3, lunge: 0.2, lean: 0.15, spine: 0.25, tail: 1.5 },
      { t: 0.45, lunge: 0.2, spine: 0.35, tail: 2, roll: 0.1, tremble: 0.008 },
      { t: 0.8, lunge: 0.18, spine: 0.35, tail: 2, roll: 0.1, tremble: 0.008 },
    ],
  },
  breath: {
    label: "Breath / spray", seconds: 0.95, strike: [0.3, 0.8],
    movement: "Inhales with the chest swelling and head tipped back, then thrusts the head forward with the mouth wide open and holds a steady stream.",
    keys: [
      { t: 0.3, lean: -0.15, head: -0.35, spine: -0.12, jaw: 0.3, swell: 0.04 },
      { t: 0.42, lean: 0.12, head: 0.2, jaw: 0.75, lunge: 0.05 },
      { t: 0.8, lean: 0.1, head: 0.18, jaw: 0.7, lunge: 0.04, tremble: 0.008 },
    ],
  },
  beam: {
    label: "Beam", seconds: 1.3, strike: [0.45, 0.85],
    movement: "Braces low and gathers energy while trembling, fires a straight beam that rocks it back, holds the beam, then relaxes.",
    keys: [
      { t: 0.45, crouch: 0.3, lean: -0.05, head: -0.1, swell: 0.05, tremble: 0.012, leadArm: 0.9, offArm: 0.9, jaw: 0.3 },
      { t: 0.55, lean: -0.12, lunge: -0.08, jaw: 0.65, head: 0.1, leadArm: 1.2, offArm: 1.2 },
      { t: 0.85, lean: -0.1, lunge: -0.07, jaw: 0.6, head: 0.1, leadArm: 1.2, offArm: 1.2, tremble: 0.006 },
    ],
  },
  psychic: {
    label: "Psychic focus", seconds: 1.1, strike: [0.35, 0.85],
    movement: "Rises slightly with arms lifting and the head lowered in concentration, holds the pose with a faint tremor as the power flows, then settles.",
    keys: [
      { t: 0.35, hop: 0.08, head: -0.12, spine: -0.08, leadArm: 1.2, offArm: 1.2, leadElbow: 0.5, offElbow: 0.5, swell: 0.03 },
      { t: 0.55, hop: 0.1, head: 0.05, leadArm: 1.4, offArm: 1.4, leadElbow: 0.3, offElbow: 0.3, swell: 0.05, tremble: 0.008 },
      { t: 0.85, hop: 0.1, head: 0.05, leadArm: 1.4, offArm: 1.4, leadElbow: 0.3, offElbow: 0.3, swell: 0.05, tremble: 0.008 },
    ],
  },
  electric: {
    label: "Electric discharge", seconds: 0.95, strike: [0.3, 0.7],
    movement: "Tenses into a crouch while crackling, then springs up and arches back, arms, tail and ears flung out as the charge discharges.",
    keys: [
      { t: 0.3, crouch: 0.35, squash: -0.08, spine: 0.12, head: 0.1, tremble: 0.01, leadArm: 0.3, offArm: 0.3 },
      { t: 0.45, hop: 0.1, squash: 0.1, spine: -0.2, head: -0.25, tremble: 0.03, leadArm: 1, offArm: 1, tail: 1.2, ears: 0.3, jaw: 0.4, parts: 1 },
      { t: 0.7, hop: 0.06, spine: -0.15, head: -0.2, tremble: 0.02, leadArm: 0.8, offArm: 0.8, tail: 1, ears: 0.3, jaw: 0.3, parts: 0.8 },
    ],
  },
  gust: {
    label: "Wing gust", seconds: 0.9, strike: [0.25, 0.8],
    movement: "Spreads its wings wide while rising, then beats them hard and fast toward the target, hovering in place.",
    keys: [
      { t: 0.25, wings: 1.4, hop: 0.05, lean: -0.15 },
      { t: 0.4, wings: 0.3, flap: 1.3, hop: 0.12, lean: -0.05, lunge: 0.05 },
      { t: 0.8, wings: 0.3, flap: 1.3, hop: 0.12, lean: -0.05, lunge: 0.05 },
    ],
  },
  wingStrike: {
    label: "Wing strike", seconds: 0.85, strike: [0.3, 0.6],
    movement: "Raises both wings high, dives forward and sweeps them down through the target, then pulls up.",
    keys: [
      { t: 0.3, wings: 1.5, hop: 0.1, lean: -0.12 },
      { t: 0.45, wings: -0.8, lunge: 0.35, lean: 0.2, hop: 0.02 },
      { t: 0.6, wings: -0.4, lunge: 0.3, lean: 0.12 },
    ],
  },
  powder: {
    label: "Powder / spores", seconds: 1.0, strike: [0.3, 0.8],
    movement: "Hops up and shakes its whole body from side to side, fluttering wings and leaves to scatter a cloud over the target.",
    keys: [
      { t: 0.3, hop: 0.05, spine: -0.1, swell: 0.03 },
      { t: 0.4, hop: 0.06, shake: 0.14, flap: 0.6, parts: 0.6, swell: 0.04 },
      { t: 0.8, hop: 0.05, shake: 0.14, flap: 0.6, parts: 0.6, swell: 0.03 },
    ],
  },
  sound: {
    label: "Cry / sound", seconds: 0.9, strike: [0.3, 0.8],
    movement: "Draws a breath with the head tipped back, then leans forward and cries out with the mouth wide, the body vibrating.",
    keys: [
      { t: 0.3, lean: -0.12, head: -0.35, spine: -0.15, jaw: 0.3, swell: 0.04 },
      { t: 0.42, lean: 0.12, head: 0.2, jaw: 0.85, spine: 0.1, tremble: 0.012, ears: 0.4 },
      { t: 0.8, lean: 0.1, head: 0.18, jaw: 0.8, spine: 0.08, tremble: 0.012, ears: 0.4 },
    ],
  },
  song: {
    label: "Song / charm", seconds: 1.2, strike: [0.2, 0.85],
    movement: "Sways gently from side to side with the mouth open in song, arms lifted, rocking its whole body in rhythm.",
    keys: [
      { t: 0.2, jaw: 0.4, leadArm: 0.8, offArm: 0.8, head: -0.1 },
      { t: 0.3, jaw: 0.45, leadArm: 0.9, offArm: 0.9, shake: 0.12, head: -0.1, hop: 0.03 },
      { t: 0.85, jaw: 0.45, leadArm: 0.9, offArm: 0.9, shake: 0.12, head: -0.1, hop: 0.03 },
    ],
  },
  stare: {
    label: "Stare / glare", seconds: 0.9, strike: [0.3, 0.8],
    movement: "Leans in low toward the target, head forward and ears back, and holds a menacing stare with a faint quiver.",
    keys: [
      { t: 0.3, lean: 0.15, head: 0.2, crouch: 0.2, ears: 0.3 },
      { t: 0.8, lean: 0.17, head: 0.22, crouch: 0.22, ears: 0.3, tremble: 0.004, lunge: 0.04 },
    ],
  },
  quake: {
    label: "Stomp / quake", seconds: 1.0, strike: [0.3, 0.78],
    movement: "Rears up with arms or forelegs raised, crashes down with its full weight, and the ground shakes it for a moment afterwards.",
    keys: [
      { t: 0.35, hop: 0.3, lean: -0.25, leadArm: 1.6, offArm: 1.6, spine: -0.2 },
      { t: 0.5, lean: 0.2, crouch: 0.5, squash: -0.12, leadArm: 0.2, offArm: 0.2, spine: 0.15, tremble: 0.02 },
      { t: 0.78, lean: 0.1, crouch: 0.3, spine: 0.08, tremble: 0.015 },
    ],
  },
  throw: {
    label: "Throw / fling", seconds: 0.85, strike: [0.12, 0.6],
    movement: "Winds the lead arm back overhead with the torso twisting, then whips it forward to release, following through.",
    keys: [
      { t: 0.35, leadArm: 2.4, leadElbow: 1.0, spine: -0.15, lean: -0.12, spin: -0.05 },
      { t: 0.48, leadArm: 0.7, leadElbow: 0, spine: 0.2, lean: 0.22, spin: 0.06, lunge: 0.1 },
      { t: 0.6, leadArm: 0.6, spine: 0.15, lean: 0.15, spin: 0.04, lunge: 0.08 },
    ],
  },
  spin: {
    label: "Spin attack", seconds: 0.9, strike: [0.2, 0.75],
    movement: "Crouches, then spins a full turn as it rolls forward into the target, and comes back around to face it.",
    keys: [
      { t: 0.2, crouch: 0.3, squash: -0.05 },
      { t: 0.5, spin: 0.5, hop: 0.08, lunge: 0.3, lean: 0.15, tail: 0.5, parts: 0.6 },
      { t: 0.75, spin: 1, hop: 0.02, lunge: 0.2, lean: 0.05 },
    ],
  },
  powerUp: {
    label: "Power up", seconds: 1.0, strike: [0.3, 0.8],
    movement: "Gathers itself into a crouch with fists drawn in, then rises and flexes outward, swelling with power and trembling as it builds.",
    keys: [
      { t: 0.3, crouch: 0.3, spine: 0.15, head: 0.15, squash: -0.05, leadArm: 0.4, offArm: 0.4, leadElbow: 1.2, offElbow: 1.2 },
      { t: 0.5, spine: -0.15, head: -0.2, swell: 0.08, hop: 0.04, leadArm: 0.9, offArm: 0.9, leadElbow: 1.5, offElbow: 1.5, tremble: 0.01, jaw: 0.3, tail: 0.6, parts: 0.6 },
      { t: 0.8, spine: -0.12, head: -0.15, swell: 0.07, hop: 0.03, leadArm: 0.9, offArm: 0.9, leadElbow: 1.5, offElbow: 1.5, tremble: 0.01, jaw: 0.2 },
    ],
  },
  dance: {
    label: "Dance", seconds: 1.1, strike: [0.15, 0.85],
    movement: "Raises its arms and spins twice on the spot with a bounce in each turn, ending in a proud pose.",
    keys: [
      { t: 0.15, leadArm: 1.6, offArm: 1.6, crouch: 0.2 },
      { t: 0.5, spin: 1, hop: 0.1, leadArm: 2, offArm: 2, tail: 0.6, wings: 0.8 },
      { t: 0.85, spin: 2, hop: 0.02, leadArm: 1.8, offArm: 1.8, swell: 0.05 },
    ],
  },
  guard: {
    label: "Guard / harden", seconds: 0.9, strike: [0.35, 0.75],
    movement: "Pulls its head and limbs in and curls up tight, shrinking into a hard, braced shape, then opens back out.",
    keys: [
      { t: 0.35, crouch: 0.5, spine: 0.35, head: 0.4, swell: -0.08, squash: -0.06, leadArm: 0.6, offArm: 0.6, leadElbow: 1.6, offElbow: 1.6, tail: 0.8, parts: -0.6 },
      { t: 0.75, crouch: 0.5, spine: 0.35, head: 0.4, swell: -0.08, squash: -0.06, leadArm: 0.6, offArm: 0.6, leadElbow: 1.6, offElbow: 1.6, tail: 0.8, parts: -0.6, tremble: 0.004 },
    ],
  },
  dodge: {
    label: "Quick step", seconds: 0.75, strike: [0.05, 0.7],
    movement: "Darts to one side, then the other, too fast to follow, and lands back where it started.",
    keys: [
      { t: 0.2, slide: 0.35, lean: 0.1, roll: -0.1, crouch: 0.2 },
      { t: 0.45, slide: -0.35, lean: 0.1, roll: 0.1, crouch: 0.2 },
      { t: 0.7, slide: 0.15, roll: -0.05, crouch: 0.1 },
    ],
  },
  vanish: {
    label: "Vanish / shrink", seconds: 1.0, strike: [0.3, 0.75],
    movement: "Curls in and shrinks away to almost nothing, holds there, then pops back to full size.",
    keys: [
      { t: 0.3, swell: -0.55, crouch: 0.3, spine: 0.2, hop: 0.05 },
      { t: 0.75, swell: -0.6, crouch: 0.3, spine: 0.2, hop: 0.05 },
      { t: 0.85, swell: 0.06 },
    ],
  },
  explode: {
    label: "Explosion", seconds: 1.2, strike: [0.3, 0.85],
    movement: "Swells up and shakes harder and harder, bursts outward in one violent flash, then collapses and recovers.",
    keys: [
      { t: 0.6, swell: 0.25, tremble: 0.03, crouch: 0.3, spine: 0.2 },
      { t: 0.72, swell: 0.4, hop: 0.1, tremble: 0.04, parts: 1.5 },
      { t: 0.8, swell: -0.1, squash: -0.1, crouch: 0.5 },
      { t: 0.9, swell: -0.05, crouch: 0.3 },
    ],
  },
  drain: {
    label: "Drain", seconds: 1.0, strike: [0.3, 0.8],
    movement: "Reaches in close to the target, then leans back, swelling slightly as the stolen energy flows in.",
    keys: [
      { t: 0.3, lunge: 0.15, lean: 0.15, head: 0.2, jaw: 0.3, leadArm: 0.8 },
      { t: 0.5, lunge: -0.05, lean: -0.15, head: -0.2, swell: 0.05, tremble: 0.006, jaw: 0.1, parts: 0.5 },
      { t: 0.8, lunge: -0.04, lean: -0.12, head: -0.15, swell: 0.05, tremble: 0.006 },
    ],
  },
  splash: {
    label: "Splash", seconds: 1.0, strike: [0.1, 0.7],
    movement: "Flops and bounces helplessly, tipping one way and then the other.",
    keys: [
      { t: 0.2, hop: 0.3, roll: 0.25, tail: 1 },
      { t: 0.35, hop: 0, roll: 0, squash: -0.08 },
      { t: 0.5, hop: 0.3, roll: -0.25, tail: -1 },
      { t: 0.65, hop: 0, squash: -0.08 },
    ],
  },
  dig: {
    label: "Dig", seconds: 1.3, strike: [0.2, 0.85],
    movement: "Curls down and burrows until almost hidden, stays underground, then bursts up out of the ground at the target.",
    keys: [
      { t: 0.35, hop: -0.45, squash: -0.25, spine: 0.3, crouch: 0.5, leadArm: 1, offArm: 1 },
      { t: 0.6, hop: -0.5, squash: -0.3, spine: 0.3, crouch: 0.5, lunge: 0.2 },
      { t: 0.75, hop: 0.25, lunge: 0.35, lean: -0.2, squash: 0.08, leadArm: 1.8, offArm: 1.8 },
      { t: 0.85, hop: 0.05, lunge: 0.3, lean: 0.1 },
    ],
  },
  rest: {
    label: "Rest / recover", seconds: 1.3, strike: [0.3, 0.85],
    movement: "Lowers itself and curls up with the head down, breathing slowly and deeply, then rises refreshed.",
    keys: [
      { t: 0.3, crouch: 0.5, spine: 0.3, head: 0.45, lean: 0.1, hop: -0.03 },
      { t: 0.55, crouch: 0.5, spine: 0.32, head: 0.45, lean: 0.1, hop: -0.03, swell: 0.04 },
      { t: 0.85, crouch: 0.5, spine: 0.3, head: 0.45, lean: 0.1, hop: -0.03 },
    ],
  },
  grapple: {
    label: "Grapple / throw", seconds: 1.2, strike: [0.25, 0.9],
    movement: "Lunges in to grab with both arms, heaves the target up while spinning around, then slams it down to the ground.",
    keys: [
      { t: 0.25, lunge: 0.3, lean: 0.2, leadArm: 1.3, offArm: 1.3, leadElbow: 0.8, offElbow: 0.8 },
      { t: 0.5, lunge: 0.2, hop: 0.2, lean: -0.2, spin: 0.5, leadArm: 2.4, offArm: 2.4, leadElbow: 0.4, offElbow: 0.4 },
      { t: 0.7, lunge: 0.3, spin: 1, lean: 0.35, crouch: 0.4, leadArm: 0.6, offArm: 0.6 },
      { t: 0.9, lunge: 0.2, lean: 0.15, crouch: 0.2 },
    ],
  },
  shudder: {
    label: "Shudder", seconds: 0.7, strike: [0.2, 0.7],
    movement: "Freezes stiffly and shudders in place, unable to act.",
    keys: [
      { t: 0.2, crouch: 0.15, spine: 0.1, tremble: 0.02 },
      { t: 0.7, crouch: 0.15, spine: 0.1, tremble: 0.02 },
    ],
  },
} satisfies Record<string, MoveArchetype>;

export type MoveArchetypeId = keyof typeof MOVE_ARCHETYPES;
export type MoveAnimation = {
  archetype: MoveArchetypeId;
  /** How this move looks, beyond its archetype. */
  note: string;
  hits?: number;
  /** Clip length relative to the archetype (0.7 is faster). */
  speed?: number;
  /** Scales every pose channel. */
  intensity?: number;
};

const m = (archetype: MoveArchetypeId, note: string, extra: Partial<MoveAnimation> = {}): MoveAnimation => ({ archetype, note, ...extra });

/** Every Gen 1 level-up move, then the battle roster's own moves. */
export const MOVE_ANIMATIONS: Record<string, MoveAnimation> = {
  // Bites and jaws
  bite: m("bite", "Sinks its fangs in with a quick snap."),
  "hyper-fang": m("bite", "A lunging bite with its big front fangs.", { intensity: 1.2 }),
  "super-fang": m("bite", "A leaping fang strike aimed to halve the target.", { intensity: 1.3 }),
  lick: m("bite", "Leans in and licks with a long tongue, the mouth only half open.", { intensity: 0.7 }),
  clamp: m("bite", "Snaps its shell shut on the target like a pair of jaws."),
  // Claws and pincers
  scratch: m("claw", "A single raking scratch with sharp claws."),
  slash: m("claw", "A deep, powerful slash.", { intensity: 1.25 }),
  "fury-swipes": m("claw", "Rakes left and right in a flurry of swipes.", { hits: 3, speed: 0.75 }),
  "vice-grip": m("claw", "Clamps the target between its pincers."),
  guillotine: m("claw", "Brings its pincers together in one crushing snap.", { intensity: 1.35 }),
  // Punches and chops
  "comet-punch": m("punch", "A rapid combination of alternating punches.", { hits: 3, speed: 0.7 }),
  "mega-punch": m("punch", "A single punch thrown with all its weight.", { intensity: 1.3 }),
  "fire-punch": m("punch", "A flaming punch driven straight in."),
  "ice-punch": m("punch", "An icy punch driven straight in."),
  "thunder-punch": m("punch", "An electrified punch driven straight in."),
  "dizzy-punch": m("punch", "A looping punch with a woozy follow-through.", { intensity: 1.1 }),
  counter: m("punch", "Braces, then hits back hard."),
  "karate-chop": m("chop", "A sharp downward chop with the edge of the hand."),
  "double-slap": m("chop", "Slaps back and forth with alternating hands.", { hits: 2, speed: 0.7 }),
  pound: m("chop", "Pounds the target with a forelimb or tail."),
  crabhammer: m("chop", "Hammers down with its huge claw.", { intensity: 1.3 }),
  // Kicks
  "double-kick": m("kick", "Two quick kicks in succession.", { hits: 2, speed: 0.7 }),
  "jump-kick": m("kick", "Jumps and kicks out in mid-air.", { intensity: 1.2 }),
  "high-jump-kick": m("kick", "A soaring knee-high kick.", { intensity: 1.4 }),
  "mega-kick": m("kick", "A single tremendously powerful kick.", { intensity: 1.35 }),
  "low-kick": m("kick", "A low sweeping kick at the legs.", { intensity: 0.8 }),
  "rolling-kick": m("spin", "Spins around and lashes out with a heel kick."),
  stomp: m("quake", "Raises a foot and stamps down on the target.", { intensity: 0.7 }),
  // Charges and body blows
  tackle: m("charge", "Throws its whole body forward shoulder-first."),
  "take-down": m("charge", "A reckless full-speed charge.", { intensity: 1.2 }),
  "double-edge": m("charge", "An all-out charge that hurts itself too.", { intensity: 1.35 }),
  "quick-attack": m("charge", "Darts in so fast it's almost invisible.", { speed: 0.6 }),
  rage: m("charge", "Charges in a furious temper."),
  thrash: m("charge", "Charges again and again in a frenzy.", { hits: 3, speed: 0.7 }),
  waterfall: m("charge", "Charges up and over the target like a surging waterfall.", { intensity: 1.2 }),
  headbutt: m("headbutt", "Rams the target head-first."),
  "horn-attack": m("headbutt", "Jabs forward with its horn."),
  "horn-drill": m("headbutt", "Drives in with a spinning horn.", { intensity: 1.35 }),
  "skull-bash": m("headbutt", "Tucks in its head to charge up, then rams hard.", { intensity: 1.4, speed: 1.3 }),
  "body-slam": m("slam", "Leaps and slams down on the target with its whole body."),
  slam: m("tail", "Swings its tail or body round into the target."),
  "vine-whip": m("tail", "Lashes out with its vines."),
  "tail-whip": m("wag", "Wags its tail cutely to make the target let its guard down."),
  wrap: m("wrap", "Wraps its long body around the target and squeezes."),
  bind: m("wrap", "Binds the target tight with its body or vines."),
  constrict: m("wrap", "Constricts the target with tentacles or vines.", { intensity: 0.8 }),
  // Pecks and stings
  peck: m("peck", "A jab with its beak."),
  "drill-peck": m("peck", "A spinning, drilling series of pecks.", { hits: 3, speed: 0.6 }),
  "fury-attack": m("peck", "Jabs repeatedly with its horn or beak.", { hits: 3, speed: 0.6 }),
  "poison-sting": m("peck", "Jabs with a toxic stinger or barb."),
  twineedle: m("peck", "Stabs twice with its stingers.", { hits: 2, speed: 0.7 }),
  "pin-missile": m("peck", "Fires a volley of sharp spikes.", { hits: 3, speed: 0.6 }),
  "spike-cannon": m("peck", "Shoots spikes in quick succession.", { hits: 3, speed: 0.6 }),
  // Breath and sprays
  ember: m("breath", "Puffs a small burst of flame."),
  flamethrower: m("breath", "Breathes a long, roaring stream of fire.", { speed: 1.3, intensity: 1.2 }),
  "fire-spin": m("breath", "Breathes a spiralling vortex of flame around the target.", { speed: 1.2 }),
  "water-gun": m("breath", "Sprays a jet of water from its mouth."),
  "hydro-pump": m("breath", "Blasts a huge torrent of water.", { speed: 1.3, intensity: 1.3 }),
  bubble: m("breath", "Blows a spray of bubbles.", { intensity: 0.7 }),
  smog: m("breath", "Exhales a cloud of filthy smog."),
  sludge: m("breath", "Spits out a glob of sludge."),
  acid: m("breath", "Sprays a corrosive acid."),
  "poison-gas": m("breath", "Breathes out a cloud of poison gas.", { intensity: 0.8 }),
  "dragon-rage": m("breath", "Breathes a shockwave of draconic rage.", { intensity: 1.2 }),
  "string-shot": m("breath", "Spits sticky silk at the target.", { intensity: 0.7 }),
  smokescreen: m("breath", "Blows out a cloud of black smoke.", { intensity: 0.7 }),
  mist: m("breath", "Exhales a cool protective mist.", { intensity: 0.6 }),
  haze: m("breath", "Breathes out a haze of black fog.", { intensity: 0.6 }),
  // Beams
  "hyper-beam": m("beam", "Charges, then fires a massive destructive beam.", { speed: 1.2, intensity: 1.3 }),
  "solar-beam": m("beam", "Soaks up sunlight for a long moment before firing.", { speed: 1.5 }),
  "ice-beam": m("beam", "Fires a freezing beam of ice."),
  blizzard: m("breath", "Breathes out a howling snowstorm.", { speed: 1.3, intensity: 1.3 }),
  "aurora-beam": m("beam", "Fires a shimmering rainbow beam."),
  psybeam: m("beam", "Fires a wavering psychic beam."),
  "tri-attack": m("beam", "Fires three beams at once."),
  "sonic-boom": m("beam", "Launches a cutting shockwave.", { speed: 0.8, intensity: 0.8 }),
  // Psychic and ghostly focus
  confusion: m("psychic", "Concentrates to push a wave of psychic force."),
  psychic: m("psychic", "Unleashes powerful telekinetic force.", { intensity: 1.25 }),
  "dream-eater": m("drain", "Feeds on the target's dreams."),
  "night-shade": m("psychic", "Casts a ghostly illusion at the target."),
  hypnosis: m("song", "Sways hypnotically to lull the target."),
  meditate: m("psychic", "Meditates calmly to focus its strength.", { intensity: 0.8 }),
  "light-screen": m("psychic", "Raises a shimmering wall of light."),
  reflect: m("psychic", "Raises a reflective barrier."),
  conversion: m("psychic", "Shifts its own type with a pulse of data."),
  metronome: m("song", "Waggles a finger rhythmically, drawing on a random power."),
  "mirror-move": m("gust", "Mimics the target's last move with a flourish of wings."),
  transform: m("powerUp", "Wobbles and reshapes itself into the target's form."),
  // Electric
  "thunder-shock": m("electric", "Crackles and releases a jolt of electricity."),
  thunder: m("electric", "Calls down a massive thunderbolt.", { speed: 1.2, intensity: 1.35 }),
  "thunder-wave": m("electric", "Sends out a weak paralysing wave.", { intensity: 0.7 }),
  // Wings
  gust: m("gust", "Whips up a gust of wind with its wings."),
  whirlwind: m("gust", "Beats its wings to blow the target away.", { intensity: 1.2 }),
  "wing-attack": m("wingStrike", "Strikes with its spread wings."),
  "sky-attack": m("wingStrike", "Glows, then dives from above with overwhelming force.", { speed: 1.4, intensity: 1.35 }),
  // Powders, seeds and leaves
  "stun-spore": m("powder", "Scatters a cloud of paralysing spores."),
  "sleep-powder": m("powder", "Scatters a cloud of sleep-inducing powder."),
  "poison-powder": m("powder", "Scatters a cloud of poisonous powder."),
  spore: m("powder", "Releases a burst of sleep spores."),
  "sand-attack": m("powder", "Kicks up sand at the target's face.", { intensity: 0.8 }),
  "leech-seed": m("throw", "Flings a seed that sprouts onto the target."),
  "razor-leaf": m("throw", "Flings sharp-edged leaves.", { hits: 2, speed: 0.7 }),
  "petal-dance": m("dance", "Whirls in a dance, scattering petals."),
  growth: m("powerUp", "Stretches up and grows."),
  // Cries and songs
  growl: m("sound", "Growls endearingly to lower the target's guard.", { intensity: 0.7 }),
  roar: m("sound", "Lets out a mighty roar.", { intensity: 1.35 }),
  screech: m("sound", "Emits a piercing screech.", { intensity: 1.2 }),
  supersonic: m("sound", "Emits confusing sound waves."),
  sing: m("song", "Sings a gentle lullaby."),
  "lovely-kiss": m("stare", "Leans in and puckers up for a kiss."),
  // Stares
  leer: m("stare", "Glares with intimidating eyes."),
  glare: m("stare", "Freezes the target with a paralysing glare.", { intensity: 1.2 }),
  disable: m("stare", "Fixes the target with a stare that seals a move."),
  "confuse-ray": m("stare", "Fixes the target with a sinister glowing light."),
  // Ground
  earthquake: m("quake", "Stamps down to set off a powerful quake.", { intensity: 1.3 }),
  dig: m("dig", "Burrows underground, then bursts out."),
  // Throws and projectiles
  "rock-throw": m("throw", "Hurls a rock at the target."),
  bonemerang: m("throw", "Throws its bone like a boomerang.", { hits: 2, speed: 0.75 }),
  "bone-club": m("chop", "Clubs the target with its bone."),
  barrage: m("throw", "Hurls round objects one after another.", { hits: 3, speed: 0.6 }),
  "pay-day": m("throw", "Flings coins at the target."),
  swift: m("throw", "Flings a spray of star-shaped rays."),
  // Strength
  "seismic-toss": m("grapple", "Grabs the target, heaves it up and throws it down."),
  submission: m("grapple", "Grapples the target and rolls with it to the ground.", { speed: 0.9 }),
  // Power-ups
  "swords-dance": m("dance", "Performs a fighting dance to sharpen its spirit."),
  "focus-energy": m("powerUp", "Takes a deep breath and focuses."),
  sharpen: m("powerUp", "Tenses up to sharpen its edges.", { intensity: 0.8 }),
  substitute: m("powerUp", "Pours part of its strength into a decoy."),
  // Guards
  harden: m("guard", "Stiffens its body to raise its defence."),
  withdraw: m("guard", "Pulls its head and limbs into its shell."),
  "defense-curl": m("guard", "Curls up into a ball."),
  "acid-armor": m("guard", "Melts its body into a liquid shield."),
  barrier: m("guard", "Crosses its arms behind a solid barrier."),
  // Evasion
  agility: m("dodge", "Darts around at blinding speed."),
  "double-team": m("dodge", "Moves so fast that copies of it appear.", { hits: 2, speed: 0.7 }),
  teleport: m("vanish", "Blinks out of sight and back."),
  minimize: m("vanish", "Shrinks itself down to a tiny size."),
  // Self-destructive, draining, recovery, oddities
  explosion: m("explode", "Blows itself up in a huge blast.", { intensity: 1.3 }),
  "self-destruct": m("explode", "Blows itself up."),
  absorb: m("drain", "Absorbs nutrients from the target.", { intensity: 0.8 }),
  "leech-life": m("drain", "Bites in and sucks the target's energy."),
  rest: m("rest", "Curls up and falls asleep to heal."),
  recover: m("rest", "Rests briefly to restore its health.", { speed: 0.8 }),
  amnesia: m("rest", "Empties its mind to forget its worries.", { speed: 0.8 }),
  splash: m("splash", "Flops around uselessly."),

  // Battle roster moves outside the Gen 1 level-up lists
  "aqua-tail": m("tail", "Swings a tail wrapped in a raging current."),
  "pidgey-tackle": m("charge", "Throws its whole body forward."),
  "rattata-quick-attack": m("charge", "Darts in so fast it's almost invisible.", { speed: 0.6 }),
  "pidgey-gust": m("gust", "Whips up a gust of wind with its wings."),
  "vulpix-ember": m("breath", "Puffs a small burst of flame."),
  "meowth-growl": m("sound", "Growls to lower the target's guard.", { intensity: 0.7 }),
  "water-pulse": m("breath", "Launches a pulsing ring of water."),
  "lapras-water-pulse": m("breath", "Launches a pulsing ring of water."),
  "flame-burst": m("breath", "Spits a bursting fireball.", { intensity: 1.1 }),
  "flame-wheel": m("spin", "Wraps itself in fire and rolls into the target."),
  "electro-ball": m("throw", "Hurls a crackling ball of electricity."),
  "zen-headbutt": m("headbutt", "Rams with a head focused by psychic power."),
  "heavy-slam": m("slam", "Slams its heavy body down on the target.", { intensity: 1.3 }),
  "low-sweep": m("kick", "Sweeps the target's legs out with a low kick.", { intensity: 0.8 }),
  magnitude: m("quake", "Stamps down to set off a quake of random strength."),
  "dragon-pulse": m("beam", "Fires a shockwave from its open mouth."),
  twister: m("gust", "Whips up a vicious twister."),
  "disarming-voice": m("sound", "Cries out charmingly."),
  charm: m("song", "Sways and looks endearing."),
  "bulk-up": m("powerUp", "Flexes to bulk up its muscles."),
  "dragon-dance": m("dance", "Performs a mystic, powerful dance."),
  "hold-back": m("claw", "A restrained swipe that leaves the target standing.", { intensity: 0.7 }),
  "trainer-buff": m("powerUp", "Answers its trainer's call and powers up."),
  paralyzed: m("shudder", "Seizes up, fully paralysed."),
  "unity-burst": m("charge", "Charges in together with the whole team.", { intensity: 1.4 }),
  "sync-hydro": m("breath", "Sync: a huge cresting wave.", { speed: 1.3, intensity: 1.35 }),
  "sync-bloom": m("powder", "Sync: a surging burst of blossoms.", { intensity: 1.3 }),
  "sync-flare": m("spin", "Sync: a blazing, spinning rush.", { intensity: 1.3 }),
  "sync-inferno-tails": m("tail", "Sync: whips a storm of flaming tails.", { intensity: 1.35 }),
  "sync-mach-impact": m("charge", "Sync: a supersonic body blow.", { intensity: 1.4, speed: 0.8 }),
  "sync-star-burst": m("throw", "Sync: flings a burst of stars.", { intensity: 1.3 }),
  "sync-mind-shock": m("psychic", "Sync: an overwhelming psychic shock.", { intensity: 1.35 }),
  "sync-rock-avalanche": m("quake", "Sync: brings down an avalanche of rock.", { intensity: 1.35 }),
  "sync-lullaby-crash": m("slam", "Sync: a dreamy song that ends in a body slam.", { intensity: 1.3 }),
  "sync-loyal-blaze": m("breath", "Sync: a loyal, roaring blaze.", { speed: 1.3, intensity: 1.35 }),
  "sync-headache-wave": m("psychic", "Sync: a throbbing psychic wave.", { intensity: 1.3 }),
  "sync-jackpot": m("throw", "Sync: flings a shower of coins.", { hits: 3, speed: 0.7 }),
  "sync-bone-rush": m("chop", "Sync: a flurry of bone strikes.", { hits: 3, speed: 0.7 }),
  "sync-phantom-grip": m("claw", "Sync: a ghostly grip from the shadows.", { intensity: 1.35 }),
  "sync-dragon-ascent": m("dance", "Sync: spirals upward like a rising dragon.", { intensity: 1.3 }),
  "sync-glacial-song": m("song", "Sync: a freezing, haunting song.", { intensity: 1.3 }),
  "sync-gale": m("gust", "Sync: a howling gale.", { intensity: 1.35 }),
  "sync-sky-dive": m("wingStrike", "Sync: dives from the sky.", { intensity: 1.4 }),
  "sync-bolt": m("electric", "Sync: a massive bolt of lightning.", { intensity: 1.4 }),
  "sync-impact": m("slam", "Sync: a crushing full-body impact.", { intensity: 1.4 }),
  "sync-super-fang": m("bite", "Sync: a savage fang strike.", { intensity: 1.4 }),
  "sync-petal-storm": m("dance", "Sync: a storm of whirling petals.", { intensity: 1.3 }),
};

type LearnsetData = {
  source: string;
  species: { number: number; name: string; learnset: { move: string; level: number }[] }[];
  moves: Record<string, { name: string; type: string; damageClass: string; power: number | null; target: string; effect: string }>;
};
const data = learnsets as LearnsetData;

export type LearnedMove = { id: string; name: string; level: number; type: string; damageClass: string; power: number | null; effect: string; animation: MoveAnimation };

/** Unknown moves still animate: pick a movement from how the move deals damage. */
export function moveAnimationFor(id: string): MoveAnimation {
  const known = MOVE_ANIMATIONS[id];
  if (known) return known;
  const move = data.moves[id];
  if (move?.damageClass === "status") return m("powerUp", "A general power-up motion.");
  if (move?.damageClass === "special") return m("beam", "A general ranged attack motion.");
  return m("charge", "A general body attack motion.");
}

/** A species' Red/Blue level-up moves, in the order it learns them. */
export function learnsetFor(species: string): LearnedMove[] {
  const entry = data.species.find(candidate => candidate.name === species);
  return (entry?.learnset ?? []).map(({ move, level }) => {
    const info = data.moves[move];
    return { id: move, name: info?.name ?? move, level, type: info?.type ?? "normal", damageClass: info?.damageClass ?? "physical", power: info?.power ?? null, effect: info?.effect ?? "", animation: moveAnimationFor(move) };
  });
}

export const LEARNSET_SPECIES = data.species;
export const LEARNSET_MOVES = data.moves;
