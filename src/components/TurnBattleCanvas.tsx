import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import type { PokemonType } from "../game/battleState";
import { MOVE_ARCHETYPES, moveAnimationFor } from "../game/moveAnimations";
import type { PokemonAction } from "../game/pokemonAnimation";
import { typeColor } from "../game/typeColors";
import type { TurnEvent, TurnSide } from "../game/turnBattle";
import { PokemonModel } from "./PokemonModel";
import { SceneContextStatus } from "./SceneContextStatus";
import { TrainerModel } from "./TrainerModel";

/** Trainer's-eye view: the camera stands behind the player's trainer, looking over their
 * shoulder. The player's Pokémon is near, back to the camera; the opponent is across the
 * field, facing it; an opposing trainer stands behind their Pokémon. */
const FIELD = {
  ally: [-1.2, 0, 1.35] as [number, number, number],
  enemy: [1.45, 0, -3.5] as [number, number, number],
  trainer: [-3.05, 0, 2.95] as [number, number, number],
  rival: [3.0, 0, -5.7] as [number, number, number],
  camera: [-2.3, 2.9, 7.4] as [number, number, number],
  lookAt: [0.25, 0.25, -1.9] as [number, number, number],
};
const facing = (from: [number, number, number], to: [number, number, number]) => Math.atan2(to[0] - from[0], to[2] - from[2]);

// Moves whose recorded movement closes the distance get a dash to the target and back;
// ranged ones fire a projectile across the field.
const CONTACT = new Set(["bite", "claw", "punch", "chop", "kick", "charge", "slam", "headbutt", "peck", "tail", "wrap", "wingStrike", "spin", "grapple"]);
const RANGED = new Set(["breath", "beam", "psychic", "electric", "gust", "powder", "sound", "throw", "song", "drain"]);
function moveReach(moveId: string) {
  const archetype = moveAnimationFor(moveId).archetype;
  return CONTACT.has(archetype) ? "contact" : RANGED.has(archetype) ? "ranged" : "self";
}

export type SlotView = { unitId: string; species: string; fainted: boolean };
export type BattleView = {
  ally: SlotView | null;
  enemy: SlotView | null;
  current: TurnEvent | null;
  /** When the current event started (performance.now()) and its length in seconds; a ref, so
   * the scene reads it every frame without re-rendering the page. */
  timing: { current: { startedAt: number; seconds: number } };
  rival: boolean;
};

export function TurnBattleCanvas({ view }: { view: BattleView }) {
  return (
    <Canvas className="battle-canvas tb-canvas" dpr={[1, 1.5]} shadows camera={{ position: FIELD.camera, fov: 40, near: 0.1, far: 60 }} onCreated={({ camera }) => camera.lookAt(...FIELD.lookAt)}>
      <color attach="background" args={["#9fd3f2"]} />
      <fog attach="fog" args={["#bfe3f6", 14, 34]} />
      <hemisphereLight args={["#e9f6ff", "#6f8f55", 1.1]} />
      <directionalLight castShadow position={[4, 9, 6]} intensity={2.1} shadow-mapSize={[1024, 1024]} />
      <Field />
      <Trainer position={FIELD.trainer} facingTo={FIELD.ally} shirt="#317cbd" />
      {view.rival && <Trainer position={FIELD.rival} facingTo={FIELD.trainer} shirt="#b64a55" cap="#2e3a4f" />}
      {view.ally && <Slot key={view.ally.unitId} side="ally" slot={view.ally} view={view} />}
      {view.enemy && <Slot key={view.enemy.unitId} side="enemy" slot={view.enemy} view={view} />}
      <Projectile view={view} />
      <Ball view={view} />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={18} blur={2.4} far={6} />
      <SceneContextStatus />
    </Canvas>
  );
}

function Field() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -1]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#7fb069" roughness={0.95} />
      </mesh>
      {/* Battle pads under each Pokémon, as on a main-series field. */}
      {[FIELD.ally, FIELD.enemy].map((position, index) => (
        <group key={index} position={[position[0], 0.005, position[2]]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.62, 1]}>
            <circleGeometry args={[1.45, 48]} />
            <meshStandardMaterial color={index ? "#c9b98d" : "#bfae80"} roughness={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.62, 1]} position={[0, 0.004, 0]}>
            <ringGeometry args={[1.38, 1.46, 48]} />
            <meshStandardMaterial color="#8e7f58" />
          </mesh>
        </group>
      ))}
      {[[-7, -9], [6.5, -11], [-10, -4], [9.5, -6], [-5.5, -14], [3, -15]].map(([x, z], index) => (
        <group key={index} position={[x, 0, z]}>
          <mesh castShadow position={[0, 0.9, 0]}><cylinderGeometry args={[0.18, 0.25, 1.8, 7]} /><meshStandardMaterial color="#7a5638" /></mesh>
          <mesh castShadow position={[0, 2.3, 0]}><icosahedronGeometry args={[1.25, 0]} /><meshStandardMaterial color={index % 2 ? "#4f8f4a" : "#5d9e52"} flatShading /></mesh>
        </group>
      ))}
    </group>
  );
}

function Trainer({ position, facingTo, shirt, cap }: { position: [number, number, number]; facingTo: [number, number, number]; shirt: string; cap?: string }) {
  return <group position={position} rotation={[0, facing(position, facingTo), 0]}><TrainerModel shirt={shirt} cap={cap} /></group>;
}

const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

function Slot({ side, slot, view }: { side: TurnSide; slot: SlotView; view: BattleView }) {
  const group = useRef<Group>(null);
  const home = side === "ally" ? FIELD.ally : FIELD.enemy;
  const target = side === "ally" ? FIELD.enemy : FIELD.ally;
  const current = view.current;
  const mine = current?.unitId === slot.unitId;
  let animation: PokemonAction = "idle";
  if (mine && current?.kind === "move" && current.moveId) animation = `move:${current.moveId}`;
  else if (mine && current?.kind === "damage") animation = "hit";
  const fainted = slot.fainted || (mine && current?.kind === "faint");
  // Set on the first frame: reading the clock during render isn't allowed.
  const mountedAt = useRef(0);
  useFrame(() => {
    const node = group.current;
    if (!node) return;
    const now = performance.now();
    if (!mountedAt.current) mountedAt.current = now;
    const { startedAt, seconds } = view.timing.current;
    const t = seconds > 0 ? (now - startedAt) / 1000 / seconds : 1;
    let scale = 1, x = home[0], y = 0, z = home[2];
    // Popping out of its ball when sent in, shrinking back when withdrawn or caught.
    const sinceMount = (now - mountedAt.current) / 1000;
    if (sinceMount < 0.45) scale = ease(sinceMount / 0.45);
    if (mine && current?.kind === "withdraw") scale = 1 - ease(t / 0.8);
    if (mine && current?.kind === "ball") scale = current.caught || t < 0.72 ? (t < 0.3 ? 1 - ease((t - 0.18) / 0.12) : 0) : ease((t - 0.72) / 0.12);
    if (fainted) {
      const f = mine && current?.kind === "faint" ? ease(t / 0.7) : 1;
      y = -0.9 * f; scale *= 1 - 0.6 * f;
    }
    // Contact moves travel most of the way to the target and come back.
    if (mine && current?.kind === "move" && current.moveId && moveReach(current.moveId) === "contact") {
      const reach = Math.sin(Math.PI * ease(Math.min(1, t / 0.85))) * 0.62;
      x += (target[0] - home[0]) * reach; z += (target[2] - home[2]) * reach;
    }
    node.position.set(x, y, z);
    node.scale.setScalar(Math.max(0.001, scale));
    // Taking a hit: a quick blink, as in the main series, while the flinch plays.
    node.visible = !(mine && current?.kind === "damage" && t < 0.45 && Math.floor(t * 14) % 2 === 1);
  });
  return <group ref={group} position={home} rotation={[0, facing(home, target), 0]}>
    <PokemonModel species={slot.species} animation={animation} fainted={fainted} />
  </group>;
}

function Projectile({ view }: { view: BattleView }) {
  const ref = useRef<Group>(null);
  const current = view.current;
  const active = current?.kind === "move" && !!current.moveId && moveReach(current.moveId) === "ranged";
  const from = current?.side === "ally" ? FIELD.ally : FIELD.enemy;
  const to = current?.side === "ally" ? FIELD.enemy : FIELD.ally;
  const archetype = active ? moveAnimationFor(current!.moveId!).archetype : null;
  useFrame(() => {
    const node = ref.current;
    if (!node) return;
    const { startedAt, seconds } = view.timing.current;
    const t = seconds > 0 ? (performance.now() - startedAt) / 1000 / seconds : 1;
    // Launch at the strike of the recorded movement and land just before the event ends.
    const strike = archetype ? MOVE_ARCHETYPES[archetype].strike[0] : 0.3;
    const p = (t - strike) / Math.max(0.2, 0.9 - strike);
    node.visible = active && p > 0 && p < 1;
    if (!node.visible) return;
    const e = ease(p);
    node.position.set(from[0] + (to[0] - from[0]) * e, 0.9 + Math.sin(Math.PI * e) * (archetype === "throw" ? 1.3 : 0.35), from[2] + (to[2] - from[2]) * e);
    node.rotation.set(p * 9, p * 7, 0);
  });
  return <group ref={ref} visible={false}>
    <ProjectileShape type={current?.moveType} archetype={archetype} />
  </group>;
}

function ProjectileShape({ type, archetype }: { type?: PokemonType; archetype: string | null }) {
  const color = typeColor(type ?? "normal");
  const material = <meshBasicMaterial color={color} toneMapped={false} />;
  if (archetype === "beam") return <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.09, 0.09, 1.6, 8]} />{material}</mesh>;
  if (archetype === "electric") return <mesh><octahedronGeometry args={[0.2, 0]} />{material}</mesh>;
  if (archetype === "psychic" || archetype === "sound" || archetype === "song") return <mesh><torusGeometry args={[0.24, 0.07, 8, 20]} /><meshBasicMaterial color={color} transparent opacity={0.8} toneMapped={false} /></mesh>;
  if (archetype === "powder" || archetype === "gust") return <group>{[0, 1, 2, 3].map(i => <mesh key={i} position={[Math.sin(i * 1.7) * 0.25, Math.cos(i * 2.3) * 0.2, Math.sin(i) * 0.2]}><sphereGeometry args={[0.08, 8, 6]} /><meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} /></mesh>)}</group>;
  if (archetype === "throw") return <mesh><dodecahedronGeometry args={[0.18, 0]} />{material}</mesh>;
  return <mesh><sphereGeometry args={[0.2, 14, 10]} />{material}</mesh>;
}

function Ball({ view }: { view: BattleView }) {
  const ref = useRef<Group>(null);
  const top = useRef<Mesh>(null);
  const current = view.current;
  const active = current?.kind === "ball";
  useFrame(() => {
    const node = ref.current;
    if (!node) return;
    node.visible = active;
    if (!active) return;
    const t = (performance.now() - view.timing.current.startedAt) / 1000 / view.timing.current.seconds;
    const start = [FIELD.trainer[0] + 0.3, 1.5, FIELD.trainer[2] - 0.3], end = [FIELD.enemy[0], 0.22, FIELD.enemy[2] + 0.4];
    const flight = ease(t / 0.2);
    node.position.set(start[0] + (end[0] - start[0]) * flight, t < 0.2 ? start[1] + (end[1] - start[1]) * flight + Math.sin(Math.PI * flight) * 1.6 : end[1], start[2] + (end[2] - start[2]) * flight);
    // Shakes happen between 0.3 and 0.72 of the event; a break-free hides the ball.
    const shaking = t > 0.3 && t < 0.72 ? Math.sin((t - 0.3) / 0.42 * Math.PI * 2 * Math.max(1, current!.shakes ?? 0)) * 0.35 : 0;
    node.rotation.set(0, 0, (current!.shakes ?? 0) > 0 ? shaking : 0);
    node.visible = current!.caught || t < 0.72;
  });
  return <group ref={ref} visible={false}>
    <mesh ref={top} position={[0, 0.06, 0]}><sphereGeometry args={[0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e33b3b" /></mesh>
    <mesh position={[0, 0.06, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#f5f5f5" /></mesh>
    <mesh position={[0, 0.06, 0.19]}><cylinderGeometry args={[0.05, 0.05, 0.03, 12]} /><meshStandardMaterial color="#f5f5f5" /></mesh>
  </group>;
}
