import { describe, expect, it } from "vitest";
import { BALANCE, getAllyOptions } from "./battleState";
import {
  DAILY_CHALLENGE_REWARD,
  MULTI_PULL_COST,
  MULTI_PULL_COUNT,
  PULL_COST,
  applyCapture,
  applyDailyChallengeClear,
  applyStageClear,
  canMultiPull,
  canPull,
  dailyChallengeReward,
  levelOf,
  levelUpCost,
  performLevelUp,
  performMultiPull,
  performPull,
  stageClearReward,
  wildVictoryReward,
} from "./gacha";
import type { PlayerProgress } from "./progress";

const baseProgress = (overrides: Partial<PlayerProgress> = {}): PlayerProgress => ({
  bestStage: 0,
  gems: 200,
  unlockedAllies: ["squirtle", "bulbasaur", "charmander"],
  allyLevels: {},
  dailyClearedDate: null,
  achievements: [],
  worldPosition: null,
  defeatedTrainers: [],
  trainerRematches: {},
  seenSpecies: [],
  inventory: {},
  berryPicks: { date: "", picked: [] },
  captures: 0,
  ...overrides,
});

const allAllyIds = getAllyOptions().map((option) => option.id);

describe("gacha pulls", () => {
  it("unlocks a new ally and spends gems while any are locked", () => {
    const outcome = performPull(baseProgress(), 12345);

    expect(outcome).not.toBeNull();
    expect(outcome?.result.isNew).toBe(true);
    expect(outcome?.progress.gems).toBe(200 - PULL_COST);
    expect(outcome?.progress.unlockedAllies).toHaveLength(4);
    expect(outcome?.progress.unlockedAllies).toContain(outcome?.result.allyId);
    expect(["squirtle", "bulbasaur", "charmander"]).not.toContain(outcome?.result.allyId);
  });

  it("is deterministic for a given seed", () => {
    const first = performPull(baseProgress(), 777);
    const second = performPull(baseProgress(), 777);

    expect(first?.result.allyId).toBe(second?.result.allyId);
    expect(first?.nextSeed).toBe(second?.nextSeed);
  });

  it("eventually unlocks every rarity tier", () => {
    const seen = new Set<number>();
    let seed = 1;
    for (let i = 0; i < 200; i += 1) {
      const outcome = performPull(baseProgress(), seed * 104729);
      seed += 1;
      if (outcome) {
        seen.add(outcome.result.rarity);
      }
    }

    expect(seen).toEqual(new Set([3, 4, 5]));
  });

  it("refuses a pull without enough gems", () => {
    expect(performPull(baseProgress({ gems: PULL_COST - 1 }), 1)).toBeNull();
    expect(canPull(baseProgress({ gems: PULL_COST - 1 }))).toBe(false);
  });

  it("levels up a random ally once everything is unlocked", () => {
    const outcome = performPull(baseProgress({ unlockedAllies: [...allAllyIds] }), 999);

    expect(outcome?.result.isNew).toBe(false);
    expect(outcome?.result.level).toBe(2);
    expect(outcome?.progress.allyLevels[outcome.result.allyId]).toBe(2);
    expect(outcome?.progress.unlockedAllies).toHaveLength(allAllyIds.length);
  });

  it("refuses to pull when every ally is at the level cap", () => {
    const maxed = baseProgress({
      unlockedAllies: [...allAllyIds],
      allyLevels: Object.fromEntries(allAllyIds.map((id) => [id, BALANCE.maxAllyLevel])),
    });

    expect(canPull(maxed)).toBe(false);
    expect(performPull(maxed, 1)).toBeNull();
  });
});

describe("multi pulls", () => {
  it("performs ten discounted pulls with unique new recruits", () => {
    const outcome = performMultiPull(baseProgress({ gems: 1000 }), 4242);

    expect(MULTI_PULL_COST).toBeLessThan(MULTI_PULL_COUNT * PULL_COST);
    expect(outcome?.results).toHaveLength(MULTI_PULL_COUNT);
    expect(outcome?.progress.gems).toBe(1000 - MULTI_PULL_COST);
    // 13 allies were locked, so all ten pulls are guaranteed-new and unique.
    const newIds = outcome?.results.filter((result) => result.isNew).map((result) => result.allyId) ?? [];
    expect(newIds).toHaveLength(MULTI_PULL_COUNT);
    expect(new Set(newIds).size).toBe(MULTI_PULL_COUNT);
    expect(outcome?.progress.unlockedAllies).toHaveLength(3 + MULTI_PULL_COUNT);
  });

  it("is deterministic for a given seed", () => {
    const first = performMultiPull(baseProgress({ gems: 2000 }), 31337);
    const second = performMultiPull(baseProgress({ gems: 2000 }), 31337);

    expect(first?.results.map((result) => result.allyId)).toEqual(second?.results.map((result) => result.allyId));
    expect(first?.nextSeed).toBe(second?.nextSeed);
  });

  it("requires the full multi-pull price", () => {
    expect(canMultiPull(baseProgress({ gems: MULTI_PULL_COST - 1 }))).toBe(false);
    expect(performMultiPull(baseProgress({ gems: MULTI_PULL_COST - 1 }), 1)).toBeNull();
  });

  it("refunds unused pulls when targets run out mid-batch", () => {
    // Everything unlocked; only one ally has level-up room, so one pull lands.
    const nearlyMaxed = baseProgress({
      gems: 1000,
      unlockedAllies: [...allAllyIds],
      allyLevels: Object.fromEntries(
        allAllyIds.map((id) => [id, id === "squirtle" ? BALANCE.maxAllyLevel - 1 : BALANCE.maxAllyLevel]),
      ),
    });

    const outcome = performMultiPull(nearlyMaxed, 7);
    const perPull = MULTI_PULL_COST / MULTI_PULL_COUNT;

    expect(outcome?.results).toHaveLength(1);
    expect(outcome?.results[0].allyId).toBe("squirtle");
    expect(outcome?.progress.gems).toBe(1000 - MULTI_PULL_COST + perPull * (MULTI_PULL_COUNT - 1));
  });
});

describe("captures", () => {
  it("never pulls wild-source allies from the gacha", () => {
    let progress = baseProgress({ gems: 100000 });
    for (let index = 0; index < 16; index += 1) {
      const outcome = performPull(progress, (index + 1) * 104729);
      if (!outcome) {
        break;
      }
      progress = outcome.progress;
    }

    expect(progress.unlockedAllies).toHaveLength(16);
    expect(progress.unlockedAllies).not.toContain("pidgey");
    expect(progress.unlockedAllies).not.toContain("rattata");
    expect(progress.unlockedAllies).not.toContain("oddish");
  });

  it("applies captures as unlocks, levels, or gem consolation", () => {
    const unlocked = applyCapture(baseProgress(), "pidgey");
    expect(unlocked.result).toBe("unlocked");
    expect(unlocked.progress.unlockedAllies).toContain("pidgey");

    const leveled = applyCapture(unlocked.progress, "pidgey");
    expect(leveled.result).toBe("leveled");
    expect(leveled.progress.allyLevels.pidgey).toBe(2);

    const maxed = applyCapture(
      baseProgress({ unlockedAllies: ["pidgey"], allyLevels: { pidgey: BALANCE.maxAllyLevel } }),
      "pidgey",
    );
    expect(maxed.result).toBe("maxed");
    expect(maxed.progress.gems).toBe(200 + 25);
  });

  it("pays larger rewards for higher-level wild victories", () => {
    expect(wildVictoryReward(4)).toBeGreaterThan(wildVictoryReward(1));
  });
});

describe("leveling", () => {
  it("spends gems to raise an ally level", () => {
    const next = performLevelUp(baseProgress(), "squirtle");

    expect(next?.gems).toBe(200 - levelUpCost(1));
    expect(next ? levelOf(next, "squirtle") : 0).toBe(2);
  });

  it("rejects locked allies, the level cap, and insufficient gems", () => {
    expect(performLevelUp(baseProgress(), "dratini")).toBeNull();
    expect(
      performLevelUp(baseProgress({ allyLevels: { squirtle: BALANCE.maxAllyLevel } }), "squirtle"),
    ).toBeNull();
    expect(performLevelUp(baseProgress({ gems: 0 }), "squirtle")).toBeNull();
  });

  it("charges more for higher levels", () => {
    expect(levelUpCost(5)).toBeGreaterThan(levelUpCost(1));
  });
});

describe("stage rewards", () => {
  it("pays out gems and tracks best stage", () => {
    const cleared = applyStageClear(baseProgress(), 1);

    expect(cleared.gems).toBe(200 + stageClearReward(1, 0));
    expect(cleared.bestStage).toBe(1);
  });

  it("adds a first-clear bonus only for new stages", () => {
    expect(stageClearReward(3, 2)).toBeGreaterThan(stageClearReward(3, 3));
  });

  it("pays the daily challenge reward once per date", () => {
    const cleared = applyDailyChallengeClear(baseProgress(), "2026-06-11");
    const repeated = applyDailyChallengeClear(cleared, "2026-06-11");
    const nextDay = applyDailyChallengeClear(repeated, "2026-06-12");

    expect(cleared.gems).toBe(200 + DAILY_CHALLENGE_REWARD);
    expect(cleared.dailyClearedDate).toBe("2026-06-11");
    expect(dailyChallengeReward(cleared, "2026-06-11")).toBe(0);
    expect(repeated.gems).toBe(cleared.gems);
    expect(nextDay.gems).toBe(cleared.gems + DAILY_CHALLENGE_REWARD);
  });
});
