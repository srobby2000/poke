import { Suspense, lazy, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ApiMoveData, BattleMode, PokemonBaseStats, Unit } from "../game/battleState";
import type { BattleArena } from "../game/battleArenas";
import { ARENAS } from "../game/battleArenas";
import { switchMatchup } from "../game/battleMatchup";
import type { BattleSpeed } from "../game/progress";
import { BATTLE_SPEEDS } from "../game/progress";
import { getTypeEffectiveness } from "../game/battleTypeChart";
import { battleItemEffect } from "../game/battleItems";
import { ITEMS } from "../game/items";
import { moveTimeline } from "../game/pokemonAnimation";
import { playFeedbackSound, playKoSound } from "../game/sound";
import { typeColor } from "../game/typeColors";
import type { StageSnapshot, TurnBattleState, TurnCommand, TurnEvent } from "../game/turnBattle";
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
  arena: BattleArena;
  battleSpeed: BattleSpeed;
  onBattleSpeedChange: (speed: BattleSpeed) => void;
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
  const { battleMode, arena, battleSpeed: speed, onBattleSpeedChange, wild, isTrainer, onItemUsed, onBattleCleared, onWildEnd, onExitToWorld, onNextStage, onRetry, onChangeTeam, onBackToLobby } = props;
  const [state, dispatchRaw] = useReducer(turnBattleReducer, undefined, () => createTurnBattle(undefined, {
    allyIds: props.allyIds, stage: props.stage, battleMode, dailyKey: props.dailyKey, enemyTeamId: props.enemyTeamId, wild,
    speciesStats: props.speciesStats ?? undefined, allyLevels: props.allyLevels, evolutionChoices: props.evolutionChoices, heldItems: props.heldItems,
    usePokeApiRates: props.usePokeApiRates, usePokeApiMovesets: props.usePokeApiMovesets, moveData: props.moveData ?? undefined, items: props.items,
  }));
  const [cursor, setCursor] = useState(0);
  const timing = useRef({ startedAt: 0, seconds: 0, rate: 1 });
  const [menu, setMenu] = useState<Menu>("main");
  const [auto, setAuto] = useState(!!props.autoFight);
  const [logOpen, setLogOpen] = useState(false);
  const playing = cursor < state.events.length;
  const current = playing ? state.events[cursor] : null;
  const command = useCallback((next: TurnCommand) => { dispatchRaw({ type: "command", command: next }); setMenu("main"); }, []);

  // Play events one at a time; each advances after its own length, shortened by the speed.
  // The speed is read when an event starts, so changing it applies from the next event.
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => {
    if (!current) return;
    const rate = speedRef.current, seconds = eventSeconds(current) / rate;
    timing.current = { startedAt: performance.now(), seconds, rate };
    if (current.kind === "damage" && current.effectiveness !== undefined) playFeedbackSound(current.effectiveness > 1 ? "super" : current.effectiveness < 1 ? "resist" : "damage");
    if (current.kind === "faint") playKoSound();
    if (current.kind === "status" && current.status) playFeedbackSound("status");
    if (current.kind === "ball" && current.caught) playFeedbackSound("unity");
    const timer = window.setTimeout(() => setCursor(index => index + 1), seconds * 1000);
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
    }, 450 / speed);
    return () => window.clearTimeout(timer);
  }, [ready, auto, state, command, speed]);

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
      if (key === "f") { onBattleSpeedChange(BATTLE_SPEEDS[(BATTLE_SPEEDS.indexOf(speed) + 1) % BATTLE_SPEEDS.length]); return; }
      if (key === "l") { setLogOpen(value => !value); return; }
      if (key === "escape") { setMenu("main"); return; }
      if (!ready || state.phase !== "choose") return;
      const index = Number(key) - 1;
      const move = activeUnit(state, "ally").moves[index];
      if (move) command({ type: "fight", moveId: move.id });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ready, state, skip, command, speed, onBattleSpeedChange]);

  const returnToWorld = battleMode === "wild" && onWildEnd
    ? () => onWildEnd({ outcome: state.status === "playing" ? "fled" : state.status, ballsRemaining: state.balls, droppedItem: state.droppedItem })
    : isTrainer ? onExitToWorld : undefined;
  const battleView: BattleView = { ally: view.slots.ally, enemy: view.slots.enemy, current, timing, rival: battleMode !== "wild", arena, speed };
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
        <span className="tb-turn">{ARENAS[arena].name} · Turn {state.turn}</span>
        <div className="tb-controls">
          <div className="tb-speed" role="radiogroup" aria-label="Battle speed (F)">
            {BATTLE_SPEEDS.map(value => <button key={value} role="radio" aria-checked={speed === value} className="tb-speed-option" onClick={() => onBattleSpeedChange(value)}>{value}×</button>)}
          </div>
          <button className="tb-switch" role="switch" aria-checked={auto} title="Auto battle (A)" onClick={() => setAuto(value => !value)}>
            <span className="tb-switch-track"><span className="tb-switch-knob" /></span>Auto
          </button>
          <button className="tb-icon-button" aria-pressed={logOpen} title="Battle log (L)" onClick={() => setLogOpen(value => !value)}><LogIcon />Log</button>
        </div>
      </header>
      {logOpen && <BattleLog events={state.events.slice(0, Math.min(cursor + 1, state.events.length))} onClose={() => setLogOpen(false)} />}
      {foe && <InfoBox unit={foe} hp={view.hp[foe.id] ?? foe.maxHp} status={view.status[foe.id]} stages={view.stages[foe.id]} side="enemy" partyLeft={partyOf(state, "enemy").map(u => (view.hp[u.id] ?? u.maxHp) > 0)} />}
      {ally && <InfoBox unit={ally} hp={view.hp[ally.id] ?? ally.maxHp} status={view.status[ally.id]} stages={view.stages[ally.id]} side="ally" partyLeft={partyOf(state, "ally").map(u => (view.hp[u.id] ?? u.maxHp) > 0)} />}
      <section className="tb-dock" onClick={event => event.stopPropagation()}>
        <div className="tb-message" aria-live="polite" onClick={skip}>
          <p>{message}</p>
          {playing && <small>Click or press Space to continue</small>}
        </div>
        {/* The commands stay in place while a turn plays, locked, so the dock doesn't jump. */}
        {state.status === "playing" && <fieldset className={`tb-commands ${ready ? "" : "tb-commands-locked"}`} disabled={!ready} aria-busy={!ready}>
          <Commands state={state} menu={ready ? shownMenu : "main"} setMenu={setMenu} command={command} forced={forced} wild={battleMode === "wild"} />
        </fieldset>}
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
  const stages: Record<string, StageSnapshot> = {};
  const fainted = new Set<string>();
  let text = "";
  for (let i = 0; i <= Math.min(cursor, state.events.length - 1); i++) {
    const event = state.events[i];
    if (event.text) text = event.text;
    if (event.kind === "sendOut" && event.side) active[event.side] = event.unitId!;
    if ((event.kind === "damage" || event.kind === "heal") && event.unitId) hp[event.unitId] = event.hpAfter!;
    if (event.kind === "status" && event.unitId) status[event.unitId] = event.status ?? null;
    for (const snapshot of event.stages ?? []) stages[snapshot.unitId] = snapshot;
    if (event.kind === "faint" && event.unitId && i < cursor) fainted.add(event.unitId);
  }
  const slot = (side: "ally" | "enemy") => {
    const id = active[side];
    if (!id) return null;
    const unit = state.units.find(u => u.id === id)!;
    return { unitId: id, species: unit.sourcePokemon, fainted: fainted.has(id) };
  };
  return { slots: { ally: slot("ally"), enemy: slot("enemy") }, hp, status, stages, text };
}

const STATUS = {
  burn: { label: "BRN", name: "Burned: Attack is lowered and it loses HP each turn", icon: <path d="M8 1.5c.4 2.3 3.8 3.7 3.8 7.4A3.8 3.8 0 0 1 8 12.8a3.8 3.8 0 0 1-3.8-3.9c0-1.6.9-2.6 1.6-3.3.1 1.2.7 2 1.5 2.3C6.9 5.7 7.2 3.4 8 1.5Z" /> },
  poison: { label: "PSN", name: "Poisoned: it loses HP each turn", icon: <path d="M8 1.8c1.4 2.4 4 4.8 4 7.5a4 4 0 0 1-8 0c0-2.7 2.6-5.1 4-7.5Zm-1.6 7a.9.9 0 1 0 0 .1Zm3.2 0a.9.9 0 1 0 0 .1Z" /> },
  paralysis: { label: "PAR", name: "Paralyzed: Speed is halved and it may be unable to move", icon: <path d="M9.4 1.5 3.8 9h3.4l-1 5.5L12.2 7H8.6l.8-5.5Z" /> },
} as const;

export function StatusBadge({ status }: { status: NonNullable<Unit["statusCondition"]> }) {
  const { label, name, icon } = STATUS[status];
  return <span className={`tb-status tb-status-${status}`} title={name} aria-label={name}>
    <svg viewBox="0 0 16 16" aria-hidden="true">{icon}</svg>{label}
  </span>;
}

function StageChips({ stages }: { stages?: StageSnapshot }) {
  if (!stages) return null;
  const chips = ([["ATK", stages.attack], ["DEF", stages.defense]] as const).filter(([, value]) => value !== 0);
  return <>{chips.map(([label, value]) => <span key={label} className={`tb-stage ${value > 0 ? "tb-stage-up" : "tb-stage-down"}`} title={`${label === "ATK" ? "Attack" : "Defense"} ${value > 0 ? "raised" : "lowered"} ${Math.abs(value)} stage${Math.abs(value) > 1 ? "s" : ""}`}>
    {label} {value > 0 ? "▲" : "▼"}{Math.abs(value)}
  </span>)}</>;
}

function TypeChips({ types }: { types: Unit["types"] }) {
  return <span className="tb-types">{types.map(type => <i key={type} style={{ background: typeColor(type) }}>{type}</i>)}</span>;
}

function LogIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3h10v1.6H3zm0 3.7h10v1.6H3zm0 3.7h7v1.6H3z" /></svg>;
}

function BattleLog({ events, onClose }: { events: TurnEvent[]; onClose: () => void }) {
  const lines = events.filter(event => event.text);
  const end = useRef<HTMLLIElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [lines.length]);
  return <aside className="tb-log" aria-label="Battle log" onClick={event => event.stopPropagation()}>
    <header><strong>Battle log</strong><button onClick={onClose} aria-label="Close battle log">×</button></header>
    <ol>{lines.map((event, index) => <li key={event.id} ref={index === lines.length - 1 ? end : undefined} className={`tb-log-${event.kind}`}>{event.text}</li>)}</ol>
  </aside>;
}

function InfoBox({ unit, hp, status, stages, side, partyLeft }: { unit: Unit; hp: number; status: Unit["statusCondition"] | undefined; stages?: StageSnapshot; side: "ally" | "enemy"; partyLeft: boolean[] }) {
  const ratio = Math.max(0, hp / unit.maxHp);
  const tone = ratio > 0.5 ? "high" : ratio > 0.2 ? "mid" : "low";
  return (
    <div className={`tb-info tb-info-${side}`} onClick={event => event.stopPropagation()}>
      <div className="tb-info-head">
        <strong>{unit.name.replace(/^Wild /, "")}</strong>
        <span className="tb-level">Lv{unit.level}</span>
      </div>
      <div className="tb-info-tags"><TypeChips types={unit.types} />{status && <StatusBadge status={status} />}<StageChips stages={stages} /></div>
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
          const matchup = unit.hp > 0 && unit.id !== state.active.ally ? switchMatchup(unit, foe) : null;
          const ratio = unit.hp / unit.maxHp;
          return <button key={unit.id} className="tb-member" disabled={!usable} title={matchup ? `Against ${foe.name.replace(/^Wild /, "")}: ${matchup.reason}` : undefined} onClick={() => command({ type: "switch", unitId: unit.id })}>
            <span className="tb-member-head">
              <span className="tb-move-name">{unit.name} <small>Lv{unit.level}</small></span>
              {matchup && <span className={`tb-matchup tb-matchup-${matchup.verdict}`}>{matchup.verdict === "advantage" ? "▲ Advantage" : matchup.verdict === "disadvantage" ? "▼ Disadvantage" : "● Even"}</span>}
            </span>
            <span className="tb-member-tags"><TypeChips types={unit.types} />{unit.statusCondition && <StatusBadge status={unit.statusCondition} />}</span>
            <span className="tb-hp-track"><span className={`tb-hp-fill tb-hp-${ratio > 0.5 ? "high" : ratio > 0.2 ? "mid" : "low"}`} style={{ width: `${ratio * 100}%` }} /></span>
            <small>{unit.id === state.active.ally ? "In battle" : unit.hp <= 0 ? "Fainted" : matchup ? `${unit.hp} / ${unit.maxHp} HP · ${matchup.reason}` : `${unit.hp} / ${unit.maxHp} HP`}</small>
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
      <button className="tb-cmd tb-cmd-fight" onClick={() => setMenu("fight")}><CommandIcon d="M12.6 2 14 3.4l-6 6 1.3 1.3-1 1-1.4-1.3-2 2 .7.7-1 1L2 11.4l1-1 .7.7 2-2L4.4 7.7l1-1L6.7 8l6-6Z" />Fight</button>
      <button className="tb-cmd tb-cmd-bag" onClick={() => setMenu("bag")}><CommandIcon d="M6 2.5h4a1 1 0 0 1 1 1V5h1.5A1.5 1.5 0 0 1 14 6.5v6A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-6A1.5 1.5 0 0 1 3.5 5H5V3.5a1 1 0 0 1 1-1Zm.5 1.5V5h3V4Zm-3 4.3v1.2h9V8.3Z" />Bag</button>
      <button className="tb-cmd tb-cmd-party" onClick={() => setMenu("party")}><CommandIcon d="M8 2a6 6 0 0 1 6 5.3h-3.6a2.5 2.5 0 0 0-4.8 0H2A6 6 0 0 1 8 2Zm0 4.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2ZM2 8.7h3.6a2.5 2.5 0 0 0 4.8 0H14A6 6 0 0 1 2 8.7Z" />Pokémon</button>
      <button className="tb-cmd tb-cmd-run" disabled={!wild} title={wild ? undefined : "No running from a trainer battle!"} onClick={() => command({ type: "run" })}><CommandIcon d="M9.5 1.8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM7 5.6l2.6.5 1.5 2.1 2.1.5-.3 1.3-2.6-.6-1-1.3-.6 2.2 1.8 1.6V15H9.2v-2.4L7.4 11l-.9 2.7-3.1.6-.3-1.3 2.4-.5L7 5.6Zm-.6 1.6-.9 2.2-1.3-.5 1.2-2.7Z" />Run</button>
    </div>
  );
}

function CommandIcon({ d }: { d: string }) {
  return <svg className="tb-cmd-icon" viewBox="0 0 16 16" aria-hidden="true"><path d={d} /></svg>;
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
