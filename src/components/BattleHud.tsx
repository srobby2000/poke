import { memo } from "react";
import type { Dispatch } from "react";
import type { BattleAction, BattleState, Unit } from "../game/battleState";
import { isAlive, previewPlayerMove, teamUnits } from "../game/battleState";

type BattleHudProps = {
  state: BattleState;
  dispatch: Dispatch<BattleAction>;
};

export function BattleHud({ state, dispatch }: BattleHudProps) {
  const allies = teamUnits(state, "ally");
  const enemies = teamUnits(state, "enemy");
  const selectedAlly = allies.find((unit) => unit.id === state.selectedAllyId) ?? allies[0];
  const selectedEnemy = enemies.find((unit) => unit.id === state.selectedEnemyId) ?? enemies[0];
  const gaugePercent = (state.moveGauge / state.maxMoveGauge) * 100;
  const unityPercent = (state.unityGauge / state.maxUnityGauge) * 100;

  return (
    <div className="hud-layer">
      {state.feedback.some((entry) => entry.kind === "sync") ? <div className="sync-flash" /> : null}
      <section className="top-strip" aria-label="Battle status">
        <div className="objective-chip">
          <strong>Rift League</strong>
          <span>Defeat the rival trio</span>
        </div>
        <div className="gauge-panel">
          <span>Move Gauge</span>
          <div className="gauge-track">
            <div className="gauge-fill" style={{ width: `${gaugePercent}%` }} />
          </div>
          <strong>{state.moveGauge.toFixed(1)} / {state.maxMoveGauge}</strong>
        </div>
        <div className="sync-chip">
          <span>Sync: {selectedAlly?.name ?? "-"}</span>
          <strong>
            {selectedAlly
              ? selectedAlly.syncCountdown === 0
                ? "Ready"
                : `${selectedAlly.syncCountdown} moves`
              : "-"}
          </strong>
          {state.syncBoosts.ally > 0 ? <em>Boost {state.syncBoosts.ally}</em> : null}
        </div>
        <div className="sync-chip enemy-sync-chip">
          <span>Enemy Sync</span>
          <strong>{state.enemySyncCountdown === 0 ? "Incoming" : `${state.enemySyncCountdown} moves`}</strong>
          {state.syncBoosts.enemy > 0 ? <em>Boost {state.syncBoosts.enemy}</em> : null}
          {state.enemyTrainer.healUses + state.enemyTrainer.buffUses > 0 ? (
            <em>Trainer items x{state.enemyTrainer.healUses + state.enemyTrainer.buffUses}</em>
          ) : null}
        </div>
        <div className="unity-chip">
          <span>Unity</span>
          <div className="unity-track">
            <div className="unity-fill" style={{ width: `${unityPercent}%` }} />
          </div>
          <strong>{state.unityGauge} / {state.maxUnityGauge}</strong>
        </div>
      </section>

      <section className="team-panel allies-panel" aria-label="Ally team">
        {allies.map((unit) => (
          <UnitButton key={unit.id} unit={unit} selected={unit.id === state.selectedAllyId} dispatch={dispatch} />
        ))}
      </section>

      <section className="team-panel enemies-panel" aria-label="Enemy team">
        {enemies.map((unit) => (
          <UnitButton key={unit.id} unit={unit} selected={unit.id === state.selectedEnemyId} dispatch={dispatch} />
        ))}
      </section>

      <section className="command-panel" aria-label="Battle commands">
        <div className="target-mode" aria-label="Target mode">
          <button
            className={state.targetMode === "auto" ? "target-mode-active" : ""}
            onClick={() => dispatch({ type: "setTargetMode", mode: "auto" })}
          >
            Auto
          </button>
          <button
            className={state.targetMode === "manual" ? "target-mode-active" : ""}
            onClick={() => dispatch({ type: "setTargetMode", mode: "manual" })}
          >
            Manual
          </button>
        </div>
        <div className="selection-line">
          <span>{selectedAlly?.name ?? "No ally"}</span>
          <strong>{state.targetMode === "auto" ? "auto target" : "manual target"}</strong>
          <span>{state.targetMode === "auto" ? "best matchup" : selectedEnemy?.name ?? "No target"}</span>
        </div>
        <div className="move-grid">
          {selectedAlly?.moves.map((move) => {
            const hasTarget = enemies.some(isAlive);
            const disabled = state.status !== "playing" || !hasTarget || state.moveGauge < move.cost || !isAlive(selectedAlly);
            const preview = previewPlayerMove(state, move.id);
            return (
              <button
                key={move.id}
                className="move-button"
                disabled={disabled}
                onClick={() => dispatch({ type: "useMove", moveId: move.id })}
                style={{ borderColor: move.accent }}
              >
                <span>{move.name}</span>
                <strong>{move.type} | {move.cost} gauge</strong>
                {preview ? (
                  <small>
                    {preview.statChangeLabel
                      ? `${preview.targetName} | ${preview.statChangeLabel}`
                      : `${preview.targetName} | ${preview.effectivenessLabel} | ~${preview.estimatedDamage}`}
                    {preview.statusEffect ? ` | ${preview.statusEffect}` : ""}
                  </small>
                ) : null}
              </button>
            );
          })}
        </div>
        {selectedAlly ? (
          <div className="special-grid">
            {selectedAlly.trainerMove ? (
              <button
                className="trainer-button"
                disabled={state.status !== "playing" || selectedAlly.trainerMove.uses <= 0 || !isAlive(selectedAlly)}
                onClick={() => dispatch({ type: "useTrainerMove" })}
              >
                <span>{selectedAlly.trainerMove.name}</span>
                <strong>{selectedAlly.trainerMove.uses} / {selectedAlly.trainerMove.maxUses} uses</strong>
              </button>
            ) : null}
            <button
              className="sync-button"
              disabled={state.status !== "playing" || selectedAlly.syncCountdown > 0 || !enemies.some(isAlive) || !isAlive(selectedAlly)}
              onClick={() => dispatch({ type: "useSyncMove" })}
              style={{ borderColor: selectedAlly.syncMove.accent }}
            >
              <span>{selectedAlly.syncMove.name}</span>
              <strong>{selectedAlly.syncCountdown === 0 ? `${selectedAlly.syncMove.type} sync` : `${selectedAlly.syncCountdown} moves`}</strong>
            </button>
            <button
              className="unity-button"
              disabled={state.status !== "playing" || state.unityGauge < state.maxUnityGauge || !enemies.some(isAlive)}
              onClick={() => dispatch({ type: "useUnityAttack" })}
            >
              <span>Unity Burst</span>
              <strong>{state.unityGauge >= state.maxUnityGauge ? "team attack" : `${state.maxUnityGauge - state.unityGauge} actions`}</strong>
            </button>
          </div>
        ) : null}
      </section>

      <section className="battle-log" aria-label="Battle log">
        {state.actionQueue.length > 0 ? (
          <p className="queue-line">
            {state.actionQueue.length} {state.actionQueue.length === 1 ? "action" : "actions"} queued
          </p>
        ) : null}
        {state.log.map((entry, index) => (
          <p key={`${entry}-${index}`}>{entry}</p>
        ))}
      </section>

      {state.status !== "playing" ? (
        <div className="result-overlay" role="dialog" aria-live="polite">
          <div className="result-panel">
            <span>{state.status === "won" ? "Victory" : "Defeat"}</span>
            <strong>{state.status === "won" ? "The rival trio is down." : "Your team has fallen."}</strong>
            <button onClick={() => dispatch({ type: "restart" })}>Restart Battle</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Memoized so it only re-renders when its unit object actually changes; the
// reducer keeps unit references stable across ticks when nothing happened.
const UnitButton = memo(function UnitButton({
  unit,
  selected,
  dispatch,
}: {
  unit: Unit;
  selected: boolean;
  dispatch: Dispatch<BattleAction>;
}) {
  const hpPercent = (unit.hp / unit.maxHp) * 100;
  return (
    <button
      className={`unit-button ${selected ? "unit-button-selected" : ""}`}
      disabled={!isAlive(unit)}
      onClick={() => dispatch({ type: unit.team === "ally" ? "selectAlly" : "selectEnemy", unitId: unit.id })}
    >
      <span className="unit-name">
        <i style={{ backgroundColor: unit.color }} />
        {unit.name}
        {unit.team === "ally" && unit.syncCountdown === 0 && isAlive(unit) ? (
          <b className="role-badge sync-ready-badge">sync</b>
        ) : null}
        <b className={`role-badge role-${unit.role}`}>{unit.role}</b>
      </span>
      <span className="stat-source">
        {unit.types.join(" / ")} | HP {unit.baseStats.hp} ATK {unit.baseStats.attack} DEF {unit.baseStats.defense} SPD {unit.baseStats.speed}
      </span>
      <span className="passive-line">{unit.passive.name}</span>
      {(unit.attackStage !== 0 || unit.defenseStage !== 0) ? (
        <span className="buff-line">ATK {unit.attackStage >= 0 ? "+" : ""}{unit.attackStage} DEF {unit.defenseStage >= 0 ? "+" : ""}{unit.defenseStage}</span>
      ) : null}
      {unit.statusCondition ? <span className={`status-badge status-${unit.statusCondition}`}>{unit.statusCondition}</span> : null}
      <span className="hp-track">
        <span className="hp-fill" style={{ width: `${hpPercent}%` }} />
      </span>
      <strong>{unit.hp} / {unit.maxHp}</strong>
    </button>
  );
});
