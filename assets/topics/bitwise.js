(function(){
"use strict";
const {THREE, V, C, G, R, S, T} = Lab;
const demo = Lab.subject({
  id:'bitwise', title:'Bitwise operations', glyph:'bits',
  blurb:'The bit32 library: binary, flags, AND/OR/XOR, shifts and packing several values into one number.'
});

const bin = (v,n)=>(v>>>0).toString(2).padStart(n,'0').slice(-n);
const grouped = (v,n)=>bin(v,n).replace(/(.{4})(?=.)/g,'$1_');
const hex = (v,n=2)=>'0x'+(v>>>0).toString(16).toUpperCase().padStart(n,'0');

/* a row of cubes, one per bit: tall and coloured = 1, flat and faint = 0 */
function bitRow(K, n, y, {name='', gap=1.1, size=0.9, on='--accent', colorOf=null, weights=false, index=false}={}){
  const off = K.mat('--part',{opacity:0.3}), onMats = {}; const onMat = c=>onMats[c] || (onMats[c] = K.mat(c));
  const x0 = -(n-1)/2*gap, cubes = [];
  for (let i=0;i<n;i++){
    const b = n-1-i, m = K.add(new THREE.Mesh(G.box, off)); m.position.set(x0+i*gap, y, 0);
    m.add(new THREE.LineSegments(G.edges, new THREE.LineBasicMaterial({color:C('--ink'), transparent:true, opacity:0.25})));
    cubes.push({m, b});
    if (weights) K.label(String(Math.pow(2,b)), '--muted', 'tiny').at(V(x0+i*gap, y+size*0.5+0.45, 0));
    if (index) K.label('b'+b, '--muted', 'tiny').at(V(x0+i*gap, y-size*0.5-0.35, 0));
  }
  const nameL = name ? K.label(name, '--ink', 'big').at(V(x0-gap*0.6-0.2, y, 0)) : null;
  if (nameL) nameL.el.style.translate = '-50% 0';
  const valL = K.label('', '--accent-ink', 'big').at(V(-x0+gap*0.6+0.2, y, 0)); valL.el.style.translate = '50% 0';
  return {
    nameL, valL, x:i=>x0+(n-1-i)*gap,
    set(v){ cubes.forEach(({m,b})=>{ const bit = (v>>>b)&1; m.material = bit ? onMat(colorOf ? colorOf(b) : on) : off; const h = bit ? size : size*0.3; m.scale.set(size, h, size); m.position.y = y - (size-h)/2; }); return this; },
    show(b){ cubes.forEach(({m})=>m.visible=b); if (nameL) nameL.show(b); valL.show(b); return this; }
  };
}

demo({
  id:'bw-binary', title:'Numbers as bits', short:'binary and hex', sig:'77 = 0b0100_1101 = 0x4D',
  view:{theta:0, phi:1.25, r:13, ty:1}, env:'grid',
  params:[R('v','Value',0,255,1,77)],
  setup(K){
    const row = bitRow(K, 8, 1, {weights:true, index:true});
    return {update(p){ row.set(p.v); row.valL.text(String(p.v)); return {}; }};
  },
  readout:(p)=>[['binary', '0b'+grouped(p.v,8),'acc'],['hex', hex(p.v)],['sum', [7,6,5,4,3,2,1,0].filter(b=>(p.v>>b)&1).map(b=>2**b).join(' + ') || '0']],
  code:(p)=>`local n = ${p.v}

print(0b${grouped(p.v,8)})   --> ${p.v}   (binary literal)
print(${hex(p.v)})           --> ${p.v}   (hex literal)

-- is a single bit on?
print(bit32.btest(n, 8))    --> ${((p.v & 8) !== 0)}   (the 8s bit)
print(bit32.extract(n, 3))  --> ${(p.v>>3)&1}   (bit number 3, counting from 0 on the right)`,
  body:`<p>Computers store whole numbers as <b>bits</b>: a row of on/off switches. Each switch is worth double the one to its right: 1, 2, 4, 8, 16 and so on. A number is the total of the switches that are on.</p>
<p>Slide the value and watch which cubes stand up. 77 is 64 + 8 + 4 + 1. Eight bits hold 0 to 255; the <code>bit32</code> library works with 32 bits, up to about 4.29 billion.</p>
<p>Hex is just a shorter way to write bits: each hex digit is exactly 4 bits, which is why colours and IDs are often written in hex.</p>`,
  uses:[`<b>Reading flags and masks</b> in the next topics, which all build on this.`,
        `<b>Hex colours</b>: <code>Color3.fromHex("#E2851A")</code> is three 8-bit numbers side by side.`,
        `<b>Understanding limits</b>: why a value tops out at 255 or 65,535.`],
  gotchas:[`Bits are counted from 0 on the <b>right</b>. "Bit 3" is the 8s place.`,
           `Luau numbers are 64-bit floats. <code>bit32</code> functions treat them as unsigned 32-bit whole numbers and drop anything outside that.`]
});

demo({
  id:'bw-flags', title:'Flags: many yes/no in one number', short:'bor · band · btest', sig:'bit32.bor(set, FLAG) · bit32.band(set, bit32.bnot(FLAG)) · bit32.btest(set, FLAG)',
  view:{theta:0, phi:1.25, r:14, ty:1.3}, env:'grid',
  params:[T('jump','CanJump (1)',true), T('run','CanRun (2)',true), T('stun','Stunned (4)',false), T('invis','Invisible (8)',false), T('fire','OnFire (16)',true), T('admin','Admin (32)',false)],
  setup(K){
    const FL = [['CanJump',0],['CanRun',1],['Stunned',2],['Invisible',3],['OnFire',4],['Admin',5]];
    const row = bitRow(K, 8, 1, {gap:1.4});
    FL.forEach(([nm,b],i)=>K.label(nm, '--muted', 'tiny').at(V(row.x(b), 1.95 + (i%2)*0.5, 0)));
    return {update(p){
      const v = (p.jump?1:0)|(p.run?2:0)|(p.stun?4:0)|(p.invis?8:0)|(p.fire?16:0)|(p.admin?32:0);
      row.set(v); row.valL.text(String(v)); return {v};
    }};
  },
  readout:(p,o)=>[['state', String(o.v),'acc'],['binary', '0b'+grouped(o.v,8)],['Stunned?', String(!!p.stun)]],
  code:(p,o)=>{ const on = [['CanJump',p.jump],['CanRun',p.run],['Stunned',p.stun],['Invisible',p.invis],['OnFire',p.fire],['Admin',p.admin]].filter(x=>x[1]).map(x=>'FLAGS.'+x[0]);
    return `local FLAGS = {
    CanJump = 1, CanRun = 2, Stunned = 4,
    Invisible = 8, OnFire = 16, Admin = 32,
}

local state = ${on.length ? (on.length > 1 ? `bit32.bor(${on.join(', ')})` : on[0]) : '0'}   --> ${o.v}

state = bit32.bor(state, FLAGS.Stunned)               -- turn a flag on
state = bit32.band(state, bit32.bnot(FLAGS.OnFire))   -- turn a flag off
state = bit32.bxor(state, FLAGS.Invisible)            -- flip a flag

if bit32.btest(state, FLAGS.Stunned) then             -- check a flag
    humanoid.WalkSpeed = 0
end`; },
  body:`<p>Give each yes/no setting its own bit and one number can hold all of them. Each flag's value is a power of two (1, 2, 4, 8…), so no two flags overlap.</p>
<p><code>bor</code> switches a flag on, <code>band</code> with <code>bnot</code> switches it off, <code>bxor</code> flips it, and <code>btest</code> checks it. Tick the boxes and watch the number: six separate booleans, stored as one value between 0 and 63.</p>`,
  uses:[`<b>Status effects</b> on a character: stunned, burning, slowed, shielded.`,
        `<b>Settings and unlocks</b> saved compactly in a DataStore.`,
        `<b>Permissions</b>: moderator, builder, VIP, admin as bits on one rank number.`],
  gotchas:[`Flag values must be powers of two. A flag worth 3 would overlap 1 and 2.`,
           `For a handful of flags in normal game code, a table of booleans is easier to read. Reach for bits when you store or send lots of them.`,
           `You get 32 flags per number with <code>bit32</code>.`]
});

demo({
  id:'bw-ops', title:'AND, OR, XOR, NOT', short:'band · bor · bxor · bnot', sig:'bit32.band(a, b) · bit32.bor(a, b) · bit32.bxor(a, b) · bit32.bnot(a)',
  view:{theta:0, phi:1.3, r:15, ty:2}, env:'grid',
  params:[R('a','A',0,255,1,0b11001010), R('b','B',0,255,1,0b10101100), S('op','Operation',[['band','band (AND): both on'],['bor','bor (OR): either on'],['bxor','bxor (XOR): exactly one on'],['bnot','bnot (NOT): flip A']],'band')],
  setup(K){
    const rA = bitRow(K, 8, 3.4, {name:'A'}), rB = bitRow(K, 8, 2.0, {name:'B'}), rR = bitRow(K, 8, 0.6, {name:'result', on:'--va'});
    K.line('--muted').set(V(-4.6,1.35,0), V(4.6,1.35,0));
    return {update(p){
      const r = p.op==='band' ? (p.a & p.b) : p.op==='bor' ? (p.a | p.b) : p.op==='bxor' ? (p.a ^ p.b) : (~p.a)>>>0;
      rA.set(p.a).valL.text(String(p.a)); rB.set(p.b).show(p.op!=='bnot').valL.text(String(p.b)); rR.set(r & 255).valL.text(String(p.op==='bnot' ? r : r));
      return {r};
    }};
  },
  readout:(p,o)=>[['A', '0b'+grouped(p.a,8)],...(p.op!=='bnot'?[['B', '0b'+grouped(p.b,8)]]:[]),['result', p.op==='bnot' ? `${o.r} (lowest 8 bits ${o.r & 255})` : String(o.r),'acc']],
  code:(p,o)=>`local A = 0b${grouped(p.a,8)}   -- ${p.a}
local B = 0b${grouped(p.b,8)}   -- ${p.b}

print(bit32.band(A, B))   --> ${p.a & p.b}    on where BOTH are on
print(bit32.bor(A, B))    --> ${p.a | p.b}    on where EITHER is on
print(bit32.bxor(A, B))   --> ${p.a ^ p.b}    on where exactly ONE is on
print(bit32.bnot(A))      --> ${(~p.a)>>>0}   every bit flipped (all 32 of them)

-- keep only the lowest 4 bits (a "mask"):
print(bit32.band(A, 0b1111))   --> ${p.a & 15}`,
  body:`<p>These four operations work on every bit position separately, like a column of tiny logic gates. Line up A and B and read each column on its own.</p>
<p><b>AND</b> keeps a bit only where both have it, so it's used to <i>mask</i>: pick out some bits and zero the rest. <b>OR</b> merges, <b>XOR</b> spots differences, and <b>NOT</b> flips everything.</p>
<p>Switch between them and compare the result row with the two above.</p>`,
  uses:[`<b>Masks</b>: <code>band(value, 0xFF)</code> keeps the lowest 8 bits.`,
        `<b>What changed?</b> <code>bxor(oldFlags, newFlags)</code> has a bit on for every flag that was toggled.`,
        `<b>Simple checksums and hashing</b> mix numbers together with XOR.`],
  gotchas:[`<code>bit32.bnot</code> flips all 32 bits, so <code>bnot(0)</code> is 4294967295, not −1 and not 255. Mask it if you only care about 8 bits.`,
           `Luau's <code>and</code>/<code>or</code>/<code>not</code> keywords are logic on whole values, not bitwise. Use <code>bit32</code> for bits.`]
});

demo({
  id:'bw-shift', title:'Shifting bits', short:'lshift · rshift', sig:'bit32.lshift(n, k)  =  n × 2ᵏ   ·   bit32.rshift(n, k)  =  ⌊n ÷ 2ᵏ⌋',
  view:{theta:0, phi:1.3, r:20, ty:1.5}, env:'grid',
  params:[R('v','Value',1,255,1,13), R('k','Shift by',0,8,1,3), S('dir','Direction',[['l','lshift (left)'],['r','rshift (right)']],'l')],
  setup(K){
    const r1 = bitRow(K, 16, 2.4, {name:'before', gap:1.0, size:0.8}), r2 = bitRow(K, 16, 0.8, {name:'after', gap:1.0, size:0.8, on:'--va', index:true});
    return {update(p){
      const out = p.dir==='l' ? (p.v << p.k)>>>0 : p.v >>> p.k;
      r1.set(p.v).valL.text(String(p.v)); r2.set(out).valL.text(String(out)); return {out};
    }};
  },
  readout:(p,o)=>[['result', String(o.out),'acc'],[p.dir==='l'?`${p.v} × 2^${p.k}`:`floor(${p.v} ÷ 2^${p.k})`, String(o.out)]],
  code:(p,o)=>`local n = ${p.v}   -- 0b${grouped(p.v,16)}

print(bit32.${p.dir==='l'?'lshift':'rshift'}(n, ${p.k}))   --> ${o.out}   (0b${grouped(o.out,16)})
-- ${p.dir==='l' ? `same as n * 2^${p.k}` : `same as math.floor(n / 2^${p.k})`}

-- the main use: moving a value into its own slot of a bigger number
local x, z = 12, 40
local key = bit32.bor(bit32.lshift(x, 16), z)   -- x in the top 16 bits, z in the bottom 16
print(bit32.rshift(key, 16), bit32.band(key, 0xFFFF))   --> 12  40`,
  body:`<p>Shifting slides every bit left or right. Moving left by one doubles the number; moving right halves it and drops whatever falls off the end.</p>
<p>The real reason to shift is <b>positioning</b>. To store two values in one number, shift one of them up into the high bits so it doesn't collide with the other. Shift right later to bring it back down.</p>`,
  uses:[`<b>Packing grid coordinates</b> into a single dictionary key, like the example in the code.`,
        `<b>Building flag values</b>: <code>bit32.lshift(1, n)</code> is the value of bit n.`,
        `<b>Reading packed data</b> such as colours and network messages.`],
  gotchas:[`Bits shifted past bit 31 are lost. <code>lshift</code> doesn't grow the number beyond 32 bits.`,
           `Don't use shifts to multiply for "speed" in Luau. Plain <code>* 2</code> is just as fast and clearer.`]
});

demo({
  id:'bw-pack', title:'Packing values: extract and replace', short:'RGB in one number', sig:'bit32.extract(n, field, width) · bit32.replace(n, v, field, width)',
  view:{theta:0, phi:1.25, r:17.5, ty:2.2}, env:'grid',
  params:[R('r','Red',0,255,1,226), R('g','Green',0,255,1,133), R('b','Blue',0,255,1,26)],
  setup(K){
    const row = bitRow(K, 24, 0.8, {gap:0.75, size:0.62, colorOf:b=>b>=16?'--x':b>=8?'--y':'--z'});
    K.label('R (bits 16–23)','--x','big').at(V(row.x(20),1.7,0)); K.label('G (bits 8–15)','--y','big').at(V(row.x(12),1.7,0)); K.label('B (bits 0–7)','--z','big').at(V(row.x(4),1.7,0));
    const sw = K.add(new THREE.Mesh(G.box, new THREE.MeshLambertMaterial({color:0xffffff}))); sw.scale.set(2.4,2.4,2.4); sw.position.set(0,4,0);
    sw.add(new THREE.LineSegments(G.edges, new THREE.LineBasicMaterial({color:C('--ink'), transparent:true, opacity:0.3})));
    K.label('Color3.fromRGB(r, g, b)','--muted').at(V(0,5.7,0));
    return {update(p){
      const packed = ((p.r<<16)|(p.g<<8)|p.b)>>>0; row.set(packed); row.valL.text(String(packed));
      sw.material.color.setRGB(p.r/255, p.g/255, p.b/255); return {packed};
    }};
  },
  readout:(p,o)=>[['packed', String(o.packed),'acc'],['hex', hex(o.packed,6)]],
  code:(p,o)=>`-- pack three 0-255 values into one number
local packed = bit32.bor(bit32.lshift(${p.r}, 16), bit32.lshift(${p.g}, 8), ${p.b})
print(packed)   --> ${o.packed}   (${hex(o.packed,6)})

-- unpack with extract(number, firstBit, width)
local r = bit32.extract(packed, 16, 8)   --> ${p.r}
local g = bit32.extract(packed, 8, 8)    --> ${p.g}
local b = bit32.extract(packed, 0, 8)    --> ${p.b}
part.Color = Color3.fromRGB(r, g, b)

-- change one field without touching the others
packed = bit32.replace(packed, 255, 0, 8)   -- blue becomes 255`,
  body:`<p>Packing puts several small values side by side in one number, each in its own range of bits. A colour is the classic example: red in bits 16–23, green in 8–15, blue in 0–7. That's exactly what a hex colour like <code>#E2851A</code> is.</p>
<p><code>bit32.extract(n, field, width)</code> reads a range of bits back out, and <code>bit32.replace</code> writes one range without disturbing the rest. Move the sliders and watch each colour's 8 bits change on their own.</p>`,
  uses:[`<b>Compact saves</b>: several small stats in one DataStore number.`,
        `<b>Grid keys</b>: x and z in one number for fast table lookups.`,
        `<b>Network messages</b>: many small values sent as one number in a RemoteEvent.`],
  gotchas:[`Each value must fit its width. A 9-bit value in an 8-bit field spills into its neighbour, so clamp or mask first.`,
           `For bigger or many-field data, the <code>buffer</code> library (<code>buffer.writeu8</code>, <code>buffer.readu16</code> and so on) is easier and not limited to 32 bits.`]
});

demo({
  id:'bw-slots', title:'Finding a free slot', short:'bit32.countrz', sig:'bit32.countrz(bit32.bnot(used))  →  index of the first empty slot',
  view:{theta:0, phi:1.25, r:19, ty:1.5}, env:'grid',
  params:[R('fill','Slots in use',0,16,1,9), R('seed','Which slots (seed)',1,60,1,4)],
  setup(K){
    const row = bitRow(K, 16, 1, {gap:1.05, size:0.8, index:true});
    const mark = K.arrow('--ok',{thick:0.06}), lm = K.label('','--ok','big');
    return {update(p){
      const rng = Lab.mulberry32(p.seed*97), order = [...Array(16).keys()];
      for (let i=15;i>0;i--){ const j=Math.floor(rng()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }
      let used = 0; for (let i=0;i<p.fill;i++) used |= 1 << order[i];
      const free = (~used) & 0xFFFF; let slot = -1; if (free){ slot = 0; while (!((free>>slot)&1)) slot++; }
      row.set(used); row.valL.text(String(used));
      mark.visible = slot >= 0; lm.show(true);
      if (slot >= 0){ const x = row.x(slot); mark.set(V(x,3.1,0), V(0,-1.4,0)); lm.at(V(x,3.6,0)).text(`first free: bit ${slot}`); } else lm.at(V(0,3.2,0)).text('inventory full');
      return {used, slot};
    }};
  },
  readout:(p,o)=>[['used', `${o.used} (0b${grouped(o.used,16)})`],['first free bit', o.slot >= 0 ? String(o.slot) : 'none (full)', o.slot >= 0 ? 'acc' : 'bad'],['slot number (1-based)', o.slot >= 0 ? String(o.slot+1) : '-']],
  code:(p,o)=>`local SLOTS = 16
local used = ${o.used}   -- one bit per slot: 1 = taken

local function firstFreeSlot()
    local free = bit32.band(bit32.bnot(used), 2 ^ SLOTS - 1)   -- 1 = empty
    if free == 0 then
        return nil                       -- inventory full
    end
    return bit32.countrz(free)           -- zeros on the right = index of lowest free slot
end

local slot = firstFreeSlot()            --> ${o.slot >= 0 ? o.slot : 'nil'}
if slot then
    used = bit32.bor(used, bit32.lshift(1, slot))      -- take it
end
-- later, free it again:
-- used = bit32.band(used, bit32.bnot(bit32.lshift(1, slot)))`,
  body:`<p>Store which slots are taken as bits in one number. To find the first empty slot, flip the bits with <code>bnot</code> so empty slots become 1s, then count the zeros on the right with <code>countrz</code>. That count is the index of the lowest free slot, found in one call instead of a loop.</p>
<p>Change how many slots are in use and which ones. The green arrow always lands on the right-most standing-down cube.</p>`,
  uses:[`<b>Inventory and hotbar slots.</b>`,
        `<b>Seat and spawn-pad assignment</b> in lobbies and vehicles.`,
        `<b>ID pools</b>: reuse the lowest free ID for pooled projectiles or effects.`],
  gotchas:[`<code>bnot</code> flips all 32 bits, so mask it down to your slot count, or slots past the end look free.`,
           `<code>countrz(0)</code> returns 32. Check for a full inventory first.`]
});

const TILE_MAPS = {
  plus:['.........','....#....','....#....','....#....','#########','....#....','....#....','....#....','.........'],
  loop:['.........','.#######.','.#.....#.','.#..####.','.#..#..#.','.####..#.','....#..#.','....####.','.........'],
  maze:['#.#####..','#.#...#..','###.#.###','..#.#...#','.##.#####','.#..#...#','.####.#.#','....#.#.#','....###.#'],
};
demo({
  id:'bw-autotile', title:'Autotiling with neighbour masks', short:'N=1 E=2 S=4 W=8', sig:'mask = N·1 + E·2 + S·4 + W·8   →   tiles[mask]',
  view:{theta:0, phi:0.65, r:24, ty:0}, env:'grid',
  params:[S('map','Layout',[['loop','Loop'],['plus','Crossroads'],['maze','Maze'],['random','Random']],'loop'), R('seed','Random seed',1,99,1,8)],
  setup(K){
    const N = 9, CS = 2, grp = K.add(new THREE.Group()); const pool = Array.from({length:N*N}, ()=>K.label('','--ink','tiny'));
    const road = K.mat('--part'), mid = K.mat('--accent');
    let key = '';
    return {update(p){
      const k = p.map+'|'+(p.map==='random'?p.seed:''); let info = null;
      if (k !== key){ key = k;
        while (grp.children.length) grp.remove(grp.children[0]);
        let rows;
        if (p.map === 'random'){ const rng = Lab.mulberry32(p.seed*211); rows = Array.from({length:N}, ()=>Array.from({length:N}, ()=>rng()<0.5?'#':'.').join('')); }
        else rows = TILE_MAPS[p.map];
        const is = (x,z)=>x>=0&&z>=0&&x<N&&z<N&&rows[z][x]==='#';
        const counts = {}; let tiles = 0;
        for (let z=0;z<N;z++) for (let x=0;x<N;x++){
          const L = pool[z*N+x]; if (!is(x,z)){ L.show(false); continue; }
          const mask = (is(x,z-1)?1:0) | (is(x+1,z)?2:0) | (is(x,z+1)?4:0) | (is(x-1,z)?8:0); counts[mask] = 1; tiles++;
          const cx = (x-(N-1)/2)*CS, cz = (z-(N-1)/2)*CS;
          const c = new THREE.Mesh(G.box, mid); c.scale.set(0.8,0.3,0.8); c.position.set(cx,0.15,cz); grp.add(c);
          [[1,0,-1],[2,1,0],[4,0,1],[8,-1,0]].forEach(([bit,dx,dz])=>{ if (!(mask & bit)) return; const a = new THREE.Mesh(G.box, road); a.scale.set(dx?0.6:0.8, 0.2, dz?0.6:0.8); a.position.set(cx+dx*0.7, 0.1, cz+dz*0.7); grp.add(a); });
          L.show(true).at(V(cx,0.75,cz)).text(String(mask));
        }
        info = {tiles, kinds:Object.keys(counts).length}; this._info = info;
      }
      return this._info;
    }};
  },
  readout:(p,o)=>[['road tiles', String(o.tiles)],['different tile shapes used', `${o.kinds} of 16`,'acc']],
  code:(p,o)=>`local N, E, S, W = 1, 2, 4, 8

local function isRoad(x, z)
    return grid[x] and grid[x][z] == "road"
end

local function maskAt(x, z)
    local mask = 0
    if isRoad(x, z - 1) then mask = bit32.bor(mask, N) end
    if isRoad(x + 1, z) then mask = bit32.bor(mask, E) end
    if isRoad(x, z + 1) then mask = bit32.bor(mask, S) end
    if isRoad(x - 1, z) then mask = bit32.bor(mask, W) end
    return mask                     -- 0..15, one number per tile shape
end

-- TILES[0..15] holds a model for each shape: 5 = straight N–S, 15 = crossroads...
local piece = TILES[maskAt(x, z)]:Clone()`,
  body:`<p>Each road tile looks at its four neighbours and gives each direction a bit: north 1, east 2, south 4, west 8. Add up the directions that have road and you get a number from 0 to 15, and every number is a different tile shape. Straight north–south is 1 + 4 = 5, a T-junction missing west is 7, a crossroads is 15.</p>
<p>The number on each tile is its mask. Switch layouts and every piece picks the right shape by itself, so a building system never needs a hand-placed corner piece.</p>`,
  uses:[`<b>Roads, rails, pipes and wires</b> in building and tycoon games.`,
        `<b>Walls and fences</b> that connect to their neighbours.`,
        `<b>Dungeon and terrain generation</b> on grids.`],
  gotchas:[`When a tile is placed or removed, recompute the masks of its four neighbours too, not just the tile itself.`,
           `To include diagonals (for smooth terrain edges), use 8 bits instead of 4. That gives 256 cases, often trimmed down to 47 real shapes.`]
});

{
const LAYERS = ['Players','Enemies','PlayerShots','EnemyShots'];
const PRESETS = {
  coop:{label:'Co-op shooter', masks:[2|8, 1|2|4, 2, 1]},
  pvp:{label:'Free for all', masks:[1|2|4|8, 1|2|4|8, 1|2, 1|2]},
  ghost:{label:'Players are ghosts', masks:[0, 2|4, 2, 0]},
};

demo({
  id:'bw-layers', title:'Collision layers with masks', short:'bit32.btest(mask, layer)', sig:'canHit = bit32.btest(MASKS[attacker], LAYER[target])',
  view:{theta:0, phi:0.9, r:16, ty:0.5, tx:1}, env:'grid',
  params:[S('preset','Rules',Object.entries(PRESETS).map(([k,v])=>[k,v.label]),'coop'), S('a','Attacker',LAYERS.map((n,i)=>[String(i),n]),'2'), S('t','Target',LAYERS.map((n,i)=>[String(i),n]),'1')],
  setup(K){
    const on = K.mat('--accent'), off = K.mat('--part',{opacity:0.3}), cells = [];
    for (let r=0;r<4;r++){ K.label(LAYERS[r],'--ink','big').at(V(-1.6,0.3,-3+r*2)).el.style.translate = '-50% 0';
      for (let c=0;c<4;c++){ const m = K.add(new THREE.Mesh(G.box, off)); m.position.set(c*2+0.5, 0.3, -3+r*2); cells.push(m); } }
    for (let c=0;c<4;c++) K.label(LAYERS[c] + ` (${1<<c})`,'--muted').at(V(c*2+0.5, 0.4, -4.6));
    K.label('can hit →','--muted').at(V(-1.6,0.4,-4.6)).el.style.translate = '-50% 0';
    const sel = K.ring(0.9,'--vb',{y:0.04}), masks = [0,1,2,3].map(r=>K.label('','--accent').at(V(8.6,0.3,-3+r*2)));
    masks.forEach(L=>L.el.style.translate = '50% 0');
    return {update(p){
      const M = PRESETS[p.preset].masks, a = +p.a, t = +p.t;
      cells.forEach((m,i)=>{ const r = Math.floor(i/4), c = i%4, lit = (M[r]>>c)&1; m.material = lit ? on : off; m.scale.set(1.4, lit ? 0.9 : 0.25, 1.4); m.position.y = lit ? 0.45 : 0.13; });
      M.forEach((v,r)=>masks[r].text(`mask ${v}`));
      sel.position.set(t*2+0.5, 0, -3+a*2);
      return {M, can: ((M[a]>>t)&1) === 1};
    }};
  },
  readout:(p,o)=>[['MASKS.'+LAYERS[+p.a], `${o.M[+p.a]} (0b${o.M[+p.a].toString(2).padStart(4,'0')})`],['LAYER.'+LAYERS[+p.t], String(1 << +p.t)],['can hit?', String(o.can), o.can ? 'ok' : 'bad']],
  code:(p,o)=>`local LAYER = { Players = 1, Enemies = 2, PlayerShots = 4, EnemyShots = 8 }

-- what each layer is allowed to hit (${PRESETS[p.preset].label})
local MASKS = {
${LAYERS.map((n,i)=>`    ${n} = ${o.M[i]},`).join('\n')}
}

local function canHit(attackerLayer, targetLayer)
    return bit32.btest(MASKS[attackerLayer], LAYER[targetLayer])
end

print(canHit("${LAYERS[+p.a]}", "${LAYERS[+p.t]}"))   --> ${o.can}`,
  body:`<p>Give every kind of object a <b>layer</b>, one bit each. Then give every layer a <b>mask</b>: the bits of the layers it's allowed to hit. Checking a hit is one <code>btest</code>: is the target's bit inside the attacker's mask?</p>
<p>Each row of the grid is one layer's mask. Switch the rule preset and whole rows change, without touching any hit code. Pick an attacker and a target to see the check for that pair (pink ring).</p>`,
  uses:[`<b>Friendly fire rules</b>: player bullets ignore players in co-op, hit them in PvP.`,
        `<b>Game modes</b> that swap rules by swapping one table of masks.`,
        `<b>Raycast filtering</b> on your own tags, alongside Roblox's collision groups.`],
  gotchas:[`Roblox physics has its own system for this: <b>collision groups</b> with <code>PhysicsService:CollisionGroupSetCollidable</code>. Use masks like these for your own hit logic.`,
           `A mask is one-way. If enemies should hit players too, set the bit in both rows.`]
});

demo({
  id:'bw-signed', title:'Negative numbers in bit32', short:'two\'s complement', sig:'bit32 sees −1 as 4294967295 (all 32 bits on)',
  view:{theta:0, phi:1.25, r:19, ty:1.5}, env:'grid',
  params:[R('v','Value',-300,300,1,-6)],
  setup(K){
    const row = bitRow(K, 16, 1, {gap:1.05, size:0.8, index:true, colorOf:b=>b===15?'--vb':'--accent'});
    K.label('… bits 16–31 copy the top bit','--muted').at(V(-9.6,2.2,0));
    return {update(p){ const u = p.v >>> 0; row.set(u & 0xFFFF); row.valL.text(String(u)); return {u, back: u >= 2**31 ? u - 2**32 : u}; }};
  },
  readout:(p,o)=>[['as unsigned 32-bit', String(o.u),'acc'],['hex', '0x'+o.u.toString(16).toUpperCase().padStart(8,'0')],['converted back', String(o.back)],['lowest 8 bits', String(o.u & 255)]],
  code:(p,o)=>`local n = ${p.v}

print(bit32.band(n, 0xFFFFFFFF))   --> ${o.u}   (bit32 always returns 0 .. 4294967295)
print(bit32.band(n, 0xFF))         --> ${o.u & 255}   (lowest 8 bits)

-- turn a bit32 result back into a signed number
local function toSigned(u)
    if u >= 2 ^ 31 then
        return u - 2 ^ 32
    end
    return u
end
print(toSigned(bit32.band(n, 0xFFFFFFFF)))   --> ${o.back}`,
  body:`<p>Computers store negative numbers in <b>two's complement</b>: −1 is all bits on, −2 is all on except the last, and so on. The top bit (pink) works as the sign. To negate a number, flip every bit and add 1.</p>
<p><code>bit32</code> always hands back a number from 0 to 4,294,967,295, so negative inputs come back as huge positive values. That's not wrong, it's the same bits read as unsigned. Slide below zero and watch the left-hand bits fill up; convert back by subtracting 2³² when the top bit is set.</p>`,
  uses:[`<b>Reading signed values</b> from packed data, such as an X offset that can be negative.`,
        `<b>Debugging</b> "why is my bit32 result 4 billion?"`,
        `<b>Storing negatives in a field</b>: add an offset first (x + 128 for −128…127) so the packed value stays positive.`],
  gotchas:[`<code>bit32.bnot(5)</code> is 4294967290, not −6. Mask or convert the result.`,
           `The <code>buffer</code> library has signed reads and writes (<code>buffer.readi16</code>, <code>buffer.writei32</code>) that handle this for you.`]
});
}

{
const part1by1 = n=>{ n &= 0xFF; n = (n | (n << 4)) & 0x0F0F; n = (n | (n << 2)) & 0x3333; n = (n | (n << 1)) & 0x5555; return n; };
const morton = (x,z)=>part1by1(x) | (part1by1(z) << 1);

demo({
  id:'bw-morton', adv:true, title:'Morton codes: Z-order keys', short:'interleave x and z bits', sig:'key = interleave(x) | interleave(z) << 1',
  view:{theta:0, phi:0.5, r:22, ty:0}, env:'grid',
  params:[R('x','Cell X',0,7,1,5), R('z','Cell Z',0,7,1,3), T('curve','Show the Z-order path',true)],
  setup(K){
    const N = 8, CS = 2, cells = [], order = [];
    for (let z=0;z<N;z++) for (let x=0;x<N;x++){ const m = K.add(new THREE.Mesh(G.box, new THREE.MeshLambertMaterial({color:0xffffff}))); m.scale.set(1.8,0.2,1.8); m.position.set((x-3.5)*CS,0.1,(z-3.5)*CS);
      const code = morton(x,z); m.material.color.copy(C('--va')).lerp(C('--vb'), code/63); cells.push({m, x, z, code}); order[code] = V((x-3.5)*CS,0.35,(z-3.5)*CS); }
    const path = K.line('--ink',{max:64}); path.set(order);
    const labs = cells.map(c=>K.label(String(c.code),'--ink','tiny').at(c.m.position.clone().add(V(0,0.4,0))));
    const sel = K.ring(1.2,'--accent',{y:0.3});
    for (let i=0;i<N;i++){ K.label('x'+i,'--muted').at(V((i-3.5)*CS,0.2,-8.6)); K.label('z'+i,'--muted').at(V(-8.6,0.2,(i-3.5)*CS)); }
    return {update(p){ path.visible = p.curve; const code = morton(p.x,p.z); sel.position.set((p.x-3.5)*CS,0,(p.z-3.5)*CS); return {code}; }};
  },
  readout:(p,o)=>[['x bits', p.x.toString(2).padStart(3,'0')],['z bits', p.z.toString(2).padStart(3,'0')],['interleaved (z x z x z x)', o.code.toString(2).padStart(6,'0'),'acc'],['key', String(o.code)]],
  code:(p,o)=>`-- spread the bits of a 16-bit number apart: abcd → 0a0b0c0d
local function part1by1(n)
    n = bit32.band(n, 0xFFFF)
    n = bit32.band(bit32.bor(n, bit32.lshift(n, 8)), 0x00FF00FF)
    n = bit32.band(bit32.bor(n, bit32.lshift(n, 4)), 0x0F0F0F0F)
    n = bit32.band(bit32.bor(n, bit32.lshift(n, 2)), 0x33333333)
    n = bit32.band(bit32.bor(n, bit32.lshift(n, 1)), 0x55555555)
    return n
end

local function mortonKey(x, z)
    return bit32.bor(part1by1(x), bit32.lshift(part1by1(z), 1))
end

print(mortonKey(${p.x}, ${p.z}))   --> ${o.code}

-- nearby cells get nearby keys, so sorting by key keeps neighbours together
local chunks = {}
chunks[mortonKey(cx, cz)] = chunkData`,
  body:`<p>A <b>Morton code</b> (Z-order key) turns a 2D grid position into one number by <b>interleaving</b> the bits: one bit of x, one bit of z, one of x, one of z… The ring marks the chosen cell; the readout shows its x bits and z bits woven together.</p>
<p>Follow the path through the keys 0, 1, 2, 3… It zig-zags in little Z shapes, then bigger Zs made of those, and so on. Cells that are close on the map mostly get close keys, which makes Morton keys good for storing chunks, sorting objects by area and building quadtrees.</p>`,
  uses:[`<b>Chunk and tile keys</b> for big voxel or tile worlds.`,
        `<b>Spatial sorting</b>: process nearby objects together for fewer cache misses.`,
        `<b>Quadtrees</b>: the top bits of a Morton key say which quadrant a cell is in.`],
  gotchas:[`Coordinates must be whole numbers from 0 up. Add an offset to handle negative positions.`,
           `With <code>bit32</code>, x and z can be up to 16 bits each (0 to 65,535) before the key runs out of room.`]
});
}
})();
