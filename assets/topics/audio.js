(function(){
"use strict";
const {THREE, V, f, R, S, T, clamp} = Lab;
const {graph, inst} = Lab.kit2;
const demo = Lab.subject({
  id:'audio', title:'Sound & audio maths', glyph:'sound',
  blurb:'Pitch in semitones, how volume falls off with distance, and decibels for volume sliders that feel right.'
});
const NOTE = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const BLACK = new Set([1,3,6,8,10]);

demo({
  id:'au-pitch', title:'Pitch: semitones and PlaybackSpeed', short:'speed = 2^(semitones / 12)', sig:'sound.PlaybackSpeed = 2 ^ (semitones / 12)   ·   +12 semitones = one octave = double speed',
  view:{theta:0, phi:0.95, r:26, ty:0, tz:2},
  params:[R('st','Semitones from the original',-12,12,1,7), T('wave','Show the sound wave',true)],
  setup(K){
    const keys = inst(K, 25), tmp = V(), sc = V(), wave = K.line('--accent', {max:241}), base = K.line('--muted', {max:241, dashed:true, opacity:0.6});
    const keyL = K.label('', '--accent-ink', 'big'), zeroL = K.label('original', '--muted').at(V(0, -0.2, 2.6));
    const kx = i=>(i - 12)*0.8;
    return {update(p,t){
      keys.begin();
      for (let i=0;i<25;i++){ const st = i - 12, black = BLACK.has(((st % 12) + 12) % 12), on = st === p.st, zero = st === 0;
        const h = on ? 1.2 : 0.5;
        keys.add(tmp.set(kx(i), h/2 + (black ? 0.3 : 0), black ? -0.6 : 0), sc.set(0.7, h, black ? 2.2 : 3.4), on ? '--accent' : zero ? '--va' : black ? '--muted' : '--part'); }
      keys.end();
      const speed = Math.pow(2, p.st/12);
      keyL.at(V(kx(p.st + 12), 2.2, 0)).text(`${NOTE[((p.st % 12) + 12) % 12]} · ×${f(speed,3)}`);
      wave.visible = base.visible = p.wave;
      if (p.wave){ const pts = [], bp = [];
        for (let i=0;i<=240;i++){ const x = -10 + i/240*20; pts.push(V(x, 5 + Math.sin(x*1.6*speed - t*4)*1.1, -3)); bp.push(V(x, 5 + Math.sin(x*1.6 - t*4)*1.1, -3.2)); }
        wave.set(pts); base.set(bp); }
      return {speed};
    }};
  },
  time:true,
  readout:(p,o)=>[['PlaybackSpeed', f(o.speed,4),'acc'],['note (from C)', NOTE[((p.st % 12) + 12) % 12]],['A4 440 Hz becomes', f(440*o.speed,1)+' Hz'],['sound length', f(100/o.speed,1)+'%']],
  code:(p,o)=>`local function SemitonesToSpeed(semitones: number): number
    return 2 ^ (semitones / 12)    -- 12 semitones = one octave = twice as fast
end

sound.PlaybackSpeed = SemitonesToSpeed(${p.st})   --> ${f(o.speed,4)}

-- a little random pitch on every hit so repeats don't sound robotic
local hit = sound:Clone()
hit.PlaybackSpeed = SemitonesToSpeed(math.random(-2, 2))
hit.Parent = part
hit:Play()`,
  body:`<p>Our ears hear pitch by <b>ratio</b>, not by difference. Doubling the speed of a sound always sounds one <b>octave</b> higher, whether it starts low or high. Music splits the octave into 12 equal steps called <b>semitones</b>, so each step multiplies the speed by the twelfth root of 2 (about 1.0595).</p>
<p><code>PlaybackSpeed</code> changes pitch and length together: at speed 2 the sound is an octave up and lasts half as long. The orange wave squeezes up as you raise the pitch; the dashed wave is the original.</p>`,
  uses:[`<b>Random pitch on repeated sounds</b> (footsteps, hits, coins): ±1 or 2 semitones.`,
        `<b>Musical pickups</b> that climb a scale as you collect them in a row.`,
        `<b>Engine sounds</b>: map RPM to PlaybackSpeed.`],
  gotchas:[`Adding 0.1 to PlaybackSpeed is a big jump for low sounds and a small one for high sounds. Work in semitones and convert.`,
           `PlaybackSpeed also changes the sound's length. To change pitch only, use a <code>PitchShiftSoundEffect</code>.`]
});

const ROLL = {
  Inverse:(d,mn,mx)=>d <= mn ? 1 : d >= mx ? 0 : mn/d,
  Linear:(d,mn,mx)=>d <= mn ? 1 : d >= mx ? 0 : 1 - (d - mn)/(mx - mn),
  LinearSquare:(d,mn,mx)=>{ const l = d <= mn ? 1 : d >= mx ? 0 : 1 - (d - mn)/(mx - mn); return l*l; },
};
demo({
  id:'au-rolloff', title:'Volume over distance', short:'RollOffMode, Min and Max', sig:'Inverse: min / distance   ·   Linear: 1 − (d − min) / (max − min)   ·   silent past RollOffMaxDistance',
  view:{theta:0, phi:0.98, r:40, ty:0, tz:9}, env:'grid',
  params:[S('mode','RollOffMode',[['Inverse','Inverse (realistic)'],['Linear','Linear'],['LinearSquare','LinearSquare']],'Inverse'), R('mn','RollOffMinDistance',1,20,0.5,5), R('mx','RollOffMaxDistance',20,150,1,80), R('d','Listener distance',0,150,0.5,20)],
  setup(K){
    const gr = graph(K, {x0:-10, y0:0.5, w:20, h:6, z:-2, xr:[0,150], yr:[0,1], xLabel:'distance →', xTicks:[[0,'0'],[50,'50'],[100,'100'],[150,'150']], yTicks:[[0,'0'],[1,'1']]});
    const curves = Object.keys(ROLL).map(k=>[k, gr.curve('--muted', 300, {opacity:0.4})]), main = gr.curve('--accent', 300);
    const dot = gr.dot('--accent', 0.25), mnL = gr.vline(5, '--va'), mxL = gr.vline(80, '--bad');
    const speaker = K.part(V(1.2, 1.6, 1.2), '--va'); const ear = K.point('--accent', 0.35), lab = K.label('', '--accent-ink', 'big');
    /* rings on the ground around the speaker, at the same scale as the graph's distance axis */
    const SX = -10, SZ = 4, SCALE = 20/150;
    const ringLine = (color, opts)=>K.line(color, Object.assign({max:97}, opts));
    const setRing = (ln, studs, y=0.04)=>{ const r = Math.max(0.01, studs*SCALE), pts = [];
      for (let i=0;i<=96;i++){ const a = i/96*Math.PI*2; pts.push(V(SX + Math.cos(a)*r, y, SZ + Math.sin(a)*r)); } return ln.set(pts); };
    const fullDisc = K.disc('--va', 0.18), mnRing = ringLine('--va'), mxRing = ringLine('--bad', {dashed:true});
    const LEVELS = [0.75, 0.5, 0.25, 0.1], levelRings = LEVELS.map(()=>ringLine('--accent', {opacity:0.35}));
    const levelTags = LEVELS.map(lv=>K.label('×' + lv, '--muted', 'tiny')), earRing = ringLine('--accent', {dashed:true, opacity:0.8});
    const mnTag = K.label('min', '--va', 'tiny'), mxTag = K.label('max', '--bad', 'tiny');
    return {update(p){
      const mx = Math.max(p.mx, p.mn + 1);
      curves.forEach(([k, c])=>{ c.visible = k !== p.mode; c.plot(d=>ROLL[k](d, p.mn, mx), 0, 150); });
      main.plot(d=>ROLL[p.mode](d, p.mn, mx), 0, 150);
      const v = ROLL[p.mode](p.d, p.mn, mx); dot.at(p.d, v); mnL.at(p.mn); mxL.at(mx);
      speaker.position.set(SX, 0.8, SZ); ear.position.set(SX + p.d*SCALE, 0.6, SZ);
      lab.at(V(SX + p.d*SCALE, 1.7, SZ)).text(`volume ×${f(v,2)}`);
      // full volume inside min, silent outside max, and contour rings where the volume drops to each level
      fullDisc.position.set(SX, 0.02, SZ); fullDisc.scale.setScalar(Math.max(0.01, p.mn*SCALE));
      setRing(mnRing, p.mn); setRing(mxRing, mx); setRing(earRing, p.d, 0.06);
      mnTag.at(V(SX, 0.1, SZ - p.mn*SCALE - 0.3)); mxTag.at(V(SX, 0.1, SZ - mx*SCALE - 0.3));
      LEVELS.forEach((lv, i)=>{ let d = p.mn; while (d < mx && ROLL[p.mode](d, p.mn, mx) > lv) d += 0.25;
        const show = d < mx - 0.25; levelRings[i].visible = show; levelTags[i].show(show && d*SCALE > 1.6);
        if (show){ setRing(levelRings[i], d, 0.03); levelTags[i].at(V(SX + d*SCALE*0.7071, 0.1, SZ + d*SCALE*0.7071)); } });
      return {v};
    }};
  },
  readout:(p,o)=>[['volume at '+p.d+' studs', f(o.v,3),'acc'],['full volume within', p.mn+' studs'],['silent beyond', Math.max(p.mx, p.mn+1)+' studs']],
  code:(p,o)=>`local sound = Instance.new("Sound")
sound.SoundId = "rbxassetid://..."
sound.RollOffMode = Enum.RollOffMode.${p.mode}
sound.RollOffMinDistance = ${p.mn}    -- full volume inside this
sound.RollOffMaxDistance = ${p.mx}    -- silent beyond this
sound.Parent = speakerPart           -- a Sound inside a part plays from that spot

-- what the listener ${p.d} studs away hears (×${f(o.v,3)} of Volume)`,
  body:`<p>A <code>Sound</code> inside a part plays <b>from that part</b>, and gets quieter as the listener moves away. Inside <code>RollOffMinDistance</code> it's at full volume; past <code>RollOffMaxDistance</code> it's silent.</p>
<p>In between, <code>RollOffMode</code> picks the shape. <b>Inverse</b> is how sound works in real life: double the distance, half the volume. It drops fast and then has a long quiet tail. <b>Linear</b> fades evenly, and <b>LinearSquare</b> stays loud longer and then drops away. The faint lines are the other two modes for comparison.</p>`,
  uses:[`<b>Ambient sounds</b> (waterfalls, machines) with Inverse so they feel real.`,
        `<b>Gameplay cues</b> like footsteps with Linear so players can judge distance.`,
        `<b>Big events</b> (explosions) with a large Min distance so everyone nearby hears them loudly.`],
  gotchas:[`Sounds parented to a part are positional; sounds in <code>SoundService</code> or the player GUI are not.`,
           `With Inverse, Min distance matters most. A Min of 1 gets quiet very quickly.`,
           `The listener is the camera by default, not the character.`]
});

demo({
  id:'au-db', title:'Decibels and volume sliders', short:'dB = 20 · log₁₀(volume)', sig:'decibels = 20 * math.log10(volume)   ·   volume = 10 ^ (decibels / 20)',
  view:{theta:0, phi:1.25, r:24, ty:4},
  params:[R('s','Slider position',0,1,0.01,0.5), R('range','Slider range',20,60,1,40,' dB'), T('log','Decibel slider (instead of linear)',true)],
  setup(K){
    const gr = graph(K, {x0:-9, y0:0.5, w:18, h:7, z:0, xr:[0,1], yr:[0,1], xLabel:'slider →', yLabel:'volume', xTicks:[[0,'0'],[0.5,'½'],[1,'1']], yTicks:[[0,'0'],[1,'1']]});
    const lin = gr.curve('--muted', 120, {dashed:true}), lg = gr.curve('--accent', 200), dot = gr.dot('--accent', 0.25), lab = K.label('', '--accent-ink', 'big');
    return {update(p){
      const vol = s=>s <= 0 ? 0 : Math.pow(10, (s - 1)*p.range/20);
      lin.plot(s=>s, 0, 1); lg.plot(vol, 0, 1); lg.visible = true;
      const v = p.log ? vol(p.s) : p.s, db = v > 0 ? 20*Math.log10(v) : -Infinity;
      dot.at(p.s, v); lab.at(gr.P(p.s, v).add(V(0, 0.9, 0))).text(db === -Infinity ? 'silent' : `${f(db,1)} dB`);
      return {v, db};
    }};
  },
  readout:(p,o)=>[['Volume', f(o.v,3),'acc'],['decibels', o.db === -Infinity ? '−∞ (silent)' : f(o.db,1)+' dB'],['loudness, roughly', o.v > 0 ? f(Math.pow(2, o.db/10)*100,0)+'% of full' : '0%']],
  code:(p,o)=>`local RANGE_DB = ${p.range}   -- the slider covers the top ${p.range} dB

local function SliderToVolume(slider: number): number
    if slider <= 0 then return 0 end                   -- bottom of the slider is truly silent
    return 10 ^ ((slider - 1) * RANGE_DB / 20)
end

local function VolumeToDecibels(volume: number): number
    return 20 * math.log10(volume)
end

musicGroup.Volume = SliderToVolume(${p.s})   --> ${f(o.v,3)}`,
  body:`<p>Ears hear loudness on a <b>log scale</b>: going from 0.1 to 0.2 volume sounds like as big a jump as 0.5 to 1. A plain linear slider (dashed) therefore does almost nothing in its top half and everything in its bottom few pixels.</p>
<p><b>Decibels</b> fix this. Every −6 dB halves the volume number; about −10 dB sounds "half as loud". Map the slider to decibels first, then convert back, and each bit of slider movement sounds like the same change (the orange curve).</p>`,
  uses:[`<b>Settings menus</b>: music, effects and voice sliders that feel even.`,
        `<b>Fades</b>: fade in decibels for smooth, natural fade-outs.`,
        `<b>Mixing</b>: "make the music 6 dB quieter during dialogue".`],
  gotchas:[`<code>math.log10(0)</code> is −infinity. Treat the bottom of the slider as silent.`,
           `Roblox Volume goes up to 10, but anything over 1 can distort. Keep 1 as "full".`]
});

Lab.finder([
  ['Randomise the pitch of a sound a little','PlaybackSpeed = 2 ^ (semitones / 12)','au-pitch'],
  ['Make a sound play one musical note higher','2 ^ (1 / 12)','au-pitch'],
  ['Make a sound fade out with distance','RollOffMode + Min/Max distance','au-rolloff'],
  ['Make a volume slider that feels right','10 ^ (dB / 20)','au-db'],
]);
Lab.ref('audio','Sound',[
  ['sound.PlaybackSpeed','Speed and pitch together','2 ^ (7 / 12) → 1.498','Pitch changes, engines, slow-mo'],
  ['2 ^ (n / 12)','Speed for n semitones','2 ^ (12 / 12) → 2','Musical notes, random pitch'],
  ['sound.Volume','Loudness multiplier (0 to 10)','sound.Volume = 0.5','Mixing, settings'],
  ['RollOffMode','How volume falls with distance','Enum.RollOffMode.Inverse','3D sounds'],
  ['RollOffMin / MaxDistance','Full volume inside / silent beyond','RollOffMaxDistance = 80','Hearing range'],
  ['20 * math.log10(v)','Volume → decibels','20 * math.log10(0.5) → -6','Showing levels, fades'],
  ['10 ^ (dB / 20)','Decibels → volume','10 ^ (-20 / 20) → 0.1','Settings sliders'],
  ['SoundGroup.Volume','One volume for many sounds','musicGroup.Volume = 0.3','Music / SFX channels'],
]);
})();
