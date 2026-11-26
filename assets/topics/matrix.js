(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, vs, CF, G, R, S, T, clamp, lookOf} = Lab;
const {inst, labels, bone} = Lab.kit2;
const demo = Lab.subject({
  id:'matrix', title:'Matrices & transforms', glyph:'matrix', level:'Advanced',
  blurb:'What a CFrame really is: matrix columns, matrix × vector, forward kinematics, inverses, drift, basis changes, scaling and mirroring.'
});
const comps = m=>{ const e = m.elements; return [e[12],e[13],e[14], e[0],e[4],e[8], e[1],e[5],e[9], e[2],e[6],e[10]]; };
const table3 = (rows, head)=>`<div class="mtx"><table><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${i===0?'':''}>${typeof c==='number' ? f(c,3) : c}</td>`).join('')}</tr>`).join('')}</table></div>`;

demo({
  id:'mx-columns', title:'A CFrame is a matrix', short:'3×3 rotation + position', sig:'x, y, z, R00, R01, R02, R10, R11, R12, R20, R21, R22 = cf:GetComponents()',
  view:{theta:0.7, phi:1.0, r:14, ty:2},
  params:[R('yaw','Yaw',-180,180,5,35,'°'), R('pitch','Pitch',-90,90,5,20,'°'), R('roll','Roll',-180,180,5,0,'°')],
  setup(K){ const part = K.part(V(2,1,3)); K.axes(part, 2.4);
    return {update(p){ const cf = CF.mul(CF.new(1,2,-1), CF.yxz(p.pitch*D2R, p.yaw*D2R, p.roll*D2R)); part.setCF(cf); return {cf}; }};
  },
  live:(p,o)=>{ const c = comps(o.cf); return `<h5>cf:GetComponents()</h5>${table3([['row 0',c[3],c[4],c[5],c[0]],['row 1',c[6],c[7],c[8],c[1]],['row 2',c[9],c[10],c[11],c[2]]], ['', '<span style="color:var(--x)">col 0 = Right</span>','<span style="color:var(--y)">col 1 = Up</span>','<span style="color:var(--z)">col 2 = −Look</span>','position'])}<p style="margin:8px 0 0;color:var(--muted)">Each column of the 3×3 part is one of the part's axes. Each column always has length 1, and the columns are at 90° to each other.</p>`; },
  readout:(p,o)=>{ const c = comps(o.cf); return [['RightVector', `(${f(c[3])}, ${f(c[6])}, ${f(c[9])})`],['LookVector', `(${f(-c[5])}, ${f(-c[8])}, ${f(-c[11])})`,'acc']]; },
  code:(p,o)=>{ const c = comps(o.cf); return `local x, y, z, R00, R01, R02, R10, R11, R12, R20, R21, R22 = part.CFrame:GetComponents()
-- RightVector = (R00, R10, R20) = (${f(c[3])}, ${f(c[6])}, ${f(c[9])})
-- UpVector    = (R01, R11, R21) = (${f(c[4])}, ${f(c[7])}, ${f(c[10])})
-- LookVector  = -(R02, R12, R22) = (${f(-c[5])}, ${f(-c[8])}, ${f(-c[11])})

-- and back: build a CFrame from its axes directly
local cf = CFrame.fromMatrix(Vector3.new(x, y, z), rightVector, upVector)
local same = CFrame.new(x, y, z, R00, R01, R02, R10, R11, R12, R20, R21, R22)`; },
  body:`<p>Under the hood, a CFrame is a <b>3×4 matrix</b>: a 3×3 block for rotation plus a column for position. <code>GetComponents()</code> returns all 12 numbers. The key insight is that each <b>column</b> of the rotation block is one of the part's axes: Right, Up, and Back (the opposite of Look).</p>
<p>Turn the part and watch the table: the columns are exactly the arrows. That's why <code>CFrame.fromMatrix(pos, right, up)</code> works: you're just filling in the columns yourself.</p>`,
  uses:[`<b>Saving and sending CFrames</b> as 12 numbers.`,`<b>Building CFrames</b> from axes you computed (surface alignment, custom cameras).`,`<b>Reading the axes</b> without separate property lookups.`],
  gotchas:[`Read the order carefully: <code>GetComponents</code> lists the matrix row by row, but the axes are its columns.`]
});

demo({
  id:'mx-mulvec', title:'Matrix × vector', short:'pos + Right·x + Up·y + Back·z', sig:'cf * Vector3.new(x, y, z)  =  cf.Position + cf.RightVector·x + cf.UpVector·y − cf.LookVector·z',
  view:{theta:0.6, phi:0.9, r:18, ty:1.5},
  params:[R('yaw','Part turn',-180,180,5,40,'°'), R('lx','Local X',-4,4,0.25,3), R('ly','Local Y',-2,4,0.25,2), R('lz','Local Z',-4,4,0.25,-2)],
  setup(K){ const part = K.part(V(1.6,1,2.4)); K.axes(part, 1.6, {names:false});
    const ax = K.arrow('--x',{thick:0.06}), ay = K.arrow('--y',{thick:0.06}), az = K.arrow('--z',{thick:0.06}), res = K.point('--accent',0.25), lr = K.label('','--accent','big');
    return {update(p){
      const cf = CF.mul(CF.new(0,1,0), CF.angles(0,p.yaw*D2R,0)); part.setCF(cf);
      const O = CF.pos(cf), r = CF.right(cf), u = CF.up(cf), b = CF.look(cf).negate();
      const p1 = O.clone().addScaledVector(r,p.lx), p2 = p1.clone().addScaledVector(u,p.ly), p3 = p2.clone().addScaledVector(b,p.lz);
      ax.set(O, p1.clone().sub(O)); ay.set(p1, p2.clone().sub(p1)); az.set(p2, p3.clone().sub(p2)); res.position.copy(p3);
      lr.at(p3.clone().add(V(0,0.6,0))).text(`cf * (${p.lx}, ${p.ly}, ${p.lz})`);
      return {W:p3, check:CF.pt(cf, V(p.lx,p.ly,p.lz))};
    }};
  },
  readout:(p,o)=>[['world point', vs(o.W),'acc'],['cf * v gives', vs(o.check)]],
  code:(p,o)=>`local cf = part.CFrame
local v = Vector3.new(${p.lx}, ${p.ly}, ${p.lz})

local a = cf * v                                                -- the short way
local b = cf.Position + cf.RightVector * v.X + cf.UpVector * v.Y - cf.LookVector * v.Z
print(a, b)   --> both ${vs(o.W)}

local dir = cf:VectorToWorldSpace(v)     -- same, but without adding Position (for directions)`,
  body:`<p>Multiplying a CFrame by a vector is just a recipe: start at the CFrame's position, walk <code>x</code> along its Right axis, <code>y</code> along Up, and <code>z</code> along Back. The three coloured arrows are those three walks; where they end is <code>cf * v</code>.</p>
<p>That's all matrix × vector means: a weighted sum of the columns, plus the position. <code>VectorToWorldSpace</code> does the same without the position, which is what you want for directions and velocities.</p>`,
  uses:[`<b>Local offsets</b>: muzzle, seat and hand positions relative to a part.`,`<b>Turning input into world motion</b> (camera-relative movement).`,`<b>Understanding</b> what every CFrame multiplication is doing.`],
  gotchas:[`Remember +Z is <i>backwards</i>. A point in front of the part has negative local Z.`]
});

demo({
  id:'mx-fk', title:'Forward kinematics: chains of CFrames', short:'parent × rotation × offset', sig:'jointN = jointN−1 * CFrame.Angles(...) * CFrame.new(0, length, 0)',
  view:{theta:0.3, phi:1.2, r:18, ty:4},
  params:[R('a1','Shoulder',-90,90,1,30,'°'), R('a2','Elbow',-150,150,1,-60,'°'), R('a3','Wrist',-90,90,1,40,'°'), R('turn','Base turn',-180,180,5,0,'°')],
  setup(K){ const base = K.part(V(1.6,0.6,1.6),'--part',{front:false}); base.position.set(0,0.3,0);
    const bones = [bone(K,'--va',0.3), bone(K,'--vb',0.25), bone(K,'--accent',0.2)], joints = [0,1,2,3].map(()=>K.point('--ink',0.22)), tip = K.label('','--accent','big'), frames = [0,1,2].map(()=>{ const g = new THREE.Group(); K.add(g); K.axes(g, 0.8, {names:false, thick:0.025}); return g; });
    return {update(p){
      const L = [3,2.5,1.5]; let cf = CF.mul(CF.new(0,0.6,0), CF.angles(0,p.turn*D2R,0)); const pts = [CF.pos(cf)];
      [p.a1,p.a2,p.a3].forEach((a,i)=>{ cf = CF.mul(cf, CF.angles(0,0,a*D2R)); frames[i].position.copy(CF.pos(cf)); new THREE.Quaternion().setFromRotationMatrix(cf); cf.decompose(frames[i].position, frames[i].quaternion, V()); cf = CF.mul(cf, CF.new(0,L[i],0)); pts.push(CF.pos(cf)); });
      bones.forEach((b,i)=>b.set(pts[i], pts[i+1])); joints.forEach((j,i)=>j.position.copy(pts[i])); tip.at(pts[3].clone().add(V(0,0.6,0))).text(`hand ${vs(pts[3])}`);
      return {hand:pts[3]};
    }};
  },
  readout:(p,o)=>[['hand position', vs(o.hand),'acc'],['total bend', f(p.a1+p.a2+p.a3,0)+'°']],
  code:(p,o)=>`local LENGTHS = { 3, 2.5, 1.5 }
local angles = { math.rad(${p.a1}), math.rad(${p.a2}), math.rad(${p.a3}) }

local cf = base.CFrame * CFrame.Angles(0, math.rad(${p.turn}), 0)
for i = 1, 3 do
    cf = cf * CFrame.Angles(0, 0, angles[i])       -- bend at this joint (in the parent's space)
    segments[i].CFrame = cf * CFrame.new(0, LENGTHS[i] / 2, 0)
    cf = cf * CFrame.new(0, LENGTHS[i], 0)         -- walk to the next joint
end
print(cf.Position)   --> hand at ${vs(o.hand)}`,
  body:`<p>Arms, cranes and robot legs are chains: each piece is attached to the one before it. <b>Forward kinematics</b> works out where everything ends up by multiplying CFrames down the chain: start at the base, rotate by the first joint's angle, step along the first bone, rotate by the next joint, and so on.</p>
<p>Because each rotation happens in its parent's space, bending the shoulder carries the whole arm with it, exactly like a real limb. This is what Motor6D joints do inside every character. The small axes show each joint's frame.</p>`,
  uses:[`<b>Robot arms, cranes and turrets</b> with several joints.`,`<b>Procedural animation</b> that sets joint angles directly.`,`<b>Checking where a hand or tool tip is</b> for a given pose.`],
  gotchas:[`FK goes from angles to positions. To go from a target position to angles, use IK (see Kinematics & IK).`]
});

demo({
  id:'mx-inverse', title:'Inverses and transposes', short:'R⁻¹ = Rᵀ for rotations', sig:'cf:Inverse() * cf == CFrame.identity   ·   rotation inverse = transpose',
  view:{theta:0.6, phi:1.0, r:18, ty:1.5},
  params:[R('yaw','Turn',-180,180,5,50,'°'), R('pitch','Tilt',-80,80,5,20,'°'), R('px','Position X',-5,5,0.5,3)],
  setup(K){ const a = K.part(V(1.6,1,2.4),'--accent'); K.axes(a, 1.6, {names:false}); const b = K.part(V(1.6,1,2.4),'--va',{opacity:0.6}); K.axes(b, 1.6, {names:false});
    K.label('cf','--accent','big').attach = {obj:a, local:V(0,1.2,0)}; K.label('cf:Inverse()','--va','big').attach = {obj:b, local:V(0,1.2,0)};
    return {update(p){ const cf = CF.mul(CF.new(p.px,2,-1), CF.yxz(p.pitch*D2R, p.yaw*D2R, 0)), inv = CF.inv(cf); a.setCF(cf); b.setCF(inv); const id = CF.mul(inv, cf); return {cf, inv, id}; }};
  },
  live:(p,o)=>{ const c = comps(o.cf), d = comps(o.inv); return `<h5>Rotation part: R and its inverse</h5>${table3([[ 'R',  c[3],c[4],c[5], c[6],c[7],c[8], c[9],c[10],c[11]],['R⁻¹', d[3],d[4],d[5], d[6],d[7],d[8], d[9],d[10],d[11]]], ['', 'R00','R01','R02','R10','R11','R12','R20','R21','R22'])}<p style="margin:8px 0 0;color:var(--muted)">R⁻¹ is R flipped across its diagonal: R01 ↔ R10, R02 ↔ R20, R12 ↔ R21.</p>`; },
  readout:(p,o)=>{ const e = comps(o.id); const err = Math.abs(e[0])+Math.abs(e[1])+Math.abs(e[2])+Math.abs(e[3]-1)+Math.abs(e[7]-1)+Math.abs(e[11]-1)+Math.abs(e[4])+Math.abs(e[5]); return [['cf:Inverse() * cf', err < 1e-9 ? 'identity ✓' : 'off by '+err.toExponential(1), 'ok'],['inverse position', vs(CF.pos(o.inv)),'acc']]; },
  code:(p,o)=>`local cf = CFrame.new(${p.px}, 2, -1) * CFrame.fromEulerAnglesYXZ(math.rad(${p.pitch}), math.rad(${p.yaw}), 0)
local inv = cf:Inverse()

print(inv * cf)                 --> CFrame.identity (undoes it completely)
print(inv.Position)             --> ${vs(CF.pos(o.inv))}   (not just -cf.Position!)

-- world → local is just "multiply by the inverse":
local localPoint = cf:Inverse() * worldPoint      -- = cf:PointToObjectSpace(worldPoint)`,
  body:`<p>The <b>inverse</b> of a CFrame undoes it: multiply them together and you get the identity (no move, no turn). That's what turns world coordinates into local ones, so every <code>ToObjectSpace</code> function is an inverse in disguise.</p>
<p>For the rotation part there's a shortcut: because the axes are unit length and at right angles, the inverse is just the <b>transpose</b> (the table flipped across its diagonal). The position part is trickier: it's the old position, un-rotated and negated, which is why the blue ghost isn't simply mirrored through the origin.</p>`,
  uses:[`<b>Local coordinates</b>: where is X relative to me?`,`<b>Undoing a transform</b>, e.g. removing a parent's rotation from a child.`,`<b>Pivot maths</b>: <code>pivot * rot * pivot:Inverse()</code>.`],
  gotchas:[`<code>cf:Inverse()</code> is not <code>CFrame.new(-cf.Position)</code>. Rotation changes where the inverse's position ends up.`]
});

demo({
  id:'mx-orthonormal', title:'Drift and orthonormalising', short:'cf:Orthonormalize()', sig:'many small rotations → rounding errors pile up → axes stretch and skew',
  view:{theta:0.6, phi:1.0, r:12, ty:2},
  params:[R('steps','Rotations applied',0,20000,100,8000), T('fix','Orthonormalize every 100 steps',false)],
  setup(K){ const O = V(0,2,0), ar = [K.arrow('--x',{thick:0.06}), K.arrow('--y',{thick:0.06}), K.arrow('--z',{thick:0.06})], ghost = [0,1,2].map(i=>K.arrow('--muted',{thick:0.02, opacity:0.5}));
    let key = '', res = null;
    return {update(p){ const k = p.steps+'|'+p.fix; if (k !== key){ key = k;
        let m = [1,0,0, 0,1,0, 0,0,1].map(Math.fround); const step = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.0137, 0.0211, 0.0071)).elements, s = [step[0],step[4],step[8], step[1],step[5],step[9], step[2],step[6],step[10]].map(Math.fround);
        for (let n=1;n<=p.steps;n++){ const r = []; for (let i=0;i<3;i++) for (let j=0;j<3;j++){ let v = 0; for (let k2=0;k2<3;k2++) v = Math.fround(v + Math.fround(m[i*3+k2]*s[k2*3+j])); r.push(v); } m = r;
          if (p.fix && n % 100 === 0){ const c0 = V(m[0],m[3],m[6]).normalize(), c1 = V(m[1],m[4],m[7]); c1.sub(c0.clone().multiplyScalar(c1.dot(c0))).normalize(); const c2 = c0.clone().cross(c1); m = [c0.x,c1.x,c2.x, c0.y,c1.y,c2.y, c0.z,c1.z,c2.z].map(Math.fround); } }
        const cols = [V(m[0],m[3],m[6]), V(m[1],m[4],m[7]), V(m[2],m[5],m[8])]; res = {cols, lenErr:Math.max(...cols.map(c=>Math.abs(c.length()-1))), skew:Math.max(Math.abs(cols[0].dot(cols[1])), Math.abs(cols[0].dot(cols[2])), Math.abs(cols[1].dot(cols[2])))}; }
      const ex = 1 + Math.min(4, res.lenErr*2e5); res.cols.forEach((c,i)=>{ const n = c.clone().normalize(); ghost[i].set(O, n.clone().multiplyScalar(2.5)); ar[i].set(O, n.multiplyScalar(2.5*(1 + (c.length()-1)*2e5))); });
      return res; }};
  },
  readout:(p,o)=>[['worst axis length error', o.lenErr.toExponential(2), o.lenErr > 1e-5 ? 'bad' : 'ok'],['worst skew (dot between axes)', o.skew.toExponential(2), o.skew > 1e-5 ? 'bad' : 'ok'],['arrows exaggerate errors', '× 200,000']],
  code:(p)=>`-- spinning something forever by multiplying onto itself
RunService.Heartbeat:Connect(function(dt)
    spinner.CFrame = spinner.CFrame * CFrame.Angles(0, dt * 2, 0)
end)

-- every multiply rounds a little (CFrames use 32-bit floats); after thousands
-- of frames the axes are no longer exactly length 1 or exactly at 90°
spinner.CFrame = spinner.CFrame:Orthonormalize()     -- squares it up again

-- often better: rebuild from a clean angle instead of accumulating
spinner.CFrame = baseCFrame * CFrame.Angles(0, os.clock() * 2, 0)`,
  body:`<p>CFrames store their numbers as 32-bit floats, which round slightly on every multiplication. Multiply a CFrame onto itself thousands of times (a spinning part, an orbiting camera) and the errors pile up: the axes slowly stretch and stop being exactly at right angles. Eventually parts visibly skew.</p>
<p>The arrows here exaggerate the error 200,000 times so you can see it grow with the number of steps. Turn on orthonormalising and it stays clean. Better still, rebuild the CFrame from a fresh angle each frame so errors never build up.</p>`,
  uses:[`<b>Long-running spinners and orbits.</b>`,`<b>Physics or camera code</b> that accumulates rotations.`,`<b>Cleaning up</b> CFrames built from approximate axes.`],
  gotchas:[`Orthonormalising fixes the axes but keeps whatever rotation the errors already caused. Recomputing from an angle avoids drift entirely.`]
});

demo({
  id:'mx-basis', title:'Changing basis: camera-relative input', short:'camera axes × input', sig:'move = camRight · input.X + camForward · input.Y   (flattened)',
  view:{theta:0.5, phi:0.8, r:20, ty:1},
  params:[R('cam','Camera yaw',-180,180,5,40,'°'), R('ix','Input X (A/D)',-1,1,0.1,1), R('iy','Input Y (W/S)',-1,1,0.1,1)],
  setup(K){ const cam = K.part(V(1.2,0.8,1),'--ink'), pl = K.part(V(1,1.8,1),'--va',{front:false}); pl.position.set(0,0.9,0);
    const fwd = K.arrow('--z',{thick:0.04}), rt = K.arrow('--x',{thick:0.04}), mv = K.arrow('--accent',{thick:0.08}), wmv = K.arrow('--muted',{thick:0.04, opacity:0.5}); const lm = K.label('move','--accent','big'), lw = K.label('if you ignored the camera','--muted');
    return {update(p){
      const y = p.cam*D2R, f0 = lookOf(y), r0 = V(Math.cos(y),0,-Math.sin(y)), C0 = V(0,0.9,0).addScaledVector(f0,-7).setY(4); cam.setCF(CF.lookAt(C0, V(0,1,0)));
      const O = V(0,1.9,0); fwd.set(O, f0.clone().multiplyScalar(2)); rt.set(O, r0.clone().multiplyScalar(2));
      const m = r0.clone().multiplyScalar(p.ix).addScaledVector(f0, p.iy); const L = m.length(); if (L > 1) m.divideScalar(L);
      mv.set(V(0,0.2,0), m.clone().multiplyScalar(4)); wmv.set(V(0,0.15,0), V(p.ix,0,-p.iy).multiplyScalar(4/Math.max(1,Math.hypot(p.ix,p.iy))));
      lm.at(m.clone().multiplyScalar(4.4).setY(0.6)); lw.at(V(p.ix,0,-p.iy).multiplyScalar(4.4/Math.max(1,Math.hypot(p.ix,p.iy))).setY(0.3));
      return {m};
    }};
  },
  readout:(p,o)=>[['world move', vs(o.m),'acc'],['length', f(o.m.length(),2)]],
  code:(p,o)=>`local input = Vector2.new(${p.ix}, ${p.iy})             -- from WASD or a thumbstick

local look = camera.CFrame.LookVector
local forward = Vector3.new(look.X, 0, look.Z).Unit   -- flatten: no walking into the floor
local right = Vector3.new(-forward.Z, 0, forward.X)   -- 90° to the right of forward

local move = right * input.X + forward * input.Y
if move.Magnitude > 1 then move = move.Unit end         -- diagonals not faster
humanoid:Move(move)                                     --> ${vs(o.m)}`,
  body:`<p>Input arrives in "screen" terms: up on the stick means "away from me". The world doesn't know where "away" is, so you translate the input into world directions using the <b>camera's axes</b>. That's a <b>change of basis</b>: the same numbers, measured along different axes.</p>
<p>Flatten the camera's look direction first so walking forward doesn't dig into the ground. Turn the camera and watch the orange move arrow follow while the input stays the same. The grey arrow is what you'd get by ignoring the camera.</p>`,
  uses:[`<b>Custom character controllers</b> and vehicles.`,`<b>Top-down and isometric games</b> with a rotated camera.`,`<b>Drag gestures</b> that move objects relative to the view.`],
  gotchas:[`If the camera looks straight down, its flattened look vector is almost zero. Use the camera's UpVector instead in that case.`,`Normalise only when the length is over 1, so a half-pushed stick still walks slowly.`]
});

demo({
  id:'mx-scale', title:'Scaling around a point', short:'pivot + (pos − pivot) × s', sig:'newPos = pivot + (pos − pivot) * s,  newSize = size * s',
  view:{theta:0.6, phi:0.9, r:22, ty:2},
  params:[R('s','Scale',0.25,2.5,0.05,1.6), S('pivot','Pivot',[['center','Centre of the model'],['base','Bottom of the model'],['corner','A corner']],'base')],
  setup(K){ const parts = [[0,1,0,2,2,2],[0,2.75,0,1.2,1.5,1.2],[1.6,0.5,0,1.2,1,1.2],[-1.6,0.5,0.8,1,1,1]];
    const ghosts = parts.map(()=>K.part(V(1,1,1),'--part',{front:false, opacity:0.2})), real = parts.map((q,i)=>K.part(V(1,1,1), ['--va','--vb','--accent','--y'][i], {front:false})), pv = K.point('--ink',0.22), lp = K.label('pivot','--ink');
    return {update(p){
      const piv = p.pivot==='center' ? V(0,1.75,0) : p.pivot==='base' ? V(0,0,0) : V(-2.2,0,-1);
      parts.forEach(([x,y,z,w,h,d],i)=>{ ghosts[i].resize(V(w,h,d)); ghosts[i].position.set(x,y,z); const np = piv.clone().add(V(x,y,z).sub(piv).multiplyScalar(p.s)); real[i].resize(V(w*p.s,h*p.s,d*p.s)); real[i].position.copy(np); });
      pv.position.copy(piv); lp.at(piv.clone().add(V(0,-0.5,0)));
      return {piv};
    }};
  },
  readout:(p,o)=>[['pivot', vs(o.piv)],['scale', '×'+f(p.s,2),'acc'],['volume', '×'+f(p.s*p.s*p.s,2)]],
  code:(p)=>`-- built in: scales every part's size and offset around the model's pivot
model:ScaleTo(${p.s})

-- by hand, around any point:
local function scaleAround(parts, pivot, s)
    for _, part in parts do
        local offset = part.Position - pivot
        part.Size *= s
        part.CFrame = part.CFrame.Rotation + pivot + offset * s   -- keep each part's rotation
    end
end`,
  body:`<p>CFrames can't hold a scale, so scaling a model means changing two things for every part: its <b>size</b> grows by <code>s</code>, and its <b>offset from the pivot</b> grows by <code>s</code> too. Parts move away from (or toward) the pivot as well as getting bigger, so the model keeps its shape.</p>
<p>Which point you scale around matters. Around the base, the model grows upward and stays on the floor; around the centre, it grows into the floor. <code>Model:ScaleTo</code> uses the model's pivot.</p>`,
  uses:[`<b>Growing pets, power-ups and giant modes.</b>`,`<b>Resize tools</b> in building games.`,`<b>Pop-in effects</b> that grow from the ground.`],
  gotchas:[`Joints, welds, and things like particle sizes don't scale automatically when you do it by hand. <code>ScaleTo</code> handles more of them.`]
});

demo({
  id:'mx-mirror', title:'Mirroring across a plane', short:'reflect position and axes', sig:'p′ = p − 2((p − p₀)·n)n   ·   then fix handedness by negating one axis',
  view:{theta:0.0, phi:0.8, r:22, ty:1.5},
  params:[R('px','Object X',1,8,0.25,4), R('pz','Object Z',-5,5,0.25,-1), R('yaw','Object turn',-180,180,5,35,'°'), R('mang','Mirror angle',-45,45,5,0,'°')],
  setup(K){ const mirror = K.part(V(0.1,4,14),'--va',{front:false, opacity:0.25}); const a = K.part(V(1.4,1,2.6)); K.axes(a, 1.6, {names:false}); const b = K.part(V(1.4,1,2.6),'--part'); K.axes(b, 1.6, {names:false});
    const lk = K.line('--muted',{dashed:true});
    return {update(p){
      const m = p.mang*D2R, n = V(Math.cos(m),0,-Math.sin(m)); mirror.setCF(CF.mul(CF.new(0,2,0), CF.angles(0,m,0)));
      const cf = CF.mul(CF.new(p.px,0.5,p.pz), CF.angles(0,p.yaw*D2R,0)); a.setCF(cf);
      const ref = v=>v.clone().sub(n.clone().multiplyScalar(2*v.dot(n))); const P0 = CF.pos(cf), P1 = ref(P0.clone().setY(0)).setY(P0.y);
      const look = ref(CF.look(cf)), up = ref(CF.up(cf)); const right = look.clone().cross(up).normalize(); // re-derive right so the frame stays right-handed
      const mcf = new THREE.Matrix4().makeBasis(right, up, look.clone().negate()); mcf.setPosition(P1); b.setCF(mcf); lk.set(P0, P1);
      return {P1};
    }};
  },
  readout:(p,o)=>[['mirrored position', vs(o.P1),'acc']],
  code:(p,o)=>`local function reflect(v, n)              -- n = the mirror's normal (unit)
    return v - 2 * v:Dot(n) * n
end

local function mirrorCFrame(cf, mirrorPoint, n)
    local pos = mirrorPoint + reflect(cf.Position - mirrorPoint, n)
    local look = reflect(cf.LookVector, n)
    local up = reflect(cf.UpVector, n)
    -- a reflection flips handedness; rebuild Right from Look × Up so it's a valid CFrame
    return CFrame.lookAt(pos, pos + look, up)
end

copy.CFrame = mirrorCFrame(original.CFrame, mirror.Position, mirror.CFrame.RightVector)`,
  body:`<p>Symmetry tools mirror builds across a plane. Positions reflect easily: subtract twice their distance along the mirror's normal (the same formula as bouncing off a wall). Orientations are trickier: reflecting all three axes produces a "left-handed" frame, which isn't a valid rotation, like a left glove becoming a right glove.</p>
<p>The fix is to reflect Look and Up, then rebuild Right from them. The copy faces the mirrored direction correctly, though a non-symmetric model would need a mirrored mesh to look truly reflected.</p>`,
  uses:[`<b>Symmetry building tools</b>: place one wall, get its twin.`,`<b>Mirrored level halves</b> for fair team maps.`,`<b>Reflections</b> of characters in mirror surfaces.`],
  gotchas:[`Parts that aren't symmetric themselves (wedges, meshes) end up rotated rather than truly flipped. Use a mirrored mesh for exact copies.`]
});

Lab.finder([
  ['See the 12 numbers inside a CFrame','GetComponents / fromMatrix','mx-columns'],
  ['Understand what cf * Vector3 does','sum of axes','mx-mulvec'],
  ['Pose a robot arm from joint angles','forward kinematics','mx-fk'],
  ['Undo a CFrame','cf:Inverse()','mx-inverse'],
  ['Stop a spinning part slowly skewing','Orthonormalize / rebuild from angle','mx-orthonormal'],
  ['Make WASD follow the camera','camera axes × input','mx-basis'],
  ['Scale a model around its base','pivot + offset × s','mx-scale'],
  ['Mirror a build across a line','reflect position and axes','mx-mirror'],
]);
Lab.ref('matrix','Matrices',[
  ['cf:GetComponents()','x, y, z, R00 … R22','local x, y, z, R00 = cf:GetComponents()','Saving, reading axes'],
  ['CFrame.fromMatrix(p, right, up)','CFrame from axes','fromMatrix(pos, r, u)','Custom orientations'],
  ['cf * v','Position + axes × components','cf * Vector3.new(0, 0, -5)','Local offsets'],
  ['cf:Inverse()','Undo a transform','cf:Inverse() * other','World → local'],
  ['rotation transpose','Inverse of a pure rotation','swap R01↔R10 etc.','Fast inverse'],
  ['cf:Orthonormalize()','Fix stretched / skewed axes','cf = cf:Orthonormalize()','Long accumulations'],
  ['model:ScaleTo(s)','Scale a model at its pivot','model:ScaleTo(2)','Giant modes'],
  ['reflect','v − 2(v·n)n','reflect(cf.LookVector, n)','Mirroring'],
]);
})();
