import { describe, expect, it } from "vitest";
import { speciesNames } from "./battleState";
import { POKEMON_MODELS } from "./pokemonModels";

describe("Kanto model coverage", () => {
  it("has all 151 unique National Pokédex slots in order", () => {
    const models = Object.values(POKEMON_MODELS);
    expect(models).toHaveLength(151);
    expect(models.map(model => model.number)).toEqual(Array.from({ length: 151 }, (_, i) => i + 1));
    expect(POKEMON_MODELS.bulbasaur.number).toBe(1);
    expect(POKEMON_MODELS['nidoran-f'].number).toBe(29);
    expect(POKEMON_MODELS['mr-mime'].number).toBe(122);
    expect(POKEMON_MODELS.mew.number).toBe(151);
  });
  it("covers every playable species and evolution with a valid palette", () => {
    for (const species of speciesNames) {
      expect(POKEMON_MODELS[species], species).toBeDefined();
      expect(POKEMON_MODELS[species].color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

it("bundles positive Pokédex heights for all 151 models", () => {
  expect(Object.values(POKEMON_MODELS).every(model => Number.isFinite(model.heightM) && model.heightM > 0)).toBe(true);
  expect(POKEMON_MODELS.squirtle.heightM).toBe(0.5);
  expect(POKEMON_MODELS.lapras.heightM).toBe(2.5);
  expect(POKEMON_MODELS.onix.heightM).toBe(8.8);
});
