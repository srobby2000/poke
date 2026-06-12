import { Suspense, lazy, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { BattleHud } from "./components/BattleHud";
import { ShopScreen } from "./components/ShopScreen";
import { TeamSelect } from "./components/TeamSelect";
import { WorldScreen } from "./components/WorldScreen";
import type { BattleMode, BattleState, PokemonBaseStats } from "./game/battleState";
import { battleReducer, createInitialBattleState, dailyChallengeKey, dailyChallengeStage, isAlive, speciesNames, tickBattle } from "./game/battleState";
import type { AchievementDef, BattleSummary } from "./game/achievements";
import { evaluateAchievements } from "./game/achievements";
import type { PullResult } from "./game/gacha";
import {
  DAILY_CHALLENGE_REWARD,
  applyDailyChallengeClear,
  applyStageClear,
  performLevelUp,
  performMultiPull,
  performPull,
} from "./game/gacha";
import { ITEMS, pickBerry, pickedBerryTiles } from "./game/items";
import { fetchSpeciesStats } from "./game/pokeApi";
import { loadProgress, saveProgress } from "./game/progress";
import { buyItem, sellItem } from "./game/shop";
import { playFeedbackSound, playKoSound } from "./game/sound";

// Game logic runs at a fixed 30Hz instead of once per animation frame, so the
// React tree re-renders at most 30 times per second. Purely visual motion
// (idle float, camera) still animates at full frame rate inside the canvas.
const LOGIC_STEP_SECONDS = 1 / 30;
const MAX_DELTA_SECONDS = 0.08;

// The 3D canvas (and the ~1MB three.js chunk behind it) loads lazily so the
// team-select screen paints immediately; preloadCanvas() starts the download
// in the background while the player is still picking a team.
const preloadCanvas = () => import("./components/BattleCanvas");
const BattleCanvas = lazy(() => preloadCanvas().then((module) => ({ default: module.BattleCanvas })));

type Session = { allyIds: string[]; stage: number; runId: number; battleMode: BattleMode; dailyKey?: string };

export default function App() {
  const [speciesStats, setSpeciesStats] = useState<Record<string, PokemonBaseStats> | null>(null);
  const [progress, setProgress] = useState(loadProgress);
  const [lastPulls, setLastPulls] = useState<PullResult[] | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<"world" | "hub" | "shop">("world");
  const todayKey = dailyChallengeKey();

  const savePosition = useCallback((position: { x: number; z: number }) => {
    setProgress((current) => ({ ...current, worldPosition: position }));
  }, []);
  // Seeded lazily in the pull handler — impure calls are not allowed in render.
  const pullSeedRef = useRef<number | null>(null);

  const nextPullSeed = () => pullSeedRef.current ?? (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;

  // Every progress change runs through here so achievements unlock (and pay
  // their gem rewards) regardless of which action earned them.
  const [recentAchievements, setRecentAchievements] = useState<AchievementDef[] | null>(null);
  const commitProgress = (next: Parameters<typeof evaluateAchievements>[0], battle?: BattleSummary) => {
    const { progress: evaluated, earned } = evaluateAchievements(next, battle);
    setProgress(evaluated);
    if (earned.length > 0) {
      setRecentAchievements(earned);
      playFeedbackSound("unity");
    }
  };

  const registerPullResults = (results: PullResult[]) => {
    setLastPulls(results);
    const bestNew = results.filter((result) => result.isNew).sort((left, right) => right.rarity - left.rarity)[0];
    if (bestNew?.rarity === 5) {
      playFeedbackSound("sync");
    } else if (bestNew) {
      playFeedbackSound("super");
    } else {
      playFeedbackSound("damage");
    }
  };

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    let cancelled = false;
    void preloadCanvas();
    fetchSpeciesStats(speciesNames)
      .then((stats) => {
        if (!cancelled) {
          setSpeciesStats(stats);
        }
      })
      .catch(() => {
        // Offline or API down — bundled stats are identical, so play continues.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!session && screen === "world") {
    return (
      <WorldScreen
        progress={progress}
        pickedBerries={pickedBerryTiles(progress, todayKey)}
        onSavePosition={savePosition}
        onEnterBuilding={(building) => {
          if (building === "arena") {
            setScreen("hub");
          } else if (building === "shop") {
            setScreen("shop");
          }
        }}
        onPickBerry={(tileKey) => {
          const result = pickBerry(progress, tileKey, todayKey);
          if (!result) {
            return "This tree was already picked today. It will regrow tomorrow!";
          }
          commitProgress(result.progress);
          const item = ITEMS[result.itemId];
          return `You picked ${result.quantity} × ${item?.name ?? result.itemId}! Sell them at the shop.`;
        }}
      />
    );
  }

  if (!session && screen === "shop") {
    return (
      <ShopScreen
        progress={progress}
        onBack={() => setScreen("world")}
        onBuy={(itemId) => {
          const next = buyItem(progress, itemId);
          if (next) {
            commitProgress(next);
          }
        }}
        onSell={(itemId) => {
          const next = sellItem(progress, itemId);
          if (next) {
            commitProgress(next);
          }
        }}
      />
    );
  }

  if (!session) {
    return (
      <TeamSelect
        progress={progress}
        lastPulls={lastPulls}
        onBack={() => setScreen("world")}
        recentAchievements={recentAchievements}
        statsSource={speciesStats ? "live" : "bundled"}
        speciesStats={speciesStats}
        dailyKey={todayKey}
        dailyReward={DAILY_CHALLENGE_REWARD}
        dailyCleared={progress.dailyClearedDate === todayKey}
        onStart={(allyIds) => setSession({ allyIds, stage: 1, runId: 1, battleMode: "ladder" })}
        onStartDaily={(allyIds) =>
          setSession({ allyIds, stage: dailyChallengeStage(todayKey), runId: 1, battleMode: "daily", dailyKey: todayKey })
        }
        onPull={() => {
          const outcome = performPull(progress, nextPullSeed());
          if (!outcome) {
            return;
          }
          pullSeedRef.current = outcome.nextSeed;
          commitProgress(outcome.progress);
          registerPullResults([outcome.result]);
        }}
        onMultiPull={() => {
          const outcome = performMultiPull(progress, nextPullSeed());
          if (!outcome) {
            return;
          }
          pullSeedRef.current = outcome.nextSeed;
          commitProgress(outcome.progress);
          registerPullResults(outcome.results);
        }}
        onLevelUp={(allyId) => {
          const next = performLevelUp(progress, allyId);
          if (next) {
            commitProgress(next);
          }
        }}
      />
    );
  }

  return (
    <Battle
      key={`${session.runId}-${session.battleMode}-${session.stage}-${session.dailyKey ?? "ladder"}`}
      allyIds={session.allyIds}
      stage={session.stage}
      battleMode={session.battleMode}
      dailyKey={session.dailyKey}
      speciesStats={speciesStats}
      allyLevels={progress.allyLevels}
      onBattleCleared={(summary) => {
        const rewarded =
          session.battleMode === "daily" && session.dailyKey
            ? applyDailyChallengeClear(progress, session.dailyKey)
            : applyStageClear(progress, session.stage);
        commitProgress(rewarded, summary);
      }}
      onNextStage={
        session.battleMode === "daily"
          ? undefined
          : () => setSession((current) => current && { ...current, stage: current.stage + 1, runId: current.runId + 1 })
      }
      onRetry={() => setSession((current) => current && { ...current, runId: current.runId + 1 })}
      onChangeTeam={() => setSession(null)}
    />
  );
}

type BattleProps = {
  allyIds: string[];
  stage: number;
  battleMode: BattleMode;
  dailyKey?: string;
  speciesStats: Record<string, PokemonBaseStats> | null;
  allyLevels: Record<string, number>;
  onBattleCleared: (summary: BattleSummary) => void;
  onNextStage?: () => void;
  onRetry: () => void;
  onChangeTeam: () => void;
};

function Battle({ allyIds, stage, battleMode, dailyKey, speciesStats, allyLevels, onBattleCleared, onNextStage, onRetry, onChangeTeam }: BattleProps) {
  const [battle, dispatch] = useReducer(battleReducer, undefined, () =>
    createInitialBattleState(undefined, { allyIds, stage, battleMode, dailyKey, speciesStats: speciesStats ?? undefined, allyLevels }),
  );

  useBattleSounds(battle);

  const battleRef = useRef(battle);
  useEffect(() => {
    battleRef.current = battle;
  }, [battle]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const current = battleRef.current;
      const key = event.key.toLowerCase();

      if (key === "p") {
        dispatch({ type: "togglePause" });
        return;
      }
      if (key === "f") {
        dispatch({ type: "cycleTimeScale" });
        return;
      }
      if (current.status !== "playing" || current.paused) {
        return;
      }

      const allies = current.units.filter((unit) => unit.team === "ally");
      const selectedAlly = allies.find((unit) => unit.id === current.selectedAllyId);

      if (key === "1" || key === "2" || key === "3") {
        const move = selectedAlly?.moves[Number(key) - 1];
        if (move) {
          dispatch({ type: "useMove", moveId: move.id });
        }
      } else if (key === "q" || key === "w" || key === "e") {
        const ally = allies[{ q: 0, w: 1, e: 2 }[key]];
        if (ally) {
          dispatch({ type: "selectAlly", unitId: ally.id });
        }
      } else if (key === " ") {
        event.preventDefault();
        dispatch({ type: "useSyncMove" });
      } else if (key === "t") {
        dispatch({ type: "useTrainerMove" });
      } else if (key === "u") {
        dispatch({ type: "useUnityAttack" });
      } else if (key === "m") {
        dispatch({ type: "setTargetMode", mode: current.targetMode === "auto" ? "manual" : "auto" });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let last = performance.now();
    let accumulated = 0;
    let frame = 0;

    const run = (now: number) => {
      accumulated += Math.min((now - last) / 1000, MAX_DELTA_SECONDS);
      last = now;
      if (accumulated >= LOGIC_STEP_SECONDS) {
        dispatch(tickBattle(Math.min(accumulated, MAX_DELTA_SECONDS)));
        accumulated = 0;
      }
      frame = requestAnimationFrame(run);
    };

    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Gems and best-stage are awarded exactly once per battle, even though the
  // status stays "won" and the callback identity changes across renders.
  const won = battle.status === "won";
  const rewardedRef = useRef(false);
  useEffect(() => {
    if (won && !rewardedRef.current) {
      rewardedRef.current = true;
      const allies = battleRef.current.units.filter((unit) => unit.team === "ally");
      onBattleCleared({
        won: true,
        alliesAlive: allies.filter(isAlive).length,
        alliesTotal: allies.length,
      });
    }
  }, [won, onBattleCleared]);

  return (
    <main className="app-shell">
      <Suspense fallback={<div className="canvas-loading">Loading arena…</div>}>
        <BattleCanvas state={battle} dispatch={dispatch} />
      </Suspense>
      <BattleHud
        state={battle}
        dispatch={dispatch}
        onNextStage={onNextStage}
        onRetry={onRetry}
        onChangeTeam={onChangeTeam}
      />
    </main>
  );
}

// Plays a sound for each new feedback entry and for KOs, by diffing state.
function useBattleSounds(state: BattleState) {
  const seenFeedback = useRef<Set<string>>(new Set());
  const aliveById = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    for (const entry of state.feedback) {
      if (!seenFeedback.current.has(entry.id)) {
        seenFeedback.current.add(entry.id);
        playFeedbackSound(entry.kind);
      }
    }
    for (const unit of state.units) {
      const wasAlive = aliveById.current.get(unit.id);
      const aliveNow = isAlive(unit);
      if (wasAlive === true && !aliveNow) {
        playKoSound();
      }
      aliveById.current.set(unit.id, aliveNow);
    }
  }, [state]);
}
