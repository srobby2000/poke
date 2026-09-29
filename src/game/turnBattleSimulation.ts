import type { BattleConfig } from "./battleState";
import type { TurnBattleState, TurnCommand } from "./turnBattle";
import { activeUnit, canUse, chooseCommand, createTurnBattle, partyOf, turnBattleReducer } from "./turnBattle";

/** How the simulated player chooses: `smart` picks the best move and heals when low,
 * `casual` picks a random move, `naive` always uses its first move. */
export type SimPolicy = "smart" | "casual" | "naive";
export type TurnSimResult = { status: TurnBattleState["status"]; turns: number; alliesLeft: number; state: TurnBattleState };

const MAX_TURNS = 200;

function policyCommand(state: TurnBattleState, policy: SimPolicy, roll: number): TurnCommand {
  if (state.phase === "forcedSwitch") {
    const next = partyOf(state, "ally").find(u => u.hp > 0 && u.id !== state.active.ally)!;
    return { type: "switch", unitId: next.id };
  }
  const ally = activeUnit(state, "ally");
  if (policy === "smart") {
    for (const itemId of ["super-potion-item", "potion-item"]) {
      if (ally.hp / ally.maxHp < 0.3 && canUse(state, { type: "item", itemId })) return { type: "item", itemId };
    }
    return chooseCommand(state, "ally");
  }
  if (policy === "casual") return { type: "fight", moveId: ally.moves[Math.floor(roll * ally.moves.length) % ally.moves.length].id };
  return { type: "fight", moveId: ally.moves[0].id };
}

export function simulateTurnBattle(config: Partial<BattleConfig> & { seed?: number }, policy: SimPolicy = "smart"): TurnSimResult {
  let state = createTurnBattle(config.seed ?? 1, config);
  let seed = (config.seed ?? 1) ^ 0x9e3779b9;
  for (let i = 0; i < MAX_TURNS && state.status === "playing"; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const next = turnBattleReducer(state, { type: "command", command: policyCommand(state, policy, seed / 0x100000000) });
    // A rejected command (nothing usable) would loop forever; fall back to the first move.
    state = next === state ? turnBattleReducer(state, { type: "command", command: { type: "fight", moveId: activeUnit(state, "ally").moves[0].id } }) : next;
  }
  return { status: state.status, turns: state.turn, alliesLeft: partyOf(state, "ally").filter(u => u.hp > 0).length, state };
}

/** Win rate and average length over many seeds. */
export function turnWinRate(config: Partial<BattleConfig>, policy: SimPolicy, runs = 200) {
  let wins = 0, turns = 0, alliesLeft = 0;
  for (let i = 0; i < runs; i++) {
    const result = simulateTurnBattle({ ...config, seed: 1000 + i * 7919 }, policy);
    if (result.status === "won") wins++;
    turns += result.turns; alliesLeft += result.alliesLeft;
  }
  return { winRate: wins / runs, turns: turns / runs, alliesLeft: alliesLeft / runs };
}
