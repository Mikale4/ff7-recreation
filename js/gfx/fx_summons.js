// Summon-animation effect toolkit (FF7.fxs), used by js/battle/summon_seq.js.
// FF7's summon effects are 3D: textured / vertex-coloured polygons (light columns, domes, rings,
// lightning ribbons, shards) and additive sprite particles, all depth-tested against the models.
// Everything here is drawn through FF7.GL inside the battle's 3D pass. Meshes are vertex-coloured
// white (tinted per draw) so they read correctly without textures; where an original PS1 effect
// texture from FF7.data.fxAtlas has loaded, it is layered on top (X.img / X.frameMesh).
//
//   X.M.<name>()           cached unit meshes: disc, quad, ring, cyl, dome, sphere, glyph, streaks,
//                          rays, shards, bolt(i), stars, sparkle, crescent, spiral, puff, tube ...
//   X.bill(cam,p,sx,sy,r)  camera-facing matrix;  X.orient(p, yAxis, sx, sy, sz, cam) axis matrix
//   X.draw(mesh, mat, o)   GL.draw with effect defaults (unlit, no culling)
//   X.glow / X.overlay / X.bolt / X.beam   one-call draws
//   new X.Particles({...}) simple billboard particle system (update() + draw(cam))
(function () {
  const U = FF7.util, V = FF7.V3, M4 = FF7.M4, MB = FF7.MeshBuilder;
  const PI = Math.PI, S = Math.sin, C = Math.cos;
  const X = FF7.fxs = {};

  // ---------------------------------------------------------------- colours / easing
  X.col = (c, a) => { const k = Array.isArray(c) ? c : FF7.glColor(c); return [k[0], k[1], k[2], a == null ? (k[3] == null ? 1 : k[3]) : a]; };
  X.ease = {
    lin: (k) => k,
    in: (k) => k * k,
    out: (k) => 1 - (1 - k) * (1 - k),
    io: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
    sine: (k) => 0.5 - 0.5 * C(PI * k),
    cubicOut: (k) => 1 - Math.pow(1 - k, 3),
    cubicIn: (k) => k * k * k,
    back: (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  // 0 -> 1 -> 0 envelope over a life (fade in `a` frames, out `b` frames)
  X.env = (t, life, a = 6, b = 10) => U.clamp(Math.min(t / Math.max(1, a), (life - t) / Math.max(1, b)), 0, 1);

  // ---------------------------------------------------------------- mesh helpers
  const memo = (fn) => { let m = null; return () => m || (m = fn()); };
  const W = (a) => [1, 1, 1, a];
  // quad with per-vertex colours (a b c d counter-clockwise)
  function q4(mb, a, b, c, d, ca, cb, cc, cd, uv) {
    mb.tri(a, b, c, [ca, cb, cc], uv ? [uv[0], uv[1], uv[2]] : null);
    mb.tri(a, c, d, [ca, cc, cd], uv ? [uv[0], uv[2], uv[3]] : null);
  }
  X.q4 = q4;
  const unlit = (mb) => mb.build({ unlit: true, cull: false });
  const M = X.M = {};

  // soft radial glow disc in the XY plane (radius 1), alpha 1 at the centre -> 0 at the rim
  M.disc = memo(() => {
    const mb = new MB(), n = 18, p = (r, a) => [C(a) * r, S(a) * r, 0];
    for (let i = 0; i < n; i++) {
      const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2;
      mb.tri([0, 0, 0], p(0.35, a0), p(0.35, a1), [W(1), W(0.7), W(0.7)]);
      q4(mb, p(0.35, a0), p(1, a0), p(1, a1), p(0.35, a1), W(0.7), W(0), W(0), W(0.7));
    }
    return unlit(mb);
  });
  // hard-edged solid disc (flat colour, alpha 1)
  M.solidDisc = memo(() => { const mb = new MB(), n = 20; for (let i = 0; i < n; i++) { const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2; mb.tri([0, 0, 0], [C(a0), S(a0), 0], [C(a1), S(a1), 0], '#ffffff'); } return unlit(mb); });
  // unit quad (-0.5..0.5) in XY with full UVs
  M.quad = memo(() => { const mb = new MB(); q4(mb, [-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0], W(1), W(1), W(1), W(1), [[0, 1], [1, 1], [1, 0], [0, 0]]); return unlit(mb); });
  // quad fading to transparent at the top (y=+0.5)
  M.quadFade = memo(() => { const mb = new MB(); q4(mb, [-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0], W(1), W(1), W(0), W(0), [[0, 1], [1, 1], [1, 0], [0, 0]]); return unlit(mb); });
  // soft ring in the XZ plane: radius 1, band from r=0.82 to 1.0 (bright at 0.92)
  M.ring = memo(() => {
    const mb = new MB(), n = 40, p = (r, a) => [C(a) * r, 0, S(a) * r];
    for (let i = 0; i < n; i++) {
      const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2;
      q4(mb, p(0.82, a0), p(0.92, a0), p(0.92, a1), p(0.82, a1), W(0), W(1), W(1), W(0));
      q4(mb, p(0.92, a0), p(1, a0), p(1, a1), p(0.92, a1), W(1), W(0), W(0), W(1));
    }
    return unlit(mb);
  });
  // wide flat ring (hole radius 0.55) in XZ, alpha fading out to the rim
  M.annulus = memo(() => {
    const mb = new MB(), n = 36, p = (r, a) => [C(a) * r, 0, S(a) * r];
    for (let i = 0; i < n; i++) { const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2; q4(mb, p(0.55, a0), p(1, a0), p(1, a1), p(0.55, a1), W(1), W(0), W(0), W(1)); }
    return unlit(mb);
  });
  // open cylinder, radius 1, y 0..1, alpha 1 at the bottom -> 0 at the top; UV u around, v along
  const cyl = (a0, a1, n = 24) => { const mb = new MB(); for (let i = 0; i < n; i++) { const t0 = i / n * PI * 2, t1 = (i + 1) / n * PI * 2; q4(mb, [C(t0), 0, S(t0)], [C(t1), 0, S(t1)], [C(t1), 1, S(t1)], [C(t0), 1, S(t0)], W(a0), W(a0), W(a1), W(a1), [[i / n, 1], [(i + 1) / n, 1], [(i + 1) / n, 0], [i / n, 0]]); } return unlit(mb); };
  M.cyl = memo(() => cyl(1, 0));
  M.cylSolid = memo(() => cyl(1, 1));
  M.cylMid = memo(() => { const mb = new MB(), n = 24; for (let i = 0; i < n; i++) { const t0 = i / n * PI * 2, t1 = (i + 1) / n * PI * 2; q4(mb, [C(t0), 0, S(t0)], [C(t1), 0, S(t1)], [C(t1), 0.5, S(t1)], [C(t0), 0.5, S(t0)], W(0), W(0), W(1), W(1)); q4(mb, [C(t0), 0.5, S(t0)], [C(t1), 0.5, S(t1)], [C(t1), 1, S(t1)], [C(t0), 1, S(t0)], W(1), W(1), W(0), W(0)); } return unlit(mb); });
  // unit sphere / upper hemisphere with UVs (u around, v top->bottom)
  const sph = (rings, seg, top, alphaFn) => {
    const mb = new MB(), lim = top ? rings / 2 : rings;
    const pt = (i, j) => { const th = j / rings * PI, ph = i / seg * PI * 2; return [S(th) * C(ph), C(th), S(th) * S(ph)]; };
    const al = (j) => W(alphaFn ? alphaFn(j / lim) : 1);
    for (let j = 0; j < lim; j++) for (let i = 0; i < seg; i++) {
      const uv = [[i / seg, j / lim], [(i + 1) / seg, j / lim], [(i + 1) / seg, (j + 1) / lim], [i / seg, (j + 1) / lim]];
      q4(mb, pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1), al(j), al(j), al(j + 1), al(j + 1), uv);
    }
    return mb.build({ unlit: true, cull: false });
  };
  M.sphere = memo(() => sph(12, 20, false));
  M.dome = memo(() => sph(12, 24, true));
  M.domeFade = memo(() => sph(12, 24, true, (k) => 0.15 + k * 0.85));     // transparent crown, solid rim
  M.domeGlow = memo(() => sph(12, 24, true, (k) => 1 - k * 0.9));          // bright crown, soft rim
  // the summon-materia glyph (a trident-like rune with dots) in the XY plane, radius ~1
  M.glyph = memo(() => {
    const mb = new MB();
    const seg = (a, b, w) => { const d = V.norm(V.sub(b, a)), n = [-d[1] * w, d[0] * w, 0]; q4(mb, V.sub(a, n), V.sub(b, n), V.add(b, n), V.add(a, n), W(1), W(1), W(1), W(1)); };
    const poly = (pts, w) => { for (let i = 0; i < pts.length - 1; i++) seg(pts[i], pts[i + 1], w); };
    const dot = (x, y, r) => { const n = 8; for (let i = 0; i < n; i++) { const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2; mb.tri([x, y, 0], [x + C(a0) * r, y + S(a0) * r, 0], [x + C(a1) * r, y + S(a1) * r, 0], W(1)); } };
    poly([[0, -0.72, 0], [0, 0.42, 0]], 0.075);                                       // stem
    poly([[-0.2, -0.72, 0], [0.2, -0.72, 0]], 0.07);                                  // foot
    for (const s of [-1, 1]) {
      const arm = []; for (let i = 0; i <= 6; i++) { const k = i / 6; arm.push([s * 0.52 * S(k * PI * 0.5), -0.12 + 0.6 * (1 - C(k * PI * 0.5)), 0]); }
      poly(arm, 0.07);                                                                 // the cup's arms
      dot(s * 0.52, 0.66, 0.07); dot(s * 0.26, 0.28, 0.055);
    }
    dot(0, 0.62, 0.1);
    return unlit(mb);
  });
  // rising light streaks on a cylinder (summon-cast curtain): radius ~1, height 0..1
  M.streaks = memo(() => {
    const mb = new MB(), R = U.rng(71);
    for (let i = 0; i < 46; i++) {
      const a = R() * PI * 2, r = 0.75 + R() * 0.35, h = 0.3 + R() * 0.7, w = 0.012 + R() * 0.03, y0 = R() * 0.12;
      const c = [C(a) * r, 0, S(a) * r], t = [-S(a) * w, 0, C(a) * w], al = 0.35 + R() * 0.65;
      q4(mb, [c[0] - t[0], y0, c[2] - t[2]], [c[0] + t[0], y0, c[2] + t[2]], [c[0] + t[0], y0 + h, c[2] + t[2]], [c[0] - t[0], y0 + h, c[2] - t[2]], W(al), W(al), W(0), W(0));
    }
    return unlit(mb);
  });
  // radial burst rays in the XY plane (center alpha 1, tips 0)
  const raysMesh = (seed, n, w0, lenMin) => {
    const mb = new MB(), R = U.rng(seed);
    for (let i = 0; i < n; i++) {
      const a = (i + R() * 0.8) / n * PI * 2, w = w0 * (0.4 + R()), L = lenMin + R() * (1 - lenMin);
      mb.tri([0, 0, 0], [C(a - w) * L, S(a - w) * L, 0], [C(a + w) * L, S(a + w) * L, 0], [W(1), W(0), W(0)]);
    }
    return unlit(mb);
  };
  M.rays = memo(() => raysMesh(5, 22, 0.05, 0.5));
  M.raysWide = memo(() => raysMesh(9, 12, 0.12, 0.6));
  M.raysThin = memo(() => raysMesh(13, 48, 0.012, 0.3));
  // speed lines: thin streaks radiating in a ring (from r=0.35 to 1) - tunnel / charge lines
  M.speedLines = memo(() => {
    const mb = new MB(), R = U.rng(29);
    for (let i = 0; i < 60; i++) {
      const a = R() * PI * 2, r0 = 0.3 + R() * 0.4, r1 = r0 + 0.2 + R() * 0.5, w = 0.004 + R() * 0.008;
      const d = [C(a), S(a), 0], n = [-S(a) * w, C(a) * w, 0];
      q4(mb, V.sub(V.scale(d, r0), n), V.add(V.scale(d, r0), n), V.add(V.scale(d, r1), n), V.sub(V.scale(d, r1), n), W(0), W(0), W(1), W(1));
    }
    return unlit(mb);
  });
  // shards: thin random tetrahedra inside the unit sphere (ice, crystal, rock debris)
  const shardsMesh = (seed, n, len, spread, up) => {
    const mb = new MB(), R = U.rng(seed);
    for (let i = 0; i < n; i++) {
      const base = [(R() - 0.5) * 2 * spread, up ? R() * 0.2 : (R() - 0.5) * 2 * spread, (R() - 0.5) * 2 * spread];
      const dir = V.norm(up ? [(R() - 0.5) * 0.9, 1, (R() - 0.5) * 0.9] : [R() - 0.5, R() - 0.5, R() - 0.5]);
      const L = len * (0.4 + R() * 0.8), w = L * (0.12 + R() * 0.14);
      const tip = V.add(base, V.scale(dir, L));
      const t1 = V.norm(V.cross(dir, Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), t2 = V.cross(dir, t1);
      const b0 = V.add(base, V.scale(t1, w)), b1 = V.add(base, V.add(V.scale(t1, -w * 0.5), V.scale(t2, w * 0.87))), b2 = V.add(base, V.add(V.scale(t1, -w * 0.5), V.scale(t2, -w * 0.87)));
      const k = 0.7 + R() * 0.3, c1 = [k, k, k, 1], c2 = [k * 0.75, k * 0.8, k * 0.9, 1], c3 = [1, 1, 1, 1];
      mb.tri(b0, b1, tip, [c1, c1, c3]); mb.tri(b1, b2, tip, [c2, c2, c3]); mb.tri(b2, b0, tip, [c1, c2, c3]); mb.tri(b0, b2, b1, c2);
    }
    return mb.build({ unlit: true, cull: false });
  };
  M.shards = memo(() => shardsMesh(3, 40, 0.5, 1, false));
  M.spikes = memo(() => shardsMesh(8, 36, 1.0, 1, true));
  M.shard1 = memo(() => shardsMesh(17, 1, 1, 0, false));
  // lit rock chunk (irregular box), vertex-coloured grey-brown (tint to recolour)
  M.rock = memo(() => {
    const mb = new MB(), R = U.rng(44);
    const pts = []; for (let i = 0; i < 8; i++) pts.push([(i & 1 ? 1 : -1) * (0.4 + R() * 0.2), (i & 2 ? 1 : -1) * (0.35 + R() * 0.2), (i & 4 ? 1 : -1) * (0.4 + R() * 0.2)]);
    const f = (a, b, c, d, k) => { const col = [0.62 * k, 0.55 * k, 0.45 * k, 1]; mb.tri(pts[a], pts[b], pts[c], col); mb.tri(pts[a], pts[c], pts[d], col); };
    f(0, 1, 3, 2, 0.7); f(4, 6, 7, 5, 1); f(0, 4, 5, 1, 0.8); f(2, 3, 7, 6, 1.05); f(0, 2, 6, 4, 0.9); f(1, 5, 7, 3, 0.85);
    return mb.build({ cull: false });
  });
  // lightning bolts: jagged ribbons from (0,0) up to (0,1) with a couple of branches (glow + core)
  const boltMesh = (seed) => {
    const mb = new MB(), R = U.rng(seed);
    const path = (x0, y0, x1, y1, n, jit) => { const p = []; for (let i = 0; i <= n; i++) { const k = i / n; p.push([U.lerp(x0, x1, k) + (i && i < n ? (R() - 0.5) * jit : 0), U.lerp(y0, y1, k), 0]); } return p; };
    const rib = (p, w, a) => { for (let i = 0; i < p.length - 1; i++) { const d = V.norm(V.sub(p[i + 1], p[i])), nn = [-d[1] * w, d[0] * w, 0]; q4(mb, V.sub(p[i], nn), V.add(p[i], nn), V.add(p[i + 1], nn), V.sub(p[i + 1], nn), W(a), W(a), W(a), W(a)); } };
    const main = path(0, 0, 0, 1, 12, 0.16);
    const all = [main];
    for (let b = 0; b < 3; b++) { const i = 2 + Math.floor(R() * 8), s = main[i]; const e = [s[0] + (R() - 0.5) * 0.5, s[1] + 0.12 + R() * 0.25, 0]; all.push(path(s[0], s[1], e[0], e[1], 4, 0.08)); }
    all.forEach((p, i) => rib(p, i ? 0.03 : 0.05, 0.28));
    all.forEach((p, i) => rib(p, i ? 0.007 : 0.013, 1));
    return unlit(mb);
  };
  const BOLTS = [];
  M.bolt = (i) => BOLTS[i % 6] || (BOLTS[i % 6] = boltMesh(101 + (i % 6) * 17));
  // starfield: small quads on the unit sphere facing the centre
  M.stars = memo(() => {
    const mb = new MB(), R = U.rng(7);
    for (let i = 0; i < 900; i++) {
      const u = R() * 2 - 1, th = R() * PI * 2, r = Math.sqrt(1 - u * u), p = [r * C(th), u, r * S(th)];
      const t1 = V.norm(V.cross(p, Math.abs(p[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), t2 = V.cross(p, t1), s = 0.0015 + R() * R() * 0.004;
      const k = 0.4 + R() * 0.6, c = [k * (0.8 + R() * 0.2), k * (0.85 + R() * 0.15), k, 1];
      q4(mb, V.add(p, V.scale(t1, -s)), V.add(p, V.scale(t2, -s)), V.add(p, V.scale(t1, s)), V.add(p, V.scale(t2, s)), c, c, c, c);
    }
    return unlit(mb);
  });
  // four-pointed sparkle (cross flare) in XY
  M.sparkle = memo(() => {
    const mb = new MB();
    for (let i = 0; i < 4; i++) { const a = i * PI / 2, w = 0.07; mb.tri([0, 0, 0], [C(a - w), S(a - w), 0].map(v => v * 0.2), [C(a), S(a), 0], [W(1), W(0.8), W(0)]); mb.tri([0, 0, 0], [C(a), S(a), 0], [C(a + w), S(a + w), 0].map(v => v * 0.2), [W(1), W(0), W(0.8)]); }
    const n = 10; for (let i = 0; i < n; i++) { const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2; mb.tri([0, 0, 0], [C(a0) * 0.25, S(a0) * 0.25, 0], [C(a1) * 0.25, S(a1) * 0.25, 0], [W(1), W(0), W(0)]); }
    return unlit(mb);
  });
  // 5-pointed star (comic "dizzy" stars)
  M.star5 = memo(() => { const mb = new MB(); for (let i = 0; i < 5; i++) { const a = PI / 2 + i * PI * 2 / 5, b1 = a - PI / 5, b2 = a + PI / 5; mb.tri([0, 0, 0], [C(b1) * 0.42, S(b1) * 0.42, 0], [C(a), S(a), 0], W(1)); mb.tri([0, 0, 0], [C(a), S(a), 0], [C(b2) * 0.42, S(b2) * 0.42, 0], W(1)); } return unlit(mb); });
  // crescent slash arc in the XZ plane (sweep through +z), thick in the middle
  M.crescent = memo(() => {
    const mb = new MB(), n = 24;
    for (let i = 0; i < n; i++) {
      const k0 = i / n, k1 = (i + 1) / n, a0 = (k0 - 0.5) * PI * 1.1, a1 = (k1 - 0.5) * PI * 1.1;
      const w0 = S(k0 * PI) * 0.22, w1 = S(k1 * PI) * 0.22;
      q4(mb, [S(a0) * (1 - w0), 0, C(a0) * (1 - w0)], [S(a0), 0, C(a0)], [S(a1), 0, C(a1)], [S(a1) * (1 - w1), 0, C(a1) * (1 - w1)], W(0), W(k0), W(k1), W(0));
    }
    return unlit(mb);
  });
  // flat spiral arms (vortex) in the XZ plane
  M.spiral = memo(() => {
    const mb = new MB(), arms = 5, n = 20;
    for (let a = 0; a < arms; a++) for (let i = 0; i < n; i++) {
      const k0 = i / n, k1 = (i + 1) / n, o = a / arms * PI * 2;
      const p = (k, w) => { const r = 0.08 + k * 0.92, th = o + k * PI * 1.6 + w; return [C(th) * r, 0, S(th) * r]; };
      const w0 = 0.25 * (1 - k0) + 0.05, w1 = 0.25 * (1 - k1) + 0.05;
      q4(mb, p(k0, -w0), p(k0, w0), p(k1, w1), p(k1, -w1), W(1 - k0 * 0.8), W(1 - k0 * 0.8), W(1 - k1 * 0.8), W(1 - k1 * 0.8));
    }
    return unlit(mb);
  });
  // cloud puff: lumpy disc with soft edge (alpha-blended billboards build cloud masses)
  M.puff = memo(() => {
    const mb = new MB(), R = U.rng(12), n = 14;
    const rr = []; for (let i = 0; i < n; i++) rr.push(0.75 + R() * 0.25);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2, r0 = rr[i], r1 = rr[(i + 1) % n];
      mb.tri([0, 0, 0], [C(a0) * r0 * 0.6, S(a0) * r0 * 0.6, 0], [C(a1) * r1 * 0.6, S(a1) * r1 * 0.6, 0], [W(1), W(0.9), W(0.9)]);
      q4(mb, [C(a0) * r0 * 0.6, S(a0) * r0 * 0.6, 0], [C(a0) * r0, S(a0) * r0, 0], [C(a1) * r1, S(a1) * r1, 0], [C(a1) * r1 * 0.6, S(a1) * r1 * 0.6, 0], W(0.9), W(0), W(0), W(0.9));
    }
    return unlit(mb);
  });
  // twisted tube (tornado / water spout): radius 1 at the top narrowing to 0.35 at the bottom, y 0..1
  M.funnel = memo(() => {
    const mb = new MB(), n = 20, h = 10;
    for (let j = 0; j < h; j++) for (let i = 0; i < n; i++) {
      const y0 = j / h, y1 = (j + 1) / h, r0 = 0.35 + 0.65 * y0 * y0, r1 = 0.35 + 0.65 * y1 * y1, tw = 2.4;
      const p = (k, y, r) => { const a = k / n * PI * 2 + y * tw; return [C(a) * r, y, S(a) * r]; };
      const al = (i % 3 === 0 ? 1 : 0.45), a0 = al * (0.3 + 0.7 * S(y0 * PI)), a1 = al * (0.3 + 0.7 * S(y1 * PI));
      q4(mb, p(i, y0, r0), p(i + 1, y0, r0), p(i + 1, y1, r1), p(i, y1, r1), W(a0), W(a0), W(a1), W(a1), [[i / n, 1 - y0], [(i + 1) / n, 1 - y0], [(i + 1) / n, 1 - y1], [i / n, 1 - y1]]);
    }
    return unlit(mb);
  });
  // flat grid in XZ (-1..1) with UV per cell covering the whole texture (tiling without REPEAT)
  const GRIDS = {};
  X.grid = (n, colFn) => {
    if (!colFn && GRIDS[n]) return GRIDS[n];
    const mb = new MB();
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x0 = -1 + 2 * i / n, x1 = -1 + 2 * (i + 1) / n, z0 = -1 + 2 * j / n, z1 = -1 + 2 * (j + 1) / n;
      const c = (x, z) => colFn ? colFn(x, z) : W(1);
      q4(mb, [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], c(x0, z1), c(x1, z1), c(x1, z0), c(x0, z0), [[0, 1], [1, 1], [1, 0], [0, 0]]);
    }
    const m = mb.build({ unlit: true, cull: false });
    if (!colFn) GRIDS[n] = m;
    return m;
  };
  // sky dome (inverted sphere) with a vertical gradient: stops [[y(-1..1), '#hex'], ...]
  const skies = {};
  X.skyDome = (key, stops, seg = 24, rings = 14) => {
    if (skies[key]) return skies[key];
    const at = (y) => { for (let i = 0; i < stops.length - 1; i++) if (y <= stops[i + 1][0]) { const k = (y - stops[i][0]) / Math.max(1e-6, stops[i + 1][0] - stops[i][0]); const a = X.col(stops[i][1]), b = X.col(stops[i + 1][1]); return [0, 1, 2, 3].map(q => U.lerp(a[q], b[q], U.clamp(k, 0, 1))); } return X.col(stops[stops.length - 1][1]); };
    const mb = new MB(), pt = (i, j) => { const th = j / rings * PI, ph = i / seg * PI * 2; return [S(th) * C(ph), C(th), S(th) * S(ph)]; };
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
      q4(mb, a, d, c, b, at(a[1]), at(d[1]), at(c[1]), at(b[1]));
    }
    return (skies[key] = mb.build({ unlit: true, cull: false }));
  };

  // ---------------------------------------------------------------- matrices
  // camera basis: f forward, r right, u up
  X.basis = (cam) => {
    const f = V.norm(V.sub(cam.target, cam.eye));
    let r = V.cross(f, [0, 1, 0]); if (V.len(r) < 1e-4) r = [1, 0, 0]; r = V.norm(r);
    const u = V.cross(r, f);
    return { f, r, u, eye: cam.eye };
  };
  const mat = (o, x, y, z, p) => { o[0] = x[0]; o[1] = x[1]; o[2] = x[2]; o[3] = 0; o[4] = y[0]; o[5] = y[1]; o[6] = y[2]; o[7] = 0; o[8] = z[0]; o[9] = z[1]; o[10] = z[2]; o[11] = 0; o[12] = p[0]; o[13] = p[1]; o[14] = p[2]; o[15] = 1; return o; };
  X.axes = (x, y, z, p) => mat(M4.create(), x, y, z, p);
  // camera-facing matrix at p, size sx*sy, rolled by `roll` radians
  X.bill = (cam, p, sx, sy, roll = 0) => {
    const B = cam._basis || X.basis(cam);
    const cr = C(roll), sr = S(roll);
    const r = V.add(V.scale(B.r, cr), V.scale(B.u, sr)), u = V.add(V.scale(B.u, cr), V.scale(B.r, -sr));
    return mat(M4.create(), V.scale(r, sx), V.scale(u, sy == null ? sx : sy), V.scale(B.f, -1), p);
  };
  // matrix whose Y axis runs along `yAxis` (length = |yAxis| * sy), X/Z radius sx/sz; if cam is given the
  // XY plane is turned to face the camera (ribbons), otherwise an arbitrary stable frame is used
  X.orient = (p, yAxis, sx, sy = 1, sz, cam) => {
    const L = V.len(yAxis) || 1e-6, y = V.scale(yAxis, 1 / L);
    let x;
    if (cam) { const B = cam._basis || X.basis(cam); x = V.cross(y, B.f); if (V.len(x) < 1e-4) x = B.r; }
    else x = V.cross(y, Math.abs(y[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0]);
    x = V.norm(x);
    const z = V.cross(x, y);
    return mat(M4.create(), V.scale(x, sx), V.scale(y, L * sy), V.scale(z, sz == null ? sx : sz), p);
  };
  X.trs = (p, r, s) => M4.trs(M4.create(), p, r || [0, 0, 0], Array.isArray(s) ? s : [s == null ? 1 : s, s == null ? 1 : s, s == null ? 1 : s]);

  // ---------------------------------------------------------------- drawing
  // o: { color, alpha, blend ('add' default | 'alpha' | null for opaque), tex, noDepth, cull, lit }
  X.draw = (mesh, m, o = {}) => {
    if (!mesh) return;
    const c = o.color != null ? X.col(o.color) : [1, 1, 1, 1];
    const a = (o.alpha == null ? 1 : o.alpha) * c[3];
    if (a <= 0.003 && o.blend !== null) return;
    FF7.GL.draw(mesh, m, { tint: [c[0], c[1], c[2], a], unlit: !o.lit, blend: o.blend === undefined ? 'add' : o.blend, cull: o.cull === undefined ? false : o.cull, noDepth: o.noDepth, tex: o.tex || undefined, add: o.add, alphaTest: o.alphaTest });
  };
  X.glow = (cam, p, size, color, alpha = 1, o = {}) => X.draw(o.mesh || M.disc(), X.bill(cam, p, size, size * (o.aspect || 1), o.roll || 0), Object.assign({ color, alpha }, o));
  // full-screen overlay (drawn over everything in the 3D view; the HUD stays on top)
  X.overlay = (cam, color, alpha, blend = 'alpha') => {
    if (alpha <= 0.003) return;
    const B = cam._basis || X.basis(cam), d = 0.3, h = 2 * d * Math.tan((cam.fov || 40) * PI / 360) * 1.3, w = h * FF7.W / FF7.H * 1.3;
    X.draw(M.quad(), mat(M4.create(), V.scale(B.r, w), V.scale(B.u, h), V.scale(B.f, -1), V.add(B.eye, V.scale(B.f, d))), { color, alpha, blend, noDepth: true });
  };
  // lightning bolt between two points (camera-facing ribbon); variant picks one of the prebuilt bolts
  X.bolt = (cam, from, to, variant, color = '#c8d8ff', alpha = 1, widthK = 1) => {
    const ax = V.sub(to, from), L = V.len(ax);
    X.draw(M.bolt(variant), X.orient(from, ax, L * widthK, 1, L * widthK, cam), { color, alpha });
  };
  // glowing beam / column between two points (cylinder mesh radius r)
  X.beam = (from, to, r, color, alpha = 1, mesh, o = {}) => X.draw(mesh || M.cylSolid(), X.orient(from, V.sub(to, from), r, 1, r), Object.assign({ color, alpha }, o));

  // ---------------------------------------------------------------- original FF7 effect textures
  // X.useAtlas = false turns every atlas lookup off, so the sequences fall back to their procedural
  // meshes / X.ptex textures (the atlas PNGs are PS1 texture dumps from references/, study-only).
  X.useAtlas = false;
  const ATL = () => (FF7.data && FF7.data.fxAtlas) || {};
  X.sheet = (key) => (X.useAtlas === false ? null : ATL()[key] || null);
  X.img = (key) => { const s = X.sheet(key); if (!s || !FF7.render || !FF7.render.getImage) return null; try { return FF7.render.getImage(s.src) || null; } catch (e) { return null; } };
  X.preload = (keys) => keys.forEach(k => X.img(k));
  const fcache = {};
  // quad mesh (-0.5..0.5, aspect-corrected to the frame: height 1) mapped to frame `fi` of an atlas sheet
  X.frameMesh = (key, fi = 0, fade) => {
    const id = key + '#' + fi + (fade ? 'f' : '');
    if (fcache[id]) return fcache[id];
    const s = X.sheet(key); if (!s || !s.frames || !s.frames.length) return null;
    const f = s.frames[Math.min(s.frames.length - 1, Math.max(0, fi))];
    const u0 = f[0] / s.w, v0 = f[1] / s.h, u1 = (f[0] + f[2]) / s.w, v1 = (f[1] + f[3]) / s.h, asp = f[2] / Math.max(1, f[3]);
    const mb = new MB();
    q4(mb, [-0.5 * asp, -0.5, 0], [0.5 * asp, -0.5, 0], [0.5 * asp, 0.5, 0], [-0.5 * asp, 0.5, 0], W(1), W(1), W(fade ? 0 : 1), W(fade ? 0 : 1), [[u0, v1], [u1, v1], [u1, v0], [u0, v0]]);
    const m = unlit(mb); m.aspect = asp;
    return (fcache[id] = m);
  };
  // like frameMesh, but a 4x4 grid whose rim vertices are transparent (no hard texture-rect edges)
  X.frameMeshSoft = (key, fi = 0) => {
    const id = key + '#' + fi + 's';
    if (fcache[id]) return fcache[id];
    const s = X.sheet(key); if (!s || !s.frames || !s.frames.length) return null;
    const f = s.frames[Math.min(s.frames.length - 1, Math.max(0, fi))];
    const asp = f[2] / Math.max(1, f[3]), n = 4, mb = new MB();
    const P = (i, j) => [(-0.5 + i / n) * asp, -0.5 + j / n, 0], UV = (i, j) => [(f[0] + f[2] * i / n) / s.w, (f[1] + f[3] * (1 - j / n)) / s.h];
    const A = (i, j) => W(i === 0 || j === 0 || i === n || j === n ? 0 : 1);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) q4(mb, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), A(i, j), A(i + 1, j), A(i + 1, j + 1), A(i, j + 1), [UV(i, j), UV(i + 1, j), UV(i + 1, j + 1), UV(i, j + 1)]);
    const m = unlit(mb); m.aspect = asp;
    return (fcache[id] = m);
  };
  // disc (radius 1, XY plane) textured with frame `fi` stretched over it; alpha 1 inside, 0 at the rim
  X.frameDisc = (key, fi = 0, n = 28) => {
    const id = key + '#' + fi + 'd';
    if (fcache[id]) return fcache[id];
    const s = X.sheet(key); if (!s || !s.frames || !s.frames.length) return null;
    const f = s.frames[Math.min(s.frames.length - 1, Math.max(0, fi))], mb = new MB();
    const P = (r, a) => [C(a) * r, S(a) * r, 0], UV = (r, a) => [(f[0] + f[2] * (0.5 + C(a) * r * 0.5)) / s.w, (f[1] + f[3] * (0.5 - S(a) * r * 0.5)) / s.h];
    for (let i = 0; i < n; i++) {
      const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2;
      mb.tri([0, 0, 0], P(0.9, a0), P(0.9, a1), [W(1), W(1), W(1)], [UV(0, 0), UV(0.9, a0), UV(0.9, a1)]);
      q4(mb, P(0.9, a0), P(1, a0), P(1, a1), P(0.9, a1), W(1), W(0), W(0), W(1), [UV(0.9, a0), UV(1, a0), UV(1, a1), UV(0.9, a1)]);
    }
    return (fcache[id] = unlit(mb));
  };
  // re-map a unit mesh's UVs (0..1) into frame `fi` of an atlas sheet (for textured domes/cylinders)
  X.frameUV = (mesh, key, fi = 0) => {
    const id = key + '#' + fi + '@' + (mesh._uvid || (mesh._uvid = ++X._uvn));
    if (fcache[id]) return fcache[id];
    const s = X.sheet(key); if (!s) return mesh;
    const f = s.frames[Math.min(s.frames.length - 1, fi)];
    const out = Object.assign({}, mesh, { uv: new Float32Array(mesh.uv), gl: null });
    for (let i = 0; i < out.count; i++) { out.uv[i * 2] = (f[0] + mesh.uv[i * 2] * f[2]) / s.w; out.uv[i * 2 + 1] = (f[1] + mesh.uv[i * 2 + 1] * f[3]) / s.h; }
    return (fcache[id] = out);
  };
  X._uvn = 0;
  // draw a textured sprite frame when the sheet is loaded, else a fallback glow
  X.sprite = (cam, key, fi, p, size, color, alpha = 1, o = {}) => {
    const img = X.img(key), m = img && X.frameMesh(key, fi);
    if (m) X.draw(m, X.bill(cam, p, size, size, o.roll || 0), Object.assign({ color, alpha, tex: img }, o));
    else if (o.fallback !== false) X.draw(o.fallbackMesh || M.disc(), X.bill(cam, p, size * 0.6, size * 0.6, o.roll || 0), Object.assign({ color, alpha }, o));
  };

  // ---------------------------------------------------------------- procedural textures
  // X.ptex(name): pixel-buffer textures (FF7.tex format { isTex, w, h, data }) generated in code and
  // cached. They upload to WebGL like canvases and also render in the headless tools. RGB holds the
  // colour at full strength and A the coverage, so additive and alpha blending both read correctly.
  const hash2 = (x, y, s) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 982451653); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // value noise (per > 0: periodic in x with that period)
  X.noise = (x, y, s = 0, per = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const w = (a) => (per ? ((a % per) + per) % per : a);
    const a = hash2(w(xi), yi, s), b = hash2(w(xi + 1), yi, s), c = hash2(w(xi), yi + 1, s), d = hash2(w(xi + 1), yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  X.fbm = (x, y, s = 0, oct = 4, per = 0) => { let t = 0, amp = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { t += amp * X.noise(x * f, y * f, s + i * 31, per * f); n += amp; amp *= 0.5; f *= 2; } return t / n; };
  const cl01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const sstep = (a, b, v) => { const k = cl01((v - a) / (b - a)); return k * k * (3 - 2 * k); };
  X.mkTex = (w, h, fn) => {
    const t = { isTex: true, w, h, data: new Uint8ClampedArray(w * h * 4), procedural: true };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = fn((x + 0.5) / w, (y + 0.5) / h), i = (y * w + x) * 4;
      t.data[i] = c[0] * 255; t.data[i + 1] = c[1] * 255; t.data[i + 2] = c[2] * 255; t.data[i + 3] = c[3] * 255;
    }
    return t;
  };
  // segments [[x0,y0,x1,y1,width,strength]] (texture px) -> coverage buffer
  const strokeBuf = (w, h, segs) => {
    const buf = new Float32Array(w * h);
    for (const [x0, y0, x1, y1, wd, st] of segs) {
      const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, r = wd / 2 + 1;
      for (let y = Math.max(0, Math.floor(Math.min(y0, y1) - r)); y <= Math.min(h - 1, Math.ceil(Math.max(y0, y1) + r)); y++) {
        for (let x = Math.max(0, Math.floor(Math.min(x0, x1) - r)); x <= Math.min(w - 1, Math.ceil(Math.max(x0, x1) + r)); x++) {
          const k = cl01(((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / L2), qx = x0 + dx * k - x - 0.5, qy = y0 + dy * k - y - 0.5;
          const cov = cl01(wd / 2 + 0.5 - Math.sqrt(qx * qx + qy * qy)) * (st == null ? 1 : st);
          if (cov > buf[y * w + x]) buf[y * w + x] = cov;
        }
      }
    }
    return buf;
  };
  // random-walk cracks from the centre with branches (texture px segments)
  const crackSegs = (w, seed, n, reach) => {
    const R = U.rng(seed), segs = [];
    const walk = (x, y, a, len, wd, depth) => {
      const steps = Math.max(2, Math.round(len / 6));
      for (let i = 0; i < steps; i++) {
        a += (R() - 0.5) * 0.9;
        const nx = x + C(a) * len / steps, ny = y + S(a) * len / steps, k = 1 - i / steps;
        segs.push([x, y, nx, ny, Math.max(0.8, wd * (0.45 + 0.55 * k)), 1]);
        if (depth < 2 && R() < 0.22) walk(nx, ny, a + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.6), len * (0.3 + R() * 0.3), wd * 0.6, depth + 1);
        x = nx; y = ny;
      }
    };
    for (let i = 0; i < n; i++) walk(w / 2, w / 2, (i + R() * 0.7) / n * PI * 2, w * reach * (0.7 + R() * 0.3), 3.2, 0);
    // a ring of short connecting cracks (the ground breaking into slabs)
    for (let i = 0; i < n * 2; i++) { const a0 = R() * PI * 2, r0 = w * (0.18 + R() * 0.2), a1 = a0 + 0.25 + R() * 0.35; segs.push([w / 2 + C(a0) * r0, w / 2 + S(a0) * r0, w / 2 + C(a1) * r0 * 1.1, w / 2 + S(a1) * r0 * 1.1, 1.6, 0.8]); }
    return segs;
  };
  const PTEX = {
    // flame tongue (baked fire ramp: white core -> yellow -> orange -> red rim), 4 variants
    flame: (v) => X.mkTex(48, 96, (u, vv) => {
      const y = 1 - vv, s = 11 + v * 7;
      const sway = (X.fbm(y * 2.4, 0.5, s, 3) - 0.5) * 0.42 * y;
      const wid = 0.36 * Math.pow(Math.max(0, 1 - y), 0.6) * Math.min(1, (y + 0.06) * 5);
      const n = X.fbm(u * 5, y * 4.5, s + 3, 3);
      let I = cl01(1 - Math.abs(u - 0.5 - sway) / Math.max(0.001, wid * (0.7 + n * 0.7)));
      I *= cl01(1.2 - y * 0.95 + (n - 0.5) * 0.6);
      I = Math.pow(I, 0.8);
      return [cl01(I * 2.4), cl01(I * 1.7 - 0.2), cl01(I * 2.2 - 1.45), cl01(I * 1.9)];
    }),
    // white soft lumpy puff (smoke, mist, dust, clouds; tint when drawing)
    puff: () => X.mkTex(64, 64, (u, v) => { const dx = u - 0.5, dy = v - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2, n = X.fbm(u * 4, v * 4, 5, 4); const a = cl01((1 - r) * 1.6 * (0.55 + n * 0.9) - 0.1); return [1, 1, 1, a * a * (3 - 2 * a)]; }),
    // chunky "pixel" cloud (FF7's Bio / smoke clouds are blocky); drawn with nearest filtering
    puffBlock: () => X.mkTex(16, 16, (u, v) => { const dx = u - 0.5, dy = v - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2, n = hash2(Math.floor(u * 16), Math.floor(v * 16), 9); const a = r < 0.95 && n > r * 0.75 ? 0.35 + 0.65 * (1 - r) : 0; return [0.75 + n * 0.25, 0.75 + n * 0.25, 0.75 + n * 0.25, a]; }),
    // bubble: bright rim + faint fill + highlight
    bubble: () => X.mkTex(32, 32, (u, v) => { const dx = u - 0.5, dy = v - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2; const rim = Math.exp(-Math.pow((r - 0.86) / 0.09, 2)); const hl = Math.exp(-(Math.pow(u - 0.34, 2) + Math.pow(v - 0.32, 2)) / 0.006); const a = r > 1 ? 0 : cl01(0.12 + rim * 0.9 + hl); return [1, 1, 1, a]; }),
    // ground cracks (dark lines, transparent elsewhere) + the glowing lava variant
    crack: () => { const w = 128, b = strokeBuf(w, w, crackSegs(w, 23, 8, 0.48)); let i = 0; return X.mkTex(w, w, () => { const a = b[i++]; return [0.16, 0.12, 0.09, a]; }); },
    crackGlow: () => { const w = 128, b = strokeBuf(w, w, crackSegs(w, 23, 8, 0.48).map(s => [s[0], s[1], s[2], s[3], s[4] * 2.2, s[5]])); let i = 0; return X.mkTex(w, w, () => { const a = b[i++]; return [1, 0.55 + a * 0.35, 0.15 + a * 0.3, a]; }); },
    // swirled bands (barrier shell; periodic in u for sphere UVs)
    swirl: () => X.mkTex(64, 64, (u, v) => { const n = X.fbm(u * 4, v * 3, 41, 3, 4); const band = 0.5 + 0.5 * Math.sin((u * 3 + v * 1.6 + n * 0.8) * PI * 2); const a = cl01(Math.pow(band, 3) * 0.9 + n * 0.25); return [0.7 + band * 0.3, 0.85 + band * 0.15, 1, a]; }),
    // limit aura: rising flame tongues (periodic in u; v=0 top) - white/yellow base -> orange tips
    aura: () => X.mkTex(64, 64, (u, v) => {
      const y = 1 - v, n = X.fbm(u * 6, y * 2, 77, 3, 6);
      const tri = Math.abs(((u * 7 + n * 0.6) % 1) - 0.5) * 2;               // zig-zag tongues
      const top = 0.42 + 0.46 * (1 - tri) + (n - 0.5) * 0.25;
      const a = cl01((top - y) * 6) * cl01(0.35 + (1 - y) * 0.9);
      const k = cl01(y / Math.max(0.05, top));
      return [1, cl01(1 - k * 0.55), cl01(0.75 - k * 1.1), a];
    }),
    // white feather (Life / Pulse of Life)
    feather: () => X.mkTex(32, 64, (u, v) => { const y = v, x = (u - 0.5) * 2, wid = Math.sin(Math.min(1, y * 1.08) * PI) * 0.8 * (1 - y * 0.25); const vane = cl01((wid - Math.abs(x)) * 6) * (0.75 + 0.25 * Math.sin(y * 60 + x * 8)); const shaft = cl01(1 - Math.abs(x) * 14) * (y < 0.97 ? 1 : 0); return [1, 1, 0.96, cl01(Math.max(vane * 0.85, shaft))]; }),
    // water caustics (periodic in u)
    water: () => X.mkTex(64, 64, (u, v) => { const n = X.fbm(u * 4, v * 4, 61, 4, 4), m = X.fbm(u * 8, v * 8 + 3, 62, 3, 8); const l = Math.exp(-Math.pow((n - 0.5) / 0.05, 2)) * 0.8 + Math.exp(-Math.pow((m - 0.5) / 0.06, 2)) * 0.4; return [0.55 + l * 0.45, 0.75 + l * 0.25, 1, cl01(0.35 + l)]; }),
    // soft round glow with a hot core (fire balls, magic orbs)
    orb: () => X.mkTex(32, 32, (u, v) => { const r = Math.sqrt(Math.pow(u - 0.5, 2) + Math.pow(v - 0.5, 2)) * 2; const a = cl01(1 - r); return [1, 1, 1, a * a]; }),
  };
  const PT = {};
  X.ptex = (name) => { if (PT[name]) return PT[name]; const m = /^([a-zA-Z]+)(\d*)$/.exec(name); const f = m && PTEX[m[1]]; return f ? (PT[name] = f(+(m[2] || 0))) : null; };
  // unit quad (as M.quad) sampled with nearest filtering (blocky pixel sprites)
  M.quadN = memo(() => { const mb = new MB(); q4(mb, [-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0], W(1), W(1), W(1), W(1), [[0, 1], [1, 1], [1, 0], [0, 0]]); const m = unlit(mb); m.texOpts = { nearest: true }; return m; });
  // ice-crystal bloom: 8 rhombus petals (XY plane, radius 1), translucent body, bright edges
  M.petals = memo(() => {
    const mb = new MB(), n = 8;
    for (let i = 0; i < n; i++) {
      const a = i / n * PI * 2, d = [C(a), S(a), 0], t = [-S(a), C(a), 0];
      const c0 = [0, 0, 0], tip = V.scale(d, 1), m1 = V.add(V.scale(d, 0.46), V.scale(t, 0.2)), m2 = V.add(V.scale(d, 0.46), V.scale(t, -0.2));
      mb.tri(c0, m2, tip, [W(0.25), W(0.9), W(0.6)]); mb.tri(c0, tip, m1, [W(0.25), W(0.6), W(0.9)]);
    }
    return unlit(mb);
  });
  // just the petal outlines (additive glints)
  M.petalEdges = memo(() => {
    const mb = new MB(), n = 8, e = (a, b, w) => { const d = V.norm(V.sub(b, a)), nn = [-d[1] * w, d[0] * w, 0]; q4(mb, V.sub(a, nn), V.sub(b, nn), V.add(b, nn), V.add(a, nn), W(1), W(0.7), W(0.7), W(1)); };
    for (let i = 0; i < n; i++) {
      const a = i / n * PI * 2, d = [C(a), S(a), 0], t = [-S(a), C(a), 0];
      const tip = d, m1 = V.add(V.scale(d, 0.46), V.scale(t, 0.2)), m2 = V.add(V.scale(d, 0.46), V.scale(t, -0.2));
      e([0, 0, 0], m1, 0.012); e(m1, tip, 0.012); e([0, 0, 0], m2, 0.012); e(m2, tip, 0.012); e([0, 0, 0], tip, 0.008);
    }
    return unlit(mb);
  });
  // crystal cluster: hexagonal prisms with pointed tips fanning up from the ground (radius ~1, height ~1)
  const crystalMesh = (seed, n, spread) => {
    const mb = new MB(), R = U.rng(seed);
    for (let i = 0; i < n; i++) {
      const a = i === 0 ? 0 : R() * PI * 2, lean = i === 0 ? 0 : 0.25 + R() * spread, h = i === 0 ? 1 : 0.45 + R() * 0.45, r = (i === 0 ? 0.2 : 0.09 + R() * 0.08);
      mb.push(); mb.translate(C(a) * (i ? 0.18 : 0), 0, S(a) * (i ? 0.18 : 0)); mb.rotate(S(a) * lean, 0, -C(a) * lean);
      const k = 0.8 + R() * 0.2, side = [0.75 * k, 0.86 * k, 1, 0.55], top = [0.95, 0.98, 1, 0.8];
      mb.prism(0, 0, 0, r, r, h * 0.72, 6, side, false, false, false);
      mb.prism(0, h * 0.72, 0, r, 0, h * 0.28, 6, top, false, false, false);
      mb.pop();
    }
    return mb.build({ unlit: true, cull: false });
  };
  M.crystal = memo(() => crystalMesh(31, 9, 0.7));
  M.crystalBig = memo(() => crystalMesh(57, 15, 0.9));
  // "Z" glyph with a dark rim (Sleep), XY plane, ~1 unit
  M.zGlyph = memo(() => {
    const mb = new MB(), pts = [[-0.5, 0.5], [0.5, 0.5], [0.5, 0.3], [-0.12, -0.3], [0.5, -0.3], [0.5, -0.5], [-0.5, -0.5], [-0.5, -0.3], [0.12, 0.3], [-0.5, 0.3]];
    const poly = (s, z, col) => { const P = pts.map(p => [p[0] * s, p[1] * s, z]); const tris = [[0, 1, 2], [0, 2, 9], [9, 2, 8], [8, 2, 3], [8, 3, 7], [7, 3, 6], [3, 4, 5], [3, 5, 6]]; for (const t of tris) mb.tri(P[t[0]], P[t[1]], P[t[2]], col); };
    poly(1.16, -0.01, [0.08, 0.1, 0.25, 1]); poly(1, 0, [1, 1, 1, 1]);
    return unlit(mb);
  });
  // speech bubble with "..." (Silence), XY plane, ~1 unit wide
  M.speech = memo(() => {
    const mb = new MB(), n = 18, ell = (rx, ry, z, col, cy = 0) => { for (let i = 0; i < n; i++) { const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2; mb.tri([0, cy, z], [C(a0) * rx, cy + S(a0) * ry, z], [C(a1) * rx, cy + S(a1) * ry, z], col); } };
    const rim = [0.1, 0.1, 0.16, 1], fill = [1, 1, 1, 1];
    ell(0.54, 0.36, -0.01, rim); mb.tri([-0.3, -0.18, -0.01], [-0.42, -0.62, -0.01], [-0.04, -0.3, -0.01], rim);
    ell(0.48, 0.3, 0, fill); mb.tri([-0.26, -0.16, 0], [-0.36, -0.52, 0], [-0.08, -0.26, 0], fill);
    for (let i = -1; i <= 1; i++) { const x = i * 0.2; for (let j = 0; j < 8; j++) { const a0 = j / 8 * PI * 2, a1 = (j + 1) / 8 * PI * 2; mb.tri([x, 0, 0.01], [x + C(a0) * 0.055, S(a0) * 0.055, 0.01], [x + C(a1) * 0.055, S(a1) * 0.055, 0.01], rim); } }
    return unlit(mb);
  });
  // clock face (Stop / Haste / Slow): rim + 12 ticks; M.clockHand is a single hand from the centre up
  M.clockFace = memo(() => {
    const mb = new MB(), n = 40;
    for (let i = 0; i < n; i++) { const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2; q4(mb, [C(a0) * 0.9, S(a0) * 0.9, 0], [C(a0), S(a0), 0], [C(a1), S(a1), 0], [C(a1) * 0.9, S(a1) * 0.9, 0], W(1), W(1), W(1), W(1)); mb.tri([0, 0, 0], [C(a0) * 0.9, S(a0) * 0.9, 0], [C(a1) * 0.9, S(a1) * 0.9, 0], [W(0.05), W(0.25), W(0.25)]); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2, d = [C(a), S(a), 0], t = [-S(a) * 0.03, C(a) * 0.03, 0]; q4(mb, V.add(V.scale(d, 0.72), t), V.add(V.scale(d, 0.86), t), V.sub(V.scale(d, 0.86), t), V.sub(V.scale(d, 0.72), t), W(1), W(1), W(1), W(1)); }
    return unlit(mb);
  });
  M.clockHand = memo(() => { const mb = new MB(); q4(mb, [-0.035, -0.1, 0], [0.035, -0.1, 0], [0.02, 1, 0], [-0.02, 1, 0], W(1), W(1), W(1), W(1)); return unlit(mb); });
  // blade streak along +Y (0..1), lens-shaped, bright core line (slashes; scale x = width)
  M.blade = memo(() => {
    const mb = new MB(), n = 12;
    for (let i = 0; i < n; i++) {
      const y0 = i / n, y1 = (i + 1) / n, w0 = S(y0 * PI) * 0.5 * (0.4 + 0.6 * y0), w1 = S(y1 * PI) * 0.5 * (0.4 + 0.6 * y1);
      q4(mb, [-w0, y0, 0], [0, y0, 0], [0, y1, 0], [-w1, y1, 0], W(0), W(1), W(1), W(0)); q4(mb, [0, y0, 0], [w0, y0, 0], [w1, y1, 0], [0, y1, 0], W(1), W(0), W(0), W(1));
    }
    return unlit(mb);
  });
  // lit hexagonal ground slab (Quake): top at y=0, 0.35 deep, radius 1, earth-coloured
  M.slab = memo(() => {
    const mb = new MB(), R = U.rng(19), n = 6, top = [], bot = [];
    for (let i = 0; i < n; i++) { const a = i / n * PI * 2 + (R() - 0.5) * 0.4, r = 0.8 + R() * 0.25; top.push([C(a) * r, (R() - 0.5) * 0.06, S(a) * r]); bot.push([C(a) * r * 0.8, -0.38, S(a) * r * 0.8]); }
    const ct = [0.7, 0.6, 0.46, 1], cs = [0.5, 0.4, 0.3, 1];
    for (let i = 1; i < n - 1; i++) mb.tri(top[0], top[i + 1], top[i], ct);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; mb.quad(bot[i], bot[j], top[j], top[i], cs); }
    return mb.build({ cull: false });
  });
  // aura cone: open cone r=1 at the top (y=1), 0.3 at the bottom; UVs repeat 4x around (u) and run
  // bottom (v=1) -> top (v=0) so X.ptex('aura') tongues rise out of the rim
  M.auraCone = memo(() => {
    const mb = new MB(), n = 32, rep = 4;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2, u0 = (i * rep / n) % 1, u1 = u0 + rep / n;
      q4(mb, [C(a0) * 0.3, 0, S(a0) * 0.3], [C(a1) * 0.3, 0, S(a1) * 0.3], [C(a1), 1, S(a1)], [C(a0), 1, S(a0)], W(1), W(1), W(1), W(1), [[u0, 1], [u1, 1], [u1, 0], [u0, 0]]);
    }
    return mb.build({ unlit: true });           // front faces point inward: with culling only the far wall shows
  });
  // lit die (1 opposite 6): white body, dark pips. Faces: +y=1, -y=6, +x=3, -x=4, +z=2, -z=5
  M.die = memo(() => {
    const mb = new MB(), h = 0.5;
    mb.box(0, 0, 0, 1, 1, 1, '#f4f0e8');
    const PIPS = { 1: [[0, 0]], 2: [[-0.25, -0.25], [0.25, 0.25]], 3: [[-0.27, -0.27], [0, 0], [0.27, 0.27]], 4: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]], 5: [[-0.27, -0.27], [0.27, -0.27], [0, 0], [-0.27, 0.27], [0.27, 0.27]], 6: [[-0.25, -0.28], [0.25, -0.28], [-0.25, 0], [0.25, 0], [-0.25, 0.28], [0.25, 0.28]] };
    const face = (num, o, ax, ay) => { for (const [x, y] of PIPS[num]) { const c = V.add(V.add(o, V.scale(ax, x)), V.scale(ay, y)), r = 0.085, col = num === 1 ? '#b01818' : '#181818'; for (let j = 0; j < 8; j++) { const a0 = j / 8 * PI * 2, a1 = (j + 1) / 8 * PI * 2; mb.tri(c, V.add(c, V.add(V.scale(ax, C(a0) * r), V.scale(ay, S(a0) * r))), V.add(c, V.add(V.scale(ax, C(a1) * r), V.scale(ay, S(a1) * r))), col); } } };
    const e = 0.502;
    face(1, [0, e, 0], [1, 0, 0], [0, 0, -1]); face(6, [0, -e, 0], [1, 0, 0], [0, 0, 1]);
    face(3, [e, 0, 0], [0, 0, -1], [0, 1, 0]); face(4, [-e, 0, 0], [0, 0, 1], [0, 1, 0]);
    face(2, [0, 0, e], [1, 0, 0], [0, 1, 0]); face(5, [0, 0, -e], [-1, 0, 0], [0, 1, 0]);
    return mb.build({ cull: false });
  });

  // ---------------------------------------------------------------- particles
  // new X.Particles({ mesh|meshFn, color, blend, gravity, drag, fade:[in,out], spin, size, sizeTo, tex, frames })
  //   ptex: X.ptex name (or fn(q) -> name) for procedural sprite textures on M.quad
  // each particle: { p, v, life, size, sizeTo, color, alpha, roll, vr, age, frame }
  class Particles {
    constructor(o = {}) { this.o = o; this.list = []; this.t = 0; }
    emit(n, fn) { for (let i = 0; i < n; i++) { const p = Object.assign({ p: [0, 0, 0], v: [0, 0, 0], life: 40, size: 0.2, roll: 0, vr: 0, age: 0, alpha: 1 }, fn(i)); if (p.sizeTo == null) p.sizeTo = p.size; this.list.push(p); } return this; }
    update() {
      const o = this.o, g = o.gravity || 0, dr = o.drag == null ? 1 : o.drag;
      this.t++;
      for (const q of this.list) {
        q.age++;
        if (q.fn) q.fn(q, q.age);
        q.v[1] -= g; q.v[0] *= dr; q.v[1] *= dr; q.v[2] *= dr;
        q.p[0] += q.v[0]; q.p[1] += q.v[1]; q.p[2] += q.v[2];
        if (o.floor != null && q.p[1] < o.floor) { q.p[1] = o.floor; q.v[1] = -q.v[1] * (o.bounce || 0); }
        q.roll += q.vr;
      }
      this.list = this.list.filter(q => q.age < q.life);
      return this.list.length > 0 || this.o.keep;
    }
    draw(cam) {
      const o = this.o, fin = (o.fade && o.fade[0]) || 4, fout = (o.fade && o.fade[1]) || 12;
      const img = o.tex ? X.img(o.tex) : null;
      for (const q of this.list) {
        const k = q.age / q.life, sz = U.lerp(q.size, q.sizeTo, k);
        const a = q.alpha * X.env(q.age, q.life, fin, fout) * (o.alpha == null ? 1 : o.alpha);
        let mesh = o.mesh || (o.meshFn && o.meshFn(q)) || M.disc();
        let tex;
        const pt = q.ptex || o.ptex;
        if (pt) { tex = X.ptex(typeof pt === 'function' ? pt(q) : pt); if (!o.mesh && !o.meshFn) mesh = o.nearest ? M.quadN() : M.quad(); }
        else if (img) { const fr = q.frame != null ? q.frame : (o.frames ? o.frames[Math.min(o.frames.length - 1, Math.floor(k * o.frames.length))] : 0); const fm = X.frameMesh(o.tex, fr); if (fm) { mesh = fm; tex = img; } }
        const m = o.world ? X.trs(q.p, q.rot || [q.roll, q.roll * 0.7, 0], sz) : X.bill(cam, q.p, sz * (q.aspect || 1), sz, q.roll);
        X.draw(mesh, m, { color: q.color || o.color || '#ffffff', alpha: a, blend: o.blend === undefined ? 'add' : o.blend, tex, lit: o.lit });
      }
    }
  }
  X.Particles = Particles;
})();
