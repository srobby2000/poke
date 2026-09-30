import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import { moveAnimationFor } from "../game/moveAnimations";
import type { PokemonAction } from "../game/pokemonAnimation";
import { Vector3 } from "three";
import { attackEffectFor, attackEffectPhase } from "../game/pokemonEffects";
import { moveTimeline } from "../game/pokemonAnimation";
import type { BattleArena } from "../game/battleArenas";
import { ARENAS } from "../game/battleArenas";
import { BattleArenaScenery } from "./BattleArenaScenery";
import { EffectStream } from "./PokemonEffects";
import type { TurnEvent, TurnSide } from "../game/turnBattle";
import { PokemonModel } from "./PokemonModel";
import { PokemonLighting } from "./PokemonLighting";
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

/** When a contact move's recorded lunge peaks (fraction of its clip), and the clip length. */
const strikes = new Map<string, { strike: number; duration: number }>();
function strikeOf(moveId: string) {
  let found = strikes.get(moveId);
  if (!found) {
    const { duration, sample } = moveTimeline(moveId);
    let strike = 0.45, best = -Infinity;
    for (let i = 0; i <= 80; i++) { const lunge = sample(i / 80).lunge; if (lunge > best) { best = lunge; strike = i / 80; } }
    found = { strike, duration };
    strikes.set(moveId, found);
  }
  return found;
}
/** Close the distance just before the strike, hold contact through it, return in recovery. */
function dashReach(moveId: string, seconds: number) {
  const { strike, duration } = strikeOf(moveId);
  const u = seconds / duration;
  if (u < strike - 0.28) return 0;
  if (u < strike) return ease((u - (strike - 0.28)) / 0.28);
  if (u < strike + 0.12) return 1;
  return 1 - ease((u - strike - 0.12) / 0.35);
}

export type SlotView = { unitId: string; species: string; fainted: boolean };
export type BattleView = {
  ally: SlotView | null;
  enemy: SlotView | null;
  current: TurnEvent | null;
  /** When the current event started (performance.now()), its on-screen length in seconds and
   * the playback rate (battle speed); a ref, so the scene reads it every frame without
   * re-rendering the page. Animation time is real time × rate. */
  timing: { current: { startedAt: number; seconds: number; rate: number } };
  rival: boolean;
  arena: BattleArena;
  /** Battle speed, for the Pokémon's own animation playback. */
  speed: number;
};

export function TurnBattleCanvas({ view }: { view: BattleView }) {
  const allyAnchor = useRef(new Vector3(FIELD.ally[0], 0.9, FIELD.ally[2]));
  const enemyAnchor = useRef(new Vector3(FIELD.enemy[0], 0.9, FIELD.enemy[2]));
  return (
    <Canvas className="battle-canvas tb-canvas" dpr={[1, 1.5]} shadows camera={{ position: FIELD.camera, fov: 40, near: 0.1, far: 60 }} onCreated={({ camera }) => camera.lookAt(...FIELD.lookAt)}>
      <Arena arena={view.arena} />
      <Trainer position={FIELD.trainer} facingTo={FIELD.ally} shirt="#317cbd" />
      {view.rival && <Trainer position={FIELD.rival} facingTo={FIELD.trainer} shirt="#b64a55" cap="#2e3a4f" />}
      {view.ally && <Slot key={view.ally.unitId} effectAnchor={allyAnchor} side="ally" slot={view.ally} view={view} />}
      {view.enemy && <Slot key={view.enemy.unitId} effectAnchor={enemyAnchor} side="enemy" slot={view.enemy} view={view} />}
      <Projectile view={view} allyAnchor={allyAnchor} enemyAnchor={enemyAnchor} />
      <Ball view={view} />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={18} blur={2.4} far={6} />
      <SceneContextStatus />
    </Canvas>
  );
}

/** Sky, fog, lighting and scenery for the battle's arena. */
function Arena({ arena }: { arena: BattleArena }) {
  const look = ARENAS[arena];
  return <>
    <color attach="background" args={[look.sky]} />
    <fog attach="fog" args={look.fog} />
    <PokemonLighting mood={look.light.cave ? "cave" : "battle"} tint={look.light} />
    <BattleArenaScenery arena={arena} pads={[FIELD.ally, FIELD.enemy]} />
  </>;
}

function Trainer({ position, facingTo, shirt, cap }: { position: [number, number, number]; facingTo: [number, number, number]; shirt: string; cap?: string }) {
  return <group position={position} rotation={[0, facing(position, facingTo), 0]}><TrainerModel shirt={shirt} cap={cap} /></group>;
}

const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

function Slot({ effectAnchor, side, slot, view }: { effectAnchor: { current: Vector3 }; side: TurnSide; slot: SlotView; view: BattleView }) {
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
    const { startedAt, seconds, rate } = view.timing.current;
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
    // Contact moves travel most of the way to the target, timed to land on the strike.
    if (mine && current?.kind === "move" && current.moveId && moveReach(current.moveId) === "contact") {
      const reach = dashReach(current.moveId, t * seconds * rate) * 0.62;
      x += (target[0] - home[0]) * reach; z += (target[2] - home[2]) * reach;
    }
    node.position.set(x, y, z);
    node.scale.setScalar(Math.max(0.001, scale));
    // Taking a hit: a quick blink, as in the main series, while the flinch plays.
    node.visible = !(mine && current?.kind === "damage" && t < 0.45 && Math.floor(t * 14) % 2 === 1);
  });
  return <group ref={group} position={home} rotation={[0, facing(home, target), 0]}>
    <PokemonModel effectAnchor={effectAnchor} attackEffects={false} species={slot.species} animation={animation} fainted={fainted} playbackRate={view.speed} />
  </group>;
}

function Projectile({ view, allyAnchor, enemyAnchor }: { view: BattleView; allyAnchor: { current: Vector3 }; enemyAnchor: { current: Vector3 } }) {
  const current = view.current;
  if (current?.kind !== "move" || !current.moveId) return null;
  const attacker = current.side === "ally" ? view.ally : view.enemy;
  const effect = attackEffectFor(current.moveId, attacker?.species, current.moveType);
  if (!effect) return null;
  const duration = moveTimeline(current.moveId).duration;
  return <EffectStream key={`${current.moveId}-${current.unitId}`} style={effect} beam={effect.beam} drain={effect.drain} onSample={() => {
    const from = (current.side === "ally" ? allyAnchor : enemyAnchor).current;
    const to = (current.side === "ally" ? enemyAnchor : allyAnchor).current;
    const { startedAt, rate } = view.timing.current;
    return { phase: attackEffectPhase((performance.now() - startedAt) / 1000 * rate / duration, effect.hits),
      from: effect.reach === "contact" ? to : from, to: effect.reach === "self" ? from : to, size: 1.2 };
  }} />;
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
