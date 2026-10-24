// Summon models (PS1 FF7 look): dedicated low-poly, vertex-coloured models for the 17 summons,
// used during summon animations.  FF7.summons3d[id]() -> FF7.Model (faces +z, metres, ground y=0).
// Rigs use the generic enemy bone names (root body head jaw tail wingL wingR armL armR legFL legFR
// legBL legBR, serpent seg0..seg5, biped legs thighL/thighR) so the stock e_idle/e_attack/e_cast clips
// animate them. Every mesh is authored in model space: part() offsets it by its bone's rest position
// (all rest rotations are zero).
//   choco_mog  -> Chocobo ridden by Mog; FF7.summons3d.fat_chocobo() (or choco_mog({ fat: true }))
//                 gives the rare Fat Chocobo variant.
//   knights_of_round -> 13 distinct knights on one rig: knights_of_round({ knight: i }) or m.setKnight(i)
//                 (0..11 the knights, 12 the crowned King); summon_seq.js picks one per strike.
(function () {
  const U = FF7.util, V = FF7.V3, MB = FF7.MeshBuilder;
  const sh = U.shade, mix = U.mix;
  const S = Math.sin, C = Math.cos, PI = Math.PI;
  const SM = FF7.summons3d = FF7.summons3d || {};

  // ------------------------------------------------------------------ toolkit
  const X = (p, s) => [p[0] * s, p[1], p[2]];                 // mirror a point to the other side
  const rig = () => FF7.creatures.base(new FF7.Model(), {});
  function abs(m, name) { let b = m.bones[name], p = [0, 0, 0]; while (b) { p = V.add(p, b.offset); b = b.parent; } return p; }
  // bone at an absolute (model-space) position
  function boneAt(m, name, parent, p) { const q = parent ? abs(m, parent) : [0, 0, 0]; return m.bone(name, parent, V.sub(p, q)); }
  // Build a mesh in model space and attach it to a bone
  function part(m, bone, fn, meshOpts, drawOpts) {
    const p = abs(m, bone);
    const mb = new MB(); mb.translate(-p[0], -p[1], -p[2]); fn(mb);
    if (!mb.vertexCount) return null;
    const mesh = mb.build(meshOpts);
    m.attach(bone, mesh, null, drawOpts);
    return mesh;
  }
  // rider placement: authored coords -> seated/scaled coords (keeps bone pivots and meshes in sync)
  function seatXf(seat, k, lift) {
    const f = (p) => [seat[0] + (p[0] - seat[0]) * k + lift[0], seat[1] + (p[1] - seat[1]) * k + lift[1], seat[2] + (p[2] - seat[2]) * k + lift[2]];
    f.apply = (mb) => { mb.translate(seat[0] + lift[0], seat[1] + lift[1], seat[2] + lift[2]); mb.scale(k); mb.translate(-seat[0], -seat[1], -seat[2]); };
    return f;
  }
  function perp(t, up) {
    let n = V.sub(up, V.scale(t, V.dot(up, t)));
    if (V.len(n) < 1e-4) { n = V.sub([0, 0, 1], V.scale(t, t[2])); if (V.len(n) < 1e-4) n = V.sub([1, 0, 0], V.scale(t, t[0])); }
    return V.norm(n);
  }
  // Tube along a polyline. rad: number | [rx, ry] | array per point | fn(t, i).  ry is along the
  // frame normal N (starts as `up`), rx along the binormal. col: colour | fn(t, angle, i, k) with
  // angle measured from N (0 = "up" side, PI = "belly" side).
  function tube(mb, pts, rad, col, o = {}) {
    const n = o.sides || 6, L = pts.length;
    const T = pts.map((p, i) => V.norm(V.sub(pts[Math.min(L - 1, i + 1)], pts[Math.max(0, i - 1)])));
    let N = perp(T[0], o.up || [0, 1, 0]);
    const rings = [];
    for (let i = 0; i < L; i++) {
      if (i > 0) N = perp(T[i], N);
      const B = V.cross(T[i], N);
      const t = L > 1 ? i / (L - 1) : 0;
      const r = typeof rad === 'function' ? rad(t, i) : o.pair ? rad[i] : rad;
      const rx = Array.isArray(r) ? r[0] : r, ry = Array.isArray(r) ? r[1] : r;
      const ring = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * PI * 2 + (o.phase || 0);
        const ca = C(a), sa = S(a);
        const p = V.add(pts[i], V.add(V.scale(N, ca * ry), V.scale(B, sa * rx)));
        const nn = V.norm(V.add(V.scale(N, ca / Math.max(ry, 1e-3)), V.scale(B, sa / Math.max(rx, 1e-3))));
        ring.push({ p, n: nn });
      }
      rings.push({ ring, c: pts[i], T: T[i], r: Math.max(rx, ry) });
    }
    const colAt = (i, k) => typeof col === 'function' ? col(L > 1 ? (i + 0.5) / (L - 1) : 0, ((k + 0.5) / n) * PI * 2 + (o.phase || 0), i, k) : col;
    for (let i = 0; i < L - 1; i++) for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      const a = rings[i].ring[k], b = rings[i].ring[k2], c = rings[i + 1].ring[k2], d = rings[i + 1].ring[k];
      const cc = colAt(i, k);
      if (o.flat) mb.quad(a.p, b.p, c.p, d.p, cc); else mb.quad(a.p, b.p, c.p, d.p, cc, null, [a.n, b.n, c.n, d.n]);
    }
    const cap = (R, end) => {
      if (R.r < 1e-3) return;
      const cc = typeof col === 'function' ? col(end ? 1 : 0, 0, end ? L - 1 : 0, 0) : col;
      for (let k = 0; k < n; k++) {
        const k2 = (k + 1) % n;
        if (end) mb.tri(R.c, R.ring[k].p, R.ring[k2].p, cc);
        else mb.tri(R.c, R.ring[k2].p, R.ring[k].p, cc);
      }
    };
    if (o.cap0 !== false) cap(rings[0], false);
    if (o.cap1 !== false) cap(rings[L - 1], true);
    return mb;
  }
  // radius list helper for tube(): tube(mb, pts, R([..]), ...) always treated per point
  const R = (arr) => (t, i) => arr[i];
  // scale the stock clips' arm rotations (for arms authored already raised or outstretched)
  function dampArms(m, k) {
    const prev = m.onPose;
    m.onPose = (mm) => { for (const n of ['armL', 'armR']) { const b = mm.bones[n]; if (b) for (let i = 0; i < 3; i++) b.rot[i] = b.rest[i] + (b.rot[i] - b.rest[i]) * k; } if (prev) prev(mm); };
  }
  // sample a Catmull-Rom curve through control points (n samples per span)
  function curve(ctrl, n = 3) {
    const out = [];
    for (let i = 0; i < ctrl.length - 1; i++) {
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
      for (let s = 0; s < n; s++) {
        const t = s / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1, 2].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out.push(ctrl[ctrl.length - 1].slice());
    return out;
  }
  const ball = (mb, c, r, col, seg = 8, rings = 6, fn) => mb.sphere(c[0], c[1], c[2], Array.isArray(r) ? r[0] : r, Array.isArray(r) ? r[1] : r, Array.isArray(r) ? r[2] : r, col, seg, rings, true, fn);
  // double-sided triangle / quad (membranes, cloth, fins)
  function tri2(mb, a, b, c, col, col2) { mb.tri(a, b, c, col); mb.tri(a, c, b, col2 || sh(col, -0.2)); }
  // double-sided triangle whose `col` side faces +z (toward a viewer in front of the model)
  function tri2z(mb, a, b, c, col, col2) { const n = V.cross(V.sub(b, a), V.sub(c, a)); if (n[2] < 0) { const t = b; b = c; c = t; } tri2(mb, a, b, c, col, col2); }
  function quad2(mb, a, b, c, d, col, col2) { tri2(mb, a, b, c, col, col2); tri2(mb, a, c, d, col, col2); }
  // strip of double-sided quads between two polylines
  function sheet(mb, top, bot, col, col2) {
    for (let i = 0; i < top.length - 1; i++) {
      const c1 = typeof col === 'function' ? col(i / (top.length - 1)) : col;
      const c2 = typeof col2 === 'function' ? col2(i / (top.length - 1)) : col2;
      quad2(mb, top[i], bot[i], bot[i + 1], top[i + 1], c1, c2);
    }
  }
  // cone/horn/claw from base toward a point
  function spike(mb, base, tip, r, col, sides = 4, tipCol) {
    const d = V.sub(tip, base);
    mb.spike(base, d, V.len(d), r, sides, col);
  }
  // curved tapering horn through control points
  function horn(mb, ctrl, r0, col, colTip, sides = 5, n = 3) {
    const pts = curve(ctrl, n);
    tube(mb, pts, (t) => r0 * (1 - t * 0.92), colTip ? (t) => mix(col, colTip, t) : col, { sides, cap1: false });
  }
  // A hand: palm + fingers pointing along dir, back of the hand toward `up` (default: the side
  // axis is model x, so a hanging hand shows its knuckles to the front). curl bends the fingers
  // toward the palm. o: { side, fingers, curl, claw, clawLen, thumbSide, spread, fat }
  function hand(mb, wrist, dir, size, col, o = {}) {
    const d = V.norm(dir);
    const side = perp(d, o.side || [1, 0, 0]);
    const up = V.norm(V.cross(d, side));
    const fat = o.fat || 1;
    const palm = V.add(wrist, V.scale(d, size * 0.42));
    tube(mb, [V.sub(wrist, V.scale(d, size * 0.08)), palm, V.add(palm, V.scale(d, size * 0.12))], R([[size * 0.26, size * 0.15 * fat], [size * 0.34, size * 0.17 * fat], [size * 0.3, size * 0.14 * fat]]), col, { sides: 6, up });
    const nf = o.fingers || 4, curl = o.curl != null ? o.curl : 0.5, spread = o.spread || 0.3;
    const fr = size * 0.075 * fat;
    for (let i = 0; i < nf; i++) {
      const u = nf > 1 ? i / (nf - 1) - 0.5 : 0;
      const b = V.add(V.add(palm, V.scale(d, size * 0.08)), V.scale(side, u * size * 0.5));
      const fd = V.norm(V.add(d, V.scale(side, u * spread)));
      const len = size * (0.3 - Math.abs(u) * 0.08);
      const m1 = V.add(b, V.scale(V.norm(V.add(fd, V.scale(up, -curl * 0.4))), len));
      const tipD = V.norm(V.add(fd, V.scale(up, -curl * 1.2)));
      const tip = V.add(m1, V.scale(tipD, len * 0.85));
      tube(mb, [b, m1, tip], R([fr, fr * 0.9, fr * 0.7]), col, { sides: 4, up });
      if (o.claw) spike(mb, tip, V.add(tip, V.scale(V.norm(V.add(tipD, V.scale(up, -curl * 0.5))), size * (o.clawLen || 0.25))), fr * 0.75, o.claw, 4);
    }
    if (o.thumb !== false) {
      const ts = o.thumbSide || 1;
      const b = V.add(wrist, V.add(V.scale(d, size * 0.18), V.scale(side, ts * size * 0.24)));
      const m1 = V.add(b, V.add(V.scale(d, size * 0.16), V.add(V.scale(side, ts * size * 0.12), V.scale(up, -size * 0.1))));
      const tip = V.add(m1, V.add(V.scale(d, size * 0.14), V.scale(up, -size * 0.12)));
      tube(mb, [b, m1, tip], R([fr * 1.1, fr, fr * 0.75]), col, { sides: 4, up });
      if (o.claw) spike(mb, tip, V.add(tip, V.scale(V.norm(V.add(d, V.scale(up, -0.5))), size * (o.clawLen || 0.25) * 0.8)), fr * 0.7, o.claw, 4);
    }
  }
  // Dragon/bat wing on the +x side (s=1) or mirrored (s=-1): arm spar shoulder->elbow->wrist,
  // finger spars from the wrist to tips, membrane fanned between them and back to the body.
  function batWing(mb, s, w) {
    const P = (p) => X(p, s);
    const sh0 = P(w.shoulder), el = P(w.elbow), wr = P(w.wrist);
    const rb = w.r || 0.12;
    tube(mb, [sh0, el, wr], R([rb, rb * 0.8, rb * 0.65]), w.bone, { sides: 5 });
    ball(mb, wr, rb * 0.8, w.bone, 5, 4);
    const tips = w.tips.map(P);
    const knuck = w.knuckles ? w.knuckles.map(P) : null;
    tips.forEach((t, i) => {
      const pts = knuck ? [wr, knuck[i], t] : [wr, t];
      tube(mb, pts, (tt) => rb * 0.5 * (1 - tt * 0.85), w.bone, { sides: 4 });
    });
    if (w.thumb) { const th = P(w.thumb); spike(mb, wr, th, rb * 0.35, w.claw || '#e8e0d0', 4); }
    // membranes between consecutive fingers (scalloped trailing edge)
    const memC = w.mem, memC2 = w.mem2 || sh(w.mem, -0.25);
    const edge = [];
    const pull = w.scallop != null ? w.scallop : 0.22;
    for (let i = 0; i < tips.length - 1; i++) {
      const a = knuck ? knuck[i] : wr, b = knuck ? knuck[i + 1] : wr;
      const mid = V.lerp(V.lerp(tips[i], tips[i + 1], 0.5), wr, pull);
      tri2z(mb, wr, tips[i], mid, typeof memC === 'function' ? memC(i) : memC, memC2);
      tri2z(mb, wr, mid, tips[i + 1], typeof memC === 'function' ? memC(i) : memC, memC2);
      if (knuck) { tri2z(mb, wr, a, tips[i], typeof memC === 'function' ? memC(i) : memC, memC2); tri2z(mb, wr, tips[i + 1], b, typeof memC === 'function' ? memC(i) : memC, memC2); }
    }
    // leading membrane (shoulder-elbow-wrist-first tip) and trailing membrane back to the body
    tri2z(mb, sh0, el, wr, typeof memC === 'function' ? memC(-1) : memC, memC2);
    if (w.root) {
      const rt = P(w.root), last = tips[tips.length - 1];
      const mid = V.lerp(V.lerp(last, rt, 0.5), wr, pull);
      const cc = typeof memC === 'function' ? memC(tips.length) : memC;
      tri2z(mb, wr, last, mid, cc, memC2); tri2z(mb, wr, mid, rt, cc, memC2); tri2z(mb, sh0, wr, rt, cc, memC2);
    }
    if (w.claw) tips.forEach(t => { /* spar tip hooks */ });
  }
  // simple face: eyes (+brows) on a head centred at c facing +z
  function eyes(mb, c, dx, dy, dz, r, col, pupil) {
    for (const s of [1, -1]) {
      ball(mb, [c[0] + s * dx, c[1] + dy, c[2] + dz], r, col, 6, 4);
      if (pupil) ball(mb, [c[0] + s * dx, c[1] + dy, c[2] + dz + (Array.isArray(r) ? r[2] : r) * 0.7], (Array.isArray(r) ? r[0] : r) * 0.5, pupil, 5, 3);
    }
  }

  // ================================================================== SHIVA
  // ---- Shiva: full-figured ice queen (pale blue skin, pink halter and loincloth, blue-to-violet legs), teal hair
  // with a long ponytail from a violet tie that arcs back and hangs down behind her, curling into a loop near the
  // bottom; a lilac shawl draped as a band behind the back from elbow to elbow (the ends ride on the arm bones).
  SM.shiva = function () {
    const m = rig();
    const SK = '#c4dcf4', SKd = '#8fb4e0', PINK = '#e890dc', PINKd = '#b060b0', HAIR = '#3cc0a4', SHAWL = '#a878ec', SHAWLl = '#d4b4ff';
    boneAt(m, 'body', 'root', [0, 2.95, 0]);
    boneAt(m, 'head', 'body', [0, 4.38, 0.02]);
    boneAt(m, 'tail', 'head', [0, 5.02, -0.12]);          // pony-tail
    boneAt(m, 'armL', 'body', [0.42, 4.18, -0.02]); boneAt(m, 'armR', 'body', [-0.42, 4.18, -0.02]);
    boneAt(m, 'thighL', 'body', [0.19, 2.82, 0]); boneAt(m, 'thighR', 'body', [-0.19, 2.82, 0]);
    // draped shawl band through centre points (double-sided strip, `w` tall, sagging `sag` at the ends)
    const band = (mb, pts, w, twist) => {
      const top = [], bot = [];
      pts.forEach((p, i) => { const t = i / (pts.length - 1), hw = w(t), tz = twist ? twist(t) : 0; top.push(V.add(p, [0, hw, -tz])); bot.push(V.add(p, [0, -hw, tz])); });
      sheet(mb, top, bot, (t) => mix(SHAWL, SHAWLl, Math.abs(t * 2 - 1) * 0.7), sh(SHAWL, -0.28));
    };
    part(m, 'body', mb => {
      mb.loft([
        { y: 2.58, rx: 0.26, rz: 0.19, color: PINK },
        { y: 2.8, rx: 0.44, rz: 0.26, color: PINK },
        { y: 3.02, rx: 0.42, rz: 0.25, color: PINK },
        { y: 3.1, rx: 0.37, rz: 0.22, color: SK },
        { y: 3.36, rx: 0.27, rz: 0.18, color: SK },
        { y: 3.62, rx: 0.3, rz: 0.19, color: SK },
        { y: 3.95, rx: 0.36, rz: 0.21, color: SK },
        { y: 4.18, rx: 0.4, rz: 0.19, color: SK },
        { y: 4.3, rx: 0.15, rz: 0.11, color: SK },
      ], { sides: 10, color: SK });
      // bust (pink halter top) and crossing straps
      for (const s of [1, -1]) {
        ball(mb, [s * 0.16, 3.86, 0.1], [0.2, 0.18, 0.18], PINK, 8, 5, (i, j) => j > 3 ? PINKd : PINK);
        tube(mb, [[s * 0.15, 3.98, 0.24], [-s * 0.05, 4.2, 0.14], [-s * 0.1, 4.36, 0.02]], 0.03, PINK, { sides: 4 });
      }
      for (const s of [1, -1]) ball(mb, [s * 0.26, 2.78, -0.03], [0.2, 0.24, 0.24], PINK, 7, 4);   // full hips
      // pink loincloth front flap, side sash ribbons
      quad2(mb, [-0.22, 2.98, 0.24], [0.22, 2.98, 0.24], [0.12, 2.3, 0.28], [-0.12, 2.3, 0.28], PINK, PINKd);
      mb.tri([-0.12, 2.3, 0.28], [0.12, 2.3, 0.28], [0, 2.16, 0.28], PINK);
      tube(mb, [[0.42, 2.98, 0.05], [0.5, 2.5, 0.08], [0.56, 2.0, 0.1], [0.6, 1.72, 0.1]], 0.035, PINK, { sides: 4 });
      tube(mb, [[-0.42, 2.98, 0.05], [-0.48, 2.55, 0.02], [-0.52, 2.15, 0.0]], 0.035, PINK, { sides: 4 });
      // shawl: the band across the back, shoulder blade to shoulder blade
      band(mb, curve([[0.46, 3.86, -0.2], [0.3, 3.9, -0.32], [0, 3.92, -0.36], [-0.3, 3.9, -0.32], [-0.46, 3.86, -0.2]], 2), () => 0.17, (t) => 0.06);
    });
    part(m, 'head', mb => {
      tube(mb, [[0, 4.25, 0], [0, 4.5, 0.02]], 0.1, SK, { sides: 6 });
      ball(mb, [0, 4.7, 0.04], [0.2, 0.25, 0.22], SK, 8, 6);
      ball(mb, [0, 4.55, 0.13], [0.11, 0.1, 0.1], SK, 6, 4);                 // jaw/chin
      eyes(mb, [0, 4.68, 0.2], 0.075, 0, 0.02, [0.04, 0.02, 0.02], '#503080');
      ball(mb, [0, 4.84, 0.22], 0.025, '#9040c0', 5, 3);                       // forehead jewel
      ball(mb, [0, 4.54, 0.22], [0.04, 0.015, 0.02], '#8050a0', 5, 3);         // lips
      // teal hair cap swept up to the tie, locks framing the face
      ball(mb, [0, 4.8, -0.02], [0.225, 0.21, 0.245], HAIR, 8, 5, (i, j) => j > 2 ? sh(HAIR, -0.2) : HAIR);
      for (let i = 0; i < 5; i++) { const a = (i / 4 - 0.5) * 2.2; mb.blade([S(a) * 0.17, 4.84, C(a) * 0.14], [S(a) * 0.3, -1, 0.35], 0.22, 0.1, 0.03, HAIR); }
      for (const s of [1, -1]) mb.blade([s * 0.2, 4.78, 0.08], [s * 0.15, -1, 0.1], 0.42, 0.12, 0.04, HAIR, [0, 0, 1], sh(HAIR, -0.15));
      tube(mb, [[0, 4.92, -0.1], [0, 5.06, -0.14]], 0.065, '#8040c0', { sides: 6 });          // violet tie
    });
    part(m, 'tail', mb => {
      // flat ribbon ponytail: up from the tie, arcing back, hanging down behind, a loop near the bottom
      const pts = curve([[0, 5.04, -0.13], [0.06, 5.34, -0.32], [0.16, 5.3, -0.68], [0.26, 4.75, -0.86], [0.3, 4.0, -0.84], [0.3, 3.3, -0.76], [0.38, 2.85, -0.74],
        [0.6, 2.72, -0.84], [0.66, 2.98, -1.0], [0.46, 3.08, -0.98], [0.36, 2.86, -0.9], [0.44, 2.5, -0.84]], 2);
      tube(mb, pts, (t) => [0.17 - t * 0.08, 0.075 - t * 0.03], (t) => mix(HAIR, '#58c8f0', t * 0.8), { sides: 5, up: [0, 0, 1] });
    });
    const arm = (s) => part(m, s > 0 ? 'armL' : 'armR', mb => {
      const up = s < 0;
      const sh0 = [s * 0.42, 4.18, -0.02], el = up ? [s * 0.97, 4.2, 0.05] : [s * 0.64, 3.52, -0.02], wr = up ? [s * 1.07, 4.78, 0.22] : [s * 0.82, 3.0, 0.18];
      ball(mb, sh0, 0.14, SK, 6, 4);
      tube(mb, [sh0, V.lerp(sh0, el, 0.5), el, V.lerp(el, wr, 0.5), wr], R([0.125, 0.11, 0.085, 0.08, 0.062]), SK, { sides: 6 });
      hand(mb, wr, up ? [s * 0.2, -0.2, 1] : [s * 0.3, -1, 0.35], 0.28, SK, { curl: up ? 0.9 : 0.35, thumbSide: -s, spread: 0.35, side: up ? [1, 0, 0] : undefined });
      // shawl end: from the shoulder blade over the elbow, draping down past it
      const e2 = V.add(el, [0, -0.02, -0.14]);
      band(mb, curve([[s * 0.44, 3.86, -0.2], V.lerp([s * 0.44, 3.86, -0.2], e2, 0.5), e2, V.add(e2, [s * 0.3, -0.22, -0.06]), V.add(e2, [s * 0.46, -0.62, -0.1])], 2), (t) => 0.17 * (1 - t * 0.8) + 0.01, (t) => 0.06 + t * 0.05);
    });
    arm(1); arm(-1);
    const leg = (s) => part(m, s > 0 ? 'thighL' : 'thighR', mb => {
      const pts = [[s * 0.2, 2.85, 0], [s * 0.18, 2.3, 0.03], [s * 0.14, 1.6, 0.04], [s * 0.12, 1.1, -0.02], [s * 0.1, 0.55, -0.04], [s * 0.1, 0.3, 0.02], [s * 0.1, 0.12, 0.08]];
      tube(mb, pts, R([0.24, 0.2, 0.13, 0.14, 0.085, 0.075, 0.04]), (t) => t < 0.35 ? mix('#78d4fa', '#40a8f4', t / 0.35) : mix('#40a8f4', '#8a44e4', Math.min(1, (t - 0.35) / 0.35)), { sides: 7, up: [0, 0, 1] });
    });
    leg(1); leg(-1);
    m.floats = true; m.height = 5.4; m.lungeScale = 1.2;
    return m;
  };
  // ================================================================== IFRIT
  // ---- Ifrit: hunched olive-khaki demon. Upper body (torso, head, arms) authored upright, then pitched ~20 deg
  // forward about the hips (hunch / HX); head thrust forward with a muzzle and jaw; thick horns sweeping back
  // and out with curled tips; a purple mane of blade spikes from the crown down the spine; red elbow fins;
  // bent digitigrade legs in purple wraps.
  SM.ifrit = function () {
    const m = rig();
    const SK = '#b8a040', SKl = '#d0bc5c', SKd = '#7a6824', HORN = '#6a4018', HORNt = '#d8a050', RED = '#c81830', WRAP = '#8a76b8', BAND = '#2a8078', MANE = '#4a3a8a', MANEl = '#7a66c8', CLAW = '#2a2a50';
    const HIP = 3.0, PITCH = 0.35;
    const hunch = (p) => { const y = p[1] - HIP, z = p[2]; return [p[0], HIP + y * C(PITCH) - z * S(PITCH), y * S(PITCH) + z * C(PITCH)]; };
    const HX = (mb) => { mb.translate(0, HIP, 0); mb.rotate(PITCH, 0, 0); mb.translate(0, -HIP, 0); };
    boneAt(m, 'body', 'root', [0, 3.1, 0]);
    boneAt(m, 'head', 'body', hunch([0, 5.1, 0.3]));
    boneAt(m, 'jaw', 'head', hunch([0, 5.3, 0.62]));
    boneAt(m, 'armL', 'body', hunch([0.92, 4.72, 0])); boneAt(m, 'armR', 'body', hunch([-0.92, 4.72, 0]));
    boneAt(m, 'thighL', 'body', [0.3, 3.0, 0]); boneAt(m, 'thighR', 'body', [-0.3, 3.0, 0]);
    const skinFn = (t, a) => C(a) < -0.6 ? SKd : C(a) > 0.6 ? SKl : SK;
    part(m, 'body', mb => {
      // belt + loincloth hang straight
      mb.loft([{ y: 2.96, rx: 0.5, rz: 0.37 }, { y: 3.1, rx: 0.5, rz: 0.37 }], { sides: 10, color: '#2a4850' });
      quad2(mb, [-0.3, 3.0, 0.38], [0.3, 3.0, 0.38], [0.22, 2.0, 0.5], [-0.24, 2.0, 0.48], '#8a5222', '#5a3212');
      quad2(mb, [-0.3, 3.0, -0.36], [-0.2, 2.15, -0.46], [0.22, 2.15, -0.44], [0.3, 3.0, -0.36], '#8a5222', '#5a3212');
      mb.push(); HX(mb);
      mb.loft([
        { y: 2.85, rx: 0.42, rz: 0.31 }, { y: 3.05, rx: 0.48, rz: 0.34 }, { y: 3.4, rx: 0.44, rz: 0.31, z: 0.02 },
        { y: 3.85, rx: 0.6, rz: 0.4, z: 0.05 }, { y: 4.3, rx: 0.84, rz: 0.48, z: 0.08 }, { y: 4.72, rx: 0.92, rz: 0.46, z: 0.04 },
        { y: 5.0, rx: 0.56, rz: 0.36, z: 0.04 }, { y: 5.2, rx: 0.24, rz: 0.24, z: 0.14 },
      ], { sides: 10, color: SK });
      for (const s of [1, -1]) {
        ball(mb, [s * 0.35, 4.42, 0.34], [0.4, 0.27, 0.14], SKl, 8, 4);                   // pecs
        ball(mb, [s * 0.92, 4.74, 0.0], [0.4, 0.38, 0.4], SK, 8, 5, (i, j) => j < 2 ? SKl : SK);   // deltoids
        ball(mb, [s * 0.46, 5.02, -0.1], [0.36, 0.22, 0.3], SK, 6, 4);                     // traps
        for (let i = 0; i < 3; i++) ball(mb, [s * 0.14, 3.95 - i * 0.2, 0.38 - i * 0.02], [0.13, 0.08, 0.06], SKl, 5, 3);   // abs
        for (let i = 0; i < 3; i++) mb.blade([s * 1.0, 4.95 - i * 0.12, -0.2], [s * 0.5, 0.7 - i * 0.3, -0.7], 0.6 - i * 0.1, 0.24, 0.05, RED, null, '#ff6070');   // shoulder fins
      }
      for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; mb.blade([0, 4.3, 0.47], [S(a), C(a), 0.1], 0.2, 0.07, 0.02, RED); }   // red chest mark
      // purple mane of blade spikes down the spine
      for (let i = 0; i < 6; i++) for (const s of [1, -1]) { const t = i / 5; mb.blade([s * 0.1, 5.15 - t * 1.45, -0.28 - S(t * PI) * 0.14], [s * 0.35, 0.6 - t * 0.25, -1], 1.0 - t * 0.45, 0.42 - t * 0.14, 0.06, (i + (s > 0 ? 1 : 0)) % 2 ? MANE : sh(MANE, 0.12), [1, 0, 0.25 * s], MANEl); }
      mb.pop();
    });
    part(m, 'head', mb => {
      HX(mb);
      tube(mb, [[0, 4.95, 0.08], [0, 5.22, 0.34]], [0.26, 0.24], SK, { sides: 6, pair: true });   // thick neck, thrust forward
      ball(mb, [0, 5.44, 0.38], [0.27, 0.29, 0.28], SK, 8, 6);
      tube(mb, [[0, 5.4, 0.5], [0, 5.34, 0.8], [0, 5.27, 0.97]], R([[0.21, 0.17], [0.17, 0.13], [0.09, 0.08]]), (t, a) => C(a) < -0.4 ? SKd : SK, { sides: 7 });  // muzzle
      ball(mb, [0, 5.3, 0.96], [0.09, 0.06, 0.05], SKd, 5, 3);                         // nose
      ball(mb, [0, 5.56, 0.6], [0.26, 0.07, 0.11], SKd, 6, 3);                          // brow ridge
      eyes(mb, [0, 5.49, 0.63], 0.12, 0, 0, [0.055, 0.03, 0.03], '#ff2020');
      for (const s of [1, -1]) { spike(mb, [s * 0.1, 5.24, 0.86], [s * 0.1, 5.08, 0.9], 0.028, '#f0f0e0', 3); spike(mb, [s * 0.16, 5.26, 0.74], [s * 0.18, 5.1, 0.78], 0.03, '#f0f0e0', 3); }
      // purple mane from the crown
      for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 1.5; mb.blade([S(a) * 0.14, 5.64, 0.26 + C(a) * 0.04], [S(a) * 0.6, 0.9, -0.7], 0.85 - Math.abs(a) * 0.18, 0.3, 0.06, i % 2 ? MANE : sh(MANE, 0.12), [C(a), 0, -S(a)], MANEl); }
      // great horns: thick at the base, sweeping back and out, tips curling down
      for (const s of [1, -1]) horn(mb, [[s * 0.14, 5.6, 0.4], [s * 0.3, 5.95, 0.26], [s * 0.55, 6.35, 0.0], [s * 0.92, 6.62, -0.35], [s * 1.32, 6.58, -0.62], [s * 1.58, 6.28, -0.64], [s * 1.62, 5.96, -0.45]], 0.36, HORN, HORNt, 6, 2);
    });
    part(m, 'jaw', mb => {
      HX(mb);
      tube(mb, [[0, 5.2, 0.52], [0, 5.16, 0.78], [0, 5.18, 0.9]], R([[0.17, 0.07], [0.13, 0.06], [0.06, 0.04]]), SKd, { sides: 6 });
      ball(mb, [0, 5.22, 0.76], [0.12, 0.04, 0.12], '#701018', 5, 3);
      for (const s of [1, -1]) spike(mb, [s * 0.1, 5.2, 0.84], [s * 0.1, 5.36, 0.86], 0.024, '#f0f0e0', 3);
    });
    const arm = (s) => part(m, s > 0 ? 'armL' : 'armR', mb => {
      HX(mb);
      const sh0 = [s * 0.95, 4.7, 0], el = [s * 1.52, 3.95, -0.2], wr = [s * 1.66, 3.3, 0.42];
      tube(mb, [sh0, V.lerp(sh0, el, 0.45), el, V.lerp(el, wr, 0.4), wr], R([0.3, 0.34, 0.23, 0.28, 0.17]), skinFn, { sides: 7 });
      ball(mb, el, 0.22, SK, 6, 4);
      for (let i = 0; i < 4; i++) mb.blade(V.add(el, [s * 0.1, 0.15 - i * 0.14, -0.1]), [s * 0.8, 0.6 - i * 0.25, -0.5], 0.85 - i * 0.08, 0.28, 0.05, RED, null, '#ff6070');
      hand(mb, wr, [s * 0.2, -1, 0.55], 0.56, SK, { claw: CLAW, curl: 0.9, thumbSide: -s, clawLen: 0.24, spread: 0.5 });
    });
    arm(1); arm(-1);
    const leg = (s) => part(m, s > 0 ? 'thighL' : 'thighR', mb => {
      // digitigrade: thigh forward to a bent knee, shin back to a raised hock, long foot forward
      const hip = [s * 0.34, 3.0, 0], kn = [s * 0.6, 1.95, 0.62], hk = [s * 0.55, 0.7, -0.3], ball0 = [s * 0.55, 0.14, 0.18];
      tube(mb, [hip, V.lerp(hip, kn, 0.4), V.lerp(hip, kn, 0.8), kn], R([0.4, 0.43, 0.34, 0.26]), skinFn, { sides: 8, up: [0, 0, 1] });
      ball(mb, kn, 0.27, SK, 6, 4);
      tube(mb, [V.lerp(kn, hk, 0.08), V.lerp(kn, hk, 0.4), V.lerp(kn, hk, 0.78), hk], R([0.27, 0.3, 0.24, 0.19]), (t, a) => C(a) > -0.2 ? WRAP : sh(WRAP, -0.3), { sides: 8, up: [0, 0, 1] });
      for (const f of [0.14, 0.9]) tube(mb, [V.lerp(kn, hk, f - 0.04), V.lerp(kn, hk, f + 0.04)], f < 0.5 ? 0.3 : 0.22, BAND, { sides: 8, up: [0, 0, 1] });
      for (let i = 0; i < 3; i++) tube(mb, [V.lerp(kn, hk, 0.3 + i * 0.18), V.lerp(kn, hk, 0.33 + i * 0.18)], 0.3 - i * 0.03, '#3a2a48', { sides: 8, up: [0, 0, 1] });
      // furry hock tuft, long foot, clawed toes
      for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; mb.blade(V.add(hk, [S(a) * 0.16, -0.02, C(a) * 0.16]), [S(a), -0.6, C(a) - 0.3], 0.28, 0.14, 0.04, '#9a8030'); }
      tube(mb, [hk, ball0, V.add(ball0, [0, -0.06, 0.4])], R([0.18, 0.17, 0.13]), SK, { sides: 6 });
      for (let i = -1; i <= 1; i++) spike(mb, V.add(ball0, [i * 0.11, -0.05, 0.42]), V.add(ball0, [i * 0.15, -0.12, 0.7]), 0.05, CLAW, 4);
    });
    leg(1); leg(-1);
    m.height = 6.75; m.lungeScale = 1.5;
    return m;
  };
  // ================================================================== RAMUH
  SM.ramuh = function () {
    const m = rig();
    const ROBE = '#f0e8d4', ROBEd = '#cfc2a2', BLUE = '#2456c8', SK = '#e0b894', BEARD = '#eadcae', BEARDd = '#c4b080', GOLD = '#d8b030';
    boneAt(m, 'body', 'root', [0, 2.2, 0]);
    boneAt(m, 'head', 'body', [0, 4.05, 0.05]);
    boneAt(m, 'armL', 'body', [0.72, 3.85, 0]); boneAt(m, 'armR', 'body', [-0.72, 3.85, 0]);
    const robeFn = (t, a) => C(a) < -0.3 ? ROBEd : ROBE;
    part(m, 'body', mb => {
      // long robe (flared, pleated hem)
      mb.loft([
        { y: 0.0, rx: 1.12, rz: 0.9 }, { y: 0.4, rx: 1.02, rz: 0.84 }, { y: 1.5, rx: 0.86, rz: 0.66 },
        { y: 2.6, rx: 0.74, rz: 0.52 }, { y: 3.4, rx: 0.78, rz: 0.5 }, { y: 3.85, rx: 0.72, rz: 0.44 }, { y: 4.02, rx: 0.3, rz: 0.26 },
      ], { sides: 12, color: ROBE, capBottom: true });
      for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * PI * 2; mb.blade([S(a) * 1.04, 0.3, C(a) * 0.86], [S(a) * 0.2, -1, C(a) * 0.2], 0.32, 0.5, 0.05, i % 2 ? ROBE : ROBEd); }
      // blue front opening
      quad2(mb, [-0.14, 0.02, 0.92], [0.14, 0.02, 0.92], [0.06, 3.3, 0.53], [-0.06, 3.3, 0.53], BLUE, BLUE);
      // high flared collar (white outside, blue inside) around the back of the head
      for (let i = 0; i < 7; i++) {
        const a0 = PI * (-0.12 + i / 7 * 1.24), a1 = PI * (-0.12 + (i + 1) / 7 * 1.24);
        const p = (a, y, r) => [C(a) * r, y, -S(a) * r * 0.8 + 0.02];
        quad2(mb, p(a0, 3.92, 0.36), p(a1, 3.92, 0.36), p(a1, 4.6, 0.5), p(a0, 4.6, 0.5), BLUE, ROBE);
        quad2(mb, p(a0, 4.6, 0.5), p(a1, 4.6, 0.5), p(a1, 4.64, 0.53), p(a0, 4.64, 0.53), BLUE, BLUE);
      }
      // big prayer-bead necklace from the shoulders down over the robe, purple claw pendants
      const neck = [];
      for (let i = 0; i <= 16; i++) { const u = i / 16 * 2 - 1, v = 1 - u * u; neck.push([u * 0.66, 3.95 - v * 1.3, 0.3 + v * 0.38 + Math.abs(u) * 0.12]); }
      tube(mb, neck, 0.03, '#3a2414', { sides: 4 });
      neck.forEach((p, i) => {
        ball(mb, p, 0.09, i % 2 ? '#5a3418' : '#7a4a22', 5, 3);
        if (i % 2 === 0 && i > 0 && i < 16) {   // curved purple claw hanging from every other bead
          const sx = Math.sign(p[0]) || 1, b = V.add(p, [0, -0.06, 0.04]);
          tube(mb, [b, V.add(b, [sx * 0.05, -0.16, 0.06]), V.add(b, [sx * 0.01, -0.32, 0.1])], R([0.06, 0.04, 0.005]), '#7a3ad0', { sides: 4 });
        }
      });
    });
    part(m, 'head', mb => {
      tube(mb, [[0, 3.95, 0.04], [0, 4.2, 0.08]], 0.12, SK, { sides: 6 });
      ball(mb, [0, 4.36, 0.1], [0.19, 0.23, 0.21], SK, 8, 6);
      ball(mb, [0, 4.38, 0.29], [0.04, 0.07, 0.05], sh(SK, -0.1), 5, 3);          // nose
      eyes(mb, [0, 4.44, 0.26], 0.08, 0, 0, [0.035, 0.018, 0.02], '#4a8ae8');
      ball(mb, [0, 4.5, 0.25], [0.15, 0.03, 0.05], BEARD, 6, 3);                   // brows
      for (const s of [1, -1]) { tube(mb, curve([[s * 0.19, 4.32, 0.08], [s * 0.22, 4.2, 0.1], [s * 0.19, 4.12, 0.12], [s * 0.16, 4.2, 0.1]], 2), 0.018, GOLD, { sides: 4 }); ball(mb, [s * 0.14, 4.3, 0.22], [0.07, 0.08, 0.06], BEARD, 5, 3); }
      // moustache + the enormous beard down to the hem
      const bpts = [[0, 4.27, 0.27], [0, 4.08, 0.36], [0, 3.5, 0.56], [0, 2.6, 0.72], [0, 1.6, 0.84], [0, 0.75, 0.92]];
      tube(mb, [[-0.02, 4.3, 0.28], [0.13, 4.27, 0.3], [0.2, 4.15, 0.28]], 0.035, BEARD, { sides: 4 });
      tube(mb, [[0.02, 4.3, 0.28], [-0.13, 4.27, 0.3], [-0.2, 4.15, 0.28]], 0.035, BEARD, { sides: 4 });
      tube(mb, bpts, R([[0.1, 0.05], [0.2, 0.1], [0.3, 0.15], [0.32, 0.16], [0.26, 0.13], [0.02, 0.02]]), (t, a) => C(a) > 0 ? BEARD : BEARDd, { sides: 8, up: [0, 0, 1] });
      for (let i = 0; i < 5; i++) mb.blade([(i - 2) * 0.12, 1.0, 0.93], [(i - 2) * 0.08, -1, 0.05], 0.35, 0.12, 0.04, BEARD);
    });
    const arm = (s) => part(m, s > 0 ? 'armL' : 'armR', mb => {
      const sh0 = [s * 0.72, 3.85, 0];
      // wide bell sleeve with blue lining
      const top = [s * 0.95, 3.6, 0.1], bot = [s * 1.12, 1.7, 0.15];
      tube(mb, [sh0, top, V.lerp(top, bot, 0.5), bot], R([0.28, 0.36, 0.44, 0.56].map(r => [r * 0.8, r])), robeFn, { sides: 8, up: [1, 0, 0], cap1: false });
      tube(mb, [V.add(bot, [0, 0.02, 0]), V.add(bot, [0, 0.4, 0])], R([[0.44, 0.54], [0.2, 0.25]]), BLUE, { sides: 8, up: [1, 0, 0], cap0: false });
      // forearm + hand reaching out from the sleeve
      const wr = s > 0 ? [s * 1.22, 2.35, 0.55] : [s * 1.12, 2.45, 0.6];
      tube(mb, [[s * 1.1, 2.3, 0.1], wr], 0.09, SK, { sides: 5 });
      hand(mb, wr, s > 0 ? [0.3, -0.7, 0.6] : [0, 0.1, 1], 0.34, SK, { claw: '#3a6ad0', clawLen: 0.2, curl: s > 0 ? 0.4 : 1.5, thumbSide: -s, side: s > 0 ? [0, 0, 1] : [0, 1, 0] });
      ball(mb, [s * 0.78, 3.72, 0], [0.34, 0.26, 0.4], ROBE, 8, 5);
      if (s < 0) { // the staff in his right hand
        const x = -1.25, z = 0.72;
        tube(mb, [[x, 0.1, z], [x, 4.35, z]], 0.045, '#3a2a48', { sides: 5 });
        // gold crest: a collar, curved gold prongs cupping a blue orb (the sequence's lightning point)
        tube(mb, [[x, 4.3, z], [x, 4.5, z]], [0.07, 0.11], GOLD, { sides: 6, pair: true });
        ball(mb, [x, 4.68, z], 0.14, '#3a7aff', 8, 5, (i, j) => j < 2 ? '#a8d0ff' : '#3a7aff');
        for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2, c = S(a), d = C(a); tube(mb, curve([[x + c * 0.08, 4.5, z + d * 0.08], [x + c * 0.22, 4.62, z + d * 0.22], [x + c * 0.2, 4.84, z + d * 0.2], [x + c * 0.08, 4.94, z + d * 0.08]], 2), R([0.035, 0.035, 0.03, 0.025, 0.02, 0.02, 0.01]), GOLD, { sides: 4 }); }
        spike(mb, [x, 4.9, z], [x, 5.12, z], 0.04, GOLD, 4);
      }
    });
    arm(1); arm(-1);
    m.height = 5.1; m.lungeScale = 0.8;
    return m;
  };

  // ================================================================== TITAN
  SM.titan = function () {
    const m = rig();
    const SK = '#a8684a', SKl = '#c08060', SKd = '#7a4a34', GOLD = '#d8c048', GREEN = '#20a078', HAIR = '#e8e8ec';
    boneAt(m, 'body', 'root', [0, 3.5, 0]);
    const HD = [0, -0.12, 0.24];                                              // head sunk between the shoulders
    boneAt(m, 'head', 'body', V.add([0, 6.1, 0.55], HD));
    boneAt(m, 'jaw', 'head', V.add([0, 6.2, 0.9], HD));
    boneAt(m, 'armL', 'body', [1.95, 6.0, 0]); boneAt(m, 'armR', 'body', [-1.95, 6.0, 0]);
    boneAt(m, 'thighL', 'body', [0.72, 3.5, 0]); boneAt(m, 'thighR', 'body', [-0.72, 3.5, 0]);
    const skinFn = (t, a) => C(a) > 0.55 ? SKl : C(a) < -0.5 ? SKd : SK;
    part(m, 'body', mb => {
      mb.loft([
        { y: 3.2, rx: 0.95, rz: 0.72 }, { y: 3.6, rx: 1.08, rz: 0.78 }, { y: 4.3, rx: 1.02, rz: 0.78, z: 0.05 },
        { y: 5.0, rx: 1.42, rz: 0.94, z: 0.12 }, { y: 5.6, rx: 1.78, rz: 1.0, z: 0.15 }, { y: 6.1, rx: 1.72, rz: 0.94, z: 0.08 },
        { y: 6.55, rx: 0.98, rz: 0.72, z: -0.05 }, { y: 6.72, rx: 0.42, rz: 0.42, z: 0.05 },
      ], { sides: 12, color: SK });
      for (const s of [1, -1]) {
        ball(mb, [s * 0.62, 5.55, 0.72], [0.72, 0.52, 0.3], SKl, 8, 5);             // pecs
        ball(mb, [s * 1.98, 5.98, 0.0], [0.95, 0.9, 0.92], SK, 8, 6, (i, j) => j < 3 ? SKl : SK);   // huge shoulders
        ball(mb, [s * 1.0, 6.4, -0.18], [0.8, 0.5, 0.62], SK, 8, 5);              // traps, up round the low head
        for (let i = 0; i < 3; i++) ball(mb, [s * 0.28, 4.8 - i * 0.38, 0.8 - i * 0.03], [0.26, 0.17, 0.12], SKl, 6, 3);
      }
      // loincloth: belt of green fangs and grey stones, white cloth
      mb.loft([{ y: 3.45, rx: 1.12, rz: 0.84 }, { y: 3.65, rx: 1.12, rz: 0.84 }], { sides: 12, color: '#6a4a38' });
      for (let i = 0; i < 11; i++) {
        const a = (i / 10 - 0.5) * 2.6, p = [S(a) * 1.15, 3.52, C(a) * 0.86];
        if (i % 2) spike(mb, p, V.add(p, [0, -0.55, 0.08]), 0.1, GREEN, 4); else ball(mb, p, [0.13, 0.13, 0.08], '#8894a8', 5, 3);
      }
      quad2(mb, [-0.5, 3.42, 0.82], [0.5, 3.42, 0.82], [0.25, 2.3, 0.9], [-0.25, 2.3, 0.9], '#dcdcd4', '#a8a8a0');
      mb.tri([-0.25, 2.3, 0.9], [0.25, 2.3, 0.9], [0.05, 1.7, 0.95], '#dcdcd4');
      // tooth necklace
      const nk = [];
      for (let i = 0; i <= 10; i++) { const u = i / 10 * 2 - 1; nk.push([u * 0.8, 6.32 - (1 - u * u) * 0.52, 0.9 + (1 - u * u) * 0.28]); }
      tube(mb, nk, 0.035, '#402818', { sides: 4 });
      nk.forEach((p, i) => { if (i % 2) spike(mb, p, V.add(p, [0, -0.3, 0.06]), 0.07, GREEN, 4); else ball(mb, p, 0.07, '#a070d0', 5, 3); });
    });
    part(m, 'head', mb => {
      mb.translate(HD[0], HD[1], HD[2]);
      ball(mb, [0, 6.35, 0.75], [0.36, 0.42, 0.38], SK, 8, 6);
      ball(mb, [0, 6.5, 1.04], [0.34, 0.08, 0.12], SKd, 6, 3);                   // brow
      ball(mb, [0, 6.36, 1.1], [0.09, 0.12, 0.1], SKd, 5, 3);                    // nose
      eyes(mb, [0, 6.45, 1.08], 0.14, 0, 0, [0.05, 0.025, 0.03], '#d8e8ff');
      for (const s of [1, -1]) spike(mb, [s * 0.14, 6.18, 1.08], [s * 0.2, 6.4, 1.14], 0.04, '#f0ecd8', 3);   // tusks
      ball(mb, [0, 6.62, 0.62], [0.4, 0.3, 0.42], HAIR, 8, 5, (i, j) => j > 2 ? sh(HAIR, -0.2) : HAIR);  // white hair
      for (let i = 0; i < 5; i++) mb.blade([(i - 2) * 0.13, 6.8, 0.8], [(i - 2) * 0.1, 0.3, -1], 0.5, 0.18, 0.05, HAIR);
    });
    part(m, 'jaw', mb => { mb.translate(HD[0], HD[1], HD[2]); ball(mb, [0, 6.12, 0.98], [0.26, 0.14, 0.16], SK, 6, 4); ball(mb, [0, 6.1, 1.1], [0.14, 0.04, 0.04], '#401814', 5, 3); });
    const arm = (s) => part(m, s > 0 ? 'armL' : 'armR', mb => {
      const sh0 = [s * 2.05, 5.9, 0], el = [s * 2.55, 4.35, -0.2], wr = [s * 2.65, 3.05, 0.35];
      tube(mb, [sh0, V.lerp(sh0, el, 0.5), el, V.lerp(el, wr, 0.35), V.lerp(el, wr, 0.75), wr], R([0.69, 0.76, 0.58, 0.67, 0.55, 0.41]), skinFn, { sides: 8 });   // arms ~15% thicker
      ball(mb, el, 0.58, SK, 6, 4);
      tube(mb, [V.lerp(el, wr, 0.8), V.lerp(el, wr, 0.97)], 0.53, GOLD, { sides: 8 });   // gold arm band
      hand(mb, wr, [s * 0.15, -1, 0.3], 1.12, SK, { curl: 1.1, thumbSide: -s, fat: 1.35, spread: 0.4 });
    });
    arm(1); arm(-1);
    const leg = (s) => part(m, s > 0 ? 'thighL' : 'thighR', mb => {
      const hip = [s * 0.75, 3.5, 0], kn = [s * 1.28, 1.9, 0.5], an = [s * 1.3, 0.45, 0];
      tube(mb, [hip, V.lerp(hip, kn, 0.45), kn, V.lerp(kn, an, 0.35), V.lerp(kn, an, 0.75), an], R([0.8, 0.74, 0.48, 0.62, 0.48, 0.4]), skinFn, { sides: 9, up: [0, 0, 1] });
      ball(mb, kn, 0.5, SKl, 7, 5);
      tube(mb, [V.add(an, [0, 0.12, 0]), V.add(an, [0, -0.12, 0])], 0.48, GOLD, { sides: 8 });   // anklet
      mb.rbox(an[0], 0.2, 0.45, 0.8, 0.42, 1.5, SK, 0.35);                                     // foot
      for (let i = 0; i < 4; i++) ball(mb, [an[0] + (i - 1.5) * 0.17, 0.15, 1.2], [0.1, 0.1, 0.1], SKl, 5, 3);
    });
    leg(1); leg(-1);
    m.height = 7.0; m.lungeScale = 1.5;
    return m;
  };

  // ================================================================== CHOCO / MOG
  function chocoMog() {
    const m = rig();
    const Y = '#f4d020', Yl = '#fae668', Yd = '#c8a012', LEG = '#c8a040', LEGd = '#8a6a24', BEAK = '#eea020', MOG = '#f2dcea', MOGd = '#cfaec8';
    boneAt(m, 'body', 'root', [0, 1.95, 0]);
    boneAt(m, 'head', 'body', [0, 2.45, 0.62]);
    boneAt(m, 'tail', 'body', [0, 2.2, -0.82]);
    boneAt(m, 'wingL', 'body', [0.5, 2.25, 0.05]); boneAt(m, 'wingR', 'body', [-0.5, 2.25, 0.05]);
    boneAt(m, 'thighL', 'body', [0.3, 1.62, -0.05]); boneAt(m, 'thighR', 'body', [-0.3, 1.62, -0.05]);
    const MX = seatXf([0, 2.6, -0.15], 1.15, [0, 0.02, -0.05]);          // Mog, seated on the back
    boneAt(m, 'rider', 'body', MX([0, 2.62, -0.22]));
    boneAt(m, 'armL', 'rider', MX([0.24, 3.02, -0.18])); boneAt(m, 'armR', 'rider', MX([-0.24, 3.02, -0.18]));
    const yFn = (t, a) => C(a) < -0.5 ? Yl : Y;
    part(m, 'body', mb => {
      ball(mb, [0, 1.98, -0.08], [0.64, 0.6, 0.86], Y, 10, 7, (i, j) => j > 4 ? Yl : j < 2 ? sh(Y, -0.04) : Y);
      ball(mb, [0, 2.0, 0.5], [0.5, 0.5, 0.42], Y, 8, 5);                               // chest
      for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.2; mb.blade([S(a) * 0.4, 1.72, 0.62 + C(a) * 0.1], [S(a) * 0.5, -1, 0.5], 0.4, 0.22, 0.05, Yl); }   // chest fluff
      for (let i = 0; i < 6; i++) { const a = (i / 5 - 0.5) * 2.6; mb.blade([S(a) * 0.55, 1.5, -0.2 + C(a) * 0.1], [S(a) * 0.6, -1, -0.1], 0.35, 0.25, 0.05, Yd); } // thigh fluff
    });
    part(m, 'head', mb => {
      tube(mb, [[0, 2.2, 0.5], [0, 2.6, 0.72], [0, 2.92, 0.8]], R([0.34, 0.26, 0.22]), yFn, { sides: 7 });
      ball(mb, [0, 3.08, 0.84], [0.3, 0.3, 0.34], Y, 8, 6);
      // beak (upper + lower)
      tube(mb, [[0, 3.02, 1.08], [0, 2.98, 1.3], [0, 2.93, 1.5]], R([[0.17, 0.1], [0.11, 0.07], [0.02, 0.02]]), BEAK, { sides: 6 });
      tube(mb, [[0, 2.9, 1.06], [0, 2.88, 1.26], [0, 2.9, 1.38]], R([[0.13, 0.05], [0.08, 0.04], [0.01, 0.01]]), sh(BEAK, -0.15), { sides: 5 });
      for (const s of [1, -1]) { ball(mb, [s * 0.19, 3.13, 1.02], [0.08, 0.1, 0.06], '#ffffff', 6, 4); ball(mb, [s * 0.21, 3.13, 1.06], [0.05, 0.07, 0.04], '#2a5ae8', 5, 3); }
      for (let i = 0; i < 6; i++) { const a = (i / 5 - 0.5) * 1.4; mb.blade([S(a) * 0.12, 3.3, 0.8 - i * 0.03], [S(a) * 0.7, 1, -0.7 - (i % 2) * 0.3], 0.55 - Math.abs(a) * 0.1, 0.16, 0.04, Yl, null, '#fff8b0'); }
    });
    // small running wings, swept back and up (~45 deg)
    const wing = (s) => part(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const a = [s * 0.45, 2.3, 0.08], b = [s * 0.85, 2.62, -0.32], c = [s * 1.18, 2.95, -0.78];
      tube(mb, [a, b, c], R([[0.16, 0.22], [0.12, 0.14], [0.04, 0.05]]), Y, { sides: 6, up: [0, 1, 0] });
      const wd = V.norm(V.sub(c, a));
      for (let i = 0; i < 5; i++) {
        const t = i / 4, base = V.lerp(a, c, 0.2 + t * 0.75);
        mb.blade(base, [s * (0.15 + t * 0.35), -0.2 + t * 0.35, -1], 0.5 + t * 0.2, 0.26, 0.05, i % 2 ? Y : Yd, wd, Yl);
      }
    });
    wing(1); wing(-1);
    part(m, 'tail', mb => { for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 1.8; mb.blade([S(a) * 0.15, 2.25, -0.8], [S(a) * 0.9, 0.9, -1], 0.75 - Math.abs(a) * 0.12, 0.26, 0.05, i % 2 ? Y : Yd, null, Yl); } });
    const leg = (s) => part(m, s > 0 ? 'thighL' : 'thighR', mb => {
      const hip = [s * 0.3, 1.62, -0.05], kn = [s * 0.32, 1.12, -0.25], an = [s * 0.3, 0.16, 0.02];
      ball(mb, [s * 0.32, 1.45, -0.12], [0.26, 0.32, 0.3], Y, 7, 5);
      tube(mb, [kn, V.lerp(kn, an, 0.5), an], R([0.1, 0.08, 0.075]), (t, a, i, k) => (i % 2) ? LEGd : LEG, { sides: 6 });
      tube(mb, [V.lerp(hip, kn, 0.4), kn], R([0.15, 0.11]), LEG, { sides: 6 });
      for (let i = -1; i <= 1; i++) { tube(mb, [an, [an[0] + i * 0.14, 0.05, 0.3]], R([0.05, 0.04]), LEG, { sides: 4 }); spike(mb, [an[0] + i * 0.14, 0.05, 0.28], [an[0] + i * 0.17, 0.0, 0.44], 0.035, '#f4f0e0', 4); }
      spike(mb, an, [an[0], 0.02, -0.25], 0.04, '#f4f0e0', 4);
    });
    leg(1); leg(-1);
    // Mog on its back
    part(m, 'rider', mb => {
      MX.apply(mb);
      ball(mb, [0, 2.84, -0.22], [0.25, 0.26, 0.23], MOG, 8, 5, (i, j) => j > 3 ? MOGd : MOG);
      ball(mb, [0, 3.28, -0.18], [0.3, 0.27, 0.27], MOG, 8, 6);
      for (const s of [1, -1]) { mb.blade([s * 0.18, 3.46, -0.2], [s * 0.6, 1, -0.2], 0.2, 0.12, 0.04, MOG); ball(mb, [s * 0.1, 3.3, 0.06], [0.035, 0.05, 0.03], '#201818', 5, 3); }
      ball(mb, [0, 3.22, 0.09], [0.05, 0.04, 0.04], '#e06080', 5, 3);            // nose
      tube(mb, curve([[0, 3.52, -0.22], [0.05, 3.75, -0.28], [0.18, 3.9, -0.22]], 2), 0.018, '#302830', { sides: 4 });
      ball(mb, [0.2, 3.94, -0.2], 0.1, '#e02838', 6, 4);                          // red pom-pom
      for (const s of [1, -1]) { // little purple bat wings
        const b = [s * 0.12, 3.0, -0.4];
        tri2(mb, b, [s * 0.5, 3.22, -0.5], [s * 0.42, 2.94, -0.5], '#8a3aa8'); tri2(mb, b, [s * 0.42, 2.94, -0.5], [s * 0.22, 2.84, -0.45], '#8a3aa8');
      }
      for (const s of [1, -1]) ball(mb, [s * 0.14, 2.6, -0.05], [0.09, 0.08, 0.12], MOG, 6, 4);      // feet
    });
    const marm = (s) => part(m, s > 0 ? 'armL' : 'armR', mb => { MX.apply(mb); tube(mb, [[s * 0.2, 3.02, -0.18], [s * 0.36, 2.92, -0.06], [s * 0.44, 2.98, 0.04]], R([0.07, 0.06, 0.06]), MOG, { sides: 5 }); ball(mb, [s * 0.46, 3.0, 0.06], 0.075, MOG, 5, 4); });
    marm(1); marm(-1);
    m.height = 4.1; m.lungeScale = 1.5;
    return m;
  }
  // ---- Fat Chocobo: pear-shaped yellow body (widest low), a neck crease and a distinct round head with the
  // orange beak, sleepy blue eyes and a feather tuft; stubby wing flaps; red feet with white claws held out front.
  function fatChocobo() {
    const m = rig();
    const Y = '#f6d418', Yl = '#fbe860', Yd = '#d0a010', BEAK = '#f08a1c', FOOT = '#e03a18';
    boneAt(m, 'body', 'root', [0, 2.6, 0]);
    boneAt(m, 'head', 'body', [0, 4.25, 0.7]);
    boneAt(m, 'tail', 'body', [0, 2.2, -2.2]);
    boneAt(m, 'wingL', 'body', [2.35, 2.95, 0.15]); boneAt(m, 'wingR', 'body', [-2.35, 2.95, 0.15]);
    boneAt(m, 'thighL', 'body', [1.25, 0.9, 1.5]); boneAt(m, 'thighR', 'body', [-1.25, 0.9, 1.5]);
    part(m, 'body', mb => {
      mb.loft([
        { y: 0.12, rx: 1.3, rz: 1.2, color: Yd }, { y: 0.7, rx: 2.4, rz: 2.2, color: Y }, { y: 1.6, rx: 2.75, rz: 2.5, color: Y },
        { y: 2.6, rx: 2.5, rz: 2.3, color: Y }, { y: 3.4, rx: 1.95, rz: 1.85, color: Yl }, { y: 3.95, rx: 1.3, rz: 1.25, color: Yd }, { y: 4.15, rx: 0.8, rz: 0.8, color: Yd },
      ], { sides: 14, color: Y });
      ball(mb, [0, 1.9, 1.05], [2.05, 1.55, 1.5], Y, 10, 6, (i, j) => j < 2 ? Y : mix(Y, Yl, 0.45));      // pale belly
      for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; mb.blade([S(a) * 2.55, 1.2 + (i % 3) * 0.45, C(a) * 2.3], [S(a) * 0.35, -1, C(a) * 0.35], 0.8, 0.6, 0.08, i % 2 ? Y : Yd, { radial: [0, 1.8, 0] }); }
    });
    part(m, 'head', mb => {
      ball(mb, [0, 4.95, 0.75], [1.35, 1.15, 1.25], Y, 10, 7, (i, j) => j < 2 ? Yl : Y);
      tube(mb, [[0, 4.72, 1.8], [0, 4.55, 2.3], [0, 4.36, 2.52]], R([[0.52, 0.27], [0.4, 0.21], [0.11, 0.08]]), BEAK, { sides: 7 });
      tube(mb, [[0, 4.42, 1.75], [0, 4.33, 2.12], [0, 4.33, 2.26]], R([[0.42, 0.14], [0.28, 0.11], [0.05, 0.05]]), sh(BEAK, -0.15), { sides: 6 });
      for (const s of [1, -1]) {
        ball(mb, [s * 0.55, 5.1, 1.78], [0.27, 0.15, 0.1], '#ffffff', 6, 4);
        ball(mb, [s * 0.55, 5.07, 1.85], [0.17, 0.1, 0.06], '#2a64e8', 6, 3);
        ball(mb, [s * 0.55, 5.21, 1.8], [0.31, 0.1, 0.12], Yd, 6, 3);            // sleepy lids
      }
      for (let i = 0; i < 5; i++) mb.blade([(i - 2) * 0.12, 6.0, 0.65], [(i - 2) * 0.35, 1, -0.3], 0.5 + (i % 2) * 0.2, 0.22, 0.06, Yl);   // tuft
    });
    // stubby wing flaps
    const wing = (s) => part(m, s > 0 ? 'wingL' : 'wingR', mb => {
      mb.push(); mb.translate(s * 2.55, 2.7, 0.2); mb.rotate(0.2, 0, s * 0.45);
      ball(mb, [0, 0, 0], [0.34, 0.85, 0.75], Y, 7, 5, (i, j) => j > 3 ? Yd : Y);
      mb.pop();
      for (let i = 0; i < 4; i++) mb.blade([s * 2.75, 2.2 - i * 0.05, 0.55 - i * 0.3], [s * 0.5, -0.8, -0.2], 0.6 - i * 0.05, 0.36, 0.08, i % 2 ? Y : Yd, null, Yl);
    });
    wing(1); wing(-1);
    part(m, 'tail', mb => { for (let i = 0; i < 6; i++) { const a = (i / 5 - 0.5) * 1.6; mb.blade([S(a) * 0.6, 2.8, -2.1], [S(a) * 0.8, 0.6, -1], 1.0, 0.4, 0.08, i % 2 ? Y : Yd); } });
    const foot = (s) => part(m, s > 0 ? 'thighL' : 'thighR', mb => {
      const a = [s * 1.25, 0.9, 1.5], b = [s * 1.35, 0.6, 2.3];
      tube(mb, [a, b], R([0.3, 0.26]), FOOT, { sides: 6, flat: true });
      for (let i = -1; i <= 1; i++) { const t = [s * 1.35 + i * 0.26, 0.45 + Math.abs(i) * 0.1, 2.75]; tube(mb, [b, t], R([0.14, 0.12]), FOOT, { sides: 5, flat: true }); spike(mb, t, V.add(t, [i * 0.08, -0.1, 0.4]), 0.1, '#f8f8f8', 4); }
    });
    foot(1); foot(-1);
    m.height = 6.6; m.lungeScale = 0.5;
    return m;
  }
  SM.choco_mog = function (opts) { return opts && (opts.fat || opts === 'fat') ? fatChocobo() : chocoMog(); };
  SM.fat_chocobo = function () { return fatChocobo(); };

  // ================================================================== ODIN (on Sleipnir)
  SM.odin = function () {
    const m = rig();
    const HW = '#b8b0c8', HWd = '#7e7690', HOOF = '#2a2420', MANE = '#2c1e12', MANEg = '#b08a38';     // lavender-grey Sleipnir
    const ARM = '#ececf4', BLK = '#26262c', GOLD = '#d0b030', CAPE = '#343c4c';
    boneAt(m, 'body', 'root', [0, 2.45, 0]);
    boneAt(m, 'head', 'body', [0, 2.95, 1.45]);
    boneAt(m, 'tail', 'body', [0, 2.8, -1.85]);
    boneAt(m, 'legFL', 'body', [0.36, 2.05, 1.1]); boneAt(m, 'legFR', 'body', [-0.36, 2.05, 1.1]);
    boneAt(m, 'legBL', 'body', [0.38, 2.2, -1.25]); boneAt(m, 'legBR', 'body', [-0.38, 2.2, -1.25]);
    const OX = seatXf([0, 3.05, 0.15], 1.3, [0, 0.2, -0.05]);            // Odin, scaled up in the saddle
    boneAt(m, 'rider', 'body', OX([0, 3.1, 0.15]));
    boneAt(m, 'armL', 'rider', OX([0.5, 4.02, 0.12])); boneAt(m, 'armR', 'rider', OX([-0.5, 4.02, 0.12]));
    const hFn = (t, a) => C(a) < -0.4 ? HWd : HW;
    part(m, 'body', mb => {
      tube(mb, [[0, 2.62, -1.75], [0, 2.62, -1.3], [0, 2.52, -0.4], [0, 2.55, 0.5], [0, 2.58, 1.2], [0, 2.5, 1.62]], R([[0.48, 0.48], [0.76, 0.78], [0.7, 0.72], [0.72, 0.76], [0.7, 0.82], [0.38, 0.46]]), hFn, { sides: 10 });
      ball(mb, [0, 2.2, 1.3], [0.56, 0.6, 0.5], HW, 7, 5);                              // chest
      // saddle blanket
      tube(mb, [[0, 2.9, -0.35], [0, 2.95, 0.45]], R([[0.78, 0.56], [0.78, 0.58]]), (t, a) => C(a) > 0.1 ? '#3a3040' : HWd, { sides: 10 });
    });
    part(m, 'head', mb => {
      tube(mb, [[0, 2.75, 1.3], [0, 3.25, 1.7], [0, 3.72, 2.02]], R([[0.44, 0.6], [0.34, 0.46], [0.27, 0.32]]), hFn, { sides: 8 });
      tube(mb, [[0, 3.85, 2.0], [0, 3.62, 2.42], [0, 3.36, 2.8]], R([[0.24, 0.26], [0.2, 0.22], [0.15, 0.17]]), HW, { sides: 8 });
      ball(mb, [0, 3.32, 2.82], [0.16, 0.17, 0.14], sh(HW, -0.1), 6, 4);
      for (const s of [1, -1]) { spike(mb, [s * 0.12, 3.98, 1.98], [s * 0.18, 4.28, 1.9], 0.07, HW, 4); ball(mb, [s * 0.2, 3.78, 2.3], [0.04, 0.05, 0.06], '#201810', 5, 3); ball(mb, [s * 0.08, 3.3, 2.94], 0.03, '#303030', 4, 3); }
      // spiky mane with golden streaks
      for (let i = 0; i < 9; i++) {
        const t = i / 8, p = V.lerp([0, 4.02, 1.98], [0, 3.05, 1.15], t);
        mb.blade(p, [(i % 2 ? 0.5 : -0.5), 0.6 - t * 0.4, -1], 0.75 - t * 0.2, 0.26, 0.06, i % 3 === 1 ? MANEg : MANE);
      }
      for (let i = 0; i < 3; i++) mb.blade([0, 4.02, 2.05], [(i - 1) * 0.5, 0.2, 1], 0.35, 0.14, 0.04, MANE);
    });
    part(m, 'tail', mb => {
      tube(mb, curve([[0, 2.8, -1.8], [0, 2.75, -2.3], [0, 2.3, -2.7], [0, 1.4, -2.85]], 2), (t) => 0.16 - t * 0.1, MANE, { sides: 5 });
      for (let i = 0; i < 5; i++) mb.blade([0, 2.6 - i * 0.2, -2.4 - i * 0.07], [(i - 2) * 0.3, -1, -0.6], 1.0, 0.25, 0.06, i % 2 ? MANEg : MANE);
    });
    // Sleipnir: eight legs, two per leg bone (front pair reaching forward, rear pair driving back)
    const legF = (mb, x, z, lift) => {
      const top = [x, 2.1, z], kn = [x, 1.2, z + 0.08 + lift * 0.3], fet = [x, 0.42 + lift * 0.35, z - lift * 0.35 + 0.05], hoof = [x, 0.12 + lift * 0.3, z + 0.12 - lift * 0.5];
      tube(mb, [top, V.lerp(top, kn, 0.45), kn, fet, hoof], R([0.3, 0.24, 0.15, 0.11, 0.11]), hFn, { sides: 6, up: [0, 0, 1] });
      ball(mb, kn, 0.14, HW, 5, 3);
      tube(mb, [V.add(hoof, [0, 0.02, 0]), V.add(hoof, [0, -0.14, 0.04])], R([0.12, 0.15]), HOOF, { sides: 6 });
    };
    const legB = (mb, x, z, kick) => {
      const top = [x, 2.3, z], hock = [x, 1.25, z - 0.4 - kick * 0.2], fet = [x, 0.4, z - 0.2 - kick * 0.35], hoof = [x, 0.12, z - 0.12 - kick * 0.4];
      tube(mb, [top, V.lerp(top, hock, 0.4), hock, fet, hoof], R([0.46, 0.38, 0.16, 0.11, 0.11]), hFn, { sides: 6, up: [0, 0, 1] });
      tube(mb, [V.add(hoof, [0, 0.02, 0]), V.add(hoof, [0, -0.14, 0.04])], R([0.12, 0.15]), HOOF, { sides: 6 });
    };
    for (const s of [1, -1]) {
      part(m, s > 0 ? 'legFL' : 'legFR', mb => { legF(mb, s * 0.36, 1.1, 0.7); legF(mb, s * 0.22, 0.85, 0.35); });
      part(m, s > 0 ? 'legBL' : 'legBR', mb => { legB(mb, s * 0.38, -1.25, 0.6); legB(mb, s * 0.24, -1.0, 0); });
    }
    const setRest = (n, r) => { m.bones[n].rest = r.slice(); m.bones[n].rot = r.slice(); };
    // galloping leap: fore legs reaching forward, hind legs stretched back
    setRest('legFL', [-1.05, 0, 0]); setRest('legFR', [-0.75, 0, 0]); setRest('legBL', [0.85, 0, 0]); setRest('legBR', [0.6, 0, 0]);
    // Odin himself
    part(m, 'rider', mb => {
      OX.apply(mb);
      mb.loft([
        { y: 3.0, rx: 0.34, rz: 0.26, color: BLK }, { y: 3.3, rx: 0.3, rz: 0.24, color: GOLD }, { y: 3.42, rx: 0.3, rz: 0.24, color: BLK },
        { y: 3.7, rx: 0.4, rz: 0.28, color: ARM }, { y: 4.0, rx: 0.48, rz: 0.3, color: ARM }, { y: 4.14, rx: 0.2, rz: 0.18, color: BLK },
      ], { sides: 8, color: ARM });
      ball(mb, [0, 3.72, 0.28], [0.13, 0.13, 0.05], BLK, 6, 3);                   // chest emblem
      ball(mb, [0, 3.72, 0.31], [0.07, 0.07, 0.03], '#8a8aa0', 6, 3);
      ball(mb, [-0.52, 4.05, 0.08], [0.3, 0.2, 0.3], GOLD, 7, 4);                   // pauldrons
      ball(mb, [0.52, 4.05, 0.08], [0.28, 0.18, 0.28], ARM, 7, 4);
      for (const s of [1, -1]) {   // legs straddling the horse
        tube(mb, [[s * 0.25, 3.05, 0.15], [s * 0.66, 2.8, 0.55], [s * 0.72, 2.05, 0.35]], R([0.17, 0.14, 0.11]), ARM, { sides: 6 });
        tube(mb, [[s * 0.72, 2.2, 0.35], [s * 0.72, 1.85, 0.42]], R([0.13, 0.1]), BLK, { sides: 6 });
        ball(mb, [s * 0.66, 2.82, 0.56], 0.14, '#3a78d8', 5, 3);                    // knee gem
      }
      // head: gold mask, dark helm and antler-like horns
      ball(mb, [0, 4.36, 0.12], [0.2, 0.24, 0.21], BLK, 8, 5);
      ball(mb, [0, 4.32, 0.24], [0.14, 0.17, 0.1], GOLD, 7, 4);
      for (const s of [1, -1]) {
        ball(mb, [s * 0.06, 4.37, 0.33], [0.035, 0.015, 0.01], '#401808', 4, 3);
        horn(mb, [[s * 0.12, 4.5, 0.08], [s * 0.25, 4.85, 0.0], [s * 0.42, 5.2, -0.05], [s * 0.72, 5.45, -0.02]], 0.05, '#3a2e22', '#6a5a44', 4, 2);
        spike(mb, [s * 0.35, 5.08, -0.05], [s * 0.2, 5.4, -0.08], 0.03, '#3a2e22', 3);
        spike(mb, [s * 0.55, 5.35, -0.04], [s * 0.72, 5.62, -0.1], 0.025, '#3a2e22', 3);
      }
      // huge cape billowing out behind
      const capeA = [[-0.45, 4.05, -0.15], [-0.2, 4.1, -0.25], [0.2, 4.1, -0.25], [0.45, 4.05, -0.15]];
      const capeB = [[-1.4, 3.75, -1.3], [-0.55, 3.45, -1.6], [0.5, 3.5, -1.6], [1.3, 3.8, -1.25]];
      const capeC = [[-2.3, 2.9, -2.4], [-0.9, 2.5, -3.0], [0.8, 2.6, -3.0], [2.1, 3.1, -2.3]];
      sheet(mb, capeA, capeB, CAPE, sh(CAPE, -0.3)); sheet(mb, capeB, capeC, (t) => mix(CAPE, sh(CAPE, 0.15), t), sh(CAPE, -0.3));
    });
    const arm = (s) => part(m, s > 0 ? 'armL' : 'armR', mb => {
      OX.apply(mb);
      const sh0 = [s * 0.5, 4.02, 0.12];
      if (s < 0) { // sword arm raised: Zantetsuken
        const el = [-0.82, 4.45, 0.2], wr = [-0.88, 4.95, 0.3];
        tube(mb, [sh0, el, wr], R([0.13, 0.11, 0.09]), ARM, { sides: 6 });
        ball(mb, wr, 0.12, BLK, 5, 4);
        tube(mb, [[-0.88, 4.78, 0.3], [-0.9, 5.15, 0.3]], 0.04, BLK, { sides: 4 });
        tube(mb, [[-1.25, 5.12, 0.3], [-0.55, 5.12, 0.3]], 0.06, GOLD, { sides: 4 });
        const b0 = [-0.9, 5.15, 0.3], b1 = [-1.3, 7.4, -0.15], w = [0.3, 0, 0.05];
        const L = [V.sub(b0, w), V.lerp(V.sub(b0, w), V.sub(b1, w), 0.5), V.sub(b1, [0.02, 0.2, 0])], Rr = [V.add(b0, w), V.lerp(V.add(b0, w), V.add(b1, w), 0.5), V.add(b1, [0.1, 0.45, -0.04])];
        tube(mb, [V.add(b0, [0, 0.02, 0.01]), V.add(b1, [0.05, 0.1, 0])], R([[0.05, 0.02], [0.01, 0.01]]), '#e8f4ff', { sides: 4, up: [0, 0, 1] });
        sheet(mb, L, Rr, (t) => mix('#1c46d8', '#9cd0ff', t), '#1c3ab0');
      } else {     // rein hand
        const el = [0.72, 3.62, 0.3], wr = [0.5, 3.4, 0.72];
        tube(mb, [sh0, el, wr], R([0.13, 0.11, 0.09]), ARM, { sides: 6 });
        ball(mb, wr, 0.11, BLK, 5, 4);
      }
    });
    arm(1); arm(-1);
    m.height = 6.4; m.lungeScale = 1.5;
    return m;
  };

  // ================================================================== KUJATA
  SM.kujata = function () {
    const m = rig();
    const BR = '#3e342c', BRd = '#221c18', BRl = '#54473c', HORN = '#1c1a22', RED = '#d41c1e', PURP = '#5a44c8', GOLD = '#c8b424';
    boneAt(m, 'body', 'root', [0, 2.8, 0]);
    const HD = [0, -0.38, 0.08];                                             // head carried low
    boneAt(m, 'head', 'body', V.add([0, 3.1, 2.0], HD));
    boneAt(m, 'jaw', 'head', V.add([0, 2.05, 2.7], HD));
    boneAt(m, 'tail', 'body', [0, 3.4, -2.55]);
    boneAt(m, 'legFL', 'body', [0.72, 2.3, 1.25]); boneAt(m, 'legFR', 'body', [-0.72, 2.3, 1.25]);
    boneAt(m, 'legBL', 'body', [0.72, 2.45, -1.7]); boneAt(m, 'legBR', 'body', [-0.72, 2.45, -1.7]);
    const bFn = (t, a) => C(a) > 0.5 ? BRl : C(a) < -0.4 ? BRd : BR;
    part(m, 'body', mb => {
      // massive body: the chest/shoulder hump ~20% deeper than the rest
      const SP = [[0, 3.0, -2.6], [0, 3.05, -1.9], [0, 2.85, -0.6], [0, 3.3, 0.7], [0, 3.05, 1.55], [0, 2.5, 2.1]], SR = [[0.6, 0.6], [1.0, 1.02], [1.15, 1.2], [1.52, 1.76], [1.3, 1.45], [0.62, 0.72]];
      tube(mb, SP, R(SR), bFn, { sides: 10 });
      const topAt = (z) => { for (let i = 0; i < SP.length - 1; i++) if (z >= SP[i][2] && z <= SP[i + 1][2]) { const u = (z - SP[i][2]) / (SP[i + 1][2] - SP[i][2]); return SP[i][1] + SR[i][1] + (SP[i + 1][1] + SR[i + 1][1] - SP[i][1] - SR[i][1]) * u; } return 3.6; };
      ball(mb, [0, 2.3, 1.55], [1.0, 0.9, 0.72], BR, 8, 5);                          // chest/dewlap
      // red crystal crest along the spine, densest over the shoulders
      for (let i = 0; i < 22; i++) {
        const t = i / 21, z = 1.9 - t * 4.3;
        const y = topAt(z) + 0.05;
        const big = t < 0.4 ? 1 : 0.55;
        for (const x of (t < 0.4 ? [-0.35, 0, 0.35] : [0])) {
          const hgt = (0.6 + ((i * 7 + x * 10 + 10) % 5) * 0.1) * big;
          spike(mb, [x * (1 - t), y - 0.2, z + x * 0.2], [x * (1 - t) * 1.6, y + hgt, z - 0.2], 0.16 * big, i % 2 ? RED : sh(RED, -0.15), 4);
        }
      }
    });
    part(m, 'head', mb => {
      mb.translate(HD[0], HD[1], HD[2]);
      tube(mb, [[0, 3.15, 1.8], [0, 2.9, 2.35], [0, 2.45, 2.85]], R([[0.62, 0.72], [0.56, 0.6], [0.45, 0.42]]), bFn, { sides: 8 });
      ball(mb, [0, 2.3, 3.0], [0.46, 0.36, 0.34], PURP, 8, 5);                           // purple muzzle
      for (const s of [1, -1]) { ball(mb, [s * 0.16, 2.25, 3.3], [0.08, 0.06, 0.04], '#201840', 5, 3); }
      tube(mb, curve([[0.24, 2.18, 3.3], [0.2, 1.98, 3.42], [0, 1.9, 3.46], [-0.2, 1.98, 3.42], [-0.24, 2.18, 3.3]], 2), 0.045, GOLD, { sides: 4 });  // nose ring
      for (const s of [1, -1]) {
        ball(mb, [s * 0.4, 2.95, 2.55], [0.12, 0.07, 0.08], '#f0a020', 6, 3);           // eyes with yellow streaks
        spike(mb, [s * 0.34, 3.06, 2.6], [s * 0.62, 3.2, 2.45], 0.04, '#f0c020', 3);
        spike(mb, [s * 0.3, 2.14, 3.14], [s * 0.56, 2.52, 3.36], 0.075, '#f4f0e0', 4);     // small tusks beside the nose ring
        mb.blade([s * 0.6, 3.1, 2.1], [s * 1, -0.2, -0.4], 0.5, 0.3, 0.08, BR);        // ear
        horn(mb, [[s * 0.42, 3.35, 2.0], [s * 0.95, 3.55, 2.15], [s * 1.55, 4.0, 2.2], [s * 1.9, 4.7, 2.35], [s * 1.95, 5.2, 2.5]], 0.3, HORN, '#302838', 6, 3);
        spike(mb, [s * 1.93, 5.05, 2.45], [s * 1.98, 5.45, 2.56], 0.08, RED, 4);
      }
    });
    part(m, 'jaw', mb => { mb.translate(HD[0], HD[1], HD[2]); ball(mb, [0, 2.0, 2.85], [0.34, 0.14, 0.3], BRd, 6, 4); });
    part(m, 'tail', mb => {   // long tail arcing up and falling to a tassel near the ground
      tube(mb, curve([[0, 3.3, -2.5], [0, 4.1, -3.05], [0, 4.55, -3.55], [0, 4.25, -4.1], [0, 3.3, -4.35], [0.1, 2.2, -4.3], [0.2, 1.3, -4.05]], 2), (t) => 0.2 - t * 0.12, BR, { sides: 5 });
      for (let i = 0; i < 5; i++) mb.blade([0.2, 1.4, -4.05], [(i - 2) * 0.3, -1, (i % 2) * 0.3], 0.5, 0.17, 0.05, BRd);
    });
    const leg = (name, x, z, back) => part(m, name, mb => {
      const top = [x, back ? 2.5 : 2.35, z];
      const mid = back ? [x, 1.3, z - 0.35] : [x, 1.15, z + 0.1];
      const low = [x, 0.35, z + (back ? -0.15 : 0.05)];
      tube(mb, [top, V.lerp(top, mid, 0.5), mid, low], R(back ? [0.62, 0.5, 0.3, 0.26] : [0.52, 0.45, 0.3, 0.27]), bFn, { sides: 7, up: [0, 0, 1] });
      tube(mb, [V.add(low, [0, 0.05, 0]), V.add(low, [0, -0.35, 0.08])], R([0.3, 0.34]), HORN, { sides: 7 });
    });
    for (const s of [1, -1]) { leg(s > 0 ? 'legFL' : 'legFR', s * 0.72, 1.25, false); leg(s > 0 ? 'legBL' : 'legBR', s * 0.72, -1.7, true); }
    m.height = 6.0; m.lungeScale = 1.5;
    return m;
  };

  // ================================================================== LEVIATHAN
  SM.leviathan = function () {
    const m = rig();
    const CY = '#3ae8d8', CYl = '#8af8f0', DK = '#0e3c34', WH = '#f4f8f8', FIN = '#f6f8f8', FINd = '#b8c2c6';
    // body centreline from the tail tip, round the coil (a "6" seen from the front), up the neck
    const ctrl = [
      [-3.5, 1.0, -0.7], [-2.5, 1.4, -0.45], [-1.4, 1.8, -0.2], [-0.3, 2.35, 0.25], [0.8, 2.55, 0.3], [1.65, 2.05, 0.25],
      [1.85, 1.1, 0.15], [1.25, 0.45, 0.05], [0.25, 0.45, -0.05], [-0.35, 1.2, -0.15], [-0.45, 2.4, -0.2],
      [-0.4, 3.6, -0.2], [-0.3, 5.0, -0.12], [-0.12, 6.3, 0.1], [0.08, 7.2, 0.5], [0.18, 7.7, 1.1],
    ];
    const pts = curve(ctrl, 3);
    const idx = (c) => c * 3;                       // control point -> sample index
    const rad = (i) => { const t = i / (pts.length - 1); return t < 0.2 ? 0.04 + t / 0.2 * 0.46 : t < 0.8 ? 0.5 + S((t - 0.2) / 0.6 * PI) * 0.08 : 0.5 - (t - 0.8) / 0.2 * 0.08; };
    const segs = [[0, idx(10)], [idx(10), idx(11)], [idx(11), idx(12)], [idx(12), idx(13)], [idx(13), idx(14)], [idx(14), idx(15)]];
    let parent = 'root';
    segs.forEach((r, k) => { boneAt(m, 'seg' + k, parent, pts[r[0] === 0 ? idx(10) : r[0]]); parent = 'seg' + k; });
    boneAt(m, 'head', 'seg5', pts[idx(15)]);
    boneAt(m, 'jaw', 'head', [0.22, 7.45, 1.55]);
    boneAt(m, 'wingL', 'seg3', [0.3, 6.1, 0.0]); boneAt(m, 'wingR', 'seg3', [-0.5, 6.1, 0.0]);
    const bodyCol = (i0) => (t, a, i) => { const cc = C(a); return cc > 0.25 ? (cc > 0.8 ? CYl : CY) : cc < -0.5 ? DK : mix(DK, CY, 0.55); };
    segs.forEach((r, k) => part(m, 'seg' + k, mb => {
      const sub = pts.slice(r[0], r[1] + 1);
      tube(mb, sub, (t, i) => rad(r[0] + i), bodyCol(r[0]), { sides: 8, up: [0, 0, 1], cap0: k === 0, cap1: false });
      ball(mb, pts[r[1]], rad(r[1]) * 1.01, CY, 8, 5);
      // white spines along the back (tail and neck)
      for (let i = r[0] + 1; i < r[1]; i += 2) {
        const tgt = V.norm(V.sub(pts[i + 1], pts[i - 1]));
        if (k === 0 && i > idx(3)) continue;
        const back = perp(tgt, [0, 0, -1]);
        const b = V.add(pts[i], V.scale(back, rad(i) * 0.8));
        spike(mb, b, V.add(b, V.add(V.scale(back, 0.25 + rad(i) * 0.5), V.scale(tgt, -0.3))), 0.05 + rad(i) * 0.1, WH, 3);
      }
      if (k === 0) for (let j = 0; j < 4; j++) tube(mb, [pts[0], V.add(pts[0], [-1.3 - j * 0.25, -0.35 - j * 0.12, 0.25 - j * 0.15])], R([0.03, 0.005]), '#c8f8f4', { sides: 3 });   // tail streamers
    }));
    part(m, 'head', mb => {
      // long pointed beak-like snout (~1.6x the old one)
      const h0 = [0.18, 7.75, 1.1];
      tube(mb, [h0, [0.22, 7.72, 1.7], [0.27, 7.52, 2.55], [0.32, 7.28, 3.25], [0.35, 7.14, 3.6]], R([[0.4, 0.38], [0.35, 0.3], [0.21, 0.17], [0.09, 0.08], [0.02, 0.02]]), (t, a) => C(a) > 0 ? CY : sh(CY, -0.35), { sides: 8, up: [0, 1, 0] });
      for (const s of [1, -1]) ball(mb, [0.2 + s * 0.2, 7.82, 1.62], [0.1, 0.1, 0.26], '#5a3ad0', 6, 3);          // blue-violet eye patches
      ball(mb, [0.2, 7.9, 1.35], [0.34, 0.24, 0.4], CY, 8, 5);
      for (const s of [1, -1]) {
        const x = 0.2 + s * 0.24;
        ball(mb, [x, 7.9, 1.7], [0.07, 0.06, 0.1], '#8a3ae0', 6, 4);                       // eyes
        spike(mb, [x, 8.0, 1.3], [0.2 + s * 0.55, 8.7, 0.4], 0.08, WH, 4);                  // swept horns
        spike(mb, [x, 7.85, 1.1], [0.2 + s * 0.9, 8.0, 0.3], 0.06, WH, 4);
        spike(mb, [0.2 + s * 0.3, 7.6, 1.9], [0.2 + s * 0.5, 7.9, 1.8], 0.05, WH, 3);
        tube(mb, curve([[0.24 + s * 0.2, 7.45, 2.3], [0.2 + s * 0.9, 7.85, 1.8], [0.2 + s * 1.8, 8.1, 0.9], [0.2 + s * 2.6, 7.9, 0.1]], 2), 0.025, '#b8fff8', { sides: 3 });   // whiskers
        for (let i = 0; i < 6; i++) spike(mb, [0.22 + s * (0.13 - i * 0.012), 7.4 - i * 0.04, 1.6 + i * 0.28], [0.22 + s * (0.13 - i * 0.012), 7.27 - i * 0.04, 1.65 + i * 0.28], 0.025, WH, 3);
      }
      spike(mb, [0.2, 8.05, 1.25], [0.12, 9.05, 0.75], 0.1, WH, 4);                          // tall crest horn
      ball(mb, [0.26, 7.38, 2.2], [0.19, 0.06, 0.85], '#c01830', 6, 3);                       // red mouth
    });
    part(m, 'jaw', mb => {
      tube(mb, [[0.2, 7.38, 1.4], [0.25, 7.18, 2.2], [0.3, 7.0, 2.9], [0.32, 6.95, 3.15]], R([[0.26, 0.12], [0.18, 0.09], [0.08, 0.05], [0.02, 0.02]]), sh(CY, -0.2), { sides: 6 });
      ball(mb, [0.25, 7.24, 2.1], [0.15, 0.04, 0.7], '#a01020', 6, 3);                          // red tongue / mouth floor
      for (const s of [1, -1]) for (let i = 0; i < 5; i++) spike(mb, [0.23 + s * (0.1 - i * 0.012), 7.24 - i * 0.05, 1.7 + i * 0.28], [0.23 + s * (0.1 - i * 0.012), 7.38 - i * 0.05, 1.72 + i * 0.28], 0.025, WH, 3);
    });
    // four solid white blade fins per side, fanned from up-and-out to out-and-down
    const fin = (s) => part(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const base = [s > 0 ? 0.3 : -0.5, 6.1, 0.0];
      for (let j = 0; j < 4; j++) {
        const th = 0.62 - j * 0.34, L = 3.5 - j * 0.4, w = 0.5 - j * 0.05;
        const d = V.norm([s * C(th), S(th), -0.16 - j * 0.05]), pp = V.norm(V.cross([0, 0, s], d));
        const tip = V.add(base, V.scale(d, L)), m1 = V.add(V.add(base, V.scale(d, L * 0.42)), V.scale(pp, w)), m2 = V.add(V.add(base, V.scale(d, L * 0.5)), V.scale(pp, -w * 0.3));
        const b1 = V.add(base, V.scale(pp, w * 0.35)), b2 = V.add(base, V.scale(pp, -w * 0.2));
        tri2z(mb, b1, m1, tip, FIN, FINd); tri2z(mb, b1, tip, m2, sh(FIN, -0.05), FINd); tri2z(mb, b1, m2, b2, FIN, FINd);
        tube(mb, [b1, m1, tip], R([0.05, 0.035, 0.01]), WH, { sides: 3 });                // stiff leading edge
      }
    });
    fin(1); fin(-1);
    m.floats = true; m.height = 8.9; m.lungeScale = 1.2;
    return m;
  };

  // ================================================================== BAHAMUT family
  // Shared dragon-king builder. o: { k (scale), pose: 'stand'|'fly'|'hover', col:{...}, wings:[spec..], head(mb,C) extras }
  // ('hover': airborne crouch at the standing height: knees drawn up, elbows bent, tail curled round to the front)
  function dragonKing(o) {
    const m = rig();
    const k = o.k || 1, lift = o.pose === 'fly' ? 1.0 : 0, hover = o.pose === 'hover';
    const P = (p) => [p[0] * k, (p[1] + lift) * k, p[2] * k];
    const c = o.col, D = c.body, Dl = c.light || sh(D, 0.18), Dd = c.dark || sh(D, -0.35), BEL = c.belly, CL = c.claw || '#ece4d4';
    const fly = o.pose === 'fly';
    const at = (bone, fn, mo, dro) => part(m, bone, mb => { mb.translate(0, lift * k, 0); mb.scale(k); fn(mb); }, mo, dro);
    boneAt(m, 'body', 'root', P([0, 3.0, 0]));
    boneAt(m, 'head', 'body', P([0, 6.15, 0.78]));
    boneAt(m, 'jaw', 'head', P([0, 6.28, 0.95]));
    boneAt(m, 'tail', 'body', P([0, 2.9, -0.45]));
    boneAt(m, 'wingL', 'body', P([0.35, 5.0, -0.42])); boneAt(m, 'wingR', 'body', P([-0.35, 5.0, -0.42]));
    boneAt(m, 'armL', 'body', P([0.85, 5.0, 0.15])); boneAt(m, 'armR', 'body', P([-0.85, 5.0, 0.15]));
    boneAt(m, 'thighL', 'body', P([0.5, 2.9, 0])); boneAt(m, 'thighR', 'body', P([-0.5, 2.9, 0]));
    const sideCol = (t, a) => C(a) > 0.45 ? BEL : C(a) < -0.6 ? Dd : D;       // tubes built with up = +z (front)
    const limbCol = (t, a) => C(a) < -0.5 ? Dd : C(a) > 0.6 ? Dl : D;
    const rings = [
      { y: 2.72, rx: 0.52, rz: 0.46, z: 0.0 }, { y: 3.3, rx: 0.5, rz: 0.45, z: 0.05 }, { y: 3.9, rx: 0.64, rz: 0.55, z: 0.12 },
      { y: 4.5, rx: 0.8, rz: 0.62, z: 0.18 }, { y: 5.0, rx: 0.84, rz: 0.56, z: 0.14 }, { y: 5.32, rx: 0.5, rz: 0.42, z: 0.2 }, { y: 5.55, rx: 0.3, rz: 0.3, z: 0.3 },
    ];
    at('body', mb => {
      mb.loft(rings, { sides: 10, color: D });
      // segmented belly / chest plates
      for (let i = 0; i < 7; i++) {
        const y = 3.0 + i * 0.3, t = i / 6;
        const rx = 0.38 + t * 0.2, z = 0.42 + t * 0.28;
        ball(mb, [0, y, z], [rx, 0.14, 0.14], i % 2 ? BEL : sh(BEL, 0.1), 8, 4);
      }
      for (const s of [1, -1]) ball(mb, [s * 0.36, 4.62, 0.62], [0.36, 0.3, 0.2], sh(BEL, 0.12), 8, 5);
      // neck
      tube(mb, [[0, 5.2, 0.28], [0, 5.72, 0.52], [0, 6.2, 0.78]], R([0.36, 0.3, 0.25]), sideCol, { sides: 8, up: [0, 0, 1] });
      // back ridge spikes (neck + spine)
      for (let i = 0; i < 9; i++) { const t = i / 8, p = V.lerp([0, 6.1, 0.55], [0, 3.0, -0.42], t); spike(mb, p, V.add(p, [0, 0.25, -0.45 - (1 - t) * 0.1]), 0.1, o.spikeCol || Dd, 4); }
      // shoulder armour
      for (const s of [1, -1]) { ball(mb, [s * 0.82, 5.02, 0.1], [0.36, 0.3, 0.36], o.shoulderCol || Dl, 7, 5); spike(mb, [s * 0.9, 5.2, 0.0], [s * 1.25, 5.6, -0.25], 0.14, o.spikeCol || Dd, 4); }
      if (o.body) o.body(mb, c);
    });
    at('head', mb => {
      ball(mb, [0, 6.42, 0.86], [0.27, 0.25, 0.32], D, 8, 5);
      tube(mb, [[0, 6.42, 1.0], [0, 6.4, 1.35], [0, 6.32, 1.68]], R([[0.21, 0.17], [0.16, 0.13], [0.07, 0.06]]), (t, a) => C(a) < -0.3 ? Dd : D, { sides: 7 });
      for (const s of [1, -1]) {
        ball(mb, [s * 0.15, 6.5, 1.14], [0.05, 0.035, 0.05], c.eye || '#f0c020', 5, 3);
        ball(mb, [s * 0.17, 6.56, 1.08], [0.08, 0.04, 0.12], Dd, 5, 3);                  // brow
        for (let i = 0; i < 3; i++) spike(mb, [s * 0.1, 6.33, 1.2 + i * 0.15], [s * 0.1, 6.22, 1.22 + i * 0.15], 0.02, CL, 3);
      }
      ball(mb, [0, 6.3, 1.25], [0.14, 0.03, 0.3], '#c02028', 6, 3);                       // red mouth line
      o.head(mb, c);
    });
    at('jaw', mb => { tube(mb, [[0, 6.28, 0.95], [0, 6.2, 1.3], [0, 6.2, 1.55]], R([[0.17, 0.08], [0.12, 0.06], [0.04, 0.03]]), Dd, { sides: 6 }); });
    at('tail', mb => {
      const tp = fly ? [[0, 2.9, -0.42], [0, 2.2, -0.9], [0.1, 1.2, -1.05], [0.2, 0.3, -0.95], [0.1, -0.4, -0.7], [-0.1, -0.85, -0.35]]
        : hover ? [[0, 2.9, -0.42], [0, 2.1, -1.0], [-0.25, 1.2, -1.35], [-0.8, 0.45, -1.1], [-1.25, 0.2, -0.3], [-1.2, 0.35, 0.55], [-0.8, 0.75, 1.05], [-0.35, 1.05, 1.2]]
        : [[0, 2.9, -0.42], [0, 2.3, -1.2], [-0.4, 1.4, -1.9], [-1.3, 0.75, -2.3], [-2.3, 0.8, -2.2], [-3.0, 1.3, -1.7], [-3.2, 2.0, -1.2]];
      const pts = curve(tp, 2);
      tube(mb, pts, (t) => 0.44 * (1 - t) + 0.04, (t, a) => C(a) < -0.45 ? BEL : (C(a) > 0.7 ? Dl : D), { sides: 7, up: fly ? [0, 0, -1] : [0, 1, 0] });
      for (let i = 1; i < pts.length - 1; i++) {
        const tg = V.norm(V.sub(pts[i + 1], pts[i - 1])), up = perp(tg, fly ? [0, 0, -1] : [0, 1, 0]), t = i / (pts.length - 1);
        const b = V.add(pts[i], V.scale(up, 0.4 * (1 - t) + 0.03));
        spike(mb, b, V.add(b, V.add(V.scale(up, 0.35 * (1 - t) + 0.1), V.scale(tg, -0.25))), 0.1 * (1 - t) + 0.03, o.spikeCol || Dd, 4);
        if (o.tailPlates) ball(mb, pts[i], [0.46 * (1 - t) + 0.07, 0.46 * (1 - t) + 0.07, 0.08], i % 2 ? Dl : D, 6, 3);
      }
    });
    const arm = (s) => at(s > 0 ? 'armL' : 'armR', mb => {
      const sh0 = [s * 0.85, 5.0, 0.15], el = hover ? [s * 1.3, 4.2, -0.25] : [s * 1.35, 4.15, 0.02], wr = fly ? [s * 1.45, 3.75, 0.8] : hover ? [s * 1.25, 4.05, 0.72] : [s * 1.55, 3.55, 0.55];
      tube(mb, [sh0, V.lerp(sh0, el, 0.5), el, V.lerp(el, wr, 0.5), wr], R([0.26, 0.27, 0.2, 0.22, 0.15]), limbCol, { sides: 7, up: [0, 0, 1] });
      spike(mb, V.add(el, [0, 0, -0.1]), V.add(el, [s * 0.2, 0.1, -0.55]), 0.1, o.spikeCol || Dd, 4);
      hand(mb, wr, fly ? [s * 0.3, -0.6, 0.8] : hover ? [s * 0.25, -0.45, 1] : [s * 0.3, -1, 0.45], 0.62, D, { claw: CL, clawLen: 0.32, curl: 0.8, thumbSide: -s, spread: 0.6, fingers: 3 });
    });
    arm(1); arm(-1);
    const leg = (s) => at(s > 0 ? 'thighL' : 'thighR', mb => {
      const hip = [s * 0.5, 2.9, 0];
      const kn = fly ? [s * 0.68, 2.1, 0.55] : hover ? [s * 0.78, 2.45, 0.95] : [s * 0.8, 1.95, 0.55];
      const hk = fly ? [s * 0.7, 1.15, -0.05] : hover ? [s * 0.8, 1.45, 0.3] : [s * 0.78, 0.85, -0.25];
      const ft = fly ? [s * 0.72, 0.45, 0.2] : hover ? [s * 0.8, 0.85, 0.55] : [s * 0.8, 0.2, 0.2];
      tube(mb, [hip, V.lerp(hip, kn, 0.5), kn, hk, ft], R([0.5, 0.48, 0.3, 0.2, 0.17]), limbCol, { sides: 8, up: [0, 0, 1] });
      ball(mb, kn, 0.3, D, 6, 4);
      spike(mb, kn, V.add(kn, [s * 0.1, 0.35, 0.3]), 0.1, o.spikeCol || Dd, 4);
      const toeDir = fly || hover ? [0, -1, 0.35] : [0, -0.15, 1];
      for (let i = -1; i <= 1; i++) {
        const tp = V.add(ft, V.add(V.scale(V.norm(toeDir), 0.4), [i * 0.16, 0, 0]));
        tube(mb, [ft, tp], R([0.1, 0.07]), D, { sides: 4 });
        spike(mb, tp, V.add(tp, V.add(V.scale(V.norm(toeDir), 0.28), [i * 0.05, -0.08, 0])), 0.06, CL, 4);
      }
      spike(mb, ft, V.add(ft, fly || hover ? [0, -0.1, -0.35] : [0, -0.15, -0.35]), 0.06, CL, 4);
    });
    leg(1); leg(-1);
    const wingOf = (s) => at(s > 0 ? 'wingL' : 'wingR', mb => { for (const w of o.wings) batWing(mb, s, w); });
    wingOf(1); wingOf(-1);
    if (o.extra) o.extra(m, at, P);
    m.floats = fly || hover; m.lungeScale = 1.2;
    return m;
  }
  // a wing spec scaled about its shoulder (kx span, ky height, kz depth); the body root of the trailing
  // membrane stays put, spars get thicker by sqrt(kx)
  function growWing(w, kx, ky, kz, extra) {
    const sc = (p) => p && [w.shoulder[0] + (p[0] - w.shoulder[0]) * kx, w.shoulder[1] + (p[1] - w.shoulder[1]) * ky, w.shoulder[2] + (p[2] - w.shoulder[2]) * kz];
    return Object.assign({}, w, { elbow: sc(w.elbow), wrist: sc(w.wrist), thumb: sc(w.thumb), tips: w.tips.map(sc), knuckles: w.knuckles && w.knuckles.map(sc), r: (w.r || 0.12) * Math.sqrt(kx) }, extra || {});
  }

  SM.bahamut = function () {
    const D = '#34343c';
    const m = dragonKing({
      k: 1, pose: 'hover',
      col: { body: D, belly: '#c8781c', eye: '#f0c020' },
      wings: [{ shoulder: [0.35, 5.0, -0.42], elbow: [1.5, 6.1, -0.72], wrist: [2.2, 7.35, -0.85], r: 0.13, bone: '#2c2c32', claw: '#e8e0d0', thumb: [2.35, 7.9, -0.6],
        tips: [[3.3, 8.7, -1.05], [4.55, 6.5, -1.25], [4.45, 3.6, -1.25], [3.3, 1.5, -1.0]], root: [0.55, 3.4, -0.45],
        mem: (i) => ['#523044', '#4a2a3c', '#402434', '#381f2e', '#301a28'][Math.max(0, Math.min(4, i + 1))], mem2: '#2a1822' }],
      head: (mb) => {
        for (const s of [1, -1]) {
          spike(mb, [s * 0.1, 6.6, 0.8], [s * 0.35, 7.7, -0.2], 0.08, '#3a3a44', 4);
          spike(mb, [s * 0.18, 6.52, 0.72], [s * 0.7, 7.1, -0.35], 0.07, '#3a3a44', 4);
          spike(mb, [s * 0.22, 6.4, 0.8], [s * 0.8, 6.55, 0.1], 0.06, '#3a3a44', 4);
          spike(mb, [s * 0.16, 6.28, 0.95], [s * 0.55, 6.1, 0.55], 0.05, '#3a3a44', 3);
        }
        spike(mb, [0, 6.62, 0.95], [0, 7.3, 0.35], 0.07, '#3a3a44', 4);
      },
    });
    m.height = 8.6;
    return m;
  };

  SM.neo_bahamut = function () {
    const RED = '#a41c22', REDl = '#cc3a34';
    const m = dragonKing({
      k: 1.0, pose: 'fly',
      col: { body: RED, light: REDl, dark: '#5c1014', belly: '#b89048', eye: '#ffd040', claw: '#f2e8d4' },
      spikeCol: '#7a1418', shoulderCol: REDl,
      // wings about twice the old span: dark grey-green membranes (#3a4038) stretched on red spars
      wings: [
        growWing({ shoulder: [0.35, 5.0, -0.42], elbow: [1.7, 6.2, -0.7], wrist: [2.8, 7.4, -0.9], r: 0.15, bone: '#b82a2a', claw: '#f2e8d4',
          tips: [[4.3, 8.9, -1.2], [4.8, 6.6, -1.4], [4.7, 4.2, -1.4], [3.7, 1.9, -1.1]], knuckles: [[3.4, 8.0, -1.0], [3.7, 7.0, -1.1], [3.6, 6.0, -1.1], [3.1, 5.0, -1.0]], root: [0.5, 3.2, -0.45],
          mem: (i) => i < 0 ? '#8a1c1e' : ['#3a4038', '#343a32', '#2e342c', '#282e26', '#3e3a34'][Math.min(4, i)], mem2: '#242a22' }, 2.0, 1.2, 1.2),
        growWing({ shoulder: [0.3, 5.3, -0.3], elbow: [0.9, 6.6, -0.5], wrist: [1.3, 7.6, -0.6], r: 0.08, bone: '#c83030',
          tips: [[1.7, 8.6, -0.7], [2.3, 8.1, -0.8], [2.4, 7.3, -0.8]], mem: '#a82428', mem2: '#6a1418', scallop: 0.3 }, 1.7, 1.25, 1.2),
      ],
      head: (mb) => {
        for (let i = 0; i < 5; i++) for (const s of [1, -1]) spike(mb, [s * (0.08 + i * 0.04), 6.62 - i * 0.05, 0.95 - i * 0.12], [s * (0.25 + i * 0.12), 7.25 + i * 0.05, 0.3 - i * 0.2], 0.07, i % 2 ? '#c83030' : '#8a1a1c', 4);
        for (const s of [1, -1]) { spike(mb, [s * 0.2, 6.35, 1.0], [s * 0.65, 6.2, 0.55], 0.06, '#8a1a1c', 3); spike(mb, [s * 0.12, 6.52, 1.35], [s * 0.3, 6.75, 1.2], 0.04, '#c83030', 3); }
      },
      body: (mb, c) => { for (let i = 0; i < 6; i++) for (const s of [1, -1]) spike(mb, [s * 0.35, 5.0 - i * 0.35, -0.4], [s * 0.6, 5.3 - i * 0.35, -0.9], 0.13, i % 2 ? '#c83030' : '#7a1418', 4); },
    });
    m.height = 10.7;
    return m;
  };

  SM.bahamut_zero = function () {
    const W = '#d4dcdc', GOLD = '#d8a028', TEAL = '#2a6a5c';
    const mem = (i) => ['#b4c4c0', '#a8b8b4', '#9cacaa', '#94a4a2', '#8c9c9a'][Math.max(0, Math.min(4, i + 1))];
    const m = dragonKing({
      k: 1.05, pose: 'fly', tailPlates: true,
      col: { body: W, light: '#f4f8f8', dark: '#8a9a9a', belly: '#e8eeee', eye: '#40f0e0', claw: '#f8f8f8' },
      spikeCol: '#a8b4b4', shoulderCol: GOLD,
      // two wing pairs at ~1.5x the old span
      wings: [
        growWing({ shoulder: [0.35, 5.1, -0.42], elbow: [1.4, 6.5, -0.7], wrist: [2.1, 7.7, -0.85], r: 0.13, bone: '#e8f0f0',
          tips: [[3.3, 8.9, -1.1], [4.3, 7.8, -1.2], [4.45, 6.3, -1.2]], root: [0.8, 5.3, -0.5], mem, mem2: '#7a8a88' }, 1.5, 1.3, 1.15),
        growWing({ shoulder: [0.35, 4.4, -0.42], elbow: [1.5, 4.1, -0.7], wrist: [2.4, 4.3, -0.85], r: 0.12, bone: '#e8f0f0',
          tips: [[4.2, 5.0, -1.1], [4.4, 3.2, -1.2], [3.5, 1.4, -1.0]], root: [0.5, 3.4, -0.45], mem, mem2: '#7a8a88' }, 1.5, 1.25, 1.15),
      ],
      head: (mb) => {
        for (const s of [1, -1]) {
          spike(mb, [s * 0.12, 6.6, 0.82], [s * 0.4, 7.35, -0.1], 0.08, '#f0f4f4', 4);
          mb.blade([s * 0.18, 6.55, 0.9], [s * 0.9, 0.35, -0.6], 0.8, 0.26, 0.05, TEAL);            // teal crest fins
          mb.blade([s * 0.12, 6.45, 1.25], [s * 0.5, 0.5, -0.4], 0.45, 0.16, 0.04, TEAL);
        }
        spike(mb, [0, 6.55, 1.45], [0, 6.75, 1.95], 0.06, '#f0f4f4', 4);                              // nose horn
        // golden serrated arc rising from the crown
        const arc = curve([[0, 6.62, 0.7], [0.1, 7.3, 0.45], [0.55, 7.9, 0.1], [1.25, 8.1, -0.2], [1.9, 7.85, -0.4]], 3);
        tube(mb, arc, (t) => 0.06 - t * 0.035, GOLD, { sides: 4 });
        for (let i = 1; i < arc.length; i++) { const tg = V.norm(V.sub(arc[i], arc[i - 1])), up = perp(tg, [0, 1, 0]); spike(mb, arc[i], V.add(arc[i], V.add(V.scale(up, 0.18), V.scale(tg, -0.08))), 0.045, GOLD, 3); }
      },
      body: (mb) => {
        // gold chest trim
        tube(mb, [[-0.62, 4.95, 0.62], [-0.3, 4.3, 0.75], [0, 4.1, 0.78], [0.3, 4.3, 0.75], [0.62, 4.95, 0.62]], 0.035, GOLD, { sides: 4 });
        tube(mb, [[0, 4.1, 0.78], [0, 3.4, 0.6]], 0.035, GOLD, { sides: 4 });
      },
    });
    m.height = 11.6;
    return m;
  };

  // ================================================================== ALEXANDER
  // fluted tower column with gold rims (forearms, legs)
  function column(mb, p0, p1, r, n, colA, colB, rim) {
    tube(mb, [p0, p1], r, (t, a, i, k) => k % 3 === 2 ? colB : colA, { sides: n * 3, up: [0, 0, 1], flat: true });
    for (const [p, q] of [[p0, V.lerp(p0, p1, 0.06)], [V.lerp(p0, p1, 0.94), p1]]) tube(mb, [p, q], r * 1.12, rim, { sides: n, up: [0, 0, 1] });
  }
  // ---- Alexander: walking castle in lavender-silver armour (#b8b0d0), huge fluted tower gauntlets, black chest
  // core with purple plates, blue visor, a cluster of spires on the back with red/green/blue/gold onion tips.
  SM.alexander = function () {
    const m = rig();
    const W = '#b8b0d0', Wl = '#d6d0ea', Wd = '#7a7298', DK = '#2a2838', PUR = '#5a3a88', GOLD = '#d8b040', VIS = '#3a6aff';
    boneAt(m, 'body', 'root', [0, 4.2, 0]);
    boneAt(m, 'head', 'body', [0, 7.6, 0.35]);
    boneAt(m, 'armL', 'body', [2.15, 7.0, 0]); boneAt(m, 'armR', 'body', [-2.15, 7.0, 0]);
    boneAt(m, 'thighL', 'body', [1.15, 3.9, 0]); boneAt(m, 'thighR', 'body', [-1.15, 3.9, 0]);
    part(m, 'body', mb => {
      // armoured skirt
      mb.loft([{ y: 3.4, rx: 1.95, rz: 1.35, sq: 3 }, { y: 4.3, rx: 1.7, rz: 1.2, sq: 3 }, { y: 4.9, rx: 1.45, rz: 1.05, sq: 3 }], { sides: 12, color: W });
      mb.loft([{ y: 3.35, rx: 2.0, rz: 1.4, sq: 3 }, { y: 3.5, rx: 2.0, rz: 1.4, sq: 3 }], { sides: 12, color: GOLD });
      // chest: dark core framed by white plates
      mb.loft([
        { y: 4.8, rx: 1.3, rz: 0.95, sq: 4 }, { y: 5.6, rx: 1.55, rz: 1.1, sq: 4 }, { y: 6.6, rx: 1.85, rz: 1.2, sq: 4 },
        { y: 7.3, rx: 1.7, rz: 1.05, sq: 4 }, { y: 7.6, rx: 0.8, rz: 0.7, sq: 4 },
      ], { sides: 12, color: DK });
      for (const s of [1, -1]) {
        mb.push(); mb.translate(s * 0.95, 6.2, 0.95); mb.rotate(-0.15, s * 0.35, s * -0.25);
        mb.panel([[-0.7, -1.2], [0.7, -0.9], [0.8, 0.9], [-0.2, 1.1], [-0.8, 0.4]], 0, 0.22, W, Wd); mb.pop();
        mb.push(); mb.translate(s * 0.95, 6.2, 1.08); mb.rotate(-0.15, s * 0.35, s * -0.25);
        mb.panel([[-0.55, -1.0], [0.55, -0.75], [0.62, 0.72], [-0.2, 0.9], [-0.62, 0.3]], 0, 0.05, PUR); mb.pop();
      }
      tube(mb, [[0, 4.9, 1.1], [0, 6.9, 1.2]], [0.12, 0.08], GOLD, { sides: 4 });
      for (let i = 0; i < 4; i++) ball(mb, [0, 5.1 + i * 0.5, 1.2], [0.22, 0.12, 0.08], i % 2 ? GOLD : PUR, 6, 3);
      // cluster of castle spires on the back: shaft, gold collar, coloured onion dome, silver point
      const spire = (x, z, y1, r, tip) => {
        tube(mb, [[x, 6.2, z], [x, y1, z]], r, (t, a, i, k) => k % 2 ? W : Wl, { sides: 6, cap0: false });
        tube(mb, [[x, y1 - 0.05, z], [x, y1 + 0.1, z]], r * 1.2, GOLD, { sides: 6 });
        ball(mb, [x, y1 + 0.1 + r * 1.1, z], [r * 1.25, r * 1.5, r * 1.25], tip, 6, 4, (i, j) => j < 2 ? sh(tip, 0.2) : tip);
        spike(mb, [x, y1 + 0.1 + r * 2.4, z], [x, y1 + 0.35 + r * 4.2, z], r * 0.5, '#e8e8f4', 4);
      };
      for (const s of [1, -1]) {
        spire(s * 1.35, -0.85, 8.6, 0.4, '#b8a830');        // big outer towers, olive-gold domes
        spire(s * 0.78, -1.15, 8.9, 0.24, '#2a9a94');       // teal
        spire(s * 0.42, -0.8, 8.3, 0.19, '#3a5ad8');        // blue
        spire(s * 1.02, -1.35, 8.2, 0.17, '#3aa048');       // green
      }
      spire(0, -1.2, 9.4, 0.28, '#d02a5a');                  // tall centre spire, red dome
    });
    part(m, 'head', mb => {
      mb.loft([{ y: 7.45, rx: 0.42, rz: 0.4, sq: 3 }, { y: 7.9, rx: 0.48, rz: 0.46, sq: 3 }, { y: 8.35, rx: 0.4, rz: 0.4, sq: 3 }, { y: 8.55, rx: 0.2, rz: 0.24, sq: 3 }], { sides: 8, color: W, z: 0 });
      mb.push(); mb.translate(0, 7.95, 0.5); mb.panel([[-0.36, -0.08], [0.36, -0.08], [0.2, 0.12], [-0.2, 0.12]], 0, 0.06, VIS); mb.pop();
      mb.push(); mb.translate(0, 7.62, 0.46); mb.panel([[-0.22, -0.14], [0.22, -0.14], [0.3, 0.14], [-0.3, 0.14]], 0, 0.06, '#b0b0c8'); mb.pop();
      spike(mb, [0, 8.4, 0.1], [0, 9.3, -0.2], 0.18, W, 4);                                                  // crown spire
      for (const s of [1, -1]) { spike(mb, [s * 0.4, 8.1, 0.2], [s * 0.95, 8.55, 0.1], 0.1, GOLD, 4); spike(mb, [s * 0.3, 8.35, 0.35], [s * 0.45, 8.9, 0.4], 0.07, W, 4); }
    }, null);
    part(m, 'head', mb => { mb.push(); mb.translate(0, 7.95, 0.54); mb.panel([[-0.3, -0.05], [0.3, -0.05], [0.16, 0.08], [-0.16, 0.08]], 0, 0.02, '#8ab4ff'); mb.pop(); }, { unlit: true });
    const arm = (s) => part(m, s > 0 ? 'armL' : 'armR', mb => {
      const sh0 = [s * 2.15, 7.0, 0], el = [s * 2.65, 5.65, 0.35], wr = [s * 2.8, 3.55, 1.2];   // wr = fist (the sequence's beam point)
      ball(mb, [s * 2.3, 7.25, 0], [1.12, 0.86, 1.1], W, 8, 5, (i, j) => j < 2 ? Wl : j > 3 ? Wd : W);      // pauldron
      tube(mb, [[s * 1.7, 7.5, 0.0], [s * 3.35, 7.1, 0.0]], [0.12, 0.95], GOLD, { sides: 6 });
      tube(mb, [sh0, el], 0.54, DK, { sides: 8 });
      ball(mb, el, 0.6, PUR, 6, 4);
      column(mb, el, wr, 1.0, 7, W, DK, GOLD);                                                               // turret forearm, 20% thicker
      tube(mb, [V.lerp(el, wr, 0.45), V.lerp(el, wr, 0.5)], 1.1, GOLD, { sides: 7 });
      mb.rbox(wr[0], wr[1] - 0.5, wr[2] + 0.25, 1.26, 1.2, 1.26, W, 0.3);                                    // fist
      for (let i = 0; i < 4; i++) mb.rbox(wr[0] + (i - 1.5) * 0.3, wr[1] - 1.1, wr[2] + 0.62, 0.26, 0.4, 0.36, Wd, 0.3);
    });
    arm(1); arm(-1);
    const leg = (s) => part(m, s > 0 ? 'thighL' : 'thighR', mb => {
      const x = s * 1.15;
      column(mb, [x, 3.9, 0], [x, 0.6, 0.1], 0.95, 6, W, DK, GOLD);
      for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * PI * 2; mb.box(x + S(a) * 1.02, 2.4, 0.05 + C(a) * 1.02, 0.4, 0.35, 0.4, W); }   // battlements
      mb.loft([{ y: 0, rx: 1.3, rz: 1.5, sq: 3 }, { y: 0.35, rx: 1.3, rz: 1.5, sq: 3 }, { y: 0.65, rx: 1.05, rz: 1.1, sq: 3 }], { sides: 8, color: Wd });
    });
    leg(1); leg(-1);
    m.height = 10.9; m.lungeScale = 0.6;
    return m;
  };

  // ================================================================== PHOENIX
  SM.phoenix = function () {
    const m = rig();
    const inPlane = (d) => [d[1], -d[0], 0];      // blade width axis lying in the wing plane
    const GOLD = '#f0b820', ORG = '#ff7010', RED = '#e01812', PINK = '#c04880', PUR = '#8a2a90';
    boneAt(m, 'body', 'root', [0, 3.5, 0]);
    boneAt(m, 'head', 'body', [0, 4.85, 0.5]);
    boneAt(m, 'tail', 'body', [0, 2.8, -0.35]);
    boneAt(m, 'wingL', 'body', [0.42, 4.1, -0.1]); boneAt(m, 'wingR', 'body', [-0.42, 4.1, -0.1]);
    boneAt(m, 'thighL', 'body', [0.25, 2.9, 0.1]); boneAt(m, 'thighR', 'body', [-0.25, 2.9, 0.1]);
    part(m, 'body', mb => {
      ball(mb, [0, 3.45, 0.08], [0.66, 0.9, 0.62], PINK, 10, 7, (i, j) => j < 2 ? '#e8b0c8' : j < 4 ? PINK : j < 5 ? '#6a2a6a' : '#40a080');
      ball(mb, [0, 3.9, 0.34], [0.5, 0.48, 0.38], '#e8c0d0', 8, 5);
      // rainbow breast feathers
      const rb = ['#30c0a0', '#40a0e0', '#8050d0', '#c040a0'];
      for (let i = 0; i < 8; i++) { const a = (i / 7 - 0.5) * 2.4; mb.blade([S(a) * 0.45, 3.2, 0.2 + C(a) * 0.3], [S(a) * 0.4, -1, 0.3], 0.6, 0.24, 0.05, rb[i % 4]); }
      tube(mb, [[0, 3.95, 0.25], [0, 4.45, 0.42], [0, 4.9, 0.5]], R([0.3, 0.2, 0.16]), (t) => mix('#e8a0b0', GOLD, t), { sides: 7 });
    });
    part(m, 'head', mb => {
      ball(mb, [0, 5.05, 0.56], [0.24, 0.25, 0.3], GOLD, 8, 5);
      tube(mb, curve([[0, 5.05, 0.8], [0, 5.02, 1.02], [0, 4.88, 1.14]], 2), (t) => 0.09 * (1 - t) + 0.01, '#f8e060', { sides: 5 });
      for (const s of [1, -1]) ball(mb, [s * 0.15, 5.1, 0.76], [0.05, 0.05, 0.035], '#3a7aff', 5, 3);
      // plume crest
      for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 1.6; mb.blade([S(a) * 0.08, 5.2, 0.5], [S(a) * 0.8, 1, -0.5 - (i % 2) * 0.4], 0.9 - Math.abs(a) * 0.2, 0.14, 0.04, i % 2 ? RED : GOLD, null, ORG); }
      spike(mb, [0, 5.25, 0.6], [0.05, 6.1, 0.55], 0.04, GOLD, 3);
    }, { unlit: false });
    const wing = (s) => {
      const b = 'wing' + (s > 0 ? 'L' : 'R');
      const sh0 = [s * 0.42, 4.1, -0.1], el = [s * 1.35, 4.9, -0.25], wr = [s * 2.2, 5.5, -0.35], tip = [s * 3.0, 6.3, -0.4];
      part(m, b, mb => {
        tube(mb, [sh0, el, wr, tip], R([0.16, 0.12, 0.09, 0.03]), GOLD, { sides: 5 });
        // rainbow secondaries near the body, golden coverts along the arm
        const rb = ['#30c090', '#40a8e0', '#7a50d8', '#c03aa0', '#e05050'];
        for (let i = 0; i < 6; i++) { const p = V.lerp(sh0, el, 0.1 + i * 0.16); mb.blade(p, [s * 0.35, -1, -0.15], 1.2 - i * 0.06, 0.45, 0.05, rb[i % 5], inPlane([s * 0.35, -1, 0]), sh(rb[i % 5], 0.3)); }
        for (let i = 0; i < 9; i++) { const p = V.lerp(sh0, wr, 0.15 + i * 0.1); mb.blade(p, [s * (0.5 + i * 0.1), -1, -0.3], 1.6 + i * 0.08, 0.5, 0.05, i % 2 ? GOLD : '#f8d040', inPlane([s * (0.5 + i * 0.1), -1, 0]), ORG); }
      });
      part(m, b, mb => {   // flame-like primaries, upswept
        for (let i = 0; i < 11; i++) {
          const t = i / 10, p = V.lerp(el, tip, t * 0.9);
          const ang = 1.9 - t * 1.9;                          // from straight up to outward-down
          const dir = [s * (0.3 + S(t * PI / 2) * 1.2), C(t * 1.6) * 1.2 + 0.1 - t * 0.5, -0.25];
          mb.blade(p, dir, 2.2 + S(t * PI) * 1.2, 0.9, 0.06, i % 2 ? ORG : '#ff8a20', inPlane(dir), i % 3 ? RED : '#ff3010');
          if (i % 2 === 0) { const d2 = [dir[0] * 1.2, dir[1] * 0.8 + 0.4, -0.3]; mb.blade(V.add(p, [0, 0.1, -0.1]), d2, 1.5 + S(t * PI) * 0.6, 0.6, 0.05, RED, inPlane(d2), '#ff4020'); }
          // jagged flame tongues licking out past the feather tips
          if (i > 1) { const d3 = [dir[0] * 1.1 + s * 0.15 * (i % 2 ? 1 : -1), dir[1] * 1.1 + (i % 2 ? 0.35 : -0.2), -0.28]; mb.blade(V.add(p, [0, 0.05, -0.05]), d3, 2.4 + S(t * PI) * 0.9 + (i % 3) * 0.25, 0.36, 0.04, '#ff6a10', inPlane(d3), '#ff2008'); }
        }
      }, { unlit: true });
    };
    wing(1); wing(-1);
    part(m, 'tail', mb => {
      // five long ribbon plumes streaming down and back, each curling up into a loop at the end
      const cols = [[PUR, '#d040a0'], [ORG, RED], ['#d040a0', PUR], [GOLD, ORG], [PUR, '#40a0e0']];
      for (let i = 0; i < 5; i++) {
        const u = i - 2, sg = u ? Math.sign(u) : 1, x = u * 0.4, zz = -1.3 - Math.abs(u) * 0.25;
        const pts = curve([[u * 0.08, 2.9, -0.3], [x * 0.6, 2.2, -0.75], [x * 1.2, 1.3, zz], [x * 1.6, 0.45, zz + 0.1], [x * 1.6 + sg * 0.35, 0.05, zz + 0.4], [x * 1.6 + sg * 0.62, 0.3, zz + 0.62], [x * 1.6 + sg * 0.42, 0.55, zz + 0.45], [x * 1.6 + sg * 0.2, 0.4, zz + 0.3]], 2);
        tube(mb, pts, (t) => [0.14 * (1 - t * 0.55), 0.03], (t) => mix(cols[i][0], cols[i][1], t), { sides: 4, up: [0, 0, 1] });
      }
      for (let i = 0; i < 5; i++) mb.blade([0, 2.95, -0.3], [(i - 2) * 0.3, -0.8, -1], 1.3, 0.3, 0.05, i % 2 ? PINK : GOLD, null, ORG);
    });
    const leg = (s) => part(m, s > 0 ? 'thighL' : 'thighR', mb => {
      const a = [s * 0.25, 2.95, 0.1], b = [s * 0.32, 2.35, 0.3], c = [s * 0.3, 1.85, 0.2];
      tube(mb, [a, b, c], R([0.1, 0.07, 0.06]), GOLD, { sides: 5 });
      for (let i = -1; i <= 1; i++) spike(mb, c, V.add(c, [i * 0.14, -0.35, 0.18]), 0.04, '#f8e8a0', 4);
    });
    leg(1); leg(-1);
    m.floats = true; m.height = 8.1; m.lungeScale = 1.5;
    return m;
  };

  // ================================================================== HADES
  // ---- Hades: skull in a deep, tall black hood (red lining round the face), a leather collar strap with a
  // big buckle under the jaw, dark crimson robe (#6a1810) with a red cowl and gold studs, dark sleeves; the
  // cauldron in front.
  SM.hades = function () {
    const m = rig();
    const ROBE = '#6a1810', ROBEd = '#2a0c08', HOOD = '#161214', SLV = '#2c2628', BONE = '#e8d49a', GOLD = '#c8a030', POT = '#2e3628', POTl = '#48523c', BASE = '#6a5428';
    const Z = -0.9;
    boneAt(m, 'body', 'root', [0, 2.6, Z]);
    boneAt(m, 'head', 'body', [0, 4.45, Z + 0.05]);
    boneAt(m, 'jaw', 'head', [0, 4.62, Z + 0.28]);
    boneAt(m, 'armL', 'body', [0.72, 4.15, Z]); boneAt(m, 'armR', 'body', [-0.72, 4.15, Z]);
    boneAt(m, 'cauldron', 'root', [0, 0, 0.9]);
    part(m, 'body', mb => {
      mb.loft([
        { y: 0.0, rx: 0.95, rz: 0.8, z: Z }, { y: 1.2, rx: 0.8, rz: 0.66, z: Z }, { y: 2.5, rx: 0.72, rz: 0.55, z: Z },
        { y: 3.6, rx: 0.74, rz: 0.52, z: Z }, { y: 4.15, rx: 0.8, rz: 0.46, z: Z }, { y: 4.4, rx: 0.3, rz: 0.28, z: Z },
      ].map((r, i) => Object.assign(r, { color: [ROBEd, ROBEd, sh(ROBE, -0.35), ROBE, ROBE, ROBE][i] })), { sides: 10, color: ROBE });
      // red scarf with gold studs
      tube(mb, curve([[-0.45, 4.2, Z + 0.15], [-0.25, 3.95, Z + 0.45], [0, 3.9, Z + 0.5], [0.25, 3.95, Z + 0.45], [0.45, 4.2, Z + 0.15]], 2), 0.12, '#8a2014', { sides: 5 });
      for (const s of [1, -1]) ball(mb, [s * 0.28, 3.85, Z + 0.5], 0.05, GOLD, 5, 3);
      quad2(mb, [-0.3, 3.9, Z + 0.52], [0.3, 3.9, Z + 0.52], [0.25, 3.2, Z + 0.55], [-0.25, 3.2, Z + 0.55], '#7a1c12', ROBEd);
      ball(mb, [0, 3.3, Z + 0.56], [0.06, 0.08, 0.03], GOLD, 4, 3);
      // the black hood drapes down over the shoulders
      for (const s of [1, -1]) quad2(mb, [s * 0.3, 4.45, Z - 0.3], [s * 0.62, 4.3, Z - 0.1], [s * 0.78, 3.7, Z - 0.15], [s * 0.4, 3.6, Z - 0.45], HOOD, sh(HOOD, 0.1));
    });
    part(m, 'head', mb => {
      // deep black hood, tall and pointed, red lining framing the skull
      ball(mb, [0, 4.86, Z - 0.1], [0.48, 0.58, 0.46], HOOD, 8, 6);
      spike(mb, [0, 5.2, Z - 0.18], [0, 5.72, Z - 0.34], 0.3, HOOD, 5);
      ball(mb, [0, 4.8, Z + 0.04], [0.3, 0.37, 0.28], '#6a140c', 7, 5);
      for (const s of [1, -1]) {
        quad2(mb, [s * 0.1, 5.42, Z + 0.24], [s * 0.42, 5.1, Z + 0.34], [s * 0.5, 4.25, Z + 0.28], [s * 0.26, 4.28, Z + 0.3], HOOD, '#5a120a');
        quad2(mb, [s * 0.42, 5.1, Z + 0.34], [s * 0.52, 5.0, Z - 0.1], [s * 0.6, 4.2, Z - 0.1], [s * 0.5, 4.25, Z + 0.28], HOOD, sh(HOOD, 0.08));
      }
      mb.tri([-0.1, 5.42, Z + 0.24], [0.1, 5.42, Z + 0.24], [0, 5.52, Z + 0.05], HOOD);
      // leather collar strap with a big buckle under the jaw
      mb.loft([{ y: 4.36, rx: 0.3, rz: 0.27, z: Z + 0.06 }, { y: 4.52, rx: 0.28, rz: 0.26, z: Z + 0.06 }], { sides: 8, color: '#3c3634' });
      mb.box(0, 4.44, Z + 0.33, 0.2, 0.15, 0.05, '#a8a498'); mb.box(0, 4.44, Z + 0.355, 0.1, 0.07, 0.02, '#3c3634');
      // skull
      ball(mb, [0, 4.82, Z + 0.18], [0.19, 0.22, 0.19], BONE, 8, 5);
      for (const s of [1, -1]) { ball(mb, [s * 0.075, 4.84, Z + 0.34], [0.055, 0.05, 0.03], '#140a08', 5, 3); ball(mb, [s * 0.075, 4.84, Z + 0.36], 0.018, '#ff3010', 4, 3); }
      ball(mb, [0, 4.74, Z + 0.36], [0.03, 0.03, 0.02], '#281810', 4, 3);
      for (let i = -2; i <= 2; i++) mb.box(i * 0.045, 4.66, Z + 0.34, 0.035, 0.05, 0.03, '#f4ecc8');
    });
    part(m, 'jaw', mb => { ball(mb, [0, 4.58, Z + 0.28], [0.13, 0.06, 0.1], BONE, 6, 3); for (let i = -2; i <= 2; i++) mb.box(i * 0.04, 4.62, Z + 0.35, 0.03, 0.04, 0.03, '#f4ecc8'); mb.box(0, 4.52, Z + 0.37, 0.16, 0.06, 0.03, GOLD); });
    const arm = (s) => part(m, s > 0 ? 'armL' : 'armR', mb => {
      const sh0 = [s * 0.72, 4.15, Z], el = [s * 1.45, 4.75, Z + 0.1], wr = [s * 2.05, 5.5, Z + 0.2];
      tube(mb, [sh0, el, V.lerp(el, wr, 0.6)], R([0.3, 0.4, 0.52]), (t, a) => C(a) > 0 ? SLV : ROBE, { sides: 8, up: [0, 1, 0], cap1: false });
      // drooping sleeve drape (dark outside, crimson lining)
      const top = [sh0, V.lerp(sh0, el, 0.5), el, V.lerp(el, wr, 0.6)];
      const bot = top.map((p, i) => V.add(p, [s * 0.1 * i, -0.6 - i * 0.35, -0.05]));
      sheet(mb, top, bot, (t) => mix(SLV, '#1c1818', t), ROBE);
      tube(mb, [V.lerp(el, wr, 0.5), wr], 0.08, '#5a1a10', { sides: 5 });
      hand(mb, wr, [s * 0.4, 1, 0.15], 0.34, '#6a2412', { claw: '#e04020', clawLen: 0.2, curl: 0.35, spread: 0.6, thumbSide: s, side: [0, 0, 1] });
    });
    arm(1); arm(-1);
    part(m, 'cauldron', mb => {
      mb.rbox(0, 0.45, 0.9, 2.8, 0.9, 2.3, BASE, 0.12);
      mb.loft([{ y: 0.88, rx: 1.42, rz: 1.18, sq: 4 }, { y: 0.96, rx: 1.42, rz: 1.18, sq: 4 }], { sides: 8, color: '#a89060' });
      mb.push(); mb.translate(0, 0, 0.9);
      mb.loft([
        { y: 0.9, rx: 1.05, rz: 0.95 }, { y: 1.3, rx: 1.35, rz: 1.2 }, { y: 1.8, rx: 1.3, rz: 1.15 },
        { y: 2.2, rx: 1.0, rz: 0.9 }, { y: 2.35, rx: 0.95, rz: 0.85 }, { y: 2.4, rx: 1.2, rz: 1.05 }, { y: 2.55, rx: 1.2, rz: 1.05 },
      ].map((r, i) => Object.assign(r, { color: i === 5 || i === 6 ? '#3a3020' : i === 2 ? POTl : POT })), { sides: 12, color: POT });
      mb.box(-0.3, 1.9, 1.12, 0.6, 0.35, 0.05, '#101410');
      for (const s of [1, -1]) tube(mb, curve([[s * 1.28, 2.05, -0.3], [s * 1.7, 1.95, -0.2], [s * 1.8, 1.7, 0], [s * 1.7, 1.45, 0.2], [s * 1.3, 1.4, 0.3]], 2), 0.07, GOLD, { sides: 5 });
      mb.pop();
    });
    dampArms(m, 0.25);
    m.height = 5.75; m.lungeScale = 0.4;
    return m;
  };

  // ================================================================== TYPHOON
  // ---- Typhoon: lumpy magenta S-shaped body with two point-mirrored faces (the front face top-front, the
  // second one upside down on the lower back, so a half somersault swaps them). Each face: a long snout
  // (upper jaw, angry eyes on top, a row of yellow teeth on an orange lip), a gaping purple maw whose lower
  // jaw is the chest, orange lips; orange-red horns and green spiky ear tufts on the front face. A pair of
  // clawed arms per face, dark branch-like limbs on the upper back, a short tail under the belly.
  SM.typhoon = function () {
    const m = rig();
    const PK = '#d03c88', PKl = '#e868a8', PKd = '#8a2058', ORG = '#e88030', MAW = '#3c1458', TOOTH = '#ecd828', GRN = '#48a060', GRNl = '#84d070', BR = '#3a2a14', BRt = '#6a5a2a';
    const CY = 3.2;                                                                    // body centre = somersault pivot
    const flipXf = (mb) => { mb.translate(0, CY * 2, 0); mb.rotate(PI, 0, 0); };        // (x, y, z) -> (x, 2CY - y, -z)
    boneAt(m, 'body', 'root', [0, CY, 0]);
    boneAt(m, 'head', 'body', [0, 4.25, 0.5]);
    boneAt(m, 'jaw', 'head', [0, 3.72, 0.55]);
    boneAt(m, 'armL', 'body', [1.2, 3.75, 0.1]); boneAt(m, 'armR', 'body', [-1.2, 3.75, 0.1]);
    boneAt(m, 'tail', 'body', [0, 1.95, 0.45]);
    // skin by (authored, front-face) position: orange belly under the front maw, lighter crown
    const skinAt = (p) => {
      if (p[2] > 0.15 && p[1] < 2.95 && p[1] > 1.7) return mix(PK, ORG, Math.min(1, (2.95 - p[1]) * 1.6) * Math.min(1, (p[2] - 0.15) * 2.2));
      return p[1] > 4.35 ? PKl : PK;
    };
    const skinFn = (i, j, p) => skinAt(p);
    // snout (upper jaw): centreline + [rx, ry] per point; sn(t) interpolates it (t 0 = base, 1 = tip)
    const SNP = [[0, 4.32, 0.8], [0, 4.22, 1.45], [0, 4.06, 2.0], [0, 3.92, 2.42]], SNR = [[0.68, 0.46], [0.6, 0.4], [0.5, 0.33], [0.36, 0.24]];
    const sn = (t) => { const f = Math.min(2.999, t * 3), i = Math.floor(f), u = f - i; return { c: V.lerp(SNP[i], SNP[i + 1], u), rx: SNR[i][0] + (SNR[i + 1][0] - SNR[i][0]) * u, ry: SNR[i][1] + (SNR[i + 1][1] - SNR[i][1]) * u }; };
    const head = (mb, back) => {
      ball(mb, [0, 4.4, 0.5], [0.92, 0.74, 0.82], PK, back ? 8 : 10, back ? 5 : 6, (i, j) => j < 2 ? PKl : PK);                         // skull
      tube(mb, SNP, R(SNR), (t, a) => C(a) < -0.6 ? MAW : C(a) < -0.15 ? ORG : C(a) > 0.55 ? PKl : PK, { sides: 8, up: [0, 1, 0], cap1: false });
      ball(mb, [0, 3.95, 2.42], [0.37, 0.25, 0.18], PK, back ? 5 : 6, back ? 3 : 4, (i, j) => j > 2 ? ORG : PK);   // nose
      for (const s of [1, -1]) {
        ball(mb, [s * 0.13, 4.08, 2.55], [0.05, 0.03, 0.03], '#401030', 4, 3);                                      // nostril
        // row of yellow teeth along the lip of the snout
        for (let k = 0; k < 7; k += back ? 2 : 1) {
          const q = sn(0.18 + k * 0.12), b = V.add(q.c, [s * q.rx * 0.8, -q.ry * 0.55, 0]);
          spike(mb, b, V.add(b, [-s * 0.03, -0.3 + k * 0.015, 0.03]), 0.07, TOOTH, 3);
        }
        spike(mb, [s * 0.12, 3.82, 2.46], [s * 0.1, 3.56, 2.5], 0.06, TOOTH, 3);
        // angry eyes on top of the snout, heavy brow slanting down to the middle
        ball(mb, [s * 0.3, 4.6, 1.2], [0.16, 0.075, 0.11], '#fff2c8', 6, 4);
        ball(mb, [s * 0.31, 4.62, 1.29], [0.055, 0.05, 0.03], '#101010', 4, 3);
        tube(mb, [[s * 0.1, 4.66, 1.36], [s * 0.3, 4.73, 1.28], [s * 0.52, 4.86, 1.05]], R([0.06, 0.075, 0.05]), PKd, { sides: 4 });
        // green spiky ear tufts
        for (let k = 0; k < 5; k += back ? 2 : 1) { const d = V.norm([s * 0.9, 0.62 - k * 0.3, -0.15 - (k % 2) * 0.2]); mb.blade([s * 0.84, 4.58, 0.26], d, 0.68 - Math.abs(k - 2) * 0.06, 0.26, 0.05, k % 2 ? GRN : GRNl, V.cross(d, [0, 0, 1]), '#b8f0a0'); }
        if (!back) horn(mb, [[s * 0.5, 4.8, 0.35], [s * 0.85, 5.25, 0.3], [s * 1.25, 5.85, 0.2], [s * 1.55, 6.45, 0.05]], 0.28, ORG, '#c01810', 5, 2);
      }
    };
    // lower jaw = the chest: purple mouth floor, orange U-shaped lip lined with teeth
    const lowerJaw = (mb) => {
      const lip = curve([[0.78, 3.74, 0.52], [0.8, 3.2, 1.0], [0.58, 2.82, 1.5], [0, 2.66, 1.78], [-0.58, 2.82, 1.5], [-0.8, 3.2, 1.0], [-0.78, 3.74, 0.52]], 2);
      ball(mb, [0, 2.75, 1.08], [0.86, 0.5, 0.78], ORG, 8, 5, (i, j) => j < 2 ? MAW : j < 3 ? mix(ORG, PK, 0.25) : mix(ORG, PK, 0.5));
      tube(mb, lip, 0.12, '#e07028', { sides: 5 });
      for (let k = 1; k < lip.length - 1; k++) { const p = lip[k]; spike(mb, V.add(p, [0, 0.08, 0]), V.add(p, [-p[0] * 0.1, 0.36, -0.05]), 0.07, TOOTH, 3); }
    };
    const throat = (mb) => ball(mb, [0, 3.45, 0.92], [0.74, 0.62, 0.42], MAW, 8, 5);
    const armGeo = (mb, s) => {
      const sh0 = [s * 1.2, 3.75, 0.1], el = [s * 2.05, 3.95, 0.3], wr = [s * 2.55, 4.4, 0.4];
      ball(mb, sh0, [0.52, 0.5, 0.52], PK, 6, 4);
      tube(mb, [sh0, V.lerp(sh0, el, 0.5), el, wr], R([0.42, 0.36, 0.3, 0.22]), PK, { sides: 6 });
      hand(mb, wr, [s * 0.55, 0.85, 0.2], 0.8, PK, { claw: TOOTH, clawLen: 0.3, curl: 0.3, spread: 0.7, thumbSide: s, side: [0, 0, 1], fingers: 3 });
    };
    part(m, 'body', mb => {
      // S-shaped mass: central body, a hump rising into the front head, the mirrored hump under the back face
      ball(mb, [0, CY, 0], [1.35, 1.45, 1.2], PK, 10, 7, skinFn);
      ball(mb, [0, 4.0, 0.45], [1.05, 0.8, 0.85], PK, 10, 6, skinFn);
      for (const s of [1, -1]) ball(mb, [s * 0.95, 2.5, 0.35], [0.6, 0.62, 0.7], PK, 6, 4, skinFn);             // haunches
      throat(mb);
      // dark branch-like limbs on the upper back
      for (const s of [1, -1]) {
        horn(mb, [[s * 0.45, 4.25, -0.85], [s * 0.8, 4.85, -1.35], [s * 1.25, 5.2, -1.95], [s * 1.75, 5.1, -2.5]], 0.17, BR, BRt, 5, 2);
        horn(mb, [[s * 0.8, 4.85, -1.35], [s * 0.95, 5.5, -1.6], [s * 0.9, 6.0, -2.0]], 0.1, BR, BRt, 4, 1);
        horn(mb, [[s * 1.25, 5.2, -1.95], [s * 1.75, 5.55, -2.0], [s * 2.1, 5.9, -1.85]], 0.08, BR, BRt, 4, 1);
      }
      // the second face (and its arms), upside down on the lower back
      mb.push(); flipXf(mb);
      ball(mb, [0, 4.0, 0.45], [1.05, 0.8, 0.85], PK, 8, 5);
      throat(mb); head(mb, true); lowerJaw(mb);
      mb.push(); mb.translate(0, 3.75, 0.1); mb.scale(0.85); mb.translate(0, -3.75, -0.1); armGeo(mb, 1); armGeo(mb, -1); mb.pop();
      mb.pop();
    });
    part(m, 'head', mb => head(mb, false));
    part(m, 'jaw', mb => lowerJaw(mb));
    part(m, 'armL', mb => armGeo(mb, 1)); part(m, 'armR', mb => armGeo(mb, -1));
    part(m, 'tail', mb => {
      const pts = curve([[0, 1.95, 0.45], [0.35, 1.45, 0.7], [0.85, 1.2, 0.75], [1.3, 1.35, 0.5], [1.5, 1.7, 0.25]], 2);
      tube(mb, pts, (t) => 0.32 * (1 - t) + 0.05, (t) => mix(PK, ORG, t * 0.8), { sides: 6 });
      for (let i = 2; i < pts.length - 1; i += 2) spike(mb, V.add(pts[i], [0, 0.2 * (1 - i / pts.length) + 0.04, 0]), V.add(pts[i], [0.05, 0.4 * (1 - i / pts.length) + 0.15, -0.05]), 0.05, TOOTH, 3);
      for (let i = 0; i < 3; i++) mb.blade([1.5, 1.7, 0.25], [0.5, 0.8, -0.3 + (i - 1) * 0.5], 0.4, 0.16, 0.03, i % 2 ? GRN : GRNl);
    });
    dampArms(m, 0.3);
    m.floats = true; m.height = 6.5; m.lungeScale = 1.2;
    return m;
  };
  // ================================================================== KNIGHTS OF THE ROUND
  // ---- Knights of the Round: 13 distinct knights on one rig (body head armL armR thighL thighR). As in FF7
  // each knight has its own armour and weapon: five builds (sword paladin, axeman, lancer with trident/spear,
  // priest with a ring mace, halberdier) in different palettes, and the 13th, the crowned King with the huge
  // two-handed sword and the wide red cape. Helms with a visor slit and yellow eyes, big layered pauldrons,
  // lavender shading on light armour. Every weapon is held in both hands in front of the chest, point down,
  // so the sequence's arm raise lifts it overhead and the swing chops it down.
  //   FF7.summons3d.knights_of_round({ knight: i })  -> knight i (0..12, 12 = the King)
  //   m.setKnight(i)                                  -> swap to knight i (meshes built on first use, cached)
  const KOTR = [
    { a: '#d0d0e6', al: '#f0f0fa', ad: '#8c86b4', robe: '#e4e2f2', robe2: '#a8a2cc', cape: '#b41a22', trim: '#d8a830', helm: 'crest', weapon: 'sword', body: 'coat' },
    { a: '#3a4262', al: '#5c668e', ad: '#1c2034', robe: '#2a2e48', robe2: '#8a7aa8', cape: '#5a2a78', trim: '#d8b048', helm: 'visor', weapon: 'axe', body: 'tabard', bulk: 1.3 },
    { a: '#b82a1c', al: '#e05030', ad: '#5a1410', robe: '#8a1c14', robe2: '#3a0c08', cape: '#1c1a20', trim: '#e8a020', helm: 'hair', weapon: 'trident', body: 'coat' },
    { a: '#d8d0b8', al: '#f4ecd8', ad: '#948a70', robe: '#e8e0c8', robe2: '#b02838', cape: '#6a2a8a', trim: '#e0b030', helm: 'mitre', weapon: 'mace', body: 'robe', eye: '#40ff90' },
    { a: '#34385a', al: '#58608c', ad: '#181a2c', robe: '#2a1c3a', robe2: '#8a1c2a', cape: '#1c5a34', trim: '#9a90c0', helm: 'plume', weapon: 'halberd', body: 'robe', bulk: 1.1 },
    { a: '#a8b8d8', al: '#dce6f6', ad: '#5a6a98', robe: '#c0cce4', robe2: '#6a78a8', cape: '#2a4aa8', trim: '#e0c060', helm: 'crest', weapon: 'sword', body: 'coat', bulk: 1.1 },
    { a: '#c89a30', al: '#f0c860', ad: '#6a4a14', robe: '#3a3020', robe2: '#6a5a3a', cape: '#2a2a2a', trim: '#f4e0a0', helm: 'horned', weapon: 'axe', body: 'tabard', bulk: 1.25 },
    { a: '#2a2a30', al: '#4c4c58', ad: '#141418', robe: '#b8a47a', robe2: '#6a3a8a', cape: '#a01c1c', trim: '#c8b060', helm: 'horned', weapon: 'spear', body: 'robe' },
    { a: '#e8e4ec', al: '#ffffff', ad: '#a09aa8', robe: '#c02a24', robe2: '#f0ece0', cape: '#206a30', trim: '#e0b030', helm: 'mitre', weapon: 'mace', body: 'robe' },
    { a: '#6a7468', al: '#9aa498', ad: '#343a34', robe: '#3a4238', robe2: '#8a9a84', cape: '#6a1c2a', trim: '#c0b070', helm: 'plume', weapon: 'halberd', body: 'coat', bulk: 1.1 },
    { a: '#3a3440', al: '#5e566a', ad: '#1a161e', robe: '#2a2430', robe2: '#6a5a78', cape: '#c01c2c', trim: '#c8a040', helm: 'visor', weapon: 'sword', body: 'coat', bulk: 1.15 },
    { a: '#6a4a9a', al: '#9a7ac8', ad: '#34204c', robe: '#4a2a6a', robe2: '#2a1840', cape: '#d8c040', trim: '#f0d060', helm: 'hair', weapon: 'spear', body: 'coat' },
    { a: '#d4d2e8', al: '#f4f4fc', ad: '#8a84b8', robe: '#e0def0', robe2: '#a8a2cc', cape: '#a01822', trim: '#e0b030', helm: 'crown', weapon: 'kingsword', body: 'coat', bulk: 1.3, king: true },
  ];
  function knightParts(m, K) {
    const AR = K.a, ARl = K.al, ARd = K.ad, TR = K.trim, EYE = K.eye || '#ffe020', bulk = K.bulk || 1, king = !!K.king;
    const armFn = (t, a) => C(a) > 0.5 ? ARl : C(a) < -0.3 ? ARd : AR;              // light top, lavender/dark shadow side
    const hy = king ? 2.78 : 2.62;                                                    // grip height (hands on the hilt)
    part(m, 'body', mb => {
      const bw = 0.9 + bulk * 0.1;
      mb.loft([
        { y: 1.85, rx: 0.36, rz: 0.26, color: ARd }, { y: 2.02, rx: 0.35, rz: 0.25, color: TR }, { y: 2.14, rx: 0.34, rz: 0.25, color: ARd },
        { y: 2.5, rx: 0.4 * bw, rz: 0.29, color: AR }, { y: 2.9, rx: 0.52 * bw, rz: 0.34, color: ARl }, { y: 3.12, rx: 0.52 * bw, rz: 0.31, color: AR }, { y: 3.28, rx: 0.18, rz: 0.16, color: ARd },
      ], { sides: 10, color: AR });
      ball(mb, [0, 2.8, 0.2], [0.34 * bw, 0.3, 0.15], ARl, 8, 4, (i, j) => j > 2 ? AR : ARl);          // breastplate
      ball(mb, [0, 2.8, 0.34], [0.08, 0.1, 0.04], TR, 5, 3);                                          // emblem
      if (king) {   // navy belly plate, rust-orange chest guards
        ball(mb, [0, 2.3, 0.2], [0.3, 0.2, 0.12], '#28285a', 7, 4);
        for (const s of [1, -1]) ball(mb, [s * 0.3, 2.92, 0.24], [0.14, 0.1, 0.08], '#a0501c', 5, 3);
      }
      // skirt: long split coat / closed robe / short plated tabard
      if (K.body === 'robe') {
        mb.loft([{ y: 2.08, rx: 0.37, rz: 0.28 }, { y: 1.3, rx: 0.5, rz: 0.38 }, { y: 0.2, rx: 0.7, rz: 0.52 }], { sides: 10, color: K.robe, capTop: false });
        quad2(mb, [-0.1, 2.02, 0.29], [0.1, 2.02, 0.29], [0.16, 0.22, 0.53], [-0.16, 0.22, 0.53], K.robe2, sh(K.robe2, -0.3));
      } else if (K.body === 'tabard') {
        mb.loft([{ y: 2.08, rx: 0.4, rz: 0.3 }, { y: 1.55, rx: 0.56, rz: 0.4 }, { y: 1.25, rx: 0.6, rz: 0.43 }], { sides: 10, color: ARd, capTop: false });
        mb.loft([{ y: 1.9, rx: 0.42, rz: 0.31 }, { y: 1.62, rx: 0.52, rz: 0.37 }], { sides: 10, color: AR, capTop: false, capBottom: false });
        quad2(mb, [-0.24, 2.0, 0.33], [0.24, 2.0, 0.33], [0.2, 0.85, 0.46], [-0.2, 0.85, 0.46], K.robe, sh(K.robe, -0.3));
        mb.tri([-0.2, 0.85, 0.46], [0.2, 0.85, 0.46], [0, 0.65, 0.47], K.robe);
      } else {
        const top = [], bot = [];
        for (let i = 0; i <= 12; i++) { const a = 0.35 + i / 12 * (PI * 2 - 0.7); top.push([S(a) * 0.4, 2.02, C(a) * 0.3]); bot.push([S(a) * 0.95, 0.28, C(a) * 0.72 - 0.05]); }
        sheet(mb, top, bot, (t) => mix(K.robe, K.robe2, Math.abs(t - 0.5) * 1.2), sh(K.robe2, -0.2));
      }
      // cape (the King's spreads wide behind him)
      const ct = [[-0.6, 3.15, -0.3], [-0.3, 3.2, -0.35], [0, 3.22, -0.36], [0.3, 3.2, -0.35], [0.6, 3.15, -0.3]];
      const cb = king ? [[-2.1, 1.35, -1.0], [-1.1, 0.4, -1.1], [0, 0.3, -1.1], [1.1, 0.4, -1.1], [2.1, 1.35, -1.0]] : [[-0.95, 0.3, -0.8], [-0.5, 0.25, -0.95], [0, 0.25, -1.0], [0.5, 0.25, -0.95], [0.95, 0.3, -0.8]];
      sheet(mb, ct, cb, (t) => mix(K.cape, sh(K.cape, 0.12), Math.abs(t - 0.5) * 2), sh(K.cape, -0.35));
    });
    part(m, 'head', mb => {
      const hs = king ? 1.2 : 1;                                                     // the King's helm is bigger
      tube(mb, [[0, 3.22, 0], [0, 3.38, 0.02]], 0.1, ARd, { sides: 6 });
      ball(mb, [0, 3.52, 0.02], [0.2 * hs, 0.23 * hs, 0.22 * hs], AR, 8, 5, (i, j) => j < 2 ? ARl : AR);     // helm
      ball(mb, [0, 3.46, 0.14], [0.155 * hs, 0.16 * hs, 0.11 * hs], ARl, 7, 4);                             // face guard
      const fz = 0.02 + 0.22 * hs;
      mb.box(0, 3.53, fz, 0.27 * hs, 0.05, 0.035, '#100c16');                                             // visor slit
      for (const s of [1, -1]) mb.box(s * 0.065 * hs, 3.53, fz + 0.02, 0.055, 0.022, 0.01, EYE);             // yellow eyes
      const H = K.helm;
      if (H === 'crest') {          // rolled white crest over the helm
        tube(mb, curve([[-0.24, 3.55, 0.0], [-0.2, 3.76, 0.02], [0, 3.84, 0.04], [0.2, 3.76, 0.02], [0.24, 3.55, 0.0]], 2), 0.1, '#f4f4fc', { sides: 6 });
        ball(mb, [0, 3.72, -0.08], [0.2, 0.12, 0.18], '#f4f4fc', 6, 4);
      } else if (H === 'visor') {   // plain great helm with a raised ridge
        tube(mb, [[0, 3.62, 0.2], [0, 3.8, 0.02], [0, 3.72, -0.2]], R([0.04, 0.06, 0.04]), TR, { sides: 4 });
        for (const s of [1, -1]) spike(mb, [s * 0.18, 3.6, -0.02], [s * 0.34, 3.72, -0.14], 0.05, ARl, 4);
      } else if (H === 'horned') {
        for (const s of [1, -1]) horn(mb, [[s * 0.14, 3.64, 0.02], [s * 0.34, 3.76, 0.0], [s * 0.44, 4.0, -0.04], [s * 0.4, 4.22, -0.1]], 0.075, '#1c1a20', '#5a5060', 5, 2);
      } else if (H === 'plume') {   // two big pale wing plumes
        for (const s of [1, -1]) {
          mb.blade([s * 0.12, 3.68, -0.04], [s * 0.45, 1, -0.45], 0.85, 0.3, 0.05, '#dcdcc8', [0, 0, 1], '#9aa08a');
          mb.blade([s * 0.14, 3.62, -0.1], [s * 0.7, 0.6, -0.6], 0.6, 0.22, 0.04, '#c4c8b0', [0, 0, 1]);
        }
      } else if (H === 'hair') {    // gold mane swept back from the helm
        for (let i = 0; i < 6; i++) { const u = (i / 5 - 0.5); mb.blade([u * 0.3, 3.66 - Math.abs(u) * 0.1, -0.08], [u * 1.2, 0.35 - (i % 2) * 0.3, -1], 0.62, 0.16, 0.04, '#e8c040', null, '#fff0a0'); }
      } else if (H === 'mitre') {   // tall mitre helm
        tube(mb, [[0, 3.62, 0.0], [0, 3.9, -0.02], [0, 4.22, -0.08]], R([[0.19, 0.18], [0.15, 0.13], [0.02, 0.02]]), K.robe, { sides: 6 });
        tube(mb, [[0, 3.62, 0.0], [0, 3.68, 0.0]], 0.2, TR, { sides: 6 });
      } else if (H === 'crown') {   // the King: broad angled brow flaps, gold crown of spiky hair
        for (const s of [1, -1]) {
          mb.blade([s * 0.2, 3.6, 0.1], [s * 1, 0.35, -0.25], 0.36, 0.2, 0.05, ARl, [0, 1, 0.3], AR);
          mb.blade([s * 0.07, 3.62, 0.27], [s * 1, 0.5, 0], 0.2, 0.05, 0.04, '#c01820');                     // red brow mark
        }
        for (let i = 0; i < 7; i++) { const u = i / 6 - 0.5; mb.blade([u * 0.3, 3.74, -0.02 - Math.abs(u) * 0.1], [u * 1.4, 1, -0.25 - Math.abs(u) * 0.3], 0.46 - Math.abs(u) * 0.2, 0.14, 0.05, '#e8b820', null, '#fff080'); }
      }
    });
    const arm = (s) => part(m, s > 0 ? 'armL' : 'armR', mb => {
      const P = king ? 1.5 : 1.12 + (bulk - 1) * 0.5;                                 // pauldron scale
      const sh0 = [s * 0.52, 3.05, 0], el = [s * 0.64, 2.56, 0.2], wr = [s * 0.14, hy, 0.42];
      // big layered pauldron
      ball(mb, [s * (0.56 + 0.06 * P), 3.16, 0], [0.3 * P, 0.2 * P, 0.3 * P], AR, 8, 4, (i, j) => j < 2 ? ARl : AR);
      ball(mb, [s * (0.62 + 0.08 * P), 3.02, 0], [0.28 * P, 0.12 * P, 0.28 * P], ARd, 7, 3);
      tube(mb, [[s * (0.5 + 0.14 * P), 3.1, 0.29 * P], [s * (0.5 + 0.34 * P), 3.02, 0], [s * (0.5 + 0.14 * P), 3.1, -0.29 * P]], 0.035, TR, { sides: 4 });   // trim
      if (K.helm === 'crest') for (let i = 0; i < 3; i++) spike(mb, [s * 0.66, 3.24, -0.1 + i * 0.1], [s * (1.0 - i * 0.05), 3.5 - i * 0.08, -0.2 + i * 0.15], 0.07, ARl, 4);
      if (king) for (const k of [0, 1]) mb.blade([s * (0.7 + k * 0.1), 3.2 - k * 0.1, 0.05], [s * 1, 0.55 - k * 0.3, -0.2], 0.55 - k * 0.1, 0.34, 0.06, ARl, [0, 0.3, 1], AR);
      tube(mb, [sh0, el, wr], R([0.13 * Math.sqrt(bulk), 0.11 * Math.sqrt(bulk), 0.09]), armFn, { sides: 6 });
      ball(mb, el, 0.12, ARd, 5, 3);
      ball(mb, [s * 0.1, hy, 0.44], [0.1, 0.09, 0.1], ARd, 6, 4);                    // gauntlet on the grip
      if (s < 0) knightWeapon(mb, K, hy);
    });
    arm(1); arm(-1);
    const leg = (s) => part(m, s > 0 ? 'thighL' : 'thighR', mb => {
      const hip = [s * 0.22, 1.9, 0], kn = [s * 0.26, 1.05, 0.05], an = [s * 0.28, 0.18, 0];
      if (K.body !== 'robe') { tube(mb, [hip, kn, an], R([0.17, 0.13, 0.1]), armFn, { sides: 6, up: [0, 0, 1] }); ball(mb, kn, 0.13, ARl, 5, 3); }
      else tube(mb, [V.lerp(kn, an, 0.3), an], R([0.12, 0.1]), armFn, { sides: 6, up: [0, 0, 1] });
      tube(mb, [[s * 0.28, 0.13, -0.1], [s * 0.28, 0.08, 0.2], [s * 0.28, 0.04, 0.44]], R([[0.11, 0.09], [0.08, 0.06], [0.01, 0.01]]), AR, { sides: 5 });   // pointed sabaton
    });
    leg(1); leg(-1);
    m.height = { crest: 3.9, visor: 3.85, horned: 4.2, plume: 4.4, hair: 3.85, mitre: 4.25, crown: 4.15 }[K.helm] || 3.9;
  }
  // the weapon, gripped at [0, hy, 0.44] (model space, carried by armR)
  function knightWeapon(mb, K, hy) {
    const G = [0, hy, 0.44], STEEL = '#c8c8e8', STEELd = '#7070b0';
    // double-sided diamond blade from a (hilt end) to b (point), half-width w along x
    const blade = (a, b, w, c1, c2) => {
      const m1 = V.lerp(a, b, 0.72), L = [a, m1, b].map(p => V.add(p, [0, 0, 0])), E = [[-w, 0, 0], [-w * 0.9, 0, 0], [0, 0, 0]], F = [[0, 0, 0.04], [0, 0, 0.04], [0, 0, 0]], Bk = [[0, 0, -0.04], [0, 0, -0.04], [0, 0, 0]];
      const e1 = L.map((p, i) => V.add(p, E[i])), e2 = L.map((p, i) => V.add(p, V.scale(E[i], -1))), f = L.map((p, i) => V.add(p, F[i])), bk = L.map((p, i) => V.add(p, Bk[i]));
      sheet(mb, e1, f, (t) => mix(c1, c2, t), STEELd); sheet(mb, f, e2, (t) => mix(sh(c1, -0.15), c2, t), STEELd);
      sheet(mb, e2, bk, c2, STEELd); sheet(mb, bk, e1, c2, STEELd);
    };
    const W = K.weapon;
    if (W === 'sword' || W === 'kingsword') {
      const kg = W === 'kingsword', gl = kg ? 0.62 : 0.44;
      tube(mb, [V.add(G, [0, 0.18, 0]), V.add(G, [0, -gl, 0])], 0.035, '#3a3040', { sides: 5 });
      ball(mb, V.add(G, [0, 0.2, 0]), kg ? 0.08 : 0.055, K.trim, 5, 3);
      if (kg) { tube(mb, curve([[-0.5, hy - gl + 0.12, 0.44], [-0.4, hy - gl, 0.44], [0, hy - gl - 0.04, 0.44], [0.4, hy - gl, 0.44], [0.5, hy - gl + 0.12, 0.44]], 2), 0.06, K.trim, { sides: 5 }); ball(mb, [0, hy - gl - 0.06, 0.46], 0.08, '#c01820', 5, 3); }
      else mb.box(0, hy - gl, 0.44, 0.62, 0.06, 0.08, K.trim);
      blade([0, hy - gl - 0.03, 0.44], [0, 0.02, 0.44], kg ? 0.21 : 0.15, kg ? '#eceaff' : '#e0e0ff', kg ? '#9a96dc' : '#9a9ae0');
    } else if (W === 'axe') {       // great double-bit axe resting head down
      tube(mb, [V.add(G, [0, 0.55, 0]), [0, 0.5, 0.44]], 0.045, '#3a2a20', { sides: 5 });
      ball(mb, V.add(G, [0, 0.57, 0]), 0.06, K.trim, 5, 3);
      for (const s of [1, -1]) {
        mb.push(); mb.translate(0, 0.95, 0.44);
        mb.panel([[s * 0.06, 0.28], [s * 0.3, 0.4], [s * 0.6, 0.5], [s * 0.66, 0.1], [s * 0.62, -0.3], [s * 0.3, -0.26], [s * 0.06, -0.14]].map(p => s > 0 ? p : p).map(p => [p[0], p[1]]), 0, 0.06, STEEL, STEELd);
        mb.pop();
      }
      tube(mb, [[0, 1.3, 0.44], [0, 0.62, 0.44]], 0.08, K.trim, { sides: 6 });
      spike(mb, [0, 0.55, 0.44], [0, 0.3, 0.44], 0.06, STEEL, 4);
    } else if (W === 'halberd') {   // long pole, big crescent blade and spike at the lower end
      tube(mb, [[0, 3.55, 0.44], [0, 0.55, 0.44]], 0.04, '#2a2030', { sides: 5 });
      spike(mb, [0, 3.55, 0.44], [0, 3.8, 0.44], 0.05, K.trim, 4);
      mb.push(); mb.translate(0, 0.95, 0.44);
      mb.panel([[0.04, 0.45], [0.3, 0.4], [0.55, 0.15], [0.62, -0.25], [0.45, -0.5], [0.04, -0.3]], 0, 0.05, '#e4e8f4', STEELd);
      mb.panel([[-0.04, 0.3], [-0.3, 0.22], [-0.36, 0.1], [-0.04, 0.02]], 0, 0.05, '#e4e8f4', STEELd);
      mb.pop();
      spike(mb, [0, 0.6, 0.44], [0, 0.02, 0.44], 0.07, '#e4e8f4', 4);
    } else {                        // spear / trident / ring mace: pole slanting down and forward past the hands
      const B = [0, 3.3, -0.2], d = V.norm(V.sub(G, B)), side = [1, 0, 0];
      const Lp = W === 'mace' ? 1.7 : 2.3, E = V.add(G, V.scale(d, Lp));
      tube(mb, [B, E], 0.035, W === 'mace' ? K.trim : '#3a2a20', { sides: 5 });
      ball(mb, B, 0.05, K.trim, 4, 3);
      if (W === 'spear') {
        tube(mb, [V.sub(E, V.scale(d, 0.1)), V.add(E, V.scale(d, 0.06))], 0.07, '#c02020', { sides: 5 });
        const up = V.norm(V.cross(d, side));
        const q = (a, b) => V.add(E, V.add(V.scale(d, a), V.scale(side, b)));
        quad2(mb, q(0.05, 0), q(0.3, 0.13), q(0.85, 0), q(0.3, -0.13), '#e4e8f4', STEELd);
        tube(mb, [q(0.05, 0), q(0.85, 0)], R([[0.02, 0.03], [0.005, 0.005]]), STEEL, { sides: 4, up });
      } else if (W === 'trident') {
        tube(mb, [V.sub(E, V.scale(d, 0.08)), V.add(E, V.scale(d, 0.05))], 0.08, K.trim, { sides: 5 });
        tube(mb, [V.add(E, V.scale(side, -0.26)), V.add(E, V.scale(side, 0.26))], 0.04, K.trim, { sides: 4 });
        for (const o of [-0.26, 0, 0.26]) { const b = V.add(E, V.scale(side, o)); spike(mb, b, V.add(b, V.add(V.scale(d, o ? 0.6 : 0.75), V.scale(side, o * 0.3))), 0.05, '#e4e8f4', 4); }
      } else {                      // ring-headed mace (scepter)
        const ctr = V.add(E, V.scale(d, 0.24)), ring = [];
        for (let i = 0; i <= 10; i++) { const a = i / 10 * PI * 2; ring.push(V.add(ctr, V.add(V.scale(d, C(a) * 0.24), V.scale(side, S(a) * 0.24)))); }
        tube(mb, ring, 0.05, K.trim, { sides: 4, cap0: false, cap1: false });
        ball(mb, ctr, 0.1, '#c01830', 6, 4);
        for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2, p = V.add(ctr, V.add(V.scale(d, C(a) * 0.26), V.scale(side, S(a) * 0.26))); spike(mb, p, V.add(p, V.add(V.scale(d, C(a) * 0.14), V.scale(side, S(a) * 0.14))), 0.04, K.trim, 3); }
      }
    }
  }
  SM.knights_of_round = function (opts) {
    const m = rig();
    boneAt(m, 'body', 'root', [0, 1.95, 0]);
    boneAt(m, 'head', 'body', [0, 3.28, 0.02]);
    boneAt(m, 'armL', 'body', [0.52, 3.05, 0]); boneAt(m, 'armR', 'body', [-0.52, 3.05, 0]);
    boneAt(m, 'thighL', 'body', [0.22, 1.9, 0]); boneAt(m, 'thighR', 'body', [-0.22, 1.9, 0]);
    const built = [];
    m.setKnight = (i) => {
      const k = ((Math.floor(i) % KOTR.length) + KOTR.length) % KOTR.length;
      if (!built[k]) {
        for (const b of m.order) b.meshes = [];
        knightParts(m, KOTR[k]);
        built[k] = { h: m.height, meshes: {} };
        for (const b of m.order) built[k].meshes[b.name] = b.meshes;
      }
      for (const b of m.order) b.meshes = built[k].meshes[b.name] || [];
      m.height = built[k].h; m.knight = k;
      return m;
    };
    m.knightCount = KOTR.length;
    m.setKnight(opts && opts.knight != null ? opts.knight : 0);
    m.lungeScale = 1.0;
    return m;
  };
})();
