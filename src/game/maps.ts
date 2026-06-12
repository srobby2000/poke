export type TileKind =
  | "path"
  | "grass"
  | "tree"
  | "water"
  | "wall"
  | "door"
  | "fence"
  | "berry"
  | "npc";

export type DoorMeta = { building: string; label: string };
export type NpcMeta = { name: string; dialogue: string };

export type WorldMap = {
  id: string;
  width: number;
  height: number;
  tiles: TileKind[][]; // indexed [z][x]
  doors: Record<string, DoorMeta>; // keyed "x,z"
  npcs: Record<string, NpcMeta>; // keyed "x,z"
  spawn: { x: number; z: number };
};

type MapLegend = {
  doors: Record<string, DoorMeta>;
  npcs: Record<string, NpcMeta>;
};

const TILE_CHARS: Record<string, TileKind> = {
  "#": "tree",
  ".": "path",
  ",": "grass",
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

  return { id, width, height, tiles, doors, npcs, spawn };
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
  return kind === "path" || kind === "grass";
}

// Rift Village: arena hall up north, the (soon-to-open) shop to its west,
// a pond in the south-east, and berry trees waiting for Phase 2.
const VILLAGE_LAYOUT = [
  "########################",
  "#,,,,,,.......,,,,,,,,,#",
  "#,,HHHH,,,,HHHHH,,,,,,,#",
  "#,,HHHH....HHHHH....,,,#",
  "#,,HSHH....HHAHH....,,,#",
  "#......................#",
  "#..F................F..#",
  "#..F.....1..........F..#",
  "#......................#",
  "#.........P............#",
  "#......................#",
  "#,,B...................#",
  "#,,,....2......~~~~,,,,#",
  "#,,,,..........~~~~,,,,#",
  "#,,B,..........~~~~,,,,#",
  "#,,,,,.......,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,,,,,#",
  "########################",
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
      dialogue: "Wild creatures rustle in the grass beyond the village... they say the path opens soon.",
    },
  },
});
