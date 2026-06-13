import { describe, expect, it } from "vitest";
import { buildBalanceReport, formatBalanceReport } from "./balanceReport";

describe("balance report", () => {
  it("summarizes deterministic milestone scenarios", () => {
    const rows = buildBalanceReport();

    expect(rows.map((row) => row.label)).toEqual(["Starter intro", "First boss ready", "Late wall"]);
    expect(rows[0].status).toBe("won");
    expect(rows[1].status).toBe("won");
    expect(rows[2].status).not.toBe("won");
  });

  it("formats rows for quick tuning reads", () => {
    expect(formatBalanceReport(buildBalanceReport())).toContain("Starter intro: stage 1");
  });
});
