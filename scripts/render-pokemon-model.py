"""Offline visual QA. Requires bpy 4.5 and Python 3.11; run with a Dex number.
Matches the runtime wing-surface and flame-mask corrections.
"""
import bpy, math, sys, pathlib, os, tempfile
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parents[1]
output=pathlib.Path(os.environ.get('POKEMON_REVIEW_DIR', pathlib.Path(tempfile.gettempdir()) / 'pokemon-model-review'))
output.mkdir(parents=True, exist_ok=True)
number=int(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
model_dir=pathlib.Path(os.environ.get('POKEMON_MODEL_DIR', root/'public/models/pokemon'))
bpy.ops.import_scene.gltf(filepath=str(model_dir/f'{number}.glb'))
print('IMPORTED',number)
if number == 12:
 import bmesh
 for obj in bpy.context.scene.objects:
  if obj.type != 'MESH' or obj.name == 'Icosphere':continue
  bm=bmesh.new();bm.from_mesh(obj.data);seen=set();duplicate=[]
  for face in bm.faces:
   key=(face.material_index,tuple(sorted(tuple(round(c,5) for c in v.co) for v in face.verts)))
   if key in seen:duplicate.append(face)
   else:seen.add(key)
  bmesh.ops.delete(bm,geom=duplicate,context='FACES_ONLY');bm.to_mesh(obj.data);bm.free()
  for slot in obj.material_slots:slot.material.use_backface_culling=False
if number in [6,78]:
 for material in bpy.data.materials:
  if material.name not in ['Material_15','Material_16','FireCoreA','FireStenA']:continue
  nodes=material.node_tree.nodes;links=material.node_tree.links
  tex=next(node for node in nodes if node.type=='TEX_IMAGE');bsdf=next(node for node in nodes if node.type=='BSDF_PRINCIPLED')
  for link in list(bsdf.inputs['Base Color'].links):links.remove(link)
  ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(1,.08,.005,1);ramp.color_ramp.elements[1].color=(1,.8,.04,1)
  links.new(tex.outputs['Color'],ramp.inputs[0]);links.new(ramp.outputs['Color'],bsdf.inputs['Base Color']);links.new(tex.outputs['Color'],bsdf.inputs['Alpha'])
  bsdf.inputs['Metallic'].default_value=0;bsdf.inputs['Emission Color'].default_value=(1,.25,.01,1);bsdf.inputs['Emission Strength'].default_value=1

bpy.context.view_layer.update()
objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name != 'Icosphere' and not o.hide_render]
points=[o.matrix_world @ Vector(c) for o in objects for c in o.bound_box]
lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
center=(lo+hi)/2; extent=max(hi-lo)
# Match glTF/Three.js single-sided materials in Cycles.
for material in bpy.data.materials:
 if material.use_nodes and material.use_backface_culling:
  nodes=material.node_tree.nodes; links=material.node_tree.links
  material_output=next((node for node in nodes if node.type=='OUTPUT_MATERIAL'),None)
  if material_output and material_output.inputs['Surface'].links:
   shader=material_output.inputs['Surface'].links[0].from_socket
   mix=nodes.new('ShaderNodeMixShader'); transparent=nodes.new('ShaderNodeBsdfTransparent'); geo=nodes.new('ShaderNodeNewGeometry')
   links.new(shader,mix.inputs[1]);links.new(transparent.outputs[0],mix.inputs[2]);links.new(geo.outputs['Backfacing'],mix.inputs[0]);links.new(mix.outputs[0],material_output.inputs['Surface'])
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=8
scene.render.resolution_x=300;scene.render.resolution_y=300;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(0.6,0.6,0.6,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=0.5
bpy.ops.object.camera_add(location=center+Vector((0.35,-1,0.3))*extent*2)
cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.clip_start=extent*0.001;cam.data.clip_end=extent*100;cam.data.type='ORTHO';cam.data.ortho_scale=extent*1.2;scene.camera=cam
bpy.ops.object.light_add(type='AREA', location=center+Vector((1,-2,3))*extent)
bpy.context.object.data.energy=60*extent**2;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=extent*3
scene.view_settings.view_transform='Standard'
scene.render.filepath=str(output/f'{number}.png')
bpy.ops.render.render(write_still=True)
