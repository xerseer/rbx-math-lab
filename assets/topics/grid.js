(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, CF, G, R, S, T, clamp} = Lab;
const {inst, labels, cellPos, rng} = Lab.kit2;
const demo = Lab.subject({
  id:'grid', title:'Grids & tiles', glyph:'grid',
  blurb:'Grid coordinates, neighbours, flood fill, hex grids and chunks, then 3D grids and voxels: block picking, hidden faces, greedy meshing, layers, snapping and autotiling.'
});
const W = 12, H = 10, SZ = 1.6;
function gridLines(K, W, H, size, color='--grid'){ const pts = []; const x0 = -W*size/2, z0 = -H*size/2;
  for (let i=0;i<=W;i++) pts.push(V(x0+i*size,0.02,z0), V(x0+i*size,0.02,z0+H*size)); for (let j=0;j<=H;j++) pts.push(V(x0,0.02,z0+j*size), V(x0+W*size,0.02,z0+j*size));
  return K.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:C('--muted'), transparent:true, opacity:0.5}))); }
const cellC = (x,z,y=0.15)=>cellPos(W,H,SZ,x,z,y);
function walls(seed, Wd=W, Hd=H, density=0.22){ const r = rng(seed), w = []; for (let z=0;z<Hd;z++){ w.push([]); for (let x=0;x<Wd;x++) w[z].push(r.next() < density); } return w; }

demo({
  id:'gr-coords', title:'World ↔ grid coordinates', short:'math.floor(pos / size)', sig:'cell = math.floor((pos − origin) / size)   ·   centre = origin + (cell + 0.5) × size',
  view:{theta:0.0, phi:0.5, r:24, ty:0}, env:'grid',
  params:[R('x','World X',-9.5,9.5,0.1,3.3), R('z','World Z',-7.9,7.9,0.1,-2.6), S('size','Cell size',[['1','1'],['2','2'],['4','4']],'2')],
  setup(K){
    let gl = null, key = ''; const cell = K.part(V(1,0.1,1),'--accent',{front:false, opacity:0.5}), pt = K.point('--vb',0.2), ctr = K.point('--ink',0.14), ln = K.line('--muted',{dashed:true});
    const lp = K.label('world point','--vb'), lc = K.label('','--accent','big');
    return {update(p){
      const s = +p.size; if (key !== p.size){ key = p.size; K.drop(gl); gl = gridLines(K, Math.round(20/s), Math.round(16/s), s); }
      const ox = -10, oz = -8, cx = Math.floor((p.x - ox)/s), cz = Math.floor((p.z - oz)/s), C0 = V(ox + (cx+0.5)*s, 0.05, oz + (cz+0.5)*s);
      cell.resize(V(s*0.98,0.1,s*0.98)); cell.position.copy(C0); pt.position.set(p.x,0.2,p.z); ctr.position.copy(C0).setY(0.2); ln.set(V(p.x,0.2,p.z), C0.clone().setY(0.2));
      lp.at(V(p.x,0.8,p.z)); lc.at(C0.clone().setY(1.2)).text(`cell (${cx}, ${cz})`);
      return {cx, cz, C0};
    }};
  },
  readout:(p,o)=>[['cell', `(${o.cx}, ${o.cz})`,'acc'],['cell centre', `${f(o.C0.x)}, ${f(o.C0.z)}`]],
  code:(p,o)=>`local ORIGIN = Vector3.new(-10, 0, -8)    -- the grid's corner
local SIZE = ${p.size}

local function worldToCell(pos)
    return math.floor((pos.X - ORIGIN.X) / SIZE), math.floor((pos.Z - ORIGIN.Z) / SIZE)
end
local function cellToWorld(cx, cz)       -- the middle of the cell
    return ORIGIN + Vector3.new((cx + 0.5) * SIZE, 0, (cz + 0.5) * SIZE)
end

print(worldToCell(Vector3.new(${p.x}, 0, ${p.z})))   --> ${o.cx}  ${o.cz}`,
  body:`<p>Every grid game needs two conversions. <b>World to grid</b>: subtract the grid's corner, divide by the cell size, and round <i>down</i>. <b>Grid to world</b>: multiply back and add half a cell to land in the middle.</p>
<p>Floor (not round) matters: everything from the left edge of a cell up to its right edge must give the same number. Change the cell size and watch the same world point land in a different cell.</p>`,
  uses:[`<b>Building and farming games</b>: which tile did the player click?`,`<b>Tile maps and voxel worlds</b>.`,`<b>Spatial lookups</b>: store things in a table keyed by cell.`],
  gotchas:[`Use <code>math.floor</code>, not <code>math.round</code>, or cells shift by half and negatives go wrong.`]
});

demo({
  id:'gr-neighbors', title:'Neighbours: 4-way and 8-way', short:'offset tables', sig:'for _, d in DIRECTIONS do  local nx, nz = x + d[1], z + d[2]  ... end',
  view:{theta:0.0, phi:0.45, r:22, ty:0}, env:'grid',
  params:[R('x','Cell X',0,W-1,1,4), R('z','Cell Z',0,H-1,1,3), S('mode','Neighbours',[['4','4-way (edges)'],['8','8-way (edges + corners)']],'4')],
  setup(K){ gridLines(K,W,H,SZ); const cells = inst(K, 20), labs = labels(K,9,'--ink','tiny');
    return {update(p){
      const D4 = [[1,0],[-1,0],[0,1],[0,-1]], D8 = D4.concat([[1,1],[1,-1],[-1,1],[-1,-1]]), dirs = p.mode==='4' ? D4 : D8;
      cells.begin(); labs.begin(); cells.add(cellC(p.x,p.z), V(SZ*0.95,0.3,SZ*0.95), '--accent'); let n = 0;
      dirs.forEach(([dx,dz])=>{ const nx = p.x+dx, nz = p.z+dz; if (nx<0||nz<0||nx>=W||nz>=H) return; n++; cells.add(cellC(nx,nz), V(SZ*0.95,0.2,SZ*0.95), Math.abs(dx)+Math.abs(dz)===2 ? '--vb' : '--va'); labs.add(`${dx>0?'+':''}${dx},${dz>0?'+':''}${dz}`, cellC(nx,nz,0.6)); });
      cells.end(); labs.end(); return {n};
    }};
  },
  readout:(p,o)=>[['neighbours inside the grid', String(o.n),'acc'],['missing (off the edge)', String((p.mode==='4'?4:8) - o.n)]],
  code:(p,o)=>`local DIRECTIONS = {
    {1, 0}, {-1, 0}, {0, 1}, {0, -1},          -- edges${p.mode==='8' ? `
    {1, 1}, {1, -1}, {-1, 1}, {-1, -1},        -- corners` : ''}
}

local function neighbours(x, z)
    local list = {}
    for _, d in DIRECTIONS do
        local nx, nz = x + d[1], z + d[2]
        if nx >= 1 and nx <= WIDTH and nz >= 1 and nz <= HEIGHT then   -- stay on the board
            table.insert(list, {nx, nz})
        end
    end
    return list
end
-- cell (${p.x}, ${p.z}) has ${o.n} neighbours`,
  body:`<p>Most grid logic asks "what's around me?". Store the directions as a small table of offsets and loop over it. <b>4-way</b> uses the edges only (up, down, left, right); <b>8-way</b> adds the diagonals.</p>
<p>Always check the board edges: a corner cell has only 2 or 3 neighbours. Move the cell to an edge and watch the count drop.</p>`,
  uses:[`<b>Spreading</b>: fire, water, infection, Minesweeper counts.`,`<b>Pathfinding and flood fill</b> (later topics).`,`<b>Match-3 and connection checks</b>.`],
  gotchas:[`Diagonal steps are about 1.41 times longer. Pathfinding with 8-way moves should cost them more.`]
});

demo({
  id:'gr-distance', title:'Grid distances', short:'Manhattan, Euclidean, Chebyshev', sig:'|dx| + |dz|   ·   √(dx² + dz²)   ·   max(|dx|, |dz|)',
  view:{theta:0.0, phi:0.45, r:24, ty:0}, env:'grid',
  params:[S('m','Distance',[['man','Manhattan (4-way steps)'],['euc','Euclidean (straight line)'],['che','Chebyshev (8-way steps)']],'man'), R('x','Centre X',0,W-1,1,5), R('z','Centre Z',0,H-1,1,4), R('r','Highlight within',1,8,0.5,4)],
  setup(K){ const cells = inst(K, W*H), labs = labels(K, W*H, '--ink', 'tiny');
    return {update(p){
      cells.begin(); labs.begin(); let inside = 0;
      for (let z=0;z<H;z++) for (let x=0;x<W;x++){ const dx = Math.abs(x-p.x), dz = Math.abs(z-p.z), d = p.m==='man' ? dx+dz : p.m==='euc' ? Math.hypot(dx,dz) : Math.max(dx,dz);
        const ins = d <= p.r; if (ins) inside++; cells.add(cellC(x,z,0.1), V(SZ*0.95, 0.2, SZ*0.95), ins ? new THREE.Color().copy(C('--accent')).lerp(C('--va'), d/Math.max(1,p.r)) : '--part');
        labs.add(p.m==='euc' ? f(d,1) : String(d), cellC(x,z,0.5)); }
      cells.end(); labs.end(); return {inside};
    }};
  },
  readout:(p,o)=>[['cells within '+p.r, String(o.inside),'acc'],['shape', p.m==='man' ? 'diamond' : p.m==='euc' ? 'circle' : 'square']],
  code:(p)=>`local function distance(ax, az, bx, bz)
    local dx, dz = math.abs(ax - bx), math.abs(az - bz)
    ${p.m==='man' ? 'return dx + dz                        -- Manhattan: steps with no diagonals' : p.m==='euc' ? 'return math.sqrt(dx * dx + dz * dz)   -- Euclidean: as the crow flies' : 'return math.max(dx, dz)              -- Chebyshev: steps with diagonals (like a chess king)'}
end

-- everything within range ${p.r} of the tower
for _, enemy in enemies do
    if distance(tower.X, tower.Z, enemy.X, enemy.Z) <= ${p.r} then attack(enemy) end
end`,
  body:`<p>"How far" depends on how things move. <b>Manhattan</b> distance counts steps when you can only move along the grid (like city blocks), making a diamond-shaped range. <b>Chebyshev</b> lets diagonal steps count as one, making a square. <b>Euclidean</b> is the straight-line distance, making a circle.</p>
<p>Switch between them with the same radius and compare the highlighted shapes. Pick the one that matches how your units move, or your ranges will feel wrong to players.</p>`,
  uses:[`<b>Tower defence and tactics ranges</b>.`,`<b>Pathfinding heuristics</b> (see Graphs & pathfinding).`,`<b>Area effects</b> on tile maps.`],
  gotchas:[`Compare squared Euclidean distances when you only need "is it closer", to skip the square root.`]
});

demo({
  id:'gr-index', title:'A 2D grid in a 1D list', short:'index = z × W + x + 1', sig:'index = (z − 1) × WIDTH + x   ·   x = (index − 1) % WIDTH + 1,  z = (index − 1) // WIDTH + 1',
  view:{theta:0.0, phi:0.45, r:20, ty:0}, env:'grid',
  params:[R('w','Grid width',3,10,1,7), R('x','Cell X (1-based)',1,10,1,4), R('z','Cell Z (1-based)',1,6,1,3)],
  setup(K){ const cells = inst(K, 60), labs = labels(K, 60, '--ink','tiny'), lab = K.label('','--accent','big');
    return {update(p){
      const Wd = p.w, Hd = 6, x = Math.min(p.x, Wd), idx = (p.z-1)*Wd + x; cells.begin(); labs.begin();
      for (let z=1;z<=Hd;z++) for (let xx=1;xx<=Wd;xx++){ const i = (z-1)*Wd + xx, P = cellPos(Wd,Hd,1.8,xx-1,z-1,0.1); cells.add(P, V(1.7,0.2,1.7), i===idx ? '--accent' : (z===p.z ? '--va' : '--part')); labs.add(String(i), P.clone().setY(0.5)); }
      cells.end(); labs.end(); lab.at(cellPos(Wd,Hd,1.8,x-1,p.z-1,1.4)).text(`(${x}, ${p.z}) → ${idx}`); return {idx, x};
    }};
  },
  readout:(p,o)=>[['index', String(o.idx),'acc'],['back to x', String((o.idx-1)%p.w+1)],['back to z', String(Math.floor((o.idx-1)/p.w)+1)]],
  code:(p,o)=>`local WIDTH = ${p.w}
local cells = table.create(WIDTH * 6, 0)    -- one flat list instead of a table of tables

local function index(x, z)                  -- x, z start at 1
    return (z - 1) * WIDTH + x
end
local function coords(i)
    return (i - 1) % WIDTH + 1, (i - 1) // WIDTH + 1
end

print(index(${o.x}, ${p.z}))     --> ${o.idx}
print(coords(${o.idx}))      --> ${o.x}  ${p.z}`,
  body:`<p>A grid can live in one flat list: lay the rows end to end. Cell (x, z) is then at position <code>(z − 1) × width + x</code>. Going back, <code>%</code> gives the column and floor division <code>//</code> gives the row.</p>
<p>Flat lists are simpler to save, send and copy than tables of tables, and they're faster for big maps. Change the width and watch every number reflow; the highlighted row (teal) is the one the chosen cell sits in.</p>`,
  uses:[`<b>Saving maps</b> to a DataStore as one array or string.`,`<b>Buffers</b>: tile data in a <code>buffer</code>, one byte per cell.`,`<b>Image-like data</b>: heightmaps, fog of war.`],
  gotchas:[`Lua lists start at 1, so keep the −1 / +1 adjustments. Mixing 0-based and 1-based maths is the usual bug.`]
});

demo({
  id:'gr-flood', title:'Flood fill', short:'spread to neighbours with a queue', sig:'queue = {start};  while queue: take one, add its unvisited open neighbours', time:true,
  view:{theta:0.0, phi:0.5, r:24, ty:0}, env:'grid',
  params:[R('x','Start X',0,W-1,1,1), R('z','Start Z',0,H-1,1,1), R('seed','Walls (seed)',1,60,1,7), R('speed','Cells per second',5,60,1,20)],
  setup(K){ const cells = inst(K, W*H);
    return {update(p,t){
      const w = walls(p.seed); w[p.z][p.x] = false; const dist = Array.from({length:H}, ()=>Array(W).fill(-1)), order = [];
      const q = [[p.x,p.z]]; dist[p.z][p.x] = 0; while (q.length){ const [x,z] = q.shift(); order.push([x,z]); for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx, nz=z+dz; if (nx<0||nz<0||nx>=W||nz>=H||w[nz][nx]||dist[nz][nx]>=0) continue; dist[nz][nx] = dist[z][x]+1; q.push([nx,nz]); } }
      const shown = Math.floor(t*p.speed) % (order.length + 25), maxD = Math.max(1, ...order.map(([x,z])=>dist[z][x]));
      cells.begin(); for (let z=0;z<H;z++) for (let x=0;x<W;x++){ if (w[z][x]) { cells.add(cellC(x,z,0.6), V(SZ*0.95,1.2,SZ*0.95), '--ink'); continue; } }
      order.slice(0, shown).forEach(([x,z],i)=>cells.add(cellC(x,z,0.1), V(SZ*0.95,0.2,SZ*0.95), new THREE.Color().copy(C('--accent')).lerp(C('--va'), dist[z][x]/maxD)));
      cells.add(cellC(p.x,p.z,0.3), V(SZ*0.6,0.6,SZ*0.6), '--vb'); cells.end();
      return {filled:Math.min(shown, order.length), total:order.length, maxD};
    }};
  },
  readout:(p,o)=>[['filled', `${o.filled} / ${o.total}`,'acc'],['furthest steps', String(o.maxD)]],
  code:(p,o)=>`local function floodFill(startX, startZ)
    local visited = { [startX .. "," .. startZ] = true }
    local queue, head = { {startX, startZ} }, 1
    while head <= #queue do
        local x, z = queue[head][1], queue[head][2]
        head += 1                                  -- take from the front (breadth-first)
        fill(x, z)
        for _, d in { {1, 0}, {-1, 0}, {0, 1}, {0, -1} } do
            local nx, nz = x + d[1], z + d[2]
            local key = nx .. "," .. nz
            if isOpen(nx, nz) and not visited[key] then
                visited[key] = true
                table.insert(queue, {nx, nz})
            end
        end
    end
end
-- this layout: ${o.total} cells reachable`,
  body:`<p>Flood fill finds every cell connected to a start cell, like paint bucket in an image editor. Put the start in a queue; repeatedly take a cell out, fill it, and add its open neighbours you haven't seen. When the queue is empty, you've reached everything reachable.</p>
<p>Using a queue (first in, first out) fills in rings, so each cell's colour shows how many steps it is from the start. Cells walled off never get filled. Change the seed for new walls.</p>`,
  uses:[`<b>Paint bucket tools</b> and territory games.`,`<b>Checking a level is connected</b> after generating it.`,`<b>Minesweeper</b> opening empty areas, and <b>spreading water or fire</b>.`],
  gotchas:[`Mark cells as visited when you add them to the queue, not when you take them out, or cells get added many times.`,`<code>table.remove(queue, 1)</code> is slow on big queues; move a "head" index instead, as in the code.`]
});

function lineCells(x0,z0,x1,z1){ const cells = []; let dx = Math.abs(x1-x0), dz = -Math.abs(z1-z0), sx = x0<x1?1:-1, sz = z0<z1?1:-1, err = dx+dz, x = x0, z = z0;
  for(;;){ cells.push([x,z]); if (x===x1 && z===z1) break; const e2 = 2*err; if (e2 >= dz){ err += dz; x += sx; } if (e2 <= dx){ err += dx; z += sz; } } return cells; }
demo({
  id:'gr-line', title:'Cells along a line (Bresenham)', short:'grid line of sight', sig:'step in x or z, whichever keeps the error smallest',
  view:{theta:0.0, phi:0.5, r:24, ty:0}, env:'grid',
  params:[R('x0','From X',0,W-1,1,1), R('z0','From Z',0,H-1,1,8), R('x1','To X',0,W-1,1,10), R('z1','To Z',0,H-1,1,2), R('seed','Walls (seed)',1,60,1,12)],
  setup(K){ gridLines(K,W,H,SZ); const cells = inst(K, W*H), ln = K.line('--ink',{dashed:true}), lab = K.label('','--ink','big');
    return {update(p){
      const w = walls(p.seed, W, H, 0.12); w[p.z0][p.x0] = false; w[p.z1][p.x1] = false; const path = lineCells(p.x0,p.z0,p.x1,p.z1);
      let blocked = -1; path.forEach(([x,z],i)=>{ if (blocked < 0 && w[z][x]) blocked = i; });
      cells.begin(); for (let z=0;z<H;z++) for (let x=0;x<W;x++) if (w[z][x]) cells.add(cellC(x,z,0.6), V(SZ*0.95,1.2,SZ*0.95), '--ink');
      path.forEach(([x,z],i)=>cells.add(cellC(x,z,0.12), V(SZ*0.9,0.24,SZ*0.9), blocked >= 0 && i >= blocked ? '--bad' : '--accent')); cells.end();
      ln.set(cellC(p.x0,p.z0,0.4), cellC(p.x1,p.z1,0.4)); lab.at(cellC(p.x1,p.z1,1.6)).text(blocked >= 0 ? 'blocked' : 'clear line of sight').color(blocked >= 0 ? '--bad' : '--ok');
      return {n:path.length, blocked};
    }};
  },
  readout:(p,o)=>[['cells on the line', String(o.n),'acc'],['line of sight', o.blocked >= 0 ? 'blocked at cell '+(o.blocked+1) : 'clear', o.blocked >= 0 ? 'bad' : 'ok']],
  code:(p,o)=>`local function cellsOnLine(x0, z0, x1, z1)
    local cells = {}
    local dx, dz = math.abs(x1 - x0), -math.abs(z1 - z0)
    local sx, sz = x0 < x1 and 1 or -1, z0 < z1 and 1 or -1
    local err = dx + dz
    while true do
        table.insert(cells, {x0, z0})
        if x0 == x1 and z0 == z1 then break end
        local e2 = 2 * err
        if e2 >= dz then err += dz; x0 += sx end
        if e2 <= dx then err += dx; z0 += sz end
    end
    return cells
end
-- ${o.n} cells from (${p.x0}, ${p.z0}) to (${p.x1}, ${p.z1})`,
  body:`<p>Drawing a straight line on a grid means choosing which cells it passes through. <b>Bresenham's algorithm</b> walks from one end to the other, at each step moving across, along, or both, whichever keeps it closest to the true line. It uses only whole numbers, so it's fast and exact.</p>
<p>Check each cell for a wall and you have line of sight for tile-based games. Move the ends around the walls and watch where the line turns red.</p>`,
  uses:[`<b>Line of sight and fog of war</b> on tile maps.`,`<b>Drawing walls and roads</b> by dragging in building games.`,`<b>Projectiles on grids</b> in tactics games.`],
  gotchas:[`Bresenham lines can slip diagonally between two touching walls. For strict sight checks, also block when both side cells of a diagonal step are walls.`]
});

const SHAPES = {L:[[0,0],[0,1],[0,2],[1,2]], T:[[0,0],[1,0],[2,0],[1,1]], S:[[1,0],[2,0],[0,1],[1,1]], I:[[0,0],[1,0],[2,0],[3,0]]};
demo({
  id:'gr-rotate', title:'Rotating grid pieces', short:'(x, z) → (−z, x)', sig:'each 90° turn: newX = −z,  newZ = x   (around the pivot)',
  view:{theta:0.0, phi:0.45, r:20, ty:0}, env:'grid',
  params:[S('shape','Piece',Object.keys(SHAPES).map(k=>[k,k+' piece']),'L'), R('turns','Quarter turns',0,3,1,1), R('pivot','Pivot block',0,3,1,1)],
  setup(K){ gridLines(K,10,8,SZ); const cells = inst(K, 12), lab = K.label('','--ink');
    return {update(p){
      const sh = SHAPES[p.shape], pv = sh[p.pivot]; const at = (x,z,y)=>cellPos(10,8,SZ,x+4,z+3,y);
      cells.begin(); sh.forEach(([x,z])=>cells.add(at(x-pv[0],z-pv[1],0.1), V(SZ*0.92,0.2,SZ*0.92), '--part'));
      const rot = sh.map(([x,z])=>{ let dx = x-pv[0], dz = z-pv[1]; for (let i=0;i<p.turns;i++){ const t0 = dx; dx = -dz; dz = t0; } return [dx,dz]; });
      rot.forEach(([x,z],i)=>cells.add(at(x,z,0.5), V(SZ*0.8,0.6,SZ*0.8), i===p.pivot ? '--vb' : '--accent')); cells.end();
      lab.at(at(0,0,1.4)).text('pivot'); return {rot};
    }};
  },
  readout:(p,o)=>[['blocks after turning', o.rot.map(([x,z])=>`(${x},${z})`).join(' '),'acc']],
  code:(p,o)=>`-- block offsets from the pivot block
local piece = { ${SHAPES[p.shape].map(([x,z])=>`{${x - SHAPES[p.shape][p.pivot][0]}, ${z - SHAPES[p.shape][p.pivot][1]}}`).join(', ')} }

local function rotate90(blocks)
    local out = {}
    for i, b in blocks do
        out[i] = { -b[2], b[1] }          -- (x, z) → (−z, x)
    end
    return out
end

for _ = 1, ${p.turns} do piece = rotate90(piece) end
--> ${o.rot.map(([x,z])=>`{${x}, ${z}}`).join(', ')}`,
  body:`<p>Turning a grid shape by 90° doesn't need sines or CFrames. Measure each block from a pivot, then swap the two coordinates and negate one: <code>(x, z) → (−z, x)</code>. Do it twice for 180°, three times for 270°.</p>
<p>Whole-number maths means no rounding errors, so pieces always land exactly on cells. Changing the pivot changes where the piece ends up, which is why falling-block games pick a "centre" block carefully.</p>`,
  uses:[`<b>Building and furniture rotation</b> on grids.`,`<b>Falling-block puzzle games.</b>`,`<b>Rotating room templates</b> in dungeon generators.`],
  gotchas:[`After rotating, check every new cell is free and on the board before accepting the move.`]
});

const hexGeo = new THREE.CylinderGeometry(0.95,0.95,0.3,6);
demo({
  id:'gr-hex', title:'Hex grids', short:'axial coordinates (q, r)', sig:'distance = (|dq| + |dr| + |dq + dr|) / 2',
  view:{theta:0.0, phi:0.5, r:22, ty:0}, env:'grid',
  params:[R('q','Selected q',-4,4,1,2), R('r','Selected r',-4,4,1,-1)],
  setup(K){ const hexes = inst(K, 70, {geo:hexGeo}), labs = labels(K, 70, '--ink','tiny');
    return {update(p){
      const N = 4, s = 1.05, pos = (q,r)=>V(s*Math.sqrt(3)*(q + r/2), 0.15, s*1.5*r); const dist = (q,r)=>(Math.abs(q) + Math.abs(r) + Math.abs(q+r))/2;
      const sq = p.q, sr = clamp(p.r, Math.max(-N, -sq-N), Math.min(N, -sq+N)), nb = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
      hexes.begin(); labs.begin();
      for (let q=-N;q<=N;q++) for (let r=Math.max(-N,-q-N); r<=Math.min(N,-q+N); r++){
        const isSel = q===sq && r===sr, isN = nb.some(([a,b])=>q===sq+a && r===sr+b), d = (Math.abs(q-sq)+Math.abs(r-sr)+Math.abs(q+r-sq-sr))/2;
        hexes.add(pos(q,r), V(1,isSel?2:1,1), isSel ? '--accent' : isN ? '--va' : new THREE.Color().copy(C('--part')).lerp(C('--view'), d/8)); labs.add(String(d), pos(q,r).setY(0.6)); }
      hexes.end(); labs.end(); return {sq, sr, d0:dist(sq,sr)};
    }};
  },
  readout:(p,o)=>[['selected', `q ${o.sq}, r ${o.sr}`],['distance from centre', String(o.d0),'acc']],
  code:(p,o)=>`local NEIGHBOURS = { {1, 0}, {1, -1}, {0, -1}, {-1, 0}, {-1, 1}, {0, 1} }

local function hexDistance(q1, r1, q2, r2)
    local dq, dr = q1 - q2, r1 - r2
    return (math.abs(dq) + math.abs(dr) + math.abs(dq + dr)) / 2
end

local SIZE = 2                                 -- centre to corner, pointy-top hexes
local function hexToWorld(q, r)
    return Vector3.new(SIZE * math.sqrt(3) * (q + r / 2), 0, SIZE * 1.5 * r)
end

print(hexDistance(0, 0, ${o.sq}, ${o.sr}))   --> ${o.d0}`,
  body:`<p>Hex grids are popular for strategy games because all six neighbours are the same distance away; there are no awkward diagonals. The trick is <b>axial coordinates</b>: two numbers, <code>q</code> and <code>r</code>, along two of the three hex directions.</p>
<p>The numbers on each hex are its distance from the selected one. The six teal hexes are its neighbours, which are always the same six offsets. Converting to world space uses √3 because hex rows overlap.</p>`,
  uses:[`<b>Strategy and board games</b>.`,`<b>Honeycomb bases and hive builders.</b>`,`<b>Movement ranges</b> that look round without circles.`],
  gotchas:[`Pick pointy-top or flat-top layout once; the world-position formula is different for each.`]
});

demo({
  id:'gr-chunks', title:'Chunks: big worlds in pieces', short:'chunk = cell // size', sig:'chunk = cell // CHUNK   ·   local = cell % CHUNK',
  view:{theta:0.0, phi:0.45, r:30, ty:0}, env:'grid',
  params:[S('cs','Chunk size (cells)',[['4','4'],['8','8'],['16','16']],'8'), R('px','Player cell X',0,47,1,21), R('pz','Player cell Z',0,47,1,30), R('rad','Load radius (chunks)',0,3,1,1)],
  setup(K){ const tiles = inst(K, 200), pl = K.part(V(0.6,1.4,0.6),'--vb',{front:false});
    return {update(p){
      const cs = +p.cs, n = 48/cs, cell = 0.5, cx = Math.floor(p.px/cs), cz = Math.floor(p.pz/cs); let loaded = 0;
      tiles.begin(); for (let z=0;z<n;z++) for (let x=0;x<n;x++){ const on = Math.abs(x-cx) <= p.rad && Math.abs(z-cz) <= p.rad; if (on) loaded++;
        tiles.add(V((x+0.5)*cs*cell - 12, on ? 0.15 : 0.05, (z+0.5)*cs*cell - 12), V(cs*cell*0.94, on ? 0.3 : 0.1, cs*cell*0.94), x===cx && z===cz ? '--accent' : on ? '--va' : '--part'); }
      tiles.end(); pl.position.set((p.px+0.5)*cell - 12, 0.7, (p.pz+0.5)*cell - 12);
      return {cx, cz, lx:p.px % cs, lz:p.pz % cs, loaded, total:n*n};
    }};
  },
  readout:(p,o)=>[['player chunk', `(${o.cx}, ${o.cz})`,'acc'],['position inside chunk', `(${o.lx}, ${o.lz})`],['chunks loaded', `${o.loaded} of ${o.total}`]],
  code:(p,o)=>`local CHUNK, RADIUS = ${p.cs}, ${p.rad}

local function chunkOf(cellX, cellZ)
    return cellX // CHUNK, cellZ // CHUNK         --> ${o.cx}, ${o.cz}
end
local function insideChunk(cellX, cellZ)
    return cellX % CHUNK, cellZ % CHUNK           --> ${o.lx}, ${o.lz}
end

-- keep only the chunks near the player loaded
local cx, cz = chunkOf(playerCellX, playerCellZ)
for x = cx - RADIUS, cx + RADIUS do
    for z = cz - RADIUS, cz + RADIUS do
        ensureLoaded(x, z)
    end
end`,
  body:`<p>Big worlds don't fit in memory or on screen at once, so they're split into <b>chunks</b>: square blocks of cells. Floor division gives the chunk a cell belongs to, and the remainder gives its position inside that chunk.</p>
<p>As the player moves, load the chunks within a radius (teal) and unload the rest. Bigger chunks mean fewer, chunkier loads; smaller chunks follow the player more closely. Roblox's StreamingEnabled does something similar for parts automatically.</p>`,
  uses:[`<b>Voxel and procedural worlds</b> generated chunk by chunk.`,`<b>Saving huge maps</b> one chunk per DataStore key.`,`<b>Spawning and despawning</b> NPCs only near players.`],
  gotchas:[`Use floor division (<code>//</code>) so negative cells go to chunk −1, not chunk 0.`]
});

Lab.finder([
  ['Find which tile the player clicked','math.floor((pos - origin) / size)','gr-coords'],
  ['Get the tiles around a tile','neighbour offsets','gr-neighbors'],
  ['Make a diamond or square range on a grid','Manhattan / Chebyshev distance','gr-distance'],
  ['Store a grid in one list','index = (z − 1) × width + x','gr-index'],
  ['Make a paint bucket fill tool','flood fill','gr-flood'],
  ['Check line of sight on a tile map','Bresenham line','gr-line'],
  ['Rotate a building piece by 90°','(x, z) → (−z, x)','gr-rotate'],
  ['Make a hexagon grid','axial coordinates','gr-hex'],
  ['Load a huge world in chunks','cell // chunkSize','gr-chunks'],
]);
})();
