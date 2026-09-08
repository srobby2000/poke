import { VillageBuildings, VillagePonds, VillageTrees } from "./VillageScenery";
import { TrainerModel } from "./TrainerModel";
import { SceneContextStatus } from "./SceneContextStatus";
import { Html, Instance, Instances } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import type { Group } from "three";
import type { WorldMap } from "../game/maps";
import { tileKey } from "../game/maps";
import type { WorldState } from "../game/worldState";
import { PokemonModel } from "./PokemonModel";
import { stepCompanion } from "../game/companionMotion";
import type { CompanionPose } from "../game/companionMotion";

type WorldCanvasProps = {
  state: WorldState;
  pickedBerries: string[];
};

const WORLD_LABEL_Z_INDEX_RANGE: [number, number] = [20, 0];

export function WorldCanvas({ state, pickedBerries }: WorldCanvasProps) {
  return (
    <Canvas className="battle-canvas" dpr={[1, 1.5]} shadows camera={{ position: [state.x, 8.2, state.z + 7.4], fov: 50 }}>
      <color attach="background" args={["#a6c8c5"]} />
      <fog attach="fog" args={["#a6c8c5", 16, 34]} />
      <ambientLight intensity={0.95} />
      <hemisphereLight args={["#e5f2df", "#7a715b", 0.8]} />
      <directionalLight castShadow position={[-6, 12, 6]} intensity={1.9} shadow-mapSize={[1024, 1024]} />
      <StaticVillage map={state.map} pickedBerries={pickedBerries} defeatedTrainers={state.defeatedTrainers} />
      <Player state={state} />
      <Partner key={state.map.id} state={state} />
      <CameraRig x={state.x} z={state.z} />
    <SceneContextStatus />
    </Canvas>
  );
}

// A beaten trainer shifts off the path (perpendicular to where they watched).
const TRAINER_STEP_ASIDE: Record<string, { x: number; z: number }> = {
  up: { x: 0.45, z: 0 },
  down: { x: 0.45, z: 0 },
  left: { x: 0, z: 0.45 },
  right: { x: 0, z: 0.45 },
};

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

function Partner({ state }: { state: WorldState }) {
  const ref = useRef<Group>(null);
  const pose = useRef<CompanionPose | null>(null);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    pose.current = stepCompanion(pose.current, state, delta);
    ref.current.position.set(pose.current.x, state.moving ? Math.abs(Math.sin(clock.elapsedTime * 10)) * 0.06 : 0, pose.current.z);
    ref.current.rotation.y = pose.current.yaw;
  });
  return <group ref={ref}>
    <PokemonModel species="squirtle" walking={state.moving} />
  </group>;
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
      <TrainerModel walking={state.moving} />
    </group>
  );
}

// The village geometry only changes when a berry tree is picked, so this
// subtree renders rarely and React.memo skips it on every movement tick.
const StaticVillage = memo(function StaticVillage({
  map,
  pickedBerries,
  defeatedTrainers,
}: {
  map: WorldMap;
  pickedBerries: string[];
  defeatedTrainers: string[];
}) {
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
    const trainers: { x: number; z: number; name: string; id: string; facing?: string }[] = [];

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
          const meta = map.trainers[tileKey(x, z)];
          trainers.push({ x, z, name: meta?.name ?? "Trainer", id: meta?.id ?? "", facing: meta?.facing });
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
        <meshStandardMaterial color="#b8ad87" roughness={0.92} />
      </mesh>

      <Instances limit={layout.grass.length} range={layout.grass.length}>
        <planeGeometry args={[0.98, 0.98]} />
        <meshStandardMaterial color="#65895c" roughness={0.9} />
        {layout.grass.map(([x, z]) => (
          <Instance key={`g${x},${z}`} position={[x, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]} />
        ))}
      </Instances>

      {layout.tallgrass.length > 0 ? (
        <>
          <Instances limit={layout.tallgrass.length} range={layout.tallgrass.length}>
            <planeGeometry args={[0.98, 0.98]} />
            <meshStandardMaterial color="#49784f" roughness={0.95} />
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

      <VillageTrees tiles={layout.trees} />
      <VillagePonds tiles={layout.water} />

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
          <Html center zIndexRange={WORLD_LABEL_Z_INDEX_RANGE} position={[0, 1.4, 0]} className="unit-label" distanceFactor={11}>
            <span>{warp.label}{" \u2192"}</span>
          </Html>
        </group>
      ))}

      <VillageBuildings walls={layout.walls} doors={layout.doors} />
      {layout.doors.map(door => <Html key={`door-label-${door.x},${door.z}`} center zIndexRange={WORLD_LABEL_Z_INDEX_RANGE} position={[door.x, 3.7, door.z]} className="unit-label" distanceFactor={11}>
        <span>{door.label}</span>
      </Html>)}

      {layout.fences.map(([x, z]) => <group key={`f${x},${z}`} position={[x, 0, z]}>
        {[-0.36, 0.36].map(offset => <mesh key={offset} castShadow position={[offset, 0.36, 0]}><boxGeometry args={[0.12, 0.72, 0.12]} /><meshStandardMaterial color="#987957" roughness={1} /></mesh>)}
        {[0.24, 0.54].map(height => <mesh key={height} castShadow position={[0, height, 0]}><boxGeometry args={[0.9, 0.1, 0.08]} /><meshStandardMaterial color="#bea077" roughness={1} /></mesh>)}
      </group>)}

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
          <TrainerModel shirt={npc.name === "Mira" ? "#a47bbf" : "#d9a646"} cap="#476d75" backpack={false} />
          <Html center zIndexRange={WORLD_LABEL_Z_INDEX_RANGE} position={[0, 2, 0]} className="unit-label" distanceFactor={11}>
            <span>{npc.name}</span>
          </Html>
        </group>
      ))}

      {layout.trainers.map((trainer) => {
        const beaten = defeatedTrainers.includes(trainer.id);
        // A beaten trainer steps aside (offset off the path) and dims.
        const offset = beaten ? TRAINER_STEP_ASIDE[trainer.facing ?? "down"] : { x: 0, z: 0 };
        return (
          <group key={`tr${trainer.x},${trainer.z}`} position={[trainer.x + offset.x, 0, trainer.z + offset.z]} rotation={[0, ({ up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 })[trainer.facing ?? "down"] ?? 0, 0]}>
            <TrainerModel shirt={beaten ? "#7c6f64" : "#e88648"} cap={beaten ? "#716963" : "#3f626f"} />
            {beaten ? null : (
              <Html center zIndexRange={WORLD_LABEL_Z_INDEX_RANGE} position={[0, 2, 0]} className="unit-label" distanceFactor={11}>
                <span>{"! "}{trainer.name}</span>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
});
