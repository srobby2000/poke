/** Measure how the authored clips bundled in a few models move, as references for the
 * procedural animation, and optionally compare every species' clips with them.
 *   node scripts/measure-animation-references.mjs            -> docs/animation-references.json
 *   node scripts/measure-animation-references.mjs --compare  -> our clips vs the target bands
 */
import { readFile, writeFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createServer } from 'vite';

globalThis.self = globalThis;
const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const { measureClip, stageForDisplay } = await server.ssrLoadModule('/src/game/pokemonMotionMetrics.ts');
const { applyRestPose, createPokemonFallback, selectSpeciesClip } = await server.ssrLoadModule('/src/game/pokemonAnimation.ts');
const { rigPokemonAppendages } = await server.ssrLoadModule('/src/game/pokemonAppendages.ts');
const { POKEMON_MODELS } = await server.ssrLoadModule('/src/game/pokemonModels.ts');
const { POKEMON_LOCOMOTION } = await server.ssrLoadModule('/src/game/pokemonLocomotion.ts');

const load = async number => {
  const bytes = await readFile(`public/models/pokemon/${number}.glb`);
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'NO_TEXTURE_DECODE', loadTexture: () => Promise.resolve(null) }));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
};
// A fresh, rigged, rest-posed instance, as the game builds it.
const instance = (gltf, number) => {
  const scene = gltf.scene.clone(true);
  applyRestPose(scene, number, gltf.animations);
  rigPokemonAppendages(scene, number);
  const root = stageForDisplay(scene, number, POKEMON_MODELS[speciesOf(number)].heightM);
  return { scene, root };
};
const round = value => Math.round(value * 100) / 100;
const tidy = metrics => ({ ...metrics, duration: round(metrics.duration), peakRange: round(metrics.peakRange), bob: round(metrics.bob), beatHz: round(metrics.beatHz), seam: round(metrics.seam), peakSpeedAt: round(metrics.peakSpeedAt), kink: round(metrics.kink), roles: Object.fromEntries(Object.entries(metrics.roles).map(([role, value]) => [role, round(value)])) });

// Authored clips worth learning from, by the travel mode they demonstrate.
const REFERENCES = [
  { number: 150, mode: 'biped', clips: { idle: /00000_defaultwait01_loop/, walk: /00030_walk01_loop/, run: /00100_run01_loop/, attack: /00400_attack01$/, hit: /00500_damage01$/ } },
  { number: 149, mode: 'biped', clips: { idle: /00000_defaultwait01_loop/, walk: /00030_walk01_loop/, run: /00100_run01_loop/, attack: /20400_attack01$/, hit: /20500_damage01$/ } },
  { number: 40, mode: 'biped', clips: { run: /bd_run/ } },
  { number: 25, mode: 'biped', clips: { attack: /Impactrueno/ } },
  { number: 1, mode: 'quadruped', clips: { idle: /001aidle/, walk: /001walk/, run: /001run/, attack: /001fight_b/ } },
  { number: 41, mode: 'fly', clips: { walk: /Take 001/ } },
  { number: 93, mode: 'hover', clips: { idle: /^Animation$/ } },
  { number: 81, mode: 'hover', clips: { idle: /Take 001/ } },
  { number: 95, mode: 'slither', clips: { idle: /Take 001/ } },
  { number: 88, mode: 'ooze', clips: { idle: /ArmatureAction/ } },
];
const speciesOf = number => Object.keys(POKEMON_MODELS).find(key => POKEMON_MODELS[key].number === number);

try {
  if (!process.argv.includes('--compare')) {
    const references = [];
    for (const reference of REFERENCES) {
      const gltf = await load(reference.number);
      for (const [motion, pattern] of Object.entries(reference.clips)) {
        const clip = gltf.animations.find(candidate => pattern.test(candidate.name));
        if (!clip) { console.warn(`#${reference.number}: no clip for ${motion}`); continue; }
        const { scene, root } = instance(gltf, reference.number);
        references.push({ number: reference.number, species: speciesOf(reference.number), mode: reference.mode, motion, clip: clip.name, metrics: tidy(measureClip(scene, root, clip)) });
      }
    }
    await writeFile('docs/animation-references.json', JSON.stringify({ source: 'Authored clips bundled in public/models/pokemon, measured by src/game/pokemonMotionMetrics.ts', references }, null, 1) + '\n');
    for (const r of references) console.log(`#${String(r.number).padStart(3)} ${r.mode.padEnd(9)} ${r.motion.padEnd(6)} ${String(r.metrics.duration).padStart(5)}s bob ${String(r.metrics.bob).padStart(5)}% peak ${String(Math.round(r.metrics.peakRange)).padStart(3)}° beat ${r.metrics.beatHz}Hz strike@${r.metrics.peakSpeedAt} seam ${r.metrics.seam}° | ${Object.entries(r.metrics.roles).map(([k, v]) => `${k} ${Math.round(v)}`).join(' ')}`);
  } else {
    const { MOTION_TARGETS, checkMotion } = await server.ssrLoadModule('/src/game/pokemonMotionTargets.ts');
    const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7).split(',').map(Number);
    let failures = 0, checks = 0;
    for (let number = 1; number <= 151; number++) {
      if (only && !only.includes(number)) continue;
      const gltf = await load(number);
      const definition = POKEMON_MODELS[speciesOf(number)];
      const problems = [];
      for (const motion of ['idle', 'walk', 'run', 'attack', 'hit']) {
        const { scene, root } = instance(gltf, number);
        const clip = selectSpeciesClip(gltf.animations, motion, number) ?? createPokemonFallback(scene, root, definition, motion);
        const issues = checkMotion(measureClip(scene, root, clip), POKEMON_LOCOMOTION[number], motion);
        checks++;
        if (issues.length) { failures++; problems.push(`${motion}: ${issues.join('; ')}`); }
      }
      if (problems.length) console.log(`#${String(number).padStart(3)} ${speciesOf(number).padEnd(11)} ${POKEMON_LOCOMOTION[number].padEnd(9)} ${problems.join(' | ')}`);
    }
    console.log(`\n${checks - failures}/${checks} clips inside their target bands (${Object.keys(MOTION_TARGETS).length} travel modes).`);
  }
} finally {
  await server.close();
}
