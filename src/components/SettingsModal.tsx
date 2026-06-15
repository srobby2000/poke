import type { PlayerSettings } from "../game/progress";

type SettingsModalProps = {
  settings: PlayerSettings;
  onChange: (settings: PlayerSettings) => void;
  onClose: () => void;
};

export function SettingsModal({ settings, onChange, onClose }: SettingsModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Settings" onClick={onClose}>
      <div className="modal-panel settings-modal" onClick={(event) => event.stopPropagation()}>
        <header className="pokedex-modal-header">
          <h2>⚙️ Settings</h2>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>

        <label className="settings-row">
          <span className="settings-row-text">
            <strong>Use PokéAPI capture &amp; growth rates</strong>
            <small>
              When on, real capture_rate drives catch odds and growth_rate scales the XP curve. Off uses the hand-tuned
              defaults.
            </small>
          </span>
          <input
            type="checkbox"
            checked={settings.usePokeApiRates}
            onChange={(event) => onChange({ ...settings, usePokeApiRates: event.target.checked })}
          />
        </label>

        <label className="settings-row">
          <span className="settings-row-text">
            <strong>Use PokéAPI movesets</strong>
            <small>
              When on, each ally's moves use normalized real move data (type, power, ailment). Off uses the hand-tuned
              movesets. Changes battle balance.
            </small>
          </span>
          <input
            type="checkbox"
            checked={settings.usePokeApiMovesets}
            onChange={(event) => onChange({ ...settings, usePokeApiMovesets: event.target.checked })}
          />
        </label>
      </div>
    </div>
  );
}
