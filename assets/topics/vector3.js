(function(){
"use strict";
const {V, f, v3, vs, R, T} = Lab;
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
})();
