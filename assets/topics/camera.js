(function(){
"use strict";
const {THREE, V, UP, D2R, f, vs, R, S, T, clamp} = Lab;
const demo = Lab.subject({
  id:'camera', title:'Camera maths', glyph:'camera',
  blurb:'Orbit cameras from yaw and pitch, field of view and zoom, and keeping the camera out of walls.'
});

/* A camera body and its view pyramid, pointed from `pos` at `focus`. */
function cameraRig(K, color='--accent'){
  const body = K.part(V(1.1, 0.75, 1.3), '--part');
  const lens = K.point(color, 0.22);
  const edges = [0, 1, 2, 3].map(()=>K.line(color, {opacity:0.7}));
  const rect = K.line(color, {max:5, opacity:0.7});
  const fwd = V(), right = V(), up = V(), c = V();
  return {
    body,
    aim(pos, focus, fovDeg, aspect=16/9, reach){
      body.position.copy(pos); body.lookAt(focus);
      fwd.copy(focus).sub(pos); const dist = reach ?? fwd.length(); fwd.normalize();
      right.crossVectors(fwd, UP).normalize(); up.crossVectors(right, fwd);
      lens.position.copy(pos).addScaledVector(fwd, 0.7);
      const h = dist*Math.tan(fovDeg*D2R/2), w = h*aspect;
      c.copy(pos).addScaledVector(fwd, dist);
      const pts = [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>c.clone().addScaledVector(right, a*w).addScaledVector(up, b*h));
      pts.forEach((p,i)=>edges[i].set(pos, p)); rect.set([...pts, pts[0]]);
      return h;
    }
  };
}
const YXZ = new THREE.Euler(0, 0, 0, 'YXZ');
const orbitOffset = (pitch, yaw, dist)=>{ YXZ.set(pitch*D2R, yaw*D2R, 0); return V(0, 0, dist).applyEuler(YXZ); };

demo({
  id:'cam-orbit', title:'Orbit cameras: yaw, pitch, distance', short:'focus + rotation × back', sig:'camera = CFrame.new(focus) * CFrame.fromEulerAnglesYXZ(pitch, yaw, 0) * CFrame.new(0, 0, distance)',
  view:{theta:0.9, phi:1.0, r:30, ty:2},
  params:[R('yaw','Yaw (turn around)',-180,180,1,35,'°'), R('pitch','Pitch (look up / down)',-80,30,1,-25,'°'), R('dist','Distance',4,20,0.5,12)],
  setup(K){
    const focus = V(0, 2, 0);
    const hero = K.part(V(2, 4, 1), '--va'); hero.position.set(0, 2, 0);
    K.point('--ink', 0.18).position.copy(focus);
    const rig = cameraRig(K), arm = K.line('--muted', {dashed:true}), ring = K.line('--muted', {max:97, dashed:true, opacity:0.6});
    const drop = K.line('--muted', {dashed:true, opacity:0.5}), camL = K.label('camera', '--accent-ink', 'big'), focusL = K.label('focus', '--muted').at(V(0, 4.6, 0));
    return {update(p){
      const off = orbitOffset(p.pitch, p.yaw, p.dist), pos = focus.clone().add(off);
      rig.aim(pos, focus, 50, 16/9, Math.min(p.dist, 6));
      arm.set(focus, pos); drop.set(pos, V(pos.x, 0, pos.z));
      const flat = Math.hypot(off.x, off.z), pts = []; for (let i=0;i<=96;i++){ const a = i/96*Math.PI*2; pts.push(V(Math.sin(a)*flat, pos.y, Math.cos(a)*flat)); }
      ring.set(pts); camL.at(pos.clone().add(V(0, 1.2, 0)));
      return {pos, off};
    }};
  },
  readout:(p,o)=>[['camera position', vs(o.pos),'acc'],['offset from focus', vs(o.off)],['height above focus', f(o.off.y)]],
  code:(p)=>`local yaw, pitch = math.rad(${p.yaw}), math.rad(${p.pitch})
local DISTANCE = ${p.dist}

local function OrbitCFrame(focus: Vector3): CFrame
    -- turn around Y (yaw), tilt around X (pitch), then step back along the camera's own Z
    return CFrame.new(focus)
        * CFrame.fromEulerAnglesYXZ(pitch, yaw, 0)
        * CFrame.new(0, 0, DISTANCE)
end

-- dragging the mouse changes the two angles; pitch is clamped so it never flips over
userInputService.InputChanged:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseMovement then
        yaw -= input.Delta.X * 0.008
        pitch = math.clamp(pitch - input.Delta.Y * 0.008, math.rad(-80), math.rad(30))
    end
end)

camera.CFrame = OrbitCFrame(root.Position + Vector3.new(0, 2, 0))`,
  body:`<p>Most third-person cameras are just two angles and a distance. <b>Yaw</b> turns the camera around the player, <b>pitch</b> tilts it up or down, and the camera then steps <b>back</b> from the focus point along its own Z axis.</p>
<p>Written as CFrames that is <code>focus * rotation * back</code>, read left to right: stand at the focus, turn to face the right way, then walk backwards. Because the camera ends up looking along its own −Z, it automatically faces the focus.</p>
<p>Drag the sliders: yaw slides the camera around the dashed ring, pitch raises or lowers that ring, and distance changes its size.</p>`,
  uses:[`<b>Custom third-person cameras</b> with your own sensitivity and limits.`,
        `<b>Showcase and shop cameras</b> that slowly orbit an item (<code>yaw = os.clock() * 0.3</code>).`,
        `<b>Spectator cameras</b> that orbit whoever you are watching.`],
  gotchas:[`Clamp pitch to stay short of ±90°. At straight up or down, yaw stops making sense and the camera flips.`,
           `Use <code>fromEulerAnglesYXZ</code>, not <code>CFrame.Angles</code>. Angles applies X first, which tilts the yaw circle sideways.`,
           `Set <code>camera.CameraType = Enum.CameraType.Scriptable</code> first, or the default camera script overwrites yours every frame.`]
});

demo({
  id:'cam-fov', title:'Field of view and zoom', short:'visible height = 2·d·tan(fov / 2)', sig:'screen share = objectHeight / (2 * distance * math.tan(math.rad(fov) / 2))',
  view:{theta:1.25, phi:1.15, r:34, ty:2, tz:-6},
  params:[R('fov','FieldOfView',20,110,1,70,'°'), R('dist','Distance to target',4,30,0.5,14), T('dolly','Dolly zoom (keep the target the same size)',false), R('share','Target height on screen',0.1,0.9,0.01,0.4)],
  setup(K){
    const target = K.part(V(2, 4, 1), '--va'); target.position.set(0, 2, 0);
    const back = []; for (let i=0;i<5;i++){ const b = K.part(V(1.5, 3 + (i%3), 1.5), '--part', {front:false}); b.position.set(-8 + i*4, 1.5 + (i%3)/2, -12); back.push(b); }
    const rig = cameraRig(K), hL = K.label('', '--accent-ink', 'big'), share = K.line('--va', {max:2});
    return {update(p){
      const d = p.dolly ? 4/(2*Math.tan(p.fov*D2R/2)*p.share) : p.dist;
      const pos = V(0, 2, d);
      const h = rig.aim(pos, V(0, 2, 0), p.fov, 16/9);
      share.set(V(2.2, 0, 0), V(2.2, 4, 0));
      hL.at(V(0, 2 + h + 0.6, 0)).text(`view is ${f(h*2,1)} studs tall here`);
      return {d, visible:h*2, share:4/(h*2)};
    }};
  },
  readout:(p,o)=>[['distance', f(o.d,1)+' studs','acc'],['visible height at target', f(o.visible,1)+' studs'],['target fills', f(Math.min(1,o.share)*100,0)+'% of the screen height']],
  code:(p,o)=>`camera.FieldOfView = ${p.fov}   -- vertical angle, in degrees

-- how tall a slice of the world the camera sees at some distance
local function VisibleHeight(distance: number): number
    return 2 * distance * math.tan(math.rad(camera.FieldOfView) / 2)
end

print(VisibleHeight(${f(o.d,1)}))   --> ${f(o.visible,2)} studs
print(4 / VisibleHeight(${f(o.d,1)}))   --> ${f(o.share,2)}  (a 4 stud tall character fills this much)

-- the reverse: how far away to stand so something fills a share of the screen
local function DistanceToFill(height: number, share: number): number
    return height / (2 * math.tan(math.rad(camera.FieldOfView) / 2) * share)
end`,
  body:`<p><code>Camera.FieldOfView</code> is the <b>vertical</b> angle the camera sees, top edge to bottom edge. Roblox uses 70° by default.</p>
<p>Split the view pyramid down the middle and you get a right-angled triangle, so the height of the view at distance <i>d</i> is <code>2 · d · tan(fov / 2)</code>. Divide something's height by that and you know how much of the screen it fills.</p>
<p>A small FOV is a telephoto lens: it zooms in and flattens depth. A large FOV is wide-angle and makes speed feel faster. Turn on <b>Dolly zoom</b>: the camera moves to keep the target the same size while the background stretches or squashes.</p>`,
  uses:[`<b>Scopes and aiming</b>: lower the FOV instead of moving the camera.`,
        `<b>Speed effects</b>: widen the FOV a little as a car or player speeds up.`,
        `<b>Framing</b>: place a showcase camera so an item fills exactly half the screen.`,
        `<b>Dolly zoom</b> for dramatic reveals in cutscenes.`],
  gotchas:[`FieldOfView is vertical. Wide screens see more to the sides, so the horizontal angle is larger than the number you set.`,
           `Divide by tan of <b>half</b> the angle, and convert with <code>math.rad</code> first.`,
           `Very high FOVs (over 100) distort the edges of the screen and can make players feel sick.`]
});

demo({
  id:'cam-collide', title:'Keeping the camera out of walls', short:'raycast from focus to camera', sig:'hit = workspace:Raycast(focus, direction * distance)   →   distance = hit.Distance − padding',
  view:{theta:1.5, phi:0.95, r:32, ty:2, tz:5},
  params:[R('yaw','Camera angle',-60,60,1,20,'°'), R('want','Wanted distance',4,16,0.5,12), R('wall','Wall distance behind',2,14,0.5,6), R('pad','Padding',0,1.5,0.05,0.4)],
  setup(K){
    const focus = V(0, 3, 0);
    const hero = K.part(V(2, 4, 1), '--va'); hero.position.set(0, 2, 0);
    const wall = K.part(V(14, 7, 1), '--part', {front:false});
    const ghost = K.part(V(1.1, 0.75, 1.3), '--muted', {opacity:0.25, edges:false});
    const rig = cameraRig(K), ray = K.line('--bad', {dashed:true}), hit = K.point('--bad', 0.2), safe = K.line('--ok');
    const ghostL = K.label('wanted', '--muted'), camL = K.label('camera', '--accent-ink', 'big');
    return {update(p){
      wall.position.set(0, 3.5, p.wall + 0.5);
      const dir = orbitOffset(-15, p.yaw, 1).normalize(), want = focus.clone().addScaledVector(dir, p.want);
      // ray against the wall's near face (z = wall), only where the wall actually is
      let dist = p.want, blocked = false;
      if (dir.z > 1e-4){ const t = (p.wall - focus.z)/dir.z, x = focus.x + dir.x*t, y = focus.y + dir.y*t;
        if (t < p.want && Math.abs(x) < 7 && y > 0 && y < 7){ dist = Math.max(0.5, t - p.pad); blocked = true; hit.position.set(x, y, p.wall); } }
      hit.visible = blocked;
      const pos = focus.clone().addScaledVector(dir, dist);
      ghost.position.copy(want); ghost.lookAt(focus); ghost.visible = blocked;
      ghostL.show(blocked).at(want.clone().add(V(0, 1, 0)));
      ray.set(focus, want); safe.set(focus, pos);
      rig.aim(pos, focus, 50, 16/9, Math.min(dist, 3)); camL.at(pos.clone().add(V(0, 1.1, 0)));
      return {dist, blocked};
    }};
  },
  readout:(p,o)=>[['camera distance', f(o.dist,2)+' studs','acc'],['blocked by wall', o.blocked ? 'yes, pulled in' : 'no', o.blocked ? 'bad' : 'ok']],
  code:(p)=>`local WANTED, PADDING = ${p.want}, ${p.pad}

local rayParams = RaycastParams.new()
rayParams.FilterDescendantsInstances = { player.Character }   -- never hit yourself

local function SafeCameraCFrame(focus: Vector3, rotation: CFrame): CFrame
    local direction = rotation:VectorToWorldSpace(Vector3.zAxis)   -- straight back from the focus
    local result = workspace:Raycast(focus, direction * WANTED, rayParams)
    local distance = result and math.max(0.5, result.Distance - PADDING) or WANTED
    return CFrame.new(focus) * rotation * CFrame.new(0, 0, distance)
end`,
  body:`<p>An orbit camera happily sinks into walls. The fix is one raycast: shoot a ray from the <b>focus</b> (the player's head) towards where the camera <i>wants</i> to be. If it hits something first, put the camera at the hit point instead.</p>
<p>Pull it in a little further than the hit, the <b>padding</b>, or the camera's near plane still clips into the wall and you see through it. Raise the wall distance and the ray stops hitting: the camera goes back to its full distance.</p>`,
  uses:[`<b>Any custom third-person camera</b> in a game with buildings or caves.`,
        `<b>Over-the-shoulder aiming</b>, where the camera sits close to walls a lot.`,
        `<b>Smooth it</b>: snap in instantly when blocked, ease back out slowly when clear.`],
  gotchas:[`Cast from the focus to the camera, not the other way round. Starting inside a wall makes the ray miss it.`,
           `Filter out the player's own character, and usually glass and invisible parts too.`,
           `One thin ray can slip through gaps. For a solid feel use <code>workspace:Spherecast</code> with a small radius.`]
});

Lab.finder([
  ['Make my own third-person orbit camera','focus * fromEulerAnglesYXZ(pitch, yaw, 0) * back','cam-orbit'],
  ['Zoom in for a scope','camera.FieldOfView','cam-fov'],
  ['Frame an item so it fills the screen','height / (2 * tan(fov / 2) * share)','cam-fov'],
  ['Stop the camera going through walls','raycast from focus to camera','cam-collide'],
]);
Lab.ref('camera','Camera',[
  ['camera.CFrame','Where the camera is and where it looks','CFrame.lookAt(pos, focus)','Every custom camera'],
  ['camera.CameraType','Who controls the camera','Enum.CameraType.Scriptable','Taking control from the default script'],
  ['camera.FieldOfView','Vertical view angle (degrees)','camera.FieldOfView = 40','Scopes, speed effects'],
  ['camera.Focus','Where the camera "cares about"','camera.Focus = CFrame.new(pos)','Streaming and audio around the focus'],
  ['camera.ViewportSize','Screen size in pixels','camera.ViewportSize.X','Aspect ratio, UI maths'],
  ['fromEulerAnglesYXZ(p, y, 0)','Yaw then pitch rotation','fromEulerAnglesYXZ(pitch, yaw, 0)','Orbit and first-person cameras'],
  ['2 * d * math.tan(fov / 2)','Visible height at distance d','2 * 10 * math.tan(math.rad(35))','Framing and zoom'],
  ['RunService:BindToRenderStep','Run code right before the frame draws','BindToRenderStep("Cam", prio, fn)','Camera updates without jitter'],
]);
})();
