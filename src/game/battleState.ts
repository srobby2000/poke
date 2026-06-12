export type Team = "ally" | "enemy";

export type BattleStatus = "playing" | "won" | "lost";

export type TargetMode = "auto" | "manual";

export type BattleMode = "ladder" | "daily";

export type StatusCondition = "burn" | "poison" | "paralysis";

export type BattleRole = "strike" | "tech" | "support";

export type PassiveSkill = {
  id: string;
  name: string;
  description: string;
};

export type TrainerMove =
  | {
      id: string;
      name: string;
      kind: "heal";
      uses: number;
      maxUses: number;
      amount: number;
      description: string;
    }
  | {
      id: string;
      name: string;
      kind: "attackBuff" | "defenseBuff";
      uses: number;
      maxUses: number;
      stages: number;
      target: "self" | "allAllies";
      description: string;
    };

export type StatChange = {
  stat: "attack" | "defense";
  stages: number;
  target: "self" | "enemy";
};

export type Move = {
  id: string;
  name: string;
  type: PokemonType;
  cost: number;
  power: number;
  accent: string;
  statusEffect?: StatusCondition;
  statChange?: StatChange;
};

export type Rarity = 3 | 4 | 5;

export type Unit = {
  id: string;
  name: string;
  team: Team;
  sourcePokemon: string;
  role: BattleRole;
  rarity: Rarity;
  // Ally level from progression; enemies show their stage number here.
  level: number;
  passive: PassiveSkill;
  types: PokemonType[];
  baseStats: PokemonBaseStats;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  attackStage: number;
  defenseStage: number;
  statusCondition: StatusCondition | null;
  statusTimer: number;
  position: [number, number, number];
  color: string;
  accent: string;
  shape: "horn" | "shell" | "wing" | "crystal" | "ember" | "bloom";
  moves: Move[];
  syncMove: Move;
  syncCountdown: number;
  trainerMove: TrainerMove | null;
  hitFlash: number;
  actionPulse: number;
};

export type EnemyTrainerState = {
  name: string;
  healUses: number;
  maxHealUses: number;
  healAmount: number;
  buffUses: number;
  maxBuffUses: number;
  buffStages: number;
};

export type PokemonType =
  | "bug"
  | "dark"
  | "dragon"
  | "electric"
  | "fairy"
  | "fighting"
  | "fire"
  | "flying"
  | "ghost"
  | "grass"
  | "ground"
  | "ice"
  | "normal"
  | "poison"
  | "psychic"
  | "rock"
  | "steel"
  | "water";

export type PokemonBaseStats = {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
};

type UnitTemplate = {
  id: string;
  name: string;
  team: Team;
  sourcePokemon: keyof typeof pokeApiBaseStats;
  role: BattleRole;
  rarity: Rarity;
  passive: PassiveSkill;
  types: PokemonType[];
  // Allies are positioned by team-slot at battle start; enemies set this explicitly.
  position?: [number, number, number];
  color: string;
  accent: string;
  shape: Unit["shape"];
  moves: Move[];
  syncMove: Move;
  trainerMove: TrainerMove | null;
};

type QueuedAction = {
  id: string;
  actorId: string;
  targetId: string;
  move: Move;
  delay: number;
  // Original delay, so the canvas can derive projectile flight progress.
  totalDelay: number;
  sync?: boolean;
  unity?: boolean;
};

export type BattleFeedback = {
  id: string;
  unitId: string;
  text: string;
  kind: "damage" | "super" | "resist" | "status" | "sync" | "unity";
  ttl: number;
};

export type MovePreview = {
  moveName: string;
  targetName: string;
  type: PokemonType;
  cost: number;
  estimatedDamage: number;
  effectiveness: number;
  effectivenessLabel: string;
  statusEffect?: StatusCondition;
  statChangeLabel?: string;
};

export type BattleConfig = {
  allyIds: string[];
  stage: number;
  battleMode?: BattleMode;
  dailyKey?: string;
  enemyTeamId?: string;
  enemyTeamName?: string;
  speciesStats?: Record<string, PokemonBaseStats>;
  allyLevels?: Record<string, number>;
};

export type BattleState = {
  units: Unit[];
  enemyCooldowns: Record<string, number>;
  config: BattleConfig;
  selectedAllyId: string;
  selectedEnemyId: string;
  targetMode: TargetMode;
  moveGauge: number;
  maxMoveGauge: number;
  unityGauge: number;
  maxUnityGauge: number;
  enemySyncCountdown: number;
  maxEnemySyncCountdown: number;
  enemyTrainer: EnemyTrainerState;
  actionQueue: QueuedAction[];
  feedback: BattleFeedback[];
  syncBoosts: Record<Team, number>;
  statusTickTimer: number;
  status: BattleStatus;
  paused: boolean;
  timeScale: number;
  log: string[];
  elapsed: number;
  rng: number;
};

export type BattleAction =
  | { type: "tick"; deltaSeconds: number }
  | { type: "selectAlly"; unitId: string }
  | { type: "selectEnemy"; unitId: string }
  | { type: "setTargetMode"; mode: TargetMode }
  | { type: "useMove"; moveId: string }
  | { type: "useTrainerMove" }
  | { type: "useSyncMove" }
  | { type: "useUnityAttack" }
  | { type: "togglePause" }
  | { type: "cycleTimeScale" }
  | { type: "restart" };

// Every tunable battle number lives here so balancing is a one-file job.
export const BALANCE = {
  gaugeFillRate: 0.9,
  paralysisGaugePenaltyPerAlly: 0.2,
  minParalysisGaugeFactor: 0.4,
  paralysisCooldownFactor: 0.55,
  playerAttackDelay: 0.45,
  playerSyncDelay: 0.7,
  unityAttackDelay: 0.82,
  enemyAttackDelay: 0.55,
  enemySyncDelay: 0.75,
  enemyCooldownBase: 2.4,
  enemySyncCooldownBase: 3.1,
  enemyCooldownSpeedFactor: 1.6,
  stageMultiplier: 0.25,
  sameTypeBonus: 1.2,
  burnAttackPenalty: 0.82,
  syncBoostStacks: 4,
  syncBoostPerStack: 0.12,
  strikeRoleBonus: 1.12,
  techStatusBonus: 1.05,
  supportDamageReduction: 0.9,
  unityDamageScale: 0.62,
  unityPower: { strike: 42, tech: 34, support: 30 } as Record<BattleRole, number>,
  burnTickDamage: 5,
  poisonTickDamage: 7,
  baseStatusDuration: 5,
  techStatusDuration: 7,
  statusTickInterval: 1,
  varianceMin: 0.85,
  critChance: 1 / 16,
  critMultiplier: 1.5,
  syncCountdownMax: 3,
  paralysisBlockChance: 0.2,
  enemyHealThreshold: 0.45,
  enemyTrainerActionCooldown: 1.5,
  stageEnemyHpGrowth: 0.16,
  stageEnemyAttackGrowth: 0.1,
  stageEnemyDefenseGrowth: 0.08,
  allyLevelGrowth: 0.06,
  maxAllyLevel: 10,
  logLimit: 6,
  feedbackLimit: 10,
} as const;

// Bundled fallback stats, identical to live PokeAPI values. The battle model
// has a single offensive stat, so `attack` is max(Attack, Sp. Atk) — this is
// also how src/game/pokeApi.ts maps live data, keeping both sources consistent.
const pokeApiBaseStats = {
  bulbasaur: { hp: 45, attack: 65, defense: 49, speed: 45 },
  squirtle: { hp: 44, attack: 50, defense: 65, speed: 43 },
  charmander: { hp: 39, attack: 60, defense: 43, speed: 65 },
  vulpix: { hp: 38, attack: 50, defense: 40, speed: 65 },
  machop: { hp: 70, attack: 80, defense: 50, speed: 35 },
  eevee: { hp: 55, attack: 55, defense: 50, speed: 55 },
  abra: { hp: 25, attack: 105, defense: 15, speed: 90 },
  geodude: { hp: 40, attack: 80, defense: 100, speed: 20 },
  jigglypuff: { hp: 115, attack: 45, defense: 20, speed: 20 },
  growlithe: { hp: 55, attack: 70, defense: 45, speed: 60 },
  psyduck: { hp: 50, attack: 65, defense: 48, speed: 55 },
  meowth: { hp: 40, attack: 45, defense: 35, speed: 90 },
  cubone: { hp: 50, attack: 50, defense: 95, speed: 35 },
  haunter: { hp: 45, attack: 115, defense: 45, speed: 95 },
  dratini: { hp: 41, attack: 64, defense: 45, speed: 50 },
  lapras: { hp: 130, attack: 85, defense: 80, speed: 60 },
  pikachu: { hp: 35, attack: 55, defense: 40, speed: 90 },
  snorlax: { hp: 160, attack: 110, defense: 65, speed: 30 },
  butterfree: { hp: 60, attack: 90, defense: 50, speed: 70 },
} satisfies Record<string, PokemonBaseStats>;

export const speciesNames = Object.keys(pokeApiBaseStats);

type TypeRelation = {
  doubleDamageTo?: PokemonType[];
  halfDamageTo?: PokemonType[];
  noDamageTo?: PokemonType[];
};

// Full main-series attacking type chart (gen 6+).
const typeRelations: Record<PokemonType, TypeRelation> = {
  normal: {
    halfDamageTo: ["rock", "steel"],
    noDamageTo: ["ghost"],
  },
  fire: {
    doubleDamageTo: ["grass", "ice", "bug", "steel"],
    halfDamageTo: ["fire", "water", "rock", "dragon"],
  },
  water: {
    doubleDamageTo: ["fire", "ground", "rock"],
    halfDamageTo: ["water", "grass", "dragon"],
  },
  electric: {
    doubleDamageTo: ["water", "flying"],
    halfDamageTo: ["electric", "grass", "dragon"],
    noDamageTo: ["ground"],
  },
  grass: {
    doubleDamageTo: ["water", "ground", "rock"],
    halfDamageTo: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
  },
  ice: {
    doubleDamageTo: ["grass", "ground", "flying", "dragon"],
    halfDamageTo: ["fire", "water", "ice", "steel"],
  },
  fighting: {
    doubleDamageTo: ["normal", "ice", "rock", "dark", "steel"],
    halfDamageTo: ["poison", "flying", "psychic", "bug", "fairy"],
    noDamageTo: ["ghost"],
  },
  poison: {
    doubleDamageTo: ["grass", "fairy"],
    halfDamageTo: ["poison", "ground", "rock", "ghost"],
    noDamageTo: ["steel"],
  },
  ground: {
    doubleDamageTo: ["fire", "electric", "poison", "rock", "steel"],
    halfDamageTo: ["grass", "bug"],
    noDamageTo: ["flying"],
  },
  flying: {
    doubleDamageTo: ["grass", "fighting", "bug"],
    halfDamageTo: ["electric", "rock", "steel"],
  },
  psychic: {
    doubleDamageTo: ["fighting", "poison"],
    halfDamageTo: ["psychic", "steel"],
    noDamageTo: ["dark"],
  },
  bug: {
    doubleDamageTo: ["grass", "psychic", "dark"],
    halfDamageTo: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
  },
  rock: {
    doubleDamageTo: ["fire", "ice", "flying", "bug"],
    halfDamageTo: ["fighting", "ground", "steel"],
  },
  ghost: {
    doubleDamageTo: ["psychic", "ghost"],
    halfDamageTo: ["dark"],
    noDamageTo: ["normal"],
  },
  dragon: {
    doubleDamageTo: ["dragon"],
    halfDamageTo: ["steel"],
    noDamageTo: ["fairy"],
  },
  dark: {
    doubleDamageTo: ["psychic", "ghost"],
    halfDamageTo: ["fighting", "dark", "fairy"],
  },
  steel: {
    doubleDamageTo: ["ice", "rock", "fairy"],
    halfDamageTo: ["fire", "water", "electric", "steel"],
  },
  fairy: {
    doubleDamageTo: ["fighting", "dragon", "dark"],
    halfDamageTo: ["fire", "poison", "steel"],
  },
};

const allyTemplates: UnitTemplate[] = [
  {
    id: "squirtle",
    name: "Squirtle",
    team: "ally",
    sourcePokemon: "squirtle",
    role: "support",
    rarity: 3,
    passive: {
      id: "team-first-aid",
      name: "Team First Aid",
      description: "Potion heals a little extra",
    },
    types: ["water"],
    color: "#5ad7ff",
    accent: "#ffe66a",
    shape: "horn",
    moves: [
      { id: "water-gun", name: "Water Gun", type: "water", cost: 2, power: 40, accent: "#78e1ff" },
      { id: "aqua-tail", name: "Aqua Tail", type: "water", cost: 3, power: 58, accent: "#38bdf8" },
      { id: "withdraw", name: "Withdraw", type: "water", cost: 1, power: 0, accent: "#7dd3fc", statChange: { stat: "defense", stages: 1, target: "self" } },
    ],
    syncMove: { id: "sync-hydro", name: "Sync Hydro Crest", type: "water", cost: 0, power: 115, accent: "#38bdf8" },
    trainerMove: {
      id: "potion",
      name: "Potion",
      kind: "heal",
      uses: 2,
      maxUses: 2,
      amount: 45,
      description: "Heal the weakest ally",
    },
  },
  {
    id: "bulbasaur",
    name: "Bulbasaur",
    team: "ally",
    sourcePokemon: "bulbasaur",
    role: "tech",
    rarity: 3,
    passive: {
      id: "toxic-focus",
      name: "Toxic Focus",
      description: "Status moves hit harder against afflicted targets",
    },
    types: ["grass", "poison"],
    color: "#6bdf91",
    accent: "#b8ff72",
    shape: "wing",
    moves: [
      { id: "vine-whip", name: "Vine Whip", type: "grass", cost: 2, power: 45, accent: "#8be66f" },
      { id: "poison-powder", name: "Poison Powder", type: "poison", cost: 1, power: 18, accent: "#d8b4fe", statusEffect: "poison" },
      { id: "growl", name: "Growl", type: "normal", cost: 1, power: 0, accent: "#e2e8f0", statChange: { stat: "attack", stages: -1, target: "enemy" } },
    ],
    syncMove: { id: "sync-bloom", name: "Sync Bloom Surge", type: "grass", cost: 0, power: 120, accent: "#86efac" },
    trainerMove: {
      id: "x-defense-all",
      name: "X Defense All",
      kind: "defenseBuff",
      uses: 2,
      maxUses: 2,
      stages: 1,
      target: "allAllies",
      description: "Raise allied Defense",
    },
  },
  {
    id: "charmander",
    name: "Charmander",
    team: "ally",
    sourcePokemon: "charmander",
    role: "strike",
    rarity: 3,
    passive: {
      id: "power-reserves",
      name: "Power Reserves",
      description: "Deals more damage below half HP",
    },
    types: ["fire"],
    color: "#ff8659",
    accent: "#ffd166",
    shape: "ember",
    moves: [
      { id: "ember", name: "Ember", type: "fire", cost: 2, power: 40, accent: "#ff9f5a", statusEffect: "burn" },
      { id: "flame-burst", name: "Flame Burst", type: "fire", cost: 3, power: 70, accent: "#fb923c", statusEffect: "burn" },
    ],
    syncMove: { id: "sync-flare", name: "Sync Flare Rush", type: "fire", cost: 0, power: 120, accent: "#fb923c" },
    trainerMove: {
      id: "x-attack",
      name: "X Attack",
      kind: "attackBuff",
      uses: 2,
      maxUses: 2,
      stages: 2,
      target: "self",
      description: "Raise own Attack",
    },
  },
  {
    id: "vulpix",
    name: "Vulpix",
    team: "ally",
    sourcePokemon: "vulpix",
    role: "tech",
    rarity: 3,
    passive: {
      id: "toxic-focus",
      name: "Searing Focus",
      description: "Status moves hit harder against afflicted targets",
    },
    types: ["fire"],
    color: "#ff9f6e",
    accent: "#ffd9a0",
    shape: "ember",
    moves: [
      { id: "vulpix-ember", name: "Ember", type: "fire", cost: 2, power: 40, accent: "#ff9f5a", statusEffect: "burn" },
      { id: "fire-spin", name: "Fire Spin", type: "fire", cost: 3, power: 55, accent: "#fb923c", statusEffect: "burn" },
      { id: "tail-whip", name: "Tail Whip", type: "normal", cost: 1, power: 0, accent: "#e2e8f0", statChange: { stat: "defense", stages: -1, target: "enemy" } },
    ],
    syncMove: { id: "sync-inferno-tails", name: "Sync Inferno Tails", type: "fire", cost: 0, power: 115, accent: "#fb923c" },
    trainerMove: {
      id: "x-attack-all",
      name: "X Attack All",
      kind: "attackBuff",
      uses: 2,
      maxUses: 2,
      stages: 1,
      target: "allAllies",
      description: "Raise allied Attack",
    },
  },
  {
    id: "machop",
    name: "Machop",
    team: "ally",
    sourcePokemon: "machop",
    role: "strike",
    rarity: 3,
    passive: {
      id: "power-reserves",
      name: "Second Wind",
      description: "Deals more damage below half HP",
    },
    types: ["fighting"],
    color: "#9fb6c9",
    accent: "#f1f5f9",
    shape: "horn",
    moves: [
      { id: "karate-chop", name: "Karate Chop", type: "fighting", cost: 2, power: 45, accent: "#fda4af" },
      { id: "low-sweep", name: "Low Sweep", type: "fighting", cost: 3, power: 62, accent: "#fb7185" },
      { id: "bulk-up", name: "Bulk Up", type: "fighting", cost: 1, power: 0, accent: "#fecaca", statChange: { stat: "attack", stages: 1, target: "self" } },
    ],
    syncMove: { id: "sync-mach-impact", name: "Sync Mach Impact", type: "fighting", cost: 0, power: 120, accent: "#fb7185" },
    trainerMove: {
      id: "x-attack",
      name: "X Attack",
      kind: "attackBuff",
      uses: 2,
      maxUses: 2,
      stages: 2,
      target: "self",
      description: "Raise own Attack",
    },
  },
  {
    id: "eevee",
    name: "Eevee",
    team: "ally",
    sourcePokemon: "eevee",
    role: "support",
    rarity: 4,
    passive: {
      id: "team-first-aid",
      name: "Helping Hand",
      description: "Potion heals a little extra",
    },
    types: ["normal"],
    color: "#c9a27a",
    accent: "#fff1d6",
    shape: "bloom",
    moves: [
      { id: "quick-attack", name: "Quick Attack", type: "normal", cost: 2, power: 40, accent: "#fef9c3" },
      { id: "swift", name: "Swift", type: "normal", cost: 3, power: 55, accent: "#fde68a" },
      { id: "charm", name: "Charm", type: "fairy", cost: 1, power: 0, accent: "#fbcfe8", statChange: { stat: "attack", stages: -1, target: "enemy" } },
    ],
    syncMove: { id: "sync-star-burst", name: "Sync Star Burst", type: "normal", cost: 0, power: 115, accent: "#fde68a" },
    trainerMove: {
      id: "potion",
      name: "Potion",
      kind: "heal",
      uses: 2,
      maxUses: 2,
      amount: 45,
      description: "Heal the weakest ally",
    },
  },
  {
    id: "abra",
    name: "Abra",
    team: "ally",
    sourcePokemon: "abra",
    role: "strike",
    rarity: 4,
    passive: {
      id: "power-reserves",
      name: "Psychic Surge",
      description: "Deals more damage below half HP",
    },
    types: ["psychic"],
    color: "#f5d76e",
    accent: "#ffe9a8",
    shape: "crystal",
    moves: [
      { id: "confusion", name: "Confusion", type: "psychic", cost: 2, power: 48, accent: "#f0abfc" },
      { id: "psybeam", name: "Psybeam", type: "psychic", cost: 3, power: 65, accent: "#e879f9" },
    ],
    syncMove: { id: "sync-mind-shock", name: "Sync Mind Shock", type: "psychic", cost: 0, power: 120, accent: "#e879f9" },
    trainerMove: {
      id: "x-attack",
      name: "X Attack",
      kind: "attackBuff",
      uses: 2,
      maxUses: 2,
      stages: 2,
      target: "self",
      description: "Raise own Attack",
    },
  },
  {
    id: "geodude",
    name: "Geodude",
    team: "ally",
    sourcePokemon: "geodude",
    role: "support",
    rarity: 3,
    passive: {
      id: "thick-guard",
      name: "Stone Wall",
      description: "Takes less damage while above half HP",
    },
    types: ["rock", "ground"],
    color: "#a8a29e",
    accent: "#d6d3d1",
    shape: "shell",
    moves: [
      { id: "rock-throw", name: "Rock Throw", type: "rock", cost: 2, power: 48, accent: "#d6d3d1" },
      { id: "magnitude", name: "Magnitude", type: "ground", cost: 3, power: 60, accent: "#d4a373" },
      { id: "harden", name: "Harden", type: "normal", cost: 1, power: 0, accent: "#e7e5e4", statChange: { stat: "defense", stages: 1, target: "self" } },
    ],
    syncMove: { id: "sync-rock-avalanche", name: "Sync Rock Avalanche", type: "rock", cost: 0, power: 118, accent: "#d6d3d1" },
    trainerMove: {
      id: "x-defense-all",
      name: "X Defense All",
      kind: "defenseBuff",
      uses: 2,
      maxUses: 2,
      stages: 1,
      target: "allAllies",
      description: "Raise allied Defense",
    },
  },
  {
    id: "jigglypuff",
    name: "Jigglypuff",
    team: "ally",
    sourcePokemon: "jigglypuff",
    role: "tech",
    rarity: 4,
    passive: {
      id: "debilitating-dust",
      name: "Lingering Lullaby",
      description: "Status conditions last longer",
    },
    types: ["normal", "fairy"],
    color: "#ffb3d9",
    accent: "#ffe3f2",
    shape: "bloom",
    moves: [
      { id: "disarming-voice", name: "Disarming Voice", type: "fairy", cost: 2, power: 42, accent: "#fbcfe8" },
      { id: "sing", name: "Sing", type: "normal", cost: 1, power: 15, accent: "#f9a8d4", statusEffect: "paralysis" },
    ],
    syncMove: { id: "sync-lullaby-crash", name: "Sync Lullaby Crash", type: "fairy", cost: 0, power: 112, accent: "#f9a8d4" },
    trainerMove: {
      id: "potion",
      name: "Potion",
      kind: "heal",
      uses: 2,
      maxUses: 2,
      amount: 45,
      description: "Heal the weakest ally",
    },
  },
  {
    id: "growlithe",
    name: "Growlithe",
    team: "ally",
    sourcePokemon: "growlithe",
    role: "strike",
    rarity: 3,
    passive: {
      id: "power-reserves",
      name: "Blazing Grit",
      description: "Deals more damage below half HP",
    },
    types: ["fire"],
    color: "#f97316",
    accent: "#fdba74",
    shape: "ember",
    moves: [
      { id: "bite", name: "Bite", type: "dark", cost: 2, power: 45, accent: "#a78bfa" },
      { id: "flame-wheel", name: "Flame Wheel", type: "fire", cost: 3, power: 58, accent: "#fb923c", statusEffect: "burn" },
    ],
    syncMove: { id: "sync-loyal-blaze", name: "Sync Loyal Blaze", type: "fire", cost: 0, power: 118, accent: "#fb923c" },
    trainerMove: {
      id: "x-attack",
      name: "X Attack",
      kind: "attackBuff",
      uses: 2,
      maxUses: 2,
      stages: 2,
      target: "self",
      description: "Raise own Attack",
    },
  },
  {
    id: "psyduck",
    name: "Psyduck",
    team: "ally",
    sourcePokemon: "psyduck",
    role: "tech",
    rarity: 3,
    passive: {
      id: "thick-guard",
      name: "Damp Composure",
      description: "Takes less damage while above half HP",
    },
    types: ["water"],
    color: "#fbd35f",
    accent: "#a5e8ff",
    shape: "horn",
    moves: [
      { id: "water-pulse", name: "Water Pulse", type: "water", cost: 2, power: 44, accent: "#78e1ff" },
      { id: "zen-headbutt", name: "Zen Headbutt", type: "psychic", cost: 3, power: 56, accent: "#f0abfc" },
      { id: "screech", name: "Screech", type: "normal", cost: 1, power: 0, accent: "#e2e8f0", statChange: { stat: "defense", stages: -1, target: "enemy" } },
    ],
    syncMove: { id: "sync-headache-wave", name: "Sync Headache Wave", type: "psychic", cost: 0, power: 114, accent: "#f0abfc" },
    trainerMove: {
      id: "x-defense-all",
      name: "X Defense All",
      kind: "defenseBuff",
      uses: 2,
      maxUses: 2,
      stages: 1,
      target: "allAllies",
      description: "Raise allied Defense",
    },
  },
  {
    id: "meowth",
    name: "Meowth",
    team: "ally",
    sourcePokemon: "meowth",
    role: "support",
    rarity: 3,
    passive: {
      id: "team-first-aid",
      name: "Pampered Care",
      description: "Potion heals a little extra",
    },
    types: ["normal"],
    color: "#f4e3c1",
    accent: "#fcd34d",
    shape: "crystal",
    moves: [
      { id: "scratch", name: "Scratch", type: "normal", cost: 2, power: 40, accent: "#fef9c3" },
      { id: "pay-day", name: "Pay Day", type: "normal", cost: 3, power: 54, accent: "#fcd34d" },
      { id: "meowth-growl", name: "Growl", type: "normal", cost: 1, power: 0, accent: "#e2e8f0", statChange: { stat: "attack", stages: -1, target: "enemy" } },
    ],
    syncMove: { id: "sync-jackpot", name: "Sync Jackpot Strike", type: "normal", cost: 0, power: 112, accent: "#fcd34d" },
    trainerMove: {
      id: "potion",
      name: "Potion",
      kind: "heal",
      uses: 2,
      maxUses: 2,
      amount: 45,
      description: "Heal the weakest ally",
    },
  },
  {
    id: "cubone",
    name: "Cubone",
    team: "ally",
    sourcePokemon: "cubone",
    role: "strike",
    rarity: 4,
    passive: {
      id: "thick-guard",
      name: "Bone Armor",
      description: "Takes less damage while above half HP",
    },
    types: ["ground"],
    color: "#d4a373",
    accent: "#f1f5f9",
    shape: "shell",
    moves: [
      { id: "bone-club", name: "Bone Club", type: "ground", cost: 2, power: 50, accent: "#e7e5e4" },
      { id: "bonemerang", name: "Bonemerang", type: "ground", cost: 3, power: 64, accent: "#d6d3d1" },
    ],
    syncMove: { id: "sync-bone-rush", name: "Sync Bone Rush", type: "ground", cost: 0, power: 120, accent: "#d4a373" },
    trainerMove: {
      id: "x-attack",
      name: "X Attack",
      kind: "attackBuff",
      uses: 2,
      maxUses: 2,
      stages: 2,
      target: "self",
      description: "Raise own Attack",
    },
  },
  {
    id: "haunter",
    name: "Haunter",
    team: "ally",
    sourcePokemon: "haunter",
    role: "tech",
    rarity: 4,
    passive: {
      id: "debilitating-dust",
      name: "Creeping Dread",
      description: "Status conditions last longer",
    },
    types: ["ghost", "poison"],
    color: "#8b5cf6",
    accent: "#d8b4fe",
    shape: "bloom",
    moves: [
      { id: "lick", name: "Lick", type: "ghost", cost: 2, power: 42, accent: "#c4b5fd", statusEffect: "paralysis" },
      { id: "smog", name: "Smog", type: "poison", cost: 1, power: 16, accent: "#d8b4fe", statusEffect: "poison" },
      { id: "night-shade", name: "Night Shade", type: "ghost", cost: 3, power: 58, accent: "#a78bfa" },
    ],
    syncMove: { id: "sync-phantom-grip", name: "Sync Phantom Grip", type: "ghost", cost: 0, power: 116, accent: "#a78bfa" },
    trainerMove: {
      id: "x-attack-all",
      name: "X Attack All",
      kind: "attackBuff",
      uses: 2,
      maxUses: 2,
      stages: 1,
      target: "allAllies",
      description: "Raise allied Attack",
    },
  },
  {
    id: "dratini",
    name: "Dratini",
    team: "ally",
    sourcePokemon: "dratini",
    role: "strike",
    rarity: 5,
    passive: {
      id: "power-reserves",
      name: "Rising Fury",
      description: "Deals more damage below half HP",
    },
    types: ["dragon"],
    color: "#60a5fa",
    accent: "#bfdbfe",
    shape: "wing",
    moves: [
      { id: "twister", name: "Twister", type: "dragon", cost: 2, power: 48, accent: "#93c5fd" },
      { id: "dragon-pulse", name: "Dragon Pulse", type: "dragon", cost: 3, power: 66, accent: "#60a5fa" },
      { id: "dragon-dance", name: "Dragon Dance", type: "dragon", cost: 1, power: 0, accent: "#bfdbfe", statChange: { stat: "attack", stages: 1, target: "self" } },
    ],
    syncMove: { id: "sync-dragon-ascent", name: "Sync Dragon Ascent", type: "dragon", cost: 0, power: 125, accent: "#60a5fa" },
    trainerMove: {
      id: "x-attack",
      name: "X Attack",
      kind: "attackBuff",
      uses: 2,
      maxUses: 2,
      stages: 2,
      target: "self",
      description: "Raise own Attack",
    },
  },
  {
    id: "lapras",
    name: "Lapras",
    team: "ally",
    sourcePokemon: "lapras",
    role: "support",
    rarity: 5,
    passive: {
      id: "team-first-aid",
      name: "Soothing Melody",
      description: "Potion heals a little extra",
    },
    types: ["water", "ice"],
    color: "#5eead4",
    accent: "#ccfbf1",
    shape: "shell",
    moves: [
      { id: "lapras-water-pulse", name: "Water Pulse", type: "water", cost: 2, power: 44, accent: "#78e1ff" },
      { id: "ice-beam", name: "Ice Beam", type: "ice", cost: 3, power: 62, accent: "#a5f3fc" },
      { id: "mist", name: "Mist", type: "ice", cost: 1, power: 0, accent: "#ccfbf1", statChange: { stat: "defense", stages: 1, target: "self" } },
    ],
    syncMove: { id: "sync-glacial-song", name: "Sync Glacial Song", type: "ice", cost: 0, power: 122, accent: "#a5f3fc" },
    trainerMove: {
      id: "potion",
      name: "Potion",
      kind: "heal",
      uses: 2,
      maxUses: 2,
      amount: 45,
      description: "Heal the weakest ally",
    },
  },
];

const BOSS_AURA_PASSIVE: PassiveSkill = {
  id: "boss-aura",
  name: "Boss Aura",
  description: "Deals more damage and takes less damage",
};

const enemyTemplates: UnitTemplate[] = [
  {
    id: "pikachu",
    name: "Pikachu",
    team: "enemy",
    sourcePokemon: "pikachu",
    role: "strike",
    rarity: 3,
    passive: {
      id: "fast-entry",
      name: "Fast Entry",
      description: "Starts battle with a shorter cooldown",
    },
    types: ["electric"],
    position: [3.3, 0, 1.7],
    color: "#9b8cff",
    accent: "#d4c5ff",
    shape: "crystal",
    moves: [
      { id: "thunder-shock", name: "Thunder Shock", type: "electric", cost: 0, power: 40, accent: "#f8d95f", statusEffect: "paralysis" },
      { id: "electro-ball", name: "Electro Ball", type: "electric", cost: 0, power: 56, accent: "#fde047", statusEffect: "paralysis" },
    ],
    syncMove: { id: "sync-bolt", name: "Sync Bolt", type: "electric", cost: 0, power: 105, accent: "#fde047" },
    trainerMove: null,
  },
  {
    id: "snorlax",
    name: "Snorlax",
    team: "enemy",
    sourcePokemon: "snorlax",
    role: "support",
    rarity: 4,
    passive: {
      id: "thick-guard",
      name: "Thick Guard",
      description: "Takes less damage while above half HP",
    },
    types: ["normal"],
    position: [3.7, 0, 0],
    color: "#b6d66f",
    accent: "#ffb86b",
    shape: "shell",
    moves: [
      { id: "body-slam", name: "Body Slam", type: "normal", cost: 0, power: 45, accent: "#dbeafe" },
      { id: "heavy-slam", name: "Heavy Slam", type: "normal", cost: 0, power: 62, accent: "#f8fafc" },
    ],
    syncMove: { id: "sync-impact", name: "Sync Impact", type: "normal", cost: 0, power: 125, accent: "#f8fafc" },
    trainerMove: null,
  },
  {
    id: "butterfree",
    name: "Butterfree",
    team: "enemy",
    sourcePokemon: "butterfree",
    role: "tech",
    rarity: 3,
    passive: {
      id: "debilitating-dust",
      name: "Debilitating Dust",
      description: "Status conditions last longer",
    },
    types: ["bug", "flying"],
    position: [3.3, 0, -1.7],
    color: "#ff7ac8",
    accent: "#94f2ff",
    shape: "bloom",
    moves: [
      { id: "gust", name: "Gust", type: "flying", cost: 0, power: 40, accent: "#c7d2fe" },
      { id: "stun-spore", name: "Stun Spore", type: "bug", cost: 0, power: 20, accent: "#f0abfc", statusEffect: "paralysis" },
    ],
    syncMove: { id: "sync-gale", name: "Sync Gale", type: "flying", cost: 0, power: 110, accent: "#c4b5fd" },
    trainerMove: null,
  },
  enemyFromAlly("vulpix", { id: "enemy-vulpix", name: "Vulpix" }),
  enemyFromAlly("machop", { id: "enemy-machop", name: "Machop" }),
  enemyFromAlly("geodude", { id: "enemy-geodude", name: "Geodude" }),
  enemyFromAlly("abra", { id: "enemy-abra", name: "Abra" }),
  enemyFromAlly("haunter", { id: "enemy-haunter", name: "Haunter" }),
  enemyFromAlly("jigglypuff", { id: "enemy-jigglypuff", name: "Jigglypuff" }),
  enemyFromAlly("psyduck", { id: "enemy-psyduck", name: "Psyduck" }),
  enemyFromAlly("meowth", { id: "enemy-meowth", name: "Meowth" }),
  enemyFromAlly("cubone", { id: "enemy-cubone", name: "Cubone" }),
  enemyFromAlly("dratini", { id: "boss-dratini", name: "Boss Dratini", passive: BOSS_AURA_PASSIVE }),
  enemyFromAlly("lapras", { id: "boss-lapras", name: "Boss Lapras", passive: BOSS_AURA_PASSIVE }),
  enemyFromAlly("machop", { id: "boss-machop", name: "Boss Machop", passive: BOSS_AURA_PASSIVE }),
];

type EnemyTeamPreset = {
  id: string;
  name: string;
  templateIds: [string, string, string];
  boss?: boolean;
};

const regularEnemyTeams: EnemyTeamPreset[] = [
  { id: "kanto-rivals", name: "Kanto Rival Trio", templateIds: ["pikachu", "snorlax", "butterfree"] },
  { id: "ember-dojo", name: "Ember Dojo Squad", templateIds: ["enemy-vulpix", "enemy-machop", "enemy-geodude"] },
  { id: "mind-garden", name: "Mind Garden Squad", templateIds: ["enemy-abra", "enemy-haunter", "enemy-jigglypuff"] },
  { id: "shoreline-rogues", name: "Shoreline Rogue Squad", templateIds: ["enemy-psyduck", "enemy-meowth", "enemy-cubone"] },
];

const bossEnemyTeams: EnemyTeamPreset[] = [
  { id: "aurora-boss", name: "Aurora Boss Team", templateIds: ["boss-dratini", "boss-lapras", "boss-machop"], boss: true },
];

const allEnemyTeams = [...regularEnemyTeams, ...bossEnemyTeams];

export function enemyTeamForStage(stage: number): EnemyTeamPreset {
  const normalizedStage = Math.max(1, Math.floor(stage));
  if (normalizedStage % 5 === 0) {
    return bossEnemyTeams[Math.floor(normalizedStage / 5 - 1) % bossEnemyTeams.length];
  }
  return regularEnemyTeams[(normalizedStage - 1) % regularEnemyTeams.length];
}

export function dailyChallengeKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function dailyChallengeStage(dateKey: string) {
  return 4 + (hashBattleKey(dateKey) % 8);
}

export function enemyTeamForDaily(dateKey: string): EnemyTeamPreset {
  return allEnemyTeams[hashBattleKey(`daily-team:${dateKey}`) % allEnemyTeams.length];
}

function findEnemyTeam(teamId: string | undefined, stage: number, battleMode: BattleMode, dailyKey: string | undefined) {
  if (teamId) {
    const found = allEnemyTeams.find((team) => team.id === teamId);
    if (found) {
      return found;
    }
  }
  if (battleMode === "daily" && dailyKey) {
    return enemyTeamForDaily(dailyKey);
  }
  return enemyTeamForStage(stage);
}

function templatesForEnemyTeam(team: EnemyTeamPreset) {
  return team.templateIds.map((templateId) => {
    const template = enemyTemplates.find((candidate) => candidate.id === templateId);
    if (!template) {
      throw new Error(`Missing enemy template: ${templateId}`);
    }
    return template;
  });
}

function enemyFromAlly(sourceId: string, override: Partial<UnitTemplate> & { id: string }): UnitTemplate {
  const base = allyTemplates.find((template) => template.id === sourceId);
  if (!base) {
    throw new Error(`Missing ally template for enemy: ${sourceId}`);
  }
  return {
    ...base,
    team: "enemy",
    trainerMove: null,
    position: undefined,
    ...override,
    id: override.id,
    sourcePokemon: override.sourcePokemon ?? base.sourcePokemon,
  };
}

function hashBattleKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const UNITY_BURST_MOVE: Move = { id: "unity-burst", name: "Unity Burst", type: "normal", cost: 0, power: 0, accent: "#fef08a" };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const DEFAULT_ALLY_IDS = ["squirtle", "bulbasaur", "charmander"];

const ALLY_SLOTS: [number, number, number][] = [
  [-3.3, 0, 1.7],
  [-3.7, 0, 0],
  [-3.3, 0, -1.7],
];

const ENEMY_SLOTS: [number, number, number][] = [
  [3.3, 0, 1.7],
  [3.7, 0, 0],
  [3.3, 0, -1.7],
];

type StatScale = { hp: number; attack: number; defense: number };

export type AllyOption = {
  id: string;
  name: string;
  role: BattleRole;
  rarity: Rarity;
  types: PokemonType[];
  passive: PassiveSkill;
  color: string;
  moveNames: string[];
  baseStats: PokemonBaseStats;
};

export function getAllyOptions(speciesStats?: Record<string, PokemonBaseStats>): AllyOption[] {
  const statsLookup: Record<string, PokemonBaseStats> = { ...pokeApiBaseStats, ...(speciesStats ?? {}) };
  return allyTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    role: template.role,
    rarity: template.rarity,
    types: template.types,
    passive: template.passive,
    color: template.color,
    moveNames: template.moves.map((move) => move.name),
    baseStats: statsLookup[template.sourcePokemon],
  }));
}

export const createInitialBattleState = (seed?: number, config?: Partial<BattleConfig>): BattleState => {
  const allyIds = config?.allyIds && config.allyIds.length > 0 ? config.allyIds.slice(0, ALLY_SLOTS.length) : DEFAULT_ALLY_IDS;
  const battleMode = config?.battleMode ?? "ladder";
  const dailyKey = config?.dailyKey;
  const stage = battleMode === "daily" && dailyKey ? dailyChallengeStage(dailyKey) : Math.max(1, Math.floor(config?.stage ?? 1));
  const enemyTeam = findEnemyTeam(config?.enemyTeamId, stage, battleMode, dailyKey);
  const activeEnemyTemplates = templatesForEnemyTeam(enemyTeam);
  const statsLookup: Record<string, PokemonBaseStats> = { ...pokeApiBaseStats, ...(config?.speciesStats ?? {}) };
  const enemyScale: StatScale = {
    hp: 1 + BALANCE.stageEnemyHpGrowth * (stage - 1),
    attack: 1 + BALANCE.stageEnemyAttackGrowth * (stage - 1),
    defense: 1 + BALANCE.stageEnemyDefenseGrowth * (stage - 1),
  };
  const allies = allyIds.map((allyId, index) => {
    const template = allyTemplates.find((candidate) => candidate.id === allyId) ?? allyTemplates[index];
    const level = clamp(Math.floor(config?.allyLevels?.[template.id] ?? 1), 1, BALANCE.maxAllyLevel);
    const levelFactor = 1 + BALANCE.allyLevelGrowth * (level - 1);
    return makeUnit(
      template,
      ALLY_SLOTS[index % ALLY_SLOTS.length],
      statsLookup,
      { hp: levelFactor, attack: levelFactor, defense: levelFactor },
      level,
    );
  });
  const enemies = activeEnemyTemplates.map((template, index) =>
    makeUnit(template, template.position ?? ENEMY_SLOTS[index % ENEMY_SLOTS.length], statsLookup, enemyScale, stage),
  );

  return {
    units: [...allies, ...enemies],
    enemyCooldowns: Object.fromEntries(
      activeEnemyTemplates.map((template) => [template.id, initialEnemyCooldown(template, statsLookup)]),
    ),
    config: {
      allyIds: allies.map((unit) => unit.id),
      stage,
      battleMode,
      dailyKey,
      enemyTeamId: enemyTeam.id,
      enemyTeamName: enemyTeam.name,
      speciesStats: config?.speciesStats,
      allyLevels: config?.allyLevels,
    },
    selectedAllyId: allies[0]?.id ?? DEFAULT_ALLY_IDS[0],
    selectedEnemyId: enemies[1]?.id ?? enemies[0]?.id ?? "snorlax",
    targetMode: "auto",
    moveGauge: 2,
    maxMoveGauge: 6,
    unityGauge: 0,
    maxUnityGauge: 3,
    enemySyncCountdown: 3,
    maxEnemySyncCountdown: 3,
    enemyTrainer: {
      name: "Rival Trainer",
      healUses: 2,
      maxHealUses: 2,
      healAmount: 55,
      buffUses: 1,
      maxBuffUses: 1,
      buffStages: 1,
    },
    actionQueue: [],
    feedback: [],
    syncBoosts: { ally: 0, enemy: 0 },
    statusTickTimer: BALANCE.statusTickInterval,
    status: "playing",
    paused: false,
    timeScale: 1,
    log: [
      battleMode === "daily"
        ? `Daily ${dailyKey ?? "challenge"} - ${enemyTeam.name} started.`
        : `Stage ${stage} - ${enemyTeam.name} started.`,
    ],
    elapsed: 0,
    rng: seed ?? Math.floor(Math.random() * 0xffffffff),
  };
};

function computeSpeed(baseStats: PokemonBaseStats) {
  return Number((0.72 + baseStats.speed / 140).toFixed(2));
}

function initialEnemyCooldown(template: UnitTemplate, statsLookup: Record<string, PokemonBaseStats>) {
  const speed = computeSpeed(statsLookup[template.sourcePokemon]);
  return Math.max(0.7, 1.8 + (1.4 / speed) * 2 - (template.passive.id === "fast-entry" ? 0.7 : 0));
}

function makeUnit(
  template: UnitTemplate,
  position: [number, number, number],
  statsLookup: Record<string, PokemonBaseStats>,
  scale: StatScale,
  level = 1,
): Unit {
  const baseStats = statsLookup[template.sourcePokemon];
  const maxHp = Math.round((baseStats.hp * 0.65 + 82) * scale.hp);

  return {
    ...template,
    level,
    position,
    sourcePokemon: titleCase(template.sourcePokemon),
    baseStats,
    maxHp,
    hp: maxHp,
    attack: Math.round((baseStats.attack * 0.38 + 12) * scale.attack),
    defense: Math.round((baseStats.defense * 0.18 + 4) * scale.defense),
    attackStage: 0,
    defenseStage: 0,
    statusCondition: null,
    statusTimer: 0,
    speed: computeSpeed(baseStats),
    moves: template.moves,
    syncCountdown: BALANCE.syncCountdownMax,
    hitFlash: 0,
    actionPulse: 0,
  };
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Linear congruential generator: deterministic, seedable, no globals.
function nextRandom(seed: number): [value: number, nextSeed: number] {
  const nextSeed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [nextSeed / 0x100000000, nextSeed];
}

// Returns the original array when no element changed, so React.memo consumers
// can bail out instead of re-rendering every tick.
function mapStable<T>(items: T[], fn: (item: T) => T): T[] {
  let changed = false;
  const next = items.map((item) => {
    const mapped = fn(item);
    if (mapped !== item) {
      changed = true;
    }
    return mapped;
  });
  return changed ? next : items;
}

export const tickBattle = (deltaSeconds: number): BattleAction => ({
  type: "tick",
  deltaSeconds,
});

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  if (action.type === "restart") {
    return createInitialBattleState(undefined, state.config);
  }

  if (action.type === "selectAlly") {
    const unit = findLivingUnit(state, action.unitId, "ally");
    return unit ? { ...state, selectedAllyId: action.unitId } : state;
  }

  if (action.type === "selectEnemy") {
    const unit = findLivingUnit(state, action.unitId, "enemy");
    return unit ? { ...state, selectedEnemyId: action.unitId } : state;
  }

  if (action.type === "setTargetMode") {
    return { ...state, targetMode: action.mode };
  }

  if (action.type === "togglePause") {
    return { ...state, paused: !state.paused };
  }

  if (action.type === "cycleTimeScale") {
    return { ...state, timeScale: state.timeScale >= 2 ? 1 : 2 };
  }

  if (state.status !== "playing") {
    return state;
  }

  if (state.paused) {
    return state;
  }

  if (action.type === "useMove") {
    return performPlayerMove(state, action.moveId);
  }

  if (action.type === "useTrainerMove") {
    return performPlayerTrainerMove(state);
  }

  if (action.type === "useSyncMove") {
    return performPlayerSyncMove(state);
  }

  if (action.type === "useUnityAttack") {
    return performUnityAttack(state);
  }

  if (action.type === "tick") {
    return tickPlayingBattle(state, action.deltaSeconds * state.timeScale);
  }

  return state;
}

function tickPlayingBattle(state: BattleState, deltaSeconds: number): BattleState {
  const statusTickTimer = state.statusTickTimer - deltaSeconds;
  const paralyzedAllies = teamUnits(state, "ally").filter(
    (unit) => isAlive(unit) && unit.statusCondition === "paralysis",
  ).length;
  const gaugeFactor = Math.max(
    BALANCE.minParalysisGaugeFactor,
    1 - paralyzedAllies * BALANCE.paralysisGaugePenaltyPerAlly,
  );

  const enemyCooldowns: Record<string, number> = {};
  for (const unit of state.units) {
    if (unit.team !== "enemy") {
      continue;
    }
    const current = state.enemyCooldowns[unit.id] ?? 0;
    enemyCooldowns[unit.id] = isAlive(unit)
      ? Math.max(
          0,
          current - deltaSeconds * unit.speed * (unit.statusCondition === "paralysis" ? BALANCE.paralysisCooldownFactor : 1),
        )
      : current;
  }

  let next: BattleState = {
    ...state,
    elapsed: state.elapsed + deltaSeconds,
    statusTickTimer,
    moveGauge: clamp(state.moveGauge + deltaSeconds * BALANCE.gaugeFillRate * gaugeFactor, 0, state.maxMoveGauge),
    enemyCooldowns,
    actionQueue:
      state.actionQueue.length === 0
        ? state.actionQueue
        : state.actionQueue.map((queued) => ({ ...queued, delay: queued.delay - deltaSeconds })),
    feedback:
      state.feedback.length === 0
        ? state.feedback
        : state.feedback.map((entry) => ({ ...entry, ttl: entry.ttl - deltaSeconds })).filter((entry) => entry.ttl > 0),
    units: mapStable(state.units, (unit) => {
      const hitFlash = Math.max(0, unit.hitFlash - deltaSeconds * 3.5);
      const actionPulse = Math.max(0, unit.actionPulse - deltaSeconds * 2.6);
      if (hitFlash === unit.hitFlash && actionPulse === unit.actionPulse) {
        return unit;
      }
      return { ...unit, hitFlash, actionPulse };
    }),
  };

  if (statusTickTimer <= 0) {
    next = tickStatuses({
      ...next,
      statusTickTimer: BALANCE.statusTickInterval,
      syncBoosts: {
        ally: Math.max(0, next.syncBoosts.ally - 1),
        enemy: Math.max(0, next.syncBoosts.enemy - 1),
      },
    });
  }

  const readyActions = next.actionQueue.filter((queued) => queued.delay <= 0);
  if (readyActions.length > 0) {
    next = { ...next, actionQueue: next.actionQueue.filter((queued) => queued.delay > 0) };
  }
  for (const queued of readyActions) {
    next = queued.unity
      ? applyUnityAttack({ state: next, actorId: queued.actorId, targetId: queued.targetId, move: queued.move })
      : applyAttack({
          state: next,
          actorId: queued.actorId,
          targetId: queued.targetId,
          move: queued.move,
          sync: queued.sync,
        });
  }

  const readyEnemy = next.units.find(
    (unit) => unit.team === "enemy" && isAlive(unit) && (next.enemyCooldowns[unit.id] ?? 0) <= 0,
  );
  if (readyEnemy) {
    if (next.enemySyncCountdown <= 0) {
      next = performEnemySyncMove(next, readyEnemy.id);
    } else {
      const trainerAction = chooseEnemyTrainerAction(next);
      next = trainerAction
        ? performEnemyTrainerAction(next, readyEnemy.id, trainerAction)
        : performEnemyMove(next, readyEnemy.id);
    }
  }

  return normalizeBattle(next);
}

type EnemyTrainerAction = { kind: "heal"; targetId: string } | { kind: "attackBuff"; targetId: string };

// The rival trainer spends the ready enemy's action: heal a badly hurt teammate,
// or pump the strongest attacker right before an enemy sync move lands.
function chooseEnemyTrainerAction(state: BattleState): EnemyTrainerAction | null {
  const enemies = teamUnits(state, "enemy").filter(isAlive);
  if (enemies.length === 0) {
    return null;
  }

  if (state.enemyTrainer.healUses > 0) {
    const weakest = [...enemies].sort((left, right) => left.hp / left.maxHp - right.hp / right.maxHp)[0];
    if (weakest && weakest.hp / weakest.maxHp < BALANCE.enemyHealThreshold) {
      return { kind: "heal", targetId: weakest.id };
    }
  }

  if (state.enemyTrainer.buffUses > 0 && state.enemySyncCountdown <= 1) {
    const strongest = [...enemies].sort((left, right) => right.attack - left.attack)[0];
    if (strongest) {
      return { kind: "attackBuff", targetId: strongest.id };
    }
  }

  return null;
}

function performEnemyTrainerAction(state: BattleState, actingEnemyId: string, action: EnemyTrainerAction): BattleState {
  const target = state.units.find((unit) => unit.id === action.targetId);
  if (!target) {
    return normalizeBattle(state);
  }

  const trainer = state.enemyTrainer;
  const enemyCooldowns = { ...state.enemyCooldowns, [actingEnemyId]: BALANCE.enemyTrainerActionCooldown };

  if (action.kind === "heal") {
    const healedHp = clamp(target.hp + trainer.healAmount, 0, target.maxHp);
    const healFeedback: BattleFeedback = {
      id: makeFeedbackId(state, target.id, "enemy-heal"),
      unitId: target.id,
      text: `+${healedHp - target.hp}`,
      kind: "status",
      ttl: 1.25,
    };
    return normalizeBattle({
      ...state,
      enemyCooldowns,
      enemyTrainer: { ...trainer, healUses: trainer.healUses - 1 },
      units: state.units.map((unit) => (unit.id === target.id ? { ...unit, hp: healedHp, hitFlash: 0.7 } : unit)),
      log: [`${trainer.name} used Super Potion. ${target.name} recovered ${healedHp - target.hp} HP.`, ...state.log].slice(0, BALANCE.logLimit),
      feedback: [healFeedback, ...state.feedback].slice(0, BALANCE.feedbackLimit),
    });
  }

  const buffFeedback: BattleFeedback = {
    id: makeFeedbackId(state, target.id, "enemy-buff"),
    unitId: target.id,
    text: `ATK +${trainer.buffStages}`,
    kind: "status",
    ttl: 1.25,
  };
  return normalizeBattle({
    ...state,
    enemyCooldowns,
    enemyTrainer: { ...trainer, buffUses: trainer.buffUses - 1 },
    units: state.units.map((unit) =>
      unit.id === target.id
        ? { ...unit, attackStage: clamp(unit.attackStage + trainer.buffStages, -3, 6), actionPulse: 0.8 }
        : unit,
    ),
    log: [`${trainer.name} used X Attack. ${target.name}'s Attack rose.`, ...state.log].slice(0, BALANCE.logLimit),
    feedback: [buffFeedback, ...state.feedback].slice(0, BALANCE.feedbackLimit),
  });
}

function resolvePlayerActor(state: BattleState) {
  return findLivingUnit(state, state.selectedAllyId, "ally") ?? firstLivingUnit(state, "ally");
}

function resolvePlayerTarget(state: BattleState, actor: Unit, move: Move) {
  if (move.statChange?.target === "self") {
    return actor;
  }
  if (isUtilityMove(move)) {
    // Debuffs aim at the enemy whose offense matters most, not whoever takes the most damage.
    return state.targetMode === "manual"
      ? findLivingUnit(state, state.selectedEnemyId, "enemy") ?? firstLivingUnit(state, "enemy")
      : chooseDebuffTarget(state);
  }
  return state.targetMode === "manual"
    ? findLivingUnit(state, state.selectedEnemyId, "enemy") ?? firstLivingUnit(state, "enemy")
    : chooseBestTargetForMove(state, actor, move, "enemy");
}

function isUtilityMove(move: Move) {
  return Boolean(move.statChange) && move.power === 0;
}

function chooseDebuffTarget(state: BattleState) {
  return teamUnits(state, "enemy")
    .filter(isAlive)
    .sort(
      (left, right) =>
        right.attack * (1 + right.attackStage * BALANCE.stageMultiplier) -
        left.attack * (1 + left.attackStage * BALANCE.stageMultiplier),
    )[0];
}

function performPlayerMove(state: BattleState, moveId: string): BattleState {
  const actor = resolvePlayerActor(state);
  if (!actor) {
    return normalizeBattle(state);
  }

  const move = actor.moves.find((candidate) => candidate.id === moveId);
  if (!move || state.moveGauge < move.cost) {
    return state;
  }

  const target = resolvePlayerTarget(state, actor, move);
  if (!target) {
    return normalizeBattle(state);
  }

  return enqueueAttack({
    state: {
      ...state,
      moveGauge: state.moveGauge - move.cost,
      unityGauge: chargeUnity(state, 1),
      units: state.units.map((unit) =>
        unit.id === actor.id ? { ...unit, syncCountdown: Math.max(0, unit.syncCountdown - 1) } : unit,
      ),
    },
    actorId: actor.id,
    targetId: target.id,
    move,
    delay: BALANCE.playerAttackDelay,
  });
}

function performPlayerTrainerMove(state: BattleState): BattleState {
  const actor = resolvePlayerActor(state);
  const trainerMove = actor?.trainerMove;
  if (!actor || !trainerMove || trainerMove.uses <= 0) {
    return state;
  }

  const units = state.units.map((unit) => {
    if (unit.id === actor.id && unit.trainerMove) {
      return {
        ...unit,
        trainerMove: { ...unit.trainerMove, uses: unit.trainerMove.uses - 1 },
        syncCountdown: Math.max(0, unit.syncCountdown - 1),
      };
    }
    return unit;
  });

  let next: BattleState = {
    ...state,
    units,
  };

  if (trainerMove.kind === "heal") {
    const target = teamUnits(next, "ally")
      .filter(isAlive)
      .sort((left, right) => left.hp / left.maxHp - right.hp / right.maxHp)[0];

    if (!target) {
      return next;
    }

    const healAmount = trainerMove.amount + (actor.passive.id === "team-first-aid" ? 10 : 0);
    const healedHp = clamp(target.hp + healAmount, 0, target.maxHp);
    next = {
      ...next,
      unityGauge: chargeUnity(next, 1),
      units: next.units.map((unit) => (unit.id === target.id ? { ...unit, hp: healedHp, hitFlash: 0.7 } : unit)),
      log: [`${actor.name} used ${trainerMove.name}. ${target.name} recovered ${healedHp - target.hp} HP.`, ...next.log].slice(0, BALANCE.logLimit),
    };
    return normalizeBattle(next);
  }

  const affectedIds =
    trainerMove.target === "allAllies"
      ? teamUnits(next, "ally").filter(isAlive).map((unit) => unit.id)
      : [actor.id];

  next = {
    ...next,
    unityGauge: chargeUnity(next, 1),
    units: next.units.map((unit) => {
      if (!affectedIds.includes(unit.id)) {
        return unit;
      }
      if (trainerMove.kind === "attackBuff") {
        return { ...unit, attackStage: clamp(unit.attackStage + trainerMove.stages, -3, 6), actionPulse: 0.8 };
      }
      return { ...unit, defenseStage: clamp(unit.defenseStage + trainerMove.stages, -3, 6), actionPulse: 0.8 };
    }),
    log: [`${actor.name} used ${trainerMove.name}. ${trainerMove.description}.`, ...next.log].slice(0, BALANCE.logLimit),
  };

  return normalizeBattle(next);
}

function performPlayerSyncMove(state: BattleState): BattleState {
  const actor = resolvePlayerActor(state);
  if (!actor || actor.syncCountdown > 0) {
    return state;
  }

  const target = resolvePlayerTarget(state, actor, actor.syncMove);
  if (!target) {
    return normalizeBattle(state);
  }

  return enqueueAttack({
    state: {
      ...state,
      unityGauge: chargeUnity(state, 1),
      syncBoosts: { ...state.syncBoosts, ally: BALANCE.syncBoostStacks },
      units: state.units.map((unit) =>
        unit.id === actor.id ? { ...unit, syncCountdown: BALANCE.syncCountdownMax } : unit,
      ),
    },
    actorId: actor.id,
    targetId: target.id,
    move: actor.syncMove,
    sync: true,
    delay: BALANCE.playerSyncDelay,
  });
}

function performUnityAttack(state: BattleState): BattleState {
  if (state.unityGauge < state.maxUnityGauge) {
    return state;
  }

  const actor = resolvePlayerActor(state);
  const target =
    state.targetMode === "manual"
      ? findLivingUnit(state, state.selectedEnemyId, "enemy") ?? chooseUnityTarget(state)
      : chooseUnityTarget(state);
  if (!actor || !target) {
    return normalizeBattle(state);
  }

  return enqueueAttack({
    state: { ...state, unityGauge: 0 },
    actorId: actor.id,
    targetId: target.id,
    move: UNITY_BURST_MOVE,
    delay: BALANCE.unityAttackDelay,
    unity: true,
  });
}

function performEnemyMove(state: BattleState, enemyId: string): BattleState {
  const actor = findLivingUnit(state, enemyId, "enemy");
  if (!actor) {
    return normalizeBattle(state);
  }

  const action = chooseEnemyAction(state, actor);
  if (!action) {
    return normalizeBattle(state);
  }

  const attacked = enqueueAttack({
    state: { ...state, enemySyncCountdown: Math.max(0, state.enemySyncCountdown - 1) },
    actorId: actor.id,
    targetId: action.target.id,
    move: action.move,
    delay: BALANCE.enemyAttackDelay,
  });

  return {
    ...attacked,
    enemyCooldowns: {
      ...attacked.enemyCooldowns,
      [actor.id]: BALANCE.enemyCooldownBase + BALANCE.enemyCooldownSpeedFactor / Math.max(0.6, actor.speed),
    },
  };
}

function performEnemySyncMove(state: BattleState, enemyId: string): BattleState {
  const actor = findLivingUnit(state, enemyId, "enemy");
  if (!actor) {
    return normalizeBattle(state);
  }

  const target = chooseBestTargetForMove(state, actor, actor.syncMove, "ally");
  if (!target) {
    return normalizeBattle(state);
  }

  const queued = enqueueAttack({
    state: {
      ...state,
      enemySyncCountdown: state.maxEnemySyncCountdown,
      syncBoosts: { ...state.syncBoosts, enemy: BALANCE.syncBoostStacks },
    },
    actorId: actor.id,
    targetId: target.id,
    move: actor.syncMove,
    sync: true,
    delay: BALANCE.enemySyncDelay,
  });

  return {
    ...queued,
    enemyCooldowns: {
      ...queued.enemyCooldowns,
      [actor.id]: BALANCE.enemySyncCooldownBase + BALANCE.enemyCooldownSpeedFactor / Math.max(0.6, actor.speed),
    },
  };
}

function chooseEnemyAction(state: BattleState, actor: Unit) {
  const targets = teamUnits(state, "ally").filter(isAlive);
  const options = actor.moves.flatMap((move) =>
    targets.map((target) => ({
      move,
      target,
      damage: calculateDamage(state, actor, target, move).damage,
      score: scoreEnemyMove(state, actor, target, move),
      targetHpRatio: target.hp / target.maxHp,
    })),
  );

  return options.sort((left, right) => right.score - left.score || right.damage - left.damage || left.targetHpRatio - right.targetHpRatio)[0];
}

function chooseBestTargetForMove(state: BattleState, actor: Unit, move: Move, targetTeam: Team) {
  return teamUnits(state, targetTeam)
    .filter(isAlive)
    .map((target) => ({
      target,
      damage: calculateDamage(state, actor, target, move).damage,
      targetHpRatio: target.hp / target.maxHp,
    }))
    .sort((left, right) => right.damage - left.damage || left.targetHpRatio - right.targetHpRatio)[0]?.target;
}

// Per-ally contribution to the unity attack; shared by targeting and resolution
// so the AI scores the same numbers the attack actually deals.
function makeUnityMove(ally: Unit, base: Move): Move {
  return { ...base, type: ally.types[0], power: BALANCE.unityPower[ally.role] };
}

function unityDamageAgainst(state: BattleState, allies: Unit[], target: Unit, base: Move) {
  return allies.reduce((sum, ally) => sum + calculateDamage(state, ally, target, makeUnityMove(ally, base)).damage, 0);
}

function chooseUnityTarget(state: BattleState) {
  const allies = teamUnits(state, "ally").filter(isAlive);
  return teamUnits(state, "enemy")
    .filter(isAlive)
    .map((target) => ({
      target,
      damage: unityDamageAgainst(state, allies, target, UNITY_BURST_MOVE),
      targetHpRatio: target.hp / target.maxHp,
    }))
    .sort((left, right) => right.damage - left.damage || left.targetHpRatio - right.targetHpRatio)[0]?.target;
}

function enqueueAttack({
  state,
  actorId,
  targetId,
  move,
  delay,
  sync = false,
  unity = false,
}: {
  state: BattleState;
  actorId: string;
  targetId: string;
  move: Move;
  delay: number;
  sync?: boolean;
  unity?: boolean;
}) {
  return {
    ...state,
    actionQueue: [
      ...state.actionQueue,
      {
        id: `${actorId}-${move.id}-${state.elapsed}-${state.actionQueue.length}`,
        actorId,
        targetId,
        move,
        delay,
        totalDelay: delay,
        sync,
        unity,
      },
    ],
    log: [`${state.units.find((unit) => unit.id === actorId)?.name ?? "A Pokemon"} readied ${move.name}.`, ...state.log].slice(0, BALANCE.logLimit),
  };
}

function applyAttack({
  state,
  actorId,
  targetId,
  move,
  sync = false,
}: {
  state: BattleState;
  actorId: string;
  targetId: string;
  move: Move;
  sync?: boolean;
}): BattleState {
  const actor = state.units.find((unit) => unit.id === actorId);
  const target = state.units.find((unit) => unit.id === targetId);
  if (!actor || !target || !isAlive(actor) || !isAlive(target)) {
    return state;
  }

  // A paralyzed attacker has a chance to lose the action entirely.
  if (actor.statusCondition === "paralysis") {
    const [blockRoll, seedAfterBlock] = nextRandom(state.rng);
    if (blockRoll < BALANCE.paralysisBlockChance) {
      const blockFeedback: BattleFeedback = {
        id: makeFeedbackId(state, actor.id, "paralyzed-block"),
        unitId: actor.id,
        text: "fully paralyzed",
        kind: "status",
        ttl: 1.2,
      };
      return normalizeBattle({
        ...state,
        rng: seedAfterBlock,
        units: state.units.map((unit) => (unit.id === actor.id ? { ...unit, actionPulse: 0.5 } : unit)),
        log: [`${actor.name} is fully paralyzed and couldn't move!`, ...state.log].slice(0, BALANCE.logLimit),
        feedback: [blockFeedback, ...state.feedback].slice(0, BALANCE.feedbackLimit),
      });
    }
    state = { ...state, rng: seedAfterBlock };
  }

  if (isUtilityMove(move)) {
    return applyStatMove({ state, actor, target, move });
  }

  const { damage: baseDamage, typeMultiplier } = calculateDamage(state, actor, target, move);
  const [varianceRoll, seedAfterVariance] = nextRandom(state.rng);
  const [critRoll, rng] = nextRandom(seedAfterVariance);
  const isCrit = critRoll < BALANCE.critChance;
  const variance = BALANCE.varianceMin + varianceRoll * (1 - BALANCE.varianceMin);
  const damage =
    typeMultiplier === 0 ? 0 : Math.max(1, Math.round(baseDamage * variance * (isCrit ? BALANCE.critMultiplier : 1)));
  const targetHp = clamp(target.hp - damage, 0, target.maxHp);

  // An existing status condition blocks new ones; the same status refreshes its timer.
  const canApplyStatus = Boolean(move.statusEffect) && targetHp > 0;
  const statusApplied = canApplyStatus && target.statusCondition === null;
  const statusRefreshed = canApplyStatus && target.statusCondition === move.statusEffect;

  const nextUnits = state.units.map((unit) => {
    if (unit.id === actor.id) {
      return { ...unit, actionPulse: 1 };
    }
    if (unit.id === target.id) {
      return {
        ...unit,
        hp: targetHp,
        hitFlash: 1,
        statusCondition: statusApplied ? move.statusEffect ?? null : unit.statusCondition,
        statusTimer: statusApplied || statusRefreshed ? getStatusDuration(actor) : unit.statusTimer,
      };
    }
    return unit;
  });

  const effectText = getEffectivenessText(typeMultiplier);
  const critText = isCrit ? " A critical hit!" : "";
  const statusText = statusApplied && move.statusEffect ? ` ${target.name} is ${getStatusVerb(move.statusEffect)}.` : "";
  const koText = targetHp <= 0 ? ` ${target.name} is down.` : "";
  const prefix = sync ? `${actor.name} unleashed ${move.name}` : `${actor.name} used ${move.name}`;
  const log = [`${prefix} for ${damage} damage.${critText}${effectText}${statusText}${koText}`, ...state.log].slice(0, BALANCE.logLimit);
  const feedback = makeAttackFeedback(state, target.id, damage, typeMultiplier, Boolean(sync), isCrit, move.statusEffect, statusApplied);

  return normalizeBattle({ ...state, rng, units: nextUnits, log, feedback: [...feedback, ...state.feedback].slice(0, BALANCE.feedbackLimit) });
}

function applyStages(unit: Unit, statChange: StatChange): Unit {
  if (statChange.stat === "attack") {
    return { ...unit, attackStage: clamp(unit.attackStage + statChange.stages, -3, 6) };
  }
  return { ...unit, defenseStage: clamp(unit.defenseStage + statChange.stages, -3, 6) };
}

function applyStatMove({
  state,
  actor,
  target,
  move,
}: {
  state: BattleState;
  actor: Unit;
  target: Unit;
  move: Move;
}): BattleState {
  const statChange = move.statChange;
  if (!statChange) {
    return state;
  }

  const units = state.units.map((unit) => {
    if (unit.id === actor.id && unit.id === target.id) {
      return applyStages({ ...unit, actionPulse: 1 }, statChange);
    }
    if (unit.id === actor.id) {
      return { ...unit, actionPulse: 1 };
    }
    if (unit.id === target.id) {
      return applyStages({ ...unit, hitFlash: statChange.stages < 0 ? 0.45 : unit.hitFlash }, statChange);
    }
    return unit;
  });

  const statName = statChange.stat === "attack" ? "Attack" : "Defense";
  const direction = statChange.stages > 0 ? "rose" : "fell";
  const feedbackEntry: BattleFeedback = {
    id: makeFeedbackId(state, target.id, `stat-${statChange.stat}`),
    unitId: target.id,
    text: `${statChange.stat === "attack" ? "ATK" : "DEF"} ${statChange.stages > 0 ? "+" : ""}${statChange.stages}`,
    kind: "status",
    ttl: 1.25,
  };

  return normalizeBattle({
    ...state,
    units,
    log: [`${actor.name} used ${move.name}. ${target.name}'s ${statName} ${direction}.`, ...state.log].slice(0, BALANCE.logLimit),
    feedback: [feedbackEntry, ...state.feedback].slice(0, BALANCE.feedbackLimit),
  });
}

function applyUnityAttack({
  state,
  actorId,
  targetId,
  move,
}: {
  state: BattleState;
  actorId: string;
  targetId: string;
  move: Move;
}): BattleState {
  const actor = state.units.find((unit) => unit.id === actorId);
  const target = state.units.find((unit) => unit.id === targetId);
  const allies = teamUnits(state, "ally").filter(isAlive);
  if (!actor || !target || !isAlive(target) || allies.length === 0) {
    return state;
  }

  const totalDamage = unityDamageAgainst(state, allies, target, move);
  const [varianceRoll, rng] = nextRandom(state.rng);
  const variance = BALANCE.varianceMin + varianceRoll * (1 - BALANCE.varianceMin);
  const damage = Math.round(totalDamage * BALANCE.unityDamageScale * variance);
  const targetHp = clamp(target.hp - damage, 0, target.maxHp);
  const units = state.units.map((unit) => {
    if (unit.team === "ally" && isAlive(unit)) {
      return { ...unit, actionPulse: 1 };
    }
    if (unit.id === target.id) {
      return { ...unit, hp: targetHp, hitFlash: 1 };
    }
    return unit;
  });
  const koText = targetHp <= 0 ? ` ${target.name} is down.` : "";
  const feedback: BattleFeedback = {
    id: makeFeedbackId(state, target.id, "unity"),
    unitId: target.id,
    text: `Unity -${damage}`,
    kind: "unity",
    ttl: 1.6,
  };

  return normalizeBattle({
    ...state,
    rng,
    units,
    log: [`The allied team unleashed ${move.name} for ${damage} damage.${koText}`, ...state.log].slice(0, BALANCE.logLimit),
    feedback: [feedback, ...state.feedback].slice(0, BALANCE.feedbackLimit),
  });
}

export function getTypeEffectiveness(moveType: PokemonType, targetTypes: PokemonType[]) {
  const relations = typeRelations[moveType];
  return targetTypes.reduce((multiplier, targetType) => {
    if (relations?.noDamageTo?.includes(targetType)) {
      return multiplier * 0;
    }
    if (relations?.doubleDamageTo?.includes(targetType)) {
      return multiplier * 2;
    }
    if (relations?.halfDamageTo?.includes(targetType)) {
      return multiplier * 0.5;
    }
    return multiplier;
  }, 1);
}

function calculateDamage(state: BattleState, actor: Unit, target: Unit, move: Move) {
  const typeMultiplier = getTypeEffectiveness(move.type, target.types);
  const sameTypeBonus = actor.types.includes(move.type) ? BALANCE.sameTypeBonus : 1;
  const burnPenalty = actor.statusCondition === "burn" ? BALANCE.burnAttackPenalty : 1;
  const syncBoost = 1 + state.syncBoosts[actor.team] * BALANCE.syncBoostPerStack;
  const roleBonus = actor.role === "strike" ? BALANCE.strikeRoleBonus : actor.role === "tech" && move.statusEffect ? BALANCE.techStatusBonus : 1;
  const supportReduction = target.role === "support" ? BALANCE.supportDamageReduction : 1;
  const passiveDamageBonus =
    actor.passive.id === "power-reserves" && actor.hp / actor.maxHp <= 0.5
      ? 1.18
      : actor.passive.id === "toxic-focus" && move.statusEffect && target.statusCondition
        ? 1.15
        : actor.passive.id === "boss-aura"
          ? 1.12
        : 1;
  const passiveDamageReduction =
    target.passive.id === "thick-guard" && target.hp / target.maxHp > 0.5 ? 0.88 : target.passive.id === "boss-aura" ? 0.92 : 1;
  const attack = actor.attack * (1 + actor.attackStage * BALANCE.stageMultiplier) * burnPenalty;
  const defense = target.defense * (1 + target.defenseStage * BALANCE.stageMultiplier);
  const baseDamage = Math.max(8, move.power + attack * 0.6 - defense * 0.45);
  const damage = Math.max(
    typeMultiplier === 0 ? 0 : 1,
    Math.round(baseDamage * typeMultiplier * sameTypeBonus * syncBoost * roleBonus * supportReduction * passiveDamageBonus * passiveDamageReduction),
  );

  return { damage, typeMultiplier };
}

function scoreEnemyMove(state: BattleState, actor: Unit, target: Unit, move: Move) {
  const { damage, typeMultiplier } = calculateDamage(state, actor, target, move);
  const wouldKo = damage >= target.hp ? 80 : 0;
  const lowHpFocus = (1 - target.hp / target.maxHp) * 18;
  const rolePriority = target.role === "strike" ? 18 : target.role === "tech" ? 10 : 4;
  const statusValue = move.statusEffect && !target.statusCondition ? (actor.role === "tech" ? 220 : 14) : 0;
  const allySyncImminent = teamUnits(state, "ally").some((ally) => isAlive(ally) && ally.syncCountdown <= 1);
  const syncPressure = allySyncImminent && target.role === "strike" ? 14 : 0;
  const matchupValue = typeMultiplier > 1 ? 12 : typeMultiplier < 1 ? -12 : 0;

  return damage + wouldKo + lowHpFocus + rolePriority + statusValue + syncPressure + matchupValue;
}

function tickStatuses(state: BattleState): BattleState {
  const logs: string[] = [];
  const feedback: BattleFeedback[] = [];
  const units = mapStable(state.units, (unit) => {
    if (!isAlive(unit) || !unit.statusCondition) {
      return unit;
    }

    const statusDamage =
      unit.statusCondition === "burn" ? BALANCE.burnTickDamage : unit.statusCondition === "poison" ? BALANCE.poisonTickDamage : 0;
    const hp = clamp(unit.hp - statusDamage, 0, unit.maxHp);
    const statusTimer = Math.max(0, unit.statusTimer - 1);
    if (statusDamage > 0) {
      logs.push(`${unit.name} took ${statusDamage} ${unit.statusCondition} damage.`);
      feedback.push({
        id: makeFeedbackId(state, unit.id, unit.statusCondition),
        unitId: unit.id,
        text: `-${statusDamage} ${unit.statusCondition}`,
        kind: "status",
        ttl: 1.15,
      });
    }

    return {
      ...unit,
      hp,
      statusTimer,
      statusCondition: hp > 0 && statusTimer > 0 ? unit.statusCondition : null,
      hitFlash: statusDamage > 0 ? 0.6 : unit.hitFlash,
    };
  });

  if (units === state.units) {
    return state;
  }

  return normalizeBattle({
    ...state,
    units,
    log: [...logs, ...state.log].slice(0, BALANCE.logLimit),
    feedback: [...feedback, ...state.feedback].slice(0, BALANCE.feedbackLimit),
  });
}

function makeAttackFeedback(
  state: BattleState,
  unitId: string,
  damage: number,
  typeMultiplier: number,
  sync: boolean,
  isCrit: boolean,
  statusEffect: StatusCondition | undefined,
  statusApplied: boolean,
): BattleFeedback[] {
  const kind = sync ? "sync" : typeMultiplier >= 2 ? "super" : typeMultiplier < 1 ? "resist" : "damage";
  const entries: BattleFeedback[] = [
    {
      id: makeFeedbackId(state, unitId, "damage"),
      unitId,
      text: `-${damage}${getEffectivenessLabel(typeMultiplier)}${isCrit ? " crit" : ""}`,
      kind,
      ttl: sync ? 1.65 : 1.25,
    },
  ];

  if (statusEffect && statusApplied) {
    entries.push({
      id: makeFeedbackId(state, unitId, statusEffect),
      unitId,
      text: getStatusVerb(statusEffect),
      kind: "status",
      ttl: 1.35,
    });
  }

  return entries;
}

function makeFeedbackId(state: BattleState, unitId: string, label: string) {
  return `${unitId}-${label}-${state.elapsed.toFixed(3)}-${state.feedback.length}`;
}

function chargeUnity(state: BattleState, amount: number) {
  return clamp(state.unityGauge + amount, 0, state.maxUnityGauge);
}

function getStatusDuration(actor: Unit) {
  return (
    (actor.role === "tech" ? BALANCE.techStatusDuration : BALANCE.baseStatusDuration) +
    (actor.passive.id === "debilitating-dust" ? 1 : 0)
  );
}

function getStatusVerb(status: StatusCondition) {
  if (status === "burn") {
    return "burned";
  }
  if (status === "poison") {
    return "poisoned";
  }
  return "paralyzed";
}

function getEffectivenessText(multiplier: number) {
  if (multiplier === 0) {
    return " It had no effect.";
  }
  if (multiplier >= 2) {
    return " It's super effective!";
  }
  if (multiplier < 1) {
    return " It's not very effective.";
  }
  return "";
}

function getEffectivenessLabel(multiplier: number) {
  if (multiplier === 0) {
    return " no effect";
  }
  if (multiplier >= 2) {
    return ` x${multiplier}`;
  }
  if (multiplier < 1) {
    return ` x${multiplier}`;
  }
  return "";
}

export function previewPlayerMove(state: BattleState, moveId: string): MovePreview | null {
  const actor = resolvePlayerActor(state);
  if (!actor) {
    return null;
  }

  const move = actor.moves.find((candidate) => candidate.id === moveId);
  if (!move) {
    return null;
  }

  const target = resolvePlayerTarget(state, actor, move);
  if (!target) {
    return null;
  }

  if (isUtilityMove(move) && move.statChange) {
    const statLabel = move.statChange.stat === "attack" ? "ATK" : "DEF";
    const sign = move.statChange.stages > 0 ? "+" : "";
    return {
      moveName: move.name,
      targetName: target.name,
      type: move.type,
      cost: move.cost,
      estimatedDamage: 0,
      effectiveness: 1,
      effectivenessLabel: "support",
      statusEffect: move.statusEffect,
      statChangeLabel: `${statLabel} ${sign}${move.statChange.stages}${move.statChange.target === "self" ? " (self)" : ""}`,
    };
  }

  const { damage, typeMultiplier } = calculateDamage(state, actor, target, move);

  return {
    moveName: move.name,
    targetName: target.name,
    type: move.type,
    cost: move.cost,
    estimatedDamage: damage,
    effectiveness: typeMultiplier,
    effectivenessLabel: getEffectivenessLabel(typeMultiplier).trim() || "normal",
    statusEffect: move.statusEffect,
  };
}

function normalizeBattle(state: BattleState): BattleState {
  const firstAlly = firstLivingUnit(state, "ally");
  const firstEnemy = firstLivingUnit(state, "enemy");
  const selectedAlly = findLivingUnit(state, state.selectedAllyId, "ally") ?? firstAlly;
  const selectedEnemy = findLivingUnit(state, state.selectedEnemyId, "enemy") ?? firstEnemy;
  const status: BattleStatus = firstEnemy ? (firstAlly ? "playing" : "lost") : "won";

  return {
    ...state,
    status,
    selectedAllyId: selectedAlly?.id ?? state.selectedAllyId,
    selectedEnemyId: selectedEnemy?.id ?? state.selectedEnemyId,
  };
}

export function isAlive(unit: Unit) {
  return unit.hp > 0;
}

export function teamUnits(state: BattleState, team: Team) {
  return state.units.filter((unit) => unit.team === team);
}

function findLivingUnit(state: BattleState, unitId: string, team: Team) {
  return state.units.find((unit) => unit.id === unitId && unit.team === team && isAlive(unit));
}

function firstLivingUnit(state: BattleState, team: Team) {
  return state.units.find((unit) => unit.team === team && isAlive(unit));
}
