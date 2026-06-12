import type { PlayerProgress } from "./progress";

export type ItemKind = "ball" | "heal" | "berry";

export type ItemDef = {
  id: string;
  name: string;
  description: string;
  kind: ItemKind;
  buyPrice?: number; // absent = not sold in the shop
  sellPrice?: number; // absent = the shop won't take it
};

export const ITEMS: Record<string, ItemDef> = {
  "poke-ball": {
    id: "poke-ball",
    name: "Poké Ball",
    description: "Catches wild creatures — for when the routes open.",
    kind: "ball",
    buyPrice: 60,
    sellPrice: 30,
  },
  "great-ball": {
    id: "great-ball",
    name: "Great Ball",
    description: "A stronger ball with a much better catch rate.",
    kind: "ball",
    buyPrice: 150,
    sellPrice: 75,
  },
  "potion-item": {
    id: "potion-item",
    name: "Potion",
    description: "Restores an ally's HP during battle.",
    kind: "heal",
    buyPrice: 40,
    sellPrice: 20,
  },
  "oran-berry": {
    id: "oran-berry",
    name: "Oran Berry",
    description: "A common berry. Sells for a few gems.",
    kind: "berry",
    sellPrice: 15,
  },
  "pecha-berry": {
    id: "pecha-berry",
    name: "Pecha Berry",
    description: "A sweet berry that fetches a fair price.",
    kind: "berry",
    sellPrice: 25,
  },
  "sitrus-berry": {
    id: "sitrus-berry",
    name: "Sitrus Berry",
    description: "A rare, prized berry.",
    kind: "berry",
    sellPrice: 40,
  },
};

export function itemCount(progress: PlayerProgress, itemId: string): number {
  return progress.inventory[itemId] ?? 0;
}

export function addItem(progress: PlayerProgress, itemId: string, quantity: number): PlayerProgress {
  return {
    ...progress,
    inventory: { ...progress.inventory, [itemId]: itemCount(progress, itemId) + quantity },
  };
}

function hashKey(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Which berry a tree yields on a given day: mostly Oran, sometimes Pecha,
// occasionally Sitrus — deterministic per tree per day.
export function berryYieldFor(tileKey: string, dateKey: string): { itemId: string; quantity: number } {
  const hash = hashKey(`${tileKey}:${dateKey}`);
  const roll = hash % 10;
  const itemId = roll < 5 ? "oran-berry" : roll < 8 ? "pecha-berry" : "sitrus-berry";
  const quantity = 1 + (Math.floor(hash / 10) % 2);
  return { itemId, quantity };
}

export type BerryPickResult = {
  progress: PlayerProgress;
  itemId: string;
  quantity: number;
};

// Returns null when this tree was already picked today. Picked state resets
// whenever the date key changes — trees regrow overnight.
export function pickBerry(progress: PlayerProgress, tileKey: string, dateKey: string): BerryPickResult | null {
  const picks = progress.berryPicks.date === dateKey ? progress.berryPicks.picked : [];
  if (picks.includes(tileKey)) {
    return null;
  }

  const { itemId, quantity } = berryYieldFor(tileKey, dateKey);
  const withItem = addItem(progress, itemId, quantity);
  return {
    progress: {
      ...withItem,
      berryPicks: { date: dateKey, picked: [...picks, tileKey] },
    },
    itemId,
    quantity,
  };
}

export function pickedBerryTiles(progress: PlayerProgress, dateKey: string): string[] {
  return progress.berryPicks.date === dateKey ? progress.berryPicks.picked : [];
}
