import { SceneContextStatus } from "./SceneContextStatus";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component } from "react";
import type { ReactNode } from "react";
import { PokemonModel } from "./PokemonModel";

class ViewerBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function PokemonViewer({ species, name, fallback }: { species: string; name: string; fallback: ReactNode }) {
  return <ViewerBoundary fallback={fallback}>
    <div className="pokedex-model-viewer" role="img" aria-label={`Rotatable 3D model of ${name}`}>
      <Canvas dpr={[1, 1.5]} frameloop="demand" camera={{ position: [0, 1.5, 4.8], fov: 36 }} fallback={fallback}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 5, 5]} intensity={2} />
        <hemisphereLight args={["#d4f0ff", "#8a819b", 1]} />
        <group rotation={[0, 0.35, 0]}><PokemonModel species={species} fitPreview /></group>
        <OrbitControls makeDefault enablePan={false} minDistance={3} maxDistance={7} target={[0, 0.85, 0]} />
      <SceneContextStatus />
    </Canvas>
    </div>
    <small className="pokedex-model-hint">Drag to rotate · Scroll to zoom</small>
  </ViewerBoundary>;
}
