"""Author the two creative projects in Blender. Web exports contain real authored geometry.
Run: blender -b --factory-startup --python scripts/creative/blender/build_assets.py -- city|resonanz|ticket
"""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'Elemente/Beispiele';OUT.mkdir(parents=True,exist_ok=True)
R=random.Random(1924)

def xyz(p):return (p[0],-p[2],p[1])
def srgb(hexcode):
 s=hexcode.lstrip('#');c=[int(s[i:i+2],16)/255 for i in (0,2,4)]
 return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c)
def reset():
 bpy.ops.wm.read_factory_settings(use_empty=True)
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False
 scene.render.threads_mode='FIXED';scene.render.threads=10
 scene.world=bpy.data.worlds.new('Soft studio');scene.world.use_nodes=True
 scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(*srgb('e9e2d6'),1)
 scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.85
 scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
 scene.render.image_settings.file_format='PNG';scene.render.resolution_percentage=100
 return scene

def material(name,color,rough=.8,metal=0,grain=False):
 mat=bpy.data.materials.new(name);mat.use_nodes=True;bsdf=mat.node_tree.nodes.get('Principled BSDF')
 bsdf.inputs['Base Color'].default_value=(*srgb(color),1);bsdf.inputs['Roughness'].default_value=rough;bsdf.inputs['Metallic'].default_value=metal
 if grain:
  nodes=mat.node_tree.nodes;links=mat.node_tree.links
  tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=42;tex.inputs['Detail'].default_value=2
  ramp=nodes.new('ShaderNodeValToRGB');base=srgb(color)
  ramp.color_ramp.elements[0].color=(*(v*.76 for v in base),1);ramp.color_ramp.elements[1].color=(*(min(1,v*1.08) for v in base),1)
  links.new(tex.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs[0],bsdf.inputs['Base Color'])
  bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.13;bump.inputs['Distance'].default_value=.028
  links.new(tex.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs[0],bsdf.inputs['Normal'])
 return mat

def mesh(name,verts,faces,mat=None):
 data=bpy.data.meshes.new(name);data.from_pydata([xyz(v) for v in verts],[],faces);data.update()
 ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob)
 if mat:data.materials.append(mat)
 return ob

def light(name,pos,energy,size=8):
 data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size
 ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=xyz(pos)
 ob.rotation_euler=(Vector((0,0,0))-ob.location).to_track_quat('-Z','Y').to_euler();return ob

def camera(pos,target,scale,resolution):
 data=bpy.data.cameras.new('Composition');data.type='ORTHO';data.ortho_scale=scale
 ob=bpy.data.objects.new('Composition',data);bpy.context.collection.objects.link(ob);ob.location=xyz(pos);ob.rotation_euler=(Vector(xyz(target))-ob.location).to_track_quat('-Z','Y').to_euler()
 bpy.context.scene.camera=ob;bpy.context.scene.render.resolution_x=resolution[0];bpy.context.scene.render.resolution_y=resolution[1]
 return ob

def select(objects):
 bpy.ops.object.select_all(action='DESELECT')
 for ob in objects:ob.select_set(True)
 if objects:bpy.context.view_layer.objects.active=objects[0]

def export(name,objects):
 select(objects)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'_web.glb')),export_format='GLB',use_selection=True,export_extras=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_apply=True)

class Batch:
 def __init__(self):self.groups={}
 def add(self,mat,verts,faces):
  v,f=self.groups.setdefault(mat,([],[]));offset=len(v);v.extend(verts);f.extend([tuple(offset+i for i in face) for face in faces])
 def box(self,mat,x,y,z,w,h,d,angle=0):
  verts=[];c,s=math.cos(angle),math.sin(angle)
  for dx,dy,dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
   X=dx*w/2;Z=dz*d/2;verts.append((x+X*c+Z*s,y+dy*h/2,z-X*s+Z*c))
  self.add(mat,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)])
 def tube(self,mat,points,radius=.015,sides=5):
  vs=[];fs=[]
  for i,p in enumerate(points):
   tangent=Vector(points[min(len(points)-1,i+1)])-Vector(points[max(0,i-1)])
   tangent.normalize();normal=tangent.cross(Vector((0,1,0)))
   if normal.length<.01:normal=tangent.cross(Vector((1,0,0)))
   normal.normalize();bitangent=tangent.cross(normal).normalized()
   for k in range(sides):vs.append(tuple(Vector(p)+radius*(math.cos(k*math.tau/sides)*normal+math.sin(k*math.tau/sides)*bitangent)))
  for i in range(len(points)-1):
   for k in range(sides):a=i*sides+k;b=i*sides+(k+1)%sides;fs.append((a,b,b+sides,a+sides))
  self.add(mat,vs,fs)
 def cylinder(self,mat,x,y,z,r,h,n=10,r2=None):
  r2=r if r2 is None else r2;vs=[]
  for height,radius in [(y-h/2,r),(y+h/2,r2)]:
   vs.extend((x+math.cos(k*math.tau/n)*radius,height,z+math.sin(k*math.tau/n)*radius) for k in range(n))
  fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(k,(k+1)%n,(k+1)%n+n,k+n) for k in range(n)]
  self.add(mat,vs,fs)
 def ellipsoid(self,mat,x,y,z,rx,ry,rz,seed=0):
  vs=[];n=12;m=8;rng=random.Random(seed)
  for j in range(m+1):
   phi=math.pi*j/m
   for k in range(n):
    a=k*math.tau/n;r=1+rng.uniform(-.1,.1)
    vs.append((x+math.sin(phi)*math.cos(a)*rx*r,y+math.cos(phi)*ry*r,z+math.sin(phi)*math.sin(a)*rz*r))
  fs=[(j*n+k,j*n+(k+1)%n,(j+1)*n+(k+1)%n,(j+1)*n+k) for j in range(m) for k in range(n)]
  self.add(mat,vs,fs)
 def objects(self,prefix):
  return [mesh(prefix+'_'+mat.name,v,f,mat) for mat,(v,f) in self.groups.items()]

def roof(batch,mat,x,y,z,w,h,d):
 # Real gabled roof, with eaves and ridge, rather than pyramids.
 verts=[(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x,y+h,z-d/2),(x-w/2,y,z+d/2),(x+w/2,y,z+d/2),(x,y+h,z+d/2)]
 batch.add(mat,verts,[(0,1,2),(3,5,4),(0,2,5,3),(2,1,4,5),(0,3,4,1)])

def build_city():
 scene=reset();scene.cycles.samples=32;R.seed(1924)
 paper=material('Archival cotton paper','eee8db',grain=True);edge=material('Paper fibres','d3c5ac',grain=True)
 plaster=[material('Limestone '+str(i),c,grain=True) for i,c in enumerate(['d8d1bf','c8bda7','e2dccb','d0c6b0'])]
 brick=[material('Brick '+str(i),c,grain=True) for i,c in enumerate(['956c55','ad8266','88644f'])]
 trim=material('Stone window reveals','d1c4ad');slate=material('Slate roofs','73716b',grain=True);tile=material('Warm roof tiles','958575',grain=True)
 glass=material('Recessed window panes','485155',.45);wood=material('Oak doors','766653',grain=True)
 foliage=[material('Leaves '+str(i),c) for i,c in enumerate(['777a60','8b896d','656d54','a39b77'])]
 trunk=material('Branches','847361');ink=material('Graphite plan','b5ac99');stone=material('Excavated stone','c1ad92',grain=True)
 red=material('Vermilion timeline','ed3827',.6);red.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(*srgb('ed3827'),1);red.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=.6
 ceramic=material('Kollmar Jourdan glazed green','7d9172',.5,grain=True)
 sandstone=material('Schlossberg red sandstone','aa816c',grain=True)
 copper=material('Aged terracotta roofs','ad836c',grain=True)
 all_objects=[];b=Batch();anchors=[];doorways=[];emitters=[];years=['2026','1924','1643','0244']
 levels=[(3.6,-6.5,10.5,4.4),(1.25,-2.05,12.8,4.5),(-1.1,2.85,15.0,5.3),(-3.45,8.35,17.4,5.7)]
 def tree(x,y,z,height=1):
  b.cylinder(trunk,x,y+height*.4,z,.032,height*.8,6)
  for k in range(5):
   a=k*2.4;dx=math.cos(a)*.2;dz=math.sin(a)*.18
   b.tube(trunk,[(x,y+height*.45,z),(x+dx,y+height*.8,z+dz)],.018,4)
   b.ellipsoid(foliage[k%4],x+dx,y+height*(.7+(k%2)*.12),z+dz,.25,height*.27,.23,k+int((x+20)*10))
 def person(x,y,z,index):
  mat=wood if index%3 else slate;b.cylinder(mat,x,y+.12,z,.025,.19,5);b.ellipsoid(trim,x,y+.245,z,.032,.038,.032,index);b.tube(mat,[(x-.025,y+.1,z),(x-.04,y+.01,z+.02)],.012,4);b.tube(mat,[(x+.025,y+.1,z),(x+.05,y+.01,z-.01)],.012,4)
 def window(x,y,z,w=.16,h=.27,side=False):
  # Frames, deep dark opening, lintel, sill and a cross mullion.
  if not side:
   b.box(glass,x,y,z,w,h,.014);b.box(trim,x,y+h/2+.025,z+.018,w+.055,.034,.055);b.box(trim,x,y-h/2-.023,z+.032,w+.075,.033,.075)
   b.box(trim,x,y,z+.02,.018,h,.035);b.box(trim,x,y+.005,z+.022,w,.018,.035)
  else:
   b.box(glass,x,y,z,.014,h,w);b.box(trim,x+.02,y+h/2+.025,z,.05,.03,w+.07);b.box(trim,x+.025,y-h/2-.024,z,.07,.03,w+.09);b.box(trim,x+.018,y,z,.03,h,.015)
 def arch(x,y,z,w,h,mat=glass):
  radius=w/2;spring=y+h-radius;outline=[(x-radius,y,z),(x+radius,y,z)]
  for k in range(13):
   a=k/12*math.pi;outline.append((x+math.cos(a)*radius,spring+math.sin(a)*radius,z))
  b.add(mat,outline,[tuple(range(len(outline)))])
  b.tube(trim,[(px,py,pz+.006) for px,py,pz in outline+[outline[0]]],.018 if w<.3 else .04,6)
 def house(x,y,z,w,d,h,era,index):
  body=brick[index%3] if era==1 else plaster[index%4]
  b.box(body,x,y+h/2,z,w,h,d)
  b.box(trim,x,y+.085,z,w+.045,.17,d+.045)
  modern=era==0
  if modern:
   b.box(plaster[2],x,y+h+.06,z,w+.12,.12,d+.12)
   b.box(wood,x,y+h+.145,z,w*.8,.05,d*.8)
   for dx in [-w/2,w/2]:b.box(plaster[2],x+dx,y+h+.24,z,.055,.35,d)
   for dz in [-d/2,d/2]:b.box(plaster[2],x,y+h+.24,z+dz,w,.35,.055)
   for k in range(5):
    px=x-w*.29+k*w*.14;pz=z-d*.25
    b.box(wood,px,y+h+.2,pz,.13,.1,.3);b.ellipsoid(foliage[k%4],px,y+h+.29,pz,.12,.13,.12,k+index*5)
  else:
   roof(b,slate if era==1 else tile,x,y+h,z,w+.14,h*.36,d+.16)
   b.tube(trim,[(x,y+h+h*.36+.02,z-d/2-.08),(x,y+h+h*.36+.02,z+d/2+.08)],.023,5)
   # Readable slate/tile courses, restrained against the roof colour.
   for k in range(1,6):
    xx=w/2*k/6;yy=y+h+h*.36*(1-k/6)
    for sign in [-1,1]:b.tube(ink,[(x+sign*xx,yy+.012,z-d/2-.04),(x+sign*xx,yy+.012,z+d/2+.04)],.005,3)
   b.box(body,x+w*.23,y+h+.31,z-d*.17,.14,.75,.17);b.box(trim,x+w*.23,y+h+.7,z-d*.17,.2,.08,.22)
   if era==2:emitters.append((x+w*.23,y+h+.77,z-d*.17,era,.36))
  floors=max(1,round(h/(.68 if era==2 else .47)));columns=max(2,round(w/(.5 if era==2 else .34)))
  for floor in range(floors):
   yy=y+.3+floor*(h-.23)/floors
   for col in range(columns):
    xx=x+(col-(columns-1)/2)*(w-.24)/columns
    if era==2:
     arch(xx,yy-.1,z+d/2+.019,.15,.29)
     if index%2:
      for dx in [-.13,.13]:b.box(wood,xx+dx,yy+.02,z+d/2+.015,.065,.24,.025)
    else:window(xx,yy,z+d/2+.011,w=.15 if not modern else .23,h=.25 if not modern else .3)
    if modern and floor>0:
     b.box(trim,xx,yy-.17,z+d/2+.12,.31,.035,.25)
     for rail in [-.145,0,.145]:b.box(glass,xx+rail,yy-.035,z+d/2+.23,.015,.25,.014)
     b.box(glass,xx,yy+.09,z+d/2+.23,.31,.016,.014)
   for col in range(max(2,round(d/.4))):window(x+w/2+.011,yy,z+(col-(max(2,round(d/.4))-1)/2)*.35,side=True)
  if era==2:arch(x-w*.22,y+.025,z+d/2+.037,.26,.56,wood)
  else:b.box(wood,x-w*.22,y+.25,z+d/2+.035,.22,.5,.028)
  b.box(trim,x-w*.22,y+.02,z+d/2+.12,.32,.045,.22)
  doorways.append((x-w*.22,y,z+d/2+.065,era,w))
  if era==2 and index%3==0:
   # Half-timbering on selected medieval houses.
   for dx in [-w*.45,0,w*.45]:b.box(wood,x+dx,y+h*.57,z+d/2+.025,.035,h*.85,.035)
   b.box(wood,x,y+h*.6,z+d/2+.03,w,.035,.04)
   for dx in [-w*.24,w*.24]:
    b.tube(wood,[(x+dx-w*.2,y+h*.25,z+d/2+.047),(x+dx+w*.2,y+h*.59,z+d/2+.047)],.023,4)
  if era==1:
   # Fine mortar courses and a cornice break the otherwise plain brick volumes.
   for k in range(1,int(h/.13)):b.box(ink,x,y+k*.13,z+d/2+.012,w,.006,.008)
   b.box(trim,x,y+h-.08,z,w+.055,.045,d+.055)
 def pavilion(x,y,z):
  # Reuchlinhaus: four distinct cubes around a low glazed foyer. The raised
  # aluminium-panel wing and the glass/steel cube follow the reference photos.
  for dx,dz,w,d,h,kind in [(-.82,-.28,1.48,1.22,1.31,0),(.78,.04,1.3,1.45,1.13,1),(-.72,-1.08,1.3,.66,.88,2),(.64,-1.04,1.03,.72,.77,3)]:
   bottom=.25 if kind==1 else .08
   b.box(glass if kind==0 else sandstone if kind==2 else plaster[2],x+dx,y+bottom+h/2,z+dz,w,h,d)
   b.box(trim,x+dx,y+bottom+h+.035,z+dz,w+.08,.07,d+.08)
   if kind==0:
    for k in range(7):
     xx=x+dx+(k/6-.5)*w;b.box(trim,xx,y+h/2+.08,z+dz+d/2+.025,.027,h,.025)
    for k in range(5):
     zz=z+dz+(k/4-.5)*d;b.box(trim,x+dx+w/2+.015,y+h/2+.08,zz,.03,h,.022)
    for yy in [.11,.64,1.17]:b.box(trim,x+dx,y+yy,z+dz+d/2+.027,w,.023,.03)
   if kind==1:
    for ix in range(5):
     for iy in range(4):
      px=x+dx+(ix-2)*w/5;py=y+bottom+(iy+.5)*h/4
      b.box(plaster[(ix+iy)%3],px,py,z+dz+d/2+.016,w/5-.024,h/4-.024,.022)
      b.box(trim,px,py,z+dz+d/2+.035,.022,h/4,.025)
    for xx in [-w*.42,w*.42]:b.cylinder(trim,x+dx+xx,y+.13,z+dz+d*.3,.022,.26,6)
  b.box(glass,x,y+.39,z+.22,.53,.78,.9);b.box(trim,x,y+.79,z+.22,.65,.045,1.02)
  b.box(wood,x,y+.22,z+.69,.24,.44,.022)
  for k in range(4):b.box(plaster[0],x,y+.075-k*.016,z+.75+k*.1,.67,.028,.12)
  doorways.append((x,y,z+.76,0,1.6))
 def station(x,y,z):
  # Conradi's Pforzheim Hauptbahnhof: continuous glass, a flying canopy,
  # and the masonry clock wall instead of another generic apartment block.
  w=3.35;h=1.16;d=.96
  b.box(glass,x,y+h/2,z,w,h,d)
  for k in range(13):b.box(trim,x+(k/12-.5)*w,y+h/2,z+d/2+.018,.025,h,.035)
  for yy in [.34,.84]:b.box(trim,x,y+yy,z+d/2+.023,w,.022,.03)
  b.add(trim,[(x-w/2-.1,y+h,z-.6),(x+w/2+.1,y+h,z-.6),(x+w/2+.1,y+h+.12,z+.85),(x-w/2-.1,y+h+.12,z+.85)],[(0,1,2,3)])
  b.box(plaster[1],x+w/2-.25,y+.61,z+.01,.56,1.22,1.03)
  cx=x+w/2-.25;cy=y+.86;cz=z+.544
  b.tube(wood,[(cx+math.cos(k*math.tau/32)*.205,cy+math.sin(k*math.tau/32)*.205,cz) for k in range(33)],.014,5)
  b.tube(wood,[(cx-.08,cy+.10,cz+.01),(cx,cy,cz+.01),(cx+.12,cy+.045,cz+.01)],.012,5)
  b.box(wood,x-.3,y+.26,z+.51,.38,.52,.032)
  doorways.append((x-.3,y,z+.535,0,2.3))
 def kollmar_jourdan(x,y,z):
  # Green glazed masonry, large arched windows, a projecting corner bay,
  # pale upper storey and a covered connection are the building's signatures.
  w,d=3.45,1.38
  b.box(brick[2],x,y+.23,z,w,.46,d)
  b.box(ceramic,x,y+.95,z,w,1.02,d)
  b.box(plaster[2],x,y+1.67,z,w,.43,d)
  b.box(slate,x,y+1.925,z,w+.1,.085,d+.12)
  for k in range(8):
   xx=x+(k-3.5)*.405
   arch(xx,y+.025,z+d/2+.024,.25,.36)
   arch(xx,y+.57,z+d/2+.024,.29,.73)
   arch(xx,y+1.48,z+d/2+.024,.21,.29)
   for yy in [.49,1.38,1.87]:b.box(trim,xx, y+yy,z+d/2+.04,.39,.045,.07)
   b.box(trim,xx+.198,y+.96,z+d/2+.046,.045,.98,.075)
   for yy in [.81,1.03]:b.box(wood,xx,y+yy,z+d/2+.047,.25,.016,.025)
  bx=x-w*.34;b.cylinder(ceramic,bx,y+1.13,z+d/2-.12,.43,2.26,8)
  b.cylinder(plaster[2],bx,y+2.08,z+d/2-.12,.435,.33,8)
  b.cylinder(slate,bx,y+2.29,z+d/2-.12,.48,.085,8)
  arch(bx,y+.04,z+d/2+.291,.27,.55,wood)
  arch(bx,y+.84,z+d/2+.296,.33,.82)
  window(bx,y+2.03,z+d/2+.316,.24,.24)
  for yy in [.69,1.78]:b.box(trim,bx,y+yy,z+d/2+.318,.59,.095,.07)
  # Elevated connecting passage, like the link across Hans-Meid-Straße.
  b.box(plaster[1],x-w/2-.46,y+1.38,z,.98,.47,.56)
  for k in range(3):window(x-w/2-.78+k*.28,y+1.38,z+.286,.18,.22)
  b.box(brick[1],x-w/2-.92,y+.76,z,.12,1.52,.7)
  doorways.append((bx,y,z+d/2+.33,1,2.2))
 def factory(x,y,z):
  w,d,h=2.6,1.22,1.18;b.box(brick[0],x,y+h/2,z,w,h,d)
  # Three asymmetric north-light sheds, glazed on the steep face.
  for k in range(3):
   a=x-w/2+k*w/3;end=a+w/3
   b.add(slate,[(a,y+h,z-d/2),(end-.16,y+h+.43,z-d/2),(end,y+h,z-d/2),(a,y+h,z+d/2),(end-.16,y+h+.43,z+d/2),(end,y+h,z+d/2)],[(0,1,4,3),(0,2,1),(3,4,5)])
   b.add(glass,[(end-.16,y+h+.43,z-d/2),(end,y+h,z-d/2),(end,y+h,z+d/2),(end-.16,y+h+.43,z+d/2)],[(0,1,2,3)])
  for k in range(7):
   xx=x+(k-3)*.35;arch(xx,y+.29,z+d/2+.02,.22,.64)
   b.box(trim,xx+.175,y+.53,z+d/2+.038,.045,1.05,.065)
  b.box(wood,x,y+.92,z+d/2+.04,1.04,.17,.04)
 def church(x,y,z):
  # St Michael's: red sandstone, offset north tower, layered steep tile roofs,
  # a taller long choir and buttresses. The silhouette follows Schlossberg photos.
  b.box(sandstone,x,y+.68,z,1.54,1.36,1.72);roof(b,copper,x,y+1.36,z,1.7,.70,1.9)
  b.box(sandstone,x+.12,y+.92,z-.99,1.08,1.84,1.27);roof(b,copper,x+.12,y+1.84,z-.99,1.22,.74,1.45)
  for side in [-1,1]:
   for dz in [-1.43,-.91,-.4]:b.box(sandstone,x+.12+side*.58,y+.59,z+dz,.13,1.18,.15)
  # Broad Romanesque west front, with the tower occupying its left half.
  b.box(sandstone,x,y+.73,z+.78,1.62,1.46,.5);roof(b,copper,x,y+1.46,z+.78,1.76,.45,.61)
  tx=x-.45;tz=z+.78;h=2.45
  b.box(sandstone,tx,y+h/2,tz,.67,h,.66)
  b.box(plaster[0],tx,y+1.99,tz+.34,.62,.58,.021)
  for dx in [-.155,.155]:arch(tx+dx,y+2.06,tz+.357,.20,.31)
  b.add(copper,[(tx-.4,y+h,tz-.4),(tx+.4,y+h,tz-.4),(tx+.4,y+h,tz+.4),(tx-.4,y+h,tz+.4),(tx,y+h+.75,tz)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)])
  b.tube(trim,[(tx+math.cos(k*math.tau/24)*.13,y+1.84+math.sin(k*math.tau/24)*.13,tz+.364) for k in range(25)],.012,4)
  b.tube(wood,[(tx,y+1.93,tz+.38),(tx,y+1.84,tz+.38),(tx+.07,y+1.81,tz+.38)],.01,4)
  arch(x+.19,y+.03,z+1.04,.35,.65,wood)
  for dx in [-.14,.30]:arch(x+dx,y+.92,z+1.04,.2,.44)
  for dz in [-.57,.07,.6]:window(x+.784,y+.84,z+dz,.20,.64,side=True)
  doorways.append((x+.19,y,z+1.08,2,2.0))
 for i,(y,z,width,depth) in enumerate(levels):
  # A continuous, irregularly edged sheet. Rounded folds replace box risers.
  nx,nz=70,26;verts=[];faces=[]
  for iz in range(nz+1):
   v=iz/nz;zz=z+(v-.5)*depth
   for ix in range(nx+1):
    u=ix/nx;xx=(u-.5)*width
    boundary=math.exp(-min(u,1-u)*35)
    ripple=.045*math.sin(ix*1.7+iz*.73)+.02*math.sin(ix*5.4)
    yy=y+boundary*(.07+math.sin(v*5+i)*.06)+.025*math.sin(u*4)*math.sin(v*math.pi)
    if ix in (0,nx):xx+=.035*math.sin(iz*2.3+i)
    if iz in (0,nz):zz2=zz+ripple
    else:zz2=zz
    verts.append((xx,yy,zz2))
  for iz in range(nz):
   for ix in range(nx):a=iz*(nx+1)+ix;faces.append((a,a+nx+1,a+nx+2,a+1))
  paper_object=mesh('Paper terrace '+str(i),verts,faces,paper)
  solid=paper_object.modifiers.new('Paper edge thickness','SOLIDIFY');solid.thickness=.035
  all_objects.append(paper_object)
  if i<3:
   nexty,nextz,nextw,nextd=levels[i+1];topz=z+depth/2;bottomz=nextz-nextd/2
   fv=[];ff=[];steps=20
   for j in range(steps+1):
    t=j/steps;yy=y+(nexty-y)*(.5-.5*math.cos(math.pi*t));zz=topz+(bottomz-topz)*t+.21*math.sin(math.pi*t)
    w=width+(nextw-width)*t
    for k in range(nx+1):fv.append(((k/nx-.5)*w,yy,zz))
   for j in range(steps):
    for k in range(nx):a=j*(nx+1)+k;ff.append((a,a+1,a+nx+2,a+nx+1))
   fold=mesh('Soft fold '+str(i),fv,[tuple(reversed(face)) for face in ff],paper)
   for poly in fold.data.polygons:poly.use_smooth=True
   all_objects.append(fold)
   # Tiny real stairs descend beside the timeline across the paper fold.
   for step in range(16):
    t=step/16;b.box(plaster[1],0,y-(y-nexty)*t,topz+(bottomz-topz)*t+.16,.48,.09,.15)
  # Fine architectural drawings remain on the empty outer paper margins.
  for k in range(28):
   px=R.uniform(-width*.47,width*.47);pz=R.uniform(z-depth*.46,z+depth*.46)
   if abs(px)<1.35:continue
   w=R.uniform(.22,.8);d=R.uniform(.2,.6)
   b.tube(ink,[(px,y+.038,pz),(px+w,y+.038,pz),(px+w,y+.038,pz+d),(px,y+.038,pz+d),(px,y+.038,pz)],.0035,3)
   if k%4==0:b.tube(ink,[(px-.15,y+.04,pz-.1),(px+w+.2,y+.04,pz-.1)],.003,3)
  # A winding shared street and a plaza, rather than a regular block grid.
  for k in range(20):
   zz=z-depth*.43+k/19*depth*.86;x=.65*math.sin(k/19*4.1+i*.2)
   for side in [-1,1]:b.box(ink,x+side*.52,y+.038,zz,.008,.007,.11)
  if i<3:
   rows=[(-depth*.26,[-width*.34,-width*.18,width*.21,width*.35]),(depth*.20,[-width*.35,-width*.19,width*.22,width*.35])]
   for row,(dz,xs) in enumerate(rows):
    for j,x in enumerate(xs):
     w=1.05+R.random()*.55;d=1.05+R.random()*.36;h=(1.8+R.random()*.7) if i==0 else (1.4+R.random()*.8) if i==1 else (.8+R.random()*.7)
     if i==0 and row==1 and j in (0,1):
      if j==0:pavilion(-width*.28,y+.035,z+.25)
     elif i==0 and row==0 and j in (2,3):
      if j==2:station(width*.265,y+.035,z-depth*.29)
     elif i==0 and row==0 and j in (0,1):
      if j==0:house(-width*.29,y+.035,z-depth*.38,2.8,.58,1.72,0,1)
     elif i==1 and row==0 and j in (0,1):
      if j==0:factory(-width*.29,y+.035,z+dz)
     elif i==1 and row==1 and j in (2,3):
      if j==2:kollmar_jourdan(width*.265,y+.035,z+depth*.16)
     elif i==2 and row==0 and j in (2,3):
      if j==2:church(width*.21,y+.035,z-.25)
     elif i==2 and row==1 and j in (2,3):continue
     else:
      if i==0 and j==2:h=.95;w=1.65
      house(x+R.uniform(-.16,.16),y+.035,z+dz,w,d,h,i,j+row*4)
   if i==1:
    # A workshop chimney with a brick cap and iron bands.
    b.cylinder(brick[0],-width*.15,y+1.95,z-depth*.35,.2,3.9,16,r2=.12)
    for k in range(3):b.cylinder(wood,-width*.15,y+1.2+k*.85,z-depth*.35,.16-k*.015,.025,16)
    b.cylinder(trim,-width*.15,y+3.9,z-depth*.35,.17,.09,16)
    emitters.append((-width*.15,y+3.99,z-depth*.35,1,1.1))
    b.cylinder(brick[1],-width*.38,y+1.03,z-depth*.22,.16,2.06,12,r2=.11)
    b.cylinder(trim,-width*.38,y+2.06,z-depth*.22,.145,.065,12)
    emitters.append((-width*.38,y+2.13,z-depth*.22,1,.68))
   if i==2:
    # Fountain, a small tower and a pointed arch in the old town.
    b.cylinder(plaster[1],-.65,y+.11,z+.75,.37,.22,24);b.cylinder(wood,-.65,y+.22,z+.75,.3,.03,24)
    b.cylinder(plaster[2],-.65,y+.49,z+.75,.065,.64,10);b.cylinder(plaster[1],-.65,y+.72,z+.75,.18,.09,16)
    house(-width*.06,y,z-depth*.3,.8,.9,2.35,2,4)
    # The rounded Leitgastturm replaces the generic twin-tower fantasy gate.
    gx=width*.365;gz=z-depth*.21
    b.cylinder(sandstone,gx,y+.82,gz,.43,1.64,18)
    b.cylinder(copper,gx,y+1.92,gz,.53,.64,18,r2=.03)
    for dx in [-.15,.15]:arch(gx+dx,y+.9,gz+.411,.1,.24)
    b.box(sandstone,gx-.75,y+.34,gz-.12,1.15,.68,.18)
    for k in range(5):b.box(sandstone,gx-1.2+k*.23,y+.77,gz-.12,.13,.19,.21)
    # Timber market stalls: canvas canopies, counters and baskets.
    for k in range(3):
     mx=-width*.24+k*.87;mz=z+depth*.40
     b.box(wood,mx,y+.22,mz,.62,.05,.37)
     for dx in [-.29,.29]:b.box(wood,mx+dx,y+.38,mz,.025,.76,.025)
     roof(b,plaster[k%3],mx,y+.73,mz,.77,.13,.57)
     for dx in [-.17,.03,.2]:b.cylinder(brick[1],mx+dx,y+.3,mz,.068,.1,8)
   for k in range(11):
    xx=R.choice([-1,1])*R.uniform(1.0,width*.43);zz=z+R.choice([-.45,.45])*depth
    tree(xx,y+.03,zz,R.uniform(.7,1.2))
   for k in range(10):person(R.choice([-1,1])*R.uniform(.45,.8),y+.035,z+R.uniform(-depth*.43,depth*.43),k)
   if i==1:
    # The real tram era is 1911–1964. Rails remain only on the industrial layer.
    for dx in [-.115,.115]:b.tube(slate,[(.58+dx,y+.046,z-depth*.46),(.58+dx,y+.046,z+depth*.46)],.009,4)
    for zz in [-depth*.39,depth*.39]:
     b.cylinder(wood,.94,y+.53,z+zz,.013,1.02,6)
     b.tube(wood,[(.94,y+1.04,z+zz),(.55,y+1.08,z+zz)],.01,4)
  else:
   # Broken masonry, colonnades, foundations and a real patterned mosaic.
   for side in [-1,1]:
    for row in range(3):
     x=side*(2.2+row*1.7);zz=z+R.uniform(-1.25,1.1);w=1.4;d=1.1
     for wall in range(4):
      for k in range(5):
       px=x+(k/4-.5)*w if wall%2==0 else x+(1 if wall==1 else -1)*w/2
       pz=zz+(1 if wall==0 else -1)*d/2 if wall%2==0 else zz+(k/4-.5)*d
       hh=.16+R.random()*.4;b.box(stone,px,y+hh/2,pz,.3,hh,.18,angle=R.uniform(-.06,.06))
   for k in range(6):
    x=-3.1+k*.47;b.cylinder(plaster[1],x,y+.44,z-.7,.12,.88,12);b.box(trim,x,y+.9,z-.7,.32,.09,.3);b.box(trim,x,y+.03,z-.7,.31,.08,.31)
    if k<5:b.box(plaster[1],x+.235,y+1.02,z-.7,.46,.13,.26)
   # One partly standing Roman house balances the archaeological foundations.
   b.box(plaster[0],3.3,y+.4,z-.83,1.75,.8,1.05)
   roof(b,tile,3.3,y+.8,z-.83,1.9,.39,1.2)
   for dx in [-.58,0,.58]:b.box(wood,3.3+dx,y+.34,z-.294,.2,.53,.025)
   doorways.append((3.3,y+.035,z-.25,3,1.75))
   b.box(stone,3.72,y+1.12,z-1.07,.17,.54,.17)
   emitters.append((3.72,y+1.41,z-1.07,3,.29))
   doorways.append((-2.12,y+.035,z-.1,3,1.3))
   b.cylinder(stone,-4.9,y+.58,z+1.27,.17,1.16,8)
   for row in range(14):
    for col in range(14):
     m=ink if row in (0,13) or col in (0,13) or (row-6.5)**2+(col-6.5)**2<7 else plaster[(row+col)%4]
     b.box(m,-.85+col*.06,y+.038,z+.65+row*.06,.054,.024,.054)
   for k in range(95):
    x=R.uniform(-width*.43,width*.43);zz=z+R.uniform(-depth*.43,depth*.43)
    if abs(x)<.6:continue
    b.box(stone,x,y+.06,zz,R.uniform(.05,.13),R.uniform(.06,.2),R.uniform(.05,.13),R.random()*3)
   # A north arrow and scale engraved into the survey sheet.
   b.tube(ink,[(-7,y+.042,z+1.25),(-7,y+.042,z+2.03)],.008,4)
   b.add(ink,[(-7,y+.045,z+1.15),(-7.1,y+.045,z+1.5),(-6.9,y+.045,z+1.5)],[(0,1,2)])
   for k in range(5):b.tube(ink,[(-6.4+k*.45,y+.04,z+1.8),(-6.4+k*.45,y+.04,z+1.92)],.005,3)
   b.tube(ink,[(-6.4,y+.04,z+1.85),(-4.6,y+.04,z+1.85)],.005,3)
  v=.65;anchors.append((.88*math.sin(math.pi*v)**2-.55*math.sin(math.tau*v),y+.12,z+(v-.5)*depth))
 all_objects+=b.objects('Architecture')
 for ob in all_objects:
  if ob.name.startswith('Architecture'):
   bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
  if 'Leaves' in ob.name:
   for face in ob.data.polygons:face.use_smooth=True
  if 'Limestone' in ob.name or 'Brick' in ob.name or 'Excavated' in ob.name:
   bevel=ob.modifiers.new('Soft cut edges','BEVEL');bevel.width=.015;bevel.segments=1
   normal=ob.modifiers.new('Weighted facade normals','WEIGHTED_NORMAL');normal.keep_sharp=True
 # Author-only lighting and camera also make the .blend useful for further editing.
 sun=bpy.data.lights.new('Daylight','SUN');sun.energy=1.1;sun.angle=.16
 sob=bpy.data.objects.new('Daylight',sun);bpy.context.collection.objects.link(sob);sob.rotation_euler=(math.radians(28),math.radians(-24),math.radians(-25))
 light('Soft window',(-7,12,8),900,10);camera((12,16,22),(0,0,1),25,(1484,1060))
 scene.render.film_transparent=True
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'PALIMPSEST.blend'),compress=True)
 # Evaluated copy: UV-bake contact shadows and diffuse detail once in Blender.
 print('BAKE_PREPARE',flush=True)
 deps=bpy.context.evaluated_depsgraph_get();copies=[]
 for ob in all_objects:
  data=bpy.data.meshes.new_from_object(ob.evaluated_get(deps));copy=bpy.data.objects.new('Web_'+ob.name,data);bpy.context.collection.objects.link(copy);copy.matrix_world=ob.matrix_world.copy();copies.append(copy)
 for ob in all_objects:bpy.data.objects.remove(ob,do_unlink=True)
 select(copies);bpy.ops.object.join();web=bpy.context.object;web.name='Baked paper city'
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
 bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.00012,area_weight=.2);bpy.ops.object.mode_set(mode='OBJECT')
 image=bpy.data.images.new('Baked daylight atlas',width=2048,height=2048,alpha=False)
 for mat in web.data.materials:
  node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;mat.node_tree.nodes.active=node;node.select=True
 scene.render.bake.use_pass_direct=True;scene.render.bake.use_pass_indirect=True;scene.render.bake.use_pass_color=True
 scene.render.bake.margin=12
 print('BAKE_START',len(web.data.polygons),flush=True)
 bpy.ops.object.bake(type='DIFFUSE',pass_filter={'COLOR','DIRECT','INDIRECT'},use_clear=True,margin=12)
 image.filepath_raw=str(OUT/'palimpsest-daylight.png');image.file_format='PNG';image.save();image.filepath='//palimpsest-daylight.png'
 baked=bpy.data.materials.new('Baked daylight · no runtime shadows');baked.use_nodes=True;nodes=baked.node_tree.nodes;nodes.clear()
 out=nodes.new('ShaderNodeOutputMaterial');em=nodes.new('ShaderNodeEmission');tex=nodes.new('ShaderNodeTexImage');tex.image=image
 baked.node_tree.links.new(tex.outputs['Color'],em.inputs['Color']);baked.node_tree.links.new(em.outputs[0],out.inputs[0]);web.data.materials.clear();web.data.materials.append(baked)
 for poly in web.data.polygons:poly.material_index=0
 objects=[web]
 # Timeline and highlights stay separate so selection remains genuinely interactive.
 def curve_object(name,points,bevel=.018):
  curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=12;curve.bevel_depth=bevel;curve.bevel_resolution=2
  spl=curve.splines.new('BEZIER');spl.bezier_points.add(len(points)-1)
  for point,co in zip(spl.bezier_points,points):point.co=xyz(co);point.handle_left_type='AUTO';point.handle_right_type='AUTO'
  ob=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(ob);curve.materials.append(red)
  select([ob]);bpy.ops.object.convert(target='MESH');return bpy.context.object
 route=[];stations=[]
 for i,(y,z,w,d) in enumerate(levels):
  if i:
   py,pz,pw,pd=levels[i-1];topz=pz+pd/2;bottomz=z-d/2
   for j in range(1,33):
    t=j/32;route.append((0,py+(y-py)*(.5-.5*math.cos(math.pi*t))+.12,topz+(bottomz-topz)*t+.235*math.sin(math.pi*t)))
  for k in range(81):
   v=k/80;route.append((.88*math.sin(math.pi*v)**2-.55*math.sin(math.tau*v),y+.12,z+(v-.5)*d))
   if k==52:stations.append(len(route)-1)
  hi=curve_object('highlight_'+years[i],[(-w/2,y+.075,z+d/2+.02),(0,y+.075,z+d/2+.02),(w/2,y+.075,z+d/2+.02)],.013);objects.append(hi)
  empty=bpy.data.objects.new('anchor_'+years[i],None);empty.location=xyz(anchors[i]);bpy.context.collection.objects.link(empty);objects.append(empty)
 curve=bpy.data.curves.new('Timeline','CURVE');curve.dimensions='3D';curve.bevel_depth=.018;curve.bevel_resolution=2
 spl=curve.splines.new('POLY');spl.points.add(len(route)-1)
 for point,co in zip(spl.points,route):point.co=(*xyz(co),1)
 ob=bpy.data.objects.new('Timeline',curve);bpy.context.collection.objects.link(ob);curve.materials.append(red);select([ob]);bpy.ops.object.convert(target='MESH');objects.append(bpy.context.object)
 # Identical vertices drive the browser marker. The fold is followed, never shortcut.
 bpy.context.object['pathPoints']=[float(c) for point in route for c in point]
 bpy.context.object['stationIndices']=stations
 smoke=bpy.data.objects.new('smoke_anchor',None);smoke.location=xyz((-12.8*.15,1.25+3.99,-2.05-4.5*.35));bpy.context.collection.objects.link(smoke);objects.append(smoke)
 # Movable details: one vertex-coloured mesh each, no extra image atlas or lights.
 def moving_mesh(name,batch):
  verts=[];faces=[];colors=[]
  for mat,(v,f) in batch.groups.items():
   offset=len(verts);verts.extend(v);faces.extend(tuple(offset+i for i in face) for face in f)
   rgb=mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value[:3]
   colors.extend([(*rgb,1)]*len(v))
  ob=mesh(name,verts,faces);bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
  attribute=ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
  for poly in ob.data.polygons:
   shade=.72+.28*max(0,poly.normal.z)
   for li in poly.loop_indices:attribute.data[li].color=(*(c*shade for c in colors[ob.data.loops[li].vertex_index][:3]),1)
  mat=bpy.data.materials.new(name+' vertex ink');mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear()
  output=nodes.new('ShaderNodeOutputMaterial');surface=nodes.new('ShaderNodeBsdfPrincipled');color=nodes.new('ShaderNodeVertexColor');color.layer_name='Color'
  mat.node_tree.links.new(color.outputs['Color'],surface.inputs['Base Color']);mat.node_tree.links.new(surface.outputs[0],output.inputs[0]);ob.data.materials.append(mat)
  objects.append(ob);return ob
 tram=Batch();tram.box(brick[1],0,.25,0,.37,.34,1.02);tram.box(slate,0,.455,0,.42,.07,1.1)
 for side in [-1,1]:
  for k in range(5):tram.box(glass,side*.19,.31,-.36+k*.18,.016,.15,.12)
  for dz in [-.3,.3]:tram.ellipsoid(slate,side*.15,.095,dz,.04,.07,.07,2)
 for dz in [-.52,.52]:
  tram.box(glass,0,.31,dz,.27,.16,.016);tram.box(trim,0,.16,dz,.32,.025,.026)
 tram.tube(wood,[(0,.5,-.18),(0,.85,0),(0,.5,.18)],.012,4)
 tram_ob=moving_mesh('Tram_1911_1964',tram);tram_ob.location=xyz((.58,1.29,-2.05))
 pedestrian=Batch();pedestrian.cylinder(slate,0,.12,0,.03,.17,6);pedestrian.ellipsoid(trim,0,.246,0,.036,.04,.033,2)
 for dx in [-.019,.019]:pedestrian.tube(wood,[(dx,.11,0),(dx*1.7,.015,dx)],.012,4)
 walker=moving_mesh('Walking_figure',pedestrian);walker.location=xyz((-.48,1.285,-2.1))
 web['source']='PALIMPSEST.blend';web['lighting']='Blender Cycles diffuse bake, 2048px atlas, 32 samples'
 web['doorways']=[float(value) for doorway in doorways for value in doorway]
 web['smokeEmitters']=[float(value) for emitter in emitters for value in emitter]
 web['landmarks']='Reuchlinhaus; Hauptbahnhof Pforzheim; Kollmar & Jourdan; Schlosskirche St. Michael; Leitgastturm; Portus / Kappelhof'
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'PALIMPSEST_web_export.blend'),compress=True)
 export('PALIMPSEST',objects)
 print('CITY_DONE',flush=True)

def bezier(a,b,c,d,t):return (1-t)**3*Vector(a)+3*(1-t)**2*t*Vector(b)+3*(1-t)*t*t*Vector(c)+t**3*Vector(d)
def build_resonanz(low=False):
 scene=reset();scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(*srgb('30121f'),1)
 silver=material('Polished warm silver','d8d0ce',.19,1)
 # A sculpted, closed annular petal. Its dished faces and rolled edges catch softbox reflections.
 vs=[];fs=[];n=48 if low else 72;radial=4 if low else 7
 for side in [-1,1]:
  for j in range(radial+1):
   r=.38+.62*j/radial
   for k in range(n):
    a=k*math.tau/n;rr=r*(1+.14*math.sin(a))
    x=.48*(1-r*r)+.15*math.sin(a*2)*r+side*.014
    vs.append((x,math.cos(a)*rr,math.sin(a)*rr*.77))
 stride=(radial+1)*n
 for side in range(2):
  for j in range(radial):
   for k in range(n):
    a=side*stride+j*n+k;b=side*stride+j*n+(k+1)%n;face=(a,b,b+n,a+n);fs.append(face if side else tuple(reversed(face)))
 for ring in [0,radial]:
  for k in range(n):a=ring*n+k;b=ring*n+(k+1)%n;fs.append((a,a+stride,b+stride,b))
 prototype=mesh('Lamella_00',vs,fs,silver)
 for face in prototype.data.polygons:face.use_smooth=True
 segments=[((-5,-.1,0),(-4.3,.9,-.15),(-2.8,.65,-.2),(-1.4,-.1,0)),((-1.4,-.1,0),(.2,-.3,0),(.6,-1.3,.1),(1.6,-1.25,.15)),((1.6,-1.25,.15),(3.8,-1.2,.25),(4.7,.9,-.1),(3.9,2.15,-.25)),((3.9,2.15,-.25),(3.2,3.7,-.45),(1.35,3.2,-.15),(1.75,2.05,.1)),((1.75,2.05,.1),(1.95,1.45,.2),(2.65,1.4,.15),(2.7,1.85,.1))]
 samples=[]
 for si,seg in enumerate(segments):
  for k in range(150):samples.append((si,k/150,bezier(*seg,k/150)))
 lengths=[0]
 for i in range(1,len(samples)):lengths.append(lengths[-1]+(samples[i][2]-samples[i-1][2]).length)
 count=82;objects=[]
 for i in range(count):
  target=lengths[-1]*i/(count-1);index=next((k for k,l in enumerate(lengths) if l>=target),len(samples)-1);si,t,p=samples[index]
  tangent=(bezier(*segments[si],min(1,t+.005))-bezier(*segments[si],max(0,t-.005))).normalized()
  ob=prototype if i==0 else bpy.data.objects.new(f'Lamella_{i:02d}',prototype.data)
  if i:bpy.context.collection.objects.link(ob)
  # Blender's local X is the normal of the petal, aligned along the authored spine.
  ob.location=xyz(p);direction=Vector(xyz(tangent));ob.rotation_mode='QUATERNION';ob.rotation_quaternion=Vector((1,0,0)).rotation_difference(direction)
  u=i/(count-1);radius=.18+1.13*math.exp(-((u-.13)/.14)**2)+1.2*math.exp(-((u-.52)/.13)**2)+.56*math.exp(-((u-.75)/.13)**2)
  ob.scale=(1,radius*.85,radius*1.2);ob['lamellaIndex']=i;objects.append(ob)
 light('Long softbox',(-3,6,5),950,7);light('Silver rim',(5,3,2),700,5);light('Warm bounce',(-4,-2,3),500,4)
 camera((0,1.3,22),(0,.85,0),13,(1484,1060));scene.render.film_transparent=True
 if not low:bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'RESONANZ.blend'),compress=True)
 export('RESONANZ_low' if low else 'RESONANZ',objects)
 print('RESONANZ_DONE',flush=True)

def build_ticket():
 scene=reset();scene.cycles.samples=48;scene.render.film_transparent=True
 # A creased and slightly torn paper ticket; the small web images retain its real shadows.
 printed=material('Faded tramway ink','ccb188',grain=True);nodes=printed.node_tree.nodes;links=printed.node_tree.links;bsdf=nodes.get('Principled BSDF')
 tex=nodes.new('ShaderNodeTexImage');links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
 noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=180;noise.inputs['Detail'].default_value=2
 bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.2;bump.inputs['Distance'].default_value=.017;links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs[0],bsdf.inputs['Normal'])
 n,m=100,66;vs=[];fs=[]
 for j in range(m+1):
  v=j/m;z=(v-.5)*2.08
  for i in range(n+1):
   u=i/n;x=(u-.5)*3.2;boundary=math.exp(-min(u,1-u,v,1-v)*40)
   x+=boundary*.009*math.sin(j*5+i*7);zz=z+boundary*.012*math.cos(i*3.7)
   y=.045*math.sin(u*math.pi)*math.sin(v*math.pi)+.03*math.sin(u*9+v*3)
   y+=.035*math.exp(-((u-.53)/.028)**2)+.016*math.exp(-((v-.4)/.032)**2)
   y+=boundary*(.025+.026*math.sin(u*32+v*25))
   vs.append((x,y,zz))
 for j in range(m):
  for i in range(n):a=j*(n+1)+i;fs.append((a,a+n+1,a+n+2,a+1))
 ob=mesh('1924 folded tram ticket',vs,fs,printed)
 for face in ob.data.polygons:face.use_smooth=True
 uv=ob.data.uv_layers.new(name='Printed face')
 for poly in ob.data.polygons:
  for loop in poly.loop_indices:
   v=ob.data.loops[loop].vertex_index;uv.data[loop].uv=(v%(n+1)/n,1-(v//(n+1)/m))
 solid=ob.modifiers.new('Cotton paper thickness','SOLIDIFY');solid.thickness=.008
 ground=mesh('Shadow catcher',[(-8,-.085,-8),(8,-.085,-8),(8,-.085,8),(-8,-.085,8)],[(0,3,2,1)],material('Ivory ground','f4f0e6'));ground.is_shadow_catcher=True
 light('Window above',(-3,7,4),650,5);camera((0,6.5,3.2),(0,0,0),4.05,(640,440))
 for language in ['de','en']:
  image=bpy.data.images.load(str(OUT/f'ticket-print-{language}.png'));image.pack();tex.image=image
  if language=='de':bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Fahrkarte_1924.blend'),compress=True)
  scene.render.filepath=str(OUT/f'ticket-1924-{language}.png');bpy.ops.render.render(write_still=True)
 print('TICKET_DONE',flush=True)

which=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['city','resonanz']
if 'city' in which:build_city()
if 'resonanz' in which:build_resonanz();build_resonanz(low=True)

if 'ticket' in which:build_ticket()
