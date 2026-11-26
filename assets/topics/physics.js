(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, vs, CF, G, R, S, T, clamp} = Lab;
const demo = Lab.subject({
  id:'physics', title:'Physics simulation', glyph:'phys', level:'Advanced',
  blurb:'Write your own physics: integrators, bounces with friction, momentum in collisions, and Verlet ropes.'
});

demo({
  id:'ph-integrators', title:'Integrators: Euler vs Verlet', short:'how you step matters', sig:'Euler: p += v·dt, v += a·dt   ·   semi-implicit: v first   ·   Verlet: average the accelerations', time:true,
  view:{theta:0.0, phi:0.45, r:26, ty:0},
  params:[S('dt','Time step',[['0.0167','1/60 s'],['0.05','1/20 s'],['0.125','1/8 s (laggy)']],'0.05'), R('speed','Simulation speed',0.5,4,0.5,2)],
  setup(K){
    const GM = 120, r0 = 6, O = V(0,1,0); K.point('--accent',0.6).position.copy(O); K.ring(r0,'--muted',{dashed:true, y:1});
    const kinds = [['euler','--bad','explicit Euler'],['semi','--va','semi-implicit Euler'],['verlet','--accent','velocity Verlet']];
    const bodies = kinds.map(([, c])=>K.point(c,0.32)), trails = kinds.map(([, c])=>K.line(c,{max:500, opacity:0.75})), labels = kinds.map(([, c, n])=>K.label(n, c));
    const acc = p=>{ const d = O.clone().sub(p), r = d.length(); return d.multiplyScalar(GM/(r*r*r)); };
    const energy = (p,v)=>0.5*v.lengthSq() - GM/p.distanceTo(O);
    let st = null, last = 0, bank = 0, E0 = 0, hist = [[],[],[]], key = '';
    const reset = ()=>{ const p0 = V(r0,1,0), v0 = V(0,0,-Math.sqrt(GM/r0)); st = kinds.map(()=>({p:p0.clone(), v:v0.clone()})); E0 = energy(p0,v0); hist = [[],[],[]]; };
    return {update(p,t){
      const dt = +p.dt; if (key !== p.dt){ key = p.dt; reset(); }
      let gap = t - last; last = t; if (gap < 0 || gap > 0.25) gap = 0; bank += gap*p.speed;
      while (bank >= dt){ bank -= dt;
        st.forEach((s,i)=>{
          if (i===0){ const a = acc(s.p); s.p.addScaledVector(s.v, dt); s.v.addScaledVector(a, dt); }
          else if (i===1){ s.v.addScaledVector(acc(s.p), dt); s.p.addScaledVector(s.v, dt); }
          else { const a = acc(s.p); s.p.addScaledVector(s.v, dt).addScaledVector(a, 0.5*dt*dt); const a2 = acc(s.p); s.v.addScaledVector(a.add(a2), 0.5*dt); }
          hist[i].push(s.p.clone()); if (hist[i].length > 500) hist[i].shift();
        });
        if (st[0].p.distanceTo(O) > 18 || st.some(s=>s.p.distanceTo(O) < 0.5)) reset();
      }
      st.forEach((s,i)=>{ bodies[i].position.copy(s.p); if (hist[i].length > 1) trails[i].set(hist[i]); labels[i].at(s.p.clone().add(V(0,0.7,0))); });
      return {drift: st.map(s=>(energy(s.p,s.v)-E0)/Math.abs(E0)*100)};
    }};
  },
  readout:(p,o)=>[['energy drift: Euler', f(o.drift[0],1)+'%', Math.abs(o.drift[0]) > 5 ? 'bad' : ''],['semi-implicit', f(o.drift[1],1)+'%'],['Verlet', f(o.drift[2],1)+'%','acc']],
  code:(p,o)=>`local dt = ${p.dt === '0.0167' ? '1/60' : p.dt === '0.05' ? '1/20' : '1/8'}

-- explicit Euler: uses the OLD velocity to move. Gains energy, spirals out.
position += velocity * dt
velocity += acceleration(position) * dt

-- semi-implicit (symplectic) Euler: update velocity FIRST. Stable, cheap, what most games use.
velocity += acceleration(position) * dt
position += velocity * dt

-- velocity Verlet: average the old and new acceleration. More accurate at big steps.
local a = acceleration(position)
position += velocity * dt + 0.5 * a * dt * dt
local a2 = acceleration(position)
velocity += 0.5 * (a + a2) * dt`,
  body:`<p>Every custom physics loop is an <b>integrator</b>: a rule for turning acceleration into new velocity and position each step. They look almost the same, but they behave very differently. Each ball starts on the same circular orbit around the sun.</p>
<p><b>Explicit Euler</b> (red) moves with the old velocity and slowly gains energy, so the orbit spirals outward. Just swapping the two lines gives <b>semi-implicit Euler</b> (teal), which stays on a stable orbit. <b>Verlet</b> (orange) averages two accelerations and stays accurate even at big steps. Set the time step to 1/8 s to exaggerate the differences.</p>`,
  uses:[`<b>Custom projectiles, orbits and space games.</b>`,
        `<b>Springs and soft bodies</b> that shouldn't explode.`,
        `<b>Server-side simulation</b> where you control the step size.`],
  gotchas:[`Use a fixed time step (accumulate <code>dt</code> and step in fixed chunks) so results don't depend on frame rate.`,
           `If something "explodes" in your sim, try semi-implicit Euler first. It's usually a one-line fix.`]
});

demo({
  id:'ph-bounce', title:'Bounces: restitution and friction', short:'split velocity along the normal', sig:'vN = n·(v·n),  vT = v − vN,  v′ = vT·friction − vN·restitution', time:true,
  view:{theta:0.0, phi:1.2, r:24, ty:3},
  params:[R('tilt','Ramp angle',0,45,1,20,'°'), R('e','Restitution (bounciness)',0,1,0.05,0.7), R('mu','Friction',0,1,0.05,0.2)],
  setup(K){
    const ramp = K.part(V(26,0.4,6),'--part',{front:false}), ball = K.point('--accent',0.5), trail = K.line('--accent',{dashed:true, max:400, opacity:0.6}), vA = K.arrow('--va',{thick:0.05}), nA = K.arrow('--y',{thick:0.05});
    const lab = K.label('','--ink');
    return {update(p,t){
      const th = p.tilt*D2R, n = V(Math.sin(th), Math.cos(th), 0), r = 0.5, g = V(0,-30,0);
      ramp.setCF(CF.mul(CF.angles(0,0,-th), CF.new(0,-0.2,0)));
      const tau = t % 6, steps = Math.floor(tau*240), h = 1/240; const pos = V(-8,9,0), vel = V(3,0,0), pts = [pos.clone()]; let bounces = 0;
      for (let i=0;i<steps;i++){
        vel.addScaledVector(g,h); pos.addScaledVector(vel,h);
        const d = pos.dot(n) - r;
        if (d < 0){ pos.addScaledVector(n,-d); const vn = vel.dot(n);
          if (vn < 0){ const vN = n.clone().multiplyScalar(vn), vT = vel.clone().sub(vN), tl = vT.length(), drop = p.mu*(1+p.e)*Math.abs(vn);
            vT.multiplyScalar(tl > 1e-6 ? Math.max(0, 1 - drop/tl) : 0); vel.copy(vT).addScaledVector(vN, -p.e); if (Math.abs(vn) > 2) bounces++; } }
        if (i % 6 === 0) pts.push(pos.clone());
      }
      ball.position.copy(pos); trail.set(pts); vA.set(pos, vel.clone().multiplyScalar(0.15));
      const contact = pos.clone().addScaledVector(n,-r); nA.set(contact, n.clone().multiplyScalar(1.4));
      lab.at(pos.clone().add(V(0,1,0))).text(`${f(vel.length(),1)} studs/s`);
      return {bounces, speed:vel.length()};
    }};
  },
  readout:(p,o)=>[['bounces so far', String(o.bounces),'acc'],['speed', f(o.speed,1)+' studs/s'],['energy kept per bounce', f(p.e*p.e*100,0)+'% of the bouncing part']],
  code:(p,o)=>`local RESTITUTION, FRICTION = ${f(p.e)}, ${f(p.mu)}

local function bounce(velocity, normal)
    local vn = velocity:Dot(normal)
    if vn >= 0 then return velocity end              -- already moving away
    local vN = normal * vn                            -- the part going into the surface
    local vT = velocity - vN                          -- the part sliding along it
    -- friction removes some sliding speed, more for harder hits
    local slide = vT.Magnitude
    if slide > 0 then
        vT *= math.max(0, 1 - FRICTION * (1 + RESTITUTION) * math.abs(vn) / slide)
    end
    return vT - vN * RESTITUTION                     -- flip and shrink the into-surface part
end

local result = workspace:Raycast(ball.Position, velocity * dt, params)
if result then
    velocity = bounce(velocity, result.Normal)
end`,
  body:`<p>When a ball hits a surface, split its velocity in two using the surface normal: the part going <b>into</b> the surface and the part <b>sliding along</b> it. Reverse the first part and scale it by the <b>restitution</b> (1 = perfect bounce, 0 = no bounce). Reduce the second part with <b>friction</b>.</p>
<p>That's the whole trick, and it's the reflection formula from Vector maths with two dials added. Lower the restitution and the bounces die out fast; raise friction and the ball stops rolling down the ramp. Each run restarts every six seconds.</p>`,
  uses:[`<b>Bouncing grenades, balls and loot drops</b> with your own physics.`,
        `<b>Pinball, mini-golf and pool</b>, where you want exact control.`,
        `<b>Character knockback</b> off walls.`],
  gotchas:[`Push the object back out of the surface before bouncing, or it stays inside and bounces every frame.`,
           `Very small bounces never quite stop. Treat speeds below a threshold as resting.`]
});

demo({
  id:'ph-collide', title:'Collisions and momentum', short:'impulse along the contact normal', sig:'j = (1 + e)·(v₁ − v₂)·n / (1/m₁ + 1/m₂)', time:true,
  view:{theta:0.0, phi:0.55, r:24, ty:0},
  params:[R('m1','Mass of A',0.5,5,0.25,1), R('m2','Mass of B',0.5,5,0.25,3), R('e','Restitution',0,1,0.05,0.9), R('off','Aim offset (glancing)',-1.5,1.5,0.05,0.6)],
  setup(K){
    const A = K.point('--va',1), B = K.point('--vb',1), tA = K.line('--va',{dashed:true, max:300}), tB = K.line('--vb',{dashed:true, max:300}), aA = K.arrow('--va',{thick:0.05}), aB = K.arrow('--vb',{thick:0.05});
    const lA = K.label('A','--va','big'), lB = K.label('B','--vb','big');
    return {update(p,t){
      const rA = 0.6*Math.cbrt(p.m1), rB = 0.6*Math.cbrt(p.m2); A.scale.setScalar(rA); B.scale.setScalar(rB);
      const pa = V(-9,rA,p.off), pb = V(0,rB,0), va = V(7,0,0), vb = V(0,0,0), pre = va.clone().multiplyScalar(p.m1).add(vb.clone().multiplyScalar(p.m2)), keBefore = 0.5*p.m1*va.lengthSq();
      const tau = t % 5, steps = Math.floor(tau*240), h = 1/240, ha = [pa.clone()], hb = [pb.clone()];
      for (let i=0;i<steps;i++){
        pa.addScaledVector(va,h); pb.addScaledVector(vb,h);
        const d = pb.clone().sub(pa); d.y = 0; const dist = d.length();
        if (dist < rA + rB && dist > 1e-6){ const n = d.divideScalar(dist), rel = va.clone().sub(vb).dot(n);
          if (rel > 0){ const j = (1+p.e)*rel/(1/p.m1 + 1/p.m2); va.addScaledVector(n, -j/p.m1); vb.addScaledVector(n, j/p.m2); }
          const push = (rA + rB - dist)/2; pa.addScaledVector(n,-push); pb.addScaledVector(n,push); }
        if (i % 4 === 0){ ha.push(pa.clone()); hb.push(pb.clone()); }
      }
      A.position.copy(pa); B.position.copy(pb); tA.set(ha.slice(-300)); tB.set(hb.slice(-300));
      aA.set(pa.clone().add(V(0,rA+0.3,0)), va.clone().multiplyScalar(0.35)); aB.set(pb.clone().add(V(0,rB+0.3,0)), vb.clone().multiplyScalar(0.35));
      lA.at(pa.clone().add(V(0,rA*2+0.4,0))); lB.at(pb.clone().add(V(0,rB*2+0.4,0)));
      const post = va.clone().multiplyScalar(p.m1).add(vb.clone().multiplyScalar(p.m2)), keAfter = 0.5*p.m1*va.lengthSq() + 0.5*p.m2*vb.lengthSq();
      return {pre, post, keBefore, keAfter, va, vb};
    }};
  },
  readout:(p,o)=>[['momentum before', vs(o.pre)],['momentum now', vs(o.post),'acc'],['kinetic energy kept', f(o.keAfter/o.keBefore*100,0)+'%'],['A / B velocity', `${vs(o.va)} / ${vs(o.vb)}`]],
  code:(p,o)=>`local RESTITUTION = ${f(p.e)}

local function collide(a, b)            -- tables with Position, Velocity, Mass, Radius
    local offset = b.Position - a.Position
    local distance = offset.Magnitude
    if distance >= a.Radius + b.Radius then return end
    local n = offset / distance
    local approaching = (a.Velocity - b.Velocity):Dot(n)
    if approaching <= 0 then return end              -- already separating

    local j = (1 + RESTITUTION) * approaching / (1 / a.Mass + 1 / b.Mass)
    a.Velocity -= n * (j / a.Mass)
    b.Velocity += n * (j / b.Mass)

    -- push them apart so they don't stay overlapped
    local overlap = a.Radius + b.Radius - distance
    a.Position -= n * (overlap / 2)
    b.Position += n * (overlap / 2)
end`,
  body:`<p>When two objects hit, they push on each other equally along the line between their centres. That push is an <b>impulse</b>: it changes each velocity by the same amount divided by its mass. Heavy objects barely change; light ones fly off. The total <b>momentum</b> (mass × velocity) is the same before and after; check the readout.</p>
<p>Restitution decides how much bounce survives: 1 keeps all the energy, 0 makes them stick together. Make A light and B heavy and A rebounds; swap them and A barely slows down. Offset the aim for a glancing hit: the push only acts along the contact normal, so B shoots off at an angle.</p>`,
  uses:[`<b>Billiards, bumper cars and marble games.</b>`,
        `<b>Knockback</b> that respects size: big enemies shove small players.`,
        `<b>Custom physics</b> on the server where Roblox physics is too unpredictable.`],
  gotchas:[`Only apply the impulse when the objects are moving toward each other, or they can get stuck together.`,
           `Fast objects can pass through each other between steps. Use smaller steps or a swept test.`]
});

demo({
  id:'ph-rope', title:'Verlet ropes and bridges', short:'points + distance constraints', sig:'pos += (pos − prev) + a·dt²,  then fix every segment length a few times', time:true,
  view:{theta:0.0, phi:1.2, r:24, ty:5},
  params:[R('n','Segments',5,30,1,16), R('iter','Constraint passes',1,20,1,8), T('bridge','Pin both ends (bridge)',false), T('wind','Wind',false), R('slack','Rope length',0.8,1.6,0.05,1.1)],
  setup(K){
    const A = V(-7,8.5,0), B = V(7,8.5,0); K.part(V(0.8,0.8,0.8),'--ink',{front:false}).position.copy(A); const pinB = K.part(V(0.8,0.8,0.8),'--ink',{front:false}); pinB.position.copy(B);
    const line = K.line('--accent',{max:31}), nodes = Array.from({length:31}, ()=>K.point('--accent',0.14)), weight = K.point('--vb',0.4);
    let pts = null, prev = null, key = '', last = 0, bank = 0;
    return {update(p,t){
      const n = p.n, total = A.distanceTo(B)*p.slack, seg = total/n, k = [n,p.bridge,p.slack].join('|');
      if (k !== key){ key = k; pts = []; prev = []; for (let i=0;i<=n;i++){ const q = A.clone().lerp(B, i/n); pts.push(q); prev.push(q.clone()); } }
      pinB.visible = p.bridge;
      let gap = t - last; last = t; if (gap < 0 || gap > 0.25) gap = 0; bank += gap; const h = 1/120;
      while (bank >= h){ bank -= h;
        const wind = p.wind ? V(Math.sin(t*1.3)*6, 0, Math.cos(t*0.9)*9) : V();
        for (let i=1;i<=n;i++){ if (p.bridge && i===n) continue; const cur = pts[i], vel = cur.clone().sub(prev[i]).multiplyScalar(0.995); prev[i].copy(cur); cur.add(vel).add(V(0,-30,0).add(wind).multiplyScalar(h*h)); }
        for (let it=0; it<p.iter; it++){
          pts[0].copy(A); if (p.bridge) pts[n].copy(B);
          for (let i=0;i<n;i++){ const a = pts[i], b = pts[i+1], d = b.clone().sub(a), L = d.length() || 1e-6, diff = (L - seg)/L;
            const aFixed = i===0, bFixed = p.bridge && i+1===n; const wa = aFixed ? 0 : (bFixed ? 1 : 0.5), wb = bFixed ? 0 : (aFixed ? 1 : 0.5);
            a.addScaledVector(d, diff*wa); b.addScaledVector(d, -diff*wb); }
        }
      }
      line.set(pts); nodes.forEach((m,i)=>{ m.visible = i <= n; if (i <= n) m.position.copy(pts[i]); }); weight.visible = !p.bridge; weight.position.copy(pts[n]);
      let stretch = 0; for (let i=0;i<n;i++) stretch = Math.max(stretch, Math.abs(pts[i].distanceTo(pts[i+1]) - seg)/seg);
      return {stretch, seg};
    }};
  },
  readout:(p,o)=>[['segment length', f(o.seg,2)],['worst stretch', f(o.stretch*100,1)+'%', o.stretch > 0.05 ? 'bad' : 'ok']],
  code:(p,o)=>`local SEGMENTS, PASSES, SEG = ${p.n}, ${p.iter}, ${f(o.seg,2)}
local GRAVITY = Vector3.new(0, -workspace.Gravity, 0)
local points, previous = {}, {}     -- filled with SEGMENTS + 1 positions

local function step(dt)
    -- 1. Verlet: velocity is how far each point moved last step
    for i = 2, #points do
        local velocity = points[i] - previous[i]
        previous[i] = points[i]
        points[i] += velocity * 0.995 + GRAVITY * dt * dt
    end
    -- 2. constraints: pull every pair back to the right distance, several times
    for _ = 1, PASSES do
        points[1] = anchor.Position${p.bridge ? `
        points[#points] = otherAnchor.Position` : ''}
        for i = 1, #points - 1 do
            local delta = points[i + 1] - points[i]
            local fix = delta * ((delta.Magnitude - SEG) / delta.Magnitude) * 0.5
            points[i] += fix
            points[i + 1] -= fix
        end
    end
end`,
  body:`<p>Verlet physics stores each point's <b>current and previous position</b> instead of a velocity. The velocity is just how far it moved last step, so a point keeps moving the same way plus gravity. Then <b>constraints</b> fix the rope: walk along every pair of neighbours and nudge them back to the right distance.</p>
<p>One pass leaves the rope stretchy; more passes make it stiffer, because each fix slightly upsets the neighbours. Drop the passes to 1 and watch it sag like elastic. Pin both ends for a rope bridge, and turn on wind to see it sway. The same idea gives cloth (a grid of points) and soft bodies.</p>`,
  uses:[`<b>Ropes, chains, vines and grappling hooks.</b>`,
        `<b>Rope bridges and hanging cables</b> that react to wind.`,
        `<b>Cloth</b>: flags, capes and curtains as a grid of points.`],
  gotchas:[`Roblox's <code>RopeConstraint</code> handles simple physical ropes. Use Verlet for visual ropes you control fully, or thousands of points.`,
           `Run the simulation with a fixed time step, or it behaves differently at different frame rates.`]
});
})();
