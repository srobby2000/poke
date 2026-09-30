import { expect, it } from "vitest";
import { ARENAS, lobbyArena } from "./battleArenas";
import { MAPS } from "./maps";

it("tours every arena on the ladder, starting in the stadium", () => {
  const tour = Array.from({ length: 6 }, (_, i) => lobbyArena("ladder", i + 1));
  expect(tour[0]).toBe("stadium");
  expect(new Set(tour)).toEqual(new Set(Object.keys(ARENAS)));
  expect(lobbyArena("ladder", 7)).toBe("stadium");
});

it("keeps the daily arena fixed for a day", () => {
  expect(lobbyArena("daily", 5, "2026-09-30")).toBe(lobbyArena("daily", 9, "2026-09-30"));
  expect(Object.keys(ARENAS)).toContain(lobbyArena("daily", 1, "2026-10-01"));
});

it("gives every map and trainer a known arena: grass, forest and cave in the world", () => {
  expect(MAPS.village.battleArena).toBe("grass");
  expect(MAPS.route2.battleArena).toBe("forest");
  for (const map of Object.values(MAPS)) {
    expect(ARENAS[map.battleArena], map.id).toBeDefined();
    for (const trainer of Object.values(map.trainers)) if (trainer.arena) expect(ARENAS[trainer.arena], trainer.id).toBeDefined();
  }
  expect(Object.values(MAPS).filter(map => map.dungeon).every(map => map.battleArena === "cave")).toBe(true);
});
