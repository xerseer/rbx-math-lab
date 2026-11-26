(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, vs, lookOf, CF, G, R, S, T, clamp} = Lab;
const demo = Lab.subject({
  id:'ik', title:'Kinematics & IK', glyph:'arm', level:'Advanced',
  blurb:'Trigonometry for limbs: the law of cosines, two-bone arms and legs, and FABRIK chains for tails and tentacles.'
});

function bone(K, color, thick=0.2){
  const m = K.add(new THREE.Mesh(G.cyl, K.mat(color)));
  m.set = (a,b)=>{ const d = b.clone().sub(a), L = d.length(); m.visible = L > 1e-4; if (!m.visible) return m; m.scale.set(thick, L, thick); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.divideScalar(L)); return m; };
  return m;
}

demo({
  id:'ik-cosines', title:'Law of cosines', short:'angle from three sides', sig:'C = math.acos((a² + b² − c²) / (2ab))',
  view:{theta:0.0, phi:1.35, r:18, ty:3},
  params:[R('a','Side a (B to C)',1,10,0.25,6), R('b','Side b (A to C)',1,10,0.25,5), R('c','Side c (A to B)',1,10,0.25,7)],
  setup(K){
    const eAB = bone(K,'--x',0.08), eAC = bone(K,'--z',0.08), eBC = bone(K,'--y',0.08);
    const pA = K.point('--ink',0.18), pB = K.point('--ink',0.18), pC = K.point('--ink',0.18);
    const lA = K.label('','--ink','big'), lB = K.label('','--ink','big'), lC = K.label('','--ink','big'), la = K.label('a','--y'), lb = K.label('b','--z'), lc = K.label('c','--x'), warn = K.label('','--bad','big');
    return {update(p){
      const {a,b,c} = p, ok = a < b+c && b < a+c && c < a+b;
      const cosA = clamp((b*b + c*c - a*a)/(2*b*c),-1,1), A = Math.acos(cosA), cosB = clamp((a*a + c*c - b*b)/(2*a*c),-1,1), Bn = Math.acos(cosB), Cn = Math.PI - A - Bn;
      const ox = -c/2, PA = V(ox,0.5,0), PB = V(ox+c,0.5,0), PC = ok ? V(ox + b*Math.cos(A), 0.5 + b*Math.sin(A), 0) : null;
      pA.position.copy(PA); pB.position.copy(PB); eAB.set(PA,PB); lc.at(PA.clone().lerp(PB,0.5).add(V(0,-0.5,0)));
      if (ok){ pC.visible = true; pC.position.copy(PC); eAC.set(PA,PC); eBC.set(PB,PC); warn.show(false);
        lb.show(true).at(PA.clone().lerp(PC,0.5).add(V(-0.5,0.2,0))); la.show(true).at(PB.clone().lerp(PC,0.5).add(V(0.5,0.2,0)));
        lA.show(true).at(PA.clone().add(V(-0.6,-0.4,0))).text(`A ${f(A/D2R,1)}°`); lB.show(true).at(PB.clone().add(V(0.6,-0.4,0))).text(`B ${f(Bn/D2R,1)}°`); lC.show(true).at(PC.clone().add(V(0,0.6,0))).text(`C ${f(Cn/D2R,1)}°`); }
      else { pC.visible = false; eAC.set(PA, PA.clone().add(V(b*0.7,b*0.7,0).setLength(b))); eBC.set(PB, PB.clone().add(V(-a*0.7,a*0.7,0).setLength(a))); [lA,lB,lC,la,lb].forEach(L=>L.show(false)); warn.show(true).at(V(0,6,0)).text("these sides can't make a triangle"); }
      return {ok, A, Bn, Cn};
    }};
  },
  readout:(p,o)=>o.ok ? [['angle A', f(o.A/D2R,2)+'°'],['angle B', f(o.Bn/D2R,2)+'°'],['angle C', f(o.Cn/D2R,2)+'°','acc'],['sum', '180°']] : [['triangle', 'impossible: one side is longer than the other two together','bad']],
  code:(p,o)=>`-- three side lengths → any angle
local a, b, c = ${f(p.a)}, ${f(p.b)}, ${f(p.c)}

local function angleOpposite(opposite, side1, side2)
    local cosine = (side1 ^ 2 + side2 ^ 2 - opposite ^ 2) / (2 * side1 * side2)
    return math.acos(math.clamp(cosine, -1, 1))     -- clamp guards impossible triangles
end

local C = angleOpposite(c, a, b)     --> ${o.ok ? f(o.Cn/D2R,2)+'°' : 'no real triangle'}
print(math.deg(C))

-- in IK: upper arm, forearm and shoulder-to-target distance are the three sides
local elbowAngle = angleOpposite(distanceToTarget, upperLength, lowerLength)`,
  body:`<p>If you know all three sides of a triangle, the <b>law of cosines</b> gives every angle. It's Pythagoras extended to triangles without a right angle: <code>c² = a² + b² − 2ab·cos(C)</code>, rearranged to solve for the angle.</p>
<p>This is the heart of limb IK. An arm is a triangle: upper arm, forearm, and the straight line from shoulder to hand. Knowing those three lengths tells you exactly how far to bend the elbow. Push one side longer than the other two together and the triangle can't close, which in IK means the target is out of reach.</p>`,
  uses:[`<b>Elbow and knee angles</b> for two-bone IK (next topic).`,
        `<b>Rope and crane rigs</b>: the angle needed to reach a point with fixed arm lengths.`,
        `<b>Navigation</b>: angles between three known distances.`],
  gotchas:[`Clamp the cosine to −1…1 before <code>math.acos</code>. Out-of-reach targets push it outside and give NaN.`,
           `The angle comes back in radians, from 0 to π.`]
});

demo({
  id:'ik-twobone', title:'Two-bone IK: arms and legs', short:'law of cosines + pole', sig:'elbow = shoulder + dir·cos(a)·L1 + bend·sin(a)·L1',
  view:{theta:0.6, phi:1.05, r:20, ty:3.5},
  params:[R('tx','Target X',-7,7,0.25,3.5), R('ty','Target Y',-1,10,0.25,2.5), R('tz','Target Z',-7,7,0.25,-3), R('l1','Upper arm',1,5,0.25,3), R('l2','Forearm',1,5,0.25,3), R('pole','Elbow points toward',-180,180,5,-60,'°')],
  setup(K){
    const Sh = V(0,5,0); K.part(V(2.2,3,1.2),'--part').position.set(-1.2,4.4,0);
    const up = bone(K,'--va',0.25), lo = bone(K,'--vb',0.22), sj = K.point('--ink',0.3), ej = K.point('--ink',0.26), hj = K.point('--accent',0.3);
    const tg = K.ring(0.6,'--accent'), tgp = K.point('--accent',0.12,{opacity:0.6}), reach = K.wsphere(1,'--muted',0.08), poleP = K.point('--muted',0.2), poleL = K.line('--muted',{dashed:true});
    const le = K.label('','--ink','big'), lr = K.label('','--bad');
    return {update(p){
      const T = V(p.tx,p.ty,p.tz), toT = T.clone().sub(Sh), raw = toT.length(), d = clamp(raw, Math.abs(p.l1-p.l2)+1e-3, p.l1+p.l2-1e-3), dir = toT.clone().normalize();
      const a = Math.acos(clamp((p.l1*p.l1 + d*d - p.l2*p.l2)/(2*p.l1*d),-1,1));
      const pole = Sh.clone().add(lookOf(p.pole*D2R).multiplyScalar(5)).add(V(0,-1,0)), pv = pole.clone().sub(Sh);
      let bend = pv.sub(dir.clone().multiplyScalar(pv.dot(dir))); if (bend.length() < 1e-4) bend = V(0,-1,0).sub(dir.clone().multiplyScalar(-dir.y)); bend.normalize();
      const E = Sh.clone().addScaledVector(dir, Math.cos(a)*p.l1).addScaledVector(bend, Math.sin(a)*p.l1), H = Sh.clone().addScaledVector(dir, d);
      up.set(Sh,E); lo.set(E,H); sj.position.copy(Sh); ej.position.copy(E); hj.position.copy(H);
      tg.position.copy(T); tgp.position.copy(T); reach.scale.setScalar(p.l1+p.l2); reach.position.copy(Sh);
      poleP.position.copy(pole); poleL.set(E, pole);
      const elbow = Math.acos(clamp((p.l1*p.l1 + p.l2*p.l2 - d*d)/(2*p.l1*p.l2),-1,1));
      le.at(E.clone().add(V(0,0.6,0))).text(`elbow ${f(elbow/D2R,0)}°`); lr.show(raw > p.l1+p.l2).at(T.clone().add(V(0,0.7,0))).text('out of reach');
      return {elbow, raw, reach:p.l1+p.l2, E};
    }};
  },
  readout:(p,o)=>[['distance to target', f(o.raw,2)],['max reach', f(o.reach,2), o.raw > o.reach ? 'bad' : 'ok'],['elbow angle', f(o.elbow/D2R,1)+'°','acc'],['elbow position', vs(o.E)]],
  code:(p,o)=>`local L1, L2 = ${f(p.l1)}, ${f(p.l2)}          -- upper arm, forearm

local function solveTwoBone(shoulder, target, pole)
    local toTarget = target - shoulder
    local d = math.clamp(toTarget.Magnitude, math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3)
    local dir = toTarget.Unit

    -- law of cosines: angle between the upper arm and the shoulder→target line
    local a = math.acos(math.clamp((L1 ^ 2 + d ^ 2 - L2 ^ 2) / (2 * L1 * d), -1, 1))

    -- which way the elbow bends: toward the pole, at 90° to dir
    local toPole = pole - shoulder
    local bend = (toPole - dir * toPole:Dot(dir)).Unit

    local elbow = shoulder + dir * (math.cos(a) * L1) + bend * (math.sin(a) * L1)
    local hand = shoulder + dir * d
    return elbow, hand
end

local elbow, hand = solveTwoBone(shoulder.Position, doorHandle.Position, elbowHint.Position)
upperArm.CFrame = CFrame.lookAt((shoulder.Position + elbow) / 2, elbow)
forearm.CFrame = CFrame.lookAt((elbow + hand) / 2, hand)`,
  body:`<p>Two-bone IK answers "where does the elbow go so the hand reaches the target?". The law of cosines gives the angle at the shoulder from three lengths: upper arm, forearm, and the distance to the target. That fixes how far from the straight line the elbow sits, but not <i>which side</i>.</p>
<p>The <b>pole</b> (grey ball) picks the side: the elbow bends toward it. Turn the pole and watch the elbow swing around the shoulder-to-target line while the hand stays put. Move the target outside the wire sphere and the arm stretches out straight toward it.</p>`,
  uses:[`<b>Feet on stairs and slopes</b>: raycast down for each foot, then solve the leg.`,
        `<b>Hands on objects</b>: steering wheels, ledges, door handles, weapons.`,
        `<b>Mechs and robots</b> with procedural walking.`],
  gotchas:[`Roblox has an <code>IKControl</code> instance that does this for character rigs. Write your own for custom rigs or when you need full control.`,
           `Keep the pole away from the shoulder-to-target line, or the bend direction becomes unstable.`]
});

demo({
  id:'ik-fabrik', title:'FABRIK: chains and tentacles', short:'forwards and backwards passes', sig:'pull the tip to the target, then pull the base back, repeat', time:true,
  view:{theta:0.5, phi:1.0, r:24, ty:3},
  params:[R('n','Segments',3,14,1,8), R('len','Segment length',0.5,2,0.1,1.1), R('iter','Iterations per frame',1,10,1,3), T('moving','Target moves',true), R('ty','Target height',0,9,0.25,4)],
  setup(K){
    const base = V(0,0.3,0); K.part(V(1.4,0.6,1.4),'--part',{front:false}).position.set(0,0.3,0);
    const bones = Array.from({length:14}, (_,i)=>bone(K, i%2 ? '--va' : '--vb', 0.22 - i*0.01)), joints = Array.from({length:15}, ()=>K.point('--ink',0.14));
    const tg = K.point('--accent',0.3), reach = K.ring(1,'--muted',{dashed:true, y:0.03});
    let pts = null, key = '';
    return {update(p,t){
      const n = p.n, L = p.len, k = n+'|'+L;
      if (k !== key){ key = k; pts = []; for (let i=0;i<=n;i++) pts.push(base.clone().add(V(0, i*L, 0))); }
      const T = p.moving ? V(Math.sin(t*0.7)*6, p.ty + Math.sin(t*1.3)*2, Math.cos(t*0.7)*4) : V(4, p.ty, -3);
      const total = n*L;
      if (T.distanceTo(base) >= total){ const d = T.clone().sub(base).normalize(); for (let i=0;i<=n;i++) pts[i] = base.clone().addScaledVector(d, i*L); }
      else for (let it=0; it<p.iter; it++){
        pts[n].copy(T); for (let i=n-1;i>=0;i--){ const d = pts[i].clone().sub(pts[i+1]).normalize(); pts[i] = pts[i+1].clone().addScaledVector(d, L); }
        pts[0].copy(base); for (let i=0;i<n;i++){ const d = pts[i+1].clone().sub(pts[i]).normalize(); pts[i+1] = pts[i].clone().addScaledVector(d, L); }
      }
      bones.forEach((b,i)=>{ b.visible = i < n; if (i < n) b.set(pts[i], pts[i+1]); });
      joints.forEach((j,i)=>{ j.visible = i <= n; if (i <= n) j.position.copy(pts[i]); });
      tg.position.copy(T); reach.scale.set(total,1,total);
      return {gap: pts[n].distanceTo(T), total};
    }};
  },
  readout:(p,o)=>[['chain length', f(o.total,1)],['tip to target', f(o.gap,3), o.gap < 0.05 ? 'ok' : 'bad']],
  code:(p,o)=>`local N, LENGTH, ITERATIONS = ${p.n}, ${f(p.len)}, ${p.iter}
local points = {}   -- points[1] is the base, points[N + 1] is the tip

local function solve(base, target)
    for _ = 1, ITERATIONS do
        -- backwards: put the tip on the target, drag each joint after it
        points[N + 1] = target
        for i = N, 1, -1 do
            points[i] = points[i + 1] + (points[i] - points[i + 1]).Unit * LENGTH
        end
        -- forwards: put the base back where it belongs, drag the rest after it
        points[1] = base
        for i = 1, N do
            points[i + 1] = points[i] + (points[i + 1] - points[i]).Unit * LENGTH
        end
    end
end`,
  body:`<p>Two-bone IK has a neat formula, but tails, tentacles, spines and robot arms have many joints. <b>FABRIK</b> (forward and backward reaching IK) solves any chain with nothing more than "move this point toward that one, keeping the length".</p>
<p>First drag the tip onto the target and let every joint follow, which pulls the base away. Then put the base back and let everything follow the other way. Each round trip gets closer; a few iterations per frame is usually enough. Set iterations to 1 and the tip lags; raise it and it locks on. Starting from last frame's pose keeps the motion smooth.</p>`,
  uses:[`<b>Tails, tentacles, snakes and necks.</b>`,
        `<b>Robot arms and cranes</b> with many joints.`,
        `<b>Procedural creatures</b> whose limbs reach for things.`],
  gotchas:[`Plain FABRIK has no joint limits, so chains can fold sharply. Clamp each joint's angle after a pass for more natural shapes.`,
           `If the target is out of reach, just point the whole chain at it, as the demo does.`]
});
})();
