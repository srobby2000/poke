import { useState } from "react";
import type { PokemonBaseStats } from "../game/battleState";
import { getAllyOptions } from "../game/battleState";

const TEAM_SIZE = 3;

type TeamSelectProps = {
  bestStage: number;
  statsSource: "live" | "bundled";
  speciesStats: Record<string, PokemonBaseStats> | null;
  onStart: (allyIds: string[]) => void;
};

export function TeamSelect({ bestStage, statsSource, speciesStats, onStart }: TeamSelectProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const options = getAllyOptions(speciesStats ?? undefined);

  const toggle = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) {
        return current.filter((existing) => existing !== id);
      }
      return current.length < TEAM_SIZE ? [...current, id] : current;
    });
  };

  return (
    <main className="app-shell select-screen">
      <header className="select-header">
        <h1>Creature Masters Battle</h1>
        <p>
          Pick three allies to challenge the rival trio.
          {bestStage > 0 ? ` Best stage cleared: ${bestStage}.` : " Clear stages to climb the league."}
        </p>
        <small>Base stats: {statsSource === "live" ? "live from PokeAPI" : "bundled"}</small>
      </header>
      <div className="select-grid">
        {options.map((option) => {
          const isSelected = selected.includes(option.id);
          const slot = selected.indexOf(option.id);
          return (
            <button
              key={option.id}
              className={`select-card ${isSelected ? "select-card-active" : ""}`}
              onClick={() => toggle(option.id)}
            >
              <span className="select-name">
                <i style={{ backgroundColor: option.color }} />
                {option.name}
                {isSelected ? <em className="select-slot">#{slot + 1}</em> : null}
                <b className={`role-badge role-${option.role}`}>{option.role}</b>
              </span>
              <span className="select-types">{option.types.join(" / ")}</span>
              <span className="select-stats">
                HP {option.baseStats.hp} ATK {option.baseStats.attack} DEF {option.baseStats.defense} SPD {option.baseStats.speed}
              </span>
              <span className="select-passive">{option.passive.name}</span>
              <span className="select-moves">{option.moveNames.join(" · ")}</span>
            </button>
          );
        })}
      </div>
      <footer className="select-footer">
        <span>{selected.length} / {TEAM_SIZE} selected</span>
        <button className="start-button" disabled={selected.length !== TEAM_SIZE} onClick={() => onStart(selected)}>
          Start Battle
        </button>
      </footer>
    </main>
  );
}
