import type { TrainerMeta, WorldMap } from "./maps";
import { encountersAt, getMap, isWalkableTile, tileAt, tileKey, warpAt } from "./maps";

export const WORLD_BALANCE = {
  moveSpeed: 3.6,
  playerRadius: 0.3,
  interactRange: 0.9,
  // Chance of a wild encounter per tile of distance walked in tall grass.
  encounterChancePerTile: 0.14,
} as const;

export type WildEncounter = { speciesId: string; level: number };

// A trainer battle the player triggered by facing an overworld trainer; the
// screen layer launches the battle and clears it.
export type TrainerChallenge = {
  tileKey: string;
  id: string;
  name: string;
  teamId: string;
  level: number;
  reward: number;
  isRematch: boolean;
};

// A pending warp to another map; the screen layer applies it via a "warp"
// action so the reducer rebuilds state for the destination map.
export type PendingWarp = { toMap: string; toX: number; toZ: number };

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
  | { kind: "berry"; tileKey: string }
  | { kind: "trainer"; tileKey: string; name: string }
  | { kind: "water" };

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
  // A trainer the player chose to challenge; the screen layer launches it.
  trainerBattle: TrainerChallenge | null;
  // A warp the player stepped onto; the screen layer applies it.
  pendingWarp: PendingWarp | null;
  // Trainer ids the player has already beaten — those trainers step aside.
  defeatedTrainers: string[];
  // Trainer ids already rematched today — they offer no further battle.
  rematchedToday: string[];
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
  | { type: "clearTrainer" }
  | { type: "warp"; toMap: string; toX: number; toZ: number }
  | { type: "showMessage"; text: string }
  | { type: "dismissMessage" };

export function createInitialWorldState(
  position?: { mapId?: string; x: number; z: number } | null,
  seed?: number,
  defeatedTrainers: string[] = [],
  rematchedToday: string[] = [],
): WorldState {
  const map = getMap(position?.mapId);
  const requested = position ?? map.spawn;
  const start = canStandAt(map, requested.x, requested.z, defeatedTrainers) ? requested : map.spawn;

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
    trainerBattle: null,
    pendingWarp: null,
    defeatedTrainers,
    rematchedToday,
    message: null,
    grassProgress: 0,
    rng: seed ?? Math.floor(Math.random() * 0xffffffff),
    elapsed: 0,
  };
}

// A defeated trainer steps aside, so their tile becomes walkable.
function isStandableTile(map: WorldMap, x: number, z: number, defeatedTrainers: string[]): boolean {
  const kind = tileAt(map, x, z);
  if (kind === "trainer") {
    const trainer = map.trainers[tileKey(Math.round(x), Math.round(z))];
    return trainer ? defeatedTrainers.includes(trainer.id) : false;
  }
  return isWalkableTile(kind);
}

function canStandAt(map: WorldMap, x: number, z: number, defeatedTrainers: string[]): boolean {
  const r = WORLD_BALANCE.playerRadius;
  return (
    isStandableTile(map, x - r, z - r, defeatedTrainers) &&
    isStandableTile(map, x + r, z - r, defeatedTrainers) &&
    isStandableTile(map, x - r, z + r, defeatedTrainers) &&
    isStandableTile(map, x + r, z + r, defeatedTrainers)
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
  if (kind === "trainer") {
    const trainer = state.map.trainers[key];
    if (trainer && trainerChallengeable(state, trainer.id)) {
      return { kind: "trainer", tileKey: key, name: trainer.name };
    }
  }
  if (kind === "water" && state.map.fishing.length > 0) {
    return { kind: "water" };
  }
  if (kind === "berry") {
    return { kind: "berry", tileKey: key };
  }
  return null;
}

// A trainer offers a battle if they haven't been beaten yet, or if they have
// been beaten but not yet rematched today.
function trainerChallengeable(state: WorldState, trainerId: string): boolean {
  const beaten = state.defeatedTrainers.includes(trainerId);
  return !beaten || !state.rematchedToday.includes(trainerId);
}

function trainerChallengeFor(state: WorldState, key: string): TrainerChallenge | null {
  const trainer: TrainerMeta | undefined = state.map.trainers[key];
  if (!trainer) {
    return null;
  }
  return {
    tileKey: key,
    id: trainer.id,
    name: trainer.name,
    teamId: trainer.teamId,
    level: trainer.level,
    reward: trainer.reward,
    isRematch: state.defeatedTrainers.includes(trainer.id),
  };
}

// Whether a non-defeated trainer can see the player along their facing line.
function trainerSpotting(state: WorldState): TrainerChallenge | null {
  const px = Math.round(state.x);
  const pz = Math.round(state.z);
  for (const [key, trainer] of Object.entries(state.map.trainers)) {
    if (state.defeatedTrainers.includes(trainer.id) || !trainer.facing) {
      continue;
    }
    const [tx, tz] = key.split(",").map(Number);
    const range = trainer.sightRange ?? 0;
    const step = DIRECTION_STEP[trainer.facing];
    for (let dist = 1; dist <= range; dist += 1) {
      const lx = tx + step.x * dist;
      const lz = tz + step.z * dist;
      const tile = tileAt(state.map, lx, lz);
      // The line of sight is blocked by anything you cannot walk through.
      if (!isWalkableTile(tile) && tile !== "warp") {
        break;
      }
      if (lx === px && lz === pz) {
        return trainerChallengeFor(state, key);
      }
    }
  }
  return null;
}

const DIRECTION_STEP: Record<string, { x: number; z: number }> = {
  up: { x: 0, z: -1 },
  down: { x: 0, z: 1 },
  left: { x: -1, z: 0 },
  right: { x: 1, z: 0 },
};

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
    if (nearby.kind === "trainer") {
      const challenge = trainerChallengeFor(state, nearby.tileKey);
      return challenge ? { ...state, trainerBattle: challenge } : state;
    }
    if (nearby.kind === "water") {
      // Cast a line: a 70% bite chance rolls a fishing encounter.
      const [biteRoll, seedAfterBite] = nextRandom(state.rng);
      if (biteRoll >= 0.7) {
        return { ...state, rng: seedAfterBite, message: "You cast your line… not even a nibble." };
      }
      const rolled = rollEncounter(state.map.fishing, seedAfterBite);
      return { ...state, rng: rolled.nextSeed, encounter: rolled.encounter };
    }
    return { ...state, berryTarget: nearby.tileKey };
  }

  if (action.type === "clearEntry") {
    return state.enteredBuilding ? { ...state, enteredBuilding: null } : state;
  }

  if (action.type === "clearTrainer") {
    return state.trainerBattle ? { ...state, trainerBattle: null } : state;
  }

  if (action.type === "warp") {
    const map = getMap(action.toMap);
    const requested = { x: action.toX, z: action.toZ };
    const start = canStandAt(map, requested.x, requested.z, state.defeatedTrainers) ? requested : map.spawn;
    return {
      ...state,
      map,
      x: start.x,
      z: start.z,
      inputX: 0,
      inputZ: 0,
      moving: false,
      nearby: null,
      pendingWarp: null,
      grassProgress: 0,
      message: null,
    };
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
    // The world pauses while an encounter, trainer battle, or warp waits to be
    // handled by the screen layer.
    if (state.encounter || state.trainerBattle || state.pendingWarp) {
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
      if (canStandAt(state.map, nextX, z, state.defeatedTrainers)) {
        x = nextX;
      }
      const nextZ = z + state.inputZ * step;
      if (canStandAt(state.map, x, nextZ, state.defeatedTrainers)) {
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
    if (distanceMoved > 0 && tileAt(state.map, x, z) === state.map.encounterTile && localEncounters.length > 0) {
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

    // Stepping onto a warp tile queues a transition for the screen layer.
    let pendingWarp: PendingWarp | null = null;
    if (!encounter && distanceMoved > 0) {
      const warp = warpAt(state.map, x, z);
      if (warp) {
        pendingWarp = { toMap: warp.toMap, toX: warp.toX, toZ: warp.toZ };
      }
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
      pendingWarp,
      elapsed: state.elapsed + action.deltaSeconds,
      // Walking away from a conversation closes it.
      message: moving ? null : state.message,
    };

    // Walking into a trainer's line of sight starts the battle automatically.
    if (!encounter && !pendingWarp && distanceMoved > 0) {
      const spotted = trainerSpotting(next);
      if (spotted) {
        return { ...next, trainerBattle: spotted, nearby: null };
      }
    }

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
