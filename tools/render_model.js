// Headless model preview (software rasterizer) — lets you check models against reference art
// without a browser.
//
//   node tools/render_model.js cloud                       -> previews/cloud.png (front, 3/4, side, back)
//   node tools/render_model.js cloud --style battle --anim battle
//   node tools/render_model.js enemy:guard_scorpion
//   node tools/render_model.js cloud,tifa,aeris --views front --size 300   (several models in one row)
//   specs: cloud | enemy:<id> | vehicle:<id> | summon:<id> | kp:<kupomon species> | look:{json}
//   views: front 34 side back top34 field field34 top   options: --focus head  --out file.png  --views front,34,side,back,top34  --size N  --anim name --frame N --zoom K --bg #hex
//            --weapon <id>  holds that weapon (js/data/weapons.js id, e.g. murasame; the preset's own if it has no builder)
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const specs = (argv[0] || 'cloud').split(',');
const views = opt('views', 'front,34,side,back').split(',');
const SIZE = +opt('size', 360);
const style = opt('style', 'field');
const zoom = +opt('zoom', 1);
const bgHex = opt('bg', '#0a0a70');

// ---- sandbox load
const noop = () => {};
const sandbox = { console, Math, JSON, Date, Array, Object, String, Number, Boolean, Set, Map, WeakMap, Float32Array, Uint8Array, Uint8ClampedArray, parseInt, parseFloat, isFinite, isNaN,
  document: { createElement: () => ({ getContext: () => null, style: {} }), getElementById: () => null, currentScript: null }, location: { search: '' }, navigator: {}, performance: { now: () => 0 } };
sandbox.window = sandbox; vm.createContext(sandbox);
const load = (f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
['js/core/namespace.js', 'js/core/util.js', 'js/gl/math.js', 'js/gl/meshkit.js', 'js/gl/tex.js', 'js/gl/skel.js', 'js/gl/models_lib.js', 'js/gl/humanoid.js', 'js/gl/cast_models.js', 'js/gl/weapons_cloud.js', 'js/gl/cast_rigs.js', 'js/gl/cast_npcs.js', 'js/gl/creatures.js', 'js/gl/vehicles.js', 'js/gl/summon_models.js', 'js/data/characters.js', 'js/kupomon/kp_data.js', 'js/kupomon/kp_dex.js', 'js/kupomon/kp_dex2.js', 'js/kupomon/kp_models.js']
  .forEach(f => { if (fs.existsSync(path.join(ROOT, f))) load(f); });
for (const f of fs.readdirSync(path.join(ROOT, 'js/data'))) if (/^enemies_/.test(f)) load('js/data/' + f);
for (const f of fs.readdirSync(path.join(ROOT, 'js/gl'))) if (/^enemy_models.*\.js$/.test(f)) load('js/gl/' + f);
const FF7 = sandbox.FF7;
const M4 = FF7.M4;

function buildModel(spec) {
  if (spec.startsWith('enemy:')) { const id = spec.slice(6); const e = FF7.data.enemies[id]; const m = FF7.creatures.build(e ? e.look : { type: 'blob' }, id); return m; }
  if (spec.startsWith('kp:')) return FF7.kupomon.moogleModel(spec.slice(3), { style });   // a Kupomon robot moogle (species id)
  if (spec.startsWith('look:')) return FF7.creatures.build(JSON.parse(spec.slice(5)));
  if (spec.startsWith('vehicle:')) {   // vehicle:<id>[?flag&key=value] e.g. vehicle:tiny_bronco?boat  vehicle:train?cars=2
    const [id, q] = spec.slice(8).split('?'); const o = { style };
    (q || '').split('&').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); o[k] = v == null ? true : isNaN(+v) ? v : +v; });
    return FF7.vehicles3d.build(id, o);
  }
  if (spec.startsWith('summon:')) return FF7.summons3d[spec.slice(7)] ? FF7.summons3d[spec.slice(7)]() : FF7.creatures.build({ type: 'blob' });
  const wid = opt('weapon', null);
  if (wid) { const m = FF7.chars3d.build(FF7.chars3d.withWeapon(spec, wid), { style }); if (m.showWeapon) m.showWeapon(true); return m; }
  return FF7.chars3d.build(spec, { style });
}

// ---- rasterizer
function hex(h) { h = h.replace('#', ''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const LIGHT = { amb: [0.5, 0.5, 0.55], l1: [0.65, 0.62, 0.58], d1: norm([-0.35, -0.85, -0.4]), l2: [0.2, 0.22, 0.3], d2: norm([0.6, -0.2, 0.7]) };
function norm(v) { const l = Math.hypot(...v) || 1; return v.map(x => x / l); }

function collect(m) {
  m.computeWorld();
  const tris = [];
  const tmp = M4.create();
  for (const b of m.order) {
    if (!b.visible) continue;
    for (const a of b.meshes) {
      const mat = a.m ? M4.mul(tmp, b.world, a.m) : b.world;
      const mesh = a.mesh; const o = a.opts || {};
      const tex = mesh.tex && mesh.tex.isTex ? mesh.tex : null;
      const unlit = mesh.unlit || o.unlit;
      const tint = o.tint || [1, 1, 1, 1];
      const verts = [];
      for (let i = 0; i < mesh.count; i++) {
        const x = mesh.pos[i * 3], y = mesh.pos[i * 3 + 1], z = mesh.pos[i * 3 + 2];
        const wp = [mat[0] * x + mat[4] * y + mat[8] * z + mat[12], mat[1] * x + mat[5] * y + mat[9] * z + mat[13], mat[2] * x + mat[6] * y + mat[10] * z + mat[14]];
        const nx = mesh.nrm[i * 3], ny = mesh.nrm[i * 3 + 1], nz = mesh.nrm[i * 3 + 2];
        const wn = norm([mat[0] * nx + mat[4] * ny + mat[8] * nz, mat[1] * nx + mat[5] * ny + mat[9] * nz, mat[2] * nx + mat[6] * ny + mat[10] * nz]);
        let lit = [1, 1, 1];
        if (!unlit) {
          const d1 = Math.max(0, -(wn[0] * LIGHT.d1[0] + wn[1] * LIGHT.d1[1] + wn[2] * LIGHT.d1[2]));
          const d2 = Math.max(0, -(wn[0] * LIGHT.d2[0] + wn[1] * LIGHT.d2[1] + wn[2] * LIGHT.d2[2]));
          lit = [0, 1, 2].map(k => LIGHT.amb[k] + LIGHT.l1[k] * d1 + LIGHT.l2[k] * d2);
        }
        const c = [mesh.col[i * 4] * lit[0] * tint[0], mesh.col[i * 4 + 1] * lit[1] * tint[1], mesh.col[i * 4 + 2] * lit[2] * tint[2], mesh.col[i * 4 + 3] * tint[3]];
        verts.push({ p: wp, c, uv: [mesh.uv[i * 2], mesh.uv[i * 2 + 1]] });
      }
      for (let i = 0; i < verts.length; i += 3) tris.push({ bone: b.name, v: [verts[i], verts[i + 1], verts[i + 2]], tex, alphaTest: mesh.alphaTest != null ? mesh.alphaTest : 0.5, cull: !(mesh.cull === false || o.cull === false), blend: !!(o.blend || mesh.blend) });
    }
  }
  return tris;
}
function bbox(tris) { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const t of tris) for (const v of t.v) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], v.p[k]); mx[k] = Math.max(mx[k], v.p[k]); } return { mn, mx }; }

function render(tris, view, W, H, box) {
  const img = new Float32Array(W * H * 3); const zb = new Float32Array(W * H).fill(1e9);
  const bg = hex(bgHex).map(x => x / 255);
  for (let i = 0; i < W * H; i++) { const k = i / (W * H); img[i * 3] = bg[0] * (1 - k * 0.4); img[i * 3 + 1] = bg[1] * (1 - k * 0.4); img[i * 3 + 2] = bg[2] * (1 - k * 0.3); }
  const cx = (box.mn[0] + box.mx[0]) / 2, cy = (box.mn[1] + box.mx[1]) / 2, cz = (box.mn[2] + box.mx[2]) / 2;
  const hgt = Math.max(box.mx[1] - box.mn[1], (box.mx[0] - box.mn[0]) * 0.8, (box.mx[2] - box.mn[2]) * 0.8);
  const yaw = { front: 0, '34': Math.PI / 4.5, side: Math.PI / 2, back: Math.PI, top34: Math.PI / 5, field: 0, field34: Math.PI / 4, top: 0.01 }[view] || 0;
  // 'field' = the in-game field camera (pitch 50 deg), 'top' = straight down
  const pitch = { top34: 0.5, field: 50 * Math.PI / 180, field34: 50 * Math.PI / 180, top: 1.5 }[view] || 0.08;
  const dist = hgt * 2.6 / zoom;
  const eye = [cx + Math.sin(yaw) * Math.cos(pitch) * dist, cy + Math.sin(pitch) * dist, cz + Math.cos(yaw) * Math.cos(pitch) * dist];
  const V = M4.lookAt(M4.create(), eye, [cx, cy, cz]); const P = M4.perspective(M4.create(), 0.42, W / H, 0.05, 100); const VP = M4.mul(M4.create(), P, V);
  const proj = (p) => { const x = p[0], y = p[1], z = p[2]; const w = VP[3] * x + VP[7] * y + VP[11] * z + VP[15]; return [(VP[0] * x + VP[4] * y + VP[8] * z + VP[12]) / w, (VP[1] * x + VP[5] * y + VP[9] * z + VP[13]) / w, w]; };
  const order = tris.slice().sort((a, b) => (a.blend ? 1 : 0) - (b.blend ? 1 : 0));
  for (const t of order) {
    const s = t.v.map(v => { const q = proj(v.p); return [(q[0] * 0.5 + 0.5) * W, (1 - (q[1] * 0.5 + 0.5)) * H, q[2]]; });
    const area = (s[1][0] - s[0][0]) * (s[2][1] - s[0][1]) - (s[2][0] - s[0][0]) * (s[1][1] - s[0][1]);
    if (t.cull && area >= 0) continue;
    if (Math.abs(area) < 1e-6) continue;
    const x0 = Math.max(0, Math.floor(Math.min(s[0][0], s[1][0], s[2][0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(s[0][0], s[1][0], s[2][0])));
    const y0 = Math.max(0, Math.floor(Math.min(s[0][1], s[1][1], s[2][1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(s[0][1], s[1][1], s[2][1])));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((s[1][0] - px) * (s[2][1] - py) - (s[2][0] - px) * (s[1][1] - py)) / area;
      const w1 = ((s[2][0] - px) * (s[0][1] - py) - (s[0][0] - px) * (s[2][1] - py)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * s[0][2] + w1 * s[1][2] + w2 * s[2][2];
      const idx = y * W + x;
      if (z >= zb[idx]) continue;
      let c = [0, 1, 2, 3].map(k => w0 * t.v[0].c[k] + w1 * t.v[1].c[k] + w2 * t.v[2].c[k]);
      if (t.tex) {
        const u = w0 * t.v[0].uv[0] + w1 * t.v[1].uv[0] + w2 * t.v[2].uv[0], v = w0 * t.v[0].uv[1] + w1 * t.v[1].uv[1] + w2 * t.v[2].uv[1];
        const tc = FF7.tex.sample(t.tex, u, v);
        c = [c[0] * tc[0] / 255, c[1] * tc[1] / 255, c[2] * tc[2] / 255, c[3] * tc[3] / 255];
      }
      if (!t.blend && c[3] < t.alphaTest) continue;
      const a = t.blend ? c[3] : 1;
      if (!t.blend) zb[idx] = z;
      for (let k = 0; k < 3; k++) img[idx * 3 + k] = img[idx * 3 + k] * (1 - a) + Math.min(1, c[k]) * a;
    }
  }
  return img;
}

function writePNG(file, W, H, rgb) {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W * 3; x++) raw[y * (W * 3 + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(rgb[y * W * 3 + x] * 255))); }
  const crcTable = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

// ---- compose
const cols = specs.length * views.length;
const W = SIZE, H = Math.round(SIZE * 1.25);
const out = new Float32Array(W * cols * H * 3);
let col = 0;
for (const spec of specs) {
  const m = buildModel(spec);
  const anim = opt('anim', null);
  if (anim) m.play(m.anims && m.anims[anim] ? m.anims[anim] : anim, { loop: true, restart: true });
  const frames = +opt('frame', 1);
  for (let i = 0; i < frames; i++) m.update(1);
  const tris = collect(m);
  const focus = opt('focus', null);   // e.g. --focus head : frame only that bone's geometry
  let box = bbox(tris);
  if (focus && m.bones && m.bones[focus]) {   // fixed-size frame around the bone (hair length doesn't change the zoom)
    const w = m.bones[focus].world, r = +opt('radius', 0.16), up = +opt('up', 0.08);
    box = { mn: [w[12] - r, w[13] + up - r, w[14] - r], mx: [w[12] + r, w[13] + up + r, w[14] + r] };
  }
  for (const v of views) {
    const img = render(tris, v, W, H, box);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) out[(y * W * cols + col * W + x) * 3 + k] = img[(y * W + x) * 3 + k];
    col++;
  }
  console.log(`${spec}: ${tris.length} triangles, height ${(box.mx[1] - box.mn[1]).toFixed(2)}`);
}
const outFile = opt('out', path.join(ROOT, 'previews', specs.join('_').replace(/[^a-z0-9_]+/gi, '_').slice(0, 60) + '.png'));
fs.mkdirSync(path.dirname(outFile), { recursive: true });
writePNG(outFile, W * cols, H, out);
console.log('wrote', outFile);
