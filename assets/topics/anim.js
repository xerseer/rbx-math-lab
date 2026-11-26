(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, vs, CF, G, R, S, T, clamp, noise} = Lab;
const {graph, inst, labels} = Lab.kit2;
const demo = Lab.subject({
  id:'anim', title:'Animation & timing', glyph:'clock',
  blurb:'Moving over time: durations, loops, TweenInfo, sequences, staggering, keyframes, squash and stretch, idle motion and counters.'
});
const backOut = t=>{ const c1 = 1.70158, c3 = c1+1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); };
const EASE = {Linear:t=>t, Quad:t=>1-(1-t)*(1-t), Sine:t=>Math.sin(t*Math.PI/2), Back:backOut};

demo({
  id:'an-duration', title:'Moving over a set time', short:'alpha = elapsed / duration', sig:'alpha = math.clamp(elapsed / duration, 0, 1)   vs   position += direction * speed * dt', time:true,
  view:{theta:0.1, phi:0.75, r:22, ty:0},
  params:[R('dist','Distance',4,18,0.5,12), R('dur','Duration',0.5,4,0.1,1.5,' s'), R('speed','Speed',2,20,0.5,6,' studs/s')],
  setup(K){
    const a = K.part(V(1,1,1),'--accent',{front:false}), b = K.part(V(1,1,1),'--va',{front:false});
    const la = K.label('fixed duration','--accent','big'), lb = K.label('fixed speed','--va','big'), goalA = K.ring(0.7,'--muted',{y:0.04}), goalB = K.ring(0.7,'--muted',{y:0.04});
    return {update(p,t){
      const x0 = -9, period = Math.max(p.dur, p.dist/p.speed) + 1.2, tau = t % period;
      const alpha = clamp(tau/p.dur, 0, 1), xb = Math.min(p.dist, p.speed*tau);
      a.position.set(x0 + p.dist*alpha, 0.5, -2); b.position.set(x0 + xb, 0.5, 2);
      goalA.position.set(x0+p.dist,0,-2); goalB.position.set(x0+p.dist,0,2);
      la.at(a.position.clone().add(V(0,1,0))); lb.at(b.position.clone().add(V(0,1,0)));
      return {alpha, tA:p.dur, tB:p.dist/p.speed};
    }};
  },
  readout:(p,o)=>[['alpha', f(o.alpha,2)],['fixed duration arrives at', f(o.tA,2)+' s','acc'],['fixed speed arrives at', f(o.tB,2)+' s']],
  code:(p,o)=>`-- fixed DURATION: always takes ${p.dur} s, however far
local DURATION = ${p.dur}
local start, from, to = os.clock(), part.Position, goal
while true do
    local alpha = math.clamp((os.clock() - start) / DURATION, 0, 1)
    part.Position = from:Lerp(to, alpha)
    if alpha >= 1 then break end
    RunService.Heartbeat:Wait()
end

-- fixed SPEED: ${p.speed} studs/s, so far trips take longer (${f(o.tB,2)} s here)
part.Position += (goal - part.Position).Unit * math.min(${p.speed} * dt, (goal - part.Position).Magnitude)`,
  body:`<p>There are two ways to animate a move. With a fixed <b>duration</b>, work out how far through the time you are (<code>elapsed / duration</code>, from 0 to 1) and lerp. It always takes the same time, which suits UI, doors and cutscenes.</p>
<p>With a fixed <b>speed</b>, move a set amount every second, so long trips take longer. That suits characters, projectiles and anything physical. Make the distance large and compare when each block arrives.</p>`,
  uses:[`<b>Duration</b>: menus, doors, camera moves, "this takes 1 second" effects.`,`<b>Speed</b>: walking NPCs, bullets, conveyor belts.`,`<b>Mixed</b>: a dash that covers any distance in exactly 0.3 s.`],
  gotchas:[`Always clamp alpha to 0–1, or the last frame overshoots.`,`Use <code>os.clock()</code> differences rather than counting frames.`]
});

demo({
  id:'an-pingpong', title:'Looping and ping-pong', short:'t % d,  1 − |…|', sig:'loop = (t % D) / D   ·   pingpong = 1 − |((t / D) % 2) − 1|', time:true,
  view:{theta:0.0, phi:1.15, r:22, ty:3},
  params:[S('mode','Pattern',[['loop','Loop (saw)'],['ping','Ping-pong (triangle)'],['smooth','Smooth ping-pong (cosine)']],'ping'), R('D','Duration',0.5,3,0.1,1.5,' s')],
  setup(K){
    const gr = graph(K,{x0:-10, y0:3, w:20, h:4, z:-3, xr:[0,6], yr:[0,1], xLabel:'time →', xTicks:[[0,'0'],[3,'3 s'],[6,'6 s']], yTicks:[[0,'0'],[1,'1']]});
    const cv = gr.curve('--accent', 300), dot = gr.dot('--accent'), box = K.part(V(1,1,1),'--accent',{front:false}); K.line('--muted',{dashed:true}).set(V(-8,0.05,2.5),V(8,0.05,2.5));
    return {update(p,t){
      const fn = x=>p.mode==='loop' ? (x % p.D)/p.D : p.mode==='ping' ? 1 - Math.abs(((x/p.D) % 2) - 1) : 0.5 - 0.5*Math.cos(x/p.D*Math.PI);
      cv.plot(fn); const tt = t % 6, a = fn(tt); dot.at(tt, a); box.position.set(-8 + 16*a, 0.5, 2.5);
      return {a};
    }};
  },
  readout:(p,o)=>[['alpha', f(o.a,2),'acc']],
  code:(p,o)=>`local D = ${p.D}
local t = os.clock()
${p.mode==='loop' ? `local alpha = (t % D) / D                         -- 0 → 1, jump back, repeat` : p.mode==='ping' ? `local alpha = 1 - math.abs(((t / D) % 2) - 1)     -- 0 → 1 → 0 → 1 ...` : `local alpha = 0.5 - 0.5 * math.cos(t / D * math.pi)  -- smooth back and forth`}
platform.Position = pointA:Lerp(pointB, alpha)`,
  body:`<p>For endless motion you don't need a timer that resets: build the 0-to-1 value straight from the clock. <code>%</code> wraps time into a repeating ramp (a <b>loop</b> that jumps back). Folding it with an absolute value makes it go up and back down (<b>ping-pong</b>).</p>
<p>The triangle ping-pong turns sharply at the ends. Swap it for a cosine and the motion slows into each end, which looks much more natural for platforms and swinging objects.</p>`,
  uses:[`<b>Moving platforms</b> between two points.`,`<b>Conveyor textures and scrolling backgrounds</b> (loop).`,`<b>Patrolling guards</b> walking back and forth.`],
  gotchas:[`Every client's <code>os.clock()</code> is different. For things all players must see in sync, use <code>workspace:GetServerTimeNow()</code>.`]
});

function tweenValue(t, o){
  const D = o.dur, one = o.reverses ? 2*D : D, total = o.delay + one*(o.repeat+1);
  if (t < o.delay) return {v:0, done:false, total};
  let u = t - o.delay; if (u >= one*(o.repeat+1)) return {v:o.reverses ? 0 : 1, done:true, total};
  u = u % one; const e = EASE[o.style];
  const v = u <= D ? e(u/D) : e(1 - (u-D)/D);
  return {v, done:false, total};
}
demo({
  id:'an-tweeninfo', title:'TweenInfo: repeats, reverses, delay', short:'TweenInfo.new(...)', sig:'TweenInfo.new(time, style, direction, repeatCount, reverses, delayTime)', time:true,
  view:{theta:0.0, phi:1.15, r:24, ty:3},
  params:[R('dur','Time',0.3,2,0.1,0.8,' s'), S('style','EasingStyle (Out)',Object.keys(EASE).map(k=>[k,k]),'Quad'), R('repeat','RepeatCount',0,3,1,1), T('reverses','Reverses',true), R('delay','DelayTime',0,1,0.1,0.3,' s')],
  setup(K){
    const gr = graph(K,{x0:-10, y0:3, w:20, h:4.5, z:-3, xr:[0,6], yr:[0,1], xLabel:'time →', xTicks:[[0,'0'],[3,'3 s'],[6,'6 s']], yTicks:[[0,'start'],[1,'goal']]});
    const cv = gr.curve('--accent', 400), dot = gr.dot('--accent'), endL = gr.vline(0,'--muted'), box = K.part(V(1,1,1),'--accent',{front:false}); K.line('--muted',{dashed:true}).set(V(-8,0.05,2.5),V(8,0.05,2.5));
    return {update(p,t){
      const o = {dur:p.dur, style:p.style, repeat:p.repeat, reverses:p.reverses, delay:p.delay};
      cv.plot(x=>tweenValue(x,o).v, 0, 6); const total = tweenValue(0,o).total; endL.at(Math.min(6,total));
      const tt = t % Math.max(6, total + 0.8), v = tweenValue(tt,o).v; dot.at(Math.min(tt,6), v); box.position.set(-8 + 16*v, 0.5, 2.5);
      return {total};
    }};
  },
  readout:(p,o)=>[['plays', String(p.repeat+1)+' time(s)'],['total length', f(o.total,2)+' s','acc'],['ends at', p.reverses ? 'the start' : 'the goal']],
  code:(p,o)=>`local info = TweenInfo.new(
    ${p.dur},                              -- time for one play
    Enum.EasingStyle.${p.style},
    Enum.EasingDirection.Out,
    ${p.repeat},                                -- RepeatCount: extra plays (-1 = forever)
    ${p.reverses},                            -- Reverses: play backwards after each play
    ${p.delay}                               -- DelayTime: wait before starting
)
local tween = TweenService:Create(part, info, { Position = goal })
tween:Play()
tween.Completed:Wait()                     -- about ${f(o.total,2)} s later`,
  body:`<p><code>TweenInfo</code> packs the whole timeline into one object. <b>RepeatCount</b> is how many <i>extra</i> times it plays (so 1 means twice; −1 loops forever). <b>Reverses</b> makes each play run forwards then backwards. <b>DelayTime</b> waits before it starts.</p>
<p>The graph shows the value over time and the dashed line marks when it finishes. With reverses on, a tween ends back where it started, which is handy for "pulse" effects like a button that grows and shrinks once.</p>`,
  uses:[`<b>Pulses and flashes</b>: reverses on, repeat 0.`,`<b>Idle loops</b>: repeat −1 with reverses for floating or glowing objects.`,`<b>Delayed reveals</b> in menus and cutscenes.`],
  gotchas:[`A tween with RepeatCount −1 never fires <code>Completed</code>. Cancel it when you're done.`,`Two tweens changing the same property fight; the newest wins.`]
});

demo({
  id:'an-sequence', title:'Sequences: one after another', short:'Completed:Wait()', sig:'tweenA:Play(); tweenA.Completed:Wait(); tweenB:Play() ...', time:true,
  view:{theta:0.35, phi:1.0, r:20, ty:2},
  params:[T('parallel','Run all at once instead',false), R('gap','Pause between steps',0,0.6,0.05,0.15,' s')],
  setup(K){
    const box = K.part(V(1.2,1.2,1.2),'--accent'), steps = [['move',1],['lift',0.6],['spin',0.8]];
    const bars = steps.map((s,i)=>K.part(V(1,0.3,0.6),['--va','--vb','--y'][i],{front:false})), head = K.line('--ink'), labs = steps.map((s,i)=>K.label(s[0],['--va','--vb','--y'][i]));
    return {update(p,t){
      let t0 = 0; const st = steps.map(([n,d])=>{ const s = p.parallel ? 0 : t0; t0 = p.parallel ? Math.max(t0,d) : t0 + d + p.gap; return {n, s, d}; });
      const total = p.parallel ? Math.max(...steps.map(s=>s[1])) : t0 - p.gap, tau = t % (total + 1), prog = s=>clamp((tau - s.s)/s.d, 0, 1);
      const m = EASE.Quad(prog(st[0])), l = EASE.Quad(prog(st[1])), r = EASE.Quad(prog(st[2]));
      box.setCF(CF.mul(CF.new(-5 + 8*m, 0.6 + 2*l, -1), CF.angles(0, r*Math.PI, 0)));
      const sc = 14/Math.max(total,0.1);
      st.forEach((s,i)=>{ bars[i].resize(V(Math.max(0.05,s.d*sc),0.3,0.6)); bars[i].position.set(-7 + (s.s + s.d/2)*sc, 0.15, 3 + i*0.8); labs[i].at(V(-7 + s.s*sc - 0.8, 0.3, 3+i*0.8)); });
      head.set(V(-7 + Math.min(tau,total)*sc, 0.05, 2.4), V(-7 + Math.min(tau,total)*sc, 0.05, 5.4));
      return {total};
    }};
  },
  readout:(p,o)=>[['total time', f(o.total,2)+' s','acc'],['mode', p.parallel ? 'all together' : 'one after another']],
  code:(p,o)=>p.parallel ? `-- all at once: start every tween, don't wait between them
moveTween:Play()
liftTween:Play()
spinTween:Play()
-- wait for the longest one if you need to know when it's all done
moveTween.Completed:Wait()` : `local function play(tween)
    tween:Play()
    tween.Completed:Wait()      -- pause this script until it finishes
end

play(moveTween)
task.wait(${p.gap})
play(liftTween)
task.wait(${p.gap})
play(spinTween)                 -- total about ${f(o.total,2)} s`,
  body:`<p>Most effects are several animations in a row: slide in, then pop up, then spin. <code>tween.Completed:Wait()</code> pauses your script until a tween finishes, so you can write the steps in order, like a recipe. The bars below the box are the timeline; the black line is "now".</p>
<p>Tick "run all at once" and the steps overlap instead, finishing when the longest one does. Most polished effects mix both: some parts in sequence, a few overlapping for flow.</p>`,
  uses:[`<b>Cutscenes and intros</b>.`,`<b>Reward reveals</b>: chest shakes, opens, item rises.`,`<b>Tutorial steps</b> that wait for each animation.`],
  gotchas:[`<code>Completed:Wait()</code> blocks that script. Run sequences inside <code>task.spawn</code> if the script has other work.`]
});

demo({
  id:'an-stagger', title:'Staggered animations', short:'delay = index × gap', sig:'task.delay((i - 1) * GAP, function() tween:Play() end)', time:true,
  view:{theta:0.0, phi:0.9, r:20, ty:1},
  params:[R('gap','Gap between items',0,0.4,0.01,0.08,' s'), R('dur','Each pop-in',0.1,1,0.05,0.4,' s'), R('n','Items',3,16,1,10)],
  setup(K){
    const cubes = Array.from({length:16}, ()=>K.part(V(1,1,1),'--accent',{front:false}));
    return {update(p,t){
      const total = (p.n-1)*p.gap + p.dur, tau = t % (total + 1.2);
      cubes.forEach((c,i)=>{ c.visible = i < p.n; if (i >= p.n) return; const u = clamp((tau - i*p.gap)/p.dur, 0, 1), s = Math.max(0.001, backOut(u));
        c.resize(V(s,s,s)); c.position.set((i - (p.n-1)/2)*1.4, 0.5*s + 0.05, 0); });
      return {total};
    }};
  },
  readout:(p,o)=>[['whole effect takes', f(o.total,2)+' s','acc']],
  code:(p,o)=>`local GAP, DURATION = ${p.gap}, ${p.dur}
local info = TweenInfo.new(DURATION, Enum.EasingStyle.Back, Enum.EasingDirection.Out)

for i, item in items do
    item.Size = Vector3.zero
    task.delay((i - 1) * GAP, function()
        TweenService:Create(item, info, { Size = fullSize }):Play()
    end)
end
-- last item finishes after ${f(o.total,2)} s`,
  body:`<p>Starting a group of animations at the same moment looks mechanical. Delay each one a little more than the last, <code>(i − 1) × gap</code>, and they ripple in one after another. That small offset is a big part of why polished menus feel lively.</p>
<p>Try a gap of 0 (all at once), then 0.05 to 0.1 (snappy ripple), then 0.3 (slow parade). The whole effect takes <code>(n − 1) × gap + duration</code>.</p>`,
  uses:[`<b>Inventory and shop grids</b> popping in.`,`<b>Leaderboard rows</b> sliding in one by one.`,`<b>Spawning waves</b> of enemies or coins with a rhythm.`],
  gotchas:[`Keep the total short for UI the player opens often; 0.3 to 0.5 s feels responsive.`]
});

demo({
  id:'an-keyframes', title:'Keyframes: values at times', short:'find the pair, then lerp', sig:'find keys k and k+1 around t, alpha = (t − tₖ) / (tₖ₊₁ − tₖ)', time:true,
  view:{theta:0.0, phi:1.2, r:22, ty:3},
  params:[S('mode','Between keys',[['linear','Linear'],['step','Step (hold)'],['smooth','Smooth (cubic)']],'smooth'), R('k2','Key at 2 s',0,5,0.25,1), R('k3','Key at 3 s',0,5,0.25,4.5)],
  setup(K){
    const gr = graph(K,{x0:-10, y0:2, w:20, h:5, z:-3, xr:[0,4], yr:[0,5], xLabel:'time →', xTicks:[[0,'0'],[1,'1'],[2,'2'],[3,'3'],[4,'4 s']]});
    const cv = gr.curve('--accent', 300), dot = gr.dot('--accent'), keys = Array.from({length:5}, ()=>gr.dot('--vb',0.22)), bar = K.part(V(1,1,1),'--accent',{front:false});
    return {update(p,t){
      const kt = [0,1,2,3,4], kv = [0.5,3,p.k2,p.k3,1];
      const val = x=>{ let k = Math.min(3, Math.floor(x)); const a = x - k; if (p.mode==='step') return kv[k]; if (p.mode==='linear') return kv[k] + (kv[k+1]-kv[k])*a;
        const p0 = kv[Math.max(0,k-1)], p1 = kv[k], p2 = kv[k+1], p3 = kv[Math.min(4,k+2)], a2 = a*a, a3 = a2*a;
        return 0.5*((2*p1) + (-p0+p2)*a + (2*p0-5*p1+4*p2-p3)*a2 + (-p0+3*p1-3*p2+p3)*a3); };
      cv.plot(val); kv.forEach((v,i)=>keys[i].at(kt[i], v)); const tt = t % 4, y = val(tt); dot.at(tt, y);
      bar.resize(V(1, Math.max(0.05,y), 1)); bar.position.set(0, Math.max(0.05,y)/2, 3);
      return {y, tt};
    }};
  },
  readout:(p,o)=>[['time', f(o.tt,2)+' s'],['value', f(o.y,2),'acc']],
  code:(p,o)=>`local KEYS = {                    -- { time, value }, sorted by time
    { 0, 0.5 }, { 1, 3 }, { 2, ${p.k2} }, { 3, ${p.k3} }, { 4, 1 },
}

local function sample(t)
    for i = 1, #KEYS - 1 do
        local a, b = KEYS[i], KEYS[i + 1]
        if t <= b[1] then
            local alpha = (t - a[1]) / (b[1] - a[1])
            ${p.mode==='step' ? 'return a[2]                         -- hold until the next key' : p.mode==='linear' ? 'return a[2] + (b[2] - a[2]) * alpha' : '-- smooth: Catmull-Rom through the neighbouring keys (see Bézier curves)\n            return catmullRom(KEYS[math.max(i - 1, 1)][2], a[2], b[2], KEYS[math.min(i + 2, #KEYS)][2], alpha)'}
        end
    end
    return KEYS[#KEYS][2]
end`,
  body:`<p>A keyframe animation stores just a few values at chosen times. To play it, find the two keys either side of the current time, work out how far between them you are, and blend. That's how animation editors, NumberSequences and day-night lighting curves work.</p>
<p>The blend mode changes the feel. <b>Step</b> holds each value (good for sprite frames). <b>Linear</b> joins the dots with straight lines and corners. <b>Smooth</b> curves through every key with no corners, which reads as more natural motion.</p>`,
  uses:[`<b>Day-night cycles</b>: brightness and colour keys over 24 hours.`,`<b>Difficulty curves</b> over a match.`,`<b>Custom animations</b> on things the Animation Editor can't drive.`],
  gotchas:[`Keep keys sorted by time, and clamp t to the first and last key.`,`Smooth curves can overshoot between keys. Clamp the result if it must stay in range.`]
});

demo({
  id:'an-squash', title:'Squash and stretch', short:'keep the volume the same', sig:'scaleY = 1 − s,   scaleXZ = 1 / math.sqrt(1 − s)', time:true,
  view:{theta:0.3, phi:1.25, r:16, ty:2.5},
  params:[R('amt','Squash amount',0,0.6,0.02,0.35), T('keep','Keep volume',true), R('speed','Bounce speed',0.5,2,0.1,1)],
  setup(K){
    const ball = K.add(new THREE.Mesh(G.sphere, K.mat('--accent'))), ghost = K.add(new THREE.Mesh(G.sphere, K.mat('--part',{opacity:0.15}))); ghost.position.set(-3.5,1,0);
    K.label('no squash','--muted').at(V(-3.5,-0.3,0));
    return {update(p,t){
      const ph = (t*p.speed) % 1, h = 4*Math.abs(Math.sin(ph*Math.PI)), near = Math.max(0, 1 - h/0.9), stretchUp = Math.min(0.25, Math.abs(Math.cos(ph*Math.PI))*0.25*(1-near));
      const s = p.amt*near, sy = (1 - s)*(1 + stretchUp*(p.amt>0?1:0)), sxz = p.keep ? 1/Math.sqrt(sy) : 1;
      ball.scale.set(sxz, sy, sxz); ball.position.set(1.5, sy + h, 0);
      ghost.position.y = 1 + h;
      return {sy, sxz, vol: sxz*sxz*sy};
    }};
  },
  readout:(p,o)=>[['scale Y', f(o.sy,2)],['scale X/Z', f(o.sxz,2)],['volume kept', f(o.vol*100,0)+'%', Math.abs(o.vol-1) < 0.02 ? 'ok' : 'bad']],
  code:(p,o)=>`local BASE = ball.Size
local function squash(amount)               -- amount 0 = normal, 0.${Math.round(p.amt*100)} = squashed
    local sy = 1 - amount
    local sxz = ${p.keep ? '1 / math.sqrt(sy)          -- wider as it gets flatter: same volume' : '1                           -- no widening: it looks like it shrinks'}
    ball.Size = BASE * Vector3.new(sxz, sy, sxz)
end

-- squash on landing, then spring back
squash(${p.amt})
TweenService:Create(ball, TweenInfo.new(0.25, Enum.EasingStyle.Back), { Size = BASE }):Play()`,
  body:`<p>A ball that flattens when it lands and stretches as it flies feels alive and heavy. The rule that makes it believable is <b>keeping the volume the same</b>: if it gets shorter by some amount, it must get wider to make up for it. Since width counts twice (X and Z), each side scales by <code>1 / √(height scale)</code>.</p>
<p>Untick "keep volume" and the squash looks like the ball is shrinking. The faint ball on the left has no squash at all, for comparison.</p>`,
  uses:[`<b>Jumping characters, slimes and bouncing pickups.</b>`,`<b>UI buttons</b> that squish when pressed.`,`<b>Impact feedback</b> when something lands or gets hit.`],
  gotchas:[`Scale around the bottom of the object, or it sinks into the floor when it squashes.`]
});

demo({
  id:'an-idle', title:'Procedural idle motion', short:'layered sines and noise', sig:'offset = Σ amplitude · sin(speed · t)  +  noise(t)', time:true,
  view:{theta:0.6, phi:1.15, r:12, ty:2},
  params:[R('breath','Breathing',0,0.15,0.01,0.05), R('sway','Sway',0,10,0.5,3,'°'), R('look','Look around',0,60,5,25,'°')],
  setup(K){
    const body = K.part(V(1.6,2,1),'--part'), head = K.part(V(1.1,1.1,1.1),'--va');
    return {update(p,t){
      const br = 1 + p.breath*Math.sin(t*2*Math.PI/3.5), sw = p.sway*D2R*(0.6*Math.sin(t*0.9) + 0.4*noise(t*0.5, 1.3, 0.7));
      const look = p.look*D2R*noise(t*0.35, 4.1, 2.2)*2, nod = 0.15*noise(t*0.5, 7.7, 1.1);
      const bcf = CF.mul(CF.new(0,1,0), CF.angles(0,0,sw)); body.setCF(bcf); body.resize(V(1.6, 2*br, 1));
      head.setCF(CF.mul(bcf, CF.new(0, br + 0.6, 0), CF.angles(nod, look, 0)));
      return {br, look, sw};
    }};
  },
  readout:(p,o)=>[['chest scale', f(o.br,3)],['sway', f(o.sw/D2R,1)+'°'],['head turn', f(o.look/D2R,0)+'°','acc']],
  code:(p,o)=>`RunService.RenderStepped:Connect(function()
    local t = os.clock()
    -- breathing: one slow, steady sine (about 3.5 s per breath)
    local breath = 1 + ${p.breath} * math.sin(t * 2 * math.pi / 3.5)
    -- sway: a sine plus a little noise so it never looks like a loop
    local sway = math.rad(${p.sway}) * (0.6 * math.sin(t * 0.9) + 0.4 * math.noise(t * 0.5, 1.3))
    -- looking around: slow noise, not a sine, so it feels random
    local look = math.rad(${p.look}) * math.noise(t * 0.35, 4.1) * 2

    torso.Size = baseSize * Vector3.new(1, breath, 1)
    neck.C0 = neckBase * CFrame.Angles(0, look, 0)
    root.CFrame = rootBase * CFrame.Angles(0, 0, sway)
end)`,
  body:`<p>A character standing perfectly still looks dead. Layering a few gentle motions brings it to life: a slow <b>breath</b> (a sine), a soft <b>sway</b> (sine plus noise) and an occasional <b>glance</b> around (slow noise). Each is tiny; together they read as alive.</p>
<p>Sines alone repeat and the eye catches the loop. Mixing in <code>math.noise</code>, which never repeats, hides that. Turn each slider up on its own to see what it adds.</p>`,
  uses:[`<b>NPC idles</b> without making animations.`,`<b>Menu characters and pets</b> on display.`,`<b>Floating objects</b>: gentle drift and wobble.`],
  gotchas:[`Change the <code>C0</code> of Motor6D joints rather than moving parts directly, or the Animator overwrites you.`]
});

demo({
  id:'an-counter', title:'Counting numbers up', short:'lerp, then round', sig:'shown = math.floor(from + (to − from) * eased)', time:true,
  view:{theta:0.0, phi:1.25, r:16, ty:2},
  params:[R('to','Target value',10,50000,10,12500), R('dur','Count time',0.3,3,0.1,1.2,' s'), S('style','Easing',[['Quad','Quad Out'],['Linear','Linear'],['Back','Back Out']],'Quad')],
  setup(K){
    const frame = K.part(V(12,1,0.4),'--part',{front:false,opacity:0.4}), fill = K.part(V(1,1,0.5),'--accent',{front:false}); frame.position.set(0,1,0);
    const big = K.label('','--accent','big');
    return {update(p,t){
      const tau = t % (p.dur + 1.2), a = clamp(tau/p.dur,0,1), e = EASE[p.style](a), shown = Math.floor(p.to*e);
      fill.resize(V(Math.max(0.01,12*Math.min(1,e)),1,0.5)); fill.position.set(-6 + 6*Math.min(1,e), 1, 0.05);
      big.at(V(0,2.6,0)).text(shown.toLocaleString('en-US')); big.el.style.fontSize = '22px';
      return {shown, a};
    }};
  },
  readout:(p,o)=>[['shown', o.shown.toLocaleString('en-US'),'acc'],['progress', f(o.a*100,0)+'%']],
  code:(p,o)=>`local function countUp(label, from, to, duration)
    local start = os.clock()
    while true do
        local alpha = math.clamp((os.clock() - start) / duration, 0, 1)
        local eased = TweenService:GetValue(alpha, Enum.EasingStyle.${p.style}, Enum.EasingDirection.Out)
        label.Text = tostring(math.floor(from + (to - from) * eased))
        if alpha >= 1 then break end
        RunService.RenderStepped:Wait()
    end
end

countUp(coinsLabel, 0, ${p.to}, ${p.dur})`,
  body:`<p>When a score or coin total changes, counting up to the new number feels rewarding where a sudden jump doesn't. Ease from the old value to the new one over a short time and round down for display, so it never shows decimals.</p>
<p>Quad Out races at first and slows near the end, which draws attention to the final number. Back Out briefly overshoots, which suits "big win" moments but can confuse players if the overshoot shows a number they didn't get.</p>`,
  uses:[`<b>Coin and score counters</b>.`,`<b>End-of-round stats</b> ticking up.`,`<b>Health and XP bars</b> with a matching number.`],
  gotchas:[`Keep the real value updated straight away; only the display animates.`,`If a new change arrives mid-count, start the next count from the number currently shown.`]
});

Lab.finder([
  ['Move something in exactly one second','alpha = elapsed / duration','an-duration'],
  ['Make a platform move back and forth forever','ping-pong from the clock','an-pingpong'],
  ['Make a tween repeat or reverse','TweenInfo RepeatCount / Reverses','an-tweeninfo'],
  ['Play animations one after another','tween.Completed:Wait()','an-sequence'],
  ['Make menu items pop in one by one','staggered delays','an-stagger'],
  ['Animate a value through several set points','keyframes','an-keyframes'],
  ['Make a bouncy ball squash when it lands','squash and stretch','an-squash'],
  ['Make an NPC look alive when standing still','procedural idle','an-idle'],
  ['Make coin counters count up','eased count + math.floor','an-counter'],
]);
})();
