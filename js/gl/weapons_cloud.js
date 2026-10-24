// Cloud's swords for the battle model: the other 15 besides the Buster Sword (WEAPON.buster in cast_models.js), shaped
// after the PS1 battle weapons in references/battle models/ (look only: length against the Buster, blade outline,
// guard shape and colour blocks were measured from renders; everything here is built procedurally). Same convention
// as WEAPON.buster: built along -y from the grip (the fist at the origin, the pommel just above it), blade flat in the
// plane the grip's roll turns, s = 1 in battle. Ids match js/data/weapons.js. C3.withWeapon() puts the equipped weapon
// on a party preset (js/battle/battle.js). Loaded after cast_models.js.
(function () {
  const U = FF7.util, V = FF7.V3;
  const C3 = FF7.chars3d;
  const sh = U.shade;
  const WEAPON = C3.WEAPON, GRIP = C3.GRIP;
  const LEN = 1.245;   // WEAPON.buster from the pommel to the tip at s = 1; the other lengths are scaled from it

  // ================================================================== kit
  // Each weapon is laid out in a frame taken from its reference: f = 0 at the pommel end .. 1 at the tip, x across the
  // blade (+ = the point and the cutting edge; `sword` turns it to match the Buster), z = thickness; f and x are
  // fractions of the weapon's length.
  // k = length relative to the Buster Sword.
  const frame = (s, k) => { const L = LEN * k * s, y0 = 0.08 * s; return { L, y: f => y0 - f * L }; };
  // tri / quad (3-4 points; repeated points are dropped) wound to face away from `ctr`
  function face(mb, pts, c, ctr) {
    const q = pts.filter((p, i) => { const n = pts[(i + 1) % pts.length]; return Math.abs(p[0] - n[0]) + Math.abs(p[1] - n[1]) + Math.abs(p[2] - n[2]) > 1e-9; });
    if (q.length < 3) return;
    const n = [0, 0, 0], m = [0, 0, 0];
    q.forEach((p, i) => { const r = q[(i + 1) % q.length]; n[0] += (p[1] - r[1]) * (p[2] + r[2]); n[1] += (p[2] - r[2]) * (p[0] + r[0]); n[2] += (p[0] - r[0]) * (p[1] + r[1]); for (let k = 0; k < 3; k++) m[k] += p[k] / q.length; });
    if (V.dot(n, V.sub(m, ctr)) < 0) q.reverse();
    if (q.length === 3) mb.tri(q[0], q[1], q[2], c); else mb.quad(q[0], q[1], q[2], q[3], c);
  }
  // Blade from the guard to the tip. rows: [f, xBack, xEdge, o?], o = { rw: half-width of a flat along the ridge,
  // xr: ridge position (default `ridge` of the way from the back), c: colours from this row on }. Section: back edge,
  // bevel, (flat), bevel, edge; the ridge half-thickness th thins out where the blade narrows. col = [back bevel,
  // edge bevel, flat]. Capped at the guard end, and at the tip unless it closes to a point.
  function blade(mb, F, rows, th, col, ridge = 0.5) {
    let c = typeof col === 'string' ? [col, sh(col, -0.12)] : col;
    const R = rows.map(r => {
      const o = r[3] || {}, L = F.L, xb = r[1] * L, xe = r[2] * L, y = F.y(r[0]);
      const xr = o.xr != null ? o.xr * L : xb + (xe - xb) * ridge, rw = (o.rw || 0) * L, t = Math.min(th * L, (xe - xb) * 0.3);
      if (o.c) c = o.c;
      return { c, B: [xb, y, 0], E: [xe, y, 0], F0: [xr - rw, y, t], F1: [xr + rw, y, t], K0: [xr - rw, y, -t], K1: [xr + rw, y, -t], M: [xr, y, 0] };
    });
    for (let i = 0; i < R.length - 1; i++) {
      const p = R[i], q = R[i + 1], m = V.scale(V.add(p.M, q.M), 0.5), [ca, cb, cf] = p.c;
      face(mb, [p.B, q.B, q.F0, p.F0], ca, m); face(mb, [p.F0, q.F0, q.F1, p.F1], cf || ca, m); face(mb, [p.F1, q.F1, q.E, p.E], cb, m);
      face(mb, [p.B, q.B, q.K0, p.K0], sh(ca, -0.1), m); face(mb, [p.K0, q.K0, q.K1, p.K1], sh(cf || ca, -0.1), m); face(mb, [p.K1, q.K1, q.E, p.E], sh(cb, -0.1), m);
    }
    const cap = (p, inner) => { const cc = sh(p.c[0], -0.25); face(mb, [p.B, p.F0, p.K0], cc, inner); face(mb, [p.F0, p.F1, p.K1, p.K0], cc, inner); face(mb, [p.F1, p.E, p.K1], cc, inner); };
    cap(R[0], R[1].M);
    const e = R[R.length - 1]; if (e.E[0] - e.B[0] > 1e-6) cap(e, R[R.length - 2].M);
  }
  // round grip / pommel along the grip line: rings [f, r, colour (to the next ring), x]; the guard end is left open
  function rod(mb, F, rings, sides = 6, capEnd = false) {
    mb.loft(rings.map(r => ({ y: F.y(r[0]), rx: r[1] * F.L, rz: r[1] * F.L, x: (r[3] || 0) * F.L, color: r[2] })), { sides, capTop: rings[0][1] > 0.004, capBottom: capEnd });
  }
  // flat pyramid (horn, quillon, fin, tooth) in the blade plane from (f0, x0) to (f1, x1): w = base width, t = thickness
  function spike(mb, F, f0, x0, f1, x1, w, t, c, tc) {
    const a = [x0 * F.L, F.y(f0), 0], d = V.sub([x1 * F.L, F.y(f1), 0], a), len = V.len(d), n = V.scale(d, 1 / len);
    mb.blade(a, n, len, w * F.L, t * F.L, c, [-n[1], n[0], 0], tc);
  }
  // box centred on (f, x): h along the blade, w across it, t thick
  const box = (mb, F, f, x, h, w, t, c) => mb.box(x * F.L, F.y(f), 0, w * F.L, h * F.L, t * F.L, c);
  // thin round bar between two points of the blade plane
  const bar = (mb, F, f0, x0, f1, x1, r, c) => mb.sweep([[x0 * F.L, F.y(f0), 0], [x1 * F.L, F.y(f1), 0]], r * F.L, { sides: 4, color: c, capStart: false, capEnd: false });
  // flat plate in the blade plane through convex outline points [f, x], t thick
  function plate(mb, F, pts, t, c) {
    const p = pts.map(q => [q[1] * F.L, F.y(q[0])]);
    let a = 0; p.forEach((q, i) => { const r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; });
    mb.panel(a < 0 ? p.reverse() : p, 0, t * F.L, c);
  }
  // decal on one bevel of a plain (diamond-section) blade, both faces: points [f, x, hw, t, xr] with the bevel's width
  // hw (ridge to edge), ridge height t and ridge position xr (default 0) there; raised a hair above the surface
  function decal(mb, F, pts, c) {
    [1, -1].forEach(sd => face(mb, pts.map(p => [p[1] * F.L, F.y(p[0]), sd * (p[3] * (1 - Math.abs(p[1] - (p[4] || 0)) / p[2]) + 0.004) * F.L]), c, [0, F.y(pts[0][0]), -sd]));
  }
  // flat diamond outline (Heaven's Cloud's ornaments), centre (f, x), radius r, bar width bw, both faces
  function ring4(mb, F, f, x, r, bw, c) {
    const cx = x * F.L, cy = F.y(f), e = 0.003 * F.L;
    const P = (k, rr, z) => [cx + Math.cos(k * Math.PI / 2) * rr * F.L, cy + Math.sin(k * Math.PI / 2) * rr * F.L, z];
    [e, -e].forEach(z => { for (let k = 0; k < 4; k++) face(mb, [P(k, r, z), P(k + 1, r, z), P(k + 1, r - bw, z), P(k, r - bw, z)], c, [cx, cy, -z * 10]); });
  }
  const gem = (mb, F, f, x, rx, ry, rz, c) => mb.sphere(x * F.L, F.y(f), 0, rx * F.L, ry * F.L, rz * F.L, c, 4, 2);
  // everything is laid out in the Buster's blade plane (see WEAPON.buster). The layouts put the point and the cutting
  // edge on +x, but the Buster's point is on its spine side (-x), so each sword is also turned half about its length
  // (-PI/2 rather than the Buster's PI/2): the edge then faces the same way as the Buster's in Cloud's grip. Before,
  // every other sword was held edge-up, 'backwards'.
  const sword = (fn) => (mb, s) => { mb.push(); mb.rotate(0, -Math.PI / 2, 0); fn(mb, s); mb.pop(); };

  // ================================================================== the swords
  WEAPON.buster_sword = WEAPON.buster;
  WEAPON.mythril_saber = sword((mb, s) => {   // straight double-edged blade, green grip, long cross-guard with red-tipped ends
    const F = frame(s, 0.776);
    rod(mb, F, [[0, 0.02, '#b4bab8'], [0.06, 0.0145, '#557064'], [0.275, 0.0185]]);
    box(mb, F, 0.285, 0, 0.03, 0.05, 0.05, '#8c8c98');
    [-1, 1].forEach(k => { spike(mb, F, 0.285, k * 0.02, 0.29, k * 0.128, 0.035, 0.035, '#a8a8b6'); spike(mb, F, 0.288, k * 0.115, 0.29, k * 0.142, 0.018, 0.02, '#b01c1c'); });
    blade(mb, F, [[0.3, -0.035, 0.035, { c: ['#7088a8', '#5a7090'] }], [0.345, -0.036, 0.036, { c: ['#c8d2d2', '#a8b4b6', '#7c92b4'] }], [0.37, -0.056, 0.056, { rw: 0.02 }], [0.84, -0.045, 0.045, { rw: 0.016 }], [1, 0, 0]], 0.02);
  });
  WEAPON.hardedge = sword((mb, s) => {   // short cleaver: bent grip, square block guard, blade flaring to a square end, red fuller
    const F = frame(s, 0.671);
    rod(mb, F, [[0, 0.027, '#7a5a3e', 0.02], [0.07, 0.023, '#8e8488', 0.002], [0.29, 0.02, null, 0]]);
    box(mb, F, 0.305, 0, 0.04, 0.062, 0.062, '#7a6e1c');
    box(mb, F, 0.375, -0.005, 0.09, 0.147, 0.098, '#707070');
    [1, -1].forEach(z => face(mb, [[0.345, -0.06], [0.405, -0.06], [0.405, 0.05], [0.345, 0.05]].map(p => [p[1] * F.L, F.y(p[0]), z * 0.05 * F.L]), '#3a3a3a', [0, F.y(0.375), 0]));
    blade(mb, F, [[0.42, -0.058, 0.067], [0.68, -0.081, 0.09], [1, -0.088, 0.132]], 0.03, ['#a4a8a8', '#b8bebe']);
    [-0.02, 0.02].forEach(dx => decal(mb, F, [[0.425, 0.0045, 0.0625, 0.03, 0.0045], [0.425, 0.0045 + dx, 0.0625, 0.03, 0.0045], [0.58, 0.0045, 0.0765, 0.03, 0.0045]], '#6d1515'));   // red fuller
  });
  WEAPON.butterfly_edge = sword((mb, s) => {   // single edge with a clipped point and saw teeth by the guard, hooked guard
    const F = frame(s, 0.829);
    rod(mb, F, [[0, 0.019, '#252525'], [0.025, 0.018, '#7b2b2b'], [0.3, 0.018]]);
    bar(mb, F, 0.295, 0.025, 0.295, -0.085, 0.011, '#4c6a62'); bar(mb, F, 0.295, -0.085, 0.262, -0.112, 0.011, '#4c6a62');
    blade(mb, F, [[0.3, -0.027, 0.027, { c: ['#6a6e6e', '#585c5c'] }], [0.35, -0.04, 0.042, { c: ['#9aa4a2', '#c2c9c8'] }], [0.78, -0.044, 0.047], [0.87, -0.02, 0.031, { c: ['#b8c0be', '#dfe6e4'] }], [1, 0.023, 0.023]], 0.018);
    for (let i = 0; i < 4; i++) spike(mb, F, 0.41 + i * 0.055, 0.038, 0.385 + i * 0.055, 0.053, 0.035, 0.012, '#a8b0ae');
  });
  WEAPON.enhance_sword = sword((mb, s) => {   // gold-edged blade with a silver core, bronze petal guard, green stone
    const F = frame(s, 0.875);
    rod(mb, F, [[0, 0.016, '#b0b0b0'], [0.025, 0.0145, '#6a7080'], [0.28, 0.0145]]);
    box(mb, F, 0.3, 0, 0.022, 0.17, 0.035, '#a89060');
    [-1, 1].forEach(k => spike(mb, F, 0.3, k * 0.02, 0.235, k * 0.085, 0.05, 0.02, '#8a7448', '#c4b070'));
    gem(mb, F, 0.3, 0, 0.022, 0.024, 0.03, '#58b0a0');
    blade(mb, F, [[0.31, -0.05, 0.05, { rw: 0.012 }], [0.36, -0.0375, 0.0375, { rw: 0.013 }], [0.88, -0.0375, 0.0375, { rw: 0.013 }], [1, 0, 0]], 0.016, ['#c4b488', '#ad9a6a', '#b8bccc']);
  });
  WEAPON.organics = sword((mb, s) => {   // wavy green blade under a grey spine, back-swept barb, gold collar
    const F = frame(s, 0.966);
    rod(mb, F, [[0, 0.026, '#9a9ea0'], [0.03, 0.025, '#4e525a'], [0.24, 0.018, '#c2a600'], [0.275, 0.02]]);
    blade(mb, F, [[0.27, -0.07, 0.068], [0.42, -0.05, 0.035], [0.62, -0.05, 0.015], [0.8, -0.03, 0.002], [0.9, -0.01, -0.01]], 0.024, ['#4d7a70', '#62948a']);
    blade(mb, F, [[0.38, -0.135, -0.135], [0.46, -0.134, -0.05], [0.62, -0.128, -0.03], [0.8, -0.09, 0], [1, 0.022, 0.022]], 0.014, ['#a8aab2', '#8c8e96']);
    spike(mb, F, 0.67, 0.005, 0.58, 0.116, 0.1, 0.02, '#4c7b75', '#3a6a60');
  });
  WEAPON.crystal_sword = sword((mb, s) => {   // pale crystal blade, spiked pommel, open triangular prongs on the guard
    const F = frame(s, 0.911);
    rod(mb, F, [[0, 0.002, '#9a9aa6'], [0.04, 0.0135, '#3e3e7c'], [0.29, 0.0125]]);
    box(mb, F, 0.305, 0, 0.04, 0.1, 0.052, '#b4c4e0');
    [-1, 1].forEach(k => { bar(mb, F, 0.29, k * 0.033, 0.29, k * 0.112, 0.008, '#8c9cc0'); bar(mb, F, 0.29, k * 0.112, 0.42, k * 0.044, 0.008, '#a8b8d8'); bar(mb, F, 0.42, k * 0.044, 0.29, k * 0.033, 0.008, '#8c9cc0'); });
    blade(mb, F, [[0.3, -0.04, 0.04], [0.86, -0.04, 0.04], [0.96, -0.027, 0.027], [1, 0, 0]], 0.022, ['#9494c8', '#c8c8ec']);
  });
  WEAPON.force_stealer = sword((mb, s) => {   // purple faceted blade with barbs, green horned guard, magenta stone
    const F = frame(s, 0.788);
    rod(mb, F, [[0, 0.021, '#5e5280'], [0.33, 0.021]]);
    plate(mb, F, [[0.29, 0], [0.37, -0.075], [0.46, 0], [0.37, 0.075]], 0.05, '#4a5a3e');
    [-1, 1].forEach(k => { spike(mb, F, 0.37, k * 0.03, 0.31, k * 0.18, 0.1, 0.05, '#5e6a4c', '#8a9870'); spike(mb, F, 0.31, k * 0.17, 0.42, k * 0.2, 0.045, 0.03, '#6e7a5c', '#9aa884'); });
    gem(mb, F, 0.345, 0, 0.042, 0.05, 0.05, '#a03c7c');
    const P = ['#6a5494', '#4e3e70'], M = ['#9a4480', '#7a3468'];
    blade(mb, F, [[0.44, -0.074, 0.074, { c: P }], [0.62, -0.058, 0.058, { c: M }], [0.67, -0.068, 0.068, { c: P }], [0.72, -0.05, 0.05, { c: M }], [0.745, -0.094, 0.094, { c: P }], [1, 0, 0]], 0.016);
  });
  WEAPON.rune_blade = sword((mb, s) => {   // lavender blade flaring to a rounded end, two dark grooves, disc guard with quillons
    const F = frame(s, 0.861), L = F.L;
    rod(mb, F, [[0, 0.013, '#0a4a6a'], [0.255, 0.016, '#b8a040'], [0.28, 0.016]]);
    mb.push(); mb.translate(0, F.y(0.315), 0); mb.rotate(Math.PI / 2, 0, 0);
    mb.loft([{ y: -0.03 * L, rx: 0.062 * L, rz: 0.062 * L }, { y: 0.03 * L, rx: 0.062 * L, rz: 0.062 * L }], { sides: 8, color: '#5a5464' });
    mb.pop();
    [-1, 1].forEach(k => box(mb, F, 0.33, k * 0.113, 0.022, 0.1, 0.02, '#8c8c96'));
    blade(mb, F, [[0.35, -0.05, 0.05], [0.4, -0.047, 0.047], [0.84, -0.079, 0.079, { c: ['#b4b4e4', '#9c9cd0'] }], [0.9, -0.12, 0.12], [0.935, -0.132, 0.132], [0.97, -0.09, 0.09], [1, -0.01, 0.01]], 0.016, ['#9e9acc', '#7e78a8']);
    [-1, 1].forEach(k => decal(mb, F, [[0.4, k * 0.015, 0.047, 0.016], [0.4, k * 0.021, 0.047, 0.016], [0.84, k * 0.036, 0.079, 0.016], [0.84, k * 0.03, 0.079, 0.016]], '#343434'));
  });
  WEAPON.murasame = sword((mb, s) => {   // katana: purple-wrapped grip, square tsuba, curved blade going blue toward the point
    const F = frame(s, 0.846);
    rod(mb, F, [[0, 0.018, '#a69b51'], [0.02, 0.0175, '#503162'], [0.275, 0.0175]]);
    box(mb, F, 0.28, 0, 0.018, 0.1, 0.1, '#6e707c');
    box(mb, F, 0.3, 0, 0.022, 0.038, 0.026, '#a69b51');
    blade(mb, F, [[0.29, -0.0165, 0.0165], [0.56, -0.0205, 0.0125], [0.76, -0.0105, 0.0205, { c: ['#61728a', '#4c5c70'] }], [0.88, 0.0045, 0.0365], [0.94, 0.0175, 0.0475], [1, 0.0575, 0.0575]], 0.007, ['#b9c1c8', '#8a92a0'], 0.3);
  });
  WEAPON.nail_bat = sword((mb, s) => {   // wooden bat, grey barrel with nails driven through it
    const F = frame(s, 0.656), L = F.L;
    rod(mb, F, [[0, 0.03, '#8b7761'], [0.012, 0.04, '#8b7761'], [0.035, 0.026, '#a39174'], [0.4, 0.034, '#7a5a44'], [0.54, 0.054, '#8a8e94'], [0.94, 0.058, '#a29477'], [1, 0.03]], 6, true);
    [[0.61, -1, 0, -0.5], [0.69, 0.2, 1, 0.3], [0.79, 1, 0, 0.45], [0.88, -0.3, -1, 0.2]].forEach(([f, ax, az, lean]) => {   // nail: head out, shank in
      const d = V.norm([ax, -lean, az]), r = 0.105 * L, h = V.add([0, F.y(f), 0], V.scale(d, r));
      mb.blade(h, V.scale(d, -1), r * 0.85, 0.008 * L, 0.008 * L, '#8a8c94');
      mb.blade(V.sub(h, V.scale(d, 0.004 * L)), d, 0.006 * L, 0.028 * L, 0.028 * L, '#a8aab2');
    });
  });
  WEAPON.yoshiyuki = sword((mb, s) => {   // long curved katana: dark red grip, tall narrow tsuba
    const F = frame(s, 0.945);
    rod(mb, F, [[0, 0.016, '#a1a547'], [0.02, 0.016, '#4d294c'], [0.235, 0.016]]);
    box(mb, F, 0.24, 0, 0.02, 0.112, 0.054, '#5a5650');
    box(mb, F, 0.26, 0, 0.02, 0.04, 0.026, '#c8c0a0');
    blade(mb, F, [[0.25, -0.016, 0.019], [0.56, -0.013, 0.022], [0.72, -0.005, 0.03], [0.84, 0.014, 0.051], [0.93, 0.044, 0.07], [1, 0.087, 0.087]], 0.008, ['#bcbcb7', '#8a8e87'], 0.3);
  });
  WEAPON.apocalypse = sword((mb, s) => {   // crimson twisted blade forking into two grey-edged prongs, olive diamond guard
    const F = frame(s, 0.834);
    rod(mb, F, [[0, 0.016, '#657774'], [0.25, 0.016]]);
    plate(mb, F, [[0.225, 0], [0.265, -0.14], [0.3, 0], [0.265, 0.14]], 0.045, '#868446');
    blade(mb, F, [[0.26, -0.12, 0.12], [0.36, -0.1, 0.1], [0.44, -0.05, 0.05], [0.5, -0.1, 0.1], [0.62, -0.075, 0.075]], 0.022, ['#8c0061', '#730045']);
    [-1, 1].forEach(k => {
      spike(mb, F, 0.3, k * 0.1, 0.225, k * 0.15, 0.05, 0.02, '#850057', '#6e004d');
      spike(mb, F, 0.5, k * 0.09, 0.42, k * 0.125, 0.04, 0.018, '#850057', '#6e004d');
      blade(mb, F, k < 0 ? [[0.58, -0.095, -0.01], [0.8, -0.08, -0.03], [1, -0.049, -0.049]] : [[0.58, 0.01, 0.095], [0.8, 0.03, 0.08], [1, 0.05, 0.05]], 0.016, k < 0 ? ['#929b9d', '#8c0061'] : ['#8c0061', '#929b9d']);
    });
  });
  WEAPON.heavens_cloud = sword((mb, s) => {   // white blade flaring at the root, olive-gold grip, diamond-ring ornaments
    const F = frame(s, 0.966);
    rod(mb, F, [[0, 0.002, '#978d49'], [0.04, 0.0135, '#7a6e10'], [0.19, 0.0125, '#9a9ab4'], [0.25, 0.03]]);
    box(mb, F, 0.258, 0, 0.016, 0.15, 0.05, '#3a3a40');
    [-1, 1].forEach(k => {
      [0.165, 0.232].forEach(f => ring4(mb, F, f, k * 0.089, 0.019, 0.007, '#ab9d16'));
      [1, -1].forEach(z => face(mb, [[0.184, -0.003], [0.213, -0.003], [0.213, 0.003], [0.184, 0.003]].map(p => [(k * 0.089 + p[1]) * F.L, F.y(p[0]), z * 0.003 * F.L]), '#ab9d16', [0, F.y(0.2), -z]));
    });
    blade(mb, F, [[0.265, -0.072, 0.072], [0.33, -0.05, 0.05], [0.88, -0.041, 0.041], [1, 0, 0]], 0.016, ['#c8c6c2', '#e0deda']);
  });
  WEAPON.ragnarok = sword((mb, s) => {   // dark blade with a silver rim and an arrowhead point, gold guard of four horns
    const F = frame(s, 1.058);
    rod(mb, F, [[0.02, 0.015, '#3a3048'], [0.2, 0.019]]);
    [-1, 1].forEach(k => spike(mb, F, 0.025, k * 0.005, 0, k * 0.035, 0.03, 0.02, '#9a904a'));
    plate(mb, F, [[0.2, 0], [0.3, -0.065], [0.46, 0], [0.3, 0.065]], 0.06, '#b4a774');
    [-1, 1].forEach(k => { spike(mb, F, 0.3, k * 0.04, 0.19, k * 0.13, 0.06, 0.035, '#958653', '#cdbf85'); spike(mb, F, 0.32, k * 0.05, 0.44, k * 0.11, 0.06, 0.035, '#958653', '#cdbf85'); });
    [1, -1].forEach(z => face(mb, [[0.27, 0], [0.32, -0.044], [0.32, 0.044]].map(p => [p[1] * F.L, F.y(p[0]), z * 0.032 * F.L]), '#2a2440', [0, F.y(0.3), 0]));
    blade(mb, F, [[0.42, -0.061, 0.061, { rw: 0.045 }], [0.82, -0.047, 0.047, { rw: 0.034 }], [0.85, -0.054, 0.054, { rw: 0.03, c: ['#b2b2bf', '#9393a5', '#2a343c'] }], [1, 0, 0]], 0.012, ['#b2b2bf', '#9393a5', '#46525c']);
  });
  WEAPON.ultima_weapon = sword((mb, s) => {   // long silver blade with a violet core, winged guard with red fins
    const F = frame(s, 1.113);
    rod(mb, F, [[0, 0.002, '#ae9e59'], [0.03, 0.013, '#2e2e31'], [0.22, 0.013]]);
    [-1, 1].forEach(k => {
      spike(mb, F, 0.27, k * 0.03, 0.17, k * 0.1, 0.045, 0.03, '#6a6470');
      spike(mb, F, 0.2, k * 0.085, 0.14, k * 0.125, 0.06, 0.02, '#adab8e', '#8a886e');
      [[0.235, 0.198, 0.158], [0.25, 0.232, 0.16], [0.26, 0.273, 0.145]].forEach(([f0, f1, x1]) => spike(mb, F, f0, k * 0.07, f1, k * x1, 0.03, 0.014, '#a04a62', '#d07a90'));
    });
    gem(mb, F, 0.265, 0, 0.03, 0.04, 0.035, '#804351');
    blade(mb, F, [[0.26, -0.085, 0.085, { rw: 0.01 }], [0.45, -0.078, 0.078, { rw: 0.045 }], [0.72, -0.065, 0.065], [0.82, -0.05, 0.05], [1, 0, 0]], 0.024, ['#c8cbd8', '#dcdfea', '#6a50b8']);
  });

  // ================================================================== grips + equipping
  const CLOUD = ['buster_sword', 'mythril_saber', 'hardedge', 'butterfly_edge', 'enhance_sword', 'organics', 'crystal_sword', 'force_stealer',
    'rune_blade', 'murasame', 'nail_bat', 'yoshiyuki', 'apocalypse', 'heavens_cloud', 'ragnarok', 'ultima_weapon'];
  CLOUD.forEach(id => { if (!GRIP[id]) GRIP[id] = GRIP.buster; });   // all held like the Buster Sword
  // The battle model shows the equipped weapon: withWeapon('cloud', 'murasame') -> { base: 'cloud', weapon: 'murasame', ... }.
  // The app comes back unchanged when that weapon id has no builder, the preset already holds that mesh, or the preset's
  // own weapon is one battle/actions.js reads by name (shot vs slash, ranged). The preset's attack animation is kept.
  const BY_NAME = ['gun', 'gunarm', 'shuriken', 'fist'];
  C3.withWeapon = function (app, weaponId) {
    const p = typeof app === 'string' ? C3.PRESETS[app] : null;
    const w = weaponId && Object.prototype.hasOwnProperty.call(WEAPON, weaponId) ? WEAPON[weaponId] : null;
    if (!p || !w || p.rig || w === WEAPON[p.weapon] || BY_NAME.includes(p.weapon)) return app;
    return { base: app, weapon: weaponId, attackAnim: C3.attackAnim(p) };
  };
})();
