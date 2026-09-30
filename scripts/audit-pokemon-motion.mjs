/** Offline, shaded runtime poses + joint overlays. No browser/GPU or texture decoding.
 * node scripts/audit-pokemon-motion.mjs [output-directory]
 * Ten columns: idle, walk, run, attack, hit, each sampled at 0.12s and 0.36s.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import ts from 'typescript';
import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const output = process.argv[2] ?? 'docs/model-review/locomotion';
await mkdir(output, { recursive: true });
const compile = async (path, replacements = {}) => {
  let source = ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText;
  source = source.replaceAll('"three"', JSON.stringify(import.meta.resolve('three')));
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(JSON.stringify(from), JSON.stringify(to));
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};
const locomotion = await compile('src/game/pokemonLocomotion.ts');
const appendages = await compile('src/game/pokemonAppendages.ts');
const { rigPokemonAppendages } = await import(appendages);
const scale = await compile('src/game/pokemonScale.ts');
const { pokemonDisplayHeight, pokemonMeasurement } = await import(scale);
const heights = JSON.parse(await readFile('src/game/pokemonHeights.json', 'utf8'));
const learnsetData = `data:text/javascript;base64,${Buffer.from('export default ' + await readFile('src/game/pokemonLearnsets.json', 'utf8')).toString('base64')}`;
const moveCatalog = await compile('src/game/moveAnimations.ts', { './pokemonLearnsets.json': learnsetData });
const { applyRestPose, createPokemonAnimator, selectSpeciesClip } = await import(await compile('src/game/pokemonAnimation.ts', { './pokemonLocomotion': locomotion, './pokemonAppendages': appendages, './pokemonScale': scale, './moveAnimations': moveCatalog }));
const catalog = (await readFile('src/game/pokemonModels.ts', 'utf8')).split('const catalog = `')[1].split('`;')[0].split('\n');
globalThis.self = globalThis;
const cell = 144, columns = 10, rows = 8, width = cell * columns, height = cell * rows;
let pixels;
const clear = () => { pixels = Buffer.alloc(width * height * 4); for (let i = 0; i < width * height; i++) pixels.set([19, 27, 41, 255], i * 4); };
clear();
const crcTable = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ n >>> 1 : n >>> 1; return n >>> 0; });
const chunk = (name, data) => { const type = Buffer.from(name); const body = Buffer.concat([type, data]); let crc = 0xffffffff; for (const b of body) crc = crcTable[(crc ^ b) & 255] ^ crc >>> 8; const h = Buffer.alloc(4), c = Buffer.alloc(4); h.writeUInt32BE(data.length); c.writeUInt32BE((crc ^ 0xffffffff) >>> 0); return Buffer.concat([h, body, c]); };
async function save(page) { const raw = Buffer.alloc(height * (width * 4 + 1)); for (let y = 0; y < height; y++) pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4); const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6; await writeFile(`${output}/sheet-${String(page).padStart(2, '0')}.png`, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); }
function draw(root, col, row, span, center) {
  const depth = new Float64Array(cell * cell).fill(-Infinity);
  const originX = col * cell, originY = row * cell;
  const project = p => { const x = p.x - center.x, y = p.y - center.y, z = p.z - center.z; return [(0.857 * x - 0.514 * z) * span + cell / 2, -(y * 0.955 - x * 0.153 - z * 0.255) * span + cell / 2, x * 0.491 + y * 0.297 + z * 0.818]; };
  const dot = (x, y, color) => { if (x >= 0 && y >= 0 && x < cell && y < cell) pixels.set([...color, 255], ((originY + y) * width + originX + x) * 4); };
  root.updateMatrixWorld(true);
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const attr = mesh.geometry.getAttribute('position'); const index = mesh.geometry.index;
    const points = []; const p = new Vector3();
    for (let i = 0; i < attr.count; i++) { p.fromBufferAttribute(attr, i); if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, p); points.push(p.clone().applyMatrix4(mesh.matrixWorld)); }
    const screen = points.map(project);
    for (let t = 0; t < (index?.count ?? attr.count); t += 3) {
      const ids = [0, 1, 2].map(k => index ? index.getX(t + k) : t + k);
      const [a, b, c] = ids.map(i => screen[i]);
      const denom = (b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]); if (Math.abs(denom)<0.001) continue;
      const normal = points[ids[1]].clone().sub(points[ids[0]]).cross(points[ids[2]].clone().sub(points[ids[0]])).normalize();
      const light = 0.4 + 0.6 * Math.abs(normal.dot(new Vector3(0.3, 0.8, 0.5).normalize()));
      const color = [112, 186, 215].map(c => Math.round(c * light));
      const minX = Math.max(0, Math.floor(Math.min(a[0],b[0],c[0]))), maxX = Math.min(cell-1,Math.ceil(Math.max(a[0],b[0],c[0])));
      const minY = Math.max(0, Math.floor(Math.min(a[1],b[1],c[1]))), maxY = Math.min(cell-1,Math.ceil(Math.max(a[1],b[1],c[1])));
      for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
        const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/denom;
        const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/denom; const w=1-u-v;
        if(u<0||v<0||w<0)continue; const z=u*a[2]+v*b[2]+w*c[2]; const i=y*cell+x;
        if(z>depth[i]){depth[i]=z;dot(x,y,color);}
      }
    }
  });
  root.traverse(bone => {
    if (!bone.isBone || !bone.parent?.isBone) return;
    const a = project(bone.getWorldPosition(new Vector3())), b = project(bone.parent.getWorldPosition(new Vector3()));
    const steps = Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1]));
    for(let i=0;i<=steps;i++) {const t=steps?i/steps:0;dot(Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),[245,195,94]);}
  });
  // White corner ticks keep cells and phases identifiable on contact sheets.
  for(let i=0;i<8;i++){dot(i,0,[90,110,130]);dot(0,i,[90,110,130]);}
}
const { POKEMON_LOCOMOTION } = await import(locomotion);
const report=[];
for(let number=1;number<=151;number++){
  const [species,family]=catalog[number-1].split(' ');
  const bytes=await readFile(`public/models/pokemon/${number}.glb`);
  const loader=new GLTFLoader();loader.register(()=>({name:'NO_TEXTURE_DECODE',loadTexture:()=>Promise.resolve(null)}));
  const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const root=new Group();root.add(gltf.scene);
  let originalBones=0;gltf.scene.traverse(n=>{if(n.isBone)originalBones++;});
  applyRestPose(gltf.scene,number,gltf.animations);const dispose=rigPokemonAppendages(gltf.scene,number);
  const rawBounds=new Box3().setFromObject(gltf.scene), rawSize=rawBounds.getSize(new Vector3()), rawCenter=rawBounds.getCenter(new Vector3());
  const heightM=heights[species];
  const displayScale=pokemonDisplayHeight(heightM)/pokemonMeasurement(number,gltf.scene,rawSize);
  const fit=new Group(); fit.scale.setScalar(displayScale); fit.position.set(-rawCenter.x*displayScale,-rawBounds.min.y*displayScale,-rawCenter.z*displayScale);
  fit.add(gltf.scene); root.add(fit);
  const bounds=new Box3().setFromObject(root),size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3());
  const span=cell*0.68/Math.max(size.x,size.y,size.z);
  let bones=0;root.traverse(n=>{if(n.isBone)bones++;});
  const motions=['idle','walk','run','attack','hit'];
  for(let m=0;m<motions.length;m++){
    const animator=createPokemonAnimator(gltf.scene,root,{number,family,heightM},gltf.animations);
    for(let phase=0;phase<2;phase++){
      const duration=phase?0.24:0.12;for(let i=0;i<12;i++)animator.update(motions[m],duration/12);
      draw(root,m*2+phase,(number-1)%rows,span,center);
    }
    animator.dispose();
  }
  report.push({number,species,locomotion:POKEMON_LOCOMOTION[number],sourceBones:originalBones,runtimeBones:bones,clips:Object.fromEntries(motions.map(m=>[m,selectSpeciesClip(gltf.animations,m,number)?.name??'procedural'])),sheet:Math.ceil(number/rows),row:(number-1)%rows+1});
  dispose();
  if(number%rows===0||number===151){await save(Math.ceil(number/rows));clear();console.log(`Rendered #${number}`);}
}
await writeFile(`${output}/audit.json`,JSON.stringify(report,null,2)+'\n');
