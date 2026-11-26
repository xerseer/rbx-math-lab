(function(){
"use strict";
const {THREE, V, UP, C, f, G, R, S, T, mulberry32} = Lab;
const demo = Lab.subject({
  id:'probability', title:'Probability', glyph:'dice',
  blurb:'Weighted loot, drop chances over many tries, dice, bullet spread and fair random spawns.'
});

function bar(K, color, opacity=1){
  const m = K.add(new THREE.Mesh(G.box, K.mat(color,{opacity})));
  m.setBar = (x,z,w,h)=>{ const hh = Math.max(h, 0.001); m.scale.set(w,hh,w); m.position.set(x,hh/2,z); m.visible = h > 0.0005; return m; };
  return m;
}
function wire(K, color){
  const m = K.add(new THREE.LineSegments(G.edges, new THREE.LineBasicMaterial({color:C(color)})));
  m.setBar = (x,z,w,h)=>{ const hh = Math.max(h, 0.001); m.scale.set(w,hh,w); m.position.set(x,hh/2,z); return m; };
  return m;
}
function gaussian(rng){ const u1 = 1 - rng(), u2 = rng(); return Math.sqrt(-2*Math.log(u1)) * Math.cos(2*Math.PI*u2); }
const pct = (x,d=1)=>f(x*100,d)+'%';

demo({
  id:'pr-weighted', title:'Weighted loot tables', short:'pick by weight', sig:'pick = rng:NextNumber(0, totalWeight), then subtract weights in order',
  view:{theta:0.0, phi:1.2, r:24, ty:4}, env:'grid',
  params:[S('rolls','Rolls',[['10','10'],['100','100'],['1000','1,000'],['10000','10,000']],'100'), R('leg','Legendary weight',0,20,1,4), R('seed','Seed',1,99,1,5)],
  setup(K){
    const base = [['Common',60,'--part'],['Uncommon',25,'--y'],['Rare',10,'--z'],['Legendary',4,'--accent'],['Mythic',1,'--vb']];
    const bars = base.map(b=>bar(K,b[2])), wires = base.map(()=>wire(K,'--ink'));
    const names = base.map(b=>K.label(b[0], b[2], 'big')), nums = base.map(()=>K.label('', '--ink'));
    K.label('outline = expected   ·   solid = what you actually got','--muted').at(V(0,-0.7,2));
    let key = '', res = null;
    return {update(p){
      const items = base.map(b=>({name:b[0], w: b[0]==='Legendary' ? p.leg : b[1], c:b[2]}));
      const k = p.rolls+'|'+p.leg+'|'+p.seed;
      if (k !== key){ key = k;
        const total = items.reduce((s,i)=>s+i.w,0), rng = mulberry32(p.seed*977 + +p.rolls), counts = items.map(()=>0), n = +p.rolls;
        for (let r=0;r<n;r++){ let pick = rng()*total; for (let i=0;i<items.length;i++){ pick -= items[i].w; if (pick <= 0){ counts[i]++; break; } } }
        res = {total, counts, n};
      }
      items.forEach((it,i)=>{
        const x = -8 + i*4, exp = res.total ? it.w/res.total : 0, got = res.counts[i]/res.n;
        bars[i].setBar(x,0,2,got*14); wires[i].setBar(x,0,2.15,exp*14);
        names[i].at(V(x, Math.max(got,exp)*14 + 1.1, 0)); nums[i].at(V(x, Math.max(got,exp)*14 + 0.5, 0)).text(`${pct(exp)} · got ${pct(got)}`);
      });
      const li = 3, legP = res.total ? items[li].w/res.total : 0;
      return {items, res, legP};
    }};
  },
  readout:(p,o)=>[['total weight', String(o.res.total)],['Legendary chance', pct(o.legP,2)],['about 1 in', o.legP ? f(1/o.legP,0)+' rolls' : 'never','acc'],['Legendaries got', `${o.res.counts[3]} of ${o.res.n}`]],
  code:(p,o)=>`local LOOT = {
${o.items.map(i=>`    { name = "${i.name}", weight = ${i.w} },`).join('\n')}
}   -- total weight ${o.res.total}

local rng = Random.new()

local function roll()
    local total = 0
    for _, item in LOOT do
        total += item.weight
    end
    local pick = rng:NextNumber(0, total)
    for _, item in LOOT do
        pick -= item.weight
        if pick <= 0 then
            return item.name
        end
    end
end

print(roll())   -- Legendary comes up ${pct(o.legP,2)} of the time`,
  body:`<p>A weighted table lets you write chances as simple numbers that don't have to add up to 100. Add the weights together, pick a random number up to that total, then walk down the list subtracting each weight. The item that takes you to zero or below wins. Bigger weights take up more of the range, so they win more often.</p>
<p>The outlines show the expected share and the solid bars show what a run of rolls actually gave. With 10 rolls the bars are all over the place; with 10,000 they hug the outlines. Raise the Legendary weight and every other chance shrinks a little, because the total grew.</p>`,
  uses:[`<b>Loot drops, crates and gacha pulls.</b>`,
        `<b>Enemy spawn tables</b>: more weak enemies, a few strong ones.`,
        `<b>Weighted AI choices</b>: an NPC that usually attacks but sometimes taunts.`],
  gotchas:[`Show players the real percentage (<code>weight / total</code>), not the raw weight. Many regions require published odds for paid random items.`,
           `Roll on the <b>server</b>. Anything the client rolls can be faked by exploiters.`,
           `A weight of 0 means "never", which is handy for switching items off during events.`]
});

demo({
  id:'pr-atleast', title:'Chance over many tries', short:'1 - (1 - p)^n', sig:'chance of at least one = 1 - (1 - p) ^ n',
  view:{theta:0.0, phi:1.25, r:24, ty:4}, env:'grid',
  params:[R('p','Chance per try',0.5,50,0.5,5,'%'), R('n','Tries',1,40,1,20), R('pity','Pity: guaranteed by try (0 = off)',0,40,1,0)],
  setup(K){
    const bars = Array.from({length:40}, ()=>bar(K,'--part'));
    const l50 = K.line('--muted',{dashed:true}), l90 = K.line('--muted',{dashed:true}), l100 = K.line('--muted',{opacity:0.4});
    l50.set(V(-10.5,4,0), V(10.5,4,0)); l90.set(V(-10.5,7.2,0), V(10.5,7.2,0)); l100.set(V(-10.5,8,0), V(10.5,8,0));
    K.label('50%','--muted').at(V(-11.4,4,0)); K.label('90%','--muted').at(V(-11.4,7.2,0)); K.label('100%','--muted').at(V(-11.6,8,0));
    K.label('try 1','--muted').at(V(-10,-0.5,0)); K.label('try 40','--muted').at(V(9.5,-0.5,0));
    const lab = K.label('','--accent','big');
    return {update(p){
      const q = p.p/100; let at = 0;
      for (let n=1;n<=40;n++){
        let P = 1 - Math.pow(1-q, n); if (p.pity && n >= p.pity) P = 1;
        const x = -10 + (n-1)*0.513; bars[n-1].setBar(x,0,0.42,P*8);
        bars[n-1].material.color.copy(C(n===p.n ? '--accent' : (p.pity && n>=p.pity ? '--ok' : '--part')));
        if (n === p.n){ at = P; lab.at(V(x, P*8+0.6, 0)).text(pct(P)); }
      }
      const t50 = Math.ceil(Math.log(0.5)/Math.log(1-q)), t90 = Math.ceil(Math.log(0.1)/Math.log(1-q));
      return {at, t50, t90, q};
    }};
  },
  readout:(p,o)=>[[`at least one in ${p.n} tries`, pct(o.at),'acc'],['tries for 50%', String(o.t50)],['tries for 90%', String(o.t90)],['expected tries', f(1/o.q,1)]],
  code:(p,o)=>`local function chanceAtLeastOnce(p, tries)
    return 1 - (1 - p) ^ tries
end

print(chanceAtLeastOnce(${f(o.q,3)}, ${p.n}))   --> ${f(o.at,3)}

-- how many tries until a player has a given chance?
local function triesFor(p, target)
    return math.ceil(math.log(1 - target) / math.log(1 - p))
end
print(triesFor(${f(o.q,3)}, 0.5))   --> ${o.t50}
print(triesFor(${f(o.q,3)}, 0.9))   --> ${o.t90}
${p.pity ? `
-- pity: count misses and force a win on try ${p.pity}
misses += 1
if misses >= ${p.pity} or rng:NextNumber() < ${f(o.q,3)} then
    misses = 0
    giveReward()
end` : ''}`,
  body:`<p>A 5% drop doesn't mean you get it after 20 kills. Each try is independent, so the easy question is the opposite one: what's the chance of missing every time? Missing once is <code>1 - p</code>, missing n times in a row is <code>(1 - p)^n</code>, and one minus that is the chance of getting it at least once.</p>
<p>Each bar is the chance of having the item by that try. At 5% per try, 20 tries only gets you to about 64%, and some players will still be empty-handed after 40. A <b>pity</b> counter caps the bad luck: set one and the bars jump to 100% at that try.</p>`,
  uses:[`<b>Balancing drop rates</b>: pick the chance so most players get the item within the playtime you want.`,
        `<b>Pity systems</b> for gacha, crates and rare boss drops.`,
        `<b>Explaining odds</b> in UI: "about 1 in 20 players get this on their first run".`],
  gotchas:[`Independent rolls have no memory. A long losing streak doesn't make the next roll more likely to win, unless you add pity on purpose.`,
           `<code>math.log</code> of 0 is minus infinity. Guard <code>p = 0</code> and <code>p = 1</code> before dividing by logs.`]
});

demo({
  id:'pr-dice', title:'Adding random numbers', short:'2d6 vs 1d12', sig:'sum of several rolls  →  results bunch in the middle',
  view:{theta:0.0, phi:1.25, r:24, ty:3.5}, env:'grid',
  params:[R('count','Dice',1,4,1,2), S('sides','Sides',[['4','4'],['6','6'],['8','8'],['12','12']],'6'), T('cmp','Compare with one big die',true)],
  setup(K){
    const MAX = 48; const bars = Array.from({length:MAX}, ()=>bar(K,'--accent')), ghosts = Array.from({length:MAX}, ()=>wire(K,'--muted'));
    const lMin = K.label('','--muted'), lMax = K.label('','--muted'), lPk = K.label('','--accent','big');
    return {update(p){
      const s = +p.sides, n = p.count; let dist = [1];
      for (let d=0; d<n; d++){ const nd = new Array(dist.length + s).fill(0); dist.forEach((v,i)=>{ for (let k=1;k<=s;k++) nd[i+k] += v/s; }); dist = nd; }
      const top = n*s, uni = 1/top; let peakP = 0, peak = n;
      for (let v=n; v<=top; v++) if (dist[v] > peakP + 1e-12){ peakP = dist[v]; peak = v; }
      const scale = 7/Math.max(peakP, p.cmp ? uni : 0), w = Math.min(0.9, 20/top);
      for (let v=1; v<=MAX; v++){
        const x = -10 + (v-1)/(Math.max(top-1,1))*20, i = v-1, inRange = v<=top;
        bars[i].setBar(x,0,w*0.8, inRange ? (dist[v]||0)*scale : 0);
        ghosts[i].visible = p.cmp && inRange; if (ghosts[i].visible) ghosts[i].setBar(x,0,w*0.85, uni*scale);
      }
      const xOf = v=>-10 + (v-1)/(Math.max(top-1,1))*20;
      lMin.at(V(xOf(n),-0.5,0)).text(String(n)); lMax.at(V(xOf(top),-0.5,0)).text(String(top)); lPk.at(V(xOf(peak), peakP*scale+0.6, 0)).text(`${peak}: ${pct(peakP)}`);
      return {peak, peakP, maxP:dist[top], uni, top};
    }};
  },
  readout:(p,o)=>[['most likely total', `${o.peak} (${pct(o.peakP)})`,'acc'],['chance of max roll', pct(o.maxP,2)],['one big die: each total', pct(o.uni)]],
  code:(p,o)=>`local rng = Random.new()

local function roll(count, sides)
    local total = 0
    for i = 1, count do
        total += rng:NextInteger(1, sides)
    end
    return total
end

local damage = roll(${p.count}, ${p.sides})          -- ${p.count} to ${o.top}, usually around ${o.peak}
local wild   = rng:NextInteger(1, ${o.top})   -- 1 to ${o.top}, every value equally likely`,
  body:`<p>One die is flat: every face is equally likely. Add two together and the middle totals become more common, because there are more ways to make 7 than to make 2 or 12. With three or four dice the bars form a bell shape.</p>
<p>Turn on the comparison to see one big die with the same top value as a flat outline. Both can roll high, but the summed dice almost never do. Game designers use this to make damage feel consistent: <b>2d6</b> rarely surprises you, <b>1d12</b> often does.</p>`,
  uses:[`<b>Damage ranges</b> that feel steady: sum 2 or 3 smaller rolls.`,
        `<b>Rare extremes</b>: a max roll on 4d6 is a real event (0.08%), perfect for a crit.`,
        `<b>Natural-looking variation</b> in stats like NPC height or speed.`],
  gotchas:[`<code>NextInteger(1, 6)</code> includes both 1 and 6. <code>math.random(1, 6)</code> does too.`,
           `Summing rolls changes the shape, not the average: 2d6 and a 2–12 roll both average 7, but the 2–12 roll lands on 2 or 12 far more often.`]
});

demo({
  id:'pr-spread', title:'Bullet spread: flat vs bell', short:'Box–Muller gaussian', sig:'math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)',
  view:{theta:0.35, phi:1.25, r:22, tz:-2, ty:3},
  params:[S('mode','Spread type',[['gauss','Bell curve (gaussian)'],['uniform','Flat (even in circle)']],'gauss'), R('shots','Shots',10,300,10,150), R('spread','Spread size',1,4,0.25,2.5,' studs'), R('seed','Seed',1,99,1,4)],
  setup(K){
    const BZ = -8, BC = V(0,3,BZ);
    const board = K.part(V(9,8,0.2),'--panel',{front:false}); board.position.set(0,3,BZ-0.12);
    const shooter = K.part(V(1.2,2,1)); shooter.position.set(0,1,8);
    K.line('--muted',{dashed:true}).set(V(0,1.6,7.5), BC);
    let rings = [], rkey = -1;
    const mesh = K.add(new THREE.InstancedMesh(G.sphere, K.mat('--accent'), 300)); const dm = new THREE.Matrix4(), q = new THREE.Quaternion();
    let key = '', res = null;
    return {update(p){
      if (rkey !== p.spread){ rkey = p.spread; rings.forEach(r=>K.drop(r)); rings = [p.spread, p.spread/3].map((rad,i)=>{ const r = K.ring(rad, i?'--vb':'--ink',{y:0, dashed:i===1}); r.rotation.x = Math.PI/2; r.position.set(0,3,BZ+0.02); return r; }); }
      const k = [p.mode,p.shots,p.spread,p.seed].join('|');
      if (k !== key){ key = k; const rng = mulberry32(p.seed*7121); let inner = 0, outside = 0;
        for (let i=0;i<p.shots;i++){
          let x, y;
          if (p.mode==='gauss'){ const sg = p.spread/2.5; x = gaussian(rng)*sg; y = gaussian(rng)*sg; }
          else { const a = rng()*Math.PI*2, r = p.spread*Math.sqrt(rng()); x = Math.cos(a)*r; y = Math.sin(a)*r; }
          const d = Math.hypot(x,y); if (d < p.spread/3) inner++; if (d > p.spread) outside++;
          dm.compose(V(x,3+y,BZ+0.08), q, V(0.09,0.09,0.09)); mesh.setMatrixAt(i, dm);
        }
        mesh.count = p.shots; mesh.instanceMatrix.needsUpdate = true; res = {inner:inner/p.shots, outside};
      }
      return res;
    }};
  },
  readout:(p,o)=>[['inside the small ring', pct(o.inner,0),'acc'],['outside the big ring', String(o.outside)+' shots', o.outside?'bad':'']],
  code:(p,o)=>p.mode==='gauss' ? `local rng = Random.new()

local function gaussian()   -- bell curve: mostly near 0, rarely far out
    local u1, u2 = 1 - rng:NextNumber(), rng:NextNumber()
    return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
end

local SPREAD = math.rad(${f(p.spread*0.6,2)})   -- typical miss angle
local aim = CFrame.lookAt(muzzle.Position, mouseHit)
local shot = aim * CFrame.Angles(gaussian() * SPREAD, gaussian() * SPREAD, 0)
local direction = shot.LookVector` : `local rng = Random.new()

local MAX_SPREAD = math.rad(${f(p.spread*1.5,2)})
local angle = rng:NextNumber(0, 2 * math.pi)
local amount = MAX_SPREAD * math.sqrt(rng:NextNumber())   -- sqrt = even over the circle

local aim = CFrame.lookAt(muzzle.Position, mouseHit)
local shot = aim * CFrame.Angles(0, 0, angle) * CFrame.Angles(amount, 0, 0)
local direction = shot.LookVector`,
  body:`<p>A <b>flat</b> spread puts shots anywhere inside a circle with equal chance, which feels random and unfair: as many shots land near the edge as in the centre. A <b>bell-curve</b> (gaussian) spread clusters most shots near the crosshair with a few strays, which is how real recoil and aim wobble feel.</p>
<p>The Box–Muller formula turns two ordinary random numbers into a bell-curve number. Compare the share of shots inside the small ring for each mode. A gaussian has no hard edge, so now and then a shot lands outside the big ring.</p>`,
  uses:[`<b>Gun spread and recoil</b> that rewards aiming at the centre.`,
        `<b>Natural variation</b>: NPC reaction times, tree sizes, enemy stats around an average.`,
        `<b>Particles and debris</b> that bunch around an impact point.`],
  gotchas:[`<code>math.log(0)</code> is minus infinity. Using <code>1 - rng:NextNumber()</code> keeps u1 above zero.`,
           `A gaussian can return very large values (rarely). Clamp it if a shot must never leave a cone.`]
});

demo({
  id:'pr-shuffle', title:'Shuffle bags: no long streaks', short:'Fisher–Yates', sig:'for i = #bag, 2, -1 do  swap(bag[i], bag[rng:NextInteger(1, i)])  end',
  view:{theta:0.0, phi:0.75, r:22, ty:0}, env:'grid',
  params:[R('seed','Seed',1,99,1,12), R('copies','Copies of each item per bag',1,3,1,1)],
  setup(K){
    const N = 32, cols = ['--x','--y','--z','--accent'], mats = cols.map(c=>K.mat(c));
    const mk = z=>Array.from({length:N}, (_,i)=>{ const m = K.add(new THREE.Mesh(G.box, mats[0])); m.scale.set(0.55,0.55,0.55); m.position.set(-10+i*0.65, 0.3, z); return m; });
    const rowA = mk(-1.5), rowB = mk(1.5);
    K.label('pure random','--ink','big').at(V(-11.3,0.3,-1.5)).el.style.translate = '-50% 0'; K.label('shuffle bag','--ink','big').at(V(-11.3,0.3,1.5)).el.style.translate = '-50% 0';
    const la = K.label('','--bad'), lb = K.label('','--ok');
    const streak = seq=>{ let best=1, run=1, at=0; for (let i=1;i<seq.length;i++){ run = seq[i]===seq[i-1] ? run+1 : 1; if (run > best){ best = run; at = i-run+1; } } return {best, at}; };
    const drought = seq=>{ let worst=0; for (let c=0;c<4;c++){ let last=-1; seq.forEach((x,i)=>{ if (x===c){ worst=Math.max(worst, i-last-1); last=i; } }); worst = Math.max(worst, seq.length-1-last); } return worst; };
    return {update(p){
      const rng = mulberry32(p.seed*313);
      const A = Array.from({length:N}, ()=>Math.floor(rng()*4));
      const B = []; let bag = [];
      while (B.length < N){ if (!bag.length){ for (let c=0;c<4;c++) for (let k=0;k<p.copies;k++) bag.push(c); for (let i=bag.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [bag[i],bag[j]]=[bag[j],bag[i]]; } } B.push(bag.pop()); }
      const sA = streak(A), sB = streak(B);
      A.forEach((c,i)=>{ rowA[i].material = mats[c]; rowA[i].position.y = (i>=sA.at && i<sA.at+sA.best && sA.best>1) ? 0.9 : 0.3; });
      B.forEach((c,i)=>{ rowB[i].material = mats[c]; rowB[i].position.y = (i>=sB.at && i<sB.at+sB.best && sB.best>1) ? 0.9 : 0.3; });
      la.at(V(-10+(sA.at+sA.best/2-0.5)*0.65, 1.6, -1.5)).text(`streak of ${sA.best}`); lb.at(V(-10+(sB.at+sB.best/2-0.5)*0.65, 1.6, 1.5)).text(`longest ${sB.best}`);
      return {sA:sA.best, sB:sB.best, dA:drought(A), dB:drought(B)};
    }};
  },
  readout:(p,o)=>[['longest streak: random', String(o.sA),'bad'],['longest streak: bag', String(o.sB),'ok'],['longest wait for an item: random', String(o.dA)],['longest wait: bag', String(o.dB),'acc']],
  code:(p,o)=>`local ITEMS = { "Red", "Green", "Blue", "Gold" }
local COPIES = ${p.copies}
local rng = Random.new()
local bag = {}

local function refill()
    for _, item in ITEMS do
        for _ = 1, COPIES do
            table.insert(bag, item)
        end
    end
    for i = #bag, 2, -1 do                  -- Fisher–Yates shuffle
        local j = rng:NextInteger(1, i)
        bag[i], bag[j] = bag[j], bag[i]
    end
end

local function nextItem()
    if #bag == 0 then refill() end
    return table.remove(bag)              -- each item at least once every ${4*p.copies} picks
end`,
  body:`<p>True randomness has streaks. Picking from four items at random, the same one can come up four or five times in a row, and another can vanish for ages. Players read that as "broken" or "rigged".</p>
<p>A <b>shuffle bag</b> puts every item in a bag, shuffles it and deals them out one by one, then refills. It's still unpredictable, but every item turns up once per bag. Compare the raised blocks (the longest streak) in each row, and try different seeds.</p>
<p>The shuffle itself is <b>Fisher–Yates</b>: walk backwards through the list and swap each spot with a random earlier one.</p>`,
  uses:[`<b>Tetris-style piece order</b>, map rotations and music playlists.`,
        `<b>Fair loot</b>: guarantee each reward shows up within a run.`,
        `<b>Random dialogue</b> that doesn't repeat the same line twice in a row.`],
  gotchas:[`A shuffle that picks <code>j</code> from the whole list each time (instead of 1 to i) gives some orders more often than others.`,
           `More copies per bag makes it feel more random but allows longer streaks.`]
});

demo({
  id:'pr-ev', title:'Expected value: is a crate worth it?', short:'Σ chance × reward', sig:'expected value = Σ (chance × reward)',
  view:{theta:0.0, phi:1.3, r:24, ty:3.5}, env:'grid',
  params:[R('jp','Jackpot chance',0.5,10,0.5,2,'%'), R('cost','Crate price',10,80,1,30,' coins'), S('opens','Crates opened',[['50','50'],['200','200'],['1000','1,000']],'200'), R('seed','Seed',1,99,1,3)],
  setup(K){
    const avg = K.line('--va',{max:401}), evL = K.line('--accent',{dashed:true}), costL = K.line('--bad');
    K.line('--muted').set(V(-10,0,0),V(10,0,0)); K.line('--muted').set(V(-10,0,0),V(-10,8,0));
    const lev = K.label('','--accent','big'), lc = K.label('','--bad','big'), la = K.label('running average','--va'), lx = K.label('','--muted');
    let key='', res=null;
    return {update(p){
      const k = [p.jp,p.cost,p.opens,p.seed].join('|');
      if (k !== key){ key = k;
        const pj = p.jp/100, table = [[10, 0.75-pj],[50,0.25],[500,pj]], ev = table.reduce((s,[v,c])=>s+v*c,0);
        const n = +p.opens, rng = mulberry32(p.seed*577); let sum = 0; const avgs = [];
        for (let i=1;i<=n;i++){ let r = rng(), v = 10; if (r < pj) v = 500; else if (r < pj+0.25) v = 50; sum += v; avgs.push(sum/i); }
        const top = Math.max(ev, p.cost) * 2.2, y = a=>Math.min(8, a/top*8);
        const pts = []; const stepN = Math.max(1, Math.floor(n/400)); for (let i=0;i<n;i+=stepN) pts.push(V(-10 + i/(n-1)*20, y(avgs[i]), 0)); avg.set(pts);
        evL.set(V(-10,y(ev),0), V(10,y(ev),0)); costL.set(V(-10,y(p.cost),0), V(10,y(p.cost),0));
        lev.at(V(10.6,y(ev),0)).text(`EV ${f(ev,1)}`); lev.el.style.translate = '50% 0'; lc.at(V(10.6,y(p.cost),0)).text(`price ${p.cost}`); lc.el.style.translate = '50% 0';
        la.at(pts[Math.min(pts.length-1, 6)].clone().add(V(0,0.6,0))); lx.at(V(0,-0.6,0)).text(`crates 1 → ${n}`);
        res = {ev, final:avgs[n-1], table};
      }
      return res;
    }};
  },
  readout:(p,o)=>[['expected value', f(o.ev,1)+' coins','acc'],['player gains per crate', f(o.ev - p.cost,1), o.ev >= p.cost ? 'ok' : 'bad'],['average after '+p.opens, f(o.final,1)]],
  code:(p,o)=>`local REWARDS = {
    { amount = 10,  chance = ${f(o.table[0][1],3)} },
    { amount = 50,  chance = 0.25 },
    { amount = 500, chance = ${f(o.table[2][1],3)} },   -- jackpot
}

local expected = 0
for _, reward in REWARDS do
    expected += reward.amount * reward.chance
end
print(expected)   --> ${f(o.ev,2)} coins per crate on average

local PRICE = ${p.cost}
print(expected - PRICE)   --> ${f(o.ev - p.cost,2)}  (${o.ev >= p.cost ? 'players come out ahead' : 'the crate is a coin sink'})`,
  body:`<p>Expected value is the <b>average result per try</b> over the long run: multiply each reward by its chance and add them up. It tells you whether a crate, gamble or upgrade gives back more than it costs, before anyone opens one.</p>
<p>The teal line is the running average as crates are opened. Early on it swings wildly, especially when a jackpot lands. Over many crates it settles onto the orange EV line. If EV is below the red price line, players lose coins on average and the crate drains your economy.</p>`,
  uses:[`<b>Economy balancing</b>: make sure crates, spins and upgrades don't print or burn money by accident.`,
        `<b>Comparing options</b>: a safe 40 coins vs a 10% shot at 500 (EV 50).`,
        `<b>Setting prices</b> so a reward feels worth it without breaking progression.`],
  gotchas:[`EV only describes the long run. A single player can be far above or below it, which is why rare jackpots feel exciting and unfair at the same time.`,
           `Make sure the chances add up to exactly 1, or the EV is wrong.`]
});

demo({
  id:'m-random', title:'Random spawn points', short:'Random.new(seed)', sig:'Random.new(seed):NextNumber(min, max)  →  number',
  view:{theta:0.2, phi:0.45, r:26, ty:0},
  params:[R('count','Count',5,200,5,120), R('radius','Area radius',2,10,0.5,8), R('seed','Seed',1,99,1,7), S('shape','Method',[['sqrt','Circle with math.sqrt (even)'],['naive','Circle, plain random radius'],['square','Square (x and z)']],'sqrt')],
  setup(K){
    const mesh = K.add(new THREE.InstancedMesh(G.box, K.mat('--accent'), 200));
    const dm = new THREE.Matrix4();
    let outline = null, inner = null, okey='', key='', res = null;
    return {update(p){
      const k = p.radius+'|'+p.shape;
      if (k !== okey){ okey = k; K.drop(outline); K.drop(inner); inner = null;
        if (p.shape==='square'){ const r=p.radius; outline = K.line('--muted',{max:5}); outline.set(V(-r,0.03,-r),V(r,0.03,-r),V(r,0.03,r),V(-r,0.03,r),V(-r,0.03,-r)); }
        else { outline = K.ring(p.radius,'--muted',{y:0.03}); inner = K.ring(p.radius/2,'--vb',{y:0.03, dashed:true}); }
      }
      const k2 = [p.count,p.radius,p.seed,p.shape].join('|');
      if (k2 !== key){ key = k2; const rng = mulberry32(p.seed*7919); let inside = 0;
        for (let i=0;i<p.count;i++){
          let x, z;
          if (p.shape==='square'){ x = (rng()*2-1)*p.radius; z = (rng()*2-1)*p.radius; }
          else { const a = rng()*Math.PI*2, u = rng(), r = p.radius*(p.shape==='sqrt'?Math.sqrt(u):u); x = Math.cos(a)*r; z = Math.sin(a)*r; if (r < p.radius/2) inside++; }
          dm.compose(V(x,0.2,z), new THREE.Quaternion().setFromAxisAngle(UP, rng()*6), V(0.4,0.4,0.4)); mesh.setMatrixAt(i, dm);
        }
        mesh.count = p.count; mesh.instanceMatrix.needsUpdate = true; res = {inside, frac: p.count ? inside/p.count : 0};
      }
      return res;
    }};
  },
  readout:(p,o)=> p.shape==='square' ? [['points', String(p.count)],['seed', String(p.seed)]] :
    [['inside dashed ring', f(o.frac*100,0)+'%', p.shape==='sqrt'?'ok':'bad'],['even spread would be', '25%']],
  code:(p,o)=> p.shape==='square' ? `local rng = Random.new(${p.seed})      -- same seed → same layout every time
local SIZE = ${f(p.radius)}

for i = 1, ${p.count} do
    local x = rng:NextNumber(-SIZE, SIZE)
    local z = rng:NextNumber(-SIZE, SIZE)
    spawnCoin(center + Vector3.new(x, 0, z))
end` : `local rng = Random.new(${p.seed})      -- same seed → same layout every time
local RADIUS = ${f(p.radius)}

for i = 1, ${p.count} do
    local angle = rng:NextNumber(0, 2 * math.pi)
    local r = RADIUS * ${p.shape==='sqrt' ? 'math.sqrt(rng:NextNumber())   -- sqrt spreads them evenly' : 'rng:NextNumber()   -- bunches up in the middle!'}
    spawnCoin(center + Vector3.new(math.cos(angle) * r, 0, math.sin(angle) * r))
end`,
  body:`<p><code>math.random()</code> gives a number from 0 to 1, and <code>math.random(1, 6)</code> a whole number from 1 to 6. <code>Random.new(seed)</code> is a generator object: give it the same seed and it repeats the same sequence, which is handy for testing or for maps every player should see the same way.</p>
<p>Scattering points in a circle has a classic trap. Switch to <i>plain random radius</i>: points crowd the middle, with about half inside the dashed ring that covers only a quarter of the area. Taking <code>math.sqrt</code> of the random number fixes it, and the share inside drops to about 25%.</p>`,
  uses:[`<b>Loot and coin spawns</b> scattered around an area.`,
        `<b>Random NPC wander targets</b> within a radius of their home.`,
        `<b>Procedural maps</b> that need to be the same each time: store the seed instead of the whole map.`],
  gotchas:[`<code>math.random(1, 10)</code> returns whole numbers only. For decimals, use <code>rng:NextNumber(min, max)</code>.`,
           `Picking from a list: <code>list[math.random(1, #list)]</code>.`,
           `For a uniform direction in 3D, <code>rng:NextUnitVector()</code> does it for you.`]
});

{
function prdStats(C, maxN=200){
  let survive = 1, E = 0; const dist = [];
  for (let n=1; n<=maxN && survive > 1e-12; n++){ const pn = Math.min(1, C*n), pf = survive*pn; dist[n] = pf; E += n*pf; survive *= 1-pn; }
  return {E, dist};
}
function prdC(p){ let lo = 0, hi = p; for (let i=0;i<60;i++){ const mid=(lo+hi)/2; if (1/prdStats(mid).E < p) lo = mid; else hi = mid; } return (lo+hi)/2; }

demo({
  id:'pr-prd', title:'Rising chance: fairer crits', short:'chance = C × misses', sig:'chance this hit = C × (hits since last success)',
  view:{theta:0.0, phi:1.25, r:24, ty:3.5}, env:'grid',
  params:[R('p','Average crit chance',5,50,1,25,'%'), T('cmp','Compare with pure random',true)],
  setup(K){
    const N = 20; const a = Array.from({length:N}, ()=>bar(K,'--accent')), b = Array.from({length:N}, ()=>bar(K,'--part'));
    K.label('1 hit','--muted').at(V(-9.5,-0.5,0)); K.label('20 hits','--muted').at(V(9.5,-0.5,0)); K.label('how many hits until the next crit','--muted').at(V(0,-1.2,0));
    const la = K.label('rising chance','--accent','big'), lb = K.label('pure random','--muted','big');
    return {update(p){
      const q = p.p/100, Cc = prdC(q), {dist} = prdStats(Cc); let mx = 0;
      const geo = n=>Math.pow(1-q,n-1)*q;
      for (let n=1;n<=N;n++) mx = Math.max(mx, dist[n]||0, p.cmp ? geo(n) : 0);
      for (let n=1;n<=N;n++){ const x = -9.5 + (n-1); a[n-1].setBar(x+0.18,0,0.34,(dist[n]||0)/mx*7); b[n-1].setBar(x-0.18,0,0.34,p.cmp ? geo(n)/mx*7 : 0); }
      const peak = dist.reduce((bi,v,i)=>v>(dist[bi]||0)?i:bi,1);
      la.at(V(-9.5+peak-1, (dist[peak]/mx)*7+0.7, 0)); lb.show(p.cmp).at(V(-9.5-0.18, geo(1)/mx*7+0.7, 0));
      let surv = 1; for (let n=1;n<=10;n++) surv *= 1 - Math.min(1, Cc*n);
      return {Cc, maxGap:Math.ceil(1/Cc), r10:Math.pow(1-q,10), p10:surv};
    }};
  },
  readout:(p,o)=>[['C', f(o.Cc,4),'acc'],['most hits without a crit', `${o.maxGap} (random: unlimited)`],['10 misses in a row: random', f(o.r10*100,2)+'%','bad'],['10 misses in a row: rising', f(o.p10*100,4)+'%','ok']],
  code:(p,o)=>`local C = ${f(o.Cc,5)}   -- tuned so crits still average ${p.p}%
local rng = Random.new()
local hitsSinceCrit = 0

local function rollCrit()
    hitsSinceCrit += 1
    if rng:NextNumber() < C * hitsSinceCrit then
        hitsSinceCrit = 0
        return true
    end
    return false
end
-- chance goes ${f(o.Cc*100,1)}%, ${f(o.Cc*200,1)}%, ${f(o.Cc*300,1)}%... and is guaranteed by hit ${o.maxGap}`,
  body:`<p>With a plain ${'25%'} crit, a player can go ten or more hits without one, and sometimes gets three in a row. Both feel bad. A <b>rising chance</b> starts low and grows a little with every miss, then resets when it lands.</p>
<p>The bars show how many hits it takes to get the next crit. Pure random (grey) is spread out with a long tail. The rising version (orange) bunches up around the average and has a hard limit. The constant <code>C</code> is solved so the overall crit rate stays exactly the same; only the streaks change.</p>`,
  uses:[`<b>Critical hits, dodges and procs</b> in RPGs and fighting games.`,
        `<b>Rare drops</b> that feel fair without a visible pity counter.`,
        `<b>Random events</b> like weather that shouldn't repeat too soon.`],
  gotchas:[`Don't use the average chance as C. The rising version must start much lower to keep the same average.`,
           `Track the counter per player and per ability, on the server.`]
});

demo({
  id:'pr-events', title:'Random events per second', short:'1 − math.exp(−rate · dt)', sig:'chance this frame = 1 - math.exp(-eventsPerSecond * dt)',
  view:{theta:0.0, phi:0.7, r:22, ty:0}, env:'grid',
  params:[R('rate','Events per second',0.1,2,0.05,0.6), R('seed','Seed',1,99,1,5)],
  setup(K){
    const mesh = K.add(new THREE.InstancedMesh(G.box, new THREE.MeshLambertMaterial({color:0xffffff}), 600)); const dm = new THREE.Matrix4(), q = new THREE.Quaternion();
    const rows = [['fixed chance @ 60 FPS',60,false,-3,'--bad'],['fixed chance @ 15 FPS',15,false,-1,'--bad'],['math.exp @ 60 FPS',60,true,1,'--accent'],['math.exp @ 15 FPS',15,true,3,'--accent']];
    rows.forEach(r=>{ K.label(r[0], r[4], 'big').at(V(-10.6, 0.3, r[3])).el.style.translate = '-50% 0'; K.line('--muted',{opacity:0.5}).set(V(-10,0.02,r[3]),V(10,0.02,r[3])); });
    const cnt = rows.map(r=>K.label('','--ink').at(V(10.8,0.3,r[3])));
    cnt.forEach(L=>L.el.style.translate = '50% 0');
    K.label('0 s','--muted').at(V(-10,0.2,4.4)); K.label('20 s','--muted').at(V(10,0.2,4.4));
    let key = '', res = null;
    return {update(p){
      const k = p.rate+'|'+p.seed; if (k !== key){ key = k; let n = 0; const counts = [];
        rows.forEach(([, fps, good, z, col], ri)=>{ const rng = mulberry32(p.seed*733 + ri*17), dt = 1/fps, ch = good ? 1-Math.exp(-p.rate*dt) : 1-Math.exp(-p.rate/60); let c = 0;
          for (let i=0;i<20*fps;i++){ if (rng() < ch && n < 600){ dm.compose(V(-10 + i*dt, 0.3, z), q, V(0.18,0.6,0.6)); mesh.setMatrixAt(n, dm); mesh.setColorAt(n, C(col)); n++; c++; } }
          counts.push(c); cnt[ri].text(String(c)); });
        mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; res = {counts};
      }
      return res;
    }};
  },
  readout:(p,o)=>[['expected in 20 s', f(p.rate*20,1)],['fixed chance: 60 / 15 FPS', `${o.counts[0]} / ${o.counts[1]}`,'bad'],['math.exp: 60 / 15 FPS', `${o.counts[2]} / ${o.counts[3]}`,'ok']],
  code:(p,o)=>`local EVENTS_PER_SECOND = ${f(p.rate)}   -- about ${f(p.rate*20,0)} every 20 seconds
local rng = Random.new()

RunService.Heartbeat:Connect(function(dt)
    local chance = 1 - math.exp(-EVENTS_PER_SECOND * dt)   -- adjusts to the frame time
    if rng:NextNumber() < chance then
        spawnMeteor()
    end
end)

-- the bug: a fixed chance per frame
-- if rng:NextNumber() < ${f(1-Math.exp(-p.rate/60),4)} then ... end
-- happens 4x less often for a player at 15 FPS than at 60 FPS`,
  body:`<p>"A 1% chance every frame" sounds fine until you remember frames don't come at a steady rate. A player at 60 FPS rolls four times as often as one at 15 FPS, so they see four times as many events. Roblox servers also run at their own rate.</p>
<p>Describe the event as a <b>rate</b> (so many per second) and convert it to a per-frame chance with <code>1 - math.exp(-rate * dt)</code>. Each row shows 20 seconds of events. The fixed-chance rows (red) disagree; the <code>math.exp</code> rows (orange) match each other and the expected count.</p>`,
  uses:[`<b>Ambient events</b>: meteors, lightning, birds, random NPC chatter.`,
        `<b>Status effects</b> like "10% chance per second to take burn damage".`,
        `<b>Spawners</b> that should average a set number of spawns per minute.`],
  gotchas:[`For events on a schedule, use a timer instead (<code>task.wait(5)</code>). Random rates are for things that should feel unpredictable.`,
           `For very small <code>rate * dt</code>, the chance is almost exactly <code>rate * dt</code>, but <code>math.exp</code> stays correct at low frame rates too.`]
});
}

{
demo({
  id:'pr-montecarlo', adv:true, title:'Monte Carlo: answer by simulating', short:'run it many times, count', sig:'chance ≈ successes / trials   (error shrinks like 1 / √trials)',
  view:{theta:0.0, phi:0.8, r:28, ty:2, tz:-2}, env:'grid',
  params:[S('n','Random points',[['50','50'],['200','200'],['1000','1,000'],['5000','5,000']],'1000'), R('seed','Seed',1,99,1,7)],
  setup(K){
    const S2 = 7, mesh = K.add(new THREE.InstancedMesh(G.box, new THREE.MeshLambertMaterial({color:0xffffff}), 5000)); const dm = new THREE.Matrix4(), q = new THREE.Quaternion();
    const sq = K.line('--muted',{max:5}); sq.set(V(-S2,0.03,-S2+2),V(S2,0.03,-S2+2),V(S2,0.03,S2+2),V(-S2,0.03,S2+2),V(-S2,0.03,-S2+2));
    const ring = K.ring(S2,'--accent',{y:0.04}); ring.position.z = 2;
    const plot = K.line('--va',{max:401}), piL = K.line('--accent',{dashed:true}); const Z = -9;
    K.label('estimate as points are added','--muted').at(V(0,7.5,Z)); const le = K.label('','--va','big'), lp = K.label('π = 3.1416','--accent');
    let key = '', res = null; const cIn = C('--accent'), cOut = C('--part');
    return {update(p){
      const k = p.n+'|'+p.seed; if (k !== key){ key = k; const n = +p.n, rng = mulberry32(p.seed*977); let inside = 0; const est = [];
        for (let i=0;i<n;i++){ const x = rng()*2-1, z = rng()*2-1, inn = x*x+z*z <= 1; if (inn) inside++; dm.compose(V(x*S2,0.12,z*S2+2), q, V(0.12,0.12,0.12)); mesh.setMatrixAt(i, dm); mesh.setColorAt(i, inn ? cIn : cOut); est.push(4*inside/(i+1)); }
        mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        const y = e=>4 + (e - Math.PI)*3, step = Math.max(1, Math.floor(n/400)), pts = [];
        for (let i=0;i<n;i+=step) pts.push(V(-10 + i/(n-1)*20, Math.max(0.2, Math.min(7, y(est[i]))), Z)); plot.set(pts);
        piL.set(V(-10,4,Z), V(10,4,Z)); lp.at(V(11.5,4,Z)); le.at(V(10,Math.max(0.6,Math.min(7.4,y(est[n-1])+0.6)),Z)).text(f(est[n-1],4));
        res = {est:est[n-1], inside, n};
      }
      return res;
    }};
  },
  readout:(p,o)=>[['inside the circle', `${o.inside} of ${o.n}`],['estimate 4 × inside / total', f(o.est,4),'acc'],['error', f(Math.abs(o.est-Math.PI),4)],['typical error at this size', '±'+f(1.64/Math.sqrt(o.n),3)]],
  code:(p,o)=>`-- the classic: estimate pi from random points in a square
local rng = Random.new(${p.seed})
local inside = 0
for i = 1, ${p.n} do
    local x, z = rng:NextNumber(-1, 1), rng:NextNumber(-1, 1)
    if x * x + z * z <= 1 then inside += 1 end
end
print(4 * inside / ${p.n})   --> ${f(o.est,4)}

-- the useful version: estimate a game chance that's hard to work out by hand
local function playerSurvivesWave()
    local hp = 100
    for _ = 1, 5 do                                  -- 5 enemies attack
        if rng:NextNumber() < 0.3 then               -- 30% hit chance
            hp -= rng:NextInteger(15, 30)            -- random damage
        end
    end
    return hp > 0
end

local wins, TRIALS = 0, 10000
for _ = 1, TRIALS do
    if playerSurvivesWave() then wins += 1 end
end
print(("survives %.1f%% of waves"):format(wins / TRIALS * 100))`,
  body:`<p>Some chances are too tangled to work out on paper: crits, random damage, several enemies, abilities with cooldowns. <b>Monte Carlo</b> simulation skips the maths: play the situation thousands of times with real random numbers and count how often each outcome happens.</p>
<p>The demo estimates π: the circle covers π/4 of the square, so 4 × (points inside ÷ all points) approaches π. Watch the plot settle as points are added. The error only shrinks with the <b>square root</b> of the trials, so 100 times more points gives about 10 times more accuracy.</p>`,
  uses:[`<b>Balancing fights</b>: how often does a level-5 player survive this wave?`,
        `<b>Checking loot and economy changes</b> before players see them.`,
        `<b>Testing AI and procedural generation</b>: how often does the map generator make a dead end?`],
  gotchas:[`Run big simulations in Studio's command bar or a test script, not in live game code.`,
           `A few hundred trials is only good to a few percent. Use thousands before trusting small differences.`]
});
}
})();
