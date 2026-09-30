import { expect, it } from "vitest";
import { attackEffectFor, attackEffectPhase, hasFlameTrail, movementEffectFor } from "./pokemonEffects";
import { LEARNSET_MOVES } from "./moveAnimations";

it("uses the move element and distinguishes limbs, ranged attacks and self effects", () => {
  expect(attackEffectFor("tackle", "squirtle")).toMatchObject({ kind: "impact", reach: "contact", beam: false });
  expect(attackEffectFor("flamethrower", "charmander")).toMatchObject({ kind: "fire", reach: "ranged", anchor: "head", beam: true });
  expect(attackEffectFor("water-gun", "squirtle")?.kind).toBe("water");
  expect(attackEffectFor("fire-punch")?.anchor).toBe("hand");
  expect(attackEffectFor("aqua-tail", "squirtle", "water")).toMatchObject({ kind: "water", anchor: "tail", beam: false });
  expect(attackEffectFor("thunder-shock")?.kind).toBe("electric");
  expect(attackEffectFor("ice-beam")?.kind).toBe("ice");
  expect(attackEffectFor("recover")).toMatchObject({ kind: "heal", reach: "self" });
  expect(attackEffectFor("absorb")).toMatchObject({ kind: "heal", drain: true });
  expect(attackEffectFor("splash")).toBeNull();
  expect(attackEffectFor("sync-flare", "charmander")?.kind).toBe("fire");
});

it("covers the complete learnset catalog and hides effects before/after a strike", () => {
  for (const id of Object.keys(LEARNSET_MOVES)) if (id !== "splash") expect(attackEffectFor(id), id).not.toBeNull();
  for (const progress of [-1, 0, 0.24, 0.93, 1, NaN]) expect(attackEffectPhase(progress)).toBe(-1);
  expect(attackEffectPhase(0.5)).toBeGreaterThan(0);
  expect(attackEffectPhase(0.3, 2)).toBeCloseTo(attackEffectPhase(0.64, 2));
});

it("matches movement to locomotion and limits ember trails to visibly flaming species", () => {
  expect(movementEffectFor(6)?.kind).toBe("wind");
  expect(movementEffectFor(131)?.kind).toBe("water");
  expect(movementEffectFor(7)?.kind).toBe("dust");
  expect(movementEffectFor(84)?.kind).toBe("dust");
  expect(movementEffectFor(81)?.kind).toBe("electric");
  expect(movementEffectFor(88)).toBeNull();
  expect(hasFlameTrail(4)).toBe(true);
  expect(hasFlameTrail(78)).toBe(true);
  expect(hasFlameTrail(37)).toBe(false);
});
