import type { BattleConfig, BattleStatus, Move, PokemonType, StatusCondition, Team, TrainerMove, Unit } from "./battleState";
import { captureChanceFor, createInitialBattleState, focusSashSurvives, rollWildDrop } from "./battleState";
import { battleItemEffect } from "./battleItems";
import { getTypeEffectiveness } from "./battleTypeChart";
import { heldItemDamageMultiplier, heldItemEffect } from "./heldItems";

/** One-on-one, turn-based battles in the style of the main series. Each side has one active
 * Pokémon; both sides choose, then switches, items and balls resolve before moves, and moves
 * go in Speed order. A resolved turn is a list of events the screen plays back in order. */
export const TURN = {
  // Tuned with turnBattleSimulation so an even, same-type neutral hit takes about a third of HP.
  damageScale: 1,
  hpScale: 1.3,
  // Base-stat total (HP + Attack + Defense + Speed) an enemy is levelled against: a starter's.
  referenceStatTotal: 215,
  // Pokémon level = base + per × (progression level, stage, or wild encounter level).
  allyLevelBase: 4, allyLevelPer: 2,
  stageLevelBase: 3, stageLevelPer: 2,
  wildLevelBase: 3, wildLevelPer: 1.5,
  sameTypeBonus: 1.5,
  critChance: 1 / 16,
  critMultiplier: 1.5,
  varianceMin: 0.85,
  strikeRoleBonus: 1.1,
  supportDamageReduction: 0.92,
  // Damaging moves with a status effect inflict it this often; status-only moves always do.
  secondaryStatusChance: 0.3,
  paralysisSkipChance: 0.25,
  paralysisSpeed: 0.5,
  burnAttack: 0.75,
  burnFraction: 1 / 16,
  poisonFraction: 1 / 8,
  syncCharge: 3,
  // Item and trainer heal amounts were tuned against ~110 HP; scale them to the new HP.
  legacyHp: 110,
  enemyHealBelow: 0.35,
  enemyHealFraction: 0.5,
  maxStage: 6,
};

export type TurnSide = Team;
export type TurnCommand =
  | { type: "fight"; moveId: string }
  | { type: "sync" }
  | { type: "holdBack" }
  | { type: "switch"; unitId: string }
  | { type: "item"; itemId: string }
  | { type: "trainer" }
  | { type: "ball"; ballId: string }
  | { type: "run" };

export type TurnEvent = {
  id: number;
  kind: "message" | "sendOut" | "withdraw" | "move" | "damage" | "heal" | "status" | "stat" | "faint" | "ball" | "fled" | "end";
  text: string;
  side?: TurnSide;
  unitId?: string;
  moveId?: string;
  moveType?: PokemonType;
  hpAfter?: number;
  effectiveness?: number;
  critical?: boolean;
  status?: StatusCondition | null;
  shakes?: number;
  caught?: boolean;
};

export type TurnPhase = "choose" | "forcedSwitch" | "over";

export type TurnBattleState = {
  config: BattleConfig;
  units: Unit[];
  active: Record<TurnSide, string>;
  phase: TurnPhase;
  status: BattleStatus;
  turn: number;
  events: TurnEvent[];
  /** Normal moves each Pokémon has used since its last Sync move. */
  syncCharge: Record<string, number>;
  trainerUses: Record<string, number>;
  enemyTrainer: { name: string; healUses: number; buffUses: number };
  opponentName: string;
  items: Record<string, number>;
  balls: Record<string, number>;
  droppedItem: { itemId: string; quantity: number } | null;
  fleeAttempts: number;
  damageDealt: Record<string, number>;
  rng: number;
};

const QUICK_MOVES = new Set(["quick-attack", "rattata-quick-attack"]);

function random(state: { rng: number }) {
  // Same LCG family as the real-time engine; deterministic for a seed.
  state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
  return state.rng / 0x100000000;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const stageMultiplier = (stage: number) => (stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage));

/** Pokémon level for a battler: allies from their progression level, trainers and the ladder
 * from the stage, wild Pokémon from the encounter level. Enemies with a high base-stat total
 * (Snorlax, Butterfree) arrive at a lower level so an early stage stays fair. */
export function battleLevel(unit: Unit, wild: boolean) {
  if (unit.team === "ally") return Math.round(TURN.allyLevelBase + TURN.allyLevelPer * unit.level);
  const base = wild ? TURN.wildLevelBase + TURN.wildLevelPer * unit.level : TURN.stageLevelBase + TURN.stageLevelPer * unit.level;
  const total = unit.baseStats.hp + unit.baseStats.attack + unit.baseStats.defense + unit.baseStats.speed;
  return Math.max(2, Math.round(base * clamp(Math.pow(TURN.referenceStatTotal / total, 0.75), 0.55, 1.1)));
}

/** Main-series HP and stats at the battler's level, from its base stats. */
function toTurnUnit(unit: Unit, wild: boolean): Unit {
  const base = unit.baseStats;
  const level = battleLevel(unit, wild);
  const stat = (value: number) => Math.floor(2 * value * level / 100) + 5;
  const maxHp = Math.round((Math.floor(2 * base.hp * level / 100) + level + 10) * TURN.hpScale);
  return {
    ...unit,
    level,
    maxHp,
    hp: maxHp,
    attack: stat(base.attack),
    defense: stat(base.defense),
    speed: stat(base.speed),
    attackStage: 0,
    defenseStage: 0,
    statusCondition: null,
  };
}

export function createTurnBattle(seed?: number, config?: Partial<BattleConfig>): TurnBattleState {
  const legacy = createInitialBattleState(seed, config);
  const wild = legacy.config.battleMode === "wild";
  const units = legacy.units.map(unit => toTurnUnit(unit, wild && unit.team === "enemy"));
  const allies = units.filter(u => u.team === "ally"), enemies = units.filter(u => u.team === "enemy");
  const opponentName = wild ? `Wild ${enemies[0]?.name.replace(/^Wild /, "")}` : legacy.config.enemyTeamName ?? "Rival";
  const state: TurnBattleState = {
    config: legacy.config,
    units,
    active: { ally: allies[0].id, enemy: enemies[0].id },
    phase: "choose",
    status: "playing",
    turn: 1,
    events: [],
    syncCharge: Object.fromEntries(units.map(u => [u.id, 0])),
    trainerUses: Object.fromEntries(allies.filter(u => u.trainerMove).map(u => [u.id, u.trainerMove!.uses])),
    enemyTrainer: { name: wild ? "" : "Rival Trainer", healUses: wild ? 0 : legacy.enemyTrainer.healUses, buffUses: wild ? 0 : legacy.enemyTrainer.buffUses },
    opponentName,
    items: legacy.items,
    balls: legacy.balls,
    droppedItem: null,
    fleeAttempts: 0,
    damageDealt: {},
    rng: legacy.rng,
  };
  const enemy = enemies[0], ally = allies[0];
  if (wild) emit(state, { kind: "sendOut", side: "enemy", unitId: enemy.id, text: `A wild ${enemy.name.replace(/^Wild /, "")} appeared!` });
  else {
    emit(state, { kind: "message", text: `${state.enemyTrainer.name} of ${opponentName} wants to battle!` });
    emit(state, { kind: "sendOut", side: "enemy", unitId: enemy.id, text: `${state.enemyTrainer.name} sent out ${enemy.name}!` });
  }
  emit(state, { kind: "sendOut", side: "ally", unitId: ally.id, text: `Go! ${ally.name}!` });
  return state;
}

function emit(state: TurnBattleState, event: Omit<TurnEvent, "id">) {
  state.events.push({ ...event, id: state.events.length });
}

export const unitById = (state: TurnBattleState, id: string) => state.units.find(u => u.id === id)!;
export const activeUnit = (state: TurnBattleState, side: TurnSide) => unitById(state, state.active[side]);
export const partyOf = (state: TurnBattleState, side: TurnSide) => state.units.filter(u => u.team === side);
const alive = (unit: Unit) => unit.hp > 0;
const other = (side: TurnSide): TurnSide => (side === "ally" ? "enemy" : "ally");

function patch(state: TurnBattleState, id: string, change: Partial<Unit>) {
  state.units = state.units.map(u => (u.id === id ? { ...u, ...change } : u));
}

function effectiveSpeed(unit: Unit) {
  return unit.speed * (unit.statusCondition === "paralysis" ? TURN.paralysisSpeed : 1);
}

type DamageRolls = { crit: number; variance: number } | null;
/** Main-series style damage. With `rolls` null it returns the average (no crit, mid roll). */
export function turnDamage(actor: Unit, target: Unit, move: Move, rolls: DamageRolls) {
  const effectiveness = getTypeEffectiveness(move.type, target.types);
  if (effectiveness === 0 || move.power <= 0) return { damage: 0, effectiveness, critical: false };
  const critical = !!rolls && rolls.crit < TURN.critChance;
  // Critical hits ignore the attacker's drops and the target's boosts.
  const attackStage = critical ? Math.max(0, actor.attackStage) : actor.attackStage;
  const defenseStage = critical ? Math.min(0, target.defenseStage) : target.defenseStage;
  const attack = actor.attack * stageMultiplier(attackStage) * (actor.statusCondition === "burn" ? TURN.burnAttack : 1);
  const defense = target.defense * stageMultiplier(defenseStage);
  const base = ((2 * actor.level / 5 + 2) * move.power * attack / defense) / 50 + 2;
  const passive =
    (actor.passive.id === "power-reserves" && actor.hp / actor.maxHp <= 0.5 ? 1.18 : 1)
    * (actor.passive.id === "toxic-focus" && move.statusEffect && target.statusCondition ? 1.15 : 1)
    * (actor.passive.id === "boss-aura" ? 1.12 : 1)
    * (target.passive.id === "thick-guard" && target.hp / target.maxHp > 0.5 ? 0.88 : 1)
    * (target.passive.id === "boss-aura" ? 0.92 : 1);
  const modifiers = TURN.damageScale
    * (actor.types.includes(move.type) ? TURN.sameTypeBonus : 1)
    * effectiveness
    * (actor.role === "strike" ? TURN.strikeRoleBonus : 1)
    * (target.role === "support" ? TURN.supportDamageReduction : 1)
    * passive
    * heldItemDamageMultiplier(actor.heldItem, move.type)
    * (critical ? TURN.critMultiplier : 1)
    * (rolls ? TURN.varianceMin + (1 - TURN.varianceMin) * rolls.variance : (1 + TURN.varianceMin) / 2);
  return { damage: Math.max(1, Math.floor(base * modifiers)), effectiveness, critical };
}

const statusImmune = (unit: Unit, status: StatusCondition) =>
  (status === "burn" && unit.types.includes("fire")) || (status === "poison" && (unit.types.includes("poison") || unit.types.includes("steel"))) || (status === "paralysis" && unit.types.includes("electric"));
const STATUS_TEXT: Record<StatusCondition, string> = { burn: "was burned", poison: "was poisoned", paralysis: "is paralyzed! It may be unable to move" };
const effectivenessText = (value: number) => (value === 0 ? "It doesn't affect the target…" : value > 1 ? "It's super effective!" : value < 1 ? "It's not very effective…" : "");

/** The moves a side may use now: its normal moves plus its Sync move once charged. */
export function availableMoves(state: TurnBattleState, side: TurnSide) {
  const unit = activeUnit(state, side);
  return { moves: unit.moves, sync: (state.syncCharge[unit.id] ?? 0) >= TURN.syncCharge ? unit.syncMove : null };
}

function moveFor(state: TurnBattleState, side: TurnSide, command: TurnCommand): Move | null {
  const unit = activeUnit(state, side);
  if (command.type === "fight") return unit.moves.find(m => m.id === command.moveId) ?? null;
  if (command.type === "sync") return availableMoves(state, side).sync;
  if (command.type === "holdBack") return { id: "hold-back", name: "Hold Back", type: "normal", cost: 0, power: 40, accent: "#e5e7eb" };
  return null;
}

/** A command is legal now? Used by the reducer and by the menus to disable options. */
export function canUse(state: TurnBattleState, command: TurnCommand): boolean {
  if (state.status !== "playing") return false;
  const wild = state.config.battleMode === "wild";
  const ally = activeUnit(state, "ally");
  if (state.phase === "forcedSwitch") return command.type === "switch" && alive(unitById(state, command.unitId)) && command.unitId !== ally.id;
  switch (command.type) {
    case "fight": return ally.moves.some(m => m.id === command.moveId);
    case "sync": return !!availableMoves(state, "ally").sync;
    case "holdBack": return wild && activeUnit(state, "enemy").hp > 1;
    case "switch": { const target = state.units.find(u => u.id === command.unitId); return !!target && target.team === "ally" && alive(target) && target.id !== ally.id; }
    case "item": {
      const effect = battleItemEffect(command.itemId);
      if (!effect || (state.items[command.itemId] ?? 0) <= 0) return false;
      return effect.kind === "heal" ? ally.hp < ally.maxHp : ally.statusCondition === effect.status;
    }
    case "trainer": {
      const move = ally.trainerMove;
      if (!move || (state.trainerUses[ally.id] ?? 0) <= 0) return false;
      return move.kind !== "heal" || partyOf(state, "ally").some(u => alive(u) && u.hp < u.maxHp);
    }
    case "ball": return wild && (state.balls[command.ballId] ?? 0) > 0;
    case "run": return wild;
  }
}

/** The side's best command, for the enemy AI and for Auto. */
export function chooseCommand(state: TurnBattleState, side: TurnSide): TurnCommand {
  const scratch = { rng: state.rng };
  const actor = activeUnit(state, side), target = activeUnit(state, other(side));
  if (side === "enemy" && state.config.battleMode !== "wild") {
    if (state.enemyTrainer.healUses > 0 && actor.hp / actor.maxHp < TURN.enemyHealBelow) return { type: "item", itemId: "enemy-heal" };
    if (state.enemyTrainer.buffUses > 0 && state.turn === 2) return { type: "trainer" };
  }
  const { moves, sync } = availableMoves(state, side);
  const options = [...moves.map(move => ({ command: { type: "fight", moveId: move.id } as TurnCommand, move })), ...(sync ? [{ command: { type: "sync" } as TurnCommand, move: sync }] : [])];
  const scored = options.map(({ command, move }) => {
    let score = turnDamage(actor, target, move, null).damage;
    if (score >= target.hp) score += 60;
    if (move.statusEffect && !target.statusCondition && !statusImmune(target, move.statusEffect)) score += move.power > 0 ? 8 : 22;
    if (move.statChange) score += state.turn <= 2 ? 14 : 2;
    return { command, score };
  }).sort((a, b) => b.score - a.score);
  // The enemy sometimes picks its second-best option so it isn't perfectly predictable.
  if (side === "enemy" && scored.length > 1 && random(scratch) < 0.2) return scored[1].command;
  return scored[0]?.command ?? { type: "fight", moveId: actor.moves[0].id };
}

const priorityOf = (state: TurnBattleState, side: TurnSide, command: TurnCommand) => {
  if (command.type === "switch") return 6;
  if (command.type === "item" || command.type === "trainer" || command.type === "ball" || command.type === "run") return 5;
  const move = moveFor(state, side, command);
  return move && QUICK_MOVES.has(move.id) ? 1 : 0;
};

export type TurnAction = { type: "command"; command: TurnCommand };

export function turnBattleReducer(previous: TurnBattleState, action: TurnAction): TurnBattleState {
  if (!canUse(previous, action.command)) return previous;
  const state: TurnBattleState = { ...previous, events: [...previous.events], units: [...previous.units], syncCharge: { ...previous.syncCharge }, trainerUses: { ...previous.trainerUses }, items: { ...previous.items }, balls: { ...previous.balls }, damageDealt: { ...previous.damageDealt }, enemyTrainer: { ...previous.enemyTrainer }, active: { ...previous.active } };
  if (state.phase === "forcedSwitch") {
    // Replacing a fainted Pokémon is free; the turn doesn't pass.
    const { unitId } = action.command as { unitId: string };
    state.active.ally = unitId;
    emit(state, { kind: "sendOut", side: "ally", unitId, text: `Go! ${unitById(state, unitId).name}!` });
    state.phase = "choose";
    return state;
  }
  const commands: { side: TurnSide; command: TurnCommand }[] = [{ side: "ally", command: action.command }, { side: "enemy", command: chooseCommand(state, "enemy") }];
  const tie = random(state);
  commands.sort((a, b) => {
    const priority = priorityOf(state, b.side, b.command) - priorityOf(state, a.side, a.command);
    if (priority) return priority;
    const speed = effectiveSpeed(activeUnit(state, b.side)) - effectiveSpeed(activeUnit(state, a.side));
    return speed || (a.side === "ally" ? (tie < 0.5 ? -1 : 1) : (tie < 0.5 ? 1 : -1));
  });
  for (const { side, command } of commands) {
    if (state.status !== "playing") break;
    const actor = activeUnit(state, side);
    // A Pokémon knocked out earlier this turn doesn't act.
    if (!alive(actor)) continue;
    perform(state, side, command);
    if (anyFainted(state)) break;
  }
  if (state.status === "playing") endOfTurn(state);
  if (state.status === "playing") settleFaints(state);
  if (state.status === "playing" && state.phase === "choose") state.turn += 1;
  return state;
}

function anyFainted(state: TurnBattleState) {
  return !alive(activeUnit(state, "ally")) || !alive(activeUnit(state, "enemy"));
}

function perform(state: TurnBattleState, side: TurnSide, command: TurnCommand) {
  const actor = activeUnit(state, side);
  const foe = activeUnit(state, other(side));
  switch (command.type) {
    case "switch": {
      emit(state, { kind: "withdraw", side, unitId: actor.id, text: `${actor.name}, come back!` });
      state.active[side] = command.unitId;
      emit(state, { kind: "sendOut", side, unitId: command.unitId, text: `Go! ${unitById(state, command.unitId).name}!` });
      return;
    }
    case "item": {
      if (command.itemId === "enemy-heal") {
        state.enemyTrainer.healUses -= 1;
        const hp = Math.min(actor.maxHp, actor.hp + Math.round(actor.maxHp * TURN.enemyHealFraction));
        patch(state, actor.id, { hp });
        emit(state, { kind: "heal", side, unitId: actor.id, hpAfter: hp, text: `${state.enemyTrainer.name} used a Potion. ${actor.name} recovered HP!` });
        return;
      }
      const effect = battleItemEffect(command.itemId)!;
      state.items[command.itemId] = (state.items[command.itemId] ?? 0) - 1;
      if (effect.kind === "heal") {
        const hp = Math.min(actor.maxHp, actor.hp + Math.round(effect.amount / TURN.legacyHp * actor.maxHp));
        patch(state, actor.id, { hp });
        emit(state, { kind: "heal", side, unitId: actor.id, hpAfter: hp, text: `You used a ${effect.name}. ${actor.name} recovered HP!` });
      } else {
        patch(state, actor.id, { statusCondition: null, statusTimer: 0 });
        emit(state, { kind: "status", side, unitId: actor.id, status: null, text: `You used a ${effect.name}. ${actor.name} is cured!` });
      }
      return;
    }
    case "trainer": {
      if (side === "enemy") {
        state.enemyTrainer.buffUses -= 1;
        patch(state, actor.id, { attackStage: clamp(actor.attackStage + 1, -TURN.maxStage, TURN.maxStage) });
        emit(state, { kind: "stat", side, unitId: actor.id, text: `${state.enemyTrainer.name} used an X Attack! ${actor.name}'s Attack rose!` });
        return;
      }
      performTrainerMove(state, actor, actor.trainerMove!);
      return;
    }
    case "ball": return throwBall(state, command.ballId);
    case "run": {
      state.fleeAttempts += 1;
      const chance = clamp(0.5 + (effectiveSpeed(actor) - effectiveSpeed(foe)) / 100 + 0.2 * (state.fleeAttempts - 1), 0.15, 0.95);
      if (random(state) < chance) {
        state.status = "fled"; state.phase = "over";
        emit(state, { kind: "fled", text: "Got away safely!" });
      } else emit(state, { kind: "message", text: "Can't escape!" });
      return;
    }
    default: {
      const move = moveFor(state, side, command)!;
      performMove(state, side, move, command.type === "sync", command.type === "holdBack");
    }
  }
}

function performTrainerMove(state: TurnBattleState, actor: Unit, move: TrainerMove) {
  state.trainerUses[actor.id] -= 1;
  if (move.kind === "heal") {
    const target = partyOf(state, "ally").filter(u => alive(u) && u.hp < u.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    const hp = Math.min(target.maxHp, target.hp + Math.round(move.amount / TURN.legacyHp * target.maxHp));
    patch(state, target.id, { hp });
    emit(state, { kind: "heal", side: "ally", unitId: target.id, hpAfter: hp, text: `${move.name}! ${target.name} recovered HP!` });
    return;
  }
  const stat = move.kind === "attackBuff" ? "attackStage" : "defenseStage";
  const targets = move.target === "allAllies" ? partyOf(state, "ally").filter(alive) : [actor];
  for (const unit of targets) patch(state, unit.id, { [stat]: clamp(unit[stat] + move.stages, -TURN.maxStage, TURN.maxStage) });
  emit(state, { kind: "stat", side: "ally", unitId: actor.id, text: `${move.name}! ${move.target === "allAllies" ? "Your team's" : `${actor.name}'s`} ${move.kind === "attackBuff" ? "Attack" : "Defense"} rose!` });
}

function performMove(state: TurnBattleState, side: TurnSide, move: Move, sync: boolean, holdBack: boolean) {
  let actor = activeUnit(state, side);
  const foe = activeUnit(state, other(side));
  if (actor.statusCondition === "paralysis" && random(state) < TURN.paralysisSkipChance) {
    emit(state, { kind: "message", side, unitId: actor.id, moveId: "paralyzed", text: `${actor.name} is paralyzed! It can't move!` });
    return;
  }
  emit(state, { kind: "move", side, unitId: actor.id, moveId: move.id, moveType: move.type, text: `${sync ? "Sync! " : ""}${actor.name} used ${move.name}!` });
  state.syncCharge[actor.id] = sync ? 0 : Math.min(TURN.syncCharge, (state.syncCharge[actor.id] ?? 0) + 1);
  if (move.power > 0) {
    const rolls = { crit: random(state), variance: random(state) };
    const { damage: raw, effectiveness, critical } = turnDamage(actor, foe, move, rolls);
    let damage = raw;
    if (holdBack) damage = Math.min(damage, foe.hp - 1);
    let hp = Math.max(0, foe.hp - damage);
    const sash = focusSashSurvives(foe, hp);
    if (sash) hp = 1;
    patch(state, foe.id, { hp, ...(sash ? { heldItemUsed: true } : {}) });
    state.damageDealt[actor.id] = (state.damageDealt[actor.id] ?? 0) + (foe.hp - hp);
    emit(state, { kind: "damage", side: other(side), unitId: foe.id, hpAfter: hp, effectiveness, critical, moveId: move.id, moveType: move.type,
      text: [critical ? "A critical hit!" : "", effectivenessText(effectiveness), sash ? `${foe.name} hung on using its Focus Sash!` : ""].filter(Boolean).join(" ") });
    if (hp <= 0) return;
    if (move.statusEffect && random(state) < TURN.secondaryStatusChance) inflict(state, other(side), move.statusEffect);
  } else if (move.statusEffect) {
    if (foe.statusCondition || statusImmune(foe, move.statusEffect)) emit(state, { kind: "message", text: "But it failed!" });
    else inflict(state, other(side), move.statusEffect);
  }
  if (move.statChange) {
    actor = activeUnit(state, side);
    const target = move.statChange.target === "self" ? actor : activeUnit(state, other(side));
    const key = move.statChange.stat === "attack" ? "attackStage" : "defenseStage";
    const next = clamp(target[key] + move.statChange.stages, -TURN.maxStage, TURN.maxStage);
    if (next === target[key]) emit(state, { kind: "message", text: `${target.name}'s ${move.statChange.stat} won't go any ${move.statChange.stages > 0 ? "higher" : "lower"}!` });
    else {
      patch(state, target.id, { [key]: next });
      const amount = Math.abs(move.statChange.stages) > 1 ? " sharply" : "";
      emit(state, { kind: "stat", side: target.team, unitId: target.id, text: `${target.name}'s ${move.statChange.stat === "attack" ? "Attack" : "Defense"}${amount} ${move.statChange.stages > 0 ? "rose" : "fell"}!` });
    }
  }
}

function inflict(state: TurnBattleState, side: TurnSide, status: StatusCondition) {
  const unit = activeUnit(state, side);
  if (unit.statusCondition || statusImmune(unit, status)) return;
  patch(state, unit.id, { statusCondition: status });
  emit(state, { kind: "status", side, unitId: unit.id, status, text: `${unit.name} ${STATUS_TEXT[status]}!` });
}

function throwBall(state: TurnBattleState, ballId: string) {
  state.balls[ballId] -= 1;
  const wild = activeUnit(state, "enemy");
  const rate = state.config.usePokeApiRates ? state.config.wild?.captureRate : undefined;
  const chance = captureChanceFor(wild, ballId, rate);
  // Up to three shakes, each passed with the same odds, so the overall chance matches.
  const perShake = Math.pow(chance, 1 / 4);
  let shakes = 0;
  while (shakes < 4 && random(state) < perShake) shakes++;
  const caught = shakes === 4;
  const ballName = ballId === "great-ball" ? "Great Ball" : "Poké Ball";
  emit(state, { kind: "ball", side: "enemy", unitId: wild.id, shakes: Math.min(3, shakes), caught, text: caught ? `Gotcha! ${wild.name.replace(/^Wild /, "")} was caught!` : `You threw a ${ballName}… ${shakes === 0 ? "Oh no! It broke free!" : shakes < 3 ? "Aww! It appeared to be caught!" : "Argh! Almost had it!"}` });
  if (caught) { state.status = "captured"; state.phase = "over"; }
}

function endOfTurn(state: TurnBattleState) {
  for (const side of ["ally", "enemy"] as const) {
    const unit = activeUnit(state, side);
    if (!alive(unit)) continue;
    if (unit.statusCondition === "burn" || unit.statusCondition === "poison") {
      const hp = Math.max(0, unit.hp - Math.max(1, Math.floor(unit.maxHp * (unit.statusCondition === "burn" ? TURN.burnFraction : TURN.poisonFraction))));
      patch(state, unit.id, { hp });
      emit(state, { kind: "damage", side, unitId: unit.id, hpAfter: hp, text: `${unit.name} is hurt by its ${unit.statusCondition}!` });
      continue;
    }
    const held = heldItemEffect(unit.heldItem);
    if (held?.kind === "leftovers" && unit.hp < unit.maxHp) {
      const hp = Math.min(unit.maxHp, unit.hp + Math.max(1, Math.floor(unit.maxHp * held.fraction)));
      patch(state, unit.id, { hp });
      emit(state, { kind: "heal", side, unitId: unit.id, hpAfter: hp, text: `${unit.name} restored a little HP using its Leftovers!` });
    }
  }
}

function settleFaints(state: TurnBattleState) {
  for (const side of ["enemy", "ally"] as const) {
    const unit = activeUnit(state, side);
    if (alive(unit) || state.events.some(e => e.kind === "faint" && e.unitId === unit.id)) continue;
    emit(state, { kind: "faint", side, unitId: unit.id, text: `${side === "enemy" && state.config.battleMode === "wild" ? "The wild " : side === "enemy" ? "The opposing " : ""}${unit.name.replace(/^Wild /, "")} fainted!` });
  }
  const enemiesLeft = partyOf(state, "enemy").filter(alive);
  const alliesLeft = partyOf(state, "ally").filter(alive);
  if (!enemiesLeft.length) {
    state.status = "won"; state.phase = "over";
    if (state.config.battleMode === "wild") {
      const drop = rollWildDrop({ rng: state.rng, config: { stage: state.config.stage } });
      state.rng = drop.rng; state.droppedItem = drop.droppedItem;
    }
    emit(state, { kind: "end", text: state.config.battleMode === "wild" ? "You won!" : `You defeated ${state.opponentName}!` });
    return;
  }
  if (!alliesLeft.length) {
    state.status = "lost"; state.phase = "over";
    emit(state, { kind: "end", text: "You're out of usable Pokémon! You blacked out…" });
    return;
  }
  if (!alive(activeUnit(state, "enemy"))) {
    const next = enemiesLeft[0];
    state.active.enemy = next.id;
    emit(state, { kind: "sendOut", side: "enemy", unitId: next.id, text: `${state.enemyTrainer.name || "The opponent"} sent out ${next.name}!` });
  }
  if (!alive(activeUnit(state, "ally"))) state.phase = "forcedSwitch";
}

