import { describe, expect, it } from "vitest";
import { BALANCE, getAllyOptions } from "./battleState";
import {
  PULL_COST,
  DAILY_CHALLENGE_REWARD,
  applyDailyChallengeClear,
  applyStageClear,
  canPull,
  dailyChallengeReward,
  levelOf,
  levelUpCost,
  performLevelUp,
  performPull,
  stageClearReward,
} from "./gacha";
import type { PlayerProgress } from "./progress";

const baseProgress = (overrides: Partial<PlayerProgress> = {}): PlayerProgress => ({
  bestStage: 0,
  gems: 200,
  unlockedAllies: ["squirtle", "bulbasaur", "charmander"],
  allyLevels: {},
  dailyClearedDate: null,
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
