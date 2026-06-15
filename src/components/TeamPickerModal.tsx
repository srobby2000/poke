import { useState } from "react";
import type { PokemonBaseStats } from "../game/battleState";
import { DEFAULT_ALLY_IDS, getAllyOptions } from "../game/battleState";
import type { XpTuning } from "../game/gacha";
import { isHeldItem } from "../game/heldItems";
import type { PlayerProgress } from "../game/progress";
import { PokemonRosterSelect } from "./PokemonRosterSelect";

const TEAM_SIZE = 3;

type TeamPickerModalProps = {
  progress: PlayerProgress;
  speciesStats: Record<string, PokemonBaseStats> | null;
  sprites: Record<string, string> | null;
  xpTuning?: XpTuning;
  onEquipHeld?: (allyId: string, itemId: string | null) => void;
  onSave: (allyIds: string[]) => void;
  onClose: () => void;
};

// The team to seed the picker with: the saved active team (valid + unlocked
// entries), padded with the first available unlocked allies up to a full team.
function initialTeam(progress: PlayerProgress): string[] {
  const team: string[] = [];
  const candidates = [...progress.activeTeam, ...DEFAULT_ALLY_IDS, ...progress.unlockedAllies];
  for (const id of candidates) {
    if (team.length >= TEAM_SIZE) {
      break;
    }
    if (progress.unlockedAllies.includes(id) && !team.includes(id)) {
      team.push(id);
    }
  }
  return team;
}

export function TeamPickerModal({
  progress,
  speciesStats,
  sprites,
  xpTuning,
  onEquipHeld,
  onSave,
  onClose,
}: TeamPickerModalProps) {
  const options = getAllyOptions(speciesStats ?? undefined, progress.allyLevels, progress.evolutionChoices);
  const ownedHeldItems = Object.keys(progress.inventory).filter(
    (id) => isHeldItem(id) && (progress.inventory[id] ?? 0) > 0,
  );
  const [selected, setSelected] = useState<string[]>(() => initialTeam(progress));

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : current.length < TEAM_SIZE ? [...current, id] : current,
    );

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Set active team" onClick={onClose}>
      <section className="modal-panel team-picker-modal" onClick={(event) => event.stopPropagation()}>
        <PokemonRosterSelect
          progress={progress}
          options={options}
          sprites={sprites}
          selected={selected}
          teamSize={TEAM_SIZE}
          title="Active Team"
          summary="Used for wild encounters and overworld trainer battles."
          startLabel="Save Team"
          backLabel="← Close"
          hideAutoFight
          autoFight={false}
          ownedHeldItems={ownedHeldItems}
          xpTuning={xpTuning}
          onToggle={toggle}
          onStart={() => {
            onSave(selected);
            onClose();
          }}
          onToggleAutoFight={() => {}}
          onBack={onClose}
          onEquipHeld={onEquipHeld}
        />
      </section>
    </div>
  );
}
