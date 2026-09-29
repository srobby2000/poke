import type { SimPolicy } from "./turnBattleSimulation";
import { turnWinRate } from "./turnBattleSimulation";

export type BalanceReportRow = {
  label: string;
  stage: number;
  teamLevel: number;
  items: Record<string, number>;
  /** Share of seeded battles won, per player style. */
  winRate: Record<SimPolicy, number>;
  turns: number;
};

const SCENARIOS = [
  { label: "Starter intro", stage: 1, teamLevel: 1, items: {} },
  { label: "Even stage", stage: 3, teamLevel: 3, items: {} },
  { label: "One level behind", stage: 3, teamLevel: 2, items: {} },
  { label: "First boss ready", stage: 5, teamLevel: 6, items: { "potion-item": 2, "super-potion-item": 1 } },
  { label: "Late wall", stage: 12, teamLevel: 1, items: {} },
] as const;

const TEAM = ["squirtle", "bulbasaur", "charmander"];

export function buildBalanceReport(runs = 80): BalanceReportRow[] {
  return SCENARIOS.map(scenario => {
    const config = { stage: scenario.stage, allyIds: TEAM, allyLevels: Object.fromEntries(TEAM.map(id => [id, scenario.teamLevel])), items: { ...scenario.items } };
    const smart = turnWinRate(config, "smart", runs);
    return {
      label: scenario.label,
      stage: scenario.stage,
      teamLevel: scenario.teamLevel,
      items: scenario.items,
      winRate: { smart: smart.winRate, casual: turnWinRate(config, "casual", runs).winRate, naive: turnWinRate(config, "naive", runs).winRate },
      turns: Number(smart.turns.toFixed(1)),
    };
  });
}

const percent = (value: number) => `${Math.round(value * 100)}%`;
export function formatBalanceReport(rows = buildBalanceReport()) {
  return rows
    .map(row => `${row.label}: stage ${row.stage}, Lv ${row.teamLevel}, smart ${percent(row.winRate.smart)}, casual ${percent(row.winRate.casual)}, naive ${percent(row.winRate.naive)}, ${row.turns} turns`)
    .join("\n");
}
