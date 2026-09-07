export type CompanionPose = { x: number; z: number; yaw: number };
type LeaderPose = { x: number; z: number; facingX: number; facingZ: number };

export function stepCompanion(previous: CompanionPose | null, leader: LeaderPose, delta: number): CompanionPose {
  const length = Math.hypot(leader.facingX, leader.facingZ) || 1;
  const dx = leader.facingX / length;
  const dz = leader.facingZ / length;
  const target = { x: leader.x - dx * 0.8, z: leader.z - dz * 0.8, yaw: Math.atan2(dx, dz) };
  if (!previous || Math.hypot(target.x - previous.x, target.z - previous.z) > 4) return target;
  const ease = 1 - Math.exp(-Math.max(0, delta) * 9);
  const turn = Math.atan2(Math.sin(target.yaw - previous.yaw), Math.cos(target.yaw - previous.yaw));
  return {
    x: previous.x + (target.x - previous.x) * ease,
    z: previous.z + (target.z - previous.z) * ease,
    yaw: previous.yaw + turn * ease,
  };
}
