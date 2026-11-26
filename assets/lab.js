/* Roblox Math Lab: 3D engine, drawing kit and topic registry.
   Topic files call Lab.subject(...) and add demos; app.js drives the UI. */
(function(){
"use strict";
const THREE = window.THREE;

/* ---------- helpers ---------- */
const V = (x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const UP = V(0,1,0);
const D2R = Math.PI/180;
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
const C = n => new THREE.Color(cssVar(n));
function f(n, d=2){ if (!isFinite(n)) return 'nan'; const p = Math.pow(10,d); let r = Math.round(n*p)/p; if (Object.is(r,-0)) r = 0; return String(r); }
const v3 = v => `Vector3.new(${f(v.x)}, ${f(v.y)}, ${f(v.z)})`;
const vs = v => `(${f(v.x)}, ${f(v.y)}, ${f(v.z)})`;
const lookOf = yaw => V(-Math.sin(yaw), 0, -Math.cos(yaw));
const tmpS = V();
const clamp = (x,a,b)=>Math.min(b, Math.max(a, x));
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* CFrame helpers with Roblox semantics, built on Matrix4 */
const CF = {
  new:(x,y,z)=>new THREE.Matrix4().makeTranslation(x,y,z),
  at:v=>new THREE.Matrix4().makeTranslation(v.x,v.y,v.z),
  angles:(rx,ry,rz)=>new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx,ry,rz,'XYZ')),
  yxz:(rx,ry,rz)=>new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx,ry,rz,'YXZ')),
  lookAt:(at,target,up=UP)=>{ const m = new THREE.Matrix4().lookAt(at, target, up); m.setPosition(at); return m; },
  mul:(...ms)=>ms.reduce((a,b)=>a.clone().multiply(b)),
  pos:m=>V().setFromMatrixPosition(m),
  look:m=>V(0,0,-1).transformDirection(m),
  right:m=>V(1,0,0).transformDirection(m),
  up:m=>V(0,1,0).transformDirection(m),
  inv:m=>m.clone().invert(),
  pt:(m,v)=>v.clone().applyMatrix4(m),
  lerp:(a,b,t)=>{ const pa=V(),qa=new THREE.Quaternion(),pb=V(),qb=new THREE.Quaternion(); a.decompose(pa,qa,tmpS); b.decompose(pb,qb,tmpS);
    return new THREE.Matrix4().compose(pa.lerp(pb,t), qa.slerp(qb,t), V(1,1,1)); }
};

function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

/* classic Perlin noise: 0 on whole-number inputs, like math.noise */
const PERM = (()=>{ const r = mulberry32(1337); const p=[...Array(256).keys()]; for(let i=255;i>0;i--){ const j=Math.floor(r()*(i+1)); [p[i],p[j]]=[p[j],p[i]]; } const P=new Uint8Array(512); for(let i=0;i<512;i++) P[i]=p[i&255]; return P; })();
const fade = t=>t*t*t*(t*(t*6-15)+10), lrp = (t,a,b)=>a+t*(b-a);
function grad(h,x,y,z){ const H=h&15, u=H<8?x:y, v=H<4?y:(H===12||H===14?x:z); return ((H&1)===0?u:-u)+((H&2)===0?v:-v); }
function noise(x,y,z){
  const X=Math.floor(x)&255, Y=Math.floor(y)&255, Z=Math.floor(z)&255;
  x-=Math.floor(x); y-=Math.floor(y); z-=Math.floor(z);
  const u=fade(x), v=fade(y), w=fade(z), P=PERM;
  const A=P[X]+Y, AA=P[A]+Z, AB=P[A+1]+Z, B=P[X+1]+Y, BA=P[B]+Z, BB=P[B+1]+Z;
  return lrp(w, lrp(v, lrp(u, grad(P[AA],x,y,z), grad(P[BA],x-1,y,z)), lrp(u, grad(P[AB],x,y-1,z), grad(P[BB],x-1,y-1,z))),
                lrp(v, lrp(u, grad(P[AA+1],x,y,z-1), grad(P[BA+1],x-1,y,z-1)), lrp(u, grad(P[AB+1],x,y-1,z-1), grad(P[BB+1],x-1,y-1,z-1))));
}

/* ---------- Luau highlighter ---------- */
const KW = new Set('local function end if then else elseif for in do return while repeat until and or not nil true false break continue'.split(' '));
const GL = new Set('Vector3 CFrame math Random workspace game RunService TweenService TweenInfo Instance task os print Enum RaycastParams bit32 Color3 table buffer'.split(' '));
function hl(src){
  const re = /(--[^\n]*)|("(?:[^"\\]|\\.)*")|(\b0[xb][0-9A-Fa-f_]+\b|\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g;
  let out='', last=0, m;
  while((m = re.exec(src))){
    out += esc(src.slice(last, m.index));
    if (m[1]) out += `<span class="t-com">${esc(m[1])}</span>`;
    else if (m[2]) out += `<span class="t-str">${esc(m[2])}</span>`;
    else if (m[3]) out += `<span class="t-num">${m[3]}</span>`;
    else if (KW.has(m[4])) out += `<span class="t-kw">${m[4]}</span>`;
    else if (GL.has(m[4])) out += `<span class="t-glob">${m[4]}</span>`;
    else out += m[4];
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}

/* ---------- shared geometry ---------- */
const G = {
  box: new THREE.BoxGeometry(1,1,1),
  cyl: new THREE.CylinderGeometry(1,1,1,14),
  cone: new THREE.ConeGeometry(1,1,18),
  sphere: new THREE.SphereGeometry(1,20,14),
};
G.edges = new THREE.EdgesGeometry(G.box);
G.disc = new THREE.CircleGeometry(1,72).rotateX(-Math.PI/2);
G.wsphere = new THREE.SphereGeometry(1,24,14);
const SHARED = new Set(Object.values(G));
function disposeTree(obj){
  obj.traverse(o=>{
    if (o.geometry && !SHARED.has(o.geometry)) o.geometry.dispose();
    if (o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose()); }
  });
}

/* ---------- registry ---------- */
const subjects = [], demos = [];
function subject(s){
  const S = {...s, demos:[]}; subjects.push(S);
  return d=>{ d.subject = S.id; S.demos.push(d); demos.push(d); };
}
const R = (id,label,min,max,step,value,unit='')=>({type:'range',id,label,min,max,step,value,unit});
const Sel = (id,label,options,value)=>({type:'select',id,label,options,value});
const T = (id,label,value)=>({type:'toggle',id,label,value});

/* ---------- engine ---------- */
const E = {renderer:null, scene:null, camera:null, root:null, labels:[], inst:null, demo:null, params:{}, out:{},
  simTime:0, playing:true, onFrame:null, viewport:null, labelLayer:null, onScreen:true, started:false};
const orbit = {theta:0.7, phi:1.05, r:18, target:V(0,1,0)};
let homeView = {theta:0.7, phi:1.05, r:18, target:V(0,1,0)};

function applyCam(){
  const o = orbit;
  E.camera.position.set(o.target.x + o.r*Math.sin(o.phi)*Math.sin(o.theta), o.target.y + o.r*Math.cos(o.phi), o.target.z + o.r*Math.sin(o.phi)*Math.cos(o.theta));
  E.camera.lookAt(o.target);
}
function setView(v={}){
  orbit.theta = v.theta ?? 0.7; orbit.phi = v.phi ?? 1.05; orbit.r = v.r ?? 18; orbit.target = V(v.tx ?? 0, v.ty ?? 1, v.tz ?? 0);
  homeView = {theta:orbit.theta, phi:orbit.phi, r:orbit.r, target:orbit.target.clone()};
  applyCam();
}
function resetView(){ Object.assign(orbit, {theta:homeView.theta, phi:homeView.phi, r:homeView.r, target:homeView.target.clone()}); applyCam(); }

function makeKit(){
  const kit = {};
  kit.add = o=>{ E.root.add(o); return o; };
  kit.drop = o=>{ if (!o) return; if (o.parent) o.parent.remove(o); disposeTree(o); };
  kit.mat = (color, {opacity=1, basic=false}={})=>{
    const m = basic ? new THREE.MeshBasicMaterial({color:C(color)}) : new THREE.MeshLambertMaterial({color:C(color)});
    if (opacity < 1){ m.transparent = true; m.opacity = opacity; m.depthWrite = false; }
    return m;
  };
  kit.arrow = (color, {thick=0.06, opacity=1, parent=E.root}={})=>{
    const m = kit.mat(color,{opacity}); const g = new THREE.Group();
    const shaft = new THREE.Mesh(G.cyl, m), head = new THREE.Mesh(G.cone, m); g.add(shaft, head); parent.add(g);
    const dir = V();
    g.set = (from, vec)=>{
      const len = vec.length(); if (len < 1e-4){ g.visible=false; return g; } g.visible = true;
      const hl = Math.min(0.5, len*0.4), hr = Math.max(thick*2.6, 0.11);
      shaft.scale.set(thick, Math.max(len-hl, 1e-4), thick); shaft.position.set(0,(len-hl)/2,0);
      head.scale.set(hr, hl, hr); head.position.set(0, len-hl/2, 0);
      g.position.copy(from); g.quaternion.setFromUnitVectors(UP, dir.copy(vec).divideScalar(len)); return g;
    };
    g.mat = m; return g;
  };
  kit.point = (color, r=0.15, {opacity=1}={})=>{ const m = new THREE.Mesh(G.sphere, kit.mat(color,{opacity})); m.scale.setScalar(r); E.root.add(m); return m; };
  kit.label = (text, color='--ink', cls='')=>{
    const el = document.createElement('div'); el.className = 'lbl ' + cls; el.style.setProperty('--c', `var(${color})`); el.textContent = text; E.labelLayer.appendChild(el);
    const L = {el, pos:V(), visible:true, attach:null, _t:text,
      text(s){ if (L._t !== s){ el.textContent = s; L._t = s; } return L; },
      at(v){ L.pos.copy(v); return L; },
      color(c){ el.style.setProperty('--c', `var(${c})`); return L; },
      show(b){ L.visible = b; return L; }};
    E.labels.push(L); return L;
  };
  kit.line = (color, {dashed=false, opacity=1, max=2, parent=E.root}={})=>{
    const pos = new Float32Array(max*3), dist = new Float32Array(max);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    if (dashed) geo.setAttribute('lineDistance', new THREE.BufferAttribute(dist,1));
    const mat = dashed ? new THREE.LineDashedMaterial({color:C(color), dashSize:0.28, gapSize:0.18}) : new THREE.LineBasicMaterial({color:C(color)});
    if (opacity<1){ mat.transparent=true; mat.opacity=opacity; }
    const ln = new THREE.Line(geo, mat); ln.frustumCulled = false; parent.add(ln);
    ln.set = (...pts)=>{ if (pts.length === 1 && Array.isArray(pts[0])) pts = pts[0]; pts = pts.slice(0, max); let d=0;
      pts.forEach((p,i)=>{ pos[i*3]=p.x; pos[i*3+1]=p.y; pos[i*3+2]=p.z; if (i>0) d += p.distanceTo(pts[i-1]); dist[i]=d; });
      geo.attributes.position.needsUpdate = true; if (dashed) geo.attributes.lineDistance.needsUpdate = true; geo.setDrawRange(0, pts.length); return ln; };
    return ln;
  };
  kit.ring = (radius, color, {y=0.02, opacity=1, dashed=false}={})=>{
    const n=96, pts=[]; for(let i=0;i<=n;i++){ const a=i/n*Math.PI*2; pts.push(V(Math.cos(a)*radius, y, Math.sin(a)*radius)); }
    const ln = kit.line(color, {dashed, opacity, max:n+1}); ln.set(pts); return ln;
  };
  kit.disc = (color, opacity=0.15)=>{ const m = new THREE.Mesh(G.disc, kit.mat(color,{opacity, basic:true})); E.root.add(m); return m; };
  kit.wsphere = (r, color, opacity=0.25)=>{ const m = new THREE.Mesh(G.wsphere, new THREE.MeshBasicMaterial({color:C(color), wireframe:true, transparent:true, opacity})); m.scale.setScalar(r); E.root.add(m); return m; };
  kit.sector = (color, opacity=0.18)=>{
    const m = new THREE.Mesh(new THREE.BufferGeometry(), kit.mat(color,{opacity, basic:true})); m.material.side = THREE.DoubleSide; E.root.add(m); let key='';
    /* yawCenter uses Roblox yaw (0 = facing -Z, + = left) */
    m.setSector = (center, yawCenter, half, radius, y=0.03)=>{
      const k = [yawCenter,half,radius].map(x=>x.toFixed(4)).join();
      if (k !== key){ key = k; m.geometry.dispose(); m.geometry = new THREE.CircleGeometry(radius, 64, yawCenter + Math.PI/2 - half, Math.max(half*2, 1e-4)).rotateX(-Math.PI/2); }
      m.position.set(center.x, y, center.z); return m;
    };
    return m;
  };
  kit.part = (size, color='--part', {front=true, opacity=1, parent=E.root, edges=true}={})=>{
    const base = kit.mat(color,{opacity}); const fr = front ? kit.mat('--z',{opacity}) : base;
    const mesh = new THREE.Mesh(G.box, [base,base,base,base,base,fr]); mesh.scale.copy(size);
    const g = new THREE.Group(); g.add(mesh); let e = null;
    if (edges){ e = new THREE.LineSegments(G.edges, new THREE.LineBasicMaterial({color:C('--ink'), transparent:true, opacity:0.3*opacity})); e.scale.copy(size); g.add(e); }
    parent.add(g); g.body = mesh;
    g.setCF = m=>{ m.decompose(g.position, g.quaternion, tmpS); return g; };
    g.tint = c=>{ base.color.copy(C(c)); return g; };
    g.resize = s=>{ mesh.scale.copy(s); if (e) e.scale.copy(s); return g; };
    return g;
  };
  kit.axes = (parent, len=2.4, {names=true, thick=0.04}={})=>{
    kit.arrow('--x',{parent, thick}).set(V(), V(len,0,0));
    kit.arrow('--y',{parent, thick}).set(V(), V(0,len,0));
    kit.arrow('--z',{parent, thick}).set(V(), V(0,0,-len));
    if (names){
      kit.label('RightVector','--x').attach = {obj:parent, local:V(len+0.35,0,0)};
      kit.label('UpVector','--y').attach = {obj:parent, local:V(0,len+0.35,0)};
      kit.label('LookVector','--z').attach = {obj:parent, local:V(0,0,-len-0.35)};
    }
  };
  return kit;
}

function buildEnv(kit, mode){
  if (mode === 'none') return;
  const grid = new THREE.GridHelper(40, 40, C('--grid'), C('--grid2')); grid.position.y = -0.005; E.root.add(grid);
  if (mode === 'grid') return;
  kit.line('--x',{opacity:0.8}).set(V(-20,0,0), V(20,0,0));
  kit.line('--z',{opacity:0.8}).set(V(0,0,-20), V(0,0,20));
  kit.line('--y',{opacity:0.8}).set(V(0,0,0), V(0,7,0));
  kit.label('+X','--x','axis').at(V(10.5,0,0));
  kit.label('−Z forward','--z','axis').at(V(0,0,-10.5));
  kit.label('+Z','--z','axis').at(V(0,0,10.5));
  kit.label('+Y','--y','axis').at(V(0,7.3,0));
}

function clearScene(){
  if (E.root){ disposeTree(E.root); E.scene.remove(E.root); }
  E.root = new THREE.Group(); E.scene.add(E.root);
  E.labels.forEach(L=>L.el.remove()); E.labels = [];
}
function build(){
  clearScene(); const kit = makeKit(); buildEnv(kit, E.demo.env); E.inst = E.demo.setup(kit);
  E.scene.background = C('--view');
  E.out = E.inst.update(E.params, E.simTime) || {};
}
function load(demo, params){ E.demo = demo; E.params = params; E.simTime = 0; setView(demo.view); build(); resize(); }
function unload(){ if (E.scene) clearScene(); E.demo = null; E.inst = null; }

function resize(){ if (!E.renderer) return; const w = E.viewport.clientWidth, h = E.viewport.clientHeight; if (!w || !h) return; E.renderer.setSize(w, h, false); E.camera.aspect = w/h; E.camera.updateProjectionMatrix(); }

const proj = V();
function placeLabels(){
  const w = E.viewport.clientWidth, h = E.viewport.clientHeight;
  for (const L of E.labels){
    if (L.attach) L.attach.obj.localToWorld(proj.copy(L.attach.local)); else proj.copy(L.pos);
    let vis = L.visible; if (L.attach){ let o = L.attach.obj; while (o){ if (!o.visible) vis = false; o = o.parent; } }
    proj.project(E.camera); vis = vis && proj.z < 1 && proj.z > -1;
    if (L.el.hidden === vis) L.el.hidden = !vis;
    if (vis) L.el.style.transform = `translate(${((proj.x*0.5+0.5)*w).toFixed(1)}px, ${((-proj.y*0.5+0.5)*h).toFixed(1)}px) translate(-50%, -50%)`;
  }
}
let lastFrame = 0;
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - (lastFrame||now))/1000); lastFrame = now;
  if (!E.inst || !E.onScreen || document.hidden) return;
  if (E.playing) E.simTime += dt;
  E.out = E.inst.update(E.params, E.simTime) || {};
  if (E.onFrame) E.onFrame(E.out, now);
  E.scene.updateMatrixWorld(); placeLabels(); E.renderer.render(E.scene, E.camera);
}

function init(viewport, canvas, labelLayer){
  if (E.started) return; E.started = true;
  E.viewport = viewport; E.labelLayer = labelLayer;
  E.renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  E.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  E.scene = new THREE.Scene();
  E.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  E.scene.add(new THREE.HemisphereLight(0xffffff, 0x8890a0, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 0.55); sun.position.set(6,12,8); E.scene.add(sun);
  clearScene();

  const pointers = new Map(); let pinch0 = 0, r0 = 0;
  canvas.addEventListener('pointerdown', e=>{ canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (pointers.size===2){ const [a,b]=[...pointers.values()]; pinch0=Math.hypot(a.x-b.x,a.y-b.y); r0=orbit.r; } });
  canvas.addEventListener('pointermove', e=>{
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId); const dx=e.clientX-prev.x, dy=e.clientY-prev.y; pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (pointers.size===1){ orbit.theta -= dx*0.008; orbit.phi = clamp(orbit.phi - dy*0.008, 0.12, 1.53); applyCam(); }
    else if (pointers.size===2){ const [a,b]=[...pointers.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); if (pinch0>0){ orbit.r = clamp(r0*pinch0/d, 5, 80); applyCam(); } }
  });
  const endPtr = e=>{ pointers.delete(e.pointerId); if (pointers.size<2) pinch0=0; };
  canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', e=>{ e.preventDefault(); orbit.r = clamp(orbit.r*Math.exp(e.deltaY*0.0012), 5, 80); applyCam(); }, {passive:false});

  new ResizeObserver(resize).observe(viewport);
  new IntersectionObserver(es=>{ E.onScreen = es[0].isIntersecting; }).observe(viewport);
  const rebuildTheme = ()=>{ if (E.demo) build(); };
  new MutationObserver(rebuildTheme).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme','class','style']});
  const mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', rebuildTheme);
  requestAnimationFrame(frame);
}

window.Lab = {
  THREE, V, UP, D2R, cssVar, C, f, v3, vs, lookOf, clamp, esc, CF, mulberry32, noise, hl, G, disposeTree,
  subjects, demos, subject, R, S:Sel, T,
  engine:{ init, load, unload, resize, resetView, get state(){ return E; },
    setPlaying(b){ E.playing = b; }, get playing(){ return E.playing; } }
};
})();
