// FMV substitutes ("movies"): short real-time 3D cinematics rendered with the engine's low-poly
// models, camera moves, lighting and simple effects, standing in for FF7's pre-rendered FMVs.
//
//   FF7.cinema.play(id, { text, music, keepMusic, stayBlack }) -> waitable { done, result }
//     Pushes a scene that plays the movie, then pops it and sets `done` (result: 'end' | 'skip').
//     Start (Tab) asks "Skip this cutscene?" (FF7.qol.MovieSkip: the movie holds while it is asked; a small
//     "Tab: Skip" notice sits in the corner). `text` is shown as a caption, bottom centre.
//     Unknown ids play a generic starfield / Lifestream shot with the caption.
//   FF7.cinema.list      -> movie ids (story order)      FF7.cinema.movies[id] -> definition
//   FF7.cinema.playRealtime(id, opts) -> always the real-time version (js/gfx/fmv.js wraps .play and plays
//     the original FMV video for the ids it has, falling back to this file)
//   FF7.cinema.test(id)  -> dev viewer used by index.html?movie=<id> ('all' plays every movie; in the list
//     OK plays, Square forces the real-time version). Headless: node tools/sim.js movie <id>|all
//
// File layout: part 1 = player + toolkit (FF7.cinema.K), part 2 = sets (models built from
// MeshBuilder primitives, cached), part 3 = the movies (shot lists).
//
// A movie is { music, carry, shots: [shot...] }. A shot is
//   { dur (frames @60Hz), env (sky/fog/light preset or fn(S,k)), init(S), update(S, k, f),
//     cam(S, k) -> { eye, at, fov, roll, near, far }, draw(S, k), overlay(c, S, k),
//     fadeIn / fadeOut: frames (or [frames, colour]), dissolve: frames (cross-fade from the previous shot),
//     drawFar(S, k) (distant scenery with its own depth range), grade: { tint, lift, vignette } }
// Movies are full-frame like the original FMVs, colour-graded (multiply tint + vignette), and a movie's
// music is pushed and restored afterwards unless it `carry`s over into the next scene.
(function () {
  const U = FF7.util, R = FF7.render, M4 = FF7.M4, V = FF7.V3, MB = FF7.MeshBuilder, I = FF7.input;
  const GL = FF7.GL;
  const CIN = FF7.cinema = { movies: {}, list: [] };
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------------ math helpers
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const L = (a, b, t) => a + (b - a) * t;
  const K = CIN.K = {
    TAU, clamp01, L,
    ease: (t) => { t = clamp01(t); return t * t * (3 - 2 * t); },
    easeIn: (t) => { t = clamp01(t); return t * t; },
    easeOut: (t) => { t = clamp01(t); return 1 - (1 - t) * (1 - t); },
    easeInOut3: (t) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    seg: (k, a, b) => clamp01((k - a) / (b - a)),                 // progress of k inside [a, b]
    bump: (k, a, b) => { const t = clamp01((k - a) / (b - a)); return Math.sin(t * Math.PI); },
    LV: (a, b, t) => [L(a[0], b[0], t), L(a[1], b[1], t), L(a[2], b[2], t)],
    add: V.add, sub: V.sub, scale: V.scale, norm: V.norm, len: V.len, cross: V.cross, dot: V.dot,
    // Catmull-Rom through control points, t in 0..1 over the whole path
    path(pts, t) {
      t = clamp01(t) * (pts.length - 1);
      const i = Math.min(pts.length - 2, Math.floor(t)), u = t - i;
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const u2 = u * u, u3 = u2 * u;
      return [0, 1, 2].map(d => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u3));
    },
    // point on a circle around c (xz plane) at angle a (0 = +z), radius r, height y
    orbit: (c, a, r, y) => [c[0] + Math.sin(a) * r, (c[1] || 0) + y, c[2] + Math.cos(a) * r],
    col: (c) => (Array.isArray(c) ? c : FF7.glColor(c)),
    mixc: (a, b, t) => { a = K.col(a); b = K.col(b); return [L(a[0], b[0], t), L(a[1], b[1], t), L(a[2], b[2], t)]; },
    rng: (seed) => U.rng(typeof seed === 'number' ? seed : U.strSeed(String(seed))),
  };
  const col = K.col;

  // ------------------------------------------------------------------ textures (RGBA buffers: work in GL and in node tools)
  function texFn(size, fn) {
    const t = FF7.tex.create(size, size);
    const d = t.data, h = size / 2;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - h) / h, dy = (y + 0.5 - h) / h;
      const a = clamp01(fn(Math.hypot(dx, dy), dx, dy, x, y));
      const i = (y * size + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(a * 255);
    }
    return t;
  }
  function vnoise(x, y, s) {   // smooth value noise
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const a = U.hash(xi, yi, s), b = U.hash(xi + 1, yi, s), c = U.hash(xi, yi + 1, s), d = U.hash(xi + 1, yi + 1, s);
    return L(L(a, b, sx), L(c, d, sx), sy);
  }
  K.vnoise = vnoise;
  const TX = K.TX = {
    glow: texFn(64, (r) => { const k = 1 - r; return k <= 0 ? 0 : Math.pow(k, 2.2); }),
    core: texFn(64, (r) => { const k = 1 - r; return k <= 0 ? 0 : Math.pow(k, 1.2) * 0.6 + Math.pow(Math.max(0, 1 - r * 3), 2) * 0.4; }),
    smoke: texFn(64, (r, dx, dy) => { const k = 1 - r; if (k <= 0) return 0; const n = vnoise(dx * 3 + 7, dy * 3 + 3, 5) * 0.6 + vnoise(dx * 7, dy * 7, 9) * 0.4; return Math.pow(k, 1.4) * (0.45 + n * 0.8); }),
    flare: texFn(128, (r, dx, dy) => { const k = 1 - r; if (k <= 0) return 0; const ray = Math.max(Math.pow(Math.max(0, 1 - Math.abs(dx) * 14), 2), Math.pow(Math.max(0, 1 - Math.abs(dy) * 14), 2)) * k; return Math.pow(k, 3) + ray * 0.9; }),
    ring: texFn(64, (r) => Math.max(0, 1 - Math.abs(r - 0.8) * 7)),
  };
  // Full-screen soft vignette mask is done in 2D (see renderLetterbox)

  // ------------------------------------------------------------------ camera state (billboard basis)
  const CAM = K.CAM = { eye: [0, 0, 5], at: [0, 0, 0], right: [1, 0, 0], up: [0, 1, 0], fwd: [0, 0, -1] };
  function setCamera(c) {
    const eye = c.eye, at = c.at;
    const fwd = V.norm(V.sub(at, eye));
    let up = [0, 1, 0];
    if (Math.abs(fwd[1]) > 0.999) up = [0, 0, fwd[1] > 0 ? 1 : -1];
    let right = V.norm(V.cross(fwd, up));
    up = V.cross(right, fwd);
    if (c.roll) {
      const cr = Math.cos(c.roll), sr = Math.sin(c.roll);
      const r2 = V.add(V.scale(right, cr), V.scale(up, sr)), u2 = V.add(V.scale(up, cr), V.scale(right, -sr));
      right = r2; up = u2;
    }
    CAM.eye = eye; CAM.at = at; CAM.fwd = fwd; CAM.right = right; CAM.up = up;
    CAM.fov = c.fov || 45; CAM.near = c.near || 0.1; CAM.far = c.far || 600;
    GL.camera(eye, at, CAM.fov, CAM.near, CAM.far, up);
  }

  // ------------------------------------------------------------------ dynamic quad batches (sprites, beams, ribbons)
  class Batch {
    constructor(cap, tex, blend, sorted) {
      this.cap = cap; this.n = 0; this.sorted = sorted; this.recs = [];
      this.mesh = { pos: new Float32Array(cap * 18), nrm: new Float32Array(cap * 18), col: new Float32Array(cap * 24), uv: new Float32Array(cap * 12),
        count: 0, gl: null, tex, unlit: true, cull: false, blend, alphaTest: 0.002, min: [0, 0, 0], max: [0, 0, 0] };
      for (let i = 0; i < cap * 6; i++) this.mesh.nrm[i * 3 + 1] = 1;
    }
    begin() { this.n = 0; this.recs.length = 0; }
    // raw quad: 4 points, 4 rgba colours, 4 uvs (a b c d around)
    quad(a, b, c, d, ca, cb, cc, cd, ua, ub, uc, ud) {
      if (this.n >= this.cap) return;
      const m = this.mesh, i = this.n++;
      const P = [a, b, c, a, c, d], C = [ca, cb, cc, ca, cc, cd], T = [ua, ub, uc, ua, uc, ud];
      for (let v = 0; v < 6; v++) {
        const o = i * 6 + v;
        m.pos[o * 3] = P[v][0]; m.pos[o * 3 + 1] = P[v][1]; m.pos[o * 3 + 2] = P[v][2];
        m.col[o * 4] = C[v][0]; m.col[o * 4 + 1] = C[v][1]; m.col[o * 4 + 2] = C[v][2]; m.col[o * 4 + 3] = C[v][3];
        m.uv[o * 2] = T[v][0]; m.uv[o * 2 + 1] = T[v][1];
      }
    }
    // camera-facing sprite
    sprite(p, size, c, a, rot, stretch) {
      if (a <= 0.002 || size <= 0) return;
      if (this.sorted) { this.recs.push({ p, size, c, a, rot, stretch, d: V.dot(V.sub(p, CAM.eye), CAM.fwd) }); return; }
      this._sprite(p, size, c, a, rot, stretch);
    }
    _sprite(p, size, c, a, rot, stretch) {
      c = col(c);
      const cs = Math.cos(rot || 0), sn = Math.sin(rot || 0), h = size / 2, hy = h * (stretch || 1);
      const rx = V.scale(V.add(V.scale(CAM.right, cs), V.scale(CAM.up, sn)), h);
      const ry = V.scale(V.add(V.scale(CAM.up, cs), V.scale(CAM.right, -sn)), hy);
      const cc = [c[0], c[1], c[2], a];
      this.quad(V.sub(V.sub(p, rx), ry), V.sub(V.add(p, rx), ry), V.add(V.add(p, rx), ry), V.add(V.sub(p, rx), ry), cc, cc, cc, cc, [0, 1], [1, 1], [1, 0], [0, 0]);
    }
    // glowing line from a to b (width w), fades along its length from alpha a0 to a1
    beam(a, b, w, c, a0, a1, c1) {
      const d = V.sub(b, a);
      const mid = V.scale(V.add(a, b), 0.5);
      let side = V.cross(V.norm(d), V.norm(V.sub(CAM.eye, mid)));
      if (V.len(side) < 1e-5) side = CAM.right;
      side = V.scale(V.norm(side), w / 2);
      const ca = col(c), cb = col(c1 || c);
      const A = [ca[0], ca[1], ca[2], a0], B = [cb[0], cb[1], cb[2], a1 != null ? a1 : a0];
      this.quad(V.sub(a, side), V.sub(b, side), V.add(b, side), V.add(a, side), A, B, B, A, [0.5, 0], [0.5, 0], [0.5, 1], [0.5, 1]);
    }
    // ribbon through points (camera-facing), widths[] / colours[] (rgba) per point
    ribbon(pts, widths, cols) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const dir = V.norm(V.sub(b, a));
        const sideOf = (p, w) => { let s = V.cross(dir, V.norm(V.sub(CAM.eye, p))); if (V.len(s) < 1e-5) s = CAM.right; return V.scale(V.norm(s), w / 2); };
        const sa = sideOf(a, widths[i]), sb = sideOf(b, widths[i + 1]);
        this.quad(V.sub(a, sa), V.sub(b, sb), V.add(b, sb), V.add(a, sa), cols[i], cols[i + 1], cols[i + 1], cols[i], [0.5, 0], [0.5, 0], [0.5, 1], [0.5, 1]);
      }
    }
    flush(opts) {
      if (this.sorted && this.recs.length) {
        this.recs.sort((x, y) => y.d - x.d);
        for (const r of this.recs) this._sprite(r.p, r.size, r.c, r.a, r.rot, r.stretch);
        this.recs.length = 0;
      }
      if (!this.n) return;
      const m = this.mesh;
      m.count = this.n * 6;
      const g = GL.gl;
      if (g && m.gl) {
        g.bindBuffer(g.ARRAY_BUFFER, m.gl.pos); g.bufferSubData(g.ARRAY_BUFFER, 0, m.pos.subarray(0, m.count * 3));
        g.bindBuffer(g.ARRAY_BUFFER, m.gl.col); g.bufferSubData(g.ARRAY_BUFFER, 0, m.col.subarray(0, m.count * 4));
        g.bindBuffer(g.ARRAY_BUFFER, m.gl.uv); g.bufferSubData(g.ARRAY_BUFFER, 0, m.uv.subarray(0, m.count * 2));
      }
      GL.draw(m, null, opts || undefined);
      this.n = 0;
    }
  }
  K.Batch = Batch;
  let BATCH = null;
  function batches() {
    if (!BATCH) BATCH = { glow: new Batch(5000, TX.glow, 'add'), core: new Batch(1500, TX.core, 'add'), flare: new Batch(200, TX.flare, 'add'), ring: new Batch(200, TX.ring, 'add'), smoke: new Batch(2500, TX.smoke, 'alpha', true), fog: new Batch(600, TX.smoke, 'add') };
    return BATCH;
  }
  function beginBatches() { const b = batches(); for (const k in b) b[k].begin(); }
  function flushBatches() { const b = batches(); b.smoke.flush(); b.fog.flush(); b.ring.flush(); b.glow.flush(); b.core.flush(); b.flare.flush(); }

  // ------------------------------------------------------------------ particles
  class Particles {
    constructor() { this.list = []; }
    // o: { p (point or fn), spread (number or [x,y,z]), v, vs (velocity spread), life, size [s0, s1], color c0 / c1, alpha,
    //      kind: glow|core|smoke|fog|flare, grav, drag, spin, fadeIn (0..1 of life) }
    emit(n, o) {
      for (let i = 0; i < n; i++) {
        const sp = o.spread || 0, s3 = Array.isArray(sp) ? sp : [sp, sp, sp];
        const base = typeof o.p === 'function' ? o.p(i) : o.p;
        const p = [base[0] + (Math.random() * 2 - 1) * s3[0], base[1] + (Math.random() * 2 - 1) * s3[1], base[2] + (Math.random() * 2 - 1) * s3[2]];
        const vb = typeof o.v === 'function' ? o.v(p, i) : (o.v || [0, 0, 0]);
        const vs = o.vs || 0, v3 = Array.isArray(vs) ? vs : [vs, vs, vs];
        const v = [vb[0] + (Math.random() * 2 - 1) * v3[0], vb[1] + (Math.random() * 2 - 1) * v3[1], vb[2] + (Math.random() * 2 - 1) * v3[2]];
        const life = (o.life || 60) * (0.7 + Math.random() * 0.6);
        const sz = o.size || [1, 1];
        this.list.push({ p, v, life, age: 0, s0: sz[0] * (0.75 + Math.random() * 0.5), s1: sz[1] * (0.75 + Math.random() * 0.5), c0: col(o.c0 || o.color || '#ffffff'), c1: col(o.c1 || o.c0 || o.color || '#ffffff'),
          a: o.alpha != null ? o.alpha : 1, kind: o.kind || 'glow', grav: o.grav || 0, drag: o.drag != null ? o.drag : 1, rot: Math.random() * TAU, spin: (Math.random() - 0.5) * (o.spin || 0), fin: o.fadeIn != null ? o.fadeIn : 0.1, stretch: o.stretch });
      }
    }
    update() {
      const l = this.list;
      for (let i = l.length - 1; i >= 0; i--) {
        const q = l[i];
        q.age++;
        if (q.age >= q.life) { l[i] = l[l.length - 1]; l.pop(); continue; }
        q.v[0] *= q.drag; q.v[1] = q.v[1] * q.drag - q.grav; q.v[2] *= q.drag;
        q.p[0] += q.v[0]; q.p[1] += q.v[1]; q.p[2] += q.v[2];
        q.rot += q.spin;
      }
    }
    draw() {
      const b = batches();
      for (const q of this.list) {
        const k = q.age / q.life;
        const fa = q.fin > 0 ? Math.min(1, k / q.fin) : 1;
        const a = q.a * fa * (1 - k) * (q.kind === 'smoke' ? 1 : 1);
        const c = [L(q.c0[0], q.c1[0], k), L(q.c0[1], q.c1[1], k), L(q.c0[2], q.c1[2], k)];
        (b[q.kind] || b.glow).sprite(q.p, L(q.s0, q.s1, k), c, a, q.rot, q.stretch);
      }
    }
    clear() { this.list.length = 0; }
  }
  K.Particles = Particles;

  // ------------------------------------------------------------------ mesh helpers
  K.meshOf = (fn, opts) => { const mb = new MB(); fn(mb); return mb.build(opts); };
  const TMPM = M4.create();
  // draw a mesh at pos with euler rot [x,y,z] and scale (number or [x,y,z])
  K.put = function (mesh, pos, rot, scl, opts) {
    if (!mesh) return;
    const s = scl == null ? 1 : scl;
    M4.trs(TMPM, pos || [0, 0, 0], rot || [0, 0, 0], Array.isArray(s) ? s : [s, s, s]);
    GL.draw(mesh, TMPM, opts || undefined);
  };
  // matrix helper for composite transforms
  K.mat = (pos, rot, scl) => { const s = scl == null ? 1 : scl; return M4.trs(M4.create(), pos || [0, 0, 0], rot || [0, 0, 0], Array.isArray(s) ? s : [s, s, s]); };
  K.putM = (mesh, m, opts) => { if (mesh) GL.draw(mesh, m, opts || undefined); };

  // ------------------------------------------------------------------ environments (sky dome, stars, fog, light)
  const ENV = K.ENV = {
    space: { sky: ['#000004', '#02030a', '#000000'], stars: 1.0, fog: null, light: { dir: [-0.5, -0.3, -0.6], color: [0.9, 0.88, 0.85], ambient: [0.18, 0.18, 0.22] } },
    night: { sky: ['#02040c', '#101a34', '#05070c'], stars: 0.7, fog: { color: [0.04, 0.06, 0.12], near: 60, far: 420 }, light: { dir: [0.4, -0.7, -0.5], color: [0.42, 0.48, 0.66], ambient: [0.2, 0.22, 0.3], color2: [0.08, 0.1, 0.16] } },
    midgar: { sky: ['#020308', '#1a2430', '#06080a'], horizon: '#2a3a34', stars: 0.35, fog: { color: [0.06, 0.09, 0.1], near: 80, far: 520 }, light: { dir: [0.3, -0.75, -0.55], color: [0.36, 0.42, 0.5], ambient: [0.2, 0.23, 0.28], color2: [0.1, 0.18, 0.14] } },
    street: { sky: ['#030408', '#1a2230', '#080808'], stars: 0.2, fog: { color: [0.05, 0.07, 0.08], near: 14, far: 90 }, light: { dir: [0.3, -0.8, -0.4], color: [0.4, 0.44, 0.52], ambient: [0.26, 0.27, 0.32], color2: [0.12, 0.3, 0.2], dir2: [-0.6, -0.2, 0.7] } },
    slums: { sky: ['#030304', '#1c1a18', '#0a0806'], stars: 0, fog: { color: [0.08, 0.07, 0.06], near: 20, far: 140 }, light: { dir: [0.2, -0.9, -0.3], color: [0.5, 0.44, 0.36], ambient: [0.26, 0.24, 0.22], color2: [0.2, 0.14, 0.08] } },
    day: { sky: ['#2a64b8', '#b8d4ec', '#8a8070'], stars: 0, fog: { color: [0.68, 0.78, 0.88], near: 120, far: 700 }, light: { dir: [-0.4, -0.8, -0.35], color: [0.9, 0.86, 0.78], ambient: [0.46, 0.48, 0.52] } },
    wasteland: { sky: ['#4a78b0', '#d8d0b8', '#8a7a60'], stars: 0, fog: { color: [0.78, 0.74, 0.64], near: 80, far: 520 }, light: { dir: [-0.5, -0.6, -0.5], color: [0.95, 0.86, 0.7], ambient: [0.44, 0.42, 0.42] } },
    dawn: { sky: ['#18285a', '#f0a868', '#40302a'], stars: 0.15, sun: { dir: [0, 0.08, -1], color: '#ffd090', size: 0.35 }, fog: { color: [0.62, 0.48, 0.42], near: 90, far: 600 }, light: { dir: [0, -0.35, 0.95], color: [0.95, 0.72, 0.52], ambient: [0.34, 0.32, 0.4] } },
    desert_night: { sky: ['#04030e', '#2a1c48', '#0c0806'], stars: 0.9, fog: { color: [0.1, 0.07, 0.14], near: 90, far: 560 }, light: { dir: [0.4, -0.6, -0.6], color: [0.46, 0.44, 0.62], ambient: [0.22, 0.2, 0.28], color2: [0.3, 0.14, 0.24] } },
    sunny_sea: { sky: ['#1a5ec8', '#bfe4f8', '#1a5a90'], stars: 0, sun: { dir: [0.5, 0.55, -0.6], color: '#fff6d0', size: 0.2 }, fog: { color: [0.7, 0.84, 0.94], near: 150, far: 900 }, light: { dir: [-0.45, -0.75, 0.45], color: [1.0, 0.95, 0.84], ambient: [0.5, 0.54, 0.6] } },
    fire: { sky: ['#0c0202', '#6a1a08', '#1a0602'], stars: 0, fog: { color: [0.3, 0.08, 0.02], near: 25, far: 150 }, light: { dir: [0.2, -0.3, -0.9], color: [1.0, 0.5, 0.2], ambient: [0.34, 0.16, 0.1], color2: [0.6, 0.2, 0.05], dir2: [-0.3, 0.2, 0.9] } },
    jungle: { sky: ['#4a78a8', '#c8d8c0', '#304020'], stars: 0, fog: { color: [0.55, 0.66, 0.6], near: 60, far: 420 }, light: { dir: [-0.3, -0.85, -0.4], color: [0.9, 0.88, 0.72], ambient: [0.4, 0.46, 0.4] } },
    capital: { sky: ['#06121c', '#1a4a64', '#02060a'], stars: 0.2, fog: { color: [0.08, 0.2, 0.28], near: 18, far: 120 }, light: { dir: [0.1, -0.9, -0.3], color: [0.6, 0.82, 0.95], ambient: [0.24, 0.34, 0.42], color2: [0.2, 0.4, 0.5] } },
    underwater: { sky: ['#1c6a90', '#0a3450', '#020c16'], stars: 0, fog: { color: [0.03, 0.18, 0.28], near: 2, far: 40 }, light: { dir: [0, -1, -0.1], color: [0.5, 0.8, 0.95], ambient: [0.2, 0.36, 0.46] } },
    lifestream: { sky: ['#01100a', '#05402a', '#010805'], stars: 0, fog: { color: [0.02, 0.18, 0.1], near: 10, far: 120 }, light: { dir: [0, -1, 0], color: [0.5, 0.95, 0.7], ambient: [0.26, 0.5, 0.36] } },
    crater: { sky: ['#02040a', '#122030', '#040608'], stars: 0.6, fog: { color: [0.05, 0.08, 0.12], near: 60, far: 500 }, light: { dir: [0.3, -0.7, -0.6], color: [0.5, 0.56, 0.72], ambient: [0.22, 0.24, 0.3], color2: [0.1, 0.4, 0.3], dir2: [0, 1, 0] } },
    meteor: { sky: ['#1a0206', '#8a2410', '#200604'], stars: 0, fog: { color: [0.28, 0.08, 0.04], near: 100, far: 700 }, light: { dir: [0.2, -0.5, 0.8], color: [1.0, 0.5, 0.3], ambient: [0.3, 0.16, 0.14], color2: [0.4, 0.1, 0.05] } },
    snow_night: { sky: ['#040814', '#1c2c4c', '#0a0e18'], stars: 0.8, fog: { color: [0.1, 0.14, 0.22], near: 80, far: 600 }, light: { dir: [0.3, -0.7, -0.6], color: [0.5, 0.58, 0.8], ambient: [0.28, 0.3, 0.4] } },
    canyon: { sky: ['#4a88d0', '#f0dcb0', '#9a5a38'], stars: 0, sun: { dir: [-0.5, 0.35, -0.8], color: '#fff0c0', size: 0.16 }, fog: { color: [0.86, 0.8, 0.66], near: 150, far: 900 }, light: { dir: [0.45, -0.6, 0.6], color: [1.0, 0.88, 0.7], ambient: [0.46, 0.42, 0.4] } },
  };
  // sky dome mesh (unit sphere, vertex-coloured gradient) cached per colour set
  const domeCache = {};
  function skyDome(sky, horizon, sun) {
    const key = sky.join() + (horizon || '') + (sun ? JSON.stringify(sun) : '');
    if (domeCache[key]) return domeCache[key];
    const top = col(sky[0]), hor = col(horizon || sky[1]), mid = col(sky[1]), bot = col(sky[2]);
    const sd = sun ? V.norm(sun.dir) : null, sc = sun ? col(sun.color) : null;
    const mb = new MB();
    const seg = 28, rings = 16;
    const cOf = (p) => {
      const y = p[1];
      let c;
      if (y >= 0) { const t = Math.pow(y, 0.55); c = t < 0.12 ? K.mixc(hor, mid, t / 0.12) : K.mixc(mid, top, (t - 0.12) / 0.88); }
      else { const t = Math.min(1, -y * 4); c = K.mixc(hor, bot, t); }
      if (sd) { const d = Math.max(0, V.dot(p, sd)); const g = Math.pow(d, 6) * 0.9 + Math.pow(d, 40) * 0.6; c = [Math.min(1, c[0] + sc[0] * g), Math.min(1, c[1] + sc[1] * g), Math.min(1, c[2] + sc[2] * g)]; }
      return [c[0], c[1], c[2], 1];
    };
    const pt = (i, j) => { const th = (j / rings) * Math.PI, ph = (i / seg) * TAU; return [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; };
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
      mb.quad(a, b, c, d, '#ffffff');
    }
    const m = mb.build({ unlit: true, cull: false });
    // recolour every vertex from its position (exact gradient)
    for (let i = 0; i < m.count; i++) { const c = cOf([m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]]); m.col[i * 4] = c[0]; m.col[i * 4 + 1] = c[1]; m.col[i * 4 + 2] = c[2]; m.col[i * 4 + 3] = 1; }
    domeCache[key] = m;
    return m;
  }
  let STARS = null;
  function starMesh() {
    if (STARS) return STARS;
    const mb = new MB(), r = K.rng('stars');
    for (let i = 0; i < 900; i++) {
      const y = r() * 1.15 - 0.15, a = r() * TAU, rr = Math.sqrt(Math.max(0, 1 - y * y));
      const p = [Math.cos(a) * rr, y, Math.sin(a) * rr];
      const s = 0.0014 + Math.pow(r(), 6) * 0.0045;
      const b = 0.35 + r() * 0.65, tint = r();
      const c = [b * (tint < 0.2 ? 0.8 : 1), b * (tint > 0.85 ? 0.85 : 1), b * (tint < 0.2 ? 1 : tint > 0.85 ? 0.7 : 0.95), 1];
      const rt = V.norm(V.cross(p, Math.abs(p[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), up = V.norm(V.cross(rt, p));
      const q = (sx, sy) => V.add(p, V.add(V.scale(rt, sx * s), V.scale(up, sy * s)));
      mb.quad(q(-1, -1), q(1, -1), q(1, 1), q(-1, 1), c);
    }
    STARS = mb.build({ unlit: true, cull: false });
    return STARS;
  }
  function resolveEnv(e, S, k) {
    if (typeof e === 'function') e = e(S, k);
    if (typeof e === 'string') e = ENV[e] || ENV.night;
    if (e && e.base) e = Object.assign({}, ENV[e.base] || ENV.night, e);
    return e || ENV.night;
  }
  // draw sky dome(s) + stars + sun around the camera, then clear depth for the scene
  function drawSky(env) {
    const eye = CAM.eye;
    const fogNear = env.fog ? env.fog.near : 1e9;
    const r = Math.max(CAM.near * 3, Math.min(CAM.far * 0.4, fogNear * 0.8, 40));
    const dome = skyDome(env.sky, env.horizon, env.sun);
    K.put(dome, eye, null, r, { unlit: true, cull: false });
    if (env.sky2 && env.skyMix > 0) K.put(skyDome(env.sky2, env.horizon2, env.sun2), eye, null, r * 0.99, { unlit: true, cull: false, blend: 'alpha', tint: [1, 1, 1, env.skyMix] });
    if (env.stars > 0) K.put(starMesh(), eye, [0, env.starRot || 0, 0], r * 0.97, { unlit: true, cull: false, blend: 'add', tint: [1, 1, 1, env.stars] });
    const b = batches();
    const sun = env.sun2 && env.skyMix > 0.5 ? env.sun2 : env.sun;
    if (sun && sun.size) {
      const p = V.add(eye, V.scale(V.norm(sun.dir), r * 0.9));
      b.glow.sprite(p, r * sun.size * 1.7, sun.color, 0.65);
      b.core.sprite(p, r * sun.size * 0.55, '#ffffff', 1);
    }
    if (env.moon) {
      const p = V.add(eye, V.scale(V.norm(env.moon.dir), r * 0.9));
      b.glow.sprite(p, r * 0.3, '#a0b8e0', 0.35);
      b.core.sprite(p, r * 0.07, '#f0f4ff', 1);
    }
    if (env.skyFx) env.skyFx(b, eye, r);
    b.glow.flush(); b.core.flush();
    GL.clearDepth();
  }

  // ------------------------------------------------------------------ stage (per-shot state)
  class Stage {
    constructor(movie, def, rng) {
      this.movie = movie; this.def = def; this.rng = rng;
      this.fx = new Particles();
      this.models = [];
      this.cues = {};
      this.shakeAmt = 0;
      this.k = 0; this.f = 0;
    }
    cue(name, cond) { if (cond === false || this.cues[name]) return false; this.cues[name] = true; return true; }
    at(frame) { return this.f === frame; }
    glow(p, size, c, a, rot, stretch) { batches().glow.sprite(p, size, c, a == null ? 1 : a, rot, stretch); }
    core(p, size, c, a, rot) { batches().core.sprite(p, size, c, a == null ? 1 : a, rot); }
    flare(p, size, c, a, rot) { batches().flare.sprite(p, size, c, a == null ? 1 : a, rot); }
    ring(p, size, c, a) { batches().ring.sprite(p, size, c, a == null ? 1 : a); }
    smoke(p, size, c, a, rot) { batches().smoke.sprite(p, size, c, a == null ? 1 : a, rot); }
    haze(p, size, c, a, rot) { batches().fog.sprite(p, size, c, a == null ? 1 : a, rot); }
    beam(a, b, w, c, a0, a1, c1) { batches().glow.beam(a, b, w, c, a0 == null ? 1 : a0, a1, c1); }
    beamCore(a, b, w, c, a0, a1) { batches().core.beam(a, b, w, c, a0 == null ? 1 : a0, a1); }
    ribbon(pts, widths, cols, kind) { batches()[kind || 'glow'].ribbon(pts, widths, cols); }
    shake(m) { this.shakeAmt = Math.max(this.shakeAmt, m); }
    // run the shot's update + particles n frames before it starts (smoke already billowing, etc.)
    prewarm(n, k = 0) { this.muted = true; for (let i = 0; i < n; i++) { this.f = i; if (this.def.update) this.def.update(this, k, i); this.fx.update(); } this.f = 0; this.cues = {}; this.muted = false; }
    add(m) { this.models.push(m); return m; }
    sfx(id, vol) { if (!this.muted) FF7.audio.sfx(id, vol); }
    // 3D point -> screen (for overlays)
    project(p) { return GL.project(p); }
  }
  K.Stage = Stage;

  // ------------------------------------------------------------------ actors (characters / creatures / vehicles)
  // Characters: realistic (battle-style) proportions scaled to ~1.7 m
  K.actor = function (app, opts = {}) {
    const m = FF7.chars3d.build(app, { style: opts.style || 'battle' });
    m.scale = opts.scale || (m.rig === 'quad' ? 1.6 : 1.72);
    if (opts.anim) m.play(opts.anim, { loop: true, restart: true });
    else if (m.anims) m.play(m.anims.idle);
    if (m.showWeapon) m.showWeapon(!!opts.weapon);
    if (opts.pos) m.position = opts.pos.slice();
    if (opts.rotY != null) m.rotY = opts.rotY;
    return m;
  };
  // Enemy model (Weapons...). Uses a dedicated model when one exists, else `fallback()`.
  K.creature = function (id, fallback) {
    const CR = FF7.creatures;
    const e = FF7.data.enemies && FF7.data.enemies[id];
    if (CR && CR.MODELS && CR.MODELS[id]) { try { return CR.build(e ? e.look : { type: 'custom', id }, id); } catch (err) { console.warn('cinema: creature', id, err); } }
    if (fallback) return fallback();
    if (CR && e) return CR.build(e.look, id);
    return null;
  };
  // Model bounding box (model space, rest pose)
  K.modelBox = function (m) {
    const sv = { p: m.position, s: m.scale, x: m.rotX, y: m.rotY, z: m.rotZ };
    m.position = [0, 0, 0]; m.scale = 1; m.rotX = m.rotY = m.rotZ = 0;
    m.computeWorld();
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], T = M4.create();
    for (const b of m.order) for (const a of b.meshes) {
      const mesh = a.mesh; if (!mesh || !mesh.min) continue;
      const mat = a.m ? M4.mul(T, b.world, a.m) : b.world;
      for (let c = 0; c < 8; c++) {
        const p = M4.transformPoint(mat, [c & 1 ? mesh.max[0] : mesh.min[0], c & 2 ? mesh.max[1] : mesh.min[1], c & 4 ? mesh.max[2] : mesh.min[2]]);
        for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
      }
    }
    m.position = sv.p; m.scale = sv.s; m.rotX = sv.x; m.rotY = sv.y; m.rotZ = sv.z;
    return { min: mn, max: mx, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] };
  };
  // Vehicle from js/gl/vehicles.js when available (scaled so its length along z = `len`), else the
  // fallback builder fn(mb) (already in metres). Returns a Model-like object: { draw(), position, rotY, rotX, rotZ, scale }.
  const vehCache = {};
  K.vehicle = function (id, len, fallback) {
    const V3D = FF7.vehicles3d;
    if (V3D && typeof V3D.has === 'function' && V3D.has(id)) {
      try {
        const m = V3D.build(id, { style: 'field' });
        if (m && m.order) {
          const box = K.modelBox(m);
          const L0 = Math.max(box.size[2], box.size[0] * 0.8, 0.01);
          const s = len / L0;
          const w = new Wrap(m, s, [-(box.min[0] + box.max[0]) / 2, -box.min[1], -(box.min[2] + box.max[2]) / 2]);
          w.real = true;
          return w;
        }
      } catch (err) { console.warn('cinema: vehicle', id, err); }
    }
    if (!vehCache[id]) vehCache[id] = fallback ? K.meshOf(fallback) : null;
    return new MeshModel(vehCache[id]);
  };
  // wraps a Model with a base scale / centring offset
  class Wrap {
    constructor(m, s, off) { this.m = m; this.base = s; this.off = off; this.position = [0, 0, 0]; this.rotX = this.rotY = this.rotZ = 0; this.scale = 1; this.visible = true; this.alpha = 1; this.parts = {}; }
    update(dt) { if (this.m.update) this.m.update(dt); this._upd = FF7.frame; }
    play(clip, o) { if (this.m.play) this.m.play(clip, o); return this; }
    bone(n) { return this.m.bones && this.m.bones[n]; }
    draw(opts) {
      if (!this.visible) return;
      const m = this.m;
      if (this.autoUpdate !== false && this._upd !== FF7.frame && this._drawn !== FF7.frame && m.update) { m.update(1); this._drawn = FF7.frame; }
      const W = K.mat(this.position, [this.rotX, this.rotY, this.rotZ], this.scale * this.base);
      const off = M4.trs(M4.create(), this.off, [0, 0, 0], [1, 1, 1]);
      // compute bones relative to identity, then premultiply
      m.position = [0, 0, 0]; m.rotX = m.rotY = m.rotZ = 0; m.scale = 1;
      m.computeWorld();
      const T = M4.create(), T2 = M4.create();
      const o = Object.assign({}, opts || {});
      if (this.alpha < 1) { o.tint = [1, 1, 1, this.alpha]; o.blend = 'alpha'; }
      for (const b of m.order) {
        if (!b.visible) continue;
        for (const a of b.meshes) {
          M4.mul(T, off, a.m ? M4.mul(T2, b.world, a.m) : b.world);
          M4.mul(T2, W, T);
          GL.draw(a.mesh, T2, a.opts ? Object.assign({}, o, a.opts) : o);
        }
      }
    }
  }
  class MeshModel {
    constructor(mesh) { this.mesh = mesh; this.position = [0, 0, 0]; this.rotX = this.rotY = this.rotZ = 0; this.scale = 1; this.visible = true; this.alpha = 1; }
    update() {}
    draw(opts) {
      if (!this.visible || !this.mesh) return;
      const o = Object.assign({}, opts || {});
      if (this.alpha < 1) { o.tint = [1, 1, 1, this.alpha]; o.blend = 'alpha'; }
      K.put(this.mesh, this.position, [this.rotX, this.rotY, this.rotZ], this.scale, o);
    }
  }
  K.MeshModel = MeshModel;
  K.Wrap = Wrap;
  // face a model toward a point
  K.face = (m, p) => { m.rotY = Math.atan2(p[0] - m.position[0], p[2] - m.position[2]); };

  // ------------------------------------------------------------------ movie definition registry
  CIN.def = function (id, m) { m.id = id; CIN.movies[id] = m; if (CIN.list.indexOf(id) < 0 && !m.hidden) CIN.list.push(id); return m; };

  // ------------------------------------------------------------------ the player scene
  const FPS = 60;
  class MovieScene {
    constructor(def, opts, waiter) {
      this.def = def; this.opts = opts; this.waiter = waiter;
      this.noClock = true; this.isMovie = true;
      this.t = 0; this.idx = 0; this.done = false;
      this.rng = K.rng(def.id || 'movie');
      // timing: stretch the movie if the caption needs more reading time
      const text = opts.text ? U.names(String(opts.text)) : '';
      this.pages = text ? text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) : [];
      const base = def.shots.map(s => s.dur || 240);
      const total = base.reduce((a, b) => a + b, 0);
      const need = this.pages.reduce((a, p) => a + 70 + p.length * 4.2, 0) + 60;
      let stretch = 1;
      if (need > total * 0.9) stretch = Math.min(1.35, need / (total * 0.9));
      this.durs = base.map(d => Math.round(d * stretch));
      let sum = this.durs.reduce((a, b) => a + b, 0);
      if (need > sum * 0.92) { const extra = Math.round(need / 0.92 - sum); this.durs[this.durs.length - 1] += extra; sum += extra; }
      this.total = sum;
      // caption schedule
      // each page gets a slot (proportional to its length) and is shown for its reading time inside it
      const t0 = Math.min(def.captionAt != null ? def.captionAt * sum : 70, sum * 0.12), t1 = sum - Math.min(40, sum * 0.06);
      const w = this.pages.map(p => p.length + 50), wsum = w.reduce((a, b) => a + b, 0) || 1;
      let acc = t0;
      this.caps = this.pages.map((p, i) => {
        const slot = (t1 - t0) * w[i] / wsum;
        const show = Math.min(slot, Math.max(300, 90 + p.length * 3.6));
        const c = { text: p, a: acc, b: acc + show, lines: null }; acc += slot; return c;
      });
      // build all shots up front (mesh building happens while the screen is black)
      this.shots = def.shots.map((sd, i) => {
        const S = new Stage(this, sd, this.rng);
        S.dur = this.durs[i]; S.index = i;
        try { if (sd.init) sd.init(S); } catch (err) { console.error('cinema: init error', def.id, i, err); S.broken = true; }
        return S;
      });
      this.cur = this.shots[0]; this.prev = null;
      this.skipFade = 0;
      this.skip = FF7.qol && FF7.qol.MovieSkip ? new FF7.qol.MovieSkip() : null;
    }
    enter() {
      const A = FF7.audio, d = this.def, o = this.opts;
      FF7.sceneMgr.fadeIn(0);
      this.prevMusic = A.currentId || null;
      const mus = o.music !== undefined ? o.music : d.music;
      this.musicMode = 'none';
      if (mus && mus !== 'none' && !o.keepMusic && mus !== this.prevMusic) {
        if (d.carry || o.carry) { A.play(mus, { fade: 20 }); this.musicMode = 'carry'; }
        else { A.push(mus, { fadeIn: 30 }); this.musicMode = 'push'; }
      } else if (mus === 'none' && !o.keepMusic && this.prevMusic) { A.push('none'); this.musicMode = 'push'; }
      FF7.input.consume();
    }
    exit() {}
    stageK(S) { return S.f / Math.max(1, S.dur); }
    stepStage(S) {
      S.stepped = true;
      if (S.broken) { S.f++; return; }
      S.k = this.stageK(S);
      S.shakeAmt = 0;
      try {
        if (S.def.update) S.def.update(S, S.k, S.f);
        for (const m of S.models) if (m.update) m.update(1);
        S.fx.update();
      } catch (err) { console.error('cinema: update error', this.def.id, S.index, err); S.broken = true; }
      S.f++;
    }
    update(canInput) {
      if (this.done) return;
      // Start (Tab) asks "Skip this cutscene?"; the movie holds while it is asked
      if (!this.ending && this.skip) {
        const k = this.skip.update(canInput !== false, this.t > 2);
        if (k === 'hold') return;
        if (k === 'skip') { this.ending = 'skip'; this.skipFade = 1; }
      } else if (!this.ending && !this.skip && this.t > 2 && I.pressed('start')) { this.ending = 'skip'; this.skipFade = 1; }
      this.t++;
      if (this.ending) {
        this.skipFade++;
        if (this.skipFade > 16) return this.finish();
      }
      this.stepStage(this.cur);
      if (this.prev) { this.stepStage(this.prev); if (this.cur.f >= (this.cur.def.dissolve || 0)) this.prev = null; }
      if (this.cur.f >= this.cur.dur) {
        this.idx++;
        if (this.idx >= this.shots.length) { this.ending = this.ending || 'end'; return this.finish(); }
        const next = this.shots[this.idx];
        this.prev = next.def.dissolve ? this.cur : null;
        this.cur = next;
      }
    }
    finish() {
      if (this.done) return;
      this.done = true;
      const A = FF7.audio, S = FF7.sceneMgr;
      if (A.stopSceneSfx) A.stopSceneSfx(this.ending === 'skip' ? 8 : 20);   // (a movie's alarm stays in the movie)
      if (this.musicMode === 'push') A.pop(40);
      else if (this.ending === 'skip' && this.musicMode === 'carry' && this.def.stopOnSkip) A.stop(30);
      S.fadeOut(0);
      S.pop();
      if (!this.opts.stayBlack) S.fadeIn(this.opts.fadeIn != null ? this.opts.fadeIn : 24);
      this.waiter.result = this.ending === 'skip' ? 'skip' : 'end';
      this.waiter.done = true;
    }
    // ---------------------------------------------------------------- render
    renderStage(S, alpha) {
      if (!S.stepped) this.stepStage(S);     // never draw a shot before its first update
      const d = S.def;
      const k = S.k;
      let env;
      try { env = resolveEnv(d.env, S, k); } catch (err) { env = ENV.night; }
      const clear = col(env.sky[1]);
      GL.begin({ clear: [clear[0], clear[1], clear[2], 1], fog: env.fog, light: env.light });
      const g = GL.gl;
      if (g) g.colorMask(true, true, true, false);
      let c;
      try { c = d.cam ? d.cam(S, k) : null; } catch (err) { c = null; if (!S._camErr) { S._camErr = 1; console.error('cinema: cam error', this.def.id, S.index, err); } }
      c = c || { eye: [0, 2, 8], at: [0, 1, 0] };
      if (S.shakeAmt > 0) {
        const m = S.shakeAmt;
        c = Object.assign({}, c, { eye: [c.eye[0] + (Math.random() - 0.5) * m, c.eye[1] + (Math.random() - 0.5) * m, c.eye[2] + (Math.random() - 0.5) * m], at: [c.at[0] + (Math.random() - 0.5) * m * 0.6, c.at[1] + (Math.random() - 0.5) * m * 0.6, c.at[2] + (Math.random() - 0.5) * m * 0.6] });
      }
      setCamera(c);
      beginBatches();
      drawSky(env);
      beginBatches();
      // optional far layer (distant scenery) with its own depth range
      if (d.drawFar && !S.broken) {
        try {
          setCamera(Object.assign({}, c, { near: c.farNear || 30, far: c.farFar || 8000 }));
          d.drawFar(S, k);
          flushBatches();
          GL.clearDepth();
          setCamera(c);
        } catch (err) { if (!S._farErr) { S._farErr = 1; console.error('cinema: far error', this.def.id, S.index, err); } }
        beginBatches();
      }
      if (!S.broken) {
        try {
          if (d.draw) d.draw(S, k);
          for (const m of S.models) if (m.draw && m.visible !== false && !m.manual) m.draw();
          S.fx.draw();
          if (d.drawFx) d.drawFx(S, k);
        } catch (err) { if (!S._drawErr) { S._drawErr = 1; console.error('cinema: draw error', this.def.id, S.index, err); } }
      }
      flushBatches();
      if (g) g.colorMask(true, true, true, true);
      GL.end(alpha);
      const cx = R.ctx;
      // colour grade: tint (multiply), lift (lighter) and vignette — the pre-rendered FMV look
      const gr = d.grade || this.def.grade;
      if (gr !== false) {
        const G = Object.assign({ vignette: 0.55 }, gr || {});
        cx.save(); cx.globalAlpha = alpha;
        if (G.tint) { cx.globalCompositeOperation = 'multiply'; cx.fillStyle = G.tint; cx.fillRect(0, 0, FF7.W, FF7.H); cx.globalCompositeOperation = 'source-over'; }
        if (G.lift) { cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = alpha * (G.liftA || 0.08); cx.fillStyle = G.lift; cx.fillRect(0, 0, FF7.W, FF7.H); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = alpha; }
        if (G.vignette > 0) {
          const vg = cx.createRadialGradient(FF7.W / 2, FF7.H / 2, FF7.H * 0.35, FF7.W / 2, FF7.H / 2, FF7.W * 0.62);
          vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + G.vignette + ')');
          cx.fillStyle = vg; cx.fillRect(0, 0, FF7.W, FF7.H);
        }
        cx.restore(); R.reset();
      }
      if (d.overlay && !S.broken) { cx.save(); cx.globalAlpha = alpha; try { d.overlay(cx, S, k); } catch (err) { } cx.restore(); R.reset(); }
      // shot fades
      const fi = d.fadeIn, fo = d.fadeOut;
      const fOf = (v) => Array.isArray(v) ? v : [v, '#000'];
      if (fi) { const [n, cc] = fOf(fi); const a = 1 - S.f / n; if (a > 0) R.fill(cc, Math.min(1, a) * alpha); }
      if (fo) { const [n, cc] = fOf(fo); const a = 1 - (S.dur - S.f) / n; if (a > 0) R.fill(cc, Math.min(1, a) * alpha); }
    }
    render() {
      R.clear();
      if (this.prev) this.renderStage(this.prev, 1);
      const a = this.prev ? clamp01(this.cur.f / Math.max(1, this.cur.def.dissolve)) : 1;
      this.renderStage(this.cur, a);
      // first frames: from black
      if (this.t < 12) R.fill('#000', 1 - this.t / 12);
      this.renderBars();
      this.renderCaption();
      if (this.skip && !this.ending) this.skip.draw();
      if (this.ending === 'skip') R.fill('#000', clamp01(this.skipFade / 16));
    }
    renderBars() {
      const bar = this.def.letterbox != null ? this.def.letterbox : 0;
      if (!bar) return;
      const c = R.ctx;
      c.fillStyle = '#000';
      c.fillRect(0, 0, FF7.W, bar); c.fillRect(0, FF7.H - bar, FF7.W, bar);
    }
    renderCaption() {
      if (!this.caps.length) return;
      const c = R.ctx, t = this.t;
      for (const cap of this.caps) {
        if (t < cap.a || t > cap.b) continue;
        const a = Math.min(1, (t - cap.a) / 24, (cap.b - t) / 24);
        if (a <= 0) continue;
        if (!cap.lines) {
          const wrapAt = (sz) => { const out = []; cap.text.split('\n').forEach(l => R.wrap(l, FF7.W - 80, sz).forEach(x => out.push(x))); return out; };
          cap.size = 17; cap.lines = wrapAt(17);
          if (cap.lines.length > 7) { cap.size = 15; cap.lines = wrapAt(15); }
        }
        const size = cap.size, lh = size + 6, n = cap.lines.length;
        const y0 = FF7.H - 12 - n * lh;
        c.save();
        c.globalAlpha = a * 0.55;
        const g = c.createLinearGradient(0, y0 - 18, 0, FF7.H);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, 'rgba(0,0,0,0.8)'); g.addColorStop(1, 'rgba(0,0,0,1)');
        c.fillStyle = g; c.fillRect(0, y0 - 18, FF7.W, FF7.H - y0 + 18);
        c.globalAlpha = a;
        cap.lines.forEach((l, i) => R.text(l, FF7.W / 2, Math.max(8, y0) + i * lh, { align: 'center', size, color: '#f0f0f4' }));
        c.restore();
      }
    }
  }
  CIN.MovieScene = MovieScene;

  // ------------------------------------------------------------------ public API
  CIN.play = function (id, opts = {}) {
    const w = { done: false, result: null };
    let def = CIN.movies[id];
    if (!def) def = Object.assign({}, CIN.movies._generic, { id: String(id) });
    if (!def || !def.shots) { w.done = true; w.result = 'missing'; return w; }
    let sc;
    try { sc = new MovieScene(def, opts, w); }
    catch (err) {
      console.error('cinema: failed to start', id, err);
      if (opts.text && FF7.ui && FF7.ui.caption) return FF7.ui.caption(opts.text, { hold: 360, bg: '#000' });
      w.done = true; w.result = 'error'; return w;
    }
    FF7.sceneMgr.push(sc);
    return w;
  };
  CIN.has = (id) => !!CIN.movies[id];
  CIN.playRealtime = CIN.play;     // always the real-time cinematic (js/gfx/fmv.js wraps CIN.play)

  // Dev viewer (index.html?movie=<id>): plays the movie, then shows a picker (up/down + OK).
  class TestScene {
    constructor(id) { this.sel = Math.max(0, CIN.list.indexOf(id)); this.first = id; this.t = 0; this.all = id === 'all'; this.noClock = true; }
    enter() { if (this.first) { const id = this.all ? CIN.list[0] : this.first; this.first = null; this.start(id); } }
    start(id, rt) { this.sel = Math.max(0, CIN.list.indexOf(id)); this.playing = (rt ? CIN.playRealtime : CIN.play)(id, { text: CIN.sample(id) }); }
    resume() { FF7.sceneMgr.fadeIn(10); }
    update(canInput) {
      this.t++;
      if (this.playing && !this.playing.done) return;
      if (this.playing && this.all && this.playing.result !== 'skip' && this.sel < CIN.list.length - 1) { this.start(CIN.list[this.sel + 1]); return; }
      this.playing = null;
      if (!canInput) return;
      const n = CIN.list.length;
      if (I.repeat('up')) this.sel = (this.sel + n - 1) % n;
      if (I.repeat('down')) this.sel = (this.sel + 1) % n;
      if (I.pressed('ok')) this.start(CIN.list[this.sel]);
      else if (I.pressed('square')) this.start(CIN.list[this.sel], true);
    }
    render() {
      R.clear();
      R.text('Movies', 40, 30, { size: 22, color: R.COL.cyan });
      const n = CIN.list.length, per = 17, top = Math.max(0, Math.min(n - per, this.sel - 8));
      for (let i = top; i < Math.min(n, top + per); i++) {
        const y = 70 + (i - top) * 22;
        R.text(CIN.list[i], 70, y, { size: 16, color: i === this.sel ? '#ffffff' : '#9098a8' });
        if (i === this.sel) R.cursor(64, y + 9);
      }
      { const L = (k) => FF7.input.label(k); R.text(L('ok') + ': play    ' + L('square') + ': real-time version    ' + L('start') + ': skip', 40, FF7.H - 36, { size: 13, color: '#8088a0' }); }   // (the player's own keys)
    }
  }
  CIN.test = function (id) { FF7.sceneMgr.set(new TestScene(id || CIN.list[0])); };
  // caption used by the dev viewer (the story scripts pass their own text)
  CIN.sample = (id) => (CIN.movies[id] && CIN.movies[id].sample) || '';
})();

// =====================================================================================================
// Part 2: sets. Everything is built from MeshBuilder primitives once and cached.
//   Human-scale sets use 1 unit = 1 m; the city-scale Midgar model uses 1 unit ≈ 25 m.
// =====================================================================================================
(function () {
  const U = FF7.util, MB = FF7.MeshBuilder, V = FF7.V3;
  const K = FF7.cinema.K, TAU = K.TAU, L = K.L;
  const sh = U.shade;
  const SET = K.SET = {};
  const cache = {};
  const once = (key, fn) => cache[key] || (cache[key] = fn());
  K.once = once;

  // ------------------------------------------------------------------ window textures (64x64, repeat)
  function winTex(night, seed, wallC) {
    const t = FF7.tex.create(64, 64);
    const d = t.data, r = K.rng('win' + seed);
    const wall = wallC || (night ? [22, 25, 33] : [112, 114, 120]);
    for (let i = 0; i < 64 * 64; i++) { d[i * 4] = wall[0]; d[i * 4 + 1] = wall[1]; d[i * 4 + 2] = wall[2]; d[i * 4 + 3] = 255; }
    for (let row = 0; row < 8; row++) {
      const floorLit = r() < (night ? 0.75 : 1);
      for (let c = 0; c < 8; c++) {
        let wc;
        if (night) {
          const lit = floorLit && r() < 0.42;
          const q = r();
          wc = lit ? (q < 0.7 ? [255, 206, 120] : q < 0.92 ? [214, 232, 255] : [150, 255, 190]) : [9, 11, 16];
          if (lit) { const k = 0.65 + r() * 0.35; wc = wc.map(v => v * k); }
        } else {
          const q = r();
          wc = q < 0.8 ? [58, 70, 88] : [150, 170, 190];
        }
        for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) {
          const i = ((row * 8 + 2 + y) * 64 + c * 8 + 1 + x) * 4;
          d[i] = wc[0]; d[i + 1] = wc[1]; d[i + 2] = wc[2];
        }
      }
    }
    return t;
  }
  const TEX = K.TEXW = { night: winTex(true, 1), day: winTex(false, 1), night2: winTex(true, 2), brick: winTex(true, 3, [58, 40, 34]) };
  K.winTex = winTex;
  const TOPUV = [0.01, 0.01];

  // Textured box: base (x, y0, z), size w x d, height h. uv scale us/vs (texture repeats per unit).
  // Faces: 4 sides + top (no bottom); sides get fake baked light.
  K.tbox = function (mb, x, y0, z, w, d, h, c, us, vs, opts = {}) {
    const hw = w / 2, hd = d / 2, y1 = y0 + h;
    const b = [[x - hw, y0, z - hd], [x + hw, y0, z - hd], [x + hw, y0, z + hd], [x - hw, y0, z + hd]];
    const t = b.map(p => [p[0], y1, p[2]]);
    const base = K.col(c);
    const cc = (k) => [base[0] * k, base[1] * k, base[2] * k, 1];
    const u0 = opts.u0 || 0, v0 = 0, vh = h * vs;
    const face = (a, bb, cq, dq, len, k) => mb.quad(a, bb, cq, dq, cc(k), [[u0, vh], [u0 + len * us, vh], [u0 + len * us, v0], [u0, v0]]);
    face(b[3], b[2], t[2], t[3], w, 1.0);   // front +z
    face(b[1], b[0], t[0], t[1], w, 0.72);  // back -z
    face(b[2], b[1], t[1], t[2], d, 0.86);  // right +x
    face(b[0], b[3], t[3], t[0], d, 0.8);   // left -x
    if (!opts.noTop) mb.quad(t[3], t[2], t[1], t[0], cc(opts.top || 0.55), [TOPUV, TOPUV, TOPUV, TOPUV]);
    return mb;
  };
  // Polar helpers: angle th measured clockwise from north (-z)
  const P = (r, th, y) => [Math.sin(th) * r, y, -Math.cos(th) * r];
  K.polar = P;
  // Annular wedge slab between radii r0..r1, angles a0..a1 (a1 > a0), heights y0..y1
  K.wedge = function (mb, r0, r1, a0, a1, y0, y1, color, n, opts = {}) {
    n = n || Math.max(1, Math.ceil((a1 - a0) / 0.12));
    const cs = opts.sideColor || sh(color, -0.25), cb = opts.bottomColor || sh(color, -0.45);
    for (let i = 0; i < n; i++) {
      const t0 = L(a0, a1, i / n), t1 = L(a0, a1, (i + 1) / n);
      mb.quad(P(r0, t1, y1), P(r1, t1, y1), P(r1, t0, y1), P(r0, t0, y1), color);              // top
      if (!opts.noBottom) mb.quad(P(r0, t0, y0), P(r1, t0, y0), P(r1, t1, y0), P(r0, t1, y0), cb); // bottom
      mb.quad(P(r1, t1, y0), P(r1, t0, y0), P(r1, t0, y1), P(r1, t1, y1), cs);                 // outer
      if (r0 > 0.01) mb.quad(P(r0, t0, y0), P(r0, t1, y0), P(r0, t1, y1), P(r0, t0, y1), cs);  // inner
    }
    if (!opts.noEnds) {
      mb.quad(P(r1, a0, y0), P(r0, a0, y0), P(r0, a0, y1), P(r1, a0, y1), cs);
      mb.quad(P(r0, a1, y0), P(r1, a1, y0), P(r1, a1, y1), P(r0, a1, y1), cs);
    }
    return mb;
  };
  // Ground disc (lit), rings of vertex-colour noise, radius R, colour function of (radius, angle)
  K.groundDisc = function (mb, R, colFn, rings = 14, seg = 40, y = 0, seed = 1, hFn) {
    const r = K.rng('ground' + seed);
    const Y = (rr, a) => (hFn ? hFn(rr, a) : y);
    for (let j = 0; j < rings; j++) {
      const r0 = R * Math.pow(j / rings, 1.6), r1 = R * Math.pow((j + 1) / rings, 1.6);
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
        const c = sh(colFn((r0 + r1) / 2, (a0 + a1) / 2), (r() - 0.5) * 0.08);
        if (j === 0) mb.tri([0, Y(0, 0), 0], P(r1, a1, Y(r1, a1)), P(r1, a0, Y(r1, a0)), c);
        else mb.quad(P(r0, a1, Y(r0, a1)), P(r1, a1, Y(r1, a1)), P(r1, a0, Y(r1, a0)), P(r0, a0, Y(r0, a0)), c);
      }
    }
    return mb;
  };
  // Height-field terrain patch (lit): x0..x1, z0..z1, n x m cells, h(x,z), colour c(x,z,y)
  K.terrain = function (mb, x0, z0, x1, z1, nx, nz, hFn, cFn) {
    const dx = (x1 - x0) / nx, dz = (z1 - z0) / nz;
    const pt = (i, j) => { const x = x0 + i * dx, z = z0 + j * dz; return [x, hFn(x, z), z]; };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = pt(i, j + 1), b = pt(i + 1, j + 1), c = pt(i + 1, j), d = pt(i, j);
      const cx = (a[0] + c[0]) / 2, cz = (a[2] + c[2]) / 2;
      mb.quad(a, b, c, d, cFn(cx, cz, (a[1] + b[1] + c[1] + d[1]) / 4));
    }
    return mb;
  };

  // ================================================================== Midgar (city scale, 1 unit ≈ 25 m)
  const MID = SET.MID = { PH: 5, PT: 0.9, PR: 40, HUB: 6.5 };
  // sector s (1..8) centred at th = (s-1)*45deg; dividers (and reactors) at th = (s-1)*45 + 22.5
  MID.secAngle = (s) => (s - 1) * TAU / 8;
  MID.reactorAngle = (s) => (s - 1) * TAU / 8 + TAU / 16;
  MID.reactorPos = (s, y) => P(MID.PR - 1.2, MID.reactorAngle(s), y == null ? MID.PH : y);
  // opts: { omit: [sectors], only: sector, cannon, ruins }
  SET.midgar = function (opts = {}) {
    const key = 'midgar' + JSON.stringify(opts);
    return once(key, () => buildMidgar(opts));
  };
  function buildMidgar(o) {
    const { PH, PT, PR, HUB } = MID;
    const r = K.rng('midgar' + (o.only || ''));
    const omit = o.omit || [], only = o.only || 0, ruins = !!o.ruins;
    const has = (s) => (only ? s === only : omit.indexOf(s) < 0);
    const mb = new MB();          // lit, untextured (plate, pillars, reactors, ground)
    const tb = new MB();          // textured city blocks (window texture)
    const lights = [];            // street light points [x,y,z, colourIndex]
    const rx = { reactors: [], rim: [] };
    const metal = ruins ? '#6a6a60' : '#3a3e46', plateTop = ruins ? '#5a604a' : '#2c3036';
    // ---- ground + slums (skipped for the 'only' sector piece)
    if (!only) {
      K.groundDisc(mb, 420, (rr) => rr < PR + 8 ? (ruins ? '#4a6a30' : '#3a342c') : rr < 120 ? U.mix(ruins ? '#5a7a38' : '#4a4034', ruins ? '#6a8a40' : '#6a5a44', (rr - PR) / 80) : (ruins ? '#6a8448' : '#6e6048'), 16, 48, 0, ruins ? 3 : 1);
      for (let i = 0; i < 900; i++) {
        const rr = 5 + Math.sqrt(r()) * (PR + 6 - 5), th = r() * TAU;
        const sec = 1 + Math.round(th / (TAU / 8)) % 8;
        if (omit.indexOf(sec) >= 0 && rr < PR && o.crushed) continue;
        const p = P(rr, th, 0);
        const w = 0.4 + r() * 1.0, d = 0.4 + r() * 1.0, h = 0.15 + r() * (rr > PR ? 0.3 : 0.55);
        mb.push(); mb.translate(p[0], 0, p[2]); mb.rotate(0, r() * TAU, 0);
        mb.frustum(0, 0, 0, w, d, w, d, h, sh(ruins ? '#5a6a40' : '#5a4a3a', (r() - 0.5) * 0.3));
        mb.pop();
        if (!ruins && r() < 0.18) lights.push([p[0], h + 0.1, p[2], 3]);
      }
      mb.prism(0, 0, 0, 3.4, 3.0, PH - PT, 12, metal, true, false, false);
      for (const [rad, n, w] of [[17, 8, 0.8], [31, 8, 0.75]]) for (let i = 0; i < n; i++) {
        const th = i / n * TAU;
        if (!has(1 + i % 8)) continue;
        const p = P(rad, th, 0);
        mb.prism(p[0], 0, p[2], w * 1.2, w, PH - PT, 8, metal, true, false, false);
      }
      if (o.crushed) for (const s of omit) buildRubble(mb, s, r, false);
    }
    // ---- plate wedges + city blocks per sector
    for (let s = 1; s <= 8; s++) {
      if (!has(s)) continue;
      const a0 = MID.secAngle(s) - TAU / 16 + 0.012, a1 = MID.secAngle(s) + TAU / 16 - 0.012;
      if (ruins && (s === 7 || s === 4)) { buildRubble(mb, s, r, true); continue; }
      K.wedge(mb, HUB, PR, a0, a1, PH - PT, PH, plateTop, 6, { sideColor: '#262a30', bottomColor: '#1c1e22' });
      for (let g = 0; g < 5; g++) { const th = L(a0, a1, (g + 0.5) / 5); K.wedge(mb, HUB + 1, PR - 0.5, th - 0.01, th + 0.01, PH - PT - 0.35, PH - PT, '#23262c', 1); }
      K.wedge(mb, PR - 0.35, PR, a0, a1, PH, PH + 0.45, ruins ? '#6a6a5a' : '#30343c', 6);
      if (!ruins) for (let i = 1; i < 6; i++) rx.rim.push(P(PR + 0.05, L(a0, a1, i / 6), PH - PT * 0.5));
      const mid = MID.secAngle(s);
      for (let rr = HUB + 2.2; rr < PR - 1.6; rr += 1.45 + r() * 0.3) {
        if (Math.abs(rr - 22) < 0.9) continue;                 // ring road
        const step = 1.45 / rr;
        for (let th = a0 + 0.035; th < a1 - 0.02; th += step * (0.95 + r() * 0.3)) {
          if (Math.abs(th - mid) * rr < 0.7) continue;         // radial avenue
          if (r() < 0.06) continue;
          const p = P(rr + (r() - 0.5) * 0.3, th, PH);
          const w = 0.7 + r() * 0.6, d = 0.7 + r() * 0.6;
          const tall = r() < 0.08;
          let h = (0.25 + r() * 0.8) * (1 + Math.max(0, (18 - rr) / 12)) + (tall ? 1.2 + r() * 1.6 : 0);
          if (ruins) h *= 0.4 + r() * 0.5;
          tb.push(); tb.translate(p[0], PH, p[2]); tb.rotate(ruins ? (r() - 0.5) * 0.25 : 0, Math.PI - th, ruins ? (r() - 0.5) * 0.25 : 0);
          K.tbox(tb, 0, 0, 0, w, d, h, ruins ? '#98a088' : sh('#ffffff', -r() * 0.25), 0.62, 0.9, { u0: r() });
          if (tall && !ruins) tb.box(0, h + 0.15, 0, w * 0.5, 0.3, d * 0.5, '#80848c');
          tb.pop();
        }
        if (!ruins) { lights.push(P(rr, mid - 0.45 / rr, PH + 0.08).concat(0)); lights.push(P(rr, mid + 0.45 / rr, PH + 0.08).concat(0)); }
      }
      if (!ruins) for (let i = 0; i < 14; i++) { const th = L(a0, a1, i / 13); lights.push(P(22, th, PH + 0.08).concat(1)); }
      if (ruins) growth(mb, s, r);
    }
    // ---- dividers + reactors
    if (!only) for (let s = 1; s <= 8; s++) {
      const th = MID.reactorAngle(s);
      const wantR = ruins ? (s % 3 !== 0) : true;
      K.wedge(mb, HUB, PR - 2, th - 0.012, th + 0.012, PH - PT, PH + 0.5, ruins ? '#6a6a5a' : '#343840', 4);
      if (wantR) buildReactor(mb, P(PR - 1.2, th, PH), th, ruins, rx, s);
    }
    // ---- hub + Shinra HQ
    if (!only) {
      K.wedge(mb, 0.01, HUB, 0, TAU, PH - PT, PH + 0.6, ruins ? '#6a6a5a' : '#3a3e46', 24, { noEnds: true });
      if (!ruins) {
        const hq = (y0, w, d, h, c) => K.tbox(tb, 0, y0, 0, w, d, h, c || '#ffffff', 0.5, 1.1);
        hq(PH + 0.6, 5.2, 4.2, 2.6);
        hq(PH + 3.2, 3.2, 2.6, 10.5);
        hq(PH + 13.7, 2.6, 2.0, 1.4, '#d0d0d8');
        tb.frustum(0, PH + 15.1, 0, 2.4, 1.8, 1.2, 0.9, 1.0, '#50545c');
        mb.prism(0, PH + 16.1, 0, 0.08, 0.02, 2.4, 5, '#a0a0a0');
        for (const sx of [-1, 1]) K.tbox(tb, sx * 3.4, PH + 0.6, 0.6, 1.8, 3.0, 4.2, '#ffffff', 0.5, 1.1);
        rx.hqTop = [0, PH + 18.4, 0];
        rx.hqLights = [[1.3, PH + 15.1, 1.0], [-1.3, PH + 15.1, 1.0], [1.3, PH + 15.1, -1.0], [-1.3, PH + 15.1, -1.0]];
      } else {
        tb.push(); tb.translate(0, PH + 0.6, 0); tb.rotate(0.12, 0.3, -0.08);
        K.tbox(tb, 0, 0, 0, 4.2, 3.4, 3.0, '#a8b098', 0.5, 1.1);
        K.tbox(tb, 0, 3.0, 0, 3.0, 2.4, 6.5, '#a0a890', 0.5, 1.1);
        tb.pop();
        for (let i = 0; i < 40; i++) { const a = r() * TAU, rr = r() * 3.5; mb.sphere(Math.sin(a) * rr, PH + 0.6 + r() * 5, Math.cos(a) * rr, 0.6 + r(), 0.5 + r() * 0.6, 0.6 + r(), sh('#4a7a30', (r() - 0.5) * 0.3), 6, 4, false); }
      }
    }
    if (o.cannon) buildCannon(mb, rx);
    return {
      mesh: mb.build(),
      blocks: tb.build({ tex: TEX.night, texOpts: { repeat: true } }),
      lights, rx,
    };
  }
  function buildReactor(mb, p, th, ruins, rx, s) {
    const c = ruins ? '#6a6a5a' : '#4a4e56', dk = ruins ? '#5a5a4a' : '#30343a';
    mb.push(); mb.translate(p[0], p[1], p[2]); mb.rotate(0, Math.PI - th, 0);
    mb.prism(0, -MID.PT, 0, 2.3, 2.3, MID.PT + 1.1, 12, dk, true);
    mb.prism(0, 1.1, 0, 1.8, 1.55, 2.4, 12, c, true);
    mb.sphere(0, 3.5, 0, 1.55, 0.7, 1.55, c, 12, 6, true, null, 3);
    mb.prism(0, 3.5, 0, 0.9, 0.7, 0.6, 8, dk, true);
    for (const [x, z] of [[0.75, 1.1], [-0.75, 1.1]]) mb.prism(x, 1.1, z, 0.32, 0.28, ruins ? 3 : 6.5, 8, dk, true);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; mb.prism(Math.cos(a) * 1.9, -MID.PH, Math.sin(a) * 1.9, 0.32, 0.26, MID.PH - MID.PT, 6, dk, true, false, false); }
    mb.push(); mb.translate(0, 0.4, -1.8); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, 0, 0, 0.25, 0.25, 2.5, 6, dk); mb.pop();
    mb.pop();
    const up = (h) => [p[0], p[1] + h, p[2]];
    rx.reactors.push({ s, p: p.slice(), glow: up(3.3), stacks: [up(7.6)], th });
  }
  function buildCannon(mb, rx) {
    const base = P(12, 0, MID.PH + 0.6), el = 0.04;
    mb.push(); mb.translate(base[0], base[1], base[2]);
    mb.box(0, 0.8, 0, 3.4, 1.6, 3.4, '#3a3a40');
    mb.prism(0, 1.6, 0, 1.4, 1.2, 1.4, 10, '#44464e');
    mb.push(); mb.translate(0, 3.0, 0); mb.rotate(-(Math.PI / 2 - el), 0, 0);
    mb.prism(0, 0, 0, 1.0, 0.85, 7, 10, '#50525a', true);
    mb.prism(0, 7, 0, 0.85, 0.7, 7, 10, '#5a5c64', true);
    mb.prism(0, 14, 0, 0.7, 0.62, 8, 10, '#62646c', true);
    mb.prism(0, 22, 0, 0.9, 0.9, 0.8, 10, '#3a3c42', true);
    for (let i = 0; i < 6; i++) mb.prism(0, 2 + i * 3.4, 0, 1.12 - i * 0.07, 1.12 - i * 0.07, 0.35, 10, '#2a2c30');
    mb.pop();
    mb.pop();
    for (let s = 1; s <= 8; s++) {
      const a = MID.reactorPos(s, MID.PH + 1.2), b = [base[0], base[1] + 1.4, base[2]];
      const pts = [];
      for (let i = 0; i <= 10; i++) { const t = i / 10; const q = K.LV(a, b, t); q[1] += Math.sin(t * Math.PI) * 0.6; pts.push(q); }
      mb.sweep(pts, 0.18, { sides: 5, color: '#26282c' });
    }
    // barrel axis: +y rotated by -(90deg - el) about x  ->  (0, sin el, -cos el)
    const dir = [0, Math.sin(el), -Math.cos(el)];
    const muzzle = [base[0] + dir[0] * 22.8, base[1] + 3.0 + dir[1] * 22.8, base[2] + dir[2] * 22.8];
    rx.cannon = { base, dir, muzzle };
  }
  function buildRubble(mb, s, r, green) {
    const a0 = MID.secAngle(s) - TAU / 16, a1 = MID.secAngle(s) + TAU / 16;
    for (let i = 0; i < 70; i++) {
      const th = L(a0 + 0.03, a1 - 0.03, r()), rr = MID.HUB + 1 + r() * (MID.PR - MID.HUB - 1);
      const p = P(rr, th, 0);
      mb.push(); mb.translate(p[0], 0.2 + r() * 1.2, p[2]); mb.rotate((r() - 0.5) * 1.2, r() * TAU, (r() - 0.5) * 1.2);
      mb.box(0, 0, 0, 1 + r() * 3.5, 0.3 + r() * 0.4, 1 + r() * 3, sh(green ? '#6a6a5a' : '#3a3c40', (r() - 0.5) * 0.3));
      mb.pop();
      if (r() < 0.5) mb.sphere(p[0] + 1, 0, p[2], 1 + r() * 2, 0.5 + r() * 1.5, 1 + r() * 2, sh(green ? '#4a7a2a' : '#4a4038', (r() - 0.5) * 0.3), 6, 4, false, null, 3);
    }
    // the tilted wreck of the plate edge
    for (let i = 0; i < 3; i++) {
      const th = L(a0, a1, 0.25 + i * 0.25), p = P(MID.PR - 6 - i * 5, th, 0);
      mb.push(); mb.translate(p[0], 1.8, p[2]); mb.rotate(0.35 + r() * 0.3, Math.PI - th, (r() - 0.5) * 0.4);
      mb.box(0, 0, 0, 7, 0.7, 5, green ? '#6a6a5a' : '#2c3036');
      mb.pop();
    }
  }
  function growth(mb, s, r) {
    const a0 = MID.secAngle(s) - TAU / 16, a1 = MID.secAngle(s) + TAU / 16;
    for (let i = 0; i < 70; i++) {
      const th = L(a0, a1, r()), rr = MID.HUB + 1 + r() * (MID.PR - MID.HUB - 1);
      const p = P(rr, th, MID.PH);
      mb.sphere(p[0], MID.PH + 0.2, p[2], 0.8 + r() * 1.6, 0.4 + r() * 0.9, 0.8 + r() * 1.6, sh('#3e6e2a', (r() - 0.5) * 0.35), 7, 4, false);
    }
    for (let i = 0; i < 16; i++) { const th = L(a0, a1, r()); const p = P(MID.PR + 0.1, th, MID.PH); mb.box(p[0], MID.PH - 1.2, p[2], 0.5, 2.4 + r() * 2, 0.5, '#3a6a28'); }
  }
  // Draw the city. night: windows glow (unlit, window texture); day: lit. opts.matrix places it.
  K.drawMidgar = function (S, city, o = {}) {
    const night = !o.day;
    const sc = o.scale || 1, off0 = o.offset || [0, 0, 0];
    const M = o.matrix || (o.scale ? K.mat(off0, [0, o.rotY || 0, 0], sc) : null);
    const cr = Math.cos(o.rotY || 0), sr = Math.sin(o.rotY || 0);
    FF7.GL.draw(city.mesh, M, o.tint ? { tint: o.tint } : undefined);
    FF7.GL.draw(city.blocks, M, night ? { unlit: true, tex: TEX.night, texOpts: { repeat: true }, tint: o.tint } : { tex: TEX.day, texOpts: { repeat: true }, unlit: false, tint: o.tint });
    if (o.noGlow) return;
    const t = (S.f || 0) * 0.05;
    const off = off0;
    const tr = (p) => [(p[0] * cr + p[2] * sr) * sc + off[0], p[1] * sc + off[1], (-p[0] * sr + p[2] * cr) * sc + off[2]];
    const la = o.lights != null ? o.lights : 1;
    if (night && la > 0) {
      const LC = ['#ffe0a0', '#ffc070', '#a0ffd0', '#ff9a50'];
      for (const l of city.lights) S.glow(tr(l), (o.lightSize || 0.55) * sc, LC[l[3] || 0], 0.5 * la);
    }
    const mk = o.mako != null ? o.mako : 1;
    if (mk > 0) for (const rc of city.rx.reactors) {
      const fl = 0.85 + Math.sin(t * 2 + rc.s) * 0.1;
      S.glow(tr(rc.glow), (7 * mk) * sc, '#40ff90', 0.5 * fl * mk);
      S.glow(tr([rc.glow[0], rc.glow[1] - 2.8, rc.glow[2]]), (5 * mk) * sc, '#30ff80', 0.3 * fl * mk);
      S.core(tr(rc.glow), (2.2 * mk) * sc, '#c0ffe0', 0.45 * mk);
      if (night) {
        S.glow(tr(rc.stacks[0]), (0.8) * sc, '#ff3020', 0.5 + Math.sin(t * 4 + rc.s) * 0.3);
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; S.core(tr([rc.p[0] + Math.cos(a) * 1.85, rc.p[1] + 1.4, rc.p[2] + Math.sin(a) * 1.85]), (0.35) * sc, '#e8f4ff', 0.7); S.core(tr([rc.p[0] + Math.cos(a) * 1.62, rc.p[1] + 3.1, rc.p[2] + Math.sin(a) * 1.62]), (0.3) * sc, '#a0ffd0', 0.7); }
      }
    }
    if (city.rx.hqTop && night) {
      const blink = Math.sin(t * 3) > 0 ? 1 : 0.3;
      S.glow(tr(city.rx.hqTop), (1.6) * sc, '#ff2010', 0.8 * blink);
      for (const p of city.rx.hqLights) S.glow(tr(p), (1.3) * sc, '#ffffff', 0.5);
    }
    if (night && la > 0) for (const p of city.rx.rim) S.core(tr(p), (0.9) * sc, '#f0f4ff', 0.6 * la);
    // mako steam plumes rising from the reactor stacks
    const st = o.steam != null ? o.steam : (night ? 1 : 0.6);
    if (st > 0) for (const rc of city.rx.reactors) {
      const b = rc.stacks[0];
      for (let i = 0; i < 7; i++) {
        const u = ((S.f || 0) * 0.004 + i / 7 + rc.s * 0.13) % 1;
        const p = tr([b[0] + u * 3 * Math.sin(rc.s), b[1] + u * 16, b[2] + u * 2]);
        S.haze(p, 3 + u * 9, '#a0ffd8', 0.22 * st * Math.sin(u * Math.PI) * (1 - u * 0.4), i + rc.s);
      }
      S.glow(tr(b), (3) * sc, '#c0ffe0', 0.35 * st);
    }
    // searchlights sweeping from the Shinra building
    if (o.searchlights && city.rx.hqTop) {
      const base = tr([0, MID.PH + 3, 0]);
      for (let i = 0; i < 4; i++) {
        const a = t * 0.25 + i * TAU / 4, el = 0.9 + Math.sin(t * 0.4 + i) * 0.2;
        const tip = [base[0] + Math.cos(a) * Math.cos(el) * 60 * sc, base[1] + Math.sin(el) * 60 * sc, base[2] + Math.sin(a) * Math.cos(el) * 60 * sc];
        S.ribbon([base, tip], [1.2 * sc, 14 * sc], [[0.9, 1, 0.9, 0.22 * o.searchlights], [0.9, 1, 0.9, 0]], 'glow');
      }
    }
  };
})();

// ----------------------------------------------------------------------------- human-scale sets (1 unit = 1 m)
(function () {
  const U = FF7.util, MB = FF7.MeshBuilder, V = FF7.V3;
  const K = FF7.cinema.K, TAU = K.TAU, L = K.L, SET = K.SET, once = K.once;
  const sh = U.shade;
  const TEX = K.TEXW;
  // weathered brick/plaster wall with a few dark windows (lit by the scene)
  TEX.old = (() => {
    const t = FF7.tex.create(64, 64), d = t.data, r = K.rng('brick');
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const row = Math.floor(y / 4), off = (row % 2) * 4;
      const mortar = y % 4 === 3 || (x + off) % 8 === 7;
      const b = U.hash(Math.floor((x + off) / 8), row, 11);
      const stain = K.vnoise(x / 9, y / 9, 3) * 0.35;
      let c = mortar ? [70, 64, 58] : [118 + b * 30, 92 + b * 18, 78 + b * 10];
      c = c.map(v => v * (0.8 + stain));
      const i = (y * 64 + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    for (const [wx, wy] of [[6, 10], [38, 10], [22, 40], [50, 42]]) for (let y = 0; y < 12; y++) for (let x = 0; x < 9; x++) {
      const i = ((wy + y) * 64 + wx + x) * 4; const fr = x === 0 || y === 0 || x === 8 || y === 11;
      const c = fr ? [60, 56, 52] : (r() < 0.02 ? [90, 90, 80] : [26, 30, 36]); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
    }
    return t;
  })();
  TEX.concrete = K.winTex(false, 5, [120, 122, 126]);

  // Bake coloured point lights into a mesh's vertex colours (fake local lighting).
  //   lights: [{ p, c, r, k }]  (k = strength), amb = base multiplier
  K.bake = function (mesh, lights, amb = 1) {
    const cl = lights.map(l => ({ p: l.p, c: K.col(l.c), r: l.r, k: l.k == null ? 1 : l.k }));
    for (let i = 0; i < mesh.count; i++) {
      const x = mesh.pos[i * 3], y = mesh.pos[i * 3 + 1], z = mesh.pos[i * 3 + 2];
      let ar = amb, ag = amb, ab = amb;
      for (const l of cl) {
        const d = Math.hypot(x - l.p[0], y - l.p[1], z - l.p[2]);
        if (d >= l.r) continue;
        const f = Math.pow(1 - d / l.r, 2) * l.k;
        ar += l.c[0] * f; ag += l.c[1] * f; ab += l.c[2] * f;
      }
      mesh.col[i * 4] *= ar; mesh.col[i * 4 + 1] *= ag; mesh.col[i * 4 + 2] *= ab;
    }
    return mesh;
  };
  // Street lamp post (along +y), head pointing toward +z
  function lampPost(mb, x, z, h, facing) {
    mb.push(); mb.translate(x, 0, z); mb.rotate(0, facing || 0, 0);
    mb.prism(0, 0, 0, 0.12, 0.08, h, 6, '#2a2c30', true);
    mb.box(0, h, 0.45, 0.12, 0.1, 0.9, '#2a2c30');
    mb.box(0, h - 0.08, 0.85, 0.4, 0.14, 0.3, '#3a3c40');
    mb.pop();
  }
  K.lampPost = lampPost;

  // ================================================================== Loveless Avenue alley (opening)
  // Alley along z (dead end at z=-14, opens onto the street at z=0); street along x (z 0..10).
  SET.street = () => once('street', () => {
    const mb = new MB(), tb = new MB(), nb = new MB(), gb = new MB();
    const r = K.rng('street');
    // ground: alley + sidewalks + road
    mb.floor(-1.8, -14, 1.8, 0, 0, '#3a3632');
    mb.floor(-40, 0, 40, 2, 0.12, '#4a4844');
    mb.floor(-40, 2, 40, 8, 0, '#2a2a2e');
    mb.floor(-40, 8, 40, 10, 0.12, '#4a4844');
    for (let x = -38; x < 40; x += 4) mb.floor(x, 4.9, x + 2, 5.1, 0.01, '#8a8460');
    mb.box(0, 0.06, 1.99, 80, 0.12, 0.04, '#5a5854');
    // corner buildings on both sides of the alley (weathered walls, lit by the scene)
    K.tbox(tb, -7, 0, -8, 10.4, 16, 12, '#ffffff', 0.125, 0.14);
    K.tbox(tb, 7.5, 0, -8, 11.4, 16, 9.5, '#e8e0d8', 0.125, 0.14);
    K.tbox(tb, -7, 12, -8, 8, 12, 2.5, '#d0c8c0', 0.125, 0.14);
    // alley dead-end wall
    tb.quad([-1.8, 0, -14], [1.8, 0, -14], [1.8, 9, -14], [-1.8, 9, -14], '#c8c0b8', [[0, 2], [0.8, 2], [0.8, 0], [0, 0]]);
    // pipes along the alley walls
    for (const [x, y] of [[-1.7, 3.2], [-1.65, 3.6], [1.7, 2.8], [1.7, 5.4]]) mb.sweep([[x, y, -14], [x, y, -0.3]], 0.08 + r() * 0.05, { sides: 6, color: '#4a4c50' });
    mb.sweep([[1.72, 0, -9], [1.72, 7, -9]], 0.1, { sides: 6, color: '#40443c' });
    // crates, barrels, junk in the alley
    for (const [x, z, s] of [[-1.2, -10, 0.8], [-1.3, -9.1, 0.6], [1.25, -12, 0.7], [-1.25, -3.5, 0.55]]) mb.box(x, s / 2, z, s, s, s, sh('#6a5236', r() * 0.2 - 0.1));
    for (const [x, z] of [[1.35, -6.5], [1.3, -7.2]]) mb.prism(x, 0, z, 0.3, 0.3, 0.9, 8, '#4a5a4a', true);
    // the green mako lamp on the right wall
    mb.box(1.72, 2.6, -5.2, 0.14, 0.5, 0.4, '#2a2c2e');
    gb.box(1.62, 2.6, -5.2, 0.06, 0.36, 0.28, '#b0ffd0');
    // far side of the street: row of buildings with lit windows (emissive)
    let x = -46;
    while (x < 46) {
      const w = 6 + r() * 8, h = 8 + r() * 12, d = 10;
      K.tbox(nb, x + w / 2, 0, 10.2 + d / 2, w, d, h, sh('#ffffff', -r() * 0.3), 0.18, 0.3, { u0: r() });
      if (r() < 0.6) { const nc = ['#ff4aa0', '#40e0ff', '#ffe040', '#ff7030'][Math.floor(r() * 4)]; gb.box(x + w * (0.3 + r() * 0.4), 3.2 + r() * 2, 10.1, 1.6 + r(), 0.5, 0.08, nc); }
      x += w + 0.2;
    }
    // the theatre next to the alley mouth: curved facade, shutter, marquee, rope barriers
    mb.push(); mb.translate(8.5, 0, -3.2);
    mb.loft([{ y: 0, rx: 6.2, rz: 5 }, { y: 7.5, rx: 6.2, rz: 5 }], { sides: 14, color: '#5a6068', arc: [0.25, Math.PI - 0.25] });
    for (let y = 1; y < 7.5; y += 1.6) mb.loft([{ y, rx: 6.35, rz: 5.12 }, { y: y + 0.25, rx: 6.35, rz: 5.12 }], { sides: 14, color: '#3a3e44', arc: [0.25, Math.PI - 0.25] });
    mb.loft([{ y: 7.5, rx: 6.9, rz: 5.7 }, { y: 8.6, rx: 6.9, rz: 5.7 }], { sides: 14, color: '#c8b070', arc: [0.2, Math.PI - 0.2] });
    mb.box(0, 2.4, 5.05, 4.2, 4.8, 0.3, '#6a6e74');
    mb.pop();
    const bulbs = [];
    for (let i = 0; i <= 16; i++) { const a = L(0.25, Math.PI - 0.25, i / 16); bulbs.push([8.5 + Math.cos(a) * 7.0, 8.05, -3.2 + Math.sin(a) * 5.8]); }
    for (let x = 2.6; x <= 12.2; x += 1.6) { mb.prism(x, 0.12, 0.7, 0.05, 0.04, 0.95, 6, '#b89840', true); mb.sphere(x, 1.1, 0.7, 0.07, 0.07, 0.07, '#d8b850', 6, 4); }
    for (let x = 2.6; x < 12.2; x += 1.6) { const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([x + t * 1.6, 0.95 - Math.sin(t * Math.PI) * 0.22, 0.7]); } mb.sweep(pts, 0.025, { sides: 4, color: '#a01820' }); }
    // Loveless billboard + bar sign on the far side
    mb.box(-6, 6.4, 10.05, 6, 3.4, 0.2, '#2a2230'); gb.box(-6, 6.4, 9.94, 5.6, 3.0, 0.04, '#e8d8f0');
    gb.box(-6.9, 6.4, 9.9, 2.4, 2.7, 0.04, '#a02040'); gb.box(-5.0, 6.9, 9.9, 1.6, 0.4, 0.04, '#302040');
    mb.box(7, 3.6, 10.05, 4.2, 0.9, 0.2, '#2a1a10');
    // near side (behind the camera for the street shot)
    K.tbox(tb, -27, 0, -8, 30, 16, 10, '#d8d0c8', 0.125, 0.14);
    K.tbox(tb, 28, 0, -8, 30, 16, 11, '#e0d8d0', 0.125, 0.14);
    // lamp posts
    const lamps = [];
    for (const lx of [-13, -4, 6, 15]) { lampPost(mb, lx, 1.0, 4.6, 0); lamps.push([lx, 4.45, 1.85]); }
    for (const lx of [-9, 2, 11]) { lampPost(mb, lx, 9.0, 4.6, Math.PI); lamps.push([lx, 4.45, 8.15]); }
    const lights = lamps.map(p => ({ p: [p[0], 1.5, p[2]], c: '#ffd8a0', r: 7, k: 1.2 })).concat([{ p: [1.3, 2.6, -5.2], c: '#50ff90', r: 4.2, k: 0.9 }]);
    const out = {
      mesh: K.bake(mb.build(), lights, 0.9),
      walls: K.bake(tb.build({ tex: TEX.old, texOpts: { repeat: true } }), lights, 0.9),
      facades: nb.build({ tex: TEX.night2, texOpts: { repeat: true }, unlit: true }),
      glow: gb.build({ unlit: true }),
      lamps, makoLamp: [1.55, 2.6, -5.2], bulbs,
      signs: [{ p: [-6, 5.9, 9.8], text: 'LOVELESS', h: 0.9, c: '#ffe8a0', font: 'Georgia, serif' }, { p: [7, 3.35, 9.8], text: 'GOBLINS BAR', h: 0.5, c: '#ffd070' }, { p: [8.5, 7.9, 2.9], text: 'LOVELESS  AVE. THEATER', h: 0.45, c: '#fff0c0', font: 'Georgia, serif' }],
    };
    return out;
  });
  K.drawStreet = function (S, st) {
    const GL = FF7.GL;
    GL.draw(st.mesh, null);
    GL.draw(st.walls, null);
    GL.draw(st.facades, null);
    GL.draw(st.glow, null);
    for (const p of st.lamps) { S.glow(p, 2.2, '#ffd8a0', 0.55); S.core(p, 0.5, '#fff4e0', 0.8); }
    for (let i = 0; i < st.bulbs.length; i++) S.core(st.bulbs[i], 0.28, '#fff0b0', 0.6 + 0.3 * Math.sin((S.f || 0) * 0.2 + i));
    for (let i = 0; i < 12; i++) S.core([4.95 + i * 0.35, 3.1, 9.85], 0.2, '#ffe080', (i + ((S.f || 0) >> 3)) % 3 ? 0.9 : 0.3);
    S.glow([-6, 6.4, 9.6], 7, '#ffe0f0', 0.18);
    const fl = 0.8 + Math.sin((S.f || 0) * 0.3) * 0.1 + Math.sin((S.f || 0) * 0.83) * 0.08;
    S.glow(st.makoLamp, 2.6, '#40ff90', 0.6 * fl);
    S.core(st.makoLamp, 0.5, '#d0ffe0', 0.8);
  };
  // Flower basket (Aeris)
  SET.basket = () => once('basket', () => K.meshOf(mb => {
    mb.prism(0, -0.13, 0, 0.1, 0.13, 0.13, 10, '#8a5a2a', true, false, true);
    mb.sweep([[-0.12, 0, 0], [-0.08, 0.1, 0], [0, 0.14, 0], [0.08, 0.1, 0], [0.12, 0, 0]], 0.01, { sides: 4, color: '#7a4a20' });
    const r = K.rng('basket');
    for (let i = 0; i < 14; i++) { const a = r() * TAU, rr = r() * 0.1; mb.sphere(Math.cos(a) * rr, 0.005, Math.sin(a) * rr, 0.024, 0.02, 0.024, ['#f0e040', '#f8f8f0', '#f0a0c0', '#f0e040'][i % 4], 5, 3, false); }
  }));
  // Simple car (length along z), headlights at +z
  SET.car = (c) => once('car' + c, () => K.meshOf(mb => {
    mb.rbox(0, 0.62, 0, 1.8, 0.62, 4.3, c, 0.3);
    mb.rbox(0, 1.12, -0.3, 1.6, 0.5, 2.2, sh(c, -0.1), 0.35);
    mb.box(0, 1.12, 0.82, 1.5, 0.38, 0.05, '#1a2028'); mb.box(0, 1.12, -1.42, 1.5, 0.38, 0.05, '#1a2028');
    for (const [x, z] of [[0.82, 1.35], [-0.82, 1.35], [0.82, -1.35], [-0.82, -1.35]]) { mb.push(); mb.translate(x, 0.34, z); mb.rotate(0, 0, Math.PI / 2); mb.prism(0, -0.12, 0, 0.34, 0.34, 0.24, 10, '#141414'); mb.pop(); }
  }));

  // ================================================================== human-scale Mako Reactor (1 and 5)
  SET.reactorH = () => once('reactorH', () => {
    const mb = new MB();
    const dk = '#343840', mid = '#4a4f58', lt = '#5c626c';
    mb.prism(0, 0, 0, 36, 34, 9, 16, dk, true);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; mb.push(); mb.translate(Math.cos(a) * 27, 9, Math.sin(a) * 27); mb.rotate(0, -a, 0); mb.frustum(0, 0, 0, 5, 8, 2, 4, 18, dk); mb.pop(); }
    mb.prism(0, 9, 0, 24, 22, 32, 18, mid, true);
    for (let y = 14; y < 40; y += 6) mb.prism(0, y, 0, 24.6 - (y - 9) * 0.07, 24.6 - (y - 9) * 0.07, 1.2, 18, dk, true);
    mb.sphere(0, 41, 0, 22, 11, 22, lt, 18, 8, true, null, 4);
    mb.box(0, 52, 0, 12, 12, 16, mid);
    mb.box(0, 60, -3, 6, 5, 6, dk);
    for (const x of [-10, 10]) { mb.prism(x, 30, 16, 5, 4, 90, 10, dk, true); mb.prism(x, 118, 16, 4.4, 4.4, 2, 10, '#222428', true); }
    // big pipes curling round the body
    for (let j = 0; j < 3; j++) {
      const pts = []; const y0 = 12 + j * 8, a0 = j * 1.3;
      for (let i = 0; i <= 12; i++) { const a = a0 + i / 12 * 2.2; pts.push([Math.cos(a) * 26.5, y0 + i * 0.6, Math.sin(a) * 26.5]); }
      mb.sweep(pts, 1.6, { sides: 8, color: '#3e434a' });
    }
    const m = mb.build();
    const glows = [];
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; glows.push([Math.cos(a) * 22.5, 38, Math.sin(a) * 22.5]); }
    return { mesh: m, glows, core: [0, 44, 0], stacks: [[-10, 121, 16], [10, 121, 16]] };
  });
  K.drawReactorH = function (S, R, pos, s = 1, mako = 1) {
    K.put(R.mesh, pos, [0, 0, 0], s);
    const t = (S.f || 0) * 0.06;
    const tr = (p) => [pos[0] + p[0] * s, pos[1] + p[1] * s, pos[2] + p[2] * s];
    R.glows.forEach((g, i) => S.glow(tr(g), 12 * s, '#40ff90', (0.35 + Math.sin(t + i) * 0.08) * mako));
    S.glow(tr(R.core), 60 * s, '#30ff80', 0.18 * mako);
    for (const p of R.stacks) S.glow(tr(p), 6 * s, '#ff3020', 0.6 + Math.sin(t * 3) * 0.3);
  };

  // ================================================================== train (vehicles3d 'train' when available)
  function carMesh(loco) {
    const wb = new MB();
    const body = loco ? '#26282c' : '#4e5660', stripe = '#b08a3a', L2 = 8;
    const mb2 = new MB();
    mb2.push(); mb2.translate(0, 2.7, 0); mb2.rotate(Math.PI / 2, 0, 0);
    mb2.loft([{ y: -L2, rx: 1.5, rz: 1.75, sq: 4 }, { y: L2 - (loco ? 2.4 : 0.01), rx: 1.5, rz: 1.75, sq: 4 }], { sides: 12, color: body });
    if (loco) mb2.loft([{ y: L2 - 2.4, rx: 1.5, rz: 1.75, sq: 4 }, { y: L2 - 0.6, rx: 1.35, rz: 1.35, sq: 3 }, { y: L2, rx: 0.9, rz: 0.9, sq: 2.5 }], { sides: 12, color: body, capBottom: false });
    mb2.pop();
    if (loco) {
      // boiler-like nose, big red-rimmed drive wheels, lamp
      mb2.push(); mb2.translate(0, 2.1, L2 - 3); mb2.rotate(Math.PI / 2, 0, 0); mb2.prism(0, 0, 0, 1.25, 1.25, 4.2, 14, '#1c1e22', true); mb2.pop();
      for (const x of [-1.25, 1.25]) for (const z of [L2 - 5.5, L2 - 3.3]) { mb2.push(); mb2.translate(x, 1.0, z); mb2.rotate(0, 0, Math.PI / 2); mb2.prism(0, -0.12, 0, 1.0, 1.0, 0.24, 16, '#8a1a14', true); mb2.prism(0, -0.14, 0, 0.8, 0.8, 0.28, 16, '#141416', true); mb2.pop(); }
      for (const x of [-1.42, 1.42]) mb2.box(x, 1.0, L2 - 4.4, 0.08, 0.14, 2.6, '#9a9aa0');
      mb2.prism(0, 3.3, L2 - 1.6, 0.35, 0.3, 1.0, 8, '#1c1e22', true);
    }
    mb2.box(0, 0.75, 0, 2.6, 0.5, L2 * 2 - 1, '#222428');
    for (const z of [-L2 + 2.5, L2 - 2.5]) for (const x of [-1.0, 1.0]) for (const dz of [-0.9, 0.9]) { mb2.push(); mb2.translate(x, 0.5, z + dz); mb2.rotate(0, 0, Math.PI / 2); mb2.prism(0, -0.1, 0, 0.45, 0.45, 0.2, 10, '#18181a'); mb2.pop(); }
    for (const x of [-1.52, 1.52]) mb2.box(x, 1.55, 0, 0.04, 0.22, L2 * 2 - 0.4, stripe);
    // windows (emissive)
    for (const x of [-1.54, 1.54]) for (let z = -L2 + 1.2; z < L2 - (loco ? 3 : 1); z += 1.5) wb.box(x, 2.85, z + 0.55, 0.04, 0.8, 1.0, '#ffe6b0');
    if (loco) { wb.box(0, 3.0, L2 - 1.1, 1.8, 0.7, 0.05, '#b0c8e0'); }
    return { body: mb2.build(), win: wb.build({ unlit: true }), len: L2 * 2 };
  }
  SET.trainParts = () => once('trainParts', () => ({ loco: carMesh(true), car: carMesh(false) }));
  // Train running along +x (front at `x`), `n` cars; opts.night lights windows
  class Train {
    constructor(n) {
      this.n = n || 4; this.x = 0; this.z = 0; this.y = 0; this.rotY = Math.PI / 2; this.night = true; this.lightsOn = 1;
      this.real = null;
      const V3D = FF7.vehicles3d;
      if (V3D && V3D.has && V3D.has('train')) {
        try {
          const m = V3D.build('train', { style: 'field', cars: Math.max(0, Math.min(4, this.n - 1)) });
          const box = K.modelBox(m);
          const s = 3.0 / Math.max(0.01, box.size[0]);
          this.real = { w: new K.Wrap(m, s, [-(box.min[0] + box.max[0]) / 2, -box.min[1], -box.max[2]]), len: box.size[2] * s };
          this.real.single = false;
          m.play('move');
        } catch (e) { this.real = null; }
      }
      this.parts = SET.trainParts();
    }
    front() { return [this.x, this.y, this.z]; }
    dir() { return [Math.sin(this.rotY), 0, Math.cos(this.rotY)]; }
    draw(S) {
      const P = this.parts, d = this.dir();
      const at = (off) => [this.x - d[0] * off, this.y, this.z - d[2] * off];
      if (this.real) {
        const w = this.real.w, count = this.real.single ? this.n : 1;
        for (let i = 0; i < count; i++) { w.position = at(i * (this.real.len + 0.6)); w.rotY = this.rotY; w.draw(); }
      } else {
        let off = 0;
        for (let i = 0; i < this.n; i++) {
          const c = i === 0 ? P.loco : P.car;
          const p = at(off + c.len / 2);
          off += c.len + 0.8;
          K.put(c.body, p, [0, this.rotY, 0]);
          K.put(c.win, p, [0, this.rotY, 0], 1, this.night ? { unlit: true, tint: [this.lightsOn, this.lightsOn, this.lightsOn, 1] } : { unlit: false, tint: [0.25, 0.3, 0.35, 1] });
        }
      }
      const hp = V.add(at(-0.2), [0, 2.2, 0]);
      if (this.night) { S.glow(hp, 3.5, '#fff0c0', 0.8 * this.lightsOn); S.flare(hp, 5, '#fff8e0', 0.5 * this.lightsOn); }
    }
    tail() { const P = this.parts; return this.x - (this.real ? this.real.len : P.loco.len + (this.n - 1) * (P.car.len + 0.8)); }
  }
  K.Train = Train;

  // ================================================================== station (Sector 1 / Sector 7): tracks along x
  SET.station = (kind) => once('station' + kind, () => {
    const mb = new MB(), gb = new MB(), tb = new MB();
    const r = K.rng('station' + kind);
    const slum = kind === 'slum';
    // ballast + sleepers + rails
    mb.box(0, 0.05, 0, 600, 0.1, 4.2, slum ? '#3a3228' : '#34322e');
    for (let x = -300; x < 300; x += 0.9) mb.box(x, 0.14, 0, 0.3, 0.08, 2.6, '#3a2c20');
    for (const z of [-0.72, 0.72]) mb.box(0, 0.24, z, 600, 0.12, 0.1, '#8a8a90');
    // second track
    mb.box(0, 0.05, -5.5, 600, 0.1, 4.2, '#302e2a');
    for (const z of [-6.22, -4.78]) mb.box(0, 0.24, z, 600, 0.12, 0.1, '#6a6a70');
    // platform
    mb.box(0, 0.55, 5.0, 90, 1.1, 5.6, slum ? '#6a6258' : '#7a7a7e');
    mb.box(0, 1.11, 2.35, 90, 0.02, 0.3, '#c8a830');
    // canopy
    const lamps = [];
    for (let x = -40; x <= 40; x += 8) { mb.box(x, 2.9, 6.8, 0.35, 3.6, 0.35, '#3a3e44'); lamps.push([x + 4, 4.3, 5.0]); }
    mb.box(0, 4.85, 5.0, 88, 0.3, 6.6, '#4a4e56');
    mb.frustum(0, 5.0, 5.0, 88, 6.6, 88, 3.0, 0.6, '#3e424a');
    for (const p of lamps) { mb.box(p[0], 4.55, p[2], 1.4, 0.12, 0.3, '#2a2c30'); gb.box(p[0], 4.48, p[2], 1.2, 0.04, 0.2, '#fff4d0'); }
    // back wall with posters
    K.tbox(tb, 0, 1.1, 8.1, 90, 0.4, 3.8, '#ffffff', 0.25, 0.3);
    for (let x = -36; x < 40; x += 9 + r() * 4) gb.box(x, 2.6, 7.88, 1.6, 1.1, 0.04, ['#c04040', '#4070c0', '#d0b040', '#40a070'][Math.floor(r() * 4)]);
    // across the tracks: fence + industrial clutter
    for (let x = -120; x < 120; x += 3) mb.box(x, 1.0, -9, 0.08, 2.0, 0.08, '#4a4c50');
    mb.box(0, 1.8, -9, 240, 0.06, 0.06, '#4a4c50'); mb.box(0, 1.0, -9, 240, 0.06, 0.06, '#4a4c50');
    if (slum) {
      for (let i = 0; i < 70; i++) {
        const x = (r() - 0.5) * 220, z = -14 - r() * 60, w = 3 + r() * 5, d = 3 + r() * 5, h = 2.5 + r() * 4;
        mb.push(); mb.translate(x, 0, z); mb.rotate(0, (r() - 0.5) * 0.6, 0);
        mb.frustum(0, 0, 0, w, d, w, d, h, sh(['#6a5a48', '#5a5048', '#7a6a50', '#5a4a3a'][i % 4], (r() - 0.5) * 0.2));
        mb.frustum(0, h, 0, w + 0.6, d + 0.6, w + 0.6, 0.3, 1.1, sh('#6a6a70', (r() - 0.5) * 0.3));
        if (r() < 0.5) gb.box(w / 2 + 0.01, h * 0.5, 0, 0.04, 0.6, 0.8, '#ffc070');
        mb.pop();
        if (r() < 0.3) lamps.push([x, h + 1.5, z + d / 2 + 0.5]);
      }
      for (let i = 0; i < 30; i++) { const x = (r() - 0.5) * 200, z = 12 + r() * 40; mb.sphere(x, 0, z, 3 + r() * 4, 1.5 + r() * 2, 3 + r() * 4, sh('#4a4038', (r() - 0.5) * 0.3), 7, 4, false, null, 3); }
    } else {
      for (let i = 0; i < 30; i++) {
        const x = (r() - 0.5) * 240, z = -14 - r() * 30, w = 4 + r() * 8, h = (x < 10 ? 3 : 5) + r() * (x < 10 ? 5 : 12);
        K.tbox(tb, x, 0, z, w, 4 + r() * 6, h, sh('#ffffff', -r() * 0.3), 0.2, 0.3, { u0: r() });
      }
      for (let i = 0; i < 12; i++) mb.sweep([[-150, 3 + i * 0.4, -11 - i * 0.6], [150, 3 + i * 0.4, -11 - i * 0.6]], 0.2 + r() * 0.3, { sides: 6, color: '#40444a' });
    }
    // station sign
    mb.box(-12, 3.2, 3.2, 3.2, 0.9, 0.12, '#1a2a5a'); gb.box(-12, 3.2, 3.13, 2.8, 0.6, 0.02, '#e0e8ff');
    const lights = lamps.map(p => ({ p: [p[0], 2.5, p[2]], c: '#ffe0b0', r: 9, k: 0.9 }));
    return {
      mesh: K.bake(mb.build(), lights, 0.85),
      tex: K.bake(tb.build({ tex: slum ? TEX.old : TEX.night, texOpts: { repeat: true }, unlit: !slum }), lights, 0.9),
      glow: gb.build({ unlit: true }), lamps,
    };
  });
  K.drawStation = function (S, st) {
    const GL = FF7.GL;
    GL.draw(st.mesh, null); GL.draw(st.tex, null); GL.draw(st.glow, null);
    for (const p of st.lamps) S.glow(p, 3.2, '#ffe8c0', 0.35);
  };

  // ================================================================== slums under the plate (Sector 7) + pillar
  SET.slums = () => once('slums', () => {
    const mb = new MB(), gb = new MB();
    const r = K.rng('slums');
    K.terrain(mb, -260, -260, 260, 260, 26, 26, (x, z) => Math.sin(x * 0.05) * 0.6 + Math.cos(z * 0.07) * 0.5 - 0.6, (x, z) => sh('#4a4036', (U.hash(Math.round(x), Math.round(z), 3) - 0.5) * 0.2));
    const lights = [];
    for (let i = 0; i < 260; i++) {
      const a = r() * TAU, rr = 18 + Math.sqrt(r()) * 200;
      const x = Math.sin(a) * rr, z = -60 + Math.cos(a) * rr;
      if (Math.abs(z) < 7) continue;                    // keep the rail corridor clear
      const w = 3 + r() * 6, d = 3 + r() * 6, h = 2.5 + r() * 5;
      mb.push(); mb.translate(x, 0, z); mb.rotate(0, r() * TAU, 0);
      mb.frustum(0, -0.5, 0, w, d, w, d, h + 0.5, sh(['#6a5a48', '#5a5048', '#7a6a50', '#5a4a3a', '#6a6a6a'][i % 5], (r() - 0.5) * 0.25));
      mb.frustum(0, h, 0, w + 0.8, d + 0.8, w + 0.8, 0.4, 1.2, sh(['#7a4a30', '#6a6a70', '#8a5a3a'][i % 3], (r() - 0.5) * 0.3));
      if (r() < 0.5) gb.box(w / 2 + 0.02, h * 0.5, 0, 0.04, 0.7, 0.9, r() < 0.8 ? '#ffc070' : '#a0e0ff');
      mb.pop();
      if (r() < 0.25) lights.push([x, h + 2, z]);
    }
    for (let i = 0; i < 60; i++) { const x = (r() - 0.5) * 400, z = -60 + (r() - 0.5) * 400; if (Math.abs(z) < 8) continue; mb.sphere(x, -0.5, z, 3 + r() * 6, 2 + r() * 4, 3 + r() * 6, sh('#4a4238', (r() - 0.5) * 0.3), 7, 4, false, null, 3); }
    // elevated rail through the slums (y = 7) along x at z = 0
    mb.box(0, 7, 0, 520, 0.8, 5, '#3a3c40');
    for (let x = -250; x <= 250; x += 14) mb.box(x, 3.3, 0, 1.2, 6.6, 1.2, '#34363a');
    for (const z of [-0.72, 0.72]) mb.box(0, 7.5, z, 520, 0.12, 0.1, '#8a8a90');
    for (let x = -250; x < 250; x += 1) mb.box(x, 7.42, 0, 0.3, 0.06, 2.6, '#3a2c20');
    const pillar = [0, 0, -60];
    return { mesh: K.bake(mb.build(), lights.map(p => ({ p, c: '#ffc080', r: 14, k: 0.8 })), 0.8), glow: gb.build({ unlit: true }), lights, pillar };
  });
  // The great support pillar (Sector 7): base at y=0, meets the plate at y=PH
  SET.pillar = () => once('pillar', () => K.meshOf(mb => {
    const H = 60;
    mb.prism(0, 0, 0, 14, 12, 4, 12, '#3a3c42', true);
    mb.prism(0, 4, 0, 9, 8.5, H - 12, 12, '#4a4e56', true);
    for (let y = 8; y < H - 10; y += 7) mb.prism(0, y, 0, 9.4, 9.4, 0.8, 12, '#34363c', true);
    mb.prism(0, H - 8, 0, 8.5, 16, 8, 12, '#3e424a', true);
    // spiral stairway
    const pts = [];
    for (let i = 0; i <= 120; i++) { const a = i / 120 * TAU * 4.5; pts.push([Math.cos(a) * 11, 2 + i / 120 * (H - 14), Math.sin(a) * 11]); }
    mb.sweep(pts, [1.0, 0.25], { sides: 4, color: '#5a5048' });
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU * 4.5; mb.box(Math.cos(a) * 11.2, 2 + i / 40 * (H - 14) + 0.8, Math.sin(a) * 11.2, 0.12, 1.6, 0.12, '#3a3a3a'); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; mb.push(); mb.translate(Math.cos(a) * 10, H - 14, Math.sin(a) * 10); mb.rotate(0, -a, -0.6); mb.box(0, 3, 0, 1.2, 8, 1.2, '#34363c'); mb.pop(); }
  }));
  // Plate underside (slab with girders and lights), centre at origin, size S
  SET.plateUnder = () => once('plateUnder', () => {
    const mb = new MB(), lights = [];
    const R = 260;
    mb.box(0, 3, 0, R * 2, 6, R * 2, '#26282c');
    for (let x = -R; x <= R; x += 26) mb.box(x, -1.4, 0, 2.2, 2.8, R * 2, '#1e2024');
    for (let z = -R; z <= R; z += 26) mb.box(0, -1.2, z, R * 2, 2.4, 1.8, '#202226');
    for (let x = -R + 13; x < R; x += 26) for (let z = -R + 13; z < R; z += 26) if (U.hash(x, z, 7) < 0.55) lights.push([x, -0.4, z]);
    return { mesh: mb.build(), lights };
  });

  // ================================================================== Shinra HQ (human scale) + elevated expressway
  SET.hq = () => once('hq', () => {
    const tb = new MB(), mb = new MB(), gb = new MB();
    // tower: 64 x 46 m footprint, 250 m tall, stepped
    K.tbox(tb, 0, 0, 0, 80, 60, 24, '#ffffff', 0.09, 0.26);
    K.tbox(tb, 0, 24, -4, 64, 46, 150, '#ffffff', 0.09, 0.26);
    K.tbox(tb, 0, 174, -4, 54, 40, 60, '#e0e0e8', 0.09, 0.26);
    K.tbox(tb, 0, 234, -4, 40, 30, 18, '#d0d0d8', 0.09, 0.26);
    mb.frustum(0, 252, -4, 40, 30, 16, 12, 12, '#3a3e46');
    mb.prism(0, 264, -4, 0.8, 0.2, 30, 6, '#8a8a8a');
    // showroom: bright glass band at 10-16 m on the front face
    gb.box(0, 13, 30.05, 70, 6, 0.2, '#e8f0ff');
    for (let x = -34; x <= 34; x += 4) mb.box(x, 13, 30.2, 0.35, 6.2, 0.35, '#5a5e66');
    mb.box(0, 16.3, 30.3, 72, 0.5, 0.8, '#5a5e66'); mb.box(0, 9.8, 30.3, 72, 0.5, 0.8, '#5a5e66');
    // plaza
    mb.floor(-120, -40, 120, 120, 0, '#4a4c52');
    for (let i = -3; i <= 3; i++) K.lampPost(mb, i * 16, 50, 6, 0);
    const lamps = []; for (let i = -3; i <= 3; i++) lamps.push([i * 16, 5.85, 50.85]);
    // neighbouring buildings
    const r = K.rng('hq');
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1, x = side * (70 + r() * 160), z = -120 + r() * 220, w = 20 + r() * 30, h = 30 + r() * 90;
      K.tbox(tb, x, 0, z, w, 20 + r() * 25, h, sh('#ffffff', -r() * 0.4), 0.09, 0.26, { u0: r() });
    }
    return { tower: tb.build({ tex: TEX.night, texOpts: { repeat: true }, unlit: true }), mesh: K.bake(mb.build(), lamps.map(p => ({ p: [p[0], 1, p[2]], c: '#ffe0b0', r: 12, k: 0.8 })), 0.9), glow: gb.build({ unlit: true }), lamps, top: [0, 294, -4] };
  });
  // Expressway deck along x at height Y (z centre Z), from x0 to x1
  SET.highway = (broken) => once('highway' + (broken ? 'b' : ''), () => {
    const mb = new MB(), lamps = [];
    const Y = 14, x0 = broken ? -600 : -900, x1 = broken ? 0 : 900;
    mb.box((x0 + x1) / 2, Y - 0.6, 0, x1 - x0, 1.2, 18, '#4a4c50');
    mb.box((x0 + x1) / 2, Y + 0.02, 0, x1 - x0, 0.04, 16, '#2c2c30');
    for (const z of [-8.6, 8.6]) mb.box((x0 + x1) / 2, Y + 0.5, z, x1 - x0, 1.0, 0.5, '#5a5c60');
    for (let x = x0; x < x1; x += 12) { mb.box(x + 3, Y + 0.05, -2.7, 6, 0.02, 0.18, '#d8d8d0'); mb.box(x + 3, Y + 0.05, 2.7, 6, 0.02, 0.18, '#d8d8d0'); }
    for (let x = x0 + 20; x < x1 - 5; x += 40) { mb.box(x, Y / 2 - 0.6, 0, 3, Y - 1.2, 4, '#3e4044'); }
    mb.push(); mb.translate(0, Y, 0);
    for (let x = x0 + 10; x < x1; x += 30) { K.lampPost(mb, x, 8.6, 6, Math.PI); lamps.push([x, Y + 5.85, 7.75]); }
    mb.pop();
    const m = mb.build();
    if (broken) {
      // jagged broken end + dangling rebar
      const eb = new MB(), r = K.rng('break');
      for (let i = 0; i < 9; i++) { const z = -8 + i * 2; eb.push(); eb.translate(x1 + r() * 2, Y - 0.6, z); eb.rotate(0, 0, (r() - 0.5) * 0.4); eb.box(0, 0, 0, 1.5 + r() * 2.5, 1.2, 2.1, '#4a4c50'); eb.pop(); }
      for (let i = 0; i < 12; i++) { const z = -8 + r() * 16; eb.sweep([[x1, Y - 0.6, z], [x1 + 1.5 + r(), Y - 1.8 - r() * 2, z + (r() - 0.5)]], 0.05, { sides: 4, color: '#6a4a3a' }); }
      return { mesh: m, end: eb.build(), lamps, Y };
    }
    // city blocks lining the expressway (emissive windows)
    const cb = new MB(), r = K.rng('hwcity');
    for (const side of [-1, 1]) for (let x = x0; x < x1;) {
      const w = 14 + r() * 26, d = 14 + r() * 20, h = 18 + r() * 70;
      if (!(Math.abs(x) < 110 && side < 0)) K.tbox(cb, x + w / 2, 0, side * (22 + d / 2 + r() * 20), w, d, h, U.shade('#ffffff', -r() * 0.35), 0.09, 0.26, { u0: r() });
      x += w + 4 + r() * 10;
    }
    return { mesh: m, lamps, Y, city: cb.build({ tex: TEX.night, texOpts: { repeat: true }, unlit: true }) };
  });

  // ================================================================== fountain plaza (seen from above in the opening)
  SET.plaza = () => once('plaza', () => {
    const mb = new MB(), tb = new MB(), gb = new MB(), r = K.rng('plaza');
    for (let x = -20; x < 20; x += 2) for (let z = -20; z < 20; z += 2) mb.floor(x, z, x + 2, z + 2, 0, ((x + z) / 2) % 2 ? '#3a3a3e' : '#5a5a5e');
    mb.prism(0, 0, 0, 5, 5, 0.8, 16, '#8a8a80', true); gb.prism(0, 0.5, 0, 4.5, 4.5, 0.32, 16, '#40c0d0');
    mb.prism(0, 0.8, 0, 0.6, 0.4, 2.6, 8, '#8a8a80', true); mb.prism(0, 3.4, 0, 1.6, 1.2, 0.3, 10, '#8a8a80', true);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; K.tbox(tb, Math.cos(a) * 30, 0, Math.sin(a) * 30, i % 2 ? 64 : 22, i % 2 ? 22 : 64, 14 + r() * 8, '#ffffff', 0.18, 0.3, { u0: r() }); }
    for (const [x, z] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) K.lampPost(mb, x, z, 4.5, 0);
    return { mesh: mb.build(), tex: tb.build({ tex: TEX.night2, texOpts: { repeat: true }, unlit: true }), glow: gb.build({ unlit: true }), lamps: [[-12, 4.35, -11.15], [12, 4.35, -11.15], [-12, 4.35, 12.85], [12, 4.35, 12.85]] };
  });
  // Glowing text anchored to a 3D point (neon signs, posters) — drawn in the 2D overlay pass
  K.sign = function (c, p, text, worldH, color, o = {}) {
    const q = FF7.GL.project(p);
    if (!q.visible || q.depth < 0.2) return;
    const px = worldH * FF7.H / (2 * q.depth * Math.tan((K.CAM.fov || 45) * Math.PI / 360));
    if (px < 4 || px > 400) return;
    c.save();
    c.globalAlpha *= o.alpha != null ? o.alpha : 1;
    c.font = `${o.weight || '700'} ${Math.round(px)}px ${o.font || '"Arial Black", Arial, sans-serif'}`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = color; c.shadowBlur = px * 0.6;
    c.fillStyle = color; c.fillText(text, q.x, q.y);
    c.shadowBlur = 0; c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillText(text, q.x, q.y);
    c.restore();
  };
  K.streetSigns = function (c, st, a) { for (const s of st.signs) K.sign(c, s.p, s.text, s.h, s.c, { font: s.font, alpha: a }); };

  // ================================================================== Lifestream (procedural glowing streams)
  // Tunnel flythrough along -z: call each frame with the camera z; streams wrap around.
  K.lifestreamTunnel = function (S, cz, o = {}) {
    const t = (S.f || 0) / 60 * (o.speed || 1);
    const n = o.n || 22, len = o.len || 110, seg = 26;
    const r = K.rng('ls');
    const cA = K.col(o.c1 || '#30ff90'), cB = K.col(o.c2 || '#a0fff0');
    for (let i = 0; i < n; i++) {
      const rad = 2.5 + r() * 8, ph = r() * TAU, tw = (r() - 0.5) * 0.08, sp = 0.6 + r() * 0.8, w = 0.5 + r() * 1.6;
      const mixc = r(), bright = 0.35 + r() * 0.4;
      const pts = [], ws = [], cs = [];
      for (let j = 0; j <= seg; j++) {
        const u = j / seg;
        const z = cz + 6 - u * len;
        const a = ph + z * tw + t * sp * 0.6 + Math.sin(z * 0.05 + i) * 0.4;
        const rr = rad + Math.sin(z * 0.08 + i * 1.7 + t) * 1.2;
        pts.push([Math.cos(a) * rr + (o.cx || 0), Math.sin(a) * rr + (o.cy || 0), z]);
        ws.push(w * (0.6 + 0.4 * Math.sin(u * 9 + i + t * 2)));
        const fade = Math.min(1, u * 6) * (1 - u);
        const c = K.mixc(cA, cB, mixc * (0.5 + 0.5 * Math.sin(u * 6 + t + i)));
        cs.push([c[0], c[1], c[2], bright * fade * (o.alpha != null ? o.alpha : 1)]);
      }
      S.ribbon(pts, ws, cs);
    }
    // drifting motes
    const m = o.motes != null ? o.motes : 90;
    for (let i = 0; i < m; i++) {
      const z0 = (U.hash(i, 1, 5) * len + t * 18 * (0.5 + U.hash(i, 2, 5))) % len;
      const z = cz + 6 - (len - z0);
      const a = U.hash(i, 3, 5) * TAU + t * 0.3, rr = 1.5 + U.hash(i, 4, 5) * 9;
      const p = [Math.cos(a) * rr + (o.cx || 0), Math.sin(a) * rr + (o.cy || 0), z];
      S.core(p, 0.18 + U.hash(i, 6, 5) * 0.3, '#e0fff0', 0.8 * Math.min(1, (cz + 6 - z) / 20) * (o.alpha != null ? o.alpha : 1));
    }
    // volumetric haze
    for (let i = 0; i < 10; i++) { const z = cz - 10 - i * 10; S.haze([Math.sin(i * 2.1) * 4 + (o.cx || 0), Math.cos(i * 1.3) * 3 + (o.cy || 0), z], 22, '#20c070', 0.12 * (o.alpha != null ? o.alpha : 1), i); }
  };
  // Rising streams: from base points on the ground up to `top`, swirling (ending / eruptions)
  K.lifestreamRise = function (S, bases, top, o = {}) {
    const t = (S.f || 0) / 60;
    const seg = 24, amt = o.amount != null ? o.amount : 1;
    const cA = K.col(o.c1 || '#30ff90'), cB = K.col(o.c2 || '#c0fff0');
    bases.forEach((b, i) => {
      const pts = [], ws = [], cs = [];
      const sw = o.swirl != null ? o.swirl : 1;
      for (let j = 0; j <= seg; j++) {
        const u = j / seg;
        if (u > amt) break;
        const q = K.LV(b, top, u);
        const bulge = Math.sin(u * Math.PI) * (o.bulge || 0.25);
        const a = u * 5 * sw + t * 1.2 + i;
        const R = V.len(V.sub(top, b)) * bulge * 0.3;
        q[0] += Math.cos(a) * R; q[2] += Math.sin(a) * R;
        q[1] += Math.sin(u * Math.PI) * (o.arc || 0);
        pts.push(q);
        ws.push((o.width || 3) * (0.5 + 0.5 * Math.sin(u * 8 - t * 3 + i)) * (1 - u * 0.5));
        const c = K.mixc(cA, cB, 0.5 + 0.5 * Math.sin(u * 5 + t * 2 + i));
        cs.push([c[0], c[1], c[2], (o.alpha || 0.5) * Math.min(1, u * 8) * Math.min(1, (amt - u) * 8 + 0.2)]);
      }
      if (pts.length > 1) S.ribbon(pts, ws, cs);
    });
  };
})();

// ----------------------------------------------------------------------------- vehicles (fallbacks) + effect helpers
(function () {
  const U = FF7.util, MB = FF7.MeshBuilder, V = FF7.V3;
  const K = FF7.cinema.K, TAU = K.TAU, L = K.L, SET = K.SET, once = K.once;
  const sh = U.shade;

  // All fallback vehicles are in metres, facing +z, resting on y = 0.
  const FB = K.VEH_FB = {};
  const wheel = (mb, x, y, z, r, w, c) => { mb.push(); mb.translate(x, y, z); mb.rotate(0, 0, Math.PI / 2); mb.prism(0, -w / 2, 0, r, r, w, 12, c || '#141414', true); mb.pop(); };
  FB.motorcycle = (mb) => {
    wheel(mb, 0, 0.34, 0.72, 0.34, 0.18); wheel(mb, 0, 0.34, -0.72, 0.36, 0.22);
    mb.rbox(0, 0.62, 0, 0.36, 0.34, 1.2, '#2a2c34', 0.3);
    mb.rbox(0, 0.78, 0.25, 0.42, 0.3, 0.6, '#9a1a1a', 0.35);      // tank
    mb.rbox(0, 0.8, -0.35, 0.3, 0.12, 0.6, '#18181c', 0.3);        // seat
    mb.sweep([[0, 0.34, 0.72], [0, 0.95, 0.52]], 0.035, { sides: 5, color: '#a0a0a8' });
    mb.box(0, 1.0, 0.5, 0.7, 0.04, 0.04, '#a0a0a8');
    mb.rbox(0, 0.95, 0.66, 0.24, 0.2, 0.12, '#9a1a1a', 0.3);
    mb.sweep([[0.12, 0.4, -0.2], [0.14, 0.42, -0.9]], 0.05, { sides: 6, color: '#b0b0b8' });
  };
  FB.truck = (mb) => {
    for (const z of [2.2, -1.2, -2.4]) for (const x of [-1.05, 1.05]) wheel(mb, x, 0.5, z, 0.5, 0.35);
    mb.box(0, 0.75, 0, 2.2, 0.3, 6.6, '#222428');
    mb.rbox(0, 1.75, 2.3, 2.3, 1.9, 1.9, '#d8d0b0', 0.15);
    mb.box(0, 2.1, 3.24, 2.0, 0.8, 0.05, '#1a2028');
    mb.box(0, 2.1, -1.3, 2.4, 2.6, 4.6, '#6a6a60');
  };
  // helicopter is lofted along y: wrap it so the nose points +z
  const heli = (mb) => {
    mb.push(); mb.translate(0, 1.8, 0); mb.rotate(Math.PI / 2, 0, 0);
    mb.loft([{ y: -2.6, rx: 0.8, rz: 0.8 }, { y: -1.2, rx: 1.35, rz: 1.25 }, { y: 1.4, rx: 1.3, rz: 1.2 }, { y: 2.8, rx: 0.5, rz: 0.55 }], { sides: 10, color: '#2a3244' });
    mb.pop();
    mb.box(0, 2.1, 2.1, 1.7, 0.9, 1.2, '#8ab0d0');
    mb.push(); mb.translate(0, 2.1, -2.2); mb.rotate(-Math.PI / 2, 0, 0); mb.prism(0, 0, 0, 0.35, 0.18, 6.5, 6, '#2a3244', true); mb.pop();
    mb.box(0, 2.9, -8.2, 0.12, 1.6, 1.0, '#2a3244');
    mb.box(0, 3.25, 0, 0.3, 0.5, 0.3, '#1a1a1e');
    for (const x of [-0.9, 0.9]) { mb.box(x, 0.12, 0, 0.1, 0.1, 3.6, '#1a1a1e'); mb.box(x, 0.5, 0.8, 0.08, 0.8, 0.08, '#1a1a1e'); mb.box(x, 0.5, -0.8, 0.08, 0.8, 0.08, '#1a1a1e'); }
    mb.box(0, 1.9, 0.2, 2.72, 0.35, 0.8, '#b02020');
  };
  FB.helicopter = heli;
  FB.rotor = (mb) => { for (let i = 0; i < 4; i++) { mb.push(); mb.rotate(0, i * Math.PI / 2, 0); mb.box(0, 0, 3.8, 0.35, 0.05, 7.6, '#101012'); mb.pop(); } };
  FB.cargo_ship = (mb) => {
    const Lh = 92;
    // hull: lofted along z via rotation
    mb.push(); mb.rotate(Math.PI / 2, 0, 0);
    mb.loft([{ y: -Lh / 2, rx: 6.5, rz: 5, z: 1 }, { y: -Lh / 2 + 6, rx: 8, rz: 6.5 }, { y: Lh / 2 - 16, rx: 8, rz: 6.5 }, { y: Lh / 2 - 4, rx: 5, rz: 5.5, z: -0.5 }, { y: Lh / 2, rx: 0.8, rz: 4.5, z: -1.5 }], { sides: 10, color: '#8a2a22', sq: 3.2 });
    mb.pop();
    // (loft maps ring z -> world -y after the rotation; lift the hull so the deck sits at ~6.5)
    mb.box(0, 0.6, 0, 15.4, 1.2, Lh - 8, '#1a1a1c');
    mb.box(0, 6.4, 2, 15, 0.4, Lh - 14, '#6a6a5e');
    K.tbox(mb, 0, 6.6, -Lh / 2 + 12, 13, 10, 7, '#e8e8e0', 0.2, 0.3);
    K.tbox(mb, 0, 13.6, -Lh / 2 + 12, 10, 8, 4, '#e0e0d8', 0.2, 0.3);
    mb.prism(0, 17.6, -Lh / 2 + 10, 1.2, 1.0, 5, 8, '#c03020', true);
    const r = K.rng('ship');
    for (let i = 0; i < 16; i++) mb.box((i % 3 - 1) * 4.6, 7.9, -8 + Math.floor(i / 3) * 6.4, 4.2, 2.6, 6, ['#b04030', '#3a6aa0', '#d0a030', '#4a8a4a', '#8a8a90'][Math.floor(r() * 5)]);
    for (const z of [-4, 22]) { mb.prism(0, 6.6, z, 0.5, 0.4, 12, 6, '#d0b040', true); mb.push(); mb.translate(0, 18, z); mb.rotate(0.9, 0, 0); mb.prism(0, 0, 0, 0.3, 0.2, 13, 6, '#d0b040', true); mb.pop(); }
  };
  FB.highwind = (mb) => {
    const hull = '#5a5048', trim = '#a08a5a', dk = '#3a3430';
    mb.push(); mb.rotate(Math.PI / 2, 0, 0);
    mb.loft([{ y: -62, rx: 3, rz: 3 }, { y: -50, rx: 9, rz: 8 }, { y: -10, rx: 12, rz: 10 }, { y: 30, rx: 11, rz: 9 }, { y: 52, rx: 6, rz: 6, z: -2 }, { y: 66, rx: 0.8, rz: 1.2, z: -4 }], { sides: 12, color: hull, sq: 2.6 });
    mb.pop();
    // deck + bridge
    mb.box(0, 9.3, -4, 18, 0.8, 80, '#6a6258');
    K.tbox(mb, 0, 9.7, 30, 10, 12, 5, '#c8c0b0', 0.25, 0.3);
    mb.frustum(0, 14.7, 30, 10, 12, 6, 8, 2.5, trim);
    // wings with propeller pods
    for (const s of [-1, 1]) {
      mb.push(); mb.translate(s * 11, 2, -6); mb.rotate(0, 0, s * -0.12);
      mb.box(s * 14, 0, 0, 28, 1.4, 12, dk);
      for (const [px, pz] of [[13, 8], [27, 6]]) { mb.push(); mb.translate(s * px, 0, pz); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, -8, 0, 2.2, 1.6, 10, 10, trim, true); mb.pop(); }
      mb.pop();
    }
    // tail fins + rear propeller
    mb.frustum(0, 6, -52, 1.2, 14, 0.6, 6, 16, dk);
    for (const s of [-1, 1]) { mb.push(); mb.translate(s * 5, 2, -54); mb.rotate(0, 0, s * 1.2); mb.frustum(0, 0, 0, 1.0, 10, 0.5, 5, 12, dk); mb.pop(); }
    mb.box(0, -10.5, -8, 6, 2, 30, dk);
    for (let i = 0; i < 6; i++) mb.box(0, 0, 40 - i * 16, 24.5, 0.8, 1.0, trim);
  };
  FB.hwprop = (mb) => { for (let i = 0; i < 3; i++) { mb.push(); mb.rotate(0, 0, i * TAU / 3); mb.box(0, 3, 0, 0.9, 6, 0.2, '#2a2420'); mb.pop(); } mb.sphere(0, 0, 0, 0.9, 0.9, 0.9, '#8a7a5a', 8, 5); };
  FB.rocket_26 = (mb) => {
    const w = '#e8e8e4';
    mb.prism(0, 0, 0, 5, 5, 64, 16, w, true);
    mb.prism(0, 64, 0, 5, 3.2, 14, 16, w, true);
    mb.prism(0, 78, 0, 3.2, 0.1, 14, 16, '#2a2a30', true);
    for (let y = 8; y < 64; y += 14) mb.prism(0, y, 0, 5.15, 5.15, 1.0, 16, '#b02020', true);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; mb.push(); mb.rotate(0, -a, 0); mb.frustum(6.5, 0, 0, 4, 1, 1.2, 0.6, 16, '#2a2a30'); mb.pop(); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + TAU / 8; mb.push(); mb.rotate(0, -a, 0); mb.prism(7.5, -2, 0, 2, 2, 30, 12, w, true); mb.prism(7.5, 28, 0, 2, 0.2, 5, 12, '#2a2a30', true); mb.pop(); }
    mb.prism(0, -4, 0, 3, 4.2, 4, 12, '#3a3a40', true, true, false);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + TAU / 8; mb.prism(Math.cos(a) * 7.5, -4, Math.sin(a) * 7.5, 1.2, 1.8, 2, 10, '#3a3a40', true, true, false); }
  };
  FB.ropeway = (mb) => {
    mb.rbox(0, 1.3, 0, 2.6, 2.4, 3.2, '#e8d8a0', 0.25);
    mb.box(0, 1.6, 1.62, 2.2, 1.0, 0.05, '#2a3a5a'); mb.box(0, 1.6, -1.62, 2.2, 1.0, 0.05, '#2a3a5a');
    for (const x of [-1.32, 1.32]) mb.box(x, 1.6, 0, 0.05, 1.0, 2.6, '#2a3a5a');
    mb.box(0, 2.6, 0, 2.8, 0.2, 3.4, '#c04040');
    mb.box(0, 3.6, 0, 0.14, 2.0, 0.14, '#707070');
    mb.box(0, 4.6, 0, 0.3, 0.3, 1.2, '#505050');
  };

  // Vehicle accessor: vehicles3d model (fit to size) or the fallback above. fit: { len | width | height }
  K.veh = function (id, fit, fbId, vopts) {
    const V3D = FF7.vehicles3d;
    if (V3D && typeof V3D.has === 'function' && V3D.has(id)) {
      try {
        const m = V3D.build(id, Object.assign({ style: 'field' }, vopts || {}));
        if (m && m.order) {
          const box = K.modelBox(m);
          const sz = box.size;
          const s = fit.len ? fit.len / Math.max(0.01, sz[2]) : fit.width ? fit.width / Math.max(0.01, sz[0]) : fit.height / Math.max(0.01, sz[1]);
          const w = new K.Wrap(m, s, [-(box.min[0] + box.max[0]) / 2, -box.min[1], -(box.min[2] + box.max[2]) / 2]);
          w.real = true; w.size = sz.map(v => v * s); w.fitScale = s;
          if (fit.clip) w.play(fit.clip);
          return w;
        }
      } catch (err) { console.warn('cinema: vehicle', id, err); }
    }
    const fb = FB[fbId || id];
    const mesh = once('veh_' + (fbId || id), () => K.meshOf(fb || ((mb) => mb.box(0, 1, 0, 2, 2, 4, '#808080'))));
    const mm = new K.MeshModel(mesh);
    mm.size = [mesh.max[0] - mesh.min[0], mesh.max[1] - mesh.min[1], mesh.max[2] - mesh.min[2]];
    const want = fit.len ? fit.len / Math.max(0.01, mm.size[2]) : fit.width ? fit.width / Math.max(0.01, mm.size[0]) : fit.height ? fit.height / Math.max(0.01, mm.size[1]) : 1;
    mm.scale = fit.keep ? 1 : want;
    return mm;
  };
  // Helicopter with a spinning rotor (fallback) or the vehicles3d model
  K.heli = function () {
    const h = K.veh('shinra_helicopter', { len: 14, clip: 'move' }, 'helicopter');
    if (!h.real) {
      const rotor = once('veh_rotor', () => K.meshOf(FB.rotor));
      const base = h.draw.bind(h);
      h.draw = function (opts) {
        base(opts);
        this.spin = (this.spin || 0) + 0.9;
        const M = K.mat(this.position, [this.rotX, this.rotY, this.rotZ], this.scale);
        const R2 = K.mat([0, 3.55, 0], [0, this.spin, 0], 1);
        FF7.GL.draw(rotor, FF7.M4.mul(FF7.M4.create(), M, R2), { tint: [1, 1, 1, 0.8], blend: 'alpha' });
      };
    }
    return h;
  };
  // Highwind with spinning propellers (fallback)
  K.highwind = function () {
    const h = K.veh('highwind', { len: 150, clip: 'move' }, 'highwind');
    if (!h.real) {
      const prop = once('veh_hwprop', () => K.meshOf(FB.hwprop));
      const base = h.draw.bind(h);
      const pods = [];
      for (const s of [-1, 1]) for (const [px, pz] of [[13, 8], [27, 6]]) pods.push([s * (11 + px * 0.993), 2 - px * 0.12, -6 + pz + 2.4]);
      h.draw = function (opts) {
        base(opts);
        this.spin = (this.spin || 0) + (this.propSpeed != null ? this.propSpeed : 0.5);
        const M = K.mat(this.position, [this.rotX, this.rotY, this.rotZ], this.scale);
        for (const p of pods) FF7.GL.draw(prop, FF7.M4.mul(FF7.M4.create(), M, K.mat(p, [0, 0, this.spin], 1)), opts || undefined);
      };
    }
    return h;
  };

  // ------------------------------------------------------------------ particle presets
  // fire column at p (scale s), rate per frame
  K.fire = function (S, p, s = 1, rate = 2, o = {}) {
    S.fx.emit(rate, { p, spread: [s * (o.w || 0.5), s * 0.2, s * (o.w || 0.5)], v: [0, s * 0.05, 0], vs: s * 0.015, life: o.life || 36, size: [s * 1.5, s * 0.5], c0: o.c0 || '#fff0a0', c1: o.c1 || '#ff3a08', grav: -s * 0.0015, kind: 'glow', alpha: o.alpha || 1 });
    if (Math.random() < 0.5) S.fx.emit(1, { p, spread: s * 0.3, v: [0, s * 0.04, 0], vs: s * 0.01, life: (o.life || 36) * 0.6, size: [s * 0.6, s * 0.2], c0: '#ffffe0', c1: o.c1 || '#ff8020', kind: 'core', alpha: 0.9 });
  };
  K.smokeCol = function (S, p, s = 1, rate = 1, o = {}) {
    S.fx.emit(rate, { p, spread: s * 0.4, v: o.v || [s * 0.008, s * 0.035, 0], vs: s * 0.01, life: o.life || 180, size: [s * 1.2, s * 5], c0: o.c0 || '#403a36', c1: o.c1 || '#1c1a1a', alpha: o.alpha || 0.55, kind: 'smoke', drag: 0.995, fadeIn: 0.15 });
  };
  K.explode = function (S, p, s = 1, o = {}) {
    const c0 = o.c0 || '#ffffe0', c1 = o.c1 || '#ff5010';
    S.fx.emit(o.n || 40, { p, spread: s * 0.3, v: [0, 0, 0], vs: s * 0.16, life: 40, size: [s * 1.6, s * 3.2], c0, c1, kind: 'glow', drag: 0.93, alpha: 1 });
    S.fx.emit(Math.round((o.n || 40) * 0.6), { p, spread: s * 0.4, v: [0, s * 0.03, 0], vs: s * 0.08, life: 200, size: [s * 1.5, s * 6], c0: o.smoke || '#4a403a', c1: '#1a1818', kind: 'smoke', drag: 0.96, alpha: 0.6, fadeIn: 0.1 });
    S.fx.emit(o.debris != null ? o.debris : 30, { p, spread: s * 0.2, v: [0, s * 0.12, 0], vs: s * 0.22, life: 70, size: [s * 0.18, s * 0.1], c0: '#fff0b0', c1: '#ff6010', kind: 'core', grav: s * 0.006 });
    S.fx.emit(1, { p, life: 30, size: [s * 1, s * 14], c0: o.ring || '#ffffff', kind: 'ring', alpha: 0.7, fadeIn: 0 });
  };
  K.dust = function (S, p, s = 1, rate = 2, o = {}) {
    S.fx.emit(rate, { p, spread: o.spread != null ? o.spread : s * 0.8, v: o.v || [0, s * 0.02, 0], vs: o.vs != null ? o.vs : s * 0.04, life: o.life || 240, size: [s * 2, s * 7], c0: o.c0 || '#8a7a68', c1: o.c1 || '#5a5048', kind: 'smoke', drag: 0.985, alpha: o.alpha || 0.5, fadeIn: 0.2 });
  };
  K.splash = function (S, p, s = 1, o = {}) {
    S.fx.emit(o.n || 50, { p, spread: [s * 0.6, 0.1, s * 0.6], v: [0, s * 0.25, 0], vs: [s * 0.12, s * 0.12, s * 0.12], life: 70, size: [s * 1.2, s * 2.4], c0: '#f0f8ff', c1: '#a0c0d8', kind: 'smoke', grav: s * 0.008, alpha: 0.8, fadeIn: 0 });
    S.fx.emit(1, { p, life: 50, size: [s * 1, s * 10], c0: '#ffffff', kind: 'ring', alpha: 0.5, fadeIn: 0 });
  };
})();

// =====================================================================================================
// Part 3: the movies.
// =====================================================================================================
(function () {
  const U = FF7.util, R = FF7.render, V = FF7.V3;
  const CIN = FF7.cinema, K = CIN.K, SET = K.SET, TAU = K.TAU, L = K.L;
  const { ease, easeIn, easeOut, seg, bump, LV, path } = K;
  const GL = FF7.GL;
  const def = CIN.def;

  // ------------------------------------------------------------------ shared helpers
  // Big serif title / card text (2D overlay)
  K.title = function (c, text, a, o = {}) {
    if (a <= 0) return;
    c.save();
    c.globalAlpha = Math.min(1, a);
    const size = o.size || 34;
    const font = `${o.weight || '600'} ${size}px ${o.font || 'Georgia, "Times New Roman", serif'}`;
    R.text(text, FF7.W / 2, o.y != null ? o.y : FF7.H / 2 - size / 2, { font, align: 'center', color: o.color || '#f4f4f8', shadowColor: 'rgba(0,0,0,0.6)' });
    c.restore();
  };
  // Env variant: base preset + overrides
  const env = (base, o) => Object.assign({}, K.ENV[base], o);
  K.envOf = env;
  // Hold a basket in Aeris' left hand
  K.basketAt = function (m) {
    m.computeWorld();
    const hp = m.worldPoint('handL', [0, -0.02, 0.01]);
    K.put(SET.basket(), [hp[0], hp[1] - 0.2, hp[2]], [0, m.rotY, 0], 1.25);
  };
  // Posing: set bone rotations after the clip (m.onPose)
  K.pose = (m, fn) => { m.onPose = fn; return m; };
  const walkTo = (m, a, b, k) => { m.position = LV(a, b, k); K.face(m, b); };
  K.walkTo = walkTo;
  const soldierLook = (c) => ({ base: 'soldier', top: c || '#3a5a9a', sleeve: c || '#3a5a9a', bottom: c || '#3a5a9a', weapon: 'rifle' });

  // ================================================================== generic (unknown ids)
  def('_generic', { hidden: true, shots: [
    { dur: 200, env: 'space', fadeIn: 20,
      cam: (S, k) => ({ eye: [0, 0, 0], at: [Math.sin(k * 0.4) * 10, 2 - k * 3, -10], fov: 50 }),
      draw(S, k) { S.haze([0, -40, -60], 90, '#20ff90', 0.25 * ease(seg(k, 0.4, 1))); } },
    { dur: 240, env: 'lifestream', dissolve: 40, fadeOut: 40,
      cam: (S, k) => { const z = -S.f * 0.35; return { eye: [0, 0, z], at: [Math.sin(S.f * 0.01) * 2, Math.cos(S.f * 0.013) * 1.5, z - 10], fov: 62, roll: Math.sin(S.f * 0.008) * 0.2 }; },
      draw(S, k) { K.lifestreamTunnel(S, -S.f * 0.35); } },
  ] });

  // ================================================================== OPENING (122 s, after the original FMV)
  // 0-45 stars · 45-54 Aeris' face in the Mako light · 54-66 she rises and walks down the alley with her
  // basket · 66-77 out past the theatre onto Loveless Avenue · 77-88 up over the rooftops and the rush back
  // over the city · 88-106 Midgar overview with the title · 106-122 down past Reactor No. 1 to the train.
  // Stylised title emblem (drawn, not the original artwork)
  K.logo = function (c, a, x0, y0) {
    if (a <= 0) return;
    c.save(); c.globalAlpha = Math.min(1, a);
    const cx = x0 != null ? x0 : 230, cy = y0 != null ? y0 : 244;
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const g = c.createLinearGradient(cx, cy, cx + 250, cy - 120);
      g.addColorStop(0, 'rgba(90,210,190,0.55)'); g.addColorStop(1, 'rgba(40,120,110,0)');
      c.fillStyle = g;
      c.beginPath();
      const o = i * 5 - 14;
      c.moveTo(cx - 10, cy - 30 + o * 0.3);
      c.quadraticCurveTo(cx + 110, cy - 40 + o, cx + 250 - i * 12, cy - 120 - o * 0.8);
      c.quadraticCurveTo(cx + 120, cy - 20 + o, cx + 26, cy + 8 + o * 0.4);
      c.closePath(); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    const rg = c.createRadialGradient(cx - 14, cy - 14, 4, cx, cy, 46);
    rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.45, '#bfe4ff'); rg.addColorStop(1, '#2a60c8');
    c.fillStyle = rg; c.beginPath(); c.arc(cx, cy, 46, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(FF7.W / 2 + 6, cy + 4); c.scale(0.78, 1.25);
    c.font = '700 46px "Times New Roman", Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 4; c.strokeStyle = 'rgba(10,14,24,0.9)'; c.strokeText('FINAL FANTASY VII', 0, 0);
    const tg = c.createLinearGradient(0, -20, 0, 20); tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.55, '#c8ccd8'); tg.addColorStop(1, '#8a90a0');
    c.fillStyle = tg; c.fillText('FINAL FANTASY VII', 0, 0);
    c.restore();
    c.restore();
  };
  const SEC8 = K.SET.MID.secAngle(8) + 0.05;
  const MIDP = K.SET.MID;
  const aerisClosed = () => ({ base: 'aeris', face: Object.assign({}, (FF7.chars3d.PRESETS.aeris || {}).face || {}, { eyes: 'closed' }) });
  // green mako motes drifting around a point
  const motes = (S, c, r, n) => { for (let i = 0; i < n; i++) { const u = ((S.f || 0) * 0.002 + U.hash(i, 1, 9)) % 1; const a = U.hash(i, 2, 9) * TAU + u * 2; const p = [c[0] + Math.cos(a) * r * (0.4 + U.hash(i, 3, 9)), c[1] - r * 0.6 + u * r * 1.8, c[2] + Math.sin(a) * r * (0.4 + U.hash(i, 4, 9))]; S.core(p, 0.02 + U.hash(i, 5, 9) * 0.025, '#80ff90', Math.sin(u * Math.PI) * 0.9); } };
  K.motes = motes;
  const streetEnv = (o) => env('street', o || {});
  const greenFace = env('street', { stars: 0, sky: ['#000000', '#000000', '#000000'], light: { dir: [0.5, -0.3, -0.8], color: [0.14, 0.16, 0.18], ambient: [0.1, 0.13, 0.12], dir2: [-0.7, 0.55, -0.35], color2: [0.35, 0.95, 0.5] } });
  def('opening', {
    music: 'opening', carry: true,
    sample: 'Midgar.\nThe city of Mako, built on a plate high above the slums.\nA train rolls into Sector 1 station...',
    captionAt: 0.1,
    shots: [
      // 0-45 s: stars
      { dur: 2700, env: 'space', fadeIn: 150, fadeOut: 70,
        cam: (S, k) => ({ eye: [0, 0, 0], at: [Math.sin(0.2 + k * 0.35) * 10, 1.5 - k * 2.2, -Math.cos(0.2 + k * 0.35) * 10], fov: 44 - k * 4 }),
        draw(S, k) { for (let i = 0; i < 9; i++) S.flare([Math.sin(i * 2.3) * 30, 6 + Math.cos(i * 1.7) * 14, -40 - i * 6], 2 + (i % 3), '#e0ecff', 0.18 + 0.16 * Math.sin(S.f * 0.03 + i)); } },
      // 45-54 s: Aeris' face, lit green from below; she opens her eyes
      { dur: 540, env: greenFace, fadeIn: 100,
        init(S) {
          S.a = K.actor('aeris', { pos: [0, 0, 0], rotY: 0 }); S.b = K.actor(aerisClosed(), { pos: [0, 0, 0], rotY: 0 });
          for (const m of [S.a, S.b]) { S.add(m); m.manual = true; K.pose(m, (mm) => { mm.b('head').rot[0] = -0.12 + Math.sin(S.f * 0.01) * 0.02; mm.b('armL').rot[0] = -0.6; mm.b('foreL').rot[0] = -1.6; mm.b('armL').rot[1] = -0.5; }); }
        },
        cam: (S, k) => ({ eye: [0.05, L(1.45, 1.42, k), L(1.05, 1.25, k)], at: [0, 1.46, 0], fov: 32 }),
        draw(S, k) { const closed = k > 0.38 && k < 0.55; (closed ? S.b : S.a).draw(); motes(S, [0, 1.4, 0.2], 0.7, 40); S.glow([-0.9, 0.4, 0.6], 1.6, '#30ff70', 0.25); } },
      // 54-60 s: she rises in the alley, hand at her chest; the Mako light glows low on the wall
      { dur: 360, env: env('street', { stars: 0, fog: { color: [0.02, 0.04, 0.03], near: 6, far: 30 }, light: { dir: [0.4, -0.6, -0.6], color: [0.2, 0.22, 0.26], ambient: [0.14, 0.16, 0.16], dir2: [-0.9, 0.4, -0.1], color2: [0.3, 0.85, 0.45] } }),
        init(S) {
          S.st = SET.street(); S.a = S.add(K.actor('aeris', { pos: [0.6, 0, -6], rotY: -0.5 }));
          K.pose(S.a, (m) => { const u = ease(seg(S.k, 0, 0.55)); m.b('hips').pos[1] = L(-0.13, 0, u); m.b('thighL').rot[0] = L(-1.4, 0, u); m.b('shinL').rot[0] = L(1.4, 0, u); m.b('thighR').rot[0] = L(0.2, 0, u); m.b('shinR').rot[0] = L(1.6, 0, u); m.b('torso').rot[0] = L(0.3, 0.05, u); m.b('armR').rot[0] = -0.7; m.b('foreR').rot[0] = -1.9; m.b('armR').rot[1] = 0.5; m.b('head').rot[0] = L(0.3, -0.1, u); m.b('head').rot[1] = L(0, -0.4, seg(S.k, 0.6, 1)); });
        },
        cam: (S, k) => ({ eye: LV([2.3, 0.9, -5.2], [2.1, 1.05, -4.7], k), at: [0.5, 1.2, -6.1], fov: 42 }),
        draw(S) { K.drawStreet(S, S.st); motes(S, [0.2, 1.0, -6], 1.2, 50); S.glow([-1.4, 0.5, -5.8], 2.4, '#30ff70', 0.5); S.core([-1.55, 0.5, -5.8], 0.5, '#c0ffd0', 0.6); } },
      // 60-66 s: she walks toward us down the alley, basket in hand (low camera)
      { dur: 360, env: env('street', { stars: 0, light: { dir: [0.3, -0.7, -0.5], color: [0.26, 0.28, 0.32], ambient: [0.16, 0.18, 0.2], dir2: [-0.8, 0.2, 0.5], color2: [0.18, 0.5, 0.3] } }), dissolve: 20,
        init(S) { S.st = SET.street(); S.a = S.add(K.actor('aeris', { anim: 'walk' })); K.pose(S.a, (m) => { m.b('armL').rot[0] = -0.4; m.b('foreL').rot[0] = -1.05; m.b('head').rot[0] = 0.15; }); },
        update(S, k) { walkTo(S.a, [0.3, 0, -8.5], [0.4, 0, -3.2], k); },
        cam: (S, k) => { const a = S.a.position; return { eye: [a[0] + 0.5, 0.45, a[2] + 2.3 - k * 0.3], at: [a[0], 1.3, a[2]], fov: 50 }; },
        draw(S) { K.drawStreet(S, S.st); K.basketAt(S.a); } },
      // 66-70 s: out past the theatre's rope barriers; a car sweeps by in the foreground
      { dur: 240, env: streetEnv(),
        init(S) { S.st = SET.street(); S.a = S.add(K.actor('aeris', { anim: 'walk' })); K.pose(S.a, (m) => { m.b('armL').rot[0] = -0.4; m.b('foreL').rot[0] = -1.05; }); S.car = SET.car('#18181c'); },
        update(S, k) { walkTo(S.a, [0.6, 0, -2.4], [2.6, 0.12, 1.1], k); },
        cam: (S, k) => ({ eye: [L(4.2, 3.6, k), 1.4, 9.4], at: [4.2, 2.6, -1.5], fov: 50 }),
        draw(S, k) {
          K.drawStreet(S, S.st); K.basketAt(S.a);
          const cx = L(22, -16, seg(k, 0.2, 0.75));
          K.put(S.car, [cx, 0, 5.6], [0, -Math.PI / 2, 0]);
          for (const dz of [-0.6, 0.6]) S.glow([cx - 2.2, 0.75, 5.6 + dz], 1.4, '#fff4d0', 0.8);
        },
        overlay(c) { K.streetSigns(c, SET.street(), 1); } },
      // 70-77 s: Loveless Avenue: people, neon, a passer-by in the foreground; the camera starts to rise
      { dur: 420, env: streetEnv(),
        init(S) {
          S.st = SET.street(); S.a = S.add(K.actor('aeris', { anim: 'walk' })); K.pose(S.a, (m) => { m.b('armL').rot[0] = -0.4; m.b('foreL').rot[0] = -1.05; });
          S.npc = [S.add(K.actor('man_4', { anim: 'walk' })), S.add(K.actor('woman_2', { anim: 'walk' })), S.add(K.actor('man_7', { anim: 'walk' })), S.add(K.actor('man_2', { anim: 'walk' }))];
        },
        update(S, k) {
          walkTo(S.a, [2.6, 0.12, 1.1], [-3.5, 0.12, 1.3], k);
          S.npc[0].position = [-10 + k * 8, 0.12, 9.2]; S.npc[0].rotY = Math.PI / 2;
          S.npc[1].position = [10 - k * 7, 0.12, 8.7]; S.npc[1].rotY = -Math.PI / 2;
          S.npc[2].position = [-4 + k * 5, 0.12, 1.5]; S.npc[2].rotY = Math.PI / 2;
          S.npc[3].position = [L(1, 8, seg(k, 0, 0.4)), 0.12, L(6.5, 3.4, seg(k, 0, 0.4))]; S.npc[3].rotY = 1.9;
        },
        cam: (S, k) => { const e = easeIn(seg(k, 0.5, 1)); return { eye: [L(6.5, 2, e), L(1.5, 14, e), L(4.2, 5, e)], at: [L(-8, -6, e), L(3, 2, e), L(8, 8, e)], fov: 52 }; },
        draw(S) { K.drawStreet(S, S.st); K.basketAt(S.a); },
        overlay(c) { K.streetSigns(c, SET.street(), 1); } },
      // 77-80 s: up over the rooftops, looking down on the fountain plaza
      { dur: 180, env: streetEnv(), dissolve: 24,
        init(S) { S.pz = SET.plaza(); },
        cam: (S, k) => ({ eye: [L(4, 2, k), L(38, 48, k), L(-15, -9, k)], at: [0, 0, L(-3, -1, k)], fov: 50 }),
        draw(S) { GL.draw(S.pz.mesh); GL.draw(S.pz.tex); GL.draw(S.pz.glow); for (const p of S.pz.lamps) S.glow(p, 2.4, '#ffe0b0', 0.55); S.glow([0, 1, 0], 9, '#40d0e0', 0.25); } },
      // 80-84 s: the rush back through the Mako haze, past the reactor stacks
      { dur: 240, env: 'midgar', dissolve: 20,
        init(S) { S.city = SET.midgar({}); },
        cam: (S, k) => {
          const e = K.easeInOut3(k), rp = MIDP.reactorPos(8, MIDP.PH);
          return { eye: path([K.polar(30, SEC8, MIDP.PH + 1), K.polar(34, SEC8 + 0.3, MIDP.PH + 4), K.polar(30, SEC8 + 0.45, MIDP.PH + 9), K.polar(24, SEC8 + 0.55, MIDP.PH + 16)], e), at: LV(rp, [0, MIDP.PH + 6, 0], e), fov: 50, near: 0.2, far: 900 };
        },
        draw(S, k) {
          K.drawMidgar(S, S.city, { searchlights: 1 });
          const e = K.CAM.eye, f = K.CAM.fwd, rt = K.CAM.right, up = K.CAM.up;
          for (let i = 0; i < 26; i++) { const ox = Math.sin(i * 1.7) * 2.5, oy = Math.cos(i * 2.3) * 1.6 - 0.5; const p0 = V.add(V.add(e, V.scale(f, 3 + i * 0.6)), V.add(V.scale(rt, ox), V.scale(up, oy))); S.beam(p0, V.add(p0, V.scale(f, -6)), 0.5 + (i % 3) * 0.3, '#60ffc0', 0.35 * bump(k, 0, 0.85), 0); }
        } },
      // 84-88 s: pulling back from the Shinra building to reveal the reactors; flash
      { dur: 240, env: 'midgar', fadeOut: [24, '#f0f8e8'],
        init(S) { S.city = SET.midgar({}); },
        cam: (S, k) => ({ eye: LV(K.polar(16, SEC8 + 0.7, MIDP.PH + 12), K.polar(46, SEC8 + 0.9, MIDP.PH + 22), easeOut(k)), at: [0, MIDP.PH + 8, 0], fov: 50, near: 0.2, far: 900 }),
        draw(S) { K.drawMidgar(S, S.city, { searchlights: 1 }); } },
      // 88-106 s: Midgar at night from the plate's edge, steam pouring from the reactors; the title
      { dur: 1080, env: 'midgar', fadeIn: [30, '#f0f8e8'],
        init(S) { S.city = SET.midgar({}); },
        cam: (S, k) => ({ eye: LV(K.polar(52, Math.PI + 0.05, MIDP.PH + 3.2), K.polar(44, Math.PI + 0.02, MIDP.PH + 3.6), ease(k)), at: [0, MIDP.PH + 6, 0], fov: 54, near: 0.2, far: 900 }),
        draw(S) { K.drawMidgar(S, S.city, { searchlights: 1, steam: 1.4 }); },
        overlay(c, S, k) { K.logo(c, ease(seg(k, 0.02, 0.1)) * (1 - ease(seg(k, 0.44, 0.56)))); } },
      // 106-111 s: toward Reactor No. 1, its stacks pouring Mako steam
      { dur: 300, env: 'midgar', dissolve: 30,
        init(S) { S.city = SET.midgar({}); },
        cam: (S, k) => { const rp = MIDP.reactorPos(1, MIDP.PH + 3); const e = ease(k); return { eye: LV(K.polar(40, 0.65, MIDP.PH + 8), V.add(rp, [3.5, 1.5, 5]), e), at: LV([0, MIDP.PH + 5, 0], V.add(rp, [0, 1.5, 0]), e), fov: 50, near: 0.1, far: 900 }; },
        draw(S) { K.drawMidgar(S, S.city, { steam: 1.4 }); },
        overlay(c, S, k) { K.sign(c, V.add(MIDP.reactorPos(1, MIDP.PH + 3.2), [0.9, 0, 1.5]), '01', 0.5, '#e0f0ff', { alpha: seg(k, 0.4, 0.8) }); } },
      // 111-116 s: diving down through the machinery to the train running in its trench
      { dur: 300, env: env('midgar', { fog: { color: [0.05, 0.08, 0.09], near: 40, far: 500 } }), dissolve: 26,
        init(S) { S.st = SET.station('s1'); S.tr = new K.Train(4); },
        update(S, k) { S.tr.x = -60 + S.f * 0.3; },
        cam: (S, k) => { const e = easeIn(k); return { eye: [L(-80, S.tr.x - 26, e), L(90, 14, e), L(40, 12, e)], at: [S.tr.x - 8, 2, 0], fov: 50, far: 900 }; },
        draw(S) { K.drawStation(S, S.st); S.tr.draw(S); } },
      // 116-122 s: the platform; the train runs in beside it
      { dur: 360, env: env('midgar', { fog: { color: [0.06, 0.09, 0.09], near: 30, far: 400 } }), fadeOut: 80,
        init(S) { S.st = SET.station('s1'); S.tr = new K.Train(4); },
        update(S, k) { S.tr.x = L(-40, 24, easeOut(k)); if (S.cue('br', k > 0.5)) S.sfx('train'); },
        cam: (S, k) => ({ eye: [-26, 3.4, 4.6], at: [30, 2.2, 1.2], fov: 50, far: 900 }),
        draw(S) { K.drawStation(S, S.st); S.tr.draw(S); } },
    ],
  });
})();

// ----------------------------------------------------------------------------- Reactor 1, the midnight train, the plate
(function () {
  const U = FF7.util, V = FF7.V3, M4 = FF7.M4, MB = FF7.MeshBuilder;
  const CIN = FF7.cinema, K = CIN.K, SET = K.SET, TAU = K.TAU, L = K.L;
  const { ease, easeIn, easeOut, seg, bump, LV, path } = K;
  const GL = FF7.GL, def = CIN.def, env = K.envOf;
  const MID = SET.MID, P = K.polar, once = K.once, sh = U.shade;

  // hazard stripes (yellow/black) texture
  const HAZ = K.TEXH = (() => { const t = FF7.tex.create(64, 64), d = t.data; for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const on = Math.floor((x + y) / 8) % 2 === 0; const c = on ? [220, 180, 40] : [26, 24, 22]; const i = (y * 64 + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } return t; })();
  // flat horizontal ring (shockwave), unit radius
  SET.flatRing = () => once('flatRing', () => K.meshOf(mb => { const n = 48; for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU; const p = (r, a) => [Math.cos(a) * r, 0, Math.sin(a) * r]; mb.quad(p(0.82, a1), p(1, a1), p(1, a0), p(0.82, a0), [[1, 1, 1, 0], [1, 1, 1, 1], [1, 1, 1, 1]]); mb.quad(p(0.82, a1), p(1, a0), p(0.82, a0), p(0.82, a0), [[1, 1, 1, 0], [1, 1, 1, 1], [1, 1, 1, 0]]); } }, { unlit: true, cull: false, blend: 'add', alphaTest: 0 }));

  // ================================================================== REACTOR No. 1 BLAST (16 s)
  // the reactor core seen from above, blue arcs, white-out; the mushroom cloud over the plate; the fireball
  // and its shockwave; Midgar from above with the fire fading.
  SET.core = () => once('core', () => {
    const mb = new MB(), hb = new MB();
    mb.prism(0, -60, 0, 5, 5, 58.6, 20, '#5a8a84', true, false, false);
    for (let y = -56; y < -2; y += 6) mb.prism(0, y, 0, 5.25, 5.25, 0.5, 20, '#44706c', true);
    hb.loft([{ y: -1.4, rx: 5.5, rz: 5.5 }, { y: 0, rx: 5.5, rz: 5.5 }], { sides: 24, uv: 'cyl', color: '#ffffff', capBottom: false });
    mb.prism(0, 0, 0, 5.5, 4.2, 0.8, 24, '#4a706a', true);
    K.tbox(hb, 0, 0.8, 0, 4.2, 4.2, 1.6, '#ffffff', 0.5, 0.5, { noTop: true });
    mb.box(0, 1.6, 0, 3.2, 0.3, 3.2, '#8ac8c0');
    // shaft walls (seen from inside), ribs and pipes
    mb.push(); mb.rotate(0, 0.1, 0);
    for (let i = 0; i < 16; i++) { const a0 = i / 16 * TAU, a1 = (i + 1) / 16 * TAU, R = 16; const q = (r, a, y) => [Math.cos(a) * r, y, Math.sin(a) * r]; mb.quad(q(R, a0, -60), q(R, a1, -60), q(R, a1, 20), q(R, a0, 20), sh('#4a3a30', (i % 3) * 0.05)); }
    for (let y = -50; y < 20; y += 9) mb.prism(0, y, 0, 15.6, 15.6, 0.8, 16, '#3a2c24', false, false, false);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; mb.prism(Math.cos(a) * 14.8, -60, Math.sin(a) * 14.8, 0.6, 0.6, 80, 6, '#5a4a3a', true); }
    mb.pop();
    // catwalk to the core
    mb.box(0, 2.0, 9.5, 1.6, 0.2, 11, '#6a6660');
    for (const x of [-0.8, 0.8]) mb.box(x, 2.6, 9.5, 0.06, 1.0, 11, '#8a8680');
    mb.box(0, 0.2, 14, 6, 0.4, 3, '#5a5650');
    return { mesh: mb.build({ cull: false }), haz: hb.build({ tex: HAZ, texOpts: { repeat: true } }) };
  });
  // mushroom cloud of smoke rising from p (city scale), progress u
  K.mushroom = function (S, p, u, s, col) {
    const H = s * (2 + 22 * easeOut(u)), R = H * 0.34;
    const c = col || '#d8d2c8';
    for (let i = 0; i < 9; i++) { const t = i / 8; S.smoke([p[0] + Math.sin(i * 1.3) * 0.3 * s, p[1] + t * H * 0.85, p[2]], s * (2.5 + t * 3.5), c, 0.85, i); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + u * 0.8; S.smoke([p[0] + Math.cos(a) * R, p[1] + H + Math.sin(i * 2.1) * s, p[2] + Math.sin(a) * R], s * (4 + R / s * 0.35), c, 0.85, i * 0.7); }
    for (let i = 0; i < 6; i++) S.smoke([p[0] + Math.sin(i) * R * 0.4, p[1] + H + s * 2.5, p[2] + Math.cos(i) * R * 0.4], s * (6 + R / s * 0.3), sh(c, 0.06), 0.9, i);
    S.glow([p[0], p[1] + s, p[2]], s * 8, '#ffa040', 0.6 * (1 - u * 0.6));
  };
  const RP = () => MID.reactorPos(1, MID.PH + 3);
  def('reactor1_blast', {
    music: 'bombing', carry: true,
    sample: 'The bomb goes off.\nMako Reactor No.1 erupts in a pillar of green fire,\nand the blast shakes the whole of Midgar.',
    captionAt: 0.35,
    shots: [
      // 0-4.5 s: looking down on the reactor core; blue arcs crawl over it; white-out
      { dur: 270, env: env('midgar', { stars: 0, sky: ['#000000', '#050806', '#000000'], fog: { color: [0.02, 0.04, 0.03], near: 30, far: 120 }, light: { dir: [0.2, -0.9, 0.3], color: [0.55, 0.62, 0.6], ambient: [0.26, 0.3, 0.3], dir2: [-0.3, 0.6, -0.5], color2: [0.1, 0.3, 0.25] } }), fadeIn: 20, fadeOut: [24, '#fff8e0'],
        init(S) { S.c = SET.core(); },
        update(S, k) { if (S.cue('arc', k > 0.5)) S.sfx('bolt'); if (S.cue('boom', k > 0.9)) S.sfx('bosskill'); },
        cam: (S, k) => ({ eye: LV([7, 16, 12], [5.5, 13, 10], k), at: [0, -6, 0], fov: 50 }),
        draw(S, k) {
          GL.draw(S.c.mesh); GL.draw(S.c.haz);
          const a = bump(k, 0.48, 0.72);
          if (a > 0) {
            for (let i = 0; i < 14; i++) { const an = i / 14 * TAU + S.f * 0.07, y = -3 - (i % 5) * 4; S.glow([Math.cos(an) * 5.2, y, Math.sin(an) * 5.2], 4, '#3060ff', 0.5 * a); }
            for (let j = 0; j < 4; j++) { let p = [Math.cos(j * 1.6) * 5.2, 0.5, Math.sin(j * 1.6) * 5.2]; for (let i = 0; i < 6; i++) { const q = [p[0] + (Math.random() - 0.5) * 2.5, p[1] - 2.5, p[2] + (Math.random() - 0.5) * 2.5]; S.beamCore(p, q, 0.25, '#a0c0ff', a); S.beam(p, q, 1.4, '#4060ff', 0.5 * a); p = q; } }
          }
          if (k > 0.85) S.glow([0, 2, 0], 60 * seg(k, 0.85, 1), '#fff0c0', seg(k, 0.85, 1));
        } },
      // 4.5-6 s: fire fills everything
      { dur: 90, env: 'midgar', fadeIn: [20, '#fff8e0'],
        init(S) { S.c = SET.core(); },
        update(S, k) { S.shake(0.8); if (S.f % 2 === 0) K.explode(S, [(Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8], 3, { n: 10, debris: 4 }); },
        cam: (S, k) => ({ eye: [4, 10, 8], at: [0, 0, 0], fov: 60 }),
        draw(S) { GL.draw(S.c.mesh); S.glow([0, 4, 0], 40, '#ffd060', 0.8); S.core([0, 4, 0], 20, '#fff8e0', 0.6); } },
      // 6-7.5 s: the mushroom cloud climbs above the plate
      { dur: 90, env: 'midgar',
        init(S) { S.city = SET.midgar({}); },
        cam: (S, k) => { const rp = RP(); return { eye: P(24, MID.reactorAngle(1) - 0.55, MID.PH + 1.4), at: [rp[0], rp[1] + 6, rp[2]], fov: 50, near: 0.1, far: 900 }; },
        draw(S, k) { K.drawMidgar(S, S.city, { steam: 0.5 }); K.mushroom(S, RP(), 0.25 + k * 0.4, 0.8); } },
      // 7.5-9 s: the fireball and its shockwave ring over the plate
      { dur: 90, env: 'midgar',
        init(S) { S.city = SET.midgar({}); },
        update(S, k) { S.shake(0.2); },
        cam: (S, k) => { const rp = RP(); return { eye: P(30, MID.reactorAngle(1) - 0.35, MID.PH + 2.2), at: [rp[0], rp[1] + 7, rp[2]], fov: 50, near: 0.1, far: 900 }; },
        draw(S, k) {
          K.drawMidgar(S, S.city, { steam: 0.5 });
          const rp = RP(), c = [rp[0], rp[1] + 8, rp[2]];
          S.glow(c, 22, '#ff8030', 0.9); S.glow(c, 14, '#ffc060', 0.8); S.core(c, 8, '#fff0c0', 0.5);
          for (let i = 0; i < 12; i++) S.smoke([c[0] + Math.sin(i * 2.3) * 5, c[1] + Math.cos(i * 1.7) * 4, c[2] + Math.cos(i * 2.9) * 5], 9, '#ff9040', 0.35, i);
          K.put(SET.flatRing(), [rp[0], rp[1] + 4, rp[2]], null, 6 + k * 30, { tint: [0.8, 0.95, 1, 0.7 * (1 - k)] });
        } },
      // 9-16 s: Midgar from high above, the fire at Reactor No. 1 dying into smoke
      { dur: 420, env: 'midgar', fadeOut: 150,
        init(S) { S.city = SET.midgar({}); },
        cam: (S, k) => ({ eye: [8 + k * 4, 92 - k * 6, 40 - k * 4], at: [2, 0, -2], fov: 46, near: 0.5, far: 900, roll: 0.3 }),
        draw(S, k) {
          K.drawMidgar(S, S.city, { steam: 0.4 });
          const rp = RP(), a = 1 - ease(k);
          S.glow([rp[0], rp[1] + 6, rp[2]], 24, '#ff7020', 0.8 * a); S.core([rp[0], rp[1] + 6, rp[2]], 10, '#ffd080', 0.5 * a);
          for (let i = 0; i < 8; i++) S.smoke([rp[0] + Math.sin(i) * 4, rp[1] + 6 + k * 10, rp[2] + Math.cos(i) * 4], 12 + k * 10, '#8a8078', 0.5 * (1 - a * 0.5) * (1 - k * 0.5), i);
        } },
    ],
  });

  // ================================================================== THE MIDNIGHT TRAIN (tunnel, under the plate)
  SET.tunnel = () => once('tunnel', () => {
    const mb = new MB(), gb = new MB();
    // portal wall with an arched opening (opening centred at x=0, width 8, arch radius 4 on 2.5 m sides)
    mb.box(-10, 8, 0, 12, 16, 3, '#6a6254'); mb.box(10, 8, 0, 12, 16, 3, '#6a6254'); mb.box(0, 12.5, 0, 8, 7, 3, '#6a6254');
    mb.box(0, 16.3, 0.4, 30, 0.6, 4, '#4a4438');
    for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; mb.box(Math.cos(a) * 4.3, 2.5 + Math.sin(a) * 4.3, 1.55, 0.9, 0.9, 0.2, '#8a8270'); }
    // the tube
    const R = 4.2, n = 14;
    for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 1.4 - 0.2 * Math.PI, a1 = (i + 1) / n * Math.PI * 1.4 - 0.2 * Math.PI; const q = (a, z) => [Math.cos(a) * R, 2.5 + Math.sin(a) * R, z]; mb.quad(q(a1, 0), q(a0, 0), q(a0, -600), q(a1, -600), sh('#3a3630', (i % 2) * 0.06)); }
    for (let z = -6; z > -600; z -= 12) { mb.loft([{ y: z, rx: 4.15, rz: 4.15 }, { y: z - 0.6, rx: 4.15, rz: 4.15 }].map(r => r), { sides: 12, color: '#2a2622', arc: [-0.2 * Math.PI, 1.2 * Math.PI] }); gb.box(-2.6, 5.6, z, 0.4, 0.2, 1.2, '#fff4d0'); gb.box(2.6, 5.6, z, 0.4, 0.2, 1.2, '#fff4d0'); }
    // track into the tunnel
    mb.box(0, 0.05, -250, 4.2, 0.1, 620, '#2e2a26');
    for (let z = 50; z > -600; z -= 0.9) mb.box(0, 0.14, z, 2.6, 0.08, 0.3, '#3a2c20');
    for (const x of [-0.72, 0.72]) mb.box(x, 0.24, -250, 0.1, 0.12, 620, '#8a8a90');
    // outside: the approach cutting walls and gravel
    mb.floor(-30, 0, 30, 60, 0, '#3a362e');
    mb.box(-9, 4, 30, 2, 8, 60, '#5a5448'); mb.box(9, 4, 30, 2, 8, 60, '#5a5448');
    // plate above
    mb.box(0, 22, 20, 80, 8, 80, '#2a2a2c');
    return { mesh: mb.build({ cull: false }), glow: gb.build({ unlit: true }) };
  });
  // the loft above builds along y: rotate its rings into the tube with a wrapper
  SET.scaffold = () => once('scaffold', () => {
    const mb = new MB(), gl = [];
    const H = 64;
    mb.prism(0, 0, 0, 22, 22, H, 20, '#5a5448', true);
    for (let y = 6; y < H; y += 10) mb.prism(0, y, 0, 26.5, 26.5, 0.8, 24, '#3a3632', true);
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU, a2 = (i + 1) / 24 * TAU;
      const p = (aa, y) => [Math.cos(aa) * 26, y, Math.sin(aa) * 26];
      mb.sweep([p(a, 0), p(a, H)], 0.35, { sides: 4, color: '#4a4238' });
      for (let y = 6; y < H - 10; y += 10) { mb.sweep([p(a, y), p(a2, y + 10)], 0.18, { sides: 4, color: '#3e3830' }); mb.sweep([p(a2, y), p(a, y + 10)], 0.18, { sides: 4, color: '#3e3830' }); }
      if (i % 3 === 0) for (let y = 12; y < H; y += 20) gl.push(p(a + 0.1, y));
    }
    mb.prism(0, H, 0, 30, 30, 1.2, 24, '#3a3632', true);
    return { mesh: mb.build(), lights: gl, H };
  });
  def('midgar_train', {
    music: null,
    sample: 'Midnight.\nThe last train pulls out of Sector 7 Station\nand climbs toward the plate of Sector 4...',
    shots: [
      // 0-5 s: the train dives into the tunnel under the plate
      { dur: 300, env: env('slums', { fog: { color: [0.05, 0.05, 0.04], near: 30, far: 260 } }), fadeIn: 40,
        init(S) { S.t = SET.tunnel(); S.tr = new K.Train(5); S.tr.rotY = Math.PI; },
        update(S, k) { S.tr.z = L(60, -90, k); if (S.cue('horn', k > 0.05)) S.sfx('train_horn'); },
        cam: (S, k) => ({ eye: [3.4, 12.5, 26], at: [0, 1.5, L(8, -2, k)], fov: 50, far: 700 }),
        draw(S) { GL.draw(S.t.mesh); GL.draw(S.t.glow); S.tr.draw(S); } },
      // 5-10 s: the empty tunnel mouth, rails curving away into the dark
      { dur: 300, env: env('slums', { fog: { color: [0.05, 0.05, 0.04], near: 20, far: 200 } }),
        init(S) { S.t = SET.tunnel(); },
        update(S, k) { if (S.f % 180 === 30) S.sfx('train', 0.5); },
        cam: (S, k) => ({ eye: [L(-1.2, -0.6, k), 1.4, L(22, 19, k)], at: [0.3, 2.4, -20], fov: 46, far: 700 }),
        draw(S) { GL.draw(S.t.mesh); GL.draw(S.t.glow); } },
      // 10-14 s: inside, rushing through the dark with the train
      { dur: 240, env: env('slums', { sky: ['#000000', '#000000', '#000000'], fog: { color: [0.02, 0.02, 0.02], near: 10, far: 120 } }), dissolve: 20,
        init(S) { S.t = SET.tunnel(); S.tr = new K.Train(5); S.tr.rotY = Math.PI; },
        update(S, k) { S.tr.z = -100 - S.f * 0.9; },
        cam: (S, k) => { const z = S.tr.z; return { eye: [2.4, 3.2, z + 2 - 30], at: [0.5, 2.6, z - 60], fov: 58, roll: -0.08 }; },
        draw(S) { GL.draw(S.t.mesh); GL.draw(S.t.glow); S.tr.draw(S); for (let i = 0; i < 12; i++) { const z = S.tr.z - 30 - ((S.f * 0.9 + i * 9) % 100); S.beam([2.6, 5.6, z], [2.6, 5.6, z + 8], 0.4, '#fff4d0', 0.35); } } },
      // 14-28 s: the vast support pillar under the plate, wrapped in scaffolding; the train passes beneath
      { dur: 840, env: env('slums', { fog: { color: [0.06, 0.05, 0.04], near: 60, far: 420 }, light: { dir: [0.3, -0.5, -0.8], color: [0.6, 0.52, 0.4], ambient: [0.24, 0.22, 0.2] } }), dissolve: 30, fadeOut: 60,
        init(S) { S.sc = SET.scaffold(); S.pu = SET.plateUnder(); S.sl = SET.slums(); S.tr = new K.Train(5); S.tr.y = 7.4; },
        update(S, k) { S.tr.x = -140 + S.f * 0.4; if (S.f % 200 === 20) S.sfx('train', 0.5); },
        cam: (S, k) => ({ eye: K.orbit([0, 0, -60], -0.5 + k * 0.9, 70 - k * 8, 14 + k * 10), at: [0, 30 + k * 6, -60], fov: 54, far: 900 }),
        draw(S) {
          GL.draw(S.sl.mesh); GL.draw(S.sl.glow);
          K.put(S.sc.mesh, [0, 0, -60]); for (const l of S.sc.lights) S.glow([l[0], l[1], l[2] - 60], 2.5, '#ffe0a0', 0.6);
          K.put(S.pu.mesh, [0, 64, -60]);
          for (const l of S.pu.lights) S.glow([l[0], 63.6, l[2] - 60], 5, '#ffd8a0', 0.4);
          S.tr.draw(S);
        } },
    ],
  });

  // ================================================================== THE SECTOR 7 PLATE FALLS (70 s)
  const S7 = MID.secAngle(7);
  function wedgeMatrix(tilt, drop) {
    const piv = P(MID.HUB, S7, MID.PH);
    const Mt = M4.create();
    M4.mul(Mt, K.mat([piv[0], piv[1] - drop, piv[2]]), K.mat(null, [0, -S7, 0]));
    M4.mul(Mt, Mt, K.mat(null, [tilt, 0, 0]));
    M4.mul(Mt, Mt, K.mat(null, [0, S7, 0]));
    M4.mul(Mt, Mt, K.mat([-piv[0], -piv[1], -piv[2]]));
    return Mt;
  }
  K.wedgeMatrix = wedgeMatrix;
  // small interior sets (rooms are boxes seen from inside)
  const room = (mb, w, h, d, wall, floor, ceil) => {
    mb.quad([-w / 2, 0, d / 2], [w / 2, 0, d / 2], [w / 2, 0, -d / 2], [-w / 2, 0, -d / 2], floor);
    mb.quad([-w / 2, h, -d / 2], [w / 2, h, -d / 2], [w / 2, h, d / 2], [-w / 2, h, d / 2], ceil || sh(wall, -0.3));
    mb.quad([-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, h, -d / 2], [-w / 2, h, -d / 2], wall);
    mb.quad([w / 2, 0, -d / 2], [w / 2, 0, d / 2], [w / 2, h, d / 2], [w / 2, h, -d / 2], sh(wall, -0.08));
    mb.quad([-w / 2, 0, d / 2], [-w / 2, 0, -d / 2], [-w / 2, h, -d / 2], [-w / 2, h, d / 2], sh(wall, -0.08));
    mb.quad([w / 2, 0, d / 2], [-w / 2, 0, d / 2], [-w / 2, h, d / 2], [w / 2, h, d / 2], sh(wall, -0.15));
  };
  K.room = room;
  SET.control = () => once('control', () => {
    const mb = new MB(), gb = new MB();
    room(mb, 24, 9, 18, '#2a3034', '#1a1e20');
    for (let i = 0; i < 5; i++) { const x = -8 + i * 4; mb.box(x, 0.6, 2, 3, 1.2, 1.4, '#3a4046'); gb.box(x, 1.25, 1.35, 2.4, 0.5, 0.05, '#40ff90'); }
    for (const x of [-6, -2, 2, 6]) { mb.prism(x, 1.5, -7, 1.3, 1.3, 0.5, 12, '#50565c'); gb.prism(x, 2, -7, 1.1, 1.1, 5, 12, '#50ffb0'); mb.prism(x, 7, -7, 1.3, 1.3, 0.6, 12, '#50565c'); }
    for (const x of [-2.5, 2.5]) { mb.push(); mb.translate(x, 1.4, 7); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, 0, 0, 1.3, 1.3, 1, 16, '#2a2e32'); mb.pop(); gb.push(); gb.translate(x, 1.4, 6.45); gb.rotate(Math.PI / 2, 0, 0); gb.prism(0, 0, 0, 1.0, 1.0, 0.1, 16, '#c0e8ff'); gb.pop(); }
    gb.box(0, 7.6, -8.9, 2, 1.2, 0.1, '#ff3020');
    return { mesh: mb.build({ cull: false }), glow: gb.build({ unlit: true }) };
  });
  SET.apartment = () => once('apartment', () => {
    const mb = new MB(), gb = new MB();
    room(mb, 8, 3.2, 7, '#6a5020', '#4a2a3a');
    mb.box(-2.6, 1.6, -3.46, 2.2, 1.8, 0.06, '#1a1410'); gb.box(-2.6, 1.6, -3.44, 2.0, 1.6, 0.02, '#ff9030');
    for (const x of [-3.9, -1.3]) mb.box(x, 1.8, -3.3, 0.5, 3.0, 0.2, '#3a7a2a');
    mb.box(2.2, 0.45, -3.0, 1.6, 0.9, 0.8, '#5a3a20'); mb.box(2.2, 1.35, -3.0, 1.1, 0.9, 0.8, '#2a2622'); gb.box(2.2, 1.35, -2.58, 0.9, 0.7, 0.02, '#e0ffe0');
    mb.box(0.6, 0.45, -2.5, 0.6, 0.06, 0.6, '#6a4020'); mb.box(0.6, 0.9, -2.8, 0.6, 0.9, 0.06, '#6a4020'); for (const [x, z] of [[0.35, -2.25], [0.85, -2.25], [0.35, -2.75], [0.85, -2.75]]) mb.box(x, 0.22, z, 0.05, 0.45, 0.05, '#5a3018');
    mb.prism(1.2, 0, -3.1, 0.05, 0.05, 1.4, 6, '#3a3020'); gb.prism(1.2, 1.4, -3.1, 0.25, 0.1, 0.3, 8, '#ffe0a0');
    return { mesh: mb.build({ cull: false }), glow: gb.build({ unlit: true }) };
  });
  SET.bar = () => once('bar', () => {
    const mb = new MB(), gb = new MB(), r = K.rng('bar');
    room(mb, 12, 3.4, 9, '#5a4028', '#6a4a2a');
    mb.box(0, 0.55, -1.2, 8, 1.1, 0.8, '#7a4a22'); mb.box(0, 1.12, -1.2, 8.3, 0.08, 1.0, '#5a3418');
    for (let i = 0; i < 5; i++) { mb.prism(-3 + i * 1.5, 0, 0, 0.2, 0.2, 0.75, 8, '#3a3a3a'); mb.prism(-3 + i * 1.5, 0.75, 0, 0.3, 0.3, 0.08, 10, '#8a2a2a'); }
    for (let y = 1.4; y < 3; y += 0.6) { mb.box(0, y, -4.2, 6, 0.06, 0.4, '#4a2a12'); for (let x = -2.8; x < 2.8; x += 0.3) mb.box(x, y + 0.15, -4.2, 0.1, 0.3, 0.1, ['#3a6a2a', '#8a3a2a', '#c0a060', '#2a4a8a'][Math.floor(r() * 4)]); }
    mb.box(4.4, 0.7, 2.5, 1.2, 1.4, 2.0, '#3a2a4a'); gb.box(4.4, 1.3, 1.45, 1.0, 0.8, 0.05, '#ff80c0');
    for (const x of [-3, 0, 3]) gb.sphere(x, 3.0, 0, 0.18, 0.18, 0.18, '#ffd080', 6, 4);
    return { mesh: mb.build({ cull: false }), glow: gb.build({ unlit: true }) };
  });
  SET.moogle = () => once('moogleDoll', () => K.meshOf(mb => { mb.sphere(0, 1.1, 0, 0.8, 0.9, 0.75, '#e8e4ec', 10, 7); mb.sphere(0, 2.1, 0, 0.6, 0.55, 0.55, '#e8e4ec', 10, 7); mb.sphere(0, 2.9, 0, 0.14, 0.14, 0.14, '#e02040', 6, 4); mb.sweep([[0, 2.6, 0], [0, 2.85, 0]], 0.03, { sides: 4, color: '#303030' }); for (const s of [-1, 1]) mb.spike([s * 0.5, 2.4, 0], [s * 0.6, 1, 0], 0.5, 0.18, 5, '#e8e4ec'); mb.sphere(0, 2.0, 0.5, 0.14, 0.1, 0.1, '#e090a0', 6, 4); }));
  const debrisRain = (S, box, rate, c) => { for (let i = 0; i < rate; i++) S.fx.emit(1, { p: [box[0] + (Math.random() - 0.5) * box[3], box[1], box[2] + (Math.random() - 0.5) * box[4]], v: [0, -0.05, 0], vs: 0.03, life: 60, size: [0.25, 0.25], c0: c || '#3a3028', kind: 'smoke', grav: 0.012, alpha: 0.95, fadeIn: 0 }); };
  def('plate_fall', {
    music: null,
    sample: 'The charge detonates.\nThe great support pillar of Sector 7 buckles... and the plate above tilts, shudders, and falls.',
    shots: [
      // 0-3 s: on top of the pillar, a Turk sets the charge (its light blinking)
      { dur: 180, env: env('slums', { fog: { color: [0.05, 0.05, 0.04], near: 30, far: 260 }, light: { dir: [0.4, -0.6, -0.6], color: [0.55, 0.48, 0.38], ambient: [0.2, 0.18, 0.16] } }), fadeIn: 30,
        init(S) { S.pil = SET.pillar(); S.pu = SET.plateUnder(); S.r = S.add(K.actor('reno', { pos: [2, 52.4, -45.4], rotY: Math.PI * 0.95 })); K.pose(S.r, (m) => FF7.anims.kneel.fn(m)); },
        cam: (S, k) => ({ eye: LV([7, 54.5, -39], [6, 54.2, -40], k), at: [2.6, 53.2, -46.5], fov: 44, far: 600 }),
        draw(S) {
          K.put(S.pil, [0, 0, -60]); K.put(S.pu.mesh, [0, 60, -60]);
          K.put(K.once('bombBox', () => K.meshOf(mb => { mb.box(0, 0.35, 0, 0.9, 0.7, 0.5, '#3a3e44'); mb.box(0, 0.75, 0.1, 0.2, 0.1, 0.2, '#1a1a1a'); })), [2.8, 52.4, -46.8]);
          const bl = (S.f % 30) < 12 ? 1 : 0.15; S.glow([2.8, 53.2, -46.5], 0.6, '#ff2010', bl);
        } },
      // 3-10 s: looking up the pillar: the charge blows, fire and debris burst from the top
      { dur: 420, env: env('slums', { fog: { color: [0.06, 0.05, 0.04], near: 40, far: 320 } }),
        init(S) { S.pil = SET.pillar(); S.pu = SET.plateUnder(); S.sl = SET.slums(); },
        update(S, k) {
          const b = [5, 52, -48];
          if (S.cue('boom', k > 0.12)) { K.explode(S, b, 7, { n: 60, debris: 80 }); FF7.sceneMgr.doFlash('#fff0d0', 18, 0.7); S.sfx('bosskill'); }
          if (S.cue('boom2', k > 0.3)) { K.explode(S, [-4, 55, -52], 5, { n: 30 }); S.sfx('fire2'); }
          if (k > 0.12) { S.shake(Math.max(0.15, 1.2 - (k - 0.12) * 2)); K.fire(S, [b[0] + (Math.random() - 0.5) * 8, b[1], b[2]], 3.5, 2); if (S.f % 2 === 0) K.smokeCol(S, b, 5, 1, { c0: '#8a7e70', c1: '#3a3430' }); }
        },
        cam: (S, k) => ({ eye: [18, 8 + k * 2, -24], at: [3, 50, -52], fov: 52, far: 700 }),
        draw(S) { GL.draw(S.sl.mesh); GL.draw(S.sl.glow); K.put(S.pil, [0, 0, -60]); K.put(S.pu.mesh, [0, 60, -60]); for (const l of S.pu.lights) S.glow([l[0], 59.6, l[2] - 60], 5, '#ffd8a0', 0.45); } },
      // 10-13 s: from above: the pillar's crown, fire and a helicopter's searchlight
      { dur: 180, env: env('slums', { fog: { color: [0.2, 0.18, 0.1], near: 20, far: 160 } }),
        init(S) { S.pil = SET.pillar(); S.prewarm(80, 0.5); },
        update(S, k) { K.fire(S, [5 + (Math.random() - 0.5) * 6, 52, -48], 3, 2); if (S.f % 3 === 0) K.smokeCol(S, [4, 52, -50], 4, 1, { c0: '#9a9070' }); if (S.f % 40 === 0) K.explode(S, [(Math.random() - 0.5) * 20, 50, -60 + (Math.random() - 0.5) * 20], 3, { n: 12, debris: 10 }); },
        cam: (S, k) => ({ eye: LV([-10, 76, -34], [-6, 74, -38], k), at: [0, 50, -60], fov: 50, far: 500 }),
        draw(S, k) { K.put(S.pil, [0, 0, -60]); S.beam([-30, 90, -30], [4, 50, -52], 10, '#fff0b0', 0.25, 0.1); S.haze([0, 52, -60], 40, '#c0b060', 0.15); } },
      // 13-14 s: black
      { dur: 60, env: 'space', init(S) {}, cam: () => ({ eye: [0, 0, 0], at: [0, 0, -1] }), draw(S) {}, overlay(c) { c.fillStyle = '#000'; c.fillRect(0, 0, FF7.W, FF7.H); } },
      // 14-19 s: along the curved walkway around the pillar, the underside of the plate beyond
      { dur: 300, env: env('slums', { fog: { color: [0.07, 0.06, 0.05], near: 30, far: 300 } }),
        init(S) { S.sc = SET.scaffold(); S.pu = SET.plateUnder(); S.sl = SET.slums(); },
        update(S, k) { S.shake(0.12); if (S.f % 50 === 10) S.sfx('hit', 0.4); },
        cam: (S, k) => { const a = -1.1 + k * 0.5; return { eye: K.orbit([0, 0, -60], a, 29, 36.5), at: K.orbit([0, 0, -60], a + 0.9, 40, 34), fov: 56, far: 700 }; },
        draw(S) { GL.draw(S.sl.mesh); K.put(S.sc.mesh, [0, 0, -60]); for (const l of S.sc.lights) S.glow([l[0], l[1], l[2] - 60], 2.5, '#ffe0a0', 0.6); K.put(S.pu.mesh, [0, 64, -60]); for (const l of S.pu.lights) S.glow([l[0], 63.6, l[2] - 60], 5, '#ffd8a0', 0.4); } },
      // 19-23 s: a chain of explosions rips down the support
      { dur: 240, env: env('slums', { fog: { color: [0.07, 0.06, 0.05], near: 30, far: 300 } }),
        init(S) { S.sc = SET.scaffold(); S.pu = SET.plateUnder(); S.sl = SET.slums(); },
        update(S, k) {
          S.shake(0.5);
          if (S.f % 18 === 0) { const a = -0.6 + Math.random() * 0.8, y = 60 - k * 40 - Math.random() * 10; K.explode(S, K.orbit([0, 0, -60], a, 27, y), 3.5, { n: 18, debris: 16 }); S.sfx('fire2', 0.6); }
        },
        cam: (S, k) => ({ eye: K.orbit([0, 0, -60], -0.2, 78, 12), at: [0, 40 - k * 10, -60], fov: 52, far: 700 }),
        draw(S) { GL.draw(S.sl.mesh); K.put(S.sc.mesh, [0, 0, -60]); for (const l of S.sc.lights) S.glow([l[0], l[1], l[2] - 60], 2.5, '#ffe0a0', 0.6); K.put(S.pu.mesh, [0, 64, -60]); } },
      // 23-26 s: in a Shinra control room the plate release is running
      { dur: 180, env: env('midgar', { stars: 0, fog: null, light: { dir: [0, -1, 0.3], color: [0.4, 0.5, 0.48], ambient: [0.26, 0.3, 0.3] } }),
        init(S) { S.cr = SET.control(); },
        cam: (S, k) => ({ eye: [L(-1, 1, k), 2.6, 8.4], at: [0, 2.2, -6], fov: 56 }),
        draw(S) { GL.draw(S.cr.mesh); GL.draw(S.cr.glow); const bl = (S.f % 40) < 20 ? 0.9 : 0.2; S.glow([0, 7.6, -8.5], 3, '#ff3020', bl); for (const x of [-2.5, 2.5]) S.glow([x, 1.4, 6.3], 3, '#c0e8ff', 0.6); } },
      // 26-31 s: a slum apartment: the TV flickers, fire beyond the window, everything shakes
      { dur: 300, env: env('slums', { stars: 0, fog: null, light: { dir: [0.5, -0.3, 0.8], color: [0.9, 0.55, 0.25], ambient: [0.3, 0.24, 0.2] } }),
        init(S) { S.ap = SET.apartment(); },
        update(S, k) { S.shake(0.05 + k * 0.1); if (S.cue('r', k > 0.3)) S.sfx('falling', 0.5); },
        cam: (S, k) => ({ eye: [L(-1.2, -0.6, k), 1.4, 2.9], at: [0.4, 1.2, -3.2], fov: 56 }),
        draw(S, k) { GL.draw(S.ap.mesh); GL.draw(S.ap.glow, null, { tint: [1, 1, 1, 1], add: [Math.random() * 0.1, Math.random() * 0.05, 0] }); S.glow([-2.6, 1.6, -3.3], 3.5, '#ff8020', 0.4 + Math.random() * 0.2); S.glow([2.2, 1.35, -2.5], 1.5, '#d0ffd0', (S.f % 7) < 4 ? 0.5 : 0.25); S.glow([1.2, 1.5, -3.0], 1.2, '#ffe0a0', 0.5); } },
      // 31-36 s: the bar: bottles rattle, dust pours from the ceiling
      { dur: 300, env: env('slums', { stars: 0, fog: null, light: { dir: [0.3, -0.8, 0.4], color: [0.75, 0.6, 0.4], ambient: [0.3, 0.26, 0.2] } }),
        init(S) { S.b = SET.bar(); },
        update(S, k) { S.shake(0.08 + k * 0.2); debrisRain(S, [0, 3.3, -1, 10, 7], 1 + Math.floor(k * 3)); if (S.f % 3 === 0) S.fx.emit(1, { p: [(Math.random() - 0.5) * 10, 3.3, (Math.random() - 0.5) * 6], v: [0, -0.03, 0], life: 120, size: [0.4, 1.6], c0: '#8a7a68', kind: 'smoke', alpha: 0.3 }); },
        cam: (S, k) => ({ eye: [L(-3.5, -2.5, k), 2.1, 3.5], at: [0.5, 1.3, -2.5], fov: 56 }),
        draw(S) { GL.draw(S.b.mesh); GL.draw(S.b.glow); for (const x of [-3, 0, 3]) S.glow([x, 3.0, 0], 1.6, '#ffd080', 0.5); } },
      // 36-38 s: black
      { dur: 120, env: 'space', cam: () => ({ eye: [0, 0, 0], at: [0, 0, -1] }), draw(S) {}, overlay(c) { c.fillStyle = '#000'; c.fillRect(0, 0, FF7.W, FF7.H); } },
      // 38-44 s: the shacks of the slums; the ceiling of the world comes down in fire
      { dur: 360, env: env('slums', { fog: { color: [0.14, 0.12, 0.1], near: 10, far: 90 } }),
        init(S) { S.sl = SET.slums(); S.mg = SET.moogle(); },
        update(S, k) {
          S.shake(0.15 + k * 0.6);
          debrisRain(S, [4, 14, 16, 30, 20], 2 + Math.floor(k * 6), '#2a2622');
          if (S.cue('b1', k > 0.55)) { K.explode(S, [2, 3, 12], 6, { n: 50, debris: 60 }); S.sfx('bosskill'); FF7.sceneMgr.doFlash('#ffd0a0', 20, 0.5); }
          if (k > 0.55) K.fire(S, [(Math.random() - 0.5) * 20, 1, 12 + Math.random() * 6], 2.5, 3);
        },
        cam: (S, k) => ({ eye: [L(-6, -4, k), 2.2, 26], at: [2, 3, 14], fov: 52, far: 300 }),
        draw(S) { GL.draw(S.sl.mesh); GL.draw(S.sl.glow); K.put(S.mg, [-2.5, 0, 20], [0, 0.6, 0]); } },
      // 44-59 s: from above, the Sector 7 plate breaks away and falls between the reactors; from the helicopter...
      { dur: 900, env: env('midgar', { fog: { color: [0.08, 0.08, 0.08], near: 60, far: 700 } }),
        init(S) { S.city = SET.midgar({ omit: [7] }); S.w7 = SET.midgar({ only: 7 }); S.a = K.actor('aeris', {}); S.a.scale = 1.72 / 25; K.pose(S.a, (m) => { m.b('head').rot[0] = 0.4; m.b('armR').rot[0] = -0.6; m.b('foreR').rot[0] = -0.8; }); S.add(S.a); S.a.manual = true; },
        update(S, k) {
          const u = seg(k, 0.05, 0.6);
          S.tilt = -0.13 * easeIn(u); S.drop = (MID.PH - 0.6) * easeIn(u) * 0.8;
          S.shake(0.08 + bump(k, 0.2, 0.9) * 0.3);
          if (S.f % 10 === 0 && k < 0.8) { const th = S7 + (Math.random() - 0.5) * 0.7, rr = MID.HUB + 2 + Math.random() * (MID.PR - MID.HUB - 2); K.explode(S, P(rr, th, MID.PH - S.drop * 0.8), 1.4, { n: 10, debris: 6 }); }
          if (k > 0.45) for (let i = 0; i < 2; i++) { const th = S7 + (Math.random() - 0.5) * 0.7, rr = MID.HUB + 2 + Math.random() * 30; K.dust(S, P(rr, th, 1), 2, 1, { v: [0, 0.05, 0], life: 300, c0: '#8a7a6a', c1: '#4a4440', alpha: 0.4 }); }
          if (S.cue('crash', k > 0.6)) { S.sfx('bosskill'); FF7.sceneMgr.doFlash('#a09080', 20, 0.4); }
        },
        cam: (S, k) => { const c = P(24, S7, MID.PH); const e = seg(k, 0.7, 1); return { eye: [c[0] + 14 - e * 4, 58 - e * 26, c[2] + 18 - e * 4], at: [c[0], 0, c[2]], fov: 44, near: 0.02, far: 900, roll: 0.25 }; },
        draw(S, k) {
          K.drawMidgar(S, S.city, { steam: 0.6 });
          const Mw = wedgeMatrix(S.tilt, S.drop);
          GL.draw(S.w7.mesh, Mw); GL.draw(S.w7.blocks, Mw, { unlit: true, tex: K.TEXW.night, texOpts: { repeat: true }, tint: [1 - k * 0.6, 1 - k * 0.6, 1 - k * 0.6, 1] });
          const e = seg(k, 0.72, 1);
          if (e > 0) {
            // inside the helicopter: Aeris at the window (1/25 scale, next to the camera)
            const cam = K.CAM, off = V.add(V.add(V.scale(cam.fwd, 0.16), V.scale(cam.right, 0.06)), V.scale(cam.up, -0.1));
            S.a.position = V.add(cam.eye, off); S.a.rotY = Math.atan2(cam.fwd[0], cam.fwd[2]); S.a.draw();
          }
        } },
      // 59-70 s: the Shinra building from below, searchlights raking the clouds
      { dur: 660, env: env('midgar', { fog: { color: [0.06, 0.1, 0.1], near: 200, far: 1600 } }), dissolve: 40, fadeOut: 120,
        init(S) { S.hq = SET.hq(); },
        cam: (S, k) => ({ eye: [34, 3, 62], at: [0, L(210, 240, k), -4], fov: 54, far: 2000 }),
        draw(S) {
          GL.draw(S.hq.tower); GL.draw(S.hq.mesh); GL.draw(S.hq.glow);
          const t = S.f * 0.01;
          for (let i = 0; i < 4; i++) { const b = [(i - 1.5) * 18, 28, 26]; const a = t + i * 1.7; const tip = [b[0] + Math.sin(a) * 160, 420, b[2] + Math.cos(a * 0.7) * 120]; S.ribbon([b, tip], [3, 60], [[0.9, 1, 0.9, 0.25], [0.9, 1, 0.9, 0]]); }
          for (let i = 0; i < 10; i++) S.haze([Math.sin(i * 1.9) * 200, 320 + (i % 3) * 60, -100 + Math.cos(i * 2.7) * 200], 260, '#30604a', 0.12, i);
          S.glow(S.hq.top, 8, '#ff2010', (S.f % 60) < 30 ? 0.9 : 0.2);
        } },
    ],
  });
})();

(function () {
  const U = FF7.util, V = FF7.V3, M4 = FF7.M4;
  const CIN = FF7.cinema, K = CIN.K, SET = K.SET, TAU = K.TAU, L = K.L;
  const { ease, easeIn, easeOut, seg, bump, LV, path } = K;
  const GL = FF7.GL, def = CIN.def, env = K.envOf, walkTo = K.walkTo;
  const MID = SET.MID, P = K.polar;
  const soldier = (c) => ({ base: 'soldier', top: c || '#3a5a9a', sleeve: c || '#3a5a9a', bottom: c || '#3a5a9a', weapon: 'rifle' });
  K.soldierApp = soldier;

  // Motorcycle rider pose (hips on the seat, hands on the bars)
  K.ridePose = function (m, lean) {
    return K.pose(m, (mm) => {
      mm.b('hips').pos[1] -= 0.09;
      mm.b('thighL').rot[0] = -1.25; mm.b('thighR').rot[0] = -1.25; mm.b('thighL').rot[2] = 0.18; mm.b('thighR').rot[2] = -0.18;
      mm.b('shinL').rot[0] = 1.25; mm.b('shinR').rot[0] = 1.25;
      mm.b('torso').rot[0] = 0.45 + (lean || 0);
      mm.b('armL').rot[0] = -1.05; mm.b('armR').rot[0] = -1.05; mm.b('armL').rot[2] = 0.12; mm.b('armR').rot[2] = -0.12;
      mm.b('foreL').rot[0] = -0.35; mm.b('foreR').rot[0] = -0.35;
      mm.b('head').rot[0] = -0.35;
    });
  };
  // Bike + rider pair
  K.bike = function (who) {
    const b = K.veh('motorcycle', { len: 2.2 });
    const r = who ? K.ridePose(K.actor(who), 0) : null;
    return { bike: b, rider: r, pos: [0, 0, 0], rotY: 0, lean: 0, manual: true,
      update() { if (this.rider) this.rider.update(1); },
      draw() {
        this.bike.position = this.pos; this.bike.rotY = this.rotY; this.bike.rotZ = this.lean; this.bike.draw();
        if (this.rider) {
          const f = [Math.sin(this.rotY), 0, Math.cos(this.rotY)];
          this.rider.position = [this.pos[0] - f[0] * 0.3, this.pos[1] + 0.02, this.pos[2] - f[2] * 0.3];
          this.rider.rotY = this.rotY; this.rider.rotZ = this.lean; this.rider.draw();
        }
      } };
  };

  // ================================================================== SHINRA HQ ESCAPE
  def('shinra_escape', {
    music: 'motorcycle', carry: true,
    sample: 'Cloud guns the Hardy-Daytona and smashes through the showroom glass,\nthe truck roaring right behind him.\nThey land on the Midgar expressway, with Shinra bikers in hot pursuit...',
    shots: [
      // 1. the tower; the showroom window bursts
      { dur: 280, env: 'midgar', fadeIn: 30,
        init(S) { S.hq = SET.hq(); S.hw = SET.highway(); S.b = K.bike('cloud'); S.add(S.b); },
        update(S, k) {
          if (S.cue('crash', k > 0.72)) { S.sfx('hit'); S.sfx('run_attack'); S.fx.emit(90, { p: [0, 12.5, 30.4], spread: [6, 2, 0.2], v: [0, 0.05, 0.25], vs: 0.18, life: 70, size: [0.25, 0.15], c0: '#e0f0ff', c1: '#80a0c0', kind: 'core', grav: 0.012 }); }
          const u = seg(k, 0.72, 1);
          S.b.pos = [0, 11 + Math.sin(u * Math.PI) * 2.5, 28 + u * 14]; S.b.rotY = 0; S.b.lean = 0;
          S.b.bike.rotX = -0.2 * (1 - u);
        },
        cam: (S, k) => { const e = ease(seg(k, 0, 0.7)); return { eye: [L(26, 22, e), L(1.7, 19, e), L(112, 74, e)], at: [0, L(250, 13, e), L(-4, 30, e)], fov: 50, far: 1400 }; },
        draw(S, k) {
          GL.draw(S.hq.tower); GL.draw(S.hq.mesh); GL.draw(S.hq.glow, null, k > 0.72 ? { tint: [0.6, 0.65, 0.7, 1] } : undefined);
          K.put(S.hw.mesh, [0, 0, 44]);
          for (const p of S.hq.lamps) S.glow(p, 4, '#ffe0b0', 0.5);
          if (k > 0.72) S.b.draw();
        } },
      // 2. the bike and the truck fly out and land on the expressway
      { dur: 300, env: 'midgar',
        init(S) { S.hq = SET.hq(); S.hw = SET.highway(); S.b = K.bike('cloud'); S.add(S.b); S.t = K.veh('truck', { len: 7 }); },
        update(S, k) {
          const u = seg(k, 0, 0.35);
          if (k < 0.35) { S.b.pos = [-2, 11.5 + Math.sin(u * Math.PI) * 4 + u * 2.5, 30 + u * 12]; S.b.rotY = 0; S.b.bike.rotX = -0.25 + u * 0.4; }
          else { const v = seg(k, 0.35, 1); S.b.pos = [-2 + easeIn(v) * 60, 14.05, 42 + Math.min(1, v * 4) * 2]; S.b.rotY = L(0, Math.PI / 2, Math.min(1, v * 3)); S.b.bike.rotX = 0; S.b.lean = -0.3 * bump(v, 0, 0.4); }
          if (S.cue('land', k > 0.35)) { S.sfx('hit'); S.fx.emit(30, { p: [-2, 14.1, 42], spread: 0.5, v: [0, 0.08, 0], vs: 0.1, life: 30, size: [0.2, 0.08], c0: '#fff0a0', c1: '#ff7020', kind: 'core', grav: 0.01 }); }
          const w = seg(k, 0.4, 0.75);
          if (k > 0.4) { S.t.position = [8, 11 + Math.sin(w * Math.PI) * 3.5 + w * 3.1, 26 + w * 20]; S.t.rotX = -0.2 + w * 0.3; S.t.rotY = 0; }
          if (k > 0.75) { const v = seg(k, 0.75, 1); S.t.position = [8 + easeIn(v) * 40, 14.1, 46]; S.t.rotY = L(0, Math.PI / 2, Math.min(1, v * 2)); S.t.rotX = 0; }
          if (S.cue('tland', k > 0.75)) { S.sfx('bosskill', 0.6); S.shake(0.6); S.fx.emit(60, { p: [8, 14.2, 46], spread: 2, v: [0, 0.1, 0], vs: 0.15, life: 40, size: [0.25, 0.1], c0: '#fff0a0', c1: '#ff6010', kind: 'core', grav: 0.012 }); }
          if (k > 0.75 && k < 0.85) S.shake(0.4);
        },
        cam: (S, k) => ({ eye: LV([24, 16.5, 58], [22, 16, 66], ease(k)), at: LV([-1, 13.5, 36], [16, 14, 44], ease(k)), fov: 46, far: 1400 }),
        draw(S, k) {
          GL.draw(S.hq.tower); GL.draw(S.hq.mesh); GL.draw(S.hq.glow, null, { tint: [0.6, 0.65, 0.7, 1] });
          K.put(S.hw.mesh, [0, 0, 44]); if (S.hw.city) GL.draw(S.hw.city, K.mat([0, 0, 44]));
          for (const p of S.hq.lamps) S.glow(p, 4, '#ffe0b0', 0.5);
          for (const l of S.hw.lamps) S.glow([l[0], l[1], l[2] + 44], 4, '#ffe8c0', 0.5);
          S.b.draw(); if (k > 0.4) S.t.draw();
          const hp = V.add(S.b.pos, [Math.sin(S.b.rotY) * 1.1, 1.0, Math.cos(S.b.rotY) * 1.1]); S.glow(hp, 1.2, '#fff4d0', 0.8);
        } },
      // 3. down the expressway, Shinra bikers closing in
      { dur: 380, env: 'midgar', fadeOut: 50,
        init(S) {
          S.hw = SET.highway(); S.b = K.bike('cloud'); S.add(S.b); S.t = K.veh('truck', { len: 7 });
          S.en = [0, 1, 2].map(() => { const e = K.bike(soldier('#6a2a2a')); S.add(e); return e; });
        },
        update(S, k) {
          const x = -300 + S.f * 1.1;
          S.x = x;
          S.b.pos = [x, 14.05, 44 + 2 + Math.sin(S.f * 0.03) * 1.5]; S.b.rotY = Math.PI / 2; S.b.lean = Math.cos(S.f * 0.03) * -0.12;
          S.t.position = [x - 9, 14.05, 44 - 3]; S.t.rotY = Math.PI / 2;
          S.en.forEach((e, i) => { e.pos = [x - 34 + ease(seg(k, 0.05 + i * 0.1, 0.8)) * (24 - i * 3), 14.05, 44 + [5.5, -5.5, 1][i]]; e.rotY = Math.PI / 2; e.lean = Math.sin(S.f * 0.05 + i) * 0.1; });
          if (S.cue('eng', k > 0.2)) S.sfx('run');
        },
        cam: (S, k) => { const x = S.x || -300; return { eye: [x + 9 - k * 3, 15.4, 44 + 5.5], at: [x - 6, 14.8, 44], fov: 52, far: 1400 }; },
        draw(S, k) {
          K.put(S.hw.mesh, [0, 0, 44]); if (S.hw.city) GL.draw(S.hw.city, K.mat([0, 0, 44]));
          for (const l of S.hw.lamps) S.glow([l[0], l[1], l[2] + 44], 4, '#ffe8c0', 0.5);
          S.b.draw(); S.t.draw();
          for (const e of S.en) { e.draw(); S.glow(V.add(e.pos, [1.1, 1.0, 0]), 1.3, '#fff4d0', 0.8); }
          S.glow(V.add(S.t.position, [-3.6, 1.2, 0.8]), 0.8, '#ff2010', 0.7); S.glow(V.add(S.t.position, [-3.6, 1.2, -0.8]), 0.8, '#ff2010', 0.7);
        } },
    ],
  });

  // ================================================================== LEAVING MIDGAR
  SET.wasteland = () => K.once('wasteland', () => {
    const mb = new FF7.MeshBuilder(), r = K.rng('waste');
    const h = (x, z) => (K.vnoise(x / 180, z / 180, 4) - 0.5) * 18 + (K.vnoise(x / 40, z / 40, 7) - 0.5) * 3 - Math.max(0, 1 - Math.hypot(x, z) / 60) * 1.5;
    K.terrain(mb, -1600, -1600, 1600, 1600, 48, 48, h, (x, z, y) => U.shade(U.mix('#7a6448', '#a08a60', K.vnoise(x / 90, z / 90, 2)), y * 0.01 + (U.hash(Math.round(x / 60), Math.round(z / 60), 5) - 0.5) * 0.08));
    for (let i = 0; i < 140; i++) { const x = (r() - 0.5) * 900, z = (r() - 0.5) * 900; mb.sphere(x, h(x, z), z, 1 + r() * 5, 0.6 + r() * 3, 1 + r() * 5, U.shade('#6a5a48', (r() - 0.5) * 0.3), 6, 4, false); }
    return { mesh: mb.build(), h };
  });
  const PARTY5 = ['cloud', 'tifa', 'barret', 'aeris', 'redxiii'];
  def('leave_midgar', {
    music: 'worldmap', carry: true,
    sample: 'The party drops from the broken end of the highway\nand walks out across the wasteland,\nleaving the great city of Midgar behind them.',
    grade: { tint: '#fff0e4', vignette: 0.5 },
    shots: [
      // 0. Cloud at the edge of the broken expressway, dawn wind on his face
      { dur: 240, env: env('dawn', { sun: { dir: [1, 0.07, 0.35], color: '#ffc080', size: 0.1 }, light: { dir: [-0.9, -0.25, -0.3], color: [1.0, 0.72, 0.5], ambient: [0.3, 0.28, 0.34] } }), fadeIn: 40,
        init(S) { S.hw = SET.highway(true); S.w = SET.wasteland(); S.c = S.add(K.actor('cloud', { pos: [-1.5, 14.05, 0], rotY: Math.PI / 2 })); K.pose(S.c, (m) => { m.b('head').rot[1] = Math.sin(S.f * 0.01) * 0.05; }); },
        cam: (S, k) => ({ eye: LV([1.1, 15.7, 0.9], [0.9, 15.75, 0.6], ease(k)), at: [-1.5, 15.6, 0], fov: 34, far: 3000 }),
        draw(S) { GL.draw(S.w.mesh); K.put(S.hw.mesh); K.put(S.hw.end); } },
      // 1. the broken end of the expressway at dawn
      { dur: 300, env: env('dawn', { sun: { dir: [1, 0.07, 0.35], color: '#ffc080', size: 0.1 } }), dissolve: 30,
        init(S) {
          S.hw = SET.highway(true); S.w = SET.wasteland();
          S.p = PARTY5.map((id, i) => S.add(K.actor(id, { pos: [-3 - (i % 2) * 1.2, 14.05, -4 + i * 2.1], rotY: Math.PI / 2 })));
        },
        cam: (S, k) => ({ eye: LV([-22, 15.8, 1.5], [-15, 16.4, 2.5], ease(k)), at: [40, 11, 0], fov: 50, far: 3000 }),
        draw(S) { GL.draw(S.w.mesh); K.put(S.hw.mesh); K.put(S.hw.end); } },
      // 2. walking out onto the plains, Midgar looming behind
      { dur: 460, env: env('wasteland', { fog: { color: [0.8, 0.72, 0.6], near: 400, far: 14000 }, sun: { dir: [0.6, 0.25, 0.8], color: '#fff0c0', size: 0.18 } }), dissolve: 40,
        init(S) {
          S.w = SET.wasteland(); S.city = SET.midgar({});
          S.p = PARTY5.map((id, i) => S.add(K.actor(id, { anim: id === 'redxiii' ? 'q_walk' : 'walk' })));
        },
        update(S, k) {
          const z = -6 + S.f * 0.028;
          S.p.forEach((m, i) => { const x = (i - 2) * 1.5 + Math.sin(i * 2.1) * 0.4, zz = z - Math.abs(i - 2) * 0.8 + (i === 4 ? 0.6 : 0); m.position = [x, S.w.h(x, zz), zz]; m.rotY = 0; });
        },
        cam: (S, k) => { const e = ease(k); const z = -6 + S.f * 0.028; return { eye: [L(1.5, 5, e), S.w.h(0, z + 8) + L(1.2, 5.5, e), z + L(7, 16, e)], at: [0, S.w.h(0, z) + L(1.3, 4, e), z - L(0, 14, e)], fov: 46, far: 2500, farNear: 200, farFar: 30000 }; },
        drawFar(S) { K.drawMidgar(S, S.city, { day: true, matrix: K.mat([0, -8, -3200], [0, 0.3, 0], 25), noGlow: true }); },
        draw(S) { GL.draw(S.w.mesh); } },
      // 3. very wide: small figures on the plains, the city on the horizon
      { dur: 380, env: env('wasteland', { fog: { color: [0.8, 0.72, 0.6], near: 400, far: 14000 }, sun: { dir: [0.6, 0.25, 0.8], color: '#fff0c0', size: 0.18 } }), dissolve: 40, fadeOut: 60,
        init(S) {
          S.w = SET.wasteland(); S.city = SET.midgar({});
          S.p = PARTY5.map((id, i) => S.add(K.actor(id, { anim: id === 'redxiii' ? 'q_walk' : 'walk' })));
        },
        update(S, k) {
          const z = 8 + S.f * 0.028;
          S.p.forEach((m, i) => { const x = (i - 2) * 1.5, zz = z - Math.abs(i - 2) * 0.8; m.position = [x, S.w.h(x, zz), zz]; m.rotY = 0; });
        },
        cam: (S, k) => ({ eye: LV([22, 14, 60], [40, 44, 120], ease(k)), at: LV([0, 2, 10], [0, 30, -400], ease(k)), fov: 44, far: 3000, farNear: 200, farFar: 30000 }),
        drawFar(S) { K.drawMidgar(S, S.city, { day: true, matrix: K.mat([0, -8, -3200], [0, 0.3, 0], 25), noGlow: true }); },
        draw(S) { GL.draw(S.w.mesh); } },
    ],
  });
})();

// ----------------------------------------------------------------------------- Disc 1 (after Midgar)
(function () {
  const U = FF7.util, V = FF7.V3, M4 = FF7.M4, MB = FF7.MeshBuilder;
  const CIN = FF7.cinema, K = CIN.K, SET = K.SET, TAU = K.TAU, L = K.L;
  const { ease, easeIn, easeOut, seg, bump, LV, path } = K;
  const GL = FF7.GL, def = CIN.def, env = K.envOf, walkTo = K.walkTo;
  const sh = U.shade, once = K.once;

  // ------------------------------------------------------------------ shared outdoor pieces
  // Flat water disc (radius R) with gentle colour variation; opts.alpha for a translucent surface
  SET.water = (c1, c2, R, key) => once('water' + (key || c1 + c2 + R), () => {
    const mb = new MB();
    K.groundDisc(mb, R, (rr, a) => U.mix(c1, c2, K.clamp01 ? Math.min(1, rr / R) : rr / R), 18, 48, 0, 9);
    return mb.build();
  });
  // Pine / palm / broadleaf trees
  K.tree = function (mb, x, y, z, h, kind, r) {
    if (kind === 'palm') {
      const lean = (r() - 0.5) * 0.5;
      const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([x + Math.sin(t * 1.4) * lean * h * 0.4, y + t * h, z]); }
      mb.sweep(pts, [0.35, 0.3, 0.28, 0.25, 0.22, 0.2, 0.18].map(v => v * h / 10), { sides: 6, color: '#8a6a40' });
      const top = pts[pts.length - 1];
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + r(); mb.blade(top, [Math.cos(a), -0.35, Math.sin(a)], h * 0.45, h * 0.12, 0.05, '#3a7a2a', null, '#5a9a3a'); }
    } else if (kind === 'pine') {
      mb.prism(x, y, z, h * 0.04, h * 0.03, h * 0.3, 5, '#4a3020');
      for (let k = 0; k < 3; k++) mb.prism(x, y + h * (0.22 + k * 0.24), z, h * (0.3 - k * 0.07), 0, h * 0.42, 7, sh('#2a4a2a', (r() - 0.5) * 0.2));
    } else {
      mb.prism(x, y, z, h * 0.06, h * 0.045, h * 0.5, 6, '#5a4028');
      for (let k = 0; k < 3; k++) mb.sphere(x + (r() - 0.5) * h * 0.25, y + h * (0.6 + r() * 0.25), z + (r() - 0.5) * h * 0.25, h * (0.22 + r() * 0.12), h * (0.18 + r() * 0.1), h * (0.22 + r() * 0.12), sh(kind === 'jungle' ? '#2a5a22' : '#3a6a2a', (r() - 0.5) * 0.25), 7, 5, false);
    }
  };
  K.firework = function (S, p, c, s = 1) {
    const cc = c || ['#ff4060', '#40c0ff', '#ffe040', '#60ff80', '#ff80ff', '#ffffff'][Math.floor(Math.random() * 6)];
    S.fx.emit(70, { p, v: [0, 0, 0], vs: s * 0.35, life: 70, size: [s * 1.2, s * 0.4], c0: '#ffffff', c1: cc, kind: 'core', grav: s * 0.004, drag: 0.965, fadeIn: 0 });
    S.fx.emit(1, { p, life: 24, size: [s * 30, s * 50], c0: cc, kind: 'glow', alpha: 0.5, fadeIn: 0 });
  };

  // ================================================================== NIBELHEIM IN FLAMES
  SET.nibelheim = () => once('nibel', () => {
    const mb = new MB(), r = K.rng('nibel');
    K.terrain(mb, -300, -300, 300, 300, 30, 30, (x, z) => { const d = Math.hypot(x, z); return d < 60 ? 0 : (d - 60) * 0.25 * (0.6 + K.vnoise(x / 60, z / 60, 3)); }, (x, z, y) => y > 8 ? sh('#4a4a44', (K.vnoise(x / 30, z / 30, 1) - 0.5) * 0.2) : sh('#6a5a44', (K.vnoise(x / 20, z / 20, 2) - 0.5) * 0.2));
    // water tower in the square
    for (const [x, z] of [[-2.2, -2.2], [2.2, -2.2], [2.2, 2.2], [-2.2, 2.2]]) mb.box(x, 4.5, z, 0.45, 9, 0.45, '#5a4430');
    for (const y of [3, 6]) { mb.box(0, y, -2.2, 4.6, 0.25, 0.25, '#5a4430'); mb.box(0, y, 2.2, 4.6, 0.25, 0.25, '#5a4430'); mb.box(-2.2, y, 0, 0.25, 0.25, 4.6, '#5a4430'); mb.box(2.2, y, 0, 0.25, 0.25, 4.6, '#5a4430'); }
    mb.prism(0, 9, 0, 3.1, 3.1, 3.4, 12, '#6a5238', true);
    mb.prism(0, 12.4, 0, 3.5, 0.2, 2.2, 12, '#4a3a2c', true);
    mb.box(0, 8.9, 0, 6.8, 0.3, 6.8, '#4a3828');
    // houses around the square
    const houses = [];
    const N = 10;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU + 0.2;
      if (Math.abs(Math.sin(a) + 0.95) < 0.25 && Math.cos(a) > 0.6) continue;
      const rr = 24 + r() * 6, x = Math.sin(a) * rr, z = Math.cos(a) * rr, w = 7 + r() * 3, d = 6 + r() * 2, h = 4.5 + r() * 2;
      mb.push(); mb.translate(x, 0, z); mb.rotate(0, a + Math.PI, 0);
      mb.box(0, h / 2, 0, w, h, d, sh(['#9a8a74', '#8a7a64', '#a09080'][i % 3], (r() - 0.5) * 0.1));
      mb.frustum(0, h, 0, w + 0.8, d + 0.8, w + 0.8, 0.3, 3, sh('#5a3a2a', (r() - 0.5) * 0.15));
      mb.box(w * 0.3, h + 2.4, 0, 0.8, 2, 0.8, '#6a6258');
      mb.box(0, 1.1, d / 2 + 0.02, 1.2, 2.2, 0.06, '#3a2818');
      for (const wx of [-w * 0.3, w * 0.3]) mb.box(wx, h * 0.55, d / 2 + 0.02, 1.0, 1.0, 0.06, '#2a2420');
      mb.pop();
      houses.push({ p: [x, 0, z], w, h, a });
    }
    // the Shinra mansion on the rise behind
    mb.push(); mb.translate(0, 0, -62); mb.box(0, 6, 0, 30, 12, 14, '#7a6a5a'); mb.frustum(0, 12, 0, 31, 15, 31, 1, 6, '#3a2a2a'); for (const x of [-12, 12]) { mb.box(x, 9, 0, 6, 18, 16, '#7a6a5a'); mb.frustum(x, 18, 0, 7, 17, 0.5, 0.5, 5, '#3a2a2a'); } mb.pop();
    // Mt. Nibel
    for (let i = 0; i < 7; i++) { const a = -0.8 + i * 0.28; mb.prism(Math.sin(a) * 420, -2, -Math.cos(a) * 420, 140 + r() * 60, 10, 160 + r() * 120, 8, sh('#3a3a3a', (r() - 0.5) * 0.2)); }
    return { mesh: mb.build(), houses };
  });
  def('nibel_fire', {
    music: 'nightmare',
    sample: "I ran after him. When I got outside...\nNibelheim was on fire.\n\nThe houses I grew up with were burning,\nand walking through the flames was Sephiroth.",
    shots: [
      // 1. the village burning, the water tower silhouetted
      { dur: 320, env: 'fire', fadeIn: 40,
        init(S) { S.n = SET.nibelheim(); S.prewarm(160); },
        update(S, k) {
          for (const h of S.n.houses) {
            const c = [h.p[0], h.h + 1.5, h.p[2]];
            K.fire(S, [c[0] + (Math.random() - 0.5) * h.w, c[1] + Math.random() * 2, c[2] + (Math.random() - 0.5) * 3], 3.2, 1, { w: 0.8 });
            if (S.f % 3 === 0) K.smokeCol(S, [c[0], c[1] + 4, c[2]], 4, 1, { v: [0.02, 0.12, 0], c0: '#4a2a1a', c1: '#1a1210', alpha: 0.5 });
            if (Math.random() < 0.08) S.fx.emit(2, { p: c, spread: 3, v: [0, 0.15, 0], vs: 0.08, life: 90, size: [0.25, 0.1], c0: '#ffe080', c1: '#ff4000', kind: 'core', grav: -0.001 });
          }
        },
        cam: (S, k) => ({ eye: LV([30, 5, 48], [18, 7, 36], ease(k)), at: [0, 7, 0], fov: 50, far: 900 }),
        draw(S) { GL.draw(S.n.mesh); for (const h of S.n.houses) S.glow([h.p[0], h.h, h.p[2]], 26, '#ff6010', 0.2); } },
      // 2. Sephiroth walks through the flames
      { dur: 380, env: 'fire', dissolve: 40,
        init(S) {
          S.n = SET.nibelheim();
          S.s = S.add(K.actor('sephiroth', { anim: 'walk', weapon: true }));
          K.pose(S.s, (m) => { m.b('armR').rot[0] = -0.15; m.b('armR').rot[2] = -0.25; m.b('foreR').rot[0] = -0.2; });
          S.prewarm(100);
        },
        update(S, k) {
          const w = seg(k, 0, 0.8);
          S.s.position = [L(-2, -14, w), 0, L(8, 24, w)]; S.s.rotY = Math.atan2(-12, 16);
          if (k > 0.8) { S.s.play('idle'); }
          for (let i = 0; i < 5; i++) K.fire(S, [(Math.random() - 0.5) * 40 - 8, Math.random() * 1.5, 14 + Math.random() * 24], 3, 1, { w: 1 });
          for (const h of S.n.houses) K.fire(S, [h.p[0] + (Math.random() - 0.5) * h.w, h.h + 1.5, h.p[2]], 3, 1, { w: 0.8 });
          if (S.f % 3 === 0) K.smokeCol(S, [-8 + (Math.random() - 0.5) * 30, 6, 28], 5, 1, { v: [0.02, 0.1, 0], c0: '#4a2a1a', c1: '#1a1210', alpha: 0.45 });
        },
        cam: (S, k) => ({ eye: LV([10, 1.5, 0], [4, 1.8, 6], ease(k)), at: V.add(S.s.position, [0, 1.8, 0]), fov: 42, far: 700 }),
        draw(S) { GL.draw(S.n.mesh); } },
      // 3. he turns; his face in the firelight
      { dur: 300, env: env('fire', { light: { dir: [0.4, -0.2, -0.9], color: [1.0, 0.55, 0.25], ambient: [0.3, 0.14, 0.08], dir2: [-0.6, 0.1, 0.8], color2: [0.7, 0.25, 0.08] } }), fadeOut: 60,
        init(S) {
          S.n = SET.nibelheim();
          S.s = S.add(K.actor('sephiroth', { weapon: true, pos: [-14, 0, 24], rotY: Math.atan2(-12, 16) }));
          K.pose(S.s, (m) => { m.b('armR').rot[0] = -0.15; m.b('armR').rot[2] = -0.25; m.b('head').rot[1] = L(0, 1.1, ease(seg(S.k, 0.2, 0.55))); m.b('torso').rot[1] = L(0, 0.35, ease(seg(S.k, 0.25, 0.6))); });
          S.prewarm(100);
        },
        update(S, k) {
          for (let i = 0; i < 6; i++) K.fire(S, [-14 + (Math.random() - 0.5) * 20, Math.random(), 24 + 4 + Math.random() * 10], 2.5, 1, { w: 1 });
          for (let i = 0; i < 2; i++) K.fire(S, [-14 + (Math.random() - 0.5) * 6, 0, 24 - 3 - Math.random() * 4], 1.6, 1, { w: 1 });
        },
        cam: (S, k) => { const h = V.add(S.s.position, [0, 2.95, 0]); return { eye: V.add(h, LV([2.4, -0.1, -2.0], [1.3, -0.05, -1.2], ease(k))), at: V.add(h, [0, -0.08, 0]), fov: 36, far: 500 }; },
        draw(S, k) {
          GL.draw(S.n.mesh);
          const e = S.s.worldPoint('head', [0, 0.05, 0.07]);
          const a = ease(seg(k, 0.6, 0.75));
          if (a > 0) { S.glow(V.add(e, [0.03, 0, 0]), 0.12, '#80ffe0', a); S.glow(V.add(e, [-0.03, 0, 0]), 0.12, '#80ffe0', a); }
        } },
    ],
  });

  // ================================================================== THE CARGO SHIP REACHES COSTA DEL SOL
  SET.costa = () => once('costa', () => {
    const mb = new MB(), r = K.rng('costa');
    const hFn = (x, z) => { const d = -z - 260; const coast = d + Math.sin(x / 70) * 25; return coast < 0 ? -3 : Math.min(60, coast * 0.06 + Math.max(0, coast - 90) * 0.35 * K.vnoise(x / 80, z / 80, 3)); };
    K.terrain(mb, -700, -900, 700, -200, 40, 22, hFn, (x, z, y) => y < 0.5 ? '#c8b080' : y < 3 ? '#e8d8a8' : sh('#5a8a3a', (K.vnoise(x / 40, z / 40, 1) - 0.5) * 0.25));
    const houses = [];
    for (let i = 0; i < 46; i++) {
      const x = (r() - 0.5) * 360, z = -330 - r() * 140, y = hFn(x, z);
      if (y < 2) continue;
      const w = 8 + r() * 8, d = 8 + r() * 6, h = 6 + r() * 5;
      mb.push(); mb.translate(x, y - 1, z); mb.rotate(0, (r() - 0.5) * 0.4, 0);
      mb.box(0, h / 2, 0, w, h, d, sh('#f0ece0', (r() - 0.5) * 0.08));
      mb.frustum(0, h, 0, w + 1, d + 1, w * 0.4, d * 0.4, 3, sh('#d06030', (r() - 0.5) * 0.15));
      for (let k = 0; k < 3; k++) mb.box(-w * 0.3 + k * w * 0.3, h * 0.55, d / 2 + 0.05, 1.3, 1.6, 0.1, '#3a4a6a');
      mb.pop();
    }
    for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 500, z = -270 - r() * 60, y = hFn(x, z); if (y > -1 && y < 6) K.tree(mb, x, y - 0.3, z, 10 + r() * 6, 'palm', r); }
    // pier
    mb.box(40, 1.2, -240, 14, 1.0, 70, '#8a7a60');
    for (let z = -270; z < -205; z += 8) for (const x of [34, 46]) mb.box(x, -2, z, 0.8, 6, 0.8, '#5a4a3a');
    mb.box(40, 4, -272, 10, 6, 8, '#e8e4d8');
    return { mesh: mb.build(), hFn };
  });
  def('junon_ship', {
    music: 'costadelsol',
    sample: 'Under a blazing sun, the cargo ship from Junon glides into the harbor\nof Costa del Sol, the resort town of the western continent.',
    shots: [
      // 1. at sea: the ship ploughs through the waves
      { dur: 320, env: 'sunny_sea', fadeIn: 40,
        init(S) { S.sea = SET.water('#1a60a0', '#2a78b8', 2500, 'sea'); S.ship = K.veh('cargo_ship', { len: 92 }); },
        update(S, k) {
          S.z = -60 - S.f * 0.35;
          S.ship.position = [0, Math.sin(S.f * 0.03) * 0.3, S.z]; S.ship.rotY = Math.PI; S.ship.rotZ = Math.sin(S.f * 0.025) * 0.02;
          if (S.f % 2 === 0) { S.fx.emit(2, { p: [(Math.random() - 0.5) * 12, 0.3, S.z - 44], v: [0, 0.02, 0], vs: 0.08, life: 90, size: [3, 8], c0: '#ffffff', c1: '#c0e0f0', kind: 'smoke', alpha: 0.6 }); for (const sx of [-1, 1]) S.fx.emit(1, { p: [sx * 8, 0.3, S.z - 30 + Math.random() * 40], v: [sx * 0.08, 0.01, 0.05], vs: 0.04, life: 160, size: [3, 10], c0: '#ffffff', c1: '#a8d0e8', kind: 'smoke', alpha: 0.45 }); }
        },
        cam: (S, k) => { const z = S.z || -60; return { eye: [L(-70, -46, ease(k)), L(34, 18, ease(k)), z - 40 + k * 30], at: [0, 6, z + 10], fov: 44, far: 3000 }; },
        draw(S, k) {
          GL.draw(S.sea); S.ship.draw();
          for (let i = 0; i < 40; i++) { const x = (U.hash(i, 1, 3) - 0.5) * 300, z = (S.z || 0) - 150 + U.hash(i, 2, 3) * 300; S.core([x, 0.2, z], 1.2, '#ffffff', 0.5 * Math.max(0, Math.sin(S.f * 0.1 + i * 1.7))); }
        } },
      // 2. the coast of Costa del Sol ahead
      { dur: 320, env: 'sunny_sea', dissolve: 40,
        init(S) { S.sea = SET.water('#1a60a0', '#2a78b8', 2500, 'sea'); S.c = SET.costa(); S.ship = K.veh('cargo_ship', { len: 92 }); },
        update(S, k) {
          S.z = -60 - 0.28 * S.f - 40;
          S.ship.position = [40, Math.sin(S.f * 0.03) * 0.25, S.z]; S.ship.rotY = Math.PI;
          if (S.f % 3 === 0) S.fx.emit(2, { p: [40 + (Math.random() - 0.5) * 12, 0.3, S.z - 44], v: [0, 0.02, 0], vs: 0.06, life: 90, size: [3, 7], c0: '#ffffff', kind: 'smoke', alpha: 0.5 });
          if (S.cue('gull', k > 0.3)) S.sfx('hop', 0.3);
        },
        cam: (S, k) => ({ eye: [L(90, 70, ease(k)), 22, L(40, -40, ease(k))], at: [30, 10, -300], fov: 46, far: 3000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.c.mesh); S.ship.draw(); } },
      // 3. docking at the pier
      { dur: 260, env: 'sunny_sea', dissolve: 30, fadeOut: 50,
        init(S) { S.sea = SET.water('#1a60a0', '#2a78b8', 2500, 'sea'); S.c = SET.costa(); S.ship = K.veh('cargo_ship', { len: 92 }); },
        update(S, k) { S.ship.position = [62, 0, L(-190, -226, easeOut(k))]; S.ship.rotY = Math.PI; if (S.cue('horn', k > 0.2)) S.sfx('train_horn', 0.6); },
        cam: (S, k) => ({ eye: LV([10, 10, -236], [4, 12, -226], ease(k)), at: LV([50, 8, -210], [52, 9, -230], ease(k)), fov: 50, far: 3000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.c.mesh); S.ship.draw(); } },
    ],
  });

  // ================================================================== THE GOLD SAUCER
  SET.saucer = () => once('saucer', () => {
    const mb = new MB(), gl = new MB(), r = K.rng('saucer'), lights = [];
    // the trunk: a gnarled pillar rising from the desert
    const H = 230;
    mb.loft([{ y: 0, rx: 34, rz: 30 }, { y: 20, rx: 22, rz: 20 }, { y: 80, rx: 14, rz: 13 }, { y: 150, rx: 13, rz: 12 }, { y: H - 30, rx: 18, rz: 17 }, { y: H, rx: 34, rz: 32 }], { sides: 12, color: '#6a5040', smooth: true });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; mb.sweep([[Math.cos(a) * 30, 0, Math.sin(a) * 26], [Math.cos(a) * 18, 60, Math.sin(a) * 16], [Math.cos(a) * 14, 140, Math.sin(a) * 12], [Math.cos(a) * 26, H - 10, Math.sin(a) * 24]], [5, 3, 3, 4], { sides: 6, color: '#5a4436' }); }
    // the park on top
    mb.prism(0, H, 0, 60, 60, 6, 20, '#8a7a90', true);
    mb.sphere(0, H + 6, 0, 36, 30, 36, '#c8b8a0', 16, 10, true, null, 5);
    mb.prism(0, H + 34, 0, 6, 3, 30, 10, '#d0c090', true);
    mb.sphere(0, H + 68, 0, 9, 9, 9, '#f0d060', 12, 8);
    const pods = [];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU, d = 62 + (i % 2) * 10, x = Math.cos(a) * d, z = Math.sin(a) * d, y = H + 8 + (i % 3) * 14;
      mb.sweep([[Math.cos(a) * 28, H + 10, Math.sin(a) * 28], [x, y, z]], 3, { sides: 6, color: '#8a7a70' });
      const rad = 12 + (i % 3) * 4;
      mb.sphere(x, y, z, rad, rad * 0.9, rad, ['#e8a040', '#80a0e0', '#e0e0e0', '#d060a0'][i % 4], 12, 8, true);
      pods.push([x, y, z, rad]);
    }
    // ring of lights
    for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; lights.push([Math.cos(a) * 60, H + 6.5, Math.sin(a) * 60, i % 3]); }
    for (const p of pods) for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; lights.push([p[0] + Math.cos(a) * p[3], p[1], p[2] + Math.sin(a) * p[3], 3 + (i % 2)]); }
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; lights.push([Math.cos(a) * 30, H + 28 + Math.sin(i) * 4, Math.sin(a) * 30, 5]); }
    gl.sphere(0, H + 68, 0, 9.4, 9.4, 9.4, '#fff4a0', 10, 6);
    return { mesh: mb.build(), glow: gl.build({ unlit: true }), lights, H, pods };
  });
  SET.dunes = () => once('dunes', () => {
    const mb = new MB();
    K.terrain(mb, -3000, -3000, 3000, 3000, 50, 50, (x, z) => (K.vnoise(x / 260, z / 260, 5) - 0.5) * 60 + (K.vnoise(x / 70, z / 70, 8) - 0.5) * 10, (x, z, y) => sh('#8a7058', y * 0.004 + (K.vnoise(x / 120, z / 120, 2) - 0.5) * 0.12));
    return mb.build();
  });
  const SAUCER_POS = [0, 0, -900];
  const LCOL = ['#ffe060', '#ff60c0', '#60e0ff', '#ffa040', '#a0ff80', '#ffffff'];
  K.drawSaucer = function (S, g, pos, lights = 1) {
    K.put(g.mesh, pos); K.put(g.glow, pos);
    const t = S.f || 0;
    g.lights.forEach((l, i) => S.glow([pos[0] + l[0], pos[1] + l[1], pos[2] + l[2]], 7, LCOL[l[3]], lights * (0.45 + 0.35 * Math.sin(t * 0.12 + i * 0.7))));
    S.glow([pos[0], pos[1] + g.H + 68, pos[2]], 60, '#fff0a0', 0.35 * lights);
    S.glow([pos[0], pos[1] + g.H + 20, pos[2]], 180, '#ff80c0', 0.12 * lights);
  };
  // cable from the North Corel station to the Saucer
  const CABLE = (u) => [L(60, 20, u), L(40, 240, u) + Math.sin(u * Math.PI) * -30, L(600, -840, u)];
  def('gold_saucer', {
    music: 'goldsaucer', carry: true,
    sample: 'The ropeway car sways out over the Corel Desert.\nAhead, lit up like a festival in the night, rises the Gold Saucer —\nthe world\'s greatest amusement park, built on a giant pillar above the sands.',
    shots: [
      // 1. the ropeway car gliding over the night desert
      { dur: 300, env: env('desert_night', { fog: { color: [0.1, 0.07, 0.14], near: 200, far: 5000 } }), fadeIn: 40,
        init(S) { S.d = SET.dunes(); S.car = K.veh('ropeway', { len: 3.4 }); },
        update(S, k) { S.u = 0.1 + k * 0.08; S.car.position = V.sub(CABLE(S.u), [0, 5, 0]); S.car.rotY = Math.PI + 0.03; S.car.rotZ = Math.sin(S.f * 0.04) * 0.04; },
        cam: (S, k) => { const c = S.car.position; return { eye: V.add(c, [L(9, 6, k), 2.5, L(6, 10, k)]), at: V.add(c, [0, 1.5, -4]), fov: 44, far: 6000 }; },
        draw(S) {
          GL.draw(S.d); S.car.draw();
          const a = CABLE(0), b = CABLE(1);
          const pts = []; for (let i = 0; i <= 30; i++) pts.push(CABLE(i / 30));
          for (let i = 0; i < 30; i++) S.beam(pts[i], pts[i + 1], 0.25, '#8090a0', 0.5);
          void a; void b;
          S.glow(V.add(S.car.position, [0, 2.2, 1.7]), 2.2, '#ffe0a0', 0.6);
        } },
      // 2. the reveal: the Gold Saucer rises out of the dark, fireworks
      { dur: 420, env: env('desert_night', { fog: { color: [0.1, 0.07, 0.14], near: 300, far: 6000 } }), dissolve: 30,
        init(S) { S.d = SET.dunes(); S.g = SET.saucer(); S.car = K.veh('ropeway', { len: 3.4 }); },
        update(S, k) {
          S.u = 0.3 + k * 0.25; S.car.position = V.sub(CABLE(S.u), [0, 5, 0]); S.car.rotY = Math.PI; S.car.rotZ = Math.sin(S.f * 0.04) * 0.04;
          if (k > 0.35 && S.f % 22 === 0) { const p = [SAUCER_POS[0] + (Math.random() - 0.5) * 300, 360 + Math.random() * 160, SAUCER_POS[2] + (Math.random() - 0.5) * 200]; K.firework(S, p, null, 12); S.sfx('fire', 0.3); }
        },
        cam: (S, k) => { const c = S.car.position; const e = ease(k); return { eye: V.add(c, [L(-5, 14, e), L(3, 8, e), L(-3, 22, e)]), at: LV(V.add(c, [0, 2, -10]), [SAUCER_POS[0], 280, SAUCER_POS[2]], ease(seg(k, 0.1, 0.7))), fov: L(42, 50, e), far: 6000 }; },
        draw(S) {
          GL.draw(S.d); K.drawSaucer(S, S.g, SAUCER_POS); S.car.draw();
          const pts = []; for (let i = 0; i <= 30; i++) pts.push(CABLE(i / 30));
          for (let i = 0; i < 30; i++) S.beam(pts[i], pts[i + 1], 0.3, '#8090a0', 0.5);
          S.glow(V.add(S.car.position, [0, 2.2, 1.7]), 2.2, '#ffe0a0', 0.6);
        } },
      // 3. closer: the park glittering, fireworks overhead
      { dur: 300, env: env('desert_night', { fog: { color: [0.1, 0.07, 0.14], near: 300, far: 6000 } }), dissolve: 30, fadeOut: 50,
        init(S) { S.d = SET.dunes(); S.g = SET.saucer(); },
        update(S, k) { if (S.f % 18 === 0) { const p = [SAUCER_POS[0] + (Math.random() - 0.5) * 260, 330 + Math.random() * 140, SAUCER_POS[2] + (Math.random() - 0.5) * 200]; K.firework(S, p, null, 10); S.sfx('fire', 0.3); } },
        cam: (S, k) => ({ eye: LV([160, 240, -620], [120, 262, -700], ease(k)), at: [0, 250, -900], fov: 50, far: 6000 }),
        draw(S) { GL.draw(S.d); K.drawSaucer(S, S.g, SAUCER_POS); } },
    ],
  });

  // ================================================================== THE TEMPLE OF THE ANCIENTS SHRINKS
  SET.jungle = () => once('jungle', () => {
    const mb = new MB(), r = K.rng('jungle');
    const hFn = (x, z) => { const d = Math.hypot(x, z); return (d < 90 ? 0 : (K.vnoise(x / 120, z / 120, 2) - 0.3) * 40 * Math.min(1, (d - 90) / 80)); };
    // terrain with a hole where the temple (and later the pit) stands
    const n = 72, x0 = -900, dx = 1800 / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const xa = x0 + i * dx, za = x0 + j * dx, xb = xa + dx, zb = za + dx;
      if (Math.hypot((xa + xb) / 2, (za + zb) / 2) < 45) continue;
      mb.quad([xa, hFn(xa, zb), zb], [xb, hFn(xb, zb), zb], [xb, hFn(xb, za), za], [xa, hFn(xa, za), za], sh('#3a6428', (K.vnoise((xa + xb) / 100, (za + zb) / 100, 4) - 0.5) * 0.3));
    }
    for (let i = 0; i < 260; i++) { const a = r() * TAU, d = 75 + Math.sqrt(r()) * 600, x = Math.cos(a) * d, z = Math.sin(a) * d; K.tree(mb, x, hFn(x, z) - 0.5, z, 16 + r() * 16, 'jungle', r); }
    return { mesh: mb.build(), hFn };
  });
  SET.temple = () => once('temple', () => {
    const tiers = [];
    for (let i = 0; i < 7; i++) {
      tiers.push(K.meshOf(mb => {
        const w = 112 - i * 14, h = 7;
        mb.frustum(0, 0, 0, w, w, w - 3, w - 3, h, i % 2 ? '#9a9070' : '#8a8266');
        for (const s of [-1, 1]) mb.box(s * (w / 2 - 1.5), h + 0.6, 0, 1.2, 1.2, w - 6, '#6a6450');
        if (i < 6) mb.frustum(0, 0, w / 2 - 1, 10, 10, 10, 3, h, '#7a7258');
      }));
    }
    const top = K.meshOf(mb => { mb.box(0, 4, 0, 14, 8, 14, '#8a8266'); mb.frustum(0, 8, 0, 16, 16, 4, 4, 5, '#6a6450'); for (const x of [-5, 5]) mb.box(x, 4, 7.2, 1.4, 8, 1.4, '#7a7258'); });
    const pit = K.meshOf(mb => {
      // funnel walls seen from inside (rim r=64 slightly above the ground to seal the terrain hole)
      const ring = (r, y) => { const pts = []; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; pts.push([Math.cos(a) * r, y, Math.sin(a) * r]); } return pts; };
      const rows = [[64, 0.35, '#6a6a58'], [56, 0.3, '#5a5040'], [44, -8, '#3a2c20'], [34, -22, '#241a12'], [28, -30, '#140e0a']];
      for (let j = 0; j < rows.length - 1; j++) { const A = ring(rows[j][0], rows[j][1]), B = ring(rows[j + 1][0], rows[j + 1][1]); for (let i = 0; i < 24; i++) { const i2 = (i + 1) % 24; mb.quad(A[i], A[i2], B[i2], B[i], rows[j][2]); } }
      const F = ring(28, -30); for (let i = 1; i < 23; i++) mb.tri(F[0], F[i + 1], F[i], '#0a0806');
    }, { cull: false });
    return { tiers, top, pit };
  });
  def('temple_shrink', {
    music: 'temple',
    sample: 'With a deep groan, the Temple of the Ancients begins to fold in on itself...\nstone by stone, it shrinks, until nothing is left but a gaping pit\nand, at its bottom, the Black Materia.',
    shots: [
      // 1. the step pyramid in the jungle
      { dur: 300, env: 'jungle', fadeIn: 40,
        init(S) { S.j = SET.jungle(); S.t = SET.temple(); },
        cam: (S, k) => ({ eye: K.orbit([0, 0, 0], 0.6 + k * 0.3, 190, 60 + k * 10), at: [0, 30, 0], fov: 44, far: 3000 }),
        draw(S) { GL.draw(S.j.mesh); K.put(S.t.pit); drawTemple(S, 1, 0); } },
      // 2. the temple folds in on itself
      { dur: 460, env: 'jungle', dissolve: 30,
        init(S) { S.j = SET.jungle(); S.t = SET.temple(); },
        update(S, k) {
          S.sh = easeIn(seg(k, 0.12, 0.82));
          S.shake(k > 0.1 && k < 0.9 ? 0.6 : 0);
          if (S.cue('rumble', k > 0.08)) S.sfx('falling');
          if (k > 0.12 && k < 0.95 && S.f % 2 === 0) K.dust(S, [(Math.random() - 0.5) * 90 * (1 - S.sh), 2, (Math.random() - 0.5) * 90 * (1 - S.sh)], 8, 1, { c0: '#9a9070', c1: '#6a6450', v: [0, 0.2, 0], alpha: 0.45 });
          if (S.cue('gone', k > 0.84)) { S.sfx('bosskill'); FF7.sceneMgr.doFlash('#ffffff', 16, 0.4); }
        },
        cam: (S, k) => ({ eye: K.orbit([0, 0, 0], 0.9 + k * 0.15, 170 - k * 20, 55), at: [0, 22 - k * 16, 0], fov: 46, far: 3000 }),
        draw(S, k) { GL.draw(S.j.mesh); K.put(S.t.pit); if (S.sh < 0.999) drawTemple(S, 1 - S.sh, S.sh); } },
      // 3. the pit, and the Black Materia at its bottom
      { dur: 300, env: 'jungle', dissolve: 30, fadeOut: 60,
        init(S) { S.j = SET.jungle(); S.t = SET.temple(); },
        cam: (S, k) => ({ eye: LV([0, 90, 70], [0, 36, 16], ease(k)), at: [0, -28, 0], fov: 40, far: 3000 }),
        draw(S, k) {
          GL.draw(S.j.mesh); K.put(S.t.pit);
          const p = [0, -28.6, 0];
          K.put(K.once('bm', () => K.meshOf(mb => mb.sphere(0, 0, 0, 1, 1, 1, '#0a0a14', 12, 8))), p, null, 1.1);
          S.glow(p, 16, '#6040c0', 0.55 + Math.sin(S.f * 0.08) * 0.15); S.glow(p, 6, '#a080ff', 0.5); S.core(p, 1.6, '#e0d0ff', 0.6);
        } },
    ],
  });
  function drawTemple(S, s, fold) {
    const T = S.t;
    let y = 0;
    for (let i = 0; i < T.tiers.length; i++) {
      const ti = Math.max(0, Math.min(1, fold * 1.6 - (6 - i) * 0.08));
      const sc = s * (1 - ti * 0.15);
      K.put(T.tiers[i], [0, y * s - fold * 22, 0], [0, fold * (i % 2 ? 0.3 : -0.3) * i * 0.2, 0], [sc, s * (1 - ti * 0.3), sc]);
      y += 7 * (1 - ti * 0.3);
    }
    K.put(T.top, [0, y * s - fold * 22, 0], [0, fold * 1.2, 0], s);
  }

  // ================================================================== AERIS (the altar, then the lake)
  SET.altar = () => once('altar', () => {
    const mb = new MB(), gl = new MB(), r = K.rng('altar');
    // the pool
    mb.floor(-60, -60, 60, 60, -2.5, '#0a1a24');
    // the altar: square platform with steps, in the middle of the pool
    for (let i = 0; i < 6; i++) { const w = 10 - i * 1.3; mb.box(0, -2.3 + i * 0.5, 0, w, 0.5, w, sh('#6a8898', i * 0.03)); }
    // crystal pillars around the hall
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, d = 24 + r() * 10; const x = Math.cos(a) * d, z = Math.sin(a) * d; mb.prism(x, -2.5, z, 1.4 + r(), 0.9, 18 + r() * 14, 6, '#8ab0c8', false); gl.spike([x, 16 + r() * 10, z], [0, 1, 0], 4 + r() * 4, 0.9, 6, '#a0e0ff'); }
    // the shell-like roof ribs
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const pts = []; for (let j = 0; j <= 10; j++) { const t = j / 10; pts.push([Math.cos(a) * 40 * (1 - t * 0.9), 30 + Math.sin(t * Math.PI / 2) * 22, Math.sin(a) * 40 * (1 - t * 0.9)]); } mb.sweep(pts, 1.4, { sides: 5, color: '#4a6070' }); }
    return { mesh: mb.build(), glow: gl.build({ unlit: true }), water: K.meshOf(m => m.floor(-60, -60, 60, 60, -0.6, '#3a7a9a'), { blend: 'alpha', alphaTest: 0 }) };
  });
  SET.lake = () => once('lake', () => {
    const mb = new MB(), r = K.rng('lake');
    const hFn = (x, z) => { const d = Math.hypot(x, z * 1.3); return d < 50 ? -Math.pow(1 - d / 50, 0.6) * 22 : (d - 50) * 0.35 * (0.6 + K.vnoise(x / 60, z / 60, 4)); };
    K.terrain(mb, -400, -400, 400, 400, 40, 40, hFn, (x, z, y) => y < -1 ? sh('#2a4a50', y * 0.01) : sh('#3a4a3a', (K.vnoise(x / 30, z / 30, 1) - 0.5) * 0.3));
    for (let i = 0; i < 20; i++) { const a = r() * TAU, d = 60 + r() * 60, x = Math.cos(a) * d, z = Math.sin(a) * d / 1.3; mb.prism(x, hFn(x, z) - 1, z, 2 + r() * 2, 0.6, 30 + r() * 30, 6, '#a0c0d8'); }
    return { mesh: mb.build(), hFn, water: K.meshOf(m => m.floor(-120, -120, 120, 120, 0, '#4a8aa8'), { blend: 'alpha', alphaTest: 0, cull: false }) };
  });
  // Aeris praying (kneeling, hands together)
  const prayPose = (m, S) => K.pose(m, (mm) => {
    FF7.anims.pray.fn(mm, 0);
    mm.b('head').rot[0] = 0.35 + Math.sin((S.f || 0) * 0.02) * 0.02;
  });
  def('aeris_death', {
    music: 'aeris',
    sample: 'Aeris prays in silence at the altar of the Forgotten Capital.\n\nFrom above, a figure in black descends...\n\nThe White Materia falls from her ribbon, bounces down the steps,\nand sinks into the water.\n\nCloud carries her into the lake, and lets her go.',
    shots: [
      // 1. Aeris praying on the altar
      { dur: 380, env: 'capital', fadeIn: 60,
        init(S) { S.al = SET.altar(); S.a = S.add(K.actor('aeris', { pos: [0, 0.7, 0], rotY: 0 })); prayPose(S.a, S); },
        cam: (S, k) => ({ eye: K.orbit([0, 0, 0], 0.5 - k * 0.5, L(14, 5.5, ease(k)), L(3, 1.6, ease(k))), at: [0, 1.2, 0], fov: 40, far: 400 }),
        draw(S) { GL.draw(S.al.mesh); GL.draw(S.al.glow); GL.draw(S.al.water, null, { tint: [1, 1, 1, 0.55] }); S.haze([0, 18, 0], 40, '#60a0c0', 0.15); S.beam([0, 40, 0], [0, 0.7, 0], 8, '#a0d8ff', 0.25, 0.05); } },
      // 2. from above, Sephiroth descends
      { dur: 260, env: 'capital', dissolve: 30,
        init(S) {
          S.al = SET.altar(); S.a = S.add(K.actor('aeris', { pos: [0, 0.7, 0], rotY: 0 })); prayPose(S.a, S);
          S.s = S.add(K.actor('sephiroth', { weapon: true, pos: [0, 30, 0.6], rotY: 0 }));
          K.pose(S.s, (m) => { m.b('armR').rot[0] = -0.55; m.b('armL').rot[0] = -0.55; m.b('armR').rot[1] = 0.4; m.b('armL').rot[1] = -0.4; m.b('foreR').rot[0] = -0.9; m.b('foreL').rot[0] = -0.9; m.b('head').rot[0] = 0.3; m.b('thighL').rot[0] = -0.1; });
        },
        update(S, k) { S.s.position = [0, L(32, 4.2, easeOut(seg(k, 0, 1))), 0.4]; S.s.rotY = Math.PI; },
        cam: (S, k) => ({ eye: [5.5, 1.1, 5.5], at: LV([0, 14, 0], [0, 4.5, 0.2], ease(k)), fov: 46, far: 400 }),
        draw(S) { GL.draw(S.al.mesh); GL.draw(S.al.glow); GL.draw(S.al.water, null, { tint: [1, 1, 1, 0.55] }); S.beam([0, 40, 0], [0, 0.7, 0], 8, '#a0d8ff', 0.2, 0.05); } },
      // 3. her face, eyes closed; the shadow falls across her -> white
      { dur: 170, env: 'capital', fadeOut: [30, '#ffffff'],
        init(S) { S.al = SET.altar(); S.a = S.add(K.actor('aeris', { pos: [0, 0.7, 0], rotY: 0 })); prayPose(S.a, S); },
        cam: (S, k) => ({ eye: LV([0.5, 1.75, 1.7], [0.35, 1.7, 1.25], k), at: [0, 1.45, 0.15], fov: 34, far: 300 }),
        draw(S, k) { GL.draw(S.al.mesh); GL.draw(S.al.glow); GL.draw(S.al.water, null, { tint: [1, 1, 1, 0.55] }); },
        overlay(c, S, k) { const a = ease(seg(k, 0.5, 0.9)) * 0.6; if (a > 0) { c.save(); c.globalAlpha = a; c.fillStyle = '#000'; c.fillRect(0, 0, FF7.W, FF7.H * 0.45 * ease(seg(k, 0.5, 1))); c.restore(); } } },
      // 4. the White Materia falls from her ribbon, bounces down the steps and sinks
      { dur: 340, env: 'capital', fadeIn: [40, '#ffffff'],
        init(S) { S.al = SET.altar(); },
        update(S, k) {
          // bounce path: head height -> step 1 -> step 3 -> step 5 -> water
          const pts = [[0, 1.85, 0.3], [0, 0.95, 1.6], [0, 0.45, 2.5], [0, -0.05, 3.3], [0, -0.55, 4.2], [0, -0.6, 5.4]];
          const u = seg(k, 0, 0.62) * 5, i = Math.min(4, Math.floor(u)), t = u - i;
          const a = pts[i], b = pts[i + 1];
          const hop = i === 0 ? 0 : 0.5 / i;
          S.m = [L(a[0], b[0], t), L(a[1], b[1], t) + Math.sin(t * Math.PI) * hop, L(a[2], b[2], t)];
          if (k > 0.62) S.m = [0, -0.6 - easeIn(seg(k, 0.62, 1)) * 2.2, 5.4];
          const bi = Math.floor(u);
          if (bi >= 1 && bi <= 4 && S.cue('b' + bi)) S.sfx('ching', 0.4);
          if (S.cue('splash', k > 0.62)) { K.splash(S, [0, -0.6, 5.4], 0.4, { n: 20 }); S.sfx('hop', 0.4); }
        },
        cam: (S, k) => ({ eye: LV([2.2, 0.8, 5.6], [1.8, 0.2, 7], ease(k)), at: LV([0, 0.9, 1.6], [0, -0.8, 5.4], ease(seg(k, 0.1, 0.8))), fov: 44, far: 300 }),
        draw(S, k) {
          GL.draw(S.al.mesh); GL.draw(S.al.glow);
          const m = S.m || [0, 1.8, 0.3];
          const deep = m[1] < -0.6;
          K.put(K.once('wm', () => K.meshOf(mb => mb.sphere(0, 0, 0, 1, 1, 1, '#e8fff0', 10, 7))), m, null, 0.06, { unlit: true, tint: deep ? [0.6, 0.9, 0.9, 1] : [1, 1, 1, 1] });
          S.glow(m, 0.6, '#c0ffe0', deep ? 0.5 : 0.8);
          GL.draw(S.al.water, null, { tint: [1, 1, 1, 0.55] });
        } },
      // 5. the lake: Cloud lays her in the water
      { dur: 380, env: env('capital', { fog: { color: [0.08, 0.18, 0.26], near: 30, far: 260 }, stars: 0.5 }), fadeIn: 50,
        init(S) {
          S.lk = SET.lake();
          S.c = S.add(K.actor('cloud', { pos: [0, -0.85, 6], rotY: Math.PI }));
          K.pose(S.c, (m) => { m.b('armL').rot[0] = -1.15; m.b('armR').rot[0] = -1.15; m.b('foreL').rot[0] = -0.7; m.b('foreR').rot[0] = -0.7; m.b('head').rot[0] = 0.45; });
          S.a = S.add(K.actor('aeris', {}));
          K.pose(S.a, (m) => { FF7.anims.pray.fn(m, 0); m.b('hips').pos[1] = 0; m.b('thighL').rot[0] = 0; m.b('thighR').rot[0] = 0; m.b('shinL').rot[0] = 0; m.b('shinR').rot[0] = 0; m.b('head').rot[0] = 0; });
        },
        update(S, k) {
          const w = seg(k, 0, 0.35);
          S.c.position = [0, L(-0.2, -0.9, w), L(8, 5.2, w)];
          const rel = ease(seg(k, 0.45, 1));
          S.a.rotX = -Math.PI / 2; S.a.rotY = Math.PI / 2; S.a.rotZ = 0;
          S.a.position = [0.85, L(1.2 + S.c.position[1], -0.1, rel), S.c.position[2] - 0.55];
          if (rel > 0.3) S.a.position[1] -= (rel - 0.3) * 0.6;
          if (S.cue('ripple', k > 0.8)) K.splash(S, [0, 0, 4.7], 0.3, { n: 8 });
        },
        cam: (S, k) => ({ eye: LV([7, 1.3, -1], [4.5, 0.8, 0.8], ease(k)), at: LV([0, 0.6, 5], [0.4, 0.1, 4.8], ease(k)), fov: 42, far: 800 }),
        draw(S) { GL.draw(S.lk.mesh); GL.draw(S.lk.water, null, { tint: [1, 1, 1, 0.62] }); S.glow([30, 60, -120], 50, '#c0e0ff', 0.2); } },
      // 6. beneath the surface she sinks into the blue
      { dur: 460, env: 'underwater', dissolve: 50, fadeOut: 90,
        init(S) {
          S.lk = SET.lake();
          S.a = S.add(K.actor('aeris', {}));
          K.pose(S.a, (m) => { FF7.anims.pray.fn(m, 0); m.b('hips').pos[1] = 0; m.b('thighL').rot[0] = 0; m.b('thighR').rot[0] = 0; m.b('shinL').rot[0] = 0.1; m.b('shinR').rot[0] = 0.1; m.b('head').rot[0] = 0; });
        },
        update(S, k) {
          S.a.rotX = -Math.PI / 2 + k * 0.25; S.a.rotY = Math.PI / 2; S.a.position = [0.85, -1.2 - k * 9, 4.2];
          if (S.f % 10 === 0) S.fx.emit(1, { p: V.add(S.a.position, [(Math.random() - 0.5) * 0.6, 0.3, (Math.random() - 0.5) * 0.6]), v: [0, 0.03, 0], vs: 0.005, life: 120, size: [0.08, 0.14], c0: '#e0f8ff', kind: 'core', alpha: 0.6 });
        },
        cam: (S, k) => { const a = S.a.position; return { eye: [a[0] + 4.5, a[1] - 3.2 - k * 1.5, a[2] + 1.5], at: V.add(a, [0, 0.5, 0]), fov: 46, far: 200 }; },
        draw(S, k) {
          GL.draw(S.lk.mesh); GL.draw(S.lk.water, null, { tint: [0.8, 1, 1, 0.8] });
          for (let i = 0; i < 7; i++) S.beam([i * 3 - 9, 0.2, 4 + Math.sin(i) * 3], [i * 3 - 9 + 2, -26, 4 + Math.sin(i) * 3 + 2], 2.2, '#a0e0ff', 0.12 * (0.7 + 0.3 * Math.sin(S.f * 0.03 + i)), 0);
        } },
    ],
  });
})();

// ----------------------------------------------------------------------------- short fallbacks (original FMVs play when available: js/gfx/fmv.js)
(function () {
  const U = FF7.util, V = FF7.V3, MB = FF7.MeshBuilder;
  const CIN = FF7.cinema, K = CIN.K, SET = K.SET, TAU = K.TAU, L = K.L;
  const { ease, seg, LV } = K;
  const GL = FF7.GL, def = CIN.def, env = K.envOf, once = K.once, sh = U.shade;

  // ================================================================== SETO (the petrified warrior under the moon)
  SET.setoCliff = () => once('setoCliff', () => K.meshOf(mb => {
    const r = K.rng('seto');
    K.terrain(mb, -200, -200, 200, 200, 30, 30, (x, z) => { const cliff = x > -6 ? 0 : -60; return cliff + (K.vnoise(x / 20, z / 20, 3) - 0.5) * 4 - Math.max(0, x - 30) * 0.3; }, (x, z, y) => sh('#7a5234', (K.vnoise(x / 12, z / 12, 1) - 0.5) * 0.4 + y * 0.004));
    for (let i = 0; i < 20; i++) mb.sphere(40 + r() * 80, 0, -40 - r() * 100, 3 + r() * 6, 2 + r() * 5, 3 + r() * 6, sh('#6a4428', (r() - 0.5) * 0.3), 6, 4, false);
  }));
  const moonEnv = env('night', { sky: ['#06020e', '#240a40', '#0a0406'], stars: 0.5, moon: null, fog: { color: [0.08, 0.03, 0.12], near: 60, far: 400 }, light: { dir: [-0.6, -0.4, -0.7], color: [0.7, 0.5, 0.4], ambient: [0.2, 0.16, 0.26], dir2: [0.6, -0.1, 0.7], color2: [0.3, 0.2, 0.45] } });
  const stoneSeto = (S) => { const m = S.add(K.actor('redxiii', { pos: [-4, 0, 0], rotY: -Math.PI / 2 - 0.3 })); m.scale = 1.9; m.tint = [0.55, 0.52, 0.5, 1]; K.pose(m, (mm) => { mm.b('head').rot[0] = -0.5; mm.b('legFL').rot[0] = -0.3; mm.b('tail').rot[0] = -0.2; }); m.play('q_idle'); m.speed = 0; return m; };
  const arrows = (S, m) => { for (let i = 0; i < 6; i++) { const p = V.add(m.position, [Math.sin(i * 2.1) * 0.4, 1.1 + (i % 3) * 0.2, Math.cos(i * 1.3) * 0.5]); S.beam(p, V.add(p, [0.6 + i * 0.1, 0.9, (i - 3) * 0.2]), 0.05, '#c0b8a8', 0.8); } };
  def('seto', {
    music: 'warrior', sample: 'On the cliff, under the moon, stands the warrior Seto — turned to stone,\nstill guarding the canyon.',
    shots: [
      { dur: 300, env: moonEnv, fadeIn: 40,
        init(S) { S.c = SET.setoCliff(); S.s = stoneSeto(S); },
        cam: (S, k) => ({ eye: [L(-40, -34, k), L(-2, 0, k), L(30, 26, k)], at: [-4, 3, 0], fov: 40, far: 600 }),
        draw(S) { GL.draw(S.c); arrows(S, S.s); const m = [150, 70, -125]; S.glow(m, 90, '#a040ff', 0.3); S.core(m, 30, '#d09060', 0.95); } },
      { dur: 240, env: moonEnv, dissolve: 30, fadeOut: 60,
        init(S) { S.c = SET.setoCliff(); S.s = stoneSeto(S); },
        update(S, k) { if (S.cue('howl', k > 0.3)) S.sfx('howl'); },
        cam: (S, k) => ({ eye: [-1.6, 1.9, 1.8], at: [-4.6, 1.8, -0.2], fov: 38 }),
        draw(S) { GL.draw(S.c); arrows(S, S.s); } },
    ],
  });

  // ================================================================== SHIN-RA MOTOR MOBILES (the showroom TV advert)
  const adEnv = env('space', { stars: 0, sky: ['#000000', '#000000', '#000000'], light: { dir: [0.4, -0.5, -0.8], color: [1.0, 0.92, 0.8], ambient: [0.12, 0.12, 0.14], dir2: [-0.8, 0.2, 0.4], color2: [0.3, 0.4, 0.6] } });
  const spec = (c, lines, a) => { c.save(); c.globalAlpha = a; lines.forEach((l, i) => FF7.render.text(l, 26, 70 + i * 17, { font: '12px Georgia, serif', color: '#d8d8d0', shadow: false })); c.restore(); };
  const brand = (c, a, y) => { c.save(); c.globalAlpha = a; FF7.render.text('Shin-Ra', FF7.W - 150, y, { font: 'italic 30px Georgia, serif', color: '#e8e8e8', align: 'center' }); FF7.render.text('Motor Mobiles', FF7.W - 150, y + 34, { font: 'italic 22px Georgia, serif', color: '#c8c8c8', align: 'center' }); c.restore(); };
  def('shinra_motors_ad', {
    music: null, sample: '',
    shots: [
      { dur: 300, env: adEnv, fadeIn: 30,
        init(S) { S.car = K.veh('truck', { len: 5 }); },
        cam: (S, k) => ({ eye: K.orbit([0, 0, 0], 1.2 + k * 0.8, 8, 1.6), at: [0, 1.0, 0], fov: 40 }),
        draw(S) { S.car.position = [0, 0, 0]; S.car.draw(); S.glow([3, 1.2, 2.6], 3, '#ffffff', 0.25); },
        overlay(c, S, k) { spec(c, ['Shin-Ra  pA-86', 'light weight, short wheelbase, wide 4 wheels', 'Mako engine, twin cam, 3 valve', 'max speed: very fast'], seg(k, 0.1, 0.25) * (1 - seg(k, 0.85, 1))); brand(c, seg(k, 0.2, 0.4), 360); } },
      { dur: 240, env: adEnv, fadeIn: [20, '#ffffff'], fadeOut: 50,
        cam: () => ({ eye: [0, 0, 5], at: [0, 0, 0] }),
        overlay(c, S, k) { const a = seg(k, 0, 0.2); brand(c, a, 190); c.save(); c.globalAlpha = a; FF7.render.text('Makou ENGINE  —  Powered by Shin-Ra', FF7.W / 2, 290, { font: '16px Georgia, serif', color: '#e04030', align: 'center' }); FF7.render.text('Visit your nearest Shin-Ra dealer this weekend!', FF7.W / 2, 330, { font: '13px Georgia, serif', color: '#c0c0c0', align: 'center' }); c.restore(); } },
    ],
  });
})();

// ----------------------------------------------------------------------------- Disc 2/3 sets: Weapons, Meteor, Holy, the Northern Crater, Junon, Mideel, Rocket Town, the canyon
(function () {
  const U = FF7.util, V = FF7.V3, M4 = FF7.M4, MB = FF7.MeshBuilder;
  const CIN = FF7.cinema, K = CIN.K, SET = K.SET, TAU = K.TAU, L = K.L;
  const GL = FF7.GL, once = K.once, sh = U.shade;
  const meshOf = K.meshOf;

  // ================================================================== the WEAPONS (own cinematic models, ~1 unit tall)
  // Each returns an FF7.Model with bones: root, body, neck, head, jaw, armL/R, foreL/R, legL/R, tail, wingL/R, shL/shR.
  function sapphireLike(c1, c2, c3, eye) {
    const m = new FF7.Model();
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0.34, 0]);
    m.bone('neck', 'body', [0, 0.36, 0.1]);
    m.bone('head', 'neck', [0, 0.1, 0.08]);
    m.bone('jaw', 'head', [0, -0.02, 0.02]);
    m.bone('armL', 'body', [0.2, 0.3, 0.04]); m.bone('foreL', 'armL', [0, -0.26, 0]);
    m.bone('armR', 'body', [-0.2, 0.3, 0.04]); m.bone('foreR', 'armR', [0, -0.26, 0]);
    m.bone('legL', 'root', [0.1, 0.34, -0.02]); m.bone('legR', 'root', [-0.1, 0.34, -0.02]);
    m.bone('tail', 'body', [0, 0.02, -0.14]);
    m.attach('body', meshOf(mb => {
      mb.loft([{ y: -0.04, rx: 0.14, rz: 0.12 }, { y: 0.12, rx: 0.2, rz: 0.17, z: 0.02 }, { y: 0.28, rx: 0.24, rz: 0.2, z: 0.05 }, { y: 0.4, rx: 0.16, rz: 0.15, z: 0.08 }], { sides: 12, color: c1 });
      for (let i = 0; i < 9; i++) { const t = i / 8; mb.blade([0, 0.05 + t * 0.34, -0.15 + t * 0.02], [0, 0.4, -1], 0.1 + Math.sin(t * Math.PI) * 0.08, 0.05, 0.02, c2, null, c3); }
      mb.loft([{ y: 0.1, rx: 0.16, rz: 0.06, z: 0.15 }, { y: 0.32, rx: 0.2, rz: 0.06, z: 0.2 }], { sides: 8, color: c2 });
      for (const s of [-1, 1]) mb.sphere(s * 0.2, 0.32, 0.04, 0.08, 0.07, 0.08, c2, 8, 5);
    }));
    m.attach('neck', meshOf(mb => { mb.loft([{ y: 0, rx: 0.08, rz: 0.08 }, { y: 0.12, rx: 0.06, rz: 0.07, z: 0.04 }], { sides: 8, color: c1 }); }));
    m.attach('head', meshOf(mb => {
      mb.push(); mb.rotate(Math.PI / 2 - 0.3, 0, 0);
      mb.loft([{ y: -0.04, rx: 0.07, rz: 0.06 }, { y: 0.08, rx: 0.08, rz: 0.06 }, { y: 0.18, rx: 0.04, rz: 0.035 }], { sides: 8, color: c1 });
      mb.pop();
      for (const s of [-1, 1]) mb.blade([s * 0.04, 0.05, -0.02], [s * 0.4, 0.6, -1], 0.16, 0.04, 0.02, c3);
      for (const s of [-1, 1]) mb.sphere(s * 0.045, 0.035, 0.1, 0.014, 0.01, 0.01, eye, 6, 4);
    }));
    m.attach('jaw', meshOf(mb => { mb.push(); mb.rotate(Math.PI / 2 - 0.1, 0, 0); mb.loft([{ y: 0, rx: 0.05, rz: 0.03 }, { y: 0.14, rx: 0.025, rz: 0.02 }], { sides: 6, color: sh(c1, -0.15) }); mb.pop(); }));
    for (const s of ['L', 'R']) {
      m.attach('arm' + s, meshOf(mb => mb.loft([{ y: 0.02, rx: 0.06, rz: 0.06 }, { y: -0.26, rx: 0.045, rz: 0.05 }], { sides: 8, color: c1 })));
      m.attach('fore' + s, meshOf(mb => { mb.loft([{ y: 0, rx: 0.045, rz: 0.05 }, { y: -0.24, rx: 0.05, rz: 0.055 }], { sides: 8, color: c1 }); for (let i = 0; i < 3; i++) mb.spike([(i - 1) * 0.03, -0.24, 0.02], [(i - 1) * 0.3, -1, 0.5], 0.1, 0.018, 4, c3); }));
      m.attach('leg' + s, meshOf(mb => { mb.loft([{ y: 0.02, rx: 0.08, rz: 0.09 }, { y: -0.16, rx: 0.06, rz: 0.07, z: 0.03 }, { y: -0.34, rx: 0.07, rz: 0.08 }], { sides: 8, color: c1 }); mb.rbox(0, -0.33, 0.05, 0.12, 0.04, 0.16, sh(c1, -0.2), 0.3); }));
    }
    m.attach('tail', meshOf(mb => { mb.sweep([[0, 0, 0], [0, -0.08, -0.15], [0, -0.2, -0.32], [0, -0.3, -0.46]], [0.07, 0.05, 0.03, 0], { sides: 6, color: c1 }); }));
    m.coreBone = 'body'; m.corePt = [0, 0.22, 0.2]; m.eyeBone = 'head'; m.eyePt = [0, 0.035, 0.11];
    return m;
  }
  function diamondLike() {
    const m = new FF7.Model(), c1 = '#c8ccd6', c2 = '#8a92a4', c3 = '#e8ecf4';
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0.42, 0]);
    m.bone('head', 'body', [0, 0.38, 0.06]);
    m.bone('shL', 'body', [0.16, 0.34, 0]); m.bone('shR', 'body', [-0.16, 0.34, 0]);
    m.bone('armL', 'body', [0.2, 0.3, 0]); m.bone('foreL', 'armL', [0, -0.2, 0]);
    m.bone('armR', 'body', [-0.2, 0.3, 0]); m.bone('foreR', 'armR', [0, -0.2, 0]);
    m.bone('legL', 'root', [0.09, 0.42, 0]); m.bone('legR', 'root', [-0.09, 0.42, 0]);
    m.bone('shinL', 'legL', [0, -0.22, 0]); m.bone('shinR', 'legR', [0, -0.22, 0]);
    m.attach('body', meshOf(mb => {
      mb.loft([{ y: -0.04, rx: 0.12, rz: 0.1 }, { y: 0.12, rx: 0.15, rz: 0.12 }, { y: 0.3, rx: 0.2, rz: 0.15 }, { y: 0.38, rx: 0.13, rz: 0.12 }], { sides: 10, color: c1, sq: 3 });
      mb.rbox(0, 0.22, 0.14, 0.2, 0.2, 0.06, c2, 0.3);
      for (let i = 0; i < 5; i++) mb.box(0, 0.02 + i * 0.05, -0.13, 0.16 - i * 0.01, 0.03, 0.04, c2);
    }));
    m.attach('head', meshOf(mb => { mb.rbox(0, 0.05, 0, 0.12, 0.1, 0.14, c1, 0.35); mb.blade([0, 0.1, -0.02], [0, 1, -0.6], 0.14, 0.05, 0.02, c3); mb.box(0, 0.05, 0.072, 0.08, 0.02, 0.01, '#101820'); }));
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      m.attach('sh' + s, meshOf(mb => { mb.sphere(sx * 0.04, 0.02, 0, 0.12, 0.08, 0.13, c3, 10, 6, true, null, 4); for (let i = 0; i < 3; i++) mb.spike([sx * (0.06 + i * 0.03), 0.07, -0.04 + i * 0.03], [sx * 0.4, 1, -0.2], 0.08, 0.02, 4, c2); }));
      m.attach('arm' + s, meshOf(mb => mb.loft([{ y: 0, rx: 0.055, rz: 0.055 }, { y: -0.2, rx: 0.045, rz: 0.05 }], { sides: 8, color: c1 })));
      m.attach('fore' + s, meshOf(mb => { mb.loft([{ y: 0, rx: 0.05, rz: 0.05 }, { y: -0.22, rx: 0.07, rz: 0.07 }], { sides: 8, color: c2 }); mb.rbox(0, -0.25, 0, 0.1, 0.08, 0.1, c1, 0.3); }));
      m.attach('leg' + s, meshOf(mb => mb.loft([{ y: 0, rx: 0.07, rz: 0.08 }, { y: -0.22, rx: 0.06, rz: 0.07 }], { sides: 8, color: c1 })));
      m.attach('shin' + s, meshOf(mb => { mb.loft([{ y: 0, rx: 0.06, rz: 0.07 }, { y: -0.2, rx: 0.08, rz: 0.09 }], { sides: 8, color: c2 }); mb.rbox(0, -0.2, 0.03, 0.12, 0.04, 0.18, c1, 0.3); }));
    }
    m.coreBone = 'body'; m.corePt = [0, 0.22, 0.18]; m.eyeBone = 'head'; m.eyePt = [0, 0.05, 0.08];
    return m;
  }
  function ultimateLike() {
    const m = new FF7.Model(), c1 = '#9eacbe', c2 = '#5a6a84', c3 = '#e8eef4';
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('neck', 'body', [0, 0.02, 0.3]); m.bone('head', 'neck', [0, 0.04, 0.2]);
    m.bone('tail', 'body', [0, 0, -0.32]);
    m.bone('wingL', 'body', [0.08, 0.05, 0.08]); m.bone('wingR', 'body', [-0.08, 0.05, 0.08]);
    m.attach('body', meshOf(mb => { mb.push(); mb.rotate(Math.PI / 2, 0, 0); mb.loft([{ y: -0.34, rx: 0.06, rz: 0.05 }, { y: -0.1, rx: 0.12, rz: 0.1 }, { y: 0.15, rx: 0.13, rz: 0.11 }, { y: 0.32, rx: 0.07, rz: 0.07 }], { sides: 10, color: c1 }); mb.pop(); for (let i = 0; i < 6; i++) mb.blade([0, 0.09, 0.2 - i * 0.09], [0, 1, -0.6], 0.08, 0.04, 0.015, c3); }));
    m.attach('neck', meshOf(mb => { mb.sweep([[0, 0, 0], [0, 0.03, 0.1], [0, 0.04, 0.2]], [0.06, 0.05, 0.045], { sides: 8, color: c1 }); }));
    m.attach('head', meshOf(mb => { mb.push(); mb.rotate(Math.PI / 2, 0, 0); mb.loft([{ y: -0.02, rx: 0.05, rz: 0.045 }, { y: 0.1, rx: 0.035, rz: 0.03 }, { y: 0.18, rx: 0.01, rz: 0.012 }], { sides: 8, color: c1 }); mb.pop(); for (const s of [-1, 1]) mb.blade([s * 0.03, 0.03, 0], [s * 0.3, 0.5, -1], 0.12, 0.03, 0.015, c3); }));
    m.attach('tail', meshOf(mb => { mb.sweep([[0, 0, 0], [0, 0.02, -0.2], [0, 0.05, -0.4], [0, 0.1, -0.6]], [0.05, 0.035, 0.02, 0], { sides: 6, color: c1 }); mb.blade([0, 0.1, -0.6], [0, 0.3, -1], 0.12, 0.08, 0.01, c2); }));
    for (const s of [1, -1]) {
      m.attach(s > 0 ? 'wingL' : 'wingR', meshOf(mb => {
        const tip = [s * 0.75, 0.08, -0.05], mid = [s * 0.4, 0.12, 0.02], back1 = [s * 0.6, 0, -0.3], back2 = [s * 0.3, 0, -0.32], root = [0, 0, -0.15];
        mb.sweep([[0, 0, 0], mid, tip], [0.03, 0.025, 0.005], { sides: 5, color: c1 });
        const pts = [[0, 0, 0], mid, tip, back1, back2, root];
        for (let i = 1; i < pts.length - 1; i++) { mb.tri(pts[0], pts[i], pts[i + 1], c2); mb.tri(pts[0], pts[i + 1], pts[i], sh(c2, -0.2)); }
        mb.sweep([mid, back1], 0.01, { sides: 4, color: c1 }); mb.sweep([mid, back2], 0.01, { sides: 4, color: c1 });
      }), null, { cull: false });
    }
    m.coreBone = 'body'; m.corePt = [0, -0.06, 0.1]; m.eyeBone = 'head'; m.eyePt = [0, 0.02, 0.1];
    m.flier = true;
    return m;
  }
  const BUILD = {
    sapphire_weapon: () => sapphireLike('#2c4478', '#5a82c8', '#a8c8f0', '#ffe040'),
    ruby_weapon: () => sapphireLike('#6a1018', '#b02030', '#f08040', '#ffff80'),
    emerald_weapon: () => sapphireLike('#0e4428', '#20a060', '#80f0b0', '#ffff40'),
    diamond_weapon: diamondLike,
    ultimate_weapon: ultimateLike,
  };
  // K.weapon(id, height) -> model scaled to `height` (a dedicated creature model is used when one exists)
  K.weapon = function (id, height) {
    const own = BUILD[id] || BUILD.sapphire_weapon;
    let m = null;
    const CR = FF7.creatures;
    if (CR && CR.MODELS && CR.MODELS[id]) { try { m = K.creature(id); } catch (e) { m = null; } }
    if (m) { const b = K.modelBox(m); m.scale = height / Math.max(0.01, b.size[1]); m.external = true; }
    else { m = own(); m.scale = height; }
    m.weaponId = id;
    return m;
  };
  // point on a weapon model (world), falls back to the model position
  K.wpt = (m, bone, p) => { m.computeWorld(); return m.bones[bone] ? m.worldPoint(bone, p) : V.add(m.position, [0, (p ? p[1] : 0.5) * m.scale, 0]); };

  // ================================================================== Meteor + Holy
  SET.meteor = () => once('meteor', () => {
    const mb = new MB();
    mb.sphere(0, 0, 0, 1, 1, 1, '#ffffff', 28, 18, true);
    const m = mb.build();
    for (let i = 0; i < m.count; i++) {
      const x = m.pos[i * 3], y = m.pos[i * 3 + 1], z = m.pos[i * 3 + 2];
      const n = K.vnoise(x * 3 + 5, y * 3 + z * 2, 3) * 0.6 + K.vnoise(x * 7, z * 7 + y, 8) * 0.4;
      const r = 0.9 + n * 0.2;
      m.pos[i * 3] = x * r; m.pos[i * 3 + 1] = y * r; m.pos[i * 3 + 2] = z * r;
      const hot = Math.max(0, 0.55 - n) * 2;
      const c = K.mixc('#3a1a12', '#ff5010', Math.min(1, hot));
      m.col[i * 4] = c[0]; m.col[i * 4 + 1] = c[1]; m.col[i * 4 + 2] = c[2];
    }
    return m;
  });
  // Draw Meteor at p with radius r (glow corona + flames), a = intensity
  K.drawMeteor = function (S, p, r, a = 1, rot = 0) {
    K.put(SET.meteor(), p, [0.3, rot + (S.f || 0) * 0.0006, 0.2], r, { add: [0.08, 0.02, 0] });
    S.glow(p, r * 5.5, '#ff3010', 0.55 * a); S.glow(p, r * 3.2, '#ff8030', 0.6 * a);
    for (let i = 0; i < 18; i++) { const an = i / 18 * TAU + (S.f || 0) * 0.002; const q = V.add(p, V.scale([Math.cos(an), Math.sin(an), 0.3], r * (1.05 + 0.1 * Math.sin((S.f || 0) * 0.05 + i)))); S.glow(q, r * (0.9 + (i % 3) * 0.3), i % 2 ? '#ff5a18' : '#ffb040', 0.5 * a, an); }
  };
  K.drawHoly = function (S, p, r, a = 1) {
    const t = (S.f || 0) * 0.03;
    S.glow(p, r * 7, '#80c0ff', 0.45 * a); S.glow(p, r * 3.5, '#e0f0ff', 0.7 * a); S.core(p, r * 1.6, '#ffffff', a);
    S.flare(p, r * 9, '#ffffff', 0.6 * a, t * 0.2);
    for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + t * 0.4; S.beam(p, V.add(p, [Math.cos(an) * r * 8, Math.sin(an) * r * 8, 0]), r * 0.6, '#c0e0ff', 0.4 * a, 0); }
  };

  // ================================================================== the Northern Crater (snowfield, rim, bowl)
  SET.crater = () => once('crater', () => {
    const mb = new MB(), gb = new MB(), r = K.rng('crater');
    const hFn = (x, z) => {
      const d = Math.hypot(x, z);
      const rim = Math.exp(-Math.pow((d - 900) / 180, 2)) * 260 * (0.8 + K.vnoise(x / 300, z / 300, 4) * 0.4);
      const bowl = d < 900 ? -Math.pow(1 - d / 900, 1.5) * 520 : 0;
      return rim + bowl + (K.vnoise(x / 120, z / 120, 2) - 0.5) * 30;
    };
    K.terrain(mb, -3200, -3200, 3200, 3200, 64, 64, hFn, (x, z, y) => { const d = Math.hypot(x, z); return d < 780 ? sh('#3a3e4a', (K.vnoise(x / 80, z / 80, 1) - 0.5) * 0.3) : (y > 120 ? sh('#8a8e9a', (K.vnoise(x / 60, z / 60, 3) - 0.5) * 0.3) : sh('#dce4f0', (K.vnoise(x / 200, z / 200, 5) - 0.5) * 0.1)); });
    for (let i = 0; i < 40; i++) { const a = r() * TAU, d = 60 + r() * 420; const x = Math.cos(a) * d, z = Math.sin(a) * d; gb.spike([x, hFn(x, z) - 10, z], [(r() - 0.5) * 0.6, 1, (r() - 0.5) * 0.6], 60 + r() * 140, 10 + r() * 16, 5, '#80e0e8'); }
    return { mesh: mb.build(), crystals: gb.build({ unlit: true, blend: 'add', tint: [0.4, 0.8, 0.8, 0.5], cull: false }), hFn, bottom: [0, -520, 0] };
  });
  K.drawCrater = function (S, cr, o = {}) {
    GL.draw(cr.mesh);
    GL.draw(cr.crystals, null, { blend: 'add', unlit: true, tint: [0.3, 0.7, 0.7, 0.35 * (o.crystal || 1)], cull: false });
    const g = o.glow != null ? o.glow : 1, t = (S.f || 0) * 0.01;
    if (g > 0) { S.glow([0, -440, 0], 900 * g, '#20ff90', 0.3 * g); S.haze([0, -300, 0], 800, '#20c070', 0.2 * g); }
    // the vortex of cloud over the crater
    const vx = o.vortex != null ? o.vortex : 1;
    if (vx > 0) for (let i = 0; i < 26; i++) { const a = i / 26 * TAU + t * (0.4 + (i % 3) * 0.1), rr = 300 + (i % 5) * 160; S.haze([Math.cos(a) * rr, 380 + (i % 4) * 90, Math.sin(a) * rr], 520, i % 2 ? '#5a6a80' : '#8090a8', 0.12 * vx, a); }
  };

  // ================================================================== Junon (cliff town over the sea, the great cannon)
  SET.junon = () => once('junon', () => {
    const mb = new MB(), tb = new MB(), gb = new MB(), r = K.rng('junon');
    const hFn = (x, z) => { const c = -x - 60 + Math.sin(z / 90) * 40; return c < 0 ? -20 : Math.min(160, c * 0.9) + (K.vnoise(x / 80, z / 80, 3) - 0.5) * 18; };
    K.terrain(mb, -1400, -1400, 200, 1400, 40, 50, hFn, (x, z, y) => y < 2 ? '#8a7a60' : sh('#5a5e4a', (K.vnoise(x / 60, z / 60, 2) - 0.5) * 0.3 + y * 0.001));
    // the upper-city platform, on legs, over the sea
    mb.box(120, 150, 0, 520, 14, 300, '#5a6068');
    for (let x = -80; x < 380; x += 70) for (const z of [-120, 0, 120]) mb.box(x, 72, z, 12, 144, 12, '#4a5058');
    for (let i = 0; i < 40; i++) { const x = -60 + r() * 420, z = (r() - 0.5) * 260, w = 20 + r() * 30, h = 10 + r() * 40; K.tbox(tb, x, 157, z, w, 18 + r() * 25, h, sh('#ffffff', -r() * 0.3), 0.08, 0.2, { u0: r() }); }
    // the cannon: base turret and the huge barrel pointing out to sea (+x)
    mb.prism(240, 157, 0, 50, 44, 24, 16, '#4a4e56', true);
    mb.push(); mb.translate(240, 196, 0); mb.rotate(0, 0, -Math.PI / 2 + 0.08);
    mb.prism(0, -20, 0, 26, 24, 80, 16, '#5a5e66', true);
    mb.prism(0, 60, 0, 22, 18, 200, 16, '#62666e', true);
    mb.prism(0, 260, 0, 18, 15, 170, 16, '#6a6e76', true);
    mb.prism(0, 430, 0, 20, 20, 12, 16, '#3a3e44', true);
    for (let y = 70; y < 420; y += 40) mb.prism(0, y, 0, 23 - y * 0.018, 23 - y * 0.018, 5, 16, '#3a3e44', true);
    mb.pop();
    // lower Junon: fishing village at the foot of the cliff
    for (let i = 0; i < 16; i++) { const x = -60 - r() * 60, z = (r() - 0.5) * 400; mb.box(x, 3, z, 8, 6, 8, sh('#8a7a68', (r() - 0.5) * 0.2)); mb.frustum(x, 6, z, 9, 9, 9, 1, 3, '#6a4030'); }
    for (let x = -60; x < 380; x += 30) gb.box(x, 143, 150.5, 3, 2, 0.5, '#ffe8b0');
    const d = [Math.cos(0.08), Math.sin(0.08), 0];
    return { mesh: mb.build(), tex: tb.build({ tex: K.TEXW.day, texOpts: { repeat: true } }), glow: gb.build({ unlit: true }), hFn, muzzle: [240 + d[0] * 440, 196 + d[1] * 440, 0], cannonAxis: d, cannonBase: [240, 196, 0] };
  });

  // ================================================================== Mideel (island village)
  SET.mideel = () => once('mideel', () => {
    const mb = new MB(), r = K.rng('mideel');
    const hFn = (x, z) => { const d = Math.hypot(x, z * 1.2); return d < 260 ? 6 - d * 0.01 + (K.vnoise(x / 40, z / 40, 2) - 0.5) * 3 : 6 - 2.6 - (d - 260) * 0.12; };
    K.terrain(mb, -700, -700, 700, 700, 44, 44, hFn, (x, z, y) => y < 1 ? '#d8c890' : sh('#4a8a3a', (K.vnoise(x / 30, z / 30, 1) - 0.5) * 0.3));
    const houses = [];
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU + r() * 0.3, d = 40 + r() * 70, x = Math.cos(a) * d, z = Math.sin(a) * d, y = hFn(x, z);
      mb.push(); mb.translate(x, y, z); mb.rotate(0, -a, 0);
      for (const [px, pz] of [[-3, -3], [3, -3], [3, 3], [-3, 3]]) mb.box(px, 1, pz, 0.4, 2, 0.4, '#5a4028');
      mb.box(0, 3.5, 0, 7, 3, 7, sh('#a08050', (r() - 0.5) * 0.2));
      mb.frustum(0, 5, 0, 9, 9, 0.5, 0.5, 4, sh('#c0a060', (r() - 0.5) * 0.15));
      mb.pop();
      houses.push([x, y, z]);
    }
    for (let i = 0; i < 70; i++) { const x = (r() - 0.5) * 460, z = (r() - 0.5) * 380; if (Math.hypot(x, z) < 30) continue; K.tree(mb, x, hFn(x, z) - 0.3, z, 12 + r() * 8, r() < 0.7 ? 'palm' : 'jungle', r); }
    return { mesh: mb.build(), hFn, houses };
  });

  // ================================================================== Rocket Town (the launch pad)
  SET.rocketTown = () => once('rocketTown', () => {
    const mb = new MB(), r = K.rng('rt');
    const hFn = (x, z) => { const d = Math.hypot(x, z); return d < 300 ? 0 : (d - 300) * 0.4 * (0.5 + K.vnoise(x / 200, z / 200, 3)); };
    K.terrain(mb, -2000, -2000, 2000, 2000, 44, 44, hFn, (x, z, y) => y > 60 ? sh('#6a6a5a', (K.vnoise(x / 80, z / 80, 1) - 0.5) * 0.3) : sh('#8a7a58', (K.vnoise(x / 50, z / 50, 2) - 0.5) * 0.2));
    // launch pad + gantry tower
    mb.prism(0, 0, 0, 40, 36, 6, 16, '#6a6a6e', true);
    mb.box(0, 3, 26, 30, 6, 16, '#5a5a5e');
    const gx = 18;
    for (const [dx, dz] of [[-5, -5], [5, -5], [5, 5], [-5, 5]]) mb.box(gx + dx, 55, dz, 1.2, 110, 1.2, '#a03020');
    for (let y = 6; y < 110; y += 10) { mb.box(gx, y, -5, 11, 0.8, 0.8, '#a03020'); mb.box(gx, y, 5, 11, 0.8, 0.8, '#a03020'); mb.box(gx - 5, y, 0, 0.8, 0.8, 11, '#a03020'); mb.box(gx + 5, y, 0, 0.8, 0.8, 11, '#a03020'); }
    for (const y of [30, 60, 90]) mb.box(gx - 9, y, 0, 8, 1.2, 3, '#8a2a1a');
    // houses of Rocket Town
    for (let i = 0; i < 26; i++) { const a = r() * TAU, d = 90 + r() * 180, x = Math.cos(a) * d, z = Math.sin(a) * d; mb.push(); mb.translate(x, 0, z); mb.rotate(0, r() * TAU, 0); mb.box(0, 3, 0, 10, 6, 8, sh('#a09070', (r() - 0.5) * 0.2)); mb.frustum(0, 6, 0, 11, 9, 11, 0.5, 3.5, sh('#6a4a3a', (r() - 0.5) * 0.2)); mb.pop(); }
    return { mesh: mb.build(), hFn };
  });

  // ================================================================== sea + far Midgar coast; canyon; grass plains
  SET.sea = (c1, c2) => once('sea' + c1 + c2, () => K.meshOf(mb => K.groundDisc(mb, 12000, (rr) => U.mix(c1, c2, Math.min(1, rr / 6000)), 18, 48, 0, 11)));
  SET.canyon = () => once('canyon', () => {
    const mb = new MB(), r = K.rng('canyon');
    const hFn = (x, z) => {
      let h = 0;
      if (z < 60) { const m = K.vnoise(x / 140, z / 140, 6); h = m > 0.45 ? 120 + (m - 0.45) * 160 : 20 + K.vnoise(x / 40, z / 40, 2) * 10; }
      if (z > -200 && z < 60 && x > -280 && x < 60) h = 120 + (K.vnoise(x / 25, z / 25, 9) - 0.5) * 3;   // the ridge / lookout cliff
      if (z >= 60) h = -40 + K.vnoise(x / 300, z / 300, 4) * 20;       // the plain below
      return h;
    };
    K.terrain(mb, -1500, -1500, 1500, 3000, 60, 90, hFn, (x, z, y) => y > 60 ? sh('#b06a3a', (K.vnoise(x / 30, y / 12, 3) - 0.5) * 0.35) : y > 0 ? sh('#9a5a34', (K.vnoise(x / 30, z / 30, 1) - 0.5) * 0.3) : sh('#6a8a48', (K.vnoise(x / 120, z / 120, 5) - 0.5) * 0.3));
    for (let i = 0; i < 90; i++) { const x = (r() - 0.5) * 2400, z = 200 + r() * 2400; K.tree(mb, x, hFn(x, z) - 1, z, 10 + r() * 14, 'jungle', r); }
    return { mesh: mb.build(), hFn };
  });
  SET.plains = () => once('plains', () => {
    const mb = new MB(), r = K.rng('plains');
    const hFn = (x, z) => (K.vnoise(x / 260, z / 260, 7) - 0.5) * 50 * Math.min(1, Math.hypot(x, z) / 400);
    K.terrain(mb, -3000, -3000, 3000, 3000, 50, 50, hFn, (x, z, y) => sh('#4a6a30', (K.vnoise(x / 60, z / 60, 3) - 0.5) * 0.3 + y * 0.004));
    for (let i = 0; i < 120; i++) { const x = (r() - 0.5) * 2400, z = (r() - 0.5) * 2400; if (Math.hypot(x, z) < 200) continue; K.tree(mb, x, hFn(x, z) - 1, z, 10 + r() * 10, 'pine', r); }
    return { mesh: mb.build(), hFn };
  });
})();

// ----------------------------------------------------------------------------- Disc 2 movies (no original FMV available: recreated)
(function () {
  const U = FF7.util, V = FF7.V3, M4 = FF7.M4;
  const CIN = FF7.cinema, K = CIN.K, SET = K.SET, TAU = K.TAU, L = K.L;
  const { ease, easeIn, easeOut, seg, bump, LV, path } = K;
  const GL = FF7.GL, def = CIN.def, env = K.envOf, once = K.once, sh = U.shade;
  const MID = SET.MID, P = K.polar;

  // ------------------------------------------------------------------ shared: km-scale environments, weapon motion
  const E = K.ENVX = {
    crater: env('crater', { sky: ['#01030a', '#10203a', '#02040a'], stars: 0.8, fog: { color: [0.06, 0.09, 0.14], near: 900, far: 9000 }, light: { dir: [0.4, -0.6, -0.7], color: [0.55, 0.62, 0.8], ambient: [0.2, 0.23, 0.3], dir2: [0, 1, 0], color2: [0.1, 0.45, 0.3] } }),
    craterRed: env('crater', { sky: ['#1a0206', '#6a1a10', '#120204'], stars: 0, fog: { color: [0.26, 0.07, 0.05], near: 900, far: 9000 }, light: { dir: [0.4, -0.6, -0.7], color: [0.8, 0.4, 0.3], ambient: [0.28, 0.14, 0.12] } }),
    sea: env('day', { sky: ['#3a5a80', '#aab8c4', '#40505a'], fog: { color: [0.62, 0.68, 0.74], near: 800, far: 9000 }, light: { dir: [-0.4, -0.7, -0.5], color: [0.8, 0.8, 0.78], ambient: [0.42, 0.45, 0.5] } }),
    stormSea: env('day', { sky: ['#1a2230', '#5a6470', '#1a2028'], fog: { color: [0.32, 0.36, 0.4], near: 600, far: 8000 }, light: { dir: [-0.3, -0.8, -0.5], color: [0.55, 0.58, 0.62], ambient: [0.32, 0.35, 0.4] } }),
    tropic: env('sunny_sea', { fog: { color: [0.62, 0.78, 0.86], near: 800, far: 9000 } }),
    dusk: env('dawn', { sky: ['#1a1a3a', '#e07848', '#3a2a28'], sun: { dir: [0.8, 0.08, -0.6], color: '#ffb070', size: 0.18 }, fog: { color: [0.55, 0.38, 0.34], near: 800, far: 12000 }, light: { dir: [-0.8, -0.3, 0.6], color: [0.95, 0.66, 0.46], ambient: [0.3, 0.26, 0.32] } }),
    night: env('night', { fog: { color: [0.04, 0.06, 0.12], near: 800, far: 9000 } }),
  };
  // walking giant: legs/arms swing (own models; harmless on others)
  const giantWalk = (m, t, amp = 1) => { const s = Math.sin(t), c = Math.cos(t); m.b('legL').rot[0] = s * 0.35 * amp; m.b('legR').rot[0] = -s * 0.35 * amp; m.b('shinL').rot[0] = Math.max(0, c) * 0.4 * amp; m.b('shinR').rot[0] = Math.max(0, -c) * 0.4 * amp; m.b('armL').rot[0] = -s * 0.25 * amp; m.b('armR').rot[0] = s * 0.25 * amp; m.b('body').rot[2] = s * 0.03 * amp; m.b('root').pos[1] += Math.abs(c) * 0.01 * amp; };
  const flap = (m, t, amp = 1) => { const s = Math.sin(t); m.b('wingL').rot[2] = s * 0.6 * amp; m.b('wingR').rot[2] = -s * 0.6 * amp; m.b('tail').rot[0] = Math.sin(t * 0.5) * 0.15; m.b('neck').rot[0] = Math.sin(t * 0.5 + 1) * 0.08; };
  const roar = (m, a) => { m.b('head').rot[0] -= 0.4 * a; m.b('jaw').rot[0] += 0.5 * a; m.b('neck').rot[0] -= 0.25 * a; };
  K.giantWalk = giantWalk; K.flap = flap; K.roar = roar;
  const eyeGlow = (S, m, c, s) => {
    if (!m.eyeBone || m.external) return;
    for (const dx of [-0.045, 0.045]) {
      let p = K.wpt(m, m.eyeBone, [m.eyePt[0] + dx, m.eyePt[1], m.eyePt[2]]);
      const to = V.sub(K.CAM.eye, p), d = V.len(to); p = V.add(p, V.scale(to, Math.min(0.5, (m.scale * 0.06) / Math.max(1, d))));
      S.glow(p, s, c || '#ffe040', 0.9); S.core(p, s * 0.3, '#ffffff', 0.9);
    }
  };
  const coreGlow = (S, m, c, s, a = 1) => { const p = m.external ? V.add(m.position, [0, m.scale * 0.6, m.scale * 0.1]) : K.wpt(m, m.coreBone, m.corePt); S.glow(p, s, c, 0.7 * a); S.core(p, s * 0.35, '#ffffff', 0.8 * a); return p; };
  K.eyeGlow = eyeGlow; K.coreGlow = coreGlow;
  const wake = (S, p, s, n) => S.fx.emit(n || 2, { p, spread: [s, 0.2 * s, s], v: [0, 0.15 * s, 0], vs: 0.12 * s, life: 80, size: [s * 1.5, s * 4], c0: '#f4f8ff', c1: '#a8c0d0', kind: 'smoke', grav: 0.004 * s, alpha: 0.7, fadeIn: 0.05 });
  K.wake = wake;

  // ================================================================== WEAPONS AWAKEN (Northern Crater)
  def('weapons_awaken', {
    music: 'weaponraid',
    grade: { tint: '#c8d4f0', vignette: 0.6 },
    sample: 'Deep in the Northern Crater the Lifestream boils over.\nThe earth splits, the ice gives way... and the WEAPONs, the Planet\'s ancient guardians, awaken.',
    shots: [
      // 1. the core cavern: green light surging up between giant crystals
      { dur: 300, env: E.crater, fadeIn: 40,
        init(S) { S.cr = SET.crater(); },
        update(S, k) { S.shake(0.4 + k * 1.2); if (S.f % 2 === 0) S.fx.emit(3, { p: [0, -500, 0], spread: [260, 20, 260], v: [0, 1.2, 0], vs: 0.4, life: 200, size: [6, 2], c0: '#c0ffd8', c1: '#20ff80', kind: 'core' }); if (S.cue('rum', k > 0.05)) S.sfx('falling'); },
        cam: (S, k) => ({ eye: LV([420, -220, 380], [300, -330, 260], ease(k)), at: [0, -470, 0], fov: 52, near: 2, far: 9000 }),
        draw(S, k) { K.drawCrater(S, S.cr, { glow: 1 + k * 1.5, vortex: 0 }); for (let i = 0; i < 6; i++) S.beam([Math.sin(i * 2) * 120, -520, Math.cos(i * 2) * 120], [Math.sin(i * 2) * 140, -150, Math.cos(i * 2) * 140], 40, '#40ff90', 0.25 * (0.6 + 0.4 * Math.sin(S.f * 0.07 + i)), 0); } },
      // 2. an eye opens in the wall of ice
      { dur: 210, env: E.crater,
        init(S) { S.w = S.add(K.weapon('sapphire_weapon', 180)); S.w.position = [0, -560, -60]; S.w.rotY = 0; S.cr = SET.crater(); K.pose(S.w, (m) => { m.b('head').rot[0] = 0.2; }); },
        update(S, k) { S.shake(0.3); if (S.cue('eye', k > 0.35)) S.sfx('magic'); },
        cam: (S, k) => { const e = K.wpt(S.w, S.w.eyeBone || 'head', S.w.eyePt || [0, 0, 0]); return { eye: V.add(e, [L(20, 12, k), 6, L(70, 46, k)]), at: e, fov: 40, near: 1, far: 6000 }; },
        draw(S, k) { K.drawCrater(S, S.cr, { vortex: 0 }); const a = ease(seg(k, 0.3, 0.6)); if (a > 0) eyeGlow(S, S.w, '#ffe040', 14 * a); S.haze(K.wpt(S.w, 'head', [0, 0, 0]), 90, '#40ff90', 0.12); } },
      // 3. a WEAPON tears itself out of the crater wall, rock and ice exploding outward
      { dur: 300, env: E.crater,
        init(S) { S.cr = SET.crater(); S.w = S.add(K.weapon('ruby_weapon', 260)); S.w.rotY = Math.PI * 0.8; K.pose(S.w, (m) => { roar(m, bump(S.k, 0.3, 1)); m.b('armL').rot[0] = -1.2 * bump(S.k, 0.1, 0.8); m.b('armR').rot[0] = -1.4 * bump(S.k, 0.15, 0.9); }); },
        update(S, k) {
          const u = easeOut(seg(k, 0.1, 0.7));
          S.w.position = [-380 + u * 60, -420 + u * 160, -520 + u * 60];
          S.shake(0.6 + bump(k, 0.1, 0.5) * 1.5);
          if (S.cue('burst', k > 0.12)) { K.explode(S, [-360, -320, -500], 40, { n: 60, debris: 80, c0: '#e0f0ff', c1: '#80a0c0', smoke: '#8a98b0' }); S.sfx('bosskill'); }
          if (k > 0.12 && S.f % 3 === 0) S.fx.emit(4, { p: [-360, -300, -500], spread: 60, v: [20, 8, 20], vs: 10, life: 90, size: [14, 8], c0: '#c8d8f0', kind: 'smoke', grav: 0.35, alpha: 0.9 });
        },
        cam: (S, k) => ({ eye: [-160, -300, -260], at: LV([-360, -300, -500], V.add(S.w.position, [0, 150, 0]), ease(k)), fov: 54, near: 2, far: 9000 }),
        draw(S) { K.drawCrater(S, S.cr, { vortex: 0 }); eyeGlow(S, S.w, '#ffff80', 14); } },
      // 4. outside: a pillar of light, and the WEAPONs rise out of the crater
      { dur: 360, env: E.crater, dissolve: 30,
        init(S) {
          S.cr = SET.crater();
          S.u = S.add(K.weapon('ultimate_weapon', 240)); S.s = S.add(K.weapon('sapphire_weapon', 420)); S.e = S.add(K.weapon('emerald_weapon', 380));
          K.pose(S.u, (m) => flap(m, S.f * 0.12)); K.pose(S.s, (m) => roar(m, bump(S.k, 0.4, 1)));
        },
        update(S, k) {
          S.u.position = [L(-100, 300, ease(k)), L(-200, 700, easeOut(k)), L(0, 500, ease(k))]; S.u.rotY = 0.9; S.u.rotX = -0.4;
          S.s.position = [-300, L(-600, 60, easeOut(seg(k, 0, 0.8))), -500]; S.s.rotY = 0.6;
          S.e.position = [500, L(-700, -60, easeOut(seg(k, 0.15, 1))), -300]; S.e.rotY = -0.8;
          S.shake(0.5);
        },
        cam: (S, k) => ({ eye: LV([1250, 180, 1350], [1050, 240, 1150], ease(k)), at: [0, 260, 0], fov: 52, near: 5, far: 12000 }),
        draw(S, k) {
          K.drawCrater(S, S.cr, { glow: 2, vortex: 1 });
          S.beam([0, -500, 0], [0, 4000, 0], 260 + Math.sin(S.f * 0.1) * 30, '#40ff90', 0.55, 0.0);
          S.beamCore([0, -500, 0], [0, 2600, 0], 80, '#e0fff0', 0.7, 0);
          eyeGlow(S, S.s, '#ffe040', 30); eyeGlow(S, S.e, '#ffff40', 26); eyeGlow(S, S.u, '#ff4040', 18);
        } },
      // 5. the Highwind escapes; Ultimate WEAPON sweeps past it
      { dur: 300, env: E.crater, dissolve: 20,
        init(S) { S.h = K.highwind(); S.u = S.add(K.weapon('ultimate_weapon', 200)); K.pose(S.u, (m) => flap(m, S.f * 0.14, 1.2)); S.cr = SET.crater(); },
        update(S, k) {
          S.h.position = [L(600, 1400, k), L(500, 640, k), L(900, 1500, k)]; S.h.rotY = 0.9; S.h.rotZ = -0.1;
          S.u.position = [L(1600, 400, ease(k)), L(900, 520, ease(k)), L(1700, 800, ease(k))]; S.u.rotY = Math.atan2(-1200, -900); S.u.rotZ = 0.4;
          if (S.cue('whoosh', k > 0.4)) S.sfx('run_attack');
        },
        cam: (S, k) => ({ eye: V.add(S.h.position, [-120 + k * 40, 50, -220]), at: V.add(S.h.position, [0, 0, 60]), fov: 50, near: 2, far: 12000 }),
        draw(S) { K.drawCrater(S, S.cr, { glow: 1.5, vortex: 1 }); S.h.draw(); eyeGlow(S, S.u, '#ff4040', 10); } },
      // 6. a shimmering barrier closes over the Northern Crater
      { dur: 300, env: E.crater, dissolve: 30,
        init(S) { S.cr = SET.crater(); S.s = S.add(K.weapon('sapphire_weapon', 420)); S.s.position = [-600, 60, -400]; S.s.rotY = 0.8; K.pose(S.s, (m) => roar(m, bump(S.k, 0.1, 0.7))); },
        update(S, k) { if (S.cue('b', k > 0.2)) S.sfx('heal2'); S.shake(0.2); },
        cam: (S, k) => ({ eye: LV([2800, 700, 2600], [2600, 900, 2400], ease(k)), at: [0, 300, 0], fov: 50, near: 5, far: 20000 }),
        draw(S, k) {
          K.drawCrater(S, S.cr, { glow: 1, vortex: 1 }); eyeGlow(S, S.s, '#ffe040', 30);
          const a = ease(seg(k, 0.15, 0.8));
          for (let i = 0; i < 36; i++) { const an = i / 36 * TAU, el = (i % 6) / 6 * 1.4 * a; const p = [Math.cos(an) * Math.cos(el) * 1150, 100 + Math.sin(el) * 1000, Math.sin(an) * Math.cos(el) * 1150]; S.glow(p, 520, i % 2 ? '#60ffc0' : '#80d0ff', 0.14 * a * (0.8 + 0.2 * Math.sin(S.f * 0.1 + i))); }
          S.ring([0, 150 + a * 800, 0], 2400 * a, '#a0ffe0', 0.3 * a);
        } },
      // 7. over the sea the WEAPONs scatter across the world
      { dur: 330, env: env('night', { fog: { color: [0.05, 0.07, 0.12], near: 800, far: 10000 }, moon: { dir: [-0.4, 0.3, -0.8] } }), dissolve: 30, fadeOut: 60,
        init(S) { S.sea = SET.sea('#0a1a30', '#10284a'); S.s = S.add(K.weapon('sapphire_weapon', 300)); S.u = S.add(K.weapon('ultimate_weapon', 160)); K.pose(S.s, (m) => giantWalk(m, S.f * 0.04, 0.8)); K.pose(S.u, (m) => flap(m, S.f * 0.12)); },
        update(S, k) {
          S.s.position = [L(-200, 60, k), -120, L(-700, -520, k)]; S.s.rotY = 0.7;
          S.u.position = [L(300, -500, k), L(200, 260, k), L(-200, -1100, k)]; S.u.rotY = -2.3;
          if (S.f % 2 === 0) wake(S, V.add(S.s.position, [0, 120, 40]), 12, 2);
        },
        cam: (S, k) => ({ eye: [L(-120, 40, k), 40, L(-120, 20, k)], at: V.add(S.s.position, [0, 160, 0]), fov: 50, near: 2, far: 12000 }),
        draw(S) { GL.draw(S.sea); eyeGlow(S, S.s, '#ffe040', 16); } },
    ],
  });

  // ================================================================== METEOR
  def('meteor', {
    music: 'nightmare',
    grade: { tint: '#ffd8c8', vignette: 0.65 },
    sample: 'The Black Materia has been used.\nThe sky over the Planet turns the colour of blood,\nand Meteor, a star of destruction, appears in the heavens.',
    shots: [
      // 1. above the crater a red light pierces the clouds
      { dur: 300, env: E.craterRed, fadeIn: 40,
        init(S) { S.cr = SET.crater(); },
        update(S, k) { S.shake(0.3); if (S.cue('s', k > 0.1)) S.sfx('magic'); },
        cam: (S, k) => ({ eye: LV([2600, 500, 2400], [2300, 700, 2100], ease(k)), at: [0, L(200, 1400, ease(k)), 0], fov: 48, near: 5, far: 12000 }),
        draw(S, k) { K.drawCrater(S, S.cr, { glow: 0.5, vortex: 1.5 }); const a = ease(seg(k, 0.1, 0.6)); S.beam([0, -300, 0], [0, 6000, 0], 200 * a + 40, '#ff3010', 0.6 * a, 0.1); S.beamCore([0, -300, 0], [0, 5000, 0], 50 * a, '#ffd0a0', 0.8 * a, 0); } },
      // 2. storm clouds churn blood red, lightning in their depths
      { dur: 300, env: env('meteor', { fog: { color: [0.3, 0.07, 0.04], near: 400, far: 6000 } }), dissolve: 30,
        cam: (S, k) => ({ eye: [0, 0, 0], at: [Math.sin(k * 0.4) * 10, 6 + k * 3, -10], fov: 56, roll: 0.1 - k * 0.1 }),
        draw(S, k) {
          const t = S.f * 0.004;
          for (let i = 0; i < 44; i++) { const a = i / 44 * TAU + t * (i % 2 ? 1 : -0.7); const rr = 200 + (i % 7) * 150; S.smoke([Math.cos(a) * rr, 600 + (i % 5) * 70, -900 + Math.sin(a) * rr], 420, i % 3 ? '#1c0604' : '#b0482a', 0.75, a); }
          S.glow([0, 700, -900], 900, '#ff4020', 0.35);
          if (S.f % 47 < 5) { S.glow([Math.sin(S.f) * 300, 700, -900], 600, '#ffc0a0', 0.4); if (S.f % 47 === 0) S.sfx('bolt', 0.4); }
        } },
      // 3. above the sea, a burning star blots out the clouds
      { dur: 360, env: env('meteor', { sky: ['#1a0406', '#8a2a14', '#1a0806'], fog: { color: [0.3, 0.1, 0.06], near: 1200, far: 20000 } }), dissolve: 30,
        init(S) { S.sea = SET.sea('#2a1410', '#401c14'); },
        cam: (S, k) => ({ eye: [0, 30, 0], at: [0, L(200, 420, ease(k)), -2000], fov: 50, far: 30000 }),
        draw(S, k) { GL.draw(S.sea); for (let i = 0; i < 18; i++) S.smoke([Math.sin(i * 2.3) * 3000, 500 + (i % 3) * 120, -2500 - (i % 5) * 800], 1600, '#3a1410', 0.5, i); K.drawMeteor(S, [-300, 1500, -6000], 1100, ease(seg(k, 0, 0.4))); } },
      // 4. Meteor hangs over Midgar
      { dur: 420, env: env('meteor', { fog: { color: [0.25, 0.07, 0.04], near: 300, far: 2400 } }), dissolve: 40,
        init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); },
        cam: (S, k) => ({ eye: LV(P(110, 3.6, 18), P(96, 3.55, 16), ease(k)), at: LV([0, 20, 0], [0, 45, -60], ease(k)), fov: 50, near: 0.5, far: 2600 }),
        draw(S, k) { K.drawMidgar(S, S.city, { lights: 0.8 }); K.drawMeteor(S, [30, 150, -260], 70, ease(seg(k, 0, 0.3))); } },
      // 4. close: the burning surface of Meteor
      { dur: 240, env: 'meteor', dissolve: 20,
        cam: (S, k) => ({ eye: LV([60, -30, 200], [40, -20, 160], k), at: [0, 0, 0], fov: 46, far: 3000 }),
        draw(S, k) { K.drawMeteor(S, [0, 0, 0], 100, 1, k * 0.2); for (let i = 0; i < 16; i++) S.glow([Math.sin(i * 2.4) * 110, Math.cos(i * 1.7) * 110, 30], 50, '#ff6010', 0.35, i); } },
      // 5. Rufus, on the Shinra building, looks up at it
      { dur: 330, env: env('meteor', { fog: { color: [0.25, 0.07, 0.04], near: 300, far: 3000 }, light: { dir: [0.2, -0.4, 0.9], color: [1, 0.55, 0.35], ambient: [0.3, 0.16, 0.14] } }), dissolve: 30, fadeOut: 60,
        init(S) { S.r = S.add(K.actor('rufus', { pos: [0, 0, 0], rotY: Math.PI })); K.pose(S.r, (m) => { m.b('head').rot[0] = -0.45; }); S.deck = once('deck', () => K.meshOf(mb => { mb.box(0, -0.25, 0, 14, 0.5, 10, '#4a4e56'); mb.box(0, 0.5, -5, 14, 1.0, 0.2, '#6a6e76'); for (let x = -7; x <= 7; x += 1) mb.box(x, 0.5, -5, 0.08, 1.0, 0.08, '#8a8e96'); })); },
        cam: (S, k) => ({ eye: LV([1.6, 1.0, 3.2], [1.2, 1.2, 2.4], ease(k)), at: LV([0, 1.7, 0], [-0.3, 2.6, -3], ease(k)), fov: 46, far: 4000 }),
        draw(S) { K.put(S.deck); K.drawMeteor(S, [-60, 420, -900], 240, 1); } },
    ],
  });

  // ================================================================== HIGHWIND ESCAPE (Junon)
  const junonEnv = env('day', { sky: ['#4a78b0', '#c8d4dc', '#5a6a70'], fog: { color: [0.7, 0.76, 0.82], near: 700, far: 9000 }, light: { dir: [-0.5, -0.7, -0.4], color: [0.9, 0.88, 0.82], ambient: [0.44, 0.46, 0.52] } });
  K.ENVX.junon = junonEnv;
  // point on top of the Junon cannon barrel, t metres along its axis
  const barrelTop = (j, t) => { const r = t < 60 ? 25 : t < 260 ? 22 - (t - 60) / 200 * 4 : 18 - (t - 260) / 170 * 3; return V.add(V.add(j.cannonBase, V.scale(j.cannonAxis, t)), [0, r + 0.05, 0]); };
  K.barrelTop = barrelTop;
  // rope ladder hanging from a point
  const ladder = (S, top, len, sway) => { const b = V.add(top, [Math.sin(sway) * len * 0.15, -len, Math.cos(sway) * len * 0.05]); for (const dx of [-0.35, 0.35]) S.beam(V.add(top, [dx, 0, 0]), V.add(b, [dx, 0, 0]), 0.12, '#8a6a40', 0.9); for (let i = 1; i < 14; i++) { const q = K.LV(top, b, i / 14); S.beam(V.add(q, [-0.35, 0, 0]), V.add(q, [0.35, 0, 0]), 0.08, '#a07a48', 0.9); } return b; };
  def('highwind_escape', {
    music: 'highwind', carry: true,
    grade: { tint: '#f0f4ff', vignette: 0.45 },
    sample: 'Tifa races along the barrel of the great cannon of Junon.\nAt the end of it, the Highwind rises out of the sky, a ladder swinging beneath it...',
    shots: [
      // 1. Junon and its cannon; a tiny figure runs along the barrel
      { dur: 240, env: junonEnv, fadeIn: 30,
        init(S) { S.j = SET.junon(); S.sea = SET.sea('#1a4a78', '#2a5a88'); S.t = S.add(K.actor('tifa', { anim: 'run' })); S.t.scale = 1.72; },
        update(S, k) { S.t.position = barrelTop(S.j, 150 + k * 40); S.t.rotY = Math.PI / 2; if (S.cue('al', k > 0.05)) S.sfx('alarm_long'); },
        cam: (S, k) => ({ eye: LV([900, 260, 700], [820, 250, 560], ease(k)), at: [300, 180, 0], fov: 44, near: 1, far: 12000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.j.mesh); GL.draw(S.j.tex); } },
      // 2. running along the barrel, the sea far below
      { dur: 240, env: junonEnv,
        init(S) { S.j = SET.junon(); S.sea = SET.sea('#1a4a78', '#2a5a88'); S.t = S.add(K.actor('tifa', { anim: 'run' })); },
        update(S, k) { S.t.position = barrelTop(S.j, 300 + k * 60); S.t.rotY = Math.PI / 2; },
        cam: (S, k) => { const p = S.t.position; return { eye: V.add(p, [7 - k * 2, 1.6, 6]), at: V.add(p, [-2, 1.0, 0]), fov: 50, far: 12000 }; },
        draw(S) { GL.draw(S.sea); GL.draw(S.j.mesh); GL.draw(S.j.tex); } },
      // 3. the Highwind climbs up past the muzzle
      { dur: 240, env: junonEnv,
        init(S) { S.j = SET.junon(); S.sea = SET.sea('#1a4a78', '#2a5a88'); S.h = K.highwind(); },
        update(S, k) { S.h.position = V.add(S.j.muzzle, [60, L(-220, -20, easeOut(k)), 120]); S.h.rotY = -Math.PI / 2 + 0.3; S.h.rotX = -0.1 * (1 - k); if (S.cue('eng', k > 0.1)) S.sfx('helicopter'); },
        cam: (S, k) => ({ eye: V.add(S.j.muzzle, [-30, 40, -150]), at: V.add(S.h.position, [0, 10, 0]), fov: 50, far: 12000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.j.mesh); GL.draw(S.j.tex); S.h.draw(); } },
      // 4. alongside: the ladder swings in; Tifa leaps from the end of the barrel
      { dur: 240, env: junonEnv,
        init(S) { S.j = SET.junon(); S.sea = SET.sea('#1a4a78', '#2a5a88'); S.h = K.highwind(); S.t = S.add(K.actor('tifa', { anim: 'run' })); },
        update(S, k) {
          S.h.position = V.add(S.j.muzzle, [55, 44, 40]); S.h.rotY = -Math.PI / 2 + 0.2;
          const tip = barrelTop(S.j, 424);
          if (k < 0.55) { S.t.position = V.add(tip, [-14 + k * 25, 0, 0]); S.t.rotY = Math.PI / 2; }
          else { const u = seg(k, 0.55, 1); S.t.play('jump'); S.t.position = V.add(tip, [0 + u * 22, Math.sin(u * Math.PI) * 5 - u * 2, u * 8]); }
        },
        cam: (S, k) => ({ eye: V.add(S.j.muzzle, [-90, 34, 150]), at: V.add(S.j.muzzle, [25, 28, 20]), fov: 50, far: 12000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.j.mesh); GL.draw(S.j.tex); S.h.draw(); ladder(S, V.add(S.h.position, [-20, -8, -10]), 34, Math.sin(S.f * 0.05) * 0.5); } },
      // 5. she catches the ladder (from below)
      { dur: 210, env: junonEnv,
        init(S) { S.j = SET.junon(); S.sea = SET.sea('#1a4a78', '#2a5a88'); S.h = K.highwind(); S.t = S.add(K.actor('tifa', {})); K.pose(S.t, (m) => { m.b('armR').rot[0] = -3.0; m.b('armL').rot[0] = -2.8; m.b('thighL').rot[0] = -0.5; m.b('shinL').rot[0] = 0.8; }); },
        update(S, k) { S.h.position = V.add(S.j.muzzle, [90 + k * 20, 40 + k * 20, 30]); S.h.rotY = -Math.PI / 2 + 0.2; },
        cam: (S, k) => ({ eye: V.add(S.h.position, [-24, -70, 10]), at: V.add(S.h.position, [-20, -30, -10]), fov: 50, far: 12000 }),
        draw(S) { GL.draw(S.sea); S.h.draw(); const b = ladder(S, V.add(S.h.position, [-20, -8, -10]), 34, Math.sin(S.f * 0.05) * 0.3); S.t.position = V.add(b, [0, -1.9, 0]); S.t.rotY = 0.3; } },
      // 6. the airship banks away into the sky, Junon falling behind
      { dur: 300, env: junonEnv, dissolve: 30, fadeOut: 60,
        init(S) { S.j = SET.junon(); S.sea = SET.sea('#1a4a78', '#2a5a88'); S.h = K.highwind(); },
        update(S, k) { S.h.position = V.add(S.j.muzzle, [200 + k * 700, 80 + k * 260, 60 + k * 200]); S.h.rotY = 1.9; S.h.rotZ = -0.2; S.h.rotX = -0.12; },
        cam: (S, k) => ({ eye: V.add(S.j.muzzle, [-40, 60, -160]), at: LV(V.add(S.j.muzzle, [120, 60, 60]), S.h.position, 0.8), fov: 44, far: 12000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.j.mesh); GL.draw(S.j.tex); S.h.draw(); } },
    ],
  });

  // ================================================================== SAPPHIRE WEAPON attacks Junon
  def('sapphire_weapon', {
    music: 'weaponraid',
    grade: { tint: '#dce6f4', vignette: 0.55 },
    sample: 'Out of the sea off Junon rises Sapphire WEAPON.\nShinra turns the great cannon upon it...',
    shots: [
      // 1. the sea heaves; a head breaks the surface
      { dur: 300, env: E.stormSea, fadeIn: 30,
        init(S) { S.sea = SET.sea('#1a3a58', '#24486a'); S.j = SET.junon(); S.w = S.add(K.weapon('sapphire_weapon', 360)); S.w.rotY = -Math.PI / 2; },
        update(S, k) { S.w.position = [1400, L(-340, -150, easeOut(k)), 80]; wake(S, [1400 + (Math.random() - 0.5) * 120, 0, 80 + (Math.random() - 0.5) * 120], 18, 3); S.shake(0.3); if (S.cue('r', k > 0.3)) S.sfx('falling'); },
        cam: (S, k) => ({ eye: [900, 30, 260], at: [1400, 60, 80], fov: 44, far: 12000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.j.mesh); GL.draw(S.j.tex); eyeGlow(S, S.w, '#ffe040', 20); } },
      // 2. Sapphire WEAPON wades toward Junon, towering over the waves
      { dur: 300, env: E.stormSea,
        init(S) { S.sea = SET.sea('#1a3a58', '#24486a'); S.j = SET.junon(); S.w = S.add(K.weapon('sapphire_weapon', 360)); K.pose(S.w, (m) => giantWalk(m, S.f * 0.04, 0.7)); },
        update(S, k) { S.w.position = [L(1300, 1000, k), -120, 60]; S.w.rotY = -Math.PI / 2; if (S.f % 2 === 0) wake(S, V.add(S.w.position, [(Math.random() - 0.5) * 100, 120, (Math.random() - 0.5) * 100]), 16, 2); if (S.f % 50 === 0) S.shake(0.8); },
        cam: (S, k) => ({ eye: [L(860, 800, k), 8, 360], at: V.add(S.w.position, [0, 330, 0]), fov: 54, far: 12000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.j.mesh); GL.draw(S.j.tex); eyeGlow(S, S.w, '#ffe040', 20); } },
      // 3. the great cannon turns and lowers its barrel
      { dur: 240, env: E.stormSea,
        init(S) { S.sea = SET.sea('#1a3a58', '#24486a'); S.j = SET.junon(); },
        update(S, k) { if (S.cue('al', k > 0.05)) S.sfx('alarm_long'); if (S.f % 30 === 0) S.sfx('elevator', 0.4); },
        cam: (S, k) => ({ eye: LV([160, 260, 180], [200, 250, 140], ease(k)), at: [480, 200, 0], fov: 48, far: 12000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.j.mesh); GL.draw(S.j.tex); GL.draw(S.j.glow); for (let i = 0; i < 6; i++) S.glow([60 + i * 60, 158, 150], 12, '#ff2010', (S.f % 30) < 15 ? 0.8 : 0.2); } },
      // 4. Sapphire WEAPON reaches the cliffs and roars up at the city
      { dur: 240, env: E.stormSea,
        init(S) { S.sea = SET.sea('#1a3a58', '#24486a'); S.j = SET.junon(); S.w = S.add(K.weapon('sapphire_weapon', 360)); K.pose(S.w, (m) => { roar(m, bump(S.k, 0.1, 1)); m.b('armL').rot[0] = -1.8; m.b('armR').rot[0] = -1.4; }); },
        update(S, k) {
          S.w.position = [900, -110, 40]; S.w.rotY = -Math.PI / 2; S.shake(0.5);
          if (S.cue('roar', k > 0.2)) S.sfx('bosskill');
          if (k > 0.5 && S.f % 8 === 0) { K.explode(S, [-40 + Math.random() * 60, 20 + Math.random() * 60, (Math.random() - 0.5) * 160], 14, { n: 14, debris: 12 }); S.sfx('fire2', 0.5); }
        },
        cam: (S, k) => ({ eye: [720, 60, 260], at: LV([900, 300, 40], [300, 120, 20], ease(seg(k, 0.45, 0.8))), fov: 50, far: 12000 }),
        draw(S, k) {
          GL.draw(S.sea); GL.draw(S.j.mesh); GL.draw(S.j.tex); eyeGlow(S, S.w, '#ffe040', 24);
          const jaw = K.wpt(S.w, S.w.eyeBone || 'head', [0, -0.02, 0.2]);
          const c = ease(seg(k, 0.3, 0.5)); if (c > 0 && k < 0.5) { S.glow(jaw, 30 * c, '#80b0ff', 0.9 * c); S.core(jaw, 10 * c, '#ffffff', c); }
          if (k > 0.5 && k < 0.85) { const t = [-20, 40, Math.sin(S.f * 0.1) * 60]; S.beam(jaw, t, 22, '#80b0ff', 0.9); S.beamCore(jaw, t, 7, '#ffffff', 1); }
        } },
      // 5. the cannon charges and fires
      { dur: 240, env: E.stormSea,
        init(S) { S.sea = SET.sea('#1a3a58', '#24486a'); S.j = SET.junon(); },
        update(S, k) { S.shake(k > 0.7 ? 1.4 : 0.2); if (S.cue('ch', k > 0.05)) S.sfx('cast'); if (S.cue('fire', k > 0.7)) { S.sfx('bosskill'); FF7.sceneMgr.doFlash('#e0fff0', 20, 0.8); } if (S.cue('fire2', k > 0.9)) S.sfx('bosskill'); },
        cam: (S, k) => ({ eye: V.add(S.j.muzzle, [60, 30, 160]), at: V.add(S.j.muzzle, [-60, -10, 0]), fov: 46, far: 12000 }),
        draw(S, k) {
          GL.draw(S.sea); GL.draw(S.j.mesh); GL.draw(S.j.tex);
          const m = S.j.muzzle, c = ease(seg(k, 0, 0.7));
          S.glow(m, 20 + c * 120, '#40ff90', 0.7 * c); S.core(m, 10 + c * 40, '#e0fff0', c);
          for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + S.f * 0.05; S.beam(V.add(m, [0, Math.cos(a) * 120 * (1 - c), Math.sin(a) * 120 * (1 - c)]), m, 4, '#60ffb0', 0.5 * c, 0.2); }
          if (k > 0.7) { const a = 1 - seg(k, 0.7, 1) * 0.5; S.beam(m, V.add(m, V.scale(S.j.cannonAxis, 1400)), 90 * a, '#40ff90', 0.8, 0.3); S.beamCore(m, V.add(m, V.scale(S.j.cannonAxis, 1400)), 30 * a, '#ffffff', 1, 0.5); }
        } },
      // 6. the blast strikes Sapphire WEAPON
      { dur: 240, env: E.stormSea,
        init(S) { S.sea = SET.sea('#1a3a58', '#24486a'); S.j = SET.junon(); S.w = S.add(K.weapon('sapphire_weapon', 360)); K.pose(S.w, (m) => { m.b('body').rot[0] = -0.3 * S.k; m.b('head').rot[0] = -0.8 * S.k; m.b('armL').rot[0] = -2; m.b('armR').rot[0] = -2.2; }); },
        update(S, k) { S.w.position = [900, -110 - k * 30, 40]; S.w.rotY = -Math.PI / 2; S.shake(1.2 - k); if (S.cue('hit', k > 0.05)) { K.explode(S, [900, 230, 40], 60, { n: 80, debris: 80, c0: '#f0fff0', c1: '#40ff90' }); S.sfx('bosskill'); } if (S.f % 4 === 0) K.fire(S, [900 + (Math.random() - 0.5) * 60, 220, 40], 18, 1); },
        cam: (S, k) => ({ eye: [640, 120, 380], at: [900, 220, 40], fov: 48, far: 12000 }),
        draw(S, k) { GL.draw(S.sea); GL.draw(S.j.mesh); GL.draw(S.j.tex); const a = 1 - seg(k, 0, 0.5); if (a > 0) { S.beam(S.j.muzzle, [900, 230, 40], 90 * a, '#40ff90', 0.8 * a, 0.6 * a); S.beamCore(S.j.muzzle, [900, 230, 40], 30 * a, '#ffffff', a, a); } } },
      // 7. it topples back into the sea
      { dur: 300, env: E.stormSea, dissolve: 20, fadeOut: 60,
        init(S) { S.sea = SET.sea('#1a3a58', '#24486a'); S.j = SET.junon(); S.w = S.add(K.weapon('sapphire_weapon', 360)); K.pose(S.w, (m) => { m.b('armL').rot[0] = -2.4; m.b('armR').rot[0] = -2.0; }); },
        update(S, k) { const u = easeIn(seg(k, 0, 0.6)); S.w.position = [960 + u * 120, -110 - u * 180, 40]; S.w.rotY = -Math.PI / 2; S.w.rotZ = -u * 1.3; if (S.cue('sp', k > 0.55)) { K.splash(S, [1180, 0, 40], 60, { n: 80 }); S.sfx('bosskill'); S.shake(1.2); } if (k > 0.55 && S.f % 2 === 0) wake(S, [1180 + (Math.random() - 0.5) * 200, 0, 40 + (Math.random() - 0.5) * 200], 30, 2); },
        cam: (S, k) => ({ eye: [520, 180, 600], at: [1100, 60, 40], fov: 46, far: 12000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.j.mesh); GL.draw(S.j.tex); } },
    ],
  });

  // ================================================================== ULTIMATE WEAPON over Mideel
  def('ultimate_weapon', {
    music: 'weaponraid',
    grade: { tint: '#f4f0e0', vignette: 0.5 },
    sample: 'Ultimate WEAPON streaks across the sky and descends upon Mideel.',
    shots: [
      // 1. low over the waves, it roars past the camera
      { dur: 240, env: E.tropic, fadeIn: 30,
        init(S) { S.sea = SET.sea('#1a6aa0', '#2a7ab0'); S.u = S.add(K.weapon('ultimate_weapon', 120)); K.pose(S.u, (m) => flap(m, S.f * 0.15, 1.2)); },
        update(S, k) { S.u.position = [L(-40, 60, k), 30, L(-900, 300, k)]; S.u.rotY = 0.08; if (S.f % 2 === 0) wake(S, [S.u.position[0], 0, S.u.position[2] - 40], 10, 3); if (S.cue('w', k > 0.6)) S.sfx('run_attack'); },
        cam: (S, k) => ({ eye: [30, 12, 120], at: S.u.position, fov: 50, far: 12000 }),
        draw(S) { GL.draw(S.sea); eyeGlow(S, S.u, '#ff3030', 8); } },
      // 2. over the island village of Mideel, its shadow sweeping the huts
      { dur: 300, env: E.tropic,
        init(S) { S.sea = SET.sea('#1a6aa0', '#2a7ab0'); S.m = SET.mideel(); S.u = S.add(K.weapon('ultimate_weapon', 120)); K.pose(S.u, (m) => flap(m, S.f * 0.12)); },
        update(S, k) { S.u.position = [L(-500, 200, k), L(160, 110, k), L(300, -100, k)]; S.u.rotY = Math.atan2(700, -400); },
        cam: (S, k) => ({ eye: [140, 40, 260], at: V.add(S.u.position, [0, -20, 0]), fov: 50, far: 12000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.m.mesh); eyeGlow(S, S.u, '#ff3030', 8); } },
      // 3. it hovers above the village and roars
      { dur: 240, env: E.tropic,
        init(S) { S.sea = SET.sea('#1a6aa0', '#2a7ab0'); S.m = SET.mideel(); S.u = S.add(K.weapon('ultimate_weapon', 120)); K.pose(S.u, (m) => { flap(m, S.f * 0.1, 1.3); roar(m, bump(S.k, 0.2, 1)); }); },
        update(S, k) { S.u.position = [20, 70 + Math.sin(S.f * 0.1) * 3, -20]; S.u.rotY = Math.PI * 0.8; S.shake(0.3); if (S.cue('roar', k > 0.25)) S.sfx('bosskill'); },
        cam: (S, k) => ({ eye: LV([-150, 60, 120], [-120, 70, 100], k), at: [20, 70, -20], fov: 46, far: 12000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.m.mesh); eyeGlow(S, S.u, '#ff3030', 10); } },
      // 4. energy gathers in its jaws and it blasts the hills
      { dur: 300, env: E.tropic,
        init(S) { S.sea = SET.sea('#1a6aa0', '#2a7ab0'); S.m = SET.mideel(); S.u = S.add(K.weapon('ultimate_weapon', 120)); K.pose(S.u, (m) => { flap(m, S.f * 0.1, 1.1); roar(m, 0.6); }); },
        update(S, k) {
          S.u.position = [20, 80, -20]; S.u.rotY = Math.PI * 0.8; S.u.rotX = 0.3;
          if (S.cue('ch', k > 0.05)) S.sfx('cast');
          if (S.cue('fire', k > 0.55)) { S.sfx('bosskill'); K.explode(S, [-60, 6, 120], 30, { n: 60, debris: 60 }); FF7.sceneMgr.doFlash('#ffffff', 16, 0.6); }
          if (k > 0.55) S.shake(1.0 - k * 0.6);
        },
        cam: (S, k) => ({ eye: [150, 70, 60], at: [-10, 40, 40], fov: 52, far: 12000 }),
        draw(S, k) {
          GL.draw(S.sea); GL.draw(S.m.mesh);
          const mouth = K.wpt(S.u, S.u.eyeBone || 'head', [0, 0, 0.16]);
          const c = ease(seg(k, 0, 0.55)); S.glow(mouth, 6 + c * 24, '#60a0ff', 0.8 * c); S.core(mouth, 3 + c * 8, '#ffffff', c);
          if (k > 0.55 && k < 0.8) { S.beam(mouth, [-60, 6, 120], 16, '#80c0ff', 0.9); S.beamCore(mouth, [-60, 6, 120], 5, '#ffffff', 1); }
        } },
      // 5. it wheels away into the sky; the ground has begun to glow and crack
      { dur: 240, env: E.tropic, dissolve: 20, fadeOut: 50,
        init(S) { S.sea = SET.sea('#1a6aa0', '#2a7ab0'); S.m = SET.mideel(); S.u = S.add(K.weapon('ultimate_weapon', 120)); K.pose(S.u, (m) => flap(m, S.f * 0.16, 1.3)); },
        update(S, k) { S.u.position = [L(20, 600, easeIn(k)), L(90, 600, easeIn(k)), L(-20, -900, easeIn(k))]; S.u.rotY = 2.6; S.u.rotX = -0.5; S.shake(0.2); if (S.f % 3 === 0) K.dust(S, [-60 + (Math.random() - 0.5) * 60, 5, 120 + (Math.random() - 0.5) * 60], 6, 1, { c0: '#8a7a60' }); },
        cam: (S, k) => ({ eye: [60, 20, 200], at: LV([-40, 20, 110], S.u.position, 0.5), fov: 50, far: 12000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.m.mesh); for (let i = 0; i < 5; i++) S.glow([-60 + Math.sin(i) * 30, 3, 120 + Math.cos(i * 2) * 30], 20, '#40ff90', 0.35); } },
    ],
  });

  // ================================================================== MIDEEL COLLAPSES: Cloud and Tifa fall into the Lifestream
  // glowing cracks spreading from a centre
  const cracks = (S, c, R, a, hFn) => {
    for (let i = 0; i < 9; i++) {
      const pts = [], ws = [], cs = [];
      let p = c.slice(), dir = i / 9 * TAU;
      for (let j = 0; j < 8; j++) {
        if (j / 8 > a) break;
        pts.push([p[0], hFn(p[0], p[2]) + 0.2, p[2]]); ws.push(1.6 * (1 - j / 8) + 0.4); cs.push([0.4, 1, 0.6, 0.9]);
        dir += (U.hash(i, j, 3) - 0.5) * 0.9; p = [p[0] + Math.cos(dir) * R / 8, 0, p[2] + Math.sin(dir) * R / 8];
      }
      if (pts.length > 1) { S.ribbon(pts, ws, cs, 'core'); S.ribbon(pts, ws.map(w => w * 4), cs.map(q => [0.2, 1, 0.5, 0.4]), 'glow'); }
    }
  };
  def('lifestream_fall', {
    music: 'lifestream',
    grade: { tint: '#e8f4e8', vignette: 0.55 },
    sample: 'The ground of Mideel splits apart.\nThe Lifestream erupts from below, and Cloud and Tifa are swallowed by its light...',
    shots: [
      // 1. tremors; green cracks spread between the huts
      { dur: 240, env: E.tropic, fadeIn: 30,
        init(S) { S.sea = SET.sea('#1a6aa0', '#2a7ab0'); S.m = SET.mideel(); },
        update(S, k) { S.shake(0.3 + k * 0.6); if (S.cue('r', k > 0.05)) S.sfx('falling'); },
        cam: (S, k) => ({ eye: LV([60, 22, 90], [50, 28, 80], k), at: [0, 4, 0], fov: 50, far: 12000 }),
        draw(S, k) { GL.draw(S.sea); GL.draw(S.m.mesh); cracks(S, [0, 0, 0], 90, ease(k), S.m.hFn); } },
      // 2. the ground gives; light bursts up through the fissures
      { dur: 240, env: E.tropic,
        init(S) { S.sea = SET.sea('#1a6aa0', '#2a7ab0'); S.m = SET.mideel(); },
        update(S, k) { S.shake(1.0); if (S.f % 2 === 0) S.fx.emit(3, { p: [(Math.random() - 0.5) * 60, 2, (Math.random() - 0.5) * 60], v: [0, 1.2, 0], vs: 0.3, life: 80, size: [3, 8], c0: '#e0fff0', c1: '#20ff80', kind: 'glow' }); if (S.f % 4 === 0) K.dust(S, [(Math.random() - 0.5) * 80, 3, (Math.random() - 0.5) * 80], 5, 1, { c0: '#8a7a60' }); },
        cam: (S, k) => ({ eye: [40, 10, 60], at: [0, 10, 0], fov: 54, far: 12000 }),
        draw(S, k) { GL.draw(S.sea); GL.draw(S.m.mesh); cracks(S, [0, 0, 0], 90, 1, S.m.hFn); S.beam([0, 0, 0], [0, 120, 0], 30 + k * 30, '#30ff90', 0.5 * k, 0); } },
      // 3. Cloud and Tifa on the breaking ground
      { dur: 240, env: env('sunny_sea', { light: { dir: [0, 1, 0], color: [0.3, 0.9, 0.55], ambient: [0.4, 0.46, 0.44], dir2: [-0.4, -0.7, -0.4], color2: [0.6, 0.6, 0.55] } }),
        init(S) { S.sea = SET.sea('#1a6aa0', '#2a7ab0'); S.m = SET.mideel(); S.c = S.add(K.actor('cloud', {})); S.t = S.add(K.actor('tifa', {})); K.pose(S.c, (m) => { FF7.anims.weak.fn(m, 0); }); K.pose(S.t, (m) => { m.b('armL').rot[0] = -1.2; m.b('armR').rot[0] = -1.0; m.b('head').rot[0] = 0.3; }); },
        update(S, k) { const y = S.m.hFn(4, 4) - easeIn(seg(k, 0.6, 1)) * 6; S.c.position = [4, y, 4]; S.t.position = [5, y, 5.2]; S.t.rotY = -2.2; S.c.rotY = 0.8; S.shake(0.6); },
        cam: (S, k) => ({ eye: [8.5, S.m.hFn(4, 4) + 1.8, 9], at: [4.5, S.m.hFn(4, 4) + 1.0, 4.5], fov: 46, far: 12000 }),
        draw(S) { GL.draw(S.sea); GL.draw(S.m.mesh); cracks(S, [4.5, 0, 4.5], 20, 1, S.m.hFn); S.glow([4.5, S.m.hFn(4, 4) - 1, 4.5], 10, '#40ff90', 0.6); } },
      // 4. from above: two tiny figures fall into the glowing chasm
      { dur: 360, env: env('lifestream', { sky: ['#020a06', '#0a4a2a', '#02140c'] }), dissolve: 20,
        init(S) { S.c = S.add(K.actor('cloud', {})); S.t = S.add(K.actor('tifa', {})); for (const m of [S.c, S.t]) K.pose(m, (mm) => { mm.b('armL').rot[2] = 1.2; mm.b('armR').rot[2] = -1.2; mm.b('thighL').rot[0] = -0.4; }); },
        update(S, k) { const y = -k * 60; S.c.position = [0, y, 0]; S.t.position = [1.4, y + 0.6, 0.8]; S.c.rotX = S.t.rotX = Math.PI * 0.5; S.c.rotZ = k * 1.5; S.t.rotZ = -k * 1.2; },
        cam: (S, k) => ({ eye: [0.5, S.c.position[1] + 12, 0.5], at: [0.5, S.c.position[1] - 20, 0.2], fov: 56 }),
        draw(S, k) { K.lifestreamRise(S, [0, 1, 2, 3, 4, 5, 6, 7].map(i => [Math.cos(i * 0.8) * 30, S.c.position[1] - 120, Math.sin(i * 0.8) * 30]), [0, S.c.position[1] + 40, 0], { width: 8, alpha: 0.5, swirl: 1.5 }); S.glow([0, S.c.position[1] - 60, 0], 120, '#30ff90', 0.5); } },
      // 5. within the Lifestream, adrift in light
      { dur: 480, env: 'lifestream', dissolve: 30, fadeOut: [60, '#e0fff0'],
        init(S) { S.c = S.add(K.actor('cloud', {})); S.t = S.add(K.actor('tifa', {})); for (const m of [S.c, S.t]) K.pose(m, (mm) => { mm.b('armL').rot[2] = 0.8; mm.b('armR').rot[2] = -0.8; mm.b('head').rot[0] = 0.3; }); },
        update(S, k) { const z = -S.f * 0.08; S.c.position = [0.8, Math.sin(S.f * 0.02) * 0.3, z - 6]; S.t.position = [-0.8, Math.cos(S.f * 0.02) * 0.3, z - 6.5]; S.c.rotX = S.t.rotX = Math.PI * 0.5; S.c.rotZ = Math.sin(S.f * 0.01) * 0.5; S.t.rotZ = -0.3 + Math.cos(S.f * 0.012) * 0.4; },
        cam: (S, k) => { const z = -S.f * 0.08; return { eye: [0, 1.5, z + 1], at: [0, 0, z - 7], fov: 54, roll: Math.sin(S.f * 0.006) * 0.3 }; },
        draw(S) { K.lifestreamTunnel(S, -S.f * 0.08 - 6, { speed: 0.8, alpha: 0.9 }); } },
    ],
  });

  // ================================================================== SHINRA No. 26 LAUNCHES
  const rtEnv = env('dawn', { sky: ['#3a5a90', '#f0c890', '#5a4a3a'], sun: { dir: [-0.8, 0.12, -0.5], color: '#ffd8a0', size: 0.14 }, fog: { color: [0.8, 0.7, 0.6], near: 800, far: 12000 }, light: { dir: [0.8, -0.35, 0.5], color: [1.0, 0.82, 0.62], ambient: [0.38, 0.36, 0.4] } });
  K.ENVX.rocketTown = rtEnv;
  // rocket: the vehicles3d model (upright) or fallback, `h` = rocket height
  const rocket = (clip, bare) => { const r = K.veh('rocket_26', { height: 110 }, 'rocket_26', { upright: true }); if (r.real) { if (clip) r.play(clip); if (bare) for (const n of ['pad', 'gantry']) { const b = r.bone(n); if (b) b.visible = false; } } return r; };
  const rocketLift = (r, lift) => { if (r.real) { const b = r.bone('rocket'); if (b) { r.m.onPose = (m) => { m.bones.rocket.pos[1] += lift / r.fitScale; }; } } else r.position[1] = lift; };
  const plume = (S, base, s, rate) => {
    K.fire(S, base, s * 1.4, rate, { c0: '#fffff0', c1: '#ff8020', w: 0.4, life: 26 });
    S.fx.emit(rate, { p: base, spread: s * 0.8, v: [0, -s * 0.05, 0], vs: s * 0.1, life: 220, size: [s * 4, s * 14], c0: '#f0ece4', c1: '#a8a098', kind: 'smoke', drag: 0.97, alpha: 0.7, fadeIn: 0.05 });
  };
  def('rocket_launch', {
    music: 'countdown',
    grade: { tint: '#fff0e0', vignette: 0.5 },
    sample: 'In Rocket Town, the engines of Shinra No. 26 roar into life.\nWith a thunder that shakes the mountains, the rocket climbs into the sky toward Meteor...',
    shots: [
      // 1. the rocket on its pad at dawn, vapour venting
      { dur: 240, env: rtEnv, fadeIn: 40,
        init(S) { S.t = SET.rocketTown(); S.r = rocket(); },
        update(S, k) { if (S.f % 3 === 0) S.fx.emit(1, { p: [4, 40 + Math.random() * 40, 4], v: [0.3, 0, 0.2], vs: 0.1, life: 120, size: [3, 12], c0: '#f8f8f8', kind: 'smoke', alpha: 0.5 }); },
        cam: (S, k) => ({ eye: LV([260, 40, 320], [230, 50, 280], ease(k)), at: [0, 55, 0], fov: 44, far: 12000 }),
        draw(S) { GL.draw(S.t.mesh); S.r.draw(); } },
      // 2. ignition: fire and smoke boil out of the flame trench
      { dur: 240, env: rtEnv,
        init(S) { S.t = SET.rocketTown(); S.r = rocket('move'); },
        update(S, k) { S.shake(0.3 + k * 0.6); if (S.cue('ign', k > 0.1)) S.sfx('fire2'); if (k > 0.1) { plume(S, [0, 2, 0], 6, 3); for (const sx of [-1, 1]) S.fx.emit(2, { p: [sx * 20, 2, 10], v: [sx * 1.4, 0.2, 0.4], vs: 0.4, life: 200, size: [10, 30], c0: '#e8e4dc', c1: '#9a948a', kind: 'smoke', drag: 0.98, alpha: 0.6 }); } },
        cam: (S, k) => ({ eye: [60, 6, 90], at: [0, 10, 0], fov: 50, far: 12000 }),
        draw(S) { GL.draw(S.t.mesh); S.r.draw(); S.glow([0, 4, 0], 40, '#ffa040', 0.6); } },
      // 3. the gantry arms swing away as the smoke swallows the pad
      { dur: 240, env: rtEnv,
        init(S) { S.t = SET.rocketTown(); S.r = rocket('move'); S.prewarm(120, 0.5); },
        update(S, k) { S.shake(0.8); plume(S, [0, 2, 0], 7, 3); for (const sx of [-1, 1]) S.fx.emit(2, { p: [sx * 24, 2, 12], v: [sx * 1.6, 0.25, 0.5], vs: 0.4, life: 240, size: [12, 36], c0: '#e8e4dc', c1: '#9a948a', kind: 'smoke', drag: 0.98, alpha: 0.6 }); },
        cam: (S, k) => ({ eye: LV([-120, 30, 180], [-100, 40, 150], ease(k)), at: [0, 45, 0], fov: 46, far: 12000 }),
        draw(S) { GL.draw(S.t.mesh); S.r.draw(); } },
      // 4. lift-off: it rises out of its own storm
      { dur: 360, env: rtEnv,
        init(S) { S.t = SET.rocketTown(); S.r = rocket('move'); S.prewarm(160, 0.5); },
        update(S, k) { S.lift = 110 * easeIn(k); rocketLift(S.r, S.lift); S.shake(1.2 - k * 0.6); plume(S, [0, 2 + S.lift, 0], 8, 3); if (S.cue('lift', k > 0.02)) S.sfx('bosskill'); },
        cam: (S, k) => ({ eye: [70, 8, 150], at: [0, 40 + (S.lift || 0) * 0.9, 0], fov: 50, far: 12000 }),
        draw(S) { GL.draw(S.t.mesh); S.r.draw(); S.glow([0, (S.lift || 0) - 4, 0], 60, '#ffb050', 0.7); S.core([0, (S.lift || 0) - 2, 0], 20, '#ffffff', 0.8); } },
      // 5. climbing on a column of fire
      { dur: 360, env: rtEnv, dissolve: 30,
        init(S) { S.r = rocket('move'); S.t = SET.rocketTown(); },
        update(S, k) { S.lift = 400 + 2400 * easeIn(k); rocketLift(S.r, S.lift); if (S.f % 2 === 0) plume(S, [0, S.lift - 4, 0], 10, 2); },
        cam: (S, k) => ({ eye: [400, 200, 900], at: [0, (S.lift || 400) + 40, 0], fov: L(40, 26, k), far: 20000 }),
        draw(S) { GL.draw(S.t.mesh); S.r.draw(); S.glow([0, (S.lift || 0) - 8, 0], 90, '#ffc060', 0.8); S.beam([0, (S.lift || 0) - 8, 0], [0, (S.lift || 0) - 600, 0], 30, '#ff9030', 0.6, 0); } },
      // 6. high above the clouds, Meteor looming ahead
      { dur: 360, env: env('meteor', { sky: ['#05020a', '#5a1a14', '#1a0a08'], fog: { color: [0.2, 0.07, 0.05], near: 2000, far: 30000 } }), dissolve: 40, fadeOut: 60,
        init(S) { S.r = rocket('move', true); },
        update(S, k) { S.r.position = [0, 0, -S.f * 2]; S.r.rotX = -Math.PI / 2 + 0.1; },
        cam: (S, k) => ({ eye: [30, 40, -S.f * 2 + 200], at: [0, 0, -S.f * 2 - 400], fov: 50, far: 40000 }),
        draw(S, k) { S.r.draw(); const b = V.add(S.r.position, [0, -4, 60]); S.glow(b, 40, '#ffc060', 0.8); S.beam(b, V.add(b, [0, 0, 400]), 16, '#ff9030', 0.6, 0); K.drawMeteor(S, [-400, 600, -9000], 2600, 1); for (let i = 0; i < 12; i++) S.haze([Math.sin(i) * 3000, -1200 - (i % 3) * 200, -S.f * 2 - 2000 - i * 900], 3000, '#a09088', 0.2, i); } },
    ],
  });

  // ================================================================== THE TINY BRONCO'S ESCAPE (Disc 1, Rocket Town)
  // Cid's plane runs down the backyard and lifts off past Shinra No. 26; Shinra's soldiers open fire, a burst tears
  // into the tail, and the Bronco comes down trailing smoke to belly-flop into the sea... where it floats.
  const broncoEnv = env('day', { sky: ['#5a88c0', '#d8dcd8', '#6a6a60'], fog: { color: [0.78, 0.8, 0.82], near: 800, far: 9000 }, light: { dir: [-0.5, -0.7, -0.4], color: [0.95, 0.9, 0.82], ambient: [0.46, 0.46, 0.5] } });
  const bronco = () => K.veh('tiny_bronco', { len: 7.5, clip: 'move' }, 'tiny_bronco');
  // a point on the plane (model space: nose +z, up +y), yawed with it
  const onPlane = (m, p) => { const c = Math.cos(m.rotY || 0), s = Math.sin(m.rotY || 0); return [m.position[0] + p[0] * c + p[2] * s, m.position[1] + p[1], m.position[2] - p[0] * s + p[2] * c]; };
  const TAIL = [0, 1.3, -3.3];
  def('bronco_escape', {
    music: 'bronco',
    grade: { tint: '#fff6ea', vignette: 0.45 },
    sample: "Cid opens the Tiny Bronco's throttle and the little plane roars down the backyard and into the sky.\nBelow, Shinra's soldiers open fire...",
    shots: [
      // 1. down the backyard and up past the rocket
      { dur: 260, env: broncoEnv, fadeIn: 30,
        init(S) { S.t = SET.rocketTown(); S.r = rocket(); S.b = bronco(); },
        update(S, k) {
          const lift = 14 * easeIn(seg(k, 0.55, 1));
          S.b.position = [L(-45, 75, easeIn(k)), lift, 70]; S.b.rotY = Math.PI / 2; S.b.rotX = -0.16 * bump(k, 0.5, 1);
          if (S.cue('eng', k > 0.01)) S.sfx('helicopter');
          if (k < 0.6 && S.f % 3 === 0) K.dust(S, onPlane(S.b, [0, 0, -3]), 0.8, 1, { life: 120, alpha: 0.35, c0: '#9a8a68' });
        },
        cam: (S, k) => ({ eye: V.add(S.b.position, [8, 1.4 - S.b.position[1] * 0.4, 12]), at: V.add(S.b.position, [-3, 2 + S.b.position[1] * 0.3, -8]), fov: 52, far: 12000 }),
        draw(S) { GL.draw(S.t.mesh); S.r.draw(); S.b.draw(); } },
      // 2. soldiers in the street open fire as it passes over
      { dur: 220, env: broncoEnv,
        init(S) {
          S.t = SET.rocketTown(); S.r = rocket(); S.b = bronco();
          S.men = [[70, 116, -0.4], [74, 120, 0.1], [66, 121, -0.8]].map(([x, z, r]) => { const m = S.add(K.actor('soldier', { anim: 'shoot' })); m.position = [x, 0, z]; m.rotY = Math.PI + r; return m; });
        },
        update(S, k) {
          S.b.position = [L(20, 150, k), L(22, 38, k), 86]; S.b.rotY = Math.PI / 2; S.b.rotX = -0.08; S.b.rotZ = Math.sin(S.f * 0.05) * 0.05;
          S.men.forEach(m => { m.rotY = Math.atan2(S.b.position[0] - m.position[0], S.b.position[2] - m.position[2]); });
          if (k > 0.1 && S.f % 9 === 0) S.sfx('shot', 0.5);
        },
        cam: (S, k) => ({ eye: [74, 2.2, 138], at: LV(V.add(S.b.position, [-4, 0, 0]), [70, 1.6, 118], 0.62), fov: 58, far: 12000 }),
        draw(S, k) {
          GL.draw(S.t.mesh); S.r.draw(); S.b.draw();
          if (k < 0.1) return;
          S.men.forEach((m, i) => {
            if ((S.f + i * 3) % 8 > 2) return;
            const tip = V.add(m.position, [Math.sin(m.rotY) * 0.7, 1.35, Math.cos(m.rotY) * 0.7]);
            S.glow(tip, 0.5, '#ffd070', 1); S.core(tip, 0.15, '#ffffff', 1);
            const aim = V.add(S.b.position, [(Math.random() - 0.5) * 8, (Math.random() - 0.3) * 4, (Math.random() - 0.5) * 6]);
            S.beam(tip, LV(tip, aim, 0.6 + Math.random() * 0.4), 0.06, '#ffe0a0', 0.8, 0.2);
          });
        } },
      // 3. a burst tears into the tail: sparks, then smoke
      { dur: 220, env: broncoEnv,
        init(S) { S.t = SET.rocketTown(); S.b = bronco(); },
        update(S, k) {
          S.b.position = [150 + S.f * 0.32, 40 - Math.max(0, k - 0.4) * 6, 86]; S.b.rotY = Math.PI / 2;
          const hitK = seg(k, 0.3, 0.45), wob = k > 0.3 ? 1 : 0;
          S.b.rotZ = wob * Math.sin(S.f * 0.35) * 0.18; S.b.rotX = wob * 0.06;
          const tail = onPlane(S.b, TAIL);
          if (k > 0.3 && k < 0.45 && S.f % 4 === 0) { K.explode(S, V.add(tail, [(Math.random() - 0.5) * 1.2, Math.random() * 0.6, (Math.random() - 0.5) * 1.2]), 0.35, { n: 8, debris: 10 }); S.sfx('hit', 0.7); S.shake(0.6); }
          if (S.cue('crit', k > 0.4)) S.sfx('crit');
          if (k > 0.35) { K.smokeCol(S, tail, 0.9, 2, { v: [0, 0.01, 0], life: 140, alpha: 0.6 }); if (hitK > 0 && S.f % 2 === 0) K.fire(S, tail, 0.35, 1, { life: 18 }); }
        },
        cam: (S, k) => ({ eye: onPlane(S.b, [7, 2.5, -13]), at: onPlane(S.b, [0, 1, 1]), fov: 50, far: 12000 }),
        draw(S) { GL.draw(S.t.mesh); S.b.draw(); } },
      // 4. down over the sea, trailing smoke: a belly-flop, a long skid... and it floats
      { dur: 330, env: K.ENVX.junon, dissolve: 20, fadeOut: 60,
        init(S) { S.sea = SET.sea('#1a4a78', '#2a5a88'); S.b = bronco(); },
        update(S, k) {
          const fall = seg(k, 0, 0.55), skid = seg(k, 0.55, 0.8);
          if (k < 0.55) {
            S.b.position = [L(-320, 0, fall), L(110, 0.6, easeIn(fall)), Math.sin(fall * 2.4) * 30]; S.b.rotX = 0.22; S.b.rotZ = Math.sin(S.f * 0.12) * 0.25;
            K.smokeCol(S, onPlane(S.b, TAIL), 1.2, 2, { v: [0, 0.02, 0], life: 200, alpha: 0.6 });
          } else {
            S.b.position = [L(0, 38, easeOut(skid)), 0.35 + Math.sin(S.f * 0.08) * 0.08 * seg(k, 0.75, 1), 0]; S.b.rotX = L(0.1, -0.02, skid); S.b.rotZ = Math.sin(S.f * 0.06) * 0.04;
            if (skid < 1 && S.f % 2 === 0) K.splash(S, onPlane(S.b, [(Math.random() - 0.5) * 6, 0, 2.5]), 0.9 * (1 - skid) + 0.2, { n: 8 });
            if (k > 0.7 && S.f % 3 === 0) K.smokeCol(S, onPlane(S.b, TAIL), 0.8, 1, { v: [0, 0.03, 0], life: 160, alpha: 0.45 });
          }
          S.b.rotY = Math.PI / 2;
          if (S.cue('fall', k > 0.05)) S.sfx('falling');
          if (S.cue('splash', k > 0.55)) { K.splash(S, [0, 0, 0], 5, { n: 80 }); S.shake(1.2); S.sfx('hit'); S.sfx('crit', 0.6); }
        },
        cam: (S, k) => ({ eye: LV([-40, 30, 150], [22, 5, 26], ease(seg(k, 0.5, 1))), at: V.add(S.b.position, [0, 0.8, 0]), fov: 46, far: 12000 }),
        draw(S) { GL.draw(S.sea); S.b.draw(); } },
    ],
  });
})();

// ----------------------------------------------------------------------------- Disc 2/3 movies, part 2
(function () {
  const U = FF7.util, V = FF7.V3, M4 = FF7.M4;
  const CIN = FF7.cinema, K = CIN.K, SET = K.SET, TAU = K.TAU, L = K.L;
  const { ease, easeIn, easeOut, seg, bump, LV, path } = K;
  const GL = FF7.GL, def = CIN.def, env = K.envOf, once = K.once, sh = U.shade;
  const MID = SET.MID, P = K.polar, E = K.ENVX;
  const { giantWalk, roar, eyeGlow, coreGlow, wake } = K;

  // ------------------------------------------------------------------ the Midgar coast (metres; Midgar = city model x25 at the origin)
  const MS = 25;
  const cityW = (p) => [p[0] * MS, p[1] * MS, p[2] * MS];
  const coastSea = () => once('coastSea', () => K.meshOf(mb => { mb.quad([-20000, 0.8, -3200], [20000, 0.8, -3200], [20000, 0.8, -40000], [-20000, 0.8, -40000], '#28405a'); for (let i = 0; i < 60; i++) { const x = -3000 + i * 100; mb.quad([x, 1.0, -3150 - Math.sin(i) * 30], [x + 100, 1.0, -3150 - Math.sin(i + 1) * 30], [x + 100, 1.0, -3230], [x, 1.0, -3230], '#c8d0d4'); } }));
  const MUZ = () => { const c = SET.midgar({ omit: [7], crushed: true, cannon: true }).rx.cannon; return { p: cityW(c.muzzle), dir: c.dir }; };
  const DIA = [0, 0, -2600];       // where Diamond WEAPON makes its stand
  const duskCoast = env('dawn', { sky: ['#1c1e36', '#c86a48', '#2a2224'], sun: { dir: [0.9, 0.05, 0.3], color: '#ff9a60', size: 0.16 }, fog: { color: [0.42, 0.32, 0.3], near: 1200, far: 16000 }, light: { dir: [-0.9, -0.25, -0.3], color: [0.9, 0.6, 0.44], ambient: [0.3, 0.26, 0.32] } });
  K.ENVX.duskCoast = duskCoast;
  const drawCoast = (S, o) => { K.drawMidgar(S, S.city, Object.assign({ scale: MS, lights: 0.8, steam: 0.8 }, o || {})); GL.draw(coastSea()); };
  const shots = (S, from, to, n, t, c) => { for (let i = 0; i < n; i++) { const u = (t + i / n) % 1; const p = LV(from, to, u); p[1] += Math.sin(u * Math.PI) * V.len(V.sub(to, from)) * 0.08; const q = LV(from, to, Math.max(0, u - 0.04)); q[1] += Math.sin(Math.max(0, u - 0.04) * Math.PI) * V.len(V.sub(to, from)) * 0.08; S.beam(q, p, 30, c || '#80d0ff', 0, 0.8); S.glow(p, 90, c || '#80d0ff', 0.9); S.core(p, 28, '#ffffff', 0.9); } };

  // ================================================================== DIAMOND WEAPON rises and marches on Midgar
  def('diamond_weapon', {
    music: 'attackweapon',
    grade: { tint: '#f0e0d8', vignette: 0.55 },
    sample: 'Out of the sea rises Diamond WEAPON.\nStep by thundering step it marches toward Midgar.',
    shots: [
      // 1. the sea churns off the coast; Midgar dark on the horizon
      { dur: 240, env: duskCoast, fadeIn: 40,
        init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); },
        update(S, k) { for (let i = 0; i < 3; i++) wake(S, [DIA[0] + (Math.random() - 0.5) * 300, 0, -3800 + (Math.random() - 0.5) * 300], 30, 1); S.shake(0.2); },
        cam: (S, k) => ({ eye: [600, 40, -4700], at: [0, 100, -3800], fov: 44, near: 2, far: 30000 }),
        draw(S) { drawCoast(S); } },
      // 2. Diamond WEAPON rises out of the waves, water pouring from its armour
      { dur: 300, env: duskCoast,
        init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); S.w = S.add(K.weapon('diamond_weapon', 330)); S.w.rotY = 0; },
        update(S, k) { S.w.position = [0, L(-300, 0, easeOut(k)), -3800]; S.shake(0.4); for (let i = 0; i < 4; i++) S.fx.emit(1, { p: V.add(S.w.position, [(Math.random() - 0.5) * 160, 200 + Math.random() * 120, (Math.random() - 0.5) * 60]), v: [0, -1, 0], vs: 0.4, life: 60, size: [10, 24], c0: '#e8f0f8', kind: 'smoke', grav: 0.08, alpha: 0.6 }); wake(S, [(Math.random() - 0.5) * 200, 0, -3800], 30, 2); if (S.cue('r', k > 0.2)) S.sfx('falling'); },
        cam: (S, k) => ({ eye: [340, 30, -3200], at: V.add(S.w.position, [0, 230, 0]), fov: 50, near: 2, far: 30000 }),
        draw(S) { drawCoast(S); coreGlow(S, S.w, '#60e0ff', 60, 0.8); } },
      // 3. it strides ashore; the ground shakes with every step (low angle)
      { dur: 300, env: duskCoast,
        init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); S.w = S.add(K.weapon('diamond_weapon', 330)); K.pose(S.w, (m) => giantWalk(m, S.f * 0.035)); },
        update(S, k) { S.w.position = [0, 0, L(-3500, -3000, k)]; if (S.f % 90 === 45) { S.shake(1.2); S.sfx('hit', 0.7); K.dust(S, V.add(S.w.position, [(S.f % 180 ? 50 : -50), 5, 0]), 30, 6, { c0: '#8a7a68' }); } },
        cam: (S, k) => ({ eye: [220, 6, -2700], at: V.add(S.w.position, [0, 260, 0]), fov: 56, near: 2, far: 30000 }),
        draw(S) { drawCoast(S); coreGlow(S, S.w, '#60e0ff', 60, 0.8); } },
      // 4. wide: the giant crosses the wasteland toward the city; Shinra's guns open fire
      { dur: 300, env: duskCoast,
        init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); S.w = S.add(K.weapon('diamond_weapon', 330)); K.pose(S.w, (m) => giantWalk(m, S.f * 0.035)); },
        update(S, k) { S.w.position = [0, 0, L(-3000, -2600, k)]; if (S.f % 90 === 45) S.shake(0.5); if (S.f % 14 === 0) { const p = V.add(S.w.position, [(Math.random() - 0.5) * 200, 100 + Math.random() * 200, 40]); K.explode(S, p, 12, { n: 12, debris: 8 }); S.sfx('shot', 0.4); } },
        cam: (S, k) => ({ eye: [-900, 160, -3300], at: [0, 170, -1600], fov: 50, near: 2, far: 30000 }),
        draw(S, k) { drawCoast(S); coreGlow(S, S.w, '#60e0ff', 60, 0.8); for (let i = 0; i < 6; i++) { const a = [(i - 3) * 300, 140, -1000]; const b = V.add(S.w.position, [(i - 3) * 20, 180, 0]); const u = (S.f * 0.03 + i * 0.3) % 1; S.core(LV(a, b, u), 12, '#ffd060', 0.9); } } },
      // 5. its head turns toward Midgar; the core flares
      { dur: 300, env: duskCoast, fadeOut: 60,
        init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); S.w = S.add(K.weapon('diamond_weapon', 330)); K.pose(S.w, (m) => { roar(m, bump(S.k, 0.2, 1) * 0.5); m.b('head').rot[1] = 0.3 * S.k; }); },
        update(S, k) { S.w.position = [0, 0, -2600]; if (S.cue('roar', k > 0.3)) S.sfx('bosskill'); S.shake(bump(k, 0.3, 0.8) * 0.5); },
        cam: (S, k) => ({ eye: LV([-260, 250, -2280], [-200, 270, -2330], ease(k)), at: [0, 280, -2600], fov: 44, near: 2, far: 30000 }),
        draw(S, k) { drawCoast(S); coreGlow(S, S.w, '#60e0ff', 60 + k * 60, 0.8 + k * 0.4); } },
    ],
  });

  // ================================================================== THE SISTER RAY FIRES
  def('sister_ray', {
    music: 'makocannon',
    grade: { tint: '#e8f0e8', vignette: 0.55 },
    sample: 'Shinra fires the Sister Ray, the great Mako cannon mounted on Midgar.\nIts beam tears through Diamond WEAPON... as the monster\'s own blasts strike the Shinra Building.\nFar to the north, the barrier over the Northern Crater shatters.',
    shots: [
      // 1. every reactor pours its Mako into the cannon
      { dur: 300, env: duskCoast, fadeIn: 30,
        init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); },
        update(S, k) { if (S.cue('hum', k > 0.05)) S.sfx('cast'); },
        cam: (S, k) => ({ eye: LV(cityW(P(34, 0.9, 12)), cityW(P(28, 0.75, 14)), ease(k)), at: cityW([0, 9, -6]), fov: 50, near: 2, far: 30000 }),
        draw(S, k) {
          drawCoast(S, { mako: 1.6 });
          const base = cityW(S.city.rx.cannon.base);
          for (let s = 1; s <= 8; s++) { const a = cityW(MID.reactorPos(s, MID.PH + 1.2)); for (let j = 0; j < 3; j++) { const u = (S.f * 0.012 + j / 3 + s * 0.1) % 1; const p = LV(a, V.add(base, [0, 35, 0]), u); p[1] += Math.sin(u * Math.PI) * 15; S.glow(p, 40, '#40ff90', 0.8); S.core(p, 12, '#e0fff0', 0.9); } }
        } },
      // 2. out on the plain Diamond WEAPON opens its shoulders; points of light gather
      { dur: 240, env: duskCoast,
        init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); S.w = S.add(K.weapon('diamond_weapon', 330)); K.pose(S.w, (m) => { m.b('shL').rot[2] = 0.9 * ease(S.k); m.b('shR').rot[2] = -0.9 * ease(S.k); }); S.w.position = DIA.slice(); },
        update(S, k) { if (S.cue('ch', k > 0.1)) S.sfx('magic'); },
        cam: (S, k) => ({ eye: [-180, 360, -2240], at: [0, 280, -2600], fov: 48, near: 2, far: 30000 }),
        draw(S, k) { drawCoast(S); coreGlow(S, S.w, '#60e0ff', 90, 1); const c = ease(seg(k, 0.2, 1)); for (let i = 0; i < 12; i++) { const sx = i < 6 ? 1 : -1; const p = V.add(S.w.position, [sx * (90 + (i % 6) * 12), 290 + (i % 3) * 14, 20 - (i % 6) * 10]); S.glow(p, 30 * c, '#ff9040', 0.9 * c); S.core(p, 10 * c, '#ffffff', c); } } },
      // 3. it fires: a volley of blazing shots arcs toward Midgar
      { dur: 240, env: duskCoast,
        init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); S.w = S.add(K.weapon('diamond_weapon', 330)); S.w.position = DIA.slice(); },
        update(S, k) { if (S.f % 20 === 0) S.sfx('fire2', 0.5); },
        cam: (S, k) => ({ eye: [700, 200, -2100], at: [-100, 400, -1300], fov: 52, near: 2, far: 30000 }),
        draw(S, k) { drawCoast(S); coreGlow(S, S.w, '#60e0ff', 90, 1); shots(S, V.add(DIA, [0, 300, 0]), cityW([0, 22, 0]), 10, k * 1.5, '#ff9040'); } },
      // 4. the Sister Ray charges
      { dur: 240, env: duskCoast,
        init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); },
        update(S, k) { S.shake(0.2 + k * 0.5); if (S.cue('ch', k > 0.05)) S.sfx('cast'); },
        cam: (S, k) => { const m = MUZ(); return { eye: V.add(m.p, [220, 60, -260]), at: V.add(m.p, [0, 0, 60]), fov: 50, near: 2, far: 30000 }; },
        draw(S, k) { drawCoast(S, { mako: 2 }); const m = MUZ().p, c = ease(k); S.glow(m, 60 + c * 200, '#40ff90', 0.8 * c); S.core(m, 20 + c * 60, '#e0fff0', c); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + S.f * 0.06; S.beam(V.add(m, [Math.cos(a) * 180 * (1 - c), Math.sin(a) * 180 * (1 - c), 0]), m, 8, '#60ffb0', 0.6 * c, 0.2); } } },
      // 5. FIRE
      { dur: 180, env: duskCoast,
        init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); },
        update(S, k) { S.shake(2 - k * 1.5); if (S.cue('fire', true)) { S.sfx('bosskill'); FF7.sceneMgr.doFlash('#e8fff0', 24, 0.9); } },
        cam: (S, k) => { const m = MUZ(); return { eye: V.add(m.p, [-160, 80, 200]), at: V.add(m.p, [0, 20, -400]), fov: 52, near: 2, far: 30000 }; },
        draw(S, k) { drawCoast(S, { mako: 2 }); const m = MUZ(); const end = V.add(m.p, V.scale(m.dir, 30000)); S.beam(m.p, end, 220, '#40ff90', 0.9, 0.5); S.beamCore(m.p, end, 70, '#ffffff', 1, 0.8); S.glow(m.p, 400, '#80ffc0', 0.8); } },
      // 6. the beam punches through Diamond WEAPON
      { dur: 240, env: duskCoast,
        init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); S.w = S.add(K.weapon('diamond_weapon', 330)); S.w.position = DIA.slice(); K.pose(S.w, (m) => { m.b('body').rot[0] = -0.25 * ease(S.k); m.b('armL').rot[0] = -1.2; m.b('armR').rot[0] = -1.0; }); },
        update(S, k) { S.shake(1.0); if (S.cue('hit', true)) { K.explode(S, V.add(DIA, [0, 220, 0]), 60, { n: 80, debris: 80, c0: '#f0fff0', c1: '#40ff90' }); S.sfx('bosskill'); } if (S.f % 3 === 0) K.fire(S, V.add(DIA, [(Math.random() - 0.5) * 60, 200 + Math.random() * 60, 0]), 20, 1); },
        cam: (S, k) => ({ eye: [900, 220, -2300], at: V.add(DIA, [0, 220, 0]), fov: 46, near: 2, far: 30000 }),
        draw(S, k) { drawCoast(S); const m = MUZ(); const end = V.add(m.p, V.scale(m.dir, 30000)); const a = 1 - seg(k, 0.4, 1) * 0.7; S.beam(m.p, end, 200 * a, '#40ff90', 0.8, 0.4); S.beamCore(m.p, end, 60 * a, '#ffffff', 1, 0.7); } },
      // 7. Diamond's shots slam into the top of the Shinra Building
      { dur: 240, env: duskCoast,
        init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); },
        update(S, k) { const top = cityW([0, MID.PH + 14, 0]); if (S.f % 16 === 0 && k > 0.2) { K.explode(S, V.add(top, [(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40, 40]), 30, { n: 30, debris: 30 }); S.sfx('bosskill', 0.7); S.shake(0.8); } },
        cam: (S, k) => ({ eye: cityW([6, MID.PH + 12, 12]), at: cityW([0, MID.PH + 13, 0]), fov: 46, near: 2, far: 30000 }),
        draw(S, k) { drawCoast(S); shots(S, V.add(DIA, [0, 300, 0]), cityW([0, MID.PH + 14, 1.2]), 6, k * 1.2, '#ff9040'); } },
      // 8. far to the north the beam strikes the barrier over the Northern Crater, and it shatters
      { dur: 300, env: E.crater, fadeOut: 60,
        init(S) { S.cr = SET.crater(); },
        update(S, k) { if (S.cue('hit', k > 0.3)) { S.sfx('bosskill'); FF7.sceneMgr.doFlash('#e0fff0', 20, 0.7); } if (k > 0.3 && S.f % 2 === 0) S.fx.emit(6, { p: [0, 700, 0], spread: 400, v: [0, 2, 0], vs: 8, life: 120, size: [60, 20], c0: '#c0fff0', c1: '#40c0a0', kind: 'core', grav: 0.08 }); },
        cam: (S, k) => ({ eye: [3000, 900, 3200], at: [0, 300, 0], fov: 46, near: 5, far: 30000 }),
        draw(S, k) {
          K.drawCrater(S, S.cr, { glow: 1.2 });
          const bm = seg(k, 0.1, 0.35), br = seg(k, 0.3, 1);
          if (k < 0.5) { const from = [8000, 900, 12000], to = LV(from, [0, 800, 0], bm); S.beam(from, to, 160, '#40ff90', 0.9 * (1 - br), 0.9); S.beamCore(from, to, 50, '#ffffff', 1 - br, 1); }
          const a = 1 - br;
          if (a > 0) { for (let i = 0; i < 30; i++) { const an = i / 30 * TAU, el = (i % 5) / 5 * 1.3; const p = [Math.cos(an) * Math.cos(el) * 1100 * (1 + br * 0.4), 200 + Math.sin(el) * 900 * (1 + br * 0.3), Math.sin(an) * Math.cos(el) * 1100 * (1 + br * 0.4)]; S.glow(p, 520, '#60ffc0', 0.18 * a); } }
        } },
    ],
  });

  // ================================================================== THE NIGHT BEFORE (the Highwind on the plains; dawn; take-off)
  const nightPlains = env('night', { stars: 1.2, sky: ['#01020a', '#0c1630', '#04060c'], fog: { color: [0.03, 0.05, 0.1], near: 400, far: 6000 }, light: { dir: [0.3, -0.6, -0.7], color: [0.36, 0.42, 0.6], ambient: [0.18, 0.2, 0.28], dir2: [0.5, -0.3, 0.8], color2: [0.28, 0.08, 0.05] },
    skyFx(b, eye, r) { const p = V.add(eye, V.scale(V.norm([-0.5, 0.35, -0.8]), r * 0.9)); b.glow.sprite(p, r * 0.5, '#ff3010', 0.4); b.glow.sprite(p, r * 0.16, '#ff8040', 0.8); b.core.sprite(p, r * 0.06, '#ffd0a0', 0.9); } });
  const dawnPlains = env('dawn', { sky: ['#243a6a', '#f4a870', '#40342c'], sun: { dir: [0.2, 0.04, -1], color: '#ffc080', size: 0.18 }, fog: { color: [0.6, 0.48, 0.44], near: 400, far: 6000 } });
  const HWP = [0, 0, 0];
  const hwOnGround = (S) => { const h = K.highwind(); h.position = [HWP[0], S.pl.hFn(HWP[0], HWP[2]) + 2, HWP[2]]; h.rotY = 0.6; if (h.real) h.propSpeed = 0; return h; };
  def('highwind_night', {
    music: 'highwind', carry: true,
    grade: { tint: '#dce4f8', vignette: 0.6 },
    sample: 'The night before the final battle.\nUnder the stars, beside the resting Highwind, Cloud and Tifa wait for the dawn.',
    shots: [
      // 1. the Highwind at rest on the plains under a sky full of stars
      { dur: 360, env: nightPlains, fadeIn: 60,
        init(S) { S.pl = SET.plains(); S.h = hwOnGround(S); if (S.h.real) S.h.autoUpdate = false; },
        cam: (S, k) => ({ eye: LV([180, 20, 190], [150, 26, 150], ease(k)), at: [0, 36, 0], fov: 46, far: 9000 }),
        draw(S) { GL.draw(S.pl.mesh); S.h.draw(); for (const p of [[-40, 30, 60], [40, 30, 60], [0, 50, -60]]) S.glow(V.add(S.h.position, p), 6, '#ffe0a0', 0.5); } },
      // 2. Cloud and Tifa sit together by the airship's landing gear
      { dur: 420, env: nightPlains, dissolve: 30,
        init(S) {
          S.pl = SET.plains(); S.h = hwOnGround(S); if (S.h.real) S.h.autoUpdate = false;
          const y = S.pl.hFn(40, 60);
          S.c = S.add(K.actor('cloud', { pos: [40, y, 60], rotY: 2.4 })); S.t = S.add(K.actor('tifa', { pos: [39.3, y, 59.35], rotY: 2.4 }));
          const sitG = (mm) => { mm.b('hips').pos[1] = -0.4; mm.b('thighL').rot[0] = -1.45; mm.b('thighR').rot[0] = -1.45; mm.b('shinL').rot[0] = 0.5; mm.b('shinR').rot[0] = 0.5; mm.b('torso').rot[0] = 0.12; mm.b('armL').rot[0] = -0.6; mm.b('armR').rot[0] = -0.6; mm.b('foreL').rot[0] = -0.5; mm.b('foreR').rot[0] = -0.5; };
          K.pose(S.c, (mm) => { sitG(mm); mm.b('head').rot[0] = -0.35; });
          K.pose(S.t, (mm) => { sitG(mm); mm.b('head').rot[0] = -0.3 + bump(S.k, 0.5, 1) * 0.3; mm.b('head').rot[2] = 0.35 * ease(seg(S.k, 0.5, 0.8)); mm.b('torso').rot[2] = 0.12 * ease(seg(S.k, 0.5, 0.8)); });
        },
        cam: (S, k) => ({ eye: LV([44.5, S.pl.hFn(40, 60) + 1.0, 55.5], [43.4, S.pl.hFn(40, 60) + 0.95, 56.8], ease(k)), at: [39.65, S.pl.hFn(40, 60) + 0.75, 59.7], fov: 42, far: 9000 }),
        draw(S) { GL.draw(S.pl.mesh); S.h.draw(); S.glow([40, S.pl.hFn(40, 60) + 3, 58], 5, '#ffe0a0', 0.25); } },
      // 3. looking up: a falling star
      { dur: 300, env: nightPlains, dissolve: 30,
        cam: (S, k) => ({ eye: [0, 2, 0], at: [Math.sin(k * 0.2) * 10, 7, -10], fov: 52 }),
        draw(S, k) { const u = seg(k, 0.35, 0.6); if (u > 0 && u < 1) { const a = [-80, 140, -200], b = [80, 90, -200]; const p = LV(a, b, u); S.beam(LV(a, b, Math.max(0, u - 0.25)), p, 2, '#ffffff', 0, 0.9); S.core(p, 4, '#ffffff', 1); } } },
      // 4. dawn breaks over the plains
      { dur: 300, env: dawnPlains, dissolve: 90,
        init(S) { S.pl = SET.plains(); S.h = hwOnGround(S); if (S.h.real) S.h.autoUpdate = false; },
        cam: (S, k) => ({ eye: [-300, 60, 420], at: [0, 50, -200], fov: 46, far: 9000 }),
        draw(S) { GL.draw(S.pl.mesh); S.h.draw(); } },
      // 5. the propellers spin up and the Highwind lifts into the sunrise
      { dur: 420, env: dawnPlains, fadeOut: 70,
        init(S) { S.pl = SET.plains(); S.h = K.highwind(); },
        update(S, k) { const u = easeIn(seg(k, 0.2, 1)); S.h.position = [HWP[0] - u * 300, S.pl.hFn(0, 0) + 2 + u * 360, HWP[2] - u * 700]; S.h.rotY = L(0.6, Math.PI, ease(seg(k, 0.3, 1))); S.h.rotX = -0.12 * u; S.h.propSpeed = 0.1 + k * 0.9; if (S.cue('eng', k > 0.05)) S.sfx('helicopter'); if (k < 0.4) K.dust(S, [(Math.random() - 0.5) * 120, S.pl.hFn(0, 0) + 1, (Math.random() - 0.5) * 120], 8, 1, { c0: '#8a8068', alpha: 0.35 }); },
        cam: (S, k) => ({ eye: [220, 30, 320], at: V.add(S.h.position, [0, 30, 0]), fov: 46, far: 9000 }),
        draw(S) { GL.draw(S.pl.mesh); S.h.draw(); } },
    ],
  });

  // shots shared by 'holy' (the story's Holy / Lifestream movie) and 'ending'
  // 1. Meteor hangs above the city; a gale strips the plate
  const SH_METEOR = { dur: 330, env: env('meteor', { fog: { color: [0.25, 0.07, 0.04], near: 300, far: 2400 } }), fadeIn: 40,
      init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); },
      update(S, k) { S.shake(0.15); if (S.f % 2 === 0) S.fx.emit(3, { p: P(10 + Math.random() * 28, Math.random() * TAU, MID.PH + 1), v: [0, 0.4, 0], vs: 0.2, life: 100, size: [0.4, 0.2], c0: '#3a3632', kind: 'smoke', grav: -0.01, alpha: 0.9 }); },
      cam: (S, k) => ({ eye: LV(P(70, 3.4, 10), P(62, 3.35, 12), ease(k)), at: [0, 40, -20], fov: 54, near: 0.3, far: 3000 }),
      draw(S, k) { K.drawMidgar(S, S.city, { lights: 0.5 }); K.drawMeteor(S, [10, 95, -60], 70, 1); } };
  // 2. Holy meets Meteor: a shell of white light between them
  const SH_HOLYMEETS = { dur: 330, env: env('meteor', { fog: { color: [0.3, 0.12, 0.08], near: 300, far: 2400 } }), dissolve: 30,
      init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); },
      update(S, k) { S.shake(0.4 + k * 0.4); if (S.f % 2 === 0) S.fx.emit(4, { p: P(8 + Math.random() * 30, Math.random() * TAU, MID.PH + 1), v: [0, 0.6, 0], vs: 0.3, life: 90, size: [0.6, 0.3], c0: '#4a4642', kind: 'smoke', grav: -0.015, alpha: 0.9 }); if (S.cue('hum', k > 0.1)) S.sfx('heal2'); },
      cam: (S, k) => ({ eye: P(92, 3.6 + k * 0.15, 20 + k * 6), at: [4, 52, -34], fov: 54, near: 0.3, far: 3000 }),
      draw(S, k) {
        K.drawMidgar(S, S.city, { lights: 0.4 }); K.drawMeteor(S, [10, 90, -55], 66, 1);
        const hs = [10, 45, -40]; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; S.glow(V.add(hs, [Math.cos(a) * 60, Math.sin(a * 2) * 6 + 8, Math.sin(a) * 40]), 30, '#e0f0ff', 0.25 + 0.1 * Math.sin(S.f * 0.2 + i)); }
        S.glow(hs, 160, '#ffffff', 0.35 + 0.1 * Math.sin(S.f * 0.3));
      } };
  // 3. the light falters; the Shinra building and the plate begin to break up
  const SH_FALTER = { dur: 300, env: env('meteor', { fog: { color: [0.3, 0.12, 0.08], near: 200, far: 2000 } }), dissolve: 20,
      init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); },
      update(S, k) { S.shake(0.8); if (S.f % 12 === 0) { K.explode(S, P(6 + Math.random() * 30, Math.random() * TAU, MID.PH + 1), 2, { n: 12, debris: 10 }); S.sfx('fire2', 0.5); } },
      cam: (S, k) => ({ eye: P(24, 3.2, MID.PH + 6), at: [0, MID.PH + 12, 0], fov: 56, near: 0.2, far: 3000, roll: Math.sin(S.f * 0.05) * 0.03 }),
      draw(S, k) { K.drawMidgar(S, S.city, { lights: 0.3 * (1 - k) }); K.drawMeteor(S, [10, 80, -50], 62, 1); S.glow([10, 40, -30], 120, '#ffffff', 0.25 * (1 - k)); } };
  // 4. far across the Planet, green light rises out of the land and the sea
  const SH_RISE = { dur: 420, env: env('meteor', { sky: ['#0a0612', '#4a2030', '#08080a'], fog: { color: [0.14, 0.08, 0.08], near: 1500, far: 20000 } }), dissolve: 40,
      init(S) { S.pl = SET.plains(); },
      cam: (S, k) => ({ eye: LV([0, 120, 900], [0, 260, 600], ease(k)), at: [0, L(200, 900, ease(k)), -1000], fov: 52, far: 30000 }),
      draw(S, k) {
        GL.draw(S.pl.mesh);
        const bases = []; for (let i = 0; i < 14; i++) bases.push([Math.sin(i * 2.4) * 1400, S.pl.hFn(Math.sin(i * 2.4) * 1400, -600 - i * 150) - 5, -600 - i * 150]);
        K.lifestreamRise(S, bases, [0, 3000, -6000], { amount: ease(seg(k, 0, 0.8)), width: 160, alpha: 0.8, swirl: 0.8, bulge: 0.15 });
        K.lifestreamRise(S, bases, [0, 3000, -6000], { amount: ease(seg(k, 0, 0.8)), width: 50, alpha: 0.9, swirl: 0.8, bulge: 0.15, c1: '#e0fff0', c2: '#ffffff' });
        for (const b of bases) S.glow(b, 200, '#40ff90', 0.4 * ease(k));
      } };
  // 5. the Lifestream converges on Midgar and wraps around Meteor
  const SH_CONVERGE = { dur: 390, env: env('meteor', { fog: { color: [0.2, 0.12, 0.08], near: 300, far: 2600 } }), dissolve: 30,
      init(S) { S.city = SET.midgar({ omit: [7], crushed: true, cannon: true }); },
      update(S, k) { S.shake(0.5); if (S.cue('ls', k > 0.05)) S.sfx('heal2'); },
      cam: (S, k) => ({ eye: LV(P(150, 2.9, 40), P(120, 3.3, 60), ease(k)), at: [0, 70, -40], fov: 56, near: 0.5, far: 4000 }),
      draw(S, k) {
        K.drawMidgar(S, S.city, { lights: 0.2 }); K.drawMeteor(S, [10, 90, -55], 66, 1 - k * 0.3);
        const bases = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; bases.push([Math.cos(a) * 600, -20, Math.sin(a) * 600]); }
        K.lifestreamRise(S, bases, [10, 90, -55], { amount: ease(seg(k, 0, 0.7)), width: 50, alpha: 0.8, swirl: 1.2, bulge: 0.3, arc: 160 });
        K.lifestreamRise(S, bases, [10, 90, -55], { amount: ease(seg(k, 0, 0.7)), width: 14, alpha: 0.9, swirl: 1.2, bulge: 0.3, arc: 160, c1: '#e0fff0', c2: '#ffffff' });
        S.glow([10, 90, -55], 300, '#80ffc0', 0.4 * ease(seg(k, 0.4, 1)));
      } };

  // ================================================================== HOLY rises; it cannot hold Meteor back; the Lifestream answers
  def('holy', {
    music: 'worldcrisis', carry: true,
    grade: { tint: '#ece8f4', vignette: 0.55 },
    sample: 'Meteor bears down on Midgar, its fire tearing the plates apart.\nHoly rises to meet it, but the light is not enough...\n\nThen, from every corner of the Planet, the Lifestream wells up\nand races across the world toward Midgar...',
    shots: [
      // 1. deep in the crater, a white light stirs
      { dur: 300, env: E.crater, fadeIn: 50,
        init(S) { S.cr = SET.crater(); },
        update(S, k) { if (S.f % 3 === 0) S.fx.emit(2, { p: [0, -500, 0], spread: [200, 10, 200], v: [0, 0.8, 0], vs: 0.3, life: 200, size: [5, 2], c0: '#ffffff', c1: '#80c0ff', kind: 'core' }); },
        cam: (S, k) => ({ eye: LV([300, -300, 300], [200, -380, 200], ease(k)), at: [0, -480, 0], fov: 52, near: 2, far: 9000 }),
        draw(S, k) { K.drawCrater(S, S.cr, { glow: 0.6, vortex: 0 }); K.drawHoly(S, [0, -500, 0], 20 * ease(k) + 2, ease(k)); } },
      // 2. out of the crater into the sky: rings of light burst outward
      { dur: 300, env: E.crater, dissolve: 20,
        init(S) { S.cr = SET.crater(); },
        update(S, k) { if (S.cue('burst', k > 0.15)) { S.sfx('heal2'); FF7.sceneMgr.doFlash('#ffffff', 20, 0.6); } },
        cam: (S, k) => ({ eye: [2600, 700, 2800], at: [0, L(300, 1200, ease(k)), 0], fov: 48, near: 5, far: 30000 }),
        draw(S, k) { K.drawCrater(S, S.cr, { glow: 0.8, vortex: 1 - k }); const y = L(100, 2400, easeIn(k)); K.drawHoly(S, [0, y, 0], 80, 1); for (let i = 0; i < 3; i++) { const u = (k * 1.5 + i / 3) % 1; K.put(SET.flatRing(), [0, 200 + u * 600, 0], null, 300 + u * 2400, { tint: [0.8, 0.9, 1, 0.5 * (1 - u)] }); } } },
      // 3-7. over Midgar: Meteor, Holy, the Lifestream
      Object.assign({}, SH_METEOR, { dissolve: 30, fadeIn: 0 }), SH_HOLYMEETS, SH_FALTER, SH_RISE,
      Object.assign({}, SH_CONVERGE, { fadeOut: [70, '#ffffff'] }),
    ],
  });

  // ================================================================== ENDING: Holy and Meteor over Midgar; the Lifestream; 500 years later
  def('ending', {
    music: 'worldcrisis', carry: true,
    grade: { tint: '#f4e8e0', vignette: 0.55 },
    sample: 'Meteor bears down on Midgar. Holy cannot hold it back...\nThen, from every corner of the Planet, the Lifestream rises.',
    shots: [
      Object.assign({}, SH_METEOR, { fadeIn: 40 }), SH_HOLYMEETS, SH_FALTER, SH_RISE, SH_CONVERGE,
      // 6. everything dissolves into white light
      { dur: 240, env: 'lifestream', dissolve: 20, fadeOut: [120, '#ffffff'],
        cam: (S, k) => { const z = -S.f * 0.5; return { eye: [0, 0, z], at: [0, 0, z - 10], fov: 64 + k * 20 }; },
        draw(S, k) { K.lifestreamTunnel(S, -S.f * 0.5, { speed: 2 }); S.glow([0, 0, -S.f * 0.5 - 30], 60 * (0.3 + k), '#ffffff', 0.5 + k * 0.5); } },
      // 7. "500 years later"
      { dur: 240, env: env('space', { stars: 0 }), fadeIn: [60, '#ffffff'],
        cam: () => ({ eye: [0, 0, 0], at: [0, 0, -1] }),
        overlay(c, S, k) { c.fillStyle = '#000'; c.fillRect(0, 0, FF7.W, FF7.H); K.title(c, '500 Years Later', ease(seg(k, 0.25, 0.5)) * (1 - ease(seg(k, 0.8, 1))), { size: 26, y: FF7.H / 2 - 14, color: '#f0f0f0' }); } },
      // 8. Red XIII runs along the canyon cliffs with two cubs
      { dur: 390, env: env('canyon', { fog: { color: [0.86, 0.8, 0.66], near: 600, far: 9000 } }), fadeIn: 50,
        init(S) {
          S.cy = SET.canyon();
          S.r = S.add(K.actor('redxiii', { anim: 'q_run' })); S.c1 = S.add(K.actor('redxiii', { anim: 'q_run' })); S.c2 = S.add(K.actor('redxiii', { anim: 'q_run' }));
          S.c1.scale = S.c2.scale = 0.8;
        },
        update(S, k) {
          const x = L(-230, -30, k), z = L(-150, 0, k);
          const put = (m, dx, dz) => { const px = x + dx, pz = z + dz; m.position = [px, S.cy.hFn(px, pz), pz]; m.rotY = Math.atan2(200, 170); };
          put(S.r, 0, 0); put(S.c1, -5, -4); put(S.c2, -3, -7);
        },
        cam: (S, k) => { const p = S.r.position; return { eye: V.add(p, [6, 2.2, -3 + k * 2]), at: V.add(p, [-1, 0.6, 3]), fov: 50, far: 9000 }; },
        draw(S) { GL.draw(S.cy.mesh); } },
      // 9. at the cliff's edge he looks out over the green plain... and the ruins of Midgar, overgrown
      { dur: 510, env: env('canyon', { fog: { color: [0.86, 0.82, 0.72], near: 900, far: 30000 } }), dissolve: 30, fadeOut: 90,
        init(S) {
          S.cy = SET.canyon(); S.ruins = SET.midgar({ ruins: true });
          const y = S.cy.hFn(0, 50);
          S.r = S.add(K.actor('redxiii', { pos: [0, y, 50], rotY: 0.05 })); S.c1 = S.add(K.actor('redxiii', { pos: [-3, y, 46], rotY: 0.3 })); S.c2 = S.add(K.actor('redxiii', { pos: [3, y, 45], rotY: -0.2 }));
          S.c1.scale = S.c2.scale = 0.8;
          K.pose(S.r, (m) => { m.b('head').rot[0] = -0.5 * bump(S.k, 0.55, 0.9); });
        },
        update(S, k) { if (S.cue('howl', k > 0.6)) S.sfx('howl'); },
        cam: (S, k) => { const e = ease(seg(k, 0, 0.7)); const y = S.cy.hFn(0, 50); return { eye: LV([5, y + 1.6, 44], [-3, y + 2.6, 42], e), at: LV([0, y + 1, 51], [0, 70, 2500], e), fov: L(44, 40, e), far: 30000, farNear: 300, farFar: 60000 }; },
        drawFar(S) { K.drawMidgar(S, S.ruins, { day: true, noGlow: true, scale: 25, offset: [200, -20, 3200], rotY: 0.4 }); },
        draw(S) { GL.draw(S.cy.mesh); } },
    ],
  });

  // ================================================================== the finale's cutscenes (they were captions): the lake burial,
  // the Black Materia, the rocket and the escape pod, Bizarro and Safer Sephiroth, the Highwind bursting out of the crater
  // ------------------------------------------------------------------ shared pieces
  const MB = FF7.MeshBuilder;
  // the Planet from space: sea, land, ice caps and cloud by noise (unit sphere, drawn scaled), a blue rim of atmosphere
  SET.planet = () => once('planet', () => {
    // coloured per vertex (like Meteor), so coasts, ice and cloud blend smoothly instead of in flat squares
    const mb = new MB(); mb.sphere(0, 0, 0, 1, 1, 1, '#ffffff', 72, 44, true);
    const m = mb.build(), cl = (x) => Math.max(0, Math.min(1, x));
    const SEA0 = K.col('#163c86'), SEA1 = K.col('#2a6cb8'), LAND0 = K.col('#3e7a38'), LAND1 = K.col('#8a7a56'), WHITE = K.col('#eef2f8');
    for (let i = 0; i < m.count; i++) {
      const x = m.pos[i * 3], y = m.pos[i * 3 + 1], z = m.pos[i * 3 + 2];
      const n = K.vnoise(x * 2.3 + 3 + z * 0.7, y * 2.3 + z * 1.9, 11), c = K.vnoise(x * 5.5 + 9 + z * 2, y * 4 + z * 3, 4);
      let col = n > 0.56 ? K.mixc(LAND0, LAND1, cl((n - 0.6) / 0.12)) : K.mixc(SEA0, SEA1, cl((n - 0.44) / 0.12));
      col = K.mixc(col, WHITE, Math.max(cl((Math.abs(y) - 0.84) / 0.06), cl((c - 0.6) / 0.08) * 0.9));
      m.col[i * 4] = col[0]; m.col[i * 4 + 1] = col[1]; m.col[i * 4 + 2] = col[2];
    }
    return m;
  });
  K.drawPlanet = (S, p, r, rot = 0) => { K.put(SET.planet(), p, [1.25, rot + (S.f || 0) * 0.00012, 0.2], r);   // (tipped so the oceans, not the ice cap, face up)
    S.glow(p, r * 2.34, '#4a90ff', 0.42); S.glow(p, r * 2.1, '#b0dcff', 0.28); };
  // Cid's escape pod: a white capsule (nose: +y) with a dark heat shield and three windows
  SET.pod = () => once('pod', () => K.meshOf(mb => {
    mb.prism(0, 0, 0, 1.3, 1.05, 1.5, 12, '#ececf0', true);
    mb.prism(0, 1.5, 0, 1.05, 0.3, 1.1, 12, '#dcdce4', true);
    mb.prism(0, -0.45, 0, 1.38, 1.3, 0.45, 12, '#4a4a52', true);
    for (let i = 0; i < 3; i++) { mb.push(); mb.rotate(0, i / 3 * TAU, 0); mb.box(0, 1.0, 1.16, 0.55, 0.36, 0.12, '#1a2a4a'); mb.pop(); }
    for (let i = 0; i < 4; i++) { mb.push(); mb.rotate(0, i / 4 * TAU + 0.4, 0); mb.box(0, 0.4, 1.3, 0.22, 0.22, 0.18, '#8a8a92'); mb.pop(); }   // thruster blocks
  }));
  // a parachute: an orange-and-white dome with its shroud lines gathered below (the pod hangs 12 below it)
  SET.chute = () => once('chute', () => K.meshOf(mb => {
    mb.sphere(0, 0, 0, 6, 3.4, 6, '#f4f0e8', 12, 8, true, (i) => (i % 2 ? '#e8582a' : '#f4f0e8'), 4);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; mb.sweep([[Math.cos(a) * 5.9, 0, Math.sin(a) * 5.9], [0, -12, 0]], 0.04, { sides: 3, color: '#e0e0e0' }); }
  }, { cull: false }));
  // a soft, thin ring (a ripple, a band of light): transparent at both edges, bright in the middle. Built from single
  // triangles so each corner keeps its own alpha (a quad shares one colour triple across both halves: it came out toothed)
  SET.ripple = () => once('ripple', () => K.meshOf(mb => {
    const n = 64, band = [[0.86, 0], [0.94, 1], [1, 0]], P = (r, a) => [Math.cos(a) * r, 0, Math.sin(a) * r], c = (x) => [1, 1, 1, x];
    for (let i = 0; i < n; i++) {
      const a0 = i / n * TAU, a1 = (i + 1) / n * TAU;
      for (let j = 0; j < 2; j++) { const [ri, ci] = band[j], [ro, co] = band[j + 1]; const A = P(ri, a0), B = P(ro, a0), C = P(ro, a1), D = P(ri, a1); mb.tri(A, B, C, [c(ci), c(co), c(co)]); mb.tri(A, C, D, [c(ci), c(co), c(ci)]); }
    }
  }, { unlit: true, cull: false, blend: 'add', alphaTest: 0 }));
  const podAt = (S, p, rot, s = 4) => K.put(SET.pod(), p, rot || [0, 0, 0], s);
  const blackMateria = (S, p) => { if (!p) return; K.put(K.once('bmat', () => K.meshOf(mb => mb.sphere(0, 0, 0, 1, 1, 1, '#1a1422', 12, 9))), p, [0, (S.f || 0) * 0.03, 0.2], 0.08); S.glow(p, 0.55, '#5a2a9a', 0.45); S.core(p, 0.06, '#50ff90', 0.55); };
  const partyIds = () => { const ids = (FF7.state && FF7.state.party || []).filter(id => id && FF7.chars3d && FF7.chars3d.PRESETS && FF7.chars3d.PRESETS[id]); return ids.length ? ids : ['cloud', 'tifa', 'barret']; };
  // (in its own frame the rocket stands along +y: the flame at 0-18, the nose at 110; pointed along -z by rotX = -PI/2)
  const rocket26 = () => { const r = K.veh('rocket_26', { height: 110 }, 'rocket_26', { upright: true }); if (r.real) { r.play('move'); for (const n of ['pad', 'gantry']) { const b = r.bone(n); if (b) b.visible = false; } } return r; };
  // a point in a model's local frame (vehicles: position / rot / scale) -> world
  const local = (m, p) => M4.transformPoint(K.mat(m.position, [m.rotX || 0, m.rotY || 0, m.rotZ || 0], 1), p);
  const spaceEnv = env('space', { light: { dir: [-0.6, -0.25, -0.7], color: [1, 0.95, 0.9], ambient: [0.16, 0.16, 0.2] } });

  // ================================================================== AERIS: the lake (the altar is the original FMV; these are its closing shots)
  {
    const AD = CIN.movies.aeris_death && CIN.movies.aeris_death.shots;
    if (AD && AD.length >= 6) def('aeris_lake', {
      music: 'aeris',
      sample: 'Gently, he lays her in the water.\n\nFor a moment she floats there, as if only sleeping...\nthen slowly, slowly, she sinks away into the blue depths,\nuntil she is gone.',
      shots: [
        Object.assign({}, AD[4], { fadeIn: 40 }),
        Object.assign({}, AD[5], { fadeOut: 0 }),
        // the surface settles; the rings spread and fade, and the camera rises to the crystal trees and the stars
        { dur: 360, env: env('capital', { fog: { color: [0.08, 0.18, 0.26], near: 30, far: 260 }, stars: 0.6 }), dissolve: 50, fadeOut: 90,
          init(S) { S.lk = SET.lake(); },
          update(S, k) { if (S.f % 6 === 0) S.fx.emit(1, { p: [0.85 + (Math.random() - 0.5) * 3, -0.4, 4.2 + (Math.random() - 0.5) * 3], v: [0, 0.03, 0], vs: 0.006, life: 200, size: [0.1, 0.18], c0: '#e0fff0', c1: '#60ffb0', kind: 'core', alpha: 0.7 }); },
          cam: (S, k) => ({ eye: LV([7, 0.7, 11], [11, 10, 24], ease(k)), at: LV([0.85, 0, 4.2], [-12, 58, -140], ease(seg(k, 0.25, 1))), fov: 46, far: 800 }),
          draw(S, k) {
            GL.draw(S.lk.mesh); GL.draw(S.lk.water, null, { tint: [1, 1, 1, 0.62] }); S.glow([30, 60, -120], 50, '#c0e0ff', 0.2);
            for (let i = 0; i < 3; i++) { const u = Math.min(1, k * 1.4 + i * 0.18); K.put(SET.ripple(), [0.85, 0.02, 4.2], null, 0.5 + u * 9, { tint: [0.7, 0.9, 1, 0.22 * (1 - u)] }); }
          } },
      ],
    });
  }

  // ================================================================== THE BLACK MATERIA (the heart of the crater)
  SET.craterCore = () => once('craterCore', () => {
    const mb = new MB(), gb = new MB(), cb = new MB(), r = K.rng('ccore');
    // a well of dark rock: columns round the great crystal, ledges below it, pale crystals jutting from the walls
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU + r() * 0.1, d = 30 + r() * 14; mb.prism(Math.cos(a) * d, -70, Math.sin(a) * d, 5 + r() * 5, 2 + r() * 3, 60 + r() * 70, 6, sh('#262a32', (r() - 0.5) * 0.3), false); }
    for (let i = 0; i < 14; i++) { const a = r() * TAU, d = 11 + r() * 10; mb.prism(Math.cos(a) * d, -16 - r() * 6, Math.sin(a) * d, 3 + r() * 3, 1 + r(), 6 + r() * 4, 6, '#1e2228', false); }
    for (let i = 0; i < 44; i++) { const a = r() * TAU, d = 20 + r() * 20, y = -40 + r() * 80; gb.spike([Math.cos(a) * d, y, Math.sin(a) * d], [-Math.cos(a) * 0.7, r() - 0.2, -Math.sin(a) * 0.7], 4 + r() * 8, 0.8 + r() * 1.2, 5, '#70f0d0'); }
    // the great crystal round Sephiroth: a six-sided shaft with smaller shafts leaning out of its foot
    cb.prism(0, -3, 0, 2.0, 1.75, 9.5, 6, '#a0fff0', false);
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.3; cb.push(); cb.translate(Math.cos(a) * 2.2, -3.2, Math.sin(a) * 2.2); cb.rotate(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); cb.prism(0, 0, 0, 0.8 + r() * 0.4, 0.4, 3.5 + r() * 4, 6, '#90f8e8', false); cb.pop(); }
    return { rock: mb.build(), spikes: gb.build({ unlit: true }), crystal: cb.build({ unlit: true, cull: false }) };
  });
  const coreEnv = env('lifestream', { sky: ['#000604', '#032a1a', '#000302'], fog: { color: [0.01, 0.07, 0.05], near: 14, far: 150 }, light: { dir: [0.2, 0.85, -0.3], color: [0.45, 1.0, 0.72], ambient: [0.18, 0.28, 0.24] } });
  const drawCore = (S) => {
    GL.draw(S.cc.rock); GL.draw(S.cc.spikes, null, { unlit: true, blend: 'add', tint: [0.35, 0.85, 0.75, 0.5] });
    S.glow([0, -48, 0], 130, '#30ff90', 0.5); S.haze([0, -30, 0], 90, '#20c070', 0.25);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + (S.f || 0) * 0.002, d = 9 + (i % 3) * 5; S.beam([Math.cos(a) * d, -60, Math.sin(a) * d], [Math.cos(a) * d * 1.2, 30, Math.sin(a) * d * 1.2], 3, '#40ff90', 0.18 * (0.6 + 0.4 * Math.sin((S.f || 0) * 0.05 + i)), 0); }
  };
  const drawCrystal = (S, a) => { GL.draw(S.cc.crystal, null, { unlit: true, blend: 'alpha', tint: [0.55, 1, 0.9, 0.24 + a * 0.2], cull: false }); S.glow([0, 1.6, 0], 10, '#80ffe0', 0.2 + a * 0.3); };
  const coreMotes = (S, n = 1) => S.fx.emit(n, { p: [0, -30, 0], spread: [18, 10, 18], v: [0, 0.12, 0], vs: 0.03, life: 260, size: [0.25, 0.1], c0: '#d0ffe8', c1: '#30ff90', kind: 'core', alpha: 0.8 });
  const sleeper = (S, lift) => K.pose(S.sp, (m) => { m.b('head').rot[0] = 0.32 - (lift ? 0.26 * ease(seg(S.k, 0.5, 0.85)) : 0); m.b('armL').rot[2] = 0.18; m.b('armR').rot[2] = -0.18; m.b('armL').rot[0] = -0.08; m.b('armR').rot[0] = -0.08; });
  const headPt = (m, p) => { m.computeWorld(); return m.worldPoint('head', p || [0, 0.09, 0.02]); };
  def('black_materia', {
    grade: { tint: '#d8f0e8', vignette: 0.65 },
    sample: 'The Black Materia passes into Sephiroth\'s hand.\nInside the crystal, his eyes open.',
    shots: [
      // 1. the heart of the crater: Cloud rises through the green light toward the great crystal
      { dur: 300, env: coreEnv, fadeIn: 40,
        init(S) {
          S.cc = SET.craterCore(); S.c = S.add(K.actor('cloud', {})); S.sp = S.add(K.actor('sephiroth', { pos: [0, -0.2, 0], rotY: 0 })); sleeper(S);
          K.pose(S.c, (m) => { m.b('head').rot[0] = 0.3; m.b('armL').rot[0] = -0.25; m.b('armR').rot[0] = -0.25; m.b('thighL').rot[0] = 0.12; m.b('shinL').rot[0] = 0.25; m.b('shinR').rot[0] = 0.1; });
          S.prewarm(120);
        },
        update(S, k) { S.c.position = [0, L(-7, 0.4, easeOut(k)), 5.2]; S.c.rotY = Math.PI; if (S.f % 2 === 0) coreMotes(S); if (S.cue('hum', k > 0.05)) S.sfx('heal2', 0.4); },
        cam: (S, k) => ({ eye: LV([7, -12, 17], [5, -4, 12.5], ease(k)), at: V.add(S.c.position, [0, 1.3, -2.5]), fov: 48, near: 0.3, far: 300 }),
        draw(S) { drawCore(S); }, drawFx(S) { drawCrystal(S, 0.3); } },
      // 2. his hands hold out the Black Materia; it slips from them and drifts toward the crystal
      { dur: 250, env: coreEnv, dissolve: 20,
        init(S) {
          S.cc = SET.craterCore(); S.c = S.add(K.actor('cloud', { pos: [0, 0.4, 5.2], rotY: Math.PI }));
          K.pose(S.c, (m) => { m.b('armL').rot[0] = -1.35; m.b('armR').rot[0] = -1.35; m.b('armL').rot[2] = -0.2; m.b('armR').rot[2] = 0.2; m.b('foreL').rot[0] = -0.35; m.b('foreR').rot[0] = -0.35; m.b('head').rot[0] = 0.25; });
          S.prewarm(120);
        },
        update(S, k) {
          S.c.computeWorld(); const h = V.scale(V.add(S.c.worldPoint('handL', [0, 0, 0]), S.c.worldPoint('handR', [0, 0, 0])), 0.5);
          S.bm = LV(V.add(h, [0, 0.12, -0.05]), [0, 1.6, 2.4], ease(seg(k, 0.45, 1)));
          if (S.cue('rel', k > 0.45)) S.sfx('magic', 0.5);
          if (S.f % 3 === 0) coreMotes(S);
        },
        cam: (S, k) => { const b = S.bm || [0, 1.5, 4.6]; return { eye: LV([1.6, 1.85, 4.2], [2.6, 2.0, 5.8], ease(k)), at: LV(b, [0, 1.5, 1.6], ease(seg(k, 0.5, 1))), fov: 40, near: 0.05, far: 300 }; },
        draw(S) { drawCore(S); }, drawFx(S) { drawCrystal(S, 0.35); blackMateria(S, S.bm); } },
      // 3. it passes into the crystal; a ring of light runs through it, and the figure inside stirs
      { dur: 260, env: coreEnv, dissolve: 20,
        init(S) { S.cc = SET.craterCore(); S.sp = S.add(K.actor('sephiroth', { pos: [0, -0.2, 0], rotY: 0 })); sleeper(S); S.prewarm(120); },
        update(S, k) {
          S.bm = LV([0, 1.6, 2.6], [0, 1.35, 0.4], ease(seg(k, 0, 0.45)));
          if (S.cue('in', k > 0.45)) { S.sfx('summon', 0.6); S.pulse = 0; }
          if (S.pulse != null) S.pulse++;
          if (S.f % 3 === 0) coreMotes(S);
        },
        cam: (S, k) => ({ eye: LV([2.8, 1.9, 7], [1.5, 1.7, 4.4], ease(k)), at: [0, 1.4, 0], fov: 42, near: 0.1, far: 300 }),
        draw(S) { drawCore(S); },
        drawFx(S, k) {
          drawCrystal(S, 0.35 + bump(k, 0.45, 0.9) * 0.6);
          if (k < 0.5) blackMateria(S, S.bm);
          if (S.pulse != null) { const u = Math.min(1, S.pulse / 70); S.ring([0, 1.35, 0.4], 0.6 + u * 9, '#90ffd0', 0.8 * (1 - u)); S.glow([0, 1.35, 0.3], 2 + u * 6, '#40ff90', 0.6 * (1 - u)); }
        } },
      // 4. close on his face through the crystal: his head lifts, and his eyes flare green
      { dur: 240, env: coreEnv, dissolve: 20, fadeOut: [26, '#ffffff'],
        init(S) { S.cc = SET.craterCore(); S.sp = S.add(K.actor('sephiroth', { pos: [0, -0.2, 0], rotY: 0 })); sleeper(S, true); },
        update(S, k) { if (S.cue('eyes', k > 0.55)) S.sfx('magic'); if (k > 0.55) S.shake(0.004 + (k - 0.55) * 0.03); },
        cam: (S, k) => { const h = headPt(S.sp); return { eye: V.add(h, [0.06, 0.03, L(1.0, 0.62, ease(k))]), at: h, fov: 32, near: 0.02, far: 200 }; },
        draw(S) { drawCore(S); },
        drawFx(S, k) {
          drawCrystal(S, 0.6);
          const a = ease(seg(k, 0.55, 0.66));
          if (a > 0) for (const dx of [-0.02, 0.02]) { const p = headPt(S.sp, [dx, 0.077, 0.085]); S.glow(p, 0.06 * a + 0.025 * a * Math.sin(S.f * 0.3), '#50ff90', 0.8 * a); S.core(p, 0.012 * a, '#e8fff0', a); }
        } },
    ],
  });

  // ================================================================== THE ROCKET HITS METEOR (the escape pod gets clear)
  def('rocket_meteor', {
    grade: { tint: '#fff0e8', vignette: 0.6 },
    sample: 'The escape pod blasts free of the rocket just in time.\nMoments later, the Shinra No. 26 slams into Meteor...\n\n......Meteor doesn\'t so much as crack.\nThe great red star keeps falling, as silent as ever.',
    shots: [
      // 1. the rocket races on toward Meteor, the blue curve of the Planet below
      { dur: 240, env: spaceEnv, fadeIn: 30,
        init(S) { S.r = rocket26(); },
        update(S, k) { S.r.position = [0, 0, -S.f * 3]; S.r.rotX = -Math.PI / 2; const b = local(S.r, [0, 2, 0]); S.fx.emit(2, { p: b, spread: 3, v: [0, 0, 2.2], vs: 0.5, life: 30, size: [14, 5], c0: '#fff4d0', c1: '#ff7020', kind: 'glow' }); },
        cam: (S, k) => ({ eye: V.add(S.r.position, [L(70, 50, k), L(20, 35, k), L(170, 130, k)]), at: V.add(S.r.position, [0, 0, -120]), fov: 50, near: 1, far: 60000 }),
        draw(S) { K.drawPlanet(S, [0, -12000, -8000], 10000, 1.2); K.drawMeteor(S, [900, 1600, -16000], 2600, 1); S.r.draw(); const b = local(S.r, [0, 4, 0]); S.glow(b, 30, '#ffc060', 0.8); } },
      // 2. the escape pod blows free of the nose and veers off on its thrusters
      { dur: 250, env: spaceEnv, dissolve: 20,
        init(S) { S.r = rocket26(); },
        update(S, k) {
          S.r.position = [0, 0, -S.f * 3]; S.r.rotX = -Math.PI / 2;
          const nose = local(S.r, [0, 104, 0]), u = easeOut(seg(k, 0.25, 1));
          S.pod = V.add(nose, [u * 70, u * 26, u * 60]);
          if (S.cue('sep', k > 0.25)) { S.sfx('shot3'); K.explode(S, nose, 4, { n: 14, debris: 14, c0: '#ffffff', c1: '#ffb060', smoke: '#9a9aa0' }); }
          if (k > 0.25 && S.f % 2 === 0) S.fx.emit(1, { p: S.pod, spread: 1, v: [-0.8, -0.3, -0.6], vs: 0.2, life: 24, size: [3, 1], c0: '#e0f0ff', c1: '#6080ff', kind: 'glow' });
        },
        cam: (S, k) => { const n = local(S.r, [0, 80, 0]); return { eye: V.add(n, [L(60, 90, k), 18, 40]), at: LV(n, S.pod || n, ease(seg(k, 0.3, 1)) * 0.6), fov: 46, near: 1, far: 60000 }; },
        draw(S) { K.drawPlanet(S, [0, -12000, -8000], 10000, 1.2); K.drawMeteor(S, [900, 1600, -16000], 2600, 1); S.r.draw(); if (S.pod) podAt(S, S.pod, [0.4, S.f * 0.01, -1.1]); } },
      // 3. far off, the rocket dives into Meteor's face; a blinding flash, a ring of fire
      { dur: 260, env: spaceEnv, dissolve: 20,
        init(S) { S.r = rocket26(); },
        update(S, k) {
          const hit = [80, -40, -2100], u = easeIn(seg(k, 0, 0.45));
          S.r.position = LV([500, 100, 2200], hit, u); S.r.rotY = Math.atan2(hit[0] - 500, hit[2] - 2200) + Math.PI; S.r.rotX = -Math.PI / 2; S.r.visible = k < 0.45;   // (nose first: its nose is -z once tipped)
          if (S.cue('boom', k > 0.45)) { S.sfx('bosskill'); FF7.sceneMgr.doFlash('#ffffff', 26, 0.9); K.explode(S, hit, 320, { n: 70, debris: 110, c0: '#ffffff', c1: '#ff7020', smoke: '#6a4a3a' }); S.boom = 0; }
          if (S.boom != null) S.boom++;
        },
        cam: (S, k) => ({ eye: [2300, 700, 3400], at: LV([300, 60, 600], [0, 0, -2600], ease(seg(k, 0, 0.5))), fov: 44, near: 5, far: 60000 }),
        draw(S, k) {
          K.drawMeteor(S, [0, 0, -3000], 950, 1);
          if (S.r.visible) { S.r.draw(); const b = local(S.r, [0, 4, 0]); S.glow(b, 150, '#ffc060', 0.9); S.core(b, 40, '#ffffff', 0.9); S.beam(LV([500, 100, 2200], b, 0.35), b, 30, '#ffb060', 0.05, 0.7); }   // (its exhaust streak)
          if (S.boom != null) { const u = Math.min(1, S.boom / 90); S.ring([80, -40, -2000], 120 + u * 2800, '#ffd090', 0.8 * (1 - u)); S.glow([80, -40, -2100], 400 + u * 900, '#fff0c0', 0.8 * (1 - u)); }
          podAt(S, [1480, 330, 2480], [0.5, S.f * 0.004, -0.9], 30);   // (the escape pod, close, in silhouette)
        } },
      // 4. the smoke clears: Meteor burns on, untouched
      { dur: 300, env: spaceEnv, dissolve: 30, fadeOut: 60,
        update(S, k) { if (S.cue('s', k > 0.1)) S.sfx('falling', 0.5); },
        cam: (S, k) => ({ eye: LV([1500, 400, 2600], [1100, 280, 1600], ease(k)), at: [0, 0, -3000], fov: 44, near: 5, far: 60000 }),
        draw(S, k) {
          K.drawMeteor(S, [0, 0, -3000], 950, 1);
          const a = 1 - ease(seg(k, 0, 0.7));
          for (let i = 0; i < 12; i++) S.smoke([80 + Math.sin(i * 2.1) * 260, -40 + Math.cos(i * 1.7) * 200, -2000 + (i % 4) * 60], 500 + i * 30 + k * 300, '#4a3830', 0.5 * a, i);
          podAt(S, [700, 200, 1200], [0.5, S.f * 0.004, -0.9], 5);
        } },
    ],
  });

  // ================================================================== THE ESCAPE POD COMES HOME (re-entry, parachutes, splashdown)
  def('pod_splashdown', {
    grade: { tint: '#f4f0ec', vignette: 0.5 },
    sample: 'The escape pod plunges back through the atmosphere,\nits parachutes blossom, and it splashes down in the sea near Rocket Town.\nThe Highwind is waiting.',
    shots: [
      // 1. re-entry: the pod falls toward the blue, wrapped in fire
      { dur: 270, env: spaceEnv, fadeIn: 30,
        update(S, k) {
          S.p = [0, -S.f * 0.9, 0]; S.hot = ease(seg(k, 0.1, 0.45));
          const hot = S.hot;
          if (hot > 0) { K.fire(S, V.add(S.p, [0, -2.2, 0]), 7 * hot, 4, { c0: '#fff8d0', c1: '#ff5010', life: 34 }); S.fx.emit(1, { p: V.add(S.p, [0, 2, 0]), spread: 2, v: [0, 1.4, 0], vs: 0.3, life: 70, size: [6, 24], c0: '#ffa050', c1: '#40302a', kind: 'smoke', alpha: 0.45 * hot }); }
          if (S.cue('roar', k > 0.15)) S.sfx('fire2', 0.6);
          S.shake(hot * 0.3);
        },
        cam: (S, k) => ({ eye: V.add(S.p, [30, 14, 34]), at: V.add(S.p, [0, -12, -14]), fov: 50, near: 1, far: 200000 }),
        draw(S, k) { K.drawPlanet(S, V.add(S.p, [0, -38000, -30000]), 16000, 2.1); podAt(S, S.p, [0.25, 0, 0.15]); S.glow(V.add(S.p, [0, -2.5, 0]), 24, '#ffb060', 0.9 * (S.hot || 0)); } },
      // 2. over the sea, three parachutes blossom
      { dur: 260, env: E.sea, dissolve: 30,
        init(S) { S.sea = SET.sea('#1a4a78', '#2a5a88'); },
        update(S, k) { S.p = [0, L(260, 150, k), 0]; if (S.cue('pop', k > 0.18)) S.sfx('jump', 0.6); },
        cam: (S, k) => ({ eye: V.add(S.p, [L(40, 55, k), -10, 60]), at: V.add(S.p, [0, 16, 0]), fov: 50, near: 1, far: 12000 }),
        draw(S, k) {
          GL.draw(S.sea);
          podAt(S, S.p, [0, S.f * 0.003, 0], 4);
          const o = ease(seg(k, 0.18, 0.45));
          if (o > 0) [[-9, 0], [9, 0], [0, -9]].forEach(([x, z], i) => { const c = V.add(S.p, [x * o, 8 + 20 * o, z * o]), sc = 0.25 + 0.75 * o; K.put(SET.chute(), c, [0, i, (x / 40) * o], sc); S.beam(V.add(c, [0, -12 * sc, 0]), V.add(S.p, [0, 6.6, 0]), 0.12, '#e8e8e8', 0.8, 0.8); });   // (the risers down to the pod)
        } },
      // 3. splashdown near the coast; the Highwind comes in low over the water
      { dur: 300, env: E.sea, dissolve: 30, fadeOut: 60,
        init(S) { S.sea = SET.sea('#1a4a78', '#2a5a88'); S.h = K.highwind(); },
        update(S, k) {
          const d = ease(seg(k, 0, 0.3));
          S.p = [0, L(40, 1, d), 0];
          if (S.cue('splash', k > 0.3)) { K.splash(S, [0, 0, 0], 14, { n: 70 }); S.sfx('hop', 0.8); }
          S.h.position = LV([-1400, 360, -1800], [-170, 70, -240], ease(seg(k, 0.25, 1))); S.h.rotY = 0.7; S.h.rotZ = 0.12 * (1 - k);
        },
        cam: (S, k) => ({ eye: [110, 24, 150], at: LV([0, 8, 0], [-60, 40, -100], ease(seg(k, 0.4, 1))), fov: 48, near: 1, far: 12000 }),
        draw(S, k) {
          GL.draw(S.sea); S.h.draw();
          podAt(S, S.p, [0.1, 0.4, 0.08], 4);
          const sink = ease(seg(k, 0.3, 0.8));
          [[-9, 3], [9, 2], [2, -10]].forEach(([x, z], i) => K.put(SET.chute(), [x * 1.4, L(20, 0.3, sink), z * 1.4], [L(0, 0.25, sink) * (i % 2 ? 1 : -1), i, 0], [1, L(1, 0.22, sink), 1]));
        } },
    ],
  });

  // ================================================================== BIZARRO·SEPHIROTH (the void opens; Sephiroth swells into it)
  const abyssEnv = env('lifestream', { sky: ['#f0fff8', '#60d0a0', '#0a3020'], fog: { color: [0.5, 0.85, 0.7], near: 20, far: 220 }, light: { dir: [0.2, -0.8, -0.4], color: [0.8, 1, 0.9], ambient: [0.5, 0.62, 0.56] } });
  const voidEnv = env('lifestream', { sky: ['#000402', '#062818', '#000201'], fog: { color: [0.01, 0.06, 0.04], near: 40, far: 500 }, light: { dir: [0.3, -0.6, -0.7], color: [0.6, 0.9, 0.75], ambient: [0.24, 0.34, 0.3] } });
  // Bizarro·Sephiroth is five models (body, head, core, the magic wings), placed on the body by their anchors
  const BZ = [['bizarro_sephiroth', 0, 0], ['bizarro_sephiroth_b', 0, 0.3], ['bizarro_sephiroth_c', 0, 0.72], ['bizarro_sephiroth_d', -2.35, 0.1], ['bizarro_sephiroth_e', 2.35, 0.1]];
  const bizarro = (S, sc) => BZ.map(([id, ox, oz]) => { let m = null; try { m = K.creature(id); } catch (e) { m = null; } if (!m) return null; m.scale = sc; m.off = [ox, oz]; return S.add(m); }).filter(Boolean);
  const placeBz = (parts, p) => parts.forEach(m => { m.position = [p[0] + m.off[0] * m.scale, p[1], p[2] + m.off[1] * m.scale]; m.rotY = 0; });
  const voidStreams = (S, a = 1) => {
    const bases = []; for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; bases.push([Math.cos(an) * 90, -80, -30 + Math.sin(an) * 90]); }
    K.lifestreamRise(S, bases, [0, 60, -30], { amount: 1, width: 5, alpha: 0.35 * a, swirl: 0.8, bulge: 0.4 });
    S.haze([0, -40, -30], 200, '#10a060', 0.2 * a);
  };
  const floatParty = (S, z, y0) => partyIds().slice(0, 3).map((id, i) => S.add(K.actor(id, { pos: [(i - 1) * 1.7, y0, z], rotY: Math.PI })));
  def('bizarro_rises', {
    grade: { tint: '#e0f4ea', vignette: 0.6 },
    sample: 'Rings of dark light seize the party and lift them into the void.\nThe shape of Sephiroth twists and swells into something vast...',
    shots: [
      // 1. Sephiroth lifts a hand; rings of dark light close round the party and raise them off the ground
      { dur: 260, env: abyssEnv, fadeIn: 20,
        init(S) {
          S.sp = S.add(K.actor('sephiroth', { weapon: true, pos: [0, 1.5, -7], rotY: 0 })); K.pose(S.sp, (m) => { m.b('armR').rot[0] = -1.55; m.b('foreR').rot[0] = -0.15; m.b('head').rot[0] = 0.1; });
          S.pt = floatParty(S, 2, 0);
          S.ground = once('abyssGround', () => K.meshOf(mb => K.groundDisc(mb, 400, (rr) => U.mix('#d8f4e4', '#6ab890', Math.min(1, rr / 200)), 10, 24, 0, 3)));
        },
        update(S, k) {
          const u = ease(seg(k, 0.35, 1));
          S.pt.forEach((m, i) => { m.position = [(i - 1) * 1.7, u * 2.4 + Math.sin(S.f * 0.05 + i) * 0.05 * u, 2]; });
          S.sp.position[1] = 1.5 + Math.sin(S.f * 0.03) * 0.1;
          if (S.cue('r', k > 0.2)) S.sfx('magic');
        },
        cam: (S, k) => ({ eye: LV([-4.6, 1.4, 8.5], [-5.6, 2.6, 10], ease(k)), at: LV([0, 1.2, -1], [0, 2.8, 0], ease(k)), fov: 46, near: 0.1, far: 400 }),
        draw(S, k) {
          GL.draw(S.ground);
          const a = ease(seg(k, 0.15, 0.5));
          if (a > 0) S.pt.forEach((m, i) => { for (let j = 0; j < 3; j++) { const p = V.add(m.position, [0, 0.3 + j * 0.7, 0]); K.put(SET.ripple(), p, [0.15 * Math.sin(S.f * 0.04 + j), 0, 0.15 * Math.cos(S.f * 0.05 + i)], (0.95 - j * 0.1) * (2.2 - a * 1.2), { blend: 'alpha', tint: [0.2, 0.04, 0.32, 0.95 * a] }); } S.smoke(V.add(m.position, [0, 1, 0]), 2.6, '#140620', 0.35 * a, S.f * 0.01 + i); });
          S.glow(S.sp.position, 5, '#a060ff', 0.25 + 0.2 * Math.sin(S.f * 0.1));
        } },
      // 2. in the void, Sephiroth rises and swells in a storm of light; the vast shape climbs out of the dark beneath him
      { dur: 330, env: voidEnv, dissolve: 40,
        init(S) { S.bz = bizarro(S, 4.8); S.sp = S.add(K.actor('sephiroth', { rotY: 0 })); K.pose(S.sp, (m) => { m.b('armR').rot[0] = -2.7; m.b('armL').rot[0] = -2.7; m.b('armR').rot[2] = -0.3; m.b('armL').rot[2] = 0.3; m.b('head').rot[0] = -0.45; }); },
        update(S, k) {
          placeBz(S.bz, [0, L(-60, 0, easeOut(seg(k, 0.3, 1))), -40]);
          S.sp.position = [0, L(3, 20, ease(k)), -30]; S.sp.scale = 1.72 * (1 + ease(seg(k, 0.1, 0.6)) * 2.2); S.sp.visible = k < 0.6;
          if (S.cue('grow', k > 0.3)) S.sfx('bosskill');
          if (S.cue('flash', k > 0.6)) FF7.sceneMgr.doFlash('#e0ffe8', 24, 0.8);
          S.shake(bump(k, 0.25, 0.95) * 0.25);
          if (S.f % 2 === 0) S.fx.emit(2, { p: [0, -60, -40], spread: [60, 10, 60], v: [0, 0.6, 0], vs: 0.2, life: 200, size: [0.8, 0.3], c0: '#d0ffe8', c1: '#30ff90', kind: 'core' });
        },
        cam: (S, k) => ({ eye: LV([12, 3, 30], [20, 9, 40], ease(k)), at: LV([0, 8, -30], [0, 16, -40], ease(k)), fov: 56, near: 0.3, far: 900 }),
        draw(S, k) { voidStreams(S); if (S.sp.visible) { S.glow(V.add(S.sp.position, [0, S.sp.scale * 0.55, 0]), 6 + k * 30, '#e0fff0', 0.4 + k * 0.4); S.glow(V.add(S.sp.position, [0, S.sp.scale * 0.55, 0]), 3 + k * 10, '#ffffff', 0.5 + k * 0.4); } } },
      // 3. Bizarro·Sephiroth looms over the tiny party, hanging in the dark
      { dur: 250, env: voidEnv, dissolve: 30, fadeOut: [20, '#ffffff'],
        init(S) { S.bz = bizarro(S, 4.8); placeBz(S.bz, [0, 0, -40]); S.pt = floatParty(S, 6, 2.5); },
        update(S, k) { S.shake(0.06); if (S.cue('low', k > 0.2)) S.sfx('falling', 0.6); S.bz.forEach(m => { m.position[1] = Math.sin(S.f * 0.02) * 0.4; }); },
        cam: (S, k) => ({ eye: LV([2.5, 1.2, 15], [1.2, 0.3, 12.5], ease(k)), at: [0, 15, -40], fov: 58, near: 0.3, far: 900 }),
        draw(S) { voidStreams(S); S.glow([0, 11, -36.5], 20, '#40ff90', 0.3); } },
    ],
  });

  // ================================================================== SAFER·SEPHIROTH (the shell breaks; a single black wing)
  const saferWing = (S, open) => (m) => { const u = open == null ? ease(seg(S.k, 0.2, 0.75)) : open; m.b('wingR').rot[2] = L(1.35, 0, u); m.b('wingR').rot[0] = L(0.5, 0, u); };
  const safer = (S, sc, open) => { let m = null; try { m = K.creature('safer_sephiroth'); } catch (e) { m = null; } if (!m) return null; m.scale = sc; K.pose(m, saferWing(S, open)); return S.add(m); };
  def('safer_rises', {
    grade: { tint: '#f4f0f8', vignette: 0.6 },
    sample: "Bizarro·Sephiroth's shell crumbles away.\nFrom within it rises something else, radiant, terrible,\nspreading a single black wing across the heavens.",
    shots: [
      // 1. light bursts out through the shell and it crumbles into the dark
      { dur: 250, env: voidEnv, fadeIn: [24, '#ffffff'],
        init(S) { S.bz = bizarro(S, 4.8); placeBz(S.bz, [0, 0, -40]); const r = K.rng('rays'); S.rays = []; for (let i = 0; i < 14; i++) S.rays.push(V.norm([r() - 0.5, r() * 0.8 - 0.2, r() * 0.6])); },
        update(S, k) {
          const u = easeIn(seg(k, 0.5, 1));
          S.bz.forEach((m, i) => { m.position[1] = -u * (26 + i * 8); m.rotZ = u * (i % 2 ? 0.35 : -0.35); m.rotX = u * 0.2 * (i - 2); });
          S.shake(0.15 + bump(k, 0.25, 0.8) * 0.45);
          if (S.cue('crack', k > 0.15)) S.sfx('bosskill');
          if (k > 0.5 && S.f % 2 === 0) K.explode(S, [(Math.random() - 0.5) * 24, 6 + Math.random() * 20, -38], 4, { n: 6, debris: 12, c0: '#fff8e0', c1: '#a0c060', smoke: '#3a4a3a' });
        },
        cam: (S, k) => ({ eye: LV([12, 5, 26], [16, 3, 34], ease(k)), at: [0, 14, -38], fov: 56, near: 0.3, far: 900 }),
        draw(S, k) {
          voidStreams(S, 1 - k * 0.6);
          const c = [0, 14, -37], a = ease(seg(k, 0.1, 0.55));
          S.rays.forEach((d, i) => S.beam(c, V.add(c, V.scale(d, (20 + i * 2) * a)), 0.8 + (i % 3) * 0.5, '#fff8e0', 0.7 * a, 0));
          S.glow(c, 12 + a * 40, '#ffffff', 0.35 + 0.5 * a); S.core(c, 3 + a * 8, '#ffffff', a);
        } },
      // 2. out in the depths of space, a radiant figure rises out of the light
      { dur: 260, env: 'space', dissolve: 30,
        init(S) { S.sf = safer(S, 5.5, 0); },
        update(S, k) { if (S.sf) S.sf.position = [0, L(-80, 0, easeOut(k)), -40]; if (S.cue('ch', k > 0.1)) S.sfx('heal2', 0.6); },
        cam: (S, k) => ({ eye: LV([0, -6, 30], [8, 10, 38], ease(k)), at: [0, L(-24, 26, ease(k)), -40], fov: 52, near: 0.5, far: 3000 }),
        draw(S, k) { const p = S.sf ? V.add(S.sf.position, [0, 27, 0]) : [0, 27, -40]; S.glow(p, 70, '#fff0d0', 0.45); S.glow(p, 30, '#ffffff', 0.5); for (let i = 0; i < 3; i++) { const u = (k + i / 3) % 1; S.ring(p, 16 + u * 120, '#ffe8c0', 0.5 * (1 - u)); } } },
      // 3. the single black wing unfolds across the stars
      { dur: 300, env: 'space', dissolve: 24, fadeOut: [24, '#ffffff'],
        init(S) { S.sf = safer(S, 5.5); if (S.sf) S.sf.position = [0, 0, -40]; },
        update(S, k) { if (S.cue('w', k > 0.2)) S.sfx('run_attack', 0.7); if (S.sf) S.sf.position[1] = Math.sin(S.f * 0.02) * 1.0; },
        cam: (S, k) => ({ eye: LV([-6, -8, -2], [-12, -4, 6], ease(k)), at: LV([-2, 24, -40], [-8, 30, -40], ease(k)), fov: 58, near: 0.5, far: 3000 }),
        draw(S, k) { S.glow([14, 50, -110], 240, '#fff0c0', 0.35); S.glow([0, 27, -40], 40, '#ffffff', 0.3); } },
    ],
  });

  // ================================================================== SAFER·SEPHIROTH FALLS (a storm of light, and silence)
  def('safer_falls', {
    grade: { tint: '#f8f4ff', vignette: 0.5 },
    sample: "Safer·Sephiroth's body splits apart in a storm of light...\n\nand falls silent.",
    shots: [
      // 1. he convulses; cracks of light run across his body
      { dur: 230, env: 'space', fadeIn: [20, '#ffffff'],
        init(S) { S.sf = safer(S, 5.5, 1); if (S.sf) S.sf.position = [0, 0, -40]; const r = K.rng('sfall'); S.rays = []; for (let i = 0; i < 16; i++) S.rays.push(V.norm([r() - 0.5, r() - 0.5, r() * 0.8])); },
        update(S, k) { if (S.sf) { S.sf.rotZ = Math.sin(S.f * 0.35) * 0.05 * (0.3 + k); S.sf.rotX = Math.sin(S.f * 0.27) * 0.04 * k; } S.shake(0.1 + k * 0.4); if (S.cue('c', k > 0.1)) S.sfx('bosskill'); },
        cam: (S, k) => ({ eye: LV([10, 14, 34], [7, 18, 24], ease(k)), at: [0, 26, -40], fov: 50, near: 0.5, far: 3000 }),
        draw(S, k) { const c = [0, 27, -38], a = ease(seg(k, 0.1, 1)); S.rays.forEach((d, i) => S.beam(c, V.add(c, V.scale(d, (14 + i * 1.6) * a)), 0.9 + (i % 3) * 0.6, '#fffae8', 0.8 * a, 0)); S.glow(c, 16 + a * 50, '#ffffff', 0.3 + 0.5 * a); } },
      // 2. the burst: the light swallows everything
      { dur: 200, env: 'space', fadeOut: [60, '#ffffff'],
        update(S, k) { if (S.cue('b', S.f === 1)) { S.sfx('bosskill'); K.explode(S, [0, 27, -38], 44, { n: 70, debris: 120, c0: '#ffffff', c1: '#ffe0a0', smoke: '#c8c0d8' }); } },
        cam: (S, k) => ({ eye: LV([7, 18, 24], [12, 22, 50], ease(k)), at: [0, 27, -38], fov: 50, near: 0.5, far: 3000 }),
        draw(S, k) { S.glow([0, 27, -38], 60 + k * 380, '#ffffff', 0.9); S.core([0, 27, -38], 16 + k * 90, '#ffffff', 1); } },
    ],
  });

  // ================================================================== THE HIGHWIND BURSTS OUT OF THE CRATER (tail cut loose, rockets lit)
  // the section it drops: a length of steel hull with its red fin, cream stabilisers and the trailing propeller (the
  // ship's own fan and prop are hidden once it has gone)
  SET.hwTail = () => once('hwTail', () => K.meshOf(mb => {
    mb.push(); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, -22, 0, 7.5, 5, 44, 10, '#4a4e58', true); mb.prism(0, -26, 0, 3, 7.5, 4, 10, '#3a3e46', true); mb.pop();
    mb.box(0, 9, -10, 1.2, 14, 18, '#b83a2a'); for (const x of [-9, 9]) mb.box(x, 0, -12, 14, 1.2, 14, '#d0c098');
    mb.box(0, 0, -28, 2.4, 2.4, 6, '#303038'); mb.box(0, 0, -31, 30, 1.4, 1, '#2a2a30'); mb.box(0, 0, -31, 1.4, 30, 1, '#2a2a30');
    for (let i = 0; i < 6; i++) mb.box(Math.cos(i) * 6, Math.sin(i) * 6, 21, 2 + (i % 3), 2, 3, '#8a3a20');   // (torn-off struts at the break)
  }));
  const dropProp = (h) => { if (h.real) for (const b of h.m.order) if (b.name === 'fan' || b.name === 'prop') b.visible = false; };
  const booster = (S, h, s = 1) => { for (const x of [-14, 14]) { const b = local(h, [x, 14, -62]); K.fire(S, b, 7 * s, 2, { c0: '#fffff0', c1: '#ff7020', life: 22 }); S.glow(b, 26 * s, '#ffb050', 0.8); } };
  def('highwind_crater_escape', {
    music: 'highwind', carry: true,
    grade: { tint: '#e8f4f0', vignette: 0.55 },
    sample: "The Highwind's rear section tears away and tumbles into the light.\nRockets roar to life, and the ship bursts free of the crater,\nshooting up into the open sky.",
    shots: [
      // 1. inside the crater the ship strains upward, but the rising Lifestream is dragging it down
      { dur: 250, env: E.crater, fadeIn: 30,
        init(S) { S.cr = SET.crater(); S.h = K.highwind(); S.h.propSpeed = 1.2; },
        update(S, k) { S.h.position = [0, L(-120, -170, k) + Math.sin(S.f * 0.2) * 1.5, 0]; S.h.rotX = -0.22; S.h.rotZ = Math.sin(S.f * 0.09) * 0.05; S.shake(0.6); if (S.cue('g', k > 0.05)) S.sfx('falling'); },
        cam: (S, k) => ({ eye: V.add(S.h.position, [L(-260, -200, k), 90, 280]), at: V.add(S.h.position, [0, -30, 0]), fov: 50, near: 2, far: 9000 }),
        draw(S, k) {
          K.drawCrater(S, S.cr, { glow: 2.2, vortex: 1 }); S.h.draw();
          const bases = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; bases.push([Math.cos(a) * 420, -520, Math.sin(a) * 420]); }
          K.lifestreamRise(S, bases, V.add(S.h.position, [0, 40, 0]), { amount: 1, width: 26, alpha: 0.5, swirl: 1.4, bulge: 0.35 });
        } },
      // 2. the tail section breaks away and tumbles down into the light
      { dur: 220, env: E.crater, dissolve: 20,
        init(S) { S.cr = SET.crater(); S.h = K.highwind(); },
        update(S, k) {
          S.h.position = [0, -170, 0]; S.h.rotX = -0.22;
          const u = easeIn(seg(k, 0.3, 1));
          S.tp = V.add(local(S.h, [0, 10, -70]), [u * 20, -u * 280, -u * 50]); S.tr = [-0.22 - u * 1.6, 0.3 * u, u * 0.9];
          if (S.cue('cut', k > 0.3)) { S.sfx('shot3'); FF7.sceneMgr.doFlash('#ffc080', 16, 0.5); K.explode(S, local(S.h, [0, 10, -50]), 10, { n: 24, debris: 50 }); dropProp(S.h); }
          if (k > 0.3 && S.f % 2 === 0) K.smokeCol(S, local(S.h, [0, 10, -48]), 6, 1, { c0: '#5a5048', alpha: 0.5 });
        },
        cam: (S, k) => ({ eye: V.add(S.h.position, [230, -30, -210]), at: V.add(S.h.position, [0, -12 - k * 70, -60]), fov: 52, near: 2, far: 9000 }),
        draw(S) { K.drawCrater(S, S.cr, { glow: 2.2, vortex: 1 }); S.h.draw(); K.put(SET.hwTail(), S.tp, S.tr, 1); } },
      // 3. the rockets roar; the ship shoots up and over the rim
      { dur: 240, env: E.crater, dissolve: 16,
        init(S) { S.cr = SET.crater(); S.h = K.highwind(); dropProp(S.h); },
        update(S, k) { const u = easeIn(k); S.h.position = [L(0, 300, u), L(-170, 700, u), L(0, 500, u)]; S.h.rotX = -0.5; booster(S, S.h, 1.9); S.shake(0.8 * (1 - k)); if (S.cue('ign', S.f === 2)) S.sfx('bosskill'); },
        cam: (S, k) => ({ eye: [340, 40, 540], at: V.add(S.h.position, [0, 20, 0]), fov: 50, near: 2, far: 12000 }),   // (from inside the bowl, looking up)
        draw(S) { K.drawCrater(S, S.cr, { glow: 1.6, vortex: 1 }); S.h.draw(); } },
      // 4. clear of the crater: the Highwind races away over the ice, a red glare on the horizon
      { dur: 250, env: env('crater', { sky: ['#02040a', '#3a1418', '#02040a'], stars: 0.7, fog: { color: [0.09, 0.05, 0.08], near: 4000, far: 60000 }, light: E.crater.light }), dissolve: 30, fadeOut: 60,
        init(S) { S.cr = SET.crater(); S.h = K.highwind(); dropProp(S.h); },
        update(S, k) { S.h.position = [L(1400, 2600, k), L(900, 1000, k), L(1500, 2700, k)]; S.h.rotY = Math.atan2(1200, 1200); S.h.rotX = -0.08; booster(S, S.h, 0.8); },
        cam: (S, k) => ({ eye: V.add(S.h.position, [-260, 60, -160]), at: V.add(S.h.position, [300, 40, 300]), fov: 50, near: 2, far: 80000 }),
        draw(S) { K.drawCrater(S, S.cr, { glow: 0.8, vortex: 1 }); S.h.draw(); S.glow([14000, 1500, 14000], 9000, '#ff3010', 0.3); K.drawMeteor(S, [14000, 3600, 14000], 1500, 1); } },
    ],
  });

  // FF7.cinema.list in story order (ids from other files that are not listed here keep their place at the end)
  const ORDER = ['opening', 'reactor1_blast', 'midgar_train', 'plate_fall', 'shinra_motors_ad', 'shinra_escape', 'leave_midgar', 'nibel_fire', 'junon_ship', 'gold_saucer', 'seto', 'bronco_escape', 'temple_shrink', 'aeris_death', 'aeris_lake',
    'black_materia', 'weapons_awaken', 'meteor', 'sapphire_weapon', 'highwind_escape', 'ultimate_weapon', 'lifestream_fall', 'rocket_launch', 'rocket_meteor', 'pod_splashdown', 'diamond_weapon', 'sister_ray', 'highwind_night',
    'bizarro_rises', 'safer_rises', 'safer_falls', 'highwind_crater_escape', 'holy', 'ending'];
  CIN.list.sort((a, b) => (ORDER.indexOf(a) < 0 ? 999 : ORDER.indexOf(a)) - (ORDER.indexOf(b) < 0 ? 999 : ORDER.indexOf(b)));
})();
