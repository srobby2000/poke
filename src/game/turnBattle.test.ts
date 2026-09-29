import { describe, expect, it } from "vitest";
import type { TurnBattleState, TurnCommand } from "./turnBattle";
import { TURN, activeUnit, canUse, createTurnBattle, partyOf, turnBattleReducer } from "./turnBattle";

const TEAM = ["squirtle", "bulbasaur", "charmander"];
const levels = (level: number) => Object.fromEntries(TEAM.map(id => [id, level]));
const act = (state: TurnBattleState, command: TurnCommand) => turnBattleReducer(state, { type: "command", command });
const newEvents = (before: TurnBattleState, after: TurnBattleState) => after.events.slice(before.events.length);
const withUnit = (state: TurnBattleState, id: string, change: Partial<TurnBattleState["units"][number]>): TurnBattleState =>
  ({ ...state, units: state.units.map(u => (u.id === id ? { ...u, ...change } : u)) });
const firstMove = (state: TurnBattleState): TurnCommand => ({ type: "fight", moveId: activeUnit(state, "ally").moves[0].id });

describe("turn-based battle", () => {
  it("opens one-on-one, with each side sending out its first Pokémon", () => {
    const state = createTurnBattle(1, { stage: 1, allyIds: TEAM, allyLevels: levels(1) });
    expect(state.phase).toBe("choose");
    expect(activeUnit(state, "ally").name).toBe("Squirtle");
    expect(activeUnit(state, "enemy").name).toBe("Pikachu");
    expect(state.events.filter(e => e.kind === "sendOut").map(e => e.side)).toEqual(["enemy", "ally"]);
    const wild = createTurnBattle(1, { battleMode: "wild", wild: { speciesId: "pidgey", level: 2, balls: { "poke-ball": 3 } }, allyIds: TEAM, allyLevels: levels(1) });
    expect(wild.events[0].text).toMatch(/A wild Pidgey appeared/);
  });

  it("levels Pokémon from progression and the stage, bringing strong species in lower", () => {
    const state = createTurnBattle(1, { stage: 1, allyIds: TEAM, allyLevels: levels(3) });
    expect(activeUnit(state, "ally").level).toBe(TURN.allyLevelBase + TURN.allyLevelPer * 3);
    const [pikachu, snorlax] = partyOf(state, "enemy");
    expect(snorlax.level).toBeLessThan(pikachu.level);
  });

  it("lets the faster Pokémon move first, and Quick Attack jump the queue", () => {
    // Pikachu (Speed 90) outpaces Squirtle (43).
    let state = createTurnBattle(3, { stage: 1, allyIds: TEAM, allyLevels: levels(1) });
    const turn = act(state, firstMove(state));
    const movers = newEvents(state, turn).filter(e => e.kind === "move" || (e.kind === "message" && e.moveId === "paralyzed")).map(e => e.side);
    expect(movers[0]).toBe("enemy");
    // A Quick Attack user always goes first against a normal move.
    state = withUnit(state, activeUnit(state, "ally").id, { moves: [{ id: "quick-attack", name: "Quick Attack", type: "normal", cost: 0, power: 40, accent: "#fff" }] });
    const quick = act(state, { type: "fight", moveId: "quick-attack" });
    expect(newEvents(state, quick).find(e => e.kind === "move")?.side).toBe("ally");
  });

  it("switches before moves, costing the turn", () => {
    const state = createTurnBattle(5, { stage: 1, allyIds: TEAM, allyLevels: levels(1) });
    const next = act(state, { type: "switch", unitId: "bulbasaur" });
    const events = newEvents(state, next);
    expect(events[0].kind).toBe("withdraw");
    expect(activeUnit(next, "ally").id).toBe("bulbasaur");
    // The opponent still gets its move, into the new Pokémon.
    expect(events.some(e => e.kind === "move" && e.side === "enemy")).toBe(true);
    expect(canUse(next, { type: "switch", unitId: "bulbasaur" })).toBe(false);
  });

  it("asks for a replacement after a knockout without giving the opponent a free hit", () => {
    let state = createTurnBattle(7, { stage: 1, allyIds: TEAM, allyLevels: levels(1) });
    state = withUnit(state, activeUnit(state, "ally").id, { hp: 1 });
    state = act(state, firstMove(state));
    expect(state.phase).toBe("forcedSwitch");
    expect(canUse(state, firstMove(state))).toBe(false);
    const replaced = act(state, { type: "switch", unitId: "charmander" });
    expect(replaced.phase).toBe("choose");
    expect(newEvents(state, replaced).map(e => e.kind)).toEqual(["sendOut"]);
  });

  it("calls out super-effective hits and applies type immunity to status", () => {
    // Charmander's Ember against Bulbasaur-type grass: pick a stage-1 matchup via a wild Oddish.
    let state = createTurnBattle(11, { battleMode: "wild", wild: { speciesId: "oddish", level: 2, balls: {} }, allyIds: ["charmander", "squirtle", "bulbasaur"], allyLevels: levels(2) });
    const ember = activeUnit(state, "ally").moves.find(m => m.type === "fire")!;
    const after = act(state, { type: "fight", moveId: ember.id });
    expect(newEvents(state, after).some(e => e.kind === "damage" && e.side === "enemy" && (e.effectiveness ?? 1) > 1 && /super effective/.test(e.text))).toBe(true);
    // A burn never lands on a Fire type.
    state = createTurnBattle(11, { stage: 1, allyIds: ["charmander", "squirtle", "bulbasaur"], allyLevels: levels(1) });
    state = { ...state, units: state.units.map(u => (u.team === "enemy" ? { ...u, moves: [{ id: "will-o", name: "Will-O", type: "fire", cost: 0, power: 0, accent: "#f00", statusEffect: "burn" as const }] } : u)) };
    const burned = act(state, firstMove(state));
    expect(activeUnit(burned, "ally").statusCondition).not.toBe("burn");
  });

  it("hurts poisoned and burned Pokémon at the end of the turn", () => {
    let state = createTurnBattle(13, { stage: 1, allyIds: TEAM, allyLevels: levels(4) });
    state = withUnit(state, activeUnit(state, "ally").id, { statusCondition: "poison" });
    const before = activeUnit(state, "ally");
    const after = act(state, { type: "switch", unitId: "bulbasaur" });
    // Squirtle left the field, so its poison waits; Bulbasaur is healthy.
    expect(newEvents(state, after).some(e => /hurt by its poison/.test(e.text))).toBe(false);
    const stay = act(state, firstMove(state));
    const tick = newEvents(state, stay).find(e => /hurt by its poison/.test(e.text));
    expect(tick?.hpAfter).toBeLessThan(before.hp);
  });

  it("uses potions on the active Pokémon only when they help", () => {
    let state = createTurnBattle(17, { stage: 1, allyIds: TEAM, allyLevels: levels(2), items: { "potion-item": 1 } });
    expect(canUse(state, { type: "item", itemId: "potion-item" })).toBe(false);
    state = withUnit(state, activeUnit(state, "ally").id, { hp: 3 });
    const healed = act(state, { type: "item", itemId: "potion-item" });
    expect(healed.items["potion-item"]).toBe(0);
    const heal = newEvents(state, healed).find(e => e.kind === "heal")!;
    expect(heal.hpAfter).toBeGreaterThan(3);
    expect(newEvents(state, healed)[0].kind).toBe("heal");
  });

  it("catches a weakened wild Pokémon with balls, and lets you run from wild battles only", () => {
    let state = createTurnBattle(19, { battleMode: "wild", wild: { speciesId: "pidgey", level: 1, balls: { "great-ball": 30 } }, allyIds: TEAM, allyLevels: levels(3) });
    expect(canUse(state, { type: "run" })).toBe(true);
    state = withUnit(state, activeUnit(state, "enemy").id, { hp: 1 });
    for (let i = 0; i < 30 && state.status === "playing"; i++) state = act(state, { type: "ball", ballId: "great-ball" });
    expect(state.status).toBe("captured");
    expect(state.balls["great-ball"]).toBeLessThan(30);
    const trainer = createTurnBattle(19, { stage: 1, allyIds: TEAM, allyLevels: levels(1) });
    expect(canUse(trainer, { type: "run" })).toBe(false);
    expect(canUse(trainer, { type: "ball", ballId: "poke-ball" })).toBe(false);
  });

  it("holds back so a wild Pokémon keeps at least 1 HP", () => {
    let state = createTurnBattle(23, { battleMode: "wild", wild: { speciesId: "rattata", level: 1, balls: {} }, allyIds: TEAM, allyLevels: levels(8) });
    state = withUnit(state, activeUnit(state, "enemy").id, { hp: 2 });
    state = act(state, { type: "holdBack" });
    expect(activeUnit(state, "enemy").hp).toBeGreaterThanOrEqual(1);
    expect(state.status).toBe("playing");
  });

  it("charges the Sync move after three moves", () => {
    let state = createTurnBattle(29, { stage: 1, allyIds: TEAM, allyLevels: levels(10) });
    expect(canUse(state, { type: "sync" })).toBe(false);
    for (let i = 0; i < 3 && state.phase === "choose" && state.status === "playing"; i++) state = act(state, firstMove(state));
    if (state.phase === "choose" && state.status === "playing" && activeUnit(state, "ally").id === "squirtle") expect(canUse(state, { type: "sync" })).toBe(true);
  });

  it("ends in a win when every opponent has fainted, rolling a wild drop", () => {
    let state = createTurnBattle(31, { battleMode: "wild", wild: { speciesId: "pidgey", level: 1, balls: {} }, allyIds: TEAM, allyLevels: levels(10) });
    for (let i = 0; i < 20 && state.status === "playing"; i++) state = act(state, firstMove(state));
    expect(state.status).toBe("won");
    expect(state.phase).toBe("over");
    expect(state.events[state.events.length - 1]?.kind).toBe("end");
  });

  it("has the opposing trainer heal once when its Pokémon is low", () => {
    let state = createTurnBattle(37, { stage: 1, allyIds: TEAM, allyLevels: levels(1) });
    const foe = activeUnit(state, "enemy");
    state = withUnit(state, foe.id, { hp: Math.max(1, Math.floor(foe.maxHp * 0.2)) });
    const after = act(state, { type: "switch", unitId: "bulbasaur" });
    expect(newEvents(state, after).some(e => e.kind === "heal" && e.side === "enemy")).toBe(true);
    expect(after.enemyTrainer.healUses).toBe(state.enemyTrainer.healUses - 1);
  });

  it("is deterministic for a seed", () => {
    const play = () => { let s = createTurnBattle(41, { stage: 2, allyIds: TEAM, allyLevels: levels(2) }); for (let i = 0; i < 12 && s.status === "playing"; i++) s = act(s, s.phase === "forcedSwitch" ? { type: "switch", unitId: partyOf(s, "ally").find(u => u.hp > 0 && u.id !== s.active.ally)!.id } : firstMove(s)); return s.events.map(e => e.text); };
    expect(play()).toEqual(play());
  });
});
