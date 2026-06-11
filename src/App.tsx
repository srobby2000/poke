import { useEffect, useReducer } from "react";
import { BattleCanvas } from "./components/BattleCanvas";
import { BattleHud } from "./components/BattleHud";
import { battleReducer, createInitialBattleState, tickBattle } from "./game/battleState";

// Game logic runs at a fixed 30Hz instead of once per animation frame, so the
// React tree re-renders at most 30 times per second. Purely visual motion
// (idle float, camera) still animates at full frame rate inside the canvas.
const LOGIC_STEP_SECONDS = 1 / 30;
const MAX_DELTA_SECONDS = 0.08;

export default function App() {
  const [battle, dispatch] = useReducer(battleReducer, undefined, () => createInitialBattleState());

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

  return (
    <main className="app-shell">
      <BattleCanvas state={battle} dispatch={dispatch} />
      <BattleHud state={battle} dispatch={dispatch} />
    </main>
  );
}
