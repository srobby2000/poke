import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, evaluateAchievements } from "./achievements";
import { BALANCE, getAllyOptions } from "./battleState";
import type { PlayerProgress } from "./progress";

const baseProgress = (overrides: Partial<PlayerProgress> = {}): PlayerProgress => ({
  bestStage: 0,
  gems: 0,
  unlockedAllies: ["squirtle", "bulbasaur", "charmander"],
  allyLevels: {},
  dailyClearedDate: null,
  achievements: [],
  worldPosition: null,
  ...overrides,
});

const rewardOf = (id: string) => ACHIEVEMENTS.find((achievement) => achievement.id === id)?.reward ?? 0;

describe("achievements", () => {
  it("awards first victory and flawless from a winning battle", () => {
    const { progress, earned } = evaluateAchievements(baseProgress({ bestStage: 1 }), {
      won: true,
      alliesAlive: 3,
      alliesTotal: 3,
    });

    expect(earned.map((achievement) => achievement.id).sort()).toEqual(["first-victory", "flawless"]);
    expect(progress.gems).toBe(rewardOf("first-victory") + rewardOf("flawless"));
    expect(progress.achievements).toContain("flawless");
  });

  it("does not award flawless when an ally fell", () => {
    const { earned } = evaluateAchievements(baseProgress({ bestStage: 1 }), {
      won: true,
      alliesAlive: 2,
      alliesTotal: 3,
    });

    expect(earned.map((achievement) => achievement.id)).toEqual(["first-victory"]);
  });

  it("never awards the same achievement twice", () => {
    const first = evaluateAchievements(baseProgress({ bestStage: 1 }));
    const second = evaluateAchievements(first.progress);

    expect(first.earned.map((achievement) => achievement.id)).toEqual(["first-victory"]);
    expect(second.earned).toHaveLength(0);
    expect(second.progress).toBe(first.progress);
  });

  it("awards stage milestones from best stage", () => {
    const { earned } = evaluateAchievements(baseProgress({ bestStage: 10 }));
    const ids = earned.map((achievement) => achievement.id);

    expect(ids).toContain("stage-5");
    expect(ids).toContain("stage-10");
  });

  it("awards daily, roster, evolution, and level-cap achievements from the save", () => {
    const allIds = getAllyOptions().map((option) => option.id);
    const { earned } = evaluateAchievements(
      baseProgress({
        dailyClearedDate: "2026-06-12",
        unlockedAllies: allIds,
        allyLevels: { charmander: BALANCE.maxAllyLevel },
      }),
    );
    const ids = earned.map((achievement) => achievement.id);

    expect(ids).toContain("daily-devotee");
    expect(ids).toContain("full-roster");
    expect(ids).toContain("first-evolution");
    expect(ids).toContain("max-level");
  });

  it("does not award evolution for levels below the threshold", () => {
    const { earned } = evaluateAchievements(baseProgress({ allyLevels: { charmander: 3 } }));

    expect(earned.map((achievement) => achievement.id)).not.toContain("first-evolution");
  });
});
