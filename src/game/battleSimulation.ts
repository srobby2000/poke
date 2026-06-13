import type { BattleConfig, BattleState, Move, Unit } from "./battleState";
import { battleReducer, createInitialBattleState, isAlive, teamUnits, tickBattle } from "./battleState";

export type AutoBattleConfig = Partial<BattleConfig> & {
  seed?: number;
  maxSeconds?: number;
};

export type AutoBattleResult = {
  status: BattleState["status"] | "timeout";
  elapsed: number;
  alliesAlive: number;
  enemiesAlive: number;
  state: BattleState;
};

const SIM_STEP_SECONDS = 0.25;
const DEFAULT_MAX_SECONDS = 120;
const LOW_HP_ITEM_THRESHOLD = 0.45;

export function simulateAutoBattle(config: AutoBattleConfig = {}): AutoBattleResult {
  const maxSeconds = config.maxSeconds ?? DEFAULT_MAX_SECONDS;
  let state = createInitialBattleState(config.seed, config);

  while (state.status === "playing" && state.elapsed < maxSeconds) {
    state = takeAutoAction(state);
    state = battleReducer(state, tickBattle(SIM_STEP_SECONDS));
  }

  return {
    status: state.status === "playing" ? "timeout" : state.status,
    elapsed: state.elapsed,
    alliesAlive: teamUnits(state, "ally").filter(isAlive).length,
    enemiesAlive: teamUnits(state, "enemy").filter(isAlive).length,
    state,
  };
}

function takeAutoAction(state: BattleState): BattleState {
  if (shouldUseHealingItem(state)) {
    return battleReducer(state, { type: "useItem", itemId: "potion-item" });
  }
  if (state.unityGauge >= state.maxUnityGauge) {
    return battleReducer(state, { type: "useUnityAttack" });
  }

  const syncReady = teamUnits(state, "ally").find((unit) => isAlive(unit) && unit.syncCountdown === 0);
  if (syncReady) {
    state = battleReducer(state, { type: "selectAlly", unitId: syncReady.id });
    return battleReducer(state, { type: "useSyncMove" });
  }

  const moveChoice = chooseMove(state);
  if (!moveChoice) {
    return state;
  }

  state = battleReducer(state, { type: "selectAlly", unitId: moveChoice.actor.id });
  return battleReducer(state, { type: "useMove", moveId: moveChoice.move.id });
}

function shouldUseHealingItem(state: BattleState) {
  return (
    (state.items["potion-item"] ?? 0) > 0 &&
    teamUnits(state, "ally").some((unit) => isAlive(unit) && unit.hp / unit.maxHp <= LOW_HP_ITEM_THRESHOLD)
  );
}

function chooseMove(state: BattleState): { actor: Unit; move: Move } | null {
  const candidates = teamUnits(state, "ally")
    .filter(isAlive)
    .flatMap((actor) =>
      actor.moves
        .filter((move) => move.cost <= state.moveGauge)
        .map((move) => ({
          actor,
          move,
          score: move.power + (move.statusEffect ? 18 : 0) + (move.statChange ? 10 : 0) - move.cost * 4,
        })),
    );

  return candidates.sort((left, right) => right.score - left.score)[0] ?? null;
}
