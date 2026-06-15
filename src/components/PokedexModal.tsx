import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { AllyOption, PokemonBaseStats } from "../game/battleState";
import { getAllyOptions, reachedFormsFor } from "../game/battleState";
import type { EvolutionLink, SpeciesDetail } from "../game/pokeApi";
import type { PlayerProgress } from "../game/progress";
import { typeColor } from "../game/typeColors";
import { ACTIVE_POKEDEX_SKIN } from "./pokedexSkins";

type PokedexModalProps = {
  progress: PlayerProgress;
  speciesStats: Record<string, PokemonBaseStats> | null;
  sprites: Record<string, string> | null;
  details: Record<string, SpeciesDetail> | null;
  evolutions: Record<string, EvolutionLink[]> | null;
  types: Record<string, string[]> | null;
  onClose: () => void;
};

type DexFilter = "all" | "caught" | "seen" | "missing";
type DexStatus = "caught" | "seen" | "missing";

type DexEntry = {
  speciesId: string;
  number: number;
  name: string;
  types: string[];
  stats?: PokemonBaseStats;
  color?: string;
  ally?: AllyOption;
  status: DexStatus;
};

const titleCase = (name: string) => name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
const dexNumber = (n: number) => `#${String(n).padStart(3, "0")}`;

function evolutionTrigger(link: EvolutionLink): string {
  if (link.minLevel) return `Lv ${link.minLevel}`;
  if (link.item) return titleCase(link.item);
  return titleCase(link.trigger);
}

function evolutionLine(speciesId: string, evolutions: Record<string, EvolutionLink[]> | null) {
  if (!evolutions) return [];
  const steps: { name: string; trigger: string }[] = [{ name: titleCase(speciesId), trigger: "" }];
  let current = speciesId;
  const seen = new Set<string>([current]);
  while (evolutions[current]?.length && !seen.has(evolutions[current][0].to)) {
    const link = evolutions[current][0];
    steps.push({ name: titleCase(link.to), trigger: evolutionTrigger(link) });
    seen.add(link.to);
    current = link.to;
  }
  return steps;
}

export function PokedexModal({ progress, speciesStats, sprites, details, evolutions, types, onClose }: PokedexModalProps) {
  const skin = ACTIVE_POKEDEX_SKIN;
  const [filter, setFilter] = useState<DexFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allyById = useMemo(() => {
    const map = new Map<string, AllyOption>();
    for (const option of getAllyOptions(speciesStats ?? undefined, progress.allyLevels, progress.evolutionChoices)) {
      map.set(option.id, option);
    }
    return map;
  }, [speciesStats, progress.allyLevels, progress.evolutionChoices]);

  // Owning an ally registers every form it has evolved through (Bulbasaur AND
  // Ivysaur, etc.) 驕ｯ・ｶ郢晢ｽｻdisplay-only, so it never becomes a selectable roster unit.
  const caughtSpecies = useMemo(() => {
    const set = new Set<string>();
    for (const allyId of progress.unlockedAllies) {
      const level = Math.max(1, Math.floor(progress.allyLevels[allyId] ?? 1));
      for (const form of reachedFormsFor(allyId, level, progress.evolutionChoices)) {
        set.add(form);
      }
    }
    return set;
  }, [progress.unlockedAllies, progress.allyLevels, progress.evolutionChoices]);

  const statusOf = (speciesId: string): DexStatus =>
    caughtSpecies.has(speciesId) ? "caught" : progress.seenSpecies.includes(speciesId) ? "seen" : "missing";

  const entries = useMemo<DexEntry[]>(() => {
    // Full national dex from the loaded data; each species is its own entry.
    if (details && Object.keys(details).length > 0) {
      return Object.keys(details)
        .map((speciesId) => {
          const ally = allyById.get(speciesId);
          return {
            speciesId,
            number: details[speciesId].number || 0,
            name: titleCase(speciesId),
            types: types?.[speciesId] ?? ally?.types ?? [],
            stats: speciesStats?.[speciesId] ?? ally?.baseStats,
            color: ally?.color,
            ally,
            status: statusOf(speciesId),
          };
        })
        .sort((left, right) => left.number - right.number);
    }
    // Offline fallback: just the roster.
    return getAllyOptions(speciesStats ?? undefined, progress.allyLevels, progress.evolutionChoices).map((option, index) => ({
      speciesId: option.id,
      number: index + 1,
      name: option.name,
      types: option.types,
      stats: option.baseStats,
      color: option.color,
      ally: option,
      status: statusOf(option.id),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    details,
    types,
    speciesStats,
    allyById,
    progress.unlockedAllies,
    progress.seenSpecies,
    progress.allyLevels,
    progress.evolutionChoices,
  ]);

  const caughtCount = entries.filter((entry) => entry.status === "caught").length;
  const seenCount = entries.filter((entry) => entry.status !== "missing").length;
  const total = entries.length;

  const visible = entries.filter((entry) => {
    if (filter === "all") return true;
    if (filter === "caught") return entry.status === "caught";
    if (filter === "seen") return entry.status === "seen";
    return entry.status === "missing";
  });

  const selected = selectedId ? entries.find((entry) => entry.speciesId === selectedId) ?? null : null;

  return (
    <div className="modal-backdrop pokedex-backdrop" role="dialog" aria-modal="true" aria-label="Pokedex" onClick={onClose}>
      <div
        className="modal-panel pokedex-device"
        data-skin={skin.id}
        data-layout={skin.layout}
        data-view={selected ? "detail" : "list"}
        style={skin.vars as CSSProperties}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="pokedex-titlebar">
          <span className="pokedex-led" aria-hidden />
          <h2>{"Pok\u00e9dex"}</h2>
          <span className="pokedex-counts">
            Caught <strong>{caughtCount}</strong>{" \u00b7 "} Seen <strong>{seenCount}</strong> / {total}
          </span>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            {"\u00d7"}
          </button>
        </header>

        <div className="pokedex-panes">
          <section className="pokedex-screen pokedex-list" aria-label="Entries">
            <div className="pokedex-filter">
              <label>
                Show
                <select value={filter} onChange={(event) => setFilter(event.target.value as DexFilter)}>
                  <option value="all">All</option>
                  <option value="caught">Caught</option>
                  <option value="seen">Seen only</option>
                  <option value="missing">Undiscovered</option>
                </select>
              </label>
            </div>
            <div className="pokedex-grid">
              {visible.map((entry) => (
                <button
                  key={entry.speciesId}
                  className={`pokedex-cell pokedex-cell-${entry.status} ${
                    entry.speciesId === selectedId ? "pokedex-cell-active" : ""
                  }`}
                  disabled={entry.status === "missing"}
                  onClick={() => setSelectedId(entry.speciesId)}
                >
                  <span className="pokedex-cell-no">{dexNumber(entry.number)}</span>
                  <DexSprite entry={entry} sprites={sprites} />
                  <span className="pokedex-cell-name">{entry.status === "missing" ? "???" : entry.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="pokedex-screen pokedex-detail-pane" aria-label="Entry detail">
            {selected ? (
              <DexDetail
                entry={selected}
                sprites={sprites}
                detail={details?.[selected.speciesId] ?? null}
                line={evolutionLine(selected.speciesId, evolutions)}
                onBack={() => setSelectedId(null)}
              />
            ) : (
              <div className="pokedex-empty">
                <span className="pokedex-empty-mark">?</span>
                <p>Select an entry to view its data.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function DexSprite({ entry, sprites, large }: { entry: DexEntry; sprites: Record<string, string> | null; large?: boolean }) {
  // Anything not yet caught shows as a darkened silhouette (unseen included).
  const className = `pokedex-portrait ${large ? "pokedex-portrait-large" : ""} ${
    entry.status === "caught" ? "" : "pokedex-portrait-silhouette"
  }`;
  const url = sprites?.[entry.speciesId];
  if (url) {
    return <img className={className} src={url} alt={entry.status === "caught" ? entry.name : "Unknown"} loading="lazy" />;
  }
  return (
    <span
      className={className}
      style={{ backgroundColor: entry.status === "caught" ? entry.color ?? "#94a3b8" : "#1f2937", borderRadius: "50%" }}
    />
  );
}

function DexDetail({
  entry,
  sprites,
  detail,
  line,
  onBack,
}: {
  entry: DexEntry;
  sprites: Record<string, string> | null;
  detail: SpeciesDetail | null;
  line: { name: string; trigger: string }[];
  onBack: () => void;
}) {
  const { ally, status } = entry;
  const caught = status === "caught";
  return (
    <div className="pokedex-entry">
      <button className="pokedex-back" onClick={onBack}>
        {"\u2190 Entries"}
      </button>

      <div className="pokedex-entry-head">
        <span className="pokedex-number">{dexNumber(entry.number)}</span>
        <h3>{entry.name}</h3>
        <div className="pokedex-types">
          {entry.types.map((type) => (
            <span key={type} className="type-chip" style={{ backgroundColor: typeColor(type) }}>
              {type}
            </span>
          ))}
        </div>
      </div>

      <div className="pokedex-art">
        <DexSprite entry={entry} sprites={sprites} large />
      </div>

      {detail?.genus ? <p className="pokedex-genus">{detail.genus}</p> : null}

      <div className="pokedex-badges">
        {ally ? <b className="rarity-stars">{"\u2605".repeat(ally.rarity)}</b> : null}
        {ally ? <b className={`role-badge role-${ally.role}`}>{ally.role}</b> : null}
        <b className={`dex-badge dex-badge-${status}`}>{caught ? "\u2713 Caught" : "Seen"}</b>
      </div>

      {detail?.flavorText ? <p className="pokedex-flavor">"{detail.flavorText}"</p> : null}

      {detail && (detail.heightM > 0 || detail.weightKg > 0 || detail.habitat) ? (
        <div className="pokedex-vitals">
          {detail.heightM > 0 ? (
            <span>
              <small>Height</small>
              {detail.heightM.toFixed(1)} m
            </span>
          ) : null}
          {detail.weightKg > 0 ? (
            <span>
              <small>Weight</small>
              {detail.weightKg.toFixed(1)} kg
            </span>
          ) : null}
          {detail.habitat ? (
            <span>
              <small>Habitat</small>
              {titleCase(detail.habitat)}
            </span>
          ) : null}
        </div>
      ) : null}

      {entry.stats ? (
        <div className="pokedex-stats">
          <StatRow label="HP" value={entry.stats.hp} max={160} />
          <StatRow label="ATK" value={entry.stats.attack} max={140} />
          <StatRow label="DEF" value={entry.stats.defense} max={140} />
          <StatRow label="SPD" value={entry.stats.speed} max={120} />
        </div>
      ) : null}

      {caught && ally ? (
        <>
          <p className="pokedex-passive">
            <strong>{ally.passive.name}</strong>{" \u2014 "}{ally.passive.description}
          </p>
          <div className="pokedex-moves">
            {ally.moveNames.map((move) => (
              <span key={move} className="move-chip">
                {move}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {line.length > 1 ? (
        <div className="pokedex-evo" aria-label="Evolution line">
          <small className="pokedex-section-label">Evolution</small>
          <p className="pokedex-evo-line">
            {line.map((step, index) => (
              <span key={step.name}>
                {index > 0 ? <em className="pokedex-evo-arrow">{" \u2192 "}</em> : null}
                {step.name}
                {step.trigger ? <small className="pokedex-evo-trigger"> ({step.trigger})</small> : null}
              </span>
            ))}
          </p>
        </div>
      ) : null}
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
