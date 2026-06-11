const PROGRESS_KEY = "creature-masters-progress-v1";

export function loadBestStage(): number {
  try {
    const raw = globalThis.localStorage?.getItem(PROGRESS_KEY);
    if (!raw) {
      return 0;
    }
    const parsed = JSON.parse(raw) as { bestStage?: number };
    return typeof parsed.bestStage === "number" && parsed.bestStage > 0 ? Math.floor(parsed.bestStage) : 0;
  } catch {
    return 0;
  }
}

export function saveBestStage(stage: number) {
  try {
    if (stage > loadBestStage()) {
      globalThis.localStorage?.setItem(PROGRESS_KEY, JSON.stringify({ bestStage: Math.floor(stage) }));
    }
  } catch {
    // Storage unavailable (private browsing, etc.) — progress just won't persist.
  }
}
