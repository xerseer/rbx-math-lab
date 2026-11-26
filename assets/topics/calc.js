(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, vs, CF, G, R, S, T, clamp, noise, mulberry32} = Lab;
const {graph, inst, labels} = Lab.kit2;
const demo = Lab.subject({
  id:'calc', title:'Calculus for games', glyph:'calc', level:'Advanced',
  blurb:'Rates of change, velocity from samples, areas under curves, Newton and bisection solvers, gradient descent, arc length and smooth joins.'
});
const FNS = {
  wave:{n:'height = 2·sin(x) + 0.5x', f:x=>2*Math.sin(x) + 0.5*x, lua:'2 * math.sin(x) + 0.5 * x'},
  jump:{n:'jump: 6x − 1.5x²', f:x=>6*x - 1.5*x*x, lua:'6 * x - 1.5 * x ^ 2'},
  ease:{n:'smoothstep × 4', f:x=>{ const t = clamp(x/5,0,1); return 4*t*t*(3-2*t); }, lua:'4 * smoothstep(x / 5)'},
};
const fnOpts = Object.entries(FNS).map(([k,v])=>[k,v.n]);

demo({
  id:'cl-derivative', title:'Rate of change: derivatives', short:'slope of the tangent', sig:'f′(x) ≈ (f(x + h) − f(x − h)) / 2h',
  view:{theta:0, phi:1.3, r:22, ty:4},
  params:[S('fn','Curve',fnOpts,'jump'), R('x','At x',0,5,0.05,1.2), R('h','Step h',0.01,2,0.01,1)],
  setup(K){ const gr = graph(K,{x0:-10, y0:0.5, w:20, h:8, z:0, xr:[0,5], yr:[-1,7], xLabel:'x (time) →', xTicks:[[0,'0'],[5,'5']], yTicks:[[0,'0'],[6,'6']]});
    const cv = gr.curve('--ink'), tan = gr.curve('--accent', 2), sec = gr.curve('--va', 2, {dashed:true}), d0 = gr.dot('--accent'), d1 = gr.dot('--va', 0.13), d2 = gr.dot('--va', 0.13), lab = K.label('','--accent','big');
    return {update(p){
      const F = FNS[p.fn].f, x = p.x, h = p.h, slope = (F(x+1e-4) - F(x-1e-4))/2e-4, sl = (F(x+h) - F(x-h))/(2*h);
      cv.plot(F); tan.plot(t=>F(x) + slope*(t - x), x-1.5, x+1.5); sec.plot(t=>F(x) + sl*(t - x), x-h-0.6, x+h+0.6);
      d0.at(x, F(x)); d1.at(x-h, F(x-h)); d2.at(x+h, F(x+h)); lab.at(gr.P(x, F(x)).add(V(0,1,0))).text(`slope ${f(slope,2)}`);
      return {slope, sl};
    }};
  },
  readout:(p,o)=>[['true slope f′(x)', f(o.slope,3),'acc'],['estimate with h = '+p.h, f(o.sl,3)],['error', f(Math.abs(o.sl-o.slope),4)]],
  code:(p,o)=>`local function f(x) return ${FNS[p.fn].lua} end

local function derivative(fn, x, h)
    return (fn(x + h) - fn(x - h)) / (2 * h)       -- slope between two close points
end

print(derivative(f, ${p.x}, ${p.h}))     --> ${f(o.sl,3)}
print(derivative(f, ${p.x}, 0.001))   --> ${f(o.slope,3)}  (smaller h → closer to the true slope)`,
  body:`<p>A <b>derivative</b> is how fast something is changing right now: the slope of its graph at one point. If the curve is position over time, its slope is the <b>velocity</b>; the slope of velocity is <b>acceleration</b>.</p>
<p>Computers estimate it by looking a tiny step either side: rise over run between two nearby points (the dashed teal line). Shrink the step <code>h</code> and that line closes in on the true tangent (orange). On the jump curve, the slope is the upward speed: big at take-off, zero at the peak, negative on the way down.</p>`,
  uses:[`<b>Velocity from any animated position</b> (for trails, sound pitch, camera lean).`,`<b>Finding peaks</b>: where the slope is zero.`,`<b>Facing along a path</b>: the derivative of a curve is its direction.`],
  gotchas:[`Too small an h hits floating-point rounding. Around 0.001 is a good default for game values.`]
});

demo({
  id:'cl-velocity', title:'Measuring speed from positions', short:'Δposition / Δtime', sig:'velocity ≈ (pos_now − pos_before) / (t_now − t_before)', time:true,
  view:{theta:0, phi:1.2, r:24, ty:3},
  params:[R('noise','Position jitter',0,0.3,0.01,0.08), R('win','Average over samples',1,20,1,8)],
  setup(K){ const gr = graph(K,{x0:-10, y0:3, w:20, h:5, z:-3, xr:[0,6], yr:[-6,6], xLabel:'time →', yTicks:[[0,'0']]}); gr.hline(0,'--muted');
    const truth = gr.curve('--ink', 300), raw = gr.curve('--bad', 300, {opacity:0.6}), avg = gr.curve('--accent', 300), ball = K.point('--va',0.4), lab = K.label('','--accent');
    return {update(p,t){
      const pos = s=>6*Math.sin(s*1.2), vel = s=>7.2*Math.cos(s*1.2), dt = 1/30, r = mulberry32(7);
      const samples = []; for (let i=0;i<=180;i++){ const s = i*dt; samples.push(pos(s) + (r()*2-1)*p.noise); }
      const rawV = samples.map((v,i)=>i ? [i*dt, (v - samples[i-1])/dt] : [0,0]), avgV = samples.map((v,i)=>{ const k = Math.min(i, p.win); return [i*dt, k ? (v - samples[i-k])/(k*dt) : 0]; });
      truth.plot(vel); raw.points(rawV); avg.points(avgV.map(([s,v])=>[s - (p.win*dt)/2, v]));
      const tt = t % 6, i = Math.round(tt/dt); ball.position.set(samples[Math.min(i,180)], 1, 2); lab.at(V(samples[Math.min(i,180)],2,2)).text(`≈ ${f(avgV[Math.min(i,180)][1],1)} studs/s`);
      return {err:Math.abs(avgV[90][1] - vel(90*dt))};
    }};
  },
  readout:(p,o)=>[['window', `${p.win} samples (${f(p.win/30*1000,0)} ms)`,'acc'],['typical lag', f(p.win/60,2)+' s']],
  code:(p)=>`local history = {}            -- recent { time, position } samples, newest last
local WINDOW = ${p.win}

RunService.Heartbeat:Connect(function()
    table.insert(history, { os.clock(), part.Position })
    if #history > WINDOW + 1 then table.remove(history, 1) end
    if #history >= 2 then
        local old, new = history[1], history[#history]
        local velocity = (new[2] - old[2]) / (new[1] - old[1])   -- studs per second
        speedLabel.Text = string.format("%.1f", velocity.Magnitude)
    end
end)`,
  body:`<p>To measure how fast something is moving, compare where it is now with where it was a moment ago, and divide by the time between. That's the derivative again, done with real samples instead of a formula.</p>
<p>Comparing only the last two samples (red) is very sensitive to jitter: a tiny wobble in position becomes a huge spike in speed. Comparing over a longer window (orange) smooths it out, at the cost of reacting a little later. Raise the jitter and widen the window to find a balance.</p>`,
  uses:[`<b>Speedometers</b> and speed-based effects (wind lines, FOV).`,`<b>Anti-cheat</b>: flag players moving faster than possible.`,`<b>Velocity for parts moved by CFrame</b>, which have no physics velocity.`],
  gotchas:[`Divide by the real time between samples, not an assumed 1/60.`,`For physics parts, <code>AssemblyLinearVelocity</code> already gives you this.`]
});

demo({
  id:'cl-integral', title:'Adding up: area under a curve', short:'distance = Σ speed × dt', sig:'∫ v dt ≈ Σ v(tᵢ) · Δt',
  view:{theta:0, phi:1.3, r:22, ty:4},
  params:[R('n','Rectangles',2,80,1,10), S('rule','Sample at',[['left','Left edge'],['mid','Middle'],['right','Right edge']],'mid')],
  setup(K){ const gr = graph(K,{x0:-10, y0:0.5, w:20, h:7, z:0, xr:[0,10], yr:[0,8], xLabel:'time (s) →', yLabel:'speed', xTicks:[[0,'0'],[5,'5'],[10,'10']]});
    const cv = gr.curve('--ink'), rects = inst(K, 80, {opacity:0.5});
    return {update(p){
      const v = t=>t < 3 ? 2.4*t : t < 7 ? 7.2 : 7.2 - 2.4*(t-7), exact = 0.5*3*7.2 + 4*7.2 + 0.5*3*7.2; cv.plot(v);
      const dt = 10/p.n; let sum = 0; rects.begin();
      for (let i=0;i<p.n;i++){ const t0 = i*dt, ts = p.rule==='left' ? t0 : p.rule==='mid' ? t0 + dt/2 : t0 + dt, h = v(ts); sum += h*dt;
        const A = gr.P(t0, 0), B = gr.P(t0+dt, h); rects.add(V((A.x+B.x)/2, (A.y+B.y)/2, 0), V(Math.abs(B.x-A.x)*0.96, Math.max(0.01, B.y-A.y), 0.3), '--accent'); }
      rects.end(); return {sum, exact};
    }};
  },
  readout:(p,o)=>[['estimated distance', f(o.sum,2)+' studs','acc'],['exact', f(o.exact,2)+' studs'],['error', f(Math.abs(o.sum-o.exact),3)]],
  code:(p,o)=>`-- distance travelled = add up (speed × time step) over the whole trip
local function distance(speedAt, duration, steps)
    local dt = duration / steps
    local total = 0
    for i = 0, steps - 1 do
        local t = ${p.rule==='left' ? 'i * dt' : p.rule==='mid' ? '(i + 0.5) * dt' : '(i + 1) * dt'}
        total += speedAt(t) * dt
    end
    return total
end
print(distance(speedAt, 10, ${p.n}))   --> ${f(o.sum,2)}  (exact ${f(o.exact,2)})

-- in a game loop this happens automatically:  position += velocity * dt`,
  body:`<p>Integration is the opposite of the derivative: instead of "how fast is it changing?", it asks "how much has built up?". If you know a car's speed over time, the distance it covered is the <b>area under the speed graph</b>. Chop the time into thin slices, treat each as a rectangle (speed × time), and add them up.</p>
<p>More rectangles fit the curve better. Sampling at the middle of each slice is much more accurate than the left or right edge for the same count. Every <code>position += velocity * dt</code> in a game loop is this sum, one rectangle per frame.</p>`,
  uses:[`<b>Distance, fuel and stamina used</b> from a rate over time.`,`<b>Damage over time</b> from a damage-per-second curve.`,`<b>Physics stepping</b>: velocity from acceleration, position from velocity.`],
  gotchas:[`Big frames are big rectangles. Low frame rates integrate less accurately, which is why physics uses fixed small steps.`]
});

const proj = {f:t=>18*t - 0.5*20*t*t - 6, df:t=>18 - 20*t};
demo({
  id:'cl-newton', title:"Newton's method: solving equations", short:'follow the tangent to zero', sig:'x ← x − f(x) / f′(x)',
  view:{theta:0, phi:1.3, r:22, ty:3},
  params:[R('x0','Starting guess',0,1.8,0.01,0.1), R('iter','Iterations',0,6,1,3)],
  setup(K){ const gr = graph(K,{x0:-10, y0:2.5, w:20, h:6, z:0, xr:[0,1.8], yr:[-8,4], xLabel:'time (s) →', xTicks:[[0,'0'],[0.9,'0.9'],[1.8,'1.8']], yTicks:[[0,'height 6']]}); gr.hline(0,'--muted',false);
    const cv = gr.curve('--ink'), tans = [0,1,2,3,4,5].map(()=>gr.curve('--accent',2,{dashed:true})), dots = [0,1,2,3,4,5,6].map(()=>gr.dot('--accent',0.14)), lab = K.label('','--accent','big');
    return {update(p){
      cv.plot(proj.f); let x = p.x0; const xs = [x];
      for (let i=0;i<6;i++){ const fx = proj.f(x), d = proj.df(x); const nx = Math.abs(d) < 1e-9 ? x : x - fx/d; if (i < p.iter){ tans[i].visible = true; tans[i].plot(t=>fx + d*(t - x), Math.min(x,nx)-0.05, Math.max(x,nx)+0.05); } else tans[i].visible = false; if (i < p.iter){ x = nx; xs.push(x); } }
      dots.forEach((d,i)=>{ d.visible = i < xs.length; if (i < xs.length) d.at(xs[i], proj.f(xs[i])); });
      lab.at(gr.P(clamp(x,0,1.8), 0).add(V(0,1,0))).text(`t = ${f(x,4)}`);
      return {x, fx:proj.f(x), xs};
    }};
  },
  readout:(p,o)=>[['answer', f(o.x,5)+' s','acc'],['f(answer)', o.fx.toExponential(2)],['guesses', o.xs.map(v=>f(v,3)).join(' → ')]],
  code:(p,o)=>`-- when does a ball thrown up at 18 studs/s (gravity 20) first reach height 6?
local function f(t)  return 18 * t - 0.5 * 20 * t ^ 2 - 6 end   -- zero at the answer
local function df(t) return 18 - 20 * t end                     -- its slope

local t = ${p.x0}                       -- starting guess
for _ = 1, ${p.iter} do
    t = t - f(t) / df(t)              -- slide down the tangent line to zero
end
print(t)                              --> ${f(o.x,5)}`,
  body:`<p>Some equations can't be rearranged neatly, but you can still solve them. <b>Newton's method</b> starts with a guess, draws the tangent line there, and jumps to where that line crosses zero. That's the next guess. Near the answer, each step roughly doubles the number of correct digits.</p>
<p>Here it finds when a thrown ball first reaches a height of 6. Step through the iterations: the guesses race to the crossing point. Start near the peak (where the slope is flat) and the first jump overshoots wildly; Newton needs a decent starting guess.</p>`,
  uses:[`<b>Timing</b>: when does a projectile reach a height or distance?`,`<b>Inverting curves</b>: which t on a Bézier gives this x?`,`<b>Physics constraints</b> and IK solvers.`],
  gotchas:[`If the slope is near zero, the step explodes. Cap the step size or fall back to bisection.`]
});

demo({
  id:'cl-bisection', title:'Bisection: safe root finding', short:'halve the interval', sig:'if sign(f(a)) ≠ sign(f(mid)) then b = mid else a = mid',
  view:{theta:0, phi:1.3, r:22, ty:3},
  params:[R('a','Start of interval',0,0.6,0.01,0),R('b','End of interval',0.4,0.9,0.01,0.9), R('iter','Iterations',0,12,1,4)],
  setup(K){ const gr = graph(K,{x0:-10, y0:2.5, w:20, h:6, z:0, xr:[0,1.8], yr:[-8,4], xLabel:'time (s) →', yTicks:[[0,'height 6']]}); gr.hline(0,'--muted',false);
    const cv = gr.curve('--ink'), band = K.part(V(1,6,0.1),'--accent',{front:false, opacity:0.25}), la = gr.vline(0,'--va'), lb = gr.vline(0,'--vb'), lab = K.label('','--accent','big');
    return {update(p){
      cv.plot(proj.f); let a = p.a, b = Math.max(p.b, p.a + 0.01); const ok = Math.sign(proj.f(a)) !== Math.sign(proj.f(b));
      if (ok) for (let i=0;i<p.iter;i++){ const m = (a+b)/2; if (Math.sign(proj.f(a)) !== Math.sign(proj.f(m))) b = m; else a = m; }
      la.at(a); lb.at(b); const A = gr.P(a,-8), B = gr.P(b,4); band.resize(V(Math.max(0.02,B.x-A.x),B.y-A.y,0.1)); band.position.set((A.x+B.x)/2,(A.y+B.y)/2,-0.05);
      lab.at(gr.P((a+b)/2, 0).add(V(0,1.2,0))).text(ok ? `between ${f(a,4)} and ${f(b,4)}` : 'no sign change: no guaranteed root');
      return {a, b, ok};
    }};
  },
  readout:(p,o)=>[['answer is between', `${f(o.a,4)} and ${f(o.b,4)}`,'acc'],['interval width', f(o.b-o.a,5)],['guaranteed?', o.ok ? 'yes' : 'no: f has the same sign at both ends', o.ok ? 'ok' : 'bad']],
  code:(p)=>`local function bisect(f, a, b, iterations)
    assert(math.sign(f(a)) ~= math.sign(f(b)), "the ends must be on opposite sides of zero")
    for _ = 1, iterations do
        local mid = (a + b) / 2
        if math.sign(f(a)) ~= math.sign(f(mid)) then
            b = mid                         -- the crossing is in the left half
        else
            a = mid                         -- ...or in the right half
        end
    end
    return (a + b) / 2
end

print(bisect(f, ${p.a}, ${p.b}, ${p.iter}))`,
  body:`<p>Bisection is the slow-but-sure way to solve an equation. Start with an interval where the function is negative at one end and positive at the other; the answer must be inside. Check the middle, keep whichever half still has the sign change, and repeat. Each step halves the interval.</p>
<p>It never fails or blows up the way Newton can, and 20 steps narrows any interval a million times. If both ends have the same sign there might be no crossing, so it refuses (try moving the interval to see).</p>`,
  uses:[`<b>"When does X cross a threshold?"</b> (a value over time, a distance).`,`<b>Finding t on a curve</b> for a given x when Newton is unstable.`,`<b>Binary search</b> on sorted data and level curves.`],
  gotchas:[`It finds one crossing. If there are several in the interval, which one you get depends on the start.`]
});

demo({
  id:'cl-gradient', title:'Gradient descent: rolling downhill', short:'step against the slope', sig:'p ← p − rate × ∇h(p)',
  view:{theta:0.7, phi:0.8, r:28, ty:0}, env:'none',
  params:[R('sx','Start X',-10,10,0.25,6), R('sz','Start Z',-10,10,0.25,-7), R('rate','Step size',0.2,6,0.1,2), R('steps','Steps',1,80,1,40)],
  setup(K){ const N = 30, cs = 0.72, hm = inst(K, N*N), path = K.line('--accent',{max:81}), ball = K.point('--accent',0.35), start = K.point('--va',0.25);
    const h = (x,z)=>3 + 2.6*noise(x*0.11+0.3, z*0.11+0.7, 4) + 0.012*(x*x + z*z); let drawn = false;
    return {update(p){
      if (!drawn){ drawn = true; hm.begin(); for (let z=0;z<N;z++) for (let x=0;x<N;x++){ const wx = (x-N/2+0.5)*cs, wz = (z-N/2+0.5)*cs, y = h(wx,wz); hm.add(V(wx, y/2, wz), V(cs*0.98, y, cs*0.98), new THREE.Color().copy(C('--va')).lerp(C('--y'), clamp((y-1.5)/4,0,1))); } hm.end(); }
      let x = p.sx, z = p.sz; const pts = [V(x, h(x,z)+0.3, z)], e = 0.01;
      for (let i=0;i<p.steps;i++){ const gx = (h(x+e,z)-h(x-e,z))/(2*e), gz = (h(x,z+e)-h(x,z-e))/(2*e); x = clamp(x - p.rate*gx, -10.5, 10.5); z = clamp(z - p.rate*gz, -10.5, 10.5); pts.push(V(x, h(x,z)+0.3, z)); }
      path.set(pts); ball.position.copy(pts[pts.length-1]); start.position.copy(pts[0]);
      return {end:pts[pts.length-1], hEnd:h(x,z), hStart:h(p.sx,p.sz)};
    }};
  },
  readout:(p,o)=>[['start height', f(o.hStart,2)],['end height', f(o.hEnd,2),'acc'],['ended at', `${f(o.end.x,1)}, ${f(o.end.z,1)}`]],
  code:(p)=>`local function height(x, z) return terrainHeightAt(x, z) end

local function gradient(x, z)                 -- which way is uphill, and how steep
    local e = 0.01
    return (height(x + e, z) - height(x - e, z)) / (2 * e),
           (height(x, z + e) - height(x, z - e)) / (2 * e)
end

local x, z, RATE = ${p.sx}, ${p.sz}, ${p.rate}
for _ = 1, ${p.steps} do
    local gx, gz = gradient(x, z)
    x -= RATE * gx                            -- step downhill
    z -= RATE * gz
end
-- (x, z) is now at (or near) a low point`,
  body:`<p>The <b>gradient</b> is the derivative in 2D: an arrow pointing uphill, longer where the slope is steeper. Stepping a little <i>against</i> it moves you downhill. Repeat and you roll into a valley, like a ball. That's <b>gradient descent</b>, the method machine learning uses to tune millions of numbers.</p>
<p>Try different starting points: each rolls into its nearest valley, which isn't always the lowest one overall. Too small a step and it crawls; too big and it overshoots and bounces between hillsides.</p>`,
  uses:[`<b>Water flow and erosion</b>: which way does rain run?`,`<b>AI</b> seeking low ground, cover or the best score on a "danger map".`,`<b>Tuning numbers</b> automatically to minimise an error.`],
  gotchas:[`It only finds a local minimum. Start from several points if you need the lowest overall.`]
});

demo({
  id:'cl-arclength', title:'Arc length: measuring curves', short:'sum of tiny straight pieces', sig:'length ≈ Σ |P(tᵢ₊₁) − P(tᵢ)|',
  view:{theta:0.2, phi:0.8, r:24, ty:2},
  params:[R('n','Segments',1,64,1,6), S('curve','Curve',[['wave','Sine wave'],['circle','Half circle (radius 6)'],['spiral','Spiral']],'circle')],
  setup(K){ const exact = K.line('--muted',{max:401, dashed:true}), poly = K.line('--accent',{max:65}), dots = inst(K, 65, {geo:G.sphere});
    const CURVES = {wave:t=>V(-10 + 20*t, 2 + 2*Math.sin(t*Math.PI*3), 0), circle:t=>V(6*Math.cos(Math.PI*(1-t)), 1, -6*Math.sin(Math.PI*(1-t)) + 3), spiral:t=>V((1+6*t)*Math.cos(t*Math.PI*4), 1 + 3*t, (1+6*t)*Math.sin(t*Math.PI*4))};
    return {update(p){ const P = CURVES[p.curve]; const ex = []; let L = 0; for (let i=0;i<=400;i++){ ex.push(P(i/400)); if (i) L += ex[i].distanceTo(ex[i-1]); } exact.set(ex);
      const pts = []; let A = 0; for (let i=0;i<=p.n;i++){ pts.push(P(i/p.n)); if (i) A += pts[i].distanceTo(pts[i-1]); } poly.set(pts); dots.begin(); pts.forEach(q=>dots.add(q, 0.15, '--accent')); dots.end();
      return {A, L}; }};
  },
  readout:(p,o)=>[['with '+p.n+' segments', f(o.A,3),'acc'],['true length', f(o.L,3) + (p.curve==='circle' ? '  (π × 6 = 18.850)' : '')],['short by', f((1 - o.A/o.L)*100,2)+'%']],
  code:(p,o)=>`local function arcLength(pointAt, segments)       -- pointAt(t) for t from 0 to 1
    local total = 0
    local prev = pointAt(0)
    for i = 1, segments do
        local p = pointAt(i / segments)
        total += (p - prev).Magnitude                -- straight piece
        prev = p
    end
    return total
end
print(arcLength(curve, ${p.n}))   --> ${f(o.A,3)} (true ${f(o.L,3)})`,
  body:`<p>Curves have no simple length formula in general, so we approximate: chop the curve into straight pieces and add their lengths. A few pieces cut corners and come out short; more pieces hug the curve and approach the true length.</p>
<p>This is how distance tables for constant-speed motion along Bézier curves work (see Bézier curves), and how you'd work out the length of a rope, a race track or a path for a progress bar.</p>`,
  uses:[`<b>Constant-speed motion</b> along curves and splines.`,`<b>Race progress</b> and "distance to finish".`,`<b>Rope, cable and rail costs</b> in building games.`],
  gotchas:[`The straight-piece sum is always a little short. Use more pieces where the curve bends sharply.`]
});

demo({
  id:'cl-continuity', title:'Smooth joins: matching velocity', short:'no sudden speed changes', sig:'position continuous (C0) vs velocity continuous (C1)', time:true,
  view:{theta:0.0, phi:1.15, r:24, ty:3},
  params:[S('mode','Between waypoints',[['linear','Linear (speed jumps)'],['ease','Ease in/out each leg (stops)'],['smooth','Catmull-Rom (smooth through)']],'linear')],
  setup(K){ const keys = [-8,-2,3,8], gp = graph(K,{x0:-10, y0:4, w:20, h:3, z:-3, xr:[0,3], yr:[-9,9], axes:true, xLabel:'time →'}), gv = graph(K,{x0:-10, y0:0.6, w:20, h:2.6, z:-3, xr:[0,3], yr:[-12,12], axes:true});
    K.label('position','--muted').at(V(-11.4,5.5,-3)); K.label('velocity','--muted').at(V(-11.4,1.9,-3)); gv.hline(0,'--muted');
    const pc = gp.curve('--ink',300), vc = gv.curve('--accent',300), box = K.part(V(1,1,1),'--accent',{front:false}), dot = gp.dot('--accent',0.12), dv = gv.dot('--accent',0.12);
    const pos = (t, mode)=>{ const i = Math.min(2, Math.floor(t)), a = t - i, p0 = keys[Math.max(0,i-1)], p1 = keys[i], p2 = keys[i+1], p3 = keys[Math.min(3,i+2)];
      if (mode==='linear') return p1 + (p2-p1)*a; if (mode==='ease') return p1 + (p2-p1)*(a*a*(3-2*a));
      const a2 = a*a, a3 = a2*a; return 0.5*((2*p1) + (-p0+p2)*a + (2*p0-5*p1+4*p2-p3)*a2 + (-p0+3*p1-3*p2+p3)*a3); };
    return {update(p,t){ pc.plot(x=>pos(Math.min(2.999,x), p.mode)); vc.plot(x=>(pos(Math.min(2.999,x+1e-3),p.mode) - pos(Math.max(0,x-1e-3),p.mode))/2e-3);
      const tt = (t*0.6) % 3.4, s = Math.min(2.999, tt), x = pos(s, p.mode); box.position.set(x, 0.5, 3); dot.at(s, x); dv.at(s, (pos(Math.min(2.999,s+1e-3),p.mode) - pos(Math.max(0,s-1e-3),p.mode))/2e-3);
      return {}; }};
  },
  readout:(p)=>[['joins', p.mode==='linear' ? 'position smooth, speed jumps (C0)' : p.mode==='ease' ? 'smooth but stops at every waypoint' : 'position and speed both smooth (C1)','acc']],
  code:(p)=>`-- moving through waypoints A → B → C → D, one leg per second
${p.mode==='linear' ? `local pos = a:Lerp(b, alpha)                       -- speed jumps at every waypoint` : p.mode==='ease' ? `local pos = a:Lerp(b, alpha * alpha * (3 - 2 * alpha))  -- smooth, but halts at each point` : `local pos = catmullRom(prev, a, b, nextPoint, alpha)     -- passes through without stopping`}`,
  body:`<p>When an animation passes through several points, the <b>joins</b> decide how it feels. Linear legs keep the position continuous, but the speed (the slope of position) jumps at every waypoint: the velocity graph has steps, and the motion looks jerky.</p>
<p>Easing each leg removes the jumps but brings the speed to zero at every point, so it stutters. A Catmull-Rom spline keeps both position and velocity continuous, flowing through every point. Compare the bottom (velocity) graph for each mode.</p>`,
  uses:[`<b>Camera paths</b> through several shots.`,`<b>Patrols and moving platforms</b> with several stops.`,`<b>Chaining tweens</b> without visible hitches.`],
  gotchas:[`If you chain TweenService tweens with Quad or Sine easing, the object stops at each join. Use Linear for steady chains, or one spline.`]
});

Lab.finder([
  ['Find how fast something is changing','derivative','cl-derivative'],
  ['Measure a part\'s speed from its positions','Δposition / Δtime','cl-velocity'],
  ['Work out distance from a speed curve','integration (area)','cl-integral'],
  ['Find when a projectile reaches a height','Newton\'s method','cl-newton'],
  ['Find a threshold crossing reliably','bisection','cl-bisection'],
  ['Make water or AI roll downhill','gradient descent','cl-gradient'],
  ['Measure the length of a curved path','arc length','cl-arclength'],
  ['Stop chained animations stuttering','velocity-continuous joins','cl-continuity'],
]);
Lab.ref('calc','Calculus',[
  ['derivative','(f(x + h) − f(x − h)) / 2h','derivative(f, x, 0.001)','Speed, slope, direction'],
  ['velocity from samples','Δpos / Δt','(new - old) / (t1 - t0)','Speedometers, anti-cheat'],
  ['integral','Σ f(t)·Δt','total += speed * dt','Distance, totals'],
  ['Newton','x − f(x) / f′(x)','t = t - f(t) / df(t)','Fast solving'],
  ['bisection','halve the interval','mid = (a + b) / 2','Safe solving'],
  ['gradient','(∂h/∂x, ∂h/∂z)','gradient(x, z)','Downhill, optimisation'],
  ['arc length','Σ |Pᵢ₊₁ − Pᵢ|','arcLength(curve, 64)','Curve lengths'],
]);
})();
