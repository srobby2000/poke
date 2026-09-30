import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";
import { stepCompanion } from "../game/companionMotion";
import type { CompanionPose } from "../game/companionMotion";
import type { WorldState } from "../game/worldState";
import { PokemonModel } from "./PokemonModel";
import { WorldActor } from "./WorldActor";

/** Keep one companion instance for the entire map, including ride changes. */
export function WorldParty({ state }: { state: WorldState }) {
  return <group name="world-party">
    <WorldActor state={state} />
    <Partner state={state} />
  </group>;
}

function Partner({ state }: { state: WorldState }) {
  const ref = useRef<Group>(null);
  const pose = useRef<CompanionPose | null>(null);
  const [walking, setWalking] = useState(false);
  // Measured ground speed, smoothed, so the partner's stride matches how fast it really moves.
  const speed = useRef(0);
  const riding = state.ride !== null;
  // Reposition before showing the partner again, even if no render frame ran
  // between the final movement update and dismounting.
  const wasRiding = useRef(riding);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const previous = pose.current;
    pose.current = stepCompanion(riding || wasRiding.current ? null : previous, state, delta);
    const travelled = previous ? Math.hypot(pose.current.x - previous.x, pose.current.z - previous.z) : 0;
    const inMotion = !riding && previous !== null && travelled > delta * 0.15;
    speed.current += ((inMotion && delta > 0 ? travelled / delta : 0) - speed.current) * (1 - Math.exp(-delta * 8));
    if (inMotion !== walking) setWalking(inMotion);
    ref.current.position.set(pose.current.x, 0, pose.current.z);
    ref.current.rotation.y = pose.current.yaw;
    wasRiding.current = riding;
  });
  return <group name="world-companion" ref={ref} visible={!riding}>
    <PokemonModel species="squirtle" walking={!riding && walking} travelSpeed={speed} fainted={riding} />
  </group>;
}
