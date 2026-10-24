// Headless field-map preview (software rasterizer): the real field geometry, camera, NPCs and player
// model, so maps can be compared with reference screenshots without a browser.
//   node tools/render_field.js s7_bar [--entry from_town | --at 10,6] [--size 640] [--yaw 30 --pitch 45 --dist 9]
//          [--flags a,b] [--party cloud,tifa] [--out previews/s7_bar.png] [--wide]   (--wide: whole map, higher camera)
const fs = require('fs'), path = require('path'), Module = require('module'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const has = (k) => argv.includes('--' + k);
// reuse the headless engine harness (tools/sim.js) up to its CLI part
const src = fs.readFileSync(path.join(__dirname, 'sim.js'), 'utf8');
const m = new Module(path.join(__dirname, 'sim.js'));
m.paths = Module._nodeModulePaths(__dirname); m.filename = path.join(__dirname, 'sim.js');
const origErr = console.error; console.error = () => {};
m._compile(src.slice(0, src.indexOf('const mode = argv[0]')) + '\nmodule.exports = { FF7 };', path.join(__dirname, 'sim.js'));
console.error = origErr;
const { FF7 } = m.exports; const F = FF7.field, M4 = FF7.M4, U = FF7.util;
const id = argv[0];
const map = FF7.maps[id];
if (!map) { console.log('unknown map', id); process.exit(1); }
(opt('flags', '') || '').split(',').filter(Boolean).forEach(f => FF7.state.flags[f] = true);
if (opt('party')) { const ids = opt('party').split(','); ids.forEach(i => FF7.sys.party.join(i)); FF7.sys.party.set(ids.slice(0, 3)); }

const fsc = new F.FieldScene();
let entry = opt('entry');
if (opt('at')) entry = opt('at').split(',').map(Number);
fsc.load(id, entry || undefined, { skipEnter: true });
const P = fsc.P, geo = fsc.geo, th = geo.th;
for (const k in fsc.actors) { const a = fsc.actors[k]; a.y = F.groundAt(P, a.x, a.z); }   // stand on the floor before framing (raised maps)
const c = fsc.cam;
if (opt('yaw') != null) c.yaw = +opt('yaw');
if (opt('pitch') != null) c.pitch = +opt('pitch');
if (opt('dist') != null) c.dist = +opt('dist');
if (has('wide')) { c.dist = Math.max(P.w, P.h) * F.TILE * 1.25; c.pitch = Math.max(c.pitch, 55); c.x = P.w * F.TILE / 2; c.z = P.h * F.TILE / 2; c.y = 0; c.follow = false; }
else fsc.updateCamera(true);
const { eye, target } = fsc.cameraEye();

const SIZE = +opt('size', 640), W = SIZE, H = Math.round(SIZE * 0.75);
const V = M4.lookAt(M4.create(), eye, target), PR = M4.perspective(M4.create(), (has('wide') ? 40 : c.fov) * Math.PI / 180, W / H, 0.1, 200), VP = M4.mul(M4.create(), PR, V);
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const LD = norm(th.lightDir || [-0.4, -0.8, -0.5]), LC = th.light || [0.75, 0.72, 0.68], AMB = th.ambient || [0.38, 0.38, 0.42];
const hex = (h) => { h = String(h).replace('#', ''); const n = parseInt(h, 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const sky = (th.sky || ['#101018', '#202030']).map(hex);
const fog = th.fog ? { color: th.fog.color, near: th.fog.near * (c.dist / 7.2), far: th.fog.far * (c.dist / 7.2) } : null;

const tris = [];
function add(mesh, mat, opts = {}) {
  if (!mesh || !mesh.pos) return;
  const tint = opts.tint || [1, 1, 1, 1];
  for (let i = 0; i + 2 < mesh.count; i += 3) {
    const v = [0, 1, 2].map(k => {
      const j = i + k;
      const x0 = mesh.pos[j * 3], y0 = mesh.pos[j * 3 + 1], z0 = mesh.pos[j * 3 + 2];
      const p = mat ? [mat[0] * x0 + mat[4] * y0 + mat[8] * z0 + mat[12], mat[1] * x0 + mat[5] * y0 + mat[9] * z0 + mat[13], mat[2] * x0 + mat[6] * y0 + mat[10] * z0 + mat[14]] : [x0, y0, z0];
      let n = [mesh.nrm[j * 3], mesh.nrm[j * 3 + 1], mesh.nrm[j * 3 + 2]];
      if (mat) n = norm([mat[0] * n[0] + mat[4] * n[1] + mat[8] * n[2], mat[1] * n[0] + mat[5] * n[1] + mat[9] * n[2], mat[2] * n[0] + mat[6] * n[1] + mat[10] * n[2]]);
      const unlit = opts.unlit || mesh.unlit;
      const d = unlit ? 1 : Math.max(0, -(n[0] * LD[0] + n[1] * LD[1] + n[2] * LD[2]));
      let col = [0, 1, 2].map(q => mesh.col[j * 4 + q] * tint[q] * (unlit ? 1 : AMB[q] + LC[q] * d));
      if (fog) { const dist = Math.hypot(p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]); const f = Math.min(1, Math.max(0, (dist - fog.near) / (fog.far - fog.near))); col = col.map((cc, q) => cc * (1 - f) + fog.color[q] * f); }
      return { p, c: col, a: mesh.col[j * 4 + 3] * tint[3], uv: mesh.tex && mesh.uv ? [mesh.uv[j * 2], mesh.uv[j * 2 + 1]] : null };
    });
    tris.push({ v, blend: !!(opts.blend || mesh.blend), cull: !(mesh.cull === false || opts.cull === false), tex: mesh.tex && mesh.tex.isTex ? mesh.tex : null });
  }
}
add(geo.mesh, null);
(geo.floors || []).forEach(f => add(f.mesh, null));
(geo.walls || []).forEach(f => add(f.mesh, null));
// free-standing blocks that hide the player fade out as in the game (field.js updateOccluders)
if (!has('wide')) for (let i = 0; i < 60; i++) fsc.updateOccluders(eye);
(geo.occluders || []).forEach(o => (o.meshes || [o.mesh]).forEach(m => add(m, null, o.alpha < 0.98 ? { blend: true, tint: [1, 1, 1, o.alpha] } : {})));
if (geo.glow) add(geo.glow, null, { unlit: true });
if (geo.water) add(geo.water, null, { blend: true });
// campfire flames (drawn still)
(geo.fires || []).forEach(f => { const k = f.size || 1; add(F.flameMesh(), M4.trs(M4.create(), f.pos, [0, 0, 0], [k, k, k]), { unlit: true }); });
// actors (NPCs + player)
function addModel(mdl) {
  if (!mdl || !mdl.order) return;
  mdl.computeWorld();
  const tmp = M4.create();
  for (const b of mdl.order) { if (!b.visible) continue; for (const a of b.meshes) add(a.mesh, a.m ? M4.mul(tmp, b.world, a.m) : b.world, a.opts || {}); }
}
for (const k in fsc.actors) {
  const a = fsc.actors[k]; if (!a.visible || (k !== 'player' && a === fsc.player)) continue;
  try { a.update(fsc); const mdl = a.model; mdl.position = [a.x, a.y + (a.lift || 0) + (a.hover || 0), a.z]; mdl.rotY = a.angle; mdl.scale = F.CHAR_SCALE * (a.scale || mdl.baseScale || 1); mdl.update(1); addModel(mdl); } catch (e) { }
}
// objects with a model (switches, gates, boulders, Kupomon's barriers): ticked for their state, hidden ones left out
for (const o of fsc.objects) {
  if (o.kind !== 'object' || !o.model) continue;
  try {
    if (o.tick) o.tick(o);
    if (o.hidden) continue;
    if (!o._model) o._model = F.buildModel(o.model);
    const x = (o.at[0] + 0.5) * F.TILE, z = (o.at[1] + 0.5) * F.TILE, y = F.groundAt(P, x, z);
    o._model.position = [x, y + (o.hover || 0), z]; o._model.rotY = F.dirAngle(o.dir || 'down');
    o._model.scale = F.CHAR_SCALE * (o.scale || 1) * (o._model.baseScale || 1); o._model.update(1); addModel(o._model);
  } catch (e) { }
}
// rasterize
const img = new Float32Array(W * H * 3), zb = new Float32Array(W * H);   // 1/w: interpolates linearly on screen (perspective-correct depth)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y / H; for (let q = 0; q < 3; q++) img[(y * W + x) * 3 + q] = sky[0][q] * (1 - k) + sky[1][q] * k; }
const proj = (p) => { const x = p[0], y = p[1], z = p[2]; const w = VP[3] * x + VP[7] * y + VP[11] * z + VP[15]; return [(VP[0] * x + VP[4] * y + VP[8] * z + VP[12]) / w, (VP[1] * x + VP[5] * y + VP[9] * z + VP[13]) / w, w]; };
tris.sort((a, b) => (a.blend ? 1 : 0) - (b.blend ? 1 : 0));
for (const t of tris) {
  const s = t.v.map(v => { const q = proj(v.p); return [(q[0] * 0.5 + 0.5) * W, (1 - (q[1] * 0.5 + 0.5)) * H, q[2]]; });
  if (s.some(q => q[2] < 0.1)) continue;
  const area = (s[1][0] - s[0][0]) * (s[2][1] - s[0][1]) - (s[2][0] - s[0][0]) * (s[1][1] - s[0][1]);
  if (t.cull && area >= 0) continue;
  if (Math.abs(area) < 1e-6) continue;
  const x0 = Math.max(0, Math.floor(Math.min(s[0][0], s[1][0], s[2][0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(s[0][0], s[1][0], s[2][0])));
  const y0 = Math.max(0, Math.floor(Math.min(s[0][1], s[1][1], s[2][1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(s[0][1], s[1][1], s[2][1])));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const qx = x + 0.5, qy = y + 0.5;
    const w0 = ((s[1][0] - qx) * (s[2][1] - qy) - (s[2][0] - qx) * (s[1][1] - qy)) / area;
    const w1 = ((s[2][0] - qx) * (s[0][1] - qy) - (s[0][0] - qx) * (s[2][1] - qy)) / area;
    const w2 = 1 - w0 - w1;
    if (w0 < 0 || w1 < 0 || w2 < 0) continue;
    const iz = w0 / s[0][2] + w1 / s[1][2] + w2 / s[2][2], idx = y * W + x;
    if (iz <= zb[idx]) continue;
    const a = t.blend ? (w0 * t.v[0].a + w1 * t.v[1].a + w2 * t.v[2].a) : 1;
    if (!t.blend && a < 0.5) continue;
    if (!t.blend) zb[idx] = iz;
    // textured meshes (floor / wall materials): perspective-correct, repeating UVs, nearest texel
    let tx = null;
    if (t.tex) { const T = t.tex, u = (w0 * t.v[0].uv[0] / s[0][2] + w1 * t.v[1].uv[0] / s[1][2] + w2 * t.v[2].uv[0] / s[2][2]) / iz, vv = (w0 * t.v[0].uv[1] / s[0][2] + w1 * t.v[1].uv[1] / s[1][2] + w2 * t.v[2].uv[1] / s[2][2]) / iz;
      const px = Math.floor((u - Math.floor(u)) * T.w) % T.w, py = Math.floor((vv - Math.floor(vv)) * T.h) % T.h, ti = (py * T.w + px) * 4; tx = [T.data[ti] / 255, T.data[ti + 1] / 255, T.data[ti + 2] / 255]; }
    for (let q = 0; q < 3; q++) { const cc = (w0 * t.v[0].c[q] + w1 * t.v[1].c[q] + w2 * t.v[2].c[q]) * (tx ? tx[q] : 1); img[idx * 3 + q] = img[idx * 3 + q] * (1 - a) + Math.min(1, cc) * a; }
  }
}
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W * 3; x++) raw[y * (W * 3 + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(img[y * W * 3 + x] * 255))); }
const crcT = []; for (let n = 0; n < 256; n++) { let cc = n; for (let k = 0; k < 8; k++) cc = cc & 1 ? 0xedb88320 ^ (cc >>> 1) : cc >>> 1; crcT[n] = cc >>> 0; }
const crc = (b) => { let cc = 0xffffffff; for (const x of b) cc = crcT[(cc ^ x) & 255] ^ (cc >>> 8); return (cc ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cb]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
const out = opt('out', path.join(ROOT, 'previews', 'field_' + id + '.png'));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('wrote', out, tris.length, 'triangles', 'camera', JSON.stringify({ yaw: c.yaw, pitch: c.pitch, dist: c.dist }));
