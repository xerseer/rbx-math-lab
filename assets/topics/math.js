(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, vs, lookOf, clamp, CF, G, R, S, T, noise} = Lab;
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

const bounceOut = t=>{ const n=7.5625, d=2.75; if (t<1/d) return n*t*t; if (t<2/d) return n*(t-=1.5/d)*t+0.75; if (t<2.5/d) return n*(t-=2.25/d)*t+0.9375; return n*(t-=2.625/d)*t+0.984375; };
const EASE_IN = {
  Linear:t=>t, Quad:t=>t*t, Cubic:t=>t*t*t, Sine:t=>1-Math.cos(t*Math.PI/2),
  Exponential:t=>t===0?0:Math.pow(2,10*t-10),
  Back:t=>{ const c1=1.70158; return (c1+1)*t*t*t - c1*t*t; },
  Elastic:t=>t===0||t===1?t:-Math.pow(2,10*t-10)*Math.sin((t*10-10.75)*(2*Math.PI/3)),
  Bounce:t=>1-bounceOut(1-t),
};
function ease(style, dir, t){ const fi = EASE_IN[style]; if (dir==='In') return fi(t); if (dir==='Out') return 1-fi(1-t); return t<0.5 ? fi(2*t)/2 : 1-fi(2-2*t)/2; }

demo({
  id:'m-easing', title:'Easing curves', short:'Enum.EasingStyle', sig:'TweenService:GetValue(alpha, EasingStyle, EasingDirection)  →  eased alpha', time:true,
  view:{theta:0.0, phi:1.25, r:19, ty:3}, env:'grid',
  params:[S('style','EasingStyle',Object.keys(EASE_IN).map(k=>[k,k]),'Back'), S('dir','EasingDirection',[['Out','Out'],['In','In'],['InOut','InOut']],'Out'), R('dur','Duration',0.4,3,0.1,1.2,' s')],
  setup(K){
    const X0=-6, X1=6, Y0=1, Y1=6, Z=0;
    K.line('--muted').set(V(X0,Y0,Z),V(X1,Y0,Z)); K.line('--muted',{dashed:true}).set(V(X0,Y1,Z),V(X1,Y1,Z)); K.line('--muted').set(V(X0,Y0,Z),V(X0,Y1+0.8,Z));
    K.label('0','--muted').at(V(X0-0.5,Y0,Z)); K.label('1','--muted').at(V(X0-0.5,Y1,Z)); K.label('time →','--muted').at(V(X1-0.6,Y0-0.5,Z)); K.label('value','--muted').at(V(X0,Y1+1.1,Z));
    const curve = K.line('--accent',{max:121}), dot = K.point('--accent',0.2), vline = K.line('--accent',{dashed:true, opacity:0.6});
    K.line('--muted',{dashed:true}).set(V(X0,0.05,3),V(X1,0.05,3)); const box = K.part(V(1,1,1),'--accent',{front:false}); const lab = K.label('','--accent','big');
    let key = '';
    return {update(p,t){
      const k = p.style+p.dir; if (k !== key){ key = k; const pts=[]; for (let i=0;i<=120;i++){ const a=i/120; pts.push(V(X0+a*(X1-X0), Y0+ease(p.style,p.dir,a)*(Y1-Y0), Z)); } curve.set(pts); }
      const a = Math.min(1, (t/p.dur) % 1.6), v = ease(p.style,p.dir,a);
      const P = V(X0+a*(X1-X0), Y0+v*(Y1-Y0), Z); dot.position.copy(P); vline.set(P, V(P.x,Y0,Z));
      box.position.set(X0+v*(X1-X0), 0.5, 3); lab.at(V(X0+v*(X1-X0), 1.6, 3)).text(`${f(v)}`);
      return {a, v};
    }};
  },
  readout:(p,o)=>[['alpha (time)', f(o.a)],['eased value', f(o.v),'acc'],['overshoots?', /Back|Elastic/.test(p.style) && p.dir!=='In' ? 'yes, past 1' : (/Back|Elastic/.test(p.style) ? 'yes, below 0' : 'no')]],
  code:(p,o)=>`-- let TweenService do it
local info = TweenInfo.new(${f(p.dur)}, Enum.EasingStyle.${p.style}, Enum.EasingDirection.${p.dir})
TweenService:Create(door, info, { CFrame = openCFrame }):Play()

-- or ease your own maths with the same curves
local start = os.clock()
RunService.RenderStepped:Connect(function()
    local alpha = math.clamp((os.clock() - start) / ${f(p.dur)}, 0, 1)
    local eased = TweenService:GetValue(alpha, Enum.EasingStyle.${p.style}, Enum.EasingDirection.${p.dir})
    gui.Position = startPos:Lerp(endPos, eased)
end)`,
  body:`<p>An easing curve turns steady time (0 → 1) into a value that speeds up, slows down, overshoots or bounces on its way from 0 to 1. The graph shows time across and value up; the block below moves by the eased value.</p>
<p><b>In</b> starts slow, <b>Out</b> ends slow, <b>InOut</b> does both. Out usually feels best for things reacting to the player, because they respond instantly and settle gently. <code>Back</code> and <code>Elastic</code> go past the target and come back, which adds bounce and life to UI.</p>
<p><code>TweenService:GetValue</code> gives you these exact curves for your own lerps, Bézier t values or anything else.</p>`,
  uses:[`<b>UI pop-ins</b> with Back Out, and menus sliding with Quad Out.`,
        `<b>Doors and platforms</b> with Sine InOut so they don't jerk at the ends.`,
        `<b>Custom animations</b>: feed the eased value into <code>CFrame:Lerp</code> or a Bézier curve.`],
  gotchas:[`Back and Elastic leave the 0–1 range. If a value must stay inside (like transparency), clamp it or pick another style.`,
           `The curves here follow the standard formulas. Roblox's built-in ones match closely, but use <code>GetValue</code> when you need exact matches.`]
});

demo({
  id:'m-mod', title:'Wrapping with %', short:'index % n + 1', sig:'x % n  →  remainder, always 0 … n−1 for positive n', time:true,
  view:{theta:0.0, phi:0.6, r:22, ty:0},
  params:[R('count','Waypoints',3,10,1,6), R('speed','Speed',0.5,4,0.25,1.5,' pads/s'), S('dir','Direction',[['fwd','Forwards'],['back','Backwards']],'fwd')],
  setup(K){
    let pads = [], key = -1; const npc = K.part(V(1,1.6,1)), lab = K.label('','--accent','big'), nl = K.label('','--ink');
    return {update(p,t){
      const n = p.count, R0 = 7;
      if (key !== n){ key = n; pads.forEach(x=>{ K.drop(x.m); x.l.el.remove(); x.l.show(false); }); pads = [];
        for (let i=0;i<n;i++){ const a = i/n*Math.PI*2 - Math.PI/2, P = V(Math.cos(a)*R0, 0.1, Math.sin(a)*R0); const m = K.part(V(1.6,0.2,1.6),'--part',{front:false}); m.position.copy(P); pads.push({m, P, l:K.label(String(i+1),'--ink','big').at(P.clone().add(V(0,0.6,0)))}); } }
      const steps = Math.floor(t*p.speed), frac = t*p.speed - steps;
      const idxOf = s=>p.dir==='fwd' ? s % n : ((-s % n) + n) % n;
      const from = idxOf(steps), to = idxOf(steps+1);
      const A = pads[from].P, B = pads[to].P; const pos = A.clone().lerp(B, frac).setY(0.9);
      npc.setCF(CF.lookAt(pos, pos.clone().add(B.clone().sub(A).setY(0))));
      pads.forEach((x,i)=>x.m.tint(i===to ? '--accent' : '--part'));
      lab.at(pos.clone().add(V(0,1.3,0))).text(`heading to ${to+1}`);
      nl.at(V(0,0.3,0)).text(p.dir==='fwd' ? `${from+1} % ${n} + 1 = ${to+1}` : `(${from+1} - 2) % ${n} + 1 = ${to+1}`);
      return {from:from+1, to:to+1, n};
    }};
  },
  readout:(p,o)=>[['current', String(o.from)],['next', String(o.to),'acc'],['-1 % '+o.n, String(((-1 % o.n)+o.n)%o.n)]],
  code:(p,o)=>`local waypoints = workspace.Path:GetChildren()   -- ${o.n} pads, numbered 1..${o.n}
local index = 1

while true do
    humanoid:MoveTo(waypoints[index].Position)
    humanoid.MoveToFinished:Wait()
${p.dir==='fwd' ? `    index = index % #waypoints + 1           -- ${o.from} → ${o.to}, and ${o.n} → 1` : `    index = (index - 2) % #waypoints + 1     -- ${o.from} → ${o.to}, and 1 → ${o.n}`}
end

-- wrapping an angle into 0..360
local heading = (heading + turn) % 360`,
  body:`<p><code>%</code> gives the remainder after dividing. Counting up and taking <code>% n</code> goes 0, 1, 2 … n−1, 0, 1, 2 … forever, which is exactly what looping through a list needs. Lua lists start at 1, so add 1: <code>index % n + 1</code>.</p>
<p>Going backwards works too, because in Luau <code>-1 % n</code> is <code>n - 1</code>, not −1. Switch direction and the NPC walks the loop the other way, wrapping from pad 1 back to the last pad.</p>`,
  uses:[`<b>Patrol routes</b> that loop forever.`,
        `<b>Cycling</b> through weapons, songs, colours or tutorial pages.`,
        `<b>Wrapping angles and time</b>: headings into 0–360, a day-night clock into 0–24.`],
  gotchas:[`<code>index % n + 1</code> needs index to start at 1. Starting at 0 skips the first item.`,
           `<code>%</code> works on decimals too: <code>os.clock() % 2</code> repeats every 2 seconds.`]
});

demo({
  id:'m-map', title:'Remapping ranges', short:'inverse lerp → lerp', sig:'t = (x - inMin) / (inMax - inMin)  ·  outMin + (outMax - outMin) * t',
  view:{theta:0.0, phi:0.75, r:24, ty:0, tx:5},
  params:[R('d','Player distance',0,20,0.25,8), R('near','Full volume within',1,8,0.5,4), R('far','Silent beyond',8,20,0.5,16)],
  setup(K){
    const sp = K.part(V(1.4,2,1.4),'--vb',{front:false}); sp.position.set(0,1,0); K.label('speaker','--vb','big').at(V(0,2.6,0));
    let rn = null, rf = null, key = '';
    const pl = K.part(V(1,2,1),'--va',{front:false}), meter = K.part(V(0.5,1,0.5),'--accent',{front:false}), frame = K.add(new THREE.LineSegments(G.edges, new THREE.LineBasicMaterial({color:C('--muted')})));
    const lm = K.label('','--accent','big'), ln = K.label('near','--muted'), lf = K.label('far','--muted');
    return {update(p){
      const k = p.near+'|'+p.far; if (k !== key){ key = k; K.drop(rn); K.drop(rf); rn = K.ring(p.near,'--accent',{y:0.03}); rf = K.ring(p.far,'--muted',{y:0.03, dashed:true}); }
      ln.at(V(p.near,0.3,0.6)); lf.at(V(p.far,0.3,0.6));
      const t = clamp((p.d - p.near)/(p.far - p.near), 0, 1), vol = 1 - t;
      pl.position.set(p.d,1,0); meter.resize(V(0.5, Math.max(0.01, vol*4), 0.5)); meter.position.set(p.d+1.2, vol*2, 0);
      frame.scale.set(0.55,4,0.55); frame.position.set(p.d+1.2,2,0);
      lm.at(V(p.d+1.2, 4.6, 0)).text(`Volume ${f(vol)}`);
      return {t, vol, raw:(p.d - p.near)/(p.far - p.near)};
    }};
  },
  readout:(p,o)=>[['inverse lerp (raw)', f(o.raw)],['clamped t', f(o.t)],['volume', f(o.vol),'acc']],
  code:(p,o)=>`local NEAR, FAR = ${f(p.near)}, ${f(p.far)}

local function inverseLerp(a, b, x)
    return (x - a) / (b - a)              -- where x sits between a and b, as 0..1
end

local distance = (root.Position - speaker.Position).Magnitude   -- ${f(p.d)}
local t = math.clamp(inverseLerp(NEAR, FAR, distance), 0, 1)    --> ${f(o.t)}
sound.Volume = 1 - t                                             --> ${f(o.vol)}

-- newer Luau has this built in (clamp it yourself):
-- sound.Volume = math.clamp(math.map(distance, NEAR, FAR, 1, 0), 0, 1)`,
  body:`<p>Lots of game feel comes from turning one range into another: distance into volume, speed into camera FOV, health into a bar's colour. It's two steps. An <b>inverse lerp</b> asks "how far between a and b is x?" and answers with 0 to 1. A normal lerp then turns that 0 to 1 into the output range.</p>
<p>Walk the player away from the speaker. Inside the near ring the volume stays at 1, beyond the far ring it's 0, and in between it fades smoothly. The clamp is what holds the ends flat.</p>`,
  uses:[`<b>Distance fades</b> for sound, fog, name tags and particle rates.`,
        `<b>Speed to FOV</b>: <code>70 + 20 * inverseLerp(16, 60, speed)</code> for a sense of speed.`,
        `<b>Health colours</b>: <code>Color3.new(1, 0, 0):Lerp(Color3.new(0, 1, 0), hp / maxHp)</code>.`],
  gotchas:[`Without a clamp, values outside the input range go past the output range (volume 1.5, or −0.3).`,
           `If a equals b, inverse lerp divides by zero. Make sure the two ends differ.`]
});

{
demo({
  id:'m-spring', title:'Springs: bouncy follow', short:'force = −k·x − c·v', sig:'acceleration = −stiffness·(x − goal) − damping·velocity', time:true,
  view:{theta:0.0, phi:1.1, r:20, ty:3.5},
  params:[R('k','Stiffness',10,400,5,120), R('zeta','Damping ratio',0.05,1.5,0.05,0.3), R('gap','Goal jump',2,7,0.5,5)],
  setup(K){
    const goal = K.point('--vb',0.3), box = K.part(V(1.2,1.2,1.2),'--accent',{front:false}), spring = K.line('--muted',{max:26}), graph = K.line('--accent',{max:300, opacity:0.7});
    K.line('--muted',{dashed:true}).set(V(-8,1,-3),V(8,1,-3)); K.label('6 s ago ↑','--muted').at(V(-8.6,7,-3)); K.label('now','--muted').at(V(-8.6,1,-3)); K.label('position over time','--muted').at(V(0,7.6,-3));
    const gl = K.label('goal','--vb'); let x = 0, v = 0, last = 0, acc = 0, sub = 0; const hist = [];
    return {update(p,t){
      let dt = t - last; last = t; if (dt < 0 || dt > 0.25) dt = 0; acc += dt;
      const goalX = Math.floor(t/2.5) % 2 ? p.gap : -p.gap, c = 2*p.zeta*Math.sqrt(p.k);
      while (acc >= 1/240){ acc -= 1/240; const a = -p.k*(x - goalX) - c*v; v += a/240; x += v/240; if (++sub % 8 === 0){ hist.push(x); if (hist.length > 180) hist.shift(); } }
      goal.position.set(goalX,1,0); gl.at(V(goalX,1.6,0)); box.position.set(x,1,0);
      const pts = []; for (let i=0;i<=25;i++){ const s = i/25; pts.push(V(goalX + (x-goalX)*s, 1 + (i>0&&i<25 ? (i%2?0.35:-0.35) : 0), 0)); } spring.set(pts);
      if (hist.length > 1) graph.set(hist.map((hx,i)=>V(hx, 1 + (hist.length-1-i)/30, -3)));
      return {c, zeta:p.zeta, x, v};
    }};
  },
  readout:(p,o)=>[['damping c = 2ζ√k', f(o.c,1)],['behaviour', o.zeta < 0.95 ? 'bouncy (underdamped)' : o.zeta <= 1.05 ? 'fastest, no bounce (critical)' : 'sluggish (overdamped)','acc'],['velocity', f(o.v,1)]],
  code:(p,o)=>`local STIFFNESS = ${p.k}
local DAMPING = 2 * ${f(p.zeta)} * math.sqrt(STIFFNESS)   -- damping ratio ${f(p.zeta)} → ${f(o.c,1)}

local position, velocity = 0, 0
RunService.RenderStepped:Connect(function(dt)
    local force = -STIFFNESS * (position - goal) - DAMPING * velocity
    velocity += force * dt
    position += velocity * dt
    frame.Position = UDim2.fromScale(0.5 + position / 100, 0.5)
end)
-- works the same with Vector3 positions and velocities`,
  body:`<p>A spring pulls toward the goal harder the further away it is (<b>stiffness</b>), while friction slows it down (<b>damping</b>). Step those two forces every frame and you get motion with weight: it overshoots, wobbles and settles.</p>
<p>The <b>damping ratio</b> is the easiest knob. Below 1 it bounces, exactly 1 arrives as fast as possible without overshooting, above 1 it creeps in slowly. The trace behind shows the position over time: the wobble you see is the ratio at work.</p>`,
  uses:[`<b>Juicy UI</b>: buttons that pop and settle, menus that wobble into place.`,
        `<b>Cameras</b> that lag behind and catch up with a little bounce.`,
        `<b>Weapon sway, antenna wobble and jelly effects.</b>`],
  gotchas:[`Very stiff springs with big frame times can blow up. Split <code>dt</code> into smaller steps when stiffness is high.`,
           `Unlike lerp smoothing, a spring keeps velocity, so it reacts naturally when the goal moves mid-flight.`]
});

demo({
  id:'m-growth', title:'Level curves: XP per level', short:'base · growth^(level − 1)', sig:'xpNeeded(level) = base * growth ^ (level - 1)   ·   level from XP with math.log',
  view:{theta:0.0, phi:1.25, r:24, ty:4}, env:'grid',
  params:[S('curve','Curve',[['exp','Exponential'],['poly','Power (level ^ p)'],['lin','Linear']],'exp'), R('base','XP for level 2',50,500,10,100), R('g','Growth per level',1.03,1.4,0.01,1.15), R('pw','Power',1.1,3,0.1,1.6), R('xp','Player total XP',0,100000,100,12000)],
  setup(K){
    const bars = Array.from({length:30}, ()=>K.add(new THREE.Mesh(G.box, K.mat('--part'))));
    const on = K.mat('--accent'), off = K.mat('--part'), next = K.mat('--vb');
    K.label('level 1','--muted').at(V(-10,-0.5,0)); K.label('level 30','--muted').at(V(10,-0.5,0));
    const lt = K.label('','--muted'), lc = K.label('','--accent','big');
    return {update(p){
      const need = L=> p.curve==='exp' ? p.base*Math.pow(p.g, L-1) : p.curve==='poly' ? p.base*Math.pow(L, p.pw) : p.base*L;
      const arr = []; for (let L=1;L<=30;L++) arr.push(need(L)); const mx = arr[29];
      let total = 0, level = 1; for (let L=1;L<=30;L++){ if (total + arr[L-1] <= p.xp){ total += arr[L-1]; level = L+1; } else break; }
      level = Math.min(level, 31);
      arr.forEach((v,i)=>{ const h = Math.max(0.03, v/mx*8), m = bars[i]; m.scale.set(0.5,h,0.5); m.position.set(-10 + i*20/29, h/2, 0);
        m.material = i+1 < level ? on : i+1 === level ? next : off; });
      lt.at(V(10, 8.6, 0)).text(`${Math.round(mx).toLocaleString()} XP`);
      const cb = bars[Math.min(level,30)-1]; lc.at(cb.position.clone().setY(cb.scale.y + 0.7)).text(level > 30 ? 'max level' : `level ${level}`);
      const toNext = level <= 30 ? arr[level-1] - (p.xp - total) : 0;
      return {level, toNext, mx, sum30:arr.reduce((a,b)=>a+b,0), l2:arr[0]};
    }};
  },
  readout:(p,o)=>[['player level', o.level > 30 ? '31 (max)' : String(o.level),'acc'],['XP to next level', o.level > 30 ? '-' : Math.round(o.toNext).toLocaleString()],['XP for the last level', Math.round(o.mx).toLocaleString()],['total XP for level 31', Math.round(o.sum30).toLocaleString()]],
  code:(p,o)=>p.curve==='exp' ? `local BASE, GROWTH = ${p.base}, ${f(p.g)}

local function xpToNext(level)               -- XP needed to go from level to level + 1
    return BASE * GROWTH ^ (level - 1)
end

-- total XP to reach a level, and the reverse (no loop needed)
local function totalXpFor(level)
    return BASE * (GROWTH ^ (level - 1) - 1) / (GROWTH - 1)
end
local function levelFromXp(xp)
    return math.floor(math.log(xp * (GROWTH - 1) / BASE + 1) / math.log(GROWTH)) + 1
end
print(levelFromXp(${p.xp}))   --> ${Math.min(o.level,31)}` : `local BASE${p.curve==='poly' ? `, POWER = ${p.base}, ${f(p.pw)}` : ` = ${p.base}`}

local function xpToNext(level)
    return ${p.curve==='poly' ? 'math.floor(BASE * level ^ POWER)' : 'BASE * level'}
end

local function levelFromXp(xp)
    local level = 1
    while xp >= xpToNext(level) do
        xp -= xpToNext(level)
        level += 1
    end
    return level
end
print(levelFromXp(${p.xp}))   --> ${Math.min(o.level,31)}`,
  body:`<p>How much XP each level costs decides how a game feels over weeks. <b>Linear</b> curves get boring because the reward never changes. <b>Exponential</b> curves multiply by the same growth each level: fast early levels, then a long climb. <b>Power</b> curves sit in between.</p>
<p>Each bar is the XP needed for one level. Drag the player's total XP and watch which level they reach. Even a 1.15 growth makes level 30 cost about 57 times more than level 2. For exponential curves, <code>math.log</code> turns total XP straight back into a level without a loop.</p>`,
  uses:[`<b>Player levels, pet levels and battle passes.</b>`,
        `<b>Upgrade prices</b> in tycoons and simulators (cost × 1.15 each purchase).`,
        `<b>Enemy health scaling</b> by wave.`],
  gotchas:[`Exponential costs grow very fast. Check the last level's cost before shipping, or players hit a wall.`,
           `Round costs (<code>math.floor</code>) before showing them, and do the maths on the server.`]
});
}
})();
