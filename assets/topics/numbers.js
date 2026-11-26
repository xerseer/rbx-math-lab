(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, CF, G, R, S, T, clamp, mulberry32} = Lab;
const {graph, inst, labels} = Lab.kit2;
const demo = Lab.subject({
  id:'num', title:'Numbers & formatting', glyph:'digits',
  blurb:'Rounding, 1.2K-style abbreviations, timers, percentages, floating-point surprises, huge numbers, commas, stacks and averages.'
});
const big = L=>{ L.el.style.fontSize = '20px'; return L; };
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
function abbrev(n, d=1){ if (n < 1000) return String(Math.floor(n)); let i = Math.floor(Math.log10(n)/3); let v = n/Math.pow(1000,i); let r = Math.floor(v*Math.pow(10,d))/Math.pow(10,d); if (r >= 1000){ i++; r = r/1000; } return r.toFixed(d).replace(/\.0+$/,'') + SUFFIX[i]; }
function abbrevNaive(n, d=1){ if (n < 1000) return String(Math.round(n)); const i = Math.floor(Math.log10(n)/3); return (n/Math.pow(1000,i)).toFixed(d) + SUFFIX[i]; }

demo({
  id:'num-round', title:'Rounding to decimals', short:'math.round(x × 10ᵈ) / 10ᵈ', sig:'math.round(x * 10^d) / 10^d   ·   string.format("%.2f", x)',
  view:{theta:0, phi:1.3, r:18, ty:2},
  params:[R('x','Value',0,10,0.001,3.14159), R('d','Decimal places',0,3,1,2), S('fn','Function',[['round','math.round (nearest)'],['floor','math.floor (down)'],['ceil','math.ceil (up)']],'round')],
  setup(K){ const gr = graph(K,{x0:-10, y0:1, w:20, h:0.01, z:0, xr:[0,1], yr:[0,1], axes:false}); const ticks = inst(K, 120), mk = K.point('--vb',0.22), rk = K.point('--accent',0.3), ln = K.line('--muted',{dashed:true}), labs = labels(K, 12, '--muted','tiny'), lv = big(K.label('','--accent','big'));
    return {update(p){
      const step = Math.pow(10,-p.d), fn = Math[p.fn], r = fn(p.x/step)*step, lo = Math.floor(p.x) - (p.d===0 ? 2 : 0), hi = lo + (p.d===0 ? 5 : 1);
      const X = v=>-10 + (v - lo)/(hi - lo)*20; ticks.begin(); labs.begin(); const n = Math.round((hi-lo)/step);
      for (let i=0;i<=Math.min(n,110);i++){ const v = lo + i*step, major = p.d===0 || i % Math.round(Math.pow(10,Math.max(0,p.d-1))) === 0; ticks.add(V(X(v),1,0), V(0.05, major ? 0.8 : 0.35, 0.05), major ? '--ink' : '--muted'); if (major && p.d <= 1) labs.add(f(v,p.d), V(X(v),0.2,0)); }
      ticks.end(); labs.end(); mk.position.set(X(p.x),1.6,0); rk.position.set(X(r),2.4,0); ln.set(V(X(p.x),1.6,0), V(X(r),2.4,0)); lv.at(V(X(r),3.4,0)).text(r.toFixed(p.d));
      return {r};
    }};
  },
  readout:(p,o)=>[['value', String(p.x)],['result', o.r.toFixed(p.d),'acc']],
  code:(p,o)=>`local function roundTo(x, places)
    local m = 10 ^ places
    return math.${p.fn}(x * m) / m
end

print(roundTo(${p.x}, ${p.d}))                 --> ${o.r.toFixed(p.d)}
print(string.format("%.${p.d}f", ${p.x}))      --> ${p.x.toFixed(p.d)}   (text, always ${p.d} places)`,
  body:`<p>To round to some decimal places, scale up so those places become whole numbers, round, then scale back down. <code>math.round</code> goes to the nearest, <code>math.floor</code> always down and <code>math.ceil</code> always up. The ticks show the steps the number can snap to.</p>
<p>For display, <code>string.format("%.2f", x)</code> is usually easier: it rounds and always shows the same number of places ("3.10", not "3.1"), which keeps columns of numbers lined up.</p>`,
  uses:[`<b>Showing stats</b>: 2.47 damage per second instead of 2.4666666.`,`<b>Prices and currencies</b> (floor so players never see more than they have).`,`<b>Snapping slider values</b>.`],
  gotchas:[`Rounded values are still slightly imprecise underneath (see Floating point). Round only for display, not for saved maths.`]
});

demo({
  id:'num-abbrev', title:'1.2K, 3.4M: short numbers', short:'suffix = floor(log10(n) / 3)', sig:'tier = math.floor(math.log10(n) / 3);  n / 1000^tier .. SUFFIX[tier]',
  view:{theta:0, phi:1.25, r:20, ty:2.5},
  params:[R('e','Size (10^x)',0,21,0.01,6.3), R('d','Decimals',0,2,1,1)],
  setup(K){ const bars = inst(K, 8), labs = labels(K, 8, '--muted'), lv = big(K.label('','--accent','big')), ln = big(K.label('','--muted'));
    return {update(p){
      const n = Math.pow(10, p.e), tier = Math.min(7, Math.floor(p.e/3)); bars.begin(); labs.begin();
      SUFFIX.forEach((s,i)=>{ bars.add(V(-8 + i*2.3, 0.3, 0), V(1.8,0.6,1.2), i===tier ? '--accent' : '--part'); labs.add(s || 'none', V(-8 + i*2.3, 1.1, 0)); });
      bars.end(); labs.end(); lv.at(V(0,3.6,0)).text(abbrev(n,p.d)); ln.at(V(0,2.4,0)).text(n < 1e16 ? Math.floor(n).toLocaleString('en-US') : n.toExponential(3));
      return {n, a:abbrev(n,p.d), naive:abbrevNaive(n,p.d)};
    }};
  },
  readout:(p,o)=>[['full number', o.n < 1e16 ? Math.floor(o.n).toLocaleString('en-US') : o.n.toExponential(3)],['short', o.a,'acc'],['naive version', o.naive, o.naive.startsWith('1000') ? 'bad' : '']],
  code:(p,o)=>`local SUFFIX = { "", "K", "M", "B", "T", "Qa", "Qi", "Sx" }

local function abbreviate(n, decimals)
    if n < 1000 then return tostring(math.floor(n)) end
    local tier = math.floor(math.log10(n) / 3)
    local m = 10 ^ decimals
    local value = math.floor(n / 1000 ^ tier * m) / m     -- floor: never show more than you have
    if value >= 1000 then                                  -- 999,999 must not become "1000K"
        tier += 1
        value /= 1000
    end
    local text = string.format("%." .. decimals .. "f", value)
    if decimals > 0 then
        text = text:gsub("%.?0+$", "")                     -- "1.0K" → "1K", "1.50M" → "1.5M"
    end
    return text .. SUFFIX[tier + 1]
end

print(abbreviate(${o.n < 1e16 ? Math.floor(o.n) : o.n.toExponential(3)}, ${p.d}))   --> ${o.a}`,
  body:`<p>Simulators throw around huge numbers, and "12,345,678" is hard to read at a glance. Abbreviating groups digits in thousands: <code>log10</code> counts the digits, dividing by 3 gives the tier (K, M, B, T…), and dividing the number by 1000 to that power gives the short value.</p>
<p>Two details make it feel right. Round <b>down</b>, so 1.99M never shows as 2M when the player can't afford a 2M item. And handle the edge where rounding produces "1000K"; slide to just under 10⁶ and compare with the naive version.</p>`,
  uses:[`<b>Currency, damage and stat displays</b> in simulators and tycoons.`,`<b>Leaderboards</b> with mixed-size numbers.`,`<b>Prices</b> on buttons with limited space.`],
  gotchas:[`Above about 10^15 normal numbers lose precision (see "How big can numbers get?").`]
});

demo({
  id:'num-time', title:'Formatting time', short:'mm:ss with // and %', sig:'minutes = s // 60,  seconds = s % 60,  string.format("%02d:%02d", m, s)',
  view:{theta:0, phi:1.35, r:15, ty:4},
  params:[R('s','Seconds',0,10000,1,754)],
  setup(K){
    const Cn = V(0,4.2,0), face = K.add(new THREE.Mesh(new THREE.CircleGeometry(3.4,64), K.mat('--panel',{basic:true}))); face.position.copy(Cn).setZ(-0.05);
    const ring = K.ring(3.4,'--ink'); ring.rotation.x = Math.PI/2; ring.position.copy(Cn);
    const hm = Lab.kit2.bone(K,'--va',0.12), hs = Lab.kit2.bone(K,'--accent',0.06), lv = big(K.label('','--accent','big'));
    for (let i=0;i<12;i++){ const a = Math.PI/2 - i/12*Math.PI*2; K.point('--muted',0.08).position.set(Math.cos(a)*3, 4.2 + Math.sin(a)*3, 0.05); }
    return {update(p){
      const m = Math.floor(p.s/60), s = p.s % 60, h = Math.floor(p.s/3600), mm = Math.floor((p.s % 3600)/60);
      const am = Math.PI/2 - (p.s % 3600)/3600*Math.PI*2, as = Math.PI/2 - s/60*Math.PI*2;
      hm.set(Cn.clone().setZ(0.1), V(Math.cos(am)*2.2, 4.2 + Math.sin(am)*2.2, 0.1)); hs.set(Cn.clone().setZ(0.15), V(Math.cos(as)*3, 4.2 + Math.sin(as)*3, 0.15));
      lv.at(V(0,-0.2,0)).text(h > 0 ? `${h}:${String(mm).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
      return {m, s, h, mm};
    }};
  },
  readout:(p,o)=>[['mm:ss', `${String(o.m).padStart(2,'0')}:${String(o.s).padStart(2,'0')}`,'acc'],['h:mm:ss', `${o.h}:${String(o.mm).padStart(2,'0')}:${String(o.s).padStart(2,'0')}`]],
  code:(p,o)=>`local function formatTime(total)
    local hours = total // 3600
    local minutes = (total % 3600) // 60
    local seconds = total % 60
    if hours > 0 then
        return string.format("%d:%02d:%02d", hours, minutes, seconds)
    end
    return string.format("%02d:%02d", minutes, seconds)
end

print(formatTime(${p.s}))   --> ${o.h > 0 ? `${o.h}:${String(o.mm).padStart(2,'0')}:${String(o.s).padStart(2,'0')}` : `${String(o.m).padStart(2,'0')}:${String(o.s).padStart(2,'0')}`}`,
  body:`<p>Timers count seconds, but players read minutes and seconds. Floor division <code>//</code> by 60 gives whole minutes; the remainder <code>%</code> 60 gives the leftover seconds. Do the same with 3600 for hours.</p>
<p><code>%02d</code> in <code>string.format</code> pads with a zero, so 7 seconds shows as "07". Without it, the timer reads "2:7" and jumps width every second.</p>`,
  uses:[`<b>Round timers and countdowns.</b>`,`<b>Speedrun clocks</b> (add milliseconds with <code>%06.3f</code>).`,`<b>"Back in 2h 15m"</b> style cooldown text.`],
  gotchas:[`For a countdown, <code>math.ceil</code> the remaining seconds so it shows 1, not 0, during the last second.`]
});

demo({
  id:'num-percent', title:'Percentages and changes', short:'+50% then −50% ≠ start', sig:'part / whole × 100   ·   value × (1 + percent / 100)',
  view:{theta:0, phi:1.3, r:18, ty:3},
  params:[R('start','Start value',10,200,5,100), R('pct','Change',5,90,5,50,'%')],
  setup(K){ const bars = inst(K, 4), labs = labels(K, 8, '--ink');
    return {update(p){
      const up = p.start*(1 + p.pct/100), back = up*(1 - p.pct/100), sc = 7/Math.max(p.start, up);
      const vals = [['start', p.start, '--part'], [`+${p.pct}%`, up, '--ok'], [`then −${p.pct}%`, back, back < p.start ? '--bad' : '--accent']];
      bars.begin(); labs.begin(); vals.forEach(([n,v,c],i)=>{ const h = v*sc; bars.add(V(-5 + i*5, h/2, 0), V(3, h, 1.5), c); labs.add(f(v,1), V(-5+i*5, h + 0.6, 0)); labs.add(n, V(-5+i*5, -0.5, 0)); }); bars.end(); labs.end();
      return {up, back};
    }};
  },
  readout:(p,o)=>[['after +'+p.pct+'%', f(o.up,1)],['after −'+p.pct+'%', f(o.back,1),'bad'],['overall change', f((o.back/p.start - 1)*100,1)+'%']],
  code:(p,o)=>`local function percentOf(part, whole) return part / whole * 100 end
local function changeBy(value, percent) return value * (1 + percent / 100) end

local price = ${p.start}
price = changeBy(price, ${p.pct})     --> ${f(o.up,1)}
price = changeBy(price, -${p.pct})    --> ${f(o.back,1)}  (not ${p.start}!)

-- undoing a +${p.pct}% boost means dividing, not subtracting ${p.pct}%:
local original = ${f(o.up,1)} / (1 + ${p.pct} / 100)   --> ${p.start}`,
  body:`<p>A percentage is a fraction of 100: <code>part / whole × 100</code>. Changing a value by a percentage multiplies it by <code>1 + percent / 100</code>. The catch: a 50% rise followed by a 50% drop doesn't get you back where you started, because the drop is taken from the bigger number.</p>
<p>This trips up shop sales, damage buffs and stat stacking all the time. To undo a percentage boost, divide by the same multiplier instead.</p>`,
  uses:[`<b>Buffs and debuffs</b>: +20% speed, −30% damage.`,`<b>Sales and discounts</b> in shops.`,`<b>Progress text</b>: "64% complete".`],
  gotchas:[`Decide whether stacked buffs add (+20% + 30% = +50%) or multiply (×1.2 × 1.3 = +56%), and tell players which.`]
});

demo({
  id:'num-float', title:'Floating-point surprises', short:'0.1 + 0.2 ~= 0.3', sig:'math.abs(a − b) < 1e-9   instead of   a == b',
  view:{theta:0, phi:1.25, r:22, ty:4},
  params:[R('n','Times to add 0.1',10,10000,10,1000)],
  setup(K){ const gr = graph(K,{x0:-10, y0:1, w:20, h:6, z:0, xr:[0,1], yr:[0,1], xLabel:'additions →', yLabel:'error'}); const cv = gr.curve('--bad', 200), lv = big(K.label('','--accent','big'));
    return {update(p){
      let s = 0; const errs = []; const step = Math.max(1, Math.floor(p.n/200));
      for (let i=1;i<=p.n;i++){ s += 0.1; if (i % step === 0) errs.push([i, Math.abs(s - i/10)]); }
      const mx = Math.max(1e-30, ...errs.map(e=>e[1])); cv.points(errs.map(([i,e])=>[i/p.n, e/mx]));
      lv.at(V(0,8,0)).text(`${p.n} × 0.1 = ${s.toPrecision(17).replace(/0+$/,'')}`);
      return {s, err:Math.abs(s - p.n/10)};
    }};
  },
  readout:(p,o)=>[['exact answer', f(p.n/10,1)],['computed', o.s.toPrecision(17).replace(/0+$/,''),'bad'],['error', o.err.toExponential(2)],['0.1 + 0.2 == 0.3', 'false','bad']],
  code:(p,o)=>`print(0.1 + 0.2 == 0.3)              --> false
print(0.1 + 0.2)                     --> 0.30000000000000004

local total = 0
for i = 1, ${p.n} do total += 0.1 end
print(string.format("%.17g", total)) --> ${o.s.toPrecision(17)}

-- compare with a tolerance instead of ==
local function nearlyEqual(a, b) return math.abs(a - b) < 1e-9 end
print(nearlyEqual(0.1 + 0.2, 0.3))   --> true

-- for money, count whole units (cents) instead of decimals
local cents = 0
cents += 10                          -- exact`,
  body:`<p>Computers store numbers in binary, and many simple decimals like 0.1 can't be written exactly in binary, just as ⅓ can't be written exactly in decimal. The stored value is a tiny bit off, so <code>0.1 + 0.2</code> comes out as 0.30000000000000004.</p>
<p>Each addition adds a little more error; the graph shows it creeping up. It's far too small to see in gameplay, but it breaks <code>==</code> checks. Compare with a small tolerance, and keep money as whole numbers.</p>`,
  uses:[`<b>Equality checks</b> on positions, timers and calculated values.`,`<b>Currencies</b>: store whole coins or cents.`,`<b>Long-running accumulators</b>: recompute from a start time instead of adding small steps forever.`],
  gotchas:[`<code>Vector3</code> uses 32-bit floats, which are much less precise than Luau numbers. Far from the origin (100,000+ studs) positions visibly jitter.`]
});

demo({
  id:'num-bignum', title:'How big can numbers get?', short:'exact up to 2⁵³', sig:'2^53 + 1 == 2^53  →  true',
  view:{theta:0, phi:1.3, r:20, ty:2},
  params:[R('e','Number ≈ 2^x',40,70,1,53)],
  setup(K){ const ticks = inst(K, 40), mk = K.point('--accent',0.25), labs = labels(K,3,'--muted'), lv = big(K.label('','--accent','big'));
    return {update(p){
      const gap = Math.pow(2, Math.max(0, p.e - 52)); ticks.begin(); const shown = Math.min(30, Math.max(2, Math.round(16/Math.min(16, gap))));
      for (let i=0;i<=16;i++) ticks.add(V(-8 + i, 1, 0), V(0.04,0.6,0.04), '--muted');
      const spacing = 16/Math.min(16, Math.max(1, gap)); if (gap <= 16) for (let x=0; x<=16+1e-9; x+=Math.max(1,gap)) ticks.add(V(-8 + x, 1.3, 0), V(0.18,0.18,0.18), '--accent');
      else ticks.add(V(-8,1.3,0), V(0.18,0.18,0.18), '--accent');
      ticks.end(); labs.begin(); labs.add('n', V(-8,0.3,0)); labs.add('n + 16', V(8,0.3,0)); labs.end();
      lv.at(V(0,3.2,0)).text(gap <= 1 ? 'every whole number exists here' : `only every ${gap > 1e6 ? gap.toExponential(1) : gap.toLocaleString('en-US')}th number exists`);
      return {gap, n:Math.pow(2,p.e)};
    }};
  },
  readout:(p,o)=>[['number', o.n.toLocaleString('en-US')],['gap to the next number', o.gap.toLocaleString('en-US'), o.gap > 1 ? 'bad' : 'ok'],['n + 1 == n?', String(o.gap > 2), o.gap > 2 ? 'bad' : 'ok']],
  code:(p,o)=>`print(2 ^ 53)              --> 9007199254740992
print(2 ^ 53 + 1 == 2 ^ 53) --> true  (the +1 is lost)
print(math.huge)            --> inf

-- at 2^${p.e} the gap between numbers is ${o.gap.toLocaleString('en-US')}
-- simulators with endless growth: store a mantissa and an exponent instead
local money = { m = 1.5, e = 24 }          -- 1.5 × 10^24
local function add(a, b)                    -- b smaller or equal
    local diff = a.e - b.e
    if diff > 15 then return a end           -- too small to matter
    local m = a.m + b.m / 10 ^ diff
    if m >= 10 then return { m = m / 10, e = a.e + 1 } end
    return { m = m, e = a.e }
end`,
  body:`<p>Luau numbers are 64-bit floats. They count every whole number exactly up to 2⁵³ (about 9 quadrillion). Past that, the gaps between storable numbers grow: at 2⁶⁰ only every 256th number exists, so adding 1 does nothing at all.</p>
<p>Most games never get close. Simulators with exponential growth do, and then counters stop changing or save files go wrong. Those games store numbers as a <b>mantissa and exponent</b> ("1.5 × 10²⁴") or work with logarithms, and abbreviate for display.</p>`,
  uses:[`<b>Idle and simulator games</b> with runaway numbers.`,`<b>IDs and timestamps</b>: keep them below 2⁵³, or store them as strings.`,`<b>Knowing when to switch</b> to a big-number system.`],
  gotchas:[`DataStores and JSON also use these numbers. Values above 2⁵³ may come back slightly different.`]
});

demo({
  id:'num-commas', title:'Thousands separators', short:'1234567 → 1,234,567', sig:'tostring(n):reverse():gsub("(%d%d%d)", "%1,"):reverse()',
  view:{theta:0, phi:1.25, r:18, ty:2},
  params:[R('e','Number size (10^x)',0,12,0.01,6.09)],
  setup(K){ const tiles = inst(K, 20), labs = labels(K, 20, '--ink','big');
    return {update(p){
      const n = Math.floor(Math.pow(10,p.e)), s = String(n), len = s.length, out = n.toLocaleString('en-US'); tiles.begin(); labs.begin();
      let x = -(out.length-1)*0.55; [...out].forEach(ch=>{ const isComma = ch === ','; if (!isComma){ const idx = [...s].length; } tiles.add(V(x, isComma ? 0.2 : 0.6, 0), V(isComma ? 0.25 : 1, isComma ? 0.4 : 1.2, 0.4), isComma ? '--accent' : '--part'); labs.add(ch, V(x, 1.6, 0)); x += 1.1; });
      tiles.end(); labs.end(); return {n, out};
    }};
  },
  readout:(p,o)=>[['plain', String(o.n)],['with commas', o.out,'acc']],
  code:(p,o)=>`local function withCommas(n)
    local s = tostring(math.floor(n))
    local formatted = s:reverse():gsub("(%d%d%d)", "%1,"):reverse()
    return (formatted:gsub("^,", ""))       -- drop a leading comma (e.g. ",123,456")
end

print(withCommas(${o.n}))   --> ${o.out}`,
  body:`<p>Separators every three digits make big numbers readable at a glance. The usual Lua trick reverses the digits, inserts a comma after every group of three from the start, then reverses back. Reversing is what makes the groups count from the right-hand end.</p>
<p>If the number of digits is a multiple of three, the reversed text gets a comma at the very end, which becomes a leading comma after reversing back; the second <code>gsub</code> trims it.</p>`,
  uses:[`<b>Leaderboards and currency counters.</b>`,`<b>Exact numbers</b> where abbreviations (1.2M) hide too much.`,`<b>Receipts and stats screens.</b>`],
  gotchas:[`Negative numbers need the minus sign handled separately. Some languages use dots or spaces instead of commas; check if you localise.`]
});

demo({
  id:'num-intdiv', title:'Floor division and remainders', short:'stacks = total // size', sig:'full = total // size,  leftover = total % size',
  view:{theta:0.3, phi:1.1, r:20, ty:2},
  params:[R('total','Items',0,300,1,157), S('size','Stack size',[['16','16'],['32','32'],['64','64']],'64')],
  setup(K){ const cubes = inst(K, 400), labs = labels(K, 8, '--ink');
    return {update(p){
      const s = +p.size, full = Math.floor(p.total/s), left = p.total % s, stacks = full + (left ? 1 : 0); cubes.begin(); labs.begin();
      for (let k=0;k<stacks;k++){ const cnt = k < full ? s : left, x = -7 + k*2.4; for (let i=0;i<cnt;i++) cubes.add(V(x + (i%4)*0.42 - 0.63, 0.2 + Math.floor(i/4)*0.42*(16/s)*1, (Math.floor(i/4)%1)), V(0.38,0.38*(16/s),0.38), k < full ? '--va' : '--accent'); labs.add(String(cnt), V(x, 0.6 + (Math.ceil(cnt/4))*0.42*(16/s), 0)); }
      cubes.end(); labs.end(); return {full, left};
    }};
  },
  readout:(p,o)=>[['full stacks', String(o.full),'acc'],['leftover', String(o.left)],['-7 // 2 and -7 % 2', '-4 and 1']],
  code:(p,o)=>`local STACK = ${p.size}
local total = ${p.total}

local fullStacks = total // STACK      --> ${o.full}
local leftover = total % STACK         --> ${o.left}
-- total == fullStacks * STACK + leftover, always

-- watch out with negatives: Luau rounds DOWN, not toward zero
print(-7 // 2, -7 % 2)                 --> -4  1`,
  body:`<p>Integer division answers "how many whole groups?" and the remainder answers "how many left over?". In Luau, <code>//</code> divides and rounds down; <code>%</code> gives what's left. Together they always rebuild the original: <code>groups × size + leftover</code>.</p>
<p>It's the maths behind inventory stacks, splitting players into teams, pages of results and wave counts. Change the item count and watch the stacks fill.</p>`,
  uses:[`<b>Inventory stacks</b> and storage limits.`,`<b>Pagination</b>: how many pages, items on the last page.`,`<b>Splitting players</b> into equal teams.`],
  gotchas:[`Luau's <code>//</code> and <code>%</code> round toward negative infinity, unlike some languages. <code>-7 // 2</code> is −4.`]
});

demo({
  id:'num-stats', title:'Averages, medians and outliers', short:'mean vs median', sig:'mean = sum / count   ·   median = middle value after sorting',
  view:{theta:0, phi:1.25, r:22, ty:3},
  params:[R('spike','Lag spike size',0,800,10,500,' ms'), R('seed','Samples (seed)',1,60,1,3)],
  setup(K){ const bars = inst(K, 15), meanL = K.line('--bad',{dashed:true}), medL = K.line('--ok',{dashed:true}), lm = K.label('','--bad'), ld = K.label('','--ok');
    return {update(p){
      const r = mulberry32(p.seed*37), data = Array.from({length:15}, ()=>40 + r()*30); data[7] = Math.max(data[7], 50 + p.spike);
      const mean = data.reduce((a,b)=>a+b,0)/data.length, sorted = [...data].sort((a,b)=>a-b), median = sorted[7], sc = 7/Math.max(...data);
      bars.begin(); data.forEach((v,i)=>bars.add(V(-9.8 + i*1.4, v*sc/2, 0), V(1, v*sc, 1), i===7 && p.spike > 0 ? '--accent' : '--part')); bars.end();
      meanL.set(V(-10.6,mean*sc,0.6), V(10,mean*sc,0.6)); medL.set(V(-10.6,median*sc,0.6), V(10,median*sc,0.6));
      lm.at(V(10.8,mean*sc,0.6)).text(`mean ${f(mean,0)}`); ld.at(V(10.8,median*sc,0.6)).text(`median ${f(median,0)}`); lm.el.style.translate = ld.el.style.translate = '50% 0';
      return {mean, median};
    }};
  },
  readout:(p,o)=>[['mean (average)', f(o.mean,1)+' ms','bad'],['median (middle)', f(o.median,1)+' ms','ok']],
  code:(p,o)=>`local function mean(list)
    local sum = 0
    for _, v in list do sum += v end
    return sum / #list
end

local function median(list)
    local sorted = table.clone(list)
    table.sort(sorted)
    local mid = #sorted // 2
    if #sorted % 2 == 1 then return sorted[mid + 1] end
    return (sorted[mid] + sorted[mid + 1]) / 2
end

print(mean(pings), median(pings))   --> ${f(o.mean,1)}  ${f(o.median,1)}`,
  body:`<p>The <b>mean</b> (average) adds everything up and divides by the count. The <b>median</b> sorts the values and takes the middle one. With normal data they're close; add one big <b>outlier</b> (a lag spike, a whale purchase) and the mean jumps while the median barely moves.</p>
<p>Push the spike up and watch the red mean line climb above almost every real sample. When you want a "typical" value for pings, frame times or match lengths, the median is usually more honest.</p>`,
  uses:[`<b>Ping and FPS displays</b> that don't jump on one spike.`,`<b>Balancing data</b>: typical match length, typical earnings per hour.`,`<b>Anti-cheat</b>: flag values far from the median.`],
  gotchas:[`Sorting costs time on big lists; for live displays, keep a small rolling window.`]
});

Lab.finder([
  ['Round a number to 2 decimal places','math.round(x * 100) / 100','num-round'],
  ['Show big numbers as 1.2K or 3.4M','log10 suffix tiers','num-abbrev'],
  ['Show a timer as mm:ss','// and % with string.format','num-time'],
  ['Apply percentage buffs and discounts','value × (1 + pct / 100)','num-percent'],
  ['Compare decimals safely','math.abs(a - b) < epsilon','num-float'],
  ['Handle huge simulator numbers','mantissa and exponent','num-bignum'],
  ['Add commas to big numbers','reverse + gsub','num-commas'],
  ['Split items into stacks','// and %','num-intdiv'],
  ['Show a fair average ping','median instead of mean','num-stats'],
]);
Lab.ref('num','Numbers',[
  ['math.round(x * 10^d) / 10^d','Round to d places','math.round(3.14159 * 100) / 100','Displays'],
  ['string.format("%.2f", x)','Fixed decimals as text','string.format("%.1f", hp)','UI text'],
  ['string.format("%02d", n)','Zero-padded','"07"','Timers'],
  ['a // b,  a % b','Whole groups, remainder','157 // 64, 157 % 64','Stacks, time'],
  ['math.log10(n)','Number of digits − 1','math.floor(math.log10(n))','Abbreviations'],
  ['math.abs(a − b) < eps','Safe equality','< 1e-9','Floats'],
  ['2^53','Largest exact whole number','9007199254740992','Big numbers'],
  ['table.sort + middle','Median','sorted[#sorted // 2 + 1]','Typical values'],
]);
})();
