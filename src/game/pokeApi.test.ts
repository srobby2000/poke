import { describe, expect, it } from "vitest";
import { mapPokeApiDetail, mapPokeApiSprite, mapPokeApiStats } from "./pokeApi";

const payloadFor = (stats: Record<string, number>) => ({
  stats: Object.entries(stats).map(([name, base_stat]) => ({ base_stat, stat: { name } })),
});

describe("pokeApi stat mapping", () => {
  it("maps hp, defense, and speed directly", () => {
    const mapped = mapPokeApiStats(
      payloadFor({ hp: 44, attack: 48, defense: 65, "special-attack": 50, "special-defense": 64, speed: 43 }),
    );

    expect(mapped.hp).toBe(44);
    expect(mapped.defense).toBe(65);
    expect(mapped.speed).toBe(43);
  });

  it("uses the better of attack and special-attack as the offensive stat", () => {
    const physical = mapPokeApiStats(
      payloadFor({ hp: 70, attack: 80, defense: 50, "special-attack": 35, "special-defense": 35, speed: 35 }),
    );
    const special = mapPokeApiStats(
      payloadFor({ hp: 25, attack: 20, defense: 15, "special-attack": 105, "special-defense": 55, speed: 90 }),
    );

    expect(physical.attack).toBe(80);
    expect(special.attack).toBe(105);
  });

  it("defaults missing stats to zero instead of crashing", () => {
    const mapped = mapPokeApiStats(payloadFor({ hp: 50 }));

    expect(mapped).toEqual({ hp: 50, attack: 0, defense: 0, speed: 0 });
  });
});

describe("pokeApi sprite + detail mapping", () => {
  it("prefers official artwork, then the default sprite", () => {
    expect(
      mapPokeApiSprite({
        stats: [],
        sprites: { front_default: "classic.png", other: { "official-artwork": { front_default: "art.png" } } },
      }),
    ).toBe("art.png");
    expect(mapPokeApiSprite({ stats: [], sprites: { front_default: "classic.png" } })).toBe("classic.png");
    expect(mapPokeApiSprite({ stats: [] })).toBeNull();
  });

  it("maps detail with unit conversions and cleaned flavor text", () => {
    const detail = mapPokeApiDetail(
      { stats: [], height: 7, weight: 90, base_experience: 142 },
      {
        capture_rate: 45,
        growth_rate: { name: "medium-slow" },
        habitat: { name: "mountain" },
        genera: [
          { genus: "Flame Pokémon", language: { name: "en" } },
          { genus: "Feu", language: { name: "fr" } },
        ],
        flavor_text_entries: [{ flavor_text: "Spits\nfire that\fis hot.", language: { name: "en" } }],
      },
    );

    expect(detail.heightM).toBeCloseTo(0.7);
    expect(detail.weightKg).toBeCloseTo(9);
    expect(detail.baseExperience).toBe(142);
    expect(detail.captureRate).toBe(45);
    expect(detail.growthRate).toBe("medium-slow");
    expect(detail.habitat).toBe("mountain");
    expect(detail.genus).toBe("Flame Pokémon");
    expect(detail.flavorText).toBe("Spits fire that is hot.");
  });
});
