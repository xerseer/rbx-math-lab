(function(){
"use strict";
// More "Procedural generation" topics: 3D noise, caves, worms, ores, biomes, erosion, marching squares, WFC, BSP dungeons.
const {THREE, V, C, f, G, R, S, T, clamp, noise, mulberry32} = Lab;
const {inst, labels} = Lab.kit2;
const demo = Lab.more('proc');
const hex = h=>new THREE.Color(h);
const B = {grass:hex('#5fae4f'), dirt:hex('#8a5a35'), stone:hex('#8a8a8a'), deep:hex('#6b6b70'), sand:hex('#e4d19a'), water:hex('#3b7fd6'), snow:hex('#f2f2f2')};
const PAL = [[0,'#2f6fd6'],[0.32,'#4c8fe0'],[0.36,'#e4d19a'],[0.42,'#5fae4f'],[0.66,'#3f7f3a'],[0.78,'#8a8a8a'],[0.9,'#f2f2f2']].map(([t,h])=>[t,hex(h)]);
function terrainColor(h){ h = clamp(h,0,1); for (let i=0;i<PAL.length-1;i++){ if (h <= PAL[i+1][0]) return PAL[i][1].clone().lerp(PAL[i+1][1], (h - PAL[i][0])/(PAL[i+1][0]-PAL[i][0])); } return PAL[PAL.length-1][1].clone(); }
const NB6 = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

/* A block of voxels. fill(x, y, z) returns a THREE.Color for solid or null for air.
   Only voxels that touch air (or the cut plane) are drawn. cut removes rows from the +Z side. */
function volume(K, W, H, D, max, cs=0.6){
  const boxes = inst(K, max), cells = new Array(W*H*D);
  const at = (x,y,z)=>x<0||y<0||z<0||x>=W||y>=H||z>=D ? null : cells[x + W*(z + D*y)];
  return {at, draw(fill, cut=0){
    for (let y=0;y<H;y++) for (let z=0;z<D;z++) for (let x=0;x<W;x++) cells[x + W*(z + D*y)] = fill(x,y,z);
    let solid = 0; boxes.begin(); const zMax = D - cut;
    for (let y=0;y<H;y++) for (let z=0;z<D;z++) for (let x=0;x<W;x++){ const c = cells[x + W*(z + D*y)]; if (!c) continue; solid++; if (z >= zMax) continue;
      if (z === zMax - 1 || NB6.some(([a,b,d])=>!at(x+a, y+b, z+d))) boxes.add(V((x - W/2 + 0.5)*cs, (y + 0.5)*cs, (z - D/2 + 0.5)*cs), cs*0.98, c); }
    boxes.end(); return solid/(W*H*D); }};
}
/* 2 octaves of 3D noise, about -1..1 */
const n3 = (x,y,z,s)=>(noise(x,y,z + s) + 0.5*noise(x*2.03 + 7.1, y*2.03, z*2.03 + s*1.7))*1.25;

/* ---------------------------------------------------------------- */
demo({
  id:'pg-noise3d', title:'3D noise: solid where noise is high', short:'noise(x, y, z) > threshold', sig:'solid = math.noise(x · s, y · s, z · s) > threshold',
  view:{theta:0.7, phi:1.05, r:30, ty:3}, env:'none',
  params:[R('scale','Scale',0.06,0.3,0.005,0.13), R('thr','Threshold',-0.4,0.5,0.01,0.05), R('cut','Cut away the front',0,22,1,0), R('seed','Seed',0,40,1,3)],
  setup(K){ const W = 26, H = 14, D = 26, vol = volume(K, W, H, D, 9000); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k;
        res = {fill:vol.draw((x,y,z)=>n3(x*p.scale + 0.31, y*p.scale + 0.17, z*p.scale + 0.53, p.seed*9.7) > p.thr ? C('--part').clone().lerp(C('--va'), y/H) : null, p.cut)}; }
      return res; }};
  },
  readout:(p,o)=>[['solid', f(o.fill*100,0)+'%','acc'],['threshold', f(p.thr,2)],['blob size', '≈ '+f(1/p.scale,0)+' voxels']],
  code:(p)=>`local SCALE, THRESHOLD, SEED = ${p.scale}, ${p.thr}, ${p.seed * 10}

local function IsSolid(x: number, y: number, z: number): boolean
    return math.noise(x * SCALE, y * SCALE, z * SCALE + SEED) > THRESHOLD
end

for x = 1, 26 do
    for y = 1, 14 do
        for z = 1, 26 do
            if IsSolid(x, y, z) then
                workspace.Terrain:FillBlock(CFrame.new(x * 4, y * 4, z * 4), Vector3.one * 4, Enum.Material.Rock)
            end
        end
    end
end`,
  body:`<p>2D noise gives a height for each (x, z), so the ground can only go up and down. <b>3D noise</b> gives a value for every point in space. Call a voxel solid when the value is above a <b>threshold</b> and you get blobs, arches and holes in every direction: shapes a heightmap can't make.</p>
<p>Lower the threshold for more rock, raise it for floating lumps. Cut away the front to see that the blobs are full of tunnels. This is the building block for caves, overhangs and floating islands in the next topics.</p>`,
  uses:[`<b>Caves and asteroids.</b>`,`<b>Ore and crystal pockets</b> inside rock.`,`<b>Clouds and fog volumes.</b>`],
  gotchas:[`<code>math.noise</code> returns exactly 0 at whole-number inputs, so always multiply by a scale that isn't a whole number.`,`3D noise is much more work than 2D: a 64 × 64 × 64 chunk is 262,144 samples. Generate in chunks and yield between them.`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'pg-density', title:'Density: overhangs and floating islands', short:'height falloff + 3D noise', sig:'density = (groundHeight − y) / spread + noise3D(x, y, z) × strength   ·   solid if density > 0',
  view:{theta:0.75, phi:1.1, r:30, ty:4}, env:'none',
  params:[S('mode','World',[['terrain','Terrain with overhangs'],['height','Heightmap only (2D)'],['float','Floating islands']],'terrain'), R('amp','3D noise strength',0,1.5,0.05,0.7), R('spread','Height spread',2,12,0.5,5), R('seed','Seed',0,40,1,6)],
  setup(K){ const W = 30, H = 20, D = 30, vol = volume(K, W, H, D, 11000); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; const s = 0.085, mid = H*0.55;
        const raw = (x,y,z)=>{
          if (p.mode === 'height'){ const g = H*0.35 + noise(x*s + 0.3, z*s + 0.6, p.seed*4.1)*p.spread*2.2; return g - y; }
          const n = n3(x*s + 0.31, y*s*1.2 + 0.17, z*s + 0.53, p.seed*9.7);
          if (p.mode === 'float') return n*p.amp*1.6 - Math.abs(y - mid)/p.spread - 0.25 + (y > mid ? 0 : 0.08);
          return (H*0.35 - y)/p.spread + n*p.amp*2; };
        const grid = new Float32Array(W*H*D); for (let y=0;y<H;y++) for (let z=0;z<D;z++) for (let x=0;x<W;x++) grid[x + W*(z + D*y)] = raw(x,y,z);
        const dens = (x,y,z)=>y < 0 ? 1 : y >= H ? -1 : grid[x + W*(z + D*y)];
        let overhang = 0;
        res = {fill:vol.draw((x,y,z)=>{ if (dens(x,y,z) <= 0) return null; const a1 = dens(x,y+1,z) <= 0, a3 = dens(x,y+3,z) <= 0;
          if (!a1){ for (let yy=y+2; yy<H; yy++) if (dens(x,yy,z) <= 0 && dens(x,yy+1,z) > 0){ overhang++; break; } }
          return a1 ? B.grass : a3 ? B.dirt : B.stone; })}; res.overhang = overhang; }
      return res; }};
  },
  readout:(p,o)=>[['solid', f(o.fill*100,0)+'%'],['blocks under an overhang', String(o.overhang),'acc']],
  code:(p)=>`local SPREAD, STRENGTH, GROUND = ${p.spread}, ${p.amp}, 7

local function Density(x: number, y: number, z: number): number
${p.mode === 'float' ? `    -- strongest in a band around MID height, fading above and below
    local n = math.noise(x * 0.085, y * 0.1, z * 0.085)
    return n * STRENGTH * 1.6 - math.abs(y - MID) / SPREAD - 0.25` : p.mode === 'height' ? `    -- plain heightmap: the noise only depends on x and z
    local ground = GROUND + math.noise(x * 0.085, z * 0.085) * SPREAD * 2.2
    return ground - y` : `    local n = math.noise(x * 0.085, y * 0.1, z * 0.085)
    return (GROUND - y) / SPREAD + n * STRENGTH * 2     -- mostly "below the ground", nudged by 3D noise`}
end

local isSolid = Density(x, y, z) > 0`,
  body:`<p>A heightmap can't make a cliff that leans out or a cave mouth, because each (x, z) has only one height. A <b>density function</b> fixes that. Start with "how far below the ground is this point", which is positive underground and negative in the sky, then add 3D noise. Wherever the total is above 0 is solid.</p>
<p>With strength 0 you get flat layers; as the noise gets stronger, it pushes rock up into the sky and carves the ground, making <b>overhangs</b> and arches. Floating islands use a band in the middle of the world instead of a ground level, so land fades out above and below.</p>`,
  uses:[`<b>Cliffs, arches and overhangs</b> in voxel or Roblox Terrain worlds.`,`<b>Sky islands</b> for obbies and adventure games.`,`<b>Alien planets</b> with weird, twisted ground.`],
  gotchas:[`Choose grass, dirt and stone by looking upward (is there air 1 or 3 blocks above?), not by y, or overhangs get grass on their undersides.`,`Higher strength means more floating bits. Remove pieces not connected to the ground with a 3D flood fill.`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'pg-caves3d', title:'Spaghetti and cheese caves', short:'carve where noise is near 0', sig:'spaghetti: |n₁| < w and |n₂| < w   ·   cheese: n > 1 − w',
  view:{theta:0.7, phi:1.05, r:30, ty:3}, env:'none',
  params:[S('mode','Cave type',[['spaghetti','Spaghetti tunnels'],['cheese','Cheese caverns'],['both','Both']],'spaghetti'), R('w','Cave width',0.03,0.25,0.005,0.14), R('scale','Scale',0.05,0.16,0.005,0.08), T('xray','Show only the caves',true), R('cut','Cut away the front',0,26,1,0), R('seed','Seed',0,40,1,4)],
  setup(K){ const W = 30, H = 17, D = 30, cs = 0.6, vol = volume(K, W, H, D, 12000, cs), box = K.add(new THREE.LineSegments(G.edges, new THREE.LineBasicMaterial({color:C('--muted'), transparent:true, opacity:0.5}))); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; const s = p.scale, top = (x,z)=>12 + Math.round(noise(x*0.09 + 0.3, z*0.09 + 0.6, p.seed*3.1)*5);
        const caveRaw = (x,y,z)=>{ const a = noise(x*s + 0.31, y*s*1.4 + 0.17, z*s + 0.53 + p.seed*7.3)*1.5, b = noise(x*s + 41.3, y*s*1.4 + 9.1, z*s + 17.7 + p.seed*7.3)*1.5;
          const sp = Math.abs(a) < p.w && Math.abs(b) < p.w, ch = n3(x*s*0.8 + 5.5, y*s*1.1, z*s*0.8, p.seed*5.1 + 3) > 1 - p.w*4.2;
          return p.mode === 'spaghetti' ? sp : p.mode === 'cheese' ? ch : sp || ch; };
        const tops = new Int16Array(W*D), caves = new Uint8Array(W*H*D);
        for (let z=0;z<D;z++) for (let x=0;x<W;x++){ tops[x + W*z] = top(x,z); for (let y=1;y<tops[x + W*z] && y<H;y++) caves[x + W*(z + D*y)] = caveRaw(x,y,z) ? 1 : 0; }
        const cave = (x,y,z)=>caves[x + W*(z + D*y)] === 1;
        let carved = 0, under = 0;
        const fill = (x,y,z)=>{ const t = tops[x + W*z]; if (y >= t) return null; under++; if (y > 0 && cave(x,y,z)){ carved++; return null; }
          const wall = y > 0 && NB6.some(([a,b,d])=>{ const X = x+a, Y = y+b, Z = z+d; return X>=0 && Z>=0 && X<W && Z<D && Y>0 && Y < tops[X + W*Z] && cave(X,Y,Z); });
          return wall ? C('--accent') : y === t-1 ? B.grass : y >= t-3 ? B.dirt : B.stone; };
        const xray = (x,y,z)=>{ const t = tops[x + W*z]; if (y >= t) return null; under++; if (y > 0 && cave(x,y,z)){ carved++; return C('--accent').clone().lerp(C('--va'), 1 - y/t); } return null; };
        box.visible = p.xray; box.scale.set(W*cs, 13*cs, (D - p.cut)*cs); box.position.set(0, 13*cs/2, -p.cut*cs/2);
        vol.draw(p.xray ? xray : fill, p.cut); res = {carved:carved/Math.max(1,under)}; }
      return res; }};
  },
  readout:(p,o)=>[['rock carved into caves', f(o.carved*100,1)+'%','acc'],['cave type', p.mode]],
  code:(p)=>`local SCALE, WIDTH = ${p.scale}, ${p.w}

local function IsCave(x: number, y: number, z: number): boolean
    -- two noises: each is near 0 on a twisting sheet; where two sheets cross is a tube
    local a = math.noise(x * SCALE, y * SCALE * 1.4, z * SCALE)
    local b = math.noise(x * SCALE + 41.3, y * SCALE * 1.4, z * SCALE + 17.7)
    local spaghetti = math.abs(a) < WIDTH and math.abs(b) < WIDTH

    -- one noise: its highest peaks become big open rooms
    local cheese = math.noise(x * SCALE * 0.8 + 5.5, y * SCALE * 1.1, z * SCALE * 0.8) > 1 - WIDTH * 4.2
    return ${p.mode === 'spaghetti' ? 'spaghetti' : p.mode === 'cheese' ? 'cheese' : 'spaghetti or cheese'}
end

-- underground and IsCave → leave it empty`,
  body:`<p>Two classic ways to carve caves out of solid ground with 3D noise. <b>Cheese caves</b> are simple: wherever the noise is very high, remove the rock, which gives big round chambers like holes in Swiss cheese. <b>Spaghetti caves</b> are cleverer. Where one noise is close to 0 is a thin twisting <i>sheet</i>; where two different noises are both close to 0, two sheets cross and make a long winding <i>tube</i>.</p>
<p>With <i>Show only the caves</i> on, the rock is hidden and you see the empty space itself, coloured by depth. Turn it off to see the ground, where the highlighted blocks are cave walls. Cut the front away to look inside, and change the width to widen the tunnels.</p>`,
  uses:[`<b>Mining and exploration games</b> with natural tunnels.`,`<b>Roblox Terrain caves</b>: fill rock, then <code>FillBlock</code> with Air where IsCave is true.`,`<b>Mazes of tunnels</b> under a surface world.`],
  gotchas:[`Squash y (multiply it by more than x and z) so tunnels run sideways more than straight down.`,`Don't carve the bottom layer or right at the surface unless you want holes in the floor and sky.`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'pg-worms', title:'Perlin worms: tunnels that wander', short:'steer a digger with noise', sig:'each step: yaw += noise(t) × turn,  pitch = noise(t′) × climb,  move forward, carve a sphere',
  view:{theta:0.7, phi:1.0, r:30, ty:4}, env:'none',
  params:[R('worms','Worms',1,5,1,3), R('len','Length',20,220,5,120), R('turn','Turning',0,2,0.05,0.9), R('rad','Radius',0.6,2.5,0.1,1.3), R('seed','Seed',1,60,1,7)],
  setup(K){ const W = 34, H = 18, D = 34, cs = 0.55, vol = volume(K, W, H, D, 12000, cs), lines = Array.from({length:5}, ()=>K.line('--ink',{max:221}));
    const box = K.add(new THREE.LineSegments(G.edges, new THREE.LineBasicMaterial({color:C('--muted'), transparent:true, opacity:0.5}))); box.scale.set(W*cs, H*cs, D*cs); box.position.set(0, H*cs/2, 0); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; const r = mulberry32(p.seed*91), owner = new Int8Array(W*H*D).fill(-1);
        const hues = [0.08, 0.5, 0.85, 0.3, 0.62].map(h=>new THREE.Color().setHSL(h, 0.65, 0.55));
        for (let w=0; w<5; w++){ lines[w].visible = w < p.worms; if (w >= p.worms) continue;
          const pos = V(4 + r()*(W-8), 4 + r()*(H-8), 4 + r()*(D-8)); let yaw = r()*Math.PI*2; const pts = [];
          for (let i=0;i<p.len;i++){ const t = i*0.06;
            yaw += noise(t + 0.37, w*3.1 + 0.5, p.seed*1.3)*p.turn; const pitch = noise(t + 0.71, w*3.1 + 9.5, p.seed*1.3)*1.1;
            pos.add(V(Math.cos(yaw)*Math.cos(pitch), Math.sin(pitch), Math.sin(yaw)*Math.cos(pitch)));
            pos.y = clamp(pos.y, 2, H-3); if (pos.x < 1 || pos.z < 1 || pos.x > W-2 || pos.z > D-2){ yaw += Math.PI; pos.x = clamp(pos.x,1,W-2); pos.z = clamp(pos.z,1,D-2); }
            pts.push(V((pos.x - W/2)*cs, pos.y*cs, (pos.z - D/2)*cs)); const R0 = Math.ceil(p.rad);
            for (let dx=-R0;dx<=R0;dx++) for (let dy=-R0;dy<=R0;dy++) for (let dz=-R0;dz<=R0;dz++){ const X = Math.floor(pos.x)+dx, Y = Math.floor(pos.y)+dy, Z = Math.floor(pos.z)+dz;
              if (X<0||Y<0||Z<0||X>=W||Y>=H||Z>=D || Math.hypot(X + 0.5 - pos.x, Y + 0.5 - pos.y, Z + 0.5 - pos.z) > p.rad) continue; owner[X + W*(Z + D*Y)] = w; } }
          lines[w].set(pts); }
        let carved = 0; vol.draw((x,y,z)=>{ const o = owner[x + W*(z + D*y)]; if (o < 0) return null; carved++; return hues[o]; }); res = {carved}; }
      return res; }};
  },
  readout:(p,o)=>[['voxels carved', String(o.carved),'acc'],['steps per worm', String(p.len)]],
  code:(p)=>`local TURN, RADIUS = ${p.turn}, ${p.rad}

local function DigWorm(start: Vector3, steps: number, seed: number)
    local position, yaw = start, math.random() * math.pi * 2
    for i = 1, steps do
        local t = i * 0.06
        yaw += math.noise(t, seed, 0.5) * TURN               -- smooth wandering left and right
        local pitch = math.noise(t, seed, 9.5) * 1.1         -- and gently up and down
        position += Vector3.new(math.cos(yaw) * math.cos(pitch), math.sin(pitch), math.sin(yaw) * math.cos(pitch))
        workspace.Terrain:FillBall(position * 4, RADIUS * 4, Enum.Material.Air)
    end
end`,
  body:`<p>Noise caves are fast, but you can't control where they go. A <b>Perlin worm</b> is a digger that walks through the rock carving a sphere at each step. Instead of turning randomly (which makes jittery zigzags), it reads its turning from <b>noise along its path</b>, so it curves smoothly like a real tunnel.</p>
<p>Each colour is one worm, and the black line is its path. More turning makes twistier tunnels; a bigger radius makes wider ones. Because worms are paths, you can start them at a cave entrance or aim them at a goal.</p>`,
  uses:[`<b>Long tunnels</b> that connect places you choose.`,`<b>Rivers and canyons</b>: run a flat worm across the surface.`,`<b>Mine shafts and ant nests.</b>`],
  gotchas:[`Carving a sphere per step is the slow part. In Roblox Terrain, <code>FillBall</code> with Air does it in one call.`,`Keep worms away from the world edge, or turn them around, as here.`]
});

/* ---------------------------------------------------------------- */
const ORES = [['coal', hex('#2b2b2b'), 0.0, 0.55, 0.40], ['iron', hex('#d8a27a'), 0.3, 0.8, 0.47], ['gold', hex('#f2c94c'), 0.65, 1.0, 0.53], ['diamond', hex('#5ee0e6'), 0.85, 1.0, 0.57]];
demo({
  id:'pg-ores', title:'Ores by depth', short:'each ore: a depth band + a noise threshold', sig:'ore if depth in [min, max] and noise3D(x, y, z) > threshold',
  view:{theta:0.0, phi:1.42, r:34, ty:5.5}, env:'none',
  params:[R('amt','Ore amount',0.5,1.6,0.05,1), R('vein','Vein size',0.12,0.5,0.01,0.28), R('slice','Slice (z)',0,30,1,0), R('seed','Seed',0,40,1,5)],
  setup(K){ const Wd = 48, Hd = 32, cs = 0.45, cells = inst(K, Wd*Hd), tags = labels(K, 4, '--ink'), lines = Array.from({length:4}, ()=>K.line('--muted',{dashed:true})); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; const cnt = {coal:0, iron:0, gold:0, diamond:0};
        const P = (x,y)=>V((x - Wd/2 + 0.5)*cs, (y + 0.5)*cs, 0); cells.begin();
        for (let y=0;y<Hd;y++) for (let x=0;x<Wd;x++){ const depthBlocks = Hd - 1 - y, depth = depthBlocks/(Hd - 1); let col = depthBlocks === 0 ? B.grass : depthBlocks <= 3 ? B.dirt : depth > 0.6 ? B.deep : B.stone;
          if (depthBlocks > 3) for (const [name, c, lo, hi, thr] of ORES){ if (depth < lo || depth > hi) continue;
            const n = noise(x*p.vein + 0.31, y*p.vein + 0.47, p.slice*p.vein + p.seed*13.7 + name.length*31.1)*1.6;
            if (n > thr + (1 - p.amt)*0.35){ col = c; cnt[name]++; break; } }
          cells.add(P(x,y), V(cs*0.97, cs*0.97, cs*0.97), col); }
        cells.end(); tags.begin();
        ORES.forEach(([name,,lo,hi],i)=>{ const y0 = (Hd - 1) - lo*(Hd - 1), y1 = (Hd - 1) - hi*(Hd - 1), xx = Wd/2*cs + 0.6 + i*0.55;
          lines[i].set(V(xx, (y0 + 0.5)*cs, 0), V(xx, (y1 + 0.5)*cs, 0)); tags.add(name, V(xx + 0.2, ((y0 + y1)/2 + 0.5)*cs, 0)).el.style.translate = '0 -50%'; });
        tags.end(); res = cnt; }
      return res; }};
  },
  readout:(p,o)=>[['coal', String(o.coal)],['iron', String(o.iron)],['gold', String(o.gold),'acc'],['diamond', String(o.diamond),'acc']],
  code:(p)=>`local ORES = {   -- name, shallowest, deepest (0 = top, 1 = bottom), how rare
    { "Coal",    0.0,  0.55, 0.40 },
    { "Iron",    0.3,  0.8,  0.47 },
    { "Gold",    0.65, 1.0,  0.53 },
    { "Diamond", 0.85, 1.0,  0.57 },
}
local VEIN, AMOUNT = ${p.vein}, ${p.amt}

local function OreAt(x: number, y: number, z: number, depth: number): string?
    for i, ore in ORES do
        local name, shallow, deep, rarity = ore[1], ore[2], ore[3], ore[4]
        if depth >= shallow and depth <= deep then
            local n = math.noise(x * VEIN, y * VEIN, z * VEIN + i * 31.1)   -- a different noise per ore
            if n * 1.6 > rarity + (1 - AMOUNT) * 0.35 then return name end
        end
    end
    return nil   -- plain stone
end`,
  body:`<p>Ores aren't sprinkled at random: they come in <b>veins</b>, and the valuable ones are deeper. Each ore gets a <b>depth band</b> (the dashed bars on the right) and its own 3D noise. Where that noise is above the ore's threshold, the stone becomes ore. A higher threshold means smaller, rarer veins.</p>
<p>This is a 2D slice of a 3D world; move the slice to step through it, and the veins grow and shrink like real lumps of ore. Bands overlap, so the list order decides which ore wins.</p>`,
  uses:[`<b>Mining and simulator games</b>: rarity that rewards digging deeper.`,`<b>Crystals, fossils and treasure</b> in cave walls.`,`<b>Resource spawns</b> spread fairly but not evenly.`],
  gotchas:[`Use a different noise offset for each ore, or all ores appear in the same spots.`,`Count the result: tune thresholds by measuring how many blocks of each ore a chunk really gets.`]
});

/* ---------------------------------------------------------------- */
const BIOMES = [
  ['tundra','#cfd8dc'], ['taiga','#4f7f6a'], ['snowy forest','#7fa596'],
  ['grassland','#9ccc65'], ['forest','#3f8f3a'], ['swamp','#56704f'],
  ['desert','#e4cc8a'], ['savanna','#c9b458'], ['jungle','#1f7a3a']].map(([n,h])=>[n, hex(h)]);
const biomeOf = (t,m)=>BIOMES[(t < 0.36 ? 0 : t < 0.62 ? 1 : 2)*3 + (m < 0.38 ? 0 : m < 0.62 ? 1 : 2)];
demo({
  id:'pg-biomes', title:'Biomes from heat and rain', short:'two noises → a lookup table', sig:'temperature = noise(p),  moisture = noise(p + offset)  →  BIOMES[t][m]',
  view:{theta:0.0, phi:0.4, r:34, tx:4.5, ty:0}, env:'none',
  params:[R('scale','Biome size',0.02,0.12,0.005,0.05), R('heat','Warmer / colder',-0.3,0.3,0.01,0), R('px','Probe X',0,39,1,12), R('pz','Probe Z',0,39,1,20), R('seed','Seed',0,40,1,2)],
  setup(K){ const M = 40, cs = 0.45, cells = inst(K, M*M), table = inst(K, 9), probe = K.part(V(0.5,1.4,0.5),'--ink',{front:false}), dot = K.point('--ink',0.18), lab = K.label('','--accent-ink','big');
    const tx0 = M/2*cs + 2.2, tsz = 2.4; K.label('dry → wet','--muted').at(V(tx0 + tsz*1.5, 0.1, -tsz*1.5 - 0.6)); const hot = K.label('cold ↓ hot','--muted').at(V(tx0 + tsz*3 + 0.9, 0.1, 0)); hot.el.style.translate = '0 -50%'; let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k;
        const TM = (x,z)=>[clamp(0.5 + p.heat + noise(x*p.scale + 0.31, z*p.scale + 0.47, p.seed*3.3)*1.3, 0, 1), clamp(0.5 + noise(x*p.scale + 50.3, z*p.scale + 50.7, p.seed*3.3 + 9.1)*1.3, 0, 1)];
        const share = new Map(); cells.begin();
        for (let z=0;z<M;z++) for (let x=0;x<M;x++){ const [t,m] = TM(x,z), b = biomeOf(t,m); share.set(b[0], (share.get(b[0])||0) + 1); cells.add(V((x - M/2 + 0.5)*cs, 0.1, (z - M/2 + 0.5)*cs), V(cs*0.98, 0.2, cs*0.98), b[1]); }
        cells.end(); table.begin();
        BIOMES.forEach(([name,c],i)=>{ const row = Math.floor(i/3), col = i % 3, P = V(tx0 + (col + 0.5)*tsz, 0.05, (row - 1)*tsz); table.add(P, V(tsz*0.96, 0.1, tsz*0.96), c); }); table.end();
        const [t,m] = TM(p.px, p.pz), b = biomeOf(t,m), PP = V((p.px - M/2 + 0.5)*cs, 0.9, (p.pz - M/2 + 0.5)*cs); probe.position.copy(PP);
        dot.position.set(tx0 + m*3*tsz, 0.4, (t*3 - 1.5)*tsz); lab.at(PP.clone().setY(2.1)).text(b[0]);
        const top = [...share.entries()].sort((a,c)=>c[1]-a[1])[0]; res = {t, m, b:b[0], top:top[0], topPct:top[1]/(M*M)}; }
      return res; }};
  },
  readout:(p,o)=>[['biome at the probe', o.b,'acc'],['temperature', f(o.t,2)],['moisture', f(o.m,2)],['most common', `${o.top} (${f(o.topPct*100,0)}%)`]],
  code:(p)=>`local BIOMES = {          -- rows: cold, mild, hot · columns: dry, medium, wet
    { "Tundra",    "Taiga",   "SnowyForest" },
    { "Grassland", "Forest",  "Swamp" },
    { "Desert",    "Savanna", "Jungle" },
}
local SCALE, HEAT = ${p.scale}, ${p.heat}

local function Band(value: number, low: number, high: number): number
    return if value < low then 1 elseif value < high then 2 else 3
end

local function BiomeAt(x: number, z: number): string
    local temperature = math.clamp(0.5 + HEAT + math.noise(x * SCALE, z * SCALE, 1) * 1.3, 0, 1)
    local moisture = math.clamp(0.5 + math.noise(x * SCALE + 50, z * SCALE + 50, 2) * 1.3, 0, 1)
    return BIOMES[Band(temperature, 0.36, 0.62)][Band(moisture, 0.38, 0.62)]
end`,
  body:`<p>Real biomes depend on climate, so generate the climate. Use one noise for <b>temperature</b> and a second, offset noise for <b>moisture</b>, then look the pair up in a 3 × 3 table (right; rows cold to hot, columns dry to wet): hot and dry is desert, cold and wet is taiga, and so on. Because both noises are smooth, biomes blend into neighbours that make sense. You never get desert right next to snow.</p>
<p>Move the probe to read the two values; the dot on the table shows where that spot falls. Slide warmer or colder to shift the whole world's climate.</p>`,
  uses:[`<b>Open-world maps</b> with believable regions.`,`<b>Choosing trees, grass colour and enemies</b> per biome.`,`<b>Weather and music zones.</b>`],
  gotchas:[`Hard table edges make straight-looking borders. Blend the heights and colours of nearby biomes over a few studs.`,`Use a much bigger scale for biomes than for hills, or biomes change every few steps.`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'pg-erosion', title:'Thermal erosion: slopes that settle', short:'move material downhill past the talus angle', sig:'if h − hₙ > talus:  move (h − hₙ − talus) × rate  to the neighbour',
  view:{theta:0.7, phi:0.85, r:30, ty:0}, env:'none',
  params:[R('iter','Erosion passes',0,80,1,0), R('talus','Steepest allowed step',0.004,0.05,0.001,0.012), R('seed','Seed',0,40,1,9)],
  setup(K){ const N = 34, CELL = 0.7, AMP = 7, cols = inst(K, N*N); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; let h = new Float32Array(N*N);
        for (let z=0;z<N;z++) for (let x=0;x<N;x++){ let s = 0, a = 1, fr = 1; for (let o=0;o<4;o++){ const n = clamp(noise(x*0.07*fr + 0.3, z*0.07*fr + 0.7, p.seed*2.1 + o*11)*1.6,-1,1); s += a*(1 - Math.abs(n))*(1 - Math.abs(n)); a *= 0.5; fr *= 2; } h[x + z*N] = clamp(s/1.875*1.1 - 0.15, 0, 1); }
        const steep = ()=>{ let m = 0; for (let z=0;z<N;z++) for (let x=0;x<N-1;x++) m = Math.max(m, Math.abs(h[x + z*N] - h[x+1 + z*N]), z < N-1 ? Math.abs(h[x + z*N] - h[x + (z+1)*N]) : 0); return Math.atan(m*AMP/CELL)*180/Math.PI; };
        const before = steep();
        for (let it=0; it<p.iter; it++){ const d = new Float32Array(N*N);
          for (let z=0;z<N;z++) for (let x=0;x<N;x++){ const i = x + z*N; for (const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){ const X = x+a, Z = z+b; if (X<0||Z<0||X>=N||Z>=N) continue; const diff = h[i] - h[X + Z*N];
              if (diff > p.talus){ const mv = (diff - p.talus)*0.12; d[i] -= mv; d[X + Z*N] += mv; } } }
          for (let i=0;i<N*N;i++) h[i] += d[i]; }
        cols.begin(); for (let z=0;z<N;z++) for (let x=0;x<N;x++){ const v = h[x + z*N], y = Math.max(0.1, v*AMP); cols.add(V((x - N/2 + 0.5)*CELL, y/2, (z - N/2 + 0.5)*CELL), V(CELL*0.98, y, CELL*0.98), terrainColor(v)); } cols.end();
        res = {before, after:steep()}; }
      return res; }};
  },
  readout:(p,o)=>[['steepest slope at the start', f(o.before,0)+'°'],['steepest slope now', f(o.after,0)+'°','acc'],['passes', String(p.iter)]],
  code:(p)=>`local TALUS, RATE = ${p.talus}, 0.12      -- steepest step that can stay put, and how fast the rest slides

for _ = 1, ${p.iter} do
    local change = {}
    for x = 1, SIZE do
        for z = 1, SIZE do
            for _, d in { {1, 0}, {-1, 0}, {0, 1}, {0, -1} } do
                local nx, nz = x + d[1], z + d[2]
                local diff = Height(x, z) - Height(nx, nz)        -- nil checks for the edge skipped here
                if diff > TALUS then
                    local amount = (diff - TALUS) * RATE
                    Add(change, x, z, -amount)                    -- take from the high cell
                    Add(change, nx, nz, amount)                   -- give to the low neighbour
                end
            end
        end
    end
    ApplyChanges(change)    -- apply after the pass, so cells don't see half-updated neighbours
end`,
  body:`<p>Noise terrain is often too sharp: spiky peaks that real rock couldn't hold up. <b>Thermal erosion</b> fakes rock crumbling. Wherever a cell is higher than a neighbour by more than a set amount (the <b>talus</b> step), some material slides down to that neighbour. Repeat, and slopes settle to a natural angle with scree piling at the bottom.</p>
<p>Start at 0 passes to see the raw ridged noise, then add passes: peaks round off and valleys fill. The total amount of ground never changes; it only moves.</p>`,
  uses:[`<b>More natural mountains</b> before turning a heightmap into Terrain.`,`<b>Sand dunes and scree slopes</b> (a larger talus keeps more shape).`,`<b>Smoothing player-dug terrain</b> over time.`],
  gotchas:[`Collect all changes for a pass and apply them together; changing cells mid-pass makes the result lopsided.`,`Erosion is slow on big maps. Run it once when generating and save the result, not every time a server starts.`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'pg-marching', title:'Marching squares: smooth outlines', short:'16 cases per cell, slide to the crossing', sig:'case = TL·8 + TR·4 + BR·2 + BL·1   ·   crossing t = (threshold − a) / (b − a)',
  view:{theta:0.0, phi:0.32, r:25, ty:0}, env:'none',
  params:[R('thr','Threshold',-0.4,0.4,0.01,0), R('scale','Scale',0.08,0.4,0.01,0.2), T('interp','Slide to the exact crossing',true), T('dots','Show corner values',true), R('seed','Seed',0,40,1,4)],
  setup(K){ const NX = 26, NZ = 19, gap = 0.85, dots = inst(K, (NX+1)*(NZ+1), {geo:G.sphere}), lines = K.add(new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:C('--accent')})));
    const fillM = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({color:C('--accent'), transparent:true, opacity:0.22, side:THREE.DoubleSide, depthWrite:false})); K.add(fillM); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k;
        const v = (i,j)=>noise(i*p.scale + 0.31, j*p.scale + 0.47, p.seed*5.3)*1.5, P = (x,z)=>V((x - NX/2)*gap, 0.06, (z - NZ/2)*gap), vals = [];
        for (let j=0;j<=NZ;j++){ vals.push([]); for (let i=0;i<=NX;i++) vals[j].push(v(i,j)); }
        dots.begin(); if (p.dots) for (let j=0;j<=NZ;j++) for (let i=0;i<=NX;i++){ const on = vals[j][i] > p.thr; dots.add(P(i,j), on ? 0.1 : 0.05, on ? '--accent' : '--muted'); } dots.end();
        const seg = [], tri = []; let cases = new Set();
        const cross = (a, b, A, Bp)=>{ const t = p.interp ? clamp((p.thr - a)/(b - a), 0, 1) : 0.5; return [A[0] + (Bp[0]-A[0])*t, A[1] + (Bp[1]-A[1])*t]; };
        for (let j=0;j<NZ;j++) for (let i=0;i<NX;i++){
          const c = [[i,j],[i+1,j],[i+1,j+1],[i,j+1]], w = c.map(([x,z])=>vals[z][x]), on = w.map(x=>x > p.thr);
          const id = (on[0]?8:0) + (on[1]?4:0) + (on[2]?2:0) + (on[3]?1:0); cases.add(id); if (id === 0) continue;
          // points around the square: corners and edge crossings, in order; keep the inside ones as a polygon
          const poly = []; for (let e=0;e<4;e++){ const n = (e+1) % 4; if (on[e]) poly.push(c[e]); if (on[e] !== on[n]) poly.push(cross(w[e], w[n], c[e], c[n])); }
          for (let q=1;q<poly.length-1;q++) tri.push(P(...poly[0]), P(...poly[q]), P(...poly[q+1]));
          const ed = []; for (let e=0;e<4;e++){ const n = (e+1) % 4; if (on[e] !== on[n]) ed.push(cross(w[e], w[n], c[e], c[n])); }
          if (ed.length === 2) seg.push(P(...ed[0]), P(...ed[1]));
          else if (ed.length === 4){ const mid = (w[0]+w[1]+w[2]+w[3])/4 > p.thr; if (mid === on[0]){ seg.push(P(...ed[0]), P(...ed[1]), P(...ed[2]), P(...ed[3])); } else { seg.push(P(...ed[3]), P(...ed[0]), P(...ed[1]), P(...ed[2])); } } }
        lines.geometry.dispose(); lines.geometry = new THREE.BufferGeometry().setFromPoints(seg.map(q=>q.clone().setY(0.1)));
        fillM.geometry.dispose(); fillM.geometry = new THREE.BufferGeometry().setFromPoints(tri);
        res = {segs:seg.length/2, cases:cases.size}; }
      return res; }};
  },
  readout:(p,o)=>[['outline segments', String(o.segs),'acc'],['different cases seen', `${o.cases} of 16`],['crossing', p.interp ? 'interpolated' : 'edge midpoint (blocky)']],
  code:()=>`-- one grid square: corners are values from noise; inside = value > THRESHOLD
local function Crossing(a: number, b: number, pointA: Vector2, pointB: Vector2): Vector2
    local t = (THRESHOLD - a) / (b - a)          -- where along the edge the value hits the threshold
    return pointA:Lerp(pointB, t)
end

local caseIndex = (tl > THRESHOLD and 8 or 0) + (tr > THRESHOLD and 4 or 0)
    + (br > THRESHOLD and 2 or 0) + (bl > THRESHOLD and 1 or 0)
-- 0 = all outside, 15 = all inside, anything else: an outline crosses this square.
-- For each edge whose two corners disagree, find its Crossing(); join the crossings with a line.`,
  body:`<p>A grid of values (from noise, a heightmap or a density) can be turned into smooth outlines. Look at each square's four corners: each is inside or outside, which gives <b>16 cases</b>. Wherever an edge has one corner inside and one outside, the outline crosses that edge, so join those crossings with a line.</p>
<p>The smooth part is <b>where</b> on the edge the line crosses. Using the midpoint gives a blocky, 45° look. Sliding the point by how close each corner's value is to the threshold gives smooth curves; turn the toggle off to compare. Run the same idea in 3D (<i>marching cubes</i>) and you get smooth surfaces, which is how voxel terrain gets its smooth look.</p>`,
  uses:[`<b>Smooth cave and island outlines</b> from blocky grids.`,`<b>Contour lines</b> on maps and minimaps.`,`<b>Metaballs and blobby UI effects.</b>`],
  gotchas:[`Cases 5 and 10 (opposite corners inside) are ambiguous. Average the four corners to decide which way the lines join, as here.`,`Roblox smooth Terrain does this for you: each voxel's <i>occupancy</i> (0 to 1) is the same kind of value.`]
});

/* ---------------------------------------------------------------- */
const LEVELS = ['#1e5bb8','#3b7fd6','#e4d19a','#5fae4f','#2f7a35','#8a8a8a'].map(hex), LNAMES = ['deep water','water','sand','grass','forest','mountain'];
demo({
  id:'pg-wfc', title:'Wave function collapse (tiles that fit)', short:'pick the most certain cell, then rule out what can\'t touch it', sig:'repeat: collapse the cell with the fewest options; shrink its neighbours\' options',
  view:{theta:0.0, phi:0.6, r:26, ty:0}, env:'none', time:true,
  params:[R('speed','Cells per second',5,120,1,30), R('water','Water weight',0.2,3,0.1,1), R('seed','Seed',1,60,1,5)],
  setup(K){ const Wd = 18, Hd = 13, cs = 1.1, cells = inst(K, Wd*Hd), ghosts = inst(K, Wd*Hd, {opacity:0.25});
    return {update(p,t){
      const r = mulberry32(p.seed*57), lo = new Int8Array(Wd*Hd), hi = new Int8Array(Wd*Hd).fill(5), tie = Array.from({length:Wd*Hd}, ()=>r()*0.5), done = new Uint8Array(Wd*Hd);
      const weight = l=>l <= 1 ? p.water : l === 5 ? 0.6 : 1, steps = Math.floor(t*p.speed) % (Wd*Hd + 30); let collapsed = 0;
      for (let s=0; s<Math.min(steps, Wd*Hd); s++){
        let best = -1, bs = 1e9; for (let i=0;i<Wd*Hd;i++){ if (done[i]) continue; const e = hi[i] - lo[i] + tie[i]; if (e < bs){ bs = e; best = i; } } if (best < 0) break;
        let tot = 0; for (let l=lo[best]; l<=hi[best]; l++) tot += weight(l); let pick = r()*tot, v = lo[best]; for (let l=lo[best]; l<=hi[best]; l++){ pick -= weight(l); if (pick <= 0){ v = l; break; } }
        lo[best] = hi[best] = v; done[best] = 1; collapsed++;
        const q = [best]; while (q.length){ const i = q.pop(), x = i % Wd, z = (i/Wd)|0;
          for (const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){ const X = x+a, Z = z+b; if (X<0||Z<0||X>=Wd||Z>=Hd) continue; const j = X + Z*Wd;
            const nl = Math.max(lo[j], lo[i] - 1), nh = Math.min(hi[j], hi[i] + 1); if (nl !== lo[j] || nh !== hi[j]){ lo[j] = nl; hi[j] = Math.max(nl, nh); q.push(j); } } } }
      cells.begin(); ghosts.begin(); let opts = 0;
      for (let z=0;z<Hd;z++) for (let x=0;x<Wd;x++){ const i = x + z*Wd, P = V((x - Wd/2 + 0.5)*cs, 0, (z - Hd/2 + 0.5)*cs);
        if (done[i]){ const ht = 0.2 + lo[i]*0.25; cells.add(P.setY(ht/2), V(cs*0.97, ht, cs*0.97), LEVELS[lo[i]]); }
        else { const n = hi[i] - lo[i] + 1; opts += n; ghosts.add(P.setY(n*0.12), V(cs*0.8, n*0.24, cs*0.8), LEVELS[(lo[i] + hi[i]) >> 1]); } }
      cells.end(); ghosts.end(); const left = Wd*Hd - collapsed;
      return {collapsed, total:Wd*Hd, avg:left ? opts/left : 0};
    }};
  },
  readout:(p,o)=>[['cells decided', `${o.collapsed} / ${o.total}`,'acc'],['average options left', o.avg ? f(o.avg,1) + ' of 6' : 'done']],
  code:()=>`-- 6 tiles in order: deep water, water, sand, grass, forest, mountain.
-- Rule: neighbours may differ by at most one step (no sand next to deep water, no mountain on a beach).
-- Each cell keeps the range of tiles it could still be: low..high.

while true do
    local cell = FewestOptions()               -- the most certain undecided cell
    if not cell then break end
    cell.Low = WeightedPick(cell.Low, cell.High)
    cell.High = cell.Low

    local stack = { cell }                     -- tell the neighbours, and their neighbours...
    while #stack > 0 do
        local current = table.remove(stack)
        for _, neighbour in Neighbours(current) do
            local low = math.max(neighbour.Low, current.Low - 1)
            local high = math.min(neighbour.High, current.High + 1)
            if low ~= neighbour.Low or high ~= neighbour.High then
                neighbour.Low, neighbour.High = low, high
                table.insert(stack, neighbour)
            end
        end
    end
end`,
  body:`<p><b>Wave function collapse</b> builds a map from tiles and rules about which tiles may touch. Every cell starts able to be anything (the grey ghosts; taller means more options). Repeatedly pick the cell with the <b>fewest options left</b>, choose one tile for it, then remove options from its neighbours that would break a rule, spreading outward until nothing else changes.</p>
<p>The rule here is simple (neighbours may differ by at most one step), so water always meets land through a beach and mountains rise through forest. Real tile sets use rules per edge: road meets road, wall meets wall.</p>`,
  uses:[`<b>Towns, dungeons and tile maps</b> that obey your art's edge rules.`,`<b>Building layouts</b> from a small set of modular pieces.`,`<b>Pattern and texture generation.</b>`],
  gotchas:[`With strict rules, a cell can end up with no options left (a contradiction). Restart, or undo a few choices and try again.`,`Picking the fewest-options cell first is what keeps contradictions rare. Break ties randomly so the map doesn't grow in rows.`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'pg-bsp', title:'Rooms and corridors (BSP dungeons)', short:'split, split again, put a room in each piece', sig:'split the area in two (along its long side), recurse; leaf → room; join sibling rooms',
  view:{theta:0.0, phi:0.4, r:28, ty:0}, env:'none',
  params:[R('depth','Splits',1,6,1,4), R('min','Smallest piece',5,14,1,7), T('lines','Show the splits',true), R('seed','Seed',1,60,1,12)],
  setup(K){ const Wd = 48, Hd = 34, cs = 0.5, cells = inst(K, Wd*Hd), lines = K.add(new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:C('--vb')}))); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; const r = mulberry32(p.seed*37), grid = Array.from({length:Hd}, ()=>new Int8Array(Wd)), cuts = []; let rooms = 0, corridors = 0;
        const W2 = (x,z)=>V((x - Wd/2)*cs, 1.3, (z - Hd/2)*cs);
        const carve = (x0,z0,x1,z1,v)=>{ for (let z=Math.min(z0,z1); z<=Math.max(z0,z1); z++) for (let x=Math.min(x0,x1); x<=Math.max(x0,x1); x++) if (grid[z][x] !== 1) grid[z][x] = v; };
        const build = (x, z, w, h, d)=>{ const canV = w >= p.min*2, canH = h >= p.min*2;
          if (d < p.depth && (canV || canH)){ const vert = canV && (!canH || w > h || (w === h && r() < 0.5)), span = vert ? w : h, at = p.min + Math.floor(r()*(span - p.min*2 + 1));
            let a, b; if (vert){ cuts.push(W2(x+at, z), W2(x+at, z+h)); a = build(x, z, at, h, d+1); b = build(x+at, z, w-at, h, d+1); }
            else { cuts.push(W2(x, z+at), W2(x+w, z+at)); a = build(x, z, w, at, d+1); b = build(x, z+at, w, h-at, d+1); }
            const [ax, az] = a, [bx, bz] = b; if (r() < 0.5){ carve(ax, az, bx, az, 2); carve(bx, az, bx, bz, 2); } else { carve(ax, az, ax, bz, 2); carve(ax, bz, bx, bz, 2); } corridors++;
            return r() < 0.5 ? a : b; }
          const rw = Math.max(3, Math.floor(w*(0.5 + r()*0.3))), rh = Math.max(3, Math.floor(h*(0.5 + r()*0.3))), rx = x + 1 + Math.floor(r()*Math.max(1, w - rw - 1)), rz = z + 1 + Math.floor(r()*Math.max(1, h - rh - 1));
          const ex = Math.min(rx + rw - 1, x + w - 2), ez = Math.min(rz + rh - 1, z + h - 2); for (let zz=rz; zz<=ez; zz++) for (let xx=rx; xx<=ex; xx++) grid[zz][xx] = 1; rooms++;
          return [Math.floor((rx + ex)/2), Math.floor((rz + ez)/2)]; };
        build(0, 0, Wd, Hd, 0);
        cells.begin(); for (let z=0;z<Hd;z++) for (let x=0;x<Wd;x++){ const v = grid[z][x], P = V((x - Wd/2 + 0.5)*cs, v ? 0.05 : 0.5, (z - Hd/2 + 0.5)*cs);
          cells.add(P, V(cs*0.98, v ? 0.1 : 1, cs*0.98), v === 1 ? '--va' : v === 2 ? '--y' : '--part'); } cells.end();
        lines.visible = p.lines; lines.geometry.dispose(); lines.geometry = new THREE.BufferGeometry().setFromPoints(cuts); res = {rooms, corridors}; }
      return res; }};
  },
  readout:(p,o)=>[['rooms', String(o.rooms),'acc'],['corridors', String(o.corridors)],['always connected', 'yes', 'ok']],
  code:(p)=>`local MIN, MAX_DEPTH = ${p.min}, ${p.depth}

-- returns the centre of one room inside this area, so the caller can connect to it
local function Build(x: number, z: number, w: number, h: number, depth: number): Vector2
    local canSplitX, canSplitZ = w >= MIN * 2, h >= MIN * 2
    if depth < MAX_DEPTH and (canSplitX or canSplitZ) then
        local splitX = canSplitX and (not canSplitZ or w > h)      -- cut across the long side
        local at = math.random(MIN, (splitX and w or h) - MIN)
        local a, b
        if splitX then
            a, b = Build(x, z, at, h, depth + 1), Build(x + at, z, w - at, h, depth + 1)
        else
            a, b = Build(x, z, w, at, depth + 1), Build(x, z + at, w, h - at, depth + 1)
        end
        CarveCorridor(a, b)                                        -- an L-shaped hallway joins the two halves
        return if math.random() < 0.5 then a else b
    end
    return CarveRoomInside(x, z, w, h)                              -- a leaf: one room with a margin
end

Build(0, 0, 48, 34, 0)`,
  body:`<p><b>Binary space partitioning</b> makes tidy dungeons. Cut the map in two, across its longer side. Cut each half again, and keep going until the pieces are small (the thin lines show the cuts). Put one room inside each final piece, with a margin, so rooms never overlap.</p>
<p>Then walk back up: at every cut, join a room from one side to a room from the other with an L-shaped corridor. Because every cut gets joined, the whole dungeon is always <b>connected</b>. More splits means more, smaller rooms.</p>`,
  uses:[`<b>Roguelike and dungeon-crawler floors.</b>`,`<b>Office buildings and ship interiors</b>: rooms off hallways.`,`<b>City blocks</b>: split land into plots for buildings.`],
  gotchas:[`If the smallest piece is too small, rooms get squashed into 1-wide strips. Keep it at least room size plus the margins.`,`BSP layouts look gridlike. Add a few random extra corridors for loops, or mix in caves.`]
});

Lab.finder([
  ['Make 3D blobs and holes with noise','noise(x, y, z) > threshold','pg-noise3d'],
  ['Make cliffs with overhangs','density = height falloff + 3D noise','pg-density'],
  ['Make floating sky islands','density band + 3D noise','pg-density'],
  ['Generate caves under terrain','spaghetti / cheese noise caves','pg-caves3d'],
  ['Dig winding tunnels','Perlin worms','pg-worms'],
  ['Put rarer ores deeper underground','depth bands + noise thresholds','pg-ores'],
  ['Pick biomes like desert and forest','temperature + moisture lookup','pg-biomes'],
  ['Make mountains look less spiky','thermal erosion','pg-erosion'],
  ['Turn a grid of values into a smooth outline','marching squares','pg-marching'],
  ['Generate a tile map that follows rules','wave function collapse','pg-wfc'],
  ['Make a dungeon of rooms and corridors','BSP splitting','pg-bsp'],
]);
Lab.ref('proc3d','Procedural 3D & levels',[
  ['noise(x*s, y*s, z*s) > t','Solid where 3D noise is high','math.noise(x*0.13, y*0.13, z*0.13) > 0','Caves, blobs'],
  ['(ground - y)/spread + n*k','Density with overhangs','solid if > 0','Cliffs, arches'],
  ['|n₁| < w and |n₂| < w','Spaghetti cave tunnels','w ≈ 0.1','Cave networks'],
  ['yaw += noise(t) * turn','Perlin worm steering','then FillBall(Air)','Tunnels'],
  ['BIOMES[band(t)][band(m)]','Biome from temperature and moisture','hot + dry → desert','Open worlds'],
  ['move (diff - talus) * rate','Thermal erosion step','talus ≈ 0.01','Natural slopes'],
  ['(t - a) / (b - a)','Marching squares edge crossing','smooth outlines','Contours'],
  ['fewest options first','Wave function collapse','then propagate','Tile maps'],
]);
})();
