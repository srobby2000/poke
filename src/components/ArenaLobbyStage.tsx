import { Html } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import type { ArenaChallenge } from "./ArenaLobby";

type ArenaLobbyStageProps = {
  bestStage: number;
  dailyKey: string;
  dailyReward: number;
  dailyCleared: boolean;
  onChooseChallenge: (challenge: ArenaChallenge) => void;
  onOpenUpgrades: () => void;
};

export function ArenaLobbyStage({
  bestStage,
  dailyKey,
  dailyReward,
  dailyCleared,
  onChooseChallenge,
  onOpenUpgrades,
}: ArenaLobbyStageProps) {
  return (
    <Canvas className="arena-lobby-canvas" camera={{ position: [0, 4.2, 7.4], fov: 42 }}>
      <color attach="background" args={["#0b1323"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 7, 4]} intensity={1.8} />
      <ArenaLobbyScene
        bestStage={bestStage}
        dailyKey={dailyKey}
        dailyReward={dailyReward}
        dailyCleared={dailyCleared}
        onChooseChallenge={onChooseChallenge}
        onOpenUpgrades={onOpenUpgrades}
      />
    </Canvas>
  );
}

function ArenaLobbyScene({ bestStage, dailyKey, dailyReward, dailyCleared, onChooseChallenge, onOpenUpgrades }: ArenaLobbyStageProps) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.035;
    }
  });

  return (
    <group ref={ref}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <circleGeometry args={[4.2, 48]} />
        <meshStandardMaterial color="#20344c" roughness={0.9} metalness={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[2.6, 3.9, 64]} />
        <meshStandardMaterial color="#0e7490" emissive="#0e7490" emissiveIntensity={0.18} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[1.15, 1.35, 0.15, 32]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>

      <ArenaBoard
        position={[-2.5, 1.15, 0.2]}
        color="#7c3aed"
        title="Battle Streak"
        detail={bestStage > 0 ? `Best stage ${bestStage}` : "Start the climb"}
        onSelect={() => onChooseChallenge("ladder")}
      />
      <ArenaBoard
        position={[0, 1.25, -0.9]}
        color={dailyCleared ? "#475569" : "#0891b2"}
        title="Daily Challenge"
        detail={dailyCleared ? "Reward claimed" : `+${dailyReward} gems`}
        disabled={dailyCleared}
        onSelect={() => onChooseChallenge("daily")}
        footnote={dailyCleared ? dailyKey : "Fixed rival squad"}
      />
      <ArenaBoard position={[2.5, 1.15, 0.2]} color="#b45309" title="Upgrade Deck" detail="Train Pokemon" onSelect={onOpenUpgrades} />
    </group>
  );
}

type ArenaBoardProps = {
  position: [number, number, number];
  color: string;
  title: string;
  detail: string;
  footnote?: string;
  disabled?: boolean;
  onSelect: () => void;
};

function ArenaBoard({ position, color, title, detail, footnote, disabled = false, onSelect }: ArenaBoardProps) {
  return (
    <group position={position} rotation={[0, -position[0] * 0.08, 0]}>
      <mesh onClick={disabled ? undefined : onSelect}>
        <boxGeometry args={[1.9, 1.2, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={disabled ? 0.04 : 0.16} roughness={0.48} />
      </mesh>
      <mesh position={[0, -0.84, 0]}>
        <boxGeometry args={[0.16, 0.9, 0.16]} />
        <meshStandardMaterial color="#64748b" roughness={0.7} />
      </mesh>
      <Html center transform position={[0, 0, 0.08]} distanceFactor={7} className="arena-board-label">
        <button disabled={disabled} onClick={onSelect}>
          <span>{title}</span>
          <strong>{detail}</strong>
          {footnote ? <small>{footnote}</small> : null}
        </button>
      </Html>
    </group>
  );
}
