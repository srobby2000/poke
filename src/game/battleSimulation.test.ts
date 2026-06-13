import { describe, expect, it } from "vitest";
import { simulateAutoBattle } from "./battleSimulation";

describe("battle balance simulation", () => {
  it("lets the starter team clear the first rival battle", () => {
    const result = simulateAutoBattle({ seed: 11, stage: 1 });

    expect(result.status).toBe("won");
    expect(result.elapsed).toBeLessThan(60);
    expect(result.alliesAlive).toBeGreaterThan(0);
  });

  it("lets a trained team with bag support clear the first boss stage", () => {
    const result = simulateAutoBattle({
      seed: 17,
      stage: 5,
      allyIds: ["squirtle", "bulbasaur", "charmander"],
      allyLevels: { squirtle: 6, bulbasaur: 6, charmander: 6 },
      items: { "potion-item": 3 },
    });

    expect(result.status).toBe("won");
    expect(result.elapsed).toBeLessThan(120);
  });

  it("keeps late stages out of reach for an untrained starter team", () => {
    const result = simulateAutoBattle({ seed: 23, stage: 12, maxSeconds: 120 });

    expect(result.status).not.toBe("won");
  });
});
