export type LightingMood = "dex" | "world" | "cave" | "battle" | "lobby";

// One key/fill/ambient balance for every scene that shows Pokémon, so a skin reads the same in
// the Pokédex, the world, battles and the lobby. Moods change only tint, key direction, shadows
// and (in caves) how much ambient light there is. The balance is the overworld's.
const BALANCE = { ambient: 0.95, hemisphere: 0.8, key: 1.9 };
const MOODS: Record<LightingMood, { sky: string; ground: string; key: [number, number, number]; shadows: boolean; ambient?: number }> = {
  dex: { sky: "#d4f0ff", ground: "#8a819b", key: [3, 5, 5], shadows: false },
  world: { sky: "#e5f2df", ground: "#7a715b", key: [-6, 12, 6], shadows: true },
  cave: { sky: "#e5f2df", ground: "#7a715b", key: [-6, 12, 6], shadows: true, ambient: 0.65 },
  battle: { sky: "#e9f6ff", ground: "#6f8f55", key: [4, 9, 6], shadows: true },
  lobby: { sky: "#dcf7ff", ground: "#51705c", key: [3, 7, 5], shadows: true },
};

export function PokemonLighting({ mood }: { mood: LightingMood }) {
  const { sky, ground, key, shadows, ambient = BALANCE.ambient } = MOODS[mood];
  return <>
    <ambientLight intensity={ambient} />
    <hemisphereLight args={[sky, ground, BALANCE.hemisphere]} />
    <directionalLight castShadow={shadows} position={key} intensity={BALANCE.key} shadow-mapSize={[1024, 1024]} />
  </>;
}
