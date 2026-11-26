(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, CF, G, R, S, T, clamp, mulberry32} = Lab;
const {graph, inst, labels} = Lab.kit2;
const demo = Lab.subject({
  id:'spatial', title:'Spatial partitioning', glyph:'quad', level:'Advanced',
  blurb:'Making "what is near me?" fast: brute force vs spatial hashing, quadtrees, octrees, nearest-neighbour search, sweep and prune, and level of detail.'
});
const scatter = (n, seed, S2=10)=>{ const r = mulberry32(seed*97); return Array.from({length:n}, ()=>[ (r()*2-1)*S2, (r()*2-1)*S2*0.8 ]); };
function segs(K, color='--muted', opacity=0.7){ const m = K.add(new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:C(color), transparent:true, opacity}))); m.setPts = pts=>{ m.geometry.dispose(); m.geometry = new THREE.BufferGeometry().setFromPoints(pts); }; return m; }

demo({
  id:'sp-brute', title:'Why checking everything gets slow', short:'n² pairs', sig:'pairs = n × (n − 1) / 2',
  view:{theta:0.0, phi:0.75, r:26, ty:1}, env:'grid',
  params:[R('n','Objects',2,40,1,16)],
  setup(K){ const dots = inst(K, 40, {geo:G.sphere}), lines = segs(K,'--accent',0.35); const gr = graph(K,{x0:-10, y0:0.5, w:8, h:5, z:-9, xr:[0,400], yr:[0,80000], xLabel:'objects', xTicks:[[0,'0'],[400,'400']], yTicks:[[80000,'80k checks']]}); const cv = gr.curve('--bad'), cv2 = gr.curve('--ok'), d = gr.dot('--bad');
    return {update(p){
      const pts = scatter(p.n, 3); dots.begin(); pts.forEach(([x,z])=>dots.add(V(x,0.4,z), 0.3, '--va')); dots.end();
      const lp = []; for (let i=0;i<pts.length;i++) for (let j=i+1;j<pts.length;j++) lp.push(V(pts[i][0],0.4,pts[i][1]), V(pts[j][0],0.4,pts[j][1])); lines.setPts(lp);
      cv.plot(n=>n*(n-1)/2); cv2.plot(n=>n*9); d.at(p.n, p.n*(p.n-1)/2);
      return {pairs:p.n*(p.n-1)/2};
    }};
  },
  readout:(p,o)=>[['pairs to check', String(o.pairs),'acc'],['at 400 objects', '79,800 pairs'],['with a grid (≈9 neighbours each)', 'about '+(p.n*9)]],
  code:(p,o)=>`-- the simple way: every object against every other object
for i = 1, #objects do
    for j = i + 1, #objects do
        if (objects[i].Position - objects[j].Position).Magnitude < RANGE then
            onNear(objects[i], objects[j])
        end
    end
end
-- ${p.n} objects → ${o.pairs} checks. Double the objects → 4× the checks.`,
  body:`<p>"Which things are near each other?" sounds simple: check every pair. But the number of pairs grows with the <b>square</b> of the object count. 16 objects is 120 pairs; 400 objects is almost 80,000, every frame. That's the red curve shooting up.</p>
<p>The fix for everything in this subject is the same idea: organise objects by <b>where</b> they are, so you only compare things that could possibly be close. The green line is roughly what a grid costs: it grows in a straight line instead.</p>`,
  uses:[`<b>Spotting the problem</b> before your game slows down with more players or NPCs.`,`<b>Deciding</b> whether you need a spatial structure at all (under ~50 objects, brute force is fine).`],
  gotchas:[`Roblox's own physics and <code>GetPartBoundsInRadius</code> already use spatial structures. You need your own for custom objects that aren't parts.`]
});

demo({
  id:'sp-hash', title:'Spatial hash grids', short:'bucket by cell, check nearby cells', sig:'key = cellX .. "," .. cellZ;  only check the buckets around you',
  view:{theta:0.0, phi:0.5, r:26, ty:0}, env:'none',
  params:[R('n','Objects',20,400,10,250), R('cell','Cell size',1,8,0.5,3), R('qx','Query X',-9,9,0.25,2), R('qz','Query Z',-7,7,0.25,-1), R('r','Query radius',0.5,5,0.25,2.5)],
  setup(K){ const dots = inst(K, 400, {geo:G.sphere}), cellsI = inst(K, 100, {opacity:0.3}), grid = segs(K,'--muted',0.4), ring = K.ring(1,'--accent',{y:0.05}), q = K.point('--accent',0.25);
    return {update(p){
      const pts = scatter(p.n, 5), cs = p.cell, buckets = new Map(), key = (x,z)=>x+','+z; pts.forEach((pt,i)=>{ const k = key(Math.floor(pt[0]/cs), Math.floor(pt[1]/cs)); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(i); });
      const cx0 = Math.floor((p.qx - p.r)/cs), cx1 = Math.floor((p.qx + p.r)/cs), cz0 = Math.floor((p.qz - p.r)/cs), cz1 = Math.floor((p.qz + p.r)/cs); let checks = 0; const hits = new Set(), cand = new Set();
      cellsI.begin(); for (let cx=cx0; cx<=cx1; cx++) for (let cz=cz0; cz<=cz1; cz++){ cellsI.add(V((cx+0.5)*cs, 0.02, (cz+0.5)*cs), V(cs*0.98,0.04,cs*0.98), '--va'); (buckets.get(key(cx,cz))||[]).forEach(i=>{ checks++; cand.add(i); if (Math.hypot(pts[i][0]-p.qx, pts[i][1]-p.qz) <= p.r) hits.add(i); }); } cellsI.end();
      dots.begin(); pts.forEach(([x,z],i)=>dots.add(V(x,0.25,z), 0.16, hits.has(i) ? '--accent' : cand.has(i) ? '--vb' : '--part')); dots.end();
      const gp = []; for (let x=Math.floor(-10/cs)*cs; x<=10; x+=cs) gp.push(V(x,0.01,-8), V(x,0.01,8)); for (let z=Math.floor(-8/cs)*cs; z<=8; z+=cs) gp.push(V(-10,0.01,z), V(10,0.01,z)); grid.setPts(gp);
      ring.scale.set(p.r,1,p.r); ring.position.set(p.qx,0,p.qz); q.position.set(p.qx,0.3,p.qz);
      return {checks, hits:hits.size, n:p.n};
    }};
  },
  readout:(p,o)=>[['checks with the grid', String(o.checks),'acc'],['checks without', String(o.n)],['found', String(o.hits)]],
  code:(p,o)=>`local CELL = ${p.cell}
local buckets = {}                               -- "x,z" → list of objects

local function keyOf(pos)
    return math.floor(pos.X / CELL) .. "," .. math.floor(pos.Z / CELL)
end

local function insert(obj)
    local k = keyOf(obj.Position)
    buckets[k] = buckets[k] or {}
    table.insert(buckets[k], obj)
end

local function queryRadius(center, radius)
    local found = {}
    for cx = math.floor((center.X - radius) / CELL), math.floor((center.X + radius) / CELL) do
        for cz = math.floor((center.Z - radius) / CELL), math.floor((center.Z + radius) / CELL) do
            for _, obj in buckets[cx .. "," .. cz] or {} do
                if (obj.Position - center).Magnitude <= radius then table.insert(found, obj) end
            end
        end
    end
    return found               -- checked ${o.checks} objects instead of ${o.n}
end`,
  body:`<p>A <b>spatial hash</b> drops every object into a bucket for the grid cell it's in. To find things near a point, only look in the buckets the search circle touches (shaded). Everything else is skipped without even measuring a distance.</p>
<p>Pink dots were checked but turned out too far; orange dots are real hits. The cell size matters: too big and each bucket holds too much; too small and a query touches many empty buckets. A good start is about the size of your typical query radius.</p>`,
  uses:[`<b>Projectile vs enemy checks</b> for hundreds of bullets.`,`<b>Boids and crowd separation</b>.`,`<b>Proximity prompts and auras</b> for custom objects.`],
  gotchas:[`Moving objects must be moved between buckets when they cross a cell edge. Rebuilding the whole hash each frame is often simpler and fast enough.`]
});

function buildQuad(pts, x, z, w, h, cap, depth, out){ out.push([x,z,w,h]); if (pts.length <= cap || depth >= 7) return 1;
  const hw = w/2, hh = h/2; let n = 1; [[x,z],[x+hw,z],[x,z+hh],[x+hw,z+hh]].forEach(([qx,qz])=>{ n += buildQuad(pts.filter(([px,pz])=>px>=qx&&px<qx+hw&&pz>=qz&&pz<qz+hh), qx, qz, hw, hh, cap, depth+1, out); }); return n; }
demo({
  id:'sp-quadtree', title:'Quadtrees', short:'split busy squares into four', sig:'if a node holds more than CAPACITY points, split it into 4 children',
  view:{theta:0.0, phi:0.4, r:26, ty:0}, env:'none',
  params:[R('n','Points',10,400,10,180), R('cap','Capacity per node',1,16,1,4), S('dist','Distribution',[['clumps','Clumped (cities)'],['even','Even']],'clumps')],
  setup(K){ const dots = inst(K, 400, {geo:G.sphere}), boxes = segs(K,'--accent',0.8);
    return {update(p){
      const r = mulberry32(11), pts = []; const centers = [[-5,-3],[4,4],[6,-5]];
      for (let i=0;i<p.n;i++){ if (p.dist==='even') pts.push([(r()*2-1)*10, (r()*2-1)*10]); else { const c = centers[i%3], a = r()*Math.PI*2, d = Math.pow(r(),2)*4; pts.push([clamp(c[0]+Math.cos(a)*d,-9.99,9.99), clamp(c[1]+Math.sin(a)*d,-9.99,9.99)]); } }
      const out = []; const nodes = buildQuad(pts, -10, -10, 20, 20, p.cap, 0, out); const lp = [];
      out.forEach(([x,z,w,h])=>{ const y = 0.03; lp.push(V(x,y,z),V(x+w,y,z), V(x+w,y,z),V(x+w,y,z+h), V(x+w,y,z+h),V(x,y,z+h), V(x,y,z+h),V(x,y,z)); }); boxes.setPts(lp);
      dots.begin(); pts.forEach(([x,z])=>dots.add(V(x,0.2,z), 0.13, '--va')); dots.end(); return {nodes};
    }};
  },
  readout:(p,o)=>[['nodes', String(o.nodes),'acc'],['max depth', '7']],
  code:(p)=>`local CAPACITY = ${p.cap}

local function newNode(x, z, size)
    return { x = x, z = z, size = size, points = {}, children = nil }
end

local function insert(node, point)
    if node.children then
        insert(childFor(node, point), point)       -- go down to the right quarter
        return
    end
    table.insert(node.points, point)
    if #node.points > CAPACITY and node.size > MIN_SIZE then
        local half = node.size / 2                 -- split into 4
        node.children = {
            newNode(node.x, node.z, half), newNode(node.x + half, node.z, half),
            newNode(node.x, node.z + half, half), newNode(node.x + half, node.z + half, half),
        }
        for _, p in node.points do insert(childFor(node, p), p) end
        node.points = {}
    end
end`,
  body:`<p>A uniform grid wastes cells on empty areas and overfills busy ones. A <b>quadtree</b> adapts: start with one square covering everything; whenever a square holds too many points, split it into four quarters, and keep splitting where things are crowded.</p>
<p>Look at the clumped layout: tiny squares pile up around the three "cities" while empty space stays as a few big squares. Searching walks down only the squares that overlap your query, so busy and empty regions both stay fast.</p>`,
  uses:[`<b>Maps with uneven density</b>: cities and wilderness, crowded bases.`,`<b>Collision and visibility queries</b> over big 2D worlds.`,`<b>Level of detail</b>: deeper nodes for areas near the camera.`],
  gotchas:[`Cap the depth (or minimum size), or many points at the exact same spot split forever.`]
});

demo({
  id:'sp-octree', title:'Octrees in 3D', short:'split cubes into eight', sig:'same as a quadtree, but each cube splits into 8 smaller cubes',
  view:{theta:0.7, phi:0.9, r:26, ty:5}, env:'grid',
  params:[R('n','Points',10,300,10,140), R('cap','Capacity per node',1,12,1,4)],
  setup(K){ const dots = inst(K, 300, {geo:G.sphere}), boxes = segs(K,'--accent',0.6);
    function build(pts, x, y, z, s, depth, out){ out.push([x,y,z,s]); if (pts.length <= 0 || pts.length <= this_cap || depth >= 5) return 1; let n = 1; const h = s/2;
      for (const dx of [0,h]) for (const dy of [0,h]) for (const dz of [0,h]) n += build(pts.filter(([a,b,c])=>a>=x+dx&&a<x+dx+h&&b>=y+dy&&b<y+dy+h&&c>=z+dz&&c<z+dz+h), x+dx, y+dy, z+dz, h, depth+1, out); return n; }
    let this_cap = 4;
    return {update(p){
      this_cap = p.cap; const r = mulberry32(19), pts = []; for (let i=0;i<p.n;i++){ const a = r()*Math.PI*2, b = Math.acos(r()*2-1), d = 2 + r()*1.5*(i%2 ? 1 : 2.5); pts.push([clamp(Math.sin(b)*Math.cos(a)*d,-4.99,4.99), clamp(5 + Math.cos(b)*d,0.01,9.99), clamp(Math.sin(b)*Math.sin(a)*d,-4.99,4.99)]); }
      const out = []; const nodes = build(pts, -5, 0, -5, 10, 0, out); const lp = [];
      out.forEach(([x,y,z,s])=>{ const c = [[0,0,0],[s,0,0],[s,0,s],[0,0,s],[0,s,0],[s,s,0],[s,s,s],[0,s,s]].map(([a,b,d])=>V(x+a,y+b,z+d)); [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([i,j])=>lp.push(c[i],c[j])); }); boxes.setPts(lp);
      dots.begin(); pts.forEach(([x,y,z])=>dots.add(V(x,y,z), 0.12, '--va')); dots.end(); return {nodes};
    }};
  },
  readout:(p,o)=>[['nodes', String(o.nodes),'acc']],
  code:(p)=>`-- each node: a cube (corner + size), up to ${p.cap} points, or 8 children
local function childIndex(node, p)              -- which eighth is p in? 0..7
    local half = node.size / 2
    local i = 0
    if p.X >= node.corner.X + half then i += 1 end
    if p.Y >= node.corner.Y + half then i += 2 end
    if p.Z >= node.corner.Z + half then i += 4 end
    return i
end`,
  body:`<p>An <b>octree</b> is a quadtree in 3D: each cube that gets too full splits into eight smaller cubes (halving it along X, Y and Z). It suits worlds that are full in all three directions: space games, flying games, voxel worlds, or anything with lots of height.</p>
<p>The points here form a shell around a sphere with a thicker band, and the cubes subdivide only where points actually are. Orbit the view to see the empty middle left as big cubes.</p>`,
  uses:[`<b>Space and flight games</b> with objects at all heights.`,`<b>Voxel worlds</b>: store solid/empty regions compactly.`,`<b>3D proximity and visibility queries</b>.`],
  gotchas:[`If your world is mostly flat (most Roblox maps), a quadtree or 2D grid on X/Z is simpler and just as good.`]
});

demo({
  id:'sp-nearest', title:'Nearest neighbour search', short:'expand rings until sure', sig:'search cells ring by ring; stop when the next ring is further than the best found',
  view:{theta:0.0, phi:0.5, r:26, ty:0}, env:'none',
  params:[R('n','Objects',10,400,10,150), R('qx','Query X',-9,9,0.25,-3), R('qz','Query Z',-7,7,0.25,2), S('mode','Method',[['grid','Grid rings'],['brute','Check every object']],'grid')],
  setup(K){ const dots = inst(K, 400, {geo:G.sphere}), cellsI = inst(K, 120, {opacity:0.25}), line = K.line('--accent'), q = K.point('--accent',0.3);
    return {update(p){
      const pts = scatter(p.n, 23), cs = 2, buckets = new Map(), key = (x,z)=>x+','+z; pts.forEach((pt,i)=>{ const k = key(Math.floor(pt[0]/cs), Math.floor(pt[1]/cs)); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(i); });
      let best = -1, bd = Infinity, checks = 0; const seen = new Set(); cellsI.begin();
      if (p.mode==='brute'){ pts.forEach(([x,z],i)=>{ checks++; seen.add(i); const d = Math.hypot(x-p.qx,z-p.qz); if (d < bd){ bd = d; best = i; } }); }
      else { const qx = Math.floor(p.qx/cs), qz = Math.floor(p.qz/cs); for (let ring=0; ring<12; ring++){ if (best >= 0 && (ring-1)*cs > bd) break;
          for (let dx=-ring; dx<=ring; dx++) for (let dz=-ring; dz<=ring; dz++){ if (Math.max(Math.abs(dx),Math.abs(dz)) !== ring) continue; cellsI.add(V((qx+dx+0.5)*cs, 0.02, (qz+dz+0.5)*cs), V(cs*0.96,0.04,cs*0.96), ring%2 ? '--va' : '--vb');
            (buckets.get(key(qx+dx,qz+dz))||[]).forEach(i=>{ checks++; seen.add(i); const d = Math.hypot(pts[i][0]-p.qx, pts[i][1]-p.qz); if (d < bd){ bd = d; best = i; } }); } } }
      cellsI.end(); dots.begin(); pts.forEach(([x,z],i)=>dots.add(V(x,0.25,z), i===best ? 0.3 : 0.15, i===best ? '--accent' : seen.has(i) ? '--muted' : '--part')); dots.end();
      q.position.set(p.qx,0.3,p.qz); if (best >= 0) line.set(V(p.qx,0.3,p.qz), V(pts[best][0],0.3,pts[best][1]));
      return {checks, bd};
    }};
  },
  readout:(p,o)=>[['distance checks', String(o.checks),'acc'],['nearest is', f(o.bd,2)+' away']],
  code:(p)=>`local function nearest(pos)
    local cx, cz = cellOf(pos)
    local best, bestDist = nil, math.huge
    for ring = 0, MAX_RINGS do
        -- every cell in this ring is at least (ring - 1) * CELL away
        if best and (ring - 1) * CELL > bestDist then break end
        for dx = -ring, ring do
            for dz = -ring, ring do
                if math.max(math.abs(dx), math.abs(dz)) == ring then        -- the ring's edge only
                    for _, obj in bucket(cx + dx, cz + dz) do
                        local d = (obj.Position - pos).Magnitude
                        if d < bestDist then best, bestDist = obj, d end
                    end
                end
            end
        end
    end
    return best, bestDist
end`,
  body:`<p>"Which enemy is closest?" normally means measuring every enemy. With a grid, search outward in <b>rings</b> of cells around the query point. Once you've found something, you can stop as soon as the next ring is further away than your best distance, because nothing beyond it could be closer.</p>
<p>Switch between methods and compare the number of distance checks. Grey dots were measured; the rest were never looked at.</p>`,
  uses:[`<b>Auto-targeting</b>: nearest enemy for turrets and homing attacks.`,`<b>Nearest pickup, spawn or shop</b>.`,`<b>Snapping</b> to the nearest connection point in building games.`],
  gotchas:[`Keep searching one ring past where you first find something: a closer object can sit in a corner of the next ring.`]
});

demo({
  id:'sp-sweep', title:'Sweep and prune', short:'sort by X, only test overlaps', sig:'sort boxes by min X; sweep left to right keeping an "active" list',
  view:{theta:0.0, phi:0.45, r:26, ty:0}, env:'grid',
  params:[R('n','Boxes',4,60,1,24), R('size','Box size',0.4,3,0.1,1.4), R('seed','Seed',1,40,1,6)],
  setup(K){ const boxes = inst(K, 60, {opacity:0.75}), bars = inst(K, 60), pairs = segs(K,'--bad',0.9);
    return {update(p){
      const r = mulberry32(p.seed*13), B = Array.from({length:p.n}, ()=>{ const x = (r()*2-1)*9, z = (r()*2-1)*6, w = p.size*(0.5+r()), d = p.size*(0.5+r()); return {x0:x-w/2, x1:x+w/2, z0:z-d/2, z1:z+d/2}; });
      const order = B.map((b,i)=>i).sort((a,b)=>B[a].x0 - B[b].x0), active = []; let tests = 0; const hits = [];
      order.forEach(i=>{ for (let k=active.length-1;k>=0;k--) if (B[active[k]].x1 < B[i].x0) active.splice(k,1); active.forEach(j=>{ tests++; if (B[i].z0 <= B[j].z1 && B[j].z0 <= B[i].z1) hits.push([i,j]); }); active.push(i); });
      const hitSet = new Set(hits.flat()); boxes.begin(); bars.begin();
      B.forEach((b,i)=>{ boxes.add(V((b.x0+b.x1)/2, 0.3, (b.z0+b.z1)/2), V(b.x1-b.x0, 0.6, b.z1-b.z0), hitSet.has(i) ? '--bad' : '--va'); bars.add(V((b.x0+b.x1)/2, 0.05, 8 + (order.indexOf(i)%6)*0.45), V(b.x1-b.x0, 0.1, 0.3), '--accent'); });
      boxes.end(); bars.end(); pairs.setPts(hits.flatMap(([i,j])=>[V((B[i].x0+B[i].x1)/2,0.8,(B[i].z0+B[i].z1)/2), V((B[j].x0+B[j].x1)/2,0.8,(B[j].z0+B[j].z1)/2)]));
      return {tests, all:p.n*(p.n-1)/2, hits:hits.length};
    }};
  },
  readout:(p,o)=>[['pair tests', String(o.tests),'acc'],['brute force would test', String(o.all)],['overlapping pairs', String(o.hits)]],
  code:(p,o)=>`table.sort(boxes, function(a, b) return a.minX < b.minX end)

local active = {}
for _, box in boxes do
    -- drop boxes that ended before this one starts: they can't touch anything later
    for i = #active, 1, -1 do
        if active[i].maxX < box.minX then table.remove(active, i) end
    end
    for _, other in active do                 -- only these overlap on X
        if box.minZ <= other.maxZ and other.minZ <= box.maxZ then
            onOverlap(box, other)
        end
    end
    table.insert(active, box)
end
-- ${o.tests} tests instead of ${o.all}`,
  body:`<p><b>Sweep and prune</b> uses one cheap observation: two boxes can only overlap if their ranges on the X axis overlap. Sort the boxes by their left edge, then sweep from left to right, keeping a list of boxes that are still "open". Each new box is only compared with the open ones.</p>
<p>The orange bars at the bottom are each box's X range. Red boxes overlap something. It works especially well when objects are spread out along one direction, and because sorting barely changes between frames, re-sorting stays fast.</p>`,
  uses:[`<b>Broad-phase collision</b> in custom physics.`,`<b>Overlap checks</b> for many building pieces or zones.`,`<b>Timelines</b>: finding overlapping events in time (same maths in 1D).`],
  gotchas:[`If everything bunches up on X (a tall tower), sweep on the axis with the most spread instead.`]
});

demo({
  id:'sp-lod', title:'Level of detail by distance', short:'near: every frame · far: rarely', sig:'tier = distance < 30 and "high" or distance < 80 and "medium" or "low"', time:true,
  view:{theta:0.0, phi:0.45, r:30, ty:0}, env:'grid',
  params:[R('px','Player X',-10,10,0.25,-3), R('pz','Player Z',-8,8,0.25,1), R('near','Near radius',1,8,0.5,4), R('far','Far radius',4,14,0.5,8)],
  setup(K){ const items = inst(K, 200), pl = K.part(V(0.8,1.6,0.8),'--vb',{front:false}), r1 = K.ring(1,'--accent',{y:0.04}), r2 = K.ring(1,'--va',{y:0.04, dashed:true});
    return {update(p,t){
      const pts = scatter(200, 41, 11), far = Math.max(p.far, p.near + 0.5); let counts = [0,0,0]; const frame = Math.floor(t*30); items.begin();
      pts.forEach(([x,z],i)=>{ const d = Math.hypot(x-p.px, z-p.pz), tier = d < p.near ? 0 : d < far ? 1 : 2; counts[tier]++;
        const updates = tier === 0 || (tier === 1 && (frame + i) % 4 === 0); const bob = tier === 0 ? Math.sin(t*4 + i) * 0.3 : tier === 1 ? Math.sin(Math.floor(t*7.5)*4/7.5*1 + i)*0.3 : 0;
        items.add(V(x, 0.4 + bob, z), tier === 2 ? 0.25 : 0.55, tier === 0 ? '--accent' : tier === 1 ? '--va' : '--part'); });
      items.end(); pl.position.set(p.px,0.8,p.pz); r1.scale.set(p.near,1,p.near); r1.position.set(p.px,0,p.pz); r2.scale.set(far,1,far); r2.position.set(p.px,0,p.pz);
      return {counts, work: counts[0] + counts[1]/4};
    }};
  },
  readout:(p,o)=>[['high detail (every frame)', String(o.counts[0]),'acc'],['medium (every 4th frame)', String(o.counts[1])],['low (frozen / simple)', String(o.counts[2])],['updates per frame', f(o.work,0)+' instead of 200']],
  code:(p)=>`local NEAR, FAR = ${p.near}, ${p.far}
local NEAR2, FAR2 = NEAR * NEAR, FAR * FAR       -- compare squared distances: no square root
local frame = 0

RunService.Heartbeat:Connect(function(dt)
    frame += 1
    local camPos = camera.CFrame.Position
    for i, npc in npcs do
        local offset = npc.Position - camPos
        local d2 = offset:Dot(offset)
        if d2 < NEAR2 then
            animateFully(npc, dt)                     -- every frame
        elseif d2 < FAR2 then
            if (frame + i) % 4 == 0 then animateFully(npc, dt * 4) end   -- every 4th, staggered
        else
            -- far away: skip, or swap to a cheap model
        end
    end
end)`,
  body:`<p>Things far from the player don't need the same care as things right in front of them. <b>Level of detail</b> sorts objects into tiers by distance: near ones get full updates every frame, mid-range ones every few frames, and far ones are frozen, simplified or hidden.</p>
<p>Spreading the mid-range updates across frames (<code>(frame + i) % 4</code>) keeps each frame's work even instead of spiking. Move the player and watch the tiers change; the readout shows how much work is saved.</p>`,
  uses:[`<b>NPC animation and AI</b> in big open worlds.`,`<b>Particle and effect detail</b> by distance.`,`<b>Network updates</b>: send far-away players' positions less often.`],
  gotchas:[`Use slightly different radii for moving into and out of a tier (hysteresis, see Signals) so objects on the boundary don't flicker.`]
});

Lab.finder([
  ['Understand why many objects get slow','n² pair checks','sp-brute'],
  ['Find objects near a point quickly','spatial hash grid','sp-hash'],
  ['Handle crowded and empty areas efficiently','quadtree','sp-quadtree'],
  ['Organise objects in 3D space','octree','sp-octree'],
  ['Find the closest enemy fast','grid ring search','sp-nearest'],
  ['Find overlapping boxes quickly','sweep and prune','sp-sweep'],
  ['Update far-away NPCs less often','distance-based LOD','sp-lod'],
]);
})();
