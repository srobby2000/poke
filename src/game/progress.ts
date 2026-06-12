import { DEFAULT_ALLY_IDS } from "./battleState";

const SAVE_KEY = "creature-masters-save-v1";
const LEGACY_PROGRESS_KEY = "creature-masters-progress-v1";

export type PlayerProgress = {
  bestStage: number;
  gems: number;
  unlockedAllies: string[];
  allyLevels: Record<string, number>;
  dailyClearedDate: string | null;
  achievements: string[];
  worldPosition: { x: number; z: number } | null;
};

export function defaultProgress(): PlayerProgress {
  return {
    bestStage: legacyBestStage(),
    gems: 200,
    unlockedAllies: [...DEFAULT_ALLY_IDS],
    allyLevels: {},
    dailyClearedDate: null,
    achievements: [],
    worldPosition: null,
  };
}

// Best stage saved by versions that predate the full save file.
function legacyBestStage(): number {
  try {
    const raw = globalThis.localStorage?.getItem(LEGACY_PROGRESS_KEY);
    if (!raw) {
      return 0;
    }
    const parsed = JSON.parse(raw) as { bestStage?: number };
    return typeof parsed.bestStage === "number" && parsed.bestStage > 0 ? Math.floor(parsed.bestStage) : 0;
  } catch {
    return 0;
  }
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = globalThis.localStorage?.getItem(SAVE_KEY);
    if (!raw) {
      return defaultProgress();
    }
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      bestStage: typeof parsed.bestStage === "number" && parsed.bestStage > 0 ? Math.floor(parsed.bestStage) : 0,
      gems: typeof parsed.gems === "number" && parsed.gems >= 0 ? Math.floor(parsed.gems) : 0,
      unlockedAllies:
        Array.isArray(parsed.unlockedAllies) && parsed.unlockedAllies.length > 0
          ? parsed.unlockedAllies.filter((id): id is string => typeof id === "string")
          : [...DEFAULT_ALLY_IDS],
      allyLevels: parsed.allyLevels && typeof parsed.allyLevels === "object" ? parsed.allyLevels : {},
      dailyClearedDate: typeof parsed.dailyClearedDate === "string" ? parsed.dailyClearedDate : null,
      achievements: Array.isArray(parsed.achievements)
        ? parsed.achievements.filter((id): id is string => typeof id === "string")
        : [],
      worldPosition:
        parsed.worldPosition && typeof parsed.worldPosition.x === "number" && typeof parsed.worldPosition.z === "number"
          ? { x: parsed.worldPosition.x, z: parsed.worldPosition.z }
          : null,
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: PlayerProgress) {
  try {
    globalThis.localStorage?.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // Storage unavailable (private browsing, etc.) — progress just won't persist.
  }
}
