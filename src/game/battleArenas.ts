import type { BattleMode } from "./battleState";

/** Where a battle takes place. Each arena has its own ground, sky, scenery and light tint;
 * the lighting balance itself stays shared (see PokemonLighting). */
export type BattleArena = "grass" | "forest" | "mountain" | "water" | "cave" | "stadium";

export type ArenaLook = {
  name: string;
  sky: string;
  fog: [color: string, near: number, far: number];
  ground: string;
  pad: [ally: string, enemy: string];
  rim: string;
  /** Hemisphere tint (sky, ground) and whether the scene is lit like a cave. */
  light: { sky: string; ground: string; cave?: boolean };
};

export const ARENAS: Record<BattleArena, ArenaLook> = {
  grass: { name: "Grassland", sky: "#9fd3f2", fog: ["#bfe3f6", 14, 34], ground: "#7fb069", pad: ["#bfae80", "#c9b98d"], rim: "#8e7f58", light: { sky: "#e9f6ff", ground: "#6f8f55" } },
  forest: { name: "Forest", sky: "#8fb9a0", fog: ["#9dbfa4", 10, 26], ground: "#557f45", pad: ["#8f7a52", "#9a8559"], rim: "#5e4d31", light: { sky: "#e2f3dc", ground: "#4d6b3a" } },
  mountain: { name: "Mountain", sky: "#b9cde0", fog: ["#cfdbe6", 16, 40], ground: "#9a8b76", pad: ["#b7a88f", "#c1b39a"], rim: "#6f6352", light: { sky: "#eef3fa", ground: "#7d6f5c" } },
  water: { name: "Lakeside", sky: "#a6dcf5", fog: ["#c3e8f8", 16, 40], ground: "#3f8fc0", pad: ["#e3d3a3", "#ead9aa"], rim: "#b39d63", light: { sky: "#eaf7ff", ground: "#5a93b0" } },
  cave: { name: "Cave", sky: "#141a26", fog: ["#141a26", 9, 24], ground: "#4a4d57", pad: ["#6b6e78", "#72757f"], rim: "#8fe3ef", light: { sky: "#b9d9f2", ground: "#3a3444", cave: true } },
  stadium: { name: "Stadium", sky: "#7fa9d6", fog: ["#9fbfe0", 20, 44], ground: "#5f9a5a", pad: ["#e7e2d6", "#e7e2d6"], rim: "#ffffff", light: { sky: "#f1f6ff", ground: "#6a8a66" } },
};

// The arena ladder tours every venue, starting in the stadium.
const LADDER: BattleArena[] = ["stadium", "grass", "forest", "mountain", "water", "cave"];

/** The arena for a battle launched from the lobby (ladder or daily); overworld battles bring
 * their own from the map, the trainer or the fishing spot. */
export function lobbyArena(mode: BattleMode, stage: number, dailyKey?: string): BattleArena {
  if (mode === "daily" && dailyKey) {
    let hash = 0;
    for (const char of dailyKey) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return LADDER[hash % LADDER.length];
  }
  return LADDER[(Math.max(1, stage) - 1) % LADDER.length];
}
