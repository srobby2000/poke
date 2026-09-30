import { AdditiveBlending, CanvasTexture, PointLight, Quaternion, Sprite, SpriteMaterial, Vector3 } from "three";
import type { MeshStandardMaterial, Object3D } from "three";
import { normalizePokemonBone } from "./pokemonAppendages";

/** Tail flames that are fire, not body: the model's flame meshes (a core and an outer shell,
 * skinned to their own bone chain at the tail tip) get a burning surface, and the chain is
 * driven every frame after the animation clip, so the flame rises, trails motion and flickers
 * whatever the tail is doing. */
export type FlameRig = {
  /** Material names of the solid inner flame and the outer shell of tongues. */
  core: string;
  shell: string;
  /** The flame's bone chain, base first, as normalized bone names. */
  bones: string[];
  /** Colour of the light the flame casts. */
  light: string;
  /** The textures are greyscale heat masks (Charizard): colour comes from heat, and black is
   * outside the flame. Otherwise the textures are already painted red and yellow. */
  mask?: boolean;
  /** Flame size relative to the Pokémon, for its halo and light. */
  scale?: number;
};

export const FLAME_RIGS: Record<number, FlameRig> = {
  4: { core: "Material #36", shell: "Material #37", bones: ["TailA01", "TailA02", "TailA03"], light: "#ff8a2a" },
  5: { core: "Material #36", shell: "Material #38", bones: ["TailA01", "TailA02", "TailA03"], light: "#ff7a22" },
  6: { core: "Material_15", shell: "Material_16", bones: ["TailA01", "TailA02", "TailA03", "TailA04"], light: "#ff7418", mask: true, scale: 0.7 },
};

export type FlameClock = { value: number };

/** Turn a flame material into fire: it glows with its own texture, which scrolls upward so the
 * tongues rise. The shell is additive and see-through, softest at its silhouette. */
export function burnFlameMaterial(material: MeshStandardMaterial, role: "core" | "shell", clock: FlameClock, mask = false) {
  const shell = role === "shell";
  material.emissive.set("#ffffff");
  material.emissiveIntensity = shell ? 1 : 0.85;
  if (shell) {
    material.transparent = true;
    material.depthWrite = false;
    material.blending = AdditiveBlending;
  } else if (mask) {
    // A masked core is cut out where its heat is black.
    material.transparent = true;
    material.alphaTest = 0.12;
  }
  material.onBeforeCompile = shader => {
    shader.uniforms.flameTime = clock;
    shader.fragmentShader = `uniform float flameTime;\n${shader.fragmentShader}`
      .replace("#include <map_fragment>", `
        vec4 flame = vec4(1.0);
        #ifdef USE_MAP
          // Tongues rise: scroll up, with a sideways waver that grows with height.
          vec2 flameUv = vMapUv + vec2(sin(vMapUv.y * 9.0 + flameTime * 7.0) * 0.03, -flameTime * ${shell ? "0.55" : "0.22"});
          flame = texture2D(map, flameUv);
        #endif
        ${mask ? `// A heat mask: hotter is brighter and yellower; black is outside the flame.
        float heat = flame.r;
        ${shell ? "" : "diffuseColor.a *= heat;"}
        flame.rgb = mix(vec3(1.0, 0.16, 0.01), vec3(1.0, 0.8, 0.2), smoothstep(0.6, 1.0, heat));
        flame.g = smoothstep(0.5, 1.0, heat);` : ""}
        ${shell ? `// The shell's tongues: deep orange, with the yellow wisps burning brighter.
        flame.rgb = mix(vec3(1.0, 0.28, 0.02), vec3(1.0, 0.72, 0.16), smoothstep(0.3, 0.85, flame.g));` : ""}
        // Unlit: the fire makes its own light, so its low-poly facets don't show.
        diffuseColor.rgb = vec3(0.0);
      `)
      .replace("#include <emissivemap_fragment>", `
        float pulse = 1.0 + 0.12 * sin(flameTime * 13.0) + 0.06 * sin(flameTime * 23.0 + 1.3);
        totalEmissiveRadiance = flame.rgb * emissive * pulse;
        ${shell ? `
        // Yellow wisps (high green) are the bright tongues; red fills between them. The rim fades
        // so the silhouette is soft, like fire, instead of a hard shell.
        float facing = abs(dot(normalize(normal), normalize(vViewPosition)));
        diffuseColor.a = (0.35 + 0.4 * smoothstep(0.35, 0.8, flame.g)) * smoothstep(0.3, 0.75, facing);
        totalEmissiveRadiance *= diffuseColor.a;` : ""}
      `);
  };
  material.customProgramCacheKey = () => `pokemon-tail-flame-${role}${mask ? "-mask" : ""}-v1`;
  material.needsUpdate = true;
}

const UP = new Vector3(0, 1, 0);

let halo: CanvasTexture | undefined;
/** A radial falloff, drawn once and shared. Returns undefined outside a browser (tests). */
function haloTexture() {
  if (halo || typeof document === "undefined" || !document.createElement) return halo;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  halo = new CanvasTexture(canvas);
  return halo;
}

/** Drives the flame chain each frame, after the animation clip has posed the rig. */
export type FlameDriver = {
  update: (delta: number, options: { fainted: boolean }) => void;
  /** The flame's tip, for embers. */
  tip: Object3D;
  dispose: () => void;
};

export function createFlameDriver(scene: Object3D, number: number, displayHeight: number, clock: FlameClock): FlameDriver | null {
  const rig = FLAME_RIGS[number];
  if (!rig) return null;
  const byName = new Map<string, Object3D>();
  scene.traverse(node => { if ((node as Object3D & { isBone?: boolean }).isBone) byName.set(normalizePokemonBone(node.name), node); });
  const bones = rig.bones.map(name => byName.get(name));
  if (bones.some(bone => !bone)) return null;
  const chain = bones as Object3D[];
  const rest = chain.map(bone => ({ quaternion: bone.quaternion.clone(), scale: bone.scale.clone() }));
  // Each bone's flame axis in its own space: toward the next bone (the last reuses its offset).
  const axes = chain.map((bone, i) => (chain[i + 1] ? chain[i + 1].position : bone.position).clone().normalize());
  // Which local component the axis lies along, for stretching the flame lengthwise.
  const along = axes.map(axis => { const a = [Math.abs(axis.x), Math.abs(axis.y), Math.abs(axis.z)]; return a.indexOf(Math.max(...a)) as 0 | 1 | 2; });

  const light = new PointLight(rig.light, 0, displayHeight * 2.2, 2);
  light.name = "pokemon-flame-light";
  chain[chain.length - 1].add(light);
  // A soft halo around the flame, so it reads as heat and light rather than a solid shape.
  const halo = new Sprite(new SpriteMaterial({ map: haloTexture(), color: rig.light, blending: AdditiveBlending, transparent: true, depthWrite: false }));
  halo.name = "pokemon-flame-halo";
  halo.renderOrder = 2;
  scene.add(halo);
  const haloAt = new Vector3(), worldScale = new Vector3();

  const s = {
    direction: new Vector3(), velocity: new Vector3(), lastTip: new Vector3(), tipNow: new Vector3(),
    parentWorld: new Quaternion(), restWorld: new Quaternion(), baseAxis: new Vector3(), target: new Vector3(),
    correction: new Quaternion(), local: new Quaternion(), wobble: new Quaternion(), axis: new Vector3(),
    started: false, time: 0, glow: 1,
  };
  return {
    tip: chain[chain.length - 1],
    update(delta, { fainted }) {
      const dt = Math.min(Math.max(delta, 0), 0.05);
      s.time += dt;
      clock.value = s.time;
      const base = chain[0];
      base.parent!.updateWorldMatrix(true, false);
      base.parent!.getWorldQuaternion(s.parentWorld);
      s.restWorld.copy(s.parentWorld).multiply(rest[0].quaternion);
      s.baseAxis.copy(axes[0]).applyQuaternion(s.restWorld);
      // Where the flame would point if it were just a tail part, pulled mostly upright, and
      // leaning away from the way the tip is moving (fire trails behind).
      chain[chain.length - 1].getWorldPosition(s.tipNow);
      if (!s.started) { s.lastTip.copy(s.tipNow); s.direction.copy(s.baseAxis).lerp(UP, 0.8).normalize(); s.started = true; }
      const motion = s.tipNow.clone().sub(s.lastTip).divideScalar(Math.max(dt, 1e-4) * displayHeight);
      s.lastTip.copy(s.tipNow);
      motion.clampLength(0, 3);
      s.target.copy(s.baseAxis).lerp(UP, 0.8).addScaledVector(motion, -0.28).normalize();
      // A soft spring toward the target: the flame lags, overshoots a little and settles.
      s.velocity.addScaledVector(s.target.clone().sub(s.direction), 70 * dt).multiplyScalar(Math.exp(-9 * dt));
      s.direction.addScaledVector(s.velocity, dt * 10).normalize();
      s.correction.setFromUnitVectors(s.baseAxis, s.direction);
      s.local.copy(s.parentWorld).invert().multiply(s.correction).multiply(s.restWorld);
      base.quaternion.copy(s.local);
      // A fainted Pokémon's flame burns low.
      s.glow += ((fainted ? 0.45 : 1) - s.glow) * Math.min(1, dt * 3);
      const t = s.time;
      for (let i = 0; i < chain.length; i++) {
        const bone = chain[i];
        if (i > 0) {
          // Tongues flicker: small, fast, irregular bends that grow toward the tip.
          const reach = i / (chain.length - 1);
          const bend = (0.1 + 0.16 * reach) * (Math.sin(t * 9.1 + i * 1.7) + 0.6 * Math.sin(t * 14.3 + i * 2.9));
          const twist = (0.08 + 0.12 * reach) * (Math.sin(t * 7.3 + i * 0.9) + 0.5 * Math.sin(t * 17.9 + i));
          const [p, q] = [(along[i] + 1) % 3, (along[i] + 2) % 3];
          s.axis.set(0, 0, 0).setComponent(p, 1);
          s.wobble.setFromAxisAngle(s.axis, bend);
          bone.quaternion.copy(rest[i].quaternion).multiply(s.wobble);
          s.axis.set(0, 0, 0).setComponent(q, 1);
          bone.quaternion.multiply(s.wobble.setFromAxisAngle(s.axis, twist));
        }
        // The flame stretches and narrows as it flares, and shrinks when it burns low.
        const flare = 1 + (0.07 + 0.05 * i) * Math.sin(t * 11.3 + i * 2.1) + 0.05 * Math.sin(t * 19.7 + i);
        const size = i === 0 ? s.glow : 1;
        bone.scale.copy(rest[i].scale).multiplyScalar(size);
        bone.scale.setComponent(along[i], bone.scale.getComponent(along[i]) * flare);
        const narrow = 1 - (flare - 1) * 0.45;
        bone.scale.setComponent((along[i] + 1) % 3, bone.scale.getComponent((along[i] + 1) % 3) * narrow);
        bone.scale.setComponent((along[i] + 2) % 3, bone.scale.getComponent((along[i] + 2) % 3) * narrow);
      }
      const flicker = 1 + 0.2 * Math.sin(t * 12.7) + 0.12 * Math.sin(t * 21.1);
      light.intensity = s.glow * displayHeight * displayHeight * 1.6 * (rig.scale ?? 1) * flicker;
      // The halo sits at the middle of the flame, in the scene's own (unscaled) units.
      chain[1].getWorldPosition(haloAt);
      scene.updateWorldMatrix(true, false);
      scene.worldToLocal(haloAt);
      scene.getWorldScale(worldScale);
      halo.position.copy(haloAt);
      halo.scale.setScalar(displayHeight * 0.55 * (rig.scale ?? 1) * s.glow * (0.95 + 0.08 * flicker) / Math.max(worldScale.x, 1e-6));
      halo.material.opacity = 0.55 * s.glow;
    },
    dispose() { light.removeFromParent(); light.dispose(); halo.removeFromParent(); halo.material.dispose(); },
  };
}
