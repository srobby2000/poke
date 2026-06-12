import { ITEMS, addItem, itemCount } from "./items";
import type { PlayerProgress } from "./progress";

export function buyItem(progress: PlayerProgress, itemId: string, quantity = 1): PlayerProgress | null {
  const item = ITEMS[itemId];
  if (!item || item.buyPrice === undefined || quantity < 1) {
    return null;
  }
  const cost = item.buyPrice * quantity;
  if (progress.gems < cost) {
    return null;
  }
  return addItem({ ...progress, gems: progress.gems - cost }, itemId, quantity);
}

export function sellItem(progress: PlayerProgress, itemId: string, quantity = 1): PlayerProgress | null {
  const item = ITEMS[itemId];
  if (!item || item.sellPrice === undefined || quantity < 1) {
    return null;
  }
  if (itemCount(progress, itemId) < quantity) {
    return null;
  }
  return addItem({ ...progress, gems: progress.gems + item.sellPrice * quantity }, itemId, -quantity);
}

export const SHOP_STOCK = Object.values(ITEMS).filter((item) => item.buyPrice !== undefined);

export function sellableItems(progress: PlayerProgress) {
  return Object.values(ITEMS).filter((item) => item.sellPrice !== undefined && itemCount(progress, item.id) > 0);
}
