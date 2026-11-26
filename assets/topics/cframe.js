(function(){
"use strict";
const {THREE, V, D2R, f, v3, vs, CF, G, R, S, T} = Lab;
const demo = Lab.subject({
  id:'cframe', title:'CFrame', glyph:'frame',
  blurb:'Position plus rotation. Facing targets, local offsets, orbits and smooth turns.'
});
const tmpS = V();

demo({
  id:'cf-intro', title:'What a CFrame is', short:'Position + rotation', sig:'CFrame = Position + Right/Up/Look vectors',
  view:{theta:0.8, phi:1.0, r:16, ty:2},
  params:[R('px','X',-6,6,0.5,0), R('py','Y',1,6,0.5,2), R('pz','Z',-6,6,0.5,0), R('yaw','Turn (Y)',-180,180,5,30,'°'), R('pitch','Tilt (X)',-80,80,5,0,'°')],
  setup(K){
    const part = K.part(V(2,1,3)); K.axes(part, 2.6);
    const drop = K.line('--muted',{dashed:true}), lp = K.label('','--ink');
    return {update(p){
      const cf = CF.mul(CF.new(p.px,p.py,p.pz), CF.angles(0,p.yaw*D2R,0), CF.angles(p.pitch*D2R,0,0));
      part.setCF(cf); const P = CF.pos(cf); drop.set(P, V(P.x,0,P.z)); lp.at(V(P.x,-0.35,P.z)).text(`Position ${vs(P)}`);
      return {cf, P, look:CF.look(cf), right:CF.right(cf), up:CF.up(cf)};
    }};
  },
  readout:(p,o)=>[['Position', vs(o.P)],['LookVector', vs(o.look),'acc']],
  live:(p,o)=>{ const r=o.right, u=o.up, l=o.look;
    const row=(n,i)=>`<tr><td>${n}</td><td>${f([o.P.x,o.P.y,o.P.z][i])}</td><td style="color:var(--x)">${f([r.x,r.y,r.z][i])}</td><td style="color:var(--y)">${f([u.x,u.y,u.z][i])}</td><td style="color:var(--z)">${f([-l.x,-l.y,-l.z][i])}</td></tr>`;
    return `<h5>The 12 numbers inside this CFrame</h5><div class="mtx"><table><tr><th></th><th>Position</th><th style="color:var(--x)">RightVector</th><th style="color:var(--y)">UpVector</th><th style="color:var(--z)">−LookVector</th></tr>${row('X',0)}${row('Y',1)}${row('Z',2)}</table></div>
    <p style="margin:8px 0 0;color:var(--muted)">print(part.CFrame) shows these as x, y, z, R00…R22. Each rotation column is one of the part's own axes.</p>`; },
  code:(p,o)=>`part.CFrame = CFrame.new(${f(p.px)}, ${f(p.py)}, ${f(p.pz)})
    * CFrame.Angles(0, math.rad(${f(p.yaw)}), 0)     -- turn
    * CFrame.Angles(math.rad(${f(p.pitch)}), 0, 0)   -- then tilt

print(part.CFrame.Position)      --> ${vs(o.P)}
print(part.CFrame.LookVector)    --> ${vs(o.look)}  (the front)
print(part.CFrame.RightVector)   --> ${vs(o.right)}
print(part.CFrame.UpVector)      --> ${vs(o.up)}`,
  body:`<p>A <code>Vector3</code> says <i>where</i>. A <code>CFrame</code> ("coordinate frame") says <b>where and which way it faces</b>. It's a position plus the part's own three axes: RightVector, UpVector and LookVector.</p>
<p>Think of it as a little set of axes glued to the part. As you turn and tilt it, those three arrows turn with it. Most CFrame tricks come down to "do something along the part's own arrows instead of the world's".</p>
<p>The table under the controls shows the real numbers. When the part isn't rotated the columns read (1,0,0), (0,1,0), (0,0,1), matching the world axes.</p>`,
  uses:[`<b>Moving and rotating in one go.</b> Setting <code>part.CFrame</code> changes both at once. Setting <code>Position</code> only moves it.`,
        `<b>Reading which way something faces.</b> <code>character.HumanoidRootPart.CFrame.LookVector</code> is where the player is facing.`,
        `<b>Moving models.</b> <code>model:PivotTo(cframe)</code> moves a whole model, keeping every part's position relative to the others.`],
  gotchas:[`LookVector points out of the <b>front</b> face, which is the part's −Z side. That's why "forward" offsets use negative Z.`,
           `CFrames can't be edited in place either. <code>cf.Position = ...</code> errors. Build a new one.`,
           `<code>cf.Rotation</code> gives you the same rotation with the position removed, handy for copying just the facing.`]
});

demo({
  id:'cf-angles', title:'CFrame.Angles and radians', short:'CFrame.Angles(rx, ry, rz)', sig:'CFrame.Angles(rx, ry, rz)  →  CFrame (radians)',
  view:{theta:0.8, phi:1.0, r:14, ty:2},
  params:[R('rx','X rotation',-180,180,5,0,'°'), R('ry','Y rotation',-180,180,5,45,'°'), R('rz','Z rotation',-180,180,5,0,'°'), S('order','Function',[['xyz','CFrame.Angles'],['yxz','CFrame.fromEulerAnglesYXZ']],'xyz')],
  setup(K){
    K.part(V(2,1,3),'--part',{opacity:0.18}).position.set(0,2,0);
    const part = K.part(V(2,1,3)); K.axes(part, 2.6);
    return {update(p){
      const rot = p.order==='xyz' ? CF.angles(p.rx*D2R,p.ry*D2R,p.rz*D2R) : CF.yxz(p.rx*D2R,p.ry*D2R,p.rz*D2R);
      const cf = CF.mul(CF.new(0,2,0), rot); part.setCF(cf);
      return {look:CF.look(cf)};
    }};
  },
  readout:(p,o)=>[['math.rad(X)', f(p.rx*D2R,3)],['math.rad(Y)', f(p.ry*D2R,3)],['math.rad(Z)', f(p.rz*D2R,3)],['LookVector', vs(o.look),'acc']],
  code:(p,o)=>`-- angles are in RADIANS. math.rad turns degrees into radians.
local rotation = ${p.order==='xyz'?'CFrame.Angles':'CFrame.fromEulerAnglesYXZ'}(math.rad(${f(p.rx)}), math.rad(${f(p.ry)}), math.rad(${f(p.rz)}))
part.CFrame = CFrame.new(0, 2, 0) * rotation

-- spin a coin 90° per second, frame-rate independent:
RunService.Heartbeat:Connect(function(dt)
    coin.CFrame = coin.CFrame * CFrame.Angles(0, math.rad(90) * dt, 0)
end)`,
  body:`<p><code>CFrame.Angles</code> builds a rotation from three angles around X, Y and Z. Like every Roblox maths function, it takes <b>radians</b>, not degrees. A full turn is <code>2 * math.pi</code> (about 6.28), so 90° is <code>math.pi / 2</code> or <code>math.rad(90)</code>.</p>
<p>Rotating around Y turns left and right, X tilts nose up and down, Z rolls side to side. The faint block shows the unrotated part for comparison.</p>
<p>Order matters once you use more than one axis. Set Y to 45 and X to 45, then switch the function: <code>fromEulerAnglesYXZ</code> turns first and then tilts relative to the new heading, which is usually what you want for cameras and aiming.</p>`,
  uses:[`<b>Spinning things.</b> Coins, fans and pickups: multiply by a small rotation every frame.`,
        `<b>Doors.</b> Swing around Y by <code>math.rad(90)</code>.`,
        `<b>Camera and gun aiming.</b> Yaw and pitch from mouse movement, built with <code>fromEulerAnglesYXZ(pitch, yaw, 0)</code>.`],
  gotchas:[`<code>part.Orientation</code> in the Properties panel is in degrees, while <code>CFrame.Angles</code> is in radians. <code>CFrame.Angles(0, 90, 0)</code> turns about 5157°.`,
           `Positive Y rotation turns <b>left</b> when seen from above (anticlockwise).`,
           `Rotations stack when you multiply: <code>cf * CFrame.Angles(...)</code> rotates around the part's own axes.`]
});

demo({
  id:'cf-lookat', title:'CFrame.lookAt: face a target', short:'CFrame.lookAt(pos, target)', sig:'CFrame.lookAt(at, target)  →  CFrame',
  view:{theta:0.75, phi:1.0, r:20, ty:1.5},
  params:[R('tx','Target X',-8,8,0.5,5), R('ty','Target Y',0,8,0.5,4), R('tz','Target Z',-8,8,0.5,-5), S('mode','Mode',[['full','Full aim (3D)'],['yaw','Turn only (stay upright)']],'full')],
  setup(K){
    const base = K.add(new THREE.Mesh(G.cyl, K.mat('--part'))); base.scale.set(0.9,1,0.9); base.position.set(0,0.5,0);
    const head = K.add(new THREE.Group());
    K.part(V(1.4,1,1.4),'--part',{parent:head});
    K.part(V(0.35,0.35,2.4),'--part',{parent:head}).position.set(0,0,-1.6);
    K.arrow('--z',{parent:head, thick:0.04}).set(V(0,0.8,0), V(0,0,-2.2));
    const tg = K.part(V(0.8,0.8,0.8),'--vb',{front:false}), beam = K.line('--accent',{dashed:true});
    K.label('target','--vb','big').attach = {obj:tg, local:V(0,0.8,0)};
    K.label('LookVector','--z').attach = {obj:head, local:V(0,1.1,-2.4)};
    return {update(p){
      const at = V(0,1.6,0), T = V(p.tx,p.ty,p.tz), aim = p.mode==='yaw' ? V(T.x, at.y, T.z) : T;
      tg.position.copy(T);
      const cf = CF.lookAt(at, aim); cf.decompose(head.position, head.quaternion, tmpS);
      beam.set(CF.pt(cf, V(0,0,-2.8)), T);
      return {look:CF.look(cf), T};
    }};
  },
  readout:(p,o)=>[['LookVector', vs(o.look),'acc'],['mode', p.mode==='yaw'?'turn only':'full aim']],
  code:(p,o)=>p.mode==='full' ? `-- point the turret straight at the target
local targetPos = ${v3(o.T)}
turret.CFrame = CFrame.lookAt(turret.Position, targetPos)

print(turret.CFrame.LookVector)   --> ${vs(o.look)}` : `-- turn left/right only, so the body stays upright
local targetPos = ${v3(o.T)}
local flat = Vector3.new(targetPos.X, turret.Position.Y, targetPos.Z)
turret.CFrame = CFrame.lookAt(turret.Position, flat)

print(turret.CFrame.LookVector)   --> ${vs(o.look)}  (Y is always 0)`,
  body:`<p><code>CFrame.lookAt(at, target)</code> gives you a CFrame placed at <code>at</code> whose front face points at <code>target</code>. It's the one-line answer to "make this face that".</p>
<p>Full aim is right for a turret barrel or a camera. For a character or an NPC's body you usually want it to turn without leaning back to look up. Switch the mode: we replace the target's height with our own, so the look direction stays flat.</p>`,
  uses:[`<b>Turrets and towers</b> tracking the nearest enemy.`,
        `<b>NPCs turning to face the player</b> when they talk (turn-only mode).`,
        `<b>Cutscene cameras.</b> <code>camera.CFrame = CFrame.lookAt(camPos, subject.Position)</code>.`],
  gotchas:[`If the target is directly above or below, the rotation becomes unstable, because "up" and "forward" point the same way. Turn-only mode avoids it.`,
           `For a model, use <code>model:PivotTo(CFrame.lookAt(...))</code> instead of setting one part.`,
           `Older code uses <code>CFrame.new(pos, target)</code> for the same thing. <code>CFrame.lookAt</code> is the current name.`]
});

demo({
  id:'cf-offset', title:'Local vs world offsets', short:'cf * CFrame.new(0, 0, -5)', sig:'cf * CFrame.new(x, y, z)  vs  cf.Position + Vector3',
  view:{theta:0.3, phi:0.8, r:20, ty:1},
  params:[R('yaw','Player facing (+ = left)',-180,180,5,40,'°'), R('fwd','Forward',-6,8,0.5,5), R('side','Right',-5,5,0.5,0), R('up','Up',-1,4,0.5,0)],
  setup(K){
    const pl = K.part(V(1.6,2,1.2)); K.axes(pl, 2.2, {names:false});
    const loc = K.part(V(0.8,0.8,0.8),'--accent'), wor = K.part(V(0.8,0.8,0.8),'--muted',{front:false, opacity:0.55});
    const l1 = K.line('--accent',{dashed:true}), l2 = K.line('--muted',{dashed:true});
    const la = K.label('local: cf * CFrame.new','--accent','big'), lb = K.label('world: + Vector3.new','--muted');
    return {update(p){
      const cf = CF.mul(CF.new(0,1,0), CF.angles(0,p.yaw*D2R,0)); pl.setCF(cf);
      const local = CF.mul(cf, CF.new(p.side,p.up,-p.fwd)); loc.setCF(local);
      const world = V(0,1,0).add(V(p.side,p.up,-p.fwd)); wor.position.copy(world);
      const LP = CF.pos(local); l1.set(V(0,1,0), LP); l2.set(V(0,1,0), world);
      la.at(LP.clone().add(V(0,0.8,0))); lb.at(world.clone().add(V(0,-0.75,0)));
      return {LP, world};
    }};
  },
  readout:(p,o)=>[['local result', vs(o.LP),'acc'],['world result', vs(o.world)]],
  code:(p,o)=>`local root = character.HumanoidRootPart

-- LOCAL: relative to where the player is facing
local spawnCF = root.CFrame * CFrame.new(${f(p.side)}, ${f(p.up)}, ${f(-p.fwd)})
print(spawnCF.Position)   --> ${vs(o.LP)}

-- WORLD: the same numbers, but along the world axes
local spawnPos = root.Position + Vector3.new(${f(p.side)}, ${f(p.up)}, ${f(-p.fwd)})
print(spawnPos)           --> ${vs(o.world)}

-- another way to write "${f(p.fwd)} studs in front":
local ahead = root.Position + root.CFrame.LookVector * ${f(p.fwd)}`,
  body:`<p>This is the CFrame idea people use most. Multiplying a CFrame by <code>CFrame.new(x, y, z)</code> moves along the part's <b>own</b> axes: X is its right, Y its up, and −Z its front.</p>
<p>Adding a <code>Vector3</code> instead moves along the <b>world</b> axes and ignores which way the part faces. Turn the player and watch: the orange block stays in front of them, the grey one stays put in the world.</p>
<p>Negative Z is forward, so "5 studs ahead" is <code>CFrame.new(0, 0, -5)</code>.</p>`,
  uses:[`<b>Spawning projectiles</b> at the gun's barrel: <code>gun.CFrame * CFrame.new(0, 0, -2)</code>.`,
        `<b>Over-the-shoulder cameras:</b> <code>root.CFrame * CFrame.new(2, 2, 8)</code>, right, up and behind.`,
        `<b>Shields, held items and pets</b> that sit in a fixed spot relative to the player.`],
  gotchas:[`If something spawns "behind" the player, you probably used +Z. Forward is −Z.`,
           `<code>cf + Vector3</code> keeps the rotation and moves in world space. <code>cf * CFrame.new()</code> moves in local space.`,
           `<code>cf * Vector3</code> (no CFrame.new) gives back a world <b>position</b>, the same as <code>cf:PointToWorldSpace(v)</code>.`]
});

demo({
  id:'cf-order', title:'Order: orbit vs spin', short:'A * B ≠ B * A', sig:'A * B  is not  B * A', time:true,
  view:{theta:0.0, phi:0.9, r:22, ty:0.5},
  params:[R('radius','Radius',1,6,0.5,3.5), R('speed','Speed',0.2,3,0.1,1,' rad/s')],
  setup(K){
    const cL = V(-6,1,0), cR = V(6,1,0); let ringR=-1, ring=null;
    K.point('--va',0.18).position.copy(cL); K.point('--vb',0.18).position.copy(cR);
    const mL = K.part(V(1,1,1.6)), mR = K.part(V(1,1,1.6));
    const sL = K.line('--muted',{dashed:true}), sR = K.line('--muted',{dashed:true});
    K.label('Angles first → orbit','--va','big').at(cL.clone().add(V(0,3.2,0)));
    K.label('Offset first → spin in place','--vb','big').at(cR.clone().add(V(0,3.2,0)));
    return {update(p,t){
      if (ringR !== p.radius){ K.drop(ring); ring = K.ring(p.radius,'--va',{y:1, opacity:0.6, dashed:true}); ring.position.x = -6; ringR = p.radius; }
      const a = t*p.speed;
      const L = CF.mul(CF.at(cL), CF.angles(0,a,0), CF.new(p.radius,0,0));
      const Rr = CF.mul(CF.at(cR), CF.new(p.radius,0,0), CF.angles(0,a,0));
      mL.setCF(L); mR.setCF(Rr); sL.set(cL, CF.pos(L)); sR.set(cR, CF.pos(Rr));
      return {a};
    }};
  },
  readout:(p,o)=>[['angle', f(((o.a%(2*Math.PI))+2*Math.PI)%(2*Math.PI),2)+' rad']],
  code:(p,o)=>`local angle = os.clock() * ${f(p.speed)}

-- LEFT: rotate first, then step out → moves in a circle
moon.CFrame = center.CFrame
    * CFrame.Angles(0, angle, 0)
    * CFrame.new(${f(p.radius)}, 0, 0)

-- RIGHT: step out first, then rotate → spins where it stands
moon.CFrame = center.CFrame
    * CFrame.new(${f(p.radius)}, 0, 0)
    * CFrame.Angles(0, angle, 0)`,
  body:`<p>With CFrames, <code>A * B</code> and <code>B * A</code> give different results. Read a chain of multiplications <b>left to right</b>, and treat each step as happening in the space the previous steps created.</p>
<p><b>Left:</b> turn first, then walk out along your new right-hand side. As the angle grows you end up somewhere new on a circle: an orbit.</p>
<p><b>Right:</b> walk out first, then turn. You always walk to the same spot, then spin on the spot.</p>`,
  uses:[`<b>Orbiting pets, shields and planets</b> (left version).`,
        `<b>Doors on a hinge.</b> <code>hinge.CFrame * CFrame.Angles(0, open, 0) * CFrame.new(width / 2, 0, 0)</code> swings the door around its edge instead of its middle.`,
        `<b>Weapon swings.</b> Rotate around the shoulder, then offset to the hand.`],
  gotchas:[`If something spins in place when you wanted it to orbit (or the other way round), swap the order of the two multiplications.`,
           `Vectors don't have this problem: <code>a + b == b + a</code> always.`]
});

demo({
  id:'cf-objectspace', title:'ToObjectSpace: relative to me', short:'cf:PointToObjectSpace(p)', sig:'cf:PointToObjectSpace(point)  →  Vector3',
  view:{theta:0.0, phi:0.55, r:22, ty:0},
  params:[R('yaw','NPC facing (+ = left)',-180,180,5,-30,'°'), R('tx','Target X',-9,9,0.5,4), R('tz','Target Z',-9,9,0.5,-5)],
  setup(K){
    const pl = K.part(V(1.6,2,1.2)); K.axes(pl, 2.2, {names:false});
    const tg = K.point('--vb',0.3); const lx = K.line('--x',{dashed:true}), lz = K.line('--z',{dashed:true});
    const ex = K.label('','--x','big'), ez = K.label('','--z','big'), et = K.label('target','--vb');
    return {update(p){
      const cf = CF.mul(CF.new(0,1,0), CF.angles(0,p.yaw*D2R,0)); pl.setCF(cf);
      const T = V(p.tx,1,p.tz); tg.position.copy(T);
      const rel = CF.pt(CF.inv(cf), T); const foot = CF.pt(cf, V(rel.x,0,0));
      lx.set(V(0,1,0), foot); lz.set(foot, T);
      ex.at(V(0,1,0).lerp(foot,0.5).add(V(0,0.45,0))).text(`X ${f(rel.x)}`);
      ez.at(foot.clone().lerp(T,0.5).add(V(0,0.45,0))).text(`Z ${f(rel.z)}`);
      et.at(T.clone().add(V(0,0.6,0)));
      const side = Math.abs(rel.x)<0.05 ? 'dead centre' : (rel.x>0 ? `${f(Math.abs(rel.x))} studs to the right` : `${f(Math.abs(rel.x))} studs to the left`);
      const fb = Math.abs(rel.z)<0.05 ? 'level with it' : (rel.z<0 ? `${f(Math.abs(rel.z))} studs in front` : `${f(Math.abs(rel.z))} studs behind`);
      return {rel, side, fb};
    }};
  },
  readout:(p,o)=>[['relative', vs(o.rel),'acc'],['left / right', o.side],['front / back', o.fb]],
  code:(p,o)=>`local rel = npc.CFrame:PointToObjectSpace(target.Position)
--> ${vs(o.rel)}

-- rel.X > 0 → to the right     rel.X < 0 → to the left
-- rel.Z < 0 → in front         rel.Z > 0 → behind
-- right now: ${o.side}, ${o.fb}

-- remember an offset, re-apply it later (held items, attachments):
local offset = hand.CFrame:ToObjectSpace(sword.CFrame)
sword.CFrame = hand.CFrame * offset`,
  body:`<p>World coordinates tell you where something is on the map. Often you want to know where it is <b>from someone's point of view</b>: in front, behind, left or right. <code>PointToObjectSpace</code> converts a world position into the part's own coordinates.</p>
<p>The dashed lines show the answer: go this far along the NPC's right (red), then this far along its forward line (blue), and you reach the target. Turn the NPC and the numbers change even though the target hasn't moved.</p>
<p><code>ToObjectSpace</code> does the same for a whole CFrame, and <code>ToWorldSpace</code> / <code>PointToWorldSpace</code> convert back.</p>`,
  uses:[`<b>AI decisions.</b> "Is the player behind me?" is just <code>rel.Z &gt; 0</code>.`,
        `<b>Saving relative offsets.</b> Store where a sword sits relative to the hand once, then re-apply it every frame.`,
        `<b>Vehicle steering.</b> A target's <code>rel.X</code> says how hard to turn and which way.`],
  gotchas:[`<code>PointToObjectSpace</code> is for positions. For directions (like a velocity) use <code>VectorToObjectSpace</code>, which ignores the part's position.`,
           `<code>a:ToObjectSpace(b)</code> is the same as <code>a:Inverse() * b</code>.`]
});

demo({
  id:'cf-lerp', title:'CFrame:Lerp: smooth moves', short:'a:Lerp(b, t)', sig:'a:Lerp(b, alpha)  →  CFrame', time:true,
  view:{theta:0.5, phi:1.0, r:19, ty:2},
  params:[R('t','alpha',0,1,0.01,0.35), T('anim','Animate alpha',true)],
  setup(K){
    const A = CF.new(-5,1,3), B = CF.mul(CF.new(5,4,-3), CF.yxz(0.5,2.4,0.3));
    K.part(V(2,1,3),'--va',{opacity:0.25}).setCF(A); K.part(V(2,1,3),'--vb',{opacity:0.25}).setCF(B);
    [0.25,0.5,0.75].forEach(s=>K.part(V(2,1,3),'--part',{opacity:0.08}).setCF(CF.lerp(A,B,s)));
    const part = K.part(V(2,1,3)); K.axes(part, 2.2, {names:false});
    K.label('A','--va','big').at(CF.pos(A).add(V(0,1.2,0))); K.label('B','--vb','big').at(CF.pos(B).add(V(0,1.2,0)));
    const lm = K.label('','--accent','big'); lm.attach = {obj:part, local:V(0,1.3,0)};
    return {update(p,t){
      const a = p.anim ? 0.5-0.5*Math.cos(t*1.1) : p.t; const cf = CF.lerp(A,B,a); part.setCF(cf);
      lm.text(`A:Lerp(B, ${f(a)})`); return {a, P:CF.pos(cf), look:CF.look(cf)};
    }};
  },
  readout:(p,o)=>[['alpha', f(o.a)],['Position', vs(o.P)],['LookVector', vs(o.look),'acc']],
  code:(p,o)=>`local A = part.CFrame
local B = CFrame.new(5, 4, -3) * CFrame.fromEulerAnglesYXZ(0.5, 2.4, 0.3)

part.CFrame = A:Lerp(B, ${f(o.a)})   -- position AND rotation blend together

-- usually the easier way to animate between two CFrames:
local tween = TweenService:Create(part, TweenInfo.new(1.5, Enum.EasingStyle.Quad), {CFrame = B})
tween:Play()`,
  body:`<p><code>CFrame:Lerp</code> blends between two CFrames. The position slides in a straight line and the rotation turns smoothly by the shortest path, both by the same alpha.</p>
<p>The faint blocks are the in-between frames at 0.25, 0.5 and 0.75. The rotation doesn't wobble or take a detour, which lerping the three angles separately would.</p>
<p>For one-off animations, <code>TweenService</code> does this lerp for you with easing. Use <code>Lerp</code> yourself when the goal moves every frame.</p>`,
  uses:[`<b>Camera transitions</b> between two viewpoints.`,
        `<b>Smoothly turning to face something</b>: lerp from the current CFrame toward a <code>CFrame.lookAt</code> a bit each frame.`,
        `<b>Doors, drawbridges and elevators</b> with TweenService on <code>CFrame</code>.`],
  gotchas:[`Tweening <code>Position</code> and <code>Orientation</code> separately can look odd. Tween the <code>CFrame</code> instead.`,
           `Physics fights you on unanchored parts. Anchor what you move by CFrame, or use constraints like AlignPosition and AlignOrientation.`]
});

demo({
  id:'cf-pivot', title:'Rotating around a pivot', short:'pivot * rot * pivot:Inverse() * cf', sig:'pivot * CFrame.Angles(...) * pivot:Inverse() * cf',
  view:{theta:0.5, phi:0.75, r:20, ty:1.5}, time:true,
  params:[R('hinge','Pivot along the door',-2,2,0.25,-2), R('ang','Angle',-180,180,5,70,'°'), T('anim','Swing',false)],
  setup(K){
    const base = CF.new(0,3,0), size = V(4,6,0.3);
    K.part(size,'--part',{front:false, opacity:0.18}).setCF(base);
    const door = K.part(size,'--accent'), pv = K.point('--ink',0.18), axis = K.line('--ink',{dashed:true}), arc = K.line('--va',{dashed:true, max:73});
    const lp = K.label('pivot','--ink','big');
    return {update(p,t){
      const a = (p.anim ? Math.sin(t*1.2)*90 : p.ang)*D2R;
      const pivot = CF.mul(base, CF.new(p.hinge,0,0)), P = CF.pos(pivot);
      const cf = CF.mul(pivot, CF.angles(0,a,0), CF.inv(pivot), base); door.setCF(cf);
      pv.position.copy(P); axis.set(P.clone().add(V(0,-3.5,0)), P.clone().add(V(0,3.5,0))); lp.at(P.clone().add(V(0,3.9,0)));
      const pts = []; for (let i=0;i<=72;i++){ const ai = a*i/72; pts.push(CF.pos(CF.mul(pivot, CF.angles(0,ai,0), CF.inv(pivot), base))); } arc.set(pts);
      return {a, P, pos:CF.pos(cf)};
    }};
  },
  readout:(p,o)=>[['pivot', vs(o.P)],['angle', f(o.a/D2R,0)+'°'],['door centre', vs(o.pos),'acc']],
  code:(p,o)=>`-- the hinge: a point on the door's edge (in the door's own space)
local pivot = door.CFrame * CFrame.new(${f(p.hinge)}, 0, 0)

local swing = CFrame.Angles(0, math.rad(${f(o.a/D2R,0)}), 0)
door.CFrame = pivot * swing * pivot:Inverse() * door.CFrame
--  1. pivot:Inverse() * door.CFrame  → the door relative to the hinge
--  2. swing                           → rotate that around the hinge
--  3. pivot * ...                     → put it back in the world

-- models have a pivot built in:
model.WorldPivot = pivot
model:PivotTo(model:GetPivot() * swing)`,
  body:`<p>Rotating a part spins it around its <b>centre</b>. A door should spin around its hinge instead. The trick is three steps in one line: express the part relative to the pivot (<code>pivot:Inverse() * cf</code>), rotate, then put it back (<code>pivot * …</code>).</p>
<p>Slide the pivot along the door. At the edge it swings like a real door; at the middle it spins in place. The dashed curve is the path the door's centre takes.</p>`,
  uses:[`<b>Doors, gates, lids and drawbridges.</b>`,
        `<b>Rotating a whole build</b> around the point the player clicked.`,
        `<b>Swinging weapons and levers</b> around a handle.`],
  gotchas:[`For models, set <code>WorldPivot</code> (or the PrimaryPart) and use <code>PivotTo</code>. It moves every part together.`,
           `Tweening the door's CFrame straight from closed to open cuts a straight line through the corner. Tween a NumberValue for the angle and rebuild the CFrame every frame instead.`]
});

demo({
  id:'cf-camera', title:'Over-the-shoulder camera', short:'focus * Angles * CFrame.new(side, 0, dist)', sig:'focus * CFrame.Angles(0, yaw, 0) * CFrame.Angles(pitch, 0, 0) * CFrame.new(side, 0, distance)',
  view:{theta:0.9, phi:0.9, r:26, ty:2},
  params:[R('yaw','Yaw (mouse X)',-180,180,5,20,'°'), R('pitch','Pitch (mouse Y)',-70,40,5,-15,'°'), R('dist','Distance',4,14,0.5,9), R('side','Shoulder offset',-3,3,0.25,2), T('wall','Wall behind the player',true)],
  setup(K){
    const ray = new THREE.Raycaster();
    const pl = K.part(V(1.4,2,1)); pl.position.set(0,1,0);
    const wall = K.part(V(10,6,0.6),'--part',{front:false, opacity:0.55}); wall.position.set(0,3,5.5);
    const cam = new THREE.Group(); K.add(cam); K.part(V(0.9,0.6,0.8),'--ink',{parent:cam});
    const fr = K.line('--accent',{max:16, parent:cam}), w = 3*Math.tan(35*D2R)*16/9, h = 3*Math.tan(35*D2R);
    const c = [V(-w,-h,-3),V(w,-h,-3),V(w,h,-3),V(-w,h,-3)];
    fr.set([V(),c[0],c[1],V(),c[1],c[2],V(),c[2],c[3],V(),c[3],c[0]]);
    const want = K.point('--muted',0.15), boom = K.line('--muted',{dashed:true}), aim = K.line('--accent',{dashed:true, opacity:0.6});
    const lc = K.label('camera','--accent','big'), lw = K.label('','--bad');
    return {update(p){
      wall.visible = p.wall; wall.updateMatrixWorld(true);
      const focusP = V(0,2.5,0), focus = CF.mul(CF.at(focusP), CF.angles(0,p.yaw*D2R,0), CF.angles(p.pitch*D2R,0,0));
      const wanted = CF.mul(focus, CF.new(p.side,0,p.dist)), WP = CF.pos(wanted);
      let camP = WP.clone(), blocked = false;
      if (p.wall){ const d = WP.clone().sub(focusP); ray.set(focusP, d.clone().normalize()); ray.far = d.length(); const hit = ray.intersectObject(wall.body, false)[0];
        if (hit){ blocked = true; const nm = new THREE.Matrix3().getNormalMatrix(wall.body.matrixWorld); const n = hit.face.normal.clone().applyMatrix3(nm).normalize(); camP = hit.point.clone().addScaledVector(n, 0.3); } }
      const rot = new THREE.Quaternion(); wanted.decompose(V(), rot, V()); cam.position.copy(camP); cam.quaternion.copy(rot);
      want.position.copy(WP); want.visible = blocked; boom.set(focusP, camP);
      aim.set(camP, camP.clone().add(CF.look(wanted).multiplyScalar(12)));
      lc.at(camP.clone().add(V(0,0.8,0))); lw.show(blocked).at(WP.clone().add(V(0,0.5,0))).text('wanted spot (inside the wall)');
      return {camP, blocked};
    }};
  },
  readout:(p,o)=>[['camera', vs(o.camP),'acc'],['wall in the way', o.blocked?'yes, pulled in':'no', o.blocked?'bad':'ok']],
  code:(p,o)=>`camera.CameraType = Enum.CameraType.Scriptable
local yaw, pitch = math.rad(${f(p.yaw)}), math.rad(${f(p.pitch)})   -- change these from mouse delta
local SIDE, DIST = ${f(p.side)}, ${f(p.dist)}

RunService:BindToRenderStep("ShoulderCam", Enum.RenderPriority.Camera.Value + 1, function()
    pitch = math.clamp(pitch, math.rad(-70), math.rad(40))
    local focus = CFrame.new(root.Position + Vector3.new(0, 1.5, 0))
        * CFrame.Angles(0, yaw, 0)
        * CFrame.Angles(pitch, 0, 0)
    local wanted = focus * CFrame.new(SIDE, 0, DIST)

    -- don't let walls get between the camera and the player
    local result = workspace:Raycast(focus.Position, wanted.Position - focus.Position, params)
    local position = result and result.Position + result.Normal * 0.3 or wanted.Position
    camera.CFrame = CFrame.new(position) * wanted.Rotation
end)`,
  body:`<p>A third-person camera is a CFrame chain. Start at the player's head, turn by the yaw, tilt by the pitch, then step back and to the side in that rotated space. Because the step happens <i>after</i> the rotations, the camera swings around the player like it's on a boom.</p>
<p>Real games add one more step: a raycast from the head to where the camera wants to be. If a wall is in the way, put the camera just in front of it. Swing the yaw toward the wall and watch the camera get pulled in.</p>`,
  uses:[`<b>Third-person shooters</b> with a shoulder offset for aiming.`,
        `<b>Custom spectate and replay cameras.</b>`,
        `<b>Vehicle chase cams</b>: replace the yaw with the vehicle's own facing.`],
  gotchas:[`Clamp pitch, or the camera flips over the top.`,
           `Exclude the player's character from the wall raycast, or the camera snaps to their back.`,
           `Update cameras in <code>BindToRenderStep</code> or <code>RenderStepped</code>, not <code>Heartbeat</code>, or the view stutters by a frame.`]
});

demo({
  id:'cf-weld', title:'Welds: C0 and C1', short:'Part0.CFrame * C0 == Part1.CFrame * C1', sig:'Part1.CFrame = Part0.CFrame * C0 * C1:Inverse()',
  view:{theta:0.6, phi:0.95, r:15, ty:2},
  params:[R('body','Body turn',-180,180,5,30,'°'), R('cx','C0 X',-2,2,0.25,0), R('cy','C0 Y',-1,2,0.25,0.5), R('cz','C0 Z',-2,2,0.25,-0.8), R('c1','C1 turn',-180,180,5,0,'°')],
  setup(K){
    const body = K.part(V(2,2.4,1)); K.axes(body, 1.6, {names:false});
    const shield = K.part(V(2.2,2.6,0.3),'--accent');
    const joint = new THREE.Group(); K.add(joint); K.axes(joint, 0.9, {names:false, thick:0.03});
    K.label('Part0 (torso)','--ink','big').attach = {obj:body, local:V(0,1.8,0)};
    K.label('Part1 (shield)','--accent','big').attach = {obj:shield, local:V(0,1.8,0)};
    K.label('joint: Part0 * C0','--ink').attach = {obj:joint, local:V(0,-0.6,0)};
    return {update(p){
      const b = CF.mul(CF.new(0,2,0), CF.angles(0,p.body*D2R,0)); body.setCF(b);
      const C0 = CF.new(p.cx,p.cy,p.cz), C1 = CF.mul(CF.angles(0,p.c1*D2R,0), CF.new(0,0,0.25));
      const j = CF.mul(b, C0); j.decompose(joint.position, joint.quaternion, V());
      const s = CF.mul(b, C0, CF.inv(C1)); shield.setCF(s);
      return {s:CF.pos(s)};
    }};
  },
  readout:(p,o)=>[['shield position', vs(o.s),'acc']],
  code:(p,o)=>`local weld = Instance.new("Weld")
weld.Part0 = torso
weld.Part1 = shield
weld.C0 = CFrame.new(${f(p.cx)}, ${f(p.cy)}, ${f(p.cz)})   -- the joint, in the torso's space
weld.C1 = CFrame.Angles(0, math.rad(${f(p.c1)}), 0) * CFrame.new(0, 0, 0.25)   -- the same joint, in the shield's space
weld.Parent = shield

-- Roblox keeps this true every frame:
-- torso.CFrame * weld.C0 == shield.CFrame * weld.C1
-- so: shield.CFrame = torso.CFrame * weld.C0 * weld.C1:Inverse()`,
  body:`<p>A <code>Weld</code> holds two parts together through one shared joint. <b>C0</b> says where that joint is on Part0, and <b>C1</b> says where the same joint is on Part1. Roblox moves Part1 so that both descriptions land on the same spot and face the same way.</p>
<p>Move C0 to slide the joint around the torso; the shield follows. Turn C1 to spin the shield around the joint. Turn the body and everything comes with it, because C0 is in the torso's own space.</p>`,
  uses:[`<b>Attaching gear</b>: shields, backpacks, hats and weapons held at an exact offset.`,
        `<b>Animation rigs</b>: Motor6D uses the same C0 and C1, plus a Transform that animations change.`,
        `<b>Carrying objects</b>: weld a box in front of the player while they hold it.`],
  gotchas:[`If you only need "stay where it is now", use a <code>WeldConstraint</code>. It records the current offset for you, with no C0 or C1.`,
           `C0 and C1 are in each part's <b>own</b> space. Mixing them up flips the offset to the wrong side.`]
});

{
const {THREE, V, UP, D2R, f, vs, lookOf, CF, R, S, T} = Lab;

demo({
  id:'cf-localvel', title:'Local velocity: drift and strafe', short:'cf:VectorToObjectSpace(vel)', sig:'cf:VectorToObjectSpace(velocity)  →  velocity in the part\'s own axes',
  view:{theta:0.0, phi:0.45, r:18, ty:0},
  params:[R('yaw','Car facing (+ = left)',-180,180,5,0,'°'), R('vdir','Travel direction (+ = left)',-180,180,5,30,'°'), R('speed','Speed',0,60,1,40,' studs/s')],
  setup(K){
    const car = K.part(V(2,0.9,4)); K.axes(car, 2.6, {names:false, thick:0.035});
    const aV = K.arrow('--accent',{thick:0.07}), aF = K.arrow('--z',{thick:0.05}), aS = K.arrow('--x',{thick:0.05}), d1 = K.line('--muted',{dashed:true}), d2 = K.line('--muted',{dashed:true});
    const lv = K.label('velocity','--accent','big'), lf = K.label('','--z'), ls = K.label('','--x'), smokeL = K.label('tyre smoke!','--muted');
    const smoke = [0,1,2,3].map(()=>K.point('--muted',0.35,{opacity:0.35}));
    return {update(p,t){
      const yaw = p.yaw*D2R, cf = CF.mul(CF.new(0,0.6,0), CF.angles(0,yaw,0)); car.setCF(cf);
      const v = lookOf(p.vdir*D2R).multiplyScalar(p.speed), look = lookOf(yaw), right = V(Math.cos(yaw),0,-Math.sin(yaw));
      const fwd = v.dot(look), side = v.dot(right), O = V(0,1.6,0), s = 0.12;
      aV.set(O, v.clone().multiplyScalar(s)); aF.set(O, look.clone().multiplyScalar(fwd*s)); aS.set(O, right.clone().multiplyScalar(side*s));
      d1.set(O.clone().addScaledVector(look, fwd*s), O.clone().addScaledVector(v, s)); d2.set(O.clone().addScaledVector(right, side*s), O.clone().addScaledVector(v, s));
      lv.at(O.clone().addScaledVector(v, s*1.08).add(V(0,0.4,0))); lf.at(O.clone().addScaledVector(look, fwd*s*0.55).add(V(0,0.5,0))).text(`forward ${f(fwd,1)}`); ls.at(O.clone().addScaledVector(right, side*s*0.55).add(V(0,-0.5,0))).text(`sideways ${f(side,1)}`);
      const drifting = Math.abs(side) > 8;
      smoke.forEach((m,i)=>{ m.visible = drifting; const back = CF.pt(cf, V(i<2?-0.9:0.9, -0.3, 1.6 + (i%2)*0.9 + ((t*2+i*0.3)%1)*0.8)); m.position.copy(back); });
      smokeL.show(drifting).at(CF.pt(cf, V(0,1,3.2)));
      return {fwd, side, drift: Math.atan2(side, fwd)/D2R, drifting};
    }};
  },
  readout:(p,o)=>[['forward speed  (-localV.Z)', f(o.fwd,1)],['sideways speed (localV.X)', f(o.side,1), o.drifting ? 'bad' : ''],['drift angle', f(o.drift,0)+'°','acc']],
  code:(p,o)=>`local velocity = car.AssemblyLinearVelocity
local localV = car.CFrame:VectorToObjectSpace(velocity)

local forwardSpeed = -localV.Z     --> ${f(o.fwd,1)}   (-Z is forward)
local sideSpeed = localV.X         --> ${f(o.side,1)}   (+ = sliding right)

smoke.Enabled = math.abs(sideSpeed) > 8          -- ${o.drifting ? 'on' : 'off'}
local driftAngle = math.deg(math.atan2(sideSpeed, forwardSpeed))   --> ${f(o.drift,0)}°

-- characters: pick strafe / backpedal animations
local moveLocal = root.CFrame:VectorToObjectSpace(humanoid.MoveDirection)`,
  body:`<p>A velocity in world space says which way something moves on the map. Usually you care how it moves <b>relative to itself</b>: forwards, backwards, or sliding sideways. <code>VectorToObjectSpace</code> rotates the velocity into the part's own axes, ignoring its position.</p>
<p>Then <code>-localV.Z</code> is the forward speed and <code>localV.X</code> is the sideways speed. Turn the car away from the direction it's travelling and the sideways part grows: that's a drift, and past 8 studs/s the tyres smoke.</p>`,
  uses:[`<b>Drift and skid effects</b> for cars and karts.`,
        `<b>Strafe animations</b>: walking left, right or backwards depending on local movement.`,
        `<b>Tyre grip</b>: cancel some of the sideways velocity each frame to stop cars sliding like ice.`],
  gotchas:[`<code>VectorToObjectSpace</code> is for directions. <code>PointToObjectSpace</code> would also subtract the position, which is wrong for a velocity.`,
           `Forward is −Z, so negate Z to get a positive forward speed.`]
});

demo({
  id:'cf-euler', title:'Reading angles back', short:'cf:ToEulerAnglesYXZ()', sig:'local rx, ry, rz = cf:ToEulerAnglesYXZ()',
  view:{theta:0.7, phi:0.85, r:15, ty:1.5},
  params:[R('yaw','Turn (Y)',-180,180,5,60,'°'), R('pitch','Tilt (X)',-89,89,1,20,'°'), R('roll','Roll (Z)',-180,180,5,0,'°')],
  setup(K){
    const part = K.part(V(2,1,3)); K.axes(part, 2.4, {names:false}); const sec = K.sector('--accent',0.2);
    K.ring(4,'--muted',{y:0.03}); [['N',0],['W',90],['S',180],['E',-90]].forEach(([n,a])=>K.label(n,'--muted','big').at(lookOf(a*D2R).multiplyScalar(4.6).setY(0.2)));
    const lh = K.label('','--accent','big');
    return {update(p){
      const cf = CF.mul(CF.new(0,2,0), CF.yxz(p.pitch*D2R, p.yaw*D2R, p.roll*D2R)); part.setCF(cf);
      const eY = new THREE.Euler().setFromRotationMatrix(cf, 'YXZ'), eX = new THREE.Euler().setFromRotationMatrix(cf, 'XYZ');
      const look = CF.look(cf), heading = Math.atan2(-look.x, -look.z);
      sec.setSector(V(), heading/2, Math.abs(heading)/2, 3.6); lh.at(lookOf(heading).multiplyScalar(3.2).setY(0.3)).text(`heading ${f(heading/D2R,0)}°`);
      return {eY, eX, heading};
    }};
  },
  readout:(p,o)=>[['ToEulerAnglesYXZ', `${f(o.eY.x/D2R,0)}°, ${f(o.eY.y/D2R,0)}°, ${f(o.eY.z/D2R,0)}°`,'acc'],['ToEulerAnglesXYZ', `${f(o.eX.x/D2R,0)}°, ${f(o.eX.y/D2R,0)}°, ${f(o.eX.z/D2R,0)}°`],['heading from LookVector', f(o.heading/D2R,0)+'°']],
  code:(p,o)=>`part.CFrame = CFrame.new(0, 2, 0) * CFrame.fromEulerAnglesYXZ(math.rad(${p.pitch}), math.rad(${p.yaw}), math.rad(${p.roll}))

local rx, ry, rz = part.CFrame:ToEulerAnglesYXZ()
print(math.deg(rx), math.deg(ry), math.deg(rz))   --> ${f(o.eY.x/D2R,0)}  ${f(o.eY.y/D2R,0)}  ${f(o.eY.z/D2R,0)}   (matches part.Orientation)

local ax, ay, az = part.CFrame:ToEulerAnglesXYZ()
print(math.deg(ax), math.deg(ay), math.deg(az))   --> ${f(o.eX.x/D2R,0)}  ${f(o.eX.y/D2R,0)}  ${f(o.eX.z/D2R,0)}   (same rotation, other numbers!)

-- just the compass heading, ignoring tilt:
local look = part.CFrame.LookVector
local heading = math.deg(math.atan2(-look.X, -look.Z))   --> ${f(o.heading/D2R,0)}`,
  body:`<p>Going from a CFrame back to angles is useful for saving, UI and snapping. <code>ToEulerAnglesYXZ</code> returns the turn, tilt and roll that rebuild it with <code>fromEulerAnglesYXZ</code>. It's the same order the Properties window uses for <code>Orientation</code>.</p>
<p>The catch: one rotation can be written as many different sets of angles. Compare the two readouts. Both describe the exact same orientation, but the XYZ numbers look nothing like what you typed. Always read back in the same order you built with.</p>
<p>If you only need the compass heading, <code>atan2</code> on the LookVector is simpler and doesn't care about tilt or roll.</p>`,
  uses:[`<b>Compasses and minimaps</b>: the heading in degrees.`,
        `<b>Saving rotations</b> to a DataStore as three numbers.`,
        `<b>Snapping a placed object</b> to 90° steps: read the Y angle, round it, rebuild.`],
  gotchas:[`Near a tilt of ±90°, turn and roll blend together (gimbal lock) and the numbers jump around.`,
           `Angles come back in radians, between −π and π.`]
});
}
})();
