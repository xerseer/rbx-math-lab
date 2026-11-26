(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, vs, CF, G, R, S, T, clamp} = Lab;
const demo = Lab.subject({
  id:'geometry', title:'Geometry & intersections', glyph:'geo', level:'Advanced',
  blurb:'Ray vs sphere, ray vs plane, point in polygon and segment crossings: hit tests without parts or physics.'
});

demo({
  id:'geo-raysphere', title:'Ray vs sphere', short:'solve a quadratic', sig:'b = oc·d,  c = oc·oc − r²,  t = −b ± √(b² − c)',
  view:{theta:0.55, phi:0.95, r:24, ty:3},
  params:[R('r','Sphere radius',0.5,5,0.25,3), R('ay','Aim height',-2,8,0.25,4.2), R('az','Aim sideways',-7,7,0.25,1.5)],
  setup(K){
    const Cn = V(0,3,0), O = V(-11,2,5);
    const sph = K.add(new THREE.Mesh(G.sphere, K.mat('--va',{opacity:0.22}))); sph.position.copy(Cn); K.point('--ink',0.1).position.copy(Cn);
    K.part(V(1,1,1),'--ink',{front:false}).position.copy(O);
    const ray = K.line('--accent'), pe = K.point('--accent',0.2), px = K.point('--vb',0.18), nA = K.arrow('--y',{thick:0.04});
    const foot = K.point('--muted',0.12), perp = K.line('--muted',{dashed:true}), le = K.label('enter','--accent','big'), lx = K.label('exit','--vb'), lf = K.label('','--muted');
    return {update(p){
      sph.scale.setScalar(p.r);
      const A = V(0,p.ay,p.az), d = A.clone().sub(O).normalize(), oc = O.clone().sub(Cn), b = oc.dot(d), c = oc.dot(oc) - p.r*p.r, disc = b*b - c;
      const t0 = -b, F = O.clone().addScaledVector(d, t0), closest = F.distanceTo(Cn);
      foot.position.copy(F); perp.set(F, Cn); lf.at(F.clone().lerp(Cn,0.5).add(V(0,0.4,0))).text(`closest ${f(closest)}`);
      let t1 = null, t2 = null;
      if (disc >= 0){ const s = Math.sqrt(disc); t1 = -b - s; t2 = -b + s; }
      const hit = t1 !== null && t2 > 0;
      ray.set(O, O.clone().addScaledVector(d, hit ? Math.max(t1,0) : 26));
      pe.visible = px.visible = nA.visible = hit; le.show(hit); lx.show(hit);
      if (hit){ const E = O.clone().addScaledVector(d, t1), X = O.clone().addScaledVector(d, t2), n = E.clone().sub(Cn).normalize();
        pe.position.copy(E); px.position.copy(X); nA.set(E, n.multiplyScalar(1.5)); le.at(E.clone().add(V(0,0.6,0))); lx.at(X.clone().add(V(0,-0.5,0))); }
      return {disc, t1, t2, hit, closest, d};
    }};
  },
  readout:(p,o)=>[['closest approach', f(o.closest)+' vs radius '+f(p.r)],['b² − c', f(o.disc,2), o.disc >= 0 ? 'ok' : 'bad'],['enters at t', o.hit ? f(o.t1) : 'miss','acc'],['exits at t', o.hit ? f(o.t2) : '-']],
  code:(p,o)=>`local function raySphere(origin, dir, center, radius)   -- dir must be .Unit
    local oc = origin - center
    local b = oc:Dot(dir)
    local c = oc:Dot(oc) - radius * radius
    local disc = b * b - c
    if disc < 0 then return nil end          -- misses completely
    local s = math.sqrt(disc)
    local t = -b - s                          -- entry distance
    if t < 0 then t = -b + s end             -- started inside: use the exit
    if t < 0 then return nil end             -- sphere is behind the ray
    return t
end

local t = raySphere(eye, aimDir, shield.Position, ${f(p.r)})   --> ${o.hit ? f(o.t1) : 'nil'}
if t then
    local hitPos = eye + aimDir * t
    local normal = (hitPos - shield.Position).Unit
end`,
  body:`<p>A point on the ray is <code>origin + dir * t</code>. It touches the sphere when its distance from the centre equals the radius. Write that out and it becomes a quadratic in <code>t</code>. The part under the square root, <code>b² − c</code>, says everything: negative means a miss, zero means a graze, positive gives two answers, one where the ray enters and one where it leaves.</p>
<p>The dashed line is the ray's closest approach to the centre. It hits exactly when that distance is less than the radius. This is pure maths, with no parts or physics, so you can test thousands of rays against bubbles, shields or planets per frame.</p>`,
  uses:[`<b>Bubble shields and force fields</b> that block bullets.`,
        `<b>Fast hit tests</b> against round enemies or projectiles without real parts.`,
        `<b>Planet games</b>: where does a ray from space hit the surface?`],
  gotchas:[`<code>dir</code> must be a unit vector, or the formula needs an extra term.`,
           `Check for a negative <code>t</code>: the sphere might be behind the ray.`]
});

demo({
  id:'geo-rayplane', title:'Ray vs plane', short:'t = (p0 − o)·n / (d·n)', sig:'t = (planePoint − origin):Dot(n) / dir:Dot(n)',
  view:{theta:0.9, phi:0.95, r:30, ty:2, tz:2},
  params:[R('h','Plane height',0,6,0.25,1), R('tilt','Plane tilt',0,80,1,0,'°'), R('u','Mouse X',0,1,0.01,0.6), R('v','Mouse Y',0,1,0.01,0.62)],
  setup(K){
    const CAM = V(0,10,14), cf = CF.lookAt(CAM, V(0,0,-2)), D = 2.5, hh = D*Math.tan(35*D2R), ww = hh*16/9;
    const cam = new THREE.Group(); K.add(cam); cf.decompose(cam.position, cam.quaternion, V()); K.part(V(1.2,0.8,1),'--ink',{parent:cam});
    const cs = [V(-ww,hh,-D),V(ww,hh,-D),V(ww,-hh,-D),V(-ww,-hh,-D)]; K.line('--accent',{parent:cam, max:5}).set(cs.concat([cs[0]]));
    const plane = K.add(new THREE.Mesh(new THREE.PlaneGeometry(22,22), K.mat('--va',{opacity:0.12, basic:true}))); plane.material.side = THREE.DoubleSide;
    const grid = K.add(new THREE.GridHelper(22,11, C('--va'), C('--va'))); grid.material.transparent = true; grid.material.opacity = 0.4;
    const nA = K.arrow('--y',{thick:0.05}), ray = K.line('--accent'), hp = K.point('--accent',0.22), sp = K.point('--accent',0.1), ghost = K.part(V(2,2,2),'--accent',{front:false, opacity:0.5});
    const lh = K.label('','--accent','big');
    return {update(p){
      const tl = p.tilt*D2R, n = V(0,Math.cos(tl),Math.sin(tl)), P0 = V(0,p.h,0);
      CF.lookAt(P0, P0.clone().sub(n)).decompose(plane.position, plane.quaternion, V()); grid.position.copy(P0); grid.quaternion.setFromUnitVectors(UP, n);
      nA.set(P0, n.clone().multiplyScalar(2.5));
      const S0 = CF.pt(cf, V((p.u*2-1)*ww, (1-2*p.v)*hh, -D)), d = S0.clone().sub(CAM).normalize(); sp.position.copy(S0);
      const denom = d.dot(n), t = Math.abs(denom) < 1e-6 ? null : P0.clone().sub(S0).dot(n)/denom, hit = t !== null && t > 0;
      ray.set(S0, hit ? S0.clone().addScaledVector(d,t) : S0.clone().addScaledVector(d,40)); hp.visible = ghost.visible = hit; lh.show(hit);
      if (hit){ const H = S0.clone().addScaledVector(d,t); hp.position.copy(H); ghost.setCF(CF.mul(CF.lookAt(H.clone().addScaledVector(n,1), H.clone().addScaledVector(n,1).add(V(0,0,-1).sub(n.clone().multiplyScalar(-n.z)).normalize()), n))); lh.at(H.clone().addScaledVector(n,2.6)).text(vs(H)); }
      return {denom, t, hit, n};
    }};
  },
  readout:(p,o)=>[['dir · n', f(o.denom,3), Math.abs(o.denom) < 0.05 ? 'bad' : ''],['t', o.t === null ? 'parallel' : f(o.t,2), o.hit ? 'acc' : 'bad'],['result', o.hit ? 'hits the plane' : (o.t === null ? 'ray runs along the plane' : 'plane is behind the ray')]],
  code:(p,o)=>`local function rayPlane(origin, dir, planePoint, normal)
    local denom = dir:Dot(normal)
    if math.abs(denom) < 1e-6 then return nil end      -- parallel: never meets
    local t = (planePoint - origin):Dot(normal) / denom
    if t < 0 then return nil end                       -- the plane is behind
    return origin + dir * t
end

-- build on an invisible floor ${f(p.h)} studs up, even where there's no part
local mouse = UserInputService:GetMouseLocation()
local ray = camera:ViewportPointToRay(mouse.X, mouse.Y)
local hit = rayPlane(ray.Origin, ray.Direction, Vector3.new(0, ${f(p.h)}, 0), Vector3.new(0, ${f(o.n.y)}, ${f(o.n.z)}))`,
  body:`<p>A plane is a point on it plus a normal. The ray meets it where the distance along the normal runs out: <code>(planePoint − origin)·n</code> is how far away the plane is, measured straight across, and <code>dir·n</code> is how fast the ray closes that gap. Divide one by the other to get <code>t</code>.</p>
<p>If <code>dir·n</code> is zero the ray runs alongside the plane and never touches it; if <code>t</code> is negative the plane is behind. Unlike a raycast, the plane doesn't need to exist as a part, so it works for building floors, water surfaces or a drag plane in mid-air.</p>`,
  uses:[`<b>Building on a level</b> that has no floor part yet, or above the terrain.`,
        `<b>Dragging objects</b> along a plane at the height they started.`,
        `<b>Water surfaces</b>: where does a bullet enter the water?`],
  gotchas:[`Guard the division: a ray almost parallel to the plane gives a huge, useless t.`,
           `The plane is infinite. Clamp or check the hit position if your area has edges.`]
});

const POLY = [[-7,-5],[-1,-6],[2,-2],[7,-5],[6,4],[0,1],[-5,5]];
demo({
  id:'geo-polygon', title:'Point in polygon', short:'count edge crossings', sig:'cast a line to the right; an odd number of crossings means inside',
  view:{theta:0.0, phi:0.35, r:24, ty:0},
  params:[R('px','Player X',-10,10,0.25,-2), R('pz','Player Z',-8,7,0.25,-3)],
  setup(K){
    const shape = new THREE.Shape(POLY.map(([x,z])=>new THREE.Vector2(x,z)));
    const fill = K.add(new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(Math.PI/2), K.mat('--va',{opacity:0.18, basic:true}))); fill.material.side = THREE.DoubleSide; fill.position.y = 0.02;
    K.line('--va',{max:POLY.length+1}).set(POLY.concat([POLY[0]]).map(([x,z])=>V(x,0.05,z)));
    POLY.forEach(([x,z],i)=>K.label(String(i+1),'--va').at(V(x,0.5,z)));
    const pl = K.part(V(0.8,1.6,0.8),'--ok',{front:false}), ray = K.line('--muted',{dashed:true}), marks = POLY.map(()=>K.point('--accent',0.16)), lab = K.label('','--ink','big');
    return {update(p){
      let count = 0; marks.forEach(m=>m.visible = false);
      POLY.forEach(([ax,az],i)=>{ const [bx,bz] = POLY[(i+1)%POLY.length];
        if ((az > p.pz) !== (bz > p.pz)){ const xc = ax + (p.pz - az)*(bx - ax)/(bz - az); if (xc > p.px){ marks[count].visible = true; marks[count].position.set(xc,0.2,p.pz); count++; } } });
      const inside = count % 2 === 1;
      pl.position.set(p.px,0.8,p.pz); pl.tint(inside ? '--ok' : '--bad'); ray.set(V(p.px,0.2,p.pz), V(12,0.2,p.pz));
      lab.at(V(p.px,2.2,p.pz)).text(`${count} crossing${count===1?'':'s'} → ${inside ? 'inside' : 'outside'}`);
      return {count, inside};
    }};
  },
  readout:(p,o)=>[['crossings to the right', String(o.count),'acc'],['odd or even', o.count % 2 ? 'odd' : 'even'],['result', o.inside ? 'inside the zone' : 'outside', o.inside ? 'ok' : 'bad']],
  code:(p,o)=>`-- zone corners on the ground (X, Z), in order around the edge
local ZONE = {
    Vector2.new(-7, -5), Vector2.new(-1, -6), Vector2.new(2, -2), Vector2.new(7, -5),
    Vector2.new(6, 4), Vector2.new(0, 1), Vector2.new(-5, 5),
}

local function isInside(point, polygon)        -- point is a Vector2 (X, Z)
    local inside = false
    local j = #polygon
    for i = 1, #polygon do
        local a, b = polygon[i], polygon[j]
        if (a.Y > point.Y) ~= (b.Y > point.Y) then
            local crossX = a.X + (point.Y - a.Y) * (b.X - a.X) / (b.Y - a.Y)
            if point.X < crossX then
                inside = not inside              -- flip on every crossing
            end
        end
        j = i
    end
    return inside
end

local pos = root.Position
print(isInside(Vector2.new(pos.X, pos.Z), ZONE))   --> ${o.inside}`,
  body:`<p>Boxes and circles are easy to test, but real zones are odd shapes. For any polygon, draw a line from the point out to one side and count how many edges it crosses. Each crossing moves you from outside to inside or back, so an <b>odd</b> count means inside and an <b>even</b> count means outside.</p>
<p>Move the player around the zone, including into the dents on the top and right. The orange dots are the crossings found. It works for any shape whose edges don't cross each other.</p>`,
  uses:[`<b>Irregular zones</b>: shops, safe areas, capture points, biomes.`,
        `<b>Territory games</b> where players draw their own regions.`,
        `<b>Click detection</b> on 2D map shapes in UI.`],
  gotchas:[`Pass the corners in order around the edge (clockwise or anticlockwise), never jumping across.`,
           `Check a quick bounding box first and only run the polygon test when the point is near the zone.`]
});

const cross2 = (ax,az,bx,bz)=>ax*bz - az*bx;
demo({
  id:'geo-segments', title:'Do two lines cross?', short:'2D cross products', sig:'t = (q − p) × s / (r × s),   u = (q − p) × r / (r × s)',
  view:{theta:0.0, phi:0.4, r:24, ty:0},
  params:[R('x1','Player before: X',-10,10,0.25,-3), R('z1','Player before: Z',-8,8,0.25,4), R('x2','Player after: X',-10,10,0.25,1), R('z2','Player after: Z',-8,8,0.25,-3)],
  setup(K){
    const P = [-7,-3], Q = [7,3];
    [P,Q].forEach(([x,z])=>K.part(V(0.6,2.4,0.6),'--part',{front:false}).position.set(x,1.2,z));
    const laser = K.line('--accent'); laser.set(V(P[0],1.4,P[1]), V(Q[0],1.4,Q[1])); K.label('laser fence','--accent','big').at(V(0,2.2,0));
    const mv = K.arrow('--va',{thick:0.05}), a = K.point('--va',0.2), hit = K.point('--bad',0.28), lab = K.label('','--ink','big');
    return {update(p){
      const r = [Q[0]-P[0], Q[1]-P[1]], s = [p.x2-p.x1, p.z2-p.z1], qp = [p.x1-P[0], p.z1-P[1]], den = cross2(r[0],r[1],s[0],s[1]);
      a.position.set(p.x1,0.6,p.z1); mv.set(V(p.x1,0.6,p.z1), V(s[0],0,s[1]));
      let t = null, u = null, crosses = false;
      if (Math.abs(den) > 1e-9){ t = cross2(qp[0],qp[1],s[0],s[1])/den; u = cross2(qp[0],qp[1],r[0],r[1])/den; crosses = t >= 0 && t <= 1 && u >= 0 && u <= 1; }
      hit.visible = crosses; if (crosses) hit.position.set(P[0]+r[0]*t, 1.4, P[1]+r[1]*t);
      lab.at(V(p.x2,1.6,p.z2)).text(crosses ? 'crossed the laser!' : 'safe').color(crosses ? '--bad' : '--ok');
      return {t, u, crosses, den};
    }};
  },
  readout:(p,o)=>[['r × s', f(o.den,2), Math.abs(o.den) < 1e-6 ? 'bad' : ''],['t (along the laser)', o.t === null ? 'parallel' : f(o.t,3)],['u (along the move)', o.u === null ? '-' : f(o.u,3)],['both between 0 and 1?', o.crosses ? 'yes: crossed' : 'no', o.crosses ? 'bad' : 'ok']],
  code:(p,o)=>`local function cross2(a, b)              -- 2D cross product of (X, Z) pairs
    return a.X * b.Y - a.Y * b.X
end

-- does segment p→p+r cross segment q→q+s?
local function segmentsCross(p, r, q, s)
    local denom = cross2(r, s)
    if math.abs(denom) < 1e-9 then return nil end   -- parallel
    local t = cross2(q - p, s) / denom            -- fraction along the first segment
    local u = cross2(q - p, r) / denom            -- fraction along the second
    if t >= 0 and t <= 1 and u >= 0 and u <= 1 then
        return p + r * t                          -- the crossing point
    end
    return nil
end

-- laser from postA to postB, player moved from lastPos to newPos this frame
local flat = function(v) return Vector2.new(v.X, v.Z) end
local hit = segmentsCross(flat(postA), flat(postB - postA), flat(lastPos), flat(newPos - lastPos))
-- right now: ${o.crosses ? 'crossed' : 'nil'}`,
  body:`<p>To know whether a player <b>passed through</b> a line this frame, test whether their movement (from last position to new position) crosses it. Write both as "start plus fraction times direction" and solve for the two fractions with 2D cross products.</p>
<p><code>t</code> says how far along the laser the crossing is and <code>u</code> how far along the move. Only when <b>both</b> are between 0 and 1 do the two pieces actually meet; otherwise the lines would only cross if you extended them. Drag the player's start and end across the fence.</p>`,
  uses:[`<b>Laser fences and trip wires</b> that can't be skipped at high speed.`,
        `<b>Swipe-to-cut</b>: did the swipe cross the rope?`,
        `<b>2D maps</b>: does a path cross a wall or a border?`],
  gotchas:[`If <code>r × s</code> is zero the lines are parallel (or on top of each other) and there's no single crossing point.`,
           `This is 2D. For walls in 3D, use a raycast or a ray-plane test instead.`]
});
})();
