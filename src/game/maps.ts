export type TileKind =
  | "path"
  | "grass"
  | "tallgrass"
  | "tree"
  | "water"
  | "wall"
  | "door"
  | "fence"
  | "berry"
  | "npc"
  | "warp"
  | "trainer";

export type DoorMeta = { building: string; label: string };
export type NpcMeta = { name: string; dialogue: string };
// A tile that, when stepped on, sends the player to another map.
export type WarpMeta = { toMap: string; toX: number; toZ: number; label: string };
// An overworld trainer: a fixed enemy squad you challenge by facing them and
// interacting. Once defeated they step aside (their tile becomes walkable).
export type TrainerMeta = {
  id: string;
  name: string;
  teamId: string;
  level: number;
  reward: number;
  dialogue: string;
  afterDialogue: string;
};

export type EncounterEntry = {
  speciesId: string;
  weight: number;
  minLevel: number;
  maxLevel: number;
};

export type EncounterZone = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  encounters: EncounterEntry[];
};

export type WorldMap = {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileKind[][]; // indexed [z][x]
  doors: Record<string, DoorMeta>; // keyed "x,z"
  npcs: Record<string, NpcMeta>; // keyed "x,z"
  warps: Record<string, WarpMeta>; // keyed "x,z"
  trainers: Record<string, TrainerMeta>; // keyed "x,z"
  spawn: { x: number; z: number };
  // What can appear in this map's tall grass.
  encounters: EncounterEntry[];
  // Regions with their own (usually tougher) encounter tables.
  encounterZones: EncounterZone[];
};

type MapLegend = {
  name: string;
  doors?: Record<string, DoorMeta>;
  npcs?: Record<string, NpcMeta>;
  warps?: Record<string, WarpMeta>;
  trainers?: Record<string, TrainerMeta>;
  encounters?: EncounterEntry[];
  encounterZones?: EncounterZone[];
};

const TILE_CHARS: Record<string, TileKind> = {
  "#": "tree",
  ".": "path",
  ",": "grass",
  "%": "tallgrass",
  "~": "water",
  H: "wall",
  F: "fence",
  B: "berry",
};

export function tileKey(x: number, z: number) {
  return `${x},${z}`;
}

function parseMap(id: string, layout: string[], legend: MapLegend): WorldMap {
  const height = layout.length;
  const width = layout[0]?.length ?? 0;
  const tiles: TileKind[][] = [];
  const doors: Record<string, DoorMeta> = {};
  const npcs: Record<string, NpcMeta> = {};
  const warps: Record<string, WarpMeta> = {};
  const trainers: Record<string, TrainerMeta> = {};
  let spawn: { x: number; z: number } | null = null;

  layout.forEach((row, z) => {
    if (row.length !== width) {
      throw new Error(`Map ${id} row ${z} has width ${row.length}, expected ${width}`);
    }
    const tileRow: TileKind[] = [];
    for (let x = 0; x < width; x += 1) {
      const char = row[x];
      if (char === "P") {
        spawn = { x, z };
        tileRow.push("path");
      } else if (legend.doors?.[char]) {
        doors[tileKey(x, z)] = legend.doors[char];
        tileRow.push("door");
      } else if (legend.npcs?.[char]) {
        npcs[tileKey(x, z)] = legend.npcs[char];
        tileRow.push("npc");
      } else if (legend.warps?.[char]) {
        warps[tileKey(x, z)] = legend.warps[char];
        tileRow.push("warp");
      } else if (legend.trainers?.[char]) {
        trainers[tileKey(x, z)] = legend.trainers[char];
        tileRow.push("trainer");
      } else {
        const kind = TILE_CHARS[char];
        if (!kind) {
          throw new Error(`Map ${id} has unknown tile char '${char}' at ${x},${z}`);
        }
        tileRow.push(kind);
      }
    }
    tiles.push(tileRow);
  });

  if (!spawn) {
    throw new Error(`Map ${id} has no spawn point (P)`);
  }

  return {
    id,
    name: legend.name,
    width,
    height,
    tiles,
    doors,
    npcs,
    warps,
    trainers,
    spawn,
    encounters: legend.encounters ?? [],
    encounterZones: legend.encounterZones ?? [],
  };
}

// The encounter table at a position: the first matching zone wins, otherwise
// the map default applies.
export function encountersAt(map: WorldMap, worldX: number, worldZ: number): EncounterEntry[] {
  const x = Math.round(worldX);
  const z = Math.round(worldZ);
  const zone = map.encounterZones.find(
    (candidate) => x >= candidate.minX && x <= candidate.maxX && z >= candidate.minZ && z <= candidate.maxZ,
  );
  return zone?.encounters ?? map.encounters;
}

export function tileAt(map: WorldMap, worldX: number, worldZ: number): TileKind {
  const x = Math.round(worldX);
  const z = Math.round(worldZ);
  if (x < 0 || z < 0 || x >= map.width || z >= map.height) {
    return "tree";
  }
  return map.tiles[z][x];
}

export function isWalkableTile(kind: TileKind): boolean {
  return kind === "path" || kind === "grass" || kind === "tallgrass" || kind === "warp";
}

// The warp at a position, if the player is standing on one.
export function warpAt(map: WorldMap, worldX: number, worldZ: number): WarpMeta | null {
  return map.warps[tileKey(Math.round(worldX), Math.round(worldZ))] ?? null;
}

// Rift Village (west) and Route 1 (east): the gate in the middle rows leads
// to tall grass (%) where wild creatures lurk. Berry trees on both sides.
const VILLAGE_LAYOUT = [
  "########################################",
  "#,,,,,,.......,,,,,,,,,###,,,%%%%%,,,###",
  "#,,HHHH,,,,HHHHH,,,,,,,#,,%%%%%%%%%%%,,#",
  "#,,HHHH....HHHHH....,,,#,%%%%%%%%%%%%%,#",
  "#,,HSHH....HHAHH....,,,#,%%%%,,,,,%%%%,#",
  "#......................#,%%%,,...,,%%%,#",
  "#..F................F..#,%%,,..#..,,%%,#",
  "#..F.....1..........F..#,%%,......3,%%,#",
  "#......................................#",
  "#.........P...........................G>",
  "#......................................#",
  "#,,B....................#,%%%,......,%%#",
  "#,,,....2......~~~~,,,,,#,%%%%,....,%%%#",
  "#,,,,..........~~~~,,,,,#,%%%%%,..,%%%%#",
  "#,,B,..........~~~~,,,,,#,%%%%%%,B,%%%%#",
  "#,,,,,.......,,,,,,,,,,,#,,%%%%%%,,%%%,#",
  "#,,,,,,,,,,,,,,,,,,,,,,,##,,,%%%%,,%%,,#",
  "########################################",
];

export const VILLAGE_MAP = parseMap("village", VILLAGE_LAYOUT, {
  name: "Rift Village",
  doors: {
    A: { building: "arena", label: "Arena" },
    S: { building: "shop", label: "Shop" },
  },
  npcs: {
    "1": {
      name: "Mira",
      dialogue: "Welcome to Rift Village! The Arena up north is where the rival squads gather.",
    },
    "2": {
      name: "Theo",
      dialogue: "The gate east of the plaza leads to Route 1. Mind the tall grass!",
    },
    "3": {
      name: "Ranger Lila",
      dialogue:
        "Tall grass hides wild creatures — weaken them, then throw a Poké Ball! The deep grass further east hides much stronger ones.",
    },
  },
  warps: {
    ">": { toMap: "route2", toX: 2, toZ: 8, label: "Route 2" },
  },
  trainers: {
    G: {
      id: "village-gate",
      name: "Gatekeeper Bran",
      teamId: "kanto-rivals",
      level: 6,
      reward: 40,
      dialogue: "No one passes to Route 2 until they best my squad. Show me what your team can do!",
      afterDialogue: "Heh, you've earned the road east. Route 2's trainers won't go easy, though.",
    },
  },
  encounters: [
    { speciesId: "pidgey", weight: 30, minLevel: 1, maxLevel: 3 },
    { speciesId: "rattata", weight: 30, minLevel: 1, maxLevel: 3 },
    { speciesId: "oddish", weight: 18, minLevel: 2, maxLevel: 4 },
    { speciesId: "machop", weight: 12, minLevel: 2, maxLevel: 4 },
    { speciesId: "abra", weight: 7, minLevel: 3, maxLevel: 5 },
    { speciesId: "dratini", weight: 3, minLevel: 4, maxLevel: 6 },
  ],
  // The eastern third of Route 1 is deep grass: stronger spawns, better odds
  // at the chase species, and wild Growlithe/Eevee for capture hunters.
  encounterZones: [
    {
      minX: 32,
      maxX: 39,
      minZ: 1,
      maxZ: 16,
      encounters: [
        { speciesId: "oddish", weight: 20, minLevel: 4, maxLevel: 6 },
        { speciesId: "machop", weight: 22, minLevel: 4, maxLevel: 6 },
        { speciesId: "growlithe", weight: 20, minLevel: 4, maxLevel: 6 },
        { speciesId: "abra", weight: 18, minLevel: 4, maxLevel: 7 },
        { speciesId: "eevee", weight: 10, minLevel: 4, maxLevel: 6 },
        { speciesId: "dratini", weight: 10, minLevel: 5, maxLevel: 8 },
      ],
    },
  ],
});

// Route 2: reached through the gate east of Route 1. Tougher wild spawns, a
// pond, and three overworld trainers. The west warp leads back to the village.
const ROUTE2_LAYOUT = [
  "##############################",
  "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
  "#,,,%%%%%%%,,,,,,,%%%%%%%,,,,#",
  "#,,,%%%%%%%,,,,,,,%%%%M%%,,,,#",
  "#,,,%%%%%%%,,,,,,,%%%%%%%,,,,#",
  "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,~~~~~~,,,,,,,,#",
  "#,,,,,,,,,,,,,,~~~~~~,,,,,,,,#",
  "#<,P,,,,,,,,,,~~~~~~,,,,,,,,,#",
  "#,,,,N,,,,,,,,~~~~~~,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
  "#,,%%%%%,,,,,,K,,,,,%%%%%,,,,#",
  "#,,%%%%%,,,,,,,,,,,,%%%%%,,,,#",
  "#,,%%%%%,,,B,,,D,,,%%%%%,,,,,#",
  "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
  "##############################",
];

export const ROUTE2_MAP = parseMap("route2", ROUTE2_LAYOUT, {
  name: "Route 2",
  warps: {
    "<": { toMap: "village", toX: 37, toZ: 9, label: "Rift Village" },
  },
  npcs: {
    N: {
      name: "Signpost",
      dialogue:
        "Route 2 — walk back through the warp to the west to return to Rift Village. The locals here battle hard!",
    },
  },
  trainers: {
    M: {
      id: "route2-maya",
      name: "Battle Girl Maya",
      teamId: "ember-dojo",
      level: 8,
      reward: 50,
      dialogue: "My dojo squad trains in this grass every day. Let's spar!",
      afterDialogue: "Strong! Keep heading east — the others are tougher than me.",
    },
    K: {
      id: "route2-cliff",
      name: "Hiker Cliff",
      teamId: "shoreline-rogues",
      level: 9,
      reward: 55,
      dialogue: "Resting by the pond, are we? Not before you beat my team!",
      afterDialogue: "Whew, you've got grit. The pond's good for water types, by the way.",
    },
    D: {
      id: "route2-sage",
      name: "Psychic Sage",
      teamId: "mind-garden",
      level: 10,
      reward: 60,
      dialogue: "I foresaw your arrival... and your challenge. Come, test your mind against mine.",
      afterDialogue: "Your future is bright. The chase species favour the deep grass here.",
    },
  },
  encounters: [
    { speciesId: "oddish", weight: 18, minLevel: 6, maxLevel: 9 },
    { speciesId: "machop", weight: 20, minLevel: 6, maxLevel: 9 },
    { speciesId: "growlithe", weight: 18, minLevel: 7, maxLevel: 10 },
    { speciesId: "eevee", weight: 14, minLevel: 7, maxLevel: 10 },
    { speciesId: "abra", weight: 14, minLevel: 7, maxLevel: 10 },
    { speciesId: "dratini", weight: 10, minLevel: 8, maxLevel: 11 },
    { speciesId: "lapras", weight: 6, minLevel: 9, maxLevel: 12 },
  ],
  // The southern grass band hides the strongest spawns and the best chase odds.
  encounterZones: [
    {
      minX: 1,
      maxX: 28,
      minZ: 11,
      maxZ: 14,
      encounters: [
        { speciesId: "machop", weight: 20, minLevel: 8, maxLevel: 11 },
        { speciesId: "growlithe", weight: 18, minLevel: 8, maxLevel: 11 },
        { speciesId: "eevee", weight: 16, minLevel: 8, maxLevel: 11 },
        { speciesId: "abra", weight: 14, minLevel: 8, maxLevel: 11 },
        { speciesId: "dratini", weight: 18, minLevel: 9, maxLevel: 12 },
        { speciesId: "lapras", weight: 14, minLevel: 10, maxLevel: 13 },
      ],
    },
  ],
});

// Every traversable map, keyed by id, for warp lookups and save restoration.
export const MAPS: Record<string, WorldMap> = {
  village: VILLAGE_MAP,
  route2: ROUTE2_MAP,
};

export function getMap(id: string | undefined): WorldMap {
  return (id && MAPS[id]) || VILLAGE_MAP;
}
