import { act, create } from "@react-three/test-renderer";
import { expect, it, vi } from "vitest";
import { TrainerModel } from "./TrainerModel";

it("blends from a walking stride into a seated riding pose", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const renderer = await create(<TrainerModel walking />);
  try {
    await act(async () => { await renderer.advanceFrames(30, 1 / 60); });
    const body = renderer.scene.instance.getObjectByName("trainer-body")!;
    const leg = body.getObjectByName("trainer-left-leg")!;
    const walkingAngle = leg.rotation.x;
    await renderer.update(<TrainerModel riding />);
    await act(async () => { await renderer.advanceFrames(60, 1 / 60); });
    expect(leg.rotation.x).toBeCloseTo(-1.1, 2);
    expect(leg.rotation.z).toBeCloseTo(-0.32, 2);
    expect(leg.rotation.x).not.toBeCloseTo(walkingAngle);
    expect(body.rotation.x).toBeCloseTo(0.12, 2);
  } finally {
    await renderer.unmount();
    vi.unstubAllGlobals();
  }
});

it("articulates elbows, knees and ankles instead of swinging rigid limbs", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const renderer = await create(<TrainerModel riding />);
  try {
    await act(async () => { await renderer.advanceFrames(60, 1 / 60); });
    const scene = renderer.scene.instance;
    for (const side of ["left", "right"]) {
      const knee = scene.getObjectByName(`trainer-${side}-knee`)!;
      const ankle = scene.getObjectByName(`trainer-${side}-ankle`)!;
      const elbow = scene.getObjectByName(`trainer-${side}-elbow`)!;
      expect(knee.rotation.x).toBeCloseTo(1.25, 2);
      expect(ankle.rotation.x).toBeCloseTo(-0.15, 2);
      expect(elbow.rotation.x).toBeCloseTo(-0.65, 2);
      expect(ankle.parent).toBe(knee);
      expect(knee.parent?.name).toBe(`trainer-${side}-leg`);
    }
    await renderer.update(<TrainerModel walking />);
    await act(async () => { await renderer.advanceFrames(30, 1 / 60); });
    const left = scene.getObjectByName("trainer-left-knee")!;
    const right = scene.getObjectByName("trainer-right-knee")!;
    expect(Math.abs(left.rotation.x - right.rotation.x)).toBeGreaterThan(0.1);
  } finally { await renderer.unmount(); vi.unstubAllGlobals(); }
});
