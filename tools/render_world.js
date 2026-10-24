// Headless world-map preview (software rasterizer): renders the 3D world terrain, water and landmarks
// from the in-game camera, with the curved horizon and fog.
//   node tools/render_world.js --loc midgar [--yaw 0] [--air] [--size 480] [--out previews/world.png]
//   node tools/render_world.js --at 250,150 --yaw 90
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const has = (k) => argv.includes('--' + k);
const sandbox = { console, Math, JSON, Date, Array, Object, String, Number, Boolean, Set, Map, WeakMap, Float32Array, Uint8Array, Uint8ClampedArray, parseInt, parseFloat, isFinite, isNaN,
  document: { createElement: () => ({ getContext: () => null, style: {} }), getElementById: () => null, currentScript: null }, location: { search: '' }, navigator: {}, performance: { now: () => 0 } };
sandbox.window = sandbox; vm.createContext(sandbox);
const load = (f) => { if (fs.existsSync(path.join(ROOT, f))) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f }); };
['js/core/namespace.js', 'js/core/util.js', 'js/gl/math.js', 'js/gl/meshkit.js', 'js/gl/tex.js', 'js/gl/skel.js', 'js/gl/models_lib.js', 'js/gl/humanoid.js', 'js/gl/cast_models.js',
  'js/gl/cast_rigs.js', 'js/gl/cast_npcs.js', 'js/gl/creatures.js', 'js/gl/vehicles.js', 'js/data/world_map.js', 'js/world/worldmap.js'].forEach(load);
sandbox.FF7.field.ScriptAPI = function () {};
load('js/world/worldscene.js');
const FF7 = sandbox.FF7, WM = FF7.world, X = WM._internals;
X.init();
const D = X.D;
let px, pz;
if (opt('loc')) { const L = WM.location(opt('loc')); px = L.x + 0.5 + +opt('dx', 0); pz = L.y + 3.5 + +opt('dz', 0); }
else { const [a, b] = opt('at', '250,150').split(',').map(Number); px = a + 0.5; pz = b + 0.5; }
const yawDeg = +opt('yaw', 0), air = has('air');
const SIZE = +opt('size', 480), W = SIZE, H = Math.round(SIZE * 0.75);
// camera: same maths as WorldScene.cameraEye
const yaw = yawDeg * Math.PI / 180, dist = air ? 9 : 6.5, pitch = (air ? 30 : 22) * Math.PI / 180;
const py = air ? Math.max(WM.groundH(px, pz), X.WL) + 3.2 : WM.groundH(px, pz);
const ty = py + (air ? 0 : 0.4);
const eye = [px - Math.sin(yaw) * Math.cos(pitch) * dist, ty + Math.sin(pitch) * dist, pz + Math.cos(yaw) * Math.cos(pitch) * dist];
const target = [px + Math.sin(yaw) * 2, ty, pz - Math.cos(yaw) * 2];
const M4 = FF7.M4;
const V = M4.lookAt(M4.create(), eye, target), P = M4.perspective(M4.create(), 50 * Math.PI / 180, W / H, 0.1, 160), VP = M4.mul(M4.create(), P, V);
function norm(v) { const l = Math.hypot(...v) || 1; return v.map(x => x / l); }
const LD = norm([-0.4, -0.85, -0.35]), LC = [0.8, 0.78, 0.72], AMB = [0.42, 0.42, 0.46];
const SKYB = [0xa8 / 255, 0xc8 / 255, 0xe8 / 255], SKYT = [0x3a / 255, 0x64 / 255, 0xb8 / 255];
const tris = [];
function addMesh(mesh, off, opts = {}) {
  if (!mesh) return;
  for (let i = 0; i < mesh.count; i += 3) {
    const v = [0, 1, 2].map(k => {
      const j = i + k;
      const x = mesh.pos[j * 3] + off[0], z = mesh.pos[j * 3 + 2] + off[2];
      const dx = x - eye[0], dz = z - eye[2];
      const y = mesh.pos[j * 3 + 1] + off[1] - X.CURVE * (dx * dx + dz * dz);
      const n = [mesh.nrm[j * 3], mesh.nrm[j * 3 + 1], mesh.nrm[j * 3 + 2]];
      const d = opts.unlit ? 1 : Math.max(0, -(n[0] * LD[0] + n[1] * LD[1] + n[2] * LD[2]));
      const c = [0, 1, 2].map(q => mesh.col[j * 4 + q] * (opts.unlit ? 1 : AMB[q] + LC[q] * d));
      const fog = Math.min(1, Math.max(0, (Math.hypot(dx, dz) - 26) / 24));
      return { p: [x, y, z], c: c.map((cc, q) => cc * (1 - fog) + SKYB[q] * fog), a: mesh.col[j * 4 + 3] };
    });
    tris.push({ v, blend: !!opts.blend });
  }
}
const mod = (a, n) => ((a % n) + n) % n;
const pcx = Math.floor(px / X.CH), pcy = Math.floor(pz / X.CH), NCX = D.w / X.CH, NCY = D.h / X.CH;
for (let dy = -X.VIEW; dy <= X.VIEW; dy++) for (let dx = -X.VIEW; dx <= X.VIEW; dx++) {
  const cx = pcx + dx, cy = pcy + dy, ch = X.buildChunk(mod(cx, NCX), mod(cy, NCY));
  addMesh(ch.mesh, [cx * X.CH, 0, cy * X.CH]);
  addMesh(ch.water, [cx * X.CH, 0, cy * X.CH], { blend: true });
}
const wd = (d, n) => { while (d > n / 2) d -= n; while (d < -n / 2) d += n; return d; };
D.locations.forEach(L => {
  const lx = px + wd(L.fx + L.w / 2 - px, D.w), lz = pz + wd(L.fy + L.h / 2 - pz, D.h);
  if (Math.hypot(lx - px, lz - pz) > X.VIEW * X.CH + 4) return;
  const m = X.landmark(L); if (m) addMesh(m, [lx, WM.groundH(L.x + 0.5, L.y + 0.5) - 0.02, lz]);
});
// rasterize
const img = new Float32Array(W * H * 3), zb = new Float32Array(W * H).fill(1e9);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = Math.min(1, y / (H * 0.6)); for (let q = 0; q < 3; q++) img[(y * W + x) * 3 + q] = SKYT[q] * (1 - k) + SKYB[q] * k; }
const proj = (p) => { const x = p[0], y = p[1], z = p[2]; const w = VP[3] * x + VP[7] * y + VP[11] * z + VP[15]; return [(VP[0] * x + VP[4] * y + VP[8] * z + VP[12]) / w, (VP[1] * x + VP[5] * y + VP[9] * z + VP[13]) / w, w]; };
tris.sort((a, b) => (a.blend ? 1 : 0) - (b.blend ? 1 : 0));
for (const t of tris) {
  const s = t.v.map(v => { const q = proj(v.p); return [(q[0] * 0.5 + 0.5) * W, (1 - (q[1] * 0.5 + 0.5)) * H, q[2]]; });
  if (s.some(q => q[2] < 0.1)) continue;
  const area = (s[1][0] - s[0][0]) * (s[2][1] - s[0][1]) - (s[2][0] - s[0][0]) * (s[1][1] - s[0][1]);
  if (Math.abs(area) < 1e-6) continue;
  const x0 = Math.max(0, Math.floor(Math.min(s[0][0], s[1][0], s[2][0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(s[0][0], s[1][0], s[2][0])));
  const y0 = Math.max(0, Math.floor(Math.min(s[0][1], s[1][1], s[2][1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(s[0][1], s[1][1], s[2][1])));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const qx = x + 0.5, qy = y + 0.5;
    const w0 = ((s[1][0] - qx) * (s[2][1] - qy) - (s[2][0] - qx) * (s[1][1] - qy)) / area;
    const w1 = ((s[2][0] - qx) * (s[0][1] - qy) - (s[0][0] - qx) * (s[2][1] - qy)) / area;
    const w2 = 1 - w0 - w1;
    if (w0 < 0 || w1 < 0 || w2 < 0) continue;
    const z = w0 * s[0][2] + w1 * s[1][2] + w2 * s[2][2], idx = y * W + x;
    if (z >= zb[idx]) continue;
    const a = t.blend ? (w0 * t.v[0].a + w1 * t.v[1].a + w2 * t.v[2].a) : 1;
    if (!t.blend) zb[idx] = z;
    for (let q = 0; q < 3; q++) { const c = w0 * t.v[0].c[q] + w1 * t.v[1].c[q] + w2 * t.v[2].c[q]; img[idx * 3 + q] = img[idx * 3 + q] * (1 - a) + Math.min(1, c) * a; }
  }
}
// PNG out
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W * 3; x++) raw[y * (W * 3 + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(img[y * W * 3 + x] * 255))); }
const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
const out = opt('out', path.join(ROOT, 'previews', 'world.png'));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('wrote', out, tris.length, 'triangles');
