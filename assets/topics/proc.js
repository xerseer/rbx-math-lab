(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, CF, G, R, S, T, clamp, noise, mulberry32} = Lab;
const {inst, labels, rng} = Lab.kit2;
const demo = Lab.subject({
  id:'proc', title:'Procedural generation', glyph:'mountain', level:'Advanced',
  blurb:'Layered noise, ridges and terraces, domain warping, Voronoi cells, Poisson discs, cave automata, random walks, islands and L-system trees.'
});
const N = 34, CELL = 0.7;
const PAL = [[0,'#2f6fd6'],[0.32,'#4c8fe0'],[0.36,'#e4d19a'],[0.42,'#5fae4f'],[0.66,'#3f7f3a'],[0.78,'#8a8a8a'],[0.9,'#f2f2f2']].map(([t,h])=>[t,new THREE.Color(h)]);
function terrainColor(h){ h = clamp(h,0,1); for (let i=0;i<PAL.length-1;i++){ if (h <= PAL[i+1][0]) return PAL[i][1].clone().lerp(PAL[i+1][1], (h - PAL[i][0])/(PAL[i+1][0]-PAL[i][0])); } return PAL[PAL.length-1][1].clone(); }
function heightmap(K){ const cols = inst(K, N*N);
  return {draw(fn, amp=7){ cols.begin(); for (let z=0;z<N;z++) for (let x=0;x<N;x++){ const h = clamp(fn(x,z),0,1), y = Math.max(0.1, h*amp); cols.add(V((x-N/2+0.5)*CELL, y/2, (z-N/2+0.5)*CELL), V(CELL*0.98, y, CELL*0.98), terrainColor(h)); } cols.end(); }}; }
const n01 = (x,z,s)=>0.5 + 0.5*noise(x, z, s)*1.4;
function fbm(x, z, o){ let a = 1, fr = 1, sum = 0, norm = 0; for (let i=0;i<o.oct;i++){ sum += a*noise(x*fr, z*fr, o.seed + i*17.3); norm += a; a *= o.pers; fr *= o.lac; } return sum/norm; }

demo({
  id:'pg-fbm', title:'Layered noise (fBm)', short:'octaves × lacunarity × persistence', sig:'Σ amplitudeᵢ · noise(p · frequencyᵢ),  frequency × lacunarity, amplitude × persistence',
  view:{theta:0.7, phi:0.85, r:30, ty:0}, env:'none',
  params:[R('oct','Octaves',1,6,1,4), R('lac','Lacunarity',1.5,3,0.1,2), R('pers','Persistence',0.2,0.8,0.05,0.5), R('scale','Base scale',0.02,0.2,0.005,0.07), R('seed','Seed',0,50,1,4)],
  setup(K){ const hm = heightmap(K); let key = '';
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; hm.draw((x,z)=>0.5 + 0.75*fbm(x*p.scale + 0.31, z*p.scale + 0.47, {oct:p.oct, lac:p.lac, pers:p.pers, seed:p.seed})); } return {}; }};
  },
  readout:(p)=>[['octaves', String(p.oct)],['finest detail frequency', '×'+f(Math.pow(p.lac,p.oct-1),1),'acc'],['finest detail strength', '×'+f(Math.pow(p.pers,p.oct-1),3)]],
  code:(p)=>`local OCTAVES, LACUNARITY, PERSISTENCE, SCALE = ${p.oct}, ${p.lac}, ${p.pers}, ${p.scale}

local function fbm(x, z, seed)
    local amplitude, frequency, total, norm = 1, 1, 0, 0
    for i = 1, OCTAVES do
        total += amplitude * math.noise(x * frequency, z * frequency, seed + i * 17.3)
        norm += amplitude
        amplitude *= PERSISTENCE        -- each layer is weaker...
        frequency *= LACUNARITY         -- ...and more detailed
    end
    return total / norm                  -- about -0.5..0.5
end

local h = fbm(x * SCALE, z * SCALE, ${p.seed})`,
  body:`<p>A single layer of noise gives smooth, boring blobs. Real terrain has big mountains <i>and</i> small bumps. <b>Fractal Brownian motion</b> (fBm) adds several layers, called <b>octaves</b>: each one more zoomed out (higher frequency, set by <b>lacunarity</b>) and weaker (lower amplitude, set by <b>persistence</b>).</p>
<p>Start with 1 octave and add more: the coastline and hills gain detail at every step. Higher persistence makes it rougher; lower keeps it smooth with only a little grain.</p>`,
  uses:[`<b>Terrain and island heightmaps.</b>`,`<b>Clouds, fog and texture variation.</b>`,`<b>Organic randomness</b> anywhere: wind gusts, ore placement.`],
  gotchas:[`Each octave costs another noise call. 4 to 6 octaves is plenty for most terrain.`,`Offset each octave's input (the seed term) so layers don't line up.`]
});

demo({
  id:'pg-ridged', title:'Ridges and terraces', short:'1 − |noise|,  floor(h × steps) / steps', sig:'ridged = 1 − |n|   ·   terraced = math.floor(h * STEPS) / STEPS',
  view:{theta:0.7, phi:0.85, r:30, ty:0}, env:'none',
  params:[S('mode','Shape',[['ridged','Ridged mountains'],['billow','Billowy hills (|n|)'],['plain','Plain fBm']],'ridged'), R('steps','Terrace steps (0 = off)',0,12,1,0), R('scale','Scale',0.03,0.15,0.005,0.07)],
  setup(K){ const hm = heightmap(K); let key = '';
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; hm.draw((x,z)=>{ let a = 1, fr = 1, s = 0, nm = 0; for (let i=0;i<4;i++){ let n = noise(x*p.scale*fr + 0.3, z*p.scale*fr + 0.7, 5 + i*11); n = clamp(n*1.6,-1,1);
        const v = p.mode==='ridged' ? (1 - Math.abs(n))*(1 - Math.abs(n)) : p.mode==='billow' ? Math.abs(n) : 0.5 + 0.5*n; s += a*v; nm += a; a *= 0.5; fr *= 2; }
        let h = s/nm; if (p.mode==='ridged') h = h*1.1 - 0.1; if (p.steps > 0) h = Math.floor(h*p.steps)/p.steps; return h; }); } return {}; }};
  },
  readout:(p)=>[['shape', p.mode],['terraces', p.steps ? String(p.steps) : 'off','acc']],
  code:(p)=>`local n = math.noise(x * ${p.scale}, z * ${p.scale}, seed)
${p.mode==='ridged' ? 'local h = 1 - math.abs(n)         -- sharp crests where the noise crosses 0\nh = h * h                         -- sharpen' : p.mode==='billow' ? 'local h = math.abs(n)             -- round hills with sharp valleys' : 'local h = 0.5 + 0.5 * n'}
${p.steps ? `h = math.floor(h * ${p.steps}) / ${p.steps}      -- flat terraces, like rice fields or mesas` : '-- terraces: h = math.floor(h * STEPS) / STEPS'}`,
  body:`<p>Simple tweaks to noise give completely different landscapes. Taking <code>1 − |n|</code> turns every place the noise crosses zero into a sharp <b>ridge</b>, which looks like mountain ranges. Plain <code>|n|</code> does the opposite: rounded hills with creased valleys.</p>
<p><b>Terracing</b> rounds heights down to steps, making flat plateaus like mesas, rice fields or a blocky voxel look. Try ridged with 6 terraces.</p>`,
  uses:[`<b>Mountain ranges</b> (ridged), dunes and rolling hills (billow).`,`<b>Voxel and blocky worlds</b> (terraces).`,`<b>Canyons</b>: invert ridged noise.`],
  gotchas:[`Ridged noise looks best layered (fBm), with the ridge applied to each octave.`]
});

demo({
  id:'pg-warp', title:'Domain warping', short:'noise(p + noise(p))', sig:'h = noise(x + k·noise(x, z, a),  z + k·noise(x, z, b))',
  view:{theta:0.7, phi:0.85, r:30, ty:0}, env:'none',
  params:[R('k','Warp strength',0,6,0.1,2.5), R('wscale','Warp scale',0.02,0.15,0.005,0.05), R('seed','Seed',0,40,1,2)],
  setup(K){ const hm = heightmap(K); let key = '';
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; hm.draw((x,z)=>{ const wx = noise(x*p.wscale+0.1, z*p.wscale+0.2, p.seed+1)*p.k, wz = noise(x*p.wscale+0.5, z*p.wscale+0.9, p.seed+2)*p.k;
        return 0.5 + 0.75*fbm((x*0.07 + wx) + 0.31, (z*0.07 + wz) + 0.47, {oct:4, lac:2, pers:0.5, seed:p.seed}); }); } return {}; }};
  },
  readout:(p)=>[['warp strength', f(p.k,1),'acc']],
  code:(p)=>`local K, WARP_SCALE = ${p.k}, ${p.wscale}

local function warped(x, z, seed)
    -- move the sample point by another noise before reading the terrain noise
    local wx = math.noise(x * WARP_SCALE, z * WARP_SCALE, seed + 1) * K
    local wz = math.noise(x * WARP_SCALE, z * WARP_SCALE, seed + 2) * K
    return fbm(x * 0.07 + wx, z * 0.07 + wz, seed)
end`,
  body:`<p>Domain warping bends space before you read the noise. Instead of sampling the terrain at (x, z), you sample it at a point nudged by <i>another</i> noise. Straight, blobby shapes get dragged into swirls, which looks like rock that's flowed, or coastlines shaped by erosion.</p>
<p>Set the strength to 0 for plain fBm, then raise it: features stretch and curl. The warp scale controls how big the swirls are.</p>`,
  uses:[`<b>Natural-looking coastlines and rivers.</b>`,`<b>Marble, wood grain and lava textures.</b>`,`<b>Alien landscapes</b> with flowing shapes.`],
  gotchas:[`Warping costs extra noise calls per sample. Cache results when generating big maps.`]
});

demo({
  id:'pg-voronoi', title:'Voronoi cells (Worley)', short:'nearest seed point wins', sig:'cell = the seed with the smallest distance   ·   edge = d₂ − d₁ small',
  view:{theta:0.0, phi:0.45, r:28, ty:0}, env:'none',
  params:[R('n','Seed points',3,30,1,14), R('seed','Seed',1,60,1,8), T('edges','Show borders (d₂ − d₁)',true), S('metric','Distance',[['euc','Euclidean'],['man','Manhattan']],'euc')],
  setup(K){ const M = 44, cs = 0.5, cells = inst(K, M*M), dots = inst(K, 30, {geo:G.sphere}); let key = '';
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; const r = mulberry32(p.seed*29), pts = Array.from({length:p.n}, ()=>[r()*M, r()*M]), cols = pts.map((_,i)=>new THREE.Color().setHSL((i*0.618)%1, 0.55, 0.55));
        const d = (ax,az,bx,bz)=>p.metric==='euc' ? Math.hypot(ax-bx,az-bz) : Math.abs(ax-bx)+Math.abs(az-bz);
        cells.begin(); for (let z=0;z<M;z++) for (let x=0;x<M;x++){ let d1 = 1e9, d2 = 1e9, bi = 0; pts.forEach(([px,pz],i)=>{ const dd = d(x+0.5,z+0.5,px,pz); if (dd < d1){ d2 = d1; d1 = dd; bi = i; } else if (dd < d2) d2 = dd; });
          const edge = p.edges && d2 - d1 < 1.1; cells.add(V((x-M/2+0.5)*cs, 0.1, (z-M/2+0.5)*cs), V(cs*0.98, 0.2, cs*0.98), edge ? C('--ink') : cols[bi]); } cells.end();
        dots.begin(); pts.forEach(([px,pz])=>dots.add(V((px-M/2)*cs, 0.4, (pz-M/2)*cs), 0.22, '--ink')); dots.end(); }
      return {}; }};
  },
  readout:(p)=>[['regions', String(p.n),'acc'],['distance', p.metric==='euc' ? 'Euclidean (round borders)' : 'Manhattan (diagonal borders)']],
  code:(p)=>`local seeds = {}                                   -- ${p.n} random points = ${p.n} regions
local rng = Random.new(${p.seed})
for i = 1, ${p.n} do
    seeds[i] = Vector2.new(rng:NextNumber(0, SIZE), rng:NextNumber(0, SIZE))
end

local function regionAt(x, z)
    local best, d1, d2 = 1, math.huge, math.huge
    for i, s in seeds do
        local d = ${p.metric==='euc' ? '(Vector2.new(x, z) - s).Magnitude' : 'math.abs(x - s.X) + math.abs(z - s.Y)'}
        if d < d1 then d2, d1, best = d1, d, i elseif d < d2 then d2 = d end
    end
    return best, d2 - d1          -- region id, and how close to a border
end`,
  body:`<p>Scatter some seed points; every location belongs to whichever seed is <b>closest</b>. The result is a map of cells like cracked mud, giraffe patches or territories. That's a <b>Voronoi diagram</b>, also called Worley or cellular noise.</p>
<p>Tracking the nearest <i>and</i> second-nearest distances gives a bonus: where they're almost equal, you're on a <b>border</b>. Switch to Manhattan distance and the borders turn diagonal.</p>`,
  uses:[`<b>Biomes and countries</b> on a world map.`,`<b>Cracks, stones, cells and scales</b> as patterns.`,`<b>Nearest-base or nearest-spawn regions.</b>`],
  gotchas:[`Checking every seed for every cell is slow for big maps. Put seeds in a grid and only check nearby cells (see Spatial partitioning).`]
});

demo({
  id:'pg-poisson', title:'Poisson disc sampling', short:'random, but never too close', sig:'try a random spot; keep it only if no point is within r',
  view:{theta:0.3, phi:0.6, r:26, ty:0}, env:'grid',
  params:[S('mode','Method',[['poisson','Poisson disc (min distance)'],['random','Plain random']],'poisson'), R('r','Minimum spacing',0.8,4,0.1,1.8), R('count','Target count',10,200,5,120), R('seed','Seed',1,60,1,6)],
  setup(K){ const trees = inst(K, 220, {geo:new THREE.ConeGeometry(0.5,1.6,8)}), trunks = inst(K, 220); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; const r = mulberry32(p.seed*53), pts = [], S2 = 9; let attempts = 0;
        while (pts.length < p.count && attempts < p.count*40){ attempts++; const x = (r()*2-1)*S2, z = (r()*2-1)*S2; if (p.mode==='random' || pts.every(([a,b])=>(a-x)*(a-x)+(b-z)*(b-z) >= p.r*p.r)) pts.push([x,z]); }
        let minD = Infinity; pts.forEach(([a,b],i)=>pts.forEach(([c,d],j)=>{ if (i<j) minD = Math.min(minD, Math.hypot(a-c,b-d)); }));
        trees.begin(); trunks.begin(); pts.forEach(([x,z])=>{ trees.add(V(x,1.3,z), 1, '--y'); trunks.add(V(x,0.25,z), V(0.2,0.5,0.2), '--part'); }); trees.end(); trunks.end(); res = {n:pts.length, minD, attempts}; }
      return res; }};
  },
  readout:(p,o)=>[['trees placed', String(o.n),'acc'],['closest pair', f(o.minD,2)+' studs', o.minD < p.r*0.99 ? 'bad' : 'ok'],['attempts', String(o.attempts)]],
  code:(p,o)=>`local R, TARGET, MAX_TRIES = ${p.r}, ${p.count}, ${p.count * 40}
local rng = Random.new(${p.seed})
local points = {}

for _ = 1, MAX_TRIES do
    if #points >= TARGET then break end
    local candidate = Vector2.new(rng:NextNumber(-9, 9), rng:NextNumber(-9, 9))
    local ok = true
    for _, p in points do
        if (p - candidate).Magnitude < R then ok = false break end   -- too close: reject
    end
    if ok then table.insert(points, candidate) end
end
-- placed ${o.n} trees, none closer than ${p.r}`,
  body:`<p>Plain random placement clumps: some trees overlap, others leave bare patches. <b>Poisson disc sampling</b> keeps the randomness but enforces a minimum gap: try a random spot and throw it away if anything is closer than <code>r</code>. Natural forests, stars and crowds look like this.</p>
<p>Switch between the two methods and compare the closest pair. As space fills up, more tries get rejected and it stops when no room is left. Bigger spacing means fewer trees fit.</p>`,
  uses:[`<b>Trees, rocks and grass clumps</b> that don't overlap.`,`<b>Spawn points</b> spread fairly around a map.`,`<b>Loot placement</b> with breathing room.`],
  gotchas:[`Checking every point each try gets slow past a few hundred. Bridson's algorithm uses a grid to check only nearby points.`]
});

demo({
  id:'pg-caves', title:'Cellular automata caves', short:'smooth random noise by neighbour count', sig:'wall if 5+ of the 8 neighbours are walls, repeat a few times',
  view:{theta:0.0, phi:0.6, r:28, ty:0}, env:'none',
  params:[R('fill','Starting wall %',30,65,1,46,'%'), R('iter','Smoothing passes',0,8,1,4), R('seed','Seed',1,60,1,9)],
  setup(K){ const Wd = 44, Hd = 32, cs = 0.5, cells = inst(K, Wd*Hd); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; const r = mulberry32(p.seed*17); let g = [];
        for (let z=0;z<Hd;z++){ g.push([]); for (let x=0;x<Wd;x++) g[z].push(x===0||z===0||x===Wd-1||z===Hd-1 || r()*100 < p.fill); }
        for (let it=0; it<p.iter; it++){ const n = g.map(row=>row.slice()); for (let z=1;z<Hd-1;z++) for (let x=1;x<Wd-1;x++){ let c = 0; for (let dz=-1;dz<=1;dz++) for (let dx=-1;dx<=1;dx++) if ((dx||dz) && g[z+dz][x+dx]) c++; n[z][x] = c >= 5 || (c >= 4 && g[z][x]); } g = n; }
        let open = 0; cells.begin(); for (let z=0;z<Hd;z++) for (let x=0;x<Wd;x++){ const w = g[z][x]; if (!w) open++; cells.add(V((x-Wd/2+0.5)*cs, w ? 0.6 : 0.05, (z-Hd/2+0.5)*cs), V(cs*0.98, w ? 1.2 : 0.1, cs*0.98), w ? '--part' : '--accent'); } cells.end(); res = {open:open/(Wd*Hd)}; }
      return res; }};
  },
  readout:(p,o)=>[['open floor', f(o.open*100,0)+'%','acc'],['passes', String(p.iter)]],
  code:(p)=>`-- 1. random start: about ${p.fill}% walls
for z = 1, H do for x = 1, W do
    grid[z][x] = rng:NextNumber() * 100 < ${p.fill}
end end

-- 2. smoothing passes: count the 8 neighbours
for _ = 1, ${p.iter} do
    local nextGrid = copy(grid)
    for z = 2, H - 1 do for x = 2, W - 1 do
        local walls = 0
        for dz = -1, 1 do for dx = -1, 1 do
            if (dx ~= 0 or dz ~= 0) and grid[z + dz][x + dx] then walls += 1 end
        end end
        nextGrid[z][x] = walls >= 5 or (walls >= 4 and grid[z][x])
    end end
    grid = nextGrid
end`,
  body:`<p>Start with random noise, walls and floor mixed like static. Then repeat one simple rule: a cell becomes wall if most of its neighbours are walls, otherwise floor. Each pass smooths the noise, and after a few the static turns into natural-looking caves.</p>
<p>Slide the passes from 0 upward to watch the caves form. The starting fill decides how open they are: below about 40% you get big halls, above about 55% isolated pockets.</p>`,
  uses:[`<b>Cave and dungeon levels</b> with an organic look.`,`<b>Islands and lakes</b> on 2D maps.`,`<b>Smoothing</b> any noisy yes/no grid.`],
  gotchas:[`Caves can end up as separate pockets. Flood fill from one spot and fill in (or tunnel to) any unreachable areas.`]
});

demo({
  id:'pg-walk', title:'Random walk dungeons', short:'a drunk digger', sig:'repeat: step in a random direction, carve the floor',
  view:{theta:0.0, phi:0.55, r:28, ty:0}, env:'none',
  params:[R('steps','Steps',50,2000,10,700), R('walkers','Walkers',1,6,1,2), R('seed','Seed',1,60,1,3)],
  setup(K){ const Wd = 44, Hd = 32, cs = 0.5, cells = inst(K, Wd*Hd); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; const r = mulberry32(p.seed*71), visits = Array.from({length:Hd}, ()=>Array(Wd).fill(0)), dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        for (let w=0; w<p.walkers; w++){ let x = Wd>>1, z = Hd>>1; for (let i=0;i<p.steps/p.walkers;i++){ visits[z][x]++; const [dx,dz] = dirs[Math.floor(r()*4)]; x = clamp(x+dx,1,Wd-2); z = clamp(z+dz,1,Hd-2); } }
        let floor = 0, mx = 1; visits.forEach(row=>row.forEach(v=>{ if (v){ floor++; mx = Math.max(mx, v); } }));
        cells.begin(); for (let z=0;z<Hd;z++) for (let x=0;x<Wd;x++){ const v = visits[z][x]; cells.add(V((x-Wd/2+0.5)*cs, v ? 0.05 : 0.6, (z-Hd/2+0.5)*cs), V(cs*0.98, v ? 0.1 : 1.2, cs*0.98), v ? new THREE.Color().copy(C('--va')).lerp(C('--accent'), Math.min(1, v/ (mx*0.5))) : '--part'); } cells.end(); res = {floor}; }
      return res; }};
  },
  readout:(p,o)=>[['floor tiles carved', String(o.floor),'acc'],['steps per tile', f(p.steps/o.floor,1)]],
  code:(p)=>`local DIRECTIONS = { {1, 0}, {-1, 0}, {0, 1}, {0, -1} }
local x, z = W // 2, H // 2
for _ = 1, ${p.steps} do
    floor[z][x] = true                                   -- carve
    local d = DIRECTIONS[rng:NextInteger(1, 4)]
    x = math.clamp(x + d[1], 2, W - 1)                   -- stay inside the border
    z = math.clamp(z + d[2], 2, H - 1)
end`,
  body:`<p>A <b>random walk</b> (the "drunkard's walk") is the simplest dungeon generator: start in the middle, step in a random direction, carve out the floor, repeat. Because it carves where it walks, the result is always one connected cave, with no unreachable rooms.</p>
<p>Colour shows how often each tile was visited; the walk keeps revisiting areas near the start. More steps grow the cave; several walkers spread it in different directions.</p>`,
  uses:[`<b>Roguelike caves and mines.</b>`,`<b>Winding paths and rivers</b> (bias the walk toward a goal).`,`<b>Ore veins</b> inside rock.`],
  gotchas:[`Pure random walks stay bunched near the start. Bias the direction, or restart walkers from random floor tiles, for wider caves.`]
});

demo({
  id:'pg-island', title:'Island masks', short:'height × falloff from the centre', sig:'h = noise(x, z) × (1 − (distance / radius)^power)',
  view:{theta:0.7, phi:0.85, r:30, ty:0}, env:'none',
  params:[R('pow','Falloff power',0.5,4,0.1,2), R('sea','Sea level',0.2,0.5,0.01,0.36), S('shape','Distance',[['round','Round'],['square','Square']],'round'), R('seed','Seed',0,40,1,11)],
  setup(K){ const hm = heightmap(K); let key = '';
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; hm.draw((x,z)=>{ const nx = (x - N/2 + 0.5)/(N/2), nz = (z - N/2 + 0.5)/(N/2), d = p.shape==='round' ? Math.hypot(nx,nz) : Math.max(Math.abs(nx),Math.abs(nz));
        const mask = clamp(1 - Math.pow(Math.min(1,d), p.pow), 0, 1), h = (0.5 + 0.75*fbm(x*0.08+0.31, z*0.08+0.47, {oct:4, lac:2, pers:0.5, seed:p.seed}))*mask;
        return h < p.sea ? h*(0.32/p.sea) : 0.36 + (h - p.sea)/(1 - p.sea)*0.64; }); } return {}; }};
  },
  readout:(p)=>[['falloff', `distance ^ ${p.pow}`,'acc'],['sea level', f(p.sea,2)]],
  code:(p)=>`local POWER, SEA = ${p.pow}, ${p.sea}

local function islandHeight(x, z)               -- x, z from -1 to 1 across the map
    local d = ${p.shape==='round' ? 'math.sqrt(x * x + z * z)' : 'math.max(math.abs(x), math.abs(z))'}
    local mask = math.clamp(1 - math.min(d, 1) ^ POWER, 0, 1)
    local h = (0.5 + fbm(x * 3, z * 3, seed)) * mask
    if h < SEA then return nil end              -- water
    return h
end`,
  body:`<p>Noise alone makes land that runs off the edge of the map. To get an <b>island</b>, multiply the height by a mask that's 1 in the middle and fades to 0 at the edges. Everything near the border sinks below sea level, so the land always ends in a beach.</p>
<p>The power shapes the fade: low powers make one big rounded island, high powers keep the land flat and then drop it sharply near the edge. A square distance makes squarer islands that fill more of the map.</p>`,
  uses:[`<b>Island and continent maps.</b>`,`<b>Arena maps</b> that naturally fade out at the boundary.`,`<b>Crater and valley shapes</b> by inverting the mask.`],
  gotchas:[`Apply the mask before choosing the sea level, or edges can still poke above water.`]
});

demo({
  id:'pg-lsystem', title:'L-system trees', short:'rewrite rules + turtle drawing', sig:'F → F[+F]F[−F]F   ·   F = forward, + / − = turn, [ ] = branch',
  view:{theta:0.0, phi:1.35, r:22, ty:6}, env:'grid',
  params:[R('iter','Iterations',1,5,1,4), R('ang','Turn angle',10,45,1,25.7,'°'), S('rule','Rule',[['bush','Bush: F → F[+F]F[−F]F'],['tree','Tree: F → FF+[+F−F−F]−[−F+F+F]'],['weed','Weed: F → F[+F]F[−F][F]']],'bush')],
  setup(K){ const lines = K.add(new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:C('--y')}))); let key = '', res = null;
    const RULES = {bush:'F[+F]F[-F]F', tree:'FF+[+F-F-F]-[-F+F+F]', weed:'F[+F]F[-F][F]'};
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; let s = 'F'; for (let i=0;i<p.iter;i++){ s = s.replace(/F/g, RULES[p.rule]); if (s.length > 200000) break; }
        const segs = []; let x = 0, y = 0, a = Math.PI/2; const st = []; const fCount = (s.match(/F/g)||[]).length, len = 1;
        for (const ch of s){ if (ch==='F'){ const nx = x + Math.cos(a)*len, ny = y + Math.sin(a)*len; segs.push([x,y,nx,ny]); x = nx; y = ny; } else if (ch==='+') a += p.ang*D2R; else if (ch==='-') a -= p.ang*D2R; else if (ch==='[') st.push([x,y,a]); else if (ch===']') [x,y,a] = st.pop(); }
        let maxY = 1, minX = 0, maxX = 0; segs.forEach(([,,nx,ny])=>{ maxY = Math.max(maxY, ny); minX = Math.min(minX,nx); maxX = Math.max(maxX,nx); }); const sc = 12/Math.max(maxY, (maxX-minX)*0.9);
        const pts = []; segs.forEach(([x0,y0,x1,y1])=>pts.push(V(x0*sc, y0*sc, 0), V(x1*sc, y1*sc, 0)));
        lines.geometry.dispose(); lines.geometry = new THREE.BufferGeometry().setFromPoints(pts); res = {len:s.length, segs:segs.length}; }
      return res; }};
  },
  readout:(p,o)=>[['string length', o.len.toLocaleString('en-US')],['branches drawn', o.segs.toLocaleString('en-US'),'acc']],
  code:(p,o)=>`local RULE = "${({bush:'F[+F]F[-F]F', tree:'FF+[+F-F-F]-[-F+F+F]', weed:'F[+F]F[-F][F]'})[p.rule]}"
local s = "F"
for _ = 1, ${p.iter} do
    s = s:gsub("F", RULE)              -- every F grows into a little branch
end

-- turtle: walk the string
local pos, angle, stack = Vector2.zero, math.rad(90), {}
for ch in s:gmatch(".") do
    if ch == "F" then
        local nextPos = pos + Vector2.new(math.cos(angle), math.sin(angle))
        makeBranch(pos, nextPos)
        pos = nextPos
    elseif ch == "+" then angle += math.rad(${p.ang})
    elseif ch == "-" then angle -= math.rad(${p.ang})
    elseif ch == "[" then table.insert(stack, {pos, angle})        -- start a side branch
    elseif ch == "]" then pos, angle = table.unpack(table.remove(stack)) -- back to the fork
    end
end`,
  body:`<p>An <b>L-system</b> grows a string by repeatedly replacing each letter with a pattern. Then a "turtle" reads the string as drawing instructions: <code>F</code> moves forward drawing a branch, <code>+</code> and <code>−</code> turn, <code>[</code> remembers where it is and <code>]</code> jumps back there to start a new branch.</p>
<p>Because the same rule repeats inside itself, each iteration adds smaller copies of the whole shape, which is exactly how real plants branch. Change the angle to make it bushier or more upright; each extra iteration multiplies the branches.</p>`,
  uses:[`<b>Procedural trees, bushes and coral.</b>`,`<b>Lightning bolts and river networks.</b>`,`<b>Fractal decorations</b> and patterns.`],
  gotchas:[`Strings grow exponentially. 4 to 5 iterations is usually the limit before part counts get too high.`]
});

Lab.finder([
  ['Make realistic terrain with detail','fBm octaves','pg-fbm'],
  ['Make mountain ridges or terraces','ridged / terraced noise','pg-ridged'],
  ['Make swirly, eroded-looking terrain','domain warping','pg-warp'],
  ['Split a map into biomes or territories','Voronoi cells','pg-voronoi'],
  ['Scatter trees that never overlap','Poisson disc sampling','pg-poisson'],
  ['Generate cave levels','cellular automata','pg-caves'],
  ['Generate a connected dungeon quickly','random walk','pg-walk'],
  ['Make an island that ends at the map edge','falloff mask','pg-island'],
  ['Grow procedural trees','L-systems','pg-lsystem'],
]);
Lab.ref('proc','Procedural',[
  ['fBm','Σ amp·noise(p·freq), amp × persistence, freq × lacunarity','fbm(x, z, seed)','Terrain detail'],
  ['ridged','1 − |noise|','(1 - math.abs(n))^2','Mountain ranges'],
  ['terrace','floor(h × steps) / steps','math.floor(h * 6) / 6','Mesas, voxels'],
  ['domain warp','noise(p + k·noise(p))','fbm(x + wx, z + wz)','Swirls, erosion'],
  ['Voronoi','nearest seed point','regionAt(x, z)','Biomes, cracks'],
  ['Poisson disc','reject if closer than r','(p - c).Magnitude < R','Trees, spawns'],
  ['cave automaton','wall if ≥ 5 wall neighbours','4–5 passes','Caves'],
  ['falloff mask','1 − d^power','h * mask','Islands'],
]);
})();
