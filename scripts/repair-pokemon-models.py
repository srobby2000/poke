"""Deterministic GLB material repairs identified during the per-species render audit."""
import json
import pathlib
import struct

ROOT = pathlib.Path(__file__).resolve().parents[1]

def patch(number, change):
    path = ROOT / f'public/models/pokemon/{number}.glb'
    data = path.read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    document = json.loads(data[20:20 + length])
    change(document)
    encoded = json.dumps(document, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    tail = data[20 + length:]
    path.write_bytes(struct.pack('<III', 0x46546c67, 2, 20 + len(encoded) + len(tail)) + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded + tail)

def remove_outline(document):
    for mesh in document['meshes']:
        mesh['primitives'] = [p for p in mesh['primitives'] if document['materials'][p['material']].get('name') not in ['outline', 'Material_202']]
    for node in document['nodes']:
        if 'mesh' in node and not document['meshes'][node['mesh']]['primitives']:
            del node['mesh']
    # Keep unused mesh records valid; node references are deliberately removed.
    for mesh in document['meshes']:
        if not mesh['primitives']:
            mesh['primitives'] = document['meshes'][0]['primitives']

def haunter(document):
    for material in document['materials']:
        if material['name'] == 'Body':
            material['pbrMetallicRoughness'] = {'baseColorFactor': [0.19, 0.13, 0.3, 1], 'metallicFactor': 0, 'roughnessFactor': 0.8}
        elif material['name'] == 'Tongue':
            material['pbrMetallicRoughness'] = {'baseColorFactor': [0.5, 0.13, 0.23, 1], 'metallicFactor': 0, 'roughnessFactor': 0.8}

for number in [41, 95]: patch(number, remove_outline)
patch(93, haunter)
print('Repaired Zubat/Onix outline shells and Haunter palette. Flame masks and wing surfaces are corrected at runtime.')
