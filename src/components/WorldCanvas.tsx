import { Html, Instance, Instances } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import type { Group } from "three";
import type { WorldMap } from "../game/maps";
import { tileKey } from "../game/maps";
import type { WorldState } from "../game/worldState";

type WorldCanvasProps = {
  state: WorldState;
  pickedBerries: string[];
};

export function WorldCanvas({ state, pickedBerries }: WorldCanvasProps) {
  return (
    <Canvas className="battle-canvas" shadows camera={{ position: [state.x, 8.2, state.z + 7.4], fov: 50 }}>
      <color attach="background" args={["#0c1220"]} />
      <fog attach="fog" args={["#0c1220", 14, 30]} />
      <ambientLight intensity={0.75} />
      <directionalLight castShadow position={[-6, 12, 6]} intensity={1.9} shadow-mapSize={[2048, 2048]} />
      <StaticVillage map={state.map} pickedBerries={pickedBerries} />
      <Player state={state} />
      <CameraRig x={state.x} z={state.z} />
    </Canvas>
  );
}

function CameraRig({ x, z }: { x: number; z: number }) {
  useFrame(({ camera }, delta) => {
    const ease = Math.min(1, delta * 4.5);
    camera.position.x += (x - camera.position.x) * ease;
    camera.position.z += (z + 7.4 - camera.position.z) * ease;
    camera.position.y += (8.2 - camera.position.y) * ease;
    camera.lookAt(camera.position.x, 0.4, camera.position.z - 7.4);
  });
  return null;
}

function Player({ state }: { state: WorldState }) {
  const ref = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    ref.current.position.x = state.x;
    ref.current.position.z = state.z;
    ref.current.position.y = state.moving ? Math.abs(Math.sin(clock.elapsedTime * 9)) * 0.08 : 0;
    if (state.moving || Math.hypot(state.facingX, state.facingZ) > 0.01) {
      ref.current.rotation.y = Math.atan2(state.facingX, state.facingZ);
    }
  });

  return (
    <group ref={ref} position={[state.x, 0, state.z]}>
      <mesh castShadow position={[0, 0.42, 0]}>
        <capsuleGeometry args={[0.24, 0.45, 4, 10]} />
        <meshStandardMaterial color="#78e1ff" roughness={0.55} />
      </mesh>
      <mesh castShadow position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshStandardMaterial color="#f1d4b0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <coneGeometry args={[0.22, 0.2, 8]} />
        <meshStandardMaterial color="#ef4444" roughness={0.5} />
      </mesh>
    </group>
  );
}

// The village geometry only changes when a berry tree is picked, so this
// subtree renders rarely and React.memo skips it on every movement tick.
const StaticVillage = memo(function StaticVillage({ map, pickedBerries }: { map: WorldMap; pickedBerries: string[] }) {
  const layout = useMemo(() => {
    const grass: [number, number][] = [];
    const tallgrass: [number, number][] = [];
    const trees: [number, number][] = [];
    const water: [number, number][] = [];
    const walls: [number, number][] = [];
    const fences: [number, number][] = [];
    const berries: [number, number][] = [];
    const warps: { x: number; z: number; label: string }[] = [];
    const doors: { x: number; z: number; label: string }[] = [];
    const npcs: { x: number; z: number; name: string }[] = [];
    const trainers: { x: number; z: number; name: string }[] = [];

    map.tiles.forEach((row, z) => {
      row.forEach((kind, x) => {
        if (kind === "grass") grass.push([x, z]);
        else if (kind === "tallgrass") tallgrass.push([x, z]);
        else if (kind === "tree") trees.push([x, z]);
        else if (kind === "water") water.push([x, z]);
        else if (kind === "wall") walls.push([x, z]);
        else if (kind === "fence") fences.push([x, z]);
        else if (kind === "berry") berries.push([x, z]);
        else if (kind === "warp") {
          warps.push({ x, z, label: map.warps[tileKey(x, z)]?.label ?? "Warp" });
        } else if (kind === "door") {
          doors.push({ x, z, label: map.doors[tileKey(x, z)]?.label ?? "Door" });
        } else if (kind === "npc") {
          npcs.push({ x, z, name: map.npcs[tileKey(x, z)]?.name ?? "Villager" });
        } else if (kind === "trainer") {
          trainers.push({ x, z, name: map.trainers[tileKey(x, z)]?.name ?? "Trainer" });
        }
      });
    });

    return { grass, tallgrass, trees, water, walls, fences, berries, warps, doors, npcs, trainers };
  }, [map]);

  const centerX = (map.width - 1) / 2;
  const centerZ = (map.height - 1) / 2;

  return (
    <group>
      <mesh receiveShadow position={[centerX, -0.02, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[map.width + 6, map.height + 6]} />
        <meshStandardMaterial color="#33415c" roughness={0.92} />
      </mesh>

      <Instances limit={layout.grass.length} range={layout.grass.length}>
        <planeGeometry args={[0.98, 0.98]} />
        <meshStandardMaterial color="#2f6e4f" roughness={0.9} />
        {layout.grass.map(([x, z]) => (
          <Instance key={`g${x},${z}`} position={[x, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]} />
        ))}
      </Instances>

      {layout.tallgrass.length > 0 ? (
        <>
          <Instances limit={layout.tallgrass.length} range={layout.tallgrass.length}>
            <planeGeometry args={[0.98, 0.98]} />
            <meshStandardMaterial color="#1f5c3c" roughness={0.95} />
            {layout.tallgrass.map(([x, z]) => (
              <Instance key={`tg${x},${z}`} position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, 0]} />
            ))}
          </Instances>
          <Instances limit={layout.tallgrass.length * 2} range={layout.tallgrass.length * 2}>
            <coneGeometry args={[0.1, 0.5, 4]} />
            <meshStandardMaterial color="#2c7a4f" roughness={0.9} />
            {layout.tallgrass.flatMap(([x, z]) => [
              <Instance
                key={`tg1${x},${z}`}
                position={[x + (((x * 7 + z * 13) % 5) - 2) * 0.12, 0.25, z + (((x * 3 + z * 11) % 5) - 2) * 0.12]}
              />,
              <Instance
                key={`tg2${x},${z}`}
                position={[x + (((x * 5 + z * 17) % 5) - 2) * 0.14, 0.25, z + (((x * 13 + z * 7) % 5) - 2) * 0.14]}
              />,
            ])}
          </Instances>
        </>
      ) : null}

      <Instances limit={layout.trees.length} range={layout.trees.length} castShadow>
        <coneGeometry args={[0.55, 1.25, 7]} />
        <meshStandardMaterial color="#27583f" roughness={0.8} />
        {layout.trees.map(([x, z]) => (
          <Instance key={`t${x},${z}`} position={[x, 1.05, z]} />
        ))}
      </Instances>
      <Instances limit={layout.trees.length} range={layout.trees.length}>
        <cylinderGeometry args={[0.12, 0.16, 0.6, 6]} />
        <meshStandardMaterial color="#5b4636" roughness={0.85} />
        {layout.trees.map(([x, z]) => (
          <Instance key={`tt${x},${z}`} position={[x, 0.3, z]} />
        ))}
      </Instances>

      {layout.water.map(([x, z]) => (
        <mesh key={`w${x},${z}`} position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial color="#1d5f8a" emissive="#1b8ec0" emissiveIntensity={0.25} roughness={0.3} />
        </mesh>
      ))}

      {layout.warps.map((warp) => (
        <group key={`wp${warp.x},${warp.z}`} position={[warp.x, 0, warp.z]}>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.46, 24]} />
            <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.5} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.4, 24]} />
            <meshStandardMaterial color="#e9d5ff" emissive="#e9d5ff" emissiveIntensity={0.6} />
          </mesh>
          <Html center position={[0, 1.4, 0]} className="unit-label" distanceFactor={11}>
            <span>{warp.label} →</span>
          </Html>
        </group>
      ))}

      {layout.walls.map(([x, z]) => (
        <group key={`h${x},${z}`} position={[x, 0, z]}>
          <mesh castShadow position={[0, 0.8, 0]}>
            <boxGeometry args={[1, 1.6, 1]} />
            <meshStandardMaterial color="#6e7b8c" roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 1.7, 0]}>
            <boxGeometry args={[1.06, 0.2, 1.06]} />
            <meshStandardMaterial color="#8c5b5b" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {layout.doors.map((door) => (
        <group key={`d${door.x},${door.z}`} position={[door.x, 0, door.z]}>
          <mesh castShadow position={[0, 0.8, 0]}>
            <boxGeometry args={[1, 1.6, 1]} />
            <meshStandardMaterial color="#6e7b8c" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.7, 0]}>
            <boxGeometry args={[1.06, 0.2, 1.06]} />
            <meshStandardMaterial color="#8c5b5b" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.62, 0.51]}>
            <boxGeometry args={[0.55, 1.1, 0.06]} />
            <meshStandardMaterial color="#d9a066" emissive="#d9a066" emissiveIntensity={0.18} roughness={0.6} />
          </mesh>
          <Html center position={[0, 2.25, 0]} className="unit-label" distanceFactor={11}>
            <span>{door.label}</span>
          </Html>
        </group>
      ))}

      {layout.fences.map(([x, z]) => (
        <mesh key={`f${x},${z}`} castShadow position={[x, 0.26, z]}>
          <boxGeometry args={[0.85, 0.5, 0.18]} />
          <meshStandardMaterial color="#7c5f46" roughness={0.85} />
        </mesh>
      ))}

      {layout.berries.map(([x, z]) => {
        const picked = pickedBerries.includes(tileKey(x, z));
        return (
          <group key={`b${x},${z}`} position={[x, 0, z]}>
            <mesh castShadow position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.1, 0.14, 0.6, 6]} />
              <meshStandardMaterial color="#5b4636" roughness={0.85} />
            </mesh>
            <mesh castShadow position={[0, 0.85, 0]}>
              <sphereGeometry args={[0.45, 10, 8]} />
              <meshStandardMaterial color={picked ? "#33604a" : "#3e7c4f"} roughness={0.8} />
            </mesh>
            {picked
              ? null
              : [[-0.2, 0.95, 0.3], [0.25, 0.75, 0.28], [0.05, 1.1, -0.3]].map(([bx, by, bz], index) => (
                  <mesh key={index} position={[bx, by, bz]}>
                    <sphereGeometry args={[0.08, 8, 6]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} />
                  </mesh>
                ))}
          </group>
        );
      })}

      {layout.npcs.map((npc) => (
        <group key={`n${npc.x},${npc.z}`} position={[npc.x, 0, npc.z]}>
          <mesh castShadow position={[0, 0.36, 0]}>
            <capsuleGeometry args={[0.22, 0.35, 4, 10]} />
            <meshStandardMaterial color={npc.name === "Mira" ? "#c084fc" : "#fbbf24"} roughness={0.6} />
          </mesh>
          <mesh castShadow position={[0, 0.85, 0]}>
            <sphereGeometry args={[0.18, 12, 10]} />
            <meshStandardMaterial color="#f1d4b0" roughness={0.6} />
          </mesh>
          <Html center position={[0, 1.45, 0]} className="unit-label" distanceFactor={11}>
            <span>{npc.name}</span>
          </Html>
        </group>
      ))}

      {layout.trainers.map((trainer) => (
        <group key={`tr${trainer.x},${trainer.z}`} position={[trainer.x, 0, trainer.z]}>
          <mesh castShadow position={[0, 0.4, 0]}>
            <capsuleGeometry args={[0.24, 0.4, 4, 10]} />
            <meshStandardMaterial color="#f97316" roughness={0.55} />
          </mesh>
          <mesh castShadow position={[0, 0.92, 0]}>
            <sphereGeometry args={[0.19, 12, 10]} />
            <meshStandardMaterial color="#f1d4b0" roughness={0.6} />
          </mesh>
          <Html center position={[0, 1.5, 0]} className="unit-label" distanceFactor={11}>
            <span>⚔ {trainer.name}</span>
          </Html>
        </group>
      ))}
    </group>
  );
});
