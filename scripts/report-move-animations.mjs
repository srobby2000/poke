/** Writes docs/pokemon-move-animations.md from the recorded move movements and learnsets.
 * node scripts/report-move-animations.mjs
 */
import { writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const { LEARNSET_SPECIES, LEARNSET_MOVES, MOVE_ANIMATIONS, MOVE_ARCHETYPES, learnsetFor } = await server.ssrLoadModule('/src/game/moveAnimations.ts');
  const { battleMovesFor } = await server.ssrLoadModule('/src/game/battleState.ts');
  const { moveTimeline } = await server.ssrLoadModule('/src/game/pokemonAnimation.ts');
  const title = name => name.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
  const lines = [];
  const counts = LEARNSET_SPECIES.map(s => s.learnset.length);
  const battleSpecies = LEARNSET_SPECIES.filter(s => battleMovesFor(s.name).length);
  lines.push('# Pokémon move animations', '',
    `Every move a Kanto Pokémon learns has a recorded movement, and each Pokémon plays its own clip of it on its rig. Source: PokeAPI, Red/Blue level-up learnsets (\`scripts/fetch-pokemon-learnsets.mjs\` → \`src/game/pokemonLearnsets.json\`).`, '',
    `- ${LEARNSET_SPECIES.length} species know ${counts.reduce((a, b) => a + b, 0)} learnset moves in total (${Math.min(...counts)}–${Math.max(...counts)} each), drawn from ${Object.keys(LEARNSET_MOVES).length} distinct moves.`,
    `- ${Object.keys(MOVE_ANIMATIONS).length} moves have recorded movements: all ${Object.keys(LEARNSET_MOVES).length} Gen 1 moves, plus the battle roster's own moves (later-generation, Sync, and trainer actions). ${battleSpecies.length} species also have battle moves.`,
    `- ${Object.keys(MOVE_ARCHETYPES).length} movement archetypes. Each is recorded as keyframed body poses (see \`src/game/moveAnimations.ts\`); a move picks an archetype and may repeat its strike (multi-hit), change its speed, or scale its strength.`,
    '', 'Watch any move in the Pokédex: open a Pokémon and tap it under **Battle moves** or **Learns (Red/Blue)**. In battle, a Pokémon plays the animation of the move it just used.', '');
  lines.push('## Movement archetypes', '', '| Archetype | Length | Movement |', '| --- | ---: | --- |');
  for (const archetype of Object.values(MOVE_ARCHETYPES)) lines.push(`| ${archetype.label} | ${archetype.seconds.toFixed(2)} s | ${archetype.movement} |`);
  lines.push('', '## Moves', '', '| Move | Type | Class | Archetype | Hits | Length | Movement | Learned by |', '| --- | --- | --- | --- | ---: | ---: | --- | ---: |');
  const learners = id => LEARNSET_SPECIES.filter(s => s.learnset.some(l => l.move === id)).length;
  for (const id of Object.keys(MOVE_ANIMATIONS).sort()) {
    const animation = MOVE_ANIMATIONS[id];
    const info = LEARNSET_MOVES[id];
    lines.push(`| ${info?.name ?? title(id)} | ${info?.type ?? '—'} | ${info?.damageClass ?? 'battle'} | ${MOVE_ARCHETYPES[animation.archetype].label} | ${animation.hits ?? 1} | ${moveTimeline(id).duration.toFixed(2)} s | ${animation.note} | ${info ? learners(id) : '—'} |`);
  }
  lines.push('', '## Moves per Pokémon', '', '| Dex | Pokémon | Learnset | Battle moves | Moves (level learned) |', '| --- | --- | ---: | ---: | --- |');
  for (const species of LEARNSET_SPECIES) {
    const battle = battleMovesFor(species.name);
    const list = learnsetFor(species.name).map(m => `${m.name} (${m.level > 1 ? m.level : 'start'})`).join(', ');
    lines.push(`| ${String(species.number).padStart(3, '0')} | ${title(species.name)} | ${species.learnset.length} | ${battle.length ? `${battle.length}: ${battle.map(m => m.name).join(', ')}` : '—'} | ${list} |`);
  }
  await writeFile('docs/pokemon-move-animations.md', lines.join('\n') + '\n');
  console.log(`Wrote ${LEARNSET_SPECIES.length} species, ${Object.keys(MOVE_ANIMATIONS).length} moves`);
} finally {
  await server.close();
}
