import { pokemonDisplayHeight, pokemonMeasurement } from "../game/pokemonScale";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Box3, DoubleSide, Group, Mesh, MeshStandardMaterial, Object3D, SkeletonHelper, Vector3 } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { isFlameMaterial, mountSeat, removeCoincidentTriangles } from "../game/pokemonModelGeometry";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadPokemonModel } from "../game/loadPokemonModel";
import type { PokemonAction } from "../game/pokemonAnimation";
import { rigPokemonAppendages } from "../game/pokemonAppendages";
import { applyRestPose, createPokemonAnimator } from "../game/pokemonAnimation";
import { POKEMON_MODELS } from "../game/pokemonModels";

type Props = { showJoints?: boolean; paused?: boolean; playbackRate?: number; animation?: PokemonAction; fitPreview?: boolean; species: string; color?: string; hit?: boolean; walking?: boolean; running?: boolean; attacking?: boolean; fainted?: boolean;
  /** While attacking, play this move's own animation instead of the generic attack. */
  moveId?: string;
  /** Rendered at the saddle point on the back, inside the animated root, so a rider rises,
   * pitches and lands with the stride. */
  children?: ReactNode };

function ModelPlaceholder({ failed = false, message }: { failed?: boolean; message?: string }) {
  return <Html center position={[0, 0.65, 0]} zIndexRange={[20, 0]}>
    <span className="pokemon-model-status" role="status">{message ?? (failed ? "Model could not load — refresh to retry" : "Loading Pokémon…")}</span>
  </Html>;
}

class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error("Pokémon model failed to load:", error); }
  render() { return this.state.failed ? <ModelPlaceholder failed /> : this.props.children; }
}

/** Species-specific GLBs bundled locally; cached assets are cloned per instance. */
export function PokemonModel({ showJoints = false, paused = false, playbackRate = 1, animation, species, hit = false, walking = false, running = false, attacking = false, moveId, fainted = false, fitPreview = false, children }: Props) {
  // Battle units store display names ("Lapras"); the asset catalog uses slugs.
  const model = POKEMON_MODELS[species.trim().toLowerCase()];
  if (!model) return <ModelPlaceholder message={`No 3D model available for ${species}`} />;
  return <ModelBoundary key={`${species}-image-v2`}><AsyncPokemon showJoints={showJoints} paused={paused} playbackRate={playbackRate} animation={animation} number={model.number} heightM={model.heightM} fitPreview={fitPreview} hit={hit} walking={walking} running={running} attacking={attacking} moveId={moveId} fainted={fainted}>{children}</AsyncPokemon></ModelBoundary>;
}

function AsyncPokemon({ showJoints, paused, playbackRate, animation, number, heightM, fitPreview, hit, walking, running, attacking, moveId, fainted, children }: { showJoints: boolean; paused: boolean; playbackRate: number; animation?: PokemonAction; number: number; heightM: number; fitPreview: boolean; hit: boolean; walking: boolean; running: boolean; attacking: boolean; moveId?: string; fainted: boolean; children?: ReactNode }) {
  const [result, setResult] = useState<GLTF | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    loadPokemonModel(number).then(model => {
      if (active) setResult(model);
    }, reason => {
      console.error(`Pokémon #${number} failed to load:`, reason);
      if (active) setError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => { active = false; };
  }, [number, attempt]);
  if (error) return <Html center position={[0, 0.65, 0]} zIndexRange={[20, 0]}>
    <span className="pokemon-model-status" role="alert">{error}<button onClick={event => {
      event.stopPropagation();
      setError(null);
      setAttempt(value => value + 1);
    }}>Retry</button></span>
  </Html>;
  // Keep the rider visible while the mount streams in.
  if (!result) return <><ModelPlaceholder />{children}</>;
  return <LoadedPokemon showJoints={showJoints} paused={paused} playbackRate={playbackRate} animation={animation} number={number} heightM={heightM} fitPreview={fitPreview} gltf={result} hit={hit} walking={walking} running={running} attacking={attacking} moveId={moveId} fainted={fainted}>{children}</LoadedPokemon>;
}

function LoadedPokemon({ showJoints, paused, playbackRate, animation, number, heightM, fitPreview, gltf, hit, walking, running, attacking, moveId, fainted, children }: { showJoints: boolean; paused: boolean; playbackRate: number; animation?: PokemonAction; number: number; heightM: number; fitPreview: boolean; gltf: GLTF; hit: boolean; walking: boolean; running: boolean; attacking: boolean; moveId?: string; fainted: boolean; children?: ReactNode }) {
  const { scene: source, animations } = gltf;
  const root = useRef<Group>(null);
  const model = useMemo(() => {
    const scene = clone(source);
    const materials: MeshStandardMaterial[] = [];
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      if (number === 12) object.geometry = removeCoincidentTriangles(object.geometry);
      object.castShadow = true;
      object.receiveShadow = true;
      object.material = Array.isArray(object.material) ? object.material.map(material => material.clone()) : object.material.clone();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material instanceof MeshStandardMaterial) {
          materials.push(material);
          if (number === 12) material.side = DoubleSide;
          const flame = isFlameMaterial(number, material.name);
          if (flame) {
            material.transparent = true;
            material.depthWrite = false;
            material.alphaTest = 0.12;
            material.metalness = 0;
            material.emissive.set("#ff8a16");
            material.emissiveIntensity = 1;
            material.onBeforeCompile = shader => {
              shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
                #ifdef USE_MAP
                  vec4 flameMask = texture2D(map, vMapUv);
                  float heat = flameMask.r;
                  diffuseColor.rgb = mix(vec3(1.0, 0.08, 0.005), vec3(1.0, 0.8, 0.04), heat);
                  diffuseColor.a *= heat;
                #endif
              `);
            };
            material.customProgramCacheKey = () => "pokemon-flame-mask-v1";
          }
        }
      }
    });
    applyRestPose(scene, number, animations);
    const disposeRig = rigPokemonAppendages(scene, number);
    scene.updateMatrixWorld(true);
    // Size and centre on the body: flame sheets (Rapidash's mane is taller than the
    // horse) would otherwise shrink the body well below its Pokédex height.
    const bounds = new Box3();
    scene.traverse(node => {
      if (node instanceof Mesh && !(Array.isArray(node.material) ? node.material : [node.material]).some(material => isFlameMaterial(number, material.name))) bounds.expandByObject(node);
    });
    if (bounds.isEmpty()) bounds.setFromObject(scene);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = fitPreview ? 1.6 / Math.max(size.x, size.y, size.z, 0.001) : pokemonDisplayHeight(heightM) / pokemonMeasurement(number, scene, size);
    const offset: [number, number, number] = [-center.x * scale, -bounds.min.y * scale, -center.z * scale];
    const saddle = mountSeat(scene, number);
    const seat: [number, number, number] = [saddle.x * scale + offset[0], saddle.y * scale + offset[1], saddle.z * scale + offset[2]];
    return { scene, scale, offset, seat, materials, disposeRig };
  }, [source, animations, number, heightM, fitPreview]);
  const animator = useRef<ReturnType<typeof createPokemonAnimator>>();
  useEffect(() => {
    const definition = Object.values(POKEMON_MODELS).find(entry => entry.number === number)!;
    animator.current = createPokemonAnimator(model.scene, root.current!, definition, animations);
    return () => { animator.current?.dispose(); };
  }, [animations, model.scene, number]);
  useEffect(() => {
    const saved = model.materials.map(material => ({ material, emissive: material.emissive.clone(), intensity: material.emissiveIntensity }));
    if (hit) for (const { material } of saved) { material.emissive.set("white"); material.emissiveIntensity = 0.6; }
    return () => { for (const { material, emissive, intensity } of saved) { material.emissive.copy(emissive); material.emissiveIntensity = intensity; } };
  }, [hit, model]);
  useEffect(() => () => { model.disposeRig(); model.scene.traverse(object => { if (object instanceof Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose(); if (number === 12 && object instanceof Mesh) object.geometry.dispose(); }); }, [model, number]);
  useFrame((_, delta) => {
    animator.current?.update(animation ?? (hit ? "hit" : attacking ? (moveId ? `move:${moveId}` as const : "attack") : running ? "run" : walking ? "walk" : "idle"), delta * playbackRate, fainted || paused);
  });
  return <group ref={root}><group position={model.offset} scale={model.scale}><primitive object={model.scene} dispose={null} />{showJoints && <JointOverlay scene={model.scene} />}</group>{children && <group name="pokemon-seat" position={model.seat}>{children}</group>}</group>;
}


function JointOverlay({ scene }: { scene: Object3D }) {
  const helper = useMemo(() => {
    const skeleton = new SkeletonHelper(scene);
    skeleton.name = "pokemon-joints";
    // This helper is a sibling of the scene under the same normalization group.
    skeleton.matrix = scene.matrix;
    for (const material of Array.isArray(skeleton.material) ? skeleton.material : [skeleton.material]) {
      material.depthTest = false; material.transparent = true; material.opacity = 0.85;
    }
    skeleton.renderOrder = 100;
    return skeleton;
  }, [scene]);
  useEffect(() => () => { helper.geometry.dispose(); for (const material of Array.isArray(helper.material) ? helper.material : [helper.material]) material.dispose(); }, [helper]);
  return <primitive object={helper} dispose={null} />;
}
