// Optional build-time conversion. Requires @gltf-transform/core and extensions 4.3,
// draco3dgltf in POKEMON_ASSET_TOOLS_DIR, and Pillow in POKEMON_ASSET_PYTHON.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const require = createRequire(resolve(process.env.POKEMON_ASSET_TOOLS_DIR || '.', 'package.json'));
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const draco = require('draco3dgltf');
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const root=fileURLToPath(new URL('..', import.meta.url));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});
function fingerprint(doc) {
 const hash=createHash('sha256');
 for(const accessor of doc.getRoot().listAccessors()) { const a=accessor.getArray();if(a) hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)); }
 hash.update(JSON.stringify(doc.getRoot().listNodes().map(n=>[n.getName(),n.getTranslation(),n.getRotation(),n.getScale()])));
 return hash.digest('hex');
}
const audit=JSON.parse(readFileSync(`${root}/docs/pokemon-model-audit.json`));
for(let i=1;i<=151;i++) {
 const path=`${root}/public/models/pokemon/${i}.glb`;
 const doc=await io.read(path);const before=fingerprint(doc);
 for(const texture of doc.getRoot().listTextures()) {
  if(texture.getMimeType()!=='image/webp')continue;
  const result=spawnSync(process.env.POKEMON_ASSET_PYTHON || 'python3',['-c','from PIL import Image; import sys,io; im=Image.open(io.BytesIO(sys.stdin.buffer.read())); im.save(sys.stdout.buffer,format="PNG")'],{input:texture.getImage(),maxBuffer:16*1024*1024});
  if(result.status!==0)throw new Error(result.stderr.toString());
  texture.setImage(new Uint8Array(result.stdout)).setMimeType('image/png');
 }
 for(const ext of doc.getRoot().listExtensionsUsed()) if(['KHR_draco_mesh_compression','EXT_texture_webp'].includes(ext.extensionName))ext.dispose();
 if(before!==fingerprint(doc))throw new Error(`Geometry or node transforms changed: ${i}`);
 await io.write(path,doc);
 const result=await io.read(path);
 // Verify the writer preserves actual geometry arrays regardless of accessor order.
 const arrays=d=>d.getRoot().listAccessors().map(a=>{const b=a.getArray();return b?createHash('sha256').update(Buffer.from(b.buffer,b.byteOffset,b.byteLength)).digest('hex'):'';}).sort();
 if(JSON.stringify(arrays(doc))!==JSON.stringify(arrays(result)))throw new Error(`Geometry round-trip mismatch: ${i}`);
 const bytes=readFileSync(path);const row=audit.models.find(r=>r.number===i);
 row.bytes=bytes.length;row.sha256=createHash('sha256').update(bytes).digest('hex');
 row.requiredExtensions=result.getRoot().listExtensionsRequired().map(e=>e.extensionName);
 row.delivery='Uncompressed geometry with embedded PNG textures; decoded geometry and node transforms preserved.';
 console.log(i,bytes.length);
}
writeFileSync(`${root}/docs/pokemon-model-audit.json`,JSON.stringify(audit,null,2)+'\n');
