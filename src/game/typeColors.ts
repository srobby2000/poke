import type { PokemonType } from "./battleState";

// Standard main-series type colors, for type chips and accents.
export const TYPE_COLORS: Record<PokemonType, string> = {
  normal: "#9fa19f",
  fire: "#e62829",
  water: "#2980ef",
  electric: "#fac000",
  grass: "#3fa129",
  ice: "#3dcef3",
  fighting: "#ff8000",
  poison: "#9141cb",
  ground: "#915121",
  flying: "#81b9ef",
  psychic: "#ef4179",
  bug: "#91a119",
  rock: "#afa981",
  ghost: "#704170",
  dragon: "#5060e1",
  dark: "#50413f",
  steel: "#60a1b8",
  fairy: "#ef70ef",
};

export function typeColor(type: string): string {
  return TYPE_COLORS[type as PokemonType] ?? "#6b7280";
}
