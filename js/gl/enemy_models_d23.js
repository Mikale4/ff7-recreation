// Dedicated battle models for the Disc 2 / Disc 3 enemies (js/data/enemies_d23.js):
// Icicle Inn / Great Glacier / Gaea's Cliff, Whirlwind Maze, Mideel, Junon / Underwater Reactor,
// Gelnika, the Midgar raid (Proud Clod, Hojo), the WEAPONs, the Northern Cave and the final bosses.
// Each entry is FF7.creatures.MODELS[enemyId] = (look) => FF7.Model, authored in metres (Cloud = 1.7)
// against references/Final Fantasy 7 (1997)/Bestiary.png and "x Weapons of War.png".
// Non-human rigs use the generic enemy bone names (root body head jaw tail wingL wingR armL armR
// legFL legFR legBL legBR t0..t7 seg0..seg5) so the stock e_idle / e_attack / e_cast / e_hurt clips drive them.
(function () {
  'use strict';
  const U = FF7.util, MB = FF7.MeshBuilder, V = FF7.V3, CR = FF7.creatures;
  const sh = U.shade, mix = U.mix, PI = Math.PI, S = Math.sin, C = Math.cos;
  const MODELS = CR.MODELS = CR.MODELS || {};

  // ================================================================== helpers
  const mesh = (fn, o) => { const mb = new MB(); fn(mb); return mb.build(o); };
  const glow = (fn) => mesh(fn, { unlit: true });
  const rig = (a) => CR.base(new FF7.Model(), a || {});
  const reg = (ids, fn) => [].concat(ids).forEach(id => { MODELS[id] = fn; });
  const L3 = V.lerp;
  const XY = (d) => { const c = V.cross(V.norm(d), [0, 0, 1]); return V.len(c) < 1e-4 ? [1, 0, 0] : V.norm(c); };   // blade width lying in the x-y plane (faces the camera)

  // points on a quadratic / cubic Bezier
  function bez(p0, p1, p2, n) {
    const r = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; r.push([0, 1, 2].map(k => u * u * p0[k] + 2 * u * t * p1[k] + t * t * p2[k])); }
    return r;
  }
  function bez3(p0, p1, p2, p3, n) {
    const r = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; r.push([0, 1, 2].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k])); }
    return r;
  }
  // Tube along a polyline. rad: number | array | fn(t, i). col: colour | fn(t, k, i). o: { sy, cap, flat, phase }
  function tube(mb, pts, rad, col, sides, o) {
    o = o || {}; sides = sides || 6;
    const n = pts.length;
    const R = (i) => { const t = n > 1 ? i / (n - 1) : 0; return typeof rad === 'function' ? rad(t, i) : Array.isArray(rad) ? rad[i] : rad; };
    const tan = pts.map((p, i) => V.norm(V.sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)])));
    let nr = V.norm(V.cross(Math.abs(tan[0][1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], tan[0]));
    const rings = [], sy = o.sy || 1;
    for (let i = 0; i < n; i++) {
      const t = tan[i];
      nr = V.norm(V.sub(nr, V.scale(t, V.dot(nr, t))));
      const bn = V.cross(t, nr), r = R(i), ring = [];
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * PI * 2 + (o.phase || 0), cx = C(a), sx = S(a);
        ring.push({ p: V.add(pts[i], V.add(V.scale(nr, cx * r), V.scale(bn, sx * r * sy))), n: V.norm(V.add(V.scale(nr, cx), V.scale(bn, sx / sy))) });
      }
      rings.push(ring);
    }
    const colAt = (i, k) => typeof col === 'function' ? col(n > 1 ? i / (n - 1) : 0, k, i) : col;
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) {
      const k2 = (k + 1) % sides, a = rings[i][k], b = rings[i][k2], c = rings[i + 1][k2], d = rings[i + 1][k];
      mb.quad(a.p, b.p, c.p, d.p, colAt(i, k), null, o.flat ? null : [a.n, b.n, c.n, d.n]);
    }
    if (o.cap !== false) {
      if (R(0) > 1e-4) for (let k = 0; k < sides; k++) mb.tri(pts[0], rings[0][(k + 1) % sides].p, rings[0][k].p, colAt(0, k));
      if (R(n - 1) > 1e-4) for (let k = 0; k < sides; k++) mb.tri(pts[n - 1], rings[n - 1][k].p, rings[n - 1][(k + 1) % sides].p, colAt(n - 1, k));
    }
    return mb;
  }
  // tapered curved horn / claw / tentacle tip through a quadratic curve
  function horn(mb, p0, p1, p2, r, col, sides, seg) { return tube(mb, bez(p0, p1, p2, seg || 4), (t) => r * (1 - t) + 0.001, col, sides || 5); }
  // straight tapered cone from a to b
  function cone(mb, a, b, r, col, sides) { return tube(mb, [a, b], [r, 0.0008], col, sides || 4); }
  // double-sided flat polygon (fan)
  function sheet(mb, pts, col, col2) {
    for (let i = 1; i < pts.length - 1; i++) { mb.tri(pts[0], pts[i], pts[i + 1], col); mb.tri(pts[0], pts[i + 1], pts[i], col2 || col); }
    return mb;
  }
  // flat disc facing +z (n-gon), for eye spots and painted markings
  function disc(mb, c, rx, ry, col, n) { n = n || 6; for (let i = 0; i < n; i++) { const a0 = (i / n) * PI * 2, a1 = ((i + 1) / n) * PI * 2; mb.tri(c, [c[0] + C(a0) * rx, c[1] + S(a0) * ry, c[2]], [c[0] + C(a1) * rx, c[1] + S(a1) * ry, c[2]], col); } return mb; }
  const ell = (mb, p, r, col, seg, rings, fn) => mb.sphere(p[0], p[1], p[2], r[0], r[1], r[2], col, seg || 8, rings || 6, true, fn);
  // Bat wing growing along s*x from the bone origin: arm bones + finger bones + scalloped membrane
  function batWing(mb, s, o) {
    const L = o.span, H = o.h != null ? o.h : L * 0.45, bc = o.bone || sh(o.col, -0.2), mem = o.col, mem2 = o.col2 || sh(o.col, -0.25);
    const back = o.back != null ? o.back : -0.15;
    const elbow = [s * L * 0.28, H * 0.45, L * back * 0.3], wrist = [s * L * 0.5, H * 0.75, L * back * 0.6];
    const tips = o.tips ? o.tips.map(p => [s * p[0] * L, p[1] * H, p[2] * L]) :
      [[s * L, H * 0.85, L * back], [s * L * 0.98, H * 0.05, L * back * 1.3], [s * L * 0.78, -H * 0.55, L * back * 1.4], [s * L * 0.42, -H * 0.8, L * back * 1.1]];
    const br = o.r || L * 0.028;
    tube(mb, [[0, 0, 0], elbow, wrist], [br * 1.2, br, br * 0.9], bc, 5);
    tips.forEach(tp => tube(mb, [wrist, tp], [br * 0.6, br * 0.15], bc, 4));
    const root = [s * L * 0.04, -H * (o.rootDrop != null ? o.rootDrop : 0.45), 0];
    const pts = [wrist].concat(tips);
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], mid = L3(L3(a, b, 0.5), wrist, o.scallop != null ? o.scallop : 0.22);
      sheet(mb, [wrist, a, mid], mem, mem2); sheet(mb, [wrist, mid, b], mem, mem2);
    }
    const last = tips[tips.length - 1];
    sheet(mb, [wrist, last, root], mem, mem2); sheet(mb, [wrist, root, elbow], mem, mem2); sheet(mb, [elbow, root, [0, 0, 0]], mem, mem2);
    if (o.claw) cone(mb, wrist, V.add(wrist, [s * L * 0.02, L * 0.1, L * 0.06]), br * 1.2, o.claw);
    return mb;
  }
  // Feather wing along s*x: an arm plus a fan of blades
  function featherWing(mb, s, o) {
    const L = o.span, n = o.n || 7, cols = o.cols || [o.col, sh(o.col, -0.15)];
    const tip = [s * L * 0.55, L * (o.lift != null ? o.lift : 0.25), -L * 0.05];
    tube(mb, [[0, 0, 0], [s * L * 0.25, L * 0.12, 0], tip], L * 0.04, cols[0], 5);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), base = L3([s * L * 0.08, 0, -0.02], tip, 0.3 + t * 0.7);
      const ang = (o.a0 != null ? o.a0 : -1.3) + t * (o.a1 != null ? o.a1 : 1.45);
      const len = L * (o.len0 || 0.45) + t * L * (o.len1 || 0.35);
      mb.blade(base, [s * C(ang), S(ang), -0.25], len, L * (o.w || 0.14), L * 0.02, cols[i % cols.length], XY([s * C(ang), S(ang), -0.25]), o.tip);
    }
    return mb;
  }
  // ring of teeth around an ellipse (in the plane z = z0, facing +z), pointing to the centre
  function mouthRing(mb, cx, cy, z, rx, ry, n, len, col, tilt) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2, p = [cx + C(a) * rx, cy + S(a) * ry, z];
      mb.blade(p, [-C(a), -S(a), tilt || 0.25], len, len * 0.55, len * 0.18, col, XY([-C(a), -S(a), 0]));
    }
    return mb;
  }
  // row of teeth along a line from a to b, pointing dir
  function teethRow(mb, a, b, n, dir, len, col) {
    for (let i = 0; i < n; i++) { const p = L3(a, b, n > 1 ? i / (n - 1) : 0.5); mb.blade(p, dir, len, len * 0.5, len * 0.2, col, [1, 0, 0]); }
    return mb;
  }
  // claws / toes fanning from p toward dir
  function claws(mb, p, dir, n, len, r, col, spread) {
    const d = V.norm(dir), side = V.norm(V.cross(d, [0, 1, 0]).some(Math.abs) ? V.cross(d, [0, 1, 0]) : [1, 0, 0]);
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? i / (n - 1) - 0.5 : 0;
      const dd = V.norm(V.add(d, V.scale(side, k * (spread || 0.9))));
      const q = V.add(p, V.scale(side, k * r * 3));
      horn(mb, q, V.add(q, V.scale(dd, len * 0.6)), V.add(V.add(q, V.scale(dd, len)), [0, -len * 0.35, 0]), r, col, 4, 3);
    }
    return mb;
  }
  // pair of eyes on the +z side (glowing when on a glow mesh)
  function eyes(mb, x, y, z, r, col, ry) { mb.sphere(x, y, z, r, (ry || r), r * 0.6, col, 6, 4); mb.sphere(-x, y, z, r, (ry || r), r * 0.6, col, 6, 4); return mb; }
  // simple limb from origin down through pts, with a tapered radius
  const limb = (mb, pts, r0, r1, col, sides) => tube(mb, pts, (t) => r0 + (r1 - r0) * t, col, sides || 6);
  // human enemies reuse the character builder
  function human(spec, scale, weapon) {
    const m = FF7.chars3d.build(spec, { style: 'battle' });
    m.showWeapon(weapon !== false); m.enemyHuman = true; m.play('battle'); m.scale = scale || 1.7;
    return m;
  }
  const attachH = (m, bone, fn, o) => m.attach(bone, mesh(fn, o));
  // textured quad facing +z (for painted panels / symbols)
  function panelTex(w, h, tex, x, y, z, pw, ph, uv) {
    const me = mesh(mb => mb.plane(x, y, z, pw, ph, '#ffffff', uv || [0, 0, 1, 1]));
    me.tex = tex; me.alphaTest = 0.01;
    return me;
  }
  // texture wrapped on a vertical cylinder patch (radius r, centred on +z, from angle -half..half, y0..y1)
  function wrapTex(tex, r, y0, y1, half, n) {
    n = n || 6;
    const me = mesh(mb => { for (let i = 0; i < n; i++) { const a0 = -half + (i / n) * half * 2, a1 = -half + ((i + 1) / n) * half * 2, u0 = i / n, u1 = (i + 1) / n; mb.quad([S(a0) * r, y0, C(a0) * r], [S(a1) * r, y0, C(a1) * r], [S(a1) * r, y1, C(a1) * r], [S(a0) * r, y1, C(a0) * r], '#ffffff', [[u0, 1], [u1, 1], [u1, 0], [u0, 0]]); } });
    me.tex = tex; me.alphaTest = 0.01; return me;
  }
  // PS1-like faceted colouring: pick one of cols per face
  const pick = (cols) => (i, j) => cols[(i * 7 + j * 3) % cols.length];
  const spots = (base, dark, every) => (i, j) => ((i * 5 + j * 3) % (every || 4) === 0 ? dark : base);

  // ================================================================== Icicle Inn / Great Glacier
  // Jumping: a big white rabbit standing on its hind legs, pink ears, holding a carrot club
  reg('jumping', (a) => {
    const m = rig(a); const W = '#ecebe4', P = '#e894a6', O = '#e86a20';
    m.bone('body', 'root', [0, 0.42, 0]);
    m.bone('head', 'body', [0, 0.34, 0.03]);
    m.bone('armL', 'body', [0.15, 0.2, 0.06], [-0.3, 0, 0.5]); m.bone('armR', 'body', [-0.15, 0.2, 0.06], [-0.9, 0, -0.4]);
    m.bone('legFL', 'body', [0.1, -0.12, 0]); m.bone('legFR', 'body', [-0.1, -0.12, 0]);
    m.bone('tail', 'body', [0, -0.1, -0.17]);
    attachH(m, 'body', mb => mb.loft([{ y: -0.2, rx: 0.1, rz: 0.1 }, { y: -0.08, rx: 0.19, rz: 0.17 }, { y: 0.1, rx: 0.17, rz: 0.15 }, { y: 0.28, rx: 0.1, rz: 0.09 }, { y: 0.36, rx: 0.06, rz: 0.06 }], { sides: 8, color: W }));
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.1, 0.0], [0.13, 0.13, 0.13], W);
      ell(mb, [0, 0.06, 0.09], [0.08, 0.06, 0.07], W);
      mb.sphere(0, 0.07, 0.16, 0.022, 0.016, 0.015, P, 5, 3);
      [1, -1].forEach(s => {
        mb.blade([s * 0.05, 0.2, -0.03], [s * 0.22, 1, -0.12], 0.46, 0.13, 0.035, W, [1, 0, 0]);
        mb.blade([s * 0.05, 0.23, -0.005], [s * 0.22, 1, -0.12], 0.38, 0.08, 0.02, P, [1, 0, 0]);
      });
    });
    attachH(m, 'head', mb => eyes(mb, 0.06, 0.13, 0.11, 0.022, '#e02020'), { unlit: true });
    const arm = (carrot) => mesh(mb => {
      limb(mb, [[0, 0, 0], [0, -0.12, 0.03], [0, -0.2, 0.06]], 0.045, 0.035, W);
      ell(mb, [0, -0.22, 0.07], [0.045, 0.04, 0.045], W);
      if (carrot) { tube(mb, [[0, -0.2, 0.0], [0, -0.22, 0.14], [0, -0.25, 0.46]], [0.07, 0.06, 0.005], O, 6); for (let i = 0; i < 3; i++) mb.blade([0, -0.2, 0.0], [(i - 1) * 0.4, 0.3, -1], 0.14, 0.04, 0.01, '#40a030'); }
    });
    m.attach('armL', arm(false)); m.attach('armR', arm(true));
    const leg = mesh(mb => { ell(mb, [0.02, -0.08, 0.03], [0.11, 0.15, 0.14], W); ell(mb, [0.01, -0.25, 0.08], [0.07, 0.05, 0.16], W); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    attachH(m, 'tail', mb => ell(mb, [0, 0, 0], [0.07, 0.07, 0.06], '#ffffff'));
    m.scale = 1.25; m.height = 1.45; m.lungeScale = 1.2; return m;
  });

  // quadruped helper: body along z, four legs, neck/head bone, tail bone. Returns { m, P }
  function beast(a, P) {
    const m = rig(a);
    m.bone('body', 'root', [0, P.h, 0], P.bodyRot);
    m.bone('head', 'body', P.head, P.headRot);
    m.bone('jaw', 'head', P.jaw || [0, -0.03, 0.1]);
    m.bone('tail', 'body', P.tail || [0, 0.05, -P.len * 0.5]);
    const fx = P.legX, fz = P.legZ, bz = P.legZb != null ? P.legZb : -P.legZ;
    m.bone('legFL', 'body', [fx, P.legY || -0.05, fz]); m.bone('legFR', 'body', [-fx, P.legY || -0.05, fz]);
    m.bone('legBL', 'body', [P.legXb || fx, P.legYb || P.legY || -0.05, bz]); m.bone('legBR', 'body', [-(P.legXb || fx), P.legYb || P.legY || -0.05, bz]);
    return m;
  }
  // leg that reaches the ground from a bone at height `top` (root-space) with a paw and claws
  function beastLeg(top, o) {
    return mesh(mb => {
      const H = top, k = o.knee || 0.08, back = o.back ? -1 : 1;
      const pts = [[0, 0, 0], [0, -H * 0.42, k * back], [0, -H * 0.8, -k * back * 0.9], [0, -H + 0.04, 0.02]];
      tube(mb, pts, (t) => o.r0 + (o.r1 - o.r0) * t, o.col, 6);
      if (o.thigh) ell(mb, [0, -H * 0.12, 0], [o.r0 * 1.25, H * 0.26, o.r0 * 1.5], o.col);
      ell(mb, [0, -H + 0.035, 0.06], [o.r1 * 1.35, 0.045, o.r1 * 2.1], o.paw || o.col);
      if (o.claw) claws(mb, [0, -H + 0.04, 0.06 + o.r1 * 1.8], [0, -0.2, 1], o.nClaw || 3, o.clawLen || 0.08, o.r1 * 0.3, o.claw, 0.9);
    });
  }

  // Bandersnatch: white wolf with an olive-yellow spiky mane
  reg('bandersnatch', (a) => {
    const Wc = '#d6dade', Wd = '#9ea4ae', M = '#b8a44c', M2 = '#8a7a30';
    const m = beast(a, { h: 0.74, len: 1.0, head: [0, 0.2, 0.55], headRot: [0.15, 0, 0], legX: 0.13, legZ: 0.34, legZb: -0.36, tail: [0, 0.08, -0.5] });
    attachH(m, 'body', mb => {
      ell(mb, [0, 0, -0.05], [0.19, 0.2, 0.5], Wc, 8, 6, (i, j) => j > 3 ? '#eef0f2' : Wc);
      ell(mb, [0, 0.03, 0.28], [0.23, 0.25, 0.28], Wc);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) {        // shaggy mane around the neck & shoulders
        const an = -PI * 0.2 + (i / 11) * PI * 1.4, z = 0.42 - r * 0.16, rr = 0.2 + r * 0.03, p = [C(an) * rr, 0.08 + S(an) * rr, z];
        mb.blade(p, [C(an) * 0.7, S(an) * 0.7 + 0.25, -0.8], 0.34 - r * 0.04, 0.16, 0.04, (i + r) % 2 ? M : M2, [0, 0, 1]);
      }
      for (let i = 0; i < 6; i++) mb.blade([0, 0.2, 0.1 - i * 0.14], [0, 0.7, -1], 0.26 - i * 0.03, 0.14, 0.04, i % 2 ? M : M2, [1, 0, 0]);
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.04, 0.02], [0.12, 0.12, 0.14], Wc);
      tube(mb, [[0, 0.01, 0.1], [0, -0.01, 0.24], [0, -0.02, 0.33]], [0.08, 0.06, 0.04], Wc, 6);
      mb.sphere(0, 0.0, 0.34, 0.025, 0.02, 0.02, '#202020', 5, 3);
      [1, -1].forEach(s => { mb.blade([s * 0.07, 0.12, -0.02], [s * 0.3, 1, -0.2], 0.16, 0.08, 0.03, Wd, XY([s * 0.3, 1, 0])); for (let i = 0; i < 3; i++) mb.blade([s * 0.1, 0.02 - i * 0.04, 0.0], [s, 0.3 - i * 0.4, -0.8], 0.2, 0.07, 0.02, M, [0, 0, 1]); });
    });
    attachH(m, 'head', mb => eyes(mb, 0.065, 0.08, 0.13, 0.022, '#ff3020'), { unlit: true });
    attachH(m, 'jaw', mb => { tube(mb, [[0, -0.02, 0.0], [0, -0.04, 0.2]], [0.05, 0.03], sh(Wc, -0.1), 5); teethRow(mb, [0.03, -0.02, 0.12], [0.03, -0.02, 0.2], 2, [0, 1, 0], 0.03, '#ffffff'); teethRow(mb, [-0.03, -0.02, 0.12], [-0.03, -0.02, 0.2], 2, [0, 1, 0], 0.03, '#ffffff'); });
    const fl = beastLeg(0.69, { r0: 0.095, r1: 0.045, col: Wc, paw: Wd, claw: '#f0f0f0', thigh: true });
    const bl = beastLeg(0.69, { r0: 0.1, r1: 0.045, col: Wc, paw: Wd, claw: '#f0f0f0', thigh: true, back: true, knee: 0.1 });
    m.attach('legFL', fl); m.attach('legFR', fl); m.attach('legBL', bl); m.attach('legBR', bl);
    attachH(m, 'tail', mb => tube(mb, bez([0, 0, 0], [0, 0.05, -0.3], [0, -0.3, -0.5], 5), (t) => 0.04 + 0.08 * S(PI * t), (t) => t > 0.4 ? M : Wc, 6));
    m.height = 1.05; m.lungeScale = 1.3; return m;
  });

  // Cuahl: the Gaea's Cliff Coeurl — spotted panther with two long feeler whiskers
  reg('cuahl', (a) => {
    const B = '#d4b476', D = '#6a4a28', E = '#40ff80';
    const m = beast(a, { h: 0.6, len: 0.9, head: [0, 0.2, 0.46], headRot: [0.1, 0, 0], legX: 0.12, legZ: 0.28, legZb: -0.3, tail: [0, 0.06, -0.45] });
    attachH(m, 'body', mb => {
      ell(mb, [0, 0, -0.04], [0.17, 0.18, 0.46], B, 10, 6, (i, j) => (j < 4 && (i * 3 + j) % 4 === 0) ? D : (j > 4 ? '#e8d8b0' : B));
      ell(mb, [0, 0.03, 0.24], [0.19, 0.21, 0.22], B, 8, 6, (i, j) => ((i + j * 2) % 5 === 0 ? D : B));
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.04, 0.03], [0.12, 0.11, 0.12], B, 8, 6, (i, j) => (i + j) % 6 === 0 ? D : B);
      ell(mb, [0, -0.01, 0.12], [0.07, 0.06, 0.07], B);
      mb.sphere(0, 0.01, 0.19, 0.02, 0.016, 0.016, '#402020', 5, 3);
      [1, -1].forEach(s => {
        mb.blade([s * 0.07, 0.12, -0.01], [s * 0.35, 1, -0.1], 0.15, 0.09, 0.03, B, XY([s * 0.35, 1, 0]), '#b02020');
        tube(mb, bez3([s * 0.1, 0.02, 0.05], [s * 0.5, 0.12, 0.05], [s * 0.85, 0.05, -0.05], [s * 1.05, -0.08, -0.15], 7), (t) => 0.012 + 0.012 * t, '#c8b8e0', 4);
        mb.blade([s * 1.05, -0.08, -0.15], [s, -0.3, -0.4], 0.12, 0.06, 0.02, '#e8e0f8', [0, 1, 0]);
      });
    });
    attachH(m, 'head', mb => eyes(mb, 0.055, 0.07, 0.1, 0.022, E), { unlit: true });
    attachH(m, 'jaw', mb => { tube(mb, [[0, -0.03, 0.02], [0, -0.05, 0.14]], [0.05, 0.035], B, 5); mb.sphere(0, -0.02, 0.08, 0.035, 0.012, 0.05, '#a02828', 5, 3); teethRow(mb, [0.03, -0.02, 0.1], [-0.03, -0.02, 0.1], 2, [0, 1, 0], 0.03, '#ffffff'); });
    const fl = beastLeg(0.56, { r0: 0.06, r1: 0.035, col: B, claw: '#f0f0e0', thigh: true });
    const bl = beastLeg(0.57, { r0: 0.075, r1: 0.035, col: B, claw: '#f0f0e0', thigh: true, back: true, knee: 0.1 });
    m.attach('legFL', fl); m.attach('legFR', fl); m.attach('legBL', bl); m.attach('legBR', bl);
    attachH(m, 'tail', mb => tube(mb, bez3([0, 0, 0], [0, 0.1, -0.3], [0, -0.1, -0.55], [0, 0.15, -0.8], 6), (t) => 0.04 - 0.025 * t, (t, k, i) => i % 2 ? D : B, 5));
    m.height = 0.95; m.lungeScale = 1.3; return m;
  });

  // ---- Golem family (Golem / Ice Golem / Armored Golem): hunched blocky stone giant. Torso pitched forward,
  // small grille-faced head sunk low between two huge shoulder blocks with grey bevelled tops, massive
  // gauntlet forearms with fists hanging to the knees, dark teal joints, bent knees on flared boot-shins.
  function golem(a, c) {
    const m = rig(a);
    const B = c.body, BL = c.light, D = c.dark, G = c.pad, J = c.joint, Hc = c.helm || B;
    const lean = 0.32;
    m.bone('body', 'root', [0, 1.02, -0.04], [lean, 0, 0]);
    m.bone('head', 'body', [0, 0.84, 0.3], [-lean * 0.8, 0, 0]);
    m.bone('armL', 'body', [0.66, 0.8, 0], [-lean, 0, 0.1]); m.bone('armR', 'body', [-0.66, 0.8, 0], [-lean, 0, -0.1]);
    m.bone('legFL', 'root', [0.3, 1.0, 0]); m.bone('legFR', 'root', [-0.3, 1.0, 0]);
    attachH(m, 'body', mb => {
      mb.box(0, 0.04, 0, 0.62, 0.26, 0.44, J);                                                                          // waist joint
      mb.frustum(0, 0.14, 0, 0.66, 0.46, 0.86, 0.56, 0.34, { side: B, front: BL, top: B, back: D });                   // belly
      mb.frustum(0, 0.46, 0.02, 0.86, 0.56, 1.1, 0.66, 0.5, { side: B, front: BL, back: D, top: sh(B, 0.1) });        // barrel chest
      mb.frustum(0, 0.96, 0.0, 1.1, 0.66, 0.62, 0.46, 0.14, { side: B, top: sh(B, 0.12), back: D });                 // sloped chest top
      mb.box(0, 0.7, 0.36, 0.52, 0.34, 0.06, { side: BL, front: sh(BL, 0.12) });                                       // chest plate
    });
    attachH(m, 'head', mb => {
      mb.frustum(0, -0.14, 0, 0.3, 0.3, 0.28, 0.26, 0.34, { side: Hc, front: Hc, top: sh(Hc, 0.1), back: D });         // helm block
      mb.box(0, 0.22, -0.01, 0.08, 0.1, 0.3, G);                                                                        // crest fin
      mb.box(0, 0.12, 0.16, 0.08, 0.1, 0.04, G);
      mb.box(0, 0.04, 0.145, 0.24, 0.1, 0.02, D);                                                                       // eye slit
      mb.box(0, 0.1, 0.16, 0.28, 0.05, 0.05, sh(Hc, 0.08));                                                             // brow
      mb.box(0, -0.06, 0.15, 0.22, 0.12, 0.04, D);                                                                      // mouth recess
      for (let i = -1; i <= 1; i++) mb.box(i * 0.065, -0.06, 0.17, 0.04, 0.13, 0.03, G);                                // grille bars
    });
    attachH(m, 'head', mb => eyes(mb, 0.065, 0.04, 0.158, 0.03, c.eye, 0.022), { unlit: true });
    const arm = (s) => mesh(mb => {
      mb.frustum(s * 0.03, -0.24, 0, 0.5, 0.62, 0.52, 0.64, 0.4, { side: B, front: BL, back: D, bottom: D });           // shoulder block
      mb.frustum(s * 0.03, 0.16, 0, 0.52, 0.64, 0.26, 0.5, 0.16, G, [s * 0.1, 0]);                                     // grey bevelled top
      mb.box(s * 0.28, 0.0, 0, 0.04, 0.34, 0.5, G);                                                                     // grey outer face
      mb.frustum(0, -0.62, 0, 0.26, 0.28, 0.26, 0.3, 0.42, J);                                                          // upper arm
      mb.box(0, -0.64, 0.02, 0.3, 0.14, 0.32, J);                                                                       // elbow
      mb.frustum(0, -1.14, 0.05, 0.5, 0.52, 0.38, 0.42, 0.46, { side: B, front: BL, top: sh(B, 0.1), bottom: D, back: D });   // gauntlet forearm
      mb.box(0, -1.24, 0.08, 0.4, 0.22, 0.42, sh(B, -0.1));                                                             // fist
      mb.box(0, -1.2, 0.3, 0.36, 0.1, 0.04, G);                                                                          // knuckles
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    const leg = mesh(mb => {
      mb.push(); mb.rotate(-0.3, 0, 0);
      mb.limb(0.34, 0.38, 0.3, 0.34, 0.48, { side: J, front: sh(J, 0.08) });                                            // thigh (knee forward)
      mb.pop();
      mb.box(0, -0.46, 0.14, 0.36, 0.14, 0.38, J);                                                                      // knee
      mb.push(); mb.translate(0, -0.46, 0.14); mb.rotate(0.28, 0, 0);
      mb.limb(0.36, 0.4, 0.5, 0.52, 0.44, { side: B, front: BL, back: D, bottom: D });                                  // flared boot-shin
      mb.pop();
      mb.box(0, -0.94, 0.08, 0.5, 0.12, 0.66, { side: D, top: sh(B, -0.1), front: B });                                // foot
    });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 2.2; m.scale = c.k || 1.12; m.lungeScale = 0.7; return m;
  }
  // Disc 1 (Cosmo Canyon area): FF7's Golem shares this model (mustard-yellow)
  reg('golem', (a) => golem(a, { body: '#9a8a30', light: '#b8a848', dark: '#5a4c1c', pad: '#a0a0b0', joint: '#2a4a40', eye: '#f0e040' }));
  reg('ice_golem', (a) => golem(a, { body: '#46488a', light: '#5a5eaa', dark: '#22244a', pad: '#8a90b8', joint: '#2a3050', helm: '#5a5eaa', eye: '#80f0ff' }));
  reg('armored_golem', (a) => golem(a, { body: '#3a3448', light: '#4c465c', dark: '#1a1824', pad: '#8a8898', joint: '#26363a', eye: '#f0e040', k: 1.22 }));

  // Shred: crouching teal lizard-frog with a tan belly, big clawed hands and yellow-green fins
  reg('shred', (a) => {
    const m = rig(a); const T = '#2a8a84', T2 = '#1c605c', Bel = '#c8b88a', F = '#b8d040';
    m.bone('body', 'root', [0, 0.55, 0], [-0.45, 0, 0]);
    m.bone('head', 'body', [0, 0.36, 0.2], [0.35, 0, 0]);
    m.bone('jaw', 'head', [0, -0.03, 0.06]);
    m.bone('armL', 'body', [0.24, 0.24, 0.14], [-0.4, 0, 0.8]); m.bone('armR', 'body', [-0.24, 0.24, 0.14], [-1.2, 0, -0.6]);
    m.bone('legBL', 'body', [0.2, -0.25, -0.05]); m.bone('legBR', 'body', [-0.2, -0.25, -0.05]);
    m.bone('tail', 'body', [0, -0.3, -0.18]);
    attachH(m, 'body', mb => {
      ell(mb, [0, 0, 0], [0.26, 0.36, 0.24], T, 8, 6, (i, j, p) => p[2] > 0.08 && j > 1 ? Bel : T);
      for (let i = 0; i < 4; i++) mb.blade([0, 0.25 - i * 0.16, -0.18], [0, 0.1, -1], 0.26, 0.14, 0.03, i % 2 ? F : '#e0e050', [0, 1, 0]);
      [1, -1].forEach(s => mb.blade([s * 0.22, 0.05, -0.1], [s, -0.2, -0.6], 0.3, 0.16, 0.02, F, [0, 1, 0]));
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.02, 0.06], [0.17, 0.1, 0.18], T);
      [1, -1].forEach(s => mb.blade([s * 0.1, 0.07, -0.02], [s * 0.6, 0.5, -1], 0.16, 0.06, 0.02, T2));
    });
    attachH(m, 'head', mb => eyes(mb, 0.08, 0.08, 0.15, 0.02, '#ff4030'), { unlit: true });
    attachH(m, 'jaw', mb => { ell(mb, [0, -0.03, 0.06], [0.14, 0.04, 0.14], T2); teethRow(mb, [0.08, -0.01, 0.15], [-0.08, -0.01, 0.15], 4, [0, 1, 0.3], 0.035, '#f0f0e0'); });
    const arm = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.22, 0.05], [0, -0.42, 0.14]], 0.06, 0.04, T); ell(mb, [0, -0.44, 0.16], [0.06, 0.05, 0.06], T2); claws(mb, [0, -0.46, 0.18], [0, -0.4, 1], 3, 0.14, 0.02, '#d8e8e0', 1.1); });
    m.attach('armL', arm); m.attach('armR', arm);
    const leg = mesh(mb => { ell(mb, [0, -0.02, 0.06], [0.1, 0.12, 0.2], T); limb(mb, [[0, -0.05, 0.2], [0, -0.28, 0.05], [0, -0.33, 0.2]], 0.06, 0.04, T); claws(mb, [0, -0.34, 0.24], [0, -0.1, 1], 3, 0.1, 0.02, '#d8e8e0'); });
    m.attach('legBL', leg); m.attach('legBR', leg);
    attachH(m, 'tail', mb => tube(mb, bez([0, 0, 0], [0, -0.1, -0.25], [0, -0.05, -0.5], 4), [0.1, 0.07, 0.04, 0.02, 0.005], T, 6));
    m.height = 1.2; m.lungeScale = 1.2; return m;
  });

  // Lessaloploth: flying wyvern with a slender tan body, one pair of big white bat wings on blue-teal bones,
  // blue-teal shoulders, arms and legs with white claws, a long hooked grey-blue beak and a long thin tail
  // shading tan -> green -> violet to a magenta tip
  reg('lessaloploth', (a) => {
    const m = rig(a); m.floats = true;
    const Bd = '#a89048', Bd2 = '#c0a858', Mg = '#c0287a', Wh = '#dcdce4', Tl = '#2a6a9a', Bk = '#7080a0', Cl = '#f0f0f0';
    m.bone('body', 'root', [0, 2.0, 0]);
    m.bone('head', 'body', [0, 0.44, 0.08], [0.45, 0, 0]);
    m.bone('wingL', 'body', [0.12, 0.28, -0.08]); m.bone('wingR', 'body', [-0.12, 0.28, -0.08]);
    m.bone('armL', 'body', [0.13, 0.16, 0.08]); m.bone('armR', 'body', [-0.13, 0.16, 0.08]);
    m.bone('legFL', 'body', [0.09, -0.36, 0.04]); m.bone('legFR', 'body', [-0.09, -0.36, 0.04]);
    m.bone('tail', 'body', [0, -0.45, -0.02]);
    attachH(m, 'body', mb => {
      tube(mb, [[0, 0.44, 0.06], [0, 0.22, 0.1], [0, -0.1, 0.06], [0, -0.45, -0.02]], [0.08, 0.14, 0.12, 0.08], (t, k) => k % 3 === 0 ? Bd2 : Bd, 7);
      [1, -1].forEach(s => ell(mb, [s * 0.13, 0.3, -0.02], [0.09, 0.08, 0.08], Tl, 6, 4));                   // blue-teal shoulders
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.04, 0.02], [0.08, 0.09, 0.1], Bk, 6, 4);
      tube(mb, bez3([0, 0.03, 0.08], [0, 0.04, 0.26], [0, -0.02, 0.42], [0, -0.14, 0.48], 5), (t) => 0.065 * (1 - t) + 0.006, Bk, 5);   // long hooked beak
      mb.blade([0, 0.1, -0.02], [0, 0.5, -1], 0.26, 0.08, 0.03, '#a0b0c8', [1, 0, 0]);                      // crest spike
    });
    attachH(m, 'head', mb => eyes(mb, 0.06, 0.07, 0.07, 0.016, '#ff4040'), { unlit: true });
    const wing = (s) => mesh(mb => batWing(mb, s, { span: 1.7, h: 0.9, col: Wh, col2: '#a0a0b0', bone: Tl, back: -0.2, r: 0.045 }));
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    const arm = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.14, 0.07], [0, -0.26, 0.03]], 0.045, 0.03, Tl); claws(mb, [0, -0.27, 0.04], [0, -1, 0.3], 3, 0.08, 0.012, Cl); });
    m.attach('armL', arm); m.attach('armR', arm);
    const leg = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.12, 0.14], [0, -0.32, 0.06]], 0.06, 0.035, Tl); claws(mb, [0, -0.33, 0.08], [0, -1, 0.4], 3, 0.09, 0.014, Cl); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    attachH(m, 'tail', mb => {
      const pts = bez3([0, 0, 0], [0, -0.6, 0.12], [0.05, -1.15, -0.12], [0.2, -1.5, 0.12], 8);
      tube(mb, pts, (t) => 0.07 - 0.052 * t, (t) => t < 0.35 ? Bd : t < 0.7 ? '#6a8a38' : '#6a3a8a', 6);
      mb.blade(pts[8], [0.3, -0.7, 0.5], 0.24, 0.16, 0.04, Mg, [1, 0, 0]);                                   // magenta tail tip
    });
    m.height = 3.2; m.lungeScale = 1.1; return m;
  });

  // ---- Frozen Nail family (Frozen Nail / Kelzmelzer): upright stick-mantis. Thin trunk on four short
  // crouched clawed legs, a long tail swept back along the ground, two small clawed mid-arms, a crested
  // head ringed by curled mandibles, and two thick jointed arms raised over the head whose long forearms
  // hang out to the sides ending in hooks. One model, per-member palette.
  function frozenNail(a, c) {
    const m = rig(a);
    m.bone('body', 'root', [0, 0.5, 0], [0.12, 0, 0]);
    m.bone('head', 'body', [0, 0.9, 0.1], [0.3, 0, 0]);
    m.bone('jaw', 'head', [0, -0.04, 0.1]);
    m.bone('armL', 'body', [0.15, 0.76, 0.03]); m.bone('armR', 'body', [-0.15, 0.76, 0.03]);
    m.bone('tail', 'body', [0, -0.02, -0.12]);
    m.bone('legFL', 'root', [0.1, 0.5, 0.07]); m.bone('legFR', 'root', [-0.1, 0.5, 0.07]);
    m.bone('legBL', 'root', [0.1, 0.48, -0.08]); m.bone('legBR', 'root', [-0.1, 0.48, -0.08]);
    attachH(m, 'body', mb => {
      ell(mb, [0, 0.0, -0.04], [0.13, 0.13, 0.15], c.side, 6, 4);                                  // pelvis
      tube(mb, [[0, 0.04, -0.01], [0, 0.4, 0.02], [0, 0.78, 0.05]], [0.085, 0.07, 0.1], c.trunk, 6);   // thin upright trunk
      tube(mb, [[0, 0.1, 0.035], [0, 0.4, 0.06], [0, 0.72, 0.09]], [0.06, 0.055, 0.075], c.stripe, 4, { cap: false }); // bright front strip
      ell(mb, [0, 0.74, 0.05], [0.16, 0.1, 0.11], c.side, 6, 4);                                    // shoulder yoke
      tube(mb, [[0, 0.78, 0.05], [0, 0.92, 0.1]], [0.07, 0.06], c.trunk, 5, { cap: false });         // neck
      [1, -1].forEach(s => [[0.56, 0.1], [0.4, -0.1]].forEach(([y, d]) => {                          // two small clawed mid-arms each side
        const sh0 = [s * 0.07, y, 0.06], el = [s * 0.27, y - 0.1 + d * 0.3, 0.12], hd = [s * 0.3, y + 0.04, 0.32];
        tube(mb, [sh0, el, hd], [0.036, 0.032, 0.024], c.mid, 4);
        cone(mb, hd, V.add(hd, [-s * 0.05, -0.06, 0.15]), 0.026, c.claw, 4);
      }));
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.04, 0.02], [0.1, 0.1, 0.14], c.head, 7, 5);                                      // wedge skull
      tube(mb, [[0, 0.02, 0.1], [0, -0.04, 0.2], [0, -0.12, 0.24]], [0.06, 0.04, 0.012], c.head2, 5); // snout
      [1, -1].forEach(s => {
        mb.blade([s * 0.05, 0.1, -0.06], [s * 0.35, 0.8, -1], 0.24, 0.1, 0.03, s > 0 ? c.crest : c.head, XY([s * 0.35, 0.8, 0]));   // swept-back crest points
        tube(mb, bez3([s * 0.08, -0.02, 0.05], [s * 0.34, 0.0, 0.08], [s * 0.34, -0.3, 0.26], [s * 0.07, -0.24, 0.3], 6), (t) => 0.04 - 0.028 * t, (t) => t < 0.5 ? c.head : c.crest, 5);   // curled mandible
      });
    });
    attachH(m, 'head', mb => eyes(mb, 0.055, 0.07, 0.11, 0.02, c.eye), { unlit: true });
    attachH(m, 'jaw', mb => [1, -1].forEach(s => cone(mb, [s * 0.03, -0.02, 0.05], [s * 0.02, -0.14, 0.09], 0.016, c.fang, 4)));
    const arm = (s) => mesh(mb => {
      const el = [s * 0.22, 0.6, -0.02], mid = [s * 0.62, 0.5, 0.12], tip = [s * 1.0, 0.18, 0.24];
      ell(mb, [s * 0.02, 0, 0], [0.075, 0.075, 0.075], c.upper, 6, 4);
      tube(mb, [[0, 0, 0], [s * 0.14, 0.32, 0.0], el], [0.065, 0.055, 0.05], c.upper, 6, { cap: false });   // upper arm, raised
      ell(mb, el, [0.075, 0.075, 0.075], sh(c.fore, -0.15), 6, 4);                                    // elbow
      horn(mb, V.add(el, [0, 0.03, -0.03]), V.add(el, [s * 0.12, 0.12, -0.12]), V.add(el, [s * 0.04, 0.2, -0.04]), 0.045, c.hook, 4, 3);   // elbow hook
      tube(mb, [el, mid, tip], [0.065, 0.05, 0.035], c.fore, 6, { cap: false });                     // long forearm hanging out to the side
      horn(mb, tip, V.add(tip, [s * 0.1, -0.16, 0.08]), V.add(tip, [-s * 0.02, -0.34, 0.14]), 0.04, c.hook, 4, 4);   // end hook
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    const leg = (s, f) => mesh(mb => {                                                               // crouched: knee out and up, foot under the body
      const kn = [s * 0.3, 0.14, f * 0.12], ft = [s * 0.5, -0.47, f * 0.3];
      tube(mb, [[0, 0, 0], kn], [0.06, 0.055], c.leg, 6, { cap: false });
      ell(mb, kn, [0.062, 0.062, 0.062], sh(c.leg, -0.15), 5, 3);
      cone(mb, kn, V.add(kn, [s * 0.1, 0.1, -f * 0.04]), 0.035, c.leg, 4);                           // knee spur
      tube(mb, [kn, V.add(L3(kn, ft, 0.45), [s * 0.04, 0, 0]), ft], [0.058, 0.045, 0.03], c.shin, 5, { cap: false });
      [-1, 1].forEach(q => cone(mb, V.add(ft, [0, 0.02, 0]), V.add(ft, [s * 0.05 + q * 0.05, -0.03, f * 0.05 + 0.1]), 0.028, c.foot, 4));
    });
    m.attach('legFL', leg(1, 1)); m.attach('legFR', leg(-1, 1)); m.attach('legBL', leg(1, -1)); m.attach('legBR', leg(-1, -1));
    attachH(m, 'tail', mb => {                                                                       // long jointed tail swept back along the ground
      const pts = bez3([0, 0, 0], [0, -0.4, -0.3], [0, -0.48, -0.9], [0, -0.2, -1.4], 6);
      tube(mb, pts, (t) => 0.08 - 0.062 * t, (t, k, i) => i % 2 ? c.tail2 : c.tail, 5);
      mb.blade(pts[3], [0, 1, -0.4], 0.18, 0.07, 0.03, c.tail2, [1, 0, 0]);
    });
    // the raised arms strike forward-down (the stock clip would swing raised arms backward)
    m.clips = {
      nail_attack: { dur: 26, loop: false, fn(mm, p) { FF7.anims.e_idle.fn(mm, 0); const k = S(Math.min(1, p) * PI); mm.b('root').pos[2] += k * 0.4; mm.b('body').rot[0] += k * 0.3; mm.b('head').rot[0] -= k * 0.2; mm.b('armL').rot[0] += k * 0.9; mm.b('armR').rot[0] += k * 0.8; mm.b('jaw').rot[0] += k * 0.5; mm.b('tail').rot[0] += k * 0.3; } },
      nail_cast: { dur: 36, loop: false, fn(mm, p) { FF7.anims.e_idle.fn(mm, 0); const k = S(Math.min(1, p) * PI); mm.b('body').rot[0] -= k * 0.2; mm.b('head').rot[0] -= k * 0.35; mm.b('armL').rot[2] += k * 0.35; mm.b('armR').rot[2] -= k * 0.35; mm.b('armL').rot[0] -= k * 0.25; mm.b('armR').rot[0] -= k * 0.25; } },
    };
    m.anims = Object.assign({}, m.anims, { attack: 'nail_attack', cast: 'nail_cast' });
    m.height = 2.0; m.scale = c.k || 1; m.lungeScale = 1.2; return m;
  }
  reg('frozen_nail', (a) => frozenNail(a, { trunk: '#6a2448', side: '#4a2a5a', stripe: '#a01c3c', mid: '#5a2a6a', claw: '#d0306a',
    head: '#c09a40', head2: '#8a6a28', crest: '#e0c060', fang: '#e04060', eye: '#80b0ff',
    upper: '#5a2a5a', fore: '#7a6a40', hook: '#d8d0a8', leg: '#5a2a5a', shin: '#a88a6a', foot: '#2a3a6a', tail: '#5a2a5a', tail2: '#7a3050' }));
  // Disc 1 (Temple of the Ancients): FF7 reuses the Frozen Nail model for Kelzmelzer (ochre trunk, bone-white head, green legs and tail)
  reg('kelzmelzer', (a) => frozenNail(a, { trunk: '#b08a30', side: '#7a5a20', stripe: '#c89a38', mid: '#2a5a4a', claw: '#d8c0f0',
    head: '#d8d0a8', head2: '#a89a78', crest: '#ece4c8', fang: '#f0c040', eye: '#ff3020',
    upper: '#6a6a2a', fore: '#a8683a', hook: '#d88040', leg: '#4a7a2a', shin: '#8a8a3a', foot: '#3a4a8a', tail: '#4a7a2a', tail2: '#6a9a3a', k: 0.9 }));

  // Snow: a pale lavender woman in a violet swimsuit
  reg('snow', (a) => {
    const sk = '#c8c2ea';
    const m = human({ base: 'man', _id: 'd23_snow', female: true, skin: sk, hair: '#e0e2f6', hairStyle: 'long', hairLen: 1.4, eyes: '#5040b0', face: { mouth: 'smile' },
      top: '#5c3aa0', topColors: (ring) => ring >= 3 ? sk : null, sleeve: 'skin', bottom: '#5c3aa0', legs: 'skin', boots: sk, shoes: true, gloves: sk }, 1.72, false);
    return m;
  });
  // Pollensalta: black-haired woman in a yellow swimsuit
  reg('pollensalta', (a) => {
    const sk = '#f2c4aa';
    const m = human({ base: 'man', _id: 'd23_pollensalta', female: true, skin: sk, hair: '#16121c', hairStyle: 'long', hairLen: 1.5, eyes: '#402030', face: { mouth: 'smile' },
      top: '#e8c020', topColors: (ring) => ring >= 3 ? sk : null, sleeve: 'skin', bottom: '#e8c020', legs: 'skin', boots: sk, shoes: true, gloves: sk }, 1.72, false);
    return m;
  });

  // Magnade: hulking orange demon, torso pitched forward, huge angular shoulders, small red-faced head in a
  // peaked purple hood with swept yellow horns, grey-blue chest straps, gold belt, grey lightning-cut
  // loincloth, thick orange legs with lilac ankle bands, dark wrist cuffs trimmed yellow
  reg('magnade', (a) => {
    const m = rig(a);
    const Sk = '#d4622c', Sk2 = '#a8441c', Sk3 = '#e8783a', Fc = '#b02818', Hd = '#5a2a9a', Hn = '#e8d040', St = '#6a7a98', Au = '#e0b030', Lc = '#a8a8b0', An = '#8a88b0';
    m.bone('body', 'root', [0, 1.06, 0], [0.2, 0, 0]);
    m.bone('head', 'body', [0, 0.9, 0.12], [-0.12, 0, 0]);
    m.bone('armL', 'body', [0.44, 0.76, 0], [-0.2, 0, 0.14]); m.bone('armR', 'body', [-0.44, 0.76, 0], [-0.2, 0, -0.14]);
    m.bone('legFL', 'root', [0.19, 1.0, 0]); m.bone('legFR', 'root', [-0.19, 1.0, 0]);
    attachH(m, 'body', mb => {
      mb.loft([{ y: -0.08, rx: 0.22, rz: 0.17 }, { y: 0.14, rx: 0.2, rz: 0.15 }, { y: 0.42, rx: 0.3, rz: 0.2 }, { y: 0.66, rx: 0.4, rz: 0.25, rzf: 0.28 }, { y: 0.84, rx: 0.36, rz: 0.22 }, { y: 0.94, rx: 0.12, rz: 0.1 }], { sides: 8, color: Sk, sq: 2.6 });
      [1, -1].forEach(s => {
        ell(mb, [s * 0.15, 0.62, 0.2], [0.17, 0.13, 0.1], Sk3, 6, 4);                                            // pecs
        tube(mb, [[s * 0.3, 0.84, 0.06], [s * 0.2, 0.62, 0.27], [s * 0.03, 0.3, 0.22]], 0.035, St, 4, { sy: 0.4 });   // chest straps
      });
      mb.box(0, 0.3, 0.23, 0.08, 0.1, 0.04, Au);                                                                 // clasp
      mb.loft([{ y: -0.04, rx: 0.24, rz: 0.19 }, { y: 0.08, rx: 0.23, rz: 0.18 }], { sides: 8, color: Au, capTop: false, capBottom: false });   // gold belt
      mb.panel([[-0.17, 0.0], [0.17, 0.0], [0.16, -0.32], [0.06, -0.27], [0.13, -0.64], [-0.05, -0.25], [0.03, -0.3], [-0.16, -0.36]], 0.2, 0.02, Lc, sh(Lc, -0.3));   // lightning-cut loincloth
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.08, 0.02], [0.11, 0.13, 0.12], Fc, 7, 5);                                                   // red demon face
      mb.box(0, 0.12, 0.12, 0.17, 0.035, 0.04, sh(Fc, -0.35));                                                   // angry brow
      tube(mb, [[0, 0.02, 0.1], [0, -0.04, 0.14]], [0.035, 0.025], Fc, 4);                                      // nose / muzzle
      mb.loft([{ y: 0.04, rx: 0.14, rz: 0.15, z: -0.03 }, { y: 0.16, rx: 0.14, rz: 0.15, z: -0.04 }, { y: 0.26, rx: 0.08, rz: 0.1, z: -0.07 }, { y: 0.36, rx: 0.01, rz: 0.02, z: -0.12 }], { sides: 7, color: Hd, arc: [-PI * 0.15, PI * 1.15] });   // peaked hood (open at the face)
      [1, -1].forEach(s => horn(mb, [s * 0.1, 0.14, -0.02], [s * 0.36, 0.16, -0.06], [s * 0.46, 0.4, -0.1], 0.045, Hn, 5, 4));   // swept horns
    });
    attachH(m, 'head', mb => eyes(mb, 0.045, 0.1, 0.12, 0.018, '#60f0ff', 0.012), { unlit: true });
    const arm = (s) => mesh(mb => {
      const el = [s * 0.04, -0.46, -0.03], wr = [s * 0.02, -0.86, 0.08];
      mb.sphere(s * 0.04, 0.02, 0, 0.21, 0.2, 0.2, Sk, 6, 4, false);                                            // huge angular deltoid
      tube(mb, [[0, 0, 0], L3([0, 0, 0], el, 0.5), el], [0.13, 0.13, 0.1], Sk, 6, { cap: false });
      ell(mb, V.add(L3([0, 0, 0], el, 0.5), [0, 0, 0.05]), [0.1, 0.14, 0.09], Sk3, 5, 4);                       // biceps
      tube(mb, [el, L3(el, wr, 0.5), wr], [0.1, 0.11, 0.085], Sk2, 6, { cap: false });
      tube(mb, [L3(el, wr, 0.62), L3(el, wr, 0.9)], 0.105, '#3a3a48', 6, { cap: false });                      // dark wrist cuff
      tube(mb, [L3(el, wr, 0.6), L3(el, wr, 0.66)], 0.11, Au, 6, { cap: false });                               // yellow trim
      mb.sphere(wr[0], wr[1] - 0.08, wr[2] + 0.02, 0.1, 0.1, 0.11, Sk, 6, 4, false);                              // fist
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    const leg = (s) => mesh(mb => {
      const kn = [s * 0.08, -0.45, 0.15], an = [s * 0.12, -0.87, -0.02];
      tube(mb, [[0, 0, 0], L3([0, 0, 0], kn, 0.5), kn], [0.15, 0.15, 0.115], Sk, 6, { cap: false });
      ell(mb, kn, [0.12, 0.12, 0.12], Sk2, 5, 4);
      tube(mb, [kn, L3(kn, an, 0.4), an], [0.115, 0.12, 0.085], Sk, 6, { cap: false });
      tube(mb, [V.add(an, [0, 0.1, 0]), V.add(an, [0, -0.02, 0])], 0.11, An, 6, { cap: false });                // ankle band
      mb.frustum(an[0], -1.0, an[2] + 0.07, 0.19, 0.32, 0.14, 0.2, 0.12, Sk2);                                  // foot
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 2.35; m.lungeScale = 1.0; return m;
  });

  // Headbomber: fat yellow bird-man, blue crest, white bib with a black 怒 ("rage") kanji, blue shorts
  let headbomberTex = null;
  function kanjiTex() {
    if (headbomberTex) return headbomberTex;
    const T = FF7.tex, t = T.create(32, 32, '#f4f4f0'), k = '#141414';
    // 奴 (top) over 心 (bottom), brush-stroke approximation
    T.line(t, 6, 3, 13, 14, 2.4, k); T.line(t, 12, 4, 6, 13, 2.2, k); T.line(t, 4, 8, 15, 8, 2, k);
    T.line(t, 17, 4, 27, 4, 2.2, k); T.line(t, 26, 4, 18, 14, 2.4, k); T.line(t, 19, 7, 28, 14, 2.2, k);
    T.curve(t, [[7, 20], [9, 27], [15, 28], [22, 28], [24, 24]], 2.4, k);
    T.line(t, 4, 22, 6, 26, 2, k); T.line(t, 14, 18, 16, 22, 2, k); T.line(t, 25, 18, 28, 23, 2, k);
    return (headbomberTex = t);
  }

  // Malboro: huge green maw covered in shaggy tentacles with dark red nodules
  reg('malboro', (a) => {
    const m = rig(a); const G = '#6c8c2c', G2 = '#4a6a1c', G3 = '#88a840', Tip = '#e8e8c0', R = '#6a1a20', Lip = '#8a2a3a';
    m.bone('body', 'root', [0, 1.2, 0]);
    m.bone('jaw', 'body', [0, -0.12, 0.5]);
    for (let i = 0; i < 6; i++) { const an = (i / 6) * PI * 2 + 0.3; m.bone('t' + i, 'body', [C(an) * 0.75, -0.95, S(an) * 0.6], [0, -an + PI / 2, 0]); }
    const rnd = U.rng(U.strSeed('malboro'));
    attachH(m, 'body', mb => {
      ell(mb, [0, 0, 0], [1.05, 1.0, 0.85], G, 10, 8, (i, j) => (i + j) % 3 === 0 ? G2 : G);
      mb.sphere(0, 0.12, 0.5, 0.72, 0.44, 0.38, '#2a0e36', 10, 6);                    // maw
      const lip = []; for (let i = 0; i <= 16; i++) { const an = (i / 16) * PI * 2; lip.push([C(an) * 0.8, 0.12 + S(an) * 0.5, 0.74 - 0.12 * Math.abs(C(an))]); }
      tube(mb, lip, 0.11, Lip, 6, { cap: false });
      teethRow(mb, [0.62, 0.42, 0.78], [-0.62, 0.42, 0.78], 12, [0, -1, 0.05], 0.22, '#ece4b8');
      for (let i = 0; i < 70; i++) {
        const u = rnd() * PI * 2, v = -0.5 + rnd() * 1.95, d = [C(u) * C(v), S(v), S(u) * C(v)];
        if (d[2] > 0.5 && d[1] > -0.5 && d[1] < 0.75 && Math.abs(d[0]) < 0.85) continue;
        const p = [d[0] * 0.98, d[1] * 0.93, d[2] * 0.8];
        const len = 0.45 + rnd() * 0.45, dd = V.norm(V.add(d, [0, -0.2, 0]));
        tube(mb, [p, V.add(p, V.add(V.scale(dd, len * 0.55), [0, -0.05, 0])), V.add(p, V.add(V.scale(dd, len), [0, -0.16, 0]))], [0.11, 0.07, 0.004], (t) => t > 0.5 ? mix(i % 3 ? G : G3, Tip, 0.6) : (i % 3 ? G : G3), 5);
        if (i % 3 === 0) mb.sphere(p[0] * 1.03, p[1] * 1.03, p[2] * 1.03, 0.08, 0.08, 0.08, R, 5, 3);
      }
    });
    attachH(m, 'jaw', mb => { teethRow(mb, [0.5, -0.32, 0.26], [-0.5, -0.32, 0.26], 10, [0, 1, 0.05], 0.2, '#ece4b8'); });
    for (let i = 0; i < 6; i++) attachH(m, 't' + i, mb => { tube(mb, [[0, 0, 0], [0, -0.15, 0.45], [0, -0.22, 1.0]], [0.16, 0.1, 0.01], G2, 5); });
    m.height = 2.3; m.lungeScale = 0.5; return m;
  });

  // Blue Dragon: large purple-blue dragon with an olive belly, grey spines and bat wings
  reg('blue_dragon', (a) => {
    const B = '#4436a4', B2 = '#2c2270', Bel = '#a8a060', Sp = '#c8c8d8';
    const m = beast(a, { h: 1.55, len: 2.2, head: [0, 0.55, 1.05], headRot: [0.2, 0, 0], jaw: [0, -0.1, 0.18], legX: 0.45, legZ: 0.65, legZb: -0.7, tail: [0, 0, -1.1] });
    m.bone('wingL', 'body', [0.35, 0.45, 0.3]); m.bone('wingR', 'body', [-0.35, 0.45, 0.3]);
    attachH(m, 'body', mb => {
      ell(mb, [0, 0, 0], [0.62, 0.62, 1.15], B, 10, 7, (i, j, p) => (p[1] < -0.1 && Math.abs(p[0]) < 0.45) ? Bel : B);
      tube(mb, [[0, 0.2, 0.7], [0, 0.45, 0.95], [0, 0.55, 1.05]], [0.35, 0.28, 0.24], B, 7);
      for (let i = 0; i < 8; i++) mb.blade([0, 0.6 - Math.abs(i - 2) * 0.04, 0.8 - i * 0.28], [0, 1, -0.6], 0.34, 0.16, 0.05, Sp, [0, 0, 1]);
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.08, 0.1], [0.26, 0.24, 0.3], B);
      tube(mb, [[0, 0.04, 0.25], [0, 0.0, 0.62]], [0.16, 0.1], B, 6);
      [1, -1].forEach(s => { horn(mb, [s * 0.14, 0.22, -0.02], [s * 0.3, 0.4, -0.25], [s * 0.35, 0.35, -0.6], 0.06, Sp, 5); mb.blade([s * 0.2, 0.1, 0.05], [s, 0.2, -0.6], 0.3, 0.12, 0.04, B2); });
    });
    attachH(m, 'head', mb => eyes(mb, 0.13, 0.16, 0.3, 0.035, '#ff2020'), { unlit: true });
    attachH(m, 'jaw', mb => { tube(mb, [[0, -0.02, 0.0], [0, -0.06, 0.42]], [0.14, 0.07], B2, 6); mb.sphere(0, 0.03, 0.25, 0.1, 0.03, 0.18, '#e06020', 6, 3); teethRow(mb, [0.08, 0.02, 0.2], [0.05, 0.0, 0.42], 3, [0, 1, 0], 0.07, '#f0f0f0'); teethRow(mb, [-0.08, 0.02, 0.2], [-0.05, 0.0, 0.42], 3, [0, 1, 0], 0.07, '#f0f0f0'); });
    const w = (s) => mesh(mb => batWing(mb, s, { span: 2.4, h: 1.3, col: '#5a44b8', col2: '#34287a', bone: B2, back: -0.35, claw: Sp }));
    m.attach('wingL', w(1)); m.attach('wingR', w(-1));
    const fl = beastLeg(1.4, { r0: 0.2, r1: 0.1, col: B, claw: Sp, thigh: true, clawLen: 0.18, nClaw: 3 });
    const bl = beastLeg(1.45, { r0: 0.24, r1: 0.11, col: B, claw: Sp, thigh: true, back: true, knee: 0.18, clawLen: 0.18 });
    m.attach('legFL', fl); m.attach('legFR', fl); m.attach('legBL', bl); m.attach('legBR', bl);
    attachH(m, 'tail', mb => { const pts = bez3([0, 0, 0], [0, -0.3, -0.8], [0.4, -1.3, -1.2], [0.8, -1.45, -2.0], 8); tube(mb, pts, (t) => 0.4 * (1 - t) + 0.02, B, 7); pts.slice(1, 7).forEach((p, i) => mb.blade(V.add(p, [0, 0.3 * (1 - i / 7), 0]), [0, 1, -0.5], 0.25 - i * 0.02, 0.1, 0.04, Sp, [0, 0, 1])); });
    m.height = 3.1; m.lungeScale = 1.0; return m;
  });

  // Icicle: a cluster of great ice stalactites hanging from the cave roof
  reg('icicle', (a) => {
    const m = rig(a); m.floats = true;
    const I = '#d8f4ff', I2 = '#86bce4', I3 = '#b0dcf4';
    m.bone('body', 'root', [0, 3.4, 0]);
    attachH(m, 'body', mb => {
      ell(mb, [0, 0.1, 0], [0.8, 0.3, 0.6], I3, 8, 4, (i, j) => j % 2 ? I2 : I3);
      const spk = [[0, 0, 0.1, 2.7, 0.3], [0.35, 0, -0.05, 2.0, 0.22], [-0.38, 0, 0.0, 2.2, 0.24], [0.2, 0, 0.35, 1.6, 0.18], [-0.2, 0, 0.35, 1.8, 0.2], [0.5, 0, 0.25, 1.2, 0.15], [-0.55, 0, -0.25, 1.4, 0.16], [0.1, 0, -0.35, 1.5, 0.18], [0.55, 0, -0.3, 0.9, 0.13]];
      spk.forEach(([x, y, z, L, r]) => tube(mb, [[x, y, z], [x * 0.95, y - L * 0.5, z * 0.95], [x * 0.9, y - L, z * 0.9]], [r, r * 0.55, 0.004], (t, k) => k % 2 ? I : mix(I, I2, t * 0.6), 6, { flat: true }));
    });
    m.height = 3.3; m.lungeScale = 0.2; return m;
  });

  // Evilhead: small tan bat with huge ears and yellow wings
  reg('evilhead', (a) => {
    const m = rig(a); m.floats = true;
    const B = '#b48a5c', B2 = '#7a5a38', Y = '#e8c430';
    m.bone('body', 'root', [0, 1.6, 0]);
    m.bone('head', 'body', [0, 0.18, 0.03]);
    m.bone('wingL', 'body', [0.1, 0.08, -0.02]); m.bone('wingR', 'body', [-0.1, 0.08, -0.02]);
    m.bone('legFL', 'body', [0.06, -0.16, 0]); m.bone('legFR', 'body', [-0.06, -0.16, 0]);
    attachH(m, 'body', mb => ell(mb, [0, 0, 0], [0.13, 0.17, 0.12], B, 8, 6, (i, j) => j > 3 ? '#d4b088' : B));
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.06, 0.02], [0.11, 0.1, 0.1], B);
      ell(mb, [0, 0.03, 0.1], [0.05, 0.04, 0.05], '#c89a70');
      [1, -1].forEach(s => { mb.blade([s * 0.06, 0.12, 0], [s * 0.5, 1, -0.1], 0.26, 0.14, 0.03, B, XY([s * 0.5, 1, 0])); mb.blade([s * 0.06, 0.13, 0.015], [s * 0.5, 1, -0.1], 0.2, 0.08, 0.02, '#e0a0a0', XY([s * 0.5, 1, 0])); cone(mb, [s * 0.025, 0.0, 0.12], [s * 0.02, -0.06, 0.13], 0.012, '#ffffff', 3); });
    });
    attachH(m, 'head', mb => eyes(mb, 0.045, 0.08, 0.1, 0.018, '#ff2020'), { unlit: true });
    const w = (s) => mesh(mb => batWing(mb, s, { span: 0.9, h: 0.55, col: Y, col2: '#b09020', bone: '#8a6a20', back: -0.2 }));
    m.attach('wingL', w(1)); m.attach('wingR', w(-1));
    const leg = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.1, -0.02]], 0.025, 0.015, B2); claws(mb, [0, -0.1, -0.01], [0, -1, 0.2], 3, 0.05, 0.007, '#f0f0f0'); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 1.9; m.lungeScale = 1.2; return m;
  });

  // Schizo: one hulking crouched teal two-headed beast — a pot-bellied lumpy body on a cream ringed belly plate,
  // short clawed forelimbs planted in front, heavy haunches, a long tail with blue spines ending in a bony claw,
  // and two long bone-white ringed necks: right = fire head (red, gold horn crest; on the model's left, +x, as
  // on the poster), left = ice head (bone-white skull with pale spikes). Each head is its own combatant: the
  // model origin sits under its own head (so each keeps its own cursor), schizo_left is mounted on
  // schizo_right with CR.anchor. Both carry the (static) body — the left one a 3% smaller copy hidden inside —
  // so whichever head dies first, the survivor still stands on a whole body. The clips move only neck and head.
  function schizoBody(mb, cx) {
    const B = '#2a6a58', B2 = '#1e5646', B3 = '#347a66', Bel = '#c8b898', Bel2 = '#ae9e80', Sp = '#2a58c0', Cl = '#f0f0e0', Bn = '#b8a078';
    const lump = (i, j) => ((i * 3 + j * 5) % 7 === 0 ? B2 : (i + j) % 5 === 0 ? B3 : B);
    mb.push(); mb.translate(cx, 0, 0);
    ell(mb, [0, 1.3, -0.2], [1.25, 0.95, 1.1], B, 10, 7, lump);
    ell(mb, [0, 1.85, -0.4], [0.95, 0.62, 0.8], B, 8, 5, lump);
    [1, -1].forEach(s => {
      ell(mb, [s * 0.92, 1.72, 0.3], [0.52, 0.46, 0.52], B3, 7, 5);                                  // shoulder lump
      ell(mb, [s * 1.02, 0.82, -0.35], [0.52, 0.66, 0.72], B, 7, 5, lump);                           // haunch
      ell(mb, [s * 1.12, 0.13, 0.05], [0.34, 0.13, 0.5], B2, 6, 3);                                   // hind foot
      claws(mb, [s * 1.12, 0.14, 0.48], [0, -0.3, 1], 3, 0.24, 0.05, Cl, 0.9);
      tube(mb, [[s * 0.95, 1.62, 0.5], [s * 1.12, 0.95, 0.72], [s * 1.18, 0.28, 0.88]], [0.3, 0.26, 0.2], B3, 7); // short thick forelimb
      ell(mb, [s * 1.18, 0.18, 0.92], [0.24, 0.12, 0.28], B2, 6, 3);
      claws(mb, [s * 1.18, 0.2, 1.12], [0, -0.3, 1], 3, 0.24, 0.045, Cl, 0.9);
    });
    // cream ringed belly plate rising toward the necks
    ell(mb, [0, 1.3, 0.72], [0.7, 0.86, 0.42], Bel, 8, 7, (i, j) => j % 2 ? Bel : Bel2);
    mb.pop();
  }
  function schizoTail(mb) {
    const B = '#2a6a58', Sp = '#2a58c0', Bn = '#b8a078';
    const pts = bez3([0, 0, 0], [-0.4, -0.35, -0.7], [-1.1, -0.75, -1.2], [-2.0, -0.78, -1.5], 8);
    tube(mb, pts, (t) => 0.42 * (1 - t) + 0.07, B, 7);
    pts.slice(1, 8).forEach((p, i) => mb.blade(V.add(p, [0, 0.3 - i * 0.03, 0]), [0.1, 1, -0.3], 0.34 - i * 0.025, 0.16, 0.05, Sp, [1, 0, 0.3]));
    const e = pts[pts.length - 1];
    for (let i = 0; i < 4; i++) horn(mb, e, V.add(e, [-0.25, 0.05, (i - 1.5) * 0.12]), V.add(e, [-0.5, -0.05, (i - 1.5) * 0.24]), 0.05, Bn, 4, 3);
  }
  function schizo(a, right) {
    const m = rig(a);
    const g = right ? 1 : -1;                     // side of the body this head's neck rises on (+x = model's left)
    const cx = -g * 0.9;                          // body centre, relative to this part's origin (under its head)
    const Bel = '#c8b898', Bel2 = '#a8987a', Str = '#b04828';
    const Hc = right ? '#b8321e' : '#d8d0c0', Hc2 = right ? '#e8b030' : '#f0ece4', Hd = right ? '#701810' : '#a89a88', Mo = '#a01828';
    m.bone('hull', 'root', [0, 0, 0]);
    m.bone('tailS', 'hull', [cx, 1.0, -1.15]);
    m.bone('body', 'root', [cx + g * 0.3, 2.1, 0.5]);   // neck base
    const nk = right ? [[0, 0, 0], [g * 0.1, 0.75, 0.05], [g * 0.5, 1.4, -0.08], [g * 0.72, 1.86, 0.2], [g * 0.66, 2.02, 0.5]]
      : [[0, 0, 0], [g * 0.15, 0.6, 0.12], [g * 0.52, 1.05, 0.02], [g * 0.7, 1.4, 0.28], [g * 0.62, 1.5, 0.58]];
    const hp = nk[nk.length - 1];
    m.bone('head', 'body', hp, [0.45, 0, 0]);
    m.bone('jaw', 'head', [0, -0.13, 0.2]);
    attachH(m, 'hull', mb => { if (right) schizoBody(mb, cx); else { mb.push(); mb.translate(cx, 1.3, 0); mb.scale(0.97); mb.translate(-cx, -1.3, 0); schizoBody(mb, cx); mb.pop(); } });
    attachH(m, 'tailS', mb => { if (!right) mb.scale(0.97); schizoTail(mb); });
    // bone-white ringed neck (the fire neck with a red-orange stripe down its back)
    attachH(m, 'body', mb => {
      const pts = mb.curvePts(nk, 3);
      tube(mb, pts, (t) => 0.33 - 0.14 * t, (t, k, i) => right && (k === 4 || k === 5) ? Str : i % 2 ? Bel : Bel2, 8);
    });
    attachH(m, 'head', mb => {
      mb.scale(1.3);
      ell(mb, [0, 0.06, 0.02], [0.28, 0.26, 0.32], Hc, 8, 6);
      tube(mb, [[0, 0.04, 0.2], [0, 0.0, 0.62]], [0.19, 0.12], Hc, 6);
      ell(mb, [0, 0.14, 0.2], [0.2, 0.08, 0.2], Hd, 6, 3);                                  // brow ridge
      for (let i = 0; i < 5; i++) mb.blade([(i - 2) * 0.08, 0.22, -0.06], [(i - 2) * 0.4, 1, -0.85], 0.46 - Math.abs(i - 2) * 0.07, 0.12, 0.05, Hc2);
      [1, -1].forEach(q => mb.blade([q * 0.22, 0.06, -0.06], [q, 0.2, -1], 0.4, 0.15, 0.05, right ? Hc2 : Hd));
      if (!right) [1, -1].forEach(q => disc(mb, [q * 0.12, 0.12, 0.3], 0.07, 0.06, '#3a3028', 5));   // skull sockets
    });
    attachH(m, 'head', mb => { mb.scale(1.3); eyes(mb, 0.13, 0.12, 0.32, 0.035, right ? '#ffe040' : '#ff8040'); }, { unlit: true });
    attachH(m, 'jaw', mb => {
      mb.scale(1.3);
      tube(mb, [[0, -0.02, 0], [0, -0.06, 0.42]], [0.16, 0.08], Hd, 6);
      tube(mb, [[0, 0.02, 0.02], [0, 0.0, 0.38]], [0.11, 0.05], Mo, 5);
      teethRow(mb, [0.1, 0.03, 0.12], [0.05, 0.01, 0.4], 3, [0, 1, 0], 0.09, '#f8f8f0'); teethRow(mb, [-0.1, 0.03, 0.12], [-0.05, 0.01, 0.4], 3, [0, 1, 0], 0.09, '#f8f8f0');
    });
    // the body never moves with the clips (so the two copies stay together); the tail sways on the global clock
    m.onPose = (mm) => {
      mm.root.pos[0] = 0; mm.root.pos[1] = 0; mm.root.pos[2] = 0;
      mm.b('tailS').rot[1] = S((FF7.frame || 0) * 0.03) * 0.12;
    };
    m.height = right ? 4.75 : 4.45; m.lungeScale = 0;
    return right ? m : CR.anchor(m, 'schizo_right', [-1.8, 0, 0]);
  }
  reg('schizo_right', (a) => schizo(a, true));
  reg('schizo_left', (a) => schizo(a, false));

  // Gigas: hulking lavender giant in a deep squat, torso pitched far forward, small head sunk between huge
  // trapezius and shoulders, bulging arms with the big hands resting on the wide-set knees; green loincloth,
  // pale wristbands, dark boots, purple topknot
  reg('gigas', (a) => {
    const m = rig(a); const Sk = '#8c86b4', Sk2 = '#6a6494', Sk3 = '#a09ac4', Lc = '#6e7c42', Bt = '#3a3650', Wb = '#9ab0c0';
    const lean = 0.6;
    m.bone('body', 'root', [0, 1.5, -0.1], [lean, 0, 0]);
    m.bone('head', 'body', [0, 1.1, 0.34], [-lean + 0.05, 0, 0]);
    m.bone('armL', 'body', [0.9, 0.88, 0.02], [-lean, 0, 0]); m.bone('armR', 'body', [-0.9, 0.88, 0.02], [-lean, 0, 0]);
    m.bone('legFL', 'root', [0.42, 1.42, 0]); m.bone('legFR', 'root', [-0.42, 1.42, 0]);
    attachH(m, 'body', mb => {
      mb.loft([{ y: -0.34, rx: 0.52, rz: 0.38 }, { y: 0.1, rx: 0.56, rz: 0.42 }, { y: 0.55, rx: 0.82, rz: 0.5, rzf: 0.58 }, { y: 0.9, rx: 0.98, rz: 0.54 }, { y: 1.1, rx: 0.62, rz: 0.44 }, { y: 1.2, rx: 0.24, rz: 0.22 }], { sides: 10, color: Sk });
      [1, -1].forEach(s => ell(mb, [s * 0.3, 0.72, 0.32], [0.32, 0.24, 0.22], Sk3, 7, 5));                                  // pecs
      ell(mb, [0, 1.02, 0.02], [0.6, 0.24, 0.36], Sk, 8, 4);                                                                // trapezius hump
      [0.36, 0.14].forEach(y => [1, -1].forEach(s => ell(mb, [s * 0.14, y, 0.37], [0.13, 0.09, 0.07], Sk2, 5, 3)));         // abs
      mb.loft([{ y: -0.44, rx: 0.58, rz: 0.42 }, { y: -0.22, rx: 0.6, rz: 0.44 }], { sides: 10, color: Lc });              // loincloth belt
    });
    attachH(m, 'root', mb => sheet(mb, [[-0.36, 1.36, 0.36], [0.36, 1.36, 0.36], [0.4, 0.8, 0.58], [0.04, 0.66, 0.62], [-0.34, 0.78, 0.56]], Lc, sh(Lc, -0.2)));   // loincloth flap hanging between the knees
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.14, 0.02], [0.2, 0.24, 0.22], Sk, 8, 5);
      mb.box(0, 0.2, 0.18, 0.32, 0.06, 0.08, Sk2);                                                                          // heavy brow
      tube(mb, bez3([0, 0.34, -0.02], [0, 0.55, -0.05], [0.02, 0.62, -0.25], [0.06, 0.5, -0.45], 4), [0.07, 0.08, 0.06, 0.035, 0.005], '#7a2a8a', 5);   // topknot
    });
    attachH(m, 'head', mb => eyes(mb, 0.08, 0.15, 0.2, 0.03, '#ff8020', 0.02), { unlit: true });
    // arm authored in world-aligned space (the bone cancels the torso pitch): elbow out and back, forearm forward, hand on the knee
    const arm = (s) => mesh(mb => {
      const el = [s * 0.22, -0.66, -0.12], wr = [-s * 0.14, -0.96, 0.4];
      ell(mb, [s * 0.06, 0.02, 0], [0.36, 0.34, 0.36], Sk, 7, 5);                                                          // deltoid
      tube(mb, [[0, 0, 0], L3([0, 0, 0], el, 0.5), el], [0.27, 0.28, 0.23], Sk, 7, { cap: false });                        // upper arm
      ell(mb, V.add(L3([0, 0, 0], el, 0.5), [0, 0, 0.1]), [0.2, 0.26, 0.18], Sk3, 6, 4);                                   // biceps
      tube(mb, [el, L3(el, wr, 0.4), wr], [0.24, 0.27, 0.2], Sk, 7);                                                        // forearm
      tube(mb, [L3(el, wr, 0.82), L3(el, wr, 1.02)], 0.225, Wb, 7, { cap: false });                                        // wristband
      mb.push(); mb.translate(wr[0] - s * 0.02, wr[1] - 0.12, wr[2] + 0.14); mb.rotate(0.5, 0, 0);
      mb.frustum(0, -0.1, 0, 0.5, 0.36, 0.46, 0.34, 0.26, Sk);                                                               // big hand draped over the knee
      for (let i = 0; i < 4; i++) mb.box((i - 1.5) * 0.115, -0.2, 0.08, 0.1, 0.26, 0.14, i % 2 ? Sk2 : Sk);
      mb.box(s * 0.26, -0.02, 0.1, 0.1, 0.2, 0.12, Sk2);                                                                    // thumb
      mb.pop();
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    // deep squat: thigh forward and out to a wide knee, shin down and back to the boot
    const leg = (s) => mesh(mb => {
      const kn = [s * 0.26, -0.32, 0.76], an = [s * 0.3, -1.2, 0.5];
      tube(mb, [[0, 0, 0], L3([0, 0, 0], kn, 0.5), kn], [0.36, 0.34, 0.27], Sk, 8, { cap: false });                        // thigh
      ell(mb, kn, [0.28, 0.26, 0.28], Sk, 6, 4);                                                                            // knee
      tube(mb, [kn, L3(kn, an, 0.4), an], [0.27, 0.28, 0.19], Sk, 7, { cap: false });                                      // shin / calf
      mb.frustum(an[0], -1.42, an[2] + 0.08, 0.46, 0.72, 0.38, 0.46, 0.3, Bt); mb.box(an[0], -1.39, an[2] + 0.12, 0.48, 0.06, 0.78, sh(Bt, 0.3));   // boot
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 2.95; m.scale = 1.15; m.lungeScale = 0.7; return m;
  });

  // Grenade: floating dark bomb with a spiky crown, angry orange eyes and a jagged grin
  reg('grenade', (a) => {
    const m = rig(a); m.floats = true; const B = '#4a4e6c', B2 = '#343650';
    m.bone('body', 'root', [0, 1.05, 0]);
    m.bone('armL', 'body', [0.45, -0.05, 0.05], [0, 0, 0.9]); m.bone('armR', 'body', [-0.45, -0.05, 0.05], [0, 0, -0.9]);
    attachH(m, 'body', mb => {
      ell(mb, [0, 0, 0], [0.48, 0.44, 0.44], B, 10, 7, (i, j) => j > 4 ? B2 : B);
      for (let i = 0; i < 11; i++) { const an = (i / 11) * PI * 2; mb.blade([C(an) * 0.2, 0.4, S(an) * 0.2], [C(an) * 0.6, 1, S(an) * 0.6], 0.2 + (i % 2) * 0.08, 0.1, 0.05, '#9aa0b8'); }
      mb.sphere(0, -0.12, 0.34, 0.3, 0.12, 0.1, '#401010', 8, 4);
      teethRow(mb, [0.26, -0.06, 0.39], [-0.26, -0.06, 0.39], 8, [0, -1, 0.1], 0.1, '#f0f0f0');
      teethRow(mb, [0.22, -0.2, 0.38], [-0.22, -0.2, 0.38], 7, [0, 1, 0.1], 0.08, '#f0f0f0');
      [1, -1].forEach(s => mb.blade([s * 0.05, 0.2, 0.42], [s, 0.35, 0.2], 0.2, 0.06, 0.03, B2, [0, 1, 0]));
    });
    attachH(m, 'body', mb => { [1, -1].forEach(s => mb.sphere(s * 0.14, 0.1, 0.39, 0.07, 0.05, 0.03, '#ffa020', 6, 4)); }, { unlit: true });
    const arm = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.2, 0.05]], 0.06, 0.05, B); claws(mb, [0, -0.22, 0.06], [0, -1, 0.3], 3, 0.12, 0.018, '#b0b4c8', 1.2); });
    m.attach('armL', arm); m.attach('armR', arm);
    m.height = 1.5; m.lungeScale = 1.3; return m;
  });

  // Gremlin: small green imp with big pointed ears, a shaggy green beard and long spindly tan limbs
  reg('gremlin', (a) => {
    const m = rig(a); const G = '#6a8a30', Bd = '#4a6a18', T = '#b09050', T2 = '#8a6a38';
    m.bone('body', 'root', [0, 0.62, 0], [0.35, 0, 0]);
    m.bone('head', 'body', [0, 0.28, 0.08], [-0.3, 0, 0]);
    m.bone('jaw', 'head', [0, -0.02, 0.12]);
    m.bone('armL', 'body', [0.16, 0.2, 0.02], [-0.6, 0, 0.6]); m.bone('armR', 'body', [-0.16, 0.2, 0.02], [-0.3, 0, -0.9]);
    m.bone('legFL', 'root', [0.14, 0.5, 0]); m.bone('legFR', 'root', [-0.14, 0.5, 0]);
    attachH(m, 'body', mb => ell(mb, [0, 0.08, 0], [0.16, 0.2, 0.13], G));
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.1, 0.02], [0.2, 0.17, 0.17], G);
      [1, -1].forEach(s => mb.blade([s * 0.17, 0.14, -0.02], [s, 0.45, -0.25], 0.28, 0.14, 0.03, T, [0, 1, 0]));
      for (let i = 0; i < 9; i++) { const an = PI * (0.1 + 0.8 * i / 8); mb.blade([C(an) * 0.15, 0.02 - S(an) * 0.05, 0.1], [C(an) * 0.4, -1, 0.3], 0.18, 0.08, 0.03, i % 2 ? Bd : '#3a5a10'); }
      mb.sphere(0, 0.07, 0.19, 0.1, 0.03, 0.02, '#3a1010', 6, 3);
      teethRow(mb, [0.07, 0.085, 0.2], [-0.07, 0.085, 0.2], 5, [0, -1, 0.2], 0.035, '#f0f0e0');
      mb.blade([0, 0.2, 0.1], [0, 0.4, 1], 0.08, 0.06, 0.04, T);
    });
    attachH(m, 'head', mb => eyes(mb, 0.07, 0.15, 0.16, 0.025, '#ffffff', 0.018), { unlit: true });
    const arm = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.28, 0.08], [0, -0.52, 0.2]], 0.035, 0.025, T, 5); claws(mb, [0, -0.54, 0.22], [0, -0.6, 1], 4, 0.14, 0.012, T2, 1.2); });
    m.attach('armL', arm); m.attach('armR', arm);
    const leg = (s) => mesh(mb => { limb(mb, [[0, 0, 0], [s * 0.18, -0.12, 0.2], [s * 0.2, -0.46, 0.1]], 0.04, 0.03, T, 5); claws(mb, [s * 0.2, -0.48, 0.12], [0, -0.2, 1], 3, 0.1, 0.012, T2); });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 1.1; m.lungeScale = 1.3; return m;
  });

  // Ironite: pale pink wyvern gliding with wide, flat wings and a long whip tail
  reg('ironite', (a) => {
    const m = rig(a); m.floats = true; const P = '#e8c4cc', P2 = '#c89aaa', Wh = '#f4eef0', Bl = '#303a90';
    m.bone('body', 'root', [0, 1.6, 0], [0.25, 0, 0]);
    m.bone('head', 'body', [0, -0.05, 0.55], [0.35, 0, 0]);
    m.bone('jaw', 'head', [0, -0.05, 0.1]);
    m.bone('wingL', 'body', [0.1, 0.05, 0.12]); m.bone('wingR', 'body', [-0.1, 0.05, 0.12]);
    m.bone('tail', 'body', [0, 0, -0.35]);
    attachH(m, 'body', mb => { ell(mb, [0, 0, 0], [0.14, 0.13, 0.38], P); tube(mb, [[0, 0.02, 0.25], [0, 0.0, 0.45], [0, -0.04, 0.55]], [0.1, 0.08, 0.07], P, 6); [1, -1].forEach(s => { limb(mb, [[s * 0.08, -0.05, -0.15], [s * 0.1, -0.2, -0.25], [s * 0.08, -0.3, -0.12]], 0.04, 0.025, P2, 5); claws(mb, [s * 0.08, -0.31, -0.1], [0, -0.3, 1], 3, 0.06, 0.008, Bl); }); });
    attachH(m, 'head', mb => { ell(mb, [0, 0.03, 0.08], [0.1, 0.1, 0.16], Wh); [1, -1].forEach(s => { horn(mb, [s * 0.05, 0.08, -0.02], [s * 0.1, 0.12, -0.12], [s * 0.08, 0.12, -0.25], 0.025, Bl, 4); mb.blade([s * 0.08, 0.05, 0.02], [s, 0.2, -0.5], 0.12, 0.05, 0.02, Wh); }); });
    attachH(m, 'head', mb => eyes(mb, 0.06, 0.07, 0.17, 0.018, '#ff4020'), { unlit: true });
    attachH(m, 'jaw', mb => { tube(mb, [[0, -0.01, 0], [0, -0.03, 0.14]], [0.05, 0.02], Wh, 5); });
    const w = (s) => mesh(mb => batWing(mb, s, { span: 1.35, h: 0.35, col: '#f0d0d8', col2: '#c8a0b0', bone: '#e08a9a', back: -0.2, tips: [[1, 0.3, -0.4], [0.92, -0.2, -0.55], [0.7, -0.5, -0.5], [0.4, -0.6, -0.35]] }));
    m.attach('wingL', w(1)); m.attach('wingR', w(-1));
    attachH(m, 'tail', mb => { tube(mb, bez3([0, 0, 0], [0, 0.1, -0.5], [0.1, 0.25, -1.0], [0.25, 0.5, -1.4], 8), (t) => 0.07 * (1 - t) + 0.006, P, 5); mb.blade([0.25, 0.5, -1.4], [0.3, 0.6, -0.7], 0.14, 0.08, 0.02, '#c02a6a', [1, 0, 0]); });
    m.height = 1.9; m.lungeScale = 1.2; return m;
  });

  // Sculpture: a grey stone tablet on golden feet with a crimson panel and two blue flame finials
  reg('sculpture', (a) => {
    const m = rig(a); m.floats = true; const G = '#8e9098', G2 = '#6c6e78', Au = '#c8a030';
    m.bone('body', 'root', [0, 0.35, 0]);
    m.bone('head', 'body', [0, 1.5, 0]);
    attachH(m, 'body', mb => {
      mb.frustum(0, 0, 0, 0.82, 0.28, 0.82, 0.28, 1.5, { side: G2, front: G, back: G2, top: sh(G, 0.2) });
      mb.box(0, 1.26, 0.145, 0.34, 0.28, 0.02, '#8a1a24');
      mb.box(0, 0.02, 0, 0.9, 0.06, 0.34, '#2a2a2a');
      [1, -1].forEach(s => { mb.box(s * 0.3, -0.12, 0.02, 0.1, 0.24, 0.12, Au); mb.box(s * 0.36, -0.28, 0.06, 0.26, 0.06, 0.2, Au); mb.box(s * 0.18, -0.2, 0.08, 0.1, 0.1, 0.06, '#e0c040'); });
    });
    attachH(m, 'head', mb => {
      [1, -1].forEach(s => {
        mb.box(s * 0.3, 0.08, 0, 0.05, 0.16, 0.05, Au); mb.box(s * 0.3, 0.02, 0, 0.1, 0.04, 0.1, Au);
        tube(mb, [[s * 0.3, 0.16, 0], [s * 0.3, 0.3, 0], [s * 0.31, 0.48, 0]], [0.035, 0.05, 0.005], '#2a3ac8', 5);
      });
    });
    attachH(m, 'head', mb => [1, -1].forEach(s => mb.sphere(s * 0.3, 0.3, 0, 0.022, 0.07, 0.022, '#80a0ff', 5, 3)), { unlit: true });
    m.height = 2.2; m.lungeScale = 0.3; return m;
  });

  // Wind Wing: dark teal skeletal flier with trailing legs; each wing is a solid star-shaped dark slate
  // membrane spread over glowing violet ribs radiating from a hub
  reg('wind_wing', (a) => {
    const m = rig(a); m.floats = true; const T = '#2a5a6a', T2 = '#1a3a48', Pu = '#8a5ad0', Pk = '#d04a9a';
    m.bone('body', 'root', [0, 1.9, 0]);
    m.bone('head', 'body', [0, 0.42, 0.06], [0.3, 0, 0]);
    m.bone('wingL', 'body', [0.12, 0.3, -0.04]); m.bone('wingR', 'body', [-0.12, 0.3, -0.04]);
    m.bone('legFL', 'body', [0.07, -0.35, 0]); m.bone('legFR', 'body', [-0.07, -0.35, 0]);
    attachH(m, 'body', mb => { tube(mb, [[0, 0.38, 0.03], [0, 0.18, 0.06], [0, -0.1, 0.02], [0, -0.35, 0]], [0.07, 0.12, 0.07, 0.08], T, 6); ell(mb, [0, -0.33, 0], [0.12, 0.08, 0.09], T2); });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.04, 0.04], [0.07, 0.08, 0.1], T);
      tube(mb, bez([0, 0.06, 0.0], [0, 0.25, 0.1], [0, 0.18, 0.32], 4), [0.04, 0.035, 0.025, 0.015, 0.004], T2, 5);
      for (let i = 0; i < 6; i++) mb.blade([0, 0.1, -0.02 - i * 0.02], [0, 0.4 + i * 0.1, -1], 0.14, 0.04, 0.02, i % 2 ? Pk : Pu, [1, 0, 0]);
    });
    attachH(m, 'head', mb => eyes(mb, 0.04, 0.06, 0.12, 0.015, '#ff4060'), { unlit: true });
    const hub = (s) => [s * 0.6, 0.28, -0.06], N = 10;
    const rib = (s, i) => { const an = -PI * 0.55 + (i / N) * PI * 2, L = i % 2 ? 0.58 : 0.95; return V.add(hub(s), V.scale(V.norm([s * C(an), S(an), -0.12]), L)); };
    const wing = (s) => mesh(mb => {
      const h = hub(s);
      tube(mb, [[0, 0, 0], [s * 0.32, 0.2, -0.02], h], [0.045, 0.04, 0.035], T, 5);
      ell(mb, h, [0.07, 0.07, 0.05], T2, 5, 3);
      for (let i = 0; i < N; i++) {                                                                  // star membrane with concave edges between the rib tips
        const a0 = rib(s, i), a1 = rib(s, (i + 1) % N), notch = L3(h, L3(a0, a1, 0.5), 0.55);
        const f = (p, q) => s > 0 ? [h, p, q] : [h, q, p];                                        // front face toward +z on both sides
        sheet(mb, f(a0, notch), i % 2 ? '#4a5068' : '#565c76', '#2a2e3c'); sheet(mb, f(notch, a1), i % 2 ? '#565c76' : '#4a5068', '#2a2e3c');
      }
    });
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    [1, -1].forEach(s => attachH(m, s > 0 ? 'wingL' : 'wingR', mb => { for (let i = 0; i < N; i++) tube(mb, [hub(s), rib(s, i)], [0.018, 0.006], i % 2 ? Pk : Pu, 3, { cap: false }); }, { unlit: true }));   // glowing violet ribs
    const leg = mesh(mb => { tube(mb, [[0, 0, 0], [0, -0.45, 0.05], [0, -0.95, -0.05], [0, -1.35, 0.05]], [0.04, 0.03, 0.02, 0.005], T2, 5); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 3.0; m.lungeScale = 1.2; return m;
  });

  // Dragon Rider: a green wyvern ridden by a lancer in a tan hood and blue tunic
  reg('dragon_rider', (a) => {
    const m = rig(a); m.floats = true; const G = '#3a8a3a', G2 = '#1e5a26', Tn = '#c8b070', Sk = '#e8e0d8', Bl = '#3a5aa0';
    m.bone('body', 'root', [0, 1.35, 0]);
    m.bone('head', 'body', [0, 0.25, 0.75], [0.3, 0, 0]);
    m.bone('jaw', 'head', [0, -0.06, 0.1]);
    m.bone('wingL', 'body', [0.2, 0.18, 0.1]); m.bone('wingR', 'body', [-0.2, 0.18, 0.1]);
    m.bone('tail', 'body', [0, 0, -0.55]);
    m.bone('armR', 'body', [-0.12, 0.72, 0.0], [-0.9, 0, -0.2]);
    attachH(m, 'body', mb => {
      ell(mb, [0, 0, 0], [0.28, 0.26, 0.55], G, 8, 6, (i, j) => j > 3 ? Tn : G);
      tube(mb, [[0, 0.05, 0.4], [0, 0.18, 0.62], [0, 0.25, 0.75]], [0.18, 0.13, 0.11], G, 6);
      [1, -1].forEach(s => { limb(mb, [[s * 0.18, -0.12, 0.2], [s * 0.22, -0.4, 0.3], [s * 0.2, -0.55, 0.15]], 0.08, 0.05, G2); claws(mb, [s * 0.2, -0.57, 0.17], [0, -1, 0.3], 3, 0.1, 0.015, '#f0f0e0'); limb(mb, [[s * 0.18, -0.1, -0.3], [s * 0.22, -0.45, -0.2], [s * 0.2, -0.6, -0.35]], 0.1, 0.05, G2); claws(mb, [s * 0.2, -0.62, -0.33], [0, -1, 0.3], 3, 0.1, 0.015, '#f0f0e0'); });
      // rider
      const R = [0, 0.3, -0.02];
      ell(mb, V.add(R, [0, 0.02, 0]), [0.14, 0.08, 0.12], '#6a4a2a');
      [1, -1].forEach(s => limb(mb, [V.add(R, [s * 0.1, 0.02, 0.02]), V.add(R, [s * 0.24, -0.1, 0.12]), V.add(R, [s * 0.22, -0.32, 0.08])], 0.045, 0.035, '#6a4a2a'));
      mb.loft([{ y: 0.04, rx: 0.12, rz: 0.09 }, { y: 0.3, rx: 0.14, rz: 0.1 }, { y: 0.42, rx: 0.1, rz: 0.08 }].map(r => Object.assign(r, { y: r.y + R[1] })), { sides: 8, color: Bl });
      ell(mb, V.add(R, [0, 0.54, 0.02]), [0.08, 0.09, 0.08], Sk);
      mb.sphere(R[0], R[1] + 0.58, -0.01, 0.1, 0.09, 0.1, Tn, 7, 5, true, null, 4);
      tube(mb, [V.add(R, [0, 0.58, -0.08]), V.add(R, [0.02, 0.4, -0.2]), V.add(R, [0.03, 0.2, -0.24])], [0.06, 0.05, 0.02], Tn, 5);
      limb(mb, [V.add(R, [0.13, 0.38, 0]), V.add(R, [0.2, 0.2, 0.08]), V.add(R, [0.14, 0.12, 0.18])], 0.035, 0.03, Bl, 5);
    });
    attachH(m, 'head', mb => { ell(mb, [0, 0.03, 0.08], [0.12, 0.11, 0.16], '#e8e4dc'); [1, -1].forEach(s => { mb.blade([s * 0.07, 0.1, 0], [s * 0.4, 1, -0.6], 0.2, 0.06, 0.03, '#c83020'); horn(mb, [s * 0.06, 0.06, -0.02], [s * 0.14, 0.14, -0.12], [s * 0.12, 0.1, -0.25], 0.03, '#f0e0c0', 4); }); });
    attachH(m, 'head', mb => eyes(mb, 0.07, 0.07, 0.15, 0.02, '#ff3030'), { unlit: true });
    attachH(m, 'jaw', mb => { tube(mb, [[0, -0.01, 0], [0, -0.03, 0.16]], [0.06, 0.03], '#d8d0c0', 5); teethRow(mb, [0.04, 0.0, 0.05], [-0.04, 0.0, 0.05], 3, [0, 1, 0], 0.03, '#ffffff'); });
    const w = (s) => mesh(mb => batWing(mb, s, { span: 1.4, h: 0.6, col: '#c8b870', col2: '#9a8a48', bone: G, back: -0.25 }));
    m.attach('wingL', w(1)); m.attach('wingR', w(-1));
    attachH(m, 'armR', mb => { limb(mb, [[0, 0, 0], [0, -0.18, 0.05]], 0.035, 0.03, Bl, 5); tube(mb, [[0, -0.2, -0.5], [0, -0.2, 1.1]], 0.02, '#a0281c', 5); cone(mb, [0, -0.2, 1.1], [0, -0.2, 1.35], 0.04, '#d0d0d8', 4); });
    attachH(m, 'tail', mb => tube(mb, bez3([0, 0, 0], [0, -0.05, -0.4], [0.1, -0.3, -0.8], [0.2, -0.5, -1.1], 6), (t) => 0.15 * (1 - t) + 0.01, G, 5));
    m.height = 2.3; m.lungeScale = 1.2; return m;
  });

  // Killbin: a floating 1.1 m cube. The front is painted with a flaming tiger-mask face (curved orange flame
  // strokes, slanted dark eyes with glowing pupils, a white-hot nose); the other sides carry blue swirls, the top
  // is olive
  let killbinTex = null, killbinSideTex = null, killbinTopTex = null;
  const qpts = (p0, p1, p2, n) => bez(p0.concat(0), p1.concat(0), p2.concat(0), n || 6).map(p => [p[0], p[1]]);
  function killbinFace() {
    if (killbinTex) return killbinTex;
    const T = FF7.tex, t = T.create(64, 64, '#c02010'), O = '#f0a020', Y = '#ffd060', D = '#8a1410';
    [[[4, 10], [16, 18], [8, 30]], [[60, 10], [48, 18], [56, 30]], [[10, 50], [22, 46], [18, 62]], [[54, 50], [42, 46], [46, 62]]].forEach(([a, b, c]) => T.curve(t, qpts(a, b, c), 2.5, D));   // darker red swirls
    T.fillRect(t, 0, 0, 64, 2, '#801010'); T.fillRect(t, 0, 62, 64, 2, '#801010'); T.fillRect(t, 0, 0, 2, 64, '#801010'); T.fillRect(t, 62, 0, 2, 64, '#801010');
    T.curve(t, qpts([32, 3], [31, 12], [32, 23]), 4.5, O); T.fillEllipse(t, 32, 5, 3, 3, Y);                              // forehead flame
    [1, -1].forEach(s => {
      const X = (x) => 32 + s * (x - 32);
      T.curve(t, qpts([X(28), 21], [X(22), 13], [X(15), 4]), 3.5, O);                                                     // brow flames sweeping up and out
      T.curve(t, qpts([X(24), 23], [X(15), 17], [X(8), 9]), 3, O);
      T.curve(t, qpts([X(20), 19], [X(12), 14], [X(4), 13]), 2.5, O);
      T.fillPoly(t, [[X(4), 23], [X(17), 22], [X(29), 31], [X(16), 33]], '#2a0808');                                       // slanted dark eye
      T.fillEllipse(t, X(16), 27.5, 3.6, 2.8, '#ff5020'); T.fillEllipse(t, X(16), 27.5, 1.5, 1.5, '#fff0c0');
      T.curve(t, qpts([X(28), 35], [X(16), 38], [X(5), 33]), 3, O);                                                       // flame under the eye
      T.curve(t, qpts([X(27), 41], [X(21), 48], [X(22), 61]), 3.5, O);                                                    // arched jaw flames
      T.curve(t, qpts([X(20), 40], [X(12), 46], [X(13), 60]), 3.5, O);
      T.curve(t, qpts([X(12), 38], [X(5), 44], [X(5), 56]), 3, Y);
    });
    T.fillEllipse(t, 32, 33, 7, 6, '#ff9070');                                                                             // white-hot nose
    T.fillPoly(t, [[32, 24], [38, 38], [32, 41], [26, 38]], '#ffe8d0'); T.fillPoly(t, [[32, 29], [35, 37], [32, 39], [29, 37]], '#ffffff');
    return (killbinTex = t);
  }
  function killbinSide() {
    if (killbinSideTex) return killbinSideTex;
    const T = FF7.tex, t = T.create(64, 64, '#2040a0');
    [[[4, 6], [30, 2], [28, 24]], [[60, 20], [40, 14], [44, 40]], [[6, 34], [26, 30], [20, 56]], [[36, 62], [44, 44], [60, 52]], [[20, 20], [30, 36], [48, 30]]].forEach(([a, b, c], i) => {
      T.curve(t, qpts(a, b, c, 8), 4, i % 2 ? '#10205a' : '#4a80d0'); T.curve(t, qpts(a, b, c, 8), 1.5, i % 2 ? '#3a5ab8' : '#a0c8f0');
    });
    T.fillRect(t, 0, 0, 64, 2, '#101a48'); T.fillRect(t, 0, 62, 64, 2, '#101a48'); T.fillRect(t, 0, 0, 2, 64, '#101a48'); T.fillRect(t, 62, 0, 2, 64, '#101a48');
    return (killbinSideTex = t);
  }
  function killbinTop() {
    if (killbinTopTex) return killbinTopTex;
    const T = FF7.tex, t = T.create(32, 32, '#8a8a50');
    [[2, 6, 30, 10], [4, 18, 28, 14], [6, 26, 26, 28]].forEach(([x0, y0, x1, y1], i) => T.line(t, x0, y0, x1, y1, 2, i % 2 ? '#5a5a30' : '#c8c8a0'));
    return (killbinTopTex = t);
  }
  reg('killbin', (a) => {
    const m = rig(a); m.floats = true; const H = 0.55;
    m.bone('body', 'root', [0, 1.25, 0]);
    m.attach('body', panelTex(64, 64, killbinFace(), 0, 0, H, 2 * H, 2 * H));
    const side = mesh(mb => [PI / 2, -PI / 2, PI].forEach(r => { mb.push(); mb.rotate(0, r, 0); mb.plane(0, 0, H, 2 * H, 2 * H, '#ffffff'); mb.pop(); }));
    side.tex = killbinSide(); m.attach('body', side);
    const top = mesh(mb => mb.floor(-H, -H, H, H, H, '#ffffff', [0, 0, 1, 1]));
    top.tex = killbinTop(); m.attach('body', top);
    attachH(m, 'body', mb => mb.quad([-H, -H, -H], [H, -H, -H], [H, -H, H], [-H, -H, H], '#4a1010'));   // underside
    m.height = 1.85; m.lungeScale = 1.0; return m;
  });

  // Tonberry family: hunched lizard in a hooded robe, lantern in the left hand, chef's knife in the right
  function tonberry(a, c) {
    const m = rig(a);
    m.bone('body', 'root', [0, 0.36, 0], [0.25, 0, 0]);
    m.bone('head', 'body', [0, 0.36, 0.1], [-0.2, 0, 0]);
    m.bone('armL', 'body', [0.2, 0.2, 0.05], [-0.9, 0, 0.3]); m.bone('armR', 'body', [-0.2, 0.2, 0.05], [-0.6, 0, -0.3]);
    m.bone('tail', 'body', [0, -0.25, -0.2]);
    attachH(m, 'body', mb => {
      mb.loft([{ y: -0.36, rx: 0.3, rz: 0.28 }, { y: -0.1, rx: 0.28, rz: 0.26 }, { y: 0.18, rx: 0.22, rz: 0.2 }, { y: 0.34, rx: 0.14, rz: 0.13 }], { sides: 10, color: c.robe, capBottom: true });
      mb.loft([{ y: 0.25, rx: 0.2, rz: 0.2, z: -0.02 }, { y: 0.38, rx: 0.16, rz: 0.16, z: -0.06 }], { sides: 10, color: c.hood });
      [1, -1].forEach(s => ell(mb, [s * 0.12, -0.36, 0.2], [0.08, 0.05, 0.1], c.skin));
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.07, 0.06], [0.15, 0.13, 0.15], c.skin);
      ell(mb, [0, 0.04, 0.16], [0.09, 0.07, 0.08], c.skin);
      mb.sphere(0, 0.11, -0.02, 0.19, 0.18, 0.19, c.hood, 8, 6, true, null, 4);
      tube(mb, [[0, 0.14, -0.12], [0, 0.1, -0.24], [0, 0.0, -0.3]], [0.12, 0.08, 0.02], c.hood, 6);
    });
    attachH(m, 'head', mb => eyes(mb, 0.07, 0.1, 0.17, 0.032, c.eye), { unlit: true });
    attachH(m, 'armL', mb => { limb(mb, [[0, 0, 0], [0, -0.12, 0.05], [0, -0.2, 0.12]], 0.07, 0.05, c.robe); ell(mb, [0, -0.22, 0.14], [0.04, 0.04, 0.04], c.skin); mb.box(0, -0.24, 0.2, 0.012, 0.06, 0.012, '#302820'); mb.frustum(0, -0.42, 0.2, 0.11, 0.11, 0.1, 0.1, 0.03, '#403020'); mb.frustum(0, -0.28, 0.2, 0.1, 0.1, 0.07, 0.07, 0.03, '#403020'); [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => mb.box(x * 0.045, -0.335, 0.2 + z * 0.045, 0.012, 0.13, 0.012, '#403020')); });
    attachH(m, 'armL', mb => mb.box(0, -0.335, 0.2, 0.08, 0.11, 0.08, '#fff4b0'), { unlit: true });
    attachH(m, 'armR', mb => { limb(mb, [[0, 0, 0], [0, -0.12, 0.05], [0, -0.2, 0.12]], 0.07, 0.05, c.robe); ell(mb, [0, -0.22, 0.14], [0.04, 0.04, 0.04], c.skin); mb.box(0, -0.22, 0.2, 0.02, 0.03, 0.08, '#403020'); sheet(mb, [[0, -0.2, 0.24], [0, -0.26, 0.24], [0, -0.26, 0.44], [0, -0.2, 0.4]], '#e0e4ec'); });
    attachH(m, 'tail', mb => tube(mb, bez([0, 0, 0], [0, -0.08, -0.2], [0.05, -0.1, -0.35], 3), [0.07, 0.05, 0.03, 0.005], c.skin, 5));
    m.height = 0.9; m.lungeScale = 0.6; return m;
  }
  reg('tonberry', (a) => { const m = tonberry(a, { skin: '#78a83a', robe: '#a88a38', hood: '#5a8a2a', eye: '#ffe040' }); m.scale = 1.05; return m; });

  // ---- Jenova BIRTH / LIFE / DEATH: FF7 reuses one battle model with three palettes, so all three share this
  // body plan: a slender body rising from a flared gown and floor train, the fanged skull face bowed forward
  // under a navy hood, a huge asymmetric crest (a forked lobe sweeping up over the model's right, a long flat
  // plate out to its left, a striped C-horn between), tall navy horns, a ruff of short tentacles, navy
  // tentacle arms (one reaching out, one hanging to the floor), ribbons down the gown and a tail hooking up
  // beside it. c.k = model scale (BIRTH ~5.8 m, LIFE ~4.6 m, DEATH ~6.1 m).
  function jenova(a, c) {
    const m = rig(a);
    m.bone('body', 'root', [0, 1.72, 0], [0.08, 0, 0]);
    m.bone('head', 'body', [0, 1.0, 0.36], [0.6, 0, 0]);
    m.bone('jaw', 'head', [0, -0.09, 0.12]);
    m.bone('crest', 'body', [0, 1.16, -0.2]);
    m.bone('wingL', 'crest', [0.12, 0, 0]); m.bone('wingR', 'crest', [-0.12, 0, 0]);
    m.bone('armL', 'body', [0.36, 0.84, 0.04], [-0.35, 0, 0.95]);
    m.bone('armR', 'body', [-0.36, 0.84, 0.04], [0.05, 0, -0.1]);
    m.bone('t0', 'wingL', [1.0, 0.2, 0.18]); m.bone('t1', 'wingL', [1.7, 0.32, 0.26]); m.bone('t2', 'wingR', [-1.26, -0.76, 0.08]);
    m.bone('tail', 'root', [0.8, 0.3, -0.3]);
    const T = c.tent, RB = c.ribbon;
    // flat crest plate along pts (in-plane half-width w, half-thickness th); the lower edge near the root striped
    const plate = (mb, pts, w, th, lowEdge) => mb.sweep(pts, pts.map((p, k) => [w[k], th[k]]), { up: [0, 0, 1], sides: 6,
      colors: (k, i) => (k < 3 && lowEdge.includes(i)) ? c.stripe : (i === 3 || i === 4 || i === 5) && !lowEdge.includes(i) ? c.pale2 : c.pale });
    // ---- gown + floor train + tail stub (static on the root, so the hem stays on the floor)
    attachH(m, 'root', mb => {
      const gcol = (i, n) => { const ca = PI / n + (i + 0.5) / n * PI * 2, s = S(ca); return s > 0.6 ? (i % 2 ? c.gown : c.gownHi) : Math.abs(C(ca)) > 0.75 ? c.gown2 : sh(c.gown, -0.1); };
      mb.loft([{ y: 0, rx: 1.3, rz: 1.05, z: -0.2, color: c.hem }, { y: 0.12, rx: 1.18, rz: 0.97, z: -0.2, colors: gcol }, { y: 0.45, rx: 0.86, rz: 0.72, z: -0.12, colors: gcol },
        { y: 0.95, rx: 0.56, rz: 0.47, z: -0.05, colors: gcol }, { y: 1.45, rx: 0.38, rz: 0.32, colors: gcol }, { y: 1.8, rx: 0.31, rz: 0.27 }], { sides: 12, color: c.gown });
      // train trailing out behind to the model's right
      mb.sweep([[-0.2, 0.06, -0.9], [-0.8, 0.05, -1.45], [-1.5, 0.04, -1.65], [-2.05, 0.03, -1.4]], [[0.72, 0.07], [0.56, 0.06], [0.36, 0.05], [0.06, 0.03]], { up: [0, 1, 0], sides: 6, color: sh(c.gown, -0.05) });
      // DEATH: red tentacle ribbons wrapping down the gown (lower halves; the upper halves ride on the body)
      if (RB) [[[0.16, 1.78, 0.33], [0.3, 1.3, 0.46], [0.0, 0.9, 0.6], [-0.45, 0.45, 0.78], [-0.86, 0.06, 0.88]], [[-0.16, 1.78, 0.33], [-0.4, 1.35, 0.36], [-0.64, 0.95, 0.3], [-0.92, 0.5, 0.1], [-1.28, 0.08, -0.2]]].forEach((pts, i) => tube(mb, mb.curvePts(pts, 2), (t) => 0.08 - i * 0.01 + 0.03 * t, RB, 6));
      cone(mb, [0.55, 0.22, -0.72], [1.5, 0.62, -1.15], 0.17, c.stub, 5);
    });
    // ---- torso, tie, shoulder orb, ruff, upper ribbons
    attachH(m, 'body', mb => {
      mb.loft([{ y: -0.1, rx: 0.31, rz: 0.27 }, { y: 0.35, rx: 0.3, rz: 0.24 }, { y: 0.65, rx: 0.4, rz: 0.28 }, { y: 0.86, rx: 0.5, rz: 0.3 }, { y: 0.98, rx: 0.32, rz: 0.24 }, { y: 1.08, rx: 0.14, rz: 0.14 }], { sides: 10, color: c.main });
      sheet(mb, [[0, 0.98, 0.3], [0.13, 0.9, 0.29], [0.06, 0.2, 0.3], [0, 0.02, 0.3], [-0.06, 0.2, 0.3], [-0.13, 0.9, 0.29]], c.tie);
      ell(mb, [-0.42, 0.9, 0.1], [0.14, 0.14, 0.12], c.orb);
      if (RB) [1, -1].forEach(s => tube(mb, bez3([s * 0.1, 0.95, 0.24], [s * 0.34, 0.66, 0.34], [s * 0.04, 0.3, 0.36], [s * 0.16, -0.06, 0.34], 5), 0.065, RB, 5));
      // ruff of short tentacles around the neck, behind the bowed head
      [[1, 0.35], [1, -0.25], [0.7, -0.75], [0.8, 0.85], [-1, 0.3], [-1, -0.3], [-0.65, -0.8], [-0.75, 0.9]].forEach(([dx, dy], i) => {
        const b = [dx * 0.12, 1.0, 0.12], d = V.norm([dx, dy, 0.25]), L = 0.42 + (i % 3) * 0.08;
        horn(mb, b, V.add(b, V.scale(d, L * 0.6)), V.add(V.add(b, V.scale(d, L)), [0, -0.12, 0.08]), 0.055, c.ruff || T, 4, 3);
      });
    });
    // ---- head: skull face under a navy hood with side bands, glowing slit eyes; fangs on the jaw
    attachH(m, 'head', mb => {
      mb.scale(1.25);
      ell(mb, [0, 0.14, -0.04], [0.2, 0.22, 0.2], c.hood);
      mb.blade([0, 0.3, -0.06], [0, 0.3, -1], 0.32, 0.36, 0.1, c.hood);
      ell(mb, [0, 0.08, 0.08], [0.14, 0.2, 0.14], c.face);
      mb.blade([0, 0.16, 0.2], [0, -1, 0.35], 0.16, 0.07, 0.05, sh(c.face, -0.15));
      [1, -1].forEach(s => tube(mb, [[s * 0.15, 0.3, 0.06], [s * 0.2, 0.1, 0.1], [s * 0.16, -0.1, 0.1]], 0.03, c.band, 4));
    });
    attachH(m, 'head', mb => { mb.scale(1.25); mb.box(0.06, 0.14, 0.2, 0.07, 0.015, 0.02, c.eye); mb.box(-0.06, 0.14, 0.2, 0.07, 0.015, 0.02, c.eye); }, { unlit: true });
    attachH(m, 'jaw', mb => {
      mb.scale(1.25);
      ell(mb, [0, -0.04, 0.0], [0.11, 0.07, 0.11], c.face);
      teethRow(mb, [0.07, 0.0, 0.08], [-0.07, 0.0, 0.08], 5, [0, -1, 0.15], 0.07, '#f0f0e0');
      [1, -1].forEach(s => horn(mb, [s * 0.1, 0.02, 0.06], [s * 0.15, -0.2, 0.16], [s * 0.08, -0.36, 0.28], 0.035, c.fang, 4, 4));
    });
    // ---- arms: navy tentacle arms, one reaching out with claws (model's left), one hanging to the floor
    attachH(m, 'armL', mb => {
      tube(mb, [[0, 0, 0], [0, -0.5, 0.06], [0.08, -0.9, 0.38]], [0.11, 0.09, 0.06], T, 6);
      claws(mb, [0.08, -0.92, 0.42], [0.25, -0.6, 1], 3, 0.28, 0.03, T, 1.0);
    });
    attachH(m, 'armR', mb => {
      tube(mb, mb.curvePts([[0, 0, 0], [-0.3, -0.45, 0.15], [-0.12, -1.25, 0.36], [-0.5, -1.95, 0.46], [-0.95, -2.5, 0.5]], 2), (t) => 0.2 - 0.1 * t, T, 7);
      horn(mb, [-0.95, -2.5, 0.5], [-1.25, -2.56, 0.55], [-1.3, -2.36, 0.62], 0.1, T, 5, 3);
    });
    // ---- crest: a great flattened star behind the head: the flat plate (wingL), the up-finger, left pipe and
    // hanging lower lobe (wingR), a banded arch over the head and tall navy horns
    attachH(m, 'crest', mb => {
      ell(mb, [-0.1, 0.16, -0.02], [0.72, 0.52, 0.3], c.pale, 7, 5);
      mb.sweep(bez3([-0.38, 0.3, -0.1], [-0.66, 1.55, -0.24], [0.6, 1.95, -0.3], [0.98, 0.85, -0.14], 9), [0.2, 0.22, 0.22, 0.22, 0.21, 0.2, 0.19, 0.18, 0.17, 0.15].map(w => [w, 0.12]), { up: [0, 0, 1], sides: 6, colors: (k, i) => (i === 3 || i === 4) ? sh(c.arch, -0.25) : k % 2 ? c.arch : sh(c.arch, 0.12) });
      horn(mb, [0.28, 0.3, -0.3], [0.62, 1.3, -0.5], [0.34, 2.12, -0.42], 0.2, c.horn, 5, 6);
      horn(mb, [-0.12, 0.36, -0.3], [-0.02, 1.0, -0.5], [-0.3, 1.55, -0.42], 0.13, c.horn, 5, 5);
    });
    attachH(m, 'wingL', mb => {
      plate(mb, [[0, 0, 0], [0.7, 0.3, 0.1], [1.4, 0.5, 0.2], [2.0, 0.58, 0.26], [2.42, 0.6, 0.28]], [0.56, 0.5, 0.44, 0.38, 0.34], [0.2, 0.17, 0.14, 0.12, 0.12], [2, 3]);
    });
    attachH(m, 'wingR', mb => {
      plate(mb, [[0, 0.1, 0], [-0.4, 0.7, -0.02], [-0.75, 1.35, -0.06], [-0.95, 1.98, -0.1]], [0.52, 0.38, 0.25, 0.05], [0.19, 0.16, 0.12, 0.04], [0, 5]);
      tube(mb, [[-0.2, 0.35, 0], [-1.0, 0.55, 0.02], [-1.8, 0.72, 0.05]], [0.34, 0.19, 0.15], (t, k) => k % 2 ? c.pale : c.pale2, 6);
      ell(mb, [-1.9, 0.73, 0.05], [0.2, 0.24, 0.24], c.pale2, 6, 4);
      mb.sweep([[0, -0.05, 0.02], [-0.55, -0.25, 0.06], [-1.05, -0.55, 0.08], [-1.3, -0.8, 0.08]], [[0.38, 0.16], [0.4, 0.15], [0.3, 0.12], [0.1, 0.06]], { up: [0, 0, 1], sides: 6, colors: (k, i) => i === 3 || i === 4 ? sh(c.lobe, -0.2) : c.lobe });
    });
    const claw = (len) => mesh(mb => { horn(mb, [0, 0, 0], [0.12, -len * 0.6, 0.12], [-0.12, -len, 0.06], 0.085, T, 5, 5); horn(mb, [-0.12, -len, 0.06], [-0.24, -len * 0.95, 0.0], [-0.26, -len * 0.8, 0.02], 0.04, T, 4, 2); });
    m.attach('t0', claw(0.75)); m.attach('t1', claw(0.6)); m.attach('t2', claw(0.85));
    attachH(m, 'tail', mb => tube(mb, bez3([0, 0, 0], [0.45, 0.5, -0.15], [0.55, 1.7, 0.05], [0.05, 2.2, 0.25], 9), (t) => 0.3 * (1 - t) + 0.035, T, 7));
    // a slow, heavy creature: damp the stock clips' body pitch and crest flap
    m.onPose = (mm) => {
      const b = mm.b('body'); b.rot[0] = b.rest[0] + (b.rot[0] - b.rest[0]) * 0.5;
      ['wingL', 'wingR'].forEach(n => { const w = mm.b(n); w.rot[2] = w.rest[2] + (w.rot[2] - w.rest[2]) * 0.15; });
      const r = mm.b('armR'); r.rot[0] = r.rest[0] + (r.rot[0] - r.rest[0]) * 0.4;
    };
    m.height = 5.0; m.scale = c.k; m.lungeScale = 0.35; return m;
  }
  // Disc 1 (Shinra cargo ship) and Disc 1 (Forgotten Capital): FF7 reuses the Jenova DEATH model with other palettes
  reg('jenova_birth', (a) => jenova(a, { k: 1.16, main: '#d8d0dc', face: '#c8c0cc', gown: '#8070c0', gownHi: '#b0a8d8', gown2: '#6a5aa8', pale: '#f0e8f0', pale2: '#d0c4d4', stripe: '#b03060', arch: '#b03060', lobe: '#a03050', hem: '#b03060', tent: '#2a3a60', horn: '#2a3a60', tie: '#b03060', hood: '#2a3060', band: '#b03060', fang: '#e8e8d8', orb: '#50a070', eye: '#ffe040', stub: '#a8a0a8' }));
  reg('jenova_life', (a) => jenova(a, { k: 0.92, main: '#c85a50', face: '#c86a5a', gown: '#c05850', gownHi: '#d06a60', gown2: '#8a3030', pale: '#c85a50', pale2: '#8a3030', stripe: '#8a3030', arch: '#3a3048', lobe: '#b04840', hem: '#8a3030', tent: '#2a2a5a', horn: '#2a2a5a', tie: '#c08898', hood: '#2a2a5a', band: '#d0c040', fang: '#b8d040', orb: '#6a4ab0', eye: '#ffe040', stub: '#c09030' }));
  reg('jenova_death', (a) => jenova(a, { k: 1.22, main: '#8aa8a0', face: '#8ab0a8', gown: '#8aa8a0', gownHi: '#a0bcb4', gown2: '#34386a', pale: '#c4d4d0', pale2: '#9ab0ac', stripe: '#b06a30', arch: '#b06a30', lobe: '#8aa8a0', hem: '#a03040', tent: '#2c2a78', horn: '#2c2a78', ribbon: '#a03040', ruff: '#6a2a60', tie: '#6a4ab0', hood: '#3a2a70', band: '#b06a30', fang: '#e0e0c0', orb: '#d8d040', eye: '#ffe040', stub: '#a03040' }));

  // Roulette Cannon: walking revolver-cannon — beige block body, a cylinder of hexagonal barrels, stout legs
  reg('roulette_cannon', (a) => {
    const m = rig(a); const B = '#c0b494', B2 = '#8a8068', Dk = '#3a4a5a', Wh = '#e8e8e0';
    m.bone('body', 'root', [0, 1.2, 0]);
    m.bone('head', 'body', [0, 0.25, 0.35]);
    m.bone('legFL', 'body', [0.35, -0.3, 0.15]); m.bone('legFR', 'body', [-0.35, -0.3, 0.15]);
    attachH(m, 'body', mb => {
      mb.frustum(0, -0.35, -0.1, 0.9, 0.9, 0.8, 0.7, 0.7, { side: B2, top: B, front: B });
      mb.box(0.52, 0.1, -0.05, 0.22, 0.5, 0.5, Dk); mb.box(-0.52, 0.1, -0.05, 0.22, 0.5, 0.5, Dk);
      mb.box(0, 0.45, -0.3, 0.3, 0.3, 0.3, B2); tube(mb, [[0.3, 0.3, -0.45], [0.3, 0.75, -0.45]], 0.1, Wh, 8); mb.box(0.3, 0.72, -0.45, 0.22, 0.04, 0.22, '#c02020');
    });
    attachH(m, 'head', mb => {
      mb.push(); mb.rotate(PI / 2, 0, 0);
      mb.prism(0, 0, 0, 0.5, 0.5, 0.35, 6, B, false);
      for (let i = 0; i < 6; i++) { const an = (i / 6) * PI * 2 + PI / 6; mb.prism(C(an) * 0.3, 0.35, S(an) * 0.3, 0.13, 0.13, 0.05, 6, '#1a1a1a', false); mb.prism(C(an) * 0.3, 0.34, S(an) * 0.3, 0.17, 0.17, 0.03, 6, B2, false); }
      mb.prism(0, 0.35, 0, 0.12, 0.12, 0.08, 6, Dk, false);
      mb.pop();
      mb.box(0, -0.35, 0.25, 0.3, 0.2, 0.2, Dk);
    });
    const leg = mesh(mb => { mb.frustum(0, -0.55, 0, 0.26, 0.26, 0.3, 0.3, 0.55, Wh); mb.frustum(0, -0.9, 0.04, 0.34, 0.44, 0.28, 0.32, 0.35, sh(Wh, -0.15)); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    attachH(m, 'body', mb => { [1, -1].forEach(s => { mb.frustum(s * 0.3, -1.2, -0.45, 0.24, 0.3, 0.24, 0.24, 0.85, Wh); }); });
    m.height = 1.9; m.lungeScale = 0.5; return m;
  });

  // Hippogriff: a bulky griffin-bird with a maroon body, cream chest ruff and eagle head with a dark crest,
  // huge solid cream wings, a peacock fan tail with eye spots and short sturdy orange legs with dark talons
  reg('hippogriff', (a) => {
    const m = rig(a); const Br = '#7a2a28', Br2 = '#4a1a1a', Cr = '#f0e8d0', Cr2 = '#d8ccb0', Tn = '#c89a50', Or = '#e0a038', Gr = '#3a7a3a';
    m.bone('body', 'root', [0, 0.86, 0], [-0.12, 0, 0]);
    m.bone('head', 'body', [0, 0.6, 0.5], [0.25, 0, 0]);
    m.bone('jaw', 'head', [0, -0.02, 0.18]);
    m.bone('wingL', 'body', [0.28, 0.32, 0.12]); m.bone('wingR', 'body', [-0.28, 0.32, 0.12]);
    m.bone('tail', 'body', [0, 0.22, -0.5], [-0.1, 0, 0]);
    m.bone('legFL', 'body', [0.22, -0.22, 0.32]); m.bone('legFR', 'body', [-0.22, -0.22, 0.32]); m.bone('legBL', 'body', [0.24, -0.14, -0.34]); m.bone('legBR', 'body', [-0.24, -0.14, -0.34]);
    attachH(m, 'body', mb => {
      ell(mb, [0, 0.05, 0], [0.4, 0.42, 0.64], Br, 8, 5, (i, j) => j > 2 ? Br2 : Br);
      tube(mb, [[0, 0.2, 0.38], [0, 0.46, 0.48], [0, 0.6, 0.5]], [0.3, 0.24, 0.19], Br, 6, { cap: false });
      for (let i = 0; i < 7; i++) { const an = -1.1 + i * 0.36; mb.blade([S(an) * 0.22, 0.42 - i * 0.02, 0.56], [S(an) * 0.6, -0.8, 0.4], 0.42, 0.18, 0.03, i % 2 ? Cr : Cr2); }   // chest ruff
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.05, 0.05], [0.15, 0.16, 0.17], Cr, 7, 5);
      tube(mb, bez([0, 0.04, 0.17], [0, 0.04, 0.32], [0, -0.07, 0.36], 3), [0.075, 0.055, 0.03, 0.005], '#e0b030', 5);
      for (let i = 0; i < 6; i++) { const an = -1 + i * 0.4; mb.blade([S(an) * 0.08, 0.16, -0.02], [S(an) * 0.8, 1, -0.7], 0.32, 0.08, 0.03, i % 2 ? '#2a1a3a' : '#3a2a50'); }   // dark crest
      [1, -1].forEach(s => mb.blade([s * 0.12, 0.0, -0.06], [s * 0.6, -0.3, -1], 0.26, 0.12, 0.03, '#b0acb8'));   // pale mane
    });
    attachH(m, 'head', mb => eyes(mb, 0.085, 0.08, 0.16, 0.022, '#ff3020'), { unlit: true });
    // huge solid cream wing: membrane fan with a jagged trailing edge of primaries + a leading-edge arm
    const w = (s) => mesh(mb => {
      const X = (p) => [s * p[0], p[1], p[2]];
      const lead = [[0, 0, 0], [0.55, 0.38, 0.04], [1.25, 0.8, -0.06], [2.0, 1.05, -0.22]].map(X);
      const trail = [[2.05, 0.72, -0.26], [1.78, 0.58, -0.26], [1.84, 0.3, -0.3], [1.5, 0.24, -0.26], [1.52, -0.06, -0.3], [1.14, 0.0, -0.26], [1.1, -0.3, -0.26], [0.74, -0.2, -0.2], [0.6, -0.46, -0.16], [0.28, -0.26, -0.1], [0.08, -0.12, -0.02]].map(X);
      const ctr = X([0.85, 0.3, -0.1]), ring = lead.concat(trail, [lead[0]]);
      for (let i = 0; i < ring.length - 1; i++) { mb.tri(ctr, ring[i], ring[i + 1], i % 2 ? '#f6ecc8' : '#fff4d8'); mb.tri(ctr, ring[i + 1], ring[i], '#e0cc98'); }
      tube(mb, lead, [0.07, 0.06, 0.045, 0.02], '#e8d8b0', 5, { cap: false });
      for (let i = 0; i < 5; i++) { const b = L3(lead[1], lead[3], 0.1 + i * 0.22); mb.blade(b, [s * 0.35, -1, -0.25], 0.5 - i * 0.04, 0.2, 0.03, '#fff0d0', [1, 0, 0]); }   // layered coverts
    });
    m.attach('wingL', w(1)); m.attach('wingR', w(-1));
    attachH(m, 'tail', mb => {                                                                           // peacock fan: solid green fan, serrated rim, two rings of eye spots
      const dir = (an) => V.norm([S(an), C(an) * 0.95 + 0.1, -0.25]), N = 13;
      const fan = [[0, 0, 0]]; for (let i = 0; i <= 12; i++) fan.push(V.scale(dir(-PI * 0.5 + (i / 12) * PI), 1.7 - Math.abs(-PI * 0.5 + (i / 12) * PI) * 0.22));
      sheet(mb, fan, Gr, sh(Gr, -0.25));
      for (let i = 0; i < N; i++) {
        const an = -PI * 0.5 + (i / (N - 1)) * PI, d = dir(an), L = 1.95 - Math.abs(an) * 0.25;
        mb.blade(V.scale(d, 0.5), d, L - 0.5, 0.36, 0.02, i % 2 ? Gr : '#4a8a3a', [d[1], -d[0], 0], '#6aa048');
        const e = V.add(V.scale(d, L * 0.8), [0, 0, 0.04]); disc(mb, e, 0.15, 0.17, '#d88a20', 6); disc(mb, V.add(e, [0, 0, 0.01]), 0.09, 0.105, '#1a8a90', 5); disc(mb, V.add(e, [0, 0, 0.02]), 0.05, 0.06, '#20308a', 4);
        if (i % 2) { const e2 = V.add(V.scale(d, L * 0.5), [0, 0, 0.06]); disc(mb, e2, 0.12, 0.14, '#d88a20', 5); disc(mb, V.add(e2, [0, 0, 0.01]), 0.07, 0.085, '#1a8a90', 4); disc(mb, V.add(e2, [0, 0, 0.02]), 0.04, 0.05, '#20308a', 3); }
      }
    });
    // short sturdy legs: scaly orange eagle legs in front, furred tan haunches behind
    const leg = (back) => mesh(mb => {
      if (back) ell(mb, [0, -0.1, -0.02], [0.18, 0.24, 0.22], Br, 6, 4);
      limb(mb, [[0, 0, 0], [0, -0.3, back ? -0.1 : 0.08], [0, -0.64, 0.05]], 0.16, 0.08, back ? Tn : Or, 6);
      claws(mb, [0, -0.66, 0.1], [0, -0.3, 1], 3, 0.16, 0.03, '#303030');
    });
    m.attach('legFL', leg(false)); m.attach('legFR', leg(false)); m.attach('legBL', leg(true)); m.attach('legBR', leg(true));
    m.height = 2.75; m.lungeScale = 1.1; return m;
  });

  // Spiral: a high-arched armoured hunchback — big overlapping lavender-white shell plates curled over a red
  // underbody, the spiky snout carried low at the front, four thin spiky clawed legs and a long thin segmented
  // tail (red / lavender) trailing on the ground behind
  reg('spiral', (a) => {
    const m = rig(a); const W = '#d0cce0', W2 = '#a8a0c0', W3 = '#e8e4f4', R = '#b02a3a', Sp = '#f0f0f8';
    const Cc = [0, 0.58, 0.02], Ra = 0.86, arc = (f, r) => [0, Cc[1] + (r || Ra) * C(f), Cc[2] + (r || Ra) * S(f)];
    m.bone('body', 'root', [0, 0.6, -0.45]);
    m.bone('head', 'body', V.sub(arc(1.5, 0.8), [0, 0.6, -0.45]), [0.55, 0, 0]);
    m.bone('jaw', 'head', [0, -0.1, 0.14]);
    m.bone('tail', 'root', [0, 0.52, -0.95]);
    attachH(m, 'body', mb => {
      mb.push(); mb.translate(0, -0.6, 0.45);
      // red underbody along the inside of the arch
      tube(mb, Array.from({ length: 8 }, (_, i) => arc(-1.35 + i * (2.8 / 7), Ra - 0.36)), (t) => 0.3 + 0.14 * S(PI * t), (t, k) => k < 2 || k > 4 ? sh(R, -0.15) : R, 6);
      ell(mb, [0, 0.62, 0.02], [0.36, 0.3, 0.62], sh(R, -0.2), 6, 4);                               // belly filling the arch
      // shell plates, largest at the apex, red on their inner rim
      for (let i = 0; i < 7; i++) {
        const f = -1.3 + i * 0.44, p = arc(f), k = 0.8 + 0.25 * C(f);
        mb.push(); mb.translate(p[0], p[1], p[2]); mb.rotate(f, 0, 0);
        ell(mb, [0, 0, 0], [0.5 * k, 0.26, 0.34], W, 7, 5, (q, j) => j >= 4 ? R : j === 0 ? W3 : (q % 3 ? W : W2));
        mb.blade([0, 0.22, -0.18], [0, 1, -0.5], 0.2 * k + 0.04, 0.12, 0.05, Sp, [1, 0, 0]);
        if (i % 2) [1, -1].forEach(s => mb.blade([s * 0.45 * k, -0.05, -0.2], [s, -0.2, -0.4], 0.16, 0.08, 0.04, Sp));
        mb.pop();
      }
      mb.pop();
    });
    // spiky snout carried low at the front
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.02, 0.08], [0.22, 0.2, 0.26], W, 7, 4);
      tube(mb, [[0, 0.0, 0.2], [0, -0.04, 0.46]], [0.15, 0.08], W2, 6);
      [1, -1].forEach(s => { horn(mb, [s * 0.13, 0.1, 0.12], [s * 0.26, 0.2, 0.2], [s * 0.2, 0.18, 0.36], 0.045, Sp, 4); mb.blade([s * 0.12, 0.0, 0.3], [s, 0.2, 0.4], 0.14, 0.06, 0.03, Sp); });
      mb.blade([0, 0.18, 0.0], [0, 1, -0.6], 0.2, 0.1, 0.04, Sp, [1, 0, 0]);
    });
    attachH(m, 'head', mb => eyes(mb, 0.11, 0.07, 0.24, 0.028, '#ff2040'), { unlit: true });
    attachH(m, 'jaw', mb => { ell(mb, [0, -0.03, 0.12], [0.14, 0.06, 0.2], R); teethRow(mb, [0.09, 0.02, 0.26], [-0.09, 0.02, 0.26], 4, [0, 1, 0.2], 0.06, '#ffffff'); });
    // four thin spiky clawed legs
    [['legFL', 1, 0.55], ['legFR', -1, 0.55], ['legBL', 1, -0.5], ['legBR', -1, -0.5]].forEach(([b, s, z]) => {
      m.bone(b, 'root', [s * 0.3, 0.55, z]);
      attachH(m, b, mb => {
        tube(mb, [[0, 0, 0], [s * 0.28, 0.06, z * 0.2], [s * 0.4, -0.53, z * 0.35]], [0.09, 0.08, 0.05], W2, 5);
        mb.blade([s * 0.3, 0.1, z * 0.2], [s * 0.5, 1, -0.3], 0.2, 0.07, 0.03, Sp);
        claws(mb, [s * 0.42, -0.53, z * 0.35 + 0.02], [0, -0.3, 1], 2, 0.1, 0.015, R, 0.8);
      });
    });
    // long thin segmented tail trailing on the ground
    attachH(m, 'tail', mb => {
      const pts = bez3([0, 0, 0], [0.1, -0.5, -0.45], [-0.3, -0.46, -1.2], [0.25, -0.46, -2.0], 8);
      tube(mb, pts, (t) => 0.14 - 0.09 * t, (t, k, i) => (i % 3 === 2) ? W2 : R, 5);
      const e = pts[pts.length - 1]; for (let i = 0; i < 2; i++) horn(mb, e, V.add(e, [(i - 0.5) * 0.12, 0.04, -0.12]), V.add(e, [(i - 0.5) * 0.24, 0.0, -0.22]), 0.025, Sp, 4, 2);
    });
    // the tail trails on the ground: the stock clips' tail swing must lift it (a whip), not push it underground; the low snout must not dip into the floor
    m.onPose = (mm) => { const t = mm.b('tail'); t.rot[0] = Math.abs(t.rot[0]); mm.b('body').rot[0] *= 0.35; };
    m.height = 1.7; m.lungeScale = 1.0; return m;
  });

  // Crysales: a pupa with a wrinkled tan skull-like head, blue eyes, green spiked feelers and a ringed body
  reg('crysales', (a) => {
    const m = rig(a); const Tn = '#b8aa84', Tn2 = '#8a7e5c', Br = '#4a3a28', G = '#40c040';
    m.bone('body', 'root', [0, 0.5, 0]);
    m.bone('head', 'body', [0, 0.45, 0.02]);
    m.bone('jaw', 'head', [0, -0.05, 0.18]);
    attachH(m, 'body', mb => { for (let i = 0; i < 5; i++) { const y = 0.35 - i * 0.18, r = 0.22 - Math.abs(i - 1) * 0.02; mb.loft([{ y: y - 0.09, rx: r * 0.85, rz: r * 0.8 }, { y: y - 0.02, rx: r, rz: r * 0.95 }, { y: y + 0.08, rx: r * 0.85, rz: r * 0.8 }], { sides: 8, color: i % 2 ? Br : sh(Br, 0.15) }); } });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.12, 0], [0.28, 0.3, 0.26], Tn, 8, 6, (i, j) => (i + j) % 3 === 0 ? Tn2 : Tn);
      [1, -1].forEach(s => { cone(mb, [s * 0.24, 0.1, 0.06], [s * 0.62, 0.2, 0.1], 0.04, G, 4); cone(mb, [s * 0.2, 0.16, 0.1], [s * 0.5, 0.1, 0.3], 0.03, G, 4); });
      mb.sphere(0, -0.02, 0.22, 0.14, 0.05, 0.05, '#301818', 6, 3);
      teethRow(mb, [0.1, 0.02, 0.25], [-0.1, 0.02, 0.25], 5, [0, -1, 0.1], 0.06, '#f0e8d8');
    });
    attachH(m, 'head', mb => { eyes(mb, 0.12, 0.13, 0.22, 0.04, '#3070ff'); }, { unlit: true });
    attachH(m, 'jaw', mb => teethRow(mb, [0.08, -0.02, 0.06], [-0.08, -0.02, 0.06], 4, [0, 1, 0.2], 0.05, '#f0e8d8'));
    m.height = 1.3; m.lungeScale = 0.8; return m;
  });

  // Goblin: little pointy-eared imp in a black cone hat, white shirt, orange vest and red boxing gloves
  reg('goblin', (a) => {
    const m = rig(a); const Sk = '#e0b890', Wh = '#e8e8f0', O = '#e08a28', Gn = '#2a3a28', Rd = '#c02828', Pu = '#6040b0';
    m.bone('body', 'root', [0, 0.52, 0]);
    m.bone('head', 'body', [0, 0.32, 0.02]);
    m.bone('armL', 'body', [0.18, 0.24, 0], [-0.9, 0, 0.3]); m.bone('armR', 'body', [-0.18, 0.24, 0], [-1.2, 0, -0.2]);
    m.bone('legFL', 'body', [0.08, -0.12, 0]); m.bone('legFR', 'body', [-0.08, -0.12, 0]);
    attachH(m, 'body', mb => {
      mb.loft([{ y: -0.14, rx: 0.14, rz: 0.1, color: Gn }, { y: 0.0, rx: 0.15, rz: 0.11, color: Wh }, { y: 0.2, rx: 0.16, rz: 0.11, color: Wh }, { y: 0.3, rx: 0.08, rz: 0.07, color: Wh }], { sides: 8, color: Wh });
      [1, -1].forEach(s => sheet(mb, [[s * 0.04, 0.26, 0.1], [s * 0.16, 0.24, 0.06], [s * 0.16, -0.02, 0.08], [s * 0.06, -0.02, 0.12]], O, sh(O, -0.3)));
      mb.loft([{ y: -0.3, rx: 0.14, rz: 0.11 }, { y: -0.12, rx: 0.15, rz: 0.11 }], { sides: 8, color: Gn });
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.1, 0.02], [0.13, 0.13, 0.13], Sk);
      [1, -1].forEach(s => mb.blade([s * 0.11, 0.1, 0], [s, 0.2, -0.15], 0.28, 0.08, 0.02, Sk, [0, 1, 0]));
      mb.prism(0, 0.16, 0, 0.16, 0.0, 0.34, 8, '#1a1a1e'); mb.prism(0, 0.15, 0, 0.17, 0.17, 0.03, 8, '#2a2a30');
      mb.sphere(0, 0.06, 0.14, 0.03, 0.04, 0.03, sh(Sk, -0.15), 5, 3);
    });
    attachH(m, 'head', mb => eyes(mb, 0.05, 0.12, 0.12, 0.022, '#40a0ff'), { unlit: true });
    const arm = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.12, 0.02], [0, -0.22, 0.04]], 0.04, 0.035, Wh, 5); mb.rbox(0, -0.3, 0.05, 0.14, 0.15, 0.14, Rd, 0.35); });
    m.attach('armL', arm); m.attach('armR', arm);
    const leg = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.2, 0.02], [0, -0.34, 0]], 0.045, 0.035, Sk, 5); mb.rbox(0, -0.36, 0.04, 0.1, 0.07, 0.18, Pu, 0.3); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 1.25; m.lungeScale = 1.2; return m;
  });

  // Wolfmeister / Iron Man share the armoured-giant body: muscled torso with a V chest plate,
  // spiked wristbands, small crested head; Wolfmeister is red with sword & blue shield,
  // Iron Man is blue with horned shoulders and a longer sword
  function armoredGiant(a, c) {
    const m = rig(a); const M = c.main, M2 = c.dark, Pl = c.plate, Au = c.gold;
    const k = c.k || 1;
    m.bone('body', 'root', [0, 1.55 * k, 0]);
    m.bone('head', 'body', [0, 1.08 * k, 0.12 * k]);
    m.bone('armL', 'body', [0.72 * k, 0.86 * k, 0], [-0.25, 0, 0.18]); m.bone('armR', 'body', [-0.72 * k, 0.86 * k, 0], [-0.5, 0, -0.15]);
    m.bone('legFL', 'body', [0.3 * k, -0.3 * k, 0]); m.bone('legFR', 'body', [-0.3 * k, -0.3 * k, 0]);
    attachH(m, 'body', mb => {
      mb.push(); mb.scale(k, k, k);
      mb.loft([{ y: -0.35, rx: 0.4, rz: 0.3 }, { y: 0.1, rx: 0.42, rz: 0.32 }, { y: 0.55, rx: 0.62, rz: 0.42, rzf: 0.48 }, { y: 0.9, rx: 0.66, rz: 0.4 }, { y: 1.08, rx: 0.3, rz: 0.25 }], { sides: 12, color: M });
      [1, -1].forEach(s => { sheet(mb, [[s * 0.02, 0.35, 0.5], [s * 0.55, 0.95, 0.35], [s * 0.6, 0.8, 0.4], [s * 0.08, 0.2, 0.52]], Pl, sh(Pl, -0.3)); sheet(mb, [[s * 0.18, 0.5, 0.53], [s * 0.3, 0.62, 0.5], [s * 0.2, 0.72, 0.51]], Au); ell(mb, [s * 0.72, 0.9, 0], [0.32, 0.28, 0.32], M); });
      for (let i = 0; i < 3; i++) [1, -1].forEach(s => ell(mb, [s * 0.13, 0.22 - i * 0.16, 0.36], [0.12, 0.07, 0.06], M2));
      [1, -1].forEach(s => sheet(mb, [[s * 0.05, 0.12, 0.49], [s * 0.2, -0.05, 0.42], [s * 0.05, -0.12, 0.45]], '#c02030'));
      mb.loft([{ y: -0.42, rx: 0.44, rz: 0.33 }, { y: -0.3, rx: 0.45, rz: 0.34 }], { sides: 10, color: M2 });
      if (c.horns) [1, -1].forEach(s => horn(mb, [s * 0.75, 1.05, -0.05], [s * 0.95, 1.6, 0.0], [s * 0.7, 2.1, 0.15], 0.14, M, 5, 6));
      mb.pop();
    });
    attachH(m, 'head', mb => {
      mb.push(); mb.scale(k, k, k);
      ell(mb, [0, 0.1, 0], [0.18, 0.17, 0.18], M2);
      for (let i = 0; i < 5; i++) mb.blade([(i - 2) * 0.07, 0.18, -0.02], [(i - 2) * 0.4, 1, -0.4], 0.2 + (i % 2) * 0.06, 0.06, 0.03, M);
      [1, -1].forEach(s => mb.blade([s * 0.14, 0.12, 0], [s, 0.4, -0.2], 0.22, 0.08, 0.03, M));
      mb.pop();
    });
    attachH(m, 'head', mb => eyes(mb, 0.06 * k, 0.1 * k, 0.16 * k, 0.025 * k, c.eye), { unlit: true });
    const arm = (sword, shield) => mesh(mb => {
      mb.push(); mb.scale(k, k, k);
      limb(mb, [[0, 0, 0], [0, -0.5, 0.04]], 0.22, 0.19, M, 8);
      limb(mb, [[0, -0.5, 0.04], [0, -1.0, 0.12]], 0.2, 0.17, M, 8);
      mb.loft([{ y: -0.72, rx: 0.23, rz: 0.23, z: 0.08 }, { y: -0.95, rx: 0.22, rz: 0.22, z: 0.11 }], { sides: 8, color: Au });
      for (let i = 0; i < 7; i++) { const an = (i / 7) * PI * 2; mb.blade([C(an) * 0.22, -0.84, 0.09 + S(an) * 0.22], [C(an), 0, S(an)], 0.12, 0.06, 0.03, '#e8e8f0'); }
      mb.rbox(0, -1.1, 0.14, 0.26, 0.24, 0.26, M2, 0.3);
      if (sword) { mb.box(0, -1.08, 0.3, 0.06, 0.06, 0.4, '#3a3030'); mb.box(0, -1.08, 0.5, 0.3, 0.06, 0.06, Au); sheet(mb, [[0, -1.02, 0.52], [0, -1.14, 0.52], [0, -1.12, 0.52 + c.blade], [0, -1.08, 0.62 + c.blade], [0, -1.04, 0.52 + c.blade]].map(p => [p[0], p[1] + (p[2] - 0.52) * 0.45, p[2] - (p[2] - 0.52) * 0.05]), '#d0d4dc', '#a0a4ac'); }
      if (shield) { mb.push(); mb.translate(0.24, -0.75, 0.12); mb.rotate(0, PI / 2, 0); mb.panel([[0, 0.55], [0.45, 0.35], [0.5, -0.3], [0, -0.8], [-0.5, -0.3], [-0.45, 0.35]], 0, 0.08, c.shield); mb.pop(); }
      mb.pop();
    });
    m.attach('armL', arm(false, !!c.shield)); m.attach('armR', arm(true, false));
    const leg = mesh(mb => {
      mb.push(); mb.scale(k, k, k);
      limb(mb, [[0, 0, 0], [0, -0.55, 0.05]], 0.26, 0.22, M, 8);
      limb(mb, [[0, -0.55, 0.05], [0, -1.05, 0.0]], 0.22, 0.18, M, 8);
      mb.loft([{ y: -0.95, rx: 0.22, rz: 0.22 }, { y: -1.1, rx: 0.24, rz: 0.24 }], { sides: 8, color: Au });
      for (let i = 0; i < 6; i++) { const an = (i / 6) * PI * 2; mb.blade([C(an) * 0.23, -1.0, S(an) * 0.23], [C(an), 0, S(an)], 0.1, 0.05, 0.03, '#e8e8f0'); }
      mb.rbox(0, -1.18, 0.1, 0.32, 0.14, 0.5, M2, 0.25);
      mb.pop();
    });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 2.8 * k; m.lungeScale = 0.8; return m;
  }
  reg('wolfmeister', (a) => armoredGiant(a, { main: '#9a1c1c', dark: '#6a1010', plate: '#a8a8b8', gold: '#c8a030', eye: '#ffe040', blade: 1.2, shield: '#3a5ac8', k: 1 }));

  // Eagle Gun: hovering navy robot bird. A big beaked eagle helmet with a red visor stripe, bulky gatling housings
  // at the shoulders with fans of long barrels as wing primaries and steel blade flaps below, a silver belly orb,
  // two short legs with red talons held forward, and a long tapered dark tail trailing down and back
  reg('eagle_gun', (a) => {
    const m = rig(a); m.floats = true; const N = '#2a3450', N2 = '#1a2034', Gy = '#6a7890', St = '#8aa0c0', Rd = '#e02030', Sv = '#a8b0c0', Br = '#a08040';
    m.bone('body', 'root', [0, 2.3, 0], [0.15, 0, 0]);
    m.bone('head', 'body', [0, 1.02, 0.2], [-0.1, 0, 0]);
    m.bone('wingL', 'body', [0.45, 0.78, -0.05]); m.bone('wingR', 'body', [-0.45, 0.78, -0.05]);
    m.bone('armL', 'body', [0.22, 0.05, 0.3], [-0.9, 0, 0.1]); m.bone('armR', 'body', [-0.22, 0.05, 0.3], [-0.9, 0, -0.1]);   // talon legs held forward
    m.bone('tail', 'body', [0, -0.35, -0.1]);
    attachH(m, 'body', mb => {
      mb.loft([{ y: -0.45, rx: 0.3, rz: 0.26 }, { y: 0.1, rx: 0.34, rz: 0.28 }, { y: 0.55, rx: 0.46, rz: 0.32 }, { y: 0.9, rx: 0.4, rz: 0.28 }, { y: 1.02, rx: 0.16, rz: 0.15 }], { sides: 8, sq: 3, color: N });
      mb.frustum(0, 0.45, 0.22, 0.42, 0.15, 0.52, 0.15, 0.42, Gy);                                          // chest plate
      [1, -1].forEach(s => sheet(mb, [[s * 0.1, 0.62, 0.34], [s * 0.32, 0.56, 0.32], [s * 0.2, 0.46, 0.35]], Rd));
      ell(mb, [0, -0.08, 0.26], [0.3, 0.3, 0.26], Sv, 8, 6);                                                   // silver belly orb
    });
    attachH(m, 'head', mb => {
      mb.rbox(0, 0.2, 0, 0.62, 0.54, 0.68, N, 0.3);                                                            // big eagle helmet
      mb.box(0, 0.46, -0.05, 0.14, 0.14, 0.6, N2);                                                            // crest ridge
      tube(mb, bez([0, 0.12, 0.32], [0, 0.12, 0.62], [0, -0.14, 0.72], 3), [0.15, 0.1, 0.05, 0.005], Sv, 5);   // hooked beak
      mb.box(0, 0.25, 0.33, 0.54, 0.12, 0.04, '#101018');
    });
    attachH(m, 'head', mb => mb.box(0, 0.25, 0.355, 0.5, 0.06, 0.02, '#ff2020'), { unlit: true });              // red visor stripe
    const wing = (s) => mesh(mb => {
      mb.rbox(s * 0.4, 0.15, 0, 0.72, 0.62, 0.62, N, 0.2);                                                    // gatling housing
      for (let i = 0; i < 3; i++) mb.box(s * 0.4, 0.02 + i * 0.13, 0.32, 0.6, 0.05, 0.02, N2);
      tube(mb, [[0, 0, 0], [s * 0.2, 0.1, 0]], 0.14, N2, 6);
      for (let i = 0; i < 5; i++) {                                                                             // barrels fanning up and out like primaries
        const an = 0.2 + i * 0.28, d = [s * C(an), S(an), 0.1], base = [s * (0.7 + 0.04 * i), 0.1 + i * 0.1, 0.0];
        tube(mb, [base, V.add(base, V.scale(d, 1.55))], 0.06, Gy, 6); mb.rbox(...V.add(base, V.scale(d, 1.5)), 0.13, 0.13, 0.13, '#dfe4ea', 0.2);
        tube(mb, [base, V.add(base, V.scale(d, 0.5))], 0.11, N2, 6);
      }
      sheet(mb, [[s * 0.2, -0.1, 0.05], [s * 0.8, -0.12, 0.05], [s * 1.25, -0.75, -0.1], [s * 0.7, -0.5, 0.0]], St, sh(St, -0.3));   // steel blade flaps
      sheet(mb, [[s * 0.1, -0.1, -0.05], [s * 0.5, -0.15, -0.05], [s * 0.7, -0.95, -0.15], [s * 0.3, -0.55, -0.1]], sh(St, -0.1), sh(St, -0.35));
    });
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    const talon = mesh(mb => {
      limb(mb, [[0, 0, 0], [0, -0.3, 0.05], [0, -0.52, 0.1]], 0.1, 0.07, N2, 6);
      mb.rbox(0, -0.56, 0.1, 0.16, 0.1, 0.16, Gy, 0.3);
      claws(mb, [0, -0.58, 0.16], [0, -0.4, 1], 3, 0.26, 0.035, Rd, 1.1);
      cone(mb, [0, -0.58, 0.02], [0, -0.7, -0.2], 0.035, Rd, 4);                                              // hind claw
    });
    m.attach('armL', talon); m.attach('armR', talon);
    attachH(m, 'tail', mb => {                                                                                  // long tapered tail with a brass stripe
      const pts = bez3([0, 0, 0], [0, -0.7, -0.3], [0, -1.3, -1.0], [0, -1.6, -2.1], 7);
      tube(mb, pts, (t) => 0.3 * (1 - t) + 0.03, (t, k, i) => i === 2 ? Br : (i % 2 ? N2 : N), 6);
      [2, 4, 6].forEach(i => mb.blade(pts[i], [0, 0.6, -1], 0.4, 0.28, 0.04, St, [1, 0, 0]));
    });
    m.height = 4.4; m.lungeScale = 0.6; return m;
  });

  // ================================================================== Junon / Underwater Reactor / Gelnika

  // Guard System: a "No Entry" (侵入禁止) warning board on a yellow-striped base
  let guardTex = null;
  function guardFace() {
    if (guardTex) return guardTex;
    const T = FF7.tex, t = T.create(64, 80, '#1a6ad8'), Y = '#f0e040', Pk = '#f050a0';
    T.line(t, 0, 0, 64, 80, 7, '#e02020'); T.line(t, 64, 0, 0, 80, 7, '#e02020');
    const k = (pts, c) => T.curve(t, pts, 3, c);
    // 侵 入 / 禁 止 (brush approximation)
    k([[6, 12], [10, 6]], Y); k([[9, 8], [9, 30]], Y); k([[14, 8], [26, 8], [26, 14], [14, 14]], Y); k([[13, 19], [28, 19]], Y); k([[16, 22], [26, 30]], Y); k([[26, 22], [14, 30]], Y);
    k([[46, 6], [48, 12], [40, 30]], Y); k([[47, 13], [58, 30]], Y);
    k([[6, 44], [18, 44]], Pk); k([[12, 40], [12, 56]], Pk); k([[12, 46], [6, 54]], Pk); k([[12, 46], [18, 52]], Pk); k([[20, 44], [30, 44]], Pk); k([[25, 40], [25, 56]], Pk); k([[8, 60], [28, 60]], Pk); k([[18, 60], [18, 72]], Pk); k([[12, 66], [8, 70]], Pk); k([[24, 66], [28, 70]], Pk);
    k([[48, 42], [48, 72]], Y); k([[48, 54], [58, 54]], Y); k([[38, 58], [38, 72]], Y); k([[34, 72], [60, 72]], Y);
    T.fillRect(t, 0, 76, 64, 4, '#f0d020');
    return (guardTex = t);
  }
  reg('guard_system', (a) => {
    const m = rig(a); const Fr = '#1e3a78', R = '#d02020', Y = '#e8c020', Dk = '#2a2a30';
    m.bone('body', 'root', [0, 0.55, 0]);
    attachH(m, 'body', mb => {
      mb.box(0, 0.95, 0, 1.3, 1.6, 0.26, Fr);
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([x, y]) => sheet(mb, [[x * 0.65, 0.95 + y * 0.8, 0.135], [x * 0.4, 0.95 + y * 0.8, 0.135], [x * 0.65, 0.95 + y * 0.55, 0.135]], R));
      [1, -1].forEach(s => mb.box(s * 0.45, 1.82, 0, 0.14, 0.1, 0.14, '#e0a020'));
      mb.box(0, 0.08, 0, 1.2, 0.2, 0.5, Dk);
      for (let i = 0; i < 6; i++) mb.box(-0.3 + i * 0.12, 0.08, 0.26, 0.06, 0.14, 0.02, i % 2 ? Y : '#202020');
      mb.box(0, -0.25, 0.1, 1.6, 0.46, 0.9, '#264a8a'); mb.box(0, -0.02, 0.3, 1.5, 0.04, 0.4, R);
      [1, -1].forEach(s => mb.box(s * 0.8, 0.4, -0.05, 0.12, 0.8, 0.3, Y));
    });
    m.attach('body', panelTex(64, 80, guardFace(), 0, 0.98, 0.135, 0.98, 1.24));
    m.height = 2.5; m.lungeScale = 0.1; return m;
  });

  // Rocket Launcher (~1.25 m): base plate, teal-panelled box, a dark A-frame carrying a sphere joint and a solid
  // dark-brown rocket pod with a 3x3 grid face, and a horizontal white launch tube on a leaning pole
  reg(['rocket_launcher', 'rocket_launcher_gs'], (a) => {
    const m = rig(a); const Br = '#6a5a48', Wh = '#e8e8e4', Lv = '#b8b4d8', Dk = '#3a2a20', Fr = '#2a2e34';
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('head', 'body', [-0.35, 1.35, 0.05]);
    attachH(m, 'body', mb => {
      mb.box(0, 0.03, 0, 1.3, 0.06, 0.6, Br);
      mb.box(-0.02, 0.3, 0.04, 0.34, 0.5, 0.34, '#607070'); mb.box(-0.02, 0.3, 0.215, 0.18, 0.36, 0.02, '#3a8a9a');   // teal-panelled box
      [1, -1].forEach(q => { mb.push(); mb.translate(0.34, 0.4, q * 0.08); mb.rotate(0, 0, q * 0.35 - 0.1); mb.box(0, 0, 0, 0.1, 0.72, 0.08, Fr); mb.pop(); });   // dark A-frame legs
      mb.sphere(0.25, 0.8, 0, 0.19, 0.19, 0.19, Lv, 8, 6);
      mb.box(0.52, 1.04, -0.04, 0.6, 0.56, 0.3, Dk);                                                         // solid rocket pod
      for (let i = 0; i < 4; i++) { mb.box(0.52, 0.78 + i * 0.173, 0.12, 0.58, 0.025, 0.03, '#a0a0a8'); mb.box(0.25 + i * 0.18, 1.04, 0.12, 0.025, 0.54, 0.03, '#a0a0a8'); }   // 3x3 grid face
      tube(mb, [[-0.42, 0.06, 0], [-0.4, 0.7, 0.03], [-0.35, 1.22, 0.05]], 0.03, '#8a8a70', 5);           // leaning pole
    });
    attachH(m, 'head', mb => { mb.box(0, 0.0, 0, 0.12, 0.26, 0.12, '#7a5a40'); tube(mb, [[-0.25, 0.2, 0], [0.55, 0.2, 0]], 0.09, Wh, 8); mb.prism(-0.25, 0.2, 0, 0.1, 0.1, 0.02, 8, '#a0a0a0'); });
    m.height = 1.65; m.scale = 0.76; m.lungeScale = 0.1; return m;
  });

  // Shinra naval troops (not in the bestiary sheet: built from the in-game soldier kit)
  // Submarine Crew: navy sailor fatigues, white-trimmed cap, combat knife
  reg('submarine_crew', (a) => {
    const m = human({ base: 'mp', _id: 'd23_subcrew', facePaint: null, torso: null, noEars: false, bootCuff: null, straps: '#141418', top: '#2c4470', sleeve: '#2c4470', bottom: '#2c4470', hair: '#e8e8e8', hairStyle: 'cap', capColor: '#e8e8ec', boots: '#1a1a1a',
      gloves: '#1a1a1a', belt: '#e0c060', extras: ['belt', 'mask', 'vestArmor'], armorColor: '#1e2e50', maskColor: '#1a1a24', weapon: 'rod' }, 1.7);
    m.weaponMesh = mesh(mb => { mb.box(0, 0.0, 0, 0.025, 0.08, 0.03, '#202020'); sheet(mb, [[0, -0.04, -0.012], [0, -0.04, 0.02], [0, -0.22, 0.01], [0, -0.25, -0.012]], '#e0e4ec', '#a0a4ac'); }); m.showWeapon(true);
    return m;
  });
  // Underwater MP: khaki fatigues, olive balaclava, yellow shoulder pads, pistol
  reg('underwater_mp', (a) => {
    const m = human({ base: 'mp', _id: 'd23_uwmp', facePaint: null, torso: null, noEars: false, bootCuff: null, straps: '#141418', skin: '#8aa040', top: '#c8b890', sleeve: '#c8b890', bottom: '#c8b890', hair: '#c8c0a0', hairStyle: 'cap', capColor: '#d8d0b0', boots: '#3a3830', gloves: '#3a3830',
      pauldron: '#d8b030', belt: '#5a5040', extras: ['belt', 'pauldronL', 'pauldronR', 'mask'], maskColor: '#303828', weapon: 'gun' }, 1.72);
    return m;
  });
  // Captain: navy officer's coat with gold buttons, peaked cap
  reg('captain', (a) => {
    const m = human({ base: 'man', _id: 'd23_captain', skin: '#e8b890', hair: '#3a3028', hairStyle: 'short', top: '#1c2a48', sleeve: '#1c2a48', bottom: '#1c2a48', pants: 'tight', boots: '#101010', bootsTall: true,
      gloves: '#e8e8e8', buttons: '#e0c040', buttonN: 4, coatColor: '#1c2a48', belt: '#101010', buckle: '#e0c040', extras: ['coat', 'belt', 'mustache'], weapon: 'gun' }, 1.75);
    const H = m.H;
    attachH(m, 'head', mb => {
      mb.loft([{ y: H.hh * 0.8, rx: H.hw * 0.56, rz: H.hd * 0.56 }, { y: H.hh * 1.05, rx: H.hw * 0.62, rz: H.hd * 0.64 }, { y: H.hh * 1.12, rx: H.hw * 0.6, rz: H.hd * 0.62 }], { sides: 12, color: '#1c2a48' });
      mb.loft([{ y: H.hh * 0.78, rx: H.hw * 0.57, rz: H.hd * 0.57 }, { y: H.hh * 0.86, rx: H.hw * 0.57, rz: H.hd * 0.57 }], { sides: 12, color: '#e0c040' });
      sheet(mb, [[-H.hw * 0.4, H.hh * 0.8, H.hd * 0.5], [H.hw * 0.4, H.hh * 0.8, H.hd * 0.5], [H.hw * 0.35, H.hh * 0.76, H.hd * 0.8], [-H.hw * 0.35, H.hh * 0.76, H.hd * 0.8]], '#101018');
    });
    return m;
  });

  // Guardian: hulking orange-brown robot with dark faceted shoulder rocks, a visor-slit head, maroon legs
  reg('guardian', (a) => {
    const m = rig(a); const O = '#b0602a', O2 = '#7a3a1a', Dk = '#3a3a44', Mr = '#8a3a2a', Tn = '#c08060';
    m.bone('body', 'root', [0, 1.8, 0]);
    m.bone('head', 'body', [0, 1.05, 0.2]);
    m.bone('armL', 'body', [0.95, 0.75, 0], [0, 0, 0.1]); m.bone('armR', 'body', [-0.95, 0.75, 0], [0, 0, -0.1]);
    m.bone('legFL', 'body', [0.45, -0.3, 0]); m.bone('legFR', 'body', [-0.45, -0.3, 0]);
    attachH(m, 'body', mb => {
      mb.frustum(0, -0.4, 0, 0.8, 0.6, 1.3, 0.8, 1.35, { side: O2, front: O, top: O, back: O2 });
      mb.frustum(0, -0.4, 0.3, 0.4, 0.1, 0.6, 0.12, 1.2, O);
      mb.box(0, -0.5, 0, 0.9, 0.2, 0.62, Dk);
      [1, -1].forEach(s => { mb.frustum(s * 0.8, 0.3, 0.1, 0.6, 0.5, 0.7, 0.6, 0.6, Dk); mb.box(s * 0.45, 1.0, 0.1, 0.25, 0.3, 0.3, Dk); });
    });
    attachH(m, 'head', mb => { mb.frustum(0, 0, 0, 0.4, 0.5, 0.5, 0.45, 0.45, O); mb.box(0, 0.24, 0.24, 0.36, 0.03, 0.02, '#e0e8f0'); mb.box(0, 0.5, -0.05, 0.08, 0.2, 0.08, '#8a6a40'); });
    const arm = mesh(mb => {
      mb.sphere(0, 0, 0, 0.5, 0.45, 0.5, Dk, 6, 4, false);
      for (let i = 0; i < 5; i++) { const an = (i / 5) * PI * 2; mb.spike([C(an) * 0.4, -0.1, S(an) * 0.4], [C(an), -0.4, S(an)], 0.35, 0.18, 4, '#50505a'); }
      mb.sphere(0, -0.75, 0.1, 0.45, 0.35, 0.45, '#4a4a54', 6, 4, false);
      mb.sphere(0, -1.05, 0.15, 0.3, 0.25, 0.3, O2, 6, 4, false);
    });
    m.attach('armL', arm); m.attach('armR', arm);
    const leg = mesh(mb => { mb.frustum(0, -0.6, 0, 0.3, 0.3, 0.4, 0.4, 0.6, Mr); mb.frustum(0, -1.15, 0.05, 0.36, 0.38, 0.3, 0.3, 0.55, Tn); mb.frustum(0, -1.5, 0.12, 0.44, 0.6, 0.36, 0.42, 0.35, '#a05a40'); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 3.3; m.lungeScale = 0.5; return m;
  });

  // Tank family (Gun Carrier, Cromwell): boxy turret with a round cannon mouth, heavy tracks and road wheels
  function tank(a, c) {
    const m = rig(a); const T = c.turret, T2 = sh(c.turret, -0.3), Tr = c.track, W = c.wheel || '#3a3230';
    m.bone('body', 'root', [0, 0.5, 0]);
    m.bone('head', 'body', [0, 0.3, 0]);
    attachH(m, 'body', mb => {
      mb.box(0, 0.1, 0, 1.3, 0.35, 1.3, c.hull || '#5a4a3a');
      [1, -1].forEach(s => {
        mb.loft([{ y: -0.28, rx: 0.2, rz: 0.72 }, { y: 0.2, rx: 0.2, rz: 0.76 }].map(r => Object.assign(r, { x: s * 0.72 })), { sides: 8, sq: 6, color: Tr });
        for (let i = 0; i < 4; i++) { mb.push(); mb.translate(s * 0.83, -0.04, -0.5 + i * 0.33); mb.rotate(0, 0, PI / 2); mb.prism(0, -0.02, 0, 0.14, 0.14, 0.04, 8, W); mb.pop(); }
        mb.box(s * 0.72, 0.35, 0.72, 0.36, 0.16, 0.28, sh(Tr, 0.2));
      });
    });
    attachH(m, 'head', mb => {
      mb.frustum(0, 0, -0.05, 0.9, 0.9, 0.78, 0.72, 0.95, { side: T2, front: T, top: sh(T, 0.1), back: T2 });
      mb.box(0, 1.02, -0.2, 0.3, 0.14, 0.2, T2); mb.box(0, 1.1, -0.2, 0.26, 0.04, 0.04, '#505050');
      mb.push(); mb.translate(0, 0.55, 0.38); mb.rotate(PI / 2, 0, 0);
      mb.prism(0, 0, 0, 0.26, 0.26, 0.12, 10, '#9a9aa0'); mb.prism(0, 0.12, 0, 0.26, 0.22, 0.06, 10, '#c8c8d0'); mb.prism(0, 0.17, 0, 0.16, 0.16, 0.01, 10, '#101010');
      mb.pop();
    });
    m.height = 1.9; m.lungeScale = 0.3; return m;
  }
  reg('gun_carrier', (a) => tank(a, { turret: '#c8802a', track: '#303038', hull: '#6a4a2a', wheel: '#6a4a30' }));

  // Carry Armor: dark teal lift-tower (yellow pentagon beacon on a dark cap, gold visor slot, red lantern
  // cylinder) standing on a big silver ribbed dome with radial spikes and four thruster legs; its two giant
  // arch arms are separate combatants (left_arm / right_arm) mounted on it with CR.anchor
  reg('carry_armor', (a) => {
    const m = rig(a); const Tl = '#1e3a44', Tl2 = '#2c5a66', St = '#a8b0bc', St2 = '#6a7080', Au = '#c89a30', R = '#b02028';
    m.bone('body', 'root', [0, 1.3, 0]);
    m.bone('head', 'body', [0, 1.78, 0]);
    ['FL', 'FR', 'BL', 'BR'].forEach((k, i) => m.bone('leg' + k, 'root', [(i % 2 ? -1 : 1) * 0.52, 0.62, (i < 2 ? 1 : -1) * 0.4]));
    attachH(m, 'body', mb => {
      // the tower
      mb.frustum(0, 0.1, 0, 0.72, 0.62, 0.62, 0.54, 1.62, { side: Tl, front: Tl2, top: Tl2 });
      mb.box(0, 1.42, 0.31, 0.46, 0.2, 0.05, Au); mb.box(0, 1.42, 0.335, 0.3, 0.08, 0.02, '#1a1a1a');
      tube(mb, [[0, 0.42, 0.42], [0, 0.9, 0.42]], 0.2, R, 8); mb.prism(0, 0.9, 0.42, 0.22, 0.12, 0.1, 8, '#e04040'); mb.prism(0, 0.3, 0.42, 0.14, 0.22, 0.12, 8, '#801820');
      mb.box(0, 0.62, 0.33, 0.3, 0.06, 0.06, Au);
      [1, -1].forEach(s => tube(mb, [[s * 0.3, 0.5, 0.3], [s * 0.34, 0.9, 0.42], [s * 0.3, 1.2, 0.32]], 0.035, '#5a5a6a', 4));
      // shoulder hub where the arch arms plug in
      [1, -1].forEach(s => { mb.rbox(s * 0.34, 1.7, -0.06, 0.36, 0.3, 0.44, Tl2, 0.25); ell(mb, [s * 0.54, 1.72, -0.06], [0.08, 0.14, 0.14], Au, 6, 4); });
      // the silver ribbed dome below the tower, radial spikes and angled skirt plates
      const rib = [St, St2];
      mb.loft([{ y: -0.85, rx: 0.3, rz: 0.3, color: St2 }, { y: -0.7, rx: 0.68, rz: 0.62, color: St }, { y: -0.5, rx: 0.9, rz: 0.82, color: St2 }, { y: -0.3, rx: 1.0, rz: 0.9, color: St },
        { y: -0.1, rx: 0.98, rz: 0.88, color: St2 }, { y: 0.1, rx: 0.86, rz: 0.78, color: St }, { y: 0.26, rx: 0.56, rz: 0.5, color: rib[0] }, { y: 0.32, rx: 0.3, rz: 0.3 }], { sides: 12, color: St });
      for (let i = 0; i < 8; i++) {
        const an = (i + 0.5) / 8 * PI * 2, d = [C(an), -0.35, S(an)], p = [C(an) * 0.92, -0.25, S(an) * 0.83];
        cone(mb, p, V.add(p, V.scale(V.norm(d), 0.75)), 0.09, i % 2 ? St : '#8a92a0', 4);
        mb.blade([C(an) * 0.7, 0.05, S(an) * 0.64], [C(an), 0.55, S(an)], 0.45, 0.4, 0.06, i % 2 ? St : St2, [-S(an), 0, C(an)]);
      }
    });
    attachH(m, 'head', mb => { mb.box(0, 0.04, 0, 0.44, 0.1, 0.4, '#1a2830'); mb.box(0, 0.14, 0, 0.14, 0.1, 0.14, '#303030'); });
    attachH(m, 'head', mb => { mb.prism(0, 0.34, 0, 0.14, 0.0, 0.14, 5, '#f8f040'); mb.prism(0, 0.34, 0, 0.14, 0.12, 0.0, 5, '#f8f040'); }, { unlit: true });
    // thruster legs: a funnel under the dome and a thin strut to the floor
    const leg = mesh(mb => { mb.prism(0, -0.28, 0, 0.1, 0.22, 0.3, 6, St2); mb.prism(0, -0.34, 0, 0.14, 0.14, 0.06, 6, '#c08040'); tube(mb, [[0, -0.3, 0], [0, -0.62, 0]], 0.04, '#d8dce0', 5); horn(mb, [0, -0.6, 0], [0, -0.66, 0.08], [0.02, -0.58, 0.14], 0.03, '#d8dce0', 4, 2); });
    ['FL', 'FR', 'BL', 'BR'].forEach(k => m.attach('leg' + k, leg));
    m.height = 3.55; m.lungeScale = 0.3; return m;
  });
  // Carry Armor's arms: big teal-steel box-beam arms arching over and around the body — from the shoulder hub
  // up to a gold elbow pad, out across the top, down the outside past gold hex bolts and curling in at the
  // bottom to a three-bladed claw. Built around the outer (vertical) part of the arch; s = +1 left (model's
  // left, +x), -1 right. Mounted on carry_armor 1.9 m to each side.
  function carryArm(a, s) {
    const m = rig(a); const Tl = '#2a6a80', Tl2 = '#1e4a58', Tl3 = '#3a86a0', Au = '#c89a30', Cl = '#9aa4b0';
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('armL', 'body', [s * 0.05, 0.95, 0.42]);
    const P = [[-s * 1.52, 3.0, -0.06], [-s * 1.3, 3.72, -0.04], [-s * 0.55, 4.18, 0.0], [s * 0.12, 3.92, 0.08], [s * 0.26, 2.6, 0.2], [s * 0.14, 1.35, 0.36], [s * 0.05, 0.95, 0.42]];
    attachH(m, 'body', mb => {
      for (let i = 0; i < P.length - 2; i++) {
        mb.sweep([P[i], P[i + 1]], [[0.26, 0.2], [0.24, 0.19]], { up: [0, 0, 1], sides: 4, phase: PI / 4, smooth: false, colors: (k, j) => j === 0 ? Tl3 : j === 2 ? Tl2 : Tl });
        mb.sphere(P[i + 1][0], P[i + 1][1], P[i + 1][2], 0.27, 0.27, 0.27, Tl2, 6, 4, false);
        if (i > 1) disc(mb, [P[i + 1][0], P[i + 1][1], P[i + 1][2] + 0.26], 0.12, 0.12, Au, 6);
      }
      // gold elbow pad and bolt spikes on top
      mb.rbox(P[1][0], P[1][1] + 0.26, P[1][2], 0.42, 0.2, 0.36, Au, 0.3);
      mb.blade(P[2], [s * 0.2, 1, -0.3], 0.3, 0.14, 0.06, Au); mb.blade(P[3], [s * 0.7, 0.7, -0.2], 0.3, 0.14, 0.06, Au);
      mb.sphere(P[0][0], P[0][1], P[0][2], 0.3, 0.3, 0.3, Tl2, 6, 4, false);
    });
    // wrist and claw: three long blades curling in toward the body
    attachH(m, 'armL', mb => {
      mb.sweep([[0, 0.4, -0.06], [0, 0, 0]], [[0.24, 0.19], [0.22, 0.18]], { up: [0, 0, 1], sides: 4, phase: PI / 4, smooth: false, color: Tl });
      ell(mb, [0, 0, 0], [0.26, 0.22, 0.26], Tl2, 6, 4); disc(mb, [0, 0.02, 0.27], 0.1, 0.1, Au, 6);
      for (let i = 0; i < 3; i++) { const y = -0.1 - i * 0.12, z = 0.05 + (i - 1) * 0.16; horn(mb, [-s * 0.15, y, z], [-s * 0.6, y - 0.14, z + 0.08], [-s * 0.95, y + 0.04, z + (i - 1) * 0.1], 0.07, Cl, 4, 4); }
    });
    m.onPose = (mm) => { const w = mm.b('armL'); w.rot[0] *= 0.35; };
    m.height = 4.3; m.lungeScale = 0.35;
    return CR.anchor(m, 'carry_armor', [s * 1.9, 0, 0]);
  }
  reg('left_arm', (a) => carryArm(a, 1));
  reg('right_arm', (a) => carryArm(a, -1));

  // ---- The Turks (battle models): one model per Turk for every fight (Sector 7 pillar, Gongaga, Junon, Midgar),
  // all in the same navy suit (#23306e, the cast presets), each in the signature battle stance: Reno slouching
  // with the EMR rod resting on his right shoulder and his left hand in his pocket, Rude in a boxing guard, Elena
  // with a hand on her hip (chin-length honey bob, slimmer female build, flared trouser hems). The presets come
  // from cast_models.js; the stance / attack / hurt clips below drive the humanoid bones.
  const lerp = (x, y, t) => x + (y - x) * t, ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const TURK_STANCE = {
    reno(m, p) {
      const br = S(p * PI * 2);
      m.b('hips').pos[1] = -0.012 + br * 0.003; m.b('hips').rot[2] = 0.04;
      m.b('thighL').rot[0] = -0.14; m.b('thighL').rot[2] = 0.07; m.b('shinL').rot[0] = 0.26;
      m.b('thighR').rot[0] = 0.06; m.b('thighR').rot[2] = -0.1; m.b('shinR').rot[0] = 0.1;
      m.b('torso').rot[0] = 0.1 + br * 0.015; m.b('torso').rot[1] = 0.12; m.b('torso').rot[2] = -0.05;
      m.b('head').rot[0] = 0.06; m.b('head').rot[2] = 0.1;
      m.b('armR').rot[0] = 0.0; m.b('armR').rot[1] = 0.8; m.b('armR').rot[2] = -0.4; m.b('foreR').rot[0] = -2.55; m.b('foreR').rot[1] = -0.61;   // rod resting on the shoulder
      m.b('armL').rot[0] = 0.12; m.b('armL').rot[2] = 0.16; m.b('foreL').rot[0] = -0.32; m.b('foreL').rot[2] = -0.12;   // hand in the pocket
    },
    rude(m, p) {
      const br = S(p * PI * 2);
      m.b('hips').pos[1] = -0.03 + br * 0.006;
      m.b('thighL').rot[0] = -0.34; m.b('thighL').rot[2] = 0.1; m.b('shinL').rot[0] = 0.5;
      m.b('thighR').rot[0] = 0.18; m.b('thighR').rot[2] = -0.1; m.b('shinR').rot[0] = 0.38;
      m.b('torso').rot[0] = 0.16 + br * 0.02; m.b('torso').rot[1] = 0.12; m.b('head').rot[0] = -0.08;
      m.b('armR').rot[0] = -0.62; m.b('armR').rot[1] = 0.35; m.b('armR').rot[2] = -0.12; m.b('foreR').rot[0] = -2.05;   // boxing guard: fists before the chin
      m.b('armL').rot[0] = -0.8 + br * 0.04; m.b('armL').rot[1] = -0.35; m.b('armL').rot[2] = 0.12; m.b('foreL').rot[0] = -2.0;
    },
    elena(m, p) {
      const br = S(p * PI * 2);
      m.b('hips').pos[1] = -0.004 + br * 0.003; m.b('hips').rot[2] = -0.05;
      m.b('thighL').rot[0] = -0.06; m.b('thighL').rot[2] = 0.05; m.b('shinL').rot[0] = 0.06;
      m.b('thighR').rot[0] = 0.06; m.b('thighR').rot[2] = 0.02; m.b('shinR').rot[0] = 0.14;
      m.b('torso').rot[0] = 0.02 + br * 0.01; m.b('torso').rot[2] = 0.05; m.b('head').rot[2] = -0.06;
      m.b('armR').rot[0] = 0.22; m.b('armR').rot[1] = 0.25; m.b('armR').rot[2] = -0.58; m.b('foreR').rot[0] = -0.35; m.b('foreR').rot[2] = 1.35;   // hand on the hip
      m.b('armL').rot[0] = -0.05; m.b('armL').rot[2] = 0.1; m.b('foreL').rot[0] = -0.22;
    },
  };
  const TURK_ATTACK = {
    reno(m, p) {   // swing the rod off the shoulder in a downward arc
      TURK_STANCE.reno(m, 0);
      const wind = Math.min(1, p / 0.35), sw = p < 0.35 ? 0 : ease(Math.min(1, (p - 0.35) / 0.3));
      m.b('armR').rot[0] = lerp(lerp(0.0, -2.5, wind), -0.9, sw); m.b('armR').rot[2] = lerp(-0.4, -0.2, sw); m.b('armR').rot[1] = lerp(lerp(0.8, 0.3, wind), 0.1, sw);
      m.b('foreR').rot[0] = lerp(lerp(-2.55, -1.2, wind), -0.15, sw); m.b('foreR').rot[1] = lerp(-0.61, 0, wind);
      m.b('torso').rot[0] = lerp(lerp(0.1, -0.15, wind), 0.4, sw); m.b('torso').rot[1] = lerp(0.12, -0.3, sw);
    },
    rude(m, p) {   // straight right from the guard
      TURK_STANCE.rude(m, 0);
      const k = S(Math.min(1, p) * PI);
      m.b('armR').rot[0] = lerp(-0.62, -1.55, k); m.b('armR').rot[1] = lerp(0.35, 0.1, k); m.b('foreR').rot[0] = lerp(-2.05, -0.05, k);
      m.b('torso').rot[1] = lerp(0.12, -0.45, k); m.b('torso').rot[0] = lerp(0.16, 0.28, k);
    },
    elena(m, p) {  // front kick, hand staying on the hip
      TURK_STANCE.elena(m, 0);
      const k = S(Math.min(1, p) * PI);
      m.b('thighL').rot[0] = lerp(-0.06, -1.45, k); m.b('shinL').rot[0] = lerp(0.06, 0.1, k);
      m.b('torso').rot[0] = lerp(0.02, -0.25, k); m.b('armL').rot[0] = lerp(-0.05, -0.6, k); m.b('armL').rot[2] = lerp(0.1, 0.5, k);
    },
  };
  // Elena's chin-length bob: hair cap + a side-swept fringe (the builder) + a flared bob shell open at the face
  const elenaHair = (mb, H, a) => {
    const K = FF7.chars3d.hairKit, c = a.hair;
    K.cap(mb, H, c, { front: 0.8, sides: 0.4, back: 0.3, scale: 1.13 });
    K.fringe(mb, H, c, { top: 0.9, len: (t) => 0.6 - (t + 1) * 0.07, n: 5, notch: 0.05, range: 62, part: 0.7, scale: 1.14 });
  };
  const elenaBob = (H, c) => mesh(mb => {
    const K = FF7.chars3d.hairKit, r45 = K.ringAt(H, H.hh * 0.45), r72 = K.ringAt(H, H.hh * 0.72);
    mb.loft([{ y: H.hh * 0.76, rx: r72.rx * 1.12, rz: r72.rz * 1.12, z: r72.z }, { y: H.hh * 0.45, rx: r45.rx * 1.14, rz: r45.rz * 1.12, z: r45.z }, { y: H.hh * 0.1, rx: r45.rx * 1.2, rz: r45.rz * 1.12, z: r45.z - H.hd * 0.03 }, { y: -H.hh * 0.02, rx: r45.rx * 1.14, rz: r45.rz * 1.06, z: r45.z - H.hd * 0.05 }],
      { sides: 14, color: c, arc: [PI / 2 + 0.95, PI / 2 - 0.95 + PI * 2] });
  });
  const TURK_SPEC = {
    reno: { _id: 'd23_reno', extras: ['suitShirt', 'goggles', 'renoMarks'] },
    rude: { _id: 'd23_rude', skin: '#b0805e', hair: '#b0805e', armScale: 0.8 },
    elena: { _id: 'd23_elena', hair: '#d0a458', hairStyle: elenaHair, noEars: true, build: 'slim', shoulderScale: 0.9 },
  };
  const turk = (id) => (a) => {
    const m = human(Object.assign({ base: id }, TURK_SPEC[id]), id === 'rude' ? 1.85 : 1.72, id === 'reno');
    const H = m.H, pr = H.pr;
    if (id === 'reno') attachH(m, 'hips', mb => [1, -1].forEach(s => sheet(mb, [[s * pr.waistRX * 0.12, H.pel * 0.9, pr.waistRZ * 1.2], [s * pr.waistRX * 0.62, H.pel * 0.9, pr.waistRZ * 1.12], [s * pr.waistRX * 0.55, -H.thigh * 0.22, pr.waistRZ * 1.28], [s * pr.waistRX * 0.28, -H.thigh * 0.34, pr.waistRZ * 1.3]], '#f0f0f0', '#c8c8d0')));   // two loose shirt tails
    if (id === 'elena') {
      m.attach('head', elenaBob(H, '#d0a458'), null, { cull: false });
      const srr = pr.shinR * 0.88;
      ['shinL', 'shinR'].forEach(b => attachH(m, b, mb => mb.loft([{ y: -H.shin * 0.55, rx: srr * 1.06, rz: srr * 1.04 }, { y: -H.shin * 0.97, rx: srr * 1.5, rz: srr * 1.42 }], { sides: 8, color: '#23306e', capTop: false })));   // flared trouser hems
    }
    m.clips = {
      turk_battle: { dur: 70, fn: (mm, p) => TURK_STANCE[id](mm, p) },
      turk_attack: { dur: 26, loop: false, fn: (mm, p) => TURK_ATTACK[id](mm, p) },
      turk_hurt: { dur: 18, loop: false, fn: (mm, p) => { TURK_STANCE[id](mm, 0); const k = S(Math.min(1, p) * PI); mm.b('torso').rot[0] -= k * 0.5; mm.b('head').rot[0] -= k * 0.4; mm.b('hips').pos[2] = -k * 0.05; } },
    };
    m.anims = Object.assign({}, m.anims, { battle: 'turk_battle', idle: 'turk_battle', attack: 'turk_attack', hurt: 'turk_hurt' });
    m.play('turk_battle', { restart: true });
    return m;
  };
  reg(['turks_reno', 'reno_2', 'reno_3', 'reno_4'], turk('reno'));
  reg(['rude_2', 'rude_3', 'rude_4', 'rude_5'], turk('rude'));
  reg('elena_2', turk('elena'));

  // Ghost Ship: a spectral wooden galleon with torn grey sails and a skeleton at the helm
  reg('ghost_ship', (a) => {
    const m = rig(a); m.floats = true; const Wd = '#4a3828', Wd2 = '#6a5238', Sl = '#a89c90', Sl2 = '#7a7068', Bn = '#e8e4d8';
    m.bone('body', 'root', [0, 1.0, 0]);
    m.bone('head', 'body', [0.45, 0.7, 0.1]);
    m.bone('armR', 'head', [-0.12, 0.35, 0.05], [-0.9, 0, -0.2]); m.bone('armL', 'head', [0.12, 0.35, 0.05], [-0.9, 0, 0.2]);
    attachH(m, 'body', mb => {
      mb.loft([{ y: -0.55, rx: 0.12, rz: 0.7 }, { y: -0.3, rx: 0.42, rz: 1.1 }, { y: 0.05, rx: 0.55, rz: 1.3 }, { y: 0.25, rx: 0.55, rz: 1.35 }], { sides: 10, color: Wd, capTop: true });
      mb.box(0, 0.26, 0, 1.0, 0.04, 2.4, Wd2);
      mb.box(0, 0.45, -1.05, 1.0, 0.4, 0.4, Wd); mb.box(0, 0.35, 1.1, 0.8, 0.2, 0.3, Wd);
      for (let i = 0; i < 5; i++) mb.box(0, -0.25 + i * 0.12, 0, 1.12 - Math.abs(i - 2) * 0.05, 0.02, 2.5, '#2a2018');
      tube(mb, [[0, 0.3, 1.25], [0, 0.55, 1.8]], 0.03, Wd2, 4);
      [[0, 0.3, 0.45, 2.0], [0, 0.3, -0.45, 1.6]].forEach(([x, y, z, h]) => {
        tube(mb, [[x, y, z], [x, y + h, z]], 0.04, Wd2, 5);
        for (let k = 0; k < 3; k++) { const yy = y + 0.5 + k * 0.5, w = 0.55 - k * 0.1; mb.box(x, yy + 0.4, z, w * 2 + 0.1, 0.03, 0.03, Wd2); sheet(mb, [[x - w, yy + 0.4, z], [x + w, yy + 0.4, z], [x + w * 0.9, yy, z + 0.12], [x + w * 0.2, yy - 0.06, z + 0.1], [x - w * 0.9, yy + 0.02, z + 0.12]], k % 2 ? Sl : Sl2, sh(Sl, -0.3)); }
      });
      mb.box(0, 2.35, 0.45, 0.02, 0.2, 0.35, '#5a2030');
      mb.box(-0.5, 0.75, -1.1, 0.1, 0.2, 0.1, '#e0a040');
    });
    attachH(m, 'body', mb => mb.sphere(-0.5, 0.75, -1.1, 0.07, 0.09, 0.07, '#ffb040', 5, 3), { unlit: true });
    attachH(m, 'head', mb => {
      tube(mb, [[0, 0, 0], [0, 0.35, 0]], 0.04, Bn, 4);
      for (let i = 0; i < 4; i++) mb.loft([{ y: 0.12 + i * 0.06, rx: 0.12 - i * 0.01, rz: 0.08 }, { y: 0.14 + i * 0.06, rx: 0.12 - i * 0.01, rz: 0.08 }], { sides: 8, color: Bn, capTop: false, capBottom: false });
      ell(mb, [0, 0.48, 0.02], [0.08, 0.1, 0.09], Bn); eyes(mb, 0.03, 0.49, 0.09, 0.018, '#101010');
      [1, -1].forEach(s => limb(mb, [[s * 0.05, 0, 0], [s * 0.08, -0.3, 0.05], [s * 0.07, -0.55, 0]], 0.02, 0.015, Bn, 4));
    });
    const arm = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.18, 0.02], [0, -0.32, 0.08]], 0.018, 0.015, Bn, 4); });
    m.attach('armL', arm); m.attach('armR', arm);
    attachH(m, 'armR', mb => tube(mb, [[0, -0.32, -0.5], [0, -0.32, 0.4]], 0.035, Wd2, 5));
    m.height = 3.3; m.lungeScale = 0.5; return m;
  });

  // Corvette: a floating sea serpent rearing in an arch, olive-yellow tail half running into a red-brown neck,
  // white spikes along both edges, a big dark red head with a curved yellow crest horn and lavender jaw plates
  reg('corvette', (a) => {
    const m = rig(a); m.floats = true; const Ol = '#a0a030', Ru = '#8a3020', Sp = '#e0e8f8', Hd = '#6a2a20', Lv = '#c0a0e0';
    m.bone('body', 'root', [0, 1.3, 0]);
    m.bone('head', 'body', [0.75, -0.1, 0.5], [0.15, 0, 0]);
    m.bone('jaw', 'head', [0, -0.1, 0.16], [0.25, 0, 0]);
    m.bone('tail', 'body', [-0.95, 0.25, -0.2]);
    attachH(m, 'body', mb => {
      const N = 18, pts = bez3([-0.95, 0.25, -0.2], [-1.05, 1.75, -0.1], [0.95, 1.85, 0.3], [0.75, -0.1, 0.5], N);
      tube(mb, pts, (t) => 0.22 + 0.1 * S(PI * t), (t, k, i) => { const c = t < 0.5 ? Ol : Ru; return i % 2 ? c : sh(c, -0.25); }, 8, { cap: false });
      pts.forEach((p, i) => { if (i === 0 || i === N) return; const d = V.norm(V.sub(pts[i + 1], pts[i - 1])); const up = V.norm(V.cross(d, [0, 0, 1])); const r = 0.22 + 0.1 * S(PI * i / N); mb.blade(V.add(p, V.scale(up, r * 0.8)), up, 0.34, 0.11, 0.04, Sp); mb.blade(V.add(p, V.scale(up, -r * 0.8)), V.scale(up, -1), 0.26, 0.1, 0.04, Sp); });
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.06, 0.1], [0.3, 0.27, 0.36], Hd, 8, 5);
      tube(mb, bez3([0, 0.2, 0.18], [0.04, 0.52, 0.3], [0.08, 0.56, 0.62], [0.1, 0.3, 0.74], 5), (t) => 0.12 * (1 - t) + 0.015, '#e0c020', 6);   // curved yellow crest horn hooking forward
      [1, -1].forEach(s => mb.blade([s * 0.24, -0.06, 0.18], [s * 0.35, -0.5, 1], 0.34, 0.22, 0.04, Lv, XY([s * 0.35, -0.5, 1])));   // lavender jaw plates
      teethRow(mb, [0.14, -0.1, 0.4], [-0.14, -0.1, 0.4], 5, [0, -1, 0.2], 0.08, '#ffffff');
    });
    attachH(m, 'head', mb => eyes(mb, 0.16, 0.12, 0.38, 0.04, '#ffe040'), { unlit: true });
    attachH(m, 'jaw', mb => { ell(mb, [0, -0.06, 0.14], [0.22, 0.08, 0.28], '#5a4a78', 7, 4); teethRow(mb, [0.13, 0, 0.3], [-0.13, 0, 0.3], 4, [0, 1, 0.2], 0.08, '#ffffff'); });
    attachH(m, 'tail', mb => { cone(mb, [0, 0, 0], [-0.08, -0.4, -0.05], 0.18, Ol, 6); for (let i = 0; i < 5; i++) mb.blade([0, -0.05, 0], [(i - 2) * 0.45, -1, -0.3], 0.36, 0.08, 0.03, Sp); });
    m.height = 3.1; m.lungeScale = 1.0; return m;
  });

  // Diver Nest: a gliding purple manta with a tan shark-like head and a trailing pink tail
  reg('diver_nest', (a) => {
    const m = rig(a); m.floats = true; const P = '#5a1a6a', P2 = '#3a0e48', Tn = '#c8a07a', Pk = '#e08a90';
    m.bone('body', 'root', [0, 1.7, 0]);
    m.bone('head', 'body', [0, 0, 0.55]);
    m.bone('wingL', 'body', [0.2, 0, 0.1]); m.bone('wingR', 'body', [-0.2, 0, 0.1]);
    m.bone('tail', 'body', [0, 0.05, -0.5]);
    attachH(m, 'body', mb => ell(mb, [0, 0, 0], [0.4, 0.14, 0.62], P, 8, 5, (i, j) => j > 2 ? P2 : P));
    attachH(m, 'head', mb => { ell(mb, [0, 0.02, 0.1], [0.26, 0.14, 0.26], Tn); teethRow(mb, [0.12, -0.05, 0.3], [-0.12, -0.05, 0.3], 6, [0, 1, 0.3], 0.04, '#ffffff'); mb.sphere(0, -0.05, 0.28, 0.14, 0.03, 0.04, '#6a1a20', 6, 3); });
    attachH(m, 'head', mb => eyes(mb, 0.14, 0.05, 0.28, 0.025, '#40ff60'), { unlit: true });
    const wing = (s) => mesh(mb => { sheet(mb, [[0, 0.02, 0.35], [s * 1.2, 0.2, -0.2], [s * 1.5, 0.1, -0.5], [s * 0.9, 0.0, -0.4], [0, 0, -0.4]], P, P2); sheet(mb, [[0, -0.02, 0.3], [0, -0.02, -0.35], [s * 0.9, -0.03, -0.38], [s * 1.4, 0.06, -0.48]], P2, P); });
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    attachH(m, 'tail', mb => { tube(mb, bez3([0, 0, 0], [0, 0.1, -0.5], [0.2, 0.5, -0.9], [0.1, 0.95, -1.2], 7), (t) => 0.08 * (1 - t) + 0.01, Pk, 5); sheet(mb, [[0, 0.02, -0.2], [0.25, 0.3, -0.8], [0.12, 0.8, -1.15], [0, 0.2, -0.6]], sh(Pk, -0.2)); });
    m.height = 2.0; m.lungeScale = 1.2; return m;
  });

  // ================================================================== Mideel / Gaea / Midgar raid field enemies
  // Rilfsak: a spindly plant — a fan of green fronds with an eye, a thin ribbed stalk and a red root bulb
  reg('rilfsak', (a) => {
    const m = rig(a); m.floats = true; const G = '#6aaa30', G2 = '#3a7a20', Br = '#8a3a20', R = '#d04a20';
    m.bone('body', 'root', [0, 0.6, 0]);
    m.bone('head', 'body', [0, 1.3, 0]);
    attachH(m, 'body', mb => {
      tube(mb, [[0, 0, 0], [0.02, 0.65, 0.02], [0, 1.3, 0]], [0.03, 0.025, 0.035], Br, 5);
      for (let i = 0; i < 7; i++) { const y = 0.25 + i * 0.13, L = 0.2 - Math.abs(i - 2) * 0.02; [1, -1].forEach(s => tube(mb, [[0, y, 0], [s * L, y - 0.03, 0.02]], 0.012, Br, 3)); }
      ell(mb, [0.03, -0.05, 0.02], [0.08, 0.1, 0.08], R); for (let i = 0; i < 3; i++) mb.blade([0.03, -0.1, 0.02], [(i - 1) * 0.5, -1, 0.3], 0.12, 0.05, 0.02, R);
    });
    attachH(m, 'head', mb => {
      for (let i = 0; i < 13; i++) { const an = -PI * 0.1 + (i / 12) * PI * 1.2; mb.blade([0, 0, 0], [C(an), S(an) * 0.9 + 0.1, 0.2 * S(i)], 0.5 + (i % 3) * 0.08, 0.14, 0.02, i % 2 ? G : G2, XY([C(an), S(an), 0])); }
      ell(mb, [0.05, 0.15, 0.06], [0.07, 0.07, 0.04], '#e8e0a0');
    });
    attachH(m, 'head', mb => mb.sphere(0.05, 0.15, 0.1, 0.035, 0.035, 0.02, '#c02020', 5, 3), { unlit: true });
    m.height = 2.3; m.lungeScale = 1.0; return m;
  });

  // Ochu-type plant (Ho-chu): squat plant-beast with a huge fanged maw, a ruff of petals, stubby legs, vine arms
  reg('ho_chu', (a) => {
    const m = rig(a); const G = '#5a9a30', G2 = '#3a6a1c', Pt = '#e0a0b8', Pt2 = '#c07890', Mw = '#6a0a1a';
    m.bone('body', 'root', [0, 0.7, 0]);
    m.bone('head', 'body', [0, 0.45, 0.1]);
    m.bone('jaw', 'head', [0, 0.0, 0.2]);
    m.bone('armL', 'body', [0.7, 0.5, 0], [0, 0, 1.0]); m.bone('armR', 'body', [-0.7, 0.5, 0], [0, 0, -1.0]);
    m.bone('legFL', 'body', [0.4, -0.3, 0.1]); m.bone('legFR', 'body', [-0.4, -0.3, 0.1]);
    attachH(m, 'body', mb => {
      ell(mb, [0, 0, 0], [0.75, 0.45, 0.6], G, 10, 6, (i, j) => j > 3 ? G2 : G);
      for (let r = 0; r < 2; r++) for (let i = 0; i < 14; i++) { const an = (i / 14) * PI * 2 + r * 0.22; mb.blade([C(an) * 0.6, 0.18 - r * 0.1, S(an) * 0.5], [C(an), -0.15 - r * 0.2, S(an)], 0.7 - r * 0.15, 0.4, 0.05, (i + r) % 2 ? Pt : Pt2, [0, 1, 0]); }
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.4, -0.05], [0.55, 0.5, 0.42], G, 10, 6);
      mb.sphere(0, 0.4, 0.28, 0.4, 0.34, 0.16, Mw, 8, 5);
      teethRow(mb, [0.36, 0.72, 0.36], [-0.36, 0.72, 0.36], 9, [0, -1, 0.15], 0.14, '#f0e8c8');
      [1, -1].forEach(s => { horn(mb, [s * 0.3, 0.75, 0.3], [s * 0.35, 0.5, 0.5], [s * 0.25, 0.35, 0.45], 0.06, '#f0e0c8', 4); mb.blade([s * 0.1, 0.85, 0], [s * 0.6, 1, -0.3], 0.4, 0.14, 0.04, '#d0b040'); });
      mb.blade([0, 0.2, 0.3], [0, 0.5, 1], 0.25, 0.12, 0.04, '#e02020');
    });
    attachH(m, 'jaw', mb => teethRow(mb, [0.3, 0.12, 0.2], [-0.3, 0.12, 0.2], 8, [0, 1, 0.1], 0.12, '#f0e8c8'));
    const arm = mesh(mb => { tube(mb, [[0, 0, 0], [0, -0.35, 0.1], [0, -0.7, 0.3]], [0.13, 0.1, 0.07], G, 6); claws(mb, [0, -0.72, 0.33], [0, -0.5, 1], 3, 0.2, 0.03, '#e0c040'); });
    m.attach('armL', arm); m.attach('armR', arm);
    const leg = mesh(mb => { ell(mb, [0, -0.2, 0.05], [0.22, 0.24, 0.26], G2); claws(mb, [0, -0.4, 0.25], [0, -0.3, 1], 3, 0.18, 0.04, '#e0c040'); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 2.1; m.lungeScale = 0.7; return m;
  });

  // ---- Poodler family (Poodler / Poodler Sample): a shaggy hooded cloak-cone leaning forward, its peak tipping
  // ahead, a spiky fringe round the hem and down the back, a small blue face peering out under the front lip of
  // the hood, two long purple arms reaching far ahead to the ground and pale blue claws under the hem
  function poodler(a, c) {
    const m = rig(a); const Sh = c.shell, Sh2 = sh(c.shell, -0.22), Sh3 = sh(c.shell, 0.12), Lg = c.leg, Hd = c.head, Ft = '#c0d0ff';
    m.bone('body', 'root', [0, 0.04, 0]);
    m.bone('head', 'body', [0, 0.48, 0.44]);
    m.bone('armL', 'body', [0.16, 0.42, 0.42]); m.bone('armR', 'body', [-0.16, 0.42, 0.42]);
    m.bone('legBL', 'body', [0.2, 0.18, 0.02]); m.bone('legBR', 'body', [-0.2, 0.18, 0.02]);
    attachH(m, 'body', mb => {
      mb.loft([{ y: 0.0, rx: 0.56, rz: 0.52, z: -0.08 }, { y: 0.25, rx: 0.5, rz: 0.47, z: -0.03 }, { y: 0.55, rx: 0.4, rz: 0.38, z: 0.05 }, { y: 0.85, rx: 0.27, rz: 0.26, z: 0.13 }, { y: 1.06, rx: 0.13, rz: 0.13, z: 0.2 }, { y: 1.2, rx: 0.02, rz: 0.02, z: 0.28 }],
        { sides: 8, color: Sh, smooth: false, colors: (i) => i % 3 === 0 ? Sh2 : (i % 3 === 1 ? Sh : Sh3) });   // hooded cloak-cone, peak tipping forward
      mb.sphere(0, 0.5, 0.36, 0.2, 0.2, 0.08, '#3a2a18', 6, 4);                                                  // shadowed hood opening
      sheet(mb, [[-0.26, 0.74, 0.3], [0.26, 0.74, 0.3], [0.2, 0.6, 0.56], [0, 0.56, 0.62], [-0.2, 0.6, 0.56]], Sh3, Sh2);   // hood lip over the face
      for (let i = 0; i < 12; i++) {                                                                               // spiky hem fringe
        const an = (i / 12) * PI * 2 + 0.13, p = [C(an) * 0.5, 0.18, S(an) * 0.47 - 0.05];
        mb.blade(p, [C(an), -0.55, S(an)], 0.34 + (i % 2) * 0.08, 0.2, 0.04, i % 2 ? Sh : Sh2, [-S(an), 0, C(an)]);
      }
      for (let i = 0; i < 8; i++) {                                                                                // shaggy strands down the back and sides
        const an = PI * (0.85 + (i % 4) * 0.28), y = i < 4 ? 0.5 : 0.8, r = i < 4 ? 0.4 : 0.27, zc = i < 4 ? 0.05 : 0.13;
        mb.blade([C(an) * r, y, S(an) * r + zc], [C(an), -0.8, S(an) - 0.2], 0.36, 0.18, 0.04, i % 2 ? Sh2 : Sh, [-S(an), 0, C(an)]);
      }
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0, 0.06], [0.18, 0.14, 0.18], Hd, 7, 5);
      [1, -1].forEach(s => mb.blade([s * 0.12, 0.06, 0.03], [s * 0.8, 0.5, 0.2], 0.16, 0.08, 0.03, sh(Hd, 0.2)));   // little ear spikes
      for (let i = -1; i <= 1; i++) mb.blade([i * 0.06, 0.1, 0.04], [i * 0.4, 1, -0.2], 0.14, 0.06, 0.03, '#8ab0ff');   // pale blue crest spikes
      mb.blade([0, -0.05, 0.2], [0, -0.3, 1], 0.12, 0.1, 0.03, '#e04020');
    });
    attachH(m, 'head', mb => eyes(mb, 0.075, 0.03, 0.2, 0.028, c.eye), { unlit: true });
    const arm = (s) => mesh(mb => {                                                                                // long reaching arm: elbow up and out, forearm down to the ground far ahead
      const el = [s * 0.34, 0.2, 0.36], hd = [s * 0.36, -0.34, 0.95];
      tube(mb, [[0, 0, 0], L3([0, 0, 0], el, 0.5), el], [0.075, 0.068, 0.06], Lg, 6, { cap: false });
      ell(mb, el, [0.068, 0.068, 0.068], sh(Lg, -0.15), 5, 3);
      tube(mb, [el, L3(el, hd, 0.5), hd], [0.06, 0.055, 0.045], Lg, 6, { cap: false });
      claws(mb, hd, [0, -0.4, 1], 3, 0.16, 0.022, sh(Lg, 0.3), 1.0);
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    const foot = mesh(mb => { tube(mb, [[0, 0, 0], [0, -0.1, 0.06]], [0.06, 0.05], Sh2, 5, { cap: false }); [-1, 1].forEach(q => cone(mb, [q * 0.035, -0.1, 0.06], [q * 0.06, -0.18, 0.2], 0.04, Ft, 4)); });
    m.attach('legBL', foot); m.attach('legBR', foot);
    m.onPose = (mm) => { const b = mm.bones.body; b.rot[0] = b.rest[0] + (b.rot[0] - b.rest[0]) * 0.3; };   // the cloak pivots at the hem: damp the stock body pitch so the hem stays out of the floor
    m.height = 1.25; m.lungeScale = 1.0; return m;
  }
  reg('poodler', (a) => poodler(a, { shell: '#b89a50', leg: '#7a40c0', head: '#3a5ad0', eye: '#ff9030' }));
  reg('poodler_sample', (a) => poodler(a, { shell: '#a88aa0', leg: '#6a3aa0', head: '#3a4ab0', eye: '#ff9030' }));   // the Hojo-fight Sample: same model, mauve recolour

  // Bad Rap: green squid — bulb head with red studs, gold eyes, long rainbow-graded tentacles
  function badRap(a, c) {
    const m = rig(a); m.floats = true; const G = c.body, G2 = sh(c.body, -0.3);
    m.bone('body', 'root', [0, 1.9, 0]);
    m.bone('head', 'body', [0, 0.3, 0]);
    attachH(m, 'head', mb => { mb.loft([{ y: -0.05, rx: 0.14, rz: 0.14 }, { y: 0.15, rx: 0.22, rz: 0.2 }, { y: 0.42, rx: 0.2, rz: 0.18 }, { y: 0.55, rx: 0.08, rz: 0.08 }], { sides: 8, color: G }); [0, 1, 2].forEach(i => mb.sphere(C(i * 2.1) * 0.19, 0.25, S(i * 2.1) * 0.17, 0.035, 0.035, 0.035, '#c02020', 5, 3)); });
    attachH(m, 'body', mb => { ell(mb, [0, 0.1, 0], [0.18, 0.18, 0.16], G2); });
    attachH(m, 'body', mb => eyes(mb, 0.07, 0.12, 0.14, 0.03, '#ffe040'), { unlit: true });
    const cols = c.tent;
    for (let i = 0; i < 6; i++) {
      const an = (i / 6) * PI * 2 + 0.26;
      m.bone('t' + i, 'body', [C(an) * 0.12, 0.0, S(an) * 0.12], [0.12 * S(an), 0, -0.12 * C(an)]);
      attachH(m, 't' + i, mb => tube(mb, bez3([0, 0, 0], [C(an) * 0.15, -0.5, S(an) * 0.15], [C(an) * 0.05, -1.1, S(an) * 0.05], [C(an) * 0.3, -1.75, S(an) * 0.3], 8), (t) => 0.05 * (1 - t) + 0.008, (t) => cols[Math.min(cols.length - 1, Math.floor(t * cols.length))], 5));
    }
    m.height = 2.5; m.lungeScale = 1.0; return m;
  }
  const RAIN = ['#40a060', '#8a40a0', '#c02080', '#2040c0', '#20a0e0', '#c020c0'];
  reg('bad_rap', (a) => badRap(a, { body: '#40b070', tent: RAIN }));
  reg('bad_rap_sample', (a) => badRap(a, { body: '#8a70c0', tent: ['#6a50a0', '#a040a0', '#c02080', '#2040c0', '#20a0e0', '#e0e040'] }));

  // Unknown: a hunched crimson flesh-mass on two stubby conical legs — a thick magenta jester's hood arching over
  // from its back and drooping down on its right, a big bone-yellow skull maw low at the front with yellow teeth,
  // two red diamond eyes beside it, and one forward arm with a big hand of fat rainbow nails in red rags
  reg('unknown', (a) => {
    const m = rig(a); const R = '#c02a50', R2 = '#8a1a38', R3 = '#d84a68', Pk = '#e8a0a0', Bn = '#e8dca0', Bn2 = '#b8a870', Tt = '#f0e060';
    m.bone('body', 'root', [0, 1.05, 0], [0.35, 0, 0]);
    m.bone('head', 'body', [0.2, 0.02, 0.58], [-0.3, 0, 0]);
    m.bone('jaw', 'head', [0, -0.12, 0.08]);
    m.bone('tail', 'body', [0.1, 0.45, -0.2]);
    m.bone('armR', 'body', [-0.5, 0.0, 0.3], [-0.95, 0, -0.15]);
    m.bone('legFL', 'root', [0.3, 0.75, -0.05]); m.bone('legFR', 'root', [-0.3, 0.75, -0.05]);
    attachH(m, 'body', mb => {
      ell(mb, [0, 0.15, 0.05], [0.62, 0.52, 0.62], R, 8, 6, (i, j) => j > 3 ? R2 : ((i + j) % 4 ? R : R3));
      ell(mb, [-0.3, 0.4, -0.15], [0.35, 0.3, 0.35], R3, 6, 4); ell(mb, [0.35, -0.2, 0.1], [0.3, 0.28, 0.3], R2, 6, 4);
      // two red diamond eyes rimmed white, beside the maw
      [[-0.36, 0.24, 0.6], [-0.1, 0.3, 0.66]].forEach(p => { disc(mb, p, 0.13, 0.17, '#f0f0f0', 4); disc(mb, V.add(p, [0, 0, 0.01]), 0.085, 0.12, '#e02020', 4); });
    });
    // the skull maw
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.08, 0.05], [0.3, 0.3, 0.3], Bn, 8, 6);
      [1, -1].forEach(s => mb.sphere(s * 0.12, 0.18, 0.3, 0.07, 0.08, 0.03, '#2a1a10', 5, 3));
      mb.sphere(0, -0.06, 0.26, 0.24, 0.14, 0.08, '#4a0a14', 7, 4);
      teethRow(mb, [0.2, 0.02, 0.3], [-0.2, 0.02, 0.3], 7, [0, -1, 0.05], 0.15, Tt);
    });
    attachH(m, 'jaw', mb => { ell(mb, [0, -0.1, 0.1], [0.26, 0.12, 0.24], Bn2, 7, 4); teethRow(mb, [0.18, -0.03, 0.28], [-0.18, -0.03, 0.28], 6, [0, 1, 0.05], 0.13, Tt); });
    // the jester's hood: arching over and drooping down the right side to a rounded tip
    attachH(m, 'tail', mb => {
      const pts = mb.curvePts([[0, 0, 0], [0.15, 0.75, -0.05], [-0.4, 1.15, 0.05], [-0.95, 0.75, 0.2], [-1.05, 0.2, 0.3]], 3);
      tube(mb, pts, (t) => 0.27 - 0.1 * t, (t) => mix('#c02a70', '#e05a90', t), 7);
      ell(mb, [-1.05, 0.14, 0.3], [0.19, 0.22, 0.19], '#e05a90', 6, 4);
    });
    // forward arm: pink forearm in red rags, big hand with fat rainbow nails
    attachH(m, 'armR', mb => {
      tube(mb, [[0, 0, 0], [0, -0.35, 0.12], [0, -0.68, 0.22]], [0.14, 0.12, 0.11], Pk, 6);
      for (let i = 0; i < 8; i++) { const an = (i / 8) * PI * 2; mb.blade([C(an) * 0.13, -0.55, 0.2 + S(an) * 0.13], [C(an) * 0.4, -1, S(an) * 0.4], 0.22, 0.1, 0.02, i % 2 ? '#c01818' : '#8a1010'); }
      ell(mb, [0, -0.8, 0.26], [0.2, 0.14, 0.2], Pk, 6, 4);
      ['#f0d020', '#40c040', '#3060e0', '#e02020', '#d8b890'].forEach((cc, i) => { const x = (i - 2) * 0.09; horn(mb, [x, -0.86, 0.3], [x * 1.3, -1.05, 0.42], [x * 1.4, -1.22, 0.38], 0.05, cc, 5, 3); });
    });
    // two stubby conical legs
    const leg = mesh(mb => { tube(mb, [[0, 0, 0], [0, -0.4, 0.06], [0, -0.74, 0.1]], [0.22, 0.18, 0.02], Pk, 7); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 2.8; m.lungeScale = 0.9; return m;
  });
  // Unknown 2: a ring of fleshy pink tubes tipped with long violet spikes around a small skull-headed serpent
  reg('unknown_2', (a) => {
    const m = rig(a); const Pk = '#e0a8a0', Pk2 = '#b87a78', Vi = '#9a3ac8', G = '#2a7a5a', Bn = '#d0c8e0';
    m.bone('body', 'root', [0, 1.4, 0]);
    m.bone('head', 'body', [0, 0.1, 0.25]);
    attachH(m, 'body', mb => {
      for (let i = 0; i < 12; i++) { const an = (i / 12) * PI * 2, d = [C(an), S(an), 0]; tube(mb, [V.scale(d, 0.15), V.scale(d, 0.55), V.add(V.scale(d, 0.85), [0, 0, 0.05])], [0.13, 0.14, 0.11], (t) => t > 0.8 ? '#f0c0b0' : (i % 2 ? Pk : Pk2), 6); cone(mb, V.add(V.scale(d, 0.9), [0, 0, 0.05]), V.add(V.scale(d, 1.7), [0, 0, 0.1]), 0.05, Vi, 4); }
      tube(mb, bez([0, -0.1, 0.1], [0, -0.7, 0.3], [0.1, -1.3, 0.2], 5), [0.12, 0.14, 0.16, 0.18, 0.2, 0.22], G, 7);
    });
    attachH(m, 'head', mb => { ell(mb, [0, 0.12, 0], [0.09, 0.12, 0.08], Bn); eyes(mb, 0.035, 0.14, 0.06, 0.02, '#101010'); cone(mb, [0, 0.22, -0.02], [0, 0.45, -0.05], 0.05, Bn, 4); tube(mb, [[0, 0.0, 0.03], [0, -0.35, 0.08]], 0.03, '#30a0a0', 5); });
    m.height = 3.0; m.lungeScale = 0.5; m.floats = true; return m;
  });
  // Unknown 3: a floating wide ribbed carapace — a central face with two yellow diamond eyes and two bat-like side
  // lobes each with a dark socket and an orange eye, tan rib ridges across the top, a spiky fringe below, bony
  // clawed arms spread to the sides, seven thick knuckled tentacles hanging down, and a long stalk dangling a
  // skull-like toothy head near the floor
  reg('unknown_3', (a) => {
    const m = rig(a); m.floats = true; const Mv = '#a07a8a', Mv2 = '#7a5068', Tn = '#c8a080', Tn2 = '#9a7858', Bn = '#e0d0d8';
    m.bone('body', 'root', [0, 2.45, 0]);
    m.bone('armL', 'body', [1.1, 0.05, -0.02]); m.bone('armR', 'body', [-1.1, 0.05, -0.02]);
    for (let i = 0; i < 7; i++) m.bone('t' + i, 'body', [(i - 3) * 0.3, -0.26 + Math.abs(i - 3) * 0.03, 0.02 + (i % 2) * 0.12]);
    m.bone('head', 'body', [0.12, -1.85, 0.42], [0.35, 0, 0]);
    m.bone('jaw', 'head', [0, -0.09, 0.09]);
    attachH(m, 'body', mb => {
      const fac = (i, j) => (i + j) % 3 ? Mv : Mv2;
      ell(mb, [0, 0, 0.02], [0.62, 0.4, 0.38], Mv, 8, 5, fac);
      [1, -1].forEach(s => {
        ell(mb, [s * 0.8, 0.06, -0.04], [0.5, 0.33, 0.32], Mv, 7, 4, fac);
        disc(mb, [s * 0.84, 0.06, 0.3], 0.14, 0.13, '#2a1a20', 6);                                          // dark socket
        for (let k = 0; k < 3; k++) tube(mb, [[s * 0.06, 0.34 - k * 0.06, 0.08 + k * 0.08], [s * 0.3, 0.3 - k * 0.07, 0.08 + k * 0.06], [s * 0.52, 0.2 - k * 0.07, 0.0 + k * 0.05]], 0.03, Tn, 4);   // rib ridges
      });
      tube(mb, [[0, 0.38, -0.05], [0, 0.3, 0.2], [0, 0.1, 0.36]], 0.045, Tn2, 4);                               // central spine
      // spiky fringe along the underside
      for (let i = 0; i < 10; i++) { const x = -1.1 + i * (2.2 / 9); mb.blade([x, -0.18, 0.1], [x * 0.3, -1, 0.2], 0.3 + (i % 2) * 0.12, 0.1, 0.04, i % 2 ? Tn : Mv2, [1, 0, 0]); }
      // mouth and the stalk down to the dangling head
      mb.sphere(0, -0.2, 0.3, 0.13, 0.09, 0.06, '#5a1a2a', 6, 3);
      tube(mb, bez3([0, -0.22, 0.3], [0.2, -0.8, 0.5], [-0.05, -1.4, 0.3], [0.12, -1.85, 0.42], 7), (t) => 0.09 - 0.03 * t, (t) => mix('#6a2a4a', '#8a3a5a', t), 5);
    });
    attachH(m, 'body', mb => { [1, -1].forEach(s => { disc(mb, [s * 0.15, -0.02, 0.38], 0.07, 0.09, '#f0d040', 4); mb.sphere(s * 0.84, 0.06, 0.32, 0.06, 0.06, 0.02, '#f0a020', 6, 3); }); }, { unlit: true });
    // bony arms spread to the sides with spikes and three clawed fingers
    const arm = (s) => mesh(mb => {
      tube(mb, [[0, 0, 0], [s * 0.45, 0.2, 0], [s * 0.9, 0.1, 0.05]], [0.1, 0.08, 0.06], Mv, 5);
      for (let i = 0; i < 3; i++) mb.blade([s * (0.2 + i * 0.25), 0.1, 0.02], [s * 0.3, -1, 0.1], 0.22, 0.07, 0.03, Tn);
      claws(mb, [s * 0.9, 0.1, 0.05], [s, -0.7, 0.1], 3, 0.36, 0.035, Tn, 1.0);
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    // seven knuckled tentacles with hooked tips
    for (let i = 0; i < 7; i++) attachH(m, 't' + i, mb => {
      const L = 1.0 + (3 - Math.abs(i - 3)) * 0.1, x = (i - 3) * 0.04;
      tube(mb, [[0, 0, 0], [x, -L * 0.33, 0.04], [x * 1.5, -L * 0.66, 0.0], [x * 2, -L, 0.05]], [0.09, 0.08, 0.065, 0.05], (t, k, j) => j % 2 ? Mv2 : Mv, 4);
      horn(mb, [x * 2, -L, 0.05], [x * 2, -L - 0.14, 0.1], [x * 2, -L - 0.1, 0.22], 0.045, Tn, 4, 3);
    });
    // the dangling skull head: pale snout, open red mouth, white fangs
    attachH(m, 'head', mb => {
      mb.scale(1.45);
      ell(mb, [0, 0.04, 0.02], [0.16, 0.14, 0.2], Bn, 7, 5);
      tube(mb, [[0, 0.02, 0.12], [0, 0.0, 0.34]], [0.11, 0.07], Bn, 5);
      mb.sphere(0, -0.04, 0.2, 0.1, 0.05, 0.12, '#a01828', 6, 3);
      teethRow(mb, [0.08, -0.02, 0.1], [0.05, -0.03, 0.32], 3, [0, -1, 0.1], 0.08, '#ffffff'); teethRow(mb, [-0.08, -0.02, 0.1], [-0.05, -0.03, 0.32], 3, [0, -1, 0.1], 0.08, '#ffffff');
    });
    attachH(m, 'jaw', mb => { mb.scale(1.45); tube(mb, [[0, -0.03, 0.02], [0, -0.06, 0.26]], [0.08, 0.05], Bn, 5); teethRow(mb, [0.07, -0.02, 0.08], [0.04, -0.03, 0.24], 3, [0, 1, 0.1], 0.07, '#ffffff'); teethRow(mb, [-0.07, -0.02, 0.08], [-0.04, -0.03, 0.24], 3, [0, 1, 0.1], 0.07, '#ffffff'); });
    m.height = 2.9; m.lungeScale = 0.6; return m;
  });

  // Serpent: a long pale-green sea dragon rearing toward the party — the tail lying along the floor behind, the
  // body arching up into a raised neck and a dragon head held high and facing forward; big translucent
  // periwinkle fin-wings spread to the sides of the body, large blue flippers low down, blue dorsal spines, an
  // orange-pink tail fin, yellow studs along the snout, long teal barbels and thin clawed forelimbs. Units x1.3.
  reg('serpent', (a) => {
    const m = rig(a); m.floats = true; const G = '#8ac070', G2 = '#5a9a6a', Bl = '#d0e0a0', Fn = '#7a90e8', Fn2 = '#8aa0f0', Y = '#e0c020', Tl = '#40b0a0';
    m.bone('body', 'root', [0, 0, 0]);
    const P = new MB().curvePts([[-0.45, 0.3, -2.1], [-0.1, 0.34, -1.25], [0.12, 0.85, -0.6], [0.05, 1.85, -0.3], [0, 2.55, 0.12], [0, 2.78, 0.62]], 3);
    const N = P.length - 1, at = (t) => P[Math.round(t * N)], rad = (t) => 0.08 + 0.2 * S(PI * Math.min(1, t * 0.95));
    const tanAt = (i) => V.norm(V.sub(P[Math.min(N, i + 1)], P[Math.max(0, i - 1)])), backAt = (i) => V.norm(V.cross(tanAt(i), [1, 0, 0]));
    m.bone('head', 'body', P[N], [0.12, 0, 0]);
    m.bone('jaw', 'head', [0, -0.07, 0.14]);
    m.bone('tail', 'body', P[0]);
    m.bone('armL', 'body', V.add(at(0.8), [0.16, -0.1, 0.12]), [-0.7, 0, 0.3]); m.bone('armR', 'body', V.add(at(0.8), [-0.16, -0.1, 0.12]), [-0.7, 0, -0.3]);
    m.bone('wingL', 'body', V.add(at(0.62), [0.14, 0, -0.05])); m.bone('wingR', 'body', V.add(at(0.62), [-0.14, 0, -0.05]));
    attachH(m, 'body', mb => {
      tube(mb, P, rad, (t, k) => (k === 1 || k === 2) ? Bl : k === 5 ? G2 : G, 8);
      for (let i = 1; i < N - 1; i++) { const b = backAt(i), t = i / N; mb.blade(V.add(P[i], V.scale(b, rad(t) * 0.85)), V.add(b, V.scale(tanAt(i), -0.4)), 0.14 + 0.12 * S(PI * t), 0.14, 0.03, Fn, [1, 0, 0]); }
    });
    // translucent fin-wings spread to the sides of the rising body, flippers low down near the floor
    const finWing = (s) => mesh(mb => {
      const tips = [[s * 0.5, 0.95, -0.35], [s * 1.25, 0.8, -0.55], [s * 1.75, 0.35, -0.5], [s * 1.95, -0.15, -0.3], [s * 1.5, -0.55, -0.15], [s * 0.7, -0.75, -0.1]];
      const edge = []; tips.forEach((tp, i) => { edge.push(tp); if (i < tips.length - 1) edge.push(V.scale(V.add(tp, tips[i + 1]), 0.36)); });   // jagged: notches between the spines
      sheet(mb, [[0, 0.45, -0.05]].concat(edge, [[0, -0.5, 0.0]]), Fn, sh(Fn, -0.15));
      tips.forEach(tp => tube(mb, [[0, 0, -0.02], tp], [0.025, 0.006], Fn2, 3));
    });
    [['wingL', 1], ['wingR', -1]].forEach(([b, s]) => m.attach(b, finWing(s), null, { blend: 'alpha', tint: [1, 1, 1, 0.8] }));
    const flipper = (s) => mesh(mb => {
      const b0 = V.add(at(0.3), [s * 0.2, 0, 0]), b1 = V.add(at(0.45), [s * 0.2, 0, 0]);
      sheet(mb, [b0, V.add(b0, [s * 0.95, -0.2, -0.45]), V.add(b0, [s * 1.2, -0.28, 0.1]), V.add(b1, [s * 0.75, -0.3, 0.35]), b1], Fn, sh(Fn, -0.15));
    });
    m.attach('body', flipper(1), null, { blend: 'alpha', tint: [1, 1, 1, 0.85] }); m.attach('body', flipper(-1), null, { blend: 'alpha', tint: [1, 1, 1, 0.85] });
    // orange-pink tail fin at the end of the tail lying behind
    attachH(m, 'tail', mb => { sheet(mb, [[0, 0, 0], [-0.25, 0.5, -0.45], [-0.2, 0.15, -0.95], [-0.1, -0.2, -0.8], [0, -0.1, -0.2]], '#f09060', '#e07070'); });
    // long dragon head facing forward: yellow snout studs, red mouth, teal barbels, crest fins
    attachH(m, 'head', mb => {
      mb.scale(1.2);
      ell(mb, [0, 0.03, 0.1], [0.15, 0.13, 0.3], G, 7, 5);
      tube(mb, [[0, 0.02, 0.25], [0, 0.0, 0.54]], [0.11, 0.065], G, 6);
      for (let i = 0; i < 5; i++) mb.box(0, 0.11 - i * 0.012, 0.08 + i * 0.09, 0.05, 0.035, 0.04, Y);
      [1, -1].forEach(s => { mb.blade([s * 0.1, 0.07, -0.02], [s, 0.5, -0.8], 0.4, 0.18, 0.02, Fn); tube(mb, bez3([s * 0.06, -0.01, 0.44], [s * 0.3, -0.1, 0.5], [s * 0.5, -0.35, 0.2], [s * 0.6, -0.6, -0.2], 5), 0.018, Tl, 4); });
    });
    attachH(m, 'head', mb => { mb.scale(1.2); eyes(mb, 0.1, 0.1, 0.23, 0.024, '#ff2020'); }, { unlit: true });
    attachH(m, 'jaw', mb => { mb.scale(1.2); tube(mb, [[0, -0.02, 0], [0, -0.05, 0.38]], [0.08, 0.04], '#b02030', 5); teethRow(mb, [0.06, 0, 0.08], [0.04, 0, 0.34], 4, [0, 1, 0], 0.035, '#ffffff'); teethRow(mb, [-0.06, 0, 0.08], [-0.04, 0, 0.34], 4, [0, 1, 0], 0.035, '#ffffff'); });
    // thin clawed forelimbs reaching forward from the chest
    const arm = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.35, 0.18], [0, -0.66, 0.26]], 0.05, 0.035, Tl, 5); claws(mb, [0, -0.68, 0.28], [0, -1, 0.3], 3, 0.12, 0.014, '#e0e0e0'); });
    m.attach('armL', arm); m.attach('armR', arm);
    // damped fin flap; the body pivots at the tail so keep its pitch small (the head stays high); the tail fin flicks up
    m.onPose = (mm) => { ['wingL', 'wingR'].forEach(n => { const w = mm.b(n); w.rot[2] *= 0.3; }); mm.b('body').rot[0] *= 0.2; const t = mm.b('tail'); t.rot[0] = Math.abs(t.rot[0]); };
    m.height = 3.15; m.scale = 1.3; m.lungeScale = 0.8; return m;
  });

  // ---- Behemoth family (Behemoth / King Behemoth): hunched heavy-shouldered quadruped. Massive raised
  // forequarters, low rump, big head carried low with a gaping red maw and long fangs, thick black horns
  // sweeping up and out, a tall spiky crest, thick clawed legs and an arched tail with bone-white spikes.
  function behemoth(a, c) {
    const m = rig(a);
    const P = c.body, P2 = sh(c.body, -0.3), Hn = c.horn, Sp = c.spine, Cl = '#f0e8c0', Bn = '#e8e0c8', Rd = '#b01828';
    m.bone('body', 'root', [0, 1.3, 0], [-0.08, 0, 0]);
    m.bone('head', 'body', [0, 0.02, 1.3], [0.18, 0, 0]);
    m.bone('jaw', 'head', [0, -0.16, 0.14], [0.6, 0, 0]);
    m.bone('tail', 'body', [0, 0.12, -1.05]);
    m.bone('legFL', 'body', [0.55, -0.35, 0.72]); m.bone('legFR', 'body', [-0.55, -0.35, 0.72]);
    m.bone('legBL', 'body', [0.45, -0.3, -0.75]); m.bone('legBR', 'body', [-0.45, -0.3, -0.75]);
    attachH(m, 'body', mb => {
      // one loft from rump to neck (loft y -> z; loft z -> -y): low rump, huge raised shoulder hump
      const R = [[-1.15, 0.05, 0.28, 0.28, 0.28], [-0.9, 0.02, 0.56, 0.56, 0.5], [-0.3, 0.0, 0.6, 0.64, 0.52], [0.3, 0.16, 0.84, 1.0, 0.64], [0.85, 0.1, 0.74, 0.82, 0.62], [1.2, 0.02, 0.44, 0.44, 0.42]];
      const n = 8, belly = (i) => S(PI / n + (i + 0.5) / n * PI * 2) > 0.55;
      mb.push(); mb.rotate(PI / 2, 0, 0);
      mb.loft(R.map(([z, cy, rx, top, bot]) => ({ y: z, z: -cy, rx, rz: top, rzb: top, rzf: bot, colors: (i) => belly(i) ? P2 : P })), { sides: n, color: P });
      mb.pop();
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.14, 0.0], [0.46, 0.38, 0.44], P, 8, 5);                                                    // cranium
      ell(mb, [0, 0.0, 0.36], [0.4, 0.2, 0.34], P, 7, 4);                                                      // broad muzzle
      mb.sphere(0, -0.15, 0.36, 0.34, 0.06, 0.3, Rd, 6, 3);                                                    // mouth roof
      teethRow(mb, [0.27, -0.14, 0.5], [-0.27, -0.14, 0.5], 6, [0, -1, 0.05], 0.08, Cl);
      [1, -1].forEach(s => {
        cone(mb, [s * 0.22, -0.1, 0.55], [s * 0.23, -0.46, 0.6], 0.055, Cl, 4);                              // upper fangs
        tube(mb, bez([s * 0.28, 0.3, -0.05], [s * 0.78, 0.72, -0.25], [s * 0.62, 1.12, 0.22], 5), (t) => 0.13 * (1 - t) + 0.01, Hn, 5);   // horns
      });
      for (let i = 0; i < 8; i++) mb.blade([(i % 2 ? 0.05 : -0.05), 0.4 - i * 0.02, 0.12 - i * 0.07], [(i - 3.5) * 0.22, 1, -0.35], 0.52 + (i % 3) * 0.1, 0.16, 0.05, i % 3 ? Sp : sh(Sp, -0.2));   // crest
    });
    attachH(m, 'head', mb => eyes(mb, 0.18, 0.13, 0.36, 0.045, c.eye, 0.03), { unlit: true });
    attachH(m, 'jaw', mb => {
      ell(mb, [0, -0.08, 0.24], [0.34, 0.11, 0.36], P2, 7, 4);
      mb.sphere(0, -0.01, 0.22, 0.26, 0.05, 0.28, Rd, 6, 3);                                                  // tongue / red maw
      [1, -1].forEach(s => cone(mb, [s * 0.21, -0.02, 0.5], [s * 0.2, 0.24, 0.54], 0.05, Cl, 4));            // lower fangs
      teethRow(mb, [0.22, -0.02, 0.48], [-0.22, -0.02, 0.48], 4, [0, 1, 0.05], 0.07, Cl);
    });
    const leg = (H, back) => mesh(mb => {
      const k = back ? -1 : 1;
      tube(mb, [[0, 0, 0], [0, -H * 0.42, 0.1 * k], [0, -H * 0.78, -0.08 * k], [0, -H + 0.08, 0.04]], [0.34, 0.27, 0.2, 0.19], P, 6);
      ell(mb, [0, -H * 0.12, -0.02], [0.4, H * 0.34, 0.44], P, 6, 4);                                        // shoulder / haunch muscle
      mb.frustum(0, -H, 0.1, 0.4, 0.52, 0.3, 0.38, 0.16, P2);                                                  // paw
      for (let i = -1; i <= 1; i++) mb.spike([i * 0.12, -H + 0.06, 0.34], [i * 0.25, -0.3, 1], 0.2, 0.045, 3, Cl);
    });
    const fl = leg(1.0, false), bl = leg(0.88, true);
    m.attach('legFL', fl); m.attach('legFR', fl); m.attach('legBL', bl); m.attach('legBR', bl);
    attachH(m, 'tail', mb => {
      const pts = bez3([0, 0, 0], [0, 0.35, -0.5], [0, 0.95, -0.8], [0, 1.25, -1.35], 6);
      tube(mb, pts, (t) => 0.22 * (1 - t) + 0.04, P, 6);
      pts.slice(1).forEach((p, i) => mb.blade(V.add(p, [0, 0.16 - i * 0.025, 0]), [0, 1, -0.7], 0.42 - i * 0.03, 0.14, 0.05, Bn));
      [-1, 0, 1].forEach(i => mb.blade(pts[6], [i * 0.5, 0.6, -1], 0.24, 0.08, 0.03, Bn));
    });
    // pounce-bite: forequarters rear up, front paws reach forward, the head dips and the maw snaps (the stock clip sank the front paws)
    m.clips = { beh_attack: { dur: 26, loop: false, fn(mm, p) {
      FF7.anims.e_idle.fn(mm, 0); const k = S(Math.min(1, p) * PI);
      mm.b('root').pos[2] += k * 0.4; mm.b('root').pos[1] += k * 0.12; mm.b('body').rot[0] -= k * 0.16; mm.b('head').rot[0] += k * 0.35; mm.b('jaw').rot[0] += k * 0.35;
      mm.b('legFL').rot[0] -= k * 0.6; mm.b('legFR').rot[0] -= k * 0.5; mm.b('legBL').rot[0] += k * 0.15; mm.b('legBR').rot[0] += k * 0.15; mm.b('tail').rot[0] += k * 0.3;
    } } };
    m.anims = Object.assign({}, m.anims, { attack: 'beh_attack' });
    m.height = 2.65; m.scale = 1.12; m.lungeScale = 0.9; return m;
  }
  reg('behemoth', (a) => behemoth(a, { body: '#4a1a9a', horn: '#2a1a3a', spine: '#c02030', eye: '#ffe020' }));

  reg('cromwell', (a) => tank(a, { turret: '#4a6a2a', track: '#c8a030', hull: '#3a4a2a', wheel: '#5a5a70' }));

  // Manhole: a red imp crouching in a manhole, holding the iron cover above its head
  reg('manhole', (a) => {
    const m = rig(a); const R = '#c82020', R2 = '#8a1010', Ir = '#5a5a62', Dk = '#202024';
    m.bone('body', 'root', [0, 0.35, 0]);
    m.bone('head', 'body', [0, 0.42, 0.06]);
    m.bone('armL', 'body', [0.25, 0.3, 0], [0, 0, 2.3]); m.bone('armR', 'body', [-0.25, 0.3, 0], [-0.5, 0, -0.4]);
    attachH(m, 'root', mb => { mb.prism(0, 0.0, 0, 0.6, 0.6, 0.06, 12, Ir); mb.prism(0, 0.061, 0, 0.45, 0.45, 0.001, 12, Dk); });
    attachH(m, 'body', mb => { mb.loft([{ y: -0.3, rx: 0.3, rz: 0.26 }, { y: 0.0, rx: 0.3, rz: 0.24 }, { y: 0.3, rx: 0.34, rz: 0.24 }, { y: 0.42, rx: 0.14, rz: 0.12 }], { sides: 8, color: R }); for (let i = 0; i < 3; i++) [1, -1].forEach(s => ell(mb, [s * 0.1, 0.18 - i * 0.12, 0.2], [0.09, 0.05, 0.05], R2)); });
    attachH(m, 'head', mb => { ell(mb, [0, 0.1, 0.02], [0.17, 0.16, 0.17], R); [1, -1].forEach(s => { horn(mb, [s * 0.12, 0.2, -0.02], [s * 0.2, 0.3, -0.05], [s * 0.18, 0.36, -0.15], 0.035, '#404068', 4); mb.blade([s * 0.14, 0.12, 0], [s, 0.3, -0.2], 0.12, 0.06, 0.02, R); }); });
    attachH(m, 'head', mb => eyes(mb, 0.07, 0.13, 0.15, 0.03, '#f0e020', 0.02), { unlit: true });
    const arm = (cover) => mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.2, 0.05], [0, -0.38, 0.08]], 0.06, 0.05, R, 6); claws(mb, [0, -0.4, 0.1], [0, -1, 0.2], 3, 0.08, 0.012, '#f0f0f0'); if (cover) { mb.push(); mb.translate(0.25, -0.45, 0.0); mb.rotate(0, 0, -2.2); mb.prism(0, 0, 0, 0.62, 0.62, 0.06, 14, '#707078'); mb.prism(0, 0.061, 0, 0.5, 0.5, 0.005, 14, '#8a8a92'); mb.pop(); } });
    m.attach('armL', arm(true)); m.attach('armR', arm(false));
    m.height = 1.5; m.lungeScale = 0.5; return m;
  });

  // Shadow Maker: a glowing lamp-core ringed by four yellow grille pads, mounted on a post over a teal base
  reg('shadow_maker', (a) => {
    const m = rig(a); m.floats = true; const Y = '#d8c860', Y2 = '#a09040', Br = '#6a4a30', Tl = '#2a8090';
    m.bone('body', 'root', [0, 0.1, 0]);
    m.bone('head', 'body', [0, 1.4, 0]);
    attachH(m, 'body', mb => { mb.box(0, 0.05, 0, 0.8, 0.1, 0.6, Tl); mb.box(0, 0.15, 0, 0.5, 0.1, 0.4, sh(Tl, -0.3)); mb.frustum(0, 0.2, 0, 0.26, 0.22, 0.18, 0.16, 0.7, Br); mb.prism(0, 0.9, 0, 0.12, 0.2, 0.25, 6, '#c03020'); });
    attachH(m, 'head', mb => {
      mb.prism(0, -0.02, 0, 0.3, 0.3, 0.14, 8, '#707078');
      for (let i = 0; i < 4; i++) { const an = (i / 4) * PI * 2; mb.push(); mb.translate(C(an) * 0.45, S(an) * 0.45, 0); mb.rotate(0, 0, an); mb.rbox(0, 0, 0, 0.22, 0.28, 0.16, Y, 0.2); for (let k = 0; k < 3; k++) mb.box(0.12, (k - 1) * 0.07, 0.0, 0.05, 0.03, 0.1, Y2); mb.pop(); }
    });
    attachH(m, 'head', mb => { mb.push(); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0.08, 0, 0.26, 0.26, 0.04, 8, '#fff8e8'); mb.pop(); }, { unlit: true });
    m.height = 2.0; m.lungeScale = 0.2; return m;
  });

  // ================================================================== Midgar raid

  // Grosspanzer: the street tank is four combatants assembled with CR.anchor — Mobile (the chassis: one huge
  // spiked roller across the front of a tread hull), Big (the lavender turret with its muzzle plate, ear horn
  // and red-tipped antenna, mounted on the hull) and two Smalls (ball-mounted side guns on the turret flanks);
  // every part x1.25, so the anchor offsets are in scaled metres
  const GP = { g: '#8a88b0', g2: '#6a6890', hull: '#5a5878', dk: '#2a2a34', roll: '#8a9a98', roll2: '#6a7a78', sp: '#b0a8e0' };
  const gpSteady = (m) => { m.onPose = (mm) => { mm.root.pos[2] *= 0.3; }; };   // the parts must not drift apart
  reg('grosspanzer_mobile', (a) => {
    const m = rig(a); m.bone('body', 'root', [0, 0, 0]);
    attachH(m, 'body', mb => {
      // tread hull behind the roller
      mb.rbox(0, 0.72, -0.5, 1.7, 0.62, 1.55, GP.hull, 0.2);
      mb.box(0, 1.08, -0.5, 1.3, 0.1, 1.2, GP.g2);
      [1, -1].forEach(s => {
        mb.rbox(s * 0.98, 0.38, -0.5, 0.32, 0.72, 1.75, GP.dk, 0.35);
        for (let i = 0; i < 4; i++) { mb.push(); mb.translate(s * 1.15, 0.36, -1.1 + i * 0.4); mb.rotate(0, 0, PI / 2); mb.prism(0, -0.03, 0, 0.17, 0.17, 0.06, 8, '#4a4858'); mb.pop(); }
        // roller arms
        mb.box(s * 0.95, 0.66, 0.15, 0.16, 0.18, 0.9, GP.hull);
      });
      // the spiked roller: one wide drum across the front
      mb.push(); mb.translate(-1.02, 0.6, 0.72); mb.rotate(0, 0, -PI / 2);
      mb.prism(0, 0, 0, 0.58, 0.58, 2.04, 12, GP.roll, false);
      mb.prism(0, -0.02, 0, 0.44, 0.44, 0.04, 12, GP.roll2); mb.prism(0, 2.02, 0, 0.44, 0.44, 0.04, 12, GP.roll2);
      mb.pop();
      for (let i = 0; i < 7; i++) for (let k = 0; k < 5; k++) {
        const an = (k / 5) * PI * 2 + i * 0.63, x = -0.86 + i * 0.29, d = [0, S(an), C(an)];
        mb.spike([x, 0.6 + S(an) * 0.56, 0.72 + C(an) * 0.56], d, 0.26, 0.08, 4, GP.sp);
      }
    });
    gpSteady(m);
    m.height = 1.2; m.scale = 1.25; m.lungeScale = 0.15; return m;
  });
  reg('grosspanzer_big', (a) => {
    const m = rig(a); m.bone('body', 'root', [0, 0, 0]); m.bone('head', 'body', [0, 0.1, 0]);
    attachH(m, 'body', mb => { mb.prism(0, 0, 0, 0.62, 0.66, 0.12, 10, GP.hull); });
    attachH(m, 'head', mb => {
      mb.rbox(0, 0.55, 0, 1.3, 1.0, 1.2, GP.g, 0.3);
      mb.rbox(0, 0.62, 0.62, 0.62, 0.52, 0.1, GP.g2, 0.2);                            // raised muzzle plate
      mb.push(); mb.translate(0, 0.62, 0.66); mb.rotate(PI / 2, 0, 0);
      mb.prism(0, 0, 0, 0.19, 0.19, 0.12, 8, '#1a1a22'); mb.prism(0, 0.1, 0, 0.1, 0.09, 0.28, 8, '#2a2a34'); mb.prism(0, 0.36, 0, 0.1, 0.1, 0.02, 8, '#101010');
      mb.pop();
      mb.blade([0.42, 1.0, -0.05], [0.4, 1, -0.15], 0.36, 0.26, 0.1, GP.g2);           // ear horn
      mb.prism(-0.38, 0.95, -0.22, 0.14, 0.14, 0.34, 8, GP.g2);                          // periscope turret
      tube(mb, [[-0.36, 1.28, -0.24], [-0.36, 1.62, -0.26]], 0.018, '#c8c8d0', 4); tube(mb, [[-0.36, 1.62, -0.26], [-0.36, 1.82, -0.27]], 0.015, '#d03020', 4);
    });
    gpSteady(m);
    m.height = 1.3; m.scale = 1.25; m.lungeScale = 0.1;
    return CR.anchor(m, 'grosspanzer_mobile', [0, 1.4, -0.62]);
  });
  reg('grosspanzer_small', (a) => {
    const m = rig(a); m.bone('body', 'root', [0, 0.2, 0]); m.bone('head', 'body', [0, 0, 0]);
    attachH(m, 'body', mb => { mb.prism(0, -0.2, -0.05, 0.16, 0.2, 0.08, 8, GP.hull); });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0, 0], [0.22, 0.22, 0.22], GP.g, 8, 6);
      mb.push(); mb.translate(0, 0, 0.1); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0, 0, 0.11, 0.1, 0.14, 8, GP.g2); mb.prism(0, 0.1, 0, 0.055, 0.05, 0.36, 6, '#303038'); mb.pop();
    });
    gpSteady(m);
    m.height = 0.45; m.scale = 1.25; m.lungeScale = 0.1;
    // the two Smalls take the turret's left / right flank (formation order)
    return CR.anchor(m, 'grosspanzer_mobile', [[1.08, 1.44, -0.4], [-1.08, 1.44, -0.4]]);
  });

  // X-Cannon: the Sister Ray gun emplacement — a massive barrel with an orange ring muzzle on a painted base
  reg('xcannon', (a) => {
    const m = rig(a); const Dk = '#28323c', Or = '#e08a20', G = '#3a6a2a', R = '#c02020', Tl = '#3a8aa0';
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('head', 'body', [0, 1.35, 0]);
    attachH(m, 'body', mb => {
      mb.box(0, 0.25, 0, 2.4, 0.5, 1.8, G); mb.box(0, 0.52, 0.3, 2.2, 0.06, 1.4, R); mb.box(0, 0.7, 0, 1.6, 0.35, 1.3, '#b8902a');
      mb.box(0, 0.7, 0.66, 0.5, 0.2, 0.04, '#e8e8e0');
      [1, -1].forEach(s => { mb.box(s * 1.25, 0.4, 0.2, 0.1, 0.8, 1.0, '#5a4a20'); });
      [0, 1, 2].forEach(i => { mb.box(0.3 + i * 0.28, 1.25, 0.72, 0.22, 0.7, 0.02, R); });
      tube(mb, [[-0.85, 0.9, 0.5], [-0.85, 1.7, 0.5]], 0.12, Tl, 6); mb.sphere(-0.85, 1.75, 0.5, 0.12, 0.12, 0.12, '#e0a020', 6, 4);
    });
    attachH(m, 'body', mb => { [[0.25, 0.4], [-0.25, 0.4], [0, 0.3]].forEach(([x, y]) => mb.sphere(x, y, 0.91, 0.07, 0.07, 0.03, '#ff2020', 5, 3)); }, { unlit: true });
    attachH(m, 'head', mb => {
      mb.push(); mb.rotate(-0.35, 0, 0);
      mb.push(); mb.rotate(PI / 2, 0, 0); mb.translate(0, -1.0, 0);
      mb.prism(0, 0, 0, 0.8, 0.9, 2.4, 12, Dk);
      mb.prism(0, 2.4, 0, 1.0, 1.0, 0.25, 14, Or); mb.prism(0, 2.65, 0, 0.7, 0.7, 0.01, 14, '#000000');
      mb.pop(); mb.pop();
    });
    m.height = 3.3; m.lungeScale = 0.1; return m;
  });

  // Maximum Kimaira: heavy chimera centaur. Thick-legged dark grey beast body with red clawed paws, a hulking
  // red demon torso and clawed arms, a big horned red-maned lion-demon head with an open fanged maw, a tan
  // dragon head on a thick neck at its left shoulder, and dark slate feathered wings
  reg('maximum_kimaira', (a) => {
    const Gy = '#5a6070', Gy2 = '#3a3e4a', Rd = '#c04a28', Rd2 = '#8a2a18', Hn = '#e8e0d0', Tn = '#b09060', Tn2 = '#8a6a40', Wg = '#3a3448';
    const m = rig(a);
    m.bone('body', 'root', [0, 1.15, 0]);
    m.bone('head', 'body', [0, 1.3, 0.5], [0.12, 0, 0]);
    m.bone('jaw', 'head', [0, -0.06, 0.12], [0.35, 0, 0]);
    m.bone('seg0', 'body', [0.36, 0.95, 0.4]);                                                                  // dragon neck (sways with the stock idle)
    m.bone('wingL', 'body', [0.3, 0.95, 0.1]); m.bone('wingR', 'body', [-0.3, 0.95, 0.1]);
    m.bone('armL', 'body', [0.46, 0.95, 0.46], [-0.55, 0, 0.25]); m.bone('armR', 'body', [-0.46, 0.95, 0.46], [-0.55, 0, -0.25]);
    m.bone('tail', 'body', [0, 0.1, -0.85]);
    m.bone('legFL', 'body', [0.3, -0.15, 0.5]); m.bone('legFR', 'body', [-0.3, -0.15, 0.5]); m.bone('legBL', 'body', [0.3, -0.1, -0.55]); m.bone('legBR', 'body', [-0.3, -0.1, -0.55]);
    attachH(m, 'body', mb => {
      ell(mb, [0, 0, -0.08], [0.5, 0.46, 0.88], Gy, 8, 5, (i, j) => j > 2 ? Gy2 : Gy);                          // beast barrel
      mb.loft([{ y: 0.15, rx: 0.36, rz: 0.3, z: 0.4 }, { y: 0.5, rx: 0.42, rz: 0.32, z: 0.42 }, { y: 0.85, rx: 0.58, rz: 0.36, z: 0.45, rzf: 0.42 }, { y: 1.08, rx: 0.56, rz: 0.34, z: 0.44 }, { y: 1.26, rx: 0.2, rz: 0.18, z: 0.46 }], { sides: 8, color: Rd, colors: (i, n) => (i === 1 || i === 2) ? sh(Rd, 0.12) : null });   // hulking demon torso
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.1, 0.04], [0.28, 0.27, 0.27], Rd, 8, 5);                                                   // lion-demon head
      ell(mb, [0, 0.02, 0.24], [0.17, 0.12, 0.14], Rd2, 6, 4);                                                 // muzzle
      for (let i = 0; i < 6; i++) { const an = -1.4 + i * 0.56; mb.blade([S(an) * 0.2, 0.2 + C(an) * 0.08, -0.08], [S(an), C(an) * 0.6, -0.8], 0.4, 0.2, 0.05, i % 2 ? Rd2 : '#6a1a10'); }   // mane
      [1, -1].forEach(s => horn(mb, [s * 0.16, 0.3, 0.0], [s * 0.42, 0.52, -0.06], [s * 0.3, 0.86, 0.12], 0.075, Hn, 5, 4));   // white horns
      teethRow(mb, [0.12, -0.06, 0.32], [-0.12, -0.06, 0.32], 4, [0, -1, 0.1], 0.08, '#ffffff');
    });
    attachH(m, 'head', mb => { disc(mb, [0.1, 0.14, 0.3], 0.045, 0.03, '#ffe040', 5); disc(mb, [-0.1, 0.14, 0.3], 0.045, 0.03, '#ffe040', 5); }, { unlit: true });
    attachH(m, 'jaw', mb => { ell(mb, [0, -0.05, 0.12], [0.14, 0.06, 0.16], Rd2, 6, 3); teethRow(mb, [0.1, -0.02, 0.24], [-0.1, -0.02, 0.24], 3, [0, 1, 0.1], 0.07, '#ffffff'); });
    attachH(m, 'seg0', mb => {                                                                                   // tan dragon head on a thick neck
      const nk = bez3([0, 0, 0], [0.35, 0.2, -0.05], [0.55, 0.6, 0.0], [0.6, 0.72, 0.2], 5);
      tube(mb, nk, (t) => 0.17 - 0.06 * t, Tn, 6, { cap: false });
      const h0 = nk[5];
      ell(mb, h0, [0.19, 0.18, 0.21], Tn, 6, 4);                                                               // skull
      tube(mb, [h0, V.add(h0, [0.02, -0.01, 0.26]), V.add(h0, [0.03, -0.05, 0.54])], [0.15, 0.11, 0.06], Tn, 6);  // snout
      tube(mb, [V.add(h0, [0, -0.1, 0.05]), V.add(h0, [0.02, -0.23, 0.28]), V.add(h0, [0.03, -0.28, 0.46])], [0.1, 0.07, 0.03], Tn2, 5);   // open lower jaw
      teethRow(mb, V.add(h0, [0.09, -0.1, 0.18]), V.add(h0, [0.06, -0.1, 0.5]), 3, [0, -1, 0], 0.08, '#ffffff');
      teethRow(mb, V.add(h0, [-0.05, -0.1, 0.18]), V.add(h0, [0.0, -0.1, 0.5]), 3, [0, -1, 0], 0.08, '#ffffff');
      [1, -1].forEach(q => cone(mb, V.add(h0, [q * 0.1, 0.1, -0.08]), V.add(h0, [q * 0.18, 0.26, -0.38]), 0.05, '#2a2a48', 4));   // swept horns
    });
    attachH(m, 'seg0', mb => { const h0 = [0.6, 0.72, 0.2]; disc(mb, V.add(h0, [0.11, 0.06, 0.17]), 0.035, 0.025, '#ff3020', 4); disc(mb, V.add(h0, [-0.09, 0.06, 0.17]), 0.035, 0.025, '#ff3020', 4); }, { unlit: true });
    const arm = (s) => mesh(mb => {
      const el = [s * 0.04, -0.4, 0.06], wr = [0, -0.72, 0.26];
      ell(mb, [s * 0.04, 0, 0], [0.19, 0.18, 0.19], Rd, 6, 4);                                                 // shoulder
      tube(mb, [[0, 0, 0], el, wr], [0.14, 0.12, 0.09], Rd, 6);
      mb.frustum(wr[0], wr[1] - 0.14, wr[2] + 0.02, 0.16, 0.12, 0.2, 0.16, 0.16, Rd2);                         // hand
      for (let i = -1; i <= 1; i++) mb.spike([i * 0.06, wr[1] - 0.12, wr[2] + 0.06], [i * 0.2, -1, 0.3], 0.14, 0.03, 3, Hn);
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    const w = (s) => mesh(mb => featherWing(mb, s, { span: 1.7, col: Wg, cols: [Wg, '#6a5a80', '#2a2438'], n: 8, lift: 0.3, a0: -0.7, a1: 1.7, len0: 0.5, len1: 0.35, w: 0.15 }));
    m.attach('wingL', w(1)); m.attach('wingR', w(-1));
    const leg = (H, back) => mesh(mb => {
      const k = back ? -1 : 1;
      tube(mb, [[0, 0, 0], [0, -H * 0.42, 0.08 * k], [0, -H * 0.8, -0.07 * k], [0, -H + 0.07, 0.03]], [0.22, 0.17, 0.13, 0.12], Gy, 6);
      if (back) ell(mb, [0, -H * 0.14, -0.04], [0.26, H * 0.3, 0.3], Gy, 6, 3);                                // haunch
      mb.frustum(0, -H, 0.08, 0.26, 0.34, 0.2, 0.24, 0.13, Rd);                                                // red paw
      for (let i = -1; i <= 1; i++) mb.spike([i * 0.08, -H + 0.04, 0.24], [i * 0.25, -0.3, 1], 0.14, 0.03, 3, Hn);
    });
    const fl = leg(1.0, false), bl = leg(1.05, true);
    m.attach('legFL', fl); m.attach('legFR', fl); m.attach('legBL', bl); m.attach('legBR', bl);
    attachH(m, 'tail', mb => tube(mb, bez([0, 0, 0], [0, -0.2, -0.5], [0.1, -0.6, -0.75], 4), (t) => 0.1 * (1 - t) + 0.015, Gy2, 5));
    // claw swipe + both heads snap (the stock clip pitched the whole beast body nose-down into the floor)
    m.clips = { mk_attack: { dur: 26, loop: false, fn(mm, p) {
      FF7.anims.e_idle.fn(mm, 0); const k = S(Math.min(1, p) * PI);
      mm.b('root').pos[2] += k * 0.35; mm.b('body').rot[0] += k * 0.06; mm.b('head').rot[0] += k * 0.2; mm.b('jaw').rot[0] += k * 0.4;
      mm.b('armL').rot[0] -= k * 1.3; mm.b('armR').rot[0] -= k * 1.0; mm.b('seg0').rot[0] += k * 0.35; mm.b('wingL').rot[2] += k * 0.6; mm.b('wingR').rot[2] -= k * 0.6;
      mm.b('legFL').rot[0] -= k * 0.3; mm.b('legFR').rot[0] -= k * 0.2;
    } } };
    m.anims = Object.assign({}, m.anims, { attack: 'mk_attack' });
    m.height = 3.6; m.lungeScale = 1.0; return m;
  });

  // Hojo (human form): white lab coat, slick black ponytail, glasses
  reg('hojo', (a) => { const m = human({ base: 'hojo', _id: 'd23_hojo', skin: '#d8d0a0' }, 1.75, false); return m; });

  // Helletic Hojo: a hunched lavender torso (pitched forward) rising on a thick trunk from a red fleshy mass,
  // broad shoulders ending in flesh stumps, an orange orb held by four bone claws on the belly, a ruff of long
  // bone blades round the neck, and a long neck that splits into a huge red fanged maw under the small grey
  // Hojo head with its black hair. The two arms are separate combatants mounted with CR.anchor
  // (right_arm_b: raised bone pincer, left_arm_b: heavy arm with a clawed fist on the floor).
  const HH = { pu: '#9a8ac8', pu2: '#6a5a9a', pu3: '#b0a0d8', fl: '#a02838', fl2: '#6a1a2a', rp: '#8a3a60', bn: '#e8d8c0', or: '#e06020', mw: '#a01020', fg: '#e0d060' };
  reg('helletic_hojo', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 1.1, 0], [0.4, 0, 0]);
    m.bone('head', 'body', [0, 1.42, 0.08], [-0.45, 0, 0]);
    m.bone('jaw', 'head', [0, 0.1, 0.12]);
    // red fleshy mass on the floor and the thick trunk rising out of it
    attachH(m, 'root', mb => {
      const lumpy = (i, j) => ((i * 3 + j) % 4 ? HH.fl : HH.fl2);
      ell(mb, [-0.2, 0.28, -0.1], [1.25, 0.4, 1.0], HH.fl, 9, 5, lumpy);
      ell(mb, [-0.75, 0.42, 0.3], [0.5, 0.36, 0.45], HH.fl2, 7, 4); ell(mb, [0.6, 0.35, -0.45], [0.45, 0.3, 0.4], HH.fl, 7, 4);
      for (let i = 0; i < 6; i++) { const an = (i / 6) * PI * 2 + 0.3; tube(mb, bez([C(an) * 0.9, 0.25, S(an) * 0.75], [C(an) * 1.5, 0.15, S(an) * 1.25], [C(an) * 1.85, 0.04, S(an) * 1.5], 3), (t) => 0.16 * (1 - t) + 0.02, HH.fl2, 5); }
      tube(mb, mb.curvePts([[-0.35, 0.3, -0.1], [-0.3, 0.75, 0.0], [0.05, 1.05, 0.0], [0, 1.25, 0.0]], 2), [0.5, 0.48, 0.44, 0.42, 0.42, 0.44, 0.45], HH.pu2, 8);
    });
    attachH(m, 'body', mb => {
      mb.loft([{ y: -0.1, rx: 0.45, rz: 0.4 }, { y: 0.3, rx: 0.44, rz: 0.36 }, { y: 0.75, rx: 0.66, rz: 0.42 }, { y: 1.15, rx: 1.0, rz: 0.46 }, { y: 1.36, rx: 0.62, rz: 0.36 }, { y: 1.5, rx: 0.24, rz: 0.22 }], { sides: 10, color: HH.pu });
      for (let i = 0; i < 4; i++) [1, -1].forEach(sg => tube(mb, [[sg * 0.08, 0.1 + i * 0.2, 0.38], [sg * 0.42, 0.14 + i * 0.22, 0.3], [sg * 0.6, 0.2 + i * 0.24, 0.0]], 0.035, HH.pu2, 4));
      [1, -1].forEach(sg => { ell(mb, [sg * 0.95, 1.18, 0.02], [0.34, 0.3, 0.34], HH.pu3, 7, 5); ell(mb, [sg * 1.16, 1.14, 0.02], [0.22, 0.26, 0.28], HH.rp, 6, 4); });   // shoulders + flesh stumps
      // the orange orb in four bone claws
      ell(mb, [0, 0.42, 0.48], [0.3, 0.3, 0.28], HH.or, 8, 6);
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => horn(mb, [sx * 0.34, 0.42 + sy * 0.22, 0.3], [sx * 0.46, 0.42 + sy * 0.34, 0.62], [sx * 0.12, 0.42 + sy * 0.2, 0.8], 0.06, HH.bn, 4, 4));
      // ruff of long bone blades round the neck
      for (let i = 0; i < 9; i++) { const an = PI * (0.05 + 0.9 * i / 8), d = [C(an), 0.1, S(an) * 0.6 - 0.2]; mb.blade([C(an) * 0.3, 1.38, S(an) * 0.2], d, 0.64 + (i % 2) * 0.12, 0.22, 0.07, HH.bn, [0, 1, 0]); }
      for (let i = 0; i < 4; i++) { const an = PI * (1.2 + 0.2 * i), d = [C(an), 0.2, S(an)]; mb.blade([C(an) * 0.25, 1.38, S(an) * 0.2], d, 0.55, 0.2, 0.07, HH.bn, [0, 1, 0]); }
      // a thin red tentacle hanging from the side
      tube(mb, bez3([0.5, 0.5, 0.2], [0.75, 0.0, 0.3], [0.6, -0.5, 0.35], [0.7, -0.75, 0.45], 5), (t) => 0.06 - 0.03 * t, HH.fl, 4);
    });
    // long neck split into a fanged maw; the small grey Hojo head with black hair on top
    attachH(m, 'head', mb => {
      tube(mb, [[0, 0, -0.06], [0, 0.55, -0.1], [0, 1.05, -0.04]], [0.24, 0.2, 0.16], HH.pu, 7);
      ell(mb, [0, 0.62, 0.08], [0.15, 0.42, 0.1], HH.mw, 6, 6);
      [1, -1].forEach(s => {
        tube(mb, [[s * 0.17, 0.3, 0.1], [s * 0.2, 0.65, 0.15], [s * 0.13, 1.0, 0.1]], 0.06, HH.pu3, 5);
        for (let i = 0; i < 5; i++) { const y = 0.42 + i * 0.13; mb.blade([s * 0.17, y, 0.15], [-s, -0.15, 0.25], 0.14, 0.05, 0.03, HH.fg, [0, 1, 0]); }
      });
      ell(mb, [0, 1.16, 0.02], [0.14, 0.17, 0.15], '#b8b0c0', 7, 5);
      mb.box(0, 1.18, 0.15, 0.2, 0.04, 0.03, '#303038');                              // glasses
      for (let i = 0; i < 7; i++) { const k = i - 3; mb.blade([k * 0.03, 1.28, -0.04], [k * 0.45, 0.8, -0.5], 0.36 - Math.abs(k) * 0.03, 0.05, 0.02, '#15151c'); }
    });
    attachH(m, 'jaw', mb => { for (let i = 0; i < 3; i++) mb.blade([(i - 1) * 0.09, 0.02, 0.12], [0, 1, 0.25], 0.16, 0.06, 0.03, HH.fg, [1, 0, 0]); ell(mb, [0, 0.02, 0.06], [0.16, 0.08, 0.08], HH.pu3, 6, 3); });
    attachH(m, 'head', mb => eyes(mb, 0.05, 1.19, 0.16, 0.014, '#ffffff'), { unlit: true });
    m.height = 3.8; m.lungeScale = 0.3; return m;
  });
  // Helletic Hojo's right arm (the model's right, -x): a massive raised arm, thick red-purple forearm and a big
  // bone pincer of two wide curved crab blades. Built around its own origin 1.3 m to Hojo's right; the shoulder
  // sits on Hojo's shoulder stump.
  reg('right_arm_b', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 0, 0]); m.bone('armR', 'body', [0.42, 2.16, 0.46]);
    attachH(m, 'armR', mb => {
      tube(mb, [[0.1, 0, 0], [-0.25, 0.1, 0.05], [-0.55, 0.32, 0.1]], [0.33, 0.3, 0.28], HH.rp, 7);
      tube(mb, [[-0.55, 0.32, 0.1], [-0.68, 0.85, 0.14], [-0.75, 1.32, 0.15]], [0.28, 0.32, 0.35], (t) => t > 0.5 ? '#8a3a50' : HH.rp, 7);
      ell(mb, [-0.75, 1.42, 0.15], [0.34, 0.26, 0.32], HH.fl, 7, 4);
      [[-0.95, 1.5], [-0.62, 1.55]].forEach(([x, y]) => mb.sphere(x, y, 0.42, 0.05, 0.05, 0.04, '#e03030', 5, 3));
      const claw = (pts, w) => mb.sweep(pts, pts.map((p, i) => [w * (1 - i / (pts.length - 1)) + 0.015, 0.07 * (1 - i / (pts.length - 1)) + 0.012]), { up: [0, 0, 1], sides: 6, color: '#e8d0b8' });
      claw(bez3([-0.9, 1.55, 0.12], [-1.3, 2.2, 0.08], [-1.15, 2.9, 0.0], [-0.72, 3.3, -0.05], 7), 0.22);    // big outer blade
      claw(bez3([-0.58, 1.6, 0.18], [-0.3, 2.0, 0.22], [-0.2, 2.45, 0.22], [-0.45, 2.75, 0.2], 6), 0.15);    // inner blade
      horn(mb, [-1.0, 1.4, 0.1], [-1.35, 1.25, 0.1], [-1.3, 0.9, 0.15], 0.07, '#e8d0b8', 4, 4);             // curled spur
    });
    m.height = 3.9; m.lungeScale = 0.25;
    return CR.anchor(m, 'helletic_hojo', [-1.3, 0, 0]);
  });
  // Helletic Hojo's left arm (+x): a heavy red-mauve arm reaching down to a big knuckled fist with four thick
  // bone claws planted on the floor
  reg('left_arm_b', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 0, 0]); m.bone('armL', 'body', [-0.42, 2.16, 0.46]);
    attachH(m, 'armL', mb => {
      tube(mb, [[-0.1, 0, 0], [0.25, -0.35, 0.08], [0.52, -0.82, 0.2]], [0.32, 0.3, 0.28], '#7a2a40', 7);
      tube(mb, [[0.52, -0.82, 0.2], [0.62, -1.3, 0.3], [0.68, -1.72, 0.38]], [0.28, 0.3, 0.3], (t) => t > 0.4 ? '#6a5a9a' : '#7a2a40', 7);
      ell(mb, [0.7, -1.92, 0.46], [0.42, 0.32, 0.42], '#8a2a3a', 7, 5);
      for (let i = 0; i < 4; i++) { const x = 0.7 + (i - 1.5) * 0.2; horn(mb, [x, -1.95, 0.72], [x + (i - 1.5) * 0.06, -2.05, 1.0], [x + (i - 1.5) * 0.1, -2.26, 1.05], 0.1, HH.bn, 5, 4); }
    });
    m.height = 2.6; m.lungeScale = 0.25;
    return CR.anchor(m, 'helletic_hojo', [1.3, 0, 0]);
  });
  // Lifeform-Hojo N: a muscular pale-grey humanoid torso with a khaki-gold chest plate and yoke, black-and-gold
  // waist bands and a small orange head with a gold crest; below the waist a navy body wrapped in white bands
  // that narrows quickly into a long whip tail ending in gold. Arms hang close to the body, navy-banded.
  reg('lifeform_hojo_n', (a) => {
    const m = rig(a); m.floats = true; const Pl = '#c8ccd0', Pl2 = '#9a9eaa', Y = '#e0b820', Kh = '#b0a060', Bk = '#1a1a28', Or = '#e08020', Nv = '#1a2050', Wb = '#d0d4d8';
    m.bone('body', 'root', [0, 2.2, 0]);
    m.bone('head', 'body', [0, 0.74, 0.03]);
    m.bone('armL', 'body', [0.36, 0.6, 0], [0.05, 0, 0.12]); m.bone('armR', 'body', [-0.36, 0.6, 0], [0.05, 0, -0.12]);
    m.bone('tail', 'body', [0, -0.5, 0]);
    attachH(m, 'body', mb => {
      // muscular pale torso over a navy, white-banded lower body
      mb.loft([{ y: -0.52, rx: 0.2, rz: 0.17, color: Nv }, { y: -0.36, rx: 0.25, rz: 0.2, color: Wb }, { y: -0.26, rx: 0.26, rz: 0.2, color: Nv }, { y: -0.1, rx: 0.25, rz: 0.19, color: Bk }, { y: 0.0, rx: 0.25, rz: 0.19, color: Y },
        { y: 0.08, rx: 0.26, rz: 0.19, color: Bk }, { y: 0.16, rx: 0.27, rz: 0.19, color: Pl }, { y: 0.4, rx: 0.33, rz: 0.21 }, { y: 0.6, rx: 0.4, rz: 0.22 }, { y: 0.72, rx: 0.13, rz: 0.12 }], { sides: 10, color: Pl });
      [1, -1].forEach(s => { ell(mb, [s * 0.14, 0.24, 0.15], [0.1, 0.07, 0.06], Pl2, 6, 4); ell(mb, [s * 0.33, 0.6, 0], [0.13, 0.12, 0.13], Pl, 6, 4); });
      // khaki-gold chest plate and yoke
      ell(mb, [0, 0.45, 0.1], [0.3, 0.16, 0.16], Kh, 8, 4);
      mb.loft([{ y: 0.56, rx: 0.42, rz: 0.24 }, { y: 0.66, rx: 0.36, rz: 0.22 }, { y: 0.74, rx: 0.16, rz: 0.14 }], { sides: 10, color: Kh, capBottom: false });
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.1, 0.0], [0.11, 0.14, 0.12], Or, 7, 5); mb.box(0, 0.09, 0.11, 0.13, 0.03, 0.02, Bk);
      mb.blade([0, 0.2, -0.02], [0, 0.6, -1], 0.26, 0.12, 0.04, Y);
    });
    const arm = mesh(mb => {
      limb(mb, [[0, 0, 0], [0, -0.32, 0.03], [0, -0.62, 0.1]], 0.075, 0.055, Pl, 6);
      [-0.38, -0.48].forEach(y => tube(mb, [[0, y, 0.05], [0, y - 0.05, 0.06]], 0.066, Nv, 6, { cap: false }));
      claws(mb, [0, -0.64, 0.12], [0, -1, 0.2], 3, 0.1, 0.012, Pl2);
    });
    m.attach('armL', arm); m.attach('armR', arm);
    attachH(m, 'tail', mb => tube(mb, bez3([0, 0, 0], [0, -0.7, 0.12], [0.22, -1.35, -0.08], [0.06, -1.9, 0.14], 10), (t) => 0.2 * (1 - t) + 0.012, (t) => t > 0.7 ? Y : (Math.floor(t * 10) % 3 === 1 ? Wb : Nv), 6));
    m.height = 3.2; m.lungeScale = 0.9; return m;
  });

  // Proud Clod: Scarlet's giant red mech as a hunched gorilla — huge rounded red pauldrons trimmed in gold over a
  // gunmetal torso pitched forward, a red dome head with a multicolour visor above a purple-lit cockpit band,
  // long arms with gold-ribbed forearm guards ending in steel claws with gold talons, short bent legs on big
  // gold-capped boots, and a blue-and-gold chainsaw sword across its back. Built in units x1.5 (~7.8 m with the sword).
  reg('proud_clod', (a) => {
    const m = rig(a);
    const R = '#a81c24', R2 = '#6a1018', Au = '#d0a030', Au2 = '#8a6a20', St = '#b8c0d8', Gm = '#44465a', Gm2 = '#2a2a36', Gg = '#5a6858', Bl = '#6080c0';
    m.bone('body', 'root', [0, 1.55, 0], [0.35, 0, 0]);
    m.bone('head', 'body', [0, 2.02, 0.5], [-0.25, 0, 0]);
    m.bone('armL', 'body', [1.3, 1.74, 0.04], [-0.3, 0, 0.2]); m.bone('armR', 'body', [-1.3, 1.74, 0.04], [-0.3, 0, -0.2]);
    m.bone('legFL', 'root', [0.7, 1.45, -0.05], [0, 0, 0.06]); m.bone('legFR', 'root', [-0.7, 1.45, -0.05], [0, 0, -0.06]);
    attachH(m, 'body', mb => {
      // pelvis, waist and a barrel torso of gunmetal plating
      mb.rbox(0, 0.02, -0.02, 1.4, 0.5, 0.95, Gm2, 0.3);
      [1, -1].forEach(s => mb.panel([[s * 0.1, 0.18], [s * 0.62, 0.14], [s * 0.56, -0.34], [s * 0.14, -0.3]], 0.5, 0.08, R, R2));
      mb.loft([{ y: 0.2, rx: 0.5, rz: 0.42 }, { y: 0.6, rx: 0.62, rz: 0.5 }, { y: 1.2, rx: 0.86, rz: 0.6 }, { y: 1.75, rx: 0.96, rz: 0.62 }, { y: 2.05, rx: 0.74, rz: 0.5 }, { y: 2.22, rx: 0.38, rz: 0.34 }], { sides: 10, color: Gm });
      ell(mb, [0, 1.18, 0.34], [0.6, 0.5, 0.34], Gg, 8, 5);                  // grey-green chest plate
      mb.box(0, 1.62, 0.52, 1.0, 0.3, 0.2, R2);                               // cockpit band frame
      // shoulder yoke, pauldrons with a gold rim and stacked lames, dark spikes behind
      [1, -1].forEach(s => {
        ell(mb, [s * 1.12, 2.02, -0.02], [0.78, 0.66, 0.76], R, 8, 5);
        ell(mb, [s * 1.2, 1.52, 0.02], [0.66, 0.3, 0.66], sh(R, -0.12), 7, 3);
        tube(mb, Array.from({ length: 9 }, (_, i) => { const t = (i / 8) * PI * 2; return [s * 1.14 + C(t) * 0.74, 1.6 + S(t * 2) * 0.03, -0.02 + S(t) * 0.72]; }), 0.06, Au, 4, { cap: false });
        mb.blade([s * 0.9, 2.3, -0.5], [s * 0.35, 1, -0.6], 0.7, 0.34, 0.1, Gm2);
        mb.blade([s * 1.5, 2.1, -0.45], [s * 0.8, 0.6, -0.6], 0.55, 0.3, 0.1, Gm2);
      });
      // chainsaw sword across the back: blue blade with gold teeth, grey hilt and pommel on top
      const d = V.norm([0.18, 0.94, -0.34]), b0 = [0.2, 1.5, -0.72], b1 = V.add(b0, V.scale(d, 1.45)), h1 = V.add(b1, V.scale(d, 0.45));
      mb.sweep([b0, b1], [[0.2, 0.07], [0.17, 0.06]], { up: [0, 0, 1], sides: 4, color: Bl });
      for (let i = 0; i < 7; i++) { const p = L3(b0, b1, 0.12 + i * 0.13); [1, -1].forEach(s => mb.blade(V.add(p, [s * 0.18, 0, 0]), [s, 0.35, 0], 0.22, 0.12, 0.05, Au, [0, 0, 1])); }
      tube(mb, [b1, h1], 0.06, '#8a90a0', 5); ell(mb, h1, [0.12, 0.12, 0.12], '#8a90a0', 6, 4);
      mb.box(b1[0], b1[1], b1[2], 0.5, 0.1, 0.14, Au2);
    });
    // cockpit lights: purple band with white teeth, the pilot's glow
    attachH(m, 'body', mb => {
      mb.box(0, 1.62, 0.63, 0.8, 0.18, 0.02, '#7050d0');
      for (let i = 0; i < 5; i++) mb.blade([(i - 2) * 0.16, 1.7, 0.64], [0, -1, 0.1], 0.14, 0.1, 0.02, i % 2 ? '#ff4040' : '#f0f0f0', [1, 0, 0]);
    }, { unlit: true });
    // head: red dome with a multicolour visor
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.12, 0.05], [0.36, 0.34, 0.34], R, 8, 6);
      mb.rbox(0, -0.1, 0.05, 0.62, 0.2, 0.58, Gm2, 0.3);
    });
    attachH(m, 'head', mb => {
      [['#40c0e0', -0.22], ['#f0d040', -0.11], ['#e04040', 0], ['#40d060', 0.11], ['#c060e0', 0.22]].forEach(([cc, x]) => mb.box(x, 0.1, 0.36, 0.1, 0.11, 0.06, cc));
    }, { unlit: true });
    // arms: red upper arm with a gold outer panel, dark elbow, flared gold-ribbed forearm guard with a red cuff,
    // dark palm and four long steel fingers ending in gold talons
    const arm = (s) => mesh(mb => {
      tube(mb, [[0, 0.1, 0], [0, -0.5, 0.08], [0, -1.02, 0.2]], [0.34, 0.31, 0.27], R, 8);
      mb.push(); mb.translate(s * 0.3, 0, 0); mb.rotate(0, s * PI / 2, 0);
      mb.panel([[-0.22, -0.02], [0.22, -0.02], [0.18, -0.66], [-0.18, -0.66]], 0, 0.08, Au, Au2);
      mb.pop();
      ell(mb, [0, -1.05, 0.2], [0.27, 0.27, 0.27], Gm2, 7, 5);
      mb.push(); mb.translate(0, -1.05, 0.2); mb.rotate(-0.27, 0, 0);
      const rib = (i) => i % 2 ? Au : Au2;
      mb.loft([{ y: 0, rx: 0.3, rz: 0.3, colors: rib }, { y: -0.2, rx: 0.36, rz: 0.36, colors: rib }, { y: -0.95, rx: 0.52, rz: 0.5, color: R }, { y: -1.2, rx: 0.48, rz: 0.46, color: R2 }, { y: -1.24, rx: 0.3, rz: 0.3 }], { sides: 10, color: Au });
      mb.rbox(0, -1.38, 0.04, 0.52, 0.3, 0.46, Gm2, 0.3);
      for (let i = 0; i < 4; i++) {
        const x = (i - 1.5) * 0.14, q = [x, -1.45, 0.16], tip = [x * 1.6, -2.02, 0.66];
        tube(mb, bez(q, [x * 1.2, -1.7, 0.5], tip, 3), (t) => 0.075 - 0.02 * t, St, 5);
        cone(mb, tip, V.add(tip, [x * 0.3, -0.3, 0.14]), 0.075, Au, 4);
      }
      tube(mb, bez([-s * 0.26, -1.36, 0.1], [-s * 0.38, -1.6, 0.4], [-s * 0.3, -1.85, 0.6], 3), 0.06, St, 5); cone(mb, [-s * 0.3, -1.85, 0.6], [-s * 0.3, -2.1, 0.7], 0.06, Au, 5);
      mb.pop();
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    // legs: dark hip ball, red thigh, big red knee guard, red shin with a steel band, gold-capped boot with toe spikes
    const leg = mesh(mb => {
      ell(mb, [0, 0, 0], [0.3, 0.3, 0.3], Gm2, 6, 4);
      tube(mb, [[0, 0, 0], [0, -0.62, 0.3]], [0.34, 0.32], R, 7);
      ell(mb, [0, -0.64, 0.46], [0.38, 0.36, 0.3], R, 7, 5);
      mb.box(0, -0.62, 0.62, 0.34, 0.12, 0.1, St);
      tube(mb, [[0, -0.64, 0.3], [0, -1.12, 0.12]], [0.32, 0.38], R, 7);
      tube(mb, [[0, -0.95, 0.19], [0, -1.02, 0.17]], [0.37, 0.37], St, 7, { cap: false });
      mb.rbox(0, -1.28, 0.26, 0.74, 0.36, 1.08, R, 0.3);
      mb.rbox(0, -1.34, 0.72, 0.7, 0.24, 0.28, Au, 0.3);
      for (let i = 0; i < 3; i++) cone(mb, [(i - 1) * 0.22, -1.36, 0.84], [(i - 1) * 0.3, -1.4, 1.2], 0.08, St, 4);
    });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 5.2; m.scale = 1.5; m.lungeScale = 0.4; return m;
  });
  // Jamar Armor: in FF7 it is Proud Clod's own armour plating (the part that enables Materia-jammer), never a
  // second figure — an invisible target mounted on Proud Clod, its cursor and damage numbers on the hip armour
  reg('jamar_armor', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 1.2, 0]);
    m.visible = false; m.height = 2.4; m.lungeScale = 0;
    return CR.anchor(m, 'proud_clod', [0.7, 0.4, 1.0]);
  });

  // ================================================================== the WEAPONs (x Weapons of War.png)
  // Ultimate Weapon: bulky crouching dark slate armoured dragon. Huge rounded shoulder armour, a lavender face mask
  // under a crown of dark spikes, a red core in a pale ring on the chest, a skirt of mauve belly plates, bent clawed
  // arms and crouched clawed legs with mauve plates, a spiked tail and small mauve bat wings
  function ultimate(a, flying) {
    const m = rig(a); m.floats = flying;
    const Sl = '#3c3a48', Sl2 = '#26242e', Mv = '#8a5a70', Mv2 = '#6a3a50', Lv = '#b0a8c0', Cl = '#e8e4ec';
    m.bone('body', 'root', [0, flying ? 3.3 : 2.7, 0], [0.25, 0, 0]);
    m.bone('head', 'body', [0, 1.72, 0.62], [-0.3, 0, 0]);
    m.bone('jaw', 'head', [0, -0.2, 0.35], [0.2, 0, 0]);
    m.bone('armL', 'body', [1.5, 1.25, 0.35], [-0.55, 0, 0.3]); m.bone('armR', 'body', [-1.5, 1.25, 0.35], [-0.55, 0, -0.3]);
    m.bone('wingL', 'body', [0.7, 1.7, -0.7]); m.bone('wingR', 'body', [-0.7, 1.7, -0.7]);
    m.bone('legFL', 'body', [0.8, -0.3, -0.05], [-0.25, 0, 0]); m.bone('legFR', 'body', [-0.8, -0.3, -0.05], [-0.25, 0, 0]);
    m.bone('tail', 'body', [0, -0.3, -0.8]);
    attachH(m, 'body', mb => {
      mb.loft([{ y: -0.6, rx: 0.85, rz: 0.72 }, { y: 0.2, rx: 1.0, rz: 0.82 }, { y: 1.05, rx: 1.35, rz: 0.95 }, { y: 1.65, rx: 1.2, rz: 0.82 }, { y: 1.95, rx: 0.5, rz: 0.45 }], { sides: 10, sq: 2.6, color: Sl });
      for (let i = 0; i < 5; i++) {                                                                        // mauve belly-plate skirt
        const x = (i - 2) * 0.34, z = 0.86 - Math.abs(i - 2) * 0.1;
        sheet(mb, [[x - 0.17, 0.62, z], [x + 0.17, 0.62, z], [x * 1.2 + 0.14, -0.85, z + 0.12], [x * 1.2, -1.02, z + 0.14], [x * 1.2 - 0.14, -0.85, z + 0.12]], i % 2 ? Mv : Mv2, Mv2);
      }
      mb.sphere(0, 1.2, 0.88, 0.46, 0.46, 0.16, Lv, 10, 4);                                               // pale ring around the core
      mb.sphere(0, 1.2, 0.96, 0.3, 0.3, 0.1, '#1a0a10', 8, 4);
      [1, -1].forEach(s => {
        ell(mb, [s * 1.35, 1.5, 0.05], [0.85, 0.78, 0.9], Sl, 8, 5, (i, j) => j > 3 ? Sl2 : Sl);         // huge rounded shoulder armour
        sheet(mb, [[s * 0.75, 1.1, 0.8], [s * 1.9, 1.1, 0.55], [s * 1.75, 0.6, 0.5], [s * 0.9, 0.55, 0.78]], Mv, Mv2);   // mauve plate under the pauldron
        mb.blade([s * 1.35, 2.2, -0.1], [s * 0.35, 1, -0.4], 0.8, 0.45, 0.12, Sl2);                      // pauldron spike
      });
      for (let i = 0; i < 5; i++) mb.blade([0, 1.8 - i * 0.45, -0.75], [0, 0.6, -1], 0.7, 0.35, 0.08, Sl2, [1, 0, 0]);
    });
    attachH(m, 'body', mb => mb.sphere(0, 1.2, 1.02, 0.2, 0.2, 0.08, '#ff2030', 8, 4), { unlit: true });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.12, 0.05], [0.52, 0.46, 0.52], Sl, 8, 5);
      ell(mb, [0, -0.02, 0.4], [0.4, 0.32, 0.26], Lv, 8, 5);                                               // lavender face mask
      for (let i = 0; i < 9; i++) { const an = -1.25 + i * 0.31; mb.blade([S(an) * 0.34, 0.42, -0.02], [S(an) * 1.1, 1, -0.35], 0.85 + (i % 2) * 0.35, 0.18, 0.07, i % 2 ? Sl2 : '#5a5868'); }   // crown
    });
    attachH(m, 'head', mb => eyes(mb, 0.2, 0.12, 0.6, 0.055, '#ff3040'), { unlit: true });
    attachH(m, 'jaw', mb => { ell(mb, [0, -0.08, 0.15], [0.3, 0.12, 0.32], Mv2, 7, 4); mb.sphere(0, 0.0, 0.2, 0.22, 0.05, 0.24, '#c02030', 6, 3); teethRow(mb, [0.18, 0, 0.4], [-0.18, 0, 0.4], 5, [0, 1, 0.1], 0.13, Cl); });
    const arm = (s) => mesh(mb => {
      const el = [s * 0.12, -1.0, -0.2], wr = [s * 0.05, -1.85, 0.62];
      tube(mb, [[0, 0, 0], el, wr], [0.52, 0.44, 0.36], Sl, 8);
      ell(mb, el, [0.46, 0.44, 0.46], Sl2, 6, 4);                                                           // elbow
      sheet(mb, [V.add(L3(el, wr, 0.2), [s * 0.36, 0.1, 0.05]), V.add(L3(el, wr, 0.85), [s * 0.34, 0, 0.1]), V.add(L3(el, wr, 0.85), [s * 0.3, -0.1, 0.35]), V.add(L3(el, wr, 0.2), [s * 0.32, -0.1, 0.35])], Mv, Mv2);   // forearm plate
      ell(mb, V.add(wr, [0, -0.12, 0.12]), [0.4, 0.3, 0.42], Mv2, 7, 4);
      claws(mb, V.add(wr, [0, -0.2, 0.42]), [0, -0.5, 1], 4, 0.95, 0.1, Cl, 1.3);
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    const wing = (s) => mesh(mb => batWing(mb, s, { span: 2.6, h: 1.6, col: Mv, col2: Mv2, bone: Sl2, back: -0.4, r: 0.1, tips: [[1, 1.0, -0.2], [0.95, 0.2, -0.35], [0.75, -0.5, -0.4], [0.4, -0.8, -0.3]] }));
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    const leg = (s) => mesh(mb => {                                                                         // crouched: thigh out and forward, shin back down to a clawed foot
      const kn = [s * 0.4, -0.75, 0.9], an = [s * 0.5, -1.95, 0.25];
      tube(mb, [[0, 0, 0], kn, an], [0.68, 0.5, 0.36], Sl, 8);
      ell(mb, kn, [0.55, 0.5, 0.55], Sl2, 6, 4);
      sheet(mb, [V.add(kn, [s * 0.2, 0.5, 0.35]), V.add(kn, [s * 0.5, 0.2, 0.3]), V.add(kn, [s * 0.35, -0.5, 0.45]), V.add(kn, [0, -0.3, 0.55])], Mv, Mv2);   // mauve knee plate
      ell(mb, V.add(an, [0, -0.1, 0.3]), [0.5, 0.24, 0.72], Sl2, 7, 4);
      claws(mb, V.add(an, [0, -0.14, 0.92]), [0, -0.3, 1], 4, 0.5, 0.09, Cl, 1.2);
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    attachH(m, 'tail', mb => { const pts = bez3([0, 0, 0], [0, -0.8, -1.0], [0.8, -1.4, -2.0], [1.6, -1.2, -3.0], 7); tube(mb, pts, (t) => 0.62 * (1 - t) + 0.05, Sl, 7); pts.slice(1, 7).forEach(p => mb.blade(V.add(p, [0, 0.3, 0]), [0, 1, -0.5], 0.55, 0.24, 0.06, Sl2)); });
    m.height = flying ? 6.9 : 6.3; m.lungeScale = 0.3; return m;
  }
  reg(['ultimate_weapon', 'ultimate_weapon_c', 'ultimate_weapon_d'], (a) => ultimate(a, true));
  reg('ultimate_weapon_b', (a) => ultimate(a, false));

  // Diamond Weapon: pale grey armoured colossus. Two huge whale-head shoulder pods spanning sideways with dark
  // mouth slits, a small dark face with yellow eyes under a pale hood, a doubled red core, long blade fins sweeping
  // down from the back like a cape, thin clawed arms, bulky bent legs with dark seams and spiked feet
  reg('diamond_weapon', (a) => {
    const m = rig(a); const Wh = '#d8dce2', Gy = '#a0a6b0', Dk = '#50545c', R = '#e02030', Y = '#f0e040';
    m.bone('body', 'root', [0, 4.08, 0]);
    m.bone('head', 'body', [0, 2.55, 0.62]);
    m.bone('wingL', 'body', [1.1, 2.35, 0.0]); m.bone('wingR', 'body', [-1.1, 2.35, 0.0]);
    m.bone('armL', 'body', [1.15, 1.5, 0.6], [-0.4, 0, 0.3]); m.bone('armR', 'body', [-1.15, 1.5, 0.6], [-0.4, 0, -0.3]);
    m.bone('legFL', 'body', [1.0, -0.4, 0]); m.bone('legFR', 'body', [-1.0, -0.4, 0]);
    attachH(m, 'body', mb => {
      mb.loft([{ y: -0.7, rx: 1.3, rz: 0.9 }, { y: 0.3, rx: 1.0, rz: 0.8 }, { y: 1.2, rx: 1.15, rz: 0.85 }, { y: 2.2, rx: 1.4, rz: 0.9 }, { y: 2.7, rx: 0.6, rz: 0.55 }], { sides: 10, sq: 2.6, color: Wh });
      [0.2, 0.7].forEach((y, i) => mb.loft([{ y, rx: 1.02 + i * 0.05, rz: 0.82 }, { y: y + 0.12, rx: 1.04 + i * 0.05, rz: 0.84 }], { sides: 10, sq: 2.6, color: Dk, capTop: false, capBottom: false }));
      sheet(mb, [[0, 2.2, 0.95], [0.5, 1.8, 0.9], [0.3, 1.2, 0.9], [0, 1.0, 0.95], [-0.3, 1.2, 0.9], [-0.5, 1.8, 0.9]], Gy);
      [1, -1].forEach(s => {                                                                                 // cape of long blade fins sweeping down to the ground
        mb.blade([s * 0.9, 2.1, -0.6], [s * 1, -1.25, -0.3], 6.2, 1.7, 0.14, Gy, XY([s * 1, -1.25, 0]), Wh);
        mb.blade([s * 0.7, 1.4, -0.7], [s * 0.6, -1.3, -0.4], 5.0, 1.3, 0.12, Wh, XY([s * 0.6, -1.3, 0]));
      });
    });
    attachH(m, 'body', mb => { mb.sphere(0, 1.95, 0.96, 0.2, 0.22, 0.1, R, 6, 4); mb.sphere(0, 1.58, 0.97, 0.24, 0.2, 0.1, R, 6, 4); }, { unlit: true });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.25, -0.05], [0.4, 0.45, 0.42], Wh, 7, 5);                                               // pale hood
      ell(mb, [0, 0.12, 0.18], [0.28, 0.32, 0.3], '#5a5650', 7, 5);                                          // dark face
      mb.frustum(0, -0.12, 0.34, 0.24, 0.16, 0.14, 0.08, 0.2, Dk);
      for (let i = 0; i < 5; i++) mb.blade([(i - 2) * 0.12, 0.55, -0.12], [(i - 2) * 0.4, 1, -0.6], 0.5, 0.12, 0.05, Wh);
    });
    attachH(m, 'head', mb => eyes(mb, 0.12, 0.2, 0.44, 0.05, Y), { unlit: true });
    // whale-head shoulder pod: fat at the shoulder, a rounded snout pointing out and slightly forward/down,
    // a dark mouth slit along its lower side, the tail end curling back
    const pod = (s) => mesh(mb => {
      const pts = bez3([s * 0.2, 0.1, -1.1], [s * 0.9, 0.55, -0.5], [s * 2.3, 0.35, 0.1], [s * 3.3, -0.35, 0.55], 9);
      tube(mb, pts, (t) => 0.12 + 0.95 * S(PI * Math.min(1, 0.12 + t * 0.95)) * (t < 0.9 ? 1 : 0.7), (t, k) => (k === 6 || k === 7) ? Gy : Wh, 8, { sy: 0.7 });
      tube(mb, bez([s * 1.45, -0.28, 0.35], [s * 2.4, -0.3, 0.55], [s * 3.15, -0.45, 0.62], 4), 0.08, Dk, 4);   // mouth slit
      tube(mb, bez([s * 1.45, -0.2, -0.45], [s * 2.3, -0.1, -0.3], [s * 3.1, -0.4, 0.35], 4), 0.06, Dk, 4);
    });
    m.attach('wingL', pod(1)); m.attach('wingR', pod(-1));
    const arm = mesh(mb => { tube(mb, [[0, 0, 0], [0, -0.8, 0.3], [0, -1.5, 0.6]], [0.3, 0.26, 0.22], Wh, 8); mb.blade([0, -0.6, 0], [0, -1, -1], 0.9, 0.3, 0.1, Gy); claws(mb, [0, -1.6, 0.7], [0, -0.6, 1], 3, 0.5, 0.06, Dk, 1.0); });
    m.attach('armL', arm); m.attach('armR', arm);
    // bulky bent leg: thick thigh forward to a big knee, shin back to the foot; dark armour seams; spiked foot
    const leg = mesh(mb => {
      const kn = [0, -1.45, 0.75], an = [0, -3.05, 0.05];
      tube(mb, [[0, 0, 0], L3([0, 0, 0], kn, 0.5), kn], [0.8, 0.95, 0.85], Wh, 9, { cap: false });
      ell(mb, kn, [0.95, 0.95, 0.95], Gy, 8, 5);
      tube(mb, [kn, L3(kn, an, 0.5), an], [0.8, 0.85, 0.6], Wh, 9, { cap: false });
      [[[0, 0, 0], kn, 0.45], [kn, an, 0.55]].forEach(([p0, p1, t]) => { const c = L3(p0, p1, t); tube(mb, [V.add(c, [0, 0.05, 0]), V.add(c, [0, -0.05, 0])], 0.93, Dk, 9, { cap: false }); });   // seams
      ell(mb, [0, -3.2, 0.3], [0.85, 0.35, 1.05], Gy, 8, 5);
      for (let i = 0; i < 5; i++) { const an2 = -1.2 + i * 0.6; mb.blade([S(an2) * 0.6, -3.45, 0.3 + C(an2) * 0.8], [S(an2), 0.2, C(an2)], 0.9, 0.45, 0.12, '#f0f2f4', [0, 1, 0]); }
    });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.onPose = (mm) => ['wingL', 'wingR'].forEach(n => { const b = mm.bones[n]; b.rot[2] = b.rest[2] + (b.rot[2] - b.rest[2]) * 0.15; });   // the shoulder pods only sway (the stock clips flap wing bones)
    m.height = 7.8; m.lungeScale = 0.2; return m;
  });

  // Ruby Weapon: towering crimson colossus hunched far forward — a few big red armour shells with dark rims over a
  // dark grey core (dark grey thighs, shins and joints showing through), a red glowing eye in the chest under a
  // gold chevron, pointed shoulder plates, the small head carried low and forward under a tall crest that hooks
  // forward over it, a thin whip tail, and two long asymmetric arms reaching forward and down to huge bone-grey
  // claws near the ground (its left arm stretched further out than the right)
  const RW = { r: '#a01828', rr: '#5a0c18', r2: '#c02838', dk: '#3a3a40', dk2: '#2a2a30', bn: '#c0bcc8', au: '#c8a040' };
  // big red shells along a -> b over the dark core: n plates, each a wide flared rim tapering to a narrow waist
  function rubyPlates(mb, a, b, n, r0, r1, sides) {
    const pts = [], rad = [], cols = [];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
      const t = (i + [0, 0.1, 0.9][k]) / n, r = r0 + (r1 - r0) * t;
      pts.push(L3(a, b, t)); rad.push(r * [1.14, 1.08, 0.78][k]); cols.push(k === 0 ? RW.rr : RW.r);
    }
    return tube(mb, pts, rad, (t, k, i) => cols[i], sides || 7);
  }
  reg('ruby_weapon', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 4.55, -0.35], [0.8, 0, 0]);
    m.bone('head', 'body', [0, 2.75, 0.4], [-0.72, 0, 0]);
    m.bone('armL', 'body', [1.45, 2.35, 0.1], [-1.42, 0, 0.4]); m.bone('armR', 'body', [-1.45, 2.35, 0.1], [-1.02, 0, -0.18]);
    m.bone('legFL', 'root', [0.95, 4.45, -0.4], [0, 0, 0.08]); m.bone('legFR', 'root', [-0.95, 4.45, -0.4], [0, 0, -0.08]);
    m.bone('tail', 'body', [0, 0.1, -0.6]);
    attachH(m, 'body', mb => {
      mb.rbox(0, 0.0, -0.05, 1.7, 0.75, 1.1, RW.dk, 0.3);                                            // pelvis
      [[0, 0.62], [0.62, 0.4], [-0.62, 0.4]].forEach(([x, z]) => mb.blade([x, -0.1, z], [x * 0.5, -1, z * 0.6], 1.0, 0.7, 0.1, RW.r, [1, 0, 0], RW.rr));   // hip plates
      tube(mb, [[0, 0.2, 0], [0, 1.0, 0.05], [0, 2.3, 0.1], [0, 2.8, 0.3]], [0.62, 0.66, 0.78, 0.36], RW.dk, 8);                              // dark core
      // two big red back shells and a chest shell, dark rims
      const shell = (c, r, cols) => ell(mb, c, r, RW.r, 8, 6, (i, j) => j >= 4 ? RW.rr : (j === 0 ? RW.r2 : RW.r));
      shell([0, 1.95, -0.2], [1.2, 0.95, 0.72]); shell([0, 1.0, -0.28], [0.95, 0.6, 0.62]);
      ell(mb, [0, 2.0, 0.42], [0.82, 0.62, 0.34], RW.rr, 7, 4);
      [1, -1].forEach(s => mb.blade([s * 0.12, 2.2, 0.72], [s * 0.9, -0.55, 0.2], 0.6, 0.13, 0.05, RW.au));     // gold chevron
      [1, -1].forEach(s => {
        ell(mb, [s * 1.4, 2.35, 0.05], [0.48, 0.48, 0.48], RW.dk2, 6, 4);                              // shoulder joint
        mb.blade([s * 1.1, 2.6, -0.2], [s * 0.6, 1, -0.5], 1.6, 1.1, 0.26, RW.r, null, RW.r2);         // pointed shoulder plate
        mb.blade([s * 1.55, 2.3, -0.1], [s, 0.3, -0.3], 1.0, 0.75, 0.2, RW.rr);
      });
    });
    attachH(m, 'body', mb => { ell(mb, [0, 1.95, 0.74], [0.26, 0.2, 0.1], '#ff3040', 7, 4); }, { unlit: true });
    // head: small dark-red skull carried low and forward, the tall segmented crest hooking forward over it
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.12, 0.2], [0.34, 0.34, 0.46], RW.rr, 7, 5);
      mb.blade([0, 0.05, 0.55], [0, -0.3, 1], 0.4, 0.3, 0.16, RW.r);
      const pts = bez3([0, 0.3, -0.1], [0, 1.6, -0.6], [0, 2.7, 0.2], [0, 2.25, 1.15], 9);
      mb.sweep(pts, pts.map((p, i) => [0.4 * (1 - i / 9) + 0.07, 0.24 * (1 - i / 9) + 0.06]), { up: [1, 0, 0], sides: 6, colors: (k, j) => (j === 2 || j === 3) ? RW.dk : k % 3 === 2 ? RW.rr : RW.r });
      cone(mb, [0, 2.25, 1.15], [0, 1.9, 1.4], 0.09, RW.rr, 4);
    });
    attachH(m, 'head', mb => eyes(mb, 0.14, 0.14, 0.62, 0.05, '#ff2020'), { unlit: true });
    // arms: dark upper arm with one big red shell, dark elbow, forearm with two big shells flaring to the wrist,
    // dark hand, three huge bone claws and a thumb claw
    const arm = (s, L) => mesh(mb => {
      const el = [s * 0.1, -2.0 * L, 0.3], wr = [s * 0.15, -3.9 * L, 1.0];
      tube(mb, [[0, 0.1, 0], el], [0.42, 0.36], RW.dk, 7);
      rubyPlates(mb, [0, 0.15, 0], L3([0, 0.15, 0], el, 0.8), 1, 0.56, 0.5);
      ell(mb, el, [0.42, 0.42, 0.42], RW.dk2, 6, 4);
      tube(mb, [el, wr], [0.36, 0.4], RW.dk, 7);
      rubyPlates(mb, L3(el, wr, 0.12), L3(el, wr, 0.95), 2, 0.5, 0.64);
      ell(mb, V.add(wr, [0, -0.15, 0.08]), [0.46, 0.38, 0.48], RW.dk, 7, 4);
      for (let i = 0; i < 3; i++) { const x = wr[0] + (i - 1) * 0.3; horn(mb, [x, wr[1] - 0.25, wr[2] + 0.2], [x + (i - 1) * 0.22, wr[1] - 0.6, wr[2] + 0.95], [x + (i - 1) * 0.32, wr[1] - 1.45, wr[2] + 1.15], 0.19, RW.bn, 5, 5); }
      horn(mb, [wr[0] + s * 0.4, wr[1] - 0.1, wr[2]], [wr[0] + s * 0.9, wr[1] - 0.4, wr[2] + 0.3], [wr[0] + s * 0.8, wr[1] - 0.95, wr[2] + 0.6], 0.14, RW.bn, 5, 4);
    });
    m.attach('armL', arm(1, 1.12)); m.attach('armR', arm(-1, 0.95));
    // legs: long dark grey legs, red thigh guard in front, dark knee, two big red shells flaring into the boot
    const leg = mesh(mb => {
      tube(mb, [[0, 0, 0], [0, -1.1, 0.3], [0, -2.15, 0.55], [0, -4.25, 0.05]], [0.52, 0.48, 0.4, 0.36], RW.dk, 7);
      mb.blade([0, -0.12, 0.62], [0, -1, 0.26], 1.55, 0.74, 0.16, RW.r, [1, 0, 0], RW.rr);
      ell(mb, [0, -2.15, 0.55], [0.45, 0.45, 0.45], RW.dk2, 6, 4);
      rubyPlates(mb, [0, -2.55, 0.45], [0, -4.2, 0.08], 2, 0.46, 0.68);
      ell(mb, [0, -4.38, 0.35], [0.5, 0.14, 0.75], RW.dk, 7, 3);
      claws(mb, [0, -4.34, 0.98], [0, 0.1, 1], 3, 0.5, 0.09, RW.bn);
    });
    m.attach('legFL', leg); m.attach('legFR', leg);
    attachH(m, 'tail', mb => tube(mb, bez3([0, 0, 0], [0.3, 0.2, -1.1], [1.3, 1.4, -1.9], [2.4, 2.5, -1.6], 9), (t) => 0.26 * (1 - t) + 0.04, (t, k, i) => i % 3 === 2 ? RW.rr : RW.r, 6));
    m.height = 8.7; m.scale = 1.08; m.lungeScale = 0.2; return m;
  });
  // Ruby's Tentacle: a red segmented tentacle erupting from the sand with a grey claw tip, dark grey joint rings
  // between the red segments. Dug up in pairs (callHelp) and mounted in front of Ruby with CR.anchor.
  reg('rubys_tentacle', (a) => {
    const m = rig(a); const Sd = '#b89a60';
    let parent = 'root';
    for (let i = 0; i < 6; i++) {
      m.bone('seg' + i, parent, i === 0 ? [0, 0.1, 0] : [0, 0.62, 0], [i === 0 ? 0 : 0.12, 0, 0]); parent = 'seg' + i;
      attachH(m, 'seg' + i, mb => { const r = 0.36 - i * 0.045; tube(mb, [[0, 0.04, 0], [0, 0.12, 0], [0, 0.58, 0]], [r * 1.08, r * 1.04, r * 0.86], (t, k, j) => j === 0 ? RW.rr : RW.r, 7); tube(mb, [[0, 0.56, 0], [0, 0.68, 0]], r * 0.8, RW.dk, 7, { cap: false }); });
    }
    m.bone('head', parent, [0, 0.62, 0], [0.4, 0, 0]);
    attachH(m, 'head', mb => { ell(mb, [0, 0.05, 0], [0.16, 0.14, 0.16], RW.dk, 6, 4); claws(mb, [0, 0, 0], [0, 1, 0.3], 3, 0.7, 0.07, RW.bn, 0.8); });
    attachH(m, 'root', mb => { ell(mb, [0, 0.02, 0], [0.9, 0.12, 0.9], Sd, 8, 3); });
    m.height = 4.3; m.lungeScale = 0.6;
    return CR.anchor(m, 'ruby_weapon', [[2.3, 0, 2.7], [-2.3, 0, 2.7]]);
  });

  // Emerald Weapon: green underwater colossus. Two great hammerhead pods reaching forward with dark hexagonal eye
  // lenses glowing yellow and blue and long bone tusks, a small ribbed dome head, a narrow ribbed chest with a red
  // chevron core, and a lower body of two huge rounded lobes laced with red veins
  reg('emerald_weapon', (a) => {
    const m = rig(a); m.floats = true; const G = '#2a7a3a', G2 = '#1a5a2a', Gl = '#6aa050', Bn = '#e8e0c8', R = '#e02020', Rv = '#c02020', Ln = '#1a2a30';
    m.bone('body', 'root', [0, 3.9, 0]);
    m.bone('head', 'body', [0, 2.1, 0.3]);
    m.bone('wingL', 'body', [1.25, 2.0, 0.0]); m.bone('wingR', 'body', [-1.25, 2.0, 0.0]);
    m.bone('armL', 'body', [0.85, 1.0, 0.45], [-0.3, 0, 0.4]); m.bone('armR', 'body', [-0.85, 1.0, 0.45], [-0.3, 0, -0.4]);
    attachH(m, 'body', mb => {
      mb.loft([{ y: -0.9, rx: 1.3, rz: 1.0 }, { y: 0.2, rx: 0.8, rz: 0.7 }, { y: 1.2, rx: 0.6, rz: 0.55 }, { y: 2.0, rx: 0.9, rz: 0.6 }, { y: 2.3, rx: 0.4, rz: 0.4 }], { sides: 10, color: G });   // narrow chest
      for (let i = 0; i < 5; i++) sheet(mb, [[-0.4, 1.9 - i * 0.3, 0.58], [0.4, 1.9 - i * 0.3, 0.58], [0, 1.72 - i * 0.3, 0.64]], i % 2 ? Bn : '#c8b8a0');
      [1, -1].forEach(s => {
        ell(mb, [s * 0.82, -2.0, 0.15], [1.2, 1.85, 1.3], G, 10, 7, (i, j) => j > 4 ? G2 : G);             // two huge rounded lobes
        tube(mb, bez3([s * 0.5, -0.7, 1.1], [s * 1.2, -1.4, 1.35], [s * 0.9, -2.4, 1.4], [s * 1.4, -3.1, 1.0], 6), 0.045, Rv, 4);   // red veins
        tube(mb, bez([s * 1.2, -1.4, 1.3], [s * 1.9, -1.9, 0.8], [s * 1.95, -2.7, 0.4], 4), 0.04, Rv, 4);
      });
    });
    attachH(m, 'body', mb => { sheet(mb, [[-0.35, 0.9, 0.62], [0, 0.6, 0.66], [0.35, 0.9, 0.62], [0.25, 1.0, 0.62], [0, 0.78, 0.65], [-0.25, 1.0, 0.62]], R); }, { unlit: true });
    attachH(m, 'head', mb => { ell(mb, [0, 0.2, 0], [0.35, 0.45, 0.4], G); for (let i = 0; i < 4; i++) mb.loft([{ y: 0.05 + i * 0.12, rx: 0.36, rz: 0.41 }, { y: 0.1 + i * 0.12, rx: 0.37, rz: 0.42 }], { sides: 8, color: Gl, capTop: false, capBottom: false }); });
    // hammerhead pod stretched forward, eye lenses on its front, two long bone tusks
    const EY = [[0.55, 0.3, 2.2], [1.4, 0.3, 2.05]];
    const pod = (s) => mesh(mb => {
      ell(mb, [s * 1.0, 0.25, 0.5], [1.25, 0.95, 1.95], G, 10, 7, (i, j) => j > 4 ? G2 : G);
      ell(mb, [s * 1.0, 0.8, 0.3], [0.95, 0.5, 1.6], Gl, 8, 5);
      EY.forEach(([x, y, z]) => { mb.push(); mb.translate(s * x, y, z); mb.rotate(PI / 2, 0, 0); mb.prism(0, -0.06, 0, 0.36, 0.34, 0.14, 6, Ln); mb.pop(); });   // dark hexagonal lenses
      cone(mb, [s * 0.75, -0.45, 1.9], [s * 0.45, -1.9, 5.1], 0.26, Bn, 6);
      cone(mb, [s * 1.8, -0.3, 1.3], [s * 3.4, -1.5, 3.4], 0.2, Bn, 6);
    });
    m.attach('wingL', pod(1)); m.attach('wingR', pod(-1));
    [1, -1].forEach(s => attachH(m, s > 0 ? 'wingL' : 'wingR', mb => EY.forEach(([x, y, z], i) => mb.sphere(s * x, y, z + 0.1, 0.2, 0.2, 0.06, i ? '#40a0ff' : '#ffd020', 7, 4)), { unlit: true }));
    const arm = mesh(mb => { tube(mb, [[0, 0, 0], [0, -0.8, 0.4], [0, -1.4, 0.9]], [0.26, 0.22, 0.18], G2, 7); claws(mb, [0, -1.5, 1.0], [0, -0.5, 1], 3, 0.6, 0.06, Bn, 1.0); });
    m.attach('armL', arm); m.attach('armR', arm);
    m.onPose = (mm) => ['wingL', 'wingR'].forEach(n => { const b = mm.bones[n]; b.rot[2] = b.rest[2] + (b.rot[2] - b.rest[2]) * 0.15; });   // the pods only sway (the stock clips flap wing bones)
    m.height = 7.2; m.lungeScale = 0.2; return m;
  });
  // Emerald's Eye: a dark lens in a hexagonal green socket glowing one colour; the instances alternate
  // yellow and blue like the pod eyes
  let emeraldEyeN = 0;
  reg('eye', (a) => {
    const m = rig(a); m.floats = true; const glowC = (emeraldEyeN++ % 2) ? '#40a0ff' : '#ffd020';
    m.bone('body', 'root', [0, 1.3, 0]);
    attachH(m, 'body', mb => {
      ell(mb, [0, 0, -0.12], [0.4, 0.4, 0.32], '#2a7a3a', 8, 5);
      mb.push(); mb.rotate(PI / 2, 0, 0); mb.prism(0, -0.14, 0, 0.44, 0.4, 0.2, 6, '#1a5a2a'); mb.pop();   // hexagonal socket rim
      mb.sphere(0, 0, 0.1, 0.3, 0.3, 0.1, '#1a2a30', 8, 4);                                                   // dark lens
    });
    attachH(m, 'body', mb => { mb.sphere(0, 0, 0.17, 0.15, 0.15, 0.06, glowC, 8, 4); disc(mb, [0, 0, 0.2], 0.09, 0.09, sh(glowC, 0.4), 6); }, { unlit: true });
    m.height = 1.8; m.lungeScale = 0.8; return m;
  });

  // ================================================================== Northern Cave
  // Gargoyle: a gaunt winged demon — stone form (crouched, grey-green statue) and awake form (dark blue, flying)
  function gargoyle(a, awake) {
    const m = rig(a); m.floats = awake;
    const B = awake ? '#3a4a6a' : '#7a9080', B2 = awake ? '#24304a' : '#5a6a60', Wg = awake ? '#3050c0' : '#8aa090';
    m.bone('body', 'root', [0, awake ? 1.7 : 0.75, 0], [awake ? 0.1 : 0.5, 0, 0]);
    m.bone('head', 'body', [0, 0.5, 0.1], [awake ? 0 : -0.4, 0, 0]);
    m.bone('jaw', 'head', [0, -0.03, 0.1]);
    m.bone('armL', 'body', [0.22, 0.4, 0.05], [awake ? -0.3 : -0.9, 0, 0.3]); m.bone('armR', 'body', [-0.22, 0.4, 0.05], [awake ? -0.3 : -0.9, 0, -0.3]);
    m.bone('wingL', 'body', [0.12, 0.42, -0.12]); m.bone('wingR', 'body', [-0.12, 0.42, -0.12]);
    m.bone('legFL', 'body', [0.14, -0.1, 0], [awake ? 0.3 : -1.2, 0, 0]); m.bone('legFR', 'body', [-0.14, -0.1, 0], [awake ? 0.3 : -1.2, 0, 0]);
    m.bone('tail', 'body', [0, -0.1, -0.1]);
    attachH(m, 'body', mb => { mb.loft([{ y: -0.12, rx: 0.14, rz: 0.12 }, { y: 0.2, rx: 0.17, rz: 0.13 }, { y: 0.42, rx: 0.26, rz: 0.15 }, { y: 0.5, rx: 0.1, rz: 0.08 }], { sides: 8, color: B }); for (let i = 0; i < 3; i++) mb.loft([{ y: 0.05 + i * 0.1, rx: 0.172, rz: 0.132 }, { y: 0.08 + i * 0.1, rx: 0.174, rz: 0.134 }], { sides: 8, color: B2, capTop: false, capBottom: false }); });
    attachH(m, 'head', mb => { ell(mb, [0, 0.06, 0.03], [0.1, 0.1, 0.12], B); [1, -1].forEach(s => { horn(mb, [s * 0.06, 0.12, -0.02], [s * 0.14, 0.22, -0.08], [s * 0.1, 0.3, -0.2], 0.025, B2, 4); mb.blade([s * 0.09, 0.08, 0], [s, 0.5, -0.3], 0.1, 0.05, 0.02, B); }); });
    attachH(m, 'head', mb => eyes(mb, 0.04, 0.08, 0.12, 0.018, awake ? '#ff4040' : '#c0e0c0'), { unlit: true });
    attachH(m, 'jaw', mb => { ell(mb, [0, -0.02, 0.06], [0.07, 0.03, 0.07], B2); teethRow(mb, [0.04, 0, 0.11], [-0.04, 0, 0.11], 3, [0, 1, 0], 0.025, '#f0f0f0'); });
    const arm = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.22, 0.04], [0, -0.44, 0.1]], 0.04, 0.03, B, 5); claws(mb, [0, -0.46, 0.12], [0, -1, 0.3], 3, 0.1, 0.012, '#e0e0e0'); });
    m.attach('armL', arm); m.attach('armR', arm);
    const w = (s) => mesh(mb => batWing(mb, s, { span: awake ? 1.1 : 0.8, h: awake ? 0.7 : 0.6, col: Wg, col2: sh(Wg, -0.3), bone: B2, back: -0.3, tips: [[1, 1.2, -0.2], [0.8, 0.3, -0.35], [0.55, -0.3, -0.3]] }));
    m.attach('wingL', w(1)); m.attach('wingR', w(-1));
    const leg = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.25, 0.12], [0, -0.5, -0.02]], 0.05, 0.03, B, 5); claws(mb, [0, -0.52, 0.02], [0, -0.2, 1], 3, 0.08, 0.012, '#e0e0e0'); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    attachH(m, 'tail', mb => tube(mb, bez([0, 0, 0], [0, -0.3, -0.3], [0.2, -0.4, -0.6], 4), (t) => 0.04 * (1 - t) + 0.005, B2, 4));
    if (!awake) attachH(m, 'root', mb => mb.box(0, 0.06, 0, 0.7, 0.12, 0.6, '#5a6258'));
    m.height = awake ? 2.3 : 1.5; m.lungeScale = 1.1; return m;
  }
  reg('gargoyle', (a) => gargoyle(a, false));
  reg('gargoyle_b', (a) => gargoyle(a, true));

  // Dark Dragon: black-slate dragon with a tan belly, horns, violet limbs and wings
  reg('dark_dragon', (a) => {
    const Bk = '#2a2a3a', Bk2 = '#1a1a24', Tn = '#b8a070', Vi = '#5a2a90', Hn = '#e8d8b0';
    const m = beast(a, { h: 1.55, len: 2.2, head: [0, 0.6, 1.05], headRot: [0.25, 0, 0], jaw: [0, -0.1, 0.2], legX: 0.45, legZ: 0.65, legZb: -0.7, tail: [0, 0, -1.1] });
    m.bone('wingL', 'body', [0.35, 0.45, 0.2]); m.bone('wingR', 'body', [-0.35, 0.45, 0.2]);
    attachH(m, 'body', mb => {
      ell(mb, [0, 0, 0], [0.65, 0.66, 1.15], Bk, 10, 7, (i, j, p) => (p[1] < -0.05 && Math.abs(p[0]) < 0.5 && p[2] > -0.4) ? Tn : Bk);
      tube(mb, [[0, 0.2, 0.7], [0, 0.5, 0.95], [0, 0.6, 1.05]], [0.38, 0.3, 0.26], Bk, 7);
      for (let i = 0; i < 8; i++) mb.blade([0, 0.62 - Math.abs(i - 2) * 0.04, 0.8 - i * 0.28], [0, 1, -0.6], 0.3, 0.14, 0.05, Bk2, [0, 0, 1]);
    });
    attachH(m, 'head', mb => { ell(mb, [0, 0.08, 0.1], [0.28, 0.26, 0.32], Bk); tube(mb, [[0, 0.04, 0.25], [0, 0.0, 0.6]], [0.17, 0.11], Bk, 6); [1, -1].forEach(s => { horn(mb, [s * 0.15, 0.24, -0.02], [s * 0.3, 0.55, -0.2], [s * 0.25, 0.75, -0.45], 0.06, Hn, 5); }); horn(mb, [0, 0.25, 0.05], [0, 0.55, 0.0], [0, 0.65, -0.2], 0.05, Hn, 4); });
    attachH(m, 'head', mb => eyes(mb, 0.14, 0.16, 0.32, 0.035, '#30ff90'), { unlit: true });
    attachH(m, 'jaw', mb => { tube(mb, [[0, -0.02, 0], [0, -0.06, 0.42]], [0.15, 0.08], Bk2, 6); mb.sphere(0, 0.02, 0.22, 0.1, 0.03, 0.16, '#e06020', 6, 3); teethRow(mb, [0.08, 0.02, 0.2], [0.05, 0, 0.42], 3, [0, 1, 0], 0.07, '#f0f0f0'); teethRow(mb, [-0.08, 0.02, 0.2], [-0.05, 0, 0.42], 3, [0, 1, 0], 0.07, '#f0f0f0'); });
    const w = (s) => mesh(mb => batWing(mb, s, { span: 2.4, h: 1.3, col: '#4a2a80', col2: '#2a1a50', bone: Vi, back: -0.35, claw: Hn }));
    m.attach('wingL', w(1)); m.attach('wingR', w(-1));
    const fl = beastLeg(1.45, { r0: 0.2, r1: 0.1, col: Vi, claw: Hn, thigh: true, clawLen: 0.18 });
    const bl = beastLeg(1.5, { r0: 0.24, r1: 0.11, col: Vi, claw: Hn, thigh: true, back: true, knee: 0.18, clawLen: 0.18 });
    m.attach('legFL', fl); m.attach('legFR', fl); m.attach('legBL', bl); m.attach('legBR', bl);
    attachH(m, 'tail', mb => { const pts = bez3([0, 0, 0], [0, -0.3, -0.8], [-0.6, -1.3, -1.2], [-1.0, -1.45, -2.1], 8); tube(mb, pts, (t) => 0.42 * (1 - t) + 0.02, Bk, 7); pts.slice(1, 7).forEach(p => mb.blade(V.add(p, [0, 0.3, 0]), [0, 1, -0.5], 0.25, 0.1, 0.04, Bk2, [0, 0, 1])); });
    m.height = 3.2; m.lungeScale = 1.0; return m;
  });

  // Scissors: a crouched white robot-like fighter — angular helmet with a red crest stripe, a yellow-green visor
  // plate with two yellow straps on the chest, big red shoulder panels, dark blue-black scythe blades on the
  // forearms, a yellow belly gem, black hex knee pads and red diamond marks on the legs. It splits into
  // Scissors(Upper) (the top half balanced on one long thin pink stalk-leg) and Scissors(Lower) (the legs and a
  // small torso whose pink arms hold a blue orb overhead).
  const SC = { w: '#dcdce4', w2: '#a8a8b8', r: '#c02020', y: '#e0c030', vs: '#b0c040', bk: '#202838', bk2: '#3a4458', hx: '#1a1a1a', pk: '#c08080', orb: '#60a0e0' };
  function scissorsTop(m) {
    attachH(m, 'body', mb => {
      mb.loft([{ y: 0.0, rx: 0.2, rz: 0.15 }, { y: 0.28, rx: 0.25, rz: 0.18 }, { y: 0.52, rx: 0.34, rz: 0.21 }, { y: 0.64, rx: 0.16, rz: 0.13 }], { sides: 8, sq: 3, color: SC.w });
      mb.panel([[-0.17, 0.62], [0.17, 0.62], [0.14, 0.34], [0, 0.28], [-0.14, 0.34]], 0.21, 0.04, SC.vs, sh(SC.vs, -0.3));   // visor plate
      [1, -1].forEach(s => {
        mb.box(s * 0.07, 0.46, 0.24, 0.035, 0.34, 0.02, SC.y);                                                          // yellow straps
        ell(mb, [s * 0.36, 0.55, 0], [0.19, 0.15, 0.18], SC.r, 7, 4); ell(mb, [s * 0.36, 0.47, 0], [0.16, 0.08, 0.15], SC.w2, 6, 3);   // red shoulder panels
        mb.panel([[s * 0.18, 0.5], [s * 0.3, 0.46], [s * 0.26, 0.3], [s * 0.18, 0.34]], 0.18, 0.03, SC.r);                // red chest panels
      });
      ell(mb, [0, 0.1, 0.17], [0.06, 0.07, 0.04], SC.y, 4, 2);                                                          // belly gem
    });
    attachH(m, 'head', mb => {
      mb.rbox(0, 0.1, 0.02, 0.26, 0.24, 0.28, SC.w, 0.3);
      mb.box(0, 0.23, 0.02, 0.08, 0.03, 0.3, SC.r); mb.box(0, 0.08, 0.16, 0.2, 0.05, 0.02, '#202020');
      mb.blade([0, 0.2, -0.1], [0, 0.4, -1], 0.14, 0.08, 0.03, SC.r);
    });
    // arms: white upper arm, red band, forearm carrying a long curved scythe blade
    const arm = (s) => mesh(mb => {
      limb(mb, [[0, 0, 0], [0, -0.25, 0.05], [0, -0.46, 0.16]], 0.08, 0.07, SC.w, 6);
      tube(mb, [[0, -0.28, 0.07], [0, -0.33, 0.09]], 0.085, SC.r, 6, { cap: false });
      const pts = bez3([0, -0.3, 0.05], [s * 0.2, -0.6, 0.02], [s * 0.36, -0.82, 0.12], [s * 0.46, -0.92, 0.36], 6);
      mb.sweep(pts, pts.map((p, i) => [0.16 * S(PI * (0.15 + 0.85 * i / 6)) + 0.012, 0.022]), { up: [0.3, 0, 1], sides: 4, colors: (k, j) => j === 0 ? SC.bk2 : SC.bk });
      ell(mb, [0, -0.48, 0.17], [0.07, 0.06, 0.08], SC.w2, 5, 3);
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
  }
  // bent white legs with a black hex knee pad and red diamond marks
  const scissorsLeg = () => mesh(mb => {
    limb(mb, [[0, 0, 0], [0, -0.28, 0.2], [0, -0.52, 0.02]], 0.11, 0.08, SC.w, 6);
    mb.push(); mb.translate(0, -0.28, 0.3); mb.rotate(PI / 2, 0, 0); mb.prism(0, -0.02, 0, 0.08, 0.08, 0.05, 6, SC.hx); mb.pop();
    [0, 1].forEach(i => disc(mb, [0, -0.36 - i * 0.09, 0.13 - i * 0.03], 0.035, 0.05, SC.r, 4));
    mb.rbox(0, -0.54, 0.07, 0.16, 0.08, 0.3, SC.w2, 0.3);
  });
  reg('scissors', (a) => {
    const m = rig(a);
    m.bone('hips', 'root', [0, 0.59, 0]); m.bone('body', 'hips', [0, 0.02, 0], [0.3, 0, 0]); m.bone('head', 'body', [0, 0.65, 0.05], [-0.3, 0, 0]);
    m.bone('armL', 'body', [0.38, 0.5, 0], [-0.5, 0, 0.35]); m.bone('armR', 'body', [-0.38, 0.5, 0], [-0.5, 0, -0.35]);
    m.bone('legFL', 'hips', [0.17, -0.04, 0], [-0.1, 0, 0.3]); m.bone('legFR', 'hips', [-0.17, -0.04, 0], [-0.1, 0, -0.3]);
    attachH(m, 'hips', mb => mb.rbox(0, -0.04, 0, 0.4, 0.16, 0.28, SC.w2, 0.3));
    scissorsTop(m);
    const leg = scissorsLeg(); m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 1.55; m.lungeScale = 1.2; return m;
  });
  reg('scissors_upper', (a) => {
    const m = rig(a);
    m.bone('hips', 'root', [0, 1.25, 0]); m.bone('body', 'hips', [0, 0.02, 0], [0.15, 0, 0]); m.bone('head', 'body', [0, 0.65, 0.05], [-0.15, 0, 0]);
    m.bone('armL', 'body', [0.38, 0.5, 0], [-0.6, 0, 0.35]); m.bone('armR', 'body', [-0.38, 0.5, 0], [-0.6, 0, -0.35]);
    scissorsTop(m);
    // the single long thin pink stalk-leg with a three-toed claw foot
    attachH(m, 'hips', mb => {
      ell(mb, [0, -0.02, 0], [0.18, 0.07, 0.13], '#e03030', 6, 3);
      tube(mb, [[0, 0, 0], [0.04, -0.6, 0.06], [0, -1.22, 0.0]], [0.06, 0.045, 0.04], SC.pk, 5);
      claws(mb, [0, -1.22, 0.02], [0, -0.2, 1], 3, 0.16, 0.025, sh(SC.pk, -0.2), 1.6);
      horn(mb, [0, -1.22, 0], [0, -1.24, -0.1], [0, -1.24, -0.18], 0.025, sh(SC.pk, -0.2), 4, 2);
    });
    m.height = 2.1; m.lungeScale = 1.2; return m;
  });
  reg('scissors_lower', (a) => {
    const m = rig(a);
    m.bone('hips', 'root', [0, 0.59, 0]); m.bone('body', 'hips', [0, 0.02, 0]);
    m.bone('armL', 'body', [0.15, 0.24, 0], [-0.1, 0, 0]); m.bone('armR', 'body', [-0.15, 0.24, 0], [-0.1, 0, 0]);
    m.bone('legFL', 'hips', [0.17, -0.04, 0], [-0.1, 0, 0.3]); m.bone('legFR', 'hips', [-0.17, -0.04, 0], [-0.1, 0, -0.3]);
    attachH(m, 'hips', mb => mb.rbox(0, -0.04, 0, 0.4, 0.16, 0.28, SC.w2, 0.3));
    // small torso with the yellow gem, cut off in red where the upper half separated
    attachH(m, 'body', mb => {
      mb.loft([{ y: 0.0, rx: 0.2, rz: 0.15 }, { y: 0.26, rx: 0.2, rz: 0.15 }], { sides: 8, sq: 3, color: SC.w });
      ell(mb, [0, 0.27, 0], [0.19, 0.05, 0.14], '#e03030', 6, 3);
      ell(mb, [0, 0.12, 0.15], [0.06, 0.07, 0.04], SC.y, 4, 2);
    });
    // two pink arms raised overhead, clasping a blue orb
    const arm = (s) => mesh(mb => {
      tube(mb, [[0, 0, 0], [s * 0.1, 0.3, 0.04], [-s * 0.04, 0.58, 0.07]], [0.05, 0.045, 0.04], SC.pk, 5);
      [0, 1].forEach(k => horn(mb, [-s * 0.04, 0.58, 0.07], [s * 0.02, 0.7 + k * 0.06, 0.07 + (k - 0.5) * 0.12], [-s * 0.08, 0.86 + k * 0.04, 0.07 + (k - 0.5) * 0.1], 0.022, sh(SC.pk, -0.2), 4, 2));
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    attachH(m, 'body', mb => mb.sphere(0, 0.96, 0.07, 0.13, 0.13, 0.13, SC.orb, 8, 6), { unlit: true });
    const leg = scissorsLeg(); m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 1.65; m.lungeScale = 1.2;
    // spawned beside the Upper by its split (addEnemy near: +1.5 m): mount it there so it keeps that spot
    return CR.anchor(m, 'scissors_upper', [1.5, 0, 0]);
  });

  // Parasite: a violet disc-head with one great green eye and thorny feelers on a curling stalk
  reg('parasite', (a) => {
    const m = rig(a); m.floats = true; const Vi = '#7a3ab0', Vi2 = '#4a1a78', G = '#40c040';
    m.bone('body', 'root', [0, 1.1, 0]);
    m.bone('head', 'body', [0, 0.5, 0.1]);
    m.bone('tail', 'body', [0, 0, 0]);
    attachH(m, 'head', mb => { mb.push(); mb.rotate(PI / 2, 0, 0); mb.prism(0, -0.08, 0, 0.3, 0.3, 0.16, 8, Vi); mb.pop(); for (let i = 0; i < 6; i++) { const an = PI * 0.1 + i * 0.55; mb.blade([C(an) * 0.28, S(an) * 0.28, 0], [C(an), S(an), -0.2], 0.2, 0.06, 0.02, i % 2 ? G : '#c02030'); } tube(mb, [[0, 0.3, 0], [0.05, 0.5, 0.0], [0.15, 0.6, 0.05]], 0.012, '#c02030', 3); });
    attachH(m, 'head', mb => { mb.push(); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0.08, 0, 0.2, 0.2, 0.01, 8, '#50e050'); mb.prism(0, 0.09, 0, 0.1, 0.1, 0.01, 5, '#104010'); mb.pop(); }, { unlit: true });
    attachH(m, 'tail', mb => { tube(mb, bez3([0, 0.5, 0.05], [0, 0.0, 0.1], [-0.3, -0.3, 0.0], [-0.2, -0.75, 0.05], 8), (t) => 0.06 - 0.04 * t, Vi2, 5); for (let i = 0; i < 4; i++) mb.blade([-0.2, -0.7, 0.05], [(i - 1.5) * 0.4, -0.5, 0.3], 0.2, 0.04, 0.02, G); });
    m.height = 1.6; m.lungeScale = 1.2; return m;
  });

  reg('master_tonberry', (a) => { const m = tonberry(a, { skin: '#c8c0e8', robe: '#8a1a28', hood: '#6a1420', eye: '#ffe040' }); m.scale = 1.15; return m; });

  reg('king_behemoth', (a) => behemoth(a, { body: '#c8a018', horn: '#202020', spine: '#4a4060', eye: '#8080ff' }));

  // Allemagne (the Ahriman): a flying yellow cyclops with a toothy grin, violet bat wings and clawed feet
  reg('allemagne', (a) => {
    const m = rig(a); m.floats = true; const Y = '#e0c828', Y2 = '#a89018', Pu = '#8a4ac8', Or = '#e08a20';
    m.bone('body', 'root', [0, 2.0, 0]);
    m.bone('head', 'body', [0, 0.1, 0.05]);
    m.bone('wingL', 'body', [0.35, 0.25, -0.1]); m.bone('wingR', 'body', [-0.35, 0.25, -0.1]);
    m.bone('legFL', 'body', [0.2, -0.45, 0]); m.bone('legFR', 'body', [-0.2, -0.45, 0]);
    m.bone('tail', 'body', [0, -0.4, -0.2]);
    attachH(m, 'head', mb => {
      ell(mb, [0, 0, 0], [0.5, 0.55, 0.45], Y, 10, 7, (i, j) => j > 4 ? Y2 : Y);
      for (let i = 0; i < 4; i++) mb.blade([(i - 1.5) * 0.15, 0.48, -0.05], [(i - 1.5) * 0.5, 1, -0.3], 0.3, 0.1, 0.04, Y2);
      mb.sphere(0, -0.22, 0.34, 0.3, 0.13, 0.12, '#6a0a14', 8, 4);
      teethRow(mb, [0.25, -0.14, 0.4], [-0.25, -0.14, 0.4], 8, [0, -1, 0.1], 0.09, '#ffffff'); teethRow(mb, [0.2, -0.32, 0.38], [-0.2, -0.32, 0.38], 6, [0, 1, 0.1], 0.07, '#ffffff');
      ell(mb, [0, 0.15, 0.38], [0.2, 0.2, 0.1], '#f0f0f0');
    });
    attachH(m, 'head', mb => { mb.sphere(0, 0.15, 0.45, 0.13, 0.13, 0.05, '#e02020', 7, 4); mb.sphere(0, 0.15, 0.49, 0.06, 0.06, 0.03, '#101010', 6, 3); }, { unlit: true });
    const w = (s) => mesh(mb => batWing(mb, s, { span: 1.7, h: 1.1, col: Pu, col2: '#5a2a90', bone: Or, back: -0.3 }));
    m.attach('wingL', w(1)); m.attach('wingR', w(-1));
    const leg = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.25, 0.1], [0, -0.45, 0.05]], 0.06, 0.04, Y2, 5); claws(mb, [0, -0.47, 0.08], [0, -0.6, 1], 3, 0.12, 0.015, Or); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    attachH(m, 'tail', mb => tube(mb, bez3([0, 0, 0], [0, -0.4, -0.2], [0.2, -0.8, 0.0], [0.1, -1.1, 0.2], 6), (t) => 0.06 * (1 - t) + 0.01, Y2, 5));
    m.height = 2.7; m.lungeScale = 1.0; return m;
  });

  // Death Dealer: a gaunt jester-card sorcerer in a crimson robe, bone mask, horned cowl, cards scattered below
  reg('death_dealer', (a) => {
    const m = rig(a); m.floats = true; const Cr = '#6a1a3a', Cr2 = '#4a0e28', Bn = '#e8dcc0', Au = '#d8b040';
    m.bone('body', 'root', [0, 0.35, 0]);
    m.bone('head', 'body', [0, 1.55, 0.05]);
    m.bone('armL', 'body', [0.3, 1.35, 0.05], [-0.8, 0, 0.9]); m.bone('armR', 'body', [-0.3, 1.35, 0.05], [-0.8, 0, -0.9]);
    attachH(m, 'body', mb => {
      mb.loft([{ y: 0.0, rx: 0.5, rz: 0.4 }, { y: 0.6, rx: 0.3, rz: 0.24 }, { y: 1.2, rx: 0.26, rz: 0.2 }, { y: 1.45, rx: 0.32, rz: 0.2 }, { y: 1.55, rx: 0.12, rz: 0.1 }], { sides: 10, color: Cr, capBottom: false });
      [1, -1].forEach(s => mb.blade([s * 0.28, 1.45, 0], [s, 0.3, -0.2], 0.4, 0.3, 0.04, Cr2));
      tube(mb, [[0.45, 0.9, 0.3], [0, 0.95, 0.45], [-0.45, 0.9, 0.3], [-0.2, 0.9, -0.3], [0.3, 0.9, -0.3], [0.45, 0.9, 0.3]], 0.02, '#8a4ad0', 4);
    });
    attachH(m, 'head', mb => { ell(mb, [0, 0.1, 0.03], [0.1, 0.12, 0.1], Bn); [1, -1].forEach(s => tube(mb, bez([s * 0.05, 0.18, 0], [s * 0.2, 0.5, -0.05], [s * 0.25, 0.7, 0.05], 4), (t) => 0.05 * (1 - t) + 0.01, Cr, 5)); tube(mb, bez([0, 0.2, -0.03], [0, 0.55, -0.1], [0.05, 0.75, -0.25], 4), (t) => 0.05 * (1 - t) + 0.01, Cr, 5); });
    attachH(m, 'head', mb => eyes(mb, 0.035, 0.12, 0.09, 0.015, '#ff2020'), { unlit: true });
    const arm = mesh(mb => { tube(mb, [[0, 0, 0], [0, -0.3, 0.02], [0, -0.55, 0.05]], [0.1, 0.14, 0.18], Cr, 6); claws(mb, [0, -0.58, 0.08], [0, -1, 0.3], 4, 0.18, 0.012, Bn, 1.2); });
    m.attach('armL', arm); m.attach('armR', arm);
    attachH(m, 'armR', mb => { mb.push(); mb.translate(0, -0.7, 0.2); mb.rotate(0.4, 0, 0.3); mb.box(0, 0, 0, 0.22, 0.32, 0.01, '#e8e0c0'); mb.box(0, 0, 0.006, 0.16, 0.24, 0.005, '#c02020'); mb.pop(); });
    attachH(m, 'root', mb => { for (let i = 0; i < 7; i++) { const an = (i / 7) * PI * 2; mb.push(); mb.translate(C(an) * 0.6, 0.02, S(an) * 0.6); mb.rotate(0, an, 0); mb.box(0, 0, 0, 0.2, 0.01, 0.3, i % 2 ? '#e8d8a0' : Au); mb.pop(); } });
    m.height = 2.4; m.lungeScale = 0.8; return m;
  });

  // Dragon Zombie: a huge skeletal dragon. A bulky mauve ribcage crowned by a glowing magenta skull ringed with
  // white bone spikes, a red dragon head with jaws agape on a thin neck at its left shoulder, fans of long curved
  // bone spars for wings, thin clawed bone legs and arms, a long bony tail
  reg('dragon_zombie', (a) => {
    const m = rig(a); const Bn = '#d8b0a8', Bn2 = '#a07068', Tn = '#c89060', Mg = '#e02080', Mv = '#a06070', Wb = '#e8e0e0';
    m.bone('body', 'root', [0, 2.37, 0], [0.12, 0, 0]);
    m.bone('head', 'body', [0, 1.35, 0.35], [0.1, 0, 0]);
    m.bone('jaw', 'head', [0, -0.16, 0.2], [0.2, 0, 0]);
    m.bone('seg0', 'body', [0.35, 1.2, 0.1]);                                                                // side neck with the dragon head
    m.bone('wingL', 'body', [0.45, 1.15, -0.2]); m.bone('wingR', 'body', [-0.45, 1.15, -0.2]);
    m.bone('armL', 'body', [0.5, 0.7, 0.25], [-0.5, 0, 0.3]); m.bone('armR', 'body', [-0.5, 0.7, 0.25], [-0.5, 0, -0.3]);
    m.bone('legFL', 'body', [0.35, -0.3, 0]); m.bone('legFR', 'body', [-0.35, -0.3, 0]);
    m.bone('tail', 'body', [0, -0.3, -0.3]);
    attachH(m, 'body', mb => {
      tube(mb, [[0, -0.4, -0.25], [0, 0.3, -0.35], [0, 1.0, -0.2], [0, 1.35, 0.25]], [0.16, 0.14, 0.14, 0.1], Bn2, 5, { cap: false });   // spine
      ell(mb, [0, 0.6, 0.02], [0.52, 0.72, 0.42], Mv, 8, 5, (i, j) => j > 3 ? sh(Mv, -0.25) : Mv);              // bulky ribcage
      for (let i = 0; i < 5; i++) { const y = 1.05 - i * 0.2, r = 0.56 - Math.abs(i - 1.5) * 0.06; [1, -1].forEach(s => tube(mb, bez([0, y, -0.3], [s * r * 1.25, y - 0.05, 0.05], [s * r * 0.35, y - 0.15, 0.44], 3), 0.06, Bn, 4, { cap: false })); }   // thick ribs
      ell(mb, [0, -0.35, -0.1], [0.42, 0.24, 0.32], Tn, 7, 4);                                                // pelvis
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.05, 0.08], [0.3, 0.27, 0.3], '#c02070', 8, 5);
      for (let i = 0; i < 8; i++) { const an = -1.35 + i * 0.386; mb.blade([S(an) * 0.18, 0.2 + C(an) * 0.06, -0.04], [S(an) * 1.1, 1, -0.35], 0.75 - Math.abs(i - 3.5) * 0.07, 0.12, 0.05, Wb); }   // crown of bone spikes
    });
    attachH(m, 'head', mb => { eyes(mb, 0.12, 0.1, 0.3, 0.075, Mg, 0.06); mb.sphere(0, 0.05, 0.33, 0.2, 0.16, 0.06, '#ff40a0', 6, 3); }, { unlit: true });   // glowing magenta face
    attachH(m, 'jaw', mb => { tube(mb, [[0, -0.02, 0], [0, -0.06, 0.34]], [0.16, 0.08], Bn2, 6); teethRow(mb, [0.09, 0.02, 0.1], [0.06, 0, 0.32], 3, [0, 1, 0], 0.08, '#f0f0f0'); teethRow(mb, [-0.09, 0.02, 0.1], [-0.06, 0, 0.32], 3, [0, 1, 0], 0.08, '#f0f0f0'); });
    const nk = bez3([0, 0, 0], [0.45, 0.25, 0.05], [0.8, 0.3, 0.3], [1.0, 0.15, 0.6], 5);
    attachH(m, 'seg0', mb => {                                                                               // red dragon head with jaws agape and a blue tongue
      tube(mb, nk, (t) => 0.1 - 0.03 * t, (t, k, i) => i % 2 ? Bn : Bn2, 5, { cap: false });
      const h = nk[5];
      ell(mb, h, [0.21, 0.18, 0.28], '#a02838', 6, 4);
      tube(mb, [h, V.add(h, [0.02, 0.02, 0.3]), V.add(h, [0.03, 0.0, 0.58])], [0.15, 0.11, 0.04], '#a02838', 5);
      tube(mb, [V.add(h, [0, -0.1, 0.03]), V.add(h, [0.02, -0.28, 0.28]), V.add(h, [0.03, -0.36, 0.5])], [0.1, 0.07, 0.03], '#7a1a28', 5);
      tube(mb, [V.add(h, [0, -0.1, 0.14]), V.add(h, [0.02, -0.16, 0.42]), V.add(h, [0.02, -0.28, 0.6])], [0.055, 0.04, 0], '#3050c0', 3, { cap: false });   // tongue
      [1, -1].forEach(q => cone(mb, V.add(h, [q * 0.08, 0.08, -0.08]), V.add(h, [q * 0.12, 0.25, -0.35]), 0.035, Wb, 4));
    });
    attachH(m, 'seg0', mb => [1, -1].forEach(q => mb.sphere(nk[5][0] + q * 0.1, nk[5][1] + 0.05, nk[5][2] + 0.12, 0.028, 0.028, 0.02, '#ffe040', 4, 2)), { unlit: true });
    // wing: a fan of long curved bone spars radiating from the shoulder, drooping at the ends (no membrane)
    const wing = (s) => mesh(mb => {
      const root = [0, 0, 0], el = [s * 0.8, 0.9, -0.3];
      tube(mb, [root, el], [0.14, 0.1], Bn, 5, { cap: false });
      for (let i = 0; i < 7; i++) {
        const an = 1.2 - i * 0.42, L = 2.6 + (i < 3 ? i * 0.35 : (6 - i) * 0.25);
        const d = [s * C(an), S(an), -0.25], tip = V.add(el, V.scale(d, L)), mid = V.add(V.add(el, V.scale(d, L * 0.55)), [0, 0.35, 0]);
        tube(mb, bez(el, mid, V.add(tip, [0, -0.35, 0]), 3), (t) => t < 1 ? 0.13 * (1 - t) + 0.025 : 0, i % 2 ? Tn : Bn, 4, { cap: false });   // pointed spar
      }
    });
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    const arm = mesh(mb => { tube(mb, [[0, 0, 0], [0, -0.5, 0.3], [0, -0.9, 0.6]], [0.08, 0.07, 0.055], Bn, 5, { cap: false }); for (let k = -1; k <= 1; k++) mb.spike([k * 0.05, -0.92, 0.62], [k * 0.4, -0.6, 1], 0.32, 0.03, 3, Bn2); });
    m.attach('armL', arm); m.attach('armR', arm);
    const leg = mesh(mb => { tube(mb, [[0, 0, 0], [0, -0.9, 0.5], [0, -1.95, -0.1]], [0.13, 0.1, 0.07], '#b8aab0', 5, { cap: false }); ell(mb, [0, -0.9, 0.5], [0.15, 0.15, 0.15], Tn, 5, 3); ell(mb, [0, -1.96, 0.0], [0.1, 0.06, 0.14], Bn2, 5, 3); for (let k = -1; k <= 1; k++) mb.spike([k * 0.07, -1.97, 0.08], [k * 0.45, -0.15, 1], 0.38, 0.04, 3, Bn2); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    attachH(m, 'tail', mb => { const pts = bez3([0, 0, 0], [0, -0.8, -0.6], [0.6, -1.6, -1.2], [1.2, -1.8, -1.9], 6); tube(mb, pts, (t) => t < 1 ? 0.14 * (1 - t) + 0.02 : 0, (t, k, i) => i % 2 ? Bn : Bn2, 4, { cap: false }); });
    m.height = 6.5; m.lungeScale = 0.6; return m;
  });

  // Mover: a floating glossy red sphere (three appear together)
  reg('mover', (a) => {
    const m = rig(a); m.floats = true;
    m.bone('body', 'root', [0, 1.4, 0]);
    attachH(m, 'body', mb => ell(mb, [0, 0, 0], [0.32, 0.32, 0.32], '#e02818', 10, 8, (i, j) => j < 2 ? '#ff7050' : (j > 5 ? '#a01008' : '#e02818')));
    m.height = 1.8; m.lungeScale = 1.2; return m;
  });

  // Magic Pot: a golden urn painted with an eye glyph; a purple imp with yellow eyes and a red plume peeks out
  let potTex = null;
  function potGlyph() {
    if (potTex) return potTex;
    const T = FF7.tex, t = T.create(48, 48, '#d8b050'), k = '#3a2a10';
    T.fillEllipse(t, 24, 22, 14, 7, k); T.fillEllipse(t, 24, 22, 11, 5, '#d8b050'); T.fillEllipse(t, 24, 22, 4.5, 4.5, k);
    for (let i = 0; i < 5; i++) T.line(t, 14 + i * 5, 10, 16 + i * 4, 14, 1.6, k);
    T.fillRect(t, 12, 32, 24, 2, k); T.fillRect(t, 14, 36, 3, 8, k); T.fillRect(t, 22.5, 36, 3, 8, k); T.fillRect(t, 31, 36, 3, 8, k);
    return (potTex = t);
  }
  reg('magic_pot', (a) => {
    const m = rig(a); const Au = '#d8b050', Au2 = '#a07a28', Pu = '#6a2aa0';
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('head', 'body', [0, 1.02, 0]);
    attachH(m, 'body', mb => { mb.loft([{ y: 0.0, rx: 0.3, rz: 0.3 }, { y: 0.15, rx: 0.42, rz: 0.42 }, { y: 0.55, rx: 0.46, rz: 0.46 }, { y: 0.8, rx: 0.34, rz: 0.34 }, { y: 0.9, rx: 0.26, rz: 0.26 }, { y: 1.0, rx: 0.3, rz: 0.3 }], { sides: 10, color: Au }); mb.loft([{ y: 0.84, rx: 0.3, rz: 0.3 }, { y: 0.88, rx: 0.31, rz: 0.31 }], { sides: 10, color: Au2 }); });
    m.attach('body', wrapTex(potGlyph(), 0.468, 0.2, 0.66, 0.55, 6));
    attachH(m, 'head', mb => { ell(mb, [0, 0.08, 0.03], [0.2, 0.15, 0.18], Pu); [1, -1].forEach(s => mb.blade([s * 0.16, 0.1, 0], [s, 0.35, -0.1], 0.24, 0.12, 0.02, Pu)); tube(mb, [[0, 0.16, 0], [0, 0.32, 0]], 0.012, '#e0c040', 4); mb.blade([0, 0.32, 0], [0.3, 1, 0.2], 0.16, 0.08, 0.02, '#e02020'); });
    attachH(m, 'head', mb => eyes(mb, 0.07, 0.1, 0.19, 0.03, '#ffe020'), { unlit: true });
    m.height = 1.3; m.lungeScale = 0.4; return m;
  });

  // Christopher: blond fighter in purple flares with a half-black/half-white mask and long white blade-wings
  reg('christopher', (a) => {
    const m = human({ base: 'man', _id: 'd23_christopher', skin: '#f0c8a8', hair: '#f0d040', hairStyle: 'messy', eyes: '#202020', top: '#1a1a2a', topColors: (ring) => ring >= 2 ? '#f0c8a8' : null, sleeve: 'skin',
      bottom: '#7a3ab0', pants: 'baggy', boots: '#c02060', shoes: true, belt: '#202030', extras: ['belt', 'mask'], maskColor: '#e8e8f0' }, 1.7, false);
    const H = m.H;
    [['armL', 1], ['armR', -1]].forEach(([b, s]) => attachH(m, b, mb => { tube(mb, bez([0, 0.02, -0.02], [s * 0.25, 0.25, -0.1], [s * 0.6, 0.35, -0.15], 4), (t) => 0.03 * (1 - t) + 0.004, '#e8e8f4', 4); mb.blade([s * 0.02, 0, -0.03], [s, 0.45, -0.2], 0.62, 0.08, 0.02, '#f0f0f8', [0, 1, 0]); }));
    attachH(m, 'hips', mb => mb.loft([{ y: -H.thigh * 1.9, rx: 0.07, rz: 0.07, x: 0.055 }, { y: -H.thigh * 1.6, rx: 0.05, rz: 0.05, x: 0.055 }], { sides: 8, color: '#7a3ab0' }));
    return m;
  });
  // Gighee: a gangly pink llama-like beast with a yellow star on its brow and a blond spiky crest
  reg('gighee', (a) => {
    const Pk = '#d8a0a0', Pk2 = '#b07878', Y = '#f0d040', Pu = '#6a3a90';
    const m = beast(a, { h: 1.2, len: 0.6, head: [0, 0.75, 0.3], headRot: [0, 0, 0], legX: 0.1, legZ: 0.18, legZb: -0.2, tail: [0, 0.05, -0.3] });
    attachH(m, 'body', mb => { ell(mb, [0, 0.05, 0], [0.2, 0.22, 0.34], Pk); tube(mb, [[0, 0.15, 0.2], [0, 0.5, 0.28], [0, 0.75, 0.3]], [0.12, 0.08, 0.07], Pk, 6); [1, -1].forEach(s => sheet(mb, [[s * 0.2, 0.2, 0.2], [s * 0.22, 0.25, -0.2], [s * 0.21, -0.1, -0.15], [s * 0.2, -0.1, 0.15]], Pu)); });
    attachH(m, 'head', mb => { ell(mb, [0, 0.08, 0.05], [0.1, 0.12, 0.14], Pk); tube(mb, [[0, 0.04, 0.12], [0, 0.0, 0.26]], [0.07, 0.05], Pk, 6); for (let i = 0; i < 9; i++) { const an = -1.3 + i * 0.33; mb.blade([S(an) * 0.06, 0.18, -0.02], [S(an) * 1.2, 1, -0.2], 0.22, 0.07, 0.03, i % 2 ? Y : '#f8e880'); } disc(mb, [0, 0.14, 0.17], 0.035, 0.035, '#ffd020', 5); });
    attachH(m, 'head', mb => eyes(mb, 0.06, 0.1, 0.13, 0.02, '#4040c0'), { unlit: true });
    const leg = (back) => beastLeg(1.15, { r0: 0.05, r1: 0.03, col: Pk2, paw: '#6a4a4a', back, knee: 0.1 });
    m.attach('legFL', leg(false)); m.attach('legFR', leg(false)); m.attach('legBL', leg(true)); m.attach('legBR', leg(true));
    attachH(m, 'tail', mb => tube(mb, [[0, 0, 0], [0, -0.1, -0.15]], [0.04, 0.01], Pk2, 4));
    m.height = 2.1; m.lungeScale = 1.1; return m;
  });

  reg('iron_man', (a) => armoredGiant(a, { main: '#2a4a7a', dark: '#1a2a4a', plate: '#a02030', gold: '#b09040', eye: '#ff4040', blade: 1.9, horns: true, k: 1.3 }));

  // ================================================================== Planet's core: final bosses
  // Jenova·SYNTHESIS: a great smooth, faceted tan husk with a shaggy fringe round its rim, opened like a flower —
  // pink petals, a violet crystal crown, a screaming pale figure at its heart, purple lobes and red pustules.
  // _b / _c are its two long whip tentacles, mounted on it with CR.anchor.
  reg('jenova_synthesis', (a) => {
    const m = rig(a); m.floats = true; const Br = '#a8845a', Br2 = '#7a5a38', Pk = '#e8a8b8', Pk2 = '#c07890', Vi = '#6a2a90', Vi2 = '#9a4ac0', Fl = '#e0b0a0';
    m.bone('body', 'root', [0, 2.4, 0]);
    m.bone('head', 'body', [0, -0.1, 0.9]);
    m.bone('jaw', 'head', [0, -0.25, 0.1]);
    const rnd = U.rng(U.strSeed('synthesis'));
    attachH(m, 'body', mb => {
      ell(mb, [0, 0, -0.32], [1.7, 1.7, 0.9], Br, 12, 8, (i, j) => (j > 5 ? Br2 : (i + j) % 3 ? Br : sh(Br, 0.12)));
      // shaggy fringe round the rim only (the husk itself is smooth)
      for (let i = 0; i < 26; i++) { const an = (i / 26) * PI * 2 + (rnd() - 0.5) * 0.1, r = 1.5 + (i % 2) * 0.08; mb.blade([C(an) * r, S(an) * r, 0.05 - (i % 3) * 0.1], [C(an), S(an), -0.25 + (i % 2) * 0.35], 0.36 + rnd() * 0.3, 0.5, 0.08, i % 2 ? Br : '#c8a070', [-S(an), C(an), 0], '#e8d0a8'); }
      for (let i = 0; i < 16; i++) { const an = (i / 16) * PI * 2; mb.blade([C(an) * 1.36, S(an) * 1.36, 0.3], [C(an) * 0.6, S(an) * 0.6, 1], 0.36, 0.6, 0.08, i % 2 ? Br : '#c8a070', [-S(an), C(an), 0], '#e8d0a8'); }
      for (let i = 0; i < 10; i++) { const an = (i / 10) * PI * 2; mb.blade([C(an) * 0.5, S(an) * 0.5 + 0.1, 0.95], [C(an), S(an) + 0.2, 0.5], 0.95, 0.7, 0.05, i % 2 ? Pk : Pk2, null, '#f8d8e0'); }
      [1, -1].forEach(s => { ell(mb, [s * 0.75, -0.55, 0.85], [0.45, 0.3, 0.3], Vi, 7, 5); ell(mb, [s * 0.4, -0.85, 0.9], [0.3, 0.22, 0.25], sh(Vi, 0.15), 6, 4); });
      [[-0.9, -0.9], [-0.75, -1.05], [-1.0, -1.15]].forEach(([x, y]) => mb.sphere(x, y, 0.9, 0.09, 0.09, 0.08, '#c01a3a', 6, 4));
      tube(mb, [[0, 0.3, 1.0], [0, 1.0, 1.05], [0, 1.9, 0.9]], [0.28, 0.22, 0.005], (t, k) => k % 2 ? Vi : Vi2, 5);
    });
    attachH(m, 'head', mb => {
      tube(mb, [[0, -0.8, 0], [0, -0.3, 0.05], [0, 0.35, 0.05]], [0.13, 0.14, 0.1], Fl, 6);
      ell(mb, [0, 0.45, 0.05], [0.13, 0.16, 0.12], '#e8d8d0');
      [1, -1].forEach(s => { tube(mb, bez3([s * 0.08, 0.5, 0.0], [s * 0.3, 0.8, 0.1], [s * 0.15, 0.2, 0.3], [s * 0.2, -0.3, 0.25], 6), 0.025, '#c04060', 4); tube(mb, bez3([s * 0.12, 0.1, 0.05], [s * 0.7, 0.3, 0.2], [s * 1.0, 0.0, 0.3], [s * 1.1, -0.9, 0.2], 7), [0.08, 0.08, 0.07, 0.06, 0.06, 0.05, 0.04, 0.03], (t) => t < 0.5 ? '#d08aa0' : '#6a9a90', 5); });
    });
    attachH(m, 'jaw', mb => { mb.sphere(0, -0.05, 0.12, 0.07, 0.16, 0.05, '#3a0a4a', 6, 4); });
    attachH(m, 'head', mb => eyes(mb, 0.05, 0.48, 0.14, 0.018, '#ffe060'), { unlit: true });
    m.height = 4.6; m.lungeScale = 0.2; return m;
  });
  // Jenova·SYNTHESIS tentacles: long thin whips growing from behind the husk's rim, arching out and curling down
  // to a frayed tip (_b grey-teal, _c red-pink). Built around the hanging part of the whip; s = +1 on the
  // husk's left (+x), -1 on its right. The chained seg bones let the stock idle ripple the whip.
  function synthArm(a, s) {
    const m = rig(a); m.floats = true; const col = s > 0 ? '#6a9a90' : '#c05a6a', col2 = sh(col, -0.18);
    const P = [[-s * 1.05, 2.65, -0.3], [-s * 0.2, 3.18, -0.12], [s * 0.6, 3.28, 0.08], [s * 1.3, 2.88, 0.24], [s * 1.66, 2.12, 0.4], [s * 1.6, 1.36, 0.5], [s * 1.24, 0.82, 0.6]];
    m.bone('body', 'root', P[0]);
    let parent = 'body';
    for (let i = 0; i < 6; i++) {
      const d = V.sub(P[i + 1], P[i]), r0 = 0.2 - i * 0.024, r1 = 0.2 - (i + 1) * 0.024;
      m.bone('seg' + i, parent, i === 0 ? [0, 0, 0] : V.sub(P[i], P[i - 1]));
      attachH(m, 'seg' + i, mb => { tube(mb, [[0, 0, 0], V.scale(d, 0.5), d], [r0 + 0.012, (r0 + r1) / 2, r1 + 0.012], (t, k, j) => j === 1 ? col : col2, 6); });
      parent = 'seg' + i;
    }
    // frayed tip: four thin strands
    m.bone('head', parent, V.sub(P[6], P[5]));
    attachH(m, 'head', mb => { for (let i = 0; i < 4; i++) { const k = i - 1.5; horn(mb, [0, 0, 0], [-s * 0.08 + k * 0.08, -0.25, 0.1 + k * 0.05], [-s * 0.2 + k * 0.18, -0.5, 0.18 + k * 0.1], 0.035, i % 2 ? col : col2, 4, 3); } });
    m.height = 3.3; m.lungeScale = 0.2;
    return CR.anchor(m, 'jenova_synthesis', [s * 2.2, 0, -0.1]);
  }
  reg('jenova_synthesis_b', (a) => synthArm(a, 1));
  reg('jenova_synthesis_c', (a) => synthArm(a, -1));

  // Bizarro·Sephiroth: a colossal grey, heavily muscled torso on a flared teal-and-gold cup, a small Sephiroth-like
  // figure crouched on top. Its parts are separate combatants mounted on it with CR.anchor: _b the hooded
  // horned head between the shoulders, _c the glowing orb core in its gold cradle, _d / _e the feathered
  // magic fins hanging on each side. When a part dies the main body keeps a dark socket / empty cup there.
  const BZ = { gy: '#6a6a78', gy2: '#48485a', gy3: '#7a7a8a', tl: '#2a6a6a', tl2: '#1a4a4a', au: '#e0c040', gl: '#fff080', sk: '#8aa098', hr: '#b8c8c0', hd: '#2a6a50', ab: '#5a6a58', ab2: '#46564a' };
  const bzSteady = (m) => { m.onPose = (mm) => { mm.root.pos[2] *= 0.3; }; };   // keep the mounted parts together
  function bizarroFigure(mb, k) {
    mb.push(); mb.scale(k, k, k);
    mb.loft([{ y: 0.0, rx: 0.3, rz: 0.2 }, { y: 0.4, rx: 0.32, rz: 0.2 }, { y: 0.75, rx: 0.42, rz: 0.24 }, { y: 0.85, rx: 0.14, rz: 0.12 }], { sides: 8, color: BZ.sk });
    ell(mb, [0, 1.0, 0.03], [0.12, 0.15, 0.13], BZ.sk);
    tube(mb, [[0, 1.1, -0.1], [0, 0.6, -0.2], [0, 0.1, -0.25]], [0.14, 0.18, 0.12], BZ.hd, 6);
    [1, -1].forEach(s => { mb.blade([s * 0.06, 1.1, 0.08], [s * 0.3, -1, 0.1], 0.5, 0.08, 0.02, BZ.hd); tube(mb, [[s * 0.38, 0.72, 0], [s * 0.6, 0.4, 0.12], [s * 0.7, 0.05, 0.2]], [0.07, 0.06, 0.05], BZ.sk, 5); });
    mb.pop();
  }
  reg('bizarro_sephiroth', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 2.5, 0]);
    m.bone('head', 'body', [0, 2.5, -0.35]);
    m.bone('armL', 'body', [1.75, 1.62, 0.0], [-0.35, 0, 0.3]); m.bone('armR', 'body', [-1.75, 1.62, 0.0], [-0.35, 0, -0.3]);
    // the flared cup: narrow dark-brown foot widening to a green-gold lip with a jagged gold rim
    attachH(m, 'root', mb => {
      mb.loft([{ y: 0.0, rx: 0.35, rz: 0.32, color: '#6a2a18' }, { y: 0.4, rx: 0.72, rz: 0.62, color: BZ.tl2 }, { y: 1.3, rx: 1.15, rz: 0.98, color: BZ.tl }, { y: 2.1, rx: 1.55, rz: 1.25, color: '#4a7a58' }, { y: 2.45, rx: 1.7, rz: 1.35, color: '#8aa040' }, { y: 2.5, rx: 1.66, rz: 1.3 }], { sides: 12, color: BZ.tl, capTop: false });
      for (let i = 0; i < 14; i++) { const an = (i / 14) * PI * 2; mb.blade([C(an) * 1.6, 2.42, S(an) * 1.26], [C(an) * 0.45, 1, S(an) * 0.45], 0.45 + (i % 2) * 0.2, 0.5, 0.06, i % 2 ? BZ.au : '#c8a030', [-S(an), 0, C(an)]); }
      mb.loft([{ y: 2.1, rx: 1.45, rz: 1.15 }, { y: 2.2, rx: 1.4, rz: 1.1 }], { sides: 12, color: '#1a2a2a', capBottom: false });   // dark inside of the cup
    });
    attachH(m, 'body', mb => {
      // ribbed abdomen, broad chest, huge rounded shoulders, pecs and deltoids
      mb.loft([{ y: -0.2, rx: 0.6, rz: 0.5 }, { y: 0.2, rx: 0.62, rz: 0.5 }, { y: 0.4, rx: 0.66, rz: 0.52 }, { y: 0.6, rx: 0.64, rz: 0.5 }, { y: 0.8, rx: 0.72, rz: 0.54 }, { y: 1.0, rx: 0.9, rz: 0.6 }],
        { sides: 10, color: BZ.ab }).loft([{ y: 1.0, rx: 0.9, rz: 0.6 }, { y: 1.5, rx: 1.35, rz: 0.72 }, { y: 1.95, rx: 1.3, rz: 0.7 }, { y: 2.2, rx: 0.7, rz: 0.5 }], { sides: 10, color: BZ.gy });
      for (let i = 0; i < 4; i++) mb.box(0, 0.05 + i * 0.22, 0.5, 0.7 - i * 0.04, 0.07, 0.06, BZ.ab2);
      [1, -1].forEach(s => {
        ell(mb, [s * 1.4, 1.72, -0.05], [0.88, 0.74, 0.82], BZ.gy, 8, 6);
        ell(mb, [s * 1.9, 1.35, 0.1], [0.5, 0.55, 0.52], BZ.gy3, 7, 5);
        ell(mb, [s * 0.52, 1.42, 0.5], [0.52, 0.4, 0.3], BZ.gy3, 7, 5);
        ell(mb, [s * 0.95, 2.1, -0.2], [0.55, 0.35, 0.5], BZ.gy2, 7, 4);
      });
      ell(mb, [0, 1.85, 0.25], [0.52, 0.38, 0.34], '#22222c', 7, 5);              // socket the head portion sits in
      ell(mb, [0, 2.3, -0.4], [0.62, 0.42, 0.46], BZ.gy, 7, 5);                  // mound the figure crouches on
      ell(mb, [0, -0.05, 0.42], [0.5, 0.26, 0.2], '#3a3020', 7, 4);              // hollow the core sits in
    });
    attachH(m, 'head', mb => bizarroFigure(mb, 0.95));
    attachH(m, 'head', mb => eyes(mb, 0.043, 0.95, 0.125, 0.017, '#80ffb0'), { unlit: true });
    // massive grey arms: bicep lobe, forearm, clawed hand
    const arm = mesh(mb => {
      tube(mb, [[0, 0, 0], [0, -0.85, 0.25], [0, -1.65, 0.6]], [0.5, 0.44, 0.34], BZ.gy, 8);
      ell(mb, [0, -0.45, 0.28], [0.44, 0.5, 0.34], BZ.gy3, 7, 5);
      ell(mb, [0, -1.8, 0.7], [0.4, 0.34, 0.4], BZ.gy2, 7, 5);
      claws(mb, [0, -1.95, 0.95], [0, -0.6, 1], 4, 0.5, 0.07, '#b8b8c8', 1.2);
    });
    m.attach('armL', arm); m.attach('armR', arm);
    bzSteady(m);
    m.height = 6.3; m.lungeScale = 0.1; return m;
  });
  // _b head portion: the hooded Sephiroth face between the shoulders — brow, big green eyes, long silver hair
  // strands down the front, a teal-green hood with two curling horns, rising from grey trapezius muscle
  reg('bizarro_sephiroth_b', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 0, 0]); m.bone('head', 'body', [0, 0.55, 0.1]);
    attachH(m, 'body', mb => { ell(mb, [0, 0.05, -0.05], [0.68, 0.4, 0.46], BZ.gy, 8, 5); [1, -1].forEach(s => ell(mb, [s * 0.46, 0.2, -0.1], [0.36, 0.3, 0.36], BZ.gy3, 6, 4)); });
    attachH(m, 'head', mb => {
      mb.scale(1.3);
      ell(mb, [0, 0.12, -0.12], [0.36, 0.44, 0.32], BZ.tl, 8, 6);                   // hood
      mb.blade([0, 0.5, -0.1], [0, 1, -0.5], 0.3, 0.3, 0.1, BZ.tl2);
      ell(mb, [0, 0.02, 0.1], [0.2, 0.27, 0.2], BZ.sk, 8, 6);                       // face
      mb.box(0, 0.12, 0.27, 0.3, 0.05, 0.06, sh(BZ.sk, -0.25));                     // brow ridge
      mb.blade([0, 0.1, 0.28], [0, -1, 0.3], 0.14, 0.06, 0.05, sh(BZ.sk, -0.1));     // nose
      mb.box(0, -0.13, 0.27, 0.1, 0.02, 0.02, '#3a2a30');                           // mouth
      [1, -1].forEach(s => {
        tube(mb, bez3([s * 0.28, 0.42, -0.1], [s * 0.85, 0.6, -0.15], [s * 0.95, 1.15, -0.1], [s * 0.6, 1.3, 0.0], 7), (t) => 0.11 * (1 - t) + 0.015, BZ.hd, 5);   // curling horn
        for (let i = 0; i < 3; i++) tube(mb, bez([s * (0.1 + i * 0.07), 0.28, 0.22], [s * (0.16 + i * 0.1), -0.3, 0.36], [s * (0.14 + i * 0.12), -1.05 + i * 0.12, 0.42], 4), (t) => 0.04 - 0.025 * t, i === 1 ? BZ.hr : sh(BZ.hr, -0.12), 4);   // silver hair
      });
    });
    attachH(m, 'head', mb => { mb.scale(1.3); [1, -1].forEach(s => mb.sphere(s * 0.085, 0.05, 0.27, 0.05, 0.03, 0.02, '#80ffb0', 6, 3)); }, { unlit: true });
    bzSteady(m);
    m.height = 2.3; m.lungeScale = 0.1;
    return CR.anchor(m, 'bizarro_sephiroth', [0, 3.6, 0.3]);
  });
  // _c core: the glowing orb in a flared gold-fringed cradle under a thick gold crescent
  reg('bizarro_sephiroth_c', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 0.6, 0]);
    attachH(m, 'body', mb => {
      tube(mb, bez3([-0.62, 0.2, 0.0], [-0.55, 0.85, 0.12], [0.55, 0.85, 0.12], [0.62, 0.2, 0.0], 8), (t) => 0.1 + 0.08 * S(PI * t), BZ.au, 6);   // crescent over the orb
      for (let i = 0; i < 12; i++) { const an = (i / 12) * PI * 2; mb.blade([C(an) * 0.42, -0.3, S(an) * 0.36], [C(an) * 0.7, -1, S(an) * 0.6], 0.55, 0.28, 0.05, i % 2 ? BZ.au : '#8aa040', [-S(an), 0, C(an)], '#f0e880'); }
      mb.loft([{ y: -0.45, rx: 0.2, rz: 0.2 }, { y: -0.3, rx: 0.5, rz: 0.45 }, { y: -0.1, rx: 0.6, rz: 0.55 }], { sides: 10, color: BZ.tl2, capTop: false });
    });
    attachH(m, 'body', mb => ell(mb, [0, 0.12, 0.05], [0.52, 0.52, 0.5], BZ.gl, 10, 7), { unlit: true });
    bzSteady(m);
    m.height = 1.35; m.lungeScale = 0.1;
    return CR.anchor(m, 'bizarro_sephiroth', [0, 1.95, 0.72]);
  });
  // _d / _e magic portions: a fan of long green-gold feathers edged in gold, hanging below each shoulder
  // (built from the feather tips up to the root; s = -1 the model's right (_d), +1 its left (_e))
  function bizarroMagic(a, s) {
    const m = rig(a);
    m.bone('body', 'root', [0, 2.2, 0]); m.bone('wingL', 'body', [0, 0, 0]);
    attachH(m, 'body', mb => ell(mb, [0, 0.05, 0], [0.26, 0.22, 0.26], BZ.gy2, 6, 4));
    attachH(m, 'wingL', mb => {
      for (let i = 0; i < 8; i++) {
        const d = [s * (0.4 + i * 0.13), -1, 0.05 - i * 0.04], L = 2.2 - Math.abs(i - 3) * 0.12;
        mb.blade([0, 0, 0], d, L, 0.5, 0.05, i % 2 ? '#a0b040' : '#6a8a3a', XY(d), '#f0e880');
        mb.blade(V.add([0, 0, 0.02], V.scale(V.norm(d), 0.15)), d, L * 0.9, 0.1, 0.03, BZ.au, XY(d));
      }
    });
    m.onPose = (mm) => { mm.root.pos[2] *= 0.3; const w = mm.b('wingL'); w.rot[2] *= 0.3; };
    m.height = 2.3; m.lungeScale = 0.1;
    return CR.anchor(m, 'bizarro_sephiroth', [s * 2.35, 1.5, 0.1]);
  }
  reg('bizarro_sephiroth_d', (a) => bizarroMagic(a, -1));
  reg('bizarro_sephiroth_e', (a) => bizarroMagic(a, 1));

  // Safer·Sephiroth: pale muscular angel with a golden double halo and star, hovering high. A billowing white
  // feather-cloud robe below the chest breaks into two great white plume masses (violet only at the tips) that
  // stream down and out like legs; one great wing of layered black, crimson and gold feathers on his right side;
  // small white-and-gold wing clusters at the hips
  reg('safer_sephiroth', (a) => {
    const m = rig(a); m.floats = true;
    const Sk = '#d8b8a8', Sk2 = '#b09080', Hr = '#e8e8f4', Wf = '#ecebf6', Wf2 = '#dcd8ee', Lv = '#b0a0e0', Vi = '#6a3ab0', Au = '#e8d080', Bk = '#2a2030', Cr = '#7a2040';
    m.bone('body', 'root', [0, 4.7, 0]);
    m.bone('head', 'body', [0, 1.25, 0.05]);
    m.bone('armL', 'body', [0.45, 1.05, 0], [-0.4, 0, 0.9]); m.bone('armR', 'body', [-0.45, 1.05, 0], [-0.9, 0, -0.6]);
    m.bone('wingL', 'body', [0.35, 1.0, -0.2]); m.bone('wingR', 'body', [-0.35, 1.0, -0.2]);
    m.bone('tail', 'body', [0, 0.05, 0]);
    attachH(m, 'body', mb => {
      mb.loft([{ y: 0.3, rx: 0.3, rz: 0.24 }, { y: 0.65, rx: 0.36, rz: 0.26 }, { y: 1.0, rx: 0.5, rz: 0.3 }, { y: 1.15, rx: 0.2, rz: 0.16 }], { sides: 10, color: Sk });
      [1, -1].forEach(s => { ell(mb, [s * 0.2, 0.9, 0.2], [0.18, 0.12, 0.1], Sk2, 6, 4); ell(mb, [s * 0.45, 1.02, 0], [0.16, 0.14, 0.16], Sk, 6, 4); });
      for (let i = 0; i < 3; i++) [1, -1].forEach(s => ell(mb, [s * 0.09, 0.65 - i * 0.12, 0.23], [0.08, 0.05, 0.04], Sk2, 5, 3));
      // billowing feather-cloud robe around the waist
      for (let i = 0; i < 9; i++) { const an = (i / 9) * PI * 2; ell(mb, [C(an) * 0.42, 0.3 + (i % 2) * 0.08, S(an) * 0.34], [0.36, 0.3, 0.32], i % 2 ? Wf : Wf2, 6, 4); }
      ell(mb, [0, 0.12, 0], [0.62, 0.34, 0.5], Wf, 8, 5);
      // small white-and-gold wing clusters at the hips
      [1, -1].forEach(s => { for (let i = 0; i < 5; i++) mb.blade([s * 0.55, 0.2, -0.15], [s * (1 - i * 0.1), -0.2 + i * 0.25, -0.35], 0.9 - i * 0.08, 0.2, 0.03, i % 2 ? Au : '#e0ecd0', XY([s * (1 - i * 0.1), -0.2 + i * 0.25, 0])); });
    });
    attachH(m, 'head', mb => {
      ell(mb, [0, 0.13, 0.02], [0.12, 0.15, 0.13], Sk, 7, 5);
      mb.sphere(0, 0.18, -0.02, 0.14, 0.14, 0.14, Hr, 8, 5, true, null, 3);
      tube(mb, bez([0, 0.25, -0.08], [0.1, 0.5, -0.1], [0.05, 0.8, 0.0], 4), (t) => 0.08 * (1 - t) + 0.01, Hr, 5);
      // double halo + star
      [[0, 0.95, -0.15, 0.62], [0.25, 0.75, -0.1, 0.5]].forEach(([x, y, z, r]) => { const pts = []; for (let i = 0; i <= 14; i++) { const an = (i / 14) * PI * 2; pts.push([x + C(an) * r, y + S(an) * r, z]); } tube(mb, pts, 0.035, Au, 4, { cap: false }); });
      for (let i = 0; i < 8; i++) { const an = (i / 8) * PI * 2; mb.blade([0, 1.15, -0.14], [C(an), S(an), 0], i % 2 ? 0.14 : 0.24, 0.05, 0.01, '#fff0b0', XY([C(an), S(an), 0])); }
    });
    attachH(m, 'head', mb => eyes(mb, 0.045, 0.15, 0.12, 0.016, '#60ff90'), { unlit: true });
    const arm = mesh(mb => { limb(mb, [[0, 0, 0], [0, -0.4, 0.05], [0, -0.75, 0.12]], 0.09, 0.07, Sk, 6); ell(mb, [0, -0.8, 0.14], [0.07, 0.09, 0.06], Sk2, 5, 4); });
    m.attach('armL', arm); m.attach('armR', arm);
    attachH(m, 'wingR', mb => {   // the great wing on his right: long black primaries, crimson secondaries, gold coverts
      const arm0 = [[0, 0, 0], [-0.6, 0.6, -0.2], [-1.4, 1.3, -0.3], [-2.5, 2.0, -0.3]];
      tube(mb, arm0, [0.12, 0.1, 0.08, 0.03], Bk, 5);
      for (let i = 0; i < 12; i++) { const t = i / 11, b = L3([-0.3, 0.3, -0.2], [-2.45, 1.95, -0.3], t), d = [-0.25 - t * 0.95, -0.95 + t * 1.15, -0.15]; mb.blade(b, d, 1.5 + t * 1.3, 0.72, 0.03, Bk, XY(d), '#4a3a5a'); }   // primaries fanning from hanging to pointing out
      for (let i = 0; i < 9; i++) { const t = i / 8, b = L3([-0.4, 0.4, -0.15], [-2.2, 1.95, -0.25], t), d = [-0.2 - t * 0.6, -0.9 + t * 1.1, -0.1]; mb.blade(V.add(b, [0, 0, 0.05]), d, 1.0 + t * 0.7, 0.6, 0.03, Cr, XY(d), '#a03050'); }   // crimson secondaries
      for (let i = 0; i < 7; i++) { const t = i / 6, b = L3([-0.5, 0.5, -0.1], [-2.0, 1.8, -0.2], t), d = [-0.4 + t * 0.2, 0.6 + t * 0.3, 0.05]; mb.blade(V.add(b, [0, 0, 0.1]), d, 0.6 + t * 0.25, 0.26, 0.03, Au, XY(d)); }   // gold coverts standing up along the arm
    });
    attachH(m, 'tail', mb => {   // two great plume masses streaming down and out like legs, white with violet tips
      [1, -1].forEach(s => {
        for (let i = 0; i < 9; i++) {
          const k = i / 8, d = V.norm([s * (0.25 + k * 0.75), -1 + k * 0.45, 0.1 + (i % 3) * 0.08]), L = 3.3 - k * 1.0 + (i % 2) * 0.3;
          mb.blade([s * (0.2 + k * 0.15), -0.05 - (i % 3) * 0.06, 0.05 + (i % 2) * 0.1], d, L, 0.7 - k * 0.2, 0.06, i % 3 === 1 ? Wf2 : Wf, XY(d), i % 2 ? Lv : Vi);
        }
      });
      for (let i = 0; i < 5; i++) { const an = -PI * 0.3 + (i / 4) * PI * 0.6; mb.blade([C(an) * 0.15, -0.2, S(an) * 0.1 + 0.1], V.norm([C(an) * 0.3, -1, 0.2]), 2.4, 0.5, 0.05, Wf2, null, Lv); }   // central plumes
    });
    m.height = 8.2; m.lungeScale = 0.2; return m;
  });

  // Sephiroth (final one-on-one): his battle model with the Masamune drawn
  reg('sephiroth_final', (a) => {
    const m = FF7.chars3d.build('sephiroth', { style: 'battle' });
    m.showWeapon(true); m.enemyHuman = true; m.play('battle'); m.scale = 1.7;
    return m;
  });
})();
