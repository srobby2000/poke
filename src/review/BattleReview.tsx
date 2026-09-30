import { useState } from "react";
import type { BattleArena } from "../game/battleArenas";
import type { BattleSpeed } from "../game/progress";
import { TurnBattle } from "../components/TurnBattleScreen";

const noop = () => {};

/** A battle with fixed teams, for reviewing arenas and the battle screen:
 * /review.html?battle=forest (grass, forest, mountain, water, cave, stadium); `&wild=1` for a wild one. */
export function BattleReview({ arena, wild }: { arena: BattleArena; wild: boolean }) {
  const [speed, setSpeed] = useState<BattleSpeed>(1);
  return <TurnBattle
    allyIds={["charmander", "squirtle", "bulbasaur"]} stage={3} battleMode={wild ? "wild" : "ladder"} arena={arena}
    battleSpeed={speed} onBattleSpeedChange={setSpeed}
    wild={wild ? { speciesId: "oddish", level: 5, balls: { "poke-ball": 3 } } : undefined}
    speciesStats={null} allyLevels={{}} evolutionChoices={{}} heldItems={{}} usePokeApiRates={false} usePokeApiMovesets={false} moveData={null}
    items={{ potion: 2 }} onItemUsed={noop} onBattleCleared={noop} onWildEnd={noop} onRetry={noop} onChangeTeam={noop} onBackToLobby={noop} />;
}
