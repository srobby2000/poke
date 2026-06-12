import type { WorldMap } from "./maps";
import { VILLAGE_MAP, isWalkableTile, tileAt, tileKey } from "./maps";

export const WORLD_BALANCE = {
  moveSpeed: 3.6,
  playerRadius: 0.3,
  interactRange: 0.9,
} as const;

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
  message: string | null;
  elapsed: number;
};

export type WorldAction =
  | { type: "tick"; deltaSeconds: number }
  | { type: "setMoveInput"; x: number; z: number }
  | { type: "interact" }
  | { type: "clearEntry" }
  | { type: "clearBerryTarget" }
  | { type: "showMessage"; text: string }
  | { type: "dismissMessage" };

export function createInitialWorldState(position?: { x: number; z: number } | null): WorldState {
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
    message: null,
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

  if (action.type === "showMessage") {
    return { ...state, message: action.text };
  }

  if (action.type === "dismissMessage") {
    return state.message ? { ...state, message: null } : state;
  }

  if (action.type === "tick") {
    const moving = Math.hypot(state.inputX, state.inputZ) > 0.01;
    let { x, z, facingX, facingZ } = state;

    if (moving) {
      const step = WORLD_BALANCE.moveSpeed * action.deltaSeconds;
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
    }

    const next: WorldState = {
      ...state,
      x,
      z,
      facingX,
      facingZ,
      moving,
      elapsed: state.elapsed + action.deltaSeconds,
      // Walking away from a conversation closes it.
      message: moving ? null : state.message,
    };
    return { ...next, nearby: findNearbyInteraction(next) };
  }

  return state;
}
