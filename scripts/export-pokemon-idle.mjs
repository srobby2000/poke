/** Export runtime idle poses as GLBs for the offline Blender review script.
 * Usage: node scripts/export-pokemon-idle.mjs /tmp/pokemon-idle 0.35 6 12 26 38 42 144 151
 * Uses the original textures and skin weights; skips texture decoding in Node. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import ts from 'typescript';
import { Group, PropertyBinding, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const [output, seconds = '0.35', ...numbers] = process.argv.slice(2);
if (!output || !numbers.length) throw new Error('Specify output directory, seconds, and Pokédex numbers');
await mkdir(output, { recursive: true });
const compile = async (path, replacements = {}) => {
  let source = ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText;
  source = source.replaceAll('"three"', JSON.stringify(import.meta.resolve('three')));
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(JSON.stringify(from), JSON.stringify(to));
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};
const appendagesURL = await compile('src/game/pokemonAppendages.ts');
const { rigPokemonAppendages } = await import(appendagesURL);
const { createPokemonAnimator } = await import(await compile('src/game/pokemonAnimation.ts', { './pokemonAppendages': appendagesURL }));
const catalog = (await readFile('src/game/pokemonModels.ts', 'utf8')).split('const catalog = `')[1].split('`;')[0].split('\n');
globalThis.self = globalThis;
for (const value of numbers) {
  const number = Number(value);
  const bytes = await readFile(`public/models/pokemon/${number}.glb`);
  const jsonSize = bytes.readUInt32LE(12);
  const document = JSON.parse(bytes.subarray(20, 20 + jsonSize));
  const binary = Buffer.from(bytes.subarray(28 + jsonSize));
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'NO_TEXTURE_DECODE', loadTexture: () => Promise.resolve(null) }));
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const root = new Group(); root.add(gltf.scene);
  rigPokemonAppendages(gltf.scene, number);
  const [, family] = catalog[number - 1].split(' ');
  const animator = createPokemonAnimator(gltf.scene, root, { number, family }, gltf.animations);
  const steps = Math.max(1, Math.ceil(Number(seconds) * 60));
  for (let i = 0; i < steps; i++) animator.update('idle', Number(seconds) / steps);
  root.updateMatrixWorld(true);
  for (const node of document.nodes) {
    const object = gltf.scene.getObjectByName(PropertyBinding.sanitizeNodeName(node.name ?? ''));
    if (!object) continue;
    if (object.isBone) { node.rotation = object.quaternion.toArray(); node.translation = object.position.toArray(); node.scale = object.scale.toArray(); }
    if (number === 42 && object.isSkinnedMesh && node.mesh !== undefined) {
      const geometry = object.geometry.clone();
      const position = geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        const point = object.applyBoneTransform(i, new Vector3().fromBufferAttribute(position, i));
        position.setXYZ(i, point.x, point.y, point.z);
      }
      geometry.computeVertexNormals();
      for (const [semantic, attribute] of [['POSITION', 'position'], ['NORMAL', 'normal']]) {
        const accessor = document.accessors[document.meshes[node.mesh].primitives[0].attributes[semantic]];
        const view = document.bufferViews[accessor.bufferView];
        const values = geometry.getAttribute(attribute);
        for (let i = 0; i < values.count; i++) for (let c = 0; c < 3; c++) {
          binary.writeFloatLE([values.getX(i), values.getY(i), values.getZ(i)][c], (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + i * (view.byteStride ?? 12) + c * 4);
        }
        delete accessor.min; delete accessor.max;
      }
      geometry.dispose();
    }
  }
  // Root bobbing is intentionally excluded so pose silhouettes compare in the same frame.
  delete document.animations;
  const json = Buffer.from(JSON.stringify(document));
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + padded.length + binary.length, 8); header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binary.length); binHeader.writeUInt32LE(0x004e4942, 4);
  await writeFile(`${output}/${number}.glb`, Buffer.concat([header, padded, binHeader, binary]));
  animator.dispose();
  console.log(`Exported #${number} at ${seconds}s`);
}
