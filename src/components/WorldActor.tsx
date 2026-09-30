import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";
import { RIDE_POKEMON, TRAINER_SEAT_HEIGHT } from "../game/riding";
import type { WorldState } from "../game/worldState";
import { WORLD_BALANCE } from "../game/worldState";
import { PokemonModel } from "./PokemonModel";
import { TrainerModel } from "./TrainerModel";

/** Own both the rendered player position and camera in the same frame. */
export function WorldActor({ state }: { state: WorldState }) {
  const ref = useRef<Group>(null);
  // The mount's ground speed, so its gallop stride matches the ride speed.
  const mountSpeed = useRef(0);
  // A changing JSX position would overwrite the interpolated transform on each
  // logic tick. Initialize once; map transitions remount this component.
  const [initialPosition] = useState<[number, number, number]>(() => [state.x, 0, state.z]);

  useFrame(({ camera }, delta) => {
    mountSpeed.current = state.ride && state.moving ? WORLD_BALANCE.moveSpeed * RIDE_POKEMON[state.ride].speed : 0;
    const actor = ref.current;
    if (!actor) return;
    const ease = 1 - Math.exp(-delta * 22);
    actor.position.x += (state.x - actor.position.x) * ease;
    actor.position.z += (state.z - actor.position.z) * ease;
    const target = Math.atan2(state.facingX, state.facingZ);
    const turn = Math.atan2(Math.sin(target - actor.rotation.y), Math.cos(target - actor.rotation.y));
    actor.rotation.y += turn * (1 - Math.exp(-delta * 14));

    // Following a separately damped logic position makes the actor oscillate
    // against the camera at the logic tick rate. Share the rendered position.
    camera.position.set(actor.position.x, 8.2, actor.position.z + 7.4);
    camera.lookAt(actor.position.x, 0.4, actor.position.z);
  });

  const ride = state.ride ? RIDE_POKEMON[state.ride] : null;
  return <group name="world-actor" ref={ref} position={initialPosition}>
    {state.ride && ride ? <group name="world-mount" scale={ride.modelScale}>
      {/* The mount gallops at its natural stride; the rider sits in its animated root. */}
      <PokemonModel species={state.ride} running={state.moving} travelSpeed={mountSpeed}>
        {/* PokemonModel places this at the saddle on the mount's back. */}
        <group name="world-rider" position={[0, -TRAINER_SEAT_HEIGHT / ride.modelScale, 0]} scale={1 / ride.modelScale}>
          <TrainerModel walking={state.moving} riding />
        </group>
      </PokemonModel>
    </group> : <TrainerModel walking={state.moving} />}
  </group>;
}
