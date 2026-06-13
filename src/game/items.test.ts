import { describe, expect, it } from "vitest";
import { ITEMS, addItem, berryYieldFor, itemCount, pickBerry, pickedBerryTiles } from "./items";
import type { PlayerProgress } from "./progress";
import { SHOP_STOCK, buyItem, sellItem, sellableItems } from "./shop";

const baseProgress = (overrides: Partial<PlayerProgress> = {}): PlayerProgress => ({
  bestStage: 0,
  gems: 200,
  unlockedAllies: ["squirtle", "bulbasaur", "charmander"],
  allyLevels: {},
  dailyClearedDate: null,
  achievements: [],
  worldPosition: null,
  inventory: {},
  berryPicks: { date: "", picked: [] },
  captures: 0,
  ...overrides,
});

describe("berry picking", () => {
  it("adds a deterministic berry yield to the inventory", () => {
    const result = pickBerry(baseProgress(), "3,11", "2026-06-12");
    const expected = berryYieldFor("3,11", "2026-06-12");

    expect(result).not.toBeNull();
    expect(result?.itemId).toBe(expected.itemId);
    expect(result?.quantity).toBe(expected.quantity);
    expect(itemCount(result!.progress, expected.itemId)).toBe(expected.quantity);
    expect(pickedBerryTiles(result!.progress, "2026-06-12")).toEqual(["3,11"]);
  });

  it("refuses a second pick of the same tree on the same day", () => {
    const first = pickBerry(baseProgress(), "3,11", "2026-06-12");
    const second = pickBerry(first!.progress, "3,11", "2026-06-12");

    expect(second).toBeNull();
  });

  it("regrows berries when the date changes", () => {
    const first = pickBerry(baseProgress(), "3,11", "2026-06-12");
    const nextDay = pickBerry(first!.progress, "3,11", "2026-06-13");

    expect(nextDay).not.toBeNull();
    expect(pickedBerryTiles(nextDay!.progress, "2026-06-13")).toEqual(["3,11"]);
  });

  it("tracks picks per tree", () => {
    const first = pickBerry(baseProgress(), "3,11", "2026-06-12");
    const otherTree = pickBerry(first!.progress, "3,14", "2026-06-12");

    expect(otherTree).not.toBeNull();
    expect(pickedBerryTiles(otherTree!.progress, "2026-06-12")).toEqual(["3,11", "3,14"]);
  });

  it("only yields known berry items", () => {
    for (let day = 1; day <= 20; day += 1) {
      const { itemId } = berryYieldFor("5,5", `2026-06-${String(day).padStart(2, "0")}`);
      expect(ITEMS[itemId]?.kind).toBe("berry");
    }
  });
});

describe("shop", () => {
  it("buys items for gems", () => {
    const next = buyItem(baseProgress(), "poke-ball");

    expect(next?.gems).toBe(200 - (ITEMS["poke-ball"].buyPrice ?? 0));
    expect(itemCount(next!, "poke-ball")).toBe(1);
  });

  it("refuses purchases without enough gems or for unstocked items", () => {
    expect(buyItem(baseProgress({ gems: 10 }), "poke-ball")).toBeNull();
    expect(buyItem(baseProgress(), "oran-berry")).toBeNull();
    expect(buyItem(baseProgress(), "nonsense")).toBeNull();
  });

  it("sells owned items for gems", () => {
    const stocked = addItem(baseProgress(), "oran-berry", 3);
    const next = sellItem(stocked, "oran-berry");

    expect(next?.gems).toBe(200 + (ITEMS["oran-berry"].sellPrice ?? 0));
    expect(itemCount(next!, "oran-berry")).toBe(2);
  });

  it("refuses to sell items the player does not own", () => {
    expect(sellItem(baseProgress(), "oran-berry")).toBeNull();
  });

  it("lists shop stock and sellable inventory", () => {
    expect(SHOP_STOCK.map((item) => item.id)).toEqual(["poke-ball", "great-ball", "potion-item"]);

    const stocked = addItem(baseProgress(), "sitrus-berry", 1);
    expect(sellableItems(baseProgress())).toHaveLength(0);
    expect(sellableItems(stocked).map((item) => item.id)).toEqual(["sitrus-berry"]);
  });
});
