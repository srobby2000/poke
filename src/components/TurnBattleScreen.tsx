import { Suspense, lazy, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ApiMoveData, BattleMode, PokemonBaseStats, Unit } from "../game/battleState";
import { getTypeEffectiveness } from "../game/battleTypeChart";
import { battleItemEffect } from "../game/battleItems";
import { ITEMS } from "../game/items";
import { moveTimeline } from "../game/pokemonAnimation";
import { playFeedbackSound, playKoSound } from "../game/sound";
import { typeColor } from "../game/typeColors";
import type { TurnBattleState, TurnCommand, TurnEvent } from "../game/turnBattle";
import { activeUnit, availableMoves, canUse, chooseCommand, createTurnBattle, partyOf, turnBattleReducer, turnDamage } from "../game/turnBattle";
import type { BattleView } from "./TurnBattleCanvas";
import type { BattleSummary } from "../game/achievements";
import type { WildEndSummary } from "../App";

const TurnBattleCanvas = lazy(() => import("./TurnBattleCanvas").then(module => ({ default: module.TurnBattleCanvas })));

type WildSession = { speciesId: string; level: number; balls: Record<string, number>; captureRate?: number };

export type TurnBattleProps = {
  allyIds: string[];
  stage: number;
  battleMode: BattleMode;
  dailyKey?: string;
  enemyTeamId?: string;
  wild?: WildSession;
  isTrainer?: boolean;
  autoFight?: boolean;
  speciesStats: Record<string, PokemonBaseStats> | null;
  allyLevels: Record<string, number>;
  evolutionChoices: Record<string, string>;
  heldItems: Record<string, string>;
  usePokeApiRates: boolean;
  usePokeApiMovesets: boolean;
  moveData: Record<string, ApiMoveData> | null;
  items: Record<string, number>;
  onItemUsed: (itemId: string, quantity: number) => void;
  onBattleCleared: (summary: BattleSummary) => void;
  onWildEnd?: (summary: WildEndSummary) => void;
  onExitToWorld?: () => void;
  onNextStage?: () => void;
  onRetry: () => void;
  onChangeTeam: () => void;
  onBackToLobby: () => void;
};

/** How long each event holds the screen, in seconds. Moves last as long as their animation. */
function eventSeconds(event: TurnEvent) {
  switch (event.kind) {
    case "move": return event.moveId ? Math.max(0.9, moveTimeline(event.moveId).duration + 0.25) : 0.9;
    case "damage": return event.text ? 1.25 : 0.85;
    case "ball": return 2.6;
    case "faint": return 1.3;
    case "sendOut": return 1.05;
    case "withdraw": return 0.7;
    case "end": return 1.2;
    default: return 1.15;
  }
}

type Menu = "main" | "fight" | "party" | "bag";

export function TurnBattle(props: TurnBattleProps) {
  const { battleMode, wild, isTrainer, onItemUsed, onBattleCleared, onWildEnd, onExitToWorld, onNextStage, onRetry, onChangeTeam, onBackToLobby } = props;
  const [state, dispatchRaw] = useReducer(turnBattleReducer, undefined, () => createTurnBattle(undefined, {
    allyIds: props.allyIds, stage: props.stage, battleMode, dailyKey: props.dailyKey, enemyTeamId: props.enemyTeamId, wild,
    speciesStats: props.speciesStats ?? undefined, allyLevels: props.allyLevels, evolutionChoices: props.evolutionChoices, heldItems: props.heldItems,
    usePokeApiRates: props.usePokeApiRates, usePokeApiMovesets: props.usePokeApiMovesets, moveData: props.moveData ?? undefined, items: props.items,
  }));
  const [cursor, setCursor] = useState(0);
  const timing = useRef({ startedAt: 0, seconds: 0 });
  const [menu, setMenu] = useState<Menu>("main");
  const [auto, setAuto] = useState(!!props.autoFight);
  const playing = cursor < state.events.length;
  const current = playing ? state.events[cursor] : null;
  const command = useCallback((next: TurnCommand) => { dispatchRaw({ type: "command", command: next }); setMenu("main"); }, []);

  // Play events one at a time; each advances after its own length.
  useEffect(() => {
    if (!current) return;
    timing.current = { startedAt: performance.now(), seconds: eventSeconds(current) };
    if (current.kind === "damage" && current.effectiveness !== undefined) playFeedbackSound(current.effectiveness > 1 ? "super" : current.effectiveness < 1 ? "resist" : "damage");
    if (current.kind === "faint") playKoSound();
    if (current.kind === "status" && current.status) playFeedbackSound("status");
    if (current.kind === "ball" && current.caught) playFeedbackSound("unity");
    const timer = window.setTimeout(() => setCursor(index => index + 1), eventSeconds(current) * 1000);
    return () => window.clearTimeout(timer);
  }, [current]);
  const skip = useCallback(() => { if (playing) setCursor(index => index + 1); }, [playing]);

  const view = useMemo(() => deriveView(state, cursor), [state, cursor]);
  const ready = !playing && state.status === "playing";
  const forced = ready && state.phase === "forcedSwitch";
  const shownMenu: Menu = forced ? "party" : menu;

  // Auto chooses for the player once the screen is ready.
  useEffect(() => {
    if (!ready || !auto) return;
    const timer = window.setTimeout(() => {
      if (state.phase === "forcedSwitch") command({ type: "switch", unitId: partyOf(state, "ally").find(u => u.hp > 0 && u.id !== state.active.ally)!.id });
      else command(chooseCommand(state, "ally"));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [ready, auto, state, command]);

  // Items are consumed from the save as soon as they're used.
  const previousItems = useRef(state.items);
  useEffect(() => {
    for (const [itemId, before] of Object.entries(previousItems.current)) {
      const now = state.items[itemId] ?? 0;
      if (now < before) onItemUsed(itemId, before - now);
    }
    previousItems.current = state.items;
  }, [state.items, onItemUsed]);

  // Ladder, daily and trainer wins pay out once, when the last message has played.
  const settled = !playing && state.status !== "playing";
  const rewarded = useRef(false);
  useEffect(() => {
    if (settled && state.status === "won" && battleMode !== "wild" && !rewarded.current) {
      rewarded.current = true;
      const allies = partyOf(state, "ally");
      onBattleCleared({ won: true, alliesAlive: allies.filter(u => u.hp > 0).length, alliesTotal: allies.length });
    }
  }, [settled, state, battleMode, onBattleCleared]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === " " || key === "enter") { event.preventDefault(); skip(); return; }
      if (key === "a") { setAuto(value => !value); return; }
      if (key === "escape") { setMenu("main"); return; }
      if (!ready || state.phase !== "choose") return;
      const index = Number(key) - 1;
      const move = activeUnit(state, "ally").moves[index];
      if (move) command({ type: "fight", moveId: move.id });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ready, state, skip, command]);

  const returnToWorld = battleMode === "wild" && onWildEnd
    ? () => onWildEnd({ outcome: state.status === "playing" ? "fled" : state.status, ballsRemaining: state.balls, droppedItem: state.droppedItem })
    : isTrainer ? onExitToWorld : undefined;
  const battleView: BattleView = { ally: view.slots.ally, enemy: view.slots.enemy, current, timing, rival: battleMode !== "wild" };
  const ally = view.slots.ally ? state.units.find(u => u.id === view.slots.ally!.unitId) : null;
  const foe = view.slots.enemy ? state.units.find(u => u.id === view.slots.enemy!.unitId) : null;
  const message = playing ? view.text : forced ? "Choose your next Pokémon." : state.status === "playing" ? `What will ${activeUnit(state, "ally").name} do?` : view.text;
  const title = battleMode === "wild" ? state.opponentName : battleMode === "daily" ? `Daily · ${state.opponentName}` : isTrainer ? state.opponentName : `Stage ${state.config.stage} · ${state.opponentName}`;

  return (
    <main className="app-shell tb-shell" onClick={skip}>
      <Suspense fallback={<div className="canvas-loading">Loading battle…</div>}>
        <TurnBattleCanvas view={battleView} />
      </Suspense>
      <header className="tb-topbar" onClick={event => event.stopPropagation()}>
        <span className="tb-title">{title}</span>
        <span className="tb-turn">Turn {state.turn}</span>
        <button className={`tb-auto ${auto ? "tb-auto-on" : ""}`} aria-pressed={auto} onClick={() => setAuto(value => !value)}>Auto {auto ? "on" : "off"} <kbd>A</kbd></button>
      </header>
      {foe && <InfoBox unit={foe} hp={view.hp[foe.id] ?? foe.maxHp} status={view.status[foe.id]} side="enemy" partyLeft={partyOf(state, "enemy").map(u => (view.hp[u.id] ?? u.maxHp) > 0)} />}
      {ally && <InfoBox unit={ally} hp={view.hp[ally.id] ?? ally.maxHp} status={view.status[ally.id]} side="ally" partyLeft={partyOf(state, "ally").map(u => (view.hp[u.id] ?? u.maxHp) > 0)} />}
      <section className="tb-dock" onClick={event => event.stopPropagation()}>
        <div className="tb-message" aria-live="polite" onClick={skip}>
          <p>{message}</p>
          {playing && <small>Click or press Space to continue</small>}
        </div>
        {ready && <Commands state={state} menu={shownMenu} setMenu={setMenu} command={command} forced={forced} wild={battleMode === "wild"} />}
      </section>
      {settled && <Results state={state} battleMode={battleMode} isTrainer={!!isTrainer} onReturnToWorld={returnToWorld} onNextStage={onNextStage} onRetry={onRetry}
        onChangeTeam={battleMode === "wild" || isTrainer ? undefined : onChangeTeam} onBackToLobby={battleMode === "wild" || isTrainer ? undefined : onBackToLobby} />}
    </main>
  );
}

/** What the screen shows after events up to `cursor`: who is out, HP, status and the latest line. */
function deriveView(state: TurnBattleState, cursor: number) {
  const active: Record<string, string | null> = { ally: null, enemy: null };
  const hp: Record<string, number> = {};
  const status: Record<string, Unit["statusCondition"]> = {};
  const fainted = new Set<string>();
  let text = "";
  for (let i = 0; i <= Math.min(cursor, state.events.length - 1); i++) {
    const event = state.events[i];
    if (event.text) text = event.text;
    if (event.kind === "sendOut" && event.side) active[event.side] = event.unitId!;
    if ((event.kind === "damage" || event.kind === "heal") && event.unitId) hp[event.unitId] = event.hpAfter!;
    if (event.kind === "status" && event.unitId) status[event.unitId] = event.status ?? null;
    if (event.kind === "faint" && event.unitId && i < cursor) fainted.add(event.unitId);
  }
  const slot = (side: "ally" | "enemy") => {
    const id = active[side];
    if (!id) return null;
    const unit = state.units.find(u => u.id === id)!;
    return { unitId: id, species: unit.sourcePokemon, fainted: fainted.has(id) };
  };
  return { slots: { ally: slot("ally"), enemy: slot("enemy") }, hp, status, text };
}

const STATUS_BADGE = { burn: "BRN", poison: "PSN", paralysis: "PAR" } as const;

function InfoBox({ unit, hp, status, side, partyLeft }: { unit: Unit; hp: number; status: Unit["statusCondition"] | undefined; side: "ally" | "enemy"; partyLeft: boolean[] }) {
  const ratio = Math.max(0, hp / unit.maxHp);
  const tone = ratio > 0.5 ? "high" : ratio > 0.2 ? "mid" : "low";
  return (
    <div className={`tb-info tb-info-${side}`} onClick={event => event.stopPropagation()}>
      <div className="tb-info-head">
        <strong>{unit.name.replace(/^Wild /, "")}</strong>
        {status && <span className={`tb-status tb-status-${status}`}>{STATUS_BADGE[status]}</span>}
        <span className="tb-level">Lv{unit.level}</span>
      </div>
      <div className="tb-hp"><span>HP</span><div className="tb-hp-track"><div className={`tb-hp-fill tb-hp-${tone}`} style={{ width: `${ratio * 100}%` }} /></div></div>
      {side === "ally" && <small className="tb-hp-numbers">{Math.max(0, hp)} / {unit.maxHp}</small>}
      <div className="tb-party" aria-label={`${partyLeft.filter(Boolean).length} of ${partyLeft.length} Pokémon able to battle`}>
        {partyLeft.map((ok, index) => <i key={index} className={ok ? "tb-ball-ok" : "tb-ball-out"} />)}
      </div>
    </div>
  );
}

function Commands({ state, menu, setMenu, command, forced, wild }: { state: TurnBattleState; menu: Menu; setMenu: (menu: Menu) => void; command: (command: TurnCommand) => void; forced: boolean; wild: boolean }) {
  const ally = activeUnit(state, "ally");
  const foe = activeUnit(state, "enemy");
  const back = !forced && <button className="tb-back" onClick={() => setMenu("main")}>Back <kbd>Esc</kbd></button>;
  if (menu === "fight") {
    const { sync } = availableMoves(state, "ally");
    return (
      <div className="tb-menu tb-fight">
        {ally.moves.map((move, index) => {
          const effectiveness = getTypeEffectiveness(move.type, foe.types);
          const hint = move.power <= 0 ? move.statChange ? "Stat move" : "Status move" : effectiveness > 1 ? "Super effective" : effectiveness === 0 ? "No effect" : effectiveness < 1 ? "Not very effective" : `~${Math.round(turnDamage(ally, foe, move, null).damage / foe.maxHp * 100)}% HP`;
          return <button key={move.id} className="tb-move" style={{ borderColor: typeColor(move.type) }} onClick={() => command({ type: "fight", moveId: move.id })}>
            <span className="tb-move-name">{move.name} <kbd>{index + 1}</kbd></span>
            <span className="tb-move-meta"><i style={{ background: typeColor(move.type) }}>{move.type}</i>{move.power > 0 ? `Pow ${move.power}` : ""}</span>
            <small className={effectiveness > 1 && move.power > 0 ? "tb-hint-super" : effectiveness < 1 && move.power > 0 ? "tb-hint-weak" : ""}>{hint}</small>
          </button>;
        })}
        <button className="tb-move tb-sync" disabled={!sync} onClick={() => command({ type: "sync" })}>
          <span className="tb-move-name">{sync ? sync.name : "Sync move"}</span>
          <small>{sync ? `Pow ${sync.power} · ready!` : `Charges in ${Math.max(0, 3 - (state.syncCharge[ally.id] ?? 0))} moves`}</small>
        </button>
        {wild && <button className="tb-move" disabled={!canUse(state, { type: "holdBack" })} onClick={() => command({ type: "holdBack" })}><span className="tb-move-name">Hold Back</span><small>Leaves it at 1 HP or more</small></button>}
        {back}
      </div>
    );
  }
  if (menu === "party") {
    return (
      <div className="tb-menu tb-party-menu">
        {partyOf(state, "ally").map(unit => {
          const usable = canUse(state, { type: "switch", unitId: unit.id });
          return <button key={unit.id} className="tb-member" disabled={!usable} onClick={() => command({ type: "switch", unitId: unit.id })}>
            <span className="tb-move-name">{unit.name} <small>Lv{unit.level}</small></span>
            <span className="tb-hp-track"><span className="tb-hp-fill tb-hp-high" style={{ width: `${unit.hp / unit.maxHp * 100}%` }} /></span>
            <small>{unit.id === state.active.ally ? "In battle" : unit.hp <= 0 ? "Fainted" : `${unit.hp} / ${unit.maxHp} HP`}</small>
          </button>;
        })}
        {back}
      </div>
    );
  }
  if (menu === "bag") {
    const items = Object.entries(state.items).filter(([id, count]) => count > 0 && battleItemEffect(id));
    const balls = wild ? Object.entries(state.balls).filter(([, count]) => count > 0) : [];
    const trainer = ally.trainerMove;
    return (
      <div className="tb-menu tb-bag">
        {balls.map(([ballId, count]) => <button key={ballId} className="tb-member" onClick={() => command({ type: "ball", ballId })}><span className="tb-move-name">{ITEMS[ballId]?.name ?? ballId}</span><small>×{count} · throw at {foe.name.replace(/^Wild /, "")}</small></button>)}
        {items.map(([itemId, count]) => <button key={itemId} className="tb-member" disabled={!canUse(state, { type: "item", itemId })} onClick={() => command({ type: "item", itemId })}><span className="tb-move-name">{ITEMS[itemId]?.name ?? itemId}</span><small>×{count}</small></button>)}
        {trainer && <button className="tb-member" disabled={!canUse(state, { type: "trainer" })} onClick={() => command({ type: "trainer" })}><span className="tb-move-name">Trainer: {trainer.name}</span><small>{trainer.description} · {state.trainerUses[ally.id] ?? 0} left</small></button>}
        {!balls.length && !items.length && !trainer && <p className="tb-empty">Nothing usable in battle.</p>}
        {back}
      </div>
    );
  }
  return (
    <div className="tb-menu tb-main">
      <button className="tb-cmd tb-cmd-fight" onClick={() => setMenu("fight")}>Fight</button>
      <button className="tb-cmd tb-cmd-bag" onClick={() => setMenu("bag")}>Bag</button>
      <button className="tb-cmd tb-cmd-party" onClick={() => setMenu("party")}>Pokémon</button>
      <button className="tb-cmd tb-cmd-run" disabled={!wild} title={wild ? undefined : "No running from a trainer battle!"} onClick={() => command({ type: "run" })}>Run</button>
    </div>
  );
}

function Results({ state, battleMode, isTrainer, onReturnToWorld, onNextStage, onRetry, onChangeTeam, onBackToLobby }: {
  state: TurnBattleState; battleMode: BattleMode; isTrainer: boolean; onReturnToWorld?: () => void; onNextStage?: () => void; onRetry: () => void; onChangeTeam?: () => void; onBackToLobby?: () => void;
}) {
  const wild = battleMode === "wild", daily = battleMode === "daily";
  const status = state.status;
  const headline = status === "captured" ? "Caught!" : status === "fled" ? "Got away" : status === "won" ? "Victory" : "Defeat";
  const detail = status === "captured" ? `${state.opponentName.replace(/^Wild /, "")} joined your roster!`
    : status === "fled" ? "You got away safely."
    : status === "won" ? wild ? `The ${state.opponentName.toLowerCase()} fainted.` : daily ? "Daily challenge cleared!" : isTrainer ? `You defeated ${state.opponentName}!` : `Stage ${state.config.stage} cleared!`
    : wild ? "Your team has fallen. The wild Pokémon wanders off." : isTrainer ? "Your team has fallen. Regroup and challenge them again." : `Your team has fallen on stage ${state.config.stage}.`;
  const allies = partyOf(state, "ally");
  return (
    <div className="result-overlay" role="dialog" aria-live="polite" onClick={event => event.stopPropagation()}>
      <div className="result-panel">
        <span>{headline}</span>
        <strong>{detail}</strong>
        {(wild || isTrainer) && onReturnToWorld && <button onClick={onReturnToWorld}>Return to Village</button>}
        {wild && status === "won" && state.droppedItem && <small className="drop-line">Found {state.droppedItem.quantity} × {ITEMS[state.droppedItem.itemId]?.name ?? state.droppedItem.itemId}</small>}
        {!wild && status === "won" && onNextStage && <button onClick={onNextStage}>Continue - Stage {state.config.stage + 1}</button>}
        <div className="battle-report" aria-label="Damage report">
          {[...allies].sort((a, b) => (state.damageDealt[b.id] ?? 0) - (state.damageDealt[a.id] ?? 0)).map(unit => (
            <span key={unit.id}><i style={{ backgroundColor: unit.color }} />{unit.name} — {state.damageDealt[unit.id] ?? 0} dmg</span>
          ))}
        </div>
        {!wild && status === "lost" && <button onClick={onRetry}>{daily ? "Retry Daily" : isTrainer ? "Retry Battle" : `Retry Stage ${state.config.stage}`}</button>}
        {onChangeTeam && <button className="secondary-button" onClick={onChangeTeam}>Change Team</button>}
        {onBackToLobby && <button className="secondary-button" onClick={onBackToLobby}>Back to Lobby</button>}
      </div>
    </div>
  );
}
