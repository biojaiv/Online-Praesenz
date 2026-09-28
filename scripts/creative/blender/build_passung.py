"""Author PASSUNG's separable precision drive in Blender, in its assembled pose.
blender -b --factory-startup --python scripts/creative/blender/build_passung.py
X is the assembly axis; Blender Z is up. Exported extras drive the web choreography.
"""
import bpy, bmesh, math, json, random
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'Elemente/Beispiele'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = False
scene.render.threads_mode = 'FIXED'
scene.render.threads = 8
scene.world = bpy.data.worlds.new('PASSUNG · photographic softboxes')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.56, .61, .69, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .55
scene.view_settings.view_transform = 'AgX'
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'

def material(name, color, roughness, metal=1):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = roughness
    return mat

aluminium = material('Satin-milled aluminium', (.62,.65,.69), .25)
turned = material('Concentric face machining', (.65,.67,.70), .235)
steel = material('Ground bearing steel', (.32,.35,.39), .21)
chrome = material('Polished raceways', (.71,.74,.78), .145)
dark = material('Recessed steel and bearing cage', (.065,.073,.088), .30)
rubber = material('Nitrile seal', (.025,.032,.043), .63, 0)

# A subtle, small normal texture exported with the PBR material. No procedural
# Blender nodes are left for the browser to approximate or silently discard.
image = bpy.data.images.new('Fine milling · normal', width=256, height=256)
image.colorspace_settings.name = 'Non-Color'
rng = random.Random(284)
pixels = []
for y in range(256):
    stripe = math.sin(y*2.31)*.028 + math.sin(y*.62)*.016
    for x in range(256):
        grain = rng.uniform(-.009,.009)
        pixels.extend((.5+grain, .5+stripe+grain, 1, 1))
image.pixels.foreach_set(pixels)
image.filepath_raw = str(OUT/'passung-milling-normal.png'); image.file_format='PNG'; image.save(); image.pack()
for mat in [aluminium, steel]:
    nodes=mat.node_tree.nodes; links=mat.node_tree.links
    texture=nodes.new('ShaderNodeTexImage'); texture.image=image
    normal=nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value=.32
    links.new(texture.outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs['Normal'], nodes.get('Principled BSDF').inputs['Normal'])

# Planar face UVs sample genuinely concentric machining marks. A shared small
# texture carries the effect into glTF, without a per-frame procedural shader.
face_image=bpy.data.images.new('Concentric machining · normal',width=256,height=256)
face_image.colorspace_settings.name='Non-Color'
pixels=[]
for y in range(256):
    for x in range(256):
        dx=(x+.5)/256-.5;dy=(y+.5)/256-.5;r=math.hypot(dx,dy)
        wave=(math.sin(r*math.tau*96)*.073+math.sin(r*math.tau*43)*.017)
        grain=rng.uniform(-.002,.002)
        pixels.extend((.5+dx/max(r,.001)*wave+grain,.5+dy/max(r,.001)*wave+grain,1,1))
face_image.pixels.foreach_set(pixels)
face_image.filepath_raw=str(OUT/'passung-turned-normal.png');face_image.file_format='PNG';face_image.save();face_image.pack()
texture=turned.node_tree.nodes.new('ShaderNodeTexImage');texture.image=face_image
normal=turned.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.55
turned.node_tree.links.new(texture.outputs['Color'],normal.inputs['Color'])
turned.node_tree.links.new(normal.outputs['Normal'],turned.node_tree.nodes.get('Principled BSDF').inputs['Normal'])

# Fine tool marks vary surface reflectance as well as the normal. Both maps are
# material properties, so changing illumination still produces real reflections.
for name,slot,is_colour in [('passung-turned-colour','Base Color',True),('passung-turned-roughness','Roughness',False)]:
    pattern=bpy.data.images.new(name,width=256,height=256)
    pattern.colorspace_settings.name='sRGB' if is_colour else 'Non-Color'
    values=[]
    for y in range(256):
        for x in range(256):
            r=math.hypot((x+.5)/256-.5,(y+.5)/256-.5)
            wave=math.sin(r*math.tau*96)*.65+math.sin(r*math.tau*43)*.35
            value=(.78+.026*wave) if is_colour else (.34+.085*wave)
            values.extend((value,value,value,1))
    pattern.pixels.foreach_set(values);pattern.filepath_raw=str(OUT/(name+'.png'))
    pattern.file_format='PNG';pattern.save();pattern.pack()
    node=turned.node_tree.nodes.new('ShaderNodeTexImage');node.image=pattern
    turned.node_tree.links.new(node.outputs['Color'],turned.node_tree.nodes.get('Principled BSDF').inputs[slot])

def activate(ob):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active=ob

def mesh(name, vertices, faces, mat):
    data=bpy.data.meshes.new(name); data.from_pydata(vertices, [], faces); data.update()
    ob=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(ob)
    if mat: ob.data.materials.append(mat)
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm, faces=bm.faces);bm.to_mesh(data);bm.free()
    return ob

def finish(ob, bevel=.035, segments=3):
    activate(ob)
    if bevel:
        mod=ob.modifiers.new('Machined edge radii','BEVEL');mod.width=bevel;mod.segments=segments;mod.harden_normals=True
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for polygon in ob.data.polygons: polygon.use_smooth=True
    mod=ob.modifiers.new('Weighted face normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=50
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=.018)
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob

def box(name, position, size, mat, bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    ob=bpy.context.object;ob.name=name;ob.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if mat:ob.data.materials.append(mat)
    if bevel: finish(ob,bevel)
    return ob

def cylinder(name, x, radius, depth, mat=None, y=0,z=2.15, n=80):
    bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=radius, depth=depth, location=(x,y,z), rotation=(0,math.pi/2,0))
    ob=bpy.context.object;ob.name=name
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    if mat:ob.data.materials.append(mat)
    return ob

def cut(ob, cutter):
    activate(ob);mod=ob.modifiers.new('Precision bore','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)

def ring(name, x, inner, outer, depth, mat, bevel=.012, n=96):
    # Watertight annular prism along X, including independent inner/outer surfaces.
    verts=[]
    for px,r in [(x-depth/2,outer),(x+depth/2,outer),(x-depth/2,inner),(x+depth/2,inner)]:
        verts.extend((px,math.cos(i*math.tau/n)*r,2.15+math.sin(i*math.tau/n)*r) for i in range(n))
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,n+j,n+i),(2*n+j,2*n+i,3*n+i,3*n+j),(j,i,2*n+i,2*n+j),(n+i,n+j,3*n+j,3*n+i)])
    return finish(mesh(name,verts,faces,mat),bevel,2)

parts=[]
def part(name, objects, explode, caption):
    group=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(group)
    group['part']=name;group['explodeX']=explode;group['caption']=caption
    # One mesh per material within a moving component, keeping draw calls small.
    by_material={}
    for ob in objects:by_material.setdefault(ob.data.materials[0],[]).append(ob)
    for mat,obs in by_material.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in obs:ob.select_set(True)
        bpy.context.view_layer.objects.active=obs[0]
        if len(obs)>1:bpy.ops.object.join()
        ob=bpy.context.object;ob.name=name+' · '+mat.name;ob.parent=group
    parts.append(group);return group

def face_finish(ob):
    """Separate planar turned surfaces from lengthwise milling on the walls."""
    if turned not in list(ob.data.materials):ob.data.materials.append(turned)
    slot=list(ob.data.materials).index(turned)
    uv=ob.data.uv_layers.active.data
    for polygon in ob.data.polygons:
        if abs(polygon.normal.x)>.98:
            polygon.material_index=slot
            for loop in polygon.loop_indices:
                v=ob.matrix_world @ ob.data.vertices[ob.data.loops[loop].vertex_index].co
                uv[loop].uv=(v.y/4.0+.5,(v.z-2.15)/4.0+.5)
    return ob

def smooth_outline(points,steps=5):
    result=[]
    for i,p1 in enumerate(points):
        p0,p2,p3=points[(i-1)%len(points)],points[(i+1)%len(points)],points[(i+2)%len(points)]
        for j in range(steps):
            t=j/steps
            result.append(tuple(.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t*t+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t*t*t) for k in range(2)))
    return result

def lathe(name,profile,mat,n=80,bevel=.005):
    verts=[(x,r*math.cos(i*math.tau/n),2.15+r*math.sin(i*math.tau/n)) for x,r in profile for i in range(n)]
    faces=[(j*n+i,j*n+(i+1)%n,((j+1)%len(profile))*n+(i+1)%n,((j+1)%len(profile))*n+i) for j in range(len(profile)) for i in range(n)]
    return finish(mesh(name,verts,faces,mat),bevel,2)

# Trace the new reference's scalloped shoulders, side lobes and lower saddle.
# The silhouette is sampled smoothly along its depth instead of a bevelled box.
half=[(0,4.10),(.50,4.08),(.89,3.91),(1.18,3.99),(1.42,3.78),(1.44,3.34),(1.61,3.00),(1.69,2.80),(1.66,2.32),(1.61,1.76),(1.41,1.37),(1.32,.89),(1.47,.47),(1.21,.33),(.76,.46),(.35,.59),(0,.50)]
outline=smooth_outline(half+[(-y,z) for y,z in half[-2:0:-1]],4)
n=len(outline)
layers=[(-1.52,.98),(-1.46,1),(-.99,1),(-.85,.995),(-.31,.995),(-.18,1),(.61,1),(.69,.995),(.737,.98),(.76,.962)]
verts=[(x,y*scale,2.15+(z-2.15)*scale) for x,scale in layers for y,z in outline]
faces=[tuple(range(n-1,-1,-1)),tuple(range((len(layers)-1)*n,len(layers)*n))]
faces += [(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(layers)-1) for i in range(n)]
housing=mesh('Sculpted bearing housing · reference contours',verts,faces,aluminium)
finish(housing,0)
cut(housing,cylinder('Main bearing through-bore',-.4,1.095,4,n=96))
# Eight outer bores follow the lobes, separately from the bearing retaining ring.
mount_holes=[(y,z) for y,z in [(.98,3.73),(1.52,2.80),(1.43,1.58),(.95,.71)] for y in [-y,y]]
for y,z in mount_holes:
    cut(housing,cylinder('Mounting through-bore',-.4,.115,4,y=y,z=z,n=40))
    cut(housing,cylinder('Mounting countersink',.752,.145,.085,y=y,z=z,n=48))
finish(housing,.008,2);face_finish(housing)
housing_objects=[housing]
# Long, capsule-shaped feet with round front pads and real vertical counterbores.
for side in [-1,1]:
    cy=side*1.45;r=.43;path=[]
    for i in range(25):
        a=-math.pi/2+i*math.pi/24;path.append((.68+r*math.cos(a),cy+r*math.sin(a)))
    for i in range(25):
        a=math.pi/2+i*math.pi/24;path.append((-1.24+r*math.cos(a),cy+r*math.sin(a)))
    k=len(path);v=[(x,y,z) for z in [.045,.49] for x,y in path]
    f=[tuple(range(k-1,-1,-1)),tuple(range(k,2*k))]+[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)]
    foot=mesh('Rounded mounting foot',v,f,aluminium);finish(foot,.055,3)
    for x in [.68,-1.24]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.16,depth=1,location=(x,cy,.30));cut(foot,bpy.context.object)
        bpy.ops.mesh.primitive_cylinder_add(vertices=56,radius=.245,depth=.13,location=(x,cy,.48));cut(foot,bpy.context.object)
    finish(foot,.008,2);housing_objects.append(foot)
# Inset threaded liners and a shallow concentric register add scale and depth.
for y,z in mount_holes:
    liner=ring('Threaded mounting insert',.53,.114,.121,.35,dark,.002,32)
    liner.location.y=y;liner.location.z=z-2.15;housing_objects.append(liner)
    for x in [.57,.63,.69]:
        thread=ring('Thread crest',x,.108,.115,.014,steel,.002,32)
        thread.location.y=y;thread.location.z=z-2.15;housing_objects.append(thread)
register=ring('Machined bearing register',.773,1.095,1.36,.065,aluminium,.012)
for i in range(6):
    a=i*math.tau/6+math.pi/6
    cut(register,cylinder('Retainer bore',.773,.053,.3,y=1.26*math.cos(a),z=2.15+1.26*math.sin(a),n=24))
finish(register,.004,2);face_finish(register);housing_objects.append(register)
part('housing',housing_objects,0,'Gehäuse / Housing')

rear=ring('Rear housing closure',-1.57,.41,1.27,.16,aluminium,.022)
rear_holes=[]
for i in range(6):
    a=i*math.tau/6+math.pi/6;y=1.15*math.cos(a);z=2.15+1.15*math.sin(a);rear_holes.append((y,z))
    cut(rear,cylinder('Rear screw seat',-1.57,.10,.5,y=y,z=z,n=24))
finish(rear,.005,2);face_finish(rear)
rear_objects=[rear,ring('Rear oil seal',-1.67,.40,.52,.04,rubber)]
for y,z in rear_holes:
    head=cylinder('Rear socket screw',-1.65,.093,.045,steel,y,z,32)
    cut(head,cylinder('Hex socket',-1.678,.05,.04,None,y,z,6));finish(head,.004,2);rear_objects.append(head)
part('rear_cover',rear_objects,-.18,'Rückdeckel / Rear cover')

def bearing(name,x,explode,scale=1,extended=False):
    outer=lathe(name+' profiled outer race',[(x-.155,1.075*scale),(x+.155,1.075*scale),(x+.16,1.035*scale),(x+.16,.89*scale),(x+.11,.865*scale),(x-.11,.865*scale),(x-.16,.89*scale),(x-.16,1.035*scale)],steel,n=80)
    bore=.43 if extended else .425*scale
    inner=lathe(name+' stepped inner race',[(x-.18,bore),(x-.18,.595*scale),(x-.13,.625*scale),(x+.13,.625*scale),(x+.18,.585*scale),(x+.18,.50*scale),(x+(.39 if extended else .20),.50*scale),(x+(.39 if extended else .20),bore)],chrome,n=80)
    obs=[outer,inner,ring(name+' dark cage',x-.055,.64*scale,.835*scale,.09,dark,.004,72)]
    for side in [-1,1]:
        obs.append(ring(name+' outer lip',x+side*.158,.918*scale,1.042*scale,.018,chrome,.003,80))
        obs.append(ring(name+' inner relief',x+side*.178,.463*scale,.535*scale,.018,steel,.003,72))
    for i in range(16):
        a=i*math.tau/16
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.137*scale,location=(x+.035,.753*scale*math.cos(a),2.15+.753*scale*math.sin(a)))
        ob=bpy.context.object;ob.name=name+' ball '+str(i+1);ob.data.materials.append(chrome)
        for poly in ob.data.polygons:poly.use_smooth=True
        obs.append(ob)
    return part(name,obs,explode,'Kugellager / Ball bearing')

bearing('front_bearing',.655,0)
bearing('outboard_bearing',1.765,1.42,.82,True)

# Longer exposed shaft with turned shoulders; the reference has no raised key.
profile=[(-1.91,.0),(-1.91,.35),(-1.86,.40),(-1.12,.40),(-1.09,.49),(-.8,.49),(-.77,.58),(-.18,.58),(-.15,.405),(.23,.405),(.27,.423),(.85,.423),(.89,.405),(1.04,.405),(1.08,.40),(1.18,.40),(1.22,.365),(2.13,.365),(2.18,.325),(2.40,.325),(2.44,.30),(2.44,.0)]
shaft=lathe('Ground stepped output shaft',profile,steel,n=96,bevel=.009)
cut(shaft,cylinder('Axial centre bore',2.445,.105,.22,None,n=40));finish(shaft,.004,2)
shaft_objects=[shaft]
for x,r in [(.89,.403),(1.12,.397),(1.17,.397),(2.13,.362),(2.18,.322),(-1.80,.397)]:
    shaft_objects.append(ring('Turned relief groove',x,r-.012,r,.016,dark,.001,64))
shaft_objects.append(ring('Polished shaft shoulder',1.055,.398,.405,.035,chrome,.004,80))
part('shaft',shaft_objects,.18,'Antriebswelle / Drive shaft')

# Continuous annular ring, with a sealed seam and the original dimensions.
circlip=ring('Closed retaining ring',1.1625,.855,.995,.065,steel,.009)
part('circlip',[circlip],1.30,'Haltering / Retaining ring')
spacer=ring('Stepped precision spacer',1.31,.43,.515,.10,chrome,.014)
part('spacer',[spacer,ring('Spacer shoulder',1.37,.43,.475,.025,steel,.004)],1.47,'Distanzring / Spacer')

cover=lathe('Thick front cover with recessed hub',[(1.965,.95),(1.965,1.17),(2.015,1.23),(2.245,1.23),(2.29,1.17),(2.29,.67),(2.24,.625),(2.21,.625),(2.21,.54),(2.17,.54),(2.17,.95)],aluminium,n=96,bevel=.01)
front_holes=[]
for i in range(6):
    a=i*math.tau/6+math.pi/6;y=.995*math.cos(a);z=2.15+.995*math.sin(a)
    front_holes.append((y,z))
    cut(cover,cylinder('Front cover through-bore',2.13,.106,.7,y=y,z=z,n=40))
    cut(cover,cylinder('Front cover chamfer',2.288,.122,.055,y=y,z=z,n=40))
finish(cover,.004,2);face_finish(cover)
part('front_cover',[cover,ring('Recessed cover seal',2.17,.535,.60,.04,dark,.005)],2.30,'Frontdeckel / Front cover')

# Restore the six front socket screws from the first assembly, aligned with
# the current cover's bore circle. Rear screws remain with their rear cover.
bolts=[]
for y,z in front_holes:
    head=cylinder('Front socket cap screw',2.342,.145,.11,steel,y,z,32)
    cut(head,cylinder('Hex socket',2.395,.072,.075,None,y,z,6));finish(head,.008,2)
    stem=finish(cylinder('Front screw shank',2.075,.085,.43,dark,y,z,24),.008,2)
    bolts.extend([head,stem])
fasteners=part('fasteners',bolts,2.30,'Frontverschraubung / Front fasteners')
fasteners['screwCount']=len(front_holes)
fasteners['withdrawX']=.85

# Compact rest positions put both bearings inside the housing/cover. Preserve
# the reference's initial exploded positions exactly at expansion = 0.70.
rest_offsets={'front_bearing':-.40,'outboard_bearing':-.965,'circlip':-.595,'spacer':-.785,'front_cover':-1.14,'fasteners':-1.14}
for group in parts:
    offset=rest_offsets.get(group.name,0)
    for child in group.children:child.location.x+=offset
    group['explodeX']-=offset/.70

root=bpy.data.objects.new('PASSUNG_precision_drive',None);bpy.context.collection.objects.link(root)
root['source']='PASSUNG.blend';root['axis']='X';root['units']='illustrative metres';root['version']=4
root['reference']='Entwuerfe/passung-bauteil.jpg'
# The CAD overlay uses the same authored profile, depth stations and drilled
# centres as the solid mesh. Compact parameters avoid duplicating many paths.
draft={'axis':2.15,'outline':[[round(y,4),round(z,4)] for y,z in outline],
       'layers':layers,'bore':1.095,'holes':[[y,z,.115] for y,z in mount_holes],
       'feet':{'centres':[-1.45,1.45],'rear':-1.24,'front':.68,'radius':.43,'top':.49,'bottom':.045,'bore':.16,'counterbore':.245}}
root['blueprintDraft']=json.dumps(draft,separators=(',',':'))
root['note']='Authored concept assembly, not a production engineering drawing.'
for group in parts:group.parent=root

# Non-exported photographic lighting and camera make the source immediately usable.
def area(name,position,energy,size,target=(0,0,2)):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='RECTANGLE';data.size=size;data.size_y=size*.45
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=position
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
area('Long softbox',(-2,-5,8),1500,7)
area('Front fill',(7,-3,5),1200,5)
area('Rim softbox',(1,5,6),1800,6)
camera=bpy.data.cameras.new('Reference composition');camera.type='ORTHO';camera.ortho_scale=8.2
ob=bpy.data.objects.new('Reference composition',camera);bpy.context.collection.objects.link(ob);ob.location=(9.5,-16,5.8)
ob.rotation_euler=(Vector((1.0,0,2.05))-ob.location).to_track_quat('-Z','Y').to_euler();scene.camera=ob
scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100

bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'PASSUNG.blend'))
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
for group in parts:
    group.select_set(True)
    for child in group.children:child.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'PASSUNG_web.glb'),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
report={'source':'PASSUNG.blend','parts':[{'name':p.name,'explodeX':p['explodeX'],'withdrawX':p.get('withdrawX',0),'meshes':len(p.children)} for p in parts],'polygons':sum(len(o.data.polygons) for o in scene.objects if o.type=='MESH')}
(OUT/'passung-assembly.json').write_text(json.dumps(report,indent=2))
print('PASSUNG source and web export complete',json.dumps(report))
