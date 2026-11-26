(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, CF, G, R, S, T, clamp, mulberry32} = Lab;
const {inst, labels} = Lab.kit2;
const demo = Lab.subject({
  id:'color', title:'Colors', glyph:'palette',
  blurb:'Color3 maths: RGB, blending, HSV, rainbows, gradients, readable text, hex codes, flashes and picking distinct team colours.'
});
const rgb = (r,g,b)=>new THREE.Color(r/255, g/255, b/255);
function hsv(h, s, v){ h = ((h%1)+1)%1; const i = Math.floor(h*6), fr = h*6 - i, p = v*(1-s), q = v*(1-fr*s), t = v*(1-(1-fr)*s);
  const [r,g,b] = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i%6]; return new THREE.Color(r,g,b); }
const to255 = c=>[Math.round(c.r*255), Math.round(c.g*255), Math.round(c.b*255)];
const hex = c=>to255(c).map(x=>x.toString(16).toUpperCase().padStart(2,'0')).join('');
const PRESETS = {green:[40,200,90], red:[230,50,50], blue:[50,110,230], yellow:[250,210,40], white:[255,255,255], black:[20,20,24], purple:[150,70,210]};
const presetOpts = Object.keys(PRESETS).map(k=>[k, k[0].toUpperCase()+k.slice(1)]);
function swatch(K, size=V(1,1,1)){ const m = K.add(new THREE.Mesh(G.box, new THREE.MeshLambertMaterial({color:0xffffff}))); m.scale.copy(size); m.add(new THREE.LineSegments(G.edges, new THREE.LineBasicMaterial({color:C('--ink'), transparent:true, opacity:0.25}))); return m; }

demo({
  id:'col-rgb', title:'Color3 and RGB', short:'Color3.fromRGB(r, g, b)', sig:'Color3.fromRGB(0–255, 0–255, 0–255)   ·   Color3.new(0–1, 0–1, 0–1)',
  view:{theta:0.25, phi:1.2, r:15, ty:2},
  params:[R('r','Red',0,255,1,226), R('g','Green',0,255,1,133), R('b','Blue',0,255,1,26)],
  setup(K){
    const sw = swatch(K, V(3,3,3)); sw.position.set(-3,1.5,0);
    const bars = [['--x','R'],['--y','G'],['--z','B']].map(([c,n],i)=>{ const m = K.part(V(0.8,1,0.8),c,{front:false}); K.label(n,c,'big').at(V(2+i*1.6,-0.4,0)); return m; });
    const vals = labels(K,3,'--ink');
    return {update(p){
      sw.material.color.copy(rgb(p.r,p.g,p.b)); vals.begin();
      [p.r,p.g,p.b].forEach((v,i)=>{ const h = Math.max(0.02, v/255*5); bars[i].resize(V(0.8,h,0.8)); bars[i].position.set(2+i*1.6, h/2, 0); vals.add(String(v), V(2+i*1.6, h+0.4, 0)); }); vals.end();
      return {};
    }};
  },
  readout:(p)=>[['fromRGB', `${p.r}, ${p.g}, ${p.b}`],['Color3.new', `${f(p.r/255,3)}, ${f(p.g/255,3)}, ${f(p.b/255,3)}`,'acc']],
  code:(p)=>`part.Color = Color3.fromRGB(${p.r}, ${p.g}, ${p.b})        -- 0 to 255, like most colour pickers
part.Color = Color3.new(${f(p.r/255,3)}, ${f(p.g/255,3)}, ${f(p.b/255,3)})   -- the same colour, 0 to 1

local c = part.Color
print(c.R, c.G, c.B)          --> always 0 to 1, even if you used fromRGB`,
  body:`<p>Screens make every colour by mixing <b>red</b>, <b>green</b> and <b>blue</b> light. All three at full gives white, all at zero gives black, and equal amounts give greys. Red and green together make yellow, which surprises people used to mixing paint.</p>
<p>Roblox stores channels from 0 to 1. <code>Color3.fromRGB</code> takes the 0-to-255 numbers colour pickers show and divides for you. Reading <code>.R</code>, <code>.G</code>, <code>.B</code> always gives 0 to 1.</p>`,
  uses:[`<b>Setting colours from code</b>: parts, lights, UI, particles.`,`<b>Team and rarity colours</b> stored as numbers.`,`<b>Changing one channel</b>, e.g. making a light redder.`],
  gotchas:[`<code>Color3.new(255, 0, 0)</code> is wrong: it expects 0 to 1. Use <code>fromRGB</code> for 0–255.`,`Color3 values can't be edited in place; build a new one.`]
});

demo({
  id:'col-lerp', title:'Blending colours: Color3:Lerp', short:'a:Lerp(b, t)', sig:'colorA:Lerp(colorB, alpha)',
  view:{theta:0.0, phi:1.0, r:17, ty:1},
  params:[S('a','Colour A',presetOpts,'green'), S('b','Colour B',presetOpts,'red'), R('t','alpha',0,1,0.01,0.5)],
  setup(K){
    const cubes = inst(K, 11), pick = swatch(K, V(1.6,1.6,1.6)), bar = K.part(V(10,0.6,0.6),'--part',{front:false, opacity:0.3}), fill = swatch(K, V(1,0.6,0.7)); bar.position.set(0,0.3,3);
    const lt = K.label('','--ink','big');
    return {update(p){
      const A = rgb(...PRESETS[p.a]), B = rgb(...PRESETS[p.b]); cubes.begin();
      for (let i=0;i<=10;i++) cubes.add(V(-7.5 + i*1.5, 0.5, -1.5), 1, A.clone().lerp(B, i/10)); cubes.end();
      const c = A.clone().lerp(B, p.t); pick.material.color.copy(c); pick.position.set(-7.5 + p.t*15, 2.2, -1.5); lt.at(V(-7.5 + p.t*15, 3.6, -1.5)).text(`alpha ${f(p.t)}`);
      const hp = 1 - p.t; fill.scale.set(Math.max(0.02,10*hp),0.6,0.7); fill.position.set(-5 + 5*hp, 0.3, 3.05); fill.material.color.copy(c);
      return {c};
    }};
  },
  readout:(p,o)=>[['result', to255(o.c).join(', '),'acc'],['as health bar', `${f((1-p.t)*100,0)}% health`]],
  code:(p,o)=>`local FULL = Color3.fromRGB(${PRESETS[p.a].join(', ')})
local EMPTY = Color3.fromRGB(${PRESETS[p.b].join(', ')})

local alpha = ${f(p.t)}
local color = FULL:Lerp(EMPTY, alpha)     --> ${to255(o.c).join(', ')}

-- health bar: more damage → closer to EMPTY
bar.BackgroundColor3 = EMPTY:Lerp(FULL, humanoid.Health / humanoid.MaxHealth)`,
  body:`<p><code>Color3:Lerp</code> blends two colours channel by channel, exactly like lerping numbers. Alpha 0 gives the first colour, 1 the second, and everything in between is a smooth mix.</p>
<p>The classic use is a health bar that fades from green to red. Notice that green to red passes through a muddy yellow-brown in the middle; mixing in RGB goes straight through the colour cube, not around the rainbow. For a brighter middle, blend through yellow with a three-stop gradient (see Gradients) or blend in HSV.</p>`,
  uses:[`<b>Health, stamina and heat bars.</b>`,`<b>Fading lights and skies</b> between two moods.`,`<b>Hover and press states</b> on buttons.`],
  gotchas:[`Opposite colours (red ↔ green, blue ↔ yellow) look dull halfway. Add a middle colour.`]
});

demo({
  id:'col-hsv', title:'HSV: hue, saturation, value', short:'Color3.fromHSV(h, s, v)', sig:'Color3.fromHSV(hue 0–1, saturation 0–1, value 0–1)   ·   color:ToHSV()',
  view:{theta:0.0, phi:0.45, r:18, ty:0},
  params:[R('h','Hue',0,1,0.01,0.08), R('s','Saturation',0,1,0.01,0.85), R('v','Value (brightness)',0,1,0.01,0.9)],
  setup(K){
    const cubes = inst(K, 400), pick = swatch(K, V(1.4,1.4,1.4)), ring = K.ring(0.9,'--ink',{y:0.6});
    return {update(p){
      cubes.begin();
      for (let r=1;r<=6;r++){ const n = r*10; for (let i=0;i<n;i++){ const h = i/n, s = r/6, a = h*Math.PI*2; cubes.add(V(Math.cos(a)*r*1.1, 0.2, -Math.sin(a)*r*1.1), V(0.7,0.4,0.7), hsv(h,s,p.v)); } }
      cubes.add(V(0,0.2,0), V(0.7,0.4,0.7), hsv(0,0,p.v)); cubes.end();
      const a = p.h*Math.PI*2, rr = p.s*6.6; ring.position.set(Math.cos(a)*rr, 0, -Math.sin(a)*rr);
      pick.material.color.copy(hsv(p.h,p.s,p.v)); pick.position.set(8.5, 0.7, 0);
      return {c:hsv(p.h,p.s,p.v)};
    }};
  },
  readout:(p,o)=>[['hue', f(p.h*360,0)+'°'],['RGB', to255(o.c).join(', '),'acc']],
  code:(p,o)=>`local color = Color3.fromHSV(${p.h}, ${p.s}, ${p.v})   --> RGB ${to255(o.c).join(', ')}

-- read it back and tweak just one thing
local h, s, v = color:ToHSV()
local brighter = Color3.fromHSV(h, s, math.min(1, v + 0.2))
local pastel = Color3.fromHSV(h, s * 0.4, 1)
local nextHue = Color3.fromHSV((h + 0.5) % 1, s, v)   -- the opposite colour`,
  body:`<p>RGB is how screens work, but not how people think about colour. <b>HSV</b> splits it into <b>hue</b> (which colour: red, orange, yellow… around the wheel), <b>saturation</b> (how strong, from grey to vivid) and <b>value</b> (how bright, from black to full).</p>
<p>Here hue goes around the circle and saturation goes outward from grey in the middle. Lower the value and the whole wheel darkens. HSV makes "same colour but brighter" or "same brightness but a different hue" one-line changes.</p>`,
  uses:[`<b>Rainbows and colour cycling</b> (change only hue).`,`<b>Darker or lighter variants</b> of a team colour (change only value).`,`<b>Colour pickers</b> in building games.`],
  gotchas:[`Hue wraps around: 0 and 1 are both red. Use <code>% 1</code> when adding to it.`,`Grey (saturation 0) has no meaningful hue; <code>ToHSV</code> returns 0 for it.`]
});

demo({
  id:'col-rainbow', title:'Rainbow cycling', short:'hue = (t · speed + offset) % 1', sig:'Color3.fromHSV((os.clock() * speed + i * spread) % 1, 1, 1)', time:true,
  view:{theta:0.0, phi:1.0, r:20, ty:1.5},
  params:[R('speed','Speed',0,1,0.02,0.2,' turns/s'), R('spread','Hue spread per part',0,0.2,0.005,0.06), R('sat','Saturation',0,1,0.05,0.8)],
  setup(K){
    const cubes = inst(K, 16);
    return {update(p,t){ cubes.begin(); for (let i=0;i<16;i++) cubes.add(V(-9 + i*1.2, 0.6 + 0.4*Math.sin(t*2 - i*0.4), 0), 1, hsv(t*p.speed + i*p.spread, p.sat, 1)); cubes.end(); return {h:((t*p.speed)%1)}; }};
  },
  readout:(p,o)=>[['first part hue', f(o.h*360,0)+'°','acc'],['parts per full rainbow', p.spread > 0 ? f(1/p.spread,1) : '∞']],
  code:(p)=>`local SPEED, SPREAD = ${p.speed}, ${p.spread}

RunService.Heartbeat:Connect(function()
    local t = os.clock()
    for i, part in parts do
        local hue = (t * SPEED + (i - 1) * SPREAD) % 1
        part.Color = Color3.fromHSV(hue, ${p.sat}, 1)
    end
end)`,
  body:`<p>Moving the hue steadily around the colour wheel gives a rainbow cycle. Add a small hue offset per part and the rainbow spreads along the row and flows; that's the "RGB lighting" look.</p>
<p>The <code>% 1</code> wraps the hue back to red after violet so it loops forever. Lower the saturation for softer pastel rainbows, which are easier on the eyes for large areas.</p>`,
  uses:[`<b>VIP name tags and rainbow trails.</b>`,`<b>Disco floors, neon signs and celebration effects.</b>`,`<b>Loading spinners</b> that change colour as they turn.`],
  gotchas:[`Updating many parts' colours every frame costs network traffic if done on the server. Animate colours on the client.`]
});

demo({
  id:'col-gradient', title:'Gradients with several stops', short:'ColorSequence keypoints', sig:'find the keypoints around t, then Color3:Lerp between them',
  view:{theta:0.0, phi:1.05, r:17, ty:1},
  params:[R('mid','Middle stop position',0.1,0.9,0.01,0.5), R('hp','Health',0,1,0.01,0.35)],
  setup(K){
    const strip = inst(K, 41), stops = labels(K,3,'--ink'), bar = K.part(V(10,0.7,0.6),'--part',{front:false, opacity:0.3}), fill = swatch(K, V(1,0.7,0.7)); bar.position.set(0,0.35,3);
    return {update(p){
      const keys = [[0, rgb(230,50,50)],[p.mid, rgb(250,210,40)],[1, rgb(40,200,90)]];
      const ev = t=>{ for (let i=0;i<keys.length-1;i++){ const [t0,c0] = keys[i], [t1,c1] = keys[i+1]; if (t <= t1) return c0.clone().lerp(c1, (t-t0)/(t1-t0)); } return keys[keys.length-1][1].clone(); };
      strip.begin(); for (let i=0;i<=40;i++) strip.add(V(-8 + i*0.4, 0.5, -1.5), V(0.4,1,1), ev(i/40)); strip.end();
      stops.begin(); keys.forEach(([t])=>stops.add(`${f(t,2)}`, V(-8 + t*16, 1.5, -1.5))); stops.end();
      const c = ev(p.hp); fill.scale.set(Math.max(0.02,10*p.hp),0.7,0.7); fill.position.set(-5 + 5*p.hp, 0.35, 3.05); fill.material.color.copy(c);
      return {c};
    }};
  },
  readout:(p,o)=>[['health colour', to255(o.c).join(', '),'acc']],
  code:(p,o)=>`local GRADIENT = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(230, 50, 50)),     -- red
    ColorSequenceKeypoint.new(${p.mid}, Color3.fromRGB(250, 210, 40)),  -- yellow
    ColorSequenceKeypoint.new(1, Color3.fromRGB(40, 200, 90)),     -- green
})

local function evaluate(sequence, t)
    local keys = sequence.Keypoints
    for i = 1, #keys - 1 do
        local a, b = keys[i], keys[i + 1]
        if t <= b.Time then
            return a.Value:Lerp(b.Value, (t - a.Time) / (b.Time - a.Time))
        end
    end
    return keys[#keys].Value
end

bar.BackgroundColor3 = evaluate(GRADIENT, ${p.hp})   --> ${to255(o.c).join(', ')}`,
  body:`<p>Two colours aren't always enough. A <b>gradient</b> with several stops, such as red → yellow → green, avoids the muddy middle you get when blending opposites directly. To read a colour at any point, find the two stops either side and lerp between them, the same idea as keyframes.</p>
<p>Roblox's <code>ColorSequence</code> stores stops for particles, beams and UIGradients. It has no built-in way to read a colour at a point, so the code adds a small <code>evaluate</code> function. Move the middle stop to change where the bar turns yellow.</p>`,
  uses:[`<b>Health bars</b> with a clear "danger" colour band.`,`<b>Heat maps and temperature effects.</b>`,`<b>Sky colours</b> through the day (several stops over 24 hours).`],
  gotchas:[`Keypoints must start at time 0 and end at 1, in order.`]
});

const lum = c=>{ const ch = x=>x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4); return 0.2126*ch(c.r) + 0.7152*ch(c.g) + 0.0722*ch(c.b); };
const contrast = (a,b)=>{ const la = lum(a), lb = lum(b); return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05); };
demo({
  id:'col-contrast', title:'Readable text on any colour', short:'luminance and contrast', sig:'luminance ≈ 0.2126·R + 0.7152·G + 0.0722·B   (in linear light)',
  view:{theta:0.0, phi:1.3, r:12, ty:1.5},
  params:[R('h','Background hue',0,1,0.01,0.15), R('s','Saturation',0,1,0.01,0.8), R('v','Brightness',0,1,0.01,0.9)],
  setup(K){
    const bg = swatch(K, V(10,3.5,0.3)); bg.position.set(0,1.8,0);
    const lb = K.label('Black text','--ink','big'), lw = K.label('White text','--ink','big');
    lb.el.style.background = 'none'; lw.el.style.background = 'none'; lb.el.style.fontSize = lw.el.style.fontSize = '18px';
    return {update(p){
      const c = hsv(p.h,p.s,p.v); bg.material.color.copy(c);
      const cb = contrast(c, new THREE.Color(0,0,0)), cw = contrast(c, new THREE.Color(1,1,1));
      lb.at(V(-2.5,2.6,0.3)); lw.at(V(2.5,2.6,0.3)); lb.el.style.color = '#000'; lw.el.style.color = '#fff';
      return {L:lum(c), cb, cw, pick: cb > cw ? 'black' : 'white'};
    }};
  },
  readout:(p,o)=>[['luminance', f(o.L,3)],['contrast with black', f(o.cb,1)+' : 1', o.cb >= 4.5 ? 'ok' : 'bad'],['contrast with white', f(o.cw,1)+' : 1', o.cw >= 4.5 ? 'ok' : 'bad'],['pick', o.pick,'acc']],
  code:(p,o)=>`local function channel(x)         -- undo the screen's brightness curve
    if x <= 0.03928 then return x / 12.92 end
    return ((x + 0.055) / 1.055) ^ 2.4
end
local function luminance(c)
    return 0.2126 * channel(c.R) + 0.7152 * channel(c.G) + 0.0722 * channel(c.B)
end
local function contrast(a, b)
    local la, lb = luminance(a), luminance(b)
    return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05)
end

local bg = Color3.fromHSV(${p.h}, ${p.s}, ${p.v})
local black, white = Color3.new(0, 0, 0), Color3.new(1, 1, 1)
label.TextColor3 = contrast(bg, black) > contrast(bg, white) and black or white   --> ${o.pick}`,
  body:`<p>When the background colour can change (team colours, player-picked colours, rarity colours), the text on it has to stay readable. Eyes are far more sensitive to green than blue, so a bright yellow is "light" while an equally strong blue is "dark". <b>Luminance</b> weighs the channels to match.</p>
<p>The <b>contrast ratio</b> compares two luminances. Accessibility guidelines ask for at least 4.5 : 1 for normal text. Slide the hue around: yellows and cyans need black text, blues and purples need white.</p>`,
  uses:[`<b>Name tags and buttons</b> on player-chosen colours.`,`<b>Rarity labels</b> on coloured backgrounds.`,`<b>Checking your UI</b> for readability.`],
  gotchas:[`Don't just average R, G and B; a pure blue would count as "medium" when it's actually very dark.`]
});

demo({
  id:'col-hex', title:'Hex colour codes', short:'#RRGGBB', sig:'Color3.fromHex("#E2851A")   ·   color:ToHex()  →  "e2851a"',
  view:{theta:0.0, phi:1.25, r:14, ty:1.8},
  params:[R('r','Red',0,255,1,226), R('g','Green',0,255,1,133), R('b','Blue',0,255,1,26)],
  setup(K){
    const sw = swatch(K, V(3,3,3)); sw.position.set(0,3.2,-1);
    const digits = labels(K,6,'--ink','big'), groups = labels(K,3,'--muted');
    return {update(p){
      sw.material.color.copy(rgb(p.r,p.g,p.b)); const h = hex(rgb(p.r,p.g,p.b));
      digits.begin(); [...h].forEach((ch,i)=>digits.add(ch, V(-3.75 + i*1.5, 0.8, 1), ['--x','--x','--y','--y','--z','--z'][i])); digits.end();
      groups.begin(); [[p.r,-3],[p.g,0],[p.b,3]].forEach(([v,x])=>groups.add(`${v} = ${Math.floor(v/16)}×16 + ${v%16}`, V(x,0,1))); groups.end();
      return {h};
    }};
  },
  readout:(p,o)=>[['hex', '#'+o.h,'acc'],['RGB', `${p.r}, ${p.g}, ${p.b}`]],
  code:(p,o)=>`local color = Color3.fromHex("#${o.h}")      --> ${p.r}, ${p.g}, ${p.b}
print(color:ToHex())                       --> "${o.h.toLowerCase()}"

-- each pair of hex digits is one channel, 00 to FF (0 to 255)
-- ${o.h.slice(0,2)} = ${p.r},  ${o.h.slice(2,4)} = ${p.g},  ${o.h.slice(4,6)} = ${p.b}`,
  body:`<p>Hex codes are the compact way designers write colours: <code>#RRGGBB</code>, two hex digits per channel. Hex counts in sixteens (0–9 then A–F), so two digits cover 0 to 255, the same range as <code>fromRGB</code>.</p>
<p><code>Color3.fromHex</code> reads a code (with or without the <code>#</code>) and <code>:ToHex()</code> writes one back. That makes it easy to copy colours from design tools, websites or a style guide straight into your scripts.</p>`,
  uses:[`<b>Copying palettes</b> from design tools.`,`<b>Storing colours as short strings</b> in settings or DataStores.`,`<b>Rich text</b>: <code>&lt;font color="#E2851A"&gt;</code> in TextLabels.`],
  gotchas:[`<code>ToHex</code> returns lowercase without the <code>#</code>.`]
});

demo({
  id:'col-flash', title:'Flashes, tints and shades', short:'lerp toward white, black or red', sig:'base:Lerp(Color3.new(1, 1, 1), 0.3)  ·  base:Lerp(flashColor, pulse)', time:true,
  view:{theta:0.0, phi:1.15, r:16, ty:1.5},
  params:[S('base','Base colour',presetOpts,'blue'), R('amt','Tint / shade amount',0,0.8,0.05,0.35), R('flash','Hit flash length',0.1,1,0.05,0.3,' s')],
  setup(K){
    const shade = swatch(K, V(2,2,2)), basec = swatch(K, V(2,2,2)), tint = swatch(K, V(2,2,2)), hit = swatch(K, V(2,2,2));
    shade.position.set(-6,1,0); basec.position.set(-3,1,0); tint.position.set(0,1,0); hit.position.set(5,1,0);
    K.label('shade','--muted').at(V(-6,-0.4,0)); K.label('base','--muted').at(V(-3,-0.4,0)); K.label('tint','--muted').at(V(0,-0.4,0)); const lh = K.label('hit flash','--muted'); lh.at(V(5,-0.4,0));
    return {update(p,t){
      const b = rgb(...PRESETS[p.base]); basec.material.color.copy(b);
      shade.material.color.copy(b.clone().lerp(new THREE.Color(0,0,0), p.amt)); tint.material.color.copy(b.clone().lerp(new THREE.Color(1,1,1), p.amt));
      const since = t % 1.5, pulse = since < p.flash ? 1 - since/p.flash : 0; hit.material.color.copy(b.clone().lerp(new THREE.Color(1,0.15,0.15), pulse));
      hit.scale.setScalar(2 + 0.25*pulse); return {pulse};
    }};
  },
  readout:(p,o)=>[['flash strength', f(o.pulse,2),'acc']],
  code:(p)=>`local base = part.Color
local shade = base:Lerp(Color3.new(0, 0, 0), ${p.amt})     -- darker
local tint  = base:Lerp(Color3.new(1, 1, 1), ${p.amt})     -- lighter

-- damage flash: jump to red, then fade back over ${p.flash} s
local function flash()
    local start = os.clock()
    while os.clock() - start < ${p.flash} do
        local pulse = 1 - (os.clock() - start) / ${p.flash}
        part.Color = base:Lerp(Color3.fromRGB(255, 40, 40), pulse)
        RunService.Heartbeat:Wait()
    end
    part.Color = base
end`,
  body:`<p>Lerping toward white gives a <b>tint</b> (lighter), toward black a <b>shade</b> (darker). One base colour can then produce a whole set: darker borders, lighter hover states, pressed buttons.</p>
<p>A <b>hit flash</b> is the same trick over time: jump toward red, then lerp back to the base colour. It's one of the cheapest and most effective "you got hit" signals. Keep it short; 0.1 to 0.3 s feels punchy.</p>`,
  uses:[`<b>Button hover and press states</b> from one theme colour.`,`<b>Damage flashes</b> on enemies and players.`,`<b>Darker variants</b> for outlines and shadows.`],
  gotchas:[`Store the original colour before flashing, or repeated hits drift the colour toward red permanently.`,`For whole characters, a <code>Highlight</code> instance's colour and transparency are easier to flash than every part.`]
});

demo({
  id:'col-distinct', title:'Picking distinct team colours', short:'golden-ratio hue steps', sig:'hue = (i × 0.618034) % 1',
  view:{theta:0.0, phi:1.05, r:20, ty:1},
  params:[R('n','How many colours',2,16,1,8), R('seed','Seed (random row)',1,99,1,4)],
  setup(K){
    const cubes = inst(K, 32); K.label('golden ratio','--ink','big').at(V(-10.5,0.5,-1.5)).el.style.translate = '-50% 0'; K.label('random hues','--ink','big').at(V(-10.5,0.5,1.5)).el.style.translate = '-50% 0';
    const minGap = hs=>{ let m = 1; for (let i=0;i<hs.length;i++) for (let j=i+1;j<hs.length;j++){ const d = Math.abs(hs[i]-hs[j]); m = Math.min(m, Math.min(d, 1-d)); } return m; };
    return {update(p){
      const r = mulberry32(p.seed*91), gold = [], rnd = [];
      for (let i=0;i<p.n;i++){ gold.push((i*0.618034) % 1); rnd.push(r()); }
      cubes.begin(); gold.forEach((h,i)=>cubes.add(V(-8.5 + i*1.15, 0.5, -1.5), 1, hsv(h,0.75,0.95))); rnd.forEach((h,i)=>cubes.add(V(-8.5 + i*1.15, 0.5, 1.5), 1, hsv(h,0.75,0.95))); cubes.end();
      return {g:minGap(gold)*360, r:minGap(rnd)*360};
    }};
  },
  readout:(p,o)=>[['closest pair (golden)', f(o.g,0)+'° apart','ok'],['closest pair (random)', f(o.r,0)+'° apart', o.r < 15 ? 'bad' : '']],
  code:(p)=>`local GOLDEN = 0.618034        -- the golden ratio minus 1

local function teamColor(index)  -- index 0, 1, 2, ...
    local hue = (index * GOLDEN) % 1
    return Color3.fromHSV(hue, 0.75, 0.95)
end

for i, team in teams do
    team.TeamColor = BrickColor.new(teamColor(i - 1))
end`,
  body:`<p>Picking colours at random often gives two near-identical teams. Stepping the hue by the <b>golden ratio</b> (about 0.618 of a full turn) each time spreads them out as evenly as possible, however many you need, and the first few are always very different.</p>
<p>It's the same trick as the Fibonacci sphere, in one dimension. Compare the closest pair in each row as you add colours. Keeping saturation and value fixed also stops one team being much brighter than the others.</p>`,
  uses:[`<b>Team, party and player colours.</b>`,`<b>Graph lines and map markers</b> that must be told apart.`,`<b>Procedural item tints</b> that stay varied.`],
  gotchas:[`Hue alone isn't enough for colour-blind players. Pair colours with icons, patterns or names.`]
});

Lab.finder([
  ['Set a part colour from 0–255 numbers','Color3.fromRGB','col-rgb'],
  ['Make a health bar fade from green to red','Color3:Lerp','col-lerp'],
  ['Make a colour brighter without changing it','Color3.fromHSV / ToHSV','col-hsv'],
  ['Make a rainbow effect','hue cycling','col-rainbow'],
  ['Make a gradient with several colours','ColorSequence evaluate','col-gradient'],
  ['Choose black or white text for any background','luminance and contrast','col-contrast'],
  ['Use hex colour codes','Color3.fromHex','col-hex'],
  ['Make enemies flash red when hit','lerp to red and back','col-flash'],
  ['Give teams colours that look different','golden ratio hues','col-distinct'],
]);
Lab.ref('color','Colors',[
  ['Color3.fromRGB(r, g, b)','Colour from 0–255','Color3.fromRGB(226, 133, 26)','Most colour setting'],
  ['Color3.new(r, g, b)','Colour from 0–1','Color3.new(1, 0.5, 0)','Maths-built colours'],
  ['Color3.fromHSV(h, s, v)','Hue, saturation, value','Color3.fromHSV(0.1, 0.8, 1)','Rainbows, variants'],
  ['c:ToHSV()','Back to h, s, v','local h, s, v = c:ToHSV()','Brighter / darker versions'],
  ['a:Lerp(b, t)','Blend two colours','green:Lerp(red, damage)','Health bars, fades'],
  ['Color3.fromHex(s) / c:ToHex()','Hex codes','Color3.fromHex("#E2851A")','Palettes from design tools'],
  ['ColorSequence','Several colour stops','ColorSequence.new({...})','Particles, gradients'],
  ['luminance','0.2126R + 0.7152G + 0.0722B (linear)','luminance(bg)','Readable text'],
]);
})();
