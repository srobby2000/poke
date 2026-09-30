import { useCallback, useEffect, useRef, useState } from "react";
import { lobbyArena } from "./game/battleArenas";
import type { BattleArena } from "./game/battleArenas";
import { PokedexModal } from "./components/PokedexModal";
import { SettingsModal } from "./components/SettingsModal";
import { TeamPickerModal } from "./components/TeamPickerModal";
import { ShopScreen } from "./components/ShopScreen";
import { TeamSelect } from "./components/TeamSelect";
import { WorldScreen } from "./components/WorldScreen";
import type { ApiMoveData, BattleMode, PokemonBaseStats } from "./game/battleState";
import { applyApiEvolutionLevels, dailyChallengeKey, dailyChallengeStage, enemyTeamSpeciesIds, getBattleMoveIds } from "./game/battleState";
import { TurnBattle } from "./components/TurnBattleScreen";
import type { AchievementDef, BattleSummary } from "./game/achievements";
import { evaluateAchievements } from "./game/achievements";
import type { PullResult } from "./game/gacha";
import {
  DAILY_CHALLENGE_REWARD,
  applyCapture,
  applyDailyChallengeClear,
  applyStageClear,
  battleXpReward,
  chooseEvolution,
  grantBattleXp,
  performLevelUp,
  performMultiPull,
  performPull,
  wildVictoryReward,
} from "./game/gacha";
import { equipHeldItem, unequipHeldItem } from "./game/heldItems";
import { ITEMS, addItem, itemCount, pickBerry, pickedBerryTiles } from "./game/items";
import type { EvolutionLink, SpeciesDetail } from "./game/pokeApi";
import { fetchGen1Pokedex, fetchMoveData } from "./game/pokeApi";
import type { PlayerProgress } from "./game/progress";
import { defaultProgress, exportProgress, importProgress, loadProgress, saveProgress } from "./game/progress";
import { buyItem, sellItem } from "./game/shop";
import { playFeedbackSound } from "./game/sound";

// The battle's 3D scene (and the ~1MB three.js chunk behind it) loads lazily;
// preloadCanvas() starts the download while the player is still picking a team.
const preloadCanvas = () => import("./components/TurnBattleCanvas");

type WildSession = { speciesId: string; level: number; balls: Record<string, number>; captureRate?: number };

type TrainerSession = {
  id: string;
  name: string;
  teamId: string;
  level: number;
  reward: number;
  isRematch: boolean;
  itemReward?: string;
};

type Session = {
  allyIds: string[];
  stage: number;
  runId: number;
  battleMode: BattleMode;
  dailyKey?: string;
  enemyTeamId?: string;
  wild?: WildSession;
  trainer?: TrainerSession;
  autoFight?: boolean;
  // Overworld battles bring their arena; lobby battles pick one from the stage.
  arena?: BattleArena;
};

const BALL_ITEM_IDS = ["poke-ball", "great-ball"];

// The team taken into wild encounters and overworld trainer battles: the saved
// active team (only its still-unlocked members), falling back to the first three
// unlocked allies when that isn't a full, valid squad.
function resolveOverworldTeam(progress: PlayerProgress): string[] {
  const valid = progress.activeTeam.filter((id) => progress.unlockedAllies.includes(id));
  return valid.length === 3 ? valid : progress.unlockedAllies.slice(0, 3);
}
type ArenaReturnChallenge = "ladder" | "daily";

export type WildEndSummary = {
  outcome: "won" | "lost" | "captured" | "fled";
  ballsRemaining: Record<string, number>;
  droppedItem?: { itemId: string; quantity: number } | null;
};

export default function App() {
  const [speciesStats, setSpeciesStats] = useState<Record<string, PokemonBaseStats> | null>(null);
  const [speciesSprites, setSpeciesSprites] = useState<Record<string, string> | null>(null);
  const [speciesDetails, setSpeciesDetails] = useState<Record<string, SpeciesDetail> | null>(null);
  const [speciesEvolutions, setSpeciesEvolutions] = useState<Record<string, EvolutionLink[]> | null>(null);
  const [speciesTypes, setSpeciesTypes] = useState<Record<string, string[]> | null>(null);
  const [moveData, setMoveData] = useState<Record<string, ApiMoveData> | null>(null);
  const [progress, setProgress] = useState(loadProgress);
  const [lastPulls, setLastPulls] = useState<PullResult[] | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<"world" | "hub" | "shop">("world");
  const [arenaReturnChallenge, setArenaReturnChallenge] = useState<ArenaReturnChallenge | null>(null);
  // The Pokédex, Settings, and Team picker are modals that overlay whichever
  // screen is open.
  const [pokedexOpen, setPokedexOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const todayKey = dailyChallengeKey();

  // Per-ally growth rates + XP tuning derived from the live PokeAPI details.
  const growthRates: Record<string, string> = {};
  if (speciesDetails) {
    for (const [name, detail] of Object.entries(speciesDetails)) {
      growthRates[name] = detail.growthRate;
    }
  }
  const xpTuning = { usePokeApiRates: progress.settings.usePokeApiRates, growthRates };

  // XP a battle awards each ally, scaled by the (average) defeated base experience.
  const battleXp = (stage: number, enemySpeciesIds: string[]) => {
    const exps = enemySpeciesIds
      .map((id) => speciesDetails?.[id]?.baseExperience)
      .filter((value): value is number => typeof value === "number" && value > 0);
    const avg = exps.length > 0 ? exps.reduce((sum, value) => sum + value, 0) / exps.length : undefined;
    return battleXpReward(stage, avg);
  };

  const savePosition = useCallback((position: { mapId: string; x: number; z: number }) => {
    setProgress((current) => ({ ...current, worldPosition: position }));
  }, []);

  // Records species the player has now encountered, for the Pokédex.
  const markSeen = useCallback((speciesIds: string[]) => {
    setProgress((current) => {
      const additions = speciesIds.filter((id) => !current.seenSpecies.includes(id));
      return additions.length === 0 ? current : { ...current, seenSpecies: [...current.seenSpecies, ...additions] };
    });
  }, []);

  // Trainers the player has already rematched today (no further battle).
  const rematchedToday = Object.entries(progress.trainerRematches)
    .filter(([, date]) => date === todayKey)
    .map(([id]) => id);

  // Seeded lazily in the pull handler — impure calls are not allowed in render.
  const pullSeedRef = useRef<number | null>(null);

  const nextPullSeed = () => pullSeedRef.current ?? (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;

  // Every progress change runs through here so achievements unlock (and pay
  // their gem rewards) regardless of which action earned them.
  const [recentAchievements, setRecentAchievements] = useState<AchievementDef[] | null>(null);
  const commitProgress = (next: Parameters<typeof evaluateAchievements>[0], battle?: BattleSummary) => {
    const { progress: evaluated, earned } = evaluateAchievements(next, battle);
    setProgress(evaluated);
    if (earned.length > 0) {
      setRecentAchievements(earned);
      playFeedbackSound("unity");
    }
  };

  const registerPullResults = (results: PullResult[]) => {
    setLastPulls(results);
    const bestNew = results.filter((result) => result.isNew).sort((left, right) => right.rarity - left.rarity)[0];
    if (bestNew?.rarity === 5) {
      playFeedbackSound("sync");
    } else if (bestNew) {
      playFeedbackSound("super");
    } else {
      playFeedbackSound("damage");
    }
  };

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    let cancelled = false;
    void preloadCanvas();
    fetchGen1Pokedex()
      .then((data) => {
        if (!cancelled) {
          setSpeciesStats(data.stats);
          setSpeciesSprites(data.sprites);
          setSpeciesDetails(data.details);
          setSpeciesEvolutions(data.evolutions);
          setSpeciesTypes(data.types);
          // Drive evolution thresholds from the real chains (scaled to our cap).
          applyApiEvolutionLevels(data.evolutions);
        }
      })
      .catch(() => {
        // Offline or API down — bundled stats are identical, so play continues.
      });
    // Move data is only needed for the optional "PokeAPI movesets" setting.
    fetchMoveData(getBattleMoveIds())
      .then((moves) => {
        if (!cancelled) {
          setMoveData(moves);
        }
      })
      .catch(() => {
        // Best-effort — without it, the moveset toggle just keeps bundled moves.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pokedexModal = pokedexOpen ? (
    <PokedexModal
      progress={progress}
      speciesStats={speciesStats}
      sprites={speciesSprites}
      details={speciesDetails}
      evolutions={speciesEvolutions}
      types={speciesTypes}
      onClose={() => setPokedexOpen(false)}
    />
  ) : null;

  const settingsModal = settingsOpen ? (
    <SettingsModal
      settings={progress.settings}
      onChange={(settings) => setProgress((current) => ({ ...current, settings }))}
      onClose={() => setSettingsOpen(false)}
    />
  ) : null;

  const teamPickerModal = teamPickerOpen ? (
    <TeamPickerModal
      progress={progress}
      speciesStats={speciesStats}
      sprites={speciesSprites}
      xpTuning={xpTuning}
      onEquipHeld={(allyId, itemId) => {
        const next = itemId ? equipHeldItem(progress, allyId, itemId) : unequipHeldItem(progress, allyId);
        if (next) {
          commitProgress(next);
        }
      }}
      onSave={(allyIds) => commitProgress({ ...progress, activeTeam: allyIds })}
      onClose={() => setTeamPickerOpen(false)}
    />
  ) : null;

  const overlays = (
    <>
      {pokedexModal}
      {settingsModal}
      {teamPickerModal}
    </>
  );

  if (!session && screen === "world") {
    return (
      <>
      <WorldScreen
        progress={progress}
        pickedBerries={pickedBerryTiles(progress, todayKey)}
        rematchedToday={rematchedToday}
        onOpenPokedex={() => setPokedexOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenTeam={() => setTeamPickerOpen(true)}
        onSavePosition={savePosition}
        onEnterBuilding={(building) => {
          if (building === "arena") {
            setScreen("hub");
          } else if (building === "shop") {
            setScreen("shop");
          }
        }}
        onPickBerry={(tileKey) => {
          const result = pickBerry(progress, tileKey, todayKey);
          if (!result) {
            return "This tree was already picked today. It will regrow tomorrow!";
          }
          commitProgress(result.progress);
          const item = ITEMS[result.itemId];
          return `You picked ${result.quantity} × ${item?.name ?? result.itemId}! Sell them at the shop.`;
        }}
        onStartWild={(encounter) => {
          markSeen([encounter.speciesId]);
          const balls = Object.fromEntries(BALL_ITEM_IDS.map((id) => [id, itemCount(progress, id)]));
          setSession({
            allyIds: resolveOverworldTeam(progress),
            stage: encounter.level,
            runId: 1,
            battleMode: "wild",
            arena: encounter.arena,
            wild: {
              speciesId: encounter.speciesId,
              level: encounter.level,
              balls,
              captureRate: speciesDetails?.[encounter.speciesId]?.captureRate,
            },
          });
        }}
        onStartTrainer={(trainer) => {
          markSeen(enemyTeamSpeciesIds(trainer.teamId));
          // Rematches pay a reduced reward.
          const reward = trainer.isRematch ? Math.max(10, Math.round(trainer.reward * 0.4)) : trainer.reward;
          setSession({
            allyIds: resolveOverworldTeam(progress),
            stage: trainer.level,
            runId: 1,
            battleMode: "trainer",
            arena: trainer.arena,
            enemyTeamId: trainer.teamId,
            trainer: {
              id: trainer.id,
              name: trainer.name,
              teamId: trainer.teamId,
              level: trainer.level,
              reward,
              isRematch: trainer.isRematch,
              itemReward: trainer.itemReward,
            },
          });
        }}
      />
      {overlays}
      </>
    );
  }

  if (!session && screen === "shop") {
    return (
      <ShopScreen
        progress={progress}
        onBack={() => {
          setArenaReturnChallenge(null);
          setScreen("world");
        }}
        onBuy={(itemId, quantity) => {
          const next = buyItem(progress, itemId, quantity);
          if (next) {
            commitProgress(next);
          }
        }}
        onSell={(itemId, quantity) => {
          const next = sellItem(progress, itemId, quantity);
          if (next) {
            commitProgress(next);
          }
        }}
      />
    );
  }

  if (!session) {
    return (
      <>
      <TeamSelect
        progress={progress}
        lastPulls={lastPulls}
        initialChallenge={arenaReturnChallenge}
        onBack={() => {
          setArenaReturnChallenge(null);
          setScreen("world");
        }}
        onOpenPokedex={() => setPokedexOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        xpTuning={xpTuning}
        onEquipHeld={(allyId, itemId) => {
          const next = itemId ? equipHeldItem(progress, allyId, itemId) : unequipHeldItem(progress, allyId);
          if (next) {
            commitProgress(next);
          }
        }}
        recentAchievements={recentAchievements}
        statsSource={speciesStats ? "live" : "bundled"}
        speciesStats={speciesStats}
        sprites={speciesSprites}
        dailyKey={todayKey}
        dailyReward={DAILY_CHALLENGE_REWARD}
        dailyCleared={progress.dailyClearedDate === todayKey}
        onStart={(allyIds, autoFight) => {
          setArenaReturnChallenge(null);
          // Keep the overworld team in sync with the last arena team played.
          commitProgress({ ...progress, activeTeam: allyIds });
          setSession({ allyIds, stage: 1, runId: 1, battleMode: "ladder", autoFight });
        }}
        onStartDaily={(allyIds, autoFight) => {
          setArenaReturnChallenge(null);
          commitProgress({ ...progress, activeTeam: allyIds });
          setSession({ allyIds, stage: dailyChallengeStage(todayKey), runId: 1, battleMode: "daily", dailyKey: todayKey, autoFight });
        }}
        onPull={() => {
          const outcome = performPull(progress, nextPullSeed());
          if (!outcome) {
            return;
          }
          pullSeedRef.current = outcome.nextSeed;
          commitProgress(outcome.progress);
          registerPullResults([outcome.result]);
        }}
        onMultiPull={() => {
          const outcome = performMultiPull(progress, nextPullSeed());
          if (!outcome) {
            return;
          }
          pullSeedRef.current = outcome.nextSeed;
          commitProgress(outcome.progress);
          registerPullResults(outcome.results);
        }}
        onLevelUp={(allyId) => {
          const next = performLevelUp(progress, allyId);
          if (next) {
            commitProgress(next);
          }
        }}
        onChooseEvolution={(allyId, sourcePokemon) => {
          const next = chooseEvolution(progress, allyId, sourcePokemon);
          if (next) {
            commitProgress(next);
          }
        }}
        onResetSave={() => {
          setProgress(defaultProgress());
          setLastPulls(null);
          setRecentAchievements(null);
        }}
        onExportSave={() => exportProgress(progress)}
        onImportSave={(raw) => {
          const imported = importProgress(raw);
          if (!imported) {
            return false;
          }
          setProgress(imported);
          setLastPulls(null);
          setRecentAchievements(null);
          return true;
        }}
      />
      {overlays}
      </>
    );
  }

  return (
    <TurnBattle
      key={`${session.runId}-${session.battleMode}-${session.stage}-${session.dailyKey ?? session.wild?.speciesId ?? session.trainer?.id ?? "ladder"}`}
      allyIds={session.allyIds}
      stage={session.stage}
      battleMode={session.battleMode}
      arena={session.arena ?? lobbyArena(session.battleMode, session.stage, session.dailyKey)}
      dailyKey={session.dailyKey}
      enemyTeamId={session.enemyTeamId}
      wild={session.wild}
      isTrainer={!!session.trainer}
      autoFight={!!session.autoFight}
      speciesStats={speciesStats}
      allyLevels={progress.allyLevels}
      evolutionChoices={progress.evolutionChoices}
      heldItems={progress.heldItems}
      usePokeApiRates={progress.settings.usePokeApiRates}
      usePokeApiMovesets={progress.settings.usePokeApiMovesets}
      battleSpeed={progress.settings.battleSpeed}
      onBattleSpeedChange={(battleSpeed) => setProgress((current) => ({ ...current, settings: { ...current.settings, battleSpeed } }))}
      moveData={moveData}
      items={progress.inventory}
      onItemUsed={(itemId, quantity) => {
        setProgress((current) => ({
          ...current,
          inventory: {
            ...current.inventory,
            [itemId]: Math.max(0, (current.inventory[itemId] ?? 0) - quantity),
          },
        }));
      }}
      onWildEnd={(summary) => {
        const wild = session.wild;
        if (!wild) {
          return;
        }
        let next = progress;
        // Deduct the balls thrown during the battle.
        for (const ballId of BALL_ITEM_IDS) {
          const used = (wild.balls[ballId] ?? 0) - (summary.ballsRemaining[ballId] ?? 0);
          if (used > 0) {
            next = addItem(next, ballId, -used);
          }
        }
        if (summary.outcome === "captured") {
          const captured = applyCapture(next, wild.speciesId).progress;
          next = { ...captured, captures: captured.captures + 1 };
        } else if (summary.outcome === "won") {
          next = { ...next, gems: next.gems + wildVictoryReward(wild.level) };
          if (summary.droppedItem) {
            next = addItem(next, summary.droppedItem.itemId, summary.droppedItem.quantity);
          }
        }
        // Fighting a wild creature (won or caught) trains the team.
        if (summary.outcome === "won" || summary.outcome === "captured") {
          next = grantBattleXp(next, session.allyIds, battleXp(wild.level, [wild.speciesId]), xpTuning);
        }
        commitProgress(next);
        setSession(null);
        setScreen("world");
      }}
      onBattleCleared={(summary) => {
        const trainer = session.trainer;
        if (trainer) {
          // First win: the trainer stays beaten (steps aside in the overworld).
          // Rematch win: record the date so they can be re-challenged tomorrow.
          // No ladder progression either way.
          const firstWin = !progress.defeatedTrainers.includes(trainer.id);
          const defeated = firstWin ? [...progress.defeatedTrainers, trainer.id] : progress.defeatedTrainers;
          let next: typeof progress = {
            ...progress,
            gems: progress.gems + trainer.reward,
            defeatedTrainers: defeated,
            trainerRematches: trainer.isRematch
              ? { ...progress.trainerRematches, [trainer.id]: todayKey }
              : progress.trainerRematches,
          };
          // The first defeat hands over the trainer's held-item reward, if any.
          if (firstWin && trainer.itemReward) {
            next = addItem(next, trainer.itemReward, 1);
          }
          next = grantBattleXp(next, session.allyIds, battleXp(session.stage, enemyTeamSpeciesIds(trainer.teamId)), xpTuning);
          commitProgress(next, summary);
          return;
        }
        let rewarded =
          session.battleMode === "daily" && session.dailyKey
            ? applyDailyChallengeClear(progress, session.dailyKey)
            : applyStageClear(progress, session.stage);
        rewarded = grantBattleXp(rewarded, session.allyIds, battleXp(session.stage, []), xpTuning);
        commitProgress(rewarded, summary);
      }}
      onNextStage={
        session.battleMode === "daily" || session.trainer
          ? undefined
          : () => setSession((current) => current && { ...current, stage: current.stage + 1, runId: current.runId + 1 })
      }
      onExitToWorld={() => {
        setArenaReturnChallenge(null);
        setSession(null);
        setScreen("world");
      }}
      onRetry={() => setSession((current) => current && { ...current, runId: current.runId + 1 })}
      onChangeTeam={() => {
        setArenaReturnChallenge(session.battleMode === "daily" ? "daily" : "ladder");
        setSession(null);
      }}
      onBackToLobby={() => {
        setArenaReturnChallenge(null);
        setSession(null);
      }}
    />
  );
}
