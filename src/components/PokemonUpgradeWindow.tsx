import type { getAllyOptions } from "../game/battleState";
import { BALANCE } from "../game/battleState";
import { levelOf, levelUpCost, xpInfo } from "../game/gacha";
import type { XpTuning } from "../game/gacha";
import { ITEMS, itemCount } from "../game/items";
import type { PlayerProgress } from "../game/progress";

type AllyOption = ReturnType<typeof getAllyOptions>[number];

type PokemonUpgradeWindowProps = {
  progress: PlayerProgress;
  options: AllyOption[];
  sprites: Record<string, string> | null;
  xpTuning?: XpTuning;
  onLevelUp: (allyId: string) => void;
  onChooseEvolution: (allyId: string, sourcePokemon: string) => void;
  onClose: () => void;
};

export function PokemonUpgradeWindow({
  progress,
  options,
  sprites,
  xpTuning,
  onLevelUp,
  onChooseEvolution,
  onClose,
}: PokemonUpgradeWindowProps) {
  const ownedOptions = options
    .filter((option) => progress.unlockedAllies.includes(option.id))
    .sort((left, right) => levelOf(progress, right.id) - levelOf(progress, left.id) || left.name.localeCompare(right.name));

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Pokemon upgrades" onClick={onClose}>
      <section className="modal-panel upgrade-modal" onClick={(event) => event.stopPropagation()}>
        <header className="upgrade-header">
          <div>
            <h2>Pokemon Upgrades</h2>
            <small>Spend gems here before choosing an Arena team.</small>
          </div>
          <span className="gems-chip">💎 {progress.gems}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close upgrades">
            ×
          </button>
        </header>
        <div className="upgrade-grid">
          {ownedOptions.map((option) => {
            const level = levelOf(progress, option.id);
            const cost = levelUpCost(level);
            const xp = xpInfo(progress, option.id, xpTuning);
            const sprite = sprites?.[option.spriteId];
            return (
              <article key={option.id} className="upgrade-card">
                <div className="select-sprite-frame">
                  {sprite ? <img src={sprite} alt="" className="select-sprite" /> : <span style={{ backgroundColor: option.color }} />}
                </div>
                <div>
                  <strong>{option.name}</strong>
                  <small>{option.types.join(" / ")}</small>
                  <em>
                    Lv {level}
                    {option.nextEvolutionLevel ? ` · evolves Lv ${option.nextEvolutionLevel}` : ""}
                  </em>
                </div>
                {xp.atMax ? null : (
                  <div
                    className="xp-bar"
                    role="progressbar"
                    aria-valuenow={xp.current}
                    aria-valuemax={xp.needed}
                    title={`${xp.current} / ${xp.needed} XP to next level`}
                  >
                    <span style={{ width: `${Math.min(100, Math.round((xp.current / xp.needed) * 100))}%` }} />
                    <small>
                      XP {xp.current}/{xp.needed}
                    </small>
                  </div>
                )}
                {option.evolutionChoices.length > 0 ? (
                  <div className="evolution-choice-grid" aria-label={`Choose ${option.id} evolution`}>
                    {option.evolutionChoices.map((choice) => {
                      const choiceSprite = sprites?.[choice.sourcePokemon];
                      const active = option.selectedEvolution === choice.sourcePokemon;
                      const committed = option.selectedEvolution != null;
                      const stone = choice.requiresStone ? ITEMS[choice.requiresStone] : null;
                      const stoneOwned = choice.requiresStone ? itemCount(progress, choice.requiresStone) : 0;
                      const lacksStone = stone != null && stoneOwned < 1;
                      // Once an ally has evolved, the choice is locked; stone evolutions
                      // also need the matching stone in the bag.
                      const disabled = (committed && !active) || (!committed && lacksStone);
                      return (
                        <button
                          key={choice.sourcePokemon}
                          type="button"
                          disabled={disabled}
                          className={`evolution-choice-button ${active ? "evolution-choice-button-active" : ""}`}
                          onClick={() => onChooseEvolution(option.id, choice.sourcePokemon)}
                        >
                          <span className="evolution-choice-sprite">
                            {choiceSprite ? <img src={choiceSprite} alt="" /> : <span style={{ backgroundColor: option.color }} />}
                          </span>
                          <span>
                            <strong>{choice.name}</strong>
                            <small>{(choice.types ?? option.types).join(" / ")}</small>
                            {stone ? (
                              <small className={`evolution-stone-req ${lacksStone && !active ? "evolution-stone-req-missing" : ""}`}>
                                {stone.name} ×{stoneOwned}
                              </small>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {level < BALANCE.maxAllyLevel ? (
                  <button className="level-button" disabled={progress.gems < cost} onClick={() => onLevelUp(option.id)}>
                    Level up — {cost} 💎
                  </button>
                ) : (
                  <small className="level-max">MAX</small>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
