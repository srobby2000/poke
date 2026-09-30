import { SceneContextStatus } from "./SceneContextStatus";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PokemonModel } from "./PokemonModel";
import { PokemonLighting } from "./PokemonLighting";
import type { PokemonAction } from "../game/pokemonAnimation";
import { battleMovesFor } from "../game/battleState";
import { MOVE_ARCHETYPES, learnsetFor, moveAnimationFor } from "../game/moveAnimations";
import { typeColor } from "../game/typeColors";

class ViewerBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

type MoveRow = { id: string; name: string; type: string; detail: string };

export function PokemonViewer({ species, name, fallback }: { species: string; name: string; fallback: ReactNode }) {
  const [motion, setMotion] = useState<PokemonAction>("idle");
  const [paused, setPaused] = useState(false);
  const [showJoints, setShowJoints] = useState(false);
  const [replay, setReplay] = useState(0);
  const battle = useMemo<MoveRow[]>(() => battleMovesFor(species).map(move => ({ id: move.id, name: move.name, type: move.type, detail: move.id.startsWith("sync-") ? "Sync" : `Power ${move.power || "—"}` })), [species]);
  const learned = useMemo<MoveRow[]>(() => learnsetFor(species).map(move => ({ id: move.id, name: move.name, type: move.type, detail: move.level > 1 ? `Lv ${move.level}` : "Start" })), [species]);
  const play = (next: PokemonAction) => { setMotion(next); setReplay(n => n + 1); setPaused(false); };
  const selectedMove = motion.startsWith("move:") ? motion.slice(5) : null;
  const selected = selectedMove ? moveAnimationFor(selectedMove) : null;
  // A species can learn the same move at two levels (Mewtwo: Psychic), so key by position too.
  const moveButton = (move: MoveRow, index: number) => <button key={`${move.id}-${index}`} className="dex-move" aria-pressed={selectedMove === move.id} onClick={() => play(`move:${move.id}`)}>
    <span className="dex-move-type" style={{ background: typeColor(move.type) }} />
    <span className="dex-move-name">{move.name}</span>
    <small>{move.detail}</small>
  </button>;
  return <ViewerBoundary fallback={fallback}>
    <div className="pokedex-model-viewer" role="img" aria-label={`Rotatable 3D model of ${name}`}>
      <Canvas dpr={[1, 1.5]} frameloop="always" camera={{ position: [0, 1.5, 4.8], fov: 36 }} fallback={fallback}>
        <PokemonLighting mood="dex" />
        <group rotation={[0, 0.35, 0]}><PokemonModel key={`${motion}-${replay}`} species={species} animation={motion} paused={paused} showJoints={showJoints} fitPreview /></group>
        <OrbitControls makeDefault enablePan={false} minDistance={3} maxDistance={7} target={[0, 0.85, 0]} />
      <SceneContextStatus />
    </Canvas>
    </div>
    <div className="pokedex-motion-controls" aria-label="Animation preview">
      {(["idle", "walk", "run", "attack", "hit"] as const).map(value => <button key={value} aria-pressed={motion === value} onClick={() => play(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
      <button aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Play" : "Pause"}</button>
      <button aria-pressed={showJoints} onClick={() => setShowJoints(value => !value)}>Show joints</button>
    </div>
    {selected && <p className="dex-move-motion" aria-live="polite">
      <strong>{MOVE_ARCHETYPES[selected.archetype].label}{selected.hits && selected.hits > 1 ? ` ×${selected.hits}` : ""}</strong> — {selected.note} {MOVE_ARCHETYPES[selected.archetype].movement}
    </p>}
    <section className="dex-move-panel" aria-label={`${name}'s moves`}>
      {battle.length > 0 && <>
        <h4>Battle moves <span>{battle.length}</span></h4>
        <div className="dex-move-list">{battle.map(moveButton)}</div>
      </>}
      <h4>Learns (Red/Blue) <span>{learned.length} {learned.length === 1 ? "move" : "moves"}</span></h4>
      <div className="dex-move-list">{learned.map(moveButton)}</div>
    </section>
    <small className="pokedex-model-hint">Drag to rotate · Scroll to zoom · Tap a move to watch it</small>
  </ViewerBoundary>;
}
