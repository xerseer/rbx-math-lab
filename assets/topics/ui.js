(function(){
"use strict";
const {THREE, V, UP, D2R, C, f, CF, G, R, S, T, clamp} = Lab;
const {inst, labels} = Lab.kit2;
const demo = Lab.subject({
  id:'ui', title:'UI & screen maths', glyph:'screen',
  blurb:'UDim2 scale and offset, AnchorPoint, aspect ratios, world-to-screen, off-screen arrows, bars, radial cooldowns, layouts and dragging.'
});
const SCREENS = {phone:[844,390,'Phone 844×390'], pc:[1920,1080,'PC 1920×1080'], tablet:[1024,768,'Tablet 1024×768']};
const screenOpts = Object.entries(SCREENS).map(([k,v])=>[k,v[2]]);
/* a flat "screen" standing up in the scene; pixel (0,0) is the top-left corner */
function screen(K, z=0){
  const bg = K.part(V(1,1,0.1),'--panel',{front:false}), edge = K.line('--ink',{max:5});
  const S0 = {W:16, H:9, resX:1920, resY:1080, top:9.6};
  const api = {
    set(resX, resY){ S0.resX = resX; S0.resY = resY; S0.W = 16; S0.H = 16*resY/resX; if (S0.H > 9.5){ S0.H = 9.5; S0.W = 9.5*resX/resY; } S0.top = 0.4 + S0.H;
      bg.resize(V(S0.W, S0.H, 0.1)); bg.position.set(0, 0.4 + S0.H/2, z - 0.1);
      edge.set(V(-S0.W/2,0.4,z), V(S0.W/2,0.4,z), V(S0.W/2,S0.top,z), V(-S0.W/2,S0.top,z), V(-S0.W/2,0.4,z)); return api; },
    px(x, y, dz=0.05){ return V(-S0.W/2 + x/S0.resX*S0.W, S0.top - y/S0.resY*S0.H, z + dz); },
    size(w, h, d=0.1){ return V(Math.max(0.01, w/S0.resX*S0.W), Math.max(0.01, h/S0.resY*S0.H), d); },
    get s(){ return S0; }
  };
  return api.set(1920,1080);
}
function frame(K, color='--accent', opacity=0.9){ const m = K.part(V(1,1,0.1), color, {front:false, opacity}); m.place = (scr, x, y, w, h, dz=0.06)=>{ m.resize(scr.size(w,h)); m.position.copy(scr.px(x + w/2, y + h/2, dz)); return m; }; return m; }

demo({
  id:'ui-udim', title:'UDim2: scale and offset', short:'scale × parent + offset', sig:'pixels = Scale × parentSize + Offset',
  view:{theta:0, phi:1.45, r:17, ty:5},
  params:[S('scr','Screen',screenOpts,'phone'), R('xs','Position X scale',0,1,0.01,0.05), R('xo','Position X offset',-200,400,5,20,' px'), R('ws','Width scale',0,1,0.01,0.3), R('wo','Width offset',0,400,5,0,' px')],
  setup(K){ const scr = screen(K), fr = frame(K), lab = K.label('','--ink','big');
    return {update(p){
      const [rx, ry] = SCREENS[p.scr]; scr.set(rx, ry);
      const x = p.xs*rx + p.xo, w = p.ws*rx + p.wo, h = 0.25*ry, y = 0.5*ry - h/2; fr.place(scr, x, y, w, h);
      lab.at(scr.px(x + w/2, y - 30)).text(`x ${Math.round(x)} px, width ${Math.round(w)} px`);
      const all = Object.values(SCREENS).map(([a])=>`${a}px wide → ${Math.round(p.ws*a + p.wo)}`);
      return {x, w, all};
    }};
  },
  readout:(p,o)=>[['X on this screen', Math.round(o.x)+' px'],['width on this screen', Math.round(o.w)+' px','acc'],['width on each screen', o.all.join(' · ')]],
  code:(p,o)=>`frame.Position = UDim2.new(${p.xs}, ${p.xo}, 0.5, 0)
frame.Size = UDim2.new(${p.ws}, ${p.wo}, 0.25, 0)
-- on a ${SCREENS[p.scr][0]}-pixel-wide screen:
--   X     = ${p.xs} × ${SCREENS[p.scr][0]} + ${p.xo} = ${Math.round(o.x)} px
--   width = ${p.ws} × ${SCREENS[p.scr][0]} + ${p.wo} = ${Math.round(o.w)} px

-- shortcuts
UDim2.fromScale(0.3, 0.25)    -- scale only
UDim2.fromOffset(300, 80)     -- pixels only`,
  body:`<p>Every UI position and size is a <code>UDim2</code>: an X and a Y, each made of a <b>scale</b> (a fraction of the parent) and an <b>offset</b> (fixed pixels). The final pixel value is <code>scale × parent size + offset</code>.</p>
<p>Scale makes things grow with the screen; offset keeps them a fixed size. Switch between phone and PC with only a width scale and the frame stays a third of the screen. Use only offset and it's tiny on a big monitor and huge on a phone. Most good UI uses scale for size and small offsets for padding.</p>`,
  uses:[`<b>Layouts that work on phones and PCs.</b>`,`<b>Padding</b>: scale for the position, a few pixels of offset for a gap.`,`<b>Bars</b>: <code>UDim2.fromScale(hp / max, 1)</code>.`],
  gotchas:[`Text with offset sizes may be unreadable on phones. Test in Studio's device emulator.`]
});

demo({
  id:'ui-anchor', title:'AnchorPoint', short:'which point of the frame sits at Position', sig:'topLeft = Position − AnchorPoint × Size',
  view:{theta:0, phi:1.45, r:15, ty:5},
  params:[R('ax','AnchorPoint X',0,1,0.05,0.5), R('ay','AnchorPoint Y',0,1,0.05,0.5)],
  setup(K){ const scr = screen(K), fr = frame(K,'--va',0.8), pos = K.point('--vb',0.2), anc = K.point('--accent',0.14), cross = K.line('--muted',{dashed:true, max:5}); const lp = K.label('Position (0.5, 0.5)','--vb');
    return {update(p){
      const rx = 1920, ry = 1080, w = 0.35*rx, h = 0.3*ry, px = 0.5*rx, py = 0.5*ry, x = px - p.ax*w, y = py - p.ay*h;
      fr.place(scr, x, y, w, h); pos.position.copy(scr.px(px,py,0.2)); anc.position.copy(scr.px(x + p.ax*w, y + p.ay*h, 0.15)); lp.at(scr.px(px, py + 60, 0.2));
      cross.set(scr.px(x,y,0.12), scr.px(x+w,y,0.12), scr.px(x+w,y+h,0.12), scr.px(x,y+h,0.12), scr.px(x,y,0.12));
      return {x, y};
    }};
  },
  readout:(p,o)=>[['frame top-left', `${Math.round(o.x)}, ${Math.round(o.y)} px`],['centred?', p.ax===0.5 && p.ay===0.5 ? 'yes' : 'no', p.ax===0.5 && p.ay===0.5 ? 'ok' : '']],
  code:(p)=>`frame.AnchorPoint = Vector2.new(${p.ax}, ${p.ay})
frame.Position = UDim2.fromScale(0.5, 0.5)
-- (0, 0) = top-left corner at Position (the default)
-- (0.5, 0.5) = centre at Position → perfectly centred on screen
-- (1, 1) = bottom-right corner at Position → handy for bottom-right HUDs

bottomRight.AnchorPoint = Vector2.new(1, 1)
bottomRight.Position = UDim2.new(1, -16, 1, -16)   -- 16 px from the corner`,
  body:`<p>By default a frame's <b>top-left corner</b> sits at its Position. <code>AnchorPoint</code> picks a different point of the frame to pin there instead, as fractions of its own size: (0.5, 0.5) is its centre, (1, 1) its bottom-right corner.</p>
<p>The pink dot is the Position, which stays put; the orange dot is the anchor inside the frame. Set both to 0.5 to centre the frame on screen, whatever its size. Pinning to the right or bottom with anchor 1 avoids working out widths yourself.</p>`,
  uses:[`<b>Centring popups and titles.</b>`,`<b>Corner HUD elements</b> (health bottom-left, minimap top-right).`,`<b>Scaling from the centre</b>: tween Size with anchor 0.5 and it grows outward evenly.`],
  gotchas:[`Changing AnchorPoint moves the frame on screen. Set it first, then position.`]
});

demo({
  id:'ui-aspect', title:'Keeping proportions', short:'fit vs fill', sig:'fit: scale = min(screenW / w, screenH / h)   ·   fill: max(...)',
  view:{theta:0, phi:1.45, r:17, ty:5},
  params:[S('scr','Screen',screenOpts,'phone'), S('mode','Mode',[['fit','Fit (letterbox)'],['fill','Fill (crop)'],['stretch','Stretch']],'fit')],
  setup(K){ const scr = screen(K, 0), img = frame(K,'--va',0.85), sun = K.point('--accent',0.5), lab = K.label('','--ink');
    return {update(p){
      const [rx, ry] = SCREENS[p.scr]; scr.set(rx, ry); const iw = 1600, ih = 900;
      let sx = rx/iw, sy = ry/ih; if (p.mode==='fit') sx = sy = Math.min(sx, sy); else if (p.mode==='fill') sx = sy = Math.max(sx, sy);
      const w = iw*sx, h = ih*sy, x = (rx - w)/2, y = (ry - h)/2;
      const vw = Math.min(w, rx), vh = Math.min(h, ry); img.place(scr, Math.max(0,x), Math.max(0,y), vw, vh);
      sun.position.copy(scr.px(rx/2 + 0.25*w, ry/2 - 0.2*h, 0.25)); sun.scale.set(0.5, 0.5*(sy/sx), 0.5);
      lab.at(scr.px(rx/2, ry + 60)).text(p.mode==='fit' ? `bars: ${Math.round(Math.max(0,x))} px sides, ${Math.round(Math.max(0,y))} px top/bottom` : p.mode==='fill' ? `cropped: ${Math.round(Math.max(0,-x)*2)} px wide, ${Math.round(Math.max(0,-y)*2)} px tall` : 'stretched out of shape');
      return {w, h, x, y};
    }};
  },
  readout:(p,o)=>[['image drawn at', `${Math.round(o.w)} × ${Math.round(o.h)} px`,'acc'],['image ratio', '16 : 9'],['screen ratio', f(SCREENS[p.scr][0]/SCREENS[p.scr][1],2)+' : 1']],
  code:(p)=>`-- ImageLabel: pick how the image fills its frame
image.ScaleType = Enum.ScaleType.${p.mode==='fit' ? 'Fit      -- whole image visible, bars at the sides' : p.mode==='fill' ? 'Crop     -- fills the frame, edges cut off' : 'Stretch  -- fills the frame, image distorted'}

-- keep any frame at 16:9 whatever the screen shape
local ratio = Instance.new("UIAspectRatioConstraint")
ratio.AspectRatio = 16 / 9
ratio.Parent = frame`,
  body:`<p>Screens come in many shapes: wide PCs, very wide phones, squarer tablets. Something designed at 16:9 has to either <b>fit</b> inside (scale down until both sides fit, leaving bars), <b>fill</b> the screen (scale up until both sides are covered, cropping the overflow) or <b>stretch</b> (distort it).</p>
<p>Fit uses the smaller of the two scale factors, fill uses the larger. Switch screens and modes to see the bars and crops. <code>UIAspectRatioConstraint</code> applies the "keep this shape" rule to any frame.</p>`,
  uses:[`<b>Background art and loading screens</b> (fill).`,`<b>Maps, cards and inventories</b> that must not be cut off (fit).`,`<b>Square buttons</b> that stay square on every device.`],
  gotchas:[`Phones are often wider than 16:9 (around 2.2 : 1), so "fill" crops a lot of the top and bottom on them.`]
});

demo({
  id:'ui-worldtoscreen', title:'World to screen', short:'camera:WorldToViewportPoint', sig:'local pos, onScreen = camera:WorldToViewportPoint(worldPosition)',
  view:{theta:0.9, phi:1.0, r:30, ty:3, tz:3},
  params:[R('tx','Target X',-10,10,0.25,4), R('ty','Target Y',0,8,0.25,2), R('tz','Target Z',-10,8,0.25,-3)],
  setup(K){
    const CAM = V(0,7,14), cf = CF.lookAt(CAM, V(0,1,-2)), inv = CF.inv(cf), D = 3, fov = 70*D2R, hh = D*Math.tan(fov/2), ww = hh*16/9;
    const cam = new THREE.Group(); K.add(cam); cf.decompose(cam.position, cam.quaternion, V()); K.part(V(1.2,0.8,1),'--ink',{parent:cam});
    const cs = [V(-ww,hh,-D),V(ww,hh,-D),V(ww,-hh,-D),V(-ww,-hh,-D)]; K.line('--accent',{parent:cam, max:5}).set(cs.concat([cs[0]])); cs.forEach(c=>K.line('--muted',{parent:cam, opacity:0.4}).set(V(), c.clone().multiplyScalar(6)));
    const tg = K.part(V(1,1,1),'--vb',{front:false}), sp = K.point('--accent',0.16), ray = K.line('--accent',{dashed:true}), lab = K.label('','--accent','big');
    return {update(p){
      const T0 = V(p.tx,p.ty,p.tz); tg.position.copy(T0); const L = CF.pt(inv, T0), depth = -L.z;
      const nx = L.x/(depth*Math.tan(fov/2)*16/9), ny = L.y/(depth*Math.tan(fov/2)), on = depth > 0 && Math.abs(nx) <= 1 && Math.abs(ny) <= 1;
      const pxX = (nx+1)/2*1920, pxY = (1-ny)/2*1080;
      ray.set(CAM, T0); sp.visible = depth > 0; if (depth > 0) sp.position.copy(CF.pt(cf, V(nx*ww, ny*hh, -D)));
      lab.at(T0.clone().add(V(0,1.1,0))).text(on ? `(${Math.round(pxX)}, ${Math.round(pxY)})` : 'off screen').color(on ? '--accent' : '--bad');
      return {pxX, pxY, depth, on};
    }};
  },
  readout:(p,o)=>[['viewport point', `${Math.round(o.pxX)}, ${Math.round(o.pxY)} px`,'acc'],['depth (Z)', f(o.depth,2)],['onScreen', String(o.on), o.on ? 'ok' : 'bad']],
  code:(p,o)=>`local camera = workspace.CurrentCamera
local pos, onScreen = camera:WorldToViewportPoint(target.Position)
--> pos = (${Math.round(o.pxX)}, ${Math.round(o.pxY)}, ${f(o.depth,1)}), onScreen = ${o.on}
-- pos.X, pos.Y: pixels from the top-left · pos.Z: distance in front of the camera

if onScreen then
    marker.Visible = true
    marker.Position = UDim2.fromOffset(pos.X, pos.Y)   -- ScreenGui with IgnoreGuiInset = true
else
    marker.Visible = false                              -- or show an edge arrow (next topic)
end`,
  body:`<p>To put a 2D marker over a 3D object (a name tag, a quest icon, a damage number), you need its pixel position on screen. <code>WorldToViewportPoint</code> projects the point through the camera onto the screen (the orange rectangle) and also says whether it landed inside the view.</p>
<p>Points behind the camera have a negative depth and should be hidden, not drawn mirrored. Move the target behind the camera or off to the side and watch <code>onScreen</code> turn false.</p>`,
  uses:[`<b>Floating labels and quest markers</b> in a ScreenGui.`,`<b>Damage numbers</b> that pop at the hit position.`,`<b>Lock-on reticles</b> over targets.`],
  gotchas:[`<code>WorldToViewportPoint</code> ignores the top bar inset; <code>WorldToScreenPoint</code> includes it. Match it with your ScreenGui's <code>IgnoreGuiInset</code> setting.`,`BillboardGuis do this projection for you when you only need a label attached to a part.`]
});

demo({
  id:'ui-offscreen', title:'Off-screen arrows', short:'clamp the direction to the screen edge', sig:'scale = min(halfW / |dx|, halfH / |dy|);  arrow = centre + d × scale',
  view:{theta:0, phi:1.45, r:17, ty:5},
  params:[R('tx','Target X (px from centre)',-2500,2500,10,1700), R('ty','Target Y (px from centre)',-1500,1500,10,-900), R('margin','Edge margin',0,150,5,50,' px')],
  setup(K){ const scr = screen(K), arrow = K.arrow('--accent',{thick:0.07}), tgt = K.point('--vb',0.25), ln = K.line('--muted',{dashed:true}), cen = K.point('--ink',0.1); const lab = K.label('','--accent','big');
    return {update(p){
      const cx = 960, cy = 540, hw = 960 - p.margin, hh = 540 - p.margin, dx = p.tx, dy = p.ty;
      const inside = Math.abs(dx) <= 960 && Math.abs(dy) <= 540; const s = Math.min(hw/Math.max(1e-6,Math.abs(dx)), hh/Math.max(1e-6,Math.abs(dy)));
      const ex = cx + dx*Math.min(1,s), ey = cy + dy*Math.min(1,s), ang = Math.atan2(dy, dx);
      tgt.position.copy(scr.px(cx+dx, cy+dy, 0.3)); cen.position.copy(scr.px(cx,cy,0.2)); ln.set(scr.px(cx,cy,0.2), scr.px(cx+dx,cy+dy,0.2));
      arrow.visible = !inside; const E = scr.px(ex,ey,0.3), dirW = scr.px(cx+dx,cy+dy,0.3).sub(scr.px(cx,cy,0.3)).normalize();
      if (!inside) arrow.set(E.clone().addScaledVector(dirW,-1.2), dirW.multiplyScalar(1.2));
      lab.at(inside ? scr.px(cx+dx, cy+dy-80, 0.3) : E.clone().add(V(0,0.8,0))).text(inside ? 'on screen: no arrow' : `${f(ang/D2R,0)}°`);
      return {ex, ey, ang, inside};
    }};
  },
  readout:(p,o)=>[['arrow at', o.inside ? '-' : `${Math.round(o.ex)}, ${Math.round(o.ey)} px`,'acc'],['arrow Rotation', o.inside ? '-' : f(o.ang/D2R,0)+'°']],
  code:(p,o)=>`local MARGIN = ${p.margin}
local function edgeArrow(screenPos, viewportSize)
    local centre = viewportSize / 2
    local d = Vector2.new(screenPos.X, screenPos.Y) - centre
    local half = centre - Vector2.new(MARGIN, MARGIN)
    local scale = math.min(half.X / math.abs(d.X), half.Y / math.abs(d.Y))
    local edge = centre + d * math.min(1, scale)
    arrow.Position = UDim2.fromOffset(edge.X, edge.Y)
    arrow.Rotation = math.deg(math.atan2(d.Y, d.X))      -- image drawn pointing right
end

local pos, onScreen = camera:WorldToViewportPoint(objective.Position)
if pos.Z < 0 then pos = Vector3.new(-pos.X + camera.ViewportSize.X, -pos.Y + camera.ViewportSize.Y, pos.Z) end  -- behind: flip
arrow.Visible = not onScreen
if not onScreen then edgeArrow(pos, camera.ViewportSize) end`,
  body:`<p>When an objective is off screen, games show an arrow at the edge pointing toward it. Take the direction from the screen centre to the target's screen position, then shrink it just enough to touch the edge rectangle. Whichever side it hits first (left/right or top/bottom) decides the scale.</p>
<p><code>atan2</code> gives the rotation for the arrow image. Drag the target around outside the screen and watch the arrow slide along the edges, keeping the margin.</p>`,
  uses:[`<b>Objective and teammate indicators.</b>`,`<b>Incoming damage direction</b> markers.`,`<b>Pet or vehicle locators</b>.`],
  gotchas:[`For targets behind the camera, the projected point is mirrored. Flip it (as in the code) so the arrow points the right way.`]
});

demo({
  id:'ui-bars', title:'Health bars with a damage trail', short:'fill = hp / max', sig:'fill.Size = UDim2.fromScale(hp / maxHp, 1)   ·   trail lerps down after a delay', time:true,
  view:{theta:0, phi:1.45, r:15, ty:5},
  params:[R('dmg','Damage per hit',5,60,1,25), R('delay','Trail delay',0,1,0.05,0.4,' s'), R('speed','Trail speed',1,10,0.5,4)],
  setup(K){ const scr = screen(K), back = frame(K,'--part',0.5), trail = frame(K,'--y',0.95), fill = frame(K,'--accent',1), lab = K.label('','--ink','big');
    let hp = 100, shown = 100, lastHit = 0, last = 0;
    return {update(p,t){
      let dt = t - last; last = t; if (dt < 0 || dt > 0.25) dt = 0;
      const hit = Math.floor(t/1.6); if (hit !== lastHit){ lastHit = hit; hp = hp - p.dmg <= 0 ? 100 : hp - p.dmg; if (hp === 100) shown = 100; this._hitT = t; }
      if (t - (this._hitT||0) > p.delay) shown += (hp - shown)*(1 - Math.exp(-p.speed*dt)); if (shown < hp) shown = hp;
      const x = 360, y = 480, w = 1200, h = 90; back.place(scr, x, y, w, h, 0.04); trail.place(scr, x, y, w*shown/100, h, 0.06); fill.place(scr, x, y, w*hp/100, h, 0.08);
      fill.tint(hp > 50 ? '--ok' : hp > 25 ? '--accent' : '--bad'); lab.at(scr.px(960, y - 70, 0.1)).text(`${hp} / 100`);
      return {hp, shown};
    }};
  },
  readout:(p,o)=>[['health', `${o.hp} / 100`,'acc'],['trail showing', f(o.shown,1)]],
  code:(p)=>`local function setHealth(hp, maxHp)
    fill.Size = UDim2.fromScale(hp / maxHp, 1)            -- instant
    task.delay(${p.delay}, function()                           -- the trail waits, then catches up
        TweenService:Create(trail, TweenInfo.new(${f(1/p.speed*2,2)}), { Size = UDim2.fromScale(hp / maxHp, 1) }):Play()
    end)
end

humanoid.HealthChanged:Connect(function(hp) setHealth(hp, humanoid.MaxHealth) end)`,
  body:`<p>A health bar is just a frame whose width is <code>hp / maxHp</code> of its background, using scale so it fits any screen. Games add a <b>damage trail</b>: a second, lighter bar behind it that waits a moment, then shrinks to catch up. It shows how big each hit was.</p>
<p>The bar here takes a hit every 1.6 seconds. Change the trail delay and speed to tune the feel; a short pause then a quick drain reads clearly without being distracting.</p>`,
  uses:[`<b>Health, shield and stamina bars.</b>`,`<b>Boss bars</b> with big visible chunks.`,`<b>Progress bars</b> for loading or capturing.`],
  gotchas:[`Clamp the fraction to 0–1; health can briefly go negative or above max.`,`Put the trail behind the fill (lower ZIndex) so it shows only where health was lost.`]
});

demo({
  id:'ui-radial', title:'Radial cooldowns', short:'angle = remaining × 360°', sig:'remaining = math.clamp((readyAt − now) / cooldown, 0, 1)', time:true,
  view:{theta:0, phi:1.45, r:14, ty:4.5},
  params:[R('cd','Cooldown',1,8,0.5,4,' s')],
  setup(K){
    const btn = K.add(new THREE.Mesh(new THREE.CircleGeometry(2.6,64), K.mat('--va',{basic:true}))); btn.position.set(0,4.5,0);
    const pie = K.add(new THREE.Mesh(new THREE.BufferGeometry(), K.mat('--ink',{opacity:0.6, basic:true}))); pie.position.set(0,4.5,0.02);
    const lab = K.label('','--ink','big'); lab.el.style.fontSize = '20px'; let key = '';
    return {update(p,t){
      const per = p.cd + 1.5, since = t % per, rem = clamp(1 - since/p.cd, 0, 1), L = rem*Math.PI*2, k = rem.toFixed(3);
      if (k !== key){ key = k; pie.geometry.dispose(); pie.geometry = new THREE.CircleGeometry(2.6, 64, Math.PI/2 - L, Math.max(L, 1e-4)); }
      pie.visible = rem > 0; lab.at(V(0,4.5,0.1)).text(rem > 0 ? f(rem*p.cd,1) : 'READY');
      return {rem};
    }};
  },
  readout:(p,o)=>[['remaining', f(o.rem*100,0)+'%','acc'],['angle covered', f(o.rem*360,0)+'°']],
  code:(p)=>`local COOLDOWN = ${p.cd}
local readyAt = 0

local function use()
    if os.clock() < readyAt then return end
    readyAt = os.clock() + COOLDOWN
    castAbility()
end

RunService.RenderStepped:Connect(function()
    local remaining = math.clamp((readyAt - os.clock()) / COOLDOWN, 0, 1)
    -- a UIGradient with a sharp transparency step, rotated by the remaining angle,
    -- is a common way to draw the pie on an image
    shade.UIGradient.Rotation = 90 + remaining * 360
    timerLabel.Text = remaining > 0 and string.format("%.1f", remaining * COOLDOWN) or ""
end)`,
  body:`<p>Cooldown buttons show the remaining time as a shrinking pie. Store when the ability will be ready, and each frame work out the remaining fraction: time left divided by the full cooldown, clamped to 0–1. Multiply by 360° for the size of the dark wedge.</p>
<p>Storing a "ready at" time instead of counting down a number avoids drift and makes it easy to check on the server too. Drawing the pie usually uses an image with a UIGradient, or two half-circle images rotated.</p>`,
  uses:[`<b>Ability and item cooldowns.</b>`,`<b>Capture-point and reload timers.</b>`,`<b>Hold-to-interact rings</b> (fill instead of empty).`],
  gotchas:[`Always check the cooldown on the server too; the client's timer is only a display.`]
});

demo({
  id:'ui-layout', title:'Rows, columns and grids', short:'col = (i − 1) % cols', sig:'col = (i − 1) % COLS,  row = (i − 1) // COLS',
  view:{theta:0, phi:1.45, r:17, ty:5},
  params:[R('n','Items',1,24,1,11), R('cols','Columns',1,8,1,4), R('pad','Padding',0,40,2,12,' px'), T('center','Centre the last row',true)],
  setup(K){ const scr = screen(K), box = frame(K,'--part',0.35), items = Array.from({length:24}, ()=>frame(K,'--accent',0.95)), labs = labels(K,24,'--ink','tiny');
    return {update(p){
      const X0 = 260, Y0 = 120, Wc = 1400, cw = (Wc - p.pad*(p.cols+1))/p.cols, ch = 140, rows = Math.ceil(p.n/p.cols); box.place(scr, X0, Y0, Wc, rows*(ch+p.pad)+p.pad, 0.03); labs.begin();
      items.forEach((it,i)=>{ it.visible = i < p.n; if (i >= p.n) return; const col = i % p.cols, row = Math.floor(i/p.cols), inRow = row === rows-1 ? p.n - row*p.cols : p.cols;
        const shift = p.center ? (p.cols - inRow)*(cw + p.pad)/2 : 0, x = X0 + p.pad + col*(cw+p.pad) + shift, y = Y0 + p.pad + row*(ch+p.pad);
        it.place(scr, x, y, cw, ch, 0.06); labs.add(String(i+1), scr.px(x+cw/2, y+ch/2, 0.2)); });
      labs.end(); return {rows, cw};
    }};
  },
  readout:(p,o)=>[['rows', String(o.rows)],['cell width', Math.round(o.cw)+' px','acc']],
  code:(p,o)=>`local COLS, PADDING = ${p.cols}, ${p.pad}
local cellW = (container.AbsoluteSize.X - PADDING * (COLS + 1)) / COLS

for i, item in items do
    local col = (i - 1) % COLS
    local row = (i - 1) // COLS
    item.Size = UDim2.fromOffset(cellW, 140)
    item.Position = UDim2.fromOffset(PADDING + col * (cellW + PADDING), PADDING + row * (140 + PADDING))
end
-- or let Roblox do it: UIGridLayout with CellSize and CellPadding`,
  body:`<p>Laying items out in a grid is the 1D-list trick from Grids & tiles in reverse: the item number gives the column with <code>%</code> and the row with <code>//</code>. Multiply by the cell size plus padding to get each position.</p>
<p>Centring the last, partly filled row is a nice touch: shift it by half the empty space. Roblox's <code>UIGridLayout</code> and <code>UIListLayout</code> handle most of this, but doing it yourself lets you animate items into place.</p>`,
  uses:[`<b>Inventories and shops.</b>`,`<b>Level select screens.</b>`,`<b>Laying out 3D items</b> on shelves the same way.`],
  gotchas:[`Recalculate when the screen size changes (listen to <code>AbsoluteSize</code>).`]
});

demo({
  id:'ui-drag', title:'Dragging with the mouse', short:'start + (mouse − mouseStart)', sig:'newPos = startPos + (mouse − mouseAtStart), then clamp inside the parent',
  view:{theta:0, phi:1.45, r:15, ty:5},
  params:[R('dx','Mouse moved X',-1600,1600,10,900,' px'), R('dy','Mouse moved Y',-900,900,10,250,' px'), T('clamp','Keep inside the screen',true)],
  setup(K){ const scr = screen(K), ghost = frame(K,'--part',0.4), fr = frame(K,'--accent',0.95), arr = K.arrow('--vb',{thick:0.05});
    return {update(p){
      const w = 420, h = 260, sx = 300, sy = 250; let x = sx + p.dx, y = sy + p.dy;
      if (p.clamp){ x = clamp(x, 0, 1920 - w); y = clamp(y, 0, 1080 - h); }
      ghost.place(scr, sx, sy, w, h, 0.04); fr.place(scr, x, y, w, h, 0.07);
      const a = scr.px(sx + w/2, sy + h/2, 0.2), b = scr.px(sx + w/2 + p.dx, sy + h/2 + p.dy, 0.2); arr.set(a, b.sub(a));
      return {x, y};
    }};
  },
  readout:(p,o)=>[['frame now at', `${Math.round(o.x)}, ${Math.round(o.y)} px`,'acc']],
  code:(p)=>`local dragging, mouseStart, frameStart = false, nil, nil

frame.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
        dragging, mouseStart, frameStart = true, input.Position, frame.AbsolutePosition
    end
end)

UserInputService.InputChanged:Connect(function(input)
    if not dragging then return end
    if input.UserInputType ~= Enum.UserInputType.MouseMovement and input.UserInputType ~= Enum.UserInputType.Touch then return end
    local delta = input.Position - mouseStart
    local parentSize = frame.Parent.AbsoluteSize
    local x = ${p.clamp ? 'math.clamp(frameStart.X + delta.X, 0, parentSize.X - frame.AbsoluteSize.X)' : 'frameStart.X + delta.X'}
    local y = ${p.clamp ? 'math.clamp(frameStart.Y + delta.Y, 0, parentSize.Y - frame.AbsoluteSize.Y)' : 'frameStart.Y + delta.Y'}
    frame.Position = UDim2.fromOffset(x, y)
end)

UserInputService.InputEnded:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then dragging = false end
end)`,
  body:`<p>Dragging doesn't move the frame to the mouse; it moves the frame by <b>how far the mouse has moved</b> since the drag started. Remember both start positions, add the difference, and the frame keeps the same grip point under the cursor.</p>
<p>Clamping keeps it fully on screen: the left edge can't go below 0, and the right edge can't pass the parent's width. Untick the clamp and push it off the edge to see why it matters.</p>`,
  uses:[`<b>Movable windows</b>, inventories and chat boxes.`,`<b>Drag-and-drop items</b> between slots.`,`<b>Sliders</b>: clamp to the track and turn the position into a value.`],
  gotchas:[`Handle Touch as well as Mouse so it works on phones.`,`If the frame has an AnchorPoint, work with <code>AbsolutePosition</code> (top-left) as in the code, or include the anchor offset.`]
});

Lab.finder([
  ['Make UI the same size on phones and PCs','UDim2 scale','ui-udim'],
  ['Centre a frame on the screen','AnchorPoint (0.5, 0.5)','ui-anchor'],
  ['Stop images stretching on different screens','fit / fill, UIAspectRatioConstraint','ui-aspect'],
  ['Put a 2D marker over a 3D object','camera:WorldToViewportPoint','ui-worldtoscreen'],
  ['Show an arrow toward an off-screen objective','clamp to the screen edge','ui-offscreen'],
  ['Make a health bar with a damage trail','fill = hp / max + delayed trail','ui-bars'],
  ['Show an ability cooldown as a pie','remaining × 360°','ui-radial'],
  ['Lay out inventory slots in a grid','col = (i−1) % cols','ui-layout'],
  ['Make a draggable window','start + mouse delta, clamped','ui-drag'],
]);
})();
