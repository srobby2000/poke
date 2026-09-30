import type { PokemonLocomotion } from "./pokemonLocomotion";
import type { ClipMetrics, MotionRole } from "./pokemonMotionMetrics";

/** Target bands for how each kind of Pokémon should move, per motion. Measured bands come
 * from the authored clips bundled with the models (docs/animation-references.json); modes with
 * no authored clip use real-animal motion and animation principles (docs/animation-references.md).
 * Durations in seconds, ranges in degrees, bob in % of body height, beats per second. */
export type MotionBand = {
  duration?: [number, number];
  bob?: [number, number];
  /** The most-moving joint must swing at least this far (and at most, when given). */
  peak?: [number, number?];
  /** Legs (thigh, knee, arm-as-foreleg) must swing at least this far, when the rig has them. */
  legs?: number;
  /** Tails, wings and ears must move at least this much, when the rig has them. */
  appendages?: number;
  beatHz?: [number, number];
  /** When the fastest motion happens, as a fraction of the clip. */
  strikeAt?: [number, number];
};
type Motion = "idle" | "walk" | "run" | "attack" | "hit";

// Shared by every mode: attacks match the ~1.8–2.2 s authored attacks (strike near a third),
// hits snap early and settle in about 0.7 s (Mewtwo, Dragonite damage01: 0.68 s, snap at 5–9%).
const ATTACK: MotionBand = { duration: [1.7, 2.4], strikeAt: [0.1, 0.65], peak: [30] };
const HIT: MotionBand = { duration: [0.55, 0.85], strikeAt: [0, 0.35], peak: [20] };
const IDLE: MotionBand = { duration: [1.5, 3.6] };

export const MOTION_TARGETS: Record<PokemonLocomotion, Record<Motion, MotionBand>> = {
  // Mewtwo, Dragonite, Wigglytuff: calm body, big legs; walk 1.58–1.62 s, run 0.67–0.68 s.
  biped: {
    idle: { ...IDLE, bob: [0, 2.5] },
    walk: { duration: [0.85, 1.7], bob: [0, 6], legs: 30 },
    run: { duration: [0.38, 0.9], bob: [0, 12], legs: 45 },
    attack: { ...ATTACK, peak: [55] },
    hit: { ...HIT, peak: [30] },
  },
  // Bulbasaur: idle bob 0.04%, walk 1.17 s with 71–73° legs, run 0.38 s, attack feet planted.
  quadruped: {
    idle: { ...IDLE, bob: [0, 1.5] },
    walk: { duration: [0.85, 1.7], bob: [0, 4], legs: 30 },
    run: { duration: [0.35, 0.8], bob: [0, 12], legs: 45 },
    attack: { ...ATTACK, bob: [0, 5], peak: [45] },
    hit: { ...HIT, peak: [30] },
  },
  // Zubat's flight: wings ~99°, 2.8 beats/s. Flyers also bob while holding position.
  fly: {
    idle: { ...IDLE, peak: [20] },
    walk: { duration: [0.8, 2.2], peak: [45], beatHz: [1.2, 4] },
    run: { duration: [0.5, 1.6], peak: [45], beatHz: [1.5, 5] },
    attack: ATTACK, hit: HIT,
  },
  // Haunter floats ~12% of its height over 3.3 s; Magnemite ~17% over 2 s.
  hover: {
    idle: { ...IDLE, bob: [3, 18] },
    walk: { duration: [0.9, 3.6], bob: [2, 18] },
    run: { duration: [0.6, 3], bob: [1, 18] },
    attack: ATTACK, hit: HIT,
  },
  // Carangiform swimmers beat their tails in a travelling wave, tip largest; stylised to ~1–2.5 Hz.
  swim: {
    idle: { ...IDLE, peak: [6] },
    walk: { duration: [0.8, 1.8], peak: [12], beatHz: [0.5, 2.5] },
    run: { duration: [0.5, 1.4], peak: [12], beatHz: [0.7, 3.5] },
    attack: ATTACK, hit: HIT,
  },
  // Onix: ~15° per segment in a slow wave. Snakes don't bounce.
  slither: {
    idle: { ...IDLE, peak: [4] },
    walk: { duration: [0.8, 1.8], bob: [0, 2], peak: [8] },
    run: { duration: [0.5, 1.4], bob: [0, 2], peak: [8] },
    attack: ATTACK, hit: HIT,
  },
  // Crabs and larvae: legs step in a staggered (metachronal) wave, body level.
  crawl: {
    idle: IDLE,
    walk: { duration: [0.7, 1.5], bob: [0, 3], peak: [10] },
    run: { duration: [0.45, 1.1], bob: [0, 3], peak: [10] },
    attack: ATTACK, hit: HIT,
  },
  // Hops read through squash-and-stretch: a clear lift each cycle.
  hop: {
    idle: IDLE,
    walk: { duration: [0.7, 1.4], bob: [4, 18] },
    run: { duration: [0.5, 1.1], bob: [4, 18] },
    attack: ATTACK, hit: HIT,
  },
  roll: { idle: IDLE, walk: { duration: [0.6, 1.6] }, run: { duration: [0.4, 1.2] }, attack: ATTACK, hit: HIT },
  // Grimer and Muk: the body slides; feelers and drips carry the motion.
  ooze: { idle: IDLE, walk: { duration: [0.8, 2], bob: [0, 6] }, run: { duration: [0.5, 1.5], bob: [0, 6] }, attack: ATTACK, hit: HIT },
  burrow: { idle: IDLE, walk: { duration: [0.6, 1.6], bob: [0, 2] }, run: { duration: [0.4, 1.2], bob: [0, 2] }, attack: ATTACK, hit: HIT },
};

const LEG_ROLES: MotionRole[] = ["thigh", "knee"];
const APPENDAGE_ROLES: MotionRole[] = ["tail", "wing", "ear"];
const LOOPS = new Set<Motion>(["idle", "walk", "run"]);

/** What falls outside the band for this mode and motion; empty when the clip is on target. */
export function checkMotion(metrics: ClipMetrics, mode: PokemonLocomotion, motion: Motion): string[] {
  const band = MOTION_TARGETS[mode][motion];
  const issues: string[] = [];
  const within = (label: string, value: number, [min, max]: [number, number?], unit: string) => {
    if (value < min - 1e-6) issues.push(`${label} ${value.toFixed(2)}${unit} < ${min}`);
    else if (max !== undefined && value > max + 1e-6) issues.push(`${label} ${value.toFixed(2)}${unit} > ${max}`);
  };
  if (band.duration) within("length", metrics.duration, band.duration, "s");
  if (band.bob) within("bob", metrics.bob, band.bob, "%");
  // The two-legged attack band comes from Mewtwo's arm swing; rigs without arms use the general band.
  const armless = motion === "attack" && !("arm" in metrics.roles || "forearm" in metrics.roles);
  if (band.peak) within("peak", metrics.peakRange, armless ? [Math.min(band.peak[0], ATTACK.peak![0]), band.peak[1]] : band.peak, "°");
  if (band.beatHz) within("beat", metrics.beatHz, band.beatHz, "Hz");
  if (band.strikeAt) within("strike at", metrics.peakSpeedAt, band.strikeAt, "");
  const legs = Math.max(0, ...LEG_ROLES.map(role => metrics.roles[role] ?? 0));
  if (band.legs && LEG_ROLES.some(role => role in metrics.roles) && legs < band.legs) issues.push(`legs ${legs.toFixed(0)}° < ${band.legs}`);
  const appendages = Math.max(0, ...APPENDAGE_ROLES.map(role => metrics.roles[role] ?? 0));
  if (band.appendages && APPENDAGE_ROLES.some(role => role in metrics.roles) && appendages < band.appendages) issues.push(`tails/wings ${appendages.toFixed(0)}° < ${band.appendages}`);
  // Loops must join up, and nothing may jerk: authored loops stay under ~3 (Mewtwo walk 2.95).
  if (LOOPS.has(motion) && metrics.seam > 3) issues.push(`seam ${metrics.seam.toFixed(1)}°`);
  if (metrics.kink > (LOOPS.has(motion) ? 6 : 20)) issues.push(`kink ${metrics.kink.toFixed(1)}`);
  return issues;
}
