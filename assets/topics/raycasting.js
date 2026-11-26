(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, vs, lookOf, clamp, CF, G, R, S, T} = Lab;
const demo = Lab.subject({
  id:'raycast', title:'Raycasting', glyph:'ray',
  blurb:'workspace:Raycast in depth: filters, surfaces, wall-banging, spherecasts and ricochets.'
});

/* ---- a tiny physics world the demos can raycast against ---- */
const rc = new THREE.Raycaster(), nm = new THREE.Matrix3();
function world(K, defs){
  return defs.map(d=>{
    const m = K.add(new THREE.Mesh(G.box, K.mat(d.color||'--part',{opacity:d.opacity ?? 1})));
    m.scale.copy(d.size); m.position.copy(d.pos); if (d.rot) m.rotation.set(d.rot[0]*D2R, d.rot[1]*D2R, d.rot[2]*D2R);
    m.name = d.name; m.visible = d.visible !== false; m.userData = d;
    if (m.visible){ m.add(new THREE.LineSegments(G.edges, new THREE.LineBasicMaterial({color:C('--ink'), transparent:true, opacity:0.3}))); }
    m.updateMatrixWorld(true);
    if (d.label) m.lbl = K.label(d.name, '--muted').at(d.pos.clone().add(V(0, d.size.y/2 + 0.5, 0)));
    return m;
  });
}
function cast(o, d, len, meshes){
  rc.set(o, d.clone().normalize()); rc.near = 0; rc.far = len;
  const hits = rc.intersectObjects(meshes, false); if (!hits.length) return null;
  const h = hits[0]; nm.getNormalMatrix(h.object.matrixWorld);
  return {mesh:h.object, pos:h.point.clone(), normal:h.face.normal.clone().applyMatrix3(nm).normalize(), dist:h.distance};
}
const aimDir = (yaw, pitch=0)=>V(-Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw)*Math.cos(pitch));

demo({
  id:'rc-basic', title:'workspace:Raycast', short:'origin + direction', sig:'workspace:Raycast(origin, direction, params?)  →  RaycastResult?',
  view:{theta:0.55, phi:0.85, r:26, ty:1, tz:-1},
  params:[R('yaw','Aim left/right (+ = left)',-60,60,1,8,'°'), R('pitch','Aim up/down',-25,25,1,0,'°'), R('len','Direction length',1,30,0.5,20,' studs')],
  setup(K){
    const parts = world(K, [
      {name:'Crate', size:V(2.5,2.5,2.5), pos:V(-3.5,1.25,0), rot:[0,20,0], label:true},
      {name:'Wall', size:V(10,4,1), pos:V(2,2,-8), rot:[0,-15,0], label:true},
      {name:'Barrel', size:V(1.6,2.4,1.6), pos:V(4.5,1.2,1.5), color:'--vb', label:true},
      {name:'Baseplate', size:V(60,1,60), pos:V(0,-0.5,0), visible:false},
    ]);
    const shooter = K.part(V(1.4,2,1)); shooter.position.set(0,1,7.2);
    const O = V(0,1.6,6.6), ray = K.line('--accent'), rest = K.line('--muted',{dashed:true});
    const hitPt = K.point('--accent',0.18), nA = K.arrow('--y',{thick:0.04}), endPt = K.point('--muted',0.12);
    const lh = K.label('','--accent','big'), le = K.label('','--muted'); K.label('origin','--ink').at(O.clone().add(V(0,0.5,0)));
    return {update(p){
      const d = aimDir(p.yaw*D2R, p.pitch*D2R), end = O.clone().addScaledVector(d, p.len), hit = cast(O, d, p.len, parts);
      shooter.quaternion.setFromAxisAngle(UP, p.yaw*D2R);
      if (hit){ ray.set(O, hit.pos); rest.set(hit.pos, end); rest.visible = true; hitPt.visible = true; hitPt.position.copy(hit.pos);
        nA.set(hit.pos, hit.normal.clone().multiplyScalar(1.6)); lh.show(true).at(hit.pos.clone().add(V(0,0.7,0))).text(`hit ${hit.mesh.name}`); }
      else { ray.set(O, end); rest.visible = false; hitPt.visible = false; nA.visible = false; lh.show(false); }
      endPt.position.copy(end); le.at(end.clone().add(V(0,-0.45,0))).text(hit ? 'max length' : 'nil: nothing in range');
      return {hit, d, end};
    }};
  },
  readout:(p,o)=> o.hit ? [['Instance', o.hit.mesh.name,'acc'],['Position', vs(o.hit.pos)],['Normal', vs(o.hit.normal)],['Distance', f(o.hit.dist)]] : [['result', 'nil','bad'],['reason', `nothing within ${f(p.len)} studs`]],
  code:(p,o)=>`local origin = muzzle.Position
local direction = ${`Vector3.new(${f(o.d.x)}, ${f(o.d.y)}, ${f(o.d.z)})`} * ${f(p.len)}   -- direction AND max length

local result = workspace:Raycast(origin, direction)
if result then
    print(result.Instance.Name)   --> ${o.hit ? o.hit.mesh.name : '(no hit)'}
    print(result.Position)        --> ${o.hit ? vs(o.hit.pos) : '-'}
    print(result.Normal)          --> ${o.hit ? vs(o.hit.normal) : '-'}
    print(result.Distance)        --> ${o.hit ? f(o.hit.dist) : '-'}
else
    print("missed")               -- ${o.hit ? '' : 'this runs right now'}
end`,
  body:`<p>A raycast fires an invisible line from an <b>origin</b> along a <b>direction</b> and reports the first part it touches. The result tells you <b>what</b> was hit (<code>Instance</code>), <b>where</b> (<code>Position</code>), <b>which way the surface faces</b> (<code>Normal</code>, the green arrow) and <b>how far</b> (<code>Distance</code>).</p>
<p>The direction's length is the ray's range. Shorten it below the distance to the crate and the ray returns <code>nil</code> even though it points straight at it. If nothing is hit you always get <code>nil</code>, so check before using the result.</p>`,
  uses:[`<b>Hitscan guns</b>: one ray from the muzzle toward the mouse.`,
        `<b>Line of sight</b>: can the NPC see the player, or is a wall in the way?`,
        `<b>Ground checks</b>: a short ray down from the character to see if they're standing on something.`],
  gotchas:[`Passing <code>LookVector</code> on its own gives a ray only 1 stud long. Multiply it: <code>LookVector * 300</code>.`,
           `The second argument is a direction, not a target position. To aim at a point, use <code>target - origin</code>.`,
           `Rays don't hit parts with <code>CanQuery = false</code>, and they ignore the inside of a part they start in.`]
});

demo({
  id:'rc-filter', title:'RaycastParams: what can be hit', short:'Exclude / Include lists', sig:'params.FilterType · params.FilterDescendantsInstances',
  view:{theta:0.85, phi:1.0, r:24, ty:2, tz:-2},
  params:[S('ftype','FilterType',[['Exclude','Exclude (ignore the list)'],['Include','Include (only the list)']],'Exclude'), T('lc','List: your character',false), T('lg','List: Glass',false), T('lcr','List: Crate',false), R('yaw','Aim (+ = left)',-25,25,1,0,'°')],
  setup(K){
    const parts = world(K, [
      {name:'Head', size:V(1,1,1), pos:V(0,2.6,7), group:'char'},
      {name:'Torso', size:V(2,2,1), pos:V(0,1,7), group:'char'},
      {name:'Sword', size:V(0.3,0.3,2.2), pos:V(0.1,2.6,5.3), color:'--muted', group:'char', label:true},
      {name:'Glass', size:V(7,5,0.2), pos:V(0,2.5,1), color:'--z', opacity:0.3, group:'glass', label:true},
      {name:'Crate', size:V(3,5,3), pos:V(0,2.5,-5), group:'crate', label:true},
      {name:'Wall', size:V(12,6,1), pos:V(0,3,-12), group:'wall', label:true},
    ]);
    const O = V(0,2.6,7), ray = K.line('--accent'), hitPt = K.point('--accent',0.2), lh = K.label('','--accent','big');
    return {update(p){
      const inList = m=>({char:p.lc, glass:p.lg, crate:p.lcr, wall:false})[m.userData.group];
      const hittable = parts.filter(m=>p.ftype==='Exclude' ? !inList(m) : inList(m));
      parts.forEach(m=>{ if (m.lbl) m.lbl.text(m.name + (inList(m) ? ' · in list' : '')).color(inList(m) ? '--accent-ink' : '--muted'); });
      const d = aimDir(p.yaw*D2R), hit = cast(O, d, 30, hittable);
      ray.set(O, hit ? hit.pos : O.clone().addScaledVector(d,30));
      hitPt.visible = !!hit; if (hit){ hitPt.position.copy(hit.pos); lh.show(true).at(hit.pos.clone().add(V(0,0.7,0))).text(`hit ${hit.mesh.name}`); } else lh.show(false);
      const list = [p.lc && 'character', p.lg && 'workspace.Glass', p.lcr && 'workspace.Crate'].filter(Boolean);
      return {hit, list};
    }};
  },
  readout:(p,o)=>[['FilterType', p.ftype],['list', o.list.length ? o.list.join(', ') : '(empty)'],['result', o.hit ? o.hit.mesh.name : 'nil', o.hit ? (o.hit.mesh.userData.group==='char' ? 'bad' : 'acc') : 'bad']],
  code:(p,o)=>`local params = RaycastParams.new()
params.FilterType = Enum.RaycastFilterType.${p.ftype}
params.FilterDescendantsInstances = { ${o.list.join(', ')} }

local result = workspace:Raycast(head.Position, head.CFrame.LookVector * 30, params)
print(result and result.Instance.Name)   --> ${o.hit ? o.hit.mesh.name : 'nil'}${o.hit && o.hit.mesh.userData.group==='char' ? '   -- oops, shot your own sword' : ''}`,
  body:`<p><code>RaycastParams</code> controls what a ray is allowed to hit. Put instances in <code>FilterDescendantsInstances</code>, and everything inside them counts too, so adding a character covers every limb and accessory.</p>
<p><b>Exclude</b> ignores what's in the list. <b>Include</b> ignores everything <i>except</i> the list. Start with an empty Exclude list: the ray hits your own sword first, a very common bug. Add your character and it reaches the glass. Add the glass too and it reaches the crate.</p>`,
  uses:[`<b>Ignoring the shooter</b>: always exclude the player's own character from their weapon rays.`,
        `<b>See-through obstacles</b>: exclude glass, water and decorations from line-of-sight checks.`,
        `<b>Only hitting targets</b>: use Include with a folder of enemies for lock-on or tool targeting.`],
  gotchas:[`Build the params once and reuse them. Creating a new <code>RaycastParams</code> every frame is wasted work.`,
           `Changing the table after you assign it does nothing. Reassign: <code>params.FilterDescendantsInstances = newList</code>.`,
           `<code>params.CollisionGroup</code> lets rays follow your collision groups instead of a list.`]
});

demo({
  id:'rc-los', title:'Line of sight: can the guard see me?', short:'range → cone → raycast', sig:'distance check  →  LookVector:Dot  →  workspace:Raycast',
  view:{theta:0.0, phi:0.5, r:28, ty:0},
  params:[R('yaw','Guard facing (+ = left)',-180,180,5,0,'°'), R('tx','Player X',-12,12,0.5,5), R('tz','Player Z',-12,12,0.5,-9), R('range','Sight range',4,16,0.5,14)],
  setup(K){
    const parts = world(K, [
      {name:'Wall', size:V(6,3,0.6), pos:V(-3,1.5,-6), label:true},
      {name:'Crate', size:V(2.5,2.5,2.5), pos:V(4,1.25,-4), rot:[0,20,0], label:true},
      {name:'Pillar', size:V(1.5,3,1.5), pos:V(-2,1.5,5), label:true},
    ]);
    const guard = K.part(V(1.4,2,1)); guard.position.set(0,1,0);
    const sec = K.sector('--accent',0.14); let ring = null, rr = -1;
    const pl = K.part(V(1,2,1),'--ok',{front:false}), ray = K.line('--ok'), hitP = K.point('--bad',0.16), lab = K.label('','--ink','big');
    const HALF = 50*D2R;
    return {update(p){
      if (rr !== p.range){ rr = p.range; K.drop(ring); ring = K.ring(p.range,'--muted',{dashed:true, y:0.03}); }
      const yaw = p.yaw*D2R; guard.quaternion.setFromAxisAngle(UP, yaw); sec.setSector(V(), yaw, HALF, p.range);
      const eye = V(0,1.8,0), T = V(p.tx,1.8,p.tz), off = T.clone().sub(eye), dist = off.length();
      pl.position.set(p.tx,1,p.tz);
      let fail = null, hit = null;
      if (dist > p.range) fail = 'too far';
      else if (lookOf(yaw).dot(off.clone().normalize()) < Math.cos(HALF)) fail = 'outside the cone';
      else { hit = cast(eye, off, dist, parts); if (hit) fail = `blocked by ${hit.mesh.name}`; }
      const seen = !fail; pl.tint(seen ? '--bad' : '--ok');
      ray.set(eye, hit ? hit.pos : T); ray.material.color.copy(C(seen ? '--bad' : '--muted'));
      hitP.visible = !!hit; if (hit) hitP.position.copy(hit.pos);
      lab.at(V(p.tx,2.9,p.tz)).text(seen ? 'SPOTTED' : `hidden: ${fail}`); lab.color(seen ? '--bad' : '--ok');
      return {dist, fail, seen, dot:lookOf(yaw).dot(off.clone().normalize())};
    }};
  },
  readout:(p,o)=>[['1. distance', `${f(o.dist,1)} ≤ ${f(p.range)}?`, o.dist <= p.range ? 'ok' : 'bad'],['2. dot', `${f(o.dot)} ≥ ${f(Math.cos(50*D2R))}?`, o.dot >= Math.cos(50*D2R) ? 'ok' : 'bad'],['3. raycast', o.fail && o.fail.startsWith('blocked') ? o.fail : (o.fail ? 'skipped' : 'clear'), o.fail && o.fail.startsWith('blocked') ? 'bad' : (o.fail ? '' : 'ok')],['result', o.seen ? 'spotted' : 'hidden', o.seen ? 'bad' : 'ok']],
  code:(p,o)=>`local RANGE, HALF_FOV = ${f(p.range)}, math.rad(50)

local function canSee(guard, target)
    local eye = guard.Head.Position
    local offset = target.Head.Position - eye
    if offset.Magnitude > RANGE then return false end                    -- 1. cheap
    if guard.Head.CFrame.LookVector:Dot(offset.Unit) < math.cos(HALF_FOV) then
        return false                                                     -- 2. cheap
    end
    params.FilterDescendantsInstances = { guard, target }               -- 3. costs more
    return workspace:Raycast(eye, offset, params) == nil
end
-- right now: ${o.seen ? 'true' : 'false (' + o.fail + ')'}`,
  body:`<p>Real stealth checks are three tests in a row, cheapest first. Is the player <b>close enough</b>? Are they <b>inside the vision cone</b> (a dot product)? Only then fire a <b>raycast</b> from the guard's eyes to see if a wall is in the way.</p>
<p>Exclude both characters from the ray, then any hit means something else is blocking the view. Slide the player behind the crate or the wall and watch which test fails. Running the cheap tests first means most players never cost a raycast at all.</p>`,
  uses:[`<b>Stealth games</b> and guard AI.`,
        `<b>Turrets</b> that only fire with a clear shot.`,
        `<b>Showing name tags or health bars</b> only for players you can actually see.`],
  gotchas:[`Cast from eye to eye (heads), not from feet, or low walls block everything.`,
           `Raycast the full offset, not <code>offset.Unit * RANGE</code>, so walls behind the player don't count.`]
});

demo({
  id:'rc-mouse', title:'Mouse picking: rays from the camera', short:'camera:ViewportPointToRay', sig:'camera:ViewportPointToRay(x, y)  →  Ray (Origin, Direction)',
  view:{theta:0.9, phi:0.95, r:30, ty:2, tz:2},
  params:[R('u','Mouse X on screen',0,1,0.01,0.62), R('v','Mouse Y on screen',0,1,0.01,0.58)],
  setup(K){
    const parts = world(K, [
      {name:'Crate', size:V(3,3,3), pos:V(-3,1.5,-3), rot:[0,25,0], label:true},
      {name:'Tower', size:V(2,6,2), pos:V(4,3,-6), label:true},
      {name:'Baseplate', size:V(60,1,60), pos:V(0,-0.5,0), visible:false},
    ]);
    const CAM = V(0,9,13), cf = CF.lookAt(CAM, V(0,0,-2)), D = 2.5, h = D*Math.tan(35*D2R), w = h*16/9;
    const cam = new THREE.Group(); K.add(cam); cf.decompose(cam.position, cam.quaternion, V());
    K.part(V(1.2,0.8,1),'--ink',{parent:cam});
    const corners = [V(-w,h,-D),V(w,h,-D),V(w,-h,-D),V(-w,-h,-D)];
    K.line('--accent',{parent:cam, max:5}).set(corners.concat([corners[0]]));
    corners.forEach(c=>K.line('--muted',{parent:cam, opacity:0.5}).set(V(),c));
    const scr = K.add(new THREE.Mesh(new THREE.PlaneGeometry(2*w,2*h), K.mat('--accent',{opacity:0.08, basic:true}))); scr.material.side = THREE.DoubleSide;
    CF.mul(cf, CF.new(0,0,-D)).decompose(scr.position, scr.quaternion, V());
    K.label('the screen','--accent').attach = {obj:cam, local:V(-w, h+0.4, -D)};
    const sp = K.point('--accent',0.12), ray = K.line('--accent'), hp = K.point('--accent',0.22), nA = K.arrow('--y',{thick:0.035}), lh = K.label('','--accent','big');
    return {update(p){
      const local = V((p.u*2-1)*w, (1-2*p.v)*h, -D), S = CF.pt(cf, local), dir = S.clone().sub(CAM).normalize();
      sp.position.copy(S); const hit = cast(S, dir, 200, parts);
      ray.set(S, hit ? hit.pos : S.clone().addScaledVector(dir, 40)); hp.visible = !!hit; nA.visible = !!hit; lh.show(!!hit);
      if (hit){ hp.position.copy(hit.pos); nA.set(hit.pos, hit.normal.clone().multiplyScalar(1.4)); lh.at(hit.pos.clone().add(V(0,0.8,0))).text(hit.mesh.name); }
      return {hit, dir, px:Math.round(p.u*1920), py:Math.round(p.v*1080)};
    }};
  },
  readout:(p,o)=>[['mouse (1920×1080)', `${o.px}, ${o.py}`],['ray.Direction', vs(o.dir)],['hit', o.hit ? `${o.hit.mesh.name} at ${vs(o.hit.pos)}` : 'nil','acc']],
  code:(p,o)=>`local UserInputService = game:GetService("UserInputService")
local camera = workspace.CurrentCamera

local function mouseRaycast(params)
    local mouse = UserInputService:GetMouseLocation()          -- (${o.px}, ${o.py})
    local ray = camera:ViewportPointToRay(mouse.X, mouse.Y)   -- unit-length direction
    return workspace:Raycast(ray.Origin, ray.Direction * 500, params)
end

local result = mouseRaycast(params)
print(result and result.Instance.Name)   --> ${o.hit ? o.hit.mesh.name : 'nil'}`,
  body:`<p>To find what's under the mouse, turn a point on the screen into a ray in the 3D world. <code>ViewportPointToRay</code> does it: it starts the ray at the camera, through that pixel on the screen, and returns a <b>unit</b> direction. Multiply it by a range and raycast as usual.</p>
<p>The orange rectangle is the screen floating in front of the camera. Move the mouse sliders and the ray sweeps through the scene, hitting whatever is under that pixel.</p>`,
  uses:[`<b>Placing buildings</b> where the player clicks, with your own RaycastParams (better than <code>mouse.Hit</code>).`,
        `<b>Selecting units</b> in strategy and tycoon games.`,
        `<b>Aiming</b> guns at the crosshair: use the centre of the screen.`],
  gotchas:[`Pair <code>GetMouseLocation</code> with <code>ViewportPointToRay</code>. <code>ScreenPointToRay</code> expects coordinates without the top bar inset, so mixing them shifts the aim.`,
           `The direction is only 1 stud long. Always multiply it.`,
           `Run it on the client. The server has no mouse or camera; send the result in a RemoteEvent and check it there.`]
});

demo({
  id:'rc-surface', title:'Placing on slopes', short:'align to result.Normal', sig:'CFrame.lookAt(pos, pos + forward, result.Normal)',
  view:{theta:0.5, phi:0.95, r:24, ty:1},
  params:[R('x','Drop X',-10,10,0.25,-5), R('z','Drop Z',-9,9,0.25,0), R('yaw','Facing',-180,180,5,30,'°'), S('mode','Placement',[['align','Align to surface'],['upright','Always upright']],'align')],
  setup(K){
    const parts = world(K, [
      {name:'Ramp', size:V(9,1,8), pos:V(-5,1.4,0), rot:[0,0,22]},
      {name:'Hill', size:V(7,1,7), pos:V(5,1.4,-1), rot:[-28,0,0]},
      {name:'Rock', size:V(3,3,3), pos:V(0,1.3,-7), rot:[25,35,15]},
      {name:'Baseplate', size:V(60,1,60), pos:V(0,-0.5,0), visible:false},
    ]);
    const ray = K.line('--muted',{dashed:true}), nA = K.arrow('--y',{thick:0.04}), obj = K.part(V(2,1,3),'--accent'), hp = K.point('--ink',0.1);
    const ls = K.label('','--ink','big');
    return {update(p){
      const top = V(p.x,20,p.z), hit = cast(top, V(0,-1,0), 40, parts);
      const pos0 = hit ? hit.pos : V(p.x,0,p.z), n = hit ? hit.normal : UP.clone();
      ray.set(top.clone().setY(8), pos0); hp.position.copy(pos0); nA.set(pos0, n.clone().multiplyScalar(2.2));
      const up = p.mode==='align' ? n : UP.clone(), fwd = lookOf(p.yaw*D2R);
      let look = fwd.clone().sub(up.clone().multiplyScalar(fwd.dot(up))); if (look.lengthSq() < 1e-6) look = V(0,0,-1); look.normalize();
      const pos = pos0.clone().addScaledVector(up, 0.5);
      obj.setCF(CF.lookAt(pos, pos.clone().add(look), up));
      const slope = Math.acos(clamp(n.dot(UP),-1,1))/D2R;
      ls.at(pos0.clone().add(n.clone().multiplyScalar(2.7))).text(`slope ${f(slope,0)}°`);
      return {hit, n, slope, look};
    }};
  },
  readout:(p,o)=>[['hit', o.hit ? o.hit.mesh.name : 'nil'],['Normal', vs(o.n),'acc'],['slope', f(o.slope,1)+'°']],
  code:(p,o)=>`local params = RaycastParams.new()
params.FilterDescendantsInstances = { preview }   -- don't hit the thing we're placing

local result = workspace:Raycast(dropPoint + Vector3.new(0, 20, 0), Vector3.new(0, -40, 0), params)
if result then
${p.mode==='align' ? `    local up = result.Normal                    --> ${vs(o.n)}` : `    local up = Vector3.yAxis                    -- ignore the slope`}
    local forward = facing - up * facing:Dot(up)  -- flatten facing onto the surface
    local pos = result.Position + up * (preview.Size.Y / 2)
    preview.CFrame = CFrame.lookAt(pos, pos + forward.Unit, up)
end
-- slope in degrees: math.deg(math.acos(result.Normal:Dot(Vector3.yAxis)))  --> ${f(o.slope,1)}`,
  body:`<p>Drop a ray straight down to find the ground, then use <code>result.Normal</code> as the object's up direction. <code>CFrame.lookAt</code> takes an optional third argument for exactly this: which way is up.</p>
<p>The facing has to lie flat on the surface, so we remove the part of it that points along the normal (the projection trick from Vector maths). Switch to "always upright" and move onto the ramp: the block sinks into one side and floats on the other.</p>`,
  uses:[`<b>Placement previews</b> in building games that hug terrain.`,
        `<b>Footprints, decals and bullet holes</b> that lie flat on whatever they hit.`,
        `<b>Vehicles and hoverboards</b> that tilt with the ground.`,
        `<b>Slope limits</b>: refuse placement if the slope is over 30°.`],
  gotchas:[`Exclude the preview object itself, or the ray hits it and it climbs into the sky.`,
           `Offset by half the object's height along the normal, not along world Y, or it floats on slopes.`]
});

demo({
  id:'rc-pierce', title:'Wall-banging: hits in a line', short:'loop + exclude what you hit', sig:'repeat: Raycast → add result.Instance to the exclude list → continue',
  view:{theta:0.75, phi:0.9, r:26, ty:2, tz:-2},
  params:[R('yaw','Aim (+ = left)',-20,20,1,4,'°'), R('pierce','Walls it can go through',0,4,1,2), R('falloff','Damage lost per wall',10,60,5,35,'%')],
  setup(K){
    const parts = world(K, [1,2,3,4].map(i=>({name:`Wall ${i}`, size:V(8,4,0.4), pos:V(0,2,4-i*4), label:false})).concat([{name:'Concrete', size:V(12,6,1.5), pos:V(0,3,-15)}]));
    K.part(V(1.2,2,1)).position.set(0,1,8.4);
    const O = V(0,2,7.8), ray = K.line('--accent',{max:8}), rest = K.line('--muted',{dashed:true});
    const marks = Array.from({length:6}, ()=>K.point('--accent',0.17)), labs = Array.from({length:6}, ()=>K.label('','--ink'));
    return {update(p){
      const d = aimDir(p.yaw*D2R), ignore = new Set(), hits = []; let o = O.clone(), dmg = 100, stopped = false;
      for (let i=0;i<=p.pierce;i++){
        const h = cast(o, d, 40, parts.filter(m=>!ignore.has(m))); if (!h){ break; }
        hits.push({...h, dmg}); dmg *= 1 - p.falloff/100; ignore.add(h.mesh); o = h.pos.clone();
        if (i === p.pierce) stopped = true;
      }
      const pts = [O, ...hits.map(h=>h.pos)]; const end = stopped ? null : O.clone().addScaledVector(d, 40);
      ray.set(end ? pts.concat([end]) : pts);
      rest.visible = stopped; if (stopped) rest.set(hits[hits.length-1].pos, O.clone().addScaledVector(d,40));
      marks.forEach((m,i)=>{ m.visible = i < hits.length; if (m.visible) m.position.copy(hits[i].pos); });
      labs.forEach((l,i)=>{ l.show(i < hits.length); if (i < hits.length) l.at(hits[i].pos.clone().add(V(0,0.6,0))).text(`#${i+1} ${hits[i].mesh.name} · ${f(hits[i].dmg,0)} dmg`); });
      return {hits, stopped};
    }};
  },
  readout:(p,o)=>[['hits', String(o.hits.length),'acc'],['last damage', o.hits.length ? f(o.hits[o.hits.length-1].dmg,0) : '-'],['ended because', o.stopped ? 'pierce limit reached' : 'nothing left to hit']],
  code:(p,o)=>`local MAX_PIERCE = ${p.pierce}
local params = RaycastParams.new()
params.FilterType = Enum.RaycastFilterType.Exclude

local ignore = { character }
local origin, direction = muzzle.Position, aim.Unit * 300
local damage = 100

for i = 0, MAX_PIERCE do
    params.FilterDescendantsInstances = ignore
    local result = workspace:Raycast(origin, direction, params)
    if not result then break end

    dealDamage(result.Instance, damage)      -- ${o.hits.map(h=>f(h.dmg,0)).join(', ') || 'no hits'}
    damage *= ${f(1 - p.falloff/100,2)}                       -- lose ${p.falloff}% per wall
    table.insert(ignore, result.Instance)    -- next ray passes through it
    origin = result.Position
end`,
  body:`<p>A raycast stops at the first thing it hits. To go <b>through</b> walls, cast again from the hit point with that wall added to the exclude list, and repeat. Each loop finds the next surface along the same line.</p>
<p>Lowering the damage each time makes thin cover still worth hiding behind. Change how many walls the shot can pierce: once the limit is reached, the rest of the line (dashed) is never checked.</p>`,
  uses:[`<b>Penetrating weapons</b>: snipers, railguns, piercing arrows.`,
        `<b>Hitting every enemy in a line</b>: lasers and beams.`,
        `<b>Finding all surfaces</b> between two points, for sound blocking or light shafts.`],
  gotchas:[`Excluding a part affects everything inside it. Excluding a whole enemy model means the ray can't hit their other limbs again, which is usually what you want.`,
           `Always cap the loop. Without a limit, a ray through a big mesh field can loop many times in one frame.`]
});

demo({
  id:'rc-shapecast', title:'Spherecast: rays with thickness', short:'workspace:Spherecast', sig:'workspace:Spherecast(position, radius, direction, params?)',
  view:{theta:0.7, phi:0.8, r:24, ty:2, tz:-2},
  params:[R('radius','Sphere radius',0.1,1.8,0.05,1),R('offset','Start X',-3,3,0.1,0)],
  setup(K){
    const parts = world(K, [
      {name:'Pillar L', size:V(2,4,2), pos:V(-1.7,2,-4), label:true},
      {name:'Pillar R', size:V(2,4,2), pos:V(1.7,2,-4), label:true},
      {name:'Wall', size:V(12,5,1), pos:V(0,2.5,-12), label:true},
    ]);
    const inv = parts.map(m=>m.matrixWorld.clone().invert());
    const closest = (c,i)=>{ const l = c.clone().applyMatrix4(inv[i]); l.set(clamp(l.x,-0.5,0.5), clamp(l.y,-0.5,0.5), clamp(l.z,-0.5,0.5)); return l.applyMatrix4(parts[i].matrixWorld); };
    function sweep(o, d, r, len){
      const skip = parts.map((m,i)=>closest(o,i).distanceTo(o) <= r), step = 0.05;
      for (let s=0; s<=len; s+=step){
        const c = o.clone().addScaledVector(d,s);
        for (let i=0;i<parts.length;i++){
          if (skip[i] || closest(c,i).distanceTo(c) > r) continue;
          let lo = Math.max(0,s-step), hi = s;
          for (let k=0;k<14;k++){ const mid=(lo+hi)/2, cm=o.clone().addScaledVector(d,mid); if (closest(cm,i).distanceTo(cm) <= r) hi = mid; else lo = mid; }
          const center = o.clone().addScaledVector(d,hi), cp = closest(center,i);
          return {mesh:parts[i], center, contact:cp, normal:center.clone().sub(cp).normalize(), dist:hi};
        }
      }
      return null;
    }
    const thin = K.line('--muted',{dashed:true}), thinPt = K.point('--muted',0.12), lt = K.label('','--muted');
    const ghosts = Array.from({length:20}, ()=>K.wsphere(1,'--accent',0.12)), hitS = K.wsphere(1,'--accent',0.55), cpP = K.point('--accent',0.14), nA = K.arrow('--y',{thick:0.035});
    const lh = K.label('','--accent','big');
    let key = '', res = null;
    return {update(p){
      const k = p.radius+'|'+p.offset;
      if (k !== key){ key = k;
        const o = V(p.offset,2,7), d = V(0,0,-1), len = 25;
        const ray = cast(o, d, len, parts), sph = sweep(o, d, p.radius, len);
        thin.set(o, ray ? ray.pos : o.clone().addScaledVector(d,len)); thinPt.visible = !!ray; if (ray) thinPt.position.copy(ray.pos);
        lt.show(true).at((ray ? ray.pos : o.clone().addScaledVector(d,len)).clone().add(V(0,-0.5,0))).text(ray ? `ray hits ${ray.mesh.name}` : 'ray: nil');
        const reach = sph ? sph.dist : len;
        ghosts.forEach((g,i)=>{ const s = i*1.4; g.visible = s < reach; if (g.visible){ g.position.copy(o.clone().addScaledVector(d,s)); g.scale.setScalar(p.radius); } });
        hitS.visible = cpP.visible = nA.visible = !!sph; lh.show(!!sph);
        if (sph){ hitS.position.copy(sph.center); hitS.scale.setScalar(p.radius); cpP.position.copy(sph.contact); nA.set(sph.contact, sph.normal.clone().multiplyScalar(1.4)); lh.at(sph.center.clone().add(V(0,p.radius+0.5,0))).text(`sphere hits ${sph.mesh.name}`); }
        res = {ray, sph};
      }
      return res;
    }};
  },
  readout:(p,o)=>[['Raycast', o.ray ? `${o.ray.mesh.name} at ${f(o.ray.dist,1)}` : 'nil'],['Spherecast', o.sph ? `${o.sph.mesh.name} at ${f(o.sph.dist,1)}` : 'nil','acc'],['contact', o.sph ? vs(o.sph.contact) : '-']],
  code:(p,o)=>`local origin = Vector3.new(${f(p.offset)}, 2, 7)
local direction = Vector3.new(0, 0, -25)

local thin = workspace:Raycast(origin, direction, params)
print(thin and thin.Instance.Name)          --> ${o.ray ? o.ray.mesh.name : 'nil'}

local fat = workspace:Spherecast(origin, ${f(p.radius)}, direction, params)
print(fat and fat.Instance.Name)            --> ${o.sph ? o.sph.mesh.name : 'nil'}
print(fat and fat.Position)                 --> ${o.sph ? vs(o.sph.contact) : 'nil'}  (the contact point)

-- boxes work the same way:
-- workspace:Blockcast(CFrame.new(origin), Vector3.new(4, 4, 1), direction, params)`,
  body:`<p>A ray is infinitely thin, so it slips through gaps a real object never could. <code>workspace:Spherecast</code> sweeps a whole ball along the direction and reports the first thing it touches. <code>Blockcast</code> does the same with a box.</p>
<p>Start with the radius small: both the ray and the sphere pass between the pillars. Grow the radius past about 0.7 and the sphere clips a pillar while the ray still sails through. The result's <code>Position</code> is the contact point on the surface (orange dot), not the sphere's centre.</p>`,
  uses:[`<b>Melee hitboxes</b>: sweep a box along a sword swing.`,
        `<b>Fat projectiles</b> like fireballs and cannonballs that shouldn't thread needles.`,
        `<b>Movement checks</b>: will the character's body fit through this gap?`],
  gotchas:[`Shapecasts skip parts the shape already overlaps at the start. Begin the cast from a clear spot.`,
           `Shapecasts cost more than plain raycasts. Keep the shape small and the sweep short, and don't run dozens per frame.`]
});

demo({
  id:'rc-bounce', title:'Ricochet chain', short:'raycast + reflect in a loop', sig:'direction = direction - 2 * direction:Dot(n) * n',
  view:{theta:0.0, phi:0.35, r:30, ty:0},
  params:[R('yaw','Aim (+ = left)',-180,180,1,25,'°'), R('bounces','Bounces',0,8,1,4)],
  setup(K){
    const parts = world(K, [
      {name:'North', size:V(21,3,1), pos:V(0,1.5,-10)}, {name:'South', size:V(21,3,1), pos:V(0,1.5,10)},
      {name:'East', size:V(1,3,21), pos:V(10,1.5,0)}, {name:'West', size:V(1,3,21), pos:V(-10,1.5,0)},
      {name:'Pillar', size:V(2.5,3,2.5), pos:V(3,1.5,-3), rot:[0,30,0], color:'--vb'},
      {name:'Block', size:V(2,3,4), pos:V(-4,1.5,3), rot:[0,-20,0], color:'--vb'},
    ]);
    const O = V(0,1.5,6); K.part(V(1,1,1)).position.copy(O);
    const path = K.line('--accent',{max:12}), marks = Array.from({length:9}, ()=>K.point('--accent',0.16)), nArr = Array.from({length:9}, ()=>K.arrow('--y',{thick:0.03}));
    return {update(p){
      let o = O.clone(), d = aimDir(p.yaw*D2R); const pts = [o.clone()], hits = []; let total = 0;
      for (let i=0;i<=p.bounces;i++){
        const h = cast(o, d, 60, parts); if (!h){ pts.push(o.clone().addScaledVector(d,30)); break; }
        pts.push(h.pos); hits.push(h); total += h.dist;
        d = d.clone().sub(h.normal.clone().multiplyScalar(2*d.dot(h.normal))); o = h.pos.clone().addScaledVector(h.normal, 0.01);
      }
      path.set(pts);
      marks.forEach((m,i)=>{ m.visible = i < hits.length; if (m.visible) m.position.copy(hits[i].pos); });
      nArr.forEach((a,i)=>{ if (i < hits.length) a.set(hits[i].pos, hits[i].normal.clone().multiplyScalar(1.1)); else a.visible = false; });
      return {hits, total};
    }};
  },
  readout:(p,o)=>[['surfaces hit', String(o.hits.length),'acc'],['path length', f(o.total,1)+' studs'],['last hit', o.hits.length ? o.hits[o.hits.length-1].mesh.name : '-']],
  code:(p,o)=>`local MAX_BOUNCES = ${p.bounces}
local origin = muzzle.Position
local direction = muzzle.CFrame.LookVector

for bounce = 0, MAX_BOUNCES do
    local result = workspace:Raycast(origin, direction * 200, params)
    if not result then break end

    drawBeam(origin, result.Position)
    local n = result.Normal
    direction = direction - 2 * direction:Dot(n) * n   -- reflect
    origin = result.Position + n * 0.01                -- step off the wall
end
-- this path: ${o.hits.map(h=>h.mesh.name).join(' → ') || 'no hits'}`,
  body:`<p>Put a raycast and a reflection in a loop and you get a ricochet. Each pass finds the next wall, draws the segment, bounces the direction off the wall's normal (the green arrows), and starts again from just off the surface.</p>
<p>Sweep the aim slowly. Small changes in angle send the path somewhere completely different after a few bounces, which is why bank shots are hard. Angled pillars scatter the beam more than flat walls.</p>`,
  uses:[`<b>Ricochet weapons and laser puzzles.</b>`,
        `<b>Aim prediction lines</b> for pool, mini-golf and bouncing grenades.`,
        `<b>Sound and light bounce</b> approximations.`],
  gotchas:[`Nudge the new origin off the surface with <code>+ n * 0.01</code>, or the next ray can hit the same wall at distance 0 and get stuck.`,
           `Cap the number of bounces, and the total distance too, so one shot can't loop forever in a corner.`]
});
})();
