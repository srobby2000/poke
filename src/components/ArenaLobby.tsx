import { Suspense, lazy } from "react";
import type { AchievementDef } from "../game/achievements";
import { ACHIEVEMENTS } from "../game/achievements";
import type { PullResult } from "../game/gacha";
import { MULTI_PULL_COST, MULTI_PULL_COUNT, PULL_COST, canMultiPull, canPull } from "../game/gacha";
import type { PlayerProgress } from "../game/progress";

export type ArenaChallenge = "ladder" | "daily";

const ArenaLobbyStage = lazy(() => import("./ArenaLobbyStage").then((module) => ({ default: module.ArenaLobbyStage })));

type ArenaLobbyProps = {
  progress: PlayerProgress;
  lastPulls: PullResult[] | null;
  recentAchievements: AchievementDef[] | null;
  allyCount: number;
  dailyKey: string;
  dailyReward: number;
  dailyCleared: boolean;
  onChooseChallenge: (challenge: ArenaChallenge) => void;
  onPull: () => void;
  onMultiPull: () => void;
  onOpenUpgrades: () => void;
};

export function ArenaLobby({
  progress,
  lastPulls,
  recentAchievements,
  allyCount,
  dailyKey,
  dailyReward,
  dailyCleared,
  onChooseChallenge,
  onPull,
  onMultiPull,
  onOpenUpgrades,
}: ArenaLobbyProps) {
  return (
    <div className="arena-lobby">
      <section className="arena-stage-panel" aria-label="Arena lobby">
        <Suspense fallback={<div className="arena-stage-loading">Opening arena…</div>}>
          <ArenaLobbyStage
            bestStage={progress.bestStage}
            dailyKey={dailyKey}
            dailyReward={dailyReward}
            dailyCleared={dailyCleared}
            onChooseChallenge={onChooseChallenge}
            onOpenUpgrades={onOpenUpgrades}
          />
        </Suspense>
      </section>

      <section className="arena-lobby-panel" aria-label="Scout office">
        <div className="arena-panel-head">
          <span className="gems-chip">💎 {progress.gems}</span>
          <strong>Scout Office</strong>
        </div>
        <div className="arena-scout-actions">
          <button className="scout-button" disabled={!canPull(progress)} onClick={onPull}>
            Scout ×1 — {PULL_COST}
          </button>
          <button className="scout-button" disabled={!canMultiPull(progress)} onClick={onMultiPull}>
            Scout ×{MULTI_PULL_COUNT} — {MULTI_PULL_COST}
          </button>
        </div>
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
            {progress.unlockedAllies.length < allyCount
              ? `${allyCount - progress.unlockedAllies.length} allies left to discover`
              : "All allies recruited — pulls now level them up"}
          </span>
        )}
      </section>

      <section className="arena-lobby-panel arena-quest-board" aria-label="Quest board">
        <div className="arena-panel-head">
          <strong>Quest Board</strong>
          {recentAchievements && recentAchievements.length > 0 ? (
            <span className="pull-banner pull-banner-new">
              +{recentAchievements.reduce((sum, achievement) => sum + achievement.reward, 0)} 💎
            </span>
          ) : null}
        </div>
        <div className="achievements-bar">
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
        </div>
      </section>
    </div>
  );
}
