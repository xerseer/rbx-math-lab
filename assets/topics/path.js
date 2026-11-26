(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, CF, G, R, S, T, clamp, noise, mulberry32} = Lab;
const {inst, labels, cellPos, Heap} = Lab.kit2;
const demo = Lab.subject({
  id:'path', title:'Graphs & pathfinding', glyph:'path', level:'Advanced',
  blurb:'BFS, Dijkstra and A*, heuristics, flow fields for crowds, path smoothing, waypoint graphs and following a path.'
});
const W = 22, H = 15, CS = 0.9, MUD = new THREE.Color('#8a6a3a');
const P = (x,z,y=0.1)=>cellPos(W,H,CS,x,z,y);
function makeMap(seed, density=0.24, mudOn=false){
  const r = mulberry32(seed*131), walls = [], cost = [];
  for (let z=0;z<H;z++){ walls.push([]); cost.push([]); for (let x=0;x<W;x++){ walls[z].push(r() < density && !(x<3&&z<3) && !(x>W-4&&z>H-4)); cost[z].push(mudOn && noise(x*0.22+0.3, z*0.22+0.6, seed) > 0.12 ? 5 : 1); } }
  // add a few long walls so paths have to go round
  for (let i=0;i<3;i++){ const x = 5 + i*6, z0 = Math.floor(r()*5), len = 6 + Math.floor(r()*4); for (let z=z0; z<Math.min(H,z0+len); z++) walls[z][x] = true; }
  return {walls, cost};
}
const HEUR = {man:(dx,dz)=>dx+dz, oct:(dx,dz)=>dx+dz+(Math.SQRT2-2)*Math.min(dx,dz), euc:(dx,dz)=>Math.hypot(dx,dz), zero:()=>0, che:(dx,dz)=>Math.max(dx,dz)};
function solve(map, s, g, o={}){
  const {walls, cost} = map, diag = !!o.diag, useCost = o.useCost !== false, h = HEUR[o.h || 'man'], wgt = o.weight || 1, algo = o.algo || 'astar';
  const key = (x,z)=>z*W + x, gS = new Map(), came = new Map(), closed = new Set(), visited = [];
  const dirs = diag ? [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]] : [[1,0],[-1,0],[0,1],[0,-1]];
  const open = new Heap(); gS.set(key(...s), 0); open.push(s, 0); let q = [s], qi = 0;
  while (algo==='bfs' ? qi < q.length : open.size){
    const cur = algo==='bfs' ? q[qi++] : open.pop(), ck = key(...cur); if (closed.has(ck)) continue; closed.add(ck); visited.push([cur[0],cur[1],gS.get(ck)]);
    if (cur[0]===g[0] && cur[1]===g[1]) break;
    for (const [dx,dz] of dirs){ const nx = cur[0]+dx, nz = cur[1]+dz; if (nx<0||nz<0||nx>=W||nz>=H||walls[nz][nx]) continue;
      if (dx && dz && (walls[cur[1]][nx] || walls[nz][cur[0]])) continue;
      const step = (dx && dz ? Math.SQRT2 : 1)*(useCost ? cost[nz][nx] : 1), ng = gS.get(ck) + step, nk = key(nx,nz);
      if (algo==='bfs'){ if (!gS.has(nk)){ gS.set(nk, ng); came.set(nk, cur); q.push([nx,nz]); } continue; }
      if (ng < (gS.has(nk) ? gS.get(nk) : Infinity)){ gS.set(nk, ng); came.set(nk, cur); const hh = algo==='astar' ? wgt*h(Math.abs(nx-g[0]), Math.abs(nz-g[1])) : 0; open.push([nx,nz], ng + hh); } }
  }
  const path = []; let c = g; if (!gS.has(key(...g))) return {visited, path, total:Infinity};
  while (c){ path.push(c); if (c[0]===s[0] && c[1]===s[1]) break; c = came.get(key(...c)); }
  path.reverse(); let total = 0; for (let i=1;i<path.length;i++){ const [a,b] = path[i-1], [x,z] = path[i]; total += (a!==x && b!==z ? Math.SQRT2 : 1)*cost[z][x]; }
  return {visited, path, total};
}
function drawMap(cells, map, {mud=true}={}){ for (let z=0;z<H;z++) for (let x=0;x<W;x++){ if (map.walls[z][x]) cells.add(P(x,z,0.5), V(CS*0.96,1,CS*0.96), '--ink'); else if (mud && map.cost[z][x] > 1) cells.add(P(x,z,0.04), V(CS*0.96,0.08,CS*0.96), MUD); } }
function drawSearch(cells, res, limit=Infinity){ const mx = Math.max(1, ...res.visited.map(v=>v[2])); res.visited.slice(0, limit).forEach(([x,z,g])=>cells.add(P(x,z,0.1), V(CS*0.9,0.12,CS*0.9), new THREE.Color().copy(C('--va')).lerp(C('--vb'), g/mx))); }
function drawPath(line, path){ line.set(path.map(([x,z])=>P(x,z,0.35))); line.visible = path.length > 1; }

demo({
  id:'pf-bfs', title:'Breadth-first search', short:'explore in rings, shortest in steps', sig:'queue the start; repeatedly take the oldest cell and queue its unvisited neighbours',
  view:{theta:0.0, phi:0.6, r:24, ty:0}, env:'none', time:true,
  params:[R('gx','Goal X',0,W-1,1,W-2), R('gz','Goal Z',0,H-1,1,H-2), R('seed','Map (seed)',1,60,1,4), R('speed','Cells per second',10,200,5,60)],
  setup(K){ const cells = inst(K, W*H*2), line = K.line('--accent',{max:200}), lab = K.label('','--ink','big');
    return {update(p,t){
      const map = makeMap(p.seed), s = [1,1], g = [p.gx,p.gz]; map.walls[g[1]][g[0]] = false; const res = solve(map, s, g, {algo:'bfs', useCost:false});
      const shown = Math.floor(t*p.speed) % (res.visited.length + 40); cells.begin(); drawMap(cells, map, {mud:false}); drawSearch(cells, res, shown);
      cells.add(P(...s,0.3), V(0.6,0.6,0.6), '--ok'); cells.add(P(...g,0.3), V(0.6,0.6,0.6), '--bad'); cells.end();
      const done = shown >= res.visited.length; drawPath(line, done ? res.path : []); lab.at(P(...g,1.4)).text(res.path.length ? (done ? `${res.path.length-1} steps` : 'searching…') : 'unreachable');
      return {visited:res.visited.length, steps:res.path.length-1};
    }};
  },
  readout:(p,o)=>[['cells explored', String(o.visited)],['path length', o.steps >= 0 ? o.steps+' steps' : 'no path','acc']],
  code:(p,o)=>`local function bfs(start, goal)
    local queue, head = { start }, 1
    local cameFrom = { [start] = false }        -- cells as string keys, e.g. "1,1"
    while head <= #queue do
        local current = queue[head]; head += 1
        if current == goal then break end
        for _, n in neighbours(current) do       -- open cells only
            if cameFrom[n] == nil then
                cameFrom[n] = current
                table.insert(queue, n)
            end
        end
    end
    -- walk back from the goal to rebuild the path
    local path, c = {}, goal
    while c do table.insert(path, 1, c); c = cameFrom[c] end
    return path
end
-- this map: ${o.visited} cells explored, ${o.steps} steps`,
  body:`<p><b>Breadth-first search</b> explores outward from the start in rings: first every cell 1 step away, then every cell 2 steps away, and so on. Because it finishes each ring before the next, the first time it reaches the goal is guaranteed to be by a shortest route (in number of steps).</p>
<p>Each explored cell remembers which cell it was reached from. Once the goal is found, following those links backwards gives the path. Watch the coloured rings flow around walls.</p>`,
  uses:[`<b>Shortest paths on grids</b> where every step costs the same.`,`<b>"How many moves away?"</b> for tactics games.`,`<b>Reachability checks</b>: can this area be reached at all?`],
  gotchas:[`BFS ignores terrain costs. For mud, roads or diagonal moves with different costs, use Dijkstra or A*.`]
});

demo({
  id:'pf-dijkstra', title:'Dijkstra: paths with costs', short:'always expand the cheapest so far', sig:'priority queue ordered by cost-so-far; mud costs 5, ground costs 1',
  view:{theta:0.0, phi:0.6, r:24, ty:0}, env:'none',
  params:[T('cost','Respect terrain costs',true), R('seed','Map (seed)',1,60,1,7)],
  setup(K){ const cells = inst(K, W*H*2), line = K.line('--accent',{max:200}), line2 = K.line('--muted',{max:200, dashed:true});
    return {update(p){
      const map = makeMap(p.seed, 0.12, true), s = [1,1], g = [W-2,H-2]; const res = solve(map, s, g, {algo:'dijkstra', useCost:p.cost}), plain = solve(map, s, g, {algo:'bfs', useCost:false});
      cells.begin(); drawMap(cells, map); res.path.forEach(([x,z])=>cells.add(P(x,z,0.15), V(CS*0.5,0.12,CS*0.5), '--accent')); cells.add(P(...s,0.3), V(0.6,0.6,0.6), '--ok'); cells.add(P(...g,0.3), V(0.6,0.6,0.6), '--bad'); cells.end();
      drawPath(line, res.path); drawPath(line2, p.cost ? plain.path : []);
      return {cost:res.total, steps:res.path.length-1, plainCost:plain.total};
    }};
  },
  readout:(p,o)=>[['path cost', f(o.cost,1),'acc'],['steps', String(o.steps)],['shortest-steps path would cost', f(o.plainCost,1)]],
  code:(p,o)=>`-- each cell has a cost to enter: ground 1, mud 5
local function dijkstra(start, goal)
    local best = { [start] = 0 }
    local cameFrom = {}
    local open = PriorityQueue.new()             -- pops the lowest priority first
    open:push(start, 0)
    while not open:empty() do
        local current = open:pop()
        if current == goal then break end
        for _, n in neighbours(current) do
            local newCost = best[current] + costOf(n)
            if best[n] == nil or newCost < best[n] then
                best[n] = newCost
                cameFrom[n] = current
                open:push(n, newCost)
            end
        end
    end
    return rebuild(cameFrom, goal), best[goal]   -- cost here: ${f(o.cost,1)}
end`,
  body:`<p>When some cells are harder to cross (mud, water, enemy zones), "fewest steps" isn't "best". <b>Dijkstra's algorithm</b> tracks the total cost to reach each cell and always expands the cheapest cell found so far, using a priority queue. The first time it pops the goal, that's the cheapest route.</p>
<p>The brown cells are mud (cost 5). The orange path detours around them; the dashed grey line is the fewest-steps route, which wades straight through and costs more. Untick the costs and both agree.</p>`,
  uses:[`<b>Roads vs off-road</b> movement for vehicles and NPCs.`,`<b>Avoiding danger</b>: make cells near enemies expensive.`,`<b>Distance maps</b> from one point to everywhere (run it to completion).`],
  gotchas:[`Costs must not be negative, or Dijkstra can give wrong answers.`]
});

demo({
  id:'pf-astar', title:'A*: aim for the goal', short:'cost so far + estimate to goal', sig:'priority = g (cost so far) + h (estimated cost left)',
  view:{theta:0.0, phi:0.6, r:24, ty:0}, env:'none',
  params:[S('algo','Algorithm',[['astar','A*'],['dijkstra','Dijkstra (no estimate)']],'astar'), R('w','Heuristic weight',1,4,0.1,1), R('seed','Map (seed)',1,60,1,11)],
  setup(K){ const cells = inst(K, W*H*2), line = K.line('--accent',{max:200});
    return {update(p){
      const map = makeMap(p.seed), s = [1,1], g = [W-2,H-2]; const res = solve(map, s, g, {algo:p.algo, weight:p.w, useCost:false});
      const best = solve(map, s, g, {algo:'dijkstra', useCost:false});
      cells.begin(); drawMap(cells, map, {mud:false}); drawSearch(cells, res); cells.add(P(...s,0.3), V(0.6,0.6,0.6), '--ok'); cells.add(P(...g,0.3), V(0.6,0.6,0.6), '--bad'); cells.end(); drawPath(line, res.path);
      return {visited:res.visited.length, len:res.total, best:best.total};
    }};
  },
  readout:(p,o)=>[['cells explored', String(o.visited),'acc'],['path length', f(o.len,1)],['shortest possible', f(o.best,1), o.len > o.best + 1e-6 ? 'bad' : 'ok']],
  code:(p,o)=>`local function heuristic(a, b)                   -- straight-line guess, never too high
    return math.abs(a.X - b.X) + math.abs(a.Y - b.Y)
end

-- identical to Dijkstra except for the priority:
open:push(n, newCost${p.algo==='astar' ? ` + ${p.w === 1 ? '' : p.w + ' * '}heuristic(n, goal)` : ''})
-- explored ${o.visited} cells on this map`,
  body:`<p>Dijkstra explores evenly in every direction, even away from the goal. <b>A*</b> adds a guess of the remaining distance (the <b>heuristic</b>) to each cell's priority, so cells that head toward the goal get explored first. It still finds the shortest path, as long as the guess never overestimates.</p>
<p>Switch between the two and compare how many cells get explored. Raising the heuristic weight above 1 makes A* greedier: even faster, but the path may no longer be the shortest (watch the readout).</p>`,
  uses:[`<b>NPC navigation</b> on grids and nav graphs.`,`<b>Strategy and tower defence</b> unit movement.`,`<b>Puzzle solvers.</b>`],
  gotchas:[`A heuristic that overestimates (or a weight above 1) trades accuracy for speed. Fine for crowds, not for puzzles that need the true shortest path.`,`Roblox's <code>PathfindingService</code> runs a navmesh search for you; write A* yourself for grids and custom graphs.`]
});

demo({
  id:'pf-heuristics', title:'Heuristics and diagonal moves', short:'Manhattan, octile, Euclidean', sig:'octile = dx + dz + (√2 − 2) · min(dx, dz)',
  view:{theta:0.0, phi:0.6, r:24, ty:0}, env:'none',
  params:[T('diag','Allow diagonal moves',true), S('h','Heuristic',[['oct','Octile (exact for 8-way)'],['euc','Euclidean'],['man','Manhattan'],['zero','None (Dijkstra)']],'oct'), R('seed','Map (seed)',1,60,1,5)],
  setup(K){ const cells = inst(K, W*H*2), line = K.line('--accent',{max:200});
    return {update(p){
      const map = makeMap(p.seed), s = [1,1], g = [W-2,H-2]; const res = solve(map, s, g, {algo:'astar', diag:p.diag, h:p.h, useCost:false}), best = solve(map, s, g, {algo:'dijkstra', diag:p.diag, useCost:false});
      cells.begin(); drawMap(cells, map, {mud:false}); drawSearch(cells, res); cells.add(P(...s,0.3), V(0.6,0.6,0.6), '--ok'); cells.add(P(...g,0.3), V(0.6,0.6,0.6), '--bad'); cells.end(); drawPath(line, res.path);
      return {visited:res.visited.length, len:res.total, best:best.total};
    }};
  },
  readout:(p,o)=>[['cells explored', String(o.visited),'acc'],['path length', f(o.len,2)],['optimal?', Math.abs(o.len - o.best) < 1e-6 ? 'yes' : 'no ('+f(o.best,2)+' possible)', Math.abs(o.len - o.best) < 1e-6 ? 'ok' : 'bad']],
  code:(p)=>`local SQRT2 = math.sqrt(2)
local function heuristic(dx, dz)                 -- dx, dz = distance to the goal in cells
${p.h==='oct' ? '    return dx + dz + (SQRT2 - 2) * math.min(dx, dz)   -- octile: exact for 8-way moves' : p.h==='euc' ? '    return math.sqrt(dx * dx + dz * dz)              -- straight line: never too high, a bit low' : p.h==='man' ? '    return dx + dz                                  -- Manhattan: exact for 4-way, too high for 8-way' : '    return 0                                        -- no guess: plain Dijkstra'}
end
-- diagonal steps cost √2 and can't squeeze between two walls`,
  body:`<p>The heuristic should match how units move. For 4-way grids, <b>Manhattan</b> distance is exact. With diagonals allowed, a diagonal step costs √2, and <b>octile</b> distance is the exact guess. <b>Euclidean</b> is always safe but a little low, so A* explores more.</p>
<p>Turn on diagonals and try Manhattan: it overestimates (a diagonal shortcut is cheaper than it thinks), so the path can come out longer than optimal. Octile explores the fewest cells while staying optimal.</p>`,
  uses:[`<b>Choosing the right heuristic</b> for your movement rules.`,`<b>Faster pathfinding</b> on big maps.`,`<b>Natural-looking diagonal paths</b>.`],
  gotchas:[`Block diagonal moves that would squeeze between two walls touching at a corner, or units clip through.`]
});

demo({
  id:'pf-flow', title:'Flow fields for crowds', short:'one search, every unit', sig:'Dijkstra from the goal to every cell; each cell points to its cheapest neighbour', time:true,
  view:{theta:0.0, phi:0.6, r:24, ty:0}, env:'none',
  params:[R('gx','Goal X',0,W-1,1,W-3), R('gz','Goal Z',0,H-1,1,7), R('units','Units',5,60,1,30), R('seed','Map (seed)',1,60,1,9)],
  setup(K){ const cells = inst(K, W*H*2), arrows = inst(K, W*H, {geo:new THREE.ConeGeometry(0.16,0.5,6).rotateX(-Math.PI/2)}), dots = inst(K, 60, {geo:G.sphere}); let key = '', field = null, map = null; const units = [];
    return {update(p,t){
      const k = [p.gx,p.gz,p.seed].join('|'); if (k !== key){ key = k; map = makeMap(p.seed, 0.16); map.walls[p.gz][p.gx] = false; const dist = Array.from({length:H}, ()=>Array(W).fill(Infinity)); const q = [[p.gx,p.gz]]; dist[p.gz][p.gx] = 0;
        for (let i=0;i<q.length;i++){ const [x,z] = q[i]; for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx, nz=z+dz; if (nx<0||nz<0||nx>=W||nz>=H||map.walls[nz][nx]||dist[nz][nx]<Infinity) continue; dist[nz][nx] = dist[z][x]+1; q.push([nx,nz]); } }
        field = dist; units.length = 0; const r = mulberry32(p.seed*7); while (units.length < 60){ const x = Math.floor(r()*W), z = Math.floor(r()*H); if (!map.walls[z][x] && dist[z][x] < Infinity) units.push(P(x,z,0.3).add(V((r()-0.5)*0.5,0,(r()-0.5)*0.5))); } }
      cells.begin(); drawMap(cells, map, {mud:false}); cells.add(P(p.gx,p.gz,0.3), V(0.7,0.6,0.7), '--bad'); cells.end();
      const dirAt = (x,z)=>{ let best = null, bd = field[z][x]; for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){ const nx=x+dx, nz=z+dz; if (nx<0||nz<0||nx>=W||nz>=H||map.walls[nz][nx]) continue; if (dx&&dz&&(map.walls[z][nx]||map.walls[nz][x])) continue; const d = field[nz][nx] + (dx&&dz ? 0.41 : 0); if (d < bd){ bd = d; best = [dx,dz]; } } return best; };
      arrows.begin(); for (let z=0;z<H;z++) for (let x=0;x<W;x++){ if (map.walls[z][x]) continue; const d = dirAt(x,z); if (!d) continue; const q = new THREE.Quaternion().setFromUnitVectors(V(0,0,-1), V(d[0],0,d[1]).normalize()); arrows.add(P(x,z,0.12), 1, '--muted', q); } arrows.end();
      dots.begin(); const tau = t % 14; units.slice(0,p.units).forEach((u0,i)=>{ let u = u0.clone(); for (let s=0; s<Math.floor(tau*12); s++){ const cx = clamp(Math.round(u.x/CS + (W-1)/2),0,W-1), cz = clamp(Math.round(u.z/CS + (H-1)/2),0,H-1); const d = dirAt(cx,cz); if (!d) break; const tgt = P(cx+d[0],cz+d[1],0.3); u.add(tgt.sub(u).multiplyScalar(0.25)); } dots.add(u, 0.18, '--accent'); }); dots.end();
      return {};
    }};
  },
  readout:(p)=>[['searches needed', '1 (for all '+p.units+' units)','acc']],
  code:(p)=>`-- 1. one search from the GOAL outward fills in the distance of every cell
local distance = bfsFrom(goalCell)               -- or Dijkstra for costs

-- 2. each cell's direction = the neighbour with the smallest distance
local function directionAt(cell)
    local best, bestD = nil, distance[cell]
    for _, n in neighbours(cell) do
        if distance[n] < bestD then best, bestD = n, distance[n] end
    end
    return best
end

-- 3. every unit just follows the arrow under it
for _, unit in units do
    local next = directionAt(cellOf(unit.Position))
    if next then unit.Humanoid:Move((centerOf(next) - unit.Position).Unit) end
end`,
  body:`<p>When hundreds of units chase the same goal, searching a path for each one is wasteful. A <b>flow field</b> flips it around: run one search <i>from the goal</i> to fill in every cell's distance, then each cell points to its closest neighbour. Every unit, wherever it is, just follows the arrow it's standing on.</p>
<p>Move the goal and the whole field re-points. The cost is one search per goal, no matter how many units there are, which is why tower defence and RTS games use this for big crowds.</p>`,
  uses:[`<b>Zombie hordes and creep waves</b> heading to one target.`,`<b>RTS armies</b> moving to a rally point.`,`<b>Evacuation and crowd simulations.</b>`],
  gotchas:[`Recompute the field when walls change, not every frame.`,`Add a little separation steering so units don't stack into a single line.`]
});

function los(map, a, b){ let [x0,z0] = a; const [x1,z1] = b; let dx = Math.abs(x1-x0), dz = -Math.abs(z1-z0), sx = x0<x1?1:-1, sz = z0<z1?1:-1, err = dx+dz;
  for(;;){ if (map.walls[z0][x0]) return false; if (x0===x1 && z0===z1) return true; const e2 = 2*err; if (e2 >= dz){ err += dz; x0 += sx; } if (e2 <= dx){ err += dx; z0 += sz; } } }
demo({
  id:'pf-smooth', title:'Path smoothing (string pulling)', short:'skip waypoints you can see past', sig:'from each kept point, jump to the furthest later point with clear line of sight',
  view:{theta:0.0, phi:0.6, r:24, ty:0}, env:'none',
  params:[T('smooth','Smooth the path',true), R('seed','Map (seed)',1,60,1,14)],
  setup(K){ const cells = inst(K, W*H*2), raw = K.line('--muted',{max:200, dashed:true}), sm = K.line('--accent',{max:200}), pts = inst(K, 60, {geo:G.sphere});
    return {update(p){
      const map = makeMap(p.seed, 0.12), s = [1,1], g = [W-2,H-2]; const res = solve(map, s, g, {algo:'astar', diag:true, h:'oct', useCost:false});
      const keep = []; if (res.path.length){ let i = 0; keep.push(res.path[0]); while (i < res.path.length-1){ let j = res.path.length-1; while (j > i+1 && !los(map, res.path[i], res.path[j])) j--; keep.push(res.path[j]); i = j; } }
      cells.begin(); drawMap(cells, map, {mud:false}); cells.add(P(...s,0.3), V(0.6,0.6,0.6), '--ok'); cells.add(P(...g,0.3), V(0.6,0.6,0.6), '--bad'); cells.end();
      drawPath(raw, res.path); drawPath(sm, p.smooth ? keep : res.path); pts.begin(); (p.smooth ? keep : res.path).forEach(c=>pts.add(P(...c,0.35), 0.16, '--accent')); pts.end();
      const len = arr=>arr.reduce((s,c,i)=>i ? s + Math.hypot(c[0]-arr[i-1][0], c[1]-arr[i-1][1]) : 0, 0);
      return {before:res.path.length, after:keep.length, l0:len(res.path), l1:len(keep)};
    }};
  },
  readout:(p,o)=>[['waypoints', `${o.before} → ${p.smooth ? o.after : o.before}`,'acc'],['length', `${f(o.l0,1)} → ${f(p.smooth ? o.l1 : o.l0,1)} cells`]],
  code:(p,o)=>`local function smooth(path)
    local result = { path[1] }
    local i = 1
    while i < #path do
        local j = #path
        while j > i + 1 and not lineOfSight(path[i], path[j]) do
            j -= 1                                -- can't see that far: try closer
        end
        table.insert(result, path[j])
        i = j
    end
    return result                                 -- ${o.before} waypoints → ${o.after}
end`,
  body:`<p>Grid paths zig-zag cell by cell, and units following them look robotic. <b>String pulling</b> tightens the path like pulling a string taut: from the current point, look ahead for the furthest waypoint you can reach in a straight line, jump there, and repeat.</p>
<p>The result has far fewer waypoints, is shorter, and cuts cleanly across open spaces while still bending around walls. Toggle smoothing to compare with the raw grid path (dashed).</p>`,
  uses:[`<b>Natural NPC movement</b> after grid pathfinding.`,`<b>Fewer MoveTo calls</b> and less network traffic.`,`<b>Cleaner patrol routes</b> from a grid editor.`],
  gotchas:[`Check line of sight with the unit's width in mind (or a spherecast), or smoothed paths clip wall corners.`]
});

const NODES = [[-9,-5],[-5,-6],[-1,-4],[3,-6],[8,-5],[-8,0],[-3,0],[2,1],[7,0],[-6,5],[0,5],[5,5],[9,4]];
const EDGES = [[0,1],[1,2],[2,3],[3,4],[0,5],[1,6],[2,6],[2,7],[3,7],[4,8],[5,6],[6,7],[7,8],[5,9],[6,10],[7,10],[7,11],[8,12],[9,10],[10,11],[11,12]];
demo({
  id:'pf-waypoints', title:'Waypoint graphs', short:'nodes, edges, Dijkstra', sig:'graph[node] = { {neighbour, distance}, ... }',
  view:{theta:0.0, phi:0.6, r:24, ty:0}, env:'grid',
  params:[R('a','From node',1,13,1,1), R('b','To node',1,13,1,13), R('block','Block edge (0 = none)',0,21,1,0)],
  setup(K){ const nodes = inst(K, 20, {geo:G.sphere}), edges = K.add(new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:C('--muted')}))), path = K.line('--accent',{max:20}), labs = labels(K, 13, '--ink'), elabs = labels(K, 21, '--muted','tiny');
    return {update(p){
      const pos = NODES.map(([x,z])=>V(x,0.4,z)), adj = NODES.map(()=>[]); const pts = [];
      EDGES.forEach(([a,b],i)=>{ if (p.block === i+1) return; const d = pos[a].distanceTo(pos[b]); adj[a].push([b,d]); adj[b].push([a,d]); pts.push(pos[a], pos[b]); });
      edges.geometry.dispose(); edges.geometry = new THREE.BufferGeometry().setFromPoints(pts);
      const s = p.a-1, g = p.b-1, dist = NODES.map(()=>Infinity), prev = NODES.map(()=>-1), done = NODES.map(()=>false); dist[s] = 0;
      for (let it=0; it<NODES.length; it++){ let u = -1; dist.forEach((d,i)=>{ if (!done[i] && (u<0 || d<dist[u])) u = i; }); if (u<0 || dist[u]===Infinity) break; done[u] = true; adj[u].forEach(([v,w])=>{ if (dist[u]+w < dist[v]){ dist[v] = dist[u]+w; prev[v] = u; } }); }
      const route = []; if (dist[g] < Infinity){ let c = g; while (c >= 0){ route.unshift(c); c = prev[c]; } }
      path.set(route.map(i=>pos[i].clone().setY(0.6))); path.visible = route.length > 1;
      nodes.begin(); labs.begin(); pos.forEach((q,i)=>{ nodes.add(q, i===s ? 0.45 : i===g ? 0.45 : 0.3, i===s ? '--ok' : i===g ? '--bad' : route.includes(i) ? '--accent' : '--va'); labs.add(String(i+1), q.clone().setY(1.2)); }); nodes.end(); labs.end();
      elabs.begin(); EDGES.forEach(([a,b],i)=>{ if (p.block !== i+1) elabs.add('e'+(i+1), pos[a].clone().lerp(pos[b],0.5).setY(0.3)); }); elabs.end();
      return {route, d:dist[g]};
    }};
  },
  readout:(p,o)=>[['route', o.route.length ? o.route.map(i=>i+1).join(' → ') : 'no route','acc'],['distance', o.d < Infinity ? f(o.d,1)+' studs' : '∞']],
  code:(p,o)=>`-- waypoints are parts in a folder; edges connect ones you can walk between
local graph = {}                                -- graph[a] = { {b, distance}, ... }
for _, edge in edges do
    local a, b = edge[1], edge[2]
    local d = (a.Position - b.Position).Magnitude
    graph[a] = graph[a] or {}; table.insert(graph[a], {b, d})
    graph[b] = graph[b] or {}; table.insert(graph[b], {a, d})
end

local route = dijkstra(graph, node${p.a}, node${p.b})
--> ${o.route.length ? o.route.map(i=>i+1).join(' → ') : 'no route'}`,
  body:`<p>Pathfinding doesn't need a grid. A <b>waypoint graph</b> is a set of points (nodes) joined by walkable links (edges), each with a length. Dijkstra or A* work exactly the same way on it, just with fewer, bigger steps.</p>
<p>Hand-placed waypoints are cheap and give designers control over where NPCs walk. Block an edge (a door closes, a bridge breaks) and the route reroutes instantly, or fails if there's no other way.</p>`,
  uses:[`<b>NPC patrols and town routes</b> through doors and corridors.`,`<b>Train, bus and road networks</b>.`,`<b>Huge maps</b> where grids would be too big.`],
  gotchas:[`Recheck edges after the map changes; a stale graph sends NPCs into walls.`]
});

demo({
  id:'pf-follow', title:'Following a path', short:'advance when close enough', sig:'move toward waypoint[i]; when within radius, i += 1', time:true,
  view:{theta:0.0, phi:0.55, r:24, ty:0}, env:'grid',
  params:[R('radius','Arrive radius',0.2,3,0.1,1.2), R('speed','Speed',2,12,0.5,6), T('look','Look ahead (cut corners)',true)],
  setup(K){ const way = [[-9,-5],[-9,4],[-3,4],[-3,-3],[3,-3],[3,5],[9,5],[9,-4]].map(([x,z])=>V(x,0.1,z)); K.line('--muted',{dashed:true, max:8}).set(way);
    const rings = way.map(w=>{ const r = K.ring(1,'--va',{y:0.05}); r.position.set(w.x,0,w.z); return r; }), npc = K.part(V(0.9,1.6,0.9)), trail = K.line('--accent',{max:400}); const lab = K.label('','--ink');
    return {update(p,t){
      rings.forEach(r=>r.scale.set(p.radius,1,p.radius));
      const pos = way[0].clone(), hist = [pos.clone()]; let i = 1; const h = 1/30, steps = Math.floor((t % 16)/h);
      for (let s=0; s<steps && i < way.length; s++){ let target = way[i]; if (p.look && i+1 < way.length){ const d = pos.distanceTo(way[i]); if (d < p.radius*2) target = way[i].clone().lerp(way[i+1], clamp(1 - d/(p.radius*2),0,1)*0.5); }
        const dir = target.clone().sub(pos); dir.y = 0; const L = dir.length(); if (L > 1e-6) pos.addScaledVector(dir, Math.min(1, p.speed*h/L));
        if (pos.distanceTo(way[i]) <= p.radius) i++; if (s % 3 === 0) hist.push(pos.clone()); }
      trail.set(hist.slice(-400).map(q=>q.clone().setY(0.15))); const nxt = way[Math.min(i, way.length-1)]; npc.setCF(CF.lookAt(pos.clone().setY(0.8), nxt.clone().setY(0.8).add(V(1e-4,0,0))));
      lab.at(pos.clone().setY(2)).text(i < way.length ? `→ waypoint ${i+1}` : 'arrived');
      return {i};
    }};
  },
  readout:(p,o)=>[['current waypoint', String(Math.min(o.i+1, 8))+' of 8','acc']],
  code:(p)=>`local path = PathfindingService:CreatePath({ AgentRadius = 2, AgentCanJump = true })
path:ComputeAsync(npc.HumanoidRootPart.Position, goal)
if path.Status ~= Enum.PathStatus.Success then return end

local waypoints = path:GetWaypoints()
for i = 2, #waypoints do
    local wp = waypoints[i]
    if wp.Action == Enum.PathWaypointAction.Jump then humanoid.Jump = true end
    humanoid:MoveTo(wp.Position)
    -- move on when close enough, instead of waiting to touch it exactly
    repeat task.wait() until (npc.HumanoidRootPart.Position - wp.Position).Magnitude < ${p.radius}
end

path.Blocked:Connect(function() --[[ something moved in the way: compute again ]] end)`,
  body:`<p>Finding a path is half the job; following it well is the other half. The usual loop: move toward the current waypoint, and once you're within an <b>arrive radius</b>, switch to the next. Too small a radius and the NPC overshoots and circles back; too big and it cuts corners into walls.</p>
<p><b>Look ahead</b> starts turning toward the following waypoint as you approach a corner, giving smoother turns. Try a small radius with high speed to see the overshoot, then turn look-ahead on.</p>`,
  uses:[`<b>NPCs following PathfindingService paths.</b>`,`<b>Vehicles on race lines and patrol routes.</b>`,`<b>Cutscene characters</b> walking set routes.`],
  gotchas:[`Listen to <code>path.Blocked</code> and recompute when something moves into the way.`,`<code>MoveToFinished</code> also fires after an 8-second timeout. Check distance rather than trusting it.`]
});

Lab.finder([
  ['Find the shortest path on a grid','breadth-first search','pf-bfs'],
  ['Make NPCs avoid mud or danger','Dijkstra with costs','pf-dijkstra'],
  ['Make pathfinding faster','A* with a heuristic','pf-astar'],
  ['Pathfind with diagonal moves','octile heuristic','pf-heuristics'],
  ['Move hundreds of enemies to one goal','flow field','pf-flow'],
  ['Make grid paths less zig-zaggy','string pulling','pf-smooth'],
  ['Make NPC routes with hand-placed waypoints','waypoint graph + Dijkstra','pf-waypoints'],
  ['Make an NPC follow a PathfindingService path','arrive radius + next waypoint','pf-follow'],
]);
Lab.ref('path','Pathfinding',[
  ['BFS','queue, expand oldest first','table.insert / head index','Equal-cost grids'],
  ['Dijkstra','priority = cost so far','open:push(n, g)','Terrain costs'],
  ['A*','priority = g + h','open:push(n, g + h)','Fast single paths'],
  ['octile h','dx + dz + (√2 − 2)·min','heuristic(dx, dz)','8-way grids'],
  ['flow field','search from goal, follow arrows','directionAt(cell)','Crowds'],
  ['string pulling','skip to furthest visible point','lineOfSight(a, b)','Smoother paths'],
  ['PathfindingService','navmesh paths','path:ComputeAsync(a, b)','Characters in 3D worlds'],
]);
})();
