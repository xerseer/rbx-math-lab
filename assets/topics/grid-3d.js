(function(){
"use strict";
// More "Grids & tiles" topics: 3D grids, voxels, snapping, autotiling, sparse storage.
const {THREE, V, C, f, G, R, S, T, clamp, noise, mulberry32} = Lab;
const {inst, labels} = Lab.kit2;
const demo = Lab.more('grid');
const mix = (a, b, t)=>new THREE.Color().copy(C(a)).lerp(C(b), clamp(t, 0, 1));
const BLOCK = {grass:new THREE.Color('#5fae4f'), dirt:new THREE.Color('#8a5a35'), stone:new THREE.Color('#8a8a8a'), sand:new THREE.Color('#e4d19a'), water:new THREE.Color('#3b7fd6')};

/* square floor grid centred on the origin: n cells of `size` on each side */
function floorGrid(K, n, size, y=0.01){ const pts = [], h = n*size/2;
  for (let i=0;i<=n;i++){ const c = -h + i*size; pts.push(V(c,y,-h), V(c,y,h), V(-h,y,c), V(h,y,c)); }
  return K.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:C('--muted'), transparent:true, opacity:0.45}))); }
function segs(K, color, opacity=0.8){ const m = K.add(new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:C(color), transparent:true, opacity})));
  m.setPts = pts=>{ m.geometry.dispose(); m.geometry = new THREE.BufferGeometry().setFromPoints(pts); return m; }; return m; }

/* ---------------------------------------------------------------- */
demo({
  id:'gr-voxel', title:'3D grids: world ↔ voxel', short:'floor on all three axes', sig:'voxel = (⌊x / s⌋, ⌊y / s⌋, ⌊z / s⌋)   ·   centre = (voxel + 0.5) × s',
  view:{theta:0.75, phi:1.05, r:22, ty:2}, env:'none',
  params:[R('x','World X',-5.9,5.9,0.1,2.3), R('y','World Y',0,5.9,0.1,3.4), R('z','World Z',-5.9,5.9,0.1,-1.6), S('size','Voxel size',[['1','1'],['2','2'],['3','3']],'2')],
  setup(K){ let gl = null, key = '';
    const vox = K.part(V(1,1,1),'--accent',{front:false, opacity:0.5}), stack = K.part(V(1,1,1),'--va',{front:false, opacity:0.15});
    const pt = K.point('--vb',0.18), ctr = K.point('--ink',0.12), drop = K.line('--muted',{dashed:true}), ln = K.line('--ink',{dashed:true});
    const lp = K.label('world point','--vb'), lv = K.label('','--accent-ink','big');
    return {update(p){
      const s = +p.size; if (key !== p.size){ key = p.size; K.drop(gl); gl = floorGrid(K, Math.round(12/s), s); }
      const vx = Math.floor(p.x/s), vy = Math.floor(p.y/s), vz = Math.floor(p.z/s), c = V((vx+0.5)*s, (vy+0.5)*s, (vz+0.5)*s);
      vox.resize(V(s,s,s)); vox.position.copy(c);
      stack.visible = vy > 0; if (vy > 0){ stack.resize(V(s*0.98, vy*s, s*0.98)); stack.position.set(c.x, vy*s/2, c.z); }
      const P = V(p.x, p.y, p.z); pt.position.copy(P); ctr.position.copy(c); drop.set(P, V(p.x, 0.02, p.z)); ln.set(P, c);
      lp.at(P.clone().add(V(0,0.6,0))); lv.at(c.clone().add(V(0, s/2 + 0.9, 0))).text(`voxel (${vx}, ${vy}, ${vz})`);
      return {vx, vy, vz, c};
    }};
  },
  readout:(p,o)=>[['voxel', `(${o.vx}, ${o.vy}, ${o.vz})`,'acc'],['voxel centre', `${f(o.c.x)}, ${f(o.c.y)}, ${f(o.c.z)}`],['voxels stacked below it', String(o.vy)]],
  code:(p,o)=>`local SIZE = ${p.size}

local function WorldToVoxel(position: Vector3): Vector3
    return Vector3.new(
        math.floor(position.X / SIZE),
        math.floor(position.Y / SIZE),
        math.floor(position.Z / SIZE)
    )
end

local function VoxelToWorld(voxel: Vector3): Vector3      -- the middle of the voxel
    return (voxel + Vector3.new(0.5, 0.5, 0.5)) * SIZE
end

print(WorldToVoxel(Vector3.new(${p.x}, ${p.y}, ${p.z})))   --> ${o.vx}, ${o.vy}, ${o.vz}`,
  body:`<p>A <b>voxel</b> is a 3D grid cell: a little cube of space. Converting between world positions and voxels works exactly like a flat grid, just on all three axes: divide by the voxel size and round <b>down</b>. Going back, add half a voxel to land in the middle.</p>
<p>Move the point up and down: its Y picks which layer it's in, and the faint column shows the voxels stacked underneath. Change the voxel size and the same point lands in a different voxel.</p>`,
  uses:[`<b>Block-building games</b>: which block space did the player point at?`,`<b>Roblox Terrain</b> is stored in 4-stud voxels; <code>Terrain:WorldToCell</code> does this same floor.`,`<b>3D spatial lookups</b>: bucket objects by voxel to find what's near.`],
  gotchas:[`Use <code>math.floor</code>, not <code>math.round</code>, or the voxel boundaries shift by half and negative positions go wrong.`,`<code>Vector3</code> stores 32-bit floats; for huge coordinates keep voxel indices as plain numbers instead.`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'gr-index3d', title:'A 3D grid in a 1D list', short:'x + (z − 1)·W + (y − 1)·W·D', sig:'index = x + (z − 1) × W + (y − 1) × W × D   ·   layer y holds W × D cells',
  view:{theta:0.7, phi:1.05, r:20, ty:2.5}, env:'grid',
  params:[R('w','Width W (x)',2,5,1,4), R('h','Height H (y)',2,4,1,3), R('d','Depth D (z)',2,5,1,3), R('x','Cell x',1,5,1,2), R('y','Cell y',1,4,1,2), R('z','Cell z',1,5,1,3)],
  setup(K){ const solid = inst(K, 100), ghost = inst(K, 100, {opacity:0.18}), labs = labels(K, 26, '--ink', 'tiny'), lab = K.label('','--accent-ink','big');
    return {update(p){
      const Wd = p.w, Hd = p.h, Dd = p.d, x = Math.min(p.x, Wd), y = Math.min(p.y, Hd), z = Math.min(p.z, Dd), gap = 1.5;
      const at = (i,j,k)=>V((i-1-(Wd-1)/2)*gap, (j-1)*gap + 0.6, (k-1-(Dd-1)/2)*gap), idx = x + (z-1)*Wd + (y-1)*Wd*Dd;
      solid.begin(); ghost.begin(); labs.begin();
      for (let j=1;j<=Hd;j++) for (let k=1;k<=Dd;k++) for (let i=1;i<=Wd;i++){ const n = i + (k-1)*Wd + (j-1)*Wd*Dd, P = at(i,j,k);
        if (j !== y){ ghost.add(P, 1, '--part'); continue; }
        solid.add(P, 1, n === idx ? '--accent' : k === z ? '--va' : '--part'); labs.add(String(n), P.clone().add(V(0,0.75,0))); }
      solid.end(); ghost.end(); labs.end(); lab.at(at(x,y,z).add(V(0,1.6,0))).text(`(${x}, ${y}, ${z}) → ${idx}`);
      return {idx, x, y, z, layer:Wd*Dd};
    }};
  },
  readout:(p,o)=>[['index', String(o.idx),'acc'],['cells per layer (W × D)', String(o.layer)],['layer '+o.y+' starts at', String((o.y-1)*o.layer + 1)]],
  code:(p,o)=>`local W, H, D = ${p.w}, ${p.h}, ${p.d}
local cells = table.create(W * H * D, 0)       -- one flat list for the whole block

local function Index(x: number, y: number, z: number): number   -- all start at 1
    return x + (z - 1) * W + (y - 1) * W * D
end

local function Coords(index: number): (number, number, number)
    local i = index - 1
    return i % W + 1, i // (W * D) + 1, (i // W) % D + 1        -- x, y, z
end

print(Index(${o.x}, ${o.y}, ${o.z}))    --> ${o.idx}
print(Coords(${o.idx}))     --> ${o.x}  ${o.y}  ${o.z}`,
  body:`<p>A 3D grid fits in one flat list the same way a 2D one does, with one more step. Lay each row of <b>W</b> cells end to end to make a layer of <b>W × D</b> cells, then stack the layers. So x moves 1, z moves a whole row (W), and y moves a whole layer (W × D).</p>
<p>Only the chosen layer is solid and numbered; the row it's in is teal. Raise <i>y</i> by one and the index jumps by a full layer. Going back uses <code>%</code> and <code>//</code> on each size in turn.</p>`,
  uses:[`<b>Voxel chunks</b>: a 16 × 16 × 16 chunk is one list of 4096 entries.`,`<b>Saving builds</b> compactly, one byte per block in a <code>buffer</code>.`,`<b>Terrain:ReadVoxels</b> returns 3D arrays you can flatten the same way.`],
  gotchas:[`Pick one order (x, then z, then y here) and use it everywhere; mixing orders scrambles the world.`,`Lua lists start at 1, so subtract 1 before <code>%</code> and <code>//</code> and add it back after.`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'gr-nb3d', title:'Neighbours in 3D: 6, 18 or 26', short:'faces, edges, corners', sig:'faces: |dx|+|dy|+|dz| = 1  ·  edges: = 2  ·  corners: = 3',
  view:{theta:0.7, phi:1.1, r:16, ty:2}, env:'grid',
  params:[S('mode','Neighbours',[['6','6: sharing a face'],['18','18: face or edge'],['26','26: anything touching']],'6'), R('gap','Pull apart',0,1.5,0.05,0.7), T('tags','Show offsets',false)],
  setup(K){ const solid = inst(K, 27), ghost = inst(K, 27, {opacity:0.12}), labs = labels(K, 26, '--ink', 'tiny');
    return {update(p){
      const lim = p.mode === '6' ? 1 : p.mode === '18' ? 2 : 3, sp = 1 + p.gap, cnt = [0,0,0,0];
      solid.begin(); ghost.begin(); labs.begin(); solid.add(V(0,2,0), 1, '--accent');
      for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) for (let dz=-1;dz<=1;dz++){ const k = Math.abs(dx)+Math.abs(dy)+Math.abs(dz); if (!k) continue;
        const P = V(dx*sp, 2 + dy*sp, dz*sp); if (k > lim){ ghost.add(P, 0.9, '--part'); continue; } cnt[k]++;
        solid.add(P, 0.9, k === 1 ? '--va' : k === 2 ? '--vb' : '--y'); if (p.tags) labs.add(`${dx},${dy},${dz}`, P.clone().add(V(0,0.7,0))); }
      solid.end(); ghost.end(); labs.end(); return {cnt, n:cnt[1]+cnt[2]+cnt[3]};
    }};
  },
  readout:(p,o)=>[['neighbours', String(o.n),'acc'],['face (teal)', String(o.cnt[1])],['edge (pink)', String(o.cnt[2])],['corner (yellow)', String(o.cnt[3])]],
  code:(p)=>`local MAX_STEPS = ${p.mode === '6' ? 1 : p.mode === '18' ? 2 : 3}   -- 1 = faces only, 2 = + edges, 3 = + corners

local OFFSETS = {}
for dx = -1, 1 do
    for dy = -1, 1 do
        for dz = -1, 1 do
            local steps = math.abs(dx) + math.abs(dy) + math.abs(dz)
            if steps >= 1 and steps <= MAX_STEPS then
                table.insert(OFFSETS, Vector3.new(dx, dy, dz))
            end
        end
    end
end
print(#OFFSETS)   --> ${p.mode}`,
  body:`<p>In a flat grid a cell has 4 or 8 neighbours. In 3D there are three kinds: <b>6</b> that share a face (teal), <b>12</b> that share only an edge (pink) and <b>8</b> that touch only at a corner (yellow). Add up how many axes the offset moves on to tell them apart.</p>
<p>Which set you use changes how things spread. Water and lighting usually flow through faces only (6), or it leaks through diagonal cracks. Checking whether a block is "touching anything" often uses all 26.</p>`,
  uses:[`<b>Water and lava flow</b> and light spreading between blocks (6).`,`<b>Hidden face checks</b>: only the 6 face neighbours can cover a face.`,`<b>3D flood fill and cave connectivity.</b>`],
  gotchas:[`Build the offset table once, outside your loops; don't create new Vector3s for every cell every frame.`,`At the edge of the world, some neighbours don't exist. Treat them as air or as solid on purpose.`]
});

/* ---------------------------------------------------------------- */
const FACES = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
demo({
  id:'gr-faces', title:'Hidden faces: only draw what touches air', short:'skip faces with a solid neighbour', sig:'draw face if the neighbour on that side is air   ·   faces drawn ≪ 6 × blocks',
  view:{theta:0.6, phi:1.05, r:22, ty:3}, env:'grid',
  params:[S('shape','Shape',[['ball','Ball'],['hills','Hills'],['cube','Solid cube']],'ball'), T('cull','Skip hidden faces',true), R('cut','Cut away the front',0,9,1,3)],
  setup(K){ const Nn = 10, plates = inst(K, Nn*Nn*Nn*6); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k;
        const solid = (x,y,z)=>{ if (x<0||y<0||z<0||x>=Nn||y>=Nn||z>=Nn) return false;
          if (p.shape === 'ball') return Math.hypot(x-4.5, y-4.5, z-4.5) < 4.7;
          if (p.shape === 'hills') return y < 2 + 6*(0.5 + 0.9*noise(x*0.21 + 0.3, z*0.21 + 0.6, 3.1));
          return true; };
        let blocks = 0, drawn = 0, hidden = 0; plates.begin();
        for (let x=0;x<Nn;x++) for (let y=0;y<Nn;y++) for (let z=0;z<Nn;z++){ if (!solid(x,y,z)) continue; blocks++; if (z >= Nn - p.cut) continue;
          const c = V(x - 4.5, y + 0.5, z - 4.5);
          for (const [a,b,d] of FACES){ const open = !solid(x+a, y+b, z+d); if (!open) hidden++; if (!open && p.cull) continue; drawn++;
            const sz = V(a ? 0.06 : 0.94, b ? 0.06 : 0.94, d ? 0.06 : 0.94);
            plates.add(c.clone().add(V(a*0.47, b*0.47, d*0.47)), sz, !open ? '--bad' : b === 1 ? '--va' : b === -1 ? '--muted' : '--part'); } }
        plates.end(); res = {blocks, all:blocks*6, drawn, hidden}; }
      return res; }};
  },
  readout:(p,o)=>[['blocks', String(o.blocks)],['faces if every block drew 6', String(o.all)],['faces touching air', String(o.all - o.hidden),'acc'],['hidden faces', p.cull ? `${o.hidden} skipped (${f(o.hidden/Math.max(1,o.all)*100,0)}%)` : `${o.hidden} drawn for nothing`, p.cull ? 'ok' : 'bad']],
  code:(p)=>`local FACES = {
    Vector3.new(1, 0, 0), Vector3.new(-1, 0, 0),
    Vector3.new(0, 1, 0), Vector3.new(0, -1, 0),
    Vector3.new(0, 0, 1), Vector3.new(0, 0, -1),
}

for _, block in blocks do
    for _, normal in FACES do
        if not IsSolid(block + normal) then      -- only faces with air next to them
            DrawFace(block, normal)
        end
    end
end`,
  body:`<p>A solid ball of blocks has thousands of faces, but you can only ever see the ones on the outside. A face is hidden when the block next to it on that side is solid, so <b>skip any face whose neighbour isn't air</b>. That one check is what lets block games draw huge worlds.</p>
<p>Cut the front away to look inside. With skipping on, the shape is hollow: there's nothing inside to draw. Turn it off and every hidden face (red) is drawn for nothing.</p>`,
  uses:[`<b>Voxel meshes</b>: build EditableMesh triangles only for exposed faces.`,`<b>Deciding which blocks need Parts at all</b>: a block with 6 solid neighbours can be skipped entirely.`,`<b>Collision</b>: only the surface needs colliders.`],
  gotchas:[`Recheck the 6 neighbours when a block is placed or broken, not just the block itself: their faces change too.`,`At chunk borders, look up the neighbour in the next chunk, or you'll draw a wall of faces along every border.`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'gr-dda', title:'Which voxels does a ray pass through?', short:'step to the nearest boundary (DDA)', sig:'tMax = distance to the next boundary on each axis; step the smallest, add tDelta',
  view:{theta:-0.45, phi:1.0, r:30, tx:-1, ty:1, tz:1}, env:'none',
  params:[R('yaw','Aim left / right',0,90,1,40,'°'), R('pitch','Aim down',5,60,1,24,'°'), R('oy','Start height',4,10,0.5,7.5), R('seed','Terrain seed',1,40,1,5)],
  setup(K){ const terr = inst(K, 14*14*6), seen = inst(K, 90, {opacity:0.3}), ray = K.line('--accent'), nrm = K.arrow('--vb'), place = K.part(V(1,1,1),'--va',{front:false, opacity:0.4}), eye = K.point('--accent',0.25);
    const lab = K.label('','--accent-ink','big'), lp = K.label('place here','--va'); let tkey = '', hts = null;
    return {update(p){
      if (tkey !== String(p.seed)){ tkey = String(p.seed); hts = []; for (let i=0;i<14;i++){ hts.push([]); for (let k=0;k<14;k++) hts[i].push(clamp(Math.round(2.5 + 4*noise(i*0.23 + 0.4, k*0.23 + 0.7, p.seed*1.7)), 1, 5)); } }
      const solid = (i,j,k)=>i >= -7 && i < 7 && k >= -7 && k < 7 && j >= 0 && j < hts[i+7][k+7];
      const yaw = p.yaw*Math.PI/180, pit = -p.pitch*Math.PI/180, d = V(Math.sin(yaw)*Math.cos(pit), Math.sin(pit), -Math.cos(yaw)*Math.cos(pit)), O = V(-9.5, p.oy, 9.5);
      // Amanatides & Woo voxel traversal
      let ix = Math.floor(O.x), iy = Math.floor(O.y), iz = Math.floor(O.z); const st = [Math.sign(d.x), Math.sign(d.y), Math.sign(d.z)];
      const tD = [Math.abs(1/d.x), Math.abs(1/d.y), Math.abs(1/d.z)], bnd = (o,i,s)=>(s > 0 ? i + 1 - o : o - i);
      const tM = [bnd(O.x,ix,st[0])*tD[0], bnd(O.y,iy,st[1])*tD[1], bnd(O.z,iz,st[2])*tD[2]];
      const visited = []; let hit = null, normal = null, t = 0, steps = 0;
      for (; steps < 80; steps++){ if (solid(ix,iy,iz)){ hit = [ix,iy,iz]; break; } if (iy < 0) break; visited.push([ix,iy,iz]);
        const a = tM[0] < tM[1] ? (tM[0] < tM[2] ? 0 : 2) : (tM[1] < tM[2] ? 1 : 2); t = tM[a]; tM[a] += tD[a];
        if (a === 0) ix += st[0]; else if (a === 1) iy += st[1]; else iz += st[2]; normal = [0,0,0]; normal[a] = -st[a]; }
      terr.begin(); for (let i=-7;i<7;i++) for (let k=-7;k<7;k++) for (let j=0;j<hts[i+7][k+7];j++){ const isHit = hit && hit[0]===i && hit[1]===j && hit[2]===k;
        terr.add(V(i+0.5, j+0.5, k+0.5), 0.97, isHit ? C('--accent') : j === hts[i+7][k+7]-1 ? BLOCK.grass : BLOCK.dirt); } terr.end();
      seen.begin(); visited.forEach(([i,j,k])=>seen.add(V(i+0.5,j+0.5,k+0.5), 0.9, '--accent')); seen.end();
      const end = O.clone().addScaledVector(d, hit ? t : 30); ray.set(O, end); eye.position.copy(O);
      place.visible = nrm.visible = !!hit; lp.show(!!hit);
      if (hit){ const N = V(...normal), pc = V(hit[0]+0.5, hit[1]+0.5, hit[2]+0.5).add(N); place.position.copy(pc); nrm.set(end, N.clone().multiplyScalar(1.2)); lp.at(pc.clone().add(V(0,1,0))); }
      lab.at(O.clone().add(V(0,1,0))).text(hit ? `hit after ${steps} steps` : 'missed');
      return {steps, hit, normal};
    }};
  },
  readout:(p,o)=>[['voxels stepped through', String(o.steps),'acc'],['hit block', o.hit ? `(${o.hit.join(', ')})` : 'none'],['face normal', o.hit ? `(${o.normal.join(', ')})` : '—'],['new block goes at', o.hit ? `(${o.hit.map((v,i)=>v + o.normal[i]).join(', ')})` : '—']],
  code:()=>`-- step through the voxels a ray crosses, in order (Amanatides & Woo)
local function CastVoxels(origin: Vector3, dir: Vector3, maxSteps: number)
    local cell = Vector3.new(math.floor(origin.X), math.floor(origin.Y), math.floor(origin.Z))
    local step = Vector3.new(math.sign(dir.X), math.sign(dir.Y), math.sign(dir.Z))
    local tDelta = Vector3.new(math.abs(1 / dir.X), math.abs(1 / dir.Y), math.abs(1 / dir.Z))
    local function FirstBoundary(o, c, s) return (s > 0 and c + 1 - o or o - c) end
    local tMax = Vector3.new(
        FirstBoundary(origin.X, cell.X, step.X) * tDelta.X,
        FirstBoundary(origin.Y, cell.Y, step.Y) * tDelta.Y,
        FirstBoundary(origin.Z, cell.Z, step.Z) * tDelta.Z)
    local normal = Vector3.zero

    for _ = 1, maxSteps do
        if IsSolid(cell) then return cell, normal end      -- place a new block at cell + normal
        if tMax.X < tMax.Y and tMax.X < tMax.Z then
            cell += Vector3.new(step.X, 0, 0); tMax += Vector3.new(tDelta.X, 0, 0); normal = Vector3.new(-step.X, 0, 0)
        elseif tMax.Y < tMax.Z then
            cell += Vector3.new(0, step.Y, 0); tMax += Vector3.new(0, tDelta.Y, 0); normal = Vector3.new(0, -step.Y, 0)
        else
            cell += Vector3.new(0, 0, step.Z); tMax += Vector3.new(0, 0, tDelta.Z); normal = Vector3.new(0, 0, -step.Z)
        end
    end
    return nil
end`,
  body:`<p>To find which block the player is looking at, you could test every block against the ray, but there's a much faster way. Walk along the ray <b>one voxel at a time</b>. On each axis, work out how far along the ray the next boundary is (<code>tMax</code>), step across whichever boundary comes first, and check that voxel. The first solid one is the hit.</p>
<p>The axis you crossed last tells you which <b>face</b> you hit, and the voxel on the other side of that face (green ghost) is where a new block goes. The faint cubes are every voxel the ray passed through.</p>`,
  uses:[`<b>Block picking and placing</b> in building games, without needing Parts for every block.`,`<b>Line of sight</b> through a voxel world.`,`<b>Fast bullets</b> in block games.`],
  gotchas:[`If a direction component is exactly 0, <code>1 / 0</code> is infinity; that's fine here, as that axis is simply never chosen.`,`Always cap the steps so a ray that misses everything stops.`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'gr-greedy', title:'Greedy meshing: fewer, bigger parts', short:'merge same blocks into rectangles', sig:'grow right while the same, then down while the whole row matches',
  view:{theta:0.0, phi:0.4, r:27, ty:0}, env:'none',
  params:[S('mode','Build with',[['greedy','Merged rectangles'],['cells','One part per cell']],'greedy'), R('scale','Pattern size',0.08,0.4,0.01,0.18), R('seed','Seed',1,60,1,4)],
  setup(K){ const Wd = 16, Hd = 12, cs = 1.2, boxes = inst(K, Wd*Hd), edges = segs(K, '--ink', 0.6); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k;
        const type = []; for (let z=0;z<Hd;z++){ type.push([]); for (let x=0;x<Wd;x++){ const n = noise(x*p.scale + 0.31, z*p.scale + 0.57, p.seed*2.3); type[z].push(n < -0.12 ? 0 : n < 0.15 ? 1 : 2); } }
        const rects = [];
        if (p.mode === 'cells'){ for (let z=0;z<Hd;z++) for (let x=0;x<Wd;x++) if (type[z][x]) rects.push([x,z,1,1,type[z][x]]); }
        else { const used = type.map(r=>r.map(()=>false));
          for (let z=0;z<Hd;z++) for (let x=0;x<Wd;x++){ const t = type[z][x]; if (!t || used[z][x]) continue;
            let w = 1; while (x+w < Wd && type[z][x+w] === t && !used[z][x+w]) w++;
            let h = 1; grow: while (z+h < Hd){ for (let i=0;i<w;i++) if (type[z+h][x+i] !== t || used[z+h][x+i]) break grow; h++; }
            for (let j=0;j<h;j++) for (let i=0;i<w;i++) used[z+j][x+i] = true; rects.push([x,z,w,h,t]); } }
        const x0 = -Wd*cs/2, z0 = -Hd*cs/2, pts = []; boxes.begin();
        rects.forEach(([x,z,w,h,t],i)=>{ const ht = t === 1 ? 0.5 : 1.1, cx = x0 + (x + w/2)*cs, cz = z0 + (z + h/2)*cs, base = t === 1 ? BLOCK.grass : BLOCK.stone;
          boxes.add(V(cx, ht/2, cz), V(w*cs - 0.08, ht, h*cs - 0.08), base.clone().lerp(C('--ink'), (i % 3)*0.07));
          const a = x0 + x*cs + 0.04, b = x0 + (x+w)*cs - 0.04, c = z0 + z*cs + 0.04, e = z0 + (z+h)*cs - 0.04, y = ht + 0.01;
          pts.push(V(a,y,c),V(b,y,c), V(b,y,c),V(b,y,e), V(b,y,e),V(a,y,e), V(a,y,e),V(a,y,c)); });
        boxes.end(); edges.setPts(pts);
        let cells = 0; type.forEach(r=>r.forEach(t=>{ if (t) cells++; })); res = {parts:rects.length, cells}; }
      return res; }};
  },
  readout:(p,o)=>[['parts used', String(o.parts),'acc'],['blocks covered', String(o.cells)],['saved', f((1 - o.parts/Math.max(1,o.cells))*100,0)+'%', 'ok']],
  code:()=>`local used = {}
local function IsFree(x, z, kind) return Get(x, z) == kind and not used[z * W + x] end

for z = 1, H do
    for x = 1, W do
        local kind = Get(x, z)
        if kind == nil or used[z * W + x] then continue end

        local width = 1                      -- 1. grow to the right
        while x + width <= W and IsFree(x + width, z, kind) do width += 1 end

        local depth = 1                      -- 2. grow down while the whole row matches
        while z + depth <= H do
            local rowOk = true
            for i = 0, width - 1 do
                if not IsFree(x + i, z + depth, kind) then rowOk = false break end
            end
            if not rowOk then break end
            depth += 1
        end

        for j = 0, depth - 1 do for i = 0, width - 1 do used[(z + j) * W + x + i] = true end end
        MakeBlockPart(x, z, width, depth, kind)  -- one Part instead of width × depth
    end
end`,
  body:`<p>Every Part costs memory and physics time, so a voxel world with one Part per block gets slow fast. <b>Greedy meshing</b> merges neighbouring blocks of the same kind into big rectangles. Scan the grid; at each unused block, grow a rectangle right as far as it can, then down as long as the whole row still matches. Mark it used and repeat.</p>
<p>Switch between the two modes and compare the part counts. Each outline is one Part. The result isn't the smallest possible number of rectangles, but it's close and very fast.</p>`,
  uses:[`<b>Building voxel maps out of Parts</b> with far fewer instances.`,`<b>Saving builds</b>: store rectangles instead of single blocks.`,`<b>Mesh generation</b>: the same idea merges faces when building an EditableMesh.`],
  gotchas:[`Merged parts can't be broken block by block. Split the rectangle back up (or rebuild the chunk) when a player edits it.`,`In 3D, run it on each layer, or grow in the third direction too.`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'gr-layers', title:'Voxel terrain in layers', short:'grass on top, dirt, then stone', sig:'for y < height:  top = grass,  next DIRT_DEPTH = dirt,  below = stone;  fill water up to SEA',
  view:{theta:0.75, phi:1.0, r:30, ty:2}, env:'none',
  params:[R('scale','Hill size',0.05,0.2,0.005,0.1), R('dirt','Dirt depth',0,5,1,2), R('sea','Sea level',0,6,1,3), R('seed','Seed',1,60,1,8)],
  setup(K){ const Nn = 20, cs = 1, solid = inst(K, Nn*Nn*11), water = inst(K, Nn*Nn*6, {opacity:0.55}); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; const cnt = {grass:0, sand:0, dirt:0, stone:0, water:0};
        solid.begin(); water.begin();
        for (let x=0;x<Nn;x++) for (let z=0;z<Nn;z++){
          let n = 0, a = 1, fr = 1; for (let o=0;o<3;o++){ n += a*noise(x*p.scale*fr + 0.3, z*p.scale*fr + 0.7, p.seed*1.3 + o*7); a *= 0.5; fr *= 2; }
          const h = clamp(Math.round(4.5 + n*9), 1, 10), P = y=>V((x - Nn/2 + 0.5)*cs, y + 0.5, (z - Nn/2 + 0.5)*cs);
          for (let y=0;y<h;y++){ const depth = h - 1 - y; let t = depth === 0 ? (h - 1 < p.sea ? 'sand' : 'grass') : depth <= p.dirt ? (h - 1 < p.sea ? 'sand' : 'dirt') : 'stone'; cnt[t]++; solid.add(P(y), 0.98, BLOCK[t]); }
          for (let y=h;y<p.sea;y++){ cnt.water++; water.add(P(y), 1, BLOCK.water); } }
        solid.end(); water.end(); res = cnt; }
      return res; }};
  },
  readout:(p,o)=>[['grass', String(o.grass)],['sand (at or under water)', String(o.sand)],['dirt', String(o.dirt)],['stone', String(o.stone),'acc'],['water', String(o.water)]],
  code:(p)=>`local DIRT_DEPTH, SEA = ${p.dirt}, ${p.sea}

local function BlockAt(y: number, height: number): string?
    local depth = height - 1 - y                 -- 0 = the top block of this column
    if y >= height then
        return if y < SEA then "Water" else nil  -- air above the ground
    elseif depth == 0 then
        return if height - 1 < SEA then "Sand" else "Grass"
    elseif depth <= DIRT_DEPTH then
        return "Dirt"
    end
    return "Stone"
end

for x = 1, SIZE do
    for z = 1, SIZE do
        local height = math.round(4.5 + Fbm(x * ${p.scale}, z * ${p.scale}) * 9)
        for y = 0, 10 do
            local kind = BlockAt(y, height)
            if kind then PlaceBlock(x, y, z, kind) end
        end
    end
end`,
  body:`<p>Turning a heightmap into voxels is a loop up each column: everything below the height is solid. To make it look like ground, choose the block by <b>depth below the surface</b>: the top block is grass, the next few are dirt, and everything deeper is stone. Columns whose top is at or under the sea become sand, and the gaps up to sea level fill with water.</p>
<p>Look at the sides of the map to see the layers. Set dirt depth to 0 for rocky hills, or raise the sea to drown the valleys.</p>`,
  uses:[`<b>Block worlds</b>: the classic grass, dirt, stone look.`,`<b>Roblox Terrain</b>: <code>Terrain:FillBlock</code> with Grass, Mud and Rock materials by depth.`,`<b>Mining games</b>: deeper layers hold rarer ores (see 3D noise in Procedural generation).`],
  gotchas:[`Don't create Parts for buried stone that nobody can see. Only build blocks that touch air (see Hidden faces).`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'gr-snap', title:'Snapping parts to a build grid', short:'snap the corner, not the centre', sig:'corner = round((mouse − size / 2) / grid) × grid   ·   centre = corner + size / 2',
  view:{theta:0.35, phi:0.75, r:22, ty:0}, env:'none',
  params:[R('mx','Mouse X',-6,6,0.05,2.6), R('mz','Mouse Z',-6,6,0.05,-1.9), R('w','Width (cells)',1,4,1,3), R('d','Depth (cells)',1,4,1,2), T('rot','Turned 90°',false), S('g','Grid',[['1','1 stud'],['2','2 studs']],'2')],
  setup(K){ let gl = null, key = ''; const part = K.part(V(1,1,1),'--accent',{front:false}), ghost = K.part(V(1,1,1),'--vb',{front:false, opacity:0.25}), mouse = K.point('--vb',0.2), ln = K.line('--muted',{dashed:true});
    const lab = K.label('','--accent-ink','big');
    return {update(p){
      const g = +p.g; if (key !== p.g){ key = p.g; K.drop(gl); gl = floorGrid(K, Math.round(16/g), g); }
      const sx = (p.rot ? p.d : p.w)*g, sz = (p.rot ? p.w : p.d)*g, snap = (m, s)=>Math.round((m - s/2)/g)*g + s/2;
      const cx = snap(p.mx, sx), cz = snap(p.mz, sz), H = 1.2;
      part.resize(V(sx - 0.05, H, sz - 0.05)); part.position.set(cx, H/2, cz); ghost.resize(V(sx, H*1.6, sz)); ghost.position.set(p.mx, H*0.8, p.mz);
      mouse.position.set(p.mx, 0.1, p.mz); ln.set(V(p.mx,0.1,p.mz), V(cx,0.1,cz)); lab.at(V(cx, H + 1, cz)).text(`centre ${f(cx)}, ${f(cz)}`);
      const on = (s)=>(s/g) % 2 === 1 ? 'cell centre' : 'grid line';
      return {cx, cz, sx, sz, onX:on(sx), onZ:on(sz)};
    }};
  },
  readout:(p,o)=>[['snapped centre', `${f(o.cx)}, ${f(o.cz)}`,'acc'],['size', `${o.sx} × ${o.sz} studs`],['X centre sits on', o.onX],['Z centre sits on', o.onZ]],
  code:(p)=>`local GRID = ${p.g}

local function Snap(mouse: number, size: number): number
    -- snap the part's corner to the grid, then step back to its centre
    return math.round((mouse - size / 2) / GRID) * GRID + size / 2
end

local size = Vector3.new(${p.rot ? p.d : p.w} * GRID, 1.2, ${p.rot ? p.w : p.d} * GRID)   -- width and depth ${p.rot ? 'swap when turned' : 'as placed'}
local position = Vector3.new(Snap(mouse.X, size.X), size.Y / 2, Snap(mouse.Z, size.Z))`,
  body:`<p>Rounding the mouse position to the grid works for parts one cell wide, but a 2-cell part then hangs half off the cells. The fix is to snap the part's <b>corner</b>: subtract half the size, round to the grid, add half the size back.</p>
<p>The rule that falls out: an <b>odd</b> number of cells centres on a cell, an <b>even</b> number centres on a grid line. Turn the part 90° and the width and depth swap, so the snapping changes too.</p>`,
  uses:[`<b>Building and tycoon games</b>: furniture and walls that line up.`,`<b>Plot and farm placement.</b>`,`<b>Level editors</b> with a snap setting.`],
  gotchas:[`Swap the size when the part is turned 90° before snapping, or rotated pieces end up half a cell off.`,`Snap in the plot's local space (<code>plot.CFrame:PointToObjectSpace</code>) if the plot itself is rotated.`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'gr-autotile', title:'Autotiling with a 4-bit mask', short:'N=1, E=2, S=4, W=8', sig:'mask = N·1 + E·2 + S·4 + W·8   →   one of 16 tile pieces',
  view:{theta:0.0, phi:0.55, r:24, ty:0}, env:'none',
  params:[R('len','Road length',20,140,1,80), R('seed','Seed',1,60,1,6), T('nums','Show mask numbers',true)],
  setup(K){ const Wd = 16, Hd = 12, cs = 1.3, base = inst(K, Wd*Hd), road = inst(K, Wd*Hd*5), labs = labels(K, Wd*Hd, '--ink', 'tiny'); let key = '', res = null;
    return {update(p){ const k = JSON.stringify(p); if (k !== key){ key = k; const r = mulberry32(p.seed*31), on = Array.from({length:Hd}, ()=>Array(Wd).fill(false)), dirs = [[0,-1],[1,0],[0,1],[-1,0]];
        let x = Wd>>1, z = Hd>>1, dir = 1; for (let i=0;i<p.len;i++){ on[z][x] = true; if (r() < 0.3) dir = (dir + (r() < 0.5 ? 1 : 3)) % 4; const nx = x + dirs[dir][0], nz = z + dirs[dir][1]; if (nx<0||nz<0||nx>=Wd||nz>=Hd){ dir = (dir + 2) % 4; continue; } x = nx; z = nz; }
        const at = (i,j,y)=>V((i - Wd/2 + 0.5)*cs, y, (j - Hd/2 + 0.5)*cs), used = new Set(); let count = 0;
        base.begin(); road.begin(); labs.begin();
        for (let j=0;j<Hd;j++) for (let i=0;i<Wd;i++){ base.add(at(i,j,0.05), V(cs*0.98, 0.1, cs*0.98), BLOCK.grass); if (!on[j][i]) continue; count++;
          const g = (a,b)=>a>=0 && b>=0 && a<Wd && b<Hd && on[b][a], mask = (g(i,j-1)?1:0) + (g(i+1,j)?2:0) + (g(i,j+1)?4:0) + (g(i-1,j)?8:0); used.add(mask);
          road.add(at(i,j,0.15), V(cs*0.5, 0.12, cs*0.5), '--part');
          dirs.forEach(([a,b],q)=>{ if (mask & (1 << q)) road.add(at(i,j,0.15).add(V(a*cs*0.37, 0, b*cs*0.37)), V(a ? cs*0.26 : cs*0.5, 0.12, b ? cs*0.26 : cs*0.5), '--part'); });
          if (p.nums) labs.add(String(mask), at(i,j,0.5)); }
        base.end(); road.end(); labs.end(); res = {count, kinds:used.size}; }
      return res; }};
  },
  readout:(p,o)=>[['road tiles', String(o.count)],['different pieces used', `${o.kinds} of 16`,'acc']],
  code:()=>`-- one model per mask value: 0 = lone tile, 5 = straight N-S, 10 = straight E-W, 15 = crossroads...
local TILES = ReplicatedStorage.RoadTiles:GetChildren()

local function Mask(x: number, z: number): number
    local mask = 0
    if IsRoad(x, z - 1) then mask += 1 end    -- north
    if IsRoad(x + 1, z) then mask += 2 end    -- east
    if IsRoad(x, z + 1) then mask += 4 end    -- south
    if IsRoad(x - 1, z) then mask += 8 end    -- west
    return mask                                -- 0..15
end

local piece = TILES[Mask(x, z) + 1]:Clone()`,
  body:`<p>When a player paints a road, each tile needs the right piece: straight, corner, T-junction, crossroads or dead end. Instead of a long chain of if-statements, give each direction a bit: north 1, east 2, south 4, west 8. Add up the bits for the neighbours that are road, and the total (0 to 15) picks one of 16 pieces.</p>
<p>The numbers on the road are each tile's mask. 5 is a straight north-south road (1 + 4), 10 is east-west (2 + 8), 15 is a crossroads. You can make many of the 16 by rotating a few base pieces.</p>`,
  uses:[`<b>Roads, rails, pipes and fences</b> that connect themselves.`,`<b>Walls and cliffs</b> on tile maps; an 8-bit version handles corners too.`,`<b>Water and path edges</b> in 2D games.`],
  gotchas:[`When a tile changes, recompute its 4 neighbours too; their masks changed.`,`For walls that also need inner corners, use the 8-neighbour (47-piece "blob") version.`]
});

/* ---------------------------------------------------------------- */
demo({
  id:'gr-sparse', title:'Sparse voxels: store only what\'s there', short:'one number key per block', sig:'key = (x + OFF) + (y + OFF)·SIDE + (z + OFF)·SIDE²',
  view:{theta:0.7, phi:1.05, r:24, ty:5}, env:'grid',
  params:[R('n','Blocks placed',10,300,5,80), R('size','World size per side',16,256,16,128), R('pick','Inspect block number',1,300,1,1), R('seed','Seed',1,60,1,3)],
  setup(K){ const box = K.add(new THREE.LineSegments(G.edges, new THREE.LineBasicMaterial({color:C('--muted')}))), cubes = inst(K, 300), lab = K.label('','--accent-ink','big');
    return {update(p){
      const S12 = 12, sc = S12/p.size, r = mulberry32(p.seed*13), blocks = []; box.scale.set(S12,S12,S12); box.position.set(0, S12/2, 0);
      // a few clusters, like a player's builds
      const hubs = Array.from({length:4}, ()=>[Math.floor(r()*p.size), Math.floor(r()*p.size*0.3), Math.floor(r()*p.size)]);
      for (let i=0;i<p.n;i++){ const h = hubs[i % 4], sp = Math.max(2, p.size*0.06); blocks.push([clamp(Math.round(h[0] + (r()-0.5)*sp*2),0,p.size-1), clamp(Math.round(h[1] + r()*sp),0,p.size-1), clamp(Math.round(h[2] + (r()-0.5)*sp*2),0,p.size-1)]); }
      const pick = Math.min(p.pick, p.n) - 1, OFF = 512, SIDE = 1024, b = blocks[pick].map(v=>v - (p.size>>1)), key = (b[0]+OFF) + (b[1]+OFF)*SIDE + (b[2]+OFF)*SIDE*SIDE;
      const at = c=>V((c[0] + 0.5)*sc - S12/2, (c[1] + 0.5)*sc, (c[2] + 0.5)*sc - S12/2), s = Math.max(0.22, sc*0.95);
      cubes.begin(); blocks.forEach((c,i)=>cubes.add(at(c), i === pick ? Math.max(0.35, s*1.6) : s, i === pick ? '--accent' : '--va')); cubes.end();
      lab.at(at(blocks[pick]).add(V(0,0.9,0))).text(`(${b.join(', ')}) → key ${key}`);
      return {dense:Math.pow(p.size,3), b, key, pick:pick+1};
    }};
  },
  readout:(p,o)=>[['dense grid cells', o.dense.toLocaleString('en-US')],['sparse entries', String(p.n),'acc'],['dense ÷ sparse', '×'+Math.round(o.dense/p.n).toLocaleString('en-US')],['key of block '+o.pick, String(o.key)]],
  code:(p,o)=>`local OFFSET, SIDE = 512, 1024     -- works for coordinates from -512 to 511

local function Key(x: number, y: number, z: number): number
    return (x + OFFSET) + (y + OFFSET) * SIDE + (z + OFFSET) * SIDE * SIDE
end

local function Unkey(key: number): (number, number, number)
    return key % SIDE - OFFSET, (key // SIDE) % SIDE - OFFSET, key // (SIDE * SIDE) - OFFSET
end

local blocks: { [number]: string } = {}  -- only placed blocks take memory
blocks[Key(${o.b.join(', ')})] = "Stone"          -- key ${o.key}
print(blocks[Key(0, 0, 0)])                 --> nil means air`,
  body:`<p>A full 3D array stores an entry for every cell, even though most of a world is air. A <b>sparse</b> store keeps a dictionary of only the blocks that exist. Missing key? It's air. With a few hundred blocks in a big world, that's thousands of times less memory.</p>
<p>The dictionary needs a key for each position. A string like <code>"3,7,-2"</code> works, but packing x, y and z into <b>one number</b> is faster and smaller: shift each coordinate to be positive, then give each axis its own range of digits. Pick a block number to see its key.</p>`,
  uses:[`<b>Player builds</b>: save only the blocks players actually placed.`,`<b>Infinite worlds</b>: chunks stored by a packed chunk key.`,`<b>Spatial hashes</b> keyed by cell (see Spatial partitioning).`],
  gotchas:[`Numbers are exact up to 2⁵³, so 3 axes of 1024 (2³⁰ total) fit easily, but don't pack more than about 17 bits per axis.`,`Iterating a dictionary has no order. Sort the keys if you need a stable save format.`]
});

Lab.finder([
  ['Find which voxel a 3D position is in','floor on x, y and z','gr-voxel'],
  ['Store a 3D block of voxels in one list','x + (z − 1)·W + (y − 1)·W·D','gr-index3d'],
  ['Get the blocks touching a block in 3D','6 / 18 / 26 neighbours','gr-nb3d'],
  ['Only build the outside of a voxel shape','skip faces next to solid blocks','gr-faces'],
  ['Find the block the player is looking at','voxel ray stepping (DDA)','gr-dda'],
  ['Use fewer parts for a block world','greedy meshing','gr-greedy'],
  ['Make grass, dirt and stone layers','block by depth below the surface','gr-layers'],
  ['Snap a 2×3 part to a build grid','snap the corner, then add half the size','gr-snap'],
  ['Make roads that connect themselves','4-bit neighbour mask','gr-autotile'],
  ['Store blocks in a dictionary by position','packed x, y, z key','gr-sparse'],
]);
Lab.ref('voxel','Voxels & 3D grids',[
  ['math.floor(p / s)','World position → voxel, per axis','math.floor(3.4 / 2) → 1','Block picking'],
  ['x + (z-1)*W + (y-1)*W*D','3D cell → flat list index','2 + 2*4 + 1*12 → 22','Chunks, saving'],
  ['|dx|+|dy|+|dz| = 1','Face neighbours (6)','(1, 0, 0), (0, -1, 0)…','Water, light, faces'],
  ['IsSolid(block + normal)','Is this face hidden?','skip it if true','Voxel meshes'],
  ['tMax += tDelta','Step a ray voxel by voxel','smallest tMax axis wins','Block picking'],
  ['round((m - s/2)/g)*g + s/2','Snap a part of size s to grid g','Snap(1.3, 6) → 1','Building games'],
  ['N·1 + E·2 + S·4 + W·8','Autotile mask','N + S → 5 (straight)','Roads, fences'],
  ['(x+O) + (y+O)·S + (z+O)·S²','Pack x, y, z into one key','O = 512, S = 1024','Sparse worlds'],
]);
})();
