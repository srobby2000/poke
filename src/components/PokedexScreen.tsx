import { useMemo, useState } from "react";
import type { PokemonBaseStats } from "../game/battleState";
import { getAllyOptions } from "../game/battleState";
import type { PlayerProgress } from "../game/progress";

type PokedexScreenProps = {
  progress: PlayerProgress;
  speciesStats: Record<string, PokemonBaseStats> | null;
  onBack: () => void;
};

type DexFilter = "all" | "caught" | "seen" | "missing";

type DexStatus = "caught" | "seen" | "missing";

export function PokedexScreen({ progress, speciesStats, onBack }: PokedexScreenProps) {
  const [filter, setFilter] = useState<DexFilter>("all");

  const entries = useMemo(() => {
    return getAllyOptions(speciesStats ?? undefined, progress.allyLevels).map((option) => {
      const caught = progress.unlockedAllies.includes(option.id);
      const status: DexStatus = caught ? "caught" : progress.seenSpecies.includes(option.id) ? "seen" : "missing";
      return { option, status };
    });
  }, [speciesStats, progress.allyLevels, progress.unlockedAllies, progress.seenSpecies]);

  const caughtCount = entries.filter((entry) => entry.status === "caught").length;
  const seenCount = entries.filter((entry) => entry.status !== "missing").length;
  const total = entries.length;

  const visible = entries.filter((entry) => {
    if (filter === "all") return true;
    if (filter === "caught") return entry.status === "caught";
    if (filter === "seen") return entry.status === "seen";
    return entry.status === "missing";
  });

  return (
    <main className="app-shell">
      <div className="select-screen">
        <header className="select-header">
          <button className="back-button" onClick={onBack}>
            ← Back to Arena
          </button>
          <h1>📕 Pokédex</h1>
          <p>
            Caught <strong>{caughtCount}</strong> · Seen <strong>{seenCount}</strong> · Total <strong>{total}</strong>
          </p>
          <small>Encounter creatures in the wild, fishing, or in battle to register them.</small>
        </header>

        <section className="roster-tools" aria-label="Pokédex filter">
          <label>
            Show
            <select value={filter} onChange={(event) => setFilter(event.target.value as DexFilter)}>
              <option value="all">All</option>
              <option value="caught">Caught</option>
              <option value="seen">Seen only</option>
              <option value="missing">Undiscovered</option>
            </select>
          </label>
        </section>

        <div className="select-grid">
          {visible.map(({ option, status }) => {
            if (status === "missing") {
              return (
                <div key={option.id} className="select-card select-card-locked dex-card-missing">
                  <span className="select-name">
                    <i style={{ backgroundColor: "#1e293b" }} />
                    ??? <b className="rarity-stars">{"★".repeat(option.rarity)}</b>
                  </span>
                  <span className="select-locked-hint">Undiscovered</span>
                </div>
              );
            }

            return (
              <div key={option.id} className={`select-card ${status === "seen" ? "dex-card-seen" : ""}`}>
                <span className="select-name">
                  <i style={{ backgroundColor: status === "caught" ? option.color : "#475569" }} />
                  {option.name}
                  <b className="rarity-stars">{"★".repeat(option.rarity)}</b>
                  <b className={`dex-badge dex-badge-${status}`}>{status === "caught" ? "✓ Caught" : "👁 Seen"}</b>
                </span>
                <span className="select-types">{option.types.join(" / ")}</span>
                {status === "caught" && option.baseStats ? (
                  <span className="select-stats">
                    HP {option.baseStats.hp} ATK {option.baseStats.attack} DEF {option.baseStats.defense} SPD{" "}
                    {option.baseStats.speed}
                  </span>
                ) : (
                  <span className="select-locked-hint">Catch it to reveal its stats.</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
