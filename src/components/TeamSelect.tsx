import { useState } from "react";
import type { AchievementDef } from "../game/achievements";
import type { PokemonBaseStats } from "../game/battleState";
import { getAllyOptions } from "../game/battleState";
import type { PullResult } from "../game/gacha";
import type { XpTuning } from "../game/gacha";
import { isHeldItem } from "../game/heldItems";
import type { PlayerProgress } from "../game/progress";
import { ArenaLobby } from "./ArenaLobby";
import type { ArenaChallenge } from "./ArenaLobby";
import { ArenaSaveTools } from "./ArenaSaveTools";
import { PokemonRosterSelect } from "./PokemonRosterSelect";
import { PokemonUpgradeWindow } from "./PokemonUpgradeWindow";

const TEAM_SIZE = 3;

type TeamSelectProps = {
  progress: PlayerProgress;
  lastPulls: PullResult[] | null;
  recentAchievements: AchievementDef[] | null;
  initialChallenge?: ArenaChallenge | null;
  statsSource: "live" | "bundled";
  speciesStats: Record<string, PokemonBaseStats> | null;
  sprites: Record<string, string> | null;
  dailyKey: string;
  dailyReward: number;
  dailyCleared: boolean;
  onStart: (allyIds: string[], autoFight: boolean) => void;
  onStartDaily: (allyIds: string[], autoFight: boolean) => void;
  onPull: () => void;
  onMultiPull: () => void;
  onLevelUp: (allyId: string) => void;
  onResetSave: () => void;
  onExportSave: () => string;
  onImportSave: (raw: string) => boolean;
  onBack?: () => void;
  onOpenPokedex?: () => void;
  onOpenSettings?: () => void;
  xpTuning?: XpTuning;
  onEquipHeld?: (allyId: string, itemId: string | null) => void;
};

export function TeamSelect({
  progress,
  lastPulls,
  recentAchievements,
  initialChallenge = null,
  statsSource,
  speciesStats,
  sprites,
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
  onOpenPokedex,
  onOpenSettings,
  xpTuning,
  onEquipHeld,
}: TeamSelectProps) {
  // Held items currently in the bag, available to equip.
  const ownedHeldItems = Object.keys(progress.inventory).filter(
    (id) => isHeldItem(id) && (progress.inventory[id] ?? 0) > 0,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [revealOpen, setRevealOpen] = useState(false);
  const [saveText, setSaveText] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ArenaChallenge | null>(initialChallenge);
  const [systemOpen, setSystemOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [autoFight, setAutoFight] = useState(false);
  const options = getAllyOptions(speciesStats ?? undefined, progress.allyLevels);

  const toggle = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) {
        return current.filter((existing) => existing !== id);
      }
      return current.length < TEAM_SIZE ? [...current, id] : current;
    });
  };

  const challengeTitle = challenge === "daily" ? "Daily Challenge" : "Battle Streak";
  const challengeSummary =
    challenge === "daily"
      ? dailyCleared
        ? `Daily ${dailyKey} reward already claimed.`
        : `Daily ${dailyKey}: clear one fixed squad for ${dailyReward} gems.`
      : progress.bestStage > 0
        ? `Best stage cleared: ${progress.bestStage}.`
        : "Clear stages to earn gems.";

  return (
    <main className="app-shell select-screen">
      <header className="select-header">
        {onBack ? (
          <button className="back-button" onClick={onBack}>
            ← Back to Village
          </button>
        ) : null}
        {onOpenPokedex ? (
          <button className="back-button pokedex-button" onClick={onOpenPokedex}>
            📕 Pokédex
          </button>
        ) : null}
        {onOpenSettings ? (
          <button className="back-button" onClick={onOpenSettings}>
            ⚙️ Settings
          </button>
        ) : null}
        <button className="back-button" onClick={() => setSystemOpen((open) => !open)}>
          System
        </button>
        <button className="back-button" onClick={() => setUpgradeOpen(true)}>
          Upgrade
        </button>
        <h1>Creature Masters Battle</h1>
        <p>
          Choose a challenge, prepare three allies, then enter the arena.
          {progress.bestStage > 0 ? ` Best stage cleared: ${progress.bestStage}.` : ""}
        </p>
        <small>Base stats: {statsSource === "live" ? "live from PokeAPI" : "bundled"}</small>
      </header>

      {systemOpen ? (
        <ArenaSaveTools
          saveText={saveText}
          saveMessage={saveMessage}
          onSaveTextChange={setSaveText}
          onExportSave={() => {
            setSaveText(onExportSave());
            setSaveMessage("Save exported.");
          }}
          onImportSave={() => {
            const ok = onImportSave(saveText);
            setSaveMessage(ok ? "Save imported." : "Import failed.");
          }}
          onResetSave={() => {
            onResetSave();
            setSaveText("");
            setSaveMessage("Save reset.");
          }}
        />
      ) : null}

      {challenge ? (
        <PokemonRosterSelect
          progress={progress}
          options={options}
          sprites={sprites}
          selected={selected}
          teamSize={TEAM_SIZE}
          title={challengeTitle}
          summary={challengeSummary}
          startLabel={challenge === "daily" ? "Start Daily" : "Start Battle"}
          autoFight={autoFight}
          ownedHeldItems={ownedHeldItems}
          xpTuning={xpTuning}
          onToggle={toggle}
          onToggleAutoFight={() => setAutoFight((enabled) => !enabled)}
          onBack={() => setChallenge(null)}
          onStart={() => (challenge === "daily" ? onStartDaily(selected, autoFight) : onStart(selected, autoFight))}
          onEquipHeld={onEquipHeld}
        />
      ) : (
        <ArenaLobby
          progress={progress}
          lastPulls={lastPulls}
          recentAchievements={recentAchievements}
          allyCount={options.length}
          dailyKey={dailyKey}
          dailyReward={dailyReward}
          dailyCleared={dailyCleared}
          onChooseChallenge={(nextChallenge) => {
            setSelected([]);
            setChallenge(nextChallenge);
          }}
          onPull={() => {
            onPull();
            setRevealOpen(true);
          }}
          onMultiPull={() => {
            onMultiPull();
            setRevealOpen(true);
          }}
          onOpenUpgrades={() => setUpgradeOpen(true)}
        />
      )}

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

      {upgradeOpen ? (
        <PokemonUpgradeWindow
          progress={progress}
          options={options}
          sprites={sprites}
          xpTuning={xpTuning}
          onLevelUp={onLevelUp}
          onClose={() => setUpgradeOpen(false)}
        />
      ) : null}
    </main>
  );
}
