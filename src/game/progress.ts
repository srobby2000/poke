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
  inventory: Record<string, number>;
  berryPicks: { date: string; picked: string[] };
  captures: number;
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
    inventory: {},
    berryPicks: { date: "", picked: [] },
    captures: 0,
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
      inventory:
        parsed.inventory && typeof parsed.inventory === "object"
          ? Object.fromEntries(
              Object.entries(parsed.inventory).filter(
                (entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0,
              ),
            )
          : {},
      berryPicks:
        parsed.berryPicks && typeof parsed.berryPicks.date === "string" && Array.isArray(parsed.berryPicks.picked)
          ? {
              date: parsed.berryPicks.date,
              picked: parsed.berryPicks.picked.filter((key): key is string => typeof key === "string"),
            }
          : { date: "", picked: [] },
      captures: typeof parsed.captures === "number" && parsed.captures > 0 ? Math.floor(parsed.captures) : 0,
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
