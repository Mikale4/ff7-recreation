// Field tile types (the ASCII legend) and the 3D prop meshes placed on them.
//
// Default legend (maps may add/override with `legend: { 'Q': 'pod' }`):
//   #  wall            .  floor           ,  grass           :  path / alt floor    _  carpet / 3rd floor
//   ' ' void (black)   ~  water           *  mako (glowing)  L  lava               =  railing / fence
//   T  tree            %  bush            R  rock            B  crate              o  barrel
//   P  pipes           M  machine         D  counter/desk    t  table              c  chair
//   b  bed             k  bookshelf       l  lamp post       |  pillar             x  rubble / junk
//   r  rail tracks     g  metal grate     ^  stairs          H  ladder             f  flowers
//   s  sand            n  snow            i  ice             d  dirt               w  wall with window
//   +  doorway         S  save point      E  elevator floor  v  vending machine    Z  computer terminal
//   X  tall structure  h  building wall   &  train car       !  sign               j  pot / jar
//   u  statue          q  cabinet         y  mako pod/tank   z  catwalk            F  fireplace
//   C  cliff (drop)    K  bridge planks   G  tall grass      V  vine / wall plant  O  well / pool edge
//   W  waterfall       Y  tree stump      A  tent            U  crystal           N  neon sign
//   p  church pew      I  bar stool       e  glowing floor   -  hazard stripes     Q  water tower (block)
//   J  paper lantern   a  stained glass   m  urn / vase      @  campfire           $  vehicle wreck (block)
// More tile types without a default char (use `legend`): see FF7.field.tileTypes and docs/SCRIPTING.md.
(function () {
  const U = FF7.util, MB = FF7.MeshBuilder, V = FF7.V3;
  const TT = FF7.field.tileTypes = {};
  const def = (name, o) => TT[name] = Object.assign({ name, walk: false, floor: 'floor', prop: null, wall: false, void: false, tall: 0 }, o);

  def('floor', { walk: true });
  def('floor2', { walk: true, floor: 'floor2' });
  def('floor3', { walk: true, floor: 'floor3' });
  def('grass', { walk: true, floor: 'grass' });
  def('dirt', { walk: true, floor: 'dirt' });
  def('sand', { walk: true, floor: 'sand' });
  def('snow', { walk: true, floor: 'snow' });
  def('ice', { walk: true, floor: 'floor2' });
  def('carpet', { walk: true, floor: 'carpet' });
  def('grate', { walk: true, floor: 'metal', prop: 'grate', thin: true });
  def('rails', { walk: true, floor: 'floor2', prop: 'rails' });
  def('stairs', { walk: true, floor: 'floor2', prop: 'stairs', stair: true });
  def('ladder', { walk: true, prop: 'ladder', stair: true });
  def('flowers', { walk: true, floor: 'dirt', prop: 'flowers' });
  def('tallgrass', { walk: true, floor: 'grass', prop: 'tallgrass' });
  def('door', { walk: true, prop: 'door' });
  def('doorway', { walk: true, prop: 'door', open: true });          // door frame without the door leaf
  def('save', { walk: true, prop: null, save: true });
  def('elevator', { walk: true, floor: 'metal', prop: 'elevatorfloor' });
  def('catwalk', { walk: true, floor: 'metal', prop: 'catwalk', thin: true });
  def('bridge', { walk: true, floor: 'wood', prop: 'bridge', thin: true });
  def('deck', { walk: true, floor: 'wood', prop: 'bridge', thin: true });   // raised wooden porch / landing
  def('glowfloor', { walk: true, glow: true });                       // walkable glowing floor (look.glow)
  def('hazard', { walk: true, floor: 'metal', prop: 'hazard' });      // yellow/black hazard stripes
  def('checker', { walk: true, checker: true });                      // checkerboard (look.checker)
  def('steps', { walk: true, floor: 'floor2', stair: true, steps: true });   // free-form / turning stairs
  def('roundpillar', { walk: true, roundpillar: true });              // round stepping pillar (in water)
  def('wall', { wall: true });
  def('window', { wall: true, prop: 'window' });
  ['n', 's', 'e', 'w'].forEach(f => def('trainseat_' + f, { prop: 'trainseat_' + f }));
  def('liftpad', { walk: true, nofloor: true });      // over a lift shaft: the platform is a moving object (objects: [{ prop, pad }])
  def('liftblock', { nofloor: true });                // the same, but solid (the lift's machinery stands here)   // train benches (back against that wall)
  def('stainedglass', { wall: true, prop: 'window', stained: true });
  def('bldg', { wall: true, bldg: true });
  def('void', { void: true });
  def('water', { water: true });
  def('mako', { water: true, mako: true });
  def('lava', { water: true, lava: true });
  def('waterfall', { water: true, prop: 'waterfall' });
  def('cliff', { void: true, cliff: true });
  def('block', {});                                                   // solid floor, no prop (under big props)
  // furniture that keeps its zone's floor (Wonder Square's cafe on floor2, its bowling lounge on floor3)
  def('cafechair', { prop: 'chair', floor: 'floor2' }); def('cafetable', { prop: 'foodtable', floor: 'floor2' });
  def('cafecounter', { prop: 'foodcounter', floor: 'floor2' }); def('cafevending', { prop: 'vending', floor: 'floor2' });
  def('bowlchair', { prop: 'chair', floor: 'floor3' }); def('bowldesk', { prop: 'counter', floor: 'floor3' });
  ['rail', 'tree', 'bush', 'rock', 'crate', 'barrel', 'pipes', 'machine', 'counter', 'table', 'chair', 'bed', 'bookshelf',
    'lamp', 'pillar', 'rubble', 'vending', 'terminal', 'tower', 'train', 'sign', 'jar', 'statue', 'cabinet', 'pod', 'fireplace',
    'vine', 'well', 'stump', 'tent', 'crystal', 'neon',
    'stool', 'pew', 'pinball', 'jukebox', 'whiteboard', 'punchbag', 'heartbed', 'mahjong', 'lantern', 'valve', 'banner',
    'urn', 'pylon', 'campfire', 'cushion', 'disc', 'planter', 'hole', 'citymodel', 'coraltree', 'canopy', 'spire', 'scrap',
    'tv', 'shelf', 'flames', 'console', 'screen', 'helm', 'periscope', 'pilotseat', 'bench', 'tank', 'capsule', 'lever',
    'lane', 'lanecap', 'ballreturn', 'foodcounter', 'foodtable'].forEach(p => def(p, { prop: p }));
  def('watertower', { prop: 'watertower', block: true });
  def('wreck', { prop: 'wreck', block: true });
  def('locomotive', { prop: 'locomotive', block: true });
  def('engine', { prop: 'engine', block: true });
  def('hopper', { walk: true, floor: 'floor2', prop: 'hopper', thin: true });   // coal wagon floor (runaway train)
  def('flatcar', { walk: true, floor: 'floor3', prop: 'flatcar', thin: true });   // flat wagon deck
  TT.chair.walk = false; TT.vine.walk = false;

  FF7.field.LEGEND = {
    '#': 'wall', '.': 'floor', ',': 'grass', ':': 'floor2', '_': 'floor3', ' ': 'void', '~': 'water', '*': 'mako', 'L': 'lava',
    '=': 'rail', 'T': 'tree', '%': 'bush', 'R': 'rock', 'B': 'crate', 'o': 'barrel', 'P': 'pipes', 'M': 'machine', 'D': 'counter',
    't': 'table', 'c': 'chair', 'b': 'bed', 'k': 'bookshelf', 'l': 'lamp', '|': 'pillar', 'x': 'rubble', 'r': 'rails', 'g': 'grate',
    '^': 'stairs', 'H': 'ladder', 'f': 'flowers', 's': 'sand', 'n': 'snow', 'i': 'ice', 'd': 'dirt', 'w': 'window', '+': 'door',
    'S': 'save', 'E': 'elevator', 'v': 'vending', 'Z': 'terminal', 'X': 'tower', 'h': 'bldg', '&': 'train', '!': 'sign', 'j': 'jar',
    'u': 'statue', 'q': 'cabinet', 'y': 'pod', 'z': 'catwalk', 'F': 'fireplace', 'C': 'cliff', 'K': 'bridge', 'G': 'tallgrass',
    'V': 'vine', 'O': 'well', 'W': 'waterfall', 'Y': 'stump', 'A': 'tent', 'U': 'crystal', 'N': 'neon',
    'p': 'pew', 'I': 'stool', 'e': 'glowfloor', '-': 'hazard', 'Q': 'watertower', 'J': 'lantern', 'a': 'stainedglass', 'm': 'urn',
    '@': 'campfire', '$': 'wreck',
  };

  // ------------------------------------------------------------------ 3D lettering
  // A small stroke font (glyphs on a 4 x 6 grid as polylines) built as flat ribbons, so signs, neon and
  // floor lettering are real geometry and look the same in the browser and in tools/render_field.js.
  // Lower-case letters are drawn as small capitals.
  const GLYPH_SRC = {
    A: '0,0 2,6 4,0|0.9,2.6 3.1,2.6', B: '0,0 0,6 3,6 4,5 4,4 3,3.2 0,3.2|3,3.2 4,2.2 4,1 3,0 0,0', C: '4,5 3,6 1,6 0,5 0,1 1,0 3,0 4,1',
    D: '0,0 0,6 2.6,6 4,4.6 4,1.4 2.6,0 0,0', E: '4,6 0,6 0,0 4,0|0,3 3,3', F: '4,6 0,6 0,0|0,3 3,3',
    G: '4,5 3,6 1,6 0,5 0,1 1,0 3,0 4,1 4,2.8 2.2,2.8', H: '0,0 0,6|4,0 4,6|0,3 4,3', I: '1,6 3,6|2,6 2,0|1,0 3,0',
    J: '1.5,6 4,6|3,6 3,1 2,0 1,0 0,1', K: '0,0 0,6|4,6 0,2|1.4,3.4 4,0', L: '0,6 0,0 4,0', M: '0,0 0,6 2,3 4,6 4,0',
    N: '0,0 0,6 4,0 4,6', O: '1,0 0,1 0,5 1,6 3,6 4,5 4,1 3,0 1,0', P: '0,0 0,6 3,6 4,5 4,4 3,3 0,3',
    Q: '1,0 0,1 0,5 1,6 3,6 4,5 4,1 3,0 1,0|2.4,1.6 4,-0.4', R: '0,0 0,6 3,6 4,5 4,4 3,3 0,3|2,3 4,0',
    S: '4,5 3,6 1,6 0,5 0,4 1,3 3,3 4,2 4,1 3,0 1,0 0,1', T: '0,6 4,6|2,6 2,0', U: '0,6 0,1 1,0 3,0 4,1 4,6', V: '0,6 2,0 4,6',
    W: '0,6 1,0 2,4 3,0 4,6', X: '0,0 4,6|0,6 4,0', Y: '0,6 2,3 4,6|2,3 2,0', Z: '0,6 4,6 0,0 4,0',
    0: '1,0 0,1 0,5 1,6 3,6 4,5 4,1 3,0 1,0', 1: '0.8,4.8 2,6 2,0|0.8,0 3.2,0', 2: '0,5 1,6 3,6 4,5 4,3.8 0,0 4,0',
    3: '0,5 1,6 3,6 4,5 4,4 3,3.1 1.6,3.1|3,3.1 4,2.2 4,1 3,0 1,0 0,1', 4: '3,0 3,6 0,1.8 4,1.8', 5: '4,6 0.4,6 0,3.4 3,3.6 4,2.6 4,1 3,0 1,0 0,1',
    6: '4,5 3,6 1,6 0,5 0,1 1,0 3,0 4,1 4,2.4 3,3.4 1,3.4 0,2.4', 7: '0,6 4,6 1.6,0',
    8: '1,3.2 0,4.2 0,5 1,6 3,6 4,5 4,4.2 3,3.2 1,3.2 0,2.2 0,1 1,0 3,0 4,1 4,2.2 3,3.2', 9: '4,3.6 3,2.6 1,2.6 0,3.6 0,5 1,6 3,6 4,5 4,1 3,0 1,0 0,1',
    '.': '1,0 1,0.5', ',': '1.2,0.6 0.6,-0.8', '!': '1,6 1,2|1,0.5 1,0', '?': '0,5 1,6 3,6 4,5 4,4 2,2.8 2,1.8|2,0.5 2,0', '-': '0.8,3 3.2,3',
    "'": '1,6 1,4.6', ':': '1,4 1,3.4|1,1.4 1,0.8', '/': '0,0 4,6', '+': '2,1 2,5|0,3 4,3', '(': '2.6,6 1.4,4.6 1.4,1.4 2.6,0',
    ')': '1.4,6 2.6,4.6 2.6,1.4 1.4,0', '"': '1.3,6 1.3,4.6|2.7,6 2.7,4.6', '*': '2,1.5 2,4.5|0.7,2.3 3.3,3.7|0.7,3.7 3.3,2.3',
    '&': '4,0 0.8,4.4 0.8,5.4 1.6,6 2.6,5.6 2.8,4.8 0,2 0,0.8 1,0 2.6,0 4,2', '♥': '2,0 0,2.8 0,4.8 1,5.8 2,4.8 3,5.8 4,4.8 4,2.8 2,0',
  };
  const GLYPHS = {};
  for (const k in GLYPH_SRC) GLYPHS[k] = GLYPH_SRC[k].split('|').map(s => s.trim().split(/\s+/).map(p => p.split(',').map(Number)));
  const NARROW = new Set(['.', ',', '!', "'", ':']);
  const RAINBOW = ['#ff7070', '#ffb040', '#f8e060', '#70f080', '#60d0ff', '#b890ff', '#ff80d0'];
  FF7.field.RAINBOW = RAINBOW;
  // lay a string out in glyph units: [{ g, x, k }], total width
  function layout(text) {
    const out = []; let pen = 0;
    for (const ch of String(text)) {
      if (ch === ' ') { pen += 3.4; continue; }
      const up = ch.toUpperCase(), k = up !== ch ? 0.72 : 1;
      const g = GLYPHS[up];
      if (g) out.push({ g, x: pen, k });
      pen += (NARROW.has(up) ? 2.4 : 5.4) * k;
    }
    return { glyphs: out, width: Math.max(0, pen - 1.4) };
  }
  // width of a label in metres (cap height `size`)
  FF7.field.textWidth = (text, size) => layout(text).width * (size || 0.3) / 6;
  // Build text into `mb`. o: { pos [x,y,z] (anchor), u (reading direction), v (letter up), size (cap height, m),
  //   col (hex | array cycled per letter | 'rainbow'), w (stroke width / cap height, default 0.14),
  //   align ('center' | 'left' | 'right'), italic (true | slant), back (outline colour), depth (raised letters),
  //   off (distance off the surface along u x v) }
  FF7.field.text3d = function (mb, text, o) {
    const size = o.size || 0.3, unit = size / 6, hw = (o.w || 0.14) * size / 2;
    const u = V.norm(o.u || [1, 0, 0]), v = V.norm(o.v || [0, 1, 0]), n = V.norm(V.cross(u, v));
    const slant = o.italic ? (o.italic === true ? 0.22 : o.italic) : 0;
    const L = layout(text);
    const x0 = o.align === 'left' ? 0 : o.align === 'right' ? -L.width : -L.width / 2;
    const cols = o.col === 'rainbow' ? RAINBOW : Array.isArray(o.col) ? o.col : [o.col || '#ffffff'];
    const base = o.pos || [0, 0, 0], off0 = o.off || 0;
    const P3 = (s, t, d) => [base[0] + u[0] * s + v[0] * t + n[0] * d, base[1] + u[1] * s + v[1] * t + n[1] * d, base[2] + u[2] * s + v[2] * t + n[2] * d];
    const ribbon = (a, b, w, col, d0, depth) => {
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const A = [a[0] - dx * w, a[1] - dy * w], B = [b[0] + dx * w, b[1] + dy * w], px = -dy * w, py = dx * w;
      const c = [[A[0] - px, A[1] - py], [B[0] - px, B[1] - py], [B[0] + px, B[1] + py], [A[0] + px, A[1] + py]];
      const d1 = d0 + (depth || 0);
      mb.quad(P3(c[0][0], c[0][1], d1), P3(c[1][0], c[1][1], d1), P3(c[2][0], c[2][1], d1), P3(c[3][0], c[3][1], d1), col);
      if (depth) for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4]; mb.quad(P3(p[0], p[1], d0), P3(q[0], q[1], d0), P3(q[0], q[1], d1), P3(p[0], p[1], d1), U.shade(col, -0.3)); }
    };
    const pass = (w, colFn, d0, depth) => L.glyphs.forEach((gl, i) => {
      const col = colFn(i);
      gl.g.forEach(line => { for (let j = 0; j + 1 < line.length; j++) {
        const p = line[j], q = line[j + 1];
        const a = [(x0 + gl.x + (p[0] + slant * p[1]) * gl.k) * unit, (p[1] * gl.k - 3) * unit], b = [(x0 + gl.x + (q[0] + slant * q[1]) * gl.k) * unit, (q[1] * gl.k - 3) * unit];
        ribbon(a, b, w, col, d0, depth);
      } });
    });
    if (o.back) pass(hw * 1.9, () => o.back, off0, o.depth ? o.depth * 0.5 : 0);
    pass(hw, i => cols[(i + (o.shift || 0)) % cols.length], off0 + (o.back ? 0.004 : 0), o.depth || 0);
    return L.width * unit;
  };

  // ------------------------------------------------------------------ prop meshes
  // Each builder adds geometry to `mb` for a tile centred at (x, z) on floor height y, tile size s.
  // `nb` says which neighbours carry the same prop ({ ew, ns, e, w, n, s }); `o` is the map's per-tile
  // override (`props:` entry: col, col2, h, r, text ...) plus the build context: o.glow (unlit mesh
  // builder), o.water (blended mesh builder), o.light(p, col, radius) (baked point light), o.fire(p, size, col)
  // (a flickering flame). Props face south (+z, toward the default camera); `rot` turns them.
  const sh = U.shade;
  const P = FF7.field.props = {};
  const rnd = (x, z, k = 0) => U.hash(Math.floor(x * 7), Math.floor(z * 7), k);
  const NOP = { light() {}, fire() {} };
  const ctx = (o) => o && o.light ? o : Object.assign({}, NOP, o || {});
  const glowOf = (o, mb) => (o && o.glow) || mb;
  // draw into another mesh builder (the glow mesh) under mb's current local transform
  const withXf = (src, dst, fn) => { if (dst === src) { fn(dst); return; } dst.push(); dst.m = new Float32Array(src.m); fn(dst); dst.pop(); };
  // a beam of square/hexagonal section from a to b
  function beam(mb, a, b, r, col, n) {
    const d = V.sub(b, a), L = V.len(d); if (L < 1e-6) return;
    const k = V.norm(d);
    mb.push(); mb.translate(a[0], a[1], a[2]); mb.rotate(0, Math.atan2(k[0], k[2]), 0); mb.rotate(Math.acos(U.clamp(k[1], -1, 1)), 0, 0);
    mb.prism(0, 0, 0, r, r, L, n || 4, col, false, false, false); mb.pop();
  }
  FF7.field.beam = beam;
  // closed polygon (x, z) as seen from above in the winding MeshBuilder.extrude expects
  const ccw = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a > 0 ? pts.slice().reverse() : pts; };
  // ring of n points
  const ring = (x, z, r, n, a0 = 0) => { const out = []; for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2; out.push([x + Math.cos(a) * r, z + Math.sin(a) * r]); } return ccw(out); };
  // flat disc (n-gon) facing up; big discs are built as concentric rings (small triangles bake and
  // depth-sort better than one long fan)
  function disc(mb, x, y, z, r, n, col, a0) {
    const k = Math.min(8, Math.floor(r / 0.6));
    if (k >= 2) { const r0 = r / (k + 1); disc(mb, x, y, z, r0, n, col, a0); for (let i = 1; i <= k; i++) annulus(mb, x, y, z, r0 + (r - r0) * (i - 1) / k, r0 + (r - r0) * i / k, n, col, a0); return; }
    const p = ring(x, z, r, n, a0); for (let i = 1; i < n - 1; i++) mb.tri([p[0][0], y, p[0][1]], [p[i][0], y, p[i][1]], [p[i + 1][0], y, p[i + 1][1]], col);
  }
  // flat annulus facing up
  function annulus(mb, x, y, z, r0, r1, n, col, a0) { const a = ring(x, z, r0, n, a0), b = ring(x, z, r1, n, a0); for (let i = 0; i < n; i++) { const j = (i + 1) % n; mb.quad([a[i][0], y, a[i][1]], [b[i][0], y, b[i][1]], [b[j][0], y, b[j][1]], [a[j][0], y, a[j][1]], col); } }
  FF7.field.disc = disc;

  P.tree = (mb, x, y, z, s, th, nb, o = {}) => {
    const r = rnd(x, z), h = s * (3.2 + r * 1.6) * (o.h ? o.h / (s * 4) : 1);
    const leaf = o.col || (th.grass ? sh(th.grass[0], -0.15 + r * 0.1) : '#3a6a28');
    mb.prism(x, y, z, s * 0.12, s * 0.09, h * 0.45, 6, o.col2 || '#5a3a20');
    for (let i = 0; i < 3; i++) mb.prism(x, y + h * (0.3 + i * 0.22), z, s * (0.62 - i * 0.14), 0, h * 0.42, 7, sh(leaf, i * 0.07), false);
  };
  P.bush = (mb, x, y, z, s, th, nb, o = {}) => { const r = rnd(x, z); mb.sphere(x, y + s * 0.35, z, s * 0.5, s * 0.38, s * 0.5, o.col || sh(th.grass ? th.grass[0] : '#3a6a28', -0.1 + r * 0.1), 7, 4, false); };
  P.rock = (mb, x, y, z, s, th, nb, o = {}) => { const r = rnd(x, z); mb.sphere(x, y + s * 0.25, z, s * (0.45 + r * 0.1), s * (0.3 + r * 0.25), s * 0.45, o.col || sh(th.wall, -0.1 + r * 0.15), 6, 4, false); };
  P.crate = (mb, x, y, z, s, th, nb, o = {}) => { const r = rnd(x, z); const c = o.col || (r > 0.5 ? '#8a6a40' : '#7a5a36'); mb.box(x, y + s * 0.4, z, s * 0.82, s * 0.8, s * 0.82, { side: c, top: sh(c, 0.12), front: c }); mb.box(x, y + s * 0.4, z + s * 0.415, s * 0.82, s * 0.08, 0.01, sh(c, -0.3)); if (r > 0.7 && !o.flat) mb.box(x + s * 0.1, y + s * 1.1, z, s * 0.55, s * 0.6, s * 0.55, c); };
  P.barrel = (mb, x, y, z, s, th, nb, o = {}) => { const r = rnd(x, z); const c = o.col || (r > 0.5 ? '#6a4a30' : '#4a5a6a'); mb.prism(x, y, z, s * 0.34, s * 0.34, s * 0.9, 8, c, true); mb.prism(x, y + s * 0.2, z, s * 0.36, s * 0.36, s * 0.05, 8, sh(c, -0.3)); mb.prism(x, y + s * 0.65, z, s * 0.36, s * 0.36, s * 0.05, 8, sh(c, -0.3)); };
  P.pipes = (mb, x, y, z, s, th, nb, o = {}) => { const c = o.col || (th.metal ? th.metal[0] : '#5a6068'); for (let i = 0; i < 3; i++) { mb.push(); mb.translate(x, y + s * (0.3 + i * 0.55), z + (i - 1) * s * 0.18); mb.rotate(0, 0, Math.PI / 2); mb.prism(0, -s * 0.5, 0, s * 0.14, s * 0.14, s, 7, sh(c, i * 0.08), true); mb.pop(); } mb.box(x, y + s * 0.75, z, s * 0.15, s * 1.5, s * 0.15, sh(c, -0.3)); };
  P.machine = (mb, x, y, z, s, th, nb, o = {}) => { const c = o.col || (th.metal ? th.metal[1] : '#525860'); const r = rnd(x, z); mb.box(x, y + s * 0.7, z, s * 0.9, s * 1.4, s * 0.9, { side: c, top: sh(c, 0.15) }); mb.box(x, y + s * 1.0, z + s * 0.46, s * 0.5, s * 0.25, 0.01, r > 0.5 ? '#40d060' : '#d04030'); mb.box(x - s * 0.2, y + s * 0.5, z + s * 0.46, s * 0.12, s * 0.12, 0.01, '#f0c020'); mb.prism(x + s * 0.25, y + s * 1.4, z, s * 0.08, s * 0.08, s * 0.4, 6, sh(c, -0.2)); };
  // a counter: a run of counter tiles is one long counter (the body and its overhanging top carry on across the tiles,
  // ending only where the run does), plank seams down its faces and a dark kick at the foot
  P.counter = (mb, x, y, z, s, th, nb = {}, o = {}) => {
    const c = o.col || (th.wood ? th.wood[0] : '#8a6038'), top = o.col2 || sh(c, 0.2), H = s * 0.9;
    const ns = (nb.runNS || 0) > (nb.runEW || 0), a = ns ? nb.n : nb.w, b = ns ? nb.s : nb.e;   // run continues before / after
    const L0 = a ? -s / 2 : -s * 0.46, L1 = b ? s / 2 : s * 0.46, len = L1 - L0, mid = (L0 + L1) / 2, D = s * 0.72;
    const box = (u, yy, w, h, d, col) => ns ? mb.box(x, yy, z + u, d, h, w, col) : mb.box(x + u, yy, z, w, h, d, col);
    box(mid, y + s * 0.05, len, s * 0.1, D - s * 0.08, sh(c, -0.45));                                          // kick
    box(mid, y + s * 0.1 + (H - s * 0.16) / 2, len, H - s * 0.16, D, { side: sh(c, -0.1), top: c, front: c });  // body
    box(mid, y + H - s * 0.03, len + (a ? 0 : s * 0.04) + (b ? 0 : s * 0.04), s * 0.08, D + s * 0.14, { side: sh(top, -0.12), top });   // the top
    for (let u = Math.ceil((L0 + 0.001) / (s * 0.25)) * s * 0.25; u < L1 - 0.01; u += s * 0.25)                   // plank seams, both faces
      [-1, 1].forEach(k => ns ? mb.box(x + k * (D / 2 + 0.002), y + s * 0.1 + (H - s * 0.16) / 2, z + u, 0.004, H - s * 0.2, 0.012, sh(c, -0.4))
                             : mb.box(x + u, y + s * 0.1 + (H - s * 0.16) / 2, z + k * (D / 2 + 0.002), 0.012, H - s * 0.2, 0.004, sh(c, -0.4)));
  };
  P.table = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || (th.wood ? th.wood[1] : '#825830');
    if (o.style === 'planks') {   // a rough plank table (7th Heaven): five boards with gaps, chunky legs and a stretcher
      for (let i = 0; i < 5; i++) mb.box(x, y + s * 0.62, z - s * 0.4 + i * s * 0.2, s * 0.96, s * 0.08, s * 0.18, sh(c, (rnd(x, z, i) - 0.5) * 0.2 + 0.05));
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => mb.box(x + a * s * 0.36, y + s * 0.29, z + b * s * 0.34, s * 0.11, s * 0.58, s * 0.11, sh(c, -0.25)));
      [-1, 1].forEach(a => mb.box(x + a * s * 0.36, y + s * 0.18, z, s * 0.07, s * 0.07, s * 0.62, sh(c, -0.3)));
      return;
    }
    mb.box(x, y + s * 0.62, z, s * 0.9, s * 0.08, s * 0.9, sh(c, 0.1)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => mb.box(x + a * s * 0.36, y + s * 0.3, z + b * s * 0.36, s * 0.07, s * 0.6, s * 0.07, sh(c, -0.2))); };
  P.chair = (mb, x, y, z, s, th, nb, o = {}) => { const c = o.col || (th.wood ? th.wood[0] : '#8a6038'); mb.box(x, y + s * 0.4, z, s * 0.5, s * 0.06, s * 0.5, c); mb.box(x, y + s * 0.7, z - s * 0.22, s * 0.5, s * 0.55, s * 0.06, c); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => mb.box(x + a * s * 0.2, y + s * 0.2, z + b * s * 0.2, s * 0.05, s * 0.4, s * 0.05, sh(c, -0.2))); };
  P.bed = (mb, x, y, z, s, th, nb, o = {}) => { mb.box(x, y + s * 0.25, z, s * 0.9, s * 0.5, s * 0.95, o.col2 || '#6a4a30'); mb.box(x, y + s * 0.52, z + s * 0.08, s * 0.85, s * 0.08, s * 0.8, o.col || '#e0e0e8'); mb.box(x, y + s * 0.56, z - s * 0.3, s * 0.5, s * 0.1, s * 0.22, '#f0f0f0'); };
  P.bookshelf = (mb, x, y, z, s, th, nb, o = {}) => { const c = o.col || '#6a4a2a'; mb.box(x, y + s * 1.0, z, s * 0.95, s * 2.0, s * 0.5, c); for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) mb.box(x - s * 0.33 + k * s * 0.22, y + s * (0.3 + i * 0.45), z + s * 0.2, s * 0.16, s * 0.3, s * 0.12, ['#a03020', '#2040a0', '#308030', '#c0a040'][(i + k) % 4]); };
  // lamp post: the bulb glows in look.lamp (or the override colour) and bakes a light of that colour
  P.lamp = (mb, x, y, z, s, th, nb, o = {}) => {
    o = ctx(o); const bulb = o.col || th.lamp || '#fff0b0', post = o.col2 || th.lampPost || '#3a3a40';
    mb.prism(x, y, z, s * 0.06, s * 0.05, s * 3.0, 6, post); mb.box(x, y + s * 3.05, z, s * 0.3, s * 0.15, s * 0.3, sh(post, -0.2));
    glowOf(o, mb).box(x, y + s * 2.9, z, s * 0.24, s * 0.18, s * 0.24, bulb);
    o.light([x, y + 1, z], o.col || th.lamp ? bulb : [1.35, 1.2, 0.9], 2.2);
  };
  P.pillar = (mb, x, y, z, s, th, nb, o = {}) => { const c = o.col || sh(th.wall, 0.05), h = o.h || th.wallH || 2.4; mb.prism(x, y, z, s * 0.34, s * 0.3, h, 8, c, true); mb.box(x, y + h - s * 0.1, z, s * 0.8, s * 0.2, s * 0.8, o.col2 || th.trim || sh(th.wall, -0.3)); mb.box(x, y + s * 0.1, z, s * 0.8, s * 0.2, s * 0.8, o.col2 || th.trim || sh(th.wall, -0.3)); };
  P.rubble = (mb, x, y, z, s, th, nb, o = {}) => { for (let i = 0; i < 5; i++) { const r = rnd(x, z, i), r2 = rnd(x, z, i + 9); mb.push(); mb.translate(x + (r - 0.5) * s * 0.7, y + s * 0.12, z + (r2 - 0.5) * s * 0.7); mb.rotate(r * 2, r2 * 3, r * r2); mb.box(0, 0, 0, s * (0.2 + r * 0.3), s * (0.15 + r2 * 0.3), s * (0.2 + r2 * 0.25), i % 2 ? sh(o.col || th.wall, -0.2) : (o.col2 || '#5a5048')); mb.pop(); } };
  P.vending = (mb, x, y, z, s, th, nb, o = {}) => { const c = o.col || '#c03030'; mb.box(x, y + s * 0.9, z, s * 0.8, s * 1.8, s * 0.6, { side: c, top: c, front: sh(c, 0.08) }); mb.box(x, y + s * 1.2, z + s * 0.31, s * 0.6, s * 0.7, 0.01, '#f0f0c0'); };
  P.terminal = (mb, x, y, z, s, th, nb, o = {}) => { mb.box(x, y + s * 0.4, z, s * 0.8, s * 0.8, s * 0.6, o.col2 || '#5a6070'); mb.push(); mb.translate(x, y + s * 1.0, z - s * 0.05); mb.rotate(-0.25, 0, 0); mb.box(0, 0, 0, s * 0.7, s * 0.5, s * 0.1, '#3a4050'); withXf(mb, glowOf(o, mb), gm => gm.box(0, 0, s * 0.055, s * 0.58, s * 0.38, 0.01, o.col || '#40c0a0')); mb.pop(); };
  P.tower = (mb, x, y, z, s, th, nb, o = {}) => { const h = o.h || s * (6 + rnd(x, z) * 4), c = o.col || th.wall; mb.box(x, y + h / 2, z, s * 1.02, h, s * 1.02, { side: sh(c, -0.1), top: th.wallTop, front: sh(c, 0.05) }); for (let i = 1; i < h / s; i += 1.3) mb.box(x, y + i * s, z + s * 0.515, s * 0.5, s * 0.3, 0.01, rnd(x, z, i) > 0.5 ? '#f0d890' : '#303848'); };
  P.train = (mb, x, y, z, s, th, nb, o = {}) => { const c = o.col || '#6a7a6a'; mb.box(x, y + s * 1.1, z, s * 1.02, s * 1.8, s * 1.02, { side: c, top: sh(c, -0.2), front: sh(c, 0.1) }); mb.box(x, y + s * 1.4, z + s * 0.515, s * 0.7, s * 0.5, 0.01, '#a0c0d0'); mb.box(x, y + s * 0.25, z, s * 1.02, s * 0.3, s * 1.02, '#303030'); };
  P.sign = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#c0a060'; mb.prism(x, y, z, s * 0.04, s * 0.04, s * 1.0, 5, o.col2 || '#5a4030'); mb.box(x, y + s * 1.05, z, s * 0.7, s * 0.4, s * 0.06, c);
    if (o.text) FF7.field.text3d(mb, o.text, { pos: [x, y + s * 1.05, z + s * 0.035], size: Math.min(s * 0.22, s * 0.62 / Math.max(1, FF7.field.textWidth(o.text, 1))), col: o.textCol || '#3a2410', w: 0.18 });
  };
  P.jar = (mb, x, y, z, s, th, nb, o = {}) => { const c = o.col || th.jar || '#a06a40'; mb.sphere(x, y + s * 0.3, z, s * 0.25, s * 0.3, s * 0.25, c, 7, 5, true); mb.prism(x, y + s * 0.55, z, s * 0.12, s * 0.14, s * 0.12, 7, sh(c, -0.15)); };
  P.statue = (mb, x, y, z, s, th, nb, o = {}) => { const c = o.col || sh(th.wall, 0.2); mb.box(x, y + s * 0.25, z, s * 0.8, s * 0.5, s * 0.8, o.col2 || sh(th.wall, 0.1)); mb.prism(x, y + s * 0.5, z, s * 0.22, s * 0.18, s * 1.3, 6, c, true); mb.sphere(x, y + s * 1.95, z, s * 0.2, s * 0.22, s * 0.2, c, 6, 4); };
  P.cabinet = (mb, x, y, z, s, th, nb, o = {}) => { mb.box(x, y + s * 0.7, z, s * 0.9, s * 1.4, s * 0.55, o.col || '#7a8088'); mb.box(x, y + s * 0.7, z + s * 0.28, 0.01, s * 1.3, 0.01, '#303038'); };
  P.pod = (mb, x, y, z, s, th, nb, o = {}) => { mb.prism(x, y, z, s * 0.44, s * 0.44, s * 0.3, 8, '#505860'); mb.prism(x, y + s * 2.1, z, s * 0.44, s * 0.3, s * 0.3, 8, '#505860'); glowOf(o, mb).prism(x, y + s * 0.3, z, s * 0.38, s * 0.38, s * 1.8, 8, o.col || th.mako || '#40f080'); };
  P.fireplace = (mb, x, y, z, s, th, nb, o = {}) => { o = ctx(o); mb.box(x, y + s * 0.6, z, s * 1.0, s * 1.2, s * 0.6, o.col2 || '#8a7a6a'); glowOf(o, mb).box(x, y + s * 0.35, z + s * 0.31, s * 0.5, s * 0.45, 0.01, o.col || '#f08020'); };
  P.vine = (mb, x, y, z, s, th, nb, o = {}) => { const c = o.col || '#3a6a28', h = o.h || th.wallH || 2.2; mb.box(x, y + h / 2, z, s, h, s, { side: c, top: sh(c, -0.15), front: sh(c, 0.06) }); };
  P.well = (mb, x, y, z, s, th, nb, o = {}) => { mb.prism(x, y, z, s * 0.48, s * 0.48, s * 0.5, 8, o.col2 || sh(th.wall, 0.1)); mb.prism(x, y + s * 0.45, z, s * 0.36, s * 0.36, s * 0.06, 8, o.col || th.water || '#2a5a8a'); };
  P.stump = (mb, x, y, z, s, th, nb, o = {}) => { mb.prism(x, y, z, s * 0.3, s * 0.26, s * 0.4, 7, o.col || '#6a4a28'); };
  P.tent = (mb, x, y, z, s, th, nb, o = {}) => { mb.prism(x, y, z, s * 0.7, 0, s * 1.4, 4, o.col || '#a09060'); };
  P.crystal = (mb, x, y, z, s, th, nb, o = {}) => { const r = rnd(x, z), c = o.col || '#80c0f0'; mb.spike([x, y, z], [0.2 * (r - 0.5), 1, 0.1], s * (1.2 + r), s * 0.3, 5, c); mb.spike([x + s * 0.2, y, z], [0.5, 1, 0], s * 0.8, s * 0.2, 5, sh(c, 0.2)); };
  // neon sign on a dark board; with o.text the letters are real neon tubes (o.col, 'rainbow' or a list)
  P.neon = (mb, x, y, z, s, th, nb, o = {}) => {
    const gm = glowOf(o, mb), hy = o.y != null ? o.y : s * 2.4;
    if (!o.text) { mb.box(x, y + hy, z, s * 0.95, s * 0.6, s * 0.2, o.col2 || '#202020'); gm.box(x, y + hy, z + s * 0.11, s * 0.8, s * 0.4, 0.01, o.col || ['#f040a0', '#40f0f0', '#f0e040'][Math.floor(Math.abs(x * 2 + z * 2 + 0.5)) % 3]); return; }
    const size = o.size || s * 0.34, tw = FF7.field.textWidth(o.text, size);
    if (o.board !== false) mb.box(x, y + hy, z - s * 0.04, tw + size * 0.9, size * 1.8, s * 0.08, o.col2 || '#1c1a1e');
    FF7.field.text3d(gm, o.text, { pos: [x, y + hy, z + 0.002], size, col: o.col || '#ff60c0', w: o.w || 0.16, italic: o.italic });
    if (o.light) o.light([x, y + hy, z + 0.3], Array.isArray(o.col) ? o.col[0] : o.col === 'rainbow' ? '#ffb0e0' : (o.col || '#ff60c0'), 2);
  };
  P.rail = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || th.trim || '#40404a', hy = y + s * 0.9;
    if (nb.ew && !nb.ns) mb.box(x, hy, z, s, s * 0.07, s * 0.08, c);
    else if (nb.ns && !nb.ew) mb.box(x, hy, z, s * 0.08, s * 0.07, s, c);
    else {   // corner / junction: one bar out to each connected side (not a slab)
      if (nb.e) mb.box(x + s * 0.25, hy, z, s * 0.5, s * 0.07, s * 0.08, c); if (nb.w) mb.box(x - s * 0.25, hy, z, s * 0.5, s * 0.07, s * 0.08, c);
      if (nb.s) mb.box(x, hy, z + s * 0.25, s * 0.08, s * 0.07, s * 0.5, c); if (nb.n) mb.box(x, hy, z - s * 0.25, s * 0.08, s * 0.07, s * 0.5, c);
    }
    mb.box(x, y + s * 0.45, z, s * 0.08, s * 0.9, s * 0.08, c);
  };
  // floor decorations (walkable)
  // rail tiles: the rails run along the band of rail tiles (east-west where it runs further that way), sleepers across
  P.rails = (mb, x, y, z, s, th, nb = {}) => {
    mb.push(); mb.translate(x, y, z); if ((nb.runEW || 0) > (nb.runNS || 0)) mb.rotate(0, Math.PI / 2, 0);
    mb.box(-s * 0.22, 0.02, 0, s * 0.06, 0.04, s, '#707070'); mb.box(s * 0.22, 0.02, 0, s * 0.06, 0.04, s, '#707070');
    for (let i = 0; i < 2; i++) mb.box(0, 0.008, -s * 0.25 + i * s * 0.5, s * 0.8, 0.015, s * 0.12, '#4a3a2a');
    mb.pop();
  };
  // a straight railway line along x, o.len tiles from the tile's west edge: two rails o.gauge m apart (default 1.04,
  // the Midgar train's wheels) on sleepers. o.col rails, o.col2 sleepers (the Train Graveyard's rusted main line)
  P.track = (mb, x, y, z, s, th, nb, o = {}) => {
    const L = (o.len || 1) * s, x0 = x - s / 2, g = (o.gauge || 1.04) / 2, rail = o.col || '#6e6660', tie = o.col2 || '#3a3028';
    for (let d = 0.3; d < L; d += 0.6) { const r = rnd(x0 + d, z, 3); mb.box(x0 + d, y + 0.015, z + (r - 0.5) * 0.05, 0.2, 0.03, g * 2 + 0.36, sh(tie, (r - 0.5) * 0.14)); }
    [-1, 1].forEach(k => mb.box(x0 + L / 2, y + 0.05, z + k * g, L, 0.05, 0.06, { side: sh(rail, -0.25), top: sh(rail, 0.3) }));
  };
  P.grate = (mb, x, y, z, s, th) => { for (let i = 0; i < 3; i++) mb.box(x, y + 0.006, z - s * 0.33 + i * s * 0.33, s * 0.96, 0.01, 0.015, '#2a2e34'); };
  P.flowers = (mb, x, y, z, s, th) => { for (let i = 0; i < 6; i++) { const r = rnd(x, z, i), r2 = rnd(x, z, i + 5); mb.box(x + (r - 0.5) * s * 0.8, y + 0.04, z + (r2 - 0.5) * s * 0.8, s * 0.1, 0.06, s * 0.1, ['#f0e040', '#f0f0f0', '#f080a0', '#e04040'][i % 4]); mb.box(x + (r - 0.5) * s * 0.8, y + 0.02, z + (r2 - 0.5) * s * 0.8 + s * 0.06, s * 0.12, 0.02, s * 0.1, '#3a7a28'); } };
  P.tallgrass = (mb, x, y, z, s, th) => { for (let i = 0; i < 4; i++) { const r = rnd(x, z, i), r2 = rnd(x, z, i + 5); mb.spike([x + (r - 0.5) * s * 0.8, y, z + (r2 - 0.5) * s * 0.8], [r - 0.5, 1, r2 - 0.5], s * (0.4 + r * 0.3), s * 0.06, 3, sh(th.grass ? th.grass[0] : '#4a7a30', 0.1)); } };
  P.stairs = () => {};   // stairs are real stepped geometry now (fieldgeo stairMesh)
  P.catwalk = (mb, x, y, z, s, th) => { mb.box(x, y + 0.005, z, s * 0.9, 0.01, s * 0.9, '#3a4048'); };
  P.bridge = (mb, x, y, z, s, th) => { const w = th.wood || ['#8a6a3a', '#7a5a32']; for (let i = 0; i < 4; i++) mb.box(x, y + 0.02, z - s * 0.375 + i * s * 0.25, s * 0.98, 0.04, s * 0.2, sh(w[i % 2], 0.08)); };
  P.elevatorfloor = (mb, x, y, z, s, th) => { mb.box(x, y + 0.006, z, s * 0.9, 0.01, s * 0.9, '#707880'); };
  // ladder against the wall on side o.face ('n' | 's' | 'e' | 'w'), from y up o.h metres; the rails run on
  // past the top so it can be climbed over the edge
  P.ladder = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || th.ladder || '#8a8a8a', h = o.h || s * 3, f = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[o.face || 'n'], sd = [-f[1], f[0]];
    const d = s * 0.5 - 0.06, P2 = (v, yy) => [x + f[0] * d + sd[0] * v, yy, z + f[1] * d + sd[1] * v];
    [-1, 1].forEach(k => beam(mb, P2(k * s * 0.3, y), P2(k * s * 0.3, y + h + 0.32), 0.022, c, 4));
    const n = Math.max(3, Math.round(h / 0.28));
    for (let i = 1; i <= n; i++) { const yy = y + (h + 0.15) * i / (n + 0.5); beam(mb, P2(-s * 0.3, yy), P2(s * 0.3, yy), 0.016, sh(c, 0.1), 4); }
  };
  P.door = null;
  P.window = null;
  P.waterfall = (mb, x, y, z, s, th) => { mb.box(x, y + s * 1.5, z - s * 0.3, s, s * 3, s * 0.1, th.water || '#4a88c0'); };
  // yellow/black diagonal hazard stripes over the tile (look.hazard = [yellow, black])
  P.hazard = (mb, x, y, z, s, th, nb, o = {}) => {
    const cols = o.col ? [o.col, o.col2 || '#1a1a1a'] : (th.hazard || ['#d0a818', '#1a1a1a']);
    const x0 = x - s / 2, z0 = z - s / 2, n = 4, band = s * 2 / n;
    // clip the tile square to each diagonal band u0 <= (px - x0) + (pz - z0) < u1
    const clip = (poly, k, c) => { const out = []; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; const dp = k * (p[0] - x0 + p[1] - z0 - c), dq = k * (q[0] - x0 + q[1] - z0 - c); if (dp >= 0) out.push(p); if ((dp >= 0) !== (dq >= 0)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } } return out; };
    const sq = [[x0, z0], [x0, z0 + s], [x0 + s, z0 + s], [x0 + s, z0]];
    const ph = Math.floor((x0 + z0) / band + 1000.5);   // continuous across tiles
    for (let i = -1; i <= n; i++) {
      const u0 = (Math.floor((x0 + z0) / band) + i) * band - (x0 + z0), u1 = u0 + band;
      const poly = clip(clip(sq, 1, u0), -1, u1); if (poly.length < 3) continue;
      const c = cols[(i + ph) & 1];
      for (let k = 1; k + 1 < poly.length; k++) mb.tri([poly[0][0], y + 0.004, poly[0][1]], [poly[k][0], y + 0.004, poly[k][1]], [poly[k + 1][0], y + 0.004, poly[k + 1][1]], c);
    }
  };

  // ------------------------------------------------------------------ Reactor No.1's gate (md1_gate)
  // a band of yellow/black diagonal stripes on a south-facing plane at z, x0..x1 by y0..y1
  const clipX = (poly, k, c) => { const out = []; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], dp = k * (p[0] - c), dq = k * (q[0] - c); if (dp >= 0) out.push(p); if ((dp >= 0) !== (dq >= 0)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } } return out; };
  function stripesS(mb, x0, x1, y0, y1, z, cols, c0 = x0, c1 = x1) {   // (c0..c1: only that much of it shows)
    const h = y1 - y0, w = h * 0.7, a = Math.max(x0, c0), b = Math.min(x1, c1);
    if (b - a < 0.002) return;
    mb.quad([a, y0, z], [b, y0, z], [b, y1, z], [a, y1, z], cols[0]);
    for (let u = x0 - h; u < x1; u += w * 2) {
      const p = clipX(clipX([[u, y0], [u + w, y0], [u + w + h, y1], [u + h, y1]], 1, a), -1, b);
      for (let k = 1; k + 1 < p.length; k++) mb.tri([p[0][0], p[0][1], z + 0.003], [p[k][0], p[k][1], z + 0.003], [p[k + 1][0], p[k + 1][1], z + 0.003], cols[1]);
    }
  }
  // The gate itself: a props entry on the middle one of three floor tiles in a wall row. Dark behind the doors (a
  // `reactorgatedoors` object, which slide into the walls); over the opening a header standing proud of the walls, with
  // hazard stripes, the reactor's sign and two red warning lamps. o.h: the opening's height
  P.reactorgate = (mb, x, y, z, s, th, nb, o = {}) => {
    o = ctx(o);
    const W = s * 1.5, zb = z - s / 2, zf = z + s / 2, Hd = o.h || 1.95, top = (th.wallH || 2.6) + 0.3;
    const steel = th.trim || '#303840', wall = th.wall || '#56606a', cols = th.hazard || ['#d0a818', '#1a1a1a'], gm = glowOf(o, mb);
    mb.quad([x - W, y, zb + 0.035], [x + W, y, zb + 0.035], [x + W, y + Hd, zb + 0.035], [x - W, y + Hd, zb + 0.035], '#060909');   // the dark way in
    mb.box(x, y + 0.008, zb + 0.07, W * 2, 0.016, 0.07, sh(steel, -0.25));                                                            // the door track
    [-1, 1].forEach(k => mb.box(x + k * (W - 0.03), y + Hd / 2, z, 0.06, Hd, s, sh(steel, 0.08)));                                   // the jambs
    // the header
    const hz = z + 0.03, hd = s + 0.06, hf = hz + hd / 2;
    mb.box(x, y + (Hd + top) / 2, hz, W * 2 + 0.34, top - Hd, hd, { side: sh(wall, -0.14), top: sh(wall, 0.06), front: sh(wall, -0.04) });
    stripesS(mb, x - W - 0.17, x + W + 0.17, y + Hd + 0.02, y + Hd + 0.17, hf + 0.002, cols);
    stripesS(mb, x - W - 0.17, x + W + 0.17, y + top - 0.1, y + top - 0.02, hf + 0.002, cols);
    // the sign: the lettering sized to sit inside the green with a margin all round (text3d centres it on pos)
    const sy0 = y + Hd + 0.24, sy1 = y + top - 0.16, sw = W * 2 - 0.1, label = o.text || 'No.1 REACTOR';
    mb.box(x, (sy0 + sy1) / 2, hf + 0.01, sw, sy1 - sy0 + 0.05, 0.02, '#c8ccc4');
    mb.box(x, (sy0 + sy1) / 2, hf + 0.021, sw - 0.05, sy1 - sy0, 0.004, '#1e5a3a');
    const tsz = Math.min((sy1 - sy0) * 0.42, (sw - 0.22) / FF7.field.textWidth(label, 1));
    FF7.field.text3d(mb, label, { pos: [x, (sy0 + sy1) / 2, hf + 0.024], size: tsz, col: '#d8f0d8', align: 'center' });
    // the warning lamps on the header's corners
    [-1, 1].forEach(k => {
      const lx = x + k * (W + 0.05), ly = y + top;
      mb.box(lx, ly + 0.03, hf - 0.1, 0.14, 0.06, 0.14, '#2a2e32');
      gm.box(lx, ly + 0.11, hf - 0.1, 0.1, 0.1, 0.1, '#ff3a24');
      o.light([lx, ly + 0.2, hf + 0.1], '#ff3a24', 1.4);
    });
  };
  // its two doors (a field object on the gate's middle tile): o.open 0 (shut) .. 1 (slid into the walls either side);
  // the lock on the right door's edge shows red, green once o.unlocked. The same doors serve other Shinra doorways:
  // o.halfW (each door's width), o.h, o.zOff (off the wall line behind), o.pocket (the part slid past the frame isn't
  // drawn: doors that slide into a wall that is only a face), o.lock 'wall' (a scanner on the wall beside, at o.lockY)
  P.reactorgatedoors = (mb, x, y, z, s, th, nb, o = {}) => {
    const W = o.halfW || s * 1.5, Hd = (o.h || 1.95) - 0.02, zd = z - s / 2 + (o.zOff != null ? o.zOff : 0.075), k = U.clamp(o.open || 0, 0, 1);
    const plate = '#6a727a', rib = '#474f57', cols = th.hazard || ['#d0a818', '#1a1a1a'];
    [-1, 1].forEach(side => {
      const xin = x + side * k * W, dx0 = side < 0 ? xin - W : xin, dx1 = side < 0 ? xin : xin + W;
      const x0 = o.pocket ? Math.max(dx0, x - W) : dx0, x1 = o.pocket ? Math.min(dx1, x + W) : dx1, cx = (x0 + x1) / 2, dw = x1 - x0;
      if (dw < 0.004) return;
      mb.box(cx, y + Hd / 2, zd, dw, Hd, 0.05, { side: rib, top: rib, front: plate, back: rib });
      for (let i = 1; i <= 4; i++) if (dw > 0.06) mb.box(cx, y + 0.3 + (Hd - 0.3) * i / 5, zd + 0.03, dw - 0.05, 0.04, 0.014, rib);
      stripesS(mb, dx0 + 0.02, dx1 - 0.02, y + 0.06, y + 0.24, zd + 0.027, cols, x0 + 0.02, x1 - 0.02);
      if (side < 0 ? x1 === dx1 : x0 === dx0) mb.box(side < 0 ? x1 - 0.012 : x0 + 0.012, y + Hd / 2, zd + 0.03, 0.024, Hd, 0.014, sh(rib, -0.3));   // the meeting edge
    });
    const wall = o.lock === 'wall', lx = wall ? x + W + 0.16 : x + k * W + 0.1, ly = wall ? (o.lockY || 1.1) : 0.62;
    mb.box(lx, y + ly, zd + 0.05, 0.12, 0.22, 0.05, '#262c32');
    mb.box(lx, y + ly + 0.06, zd + 0.077, 0.07, 0.04, 0.004, o.unlocked ? '#40ff70' : '#ff3828');
    mb.box(lx, y + ly - 0.04, zd + 0.077, 0.07, 0.07, 0.004, '#8a9aa0');
  };
  // Reactor No.1's core (md1_core, after 01-midgar_013 / 014). The valve at the walkway's end, where the bomb goes: a
  // housing with a big round bronze hatch and its gear wheel facing the walkway, pipes coming down into it from the dark
  P.corevalve = (mb, x, y, z, s, th, nb, o = {}) => {
    const bz = z - s * 0.1, hub = y + 0.7, R = 0.42, brass = '#8a6a3c', rust = '#5a4634', teal = '#35585a';
    mb.box(x, y + 0.65, bz, 1.0, 1.3, 0.42, { side: sh(rust, -0.15), top: sh(rust, 0.1), front: rust });
    const fz = bz + 0.21;
    const disc = (r, d, col, n) => { mb.push(); mb.translate(x, hub, fz); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, 0, 0, r, r, d, n || 16, col, false); mb.pop(); };
    disc(R + 0.04, 0.04, sh(rust, -0.3));
    disc(R, 0.07, brass);
    for (let i = 0; i < 12; i++) {   // the gear's teeth
      const a = i / 12 * Math.PI * 2;
      mb.push(); mb.translate(x + Math.cos(a) * (R + 0.02), hub + Math.sin(a) * (R + 0.02), fz + 0.035); mb.rotate(0, 0, a); mb.box(0, 0, 0, 0.08, 0.07, 0.05, sh(brass, -0.12)); mb.pop();
    }
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; mb.push(); mb.translate(x, hub, fz + 0.075); mb.rotate(0, 0, a); mb.box(0, 0, 0, R * 1.7, 0.05, 0.02, sh(brass, -0.25)); mb.pop(); }   // spokes
    disc(0.1, 0.12, sh(brass, 0.15), 10);
    // the pipes, down out of the dark into the housing's top and sides
    [[-0.36, 0.1], [-0.14, 0.13], [0.12, 0.12], [0.36, 0.1]].forEach(([dx, r], i) => mb.prism(x + dx, y + 1.3, bz - 0.05 + (i % 2) * 0.06, r, r, 3.2, 10, sh(teal, i % 2 ? -0.08 : 0.04), true));
    [-1, 1].forEach(k => { mb.push(); mb.translate(x + k * 0.5, y + 0.9, bz); mb.rotate(0, 0, -k * Math.PI / 2); mb.prism(0, 0, 0, 0.09, 0.09, 0.8, 10, teal, true); mb.pop(); });
  };
  // a huge pipe lying along the prop's x (rot turns it), o.len tiles from the tile's west edge, radius o.r, flanged
  P.corepipe = (mb, x, y, z, s, th, nb, o = {}) => {
    const L = (o.len || 4) * s, r = o.r || 0.7, x0 = x - s / 2, c = o.col || '#1c2828', cy = y + r;
    mb.push(); mb.translate(x0, cy, z); mb.rotate(0, 0, -Math.PI / 2); mb.prism(0, 0, 0, r, r, L, 14, c, true); mb.pop();
    for (let d = 0.8; d < L; d += 2.2) { mb.push(); mb.translate(x0 + d, cy, z); mb.rotate(0, 0, -Math.PI / 2); mb.prism(0, 0, 0, r + 0.06, r + 0.06, 0.16, 14, sh(c, 0.12), true); mb.pop(); }
  };
  // the mako far down the pit: a glowing sheet o.w by o.d tiles (placed deep with y0), unlit so it glows through the dark
  P.makopit = (mb, x, y, z, s, th, nb, o = {}) => {
    const gm = glowOf(o, mb), hw = (o.w || 8) * s / 2, hd = (o.d || 8) * s / 2;
    gm.floor(x - hw, z - hd, x + hw, z + hd, y, o.col || '#1a6a44');
  };

  // ------------------------------------------------------------------ Cait Sith's hideout (js/maps/extra/cait_hideout.js)
  // Its door in Wonder Square's back wall, behind the Crystal Fortune booth: a field object on the tile in front, drawn
  // only once the booth has been moved (o.shown). A squat purple door in a gold frame, a porthole with a paw print, a
  // hand-painted KEEP OUT and a little crown on top
  P.caitdoor = (mb, x, y, z, s, th, nb, o = {}) => {
    if (!o.shown) return;
    const zf = z - s / 2 + 0.012, W = s * 0.9, H = s * 2.8, gold = '#d8a840', pan = '#4a2a68';
    mb.box(x, y + H / 2, zf, W + s * 0.14, H + s * 0.08, 0.02, sh(gold, -0.12));
    mb.box(x, y + H / 2 - s * 0.02, zf + 0.012, W, H - s * 0.04, 0.02, { front: pan, side: sh(pan, -0.2), top: sh(pan, -0.2) });
    [0.3, 0.6].forEach(k => mb.box(x, y + H * k, zf + 0.024, W * 0.8, s * 0.03, 0.006, sh(pan, 0.15)));
    const disc = (r, dz, col) => { mb.push(); mb.translate(x, y + H * 0.8, zf + 0.022 + dz); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, 0, 0, r, r, 0.008, 12, col, false); mb.pop(); };
    disc(s * 0.17, 0, gold); disc(s * 0.13, 0.004, '#2a1a40');
    [[0, -0.03, 0.07], [-0.07, 0.04, 0.035], [-0.025, 0.07, 0.035], [0.025, 0.07, 0.035], [0.07, 0.04, 0.035]].forEach(([dx, dy, r]) =>
      mb.box(x + dx * s, y + H * 0.8 + dy * s, zf + 0.036, r * s, r * s, 0.004, '#f0a0c0'));   // the paw
    mb.sphere(x + W * 0.33, y + H * 0.45, zf + 0.04, s * 0.04, s * 0.04, s * 0.03, gold, 6, 4, true);   // the knob
    mb.box(x, y + H * 0.52, zf + 0.03, W * 0.7, s * 0.16, 0.008, '#e8dcc0');
    FF7.field.text3d(mb, 'KEEP OUT', { pos: [x, y + H * 0.52, zf + 0.036], size: s * 0.07, col: '#c02020', align: 'center', w: 0.2 });
    [-0.14, 0, 0.14].forEach(a => mb.spike([x + a * s, y + H + s * 0.06, zf + 0.01], [a, 1, 0], s * 0.14, s * 0.035, 4, gold));
  };
  // a wall of tools (hung on a wall tile's face): a pegboard with a spanner, a hammer, screwdrivers, pliers and, on a
  // peg of its own, a spare crown
  P.pegboard = (mb, x, y, z, s, th, nb, o = {}) => {
    const W = s * 1.7, H = s * 1.3, cy = y + s * 1.55, zb = z + 0.012, board = o.col || '#a8845a';
    mb.box(x, cy, zb, W, H, 0.02, { front: board, side: sh(board, -0.2) });
    for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) mb.box(x - W * 0.45 + i * W * 0.15, cy - H * 0.42 + j * H * 0.21, zb + 0.011, 0.012, 0.012, 0.002, sh(board, -0.4));
    const tool = (dx, dy, w, h, col) => mb.box(x + dx * s, cy + dy * s, zb + 0.016, w * s, h * s, 0.008, col);
    tool(-0.6, 0.02, 0.06, 0.5, '#8a8a92'); tool(-0.6, 0.3, 0.16, 0.08, '#8a8a92');     // spanner
    tool(-0.32, 0.0, 0.05, 0.46, '#7a5030'); tool(-0.32, 0.25, 0.22, 0.09, '#5a5a62');  // hammer
    tool(-0.08, -0.04, 0.035, 0.34, '#c03030'); tool(-0.08, 0.2, 0.012, 0.16, '#9a9aa2');
    tool(0.04, -0.04, 0.035, 0.34, '#e0c020'); tool(0.04, 0.2, 0.012, 0.16, '#9a9aa2');  // screwdrivers
    tool(0.24, 0.0, 0.04, 0.3, '#3a6ac0'); tool(0.32, 0.0, 0.04, 0.3, '#3a6ac0'); tool(0.28, 0.2, 0.1, 0.12, '#8a8a92');   // pliers
    tool(0.0, -0.46, 1.4, 0.05, '#6a5030');                                             // the ledge
    [-0.08, 0, 0.08].forEach(a => mb.spike([x + (0.58 + a) * s, cy + 0.26 * s, zb + 0.02], [a, 1, 0], s * 0.1, s * 0.025, 4, '#d8a840'));   // a spare crown
    mb.box(x + 0.58 * s, cy + 0.24 * s, zb + 0.02, s * 0.22, s * 0.05, 0.01, '#d8a840');
  };
  // shelves of toy moogles from every corner of the world: little white figures with bat wings, antennae and pompoms
  P.toyshelf = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#6a4a2a', zb = z - s * 0.28;
    mb.box(x, y + s * 1.1, zb - s * 0.15, s * 0.98, s * 2.2, s * 0.06, sh(c, -0.25));
    [0.05, 0.6, 1.15, 1.7].forEach(h => mb.box(x, y + s * h, zb, s * 0.98, s * 0.04, s * 0.34, c));
    const body = ['#f4f0e8', '#f0e4f0', '#fff4e0', '#e8f0ff'], wing = ['#7a3a9a', '#3a6ac0', '#c04040', '#3a9a5a'], pom = ['#e02a2a', '#e8a020', '#e02a8a', '#e02a2a'];
    [0.6, 1.15, 1.7].forEach((h, j) => { for (let i = 0; i < 3; i++) {
      const k = Math.floor(rnd(x, z, i + j * 5) * 4), fx = x - s * 0.3 + i * s * 0.3, fy = y + s * (h + 0.02), fz = zb + 0.02;
      mb.sphere(fx, fy + s * 0.1, fz, s * 0.075, s * 0.09, s * 0.07, body[k], 6, 4, true);
      mb.sphere(fx, fy + s * 0.22, fz, s * 0.07, s * 0.06, s * 0.065, body[k], 6, 4, true);
      mb.box(fx, fy + s * 0.3, fz, s * 0.008, s * 0.06, s * 0.008, '#303030');
      mb.sphere(fx, fy + s * 0.34, fz, s * 0.024, s * 0.024, s * 0.024, pom[(k + i) % 4], 5, 3, true);
      [-1, 1].forEach(w => mb.box(fx + w * s * 0.07, fy + s * 0.14, fz - s * 0.02, s * 0.05, s * 0.04, s * 0.01, wing[(k + j) % 4]));
    } });
  };
  // the charging bay the spare big moogle (MOG Mk.II) stands in: a dark back panel between steel uprights, the sign, a
  // green charge gauge and the cables down to it
  P.moogbay = (mb, x, y, z, s, th, nb, o = {}) => {
    o = ctx(o);
    const gm = glowOf(o, mb), W = s * 3.6, zb = z - s * 0.85, steel = '#4a4a58';
    mb.box(x, y + s * 1.9, zb, W, s * 3.8, s * 0.12, { front: '#2a2238', side: steel });
    [-1, 1].forEach(k => mb.box(x + k * W * 0.5, y + s * 1.9, zb + s * 0.3, s * 0.18, s * 3.8, s * 0.6, steel));
    mb.box(x, y + s * 3.85, zb + s * 0.3, W + s * 0.18, s * 0.18, s * 0.6, steel);
    mb.box(x, y + s * 0.05, z - s * 0.15, W, s * 0.1, s * 1.5, sh(steel, -0.2));
    const sy = y + s * 3.5;
    mb.box(x, sy, zb + s * 0.62, s * 2.1, s * 0.32, 0.02, '#141218');
    FF7.field.text3d(gm, 'MOG Mk.II', { pos: [x, sy, zb + s * 0.64], size: s * 0.16, col: '#ffd060', align: 'center' });
    for (let i = 0; i < 5; i++) gm.box(x - W * 0.38, y + s * (0.8 + i * 0.35), zb + s * 0.08, s * 0.24, s * 0.25, 0.01, i < 4 ? '#40ff80' : '#1a3a20');
    [-0.3, 0.3].forEach(k => beam(mb, [x + k * W, y + s * 3.6, zb + s * 0.1], [x + k * W * 0.35, y + s * 1.7, z - s * 0.35], s * 0.04, '#1a1a20', 5));
    o.light([x, y + s * 2.4, z + s * 0.6], '#80ffb0', 2.2);
  };

  // Reactor No.1's elevator car (md1_elevator): the window in its back wall (a field object on the back row's middle
  // tile), the shaft going by behind the glass - two pipes running down it, rungs and lamps sliding past. o.phase 0..1
  // moves them on by two rungs (the script steps it; a stateKey per step); o.hw: the window's half width. Beside it,
  // the car's panel
  P.liftwindow = (mb, x, y, z, s, th, nb, o = {}) => {
    const zf = z - s / 2, hw = o.hw || 0.62, y0 = y + 0.55, y1 = y + 1.9, fr = th.doorFrame || '#2a3038', sp = 0.34;
    mb.box(x, y1 + 0.04, zf + 0.03, hw * 2 + 0.16, 0.08, 0.06, fr);
    mb.box(x, y0 - 0.04, zf + 0.04, hw * 2 + 0.16, 0.08, 0.08, sh(fr, 0.1));
    [-1, 1].forEach(k => mb.box(x + k * (hw + 0.04), (y0 + y1) / 2, zf + 0.03, 0.08, y1 - y0 + 0.16, 0.06, fr));
    const q = (a, b, c, d, dz, col) => mb.quad([a, c, zf + dz], [b, c, zf + dz], [b, d, zf + dz], [a, d, zf + dz], col);
    q(x - hw, x + hw, y0, y1, 0.004, '#040807');
    [-0.55, 0.42].forEach(px => q(x + px * hw - 0.05, x + px * hw + 0.05, y0, y1, 0.006, '#15201c'));
    const ph = ((o.phase || 0) % 1 + 1) % 1;
    for (let i = 0; i < Math.ceil((y1 - y0) / sp) + 3; i++) {
      const yy = y0 - 2 * sp + (i + ph * 2) * sp;
      if (yy < y0 || yy + 0.05 > y1) continue;
      q(x - hw, x + hw, yy, yy + 0.035, 0.008, '#26362f');
      if (i % 2 === 0 && yy + 0.085 <= y1) q(x - hw + 0.1, x - hw + 0.26, yy + 0.035, yy + 0.085, 0.009, '#b0ffd0');
    }
    q(x - hw, x - hw + 0.05, y0, y1, 0.01, '#3a5a50');   // a glint on the glass
    // the panel: floor buttons and the car's light
    const px = x + hw + 0.3;
    mb.box(px, y + 1.15, zf + 0.03, 0.2, 0.36, 0.05, '#262c32');
    [0.08, -0.04].forEach((dy, i) => mb.box(px, y + 1.15 + dy, zf + 0.057, 0.07, 0.07, 0.004, i ? '#ffb030' : '#8a9aa0'));
  };

  // ------------------------------------------------------------------ furniture & fittings
  // bar stool: chrome pole, round cushion (o.col, look.stool); o.style 'wood' = low round wooden stool
  P.stool = (mb, x, y, z, s, th, nb, o = {}) => {
    const m = th.metal ? sh(th.metal[0], 0.15) : '#7a8088';
    if (o.style === 'wood') { const c = o.col || (th.wood ? sh(th.wood[0], 0.15) : '#9a7040'); [0, 1, 2].forEach(i => { const a = i * 2.1 + 0.3; mb.box(x + Math.cos(a) * s * 0.16, y + s * 0.26, z + Math.sin(a) * s * 0.16, s * 0.06, s * 0.52, s * 0.06, sh(c, -0.3)); }); mb.prism(x, y + s * 0.5, z, s * 0.26, s * 0.26, s * 0.1, 10, c, true); return; }
    const c = o.col || th.stool || '#3a8a44';
    mb.prism(x, y, z, s * 0.2, s * 0.16, s * 0.04, 8, sh(m, -0.35));
    mb.prism(x, y, z, s * 0.045, s * 0.045, s * 0.84, 6, m);
    mb.prism(x, y + s * 0.34, z, s * 0.17, s * 0.17, s * 0.03, 8, sh(m, 0.1), false);
    mb.prism(x, y + s * 0.8, z, s * 0.22, s * 0.26, s * 0.1, 10, sh(c, -0.15), true);
    mb.prism(x, y + s * 0.9, z, s * 0.26, s * 0.21, s * 0.05, 10, c, true);
  };
  // floor cushion (zabuton)
  P.cushion = (mb, x, y, z, s, th, nb, o = {}) => { const c = o.col || '#b89a60'; mb.frustum(x, y, z, s * 0.66, s * 0.66, s * 0.56, s * 0.56, s * 0.12, { side: sh(c, -0.15), top: c }); mb.box(x, y + s * 0.125, z, s * 0.08, 0.004, s * 0.08, sh(c, -0.35)); };
  // church pew: seat facing north (the altar), back rest on the south side; rows join east-west
  P.pew = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || (th.wood ? th.wood[0] : '#6a4a2a'), d = sh(c, -0.25), br = o.broken || (o.broken !== false && rnd(x, z, 3) > 0.93);
    mb.push(); if (br) { mb.translate(x, y, z); mb.rotate(0.08, 0, br === true ? 0.12 : 0); mb.translate(-x, -y, -z); }
    mb.box(x, y + s * 0.42, z - s * 0.02, s * (nb.e ? 1.0 : 0.94), s * 0.07, s * 0.46, { side: d, top: c });
    mb.box(x, y + s * 0.78, z + s * 0.24, s * (nb.e ? 1.0 : 0.94), s * 0.62, s * 0.06, { side: d, front: c, top: sh(c, 0.12) });
    [[-1, nb.w], [1, nb.e]].forEach(([k, joined]) => { if (!joined) mb.box(x + k * s * 0.46, y + s * 0.5, z + s * 0.02, s * 0.06, s * 1.0, s * 0.6, { side: sh(c, -0.1), top: sh(c, 0.1) }); else mb.box(x + k * s * 0.5, y + s * 0.2, z, s * 0.05, s * 0.4, s * 0.4, d); });
    mb.box(x, y + s * 0.12, z + s * 0.1, s * (nb.e ? 1.0 : 0.94), s * 0.05, s * 0.06, d);
    mb.pop();
  };
  // Train bench (FF7's midnight train): a padded bench running along a wall, back rest against it,
  // wooden base, end panels where a run stops, and brass poles + an overhead rail with hanging straps
  // on the aisle side. One variant per wall the back rests against: trainseat_n / _s / _e / _w.
  const trainseat = (face) => (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || th.seat || '#2e5a7a', wood = o.col2 || th.seatBase || '#4a3022', brass = th.brass || '#b8923e';
    const ax = face === 'n' || face === 's';                       // the bench runs along x
    const sv = face === 'n' || face === 'w' ? 1 : -1;              // wall -> aisle direction
    const box = (u, h, v, lu, lh, lv, col) => ax ? mb.box(x + u, y + h, z + sv * v, lu, lh, lv, col) : mb.box(x + sv * v, y + h, z + u, lv, lh, lu, col);
    const runA = ax ? nb.w : nb.n, runB = ax ? nb.e : nb.s;        // joined neighbours along the run
    const idx = Math.round((ax ? x : z) / s - 0.5);
    const wear = th.seatWear || 0, rw = rnd(x, z, 11), rb = rnd(x, z, 12);   // look.seatWear 0..1: torn, sagging, stripped seats
    box(0, s * 0.22, -s * 0.08, s, s * 0.44, s * 0.78, { side: sh(wood, -0.2), top: wood });          // base
    if (wear && rw < wear * 0.3) [-0.25, 0.1, 0.3].forEach(u => box(u * s, s * 0.47, (rnd(x, z, u * 9 + 20) - 0.6) * s * 0.4, s * 0.1, s * 0.06, s * 0.1, '#6a6660'));   // springs, cushion gone
    else {
      box(0, s * 0.5, -s * 0.06, s, s * 0.12, s * 0.8, { side: sh(c, -0.25), top: c });               // seat cushion
      if (wear && rw < wear * 0.8) box((rw - 0.3) * s, s * 0.565, (rnd(x, z, 13) - 0.5) * s * 0.4, s * 0.26, s * 0.03, s * 0.2, '#b8aa88');   // torn, stuffing showing
    }
    const bh = wear && rb < wear * 0.3 ? 0.46 : 0.76;                                                  // snapped back rest
    box(0, s * (0.58 + bh / 2), -s * 0.4, s, s * bh, s * 0.14, { side: sh(c, -0.15), top: sh(c, 0.1) });   // back rest
    if (bh > 0.5) box(0, s * 1.36, -s * 0.44, s, s * 0.05, s * 0.1, sh(wood, 0.1));                    // back rail
    [[-1, runA], [1, runB]].forEach(([k, joined]) => { if (!joined) box(k * s * 0.47, s * 0.62, -s * 0.08, s * 0.06, s * 1.24, s * 0.84, { side: wood, top: sh(wood, 0.15) }); });
    const H = s * 2.6, rv = s * 0.38;
    if (th.seatRails === false) return;
    if (wear && rnd(x, z, 14) < wear * 0.25) { if (!runA || idx % 3 === 0) box(-s * 0.46, H / 2, rv, s * 0.045, H, s * 0.045, brass); return; }   // rail and strap gone
    if (th.seatRails === 'posts') {   // truck bed: rusty frame posts against the wall every other tile, a rail on top
      if (!runA || idx % 2 === 0) box(-s * 0.46, H / 2, -s * 0.46, s * 0.07, H, s * 0.07, brass);
      box(0, H, -s * 0.46, s, s * 0.06, s * 0.06, brass);
      return;
    }
    // brass: overhead rail along the aisle edge, a pole every third tile and at run ends, straps
    box(0, H, rv, s * 1.0, s * 0.04, s * 0.04, brass);
    if (!runA || idx % 3 === 0) box(-s * 0.46, H / 2, rv, s * 0.045, H, s * 0.045, brass);
    box(0, H - s * 0.24, rv, s * 0.02, s * 0.46, s * 0.02, '#d8cfb0');
    box(0, H - s * 0.5, rv, s * 0.12, s * 0.1, s * 0.03, '#e8e0c8');                                  // strap handle
  };
  P.trainseat_n = trainseat('n'); P.trainseat_s = trainseat('s'); P.trainseat_e = trainseat('e'); P.trainseat_w = trainseat('w');

  // ------------------------------------------------------------------ vehicle interiors
  // paint a display on a flat rectangle: p(u, v, d) = the point u across / v up (0..1), lifted d off the
  // surface; style 'grid' | 'sonar' | 'map' | 'gauges' | 'stars' | 'plain'; col = glow colour; a = width / height
  function paintScreen(gm, p, style, col, a, k) {
    const q = (u0, v0, u1, v1, c, d) => gm.quad(p(u0, v0, d), p(u1, v0, d), p(u1, v1, d), p(u0, v1, d), c);
    const seg = (u0, v0, u1, v1, w, c, d) => { const L = Math.hypot((u1 - u0) * a, v1 - v0) || 1, nu = -(v1 - v0) / L * w / a, nv = (u1 - u0) * a / L * w;
      gm.quad(p(u0 - nu, v0 - nv, d), p(u1 - nu, v1 - nv, d), p(u1 + nu, v1 + nv, d), p(u0 + nu, v0 + nv, d), c); };
    const r = (i) => U.hash(k, i, 57), dark = sh(col, -0.72), mid = sh(col, -0.35), hi = sh(col, 0.4);
    q(0, 0, 1, 1, style === 'plain' ? col : dark, 0.004);
    if (style === 'plain') return;
    if (style === 'stars') { for (let i = 0; i < 16; i++) { const u = 0.05 + r(i) * 0.9, v = 0.05 + r(i + 30) * 0.9, w = 0.008 + r(i + 60) * 0.01; q(u - w / a, v - w, u + w / a, v + w, i % 4 ? '#e8f0ff' : '#a0e0ff', 0.006); } return; }
    if (style === 'gauges') {   // round dials with needles above a row of bar meters
      for (let i = 0; i < 3; i++) { const cu = (i + 0.5) / 3, cv = 0.66, R = 0.2;
        for (let j = 0; j < 10; j++) { const a0 = j / 10 * Math.PI * 2, a1 = (j + 1) / 10 * Math.PI * 2; gm.tri(p(cu, cv, 0.006), p(cu + Math.cos(a0) * R / a, cv + Math.sin(a0) * R, 0.006), p(cu + Math.cos(a1) * R / a, cv + Math.sin(a1) * R, 0.006), j % 2 ? '#e8e8d8' : '#d8d8c8'); }
        const na = 0.5 + r(i) * 2.2; seg(cu, cv, cu + Math.cos(na) * R * 0.9 / a, cv + Math.sin(na) * R * 0.9, 0.018, '#d02020', 0.008); }
      for (let i = 0; i < 6; i++) { const u0 = 0.08 + i * 0.145; q(u0, 0.1, u0 + 0.09, 0.14 + r(i + 9) * 0.22, i % 3 ? col : '#f0c040', 0.006); }
      return;
    }
    for (let i = 1; i < 6; i++) q(i / 6 - 0.005, 0.04, i / 6 + 0.005, 0.96, mid, 0.006);
    for (let i = 1; i < 4; i++) q(0.03, i / 4 - 0.008, 0.97, i / 4 + 0.008, mid, 0.006);
    if (style === 'sonar') {   // range rings, cross hairs, the sweep and a few contacts
      const rr = [0.14, 0.27, 0.4];
      rr.forEach(R => { for (let j = 0; j < 20; j++) { const a0 = j / 20 * Math.PI * 2, a1 = (j + 1) / 20 * Math.PI * 2; seg(0.5 + Math.cos(a0) * R / a, 0.5 + Math.sin(a0) * R, 0.5 + Math.cos(a1) * R / a, 0.5 + Math.sin(a1) * R, 0.012, col, 0.008); } });
      seg(0.5, 0.5, 0.5 + 0.38 / a, 0.72, 0.016, hi, 0.01);
      [[0.38, 0.66, '#ff4040'], [0.63, 0.3, '#ffd040'], [0.58, 0.62, hi]].forEach(([u, v, c]) => q(u - 0.02 / a, v - 0.02, u + 0.02 / a, v + 0.02, c, 0.012));
      return;
    }
    // a map coastline or a trace, plus text-like read-outs in a corner
    let pu = 0.05, pv = 0.3 + r(1) * 0.4;
    for (let i = 1; i <= 9; i++) { const u = 0.05 + i * 0.1, v = U.clamp(pv + (r(i + 3) - 0.5) * (style === 'map' ? 0.3 : 0.45), 0.1, 0.9); seg(pu, pv, u, v, 0.014, style === 'map' ? '#f0d060' : hi, 0.008); pu = u; pv = v; }
    for (let i = 0; i < 3; i++) q(0.06, 0.82 - i * 0.07, 0.06 + 0.12 + r(i + 20) * 0.14, 0.85 - i * 0.07, hi, 0.009);
  }
  // control console (bridges, cockpits): o.style 'desk' (sloped control face and a monitor on the back
  // panel), 'tall' (a tall panel of gauges and screens against a wall), 'round' (cylindrical radar table);
  // o.w width (tiles), o.col body, o.col2 screen glow, o.screen screen style (see paintScreen). Faces south.
  P.console = (mb, x, y, z, s, th, nb, o = {}) => {
    const W = s * (o.w || 1) * 0.96, c = o.col || (th.metal ? th.metal[1] : '#525860'), g = o.col2 || '#40e0b0', gm = glowOf(o, mb), st = o.style || 'desk', k = Math.floor(x * 7 + z * 13);
    const btn = ['#ff4030', '#40ff70', '#ffd040', '#40c0ff', '#ffffff'];
    if (st === 'round') {
      const R = W / 2, H = s * 0.9;
      mb.prism(x, y, z, R * 0.8, R * 0.9, H * 0.85, 12, sh(c, -0.1), true, false, false);
      mb.prism(x, y + H * 0.85, z, R, R, H * 0.15, 12, sh(c, 0.12), false);
      disc(gm, x, y + H + 0.004, z, R * 0.8, 12, sh(g, -0.55));
      [0.3, 0.55, 0.78].forEach(f => annulus(gm, x, y + H + 0.008, z, R * f - 0.012, R * f + 0.012, 12, g));
      gm.box(x + R * 0.25, y + H + 0.012, z - R * 0.3, 0.04, 0.004, 0.04, '#ff4040');
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; gm.box(x + Math.cos(a) * R * 0.86, y + H * 0.55, z + Math.sin(a) * R * 0.86, 0.05, 0.05, 0.05, btn[i % 5]); }
      o.light && o.light([x, y + H, z], g, 1.4);
      return;
    }
    const H0 = s * 0.9, zf = z + s * 0.38, zb = z - s * 0.2, yb = y + H0 + s * 0.2, Ht = s * (st === 'tall' ? 3.2 : 1.9);
    mb.box(x, y + H0 / 2, z + s * 0.06, W, H0, s * 0.64, { side: sh(c, -0.18), top: c, front: sh(c, 0.04) });
    mb.box(x, y + s * 0.05, z + s * 0.36, W * 0.98, s * 0.1, s * 0.06, sh(c, -0.45));                     // kick plate
    const A = [x - W / 2, y + H0, zf], B = [x + W / 2, y + H0, zf], Dp = [x - W / 2, yb, zb];
    const sl = (u, v, d) => [A[0] + (B[0] - A[0]) * u, A[1] + (Dp[1] - A[1]) * v + d * 0.8, A[2] + (Dp[2] - A[2]) * v + d * 0.6];
    mb.quad(A, B, [x + W / 2, yb, zb], Dp, sh(c, 0.14));                                                     // sloped control face
    [[-1, x - W / 2], [1, x + W / 2]].forEach(([kk, ex]) => mb.quad(kk < 0 ? [ex, y + H0, zb] : [ex, y + H0, zf], kk < 0 ? [ex, y + H0, zf] : [ex, y + H0, zb], [ex, kk < 0 ? y + H0 : yb, kk < 0 ? zf : zb], [ex, kk < 0 ? yb : y + H0, kk < 0 ? zb : zf], sh(c, -0.1)));
    const n = Math.max(2, Math.round(W / (s * 0.22)));
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { const u = (i + 0.5) / n, v = 0.3 + j * 0.35, col = btn[(i * 3 + j + k) % 5]; gm.quad(sl(u - 0.25 / n, v - 0.08, 0.004), sl(u + 0.25 / n, v - 0.08, 0.004), sl(u + 0.25 / n, v + 0.08, 0.004), sl(u - 0.25 / n, v + 0.08, 0.004), U.hash(k, i, j) > 0.35 ? col : sh(col, -0.6)); }
    // back panel with its monitor(s)
    mb.box(x, y + (H0 + Ht) / 2, z - s * 0.3, W, Ht - H0, s * 0.18, { side: sh(c, -0.2), front: sh(c, 0.06), top: sh(c, -0.1) });
    const sy0 = yb + s * 0.1, sy1 = y + Ht - s * 0.18, zs = z - s * 0.21, scr = st === 'tall' ? Math.max(1, Math.round(W / (s * 0.9))) : 1;
    for (let i = 0; i < scr; i++) {
      const u0 = x - W / 2 + W * i / scr + s * 0.08, u1 = x - W / 2 + W * (i + 1) / scr - s * 0.08, v1 = st === 'tall' ? sy0 + (sy1 - sy0) * 0.55 : sy1;
      mb.box((u0 + u1) / 2, (sy0 + v1) / 2, zs + 0.01, u1 - u0 + 0.05, v1 - sy0 + 0.05, 0.02, sh(c, -0.5));
      paintScreen(gm, (u, v, d) => [u0 + (u1 - u0) * u, sy0 + (v1 - sy0) * v, zs + 0.02 + d], o.screen || (st === 'tall' && i % 2 ? 'gauges' : 'grid'), g, (u1 - u0) / (v1 - sy0), k + i);
      if (st === 'tall') paintScreen(gm, (u, v, d) => [u0 + (u1 - u0) * u, v1 + s * 0.08 + (sy1 - v1 - s * 0.08) * v, zs + 0.012 + d], 'gauges', '#e0e0d0', (u1 - u0) / (sy1 - v1), k + i + 5);
    }
    o.light && o.light([x, y + H0 + s * 0.4, z + s * 0.4], g, 0.9);
  };
  // wall display: a framed screen hanging on a wall face (put it on the wall tile; o.back: true puts it
  // against the back of a floor tile instead); o.w (tiles), o.h (m), o.y centre height (m), o.style (see
  // paintScreen, default 'grid'), o.col glow, o.col2 frame
  P.screen = (mb, x, y, z, s, th, nb, o = {}) => {
    const W = s * (o.w || 1.6), H = o.h || W * 0.6, yc = y + (o.y != null ? o.y : 1.3), f = o.col2 || '#2a2e34', gm = glowOf(o, mb), z0 = z - (o.back ? s * 0.46 : 0), g = o.col || '#50f0a0';
    mb.box(x, yc, z0 + 0.035, W + 0.1, H + 0.1, 0.07, { side: sh(f, -0.2), front: f, top: sh(f, 0.1) });
    mb.box(x, yc - H / 2 - 0.09, z0 + 0.06, W * 0.6, 0.08, 0.1, sh(f, -0.1));
    paintScreen(gm, (u, v, d) => [x - W / 2 + W * u, yc - H / 2 + H * v, z0 + 0.072 + d], o.style || 'grid', g, W / H, Math.floor(x * 5 + z * 11));
    o.light && o.light([x, yc, z0 + 0.4], g, Math.min(2.5, W * 1.4));
  };
  // ship's wheel on a pedestal (the helmsman stands south of it, facing north): o.r wheel radius (m),
  // o.col wheel, o.col2 pedestal, o.h hub height (m)
  P.helm = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = o.r || 0.3, c = o.col || '#8a5a2a', p = o.col2 || (th.metal ? th.metal[1] : '#5a6068'), hy = y + (o.h || 0.62);
    mb.frustum(x, y, z - s * 0.08, s * 0.62, s * 0.56, s * 0.4, s * 0.36, hy - y - 0.06, { side: sh(p, -0.1), top: p, front: sh(p, 0.06) });
    mb.box(x, y + 0.03, z - s * 0.08, s * 0.8, 0.06, s * 0.74, sh(p, -0.35));
    mb.push(); mb.translate(x, hy, z + s * 0.08); mb.rotate(-0.3, 0, 0);
    beam(mb, [0, 0, -0.2], [0, 0, 0.04], 0.035, sh(p, -0.2), 6);
    for (let i = 0; i < 14; i++) { const a0 = i / 14 * Math.PI * 2, a1 = (i + 1) / 14 * Math.PI * 2; beam(mb, [Math.cos(a0) * R, Math.sin(a0) * R, 0.02], [Math.cos(a1) * R, Math.sin(a1) * R, 0.02], 0.028, i % 2 ? c : sh(c, 0.08), 5); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; beam(mb, [0, 0, 0.02], [Math.cos(a) * R * 1.32, Math.sin(a) * R * 1.32, 0.02], 0.016, sh(c, -0.1), 4); mb.box(Math.cos(a) * R * 1.3, Math.sin(a) * R * 1.3, 0.02, 0.05, 0.05, 0.05, sh(c, 0.15)); }
    mb.prism(0, -0.03, 0.02, 0.06, 0.06, 0.06, 8, o.col3 || '#c0a040');
    mb.pop();
  };
  // periscope: a tube dropping from the ceiling (o.h, m) to an eyepiece box with side handles
  P.periscope = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || (th.metal ? th.metal[0] : '#5a6068'), top = y + (o.h || th.wallH || 2.4), ey = y + 1.0;
    mb.prism(x, ey + 0.16, z, 0.07, 0.07, top - ey - 0.16, 8, c, true, false, false);
    [0.35, 0.7].forEach(t => mb.prism(x, ey + 0.16 + (top - ey - 0.16) * t, z, 0.09, 0.09, 0.05, 8, sh(c, -0.25)));
    mb.box(x, ey + 0.08, z + 0.03, 0.2, 0.18, 0.2, { side: sh(c, -0.1), top: sh(c, 0.1), front: sh(c, 0.05) });
    mb.box(x, ey + 0.1, z + 0.14, 0.12, 0.06, 0.04, '#141418');
    [-1, 1].forEach(k => { mb.box(x + k * 0.16, ey + 0.08, z + 0.03, 0.14, 0.04, 0.04, sh(c, -0.3)); mb.box(x + k * 0.24, ey + 0.02, z + 0.03, 0.04, 0.14, 0.05, '#2a2a2e'); });
  };
  // crew / pilot seat: swivel chair on a post; the sitter faces south at rot 0; o.col cushion, o.col2 frame
  P.pilotseat = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#6a3a2a', f = o.col2 || (th.metal ? sh(th.metal[0], -0.2) : '#3a3e44'), sy = y + s * 0.5;
    [0, 1, 2, 3, 4].forEach(i => { const a = i / 5 * Math.PI * 2 + 0.3; beam(mb, [x, y + 0.04, z], [x + Math.cos(a) * s * 0.3, y + 0.02, z + Math.sin(a) * s * 0.3], 0.02, f, 4); });
    mb.prism(x, y, z, s * 0.05, s * 0.05, sy - y - 0.03, 6, f);
    mb.box(x, sy, z + s * 0.02, s * 0.56, s * 0.1, s * 0.5, { side: sh(c, -0.25), top: c });
    mb.push(); mb.translate(x, sy + s * 0.05, z - s * 0.24); mb.rotate(-0.12, 0, 0);
    mb.box(0, s * 0.34, 0, s * 0.52, s * 0.66, s * 0.1, { side: sh(c, -0.2), front: sh(c, 0.06), top: sh(c, 0.1) });
    mb.box(0, s * 0.74, 0.01, s * 0.3, s * 0.16, s * 0.1, sh(c, -0.05));
    mb.pop();
    [-1, 1].forEach(k => { mb.box(x + k * s * 0.3, sy + s * 0.2, z, s * 0.05, s * 0.05, s * 0.4, f); mb.box(x + k * s * 0.3, sy + s * 0.1, z - s * 0.12, s * 0.04, s * 0.2, s * 0.04, f); });
  };
  // plank bench (the Gold Saucer gondola, decks, stables): seat boards on trestle legs; o.w length (tiles,
  // along x), o.back: true adds back boards (the sitter faces south at rot 0), o.col wood
  P.bench = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || (th.wood ? th.wood[0] : '#8a6038'), d = sh(c, -0.32), L = s * (o.w || 1), hy = y + s * 0.54;
    for (let i = 0; i < 3; i++) mb.box(x, hy - s * 0.04, z - s * 0.22 + i * s * 0.24, L, s * 0.08, s * 0.22, { side: d, top: sh(c, (i % 2) * 0.07 - 0.02), front: sh(c, -0.12) });
    mb.box(x, hy - s * 0.14, z + s * 0.3, L, s * 0.14, s * 0.04, d);                                   // front skirt board
    const legs = Math.max(2, Math.round(L / s) + 1);
    for (let i = 0; i < legs; i++) { const lx = x - L / 2 + s * 0.08 + (L - s * 0.16) * i / (legs - 1); mb.box(lx, (y + hy) / 2 - s * 0.06, z, s * 0.07, hy - y - s * 0.12, s * 0.56, { side: sh(d, -0.1), top: d }); }
    mb.box(x, y + s * 0.14, z, L - s * 0.12, s * 0.05, s * 0.05, sh(d, -0.1));
    if (o.back) for (let i = 0; i < 2; i++) mb.box(x, hy + s * (0.28 + i * 0.34), z - s * 0.36, L, s * 0.24, s * 0.06, { side: d, front: sh(c, 0.03 * i), top: c });
  };
  // big framed window onto a scene outside (hang it on a wall tile): o.w width (tiles), o.h (m), o.y sill
  // height (m), o.col view colour or [top, bottom], o.col2 frame, o.fw frame width (m), o.bars mullions, o.louvers slats,
  // o.lights sparkle colours (city lights), o.bursts firework colours
  P.viewwindow = (mb, x, y, z, s, th, nb, o = {}) => {
    const W = s * (o.w || 1), y0 = y + (o.y != null ? o.y : 0.7), H = o.h || 1.0, fr = o.col2 || '#6a4a2c', gm = glowOf(o, mb), f = o.fw || 0.07, k = Math.floor(x * 9 + z * 5);
    const vc = Array.isArray(o.col) ? o.col : [o.col || th.window || '#8ab0d0', o.col || th.window || '#8ab0d0'];
    const p = (u, v, d) => [x - W / 2 + W * u, y0 + H * v, z + 0.01 + d];
    for (let i = 0; i < 4; i++) gm.quad(p(0, i / 4, 0), p(1, i / 4, 0), p(1, (i + 1) / 4, 0), p(0, (i + 1) / 4, 0), U.mix(vc[1], vc[0], (i + 0.5) / 4));
    const r = (i) => U.hash(k, i, 71);
    (o.lights ? Array.from({ length: 26 }, (_, i) => i) : []).forEach(i => { const u = 0.04 + r(i) * 0.92, v = 0.04 + r(i + 40) * 0.6, w = 0.006 + r(i + 80) * 0.008; gm.quad(p(u - w / W * 0.5, v - w / H * 0.5, 0.002), p(u + w / W * 0.5, v - w / H * 0.5, 0.002), p(u + w / W * 0.5, v + w / H * 0.5, 0.002), p(u - w / W * 0.5, v + w / H * 0.5, 0.002), o.lights[i % o.lights.length]); });
    (o.bursts || []).forEach((bc, j) => { const cu = 0.2 + r(j + 120) * 0.6, cv = 0.55 + r(j + 130) * 0.3, R = 0.05 + r(j + 140) * 0.05;
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, du = Math.cos(a) / W, dv = Math.sin(a) / H, wu = -Math.sin(a) * 0.005 / W, wv = Math.cos(a) * 0.005 / H;
        const a0 = [cu + du * R * 0.3, cv + dv * R * 0.3], a1 = [cu + du * R, cv + dv * R];
        gm.quad(p(a0[0] - wu, a0[1] - wv, 0.003), p(a1[0] - wu, a1[1] - wv, 0.003), p(a1[0] + wu, a1[1] + wv, 0.003), p(a0[0] + wu, a0[1] + wv, 0.003), bc); } });
    const fb = (bx, by, bw, bh, bd, col) => mb.box(bx, by, z + bd / 2, bw, bh, bd, col);
    fb(x, y0 + H + f / 2, W + f * 2, f, f * 1.1, { side: sh(fr, -0.2), front: fr, bottom: sh(fr, -0.35) });
    fb(x, y0 - f / 2, W + f * 2.4, f, f * 1.9, { side: sh(fr, -0.2), front: sh(fr, 0.05), top: sh(fr, 0.15) });   // sill
    [-1, 1].forEach(kk => fb(x + kk * (W / 2 + f / 2), y0 + H / 2, f, H, f * 1.1, { side: sh(fr, -0.15), front: fr }));
    for (let i = 1; i <= (o.bars || 0); i++) fb(x - W / 2 + W * i / ((o.bars || 0) + 1), y0 + H / 2, 0.025, H, 0.03, sh(fr, -0.1));
    for (let i = 1; i <= (o.louvers || 0); i++) fb(x, y0 + H * i / ((o.louvers || 0) + 1), W, 0.03, 0.05, sh(fr, 0.1));
    if (o.light !== false && o.light) o.light([x, y0 + H / 2, z + 0.5], vc[1], 1.8);
  };
  // ceiling panel facing down at o.h (m): only seen from below (low, inside cameras), invisible from the
  // usual high cameras; o.w / o.d size (tiles), o.col, o.beams (colour: cross beams every tile), o.lamp
  // (colour: a glowing lamp panel in the middle, with a baked light)
  P.ceiling = (mb, x, y, z, s, th, nb, o = {}) => {
    const W = s * (o.w || 1), D = s * (o.d || o.w || 1), h = y + (o.h || th.wallH || 2.2), c = o.col || sh(th.wall, -0.15);
    const down = (m, x0, z0, x1, z1, yy, col) => m.quad([x0, yy, z0], [x1, yy, z0], [x1, yy, z1], [x0, yy, z1], col);
    down(mb, x - W / 2, z - D / 2, x + W / 2, z + D / 2, h, c);
    if (o.beams) { for (let i = 0; i <= Math.round(W / s); i++) { const bx = x - W / 2 + i * s; down(mb, bx - 0.05, z - D / 2, bx + 0.05, z + D / 2, h - 0.01, o.beams); }
      [-1, 1].forEach(kk => down(mb, x - W / 2, z + kk * D / 2 - 0.08, x + W / 2, z + kk * D / 2 + 0.08, h - 0.012, o.beams)); }
    if (o.lamp) { const gm = glowOf(o, mb), lw = s * (o.lampW || 1.2); down(mb, x - lw / 2 - 0.08, z - lw * 0.4 - 0.08, x + lw / 2 + 0.08, z + lw * 0.4 + 0.08, h - 0.02, o.beams || sh(c, -0.3)); down(gm, x - lw / 2, z - lw * 0.4, x + lw / 2, z + lw * 0.4, h - 0.03, o.lamp); o.light && o.light([x, h - 0.4, z], o.lamp, 2.4); }
  };
  // upright gas cylinder (the Shinra No. 26 oxygen tanks): o.r radius (tiles), o.h (m), o.col, o.text
  // stencilled number, o.rust: false for a clean tank
  P.tank = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = s * (o.r || 0.4), H = o.h || 1.7, c = o.col || '#8a8a80', hb = H - R * 0.6;
    mb.prism(x, y, z, R * 0.85, R * 0.9, 0.08, 12, sh(c, -0.45));
    mb.prism(x, y + 0.08, z, R, R, hb - 0.08, 12, c, true, false, false);
    mb.sphere(x, y + hb, z, R, R * 0.6, R, c, 12, 6, true, null, 3);
    [0.18, 0.5, 0.82].forEach(t => mb.prism(x, y + hb * t, z, R + 0.012, R + 0.012, 0.06, 12, sh(c, -0.3), false, false, false));
    mb.prism(x, y + hb + R * 0.55, z, 0.04, 0.04, 0.12, 6, '#4a4a4e'); mb.box(x, y + hb + R * 0.6 + 0.12, z, 0.14, 0.02, 0.02, '#a02a20');
    if (o.rust !== false) for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + (rnd(x, z, i) - 0.5) * 1.4, w = 0.05 + rnd(x, z, i + 5) * 0.06, y1 = y + hb * (0.3 + rnd(x, z, i + 9) * 0.5), h2 = 0.15 + rnd(x, z, i + 12) * 0.35;
      const P2 = (da, yy) => [x + Math.cos(a + da) * (R + 0.004), yy, z + Math.sin(a + da) * (R + 0.004)], da = w / R;
      mb.quad(P2(da, y1 - h2), P2(-da, y1 - h2), P2(-da, y1), P2(da, y1), U.mix(c, '#7a3e1c', 0.6)); }
    if (o.text) FF7.field.text3d(mb, o.text, { pos: [x, y + hb * 0.62, z + R + 0.012], size: R * 0.6, col: o.textCol || '#e8e0c8', w: 0.2 });
  };
  // round window (the rocket cockpit, portholes; hang it on a wall tile): o.r radius (m), o.y centre (m),
  // o.col view, o.col2 frame, o.stars: false (no stars), o.planet (colour: the Planet's curve at the
  // bottom), o.meteor (colour: a glowing disc high in the view)
  P.porthole = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = o.r || 0.3, yc = y + (o.y != null ? o.y : 1.2), gm = glowOf(o, mb), c = o.col2 || '#6a6e74', n = 20, fw = Math.max(0.06, R * 0.16);
    const pt = (a, r, d) => [x + Math.cos(a) * r, yc + Math.sin(a) * r, z + d];
    for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      gm.tri(pt(0, 0, 0.01), pt(a0, R, 0.01), pt(a1, R, 0.01), o.col || '#04060e');
      mb.quad(pt(a0, R, 0.07), pt(a0, R + fw, 0.07), pt(a1, R + fw, 0.07), pt(a1, R, 0.07), sh(c, (i % 2) * 0.06));
      mb.quad(pt(a0, R + fw, 0.07), pt(a0, R + fw * 1.6, 0.02), pt(a1, R + fw * 1.6, 0.02), pt(a1, R + fw, 0.07), sh(c, -0.2));
      mb.quad(pt(a1, R, 0.07), pt(a1, R, 0.0), pt(a0, R, 0.0), pt(a0, R, 0.07), sh(c, -0.35));
      if (i % 3 === 0) mb.box(...pt((a0 + a1) / 2, R + fw * 0.5, 0.075), 0.03, 0.03, 0.02, sh(c, 0.25)); }
    if (o.planet) for (let i = 0; i < 12; i++) {   // the Planet's curve: from a bulging horizon down to the rim
      const u0 = -R + 2 * R * i / 12, u1 = u0 + 2 * R / 12, hz = (u) => -R * 0.38 - (u * u) / R * 0.3, rim = (u) => -Math.sqrt(Math.max(0, R * R - u * u)) * 0.99;
      if (hz(u0) <= rim(u0) && hz(u1) <= rim(u1)) continue;
      gm.quad([x + u0, yc + rim(u0), z + 0.014], [x + u1, yc + rim(u1), z + 0.014], [x + u1, yc + Math.max(rim(u1), hz(u1)), z + 0.014], [x + u0, yc + Math.max(rim(u0), hz(u0)), z + 0.014], sh(o.planet, (i % 3) * 0.06));
      gm.quad([x + u0, yc + Math.max(rim(u0), hz(u0)) - 0.012, z + 0.016], [x + u1, yc + Math.max(rim(u1), hz(u1)) - 0.012, z + 0.016], [x + u1, yc + Math.max(rim(u1), hz(u1)), z + 0.016], [x + u0, yc + Math.max(rim(u0), hz(u0)), z + 0.016], sh(o.planet, 0.55)); }
    if (o.stars !== false) for (let i = 0; i < 14; i++) { const a = rnd(x, z, i) * Math.PI * 2, r = Math.sqrt(rnd(x, z, i + 20)) * R * 0.9, w = 0.008 + rnd(x, z, i + 40) * 0.01; gm.box(x + Math.cos(a) * r, yc + Math.sin(a) * r, z + 0.016, w, w, 0.003, i % 3 ? '#e8f0ff' : '#90d8ff'); }
    if (o.meteor) { for (let i = 0; i < 10; i++) { const a0 = i / 10 * Math.PI * 2, a1 = (i + 1) / 10 * Math.PI * 2, cx = x + R * 0.35, cy2 = yc + R * 0.4, rr = R * 0.16;
      gm.tri([cx, cy2, z + 0.018], [cx + Math.cos(a0) * rr, cy2 + Math.sin(a0) * rr, z + 0.018], [cx + Math.cos(a1) * rr, cy2 + Math.sin(a1) * rr, z + 0.018], i % 2 ? o.meteor : sh(o.meteor, 0.3)); } }
    if (o.light !== false && o.light) o.light([x, yc, z + 0.6], o.meteor || '#a0c0ff', 1.6);
  };
  // the Huge Materia in its capsule: a lit glass tube on a pedestal, the crystal floating inside
  // (o.col crystal glow, o.h tube height m)
  P.capsule = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#80e0ff', H = o.h || 1.3, R = s * 0.42, gm = glowOf(o, mb), wm = o.water || mb, m = th.metal ? th.metal[0] : '#6a7078';
    mb.frustum(x, y, z, s * 1.1, s * 1.1, s * 0.9, s * 0.9, 0.18, { side: sh(m, -0.2), top: sh(m, 0.1) });
    mb.prism(x, y + 0.18, z, R * 1.1, R * 1.1, 0.12, 12, sh(m, -0.1));
    mb.prism(x, y + 0.3 + H, z, R * 1.1, R * 0.8, 0.14, 12, sh(m, -0.1));
    for (let i = 0; i < 12; i++) { const a0 = i / 12 * Math.PI * 2, a1 = (i + 1) / 12 * Math.PI * 2, P2 = (a, yy) => [x + Math.cos(a) * R, yy, z + Math.sin(a) * R];
      wm.quad(P2(a1, y + 0.3), P2(a0, y + 0.3), P2(a0, y + 0.3 + H), P2(a1, y + 0.3 + H), 'rgba(170,230,255,0.28)'); }
    [0, 2, 4].forEach(i => { const a = i / 6 * Math.PI * 2 + 0.5; mb.box(x + Math.cos(a) * R * 1.02, y + 0.3 + H / 2, z + Math.sin(a) * R * 1.02, 0.03, H, 0.03, sh(m, 0.1)); });
    const cy = y + 0.3 + H * 0.5;
    gm.prism(x, cy, z, R * 0.55, 0, H * 0.34, 6, c); gm.push(); gm.translate(x, cy, z); gm.rotate(Math.PI, 0, 0); gm.prism(0, 0, 0, R * 0.55, 0, H * 0.3, 6, sh(c, -0.2)); gm.pop();
    gm.prism(x, y + 0.3 + H, z, R * 0.7, R * 0.7, 0.01, 12, sh(c, 0.3));
    o.light && o.light([x, cy, z], c, 2.6);
  };
  // window ribs arching over the front of an airship bridge: base points on a circle of o.r tiles around
  // the prop, from angle o.a0 to o.a1 (degrees; 0 = east, -90 = north), rising to a crown o.h metres up
  // over the prop; o.n ribs, o.col, o.ring (0..1: height of a ring beam), o.thick (m)
  P.dome = (mb, x, y, z, s, th, nb, o = {}) => {
    // o.rz: depth radius (an oval dome that fits a shallow deck); o.sill: a thick frame the ribs stand on;
    // o.skirt: the hull falling away below the sill (m)
    const R = s * (o.r || 8), RZ = s * (o.rz || o.r || 8), H = o.h || 4, n = o.n || 7, c = o.col || '#7a7e84', a0 = (o.a0 != null ? o.a0 : -180) * Math.PI / 180, a1 = (o.a1 != null ? o.a1 : 0) * Math.PI / 180, t = o.thick || 0.09;
    const at = (a, f) => { const k = 1 - Math.cos(f * Math.PI / 2); return [x + Math.cos(a) * R * (1 - k), y + H * Math.sin(f * Math.PI / 2), z + Math.sin(a) * RZ * (1 - k)]; };
    if (o.sill) {
      const m = 28, hc = sh(c, -0.3);
      for (let j = 0; j < m; j++) {
        const p0 = at(a0 + (a1 - a0) * j / m, 0), p1 = at(a0 + (a1 - a0) * (j + 1) / m, 0);
        beam(mb, p0, p1, t * 2.4, sh(c, -0.18), 6);
        if (o.skirt) { const d = o.skirt, q0 = [p0[0], p0[1] - d, p0[2]], q1 = [p1[0], p1[1] - d, p1[2]]; mb.quad(q0, q1, p1, p0, hc); mb.quad(p0, p1, q1, q0, hc); }
      }
    }
    for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / (n - 1); for (let j = 0; j < 8; j++) beam(mb, at(a, j / 8), at(a, (j + 1) / 8), t, i % 2 ? c : sh(c, -0.08), 5); }
    if (o.ring) { const f = o.ring, m = 24; for (let j = 0; j < m; j++) beam(mb, at(a0 + (a1 - a0) * j / m, f), at(a0 + (a1 - a0) * (j + 1) / m, f), t * 0.8, sh(c, -0.15), 4); }
    mb.prism(x, y + H - 0.05, z, t * 2.2, t * 1.4, 0.3, 8, sh(c, 0.1));
  };
  // curved railing: posts and rails along an arc of o.r tiles around the prop from o.a0 to o.a1 degrees
  // (0 = east, -90 = north), o.h height (m), o.col
  const dq = (mb, a, b, c, d, col) => { mb.quad(a, b, c, d, col); mb.quad(d, c, b, a, col); };   // double-sided quad
  // The Highwind / Shinra airship bridge window (PS1 refs: 15-cloud01, 02): a quarter-ellipsoid of ribs
  // bulging out in front of the deck. (x, y, z) is the middle of its rim at deck level: the rim is the arch
  // across the room in the plane z, the base a half-ellipse on the deck (o.rx across, o.rz out to the nose),
  // the top hub o.ry above the rim. Meridian ribs (the middle one a thick strut, the rim thicker still),
  // horizontal bands (o.rings, fractions of the height angle), a sill band along the base with the hull
  // falling away below it (o.skirt m), and the nose railing just inside the sill (o.rail { inset, span, h }).
  P.bridgewindow = (mb, x, y, z, s, th, nb, o = {}) => {
    const RX = o.rx || 6, RZ = o.rz || 2.4, RY = o.ry || 5, n = o.n || 11, c = o.col || '#6c6862', t = o.thick || 0.09, H = Math.PI / 2;
    const P3 = (a, ph, dx = 0, dz = 0) => { const k = Math.cos(ph); return [x + (RX + dx) * Math.sin(a) * k, y + RY * Math.sin(ph), z - (RZ + dz) * Math.cos(a) * k]; };
    for (let i = 0; i < n; i++) {
      const a = -H + Math.PI * i / (n - 1), rim = i === 0 || i === n - 1, mid = i * 2 === n - 1;
      const r = rim ? t * 2.4 : mid ? t * 2 : t, col = rim || mid ? sh(c, -0.1) : (i % 2 ? c : sh(c, 0.05));
      for (let j = 0; j < 14; j++) beam(mb, P3(a, H * j / 14), P3(a, H * (j + 1) / 14), r, col, rim || mid ? 6 : 5);
    }
    (o.rings || [0.22, 0.45, 0.66, 0.84]).forEach((f, k) => { const m = 30; for (let j = 0; j < m; j++) beam(mb, P3(-H + Math.PI * j / m, H * f), P3(-H + Math.PI * (j + 1) / m, H * f), t * (k % 2 ? 0.7 : 0.9), sh(c, -0.14), 4); });
    mb.prism(x, y + RY - t * 1.5, z, t * 3.2, t * 2.2, t * 3, 8, sh(c, 0.08));                                        // hub
    // sill band on the deck along the base (covers the tile edges), the hull falling away below it
    const w = o.sill != null ? o.sill : 0.36, sk = o.skirt != null ? o.skirt : 4, sc = o.sillCol || sh(c, -0.25), hc = sh(c, -0.45), m = 36, yt = y + 0.04;
    for (let j = 0; j < m; j++) {
      const a0 = -H + Math.PI * j / m, a1 = -H + Math.PI * (j + 1) / m;
      const i0 = P3(a0, 0, -w, -w), i1 = P3(a1, 0, -w, -w), q0 = P3(a0, 0, w, w), q1 = P3(a1, 0, w, w);
      [i0, i1, q0, q1].forEach(q => { q[1] = yt; });
      dq(mb, i0, i1, q1, q0, sc);
      dq(mb, q0, q1, [q1[0], y - sk, q1[2]], [q0[0], y - sk, q0[2]], hc);
      dq(mb, i0, i1, [i1[0], y - 0.02, i1[2]], [i0[0], y - 0.02, i0[2]], sh(sc, -0.1));
    }
    if (o.rail) {   // the curved nose railing
      const R = o.rail, ins = R.inset || 0.5, span = (R.span || 60) * Math.PI / 180, h = R.h || 0.5, rc = R.col || th.brass || th.trim || '#a08858', k = 20;
      const at = (j) => P3(-span + 2 * span * j / k, 0, -ins, -ins);
      for (let j = 0; j <= k; j++) {
        const p = at(j); mb.box(p[0], y + h / 2, p[2], 0.035, h, 0.035, sh(rc, -0.15));
        if (j < k) { const q = at(j + 1); beam(mb, [p[0], y + h, p[2]], [q[0], y + h, q[2]], 0.03, rc, 5); beam(mb, [p[0], y + h * 0.5, p[2]], [q[0], y + h * 0.5, q[2]], 0.015, sh(rc, -0.1), 4); }
      }
    }
  };
  // Round console pod (the Highwind bridge's radar and engine stations): a curb round a grated floor disc,
  // desk consoles facing the middle along the arc o.a0..o.a1 (degrees, 0 = east, 90 = south), each with a
  // monitor behind it, and a railing round the rest of the ring apart from the opening at o.open (degrees).
  P.consolepod = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = o.r || 0.9, c = o.col || (th.metal ? th.metal[1] : '#525860'), gm = glowOf(o, mb), g = o.col2 || '#40e0c0', rc = th.brass || th.trim || '#a08858';
    const a0 = (o.a0 != null ? o.a0 : 180) * Math.PI / 180, a1 = (o.a1 != null ? o.a1 : 300) * Math.PI / 180, n = o.n || Math.max(2, Math.round(Math.abs(a1 - a0) * R / 0.42));
    disc(mb, x, y + 0.012, z, R, 20, sh(c, -0.42));                                                               // grated floor
    for (let k = 1; k <= 3; k++) annulus(mb, x, y + 0.016, z, R * k / 4 - 0.012, R * k / 4 + 0.012, 20, sh(c, -0.18));
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; beam(mb, [x, y + 0.02, z], [x + Math.cos(a) * R, y + 0.02, z + Math.sin(a) * R], 0.01, sh(c, -0.18), 3); }
    mb.prism(x, y, z, R + 0.07, R + 0.07, 0.09, 24, sh(c, -0.08), false, false, false);                               // curb
    annulus(mb, x, y + 0.09, z, R, R + 0.07, 24, sh(c, 0.1));
    const cr = R * 0.8, cw = Math.abs(a1 - a0) * cr / n;
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (i + 0.5) / n, px = x + Math.cos(a) * cr, pz = z + Math.sin(a) * cr, rho = Math.atan2(-Math.cos(a), -Math.sin(a));
      [mb, gm].forEach(m => { m.push(); m.translate(px, y, pz); m.rotate(0, rho, 0); });
      P.console(mb, 0, 0, 0, s, th, nb, { w: cw * 0.95 / s, col: c, col2: g, glow: o.glow });
      mb.box(0, 0.62, -0.16, 0.035, 0.2, 0.035, sh(c, -0.3));                                                     // monitor stalk
      mb.box(0, 0.8, -0.16, cw * 0.72, 0.22, 0.05, sh(c, -0.2));
      gm.box(0, 0.8, -0.133, cw * 0.6, 0.17, 0.006, i % 3 === 1 ? '#c0f0ff' : g);
      [mb, gm].forEach(m => m.pop());
    }
    // railing round the free part of the ring, leaving the opening
    const op = (o.open != null ? o.open : 90) * Math.PI / 180, gap = (o.gap || 40) * Math.PI / 180, hr = 0.42;
    const free = (a) => { const d = Math.atan2(Math.sin(a - op), Math.cos(a - op)); return Math.abs(d) > gap; };
    const lo = Math.min(a0, a1), hi = Math.max(a0, a1), m = 28;
    for (let j = 0; j < m; j++) {
      const aa = hi + (Math.PI * 2 - (hi - lo)) * j / m, ab = hi + (Math.PI * 2 - (hi - lo)) * (j + 1) / m;
      if (!free(aa) || !free(ab)) continue;
      const P2 = (a) => [x + Math.cos(a) * (R + 0.035), y + 0.09, z + Math.sin(a) * (R + 0.035)];
      const p = P2(aa), q = P2(ab);
      beam(mb, [p[0], p[1] + hr, p[2]], [q[0], q[1] + hr, q[2]], 0.022, rc, 5);
      if (j % 2 === 0) mb.box(p[0], p[1] + hr / 2, p[2], 0.03, hr, 0.03, sh(rc, -0.15));
    }
    o.light && o.light([x, y + 0.9, z], g, 1.6);
  };
  // Engine-room machinery stacked against a wall (the Highwind bridge's side walls): a cabinet of lamps,
  // pipe bundles rising to o.h, a big toothed wheel and cable loops. o.face: the side it faces ('e' | 'w' |
  // 'n' | 's'); footprint one tile (put it on block tiles).
  P.machinery = (mb, x, y, z, s, th, nb, o = {}) => {
    const hgt = o.h || 3.4, c = o.col || (th.metal ? th.metal[1] : '#525860'), br = th.brass || th.trim || '#8a7048', gm = glowOf(o, mb);
    const f = { e: [1, 0], w: [-1, 0], s: [0, 1], n: [0, -1] }[o.face || 'e'], sd = [-f[1], f[0]];
    const Q = (u, yy, v) => [x + f[0] * u + sd[0] * v, yy, z + f[1] * u + sd[1] * v];
    const B = (m, u, yy, v, du, dy, dv, col) => { const p = Q(u, yy, v); m.box(p[0], p[1], p[2], f[0] ? du : dv, dy, f[0] ? dv : du, col); };
    const k = U.hash(Math.floor(x * 5), Math.floor(z * 5), 3);
    B(mb, -0.04, y + 0.42, 0, 0.36, 0.84, 0.46, { side: sh(c, -0.12), top: sh(c, 0.1) });                             // cabinet
    for (let i = 0; i < 4; i++) B(gm, 0.145, y + 0.3 + (i % 2) * 0.22, -0.12 + Math.floor(i / 2) * 0.24, 0.01, 0.07, 0.07, ['#ff5030', '#40ff80', '#ffd040', '#40c0ff'][(i + Math.floor(k * 4)) % 4]);
    [[-0.13, -0.17, 0.075, c], [-0.02, 0.19, 0.095, br], [-0.17, 0.07, 0.05, sh(c, 0.12)], [0.04, -0.02, 0.04, sh(br, -0.2)]].forEach(([u, v, r, col]) => {
      const a = Q(u, y + 0.84, v), b = Q(u, y + hgt, v); beam(mb, a, b, r, col, 7);
      [0.3, 0.62].forEach(fr => { const q = Q(u, y + 0.84 + (hgt - 0.84) * fr, v); beam(mb, [q[0], q[1] - 0.03, q[2]], [q[0], q[1] + 0.03, q[2]], r * 1.35, sh(col, -0.2), 7); });   // flanges
    });
    // the big toothed wheel facing out
    const gy = y + 1.35 + k * 0.5, gc = Q(0.1, gy, 0), R = 0.3, up = [0, 1, 0], sv = [sd[0], 0, sd[1]];
    beam(mb, Q(0.07, gy, 0), Q(0.13, gy, 0), R, sh(c, -0.05), 12);
    beam(mb, Q(0.12, gy, 0), Q(0.16, gy, 0), R * 0.3, br, 8);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, d = [sv[0] * Math.cos(a) + up[0] * Math.sin(a), Math.sin(a), sv[2] * Math.cos(a)];
      beam(mb, [gc[0] + d[0] * R * 0.95, gc[1] + d[1] * R * 0.95, gc[2] + d[2] * R * 0.95], [gc[0] + d[0] * R * 1.2, gc[1] + d[1] * R * 1.2, gc[2] + d[2] * R * 1.2], 0.04, sh(c, -0.05), 4); }
    // pipe elbow over the top and a sagging cable
    beam(mb, Q(-0.02, y + hgt - 0.15, 0.19), Q(0.2, y + hgt - 0.15, 0.19), 0.07, br, 6);
    const c0 = Q(0.02, y + 2.3, -0.2), c1 = Q(0.12, y + 1.85, 0), c2 = Q(0.02, y + 2.2, 0.22);
    beam(mb, c0, c1, 0.018, '#202428', 4); beam(mb, c1, c2, 0.018, '#202428', 4);
  };
  // painted floor arrow: o.path = [[dx, dz], ...] in tiles from the prop, the head at the last point
  P.floorarrow = (mb, x, y, z, s, th, nb, o = {}) => {
    const col = o.col || '#d8d8d0', w = o.w || 0.14, yy = y + 0.01, pts = (o.path || [[0, 0], [2, 0]]).map(([a, b]) => [x + a * s, z + b * s]);
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz * w / 2, nz = ux * w / 2;
      const e0 = i > 0 ? w / 2 : 0, e1 = i < pts.length - 2 ? w / 2 : 0;
      const A = [ax - ux * e0, az - uz * e0], Bp = [bx + ux * e1, bz + uz * e1];
      dq(mb, [A[0] + nx, yy, A[1] + nz], [A[0] - nx, yy, A[1] - nz], [Bp[0] - nx, yy, Bp[1] - nz], [Bp[0] + nx, yy, Bp[1] + nz], col);
    }
    const [lx, lz] = pts[pts.length - 1], [px, pz] = pts[pts.length - 2], L = Math.hypot(lx - px, lz - pz), ux = (lx - px) / L, uz = (lz - pz) / L;
    const hw = w * 1.7, hl = w * 2.2;
    mb.tri([lx - uz * hw, yy, lz + ux * hw], [lx + ux * hl, yy, lz + uz * hl], [lx + uz * hw, yy, lz - ux * hw], col);
    mb.tri([lx + uz * hw, yy, lz - ux * hw], [lx + ux * hl, yy, lz + uz * hl], [lx - uz * hw, yy, lz + ux * hw], col);
  };
  P.arcrail = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = s * (o.r || 2), a0 = (o.a0 != null ? o.a0 : -180) * Math.PI / 180, a1 = (o.a1 != null ? o.a1 : 0) * Math.PI / 180, h = o.h || s * 1.0, c = o.col || th.trim || '#40404a';
    const m = Math.max(4, Math.round(Math.abs(a1 - a0) * R / (s * 0.5))), P2 = (a, yy) => [x + Math.cos(a) * R, yy, z + Math.sin(a) * R];
    for (let j = 0; j < m; j++) { const aa = a0 + (a1 - a0) * j / m, ab = a0 + (a1 - a0) * (j + 1) / m; beam(mb, P2(aa, y + h), P2(ab, y + h), 0.03, c, 5); beam(mb, P2(aa, y + h * 0.5), P2(ab, y + h * 0.5), 0.015, sh(c, -0.1), 4); }
    for (let j = 0; j <= m; j++) { const p2 = P2(a0 + (a1 - a0) * j / m, y); mb.box(p2[0], y + h / 2, p2[2], 0.035, h, 0.035, sh(c, -0.15)); }
  };
  // coal hopper wagon (the runaway train, tile type `hopper`, walkable): coal heaped on top; on the
  // wagon's open sides iron side plates with X braces, a top lip, bogies with wheels at the ends and
  // couplers; the floor stands 1.2 m (height 4) above the rails, which the prop draws below it
  P.hopper = (mb, x, y, z, s, th, nb, o = {}) => {
    const iron = o.col || '#3a3634', coal = o.col2 || '#1e1e22', rust = '#6a3a22', bot = y - 0.78, rail = y - 1.2;
    if (!o.flat) for (let i = 0; i < 4; i++) { const r = rnd(x, z, i), r2 = rnd(x, z, i + 7); mb.sphere(x + (r - 0.5) * s * 0.7, y, z + (r2 - 0.5) * s * 0.7, s * (0.22 + r * 0.14), 0.05 + r2 * 0.07, s * (0.22 + r2 * 0.12), sh(coal, (r - 0.5) * 0.3), 6, 4, false, null, 3); }
    const side = (dx, dz) => {   // plate on the side facing (dx, dz); Pp(u, y, out): u -1..1 left to right seen from outside
      const ex = x + dx * s / 2, ez = z + dz * s / 2;
      const Pp = (u, yy, d = 0.004) => dz ? [ex + (dz > 0 ? u : -u) * s / 2, yy, ez + dz * d] : [ex + dx * d, yy, ez + (dx > 0 ? -u : u) * s / 2];
      mb.quad(Pp(-1, bot), Pp(1, bot), Pp(1, y + 0.02), Pp(-1, y + 0.02), sh(iron, rnd(x, z, 3) * 0.08));
      beam(mb, Pp(-0.96, bot + 0.04, 0.02), Pp(0.96, y - 0.06, 0.02), 0.022, sh(iron, 0.18), 4);
      beam(mb, Pp(-0.96, y - 0.06, 0.02), Pp(0.96, bot + 0.04, 0.02), 0.022, sh(iron, 0.18), 4);
      [-1, 1].forEach(u => { const q = Pp(u * 0.97, (bot + y) / 2, 0.02); mb.box(q[0], q[1], q[2], 0.04, y - bot, 0.04, sh(iron, 0.1)); });
      const lp = Pp(0, y + 0.05, 0.01); mb.box(lp[0], lp[1], lp[2], dz ? s : 0.06, 0.1, dz ? 0.06 : s, { side: sh(iron, 0.08), top: sh(iron, 0.2) });   // lip
      if (rnd(x, z, 8) > 0.6) mb.quad(Pp(0.1, bot + 0.1, 0.008), Pp(0.5, bot + 0.1, 0.008), Pp(0.5, bot + 0.35, 0.008), Pp(0.1, bot + 0.35, 0.008), U.mix(iron, rust, 0.5));
    };
    if (!nb.s) side(0, 1); if (!nb.n) side(0, -1); if (!nb.e) side(1, 0); if (!nb.w) side(-1, 0);
    mb.quad([x - s / 2, bot, z - s / 2], [x + s / 2, bot, z - s / 2], [x + s / 2, bot, z + s / 2], [x - s / 2, bot, z + s / 2], sh(iron, -0.4));
    // on the long (north / south) sides: the rail under the wheels (running on across the gap to the next
    // wagon, o.gap tiles), and a bogie with two wheels near each end of the wagon
    [[!nb.s, 1], [!nb.n, -1]].forEach(([open, dz]) => { if (!open) return;
      const wz = z + dz * (s / 2 + 0.03), ext = nb.e ? 0 : s * (o.gap != null ? o.gap : 2);
      mb.box(x + ext / 2, rail + 0.03, wz, s * 1.02 + ext, 0.06, 0.07, '#6a6a70');
      if (nb.e && nb.w) return;
      const bx = x + (nb.e ? s * 0.1 : -s * 0.1);
      mb.box(bx, bot - 0.06, wz - dz * 0.02, s * 0.9, 0.1, 0.05, '#26262a');
      [-1, 1].forEach(k => { mb.push(); mb.translate(bx + k * s * 0.24, rail + 0.2, wz); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, -0.03, 0, 0.19, 0.19, 0.06, 10, '#2a2a2e'); mb.prism(0, -0.035, 0, 0.08, 0.08, 0.07, 6, '#8a2a20'); mb.pop(); });
    });
    // couplers at the ends (middle row)
    if ((!nb.e || !nb.w) && nb.n && nb.s) { const dx = nb.e ? -1 : 1; mb.box(x + dx * (s / 2 + 0.12), bot + 0.12, z, 0.24, 0.1, 0.1, '#2a2a2e'); mb.box(x + dx * (s / 2 + 0.22), bot + 0.12, z, 0.06, 0.18, 0.18, '#4a4a50'); }
  };
  // big marine / airship engine (block prop along its longer side): plinth, a long rounded housing with
  // inspection ports, a row of cylinder heads, a flywheel at the west end, exhaust stacks. o.col housing,
  // o.col2 trim, o.h housing height (m)
  P.engine = (mb, x, y, z, s, th, nb, o = {}) => {
    const along = (o.bw || 1) >= (o.bh || 1), L = (along ? o.bw || 1 : o.bh || 1) * s, Wd = (along ? o.bh || 1 : o.bw || 1) * s;
    const c = o.col || '#6a7070', t = o.col2 || '#8a4a2a', H = o.h || 1.1, gm = glowOf(o, mb);
    mb.push(); mb.translate(x, y, z); if (!along) mb.rotate(0, -Math.PI / 2, 0);
    mb.box(0, 0.08, 0, L * 0.98, 0.16, Wd * 0.94, { side: sh(c, -0.35), top: sh(c, -0.2) });
    mb.box(0, 0.16 + H * 0.3, 0, L * 0.9, H * 0.6, Wd * 0.8, { side: sh(c, -0.08), top: c, front: sh(c, 0.04) });
    mb.push(); mb.translate(-L * 0.45, 0.16 + H * 0.6, 0); mb.rotate(0, 0, -Math.PI / 2); mb.prism(0, 0, 0, Wd * 0.4, Wd * 0.4, L * 0.9, 12, c, true, true, true); mb.pop();
    const nCyl = Math.max(2, Math.round(L / (s * 1.1)));
    for (let i = 0; i < nCyl; i++) { const cx = -L * 0.38 + L * 0.76 * i / (nCyl - 1);
      mb.box(cx, 0.16 + H * 0.6 + Wd * 0.44, 0, s * 0.62, s * 0.36, Wd * 0.5, { side: sh(t, -0.1), top: t });
      mb.box(cx, 0.16 + H * 0.6 + Wd * 0.44 + s * 0.22, 0, s * 0.5, s * 0.08, Wd * 0.4, sh(t, 0.15));
      [-1, 1].forEach(k => mb.prism(cx, 0.16 + H * 0.35, k * Wd * 0.41, s * 0.09, s * 0.09, 0.02, 8, '#2a2a2e')); }
    for (let i = 0; i < 2; i++) { const ex = -L * 0.2 + i * L * 0.4; mb.prism(ex, 0.16 + H * 0.6 + Wd * 0.4, -Wd * 0.2, s * 0.1, s * 0.1, H * 1.1, 8, sh(c, -0.25)); }
    mb.push(); mb.translate(-L * 0.47, 0.16 + H * 0.55, 0); mb.rotate(0, 0, Math.PI / 2); mb.prism(0, -0.06, 0, H * 0.55, H * 0.55, 0.12, 14, '#3a3a3e'); mb.prism(0, -0.07, 0, H * 0.18, H * 0.18, 0.14, 8, t); mb.pop();
    withXf(mb, gm, g => [-1, 1].forEach(k => g.box(L * 0.3, 0.16 + H * 0.4, k * (Wd * 0.4 + 0.012), s * 0.2, s * 0.12, 0.01, '#80ff90')));
    mb.pop();
  };
  // flat wagon deck (tile type `flatcar`, walkable): the hopper's iron body and bogies without the coal
  P.flatcar = (mb, x, y, z, s, th, nb, o = {}) => P.hopper(mb, x, y, z, s, th, nb, Object.assign({}, o, { flat: true }));
  // control levers on a stand (a locomotive cab, machinery): o.col knobs, o.n levers
  P.lever = (mb, x, y, z, s, th, nb, o = {}) => {
    const m = th.metal ? sh(th.metal[1], -0.2) : '#3a3e44', n = o.n || 2, knobs = [o.col || '#d02a20', '#e0b020', '#30a0d0'];
    mb.box(x, y + s * 0.2, z - s * 0.1, s * 0.6, s * 0.4, s * 0.4, { side: sh(m, -0.15), top: m });
    for (let i = 0; i < n; i++) { const lx = x - s * 0.18 + i * s * 0.36 / Math.max(1, n - 1), a = (i % 2 ? 0.35 : -0.25);
      beam(mb, [lx, y + s * 0.38, z - s * 0.1], [lx, y + s * 1.25, z - s * 0.1 + Math.sin(a) * s * 0.6], 0.016, '#b0b0b8', 4);
      mb.box(lx, y + s * 1.27, z - s * 0.1 + Math.sin(a) * s * 0.62, 0.05, 0.07, 0.05, knobs[i % 3]); }
    mb.box(x, y + s * 0.3, z + s * 0.11, s * 0.3, s * 0.1, 0.01, '#e8e0c0');
  };
  // steam locomotive (block prop along its longer side, smokebox east at rot 0): running board and
  // frame, boiler with smokestack, domes and headlamp, cowcatcher, drive wheels with rods. The cab is
  // a walkable tile area to its west. o.col boiler, o.col2 trim; 1.2 m running board like `hopper`
  P.locomotive = (mb, x, y, z, s, th, nb, o = {}) => {
    const along = (o.bw || 1) >= (o.bh || 1), L = (along ? o.bw || 1 : o.bh || 1) * s, Wd = (along ? o.bh || 1 : o.bw || 1) * s;
    const c = o.col || '#2e2c2a', t = o.col2 || '#8a2a20', brass = '#b89048', gm = glowOf(o, mb), rail = y - 1.2;
    mb.push(); mb.translate(x, 0, z); if (!along) mb.rotate(0, -Math.PI / 2, 0);
    const deck = rail + 1.2, R = Wd * 0.34, bz = 0, x0 = -L / 2, x1 = L / 2;
    mb.box(0, deck - 0.06, 0, L, 0.12, Wd * 0.96, { side: sh(c, -0.1), top: sh(c, 0.12) });               // running board
    mb.box(0, deck - 0.35, 0, L * 0.94, 0.46, Wd * 0.5, sh(c, -0.35));                                    // frame
    mb.push(); mb.translate(x0 + 0.05, deck + R + 0.02, bz); mb.rotate(0, 0, -Math.PI / 2);
    mb.prism(0, 0, 0, R, R, L * 0.82, 14, c, true, true, true);                                            // boiler
    [0.2, 0.45, 0.7].forEach(f => mb.prism(0, L * 0.82 * f, 0, R + 0.012, R + 0.012, 0.04, 14, brass, false, false, false));
    mb.prism(0, L * 0.82, 0, R * 1.04, R * 1.04, L * 0.14, 14, sh(c, -0.25));                           // smokebox
    mb.pop();
    const sx = x0 + L * 0.9;
    // backhead facing the cab: firebox door glowing, pressure gauges
    mb.box(x0 - 0.02, deck + R * 0.7, bz, 0.04, R * 0.8, R * 0.9, sh(c, -0.3));
    withXf(mb, gm, g => { g.box(x0 - 0.045, deck + R * 0.6, bz, 0.01, R * 0.4, R * 0.5, '#ff7a20'); [-1, 1].forEach(k => g.box(x0 - 0.045, deck + R * 1.55, bz + k * R * 0.35, 0.01, R * 0.34, R * 0.34, '#f0ead0')); });
    o.light && o.light([x0 - 0.3, deck + R * 0.7, 0], '#ff9040', 1.4);
    mb.push(); mb.translate(x1 - 0.005, deck + R + 0.02, bz); mb.rotate(0, 0, -Math.PI / 2); mb.prism(0, 0, 0, R * 0.98, R * 0.9, 0.02, 14, sh(c, -0.45)); mb.pop();
    mb.prism(sx - 0.1, deck + R * 1.9, bz, R * 0.32, R * 0.42, R * 0.9, 10, sh(c, -0.1));                // smokestack
    mb.prism(sx - 0.1, deck + R * 1.9 + R * 0.9, bz, R * 0.46, R * 0.5, 0.08, 10, sh(c, -0.25));
    mb.sphere(x0 + L * 0.5, deck + R * 1.9, bz, R * 0.34, R * 0.3, R * 0.34, brass, 8, 5, true, null, 3); // steam dome
    mb.sphere(x0 + L * 0.3, deck + R * 1.9, bz, R * 0.28, R * 0.24, R * 0.28, sh(c, 0.1), 8, 5, true, null, 3);
    mb.box(x1 + 0.04, deck + R * 1.6, bz, 0.14, 0.16, 0.16, sh(c, 0.1)); withXf(mb, gm, g => g.box(x1 + 0.115, deck + R * 1.6, bz, 0.01, 0.1, 0.1, '#fff0b0'));
    o.light && o.light([x1 + 0.4, deck + R, 0], '#ffe8a0', 1.6);
    // cowcatcher
    mb.quad([x1 + 0.02, deck - 0.1, -Wd * 0.45], [x1 + 0.02, deck - 0.1, Wd * 0.45], [x1 + 0.4, rail + 0.06, Wd * 0.3], [x1 + 0.4, rail + 0.06, -Wd * 0.3], t);
    // wheels: three drivers and a pilot pair per side, rods
    [-1, 1].forEach(k => { const wz = k * (Wd * 0.48 + 0.03);
      const whl = (wx, r) => { mb.push(); mb.translate(wx, rail + r, wz); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, -0.03, 0, r, r, 0.06, 12, '#26262a'); mb.prism(0, -0.034, 0, r * 0.8, r * 0.8, 0.068, 12, t); mb.prism(0, -0.04, 0, r * 0.25, r * 0.25, 0.08, 6, '#2a2a2e'); mb.pop(); };
      const dr = [x0 + L * 0.2, x0 + L * 0.42, x0 + L * 0.64]; dr.forEach(wx => whl(wx, 0.3)); whl(x0 + L * 0.84, 0.16); whl(x0 + L * 0.96, 0.16);
      mb.box((dr[0] + dr[2]) / 2, rail + 0.3, wz + k * 0.05, dr[2] - dr[0], 0.05, 0.03, '#b0b0b8');
      mb.box(0, rail + 0.03, wz, L + 0.8, 0.06, 0.07, '#6a6a70'); });                                      // rails
    mb.pop();
  };
  // pinball machine (7th Heaven's lift switch): legs, a long cabinet sloping toward the player with a
  // lit playfield under the glass, the tall backbox with glowing art at the far (north) end
  P.pinball = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#7a2a4a', d = sh(c, -0.4), gm = glowOf(o, mb), pf = o.col2 || '#e0a030';
    [[-1, -0.9], [1, -0.9], [-1, 1], [1, 1]].forEach(([a, b]) => mb.box(x + a * s * 0.34, y + s * 0.3, z + b * s * 0.5, s * 0.06, s * 0.6, s * 0.06, '#26262a'));
    mb.push(); mb.translate(x, y + s * 0.74, z + s * 0.06); mb.rotate(-0.12, 0, 0);
    mb.box(0, 0, 0, s * 0.8, s * 0.26, s * 1.16, { side: c, front: sh(c, 0.12), top: d, back: d });
    mb.box(0, s * 0.135, 0, s * 0.82, s * 0.02, s * 1.18, sh(c, 0.25));
    withXf(mb, gm, g => {
      g.box(0, s * 0.14, 0, s * 0.68, 0.004, s * 1.04, pf);
      [['#40e0ff', -0.16, 0.2], ['#ff4060', 0.15, 0.05], ['#80ff60', -0.05, -0.25], ['#ffffff', 0.12, -0.12], ['#ff9020', 0, 0.36]].forEach(([k, a, b]) => g.prism(a * s, s * 0.142, b * s, s * 0.07, s * 0.07, 0.006, 6, k));
      g.box(-s * 0.12, s * 0.143, s * 0.44, s * 0.18, 0.004, s * 0.04, '#ffffff'); g.box(s * 0.12, s * 0.143, s * 0.44, s * 0.18, 0.004, s * 0.04, '#ffffff');
    });
    mb.pop();
    mb.box(x, y + s * 1.25, z - s * 0.52, s * 0.84, s * 0.8, s * 0.16, { side: d, front: c, top: d, back: d });
    gm.box(x, y + s * 1.28, z - s * 0.438, s * 0.7, s * 0.58, 0.004, o.col3 || '#ff7a30');
    gm.box(x, y + s * 1.42, z - s * 0.434, s * 0.5, s * 0.14, 0.004, '#fff0a0');
    gm.box(x, y + s * 1.14, z - s * 0.434, s * 0.3, s * 0.1, 0.004, '#40d0ff');
    o.light && o.light([x, y + s * 1.2, z], pf, 1.6);
  };
  // Gold Saucer arcade cabinets (Wonder Square): one look per game, so the row reads at a glance - the shape says
  // what it plays (a hoop, a bike, a claw case, a little house, a periscope...) and a lit sign says its name.
  // o.game: super_dunk | g_bike | catcher | mog_house | battler | fortune | snowboard | torpedo | condor.
  // Facing south (+z), the way the player walks up to them.
  const ARCADE = {
    super_dunk: { sign: ['SUPER DUNK'], col: '#d8661a', trim: '#241810', neon: '#ffb040' },
    g_bike: { sign: ['G-BIKE'], col: '#c02830', trim: '#18181c', neon: '#ff5a50' },
    catcher: { sign: ['WONDER', 'CATCHER'], col: '#e060a8', trim: '#ffe070', neon: '#ff86d8' },
    mog_house: { sign: ['MOG HOUSE'], col: '#f2e4b8', trim: '#c85050', neon: '#ffe070' },
    battler: { sign: ['3-D BATTLER'], col: '#5a2a8a', trim: '#ffd030', neon: '#ffe040' },
    fortune: { sign: ['FORTUNE'], col: '#2c1a4c', trim: '#d8a840', neon: '#c890ff' },
    snowboard: { sign: ['SNOWBOARD'], col: '#3a84c8', trim: '#eaf6ff', neon: '#a8ecff' },
    torpedo: { sign: ['TORPEDO', 'ATTACK'], col: '#2a6050', trim: '#c8b040', neon: '#60ffb0' },
    condor: { sign: ['CONDOR', 'COMMAND'], col: '#6a4a2a', trim: '#e0b040', neon: '#ffd060' },
  };
  P.arcade = (mb, x, y, z, s, th, nb, o = {}) => {
    o = ctx(o);
    const A = ARCADE[o.game] || ARCADE.battler, gm = glowOf(o, mb), c = A.col, dk = sh(c, -0.45), tr = A.trim;
    const Y = (k) => y + s * k, Z = (k) => z + s * k;
    // the lit sign: a dark board with neon letters, one or two lines, centred on (x, cy) at the face z = fz
    const sign = (cy, fz, w, lines = A.sign) => {
      const n = lines.length, lh = s * (n > 1 ? 0.2 : 0.26);
      mb.box(x, cy, fz - s * 0.04, w, lh * n + s * 0.1, s * 0.08, { side: '#141218', front: '#1c1a22', top: '#141218' });
      lines.forEach((t, i) => {
        const size = Math.min(lh * 0.72, (w - s * 0.1) / Math.max(1, FF7.field.textWidth(t, 1)));
        FF7.field.text3d(gm, t, { pos: [x, cy + (n - 1) * lh / 2 - i * lh, fz + 0.002], size, col: A.neon, w: 0.18 });
      });
      o.light([x, cy, fz + s * 0.3], A.neon, 1.4);
    };
    // an upright cabinet: body (h tiles tall), side art, the screen's frame; returns the screen's face z
    const upright = (h = 2.0) => {
      mb.box(x, Y(h / 2), Z(-0.08), s * 0.84, s * h, s * 0.72, { side: sh(c, -0.12), front: c, top: dk, back: dk });
      [-1, 1].forEach(k => mb.box(x + k * s * 0.422, Y(h * 0.55), Z(-0.08), 0.01, s * h * 0.62, s * 0.5, tr));
      mb.box(x, Y(1.42), Z(0.285), s * 0.72, s * 0.6, 0.01, '#101014');
      return Z(0.29);
    };
    // a control panel sticking out at waist height: sticks and buttons
    const panel = (sticks, cols) => {
      mb.box(x, Y(0.95), Z(0.4), s * 0.84, s * 0.12, s * 0.26, { top: dk, side: sh(c, -0.25), front: tr });
      sticks.forEach(k => { mb.box(x + k * s, Y(1.07), Z(0.4), s * 0.03, s * 0.14, s * 0.03, '#202020'); mb.sphere(x + k * s, Y(1.15), Z(0.4), s * 0.045, s * 0.045, s * 0.045, '#e02020', 6, 4, true); });
      cols.forEach(([k, col]) => mb.prism(x + k * s, Y(1.01), Z(0.42), s * 0.03, s * 0.03, s * 0.02, 6, col));
    };
    switch (o.game) {
      case 'super_dunk': {   // a hoop machine: low ball cabinet, backboard and a netted ring on a post
        mb.box(x, Y(0.45), Z(0), s * 0.84, s * 0.9, s * 0.84, { side: sh(c, -0.12), front: c, top: dk });
        [-1, 1].forEach(k => mb.box(x + k * s * 0.422, Y(0.5), Z(0), 0.01, s * 0.5, s * 0.6, tr));
        [[-0.2, 0.22], [0, 0.26], [0.2, 0.2]].forEach(([a, b]) => mb.sphere(x + a * s, Y(0.98), Z(b), s * 0.085, s * 0.085, s * 0.085, '#f07a1a', 7, 5, true));
        gm.box(x, Y(0.62), Z(0.422), s * 0.34, s * 0.14, 0.01, '#ff3020');   // the score counter
        mb.box(x, Y(1.5), Z(-0.36), s * 0.08, s * 1.3, s * 0.08, '#2a2a2e');
        mb.box(x, Y(1.95), Z(-0.3), s * 0.8, s * 0.52, s * 0.04, { front: '#f4f4f0', side: '#c8c8c0' });
        [[0, 0.12, 0.34, 0.03], [0, -0.1, 0.34, 0.03], [-0.16, 0.01, 0.03, 0.25], [0.16, 0.01, 0.03, 0.25]].forEach(([a, b, w, h]) => mb.box(x + a * s, Y(1.95 + b), Z(-0.275), s * w, s * h, 0.01, '#e05a10'));
        const hy = Y(1.74), hz = Z(-0.08), hr = s * 0.17;
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; mb.box(x + Math.cos(a) * hr, hy, hz + Math.sin(a) * hr, s * 0.06, s * 0.025, s * 0.06, '#f06010'); }
        mb.prism(x, hy - s * 0.26, hz, s * 0.1, hr, s * 0.26, 8, '#f8f8f8', false);
        sign(Y(2.42), Z(-0.26), s * 0.9);
        break;
      }
      case 'g_bike': {   // a ride-on bike machine (like the real ones): a tall cabinet - shaped topper, speaker pods,
        // neon edges, a big screen - and a full-size sports bike in front of it on a checkered platform, its rear
        // wheel ringed with light. The bike runs a tile out toward the player (that tile is solid: the map's 'K')
        const H2 = 2.5, fz = Z(0.12);
        mb.box(x, Y(H2 / 2), Z(-0.16), s * 0.92, s * H2, s * 0.56, { side: '#18181c', front: '#202024', top: '#141418', back: '#141418' });
        mb.box(x, Y(1.5), fz - s * 0.005, s * 0.82, s * 0.66, 0.01, '#0c0c10');                         // the screen's bezel
        gm.box(x, Y(1.66), fz, s * 0.74, s * 0.3, 0.004, '#4a8ae0');                                  // the race: sky,
        gm.box(x, Y(1.66) - s * 0.08, fz + 0.001, s * 0.74, s * 0.05, 0.004, '#7ac070');               // hills,
        gm.box(x, Y(1.34), fz, s * 0.74, s * 0.34, 0.004, '#5a5a62');                                 // road
        [1.22, 1.33, 1.44].forEach((k, i) => gm.box(x, Y(k), fz + 0.001, s * (0.05 - i * 0.012), s * 0.06, 0.004, '#ffe040'));
        gm.box(x + s * 0.16, Y(1.42), fz + 0.001, s * 0.12, s * 0.07, 0.004, '#f4f4f4');               // the car to guard
        gm.box(x - s * 0.08, Y(1.26), fz + 0.001, s * 0.05, s * 0.09, 0.004, '#ff3030');               // you
        // neon edges down both sides, curving in at the top
        [-1, 1].forEach(k => {
          gm.box(x + k * s * 0.47, Y(1.2), fz - s * 0.02, s * 0.03, s * 1.9, s * 0.03, '#ff4080');
          gm.box(x + k * s * 0.43, Y(2.2), fz - s * 0.02, s * 0.1, s * 0.03, s * 0.03, '#ff4080');
        });
        // speaker pods above the screen, the topper sign over them
        [-1, 1].forEach(k => {
          mb.box(x + k * s * 0.3, Y(2.02), fz + s * 0.02, s * 0.28, s * 0.2, s * 0.12, c);
          mb.prism(x + k * s * 0.3, Y(2.02) - s * 0.07, fz + s * 0.08, s * 0.06, s * 0.06, 0.01, 8, '#101010');
        });
        gm.box(x, Y(2.02), fz + s * 0.03, s * 0.2, s * 0.08, 0.004, '#ffb020');                        // (the leader light)
        mb.box(x, Y(2.6), Z(-0.1), s * 1.02, s * 0.32, s * 0.08, { front: '#1c1a22', side: c, top: c });
        [-1, 1].forEach(k => mb.box(x + k * s * 0.52, Y(2.6) - k * s * 0.04, Z(-0.1), s * 0.14, s * 0.36, s * 0.08, c));   // its angled ends
        FF7.field.text3d(gm, 'G-BIKE', { pos: [x, Y(2.6), Z(-0.058)], size: Math.min(s * 0.2, s * 0.86 / FF7.field.textWidth('G-BIKE', 1)), col: A.neon, w: 0.2, italic: true });
        o.light([x, Y(2.2), Z(0.5)], '#ff5070', 1.8);
        // the dash under the screen: red bodywork with its own speakers
        mb.box(x, Y(0.6), Z(0.2), s * 0.9, s * 1.2, s * 0.2, { front: c, side: sh(c, -0.2), top: sh(c, -0.1) });
        [-1, 1].forEach(k => { mb.box(x + k * s * 0.3, Y(1.06), Z(0.3), s * 0.24, s * 0.12, s * 0.16, c); mb.box(x + k * s * 0.3, Y(1.12), Z(0.3), s * 0.18, 0.01, s * 0.1, '#222'); });
        // the platform: checkered, a caution stripe at the back
        const bz0 = Z(0.28), bz1 = Z(1.74), pw = s * 0.86;
        mb.box(x, Y(0.05), (bz0 + bz1) / 2, pw, s * 0.1, bz1 - bz0, '#1a1a1e');
        for (let i = 0; i < 5; i++) for (let j = 0; j < 9; j++) if ((i + j) % 2) mb.box(x - pw / 2 + pw * (i + 0.5) / 5, Y(0.101), bz0 + (bz1 - bz0) * (j + 0.5) / 9, pw / 5, 0.004, (bz1 - bz0) / 9, '#e8e8e8');
        for (let i = 0; i < 8; i++) mb.box(x - pw / 2 + pw * (i + 0.5) / 8, Y(0.07), bz1 + 0.002, pw / 8, s * 0.06, 0.004, i % 2 ? '#101010' : '#f0c020');
        gm.box(x, Y(0.012), (bz0 + bz1) / 2, pw + s * 0.06, 0.004, bz1 - bz0 + s * 0.06, '#4a60ff');   // the underglow
        // the bike, nose to the screen - chunky moulded plastic, like the arcade ones: fairing, tank with a racing
        // stripe, seat, a raised tail with twin lights, swingarm, exhaust, and a fat rear tyre ringed with light
        const bike = c, blk = '#141416', hi = sh(bike, 0.14);
        mb.box(x, Y(0.62), Z(0.56), s * 0.5, s * 0.5, s * 0.52, { side: bike, front: bike, top: hi });            // fairing
        [-1, 1].forEach(k => mb.box(x + k * s * 0.26, Y(0.66), Z(0.6), 0.01, s * 0.18, s * 0.3, '#f4f4f4'));      // (its number boards)
        mb.box(x, Y(0.9), Z(0.88), s * 0.44, s * 0.22, s * 0.36, { side: bike, top: hi, front: bike });           // tank
        mb.box(x, Y(1.012), Z(0.84), s * 0.1, 0.004, s * 0.5, '#f4f4f4');                                        // stripe
        mb.box(x, Y(0.56), Z(0.92), s * 0.3, s * 0.36, s * 0.5, '#8a8a92');                                      // engine
        mb.box(x, Y(0.92), Z(1.2), s * 0.4, s * 0.12, s * 0.36, blk);                                            // seat
        mb.box(x, Y(1.02), Z(1.47), s * 0.36, s * 0.18, s * 0.28, { side: bike, top: hi, front: bike });         // tail
        [-1, 1].forEach(k => gm.box(x + k * s * 0.09, Y(1.0), Z(1.612), s * 0.12, s * 0.08, 0.004, '#ff2020'));   // tail lights
        o.light([x, Y(1.0), Z(1.9)], '#ff3030', 0.9);
        mb.box(x, Y(0.96), Z(0.5), s * 0.26, s * 0.14, s * 0.14, blk);                                           // the dash
        [-0.06, 0.06].forEach(a => gm.box(x + a * s, Y(1.034), Z(0.5), s * 0.07, 0.004, s * 0.07, '#40e0ff'));
        mb.box(x, Y(1.05), Z(0.6), s * 0.74, s * 0.04, s * 0.04, blk);                                           // handlebars
        [-1, 1].forEach(k => { mb.box(x + k * s * 0.39, Y(1.05), Z(0.6), s * 0.12, s * 0.06, s * 0.06, '#2a2a2e'); mb.box(x + k * s * 0.3, Y(1.16), Z(0.52), s * 0.1, s * 0.05, s * 0.02, '#c8ccd0'); });   // grips, mirrors
        [-1, 1].forEach(k => mb.box(x + k * s * 0.13, Y(0.5), Z(1.35), s * 0.05, s * 0.07, s * 0.5, '#9a9aa2'));    // swingarm
        mb.push(); mb.translate(x + s * 0.22, Y(0.46), Z(1.25)); mb.rotate(Math.PI / 2, 0, 0);
        mb.prism(0, 0, 0, s * 0.06, s * 0.07, s * 0.4, 8, '#c8ccd0', true); mb.pop();                            // exhaust
        const wz = Z(1.54), wr = s * 0.36, ww = s * 0.32, wy = Y(0.1) + wr;
        mb.push(); mb.translate(x, wy, wz); mb.rotate(0, 0, Math.PI / 2);
        mb.prism(0, -ww / 2, 0, wr, wr, ww, 14, blk, true);                                                    // the tyre
        mb.pop();
        // the light ring: a glowing disc under a dark hub on each side, and a lit band round the tread's edges
        // (the part the camera sees from behind)
        [-1, 1].forEach(k => {
          withXf(mb, gm, g => { g.push(); g.translate(x + k * (ww / 2 + 0.002), wy, wz); g.rotate(0, 0, Math.PI / 2); g.prism(0, 0, 0, wr * 0.84, wr * 0.84, 0.003, 14, '#40e8ff', true); g.pop(); });
          mb.push(); mb.translate(x + k * (ww / 2 + 0.004), wy, wz); mb.rotate(0, 0, Math.PI / 2); mb.prism(0, 0, 0, wr * 0.6, wr * 0.6, 0.003, 14, bike, true); mb.pop();
          for (let i = 0; i < 7; i++) {   // the upper arc of the ring, just proud of the tread's edge
            const a = -1.2 + i * 0.4, py = wy + Math.cos(a) * wr * 1.01, pz = wz + Math.sin(a) * wr * 1.01;
            gm.box(x + k * (ww / 2 - s * 0.02), py, pz, s * 0.03, s * 0.03, s * 0.12, '#40e8ff');
          }
        });
        o.light([x, Y(0.4), Z(1.2)], '#5070ff', 1.4);
        break;
      }
      case 'catcher': {   // a claw machine: a see-through case of plush prizes and the claw hanging over them
        mb.box(x, Y(0.4), Z(0), s * 0.86, s * 0.8, s * 0.84, { side: sh(c, -0.12), front: c, top: dk });
        mb.box(x + s * 0.22, Y(0.36), Z(0.422), s * 0.22, s * 0.2, 0.01, '#1a1a1a');                 // prize chute
        mb.box(x + s * 0.22, Y(0.48), Z(0.425), s * 0.26, s * 0.04, 0.01, tr);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => mb.box(x + a * s * 0.4, Y(1.3), Z(b * 0.38), s * 0.05, s * 1.0, s * 0.05, tr));
        mb.box(x, Y(1.86), Z(0), s * 0.88, s * 0.14, s * 0.86, { side: c, front: c, top: dk });
        [['#f4f4f4', -0.2, 0.1], ['#f0d020', 0.05, -0.1], ['#50b050', 0.2, 0.14], ['#f090c0', -0.05, 0.18], ['#f4f4f4', 0.15, -0.2]].forEach(([k, a, b], i) =>
          mb.sphere(x + a * s, Y(0.9), Z(b), s * 0.1, s * 0.1, s * 0.1, k, 6, 4, true));
        mb.sphere(x - s * 0.2, Y(1.02), Z(0.1), s * 0.035, s * 0.035, s * 0.035, '#e02020', 5, 3, true);   // (a moogle's pom-pom)
        mb.box(x, Y(1.75), Z(0), s * 0.8, s * 0.03, s * 0.04, '#9098a0');                               // gantry
        mb.box(x - s * 0.05, Y(1.58), Z(0), s * 0.015, s * 0.34, s * 0.015, '#c0c4c8');                 // cable
        [0, 2.1, 4.2].forEach(a => mb.spike([x - s * 0.05, Y(1.41), Z(0)], [Math.cos(a) * 0.5, -1, Math.sin(a) * 0.5], s * 0.14, s * 0.02, 4, '#c8ccd0'));
        gm.box(x, Y(1.66), Z(0.4), s * 0.7, s * 0.02, 0.004, '#fff0a0');                                // the case's light strip
        sign(Y(2.2), Z(0.1), s * 0.9);
        break;
      }
      case 'mog_house': {   // a little house with a lit window, a roof, and Mog himself on top
        mb.box(x, Y(0.7), Z(-0.05), s * 0.84, s * 1.4, s * 0.74, { side: sh(c, -0.1), front: c, top: dk });
        mb.prism(x, Y(1.4), Z(-0.05), s * 0.66, 0, s * 0.42, 4, tr);
        gm.box(x, Y(0.92), Z(0.325), s * 0.44, s * 0.36, 0.004, '#ffe8a0');                             // the window: Mog's story
        gm.box(x - s * 0.06, Y(0.9), Z(0.327), s * 0.12, s * 0.12, 0.004, '#ffffff');
        gm.box(x + s * 0.1, Y(0.96), Z(0.327), s * 0.07, s * 0.06, 0.004, '#ff6090');                   // (a heart)
        mb.box(x, Y(0.72), Z(0.33), s * 0.52, s * 0.04, 0.01, '#8a5a30');
        mb.box(x, Y(0.36), Z(0.36), s * 0.3, s * 0.1, s * 0.12, '#c05050');                             // the feed button
        mb.sphere(x, Y(1.97), Z(-0.05), s * 0.18, s * 0.17, s * 0.17, '#fafafa', 8, 6, true);           // Mog
        mb.sphere(x, Y(1.94), Z(0.11), s * 0.04, s * 0.03, s * 0.03, '#e89090', 5, 3, true);
        mb.box(x, Y(2.2), Z(-0.05), s * 0.015, s * 0.14, s * 0.015, '#303030');
        mb.sphere(x, Y(2.3), Z(-0.05), s * 0.06, s * 0.06, s * 0.06, '#e02030', 6, 4, true);
        [-1, 1].forEach(k => mb.spike([x + k * s * 0.14, Y(1.9), Z(-0.12)], [k, 0.6, -0.3], s * 0.16, s * 0.05, 3, '#8a60c0'));
        sign(Y(1.18), Z(0.36), s * 0.6);
        break;
      }
      case 'battler': {   // a fighting game: two fighters face off on the screen; a stick and buttons each side
        const fz = upright(2.0);
        gm.box(x, Y(1.42), fz, s * 0.64, s * 0.5, 0.004, '#3a0a14');
        gm.box(x, Y(1.24), fz + 0.001, s * 0.64, s * 0.06, 0.004, '#6a3a20');                            // the floor
        [[-0.13, '#ff3a3a'], [0.13, '#3a8aff']].forEach(([a, k]) => {
          gm.box(x + a * s, Y(1.38), fz + 0.001, s * 0.08, s * 0.2, 0.004, k);
          gm.box(x + a * s, Y(1.52), fz + 0.001, s * 0.06, s * 0.06, 0.004, '#ffd0a0');
          gm.box(x + a * s * 0.55, Y(1.42), fz + 0.001, s * 0.08, s * 0.03, 0.004, k);                  // the punches
        });
        gm.box(x, Y(1.61), fz + 0.001, s * 0.5, s * 0.03, 0.004, '#ffe040');                              // the health bars
        panel([-0.24, 0.24], [[-0.1, '#ff3030'], [-0.03, '#30a0ff'], [0.03, '#ffe030'], [0.1, '#30e060']]);
        [-1, 1].forEach(k => [0.8, 1.2, 1.6].forEach((h, i) => mb.box(x + k * s * 0.425, Y(h), Z(-0.08 + (i % 2 ? 0.1 : -0.1)), 0.012, s * 0.28, s * 0.07, tr)));   // lightning
        sign(Y(2.2), Z(0.2), s * 0.84);
        break;
      }
      case 'fortune': {   // a fortune booth: a glowing crystal ball in the window, stars on the roof. o.broken: the
        // ball dead and cracked, soot on the glass, a slip hanging out of the slot, the crown knocked askew, OUT OF ORDER
        const broke = !!o.broken;
        mb.box(x, Y(0.95), Z(-0.05), s * 0.82, s * 1.9, s * 0.72, { side: sh(c, 0.1), front: c, top: dk });
        mb.box(x, Y(1.1), Z(0.31), s * 0.56, s * 0.66, 0.01, '#120a20');
        mb.prism(x, Y(0.82), Z(0.2), s * 0.08, s * 0.12, s * 0.1, 8, tr);
        if (broke) {
          mb.sphere(x, Y(1.08), Z(0.2), s * 0.16, s * 0.16, s * 0.16, '#3a2c48', 8, 6, true);
          [[-0.04, 1.12, 0.24, 0.5], [0.05, 1.04, 0.18, -0.7]].forEach(([dx, dy, w, a]) => { mb.push(); mb.translate(x + dx * s, Y(dy), Z(0.362)); mb.rotate(0, 0, a); mb.box(0, 0, 0, s * w, s * 0.015, 0.004, '#d8d0e8'); mb.pop(); });
          mb.box(x + s * 0.06, Y(1.36), Z(0.318), s * 0.36, s * 0.14, 0.003, '#1a1418');                    // soot
          mb.box(x - s * 0.02, Y(0.66), Z(0.33), s * 0.1, s * 0.26, 0.004, '#f4f0e0');                       // the slip
        } else {
          gm.sphere(x, Y(1.08), Z(0.2), s * 0.16, s * 0.16, s * 0.16, '#e08aff', 8, 6, true);
          o.light([x, Y(1.08), Z(0.5)], '#c070ff', 1.6);
          [[-0.28, 1.72], [0.28, 1.6], [0.1, 1.82]].forEach(([a, b]) => gm.box(x + a * s, Y(b), Z(0.315), s * 0.04, s * 0.04, 0.004, '#fff0a0'));   // stars
        }
        mb.push(); mb.translate(x + (broke ? s * 0.12 : 0), Y(broke ? 1.88 : 1.92), Z(-0.05)); if (broke) mb.rotate(0, 0, -0.4);
        mb.sphere(0, 0, 0, s * 0.3, s * 0.2, s * 0.3, tr, 8, 4, false);                                       // the dome
        [-0.25, 0, 0.25].forEach(a => mb.spike([a * s, s * 0.13, 0], [a, 1, 0], s * 0.18, s * 0.04, 4, tr));
        mb.pop();
        sign(Y(1.62), Z(0.36), s * 0.62, broke ? ['OUT OF', 'ORDER'] : undefined);
        break;
      }
      case 'snowboard': {   // a snowboard cabinet: a snowy slope on the screen, the board to stand on in front
        const fz = upright(2.1);
        gm.box(x, Y(1.58), fz, s * 0.64, s * 0.22, 0.004, '#80b8f0');
        gm.box(x, Y(1.32), fz, s * 0.64, s * 0.3, 0.004, '#f4f8ff');
        [[-0.2, 1.36], [0.18, 1.4], [0.02, 1.3]].forEach(([a, b]) => gm.box(x + a * s, Y(b), fz + 0.001, s * 0.05, s * 0.09, 0.004, '#2a7040'));   // trees
        gm.box(x - s * 0.06, Y(1.24), fz + 0.001, s * 0.05, s * 0.05, 0.004, '#ff3030');                // the rider
        mb.box(x, Y(0.06), Z(0.44), s * 0.44, s * 0.12, s * 0.2, '#50565e');                            // the rocking base
        mb.box(x, Y(0.15), Z(0.44), s * 0.8, s * 0.04, s * 0.2, tr);                                    // the board
        [-0.18, 0.18].forEach(a => mb.box(x + a * s, Y(0.19), Z(0.44), s * 0.08, s * 0.05, s * 0.12, '#f0c020'));   // bindings
        mb.box(x, Y(1.0), Z(0.33), s * 0.64, s * 0.05, s * 0.05, '#c8ccd0');                            // grab bar
        sign(Y(2.3), Z(0.2), s * 0.84);
        break;
      }
      case 'torpedo': {   // a periscope game: the sea on the screen, a periscope with handles to look through
        const fz = upright(1.7);
        gm.box(x, Y(1.3), fz, s * 0.64, s * 0.46, 0.004, '#0a2a4a');
        [0.1, 0.18, 0.26].forEach(r => { for (let i = 0; i < 6; i++) { const a = -0.6 + i * 0.24; gm.box(x + Math.sin(a) * r * s, Y(1.12) + Math.cos(a) * r * s, fz + 0.001, s * 0.03, s * 0.02, 0.004, '#40ff90'); } });   // sonar
        gm.box(x + s * 0.12, Y(1.42), fz + 0.001, s * 0.14, s * 0.04, 0.004, '#a0a8b0');               // an enemy sub
        mb.prism(x, Y(1.7), Z(0.2), s * 0.07, s * 0.07, s * 0.4, 8, '#3a4048', true);                   // periscope
        mb.box(x, Y(2.12), Z(0.28), s * 0.2, s * 0.14, s * 0.24, '#2a3038');
        [-1, 1].forEach(k => mb.box(x + k * s * 0.17, Y(2.08), Z(0.3), s * 0.12, s * 0.04, s * 0.04, '#101014'));
        panel([], [[-0.12, '#ff3020'], [0.12, '#ff3020']]);
        sign(Y(2.45), Z(-0.02), s * 0.84);
        break;
      }
      case 'condor': {   // Condor Command: the fort's slope on the screen, a trackball, and the condor on top
        const fz = upright(2.0);
        gm.box(x, Y(1.42), fz, s * 0.64, s * 0.5, 0.004, '#5a9a40');
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) gm.box(x - s * 0.24 + i * s * 0.16, Y(1.26) + j * s * 0.13, fz + 0.001, s * 0.16, s * 0.13, 0.004, '#4a8636');
        gm.box(x, Y(1.62), fz + 0.002, s * 0.14, s * 0.08, 0.004, '#9a6a40');                            // the shack
        [-0.18, 0, 0.18].forEach(a => gm.box(x + a * s, Y(1.44), fz + 0.002, s * 0.05, s * 0.05, 0.004, '#4a90ff'));   // your line
        [[-0.18, 1.24], [0.1, 1.3], [0.2, 1.21]].forEach(([a, b]) => gm.box(x + a * s, Y(b), fz + 0.002, s * 0.05, s * 0.05, 0.004, '#ff4a3a'));
        mb.box(x, Y(0.95), Z(0.4), s * 0.84, s * 0.12, s * 0.26, { top: dk, side: sh(c, -0.25), front: tr });
        mb.sphere(x, Y(1.02), Z(0.4), s * 0.07, s * 0.05, s * 0.07, '#ffb030', 8, 4, true);           // trackball
        [-0.22, 0.22].forEach(a => mb.prism(x + a * s, Y(1.01), Z(0.42), s * 0.035, s * 0.035, s * 0.02, 6, a < 0 ? '#ff3030' : '#30a0ff'));
        sign(Y(2.22), Z(0.2), s * 0.9);
        // the condor, wings spread over the sign
        const cy = Y(2.62), cz = Z(0.0);
        mb.sphere(x, cy, cz, s * 0.14, s * 0.12, s * 0.2, '#6a4a3a', 8, 6, true);
        mb.sphere(x, cy + s * 0.14, cz + s * 0.12, s * 0.07, s * 0.07, s * 0.08, '#ece4d4', 8, 6, true);
        mb.spike([x, cy + s * 0.13, cz + s * 0.19], [0, -0.4, 1], s * 0.08, s * 0.025, 4, '#e0b020');
        [-1, 1].forEach(k => { mb.spike([x + k * s * 0.1, cy + s * 0.03, cz], [k, 0.35, -0.1], s * 0.42, s * 0.07, 3, '#5a3a2a'); mb.spike([x + k * s * 0.1, cy, cz - s * 0.04], [k, 0.1, -0.25], s * 0.3, s * 0.05, 3, '#4a2e22'); });
        break;
      }
      default: { upright(2.0); panel([0], []); sign(Y(2.2), Z(0.2), s * 0.84); }
    }
  };
  // ---- a bowling alley (Wonder Square). A lane is two 'lane' tiles wide, running north to the pins; 'lanecap' tiles
  // (the raised capping) sit between lanes. Gutters line the sides that have no lane beside them, the aiming arrows
  // sit a third of the way up, the foul line crosses the last tile; over the top tile hangs the pinsetter's hood.
  const hood = (mb, gm, x, y, z, s) => {
    mb.box(x, y + s * 2.3, z - s * 0.1, s * 1.02, s * 0.9, s * 0.8, { side: '#1a1a24', front: '#22222e', top: '#14141c' });
    gm.box(x, y + s * 1.9, z + s * 0.305, s * 1.02, s * 0.06, 0.004, '#40d0ff');
  };
  P.lane = (mb, x, y, z, s, th, nb, o = {}) => {
    const gm = glowOf(o, mb), top = y + s * 0.05, row = Math.floor(z / s);
    mb.box(x, y + s * 0.025, z, s, s * 0.05, s, { top: '#dcb27a', side: '#8a6a40' });
    for (let i = 1; i < 6; i++) mb.box(x - s * 0.5 + i * s / 6, top + 0.001, z, 0.004, 0.002, s, '#c49a64');   // the boards
    if (!nb.w) mb.box(x - s * 0.42, top - s * 0.02, z, s * 0.16, s * 0.02, s, '#3a3440');                      // gutters
    if (!nb.e) mb.box(x + s * 0.42, top - s * 0.02, z, s * 0.16, s * 0.02, s, '#3a3440');
    if (row % 13 === 10) [-0.25, 0.25].forEach(a => mb.spike([x + a * s, top + 0.002, z + s * 0.2], [0, 0, -1], s * 0.25, s * 0.05, 3, '#6a3a20'));   // the arrows
    if (!nb.s) mb.box(x, top + 0.002, z + s * 0.46, s, 0.003, s * 0.04, '#202020');                            // the foul line
    if (!nb.n) { mb.box(x, top + 0.001, z - s * 0.1, s * 0.9, 0.002, s * 0.7, '#e8c890'); hood(mb, gm, x, y, z, s); }
  };
  P.lanecap = (mb, x, y, z, s, th, nb, o = {}) => {
    mb.box(x, y + s * 0.07, z, s, s * 0.14, s, { top: '#6a4a30', side: '#4a3420' });
    mb.box(x, y + s * 0.15, z, s * 0.3, s * 0.02, s, '#8a6a48');
    if (!nb.n) hood(mb, glowOf(o, mb), x, y, z, s);
  };
  // the ten pins (a moving object: o.down knocks them over), set in a triangle with the head pin toward the bowler
  P.pins = (mb, x, y, z, s, th, nb, o = {}) => {
    const d = s * 0.14, spots = [];
    for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) spots.push([(i - r / 2) * d, -r * d * 0.9]);
    spots.forEach(([a, b], i) => {
      const px = x + a, pz = z + b + s * 0.2, fallen = o.down && (i * 7 + 3) % 10 > 1;   // (knocked down: all but one or two)
      if (!fallen) {
        mb.prism(px, y + s * 0.05, pz, s * 0.035, s * 0.045, s * 0.2, 7, '#f4f4f0', true);
        mb.box(px, y + s * 0.22, pz, s * 0.06, s * 0.02, s * 0.06, '#d02020');
        mb.sphere(px, y + s * 0.28, pz, s * 0.03, s * 0.04, s * 0.03, '#f4f4f0', 6, 4, true);
      } else {
        mb.push(); mb.translate(px + ((i * 13) % 7 - 3) * s * 0.04, y + s * 0.08, pz - ((i * 5) % 4) * s * 0.05); mb.rotate(Math.PI / 2, (i * 1.7) % 3.1, 0);
        mb.prism(0, -s * 0.12, 0, s * 0.035, s * 0.045, s * 0.24, 7, '#f4f4f0', true); mb.box(0, s * 0.06, 0, s * 0.06, s * 0.02, s * 0.06, '#d02020'); mb.pop();
      }
    });
  };
  P.bowlball = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#2a40c0';
    mb.sphere(x, y + s * 0.2, z, s * 0.2, s * 0.2, s * 0.2, c, 10, 8, true);
    [[-0.05, 0.3], [0.05, 0.3], [0, 0.22]].forEach(([a, b]) => mb.sphere(x + a * s, y + b * s, z + s * 0.16, s * 0.025, s * 0.025, s * 0.025, '#101010', 5, 3, true));
  };
  // a ball return between lanes: a rounded hood the balls roll out of, three waiting on the rails
  P.ballreturn = (mb, x, y, z, s, th, nb, o = {}) => {
    mb.box(x, y + s * 0.25, z - s * 0.3, s * 0.8, s * 0.5, s * 0.4, { side: '#3a3a48', front: '#4a4a5a', top: '#2a2a36' });
    mb.sphere(x, y + s * 0.5, z - s * 0.3, s * 0.4, s * 0.25, s * 0.2, '#4a4a5a', 8, 4, true, null, 3);
    [-0.2, 0.2].forEach(a => mb.box(x + a * s, y + s * 0.3, z + s * 0.1, s * 0.05, s * 0.05, s * 0.8, '#9a9ea8'));
    [['#c02828', -0.1], ['#2a40c0', 0.18], ['#28a048', 0.42]].forEach(([c, b]) => mb.sphere(x, y + s * 0.44, z + b * s, s * 0.13, s * 0.13, s * 0.13, c, 8, 6, true));
  };
  // a scoreboard hung over the approach, two tiles wide (at: the left one): the lane's number, its score and the last
  // four frames (o.frames)
  P.scoreboard = (mb, x, y, z, s, th, nb, o = {}) => {
    const gm = glowOf(o, mb), cx = x + s * 0.5, hy = y + s * 3.9;
    [-0.7, 0.7].forEach(a => mb.box(cx + a * s, hy + s * 0.9, z, s * 0.04, s * 1.4, s * 0.04, '#2a2a30'));
    mb.box(cx, hy, z, s * 1.8, s * 0.6, s * 0.08, { front: '#101018', side: '#20202a', top: '#20202a' });
    FF7.field.text3d(gm, 'LANE ' + (o.lane || 1), { pos: [cx - s * 0.45, hy + s * 0.12, z + s * 0.045], size: s * 0.13, col: '#ffe060', w: 0.2 });
    FF7.field.text3d(gm, String(o.score || 0), { pos: [cx + s * 0.55, hy + s * 0.12, z + s * 0.045], size: s * 0.15, col: '#60ff90', w: 0.2 });
    (o.frames || ['X', '9/', '7-', 'X']).forEach((t, i) => FF7.field.text3d(gm, t, { pos: [cx - s * 0.6 + i * s * 0.34, hy - s * 0.14, z + s * 0.045], size: s * 0.09, col: '#e0e8ff', w: 0.2 }));
    o.light && o.light([cx, hy, z + s * 0.4], '#6080ff', 1.2);
  };
  // the cafe's counter: a glass case of burgers, fries and drinks, a register, a light strip (front: +z)
  P.foodcounter = (mb, x, y, z, s, th, nb, o = {}) => {
    const gm = glowOf(o, mb), c = o.col || '#c84a3a';
    mb.box(x, y + s * 0.45, z, s, s * 0.9, s * 0.8, { side: sh(c, -0.15), front: c, top: '#f0e8d8' });
    gm.box(x, y + s * 0.72, z + s * 0.405, s * 0.96, s * 0.05, 0.004, '#ffe070');
    const k = (Math.round(x / s - 0.5) + Math.round(z / s - 0.5)) % 3;   // (tile by tile: burgers, fries and drinks, the register)
    if (k === 0) {   // burgers under glass
      [-0.22, 0.2].forEach(a => { mb.sphere(x + a * s, y + s * 0.98, z, s * 0.12, s * 0.06, s * 0.12, '#d89040', 7, 4, true); mb.box(x + a * s, y + s * 0.94, z, s * 0.24, s * 0.03, s * 0.24, '#5a3018'); mb.box(x + a * s, y + s * 0.96, z, s * 0.26, s * 0.012, s * 0.26, '#60b040'); });
    } else if (k === 1) {   // fries and drinks
      [-0.25, 0].forEach(a => { mb.box(x + a * s, y + s * 1.0, z, s * 0.14, s * 0.14, s * 0.1, '#d02020'); for (let i = 0; i < 4; i++) mb.box(x + a * s + (i - 1.5) * s * 0.025, y + s * 1.1, z, s * 0.015, s * 0.1, s * 0.015, '#f0d040'); });
      [0.25].forEach(a => { mb.prism(x + a * s, y + s * 0.9, z, s * 0.06, s * 0.08, s * 0.22, 8, '#f4f4f4', true); mb.box(x + a * s + s * 0.02, y + s * 1.18, z, s * 0.012, s * 0.12, s * 0.012, '#e02060'); });
    } else {   // the register
      mb.box(x, y + s * 1.02, z - s * 0.1, s * 0.4, s * 0.24, s * 0.3, '#3a3a44'); gm.box(x, y + s * 1.06, z + s * 0.055, s * 0.26, s * 0.08, 0.004, '#60ff90');
    }
  };
  // a cafe table with its meal: plates of burgers and fries, cups with straws, a ketchup bottle
  P.foodtable = (mb, x, y, z, s, th, nb, o = {}) => {
    mb.prism(x, y + s * 0.02, z, s * 0.2, s * 0.24, s * 0.04, 10, '#3a3a44', true);
    mb.box(x, y + s * 0.34, z, s * 0.07, s * 0.62, s * 0.07, '#8a8e98');
    mb.prism(x, y + s * 0.64, z, s * 0.44, s * 0.44, s * 0.05, 14, '#f0e8d8', true);
    const top = y + s * 0.69;
    [[-0.2, 0.08], [0.2, -0.08]].forEach(([a, b], i) => {
      mb.prism(x + a * s, top, z + b * s, s * 0.14, s * 0.14, s * 0.01, 10, '#ffffff', true);
      if (i === 0) { mb.sphere(x + a * s, top + s * 0.06, z + b * s, s * 0.08, s * 0.045, s * 0.08, '#d89040', 7, 4, true); mb.box(x + a * s, top + s * 0.035, z + b * s, s * 0.15, s * 0.02, s * 0.15, '#5a3018'); }
      else { mb.box(x + a * s, top + s * 0.05, z + b * s, s * 0.1, s * 0.08, s * 0.07, '#d02020'); for (let k = 0; k < 3; k++) mb.box(x + a * s + (k - 1) * s * 0.025, top + s * 0.11, z + b * s, s * 0.014, s * 0.06, s * 0.014, '#f0d040'); }
    });
    [[0.05, 0.25], [-0.05, -0.25]].forEach(([a, b]) => { mb.prism(x + a * s, top, z + b * s, s * 0.045, s * 0.055, s * 0.16, 8, '#f4f4f4', true); mb.box(x + a * s + s * 0.015, top + s * 0.2, z + b * s, s * 0.01, s * 0.1, s * 0.01, '#20a0e0'); });
    mb.prism(x - s * 0.02, top, z - s * 0.02, s * 0.025, s * 0.02, s * 0.12, 6, '#d02020', true);
  };
  // jukebox: cabinet with a glowing arched top and a coloured light band
  P.jukebox = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#6a3a24', gm = glowOf(o, mb), lit = o.col2 || '#ffb040';
    mb.box(x, y + s * 0.55, z, s * 0.8, s * 1.1, s * 0.5, { side: sh(c, -0.2), front: c, top: c });
    mb.push(); mb.translate(x, y + s * 1.1, z - s * 0.25); mb.rotate(Math.PI / 2, 0, 0);
    mb.prism(0, 0, 0, s * 0.4, s * 0.4, s * 0.5, 10, sh(c, 0.05), false, true, true); mb.pop();
    // the arch: coloured bands just proud of the front face
    for (let i = 0; i < 9; i++) { const a0 = Math.PI * i / 9, a1 = Math.PI * (i + 1) / 9, r0 = s * 0.3, r1 = s * 0.38, zf = z + s * 0.252;
      const p = (a, r) => [x + Math.cos(a) * r, y + s * 1.1 + Math.sin(a) * r, zf];
      gm.quad(p(a1, r0), p(a0, r0), p(a0, r1), p(a1, r1), ['#ff5030', '#ffb040', '#f8e060', '#60e0ff'][i % 4]); }
    gm.box(x, y + s * 0.95, z + s * 0.252, s * 0.5, s * 0.2, 0.004, lit);
    mb.box(x, y + s * 0.5, z + s * 0.252, s * 0.55, s * 0.4, 0.004, sh(c, -0.45));
    [0.3, 0.42, 0.54, 0.66].forEach(h => gm.box(x, y + s * h, z + s * 0.254, s * 0.5, s * 0.02, 0.004, sh(lit, -0.2)));
    o.light && o.light([x, y + s * 1.1, z + 0.3], lit, 1.6);
  };
  // whiteboard on a wheeled stand (o.wall: fixed to the wall behind), scribbled plans
  P.whiteboard = (mb, x, y, z, s, th, nb, o = {}) => {
    const w = s * (o.w || 1.8), f = '#9aa0a8', zb = z + (o.wall ? -s * 0.44 : 0);
    if (!o.wall) { [-1, 1].forEach(k => { mb.box(x + k * w * 0.45, y + s * 0.8, zb, s * 0.05, s * 1.6, s * 0.05, f); mb.box(x + k * w * 0.45, y + s * 0.03, zb, s * 0.08, s * 0.06, s * 0.6, sh(f, -0.3)); }); }
    mb.box(x, y + s * 1.2, zb, w, s * 0.9, s * 0.04, { side: f, front: o.col || '#f2f2ee', back: f, top: f });
    mb.box(x, y + s * 0.74, zb + s * 0.05, w * 0.9, s * 0.03, s * 0.08, f);
    const ink = ['#2a3a8a', '#a02a2a', '#2a2a2a'], zf = zb + s * 0.022;
    for (let i = 0; i < 9; i++) { const r = rnd(x, z, i), r2 = rnd(x, z, i + 20); const px = x + (r - 0.5) * w * 0.8, py = y + s * (0.9 + r2 * 0.55);
      mb.quad([px, py, zf], [px + s * (0.08 + r * 0.2), py + s * (r2 - 0.5) * 0.1, zf], [px + s * (0.08 + r * 0.2), py + s * 0.025 + s * (r2 - 0.5) * 0.1, zf], [px, py + s * 0.025, zf], ink[i % 3]); }
  };
  // punching bag hanging from a steel frame
  P.punchbag = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#8a2a20', m = '#4a4e56';
    mb.box(x, y + s * 0.02, z - s * 0.3, s * 0.6, s * 0.04, s * 0.3, sh(m, -0.2));
    mb.box(x, y + s * 1.1, z - s * 0.38, s * 0.08, s * 2.2, s * 0.08, m);
    mb.box(x, y + s * 2.18, z - s * 0.2, s * 0.08, s * 0.08, s * 0.44, m);
    mb.box(x, y + s * 2.0, z, s * 0.02, s * 0.36, s * 0.02, '#909090');
    mb.prism(x, y + s * 0.8, z, s * 0.2, s * 0.22, s * 1.0, 8, c, true);
    mb.prism(x, y + s * 1.8, z, s * 0.22, s * 0.1, s * 0.08, 8, sh(c, -0.2));
    mb.prism(x, y + s * 0.74, z, s * 0.12, s * 0.2, s * 0.06, 8, sh(c, -0.2));
    mb.prism(x, y + s * 1.25, z, s * 0.225, s * 0.225, s * 0.06, 8, sh(c, 0.2), false, false, false);
  };
  // heart-shaped bed (Don Corneo): base, heart mattress (o.col), rounded headboard at the lobes; o.r = radius in tiles
  P.heartbed = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = s * (o.r || 1.4), c = o.col || '#f070b0', base = o.col2 || '#c03050';
    const pts = []; for (let i = 0; i < 28; i++) { const t = i / 28 * Math.PI * 2, hx = 16 * Math.pow(Math.sin(t), 3), hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); pts.push([x + hx / 17 * R, z - (hy + 2) / 17 * R]); }
    const P0 = ccw(pts), grow = (k) => P0.map(p => [x + (p[0] - x) * k, z + (p[1] - z) * k]);
    mb.extrude(grow(1.04), y, y + s * 0.3, base, sh(base, 0.1));
    mb.extrude(P0, y + s * 0.3, y + s * 0.55, sh(c, -0.1), c);
    mb.extrude(grow(0.7), y + s * 0.55, y + s * 0.58, sh(c, 0.1), sh(c, 0.18));
    [-1, 1].forEach(k => mb.sphere(x + k * R * 0.45, y + s * 0.62, z - R * 0.48, s * 0.28, s * 0.14, s * 0.2, '#f8f0f4', 8, 4));
    const hb = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.1 + 0.8 * i / 12); hb.push([x - Math.cos(a) * R * 0.9, z - R * 0.9 - Math.sin(a) * R * 0.18]); }
    for (let i = 0; i + 1 < hb.length; i++) mb.box((hb[i][0] + hb[i + 1][0]) / 2, y + s * 0.9, (hb[i][1] + hb[i + 1][1]) / 2, Math.abs(hb[i + 1][0] - hb[i][0]) + s * 0.05, s * 1.2, s * 0.12, { side: base, top: o.col3 || '#e0b040', front: sh(base, 0.1) });
  };
  // mahjong table: wooden frame, green felt, the four walls of tiles
  P.mahjong = (mb, x, y, z, s, th, nb, o = {}) => {
    const w = s * (o.w || 1.6), c = o.col || '#2e7a44', f = o.col2 || (th.wood ? th.wood[0] : '#6a3a20');
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => mb.box(x + a * w * 0.42, y + s * 0.2, z + b * w * 0.42, s * 0.08, s * 0.4, s * 0.08, sh(f, -0.2)));
    mb.box(x, y + s * 0.44, z, w, s * 0.08, w, { side: f, top: f });
    mb.box(x, y + s * 0.485, z, w * 0.86, s * 0.01, w * 0.86, c);
    const tile = '#f0ece0', L = w * 0.5;
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([a, b]) => mb.box(x + a * L * 0.72, y + s * 0.52, z + b * L * 0.72, a ? s * 0.07 : L * 1.2, s * 0.06, a ? L * 1.2 : s * 0.07, { side: tile, top: sh(tile, 0.05), front: '#3a8a54' }));
  };
  // paper lantern: glowing ribbed body with dark caps; o.hang = height it hangs at (m), else it stands on a pole
  P.lantern = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || th.lantern || '#ff5a40', gm = glowOf(o, mb), sz = o.size || 1;
    const r = s * 0.28 * sz, h = s * 0.62 * sz, cy = y + (o.hang != null ? o.hang : o.pole === false ? h * 0.62 + 0.02 : s * 1.9 + Math.max(0, h * 0.5 - s * 0.31));
    if (o.hang == null && o.pole !== false) { mb.prism(x, y, z, s * 0.03, s * 0.03, cy - y - h * 0.5, 5, '#2a2018'); mb.box(x, y + 0.02, z, s * 0.3, 0.04, s * 0.3, '#2a2018'); }
    if (o.hang != null) mb.box(x, cy + h * 0.5 + s * 0.3, z, 0.012, s * 0.6, 0.012, '#202020');
    gm.sphere(x, cy, z, r, h * 0.5, r, c, 10, 6, true);
    for (let i = -2; i <= 2; i++) { const yy = cy + i * h * 0.19, rr = r * Math.sqrt(Math.max(0.05, 1 - Math.pow(i * 0.38, 2))) + 0.004; gm.prism(x, yy, z, rr, rr, 0.008, 10, sh(c, -0.25), false, false, false); }
    mb.prism(x, cy + h * 0.44, z, r * 0.42, r * 0.42, h * 0.12, 8, '#1e1a16'); mb.prism(x, cy - h * 0.56, z, r * 0.42, r * 0.42, h * 0.12, 8, '#1e1a16');
    if (o.text) FF7.field.text3d(mb, o.text, { pos: [x, cy, z + r + 0.004], size: h * 0.4, col: o.textCol || '#2a1008', w: 0.2 });
    o.light && o.light([x, cy, z], c, 1.8 * sz);
  };
  // valve wheel on a riser pipe (o.wall: mounted on the wall behind)
  P.valve = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#b02a20', m = th.metal ? th.metal[0] : '#5a6068', h = o.h || s * 1.3, zw = z + (o.wall ? -s * 0.4 : 0);
    if (!o.wall) mb.prism(x, y, z, s * 0.1, s * 0.1, h, 7, m, true);
    mb.push(); mb.translate(x, y + h, zw + s * 0.12); mb.rotate(Math.PI / 2, 0, 0);
    mb.prism(0, -s * 0.12, 0, s * 0.05, s * 0.05, s * 0.12, 6, sh(m, -0.2));
    for (let i = 0; i < 10; i++) { const a0 = i / 10 * Math.PI * 2, a1 = (i + 1) / 10 * Math.PI * 2, R = s * 0.3; beam(mb, [Math.cos(a0) * R, 0, Math.sin(a0) * R], [Math.cos(a1) * R, 0, Math.sin(a1) * R], s * 0.035, c, 4); }
    [0, 1, 2].forEach(i => { const a = i / 3 * Math.PI * 2 + 0.3; beam(mb, [0, 0, 0], [Math.cos(a) * s * 0.28, 0, Math.sin(a) * s * 0.28], s * 0.025, sh(c, -0.2), 4); });
    mb.prism(0, -0.02, 0, s * 0.06, s * 0.06, 0.04, 6, sh(c, 0.2)); mb.pop();
  };
  // hanging cloth banner: rod, waved cloth (o.col) with a border (o.col2), optional o.text / o.text2 lettering;
  // o.w = width in tiles, o.h = length (m), o.y = height of the rod (m)
  P.banner = (mb, x, y, z, s, th, nb, o = {}) => {
    const w = s * (o.w || 1), L = o.h || 1.4, top = y + (o.y != null ? o.y : 2.2), c = o.col || '#b01c1c', b = o.col2 || '#e8e0c8', n = 6;
    beam(mb, [x - w * 0.56, top, z], [x + w * 0.56, top, z], 0.02, '#3a3028', 5);
    const wav = (i) => Math.sin(i * 1.7 + x * 3) * 0.02;
    for (let i = 0; i < n; i++) {
      const xa = x - w / 2 + w * i / n, xb = xa + w / n, za = z + wav(i), zb = z + wav(i + 1);
      mb.quad([xa, top - L, za], [xb, top - L, zb], [xb, top, zb], [xa, top, za], i % 2 ? c : sh(c, -0.08));
      mb.quad([xb, top - L, zb - 0.002], [xa, top - L, za - 0.002], [xa, top, za - 0.002], [xb, top, zb - 0.002], sh(c, -0.3));
    }
    if (o.border !== false) { mb.box(x, top - L + 0.03, z + 0.004, w, 0.06, 0.004, b); [-1, 1].forEach(k => mb.box(x + k * (w / 2 - 0.02), top - L / 2, z + 0.004, 0.04, L, 0.004, b)); }
    // (the lettering always fits the cloth: a size given by hand is a most, never wider than the banner; the user,
    // 2026-10-04, the sign audit: PLATINUM, KUPO LEAGUE and others ran off their banners' edges)
    if (o.text) FF7.field.text3d(mb, o.text, { pos: [x, top - L * (o.text2 ? 0.52 : 0.5), z + 0.03], size: Math.min(o.size || L * 0.3, w * 0.88 / Math.max(1, FF7.field.textWidth(o.text, 1))), col: o.textCol || '#1a1210', w: o.textW || 0.16, italic: o.italic });
    if (o.text2) FF7.field.text3d(mb, o.text2, { pos: [x, top - L * 0.2, z + 0.03], size: Math.min(L * 0.1, w * 0.8 / Math.max(1, FF7.field.textWidth(o.text2, 1))), col: o.text2Col || b, w: 0.16 });
  };
  // tall vase / urn (o.col body, o.col2 band; look.urn)
  P.urn = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || th.urn || '#3a7a6a', b = o.col2 || '#d8b040', k = o.size || 1;
    const prof = [[0.16, 0], [0.26, 0.12], [0.36, 0.4], [0.34, 0.62], [0.2, 0.82], [0.14, 0.95], [0.2, 1.05]];
    for (let i = 0; i + 1 < prof.length; i++) mb.prism(x, y + prof[i][1] * s * k * 1.4, z, prof[i][0] * s * k, prof[i + 1][0] * s * k, (prof[i + 1][1] - prof[i][1]) * s * k * 1.4, 10, i === 3 ? b : sh(c, (i % 2) * 0.06), true, i === prof.length - 2, i === 0);
    mb.prism(x, y + 0.5 * s * k * 1.4, z, 0.365 * s * k, 0.365 * s * k, 0.04 * s * k, 10, b, true, false, false);
  };
  // shelf of bottles / stock against the wall behind
  P.shelf = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || (th.wood ? th.wood[0] : '#6a4a2a'), zb = z - s * 0.28;
    mb.box(x, y + s * 1.1, zb - s * 0.15, s * 0.98, s * 2.2, s * 0.06, sh(c, -0.25));
    [0.5, 1.1, 1.7].forEach(h => mb.box(x, y + s * h, zb, s * 0.98, s * 0.04, s * 0.34, c));
    const bottle = ['#3a8a4a', '#8a4a20', '#d0c060', '#4a6aa0', '#a02a2a', '#e0e0d0'];
    [0.5, 1.1, 1.7].forEach((h, j) => { for (let i = 0; i < 5; i++) { const r = rnd(x, z, i + j * 7); if (r < 0.2) continue; mb.prism(x - s * 0.38 + i * s * 0.19, y + s * (h + 0.02), zb, s * 0.05, s * 0.04, s * (0.2 + r * 0.14), 6, bottle[(i + j * 2 + Math.floor(r * 3)) % 6]); } });
  };
  // television on a low cabinet (screen glows)
  P.tv = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col2 || '#3a2a20';
    mb.box(x, y + s * 0.25, z, s * 0.9, s * 0.5, s * 0.6, { side: c, top: sh(c, 0.1) });
    mb.box(x, y + s * 0.82, z - s * 0.02, s * 0.8, s * 0.62, s * 0.5, '#2a2a2e');
    glowOf(o, mb).box(x, y + s * 0.82, z + s * 0.232, s * 0.62, s * 0.46, 0.004, o.col || '#60c8e0');
    mb.box(x, y + s * 1.2, z - s * 0.1, s * 0.02, s * 0.2, s * 0.02, '#1a1a1a');
  };
  // junk heap: tin sheets, pipes and barrels (Sector 7 scrap)
  P.scrap = (mb, x, y, z, s, th, nb, o = {}) => {
    const tin = ['#7a6a58', '#5a6a72', '#8a5a3a', '#6a7058'], k = o.size || 1;
    for (let i = 0; i < 6; i++) { const r = rnd(x, z, i), r2 = rnd(x, z, i + 11); mb.push(); mb.translate(x + (r - 0.5) * s * 0.7, y + s * (0.1 + i * 0.07) * k, z + (r2 - 0.5) * s * 0.7); mb.rotate((r - 0.5) * 1.2, r2 * 3, (r2 - 0.5) * 1.2);
      if (i % 3 === 2) mb.prism(0, -s * 0.3, 0, s * 0.06, s * 0.06, s * 0.6 * k, 6, '#5a5e64', true); else mb.box(0, 0, 0, s * (0.4 + r * 0.4) * k, s * 0.04, s * (0.3 + r2 * 0.3) * k, sh(o.col || tin[i % 4], (r - 0.5) * 0.2)); mb.pop(); }
    if (rnd(x, z, 30) > 0.5) mb.prism(x + s * 0.2, y, z - s * 0.15, s * 0.16, s * 0.16, s * 0.42, 7, '#6a4a30', true);
  };

  // ------------------------------------------------------------------ structures & set pieces
  // wooden water tower (Nibelheim): trestle legs with cross braces, a ladder, a staved tub with hoops.
  // Block prop: centred on its block of tiles (o.bw x o.bh), o.h = height of the trestle (m), o.fill = water colour
  P.watertower = (mb, x, y, z, s, th, nb, o = {}) => {
    const bw = (o.bw || 2) * s, bd = (o.bh || 2) * s, H = o.h || 2.4, wd = o.col || '#6a5236', dk = sh(wd, -0.3);
    const lx = bw * 0.4, lz = bd * 0.4;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => beam(mb, [x + a * lx * 1.12, y, z + b * lz * 1.12], [x + a * lx, y + H, z + b * lz], s * 0.07, wd, 4));
    [0.3, 0.62].forEach(t => { const yy = y + H * t, sx = lx * (1.12 - 0.12 * t), sz = lz * (1.12 - 0.12 * t);
      mb.box(x, yy, z - sz, sx * 2, s * 0.08, s * 0.06, dk); mb.box(x, yy, z + sz, sx * 2, s * 0.08, s * 0.06, dk);
      mb.box(x - sx, yy, z, s * 0.06, s * 0.08, sz * 2, dk); mb.box(x + sx, yy, z, s * 0.06, s * 0.08, sz * 2, dk); });
    [[-1, 1], [1, 1], [-1, -1]].forEach(([a, b]) => beam(mb, [x + a * lx * 1.1, y + H * 0.05, z + b * lz * 1.1], [x - a * lx, y + H * 0.58, z + b * lz], s * 0.035, dk, 4));
    mb.box(x, y + H + s * 0.05, z, bw * 1.02, s * 0.1, bd * 1.02, { side: dk, top: sh(wd, 0.1) });
    const R = Math.min(bw, bd) * 0.54, th2 = H + s * 0.1, TH = o.tank || 1.1;
    for (let i = 0; i < 14; i++) { const a0 = i / 14 * Math.PI * 2, a1 = (i + 1) / 14 * Math.PI * 2, r = R * (1 + (i % 2) * 0.01);
      const p = (a, h, rr) => [x + Math.cos(a) * rr, y + th2 + h, z + Math.sin(a) * rr];
      mb.quad(p(a1, 0, R), p(a0, 0, R), p(a0, TH, r * 1.04), p(a1, TH, r * 1.04), sh(wd, (i % 2) * 0.08 - 0.02));
      mb.quad(p(a0, 0.02, R * 0.95), p(a1, 0.02, R * 0.95), p(a1, TH, r * 0.99), p(a0, TH, r * 0.99), dk); }
    [0.15, 0.55, 0.92].forEach(h => mb.prism(x, y + th2 + h * TH - 0.02, z, R * (1.01 + h * 0.04), R * (1.02 + h * 0.04), 0.05, 14, '#3a3a38', false, false, false));
    annulus(mb, x, y + th2 + TH, z, R * 0.99, R * 1.04, 14, sh(wd, 0.12));
    disc(mb, x, y + th2 + TH - 0.12, z, R * 0.97, 14, o.fill || th.water || '#4a6a5a');
    // ladder up the south face
    const lzf = z + lz * 1.12 + s * 0.08;
    [-1, 1].forEach(k => beam(mb, [x + k * s * 0.16, y, lzf], [x + k * s * 0.16, y + th2 + TH * 0.6, lzf - s * 0.2], s * 0.03, dk, 4));
    for (let i = 1; i < 12; i++) { const t = i / 12; mb.box(x, y + (th2 + TH * 0.6) * t, lzf - s * 0.2 * t, s * 0.32, s * 0.03, s * 0.04, sh(wd, 0.1)); }
  };
  // lattice tower / pylon: four tapering legs, girders and X-braces, a top frame. o.h height (m),
  // o.w base width (tiles), o.top top width (tiles), o.arms = cross-arms (power pylon)
  P.pylon = (mb, x, y, z, s, th, nb, o = {}) => {
    const H = o.h || 4, b0 = s * (o.w || 1.6) / 2, b1 = s * (o.top || 0.6) / 2, c = o.col || '#7a4a2e', r = s * 0.045 * (o.thick || 1);
    const at = (t, a, b) => [x + a * (b0 + (b1 - b0) * t), y + H * t, z + b * (b0 + (b1 - b0) * t)];
    const C4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    C4.forEach(([a, b]) => beam(mb, at(0, a, b), at(1, a, b), r * 1.3, c, 4));
    const lv = Math.max(3, Math.round(H / 0.8));
    for (let i = 0; i <= lv; i++) { const t = i / lv;
      for (let k = 0; k < 4; k++) { const p = C4[k], q = C4[(k + 1) % 4]; beam(mb, at(t, p[0], p[1]), at(t, q[0], q[1]), r * 0.8, sh(c, -0.1), 4);
        if (i < lv) { const t2 = (i + 1) / lv; beam(mb, at(t, p[0], p[1]), at(t2, q[0], q[1]), r * 0.55, sh(c, -0.2), 4); beam(mb, at(t, q[0], q[1]), at(t2, p[0], p[1]), r * 0.55, sh(c, -0.2), 4); } } }
    if (o.arms) [0.72, 0.9].forEach(t => { const yy = y + H * t, L = s * (o.arms === true ? 1.6 : o.arms); beam(mb, [x - L, yy, z], [x + L, yy, z], r * 1.1, c, 4); [-1, 1].forEach(k => mb.box(x + k * L * 0.9, yy - s * 0.2, z, s * 0.06, s * 0.4, s * 0.06, '#d8d0b0')); });
    if (o.deck !== false) mb.box(x, y + H, z, b1 * 2.6, s * 0.06, b1 * 2.6, { side: sh(c, -0.2), top: sh(c, 0.1) });
    if (o.sign) { mb.box(x, y + H * 0.35, z + b0 * 0.8 + 0.02, s * 0.5, s * 0.5, 0.02, '#1a1a1a'); FF7.field.text3d(mb, o.sign, { pos: [x, y + H * 0.35, z + b0 * 0.8 + 0.032], size: s * 0.3, col: '#e0c020', w: 0.2 }); }
    if (o.lamp) { glowOf(o, mb).box(x, y + H + s * 0.12, z, s * 0.14, s * 0.14, s * 0.14, o.lamp); o.light && o.light([x, y + H, z], o.lamp, 2); }
  };
  // campfire: stone ring, crossed logs, embers (glow) and a flickering flame (o.col flame colour)
  P.campfire = (mb, x, y, z, s, th, nb, o = {}) => {
    o = ctx(o); const k = o.size || 1, st = o.col2 || sh(th.wall, -0.1);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r = s * 0.42 * k; mb.sphere(x + Math.cos(a) * r, y + s * 0.06 * k, z + Math.sin(a) * r, s * 0.1 * k, s * 0.08 * k, s * 0.09 * k, sh(st, (rnd(x, z, i) - 0.5) * 0.3), 5, 3, false); }
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.4; beam(mb, [x + Math.cos(a) * s * 0.36 * k, y + s * 0.02, z + Math.sin(a) * s * 0.36 * k], [x + Math.cos(a) * s * 0.04, y + s * 0.3 * k, z + Math.sin(a) * s * 0.04], s * 0.05 * k, i % 2 ? '#4a3020' : '#3a261a', 5); }
    const gm = glowOf(o, mb); disc(gm, x, y + 0.012, z, s * 0.3 * k, 8, '#ff7020'); disc(gm, x, y + 0.016, z, s * 0.16 * k, 6, '#ffd060');
    o.fire([x, y + s * 0.05, z], k, o.col || '#ff9a30');
    o.light([x, y + 0.6, z], o.col || '#ffa040', 3.2 * k);
  };
  // bare flames (a building on fire, burning debris): charred embers, a big flickering flame, firelight
  P.flames = (mb, x, y, z, s, th, nb, o = {}) => {
    o = ctx(o); const k = o.size || 1.5, gm = glowOf(o, mb);
    for (let i = 0; i < 3; i++) { const a = rnd(x, z, i) * 6.3; beam(mb, [x + Math.cos(a) * s * 0.4, y + 0.02, z + Math.sin(a) * s * 0.4], [x - Math.cos(a) * s * 0.3, y + s * 0.12, z - Math.sin(a) * s * 0.3], s * 0.06, '#1e1410', 5); }
    disc(gm, x, y + 0.01, z, s * 0.42, 8, '#c84a14'); disc(gm, x, y + 0.014, z, s * 0.22, 6, '#ffb040');
    o.fire([x, y + 0.02, z], k * (0.85 + 0.3 * rnd(x, z, 7)), o.col || '#ff8a20');
    o.light([x, y + 0.8, z], o.col || '#ff7a28', 2.2);
  };
  // round platform / dais: n-sided (o.sides, 8 = octagon), radius o.r (tiles), top o.h (m) above the
  // floor, o.skirt (m) = how far the side reaches below the floor (floating platforms), o.col / o.top / o.rim
  P.disc = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = s * (o.r || 1), n = o.sides || 24, h = o.h != null ? o.h : 0.1, sk = o.skirt || 0;
    const side = o.col || sh(th.wall, -0.05), top = o.top || (Array.isArray(th.floor) ? th.floor[0] : th.floor);
    const a0 = n === 8 ? Math.PI / 8 : 0;
    const pts = ring(x, z, R, n, a0);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; mb.quad([p[0], y - sk, p[1]], [q[0], y - sk, q[1]], [q[0], y + h, q[1]], [p[0], y + h, p[1]], sh(side, (i % 2) * 0.04)); }
    disc(mb, x, y + h, z, R, n, top, a0);
    if (o.rim) annulus(mb, x, y + h + 0.004, z, R - s * (o.rimW || 0.18), R, n, o.rim);
    if (o.ring) annulus(mb, x, y + h + 0.004, z, R * 0.55, R * 0.62, n, o.ring);
  };
  // round planter with a plant (o.plant: 'tree' | 'bush' | 'flowers' | 'grass'), radius o.r tiles, rim height o.h
  P.planter = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = s * (o.r || 1), h = o.h || 0.35, c = o.col || '#e8ecec', n = o.sides || 20;
    const pts = ring(x, z, R, n);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; mb.quad([p[0], y, p[1]], [q[0], y, q[1]], [q[0], y + h, q[1]], [p[0], y + h, p[1]], sh(c, -0.05)); }
    annulus(mb, x, y + h, z, R - s * 0.12, R, n, sh(c, 0.08));
    disc(mb, x, y + h - 0.04, z, R - s * 0.12, n, o.soil || '#4a3a28');
    const g = o.col2 || (th.grass ? th.grass[0] : '#3a7a2a');
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + rnd(x, z, i), rr = (R - s * 0.3) * (0.4 + 0.6 * rnd(x, z, i + 4)); mb.sphere(x + Math.cos(a) * rr, y + h, z + Math.sin(a) * rr, s * 0.26, s * 0.16, s * 0.26, sh(g, (rnd(x, z, i + 8) - 0.5) * 0.2), 6, 3, false); }
    const pl = o.plant || 'tree';
    if (pl === 'tree') { const H = o.treeH || 2.8; mb.prism(x, y + h, z, s * 0.16, s * 0.1, H * 0.5, 7, '#5a3a20', true); for (let i = 0; i < 4; i++) { const a = i * 1.6, d = s * 0.35; mb.sphere(x + Math.cos(a) * d, y + h + H * (0.62 + (i % 2) * 0.12), z + Math.sin(a) * d, s * 0.7, s * 0.5, s * 0.7, sh(g, -0.08 + i * 0.05), 7, 4, false); } mb.sphere(x, y + h + H * 0.85, z, s * 0.75, s * 0.55, s * 0.75, sh(g, 0.08), 7, 4, false); }
    else if (pl === 'bush') mb.sphere(x, y + h + s * 0.3, z, R * 0.7, s * 0.5, R * 0.7, g, 8, 4, false);
    else if (pl === 'flowers') for (let i = 0; i < 14; i++) { const a = i * 2.4, rr = (R - s * 0.2) * Math.sqrt(rnd(x, z, i + 30)); mb.box(x + Math.cos(a) * rr, y + h + 0.05, z + Math.sin(a) * rr, s * 0.1, 0.05, s * 0.1, ['#f0e040', '#f0f0f0', '#f080a0', '#e04040'][i % 4]); }
  };
  // glowing hole with a bevelled metal rim (Gold Saucer tubes): o.col glow (look.glow), o.r radius in tiles
  P.hole = (mb, x, y, z, s, th, nb, o = {}) => {
    o = ctx(o); const R = s * (o.r || 0.95), n = 18, c = o.col || th.glow || '#ffb0d8', rim = o.col2 || '#c8c8d0', gm = glowOf(o, mb);
    const p0 = ring(x, z, R * 1.08, n), p1 = ring(x, z, R, n);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; mb.quad([p0[i][0], y + 0.005, p0[i][1]], [p0[j][0], y + 0.005, p0[j][1]], [p1[j][0], y + 0.06, p1[j][1]], [p1[i][0], y + 0.06, p1[i][1]], sh(rim, (i % 3) * 0.05)); }
    annulus(mb, x, y + 0.06, z, R * 0.86, R, n, sh(rim, 0.15));
    annulus(gm, x, y + 0.02, z, R * 0.62, R * 0.86, n, sh(c, -0.12));
    disc(gm, x, y + 0.021, z, R * 0.62, n, c);
    annulus(gm, x, y + 0.024, z, R * 0.3, R * 0.36, n, sh(c, 0.35));
    o.light([x, y + 0.5, z], c, 1.3);
  };
  // the Midgar scale model (Shinra 65F): round table, gold rim with buttresses, the green-lit city
  // (o.col glow, look.mako) with eight plate sectors, reactors and the Shinra Building at the hub
  P.citymodel = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = s * (o.r || 3.4), gold = o.col2 || '#d0a030', g = o.col || th.mako || '#40e080', gm = glowOf(o, mb), n = 24, H = o.h || 0.55;
    const pts = ring(x, z, R, n);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; mb.quad([p[0], y, p[1]], [q[0], y, q[1]], [q[0], y + H, q[1]], [p[0], y + H, p[1]], sh(gold, (i % 2) * 0.1 - 0.05)); }
    annulus(mb, x, y + H, z, R * 0.86, R, n, sh(gold, 0.15));
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; mb.box(x + Math.cos(a) * R * 1.02, y + H * 0.55, z + Math.sin(a) * R * 1.02, s * 0.2, H * 1.1, s * 0.2, sh(gold, -0.15)); }
    disc(gm, x, y + H - 0.08, z, R * 0.86, n, sh(g, -0.35));
    annulus(gm, x, y + H - 0.075, z, R * 0.7, R * 0.78, n, sh(g, 0.1));
    for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      beam(mb, [x + ca * R * 0.2, y + H - 0.05, z + sa * R * 0.2], [x + ca * R * 0.84, y + H - 0.05, z + sa * R * 0.84], s * 0.07, '#2a3a34', 4);
      mb.prism(x + ca * R * 0.62, y + H - 0.08, z + sa * R * 0.62, s * 0.12, s * 0.1, s * 0.5, 7, '#5a6a64');
      gm.prism(x + ca * R * 0.62, y + H - 0.08 + s * 0.5, z + sa * R * 0.62, s * 0.06, s * 0.06, s * 0.1, 6, sh(g, 0.3));
      for (let k = 0; k < 5; k++) { const aa = a + (rnd(x, z, i * 9 + k) - 0.5) * 0.6, rr = R * (0.3 + 0.5 * rnd(x, z, i * 9 + k + 50)); const hh = s * (0.1 + 0.3 * rnd(x, z, i * 9 + k + 90));
        gm.box(x + Math.cos(aa) * rr, y + H - 0.08 + hh / 2, z + Math.sin(aa) * rr, s * 0.12, hh, s * 0.12, sh(g, (k % 3) * 0.1 - 0.15)); } }
    mb.prism(x, y + H - 0.08, z, R * 0.18, R * 0.16, s * 0.2, 12, '#4a5450');
    mb.box(x, y + H + s * 0.7, z, s * 0.28, s * 1.6, s * 0.2, { side: '#8a9098', top: '#b0b6bc', front: '#9aa0a8' });
    mb.box(x, y + H + s * 1.55, z, s * 0.16, s * 0.2, s * 0.12, '#b0b6bc');
  };
  // vehicle wreck (block prop): a rusted vehicle model laid along the block (look.wreck / o.vehicle, default the truck)
  P.wreck = (mb, x, y, z, s, th, nb, o = {}) => {
    const id = o.vehicle || th.wreck || 'truck';
    const along = (o.bh || 1) >= (o.bw || 1), len = (along ? o.bh || 1 : o.bw || 1) * s;
    let k = o.size || 1;
    if (!o.size && FF7.vehicles3d && FF7.vehicles3d.has(id)) { const m = FF7.vehicles3d.build(id, {}); if (m && m.size) k = len * 1.2 / m.size[2]; }
    FF7.field.bakeVehicle(mb, glowOf(o, mb), id, [x, y, z], (o.rot != null ? 0 : (along ? 0 : 90)) + (o.turn || 0), k, { wreck: o.intact ? undefined : true, tint: o.col });
  };

  // ------------------------------------------------------------------ Forgotten Capital & natural set pieces
  // branching coral / shell tree: pale trunk splitting into curling branches with glowing tips
  P.coraltree = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#e8dcd0', tip = o.col2 || '#90d8ff', H = o.h || 2.6, gm = glowOf(o, mb);
    const grow = (p, dir, len, r, depth, seed) => {
      const q = V.add(p, V.scale(V.norm(dir), len));
      beam(mb, p, q, r, sh(c, -depth * 0.05), 6);
      if (depth >= 3) { gm.sphere(q[0], q[1], q[2], r * 2.2, r * 2.2, r * 2.2, tip, 6, 4); return; }
      const k = 2 + (rnd(x, z, seed) > 0.5 ? 1 : 0);
      for (let i = 0; i < k; i++) { const a = rnd(x, z, seed * 3 + i) * Math.PI * 2, t = 0.55 + 0.4 * rnd(x, z, seed * 5 + i);
        grow(q, [dir[0] * 0.5 + Math.cos(a) * t, 0.8 + rnd(x, z, seed + i) * 0.4, dir[2] * 0.5 + Math.sin(a) * t], len * 0.68, r * 0.62, depth + 1, seed * 4 + i + 1); }
    };
    mb.prism(x, y, z, s * 0.24, s * 0.14, H * 0.18, 7, sh(c, -0.1), true);
    grow([x, y + H * 0.15, z], [0.05, 1, 0.03], H * 0.42, s * 0.12, 0, 1);
  };
  // overhead canopy: a broad lobed shell / leaf roof at height o.h (m) on a slender trunk (fades when it
  // hides the player); o.r radius (tiles)
  P.canopy = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = s * (o.r || 2.5), H = o.h || 3.2, c = o.col || '#c8e0d8', tr = o.col2 || '#d8ccc0';
    if (o.trunk !== false) mb.prism(x, y, z, s * 0.2, s * 0.12, H, 7, tr, true);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + rnd(x, z, i), d = i ? R * 0.55 : 0, rr = i ? R * 0.55 : R * 0.6;
      mb.sphere(x + Math.cos(a) * d, y + H + (i ? -0.1 : 0.12), z + Math.sin(a) * d, rr, s * 0.35, rr, sh(c, (rnd(x, z, i + 9) - 0.5) * 0.16), 9, 4, true, null, 3); }
  };
  // tall tapered rock spire (crater, canyons): stacked jittered frustums, o.h height (m), o.r base radius (tiles)
  P.spire = (mb, x, y, z, s, th, nb, o = {}) => {
    const H = o.h || 4, R = s * (o.r || 0.8), c = o.col || sh(th.wall, -0.05), n = 6, seg = 5;
    const rings = [];
    for (let i = 0; i <= seg; i++) { const t = i / seg, jx = i ? (rnd(x, z, i + 10) - 0.5) * s * 0.5 * t : 0, jz = i ? (rnd(x, z, i + 20) - 0.5) * s * 0.5 * t : 0;
      const r = i === seg ? R * 0.06 : R * (1 - t * 0.9) * (i ? 0.9 + 0.2 * rnd(x, z, i) : 1);
      rings.push(ring(x + jx, z + jz, r, n, rnd(x, z, 40) * 2).map(p => [p[0], y + H * t, p[1]])); }
    for (let i = 0; i < seg; i++) for (let k = 0; k < n; k++) { const a = rings[i], b = rings[i + 1], j = (k + 1) % n;
      mb.quad(a[k], a[j], b[j], b[k], sh(c, (k % 2) * 0.05 + (i % 2) * 0.03 - 0.04)); }
    const tp = rings[seg]; for (let k = 1; k + 1 < n; k++) mb.tri(tp[0], tp[k], tp[k + 1], c);
  };
  // glass tunnel arch: a half tube along the prop's local z (rot turns it), o.len tiles long, o.r radius
  // (tiles); glass panes are translucent (blended with the water), steel ribs at every tile
  P.glassarch = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = s * (o.r || 1.5), L = s * (o.len || 1), n = 10, glass = o.col || 'rgba(150,210,235,0.32)', rib = o.col2 || '#6a7a86', wm = o.water || mb;
    const z0 = z - L / 2, z1 = z + L / 2, P2 = (a, zz, r) => [x + Math.cos(a) * r, y + Math.sin(a) * r, zz];
    for (let i = 0; i < n; i++) { const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n;
      wm.quad(P2(a1, z0, R), P2(a0, z0, R), P2(a0, z1, R), P2(a1, z1, R), glass); wm.quad(P2(a0, z0, R), P2(a1, z0, R), P2(a1, z1, R), P2(a0, z1, R), glass); }
    for (let k = 0; k <= Math.round(L / s); k++) { const zz = z0 + k * s; for (let i = 0; i < n; i++) beam(mb, P2(Math.PI * i / n, zz, R), P2(Math.PI * (i + 1) / n, zz, R), s * 0.04, rib, 4); }
    [0, Math.PI].forEach(a => beam(mb, P2(a, z0, R), P2(a, z1, R), s * 0.05, rib, 4));
  };
  // cable across a street between o.from and o.to (world points, built by fieldgeo from `at` / `to`),
  // sagging o.sag (m), with bulbs (o.bulbs: list of colours) or paper lanterns (o.lanterns: true / colour).
  // o.r: a thicker line (m; a ropeway's track rope), which gets rounder
  P.string = (mb, x, y, z, s, th, nb, o = {}) => {
    o = ctx(o); const a = o.from, b = o.to, sag = o.sag != null ? o.sag : 0.35, n = 12, gm = glowOf(o, mb);
    if (!Array.isArray(a) || !Array.isArray(b) || a.length < 3 || b.length < 3) return;
    const pt = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
    for (let i = 0; i < n; i++) beam(mb, pt(i / n), pt((i + 1) / n), o.r || 0.008, o.col || '#1a1a1a', o.r ? 6 : 3);
    const L = V.dist(a, b), cnt = o.count || Math.max(2, Math.round(L / (o.lanterns ? 0.7 : 0.35)));
    const cols = o.bulbs || (o.lanterns ? [typeof o.lanterns === 'string' ? o.lanterns : '#ff5a40'] : ['#ff5050', '#ffd040', '#50e070', '#60a0ff', '#ff70d0']);
    for (let i = 1; i < cnt; i++) { const p = pt(i / cnt), c = cols[i % cols.length];
      if (o.lanterns) { mb.box(p[0], p[1] - 0.06, p[2], 0.008, 0.12, 0.008, '#1a1a1a'); gm.sphere(p[0], p[1] - 0.2, p[2], 0.07, 0.1, 0.07, c, 8, 4); mb.prism(p[0], p[1] - 0.11, p[2], 0.035, 0.035, 0.02, 6, '#1e1a16'); }
      else gm.sphere(p[0], p[1] - 0.03, p[2], 0.028, 0.035, 0.028, c, 6, 3); }
    if (o.lanterns || o.lit) o.light(pt(0.5), cols[0], Math.min(3, L * 0.5));
  };
  // ropeway gantry at the platform's edge: a steel post with a braced arm reaching o.reach (m) out over the drop
  // toward o.toward ('n' | 'e' | 's' | 'w'), carrying the saddles the two track ropes (o.gap apart, at o.h m) run
  // over, a signal lamp on top (FF7's North Corel station: 06-goldsaucer01 and the movie's opening)
  P.ropegantry = (mb, x, y, z, s, th, nb, o = {}) => {
    o = ctx(o); const h = o.h || 2.2, r = o.reach || 1, g = o.gap || 0.3, c = o.col || '#4a4e56', dk = sh(c, -0.35), gm = glowOf(o, mb);
    const yaw = { n: 0, e: -Math.PI / 2, s: Math.PI, w: Math.PI / 2 }[o.toward || 'n'];
    const R = (p) => { const cs = Math.cos(yaw), sn = Math.sin(yaw); return [x + p[0] * cs + p[2] * sn, y + p[1], z - p[0] * sn + p[2] * cs]; };
    beam(mb, R([0, 0, 0]), R([0, h + 0.5, 0]), 0.07, c, 4);                              // the post
    beam(mb, R([0, h - 0.16, 0.05]), R([0, h - 0.16, -(r + g / 2 + 0.15)]), 0.05, c, 4);  // the arm, out past the outer rope
    beam(mb, R([0, h - 0.95, 0]), R([0, h - 0.2, -r * 0.7]), 0.035, c, 4);                // its brace
    [-1, 1].forEach(k => { const p = R([0, h - 0.08, -r + k * g / 2]); mb.box(p[0], p[1], p[2], 0.12, 0.05, 0.12, dk); });   // rope saddles
    const top = R([0, h + 0.55, 0]); mb.box(top[0], top[1], top[2], 0.14, 0.2, 0.14, dk);
    gm.sphere(top[0], top[1] + 0.02, top[2], 0.05, 0.05, 0.05, o.lamp || '#50a0ff', 8, 4);
  };
  // the ground far below a drop (the desert under North Corel's ropeway station): a wide flat of o.col (o.w x o.d m)
  // with long low dune ridges; the theme's fog hazes it with the depth
  P.farground = (mb, x, y, z, s, th, nb, o = {}) => {
    const w = o.w || 60, d = o.d || 40, c = o.col || '#c8a868';
    mb.box(x, y - 0.1, z, w, 0.2, d, c);
    for (let i = 0; i < 22; i++) mb.box(x + (rnd(i, 3, 91) - 0.5) * w, y + 0.06, z + (rnd(i, 5, 92) - 0.5) * d, 3 + rnd(i, 7, 93) * 8, 0.12, 0.6 + rnd(i, 9, 94) * 1.2, sh(c, 0.06 - rnd(i, 1, 95) * 0.16));
  };
  // tall props fade out (like free-standing wall blocks) when they hide the player
  ['watertower', 'pylon', 'canopy', 'spire'].forEach(k => { P[k].fade = true; });
  // the helpers, for prop sets in other files (js/field/props_forest.js)
  FF7.field.propKit = { sh, rnd, glowOf, withXf, beam, def };
})();
