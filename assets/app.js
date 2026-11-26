/* Roblox Math Lab: views, routing and lesson UI */
(function(){
"use strict";
const {subjects, demos, esc, f, hl, engine} = Lab;
const $ = id=>document.getElementById(id);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- subject glyphs ---------- */
const GLYPH = {
  vector:`<line x1="8" y1="34" x2="30" y2="12" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/><path d="M22 11 L31 11 L31 20" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="34" r="3" fill="var(--ink)"/>`,
  cross:`<line x1="8" y1="32" x2="32" y2="32" stroke="var(--z)" stroke-width="3" stroke-linecap="round"/><line x1="8" y1="32" x2="22" y2="22" stroke="var(--vb)" stroke-width="3" stroke-linecap="round"/><line x1="8" y1="32" x2="8" y2="6" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>`,
  frame:`<rect x="12" y="14" width="18" height="14" rx="2" fill="var(--part)"/><line x1="21" y1="21" x2="36" y2="21" stroke="var(--x)" stroke-width="2.5" stroke-linecap="round"/><line x1="21" y1="21" x2="21" y2="5" stroke="var(--y)" stroke-width="2.5" stroke-linecap="round"/><line x1="21" y1="21" x2="11" y2="33" stroke="var(--z)" stroke-width="2.5" stroke-linecap="round"/>`,
  wave:`<path d="M4 20 C 9 6, 14 6, 19 20 S 29 34, 36 20" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/><line x1="4" y1="20" x2="36" y2="20" stroke="var(--muted)" stroke-width="1" stroke-dasharray="2 2"/>`,
  curve:`<path d="M6 32 Q 20 2, 34 32" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/><path d="M6 32 L20 6 L34 32" fill="none" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="2 2"/><circle cx="20" cy="6" r="2.6" fill="var(--muted)"/><circle cx="6" cy="32" r="3" fill="var(--va)"/><circle cx="34" cy="32" r="3" fill="var(--vb)"/>`,
  dice:`<rect x="5" y="22" width="6" height="12" rx="1" fill="var(--part)"/><rect x="13" y="12" width="6" height="22" rx="1" fill="var(--accent)"/><rect x="21" y="6" width="6" height="28" rx="1" fill="var(--accent)"/><rect x="29" y="18" width="6" height="16" rx="1" fill="var(--part)"/>`,
  ray:`<rect x="26" y="8" width="9" height="24" rx="1.5" fill="var(--part)"/><line x1="4" y1="28" x2="26" y2="18" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/><line x1="26" y1="18" x2="18" y2="6" stroke="var(--accent)" stroke-width="2" stroke-dasharray="3 2" stroke-linecap="round"/><circle cx="26" cy="18" r="2.6" fill="var(--ink)"/>`,
  geo:`<path d="M6 30 L12 8 L24 14 L34 6 L30 32 L18 24 Z" fill="var(--va)" fill-opacity=".25" stroke="var(--va)" stroke-width="2" stroke-linejoin="round"/><circle cx="20" cy="20" r="3.2" fill="var(--accent)"/><line x1="20" y1="20" x2="38" y2="20" stroke="var(--muted)" stroke-width="1.3" stroke-dasharray="2 2"/>`,
  arm:`<line x1="6" y1="10" x2="18" y2="26" stroke="var(--va)" stroke-width="4" stroke-linecap="round"/><line x1="18" y1="26" x2="32" y2="14" stroke="var(--vb)" stroke-width="3.5" stroke-linecap="round"/><circle cx="6" cy="10" r="3" fill="var(--ink)"/><circle cx="18" cy="26" r="2.8" fill="var(--ink)"/><circle cx="34" cy="12" r="3.2" fill="none" stroke="var(--accent)" stroke-width="2"/>`,
  phys:`<path d="M4 34 L36 34" stroke="var(--part)" stroke-width="2.5" stroke-linecap="round"/><path d="M6 8 Q 12 34 16 34 Q 22 16 26 34 Q 30 26 33 34" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="2.5 2"/><circle cx="6" cy="8" r="3.6" fill="var(--accent)"/>`,
  tri:`<path d="M6 34 L34 34 L34 8 Z" fill="var(--va)" fill-opacity=".2" stroke="var(--va)" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 34 A 8 8 0 0 0 13 29" fill="none" stroke="var(--accent)" stroke-width="2"/><rect x="29" y="29" width="5" height="5" fill="none" stroke="var(--ink)" stroke-width="1.4"/>`,
  clock:`<circle cx="20" cy="20" r="14" fill="none" stroke="var(--va)" stroke-width="2.4"/><line x1="20" y1="20" x2="20" y2="10" stroke="var(--ink)" stroke-width="2.4" stroke-linecap="round"/><line x1="20" y1="20" x2="28" y2="24" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/>`,
  palette:`<circle cx="13" cy="15" r="7" fill="var(--x)"/><circle cx="27" cy="15" r="7" fill="var(--y)" fill-opacity=".85"/><circle cx="20" cy="27" r="7" fill="var(--z)" fill-opacity=".8"/>`,
  grid:`<rect x="5" y="5" width="30" height="30" fill="none" stroke="var(--muted)" stroke-width="1.6"/><path d="M15 5 V35 M25 5 V35 M5 15 H35 M5 25 H35" stroke="var(--muted)" stroke-width="1.2"/><rect x="15" y="15" width="10" height="10" fill="var(--accent)"/>`,
  screen:`<rect x="4" y="7" width="32" height="22" rx="2.5" fill="none" stroke="var(--ink)" stroke-width="2.2"/><rect x="8" y="11" width="13" height="6" fill="var(--accent)"/><rect x="8" y="20" width="22" height="4" fill="var(--va)"/><line x1="14" y1="34" x2="26" y2="34" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round"/>`,
  digits:`<text x="20" y="27" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="15" font-weight="700" fill="var(--accent)">1.2K</text>`,
  mountain:`<path d="M3 34 L14 14 L20 22 L27 10 L37 34 Z" fill="var(--y)" fill-opacity=".35" stroke="var(--y)" stroke-width="2" stroke-linejoin="round"/><path d="M24 15 L27 10 L30 15" fill="none" stroke="var(--ink)" stroke-width="1.8"/>`,
  path:`<circle cx="8" cy="32" r="3.5" fill="var(--va)"/><circle cx="32" cy="8" r="3.5" fill="var(--accent)"/><path d="M8 32 L8 20 L20 20 L20 8 L32 8" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-dasharray="3 2"/><rect x="22" y="18" width="10" height="14" fill="var(--part)"/>`,
  matrix:`<path d="M9 6 H5 V34 H9 M31 6 H35 V34 H31" fill="none" stroke="var(--ink)" stroke-width="2.2"/><circle cx="14" cy="13" r="2.4" fill="var(--x)"/><circle cx="20" cy="20" r="2.4" fill="var(--y)"/><circle cx="26" cy="27" r="2.4" fill="var(--z)"/><circle cx="26" cy="13" r="1.6" fill="var(--muted)"/><circle cx="14" cy="27" r="1.6" fill="var(--muted)"/>`,
  calc:`<path d="M4 32 C 12 32, 16 8, 26 8 S 34 20, 36 20" fill="none" stroke="var(--accent)" stroke-width="2.4"/><line x1="12" y1="30" x2="32" y2="2" stroke="var(--va)" stroke-width="1.6" stroke-dasharray="3 2"/>`,
  quad:`<rect x="4" y="4" width="32" height="32" fill="none" stroke="var(--ink)" stroke-width="1.8"/><path d="M20 4 V36 M4 20 H36 M28 4 V20 M20 12 H36" stroke="var(--muted)" stroke-width="1.4"/><circle cx="31" cy="8" r="1.8" fill="var(--accent)"/><circle cx="24" cy="15" r="1.8" fill="var(--accent)"/><circle cx="10" cy="28" r="1.8" fill="var(--accent)"/>`,
  wave2:`<path d="M3 20 l3 -8 l3 14 l3 -10 l3 9 l3 -6" fill="none" stroke="var(--muted)" stroke-width="1.6"/><path d="M3 22 C 10 14, 16 26, 22 18 S 32 16, 37 18" fill="none" stroke="var(--accent)" stroke-width="2.4"/>`,
  camera:`<rect x="4" y="13" width="17" height="13" rx="2" fill="var(--part)"/><circle cx="21" cy="19.5" r="3" fill="var(--accent)"/><path d="M23 19.5 L37 9 M23 19.5 L37 30" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/><line x1="37" y1="9" x2="37" y2="30" stroke="var(--accent)" stroke-width="2" stroke-dasharray="2 2"/>`,
  seq:`<rect x="4" y="28" width="6" height="6" rx="1" fill="var(--va)"/><rect x="12" y="22" width="6" height="12" rx="1" fill="var(--va)"/><rect x="20" y="16" width="6" height="18" rx="1" fill="var(--va)"/><rect x="28" y="10" width="6" height="24" rx="1" fill="var(--accent)"/><path d="M5 24 L33 5" stroke="var(--muted)" stroke-width="1.3" stroke-dasharray="2 2"/>`,
  sound:`<path d="M5 15 H11 L19 8 V32 L11 25 H5 Z" fill="var(--part)" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round"/><path d="M24 14 Q28 20 24 26" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/><path d="M29 9 Q36 20 29 31" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>`,
  boids:`<path d="M6 14 L16 10 L12 20 Z" fill="var(--va)"/><path d="M20 24 L30 20 L26 30 Z" fill="var(--accent)"/><path d="M22 8 L32 4 L28 14 Z" fill="var(--va)"/><path d="M4 34 Q 16 30 22 22" fill="none" stroke="var(--muted)" stroke-width="1.3" stroke-dasharray="2 2"/>`,
  bits:`<rect x="3" y="12" width="7" height="16" rx="1.2" fill="var(--accent)"/><rect x="12" y="22" width="7" height="6" rx="1.2" fill="var(--part)"/><rect x="21" y="12" width="7" height="16" rx="1.2" fill="var(--accent)"/><rect x="30" y="12" width="7" height="16" rx="1.2" fill="var(--accent)"/>`,
};
const glyph = (g, s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40" aria-hidden="true">${GLYPH[g]||''}</svg>`;
const chev = `<svg class="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const demoById = id=>demos.find(d=>d.id===id);
const subjById = id=>subjects.find(s=>s.id===id);

/* ---------- categories: a few drop-downs instead of one long list ---------- */
const CATEGORIES = [
  {id:'space', title:'Vectors & space', blurb:'Positions, directions, CFrames, rays and cameras.', subjects:['vector3', 'vecmath', 'cframe', 'raycast', 'camera']},
  {id:'core', title:'Core maths', blurb:'The math library, angles, chance, sequences and number tricks.', subjects:['math', 'trig', 'probability', 'num', 'bitwise', 'seq']},
  {id:'motion', title:'Motion, colour & UI', blurb:'Movement over time, curves, colours, grids, screen space and sound.', subjects:['anim', 'bezier', 'color', 'grid', 'ui', 'audio']},
  {id:'adv', title:'Advanced subjects', blurb:'Deeper techniques for bigger systems: physics, pathfinding, procedural worlds, networking and more.', subjects:subjects.filter(s=>s.level).map(s=>s.id)},
];
{ // anything not placed above still shows up
  const placed = new Set(CATEGORIES.flatMap(c=>c.subjects));
  const extra = subjects.filter(s=>!placed.has(s.id)).map(s=>s.id);
  if (extra.length) CATEGORIES[2].subjects.push(...extra);
  CATEGORIES.forEach(c=>{ c.list = c.subjects.map(id=>subjects.find(s=>s.id === id)).filter(Boolean); });
}
const catOf = subjectId=>CATEGORIES.find(c=>c.subjects.includes(subjectId));

/* ---------- home ---------- */
const card = s=>`<a class="subj-card" href="#${s.id}">${glyph(s.glyph)}<h3>${esc(s.title)}</h3><p>${esc(s.blurb)}</p><span class="count">${s.demos.length} topics${s.level ? ` <span class="tag-adv">${esc(s.level)}</span>` : ''}</span></a>`;
let homeOpen = ['space'];
try { homeOpen = JSON.parse(localStorage.getItem('rml-home-open') || '["space"]'); } catch(e){}
$('subjects').innerHTML = CATEGORIES.map(c=>`<details class="hcat" data-c="${c.id}"${homeOpen.includes(c.id) ? ' open' : ''}><summary>
  <span class="hcat-icons">${c.list.slice(0, 4).map(s=>glyph(s.glyph, 26)).join('')}</span>
  <span class="hcat-text"><h2>${esc(c.title)}</h2><p>${esc(c.blurb)}</p></span>
  <span class="hcat-n">${c.list.length} subjects · ${c.list.reduce((n, s)=>n + s.demos.length, 0)} topics</span>${chev}</summary>
  <div class="subjects">${c.list.map(card).join('')}</div></details>`).join('');
$('subjects').addEventListener('toggle', ()=>{
  const open = [...document.querySelectorAll('#subjects .hcat[open]')].map(d=>d.dataset.c);
  try { localStorage.setItem('rml-home-open', JSON.stringify(open)); } catch(e){}
}, true);

let finderFilter = 'all', finderQuery = '';
const FINDER = Lab.FINDER.filter(([, , id])=>demoById(id));
function renderFinder(){
  const chips = [['all','All']].concat(CATEGORIES.map(c=>[c.id, c.title]));
  $('finderFilter').innerHTML = chips.map(([id,t])=>`<button type="button" class="chip" data-f="${id}" aria-pressed="${finderFilter===id}">${esc(t)}</button>`).join('');
  const words = finderQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = FINDER.filter(([t,c,id])=>{
    const d = demoById(id), s = subjById(d.subject);
    if (finderFilter !== 'all' && catOf(d.subject).id !== finderFilter) return false;
    const hay = `${t} ${c} ${d.title} ${d.short} ${s.title}`.toLowerCase();
    return words.every(w=>hay.includes(w));
  });
  $('finder').innerHTML = rows.map(([t,c,id])=>`<a href="#${id}"><b>${esc(t)}</b><code>${esc(c)}</code><small>${esc(subjById(demoById(id).subject).title)} › ${esc(demoById(id).title)}</small></a>`).join('');
  $('finderEmpty').hidden = rows.length > 0;
}
$('finderFilter').addEventListener('click', e=>{ const b = e.target.closest('button'); if (!b) return; finderFilter = b.dataset.f; renderFinder(); });
$('finderSearch').addEventListener('input', e=>{ finderQuery = e.target.value; renderFinder(); });
renderFinder();

/* ---------- sidebar ---------- */
const subjectGroup = s=>`<details class="sgroup" data-s="${s.id}"><summary>${glyph(s.glyph,22)}<span>${esc(s.title)}</span><span class="n">${s.demos.length}</span>${chev}</summary><div class="tlist">${s.demos.map(d=>`<a href="#${d.id}" data-d="${d.id}">${esc(d.title)}${d.adv ? '<span class="tag-adv">Adv</span>' : ''}<small>${esc(d.short)}</small></a>`).join('')}</div></details>`;
$('srailFull').innerHTML = CATEGORIES.map(c=>`<details class="scat" data-c="${c.id}"><summary><span>${esc(c.title)}</span>${chev}</summary><div class="scat-list">${c.list.map(subjectGroup).join('')}</div></details>`).join('');
$('srailMini').innerHTML = CATEGORIES.map(c=>c.list.map(s=>`<a href="#${s.id}" data-s="${s.id}" title="${esc(s.title)}" aria-label="${esc(s.title)}">${glyph(s.glyph,24)}</a>`).join('')).join('<hr>');
const narrow = window.matchMedia('(max-width: 900px)');
const store = {get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }};
function setCollapsed(c){
  document.body.classList.toggle('rail-collapsed', c); store.set('rml-rail-collapsed', c ? '1' : '0');
  const b = $('railToggle'); b.setAttribute('aria-label', c ? 'Expand sidebar' : 'Collapse sidebar'); b.title = b.getAttribute('aria-label');
  b.querySelector('.collapse-ico').style.rotate = c ? '180deg' : '';
}
setCollapsed(store.get('rml-rail-collapsed') === '1');
const closeDrawer = ()=>document.body.classList.remove('rail-open');
/* sidebar width: drag the handle on its right edge (200 to 440 px), double-click to reset */
const RAIL_MIN = 200, RAIL_MAX = 440, RAIL_DEFAULT = 260;
const setRailWidth = w=>{ w = Math.round(Math.min(RAIL_MAX, Math.max(RAIL_MIN, w))); document.body.style.setProperty('--rail-w', w + 'px'); return w; };
setRailWidth(parseFloat(store.get('rml-rail-w')) || RAIL_DEFAULT);
$('railResize').addEventListener('pointerdown', e=>{
  e.preventDefault();
  const handle = e.currentTarget, left = $('srail').getBoundingClientRect().left;
  handle.setPointerCapture(e.pointerId); document.body.classList.add('rail-resizing');
  const move = ev=>setRailWidth(ev.clientX - left);
  const up = ev=>{ store.set('rml-rail-w', String(setRailWidth(ev.clientX - left))); document.body.classList.remove('rail-resizing');
    handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); window.dispatchEvent(new Event('resize')); };
  handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
});
$('railResize').addEventListener('dblclick', ()=>{ store.set('rml-rail-w', String(setRailWidth(RAIL_DEFAULT))); window.dispatchEvent(new Event('resize')); });
$('railToggle').addEventListener('click', ()=>{ if (narrow.matches) closeDrawer(); else setCollapsed(!document.body.classList.contains('rail-collapsed')); });
$('drawerBtn').addEventListener('click', ()=>document.body.classList.add('rail-open'));
$('railBackdrop').addEventListener('click', closeDrawer);
document.addEventListener('keydown', e=>{ if (e.key === 'Escape') closeDrawer(); });
function updateRail(d, changedSubject){
  const cat = catOf(d.subject);
  document.querySelectorAll('#srailFull .scat').forEach(g=>{ const mine = !!cat && g.dataset.c === cat.id; g.classList.toggle('current', mine); if (mine) g.open = true; else if (changedSubject) g.open = false; });
  document.querySelectorAll('#srailFull .sgroup').forEach(g=>{ const mine = g.dataset.s === d.subject; g.classList.toggle('current', mine); if (changedSubject) g.open = mine; else if (mine) g.open = true; });
  document.querySelectorAll('#srailFull .tlist a').forEach(a=>a.setAttribute('aria-current', a.dataset.d === d.id ? 'true' : 'false'));
  document.querySelectorAll('#srailMini a').forEach(a=>a.setAttribute('aria-current', a.dataset.s === d.subject ? 'true' : 'false'));
  const rail = $('srail'), a = rail.querySelector('.tlist a[aria-current="true"]');
  if (a){ const top = a.offsetTop, bottom = top + a.offsetHeight; if (top < rail.scrollTop + 40 || bottom > rail.scrollTop + rail.clientHeight - 20) rail.scrollTop = top - rail.clientHeight/3; }
}

/* ---------- cheat sheet ---------- */
const refKeys = Object.keys(Lab.REF);
let refTab = 'math';
function renderRef(){
  $('refTabs').innerHTML = refKeys.map(k=>`<button type="button" role="tab" data-tab="${k}" aria-selected="${k===refTab}">${esc(Lab.REF[k].title)}</button>`).join('');
  $('refTable').innerHTML = `<thead><tr><th>Member</th><th>What it gives you</th><th>Example</th><th>Typical use</th></tr></thead><tbody>${Lab.REF[refTab].rows.map(([a,b,c,d])=>`<tr><td>${a}</td><td>${esc(b)}</td><td>${esc(c)}</td><td>${esc(d)}</td></tr>`).join('')}</tbody>`;
}
$('refTabs').addEventListener('click', e=>{ const b = e.target.closest('button'); if (!b) return; refTab = b.dataset.tab; renderRef(); });
renderRef();

/* ---------- subject view ---------- */
const controlsEl = $('controls'), lessonEl = $('lesson'), readoutEl = $('readout'), liveEl = $('live'), playBtn = $('playBtn');
let cur = null, params = {}, codeDirty = true, lastUi = 0, lastReadout = '', lastLive = '', lessonTab = 'idea';
engine.setPlaying(!reduceMotion);
playBtn.addEventListener('click', ()=>{ engine.setPlaying(!engine.playing); playBtn.textContent = engine.playing ? 'Pause' : 'Play'; });
$('resetBtn').addEventListener('click', ()=>engine.resetView());

/* resizable panels: the slider panel (drag its top edge) and the lesson panel (drag its left edge).
   Sizes are set on <body> (not <html>) so dragging doesn't make the 3D scene rebuild its colours. */
const PANELS = {
  sliders: {key:'rml-sliders-h', prop:'--sliders-h', min:56, max:()=>$('viewport').clientHeight * 0.85, extra:['--sliders-max', '85%']},
  lesson: {key:'rml-lesson-w', prop:'--lesson-w', min:300, max:()=>document.querySelector('.workspace').clientWidth * 0.6},
};
function setPanel(name, v){
  const p = PANELS[name], st = document.body.style;
  if (v == null){ st.removeProperty(p.prop); if (p.extra) st.removeProperty(p.extra[0]); return null; }
  v = Math.round(Math.min(p.max(), Math.max(p.min, v)));
  st.setProperty(p.prop, v + 'px'); if (p.extra) st.setProperty(p.extra[0], p.extra[1]);
  return v;
}
function dragResize(handle, name, valueFrom){
  handle.addEventListener('pointerdown', e=>{
    e.preventDefault(); e.stopPropagation();
    handle.setPointerCapture(e.pointerId); document.body.classList.add('panel-resizing', 'resizing-' + name);
    const move = ev=>setPanel(name, valueFrom(ev));
    const up = ev=>{ store.set(PANELS[name].key, String(setPanel(name, valueFrom(ev))));
      document.body.classList.remove('panel-resizing', 'resizing-' + name);
      handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); window.dispatchEvent(new Event('resize')); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
  });
  handle.addEventListener('dblclick', ()=>{ setPanel(name, null); store.set(PANELS[name].key, ''); window.dispatchEvent(new Event('resize')); });
}
for (const [name, p] of Object.entries(PANELS)){
  const saved = parseFloat(store.get(p.key));
  if (saved > 0){ document.body.style.setProperty(p.prop, Math.max(p.min, saved) + 'px'); if (p.extra) document.body.style.setProperty(p.extra[0], p.extra[1]); }
}
dragResize($('lessonResize'), 'lesson', ev=>document.querySelector('.workspace').getBoundingClientRect().right - ev.clientX);

function buildControls(d){
  controlsEl.innerHTML = '';
  d.params.forEach(p=>{
    const wrap = document.createElement('div'); wrap.className = 'ctl' + (p.type==='toggle'?' toggle':'');
    const id = `p-${d.id}-${p.id}`;
    if (p.type==='range'){
      wrap.innerHTML = `<label for="${id}-n"><span>${esc(p.label)}</span><span class="numwrap"><input type="text" inputmode="decimal" class="num" id="${id}-n" autocomplete="off" spellcheck="false" aria-label="${esc(p.label)} value">${p.unit ? `<span class="unit">${esc(p.unit.trim())}</span>` : ''}</span></label><input type="range" id="${id}" min="${p.min}" max="${p.max}" step="${p.step}" value="${params[p.id]}" aria-label="${esc(p.label)}">`;
      const inp = wrap.querySelector('input[type=range]'), num = wrap.querySelector('.num');
      const whole = p.step >= 1 && Number.isInteger(p.step);
      const show = ()=>{ num.value = f(params[p.id]); num.classList.remove('bad'); num.title = ''; };
      const parse = ()=>{ const v = parseFloat(num.value.replace(',', '.')); return isFinite(v) ? v : null; };
      const apply = (v, final)=>{
        let x = Math.min(p.max, Math.max(p.min, v)); if (whole) x = Math.round(x);
        params[p.id] = x; inp.value = x; codeDirty = true;
        const out = v < p.min || v > p.max;
        num.classList.toggle('bad', out && !final); num.title = out ? `Range is ${f(p.min)} to ${f(p.max)}` : '';
        if (final) show();
      };
      inp.addEventListener('input', ()=>{ params[p.id] = parseFloat(inp.value); show(); codeDirty = true; });
      num.addEventListener('input', ()=>{ const v = parse(); if (v !== null) apply(v, false); });
      num.addEventListener('change', ()=>{ const v = parse(); if (v !== null) apply(v, true); else show(); });
      num.addEventListener('keydown', e=>{
        if (e.key === 'Enter'){ num.blur(); }
        else if (e.key === 'Escape'){ show(); num.blur(); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown'){ e.preventDefault(); const v = (parse() ?? params[p.id]) + (e.key === 'ArrowUp' ? 1 : -1) * p.step * (e.shiftKey ? 10 : 1); apply(Math.round(v / p.step) * p.step, true); }
      });
      num.addEventListener('focus', ()=>num.select());
      show();
    } else if (p.type==='select'){
      wrap.innerHTML = `<label for="${id}"><span>${esc(p.label)}</span></label><select id="${id}">${p.options.map(([v,t])=>`<option value="${v}"${v===params[p.id]?' selected':''}>${esc(t)}</option>`).join('')}</select>`;
      const s = wrap.querySelector('select'); s.addEventListener('change', ()=>{ params[p.id] = s.value; codeDirty = true; });
    } else {
      wrap.innerHTML = `<label for="${id}"><input type="checkbox" id="${id}"${params[p.id]?' checked':''}><span>${esc(p.label)}</span></label>`;
      const c = wrap.querySelector('input'); c.addEventListener('change', ()=>{ params[p.id] = c.checked; codeDirty = true; });
    }
    controlsEl.appendChild(wrap);
  });
  const grip = document.createElement('div');
  grip.className = 'panel-resize sliders-resize'; grip.title = 'Drag to resize, double-click to reset';
  dragResize(grip, 'sliders', ev=>controlsEl.getBoundingClientRect().bottom - ev.clientY);
  controlsEl.appendChild(grip);
}

const TABS = [['idea','Idea'],['code','Luau code'],['uses','In games'],['gotchas','Watch out']];
function renderLesson(d){
  const s = subjById(d.subject), idx = s.demos.indexOf(d), prev = s.demos[idx-1], next = s.demos[idx+1];
  const ts = Lab.tsScript ? Lab.tsScript(d.id, d.title) : null, tabs = ts ? [TABS[0], TABS[1], ['studio','Try in Studio'], ...TABS.slice(2)] : TABS;
  if (!ts && lessonTab === 'studio') lessonTab = 'idea';
  lessonEl.innerHTML = `
    <p class="eyebrow">${esc(s.title)} · ${idx+1} of ${s.demos.length}${d.adv || s.level ? ' · Advanced' : ''}</p>
    <h2>${esc(d.title)}</h2>
    <code class="sig">${esc(d.sig)}</code>
    <div class="ltabs" role="tablist">${tabs.map(([k,t])=>`<button type="button" role="tab" data-t="${k}" aria-selected="${k===lessonTab}">${t}</button>`).join('')}</div>
    <div class="lpanel" data-p="idea"${lessonTab==='idea'?'':' hidden'}>${d.body}</div>
    <div class="lpanel" data-p="code"${lessonTab==='code'?'':' hidden'}><div class="codebox"><div class="codebar"><span class="live-dot">Updates with the sliders</span><button type="button" id="copyBtn">Copy</button></div><pre class="code"><code id="codeOut"></code></pre></div></div>
    <div class="lpanel" data-p="uses"${lessonTab==='uses'?'':' hidden'}><ul class="items">${d.uses.map(u=>`<li>${u}</li>`).join('')}</ul></div>
    <div class="lpanel" data-p="gotchas"${lessonTab==='gotchas'?'':' hidden'}><ul class="items warn">${d.gotchas.map(u=>`<li>${u}</li>`).join('')}</ul></div>
    ${ts ? `<div class="lpanel ts-panel" data-p="studio"${lessonTab==='studio'?'':' hidden'}>
      <p>${esc(ts.what)}</p>
      <ol class="studio-steps"><li>Open any place in Roblox Studio (a new Baseplate is fine).</li><li>Insert a <b>${ts.kind}</b> into <b>${esc(ts.where)}</b> and paste the code.</li><li>Press Play. Everything it needs is built in a folder called <code>MathLabDemo</code>, 30 studs in front of spawn.</li></ol>
      <div class="codebox"><div class="codebar"><span>Complete ${ts.kind}</span><button type="button" id="tsCopy">Copy</button></div><pre class="code studio-code"><code id="tsCode">${hl(ts.code)}</code></pre></div>
    </div>` : ''}
    <nav class="pager" aria-label="Topic pages">
      ${prev?`<a href="#${prev.id}"><small>Previous</small>${esc(prev.title)}</a>`:''}
      ${next?`<a class="next" href="#${next.id}"><small>Next</small>${esc(next.title)}</a>`:`<a class="next" href="#home"><small>Done with ${esc(s.title)}</small>All subjects</a>`}
    </nav>`;
  lessonEl.querySelector('.ltabs').addEventListener('click', e=>{ const b = e.target.closest('button'); if (!b) return; lessonTab = b.dataset.t;
    lessonEl.querySelectorAll('.ltabs button').forEach(x=>x.setAttribute('aria-selected', x===b ? 'true' : 'false'));
    lessonEl.querySelectorAll('.lpanel').forEach(pn=>pn.hidden = pn.dataset.p !== lessonTab); });
  const tc = $('tsCopy');
  if (tc) tc.addEventListener('click', ()=>{
    const txt = $('tsCode').textContent, done = ok=>{ tc.textContent = ok ? 'Copied' : 'Select and copy'; setTimeout(()=>tc.textContent='Copy', 1600); };
    const sel = ()=>{ const r = document.createRange(); r.selectNodeContents($('tsCode')); const g = getSelection(); g.removeAllRanges(); g.addRange(r); };
    try { navigator.clipboard.writeText(txt).then(()=>done(true), ()=>{ sel(); done(false); }); } catch(e){ sel(); done(false); }
  });
  const cb = $('copyBtn');
  cb.addEventListener('click', ()=>{
    const txt = $('codeOut').textContent;
    const done = ok=>{ cb.textContent = ok ? 'Copied' : 'Select and copy'; setTimeout(()=>cb.textContent='Copy', 1600); };
    const sel = ()=>{ const r = document.createRange(); r.selectNodeContents($('codeOut')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    try { navigator.clipboard.writeText(txt).then(()=>done(true), ()=>{ sel(); done(false); }); } catch(e){ sel(); done(false); }
  });
}
function renderReadout(out){
  const rows = cur.readout ? cur.readout(params, out) : [];
  const html = rows.map(([k,v,c])=>`<span class="k">${esc(k)}</span><span class="v ${c||''}">${esc(v)}</span>`).join('');
  if (html !== lastReadout){ readoutEl.innerHTML = html; lastReadout = html; } readoutEl.hidden = !rows.length;
  const live = cur.live ? cur.live(params, out) : '';
  if (live !== lastLive){ liveEl.innerHTML = live; lastLive = live; }
  liveEl.hidden = !live;
}
function renderCode(out){ const el = $('codeOut'); if (el) el.innerHTML = hl(cur.code(params, out)); }
engine.state.onFrame = (out, now)=>{
  if (!cur) return;
  if (codeDirty){ renderCode(out); renderReadout(out); codeDirty = false; lastUi = now; }
  else if (now - lastUi > 90){ renderReadout(out); lastUi = now; }
};

function showSubject(d){
  const s = subjById(d.subject), changedSubject = !cur || cur.subject !== d.subject;
  cur = d; params = {}; d.params.forEach(p=>params[p.id]=p.value); lastReadout = ''; lastLive = ''; codeDirty = true;
  liveEl.innerHTML = ''; liveEl.hidden = true;
  $('subjGlyph').innerHTML = glyph(s.glyph, 34); $('subjTitle').textContent = s.title; $('subjBlurb').textContent = s.blurb; $('crumbSubj').textContent = s.title;
  updateRail(d, changedSubject); closeDrawer();
  playBtn.hidden = !d.time; playBtn.textContent = engine.playing ? 'Pause' : 'Play';
  buildControls(d); renderLesson(d);
  engine.init($('viewport'), $('cv'), $('labels'));
  engine.load(d, params);
  renderReadout(engine.state.out); renderCode(engine.state.out); codeDirty = false;
  document.title = `${d.title} · Roblox Math Lab`;
  return changedSubject;
}

/* ---------- router ---------- */
const views = {home:$('view-home'), subject:$('view-subject'), ref:$('view-ref')};
function setView(name){
  Object.entries(views).forEach(([k,el])=>el.hidden = k !== name);
  document.querySelectorAll('.topnav a').forEach(a=>a.setAttribute('aria-current', a.dataset.view === name ? 'page' : 'false'));
  if (name !== 'subject'){ engine.unload(); cur = null; }
}
function route(){
  const id = decodeURIComponent(location.hash.slice(1));
  if (id === 'reference'){ setView('ref'); document.title = 'Cheat sheet · Roblox Math Lab'; window.scrollTo(0,0); return; }
  if (id === 'finder'){ setView('home'); document.title = 'Roblox Math Lab'; $('finder-sec').scrollIntoView(); return; }
  const s = subjById(id), d = s ? s.demos[0] : demoById(id);
  if (d){ setView('subject'); const fresh = showSubject(d); if (fresh) window.scrollTo(0,0); return; }
  setView('home'); document.title = 'Roblox Math Lab'; window.scrollTo(0,0);
}
window.addEventListener('hashchange', route);
route();
})();
