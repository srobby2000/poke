import { useState } from "react";
import type { AchievementDef } from "../game/achievements";
import { ACHIEVEMENTS } from "../game/achievements";
import type { PokemonBaseStats } from "../game/battleState";
import { BALANCE, getAllyOptions } from "../game/battleState";
import type { PullResult } from "../game/gacha";
import { MULTI_PULL_COST, MULTI_PULL_COUNT, PULL_COST, canMultiPull, canPull, levelOf, levelUpCost } from "../game/gacha";
import type { PlayerProgress } from "../game/progress";

const TEAM_SIZE = 3;

type RosterFilter = "all" | "unlocked" | "locked";
type RoleFilter = "all" | "strike" | "tech" | "support";
type SortMode = "rarity" | "level" | "name";

type TeamSelectProps = {
  progress: PlayerProgress;
  lastPulls: PullResult[] | null;
  recentAchievements: AchievementDef[] | null;
  statsSource: "live" | "bundled";
  speciesStats: Record<string, PokemonBaseStats> | null;
  dailyKey: string;
  dailyReward: number;
  dailyCleared: boolean;
  onStart: (allyIds: string[]) => void;
  onStartDaily: (allyIds: string[]) => void;
  onPull: () => void;
  onMultiPull: () => void;
  onLevelUp: (allyId: string) => void;
  onResetSave: () => void;
  onExportSave: () => string;
  onImportSave: (raw: string) => boolean;
  onBack?: () => void;
};

export function TeamSelect({
  progress,
  lastPulls,
  recentAchievements,
  statsSource,
  speciesStats,
  dailyKey,
  dailyReward,
  dailyCleared,
  onStart,
  onStartDaily,
  onPull,
  onMultiPull,
  onLevelUp,
  onResetSave,
  onExportSave,
  onImportSave,
  onBack,
}: TeamSelectProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [revealOpen, setRevealOpen] = useState(false);
  const [saveText, setSaveText] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("rarity");
  const options = getAllyOptions(speciesStats ?? undefined, progress.allyLevels);
  const visibleOptions = options
    .filter((option) => {
      const unlocked = progress.unlockedAllies.includes(option.id);
      const rosterMatch = rosterFilter === "all" || (rosterFilter === "unlocked" ? unlocked : !unlocked);
      const roleMatch = roleFilter === "all" || option.role === roleFilter;
      return rosterMatch && roleMatch;
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

  const toggle = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) {
        return current.filter((existing) => existing !== id);
      }
      return current.length < TEAM_SIZE ? [...current, id] : current;
    });
  };

  return (
    <main className="app-shell select-screen">
      <header className="select-header">
        {onBack ? (
          <button className="back-button" onClick={onBack}>
            ← Back to Village
          </button>
        ) : null}
        <h1>Creature Masters Battle</h1>
        <p>
          Pick three allies to challenge rotating rival squads.
          {progress.bestStage > 0 ? ` Best stage cleared: ${progress.bestStage}.` : " Clear stages to earn gems."}
        </p>
        <small>Base stats: {statsSource === "live" ? "live from PokeAPI" : "bundled"}</small>
      </header>

      <section className="scout-bar" aria-label="Scout">
        <span className="gems-chip">💎 {progress.gems}</span>
        <button
          className="scout-button"
          disabled={!canPull(progress)}
          onClick={() => {
            onPull();
            setRevealOpen(true);
          }}
        >
          Scout ×1 — {PULL_COST} gems
        </button>
        <button
          className="scout-button"
          disabled={!canMultiPull(progress)}
          onClick={() => {
            onMultiPull();
            setRevealOpen(true);
          }}
        >
          Scout ×{MULTI_PULL_COUNT} — {MULTI_PULL_COST} gems
        </button>
        <button className="daily-button" disabled={selected.length !== TEAM_SIZE} onClick={() => onStartDaily(selected)}>
          Daily Challenge
        </button>
        {lastPulls && lastPulls.length > 0 ? (
          <span className={`pull-banner ${lastPulls.some((pull) => pull.isNew) ? "pull-banner-new" : ""}`}>
            {lastPulls.length === 1
              ? lastPulls[0].isNew
                ? `NEW ${"★".repeat(lastPulls[0].rarity)} ${lastPulls[0].name}!`
                : `${lastPulls[0].name} → Lv ${lastPulls[0].level}`
              : `×${lastPulls.length}: ${lastPulls.filter((pull) => pull.isNew).length} new, ${lastPulls.filter((pull) => !pull.isNew).length} level-ups`}
          </span>
        ) : (
          <span className="pull-banner pull-banner-hint">
            {progress.unlockedAllies.length < options.length
              ? `${options.length - progress.unlockedAllies.length} allies left to discover`
              : "All allies recruited — pulls now level them up"}
          </span>
        )}
        <span className={`pull-banner ${dailyCleared ? "" : "pull-banner-new"}`}>
          {dailyCleared ? `Daily ${dailyKey} claimed` : `Daily ${dailyKey}: +${dailyReward} gems`}
        </span>
        {recentAchievements && recentAchievements.length > 0 ? (
          <span className="pull-banner pull-banner-new">
            🏆 {recentAchievements.map((achievement) => achievement.name).join(", ")} (+
            {recentAchievements.reduce((sum, achievement) => sum + achievement.reward, 0)} 💎)
          </span>
        ) : null}
      </section>

      <section className="achievements-bar" aria-label="Achievements">
        {ACHIEVEMENTS.map((achievement) => {
          const earned = progress.achievements.includes(achievement.id);
          return (
            <div key={achievement.id} className={`achievement-chip ${earned ? "achievement-earned" : ""}`}>
              <strong>
                {earned ? "✓ " : ""}
                {achievement.name}
              </strong>
              <small>{earned ? "Claimed" : `${achievement.description} · +${achievement.reward} 💎`}</small>
            </div>
          );
        })}
      </section>

      <section className="save-tools" aria-label="Save tools">
        <div className="save-actions">
          <button
            className="secondary-tool-button"
            onClick={() => {
              setSaveText(onExportSave());
              setSaveMessage("Save exported.");
            }}
          >
            Export Save
          </button>
          <button
            className="secondary-tool-button"
            onClick={() => {
              const ok = onImportSave(saveText);
              setSaveMessage(ok ? "Save imported." : "Import failed.");
            }}
          >
            Import Save
          </button>
          <button
            className="danger-tool-button"
            onClick={() => {
              onResetSave();
              setSaveText("");
              setSaveMessage("Save reset.");
            }}
          >
            Reset Save
          </button>
        </div>
        <textarea
          aria-label="Save import export text"
          value={saveText}
          onChange={(event) => setSaveText(event.target.value)}
          placeholder="Exported save JSON appears here. Paste save JSON here to import."
        />
        {saveMessage ? <small>{saveMessage}</small> : null}
      </section>

      <section className="roster-tools" aria-label="Roster filters">
        <label>
          Roster
          <select value={rosterFilter} onChange={(event) => setRosterFilter(event.target.value as RosterFilter)}>
            <option value="all">All</option>
            <option value="unlocked">Unlocked</option>
            <option value="locked">Locked</option>
          </select>
        </label>
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
          const unlocked = progress.unlockedAllies.includes(option.id);
          const level = levelOf(progress, option.id);
          const cost = levelUpCost(level);
          const isSelected = selected.includes(option.id);
          const slot = selected.indexOf(option.id);

          if (!unlocked) {
            return (
              <div key={option.id} className="select-card select-card-locked">
                <span className="select-name">
                  <i style={{ backgroundColor: "#475569" }} />
                  {option.name}
                  <b className="rarity-stars">{"★".repeat(option.rarity)}</b>
                </span>
                <span className="select-types">{option.types.join(" / ")}</span>
                <span className="select-locked-hint">
                  {option.source === "wild" ? "Locked — found in the wild on Route 1" : "Locked — scout to recruit"}
                </span>
              </div>
            );
          }

          return (
            <div
              key={option.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              className={`select-card ${isSelected ? "select-card-active" : ""}`}
              onClick={() => toggle(option.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggle(option.id);
                }
              }}
            >
              <span className="select-name">
                <i style={{ backgroundColor: option.color }} />
                {option.name}
                {isSelected ? <em className="select-slot">#{slot + 1}</em> : null}
                <b className="rarity-stars">{"★".repeat(option.rarity)}</b>
                <b className={`role-badge role-${option.role}`}>{option.role}</b>
              </span>
              <span className="select-types">{option.types.join(" / ")}</span>
              <span className="select-stats">
                HP {option.baseStats.hp} ATK {option.baseStats.attack} DEF {option.baseStats.defense} SPD {option.baseStats.speed}
              </span>
              <span className="select-passive">{option.passive.name}</span>
              <span className="select-moves">{option.moveNames.join(" · ")}</span>
              <span className="select-level-line">
                <em>
                  Lv {level}
                  {level > 1 ? ` (+${Math.round(BALANCE.allyLevelGrowth * (level - 1) * 100)}%)` : ""}
                  {option.nextEvolutionLevel ? ` · evolves Lv ${option.nextEvolutionLevel}` : ""}
                </em>
                {level < BALANCE.maxAllyLevel ? (
                  <button
                    className="level-button"
                    disabled={progress.gems < cost}
                    onClick={(event) => {
                      event.stopPropagation();
                      onLevelUp(option.id);
                    }}
                  >
                    Level up — {cost} 💎
                  </button>
                ) : (
                  <small className="level-max">MAX</small>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <footer className="select-footer">
        <span>{selected.length} / {TEAM_SIZE} selected</span>
        <button className="start-button" disabled={selected.length !== TEAM_SIZE} onClick={() => onStart(selected)}>
          Start Battle
        </button>
      </footer>

      {revealOpen && lastPulls && lastPulls.length > 0 ? (
        <div className="reveal-overlay" role="dialog" aria-modal="true" aria-label="Scout results" onClick={() => setRevealOpen(false)}>
          <div className="reveal-panel" onClick={(event) => event.stopPropagation()}>
            <h2>{lastPulls.length > 1 ? `Scout ×${lastPulls.length}` : "Scout result"}</h2>
            <div className="reveal-grid">
              {lastPulls.map((pull, index) => (
                <div
                  key={`${pull.allyId}-${index}`}
                  className={`reveal-card reveal-rarity-${pull.rarity} ${pull.isNew ? "reveal-card-new" : ""}`}
                  style={{ animationDelay: `${index * 0.14}s` }}
                >
                  <span className="reveal-stars">{"★".repeat(pull.rarity)}</span>
                  <strong>{pull.name}</strong>
                  <small>{pull.isNew ? "NEW recruit!" : `Level up → Lv ${pull.level}`}</small>
                </div>
              ))}
            </div>
            <button className="start-button" onClick={() => setRevealOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
