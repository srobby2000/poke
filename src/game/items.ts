import type { PlayerProgress } from "./progress";

export type ItemKind = "ball" | "heal" | "berry" | "held" | "stone";

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
  "super-potion-item": {
    id: "super-potion-item",
    name: "Super Potion",
    description: "Restores a large amount of HP during battle.",
    kind: "heal",
    buyPrice: 90,
    sellPrice: 45,
  },
  antidote: {
    id: "antidote",
    name: "Antidote",
    description: "Cures poison during battle.",
    kind: "heal",
    buyPrice: 35,
    sellPrice: 18,
  },
  "burn-heal": {
    id: "burn-heal",
    name: "Burn Heal",
    description: "Cures burn during battle.",
    kind: "heal",
    buyPrice: 35,
    sellPrice: 18,
  },
  "paralyze-heal": {
    id: "paralyze-heal",
    name: "Paralyze Heal",
    description: "Cures paralysis during battle.",
    kind: "heal",
    buyPrice: 35,
    sellPrice: 18,
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
  // Held items — equip on an ally for a passive battle effect.
  charcoal: {
    id: "charcoal",
    name: "Charcoal",
    description: "Held item: boosts the holder's Fire moves by 20%.",
    kind: "held",
    buyPrice: 220,
    sellPrice: 110,
  },
  "mystic-water": {
    id: "mystic-water",
    name: "Mystic Water",
    description: "Held item: boosts the holder's Water moves by 20%.",
    kind: "held",
    buyPrice: 220,
    sellPrice: 110,
  },
  magnet: {
    id: "magnet",
    name: "Magnet",
    description: "Held item: boosts the holder's Electric moves by 20%.",
    kind: "held",
    buyPrice: 220,
    sellPrice: 110,
  },
  "miracle-seed": {
    id: "miracle-seed",
    name: "Miracle Seed",
    description: "Held item: boosts the holder's Grass moves by 20%.",
    kind: "held",
    buyPrice: 220,
    sellPrice: 110,
  },
  "twisted-spoon": {
    id: "twisted-spoon",
    name: "Twisted Spoon",
    description: "Held item: boosts the holder's Psychic moves by 20%.",
    kind: "held",
    buyPrice: 220,
    sellPrice: 110,
  },
  "soft-sand": {
    id: "soft-sand",
    name: "Soft Sand",
    description: "Held item: boosts the holder's Ground moves by 20%. Found in Crystal Cave.",
    kind: "held",
    sellPrice: 120,
  },
  "hard-stone": {
    id: "hard-stone",
    name: "Hard Stone",
    description: "Held item: boosts the holder's Rock moves by 20%. Found in Crystal Cave.",
    kind: "held",
    sellPrice: 120,
  },
  leftovers: {
    id: "leftovers",
    name: "Leftovers",
    description: "Held item: the holder restores a little HP each turn.",
    kind: "held",
    buyPrice: 320,
    sellPrice: 160,
  },
  "life-orb": {
    id: "life-orb",
    name: "Life Orb",
    description: "Held item: boosts all of the holder's damage by 25%.",
    kind: "held",
    buyPrice: 420,
    sellPrice: 210,
  },
  "focus-sash": {
    id: "focus-sash",
    name: "Focus Sash",
    description: "Held item: if at full HP, the holder survives a knockout with 1 HP (once per battle).",
    kind: "held",
    sellPrice: 200,
  },
  // Evolution stones — consumed to evolve certain allies (see allyEvolutions).
  "fire-stone": {
    id: "fire-stone",
    name: "Fire Stone",
    description: "Evolution stone: evolves Vulpix, Growlithe, and Eevee (into Flareon).",
    kind: "stone",
    buyPrice: 300,
    sellPrice: 150,
  },
  "water-stone": {
    id: "water-stone",
    name: "Water Stone",
    description: "Evolution stone: evolves Eevee into Vaporeon.",
    kind: "stone",
    buyPrice: 300,
    sellPrice: 150,
  },
  "thunder-stone": {
    id: "thunder-stone",
    name: "Thunder Stone",
    description: "Evolution stone: evolves Eevee into Jolteon.",
    kind: "stone",
    buyPrice: 300,
    sellPrice: 150,
  },
  "leaf-stone": {
    id: "leaf-stone",
    name: "Leaf Stone",
    description: "Evolution stone: evolves Gloom into Vileplume.",
    kind: "stone",
    buyPrice: 300,
    sellPrice: 150,
  },
  "moon-stone": {
    id: "moon-stone",
    name: "Moon Stone",
    description: "Evolution stone: evolves Jigglypuff into Wigglytuff.",
    kind: "stone",
    buyPrice: 300,
    sellPrice: 150,
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
