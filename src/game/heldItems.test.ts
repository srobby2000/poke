import { describe, expect, it } from "vitest";
import { addItem } from "./items";
import {
  equipHeldItem,
  heldItemDamageMultiplier,
  heldItemEffect,
  isHeldItem,
  unequipHeldItem,
} from "./heldItems";
import { defaultProgress } from "./progress";

describe("held item effects", () => {
  it("recognises held items and looks up effects", () => {
    expect(isHeldItem("charcoal")).toBe(true);
    expect(isHeldItem("poke-ball")).toBe(false);
    expect(heldItemEffect("leftovers")?.kind).toBe("leftovers");
    expect(heldItemEffect(undefined)).toBeNull();
  });

  it("multiplies damage only for the matching type, and flat for Life Orb", () => {
    expect(heldItemDamageMultiplier("charcoal", "fire")).toBeCloseTo(1.2);
    expect(heldItemDamageMultiplier("charcoal", "water")).toBe(1);
    expect(heldItemDamageMultiplier("life-orb", "rock")).toBeCloseTo(1.25);
    expect(heldItemDamageMultiplier("leftovers", "fire")).toBe(1);
    expect(heldItemDamageMultiplier(undefined, "fire")).toBe(1);
  });
});

describe("equipping held items", () => {
  it("moves an item from the bag onto an ally", () => {
    const progress = addItem(defaultProgress(), "charcoal", 2);
    const next = equipHeldItem(progress, "charmander", "charcoal");

    expect(next).not.toBeNull();
    expect(next!.heldItems.charmander).toBe("charcoal");
    expect(next!.inventory.charcoal).toBe(1);
  });

  it("refuses to equip an item the bag does not have", () => {
    expect(equipHeldItem(defaultProgress(), "charmander", "charcoal")).toBeNull();
  });

  it("returns the previously held item when swapping", () => {
    let progress = addItem(defaultProgress(), "charcoal", 1);
    progress = addItem(progress, "leftovers", 1);
    progress = equipHeldItem(progress, "charmander", "charcoal")!;
    expect(progress.inventory.charcoal ?? 0).toBe(0);

    const swapped = equipHeldItem(progress, "charmander", "leftovers")!;
    expect(swapped.heldItems.charmander).toBe("leftovers");
    // The charcoal it was holding goes back into the bag.
    expect(swapped.inventory.charcoal).toBe(1);
    expect(swapped.inventory.leftovers ?? 0).toBe(0);
  });

  it("unequips an item back into the bag", () => {
    let progress = addItem(defaultProgress(), "charcoal", 1);
    progress = equipHeldItem(progress, "charmander", "charcoal")!;

    const cleared = unequipHeldItem(progress, "charmander")!;
    expect(cleared.heldItems.charmander).toBeUndefined();
    expect(cleared.inventory.charcoal).toBe(1);
    expect(unequipHeldItem(cleared, "charmander")).toBeNull();
  });
});
