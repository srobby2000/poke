import { act, create } from "@react-three/test-renderer";
import { expect, it } from "vitest";
import { Bone, Group, InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";
import { EffectStream, PokemonEffects } from "./PokemonEffects";
import type { EffectPlayback } from "./PokemonEffects";
import { EFFECT_STYLES } from "../game/pokemonEffects";

it("shows only the active move's pool, stops after the one-shot and hides fainted effects", async () => {
  const scene = new Group();
  const state: EffectPlayback = { action: "move:water-gun", time: 0, duration: 1 };
  const props = { scene, species: "squirtle", number: 7, height: 1, playback: () => state, paused: false, fainted: false };
  const renderer = await create(<PokemonEffects {...props} />);
  const visible = () => { const names: string[] = []; renderer.scene.instance.traverse(node => { if (node.name.startsWith("effect-") && node.visible) names.push(node.name); }); return names; };
  try {
    await act(async () => { await renderer.advanceFrames(1, 0.1); });
    expect(visible()).toEqual([]);
    state.time = 0.5;
    await act(async () => { await renderer.advanceFrames(1, 0.1); });
    expect(visible()).toEqual(["effect-water"]);
    renderer.scene.instance.traverse(node => { if (node instanceof InstancedMesh && node.parent?.visible) expect(Array.from(node.instanceMatrix.array).every(Number.isFinite)).toBe(true); });
    state.time = 1;
    await act(async () => { await renderer.advanceFrames(1, 0.1); });
    expect(visible()).toEqual([]);
    state.time = 0.5;
    await renderer.update(<PokemonEffects {...props} fainted />);
    await act(async () => { await renderer.advanceFrames(1, 0.1); });
    expect(visible()).toEqual([]);
  } finally { await renderer.unmount(); }
});

it("freezes movement particles when paused and removes them on idle", async () => {
  const state: EffectPlayback = { action: "run", time: 0.2, duration: 1 };
  const props = { scene: new Group(), species: "ponyta", number: 77, height: 1, playback: () => state, paused: false, fainted: false };
  const renderer = await create(<PokemonEffects {...props} />);
  try {
    await act(async () => { await renderer.advanceFrames(3, 0.1); });
    const fire = renderer.scene.instance.getObjectsByProperty("name", "effect-fire").find(node => node.visible)!;
    expect(fire).toBeDefined();
    const pool = fire.children[0] as InstancedMesh;
    await renderer.update(<PokemonEffects {...props} paused />);
    const before = Array.from(pool.instanceMatrix.array);
    await act(async () => { await renderer.advanceFrames(3, 0.1); });
    expect(Array.from(pool.instanceMatrix.array)).toEqual(before);
    state.action = "idle";
    await act(async () => { await renderer.advanceFrames(1, 0.1); });
    expect(fire.visible).toBe(false);
  } finally { await renderer.unmount(); }
});

it("keeps a tail flame shedding embers at rest, and freezes them when paused", async () => {
  // Charmander's flame is fire, not a movement trail: embers rise from its tip even while idle.
  const scene = new Group(), tip = new Bone();
  tip.name = "TailA03"; tip.position.set(0, 0.8, -0.4); scene.add(tip);
  const state: EffectPlayback = { action: "idle", time: 0, duration: 1 };
  const props = { scene, species: "charmander", number: 4, height: 1, playback: () => state, paused: false, fainted: false };
  const renderer = await create(<PokemonEffects {...props} />);
  try {
    await act(async () => { await renderer.advanceFrames(6, 0.05); });
    const pool = renderer.scene.instance.getObjectByName("flame-embers")!.children[0] as InstancedMesh;
    const matrix = new Matrix4(), position = new Vector3(), scale = new Vector3();
    const live = () => Array.from({ length: pool.count }, (_, i) => { pool.getMatrixAt(i, matrix); matrix.decompose(position, new Quaternion(), scale); return { y: position.y, size: scale.x }; }).filter(ember => ember.size > 0);
    expect(live().length).toBeGreaterThan(5);
    // They start at the flame and rise from it.
    expect(Math.max(...live().map(ember => ember.y))).toBeGreaterThan(0.8);
    await renderer.update(<PokemonEffects {...props} paused />);
    const before = Array.from(pool.instanceMatrix.array);
    await act(async () => { await renderer.advanceFrames(3, 0.05); });
    expect(Array.from(pool.instanceMatrix.array)).toEqual(before);
  } finally { await renderer.unmount(); }
});

it("orients the beam along its target vector and handles zero-length impacts", async () => {
  const from = new Vector3(1, 1, 2), to = new Vector3(-2, 2, -4);
  const renderer = await create(<EffectStream style={EFFECT_STYLES.water} beam onSample={() => ({ phase: 0.5, from, to, size: 1 })} />);
  try {
    await act(async () => { await renderer.advanceFrames(1, 0.1); });
    const root = renderer.scene.instance.getObjectByName("effect-water")!;
    const beam = root.children[1];
    expect(new Vector3(0, 1, 0).applyQuaternion(beam.quaternion).distanceTo(to.clone().sub(from).normalize())).toBeLessThan(0.0001);
    to.copy(from);
    await act(async () => { await renderer.advanceFrames(1, 0.1); });
    expect(beam.quaternion.toArray().every(Number.isFinite)).toBe(true);
  } finally { await renderer.unmount(); }
});
