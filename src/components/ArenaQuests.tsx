import type { AchievementDef } from "../game/achievements";
import { ACHIEVEMENTS } from "../game/achievements";
import type { PullResult } from "../game/gacha";
import { MULTI_PULL_COST, MULTI_PULL_COUNT, PULL_COST, canMultiPull, canPull } from "../game/gacha";
import type { PlayerProgress } from "../game/progress";

type ArenaQuestsProps = {
  progress: PlayerProgress;
  lastPulls: PullResult[] | null;
  recentAchievements: AchievementDef[] | null;
  allyCount: number;
  selectedCount: number;
  teamSize: number;
  dailyKey: string;
  dailyReward: number;
  dailyCleared: boolean;
  onPull: () => void;
  onMultiPull: () => void;
  onStartDaily: () => void;
};

export function ArenaQuests({
  progress,
  lastPulls,
  recentAchievements,
  allyCount,
  selectedCount,
  teamSize,
  dailyKey,
  dailyReward,
  dailyCleared,
  onPull,
  onMultiPull,
  onStartDaily,
}: ArenaQuestsProps) {
  return (
    <>
      <section className="scout-bar" aria-label="Scout">
        <span className="gems-chip">💎 {progress.gems}</span>
        <button className="scout-button" disabled={!canPull(progress)} onClick={onPull}>
          Scout ×1 — {PULL_COST} gems
        </button>
        <button className="scout-button" disabled={!canMultiPull(progress)} onClick={onMultiPull}>
          Scout ×{MULTI_PULL_COUNT} — {MULTI_PULL_COST} gems
        </button>
        <button className="daily-button" disabled={selectedCount !== teamSize} onClick={onStartDaily}>
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
            {progress.unlockedAllies.length < allyCount
              ? `${allyCount - progress.unlockedAllies.length} allies left to discover`
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
    </>
  );
}
