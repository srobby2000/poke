import type { AllyOption, Rarity } from "./battleState";
import { BALANCE, getAllyOptions } from "./battleState";
import type { PlayerProgress } from "./progress";

export const PULL_COST = 100;

// Progression-flavored gacha: while any ally is still locked, a pull is
// guaranteed to unlock a NEW unit (weighted by rarity). Once everything is
// unlocked, pulls become level-ups for a random ally below the level cap.
const RARITY_WEIGHT: Record<Rarity, number> = { 3: 6, 4: 3, 5: 1 };

export type PullResult = {
  allyId: string;
  name: string;
  rarity: Rarity;
  isNew: boolean;
  level: number;
};

export type PullOutcome = {
  progress: PlayerProgress;
  result: PullResult;
  nextSeed: number;
};

function nextRandom(seed: number): [value: number, nextSeed: number] {
  const nextSeed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [nextSeed / 0x100000000, nextSeed];
}

export function levelOf(progress: PlayerProgress, allyId: string): number {
  const level = progress.allyLevels[allyId] ?? 1;
  return Math.max(1, Math.min(BALANCE.maxAllyLevel, Math.floor(level)));
}

export function levelUpCost(currentLevel: number): number {
  return 40 * Math.max(1, currentLevel);
}

export function canPull(progress: PlayerProgress): boolean {
  if (progress.gems < PULL_COST) {
    return false;
  }
  const roster = getAllyOptions();
  const lockedRemain = roster.some((option) => !progress.unlockedAllies.includes(option.id));
  if (lockedRemain) {
    return true;
  }
  return roster.some((option) => levelOf(progress, option.id) < BALANCE.maxAllyLevel);
}

export function performPull(progress: PlayerProgress, seed: number): PullOutcome | null {
  if (!canPull(progress)) {
    return null;
  }

  const roster = getAllyOptions();
  const locked = roster.filter((option) => !progress.unlockedAllies.includes(option.id));
  const [roll, nextSeed] = nextRandom(seed);

  if (locked.length > 0) {
    const pick = weightedPick(locked, roll);
    return {
      progress: {
        ...progress,
        gems: progress.gems - PULL_COST,
        unlockedAllies: [...progress.unlockedAllies, pick.id],
      },
      result: { allyId: pick.id, name: pick.name, rarity: pick.rarity, isNew: true, level: levelOf(progress, pick.id) },
      nextSeed,
    };
  }

  const candidates = roster.filter((option) => levelOf(progress, option.id) < BALANCE.maxAllyLevel);
  const pick = candidates[Math.min(candidates.length - 1, Math.floor(roll * candidates.length))];
  const level = levelOf(progress, pick.id) + 1;
  return {
    progress: {
      ...progress,
      gems: progress.gems - PULL_COST,
      allyLevels: { ...progress.allyLevels, [pick.id]: level },
    },
    result: { allyId: pick.id, name: pick.name, rarity: pick.rarity, isNew: false, level },
    nextSeed,
  };
}

function weightedPick(options: AllyOption[], roll: number): AllyOption {
  const total = options.reduce((sum, option) => sum + RARITY_WEIGHT[option.rarity], 0);
  let cursor = roll * total;
  for (const option of options) {
    cursor -= RARITY_WEIGHT[option.rarity];
    if (cursor <= 0) {
      return option;
    }
  }
  return options[options.length - 1];
}

export function performLevelUp(progress: PlayerProgress, allyId: string): PlayerProgress | null {
  if (!progress.unlockedAllies.includes(allyId)) {
    return null;
  }
  const level = levelOf(progress, allyId);
  if (level >= BALANCE.maxAllyLevel) {
    return null;
  }
  const cost = levelUpCost(level);
  if (progress.gems < cost) {
    return null;
  }
  return {
    ...progress,
    gems: progress.gems - cost,
    allyLevels: { ...progress.allyLevels, [allyId]: level + 1 },
  };
}

export function stageClearReward(stage: number, bestStage: number): number {
  const firstClearBonus = stage > bestStage ? 60 : 0;
  return 40 + 20 * stage + firstClearBonus;
}

export function applyStageClear(progress: PlayerProgress, stage: number): PlayerProgress {
  return {
    ...progress,
    gems: progress.gems + stageClearReward(stage, progress.bestStage),
    bestStage: Math.max(progress.bestStage, stage),
  };
}
