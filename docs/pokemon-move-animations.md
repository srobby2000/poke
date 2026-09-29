# Pokémon move animations

Every move a Kanto Pokémon learns has a recorded movement, and each Pokémon plays its own clip of it on its rig. Source: PokeAPI, Red/Blue level-up learnsets (`scripts/fetch-pokemon-learnsets.mjs` → `src/game/pokemonLearnsets.json`).

- 151 species know 1090 learnset moves in total (1–12 each), drawn from 145 distinct moves.
- 192 moves have recorded movements: all 145 Gen 1 moves, plus the battle roster's own moves (later-generation, Sync, and trainer actions). 51 species also have battle moves.
- 37 movement archetypes. Each is recorded as keyframed body poses (see `src/game/moveAnimations.ts`); a move picks an archetype and may repeat its strike (multi-hit), change its speed, or scale its strength.

Watch any move in the Pokédex: open a Pokémon and tap it under **Battle moves** or **Learns (Red/Blue)**. In battle, a Pokémon plays the animation of the move it just used.

## Movement archetypes

| Archetype | Length | Movement |
| --- | ---: | --- |
| Bite | 0.70 s | Rears back with the mouth opening, snaps forward and clamps the jaws shut, gives a short shake, then lets go. |
| Claw swipe | 0.75 s | Raises the lead claw high while leaning back, rakes it down and across as the body lunges, then follows through. |
| Punch | 0.70 s | Crouches and draws the lead fist back with the elbow bent, drives it straight forward as the body steps in, holds the extension, then resets its guard. |
| Chop | 0.75 s | Lifts the lead arm overhead with a small hop, brings it straight down in a chop while bowing forward, then straightens. |
| Kick | 0.80 s | Shifts its weight back and chambers the lead leg with the knee bent, snaps the leg out forward and up, holds, then plants it again. |
| Body charge | 0.80 s | Crouches low with the head down, bursts forward and rams the target with its whole body, then skids back to its spot. |
| Body slam | 0.90 s | Squats, leaps up and forward, and comes down on the target belly-first with a heavy landing, then pushes itself back up. |
| Headbutt | 0.80 s | Tucks the head back and crouches, then drives forward head- or horn-first, holds the impact, and pulls back. |
| Peck | 0.70 s | Draws the head back, then jabs forward with the beak, stinger or horn and pulls straight back. |
| Tail swing | 0.85 s | Twists away and cocks the tail (or vines) up, whips it around and down through the target, then turns back to face it. |
| Tail wag | 1.00 s | Turns partly away to show its rear, wags the tail from side to side with a playful hip sway, then turns back. |
| Wrap | 1.00 s | Lunges in, curls the body and tail around the target and squeezes with a trembling hold, then uncoils. |
| Breath / spray | 0.95 s | Inhales with the chest swelling and head tipped back, then thrusts the head forward with the mouth wide open and holds a steady stream. |
| Beam | 1.30 s | Braces low and gathers energy while trembling, fires a straight beam that rocks it back, holds the beam, then relaxes. |
| Psychic focus | 1.10 s | Rises slightly with arms lifting and the head lowered in concentration, holds the pose with a faint tremor as the power flows, then settles. |
| Electric discharge | 0.95 s | Tenses into a crouch while crackling, then springs up and arches back, arms, tail and ears flung out as the charge discharges. |
| Wing gust | 0.90 s | Spreads its wings wide while rising, then beats them hard and fast toward the target, hovering in place. |
| Wing strike | 0.85 s | Raises both wings high, dives forward and sweeps them down through the target, then pulls up. |
| Powder / spores | 1.00 s | Hops up and shakes its whole body from side to side, fluttering wings and leaves to scatter a cloud over the target. |
| Cry / sound | 0.90 s | Draws a breath with the head tipped back, then leans forward and cries out with the mouth wide, the body vibrating. |
| Song / charm | 1.20 s | Sways gently from side to side with the mouth open in song, arms lifted, rocking its whole body in rhythm. |
| Stare / glare | 0.90 s | Leans in low toward the target, head forward and ears back, and holds a menacing stare with a faint quiver. |
| Stomp / quake | 1.00 s | Rears up with arms or forelegs raised, crashes down with its full weight, and the ground shakes it for a moment afterwards. |
| Throw / fling | 0.85 s | Winds the lead arm back overhead with the torso twisting, then whips it forward to release, following through. |
| Spin attack | 0.90 s | Crouches, then spins a full turn as it rolls forward into the target, and comes back around to face it. |
| Power up | 1.00 s | Gathers itself into a crouch with fists drawn in, then rises and flexes outward, swelling with power and trembling as it builds. |
| Dance | 1.10 s | Raises its arms and spins twice on the spot with a bounce in each turn, ending in a proud pose. |
| Guard / harden | 0.90 s | Pulls its head and limbs in and curls up tight, shrinking into a hard, braced shape, then opens back out. |
| Quick step | 0.75 s | Darts to one side, then the other, too fast to follow, and lands back where it started. |
| Vanish / shrink | 1.00 s | Curls in and shrinks away to almost nothing, holds there, then pops back to full size. |
| Explosion | 1.20 s | Swells up and shakes harder and harder, bursts outward in one violent flash, then collapses and recovers. |
| Drain | 1.00 s | Reaches in close to the target, then leans back, swelling slightly as the stolen energy flows in. |
| Splash | 1.00 s | Flops and bounces helplessly, tipping one way and then the other. |
| Dig | 1.30 s | Curls down and burrows until almost hidden, stays underground, then bursts up out of the ground at the target. |
| Rest / recover | 1.30 s | Lowers itself and curls up with the head down, breathing slowly and deeply, then rises refreshed. |
| Grapple / throw | 1.20 s | Lunges in to grab with both arms, heaves the target up while spinning around, then slams it down to the ground. |
| Shudder | 0.70 s | Freezes stiffly and shudders in place, unable to act. |

## Moves

| Move | Type | Class | Archetype | Hits | Length | Movement | Learned by |
| --- | --- | --- | --- | ---: | ---: | --- | ---: |
| Absorb | grass | special | Drain | 1 | 1.00 s | Absorbs nutrients from the target. | 5 |
| Acid | poison | special | Breath / spray | 1 | 0.95 s | Sprays a corrosive acid. | 10 |
| Acid Armor | poison | status | Guard / harden | 1 | 0.90 s | Melts its body into a liquid shield. | 3 |
| Agility | psychic | status | Quick step | 1 | 0.75 s | Darts around at blinding speed. | 28 |
| Amnesia | psychic | status | Rest / recover | 1 | 1.04 s | Empties its mind to forget its worries. | 6 |
| Aqua Tail | — | battle | Tail swing | 1 | 0.85 s | Swings a tail wrapped in a raging current. | — |
| Aurora Beam | ice | special | Beam | 1 | 1.30 s | Fires a shimmering rainbow beam. | 4 |
| Barrage | normal | physical | Throw / fling | 3 | 1.00 s | Hurls round objects one after another. | 2 |
| Barrier | psychic | status | Guard / harden | 1 | 0.90 s | Crosses its arms behind a solid barrier. | 4 |
| Bind | normal | physical | Wrap | 1 | 1.00 s | Binds the target tight with its body or vines. | 2 |
| Bite | dark | physical | Bite | 1 | 0.70 s | Sinks its fangs in with a quick snap. | 18 |
| Blizzard | ice | special | Breath / spray | 1 | 1.23 s | Breathes out a howling snowstorm. | 2 |
| Body Slam | normal | physical | Body slam | 1 | 0.90 s | Leaps and slams down on the target with its whole body. | 8 |
| Bone Club | ground | physical | Chop | 1 | 0.75 s | Clubs the target with its bone. | 2 |
| Bonemerang | ground | physical | Throw / fling | 2 | 0.94 s | Throws its bone like a boomerang. | 2 |
| Bubble | water | special | Breath / spray | 1 | 0.95 s | Blows a spray of bubbles. | 9 |
| Bulk Up | — | battle | Power up | 1 | 1.00 s | Flexes to bulk up its muscles. | — |
| Charm | — | battle | Song / charm | 1 | 1.20 s | Sways and looks endearing. | — |
| Clamp | water | physical | Bite | 1 | 0.70 s | Snaps its shell shut on the target like a pair of jaws. | 2 |
| Comet Punch | normal | physical | Punch | 3 | 0.94 s | A rapid combination of alternating punches. | 2 |
| Confuse Ray | ghost | status | Stare / glare | 1 | 0.90 s | Fixes the target with a sinister glowing light. | 8 |
| Confusion | psychic | special | Psychic focus | 1 | 1.10 s | Concentrates to push a wave of psychic force. | 11 |
| Constrict | normal | physical | Wrap | 1 | 1.00 s | Constricts the target with tentacles or vines. | 3 |
| Conversion | normal | status | Psychic focus | 1 | 1.10 s | Shifts its own type with a pulse of data. | 1 |
| Counter | fighting | physical | Punch | 1 | 0.70 s | Braces, then hits back hard. | 1 |
| Crabhammer | water | physical | Chop | 1 | 0.75 s | Hammers down with its huge claw. | 2 |
| Defense Curl | normal | status | Guard / harden | 1 | 0.90 s | Curls up into a ball. | 8 |
| Dig | ground | physical | Dig | 1 | 1.30 s | Burrows underground, then bursts out. | 2 |
| Disable | normal | status | Stare / glare | 1 | 0.90 s | Fixes the target with a stare that seals a move. | 16 |
| Disarming Voice | — | battle | Cry / sound | 1 | 0.90 s | Cries out charmingly. | — |
| Dizzy Punch | normal | physical | Punch | 1 | 0.70 s | A looping punch with a woozy follow-through. | 1 |
| Double-Edge | normal | physical | Body charge | 1 | 0.80 s | An all-out charge that hurts itself too. | 3 |
| Double Kick | fighting | physical | Kick | 2 | 0.84 s | Two quick kicks in succession. | 6 |
| Double Slap | normal | physical | Chop | 2 | 0.78 s | Slaps back and forth with alternating hands. | 10 |
| Double Team | normal | status | Quick step | 2 | 0.87 s | Moves so fast that copies of it appear. | 1 |
| Dragon Dance | — | battle | Dance | 1 | 1.10 s | Performs a mystic, powerful dance. | — |
| Dragon Pulse | — | battle | Beam | 1 | 1.30 s | Fires a shockwave from its open mouth. | — |
| Dragon Rage | dragon | special | Breath / spray | 1 | 0.95 s | Breathes a shockwave of draconic rage. | 4 |
| Dream Eater | psychic | special | Drain | 1 | 1.00 s | Feeds on the target's dreams. | 3 |
| Drill Peck | flying | physical | Peck | 3 | 0.73 s | A spinning, drilling series of pecks. | 5 |
| Earthquake | ground | physical | Stomp / quake | 1 | 1.00 s | Stamps down to set off a powerful quake. | 5 |
| Electro Ball | — | battle | Throw / fling | 1 | 0.85 s | Hurls a crackling ball of electricity. | — |
| Ember | fire | special | Breath / spray | 1 | 0.95 s | Puffs a small burst of flame. | 11 |
| Explosion | normal | physical | Explosion | 1 | 1.20 s | Blows itself up in a huge blast. | 7 |
| Fire Punch | fire | physical | Punch | 1 | 0.70 s | A flaming punch driven straight in. | 2 |
| Fire Spin | fire | special | Breath / spray | 1 | 1.14 s | Breathes a spiralling vortex of flame around the target. | 8 |
| Flame Burst | — | battle | Breath / spray | 1 | 0.95 s | Spits a bursting fireball. | — |
| Flame Wheel | — | battle | Spin attack | 1 | 0.90 s | Wraps itself in fire and rolls into the target. | — |
| Flamethrower | fire | special | Breath / spray | 1 | 1.23 s | Breathes a long, roaring stream of fire. | 7 |
| Focus Energy | normal | status | Power up | 1 | 1.00 s | Takes a deep breath and focuses. | 15 |
| Fury Attack | normal | physical | Peck | 3 | 0.73 s | Jabs repeatedly with its horn or beak. | 12 |
| Fury Swipes | normal | physical | Claw swipe | 3 | 1.13 s | Rakes left and right in a flurry of swipes. | 10 |
| Glare | normal | status | Stare / glare | 1 | 0.90 s | Freezes the target with a paralysing glare. | 2 |
| Growl | normal | status | Cry / sound | 1 | 0.90 s | Growls endearingly to lower the target's guard. | 29 |
| Growth | normal | status | Power up | 1 | 1.00 s | Stretches up and grows. | 8 |
| Guillotine | normal | physical | Claw swipe | 1 | 0.75 s | Brings its pincers together in one crushing snap. | 3 |
| Gust | flying | special | Wing gust | 1 | 0.90 s | Whips up a gust of wind with its wings. | 3 |
| Harden | normal | status | Guard / harden | 1 | 0.90 s | Stiffens its body to raise its defence. | 16 |
| Haze | ice | status | Breath / spray | 1 | 0.95 s | Breathes out a haze of black fog. | 5 |
| Headbutt | normal | physical | Headbutt | 1 | 0.80 s | Rams the target head-first. | 7 |
| Heavy Slam | — | battle | Body slam | 1 | 0.90 s | Slams its heavy body down on the target. | — |
| High Jump Kick | fighting | physical | Kick | 1 | 0.80 s | A soaring knee-high kick. | 1 |
| Hold Back | — | battle | Claw swipe | 1 | 0.75 s | A restrained swipe that leaves the target standing. | — |
| Horn Attack | normal | physical | Headbutt | 1 | 0.80 s | Jabs forward with its horn. | 9 |
| Horn Drill | normal | physical | Headbutt | 1 | 0.80 s | Drives in with a spinning horn. | 6 |
| Hydro Pump | water | special | Breath / spray | 1 | 1.23 s | Blasts a huge torrent of water. | 19 |
| Hyper Beam | normal | special | Beam | 1 | 1.56 s | Charges, then fires a massive destructive beam. | 6 |
| Hyper Fang | normal | physical | Bite | 1 | 0.70 s | A lunging bite with its big front fangs. | 2 |
| Hypnosis | psychic | status | Song / charm | 1 | 1.20 s | Sways hypnotically to lull the target. | 10 |
| Ice Beam | ice | special | Beam | 1 | 1.30 s | Fires a freezing beam of ice. | 5 |
| Ice Punch | ice | physical | Punch | 1 | 0.70 s | An icy punch driven straight in. | 2 |
| Jump Kick | fighting | physical | Kick | 1 | 0.80 s | Jumps and kicks out in mid-air. | 1 |
| Karate Chop | fighting | physical | Chop | 1 | 0.75 s | A sharp downward chop with the edge of the hand. | 5 |
| Lapras Water Pulse | — | battle | Breath / spray | 1 | 0.95 s | Launches a pulsing ring of water. | — |
| Leech Life | bug | physical | Drain | 1 | 1.00 s | Bites in and sucks the target's energy. | 6 |
| Leech Seed | grass | status | Throw / fling | 1 | 0.85 s | Flings a seed that sprouts onto the target. | 4 |
| Leer | normal | status | Stare / glare | 1 | 0.90 s | Glares with intimidating eyes. | 41 |
| Lick | ghost | physical | Bite | 1 | 0.70 s | Leans in and licks with a long tongue, the mouth only half open. | 4 |
| Light Screen | psychic | status | Psychic focus | 1 | 1.10 s | Raises a shimmering wall of light. | 8 |
| Lovely Kiss | normal | status | Stare / glare | 1 | 0.90 s | Leans in and puckers up for a kiss. | 1 |
| Low Kick | fighting | physical | Kick | 1 | 0.80 s | A low sweeping kick at the legs. | 3 |
| Low Sweep | — | battle | Kick | 1 | 0.80 s | Sweeps the target's legs out with a low kick. | — |
| Magnitude | — | battle | Stomp / quake | 1 | 1.00 s | Stamps down to set off a quake of random strength. | — |
| Meditate | psychic | status | Psychic focus | 1 | 1.10 s | Meditates calmly to focus its strength. | 4 |
| Mega Kick | normal | physical | Kick | 1 | 0.80 s | A single tremendously powerful kick. | 1 |
| Mega Punch | normal | physical | Punch | 1 | 0.70 s | A single punch thrown with all its weight. | 3 |
| Meowth Growl | — | battle | Cry / sound | 1 | 0.90 s | Growls to lower the target's guard. | — |
| Metronome | normal | status | Song / charm | 1 | 1.20 s | Waggles a finger rhythmically, drawing on a random power. | 3 |
| Minimize | normal | status | Vanish / shrink | 1 | 1.00 s | Shrinks itself down to a tiny size. | 6 |
| Mirror Move | flying | status | Wing gust | 1 | 0.90 s | Mimics the target's last move with a flourish of wings. | 5 |
| Mist | ice | status | Breath / spray | 1 | 0.95 s | Exhales a cool protective mist. | 4 |
| Night Shade | ghost | special | Psychic focus | 1 | 1.10 s | Casts a ghostly illusion at the target. | 3 |
| Paralyzed | — | battle | Shudder | 1 | 0.70 s | Seizes up, fully paralysed. | — |
| Pay Day | normal | physical | Throw / fling | 1 | 0.85 s | Flings coins at the target. | 2 |
| Peck | flying | physical | Peck | 1 | 0.70 s | A jab with its beak. | 9 |
| Petal Dance | grass | special | Dance | 1 | 1.10 s | Whirls in a dance, scattering petals. | 3 |
| Pidgey Gust | — | battle | Wing gust | 1 | 0.90 s | Whips up a gust of wind with its wings. | — |
| Pidgey Tackle | — | battle | Body charge | 1 | 0.80 s | Throws its whole body forward. | — |
| Pin Missile | bug | physical | Peck | 3 | 0.73 s | Fires a volley of sharp spikes. | 2 |
| Poison Gas | poison | status | Breath / spray | 1 | 0.95 s | Breathes out a cloud of poison gas. | 4 |
| Poison Powder | poison | status | Powder / spores | 1 | 1.00 s | Scatters a cloud of poisonous powder. | 14 |
| Poison Sting | poison | physical | Peck | 1 | 0.70 s | Jabs with a toxic stinger or barb. | 13 |
| Pound | normal | physical | Chop | 1 | 0.75 s | Pounds the target with a forelimb or tail. | 9 |
| Psybeam | psychic | special | Beam | 1 | 1.30 s | Fires a wavering psychic beam. | 6 |
| Psychic | psychic | special | Psychic focus | 1 | 1.10 s | Unleashes powerful telekinetic force. | 10 |
| Quick Attack | normal | physical | Body charge | 1 | 0.48 s | Darts in so fast it's almost invisible. | 14 |
| Rage | normal | physical | Body charge | 1 | 0.80 s | Charges in a furious temper. | 12 |
| Rattata Quick Attack | — | battle | Body charge | 1 | 0.48 s | Darts in so fast it's almost invisible. | — |
| Razor Leaf | grass | physical | Throw / fling | 2 | 0.88 s | Flings sharp-edged leaves. | 6 |
| Recover | normal | status | Rest / recover | 1 | 1.04 s | Rests briefly to restore its health. | 5 |
| Reflect | psychic | status | Psychic focus | 1 | 1.10 s | Raises a reflective barrier. | 3 |
| Rest | psychic | status | Rest / recover | 1 | 1.30 s | Curls up and falls asleep to heal. | 4 |
| Roar | normal | status | Cry / sound | 1 | 0.90 s | Lets out a mighty roar. | 4 |
| Rock Throw | rock | physical | Throw / fling | 1 | 0.85 s | Hurls a rock at the target. | 4 |
| Rolling Kick | fighting | physical | Spin attack | 1 | 0.90 s | Spins around and lashes out with a heel kick. | 1 |
| Sand Attack | ground | status | Powder / spores | 1 | 1.00 s | Kicks up sand at the target's face. | 12 |
| Scratch | normal | physical | Claw swipe | 1 | 0.75 s | A single raking scratch with sharp claws. | 20 |
| Screech | normal | status | Cry / sound | 1 | 0.90 s | Emits a piercing screech. | 16 |
| Seismic Toss | fighting | physical | Grapple / throw | 1 | 1.20 s | Grabs the target, heaves it up and throws it down. | 6 |
| Self-Destruct | normal | physical | Explosion | 1 | 1.20 s | Blows itself up. | 7 |
| Sharpen | normal | status | Power up | 1 | 1.00 s | Tenses up to sharpen its edges. | 1 |
| Sing | normal | status | Song / charm | 1 | 1.20 s | Sings a gentle lullaby. | 6 |
| Skull Bash | normal | physical | Headbutt | 1 | 1.04 s | Tucks in its head to charge up, then rams hard. | 3 |
| Sky Attack | flying | physical | Wing strike | 1 | 1.19 s | Glows, then dives from above with overwhelming force. | 1 |
| Slam | normal | physical | Tail swing | 1 | 0.85 s | Swings its tail or body round into the target. | 8 |
| Slash | normal | physical | Claw swipe | 1 | 0.75 s | A deep, powerful slash. | 16 |
| Sleep Powder | grass | status | Powder / spores | 1 | 1.00 s | Scatters a cloud of sleep-inducing powder. | 14 |
| Sludge | poison | special | Breath / spray | 1 | 0.95 s | Spits out a glob of sludge. | 4 |
| Smog | poison | special | Breath / spray | 1 | 0.95 s | Exhales a cloud of filthy smog. | 3 |
| Smokescreen | normal | status | Breath / spray | 1 | 0.95 s | Blows out a cloud of black smoke. | 5 |
| Solar Beam | grass | special | Beam | 1 | 1.95 s | Soaks up sunlight for a long moment before firing. | 6 |
| Sonic Boom | normal | special | Beam | 1 | 1.04 s | Launches a cutting shockwave. | 4 |
| Spike Cannon | normal | physical | Peck | 3 | 0.73 s | Shoots spikes in quick succession. | 3 |
| Splash | normal | status | Splash | 1 | 1.00 s | Flops around uselessly. | 1 |
| Spore | grass | status | Powder / spores | 1 | 1.00 s | Releases a burst of sleep spores. | 2 |
| Stomp | normal | physical | Stomp / quake | 1 | 1.00 s | Raises a foot and stamps down on the target. | 9 |
| String Shot | bug | status | Breath / spray | 1 | 0.95 s | Spits sticky silk at the target. | 2 |
| Stun Spore | grass | status | Powder / spores | 1 | 1.00 s | Scatters a cloud of paralysing spores. | 13 |
| Submission | fighting | physical | Grapple / throw | 1 | 1.08 s | Grapples the target and rolls with it to the ground. | 3 |
| Substitute | normal | status | Power up | 1 | 1.00 s | Pours part of its strength into a decoy. | 1 |
| Super Fang | normal | physical | Bite | 1 | 0.70 s | A leaping fang strike aimed to halve the target. | 2 |
| Supersonic | normal | status | Cry / sound | 1 | 0.90 s | Emits confusing sound waves. | 13 |
| Swift | normal | special | Throw / fling | 1 | 0.85 s | Flings a spray of star-shaped rays. | 9 |
| Swords Dance | normal | status | Dance | 1 | 1.10 s | Performs a fighting dance to sharpen its spirit. | 3 |
| Sync Bloom | — | battle | Powder / spores | 1 | 1.00 s | Sync: a surging burst of blossoms. | — |
| Sync Bolt | — | battle | Electric discharge | 1 | 0.95 s | Sync: a massive bolt of lightning. | — |
| Sync Bone Rush | — | battle | Chop | 3 | 1.03 s | Sync: a flurry of bone strikes. | — |
| Sync Dragon Ascent | — | battle | Dance | 1 | 1.10 s | Sync: spirals upward like a rising dragon. | — |
| Sync Flare | — | battle | Spin attack | 1 | 0.90 s | Sync: a blazing, spinning rush. | — |
| Sync Gale | — | battle | Wing gust | 1 | 0.90 s | Sync: a howling gale. | — |
| Sync Glacial Song | — | battle | Song / charm | 1 | 1.20 s | Sync: a freezing, haunting song. | — |
| Sync Headache Wave | — | battle | Psychic focus | 1 | 1.10 s | Sync: a throbbing psychic wave. | — |
| Sync Hydro | — | battle | Breath / spray | 1 | 1.23 s | Sync: a huge cresting wave. | — |
| Sync Impact | — | battle | Body slam | 1 | 0.90 s | Sync: a crushing full-body impact. | — |
| Sync Inferno Tails | — | battle | Tail swing | 1 | 0.85 s | Sync: whips a storm of flaming tails. | — |
| Sync Jackpot | — | battle | Throw / fling | 3 | 1.17 s | Sync: flings a shower of coins. | — |
| Sync Loyal Blaze | — | battle | Breath / spray | 1 | 1.23 s | Sync: a loyal, roaring blaze. | — |
| Sync Lullaby Crash | — | battle | Body slam | 1 | 0.90 s | Sync: a dreamy song that ends in a body slam. | — |
| Sync Mach Impact | — | battle | Body charge | 1 | 0.64 s | Sync: a supersonic body blow. | — |
| Sync Mind Shock | — | battle | Psychic focus | 1 | 1.10 s | Sync: an overwhelming psychic shock. | — |
| Sync Petal Storm | — | battle | Dance | 1 | 1.10 s | Sync: a storm of whirling petals. | — |
| Sync Phantom Grip | — | battle | Claw swipe | 1 | 0.75 s | Sync: a ghostly grip from the shadows. | — |
| Sync Rock Avalanche | — | battle | Stomp / quake | 1 | 1.00 s | Sync: brings down an avalanche of rock. | — |
| Sync Sky Dive | — | battle | Wing strike | 1 | 0.85 s | Sync: dives from the sky. | — |
| Sync Star Burst | — | battle | Throw / fling | 1 | 0.85 s | Sync: flings a burst of stars. | — |
| Sync Super Fang | — | battle | Bite | 1 | 0.70 s | Sync: a savage fang strike. | — |
| Tackle | normal | physical | Body charge | 1 | 0.80 s | Throws its whole body forward shoulder-first. | 37 |
| Tail Whip | normal | status | Tail wag | 1 | 1.00 s | Wags its tail cutely to make the target let its guard down. | 24 |
| Take Down | normal | physical | Body charge | 1 | 0.80 s | A reckless full-speed charge. | 11 |
| Teleport | psychic | status | Vanish / shrink | 1 | 1.00 s | Blinks out of sight and back. | 3 |
| Thrash | normal | physical | Body charge | 3 | 1.10 s | Charges again and again in a frenzy. | 6 |
| Thunder | electric | special | Electric discharge | 1 | 1.14 s | Calls down a massive thunderbolt. | 4 |
| Thunder Punch | electric | physical | Punch | 1 | 0.70 s | An electrified punch driven straight in. | 2 |
| Thunder Shock | electric | special | Electric discharge | 1 | 0.95 s | Crackles and releases a jolt of electricity. | 7 |
| Thunder Wave | electric | status | Electric discharge | 1 | 0.95 s | Sends out a weak paralysing wave. | 8 |
| Trainer Buff | — | battle | Power up | 1 | 1.00 s | Answers its trainer's call and powers up. | — |
| Transform | normal | status | Power up | 1 | 1.00 s | Wobbles and reshapes itself into the target's form. | 2 |
| Tri Attack | normal | special | Beam | 1 | 1.30 s | Fires three beams at once. | 3 |
| Twineedle | bug | physical | Peck | 2 | 0.67 s | Stabs twice with its stingers. | 1 |
| Twister | — | battle | Wing gust | 1 | 0.90 s | Whips up a vicious twister. | — |
| Unity Burst | — | battle | Body charge | 1 | 0.80 s | Charges in together with the whole team. | — |
| Vise Grip | normal | physical | Claw swipe | 1 | 0.75 s | Clamps the target between its pincers. | 3 |
| Vine Whip | grass | physical | Tail swing | 1 | 0.85 s | Lashes out with its vines. | 5 |
| Vulpix Ember | — | battle | Breath / spray | 1 | 0.95 s | Puffs a small burst of flame. | — |
| Water Gun | water | special | Breath / spray | 1 | 0.95 s | Sprays a jet of water from its mouth. | 18 |
| Water Pulse | — | battle | Breath / spray | 1 | 0.95 s | Launches a pulsing ring of water. | — |
| Waterfall | water | physical | Body charge | 1 | 0.80 s | Charges up and over the target like a surging waterfall. | 2 |
| Whirlwind | normal | status | Wing gust | 1 | 0.90 s | Beats its wings to blow the target away. | 4 |
| Wing Attack | flying | physical | Wing strike | 1 | 0.85 s | Strikes with its spread wings. | 6 |
| Withdraw | water | status | Guard / harden | 1 | 0.90 s | Pulls its head and limbs into its shell. | 8 |
| Wrap | normal | physical | Wrap | 1 | 1.00 s | Wraps its long body around the target and squeezes. | 11 |
| Zen Headbutt | — | battle | Headbutt | 1 | 0.80 s | Rams with a head focused by psychic power. | — |

## Moves per Pokémon

| Dex | Pokémon | Learnset | Battle moves | Moves (level learned) |
| --- | --- | ---: | ---: | --- |
| 001 | Bulbasaur | 9 | 4: Vine Whip, Poison Powder, Growl, Sync Bloom Surge | Growl (start), Tackle (start), Leech Seed (7), Vine Whip (13), Poison Powder (20), Razor Leaf (27), Growth (34), Sleep Powder (41), Solar Beam (48) |
| 002 | Ivysaur | 10 | 4: Vine Whip, Poison Powder, Growl, Sync Bloom Surge | Growl (start), Leech Seed (start), Tackle (start), Leech Seed (7), Vine Whip (13), Poison Powder (22), Razor Leaf (30), Growth (38), Sleep Powder (46), Solar Beam (54) |
| 003 | Venusaur | 11 | 4: Vine Whip, Poison Powder, Growl, Sync Bloom Surge | Growl (start), Leech Seed (start), Tackle (start), Vine Whip (start), Leech Seed (7), Vine Whip (13), Poison Powder (22), Razor Leaf (30), Growth (43), Sleep Powder (55), Solar Beam (65) |
| 004 | Charmander | 8 | 3: Ember, Flame Burst, Sync Flare Rush | Growl (start), Scratch (start), Ember (9), Leer (15), Rage (22), Slash (30), Flamethrower (38), Fire Spin (46) |
| 005 | Charmeleon | 9 | 3: Ember, Flame Burst, Sync Flare Rush | Ember (start), Growl (start), Scratch (start), Ember (9), Leer (15), Rage (24), Slash (33), Flamethrower (42), Fire Spin (56) |
| 006 | Charizard | 10 | 3: Ember, Flame Burst, Sync Flare Rush | Ember (start), Growl (start), Leer (start), Scratch (start), Ember (9), Leer (15), Rage (24), Slash (36), Flamethrower (46), Fire Spin (55) |
| 007 | Squirtle | 8 | 4: Water Gun, Aqua Tail, Withdraw, Sync Hydro Crest | Tackle (start), Tail Whip (start), Bubble (8), Water Gun (15), Bite (22), Withdraw (28), Skull Bash (35), Hydro Pump (42) |
| 008 | Wartortle | 9 | 4: Water Gun, Aqua Tail, Withdraw, Sync Hydro Crest | Bubble (start), Tackle (start), Tail Whip (start), Bubble (8), Water Gun (15), Bite (24), Withdraw (31), Skull Bash (39), Hydro Pump (47) |
| 009 | Blastoise | 10 | 4: Water Gun, Aqua Tail, Withdraw, Sync Hydro Crest | Bubble (start), Tackle (start), Tail Whip (start), Water Gun (start), Bubble (8), Water Gun (15), Bite (24), Withdraw (31), Skull Bash (42), Hydro Pump (52) |
| 010 | Caterpie | 2 | — | String Shot (start), Tackle (start) |
| 011 | Metapod | 1 | — | Harden (start) |
| 012 | Butterfree | 8 | 3: Gust, Stun Spore, Sync Gale | Confusion (start), Confusion (12), Poison Powder (15), Stun Spore (16), Sleep Powder (17), Supersonic (21), Whirlwind (26), Psybeam (32) |
| 013 | Weedle | 2 | — | Poison Sting (start), String Shot (start) |
| 014 | Kakuna | 1 | — | Harden (start) |
| 015 | Beedrill | 7 | — | Fury Attack (start), Fury Attack (12), Focus Energy (16), Twineedle (20), Rage (25), Pin Missile (30), Agility (35) |
| 016 | Pidgey | 7 | 3: Tackle, Gust, Sync Sky Dive | Gust (start), Sand Attack (5), Quick Attack (12), Whirlwind (19), Wing Attack (28), Agility (36), Mirror Move (44) |
| 017 | Pidgeotto | 8 | 3: Tackle, Gust, Sync Sky Dive | Gust (start), Sand Attack (start), Sand Attack (5), Quick Attack (12), Whirlwind (21), Wing Attack (31), Agility (40), Mirror Move (49) |
| 018 | Pidgeot | 9 | 3: Tackle, Gust, Sync Sky Dive | Gust (start), Quick Attack (start), Sand Attack (start), Sand Attack (5), Quick Attack (12), Whirlwind (21), Wing Attack (31), Agility (44), Mirror Move (54) |
| 019 | Rattata | 6 | 3: Quick Attack, Hyper Fang, Sync Super Fang | Tackle (start), Tail Whip (start), Quick Attack (7), Hyper Fang (14), Focus Energy (23), Super Fang (34) |
| 020 | Raticate | 7 | 3: Quick Attack, Hyper Fang, Sync Super Fang | Quick Attack (start), Tackle (start), Tail Whip (start), Quick Attack (7), Hyper Fang (14), Focus Energy (27), Super Fang (41) |
| 021 | Spearow | 7 | — | Growl (start), Peck (start), Leer (9), Fury Attack (15), Mirror Move (22), Drill Peck (29), Agility (36) |
| 022 | Fearow | 8 | — | Growl (start), Leer (start), Peck (start), Leer (9), Fury Attack (15), Mirror Move (25), Drill Peck (34), Agility (43) |
| 023 | Ekans | 7 | — | Leer (start), Wrap (start), Poison Sting (10), Bite (17), Glare (24), Screech (31), Acid (38) |
| 024 | Arbok | 8 | — | Leer (start), Poison Sting (start), Wrap (start), Poison Sting (10), Bite (17), Glare (27), Screech (36), Acid (47) |
| 025 | Pikachu | 7 | 3: Thunder Shock, Electro Ball, Sync Bolt | Growl (start), Thunder Shock (start), Thunder Wave (9), Quick Attack (16), Swift (26), Agility (33), Thunder (43) |
| 026 | Raichu | 3 | — | Growl (start), Thunder Shock (start), Thunder Wave (start) |
| 027 | Sandshrew | 6 | — | Scratch (start), Sand Attack (10), Slash (17), Poison Sting (24), Swift (31), Fury Swipes (38) |
| 028 | Sandslash | 7 | — | Sand Attack (start), Scratch (start), Sand Attack (10), Slash (17), Poison Sting (27), Swift (36), Fury Swipes (47) |
| 029 | Nidoran F | 8 | — | Growl (start), Tackle (start), Scratch (8), Poison Sting (14), Tail Whip (21), Bite (29), Fury Swipes (36), Double Kick (43) |
| 030 | Nidorina | 9 | — | Growl (start), Scratch (start), Tackle (start), Scratch (8), Poison Sting (14), Tail Whip (23), Bite (32), Fury Swipes (41), Double Kick (50) |
| 031 | Nidoqueen | 7 | — | Body Slam (start), Scratch (start), Tackle (start), Tail Whip (start), Scratch (8), Poison Sting (14), Body Slam (23) |
| 032 | Nidoran M | 8 | — | Leer (start), Tackle (start), Horn Attack (8), Poison Sting (14), Focus Energy (21), Fury Attack (29), Horn Drill (36), Double Kick (43) |
| 033 | Nidorino | 9 | — | Horn Attack (start), Leer (start), Tackle (start), Horn Attack (8), Poison Sting (14), Focus Energy (23), Fury Attack (32), Horn Drill (41), Double Kick (50) |
| 034 | Nidoking | 7 | — | Horn Attack (start), Poison Sting (start), Tackle (start), Thrash (start), Horn Attack (8), Poison Sting (14), Thrash (23) |
| 035 | Clefairy | 8 | — | Growl (start), Pound (start), Sing (13), Double Slap (18), Minimize (24), Metronome (31), Defense Curl (39), Light Screen (48) |
| 036 | Clefable | 4 | — | Double Slap (start), Metronome (start), Minimize (start), Sing (start) |
| 037 | Vulpix | 7 | 4: Ember, Fire Spin, Tail Whip, Sync Inferno Tails | Ember (start), Tail Whip (start), Quick Attack (16), Roar (21), Confuse Ray (28), Flamethrower (35), Fire Spin (42) |
| 038 | Ninetales | 4 | 4: Ember, Fire Spin, Tail Whip, Sync Inferno Tails | Ember (start), Quick Attack (start), Roar (start), Tail Whip (start) |
| 039 | Jigglypuff | 8 | 3: Disarming Voice, Sing, Sync Lullaby Crash | Sing (start), Pound (9), Disable (14), Defense Curl (19), Double Slap (24), Rest (29), Body Slam (34), Double-Edge (39) |
| 040 | Wigglytuff | 4 | 3: Disarming Voice, Sing, Sync Lullaby Crash | Defense Curl (start), Disable (start), Double Slap (start), Sing (start) |
| 041 | Zubat | 6 | — | Leech Life (start), Supersonic (10), Bite (15), Confuse Ray (21), Wing Attack (28), Haze (36) |
| 042 | Golbat | 8 | — | Bite (start), Leech Life (start), Screech (start), Supersonic (10), Bite (15), Confuse Ray (21), Wing Attack (32), Haze (43) |
| 043 | Oddish | 7 | 3: Absorb, Acid, Sync Petal Storm | Absorb (start), Poison Powder (15), Stun Spore (17), Sleep Powder (19), Acid (24), Petal Dance (33), Solar Beam (46) |
| 044 | Gloom | 9 | 3: Absorb, Acid, Sync Petal Storm | Absorb (start), Poison Powder (start), Stun Spore (start), Poison Powder (15), Stun Spore (17), Sleep Powder (19), Acid (28), Petal Dance (38), Solar Beam (52) |
| 045 | Vileplume | 7 | 3: Absorb, Acid, Sync Petal Storm | Acid (start), Petal Dance (start), Sleep Powder (start), Stun Spore (start), Poison Powder (15), Stun Spore (17), Sleep Powder (19) |
| 046 | Paras | 6 | — | Scratch (start), Stun Spore (13), Leech Life (20), Spore (27), Slash (34), Growth (41) |
| 047 | Parasect | 8 | — | Leech Life (start), Scratch (start), Stun Spore (start), Stun Spore (13), Leech Life (20), Spore (30), Slash (39), Growth (48) |
| 048 | Venonat | 8 | — | Disable (start), Tackle (start), Poison Powder (24), Leech Life (27), Stun Spore (30), Psybeam (35), Sleep Powder (38), Psychic (43) |
| 049 | Venomoth | 10 | — | Disable (start), Leech Life (start), Poison Powder (start), Tackle (start), Poison Powder (24), Leech Life (27), Stun Spore (30), Psybeam (38), Sleep Powder (43), Psychic (50) |
| 050 | Diglett | 6 | — | Scratch (start), Growl (15), Dig (19), Sand Attack (24), Slash (31), Earthquake (40) |
| 051 | Dugtrio | 8 | — | Dig (start), Growl (start), Scratch (start), Growl (15), Dig (19), Sand Attack (24), Slash (35), Earthquake (47) |
| 052 | Meowth | 7 | 4: Scratch, Pay Day, Growl, Sync Jackpot Strike | Growl (start), Scratch (start), Bite (12), Pay Day (17), Screech (24), Fury Swipes (33), Slash (44) |
| 053 | Persian | 9 | 4: Scratch, Pay Day, Growl, Sync Jackpot Strike | Bite (start), Growl (start), Scratch (start), Screech (start), Bite (12), Pay Day (17), Screech (24), Fury Swipes (37), Slash (51) |
| 054 | Psyduck | 6 | 4: Water Pulse, Zen Headbutt, Screech, Sync Headache Wave | Scratch (start), Tail Whip (28), Disable (31), Confusion (36), Fury Swipes (43), Hydro Pump (52) |
| 055 | Golduck | 8 | 4: Water Pulse, Zen Headbutt, Screech, Sync Headache Wave | Disable (start), Scratch (start), Tail Whip (start), Tail Whip (28), Disable (31), Confusion (39), Fury Swipes (48), Hydro Pump (59) |
| 056 | Mankey | 7 | — | Leer (start), Scratch (start), Karate Chop (15), Fury Swipes (21), Focus Energy (27), Seismic Toss (33), Thrash (39) |
| 057 | Primeape | 9 | — | Fury Swipes (start), Karate Chop (start), Leer (start), Scratch (start), Karate Chop (15), Fury Swipes (21), Focus Energy (27), Seismic Toss (37), Thrash (46) |
| 058 | Growlithe | 7 | 3: Bite, Flame Wheel, Sync Loyal Blaze | Bite (start), Roar (start), Ember (18), Leer (23), Take Down (30), Agility (39), Flamethrower (50) |
| 059 | Arcanine | 4 | 3: Bite, Flame Wheel, Sync Loyal Blaze | Ember (start), Leer (start), Roar (start), Take Down (start) |
| 060 | Poliwag | 7 | — | Bubble (start), Hypnosis (16), Water Gun (19), Double Slap (25), Body Slam (31), Amnesia (38), Hydro Pump (45) |
| 061 | Poliwhirl | 9 | — | Bubble (start), Hypnosis (start), Water Gun (start), Hypnosis (16), Water Gun (19), Double Slap (26), Body Slam (33), Amnesia (41), Hydro Pump (49) |
| 062 | Poliwrath | 6 | — | Body Slam (start), Double Slap (start), Hypnosis (start), Water Gun (start), Hypnosis (16), Water Gun (19) |
| 063 | Abra | 1 | 3: Confusion, Psybeam, Sync Mind Shock | Teleport (start) |
| 064 | Kadabra | 9 | 3: Confusion, Psybeam, Sync Mind Shock | Confusion (start), Disable (start), Teleport (start), Confusion (16), Disable (20), Psybeam (27), Recover (31), Psychic (38), Reflect (42) |
| 065 | Alakazam | 9 | 3: Confusion, Psybeam, Sync Mind Shock | Confusion (start), Disable (start), Teleport (start), Confusion (16), Disable (20), Psybeam (27), Recover (31), Psychic (38), Reflect (42) |
| 066 | Machop | 6 | 4: Karate Chop, Low Sweep, Bulk Up, Sync Mach Impact | Karate Chop (start), Low Kick (20), Leer (25), Focus Energy (32), Seismic Toss (39), Submission (46) |
| 067 | Machoke | 8 | 4: Karate Chop, Low Sweep, Bulk Up, Sync Mach Impact | Karate Chop (start), Leer (start), Low Kick (start), Low Kick (20), Leer (25), Focus Energy (36), Seismic Toss (44), Submission (52) |
| 068 | Machamp | 8 | 4: Karate Chop, Low Sweep, Bulk Up, Sync Mach Impact | Karate Chop (start), Leer (start), Low Kick (start), Low Kick (20), Leer (25), Focus Energy (36), Seismic Toss (44), Submission (52) |
| 069 | Bellsprout | 9 | — | Growth (start), Vine Whip (start), Wrap (13), Poison Powder (15), Sleep Powder (18), Stun Spore (21), Acid (26), Razor Leaf (33), Slam (42) |
| 070 | Weepinbell | 10 | — | Growth (start), Vine Whip (start), Wrap (start), Wrap (13), Poison Powder (15), Sleep Powder (18), Stun Spore (23), Acid (29), Razor Leaf (38), Slam (49) |
| 071 | Victreebel | 7 | — | Acid (start), Razor Leaf (start), Sleep Powder (start), Stun Spore (start), Wrap (13), Poison Powder (15), Sleep Powder (18) |
| 072 | Tentacool | 9 | — | Acid (start), Supersonic (7), Wrap (13), Poison Sting (18), Water Gun (22), Constrict (27), Barrier (33), Screech (40), Hydro Pump (48) |
| 073 | Tentacruel | 11 | — | Acid (start), Supersonic (start), Wrap (start), Supersonic (7), Wrap (13), Poison Sting (18), Water Gun (22), Constrict (27), Barrier (35), Screech (43), Hydro Pump (50) |
| 074 | Geodude | 7 | 4: Rock Throw, Magnitude, Harden, Sync Rock Avalanche | Tackle (start), Defense Curl (11), Rock Throw (16), Self-Destruct (21), Harden (26), Earthquake (31), Explosion (36) |
| 075 | Graveler | 8 | 4: Rock Throw, Magnitude, Harden, Sync Rock Avalanche | Defense Curl (start), Tackle (start), Defense Curl (11), Rock Throw (16), Self-Destruct (21), Harden (29), Earthquake (36), Explosion (43) |
| 076 | Golem | 8 | 4: Rock Throw, Magnitude, Harden, Sync Rock Avalanche | Defense Curl (start), Tackle (start), Defense Curl (11), Rock Throw (16), Self-Destruct (21), Harden (29), Earthquake (36), Explosion (43) |
| 077 | Ponyta | 7 | — | Ember (start), Tail Whip (30), Stomp (32), Growl (35), Fire Spin (39), Take Down (43), Agility (48) |
| 078 | Rapidash | 10 | — | Ember (start), Growl (start), Stomp (start), Tail Whip (start), Tail Whip (30), Stomp (32), Growl (35), Fire Spin (39), Take Down (47), Agility (55) |
| 079 | Slowpoke | 7 | — | Confusion (start), Disable (18), Headbutt (22), Growl (27), Water Gun (33), Amnesia (40), Psychic (48) |
| 080 | Slowbro | 10 | — | Confusion (start), Disable (start), Headbutt (start), Disable (18), Headbutt (22), Growl (27), Water Gun (33), Withdraw (37), Amnesia (44), Psychic (55) |
| 081 | Magnemite | 7 | — | Tackle (start), Sonic Boom (21), Thunder Shock (25), Supersonic (29), Thunder Wave (35), Swift (41), Screech (47) |
| 082 | Magneton | 9 | — | Sonic Boom (start), Tackle (start), Thunder Shock (start), Sonic Boom (21), Thunder Shock (25), Supersonic (29), Thunder Wave (38), Swift (46), Screech (54) |
| 083 | Farfetchd | 7 | — | Peck (start), Sand Attack (start), Leer (7), Fury Attack (15), Swords Dance (23), Agility (31), Slash (39) |
| 084 | Doduo | 7 | — | Peck (start), Growl (20), Fury Attack (24), Drill Peck (30), Rage (36), Tri Attack (40), Agility (44) |
| 085 | Dodrio | 9 | — | Fury Attack (start), Growl (start), Peck (start), Growl (20), Fury Attack (24), Drill Peck (30), Rage (39), Tri Attack (45), Agility (51) |
| 086 | Seel | 6 | — | Headbutt (start), Growl (30), Aurora Beam (35), Rest (40), Take Down (45), Ice Beam (50) |
| 087 | Dewgong | 8 | — | Aurora Beam (start), Growl (start), Headbutt (start), Growl (30), Aurora Beam (35), Rest (44), Take Down (50), Ice Beam (56) |
| 088 | Grimer | 8 | — | Disable (start), Pound (start), Poison Gas (30), Minimize (33), Sludge (37), Harden (42), Screech (48), Acid Armor (55) |
| 089 | Muk | 9 | — | Disable (start), Poison Gas (start), Pound (start), Poison Gas (30), Minimize (33), Sludge (37), Harden (45), Screech (53), Acid Armor (60) |
| 090 | Shellder | 7 | — | Tackle (start), Withdraw (start), Supersonic (18), Clamp (23), Aurora Beam (30), Leer (39), Ice Beam (50) |
| 091 | Cloyster | 5 | — | Aurora Beam (start), Clamp (start), Supersonic (start), Withdraw (start), Spike Cannon (50) |
| 092 | Gastly | 5 | — | Confuse Ray (start), Lick (start), Night Shade (start), Hypnosis (27), Dream Eater (35) |
| 093 | Haunter | 5 | 4: Lick, Smog, Night Shade, Sync Phantom Grip | Confuse Ray (start), Lick (start), Night Shade (start), Hypnosis (29), Dream Eater (38) |
| 094 | Gengar | 5 | 4: Lick, Smog, Night Shade, Sync Phantom Grip | Confuse Ray (start), Lick (start), Night Shade (start), Hypnosis (29), Dream Eater (38) |
| 095 | Onix | 7 | — | Screech (start), Tackle (start), Bind (15), Rock Throw (19), Rage (25), Slam (33), Harden (43) |
| 096 | Drowzee | 8 | — | Hypnosis (start), Pound (start), Disable (12), Confusion (17), Headbutt (24), Poison Gas (29), Psychic (32), Meditate (37) |
| 097 | Hypno | 10 | — | Confusion (start), Disable (start), Hypnosis (start), Pound (start), Disable (12), Confusion (17), Headbutt (24), Poison Gas (33), Psychic (37), Meditate (43) |
| 098 | Krabby | 7 | — | Bubble (start), Leer (start), Vise Grip (20), Guillotine (25), Stomp (30), Crabhammer (35), Harden (40) |
| 099 | Kingler | 8 | — | Bubble (start), Leer (start), Vise Grip (start), Vise Grip (20), Guillotine (25), Stomp (34), Crabhammer (42), Harden (49) |
| 100 | Voltorb | 7 | — | Screech (start), Tackle (start), Sonic Boom (17), Self-Destruct (22), Light Screen (29), Swift (36), Explosion (43) |
| 101 | Electrode | 8 | — | Screech (start), Sonic Boom (start), Tackle (start), Sonic Boom (17), Self-Destruct (22), Light Screen (29), Swift (40), Explosion (50) |
| 102 | Exeggcute | 8 | — | Barrage (start), Hypnosis (start), Reflect (25), Leech Seed (28), Stun Spore (32), Poison Powder (37), Solar Beam (42), Sleep Powder (48) |
| 103 | Exeggutor | 3 | — | Barrage (start), Hypnosis (start), Stomp (28) |
| 104 | Cubone | 7 | 3: Bone Club, Bonemerang, Sync Bone Rush | Bone Club (start), Growl (start), Leer (25), Focus Energy (31), Thrash (38), Bonemerang (43), Rage (46) |
| 105 | Marowak | 9 | 3: Bone Club, Bonemerang, Sync Bone Rush | Bone Club (start), Focus Energy (start), Growl (start), Leer (start), Leer (25), Focus Energy (33), Thrash (41), Bonemerang (48), Rage (55) |
| 106 | Hitmonlee | 7 | — | Double Kick (start), Meditate (start), Rolling Kick (33), Jump Kick (38), Focus Energy (43), High Jump Kick (48), Mega Kick (53) |
| 107 | Hitmonchan | 7 | — | Agility (start), Comet Punch (start), Fire Punch (33), Ice Punch (38), Thunder Punch (43), Mega Punch (48), Counter (53) |
| 108 | Lickitung | 7 | — | Supersonic (start), Wrap (start), Stomp (7), Disable (15), Defense Curl (23), Slam (31), Screech (39) |
| 109 | Koffing | 7 | — | Smog (start), Tackle (start), Sludge (32), Smokescreen (37), Self-Destruct (40), Haze (45), Explosion (48) |
| 110 | Weezing | 8 | — | Sludge (start), Smog (start), Tackle (start), Sludge (32), Smokescreen (39), Self-Destruct (43), Haze (49), Explosion (53) |
| 111 | Rhyhorn | 7 | — | Horn Attack (start), Stomp (30), Tail Whip (35), Fury Attack (40), Horn Drill (45), Leer (50), Take Down (55) |
| 112 | Rhydon | 10 | — | Fury Attack (start), Horn Attack (start), Stomp (start), Tail Whip (start), Stomp (30), Tail Whip (35), Fury Attack (40), Horn Drill (48), Leer (55), Take Down (64) |
| 113 | Chansey | 8 | — | Double Slap (start), Pound (start), Sing (24), Growl (30), Minimize (38), Defense Curl (44), Light Screen (48), Double-Edge (54) |
| 114 | Tangela | 8 | — | Bind (start), Constrict (start), Absorb (29), Poison Powder (32), Stun Spore (36), Sleep Powder (39), Slam (45), Growth (49) |
| 115 | Kangaskhan | 7 | — | Comet Punch (start), Rage (start), Bite (26), Tail Whip (31), Mega Punch (36), Leer (41), Dizzy Punch (46) |
| 116 | Horsea | 6 | — | Bubble (start), Smokescreen (19), Leer (24), Water Gun (30), Agility (37), Hydro Pump (45) |
| 117 | Seadra | 7 | — | Bubble (start), Smokescreen (start), Smokescreen (19), Leer (24), Water Gun (30), Agility (41), Hydro Pump (52) |
| 118 | Goldeen | 8 | — | Peck (start), Tail Whip (start), Supersonic (19), Horn Attack (24), Fury Attack (30), Waterfall (37), Horn Drill (45), Agility (54) |
| 119 | Seaking | 9 | — | Peck (start), Supersonic (start), Tail Whip (start), Supersonic (19), Horn Attack (24), Fury Attack (30), Waterfall (39), Horn Drill (48), Agility (54) |
| 120 | Staryu | 8 | — | Tackle (start), Water Gun (17), Harden (22), Recover (27), Swift (32), Minimize (37), Light Screen (42), Hydro Pump (47) |
| 121 | Starmie | 3 | — | Harden (start), Tackle (start), Water Gun (start) |
| 122 | Mr Mime | 7 | — | Barrier (start), Confusion (start), Confusion (15), Light Screen (23), Double Slap (31), Meditate (39), Substitute (47) |
| 123 | Scyther | 7 | — | Quick Attack (start), Leer (17), Focus Energy (20), Double Team (24), Slash (29), Swords Dance (35), Agility (42) |
| 124 | Jynx | 8 | — | Lovely Kiss (start), Pound (start), Lick (18), Double Slap (23), Ice Punch (31), Body Slam (39), Thrash (47), Blizzard (58) |
| 125 | Electabuzz | 7 | — | Leer (start), Quick Attack (start), Thunder Shock (34), Screech (37), Thunder Punch (42), Light Screen (49), Thunder (54) |
| 126 | Magmar | 7 | — | Ember (start), Leer (36), Confuse Ray (39), Fire Punch (43), Smokescreen (48), Smog (52), Flamethrower (55) |
| 127 | Pinsir | 7 | — | Vise Grip (start), Seismic Toss (25), Guillotine (30), Focus Energy (36), Harden (43), Slash (49), Swords Dance (54) |
| 128 | Tauros | 6 | — | Tackle (start), Stomp (21), Tail Whip (28), Leer (35), Rage (44), Take Down (51) |
| 129 | Magikarp | 2 | — | Splash (start), Tackle (15) |
| 130 | Gyarados | 9 | — | Bite (start), Dragon Rage (start), Hydro Pump (start), Leer (start), Bite (20), Dragon Rage (25), Leer (32), Hydro Pump (41), Hyper Beam (52) |
| 131 | Lapras | 8 | 4: Water Pulse, Ice Beam, Mist, Sync Glacial Song | Growl (start), Water Gun (start), Sing (16), Mist (20), Body Slam (25), Confuse Ray (31), Ice Beam (38), Hydro Pump (46) |
| 132 | Ditto | 1 | — | Transform (start) |
| 133 | Eevee | 6 | 4: Quick Attack, Swift, Charm, Sync Star Burst | Sand Attack (start), Tackle (start), Quick Attack (27), Tail Whip (31), Bite (37), Take Down (45) |
| 134 | Vaporeon | 12 | 4: Quick Attack, Swift, Charm, Sync Star Burst | Quick Attack (start), Sand Attack (start), Tackle (start), Water Gun (start), Quick Attack (27), Water Gun (31), Tail Whip (37), Bite (40), Acid Armor (42), Haze (44), Mist (48), Hydro Pump (54) |
| 135 | Jolteon | 12 | 4: Quick Attack, Swift, Charm, Sync Star Burst | Quick Attack (start), Sand Attack (start), Tackle (start), Thunder Shock (start), Quick Attack (27), Thunder Shock (31), Tail Whip (37), Thunder Wave (40), Double Kick (42), Agility (44), Pin Missile (48), Thunder (54) |
| 136 | Flareon | 12 | 4: Quick Attack, Swift, Charm, Sync Star Burst | Ember (start), Quick Attack (start), Sand Attack (start), Tackle (start), Quick Attack (27), Ember (31), Tail Whip (37), Bite (40), Leer (42), Fire Spin (44), Rage (48), Flamethrower (54) |
| 137 | Porygon | 7 | — | Conversion (start), Sharpen (start), Tackle (start), Psybeam (23), Recover (28), Agility (35), Tri Attack (42) |
| 138 | Omanyte | 6 | — | Water Gun (start), Withdraw (start), Horn Attack (34), Leer (39), Spike Cannon (46), Hydro Pump (53) |
| 139 | Omastar | 7 | — | Horn Attack (start), Water Gun (start), Withdraw (start), Horn Attack (34), Leer (39), Spike Cannon (44), Hydro Pump (49) |
| 140 | Kabuto | 6 | — | Harden (start), Scratch (start), Absorb (34), Slash (39), Leer (44), Hydro Pump (49) |
| 141 | Kabutops | 7 | — | Absorb (start), Harden (start), Scratch (start), Absorb (34), Slash (39), Leer (46), Hydro Pump (53) |
| 142 | Aerodactyl | 6 | — | Agility (start), Wing Attack (start), Supersonic (33), Bite (38), Take Down (45), Hyper Beam (54) |
| 143 | Snorlax | 7 | 3: Body Slam, Heavy Slam, Sync Impact | Amnesia (start), Headbutt (start), Rest (start), Body Slam (35), Harden (41), Double-Edge (48), Hyper Beam (56) |
| 144 | Articuno | 5 | — | Ice Beam (start), Peck (start), Blizzard (51), Agility (55), Mist (60) |
| 145 | Zapdos | 5 | — | Drill Peck (start), Thunder Shock (start), Thunder (51), Agility (55), Light Screen (60) |
| 146 | Moltres | 5 | — | Fire Spin (start), Peck (start), Leer (51), Agility (55), Sky Attack (60) |
| 147 | Dratini | 7 | 4: Twister, Dragon Pulse, Dragon Dance, Sync Dragon Ascent | Leer (start), Wrap (start), Thunder Wave (10), Agility (20), Slam (30), Dragon Rage (40), Hyper Beam (50) |
| 148 | Dragonair | 8 | 4: Twister, Dragon Pulse, Dragon Dance, Sync Dragon Ascent | Leer (start), Thunder Wave (start), Wrap (start), Thunder Wave (10), Agility (20), Slam (35), Dragon Rage (45), Hyper Beam (55) |
| 149 | Dragonite | 9 | 4: Twister, Dragon Pulse, Dragon Dance, Sync Dragon Ascent | Agility (start), Leer (start), Thunder Wave (start), Wrap (start), Thunder Wave (10), Agility (20), Slam (35), Dragon Rage (45), Hyper Beam (60) |
| 150 | Mewtwo | 9 | — | Confusion (start), Disable (start), Psychic (start), Swift (start), Barrier (63), Psychic (66), Recover (70), Mist (75), Amnesia (81) |
| 151 | Mew | 5 | — | Pound (start), Transform (10), Mega Punch (20), Metronome (30), Psychic (40) |
