import type { PokemonBaseStats } from "./battleState";

const CACHE_KEY = "creature-masters-pokeapi-v3";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PokeApiStatEntry = { base_stat: number; stat: { name: string } };
export type PokeApiPokemon = {
  stats: PokeApiStatEntry[];
  height?: number; // decimetres
  weight?: number; // hectograms
  base_experience?: number | null;
  sprites?: {
    front_default?: string | null;
    other?: { "official-artwork"?: { front_default?: string | null } };
  };
};

export type PokeApiSpecies = {
  capture_rate?: number;
  growth_rate?: { name: string } | null;
  habitat?: { name: string } | null;
  genera?: { genus: string; language: { name: string } }[];
  flavor_text_entries?: { flavor_text: string; language: { name: string } }[];
};

// Per-species flavor + tuning data used by the Pokédex and (optionally) the
// capture and XP systems. Best-effort — none of it is required to play.
export type SpeciesDetail = {
  heightM: number;
  weightKg: number;
  baseExperience: number;
  flavorText: string;
  genus: string;
  habitat: string | null;
  captureRate: number;
  growthRate: string;
};

export type SpeciesData = {
  stats: Record<string, PokemonBaseStats>;
  sprites: Record<string, string>;
  details: Record<string, SpeciesDetail>;
};

// Prefer the high-res official artwork, falling back to the classic sprite.
export function mapPokeApiSprite(payload: PokeApiPokemon): string | null {
  return payload.sprites?.other?.["official-artwork"]?.front_default ?? payload.sprites?.front_default ?? null;
}

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

function pickEnglish<T extends { language: { name: string } }>(entries: T[] | undefined): T | undefined {
  return entries?.find((entry) => entry.language.name === "en") ?? entries?.[0];
}

export function mapPokeApiDetail(pokemon: PokeApiPokemon, species: PokeApiSpecies): SpeciesDetail {
  const flavor = pickEnglish(species.flavor_text_entries)?.flavor_text ?? "";
  return {
    heightM: (pokemon.height ?? 0) / 10,
    weightKg: (pokemon.weight ?? 0) / 10,
    baseExperience: pokemon.base_experience ?? 0,
    // PokeAPI flavor text is padded with control characters.
    flavorText: flavor.replace(/[\n\f\r]/g, " ").trim(),
    genus: pickEnglish(species.genera)?.genus ?? "",
    habitat: species.habitat?.name ?? null,
    captureRate: species.capture_rate ?? 0,
    growthRate: species.growth_rate?.name ?? "medium",
  };
}

type CachePayload = { fetchedAt: number } & SpeciesData;

function readCache(names: string[]): SpeciesData | null {
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
    return { stats: payload.stats, sprites: payload.sprites ?? {}, details: payload.details ?? {} };
  } catch {
    return null;
  }
}

function writeCache(data: SpeciesData) {
  try {
    const payload: CachePayload = { fetchedAt: Date.now(), ...data };
    globalThis.localStorage?.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage may be full or unavailable; the fetch still succeeded.
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

// Fetches base stats, sprite art, and flavor/tuning detail for each species,
// cached for a week. Stats drive battles (with an identical bundled fallback);
// sprites and details feed the Pokédex and optional capture/XP tuning.
export async function fetchSpeciesData(names: string[]): Promise<SpeciesData> {
  const cached = readCache(names);
  if (cached) {
    return cached;
  }

  const entries = await Promise.all(
    names.map(async (name) => {
      const pokemon = await fetchJson<PokeApiPokemon>(`https://pokeapi.co/api/v2/pokemon/${name}`);
      if (!pokemon) {
        throw new Error(`PokeAPI returned no data for ${name}`);
      }
      // Detail comes from a second endpoint and is best-effort.
      const species = await fetchJson<PokeApiSpecies>(`https://pokeapi.co/api/v2/pokemon-species/${name}`);
      return {
        name,
        stats: mapPokeApiStats(pokemon),
        sprite: mapPokeApiSprite(pokemon),
        detail: species ? mapPokeApiDetail(pokemon, species) : null,
      };
    }),
  );

  const data: SpeciesData = { stats: {}, sprites: {}, details: {} };
  for (const entry of entries) {
    data.stats[entry.name] = entry.stats;
    if (entry.sprite) {
      data.sprites[entry.name] = entry.sprite;
    }
    if (entry.detail) {
      data.details[entry.name] = entry.detail;
    }
  }
  writeCache(data);
  return data;
}
