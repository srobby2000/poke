import { simulateAutoBattle } from "./battleSimulation";

export type BalanceReportRow = {
  label: string;
  stage: number;
  teamLevel: number;
  items: Record<string, number>;
  status: string;
  elapsed: number;
  alliesAlive: number;
};

const SCENARIOS = [
  { label: "Starter intro", stage: 1, teamLevel: 1, items: {} },
  { label: "First boss ready", stage: 5, teamLevel: 6, items: { "potion-item": 2, "super-potion-item": 1 } },
  { label: "Late wall", stage: 12, teamLevel: 1, items: {} },
] as const;

export function buildBalanceReport(): BalanceReportRow[] {
  return SCENARIOS.map((scenario, index) => {
    const result = simulateAutoBattle({
      seed: 100 + index,
      stage: scenario.stage,
      allyLevels: {
        squirtle: scenario.teamLevel,
        bulbasaur: scenario.teamLevel,
        charmander: scenario.teamLevel,
      },
      items: scenario.items,
    });

    return {
      label: scenario.label,
      stage: scenario.stage,
      teamLevel: scenario.teamLevel,
      items: scenario.items,
      status: result.status,
      elapsed: Number(result.elapsed.toFixed(2)),
      alliesAlive: result.alliesAlive,
    };
  });
}

export function formatBalanceReport(rows = buildBalanceReport()) {
  return rows
    .map(
      (row) =>
        `${row.label}: stage ${row.stage}, Lv ${row.teamLevel}, ${row.status}, ${row.elapsed}s, allies ${row.alliesAlive}`,
    )
    .join("\n");
}
