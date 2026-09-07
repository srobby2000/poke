import { Instance, Instances } from "@react-three/drei";
import { useMemo } from "react";
import { Shape } from "three";

type Tile = [number, number];

export function VillageTrees({ tiles }: { tiles: Tile[] }) {
  return <group>
    <Instances limit={tiles.length} range={tiles.length} castShadow receiveShadow>
      <cylinderGeometry args={[0.095, 0.17, 1.15, 8]} /><meshStandardMaterial color="#765440" roughness={1} />
      {tiles.map(([x, z]) => <Instance key={`${x},${z}`} position={[x, 0.575, z]} />)}
    </Instances>
    {[{ x: -0.22, y: 1.28, z: 0.08, s: 0.6, color: "#376d52" }, { x: 0.22, y: 1.48, z: -0.05, s: 0.59, color: "#4a835a" }, { x: 0, y: 1.84, z: 0, s: 0.52, color: "#609567" }].map((crown, i) =>
      <Instances key={i} limit={tiles.length} range={tiles.length} castShadow receiveShadow>
        <icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color={crown.color} roughness={0.95} />
        {tiles.map(([x, z]) => { const variation = 0.92 + ((x * 7 + z * 3) % 5) * 0.04; return <Instance key={`${x},${z}`} position={[x + crown.x, crown.y * variation, z + crown.z]} scale={[crown.s, crown.s * variation, crown.s * 0.9]} rotation={[0, (x + z) * 0.7, 0]} />; })}
      </Instances>)}
    <Instances limit={tiles.length} range={tiles.length} receiveShadow>
      <cylinderGeometry args={[0.3, 0.36, 0.055, 10]} /><meshStandardMaterial color="#476448" roughness={1} />
      {tiles.map(([x, z]) => <Instance key={`${x},${z}`} position={[x, 0.027, z]} />)}
    </Instances>
  </group>;
}

export function VillagePonds({ tiles }: { tiles: Tile[] }) {
  const edges = useMemo(() => {
    const water = new Set(tiles.map(([x, z]) => `${x},${z}`));
    return tiles.flatMap(([x, z]) => [[0, 1], [0, -1], [1, 0], [-1, 0]].filter(([dx, dz]) => !water.has(`${x + dx},${z + dz}`)).map(([dx, dz]) => ({ x: x + dx * 0.44, z: z + dz * 0.44, yaw: dx ? Math.PI / 2 : 0 })));
  }, [tiles]);
  return <group>
    <Instances limit={tiles.length} range={tiles.length} receiveShadow>
      <boxGeometry args={[1, 0.06, 1]} /><meshStandardMaterial color="#368c94" roughness={0.22} metalness={0.18} />
      {tiles.map(([x, z]) => <Instance key={`${x},${z}`} position={[x, 0.012, z]} />)}
    </Instances>
    <Instances limit={edges.length} range={edges.length} receiveShadow>
      <boxGeometry args={[1, 0.095, 0.15]} /><meshStandardMaterial color="#b4b393" roughness={1} />
      {edges.map((edge, i) => <Instance key={i} position={[edge.x, 0.055, edge.z]} rotation={[0, edge.yaw, 0]} />)}
    </Instances>
    <Instances limit={edges.length * 2} range={edges.length * 2} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#899b8e" roughness={1} />
      {edges.flatMap((edge, i) => [-0.23, 0.24].map((offset, j) => <Instance key={`${i}-${j}`} position={[edge.x + Math.cos(edge.yaw) * offset, 0.12, edge.z + Math.sin(edge.yaw) * offset]} scale={[0.16, 0.12, 0.12]} rotation={[0, i, 0]} />))}
    </Instances>
    {tiles.filter(([x, z]) => (x * 3 + z) % 5 === 0).map(([x, z]) => <group key={`${x},${z}`} position={[x, 0.047, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.28, 0.289, 32]} /><meshBasicMaterial color="#9cd9cb" transparent opacity={0.45} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, (x + z) * 0.9]}><circleGeometry args={[0.17, 20, 0.2, Math.PI * 1.83]} /><meshStandardMaterial color="#83a85f" roughness={0.8} side={2} /></mesh>
      <mesh position={[0.04, 0.025, 0]} scale={[1, 0.45, 1]}><sphereGeometry args={[0.055, 8, 6]} /><meshStandardMaterial color="#edb3ba" /></mesh>
    </group>)}
  </group>;
}

function buildingGroups(tiles: Tile[]) {
  const remaining = new Map(tiles.map(tile => [tile.join(","), tile]));
  const groups: Tile[][] = [];
  while (remaining.size) {
    const first = remaining.values().next().value!;
    const group = [first]; remaining.delete(first.join(","));
    for (let i = 0; i < group.length; i++) {
      const [x, z] = group[i];
      for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const key = `${x + dx},${z + dz}`; const next = remaining.get(key);
        if (next) { remaining.delete(key); group.push(next); }
      }
    }
    groups.push(group);
  }
  return groups;
}

export function VillageBuildings({ walls, doors }: { walls: Tile[]; doors: { x: number; z: number }[] }) {
  const groups = useMemo(() => buildingGroups([...walls, ...doors.map(({ x, z }) => [x, z] as Tile)]), [walls, doors]);
  return <group>{groups.map((tiles, index) => {
    const xs = tiles.map(t => t[0]), zs = tiles.map(t => t[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const width = maxX - minX + 1, depth = maxZ - minZ + 1;
    const isHouse = width <= 8 && depth <= 8 && tiles.length === width * depth;
    if (!isHouse) return <Instances key={index} limit={tiles.length} range={tiles.length} castShadow receiveShadow>
      <boxGeometry args={[1, 1.65, 1]} /><meshStandardMaterial color="#899b98" roughness={1} />
      {tiles.map(([x, z]) => <Instance key={`${x},${z}`} position={[x, 0.825, z]} />)}
    </Instances>;
    return <House key={index} x={(minX + maxX) / 2} z={(minZ + maxZ) / 2} width={width} depth={depth} variant={index} doors={doors.filter(d => d.x >= minX && d.x <= maxX && d.z >= minZ && d.z <= maxZ)} />;
  })}</group>;
}

function House({ x, z, width, depth, variant, doors }: { x: number; z: number; width: number; depth: number; variant: number; doors: { x: number; z: number }[] }) {
  const roof = useMemo(() => new Shape().moveTo(-width / 2 - 0.18, 0).lineTo(width / 2 + 0.18, 0).lineTo(0, 0.95).closePath(), [width]);
  const roofColor = variant % 2 ? "#537f83" : "#af6958";
  return <group position={[x, 0, z]}>
    <mesh castShadow receiveShadow position={[0, 1.13, 0]}><boxGeometry args={[width, 2.2, depth]} /><meshStandardMaterial color="#e2d6b9" roughness={0.95} /></mesh>
    <mesh receiveShadow position={[0, 0.18, 0]}><boxGeometry args={[width + 0.04, 0.35, depth + 0.04]} /><meshStandardMaterial color="#92958a" roughness={1} /></mesh>
    <mesh castShadow position={[0, 2.2, -depth / 2 - 0.18]}><extrudeGeometry args={[roof, { depth: depth + 0.36, bevelEnabled: false }]} /><meshStandardMaterial color={roofColor} roughness={0.9} /></mesh>
    <mesh castShadow position={[0, 3.15, 0]}><boxGeometry args={[0.12, 0.1, depth + 0.48]} /><meshStandardMaterial color={roofColor} /></mesh>
    <mesh castShadow position={[width * 0.28, 2.95, -depth * 0.2]}><boxGeometry args={[0.34, 0.85, 0.4]} /><meshStandardMaterial color="#a39886" roughness={1} /></mesh>
    <mesh position={[width * 0.28, 3.4, -depth * 0.2]}><boxGeometry args={[0.43, 0.12, 0.49]} /><meshStandardMaterial color="#646c67" /></mesh>
    {[-1, 1].flatMap(side => [-1, 1].map(end => <mesh key={`${side}-${end}`} castShadow position={[side * (width / 2 - 0.035), 1.2, end * (depth / 2 + 0.025)]}><boxGeometry args={[0.12, 2, 0.1]} /><meshStandardMaterial color="#8a7056" /></mesh>))}
    {Array.from({ length: width }, (_, i) => i - (width - 1) / 2).filter(wx => !doors.some(d => Math.abs(d.x - x - wx) < 0.6)).map(wx => <group key={wx} position={[wx, 1.35, depth / 2 + 0.045]}>
      <mesh><boxGeometry args={[0.63, 0.76, 0.07]} /><meshStandardMaterial color="#f6edcf" /></mesh>
      <mesh position={[0, 0, 0.04]}><boxGeometry args={[0.49, 0.61, 0.04]} /><meshStandardMaterial color="#739faa" roughness={0.25} metalness={0.15} /></mesh>
      <mesh position={[0, 0, 0.07]}><boxGeometry args={[0.035, 0.64, 0.04]} /><meshStandardMaterial color="#f6edcf" /></mesh>
      <mesh position={[0, 0, 0.07]}><boxGeometry args={[0.53, 0.035, 0.04]} /><meshStandardMaterial color="#f6edcf" /></mesh>
      <mesh castShadow position={[0, -0.43, 0.1]}><boxGeometry args={[0.73, 0.12, 0.25]} /><meshStandardMaterial color="#8a7056" /></mesh>
    </group>)}
    {doors.map(door => <group key={`${door.x},${door.z}`} position={[door.x - x, 0, door.z - z + 0.51]}>
      <mesh position={[0, 0.9, 0]}><boxGeometry args={[0.82, 1.8, 0.13]} /><meshStandardMaterial color="#8a7056" /></mesh>
      <mesh position={[0, 0.85, 0.08]}><boxGeometry args={[0.63, 1.62, 0.07]} /><meshStandardMaterial color="#456c72" /></mesh>
      <mesh position={[0.22, 0.81, 0.14]}><sphereGeometry args={[0.04, 10, 8]} /><meshStandardMaterial color="#e8c16d" metalness={0.65} roughness={0.35} /></mesh>
      <mesh receiveShadow position={[0, 0.075, 0.18]}><boxGeometry args={[0.9, 0.15, 0.38]} /><meshStandardMaterial color="#b5b2a0" /></mesh>
    </group>)}
  </group>;
}
