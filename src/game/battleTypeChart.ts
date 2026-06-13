import type { PokemonType } from "./battleState";

type TypeRelation = {
  doubleDamageTo?: PokemonType[];
  halfDamageTo?: PokemonType[];
  noDamageTo?: PokemonType[];
};

// Full main-series attacking type chart (gen 6+).
const typeRelations: Record<PokemonType, TypeRelation> = {
  normal: {
    halfDamageTo: ["rock", "steel"],
    noDamageTo: ["ghost"],
  },
  fire: {
    doubleDamageTo: ["grass", "ice", "bug", "steel"],
    halfDamageTo: ["fire", "water", "rock", "dragon"],
  },
  water: {
    doubleDamageTo: ["fire", "ground", "rock"],
    halfDamageTo: ["water", "grass", "dragon"],
  },
  electric: {
    doubleDamageTo: ["water", "flying"],
    halfDamageTo: ["electric", "grass", "dragon"],
    noDamageTo: ["ground"],
  },
  grass: {
    doubleDamageTo: ["water", "ground", "rock"],
    halfDamageTo: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
  },
  ice: {
    doubleDamageTo: ["grass", "ground", "flying", "dragon"],
    halfDamageTo: ["fire", "water", "ice", "steel"],
  },
  fighting: {
    doubleDamageTo: ["normal", "ice", "rock", "dark", "steel"],
    halfDamageTo: ["poison", "flying", "psychic", "bug", "fairy"],
    noDamageTo: ["ghost"],
  },
  poison: {
    doubleDamageTo: ["grass", "fairy"],
    halfDamageTo: ["poison", "ground", "rock", "ghost"],
    noDamageTo: ["steel"],
  },
  ground: {
    doubleDamageTo: ["fire", "electric", "poison", "rock", "steel"],
    halfDamageTo: ["grass", "bug"],
    noDamageTo: ["flying"],
  },
  flying: {
    doubleDamageTo: ["grass", "fighting", "bug"],
    halfDamageTo: ["electric", "rock", "steel"],
  },
  psychic: {
    doubleDamageTo: ["fighting", "poison"],
    halfDamageTo: ["psychic", "steel"],
    noDamageTo: ["dark"],
  },
  bug: {
    doubleDamageTo: ["grass", "psychic", "dark"],
    halfDamageTo: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
  },
  rock: {
    doubleDamageTo: ["fire", "ice", "flying", "bug"],
    halfDamageTo: ["fighting", "ground", "steel"],
  },
  ghost: {
    doubleDamageTo: ["psychic", "ghost"],
    halfDamageTo: ["dark"],
    noDamageTo: ["normal"],
  },
  dragon: {
    doubleDamageTo: ["dragon"],
    halfDamageTo: ["steel"],
    noDamageTo: ["fairy"],
  },
  dark: {
    doubleDamageTo: ["psychic", "ghost"],
    halfDamageTo: ["fighting", "dark", "fairy"],
  },
  steel: {
    doubleDamageTo: ["ice", "rock", "fairy"],
    halfDamageTo: ["fire", "water", "electric", "steel"],
  },
  fairy: {
    doubleDamageTo: ["fighting", "dragon", "dark"],
    halfDamageTo: ["fire", "poison", "steel"],
  },
};

export function getTypeEffectiveness(moveType: PokemonType, targetTypes: PokemonType[]) {
  const relations = typeRelations[moveType];
  return targetTypes.reduce((multiplier, targetType) => {
    if (relations?.noDamageTo?.includes(targetType)) {
      return multiplier * 0;
    }
    if (relations?.doubleDamageTo?.includes(targetType)) {
      return multiplier * 2;
    }
    if (relations?.halfDamageTo?.includes(targetType)) {
      return multiplier * 0.5;
    }
    return multiplier;
  }, 1);
}
