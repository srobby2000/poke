# Creature Masters Battle

[![CI](https://github.com/srobby2000/poke/actions/workflows/ci.yml/badge.svg)](https://github.com/srobby2000/poke/actions/workflows/ci.yml)

A real-time, Pokémon Masters-inspired 3v3 battle game built with React, TypeScript, and three.js. Build a team of three from a nine-Pokémon roster and climb an endless ladder of increasingly tough rival battles.

## Features

- **Overworld village** — walk around Rift Village (WASD/arrows, touch joystick on mobile), talk to NPCs, and enter the Arena to battle; your position is saved between sessions
- **Berries & shop** — pick berries from village trees (they regrow daily) and trade at the Village Shop: sell berries, buy Poké Balls and potions
- **Wild encounters & capture** — Route 1's tall grass hides wild creatures (Pidgey, Rattata, Oddish, and rare roster species up to Dratini); weaken them in battle, throw balls to capture, and recruit them — duplicates level up like gacha dupes
- **Gacha scouting** — earn gems by clearing stages and spend them on pulls (×1 or discounted ×10) with an animated rarity reveal; new allies are guaranteed while any remain locked (weighted by ★ rarity), then pulls become level-ups
- **Rotating rival squads** — four enemy teams rotate by stage, with a Boss Aura team every fifth stage, plus a once-per-day seeded Daily Challenge for bonus gems
- **16-ally roster** — from 3★ starters to the 5★ chase units Dratini and Lapras, each with a distinct role, rarity, passive, and moveset
- **Leveling & evolution** — raise allies with gems or duplicate pulls (+6% stats per level, cap 10); allies evolve at level thresholds (Charmander → Charmeleon → Charizard) with real evolved-form stats
- **Battle report** — the result screen shows damage dealt per ally, so you can judge team compositions
- **Achievements** — eight one-time missions (Flawless, League Champion, Full Roster…) that pay gem rewards and persist in the save
- **Stage progression** — enemies grow stronger every stage, with a first-clear gem bonus; your best cleared stage is saved between sessions
- **Live PokeAPI stats** — base stats are fetched from [pokeapi.co](https://pokeapi.co) (cached for 7 days) with identical bundled values as an offline fallback
- **Real-time combat** — a shared move gauge fills over time; spend it on moves while enemies act on their own cooldowns
- **Full 18-type chart** — main-series type effectiveness, same-type attack bonus, and role-based damage modifiers
- **Per-ally sync moves** — each ally charges its own sync countdown by acting; unleash big sync attacks with a team-wide damage boost
- **Unity attacks** — charge a team gauge and fire a combined attack from all living allies
- **Status conditions** — burn, poison, and paralysis (which slows your gauge and can fully block actions)
- **Stat-stage moves** — Withdraw, Growl, and X-item trainer moves raise and lower attack/defense stages
- **Rival trainer AI** — the enemy team's trainer heals weakened teammates and buffs attackers before sync moves
- **Damage variance & crits** — seeded RNG (0.85–1.0× rolls, 1/16 crit chance) keeps battles deterministic in tests but varied in play
- **Smart targeting** — auto mode picks the best matchup; manual mode honors your selected target
- **Attack projectiles & sound** — moves fly as type-shaped projectiles (flame shards, lightning bolts, spinning leaves, psychic rings, ice crystals) that land exactly when damage applies, with synthesized WebAudio effects (mutable)
- **Keyboard shortcuts** — `1/2/3` moves, `Q/W/E` switch allies, `Space` sync, `T` trainer move, `U` unity, `M` target mode, `P` pause, `F` 2x speed
- **Pause and fast-forward** — freeze the battle or run it at double speed

## Getting started

```bash
npm install
npm run dev      # start dev server at http://127.0.0.1:5173
```

## Scripts

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Start the Vite dev server                  |
| `npm test`        | Run the vitest suite                       |
| `npm run lint`    | Run ESLint over `src/`                     |
| `npm run build`   | Type-check and build for production        |
| `npm run preview` | Preview the production build               |

## Project structure

```
src/
├── game/
│   ├── battleState.ts       # All game logic: pure reducer, type chart, AI, balance constants
│   ├── battleState.test.ts  # Vitest suite for the battle simulation
│   ├── maps.ts              # Overworld maps as editable ASCII grids
│   ├── worldState.ts        # Overworld reducer: movement, collision, interactions
│   ├── items.ts             # Item definitions, inventory, daily berry picking
│   ├── shop.ts              # Buy/sell logic
│   ├── pokeApi.ts           # Live PokeAPI stat fetching with localStorage cache
│   ├── gacha.ts             # Pull, leveling, and gem-reward logic
│   ├── sound.ts             # Synthesized WebAudio effects
│   └── progress.ts          # Persistent save: gems, unlocks, levels, best stage
├── components/
│   ├── WorldScreen.tsx      # Overworld loop, keyboard + joystick, village HUD
│   ├── WorldCanvas.tsx      # three.js village scene
│   ├── TeamSelect.tsx       # Arena hub: roster, scout, achievements
│   ├── BattleCanvas.tsx     # three.js battle scene (react-three-fiber + drei)
│   └── BattleHud.tsx        # 2D HUD: gauges, move buttons, battle log
├── App.tsx                  # Screen flow + 30Hz fixed-rate game loop
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
