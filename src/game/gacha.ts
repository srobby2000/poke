import type { AllyOption, Rarity } from "./battleState";
import { BALANCE, evolutionChoicesFor, getAllyOptions } from "./battleState";
import { addItem, itemCount } from "./items";
import type { PlayerProgress } from "./progress";

export const PULL_COST = 100;
export const MULTI_PULL_COUNT = 10;
// Ten pulls for the price of nine.
export const MULTI_PULL_COST = 900;
export const DAILY_CHALLENGE_REWARD = 180;

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

// PokeAPI growth-rate names → an XP-curve multiplier (only applied when the
// "use PokeAPI rates" setting is on).
const GROWTH_RATE_FACTOR: Record<string, number> = {
  fast: 0.8,
  "medium-fast": 1,
  medium: 1,
  "medium-slow": 1.1,
  slow: 1.25,
  erratic: 1,
  fluctuating: 1.15,
};

export function growthRateFactor(rate?: string): number {
  return rate ? GROWTH_RATE_FACTOR[rate] ?? 1 : 1;
}

// Optional PokeAPI-driven tuning for XP: per-ally growth rates, applied only
// when usePokeApiRates is on.
export type XpTuning = { usePokeApiRates: boolean; growthRates: Record<string, string> };

function growthRateFor(allyId: string, tuning?: XpTuning): string | undefined {
  return tuning?.usePokeApiRates ? tuning.growthRates[allyId] : undefined;
}

// XP needed to advance from the given level to the next one.
export function xpToNextLevel(level: number, growthRate?: string): number {
  return Math.round((60 + 40 * Math.max(1, level)) * growthRateFactor(growthRate));
}

// XP a battle awards to each participating ally. Scales with the battle's level
// and, when available, the defeated species' base experience.
export function battleXpReward(stage: number, baseExperience?: number): number {
  const base = 20 + 8 * Math.max(1, Math.floor(stage));
  if (baseExperience && baseExperience > 0) {
    const factor = Math.min(2, Math.max(0.6, baseExperience / 80));
    return Math.round(base * factor);
  }
  return base;
}

export type AllyXpInfo = { level: number; current: number; needed: number; atMax: boolean };

// XP-bar info for an ally: progress toward the next level (or maxed out).
export function xpInfo(progress: PlayerProgress, allyId: string, tuning?: XpTuning): AllyXpInfo {
  const level = levelOf(progress, allyId);
  const atMax = level >= BALANCE.maxAllyLevel;
  const needed = atMax ? 0 : xpToNextLevel(level, growthRateFor(allyId, tuning));
  const current = atMax ? 0 : Math.min(Math.max(0, progress.allyXp[allyId] ?? 0), needed);
  return { level, current, needed, atMax };
}

// Award battle XP to each participating ally, auto-leveling as thresholds are
// crossed (carrying the remainder). Allies already at the cap stay maxed.
export function grantBattleXp(
  progress: PlayerProgress,
  allyIds: string[],
  amount: number,
  tuning?: XpTuning,
): PlayerProgress {
  const allyLevels = { ...progress.allyLevels };
  const allyXp = { ...progress.allyXp };
  for (const id of allyIds) {
    if (!progress.unlockedAllies.includes(id)) {
      continue;
    }
    const rate = growthRateFor(id, tuning);
    let level = Math.max(1, Math.min(BALANCE.maxAllyLevel, Math.floor(allyLevels[id] ?? 1)));
    if (level >= BALANCE.maxAllyLevel) {
      allyXp[id] = 0;
      continue;
    }
    let xp = (allyXp[id] ?? 0) + amount;
    while (level < BALANCE.maxAllyLevel && xp >= xpToNextLevel(level, rate)) {
      xp -= xpToNextLevel(level, rate);
      level += 1;
    }
    allyLevels[id] = level;
    allyXp[id] = level >= BALANCE.maxAllyLevel ? 0 : xp;
  }
  return { ...progress, allyLevels, allyXp };
}

// Wild-source allies are capture-only; the scout machine never dispenses them.
function gachaPool(): AllyOption[] {
  return getAllyOptions().filter((option) => option.source !== "wild");
}

function hasPullTargets(progress: PlayerProgress): boolean {
  const roster = gachaPool();
  if (roster.some((option) => !progress.unlockedAllies.includes(option.id))) {
    return true;
  }
  return roster.some((option) => levelOf(progress, option.id) < BALANCE.maxAllyLevel);
}

export function canPull(progress: PlayerProgress): boolean {
  return progress.gems >= PULL_COST && hasPullTargets(progress);
}

export function canMultiPull(progress: PlayerProgress): boolean {
  return progress.gems >= MULTI_PULL_COST && hasPullTargets(progress);
}

// One pull without the gem charge; performPull/performMultiPull handle cost.
function pullOnce(progress: PlayerProgress, seed: number): PullOutcome | null {
  if (!hasPullTargets(progress)) {
    return null;
  }

  const roster = gachaPool();
  const locked = roster.filter((option) => !progress.unlockedAllies.includes(option.id));
  const [roll, nextSeed] = nextRandom(seed);

  if (locked.length > 0) {
    const pick = weightedPick(locked, roll);
    return {
      progress: {
        ...progress,
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
      allyLevels: { ...progress.allyLevels, [pick.id]: level },
    },
    result: { allyId: pick.id, name: pick.name, rarity: pick.rarity, isNew: false, level },
    nextSeed,
  };
}

export function performPull(progress: PlayerProgress, seed: number): PullOutcome | null {
  if (!canPull(progress)) {
    return null;
  }
  return pullOnce({ ...progress, gems: progress.gems - PULL_COST }, seed);
}

export type MultiPullOutcome = {
  progress: PlayerProgress;
  results: PullResult[];
  nextSeed: number;
};

export function performMultiPull(progress: PlayerProgress, seed: number): MultiPullOutcome | null {
  if (!canMultiPull(progress)) {
    return null;
  }

  let current: PlayerProgress = { ...progress, gems: progress.gems - MULTI_PULL_COST };
  let currentSeed = seed;
  const results: PullResult[] = [];

  for (let index = 0; index < MULTI_PULL_COUNT; index += 1) {
    const outcome = pullOnce(current, currentSeed);
    if (!outcome) {
      // Everything hit the cap mid-batch: refund the unused pulls pro rata.
      const refund = Math.round((MULTI_PULL_COST / MULTI_PULL_COUNT) * (MULTI_PULL_COUNT - index));
      current = { ...current, gems: current.gems + refund };
      break;
    }
    current = outcome.progress;
    currentSeed = outcome.nextSeed;
    results.push(outcome.result);
  }

  return { progress: current, results, nextSeed: currentSeed };
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

export function chooseEvolution(progress: PlayerProgress, allyId: string, sourcePokemon: string): PlayerProgress | null {
  if (!progress.unlockedAllies.includes(allyId)) {
    return null;
  }
  // Evolutions are permanent: once an ally has committed to a form it can't be
  // re-rolled into a different one.
  if (progress.evolutionChoices[allyId]) {
    return null;
  }
  const choices = evolutionChoicesFor(allyId, levelOf(progress, allyId));
  const choice = choices.find((entry) => entry.sourcePokemon === sourcePokemon);
  if (!choice) {
    return null;
  }
  let next = progress;
  // Stone evolutions consume one matching stone from the inventory.
  if (choice.requiresStone) {
    if (itemCount(progress, choice.requiresStone) < 1) {
      return null;
    }
    next = addItem(next, choice.requiresStone, -1);
  }
  return {
    ...next,
    evolutionChoices: { ...next.evolutionChoices, [allyId]: sourcePokemon },
  };
}

export function stageClearReward(stage: number, bestStage: number): number {
  const firstClearBonus = stage > bestStage ? 60 : 0;
  return 40 + 20 * stage + firstClearBonus;
}

// Evolution stones, in the order milestone clears hand them out.
const STONE_REWARD_CYCLE = ["fire-stone", "water-stone", "thunder-stone", "leaf-stone", "moon-stone"];

// Every fifth stage, the first time it's cleared, awards one evolution stone —
// cycling through the set so the whole roster's stone forms are reachable from
// the Battle Streak ladder alone. Returns null on non-milestone or repeat clears.
export function stageClearStoneReward(stage: number, bestStage: number): string | null {
  if (stage <= bestStage || stage % 5 !== 0) {
    return null;
  }
  return STONE_REWARD_CYCLE[(stage / 5 - 1) % STONE_REWARD_CYCLE.length];
}

export function applyStageClear(progress: PlayerProgress, stage: number): PlayerProgress {
  let next: PlayerProgress = {
    ...progress,
    gems: progress.gems + stageClearReward(stage, progress.bestStage),
    bestStage: Math.max(progress.bestStage, stage),
  };
  const stone = stageClearStoneReward(stage, progress.bestStage);
  if (stone) {
    next = addItem(next, stone, 1);
  }
  return next;
}

export type CaptureOutcome = {
  progress: PlayerProgress;
  result: "unlocked" | "leveled" | "maxed";
};

// Capturing a wild creature is the exploration counterpart of a gacha pull:
// new species join the roster, duplicates level up, capped dupes pay gems.
export function applyCapture(progress: PlayerProgress, allyId: string): CaptureOutcome {
  if (!progress.unlockedAllies.includes(allyId)) {
    return {
      progress: { ...progress, unlockedAllies: [...progress.unlockedAllies, allyId] },
      result: "unlocked",
    };
  }
  const level = levelOf(progress, allyId);
  if (level >= BALANCE.maxAllyLevel) {
    return { progress: { ...progress, gems: progress.gems + 25 }, result: "maxed" };
  }
  return {
    progress: { ...progress, allyLevels: { ...progress.allyLevels, [allyId]: level + 1 } },
    result: "leveled",
  };
}

export function wildVictoryReward(level: number): number {
  return 25 + 8 * Math.max(1, level);
}

export function dailyChallengeReward(progress: PlayerProgress, dateKey: string): number {
  return progress.dailyClearedDate === dateKey ? 0 : DAILY_CHALLENGE_REWARD;
}

export function applyDailyChallengeClear(progress: PlayerProgress, dateKey: string): PlayerProgress {
  const reward = dailyChallengeReward(progress, dateKey);
  if (reward === 0) {
    return progress;
  }
  return {
    ...progress,
    gems: progress.gems + reward,
    dailyClearedDate: dateKey,
  };
}
