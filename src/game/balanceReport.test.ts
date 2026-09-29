import { describe, expect, it } from "vitest";
import { buildBalanceReport, formatBalanceReport } from "./balanceReport";

describe("balance report", () => {
  const rows = buildBalanceReport(60);
  const row = (label: string) => rows.find(r => r.label === label)!;

  it("keeps the turn-based difficulty curve where it was tuned", () => {
    // A thoughtful player clears the opening and even stages; falling behind a level hurts.
    expect(row("Starter intro").winRate.smart).toBeGreaterThanOrEqual(0.8);
    expect(row("Starter intro").winRate.casual).toBeGreaterThanOrEqual(0.5);
    expect(row("Even stage").winRate.smart).toBeGreaterThanOrEqual(0.85);
    expect(row("One level behind").winRate.smart).toBeLessThan(row("Even stage").winRate.smart);
    expect(row("First boss ready").winRate.smart).toBeGreaterThanOrEqual(0.8);
    expect(row("Late wall").winRate.smart).toBeLessThanOrEqual(0.05);
    // Battles take several turns rather than ending in one exchange.
    expect(row("Even stage").turns).toBeGreaterThanOrEqual(4);
  });

  it("formats rows for quick tuning reads", () => {
    expect(formatBalanceReport(rows)).toContain("Starter intro: stage 1");
  });
});
