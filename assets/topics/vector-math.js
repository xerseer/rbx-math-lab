(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, vs, lookOf, clamp, CF, G, R, T} = Lab;
const demo = Lab.subject({
  id:'vecmath', title:'Vector maths', glyph:'cross',
  blurb:'Dot, cross, projection, angles and rotation. The tools behind vision cones, wall sliding and aiming.'
});

demo({
  id:'vec-dot', title:'Dot: in front of me?', short:'look:Dot(toTarget)', sig:'a:Dot(b)  →  number',
  view:{theta:0.35, phi:0.75, r:22, ty:0},
  params:[R('face','Facing (+ = left)',-180,180,5,0,'°'), R('ang','Target angle (+ = left)',-180,180,5,35,'°'), R('dist','Target distance',2,10,0.5,6), R('fov','Field of view',10,180,5,90,'°')],
  setup(K){
    const sec = K.sector('--accent',0.16), pl = K.part(V(1.6,2,1.2)); pl.position.set(0,1,0);
    const la = K.arrow('--z',{thick:0.06}), lt = K.arrow('--vb',{thick:0.05}), tg = K.point('--bad',0.32);
    const l1 = K.label('LookVector','--z'), l2 = K.label('toTarget','--vb'), l3 = K.label('','--ink','big');
    return {update(p){
      const yaw = p.face*D2R, half = p.fov/2*D2R, O = V(0,1,0);
      pl.quaternion.setFromAxisAngle(UP, yaw);
      sec.setSector(O, yaw, half, 9);
      const look = lookOf(yaw), tdir = lookOf(yaw + p.ang*D2R), T = O.clone().add(tdir.clone().multiplyScalar(p.dist));
      const to = T.clone().sub(O).normalize(), dot = look.dot(to), inView = dot > Math.cos(half);
      la.set(O, look.clone().multiplyScalar(3)); lt.set(O, to.clone().multiplyScalar(3)); tg.position.copy(T);
      tg.material.color.copy(C(inView?'--ok':'--bad'));
      l1.at(O.clone().add(look.clone().multiplyScalar(3.5))); l2.at(O.clone().add(to.clone().multiplyScalar(3.4)).add(V(0,0.35,0)));
      l3.at(T.clone().add(V(0,0.65,0))).text(`dot = ${f(dot)}`);
      return {dot, inView, thr:Math.cos(half), angle:Math.acos(clamp(dot,-1,1))/D2R};
    }};
  },
  readout:(p,o)=>[['dot', f(o.dot),'acc'],['angle between', f(o.angle,1)+'°'],['needed', '> '+f(o.thr)],['result', o.inView?'in view':'not in view', o.inView?'ok':'bad']],
  code:(p,o)=>`local FOV = ${f(p.fov)}   -- degrees, the whole cone

local toTarget = (target.Position - npc.Position).Unit
local dot = npc.CFrame.LookVector:Dot(toTarget)   --> ${f(o.dot)}

-- 1 = straight ahead, 0 = exactly to the side, -1 = straight behind
if dot > math.cos(math.rad(FOV / 2)) then   -- cos(${f(p.fov/2)}°) = ${f(o.thr)}
    -- ${o.inView ? 'true right now: ' : 'false right now. '}the NPC can see the target
end`,
  body:`<p>The dot product of two <b>unit</b> vectors tells you how much they point the same way, as a single number from −1 to 1.</p>
<p>Compare your LookVector with the direction to a target. <b>1</b> means dead ahead, <b>0</b> means directly to the side, <b>−1</b> means right behind you. Turn the target around and watch the number change.</p>
<p>To turn a field of view into a dot threshold, take the cosine of half the angle. A 90° cone needs <code>dot &gt; 0.71</code>.</p>`,
  uses:[`<b>Vision cones.</b> Guards only spot you when you're in front of them.`,
        `<b>Backstabs.</b> Bonus damage when <code>attacker.LookVector:Dot(victim.LookVector) &gt; 0.5</code>: both face the same way, so the attacker is behind.`,
        `<b>Slopes.</b> <code>raycastResult.Normal:Dot(Vector3.yAxis)</code> is 1 on flat ground and near 0 on a wall. Use it to block walking up steep surfaces.`],
  gotchas:[`Both vectors must be <code>.Unit</code> for the −1 to 1 range to hold. LookVector already is; the offset to the target usually isn't.`,
           `To get the angle itself, use <code>math.deg(math.acos(dot))</code>, or <code>a:Angle(b)</code>. See the Angles topic.`]
});

demo({
  id:'vec-cross', title:'Cross: the perpendicular', short:'a:Cross(b)', sig:'a:Cross(b)  →  Vector3',
  view:{theta:0.9, phi:0.95, r:15, ty:1},
  params:[R('face','Facing (+ = left)',-180,180,5,0,'°'), R('ang','b angle (+ = left)',-180,180,5,60,'°'), R('elev','b tilt up/down',-60,60,5,0,'°')],
  setup(K){
    const O = V(0,1,0), pl = K.part(V(1,0.6,1.2)); pl.position.copy(O);
    const aA = K.arrow('--z',{thick:0.06}), aB = K.arrow('--vb',{thick:0.06}), aC = K.arrow('--accent',{thick:0.08});
    const quadGeo = new THREE.BufferGeometry(); const qp = new Float32Array(18); quadGeo.setAttribute('position', new THREE.BufferAttribute(qp,3));
    const quad = K.add(new THREE.Mesh(quadGeo, K.mat('--accent',{opacity:0.16, basic:true}))); quad.material.side = THREE.DoubleSide; quad.frustumCulled=false;
    const la = K.label('a = LookVector','--z'), lb = K.label('b = toTarget','--vb'), lc = K.label('','--accent','big');
    return {update(p){
      const yaw = p.face*D2R, a = lookOf(yaw), by = yaw + p.ang*D2R, e = p.elev*D2R;
      const b = V(-Math.sin(by)*Math.cos(e), Math.sin(e), -Math.cos(by)*Math.cos(e));
      const c = a.clone().cross(b);
      pl.quaternion.setFromAxisAngle(UP, yaw);
      const A3 = a.clone().multiplyScalar(3), B3 = b.clone().multiplyScalar(3);
      aA.set(O,A3); aB.set(O,B3); aC.set(O, c.clone().multiplyScalar(3));
      const P0=O, P1=O.clone().add(A3), P2=O.clone().add(A3).add(B3), P3=O.clone().add(B3);
      [P0,P1,P2,P0,P2,P3].forEach((P,i)=>{ qp[i*3]=P.x; qp[i*3+1]=P.y; qp[i*3+2]=P.z; }); quadGeo.attributes.position.needsUpdate = true;
      la.at(P1.clone().add(a.clone().multiplyScalar(0.6))); lb.at(P3.clone().add(b.clone().multiplyScalar(0.6)));
      lc.at(O.clone().add(c.clone().multiplyScalar(3)).add(c.y>=0?V(0,0.45,0):V(0,-0.45,0))).text('a:Cross(b)');
      const side = Math.abs(c.y) < 1e-3 ? 'straight ahead or behind' : (c.y > 0 ? 'left' : 'right');
      return {c,side,len:c.length()};
    }};
  },
  readout:(p,o)=>[['a:Cross(b)', vs(o.c),'acc'],['length', f(o.len)],['.Y sign → b is', o.side]],
  code:(p,o)=>`local look = npc.CFrame.LookVector
local toTarget = (target.Position - npc.Position).Unit

local c = look:Cross(toTarget)    --> ${vs(o.c)}
if c.Y > 0 then
    print("target is on the left")
else
    print("target is on the right")
end
-- right now: ${o.side}`,
  body:`<p>The cross product of two vectors is a third vector that points <b>straight out of both</b>, at 90° to each. Its length is biggest when a and b are at right angles and zero when they're parallel. The shaded patch shows that size: its area equals the cross product's length.</p>
<p>Which way it points follows the right-hand rule. Swap a and b and it flips. That flip is useful: with a flat LookVector and a direction to a target, the sign of <code>.Y</code> tells you if the target is on your left or your right.</p>`,
  uses:[`<b>Left or right?</b> Steering AI and turret logic.`,
        `<b>Building a sideways vector.</b> <code>look:Cross(Vector3.yAxis)</code> gives the right-hand direction for strafing or placing things beside a player.`,
        `<b>Aligning to a surface.</b> With a raycast <code>Normal</code>, cross products give the other two axes you need for a CFrame that sits flat on a slope.`],
  gotchas:[`Order matters: <code>a:Cross(b) == -(b:Cross(a))</code>.`,
           `Parallel vectors give <code>Vector3.zero</code>, and its <code>.Unit</code> is NaN. Guard against it.`]
});

demo({
  id:'vec-project', title:'Projection: slide along walls', short:'v - v:Dot(n) * n', sig:'v:Dot(n) * n  (into)   ·   v - v:Dot(n) * n  (along)',
  view:{theta:0.25, phi:0.6, r:17, ty:0.5},
  params:[R('wall','Wall angle',-60,60,5,15,'°'), R('ang','Move angle (0 = straight in)',-80,80,5,40,'°'), R('speed','Speed',2,8,0.5,5)],
  setup(K){
    const wall = K.part(V(10,3,0.3),'--part',{front:false, opacity:0.85});
    const nA = K.arrow('--y',{thick:0.04}), vA = K.arrow('--va',{thick:0.06}), inA = K.arrow('--bad',{thick:0.06}), slA = K.arrow('--accent',{thick:0.08});
    const d1 = K.line('--muted',{dashed:true}), d2 = K.line('--muted',{dashed:true}), pl = K.point('--ink',0.18);
    const l1 = K.label('v (wanted move)','--va'), l2 = K.label('into wall','--bad'), l3 = K.label('slide','--accent','big'), l4 = K.label('n','--y');
    return {update(p){
      const w = p.wall*D2R, n = V(Math.sin(w),0,Math.cos(w)), W = V(0,1.5,0);
      wall.setCF(CF.lookAt(W, W.clone().sub(n)));
      const P = W.clone().add(n.clone().multiplyScalar(1.2)).add(V(0,-0.5,0)); pl.position.copy(P);
      const dir = V(-Math.sin(w+p.ang*D2R),0,-Math.cos(w+p.ang*D2R)), v = dir.multiplyScalar(p.speed);
      const dn = v.dot(n), into = n.clone().multiplyScalar(dn), slide = v.clone().sub(into);
      vA.set(P,v); inA.set(P,into); slA.set(P,slide); nA.set(P, n.clone().multiplyScalar(1.6));
      d1.set(P.clone().add(slide), P.clone().add(v)); d2.set(P.clone().add(into), P.clone().add(v));
      l1.at(P.clone().add(v).add(V(0,0.45,0))); l2.at(P.clone().add(into).add(V(0,-0.45,0))); l3.at(P.clone().add(slide).add(V(0,0.45,0)));
      l4.at(P.clone().add(n.clone().multiplyScalar(1.9)));
      return {v, n, dn, into, slide};
    }};
  },
  readout:(p,o)=>[['v:Dot(n)', f(o.dn)],['into wall', vs(o.into),'bad'],['slide', vs(o.slide),'acc'],['slide speed', f(o.slide.length())+' of '+f(p.speed)]],
  code:(p,o)=>`local move = moveDirection * SPEED                      --> ${vs(o.v)}
local result = workspace:Raycast(root.Position, move.Unit * 2, params)

if result then
    local n = result.Normal                              --> ${vs(o.n)}
    local intoWall = n * move:Dot(n)                     --> ${vs(o.into)}
    move = move - intoWall                               --> ${vs(o.slide)}
end
root.Position += move * dt

-- same idea with the ground as the "wall": flatten onto the floor
local flat = v - Vector3.yAxis * v:Dot(Vector3.yAxis)    -- = v * Vector3.new(1, 0, 1)`,
  body:`<p>Projection splits a vector into two parts: how much of it goes <b>along</b> a direction, and what's left over. With a wall's normal <code>n</code>, <code>v:Dot(n)</code> measures how much of the movement pushes into the wall.</p>
<p>Remove that part and you're left with the slide along the wall: <code>v - v:Dot(n) * n</code>. That's how characters glide along walls instead of stopping dead. Walk straight in (angle 0) and the slide is zero; graze the wall and most of the speed survives.</p>`,
  uses:[`<b>Custom character controllers</b> that slide along walls and up gentle slopes.`,
        `<b>Progress along a track.</b> <code>(car.Position - start):Dot(trackDirection)</code> is how far along a straight section the car has driven.`,
        `<b>Flattening</b> a camera's LookVector onto the floor so WASD movement doesn't point into the ground.`],
  gotchas:[`<code>n</code> must be a unit vector. Raycast normals already are.`,
           `Only remove the into-wall part when it's negative (moving into the wall). If <code>v:Dot(n) &gt; 0</code> you're moving away and shouldn't be blocked.`]
});

demo({
  id:'vec-angle', title:'Angles: turn at a set speed', short:'look:Angle(to, axis)', sig:'a:Angle(b, axis?)  →  radians (signed with an axis)', time:true,
  view:{theta:0.1, phi:0.6, r:18, ty:0},
  params:[R('tang','Target position (angle)',-180,180,5,120,'°'), R('speed','Max turn speed',20,360,10,90,'°/s')],
  setup(K){
    const pl = K.part(V(1.6,2,1.2)); pl.position.set(0,1,0); const sec = K.sector('--accent',0.22);
    const la = K.arrow('--z',{thick:0.06}), lt = K.arrow('--vb',{thick:0.05}), tg = K.point('--vb',0.32);
    const lab = K.label('','--accent','big'), ll = K.label('LookVector','--z');
    let yaw = 0, last = 0;
    return {update(p,t){
      let dt = t - last; last = t; if (dt < 0 || dt > 0.2) dt = 0;
      const O = V(0,1,0), T = O.clone().add(lookOf(p.tang*D2R).multiplyScalar(6)); tg.position.copy(T);
      const look = lookOf(yaw), to = T.clone().sub(O).normalize();
      const signed = Math.atan2(look.clone().cross(to).y, look.dot(to));
      const maxStep = p.speed*D2R*dt; yaw += clamp(signed, -maxStep, maxStep);
      pl.quaternion.setFromAxisAngle(UP, yaw);
      la.set(O, lookOf(yaw).multiplyScalar(3)); lt.set(O, to.clone().multiplyScalar(3));
      sec.setSector(O, yaw + signed/2, Math.abs(signed)/2, 2.6);
      lab.at(O.clone().add(lookOf(yaw+signed/2).multiplyScalar(3.4))).text(`${f(signed/D2R,0)}°`);
      ll.at(O.clone().add(lookOf(yaw).multiplyScalar(3.5)).add(V(0,0.3,0)));
      return {signed, done:Math.abs(signed) < 0.01};
    }};
  },
  readout:(p,o)=>[['look:Angle(to, yAxis)', f(o.signed/D2R,1)+'°','acc'],['turning', o.done?'facing target':(o.signed>0?'left':'right'), o.done?'ok':'']],
  code:(p,o)=>`local MAX_TURN = math.rad(${f(p.speed)})   -- per second

RunService.Heartbeat:Connect(function(dt)
    local look = npc.CFrame.LookVector
    local toTarget = (target.Position - npc.Position) * Vector3.new(1, 0, 1)

    -- signed angle around Y: + means turn left, - means turn right
    local angle = look:Angle(toTarget, Vector3.yAxis)   --> ${f(o.signed,3)} (${f(o.signed/D2R,1)}°)
    local step = math.clamp(angle, -MAX_TURN * dt, MAX_TURN * dt)
    npc.CFrame = npc.CFrame * CFrame.Angles(0, step, 0)
end)`,
  body:`<p><code>a:Angle(b)</code> gives the angle between two vectors in radians, always positive. Pass an axis as well, <code>a:Angle(b, Vector3.yAxis)</code>, and you get a <b>signed</b> angle: positive means b is anticlockwise (left, seen from above), negative means right.</p>
<p>A signed angle is exactly what you need to turn something gradually. Clamp it to a maximum per frame and the NPC turns at a fixed speed instead of snapping. Move the target and watch the wedge shrink as it turns.</p>`,
  uses:[`<b>Turrets with a turn speed</b>, so players can outrun the aim.`,
        `<b>Tank and vehicle steering</b> toward a waypoint.`,
        `<b>Vision checks in degrees</b> when that reads easier than dot products.`],
  gotchas:[`Results are in radians. Use <code>math.deg</code> to show them.`,
           `Without the axis argument you lose the sign, so you can't tell which way to turn.`,
           `Flatten both vectors (zero their Y) before measuring a turn around Y, or height differences sneak into the angle.`]
});

demo({
  id:'vec-rotate', title:'Rotating a vector', short:'CFrame.fromAxisAngle', sig:'CFrame.fromAxisAngle(axis, angle):VectorToWorldSpace(v)', time:true,
  view:{theta:0.6, phi:1.0, r:14, ty:1.5},
  params:[R('tilt','Axis tilt from Y',0,90,5,25,'°'), R('ang','Angle',0,360,5,90,'°'), T('anim','Spin',false)],
  setup(K){
    const O = V(0,1.5,0), v = V(2.6,0.6,0.8);
    const axA = K.arrow('--y',{thick:0.04}), axL = K.line('--y',{dashed:true});
    const vO = K.arrow('--va',{thick:0.05, opacity:0.5}), vR = K.arrow('--accent',{thick:0.07}), path = K.line('--accent',{dashed:true, max:97});
    const l1 = K.label('v','--va'), l2 = K.label('rotated','--accent','big'), l3 = K.label('axis','--y');
    const q = new THREE.Quaternion();
    return {update(p,t){
      const tl = p.tilt*D2R, axis = V(Math.sin(tl), Math.cos(tl), 0);
      const a = p.anim ? (t*1.2) % (Math.PI*2) : p.ang*D2R;
      axA.set(O, axis.clone().multiplyScalar(3.2)); axL.set(O.clone().sub(axis.clone().multiplyScalar(2)), O);
      const r = v.clone().applyQuaternion(q.setFromAxisAngle(axis, a));
      vO.set(O, v); vR.set(O, r);
      const pts = []; for (let i=0;i<=96;i++){ pts.push(O.clone().add(v.clone().applyQuaternion(q.setFromAxisAngle(axis, i/96*Math.PI*2)))); } path.set(pts);
      l1.at(O.clone().add(v).add(V(0,0.4,0))); l2.at(O.clone().add(r).add(V(0,0.45,0))); l3.at(O.clone().add(axis.clone().multiplyScalar(3.6)));
      return {axis, r, a};
    }};
  },
  readout:(p,o)=>[['axis', vs(o.axis)],['angle', f(o.a/D2R,0)+'°'],['result', vs(o.r),'acc']],
  code:(p,o)=>`local v = Vector3.new(2.6, 0.6, 0.8)
local axis = ${`Vector3.new(${f(o.axis.x)}, ${f(o.axis.y)}, 0)`}.Unit

local spin = CFrame.fromAxisAngle(axis, math.rad(${f(o.a/D2R,0)}))
local rotated = spin:VectorToWorldSpace(v)   --> ${vs(o.r)}
-- a CFrame with no position also works as: spin * v

-- shotgun: 8 pellets in a ring around the aim direction
for i = 1, 8 do
    local around = CFrame.fromAxisAngle(aim, i / 8 * 2 * math.pi)
    local tilted = CFrame.fromAxisAngle(aim:Cross(Vector3.yAxis).Unit, math.rad(4))
    local pellet = around:VectorToWorldSpace(tilted:VectorToWorldSpace(aim))
end`,
  body:`<p>To rotate a direction (not a part), build a rotation-only CFrame and apply it to the vector. <code>CFrame.fromAxisAngle(axis, angle)</code> spins around any axis you choose, not just X, Y or Z.</p>
<p>The tip of the vector travels around a circle centred on the axis. Tilt the axis and the circle tilts with it. Positive angles turn anticlockwise when you look down the axis from its tip.</p>`,
  uses:[`<b>Shotgun and spread patterns</b>: rotate the aim direction a few degrees around it.`,
        `<b>Formations</b>: rotate one offset by 360° / N to place each squad member.`,
        `<b>Orbiting on a tilted plane</b>, like a moon around a tilted planet.`],
  gotchas:[`The axis must be a unit vector.`,
           `<code>VectorToWorldSpace</code> ignores the CFrame's position. Use it for directions; use <code>cf * v</code> or <code>PointToWorldSpace</code> for points.`]
});

demo({
  id:'vec-closest', title:'Closest point on a line', short:'clamp((p - a):Dot(dir), 0, len)', sig:'a + dir * math.clamp((p - a):Dot(dir), 0, length)',
  view:{theta:0.5, phi:0.8, r:22, ty:1},
  params:[R('px','Player X',-9,9,0.5,2), R('py','Player Y',0,5,0.5,1), R('pz','Player Z',-8,8,0.5,4), R('rad','Laser hit radius',0.5,3,0.25,1.5)],
  setup(K){
    const A = V(-7,1.5,-3), B = V(7,2.5,2), dir = B.clone().sub(A).normalize(), len = A.distanceTo(B);
    K.part(V(0.8,0.8,0.8),'--part',{front:false}).position.copy(A); K.part(V(0.8,0.8,0.8),'--part',{front:false}).position.copy(B);
    K.arrow('--accent',{thick:0.05}).set(A, B.clone().sub(A));
    const tube = K.add(new THREE.Mesh(G.cyl, K.mat('--accent',{opacity:0.12})));
    tube.position.copy(A.clone().lerp(B,0.5)); tube.quaternion.setFromUnitVectors(UP, dir);
    const pl = K.part(V(1,2,1),'--ok',{front:false}), cp = K.point('--ink',0.14), d1 = K.line('--ink',{dashed:true}), d2 = K.line('--va');
    K.label('a','--muted','big').at(A.clone().add(V(0,0.8,0))); K.label('b','--muted','big').at(B.clone().add(V(0,0.8,0)));
    const lc = K.label('closest','--ink'), ld = K.label('','--ink','big');
    return {update(p){
      tube.scale.set(p.rad, len, p.rad);
      const P = V(p.px,p.py+1,p.pz), tRaw = P.clone().sub(A).dot(dir), t = clamp(tRaw,0,len), Cp = A.clone().add(dir.clone().multiplyScalar(t));
      const dist = P.distanceTo(Cp), hit = dist <= p.rad;
      pl.position.copy(P); pl.tint(hit?'--bad':'--ok'); cp.position.copy(Cp); d1.set(P, Cp); d2.set(A, Cp);
      lc.at(Cp.clone().add(V(0,-0.5,0))); ld.at(P.clone().lerp(Cp,0.5).add(V(0,0.4,0))).text(`${f(dist)} studs`);
      return {tRaw, t, Cp, dist, hit, len};
    }};
  },
  readout:(p,o)=>[['(p - a):Dot(dir)', f(o.tRaw)],['clamped to 0..'+f(o.len), f(o.t)],['distance', f(o.dist)],['laser', o.hit?'hits the player':'misses', o.hit?'bad':'ok']],
  code:(p,o)=>`local a, b = emitterA.Position, emitterB.Position
local dir = (b - a).Unit
local length = (b - a).Magnitude                       -- ${f(o.len)}

local t = math.clamp((player.Position - a):Dot(dir), 0, length)   --> ${f(o.t)}
local closest = a + dir * t                            --> ${vs(o.Cp)}
local distance = (player.Position - closest).Magnitude  --> ${f(o.dist)}

if distance < ${f(p.rad)} then
    humanoid:TakeDamage(10)    -- ${o.hit ? 'true right now' : 'false right now'}
end`,
  body:`<p>A projection onto the line's direction tells you how far along the line the player is: <code>(p - a):Dot(dir)</code>. Clamp it between 0 and the line's length so the answer stays on the segment, then walk that far from <code>a</code>. That's the closest point.</p>
<p>The distance from the player to that point is their distance to the whole line. Here, anyone within the shaded tube gets hit by the laser. Move the player past either end and the closest point stops at the emitter.</p>`,
  uses:[`<b>Laser beams, lightning and sword swipes</b> as hit checks without any parts.`,
        `<b>Ziplines and rails</b>: snap a player onto the nearest point of the rope.`,
        `<b>Race progress</b>: how far along the current track segment each car is.`],
  gotchas:[`Without the clamp you get the closest point on an infinite line, which can lie far past the emitters.`,
           `<code>dir</code> must be <code>.Unit</code>, or the "how far along" number is scaled wrong.`]
});

demo({
  id:'vec-plane', title:'Which side of a line?', short:'(p - point):Dot(n)', sig:'(p - planePoint):Dot(normal)  →  signed distance',
  view:{theta:0.35, phi:0.7, r:24, ty:0},
  params:[R('gate','Gate angle',-90,90,5,20,'°'), R('px','Player X',-9,9,0.5,3), R('pz','Player Z',-9,9,0.5,-4)],
  setup(K){
    const gate = K.part(V(8,4,0.15),'--accent',{front:false, opacity:0.35}), front = K.part(V(20,0.02,10),'--va',{front:false, opacity:0.14, edges:false}), back = K.part(V(20,0.02,10),'--vb',{front:false, opacity:0.14, edges:false});
    const nA = K.arrow('--y',{thick:0.05}), pl = K.part(V(1,2,1),'--va',{front:false}), perp = K.line('--ink',{dashed:true}), foot = K.point('--ink',0.1);
    const ld = K.label('','--ink','big'), ln = K.label('n = gate.CFrame.LookVector','--y'), lf = K.label('front side (d > 0)','--va'), lb = K.label('back side (d < 0)','--vb');
    return {update(p){
      const yaw = p.gate*D2R, n = lookOf(yaw), Gp = V(0,2,0), cf = CF.lookAt(Gp, Gp.clone().add(n));
      gate.setCF(cf); front.setCF(CF.lookAt(n.clone().multiplyScalar(5).setY(0.01), n.clone().multiplyScalar(6).setY(0.01)));
      back.setCF(CF.lookAt(n.clone().multiplyScalar(-5).setY(0.01), n.clone().multiplyScalar(-4).setY(0.01)));
      nA.set(Gp, n.clone().multiplyScalar(2.2)); ln.at(Gp.clone().add(n.clone().multiplyScalar(2.7)).add(V(0,0.4,0)));
      lf.at(n.clone().multiplyScalar(7).setY(0.3)); lb.at(n.clone().multiplyScalar(-7).setY(0.3));
      const P = V(p.px,1,p.pz), d = P.clone().sub(V(0,1,0)).dot(n), F = P.clone().addScaledVector(n, -d);
      pl.position.copy(P); pl.tint(d >= 0 ? '--va' : '--vb'); perp.set(P, F); foot.position.copy(F);
      ld.at(P.clone().lerp(F,0.5).add(V(0,0.5,0))).text(`d = ${f(d)}`);
      return {d, n};
    }};
  },
  readout:(p,o)=>[['n', vs(o.n)],['d', f(o.d),'acc'],['side', o.d > 0 ? 'front' : o.d < 0 ? 'back' : 'exactly on the line', o.d >= 0 ? 'ok' : 'bad']],
  code:(p,o)=>`local n = gate.CFrame.LookVector                 --> ${vs(o.n)}
local d = (player.Position - gate.Position):Dot(n)   --> ${f(o.d)}

if d > 0 then
    print("in front of the gate")          -- ${o.d > 0 ? 'true right now' : 'false right now'}
end

-- crossing a finish line: the sign changes between two frames
local lastD = {}
RunService.Heartbeat:Connect(function()
    local now = (root.Position - finish.Position):Dot(finish.CFrame.LookVector)
    if lastD[player] and lastD[player] < 0 and now >= 0 then
        lapCompleted(player)
    end
    lastD[player] = now
end)`,
  body:`<p>A wall, gate or finish line can be described by any point on it plus its <b>normal</b>, the direction it faces. The dot product of the normal with the offset from that point gives a <b>signed distance</b>: positive in front, negative behind, zero exactly on the line.</p>
<p>Its size is how far away you are, measured straight across (the dashed line), no matter how far along the gate you stand. Walk the player across the gate and watch the sign flip.</p>`,
  uses:[`<b>Finish lines and checkpoints</b>: a sign change between frames means the player crossed.`,
        `<b>Team sides</b>: which half of the arena is a player standing in?`,
        `<b>One-way doors</b> that only let you through from the front.`],
  gotchas:[`The gate here is infinite. To limit it to the gate's width, also check how far along it you are with <code>gate.CFrame:PointToObjectSpace(pos).X</code>.`,
           `Fast players can skip past a thin trigger part in one frame, but they can't skip the sign change. That makes this check more reliable than <code>Touched</code>.`]
});

demo({
  id:'vec-basis', title:'Building axes from one direction', short:'CFrame.fromMatrix(pos, right, up)', sig:'right = look:Cross(up).Unit  ·  up = right:Cross(look)  ·  CFrame.fromMatrix',
  view:{theta:0.7, phi:1.0, r:13, ty:2},
  params:[R('yaw','Direction: turn',-180,180,5,40,'°'), R('pitch','Direction: tilt',-89,89,1,25,'°')],
  setup(K){
    const O = V(0,2,0), part = K.part(V(1.4,0.8,2.4)); part.position.copy(O);
    const wu = K.arrow('--muted',{thick:0.03, opacity:0.5}), aL = K.arrow('--z',{thick:0.06}), aR = K.arrow('--x',{thick:0.06}), aU = K.arrow('--y',{thick:0.06});
    wu.set(O.clone().add(V(-2.5,-1,0)), V(0,2,0)); K.label('world up','--muted').at(O.clone().add(V(-2.5,1.4,0)));
    const lL = K.label('look (given)','--z','big'), lR = K.label('right = look × up','--x'), lU = K.label('up = right × look','--y');
    return {update(p){
      const y = p.yaw*D2R, pt = p.pitch*D2R, look = V(-Math.sin(y)*Math.cos(pt), Math.sin(pt), -Math.cos(y)*Math.cos(pt));
      const rawR = look.clone().cross(UP), weak = rawR.length(), right = rawR.clone().normalize(), up = right.clone().cross(look);
      const m = new THREE.Matrix4().makeBasis(right, up, look.clone().negate()); m.setPosition(O); part.setCF(m);
      aL.set(O, look.clone().multiplyScalar(2.6)); aR.set(O, right.clone().multiplyScalar(2)); aU.set(O, up.clone().multiplyScalar(2));
      lL.at(O.clone().add(look.clone().multiplyScalar(3.1))); lR.at(O.clone().add(right.clone().multiplyScalar(2.5))); lU.at(O.clone().add(up.clone().multiplyScalar(2.5)));
      return {look, right, up, weak};
    }};
  },
  readout:(p,o)=>[['look', vs(o.look)],['right', vs(o.right)],['up', vs(o.up)],['|look × worldUp|', f(o.weak), o.weak < 0.15 ? 'bad' : 'acc']],
  code:(p,o)=>`local look = velocity.Unit                       --> ${vs(o.look)}
local right = look:Cross(Vector3.yAxis).Unit       --> ${vs(o.right)}
local up = right:Cross(look)                       --> ${vs(o.up)}

-- fromMatrix(position, rightVector, upVector)
arrow.CFrame = CFrame.fromMatrix(arrow.Position, right, up)
-- arrow.CFrame.LookVector now equals look`,
  body:`<p>Sometimes you only know one direction, like a projectile's velocity, and need a whole CFrame. Cross it with world up to get a <b>right</b> vector, then cross right with look to get a true <b>up</b> that's at 90° to both. Those three arrows are a complete set of axes.</p>
<p><code>CFrame.fromMatrix(pos, right, up)</code> builds the CFrame straight from them. This is what <code>CFrame.lookAt</code> does inside. Tilt the direction close to straight up and watch the readout: look × up shrinks toward zero and the right vector becomes unreliable.</p>`,
  uses:[`<b>Arrows and missiles</b> that point along their velocity every frame.`,
        `<b>Aligning to surfaces</b>: use the raycast normal as "up" instead of world up.`,
        `<b>Custom cameras and vehicles</b> where you build the axes yourself.`],
  gotchas:[`When the direction is nearly straight up or down, <code>look:Cross(Vector3.yAxis)</code> is close to zero. Switch to a different helper axis, such as <code>Vector3.zAxis</code>, in that case.`,
           `Normalise <code>right</code> with <code>.Unit</code>. The cross product of two unit vectors is only length 1 when they're at 90°.`]
});

demo({
  id:'vec-reflect', title:'Reflecting off a wall', short:'d - 2 * d:Dot(n) * n', sig:'d - 2 * d:Dot(n) * n  →  Vector3',
  view:{theta:0.2, phi:0.7, r:20, ty:0.5},
  params:[R('wall','Wall angle',-60,60,5,20,'°'), R('inc','Incoming angle',-75,75,5,35,'°')],
  setup(K){
    const H = V(0,1.5,0);
    const wall = K.part(V(7,3,0.25),'--part',{front:false});
    const din = K.arrow('--va',{thick:0.06}), nn = K.arrow('--y',{thick:0.05}), rr = K.arrow('--accent',{thick:0.07});
    const ghost = K.line('--va',{dashed:true, opacity:0.6}); K.point('--ink',0.1).position.copy(H);
    const l1 = K.label('d (incoming)','--va'), l2 = K.label('n = Normal','--y'), l3 = K.label('bounced','--accent','big');
    return {update(p){
      const w = p.wall*D2R, n = V(Math.sin(w),0,Math.cos(w));
      wall.setCF(CF.lookAt(H, H.clone().sub(n)));
      const sdir = V(Math.sin(w+p.inc*D2R),0,Math.cos(w+p.inc*D2R)), S = H.clone().add(sdir.clone().multiplyScalar(7));
      const d = H.clone().sub(S).normalize(), dn = d.dot(n), r = d.clone().sub(n.clone().multiplyScalar(2*dn));
      din.set(S, H.clone().sub(S)); nn.set(H, n.clone().multiplyScalar(2)); rr.set(H, r.clone().multiplyScalar(6));
      ghost.set(H, H.clone().add(d.clone().multiplyScalar(3)));
      l1.at(S.clone().add(V(0,0.5,0))); l2.at(H.clone().add(n.clone().multiplyScalar(2.4)).add(V(0,0.3,0))); l3.at(H.clone().add(r.clone().multiplyScalar(6.4)).add(V(0,0.4,0)));
      return {d,n,r,dn};
    }};
  },
  readout:(p,o)=>[['d', vs(o.d)],['n', vs(o.n)],['d:Dot(n)', f(o.dn)],['bounced', vs(o.r),'acc']],
  code:(p,o)=>`local direction = (target - origin).Unit
local result = workspace:Raycast(origin, direction * 500)

if result then
    local n = result.Normal                 --> ${vs(o.n)}
    local bounced = direction - 2 * direction:Dot(n) * n
    --> ${vs(o.r)}
    -- fire a new ray (or a new bullet) from result.Position along bounced
end`,
  body:`<p>A raycast tells you where it hit and the surface <b>Normal</b>, the direction pointing straight out of the wall. With those two, one line of maths bounces any direction off the surface like a mirror.</p>
<p>It's projection again: <code>d:Dot(n)</code> measures how much of the incoming direction goes <i>into</i> the wall. Subtract that part twice and you flip it to point back out, while the sideways part stays the same. The dashed line shows where the ray would have gone without the wall.</p>`,
  uses:[`<b>Ricochet bullets and lasers</b> that bounce a set number of times. See Raycasting › Ricochet chain.`,
        `<b>Ball games.</b> Bounce a ball off walls in a custom physics loop.`,
        `<b>Light puzzles.</b> Mirrors that redirect a beam toward a target.`],
  gotchas:[`<code>direction</code> and <code>n</code> should both be unit vectors. Raycast normals already are.`,
           `Start the next ray a tiny bit off the surface (<code>result.Position + n * 0.01</code>) or it can hit the same wall again straight away.`]
});

{
const {V, D2R, f, vs, CF, R, S, T, clamp} = Lab;

function intercept(S0, T0, Vt, s){
  const d = T0.clone().sub(S0), a = Vt.dot(Vt) - s*s, b = 2*d.dot(Vt), c = d.dot(d);
  if (Math.abs(a) < 1e-6){ const t = -c/b; return t > 0 ? t : null; }
  const disc = b*b - 4*a*c; if (disc < 0) return null;
  const r = Math.sqrt(disc), t1 = (-b - r)/(2*a), t2 = (-b + r)/(2*a);
  const lo = Math.min(t1,t2), hi = Math.max(t1,t2); const t = lo > 0 ? lo : hi; return t > 0 ? t : null;
}

demo({
  id:'vec-lead', title:'Leading a moving target', short:'solve for intercept time', sig:'|targetPos + targetVel·t − shooterPos| = bulletSpeed·t', time:true,
  view:{theta:0.1, phi:0.55, r:28, ty:0, tz:-1},
  params:[R('vt','Target speed',2,20,0.5,9,' studs/s'), R('dir','Target direction',-60,60,5,0,'°'), R('bs','Bullet speed',8,60,1,24,' studs/s'), R('tx','Target start X',-10,4,0.5,-8)],
  setup(K){
    const S0 = V(0,1,9); K.part(V(1.2,2,1)).position.set(0,1,9.4);
    const tg = K.part(V(1.2,1.2,1.2),'--vb',{front:false}), bl = K.point('--accent',0.22), bn = K.point('--bad',0.18);
    const path = K.line('--vb',{dashed:true}), aimL = K.line('--accent',{dashed:true}), naiveL = K.line('--bad',{dashed:true, opacity:0.6});
    const aimR = K.ring(0.9,'--accent',{y:0.04}), la = K.label('aim here','--accent','big'), lt = K.label('','--vb');
    return {update(p,t){
      const T0 = V(p.tx,1,-6), Vt = V(Math.cos(p.dir*D2R),0,-Math.sin(p.dir*D2R)).multiplyScalar(p.vt);
      const ti = intercept(S0, T0, Vt, p.bs), A = ti ? T0.clone().addScaledVector(Vt, ti) : null;
      const tn = T0.distanceTo(S0)/p.bs, miss = Vt.length()*tn;
      const period = (ti || tn) + 1.2, tau = t % period;
      tg.position.copy(T0.clone().addScaledVector(Vt, Math.min(tau, (ti||tn)+0.6)));
      path.set(T0, T0.clone().addScaledVector(Vt, (ti||tn)+1));
      naiveL.set(S0, T0); const dn = T0.clone().sub(S0).normalize(); bn.position.copy(S0.clone().addScaledVector(dn, p.bs*Math.min(tau, tn+0.3)));
      bl.visible = !!A; aimR.visible = !!A; aimL.visible = !!A; la.show(!!A);
      if (A){ const da = A.clone().sub(S0).normalize(); bl.position.copy(S0.clone().addScaledVector(da, p.bs*Math.min(tau, ti))); aimL.set(S0, A); aimR.position.set(A.x,0,A.z); la.at(A.clone().add(V(0,1.1,0))); }
      lt.at(tg.position.clone().add(V(0,1.1,0))).text(A ? 'target' : 'target (too fast to catch)');
      return {ti, A, miss, tn};
    }};
  },
  readout:(p,o)=>[['intercept time', o.ti ? f(o.ti,2)+' s' : 'none: bullet too slow', o.ti ? 'acc' : 'bad'],['aim point', o.A ? vs(o.A) : '-'],['aiming straight at it misses by', f(o.miss,1)+' studs','bad']],
  code:(p,o)=>`local function interceptTime(shooterPos, targetPos, targetVel, bulletSpeed)
    local d = targetPos - shooterPos
    local a = targetVel:Dot(targetVel) - bulletSpeed ^ 2
    local b = 2 * d:Dot(targetVel)
    local c = d:Dot(d)
    if math.abs(a) < 1e-6 then                -- same speed: straight-line case
        local t = -c / b
        return t > 0 and t or nil
    end
    local disc = b * b - 4 * a * c
    if disc < 0 then return nil end           -- it can never be caught
    local r = math.sqrt(disc)
    local t1, t2 = (-b - r) / (2 * a), (-b + r) / (2 * a)
    local t = math.min(t1, t2) > 0 and math.min(t1, t2) or math.max(t1, t2)
    return t > 0 and t or nil
end

local t = interceptTime(muzzle.Position, target.Position, target.AssemblyLinearVelocity, ${p.bs})
if t then                                      -- ${o.ti ? f(o.ti,2)+' s' : 'nil right now'}
    local aim = target.Position + target.AssemblyLinearVelocity * t
    fireBullet((aim - muzzle.Position).Unit * ${p.bs})
end`,
  body:`<p>Aim straight at a moving target and the bullet arrives where the target <i>was</i>. To hit it, aim where it <b>will be</b> when the bullet gets there. That's a meeting-point problem: find the time <code>t</code> when the target's position equals the distance the bullet can cover.</p>
<p>Writing that out gives a quadratic equation, solved with the usual formula. The smallest positive answer is the intercept time, and <code>targetPos + targetVel * t</code> is the aim point. The red shot aims at the target's current spot and misses; the orange one leads it. Make the target faster than the bullet and sometimes there's no answer at all.</p>`,
  uses:[`<b>Turrets and AI gunners</b> that hit moving players.`,
        `<b>Auto-aim and aim assist.</b>`,
        `<b>Passing a ball</b> to a running teammate.`],
  gotchas:[`This assumes the target keeps a straight line at a steady speed. Players dodge, so AI that always leads perfectly feels unfair. Add a little error.`,
           `For bullets that drop with gravity, solve for the flat aim first, then add the drop separately.`]
});

demo({
  id:'vec-steer', title:'Steering: seek and arrive', short:'desired − velocity', sig:'steer = (desired − velocity), limited to maxForce', time:true,
  view:{theta:0.0, phi:0.45, r:26, ty:0},
  params:[S('mode','Behaviour',[['arrive','Arrive (slow down near target)'],['seek','Seek (full speed)']],'arrive'), R('maxSpeed','Max speed',4,20,0.5,10), R('maxForce','Turning force',2,40,1,12), R('slowR','Slow-down radius',1,8,0.5,4), T('moving','Target moves',true)],
  setup(K){
    const agent = K.part(V(1,0.8,1.6),'--accent'), tg = K.point('--vb',0.3), slow = K.ring(1,'--vb',{dashed:true, y:0.04});
    const aV = K.arrow('--va',{thick:0.05}), aD = K.arrow('--vb',{thick:0.04}), aS = K.arrow('--accent',{thick:0.05}), trail = K.line('--accent',{max:160, opacity:0.45});
    const lv = K.label('velocity','--va'), ld = K.label('desired','--vb'), ls = K.label('steer','--accent');
    const pos = V(-8,0.6,6), vel = V(4,0,0), hist = []; let last = 0, acc = 0, tick = 0;
    return {update(p,t){
      let dt = t - last; last = t; if (dt < 0 || dt > 0.25) dt = 0; acc += dt;
      const tgt = p.moving ? V(Math.sin(t*0.45)*8, 0.6, Math.sin(t*0.9)*5) : V(6,0.6,-4);
      let desired = V(), steer = V();
      while (acc >= 1/120){ acc -= 1/120; const h = 1/120;
        const off = tgt.clone().sub(pos); off.y = 0; const d = off.length();
        const sp = p.mode==='arrive' && d < p.slowR ? p.maxSpeed*d/p.slowR : p.maxSpeed;
        desired = d > 1e-4 ? off.multiplyScalar(sp/d) : V();
        steer = desired.clone().sub(vel); if (steer.length() > p.maxForce) steer.setLength(p.maxForce);
        vel.addScaledVector(steer, h); if (vel.length() > p.maxSpeed) vel.setLength(p.maxSpeed); pos.addScaledVector(vel, h);
        if (++tick % 4 === 0){ hist.push(pos.clone()); if (hist.length > 160) hist.shift(); }
      }
      tg.position.copy(tgt); slow.scale.set(p.slowR,1,p.slowR); slow.position.set(tgt.x,0,tgt.z); slow.visible = p.mode==='arrive';
      if (vel.length() > 0.05) agent.setCF(CF.lookAt(pos, pos.clone().add(vel))); else agent.position.copy(pos);
      const up = V(0,0.8,0); aV.set(pos.clone().add(up), vel.clone().multiplyScalar(0.3)); aD.set(pos.clone().add(up), desired.clone().multiplyScalar(0.3)); aS.set(pos.clone().add(up), steer.clone().multiplyScalar(0.3));
      lv.at(pos.clone().add(up).addScaledVector(vel,0.33)); ld.at(pos.clone().add(up).addScaledVector(desired,0.33).add(V(0,0.4,0))); ls.at(pos.clone().add(up).addScaledVector(steer,0.33).add(V(0,-0.4,0)));
      if (hist.length > 1) trail.set(hist);
      return {speed:vel.length(), dist:tgt.distanceTo(pos)};
    }};
  },
  readout:(p,o)=>[['speed', f(o.speed,1)+' studs/s','acc'],['distance to target', f(o.dist,1)]],
  code:(p,o)=>`local MAX_SPEED, MAX_FORCE, SLOW_RADIUS = ${f(p.maxSpeed)}, ${f(p.maxForce)}, ${f(p.slowR)}
local velocity = Vector3.zero

RunService.Heartbeat:Connect(function(dt)
    local offset = (target.Position - npc.Position) * Vector3.new(1, 0, 1)
    local distance = offset.Magnitude
    if distance < 0.01 then return end

    local speed = MAX_SPEED
${p.mode==='arrive' ? `    if distance < SLOW_RADIUS then
        speed = MAX_SPEED * distance / SLOW_RADIUS   -- arrive: ease off near the target
    end
` : ''}    local desired = offset / distance * speed
    local steer = desired - velocity
    if steer.Magnitude > MAX_FORCE then
        steer = steer.Unit * MAX_FORCE
    end

    velocity += steer * dt
    npc.CFrame = CFrame.lookAt(npc.Position + velocity * dt, npc.Position + velocity * dt * 2)
end)`,
  body:`<p>Pointing straight at the target every frame makes movement look robotic: instant turns, instant stops. <b>Steering</b> gives the agent momentum. Work out the velocity you'd <i>like</i> (desired), subtract the velocity you <i>have</i>, and push a limited amount in that direction each frame.</p>
<p>The limit on the push (turning force) is what makes curves: lower it and the agent swings wide like a car. <b>Arrive</b> also shrinks the desired speed inside a radius, so it glides to a stop instead of overshooting and circling. Switch to Seek with the target still to see it orbit.</p>`,
  uses:[`<b>Homing missiles</b> that curve instead of snapping.`,
        `<b>Animals, birds and fish</b> with natural-looking movement.`,
        `<b>Vehicles driven by AI</b> along waypoints.`],
  gotchas:[`Apply the steering with <code>dt</code>, or the agent turns faster at higher frame rates.`,
           `Add more behaviours by summing steering forces: seek the target, flee from danger, separate from neighbours.`]
});
}
})();
