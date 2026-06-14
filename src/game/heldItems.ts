import type { PokemonType } from "./battleState";
import { addItem, itemCount } from "./items";
import type { PlayerProgress } from "./progress";

// Held items are equipped on an ally and apply a passive effect for the whole
// battle. They are scarce equipment: equipping consumes one from the bag, and
// unequipping returns it, so each copy can only be on one ally at a time.
export type HeldItemEffect =
  | { kind: "typeBoost"; boostType: PokemonType; multiplier: number }
  | { kind: "lifeOrb"; multiplier: number }
  | { kind: "leftovers"; fraction: number }
  | { kind: "focusSash" };

export const HELD_ITEM_EFFECTS: Record<string, HeldItemEffect> = {
  charcoal: { kind: "typeBoost", boostType: "fire", multiplier: 1.2 },
  "mystic-water": { kind: "typeBoost", boostType: "water", multiplier: 1.2 },
  magnet: { kind: "typeBoost", boostType: "electric", multiplier: 1.2 },
  "miracle-seed": { kind: "typeBoost", boostType: "grass", multiplier: 1.2 },
  "soft-sand": { kind: "typeBoost", boostType: "ground", multiplier: 1.2 },
  "hard-stone": { kind: "typeBoost", boostType: "rock", multiplier: 1.2 },
  "twisted-spoon": { kind: "typeBoost", boostType: "psychic", multiplier: 1.2 },
  leftovers: { kind: "leftovers", fraction: 0.0625 },
  "life-orb": { kind: "lifeOrb", multiplier: 1.25 },
  "focus-sash": { kind: "focusSash" },
};

export function heldItemEffect(itemId: string | undefined | null): HeldItemEffect | null {
  return itemId ? HELD_ITEM_EFFECTS[itemId] ?? null : null;
}

export function isHeldItem(itemId: string): boolean {
  return itemId in HELD_ITEM_EFFECTS;
}

// The outgoing-damage multiplier a held item grants for a given move type.
export function heldItemDamageMultiplier(itemId: string | undefined | null, moveType: PokemonType): number {
  const effect = heldItemEffect(itemId);
  if (!effect) {
    return 1;
  }
  if (effect.kind === "typeBoost") {
    return effect.boostType === moveType ? effect.multiplier : 1;
  }
  if (effect.kind === "lifeOrb") {
    return effect.multiplier;
  }
  return 1;
}

// Equip a held item on an ally, drawing one copy from the bag. Any item the
// ally was already holding goes back into the bag. Returns null if the bag has
// none of the requested item.
export function equipHeldItem(progress: PlayerProgress, allyId: string, itemId: string): PlayerProgress | null {
  if (!isHeldItem(itemId) || itemCount(progress, itemId) < 1) {
    return null;
  }
  let next = progress;
  const current = progress.heldItems[allyId];
  if (current) {
    next = addItem(next, current, 1);
  }
  next = addItem(next, itemId, -1);
  return { ...next, heldItems: { ...next.heldItems, [allyId]: itemId } };
}

// Remove an ally's held item and return it to the bag.
export function unequipHeldItem(progress: PlayerProgress, allyId: string): PlayerProgress | null {
  const current = progress.heldItems[allyId];
  if (!current) {
    return null;
  }
  const withItem = addItem(progress, current, 1);
  const heldItems = { ...withItem.heldItems };
  delete heldItems[allyId];
  return { ...withItem, heldItems };
}
