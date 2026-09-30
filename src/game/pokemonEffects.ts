import { battleMovesFor } from "./battleState";
import { LEARNSET_MOVES, moveAnimationFor } from "./moveAnimations";
import { POKEMON_MODELS } from "./pokemonModels";
import { POKEMON_LOCOMOTION } from "./pokemonLocomotion";

export type EffectKind = "fire" | "water" | "electric" | "leaf" | "ice" | "poison" | "psychic" | "wind" | "dust" | "impact" | "ghost" | "heal";
export type EffectStyle = { kind: EffectKind; color: string; core: string };
export const EFFECT_STYLES: Record<EffectKind, EffectStyle> = {
  fire: { kind: "fire", color: "#ff571b", core: "#ffe993" },
  water: { kind: "water", color: "#289fff", core: "#bcf4ff" },
  electric: { kind: "electric", color: "#ffc928", core: "#fff9c5" },
  leaf: { kind: "leaf", color: "#52bf48", core: "#c7ff84" },
  ice: { kind: "ice", color: "#70dcff", core: "#e6ffff" },
  poison: { kind: "poison", color: "#ab51d5", core: "#efb0ff" },
  psychic: { kind: "psychic", color: "#f06aff", core: "#ffd1f6" },
  wind: { kind: "wind", color: "#bfe5f5", core: "#ffffff" },
  dust: { kind: "dust", color: "#bda57c", core: "#eed9b2" },
  impact: { kind: "impact", color: "#ffe0a2", core: "#ffffff" },
  ghost: { kind: "ghost", color: "#8365db", core: "#cab6ff" },
  heal: { kind: "heal", color: "#61e6ad", core: "#dbffec" },
};
const element: Record<string, EffectKind> = { fire: "fire", water: "water", electric: "electric", grass: "leaf", ice: "ice", poison: "poison", psychic: "psychic", flying: "wind", ground: "dust", rock: "dust", ghost: "ghost", dark: "ghost", dragon: "psychic", fairy: "psychic", bug: "leaf", steel: "impact", fighting: "impact", normal: "impact" };
const contact = new Set(["bite", "claw", "punch", "chop", "kick", "charge", "slam", "headbutt", "peck", "tail", "wrap", "wingStrike", "spin", "grapple"]);
const ranged = new Set(["breath", "beam", "psychic", "electric", "gust", "powder", "sound", "throw", "song", "drain"]);
export type AttackEffect = EffectStyle & { reach: "contact" | "ranged" | "self"; anchor: "head" | "hand" | "tail" | "body"; beam: boolean; hits: number; drain: boolean };

const battleMoveTypes = new Map(Object.keys(POKEMON_MODELS).flatMap(species => battleMovesFor(species).map(move => [move.id, move.type] as const)));

/** Element comes from the move, never the user's species: Squirtle's Tackle is not water. */
export function attackEffectFor(moveId: string, species = "", typeOverride?: string): AttackEffect | null {
  if (moveId === "splash") return null;
  const move = battleMovesFor(species.toLowerCase()).find(candidate => candidate.id === moveId);
  const animation = moveAnimationFor(moveId);
  const archetype = animation.archetype;
  const type = typeOverride ?? move?.type ?? LEARNSET_MOVES[moveId]?.type ?? battleMoveTypes.get(moveId) ?? "normal";
  let kind = element[type] ?? "impact";
  if (["recover", "rest", "soft-boiled", "absorb", "mega-drain", "leech-life"].includes(moveId)) kind = "heal";
  else if (["sound", "song", "gust"].includes(archetype) && type === "normal") kind = "wind";
  else if (["powerUp", "dance", "rest", "vanish", "dodge"].includes(archetype) && type === "normal") kind = "psychic";
  return { ...EFFECT_STYLES[kind], reach: contact.has(archetype) ? "contact" : ranged.has(archetype) ? "ranged" : "self",
    anchor: archetype === "tail" ? "tail" : ["punch", "chop", "claw", "throw"].includes(archetype) ? "hand" : ["breath", "beam", "bite", "peck", "sound", "song"].includes(archetype) ? "head" : "body",
    beam: ["beam", "electric"].includes(archetype) || (archetype === "breath" && !["ember", "vulpix-ember", "flame-burst", "fire-spin", "water-pulse", "lapras-water-pulse"].includes(moveId)), hits: animation.hits ?? 1, drain: archetype === "drain" };
}

/** Each repeated strike gets a burst; wind-up and recovery stay clear. */
export function attackEffectPhase(progress: number, hits = 1) {
  if (!Number.isFinite(progress) || progress < 0.25 || progress >= 0.93) return -1;
  return ((progress - 0.25) / 0.68 * hits) % 1;
}

export function movementEffectFor(number: number): EffectStyle | null {
  const mode = POKEMON_LOCOMOTION[number];
  if (mode === "fly") return EFFECT_STYLES.wind;
  if (mode === "swim") return EFFECT_STYLES.water;
  if (mode === "hover") {
    if (number === 74) return null;
    if ([81, 82, 137].includes(number)) return EFFECT_STYLES.electric;
    if ([109, 110].includes(number)) return EFFECT_STYLES.poison;
    return [92, 93].includes(number) ? EFFECT_STYLES.ghost : EFFECT_STYLES.psychic;
  }
  if (mode === "ooze") return null;
  return EFFECT_STYLES.dust;
}

// Visible flames belong to these models; other Fire types do not constantly shed fire.
export const hasFlameTrail = (number: number) => [4, 5, 6, 77, 78, 126, 146].includes(number);
