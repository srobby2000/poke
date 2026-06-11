import { describe, expect, it } from "vitest";
import {
  BALANCE,
  battleReducer,
  createInitialBattleState,
  getAllyOptions,
  getTypeEffectiveness,
  previewPlayerMove,
  tickBattle,
} from "./battleState";

const resolveQueuedActions = <T extends ReturnType<typeof createInitialBattleState>>(state: T) =>
  battleReducer(state, tickBattle(1));

describe("battle simulation", () => {
  it("uses PokeAPI-style base stats for creature tuning", () => {
    const state = createInitialBattleState();
    const squirtle = state.units.find((unit) => unit.id === "squirtle");
    const bulbasaur = state.units.find((unit) => unit.id === "bulbasaur");
    const charmander = state.units.find((unit) => unit.id === "charmander");
    const snorlax = state.units.find((unit) => unit.id === "snorlax");

    expect(squirtle?.name).toBe("Squirtle");
    expect(squirtle?.role).toBe("support");
    expect(squirtle?.passive.name).toBe("Team First Aid");
    expect(bulbasaur?.role).toBe("tech");
    expect(charmander?.role).toBe("strike");
    expect(squirtle?.sourcePokemon).toBe("Squirtle");
    expect(squirtle?.baseStats).toEqual({ hp: 44, attack: 50, defense: 65, speed: 43 });
    expect(snorlax?.name).toBe("Snorlax");
    expect(snorlax?.sourcePokemon).toBe("Snorlax");
    expect(snorlax?.baseStats).toEqual({ hp: 160, attack: 110, defense: 65, speed: 30 });
    expect(snorlax?.maxHp).toBeGreaterThan(squirtle?.maxHp ?? 0);
  });

  it("calculates elemental type effectiveness from PokeAPI-style damage relations", () => {
    expect(getTypeEffectiveness("electric", ["water"])).toBe(2);
    expect(getTypeEffectiveness("grass", ["bug", "flying"])).toBe(0.25);
    expect(getTypeEffectiveness("normal", ["ghost"])).toBe(0);
  });

  it("gives roles more distinct move sets", () => {
    const state = createInitialBattleState();
    const squirtle = state.units.find((unit) => unit.id === "squirtle");
    const bulbasaur = state.units.find((unit) => unit.id === "bulbasaur");
    const charmander = state.units.find((unit) => unit.id === "charmander");
    const pikachu = state.units.find((unit) => unit.id === "pikachu");
    const snorlax = state.units.find((unit) => unit.id === "snorlax");
    const butterfree = state.units.find((unit) => unit.id === "butterfree");

    expect(squirtle?.moves.map((move) => move.id)).toContain("aqua-tail");
    expect(bulbasaur?.moves.map((move) => move.id)).toContain("poison-powder");
    expect(charmander?.moves.map((move) => move.id)).toContain("flame-burst");
    expect(pikachu?.moves.map((move) => move.id)).toContain("electro-ball");
    expect(snorlax?.moves.map((move) => move.id)).toContain("heavy-slam");
    expect(butterfree?.moves.map((move) => move.id)).toContain("stun-spore");
    expect(pikachu?.trainerMove).toBeNull();
    expect(squirtle?.trainerMove).not.toBeNull();
  });

  it("covers the full attacking type chart", () => {
    expect(getTypeEffectiveness("poison", ["grass"])).toBe(2);
    expect(getTypeEffectiveness("poison", ["steel"])).toBe(0);
    expect(getTypeEffectiveness("ice", ["dragon"])).toBe(2);
    expect(getTypeEffectiveness("ghost", ["normal"])).toBe(0);
    expect(getTypeEffectiveness("fairy", ["dragon"])).toBe(2);
    expect(getTypeEffectiveness("ground", ["flying"])).toBe(0);
  });

  it("previews auto-target damage and effectiveness before using a move", () => {
    let state = createInitialBattleState();
    state = { ...state, moveGauge: 6 };
    state = battleReducer(state, { type: "selectAlly", unitId: "charmander" });
    state = battleReducer(state, { type: "selectEnemy", unitId: "snorlax" });

    const preview = previewPlayerMove(state, "ember");

    expect(preview?.targetName).toBe("Butterfree");
    expect(preview?.effectivenessLabel).toBe("x2");
    expect(preview?.estimatedDamage).toBeGreaterThan(0);
    expect(preview?.statusEffect).toBe("burn");
  });

  it("applies passive damage bonuses", () => {
    let state = createInitialBattleState();
    state = { ...state, moveGauge: 6 };
    state = battleReducer(state, { type: "setTargetMode", mode: "manual" });
    state = battleReducer(state, { type: "selectAlly", unitId: "charmander" });
    state = battleReducer(state, { type: "selectEnemy", unitId: "pikachu" });

    const healthyPreview = previewPlayerMove(state, "ember");
    const lowHpState = {
      ...state,
      units: state.units.map((unit) => (unit.id === "charmander" ? { ...unit, hp: Math.floor(unit.maxHp / 2) } : unit)),
    };
    const lowHpPreview = previewPlayerMove(lowHpState, "ember");

    expect(lowHpPreview?.estimatedDamage).toBeGreaterThan(healthyPreview?.estimatedDamage ?? 0);
  });

  it("applies type effectiveness and same-type attack bonus to move damage", () => {
    let state = createInitialBattleState();
    state = { ...state, moveGauge: 6 };
    state = battleReducer(state, { type: "selectAlly", unitId: "bulbasaur" });
    state = battleReducer(state, { type: "selectEnemy", unitId: "snorlax" });

    const beforePikachu = state.units.find((unit) => unit.id === "pikachu");
    const afterVineWhip = resolveQueuedActions(battleReducer(state, { type: "useMove", moveId: "vine-whip" }));
    const afterPikachu = afterVineWhip.units.find((unit) => unit.id === "pikachu");

    // Deterministic base damage is 75; the roll spans 0.85-1.0 plus a possible 1.5x crit.
    const dealt = (beforePikachu?.hp ?? 0) - (afterPikachu?.hp ?? 0);
    expect(dealt).toBeGreaterThanOrEqual(60);
    expect(dealt).toBeLessThanOrEqual(115);
    expect(afterVineWhip.log[0]).toContain("Vine Whip");
  });

  it("applies seeded damage variance within expected bounds", () => {
    const damages = new Set<number>();
    for (let i = 1; i <= 30; i += 1) {
      const seed = i * 104729; // spread seeds so first LCG outputs decorrelate
      let state = createInitialBattleState(seed);
      state = { ...state, moveGauge: 6 };
      state = battleReducer(state, { type: "setTargetMode", mode: "manual" });
      const resolved = resolveQueuedActions(battleReducer(state, { type: "useMove", moveId: "water-gun" }));
      const snorlax = resolved.units.find((unit) => unit.id === "snorlax");
      damages.add((snorlax?.maxHp ?? 0) - (snorlax?.hp ?? 0));
    }

    for (const damage of damages) {
      expect(damage).toBeGreaterThanOrEqual(35);
      expect(damage).toBeLessThanOrEqual(80);
    }
    expect(damages.size).toBeGreaterThan(1);
  });

  it("auto-targets the best enemy matchup for player moves", () => {
    let state = createInitialBattleState();
    state = { ...state, moveGauge: 6 };
    state = battleReducer(state, { type: "selectAlly", unitId: "charmander" });
    state = battleReducer(state, { type: "selectEnemy", unitId: "snorlax" });

    const beforeButterfree = state.units.find((unit) => unit.id === "butterfree");
    const beforeSnorlax = state.units.find((unit) => unit.id === "snorlax");
    const afterEmber = resolveQueuedActions(battleReducer(state, { type: "useMove", moveId: "ember" }));
    const afterButterfree = afterEmber.units.find((unit) => unit.id === "butterfree");
    const afterSnorlax = afterEmber.units.find((unit) => unit.id === "snorlax");

    expect(afterEmber.log[0]).toContain("Charmander used Ember");
    expect(afterEmber.log[0]).toContain("super effective");
    expect(afterEmber.feedback.some((entry) => entry.kind === "super" && entry.text.includes("x2"))).toBe(true);
    expect(afterButterfree?.hp).toBeLessThan(beforeButterfree?.hp ?? 0);
    expect(afterSnorlax?.hp).toBe(beforeSnorlax?.hp);
  });

  it("uses the selected enemy when player target mode is manual", () => {
    let state = createInitialBattleState();
    state = { ...state, moveGauge: 6 };
    state = battleReducer(state, { type: "setTargetMode", mode: "manual" });
    state = battleReducer(state, { type: "selectAlly", unitId: "charmander" });
    state = battleReducer(state, { type: "selectEnemy", unitId: "snorlax" });

    const beforeButterfree = state.units.find((unit) => unit.id === "butterfree");
    const beforeSnorlax = state.units.find((unit) => unit.id === "snorlax");
    const afterEmber = resolveQueuedActions(battleReducer(state, { type: "useMove", moveId: "ember" }));
    const afterButterfree = afterEmber.units.find((unit) => unit.id === "butterfree");
    const afterSnorlax = afterEmber.units.find((unit) => unit.id === "snorlax");

    expect(afterEmber.log[0]).toContain("Charmander used Ember");
    expect(afterSnorlax?.hp).toBeLessThan(beforeSnorlax?.hp ?? 0);
    expect(afterButterfree?.hp).toBe(beforeButterfree?.hp);
  });

  it("applies status conditions and status tick damage", () => {
    let state = createInitialBattleState();
    state = { ...state, moveGauge: 6 };
    state = battleReducer(state, { type: "setTargetMode", mode: "manual" });
    state = battleReducer(state, { type: "selectAlly", unitId: "charmander" });
    state = battleReducer(state, { type: "selectEnemy", unitId: "snorlax" });

    const afterEmber = resolveQueuedActions(battleReducer(state, { type: "useMove", moveId: "ember" }));
    const burned = afterEmber.units.find((unit) => unit.id === "snorlax");

    expect(burned?.statusCondition).toBe("burn");

    const afterBurnTick = battleReducer(afterEmber, tickBattle(1));
    const burnedAfterTick = afterBurnTick.units.find((unit) => unit.id === "snorlax");

    expect((burned?.hp ?? 0) - (burnedAfterTick?.hp ?? 0)).toBe(5);
    expect(afterBurnTick.log[0]).toContain("burn damage");
    expect(afterBurnTick.feedback.some((entry) => entry.kind === "status" && entry.text.includes("burn"))).toBe(true);
  });

  it("does not overwrite an existing status condition", () => {
    let state = createInitialBattleState(5);
    state = { ...state, moveGauge: 6 };
    state = battleReducer(state, { type: "setTargetMode", mode: "manual" });
    state = battleReducer(state, { type: "selectAlly", unitId: "charmander" });
    state = battleReducer(state, { type: "selectEnemy", unitId: "snorlax" });

    let next = resolveQueuedActions(battleReducer(state, { type: "useMove", moveId: "ember" }));
    expect(next.units.find((unit) => unit.id === "snorlax")?.statusCondition).toBe("burn");

    next = { ...next, moveGauge: 6 };
    next = battleReducer(next, { type: "selectAlly", unitId: "bulbasaur" });
    next = resolveQueuedActions(battleReducer(next, { type: "useMove", moveId: "poison-powder" }));

    expect(next.units.find((unit) => unit.id === "snorlax")?.statusCondition).toBe("burn");
  });

  it("slows the move gauge while an ally is paralyzed", () => {
    const base = createInitialBattleState(3);
    const paralyzed = {
      ...base,
      units: base.units.map((unit) =>
        unit.id === "squirtle" ? { ...unit, statusCondition: "paralysis" as const, statusTimer: 8 } : unit,
      ),
    };

    const normalTick = battleReducer(base, tickBattle(1));
    const slowedTick = battleReducer(paralyzed, tickBattle(1));

    expect(normalTick.moveGauge).toBeCloseTo(2.9, 5);
    expect(slowedTick.moveGauge).toBeCloseTo(2.72, 5);
  });

  it("activates and expires a team sync boost after sync moves", () => {
    let state = createInitialBattleState();

    for (let i = 0; i < 3; i += 1) {
      state = { ...state, moveGauge: 6 };
      state = resolveQueuedActions(battleReducer(state, { type: "useMove", moveId: "water-gun" }));
    }

    const afterSync = resolveQueuedActions(battleReducer(state, { type: "useSyncMove" }));
    expect(afterSync.syncBoosts.ally).toBeGreaterThan(0);

    let expired = afterSync;
    for (let i = 0; i < 4; i += 1) {
      expired = battleReducer(expired, tickBattle(1));
    }

    expect(expired.syncBoosts.ally).toBe(0);
  });

  it("queues player attacks before resolving damage", () => {
    let state = createInitialBattleState();
    state = { ...state, moveGauge: 6 };

    const queued = battleReducer(state, { type: "useMove", moveId: "water-gun" });
    const enemyHpBeforeResolve = new Map(
      queued.units.filter((unit) => unit.team === "enemy").map((unit) => [unit.id, unit.hp]),
    );
    const resolved = resolveQueuedActions(queued);
    const damagedEnemy = resolved.units.find((unit) => unit.team === "enemy" && unit.hp < (enemyHpBeforeResolve.get(unit.id) ?? 0));

    expect(queued.actionQueue).toHaveLength(1);
    expect(queued.units.filter((unit) => unit.team === "enemy").every((unit) => unit.hp === unit.maxHp)).toBe(true);
    expect(resolved.actionQueue).toHaveLength(0);
    expect(damagedEnemy).toBeDefined();
  });

  it("uses limited trainer moves for healing and buffs", () => {
    let state = createInitialBattleState();
    state = {
      ...state,
      selectedAllyId: "squirtle",
      units: state.units.map((unit) => (unit.id === "bulbasaur" ? { ...unit, hp: 50 } : unit)),
    };

    const afterPotion = battleReducer(state, { type: "useTrainerMove" });
    const healedBulbasaur = afterPotion.units.find((unit) => unit.id === "bulbasaur");
    const squirtle = afterPotion.units.find((unit) => unit.id === "squirtle");

    expect(healedBulbasaur?.hp).toBe(105);
    expect(squirtle?.trainerMove?.uses).toBe(1);
    expect(squirtle?.syncCountdown).toBe(2);
    expect(afterPotion.unityGauge).toBe(1);

    const afterDefense = battleReducer(
      { ...afterPotion, selectedAllyId: "bulbasaur" },
      { type: "useTrainerMove" },
    );

    expect(afterDefense.units.filter((unit) => unit.team === "ally").every((unit) => unit.defenseStage === 1)).toBe(true);
  });

  it("fills and spends the player move gauge", () => {
    const charged = battleReducer(createInitialBattleState(), tickBattle(2));

    expect(charged.moveGauge).toBeGreaterThan(2);

    const afterMove = battleReducer(charged, { type: "useMove", moveId: "water-gun" });

    expect(afterMove.moveGauge).toBeLessThan(charged.moveGauge);
  });

  it("charges and spends a team unity attack", () => {
    let state = createInitialBattleState();

    for (let i = 0; i < 3; i += 1) {
      state = { ...state, moveGauge: 6 };
      state = resolveQueuedActions(battleReducer(state, { type: "useMove", moveId: "water-gun" }));
    }

    expect(state.unityGauge).toBe(state.maxUnityGauge);

    const beforeEnemyHp = new Map(
      state.units.filter((unit) => unit.team === "enemy").map((unit) => [unit.id, unit.hp]),
    );
    const queued = battleReducer(state, { type: "useUnityAttack" });
    const resolved = resolveQueuedActions(queued);
    const damagedEnemy = resolved.units.find((unit) => unit.team === "enemy" && unit.hp < (beforeEnemyHp.get(unit.id) ?? 0));

    expect(queued.unityGauge).toBe(0);
    expect(queued.actionQueue.some((action) => action.unity)).toBe(true);
    expect(resolved.log[0]).toContain("Unity Burst");
    expect(resolved.feedback.some((entry) => entry.kind === "unity")).toBe(true);
    expect(damagedEnemy).toBeDefined();
  });

  it("charges and spends a Masters-style sync move", () => {
    let state = createInitialBattleState();

    for (let i = 0; i < 3; i += 1) {
      state = { ...state, moveGauge: 6 };
      state = battleReducer(state, { type: "useMove", moveId: "water-gun" });
      state = resolveQueuedActions(state);
    }

    expect(state.units.find((unit) => unit.id === "squirtle")?.syncCountdown).toBe(0);

    const beforeEnemyHp = new Map(
      state.units.filter((unit) => unit.team === "enemy").map((unit) => [unit.id, unit.hp]),
    );
    const afterSync = resolveQueuedActions(battleReducer(state, { type: "useSyncMove" }));
    const damagedEnemy = afterSync.units.find((unit) => unit.team === "enemy" && unit.hp < (beforeEnemyHp.get(unit.id) ?? 0));

    expect(afterSync.units.find((unit) => unit.id === "squirtle")?.syncCountdown).toBe(BALANCE.syncCountdownMax);
    expect(afterSync.log.some((entry) => entry.includes("unleashed Sync Hydro Crest"))).toBe(true);
    expect(damagedEnemy).toBeDefined();
  });

  it("tracks sync countdown per ally", () => {
    let state = createInitialBattleState(2);

    for (let i = 0; i < 3; i += 1) {
      state = { ...state, moveGauge: 6 };
      state = resolveQueuedActions(battleReducer(state, { type: "useMove", moveId: "water-gun" }));
    }

    expect(state.units.find((unit) => unit.id === "squirtle")?.syncCountdown).toBe(0);
    expect(state.units.find((unit) => unit.id === "charmander")?.syncCountdown).toBe(BALANCE.syncCountdownMax);
  });

  it("does not use sync move before it is ready", () => {
    const state = createInitialBattleState();
    const afterSyncAttempt = battleReducer(state, { type: "useSyncMove" });

    expect(afterSyncAttempt).toBe(state);
  });

  it("damages and can KO a selected enemy", () => {
    let state = createInitialBattleState(9);
    // Disable the rival trainer so heals don't undo the focus fire under test.
    state = { ...state, moveGauge: 6, enemyTrainer: { ...state.enemyTrainer, healUses: 0, buffUses: 0 } };
    state = battleReducer(state, { type: "selectEnemy", unitId: "butterfree" });

    for (let i = 0; i < 5; i += 1) {
      state = { ...state, moveGauge: 6 };
      state = battleReducer(state, { type: "useMove", moveId: "water-gun" });
      state = resolveQueuedActions(state);
    }

    const target = state.units.find((unit) => unit.id === "butterfree");
    expect(target?.hp).toBe(0);
  });

  it("lets ready enemies choose the best elemental attack automatically", () => {
    const state = createInitialBattleState();
    const afterTick = resolveQueuedActions(battleReducer(state, tickBattle(5)));

    const squirtle = afterTick.units.find((unit) => unit.id === "squirtle");
    const bulbasaur = afterTick.units.find((unit) => unit.id === "bulbasaur");

    expect(afterTick.log.some((entry) => entry.includes("Pikachu used Electro Ball"))).toBe(true);
    expect(afterTick.log.some((entry) => entry.includes("super effective"))).toBe(true);
    expect(squirtle?.hp).toBeLessThan(squirtle?.maxHp ?? 0);
    expect(bulbasaur?.hp).toBe(bulbasaur?.maxHp);
  });

  it("lets tech enemies prioritize useful status pressure", () => {
    const base = createInitialBattleState(11);
    const state = {
      ...base,
      enemyCooldowns: { ...base.enemyCooldowns, butterfree: 0, pikachu: 99, snorlax: 99 },
      units: base.units.map((unit) => (unit.team === "ally" ? { ...unit, hp: 300, maxHp: 300 } : unit)),
    };

    const queued = battleReducer(state, tickBattle(0.1));
    const resolved = resolveQueuedActions(queued);
    const paralyzedTarget = resolved.units.find((unit) => unit.team === "ally" && unit.statusCondition === "paralysis");

    expect(resolved.log.some((entry) => entry.includes("Butterfree used Stun Spore"))).toBe(true);
    expect(paralyzedTarget).toBeDefined();
  });

  it("charges enemy sync countdown from enemy actions", () => {
    const state = createInitialBattleState();
    const afterEnemyAction = battleReducer(state, tickBattle(5));

    expect(afterEnemyAction.enemySyncCountdown).toBe(2);
  });

  it("queues an enemy sync move when the enemy countdown is ready", () => {
    const state = { ...createInitialBattleState(), enemySyncCountdown: 0 };
    const afterEnemySyncQueued = battleReducer(state, tickBattle(5));

    expect(afterEnemySyncQueued.enemySyncCountdown).toBe(afterEnemySyncQueued.maxEnemySyncCountdown);
    expect(afterEnemySyncQueued.actionQueue.some((queued) => queued.sync)).toBe(true);
  });

  it("applies stat stage moves for support and tech roles", () => {
    let state = createInitialBattleState(4);

    // Withdraw: squirtle raises its own defense.
    state = { ...state, moveGauge: 6 };
    state = resolveQueuedActions(battleReducer(state, { type: "useMove", moveId: "withdraw" }));
    expect(state.units.find((unit) => unit.id === "squirtle")?.defenseStage).toBe(1);

    // Growl: bulbasaur lowers the attack of the hardest-hitting enemy (Snorlax).
    state = { ...state, moveGauge: 6 };
    state = battleReducer(state, { type: "selectAlly", unitId: "bulbasaur" });
    state = resolveQueuedActions(battleReducer(state, { type: "useMove", moveId: "growl" }));
    expect(state.units.find((unit) => unit.id === "snorlax")?.attackStage).toBe(-1);
    expect(state.log.some((entry) => entry.includes("Attack fell"))).toBe(true);
  });

  it("previews stat moves as support actions", () => {
    const state = createInitialBattleState(4);
    const preview = previewPlayerMove(state, "withdraw");

    expect(preview?.targetName).toBe("Squirtle");
    expect(preview?.estimatedDamage).toBe(0);
    expect(preview?.statChangeLabel).toBe("DEF +1 (self)");
  });

  it("can fully paralyze an attacker", () => {
    let blocked = 0;
    let landed = 0;
    for (let i = 1; i <= 40; i += 1) {
      const seed = i * 104729;
      let state = createInitialBattleState(seed);
      state = {
        ...state,
        moveGauge: 6,
        units: state.units.map((unit) =>
          unit.id === "squirtle" ? { ...unit, statusCondition: "paralysis" as const, statusTimer: 9 } : unit,
        ),
      };
      const resolved = resolveQueuedActions(battleReducer(state, { type: "useMove", moveId: "water-gun" }));
      if (resolved.log.some((entry) => entry.includes("fully paralyzed"))) {
        blocked += 1;
      } else {
        landed += 1;
      }
    }

    expect(blocked).toBeGreaterThan(0);
    expect(landed).toBeGreaterThan(0);
  });

  it("lets the enemy trainer heal a weakened teammate", () => {
    const base = createInitialBattleState(6);
    const state = {
      ...base,
      enemyCooldowns: { ...base.enemyCooldowns, pikachu: 0, snorlax: 99, butterfree: 99 },
      units: base.units.map((unit) => (unit.id === "snorlax" ? { ...unit, hp: 40 } : unit)),
    };

    const next = battleReducer(state, tickBattle(0.1));
    const snorlax = next.units.find((unit) => unit.id === "snorlax");

    expect(next.log.some((entry) => entry.includes("Super Potion"))).toBe(true);
    expect(snorlax?.hp).toBe(95);
    expect(next.enemyTrainer.healUses).toBe(1);
  });

  it("lets the enemy trainer buff before a sync move", () => {
    const base = createInitialBattleState(8);
    const state = {
      ...base,
      enemySyncCountdown: 1,
      enemyCooldowns: { ...base.enemyCooldowns, pikachu: 0, snorlax: 99, butterfree: 99 },
    };

    const next = battleReducer(state, tickBattle(0.1));

    expect(next.log.some((entry) => entry.includes("X Attack"))).toBe(true);
    expect(next.units.find((unit) => unit.id === "snorlax")?.attackStage).toBe(1);
    expect(next.enemyTrainer.buffUses).toBe(0);
  });

  it("respects manual targeting for unity attacks", () => {
    let state = createInitialBattleState(10);
    state = { ...state, unityGauge: state.maxUnityGauge };
    state = battleReducer(state, { type: "setTargetMode", mode: "manual" });
    state = battleReducer(state, { type: "selectEnemy", unitId: "snorlax" });

    const resolved = resolveQueuedActions(battleReducer(state, { type: "useUnityAttack" }));
    const snorlax = resolved.units.find((unit) => unit.id === "snorlax");
    const butterfree = resolved.units.find((unit) => unit.id === "butterfree");

    expect(snorlax?.hp).toBeLessThan(snorlax?.maxHp ?? 0);
    expect(butterfree?.hp).toBe(butterfree?.maxHp);
  });

  it("builds a battle from a chosen ally team", () => {
    const state = createInitialBattleState(1, { allyIds: ["eevee", "machop", "abra"] });
    const allies = state.units.filter((unit) => unit.team === "ally");

    expect(allies.map((unit) => unit.id)).toEqual(["eevee", "machop", "abra"]);
    expect(state.selectedAllyId).toBe("eevee");
    expect(new Set(allies.map((unit) => unit.position.join(","))).size).toBe(3);
    expect(state.config.allyIds).toEqual(["eevee", "machop", "abra"]);
  });

  it("scales enemy stats with the stage number", () => {
    const stageOne = createInitialBattleState(1, { stage: 1 });
    const stageFour = createInitialBattleState(1, { stage: 4 });

    const snorlaxOne = stageOne.units.find((unit) => unit.id === "snorlax");
    const snorlaxFour = stageFour.units.find((unit) => unit.id === "snorlax");
    const squirtleOne = stageOne.units.find((unit) => unit.id === "squirtle");
    const squirtleFour = stageFour.units.find((unit) => unit.id === "squirtle");

    expect(snorlaxFour?.maxHp ?? 0).toBeGreaterThan(snorlaxOne?.maxHp ?? 0);
    expect(snorlaxFour?.attack ?? 0).toBeGreaterThan(snorlaxOne?.attack ?? 0);
    expect(squirtleFour?.maxHp).toBe(squirtleOne?.maxHp);
    expect(stageFour.config.stage).toBe(4);
  });

  it("preserves team and stage on restart", () => {
    const state = createInitialBattleState(1, { allyIds: ["geodude", "vulpix", "jigglypuff"], stage: 3 });
    const restarted = battleReducer(state, { type: "restart" });

    expect(restarted.units.filter((unit) => unit.team === "ally").map((unit) => unit.id)).toEqual([
      "geodude",
      "vulpix",
      "jigglypuff",
    ]);
    expect(restarted.config.stage).toBe(3);
    expect(restarted.status).toBe("playing");
  });

  it("applies species stat overrides from live data", () => {
    const state = createInitialBattleState(1, {
      speciesStats: { snorlax: { hp: 300, attack: 110, defense: 65, speed: 30 } },
    });
    const snorlax = state.units.find((unit) => unit.id === "snorlax");

    expect(snorlax?.maxHp).toBe(Math.round(300 * 0.65 + 82));
  });

  it("exposes the full ally roster for team selection", () => {
    const options = getAllyOptions();

    expect(options).toHaveLength(16);
    expect(options.map((option) => option.id)).toContain("jigglypuff");
    expect(options.map((option) => option.id)).toContain("dratini");
    expect(options.every((option) => option.baseStats.hp > 0)).toBe(true);
    expect(options.filter((option) => option.role === "strike").length).toBeGreaterThanOrEqual(3);
    expect(options.filter((option) => option.rarity === 5).map((option) => option.id)).toEqual(["dratini", "lapras"]);
  });

  it("scales ally stats with their saved level", () => {
    const levelOne = createInitialBattleState(1);
    const levelSix = createInitialBattleState(1, { allyLevels: { squirtle: 6 } });

    const squirtleOne = levelOne.units.find((unit) => unit.id === "squirtle");
    const squirtleSix = levelSix.units.find((unit) => unit.id === "squirtle");

    expect(squirtleOne?.level).toBe(1);
    expect(squirtleSix?.level).toBe(6);
    expect(squirtleSix?.maxHp ?? 0).toBeGreaterThan(squirtleOne?.maxHp ?? 0);
    expect(squirtleSix?.attack ?? 0).toBeGreaterThan(squirtleOne?.attack ?? 0);
    // Restart keeps the levels via config.
    const restarted = battleReducer(levelSix, { type: "restart" });
    expect(restarted.units.find((unit) => unit.id === "squirtle")?.level).toBe(6);
  });

  it("pauses the battle and blocks actions while paused", () => {
    let state = createInitialBattleState(1);
    state = { ...state, moveGauge: 6 };

    const paused = battleReducer(state, { type: "togglePause" });
    expect(paused.paused).toBe(true);
    expect(battleReducer(paused, tickBattle(1))).toBe(paused);
    expect(battleReducer(paused, { type: "useMove", moveId: "water-gun" })).toBe(paused);

    const resumed = battleReducer(paused, { type: "togglePause" });
    expect(resumed.paused).toBe(false);
  });

  it("doubles simulation speed at 2x time scale", () => {
    const base = createInitialBattleState(1);

    const fast = battleReducer(base, { type: "cycleTimeScale" });
    expect(fast.timeScale).toBe(2);

    const ticked = battleReducer(fast, tickBattle(1));
    expect(ticked.elapsed).toBeCloseTo(2, 5);

    const cycled = battleReducer(fast, { type: "cycleTimeScale" });
    expect(cycled.timeScale).toBe(1);
  });

  it("records projectile flight time on queued actions", () => {
    let state = createInitialBattleState(1);
    state = { ...state, moveGauge: 6 };

    const queued = battleReducer(state, { type: "useMove", moveId: "water-gun" });

    expect(queued.actionQueue[0]?.totalDelay).toBe(BALANCE.playerAttackDelay);
    expect(queued.actionQueue[0]?.delay).toBe(queued.actionQueue[0]?.totalDelay);
  });

  it("detects wins and losses", () => {
    let won = createInitialBattleState();
    won = {
      ...won,
      units: won.units.map((unit) => (unit.team === "enemy" ? { ...unit, hp: 0 } : unit)),
    };
    expect(battleReducer(won, tickBattle(0.1)).status).toBe("won");

    let lost = createInitialBattleState();
    lost = {
      ...lost,
      units: lost.units.map((unit) => (unit.team === "ally" ? { ...unit, hp: 0 } : unit)),
    };
    expect(battleReducer(lost, tickBattle(0.1)).status).toBe("lost");
  });
});
