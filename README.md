# Creature Masters Battle

[![CI](https://github.com/srobby2000/poke/actions/workflows/ci.yml/badge.svg)](https://github.com/srobby2000/poke/actions/workflows/ci.yml)

A Pokémon-style, turn-based battle game built with React, TypeScript, and three.js. Build a team of three, battle one-on-one from your trainer's point of view, and climb an endless ladder of increasingly tough rival battles.

## Features

- **Connected overworld** — walk between Rift Village, Route 2, and Crystal Cave (WASD/arrows, touch joystick on mobile); step on a warp tile to travel between areas. Your map and position are saved between sessions
- **Berries & shop** — pick berries from village trees (they regrow daily) and trade at the Village Shop: sell berries, buy Poké Balls and potions
- **Wild encounters & capture** — Route 1's tall grass hides wild creatures (Pidgey, Rattata, Oddish, and rare roster species up to Dratini); weaken them in battle, throw balls to capture, and recruit them — duplicates level up like gacha dupes. The deep grass further east hides stronger spawns including wild Growlithe and Eevee. Wild species evolve too (Pidgey → Pidgeotto → Pidgeot, etc.)
- **Route 2 & Crystal Cave** — head east through the gate to Route 2 (a fishable pond, deep-grass chase zone, wild Lapras) and on into Crystal Cave, where rock/ground/ghost types lurk on every step and a boss-aura Warden guards the depths
- **Overworld trainers** — line-of-sight trainers spot you and battle; beat one and they step aside (gating progress). A Gatekeeper guards Route 2 and the Psychic Sage guards the cave. Defeated trainers can be **rematched once per day** for bonus gems
- **Fishing** — cast a line on any pond's water tiles for a chance at water types (Psyduck, Squirtle, and rare Lapras)
- **Held items** — equip an ally with a held item for a passive battle effect: type-boost charms (Charcoal, Mystic Water, Soft Sand, Hard Stone…) that amp a move type by 20%, Life Orb (+25% damage), Leftovers (HP regen each turn), and Focus Sash (survive one knockout from full HP). Buy them at the shop, find them as drops from strong wild creatures, or earn the Focus Sash from the Cave Warden — a lever for patching type coverage against the rock/ground cave
- **Pokédex** — a blurred-backdrop modal tracking every creature you've encountered (wild, fishing, or battle); open it from the Arena or the overworld (📕 button or `B` key). Click an entry for a detail page with **PokeAPI official artwork** (silhouette until caught), Pokédex flavor text, genus, height/weight/habitat, stat bars, passive, and moves
- **Settings** — a ⚙️ panel (overworld or Arena) with PokeAPI toggles (off by default): **"capture & growth rates"** (real `capture_rate` drives catch odds, `growth_rate` scales the XP curve) and **"movesets"** (each ally's moves use normalized real move data — type, power, ailment — instead of the hand-tuned set). Off keeps the hand-tuned defaults
- **Minimap & capture achievements** — an in-world minimap tracks your position; capture milestones (Gotcha!, Seasoned Catcher, Route Researcher) pay gem rewards
- **Gacha scouting** — earn gems by clearing stages and spend them on pulls (×1 or discounted ×10) with an animated rarity reveal; new allies are guaranteed while any remain locked (weighted by ★ rarity), then pulls become level-ups
- **Rotating rival squads** — four enemy teams rotate by stage, with a Boss Aura team every fifth stage, plus a once-per-day seeded Daily Challenge for bonus gems
- **16-ally roster** — from 3★ starters to the 5★ chase units Dratini and Lapras, each with a distinct role, rarity, passive, and moveset
- **Leveling & evolution (hybrid XP)** — allies earn XP from every battle they fight (an XP bar tracks progress to the next level), and you can still spend gems or duplicate pulls for instant levels (each level adds two battle levels, cap 10); allies evolve at thresholds derived from **real PokeAPI evolution chains** (scaled into the level cap; stone/trade evolutions map to a default level), with real evolved-form stats. The Pokédex detail page shows each creature's full evolution line and triggers
- **Battle report** — the result screen shows damage dealt per ally, so you can judge team compositions
- **Achievements** — eight one-time missions (Flawless, League Champion, Full Roster…) that pay gem rewards and persist in the save
- **Stage progression** — enemies grow stronger every stage, with a first-clear gem bonus; your best cleared stage is saved between sessions
- **Live PokeAPI data** — base stats, official artwork, and species detail (flavor text, genus, height/weight, base experience, capture/growth rates) are fetched from [pokeapi.co](https://pokeapi.co) and cached for 7 days; battles use identical bundled stats as an offline fallback, and base experience scales battle XP rewards
- **Turn-based, one-on-one battles** — each side fields one Pokémon; both choose, then switches, items and balls resolve before moves, and moves go in Speed order (Quick Attack first). Choose **Fight**, **Pokémon** (switch), **Bag** (potions, cures, your trainer skill, Poké Balls) or **Run** (wild battles). A knocked-out Pokémon is replaced for free
- **Trainer's-eye view** — the camera stands behind your trainer: your Pokémon faces away across the field toward the opponent, with the rival trainer behind it. Info boxes show level, HP and status; each turn plays back as messages, move animations, hit blinks, draining HP bars and faints
- **Main-series stats and damage** — HP and stats come from base stats and level; damage uses the main-series formula with same-type bonus (1.5×), the full 18-type chart, crits (1/16) and 0.85–1.0× rolls, all seeded and deterministic in tests. Strong species (Snorlax, Butterfree) arrive at lower levels on early stages
- **Move animations** — every move in the Red/Blue learnsets (all 151 Pokémon, 1,090 entries) and every battle move has a recorded movement; contact moves dash in, ranged ones fire type-shaped projectiles. Watch any Pokémon's moves in the Pokédex
- **Sync moves** — each Pokémon charges its Sync move by using three moves, then unleashes it for heavy damage
- **Status conditions** — burn and poison chip HP each turn (burn also weakens attacks); paralysis halves Speed and can stop a move. Fire, Poison and Electric types resist their matching status
- **Stat-stage moves** — Withdraw, Growl, and X-item trainer skills raise and lower Attack/Defense stages (main-series ±6 scale)
- **Rival trainer AI** — picks strong moves (and sometimes its second choice), heals its Pokémon once or twice when low, and uses an X Attack
- **Auto battle & controls** — **Auto** picks moves for you; `1–4` use moves, `Space`/click skips a message, `Esc` backs out of a menu, `A` toggles Auto
- **Balance simulator** — `turnBattleSimulation.ts` plays thousands of seeded battles with smart, casual and naive players; the balance report test keeps the difficulty curve where it was tuned
- **Sound** — synthesized WebAudio effects for hits, super-effective hits, status, faints and captures (mutable)

## Getting started

```bash
npm install
npm run dev      # start dev server at http://127.0.0.1:7173
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
│   ├── battleState.ts       # Roster, enemy teams, evolutions and unit construction
│   ├── turnBattle.ts        # Turn-based battle engine: pure reducer, damage, AI, TURN constants
│   ├── turnBattleSimulation.ts # Seeded battle simulator used by the balance report
│   ├── moveAnimations.ts    # Recorded movement for every move, and Red/Blue learnsets
│   ├── pokemonAnimation.ts  # Procedural clips: idle, walk, gallop, attack, hit, every move
│   ├── pokemonAppendages.ts # Generated rigs for models shipped without skeletons
│   ├── maps.ts              # Overworld maps as editable ASCII grids
│   ├── worldState.ts        # Overworld reducer: movement, collision, interactions
│   ├── items.ts             # Item definitions, inventory, daily berry picking
│   ├── heldItems.ts         # Held-item effects, equip/unequip logic
│   ├── shop.ts              # Buy/sell logic
│   ├── pokeApi.ts           # Live PokeAPI stat fetching with localStorage cache
│   ├── gacha.ts             # Pull, leveling, and gem-reward logic
│   ├── sound.ts             # Synthesized WebAudio effects
│   └── progress.ts          # Persistent save: gems, unlocks, levels, best stage
├── components/
│   ├── WorldScreen.tsx      # Overworld loop, keyboard + joystick, village HUD
│   ├── WorldCanvas.tsx      # three.js village scene
│   ├── TeamSelect.tsx       # Arena hub: roster, scout, achievements
│   ├── PokedexScreen.tsx    # Seen/caught creature collection
│   ├── TurnBattleScreen.tsx # Battle screen: event playback, menus, results
│   └── TurnBattleCanvas.tsx # Trainer's-eye battle scene (react-three-fiber + drei)
├── App.tsx                  # Screen flow, sessions and rewards
└── styles.css
```

### Architecture notes

- Battles are a **pure turn reducer** (`turnBattleReducer`) with no React dependencies — fully unit-testable and deterministic via a seedable RNG. Each turn resolves at once into an ordered list of events, which the screen plays back one at a time
- Battle tuning (damage scale, HP scale, level curves, status odds) lives in the exported `TURN` object in `turnBattle.ts`; the balance report test measures win rates with the simulator

## Tech stack

[React 18](https://react.dev) · [TypeScript](https://www.typescriptlang.org) · [Vite](https://vitejs.dev) · [three.js](https://threejs.org) · [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) · [@react-three/drei](https://github.com/pmndrs/drei) · [Vitest](https://vitest.dev)

---

*Fan project for learning purposes. Pokémon is a trademark of Nintendo/Creatures Inc./GAME FREAK inc. — this project is not affiliated with or endorsed by them.*

### Dungeon exploration and riding

- Reach Crystal Cave through the eastern gate on Route 2. The cave now has three connected floors: Crystal Threshold (B1), Sunken Galleries (B2), and Crystal Heart (B3).
- Walk onto the labeled stairs to descend or return. Each deeper floor has stronger encounters; Crystal Keeper Lyra waits on B3. Your map and position use the existing save system.
- Choose Arcanine (1.5× speed) or Rapidash (1.75× speed) in the Trail Pokémon panel, then press **R** or **Ride**. Press again to dismount. These free trail loans are separate from the battle team, retain normal collisions and encounters, and can travel between floors. Returning from battle starts on foot.
- World movement and turning are smoothed between logic updates. Mounts gallop while ridden (Arcanine a rotary dog gallop, Rapidash a transverse horse gallop), and the rider sits in a saddle measured from the mount's back, moving with its stride.
