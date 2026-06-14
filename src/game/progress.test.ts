import { describe, expect, it } from "vitest";
import { exportProgress, importProgress } from "./progress";
import type { PlayerProgress } from "./progress";

const progress: PlayerProgress = {
  bestStage: 4,
  gems: 320,
  unlockedAllies: ["squirtle", "bulbasaur", "charmander"],
  allyLevels: { squirtle: 3 },
  dailyClearedDate: "2026-06-14",
  achievements: ["first-victory"],
  worldPosition: { mapId: "village", x: 2, z: 3 },
  defeatedTrainers: ["village-gate"],
  inventory: { "potion-item": 2 },
  berryPicks: { date: "2026-06-14", picked: ["1,2"] },
  captures: 1,
};

describe("progress import/export", () => {
  it("round-trips exported progress", () => {
    expect(importProgress(exportProgress(progress))).toEqual(progress);
  });

  it("rejects invalid JSON", () => {
    expect(importProgress("{nope")).toBeNull();
  });

  it("sanitizes imported values", () => {
    const imported = importProgress(
      JSON.stringify({
        bestStage: 3.8,
        gems: -1,
        unlockedAllies: [1, "squirtle"],
        inventory: { "potion-item": 2, bad: -4 },
        captures: 2.9,
      }),
    );

    expect(imported?.bestStage).toBe(3);
    expect(imported?.gems).toBe(0);
    expect(imported?.unlockedAllies).toEqual(["squirtle"]);
    expect(imported?.inventory).toEqual({ "potion-item": 2 });
    expect(imported?.captures).toBe(2);
  });
});
