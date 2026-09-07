import type { ApiMoveData, PokemonBaseStats } from "./battleState";
import { speciesNames } from "./battleState";

const CACHE_KEY = "creature-masters-pokeapi-v6";
const MOVE_CACHE_KEY = "creature-masters-pokeapi-moves-v2";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PokeApiStatEntry = { base_stat: number; stat: { name: string } };
export type PokeApiPokemon = {
  id?: number; // national dex number
  stats: PokeApiStatEntry[];
  types?: { slot: number; type: { name: string } }[];
  height?: number; // decimetres
  weight?: number; // hectograms
  base_experience?: number | null;
  sprites?: {
    front_default?: string | null;
    other?: { "official-artwork"?: { front_default?: string | null } };
  };
};

export function mapPokeApiTypes(pokemon: PokeApiPokemon): string[] {
  return (pokemon.types ?? [])
    .slice()
    .sort((left, right) => left.slot - right.slot)
    .map((entry) => entry.type.name);
}

export type PokeApiSpecies = {
  capture_rate?: number;
  growth_rate?: { name: string } | null;
  habitat?: { name: string } | null;
  genera?: { genus: string; language: { name: string } }[];
  flavor_text_entries?: { flavor_text: string; language: { name: string } }[];
  evolution_chain?: { url: string } | null;
};

type PokeApiChainNode = {
  species: { name: string };
  evolution_details: {
    min_level?: number | null;
    trigger?: { name: string } | null;
    item?: { name: string } | null;
  }[];
  evolves_to: PokeApiChainNode[];
};
export type PokeApiEvolutionChain = { chain: PokeApiChainNode };

// One step in an evolution line: which species it becomes and how.
export type EvolutionLink = { to: string; minLevel: number | null; trigger: string; item: string | null };

// Flattens a PokeAPI evolution-chain tree into per-species links.
export function parseEvolutionChain(chain: PokeApiEvolutionChain): Record<string, EvolutionLink[]> {
  const links: Record<string, EvolutionLink[]> = {};
  const walk = (node: PokeApiChainNode) => {
    for (const child of node.evolves_to) {
      const detail = child.evolution_details[0];
      (links[node.species.name] ??= []).push({
        to: child.species.name,
        minLevel: detail?.min_level ?? null,
        trigger: detail?.trigger?.name ?? "level-up",
        item: detail?.item?.name ?? null,
      });
      walk(child);
    }
  };
  walk(chain.chain);
  return links;
}

// Per-species flavor + tuning data used by the Pokédex and (optionally) the
// capture and XP systems. Best-effort — none of it is required to play.
export type SpeciesDetail = {
  number: number; // national dex number
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
  types: Record<string, string[]>;
  // Per-species evolution links (the to-side keyed by the from-species name).
  evolutions: Record<string, EvolutionLink[]>;
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
    number: pokemon.id ?? 0,
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
    return {
      stats: payload.stats,
      sprites: payload.sprites ?? {},
      details: payload.details ?? {},
      types: payload.types ?? {},
      evolutions: payload.evolutions ?? {},
    };
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

export type PokeApiMove = {
  type?: { name: string };
  power?: number | null;
  meta?: { ailment?: { name: string } | null } | null;
  stat_changes?: { change: number; stat: { name: string } }[];
};

export function mapPokeApiMove(payload: PokeApiMove): ApiMoveData {
  const ailment = payload.meta?.ailment?.name;
  return {
    type: payload.type?.name ?? "",
    power: payload.power ?? null,
    // PokeAPI uses "none" for moves with no ailment.
    ailment: ailment && ailment !== "none" ? ailment : null,
    statChanges: (payload.stat_changes ?? []).map((entry) => ({ stat: entry.stat.name, change: entry.change })),
  };
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
      // Detail (and the evolution-chain link) come from a second endpoint.
      const species = await fetchJson<PokeApiSpecies>(`https://pokeapi.co/api/v2/pokemon-species/${name}`);
      return {
        name,
        stats: mapPokeApiStats(pokemon),
        sprite: mapPokeApiSprite(pokemon),
        types: mapPokeApiTypes(pokemon),
        detail: species ? mapPokeApiDetail(pokemon, species) : null,
        chainUrl: species?.evolution_chain?.url ?? null,
      };
    }),
  );

  const data: SpeciesData = { stats: {}, sprites: {}, details: {}, types: {}, evolutions: {} };
  const chainUrls = new Set<string>();
  for (const entry of entries) {
    data.stats[entry.name] = entry.stats;
    if (entry.sprite) {
      data.sprites[entry.name] = entry.sprite;
    }
    if (entry.types.length > 0) {
      data.types[entry.name] = entry.types;
    }
    if (entry.detail) {
      data.details[entry.name] = entry.detail;
    }
    if (entry.chainUrl) {
      chainUrls.add(entry.chainUrl);
    }
  }

  // Fetch each distinct evolution chain once and flatten it into links.
  const chains = await Promise.all([...chainUrls].map((url) => fetchJson<PokeApiEvolutionChain>(url)));
  for (const chain of chains) {
    if (chain) {
      Object.assign(data.evolutions, parseEvolutionChain(chain));
    }
  }

  writeCache(data);
  return data;
}

// Loads the full Generation I Pokédex (all 151) — stats, sprites, detail,
// types, and evolutions — for the Pokédex. Falls back to the bundled roster
// species list if the generation index can't be fetched (offline).
export async function fetchGen1Pokedex(): Promise<SpeciesData> {
  const index = await fetchJson<{ pokemon_species: { name: string }[] }>(
    "https://pokeapi.co/api/v2/generation/1",
  );
  const names = index?.pokemon_species.map((entry) => entry.name) ?? speciesNames;
  return fetchSpeciesData(names);
}

const moveAliases: Record<string, string> = {
  "vulpix-ember": "ember",
  "meowth-growl": "growl",
  "lapras-water-pulse": "water-pulse",
  "pidgey-tackle": "tackle",
  "pidgey-gust": "gust",
  "rattata-quick-attack": "quick-attack",
};

export function canonicalMoveName(id: string): string {
  return moveAliases[id] ?? id;
}

type MoveCachePayload = { fetchedAt: number; moves: Record<string, ApiMoveData> };

// Fetches normalized data for the given move ids, cached for a week. Best-effort
// per move (a missing one is simply not overridden in battle).
export async function fetchMoveData(ids: string[]): Promise<Record<string, ApiMoveData>> {
  try {
    const raw = globalThis.localStorage?.getItem(MOVE_CACHE_KEY);
    if (raw) {
      const payload = JSON.parse(raw) as MoveCachePayload;
      if (Date.now() - payload.fetchedAt <= CACHE_TTL_MS && ids.every((id) => payload.moves[id])) {
        return payload.moves;
      }
    }
  } catch {
    // Ignore cache read failures and refetch.
  }

  // Battle ids distinguish species variants; the API accepts canonical moves.
  const requests = new Map<string, Promise<PokeApiMove | null>>();
  const entries = await Promise.all(ids.map(async id => {
    const name = canonicalMoveName(id);
    let request = requests.get(name);
    if (!request) {
      request = fetchJson<PokeApiMove>(`https://pokeapi.co/api/v2/move/${name}`);
      requests.set(name, request);
    }
    return [id, await request] as const;
  }));
  const moves: Record<string, ApiMoveData> = {};
  for (const [id, payload] of entries) {
    if (payload) {
      moves[id] = mapPokeApiMove(payload);
    }
  }

  try {
    const payload: MoveCachePayload = { fetchedAt: Date.now(), moves };
    globalThis.localStorage?.setItem(MOVE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable; data still returned for this session.
  }
  return moves;
}
