/* Visual settings: theme, accent colour, text size, density, icon size.
   Loaded in <head> so the saved look is applied before the page draws;
   the settings panel itself is built once the page has loaded. */
(function(){
"use strict";
const KEY = 'rml-visual';
const DEFAULTS = {theme:'studio', accent:'', text:1, density:'normal', icons:1};

// name, label, preview colours [background, panel, accent]
const THEMES = [
  ['studio', 'Studio', ['#2B2B2B', '#3C3C3C', '#00A2FF']],
  ['dark', 'Dark', ['#11151B', '#1F252E', '#F29E3A']],
  ['light', 'Light', ['#EBEFF4', '#FFFFFF', '#E2851A']],
  ['calm', 'Calm', ['#0F1216', '#1B2129', '#4FB3BF']],
  ['blueprint', 'Blueprint', ['#0A1628', '#142842', '#3DD6F5']],
  ['paper', 'Paper', ['#F6F3EE', '#FFFDF9', '#C8553D']],
  ['mono', 'Mono', ['#FFFFFF', '#F4F4F5', '#2F5BFF']],
  ['soft', 'Soft', ['#F3F1F8', '#FFFFFF', '#7B5CF0']],
  ['abyss', 'Abyss', ['#0B132B', '#1C2541', '#5BC0BE']],
  ['forest', 'Forest', ['#13241C', '#1E3B2F', '#C8B48A']],
  ['synthwave', 'Synthwave', ['#1A0B26', '#2F1541', '#FF5B42']],
  ['slate', 'Slate', ['#262C33', '#303841', '#FF5722']],
  ['sand', 'Sand', ['#F2EEE6', '#EDE5D7', '#5D866C']],
  ['ocean', 'Ocean', ['#EAF2F4', '#B9E4E8', '#167D8D']],
  ['system', 'Match system', ['#EBEFF4', '#11151B', '#E2851A']],
];
const ACCENTS = [['', 'Theme default'], ['#00A2FF', 'Blue'], ['#2BB3A8', 'Teal'], ['#3FB950', 'Green'], ['#E3B341', 'Yellow'],
  ['#E2851A', 'Orange'], ['#E5484D', 'Red'], ['#E0559B', 'Pink'], ['#8B5CF6', 'Purple']];
const TEXT = [[0.9, 'Small'], [1, 'Normal'], [1.12, 'Large'], [1.25, 'Extra large']];
const DENSITY = [['compact', 'Compact'], ['normal', 'Normal'], ['spaced', 'Spaced']];
const ICONS = [[1, 'Normal'], [1.2, 'Large'], [1.4, 'Extra large']];

const load = ()=>{ try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch(e){ return Object.assign({}, DEFAULTS); } };
const save = s=>{ try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e){} };
let state = load();

// colour helpers for deriving the accent's text and tint colours from the theme
const hex = h=>{ h = h.trim().replace('#', ''); if (h.length === 3) h = h.split('').map(c=>c + c).join(''); return [0, 2, 4].map(i=>parseInt(h.slice(i, i + 2), 16)); };
const toHex = rgb=>'#' + rgb.map(v=>Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t)=>toHex(hex(a).map((v, i)=>v + (hex(b)[i] - v) * t));
const luminance = h=>{ const [r, g, b] = hex(h).map(v=>{ v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

function apply(){
  const root = document.documentElement, st = root.style;
  if (state.theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', state.theme);
  root.setAttribute('data-density', state.density);
  st.setProperty('--ts', state.text);
  st.setProperty('--icon', state.icons);
  ['--accent', '--accent-ink', '--accent-soft', '--on-accent'].forEach(p=>st.removeProperty(p));
  const css = getComputedStyle(root);
  const accent = state.accent || css.getPropertyValue('--accent').trim();
  if (/^#[0-9a-f]{3,6}$/i.test(accent)){
    const ink = css.getPropertyValue('--ink').trim(), bg = css.getPropertyValue('--bg').trim();
    if (state.accent){
      st.setProperty('--accent', accent);
      st.setProperty('--accent-ink', mix(accent, ink, 0.3));
      st.setProperty('--accent-soft', mix(bg, accent, 0.16));
    }
    st.setProperty('--on-accent', luminance(accent) > 0.45 ? '#111111' : '#FFFFFF');
  }
}
apply();

function set(key, value){
  state[key] = value; save(state); apply(); render();
  window.dispatchEvent(new Event('resize'));
}

// ---------- the panel ----------
let panel, button;
const pressed = (a, b)=>String(a) === String(b);
function render(){
  if (!panel) return;
  panel.querySelectorAll('[data-set]').forEach(b=>b.setAttribute('aria-pressed', pressed(state[b.dataset.set], b.dataset.val) ? 'true' : 'false'));
}
const seg = (key, list)=>`<div class="seg">${list.map(([v, label])=>`<button type="button" data-set="${key}" data-val="${v}">${label}</button>`).join('')}</div>`;

function build(){
  button = document.getElementById('settingsBtn');
  panel = document.getElementById('settings');
  if (!button || !panel) return;
  panel.innerHTML = `
    <div class="set-head"><h2>Visual settings</h2><button type="button" class="icon-btn" id="settingsClose" aria-label="Close settings">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
    <fieldset><legend>Theme</legend><div class="theme-grid">${THEMES.map(([v, label, c])=>`
      <button type="button" class="theme-opt" data-set="theme" data-val="${v}"><span class="sw" style="background:${v === 'system' ? `linear-gradient(90deg, ${c[0]} 50%, ${c[1]} 50%)` : c[0]}">
        <i style="background:${c[1]}"></i><i style="background:${c[2]}"></i></span>${label}</button>`).join('')}</div></fieldset>
    <fieldset><legend>Accent colour</legend><div class="accent-row">${ACCENTS.map(([v, label])=>`
      <button type="button" class="accent-opt${v ? '' : ' auto'}" data-set="accent" data-val="${v}" title="${label}" aria-label="${label}"${v ? ` style="background:${v}"` : ''}></button>`).join('')}</div></fieldset>
    <fieldset><legend>Text size</legend>${seg('text', TEXT)}</fieldset>
    <fieldset><legend>Density</legend>${seg('density', DENSITY)}</fieldset>
    <fieldset><legend>Icon size</legend>${seg('icons', ICONS)}</fieldset>
    <button type="button" class="reset" id="settingsReset">Reset to defaults</button>`;

  panel.addEventListener('click', e=>{
    const b = e.target.closest('[data-set]');
    if (b){ const key = b.dataset.set, raw = b.dataset.val; set(key, key === 'text' || key === 'icons' ? parseFloat(raw) : raw); }
  });
  const open = show=>{ panel.hidden = !show; button.setAttribute('aria-expanded', show ? 'true' : 'false'); };
  button.addEventListener('click', ()=>open(panel.hidden));
  document.getElementById('settingsClose').addEventListener('click', ()=>{ open(false); button.focus(); });
  document.getElementById('settingsReset').addEventListener('click', ()=>{ state = Object.assign({}, DEFAULTS); save(state); apply(); render(); window.dispatchEvent(new Event('resize')); });
  document.addEventListener('click', e=>{ if (!panel.hidden && !panel.contains(e.target) && !button.contains(e.target)) open(false); });
  document.addEventListener('keydown', e=>{ if (e.key === 'Escape' && !panel.hidden){ open(false); button.focus(); } });
  // "Match system" follows the OS switching between light and dark
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', ()=>{ if (state.theme === 'system') apply(); });
  render();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
