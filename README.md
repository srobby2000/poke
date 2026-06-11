# Creature Masters Battle

A real-time, Pokémon Masters-inspired 3v3 battle game built with React, TypeScript, and three.js. Command a trio of Kanto starters against a rival team in a live-action battle with move gauges, sync moves, and team unity attacks.

## Features

- **Real-time combat** — a shared move gauge fills over time; spend it on moves while enemies act on their own cooldowns
- **Full 18-type chart** — main-series type effectiveness, same-type attack bonus, and role-based damage modifiers
- **Per-ally sync moves** — each ally charges its own sync countdown by acting; unleash big sync attacks with a team-wide damage boost
- **Unity attacks** — charge a team gauge and fire a combined attack from all living allies
- **Status conditions** — burn, poison, and paralysis (which slows your gauge and can fully block actions)
- **Stat-stage moves** — Withdraw, Growl, and X-item trainer moves raise and lower attack/defense stages
- **Rival trainer AI** — the enemy team's trainer heals weakened teammates and buffs attackers before sync moves
- **Damage variance & crits** — seeded RNG (0.85–1.0× rolls, 1/16 crit chance) keeps battles deterministic in tests but varied in play
- **Smart targeting** — auto mode picks the best matchup; manual mode honors your selected target

## Getting started

```bash
npm install
npm run dev      # start dev server at http://127.0.0.1:5173
```

## Scripts

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Start the Vite dev server                  |
| `npm test`        | Run the vitest suite (33 tests)            |
| `npm run lint`    | Run ESLint over `src/`                     |
| `npm run build`   | Type-check and build for production        |
| `npm run preview` | Preview the production build               |

## Project structure

```
src/
├── game/
│   ├── battleState.ts       # All game logic: pure reducer, type chart, AI, balance constants
│   └── battleState.test.ts  # Vitest suite for the battle simulation
├── components/
│   ├── BattleCanvas.tsx     # three.js scene (react-three-fiber + drei)
│   └── BattleHud.tsx        # 2D HUD: gauges, move buttons, battle log
├── App.tsx                  # 30Hz fixed-rate game loop
└── styles.css
```

### Architecture notes

- Game logic lives in a **pure reducer** (`battleReducer`) with no React dependencies — fully unit-testable and deterministic via a seedable RNG
- All tunable numbers (damage modifiers, cooldowns, status durations) live in the exported `BALANCE` object in `battleState.ts`
- Logic ticks at a fixed **30Hz** while visuals animate at full frame rate; the reducer preserves object identity for unchanged units so memoized components skip re-rendering

## Tech stack

[React 18](https://react.dev) · [TypeScript](https://www.typescriptlang.org) · [Vite](https://vitejs.dev) · [three.js](https://threejs.org) · [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) · [@react-three/drei](https://github.com/pmndrs/drei) · [Vitest](https://vitest.dev)

---

*Fan project for learning purposes. Pokémon is a trademark of Nintendo/Creatures Inc./GAME FREAK inc. — this project is not affiliated with or endorsed by them.*
