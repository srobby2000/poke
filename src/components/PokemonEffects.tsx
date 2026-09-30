import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, Group, InstancedMesh, Mesh, MeshBasicMaterial, NormalBlending, Object3D, Vector3 } from "three";
import type { AttackEffect, EffectStyle } from "../game/pokemonEffects";
import { attackEffectFor, attackEffectPhase, EFFECT_STYLES, hasFlameTrail, movementEffectFor } from "../game/pokemonEffects";
import type { PokemonAction } from "../game/pokemonAnimation";
import { normalizePokemonBone } from "../game/pokemonAppendages";

export type EffectFrame = { phase: number; from: Vector3; to: Vector3; size: number; trail?: boolean; beam?: boolean; drain?: boolean };
const COUNT = 40;

/** A bounded particle pool. No textures, timers, per-frame React state, or particle objects. */
export function EffectStream({ style, onSample, beam = false, drain = false }: { style: EffectStyle; onSample: (kind: EffectStyle["kind"]) => EffectFrame | null; beam?: boolean; drain?: boolean }) {
  const group = useRef<Group>(null), particles = useRef<InstancedMesh>(null), core = useRef<Mesh>(null);
  const rings = useRef<Group>(null);
  const scratchRef = useRef({ dummy: new Object3D(), direction: new Vector3(), unit: new Vector3(), center: new Vector3(), up: new Vector3(0, 1, 0), color: new Color() });
  const luminous = ["fire", "electric", "psychic", "ghost", "heal"].includes(style.kind);
  useFrame(() => {
    const node = group.current, pool = particles.current;
    if (!node || !pool) return;
    const frame = onSample(style.kind);
    node.visible = !!frame && frame.phase >= 0 && frame.phase <= 1;
    if (!frame || !node.visible) return;
    const { phase, from, to, size, trail } = frame;
    const useBeam = frame.beam ?? beam, reverse = frame.drain ?? drain;
    const scratch = scratchRef.current;
    const { dummy, direction, center } = scratch;
    direction.subVectors(to, from);
    scratch.unit.copy(direction).normalize();
    const travel = Math.min(1, phase / 0.72);
    center.copy(reverse ? to : from).lerp(reverse ? from : to, travel);
    const fade = trail ? 0.65 : Math.min(1, phase * 12) * Math.min(1, (1 - phase) * 8);
    (pool.material as MeshBasicMaterial).opacity = fade * (style.kind === "dust" ? 0.38 : 0.85);
    for (let i = 0; i < COUNT; i++) {
      const seed = i * 2.399963;
      const life = trail ? (phase + i / COUNT) % 1 : (phase * 1.7 + i / COUNT) % 1;
      const spread = size * (trail ? 0.18 : 0.08 + life * 0.2);
      if (useBeam && !trail && phase < 0.75) dummy.position.copy(from).addScaledVector(direction, i / COUNT * travel);
      else dummy.position.copy(center);
      if (trail) dummy.position.lerpVectors(from, to, life);
      const burst = !trail && phase > 0.72 ? (phase - 0.72) * size * 2 : 0;
      dummy.position.x += Math.cos(seed + phase * 3) * (spread + burst);
      dummy.position.y += Math.sin(seed * 1.7) * spread + (style.kind === "fire" ? life * size * 0.4 : style.kind === "water" ? -life * life * size * 0.12 : burst * Math.sin(seed));
      dummy.position.z += Math.sin(seed + phase * 3) * (spread + burst);
      const radius = size * (0.025 + (i % 5) * 0.006) * (1 - life * 0.6);
      dummy.scale.set(radius, radius, radius);
      if (style.kind === "fire") dummy.scale.set(radius, radius * 3, radius);
      if (style.kind === "water") dummy.scale.set(radius, radius * 1.8, radius);
      if (style.kind === "leaf") dummy.scale.set(radius * 2, radius * 0.3, radius);
      if (style.kind === "ice") dummy.scale.set(radius * 0.7, radius * 2.5, radius * 0.7);
      if (style.kind === "electric" || style.kind === "wind") dummy.scale.set(radius * 0.45, radius * 0.45, radius * (trail ? 9 : 5));
      dummy.rotation.set(seed + phase * 4, seed * 0.7, seed);
      if (style.kind === "electric" && useBeam && !trail) {
        dummy.position.copy(from).addScaledVector(direction, i / COUNT * travel);
        dummy.position.x += Math.sin(i * 2.5 + Math.floor(phase * 22)) * size * 0.12;
        dummy.position.y += Math.cos(i * 2.1 + Math.floor(phase * 22)) * size * 0.12;
        dummy.quaternion.setFromUnitVectors(scratch.up, scratch.unit);
        dummy.scale.set(size * 0.018, direction.length() / COUNT * 1.9, size * 0.018);
      }
      dummy.updateMatrix(); pool.setMatrixAt(i, dummy.matrix);
      pool.setColorAt(i, scratch.color.set(i % 3 ? style.color : style.core));
    }
    pool.instanceMatrix.needsUpdate = true;
    if (pool.instanceColor) pool.instanceColor.needsUpdate = true;
    if (core.current) {
      core.current.visible = useBeam && !trail && phase < 0.8 && ["water", "fire", "ice", "psychic"].includes(style.kind);
      core.current.position.copy(from).addScaledVector(direction, travel * 0.5);
      core.current.quaternion.setFromUnitVectors(scratch.up, scratch.unit);
      core.current.scale.set(size * 0.035 * fade, direction.length() * travel, size * 0.035 * fade);
      (core.current.material as MeshBasicMaterial).opacity = fade * 0.5;
    }
    if (rings.current) {
      rings.current.position.copy(center);
      rings.current.children.forEach((ring, i) => {
        const p = (phase + i / 3) % 1;
        ring.scale.setScalar(size * (0.12 + p * 0.6));
        ring.rotation.set(trail && style.kind === "water" ? -Math.PI / 2 : 0, 0, phase * 2);
        (ring as Mesh<Mesh["geometry"], MeshBasicMaterial>).material.opacity = (1 - p) * fade * 0.5;
      });
    }
  });
  return <group ref={group} name={`effect-${style.kind}`} visible={false}>
    <instancedMesh ref={particles} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      {style.kind === "fire" ? <coneGeometry args={[1, 2, 5]} /> : style.kind === "ice" || style.kind === "electric" ? <octahedronGeometry args={[1, 0]} /> : <icosahedronGeometry args={[1, 1]} />}
      <meshBasicMaterial transparent depthWrite={false} blending={luminous ? AdditiveBlending : NormalBlending} toneMapped={false} />
    </instancedMesh>
    {beam && <mesh ref={core} visible={false}><cylinderGeometry args={[1, 1, 1, 8]} /><meshBasicMaterial color={style.core} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} /></mesh>}
    {["water", "wind", "psychic", "ghost", "heal"].includes(style.kind) && <group ref={rings}>{[0, 1, 2].map(i => <mesh key={i}><torusGeometry args={[1, 0.025, 4, 28]} /><meshBasicMaterial color={style.core} transparent depthWrite={false} toneMapped={false} /></mesh>)}</group>}
  </group>;
}

export type EffectPlayback = { action: PokemonAction | undefined; time: number; duration: number };
export function PokemonEffects({ scene, species, number, height, playback, paused, fainted, attackEffects = true, playbackRate = 1 }: {
  scene: Object3D; species: string; number: number; height: number; playback: () => EffectPlayback | undefined; paused: boolean; fainted: boolean; attackEffects?: boolean; playbackRate?: number;
}) {
  const clock = useRef(0);
  const container = useRef<Group>(null);
  const anchors = useMemo(() => {
    const found: Partial<Record<AttackEffect["anchor"], Object3D>> = {};
    scene.traverse(node => {
      const name = normalizePokemonBone(node.name);
      if (/^Head$/i.test(name)) found.head ??= node;
      if (/^RHand$/i.test(name)) found.hand ??= node;
      if (/^Tail\d+$/i.test(name)) found.tail = node;
    });
    return found;
  }, [scene]);
  const points = useRef({ origin: new Vector3(), target: new Vector3() });
  const movement = movementEffectFor(number);
  useFrame((_, delta) => { if (!paused && !fainted) clock.current += Math.min(delta * playbackRate, 0.1); }, -1);
  const location = (anchor: AttackEffect["anchor"]) => {
    const { origin } = points.current;
    origin.set(0, height * 0.55, height * 0.15);
    const bone = anchors[anchor];
    if (bone && container.current) { bone.getWorldPosition(origin); container.current.worldToLocal(origin); }
    return origin;
  };
  // Render the fixed style pools once. Only the pool matching the active move becomes visible.
  const attackSample = (kind: EffectStyle["kind"]): EffectFrame | null => {
    const state = playback();
    if (fainted || !attackEffects || !state || !(state.action === "attack" || state.action?.startsWith("move:"))) return null;
    const id = state.action === "attack" ? "tackle" : state.action.slice(5);
    const effect = attackEffectFor(id, species);
    if (!effect || effect.kind !== kind) return null;
    const { origin, target } = points.current;
    location(effect.anchor);
    target.copy(origin).add(new Vector3(0, 0, effect.reach === "ranged" ? height * 1.1 : effect.reach === "contact" ? height * 0.4 : 0));
    return { phase: attackEffectPhase(state.time / state.duration, effect.hits), from: origin, to: target, size: height * 0.6, beam: effect.beam, drain: effect.drain };
  };
  const movementSample = (flame = false): EffectFrame | null => {
    const { origin, target } = points.current;
    const state = playback();
    if (fainted || !state || !["walk", "run"].includes(state.action ?? "")) return null;
    if (flame) location(number === 77 || number === 78 || number === 146 ? "body" : "tail");
    else origin.set(0, movement?.kind === "dust" || movement?.kind === "water" ? 0.035 : height * 0.45, -height * 0.1);
    target.copy(origin); target.z -= height * 0.6;
    return { phase: clock.current % 1, from: origin, to: target, size: height * (state.action === "run" ? 0.65 : 0.45), trail: true };
  };
  return <group ref={container} name="pokemon-effects">
    {attackEffects && Object.values(EFFECT_STYLES).map(style => <EffectStream key={style.kind} style={style} beam onSample={attackSample} />)}
    {movement && <EffectStream style={movement} onSample={() => movementSample()} />}
    {hasFlameTrail(number) && <EffectStream style={EFFECT_STYLES.fire} onSample={() => movementSample(true)} />}
  </group>;
}
