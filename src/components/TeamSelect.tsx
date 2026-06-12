import { useState } from "react";
import type { PokemonBaseStats } from "../game/battleState";
import { BALANCE, getAllyOptions } from "../game/battleState";
import type { PullResult } from "../game/gacha";
import { PULL_COST, canPull, levelOf, levelUpCost } from "../game/gacha";
import type { PlayerProgress } from "../game/progress";

const TEAM_SIZE = 3;

type TeamSelectProps = {
  progress: PlayerProgress;
  lastPull: PullResult | null;
  statsSource: "live" | "bundled";
  speciesStats: Record<string, PokemonBaseStats> | null;
  dailyKey: string;
  dailyReward: number;
  dailyCleared: boolean;
  onStart: (allyIds: string[]) => void;
  onStartDaily: (allyIds: string[]) => void;
  onPull: () => void;
  onLevelUp: (allyId: string) => void;
};

export function TeamSelect({
  progress,
  lastPull,
  statsSource,
  speciesStats,
  dailyKey,
  dailyReward,
  dailyCleared,
  onStart,
  onStartDaily,
  onPull,
  onLevelUp,
}: TeamSelectProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const options = getAllyOptions(speciesStats ?? undefined);

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
        <h1>Creature Masters Battle</h1>
        <p>
          Pick three allies to challenge rotating rival squads.
          {progress.bestStage > 0 ? ` Best stage cleared: ${progress.bestStage}.` : " Clear stages to earn gems."}
        </p>
        <small>Base stats: {statsSource === "live" ? "live from PokeAPI" : "bundled"}</small>
      </header>

      <section className="scout-bar" aria-label="Scout">
        <span className="gems-chip">💎 {progress.gems}</span>
        <button className="scout-button" disabled={!canPull(progress)} onClick={onPull}>
          Scout ×1 — {PULL_COST} gems
        </button>
        <button className="daily-button" disabled={selected.length !== TEAM_SIZE} onClick={() => onStartDaily(selected)}>
          Daily Challenge
        </button>
        {lastPull ? (
          <span className={`pull-banner ${lastPull.isNew ? "pull-banner-new" : ""}`}>
            {lastPull.isNew
              ? `NEW ${"★".repeat(lastPull.rarity)} ${lastPull.name}!`
              : `${lastPull.name} → Lv ${lastPull.level}`}
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
      </section>

      <div className="select-grid">
        {options.map((option) => {
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
                <span className="select-locked-hint">Locked — scout to recruit</span>
              </div>
            );
          }

          return (
            <div
              key={option.id}
              role="button"
              tabIndex={0}
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
                <em>Lv {level}{level > 1 ? ` (+${Math.round(BALANCE.allyLevelGrowth * (level - 1) * 100)}%)` : ""}</em>
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
    </main>
  );
}
