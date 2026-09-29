import { act, create } from "@react-three/test-renderer";
import { useThree } from "@react-three/fiber";
import type { Camera } from "three";
import { Vector3 } from "three";
import { afterEach, expect, it, vi } from "vitest";
import { createInitialWorldState } from "../game/worldState";
import { WorldActor } from "./WorldActor";

vi.mock("./PokemonModel", () => ({ PokemonModel: () => null }));
vi.mock("./TrainerModel", () => ({ TrainerModel: () => null }));
afterEach(() => vi.unstubAllGlobals());

it("preserves interpolation across logic updates and keeps the actor fixed relative to the camera", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const initial = createInitialWorldState();
  let camera: Camera | undefined;
  function CaptureCamera() { camera = useThree(state => state.camera); return null; }
  const render = (x: number, z: number) => <><WorldActor state={{ ...initial, x, z, moving: true }} /><CaptureCamera /></>;
  const renderer = await create(render(initial.x, initial.z));
  try {
    const actor = renderer.scene.instance.getObjectByName("world-actor")!;
    await act(async () => { await renderer.advanceFrames(1, 1 / 60); });
    camera!.updateMatrixWorld();
    const screenStart = actor.position.clone().project(camera!);
    let lastX = actor.position.x;
    for (let tick = 1; tick <= 30; tick++) {
      const targetX = initial.x + tick * 0.12;
      const targetZ = initial.z + tick * 0.06;
      await renderer.update(render(targetX, targetZ));
      // React commits must not reset the frame-interpolated transform.
      expect(actor.position.x).toBe(lastX);
      for (let frame = 0; frame < 2; frame++) {
        await act(async () => { await renderer.advanceFrames(1, 1 / 60); });
        expect(actor.position.x).toBeGreaterThan(lastX);
        expect(actor.position.x).toBeLessThan(targetX);
        expect(camera!.position.x - actor.position.x).toBeCloseTo(0, 10);
        expect(camera!.position.z - actor.position.z).toBeCloseTo(7.4, 10);
        camera!.updateMatrixWorld();
        const projected = new Vector3().copy(actor.position).project(camera!);
        expect(projected.x).toBeCloseTo(screenStart.x, 8);
        expect(projected.y).toBeCloseTo(screenStart.y, 8);
        lastX = actor.position.x;
      }
    }
  } finally { await renderer.unmount(); }
});
