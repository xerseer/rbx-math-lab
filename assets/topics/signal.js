(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, CF, G, R, S, T, clamp, noise, mulberry32} = Lab;
const {graph, inst, labels, bone} = Lab.kit2;
const demo = Lab.subject({
  id:'signal', title:'Signals & networking', glyph:'wave2', level:'Advanced',
  blurb:'Smoothing noisy values, dead zones, camera shake, aliasing, network interpolation and prediction, hysteresis and rate limiting.'
});
const noisy = (t, amt, seed=1)=>{ const r = mulberry32(Math.floor(t*30)*7 + seed); const spike = r() < 0.04 ? (r()*2-1)*amt*3 : 0; return 3*Math.sin(t*0.9) + (r()*2-1)*amt + spike; };

demo({
  id:'sg-movingavg', title:'Moving average', short:'average of the last N values', sig:'smoothed = (sum of the last N samples) / N',
  view:{theta:0, phi:1.3, r:22, ty:4},
  params:[R('n','Window (samples)',1,40,1,10), R('amt','Noise',0,2,0.05,0.8)],
  setup(K){ const gr = graph(K,{x0:-10, y0:0.6, w:20, h:7, z:0, xr:[0,10], yr:[-6,6], xLabel:'time (s) →'}); gr.hline(0,'--muted'); const raw = gr.curve('--muted', 300), avg = gr.curve('--accent', 300), truth = gr.curve('--va', 300, {dashed:true});
    return {update(p){ const dt = 1/30, s = []; for (let i=0;i<=300;i++) s.push(noisy(i*dt, p.amt)); raw.points(s.map((v,i)=>[i*dt, v]));
      avg.points(s.map((v,i)=>{ const k = Math.min(i+1, p.n); let sum = 0; for (let j=0;j<k;j++) sum += s[i-j]; return [i*dt, sum/k]; })); truth.plot(t=>3*Math.sin(t*0.9));
      return {lag:(p.n-1)/2*dt}; }};
  },
  readout:(p,o)=>[['window', `${p.n} samples`],['lag behind the true value', f(o.lag*1000,0)+' ms','acc']],
  code:(p)=>`local WINDOW = ${p.n}
local samples, sum = {}, 0

local function addSample(v)
    table.insert(samples, v)
    sum += v
    if #samples > WINDOW then
        sum -= table.remove(samples, 1)      -- drop the oldest
    end
    return sum / #samples                     -- the smoothed value
end

fpsLabel.Text = math.floor(addSample(1 / dt))`,
  body:`<p>Raw measurements (FPS, ping, speed, sensor values) jitter and spike. A <b>moving average</b> replaces each value with the average of the last N samples, which irons out the noise. The grey line is raw; orange is averaged; the dashed teal line is the true signal underneath.</p>
<p>The trade-off is <b>lag</b>: an average of the last 10 samples is centred 4.5 samples in the past, so the smooth line trails behind changes. Bigger windows are smoother and later.</p>`,
  uses:[`<b>FPS and ping displays</b> that don't flicker.`,`<b>Speedometers</b> and gauges.`,`<b>Analytics</b>: average players over the last hour.`],
  gotchas:[`Keep a running sum (as in the code) instead of re-adding the whole window every time.`]
});

demo({
  id:'sg-ema', title:'Exponential smoothing', short:'smoothed += (raw − smoothed) × α', sig:'smoothed = smoothed + (raw − smoothed) * alpha',
  view:{theta:0, phi:1.3, r:22, ty:4},
  params:[R('a','alpha (per sample)',0.01,1,0.01,0.12), R('amt','Noise',0,2,0.05,0.8)],
  setup(K){ const gr = graph(K,{x0:-10, y0:0.6, w:20, h:7, z:0, xr:[0,10], yr:[-6,6], xLabel:'time (s) →'}); gr.hline(0,'--muted'); const raw = gr.curve('--muted', 300), ema = gr.curve('--accent', 300), truth = gr.curve('--va', 300, {dashed:true});
    return {update(p){ const dt = 1/30; let e = noisy(0,p.amt); const out = []; const rs = []; for (let i=0;i<=300;i++){ const v = noisy(i*dt, p.amt); rs.push([i*dt, v]); e += (v - e)*p.a; out.push([i*dt, e]); }
      raw.points(rs); ema.points(out); truth.plot(t=>3*Math.sin(t*0.9)); return {tc: dt/p.a}; }};
  },
  readout:(p,o)=>[['alpha', f(p.a,2)],['reaction time (≈63%)', f(o.tc*1000,0)+' ms','acc'],['frame-rate independent alpha', '1 − exp(−dt / '+f(o.tc,3)+')']],
  code:(p,o)=>`local smoothed = 0
local TIME_CONSTANT = ${f(o.tc,3)}              -- seconds to cover about 63% of a change

RunService.Heartbeat:Connect(function(dt)
    local raw = measure()
    local alpha = 1 - math.exp(-dt / TIME_CONSTANT)   -- same feel at any frame rate
    smoothed += (raw - smoothed) * alpha
end)`,
  body:`<p>An <b>exponential moving average</b> only remembers one number. Each new sample nudges it a fraction <code>α</code> of the way toward the new value. Old values fade away gradually instead of dropping out of a window, and it costs almost nothing.</p>
<p>Small α means very smooth but slow to react; α = 1 is no smoothing at all. It's exactly the lerp-follow from the math topics applied to measurements, so the same <code>1 − exp(−dt / τ)</code> trick makes it frame-rate independent.</p>`,
  uses:[`<b>Smoothed ping, FPS and speed</b> with one variable.`,`<b>Input smoothing</b> for mouse look and gyros.`,`<b>Adaptive values</b>: average damage per second, average match length.`],
  gotchas:[`A fixed α per frame smooths more at high frame rates. Use the <code>math.exp</code> version in Heartbeat.`]
});

demo({
  id:'sg-deadzone', title:'Dead zones and response curves', short:'ignore tiny input, curve the rest', sig:'out = ((|in| − dead) / (1 − dead))^power  ×  direction',
  view:{theta:0, phi:1.35, r:18, ty:4},
  params:[R('ix','Stick X',-1,1,0.01,0.35), R('iy','Stick Y',-1,1,0.01,0.12), R('dead','Dead zone',0,0.5,0.01,0.2), R('pow','Curve power',1,3,0.1,2)],
  setup(K){ const Cn = V(-5,4,0), ring = K.ring(3,'--ink'); ring.rotation.x = Math.PI/2; ring.position.copy(Cn); const dz = K.ring(1,'--bad',{dashed:true}); dz.rotation.x = Math.PI/2; dz.position.copy(Cn);
    const thumb = K.point('--va',0.3), outA = K.arrow('--accent',{thick:0.07}); const gr = graph(K,{x0:1, y0:1, w:8, h:6, z:0, xr:[0,1], yr:[0,1], xLabel:'input', yLabel:'output', xTicks:[[0,'0'],[1,'1']], yTicks:[[1,'1']]}); const cv = gr.curve('--accent'), lin = gr.curve('--muted',2,{dashed:true}), dot = gr.dot('--va');
    return {update(p){
      const m = Math.min(1, Math.hypot(p.ix,p.iy)), out = m <= p.dead ? 0 : Math.pow((m - p.dead)/(1 - p.dead), p.pow); dz.scale.set(3*p.dead,1,3*p.dead);
      thumb.position.copy(Cn.clone().add(V(p.ix*3, p.iy*3, 0.1))); const dir = m > 1e-6 ? V(p.ix/m, p.iy/m, 0) : V(1,0,0); outA.set(Cn.clone().setZ(0.2), dir.multiplyScalar(out*3)); outA.visible = out > 0.001;
      cv.plot(x=>x <= p.dead ? 0 : Math.pow((x - p.dead)/(1-p.dead), p.pow)); lin.plot(x=>x, 0, 1); dot.at(m, out);
      return {m, out};
    }};
  },
  readout:(p,o)=>[['stick tilt', f(o.m,2)],['output strength', f(o.out,3),'acc'],['in dead zone?', o.m <= p.dead ? 'yes: ignored' : 'no', o.m <= p.dead ? 'bad' : 'ok']],
  code:(p)=>`local DEAD, POWER = ${p.dead}, ${p.pow}

local function shapeStick(v)                 -- v: Vector2 from the thumbstick
    local m = math.min(v.Magnitude, 1)
    if m <= DEAD then return Vector2.zero end
    local strength = ((m - DEAD) / (1 - DEAD)) ^ POWER   -- rescale so it still reaches 1
    return v.Unit * strength
end

UserInputService.InputChanged:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.Thumbstick1 then
        move = shapeStick(Vector2.new(input.Position.X, input.Position.Y))
    end
end)`,
  body:`<p>Thumbsticks never rest exactly at zero, so an untouched stick makes characters drift. A <b>dead zone</b> ignores everything below a small tilt. Rescaling the rest so it still goes from 0 to 1 keeps the full range and avoids a jump at the edge of the dead zone.</p>
<p>A <b>response curve</b> (raising to a power) gives fine control near the centre and full speed at the edge, which helps aiming. Power 1 is linear; 2 is a common choice. The graph shows input versus output.</p>`,
  uses:[`<b>Gamepad movement and aiming.</b>`,`<b>Mobile virtual joysticks.</b>`,`<b>Gyro and mouse acceleration</b> curves.`],
  gotchas:[`Use a <b>radial</b> dead zone (on the length, as here), not separate X and Y ones, or diagonals feel sticky.`]
});

demo({
  id:'sg-shake', title:'Camera shake with trauma', short:'shake = trauma² × noise', sig:'trauma decays over time;  offset = maxShake × trauma² × noise(t × speed)', time:true,
  view:{theta:0.5, phi:1.1, r:20, ty:3},
  params:[R('hit','Trauma per hit',0.1,1,0.05,0.6), R('decay','Decay per second',0.2,3,0.1,1.2), R('max','Max shake',0.1,2,0.05,0.8), T('sq','Square the trauma',true)],
  setup(K){ const cam = K.part(V(1.6,1.1,1.3),'--ink'), aim = K.line('--accent',{dashed:true}), tgt = K.point('--vb',0.3); tgt.position.set(0,3,-8);
    const gr = graph(K,{x0:-10, y0:0.5, w:20, h:3, z:-9.5, xr:[0,6], yr:[0,1], xLabel:'time →', yTicks:[[1,'1']]}); const cv = gr.curve('--accent', 300), dot = gr.dot('--accent');
    return {update(p,t){
      const per = 3, trauma = s=>{ let tr = 0, last = 0; for (let h=0; h<=s; h+=per){ tr = Math.max(0, tr - p.decay*(h - last)); tr = Math.min(1, tr + p.hit); last = h; } return Math.max(0, tr - p.decay*(s - last)); };
      const tt = t % 6, tr = trauma(tt), k = p.sq ? tr*tr : tr, ox = p.max*k*noise(t*14, 1.3, 0.2)*2, oy = p.max*k*noise(t*14, 7.1, 0.9)*2, roll = 0.15*k*noise(t*12, 3.3, 5.5);
      const base = V(0,3,6), camCF = CF.mul(CF.lookAt(base, V(0,3,-8)), CF.new(ox, oy, 0), CF.angles(0,0,roll)); cam.setCF(camCF); aim.set(CF.pos(camCF), V(ox*3, 3 + oy*3, -8));
      cv.plot(s=>trauma(s)); dot.at(tt, tr);
      return {tr, k};
    }};
  },
  readout:(p,o)=>[['trauma', f(o.tr,2),'acc'],['shake strength', f(o.k,2)]],
  code:(p)=>`local trauma = 0
local MAX_SHAKE, DECAY = ${p.max}, ${p.decay}

local function addTrauma(amount)             -- call on explosions, hits, landings
    trauma = math.min(1, trauma + amount)     -- e.g. addTrauma(${p.hit})
end

RunService:BindToRenderStep("Shake", Enum.RenderPriority.Camera.Value + 1, function(dt)
    trauma = math.max(0, trauma - DECAY * dt)
    local shake = ${p.sq ? 'trauma * trauma          -- squared: small hits stay subtle' : 'trauma'}
    local t = os.clock() * 14
    local offset = Vector3.new(math.noise(t, 1.3), math.noise(t, 7.1), 0) * 2 * MAX_SHAKE * shake
    camera.CFrame *= CFrame.new(offset) * CFrame.Angles(0, 0, 0.15 * shake * math.noise(t, 3.3))
end)`,
  body:`<p>Good camera shake comes from a single number, <b>trauma</b>, from 0 to 1. Hits add to it, and it drains away over time. The actual shake uses <code>trauma²</code>, so small bumps barely register while big explosions really rattle the screen. The wobble itself comes from smooth noise, not random jumps, so it looks like a shaking camera rather than a glitch.</p>
<p>The graph shows trauma rising on each hit (every 3 seconds) and draining. Untick "square" to see how much harsher small hits become.</p>`,
  uses:[`<b>Explosions, heavy landings and big hits.</b>`,`<b>Earthquakes and boss stomps</b> (high trauma, slow decay).`,`<b>Subtle engine rumble</b> (low constant trauma).`],
  gotchas:[`Apply shake after the normal camera update, as an offset, so it never drifts the real camera position.`,`Give players a setting to reduce shake; it can cause motion sickness.`]
});

demo({
  id:'sg-alias', title:'Sampling and aliasing', short:'why wheels spin backwards', sig:'seen turn per frame = wrap(true turn per frame) into −180°…180°', time:true,
  view:{theta:0, phi:1.35, r:18, ty:3.5},
  params:[R('rps','Wheel speed (turns/s)',0,30,0.1,11.5), R('fps','Frames shown per second',5,60,1,12)],
  setup(K){ const mk = (x)=>{ const g = new THREE.Group(); K.add(g); g.position.set(x,3.5,0); const ring = K.ring(2.5,'--ink'); ring.rotation.x = Math.PI/2; ring.position.set(x,3.5,0); const spokes = [0,1,2,3].map(()=>bone(K,'--accent',0.12)); const dot = K.point('--vb',0.25); return {x, spokes, dot}; };
    const L = mk(-4.5), Rw = mk(4.5); K.label('real motion','--muted','big').at(V(-4.5,0.3,0)); K.label('what the frames show','--muted','big').at(V(4.5,0.3,0));
    const draw = (w, a)=>{ const c = V(w.x,3.5,0); w.spokes.forEach((s,i)=>{ const b = a + i*Math.PI/4; s.set(c.clone().add(V(Math.cos(b)*-2.4, Math.sin(b)*-2.4, 0)), c.clone().add(V(Math.cos(b)*2.4, Math.sin(b)*2.4, 0))); }); w.dot.position.copy(c.clone().add(V(Math.cos(a)*2.4, Math.sin(a)*2.4, 0.1))); };
    return {update(p,t){ const slow = t*0.25; draw(L, -slow*p.rps*Math.PI*2); const ft = Math.floor(slow*p.fps)/p.fps; draw(Rw, -ft*p.rps*Math.PI*2);
      const per = p.rps/p.fps*360, sym = 45, step = ((per % sym) + sym*1.5) % sym - sym/2, wrapped = ((per % 360) + 540) % 360 - 180; return {per, step, wrapped}; }};
  },
  readout:(p,o)=>[['true turn per frame', f(o.per,1)+'°'],['spokes look like they move', f(o.step,1)+'° per frame', o.step < 0 ? 'bad' : 'acc'],['looks like it spins', Math.abs(o.step) < 0.5 ? 'frozen' : o.step < 0 ? 'backwards' : 'forwards']],
  code:(p,o)=>`-- a wheel turning ${p.rps} times a second, shown at ${p.fps} frames per second
local degreesPerFrame = ${p.rps} * 360 / ${p.fps}            -- ${f(o.per,1)}°
-- 8 identical spokes look the same every 45°, so the eye only sees the leftover:
local seen = (degreesPerFrame + 22.5) % 45 - 22.5          -- ${f(o.step,1)}° (${o.step < 0 ? 'backwards!' : 'forwards'})

-- in games: spin effects slower than half a spoke-gap per frame,
-- or swap to a motion-blurred texture above a speed limit`,
  body:`<p>A screen shows separate frames, not continuous motion. If a wheel turns almost a full spoke-gap between frames, each frame shows the spokes <i>nearly</i> where the previous ones were, and your eye joins them up the short way, backwards. That's <b>aliasing</b>, the wagon-wheel effect.</p>
<p>The left wheel moves smoothly (slowed down so you can see it); the right one is only drawn at the frame rate. Speed it up until it appears to stop or reverse. The same thing makes fast spinners, propellers and rotating patterns look wrong in games.</p>`,
  uses:[`<b>Choosing spin speeds</b> for fans, wheels and propellers.`,`<b>Network tick rates</b>: anything faster than half the update rate looks wrong.`,`<b>Sampling noise and terrain</b>: sampling too coarsely loses or invents detail.`],
  gotchas:[`Frame rates vary between players, so a speed that looks fine at 60 FPS may alias at 30. Swap to a blurred disc at high speeds.`]
});

function snapshots(rate, jitter, seed){ const r = mulberry32(seed), snaps = []; for (let i=0;i<200;i++){ const ts = i/rate; snaps.push({ts, arrive:ts + 0.05 + r()*jitter}); } return snaps; }
const truePos = t=>V(Math.sin(t*0.9)*8, 0.6, Math.sin(t*1.8)*3.5);
demo({
  id:'sg-interp', title:'Network interpolation', short:'render slightly in the past', sig:'renderTime = now − delay;  lerp between the two snapshots around it', time:true,
  view:{theta:0, phi:0.55, r:24, ty:0},
  params:[R('rate','Updates per second',2,30,1,10), R('delay','Interpolation delay',0,0.4,0.01,0.15,' s'), R('jit','Network jitter',0,0.15,0.005,0.04,' s')],
  setup(K){ const path = K.line('--muted',{dashed:true, max:301}); const pts = []; for (let i=0;i<=300;i++) pts.push(truePos(i/300*Math.PI*2/0.9).setY(0.05)); path.set(pts);
    const real = K.part(V(1,1,1),'--part',{front:false, opacity:0.35}), snap = K.part(V(1,1,1),'--bad',{front:false}), lerp = K.part(V(1,1,1),'--accent',{front:false});
    const ls = K.label('snap to latest','--bad'), li = K.label('interpolated','--accent','big');
    return {update(p,t){
      const now = 2 + (t % 12), S0 = snapshots(p.rate, p.jit, 9).filter(s=>s.arrive <= now);
      real.position.copy(truePos(now)); const latest = S0[S0.length-1]; snap.position.copy(truePos(latest.ts));
      const rt = now - p.delay; let a = null, b = null; for (let i=S0.length-1;i>0;i--){ if (S0[i-1].ts <= rt && S0[i].ts >= rt){ a = S0[i-1]; b = S0[i]; break; } }
      let pos; if (a && b) pos = truePos(a.ts).lerp(truePos(b.ts), (rt - a.ts)/(b.ts - a.ts)); else pos = truePos(latest.ts); lerp.position.copy(pos);
      ls.at(snap.position.clone().add(V(0,1.1,0))); li.at(pos.clone().add(V(0,1.1,0)));
      return {ok:!!(a&&b), behind:pos.distanceTo(truePos(now))};
    }};
  },
  readout:(p,o)=>[['interpolating?', o.ok ? 'yes, smooth' : 'no: ran out of snapshots (raise the delay)', o.ok ? 'ok' : 'bad'],['distance behind the real object', f(o.behind,2)+' studs'],['minimum safe delay', '≈ '+f(1/p.rate + p.jit,2)+' s']],
  code:(p)=>`local DELAY = ${p.delay}           -- show the world slightly in the past
local buffer = {}                  -- { time = serverTime, position = Vector3 }, oldest first

remote.OnClientEvent:Connect(function(serverTime, position)
    table.insert(buffer, { time = serverTime, position = position })
    if #buffer > 30 then table.remove(buffer, 1) end
end)

RunService.RenderStepped:Connect(function()
    local renderTime = workspace:GetServerTimeNow() - DELAY
    for i = #buffer, 2, -1 do
        local a, b = buffer[i - 1], buffer[i]
        if a.time <= renderTime and renderTime <= b.time then
            local alpha = (renderTime - a.time) / (b.time - a.time)
            model:PivotTo(CFrame.new(a.position:Lerp(b.position, alpha)))
            return
        end
    end
end)`,
  body:`<p>Servers send position updates a few times a second, and the network delivers them unevenly. Snapping to each update as it arrives (red) jerks along in steps. <b>Interpolation</b> deliberately shows everything a little <b>in the past</b>: with a short delay, there's almost always a snapshot on either side of the render time, so you can lerp smoothly between them (orange).</p>
<p>The delay must cover the gap between updates plus the jitter. Too small and it runs out of snapshots and stutters; too big and everything lags. The faint block is where the object really is.</p>`,
  uses:[`<b>Custom-replicated NPCs, projectiles and vehicles.</b>`,`<b>Spectator and replay systems.</b>`,`<b>Any server value</b> sent at a low rate (boss health, moving platforms).`],
  gotchas:[`Roblox already interpolates replicated physics parts. You need this when you send positions yourself, e.g. for thousands of NPCs.`,`Use <code>workspace:GetServerTimeNow()</code> for timestamps so client and server agree on time.`]
});

demo({
  id:'sg-extrap', title:'Prediction (dead reckoning)', short:'last position + velocity × time', sig:'predicted = lastPosition + lastVelocity × (now − lastTime)', time:true,
  view:{theta:0, phi:0.55, r:24, ty:0},
  params:[R('rate','Updates per second',1,20,1,4), R('blend','Correction speed',1,20,0.5,6), T('correct','Blend corrections',true)],
  setup(K){ const path = K.line('--muted',{dashed:true, max:301}); const pts = []; for (let i=0;i<=300;i++) pts.push(truePos(i/300*Math.PI*2/0.9).setY(0.05)); path.set(pts);
    const real = K.part(V(1,1,1),'--part',{front:false, opacity:0.35}), pred = K.part(V(1,1,1),'--accent',{front:false}), err = K.line('--bad');
    let shown = null, last = 0;
    return {update(p,t){
      const now = 2 + (t % 12), dt = Math.max(0, Math.min(0.1, now - last)); last = now; const ts = Math.floor(now*p.rate)/p.rate, P0 = truePos(ts), Vv = truePos(ts + 0.01).sub(P0).multiplyScalar(100);
      const target = P0.clone().addScaledVector(Vv, now - ts); if (!shown || !p.correct) shown = target.clone(); else shown.lerp(target, 1 - Math.exp(-p.blend*dt));
      real.position.copy(truePos(now)); pred.position.copy(shown); err.set(shown, truePos(now));
      return {e:shown.distanceTo(truePos(now))};
    }};
  },
  readout:(p,o)=>[['prediction error', f(o.e,2)+' studs', o.e > 1 ? 'bad' : 'acc']],
  code:(p)=>`local last = { time = 0, position = Vector3.zero, velocity = Vector3.zero }
local shown = Vector3.zero

remote.OnClientEvent:Connect(function(serverTime, position, velocity)
    last = { time = serverTime, position = position, velocity = velocity }
end)

RunService.RenderStepped:Connect(function(dt)
    local age = workspace:GetServerTimeNow() - last.time
    local predicted = last.position + last.velocity * age      -- keep going the same way
${p.correct ? `    shown = shown:Lerp(predicted, 1 - math.exp(-${p.blend} * dt))   -- glide to corrections` : `    shown = predicted                                         -- snap to corrections`}
    model:PivotTo(CFrame.new(shown))
end)`,
  body:`<p>Interpolation adds delay. When that's not acceptable (fast vehicles, aiming at other players), <b>predict</b> instead: take the last known position and velocity and assume it keeps going. That's <b>dead reckoning</b>, the way ships navigated without GPS.</p>
<p>It's perfect on straight lines and wrong on curves; the red line is the error. When a new update arrives, snapping to it makes a visible jump, so blend toward the corrected prediction. Fewer updates per second means bigger errors on turns.</p>`,
  uses:[`<b>Fast vehicles and planes</b> in multiplayer.`,`<b>Projectiles</b> that should appear without delay.`,`<b>Hiding lag</b> for other players' movement.`],
  gotchas:[`Send velocity with every update; working it out from two positions adds more delay.`,`Cap how far ahead you predict, or a disconnected player flies off into the distance.`]
});

demo({
  id:'sg-hysteresis', title:'Hysteresis: stop flickering', short:'two thresholds', sig:'turn on above HIGH, turn off below LOW (LOW < HIGH)', time:true,
  view:{theta:0, phi:1.3, r:22, ty:4},
  params:[R('gap','Gap between thresholds',0,4,0.1,2), R('amt','Noise',0,1.5,0.05,0.6)],
  setup(K){ const gr = graph(K,{x0:-10, y0:2.4, w:20, h:5.5, z:0, xr:[0,10], yr:[4,16], xLabel:'time (s) →', yLabel:'distance to NPC'}); const sig = gr.curve('--ink', 300), hi = gr.hline(10,'--bad'), lo = gr.hline(10,'--ok');
    const one = inst(K, 300), two = inst(K, 300); K.label('one threshold','--muted').at(V(-11.5,1.4,0)).el.style.translate = '-50% 0'; K.label('two thresholds','--muted').at(V(-11.5,0.6,0)).el.style.translate = '-50% 0';
    return {update(p,t){
      const dt = 1/30, v = i=>{ const s = i*dt; return 10 + 3*Math.sin(s*0.8) + (mulberry32(i*13+3)()*2-1)*p.amt; }; const H = 10 + p.gap/2, L = 10 - p.gap/2;
      sig.points(Array.from({length:301}, (_,i)=>[i*dt, v(i)])); hi.at(H); lo.at(L);
      let s1 = v(0) < 10, s2 = v(0) < L, c1 = 0, c2 = 0; one.begin(); two.begin();
      for (let i=0;i<=300;i++){ const d = v(i), n1 = d < 10; if (n1 !== s1){ c1++; s1 = n1; } if (!s2 && d < L){ s2 = true; c2++; } else if (s2 && d > H){ s2 = false; c2++; }
        const x = gr.X(i*dt); one.add(V(x,1.4,0), V(0.08,0.4,0.4), s1 ? '--bad' : '--part'); two.add(V(x,0.6,0), V(0.08,0.4,0.4), s2 ? '--bad' : '--part'); }
      one.end(); two.end(); return {c1, c2};
    }};
  },
  readout:(p,o)=>[['switches with one threshold', String(o.c1),'bad'],['switches with two', String(o.c2),'ok']],
  code:(p)=>`local ENTER, LEAVE = ${f(10 - p.gap/2,1)}, ${f(10 + p.gap/2,1)}     -- LEAVE is further than ENTER
local chasing = false

RunService.Heartbeat:Connect(function()
    local d = (player.Position - npc.Position).Magnitude
    if not chasing and d < ENTER then
        chasing = true                 -- start chasing when clearly close
    elseif chasing and d > LEAVE then
        chasing = false                -- stop only when clearly far
    end
end)`,
  body:`<p>When a value wobbles around a single threshold, anything based on it flickers on and off: an NPC that keeps starting and stopping its chase, music that keeps switching, a level-of-detail model that keeps swapping. <b>Hysteresis</b> uses two thresholds: switch on below the lower one, switch off only above the higher one.</p>
<p>The bars show the on/off state over time. With one threshold (top) the noise causes rapid toggling; with a gap between two thresholds (bottom) it switches cleanly. A bigger gap means fewer switches but slower reactions.</p>`,
  uses:[`<b>AI aggro</b> ranges.`,`<b>Level of detail and streaming</b> boundaries.`,`<b>UI states</b> like "low health" warnings that shouldn't blink.`],
  gotchas:[`Make the gap bigger than the noise in your value, or it still flickers.`]
});

demo({
  id:'sg-ratelimit', title:'Rate limiting: token buckets', short:'refill over time, spend per request', sig:'tokens = min(capacity, tokens + rate × dt);  allow if tokens ≥ 1, then tokens −= 1', time:true,
  view:{theta:0, phi:1.25, r:22, ty:3.5},
  params:[R('cap','Bucket size (burst)',1,10,1,5), R('rate','Refill per second',0.5,10,0.5,2), R('spam','Spam clicks per second',1,20,1,8)],
  setup(K){ const gr = graph(K,{x0:-10, y0:0.8, w:20, h:2.5, z:0, xr:[0,10], yr:[0,1], axes:false, xLabel:'time (s) →'}); const req = inst(K, 400), bucket = inst(K, 12), lab = K.label('','--ink','big');
    K.label('accepted','--ok').at(V(-11.3,1.9,0)).el.style.translate = '-50% 0'; K.label('rejected','--bad').at(V(-11.3,0.9,0)).el.style.translate = '-50% 0';
    return {update(p,t){
      const r = mulberry32(5); let tokens = p.cap, last = 0, acc = 0, rej = 0, nowTokens = p.cap; req.begin(); const tt = t % 10;
      const times = []; let s = 0; while (s < 10){ const burst = Math.floor(s/2.5) % 2 === 0; s += burst ? 1/p.spam*(0.6 + r()*0.8) : 1.2 + r(); times.push(s); }
      times.forEach(ts=>{ tokens = Math.min(p.cap, tokens + p.rate*(ts - last)); last = ts; const ok = tokens >= 1; if (ok){ tokens -= 1; acc++; } else rej++; if (ts <= tt) nowTokens = tokens; req.add(V(gr.X(ts), ok ? 1.9 : 0.9, 0), V(0.12, 0.5, 0.3), ok ? '--ok' : '--bad'); });
      req.add(V(gr.X(tt), 1.4, 0), V(0.05, 2, 0.05), '--ink'); req.end();
      const live = Math.min(p.cap, nowTokens + p.rate*(tt - Math.max(...times.filter(x=>x<=tt), 0))); bucket.begin(); for (let i=0;i<p.cap;i++) bucket.add(V(-3 + i*0.9 - (p.cap-1)*0.45 + 3, 4.8, 0), V(0.7,0.7,0.7), i < Math.floor(live) ? '--accent' : '--part'); bucket.end();
      lab.at(V(0,6,0)).text(`${Math.floor(live)} / ${p.cap} tokens`); return {acc, rej};
    }};
  },
  readout:(p,o)=>[['accepted', String(o.acc),'ok'],['rejected', String(o.rej),'bad'],['sustained limit', p.rate+' per second']],
  code:(p)=>`local CAPACITY, RATE = ${p.cap}, ${p.rate}     -- burst of ${p.cap}, then ${p.rate} per second
local buckets = {}                         -- one per player

remote.OnServerEvent:Connect(function(player, ...)
    local now = os.clock()
    local b = buckets[player] or { tokens = CAPACITY, last = now }
    buckets[player] = b
    b.tokens = math.min(CAPACITY, b.tokens + (now - b.last) * RATE)   -- refill
    b.last = now
    if b.tokens < 1 then return end         -- too fast: ignore this request
    b.tokens -= 1
    handleRequest(player, ...)
end)

Players.PlayerRemoving:Connect(function(player) buckets[player] = nil end)`,
  body:`<p>Exploiters can fire RemoteEvents thousands of times a second. A <b>token bucket</b> limits that fairly: each player has a bucket of tokens that refills at a steady rate. Every request spends one token; with none left, the request is ignored. The bucket size allows short bursts, and the refill rate sets the long-term limit.</p>
<p>The bursts of clicks (every few seconds) quickly drain the bucket, and the rest get rejected (red) until it refills. Normal-speed use never notices the limit.</p>`,
  uses:[`<b>Protecting RemoteEvents</b> from spam.`,`<b>Ability and chat cooldowns</b> that allow small bursts.`,`<b>Throttling expensive work</b> like DataStore saves or web requests.`],
  gotchas:[`Do this on the server. A client-side limit is only for feel; exploiters skip it.`,`Clean up each player's bucket when they leave.`]
});

Lab.finder([
  ['Stop an FPS counter flickering','moving average','sg-movingavg'],
  ['Smooth a noisy value with one variable','exponential smoothing','sg-ema'],
  ['Stop controller stick drift','radial dead zone','sg-deadzone'],
  ['Add camera shake for explosions','trauma²  × noise','sg-shake'],
  ['Understand why fast wheels look backwards','aliasing','sg-alias'],
  ['Smooth out server position updates','snapshot interpolation','sg-interp'],
  ['Hide lag for fast vehicles','dead reckoning','sg-extrap'],
  ['Stop AI switching on and off at a range','hysteresis','sg-hysteresis'],
  ['Stop players spamming a RemoteEvent','token bucket','sg-ratelimit'],
]);
Lab.ref('signal','Signals',[
  ['moving average','sum of last N / N','sum += v; sum -= old','FPS, ping'],
  ['exponential smoothing','s += (raw − s)·α','s += (raw - s) * alpha','Any noisy value'],
  ['frame-rate independent α','1 − exp(−dt / τ)','1 - math.exp(-dt / 0.2)','Smoothing in Heartbeat'],
  ['dead zone','((m − d)/(1 − d))^p','shapeStick(v)','Gamepads'],
  ['trauma shake','trauma² × noise(t)','addTrauma(0.5)','Camera shake'],
  ['interpolation delay','render at now − delay','GetServerTimeNow() - 0.1','Network smoothing'],
  ['dead reckoning','pos + vel × age','last.position + last.velocity * age','Network prediction'],
  ['hysteresis','enter < leave thresholds','d < ENTER / d > LEAVE','No flicker'],
  ['token bucket','refill × dt, spend 1','b.tokens = math.min(cap, ...)','Rate limiting'],
]);
})();
