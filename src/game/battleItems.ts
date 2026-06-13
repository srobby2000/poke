export type BattleItemEffect =
  | {
      kind: "heal";
      name: string;
      amount: number;
      target: "lowestHpDamagedAlly";
    }
  | {
      kind: "cureStatus";
      name: string;
      status: "burn" | "poison" | "paralysis";
      target: "selectedOrFirstStatusedAlly";
    };

export const BATTLE_ITEM_EFFECTS: Record<string, BattleItemEffect> = {
  "potion-item": {
    kind: "heal",
    name: "Potion",
    amount: 60,
    target: "lowestHpDamagedAlly",
  },
  "super-potion-item": {
    kind: "heal",
    name: "Super Potion",
    amount: 120,
    target: "lowestHpDamagedAlly",
  },
  antidote: {
    kind: "cureStatus",
    name: "Antidote",
    status: "poison",
    target: "selectedOrFirstStatusedAlly",
  },
  "burn-heal": {
    kind: "cureStatus",
    name: "Burn Heal",
    status: "burn",
    target: "selectedOrFirstStatusedAlly",
  },
  "paralyze-heal": {
    kind: "cureStatus",
    name: "Paralyze Heal",
    status: "paralysis",
    target: "selectedOrFirstStatusedAlly",
  },
} satisfies Record<string, BattleItemEffect>;

export function battleItemEffect(itemId: string): BattleItemEffect | null {
  return BATTLE_ITEM_EFFECTS[itemId] ?? null;
}

export function isBattleItem(itemId: string) {
  return itemId in BATTLE_ITEM_EFFECTS;
}
