import { describe, expect, it } from "vitest";
import { VILLAGE_MAP, encountersAt, isWalkableTile, tileAt, tileKey } from "./maps";
import type { WorldState } from "./worldState";
import { WORLD_BALANCE, createInitialWorldState, worldReducer } from "./worldState";

const tick = (state: WorldState, seconds = 1 / 30) => worldReducer(state, { type: "tick", deltaSeconds: seconds });

const tickFor = (state: WorldState, seconds: number) => {
  let current = state;
  const steps = Math.ceil(seconds * 30);
  for (let index = 0; index < steps; index += 1) {
    current = tick(current);
  }
  return current;
};

const findDoor = (building: string) => {
  const entry = Object.entries(VILLAGE_MAP.doors).find(([, meta]) => meta.building === building);
  if (!entry) {
    throw new Error(`No ${building} door in village map`);
  }
  const [x, z] = entry[0].split(",").map(Number);
  return { x, z };
};

describe("village map", () => {
  it("parses a rectangular map with a walkable spawn", () => {
    expect(VILLAGE_MAP.width).toBeGreaterThan(10);
    expect(VILLAGE_MAP.tiles).toHaveLength(VILLAGE_MAP.height);
    expect(VILLAGE_MAP.tiles.every((row) => row.length === VILLAGE_MAP.width)).toBe(true);
    expect(isWalkableTile(tileAt(VILLAGE_MAP, VILLAGE_MAP.spawn.x, VILLAGE_MAP.spawn.z))).toBe(true);
  });

  it("has arena and shop doors with approachable tiles below them", () => {
    const arena = findDoor("arena");
    const shop = findDoor("shop");

    expect(tileAt(VILLAGE_MAP, arena.x, arena.z)).toBe("door");
    expect(isWalkableTile(tileAt(VILLAGE_MAP, arena.x, arena.z + 1))).toBe(true);
    expect(isWalkableTile(tileAt(VILLAGE_MAP, shop.x, shop.z + 1))).toBe(true);
  });

  it("treats coordinates outside the map as blocked", () => {
    expect(tileAt(VILLAGE_MAP, -5, 3)).toBe("tree");
    expect(tileAt(VILLAGE_MAP, 3, 999)).toBe("tree");
  });
});

describe("world movement", () => {
  it("moves the player with held input and updates facing", () => {
    let state = createInitialWorldState();
    state = worldReducer(state, { type: "setMoveInput", x: 1, z: 0 });
    state = tickFor(state, 0.5);

    expect(state.x).toBeGreaterThan(VILLAGE_MAP.spawn.x + 1);
    expect(state.facingX).toBe(1);
    expect(state.moving).toBe(true);
  });

  it("normalizes diagonal input so it is not faster", () => {
    let straight = createInitialWorldState();
    straight = worldReducer(straight, { type: "setMoveInput", x: 1, z: 0 });
    straight = tickFor(straight, 0.4);

    let diagonal = createInitialWorldState();
    diagonal = worldReducer(diagonal, { type: "setMoveInput", x: 1, z: 1 });
    diagonal = tickFor(diagonal, 0.4);

    const straightDistance = straight.x - VILLAGE_MAP.spawn.x;
    const diagonalDistance = Math.hypot(diagonal.x - VILLAGE_MAP.spawn.x, diagonal.z - VILLAGE_MAP.spawn.z);
    expect(diagonalDistance).toBeLessThanOrEqual(straightDistance + 0.01);
  });

  it("blocks movement into walls and slides along them", () => {
    // Drive the player hard left for several seconds; the border trees stop them.
    let state = createInitialWorldState();
    state = worldReducer(state, { type: "setMoveInput", x: -1, z: 0 });
    state = tickFor(state, 6);

    expect(state.x).toBeGreaterThanOrEqual(0.5 + WORLD_BALANCE.playerRadius - 0.01);

    // Diagonal into the wall still moves along the open axis.
    const blockedX = state.x;
    state = worldReducer(state, { type: "setMoveInput", x: -1, z: 1 });
    state = tickFor(state, 0.4);
    expect(state.x).toBeCloseTo(blockedX, 1);
    expect(state.z).toBeGreaterThan(VILLAGE_MAP.spawn.z);
  });

  it("falls back to spawn when the saved position is blocked", () => {
    const state = createInitialWorldState({ x: 0, z: 0 });

    expect(state.x).toBe(VILLAGE_MAP.spawn.x);
    expect(state.z).toBe(VILLAGE_MAP.spawn.z);
  });
});

describe("world interactions", () => {
  const standBelowFacing = (target: { x: number; z: number }) => {
    let state = createInitialWorldState({ x: target.x, z: target.z + 1 });
    state = worldReducer(state, { type: "setMoveInput", x: 0, z: -1 });
    state = tick(state);
    state = worldReducer(state, { type: "setMoveInput", x: 0, z: 0 });
    return tick(state);
  };

  it("enters the arena through its door", () => {
    let state = standBelowFacing(findDoor("arena"));

    expect(state.nearby?.kind).toBe("door");
    state = worldReducer(state, { type: "interact" });
    expect(state.enteredBuilding).toBe("arena");

    state = worldReducer(state, { type: "clearEntry" });
    expect(state.enteredBuilding).toBeNull();
  });

  it("enters the shop through its door", () => {
    let state = standBelowFacing(findDoor("shop"));

    state = worldReducer(state, { type: "interact" });
    expect(state.enteredBuilding).toBe("shop");
  });

  it("talks to NPCs and dismisses dialogue by walking away", () => {
    const npcEntry = Object.entries(VILLAGE_MAP.npcs)[0];
    const [x, z] = npcEntry[0].split(",").map(Number);
    let state = standBelowFacing({ x, z });

    state = worldReducer(state, { type: "interact" });
    expect(state.message).toContain(npcEntry[1].name);

    state = worldReducer(state, { type: "setMoveInput", x: 0, z: 1 });
    state = tick(state);
    expect(state.message).toBeNull();
  });

  it("raises a berry target for the screen layer to resolve", () => {
    const berry = (() => {
      for (let z = 0; z < VILLAGE_MAP.height; z += 1) {
        for (let x = 0; x < VILLAGE_MAP.width; x += 1) {
          if (VILLAGE_MAP.tiles[z][x] === "berry" && isWalkableTile(tileAt(VILLAGE_MAP, x, z + 1))) {
            return { x, z };
          }
        }
      }
      throw new Error("No approachable berry tree");
    })();

    let state = standBelowFacing(berry);
    state = worldReducer(state, { type: "interact" });
    expect(state.berryTarget).toBe(tileKey(berry.x, berry.z));

    state = worldReducer(state, { type: "clearBerryTarget" });
    expect(state.berryTarget).toBeNull();

    state = worldReducer(state, { type: "showMessage", text: "You picked 2 × Oran Berry!" });
    expect(state.message).toContain("Oran Berry");
  });

  it("keys door metadata by tile coordinates", () => {
    const arena = findDoor("arena");
    expect(VILLAGE_MAP.doors[tileKey(arena.x, arena.z)].label).toBe("Arena");
  });
});

describe("wild encounters", () => {
  it("connects the village to Route 1 through the east gate", () => {
    expect(isWalkableTile(tileAt(VILLAGE_MAP, 23, 9))).toBe(true);
    expect(VILLAGE_MAP.tiles.flat()).toContain("tallgrass");
    expect(VILLAGE_MAP.encounters.length).toBeGreaterThan(0);
  });

  it("rolls encounters while walking in tall grass and pauses the world", () => {
    let state = createInitialWorldState({ x: 28, z: 3 }, 7);
    state = worldReducer(state, { type: "setMoveInput", x: 1, z: 0 });

    for (let step = 0; step < 30 * 12 && !state.encounter; step += 1) {
      state = tick(state);
      // Pace back and forth through the grass strip.
      if (step === 30 * 4) {
        state = worldReducer(state, { type: "setMoveInput", x: -1, z: 0 });
      }
      if (step === 30 * 8) {
        state = worldReducer(state, { type: "setMoveInput", x: 1, z: 0 });
      }
    }

    expect(state.encounter).not.toBeNull();
    // The pacing route crosses the deep-grass zone, so look the species up in
    // the table that applies where the encounter rolled.
    const table = encountersAt(VILLAGE_MAP, state.x, state.z);
    const entry = table.find((candidate) => candidate.speciesId === state.encounter?.speciesId);
    expect(entry).toBeDefined();
    expect(state.encounter!.level).toBeGreaterThanOrEqual(entry!.minLevel);
    expect(state.encounter!.level).toBeLessThanOrEqual(entry!.maxLevel);

    // The world freezes until the encounter is consumed.
    expect(tick(state)).toBe(state);
    expect(worldReducer(state, { type: "clearEncounter" }).encounter).toBeNull();
  });

  it("never rolls encounters on plain paths", () => {
    let state = createInitialWorldState(undefined, 7);
    state = worldReducer(state, { type: "setMoveInput", x: 1, z: 0 });
    state = tickFor(state, 3);

    expect(state.encounter).toBeNull();
  });

  it("serves the deep-grass table in the eastern zone", () => {
    const western = encountersAt(VILLAGE_MAP, 28, 3);
    const deep = encountersAt(VILLAGE_MAP, 35, 3);

    expect(western).toBe(VILLAGE_MAP.encounters);
    expect(deep).not.toBe(VILLAGE_MAP.encounters);
    expect(deep.some((entry) => entry.speciesId === "growlithe")).toBe(true);
    expect(deep.some((entry) => entry.speciesId === "eevee")).toBe(true);
    // Deeper grass spawns stronger creatures across the board.
    expect(Math.min(...deep.map((entry) => entry.minLevel))).toBeGreaterThanOrEqual(4);
    const dratini = deep.find((entry) => entry.speciesId === "dratini");
    expect(dratini?.maxLevel).toBe(8);
  });
});
