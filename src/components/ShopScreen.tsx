import { ITEMS, itemCount } from "../game/items";
import { SHOP_STOCK, sellableItems } from "../game/shop";
import type { PlayerProgress } from "../game/progress";

type ShopScreenProps = {
  progress: PlayerProgress;
  onBuy: (itemId: string, quantity: number) => void;
  onSell: (itemId: string, quantity: number) => void;
  onBack: () => void;
};

export function ShopScreen({ progress, onBuy, onSell, onBack }: ShopScreenProps) {
  const sellable = sellableItems(progress);
  const ownedItems = Object.entries(progress.inventory).filter(([, count]) => count > 0);
  const bagValue = ownedItems.reduce((sum, [id, count]) => sum + (ITEMS[id]?.sellPrice ?? 0) * count, 0);

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
              <div className="shop-actions">
                <button
                  className="shop-buy-button"
                  disabled={progress.gems < (item.buyPrice ?? 0)}
                  onClick={() => onBuy(item.id, 1)}
                >
                  Buy 1 - {item.buyPrice} gems
                </button>
                <button
                  className="shop-buy-button"
                  disabled={progress.gems < (item.buyPrice ?? 0) * 5}
                  onClick={() => onBuy(item.id, 5)}
                >
                  Buy 5 - {(item.buyPrice ?? 0) * 5} gems
                </button>
              </div>
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
                <div className="shop-actions">
                  <button className="shop-sell-button" onClick={() => onSell(item.id, 1)}>
                    Sell 1 - {item.sellPrice} gems
                  </button>
                  <button className="shop-sell-button" onClick={() => onSell(item.id, itemCount(progress, item.id))}>
                    Sell all - {(item.sellPrice ?? 0) * itemCount(progress, item.id)} gems
                  </button>
                </div>
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
        <span>Sell value: {bagValue} gems</span>
      </footer>
    </main>
  );
}
