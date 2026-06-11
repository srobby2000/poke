import { ContactShadows, Environment, Float, Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import type { Dispatch } from "react";
import type { Group } from "three";
import { Color } from "three";
import type { BattleAction, BattleFeedback, BattleState, Unit } from "../game/battleState";
import { isAlive } from "../game/battleState";

type BattleCanvasProps = {
  state: BattleState;
  dispatch: Dispatch<BattleAction>;
};

export function BattleCanvas({ state, dispatch }: BattleCanvasProps) {
  return (
    <Canvas className="battle-canvas" shadows camera={{ position: [0, 5.6, 7.5], fov: 46 }}>
      <color attach="background" args={["#0c1220"]} />
      <fog attach="fog" args={["#0c1220", 8, 18]} />
      <ambientLight intensity={0.8} />
      <directionalLight castShadow position={[-3, 8, 5]} intensity={2.2} shadow-mapSize={[2048, 2048]} />
      <pointLight position={[0, 2, 0]} intensity={1.6} color="#78e1ff" />
      <Environment preset="city" />
      <BattleArena />
      {state.units.map((unit) => (
        <CreatureUnit
          key={unit.id}
          unit={unit}
          selected={unit.id === state.selectedAllyId || unit.id === state.selectedEnemyId}
          dispatch={dispatch}
        />
      ))}
      <BattleFeedbackLayer feedback={state.feedback} units={state.units} />
      <ContactShadows position={[0, -0.03, 0]} opacity={0.42} scale={12} blur={2.2} far={5} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.86}
        maxPolarAngle={1.08}
        minAzimuthAngle={-0.32}
        maxAzimuthAngle={0.32}
      />
    </Canvas>
  );
}

const BattleFeedbackLayer = memo(function BattleFeedbackLayer({ feedback, units }: { feedback: BattleFeedback[]; units: Unit[] }) {
  return (
    <>
      {feedback.map((entry) => {
        const unit = units.find((candidate) => candidate.id === entry.unitId);
        if (!unit) {
          return null;
        }

        const lift = 2.05 + (1.6 - entry.ttl) * 0.18;
        return (
          <Html
            key={entry.id}
            center
            position={[unit.position[0], lift, unit.position[2]]}
            className={`floating-feedback feedback-${entry.kind}`}
            distanceFactor={7}
          >
            <span>{entry.text}</span>
          </Html>
        );
      })}
    </>
  );
});

function BattleArena() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.2, 8]} />
        <meshStandardMaterial color="#263847" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 2.48, 96]} />
        <meshStandardMaterial color="#81d7ff" emissive="#1b8ec0" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[0.08, 9.3]} />
        <meshStandardMaterial color="#dbeafe" emissive="#78e1ff" emissiveIntensity={0.22} />
      </mesh>
      {[-4.4, 4.4].map((x) => (
        <mesh key={x} castShadow position={[x, 0.25, 0]}>
          <cylinderGeometry args={[0.22, 0.28, 0.5, 6]} />
          <meshStandardMaterial color="#405262" roughness={0.72} />
        </mesh>
      ))}
    </group>
  );
}

// Memoized so the scene graph is only re-diffed for units that changed; unit
// references stay stable across ticks unless they were hit, buffed, or animated.
const CreatureUnit = memo(function CreatureUnit({
  unit,
  selected,
  dispatch,
}: {
  unit: Unit;
  selected: boolean;
  dispatch: Dispatch<BattleAction>;
}) {
  const ref = useRef<Group>(null);
  const bodyColor = useMemo(() => new Color(unit.color), [unit.color]);
  const accentColor = useMemo(() => new Color(unit.accent), [unit.accent]);
  const alive = isAlive(unit);

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    const t = clock.elapsedTime;
    const side = unit.team === "ally" ? 1 : -1;
    ref.current.position.y = alive ? Math.sin(t * 2.2 + unit.position[2]) * 0.045 + unit.actionPulse * 0.1 : -0.18;
    ref.current.position.x = unit.position[0] + unit.actionPulse * 0.35 * side;
    ref.current.rotation.y = (unit.team === "ally" ? Math.PI / 2 : -Math.PI / 2) + Math.sin(t + unit.position[2]) * 0.05;
    ref.current.rotation.z = alive ? 0 : side * 0.7;
  });

  const flashColor = unit.hitFlash > 0 ? "#ffffff" : unit.color;

  return (
    <group ref={ref} position={unit.position} onClick={(event) => {
      event.stopPropagation();
      if (alive) {
        dispatch({ type: unit.team === "ally" ? "selectAlly" : "selectEnemy", unitId: unit.id });
      }
    }}>
      <Float speed={1.7} rotationIntensity={0.08} floatIntensity={alive ? 0.14 : 0}>
        <group scale={alive ? 1 : 0.82}>
          <mesh castShadow position={[0, 0.62, 0]}>
            <dodecahedronGeometry args={[0.48, 0]} />
            <meshStandardMaterial color={flashColor} emissive={unit.hitFlash > 0 ? "#ffffff" : unit.color} emissiveIntensity={unit.hitFlash > 0 ? 0.55 : 0.08} roughness={0.58} />
          </mesh>
          <mesh castShadow position={[0, 1.08, 0]}>
            <sphereGeometry args={[0.36, 9, 7]} />
            <meshStandardMaterial color={bodyColor} roughness={0.55} />
          </mesh>
          <CreatureAccent shape={unit.shape} color={accentColor} />
          <mesh castShadow position={[-0.22, 0.23, 0.2]}>
            <boxGeometry args={[0.18, 0.34, 0.18]} />
            <meshStandardMaterial color={unit.color} roughness={0.7} />
          </mesh>
          <mesh castShadow position={[0.22, 0.23, -0.2]}>
            <boxGeometry args={[0.18, 0.34, 0.18]} />
            <meshStandardMaterial color={unit.color} roughness={0.7} />
          </mesh>
        </group>
      </Float>
      {selected && alive ? (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.82, 48]} />
          <meshBasicMaterial color={unit.team === "ally" ? "#78e1ff" : "#ff8ab3"} toneMapped={false} />
        </mesh>
      ) : null}
      <Html center position={[0, 1.7, 0]} className="unit-label" distanceFactor={8}>
        <span className={alive ? "" : "unit-label-ko"}>{unit.name}</span>
      </Html>
    </group>
  );
});

function CreatureAccent({ shape, color }: { shape: Unit["shape"]; color: Color }) {
  const material = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.12} roughness={0.45} />;

  if (shape === "horn") {
    return (
      <mesh castShadow position={[0, 1.52, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.16, 0.44, 5]} />
        {material}
      </mesh>
    );
  }

  if (shape === "shell") {
    return (
      <mesh castShadow position={[0, 0.72, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.09, 6, 12]} />
        {material}
      </mesh>
    );
  }

  if (shape === "wing") {
    return (
      <>
        <mesh castShadow position={[0, 0.92, 0.42]} rotation={[0.3, 0, -0.8]}>
          <coneGeometry args={[0.18, 0.62, 4]} />
          {material}
        </mesh>
        <mesh castShadow position={[0, 0.92, -0.42]} rotation={[-0.3, 0, -0.8]}>
          <coneGeometry args={[0.18, 0.62, 4]} />
          {material}
        </mesh>
      </>
    );
  }

  if (shape === "crystal") {
    return (
      <mesh castShadow position={[0, 1.42, 0]}>
        <octahedronGeometry args={[0.28, 0]} />
        {material}
      </mesh>
    );
  }

  if (shape === "ember") {
    return (
      <mesh castShadow position={[0, 1.42, 0]} rotation={[0.12, 0, 0]}>
        <tetrahedronGeometry args={[0.34, 0]} />
        {material}
      </mesh>
    );
  }

  return (
    <mesh castShadow position={[0, 1.4, 0]} rotation={[0, 0, Math.PI / 4]}>
      <boxGeometry args={[0.38, 0.38, 0.16]} />
      {material}
    </mesh>
  );
}
