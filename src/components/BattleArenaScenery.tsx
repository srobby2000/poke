import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import type { BattleArena } from "../game/battleArenas";
import { ARENAS } from "../game/battleArenas";

type Point = [number, number, number];

/** Deterministic scatter, so an arena always looks the same. */
function scatter(seed: number, count: number, place: (random: () => number) => Point | null) {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; };
  const points: { at: Point; size: number; turn: number; pick: number }[] = [];
  for (let tries = 0; points.length < count && tries < count * 20; tries++) {
    const at = place(random);
    if (at) points.push({ at, size: 0.7 + random() * 0.6, turn: random() * Math.PI * 2, pick: random() });
  }
  return points;
}

// Keep scenery out of the fighting area and away from the camera (front left, looking across
// to the far pad): a band behind the far pad, and the far sides no nearer than the near pad.
const inBackdrop = (x: number, z: number) => z < -6.5 || (Math.abs(x) >= 6.5 && z < 0);
const ring = (random: () => number, inner: number, outer: number): Point | null => {
  const angle = random() * Math.PI * 2, radius = inner + random() * (outer - inner);
  const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius - 3;
  return inBackdrop(x, z) ? [x, 0, z] : null;
};

/** The ground, the two battle pads and each arena's own scenery. */
export function BattleArenaScenery({ arena, pads }: { arena: BattleArena; pads: [Point, Point] }) {
  const look = ARENAS[arena];
  const water = arena === "water";
  return <group>
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, water ? -0.06 : -0.01, -1]}>
      <planeGeometry args={[70, 70]} />
      <meshStandardMaterial color={look.ground} roughness={water ? 0.25 : 0.95} metalness={water ? 0.1 : 0} />
    </mesh>
    {/* Battle pads under each Pokémon, as on a main-series field: sand islands by the lake. */}
    {pads.map((position, index) => <group key={index} position={[position[0], 0.005, position[2]]}>
      {water && <mesh receiveShadow position={[0, -0.05, 0]} scale={[1, 1, 0.66]}><cylinderGeometry args={[2.05, 2.25, 0.12, 40]} /><meshStandardMaterial color={look.pad[index]} roughness={1} /></mesh>}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.62, 1]}>
        <circleGeometry args={[1.45, 48]} />
        <meshStandardMaterial color={look.pad[index]} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.62, 1]} position={[0, 0.004, 0]}>
        <ringGeometry args={[1.38, 1.46, 48]} />
        <meshStandardMaterial color={look.rim} emissive={arena === "cave" ? look.rim : "#000000"} emissiveIntensity={arena === "cave" ? 0.6 : 0} />
      </mesh>
    </group>)}
    {arena === "grass" && <Grassland />}
    {arena === "forest" && <Forest />}
    {arena === "mountain" && <Mountain />}
    {arena === "water" && <Lakeside />}
    {arena === "cave" && <Cave />}
    {arena === "stadium" && <Stadium />}
  </group>;
}

function RoundTree({ at, size, tone = "#5d9e52" }: { at: Point; size: number; tone?: string }) {
  return <group position={at} scale={size}>
    <mesh castShadow position={[0, 0.9, 0]}><cylinderGeometry args={[0.18, 0.25, 1.8, 7]} /><meshStandardMaterial color="#7a5638" /></mesh>
    <mesh castShadow position={[0, 2.3, 0]}><icosahedronGeometry args={[1.25, 0]} /><meshStandardMaterial color={tone} flatShading /></mesh>
  </group>;
}

function Pine({ at, size, tone = "#2f6b3f", snow = false }: { at: Point; size: number; tone?: string; snow?: boolean }) {
  return <group position={at} scale={size}>
    <mesh castShadow position={[0, 0.4, 0]}><cylinderGeometry args={[0.14, 0.2, 0.8, 6]} /><meshStandardMaterial color="#6b4a2f" /></mesh>
    {[0, 1, 2].map(tier => <mesh key={tier} castShadow position={[0, 1.1 + tier * 0.75, 0]}><coneGeometry args={[1.1 - tier * 0.28, 1.4, 7]} /><meshStandardMaterial color={snow && tier === 2 ? "#eef3f7" : tone} flatShading /></mesh>)}
  </group>;
}

function Rock({ at, size, turn, tone = "#8a8479" }: { at: Point; size: number; turn: number; tone?: string }) {
  return <mesh castShadow receiveShadow position={[at[0], at[1] + 0.25 * size, at[2]]} rotation={[turn * 0.3, turn, 0]} scale={[size, size * 0.7, size]}>
    <dodecahedronGeometry args={[0.55, 0]} /><meshStandardMaterial color={tone} flatShading roughness={1} />
  </mesh>;
}

function Grassland() {
  const trees = useMemo(() => scatter(11, 9, random => ring(random, 11, 19)), []);
  const bushes = useMemo(() => scatter(12, 16, random => ring(random, 6.5, 12)), []);
  const flowers = useMemo(() => scatter(13, 40, random => { const x = (random() - 0.5) * 18, z = -1 - random() * 11; return Math.abs(x + 1.2) < 2 && z > -1.5 || Math.hypot(x - 1.45, (z + 3.5) / 0.62) < 1.7 ? null : [x, 0, z]; }), []);
  return <group>
    {/* Rolling hills on the horizon. */}
    {[[-14, -24, 9], [2, -27, 11], [17, -22, 8]].map(([x, z, r], i) => <mesh key={i} position={[x, -r * 0.55, z]} scale={[1.6, 1, 1]}><sphereGeometry args={[r, 24, 12]} /><meshStandardMaterial color={i % 2 ? "#79ad66" : "#6fa35d"} /></mesh>)}
    {trees.map(({ at, size, pick }, i) => <RoundTree key={i} at={at} size={size} tone={pick > 0.5 ? "#4f8f4a" : "#5d9e52"} />)}
    {bushes.map(({ at, size }, i) => <mesh key={i} castShadow position={[at[0], 0.3 * size, at[2]]} scale={[size, size * 0.7, size]}><icosahedronGeometry args={[0.55, 0]} /><meshStandardMaterial color="#5a9a4c" flatShading /></mesh>)}
    {flowers.map(({ at, pick }, i) => <mesh key={i} position={[at[0], 0.06, at[2]]}><sphereGeometry args={[0.07, 6, 4]} /><meshStandardMaterial color={["#f7e36b", "#f49ac1", "#ffffff", "#f08a5d"][Math.floor(pick * 4)]} /></mesh>)}
  </group>;
}

function Forest() {
  const pines = useMemo(() => scatter(21, 34, random => ring(random, 7, 18)), []);
  const oaks = useMemo(() => scatter(22, 10, random => ring(random, 8, 16)), []);
  const mushrooms = useMemo(() => scatter(23, 12, random => ring(random, 5, 8.5)), []);
  return <group>
    {pines.map(({ at, size, pick }, i) => <Pine key={i} at={at} size={size * 1.25} tone={pick > 0.5 ? "#2f6b3f" : "#3a7a45"} />)}
    {oaks.map(({ at, size }, i) => <RoundTree key={i} at={at} size={size * 1.15} tone="#467f3c" />)}
    {mushrooms.map(({ at, size }, i) => <group key={i} position={at} scale={size * 0.8}>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.05, 0.06, 0.24, 6]} /><meshStandardMaterial color="#f1e7d0" /></mesh>
      <mesh position={[0, 0.26, 0]}><sphereGeometry args={[0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#d8483b" /></mesh>
    </group>)}
    {/* A fallen log beside the far pad. */}
    <mesh castShadow position={[5.2, 0.22, -6.8]} rotation={[0, 0.6, Math.PI / 2]}><cylinderGeometry args={[0.22, 0.26, 3.2, 9]} /><meshStandardMaterial color="#6b4a2f" /></mesh>
  </group>;
}

function Mountain() {
  const boulders = useMemo(() => scatter(31, 18, random => ring(random, 6.5, 15)), []);
  const pines = useMemo(() => scatter(32, 8, random => ring(random, 10, 17)), []);
  return <group>
    {/* Snow-capped peaks behind the field. */}
    {[[-13, -26, 12, 8], [0, -30, 16, 10], [14, -25, 11, 7.5], [-24, -20, 9, 6], [25, -19, 10, 6.5]].map(([x, z, h, r], i) => <group key={i} position={[x, 0, z]}>
      <mesh><coneGeometry args={[r, h, 7]} /><meshStandardMaterial color={i % 2 ? "#7f7a74" : "#8b857d"} flatShading /></mesh>
      <mesh position={[0, h * 0.34, 0]}><coneGeometry args={[r * 0.34, h * 0.32, 7]} /><meshStandardMaterial color="#f3f6f9" flatShading /></mesh>
    </group>)}
    {boulders.map(({ at, size, turn }, i) => <Rock key={i} at={at} size={size * 1.6} turn={turn} />)}
    {pines.map(({ at, size }, i) => <Pine key={i} at={at} size={size} tone="#3d6b4a" snow />)}
  </group>;
}

function Lakeside() {
  const rocks = useMemo(() => scatter(41, 10, random => ring(random, 5.5, 12)), []);
  const reeds = useMemo(() => scatter(42, 14, random => ring(random, 4.5, 9)), []);
  const lilies = useMemo(() => scatter(43, 12, random => { const x = (random() - 0.5) * 14, z = -0.5 - random() * 9; return Math.hypot(x + 1.2, (z - 1.35) / 0.66) < 2.4 || Math.hypot(x - 1.45, (z + 3.5) / 0.66) < 2.4 ? null : [x, -0.04, z]; }), []);
  const bob = useRef<Group>(null);
  useFrame(({ clock }) => { if (bob.current) bob.current.position.y = Math.sin(clock.elapsedTime * 1.3) * 0.015; });
  return <group>
    {/* The far shore: a sandy bank and a treeline. */}
    <mesh receiveShadow position={[0, -0.2, -21]} scale={[1.4, 0.1, 0.35]}><sphereGeometry args={[18, 32, 12]} /><meshStandardMaterial color="#e3d3a3" /></mesh>
    {[-14, -8, -2, 4, 10, 16].map((x, i) => <RoundTree key={i} at={[x, 0.9, -22 - (i % 2)]} size={1.2} tone="#4f8f4a" />)}
    {rocks.map(({ at, size, turn }, i) => <Rock key={i} at={[at[0], -0.1, at[2]]} size={size} turn={turn} tone="#7d858a" />)}
    {reeds.map(({ at, size }, i) => <group key={i} position={at}>{[0, 1, 2].map(k => <mesh key={k} position={[k * 0.12 - 0.12, 0.35 * size, (k % 2) * 0.1]} rotation={[0, 0, (k - 1) * 0.12]}><cylinderGeometry args={[0.02, 0.03, 0.7 * size, 4]} /><meshStandardMaterial color="#6f8f3a" /></mesh>)}</group>)}
    <group ref={bob}>{lilies.map(({ at, size }, i) => <mesh key={i} position={at} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.28 * size, 12, 0.3, Math.PI * 1.8]} /><meshStandardMaterial color="#5c9a48" /></mesh>)}</group>
  </group>;
}

function Cave() {
  const stalagmites = useMemo(() => scatter(51, 26, random => ring(random, 6, 14)), []);
  const crystals = useMemo(() => scatter(52, 9, random => ring(random, 6, 11)), []);
  return <group>
    {/* The cavern wall wraps around the back of the field. */}
    <mesh position={[0, 4, -3]} rotation={[0, Math.PI, 0]}><cylinderGeometry args={[17, 17, 12, 28, 1, true, -Math.PI * 0.62, Math.PI * 1.24]} /><meshStandardMaterial color="#2b2f3a" side={2} flatShading /></mesh>
    {stalagmites.map(({ at, size }, i) => <mesh key={i} castShadow position={[at[0], 0.7 * size, at[2]]}><coneGeometry args={[0.35 * size, 1.4 * size, 6]} /><meshStandardMaterial color="#5c5f6a" flatShading /></mesh>)}
    {crystals.map(({ at, size, turn, pick }, i) => {
      const tone = pick > 0.5 ? "#72dfef" : "#a499ff";
      return <group key={i} position={at} rotation={[0, turn, 0.25]}>
        <mesh position={[0, 0.5 * size, 0]} scale={[0.35, 1, 0.35]}><octahedronGeometry args={[0.6 * size, 0]} /><meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={0.9} /></mesh>
        {i % 3 === 0 && <pointLight position={[0, 0.8, 0]} color={tone} intensity={4} distance={6} />}
      </group>;
    })}
  </group>;
}

// The court runs from the near pad to the far one (TurnBattleCanvas FIELD.ally → FIELD.enemy).
const COURT = (() => {
  const from = [-1.2, 1.35], to = [1.45, -3.5];
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const along = [(to[0] - from[0]) / length, (to[1] - from[1]) / length], across = [-along[1], along[0]];
  const centre: Point = [(from[0] + to[0]) / 2, 0.003, (from[1] + to[1]) / 2];
  // A plane's local x lies along world (cos t, 0, -sin t) once laid flat.
  const turnOf = ([x, z]: number[]) => Math.atan2(-z, x);
  return { centre, along, across, turnOf };
})();
const COURT_LINES = [
  { at: COURT.centre, turn: COURT.turnOf(COURT.across), length: 7.6 },
  ...[1, -1].map(side => ({ at: [COURT.centre[0] + COURT.across[0] * 3.8 * side, 0.003, COURT.centre[2] + COURT.across[1] * 3.8 * side] as Point, turn: COURT.turnOf(COURT.along), length: 11 })),
];

function Stadium() {
  return <group>
    {/* Court lines, square to the line between the pads: halfway line, centre circle, sidelines. */}
    {COURT_LINES.map(({ at, turn, length }, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, turn]} position={at}><planeGeometry args={[length, 0.07]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.7} /></mesh>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[COURT.centre[0], 0.003, COURT.centre[2]]}><ringGeometry args={[1.1, 1.17, 48]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.7} /></mesh>
    {/* Stands with a crowd on three sides. */}
    {[{ at: [0, 0, -13] as Point, turn: 0, width: 26 }, { at: [-12, 0, -3] as Point, turn: Math.PI / 2, width: 18 }, { at: [12, 0, -3] as Point, turn: -Math.PI / 2, width: 18 }].map(({ at, turn, width }, side) => <group key={side} position={at} rotation={[0, turn, 0]}>
      {[0, 1, 2, 3].map(tier => <mesh key={tier} receiveShadow position={[0, 0.45 + tier * 0.9, -tier * 1.1]}><boxGeometry args={[width, 0.9, 1.1]} /><meshStandardMaterial color={tier % 2 ? "#3b4a63" : "#445572"} /></mesh>)}
      {Array.from({ length: Math.floor(width / 0.9) * 4 }, (_, i) => {
        const tier = i % 4, seat = Math.floor(i / 4);
        return <mesh key={i} position={[-width / 2 + 0.5 + seat * 0.9, 1.15 + tier * 0.9, -tier * 1.1]}><boxGeometry args={[0.35, 0.45, 0.3]} /><meshStandardMaterial color={["#e35d4a", "#f2c230", "#4a7fe3", "#3fae62", "#e7e2d6"][(seat * 7 + tier * 3) % 5]} /></mesh>;
      })}
    </group>)}
    {/* Floodlight towers at the far corners. */}
    {[-10, 10].map(x => <group key={x} position={[x, 0, -12]}>
      <mesh position={[0, 4, 0]}><cylinderGeometry args={[0.15, 0.2, 8, 8]} /><meshStandardMaterial color="#9aa6b3" /></mesh>
      <mesh position={[0, 8.2, 0.3]} rotation={[0.4, 0, 0]}><boxGeometry args={[1.8, 0.9, 0.2]} /><meshStandardMaterial color="#e8eef5" emissive="#fff6d6" emissiveIntensity={0.8} /></mesh>
    </group>)}
  </group>;
}
