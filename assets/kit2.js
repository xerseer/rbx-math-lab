/* Shared helpers for the larger topic files: graphs, instanced cubes, label pools, bones.
   Also collects extra "I want to" goals and cheat-sheet tables from topic files. */
(function(){
"use strict";
const {THREE, V, UP, C, G, clamp} = Lab;
Lab.FINDER_EXTRA = [];
Lab.REF_EXTRA = {};
Lab.finder = rows=>{ Lab.FINDER_EXTRA.push(...rows); };
Lab.ref = (key, title, rows)=>{ Lab.REF_EXTRA[key] = {title, rows}; };

/* A 2D graph drawn on a vertical plane. xr / yr are the data ranges. */
function graph(K, o={}){
  const g = Object.assign({x0:-10, y0:0.5, w:20, h:8, z:0, xr:[0,1], yr:[0,1]}, o);
  const X = x=>g.x0 + (x - g.xr[0])/(g.xr[1]-g.xr[0])*g.w;
  const Y = y=>g.y0 + (y - g.yr[0])/(g.yr[1]-g.yr[0])*g.h;
  const P = (x,y)=>V(X(x), Y(y), g.z);
  const yLo = g.yr[0] - (g.yr[1]-g.yr[0])*0.3, yHi = g.yr[1] + (g.yr[1]-g.yr[0])*0.3;
  if (o.axes !== false){
    K.line('--muted').set(P(g.xr[0], g.yr[0]), P(g.xr[1], g.yr[0]));
    K.line('--muted').set(P(g.xr[0], g.yr[0]), P(g.xr[0], g.yr[1]));
  }
  if (o.xLabel) K.label(o.xLabel,'--muted').at(V(g.x0 + g.w, g.y0 - 0.7, g.z));
  if (o.yLabel) K.label(o.yLabel,'--muted').at(V(g.x0, g.y0 + g.h + 0.7, g.z));
  (o.xTicks||[]).forEach(([v,t])=>K.label(t,'--muted','tiny').at(V(X(v), g.y0 - 0.45, g.z)));
  (o.yTicks||[]).forEach(([v,t])=>{ const L = K.label(t,'--muted','tiny').at(V(g.x0 - 0.3, Y(v), g.z)); L.el.style.translate = '-50% 0'; });
  const api = {g, X, Y, P,
    curve(color, n=200, opts={}){
      const ln = K.line(color, Object.assign({max:n+1}, opts));
      ln.plot = (fn, a=g.xr[0], b=g.xr[1])=>{ const pts = []; for (let i=0;i<=n;i++){ const x = a + (b-a)*i/n; let y = fn(x); if (!isFinite(y)) y = yHi; pts.push(P(x, clamp(y, yLo, yHi))); } ln.set(pts); return ln; };
      ln.points = arr=>{ ln.set(arr.slice(0,n+1).map(([x,y])=>P(x, clamp(y, yLo, yHi)))); return ln; };
      return ln;
    },
    hline(y, color='--muted', dashed=true){ const l = K.line(color,{dashed}); l.at = yy=>{ l.set(P(g.xr[0],yy), P(g.xr[1],yy)); return l; }; l.at(y); return l; },
    vline(x, color='--muted', dashed=true){ const l = K.line(color,{dashed}); l.at = xx=>{ l.set(P(xx,g.yr[0]), P(xx,g.yr[1])); return l; }; l.at(x); return l; },
    dot(color, r=0.18){ const m = K.point(color, r); m.at = (x,y)=>{ m.position.copy(P(x, clamp(y,yLo,yHi))); return m; }; return m; },
  };
  return api;
}

/* Many coloured boxes (or spheres) in one draw call. */
function inst(K, max, {geo=G.box, opacity=1}={}){
  const mat = new THREE.MeshLambertMaterial({color:0xffffff}); if (opacity < 1){ mat.transparent = true; mat.opacity = opacity; mat.depthWrite = false; }
  const m = K.add(new THREE.InstancedMesh(geo, mat, max)); m.frustumCulled = false;
  const dm = new THREE.Matrix4(), q0 = new THREE.Quaternion(), white = new THREE.Color(1,1,1), cache = {}, sv = V();
  // fill colours while count is still `max`: three.js sizes the colour buffer from the count on first use
  for (let i=0;i<max;i++) m.setColorAt(i, white);
  m.count = 0;
  let n = 0;
  const api = {
    mesh:m,
    begin(){ n = 0; return api; },
    add(pos, scale, color, quat){ if (n >= max) return api; if (typeof scale === 'number') sv.set(scale,scale,scale); else sv.copy(scale);
      dm.compose(pos, quat || q0, sv); m.setMatrixAt(n, dm); m.setColorAt(n, color instanceof THREE.Color ? color : (cache[color] || (cache[color] = C(color)))); n++; return api; },
    end(){ m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; return api; },
    get count(){ return n; }
  };
  return api;
}

/* A fixed pool of labels to reuse. */
function labels(K, n, color='--ink', cls=''){
  const pool = Array.from({length:n}, ()=>K.label('', color, cls).show(false));
  let used = 0;
  return { begin(){ used = 0; return this; }, add(text, pos, c){ if (used >= n) return null; const L = pool[used++]; L.show(true).at(pos).text(text); if (c) L.color(c); return L; }, end(){ for (let i=used;i<n;i++) pool[i].show(false); return this; } };
}

function bone(K, color, thick=0.2){
  const m = K.add(new THREE.Mesh(G.cyl, K.mat(color)));
  m.set = (a,b)=>{ const d = b.clone().sub(a), L = d.length(); m.visible = L > 1e-4; if (!m.visible) return m; m.scale.set(thick, L, thick); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.divideScalar(L)); return m; };
  return m;
}

/* Grid of cells on the ground: cell (x, z) with 0-based indices, centred on the origin. */
function cellPos(W, H, size, x, z, y=0){ return V((x - (W-1)/2)*size, y, (z - (H-1)/2)*size); }

/* tiny seeded RNG wrapper */
function rng(seed){ const r = Lab.mulberry32(seed); return {next:r, int:(a,b)=>a + Math.floor(r()*(b-a+1)), num:(a,b)=>a + r()*(b-a)}; }

/* simple min-heap for pathfinding */
class Heap { constructor(){ this.a = []; } get size(){ return this.a.length; }
  push(item, pr){ const a = this.a; a.push([pr,item]); let i = a.length-1; while (i>0){ const p = (i-1)>>1; if (a[p][0] <= a[i][0]) break; [a[p],a[i]] = [a[i],a[p]]; i = p; } }
  pop(){ const a = this.a, top = a[0], last = a.pop(); if (a.length){ a[0] = last; let i = 0; for(;;){ const l = 2*i+1, r = l+1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m],a[i]] = [a[i],a[m]]; i = m; } } return top[1]; } }

Lab.kit2 = {graph, inst, labels, bone, cellPos, rng, Heap};
})();
