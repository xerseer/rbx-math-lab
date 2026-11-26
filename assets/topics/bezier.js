(function(){
"use strict";
const {THREE, V, D2R, f, v3, vs, lookOf, CF, R, S, T} = Lab;
const demo = Lab.subject({
  id:'bezier', title:'Bézier curves', glyph:'curve',
  blurb:'Smooth curves built from lerps. Thrown items, homing missiles, cameras and paths.'
});

const quad = (p0,p1,p2,t)=>p0.clone().lerp(p1,t).lerp(p1.clone().lerp(p2,t),t);
function cubic(p0,p1,p2,p3,t){ const u=1-t; return p0.clone().multiplyScalar(u*u*u).add(p1.clone().multiplyScalar(3*u*u*t)).add(p2.clone().multiplyScalar(3*u*t*t)).add(p3.clone().multiplyScalar(t*t*t)); }
function cubicTan(p0,p1,p2,p3,t){ const u=1-t; return p1.clone().sub(p0).multiplyScalar(3*u*u).add(p2.clone().sub(p1).multiplyScalar(6*u*t)).add(p3.clone().sub(p2).multiplyScalar(3*t*t)); }
const ping = t=>0.5-0.5*Math.cos(t*0.9);

demo({
  id:'bz-quad', title:'Quadratic: a lerp of lerps', short:'3 points', sig:'a = p0:Lerp(p1, t);  b = p1:Lerp(p2, t);  a:Lerp(b, t)', time:true,
  view:{theta:0.3, phi:1.1, r:20, ty:3},
  params:[R('cx','Control X',-6,6,0.5,0), R('cy','Control height',0,9,0.5,7), R('cz','Control Z',-8,6,0.5,-2), R('t','t',0,1,0.01,0.35), T('anim','Animate t',true)],
  setup(K){
    const P0 = V(-6,1,3), P2 = V(6,1,3);
    K.point('--va',0.24).position.copy(P0); K.point('--vb',0.24).position.copy(P2);
    const P1m = K.point('--muted',0.24), poly = K.line('--muted',{dashed:true, max:3}), curve = K.line('--accent',{max:81});
    const pa = K.point('--va',0.14), pb = K.point('--vb',0.14), ab = K.line('--z'), res = K.point('--accent',0.3);
    const trail = K.line('--accent',{max:81});
    K.label('p0','--va','big').at(P0.clone().add(V(0,0.6,0))); K.label('p2','--vb','big').at(P2.clone().add(V(0,0.6,0)));
    const lc = K.label('p1 (control)','--muted','big'), la = K.label('a','--va'), lb = K.label('b','--vb'), lr = K.label('','--accent','big');
    return {update(p,t){
      const P1 = V(p.cx,p.cy,p.cz), tt = p.anim ? ping(t) : p.t;
      P1m.position.copy(P1); poly.set(P0,P1,P2); lc.at(P1.clone().add(V(0,0.6,0)));
      const pts=[]; for(let i=0;i<=80;i++) pts.push(quad(P0,P1,P2,i/80)); curve.set(pts);
      curve.material.opacity = 0.35; curve.material.transparent = true;
      const n = Math.max(1, Math.round(tt*80)); trail.set(pts.slice(0, n+1));
      const A = P0.clone().lerp(P1,tt), B = P1.clone().lerp(P2,tt), Pt = A.clone().lerp(B,tt);
      pa.position.copy(A); pb.position.copy(B); ab.set(A,B); res.position.copy(Pt);
      la.at(A.clone().add(V(0,0.45,0))); lb.at(B.clone().add(V(0,0.45,0))); lr.at(Pt.clone().add(V(0,-0.6,0))).text(`t = ${f(tt)}`);
      return {P1, tt, Pt};
    }};
  },
  readout:(p,o)=>[['t', f(o.tt)],['point', vs(o.Pt),'acc']],
  code:(p,o)=>`local function quadBezier(p0, p1, p2, t)
    local a = p0:Lerp(p1, t)
    local b = p1:Lerp(p2, t)
    return a:Lerp(b, t)
end

local p0 = Vector3.new(-6, 1, 3)
local p1 = ${v3(o.P1)}   -- control point: pulls the curve, never touched
local p2 = Vector3.new(6, 1, 3)

print(quadBezier(p0, p1, p2, ${f(o.tt)}))   --> ${vs(o.Pt)}`,
  body:`<p>A Bézier curve is built entirely out of lerps. With three points: lerp from p0 toward p1 to get <b>a</b>, lerp from p1 toward p2 to get <b>b</b>, then lerp between a and b. Use the same <code>t</code> each time. As t runs from 0 to 1, that last point draws the curve.</p>
<p>The middle point is the <b>control point</b>. The curve starts at p0, ends at p2, and bends toward p1 without passing through it. Lift the control point higher and the arc gets taller. Watch the blue line between a and b: it always touches the curve at the orange point.</p>`,
  uses:[`<b>Thrown items and lobbed grenades</b> that land exactly on a target.`,
        `<b>Coins flying to the UI</b> or loot flying into a chest on a pleasing arc.`,
        `<b>Simple curved paths</b> for cutscene cameras and moving platforms.`],
  gotchas:[`t is not distance. The point moves faster where the curve is stretched. See "Moving along a curve".`,
           `Keep t between 0 and 1. Outside that range the curve keeps going and leaves your points behind.`]
});

demo({
  id:'bz-cubic', title:'Cubic: two control points', short:'4 points', sig:'u³·p0 + 3u²t·p1 + 3ut²·p2 + t³·p3   (u = 1 − t)', time:true,
  view:{theta:0.35, phi:1.05, r:22, ty:2.5},
  params:[R('h1','p1 height',0,9,0.5,7), R('z1','p1 Z',-8,6,0.5,-4), R('h2','p2 height',0,9,0.5,1), R('z2','p2 Z',-8,8,0.5,7), R('t','t',0,1,0.01,0.5), T('anim','Animate t',true)],
  setup(K){
    const P0 = V(-7,1,2), P3 = V(7,1,2);
    K.point('--va',0.24).position.copy(P0); K.point('--vb',0.24).position.copy(P3);
    const m1 = K.point('--muted',0.22), m2 = K.point('--muted',0.22), poly = K.line('--muted',{dashed:true, max:4}), curve = K.line('--accent',{max:101, opacity:0.35});
    const l1 = K.line('--va',{opacity:0.7, max:3}), l2 = K.line('--z'), lv1 = [0,1,2].map(()=>K.point('--va',0.1)), lv2 = [0,1].map(()=>K.point('--z',0.12)), res = K.point('--accent',0.3);
    K.label('p0','--va','big').at(P0.clone().add(V(0,0.6,0))); K.label('p3','--vb','big').at(P3.clone().add(V(0,0.6,0)));
    const t1 = K.label('p1','--muted','big'), t2 = K.label('p2','--muted','big'), lr = K.label('','--accent','big');
    return {update(p,t){
      const P1 = V(-3.5,p.h1,p.z1), P2 = V(3.5,p.h2,p.z2), tt = p.anim ? ping(t) : p.t;
      m1.position.copy(P1); m2.position.copy(P2); poly.set(P0,P1,P2,P3); t1.at(P1.clone().add(V(0,0.6,0))); t2.at(P2.clone().add(V(0,0.6,0)));
      const pts=[]; for(let i=0;i<=100;i++) pts.push(cubic(P0,P1,P2,P3,i/100)); curve.set(pts);
      const a = P0.clone().lerp(P1,tt), b = P1.clone().lerp(P2,tt), c = P2.clone().lerp(P3,tt), d = a.clone().lerp(b,tt), e = b.clone().lerp(c,tt), Pt = d.clone().lerp(e,tt);
      [a,b,c].forEach((q,i)=>lv1[i].position.copy(q)); [d,e].forEach((q,i)=>lv2[i].position.copy(q)); l1.set(a,b,c); l2.set(d,e); res.position.copy(Pt);
      lr.at(Pt.clone().add(V(0,-0.6,0))).text(`t = ${f(tt)}`);
      return {P1,P2,tt,Pt};
    }};
  },
  readout:(p,o)=>[['t', f(o.tt)],['point', vs(o.Pt),'acc']],
  code:(p,o)=>`local function cubicBezier(p0, p1, p2, p3, t)
    local u = 1 - t
    return p0 * u^3 + p1 * (3 * u^2 * t) + p2 * (3 * u * t^2) + p3 * t^3
end

local p0 = Vector3.new(-7, 1, 2)
local p1 = ${v3(o.P1)}
local p2 = ${v3(o.P2)}
local p3 = Vector3.new(7, 1, 2)

print(cubicBezier(p0, p1, p2, p3, ${f(o.tt)}))   --> ${vs(o.Pt)}`,
  body:`<p>A cubic curve has <b>two</b> control points, so it can bend in two directions and make S-shapes. It's the same trick one level deeper: three lerps (teal), then two lerps of those (blue), then one more (orange).</p>
<p>The formula in the code is what all those lerps add up to, written out so it runs faster. The curve leaves p0 heading toward p1 and arrives at p3 coming from p2. Set p1 high and p2 low and you get an S.</p>
<p>This is the curve type most tools use, including Roblox's own path and animation editors.</p>`,
  uses:[`<b>Camera rails</b> for cutscenes and menu fly-throughs.`,
        `<b>Roller coasters and race tracks</b>: chain several cubics end to end.`,
        `<b>Homing missiles</b> that launch sideways and then curve onto the target.`],
  gotchas:[`To chain curves smoothly, make the control points on either side of a joint line up in a straight line through it.`,
           `<code>u^3</code> works on numbers, not vectors. Multiply the vector by the number: <code>p0 * u^3</code>.`]
});

demo({
  id:'bz-follow', title:'Moving along a curve', short:'tangent + even speed', sig:'CFrame.lookAt(pos, pos + tangent)   ·   distance table → t', time:true,
  view:{theta:0.2, phi:0.75, r:28, ty:1},
  params:[S('mode','Move by',[['t','t (uneven speed)'],['dist','distance (even speed)']],'t'), R('speed','Speed',2,14,1,7,' studs/s'), T('dots','Show 20 evenly spaced steps',true)],
  setup(K){
    const P0 = V(-10,0.6,6), P1 = V(-10,0.6,-9), P2 = V(10,3,10), P3 = V(10,0.6,-6);
    const N = 400, pts = [], lens = [0]; let L = 0;
    for (let i=0;i<=N;i++){ pts.push(cubic(P0,P1,P2,P3,i/N)); if (i>0){ L += pts[i].distanceTo(pts[i-1]); lens.push(L); } }
    const tAt = d=>{ d = Math.max(0, Math.min(L, d)); let lo=0, hi=N; while (hi-lo>1){ const m=(lo+hi)>>1; if (lens[m] < d) lo = m; else hi = m; } const a=lens[lo], b=lens[hi]; return (lo + (b>a ? (d-a)/(b-a) : 0))/N; };
    K.line('--muted',{max:N+1}).set(pts);
    const dots = Array.from({length:21}, ()=>K.point('--va',0.13));
    const cart = K.part(V(1.2,0.8,2)); const tanA = K.arrow('--z',{thick:0.04});
    const lc = K.label('','--accent','big'); lc.attach = {obj:cart, local:V(0,1.2,0)};
    return {update(p,t){
      for (let i=0;i<=20;i++){ const tt = p.mode==='t' ? i/20 : tAt(i/20*L); dots[i].position.copy(cubic(P0,P1,P2,P3,tt)); dots[i].visible = p.dots; }
      const s = (t*p.speed) % L; const tt = p.mode==='t' ? s/L : tAt(s);
      const pos = cubic(P0,P1,P2,P3,tt), tan = cubicTan(P0,P1,P2,P3,tt);
      cart.setCF(CF.lookAt(pos.clone().add(V(0,0.4,0)), pos.clone().add(V(0,0.4,0)).add(tan)));
      tanA.set(pos.clone().add(V(0,0.9,0)), tan.clone().normalize().multiplyScalar(2.2));
      const actual = p.mode==='t' ? tan.length()/L*p.speed : p.speed;
      lc.text(`${f(actual,1)} studs/s`);
      return {tt, actual, L};
    }};
  },
  readout:(p,o)=>[['t', f(o.tt)],['actual speed', f(o.actual,1)+' studs/s', p.mode==='t'?'bad':'ok'],['curve length', f(o.L,1)+' studs']],
  code:(p,o)=>p.mode==='t' ? `-- naive: move t at a steady rate (speed changes along the curve!)
local LENGTH = ${f(o.L,1)}
local t = (os.clock() * ${f(p.speed)} / LENGTH) % 1

local pos = cubicBezier(p0, p1, p2, p3, t)
local tangent = (p1 - p0) * (3 * (1 - t)^2) + (p2 - p1) * (6 * (1 - t) * t) + (p3 - p2) * (3 * t^2)
cart.CFrame = CFrame.lookAt(pos, pos + tangent)   -- face along the curve` : `-- build a distance table once
local SAMPLES, lengths, total = 100, {0}, 0
local prev = p0
for i = 1, SAMPLES do
    local point = cubicBezier(p0, p1, p2, p3, i / SAMPLES)
    total += (point - prev).Magnitude
    lengths[i + 1] = total
    prev = point
end   -- total ≈ ${f(o.L,1)}

local function tAtDistance(d)
    for i = 2, #lengths do
        if lengths[i] >= d then
            local a, b = lengths[i - 1], lengths[i]
            return (i - 2 + (d - a) / (b - a)) / SAMPLES
        end
    end
    return 1
end

local t = tAtDistance((os.clock() * ${f(p.speed)}) % total)   -- even speed
local pos = cubicBezier(p0, p1, p2, p3, t)
cart.CFrame = CFrame.lookAt(pos, pos + tangent(t))`,
  body:`<p>Two problems appear as soon as something rides a curve. First, <b>which way should it face?</b> The tangent (the curve's direction at that point) answers it, and <code>CFrame.lookAt(pos, pos + tangent)</code> points the cart along the track.</p>
<p>Second, <b>t is not distance</b>. In "t" mode the 20 teal dots are equal steps of t: they bunch up on tight sections and spread out on long ones, and the cart speeds up and slows down to match. Switch to "distance": we measure the curve once, store a table of lengths, and look up the t for each distance. The dots spread evenly and the speed holds steady.</p>`,
  uses:[`<b>Trains, carts and moving platforms</b> that should travel at a constant speed.`,
        `<b>Cutscene cameras</b> that shouldn't lurch on tight bends.`,
        `<b>Spacing objects evenly</b> along a curved fence, track or rope.`],
  gotchas:[`The tangent can be zero if a control point sits on top of an end point. Nudge it, or fall back to the previous direction.`,
           `Build the distance table once when the curve is created, not every frame.`]
});

demo({
  id:'bz-throw', title:'Arcs for throws and homing', short:'control = midpoint + height', sig:'p1 = (p0 + p2) / 2 + Vector3.new(0, height, 0)', time:true,
  view:{theta:0.05, phi:0.95, r:24, ty:2},
  params:[S('mode','Style',[['lob','Lob (grenade)'],['homing','Homing missile']],'lob'), R('tx','Target X',-2,10,0.5,7), R('tz','Target Z',-7,7,0.5,-2), R('height','Arc height',0,12,0.5,6), R('yaw','Launcher facing (homing)',-180,180,5,90,'°')],
  setup(K){
    const L = V(-8,1.5,0);
    const launcher = K.part(V(1.4,1.4,2)); const tg = K.ring(0.9,'--vb',{y:0.04}), tg2 = K.ring(0.45,'--vb',{y:0.04});
    const curve = K.line('--accent',{max:81, opacity:0.5}), poly = K.line('--muted',{dashed:true, max:3}), ctl = K.point('--muted',0.2);
    const proj = K.point('--accent',0.32), lc = K.label('control point','--muted'), lt = K.label('target','--vb');
    return {update(p,t){
      const T = V(p.tx,0.3,p.tz); tg.position.set(T.x,0,T.z); tg2.position.set(T.x,0,T.z); lt.at(T.clone().add(V(0,0.6,0)));
      let P1, face;
      if (p.mode==='lob'){ P1 = L.clone().add(T).multiplyScalar(0.5).add(V(0,p.height,0)); face = T.clone().sub(L).setY(0); }
      else { face = lookOf(p.yaw*D2R); P1 = L.clone().add(face.clone().multiplyScalar(L.distanceTo(T)*0.6 + 2)).add(V(0,p.height*0.5,0)); }
      launcher.setCF(CF.lookAt(L, L.clone().add(face)));
      const pts=[]; for (let i=0;i<=80;i++) pts.push(quad(L,P1,T,i/80)); curve.set(pts); poly.set(L,P1,T); ctl.position.copy(P1); lc.at(P1.clone().add(V(0,0.55,0)));
      const tt = Math.min(1, (t*0.55) % 1.35); proj.position.copy(quad(L,P1,T,tt)); proj.visible = tt < 1;
      return {P1, T};
    }};
  },
  readout:(p,o)=>[['control point', vs(o.P1),'acc'],['lands at', vs(o.T)]],
  code:(p,o)=>`local function quadBezier(p0, p1, p2, t)
    return p0:Lerp(p1, t):Lerp(p1:Lerp(p2, t), t)
end

local p0 = launcher.Position
local p2 = target.Position
${p.mode==='lob' ? `local p1 = (p0 + p2) / 2 + Vector3.new(0, ${f(p.height)}, 0)   -- above the midpoint` : `-- launch the way the launcher faces, then curve onto the target
local p1 = p0 + launcher.CFrame.LookVector * ((p2 - p0).Magnitude * 0.6 + 2)
    + Vector3.new(0, ${f(p.height*0.5)}, 0)`}

local FLIGHT_TIME = 1.2
local start = os.clock()
while true do
    local t = (os.clock() - start) / FLIGHT_TIME
    if t >= 1 then break end
    projectile.Position = quadBezier(p0, p1, p2, t)
    RunService.Heartbeat:Wait()
end
explode(p2)   -- always lands exactly on the target`,
  body:`<p>Physics-based throws are hard to aim: you have to solve for a launch speed and angle. A Bézier arc skips that. Put the start and end where you want them and a control point above the middle. The projectile is guaranteed to land on the target, and the height slider sets how tall the arc is.</p>
<p>Switch to <b>homing</b>: the control point goes out in front of the launcher instead. The missile leaves the way the launcher faces, then curves round onto the target. Turn the launcher away and watch it swing wide.</p>`,
  uses:[`<b>Grenades, spells and thrown items</b> that must hit an aimed spot.`,
        `<b>Homing projectiles</b>: update p2 each frame to chase a moving target.`,
        `<b>Collect animations</b>: coins arcing from the world into a UI counter.`],
  gotchas:[`This motion ignores gravity and walls. For hits along the way, raycast from the last position to the new one each frame.`,
           `Moving by t gives uneven speed on lopsided arcs. Fine for short throws; use a distance table for long paths.`]
});

function catmull(p0,p1,p2,p3,t){
  const t2=t*t, t3=t2*t;
  return p1.clone().multiplyScalar(2).add(p2.clone().sub(p0).multiplyScalar(t))
    .add(p0.clone().multiplyScalar(2).sub(p1.clone().multiplyScalar(5)).add(p2.clone().multiplyScalar(4)).sub(p3).multiplyScalar(t2))
    .add(p1.clone().multiplyScalar(3).sub(p0).sub(p2.clone().multiplyScalar(3)).add(p3).multiplyScalar(t3)).multiplyScalar(0.5);
}

demo({
  id:'bz-catmull', title:'Curves through points: Catmull-Rom', short:'passes through every waypoint', sig:'0.5 * (2p1 + (p2 − p0)t + (2p0 − 5p1 + 4p2 − p3)t² + (3p1 − p0 − 3p2 + p3)t³)', time:true,
  view:{theta:0.2, phi:0.8, r:25, ty:1},
  params:[R('mx','Move waypoint 3: X',-3,3,0.25,0), R('mz','Move waypoint 3: Z',-6,6,0.25,3), R('my','Move waypoint 3: height',0,6,0.25,1), T('loop','Closed loop',false)],
  setup(K){
    const base = [V(-9,1,2), V(-4.5,3,-4), V(0,1,3), V(4.5,4,-3), V(9,1,2)];
    const dots = base.map(()=>K.point('--va',0.24)), labs = base.map((_,i)=>K.label(String(i+1),'--va','big'));
    const poly = K.line('--muted',{dashed:true, max:6}), curve = K.line('--accent',{max:6*40+1}), cart = K.part(V(1,0.7,1.6));
    return {update(p,t){
      const P = base.map(q=>q.clone()); P[2] = V(p.mx, p.my, p.mz);
      P.forEach((q,i)=>{ dots[i].position.copy(q); labs[i].at(q.clone().add(V(0,0.6,0))); });
      poly.set(p.loop ? P.concat([P[0]]) : P);
      const n = P.length, segs = p.loop ? n : n-1, at = i=>p.loop ? P[(i+n)%n] : P[Math.max(0, Math.min(n-1, i))];
      const pts = []; for (let s=0;s<segs;s++) for (let k=0;k<(s===segs-1?41:40);k++) pts.push(catmull(at(s-1),at(s),at(s+1),at(s+2),k/40));
      curve.set(pts);
      const u = (t*0.12) % 1, fs = u*segs, s = Math.floor(fs), lt = fs - s;
      const pos = catmull(at(s-1),at(s),at(s+1),at(s+2),lt), ahead = catmull(at(s-1),at(s),at(s+1),at(s+2),Math.min(1,lt+0.02));
      if (lt > 0.98) ahead.copy(catmull(at(s),at(s+1),at(s+2),at(s+3),0.02));
      cart.setCF(CF.lookAt(pos, ahead.distanceTo(pos) > 1e-4 ? ahead : pos.clone().add(V(0,0,-1))));
      return {P, segs};
    }};
  },
  readout:(p,o)=>[['waypoints', String(o.P.length)],['segments', String(o.segs),'acc'],['waypoint 3', vs(o.P[2])]],
  code:(p,o)=>`local function catmullRom(p0, p1, p2, p3, t)
    return 0.5 * ((2 * p1) + (p2 - p0) * t
        + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ^ 2
        + (3 * p1 - p0 - 3 * p2 + p3) * t ^ 3)
end

local points = { ${o.P.map(q=>`Vector3.new(${f(q.x)}, ${f(q.y)}, ${f(q.z)})`).join(',\n                 ')} }

-- position on segment i (from points[i] to points[i + 1])
local function sample(i, t)
    local n = #points
    local function at(k)
${p.loop ? `        return points[(k - 1) % n + 1]          -- wrap around: closed loop` : `        return points[math.clamp(k, 1, n)]     -- repeat the ends: open path`}
    end
    return catmullRom(at(i - 1), at(i), at(i + 1), at(i + 2), t)
end`,
  body:`<p>Bézier curves bend <i>toward</i> their control points without touching them. Often you want the opposite: a smooth path that goes <b>through</b> every waypoint you place. A Catmull-Rom spline does that. Each section between two waypoints uses the points on either side to decide which way to curve.</p>
<p>Drag waypoint 3 around and watch only the nearby sections change. Turn on the closed loop to join the last point back to the first, for laps and patrols.</p>`,
  uses:[`<b>Patrol and race routes</b> drawn by dropping parts in a folder.`,
        `<b>Camera paths</b> through a list of viewpoints for intros and cutscenes.`,
        `<b>Smoothing</b> a jagged pathfinding result into a natural walking line.`],
  gotchas:[`An open path needs extra points past the ends. Repeating the first and last point, as in the code, is the usual fix.`,
           `Like Bézier, equal steps of t aren't equal distances. Use a distance table for constant speed.`]
});

demo({
  id:'bz-chain', title:'Chaining curves smoothly', short:'mirror the handles', sig:'outHandle = joint + (joint − inHandle)',
  view:{theta:0.0, phi:0.55, r:24, ty:1}, time:true,
  params:[T('mirror','Keep handles in line',true), R('ang','Handle direction',-80,80,5,30,'°'), R('lin','In-handle length',1,6,0.25,3.5), R('lout','Out-handle length',1,6,0.25,3.5), R('kink','Out-handle turn (when not in line)',-120,120,5,70,'°')],
  setup(K){
    const A0 = V(-10,1,0), A1 = V(-7,1,-6), B2 = V(7,1,6), B3 = V(10,1,0), J = V(0,1,0);
    [A0,B3].forEach(q=>K.point('--va',0.22).position.copy(q)); K.point('--ink',0.26).position.copy(J);
    K.point('--muted',0.16).position.copy(A1); K.point('--muted',0.16).position.copy(B2);
    const h1 = K.point('--vb',0.2), h2 = K.point('--vb',0.2), hl = K.line('--vb',{max:3}), cA = K.line('--accent',{max:61}), cB = K.line('--va',{max:61});
    const sideA = K.line('--muted',{dashed:true}), sideB = K.line('--muted',{dashed:true});
    const cart = K.part(V(1,0.7,1.6)); K.label('joint','--ink','big').at(J.clone().add(V(0,0.7,0)));
    const li = K.label('in handle','--vb'), lo = K.label('out handle','--vb');
    return {update(p,t){
      const d = lookOf(-Math.PI/2 + p.ang*D2R), H1 = J.clone().addScaledVector(d, -p.lin);
      const d2 = p.mirror ? d : lookOf(-Math.PI/2 + (p.ang + p.kink)*D2R), H2 = J.clone().addScaledVector(d2, p.lout);
      h1.position.copy(H1); h2.position.copy(H2); hl.set(H1, J, H2); sideA.set(A0, A1); sideB.set(B2, B3);
      li.at(H1.clone().add(V(0,0.5,0))); lo.at(H2.clone().add(V(0,0.5,0)));
      const pa=[], pb=[]; for (let i=0;i<=60;i++){ pa.push(cubic(A0,A1,H1,J,i/60)); pb.push(cubic(J,H2,B2,B3,i/60)); } cA.set(pa); cB.set(pb);
      const u = (t*0.15) % 2, onA = u < 1, tt = onA ? u : u-1;
      const pos = onA ? cubic(A0,A1,H1,J,tt) : cubic(J,H2,B2,B3,tt), tan = onA ? cubicTan(A0,A1,H1,J,tt) : cubicTan(J,H2,B2,B3,tt);
      cart.setCF(CF.lookAt(pos.clone().setY(1.4), pos.clone().setY(1.4).add(tan)));
      const tEnd = cubicTan(A0,A1,H1,J,1).normalize(), tStart = cubicTan(J,H2,B2,B3,0).normalize();
      return {snap: Math.acos(Math.max(-1,Math.min(1,tEnd.dot(tStart))))/D2R, H1, H2};
    }};
  },
  readout:(p,o)=>[['direction jump at joint', f(o.snap,1)+'°', o.snap < 0.5 ? 'ok' : 'bad'],['in handle', vs(o.H1)],['out handle', vs(o.H2),'acc']],
  code:(p,o)=>`-- segment A: a0, a1, inHandle, joint      segment B: joint, outHandle, b2, b3
local inHandle = ${`Vector3.new(${f(o.H1.x)}, ${f(o.H1.y)}, ${f(o.H1.z)})`}
${p.mirror ? `local outHandle = joint + (joint - inHandle).Unit * ${f(p.lout)}   -- same line, any length` : `local outHandle = ${`Vector3.new(${f(o.H2.x)}, ${f(o.H2.y)}, ${f(o.H2.z)})`}   -- not in line: a kink of ${f(o.snap,0)}°`}

local function pathPoint(u)   -- u from 0 to 2 across both segments
    if u < 1 then
        return cubicBezier(a0, a1, inHandle, joint, u)
    end
    return cubicBezier(joint, outHandle, b2, b3, u - 1)
end`,
  body:`<p>Long paths are made from several curves joined end to end. Where two meet, the curve heading in and the curve heading out each have a handle at the joint. If those handles point in <b>opposite directions along one line</b>, the path flows straight through. If not, there's a corner.</p>
<p>Untick "keep handles in line" and turn the out-handle: the cart snaps round at the joint, and the readout shows by how much. Tick it again and the corner disappears, even when the two handles have different lengths.</p>`,
  uses:[`<b>Roller coasters and tracks</b> built from many segments.`,
        `<b>Road and river tools</b> in plugins or building games.`,
        `<b>Long camera moves</b> without a jolt between shots.`],
  gotchas:[`Equal handle lengths also keep the speed smooth across the joint. Different lengths keep the direction but change the pace.`,
           `If you want a sharp corner on purpose, like a hairpin, break the line deliberately.`]
});

{
const {UP, G, C} = Lab;

demo({
  id:'bz-closest', title:'Closest point on a curve', short:'sample, then refine', sig:'sample t = 0…1, keep the nearest, then narrow in around it',
  view:{theta:0.4, phi:0.8, r:24, ty:2},
  params:[R('px','Player X',-10,10,0.25,2), R('py','Player height',0,7,0.25,4.5), R('pz','Player Z',-8,8,0.25,2), R('snap','Grind snap distance',0.5,5,0.25,2.5)],
  setup(K){
    const P0 = V(-10,2,4), P1 = V(-3,6,-9), P2 = V(3,-1,9), P3 = V(10,3,-3);
    const pts = []; for (let i=0;i<=120;i++) pts.push(cubic(P0,P1,P2,P3,i/120)); K.line('--ink',{max:121}).set(pts);
    const tube = K.line('--accent',{max:121, opacity:0.35}); tube.set(pts.map(q=>q.clone().add(V(0,0.05,0))));
    const sampleDots = Array.from({length:11}, (_,i)=>{ const m = K.point('--muted',0.08); m.position.copy(cubic(P0,P1,P2,P3,i/10)); return m; });
    const pl = K.part(V(0.9,1.8,0.9),'--va',{front:false}), cp = K.point('--accent',0.2), dl = K.line('--ink',{dashed:true}), ghost = K.part(V(0.9,1.8,0.9),'--accent',{front:false, opacity:0.4});
    const lt = K.label('','--accent','big'), lp = K.label('','--va');
    return {update(p){
      const P = V(p.px,p.py,p.pz); let best = 0, bd = Infinity;
      for (let i=0;i<=50;i++){ const d = cubic(P0,P1,P2,P3,i/50).distanceToSquared(P); if (d < bd){ bd = d; best = i/50; } }
      let lo = Math.max(0,best-0.02), hi = Math.min(1,best+0.02);
      for (let k=0;k<30;k++){ const a = lo+(hi-lo)/3, b = hi-(hi-lo)/3; if (cubic(P0,P1,P2,P3,a).distanceToSquared(P) < cubic(P0,P1,P2,P3,b).distanceToSquared(P)) hi = b; else lo = a; }
      const t = (lo+hi)/2, Cp = cubic(P0,P1,P2,P3,t), d = Cp.distanceTo(P), grind = d <= p.snap;
      pl.position.copy(P); cp.position.copy(Cp); dl.set(P, Cp); ghost.visible = grind; if (grind) ghost.setCF(CF.lookAt(Cp.clone().add(V(0,0.9,0)), Cp.clone().add(V(0,0.9,0)).add(cubicTan(P0,P1,P2,P3,t))));
      lt.at(Cp.clone().add(V(0,-0.6,0))).text(`t = ${f(t,3)}`); lp.at(P.clone().add(V(0,1.4,0))).text(grind ? `grinding (${f(d)} away)` : `${f(d)} studs away`);
      return {t, d, grind, Cp};
    }};
  },
  readout:(p,o)=>[['closest t', f(o.t,3),'acc'],['distance', f(o.d)],['grind?', o.grind ? 'yes, snap onto the rail' : 'no', o.grind ? 'ok' : '']],
  code:(p,o)=>`local function closestT(point, p0, p1, p2, p3)
    -- 1. coarse search: try 51 evenly spaced values of t
    local bestT, bestDist = 0, math.huge
    for i = 0, 50 do
        local t = i / 50
        local d = (cubicBezier(p0, p1, p2, p3, t) - point).Magnitude
        if d < bestDist then bestT, bestDist = t, d end
    end
    -- 2. refine: narrow the window around the best guess
    local lo, hi = math.max(0, bestT - 0.02), math.min(1, bestT + 0.02)
    for _ = 1, 30 do
        local a, b = lo + (hi - lo) / 3, hi - (hi - lo) / 3
        if (cubicBezier(p0, p1, p2, p3, a) - point).Magnitude < (cubicBezier(p0, p1, p2, p3, b) - point).Magnitude then
            hi = b
        else
            lo = a
        end
    end
    return (lo + hi) / 2
end

local t = closestT(root.Position, p0, p1, p2, p3)   --> ${f(o.t,3)}
local railPoint = cubicBezier(p0, p1, p2, p3, t)
if (railPoint - root.Position).Magnitude < ${f(p.snap)} then
    startGrinding(t)
end`,
  body:`<p>There's no neat formula for the closest point on a Bézier curve, so games search for it. First try a handful of t values spread along the curve (the grey dots) and keep the nearest. Then zoom in around that guess, cutting the window down until it's precise.</p>
<p>The result is a t value, which tells you both <i>where</i> on the curve the player is and <i>how far along</i> it they are. Move the player close enough and they snap onto the rail, facing along it.</p>`,
  uses:[`<b>Rail grinding and ziplines</b> on curved paths.`,
        `<b>Race progress</b> on a curved track: t says who's ahead.`,
        `<b>Keeping a camera or NPC</b> on a path while the player steers.`],
  gotchas:[`If the curve loops back near itself, the coarse search can pick the wrong part. Use more samples for twisty curves.`,
           `Search every frame from the last t instead of from scratch, to keep it fast and stop it jumping between nearby sections.`]
});

demo({
  id:'bz-offset', title:'Offsetting a curve: roads', short:'tangent × up = sideways', sig:'right = tangent:Cross(Vector3.yAxis).Unit   ·   edge = point ± right × width/2',
  view:{theta:0.15, phi:0.7, r:26, ty:0},
  params:[R('width','Road width',1,6,0.25,3.5), R('bend','Bendiness',0,12,0.5,8), T('posts','Fence posts',true)],
  setup(K){
    const N = 80, geo = new THREE.BufferGeometry(), pos = new Float32Array((N+1)*2*3), idx = [];
    for (let i=0;i<N;i++){ const a=i*2, b=a+1, c=a+2, d=a+3; idx.push(a,b,c, b,d,c); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3)); geo.setIndex(idx);
    const road = K.add(new THREE.Mesh(geo, K.mat('--part'))); road.material.side = THREE.DoubleSide; road.frustumCulled = false;
    const eL = K.line('--ink',{max:N+1}), eR = K.line('--ink',{max:N+1}), mid = K.line('--accent',{dashed:true, max:N+1});
    const posts = Array.from({length:60}, ()=>{ const m = K.add(new THREE.Mesh(G.box, K.mat('--vb'))); m.scale.set(0.25,1,0.25); return m; });
    const ra = K.arrow('--x',{thick:0.05}), ta = K.arrow('--z',{thick:0.05}), lr = K.label('right','--x'), ltn = K.label('tangent','--z');
    return {update(p){
      const P0 = V(-11,0.05,3), P1 = V(-4,0.05,3-p.bend), P2 = V(4,0.05,3+p.bend), P3 = V(11,0.05,-1);
      const centre = [], left = [], right = []; let len = 0, prev = null; const cum = [];
      for (let i=0;i<=N;i++){ const t=i/N, c = cubic(P0,P1,P2,P3,t), tan = cubicTan(P0,P1,P2,P3,t), r = tan.clone().cross(UP).normalize();
        const L = c.clone().addScaledVector(r,-p.width/2), Rr = c.clone().addScaledVector(r,p.width/2);
        centre.push(c); left.push(L); right.push(Rr); [L,Rr].forEach((q,k)=>{ const j=(i*2+k)*3; pos[j]=q.x; pos[j+1]=q.y; pos[j+2]=q.z; });
        if (prev) len += c.distanceTo(prev); cum.push(len); prev = c; }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
      eL.set(left.map(q=>q.clone().setY(0.08))); eR.set(right.map(q=>q.clone().setY(0.08))); mid.set(centre.map(q=>q.clone().setY(0.09)));
      let used = 0;
      if (p.posts){ for (let d=0; d<=len && used < 60; d+=3){ let i = cum.findIndex(c=>c>=d); if (i<0) i = N; [left[i], right[i]].forEach(q=>{ if (used<60){ posts[used].position.set(q.x,0.5,q.z); posts[used].visible = true; used++; } }); } }
      for (let i=used;i<60;i++) posts[i].visible = false;
      const k = 30, c = centre[k], tan = cubicTan(P0,P1,P2,P3,k/N).normalize(), r = tan.clone().cross(UP).normalize();
      ra.set(c.clone().setY(0.4), r.clone().multiplyScalar(2)); ta.set(c.clone().setY(0.4), tan.clone().multiplyScalar(2));
      lr.at(c.clone().setY(0.4).addScaledVector(r,2.4)); ltn.at(c.clone().setY(0.4).addScaledVector(tan,2.5));
      return {len, posts:used};
    }};
  },
  readout:(p,o)=>[['road length', f(o.len,1)+' studs','acc'],['fence posts', String(o.posts)]],
  code:(p,o)=>`local SEGMENTS, WIDTH = 40, ${f(p.width)}

for i = 0, SEGMENTS - 1 do
    local t0, t1 = i / SEGMENTS, (i + 1) / SEGMENTS
    local a = cubicBezier(p0, p1, p2, p3, t0)
    local b = cubicBezier(p0, p1, p2, p3, t1)

    local piece = Instance.new("Part")
    piece.Anchored = true
    piece.Size = Vector3.new(WIDTH, 0.2, (b - a).Magnitude + 0.05)
    piece.CFrame = CFrame.lookAt((a + b) / 2, b)     -- lies along the curve
    piece.Parent = workspace.Road

    -- road edges for fences, kerbs or barriers:
    local right = (b - a):Cross(Vector3.yAxis).Unit
    local leftEdge, rightEdge = a - right * WIDTH / 2, a + right * WIDTH / 2
end`,
  body:`<p>To give a curve some width, you need a <b>sideways</b> direction at every point. Take the tangent (which way the curve is heading), cross it with world up, and you get a vector pointing to the right of the road. Step half the width each way and you have the two edges.</p>
<p>Fill between the edges and you have a road surface. Place parts along the edges at even distances for fences, lights or barriers. Increase the bendiness and watch the inside of tight corners: that's where offset curves start to pinch.</p>`,
  uses:[`<b>Road, river and rail builders</b> for tracks and maps.`,
        `<b>Fences, lamp posts and kerbs</b> placed along a path.`,
        `<b>Racing lines and lane markings.</b>`],
  gotchas:[`On a very tight bend with a wide road, the inner edge folds over itself. Limit the width or soften the curve.`,
           `For hills, use the curve's own up direction instead of world up, or the road tilts strangely on slopes.`]
});
}

{
const {UP} = Lab;
const smooth = u=>u*u*(3-2*u);
function trackPoints(N){ const pts = [], k = 2.2, a = 1, b = 2.1, w = 2.2, lead = Math.round(N*0.15), loop = N - 2*lead;
  const at = th=>V(k*(a*th - b*Math.sin(th)), 1 + k*b*(1+Math.cos(th)), w*th/Math.PI);
  const s0 = at(-Math.PI), s1 = at(Math.PI);
  for (let i=0;i<lead;i++) pts.push(V(s0.x - 9 + 9*i/lead, s0.y, s0.z));
  for (let i=0;i<=loop;i++) pts.push(at(-Math.PI + 2*Math.PI*i/loop));
  for (let i=1;i<=lead;i++) pts.push(V(s1.x + 9*i/lead, s1.y, s1.z));
  return pts; }

demo({
  id:'bz-frame', adv:true, title:'Tracks with loops: twist-free frames', short:'rotation-minimising frames', sig:'carry "up" along the curve by double reflection, instead of tangent × worldUp', time:true,
  view:{theta:0.55, phi:1.15, r:26, ty:4},
  params:[S('mode','Up vector',[['rmf','Rotation-minimising (carried along)'],['naive','tangent × world up']],'rmf'), R('speed','Cart speed',0.02,0.2,0.01,0.07)],
  setup(K){
    const P = trackPoints(240), N = P.length - 1, Tn = [];
    for (let i=0;i<=N;i++){ const a = P[Math.max(0,i-1)], b = P[Math.min(N,i+1)]; Tn.push(b.clone().sub(a).normalize()); }
    const rmf = [], naive = [];
    let r = Tn[0].clone().cross(UP).cross(Tn[0]).normalize().negate(); if (r.y < 0) r.negate(); rmf.push(r.clone());
    for (let i=0;i<N;i++){
      const v1 = P[i+1].clone().sub(P[i]), c1 = v1.dot(v1); if (c1 < 1e-12){ rmf.push(rmf[i].clone()); continue; }
      const rL = rmf[i].clone().sub(v1.clone().multiplyScalar(2/c1*v1.dot(rmf[i]))), tL = Tn[i].clone().sub(v1.clone().multiplyScalar(2/c1*v1.dot(Tn[i])));
      const v2 = Tn[i+1].clone().sub(tL), c2 = v2.dot(v2); rmf.push(c2 < 1e-12 ? rL : rL.sub(v2.multiplyScalar(2/c2*v2.dot(rL))).normalize());
    }
    for (let i=0;i<=N;i++){ const right = Tn[i].clone().cross(UP); const u = right.length() < 1e-3 ? V(0,1,0) : right.normalize().cross(Tn[i]).normalize(); naive.push(u); }
    K.line('--ink',{max:N+1}).set(P);
    const ups = Array.from({length:40}, ()=>K.arrow('--y',{thick:0.03})), cart = K.part(V(1.4,0.6,2));
    const lab = K.label('','--ink','big');
    let jump = {rmf:0, naive:0}; for (let i=0;i<N;i++){ jump.rmf = Math.max(jump.rmf, rmf[i].angleTo(rmf[i+1])); jump.naive = Math.max(jump.naive, naive[i].angleTo(naive[i+1])); }
    return {update(p,t){
      const ups_ = p.mode==='rmf' ? rmf : naive;
      ups.forEach((a,k)=>{ const i = Math.round(k/39*N); a.set(P[i], ups_[i].clone().multiplyScalar(1.1)); });
      const s = (t*p.speed) % 1, i = Math.round(s*N), up = ups_[i];
      cart.setCF(CF.lookAt(P[i].clone().addScaledVector(up,0.45), P[i].clone().addScaledVector(up,0.45).add(Tn[i]), up));
      lab.at(P[i].clone().addScaledVector(up,1.6)).text(p.mode==='rmf' ? 'smooth' : (ups_[i].y < 0.2 && P[i].y > 2 ? 'flipping!' : ''));
      let top = 0; P.forEach((q,j)=>{ if (q.y > P[top].y) top = j; }); return {jump:jump[p.mode], topUp:ups_[top].y};
    }};
  },
  readout:(p,o)=>[['up at the top of the loop', o.topUp < 0 ? 'points down into the loop (correct)' : 'points up: cart rides on the outside!', o.topUp < 0 ? 'ok' : 'bad'],['biggest twist between samples', f(o.jump*180/Math.PI,1)+'°']],
  code:(p,o)=>`-- carry an "up" vector along sampled points P[i] with tangents T[i]
local up = { (T[1]:Cross(Vector3.yAxis)):Cross(T[1]).Unit * -1 }

for i = 1, #P - 1 do
    local v1 = P[i + 1] - P[i]
    local c1 = v1:Dot(v1)
    local rL = up[i] - v1 * (2 / c1 * v1:Dot(up[i]))      -- reflect across the step
    local tL = T[i] - v1 * (2 / c1 * v1:Dot(T[i]))
    local v2 = T[i + 1] - tL
    local c2 = v2:Dot(v2)
    up[i + 1] = (rL - v2 * (2 / c2 * v2:Dot(rL))).Unit     -- reflect again to match the new tangent
end

cart.CFrame = CFrame.lookAt(P[i], P[i] + T[i], up[i])`,
  body:`<p>On flat tracks, "up" is easy: cross the tangent with world up. But at the top of a loop the track points straight up or down, that cross product collapses, and the cart <b>flips</b> or spins. Switch to the naive mode and watch the green up-arrows at the loop.</p>
<p>A <b>rotation-minimising frame</b> doesn't use world up at all. It starts with a sensible up at the beginning and carries it along the curve, turning it only as much as the curve forces it to. The double-reflection method in the code does this with two mirror steps per sample, and it gets through loops and corkscrews without a twist.</p>`,
  uses:[`<b>Roller coasters</b> with loops and corkscrews.`,
        `<b>Tubes, ropes and cables</b> built from parts along a 3D curve.`,
        `<b>Flying cameras</b> along 3D paths without the horizon spinning.`],
  gotchas:[`Build the frames once from the sampled curve, not every frame.`,
           `On a closed loop the last up may not match the first. Spread the leftover twist evenly along the track.`]
});
}
})();
