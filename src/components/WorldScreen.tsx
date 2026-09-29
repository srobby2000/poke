import { RIDE_POKEMON, type RideSpecies } from "../game/riding";
import { Suspense, lazy, useEffect, useReducer, useRef, useState } from "react";
import type { TileKind, WorldMap } from "../game/maps";
import type { PlayerProgress } from "../game/progress";
import type { TrainerChallenge, WildEncounter, WorldInteraction } from "../game/worldState";
import { createInitialWorldState, worldReducer } from "../game/worldState";

const LOGIC_STEP_SECONDS = 1 / 30;
const MAX_DELTA_SECONDS = 0.08;
const POSITION_SAVE_INTERVAL_MS = 8000;

const preloadWorldCanvas = () => import("./WorldCanvas");
const WorldCanvas = lazy(() => preloadWorldCanvas().then((module) => ({ default: module.WorldCanvas })));

type WorldScreenProps = {
  progress: PlayerProgress;
  pickedBerries: string[];
  rematchedToday: string[];
  onEnterBuilding: (building: string) => void;
  onSavePosition: (position: { mapId: string; x: number; z: number }) => void;
  onPickBerry: (tileKey: string) => string;
  onStartWild: (encounter: WildEncounter) => void;
  onStartTrainer: (trainer: TrainerChallenge) => void;
  onOpenPokedex: () => void;
  onOpenSettings: () => void;
  onOpenTeam: () => void;
};

function promptFor(nearby: WorldInteraction): string {
  if (nearby.kind === "door") {
    return `Enter ${nearby.label}`;
  }
  if (nearby.kind === "npc") {
    return `Talk to ${nearby.name}`;
  }
  if (nearby.kind === "trainer") {
    return `Challenge ${nearby.name}`;
  }
  if (nearby.kind === "water") {
    return "Fish";
  }
  return "Check berry tree";
}

export function WorldScreen({
  progress,
  pickedBerries,
  rematchedToday,
  onEnterBuilding,
  onSavePosition,
  onPickBerry,
  onStartWild,
  onStartTrainer,
  onOpenPokedex,
  onOpenSettings,
  onOpenTeam,
}: WorldScreenProps) {
  const [world, dispatch] = useReducer(worldReducer, undefined, () =>
    createInitialWorldState(progress.worldPosition, undefined, progress.defeatedTrainers, rematchedToday),
  );

  const [selectedRide, setSelectedRide] = useState<RideSpecies>("arcanine");
  const rideChoiceRef = useRef(selectedRide);
  useEffect(() => { rideChoiceRef.current = selectedRide; }, [selectedRide]);
  const worldRef = useRef(world);
  useEffect(() => {
    worldRef.current = world;
  }, [world]);

  // Kept in a ref so the one-time keyboard listener always calls the latest handler.
  const openPokedexRef = useRef(onOpenPokedex);
  useEffect(() => {
    openPokedexRef.current = onOpenPokedex;
  }, [onOpenPokedex]);

  // Fixed-rate logic tick, same pattern as the battle loop.
  useEffect(() => {
    let last = performance.now();
    let accumulated = 0;
    let frame = 0;

    const run = (now: number) => {
      accumulated += Math.min((now - last) / 1000, MAX_DELTA_SECONDS);
      last = now;
      while (accumulated >= LOGIC_STEP_SECONDS) {
        dispatch({ type: "tick", deltaSeconds: LOGIC_STEP_SECONDS });
        accumulated -= LOGIC_STEP_SECONDS;
      }
      frame = requestAnimationFrame(run);
    };

    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Keyboard: WASD/arrows steer, E/Enter interacts, Escape closes dialogue.
  useEffect(() => {
    const pressed = new Set<string>();

    const dispatchVector = () => {
      const x = (pressed.has("d") || pressed.has("arrowright") ? 1 : 0) - (pressed.has("a") || pressed.has("arrowleft") ? 1 : 0);
      const z = (pressed.has("s") || pressed.has("arrowdown") ? 1 : 0) - (pressed.has("w") || pressed.has("arrowup") ? 1 : 0);
      dispatch({ type: "setMoveInput", x, z });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (event.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName)) return;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        if (!pressed.has(key)) {
          pressed.add(key);
          dispatchVector();
        }
      } else if ((key === "e" || key === "enter") && !event.repeat) {
        dispatch({ type: "interact" });
      } else if (key === "r" && !event.repeat) {
        dispatch({ type: "setRide", species: worldRef.current.ride ? null : rideChoiceRef.current });
      } else if (key === "b" && !event.repeat) {
        openPokedexRef.current();
      } else if (key === "escape") {
        dispatch({ type: "dismissMessage" });
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (pressed.has(key)) {
        pressed.delete(key);
        dispatchVector();
      }
    };

    const onBlur = () => { pressed.clear(); dispatchVector(); };
    window.addEventListener("blur", onBlur);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Entering a building hands control back to the App screen flow.
  useEffect(() => {
    if (world.enteredBuilding) {
      const building = world.enteredBuilding;
      onSavePosition({ mapId: world.map.id, x: world.x, z: world.z });
      dispatch({ type: "clearEntry" });
      onEnterBuilding(building);
    }
  }, [world.enteredBuilding, world.map.id, world.x, world.z, onEnterBuilding, onSavePosition]);

  // Checking a berry tree resolves against the save file in App, which
  // reports back what (if anything) was picked.
  useEffect(() => {
    if (world.berryTarget) {
      const text = onPickBerry(world.berryTarget);
      dispatch({ type: "clearBerryTarget" });
      dispatch({ type: "showMessage", text });
    }
  }, [world.berryTarget, onPickBerry]);

  // A rolled encounter pauses the world and launches a wild battle.
  const encounterStartedRef = useRef(false);
  useEffect(() => {
    if (world.encounter && !encounterStartedRef.current) {
      encounterStartedRef.current = true;
      onSavePosition({ mapId: world.map.id, x: world.x, z: world.z });
      onStartWild(world.encounter);
    }
  }, [world.encounter, world.map.id, world.x, world.z, onSavePosition, onStartWild]);

  // Challenging an overworld trainer pauses the world and launches the battle.
  const trainerStartedRef = useRef(false);
  useEffect(() => {
    if (world.trainerBattle && !trainerStartedRef.current) {
      trainerStartedRef.current = true;
      onSavePosition({ mapId: world.map.id, x: world.x, z: world.z });
      onStartTrainer(world.trainerBattle);
    }
  }, [world.trainerBattle, world.map.id, world.x, world.z, onSavePosition, onStartTrainer]);

  // Stepping onto a warp tile saves the destination and transitions the map.
  useEffect(() => {
    if (world.pendingWarp) {
      const { toMap, toX, toZ } = world.pendingWarp;
      onSavePosition({ mapId: toMap, x: toX, z: toZ });
      dispatch({ type: "warp", toMap, toX, toZ });
    }
  }, [world.pendingWarp, onSavePosition]);

  // Periodic position save so refreshes resume where you stood.
  useEffect(() => {
    const interval = setInterval(() => {
      const current = worldRef.current;
      onSavePosition({ mapId: current.map.id, x: current.x, z: current.z });
    }, POSITION_SAVE_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      const current = worldRef.current;
      onSavePosition({ mapId: current.map.id, x: current.x, z: current.z });
    };
  }, [onSavePosition]);

  return (
    <main className="app-shell">
      <Suspense fallback={<div className="canvas-loading">Loading world…</div>}>
        <WorldCanvas state={world} pickedBerries={pickedBerries} />
      </Suspense>

      <div className="hud-layer world-hud">
        <section className="top-strip" aria-label="Village status">
          <div className="objective-chip">
            <strong>{world.map.name}</strong>
            <span>{world.map.dungeon ? world.map.dungeon.subtitle : world.map.id === "village" ? "Explore, then enter the Arena" : "Beat the trainers, catch the wild ones"}</span>
          </div>
          <span className="gems-chip">💎 {progress.gems}</span>
          <button className="control-chip world-team-button" onClick={onOpenTeam}>
            🛡️ Team
          </button>
          <button className="control-chip world-pokedex-button" onClick={onOpenPokedex}>
            📕 Pokédex <kbd>B</kbd>
          </button>
          <button className="control-chip world-settings-button" onClick={onOpenSettings} aria-label="Settings">
            ⚙️
          </button>
          <div className="control-chip world-hint">
            <span>WASD move · E interact · R ride</span>
          </div>
        </section>

        <section className="world-ride-panel" aria-label="Trail Pokémon">
          <span className="world-ride-caption">TRAIL POKÉMON · FREE LOAN</span>
          <div className="world-ride-controls">
            <select aria-label="Choose ride Pokémon" value={selectedRide} onChange={event => {
              const species = event.target.value as RideSpecies;
              setSelectedRide(species);
              if (world.ride) dispatch({ type: "setRide", species });
            }}>
              {Object.entries(RIDE_POKEMON).map(([species, ride]) => <option key={species} value={species}>{ride.name} · {ride.speed}× speed</option>)}
            </select>
            <button onClick={() => dispatch({ type: "setRide", species: world.ride ? null : selectedRide })}>
              {world.ride ? "Dismount" : "Ride"} <kbd>R</kbd>
            </button>
          </div>
          <small>{world.ride ? `Riding ${RIDE_POKEMON[world.ride].name}` : "Choose a partner to travel faster"}</small>
        </section>
        {world.map.dungeon && <div className="dungeon-floor-strip" aria-label="Dungeon depth">
          <span>CRYSTAL CAVE</span>
          {[1, 2, 3].map(floor => <span key={floor} className={floor === world.map.dungeon?.floor ? "current-floor" : ""} aria-current={floor === world.map.dungeon?.floor ? "step" : undefined}>B{floor}</span>)}
          <small>Walk onto stairs to change floors</small>
        </div>}

        <Minimap map={world.map} x={world.x} z={world.z} />

        {world.nearby && !world.message ? (
          <div className="world-prompt">
            <kbd>E</kbd> {promptFor(world.nearby)}
          </div>
        ) : null}

        {world.message ? (
          <div className="world-dialogue" role="dialog" aria-live="polite">
            <p>{world.message}</p>
            <button onClick={() => dispatch({ type: "dismissMessage" })}>OK</button>
          </div>
        ) : null}

        <Joystick onMove={(x, z) => dispatch({ type: "setMoveInput", x, z })} />

        {world.nearby ? (
          <button className="world-interact-button" onClick={() => dispatch({ type: "interact" })}>
            {promptFor(world.nearby)}
          </button>
        ) : null}
      </div>
    </main>
  );
}

const MINIMAP_SCALE = 4;

const MINIMAP_COLORS: Record<TileKind, string> = {
  path: "#5a6b80",
  grass: "#2f6e4f",
  tallgrass: "#1f5c3c",
  tree: "#16241d",
  water: "#1d5f8a",
  wall: "#8c5b5b",
  door: "#d9a066",
  fence: "#7c5f46",
  berry: "#b91c1c",
  npc: "#fbbf24",
  warp: "#a855f7",
  trainer: "#f97316",
};

function Minimap({ map, x, z }: { map: WorldMap; x: number; z: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    map.tiles.forEach((row, tileZ) => {
      row.forEach((kind, tileX) => {
        context.fillStyle = MINIMAP_COLORS[kind];
        context.fillRect(tileX * MINIMAP_SCALE, tileZ * MINIMAP_SCALE, MINIMAP_SCALE, MINIMAP_SCALE);
      });
    });
    context.fillStyle = "#78e1ff";
    context.beginPath();
    context.arc(x * MINIMAP_SCALE + MINIMAP_SCALE / 2, z * MINIMAP_SCALE + MINIMAP_SCALE / 2, MINIMAP_SCALE * 1.1, 0, Math.PI * 2);
    context.fill();
  }, [map, x, z]);

  return (
    <canvas
      ref={canvasRef}
      className="world-minimap"
      width={map.width * MINIMAP_SCALE}
      height={map.height * MINIMAP_SCALE}
      aria-label="Minimap"
    />
  );
}

const JOYSTICK_RADIUS = 44;

function Joystick({ onMove }: { onMove: (x: number, z: number) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointer = useRef<number | null>(null);

  const updateFromEvent = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    const scale = length > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / length : 1;
    const x = dx * scale;
    const y = dy * scale;
    setKnob({ x, y });
    onMove(x / JOYSTICK_RADIUS, y / JOYSTICK_RADIUS);
  };

  const release = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) {
      return;
    }
    activePointer.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      className="world-joystick"
      onPointerDown={(event) => {
        activePointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromEvent(event);
      }}
      onPointerMove={(event) => {
        if (activePointer.current === event.pointerId) {
          updateFromEvent(event);
        }
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="world-joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
