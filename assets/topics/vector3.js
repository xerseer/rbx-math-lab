(function(){
"use strict";
const {V, f, v3, vs, R, S, T} = Lab;
const demo = Lab.subject({
  id:'vector3', title:'Vector3 basics', glyph:'vector',
  blurb:'Positions, offsets, distance and direction. The building blocks every other topic uses.'
});

demo({
  id:'vec-new', title:'Vector3.new', short:'Vector3.new(x, y, z)', sig:'Vector3.new(x, y, z)  →  Vector3',
  view:{theta:0.75, phi:1.05, r:17, ty:1},
  params:[R('x','X',-6,6,0.5,3), R('y','Y',0,6,0.5,2), R('z','Z',-6,6,0.5,-2)],
  setup(K){
    const ar = K.arrow('--accent'), pt = K.point('--accent',0.13);
    const l1 = K.line('--muted',{dashed:true}), l2 = K.line('--x',{dashed:true}), l3 = K.line('--z',{dashed:true});
    const lab = K.label('','--accent','big');
    return {update(p){
      const v = V(p.x,p.y,p.z), foot = V(p.x,0,p.z);
      ar.set(V(), v); pt.position.copy(v);
      l1.set(v, foot); l2.set(foot, V(p.x,0,0)); l3.set(foot, V(0,0,p.z));
      lab.at(v.clone().add(V(0,0.5,0))).text(`v ${vs(v)}`);
      return {mag:v.length()};
    }};
  },
  readout:(p,o)=>[['v.Magnitude', f(o.mag)+' studs','acc']],
  code:(p,o)=>`local v = Vector3.new(${f(p.x)}, ${f(p.y)}, ${f(p.z)})

part.Position = v            -- put a part at that spot
print(v.X, v.Y, v.Z)         --> ${f(p.x)}  ${f(p.y)}  ${f(p.z)}
print(v.Magnitude)           --> ${f(o.mag)}  (length of the arrow)`,
  body:`<p>A <code>Vector3</code> is three numbers: X, Y and Z. Every position in your game is one, and so is every direction, velocity and size.</p>
<p>The same three numbers can mean <b>a point</b> ("the spot at 3, 2, −2") or <b>an arrow</b> ("move 3 right, 2 up, 2 forward"). The arrow in the view starts at the world origin, so here both readings land on the same spot.</p>
<p>Move the sliders and follow the dashed lines. X slides along the red axis, Z along the blue axis, and Y lifts the point straight up.</p>`,
  uses:[`<b>Placing things.</b> <code>part.Position = Vector3.new(0, 10, 0)</code> puts a part 10 studs above the origin.`,
        `<b>Sizes.</b> <code>part.Size</code> is a Vector3 too: width, height, depth.`,
        `<b>Velocity.</b> <code>part.AssemblyLinearVelocity = Vector3.new(0, 50, 0)</code> launches something upward at 50 studs per second.`],
  gotchas:[`Vectors can't be changed in place. <code>v.X = 5</code> errors. Build a new one instead: <code>Vector3.new(5, v.Y, v.Z)</code>.`,
           `Ready-made constants save typing: <code>Vector3.zero</code>, <code>Vector3.one</code>, <code>Vector3.xAxis</code>, <code>Vector3.yAxis</code>, <code>Vector3.zAxis</code>.`,
           `<code>Magnitude</code> is the arrow's length, worked out as √(x² + y² + z²).`]
});

demo({
  id:'vec-sub', title:'Subtraction: A to B', short:'target - origin', sig:'B - A  →  Vector3 (an offset)',
  view:{theta:0.6, phi:1.0, r:19, ty:1},
  params:[R('ax','A.X',-6,6,0.5,-4), R('az','A.Z',-6,6,0.5,3), R('bx','B.X',-6,6,0.5,4), R('by','B.Y',0,6,0.5,3), R('bz','B.Z',-6,6,0.5,-3)],
  setup(K){
    const fa = K.arrow('--va',{opacity:0.35, thick:0.035}), fb = K.arrow('--vb',{opacity:0.35, thick:0.035});
    const pa = K.point('--va',0.22), pb = K.point('--vb',0.22), d = K.arrow('--accent',{thick:0.07});
    const la = K.label('A','--va','big'), lb = K.label('B','--vb','big'), ld = K.label('B − A','--accent','big');
    return {update(p){
      const A = V(p.ax,1,p.az), B = V(p.bx,p.by,p.bz), off = B.clone().sub(A);
      fa.set(V(),A); fb.set(V(),B); pa.position.copy(A); pb.position.copy(B); d.set(A, off);
      la.at(A.clone().add(V(0,0.55,0))); lb.at(B.clone().add(V(0,0.55,0)));
      ld.at(A.clone().lerp(B,0.5).add(V(0,0.5,0))).text(`B − A = ${vs(off)}`);
      return {A,B,off,dist:off.length()};
    }};
  },
  readout:(p,o)=>[['offset', vs(o.off),'acc'],['distance', f(o.dist)+' studs']],
  code:(p,o)=>`local A = ${v3(o.A)}   -- where I am
local B = ${v3(o.B)}   -- where I want to go

local offset = B - A                --> ${vs(o.off)}
local distance = offset.Magnitude   --> ${f(o.dist)}

-- A + offset lands exactly on B
-- in a game: local toEnemy = enemy.Position - player.Position`,
  body:`<p>To get the arrow that points <b>from A to B</b>, subtract: <code>B - A</code>. A good way to remember it: <i>where I want to go, minus where I am.</i></p>
<p>The result is an <b>offset</b>, not a place. Its length is the distance between the two points and its direction is the way to travel. Add it back to A and you land on B.</p>
<p>The faint arrows are A and B measured from the origin. The orange arrow is what's left when you subtract them.</p>`,
  uses:[`<b>Aiming.</b> The direction a bullet should fly is <code>target.Position - gun.Position</code>.`,
        `<b>Knockback.</b> Push a player away from an explosion with <code>player.Position - explosion.Position</code>. It points away from the blast.`,
        `<b>NPC chasing.</b> Every frame, the chase direction is <code>player.Position - npc.Position</code>.`],
  gotchas:[`<code>A - B</code> points the opposite way from <code>B - A</code>. If something flies backwards, swap the order.`,
           `Adding two positions together rarely means anything. You add a position and an offset.`]
});

demo({
  id:'vec-scale', title:'Scaling and flattening', short:'v * n,  v * Vector3.new(1, 0, 1)', sig:'v * number  ·  v * Vector3  (per component)  ·  v / number',
  view:{theta:0.8, phi:1.0, r:17, ty:1.5},
  params:[R('x','X',-6,6,0.5,4), R('y','Y',0,6,0.5,3), R('z','Z',-6,6,0.5,-2), R('s','Scale',-2,3,0.25,1.5)],
  setup(K){
    const a = K.arrow('--va',{thick:0.045}), b = K.arrow('--accent',{thick:0.07}), fl = K.arrow('--vb',{thick:0.05}), drop = K.line('--muted',{dashed:true});
    const la = K.label('v','--va'), lb = K.label('','--accent','big'), lf = K.label('v * (1, 0, 1)','--vb');
    return {update(p){
      const v = V(p.x,p.y,p.z), sv = v.clone().multiplyScalar(p.s), flat = V(p.x,0,p.z);
      a.set(V(),v); b.set(V(),sv); fl.set(V(),flat); drop.set(v, flat);
      la.at(v.clone().add(V(0,0.45,0))); lb.at(sv.clone().add(V(0,0.5,0))).text(`v * ${f(p.s)}`); lf.at(flat.clone().add(V(0,-0.45,0)));
      return {v, sv, flat};
    }};
  },
  readout:(p,o)=>[['v.Magnitude', f(o.v.length())],['(v * '+f(p.s)+').Magnitude', f(o.sv.length()),'acc'],['flat', vs(o.flat)]],
  code:(p,o)=>`local v = ${v3(o.v)}

local scaled = v * ${f(p.s)}                  --> ${vs(o.sv)}
local half = v / 2                     --> ${vs(o.v.clone().multiplyScalar(0.5))}
local flat = v * Vector3.new(1, 0, 1)  --> ${vs(o.flat)}  (height removed)

-- camera-relative movement that doesn't point into the floor:
local forward = (camera.CFrame.LookVector * Vector3.new(1, 0, 1)).Unit`,
  body:`<p>Multiplying a vector by a number scales its length and keeps its direction. Times 2 doubles it, times 0.5 halves it, and a <b>negative</b> number flips it to point the other way. Drag the scale below zero and watch the orange arrow swing round.</p>
<p>Multiplying by another <code>Vector3</code> works <b>component by component</b>: X times X, Y times Y, Z times Z. Multiplying by <code>(1, 0, 1)</code> keeps X and Z and zeroes Y. That flattens any vector onto the ground (the pink arrow).</p>`,
  uses:[`<b>Knockback strength</b>: <code>direction * force</code>, bigger for heavier hits.`,
        `<b>Camera-relative WASD</b>: flatten the camera's LookVector so players don't walk into the floor when looking down.`,
        `<b>Growing and shrinking parts</b>: <code>part.Size = baseSize * 1.5</code>.`],
  gotchas:[`<code>a * b</code> with two vectors is per component, not the dot product. Use <code>a:Dot(b)</code> for that.`,
           `Flattening a vector that points straight up or down gives <code>Vector3.zero</code>, and its <code>.Unit</code> is NaN. Check the magnitude first.`]
});

demo({
  id:'vec-mag', title:'Magnitude: distance checks', short:'(a - b).Magnitude', sig:'(a - b).Magnitude  →  number',
  view:{theta:0.5, phi:0.85, r:24, ty:0},
  params:[R('tx','Enemy X',-12,12,0.5,6), R('tz','Enemy Z',-12,12,0.5,-4), R('range','Range',2,12,0.5,8,' studs')],
  setup(K){
    const pl = K.part(V(1.6,2,1.2)); pl.position.set(0,1,0);
    const disc = K.disc('--accent',0.12); let ring = null, ringR = -1;
    const en = K.part(V(1,1.6,1),'--bad',{front:false}); const ln = K.line('--muted',{dashed:true});
    const ld = K.label('','--ink','big'); K.label('player','--muted').at(V(0,2.5,0));
    return {update(p){
      if (ringR !== p.range){ K.drop(ring); ring = K.ring(p.range,'--accent',{y:0.03}); ringR = p.range; }
      disc.scale.setScalar(p.range); disc.position.y = 0.01;
      en.position.set(p.tx,0.8,p.tz);
      const dist = V(p.tx,1,p.tz).distanceTo(V(0,1,0)); const inR = dist <= p.range;
      en.tint(inR ? '--ok' : '--bad');
      ln.set(V(0,1,0), V(p.tx,1,p.tz));
      ld.at(V(p.tx/2,1.5,p.tz/2)).text(`${f(dist)} studs`);
      return {dist, inR};
    }};
  },
  readout:(p,o)=>[['distance', f(o.dist)+' studs'],['range', f(p.range)+' studs'],['result', o.inR?'in range':'out of range', o.inR?'ok':'bad']],
  code:(p,o)=>`local RANGE = ${f(p.range)}

local distance = (enemy.Position - player.Position).Magnitude
--> ${f(o.dist)}

if distance <= RANGE then
    -- ${o.inR ? 'true right now: ' : 'false right now. '}attack, show the prompt, start chasing...
end`,
  body:`<p>Subtract two positions to get the offset between them, then take <code>.Magnitude</code> to get how long it is. That number is the distance in studs.</p>
<p>Comparing that distance to a number is the most common check in game code: "is the player close enough?" The orange circle is the range. The enemy turns green when it is inside.</p>`,
  uses:[`<b>Aggro radius.</b> An NPC starts chasing once <code>distance &lt; 40</code>.`,
        `<b>Server checks.</b> When a client fires a RemoteEvent saying "I hit that chest", check the distance on the server so exploiters can't loot from across the map.`,
        `<b>Pickups and doors.</b> Open the door when anyone is within 8 studs.`],
  gotchas:[`Magnitude counts height too. For distance along the ground only, flatten Y first: <code>((a - b) * Vector3.new(1, 0, 1)).Magnitude</code>.`,
           `Checking many objects every frame gets slow. <code>workspace:GetPartBoundsInRadius(pos, r)</code> finds everything nearby for you.`,
           `<code>player:DistanceFromCharacter(pos)</code> is a shortcut for the distance from a player's character.`]
});

demo({
  id:'vec-unit', title:'Unit: direction only', short:'.Unit * speed', sig:'v.Unit  →  Vector3 with length 1',
  view:{theta:0.7, phi:1.0, r:17, ty:1.5},
  params:[R('tx','Target X',-8,8,0.5,6), R('ty','Target Y',0,7,0.5,4), R('tz','Target Z',-8,8,0.5,-5), R('speed','Speed',1,10,0.5,4,' studs/s')],
  setup(K){
    const O = V(0,1,0);
    K.wsphere(1,'--muted',0.22).position.copy(O);
    const off = K.line('--vb',{dashed:true}), tg = K.point('--vb',0.22), gun = K.point('--va',0.2); gun.position.copy(O);
    const vel = K.arrow('--va',{thick:0.035}), unit = K.arrow('--accent',{thick:0.09});
    const lt = K.label('target','--vb'), lu = K.label('.Unit  (length 1)','--accent','big'), lv = K.label('','--va');
    return {update(p){
      const T = V(p.tx,p.ty,p.tz), o = T.clone().sub(O), u = o.clone().normalize(), v = u.clone().multiplyScalar(p.speed);
      tg.position.copy(T); off.set(O,T); vel.set(O,v); unit.set(O,u);
      lt.at(T.clone().add(V(0,0.5,0))); lu.at(O.clone().add(u.clone().multiplyScalar(0.55)).add(V(0,-0.45,0)));
      lv.at(O.clone().add(v).add(V(0,0.4,0))).text(`.Unit * ${f(p.speed)}`);
      return {o, u, v, len:o.length()};
    }};
  },
  readout:(p,o)=>[['offset length', f(o.len)],['.Unit', vs(o.u),'acc'],['velocity', vs(o.v)]],
  code:(p,o)=>`local offset = target.Position - gun.Position   -- length ${f(o.len)}
local direction = offset.Unit      --> ${vs(o.u)}, length 1

local SPEED = ${f(p.speed)}
bullet.AssemblyLinearVelocity = direction * SPEED
-- the bullet moves ${f(p.speed)} studs/s toward the target, however far away it is`,
  body:`<p><code>.Unit</code> keeps a vector's direction and sets its length to exactly 1. It answers "which way?" and throws away "how far?".</p>
<p>A length-1 direction is useful because you can multiply it by any speed or distance you want. The wire ball is the unit sphere: every <code>.Unit</code> vector ends on its surface. Move the target far away and the orange arrow stays the same length.</p>`,
  uses:[`<b>Projectiles.</b> <code>direction * speed</code> gives a velocity that doesn't depend on how far away the target is.`,
        `<b>Moving at a fixed pace.</b> Each frame: <code>npc.Position += direction * walkSpeed * dt</code>.`,
        `<b>Placing at a set distance.</b> Put a marker 3 studs toward the target: <code>origin + direction * 3</code>.`],
  gotchas:[`<code>Vector3.zero.Unit</code> is NaN (not a number), which breaks anything it touches. When two positions can be equal, check <code>offset.Magnitude &gt; 0</code> first.`,
           `Without <code>.Unit</code>, a far target makes the bullet faster. That's the classic "my projectile speed changes with distance" bug.`]
});

demo({
  id:'vec-lerp', title:'Lerp: in-between points', short:'a:Lerp(b, t)', sig:'a:Lerp(b, alpha)  →  Vector3', time:true,
  view:{theta:0.55, phi:1.05, r:18, ty:2},
  params:[R('t','alpha',0,1,0.01,0.3), T('anim','Animate alpha',false)],
  setup(K){
    const A = V(-5,1,3), B = V(5,4,-3);
    K.line('--muted',{dashed:true}).set(A,B);
    K.point('--va',0.22).position.copy(A); K.point('--vb',0.22).position.copy(B);
    [0.25,0.5,0.75].forEach(s=>K.point('--muted',0.07).position.copy(A.clone().lerp(B,s)));
    const m = K.point('--accent',0.3);
    K.label('A (alpha 0)','--va','big').at(A.clone().add(V(0,0.6,0))); K.label('B (alpha 1)','--vb','big').at(B.clone().add(V(0,0.6,0)));
    K.label('0.5','--muted').at(A.clone().lerp(B,0.5).add(V(0,-0.4,0)));
    const lm = K.label('','--accent','big');
    return {update(p,t){
      const a = p.anim ? 0.5-0.5*Math.cos(t*1.2) : p.t; const P = A.clone().lerp(B,a);
      m.position.copy(P); lm.at(P.clone().add(V(0,0.65,0))).text(`A:Lerp(B, ${f(a)})`);
      return {A,B,P,a};
    }};
  },
  readout:(p,o)=>[['alpha', f(o.a)],['result', vs(o.P),'acc']],
  code:(p,o)=>`local A = ${v3(o.A)}
local B = ${v3(o.B)}

local point = A:Lerp(B, ${f(p.t)})    --> ${vs(V(-5,1,3).lerp(V(5,4,-3),p.t))}
-- same as: A + (B - A) * ${f(p.t)}

-- smooth follow, every frame (see math › Smooth follow for why):
RunService.Heartbeat:Connect(function(dt)
    pet.Position = pet.Position:Lerp(goal, 1 - math.exp(-8 * dt))
end)`,
  body:`<p>Lerp means <b>linear interpolation</b>: picking a point part of the way along a straight line. Alpha 0 gives A, alpha 1 gives B, 0.5 gives the midpoint.</p>
<p>The formula is short enough to remember: <code>A + (B - A) * alpha</code>. Take the offset from A to B, scale it down, and add it back to A.</p>
<p>Lerping lerps is how Bézier curves work. Once this clicks, see the Bézier curves subject.</p>`,
  uses:[`<b>Midpoints.</b> Put a beam or a health bar halfway between two players with <code>a:Lerp(b, 0.5)</code>.`,
        `<b>Smooth following.</b> Lerp a little toward the goal every frame and the follower eases in. Pets, cameras and floating UI all do this.`,
        `<b>Progress in 3D.</b> Show how far a payload has travelled along a path.`],
  gotchas:[`Lerping by a fixed amount like 0.1 every frame runs faster at high frame rates. Use <code>1 - math.exp(-speed * dt)</code> as the alpha.`,
           `Alpha outside 0 to 1 still works and goes past the ends. Clamp it if that matters.`,
           `<code>Vector3:Lerp</code> moves in a straight line only. For position and rotation together, use <code>CFrame:Lerp</code>.`]
});

demo({
  id:'vec-moveto', title:'Move toward without overshooting', short:'math.min(speed * dt, distance)', sig:'current + offset.Unit * math.min(speed * dt, offset.Magnitude)', time:true,
  view:{theta:0.2, phi:0.75, r:22, ty:0},
  params:[R('speed','Speed',2,60,1,30,' studs/s'), S('fps','Frame rate',[['60','60 FPS'],['20','20 FPS'],['8','8 FPS (lag spike)']],'8'), R('tx','Goal X',-8,10,0.5,6), R('tz','Goal Z',-8,8,0.5,-3), T('naive','Show the naive version',true)],
  setup(K){
    const S0 = V(-8,0.6,4), goal = K.ring(0.7,'--vb',{y:0.04}), good = K.part(V(1,1.2,1),'--accent',{front:false}), bad = K.part(V(1,1.2,1),'--bad',{front:false, opacity:0.75});
    K.point('--muted',0.15).position.copy(S0); K.label('start','--muted').at(S0.clone().add(V(0,-0.5,0)));
    const lg = K.label('goal','--vb'), l1 = K.label('math.min version','--accent'), l2 = K.label('naive','--bad');
    return {update(p,t){
      const G0 = V(p.tx,0.6,p.tz), step = 1/(+p.fps), tau = t % 3, n = Math.floor(tau/step);
      const gp = S0.clone(), bp = S0.clone(); let bounce = 0;
      for (let i=0;i<n;i++){
        const og = G0.clone().sub(gp), dg = og.length(), sg = p.speed*step; if (dg <= sg) gp.copy(G0); else gp.addScaledVector(og, sg/dg);
        const ob = G0.clone().sub(bp), db = ob.length(); if (db > 1e-6){ const before = db; bp.addScaledVector(ob, p.speed*step/db); if (bp.distanceTo(G0) > 1e-6 && G0.clone().sub(bp).dot(ob) < 0) bounce = before; }
      }
      goal.position.set(G0.x,0,G0.z); lg.at(G0.clone().add(V(0,-0.6,0)));
      good.position.copy(gp); bad.position.copy(bp); bad.visible = p.naive; l2.show(p.naive);
      l1.at(gp.clone().add(V(0,1.1,0))); l2.at(bp.clone().add(V(0,-0.9,0)));
      return {gapG:gp.distanceTo(G0), gapB:bp.distanceTo(G0), stepLen:p.speed*step};
    }};
  },
  readout:(p,o)=>[['step per frame', f(o.stepLen)+' studs'],['math.min version', o.gapG < 1e-3 ? 'arrived' : f(o.gapG)+' to go','acc'], ...(p.naive?[['naive version', o.gapB < 1e-3 ? 'arrived' : `${f(o.gapB)} off (overshooting)`, o.gapB < 1e-3 ? '' : 'bad']]:[])],
  code:(p,o)=>`local function moveTowards(current, goal, maxStep)
    local offset = goal - current
    local distance = offset.Magnitude
    if distance <= maxStep then
        return goal                     -- close enough: land exactly on it
    end
    return current + offset / distance * maxStep
end

RunService.Heartbeat:Connect(function(dt)
    npc.Position = moveTowards(npc.Position, goal, ${f(p.speed)} * dt)
end)

-- naive: npc.Position += (goal - npc.Position).Unit * ${f(p.speed)} * dt
-- at ${p.fps} FPS each step is ${f(o.stepLen)} studs, so it jumps past the goal and bounces`,
  body:`<p>Moving at a fixed speed toward a goal looks simple: add <code>direction * speed * dt</code> every frame. But on the last frame the step is usually longer than the distance left, so the object jumps <b>past</b> the goal. Next frame it turns round and jumps back. It never settles.</p>
<p>The fix is to cap the step at the remaining distance with <code>math.min</code>, or to snap to the goal once you're within one step. Drop the frame rate to 8 FPS and raise the speed: the red block jitters around the ring, the orange one lands and stops.</p>`,
  uses:[`<b>NPC walking and patrols</b> without Humanoid:MoveTo.`,
        `<b>Moving platforms and elevators</b> that must stop exactly at each floor.`,
        `<b>UI bars</b> that count toward a value at a fixed rate.`],
  gotchas:[`Comparing positions with <code>==</code> almost never works with decimals. Check <code>distance &lt;= step</code> or use <code>a:FuzzyEq(b, 0.01)</code>.`,
           `Low frame rates make steps longer, so bugs like this show up on slow phones first.`]
});

demo({
  id:'vec-bounds', title:'Bounding boxes: Min and Max', short:'lo:Min(p), hi:Max(p)', sig:'a:Min(b)  ·  a:Max(b)  →  per-component smallest / largest',
  view:{theta:0.6, phi:0.85, r:24, ty:1},
  params:[R('seed','Points (seed)',1,40,1,6), R('tx','Test point X',-9,9,0.5,2), R('ty','Test point Y',0,6,0.5,1.5), R('tz','Test point Z',-9,9,0.5,1)],
  setup(K){
    const box = K.add(new Lab.THREE.LineSegments(Lab.G.edges, new Lab.THREE.LineBasicMaterial({color:Lab.C('--accent')})));
    const pts = Array.from({length:6}, ()=>K.point('--va',0.2)), lo = K.point('--x',0.16), hi = K.point('--y',0.16), tp = K.point('--ok',0.26);
    const llo = K.label('lo','--x','big'), lhi = K.label('hi','--y','big'), lt = K.label('','--ink');
    return {update(p){
      const rng = Lab.mulberry32(p.seed*131); const P = pts.map(()=>V((rng()*2-1)*7, rng()*5+0.3, (rng()*2-1)*6));
      let a = P[0].clone(), b = P[0].clone(); P.forEach((q,i)=>{ pts[i].position.copy(q); a.min(q); b.max(q); });
      box.scale.copy(b.clone().sub(a)); box.position.copy(a.clone().add(b).multiplyScalar(0.5));
      lo.position.copy(a); hi.position.copy(b); llo.at(a.clone().add(V(0,-0.5,0))); lhi.at(b.clone().add(V(0,0.5,0)));
      const T = V(p.tx,p.ty,p.tz), inside = T.x>=a.x && T.x<=b.x && T.y>=a.y && T.y<=b.y && T.z>=a.z && T.z<=b.z;
      tp.position.copy(T); tp.material.color.copy(Lab.C(inside?'--ok':'--bad')); lt.at(T.clone().add(V(0,0.55,0))).text(inside?'inside':'outside');
      return {a, b, inside};
    }};
  },
  readout:(p,o)=>[['lo', vs(o.a)],['hi', vs(o.b)],['size', vs(o.b.clone().sub(o.a)),'acc'],['test point', o.inside?'inside':'outside', o.inside?'ok':'bad']],
  code:(p,o)=>`local lo, hi = points[1], points[1]
for _, point in points do
    lo = lo:Min(point)     -- smallest X, Y and Z seen so far
    hi = hi:Max(point)     -- largest X, Y and Z seen so far
end
--> lo ${vs(o.a)}, hi ${vs(o.b)}

local size = hi - lo
local center = (lo + hi) / 2
zone.Size, zone.Position = size, center       -- a part that wraps every point

local function isInside(p)
    return p.X >= lo.X and p.X <= hi.X
       and p.Y >= lo.Y and p.Y <= hi.Y
       and p.Z >= lo.Z and p.Z <= hi.Z
end
print(isInside(${v3(V(p.tx,p.ty,p.tz))}))   --> ${o.inside}`,
  body:`<p><code>a:Min(b)</code> takes the smaller X, the smaller Y and the smaller Z of two vectors, each on its own. <code>Max</code> takes the larger ones. Run them over a list of points and you end up with two corners, <b>lo</b> and <b>hi</b>, of the smallest box that holds them all.</p>
<p>From the corners you get the box's size (<code>hi - lo</code>) and centre (<code>(lo + hi) / 2</code>), and checking whether a point is inside is six comparisons. Change the seed to scatter new points, and move the test point in and out.</p>`,
  uses:[`<b>Zones from markers</b>: build a region part that wraps a set of spawn points.`,
        `<b>Camera framing</b>: fit the camera to show every player in a party.`,
        `<b>Quick inside checks</b> for areas aligned to the world axes.`],
  gotchas:[`This box is always lined up with the world axes. For a rotated area, convert the point with <code>zone.CFrame:PointToObjectSpace(p)</code> and compare against half the size.`,
           `For models, <code>model:GetBoundingBox()</code> returns a CFrame and a size for you.`]
});

{
const {V, f, v3, vs, R, S, T, CF, mulberry32} = Lab;

demo({
  id:'vec-avg', title:'Averages: the centre of a group', short:'sum / count', sig:'(a + b + c) / 3   ·   weighted: Σ(p × w) / Σw',
  view:{theta:0.4, phi:0.75, r:26, ty:0},
  params:[R('n','Players',2,6,1,5), R('seed','Positions (seed)',1,50,1,9), R('w','Leader weight',1,6,0.5,1)],
  setup(K){
    const parts = Array.from({length:6}, ()=>K.part(V(1,2,1),'--va',{front:false}));
    const lines = Array.from({length:6}, ()=>K.line('--muted',{dashed:true}));
    const cen = K.point('--accent',0.35), lc = K.label('centre','--accent','big'), ll = K.label('leader','--vb','big');
    const cam = K.part(V(1.2,0.8,1),'--ink'), cl = K.line('--accent',{dashed:true, opacity:0.6}); K.label('camera','--ink').at(V(0,8.2,14));
    return {update(p){
      const rng = mulberry32(p.seed*61); const P = parts.map(()=>V((rng()*2-1)*8, 1, (rng()*2-1)*7));
      let sum = V(), tw = 0;
      parts.forEach((m,i)=>{ const on = i < p.n; m.visible = on; lines[i].visible = on; if (!on) return; const w = i===0 ? p.w : 1;
        m.position.copy(P[i]); m.tint(i===0 ? '--vb' : '--va'); sum.addScaledVector(P[i], w); tw += w; });
      const c = sum.divideScalar(tw); cen.position.copy(c); lc.at(c.clone().add(V(0,0.7,0))); ll.at(P[0].clone().add(V(0,1.5,0)));
      parts.forEach((m,i)=>{ if (i < p.n) lines[i].set(P[i], c); });
      const camP = V(0,7,14); cam.setCF(CF.lookAt(camP, c)); cl.set(camP, c);
      return {c, P:P.slice(0,p.n)};
    }};
  },
  readout:(p,o)=>[['centre', vs(o.c),'acc'],['players', String(p.n)],['leader weight', f(p.w)]],
  code:(p,o)=>p.w === 1 ? `local sum = Vector3.zero
local count = 0
for _, player in Players:GetPlayers() do
    local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if root then
        sum += root.Position
        count += 1
    end
end

local centre = sum / count               --> ${vs(o.c)}
camera.CFrame = CFrame.lookAt(camera.CFrame.Position, centre)` : `-- weighted average: the leader counts ${f(p.w)}x
local sum, totalWeight = Vector3.zero, 0
for _, member in party do
    local w = member == leader and ${f(p.w)} or 1
    sum += member.Position * w
    totalWeight += w
end

local centre = sum / totalWeight         --> ${vs(o.c)}`,
  body:`<p>The average of some positions is their <b>centre</b>: add them all up and divide by how many there are. It works just like averaging numbers, on X, Y and Z at once.</p>
<p>A <b>weighted</b> average lets some points pull harder. Give the leader (pink) more weight and the centre slides toward them. The camera on the right keeps looking at the centre, which is how party and spectator cameras frame a group.</p>`,
  uses:[`<b>Group cameras</b> that keep every player in view.`,
        `<b>Squad AI</b>: move toward the middle of the squad, or away from the middle of the enemies.`,
        `<b>Smoothing</b>: average the last few positions of something jittery.`],
  gotchas:[`Divide by the number you actually added, not <code>#players</code>, if some players have no character yet.`,
           `An average of zero items divides by zero. Check the count first.`]
});

demo({
  id:'vec-physics', title:'Velocity and gravity', short:'p0 + v0·t + ½·g·t²', sig:'position = p0 + v0 * t + 0.5 * g * t^2', time:true,
  view:{theta:0.0, phi:1.15, r:30, ty:5, tx:4},
  params:[R('speed','Launch speed',20,70,1,50,' studs/s'), R('angle','Launch angle',10,80,1,45,'°'), R('grav','workspace.Gravity',100,300,0.2,196.2)],
  setup(K){
    const P0 = V(-10,0.5,0), path = K.line('--accent',{max:121, opacity:0.55}), ball = K.point('--accent',0.35), va = K.arrow('--va',{thick:0.05});
    const land = K.ring(0.8,'--vb',{y:0.04}), peakP = K.point('--muted',0.14), lp = K.label('','--muted'), ll = K.label('','--vb','big');
    K.part(V(1,1,1),'--ink',{front:false}).position.copy(P0);
    return {update(p,t){
      const a = p.angle*Math.PI/180, v0 = V(Math.cos(a)*p.speed, Math.sin(a)*p.speed, 0), g = V(0,-p.grav,0);
      const at = tt=>P0.clone().addScaledVector(v0,tt).addScaledVector(g,0.5*tt*tt);
      const T = 2*v0.y/p.grav, range = v0.x*T, peak = v0.y*v0.y/(2*p.grav);
      const pts = []; for (let i=0;i<=120;i++) pts.push(at(T*i/120)); path.set(pts);
      const tau = Math.min(T, t % (T + 0.8)), pos = at(tau), vel = v0.clone().addScaledVector(g, tau);
      ball.position.copy(pos); va.set(pos, vel.clone().multiplyScalar(0.08));
      land.position.set(P0.x+range, 0, 0); ll.at(V(P0.x+range, 1, 0)).text(`lands ${f(range,1)} studs away`);
      const pk = at(v0.y/p.grav); peakP.position.copy(pk); lp.at(pk.clone().add(V(0,0.6,0))).text(`peak ${f(peak,1)}`);
      return {T, range, peak, vel};
    }};
  },
  readout:(p,o)=>[['flight time', f(o.T,2)+' s'],['distance', f(o.range,1)+' studs','acc'],['peak height', f(o.peak,1)+' studs'],['velocity now', vs(o.vel)]],
  code:(p,o)=>`local g = Vector3.new(0, -workspace.Gravity, 0)     -- ${f(p.grav,1)} studs/s²
local v0 = Vector3.new(${f(Math.cos(p.angle*Math.PI/180)*p.speed)}, ${f(Math.sin(p.angle*Math.PI/180)*p.speed)}, 0)  -- ${p.speed} studs/s at ${p.angle}°

-- where will it be after t seconds? (no physics engine needed)
local function positionAt(p0, t)
    return p0 + v0 * t + 0.5 * g * t * t
end
local flightTime = 2 * v0.Y / workspace.Gravity      --> ${f(o.T,2)}

-- or step it yourself every frame
velocity += g * dt
position += velocity * dt`,
  body:`<p>Velocity is how much position changes per second; gravity is how much velocity changes per second. Step both every frame (<code>velocity += g * dt</code>, then <code>position += velocity * dt</code>) and you have a working projectile.</p>
<p>Because gravity is constant, there's also an exact formula for where it will be at any time. That lets you draw a <b>trajectory preview</b> or work out where it lands before throwing. Roblox's default <code>workspace.Gravity</code> is 196.2 studs/s².</p>
<p>45° goes furthest on flat ground. Halve the gravity and everything flies twice as far and twice as high.</p>`,
  uses:[`<b>Trajectory previews</b> for grenades, basketballs and catapults.`,
        `<b>Custom projectiles</b> that don't use the physics engine (smoother and server-friendly).`,
        `<b>Jump planning</b>: will this jump clear the gap?`],
  gotchas:[`Unanchored parts already fall with <code>workspace.Gravity</code>. Only add gravity yourself for anchored or custom-moved objects.`,
           `Large <code>dt</code> steps drift away from the exact formula. For accuracy, use the formula with total time instead of stepping.`]
});
}

{
const {THREE, V, f, vs, R, S, G, mulberry32} = Lab;

demo({
  id:'vec-sphere', adv:true, title:'Even points on a sphere', short:'Fibonacci sphere', sig:'y = 1 − 2(i + 0.5)/n  ·  angle = i × golden angle',
  view:{theta:0.6, phi:1.0, r:18, ty:5},
  params:[S('method','Method',[['fib','Fibonacci sphere (even)'],['grid','Latitude / longitude grid'],['random','Random directions']],'fib'), R('n','Points',10,400,10,150), R('seed','Seed (random only)',1,99,1,3)],
  setup(K){
    const Cn = V(0,5,0), R0 = 4.5; K.wsphere(R0,'--muted',0.12).position.copy(Cn);
    const mesh = K.add(new THREE.InstancedMesh(G.sphere, K.mat('--accent'), 400)); const dm = new THREE.Matrix4(), q = new THREE.Quaternion();
    let key = '', res = null;
    return {update(p){
      const k = [p.method,p.n,p.seed].join('|'); if (k !== key){ key = k;
        const pts = [], n = p.n, ga = Math.PI*(3 - Math.sqrt(5));
        if (p.method==='fib') for (let i=0;i<n;i++){ const y = 1 - 2*(i+0.5)/n, r = Math.sqrt(1-y*y), th = i*ga; pts.push(V(Math.cos(th)*r, y, Math.sin(th)*r)); }
        else if (p.method==='grid'){ const rows = Math.max(2, Math.round(Math.sqrt(n/2))), cols = Math.max(3, Math.round(n/rows)); for (let a=0;a<rows;a++) for (let b=0;b<cols;b++){ const lat = -Math.PI/2 + (a+0.5)/rows*Math.PI, lon = b/cols*Math.PI*2; pts.push(V(Math.cos(lat)*Math.cos(lon), Math.sin(lat), Math.cos(lat)*Math.sin(lon))); } }
        else { const rng = mulberry32(p.seed*41); for (let i=0;i<n;i++){ const z = rng()*2-1, a = rng()*Math.PI*2, r = Math.sqrt(1-z*z); pts.push(V(Math.cos(a)*r, z, Math.sin(a)*r)); } }
        pts.forEach((d,i)=>{ dm.compose(Cn.clone().addScaledVector(d, R0), q, V(0.12,0.12,0.12)); mesh.setMatrixAt(i, dm); });
        mesh.count = pts.length; mesh.instanceMatrix.needsUpdate = true;
        let minD = Infinity, maxNN = 0; for (let i=0;i<pts.length;i++){ let nn = Infinity; for (let j=0;j<pts.length;j++) if (i!==j) nn = Math.min(nn, pts[i].distanceToSquared(pts[j])); nn = Math.sqrt(nn)*R0; minD = Math.min(minD, nn); maxNN = Math.max(maxNN, nn); }
        res = {count:pts.length, minD, maxNN};
      }
      return res;
    }};
  },
  readout:(p,o)=>[['points', String(o.count)],['closest pair', f(o.minD,2)+' studs'],['biggest gap', f(o.maxNN,2)+' studs'],['evenness (closest ÷ gap)', f(o.minD/o.maxNN,2), o.minD/o.maxNN > 0.6 ? 'ok' : 'bad']],
  code:(p,o)=>`local GOLDEN_ANGLE = math.pi * (3 - math.sqrt(5))   -- about 137.5°

local function fibonacciSphere(n)
    local directions = {}
    for i = 0, n - 1 do
        local y = 1 - 2 * (i + 0.5) / n          -- from top to bottom in even steps
        local radius = math.sqrt(1 - y * y)     -- width of the sphere at that height
        local angle = i * GOLDEN_ANGLE
        table.insert(directions, Vector3.new(math.cos(angle) * radius, y, math.sin(angle) * radius))
    end
    return directions
end

-- a nova: ${p.n} bullets in every direction, evenly spaced
for _, dir in fibonacciSphere(${p.n}) do
    fireBullet(origin, dir * 80)
end`,
  body:`<p>Spreading points evenly over a sphere is harder than it looks. A latitude/longitude grid crowds points at the poles, like the lines on a globe. Random directions leave clumps and holes. The <b>Fibonacci sphere</b> fixes both: step down the sphere in equal heights and turn by the <b>golden angle</b> (about 137.5°) each time.</p>
<p>The golden angle never lines up with itself, so no two points stack. Compare the evenness score for each method, and orbit to the top of the grid version to see the bunching.</p>`,
  uses:[`<b>Novas and burst attacks</b> that fire in every direction.`,
        `<b>Sensor rays</b> around an AI or a drone, without blind spots.`,
        `<b>Placing trees, rocks or stars</b> evenly on a planet.`],
  gotchas:[`Random directions need care too: pick a random height (−1 to 1) and a random angle, as in the random method here, or they bunch at the poles.`,
           `For half a sphere (a dome), only use the points with y ≥ 0.`]
});
}
})();
