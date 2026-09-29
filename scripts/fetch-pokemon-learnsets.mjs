/** Gen 1 (Red/Blue) level-up learnsets for #1-151 and the moves they use, from PokeAPI.
 * node scripts/fetch-pokemon-learnsets.mjs  ->  src/game/pokemonLearnsets.json
 */
import { writeFile } from 'node:fs/promises';

const API = 'https://pokeapi.co/api/v2';
const get = async url => {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url);
    if (response.ok) return response.json();
    await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
  }
  throw new Error(`PokeAPI failed: ${url}`);
};
const pool = async (items, size, work) => {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => { while (next < items.length) { const i = next++; results[i] = await work(items[i]); } }));
  return results;
};

const species = await pool(Array.from({ length: 151 }, (_, i) => i + 1), 8, async number => {
  const pokemon = await get(`${API}/pokemon/${number}`);
  const learnset = [];
  for (const entry of pokemon.moves) {
    for (const detail of entry.version_group_details) {
      if (detail.version_group.name === 'red-blue' && detail.move_learn_method.name === 'level-up') {
        learnset.push({ move: entry.move.name, level: detail.level_learned_at });
      }
    }
  }
  learnset.sort((a, b) => a.level - b.level || a.move.localeCompare(b.move));
  return { number, name: pokemon.name, learnset };
});

const moveIds = [...new Set(species.flatMap(s => s.learnset.map(l => l.move)))].sort();
const moves = Object.fromEntries(await pool(moveIds, 8, async id => {
  const move = await get(`${API}/move/${id}`);
  const effect = move.effect_entries.find(e => e.language.name === 'en')?.short_effect ?? '';
  return [id, {
    name: move.names.find(n => n.language.name === 'en')?.name ?? id,
    type: move.type.name,
    damageClass: move.damage_class.name,
    power: move.power,
    target: move.target.name,
    category: move.meta?.category?.name ?? null,
    effect: effect.replace(/\$effect_chance/g, String(move.effect_chance ?? '')),
  }];
}));

await writeFile('src/game/pokemonLearnsets.json', JSON.stringify({ source: 'PokeAPI, version group red-blue, level-up', species, moves }, null, 1) + '\n');
console.log(`${species.length} species, ${moveIds.length} moves`);
