import heights from "./pokemonHeights.json";
export type ModelFamily =
  | "bulb" | "lizard" | "turtle" | "caterpillar" | "cocoon" | "butterfly" | "bee"
  | "bird" | "rodent" | "snake" | "rabbit" | "fairy" | "fox" | "bat" | "flower"
  | "crab" | "moth" | "mole" | "cat" | "duck" | "ape" | "dog" | "tadpole"
  | "psychic" | "fighter" | "bell" | "jellyfish" | "rock" | "horse" | "otter"
  | "magnet" | "seal" | "sludge" | "clam" | "ghost" | "rocksnake" | "hypnosis"
  | "ball" | "eggs" | "palm" | "bone" | "kicker" | "boxer" | "tongue" | "gas"
  | "rhino" | "nurse" | "vine" | "kangaroo" | "seahorse" | "fish" | "star"
  | "mime" | "mantis" | "singer" | "electric" | "flame" | "beetle" | "bull"
  | "serpent" | "plesiosaur" | "blob" | "digital" | "ammonite" | "fossil"
  | "pterosaur" | "sleeper" | "dragon" | "genetic";

export type PokemonModelDefinition = { number: number; heightM: number; family: ModelFamily; color: string };

// Explicit Kanto catalog in National Pokédex order. Every entry has a model
// family and palette metadata. Rendering uses the species-specific bundled GLB.
const catalog = `bulbasaur bulb 64c8a0
ivysaur bulb 4aafa1
venusaur bulb 4b9f8a
charmander lizard f39a50
charmeleon lizard de6550
charizard lizard ec9a53
squirtle turtle 68c9db
wartortle turtle 799bd9
blastoise turtle 598bc2
caterpie caterpillar 8fc956
metapod cocoon 8cba5b
butterfree butterfly aaa5d3
weedle caterpillar cba26b
kakuna cocoon ddc04e
beedrill bee edc548
pidgey bird b9a078
pidgeotto bird c2a06e
pidgeot bird c49d66
rattata rodent a47abd
raticate rodent bb965c
spearow bird b48b72
fearow bird b28457
ekans snake aa77b8
arbok snake 9170b0
pikachu rodent f7cf42
raichu rodent eab055
sandshrew rodent dbbd66
sandslash rodent c5a15c
nidoran-f rabbit 86bbd8
nidorina rabbit 72b2ce
nidoqueen rabbit 679dbc
nidoran-m rabbit b38dcc
nidorino rabbit a67bbb
nidoking rabbit 9c72b5
clefairy fairy ecb7c8
clefable fairy e3a9bd
vulpix fox bd7953
ninetales fox e9dcb0
jigglypuff fairy edb1d1
wigglytuff fairy eab5d0
zubat bat 7695c7
golbat bat 728dc2
oddish flower 5b92af
gloom flower 688ba9
vileplume flower 6e86b1
paras crab e99b61
parasect crab e7986c
venonat moth ad86bc
venomoth moth b59dc7
diglett mole b28e72
dugtrio mole b08866
meowth cat e9d8ac
persian cat e7d4a2
psyduck duck ebc959
golduck duck 6fa9cf
mankey ape dfd1af
primeape ape dcc9af
growlithe dog e6a164
arcanine dog df9959
poliwag tadpole 81a9dc
poliwhirl tadpole 6996d0
poliwrath tadpole 5782b7
abra psychic e5c05b
kadabra psychic d9b64e
alakazam psychic d8b35d
machop fighter 91b3b8
machoke fighter a28db5
machamp fighter 8ca4b0
bellsprout bell e2c951
weepinbell bell dacb62
victreebel bell d9ca59
tentacool jellyfish 79b8d4
tentacruel jellyfish 649fbc
geodude rock a6a18f
graveler rock 9d9584
golem rock 9b907b
ponyta horse edd9ae
rapidash horse e8d8ab
slowpoke otter df9fb8
slowbro otter d990ac
magnemite magnet b1c8d1
magneton magnet abc3cb
farfetchd bird b8a481
doduo bird b99d7c
dodrio bird b08f69
seel seal d9e8eb
dewgong seal e1ecee
grimer sludge a18abc
muk sludge 9878b0
shellder clam 9b92c6
cloyster clam 9a8bb4
gastly ghost 8e79b7
haunter ghost 8c77b9
gengar ghost 8873b1
onix rocksnake a3a59e
drowzee hypnosis d3b354
hypno hypnosis d6bc57
krabby crab df9669
kingler crab d58a58
voltorb ball e96969
electrode ball e67873
exeggcute eggs e8b3b5
exeggutor palm bca071
cubone bone bda174
marowak bone b09268
hitmonlee kicker b59d7e
hitmonchan boxer bc9b7c
lickitung tongue e6a5b6
koffing gas a58cbd
weezing gas 9c84b1
rhyhorn rhino a2a8a8
rhydon rhino 9da4a6
chansey nurse efb8c7
tangela vine 709cbb
kangaskhan kangaroo bba188
horsea seahorse 8abed7
seadra seahorse 729fca
goldeen fish e9e3d4
seaking fish e3a06d
staryu star c4a06d
starmie star a18cc5
mr-mime mime e8cbd2
scyther mantis 8cba7a
jynx singer a287b4
electabuzz electric e6c755
magmar flame e4ac50
pinsir beetle b7a990
tauros bull b99b73
magikarp fish e69876
gyarados serpent 79a3c3
lapras plesiosaur 83b6ce
ditto blob bd9bc9
eevee fox b8804e
vaporeon fox 78b9d1
jolteon fox e9ce63
flareon fox e6a078
porygon digital d588a6
omanyte ammonite 8eb8d7
omastar ammonite 82a7c7
kabuto fossil bba074
kabutops fossil b19a75
aerodactyl pterosaur b7a6c9
snorlax sleeper 6a939d
articuno bird 87c9e5
zapdos bird e8cf58
moltres bird ebc168
dratini serpent 9ebadc
dragonair serpent 91acd8
dragonite dragon e5b777
mewtwo genetic c3b5d3
mew genetic e9b8cf`;

export const POKEMON_MODELS: Record<string, PokemonModelDefinition> = Object.fromEntries(
  catalog.split("\n").map((row, index) => {
    const [species, family, color] = row.split(" ");
    return [species, { number: index + 1, heightM: heights[species as keyof typeof heights], family: family as ModelFamily, color: `#${color}` }];
  }),
);
