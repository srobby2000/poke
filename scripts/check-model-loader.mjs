// Asset parser smoke check without a browser or GPU. Textures are decoded by
// the browser in production; this checks mesh parsing, cloning and framing.
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three-stdlib';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Box3, Vector3 } from 'three';
globalThis.ProgressEvent = class { constructor(type, init) { Object.assign(this, { type }, init); } };
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 256, height: 256, close() {} });
const loader = new GLTFLoader();
for (let number=1; number<=151; number++) {
  const bytes = await readFile(`public/models/pokemon/${number}.glb`);
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength), '');
  const scene = clone(gltf.scene);
  scene.updateMatrixWorld(true);
  const size = new Box3().setFromObject(scene).getSize(new Vector3());
  if (!size.toArray().every(Number.isFinite) || size.length()===0) throw new Error(`Invalid model bounds: ${number}`);
  scene.traverse(object => {
    object.geometry?.dispose();
    for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[])material.dispose();
  });
}
console.log('151 GLBs parsed, cloned and bounded without Draco or browser workers.');
