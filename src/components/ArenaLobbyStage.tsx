import { SceneContextStatus } from "./SceneContextStatus";
import { ContactShadows, Float, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { PokemonModel } from "./PokemonModel";

export function ArenaLobbyStage() {
  return (
    <Canvas className="arena-lobby-canvas" shadows dpr={[1, 1.5]} camera={{ position: [0, 3.1, 8.5], fov: 36 }} aria-label="3D showcase of Bulbasaur, Charmander and Squirtle">
      <color attach="background" args={["#102838"]} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#dcf7ff", "#51705c", 1.2]} />
      <directionalLight castShadow position={[3, 7, 5]} intensity={2.5} shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-4, 3, -2]} color="#64dfd5" intensity={12} />
      {([
        { species: "bulbasaur", x: -1.65, z: -0.25, color: "#71d7b3", turn: 0.28 },
        { species: "charmander", x: 0, z: 0.35, color: "#f5ac73", turn: -0.12 },
        { species: "squirtle", x: 1.65, z: -0.25, color: "#73d2ed", turn: -0.35 },
      ]).map(({ species, x, z, color, turn }) => <group key={species} position={[x, 0, z]}>
        <mesh receiveShadow position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.83, 0.9, 0.24, 64]} />
          <meshStandardMaterial color="#2b4859" roughness={0.65} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.009, 0]}>
          <ringGeometry args={[0.74, 0.78, 64]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <Float speed={2} rotationIntensity={0.12} floatIntensity={0.18}>
          <group rotation={[0, turn, 0]}><PokemonModel species={species} /></group>
        </Float>
      </group>)}
      <ContactShadows position={[0, -0.25, 0]} opacity={0.5} scale={15} blur={2.8} far={4} />
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.95} maxPolarAngle={1.4} minAzimuthAngle={-0.65} maxAzimuthAngle={0.65} target={[0, 0.6, 0]} />
    <SceneContextStatus />
    </Canvas>
  );
}
