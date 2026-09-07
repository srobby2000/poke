import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

// An original articulated, stylized trainer, approximately 1.7 world metres tall.
export function TrainerModel({ walking = false, shirt = "#317cbd", cap = "#e45459", backpack = true }: {
  walking?: boolean; shirt?: string; cap?: string; backpack?: boolean;
}) {
  const body = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    const stride = walking ? Math.sin(clock.elapsedTime * 10) : 0;
    const ease = Math.min(1, delta * 14);
    for (const [ref, target] of [[leftArm, -stride * 0.5], [rightArm, stride * 0.5], [leftLeg, stride * 0.58], [rightLeg, -stride * 0.58]] as const) {
      if (ref.current) ref.current.rotation.x += (target - ref.current.rotation.x) * ease;
    }
    if (body.current) body.current.position.y = walking ? Math.abs(stride) * 0.025 : Math.sin(clock.elapsedTime * 2) * 0.008;
  });
  const skin = "#eac29d";
  return <group ref={body} name="trainer-body">
    <mesh castShadow position={[0, 0.96, 0]} scale={[0.29, 0.37, 0.18]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color={shirt} roughness={0.85} /></mesh>
    <mesh castShadow position={[0, 0.82, 0.013]}><boxGeometry args={[0.44, 0.055, 0.31]} /><meshStandardMaterial color="#203044" /></mesh>
    <mesh position={[0, 0.83, 0.179]}><boxGeometry args={[0.075, 0.06, 0.022]} /><meshStandardMaterial color="#e9c778" metalness={0.5} roughness={0.4} /></mesh>
    <mesh position={[0, 1.065, 0.17]}><boxGeometry args={[0.022, 0.28, 0.02]} /><meshStandardMaterial color="#ecf4f3" /></mesh>
    <mesh position={[0.13, 1.09, 0.167]}><boxGeometry args={[0.07, 0.04, 0.025]} /><meshStandardMaterial color="#ffe4a1" /></mesh>
    <mesh castShadow position={[0, 1.3, 0]}><cylinderGeometry args={[0.075, 0.08, 0.13, 10]} /><meshStandardMaterial color={skin} /></mesh>
    <mesh castShadow position={[0, 1.43, 0.01]} scale={[0.185, 0.205, 0.175]}><sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color={skin} roughness={0.85} /></mesh>
    {/* Hair at the nape and ears create a readable silhouette from behind. */}
    <mesh castShadow position={[0, 1.43, -0.065]} scale={[0.19, 0.17, 0.13]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#342b30" /></mesh>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * 0.18, 1.43, 0.012]} scale={[0.038, 0.063, 0.04]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color={skin} /></mesh>
      <mesh position={[side * 0.062, 1.455, 0.166]} scale={[0.03, 0.041, 0.012]}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color="#fffaf0" /></mesh>
      <mesh position={[side * 0.06, 1.453, 0.177]} scale={[0.014, 0.025, 0.008]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#263445" /></mesh>
    </group>)}
    <mesh position={[0, 1.42, 0.18]}><sphereGeometry args={[0.025, 10, 8]} /><meshStandardMaterial color={skin} /></mesh>
    <mesh position={[0, 1.36, 0.16]}><boxGeometry args={[0.045, 0.009, 0.009]} /><meshStandardMaterial color="#955d58" /></mesh>
    <mesh castShadow position={[0, 1.52, 0]}><sphereGeometry args={[0.202, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={cap} roughness={0.8} side={2} /></mesh>
    <mesh castShadow position={[0, 1.53, 0.17]} scale={[0.205, 0.025, 0.18]}><sphereGeometry args={[1, 16, 8]} /><meshStandardMaterial color={cap} /></mesh>
    <mesh position={[0, 1.61, 0.173]} rotation={[0.35, 0, 0]}><circleGeometry args={[0.047, 16]} /><meshStandardMaterial color="#fff4de" /></mesh>
    {([-1, 1] as const).map(side => <group key={`limbs-${side}`}>
      <group ref={side === -1 ? leftArm : rightArm} position={[side * 0.27, 1.15, 0]} rotation={[0, 0, side * 0.1]}>
        <mesh castShadow position={[0, -0.1, 0]}><capsuleGeometry args={[0.09, 0.13, 4, 10]} /><meshStandardMaterial color={shirt} /></mesh>
        <mesh castShadow position={[0, -0.29, 0.01]}><capsuleGeometry args={[0.062, 0.18, 4, 10]} /><meshStandardMaterial color={skin} /></mesh>
        <mesh castShadow position={[0, -0.425, 0.02]} scale={[0.07, 0.085, 0.055]}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color={skin} /></mesh>
        <mesh position={[0, -0.36, 0.01]}><cylinderGeometry args={[0.068, 0.068, 0.045, 10]} /><meshStandardMaterial color="#263445" /></mesh>
      </group>
      <group ref={side === -1 ? leftLeg : rightLeg} position={[side * 0.125, 0.76, 0]}>
        <mesh castShadow position={[0, -0.18, 0]}><capsuleGeometry args={[0.108, 0.23, 4, 12]} /><meshStandardMaterial color="#354257" /></mesh>
        <mesh castShadow position={[0, -0.46, 0]}><capsuleGeometry args={[0.085, 0.25, 4, 12]} /><meshStandardMaterial color="#354257" /></mesh>
        <mesh castShadow position={[0, -0.66, 0.05]} scale={[0.11, 0.085, 0.18]}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color="#f1f2e8" /></mesh>
        <mesh position={[0, -0.7, 0.055]}><boxGeometry args={[0.2, 0.045, 0.28]} /><meshStandardMaterial color="#293445" /></mesh>
      </group>
    </group>)}
    {backpack && <group>
      <mesh castShadow position={[0, 1.02, -0.215]} scale={[0.22, 0.27, 0.12]}><sphereGeometry args={[1, 14, 12]} /><meshStandardMaterial color="#d29a52" roughness={0.95} /></mesh>
      <mesh castShadow position={[0, 0.93, -0.315]}><boxGeometry args={[0.26, 0.14, 0.065]} /><meshStandardMaterial color="#b87d3e" /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side * 0.17, 1.08, 0.135]} rotation={[0, 0, side * -0.12]}><boxGeometry args={[0.045, 0.32, 0.045]} /><meshStandardMaterial color="#b98348" /></mesh>)}
    </group>}
  </group>;
}
