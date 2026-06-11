import { useEffect, useReducer, useState } from "react";
import { BattleCanvas } from "./components/BattleCanvas";
import { BattleHud } from "./components/BattleHud";
import { TeamSelect } from "./components/TeamSelect";
import type { PokemonBaseStats } from "./game/battleState";
import { battleReducer, createInitialBattleState, speciesNames, tickBattle } from "./game/battleState";
import { fetchSpeciesStats } from "./game/pokeApi";
import { loadBestStage, saveBestStage } from "./game/progress";

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
