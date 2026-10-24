// Kupomon: the S.S. Moogle (docs/KUPOMON_WORLD.md "The S.S. Moogle"), the grand liner between the pier on Route 10 and
// Costa del Kupo (the post-game; the Champion's ticket, flag kp_ss_ticket, to board). A fully explorable 1920s ocean
// liner in the spirit of the old Pokemon ships: from the Sun Deck and the Bridge down through the Promenade Deck, the
// first-class staterooms (B Deck), the Dining Saloon and its galley (C Deck), second class and the crew (D Deck), the
// cargo holds, the Engine Room, the Boiler Room and the shaft tunnel in the bilge. Trainers, crew and passengers aboard.
//   Boarding: the gangway on either pier leads in through a shell door on the Promenade Deck; she lies starboard side to
//   the quay on Route 10 and port side to it at Costa del Kupo, so only the door on the quay side opens (var kp_ss_port:
//   'costa' or not). Sailing: talk to the Captain on the Bridge; he takes her across (a short scene at sea, kp_ss_atsea)
//   and you arrive still aboard, on the Bridge, moored at the other port: walk off down the gangway.
//   Lifts: two brass cage lifts with operators (the Grand Lift: Sun Deck, Promenade, B Deck, C Deck; the Service Lift:
//   C Deck galley, D Deck, the Holds, the Engine Room), and stairs between every pair of decks as well.
//   The Demo (docs/RUNNER.md "Travel links"): the lift operators and the Captain are map `links`; the Captain's link
//   names the port she will moor at, so a route crosses the sea through him and walks off at the other end.
// Maps kp_ss_*: they run in Kupomon's sandbox. Dialogue in our own words. Low-poly 3D throughout: the props below are
// built from the field's mesh primitives, like js/field/tiles.js's.
(function () {
  const KP = FF7.kupomon, W = KP.W, F = FF7.field, PR = F.props, TT = F.tileTypes, U = FF7.util, sh = U.shade, V3 = FF7.V3;
  const PI = Math.PI;
  const beam = (mb, a, b, r, col, n) => F.beam(mb, a, b, r, col, n);
  const glowOf = (o, mb) => (o && o.glow) || mb;
  // a flat rectangle facing direction n (decals, faces): w across, h up
  const flat = (mb, c, n, w, h, col) => {
    n = V3.norm(n); const ref = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = V3.scale(V3.norm(V3.cross(ref, n)), w / 2), v = V3.scale(V3.norm(V3.cross(n, V3.norm(V3.cross(ref, n)))), h / 2);
    const P = (a, b) => V3.add(c, V3.add(V3.scale(u, a), V3.scale(v, b)));
    mb.quad(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), col);
  };
  // a disc facing direction n
  const disc = (mb, c, n, r, col, k) => {
    n = V3.norm(n); const ref = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], u = V3.norm(V3.cross(ref, n)), v = V3.norm(V3.cross(n, u)), N = k || 12;
    for (let i = 0; i < N; i++) { const a0 = i / N * PI * 2, a1 = (i + 1) / N * PI * 2, p = (a) => V3.add(c, V3.add(V3.scale(u, Math.cos(a) * r), V3.scale(v, Math.sin(a) * r))); mb.tri(c, p(a0), p(a1), col); }
  };
  // polygon (x, z) in the winding MeshBuilder.extrude expects (the field's own `ccw`)
  const ccw = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a > 0 ? pts.slice().reverse() : pts; };

  // ================================================================== tile types for the new props
  const tile = (name, o) => { if (!TT[name]) TT[name] = Object.assign({ name, walk: false, floor: 'floor', prop: name, wall: false, void: false, tall: 0 }, o || {}); };
  ['telegraph', 'binnacle', 'deckchair', 'ventcowl', 'washstand', 'wardrobe', 'steamtrunk', 'piano', 'armchair', 'roundtable', 'coal', 'range', 'lifering'].forEach(n => tile(n));
  tile('bollard', { floor: 'wood' });
  tile('chkfloor', { walk: true, checker: true, floor: 'chk', prop: null });   // (black and white marble: look.checker, no floor texture: look.floorTex.chk false)
  tile('quaylamp', { floor: 'wood', prop: 'lamp' }); tile('quaycrate', { floor: 'wood', prop: 'crate' });   // (on the planks of the quays, Route 10 and Costa del Kupo)
  ['lifeboat', 'funnel', 'boiler', 'pistons', 'shaft', 'diningset', 'bigbed', 'bunk', 'chartable', 'galleyrange'].forEach(n => tile(n, { block: true }));

  // ================================================================== props (face south, +z, at rot 0; s = one tile)
  // a 1920s brass cage lift car over o.w x o.d tiles, centred on the prop: corner posts, barred sides and back with a
  // band of diamonds, the roof and a crest over the front with the floor dial, the folding gate drawn back (open), the
  // operator's control wheel. o.h height (m), o.col brass
  PR.liftcage = (mb, x, y, z, s, th, nb, o = {}) => {
    const Wd = s * (o.w || 2), D = s * (o.d || 2), H = o.h || 1.9, b = o.col || '#c8a040', bd = sh(b, -0.28), gm = glowOf(o, mb);
    const x0 = x - Wd / 2, x1 = x + Wd / 2, z0 = z - D / 2, z1 = z + D / 2;
    mb.box(x, y + 0.012, z, Wd - 0.02, 0.024, D - 0.02, { top: '#5a3a22', side: bd, bottom: bd });
    [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].forEach(([px, pz]) => mb.box(px, y + H / 2, pz, 0.05, H, 0.05, b));
    const side = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(L / 0.1));
      for (let i = 1; i < n; i++) { const t = i / n; mb.box(ax + (bx - ax) * t, y + H / 2, az + (bz - az) * t, 0.014, H, 0.014, bd); }
      [0.06, 0.55, 0.95, H - 0.05].forEach(hy => beam(mb, [ax, y + hy, az], [bx, y + hy, bz], 0.013, b, 4));
      for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, p0 = [ax + (bx - ax) * t0, az + (bz - az) * t0], p1 = [ax + (bx - ax) * t1, az + (bz - az) * t1];
        beam(mb, [p0[0], y + 0.56, p0[1]], [p1[0], y + 0.94, p1[1]], 0.008, b, 3); beam(mb, [p0[0], y + 0.94, p0[1]], [p1[0], y + 0.56, p1[1]], 0.008, b, 3); }
    };
    side(x0, z0, x1, z0); side(x0, z0, x0, z1); side(x1, z0, x1, z1);
    mb.box(x, y + H + 0.025, z, Wd + 0.06, 0.05, D + 0.06, { top: bd, side: b, bottom: '#3a2a1a' });
    // the crest: a half-round brass plate over the front with the floor dial on it
    const cy = y + H + 0.05, R = Wd * 0.3;
    for (let i = 0; i < 10; i++) { const a0 = PI * i / 10, a1 = PI * (i + 1) / 10, p = (a, r) => [x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, z1 + 0.03];
      mb.quad(p(a0, R), p(a1, R), p(a1, R * 0.12), p(a0, R * 0.12), b); mb.quad(p(a0, R * 0.12), p(a1, R * 0.12), p(a1, R), p(a0, R), b); }
    for (let i = 0; i < 10; i++) { const a0 = PI * i / 10, a1 = PI * (i + 1) / 10, p = (a, r) => [x + Math.cos(a) * r, cy + 0.02 + Math.sin(a) * r * 0.8, z1 + 0.04];
      gm.tri(p(0, 0), p(a0, R * 0.78), p(a1, R * 0.78), '#f2e6c4'); }
    for (let i = 0; i <= 4; i++) { const a = PI * (0.12 + 0.76 * i / 4); beam(mb, [x + Math.cos(a) * R * 0.62, cy + 0.02 + Math.sin(a) * R * 0.5, z1 + 0.045], [x + Math.cos(a) * R * 0.76, cy + 0.02 + Math.sin(a) * R * 0.61, z1 + 0.045], 0.006, '#3a2a1a', 3); }
    beam(mb, [x, cy + 0.02, z1 + 0.05], [x + R * 0.2, cy + 0.02 + R * 0.5, z1 + 0.05], 0.01, '#2a1a10', 3);
    // the folding gate, drawn back against the left post; its track along the front
    for (let i = 0; i < 7; i++) mb.box(x0 + 0.03 + i * 0.016, y + 0.94, z1 - 0.01, 0.012, 1.8, 0.02, i % 2 ? b : bd);
    beam(mb, [x0, y + H - 0.08, z1], [x1, y + H - 0.08, z1], 0.012, bd, 4);
    // the control wheel on the left wall, a lamp under the roof
    mb.box(x0 + 0.04, y + 1.0, z0 + D * 0.35, 0.05, 0.18, 0.14, '#3a2a1a');
    beam(mb, [x0 + 0.08, y + 1.0, z0 + D * 0.35], [x0 + 0.15, y + 1.12, z0 + D * 0.35], 0.012, b, 4); mb.sphere(x0 + 0.15, y + 1.12, z0 + D * 0.35, 0.025, 0.025, 0.025, '#2a1a10', 6, 4);
    gm.sphere(x, y + H - 0.08, z, 0.06, 0.05, 0.06, '#fff0c0', 8, 5);
    o.light && o.light([x, y + H - 0.2, z], '#ffe8b0', 1.6);
  };
  // the folding gate drawn shut across a lift's front (an object while the lift rides): o.w (tiles)
  PR.liftgate = (mb, x, y, z, s, th, nb, o = {}) => {
    const Wd = s * (o.w || 2), H = 1.82, b = o.col || '#c8a040', bd = sh(b, -0.28), n = Math.max(4, Math.round(Wd / 0.09));
    for (let i = 0; i <= n; i++) mb.box(x - Wd / 2 + Wd * i / n, y + H / 2, z, 0.014, H, 0.016, bd);
    for (let i = 0; i < n; i++) { const xa = x - Wd / 2 + Wd * i / n, xb = x - Wd / 2 + Wd * (i + 1) / n;
      for (let k = 0; k < 4; k++) { const ya = y + 0.08 + k * 0.42, yb = ya + 0.42; beam(mb, [xa, ya, z + 0.01], [xb, yb, z + 0.01], 0.007, b, 3); beam(mb, [xa, yb, z + 0.01], [xb, ya, z + 0.01], 0.007, b, 3); } }
    [0.06, H - 0.04].forEach(hy => mb.box(x, y + hy, z, Wd, 0.04, 0.03, b));
  };
  // an engine order telegraph: a brass column, a drum head with the dial on both faces, the handle
  PR.telegraph = (mb, x, y, z, s, th, nb, o = {}) => {
    const b = o.col || '#c8a040', bd = sh(b, -0.3), gm = glowOf(o, mb), hy = y + 0.92;
    mb.prism(x, y, z, 0.12, 0.11, 0.06, 10, bd); mb.prism(x, y + 0.06, z, 0.065, 0.05, 0.7, 10, b, true);
    mb.push(); mb.translate(x, hy, z); mb.rotate(PI / 2, 0, 0); mb.prism(0, -0.065, 0, 0.17, 0.17, 0.13, 16, b, true); mb.pop();
    [1, -1].forEach(k => { for (let i = 0; i < 16; i++) { const a0 = i / 16 * PI * 2, a1 = (i + 1) / 16 * PI * 2, p = (a) => [x + Math.cos(a) * 0.14 * k, hy + Math.sin(a) * 0.14, z + 0.067 * k];
      gm.tri([x, hy, z + 0.067 * k], p(a0), p(a1), i >= 2 && i < 6 ? '#c83028' : i >= 10 && i < 14 ? '#2a8a3a' : '#f0e6c8'); } });
    beam(mb, [x, hy, z + 0.08], [x + 0.1, hy + 0.12, z + 0.08], 0.012, '#2a2a2e', 4); mb.box(x + 0.1, hy + 0.12, z + 0.08, 0.04, 0.04, 0.05, '#2a1a10');
    beam(mb, [x, hy - 0.04, z + 0.08], [x, hy + 0.1, z + 0.08], 0.008, '#2a2a2e', 3);
  };
  // the compass binnacle: a teak pedestal, a brass hood, the two iron correcting balls
  PR.binnacle = (mb, x, y, z, s, th, nb, o = {}) => {
    const w = o.col2 || '#7a5432', b = o.col || '#c8a040';
    mb.prism(x, y, z, 0.13, 0.1, 0.8, 8, w, true); mb.prism(x, y + 0.8, z, 0.14, 0.14, 0.06, 10, sh(w, -0.2));
    mb.sphere(x, y + 0.88, z, 0.12, 0.11, 0.12, b, 10, 6, true, null, 3); mb.box(x, y + 0.92, z + 0.1, 0.08, 0.05, 0.03, '#203040');
    [1, -1].forEach(k => { beam(mb, [x + k * 0.1, y + 0.84, z], [x + k * 0.2, y + 0.84, z], 0.012, b, 4); mb.sphere(x + k * 0.24, y + 0.85, z, 0.055, 0.055, 0.055, '#2a3a4a', 8, 5, true); });
  };
  // the chart table (a block): a teak table with drawers, a chart, the dividers and a lamp
  PR.chartable = (mb, x, y, z, s, th, nb, o = {}) => {
    const L = s * (o.bw || 2) * 0.9, D = s * (o.bh || 1) * 0.8, w = o.col || '#7a5432';
    mb.box(x, y + 0.42, z, L, 0.84, D, { side: sh(w, -0.15), front: w, top: sh(w, 0.08) });
    for (let i = 0; i < 3; i++) mb.box(x - L * 0.3 + i * L * 0.3, y + 0.6, z + D / 2 + 0.004, L * 0.24, 0.12, 0.01, sh(w, -0.3));
    mb.box(x - L * 0.06, y + 0.845, z, L * 0.7, 0.005, D * 0.8, '#ece2c4');
    [[-0.2, 0.05, 0.2, -0.04], [-0.1, -0.08, 0.15, 0.06]].forEach(([a, b2, c, d]) => beam(mb, [x + a * L, y + 0.85, z + b2], [x + c * L, y + 0.85, z + d], 0.004, '#4a6a9a', 3));
    beam(mb, [x + L * 0.3, y + 0.85, z], [x + L * 0.34, y + 1.05, z - 0.04], 0.01, '#3a3a3e', 4); mb.sphere(x + L * 0.34, y + 1.07, z - 0.04, 0.05, 0.035, 0.05, '#2a5a3a', 8, 4);
  };
  // a teak steamer deck chair, reclined, a cushion (o.col)
  PR.deckchair = (mb, x, y, z, s, th, nb, o = {}) => {
    const w = o.col2 || '#9a7448', c = o.col || '#dce8f0', dw = sh(w, -0.25);
    mb.box(x, y + 0.2, z - 0.02, 0.3, 0.04, 0.26, w); mb.box(x, y + 0.235, z - 0.02, 0.26, 0.03, 0.22, c);
    mb.push(); mb.translate(x, y + 0.22, z - 0.15); mb.rotate(-0.85, 0, 0); mb.box(0, 0.18, 0, 0.3, 0.36, 0.04, w); mb.box(0, 0.18, 0.025, 0.26, 0.32, 0.02, c); mb.pop();
    mb.push(); mb.translate(x, y + 0.2, z + 0.11); mb.rotate(0.35, 0, 0); mb.box(0, 0, 0.11, 0.3, 0.03, 0.22, w); mb.pop();
    [[-0.13, -0.1], [0.13, -0.1], [-0.13, 0.19], [0.13, 0.19]].forEach(([dx, dz]) => mb.box(x + dx, y + 0.1, z + dz, 0.025, 0.2, 0.025, dw));
    [-1, 1].forEach(k => mb.box(x + k * 0.16, y + 0.31, z - 0.02, 0.025, 0.025, 0.24, w));
  };
  // a ship's ventilator cowl: a white trunk and a bell mouth facing south, red inside
  PR.ventcowl = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#f0ede4', m = o.col2 || '#b03028', H = o.h || 1.0;
    mb.prism(x, y, z, 0.11, 0.11, 0.05, 10, sh(c, -0.15)); mb.prism(x, y, z, 0.07, 0.07, H, 10, c, true);
    mb.push(); mb.translate(x, y + H, z - 0.03); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0, 0, 0.08, 0.16, 0.17, 12, c, true, false, true); mb.prism(0, 0.165, 0, 0.145, 0.145, 0.004, 12, m); mb.pop();
    mb.sphere(x, y + H, z - 0.03, 0.085, 0.085, 0.085, c, 10, 6, true);
  };
  // a lifeboat hung in its davits (a block along x): the white hull, the canvas cover, the curved davit arms (outboard
  // is south at rot 0; rot 180 for the north rail)
  PR.lifeboat = (mb, x, y, z, s, th, nb, o = {}) => {
    const L = s * (o.bw || 2) * 0.94, c = o.col || '#f0ede4', cv = o.col2 || '#c8bca0', by = y + 0.5, dz = z + 0.06;
    mb.frustum(x, by, dz, L * 0.82, 0.16, L, 0.36, 0.2, { side: c, front: c, back: c, top: cv, bottom: sh(c, -0.2) });
    mb.box(x, by + 0.205, dz, L * 0.98, 0.02, 0.37, '#8a6a44');
    mb.frustum(x, by + 0.21, dz, L * 0.92, 0.32, L * 0.8, 0.18, 0.08, cv);
    [-1, 1].forEach(k => { mb.frustum(x + k * L * 0.52, by + 0.04, dz, 0.06, 0.12, 0.02, 0.3, 0.17, c); });
    [-1, 1].forEach(k => { const ax = x + k * L * 0.38;
      beam(mb, [ax, y, z - s * 0.4], [ax, y + 0.95, z - s * 0.3], 0.025, '#e8e4da', 5);
      beam(mb, [ax, y + 0.95, z - s * 0.3], [ax, y + 1.02, z - 0.02], 0.022, '#e8e4da', 5);
      beam(mb, [ax, y + 1.02, z - 0.02], [ax, y + 0.98, z + 0.1], 0.02, '#e8e4da', 5);
      beam(mb, [ax, y + 0.97, z + 0.08], [ax, by + 0.2, dz], 0.006, '#d8c8a0', 3); });
  };
  // the foot of a funnel rising through the deck (a block, elliptical over it): the casing, the stack in the S.S.
  // Moogle's colours (red, black bands, the white band with the gold pom-pom, the black top), raked aft (-x), steam
  // pipes; it fades when it stands between the camera and the party
  PR.funnel = (mb, x, y, z, s, th, nb, o = {}) => {
    const rx = s * (o.bw || 3) * 0.44, rz = s * (o.bh || 2) * 0.44, H = o.h || 7.5, c = o.col || '#c8382a', k = '#18181c', wht = '#f0ede4';
    mb.box(x, y + 0.2, z, rx * 2 + 0.24, 0.4, rz * 2 + 0.24, { top: '#d8d2c4', side: wht });
    const ring = (yy, col, f) => ({ y: y + yy, rx: rx * (f || 1), rz: rz * (f || 1), x: x - yy * 0.06, z, color: col });
    mb.loft([ring(0.4, c), ring(2.9, k), ring(3.0, c), ring(3.2, k), ring(3.3, c), ring(3.8, wht), ring(4.3, c), ring(4.9, k), Object.assign(ring(H, k, 1.03), { capColor: '#0a0a0c' })], { sides: 18, color: c, capBottom: false });
    disc(mb, [x - 4.05 * 0.06, y + 4.05, z + rz + 0.012], [0, 0, 1], 0.2, '#c8a040', 14); disc(mb, [x - 4.05 * 0.06, y + 4.05, z + rz + 0.02], [0, 0, 1], 0.09, '#e0405a', 12);
    [-0.12, 0.12].forEach(dz => beam(mb, [x + rx + 0.05, y + 0.4, z + dz], [x + rx + 0.05 - H * 0.06, y + H + 0.3, z + dz], 0.035, '#e0dcd2', 6));
  };
  PR.funnel.fade = true;
  // a washstand: a cabinet with a marble top, the basin and jug, the mirror on the wall behind
  PR.washstand = (mb, x, y, z, s, th, nb, o = {}) => {
    const w = o.col || '#6a4428', mar = '#ece8e0', z0 = z - s * 0.2;
    mb.box(x, y + 0.36, z0, 0.42, 0.72, 0.24, { side: sh(w, -0.15), front: w, top: mar });
    mb.box(x, y + 0.735, z0, 0.45, 0.03, 0.27, mar);
    mb.prism(x - 0.04, y + 0.75, z0 + 0.02, 0.1, 0.07, 0.05, 12, '#f6f6fa', true);
    mb.prism(x + 0.14, y + 0.75, z0, 0.035, 0.045, 0.13, 8, '#e4ecf4', true);
    [-1, 1].forEach(k => mb.box(x + k * 0.1, y + 0.45, z0 + 0.122, 0.12, 0.08, 0.01, sh(w, -0.3)));
    mb.box(x, y + 1.18, z - s * 0.47, 0.36, 0.46, 0.02, '#8a6a40'); mb.box(x, y + 1.18, z - s * 0.47 + 0.012, 0.3, 0.4, 0.01, '#b8cad8');
  };
  // a mahogany wardrobe with two doors and brass knobs
  PR.wardrobe = (mb, x, y, z, s, th, nb, o = {}) => {
    const w = o.col || '#6a4428', z0 = z - s * 0.15;
    mb.box(x, y + 0.85, z0, 0.46, 1.7, 0.3, { side: sh(w, -0.15), front: w, top: sh(w, 0.1) });
    mb.box(x, y + 1.73, z0, 0.5, 0.07, 0.34, sh(w, -0.1)); mb.box(x, y + 0.04, z0, 0.5, 0.08, 0.34, sh(w, -0.2));
    mb.box(x, y + 0.88, z0 + 0.151, 0.008, 1.5, 0.006, sh(w, -0.45));
    [-1, 1].forEach(k => { mb.box(x + k * 0.03, y + 0.92, z0 + 0.16, 0.02, 0.02, 0.02, '#c8a040'); mb.box(x + k * 0.11, y + 0.88, z0 + 0.152, 0.16, 1.36, 0.004, sh(w, 0.06)); });
  };
  // a double bed with a brass bedstead (a block): mattress, quilt (o.col), pillows
  PR.bigbed = (mb, x, y, z, s, th, nb, o = {}) => {
    const Wd = s * (o.bw || 2) * 0.86, L = s * (o.bh || 2) * 0.92, q = o.col || '#a83a48', b = '#c8a040', zh = z - L / 2;
    mb.box(x, y + 0.2, z, Wd, 0.22, L, { side: '#5a3a22', top: '#ece6dc' });
    mb.box(x, y + 0.33, z + L * 0.12, Wd + 0.02, 0.05, L * 0.76, { top: q, side: sh(q, -0.2) });
    mb.box(x, y + 0.33, z + L * 0.5 - 0.02, Wd + 0.03, 0.06, 0.04, sh(q, -0.1));
    [-1, 1].forEach(k => mb.box(x + k * Wd * 0.24, y + 0.37, zh + 0.14, Wd * 0.4, 0.08, 0.16, '#f6f4ee'));
    [[zh, 0.95], [z + L / 2, 0.6]].forEach(([zz, hh]) => { [-1, 1].forEach(k => { mb.prism(x + k * Wd / 2, y, zz, 0.025, 0.025, hh, 6, b, true); mb.sphere(x + k * Wd / 2, y + hh, zz, 0.035, 0.035, 0.035, b, 6, 4); });
      [0.45, hh - 0.04].forEach(hy => beam(mb, [x - Wd / 2, y + hy, zz], [x + Wd / 2, y + hy, zz], 0.012, b, 4));
      for (let i = 1; i < 6; i++) beam(mb, [x - Wd / 2 + Wd * i / 6, y + 0.45, zz], [x - Wd / 2 + Wd * i / 6, y + hh - 0.04, zz], 0.007, b, 3); });
  };
  // a two-berth bunk (a block along x): the frame, two mattresses with blankets (o.col), a little ladder
  PR.bunk = (mb, x, y, z, s, th, nb, o = {}) => {
    const L = s * (o.bw || 2) * 0.94, D = s * 0.8, w = o.col2 || '#7a5a38', c = o.col || '#5a6a8a';
    [0.22, 0.95].forEach(hy => { mb.box(x, y + hy, z - 0.02, L, 0.08, D, { side: w, top: '#e8e4dc' }); mb.box(x + L * 0.08, y + hy + 0.06, z - 0.02, L * 0.8, 0.04, D * 0.96, { top: c, side: sh(c, -0.2) });
      mb.box(x - L * 0.4, y + hy + 0.07, z - 0.02, L * 0.14, 0.05, D * 0.7, '#f4f2ea'); beam(mb, [x - L / 2, y + hy + 0.16, z + D / 2 - 0.04], [x + L / 2, y + hy + 0.16, z + D / 2 - 0.04], 0.012, w, 4); });
    [-1, 1].forEach(k => [-1, 1].forEach(j => mb.box(x + k * L / 2, y + 0.62, z + j * D / 2 - 0.02, 0.04, 1.24, 0.04, sh(w, -0.15))));
    for (let i = 0; i < 4; i++) beam(mb, [x + L / 2 - 0.02, y + 0.3 + i * 0.18, z + D / 2], [x + L / 2 - 0.16, y + 0.3 + i * 0.18, z + D / 2], 0.01, w, 3);
  };
  // a steamer trunk with brass corners and leather straps
  PR.steamtrunk = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#5a4030', b = '#c8a040';
    mb.box(x, y + 0.16, z, 0.42, 0.32, 0.26, { side: c, top: sh(c, 0.1), front: sh(c, 0.04) });
    [-0.1, 0.1].forEach(dx => mb.box(x + dx, y + 0.16, z, 0.04, 0.33, 0.27, '#2a1a10'));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b2]) => mb.box(x + a * 0.2, y + 0.3, z + b2 * 0.12, 0.04, 0.04, 0.04, b));
    mb.box(x, y + 0.24, z + 0.135, 0.06, 0.05, 0.01, b);
  };
  // a black grand piano, lid propped open, the keyboard to the south and its bench in front
  PR.piano = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#141418';
    const body = ccw([[-0.26, 0.18], [0.26, 0.18], [0.27, -0.02], [0.2, -0.26], [0.06, -0.42], [-0.26, -0.46]].map(([a, b]) => [x + a, z + b]));
    mb.extrude(body, y + 0.46, y + 0.66, c, sh(c, 0.1));
    [[-0.22, 0.12], [0.22, 0.12], [-0.2, -0.38]].forEach(([a, b]) => mb.prism(x + a, y, z + b, 0.03, 0.025, 0.46, 6, c, true));
    mb.box(x, y + 0.66, z + 0.2, 0.52, 0.03, 0.1, c); mb.box(x, y + 0.665, z + 0.22, 0.48, 0.012, 0.07, '#f4f2ea');
    for (let i = 0; i < 9; i++) mb.box(x - 0.2 + i * 0.05, y + 0.675, z + 0.205, 0.016, 0.01, 0.04, '#141418');
    mb.push(); mb.translate(x - 0.26, y + 0.66, z - 0.12); mb.rotate(0, 0, -0.6); mb.box(0.26, 0, 0, 0.52, 0.012, 0.56, sh(c, 0.06)); mb.pop();
    beam(mb, [x + 0.2, y + 0.66, z - 0.12], [x + 0.08, y + 0.98, z - 0.12], 0.008, '#c8a040', 3);
    mb.box(x, y + 0.24, z + 0.4, 0.34, 0.05, 0.14, '#2a1a14'); [-1, 1].forEach(k => mb.box(x + k * 0.14, y + 0.11, z + 0.4, 0.03, 0.22, 0.1, '#1a1a1e'));
  };
  // a leather club armchair (o.col)
  PR.armchair = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#7a3a2a', d = sh(c, -0.25);
    mb.box(x, y + 0.14, z + 0.02, 0.4, 0.2, 0.36, { side: d, top: c, front: sh(c, -0.1) });
    mb.box(x, y + 0.27, z + 0.04, 0.3, 0.06, 0.3, sh(c, 0.08));
    mb.box(x, y + 0.42, z - 0.16, 0.4, 0.42, 0.1, { side: d, front: c, top: sh(c, 0.1) });
    [-1, 1].forEach(k => mb.box(x + k * 0.17, y + 0.3, z + 0.02, 0.07, 0.24, 0.36, { side: d, top: sh(c, 0.1), front: d }));
  };
  // a small round table with a white cloth and a vase of flowers
  PR.roundtable = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#f4f2ea';
    mb.prism(x, y, z, 0.09, 0.09, 0.03, 8, '#3a2a1a'); mb.prism(x, y, z, 0.03, 0.03, 0.5, 6, '#3a2a1a');
    mb.prism(x, y + 0.36, z, 0.2, 0.2, 0.14, 12, c, true); mb.prism(x, y + 0.5, z, 0.2, 0.2, 0.012, 12, sh(c, 0.04));
    mb.prism(x, y + 0.51, z, 0.03, 0.025, 0.1, 6, '#5a8aa8', true); mb.sphere(x, y + 0.63, z, 0.05, 0.04, 0.05, o.col2 || '#e05a7a', 6, 4);
  };
  // a dining-saloon table for four (a 2x2 block): the round table in its cloth, a lamp, four chairs round it
  PR.diningset = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#f4f2ea', w = o.col2 || '#6a3a22', u = o.col3 || '#a83a48';
    mb.prism(x, y, z, 0.05, 0.05, 0.5, 6, '#3a2a1a'); mb.prism(x, y + 0.34, z, 0.32, 0.32, 0.17, 14, c, true); mb.prism(x, y + 0.51, z, 0.32, 0.32, 0.012, 14, sh(c, 0.04));
    mb.prism(x, y + 0.52, z, 0.025, 0.02, 0.2, 6, '#c8a040'); mb.prism(x, y + 0.72, z, 0.06, 0.03, 0.06, 8, '#f0d890');
    [[-0.1, 0.1], [0.12, 0.08], [0.0, -0.13]].forEach(([a, b]) => mb.box(x + a, y + 0.525, z + b, 0.08, 0.01, 0.06, '#e8eef4'));
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([a, b]) => {
      const cx = x + a * 0.36, cz = z + b * 0.36, r = Math.atan2(-a, -b);
      mb.push(); mb.translate(cx, y, cz); mb.rotate(0, r, 0);
      mb.box(0, 0.3, 0, 0.22, 0.05, 0.22, { top: u, side: w }); mb.box(0, 0.55, -0.1, 0.22, 0.5, 0.04, w); mb.box(0, 0.58, -0.08, 0.16, 0.3, 0.01, u);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([p, q]) => mb.box(p * 0.09, 0.14, q * 0.09, 0.025, 0.28, 0.025, sh(w, -0.2)));
      mb.pop();
    });
  };
  // a heap of coal in a bunker
  PR.coal = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#24242a';
    for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.06 + (i % 3) * 0.06; mb.sphere(x + Math.cos(a) * r * 1.6, y + 0.08 + (i < 3 ? 0.14 : 0), z + Math.sin(a) * r * 1.4, 0.13, 0.1, 0.12, sh(c, (i % 4) * 0.05), 6, 4, false); }
    mb.sphere(x, y + 0.18, z, 0.2, 0.2, 0.2, sh(c, 0.04), 7, 5, false);
  };
  // an iron mooring bollard
  PR.bollard = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#2a2c30';
    mb.box(x, y + 0.02, z, 0.3, 0.04, 0.3, sh(c, -0.2));
    [-1, 1].forEach(k => { mb.prism(x + k * 0.07, y, z, 0.06, 0.055, 0.22, 8, c, true); mb.prism(x + k * 0.07, y + 0.22, z, 0.085, 0.085, 0.04, 8, sh(c, 0.1)); });
  };
  // a galley range (a block along x): a black iron range, oven doors, the brass rail, copper pans and a stockpot on
  // the hotplates, the hood above
  PR.galleyrange = (mb, x, y, z, s, th, nb, o = {}) => {
    const L = s * (o.bw || 3) * 0.96, D = s * (o.bh || 1) * 0.8, c = o.col || '#26262a', cu = '#c87a3a';
    mb.box(x, y + 0.42, z, L, 0.84, D, { side: c, front: sh(c, 0.05), top: '#3a3a40' });
    const n = Math.max(2, Math.round(L / 0.36));
    for (let i = 0; i < n; i++) { const ox = x - L / 2 + L * (i + 0.5) / n; mb.box(ox, y + 0.36, z + D / 2 + 0.005, L / n * 0.8, 0.4, 0.01, '#3a3a40'); mb.box(ox, y + 0.5, z + D / 2 + 0.02, 0.1, 0.02, 0.02, '#c8a040'); }
    beam(mb, [x - L / 2, y + 0.74, z + D / 2 + 0.06], [x + L / 2, y + 0.74, z + D / 2 + 0.06], 0.012, '#c8a040', 4);
    for (let i = 0; i < n; i++) { const ox = x - L / 2 + L * (i + 0.5) / n; if (i % 2) mb.prism(ox, y + 0.84, z, 0.1, 0.11, 0.22, 10, '#a8aab0', true); else { mb.prism(ox, y + 0.84, z, 0.11, 0.11, 0.06, 10, cu, true); beam(mb, [ox + 0.1, y + 0.88, z], [ox + 0.24, y + 0.88, z + 0.04], 0.01, cu, 3); } }
    mb.frustum(x, y + 1.5, z - D * 0.1, L, D * 1.1, L * 0.7, D * 0.5, 0.4, { side: '#8a8c90', top: '#6a6c70', front: '#9a9ca0' });
  };
  // a red and white life ring hung on a wall (put it on a wall tile; rot picks the face)
  PR.lifering = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = 0.18, cy = y + (o.y || 1.25);
    for (let i = 0; i < 16; i++) { const a0 = i / 16 * PI * 2, a1 = (i + 1) / 16 * PI * 2; beam(mb, [x + Math.cos(a0) * R, cy + Math.sin(a0) * R, z + 0.05], [x + Math.cos(a1) * R, cy + Math.sin(a1) * R, z + 0.05], 0.045, (i >> 1) % 2 ? '#f0ede4' : '#c83028', 6); }
  };
  // a ship's gangway from its foot (the prop's place) up to a door: o.dx / o.dz (tiles to the top), o.rise (m); teak
  // cleated treads on a white frame, stanchions and rails, a canvas dodger with the ship's name, a landing at the top
  PR.gangway = (mb, x, y, z, s, th, nb, o = {}) => {
    const dx = (o.dx || -2) * s, dz = (o.dz || 0) * s, rise = o.rise != null ? o.rise : 0.5, Wd = o.w || 0.34, wood = o.col || '#a8865a', wh = o.col2 || '#f0ede4';
    const L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, px = -uz * Wd / 2, pz = ux * Wd / 2;
    const at = (t, side, hy) => [x + dx * t + px * side, y + rise * t + (hy || 0), z + dz * t + pz * side];
    const n = Math.max(4, Math.round(L / 0.12));
    for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n;
      const a = at(t0, -1, 0.04), b = at(t0, 1, 0.04), c = at(t1, 1, 0.04), d = at(t1, -1, 0.04);
      mb.quad(a, b, c, d, i % 2 ? wood : sh(wood, -0.08)); mb.quad(d, c, b, a, sh(wood, -0.35));
      beam(mb, at(t0 + 0.5 / n, -1, 0.05), at(t0 + 0.5 / n, 1, 0.05), 0.008, sh(wood, -0.25), 3); }
    [-1, 1].forEach(k => { beam(mb, at(0, k, 0.0), at(1, k, 0.0), 0.022, wh, 4); beam(mb, at(0, k, 0.62), at(1, k, 0.62), 0.012, wh, 4);
      for (let i = 0; i <= 4; i++) beam(mb, at(i / 4, k, 0.02), at(i / 4, k, 0.62), 0.01, wh, 3);
      for (let i = 0; i < 4; i++) { const a = at(i / 4, k, 0.18), b = at((i + 1) / 4, k, 0.18), c = at((i + 1) / 4, k, 0.58), d = at(i / 4, k, 0.58); mb.quad(a, b, c, d, '#e8e2d2'); mb.quad(d, c, b, a, '#e8e2d2'); } });
    if (F.text3d) [-1, 1].forEach(k => { const c = at(0.5, k, 0.38), u = k > 0 ? [ux, rise / L, uz] : [-ux, -rise / L, -uz];
      F.text3d(mb, 'S.S. MOOGLE', { pos: [c[0] + px * k * 0.04, c[1], c[2] + pz * k * 0.04], u, v: [0, 1, 0], size: 0.07, col: '#2a4a8a', w: 0.18 }); });
    const tx = x + dx, tz = z + dz;
    mb.box(tx, y + rise + 0.02, tz, Math.abs(px) * 2 + 0.2, 0.04, Math.abs(pz) * 2 + 0.2, { top: wood, side: wh });
    // the foot's little wheels on the quay
    [-1, 1].forEach(k => { const c = at(0, k, 0); mb.prism(c[0], y, c[2], 0.04, 0.04, 0.06, 8, '#2a2a2e'); });
  };
  // a glass dome over the grand staircase (o.r tiles, o.h m), pale green panes and white ribs
  PR.skydome = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = s * (o.r || 1.6), H = o.h || 0.8, g = o.col || '#bfe0d8', rb = o.col2 || '#f0ede4';
    mb.box(x, y + 0.05, z, R * 2 + 0.1, 0.1, R * 2 + 0.1, { top: '#d8d2c4', side: rb });
    mb.sphere(x, y + 0.1, z, R, H, R, g, 16, 8, true, null, 4);
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; let p0 = null; for (let k = 0; k <= 4; k++) { const t = k / 4 * PI / 2, p = [x + Math.cos(a) * Math.cos(t) * R * 1.01, y + 0.1 + Math.sin(t) * H * 1.01, z + Math.sin(a) * Math.cos(t) * R * 1.01]; if (p0) beam(mb, p0, p, 0.012, rb, 3); p0 = p; } }
    mb.prism(x, y + 0.1 + H, z, 0.1, 0.04, 0.12, 8, rb);
  };
  // a Scotch boiler (a block): the drum's round face to the south with three furnace doors glowing, the smokebox and
  // uptake rising to the deckhead, gauges and a water glass
  PR.boiler = (mb, x, y, z, s, th, nb, o = {}) => {
    const Wd = s * (o.bw || 4), D = s * (o.bh || 3), R = Math.min(Wd * 0.46, 0.95), cy = y + R + 0.08, c = o.col || '#3a3e44', gm = glowOf(o, mb);
    mb.box(x, y + 0.04, z, Wd * 0.9, 0.08, D * 0.9, sh(c, -0.3));
    mb.push(); mb.translate(x, cy, z - D * 0.45); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0, 0, R, R, D * 0.85, 16, c, true); mb.pop();
    const fz = z + D * 0.4 + 0.005;
    [-1, 0, 1].forEach(k => { const fx = x + k * R * 0.5, fy = y + 0.42;
      disc(mb, [fx, fy, fz], [0, 0, 1], R * 0.22, '#2a2a2e', 12); disc(gm, [fx, fy, fz + 0.006], [0, 0, 1], R * 0.15, k ? '#ff7a20' : '#ffa030', 12);
      mb.box(fx, fy + R * 0.25, fz + 0.02, 0.05, 0.03, 0.03, '#c8a040'); o.fire && o.fire([fx, fy, fz + 0.1], 0.6, '#ff8030'); });
    [-0.35, 0.35].forEach(k => { disc(mb, [x + k * R, cy + R * 0.45, fz], [0, 0, 1], 0.07, '#f0e8d0', 10); disc(mb, [x + k * R, cy + R * 0.45, fz + 0.004], [0, 0, 1], 0.08, '#c8a040', 10); });
    mb.box(x, cy + R * 0.9, fz - 0.05, R * 1.4, R * 0.5, 0.2, sh(c, 0.06));
    mb.frustum(x, cy + R * 0.95, z, R * 1.2, D * 0.5, R * 0.7, D * 0.35, 1.2, sh(c, -0.1));
    mb.box(x + R * 0.75, cy - 0.05, fz + 0.02, 0.03, 0.3, 0.03, '#a0d0e8');
    o.light && o.light([x, y + 0.5, fz + 0.6], '#ff9040', 2.6);
  };
  // a triple-expansion engine (a block along x): the bedplate and crank pit, columns, crossheads and rods, the row of
  // great cylinders (o.n) with their covers and valve chests, a railed platform on top
  PR.pistons = (mb, x, y, z, s, th, nb, o = {}) => {
    const L = s * (o.bw || 20) * 0.94, D = s * (o.bh || 4) * 0.8, n = o.n || 4, c = o.col || '#4a5a52', st = '#9aa0a6', b = '#c8a040';
    mb.box(x, y + 0.2, z, L, 0.4, D, { side: sh(c, -0.25), top: '#2a2c30', front: sh(c, -0.15) });
    const cyl = 1.55, cr = Math.min(D * 0.36, L / n * 0.34);
    for (let i = 0; i < n; i++) {
      const cx = x - L / 2 + L * (i + 0.5) / n;
      [-1, 1].forEach(k => [-1, 1].forEach(j => beam(mb, [cx + k * cr * 0.9, y + 0.4, z + j * D * 0.3], [cx + k * cr * 0.75, y + cyl, z + j * D * 0.25], 0.05, c, 4)));
      beam(mb, [cx, y + 0.45, z + D * 0.05], [cx + 0.12, y + 0.95, z + D * 0.05], 0.05, st, 6);
      beam(mb, [cx + 0.12, y + 0.95, z + D * 0.05], [cx + 0.12, y + cyl, z + D * 0.05], 0.035, st, 6);
      mb.box(cx + 0.12, y + 0.97, z + D * 0.05, 0.22, 0.08, 0.16, b);
      mb.prism(cx, y + cyl, z, cr, cr, 0.9, 14, c, true); mb.prism(cx, y + cyl + 0.9, z, cr * 1.06, cr * 0.9, 0.12, 14, sh(c, 0.12));
      for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2; mb.box(cx + Math.cos(a) * cr * 0.95, y + cyl + 1.03, z + Math.sin(a) * cr * 0.95, 0.04, 0.04, 0.04, b); }
      mb.box(cx + cr * 0.9, y + cyl + 0.45, z, cr * 0.5, 0.6, cr * 0.9, sh(c, -0.08));
    }
    beam(mb, [x - L / 2, y + cyl + 0.7, z + D / 2], [x + L / 2, y + cyl + 0.7, z + D / 2], 0.06, '#7a6a5a', 6);
    [-1, 1].forEach(j => beam(mb, [x - L / 2, y + cyl + 1.35, z + j * D / 2], [x + L / 2, y + cyl + 1.35, z + j * D / 2], 0.014, '#e0d8c0', 4));
    for (let i = 0; i <= n * 2; i++) [-1, 1].forEach(j => beam(mb, [x - L / 2 + L * i / (n * 2), y + cyl + 1.04, z + j * D / 2], [x - L / 2 + L * i / (n * 2), y + cyl + 1.35, z + j * D / 2], 0.01, '#e0d8c0', 3));
  };
  // the propeller shaft (a block along x): the turning steel shaft on its plummer blocks and couplings
  PR.shaft = (mb, x, y, z, s, th, nb, o = {}) => {
    const L = s * (o.bw || 30), st = '#a8aeb4', c = o.col || '#4a5058', hy = y + 0.36;
    beam(mb, [x - L / 2, hy, z], [x + L / 2, hy, z], 0.08, st, 10);
    const n = Math.max(2, Math.round(L / 1.6));
    for (let i = 0; i <= n; i++) { const px = x - L / 2 + L * i / n; mb.box(px, y + 0.2, z, 0.28, 0.4, 0.34, { side: c, top: sh(c, 0.12) }); mb.box(px, hy + 0.06, z, 0.3, 0.12, 0.3, sh(c, 0.06)); }
    for (let i = 0; i < n; i++) { const px = x - L / 2 + L * (i + 0.5) / n; mb.push(); mb.translate(px, hy, z); mb.rotate(0, 0, PI / 2); mb.prism(0, -0.04, 0, 0.15, 0.15, 0.08, 10, sh(st, -0.15)); mb.pop(); }
  };

  // ================================================================== looks
  const SAILOR = { base: 'sailor' };
  const DECKHAND = { base: 'man', top: '#f0f0f6', bottom: '#2a3a6a', hairStyle: 'cap', hair: '#f0f0f6' };
  const CAPTAIN = { base: 'oldman', top: '#f4f2ea', jacket: '#1e2640', bottom: '#1e2640', hair: '#f0eee8', hairStyle: 'cap', extras: ['beard', 'suit'] };
  const OFFICER = { base: 'man', top: '#f4f2ea', jacket: '#1e2640', bottom: '#1e2640', hair: '#1e2640', hairStyle: 'cap', extras: ['suit'] };
  const PURSER = { base: 'man', top: '#f4f2ea', jacket: '#1e2640', bottom: '#1e2640', hairStyle: 'short', hair: '#6a6a6a', extras: ['suit', 'glasses', 'mustache'] };
  const LIFTBOY = { base: 'man', build: 'slim', top: '#a82020', jacket: '#a82020', bottom: '#2a1a1a', hair: '#a82020', hairStyle: 'cap', extras: ['bowtie'] };
  const LIFTMAN = { base: 'oldman', top: '#3a4a6a', jacket: '#3a4a6a', bottom: '#2a2a3a', hair: '#3a4a6a', hairStyle: 'cap', extras: ['mustache'] };
  const STEWARD = { base: 'man', top: '#f4f0e8', jacket: '#f4f0e8', bottom: '#1a1e2a', hairStyle: 'slick', extras: ['bowtie'] };
  const STEWARDESS = { base: 'woman', top: '#f4f0e8', bottom: '#2a2e3a', skirt: 'long', hairStyle: 'bun', extras: ['apron'] };
  const WAITER = { base: 'man', top: '#f4f4f4', jacket: '#1a1a1e', bottom: '#1a1a1e', hairStyle: 'slick', extras: ['vest', 'bowtie'] };
  const COOK = { base: 'man', build: 'fat', top: '#f4f4f4', bottom: '#5a5a5a', hairStyle: 'bald', extras: ['apron', 'mustache'] };
  const STOKER = { base: 'man', build: 'big', top: '#5a5652', bottom: '#33302e', skin: '#c89a7a', hairStyle: 'buzz', extras: ['suspenders'] };
  const ENGINEER = { base: 'man', top: '#3a4a5a', bottom: '#3a4a5a', hairStyle: 'cap', hair: '#2a2a2a', extras: ['goggles'] };
  const GENT = (jacket, extra) => ({ base: 'man', top: '#f0f0f0', jacket, bottom: jacket, hairStyle: 'slick', extras: ['suit', 'tie'].concat(extra || []) });
  const LADY = (col, hair) => ({ base: 'woman', top: col, bottom: col, skirt: 'long', hairStyle: hair || 'bob', extras: ['bangles'] });

  // ================================================================== shared bits
  const say = (who, line) => function* (s) { yield s.say(who, line); };
  const folk = (o) => ({ id: o.id, name: o.name, model: o.model, at: o.at, dir: o.dir || 'down', wander: o.wander || 0, anim: o.anim, hover: o.hover, show: o.show, faceOnTalk: o.faceOnTalk,
    talk: o.talk || function* (s) { const t = typeof o.lines === 'function' ? o.lines(s) : o.lines; yield s.say(o.name, t); } });
  const sitting = (o) => folk(Object.assign({ anim: 'sit', hover: 0.14, faceOnTalk: false }, o));
  // where she lies: 'costa' (port side to the quay at Costa del Kupo) or 'route10' (starboard side to the Route 10 quay)
  const portOf = (s) => s.get('kp_ss_port') === 'costa' ? 'costa' : 'route10';
  const PORTS = {
    route10: { name: 'the Seabreeze Coast', label: 'Seabreeze Coast', side: 'starboard' },
    costa: { name: 'Costa del Kupo', label: 'Costa del Kupo', side: 'port' },
  };
  const LOOK_FIRST = { floor: ['#6a4a30', '#644428'], floor2: ['#b08a5c', '#a88256'], floor3: ['#7a2228', '#701e24'], wall: '#dccbaa', trim: '#6a4a2a', wallH: 2.5,
    checker: ['#ece4d4', '#2a2a30'], floorTex: { floor: 'planks', floor2: 'planks', floor3: 'carpet', chk: false }, wallTex: 'panel', window: '#9ac4e0', pillar: '#e8dcc0',
    sky: ['#000000', '#000000'], ambient: [0.5, 0.46, 0.42], light: [0.86, 0.8, 0.68], indoor: true, lamp: '#ffe8b8' };
  const LOOK_CREW = { floor: ['#5e5c56', '#58564f'], floor2: ['#6a6660', '#646058'], wall: '#7e868c', trim: '#3a4048', wallH: 2.4, metal: ['#6a6e72', '#5a5e62'],
    floorTex: { floor: 'metal', floor2: 'planks' }, wallTex: 'panel', sky: ['#000000', '#000000'], ambient: [0.42, 0.44, 0.48], light: [0.72, 0.72, 0.7], indoor: true };
  const LOOK_ENGINE = Object.assign({}, LOOK_CREW, { wall: '#5a6066', floor: ['#4e5052', '#484a4c'], wallH: 3.6, ambient: [0.34, 0.34, 0.38], light: [0.66, 0.6, 0.54], floorTex: { floor: 'grate' } });
  // portholes along a wall row (props on its wall tiles): xs, the wall row y, rot (0: a north wall's face; 180: a south wall's)
  const portholes = (xs, y, o) => xs.map(x => Object.assign({ at: [x, y], prop: 'porthole', r: 0.17, y: 1.3, col: '#6aa8d8', col2: '#c8a040', stars: false }, o || {}));

  // ================================================================== the lifts: brass cages, an operator in each
  // stops top to bottom: { map, entry (inside the car), label (the operator's choice; the runner's `choose`), short (the dial) }
  const LIFTS = {
    grand: { id: 'ssm_liftboy', name: 'Lift Boy', model: LIFTBOY, title: 'GRAND LIFT',
      ask: (here) => `Grand Lift, at your service! We're at the ${here.label}. Which deck, please?`, stay: 'Very good! Ring if you need me. Well, just talk to me. There\'s no bell.',
      stops: [
        { map: 'kp_ss_sundeck', entry: 'lift', label: 'Sun Deck', short: 'SUN', tip: 'Sunshine, lifeboats and the Bridge forward.' },
        { map: 'kp_ss_promenade', entry: 'lift', label: 'Promenade Deck', short: 'PROM', tip: 'The Purser\'s desk, the Lounge and the Smoking Room.' },
        { map: 'kp_ss_bdeck', entry: 'lift', label: 'B Deck: Staterooms', short: 'B', tip: 'First-class staterooms. Mind the carpets, they\'re very expensive.' },
        { map: 'kp_ss_saloon', entry: 'lift', label: 'C Deck: Dining Saloon', short: 'C', tip: 'The Dining Saloon. Something smells wonderful.' },
      ] },
    service: { id: 'ssm_liftman', name: 'Liftman', model: LIFTMAN, title: 'SERVICE LIFT',
      ask: (here) => `Service Lift. ${here.label}. Crew and cargo, mostly, but I don't mind a Champion. Where to?`, stay: 'Suit yourself. I\'ll be here. I\'m always here.',
      stops: [
        { map: 'kp_ss_saloon', entry: 'svclift', label: 'C Deck: Galley', short: 'C', tip: 'The galley. Don\'t touch the soup.' },
        { map: 'kp_ss_ddeck', entry: 'svclift', label: 'D Deck: Second Class and Crew', short: 'D', tip: 'Second class aft, the crew forward.' },
        { map: 'kp_ss_hold', entry: 'svclift', label: 'E Deck: Cargo Holds', short: 'E', tip: 'The holds. Watch for loose chocobos.' },
        { map: 'kp_ss_engine', entry: 'svclift', label: 'F Deck: Engine Room', short: 'F', tip: 'The Engine Room. Bring earmuffs.' },
      ] },
  };
  // the floor indicator: a brass dial at the top of the screen, its needle sweeping from deck a to deck b (k 0..1)
  const drawDial = (c, L, a, b, k) => {
    const R = FF7.render, n = L.stops.length, cx = FF7.W / 2, cy = 104, r = 74, ang = (i) => PI + (i + 0.5) / n * PI;
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, na = ang(a) + (ang(b) - ang(a)) * e;
    c.save();
    c.fillStyle = 'rgba(20,14,8,0.82)'; c.beginPath(); c.arc(cx, cy, r + 16, PI, PI * 2); c.lineTo(cx + r + 16, cy + 18); c.lineTo(cx - r - 16, cy + 18); c.closePath(); c.fill();
    c.lineWidth = 6; c.strokeStyle = '#c8a040'; c.beginPath(); c.arc(cx, cy, r + 8, PI, PI * 2); c.stroke();
    c.fillStyle = '#f2e6c4'; c.beginPath(); c.arc(cx, cy, r, PI, PI * 2); c.closePath(); c.fill();
    c.lineWidth = 2; c.strokeStyle = '#3a2a1a';
    for (let i = 0; i < n; i++) { const t = ang(i); c.beginPath(); c.moveTo(cx + Math.cos(t) * (r - 14), cy + Math.sin(t) * (r - 14)); c.lineTo(cx + Math.cos(t) * (r - 2), cy + Math.sin(t) * (r - 2)); c.stroke();
      R.text(L.stops[i].short, cx + Math.cos(t) * (r - 30), cy + Math.sin(t) * (r - 30) - 7, { align: 'center', size: 13, color: i === b ? '#a02a20' : '#3a2a1a' }); }
    c.lineWidth = 4; c.strokeStyle = '#2a1a10'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(na) * (r - 8), cy + Math.sin(na) * (r - 8)); c.stroke();
    c.fillStyle = '#c8a040'; c.beginPath(); c.arc(cx, cy, 8, 0, PI * 2); c.fill();
    R.text(L.title, cx, cy + 2, { align: 'center', size: 11, color: '#e8d8a8' });
    c.restore();
  };
  // a ride: the gate rattles shut, the dial's needle sweeps, a ding, and the gate opens on the other deck
  function* ride(s, L, a, b) {
    const dest = L.stops[b], fs = s.field;
    yield s.say(L.name, `${b < a ? 'Going up' : 'Going down'}! ${dest.label}. Mind the gate, please.`);
    KP._ssmGate = true; s.sfx('gate');
    yield 22;
    s.sfx('elevator');
    let t = 0; const N = 80;
    if (fs) fs.onRender2D = (c) => drawDial(c, L, a, b, Math.min(1, t / N));
    for (; t <= N; t++) yield 1;
    s.sfx('ching');
    yield 12;
    yield s.fadeOut(14);
    if (fs) fs.onRender2D = null;
    yield s.goto(dest.map, dest.entry);
    yield 12;
    s.sfx('gate'); KP._ssmGate = false;
    yield s.say(L.name, `${dest.label}! ${dest.tip}`);
  }
  const liftTalk = (L, i) => function* (s) {
    const here = L.stops[i], others = L.stops.filter((_, k) => k !== i);
    const c = yield s.ask(L.name, L.ask(here), others.map(o => o.label).concat(['Stay here']));
    if (c < 0 || c >= others.length) { yield s.say(L.name, L.stay); return; }
    yield* ride(s, L, i, L.stops.indexOf(others[c]));
  };
  // a lift's stop on a map: the car's top-left tile (x, y) (2 x 2 tiles, against the north wall, its front open to the
  // south): the cage prop, the operator (inside, top-left, facing out), the gate object, the map's links to the other stops
  const liftStop = (key, map, x, y) => {
    const L = LIFTS[key], i = L.stops.findIndex(st => st.map === map);
    return {
      props: [{ at: [x + 0.5, y + 0.5], prop: 'liftcage', w: 2, d: 2 }],
      objects: [{ id: 'ssm_gate_' + key, at: [x + 0.5, y + 1.5], prop: 'liftgate', w: 2, solid: false, hidden: true, tick(o) { o.hidden = !KP._ssmGate; } }],
      npc: { id: L.id, name: L.name, model: L.model, at: [x, y], dir: 'down', talk: liftTalk(L, i) },
      links: L.stops.filter((_, k) => k !== i).map(st => ({ to: st.map, npc: L.id, choose: st.label })),
    };
  };
  // (a map's own pieces merged with its lift stops' pieces; arriving any way but by lift, the gates stand open)
  const withLifts = (def, stops) => {
    stops.forEach(st => {
      def.props = (def.props || []).concat(st.props); def.objects = (def.objects || []).concat(st.objects);
      def.npcs = (def.npcs || []).concat([st.npc]); def.links = (def.links || []).concat(st.links);
    });
    const own = def.onLoad;
    def.onLoad = function (s) { const e = s.entry && s.entry(); if (e !== 'lift' && e !== 'svclift') KP._ssmGate = false; if (own) own(s); };
    return def;
  };

  // ================================================================== the Captain, and the voyage
  const CAPT = 'Captain Mogellan';
  const sail = function* (s, there) {
    const P = PORTS[there];
    yield s.say(CAPT, `${P.name} it is! Mister Rook, single up the lines. Helmsman, ring down slow ahead!`);
    yield s.say('Helmsman', 'Slow ahead, aye aye, Captain!');
    s.sfx('ching'); yield 10; s.sfx('ching'); yield 26;
    s.sfx('train_horn'); s.shake(1, 30); yield 56;
    yield s.fadeOut(36);
    yield s.goto('kp_ss_atsea', there === 'costa' ? 'eastbound' : 'westbound');
    yield 40;
    s.sfx('train_horn');
    yield s.caption(`The S.S. Moogle steams out across the bay,\nbound for ${P.name}.`, { hold: 150, bg: 'rgba(0,0,0,0.25)' });
    yield 70;
    yield s.fadeOut(40);
    s.setVar('kp_ss_port', there);
    // she docks: you're still aboard, on the Promenade Deck beside the gangway door that now opens on the quay (a
    // different map from the Bridge, so the Demo's travel link sees the voyage end and walks off from here)
    yield s.goto('kp_ss_promenade', there === 'costa' ? 'docked_costa' : 'docked_route10');
    s.sfx('ching'); yield 16; s.sfx('door');
    yield s.say('Steward', `${P.name}! All ashore that's going ashore! The gangway's down through this door, ${P.side} side.\fThe Captain sends his compliments: "Finished with engines, and not a teacup broken." He'll be on the Bridge whenever you'd like to sail again.`);
  };
  const captainTalk = function* (s) {
    const here = portOf(s), there = here === 'costa' ? 'route10' : 'costa', P = PORTS[there];
    if (!s.flag('kp_ssm_captain')) {
      s.set('kp_ssm_captain');
      yield s.say(CAPT, "Ahoy, and welcome to the Bridge! Barnaby Mogellan, master of the S.S. Moogle. Forty years at sea, and I've never once lost a passenger. Misplaced a few. Found them all again.\fSo you're the new Champion! The whole ship's talking about you. The stokers have a betting pool going on the World Championship.");
    }
    const c = yield s.ask(CAPT, `We're tied up at ${PORTS[here].name}. Shall we make way for ${P.name}?`, [`Set sail for ${P.label}`, 'Not just yet']);
    if (c !== 0) { yield s.say(CAPT, "Take your time! Have a stroll about the decks. The Dining Saloon does a fine Kupo Nut tart, and the engine room is a wonder, if you like noise."); return; }
    yield* sail(s, there);
  };

  // ================================================================== the trainers aboard (post-Champion: written at the old cap of 30, as every map's)
  const TR = {
    hawser: W.trainer({ id: 'ssm_hawser', cls: 'Sailor', name: 'Hawser', model: SAILOR, at: [26, 4], dir: 'down', sight: [26, 5, 1, 3],
      line: "Ahoy, Champion! Every sailor on this deck's been waiting for a crack at you. I won the coin toss!",
      lose: 'Hove to and boarded. Fair and square.', after: 'Mind the lifeboats. The Captain counts them twice a day, and he gets cross if one is missing.',
      team: [['vikmog_viking', 30, { held: 'focus_pom' }], ['wavekin_surfer', 29], ['mogmont_bard', 29]], money: 1300 }),
    kit: W.trainer({ id: 'ssm_kit', cls: 'Schoolkid', name: 'Kit', model: 'kid5', at: [5, 10], dir: 'right', sight: [6, 10, 4, 1],
      line: "My kite went up, up, UP! ...and then it went into the sea. Battle me so I feel better!",
      lose: 'Wah! Now I lost a kite AND a battle!', after: "When I grow up I'm going to be a Captain. Or a kite. Something that goes up high.",
      team: [['kitemog_skydiver', 28], ['vaultkin_pole_vaulter', 28]], money: 1120 }),
    rosalind: W.trainer({ id: 'ssm_rosalind', cls: 'Lady', name: 'Rosalind', model: LADY('#5a8ab0', 'bob'), at: [8, 13], dir: 'right', sight: [9, 13, 4, 1],
      line: "One can only watch the waves for so long, darling. Shall we have a little battle? Do try to keep up.",
      lose: 'Goodness. You are rather good, aren\'t you?', after: 'The sea air does wonders for the complexion. Moogles too. Look how fluffy mine have gone.',
      team: [['katalmog_dancer', 29], ['mogcasso_pictomancer', 29], ['pixipom_scholar', 30, { held: 'quick_gear' }]], money: 1320 }),
    fitzroy: W.trainer({ id: 'ssm_fitzroy', cls: 'Gentleman', name: 'Fitzroy', model: GENT('#3a2a2a', 'mustache'), at: [10, 6], dir: 'left', sight: [7, 6, 3, 1],
      line: "I say! The Champion, in the First-Class Lounge? Then I insist on a match. Loser buys the cocoa.",
      lose: 'Splendid! Thoroughly beaten. Steward, two cocoas.', after: 'I shall be in the Smoking Room, telling everyone I lasted three whole turns.',
      team: [['figamog_machinist_king', 30, { held: 'leftover_nut' }], ['tsubamog_samurai', 29]], money: 1400 }),
    basil: W.trainer({ id: 'ssm_basil', cls: 'Waiter', name: 'Basil', model: WAITER, at: [13, 7], dir: 'down', sight: [13, 8, 1, 4],
      line: "Table for one? Our special tonight is a battle, served piping hot. Allow me to show you to your defeat!",
      lose: 'My compliments to the Champion. And to their moogles.', after: 'The cook says the soup was ruined by all the commotion. I say the soup was ruined by the cook.',
      team: [['mixikupo_chemist', 29], ['salvepom_green_mage', 29], ['farmmog_harvester', 29]], money: 1160 }),
    grogan: W.trainer({ id: 'ssm_grogan', cls: 'Bosun', name: 'Grogan', model: { base: 'sailor', build: 'big', extras: ['beard'] }, at: [38, 8], dir: 'left', sight: [33, 8, 5, 1],
      line: "Passengers in the crew mess? Hmph. Well, you're here now. Let's see if you're Champion stock, or just ballast!",
      lose: 'Ballast I called you. I take it back. All of it.', after: "The bunks are hard and the coffee's harder. Best life there is.",
      team: [['breakpom_foebreaker', 30], ['drakemog_dragon_knight', 29]], money: 1360 }),
    sacks: W.trainer({ id: 'ssm_sacks', cls: 'Dockhand', name: 'Sacks', model: { base: 'worker', top: '#7a5a3a', extras: ['suspenders'] }, at: [24, 10], dir: 'left', sight: [20, 10, 4, 1],
      line: "Careful, these chocobos are bound for the Gold Saucer races. And so is this battle! ...That didn't make sense. Battle!",
      lose: 'Dropped the crate on that one.', after: 'The big birds are calmer at sea. The mail moogle is not.',
      team: [['saddlepom_fat_chocobo', 29], ['kurokweh_black_chocobo', 29], ['goldkweh_gold_chocobo', 30]], money: 1240 }),
    shade: W.trainer({ id: 'ssm_shade', cls: 'Stowaway', name: 'Shade', model: { base: 'ninja', top: '#2a2a34', bottom: '#2a2a34' }, at: [41, 13], dir: 'up', sight: [41, 10, 1, 3],
      line: "You saw me?! Nobody sees me! I've been riding this ship for three crossings for free! You'll never tell!",
      lose: 'Caught... Fine. I\'ll buy a ticket. Next time.', after: "Don't tell the Purser. I'll pay him back in Kupo Nuts. Somebody's Kupo Nuts.",
      team: [['mithpom_shinobi', 29], ['kagepom_assassin', 29], ['eblakin_prince', 30, { held: 'lucky_pom' }]], money: 1200 }),
    rivets: W.trainer({ id: 'ssm_rivets', cls: 'Engineer', name: 'Rivets', model: ENGINEER, at: [30, 4], dir: 'left', sight: [27, 4, 3, 1],
      line: "Thirty thousand horsepower behind me and you want to battle? HA! I like you already!",
      lose: 'Blew a gasket. Mine, not the engine\'s.', after: "Hear that rhythm? Chuff, chuff, chuff. That's the sound of a happy ship.",
      team: [['steelmog_ace', 29], ['synthmog_grand_synthesist', 29], ['triggermog_deadeye', 30]], money: 1240 }),
    cinders: W.trainer({ id: 'ssm_cinders', cls: 'Stoker', name: 'Cinders', model: STOKER, at: [10, 5], dir: 'down', sight: [10, 6, 1, 4],
      line: "Down here we feed the fires, Champion. Want to feel the heat? I'll stoke you up a battle!",
      lose: 'Banked. Clean out of coal.', after: "Two hundred tons of coal a day. Every shovel of it by hand. Your moogles could lend a paw, you know.",
      team: [['hellkupo_hell_knight', 29], ['steinmog_magic_knight', 29], ['spellmog_spellblade', 30, { held: 'boost_blackmage' }]], money: 1280 }),
    // the staterooms and the second-class cabin
    ashcombe: W.trainer({ id: 'ssm_ashcombe', cls: 'Gentleman', name: 'Ashcombe', model: GENT('#2a3a2a', 'glasses'), at: [10, 5], dir: 'left', sight: [7, 5, 3, 1],
      line: "One doesn't usually receive callers in one's stateroom. But for the Champion I shall make an exception. En garde!",
      lose: 'Touché, as the fencers say. And they say it a lot.', after: 'My great-grandfather crossed on the first S.S. Moogle. She sank. Well, she ran aground in a bathtub. It was a model.',
      team: [['ziegpom_swordmaster', 29], ['glyphmog_rune_fencer', 29], ['shogunpom_shogun', 30]], money: 1360 }),
    pemberly: W.trainer({ id: 'ssm_pemberly', cls: 'Lady', name: 'Pemberly', model: LADY('#8a2a5a', 'long'), at: [4, 5], dir: 'right', sight: [5, 5, 4, 1],
      line: "Mi mi mi miii... Oh! An audience! I'm resting my voice for the Costa Opera. My moogles, however, are in full song!",
      lose: 'Bravo! Bravissimo! An encore? No? Very well.', after: 'Tonight I sing in the Dining Saloon. Bring a cushion. My high notes have been known to loosen rivets.',
      team: [['mariapom_prima_donna', 30, { held: 'boost_bard' }], ['sirenkupo_siren', 30]], money: 1400 }),
    twins: W.trainer({ id: 'ssm_twins', cls: 'Twins', name: 'Tam & Tod', model: { base: 'kid', top: '#3a7a5a', bottom: '#2a2a3a', hairStyle: 'cap' }, at: [6, 3], dir: 'down', sight: [6, 4, 1, 2],
      line: "We're Tam and Tod! We're going on holiday! We battle together and we never ever lose! (We lose a bit.)",
      lose: "Tod, you said they'd be easy! / I said they'd be EASY-GOING!", after: 'Mum says we have to share a bunk. Tod kicks.',
      team: [['pipkin_onion_knight', 28], ['urkin_onion_knight', 28]], money: 1120 }),
  };

  // ================================================================== Promenade Deck (A Deck): the shell doors, the hall, the Lounge, the Smoking Room
  // The shell doors amidships: port side (north wall) to Costa del Kupo, starboard (south wall) to Route 10; only the one
  // on the quay side is open. The Grand Staircase: up to the Sun Deck (north-west recess), down to B Deck (north-east).
  const PROM = [
    "####################++######################",
    "#k_kk___kk_k##..#xxxxxx#EE##..##k..DDDDD..k#",
    "#___________##^^#xxxxxx#EE##^^##...........#",
    "#_ARA___ARA_##^^#xxxxxxxxxx#^^##.ctc...ctc.#",
    "#___________#xxxxxxxxxxxxxxxxxx#...........#",
    "#F____p______xxxxxxxxxxxxxxxxxx..ctc...ctc.#",
    "#____________xxxxYxxxxxxxxYxxxx............#",
    "#_ARA___ARA_#xxxxxxxxxxxxxxxxxx#k.........k#",
    "#___________#xxDDDxxxxxxxxxxxxx#.AtA...AtA.#",
    "#Y_________Y#xxxxxxxxxxxxxxxxxx#...........#",
    "#___________#xxxxxxxxxxxxxxxxxx#Y.........Y#",
    "#wwww___wwww###xxxxxxxxxxxxxx###wwww...wwww#",
    "#::::::::::::::::::::::::::::::::::::::::::#",
    "#::::::::::::::::::::::::::::::::::::::::::#",
    "#Q:Q:Q:::::::Y::::::::::::::::Y::::::Q:Q:Q:#",
    "#wwwwwwwwwwwwwwwwwww++wwwwwwwwwwwwwwwwwwwww#",
  ];
  const H2 = (n) => '2'.repeat(n);
  const PROMH = PROM.map((r, y) => y === 1 ? H2(14) + '55' + H2(12) + '00' + H2(14) : y === 2 ? H2(14) + '44' + H2(12) + '11' + H2(14) : y === 3 ? H2(14) + '33' + H2(12) + '11' + H2(14) : H2(44));
  const promLoad = (s) => { const e = s.entry(); if (e === 'from_costa') s.setVar('kp_ss_port', 'costa'); else if (e === 'from_route10') s.setVar('kp_ss_port', 'route10'); };
  FF7.defineMap('kp_ss_promenade', withLifts({
    name: 'S.S. Moogle - Promenade Deck', area: 'S.S. Moogle', theme: 'mansion', music: 'waltz_chocobo', kpBg: 'town',
    look: LOOK_FIRST,
    grid: PROM, heights: PROMH,
    legend: { x: 'chkfloor', A: 'armchair', R: 'roundtable', p: 'piano', Y: 'planter', Q: 'deckchair' },
    props: [
      { at: [2, 3], prop: 'armchair', rot: 90 }, { at: [4, 3], prop: 'armchair', rot: -90 }, { at: [8, 3], prop: 'armchair', rot: 90 }, { at: [10, 3], prop: 'armchair', rot: -90 },
      { at: [2, 7], prop: 'armchair', rot: 90, col: '#5a3a5a' }, { at: [4, 7], prop: 'armchair', rot: -90, col: '#5a3a5a' }, { at: [8, 7], prop: 'armchair', rot: 90, col: '#5a3a5a' }, { at: [10, 7], prop: 'armchair', rot: -90, col: '#5a3a5a' },
      { at: [33, 8], prop: 'armchair', rot: 90, col: '#3a5a3a' }, { at: [35, 8], prop: 'armchair', rot: -90, col: '#3a5a3a' }, { at: [39, 8], prop: 'armchair', rot: 90, col: '#3a5a3a' }, { at: [41, 8], prop: 'armchair', rot: -90, col: '#3a5a3a' },
      { at: [33, 3], prop: 'chair', rot: 90 }, { at: [35, 3], prop: 'chair', rot: -90 }, { at: [39, 3], prop: 'chair', rot: 90 }, { at: [41, 3], prop: 'chair', rot: -90 },
      { at: [33, 5], prop: 'chair', rot: 90 }, { at: [35, 5], prop: 'chair', rot: -90 }, { at: [39, 5], prop: 'chair', rot: 90 }, { at: [41, 5], prop: 'chair', rot: -90 },
      ...[[1, 9], [11, 9], [17, 6], [26, 6], [32, 10], [42, 10], [13, 14], [30, 14]].map(at => ({ at, prop: 'planter', plant: 'tree', r: 0.32, h: 0.34, col: '#c8a040', treeH: 1.4 })),
      { at: [1, 5], prop: 'fireplace', col: '#ff9040', col2: '#8a6a52' },
      ...portholes([5, 6, 7], 0), ...portholes([33, 34, 39, 40], 0),
      { at: [14, 0], prop: 'lifering', rot: 0 }, { at: [29, 0], prop: 'lifering', rot: 0 },
    ],
    labels: [
      { at: [20.5, 0], face: 's', text: 'PORT GANGWAY', size: 0.1, col: '#c8a040', y: 2.15 },
      { at: [14.5, 0], face: 's', text: 'SUN DECK', size: 0.09, col: '#c8a040', y: 2.2 }, { at: [28.5, 0], face: 's', text: 'B DECK', size: 0.09, col: '#c8a040', y: 2.2 },
      { at: [24.5, 0], face: 's', text: 'GRAND LIFT', size: 0.08, col: '#c8a040', y: 2.32 },
      { at: [16, 8], face: 's', text: 'PURSER', size: 0.09, col: '#c8a040', y: 0.62 },
      { at: [6, 0], face: 's', text: 'FIRST-CLASS LOUNGE', size: 0.09, col: '#c8a040', y: 2.1 }, { at: [37, 0], face: 's', text: 'SMOKING ROOM', size: 0.09, col: '#c8a040', y: 2.1 },
    ],
    lights: [[6, 4, '#ffe0b0', 4.5], [21, 6, '#fff0d0', 5], [37, 5, '#ffe0b0', 4.5], [12, 13, '#fff8e0', 4], [30, 13, '#fff8e0', 4], [1, 5, '#ff9a40', 2.5]],
    entries: { from_costa: [20, 1, 'down'], from_route10: [20, 14, 'up'], from_sundeck: [14, 4, 'down'], from_bdeck: [28, 4, 'down'], lift: [25, 2, 'down'],
      docked_costa: [21, 2, 'up'], docked_route10: [21, 13, 'down'] },   // (where a voyage ends: beside the door on the quay side)
    exits: [
      { at: [20, 0, 2, 1], to: 'kp_costa', entry: 'from_ship', sfx: 'door', if: s => portOf(s) === 'costa',
        blocked: function* (s) { yield s.say('Steward', "The port gangway door is shut, I'm afraid. We're tied up starboard side today: the gangway's on the other side of the ship, past the promenade."); } },
      { at: [20, 15, 2, 1], to: 'kp_route10', entry: 'from_ship', sfx: 'door', if: s => portOf(s) !== 'costa',
        blocked: function* (s) { yield s.say('Steward', "The starboard gangway door is shut, I'm afraid. We're tied up port side here: the gangway's across the hall, on the north side."); } },
      { at: [14, 1, 2, 1], to: 'kp_ss_sundeck', entry: 'from_promenade' },
      { at: [28, 1, 2, 1], to: 'kp_ss_bdeck', entry: 'from_promenade' },
    ],
    npcs: [
      folk({ id: 'ssm_purser', name: 'Purser Quill', model: PURSER, at: [16, 7], dir: 'down', talk: function* (s) {
        yield s.say('Purser Quill', `Welcome aboard the S.S. Moogle! ${portOf(s) === 'costa' ? "We're alongside at Costa del Kupo." : "We're alongside on the Seabreeze Coast."}\fThe Captain's on the Bridge: up the Grand Staircase to the Sun Deck, then forward. Tell him where you're bound and we'll make way.`);
        yield s.say('Purser Quill', "Staterooms are on B Deck, the Dining Saloon below that on C, second class and the crew on D. The holds and the engines are further down still. The lifts will take you, or the stairs if you like the exercise."); } }),
      folk({ id: 'ssm_bellboy', name: 'Bellboy', model: LIFTBOY, at: [21, 9], dir: 'down', wander: 1,
        lines: "Luggage? Hat boxes? Moogle carriers? I can carry anything up to three suitcases high. Four if nobody sneezes." }),
      sitting({ id: 'ssm_pianist', name: 'Pianist', model: GENT('#1a1a1e', 'bowtie'), at: [6, 6], dir: 'up', talk: function* (s) {
        s.sfx('piano_chord2'); yield 20; s.sfx('piano3'); yield 14; s.sfx('piano5');
        yield s.say('Pianist', "Requests? I know three hundred waltzes. Well, I know one waltz. I play it three hundred ways."); } }),
      sitting({ id: 'ssm_dowager', name: 'Dowager', model: { base: 'oldwoman', top: '#6a4a7a', bottom: '#6a4a7a', skirt: 'long', extras: ['bangles'] }, at: [2, 7], dir: 'right',
        lines: "Eleven crossings I've made on this ship. The service is impeccable, the food divine, and the Captain sings in the bath. Loudly. Every single morning." }),
      sitting({ id: 'ssm_reader', name: 'Passenger', model: GENT('#4a4a5a', 'glasses'), at: [33, 3], dir: 'right',
        lines: "Shh. I'm reading the ship's newspaper. Headline: 'Sea Still Wet.' Riveting stuff." }),
      folk({ id: 'ssm_smokesteward', name: 'Steward', model: STEWARD, at: [37, 2], dir: 'down',
        lines: "Lemonade, cocoa or Kupo Nut milk? The Smoking Room hasn't allowed smoking for years. The name stuck. So did the armchairs, rather." }),
      folk({ id: 'ssm_promkid', name: 'Kid', model: 'kid2', at: [34, 12], dir: 'down', wander: 2,
        lines: "I counted every window on this deck! Forty-two! Then I counted again and got forty-three. I think one's a painting." }),
      folk({ id: 'ssm_promsteward', name: 'Steward', model: STEWARD, at: [22, 13], dir: 'up',
        lines: s => portOf(s) === 'costa' ? "The gangway's through the port door, north side of the hall. Mind your step: the tide's up." : "The gangway's just behind me, through the starboard door. Mind your step: the planks are polished." }),
      W.moogle('ssm_prom_mog', 'partypom_partygoer', [27, 7], { wander: 2, line: 'Partypom: Kupo kupo! It is wearing a tiny paper hat. Every day is a party on the S.S. Moogle.' }),
      TR.fitzroy.npc, TR.rosalind.npc,
    ],
    objects: [],
    items: [W.item('ssm_prom_lounge', [11, 2], 'golden_nut', 3), W.item('ssm_prom_smoke', [42, 2], 'boost_redmage')],
    triggers: [
      { at: [15, 8, 3, 1], on: 'talk', run: function* (s) { yield* FF7.maps.kp_ss_promenade.npcs.find(n => n.id === 'ssm_purser').talk(s); } },
      { at: [35, 1, 5, 1], on: 'talk', run: say('Steward', "Lemonade, cocoa or Kupo Nut milk? On the house, Champion. Well, on the ship.") },
      W.sign([12, 11], 'S.S. MOOGLE - PROMENADE DECK\fSun Deck and Bridge: Grand Staircase up.\fB Deck staterooms, C Deck Dining Saloon: Grand Staircase down, or the Grand Lift.'),
      TR.fitzroy.trig, TR.rosalind.trig,
    ],
    onLoad: promLoad,
  }, [liftStop('grand', 'kp_ss_promenade', 24, 1)]));

  // ================================================================== the Sun Deck: lifeboats, funnels, deck chairs, the Bridge forward
  const SUN = [
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "~==========================================~",
    "~=.LL.LL..hhhh....hhhh....LL.LL.LL........=~",
    "~=........hhhh....hEEh..............hhhhhh=~",
    "~=........h++h....hEEh..............hhhhhh=~",
    "~=..................................whhhhh=~",
    "~=...........V.............V........whhhhh=~",
    "~=......UUU....UUU....UUU....UUU....+hhhhh=~",
    "~=......UUU....UUU....UUU....UUU....+hhhhh=~",
    "~=..................................whhhhh=~",
    "~=...........V.............V........whhhhh=~",
    "~=..................................hhhhhh=~",
    "~=..................................hhhhhh=~",
    "~=.Q.Q.Q.Q.Q........................hhhhhh=~",
    "~=..................................hhhhhh=~",
    "~=.LL.LL.LL.............LL.LL.LL.LL.......=~",
    "~==========================================~",
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  ];
  const SUNH = SUN.map((r, y) => (y === 0 || y === SUN.length - 1) ? '0'.repeat(44) : '0' + '6'.repeat(42) + '0');
  const NORTH_BOATS = [3, 6, 26, 29, 32];
  FF7.defineMap('kp_ss_sundeck', withLifts({
    name: 'S.S. Moogle - Sun Deck', area: 'S.S. Moogle', theme: 'ship', music: 'fiddle', kpBg: 'beach',
    look: { floor: ['#b89870', '#b09068'], floor2: ['#b89870', '#b09068'], floorTex: { floor: 'planks', floor2: 'planks' }, wall: '#f0ede4', bldg: '#f0ede4', roof: '#d8d2c4', wallTex: { bldg: 'panel', wall: 'panel' },
      bldgWin: '#9ac4e0', water: '#2a7ab8', sky: ['#4a9ae0', '#e8f4ff'], clouds: { col: '#ffffff', alpha: 0.5, n: 8, speed: 0.2 }, ambient: [0.56, 0.56, 0.58], light: [0.95, 0.92, 0.86], fog: { color: [0.62, 0.78, 0.92], near: 14, far: 34 } },
    grid: SUN, heights: SUNH,
    legend: { L: 'lifeboat', U: 'funnel', V: 'ventcowl', Q: 'deckchair' },
    buildings: [
      { at: [10, 2, 4, 3], h: 1.3, col: '#f0ede4', roof: '#d8d2c4', top: 'flat', win: '#9ac4e0' },
      { at: [36, 3, 6, 12], h: 2.4, col: '#f0ede4', roof: '#d8d2c4', top: 'flat', win: '#9ac4e0' },
    ],
    props: NORTH_BOATS.map(x => ({ at: [x, 2], rot: 180 })).concat([
      { at: [11.5, 3], prop: 'skydome', r: 1.5, h: 0.75, lift: 1.3 },
      ...[[3, 13], [5, 13], [7, 13], [9, 13], [11, 13]].map(([x, y], i) => ({ at: [x, y], prop: 'deckchair', col: ['#dce8f0', '#f0dce0', '#e8f0dc'][i % 3] })),
      { at: [36, 2], prop: 'lifering', rot: 0, y: 1.0 },
    ]),
    labels: [
      { at: [11.5, 4], face: 's', text: 'GRAND STAIRCASE', size: 0.09, col: '#3a5a8a', y: 1.05 },
      { at: [19.5, 4], face: 's', text: 'LIFT', size: 0.1, col: '#3a5a8a', y: 2.05 },
      { at: [36, 7.5], face: 'w', text: 'BRIDGE', size: 0.12, col: '#3a5a8a', y: 1.9 },
      // a shuffleboard court painted on the deck
      { at: [19, 11.5], text: '10', size: 0.26, col: '#f4f4ec', rot: 90 }, { at: [21, 11.5], text: '8', size: 0.26, col: '#f4f4ec', rot: 90 }, { at: [23, 11.5], text: '7', size: 0.26, col: '#f4f4ec', rot: 90 },
      { at: [25, 11.5], text: 'OFF', size: 0.2, col: '#e8c040', rot: 90 },
    ],
    entries: { from_promenade: [11, 5, 'down'], from_bridge: [35, 7, 'left'], lift: [20, 4, 'down'] },
    exits: [
      { at: [11, 4, 2, 1], to: 'kp_ss_promenade', entry: 'from_sundeck', sfx: 'door' },
      { at: [36, 7, 1, 2], to: 'kp_ss_bridge', entry: 'from_deck', sfx: 'door' },
    ],
    npcs: [
      TR.hawser.npc, TR.kit.npc,
      folk({ id: 'ssm_firstofficer', name: 'First Officer Rook', model: OFFICER, at: [34, 9], dir: 'left',
        lines: s => `The Captain's on the Bridge, just through that door. ${portOf(s) === 'costa' ? "When you're ready to head back to the mainland" : "When you're ready for Costa del Kupo"}, tell him so, and he'll have us under way in a jiffy.` }),
      folk({ id: 'ssm_swabber', name: 'Deckhand', model: DECKHAND, at: [16, 12], dir: 'left', anim: 'kneel', faceOnTalk: false,
        lines: "Scrub, scrub, scrub. I've scrubbed this deck so many times I can see my face in it. It's not a great face. Very shiny, though." }),
      sitting({ id: 'ssm_sunbather', name: 'Passenger', model: LADY('#e0a040', 'ponytail'), at: [5, 13], dir: 'down',
        lines: "Don't block my sun, darling. I'm working on a tan in the shape of a deck chair." }),
      folk({ id: 'ssm_photographer', name: 'Photographer', model: { base: 'man', top: '#8a6a4a', bottom: '#4a3a2a', hairStyle: 'short', extras: ['vest'] }, at: [22, 13], dir: 'up',
        lines: "Smile! ...Hold it... hold it... The funnels won't fit in the picture. They never do. Nobody's ever photographed the whole ship at once." }),
      folk({ id: 'ssm_lookout', name: 'Lookout', model: SAILOR, at: [41, 2], dir: 'up',
        lines: "Nothing to report! Sea, sea, more sea, a gull, more sea. Oh! A second gull. Exciting day." }),
      W.moogle('ssm_sun_mog', 'seamog_sailor', [30, 11], { wander: 2, line: 'Seamog: Kupo-hoy! It is practising its knots on a coil of rope. It has tied itself to the rail.' }),
    ],
    items: [W.item('ssm_sun_bow', [40, 15], 'royal_nut')],
    triggers: [
      W.hidden('ssm_lifeboat', [29, 2], 'max_oil', 2),
      { at: [8, 7, 3, 2], on: 'talk', run: function* (s) { yield s.msg("A funnel, red as a moogle's pom-pom, rising far overhead. It's warm to the touch, and it hums."); } },
      W.sign([10, 3], 'SUN DECK\fForward: the Bridge (crew and Champions only).\fDeck games daily. Please do not feed the gulls to the moogles.'),
      TR.hawser.trig, TR.kit.trig,
    ],
  }, [liftStop('grand', 'kp_ss_sundeck', 19, 3)]));

  // ================================================================== the Bridge (forward is north here: the windows look over the bow)
  const BRG = [
    "########################",
    "#......................#",
    "#.T........N........T..#",
    "#.......T..h..T........#",
    "#......................#",
    "#......................#",
    "#CC.................qq.#",
    "#......................#",
    "#k....................k#",
    "#......................#",
    "#......................#",
    "###########++###########",
  ];
  FF7.defineMap('kp_ss_bridge', {
    name: 'S.S. Moogle - Bridge', area: 'S.S. Moogle', theme: 'ship', music: 'fiddle', kpBg: 'beach',
    look: { indoor: true, sky: ['#000000', '#000000'], floor: ['#a88a5e', '#a08256'], floorTex: { floor: 'planks' }, wall: '#9a7450', trim: '#c8a040', wallH: 2.3, wallTex: 'panel',
      metal: ['#c8a040', '#a8862e'], ambient: [0.56, 0.54, 0.52], light: [0.92, 0.9, 0.84] },
    grid: BRG,
    legend: { T: 'telegraph', N: 'binnacle', h: 'helm', C: 'chartable' },
    props: [3, 7, 11, 15, 19].map(x => ({ at: [x, 0], prop: 'viewwindow', w: 3.6, h: 1.1, y: 0.95, col: ['#a8d4f8', '#2a6aa8'], col2: '#6a4a2a', bars: 2 }))
      .concat([1, 3].map(y => ({ at: [0, y + 1], prop: 'viewwindow', rot: 90, w: 2.4, h: 1.0, y: 1.0, col: ['#a8d4f8', '#2a6aa8'], col2: '#6a4a2a', bars: 1 })))
      .concat([1, 3].map(y => ({ at: [23, y + 1], prop: 'viewwindow', rot: -90, w: 2.4, h: 1.0, y: 1.0, col: ['#a8d4f8', '#2a6aa8'], col2: '#6a4a2a', bars: 1 })))
      .concat([{ at: [11, 3], prop: 'helm', r: 0.32, col: '#7a4a22', col2: '#5a4030' }, { at: [20, 6], prop: 'cabinet', col: '#6a4a2a' }, { at: [21, 6], prop: 'cabinet', col: '#6a4a2a' },
        { at: [1, 8], prop: 'bookshelf', col: '#5a3a22' }, { at: [22, 8], prop: 'bookshelf', col: '#5a3a22' }]),
    labels: [{ at: [11.5, 11], face: 'n', text: 'S.S. MOOGLE', size: 0.12, col: '#c8a040', y: 1.9 }],
    lights: [[11, 4, '#fff4dc', 4], [3, 6, '#ffe8b0', 2.5]],
    entries: { from_deck: [11, 10, 'up'], docked: [11, 8, 'up'] },
    exits: [{ at: [11, 11, 2, 1], to: 'kp_ss_sundeck', entry: 'from_bridge', sfx: 'door' }],
    links: [
      { to: 'kp_costa', npc: 'ssm_captain', choose: 'Costa del Kupo', if: s => portOf(s) !== 'costa' },
      { to: 'kp_route10', npc: 'ssm_captain', choose: 'Seabreeze Coast', if: s => portOf(s) === 'costa' },
    ],
    npcs: [
      { id: 'ssm_captain', name: CAPT, model: CAPTAIN, at: [11, 6], dir: 'down', talk: captainTalk },
      folk({ id: 'ssm_helmsman', name: 'Helmsman', model: DECKHAND, at: [11, 4], dir: 'up', faceOnTalk: false,
        lines: "Steady as she goes! Er, she isn't going anywhere just now. Steady as she stays!" }),
      folk({ id: 'ssm_navigator', name: 'Navigator', model: OFFICER, at: [3, 7], dir: 'up',
        lines: "Costa del Kupo lies south-east of the Seabreeze Coast. Well, south-east-ish. The chart's got a Kupo Nut stain right where the island should be." }),
      folk({ id: 'ssm_wireless', name: 'Wireless Operator', model: { base: 'man', top: '#f4f2ea', bottom: '#1e2640', hairStyle: 'short', extras: ['glasses'] }, at: [20, 3], dir: 'down',
        lines: "Dit-dit-dah... Message from the Kupo Coliseum: 'Congratulations, Champion.' Message from Prof. Sith: 'Och, give 'em a good crossing!' Message from my mum: 'Wear a scarf.'" }),
      W.moogle('ssm_bridge_mog', 'seamog_captain', [16, 8], { wander: 2, line: "Seamog: Kupo! It salutes the Captain, then you, then the helm, then a coat stand. It salutes everything." }),
    ],
    triggers: [
      { at: [1, 6, 2, 1], on: 'talk', run: function* (s) { yield s.msg("The chart of the Kupo Isles. A pencilled line runs from the Seabreeze Coast to Costa del Kupo, ruled straight across the bay. Someone has drawn a little moogle in the margin, waving."); } },
      { at: [11, 2], on: 'talk', run: function* (s) { yield s.msg('The compass, in its brass binnacle. The needle points dead north, then wobbles politely toward the galley.'); } },
    ],
  });

  // ================================================================== B Deck: the first-class staterooms
  const BDK = [
    "############################################",
    "#################..######..#################",
    "#################^^##EE##^^#################",
    "#####+###########^^##EE##^^###########+#####",
    "#__________________________________________#",
    "#__________________________________________#",
    "#__________________________________________#",
    "#Y________________________________________Y#",
    "#####+################################+#####",
  ];
  const BDKH = BDK.map((r, y) => y === 1 ? H2(17) + '55' + H2(6) + '00' + H2(17) : y === 2 ? H2(17) + '44' + H2(6) + '11' + H2(17) : y === 3 ? H2(17) + '33' + H2(6) + '11' + H2(17) : H2(44));
  FF7.defineMap('kp_ss_bdeck', withLifts({
    name: 'S.S. Moogle - B Deck', area: 'S.S. Moogle', theme: 'mansion', music: 'waltz_chocobo', kpBg: 'town',
    look: LOOK_FIRST,
    grid: BDK, heights: BDKH,
    legend: { Y: 'planter' },
    props: [[1, 7], [42, 7]].map(at => ({ at, prop: 'planter', plant: 'tree', r: 0.32, h: 0.34, col: '#c8a040', treeH: 1.4 }))
      .concat([[10, 3], [30, 3]].map(([x, y]) => ({ at: [x, y], prop: 'banner', rot: 0, col: '#2a3a5a', col2: '#c8a040', w: 1.6, h: 0.7, y: 1.9, text: x < 20 ? 'B1 - B2' : 'B3 - B4', textCol: '#f0e0b0', size: 0.1 }))),
    labels: [
      { at: [5, 3], face: 's', text: 'B1', size: 0.12, col: '#c8a040', y: 2.15 }, { at: [38, 3], face: 's', text: 'B3', size: 0.12, col: '#c8a040', y: 2.15 },
      { at: [17.5, 0], face: 's', text: 'PROMENADE', size: 0.08, col: '#c8a040', y: 2.2 }, { at: [25.5, 0], face: 's', text: 'SALOON', size: 0.08, col: '#c8a040', y: 2.2 },
    ],
    lights: [[8, 5, '#ffe0b0', 4], [21, 5, '#fff0d0', 4.5], [35, 5, '#ffe0b0', 4]],
    entries: { from_promenade: [17, 4, 'down'], from_saloon: [25, 4, 'down'], lift: [22, 3, 'down'], from_b1: [5, 4, 'down'], from_b3: [38, 4, 'down'], from_b2: [5, 7, 'up'], from_b4: [38, 7, 'up'] },
    exits: [
      { at: [17, 1, 2, 1], to: 'kp_ss_promenade', entry: 'from_bdeck' },
      { at: [25, 1, 2, 1], to: 'kp_ss_saloon', entry: 'from_bdeck' },
      { at: [5, 3, 1, 1], to: 'kp_ss_b1', entry: 'from_corridor', sfx: 'door' },
      { at: [38, 3, 1, 1], to: 'kp_ss_b3', entry: 'from_corridor', sfx: 'door' },
      { at: [5, 8, 1, 1], to: 'kp_ss_b2', entry: 'from_corridor', sfx: 'door' },
      { at: [38, 8, 1, 1], to: 'kp_ss_b4', entry: 'from_corridor', sfx: 'door' },
    ],
    npcs: [
      folk({ id: 'ssm_teatrolley', name: 'Stewardess', model: STEWARDESS, at: [12, 5], dir: 'right', wander: 2,
        lines: "Tea? Scones? A Kupo Nut macaroon? The trolley squeaks, I'm afraid. I've named the squeak Gerald." }),
      folk({ id: 'ssm_bcorridor', name: 'Passenger', model: GENT('#5a4a3a'), at: [33, 6], dir: 'left', wander: 2,
        lines: "I've lost my stateroom. They all look the same! Brass, mahogany, a moogle on the pillow. Wait, is that MY moogle?" }),
      folk({ id: 'ssm_bellboy2', name: 'Bellboy', model: LIFTBOY, at: [28, 5], dir: 'down',
        lines: "B1 to B4, first class all. If a door is shut, knock. If a door is open, knock anyway. That's manners." }),
      W.moogle('ssm_b_mog', 'kupera_soprano', [9, 6], { wander: 2, line: "Kupera: La la la! It is practising scales outside cabin B3. Somebody inside is practising them louder." }),
    ],
    triggers: [W.sign([20, 3], 'B DECK - FIRST CLASS\fStaterooms B1 to B4.\fThe Grand Staircase: up to the Promenade, down to the Dining Saloon.')],
  }, [liftStop('grand', 'kp_ss_bdeck', 21, 2)]));

  // ------------------------------------------------------------------ the staterooms (first class: B1-B4)
  const STATE = [
    "################",
    "#a....bb....W.a#",
    "#.....bb.......#",
    "#..............#",
    "#.tc.......ARA.#",
    "#..............#",
    "#T............j#",
    "#..............#",
    "#######+########",
  ];
  const stateroom = (id, n, o) => FF7.defineMap(id, {
    name: `S.S. Moogle - Stateroom B${n}`, area: 'S.S. Moogle', theme: 'mansion', music: 'waltz_chocobo', kpBg: 'town',
    look: Object.assign({}, LOOK_FIRST, { floor: o.carpet || ['#6a2a30', '#62262c'], floorTex: { floor: 'carpet' }, wallH: 2.3 }),
    grid: STATE,
    legend: { a: 'wardrobe', b: 'bigbed', W: 'washstand', A: 'armchair', R: 'roundtable', T: 'steamtrunk' },
    props: [{ at: [6, 1], col: o.quilt || '#a83a48' }, { at: [11, 4], prop: 'armchair', rot: 90, col: o.chair }, { at: [13, 4], prop: 'armchair', rot: -90, col: o.chair },
      { at: [3, 4], prop: 'chair', rot: 180 }, { at: [2, 4], prop: 'table', col: '#5a3a22' }]
      .concat(portholes([3, 10], 0)).concat([{ at: [8, 0], prop: 'banner', col: o.art || '#3a5a7a', col2: '#c8a040', w: 1.2, h: 0.6, y: 1.65, border: true }]),
    lights: [[7, 4, '#ffe0b0', 3.5]],
    entries: { from_corridor: [7, 7, 'up'] },
    exits: [{ at: [7, 8, 1, 1], to: 'kp_ss_bdeck', entry: 'from_b' + n, sfx: 'door' }],
    npcs: o.npcs || [], items: o.items, triggers: (o.triggers || []).concat([
      { at: [12, 1], on: 'talk', run: function* (s) { yield s.msg('A marble washstand. The soap is shaped like a moogle. It is far too nice to use.'); } }]),
  });
  stateroom('kp_ss_b1', 1, { quilt: '#3a6a4a', chair: '#3a4a2a', art: '#5a3a2a',
    npcs: [TR.ashcombe.npc, folk({ id: 'ssm_valet', name: 'Valet', model: STEWARD, at: [13, 6], dir: 'left',
      lines: "Master Ashcombe fences, battles, and collects antique corkscrews. I polish the corkscrews. It's a living." })],
    triggers: [TR.ashcombe.trig] });
  stateroom('kp_ss_b2', 2, { quilt: '#8a5aa8', chair: '#6a4a7a', art: '#7a5a8a',
    npcs: [sitting({ id: 'ssm_oldlady', name: 'Old Lady', model: { base: 'oldwoman', top: '#8a5aa8', bottom: '#8a5aa8', skirt: 'long' }, at: [11, 4], dir: 'right', talk: function* (s) {
      if (!s.flag('kp_ssm_oldlady')) {
        yield s.say('Old Lady', "Oh! A visitor! And not just any visitor: the Champion! My grandson won't believe it.\fHere, dearie. My late husband always kept these for good luck at sea. Your moogles should have them.");
        s.set('kp_ssm_oldlady'); KP.give('royal_nut', 2); s.sfx('found'); yield s.msg(KP.got('royal_nut', 2)); return;
      }
      yield s.say('Old Lady', "My Moppet and I have crossed to Costa every spring for thirty years. She likes the waves. I like the cake."); } }),
      W.moogle('ssm_moppet', 'mopluff_dancer', [9, 6], { wander: 1, line: "Mopluff: Kupo~ It twirls on the rug, very slowly, as if the ship is doing the waltz for it." })] });
  stateroom('kp_ss_b3', 3, { quilt: '#c8a040', chair: '#8a2a5a', art: '#8a2a5a', carpet: ['#4a2a4a', '#442644'],
    npcs: [TR.pemberly.npc, folk({ id: 'ssm_accompanist', name: 'Accompanist', model: GENT('#1a1a1e', 'glasses'), at: [13, 6], dir: 'left',
      lines: "Madame Pemberly practises ten hours a day. I turn the pages. My arms are enormous." })],
    triggers: [TR.pemberly.trig] });
  stateroom('kp_ss_b4', 4, { quilt: '#2a4a8a', chair: '#2a3a5a', art: '#2a4a6a',
    items: [W.item('ssm_b4_trunk', [2, 6], 'leftover_nut')],
    triggers: [W.hidden('ssm_b4_wardrobe', [14, 1], 'lucky_pom'),
      { at: [6, 1, 2, 2], on: 'talk', run: function* (s) { yield s.msg('The bed is made with military corners and a chocolate on the pillow. The suite is booked, but nobody ever came aboard. The chocolate looks lonely.'); } }] });

  // ================================================================== C Deck: the Dining Saloon and the galley
  const SAL = [
    "############################################",
    "###..##EE#.....................#.#EE#.#..#.#",
    "###^^##EE#.....................#.#EE#.#^^#.#",
    "###^^#.........................#......#^^#.#",
    "#..............................#...........#",
    "#.........RR...RR...RR...RR....#.GGGGG.....#",
    "#.........RR...RR...RR...RR....#...........#",
    "#........|...............|.................#",
    "#.p..............................DDDDD...oo#",
    "#.........RR...RR...RR...RR....#.........oo#",
    "#.........RR...RR...RR...RR....#...........#",
    "#........|...............|.....#.jj.....jjj#",
    "#..............................#...........#",
    "#.........RR...RR...RR...RR....#.DDDD.DDDD.#",
    "#.........RR...RR...RR...RR....#...........#",
    "#..............................#...........#",
    "############################################",
  ];
  const SALH = SAL.map((r, y) => y === 1 ? '222' + '55' + H2(34) + '00' + '222' : y === 2 ? '222' + '44' + H2(34) + '11' + '222' : y === 3 ? '222' + '33' + H2(34) + '11' + '222' : H2(44));
  FF7.defineMap('kp_ss_saloon', withLifts({
    name: 'S.S. Moogle - Dining Saloon', area: 'S.S. Moogle', theme: 'mansion', music: 'waltz_chocobo', kpBg: 'town',
    look: Object.assign({}, LOOK_FIRST, { floor: ['#7a2a2a', '#722626'], floorTex: { floor: 'carpet', floor2: 'tiles' }, floor2: ['#c8c4bc', '#c0bcb4'], wallH: 2.6 }),
    grid: SAL, heights: SALH,
    legend: { R: 'diningset', G: 'galleyrange', p: 'piano' },
    props: [{ at: [10, 5], col3: '#a83a48' }, { at: [15, 9], col3: '#3a5a8a' }, { at: [20, 13], col3: '#3a6a4a' },
      { at: [9, 7], prop: 'pillar', col: '#e8dcc0' }, { at: [25, 7], prop: 'pillar', col: '#e8dcc0' }, { at: [9, 11], prop: 'pillar', col: '#e8dcc0' }, { at: [25, 11], prop: 'pillar', col: '#e8dcc0' },
      { at: [17.5, 9], prop: 'ceiling', w: 8, d: 6, h: 2.6, col: '#e8dcc0', lamp: '#fff4d8' },
    ],
    labels: [{ at: [3.5, 0], face: 's', text: 'B DECK', size: 0.08, col: '#c8a040', y: 2.25 }, { at: [16, 0], face: 's', text: 'DINING SALOON', size: 0.14, col: '#c8a040', y: 2.0 },
      { at: [39.5, 0], face: 's', text: 'D DECK', size: 0.08, col: '#c8a040', y: 2.25 }, { at: [37.5, 0], face: 's', text: 'GALLEY', size: 0.11, col: '#5a5a5a', y: 1.9 }],
    lights: [[12, 6, '#ffe8c0', 4.5], [22, 6, '#ffe8c0', 4.5], [12, 12, '#ffe8c0', 4.5], [22, 12, '#ffe8c0', 4.5], [36, 6, '#ff9a50', 3], [3, 9, '#ffe0b0', 3]],
    entries: { from_bdeck: [3, 4, 'down'], from_ddeck: [39, 4, 'down'], lift: [8, 2, 'down'], svclift: [35, 2, 'down'] },
    exits: [
      { at: [3, 1, 2, 1], to: 'kp_ss_bdeck', entry: 'from_saloon' },
      { at: [39, 1, 2, 1], to: 'kp_ss_ddeck', entry: 'from_saloon' },
    ],
    npcs: [
      folk({ id: 'ssm_maitred', name: "Maitre d'", model: WAITER, at: [12, 3], dir: 'down',
        lines: "Welcome to the Dining Saloon! Tonight: cream of Kupo Nut soup, Kupo Nut roast, and for dessert, a surprise. (It's Kupo Nuts.)" }),
      TR.basil.npc,
      sitting({ id: 'ssm_diner1', name: 'Diner', model: GENT('#2a2a3a'), at: [15, 5], dir: 'right', lines: "The soup is excellent. The view is excellent. The fellow at the next table chewing with his mouth open is less excellent." }),
      sitting({ id: 'ssm_diner2', name: 'Diner', model: LADY('#3a7a6a', 'bun'), at: [16, 6], dir: 'up', lines: "We're celebrating! My moogle learned to say 'please.' Well, 'kupolease.' Close enough." }),
      sitting({ id: 'ssm_diner3', name: 'Diner', model: GENT('#5a3a2a', 'mustache'), at: [26, 10], dir: 'left', lines: "Third helping of roast. The Captain says a full stomach keeps you from getting seasick. I've decided to believe him." }),
      folk({ id: 'ssm_violinist', name: 'Violinist', model: GENT('#1a1a1e', 'bowtie'), at: [2, 10], dir: 'right',
        lines: "We take requests! The Waltz of the Chocobo, the Waltz of the Chocobo, or, for the adventurous... the Waltz of the Chocobo." }),
      sitting({ id: 'ssm_saloonpianist', name: 'Pianist', model: LADY('#1a1a1e', 'bun'), at: [2, 9], dir: 'up', talk: function* (s) { s.sfx('piano_chord1'); yield 20; yield s.say('Pianist', "One-two-three, one-two-three... I dream in three-four time."); } }),
      folk({ id: 'ssm_cook', name: 'Cook Pottage', model: COOK, at: [36, 7], dir: 'down', talk: function* (s) {
        if (!s.flag('kp_ssm_cook')) {
          yield s.say('Cook Pottage', "Out of my galley! ...Oh, it's the Champion. Well, that's different. Champions eat in my galley any time.\fHere, fresh from the oven. Roasted 'em myself, with a pinch of sea salt. Moogles go wild for 'em.");
          s.set('kp_ssm_cook'); KP.give('roast_nut', 3); s.sfx('found'); yield s.msg(KP.got('roast_nut', 3)); return;
        }
        yield s.say('Cook Pottage', "Two thousand meals a day, and every one of 'em has a Kupo Nut in it somewhere. That's the S.S. Moogle promise."); } }),
      folk({ id: 'ssm_kitchenhand', name: 'Kitchen Hand', model: { base: 'man', top: '#f4f4f4', bottom: '#5a5a5a', hairStyle: 'buzz', extras: ['apron'] }, at: [40, 12], dir: 'left', wander: 1,
        lines: "I peel potatoes. Six sacks a day. I have peeled so many potatoes I've started naming them. That one's Reginald." }),
      W.moogle('ssm_sal_mog', 'puddipom_chef', [37, 10], { wander: 1, line: "Puddipom: Kupo! It is stirring a pot nearly as big as itself, with total confidence." }),
    ],
    items: [W.item('ssm_galley_pantry', [42, 15], 'sprout_nut', 4)],
    triggers: [
      { at: [34, 5, 5, 1], on: 'talk', run: function* (s) { yield s.msg('The great galley range. Six pots bubble away. One of them is definitely soup. The others are a mystery.'); } },
      W.hidden('ssm_saloon_cushion', [1, 15], 'quick_gear'),
      TR.basil.trig,
    ],
  }, [liftStop('grand', 'kp_ss_saloon', 7, 1), liftStop('service', 'kp_ss_saloon', 34, 1)]));

  // ================================================================== D Deck: second class (aft) and the crew (forward)
  const DDK = [
    "                       #####################",
    "                       #.....#EE##..#.#..#.#",
    "#####+########+#########.....#EE##^^#.#^^#.#",
    "#......................#.........#^^#.#^^#.#",
    "#.......................+..................#",
    "#.......................+..nnnn..nnnn......#",
    "#......................#...tttt..tttt......#",
    "#####+########+#########...nnnn..nnnn......#",
    "                       #...................#",
    "                       #BB.BB.BB.BB.BB.qqqq#",
    "                       #####################",
  ];
  const DDKH = DDK.map((r, y) => y === 1 ? H2(34) + '00' + H2(3) + '55' + H2(3) : y === 2 ? H2(34) + '11' + H2(3) + '44' + H2(3) : y === 3 ? H2(34) + '11' + H2(3) + '33' + H2(3) : H2(44));
  const restTalk = function* (s) {
    const c = yield s.ask('Steward', "Long day of battling, Champion? There's a berth made up in D-5 that nobody's using. Care for a lie-down?", ['Have a rest', 'No, thank you']);
    if (c !== 0) { yield s.say('Steward', 'As you like! The offer stands, all the way to port.'); return; }
    yield s.fadeOut(30); KP.healAll(); s.sfx('heal'); yield 50; yield s.fadeIn(30);
    yield s.say('Steward', 'Rested and ready! And your moogles are shipshape and Bristol fashion. Whatever that means.');
  };
  FF7.defineMap('kp_ss_ddeck', withLifts({
    name: 'S.S. Moogle - D Deck', area: 'S.S. Moogle', theme: 'ship', music: 'difficult', kpBg: 'town',
    look: Object.assign({}, LOOK_CREW, { floor: ['#8a6a4a', '#826244'], floor2: ['#6a6660', '#646058'], floorTex: { floor: 'planks' } }),
    grid: DDK, heights: DDKH,
    legend: { n: 'bench', B: 'bunk' },
    props: [[27, 5], [28, 5], [29, 5], [30, 5], [33, 5], [34, 5], [35, 5], [36, 5]].map(at => ({ at, prop: 'bench', rot: 0 }))
      .concat([[27, 7], [28, 7], [29, 7], [30, 7], [33, 7], [34, 7], [35, 7], [36, 7]].map(at => ({ at, prop: 'bench', rot: 180 })))
      .concat([[24, 9], [27, 9], [30, 9], [33, 9], [36, 9]].map((at, i) => ({ at, col: ['#5a6a8a', '#7a5a5a', '#5a7a5a', '#6a6a7a', '#7a6a4a'][i] })))
      .concat([{ at: [10, 2], prop: 'lifering', rot: 0 }, { at: [28, 0], prop: 'lifering', rot: 0 }]),
    labels: [
      { at: [5, 2], face: 's', text: 'D1', size: 0.11, col: '#e8d8a8', y: 2.05 }, { at: [14, 2], face: 's', text: 'D2', size: 0.11, col: '#e8d8a8', y: 2.05 },
      { at: [23, 4.5], face: 'w', text: 'CREW ONLY', size: 0.08, col: '#c83028', y: 1.9 },
      { at: [34.5, 0], face: 's', text: 'HOLDS', size: 0.08, col: '#e8d8a8', y: 2.15 }, { at: [39.5, 0], face: 's', text: 'GALLEY', size: 0.08, col: '#e8d8a8', y: 2.15 },
      { at: [30, 6], text: 'MESS', size: 0.18, col: '#e8d8a8', y: 0.82 },
    ],
    lights: [[8, 4, '#ffe8c0', 4], [17, 4, '#ffe8c0', 4], [31, 6, '#ffe0b0', 4.5], [33, 9, '#ffe0b0', 3]],
    entries: { from_d1: [5, 3, 'down'], from_d2: [14, 3, 'down'], from_d3: [5, 6, 'up'], from_d4: [14, 6, 'up'], from_saloon: [39, 4, 'down'], from_hold: [34, 4, 'down'], svclift: [31, 2, 'down'] },
    exits: [
      { at: [5, 2, 1, 1], to: 'kp_ss_d1', entry: 'from_corridor', sfx: 'door' }, { at: [14, 2, 1, 1], to: 'kp_ss_d2', entry: 'from_corridor', sfx: 'door' },
      { at: [5, 7, 1, 1], to: 'kp_ss_d3', entry: 'from_corridor', sfx: 'door' }, { at: [14, 7, 1, 1], to: 'kp_ss_d4', entry: 'from_corridor', sfx: 'door' },
      { at: [39, 1, 2, 1], to: 'kp_ss_saloon', entry: 'from_ddeck' },
      { at: [34, 1, 2, 1], to: 'kp_ss_hold', entry: 'from_ddeck' },
    ],
    npcs: [
      folk({ id: 'ssm_d_steward', name: 'Steward', model: STEWARD, at: [10, 3], dir: 'down', talk: restTalk }),
      folk({ id: 'ssm_d_family', name: 'Passenger', model: { base: 'man', top: '#6a7a5a', bottom: '#4a4a3a', hairStyle: 'short' }, at: [19, 5], dir: 'left', wander: 2,
        lines: "Second class has the same sea as first class. And the same moogles. And we get to eat in the Saloon at the late sitting, which is when the cook's in a good mood." }),
      folk({ id: 'ssm_d_noticeboard', name: 'Passenger', model: LADY('#7a6a4a', 'ponytail'), at: [2, 4], dir: 'up',
        lines: "The notice board says there's a talent show on Friday. I'm going to recite every Kupo League Champion in order. All forty of them. And you, now. Forty-one." }),
      TR.grogan.npc,
      sitting({ id: 'ssm_d_cardplayer', name: 'Sailor', model: SAILOR, at: [27, 5], dir: 'down', lines: "Got any threes? ...Go fish. That's the only card game the crew agree on. Everything else ends in a fight." }),
      sitting({ id: 'ssm_d_cardplayer2', name: 'Sailor', model: DECKHAND, at: [28, 7], dir: 'up', lines: "He cheats. I know he cheats. He knows I know. We play anyway. It's a long voyage." }),
      folk({ id: 'ssm_d_sleeper', name: 'Sleeping Sailor', model: SAILOR, at: [27, 9], dir: 'down', anim: 'lie', hover: 0.5, faceOnTalk: false,
        lines: "Zzz... four bells... zzz... not my watch... zzz... five more minutes, Bosun..." }),
      W.moogle('ssm_d_mog', 'seamog_sailor', [40, 8], { wander: 2, line: "Seamog: Kupo-ho! It is wearing a sailor's cap three sizes too big. It refuses to take it off." }),
    ],
    items: [W.item('ssm_ddeck_locker', [42, 8], 'hi_oil', 3)],
    triggers: [
      W.sign([1, 2], 'NOTICES\fFriday: talent show, D Deck mess.\fLost: one left boot. Found: one right boot. Please see the Bosun.'),
      { at: [39, 9, 4, 1], on: 'talk', run: function* (s) { yield s.msg("Crew lockers. One has a little picture of a moogle taped inside the door, and a note: 'Back soon, Mum.'"); } },
      TR.grogan.trig,
    ],
  }, [liftStop('service', 'kp_ss_ddeck', 30, 1)]));

  // ------------------------------------------------------------------ the second-class cabins (D1-D4)
  const CABIN = [
    "############",
    "#BB..W...BB#",
    "#..........#",
    "#..........#",
    "#a.......t.#",
    "#........c.#",
    "#..........#",
    "#####+######",
  ];
  const cabin = (id, n, o) => FF7.defineMap(id, {
    name: `S.S. Moogle - Cabin D${n}`, area: 'S.S. Moogle', theme: 'ship', music: 'difficult', kpBg: 'town',
    look: Object.assign({}, LOOK_CREW, { floor: ['#8a6a4a', '#826244'], floorTex: { floor: 'planks' }, wall: '#c8bca4', wallH: 2.2 }),
    grid: CABIN,
    legend: { B: 'bunk', a: 'wardrobe', W: 'washstand' },
    props: [{ at: [1, 1], col: o.blanket || '#5a6a8a' }, { at: [9, 1], col: o.blanket2 || '#7a5a5a' }, { at: [9, 5], prop: 'chair', rot: 180 }].concat(portholes([3, 7], 0)),
    lights: [[5, 3, '#ffe8c0', 3]],
    entries: { from_corridor: [5, 6, 'up'] },
    exits: [{ at: [5, 7, 1, 1], to: 'kp_ss_ddeck', entry: 'from_d' + n, sfx: 'door' }],
    npcs: o.npcs || [], items: o.items, triggers: o.triggers || [],
  });
  cabin('kp_ss_d1', 1, { npcs: [TR.twins.npc], triggers: [TR.twins.trig] });
  cabin('kp_ss_d2', 2, { blanket: '#6a7a4a',
    npcs: [folk({ id: 'ssm_seasick', name: 'Seasick Passenger', model: { base: 'girl', top: '#6a9a6a', bottom: '#4a4a3a', hairStyle: 'ponytail' }, at: [6, 3], dir: 'down', anim: 'kneel', faceOnTalk: false,
      lines: s => s.flag('kp_ss_seasick') ? "Still... moving... why does the floor keep... moving..." : "Ugh... we haven't even left the dock and the floor's already wobbling... Is it wobbling? It's wobbling. Never again. NEVER again." })],
    triggers: [W.hidden('ssm_d2_bunk', [9, 1], 'tough_nut', 2)] });
  cabin('kp_ss_d3', 3, { blanket: '#a85a6a', blanket2: '#a85a6a',
    npcs: [folk({ id: 'ssm_honeymoon1', name: 'Newlywed', model: GENT('#4a5a7a'), at: [3, 3], dir: 'right', lines: "We're on our honeymoon! Two weeks on Costa del Kupo. She wants to watch the tournaments. I want to watch her watch the tournaments." }),
      folk({ id: 'ssm_honeymoon2', name: 'Newlywed', model: LADY('#e8d8e0', 'long'), at: [4, 3], dir: 'left', lines: "He proposed at the Gold League final. In the stands. During a Holy. I said yes before the dust settled." })] });
  cabin('kp_ss_d4', 4, { blanket: '#5a5a7a',
    npcs: [folk({ id: 'ssm_traveller', name: 'Traveller', model: { base: 'oldman', top: '#7a6a5a', bottom: '#4a3a2a', hairStyle: 'short', extras: ['beard'] }, at: [9, 3], dir: 'left',
      lines: "I've crossed this bay on rafts, rowboats and once, regrettably, a large barrel. The S.S. Moogle is by far the best. The barrel had no Dining Saloon." })],
    items: [W.item('ssm_d4_table', [2, 6], 'max_oil')] });

  // ================================================================== E Deck: the cargo holds
  const HLD = [
    "############################################",
    "#BB.oo...BBB.......BB..o..BB.#EE##..#......#",
    "#B......................B....#EE##^^#......#",
    "#................................#^^#......#",
    "#..ZZZZ.......BB...........BBB.........oo..#",
    "#..ZZZZ.......BB.....eeee...BB..........o..#",
    "#..ZZZZ.............eeee...................#",
    "#...................eeee.......BB..........#",
    "+.....|...........|..............|......BB.#",
    "+..........................................#",
    "#BB.........========.......BBB.............#",
    "#BB.........=......=........B..............#",
    "#...........=......=.......................#",
    "#...........=......=.......oo......BB......#",
    "#...........===..===.......................#",
    "#.....BBB...................BB.......BBB...#",
    "#BB.....................................BBB#",
    "############################################",
  ];
  const HLDH = HLD.map((r, y) => y === 1 ? H2(34) + '55' + H2(8) : y === 2 ? H2(34) + '44' + H2(8) : y === 3 ? H2(34) + '33' + H2(8) : H2(44));
  FF7.defineMap('kp_ss_hold', withLifts({
    name: 'S.S. Moogle - Cargo Holds', area: 'S.S. Moogle', theme: 'ship', music: 'difficult', kpBg: 'lab',
    look: Object.assign({}, LOOK_CREW, { glow: '#f4e8c0', wallH: 3.0, floor: ['#5a5650', '#54504a'], ambient: [0.36, 0.38, 0.42], light: [0.62, 0.62, 0.64] }),
    grid: HLD, heights: HLDH,
    legend: { Z: 'block' },
    props: [{ at: [4.5, 5], vehicle: 'wagon', rot: 90 },
      { at: [21.5, 6], prop: 'ceiling', w: 4, d: 3, h: 3.0, col: '#6a6e72', beams: '#3a3e42' },
    ],
    labels: [{ at: [34.5, 0], face: 's', text: 'D DECK', size: 0.09, col: '#e8d8a8', y: 2.6 }, { at: [2.6, 8.5], text: 'ENGINE ROOM', size: 0.12, col: '#e8c040', y: 0.02 },   // (painted on the deck by the door: on the wall it was off the screen)
      { at: [15.5, 12], text: 'GOLD SAUCER', size: 0.14, col: '#e8c040', y: 0.02 }, { at: [8, 9], text: 'THIS WAY UP', size: 0.1, col: '#c8b890', y: 0.02 }],
    lights: [[21, 6, '#fff4d0', 5], [10, 12, '#ffe0a0', 3.5], [33, 12, '#ffe0a0', 3.5], [5, 8, '#ffe0a0', 3]],
    entries: { from_ddeck: [34, 4, 'down'], from_engine: [1, 8, 'right'], svclift: [31, 2, 'down'] },
    exits: [
      { at: [34, 1, 2, 1], to: 'kp_ss_ddeck', entry: 'from_hold' },
      { at: [0, 8, 1, 2], to: 'kp_ss_engine', entry: 'from_hold', sfx: 'door_shinra' },
    ],
    npcs: [
      TR.sacks.npc, TR.shade.npc,
      folk({ id: 'ssm_quartermaster', name: 'Quartermaster', model: OFFICER, at: [10, 9], dir: 'down',
        lines: "Four hundred crates, two chocobo wagons, sixty sacks of Mognet mail and one grand piano for the Costa Opera. And a stowaway, I suspect. My count's off by one sandwich." }),
      { id: 'ssm_choco1', name: 'Chocobo', model: 'chocobo', at: [14, 12], dir: 'right', wander: 1, talk: function* (s) { s.sfx('chocobo'); yield s.msg('Kweh! The racing chocobo eyes your pockets for greens.'); } },
      { id: 'ssm_choco2', name: 'Chocobo', model: 'chocobo_black', at: [17, 11], dir: 'left', wander: 1, talk: function* (s) { s.sfx('chocobo2'); yield s.msg('Kweeeh! The black chocobo fluffs up, then settles down for a nap.'); } },
      W.moogle('ssm_hold_mog', 'mogpost_ranger', [36, 7], { wander: 2, line: 'Mogpost: Kupo! Kupo! It is sorting the mail sacks by smell. It insists this works.' }),
    ],
    items: [W.item('ssm_hold_crate', [42, 4], 'max_oil', 2), W.item('ssm_hold_corner', [1, 15], 'royal_nut')],
    triggers: [
      W.hidden('ssm_hold_wagon', [5, 7], 'boost_beast'),
      { at: [20, 5, 4, 3], on: 'talk', run: function* (s) { yield s.msg('Daylight pours down through the open cargo hatch, far above. A gull peers in, decides there is nothing to steal, and leaves.'); } },
      { at: [3, 4, 4, 3], on: 'talk', run: function* (s) { yield s.msg('A chocobo wagon, roped down for the crossing. A tag on the wheel reads: "GOLD SAUCER - HANDLE WITH CARE - BIRDS ARE TICKLISH."'); } },
      TR.sacks.trig, TR.shade.trig,
    ],
  }, [liftStop('service', 'kp_ss_hold', 30, 1)]));

  // ================================================================== F Deck: the Engine Room
  const ENG = [
    "########################################",
    "#H..^^zzzzzzzzzzzzzzzzzzzzzzzzz..#EE#..#",
    "#................................#EE#..#",
    "#.....XXXXXXXXXXXXXXXXXXXXX............#",
    "#.....XXXXXXXXXXXXXXXXXXXXX............#",
    "#.....XXXXXXXXXXXXXXXXXXXXX............#",
    "#.....XXXXXXXXXXXXXXXXXXXXX............#",
    "#......................................#",
    "+......................................+",
    "+......................................+",
    "#...............TCCCC..................#",
    "#.....XXXXXXXXXXXXXXXXXXXXX............#",
    "#.....XXXXXXXXXXXXXXXXXXXXX............#",
    "#.....XXXXXXXXXXXXXXXXXXXXX............#",
    "#.....XXXXXXXXXXXXXXXXXXXXX............#",
    "#......................................#",
    "#MM.PP..MM..PP..MM.........MM..PP..MM..#",
    "########################################",
  ];
  const ENGH = ENG.map((r, y) => y === 1 ? '2222' + '34' + '5'.repeat(25) + H2(9) : H2(40));
  FF7.defineMap('kp_ss_engine', withLifts({
    name: 'S.S. Moogle - Engine Room', area: 'S.S. Moogle', theme: 'ship', music: 'difficult', kpBg: 'lab',
    look: LOOK_ENGINE,
    grid: ENG, heights: ENGH,
    legend: { X: 'pistons', T: 'telegraph', C: 'console' },
    props: [{ at: [6, 3], n: 4, col: '#4a5a52' }, { at: [6, 11], n: 4, col: '#52524a' },
      ...[17, 18, 19, 20].map(x => ({ at: [x, 10], prop: 'console', style: 'tall', col: '#5a6066', col2: '#e8d090' })),
      ...[8, 16, 24].map(x => ({ at: [x, 0], prop: 'screen', style: 'gauges', w: 1.4, h: 0.6, y: 1.5, col: '#f0e0a0', col2: '#3a3e44' })),
      { at: [1, 16], prop: 'valve', col: '#c83028' }, { at: [38, 16], prop: 'valve', col: '#c83028' },
    ],
    labels: [{ at: [34.5, 0], face: 's', text: 'SERVICE LIFT', size: 0.08, col: '#e8d8a8', y: 2.5 }, { at: [1.6, 0], face: 's', text: 'SHAFT TUNNEL', size: 0.07, col: '#e8c040', y: 2.4 },
      { at: [18.5, 9], text: 'STARTING PLATFORM', size: 0.12, col: '#e8c040', y: 0.02 }],
    lights: [[10, 8, '#ffd8a0', 4.5], [26, 8, '#ffd8a0', 4.5], [18, 10, '#f0e8a0', 3], [16, 1, '#ffd8a0', 3.5], [36, 12, '#ffd8a0', 3]],
    entries: { from_hold: [38, 8, 'left'], from_boiler: [1, 8, 'right'], from_bilge: [1, 2, 'down'], svclift: [35, 2, 'down'] },
    exits: [
      { at: [39, 8, 1, 2], to: 'kp_ss_hold', entry: 'from_engine', sfx: 'door_shinra' },
      { at: [0, 8, 1, 2], to: 'kp_ss_boiler', entry: 'from_engine', sfx: 'door_shinra' },
      { at: [1, 1, 1, 1], to: 'kp_ss_bilge', entry: 'from_engine' },
    ],
    npcs: [
      TR.rivets.npc,
      folk({ id: 'ssm_chief', name: 'Chief Engineer Brass', model: { base: 'oldman', top: '#f4f2ea', bottom: '#3a4a5a', hairStyle: 'cap', hair: '#3a4a5a', extras: ['mustache', 'goggles'] }, at: [18, 9], dir: 'up',
        lines: s => `Four triple-expansion engines, twenty-four boilers, two propellers and one very proud Chief! ${portOf(s) === 'costa' ? "Ring down from the Bridge when you want the mainland" : "Ring down from the Bridge when you want Costa"}, and we'll have her steaming in no time.` }),
      folk({ id: 'ssm_oiler', name: 'Oiler', model: ENGINEER, at: [10, 7], dir: 'down', wander: 2,
        lines: "A drop of oil here, a drop of oil there. I go through a barrel a day. The engines drink more than the passengers." }),
      folk({ id: 'ssm_greaser', name: 'Greaser', model: { base: 'man', top: '#4a4a4a', bottom: '#3a3a3a', hairStyle: 'buzz', extras: ['suspenders'] }, at: [31, 15], dir: 'left',
        lines: "The shaft tunnel's down the ladder in the far corner. Old Keel lives down there. Nobody knows how long he's been aboard. Longer than the rivets, some say." }),
      W.moogle('ssm_engine_mog', 'gearmog_tinker', [33, 6], { wander: 2, line: 'Gearmog: Kupo-clank! It is listening to the engines with a stethoscope, nodding wisely.' }),
    ],
    items: [W.item('ssm_catwalk_end', [30, 1], 'battery', 2), W.item('ssm_engine_corner', [37, 15], 'oil_nut')],
    triggers: [
      { at: [16, 10], on: 'talk', run: function* (s) { yield s.msg('The engine-room telegraph, repeating orders from the Bridge. Its needle rests on STOP. A brass plate reads: "THINK BEFORE YOU RING."'); } },
      { at: [6, 3, 21, 4], on: 'talk', run: function* (s) { yield s.msg('The great engine stands silent and gleaming, every rod polished. When she steams, the whole ship hums with it.'); } },
      TR.rivets.trig,
    ],
  }, [liftStop('service', 'kp_ss_engine', 34, 1)]));

  // ================================================================== the Boiler Room
  const BLR = [
    "####################################",
    "#..OOOO..OOOO..OOOO..OOOO..OOOO....#",
    "#..OOOO..OOOO..OOOO..OOOO..OOOO....#",
    "#..OOOO..OOOO..OOOO..OOOO..OOOO....#",
    "#%.................................#",
    "#%.................................#",
    "#%.................................#",
    "#%.................................+",
    "#%.................................+",
    "#%.................................#",
    "#%.................................#",
    "#..OOOO..OOOO..OOOO..OOOO..OOOO....#",
    "#..OOOO..OOOO..OOOO..OOOO..OOOO....#",
    "#..OOOO..OOOO..OOOO..OOOO..OOOO....#",
    "#..................................#",
    "####################################",
  ];
  FF7.defineMap('kp_ss_boiler', {
    name: 'S.S. Moogle - Boiler Room', area: 'S.S. Moogle', theme: 'ship', music: 'difficult', kpBg: 'lab',
    look: Object.assign({}, LOOK_ENGINE, { ambient: [0.36, 0.3, 0.28], light: [0.8, 0.56, 0.4], wall: '#4e4a48', floor: ['#3e3c3a', '#383634'], floorTex: { floor: 'metal' } }),
    grid: BLR,
    legend: { O: 'boiler', '%': 'coal' },
    props: [3, 9, 15, 21, 27].map(x => ({ at: [x, 11], rot: 180 })),
    labels: [{ at: [33.4, 7.5], text: 'ENGINE ROOM', size: 0.12, col: '#e8c040', y: 0.02 }],   // (on the deck by the door, as in the hold)
    lights: [[5, 4, '#ff8a40', 3.5], [11, 4, '#ff8a40', 3.5], [17, 4, '#ff8a40', 3.5], [23, 4, '#ff8a40', 3.5], [29, 4, '#ff8a40', 3.5], [18, 9, '#ffb070', 4]],
    entries: { from_engine: [34, 7, 'left'] },
    exits: [{ at: [35, 7, 1, 2], to: 'kp_ss_engine', entry: 'from_boiler', sfx: 'door_shinra' }],
    npcs: [
      TR.cinders.npc,
      folk({ id: 'ssm_stoker1', name: 'Stoker', model: STOKER, at: [5, 4], dir: 'up', anim: 'slash', faceOnTalk: false,
        lines: "HUP! ...HUP! ...Can't talk... HUP!... firing... HUP!" }),
      folk({ id: 'ssm_stoker2', name: 'Stoker', model: Object.assign({}, STOKER, { skin: '#a87a5a' }), at: [23, 4], dir: 'up',
        lines: "Hot work, this. Hot enough to toast a Kupo Nut on a shovel. Which, between you and me, is exactly what we do at tea time." }),
      folk({ id: 'ssm_trimmer', name: 'Coal Trimmer', model: STOKER, at: [2, 9], dir: 'left',
        lines: "I keep the bunkers level so she sails straight. Lopsided coal makes a lopsided ship. That's science." }),
      folk({ id: 'ssm_leadingstoker', name: 'Leading Stoker', model: Object.assign({}, STOKER, { extras: ['suspenders', 'mustache'] }), at: [30, 9], dir: 'left',
        lines: s => s.flag('kp_ssm_captain') ? "The Captain's been to see you, has he? Grand old salt. Started down here with a shovel, same as me." : "When the Bridge rings for steam, we rake the fires and she roars. Prettiest sound on the sea." }),
      W.moogle('ssm_boiler_mog', 'sootkin_stoker', [16, 8], { wander: 2, line: 'Sootkin: Kupo... cough. It is covered head to pom-pom in soot, and looks extremely happy about it.' }),
    ],
    items: [W.item('ssm_boiler_back', [33, 14], 'fancy_nut', 2)],
    triggers: [W.hidden('ssm_boiler_coal', [1, 10], 'hefty_nut', 2),
      { at: [3, 3, 4, 1], on: 'talk', run: function* (s) { yield s.msg('Furnace doors, glowing orange behind their peepholes. The heat on your face is tremendous.'); } },
      TR.cinders.trig],
  });

  // ================================================================== the shaft tunnel in the bilge, by the keel
  const BLG = [
    "########################################",
    "#|...|...|...|...|...|...|...|...|...H.#",
    "#......................................#",
    "#..SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS...#",
    "#......................................#",
    "#......................................#",
    "#...M....~~~....oo.......~~~~.....MM...#",
    "#|...|...|...|...|...|...|...|...|.....#",
    "########################################",
  ];
  FF7.defineMap('kp_ss_bilge', {
    name: 'S.S. Moogle - Shaft Tunnel', area: 'S.S. Moogle', theme: 'ship', music: 'difficult', kpBg: 'cave',
    look: Object.assign({}, LOOK_ENGINE, { wallH: 2.2, wall: '#4a4e4a', floor: ['#3e403c', '#383a36'], water: '#2a4a3a', ambient: [0.3, 0.32, 0.32], light: [0.56, 0.56, 0.52], floorTex: { floor: 'metal' }, pillar: '#5a5e5a' }),
    grid: BLG,
    legend: { S: 'shaft' },
    props: [{ at: [2, 3], prop: 'machine', col: '#5a5e5a' }],
    labels: [{ at: [19, 4], text: 'KEEL - KEEP CLEAR OF THE SHAFT', size: 0.1, col: '#e8c040', y: 0.02 }],
    lights: [[8, 4, '#e0d8b0', 3.5], [20, 4, '#e0d8b0', 3.5], [32, 4, '#e0d8b0', 3.5]],
    entries: { from_engine: [37, 2, 'down'] },
    exits: [{ at: [37, 1, 1, 1], to: 'kp_ss_engine', entry: 'from_bilge' }],
    npcs: [
      folk({ id: 'ssm_oldkeel', name: 'Old Keel', model: { base: 'oldman', top: '#5a5a4a', bottom: '#3a3a2a', hairStyle: 'bald', extras: ['beard'] }, at: [12, 5], dir: 'down', talk: function* (s) {
        if (!s.flag('kp_ssm_oldkeel')) {
          yield s.say('Old Keel', "Eh? Visitors? Down here? Haven't had one of those since... well. Since never.\fThis here's the keel, young'un. The backbone of her. Every plank and rivet up top hangs off this. You listen close, you can hear her think.\fTake this. Found it in the bilge years back. Shiny things wash down here. Shiny things and socks.");
          s.set('kp_ssm_oldkeel'); KP.give('golden_nut', 3); s.sfx('found'); yield s.msg(KP.got('golden_nut', 3)); return;
        }
        yield s.say('Old Keel', "She's a good ship. Better than good. She'll see you safe across, every time. The keel says so."); } }),
      W.moogle('ssm_bilge_mog', 'dustbun_sweeper', [24, 4], { wander: 3, line: "Dustbun: Kupo! It is sweeping the bilge, one puddle at a time. It has been at it for weeks. It is winning." }),
    ],
    items: [W.item('ssm_bilge_stern', [1, 5], 'royal_nut')],
    triggers: [W.hidden('ssm_bilge_puddle', [26, 6], 'wild_nut', 2),
      { at: [3, 3, 33, 1], on: 'talk', run: function* (s) { yield s.msg('The propeller shaft, thick as a tree trunk, running aft to the stern. Its bearings are cool and freshly greased.'); } }],
  });

  // ================================================================== at sea (the voyage between the ports: a short scene)
  const SEA_W = 80, SEA_H = 56;
  const SEA = Array.from({ length: SEA_H }, (_, y) => y === SEA_H - 1 ? '..' + '~'.repeat(SEA_W - 2) : '~'.repeat(SEA_W));
  FF7.defineMap('kp_ss_atsea', {
    name: 'S.S. Moogle - At Sea', area: 'S.S. Moogle', theme: 'beach', music: 'highwind', kpBg: 'beach', hidePlayer: true,
    look: { water: '#2a7ab8', sky: ['#4a92da', '#e4f2ff'], clouds: { col: '#ffffff', alpha: 0.6, n: 10, speed: 0.35 }, fog: { color: [0.66, 0.8, 0.93], near: 11, far: 23 }, ambient: [0.58, 0.58, 0.6], light: [0.96, 0.92, 0.86] },
    camera: { fixed: [17.75, 5.5, 34, 17.75, 1.8, 14.25] },   // (the liner's tick trucks it along with her)
    grid: SEA,
    props: [
      // the mainland's cliffs to the west, the island's palms to the east (far off)
      ...[[6, 18, 2.6], [9, 15, 3.2], [3, 22, 2.2], [12, 13, 1.8], [2, 16, 2.8]].map(([x, y, h]) => ({ at: [x, y], prop: 'spire', h, r: 1.6, col: '#8a7a64' })),
      ...[[70, 16], [73, 18], [75, 14], [68, 19]].map(([x, y]) => ({ at: [x, y], prop: 'canopy', r: 1.1, h: 2.4, col: '#3e8a3a', col2: '#8a6a44' })),
      ...[[72, 17], [74, 15], [69, 18]].map(([x, y]) => ({ at: [x, y], prop: 'rock', col: '#d8c088', scale: 2.2 })),
    ],
    entries: { eastbound: [0, SEA_H - 1, 'up'], westbound: [0, SEA_H - 1, 'up'] },
    exits: [{ at: [1, SEA_H - 1, 1, 1], to: 'kp_ss_bridge', entry: 'docked' }],
    objects: [{ id: 'ssm_liner', at: [32, 28], dir: 'right', model: { vehicle: 'ocean_liner' }, y0: -0.67, solid: false,
      tick(o, fs) {
        if (o.v) o.at = [o.at[0] + o.v, o.at[1]];
        if (o._model && o._model.play) o._model.play('move');
        // a tracking shot: the camera trucks along at six tenths of her speed, so she glides across the frame
        if (fs && fs.cam && fs.cam.fixed && fs.map && fs.map.id === 'kp_ss_atsea') { const sx = (o.at[0] + 0.5) * F.TILE, cx = 20 + (sx - 20) * 0.6; fs.cam.fixed = [cx, 5.5, 34, cx, 1.8, 14.25]; }
      } }],
    onLoad: function (s) {
      const o = s.field && s.field.objects && s.field.objects.find(q => q.id === 'ssm_liner'); if (!o) return;
      const west = s.entry() === 'westbound';
      o.dir = west ? 'left' : 'right'; o.at = [west ? 47 : 32, 28]; o.v = west ? -0.045 : 0.045;
    },
  });
})();
