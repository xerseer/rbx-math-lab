(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, vs, CF, G, R, S, T, clamp} = Lab;
const {graph, inst, labels, bone} = Lab.kit2;
const demo = Lab.subject({
  id:'trig', title:'Trigonometry', glyph:'tri',
  blurb:'The unit circle, radians, right triangles, slopes, waves, spirals and rotation: the angle maths behind most game motion.'
});
const circlePts = (c, r, a0, a1, n=96)=>{ const p=[]; for (let i=0;i<=n;i++){ const a=a0+(a1-a0)*i/n; p.push(V(c.x+Math.cos(a)*r, c.y+Math.sin(a)*r, c.z)); } return p; };

demo({
  id:'trig-unit', title:'The unit circle', short:'cos = x, sin = y', sig:'point on a circle = (math.cos(angle), math.sin(angle)) × radius',
  view:{theta:0, phi:1.35, r:17, ty:4.5},
  params:[R('a','Angle',0,360,1,40,'°')],
  setup(K){
    const Cn = V(0,4.5,0), Rr = 4; K.line('--muted',{max:97}).set(circlePts(Cn,Rr,0,Math.PI*2));
    K.line('--muted',{dashed:true}).set(V(-5,4.5,0),V(5,4.5,0)); K.line('--muted',{dashed:true}).set(V(0,0,0),V(0,9,0));
    [['+,+',45],['−,+',135],['−,−',225],['+,−',315]].forEach(([t,a])=>K.label(`cos ${t.split(',')[0]} sin ${t.split(',')[1]}`,'--muted','tiny').at(V(Math.cos(a*D2R)*5.3, 4.5+Math.sin(a*D2R)*5.3, 0)));
    const rad = K.line('--ink'), cx = K.line('--x'), sy = K.line('--y'), pt = K.point('--accent',0.25), arc = K.line('--accent',{max:97});
    const lc = K.label('','--x','big'), ls = K.label('','--y','big');
    return {update(p){
      const a = p.a*D2R, P = V(Cn.x+Math.cos(a)*Rr, Cn.y+Math.sin(a)*Rr, 0);
      rad.set(Cn,P); cx.set(Cn, V(P.x,Cn.y,0)); sy.set(V(P.x,Cn.y,0), P); pt.position.copy(P); arc.set(circlePts(Cn,1.1,0,a));
      lc.at(V((Cn.x+P.x)/2, Cn.y-0.45, 0)).text(`cos ${f(Math.cos(a))}`); ls.at(V(P.x+(Math.cos(a)>=0?0.9:-0.9), (Cn.y+P.y)/2, 0)).text(`sin ${f(Math.sin(a))}`);
      return {a};
    }};
  },
  readout:(p,o)=>[['math.cos', f(Math.cos(o.a),3),'acc'],['math.sin', f(Math.sin(o.a),3),'acc'],['math.tan', Math.abs(Math.cos(o.a))<1e-6 ? '±∞' : f(Math.tan(o.a),3)],['radians', f(o.a,3)]],
  code:(p,o)=>`local angle = math.rad(${p.a})
local x = math.cos(angle)     --> ${f(Math.cos(o.a),3)}   how far right
local y = math.sin(angle)     --> ${f(Math.sin(o.a),3)}   how far up
-- x*x + y*y is always 1: the point is always on the circle

local RADIUS = 4
marker.Position = center + Vector3.new(x * RADIUS, y * RADIUS, 0)`,
  body:`<p>Picture a circle of radius 1. Walk around it by some angle, starting from the right-hand side and going anticlockwise. Where you end up, <b>cos</b> is how far right you are and <b>sin</b> is how far up. That's all sin and cos are.</p>
<p>The four quarters tell you the signs: on the left cos is negative, below the middle sin is negative. Multiply both by a radius and you have a point on any circle. Every orbit, ring and wave in the other subjects starts here.</p>`,
  uses:[`<b>Placing things on circles</b> and arcs.`,`<b>Turning an angle into a direction</b>, for aiming and movement.`,`<b>Waves and bobbing</b>, by feeding time in as the angle.`],
  gotchas:[`Angles are radians. <code>math.sin(90)</code> is not 1; <code>math.sin(math.rad(90))</code> is.`,`In Roblox's flat XZ plane the second axis is Z, which points toward the camera, so circles can look like they go the "wrong" way. Swap the sign of Z if needed.`]
});

demo({
  id:'trig-radians', title:'Degrees and radians', short:'arc length = radius × angle', sig:'radians = degrees × π / 180   ·   arc length = r × θ',
  view:{theta:0, phi:1.35, r:18, ty:4},
  params:[R('deg','Angle',0,360,1,57.3,'°'), R('r','Radius',1,5,0.25,4)],
  setup(K){
    const Cn = V(0,4,0), circ = K.line('--muted',{max:97}), arc = K.line('--accent',{max:97}), r1 = K.line('--ink'), r2 = K.line('--ink'), ruler = K.line('--vb'), la = K.label('','--accent','big'), lr = K.label('','--vb');
    return {update(p){
      const th = p.deg*D2R; circ.set(circlePts(Cn,p.r,0,Math.PI*2)); arc.set(circlePts(Cn,p.r,0,th));
      r1.set(Cn, V(Cn.x+p.r,Cn.y,0)); r2.set(Cn, V(Cn.x+Math.cos(th)*p.r, Cn.y+Math.sin(th)*p.r, 0));
      ruler.set(V(Cn.x+p.r+0.6, Cn.y, 0), V(Cn.x+p.r+0.6, Cn.y+p.r, 0)); lr.at(V(Cn.x+p.r+1.6, Cn.y+p.r/2, 0)).text(`radius ${f(p.r)}`);
      la.at(V(Cn.x+Math.cos(th/2)*(p.r+0.9), Cn.y+Math.sin(th/2)*(p.r+0.9), 0)).text(`arc ${f(p.r*th)}`);
      return {th};
    }};
  },
  readout:(p,o)=>[['degrees', f(p.deg,1)+'°'],['radians', f(o.th,3),'acc'],['arc length r·θ', f(p.r*o.th,2)],['arcs per radius', f(o.th,2)]],
  code:(p,o)=>`print(math.rad(${p.deg}))     --> ${f(o.th,4)}
print(math.deg(${f(o.th,4)}))   --> ${f(p.deg,1)}
print(math.pi)           --> 3.1416  (180 degrees)

-- distance travelled around a wheel of radius ${p.r} turning ${f(o.th,2)} radians
local arcLength = ${p.r} * ${f(o.th,3)}       --> ${f(p.r*o.th,2)} studs`,
  body:`<p>One <b>radian</b> is the angle where the arc around the circle is exactly as long as the radius. Set the angle to 57.3° and the orange arc matches the pink ruler. A full circle is 2π radians (about 6.28), half a circle is π.</p>
<p>Radians make the maths simple: the arc length is just <code>radius × angle</code>. That's why Roblox's <code>math.sin</code>, <code>CFrame.Angles</code> and friends all use radians. Convert with <code>math.rad</code> and <code>math.deg</code> at the edges, when reading settings or showing angles to players.</p>`,
  uses:[`<b>Rolling wheels</b>: spin angle = distance moved ÷ radius.`,`<b>Arc lengths</b> for curved paths and orbits.`,`<b>Converting</b> designer-friendly degrees into maths-friendly radians.`],
  gotchas:[`<code>part.Orientation</code> is in degrees; <code>CFrame.Angles</code> is in radians. Mixing them up is the most common angle bug.`]
});

demo({
  id:'trig-sohcahtoa', title:'Right triangles: SOH CAH TOA', short:'opposite, adjacent, hypotenuse', sig:'sin = opp/hyp,  cos = adj/hyp,  tan = opp/adj',
  view:{theta:0, phi:1.35, r:18, ty:3.5},
  params:[R('a','Ramp angle',5,80,1,30,'°'), R('L','Ramp length',2,12,0.5,10)],
  setup(K){
    const O = V(-5,0.5,0), hyp = bone(K,'--accent',0.15), adj = bone(K,'--x',0.1), opp = bone(K,'--y',0.1), ramp = K.part(V(1,0.3,2),'--part',{front:false});
    const lh = K.label('','--accent','big'), la = K.label('','--x'), lo = K.label('','--y'), lt = K.label('','--ink');
    return {update(p){
      const a = p.a*D2R, A = O.clone(), B = V(O.x + Math.cos(a)*p.L, O.y, 0), Cc = V(B.x, O.y + Math.sin(a)*p.L, 0);
      hyp.set(A,Cc); adj.set(A,B); opp.set(B,Cc);
      ramp.resize(V(p.L,0.3,2)); ramp.setCF(CF.mul(CF.at(A.clone().lerp(Cc,0.5).add(V(0,0,-1.6))), CF.angles(0,0,a)));
      lh.at(A.clone().lerp(Cc,0.5).add(V(-0.6,0.6,0))).text(`hyp ${f(p.L)}`); la.at(A.clone().lerp(B,0.5).add(V(0,-0.5,0))).text(`adj ${f(Math.cos(a)*p.L)}`); lo.at(B.clone().lerp(Cc,0.5).add(V(1.2,0,0))).text(`opp ${f(Math.sin(a)*p.L)}`);
      lt.at(A.clone().add(V(1.3,0.35,0))).text(`${p.a}°`);
      return {adj:Math.cos(a)*p.L, opp:Math.sin(a)*p.L};
    }};
  },
  readout:(p,o)=>[['height (opp = L·sin)', f(o.opp,2),'acc'],['ground covered (adj = L·cos)', f(o.adj,2)],['back to the angle', f(Math.atan2(o.opp,o.adj)/D2R,1)+'°']],
  code:(p,o)=>`local LENGTH, ANGLE = ${p.L}, math.rad(${p.a})

local height = LENGTH * math.sin(ANGLE)     --> ${f(o.opp,2)}   SOH: opposite = sin × hypotenuse
local run    = LENGTH * math.cos(ANGLE)     --> ${f(o.adj,2)}   CAH: adjacent = cos × hypotenuse

-- the other way: from height and run back to the angle and length
local angle = math.atan2(height, run)        --> ${f(p.a,0)}°
local length = math.sqrt(height ^ 2 + run ^ 2)

ramp.Size = Vector3.new(LENGTH, 0.4, 6)
ramp.CFrame = CFrame.new(base + Vector3.new(run / 2, height / 2, 0)) * CFrame.Angles(0, 0, ANGLE)`,
  body:`<p>In a right-angled triangle, the long sloped side is the <b>hypotenuse</b>, the side next to your angle is <b>adjacent</b>, and the one across from it is <b>opposite</b>. SOH CAH TOA is the memory aid: Sin = Opposite / Hypotenuse, Cos = Adjacent / Hypotenuse, Tan = Opposite / Adjacent.</p>
<p>For a ramp, it answers "how high does a 10-stud ramp at 30° reach?" (sin) and "how much floor does it cover?" (cos). Going the other way, <code>math.atan2(height, run)</code> turns two sides back into the angle.</p>`,
  uses:[`<b>Building ramps and stairs</b> that reach an exact height.`,`<b>Jump pads</b>: split a launch speed into up and forward parts.`,`<b>Ladders and ropes</b> leaning against walls.`],
  gotchas:[`These rules only work for triangles with a 90° corner. For any triangle, use the law of cosines (see Kinematics & IK).`]
});

demo({
  id:'trig-tan', title:'Slopes and tan', short:'tan = rise / run', sig:'slope angle = math.atan(rise / run)   ·   rise = run × math.tan(angle)',
  view:{theta:0.25, phi:1.2, r:18, ty:2.5},
  params:[R('rise','Rise',0,10,0.25,3), R('run','Run',1,12,0.25,8), R('limit','Steepest walkable',10,80,1,45,'°')],
  setup(K){
    const ramp = K.part(V(1,0.4,4),'--part',{front:false}), rL = K.line('--y'), uL = K.line('--x'), lab = K.label('','--ink','big'), walker = K.part(V(0.8,1.6,0.8),'--ok',{front:false});
    return {update(p){
      const a = Math.atan(p.rise/p.run), L = Math.hypot(p.rise,p.run), A = V(-p.run/2,0.2,0), B = V(p.run/2,0.2+p.rise,0);
      ramp.resize(V(L,0.4,4)); ramp.setCF(CF.mul(CF.at(A.clone().lerp(B,0.5)), CF.angles(0,0,a)));
      uL.set(V(A.x,0.25,2.3), V(B.x,0.25,2.3)); rL.set(V(B.x,0.25,2.3), V(B.x,B.y,2.3));
      const ok = a/D2R <= p.limit; walker.tint(ok ? '--ok' : '--bad'); walker.setCF(CF.mul(CF.at(A.clone().lerp(B,0.35).add(V(0,1,0))), CF.angles(0,0,0)));
      lab.at(B.clone().add(V(0,1.2,0))).text(`${f(a/D2R,1)}° — ${ok ? 'walkable' : 'too steep'}`);
      return {a, tan:p.rise/p.run, ok};
    }};
  },
  readout:(p,o)=>[['rise ÷ run (tan)', f(o.tan,3)],['angle', f(o.a/D2R,1)+'°','acc'],['grade', f(o.tan*100,0)+'%'],['walkable?', o.ok ? 'yes' : 'no', o.ok ? 'ok' : 'bad']],
  code:(p,o)=>`local rise, run = ${p.rise}, ${p.run}
local angle = math.deg(math.atan(rise / run))     --> ${f(o.a/D2R,1)}°

-- or from a surface normal you hit with a raycast:
local slope = math.deg(math.acos(result.Normal:Dot(Vector3.yAxis)))

-- how high must a ramp rise to be exactly ${p.limit}° over ${p.run} studs?
local neededRise = ${p.run} * math.tan(math.rad(${p.limit}))   --> ${f(p.run*Math.tan(p.limit*D2R),2)}
humanoid.MaxSlopeAngle = ${p.limit}`,
  body:`<p>A slope's steepness is <b>rise over run</b>, how far it goes up for each stud across. That ratio is the tangent of the slope's angle, so <code>math.atan(rise / run)</code> turns it into degrees, and <code>run * math.tan(angle)</code> goes back the other way.</p>
<p>Characters have a steepest walkable angle (<code>Humanoid.MaxSlopeAngle</code>). Change the rise and run and watch the walker turn red when the ramp gets too steep. Road signs often show the same ratio as a percentage grade.</p>`,
  uses:[`<b>Slope limits</b> for walking, building placement and vehicles.`,`<b>Designing ramps</b> that are exactly as steep as you want.`,`<b>Line slopes in 2D</b>: <code>tan</code> converts an angle into "how much y per x".`],
  gotchas:[`<code>math.tan</code> shoots to infinity near 90°. Use <code>math.atan2(rise, run)</code> when run can be 0.`]
});

demo({
  id:'trig-wave', title:'Sine waves: amplitude, frequency, phase', short:'A·sin(2π·f·t + φ)', sig:'y = amplitude * math.sin(2π * frequency * t + phase) + offset', time:true,
  view:{theta:0.35, phi:1.15, r:22, ty:3},
  params:[R('A','Amplitude',0,3,0.1,1.5), R('fq','Frequency',0.1,2,0.05,0.5,' Hz'), R('ph','Phase',0,360,5,0,'°'), R('step','Phase step per part',0,90,5,30,'°')],
  setup(K){
    const gr = graph(K,{x0:-10, y0:3, w:20, h:5, z:-4, xr:[0,4], yr:[-3,3], xLabel:'time (s) →', xTicks:[[0,'0'],[2,'2'],[4,'4']], yTicks:[[3,'3'],[0,'0'],[-3,'-3']]});
    const curve = gr.curve('--accent'), dot = gr.dot('--accent'); gr.hline(0,'--muted');
    const parts = Array.from({length:12}, ()=>K.part(V(1,1,1),'--va',{front:false}));
    return {update(p,t){
      const w = 2*Math.PI*p.fq, ph = p.ph*D2R, fn = x=>p.A*Math.sin(w*x + ph);
      curve.plot(fn); const tt = t % 4; dot.at(tt, fn(tt));
      parts.forEach((m,i)=>{ m.position.set(-8.8 + i*1.6, 1.8 + p.A*Math.sin(w*t + ph - i*p.step*D2R), 2.5); });
      return {y:fn(tt)};
    }};
  },
  readout:(p,o)=>[['value now', f(o.y,2),'acc'],['period', f(1/p.fq,2)+' s'],['peak to peak', f(2*p.A,2)]],
  code:(p,o)=>`local AMPLITUDE, FREQUENCY, PHASE = ${p.A}, ${p.fq}, math.rad(${p.ph})
local STEP = math.rad(${p.step})     -- each part a little behind the one before

RunService.Heartbeat:Connect(function()
    local t = os.clock()
    for i, part in parts do
        local y = AMPLITUDE * math.sin(2 * math.pi * FREQUENCY * t + PHASE - (i - 1) * STEP)
        part.Position = basePositions[i] + Vector3.new(0, y, 0)
    end
end)`,
  body:`<p>Every sine wave has three dials. <b>Amplitude</b> is how far it swings, <b>frequency</b> is how many full swings per second, and <b>phase</b> shifts it along in time, starting it part-way through its swing.</p>
<p>Give each part in a row a slightly bigger phase delay and the bob turns into a <b>travelling wave</b>, like a crowd doing the wave or a flag rippling. Set the phase step to 0 and they all move together; push it up and the wave gets shorter.</p>`,
  uses:[`<b>Bobbing pickups, floating platforms and breathing idle animations.</b>`,`<b>Water, flags and crowd waves</b> with a phase per part.`,`<b>Pulsing lights and UI</b>, using the sine as a brightness or size.`],
  gotchas:[`Use <code>os.clock()</code> or accumulated time, not a frame counter, so the speed is the same at every frame rate.`,`Add an offset to keep values positive, e.g. <code>0.5 + 0.5 * math.sin(...)</code> for 0 to 1.`]
});

demo({
  id:'trig-polar', title:'Polar coordinates: spirals', short:'(r, θ) → (x, z)', sig:'x = r·cos(θ),  z = r·sin(θ)   ·   r = math.sqrt(x² + z²),  θ = math.atan2(z, x)',
  view:{theta:0.6, phi:0.85, r:26, ty:4},
  params:[R('steps','Steps',5,80,1,40), R('turn','Turn per step',5,45,1,20,'°'), R('r0','Start radius',0,6,0.25,2), R('grow','Radius growth per step',0,0.3,0.01,0.1), R('rise','Rise per step',0,0.6,0.02,0.25)],
  setup(K){
    const cubes = inst(K, 80), col = K.part(V(0.6,1,0.6),'--part',{front:false});
    return {update(p){
      cubes.begin(); let top = 0;
      for (let i=0;i<p.steps;i++){ const th = i*p.turn*D2R, r = p.r0 + p.grow*i, y = 0.2 + i*p.rise; top = y;
        const q = new THREE.Quaternion().setFromAxisAngle(UP, -th); cubes.add(V(Math.cos(th)*(r+0.9), y, Math.sin(th)*(r+0.9)), V(2,0.25,0.8), i===p.steps-1 ? '--accent' : '--va', q); }
      cubes.end(); col.resize(V(Math.max(0.3,p.r0*1.4),top+0.5,Math.max(0.3,p.r0*1.4))); col.position.set(0,(top+0.5)/2,0);
      return {last:{r:p.r0+p.grow*(p.steps-1), th:(p.steps-1)*p.turn}};
    }};
  },
  readout:(p,o)=>[['last step radius', f(o.last.r,2)],['last step angle', f(o.last.th % 360,0)+'° (after '+f(o.last.th/360,1)+' turns)','acc']],
  code:(p,o)=>`-- a spiral staircase: each step turns, moves out a little and climbs
for i = 0, ${p.steps - 1} do
    local angle = math.rad(i * ${p.turn})
    local radius = ${p.r0} + ${p.grow} * i
    local step = template:Clone()
    step.CFrame = CFrame.new(center + Vector3.new(0, i * ${p.rise}, 0))
        * CFrame.Angles(0, -angle, 0)
        * CFrame.new(radius + 1, 0, 0)       -- out along the step's own X
    step.Parent = workspace
end

-- and back: which angle and distance is a point at from the centre?
local offset = point - center
local r = math.sqrt(offset.X ^ 2 + offset.Z ^ 2)
local theta = math.atan2(offset.Z, offset.X)`,
  body:`<p>Normal (x, z) coordinates say "this far right, this far forward". <b>Polar</b> coordinates say "this far out, at this angle". For anything round, polar is far easier: a circle is just "radius stays the same, angle changes".</p>
<p>Change the radius a little at every step and the circle becomes a <b>spiral</b>; climb a little too and it's a spiral staircase. Converting back with <code>atan2</code> and a square root tells you the angle and distance of any point from a centre.</p>`,
  uses:[`<b>Spiral staircases, galaxy arms and tornadoes.</b>`,`<b>Radial menus and ring layouts</b>.`,`<b>Radar screens</b>: plot enemies by distance and angle.`],
  gotchas:[`Polar angles start from +X and grow anticlockwise seen from +Y, but Roblox turns are measured differently (CFrame yaw starts from −Z). Pick one convention per system.`]
});

demo({
  id:'trig-lissajous', title:'Figure-eights and Lissajous paths', short:'x = sin(a·t), z = sin(b·t)', sig:'x = A·sin(a·t + δ),  z = B·sin(b·t)', time:true,
  view:{theta:0, phi:0.5, r:24, ty:0},
  params:[R('a','X frequency a',1,5,1,1), R('b','Z frequency b',1,5,1,2), R('d','Phase δ',0,180,5,90,'°'), R('speed','Speed',0.1,1.5,0.05,0.5)],
  setup(K){
    const path = K.line('--accent',{max:401, opacity:0.6}), npc = K.part(V(1,1.6,1));
    return {update(p,t){
      const A = 8, B = 6, d = p.d*D2R, at = s=>V(A*Math.sin(p.a*s + d), 0.1, B*Math.sin(p.b*s));
      const pts = []; for (let i=0;i<=400;i++) pts.push(at(i/400*Math.PI*2)); path.set(pts);
      const s = t*p.speed, pos = at(s), nxt = at(s+0.01); npc.setCF(CF.lookAt(pos.clone().setY(0.8), nxt.clone().setY(0.8)));
      return {};
    }};
  },
  readout:(p)=>[['ratio a : b', `${p.a} : ${p.b}`,'acc'],['shape', p.a===1&&p.b===2&&p.d===90 ? 'figure-eight' : p.a===p.b ? (p.d===90 ? 'circle/ellipse' : 'tilted ellipse or line') : 'Lissajous loop']],
  code:(p)=>`local A, B = 8, 6
local a, b, delta = ${p.a}, ${p.b}, math.rad(${p.d})

RunService.Heartbeat:Connect(function()
    local t = os.clock() * ${p.speed}
    local position = center + Vector3.new(A * math.sin(a * t + delta), 0, B * math.sin(b * t))
    local ahead = center + Vector3.new(A * math.sin(a * (t + 0.01) + delta), 0, B * math.sin(b * (t + 0.01)))
    npc:PivotTo(CFrame.lookAt(position, ahead))
end)`,
  body:`<p>Drive X with one sine and Z with another and you get a closed loop that repeats forever. When Z runs twice as fast as X with a quarter-turn phase, it's a <b>figure-eight</b>. Other whole-number ratios give the knotted <b>Lissajous</b> shapes.</p>
<p>These make great patrol paths, boss movement and decorative motion, because they're smooth, endless, and need no waypoints. Try 3 : 2 or 5 : 4 with different phases.</p>`,
  uses:[`<b>Patrol routes</b> and flying enemy paths.`,`<b>Boss attack patterns</b> and bullet-hell emitters.`,`<b>Ambient motion</b>: fireflies, drones, screensaver-style menus.`],
  gotchas:[`Whole-number ratios repeat; non-whole ratios never quite close, slowly filling in a rectangle.`]
});

demo({
  id:'trig-rotate2d', title:'Rotating a 2D point', short:'x cos − y sin, x sin + y cos', sig:'x′ = x·cos θ − y·sin θ,   y′ = x·sin θ + y·cos θ',
  view:{theta:0, phi:1.35, r:18, ty:4},
  params:[R('a','Rotation',-180,180,5,45,'°'), R('px','Pivot X',-3,3,0.25,0), R('py','Pivot Y',2,6,0.25,4)],
  setup(K){
    const shape = [V(2,0,0),V(4,1,0),V(2.5,2.5,0),V(2,0,0)];
    const orig = K.line('--muted',{max:4, dashed:true}), rot = K.line('--accent',{max:4}), piv = K.point('--ink',0.18), arcs = shape.slice(0,3).map(()=>K.line('--va',{dashed:true, max:41}));
    const lp = K.label('pivot','--ink');
    return {update(p){
      const a = p.a*D2R, c = Math.cos(a), s = Math.sin(a), Pv = V(p.px,p.py,0);
      const r = q=>V(Pv.x + q.x*c - q.y*s, Pv.y + q.x*s + q.y*c, 0);
      orig.set(shape.map(q=>V(Pv.x+q.x, Pv.y+q.y, 0))); rot.set(shape.map(r)); piv.position.copy(Pv); lp.at(Pv.clone().add(V(0,-0.5,0)));
      shape.slice(0,3).forEach((q,i)=>{ const pts=[]; for (let k=0;k<=40;k++){ const aa=a*k/40, cc=Math.cos(aa), ss=Math.sin(aa); pts.push(V(Pv.x+q.x*cc-q.y*ss, Pv.y+q.x*ss+q.y*cc, 0)); } arcs[i].set(pts); });
      const t = r(shape[1]); return {t};
    }};
  },
  readout:(p,o)=>[['tip after rotating', `${f(o.t.x - p.px,2)}, ${f(o.t.y - p.py,2)} from the pivot`,'acc']],
  code:(p,o)=>`local function rotate2D(point, pivot, angle)
    local offset = point - pivot
    local c, s = math.cos(angle), math.sin(angle)
    return pivot + Vector2.new(offset.X * c - offset.Y * s, offset.X * s + offset.Y * c)
end

print(rotate2D(Vector2.new(4, 1), Vector2.zero, math.rad(${p.a})))   --> ${f(4*Math.cos(p.a*D2R)-Math.sin(p.a*D2R),2)}, ${f(4*Math.sin(p.a*D2R)+Math.cos(p.a*D2R),2)}

-- GUI: screen Y points DOWN, so the same maths turns clockwise on screen,
-- which matches GuiObject.Rotation (clockwise degrees)`,
  body:`<p>To rotate a point around a pivot in 2D, take its offset from the pivot and mix the two coordinates with cos and sin. That's the formula inside every rotation, including CFrames. In 3D, CFrame does it for you; in 2D (UI, minimaps, top-down games) you'll often write it yourself.</p>
<p>The dashed arcs show each corner sweeping around the pivot. Move the pivot and the whole shape orbits it instead of spinning in place, just like the CFrame order topic.</p>`,
  uses:[`<b>Minimaps</b> that rotate with the player.`,`<b>2D games in ScreenGuis</b>: rotating bullets, ships and spinners.`,`<b>Offsets on a flat plane</b> when you don't want a full CFrame.`],
  gotchas:[`Positive angles turn anticlockwise when Y points up, and clockwise on screens where Y points down.`]
});

demo({
  id:'trig-height', title:'Heights and distances from angles', short:'height = distance × tan(angle)', sig:'height = distance * math.tan(elevation)   ·   elevation = math.atan(height / distance)',
  view:{theta:0.35, phi:1.2, r:24, ty:4},
  params:[R('d','Distance to the tower',2,20,0.5,12), R('h','Tower height',1,14,0.5,8)],
  setup(K){
    const eye = V(-8,1.5,0), obs = K.part(V(0.8,1.6,0.8),'--va',{front:false}); obs.position.set(-8,0.8,0);
    const tower = K.part(V(2,1,2),'--part',{front:false}), sight = K.line('--accent',{dashed:true}), flat = K.line('--muted',{dashed:true}), arc = K.line('--accent',{max:41}), lab = K.label('','--accent','big'), lh = K.label('','--ink');
    return {update(p){
      const top = V(eye.x + p.d, p.h, 0); tower.resize(V(2,p.h,2)); tower.position.set(top.x+1, p.h/2, 0);
      const el = Math.atan2(p.h - eye.y, p.d); sight.set(eye, top); flat.set(eye, V(top.x, eye.y, 0));
      const pts=[]; for (let i=0;i<=40;i++){ const a=el*i/40; pts.push(V(eye.x+Math.cos(a)*2.5, eye.y+Math.sin(a)*2.5, 0)); } arc.set(pts);
      lab.at(V(eye.x+3.2, eye.y+1.2*Math.sign(el||1), 0)).text(`${f(el/D2R,1)}°`); lh.at(V(top.x+2.8, p.h/2, 0)).text(`${p.h} studs`);
      return {el};
    }};
  },
  readout:(p,o)=>[['angle up to the top', f(o.el/D2R,1)+'°','acc'],['camera pitch needed', f(o.el,3)+' rad'],['straight-line distance', f(Math.hypot(p.d, p.h-1.5),2)]],
  code:(p,o)=>`local eye = head.Position
local top = tower.Position + Vector3.new(0, tower.Size.Y / 2, 0)

local flat = Vector3.new(top.X - eye.X, 0, top.Z - eye.Z).Magnitude   -- ${p.d}
local rise = top.Y - eye.Y                                            -- ${f(p.h-1.5,1)}
local elevation = math.atan2(rise, flat)          --> ${f(o.el/D2R,1)}°

-- the other way: how tall is something seen ${f(o.el/D2R,0)}° up from ${p.d} studs away?
local height = eye.Y + flat * math.tan(elevation)`,
  body:`<p>Surveyors measure a tower's height without climbing it: stand a known distance away, measure the angle up to the top, and use <code>height = distance × tan(angle)</code>. Turn it around and <code>atan</code> tells you the angle needed to look at something.</p>
<p>In games that's the pitch a camera or turret needs to aim at a target above or below it. The orange wedge is the elevation angle; move closer and it steepens.</p>`,
  uses:[`<b>Turret and camera pitch</b> toward targets at different heights.`,`<b>Checking line of sight</b> over walls of known height.`,`<b>Puzzle and builder tools</b> that measure heights from a distance.`],
  gotchas:[`Measure the horizontal distance only (ignore Y) for the "distance" part, or the angle comes out too small.`]
});

Lab.finder([
  ['Turn an angle into a point on a circle','math.cos / math.sin','trig-unit'],
  ['Convert degrees to radians','math.rad','trig-radians'],
  ['Make a ramp reach an exact height','height = length × sin(angle)','trig-sohcahtoa'],
  ['Work out how steep a slope is','math.atan(rise / run)','trig-tan'],
  ['Make a row of parts do a wave','sine with a phase per part','trig-wave'],
  ['Build a spiral staircase','polar coordinates','trig-polar'],
  ['Make a figure-eight patrol path','Lissajous curve','trig-lissajous'],
  ['Rotate a point on a minimap','2D rotation formula','trig-rotate2d'],
  ['Find the angle to look up at something','math.atan2(rise, flat)','trig-height'],
]);
Lab.ref('trig','Trigonometry',[
  ['math.sin / math.cos','Point on the unit circle','math.cos(a) * r','Circles, waves, directions'],
  ['math.tan(a)','rise / run of a slope','run * math.tan(angle)','Heights, slopes'],
  ['math.atan2(y, x)','Angle of a direction','math.atan2(z, x)','Aiming, polar coordinates'],
  ['math.asin / math.acos','Angle from a ratio','math.acos(dot)','Angle between vectors'],
  ['SOH CAH TOA','sin = o/h, cos = a/h, tan = o/a','height = L * math.sin(a)','Right triangles'],
  ['A·sin(2πft + φ)','Wave with amplitude, frequency, phase','amp * math.sin(...)','Bobbing, waves'],
  ['(r, θ) → (x, z)','r·cos θ, r·sin θ','Vector3.new(r*cos, 0, r*sin)','Spirals, rings'],
  ['2D rotation','x·c − y·s, x·s + y·c','rotate2D(p, pivot, a)','UI, minimaps'],
]);
})();
