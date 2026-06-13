import { BALANCE, allyFormForLevel, getAllyOptions } from "./battleState";
import type { PlayerProgress } from "./progress";

export type BattleSummary = {
  won: boolean;
  alliesAlive: number;
  alliesTotal: number;
};

export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  reward: number;
  earnedBy: (progress: PlayerProgress, battle?: BattleSummary) => boolean;
};

// Most achievements derive purely from the save file, so they unlock no
// matter where the qualifying action happened; only Flawless needs the
// just-finished battle's summary.
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-victory",
    name: "First Victory",
    description: "Win your first battle",
    reward: 100,
    earnedBy: (progress) => progress.bestStage >= 1 || progress.dailyClearedDate !== null,
  },
  {
    id: "flawless",
    name: "Flawless",
    description: "Win a battle with no allies down",
    reward: 120,
    earnedBy: (_progress, battle) => Boolean(battle?.won && battle.alliesAlive === battle.alliesTotal),
  },
  {
    id: "stage-5",
    name: "League Contender",
    description: "Clear stage 5",
    reward: 150,
    earnedBy: (progress) => progress.bestStage >= 5,
  },
  {
    id: "stage-10",
    name: "League Champion",
    description: "Clear stage 10",
    reward: 250,
    earnedBy: (progress) => progress.bestStage >= 10,
  },
  {
    id: "daily-devotee",
    name: "Daily Devotee",
    description: "Clear a daily challenge",
    reward: 80,
    earnedBy: (progress) => progress.dailyClearedDate !== null,
  },
  {
    id: "full-roster",
    name: "Full Roster",
    description: "Recruit every ally",
    reward: 200,
    earnedBy: (progress) => getAllyOptions().every((option) => progress.unlockedAllies.includes(option.id)),
  },
  {
    id: "first-evolution",
    name: "Evolver",
    description: "Evolve an ally",
    reward: 100,
    earnedBy: (progress) =>
      Object.entries(progress.allyLevels).some(([allyId, level]) => allyFormForLevel(allyId, level) !== null),
  },
  {
    id: "max-level",
    name: "Peak Performance",
    description: "Raise an ally to the level cap",
    reward: 150,
    earnedBy: (progress) => Object.values(progress.allyLevels).some((level) => level >= BALANCE.maxAllyLevel),
  },
  {
    id: "first-capture",
    name: "Gotcha!",
    description: "Capture a wild creature",
    reward: 100,
    earnedBy: (progress) => progress.captures >= 1,
  },
  {
    id: "seasoned-catcher",
    name: "Seasoned Catcher",
    description: "Capture 5 wild creatures",
    reward: 150,
    earnedBy: (progress) => progress.captures >= 5,
  },
  {
    id: "wild-roster",
    name: "Route Researcher",
    description: "Recruit every wild-only species",
    reward: 150,
    earnedBy: (progress) =>
      getAllyOptions()
        .filter((option) => option.source === "wild")
        .every((option) => progress.unlockedAllies.includes(option.id)),
  },
];

export type AchievementEvaluation = {
  progress: PlayerProgress;
  earned: AchievementDef[];
};

export function evaluateAchievements(progress: PlayerProgress, battle?: BattleSummary): AchievementEvaluation {
  const earned = ACHIEVEMENTS.filter(
    (achievement) => !progress.achievements.includes(achievement.id) && achievement.earnedBy(progress, battle),
  );
  if (earned.length === 0) {
    return { progress, earned };
  }
  return {
    progress: {
      ...progress,
      gems: progress.gems + earned.reduce((sum, achievement) => sum + achievement.reward, 0),
      achievements: [...progress.achievements, ...earned.map((achievement) => achievement.id)],
    },
    earned,
  };
}
