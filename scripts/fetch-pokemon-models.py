"""Fetch pinned Kanto GLBs and record a per-species structural audit.
Run with Python 3. Does not execute any downloaded content.
"""
import concurrent.futures
import hashlib
import json
import pathlib
import re
import struct
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
COMMIT = '429de1288cea0d43f5b4f56305d2276e94239d65'
BASE = f'https://raw.githubusercontent.com/Pokemon-3D-api/assets/{COMMIT}/models/opt/regular'
catalog = (ROOT / 'src/game/pokemonModels.ts').read_text().split('const catalog = `')[1].split('`;')[0]
names = [line.split()[0] for line in catalog.splitlines()]

def fetch(entry):
    number, species = entry
    url = f'{BASE}/{number}.glb'
    path = ROOT / f'public/models/pokemon/{number}.glb'
    data = path.read_bytes() if path.exists() else subprocess.check_output(['curl', '--fail', '--silent', '--show-error', '--location', '--retry', '2', '--max-time', '60', url])
    magic, version, length = struct.unpack_from('<III', data)
    assert magic == 0x46546c67 and version == 2 and length == len(data), species
    json_length, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4e4f534a, species
    model = json.loads(data[20:20 + json_length])
    assert model.get('meshes') and model.get('scenes'), species
    assert all('uri' not in image for image in model.get('images', [])), f'{species}: external image'
    assert all('uri' not in buffer for buffer in model.get('buffers', [])), f'{species}: external buffer'
    mesh_names = [mesh.get('name', '') for mesh in model['meshes']]
    node_names = [node.get('name', '') for node in model.get('nodes', [])]
    path.write_bytes(data)
    return dict(number=number, species=species, source=url, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(),
                meshNames=mesh_names, rootNames=node_names[-8:], animations=[a.get('name','') for a in model.get('animations',[])],
                textures=len(model.get('images',[])), requiredExtensions=model.get('extensionsRequired',[]),
                structuralCheck='passed', visualCheck='pending')

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    rows = list(pool.map(fetch, enumerate(names, 1)))
(ROOT / 'docs/pokemon-model-audit.json').write_text(json.dumps(dict(sourceCommit=COMMIT, models=rows), indent=2) + '\n')
print(f'Downloaded and structurally checked {len(rows)} models; {sum(r["bytes"] for r in rows)/1e6:.1f} MB')
for row in rows:
    print(f'{row["number"]:03} {row["species"]}: {", ".join(row["meshNames"])}')
