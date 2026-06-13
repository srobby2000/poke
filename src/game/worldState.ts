import type { WorldMap } from "./maps";
import { VILLAGE_MAP, encountersAt, isWalkableTile, tileAt, tileKey } from "./maps";

export const WORLD_BALANCE = {
  moveSpeed: 3.6,
  playerRadius: 0.3,
  interactRange: 0.9,
  // Chance of a wild encounter per tile of distance walked in tall grass.
  encounterChancePerTile: 0.14,
} as const;

export type WildEncounter = { speciesId: string; level: number };

function nextRandom(seed: number): [value: number, nextSeed: number] {
  const nextSeed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [nextSeed / 0x100000000, nextSeed];
}

// Buildings the player can actually enter; the rest respond with a message
// so doors never feel dead.
const OPEN_BUILDINGS = ["arena", "shop"];

const CLOSED_BUILDING_MESSAGES: Record<string, string> = {};

export type WorldInteraction =
  | { kind: "door"; building: string; label: string }
  | { kind: "npc"; name: string; dialogue: string }
  | { kind: "berry"; tileKey: string };

export type WorldState = {
  map: WorldMap;
  x: number;
  z: number;
  facingX: number;
  facingZ: number;
  inputX: number;
  inputZ: number;
  moving: boolean;
  nearby: WorldInteraction | null;
  enteredBuilding: string | null;
  // Tile key of a berry tree the player just checked; the screen layer
  // resolves it against the save file and reports back via showMessage.
  berryTarget: string | null;
  // A wild encounter rolled while walking in tall grass; the screen layer
  // launches the battle and clears it.
  encounter: WildEncounter | null;
  message: string | null;
  grassProgress: number;
  rng: number;
  elapsed: number;
};

export type WorldAction =
  | { type: "tick"; deltaSeconds: number }
  | { type: "setMoveInput"; x: number; z: number }
  | { type: "interact" }
  | { type: "clearEntry" }
  | { type: "clearBerryTarget" }
  | { type: "clearEncounter" }
  | { type: "showMessage"; text: string }
  | { type: "dismissMessage" };

export function createInitialWorldState(position?: { x: number; z: number } | null, seed?: number): WorldState {
  const map = VILLAGE_MAP;
  const requested = position ?? map.spawn;
  const start = canStandAt(map, requested.x, requested.z) ? requested : map.spawn;

  return {
    map,
    x: start.x,
    z: start.z,
    facingX: 0,
    facingZ: 1,
    inputX: 0,
    inputZ: 0,
    moving: false,
    nearby: null,
    enteredBuilding: null,
    berryTarget: null,
    encounter: null,
    message: null,
    grassProgress: 0,
    rng: seed ?? Math.floor(Math.random() * 0xffffffff),
    elapsed: 0,
  };
}

function canStandAt(map: WorldMap, x: number, z: number): boolean {
  const r = WORLD_BALANCE.playerRadius;
  return (
    isWalkableTile(tileAt(map, x - r, z - r)) &&
    isWalkableTile(tileAt(map, x + r, z - r)) &&
    isWalkableTile(tileAt(map, x - r, z + r)) &&
    isWalkableTile(tileAt(map, x + r, z + r))
  );
}

function findNearbyInteraction(state: WorldState): WorldInteraction | null {
  const probeX = state.x + state.facingX * WORLD_BALANCE.interactRange;
  const probeZ = state.z + state.facingZ * WORLD_BALANCE.interactRange;
  const tx = Math.round(probeX);
  const tz = Math.round(probeZ);
  const kind = tileAt(state.map, tx, tz);
  const key = tileKey(tx, tz);

  if (kind === "door") {
    const door = state.map.doors[key];
    if (door) {
      return { kind: "door", building: door.building, label: door.label };
    }
  }
  if (kind === "npc") {
    const npc = state.map.npcs[key];
    if (npc) {
      return { kind: "npc", name: npc.name, dialogue: npc.dialogue };
    }
  }
  if (kind === "berry") {
    return { kind: "berry", tileKey: key };
  }
  return null;
}

export function worldReducer(state: WorldState, action: WorldAction): WorldState {
  if (action.type === "setMoveInput") {
    const length = Math.hypot(action.x, action.z);
    const scale = length > 1 ? 1 / length : 1;
    return { ...state, inputX: action.x * scale, inputZ: action.z * scale };
  }

  if (action.type === "interact") {
    const nearby = state.nearby;
    if (!nearby) {
      return state;
    }
    if (nearby.kind === "door") {
      if (OPEN_BUILDINGS.includes(nearby.building)) {
        return { ...state, enteredBuilding: nearby.building };
      }
      return { ...state, message: CLOSED_BUILDING_MESSAGES[nearby.building] ?? "It's locked." };
    }
    if (nearby.kind === "npc") {
      return { ...state, message: `${nearby.name}: ${nearby.dialogue}` };
    }
    return { ...state, berryTarget: nearby.tileKey };
  }

  if (action.type === "clearEntry") {
    return state.enteredBuilding ? { ...state, enteredBuilding: null } : state;
  }

  if (action.type === "clearBerryTarget") {
    return state.berryTarget ? { ...state, berryTarget: null } : state;
  }

  if (action.type === "clearEncounter") {
    return state.encounter ? { ...state, encounter: null } : state;
  }

  if (action.type === "showMessage") {
    return { ...state, message: action.text };
  }

  if (action.type === "dismissMessage") {
    return state.message ? { ...state, message: null } : state;
  }

  if (action.type === "tick") {
    // The world pauses while an encounter waits to be launched.
    if (state.encounter) {
      return state;
    }

    const moving = Math.hypot(state.inputX, state.inputZ) > 0.01;
    let { x, z, facingX, facingZ } = state;
    let distanceMoved = 0;

    if (moving) {
      const step = WORLD_BALANCE.moveSpeed * action.deltaSeconds;
      const beforeX = x;
      const beforeZ = z;
      // Move per axis so the player slides along walls instead of sticking.
      const nextX = x + state.inputX * step;
      if (canStandAt(state.map, nextX, z)) {
        x = nextX;
      }
      const nextZ = z + state.inputZ * step;
      if (canStandAt(state.map, x, nextZ)) {
        z = nextZ;
      }
      facingX = state.inputX;
      facingZ = state.inputZ;
      distanceMoved = Math.hypot(x - beforeX, z - beforeZ);
    }

    // Wild encounters roll once per tile of distance walked in tall grass.
    let { grassProgress, rng } = state;
    let encounter: WildEncounter | null = null;
    const localEncounters = encountersAt(state.map, x, z);
    if (distanceMoved > 0 && tileAt(state.map, x, z) === "tallgrass" && localEncounters.length > 0) {
      grassProgress += distanceMoved;
      while (grassProgress >= 1 && !encounter) {
        grassProgress -= 1;
        const [roll, nextSeed] = nextRandom(rng);
        rng = nextSeed;
        if (roll < WORLD_BALANCE.encounterChancePerTile) {
          const rolled = rollEncounter(localEncounters, rng);
          encounter = rolled.encounter;
          rng = rolled.nextSeed;
        }
      }
    } else if (distanceMoved > 0) {
      grassProgress = 0;
    }

    const next: WorldState = {
      ...state,
      x,
      z,
      facingX,
      facingZ,
      moving,
      grassProgress,
      rng,
      encounter,
      elapsed: state.elapsed + action.deltaSeconds,
      // Walking away from a conversation closes it.
      message: moving ? null : state.message,
    };
    return { ...next, nearby: findNearbyInteraction(next) };
  }

  return state;
}

function rollEncounter(
  entries: { speciesId: string; weight: number; minLevel: number; maxLevel: number }[],
  seed: number,
): { encounter: WildEncounter; nextSeed: number } {
  const [speciesRoll, seedAfterSpecies] = nextRandom(seed);
  const [levelRoll, nextSeed] = nextRandom(seedAfterSpecies);

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = speciesRoll * totalWeight;
  let chosen = entries[entries.length - 1];
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      chosen = entry;
      break;
    }
  }

  const level = chosen.minLevel + Math.floor(levelRoll * (chosen.maxLevel - chosen.minLevel + 1));
  return { encounter: { speciesId: chosen.speciesId, level }, nextSeed };
}
