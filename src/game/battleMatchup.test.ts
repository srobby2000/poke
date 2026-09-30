import { expect, it } from "vitest";
import type { Move, PokemonType, Unit } from "./battleState";
import { switchMatchup } from "./battleMatchup";

const move = (type: PokemonType, power = 40): Move => ({ id: `${type}-${power}`, name: type, type, cost: 0, power, accent: "#fff" });
const unit = (types: PokemonType[], moves: Move[]) => ({ types, moves }) as unknown as Unit;

it("calls a water Pokémon with water moves an advantage against a fire foe", () => {
  const result = switchMatchup(unit(["water"], [move("water")]), unit(["fire"], []));
  expect(result).toMatchObject({ verdict: "advantage", offense: 2, defense: 0.5, reason: "Deals ×2 · takes ×½" });
});

it("calls a grass Pokémon a disadvantage against a fire foe", () => {
  expect(switchMatchup(unit(["grass"], [move("grass")]), unit(["fire"], [])).verdict).toBe("disadvantage");
});

it("weighs what it deals against what it takes", () => {
  // Electric hits water hard; water doesn't threaten electric, so this is an advantage...
  expect(switchMatchup(unit(["electric"], [move("electric")]), unit(["water"], [])).verdict).toBe("advantage");
  // ...but fire into rock hits normally while rock hits fire super effectively.
  expect(switchMatchup(unit(["fire"], [move("fire")]), unit(["rock"], [])).verdict).toBe("disadvantage");
  // Neither side has an edge.
  expect(switchMatchup(unit(["normal"], [move("normal")]), unit(["normal"], [])).verdict).toBe("even");
});

it("counts immunity strongly and ignores status moves for offense", () => {
  const ghostFoe = unit(["ghost"], []);
  expect(switchMatchup(unit(["normal"], [move("normal")]), ghostFoe)).toMatchObject({ offense: 0, defense: 0, verdict: "even" });
  expect(switchMatchup(unit(["normal"], [move("fire", 0)]), unit(["grass"], [])).offense).toBe(1);
});
