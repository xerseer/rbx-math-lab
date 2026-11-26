(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, vs, lookOf, clamp, G, R, S, T, noise} = Lab;
const demo = Lab.subject({
  id:'math', title:'math library', glyph:'wave',
  blurb:'sin, cos, atan2, clamp, rounding, noise and exp, each shown doing a real game job.'
});

demo({
  id:'m-sincos', title:'math.sin and math.cos', short:'circles, orbits, waves', sig:'math.cos(angle), math.sin(angle)  →  −1 … 1', time:true,
  view:{theta:0.5, phi:0.7, r:21, ty:0},
  params:[R('radius','Radius',1,8,0.5,5), R('speed','Speed',0.2,3,0.1,0.8,' rad/s'), R('count','Items in ring',0,16,1,8), R('bob','Bob height',0,2,0.1,0.6)],
  setup(K){
    const O = V(0,1,0); let ring=null, key='', items=[];
    const orb = K.point('--accent',0.35), cx = K.line('--x'), sz = K.line('--z'), rad = K.line('--muted',{dashed:true});
    const coin = K.add(new THREE.Mesh(G.cyl, K.mat('--accent'))); coin.scale.set(0.6,0.12,0.6);
    const lc = K.label('','--x','big'), ls = K.label('','--z','big'), lb = K.label('math.sin bob','--accent');
    return {update(p,t){
      const k = p.radius+'|'+p.count;
      if (k !== key){ key = k; K.drop(ring); ring = K.ring(p.radius,'--muted',{y:1, opacity:0.7});
        items.forEach(m=>K.drop(m)); items = [];
        for (let i=0;i<p.count;i++){ const a = i/p.count*Math.PI*2; const m = K.part(V(0.5,0.5,0.5),'--part',{front:false});
          m.position.set(Math.cos(a)*p.radius, 1, Math.sin(a)*p.radius); items.push(m); }
      }
      const a = t*p.speed, x = Math.cos(a)*p.radius, z = Math.sin(a)*p.radius, P = V(x,1,z);
      orb.position.copy(P); cx.set(O, V(x,1,0)); sz.set(V(x,1,0), P); rad.set(O,P);
      lc.at(V(x/2,1.45,0)).text(`cos × r = ${f(x)}`); ls.at(V(x,1.45,z/2)).text(`sin × r = ${f(z)}`);
      const by = 2.2 + Math.sin(t*2)*p.bob; coin.position.set(0,by,0); coin.rotation.set(Math.PI/2, 0, t*1.5);
      lb.at(V(0, by+0.75, 0));
      return {a: ((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI), c:Math.cos(a), s:Math.sin(a)};
    }};
  },
  readout:(p,o)=>[['angle', f(o.a)+' rad'],['math.cos', f(o.c),'acc'],['math.sin', f(o.s),'acc']],
  code:(p,o)=>`-- orbit
local angle = os.clock() * ${f(p.speed)}
orb.Position = center + Vector3.new(math.cos(angle) * ${f(p.radius)}, 0, math.sin(angle) * ${f(p.radius)})

-- ${p.count} items evenly around a circle
for i = 1, ${p.count} do
    local a = (i / ${p.count}) * 2 * math.pi
    items[i].Position = center + Vector3.new(math.cos(a), 0, math.sin(a)) * ${f(p.radius)}
end

-- hover bob: sin swings between -1 and 1
coin.Position = basePos + Vector3.new(0, math.sin(os.clock() * 2) * ${f(p.bob)}, 0)`,
  body:`<p>Give <code>math.cos</code> and <code>math.sin</code> an angle (in radians) and they return a point on a circle of radius 1: cos is the X part, sin is the other part. Multiply both by a radius and you have any circle you want.</p>
<p>Watch the red and blue lines. The red one is <code>cos × radius</code> along X, the blue one is <code>sin × radius</code> along Z. Together they always reach the orange ball.</p>
<p>On its own, sin is a smooth wave between −1 and 1. Feed it the time and you get a gentle up-and-down bob, like the coin in the middle.</p>`,
  uses:[`<b>Orbits and circling pets.</b> Feed the angle from <code>os.clock()</code>.`,
        `<b>Spreading items in a ring:</b> spawn points around an arena, a radial menu, a shotgun spread.`,
        `<b>Hovering, breathing and pulsing</b>: pickups that bob, lights that pulse, UI that throbs.`],
  gotchas:[`Angles are radians. One full lap is <code>2 * math.pi</code>.`,
           `Using <code>i / count</code> from 1 to count avoids placing the first and last items on top of each other.`,
           `Swap sin and cos, or negate one, to change the start point or the direction of travel.`]
});

demo({
  id:'m-atan2', title:'math.atan2: angle from a direction', short:'math.atan2(y, x)', sig:'math.atan2(y, x)  →  angle in radians (−π … π)',
  view:{theta:0.0, phi:0.5, r:22, ty:0},
  params:[R('tx','Target X',-9,9,0.5,-5), R('tz','Target Z',-9,9,0.5,-4)],
  setup(K){
    const sec = K.sector('--accent',0.22); K.line('--z',{dashed:true}).set(V(0,0.04,0), V(0,0.04,-6));
    const pl = K.part(V(1.6,2,1.2)); pl.position.set(0,1,0); const tg = K.point('--vb',0.3), ln = K.line('--vb',{dashed:true});
    const la = K.label('','--accent','big'); K.label('0 = facing −Z','--z').at(V(0,0.4,-6.4));
    return {update(p){
      const O = V(0,1,0), d = V(p.tx,0,p.tz), yaw = Math.atan2(-d.x, -d.z);
      pl.quaternion.setFromAxisAngle(UP, yaw);
      sec.setSector(O, yaw/2, Math.abs(yaw)/2, 4);
      tg.position.set(p.tx,1,p.tz); ln.set(O, V(p.tx,1,p.tz));
      const mid = lookOf(yaw/2).multiplyScalar(4.8); la.at(V(mid.x,0.5,mid.z)).text(`${f(yaw/D2R,1)}°`);
      return {yaw, d};
    }};
  },
  readout:(p,o)=>[['yaw', f(o.yaw,3)+' rad','acc'],['in degrees', f(o.yaw/D2R,1)+'°'],['turns', Math.abs(o.yaw)<1e-3?'none':(o.yaw>0?'left':'right')]],
  code:(p,o)=>`local dir = target.Position - npc.Position     --> ${vs(o.d)}

-- angle to turn around Y so the front (-Z) points along dir
local yaw = math.atan2(-dir.X, -dir.Z)          --> ${f(o.yaw,3)}  (${f(o.yaw/D2R,1)}°)
npc.CFrame = CFrame.new(npc.Position) * CFrame.Angles(0, yaw, 0)

-- 2D (UI): rotate an arrow image toward a point on screen
arrow.Rotation = math.deg(math.atan2(dy, dx))`,
  body:`<p><code>math.atan2(y, x)</code> goes the other way from sin and cos: give it a direction and it tells you the <b>angle</b>. It looks at the signs of both inputs, so it gets every direction right, all the way round. Plain <code>math.atan(y / x)</code> can't tell left from right and breaks when x is 0.</p>
<p>In 3D you use it to find how far to turn around Y. Roblox's forward is −Z, so the inputs are <code>-dir.X</code> and <code>-dir.Z</code>. The shaded wedge is the turn from straight ahead to the target.</p>`,
  uses:[`<b>Turning on one axis only</b>: tank bodies, NPC torsos, rotating a base without tilting it.`,
        `<b>Compasses and minimap arrows.</b> The angle of a direction on a 2D map, then <code>math.deg</code> for a GUI's <code>Rotation</code>.`,
        `<b>Joystick input.</b> Turn a thumbstick's X and Y into a heading.`],
  gotchas:[`The argument order is <code>(y, x)</code>, not <code>(x, y)</code>.`,
           `Results run from −π to π (−180° to 180°). If you need 0 to 360°, add 360 to negative values.`,
           `For full 3D aiming, <code>CFrame.lookAt</code> is easier. atan2 is for when you only want the one angle.`]
});

demo({
  id:'m-clamp', title:'math.clamp: stay in bounds', short:'math.clamp(x, min, max)', sig:'math.clamp(x, min, max)  →  number',
  view:{theta:0.35, phi:0.7, r:28, ty:0},
  params:[R('rx','Wanted X',-14,14,0.5,11), R('rz','Wanted Z',-14,14,0.5,-6), R('half','Arena half-size',2,10,0.5,6)],
  setup(K){
    const box = K.line('--accent',{max:5}), fill = K.add(new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2), K.mat('--accent',{opacity:0.1, basic:true}))); fill.position.y = 0.01;
    const raw = K.part(V(1,1,1),'--bad',{front:false, opacity:0.45}), cl = K.part(V(1,1,1),'--accent',{front:false}), ln = K.line('--muted',{dashed:true});
    const lr = K.label('wanted','--bad'), lc = K.label('clamped','--accent','big');
    return {update(p){
      const h = p.half; box.set(V(-h,0.03,-h),V(h,0.03,-h),V(h,0.03,h),V(-h,0.03,h),V(-h,0.03,-h)); fill.scale.set(h*2,1,h*2);
      const W = V(p.rx,0.5,p.rz), Cc = V(clamp(p.rx,-h,h),0.5,clamp(p.rz,-h,h));
      raw.position.copy(W); cl.position.copy(Cc); ln.set(W,Cc); const moved = W.distanceTo(Cc)>1e-6;
      raw.visible = moved; ln.visible = moved; lr.show(moved).at(W.clone().add(V(0,1,0))); lc.at(Cc.clone().add(V(0,1.05,0)));
      return {W, Cc, moved};
    }};
  },
  readout:(p,o)=>[['wanted', `${f(o.W.x)}, ${f(o.W.z)}`],['clamped', `${f(o.Cc.x)}, ${f(o.Cc.z)}`,'acc'],['changed?', o.moved?'yes, pushed back inside':'no, already inside', o.moved?'bad':'ok']],
  code:(p,o)=>`local LIMIT = ${f(p.half)}
local p = part.Position

part.Position = Vector3.new(
    math.clamp(p.X, -LIMIT, LIMIT),   -- ${f(p.rx)} → ${f(o.Cc.x)}
    p.Y,
    math.clamp(p.Z, -LIMIT, LIMIT)    -- ${f(p.rz)} → ${f(o.Cc.z)}
)

-- other everyday clamps:
humanoid.Health = math.clamp(humanoid.Health + heal, 0, humanoid.MaxHealth)
pitch = math.clamp(pitch, math.rad(-80), math.rad(80))   -- camera can't flip over`,
  body:`<p><code>math.clamp(x, min, max)</code> returns x, unless x is below min (you get min) or above max (you get max). It's a fence for numbers.</p>
<p>Clamp X and Z separately and a position can't leave a box. Drag the wanted point outside the arena: the orange block stops at the edge and slides along it.</p>`,
  uses:[`<b>Health and stamina</b> that can't go below 0 or over the max.`,
        `<b>Camera pitch limits</b> so the player can't look past straight up and flip the view.`,
        `<b>Play areas.</b> Keep a placement preview, a drone or a ball inside the map.`,
        `<b>Server validation.</b> Clamp numbers a client sends you (like a requested amount) to sane values.`],
  gotchas:[`min must not be bigger than max, or Luau throws an error. Watch out when the limits come from variables.`,
           `<code>math.clamp</code> works on single numbers. For vectors, clamp each component, or use <code>v:Max(lo):Min(hi)</code>.`]
});

demo({
  id:'m-snap', title:'math.round: grid snapping', short:'math.round(x / g) * g', sig:'math.round(x / grid) * grid  →  snapped number',
  view:{theta:0.3, phi:0.65, r:24, ty:0},
  params:[R('rx','Mouse X',-10,10,0.1,3.3), R('rz','Mouse Z',-10,10,0.1,-1.7), S('grid','Grid size',[['1','1 stud'],['2','2 studs'],['4','4 studs']],'4'), S('mode','Function',[['round','math.round (nearest)'],['floor','math.floor (always down)']],'round')],
  setup(K){
    let gkey='', gl=null;
    const cur = K.point('--vb',0.18), curRing = K.ring(0.45,'--vb',{y:0.04}); const blk = K.part(V(1,1,1),'--accent',{front:false, opacity:0.85});
    const ln = K.line('--muted',{dashed:true}), lb = K.label('mouse.Hit','--vb'), ls = K.label('snapped','--accent','big');
    return {update(p){
      const g = +p.grid;
      if (gkey !== p.grid){ gkey = p.grid; K.drop(gl);
        const pts=[]; const N = 12; for (let v=-Math.floor(N/g)*g; v<=N; v+=g){ pts.push(V(v,0.02,-N),V(v,0.02,N),V(-N,0.02,v),V(N,0.02,v)); }
        gl = K.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:C('--accent'), transparent:true, opacity:0.5}))); }
      const fn = p.mode==='round' ? Math.round : Math.floor;
      const sx = fn(p.rx/g)*g, sz = fn(p.rz/g)*g;
      cur.position.set(p.rx,0.25,p.rz); curRing.position.set(p.rx,0,p.rz);
      blk.position.set(sx, g/2, sz); blk.resize(V(g*0.98, g, g*0.98));
      ln.set(V(p.rx,0.25,p.rz), V(sx,0.25,sz)); lb.at(V(p.rx,0.8,p.rz)); ls.at(V(sx,g+0.5,sz));
      return {sx, sz, g};
    }};
  },
  readout:(p,o)=>[['mouse', `${f(p.rx)}, ${f(p.rz)}`],[`${p.mode==='round'?'math.round':'math.floor'}`, `${f(o.sx)}, ${f(o.sz)}`,'acc']],
  code:(p,o)=>`local GRID = ${p.grid}

local function snap(n)
    return math.${p.mode}(n / GRID) * GRID
end

local hit = mouse.Hit.Position          -- (${f(p.rx)}, y, ${f(p.rz)})
preview.Position = Vector3.new(snap(hit.X), preview.Size.Y / 2, snap(hit.Z))
--> X ${f(o.sx)}, Z ${f(o.sz)}`,
  body:`<p>To snap a number to a grid, divide by the grid size, round to a whole number, and multiply back. Dividing turns studs into "cells", rounding picks a cell, multiplying turns it back into studs.</p>
<p><code>math.round</code> picks the <b>nearest</b> grid line, which feels right for building. <code>math.floor</code> always goes <b>down</b>, which is what you want for the index of the cell something is in. Switch between them and drag the mouse point across a line to see the difference.</p>`,
  uses:[`<b>Building and placement systems:</b> tycoons, house builders, tower defence.`,
        `<b>Voxel games.</b> <code>math.floor(pos / size)</code> gives the block coordinates for a table lookup.`,
        `<b>Tidy numbers in UI.</b> <code>math.round(x * 10) / 10</code> shows one decimal place; <code>math.floor(seconds / 60)</code> gives minutes.`],
  gotchas:[`<code>math.floor(-1.5)</code> is −2, not −1. Floor always goes toward negative infinity.`,
           `Rotation snapping works the same way: <code>math.round(angle / math.rad(90)) * math.rad(90)</code>.`,
           `Vector3 has <code>:Floor()</code> and <code>:Ceil()</code> too, for the whole vector at once.`]
});

demo({
  id:'m-noise', title:'math.noise: smooth randomness', short:'terrain and wobble', sig:'math.noise(x, y, z)  →  about −1 … 1, smooth', time:true,
  view:{theta:0.7, phi:0.85, r:40, ty:0}, env:'grid',
  params:[R('scale','Scale (zoom)',0.02,1,0.01,0.12), R('amp','Amplitude',0,12,0.5,6), R('seed','Seed (3rd input)',0,99,1,3), T('anim','Scroll through time',false)],
  setup(K){
    const N = 28, cnt = N*N; const mesh = K.add(new THREE.InstancedMesh(G.box, new THREE.MeshLambertMaterial({color:0xffffff}), cnt));
    const dm = new THREE.Matrix4(), q = new THREE.Quaternion(); const cLow = C('--z'), cMid = C('--y'), cHigh = C('--part'), tc = new THREE.Color();
    for (let i=0;i<cnt;i++) mesh.setColorAt(i, cMid);
    let key = '', sample = 0;
    return {update(p,t){
      const z3 = p.seed + (p.anim ? t*0.25 : 0); const k = [p.scale,p.amp,z3].join('|');
      if (k !== key){ key = k;
        for (let ix=0; ix<N; ix++) for (let iz=0; iz<N; iz++){
          const n = noise((ix+1)*p.scale, (iz+1)*p.scale, z3); if (ix===13 && iz===13) sample = n;
          const h = Math.max(0.2, 3 + n*p.amp);
          dm.compose(V(ix-N/2+0.5, h/2, iz-N/2+0.5), q, V(0.96,h,0.96)); const i = ix*N+iz; mesh.setMatrixAt(i, dm);
          const kk = (n+0.6)/1.2; if (kk < 0.4) tc.copy(cLow).lerp(cMid, Math.max(0,kk)/0.4); else tc.copy(cMid).lerp(cHigh, Math.min(1,(kk-0.4)/0.4)); mesh.setColorAt(i, tc);
        }
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
      return {sample, flat: Math.abs(p.scale - Math.round(p.scale)) < 1e-9};
    }};
  },
  readout:(p,o)=>[['noise at (14, 14)', f(o.sample,3),'acc'],['note', o.flat?'whole-number inputs → all 0':'smooth hills', o.flat?'bad':'']],
  code:(p,o)=>`local SCALE, AMPLITUDE, SEED = ${f(p.scale)}, ${f(p.amp)}, ${p.seed}

for x = 1, 28 do
    for z = 1, 28 do
        local n = math.noise(x * SCALE, z * SCALE, SEED)   -- smooth, about -1..1
        local height = math.max(0.2, 3 + n * AMPLITUDE)
        local block = Instance.new("Part")
        block.Anchored = true
        block.Size = Vector3.new(1, height, 1)
        block.Position = Vector3.new(x, height / 2, z)
        block.Parent = workspace
    end
end`,
  body:`<p><code>math.random</code> gives you numbers that jump around. <code>math.noise</code> (Perlin noise) gives numbers that change <b>smoothly</b>: inputs that are close together give outputs that are close together. That's what makes hills instead of static.</p>
<p><b>Scale</b> is how far apart your sample points are. Small values zoom in for wide, gentle hills; large values give spiky, busy terrain. <b>Amplitude</b> is how tall it gets. Set the scale to exactly 1: every input is a whole number, Perlin noise is always 0 there, and the land goes flat.</p>`,
  uses:[`<b>Terrain and island generation</b>. Stack two or three noise layers at different scales for more natural shapes.`,
        `<b>Camera shake</b> that feels organic: <code>math.noise(os.clock() * 10)</code> instead of random jitter.`,
        `<b>Wind sway, flickering torches and wobbling water</b>: feed time into one of the inputs.`],
  gotchas:[`Whole-number inputs always return 0. Multiply by a scale that isn't a whole number.`,
           `The output is mostly between −0.5 and 0.5 and only rarely near ±1. Tune the amplitude by eye, and clamp if you need a hard range.`,
           `The third input works as a seed: change it to get a different but equally smooth map.`]
});

demo({
  id:'m-exp', title:'math.exp: smooth follow', short:'1 - math.exp(-k * dt)', sig:'alpha = 1 - math.exp(-speed * dt)', time:true,
  view:{theta:0.1, phi:0.6, r:24, ty:0},
  params:[R('speed','Follow speed',1,20,0.5,5), S('fps','Simulated frame rate',[['60','60 FPS'],['30','30 FPS'],['15','15 FPS (laggy phone)']],'15'), T('naive','Show fixed-alpha follower',true)],
  setup(K){
    const goal = K.point('--vb',0.3), good = K.part(V(1,1,1),'--accent',{front:false}), bad = K.part(V(1,1,1),'--bad',{front:false, opacity:0.75});
    const path = []; for (let i=0;i<=160;i++){ const s=i/160*Math.PI*2; path.push(V(Math.sin(s)*8,0.05,Math.sin(2*s)*4)); } K.line('--muted',{dashed:true, max:161}).set(path);
    const lg = K.label('goal','--vb'), l1 = K.label('math.exp follower','--accent','big'), l2 = K.label('fixed-alpha follower','--bad');
    let acc = 0, gp = V(), pg = null, pb = null, lastT = 0;
    return {update(p,t){
      const fps = +p.fps, step = 1/fps; let dtReal = t - lastT; lastT = t; if (dtReal < 0 || dtReal > 0.5) dtReal = 0; acc += dtReal;
      const goalAt = tt => V(Math.sin(tt*0.6)*8, 0.6, Math.sin(tt*1.2)*4);
      if (!pg){ gp = goalAt(t); pg = gp.clone(); pb = gp.clone(); }
      const fixedAlpha = 1 - Math.exp(-p.speed/60);
      while (acc >= step){ acc -= step; gp = goalAt(t - acc); pg.lerp(gp, 1 - Math.exp(-p.speed*step)); pb.lerp(gp, fixedAlpha); }
      goal.position.copy(gp); good.position.copy(pg); bad.position.copy(pb); bad.visible = p.naive; l2.show(p.naive);
      lg.at(gp.clone().add(V(0,0.6,0))); l1.at(pg.clone().add(V(0,1,0))); l2.at(pb.clone().add(V(0,-0.9,0)));
      return {gapG:pg.distanceTo(gp), gapB:pb.distanceTo(gp), fixedAlpha, alpha:1-Math.exp(-p.speed*step)};
    }};
  },
  readout:(p,o)=>[['alpha per frame', f(o.alpha,3)],['math.exp gap', f(o.gapG)+' studs','acc'], ...(p.naive?[['fixed-alpha gap', f(o.gapB)+' studs','bad']]:[])],
  code:(p,o)=>`local SPEED = ${f(p.speed)}

RunService.Heartbeat:Connect(function(dt)
    -- frame-rate independent: same motion at 15, 60 or 240 FPS
    local alpha = 1 - math.exp(-SPEED * dt)     -- at ${p.fps} FPS: ${f(o.alpha,3)}
    pet.Position = pet.Position:Lerp(goal.Position, alpha)
end)

-- the common mistake: a fixed alpha every frame
-- pet.Position = pet.Position:Lerp(goal.Position, ${f(o.fixedAlpha,3)})
-- looks right at 60 FPS, drags behind at ${p.fps} FPS`,
  body:`<p>Lerping a bit toward a goal every frame gives smooth, eased following. The catch is that frames don't come at a steady rate. Lerp by a fixed amount each frame and the follower moves four times slower for a player getting 15 FPS than for one getting 60.</p>
<p><code>math.exp</code> fixes it. <code>1 - math.exp(-speed * dt)</code> picks the alpha from how much time has actually passed. Set the frame rate to 60 and both followers match; drop it to 15 and the red one falls behind while the orange one keeps pace.</p>`,
  uses:[`<b>Cameras</b> that trail a vehicle smoothly.`,
        `<b>Pets and companions</b> following their owner.`,
        `<b>UI values</b> easing toward a target: health bars that drain smoothly, number counters.`],
  gotchas:[`Use the <code>dt</code> that Heartbeat or RenderStepped gives you. Don't assume 1/60.`,
           `Bigger speed = snappier. Around 5 feels floaty, around 20 feels tight.`,
           `Works the same with <code>CFrame:Lerp</code> for smooth turning.`]
});
})();
