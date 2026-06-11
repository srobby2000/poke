import { useEffect, useReducer, useRef, useState } from "react";
import { BattleCanvas } from "./components/BattleCanvas";
import { BattleHud } from "./components/BattleHud";
import { TeamSelect } from "./components/TeamSelect";
import type { BattleState, PokemonBaseStats } from "./game/battleState";
import { battleReducer, createInitialBattleState, isAlive, speciesNames, tickBattle } from "./game/battleState";
import { fetchSpeciesStats } from "./game/pokeApi";
import { loadBestStage, saveBestStage } from "./game/progress";
import { playFeedbackSound, playKoSound } from "./game/sound";

// Game logic runs at a fixed 30Hz instead of once per animation frame, so the
// React tree re-renders at most 30 times per second. Purely visual motion
// (idle float, camera) still animates at full frame rate inside the canvas.
const LOGIC_STEP_SECONDS = 1 / 30;
const MAX_DELTA_SECONDS = 0.08;

type Session = { allyIds: string[]; stage: number; runId: number };

export default function App() {
  const [speciesStats, setSpeciesStats] = useState<Record<string, PokemonBaseStats> | null>(null);
  const [bestStage, setBestStage] = useState(loadBestStage);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
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

  if (!session) {
    return (
      <TeamSelect
        bestStage={bestStage}
        statsSource={speciesStats ? "live" : "bundled"}
        speciesStats={speciesStats}
        onStart={(allyIds) => setSession({ allyIds, stage: 1, runId: 1 })}
      />
    );
  }

  return (
    <Battle
      key={`${session.runId}-${session.stage}`}
      allyIds={session.allyIds}
      stage={session.stage}
      speciesStats={speciesStats}
      onStageCleared={(stage) => {
        saveBestStage(stage);
        setBestStage((best) => Math.max(best, stage));
      }}
      onNextStage={() => setSession((current) => current && { ...current, stage: current.stage + 1, runId: current.runId + 1 })}
      onRetry={() => setSession((current) => current && { ...current, runId: current.runId + 1 })}
      onChangeTeam={() => setSession(null)}
    />
  );
}

type BattleProps = {
  allyIds: string[];
  stage: number;
  speciesStats: Record<string, PokemonBaseStats> | null;
  onStageCleared: (stage: number) => void;
  onNextStage: () => void;
  onRetry: () => void;
  onChangeTeam: () => void;
};

function Battle({ allyIds, stage, speciesStats, onStageCleared, onNextStage, onRetry, onChangeTeam }: BattleProps) {
  const [battle, dispatch] = useReducer(battleReducer, undefined, () =>
    createInitialBattleState(undefined, { allyIds, stage, speciesStats: speciesStats ?? undefined }),
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

  const won = battle.status === "won";
  useEffect(() => {
    if (won) {
      onStageCleared(stage);
    }
  }, [won, stage, onStageCleared]);

  return (
    <main className="app-shell">
      <BattleCanvas state={battle} dispatch={dispatch} />
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
