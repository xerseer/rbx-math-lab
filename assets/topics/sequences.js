(function(){
"use strict";
const {THREE, V, f, R, S, T, clamp} = Lab;
const {inst, labels} = Lab.kit2;
const demo = Lab.subject({
  id:'seq', title:'Sequences & sums', glyph:'seq',
  blurb:'Waves that grow by a fixed amount, totals without loops, triangle numbers and diminishing returns.'
});

/* A row of bars on the ground; bar i sits at x(i). */
function barRow(K, n, {gap=1.2, width=0.9, maxH=8}={}){
  const bars = inst(K, n), tags = labels(K, n, '--muted', 'tiny'), x0 = -(n-1)/2*gap;
  const x = i=>x0 + i*gap, tmp = V(), sc = V();
  return {x,
    draw(values, colorOf, labelOf){
      const top = Math.max(...values, 1e-6);
      bars.begin(); tags.begin();
      values.forEach((v,i)=>{ const h = Math.max(0.05, v/top*maxH); bars.add(tmp.set(x(i), h/2, 0), sc.set(width, h, width), colorOf(i));
        const t = labelOf ? labelOf(i, v) : null; if (t) tags.add(t, V(x(i), h + 0.45, 0)); });
      bars.end(); tags.end(); return top;
    }};
}

demo({
  id:'sq-arith', title:'Waves that grow by the same amount', short:'first + (n − 1) × step', sig:'enemies(n) = first + (n - 1) * step   ·   total(n) = n * (first + enemies(n)) / 2',
  view:{theta:0, phi:1.25, r:24, ty:4},
  params:[R('a','Wave 1 enemies',1,20,1,4), R('d','Extra per wave',0,10,1,3), R('n','Current wave',1,15,1,6)],
  setup(K){
    const row = barRow(K, 15, {gap:1.3}), nL = K.label('', '--accent-ink', 'big');
    K.label('wave →', '--muted').at(V(10.6, -0.6, 0));
    return {update(p){
      const vals = Array.from({length:15}, (_,i)=>p.a + i*p.d);
      const top = row.draw(vals, i=>i+1 === p.n ? '--accent' : i+1 < p.n ? '--va' : '--part', (i,v)=>String(v));
      const cur = p.a + (p.n-1)*p.d, total = p.n*(p.a + cur)/2;
      nL.at(V(row.x(p.n-1), cur/top*8 + 1.3, 0)).text(`wave ${p.n}`);
      return {cur, total};
    }};
  },
  readout:(p,o)=>[['enemies in wave '+p.n, String(o.cur),'acc'],['defeated in waves 1 to '+p.n, String(o.total)],['grows by', p.d+' per wave']],
  code:(p,o)=>`local FIRST, STEP = ${p.a}, ${p.d}

local function EnemiesInWave(wave: number): number
    return FIRST + (wave - 1) * STEP
end

-- total over waves 1..n without a loop: average of first and last, times how many
local function EnemiesUpToWave(wave: number): number
    return wave * (FIRST + EnemiesInWave(wave)) / 2
end

print(EnemiesInWave(${p.n}))     --> ${o.cur}
print(EnemiesUpToWave(${p.n}))   --> ${o.total}`,
  body:`<p>An <b>arithmetic sequence</b> adds the same amount every step: 4, 7, 10, 13… The value at step <i>n</i> is the first value plus <code>n − 1</code> steps.</p>
<p>The total so far has a neat shortcut. Pair the first bar with the last, the second with the second-last, and every pair adds to the same number. So the total is the <b>average of the first and last, times how many there are</b>. No loop needed, however many waves.</p>
<p>The teal bars are finished waves, orange is the current one.</p>`,
  uses:[`<b>Wave and round difficulty</b> in tower defence and survival games.`,
        `<b>Linear rewards</b>: daily login bonuses that rise by a fixed amount.`,
        `<b>Spacing things out</b>: the position of item n in a row is first + (n − 1) × gap.`],
  gotchas:[`Steps are counted from 1 here, so wave 1 has <code>(1 − 1) × step = 0</code> extra. Off-by-one is the usual bug.`,
           `Linear growth feels slow late on. If later waves need to ramp up, use a power or exponential curve instead (see <b>Level curves</b> in the math library).`]
});

demo({
  id:'sq-triangle', title:'Triangle numbers: stacking and totals', short:'1 + 2 + … + n = n(n + 1) / 2', sig:'1 + 2 + ... + n = n * (n + 1) / 2   ·   rows for N items = ⌈(√(8N + 1) − 1) / 2⌉',
  view:{theta:0.35, phi:1.15, r:26, ty:4},
  params:[R('n','Rows',1,14,1,7), S('shape','Shape',[['stair','Staircase'],['pyramid','Pyramid of balls']],'stair')],
  setup(K){
    const cubes = inst(K, 120), balls = inst(K, 120, {geo:Lab.G.sphere}), tmp = V(), nL = K.label('', '--accent-ink', 'big');
    return {update(p){
      cubes.begin(); balls.begin();
      const n = p.n, total = n*(n+1)/2;
      if (p.shape === 'stair'){
        for (let c=0;c<n;c++) for (let r=0;r<=c;r++) cubes.add(tmp.set((c - n/2)*1.05, r*1.05 + 0.5, 0), 1, c === n-1 ? '--accent' : '--va');
        nL.at(V(0, n*1.05 + 1.4, 0));
      } else {
        for (let r=0;r<n;r++){ const k = n - r; for (let i=0;i<k;i++) balls.add(tmp.set((i - (k-1)/2)*1.05, r*0.92 + 0.5, 0), 0.5, r === 0 ? '--accent' : '--vb'); }
        nL.at(V(0, n*0.92 + 1.2, 0));
      }
      cubes.end(); balls.end(); nL.text(`${n} rows → ${total} items`);
      return {total};
    }};
  },
  readout:(p,o)=>[['items in '+p.n+' rows', String(o.total),'acc'],['formula', `${p.n} × ${p.n+1} / 2`],['next row adds', String(p.n+1)]],
  code:(p,o)=>`local function Triangle(rows: number): number
    return rows * (rows + 1) / 2          -- 1 + 2 + ... + rows
end

print(Triangle(${p.n}))   --> ${o.total}

-- the reverse: how many rows does a stack of N items need?
local function RowsFor(items: number): number
    return math.ceil((math.sqrt(8 * items + 1) - 1) / 2)
end

print(RowsFor(${o.total + 1}))   --> ${p.n + 1}   (one more item starts a new row)`,
  body:`<p>Adding 1 + 2 + 3 + … + <i>n</i> gives the <b>triangle numbers</b>: 1, 3, 6, 10, 15… Put two copies of the staircase together, one flipped, and they make a rectangle <i>n</i> by <i>n</i> + 1. Half of that is the formula.</p>
<p>Solving the same formula backwards (it's a quadratic) tells you how many rows a pile of <i>N</i> items needs. Switch to the pyramid to see the same count as a stack of balls.</p>`,
  uses:[`<b>Bowling pins and ball pyramids</b>: 4 rows hold 10 pins.`,
        `<b>Total cost when each purchase costs 1 more</b> than the last.`,
        `<b>Handshakes and pairs</b>: n players have n(n − 1) / 2 unique pairs to check for collisions.`],
  gotchas:[`<code>n * (n + 1) / 2</code> is always a whole number, but Luau's <code>/</code> gives a float. Use <code>//</code> if you need an integer key.`,
           `For "every pair of players", it's <code>n * (n - 1) / 2</code>: one fewer, because nobody pairs with themselves.`]
});

demo({
  id:'sq-diminish', title:'Diminishing returns that never reach 100%', short:'1 − (1 − p)ⁿ', sig:'total = 1 - (1 - each) ^ count   ·   geometric sum a·(1 − rⁿ)/(1 − r) → a/(1 − r)',
  view:{theta:0, phi:1.25, r:24, ty:4},
  params:[R('each','Each item gives',0.05,0.6,0.01,0.25), R('n','Items stacked',1,15,1,5), T('naive','Compare with just adding',true)],
  setup(K){
    const row = barRow(K, 15, {gap:1.3}), cap = K.line('--bad', {dashed:true}), capL = K.label('100%', '--bad');
    const naive = K.line('--muted', {max:16, dashed:true}), nL = K.label('', '--accent-ink', 'big');
    return {update(p){
      const vals = Array.from({length:15}, (_,i)=>1 - Math.pow(1 - p.each, i+1));
      row.draw(vals,i=>i+1 === p.n ? '--accent' : i+1 < p.n ? '--va' : '--part', (i,v)=>i % 2 === 0 || i+1 === p.n ? f(v*100,0)+'%' : '');
      // bars are scaled to the tallest bar, so rescale the 100% line to match
      const top = vals[14], H = v=>v/top*8;
      cap.set(V(-10, H(1), 0), V(10, H(1), 0)); capL.at(V(10.8, H(1), 0));
      naive.visible = p.naive; if (p.naive) naive.set(Array.from({length:15}, (_,i)=>V(row.x(i), H(Math.min(1.2, (i+1)*p.each)), 0.6)));
      const total = vals[p.n-1]; nL.at(V(row.x(p.n-1), H(total) + 1.3, 0)).text(f(total*100,1)+'%');
      return {total, added:Math.min(9.99, p.n*p.each)};
    }};
  },
  readout:(p,o)=>[['total with '+p.n+' items', f(o.total*100,1)+'%','acc'],['if you just added them', f(o.added*100,0)+'%', o.added > 1 ? 'bad' : ''],['next item adds', f((1-o.total)*p.each*100,1)+'%']],
  code:(p,o)=>`local EACH = ${p.each}   -- every item blocks this share of what is LEFT

local function TotalReduction(count: number): number
    return 1 - (1 - EACH) ^ count
end

print(TotalReduction(${p.n}))   --> ${f(o.total,3)}   (never reaches 1)

local damageTaken = 100 * (1 - TotalReduction(${p.n}))   --> ${f(100*(1-o.total),1)}`,
  body:`<p>If each item gives 25% damage reduction and you simply add them, four items make you invincible. Instead, let each one block a share of the damage that's <b>still getting through</b>. The total climbs quickly at first, then crawls towards 100% without ever reaching it.</p>
<p>Behind it is a <b>geometric sequence</b>: each step multiplies by the same number <code>(1 − each)</code>. Its sum <code>a · (1 − rⁿ) / (1 − r)</code> levels off at <code>a / (1 − r)</code>, which is exactly why the bars flatten out. Turn on the comparison to see the plain sum (dashed) shoot past the red 100% line.</p>`,
  uses:[`<b>Stacking armour, dodge or cooldown reduction</b> without letting players break the game.`,
        `<b>Upgrade trees</b> where every level matters a bit less than the last.`,
        `<b>Chance that at least one of several effects triggers</b>: the same formula.`],
  gotchas:[`Be clear which kind your game uses. Players notice when "25% + 25%" shows as 43.75%.`,
           `Each item must be below 1 (100%), or the total jumps straight to 100%.`]
});

Lab.finder([
  ['Make each wave have a few more enemies','first + (wave - 1) * step','sq-arith'],
  ['Add up a growing series without a loop','n * (first + last) / 2','sq-arith'],
  ['Count balls in a pyramid stack','n * (n + 1) / 2','sq-triangle'],
  ['Stack armour without reaching 100%','1 - (1 - each) ^ count','sq-diminish'],
]);
Lab.ref('seq','Sequences',[
  ['first + (n - 1) * step','Term n of an arithmetic sequence','4 + (6 - 1) * 3 → 19','Wave sizes, evenly spaced items'],
  ['n * (first + last) / 2','Sum of an arithmetic sequence','6 * (4 + 19) / 2 → 69','Totals without a loop'],
  ['first * r ^ (n - 1)','Term n of a geometric sequence','10 * 2 ^ 4 → 160','Prices and XP that multiply'],
  ['a * (1 - r ^ n) / (1 - r)','Sum of a geometric sequence','1 * (1 - 0.5 ^ 3) / 0.5 → 1.75','Total cost of n upgrades'],
  ['n * (n + 1) / 2','Triangle number 1 + 2 + … + n','4 * 5 / 2 → 10','Stacks, pairs, rising costs'],
  ['1 - (1 - p) ^ n','Diminishing total of n shares','1 - 0.75 ^ 4 → 0.68','Armour and cooldown stacking'],
]);
})();
