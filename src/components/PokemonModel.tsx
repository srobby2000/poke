import { pokemonDisplayHeight, pokemonMeasurement } from "../game/pokemonScale";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Box3, DoubleSide, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { removeCoincidentTriangles } from "../game/pokemonModelGeometry";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadPokemonModel } from "../game/loadPokemonModel";
import type { PokemonMotion } from "../game/pokemonAnimation";
import { rigPokemonAppendages } from "../game/pokemonAppendages";
import { createPokemonAnimator } from "../game/pokemonAnimation";
import { POKEMON_MODELS } from "../game/pokemonModels";

type Props = { animation?: PokemonMotion; fitPreview?: boolean; species: string; color?: string; hit?: boolean; walking?: boolean; attacking?: boolean; fainted?: boolean };

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
export function PokemonModel({ animation, species, hit = false, walking = false, attacking = false, fainted = false, fitPreview = false }: Props) {
  // Battle units store display names ("Lapras"); the asset catalog uses slugs.
  const model = POKEMON_MODELS[species.trim().toLowerCase()];
  if (!model) return <ModelPlaceholder message={`No 3D model available for ${species}`} />;
  return <ModelBoundary key={`${species}-image-v2`}><AsyncPokemon animation={animation} number={model.number} heightM={model.heightM} fitPreview={fitPreview} hit={hit} walking={walking} attacking={attacking} fainted={fainted} /></ModelBoundary>;
}

function AsyncPokemon({ animation, number, heightM, fitPreview, hit, walking, attacking, fainted }: { animation?: PokemonMotion; number: number; heightM: number; fitPreview: boolean; hit: boolean; walking: boolean; attacking: boolean; fainted: boolean }) {
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
  if (!result) return <ModelPlaceholder />;
  return <LoadedPokemon animation={animation} number={number} heightM={heightM} fitPreview={fitPreview} gltf={result} hit={hit} walking={walking} attacking={attacking} fainted={fainted} />;
}

function LoadedPokemon({ animation, number, heightM, fitPreview, gltf, hit, walking, attacking, fainted }: { animation?: PokemonMotion; number: number; heightM: number; fitPreview: boolean; gltf: GLTF; hit: boolean; walking: boolean; attacking: boolean; fainted: boolean }) {
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
          const flame = (number === 6 && ["Material_15", "Material_16"].includes(material.name)) || (number === 78 && /FireCore|FireSten/.test(material.name));
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
    const disposeRig = rigPokemonAppendages(scene, number);
    scene.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(scene);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = fitPreview ? 1.6 / Math.max(size.x, size.y, size.z, 0.001) : pokemonDisplayHeight(heightM) / pokemonMeasurement(number, scene, size);
    return { scene, scale, offset: [-center.x * scale, -bounds.min.y * scale, -center.z * scale] as [number, number, number], materials, disposeRig };
  }, [source, number, heightM, fitPreview]);
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
    animator.current?.update(animation ?? (hit ? "hit" : attacking ? "attack" : walking ? "walk" : "idle"), delta, fainted);
  });
  return <group ref={root}><group position={model.offset} scale={model.scale}><primitive object={model.scene} dispose={null} /></group></group>;
}
