import { useMemo, useState } from "react";
import type { AllyOption, PokemonBaseStats } from "../game/battleState";
import { getAllyOptions } from "../game/battleState";
import type { SpeciesDetail } from "../game/pokeApi";
import type { PlayerProgress } from "../game/progress";

type PokedexModalProps = {
  progress: PlayerProgress;
  speciesStats: Record<string, PokemonBaseStats> | null;
  sprites: Record<string, string> | null;
  details: Record<string, SpeciesDetail> | null;
  onClose: () => void;
};

type DexFilter = "all" | "caught" | "seen" | "missing";
type DexStatus = "caught" | "seen" | "missing";
type DexEntry = { option: AllyOption; status: DexStatus };

export function PokedexModal({ progress, speciesStats, sprites, details, onClose }: PokedexModalProps) {
  const [filter, setFilter] = useState<DexFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const entries = useMemo<DexEntry[]>(() => {
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

  const selected = selectedId ? entries.find((entry) => entry.option.id === selectedId) ?? null : null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Pokédex" onClick={onClose}>
      <div className="modal-panel pokedex-modal" onClick={(event) => event.stopPropagation()}>
        <header className="pokedex-modal-header">
          <h2>📕 Pokédex</h2>
          <span className="pokedex-counts">
            Caught <strong>{caughtCount}</strong> · Seen <strong>{seenCount}</strong> · Total <strong>{total}</strong>
          </span>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>

        {selected ? (
          <DexDetail
            entry={selected}
            sprites={sprites}
            detail={details?.[selected.option.id] ?? null}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <>
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

            <div className="pokedex-grid">
              {visible.map(({ option, status }) => (
                <button
                  key={option.id}
                  className={`pokedex-cell pokedex-cell-${status}`}
                  disabled={status === "missing"}
                  onClick={() => setSelectedId(option.id)}
                >
                  <DexSprite option={option} status={status} sprites={sprites} />
                  <span className="pokedex-cell-name">{status === "missing" ? "???" : option.name}</span>
                  <span className="rarity-stars">{"★".repeat(option.rarity)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// The creature portrait: PokeAPI artwork when available, a colored token
// otherwise. Seen-but-uncaught creatures show as a darkened silhouette.
function DexSprite({
  option,
  status,
  sprites,
}: {
  option: AllyOption;
  status: DexStatus;
  sprites: Record<string, string> | null;
}) {
  if (status === "missing") {
    return <span className="pokedex-portrait pokedex-portrait-missing">?</span>;
  }
  const url = sprites?.[option.id];
  const className = `pokedex-portrait ${status === "seen" ? "pokedex-portrait-silhouette" : ""}`;
  if (url) {
    return <img className={className} src={url} alt={option.name} loading="lazy" />;
  }
  return (
    <span
      className={className}
      style={{ backgroundColor: status === "caught" ? option.color : "#475569", borderRadius: "50%" }}
    />
  );
}

function DexDetail({
  entry,
  sprites,
  detail,
  onBack,
}: {
  entry: DexEntry;
  sprites: Record<string, string> | null;
  detail: SpeciesDetail | null;
  onBack: () => void;
}) {
  const { option, status } = entry;
  const caught = status === "caught";
  return (
    <div className="pokedex-detail">
      <button className="back-button" onClick={onBack}>
        ← All entries
      </button>
      <div className="pokedex-detail-body">
        <DexSprite option={option} status={status} sprites={sprites} />
        <div className="pokedex-detail-info">
          <h3>
            {option.name} <b className="rarity-stars">{"★".repeat(option.rarity)}</b>
          </h3>
          {detail?.genus ? <p className="pokedex-genus">{detail.genus}</p> : null}
          <p className="pokedex-detail-meta">
            <b className={`role-badge role-${option.role}`}>{option.role}</b>
            <span className="select-types">{option.types.join(" / ")}</span>
            <b className={`dex-badge dex-badge-${status}`}>{caught ? "✓ Caught" : "👁 Seen"}</b>
          </p>

          {detail?.flavorText ? <p className="pokedex-flavor">{detail.flavorText}</p> : null}

          {detail && (detail.heightM > 0 || detail.weightKg > 0 || detail.habitat) ? (
            <p className="pokedex-vitals">
              {detail.heightM > 0 ? <span>📏 {detail.heightM.toFixed(1)} m</span> : null}
              {detail.weightKg > 0 ? <span>⚖️ {detail.weightKg.toFixed(1)} kg</span> : null}
              {detail.habitat ? <span>🌍 {detail.habitat}</span> : null}
            </p>
          ) : null}

          {caught && option.baseStats ? (
            <div className="pokedex-stats">
              <StatRow label="HP" value={option.baseStats.hp} max={160} />
              <StatRow label="ATK" value={option.baseStats.attack} max={140} />
              <StatRow label="DEF" value={option.baseStats.defense} max={140} />
              <StatRow label="SPD" value={option.baseStats.speed} max={120} />
            </div>
          ) : (
            <p className="select-locked-hint">Catch it to reveal its stats, passive, and moves.</p>
          )}

          {caught ? (
            <>
              <p className="pokedex-passive">
                <strong>{option.passive.name}</strong> — {option.passive.description}
              </p>
              <p className="select-moves">{option.moveNames.join(" · ")}</p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <div className="stat-track">
        <span style={{ width: `${Math.min(100, Math.round((value / max) * 100))}%` }} />
      </div>
      <span className="stat-value">{value}</span>
    </div>
  );
}
