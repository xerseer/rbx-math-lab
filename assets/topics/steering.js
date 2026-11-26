(function(){
"use strict";
const {THREE, V, UP, f, R, S, T, clamp, mulberry32} = Lab;
const {inst} = Lab.kit2;
const demo = Lab.subject({
  id:'steer', title:'Steering & flocking', glyph:'boids', level:'Advanced',
  blurb:'Seek and arrive, natural wandering, and flocks of birds or fish from three simple rules.'
});

const limit = (v, max)=>{ const l = v.length(); if (l > max) v.multiplyScalar(max/l); return v; };
const flat = v=>{ v.y = 0; return v; };

/* An agent shown as a part that faces its velocity. */
function agentPart(K, color='--accent'){
  const g = K.part(V(0.9, 0.6, 1.6), color);
  g.face = (pos, vel)=>{ g.position.copy(pos); if (vel.lengthSq() > 1e-6) g.lookAt(pos.clone().add(vel)); return g; };
  return g;
}

demo({
  id:'st-seek', title:'Seek and arrive', short:'steer = desired − velocity', sig:'desired = (target − pos).Unit * maxSpeed   ·   steer = clamp(desired − velocity, maxForce)   ·   arrive: slow inside a radius',
  view:{theta:0.5, phi:0.95, r:34, ty:0}, env:'grid', time:true,
  params:[R('speed','Max speed',4,20,0.5,10), R('force','Max steering force',2,40,1,12), T('arrive','Arrive (slow down near the target)',true), R('slow','Slowing radius',1,10,0.5,5), S('path','Target',[['loop','Moves in a loop'],['jump','Jumps around']],'loop')],
  setup(K){
    const agent = agentPart(K), target = K.point('--va', 0.45), slowRing = K.line('--va', {max:65, dashed:true, opacity:0.7});
    const vArrow = K.arrow('--accent', {thick:0.05}), dArrow = K.arrow('--muted', {thick:0.04, opacity:0.7}), sArrow = K.arrow('--vb', {thick:0.05});
    const trail = K.line('--accent', {max:120, opacity:0.45});
    const pos = V(-10, 0.4, 8), vel = V(0, 0, -4), tgt = V(), trailPts = [];
    let last = 0;
    return {update(p, t){
      let dt = t - last; last = t; if (dt < 0 || dt > 0.2){ dt = 0; if (t < 0.01){ pos.set(-10, 0.4, 8); vel.set(0, 0, -4); trailPts.length = 0; } }
      if (p.path === 'loop') tgt.set(Math.sin(t*0.5)*11, 0.45, Math.sin(t)*6);
      else { const k = Math.floor(t/3), r = mulberry32(k*7 + 3); tgt.set(r()*24 - 12, 0.45, r()*16 - 8); }
      const to = flat(tgt.clone().sub(pos)), dist = to.length();
      let want = p.speed; if (p.arrive && dist < p.slow) want = p.speed*dist/p.slow;
      const desired = dist > 1e-4 ? to.multiplyScalar(want/dist) : V();
      const steer = limit(desired.clone().sub(vel), p.force);
      vel.addScaledVector(steer, dt); limit(vel, p.speed); pos.addScaledVector(vel, dt);
      agent.face(pos, vel); target.position.copy(tgt);
      const ring = []; for (let i=0;i<=64;i++){ const a = i/64*Math.PI*2; ring.push(V(tgt.x + Math.cos(a)*p.slow, 0.05, tgt.z + Math.sin(a)*p.slow)); }
      slowRing.set(ring); slowRing.visible = p.arrive;
      const up = V(0, 1.2, 0);
      vArrow.set(pos.clone().add(up), vel.clone().multiplyScalar(0.35)); dArrow.set(pos.clone().add(up), desired.clone().multiplyScalar(0.35));
      sArrow.set(pos.clone().add(up).addScaledVector(vel, 0.35), steer.clone().multiplyScalar(0.2));
      if (dt > 0){ trailPts.push(pos.clone().setY(0.05)); if (trailPts.length > 120) trailPts.shift(); }
      if (trailPts.length > 1) trail.set(trailPts);
      return {speed:vel.length(), dist, steer:steer.length()};
    }};
  },
  readout:(p,o)=>[['speed', f(o.speed,1)+' studs/s','acc'],['distance to target', f(o.dist,1)],['steering force', f(o.steer,1)]],
  code:(p)=>`local MAX_SPEED, MAX_FORCE, SLOW_RADIUS = ${p.speed}, ${p.force}, ${p.slow}
local velocity = Vector3.zero

local function Limit(vector: Vector3, maximum: number): Vector3
    return vector.Magnitude > maximum and vector.Unit * maximum or vector
end

runService.Heartbeat:Connect(function(deltaTime)
    local toTarget = target.Position - agent.Position
    local distance = toTarget.Magnitude
    if distance < 0.01 then return end
${p.arrive ? `
    local wantedSpeed = math.min(MAX_SPEED, MAX_SPEED * distance / SLOW_RADIUS)   -- arrive
    local desired = toTarget.Unit * wantedSpeed` : `
    local desired = toTarget.Unit * MAX_SPEED`}
    local steer = Limit(desired - velocity, MAX_FORCE)       -- turn gradually, not instantly

    velocity = Limit(velocity + steer * deltaTime, MAX_SPEED)
    agent.CFrame = CFrame.lookAt(agent.Position + velocity * deltaTime, agent.Position + velocity * 2)
end)`,
  body:`<p>Pointing straight at a target and moving looks robotic. <b>Steering</b> works like a driver instead: work out the velocity you'd <i>like</i> (grey arrow, straight at the target at full speed), compare it with the velocity you <i>have</i> (orange), and push a little towards the difference (pink). The push is capped by the max force, so the agent curves round instead of snapping.</p>
<p><b>Arrive</b> adds one rule: inside the slowing radius, the wanted speed shrinks with the distance. Turn it off and the agent overshoots and circles the target. A low max force gives wide, lazy turns; a high one gives tight, twitchy ones.</p>`,
  uses:[`<b>NPCs, pets and drones</b> that follow you smoothly.`,
        `<b>Homing projectiles</b> that can miss if you dodge sharply (low max force).`,
        `<b>Vehicles and boats</b> driven by AI.`],
  gotchas:[`Multiply by <code>deltaTime</code> for both the steering and the movement, or speed depends on frame rate.`,
           `Without arrive (or a stop distance), agents orbit the target forever.`,
           `For walking characters, feed the result into <code>Humanoid:Move</code> instead of setting the CFrame.`]
});

demo({
  id:'st-wander', title:'Wander: natural random movement', short:'a target on a circle ahead', sig:'circleCentre = pos + heading * distance   ·   angle += random jitter   ·   target = centre + (cos a, 0, sin a) * radius',
  view:{theta:0.4, phi:0.85, r:38, ty:0}, env:'grid', time:true,
  params:[R('cd','Circle distance ahead',0,8,0.25,4), R('cr','Circle radius',0.5,6,0.25,2.5), R('jit','Jitter per second',0,12,0.25,5), R('n','Wanderers',1,12,1,6)],
  setup(K){
    const bodies = inst(K, 12), circle = K.line('--va', {max:49, opacity:0.8}), spoke = K.line('--va'), tdot = K.point('--vb', 0.25);
    const arena = K.ring(14, '--muted', {dashed:true, opacity:0.5}), trail = K.line('--accent', {max:150, opacity:0.5});
    const q = new THREE.Quaternion(), tmp = V(), sc = V(0.8, 0.55, 1.5), m4 = new THREE.Matrix4();
    let agents = [], last = 0, trailPts = [];
    const reset = ()=>{ const r = mulberry32(11); agents = Array.from({length:12}, ()=>({pos:V(r()*16 - 8, 0.35, r()*16 - 8), heading:r()*Math.PI*2, a:r()*Math.PI*2})); trailPts = []; };
    reset();
    const rand = mulberry32(5);
    return {update(p, t){
      let dt = t - last; last = t; if (dt < 0 || dt > 0.2){ dt = 0; if (t < 0.01) reset(); }
      bodies.begin();
      agents.slice(0, p.n).forEach((A, i)=>{
        const fwd = V(Math.sin(A.heading), 0, Math.cos(A.heading));
        A.a += (rand()*2 - 1)*p.jit*dt*3;
        const centre = A.pos.clone().addScaledVector(fwd, p.cd), target = centre.clone().add(V(Math.cos(A.a)*p.cr, 0, Math.sin(A.a)*p.cr));
        // steer the heading towards the wander target, and back towards the middle near the edge
        const to = target.sub(A.pos); if (A.pos.length() > 12) to.addScaledVector(A.pos, -0.25);
        const want = Math.atan2(to.x, to.z); let d = want - A.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
        A.heading += clamp(d, -2.5*dt, 2.5*dt);
        A.pos.addScaledVector(V(Math.sin(A.heading), 0, Math.cos(A.heading)), 4*dt);
        q.setFromAxisAngle(UP, A.heading); bodies.add(A.pos, sc, i === 0 ? '--accent' : '--part', q);
        if (i === 0){
          const pts = []; for (let k=0;k<=48;k++){ const b = k/48*Math.PI*2; pts.push(V(centre.x + Math.cos(b)*p.cr, 0.1, centre.z + Math.sin(b)*p.cr)); }
          circle.set(pts); const tp = V(centre.x + Math.cos(A.a)*p.cr, 0.1, centre.z + Math.sin(A.a)*p.cr);
          spoke.set(A.pos.clone().setY(0.1), centre.clone().setY(0.1)); tdot.position.copy(tp);
          if (dt > 0){ trailPts.push(A.pos.clone().setY(0.05)); if (trailPts.length > 150) trailPts.shift(); }
          if (trailPts.length > 1) trail.set(trailPts);
        }
      });
      bodies.end();
      return {};
    }};
  },
  readout:(p)=>[['turn smoothness', p.cd > p.cr ? 'gentle curves' : 'tight wiggles','acc'],['circle', `${p.cd} ahead, radius ${p.cr}`]],
  code:(p)=>`local CIRCLE_DISTANCE, CIRCLE_RADIUS, JITTER = ${p.cd}, ${p.cr}, ${p.jit}
local wanderAngle = 0

local function WanderTarget(root: BasePart, deltaTime: number): Vector3
    wanderAngle += (math.random() * 2 - 1) * JITTER * deltaTime      -- nudge, don't jump
    local centre = root.Position + root.CFrame.LookVector * CIRCLE_DISTANCE
    return centre + Vector3.new(math.cos(wanderAngle), 0, math.sin(wanderAngle)) * CIRCLE_RADIUS
end

-- every frame: seek the wander target (see "Seek and arrive")
humanoid:MoveTo(WanderTarget(root, deltaTime))`,
  body:`<p>Picking a brand new random direction every second makes animals look broken. <b>Wander</b> keeps a small circle just in front of the agent and a target point on its edge. Each frame the point only <b>slides a little</b> around the circle, and the agent seeks it.</p>
<p>Because the circle is ahead, the agent can never turn sharply: a far, small circle gives gentle drifting curves, a near, big circle gives nervous wiggles. The orange wanderer shows its circle (teal) and target (pink); the rest just wander.</p>`,
  uses:[`<b>Ambient wildlife</b>: fish, birds, chickens, butterflies.`,
        `<b>Idle NPCs</b> milling around a town square.`,
        `<b>Combine with other forces</b>: wander + stay inside an area + avoid players.`],
  gotchas:[`Keep the jitter scaled by <code>deltaTime</code>, or wanderers twitch more on fast computers.`,
           `Wanderers drift off forever unless something pulls them back. Add a gentle force towards home when they get far away.`]
});

demo({
  id:'st-flock', title:'Flocking: three simple rules', short:'separation · alignment · cohesion', sig:'steer = separation·w₁ + alignment·w₂ + cohesion·w₃   (from neighbours within a radius)',
  view:{theta:0.3, phi:0.75, r:40, ty:0}, env:'grid', time:true,
  params:[R('sep','Separation (don\'t crowd)',0,4,0.1,1.6), R('ali','Alignment (match heading)',0,4,0.1,1.0), R('coh','Cohesion (stay together)',0,4,0.1,0.8), R('rad','Neighbour radius',1,8,0.25,4), R('n','Birds',10,80,1,50)],
  setup(K){
    const birds = inst(K, 80), q = new THREE.Quaternion(), sc = V(0.45, 0.3, 1.1), FWD = V(0, 0, 1), dir = V();
    const arena = K.ring(16, '--muted', {dashed:true, opacity:0.5}), hoodRing = K.line('--va', {max:49, opacity:0.7});
    let flock = [], last = 0;
    const reset = ()=>{ const r = mulberry32(21); flock = Array.from({length:80}, ()=>({pos:V(r()*20 - 10, 0.5 + r()*3, r()*20 - 10), vel:V(r()*2 - 1, 0, r()*2 - 1).normalize().multiplyScalar(4)})); };
    reset();
    return {update(p, t){
      let dt = t - last; last = t; if (dt < 0 || dt > 0.2){ dt = 0; if (t < 0.01) reset(); }
      const B = flock.slice(0, p.n), r2 = p.rad*p.rad;
      const steer = B.map(b=>{
        const sep = V(), ali = V(), coh = V(); let n = 0;
        for (const o of B){ if (o === b) continue; const d = b.pos.clone().sub(o.pos), l2 = d.lengthSq(); if (l2 > r2 || l2 < 1e-6) continue;
          sep.addScaledVector(d, 1/l2); ali.add(o.vel); coh.add(o.pos); n++; }
        const s = V();
        if (n){ ali.divideScalar(n).sub(b.vel); coh.divideScalar(n).sub(b.pos);
          s.addScaledVector(sep, p.sep*6).addScaledVector(ali, p.ali*0.8).addScaledVector(coh, p.coh*0.6); }
        if (b.pos.length() > 14) s.addScaledVector(b.pos, -0.5);   // stay in the arena
        s.y += (2 - b.pos.y)*0.8;
        return limit(s, 12);
      });
      birds.begin();
      B.forEach((b,i)=>{ b.vel.addScaledVector(steer[i], dt); const sp = b.vel.length(); if (sp > 7) b.vel.multiplyScalar(7/sp); if (sp < 3 && sp > 1e-6) b.vel.multiplyScalar(3/sp);
        b.pos.addScaledVector(b.vel, dt);
        q.setFromUnitVectors(FWD, dir.copy(b.vel).normalize()); birds.add(b.pos, sc, i === 0 ? '--accent' : '--va', q); });
      birds.end();
      const h = B[0], pts = []; for (let k=0;k<=48;k++){ const a = k/48*Math.PI*2; pts.push(V(h.pos.x + Math.cos(a)*p.rad, h.pos.y, h.pos.z + Math.sin(a)*p.rad)); }
      hoodRing.set(pts);
      let near = 0; for (const o of B) if (o !== h && o.pos.distanceToSquared(h.pos) <= r2) near++;
      return {near};
    }};
  },
  readout:(p,o)=>[['orange bird\'s neighbours', String(o.near),'acc'],['checks per frame', `${p.n} × ${p.n - 1} = ${p.n*(p.n-1)}`]],
  code:(p)=>`local SEPARATION, ALIGNMENT, COHESION = ${p.sep}, ${p.ali}, ${p.coh}
local RADIUS = ${p.rad}

local function FlockForce(bird, flock): Vector3
    local separation, alignment, cohesion, count = Vector3.zero, Vector3.zero, Vector3.zero, 0
    for _, other in flock do
        local offset = bird.Position - other.Position
        local distance = offset.Magnitude
        if other ~= bird and distance < RADIUS and distance > 0 then
            separation += offset / (distance * distance)   -- push away, harder when close
            alignment += other.Velocity
            cohesion += other.Position
            count += 1
        end
    end
    if count == 0 then return Vector3.zero end
    return separation * SEPARATION
        + (alignment / count - bird.Velocity) * ALIGNMENT     -- match the average heading
        + (cohesion / count - bird.Position) * COHESION       -- move to the average position
end`,
  body:`<p>Real flocks have no leader. Each bird only looks at the neighbours inside a small radius (the teal ring around the orange bird) and follows three rules:</p>
<p><b>Separation</b>: don't bump into anyone close. <b>Alignment</b>: fly the same way as your neighbours. <b>Cohesion</b>: drift towards the middle of your neighbours. Add the three together and swirling, splitting, re-joining flocks appear on their own.</p>
<p>Try each slider at 0: no separation and they collapse into a clump; no alignment and they buzz around like gnats; no cohesion and the flock slowly falls apart.</p>`,
  uses:[`<b>Birds, fish schools, bats and insect swarms</b> for atmosphere.`,
        `<b>Crowds and zombie hordes</b> that move as a group without walking through each other.`,
        `<b>RTS units</b> keeping formation while moving.`],
  gotchas:[`Every bird checks every other bird, so the cost grows with the square of the count. For hundreds, use a spatial grid (see <b>Spatial partitioning</b>).`,
           `Run flocks on the client: they are pure decoration and don't need to be sent over the network.`,
           `Cap both the speed and the steering, or flocks speed up until they explode.`]
});

Lab.finder([
  ['Make an NPC follow something smoothly','steer = desired - velocity','st-seek'],
  ['Make a homing missile that can miss','seek with a low max force','st-seek'],
  ['Make animals wander around naturally','wander circle ahead','st-wander'],
  ['Make a flock of birds or a school of fish','separation + alignment + cohesion','st-flock'],
]);
Lab.ref('steer','Steering',[
  ['(target - pos).Unit * maxSpeed','Desired velocity (seek)','toTarget.Unit * 16','Chasing, following'],
  ['desired - velocity','Steering force','Limit(desired - velocity, maxForce)','Smooth turns'],
  ['maxSpeed * dist / slowRadius','Arrive speed','math.min(16, 16 * d / 5)','Stopping on a target'],
  ['centre + (cos a, 0, sin a) * r','Wander target','pos + look * 4 + circle','Ambient wandering'],
  ['offset / distance²','Separation push','sep += offset / (d * d)','Not crowding'],
  ['average(velocity) - velocity','Alignment','ali / count - vel','Matching heading'],
  ['average(position) - position','Cohesion','coh / count - pos','Staying together'],
]);
})();
