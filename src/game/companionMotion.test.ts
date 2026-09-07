import { describe, expect, it } from "vitest";
import { stepCompanion } from "./companionMotion";

describe("companion movement", () => {
  it.each([[1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2], [0, -1, Math.PI], [0, 1, 0]])(
    "faces direction (%s, %s) even when already at its follow position", (facingX, facingZ, yaw) => {
      const leader = { x: 10, z: 10, facingX, facingZ };
      let pose = { x: 10 - facingX * 0.8, z: 10 - facingZ * 0.8, yaw: 0 };
      for (let i = 0; i < 120; i++) pose = stepCompanion(pose, leader, 1 / 60);
      expect(Math.sin(pose.yaw)).toBeCloseTo(Math.sin(yaw), 4);
      expect(Math.cos(pose.yaw)).toBeCloseTo(Math.cos(yaw), 4);
      expect(pose.x).toBeCloseTo(10 - facingX * 0.8);
      expect(pose.z).toBeCloseTo(10 - facingZ * 0.8);
    },
  );
  it("eases movement and snaps after a warp", () => {
    const leader = { x: 1, z: 1, facingX: 0, facingZ: 1 };
    const next = stepCompanion({ x: 0, z: 0, yaw: 0 }, leader, 1 / 60);
    expect(next.x).toBeGreaterThan(0);
    expect(next.x).toBeLessThan(1);
    expect(stepCompanion(next, { ...leader, x: 30 }, 1 / 60).x).toBe(30);
  });
});
