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
  bits:`<rect x="3" y="12" width="7" height="16" rx="1.2" fill="var(--accent)"/><rect x="12" y="22" width="7" height="6" rx="1.2" fill="var(--part)"/><rect x="21" y="12" width="7" height="16" rx="1.2" fill="var(--accent)"/><rect x="30" y="12" width="7" height="16" rx="1.2" fill="var(--accent)"/>`,
};
const glyph = (g, s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40" aria-hidden="true">${GLYPH[g]||''}</svg>`;
const demoById = id=>demos.find(d=>d.id===id);
const subjById = id=>subjects.find(s=>s.id===id);

/* ---------- home ---------- */
$('subjects').innerHTML = subjects.map(s=>`<a class="subj-card" href="#${s.id}">${glyph(s.glyph)}<h3>${esc(s.title)}</h3><p>${esc(s.blurb)}</p><span class="count">${s.demos.length} topics</span></a>`).join('');

let finderFilter = 'all', finderQuery = '';
const FINDER = Lab.FINDER.filter(([, , id])=>demoById(id));
function renderFinder(){
  const chips = [['all','All']].concat(subjects.map(s=>[s.id, s.title]));
  $('finderFilter').innerHTML = chips.map(([id,t])=>`<button type="button" class="chip" data-f="${id}" aria-pressed="${finderFilter===id}">${esc(t)}</button>`).join('');
  const words = finderQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = FINDER.filter(([t,c,id])=>{
    const d = demoById(id), s = subjById(d.subject);
    if (finderFilter !== 'all' && d.subject !== finderFilter) return false;
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
const chev = `<svg class="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
$('srailFull').innerHTML = subjects.map(s=>`<details class="sgroup" data-s="${s.id}"><summary>${glyph(s.glyph,22)}<span>${esc(s.title)}</span><span class="n">${s.demos.length}</span>${chev}</summary><div class="tlist">${s.demos.map(d=>`<a href="#${d.id}" data-d="${d.id}">${esc(d.title)}<small>${esc(d.short)}</small></a>`).join('')}</div></details>`).join('');
$('srailMini').innerHTML = subjects.map(s=>`<a href="#${s.id}" data-s="${s.id}" title="${esc(s.title)}" aria-label="${esc(s.title)}">${glyph(s.glyph,24)}</a>`).join('');
const narrow = window.matchMedia('(max-width: 900px)');
const store = {get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }};
function setCollapsed(c){
  document.body.classList.toggle('rail-collapsed', c); store.set('rml-rail-collapsed', c ? '1' : '0');
  const b = $('railToggle'); b.setAttribute('aria-label', c ? 'Expand sidebar' : 'Collapse sidebar'); b.title = b.getAttribute('aria-label');
  b.querySelector('.collapse-ico').style.rotate = c ? '180deg' : '';
}
setCollapsed(store.get('rml-rail-collapsed') === '1');
const closeDrawer = ()=>document.body.classList.remove('rail-open');
$('railToggle').addEventListener('click', ()=>{ if (narrow.matches) closeDrawer(); else setCollapsed(!document.body.classList.contains('rail-collapsed')); });
$('drawerBtn').addEventListener('click', ()=>document.body.classList.add('rail-open'));
$('railBackdrop').addEventListener('click', closeDrawer);
document.addEventListener('keydown', e=>{ if (e.key === 'Escape') closeDrawer(); });
function updateRail(d, changedSubject){
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
}

const TABS = [['idea','Idea'],['code','Luau code'],['uses','In games'],['gotchas','Watch out']];
function renderLesson(d){
  const s = subjById(d.subject), idx = s.demos.indexOf(d), prev = s.demos[idx-1], next = s.demos[idx+1];
  lessonEl.innerHTML = `
    <p class="eyebrow">${esc(s.title)} · ${idx+1} of ${s.demos.length}</p>
    <h2>${esc(d.title)}</h2>
    <code class="sig">${esc(d.sig)}</code>
    <div class="ltabs" role="tablist">${TABS.map(([k,t])=>`<button type="button" role="tab" data-t="${k}" aria-selected="${k===lessonTab}">${t}</button>`).join('')}</div>
    <div class="lpanel" data-p="idea"${lessonTab==='idea'?'':' hidden'}>${d.body}</div>
    <div class="lpanel" data-p="code"${lessonTab==='code'?'':' hidden'}><div class="codebox"><div class="codebar"><span class="live-dot">Updates with the sliders</span><button type="button" id="copyBtn">Copy</button></div><pre class="code"><code id="codeOut"></code></pre></div></div>
    <div class="lpanel" data-p="uses"${lessonTab==='uses'?'':' hidden'}><ul class="items">${d.uses.map(u=>`<li>${u}</li>`).join('')}</ul></div>
    <div class="lpanel" data-p="gotchas"${lessonTab==='gotchas'?'':' hidden'}><ul class="items warn">${d.gotchas.map(u=>`<li>${u}</li>`).join('')}</ul></div>
    <nav class="pager" aria-label="Topic pages">
      ${prev?`<a href="#${prev.id}"><small>Previous</small>${esc(prev.title)}</a>`:''}
      ${next?`<a class="next" href="#${next.id}"><small>Next</small>${esc(next.title)}</a>`:`<a class="next" href="#home"><small>Done with ${esc(s.title)}</small>All subjects</a>`}
    </nav>`;
  lessonEl.querySelector('.ltabs').addEventListener('click', e=>{ const b = e.target.closest('button'); if (!b) return; lessonTab = b.dataset.t;
    lessonEl.querySelectorAll('.ltabs button').forEach(x=>x.setAttribute('aria-selected', x===b ? 'true' : 'false'));
    lessonEl.querySelectorAll('.lpanel').forEach(pn=>pn.hidden = pn.dataset.p !== lessonTab); });
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
