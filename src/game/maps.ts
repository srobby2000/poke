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
  | "npc";

export type DoorMeta = { building: string; label: string };
export type NpcMeta = { name: string; dialogue: string };

export type EncounterEntry = {
  speciesId: string;
  weight: number;
  minLevel: number;
  maxLevel: number;
};

export type WorldMap = {
  id: string;
  width: number;
  height: number;
  tiles: TileKind[][]; // indexed [z][x]
  doors: Record<string, DoorMeta>; // keyed "x,z"
  npcs: Record<string, NpcMeta>; // keyed "x,z"
  spawn: { x: number; z: number };
  // What can appear in this map's tall grass.
  encounters: EncounterEntry[];
};

type MapLegend = {
  doors: Record<string, DoorMeta>;
  npcs: Record<string, NpcMeta>;
  encounters?: EncounterEntry[];
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
      } else if (legend.doors[char]) {
        doors[tileKey(x, z)] = legend.doors[char];
        tileRow.push("door");
      } else if (legend.npcs[char]) {
        npcs[tileKey(x, z)] = legend.npcs[char];
        tileRow.push("npc");
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

  return { id, width, height, tiles, doors, npcs, spawn, encounters: legend.encounters ?? [] };
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
  return kind === "path" || kind === "grass" || kind === "tallgrass";
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
  "#.......................................",
  "#.........P.............................",
  "#.......................................",
  "#,,B....................#,%%%,......,%%#",
  "#,,,....2......~~~~,,,,,#,%%%%,....,%%%#",
  "#,,,,..........~~~~,,,,,#,%%%%%,..,%%%%#",
  "#,,B,..........~~~~,,,,,#,%%%%%%,B,%%%%#",
  "#,,,,,.......,,,,,,,,,,,#,,%%%%%%,,%%%,#",
  "#,,,,,,,,,,,,,,,,,,,,,,,##,,,%%%%,,%%,,#",
  "########################################",
];

export const VILLAGE_MAP = parseMap("village", VILLAGE_LAYOUT, {
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
      dialogue: "Tall grass hides wild creatures. Weaken them in battle, then throw a Poké Ball to catch them!",
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
});
