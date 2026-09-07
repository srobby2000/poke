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
        <div className="arena-showcase-heading">
          <span className="arena-eyebrow">YOUR NEXT ADVENTURE</span>
          <h2>Great teams start here.</h2>
          <p>Meet your partners. Find your rhythm. Take on the arena.</p>
        </div>
        <Suspense fallback={<div className="arena-stage-loading">Opening arena…</div>}>
          <ArenaLobbyStage />
        </Suspense>
        <div className="arena-showcase-caption"><span>Bulbasaur <small>GRASS</small></span><span>Charmander <small>FIRE</small></span><span>Squirtle <small>WATER</small></span></div>
        <p className="arena-orbit-hint">Drag to look around</p>
      </section>

      <section className="arena-challenges" aria-label="Choose your adventure">
        <div className="arena-panel-head"><strong>Choose your challenge</strong><span className="arena-eyebrow">3 vs 3</span></div>
        <button className="arena-challenge-card arena-challenge-primary" onClick={() => onChooseChallenge("ladder")}>
          <span>THE ARENA <b aria-hidden="true">↗</b></span>
          <strong>Battle Streak</strong>
          <small>{progress.bestStage > 0 ? `Personal best · Stage ${progress.bestStage}` : "Build a team and begin your climb"}</small>
        </button>
        <button className="arena-challenge-card" disabled={dailyCleared} onClick={() => onChooseChallenge("daily")}>
          <span>DAILY CHALLENGE <b aria-hidden="true">{dailyCleared ? "✓" : "↗"}</b></span>
          <strong>{dailyCleared ? "Challenge complete" : `Earn ${dailyReward} gems`}</strong>
          <small>{dailyCleared ? `Reward claimed · ${dailyKey}` : "A fresh rival squad. One daily reward."}</small>
        </button>
        <button className="arena-training-link" onClick={onOpenUpgrades}><span>Train your Pokémon<small>Level up, evolve and equip your partners</small></span><span aria-hidden="true">→</span></button>
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
