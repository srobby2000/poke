import { memo, useState } from "react";
import type { Dispatch } from "react";
import type { BattleAction, BattleState, Unit } from "../game/battleState";
import { captureChanceFor, isAlive, previewEnemyIntents, previewPlayerMove, teamUnits } from "../game/battleState";
import { battleItemEffect, isBattleItem } from "../game/battleItems";
import { ITEMS } from "../game/items";
import { isSoundMuted, setSoundMuted } from "../game/sound";

type BattleHudProps = {
  state: BattleState;
  dispatch: Dispatch<BattleAction>;
  onNextStage?: () => void;
  onRetry?: () => void;
  onChangeTeam?: () => void;
  onReturnToWorld?: () => void;
};

export function BattleHud({ state, dispatch, onNextStage, onRetry, onChangeTeam, onReturnToWorld }: BattleHudProps) {
  const [muted, setMuted] = useState(isSoundMuted);
  const allies = teamUnits(state, "ally");
  const enemies = teamUnits(state, "enemy");
  const selectedAlly = allies.find((unit) => unit.id === state.selectedAllyId) ?? allies[0];
  const selectedEnemy = enemies.find((unit) => unit.id === state.selectedEnemyId) ?? enemies[0];
  const gaugePercent = (state.moveGauge / state.maxMoveGauge) * 100;
  const unityPercent = (state.unityGauge / state.maxUnityGauge) * 100;
  const isDaily = state.config.battleMode === "daily";
  const isWild = state.config.battleMode === "wild";
  const usableItems = Object.entries(state.items).filter(([itemId, count]) => count > 0 && isBattleItem(itemId));
  const hasDamagedAlly = allies.some((unit) => isAlive(unit) && unit.hp < unit.maxHp);
  const wildTarget = isWild ? enemies.find(isAlive) : undefined;
  const enemyIntent = previewEnemyIntents(state)[0];
  const bestBall = wildTarget
    ? Object.entries(state.balls)
        .filter(([, count]) => count > 0)
        .sort((left, right) => captureChanceFor(wildTarget, right[0]) - captureChanceFor(wildTarget, left[0]))[0]?.[0]
    : undefined;
  const availableBalls = Object.entries(state.balls).filter(([, count]) => count > 0);
  const canUseItem = (itemId: string) => {
    const effect = battleItemEffect(itemId);
    if (!effect) {
      return false;
    }
    if (effect.kind === "heal") {
      return hasDamagedAlly;
    }
    return allies.some((unit) => isAlive(unit) && unit.statusCondition === effect.status);
  };

  return (
    <div className="hud-layer">
      {state.feedback.some((entry) => entry.kind === "sync") ? <div className="sync-flash" /> : null}
      <section className="top-strip" aria-label="Battle status">
        <div className="objective-chip">
          <strong>
            {isWild
              ? `Wild encounter · Lv ${state.config.stage}`
              : isDaily
                ? `Daily ${state.config.dailyKey ?? ""}`
                : `Rift League - Stage ${state.config.stage}`}
          </strong>
          <span>{isWild ? "Weaken it, then throw a ball!" : state.config.enemyTeamName ?? "Defeat the rival trio"}</span>
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
        {enemyIntent ? (
          <div className="intent-chip" aria-label="Enemy intent">
            <span>Next</span>
            <strong>
              {enemyIntent.unitName}: {enemyIntent.moveName}
            </strong>
            <em>
              vs {enemyIntent.targetName} in {enemyIntent.secondsUntilReady.toFixed(1)}s{enemyIntent.sync ? " | sync" : ""}
            </em>
          </div>
        ) : null}
        <div className="unity-chip">
          <span>Unity</span>
          <div className="unity-track">
            <div className="unity-fill" style={{ width: `${unityPercent}%` }} />
          </div>
          <strong>{state.unityGauge} / {state.maxUnityGauge}</strong>
        </div>
        <div className="control-chip" aria-label="Battle controls">
          <button onClick={() => dispatch({ type: "togglePause" })}>
            {state.paused ? "Resume" : "Pause"} <kbd>P</kbd>
          </button>
          <button onClick={() => dispatch({ type: "cycleTimeScale" })}>
            {state.timeScale}x <kbd>F</kbd>
          </button>
          <button
            onClick={() => {
              const next = !muted;
              setSoundMuted(next);
              setMuted(next);
            }}
          >
            {muted ? "Sound off" : "Sound on"}
          </button>
        </div>
      </section>

      {state.paused && state.status === "playing" ? (
        <div className="pause-overlay" aria-live="polite">
          <span>Paused</span>
          <small>Press P to resume</small>
        </div>
      ) : null}

      <section className="team-panel allies-panel" aria-label="Ally team">
        {allies.map((unit, index) => (
          <UnitButton
            key={unit.id}
            unit={unit}
            selected={unit.id === state.selectedAllyId}
            dispatch={dispatch}
            shortcut={["Q", "W", "E"][index]}
          />
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
            aria-pressed={state.targetMode === "auto"}
            onClick={() => dispatch({ type: "setTargetMode", mode: "auto" })}
          >
            Auto
          </button>
          <button
            className={state.targetMode === "manual" ? "target-mode-active" : ""}
            aria-pressed={state.targetMode === "manual"}
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
          {selectedAlly?.moves.map((move, index) => {
            const hasTarget = enemies.some(isAlive);
            const disabled =
              state.status !== "playing" || state.paused || !hasTarget || state.moveGauge < move.cost || !isAlive(selectedAlly);
            const preview = previewPlayerMove(state, move.id);
            return (
              <button
                key={move.id}
                className="move-button"
                disabled={disabled}
                onClick={() => dispatch({ type: "useMove", moveId: move.id })}
                style={{ borderColor: move.accent }}
              >
                <span>
                  {move.name} <kbd>{index + 1}</kbd>
                </span>
                <strong>{move.type} | {move.cost} gauge</strong>
                {preview ? (
                  <small>
                    {preview.statChangeLabel
                      ? `${preview.targetName} | ${preview.statChangeLabel}`
                      : `${preview.targetName} | ${preview.effectivenessLabel} | ~${preview.estimatedDamage}${preview.willKo ? " | KO risk" : ""}`}
                    {preview.statusEffect ? ` | ${preview.statusEffect}` : ""}
                  </small>
                ) : null}
              </button>
            );
          })}
        </div>
        {isWild ? (
          <div className="wild-grid" aria-label="Capture actions">
            {wildTarget ? (
              <small className="wild-hint">
                Lower HP and status raise catch odds. Current HP {wildTarget.hp} / {wildTarget.maxHp}
                {wildTarget.statusCondition ? ` | ${wildTarget.statusCondition}` : ""}
                {wildTarget.hp / wildTarget.maxHp <= 0.25 ? " | Low HP: consider a ball." : ""}
              </small>
            ) : null}
            {Object.entries(state.balls).map(([ballId, count]) => (
              <button
                key={ballId}
                className="ball-button"
                disabled={state.status !== "playing" || state.paused || count <= 0 || !enemies.some(isAlive)}
                onClick={() => dispatch({ type: "throwBall", ballId })}
              >
                <span>{ITEMS[ballId]?.name ?? ballId}</span>
                <strong>
                  ×{count}
                  {wildTarget ? ` | ${Math.round(captureChanceFor(wildTarget, ballId) * 100)}%` : ""}
                </strong>
              </button>
            ))}
            <button
              className="hold-button"
              disabled={state.status !== "playing" || state.paused || state.moveGauge < 1 || !wildTarget || wildTarget.hp <= 1}
              onClick={() => dispatch({ type: "holdBack" })}
            >
              <span>Hold Back</span>
              <strong>safe hit | 1 gauge</strong>
            </button>
            <button
              className="ball-button"
              disabled={state.status !== "playing" || state.paused || !bestBall || !wildTarget}
              onClick={() => bestBall && dispatch({ type: "throwBall", ballId: bestBall })}
            >
              <span>Best Ball</span>
              <strong>{bestBall ? ITEMS[bestBall]?.name ?? bestBall : "none"}</strong>
            </button>
            <button
              className="flee-button"
              disabled={state.status !== "playing" || state.paused}
              onClick={() => dispatch({ type: "flee" })}
            >
              <span>Flee</span>
              <strong>run away</strong>
            </button>
          </div>
        ) : null}
        {usableItems.length > 0 ? (
          <div className="item-grid" aria-label="Bag items">
            {usableItems.map(([itemId, count]) => (
              <button
                key={itemId}
                className="item-button"
                disabled={state.status !== "playing" || state.paused || !canUseItem(itemId)}
                onClick={() => dispatch({ type: "useItem", itemId })}
              >
                <span>{ITEMS[itemId]?.name ?? itemId}</span>
                <strong>×{count}</strong>
              </button>
            ))}
          </div>
        ) : null}
        {selectedAlly ? (
          <div className="special-grid">
            {selectedAlly.trainerMove ? (
              <button
                className="trainer-button"
                disabled={state.status !== "playing" || state.paused || selectedAlly.trainerMove.uses <= 0 || !isAlive(selectedAlly)}
                onClick={() => dispatch({ type: "useTrainerMove" })}
              >
                <span>
                  {selectedAlly.trainerMove.name} <kbd>T</kbd>
                </span>
                <strong>{selectedAlly.trainerMove.uses} / {selectedAlly.trainerMove.maxUses} uses</strong>
              </button>
            ) : null}
            <button
              className="sync-button"
              disabled={
                state.status !== "playing" || state.paused || selectedAlly.syncCountdown > 0 || !enemies.some(isAlive) || !isAlive(selectedAlly)
              }
              onClick={() => dispatch({ type: "useSyncMove" })}
              style={{ borderColor: selectedAlly.syncMove.accent }}
            >
              <span>
                {selectedAlly.syncMove.name} <kbd>SPACE</kbd>
              </span>
              <strong>{selectedAlly.syncCountdown === 0 ? `${selectedAlly.syncMove.type} sync` : `${selectedAlly.syncCountdown} moves`}</strong>
            </button>
            <button
              className="unity-button"
              disabled={state.status !== "playing" || state.paused || state.unityGauge < state.maxUnityGauge || !enemies.some(isAlive)}
              onClick={() => dispatch({ type: "useUnityAttack" })}
            >
              <span>
                Unity Burst <kbd>U</kbd>
              </span>
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
            <span>
              {state.status === "captured"
                ? "Caught!"
                : state.status === "fled"
                  ? "Escaped"
                  : state.status === "won"
                    ? "Victory"
                    : "Defeat"}
            </span>
            <strong>
              {state.status === "captured"
                ? `${state.config.enemyTeamName ?? "The wild creature"} joined your roster!`
                : state.status === "fled"
                  ? "You got away safely."
                  : state.status === "won"
                    ? isWild
                      ? "The wild creature fainted."
                      : isDaily
                        ? "Daily challenge cleared!"
                        : `Stage ${state.config.stage} cleared!`
                    : isWild
                      ? "Your team has fallen. The wild creature wanders off."
                      : isDaily
                        ? "Your team has fallen in the daily challenge."
                        : `Your team has fallen on stage ${state.config.stage}.`}
            </strong>
            {isWild && onReturnToWorld ? <button onClick={onReturnToWorld}>Return to Village</button> : null}
            {isWild && state.status === "won" && availableBalls.length > 0 ? (
              <div className="last-chance-grid" aria-label="Last chance capture">
                <small>Last chance throw before it gets away</small>
                {availableBalls.map(([ballId, count]) => (
                  <button key={ballId} onClick={() => dispatch({ type: "lastChanceBall", ballId })}>
                    {ITEMS[ballId]?.name ?? ballId} x{count}
                  </button>
                ))}
              </div>
            ) : null}
            {isWild && state.status === "won" && state.droppedItem ? (
              <small className="drop-line">
                Found {state.droppedItem.quantity} x {ITEMS[state.droppedItem.itemId]?.name ?? state.droppedItem.itemId}
              </small>
            ) : null}
            {!isWild && state.status === "won" && onNextStage ? (
              <button onClick={onNextStage}>Continue - Stage {state.config.stage + 1}</button>
            ) : null}
            <div className="battle-report" aria-label="Damage report">
              {[...allies]
                .sort((left, right) => (state.damageDealt[right.id] ?? 0) - (state.damageDealt[left.id] ?? 0))
                .map((unit) => (
                  <span key={unit.id}>
                    <i style={{ backgroundColor: unit.color }} />
                    {unit.name} — {state.damageDealt[unit.id] ?? 0} dmg
                  </span>
                ))}
            </div>
            {!isWild && state.status === "lost" ? (
              onRetry ? (
                <button onClick={onRetry}>{isDaily ? "Retry Daily" : `Retry Stage ${state.config.stage}`}</button>
              ) : (
                <button onClick={() => dispatch({ type: "restart" })}>Restart Battle</button>
              )
            ) : null}
            {onChangeTeam ? (
              <button className="secondary-button" onClick={onChangeTeam}>
                Change Team
              </button>
            ) : null}
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
  shortcut,
}: {
  unit: Unit;
  selected: boolean;
  dispatch: Dispatch<BattleAction>;
  shortcut?: string;
}) {
  const hpPercent = (unit.hp / unit.maxHp) * 100;
  return (
    <button
      className={`unit-button ${selected ? "unit-button-selected" : ""}`}
      disabled={!isAlive(unit)}
      aria-pressed={selected}
      onClick={() => dispatch({ type: unit.team === "ally" ? "selectAlly" : "selectEnemy", unitId: unit.id })}
    >
      <span className="unit-name">
        <i style={{ backgroundColor: unit.color }} />
        {unit.name}
        {shortcut ? <kbd>{shortcut}</kbd> : null}
        {unit.team === "ally" && unit.syncCountdown === 0 && isAlive(unit) ? (
          <b className="role-badge sync-ready-badge">sync</b>
        ) : null}
        <b className={`role-badge role-${unit.role}`}>{unit.role}</b>
      </span>
      <span className="stat-source">
        Lv {unit.level} | {unit.types.join(" / ")} | HP {unit.baseStats.hp} ATK {unit.baseStats.attack} DEF {unit.baseStats.defense} SPD {unit.baseStats.speed}
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
