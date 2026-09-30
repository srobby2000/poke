import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { PokemonLighting } from "../components/PokemonLighting";
import type { LightingMood } from "../components/PokemonLighting";
import { PokemonModel } from "../components/PokemonModel";
import { loadPokemonModel } from "../game/loadPokemonModel";
import type { PokemonAction } from "../game/pokemonAnimation";
import { POKEMON_MODELS } from "../game/pokemonModels";

const COLUMNS = 8, ROWS = 5, CELL = 2, PIXELS = 200;
const species = Object.entries(POKEMON_MODELS).sort(([, a], [, b]) => a.number - b.number);

// Close-up views of one species: side, back three-quarter, front three-quarter.
const VIEWS = [{ label: "side", turn: -Math.PI / 2 }, { label: "back", turn: Math.PI * 0.8 }, { label: "front", turn: 0.35 }];

/** A contact sheet of Pokémon rendered exactly as the game renders them. URL parameters:
 * `sheet` (1-based, 40 per sheet), `motion` (default: the rest pose, paused), `mood` (lighting),
 * or `species` for a close-up of one Pokémon from three sides, playing `motion`. */
export function ModelReview() {
  const params = new URLSearchParams(location.search);
  const close = params.get("species");
  return close ? <CloseUp species={close} motion={(params.get("motion") ?? "idle") as PokemonAction} mood={(params.get("mood") ?? "dex") as LightingMood} /> : <ContactSheet params={params} />;
}

function CloseUp({ species: name, motion, mood }: { species: string; motion: PokemonAction; mood: LightingMood }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const model = POKEMON_MODELS[name];
    if (model) loadPokemonModel(model.number).then(() => setTimeout(() => setReady(true), 1500));
  }, [name]);
  const size = 420;
  return <div data-ready={ready} style={{ position: "relative", width: size * VIEWS.length, height: size, fontFamily: "system-ui, sans-serif" }}>
    <Canvas orthographic dpr={1} frameloop="always" shadows style={{ width: size * VIEWS.length, height: size }} camera={{ position: [0, 0.75, 20], zoom: size / 2.5, near: 0.1, far: 100 }}>
      <color attach="background" args={["#1d2733"]} />
      <PokemonLighting mood={mood} />
      {VIEWS.map(({ label, turn }, index) => <group key={label} position={[(index - 1) * 2.5, -0.15, 0]} rotation={[0.12, turn, 0]}>
        <PokemonModel species={name} fitPreview animation={motion} />
      </group>)}
    </Canvas>
    {VIEWS.map(({ label }, index) => <span key={label} style={{ position: "absolute", left: index * size + 8, top: 6, color: "#cfd8e3", fontSize: 12 }}>{name} · {motion} · {label}</span>)}
  </div>;
}

function ContactSheet({ params }: { params: URLSearchParams }) {
  const sheet = Math.max(1, Number(params.get("sheet") ?? 1));
  const motion = params.get("motion") as PokemonAction | null;
  const mood = (params.get("mood") ?? "dex") as LightingMood;
  const page = species.slice((sheet - 1) * COLUMNS * ROWS, sheet * COLUMNS * ROWS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    // PokemonModel reads the same cache; give it a moment to clone, rig and draw.
    Promise.all(page.map(([, model]) => loadPokemonModel(model.number)))
      .then(() => new Promise(resolve => setTimeout(resolve, 1500)))
      .then(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [sheet]); // eslint-disable-line react-hooks/exhaustive-deps
  const width = COLUMNS * PIXELS, height = ROWS * PIXELS;
  const cellCentre = (index: number): [number, number, number] => [
    ((index % COLUMNS) - (COLUMNS - 1) / 2) * CELL,
    ((ROWS - 1) / 2 - Math.floor(index / COLUMNS)) * CELL - 0.8,
    0,
  ];
  return <div data-ready={ready} style={{ position: "relative", width, height, fontFamily: "system-ui, sans-serif" }}>
    <Canvas orthographic dpr={1} frameloop="always" style={{ width, height }} camera={{ position: [0, 0, 20], zoom: PIXELS / CELL, near: 0.1, far: 100 }}>
      <color attach="background" args={["#1d2733"]} />
      <PokemonLighting mood={mood} />
      {page.map(([name], index) => <group key={name} position={cellCentre(index)} rotation={[0.2, 0.35, 0]}>
        <PokemonModel species={name} fitPreview animation={motion ?? "idle"} paused={!motion} attackEffects={false} />
      </group>)}
    </Canvas>
    {page.map(([name, model], index) => <span key={name} style={{ position: "absolute", left: (index % COLUMNS) * PIXELS + 6, top: Math.floor(index / COLUMNS) * PIXELS + 4, color: "#cfd8e3", fontSize: 12 }}>
      #{model.number} {name}
    </span>)}
  </div>;
}
