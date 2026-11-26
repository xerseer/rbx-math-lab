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
})();
