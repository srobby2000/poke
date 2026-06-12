import { ITEMS, itemCount } from "../game/items";
import { SHOP_STOCK, sellableItems } from "../game/shop";
import type { PlayerProgress } from "../game/progress";

type ShopScreenProps = {
  progress: PlayerProgress;
  onBuy: (itemId: string) => void;
  onSell: (itemId: string) => void;
  onBack: () => void;
};

export function ShopScreen({ progress, onBuy, onSell, onBack }: ShopScreenProps) {
  const sellable = sellableItems(progress);
  const ownedItems = Object.entries(progress.inventory).filter(([, count]) => count > 0);

  return (
    <main className="app-shell select-screen shop-screen">
      <header className="select-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Village
        </button>
        <h1>Village Shop</h1>
        <p>Stock up for the road, or trade in the berries you gathered.</p>
        <span className="gems-chip">💎 {progress.gems}</span>
      </header>

      <section className="shop-section" aria-label="Buy items">
        <h2>Buy</h2>
        <div className="shop-grid">
          {SHOP_STOCK.map((item) => (
            <div key={item.id} className="shop-card">
              <strong>{item.name}</strong>
              <small>{item.description}</small>
              <span className="shop-owned">Owned: {itemCount(progress, item.id)}</span>
              <button
                className="shop-buy-button"
                disabled={progress.gems < (item.buyPrice ?? 0)}
                onClick={() => onBuy(item.id)}
              >
                Buy — {item.buyPrice} 💎
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="shop-section" aria-label="Sell items">
        <h2>Sell</h2>
        {sellable.length === 0 ? (
          <p className="shop-empty">
            Nothing to sell yet — check the village berry trees, they regrow every day.
          </p>
        ) : (
          <div className="shop-grid">
            {sellable.map((item) => (
              <div key={item.id} className="shop-card">
                <strong>{item.name}</strong>
                <small>{item.description}</small>
                <span className="shop-owned">Owned: {itemCount(progress, item.id)}</span>
                <button className="shop-sell-button" onClick={() => onSell(item.id)}>
                  Sell — {item.sellPrice} 💎
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="select-footer">
        <span>
          Bag:{" "}
          {ownedItems.length === 0
            ? "empty"
            : ownedItems.map(([id, count]) => `${ITEMS[id]?.name ?? id} ×${count}`).join(" · ")}
        </span>
      </footer>
    </main>
  );
}
