import type { getAllyOptions } from "../game/battleState";
import type { XpTuning } from "../game/gacha";
import { levelOf, xpInfo } from "../game/gacha";
import { ITEMS } from "../game/items";
import type { PlayerProgress } from "../game/progress";
import { useState } from "react";

type AllyOption = ReturnType<typeof getAllyOptions>[number];
type RoleFilter = "all" | "strike" | "tech" | "support";
type SortMode = "rarity" | "level" | "name";

type PokemonRosterSelectProps = {
  progress: PlayerProgress;
  options: AllyOption[];
  sprites: Record<string, string> | null;
  selected: string[];
  teamSize: number;
  title: string;
  summary: string;
  startLabel: string;
  autoFight: boolean;
  ownedHeldItems: string[];
  xpTuning?: XpTuning;
  // Defaults tuned for the arena flow; the overworld Team picker overrides them.
  backLabel?: string;
  hideAutoFight?: boolean;
  onToggle: (allyId: string) => void;
  onStart: () => void;
  onToggleAutoFight: () => void;
  onBack: () => void;
  onEquipHeld?: (allyId: string, itemId: string | null) => void;
};

export function PokemonRosterSelect({
  progress,
  options,
  sprites,
  selected,
  teamSize,
  title,
  summary,
  startLabel,
  autoFight,
  ownedHeldItems,
  xpTuning,
  backLabel = "← Challenges",
  hideAutoFight = false,
  onToggle,
  onStart,
  onToggleAutoFight,
  onBack,
  onEquipHeld,
}: PokemonRosterSelectProps) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("rarity");
  const visibleOptions = options
    .filter((option) => {
      const unlocked = progress.unlockedAllies.includes(option.id);
      const roleMatch = roleFilter === "all" || option.role === roleFilter;
      return unlocked && roleMatch;
    })
    .sort((left, right) => {
      if (sortMode === "name") {
        return left.name.localeCompare(right.name);
      }
      if (sortMode === "level") {
        return levelOf(progress, right.id) - levelOf(progress, left.id) || right.rarity - left.rarity;
      }
      return right.rarity - left.rarity || left.name.localeCompare(right.name);
    });

  return (
    <>
      <section className="arena-team-header" aria-label="Selected challenge">
        <button className="secondary-tool-button" onClick={onBack}>
          {backLabel}
        </button>
        <div>
          <strong>{title}</strong>
          <small>{summary}</small>
        </div>
        <div className="arena-team-slots" aria-label="Selected team">
          {Array.from({ length: teamSize }, (_, index) => (
            <span key={index} className={selected[index] ? "arena-team-slot-filled" : ""}>
              {selected[index] ? options.find((option) => option.id === selected[index])?.name ?? selected[index] : `Slot ${index + 1}`}
            </span>
          ))}
        </div>
        <div className="arena-team-action">
          <span>
            {selected.length} / {teamSize}
          </span>
          {hideAutoFight ? null : (
            <button className={`auto-fight-toggle ${autoFight ? "auto-fight-toggle-on" : ""}`} onClick={onToggleAutoFight} aria-pressed={autoFight}>
              Auto Fight
            </button>
          )}
          <button className="start-button" disabled={selected.length !== teamSize} onClick={onStart}>
            {startLabel}
          </button>
        </div>
      </section>

      <section className="roster-tools" aria-label="Roster filters">
        <label>
          Role
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}>
            <option value="all">All</option>
            <option value="strike">Strike</option>
            <option value="tech">Tech</option>
            <option value="support">Support</option>
          </select>
        </label>
        <label>
          Sort
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="rarity">Rarity</option>
            <option value="level">Level</option>
            <option value="name">Name</option>
          </select>
        </label>
      </section>

      <div className="select-grid">
        {visibleOptions.map((option) => {
          const level = levelOf(progress, option.id);
          const xp = xpInfo(progress, option.id, xpTuning);
          const isSelected = selected.includes(option.id);
          const slot = selected.indexOf(option.id);
          const sprite = sprites?.[option.spriteId];

          return (
            <div
              key={option.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              className={`select-card ${isSelected ? "select-card-active" : ""}`}
              onClick={() => onToggle(option.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggle(option.id);
                }
              }}
            >
              <div className="select-card-top">
                <div className="select-sprite-frame">
                  {sprite ? <img src={sprite} alt="" className="select-sprite" /> : <span style={{ backgroundColor: option.color }} />}
                </div>
                <span className="select-name">
                  <i style={{ backgroundColor: option.color }} />
                  {option.name}
                  {isSelected ? <em className="select-slot">#{slot + 1}</em> : null}
                  <b className="rarity-stars">{"★".repeat(option.rarity)}</b>
                  <b className={`role-badge role-${option.role}`}>{option.role}</b>
                </span>
              </div>
              <span className="select-types">{option.types.join(" / ")}</span>
              <span className="select-stats">
                HP {option.baseStats.hp} ATK {option.baseStats.attack} DEF {option.baseStats.defense} SPD {option.baseStats.speed}
              </span>
              <span className="select-passive">{option.passive.name}</span>
              <span className="select-moves">{option.moveNames.join(" · ")}</span>
              <span className="select-level-line">
                <em>
                  Lv {level}
                  {option.nextEvolutionLevel ? ` · evolves Lv ${option.nextEvolutionLevel}` : ""}
                </em>
              </span>
              {xp.atMax ? null : (
                <div
                  className="xp-bar"
                  role="progressbar"
                  aria-valuenow={xp.current}
                  aria-valuemax={xp.needed}
                  title={`${xp.current} / ${xp.needed} XP to next level`}
                >
                  <span style={{ width: `${Math.min(100, Math.round((xp.current / xp.needed) * 100))}%` }} />
                  <small>
                    XP {xp.current}/{xp.needed}
                  </small>
                </div>
              )}
              {onEquipHeld ? (
                <label className="held-item-line" onClick={(event) => event.stopPropagation()}>
                  Held
                  <select
                    value={progress.heldItems[option.id] ?? ""}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onEquipHeld(option.id, event.target.value || null)}
                  >
                    <option value="">— none —</option>
                    {Array.from(new Set([progress.heldItems[option.id], ...ownedHeldItems].filter(Boolean))).map((itemId) => (
                      <option key={itemId} value={itemId as string}>
                        {ITEMS[itemId as string]?.name ?? itemId}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          );
        })}
      </div>

    </>
  );
}
