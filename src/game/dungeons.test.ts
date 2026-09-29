import { describe, expect, it } from "vitest";
import { MAPS, isWalkableTile, tileAt } from "./maps";
import { createInitialWorldState, worldReducer } from "./worldState";
import { RIDE_POKEMON } from "./riding";

describe("connected dungeon floors", () => {
  for (const map of Object.values(MAPS).filter(map => map.dungeon)) {
    it(`${map.id} has reachable stairs, safe arrivals and a route to every chamber`, () => {
      const seen = new Set<string>();
      const pending = [map.spawn];
      while (pending.length) {
        const point = pending.pop()!;
        const key = `${point.x},${point.z}`;
        if (seen.has(key) || !isWalkableTile(tileAt(map, point.x, point.z))) continue;
        seen.add(key);
        for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) pending.push({ x: point.x + dx, z: point.z + dz });
      }
      for (const [key, warp] of Object.entries(map.warps)) {
        expect(seen.has(key), `${map.id} stair ${key}`).toBe(true);
        const destination = MAPS[warp.toMap];
        expect(destination).toBeDefined();
        expect(isWalkableTile(tileAt(destination, warp.toX, warp.toZ))).toBe(true);
        expect(tileAt(destination, warp.toX, warp.toZ)).not.toBe("warp");
        expect(Object.values(destination.warps).some(back => back.toMap === map.id)).toBe(true);
        const restored = createInitialWorldState({ mapId: warp.toMap, x: warp.toX, z: warp.toZ });
        expect(restored.x).toBe(warp.toX);
        expect(restored.z).toBe(warp.toZ);
      }
      map.tiles.forEach((row, z) => row.forEach((tile, x) => {
        if (isWalkableTile(tile)) expect(seen.has(`${x},${z}`), `unreachable ${map.id} ${x},${z}`).toBe(true);
      }));
    });
  }
});

describe("trail mounts", () => {
  for (const [species, ride] of Object.entries(RIDE_POKEMON)) {
    it(`${species} accelerates travel and dismounts safely`, () => {
      const start = createInitialWorldState();
      const input = worldReducer(start, { type: "setMoveInput", x: 1, z: 0 });
      const walking = worldReducer(input, { type: "tick", deltaSeconds: 1 / 30 });
      const mounted = worldReducer(input, { type: "setRide", species });
      const riding = worldReducer(mounted, { type: "tick", deltaSeconds: 1 / 30 });
      expect((riding.x - start.x) / (walking.x - start.x)).toBeCloseTo(ride.speed);
      expect(worldReducer(riding, { type: "setRide", species: null }).ride).toBeNull();
      expect(worldReducer(mounted, { type: "warp", toMap: "cave-depths", toX: 2, toZ: 1 }).ride).toBe(species);
    });
  }
  it("rejects unsupported species and does not tunnel through walls or walk in place", () => {
    let state = createInitialWorldState({ mapId: "cave", x: 2, z: 1 });
    expect(worldReducer(state, { type: "setRide", species: "pikachu" }).ride).toBeNull();
    state = worldReducer(state, { type: "setRide", species: "rapidash" });
    state = worldReducer(state, { type: "setMoveInput", x: 0, z: -1 });
    for (let i = 0; i < 10; i++) state = worldReducer(state, { type: "tick", deltaSeconds: 2 });
    expect(state.z).toBeGreaterThanOrEqual(0.8);
    expect(state.moving).toBe(false);
  });
});
