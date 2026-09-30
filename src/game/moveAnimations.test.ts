import { describe, expect, it } from "vitest";
import { Group } from "three";
import { battleMovesFor, battleReducer, createInitialBattleState, getBattleMoveIds, speciesNames, tickBattle } from "./battleState";
import { LEARNSET_MOVES, LEARNSET_SPECIES, MOVE_ANIMATIONS, MOVE_ARCHETYPES, learnsetFor } from "./moveAnimations";
import { createPokemonAnimator, moveTimeline } from "./pokemonAnimation";
import { POKEMON_MODELS } from "./pokemonModels";

describe("move animation catalog", () => {
  it("records a learnset for all 151 Kanto species", () => {
    expect(LEARNSET_SPECIES).toHaveLength(151);
    expect(LEARNSET_SPECIES.map(s => s.number)).toEqual(Array.from({ length: 151 }, (_, i) => i + 1));
    for (const species of LEARNSET_SPECIES) expect(species.learnset.length, species.name).toBeGreaterThan(0);
    expect(learnsetFor("pikachu").map(m => m.id)).toContain("thunder-shock");
  });

  it("records a movement for every Gen 1 learnset move and every battle move", () => {
    for (const id of Object.keys(LEARNSET_MOVES)) expect(MOVE_ANIMATIONS[id], id).toBeDefined();
    const battleIds = new Set(getBattleMoveIds());
    for (const species of speciesNames) for (const move of battleMovesFor(species)) battleIds.add(move.id);
    for (const id of ["hold-back", "trainer-buff", "paralyzed", "unity-burst"]) battleIds.add(id);
    for (const id of battleIds) expect(MOVE_ANIMATIONS[id], id).toBeDefined();
  });

  it("keeps every recorded movement well-formed", () => {
    for (const [id, archetype] of Object.entries(MOVE_ARCHETYPES)) {
      const times = archetype.keys.map(k => k.t);
      expect(times, id).toEqual([...times].sort((a, b) => a - b));
      expect(times[0], id).toBeGreaterThan(0);
      expect(times[times.length - 1], id).toBeLessThan(1);
      expect(archetype.strike[0], id).toBeLessThan(archetype.strike[1]);
      expect(archetype.movement.length, id).toBeGreaterThan(20);
    }
  });

  it("starts and ends every move at rest, and lengthens multi-hit moves", () => {
    for (const id of Object.keys(MOVE_ANIMATIONS)) {
      const { sample, duration } = moveTimeline(id);
      for (const u of [0, 1]) for (const [channel, value] of Object.entries(sample(u))) expect(Math.abs(value), `${id} ${channel} @${u}`).toBeLessThan(1e-9);
      expect(duration, id).toBeGreaterThan(0.3);
    }
    // Three swipes at 0.75x speed: about 1.27x one scratch.
    expect(moveTimeline("fury-swipes").duration).toBeGreaterThan(moveTimeline("scratch").duration * 1.2);
    // Alternating hits: the lead claw strikes first, the other claw on the second swipe.
    const { sample } = moveTimeline("fury-swipes");
    const peaks = Array.from({ length: 200 }, (_, i) => sample(i / 199));
    expect(Math.max(...peaks.map(p => p.leadArm))).toBeGreaterThan(1.5);
    expect(Math.max(...peaks.map(p => p.offArm))).toBeGreaterThan(1.5);
  });

  it("plays a move once through the animator and returns to idle", () => {
    const scene = new Group(); const root = new Group(); root.add(scene);
    const animator = createPokemonAnimator(scene, root, POKEMON_MODELS.machop, []);
    // Winds up first, then lunges in about half a second later.
    let lunge = 0;
    for (let i = 0; i < 60; i++) { animator.update("move:karate-chop", 1 / 60); lunge = Math.max(lunge, root.position.z); }
    expect(lunge).toBeGreaterThan(0);
    // The battle flag drops almost at once; the chop still plays out and then settles.
    for (let i = 0; i < 200; i++) animator.update("idle", 1 / 60);
    expect(Math.abs(root.position.z)).toBeLessThan(0.01);
    animator.dispose();
  });

  it("records the move a unit used so the battle can animate it", () => {
    let state = createInitialBattleState();
    state = { ...state, moveGauge: 6 };
    state = battleReducer(state, { type: "selectAlly", unitId: "bulbasaur" });
    state = battleReducer(battleReducer(state, { type: "useMove", moveId: "vine-whip" }), tickBattle(1));
    expect(state.units.find(u => u.id === "bulbasaur")?.lastMoveId).toBe("vine-whip");
    state = battleReducer(state, { type: "selectAlly", unitId: "squirtle" });
    state = battleReducer(battleReducer(state, { type: "useMove", moveId: "withdraw" }), tickBattle(1));
    expect(state.units.find(u => u.id === "squirtle")?.lastMoveId).toBe("withdraw");
  });

  it("lists battle moves for evolved forms too", () => {
    expect(battleMovesFor("blastoise").map(m => m.id)).toEqual(battleMovesFor("squirtle").map(m => m.id));
    expect(battleMovesFor("squirtle").map(m => m.id)).toContain("water-gun");
    expect(battleMovesFor("mew")).toEqual([]);
  });
});
