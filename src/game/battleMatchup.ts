import type { Unit } from "./battleState";
import { getTypeEffectiveness } from "./battleTypeChart";

export type MatchupVerdict = "advantage" | "disadvantage" | "even";
export type Matchup = {
  verdict: MatchupVerdict;
  /** Best multiplier among this Pokémon's damaging moves against the foe. */
  offense: number;
  /** Worst multiplier the foe's own types deal to this Pokémon (its likely attacks). */
  defense: number;
  reason: string;
};

const FRACTIONS: Record<number, string> = { 0: "0", 0.25: "¼", 0.5: "½" };
const multiplier = (value: number) => `×${FRACTIONS[value] ?? value}`;

// Doubling counts as one step; immunity counts as two.
const steps = (multiplier: number) => (multiplier === 0 ? -2 : Math.log2(multiplier));

/** How a Pokémon would fare switched in against `foe`: what it can hit for, and what the foe's
 * types would hit it for. The foe's types are what the player can see, as in the main series. */
export function switchMatchup(member: Unit, foe: Unit): Matchup {
  const damaging = member.moves.filter(move => move.power > 0);
  const offense = damaging.length ? Math.max(...damaging.map(move => getTypeEffectiveness(move.type, foe.types))) : 1;
  const defense = Math.max(...foe.types.map(type => getTypeEffectiveness(type, member.types)));
  const score = steps(offense) - steps(defense);
  const verdict: MatchupVerdict = score > 0 ? "advantage" : score < 0 ? "disadvantage" : "even";
  return { verdict, offense, defense, reason: `Deals ${multiplier(offense)} · takes ${multiplier(defense)}` };
}
