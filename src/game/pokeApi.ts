import type { PokemonBaseStats } from "./battleState";

const CACHE_KEY = "creature-masters-pokeapi-v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PokeApiStatEntry = { base_stat: number; stat: { name: string } };
export type PokeApiPokemon = { stats: PokeApiStatEntry[] };

// The battle model has a single offensive stat, so attack is the better of the
// physical and special attacking stats — the same rule the bundled fallback
// data in battleState.ts uses, keeping live and offline battles identical.
export function mapPokeApiStats(payload: PokeApiPokemon): PokemonBaseStats {
  const statOf = (name: string) => payload.stats.find((entry) => entry.stat.name === name)?.base_stat ?? 0;
  return {
    hp: statOf("hp"),
    attack: Math.max(statOf("attack"), statOf("special-attack")),
    defense: statOf("defense"),
    speed: statOf("speed"),
  };
}

type CachePayload = { fetchedAt: number; stats: Record<string, PokemonBaseStats> };

function readCache(names: string[]): Record<string, PokemonBaseStats> | null {
  try {
    const raw = globalThis.localStorage?.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const payload = JSON.parse(raw) as CachePayload;
    if (Date.now() - payload.fetchedAt > CACHE_TTL_MS) {
      return null;
    }
    if (!names.every((name) => payload.stats[name])) {
      return null;
    }
    return payload.stats;
  } catch {
    return null;
  }
}

function writeCache(stats: Record<string, PokemonBaseStats>) {
  try {
    const payload: CachePayload = { fetchedAt: Date.now(), stats };
    globalThis.localStorage?.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage may be full or unavailable; the fetch still succeeded.
  }
}

export async function fetchSpeciesStats(names: string[]): Promise<Record<string, PokemonBaseStats>> {
  const cached = readCache(names);
  if (cached) {
    return cached;
  }

  const entries = await Promise.all(
    names.map(async (name) => {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
      if (!response.ok) {
        throw new Error(`PokeAPI returned ${response.status} for ${name}`);
      }
      const payload = (await response.json()) as PokeApiPokemon;
      return [name, mapPokeApiStats(payload)] as const;
    }),
  );

  const stats = Object.fromEntries(entries);
  writeCache(stats);
  return stats;
}
