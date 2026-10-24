// Dedicated low-poly battle models for the Disc 1 part B enemies (js/data/enemies_d1b.js): Costa del
// Sol / Corel area, Mt. Corel, Corel Prison & desert, Gongaga, Cosmo Canyon & Cave of the Gi, Nibelheim
// (Shinra Mansion, Mt. Nibel), Rocket Town, Wutai (Da-chao, Pagoda), Temple of the Ancients, Bone
// Village / Corral Valley / Forgotten Capital.
// Modelled after the PS1 battle models in references/Final Fantasy 7 (1997)/Bestiary.png (and the
// Character Reference sheet for Dyne / Reno / Rude / Palmer). Units are metres (Cloud = 1.7 tall);
// every model faces +z with its feet at y = 0 and uses the generic enemy bone names so the stock clips
// (e_idle e_attack e_cast e_hurt) animate it.
(function () {
  if (!FF7.creatures) return;
  const U = FF7.util, V = FF7.V3, MB = FF7.MeshBuilder, sh = U.shade, mix = U.mix;
  const PI = Math.PI, S = Math.sin, C = Math.cos;
  const MODELS = FF7.creatures.MODELS = FF7.creatures.MODELS || {};
  // every dedicated model is registered through def(): non-floating rigs are dropped/raised so their
  // lowest point in the rest pose touches the ground (y = 0)
  const def = (id, fn) => { MODELS[id] = (look) => { const m = fn(look); if (!m.enemyHuman && !m.floats) ground(m); return m; }; };
  function ground(m) {
    m.resetPose(); m.computeWorld();
    let lo = Infinity;
    for (const b of m.order) for (const a of b.meshes) {
      const W = b.world, p = a.mesh.pos;
      for (let i = 0; i < p.length; i += 3) lo = Math.min(lo, W[1] * p[i] + W[5] * p[i + 1] + W[9] * p[i + 2] + W[13]);
    }
    if (isFinite(lo) && Math.abs(lo) > 0.01) m.bones.root.offset[1] -= lo / (m.scale || 1);
  }
  const meshOf = (fn, o) => { const mb = new MB(); fn(mb); return mb.build(o); };
  const rig = (look) => FF7.creatures.base(new FF7.Model(), look || {});
  const att = (m, bone, fn, opts) => m.attach(bone, meshOf(fn), null, opts || null);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mx = (p) => [-p[0], p[1], p[2]];           // mirror a point across x = 0

  // ------------------------------------------------------------------ mesh helpers
  // push a transform whose local +y runs from point a along direction d
  function along(mb, a, d) {
    const n = V.norm(d);
    mb.push(); mb.translate(a[0], a[1], a[2]);
    mb.rotate(0, Math.atan2(n[0], n[2]), 0); mb.rotate(Math.acos(clamp(n[1], -1, 1)), 0, 0);
  }
  // tapered tube from a to b (radii r0 -> r1); f flattens the cross-section (z radius factor)
  function tube(mb, a, b, r0, r1, col, sides, f, sq) {
    const d = V.sub(b, a), L = V.len(d);
    if (L < 1e-6) return;
    along(mb, a, d);
    mb.loft([{ y: 0, rx: r0, rz: r0 * (f || 1) }, { y: L, rx: r1, rz: r1 * (f || 1) }], { sides: sides || 6, color: col, sq });
    mb.pop();
  }
  // polyline limb through pts with radii rs; col may be an array (one colour per segment)
  function limb(mb, pts, rs, col, sides, joints) {
    for (let i = 0; i < pts.length - 1; i++) {
      const c = Array.isArray(col) ? col[Math.min(i, col.length - 1)] : col;
      tube(mb, pts[i], pts[i + 1], rs[i], rs[i + 1], c, sides);
      if (joints !== false && i > 0) mb.sphere(pts[i][0], pts[i][1], pts[i][2], rs[i] * 1.08, rs[i] * 1.08, rs[i] * 1.08, c, 6, 4, true);
    }
  }
  const ball = (mb, p, r, col, seg, rings) => mb.sphere(p[0], p[1], p[2], r, r, r, col, seg || 6, rings || 4, true);
  const ell = (mb, x, y, z, rx, ry, rz, col, seg, rings, fn) => mb.sphere(x, y, z, rx, ry, rz, col, seg || 8, rings || 6, true, fn);
  // flat disc lying on a surface (centre p, facing direction n)
  function disc(mb, p, n, rx, rz, col, seg) { along(mb, p, n); mb.sphere(0, 0, 0, rx, Math.min(rx, rz) * 0.18, rz, col, seg || 8, 4, false); mb.pop(); }
  // double-sided triangles / fans / strips
  function tri2(mb, a, b, c, c1, c2) { mb.tri(a, b, c, c1); mb.tri(a, c, b, c2 || c1); }
  function poly2(mb, pts, c1, c2) { for (let i = 1; i < pts.length - 1; i++) tri2(mb, pts[0], pts[i], pts[i + 1], c1, c2); }
  function fan2(mb, root, pts, c1, c2) { for (let i = 0; i < pts.length - 1; i++) tri2(mb, root, pts[i], pts[i + 1], c1, c2); }
  function strip2(mb, A, B, c1, c2) { for (let i = 0; i < A.length - 1; i++) { tri2(mb, A[i], A[i + 1], B[i + 1], c1, c2); tri2(mb, A[i], B[i + 1], B[i], c1, c2); } }
  const spike = (mb, p, d, len, r, col, n) => mb.spike(p, d, len, r, n || 4, col);
  const LR = (fn) => { fn(1); fn(-1); };
  // row of teeth from a to b, pointing along dir
  function teeth(mb, a, b, n, len, dir, col, r) { for (let i = 0; i < n; i++) spike(mb, lerp3(a, b, (i + 0.5) / n), dir, len, r || len * 0.35, col || '#f0ece0', 3); }
  // ring of teeth around an elliptical mouth in the xy plane at depth z, pointing inward
  function mouthRing(mb, cx, cy, cz, rx, ry, n, len, col, r) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2, p = [cx + C(a) * rx, cy + S(a) * ry, cz];
      spike(mb, p, [-C(a), -S(a), 0.25], len, r || len * 0.3, col || '#f0ece0', 3);
    }
  }
  // simple eye: white/coloured ball with a dark pupil, looking along +z
  function eye(mb, x, y, z, r, col, pupil) {
    mb.sphere(x, y, z, r, r, r * 0.8, col || '#f0f0e0', 6, 4, true);
    if (pupil !== false) mb.sphere(x, y, z + r * 0.62, r * 0.45, r * 0.5, r * 0.3, pupil || '#101010', 6, 3, true);
  }
  // feather / blade fan: blades from points along an arm, growing along dirs
  function blades(mb, list, col, tip) { list.forEach(([p, d, len, w, t]) => mb.blade(p, d, len, w, t || w * 0.2, col, null, tip)); }
  // humanoid (character-builder) enemy
  function human(spec, scale) {
    const m = FF7.chars3d.build(spec, { style: 'battle' });
    m.showWeapon(true); m.enemyHuman = true; m.play('battle'); m.scale = scale || 1.7;
    return m;
  }

  // ================================================================== Corel area (Costa del Sol)
  // Grangalan family: striped egg with two empty eye holes
  function grangalan(look, H, tone) {
    const m = rig(look);
    const R = H * 0.4;
    m.bone('body', 'root', [0, 0, 0]);
    const O = mix('#d8801c', '#f0b040', tone), Y = mix('#f0b828', '#f8d860', tone), D = sh(O, -0.3);
    const ts = [0, 0.03, 0.08, 0.15, 0.23, 0.3, 0.37, 0.44, 0.5, 0.58, 0.68, 0.78, 0.87, 0.94, 0.985, 1];
    const cols = [D, D, O, Y, D, Y, O, Y, D, O, sh(O, 0.12), O, sh(O, 0.08), O, O];
    const rOf = (t) => R * Math.pow(Math.max(0, S(PI * Math.pow(t, 0.85))), 0.6) * (0.92 + 0.08 * t);
    att(m, 'body', mb => {
      mb.loft(ts.map((t, i) => ({ y: t * H, rx: Math.max(rOf(t), 0.01), rz: Math.max(rOf(t), 0.01) * 0.94, color: cols[Math.min(i, cols.length - 1)] })), { sides: 12 });
      // bottom opening
      disc(mb, [0, H * 0.012, 0], [0, -1, 0], R * 0.14, R * 0.14, '#5a2a10', 8);
      // eye holes: dark sockets with a lighter rim
      LR(s => {
        const a = PI / 2 - s * 0.36, t = 0.66, r = rOf(t);
        const p = [C(a) * r, t * H, S(a) * r * 0.94], n = [C(a), 0.1, S(a)];
        disc(mb, V.add(p, V.scale(n, -0.005)), n, R * 0.3, R * 0.36, '#6a6a88', 10);
        disc(mb, V.add(p, V.scale(n, 0.012)), n, R * 0.23, R * 0.28, '#14142a', 10);
      });
    });
    m.height = H; m.lungeScale = 0.5;
    return m;
  }
  def('grangalan', (a) => grangalan(a, 1.3, 0));
  def('grangalan_jr', (a) => grangalan(a, 0.85, 0.3));
  def('grangalan_jrjr', (a) => grangalan(a, 0.55, 0.6));

  // Needle Kiss: tan hovering bird with a long needle beak, spread ragged wings, hanging tail feathers
  def('needle_kiss', (a) => {
    const m = rig(a); m.floats = true;
    const T = '#a89470', L = '#cfc2a0', D = '#7a6a4c';
    m.bone('body', 'root', [0, 1.25, 0], [-0.25, 0, 0]);
    m.bone('head', 'body', [0, 0.26, 0.06]);
    m.bone('wingL', 'body', [0.1, 0.14, 0]); m.bone('wingR', 'body', [-0.1, 0.14, 0]);
    m.bone('tail', 'body', [0, -0.2, -0.05]);
    m.bone('legFL', 'body', [0.06, -0.12, 0.1]); m.bone('legFR', 'body', [-0.06, -0.12, 0.1]);
    att(m, 'body', mb => {
      ell(mb, 0, 0, 0, 0.16, 0.26, 0.15, T, 8, 6, (i, j) => j > 3 ? D : T);
      ell(mb, 0, 0.03, 0.07, 0.1, 0.17, 0.09, L, 6, 4);
      // shaggy lower plumage
      for (let i = 0; i < 9; i++) { const an = (i / 9) * PI * 2; mb.blade([C(an) * 0.1, -0.12, S(an) * 0.09], [C(an) * 0.4, -1, S(an) * 0.4], 0.22 + (i % 3) * 0.05, 0.08, 0.02, i % 2 ? T : D, null, L); }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0.02, 0.075, 0.07, 0.08, T, 7, 5);
      eye(mb, 0.045, 0.06, 0.07, 0.016, '#101010', false); eye(mb, -0.045, 0.06, 0.07, 0.016, '#101010', false);
      tube(mb, [0, 0.03, 0.08], [0, -0.06, 0.5], 0.02, 0.003, '#6a7ca8', 5);   // the needle
      blades(mb, [[[0, 0.1, 0], [0, 1, -0.4], 0.14, 0.05], [[0.02, 0.09, -0.03], [0.3, 0.8, -0.6], 0.1, 0.04]], '#3aa05a', '#80d080');
    });
    const wing = (s) => meshOf(mb => {
      const arm = [[0, 0, 0], [s * 0.3, 0.2, -0.04], [s * 0.62, 0.3, -0.08], [s * 0.9, 0.26, -0.12]];
      limb(mb, arm, [0.035, 0.03, 0.022, 0.01], T, 5);
      fan2(mb, [s * 0.05, -0.12, -0.02], [[0, 0.02, 0], ...arm.slice(1)], T, D);
      const f = [];
      for (let i = 0; i < 8; i++) {
        const t = i / 7, p = lerp3(arm[1], arm[3], t);
        f.push([p, [s * (0.15 + t * 0.6), -1, -0.25], 0.22 + 0.16 * S(t * PI) + t * 0.08, 0.07]);
      }
      blades(mb, f, T, L);
    });
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    att(m, 'tail', mb => blades(mb, [-2, -1, 0, 1, 2].map(i => [[i * 0.03, 0, 0], [i * 0.25, -1, -0.15], 0.4 - Math.abs(i) * 0.05, 0.08]), T, L));
    const leg = meshOf(mb => { limb(mb, [[0, 0, 0], [0, -0.1, 0.05], [0, -0.13, 0.12]], [0.018, 0.014, 0.01], '#d8a830', 4); LR(s => spike(mb, [0, -0.13, 0.12], [s * 0.4, -0.6, 0.6], 0.06, 0.008, '#e8d080', 3)); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 1.6; m.lungeScale = 0.9;
    return m;
  });

  // Beach Plug: spiky conch shell with a fanged mouth, green head, long teal stilt legs, lilac tail
  def('beach_plug', (a) => {
    const m = rig(a);
    const B = '#8a6a30', BL = '#b08a48', BD = '#5a4420', G = '#1c8a74', GD = '#146058';
    m.bone('body', 'root', [0, 0.82, 0]);
    m.bone('head', 'body', [0, -0.1, 0.2]);
    m.bone('jaw', 'body', [0, -0.06, 0.04], [-0.45, 0, 0]);
    m.bone('tail', 'body', [0, -0.05, -0.2]);
    const legs = [['legFL', 1, 1], ['legFR', -1, 1], ['legBL', 1, -1], ['legBR', -1, -1]];
    legs.forEach(([n, sx, sz]) => m.bone(n, 'body', [sx * 0.1, -0.14, sz * 0.08]));
    att(m, 'body', mb => {
      // green body under the shell
      ell(mb, 0, -0.12, 0.02, 0.14, 0.1, 0.18, G, 7, 5);
      // layered hood shell tilted back so the fanged mouth faces forward
      mb.push(); mb.translate(0, -0.04, 0.02); mb.rotate(-0.45, 0, 0);
      const layers = 6;
      for (let k = 0; k < layers; k++) {
        const y0 = k * 0.09, r0 = 0.36 - k * 0.055, r1 = r0 * 0.6;
        mb.loft([{ y: y0, rx: r0, rz: r0 * 0.95 }, { y: y0 + 0.15, rx: r1, rz: r1 * 0.95 }], { sides: 9, color: k % 2 ? BL : B, phase: k * 0.35 });
        for (let i = 0; i < 9; i++) { const an = (i / 9) * PI * 2 + k * 0.35; spike(mb, [C(an) * r0 * 0.95, y0 + 0.02, S(an) * r0 * 0.9], [C(an), -0.45, S(an)], 0.1, 0.045, k % 2 ? B : BD, 3); }
      }
      spike(mb, [0, 0.52, 0], [0, 1, -0.2], 0.14, 0.05, BL, 5);
      mb.pop();
    });
    att(m, 'jaw', mb => {
      disc(mb, [0, -0.005, 0], [0, -1, 0], 0.3, 0.28, '#801828', 10);
      for (let i = 0; i < 11; i++) { const an = (i / 11) * PI * 2; spike(mb, [C(an) * 0.29, 0.0, S(an) * 0.27], [-C(an) * 0.25, -1, -S(an) * 0.25], 0.1 + (i % 2) * 0.05, 0.03, '#d8d8f0', 3); }
    });
    att(m, 'head', mb => {
      tube(mb, [0, 0.0, -0.1], [0, -0.02, 0.05], 0.07, 0.06, G, 6);
      ell(mb, 0, -0.02, 0.07, 0.07, 0.06, 0.09, G, 7, 5);
      ball(mb, [0.045, 0.01, 0.13], 0.018, '#f0d020'); ball(mb, [-0.045, 0.01, 0.13], 0.018, '#f0d020');
    });
    legs.forEach(([n, sx, sz]) => att(m, n, mb => {
      const k = [sx * 0.3, 0.0, sz * 0.28], f = [sx * 0.5, -0.68, sz * 0.45];
      limb(mb, [[0, 0, 0], k, f], [0.04, 0.035, 0.02], [G, GD], 6);
      spike(mb, f, [sx * 0.8, -0.1, sz * 0.4], 0.12, 0.02, GD, 3);
    }));
    att(m, 'tail', mb => {
      const p = [[0, 0, 0], [0.1, 0.1, -0.35], [0.25, 0.2, -0.75], [0.45, 0.18, -1.1], [0.6, 0.08, -1.35]];
      limb(mb, p, [0.07, 0.065, 0.055, 0.04, 0.015], ['#9a78a8', '#a888b8', '#b898c8', '#c8a8d8'], 6);
    });
    m.height = 1.3; m.lungeScale = 0.7;
    return m;
  });

  // Search Crown / Battery Cap: mushroom on a stalk of stacked fanged jaws
  function mushroom(a, o) {
    const m = rig(a);
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('head', 'body', [0, o.h, 0]);
    att(m, 'body', mb => {
      // root claw
      for (let i = 0; i < 5; i++) { const an = (i / 5) * PI * 2 + 0.3; limb(mb, [[0, 0.1, 0], [C(an) * 0.15, 0.04, S(an) * 0.15], [C(an) * 0.26, 0, S(an) * 0.26]], [0.05, 0.035, 0.012], o.root, 5); }
      ell(mb, 0, 0.1, 0, 0.1, 0.08, 0.1, o.root, 7, 4);
      // stacked jaw segments
      const n = o.segs, sh0 = (o.h - 0.12) / n;
      for (let k = 0; k < n; k++) {
        const y = 0.12 + k * sh0, r = o.r * (1 - k * 0.08);
        mb.loft([{ y, rx: r * 0.8, rz: r * 0.8 }, { y: y + sh0 * 0.5, rx: r, rz: r }, { y: y + sh0, rx: r * 0.8, rz: r * 0.8 }], { sides: 8, color: o.stalk[k % o.stalk.length] });
        mb.loft([{ y: y + sh0 * 0.3, rx: r * 1.02, rz: r * 1.02 }, { y: y + sh0 * 0.7, rx: r * 1.02, rz: r * 1.02 }], { sides: 8, color: o.gum, capTop: false, capBottom: false });
        for (let i = 0; i < 8; i++) {
          const an = (i / 8) * PI * 2;
          spike(mb, [C(an) * r, y + sh0 * 0.7, S(an) * r], [C(an) * 0.4, -1, S(an) * 0.4], sh0 * 0.35, 0.02, o.tooth, 3);
          spike(mb, [C(an + 0.4) * r, y + sh0 * 0.3, S(an + 0.4) * r], [C(an) * 0.4, 1, S(an) * 0.4], sh0 * 0.35, 0.02, o.tooth, 3);
        }
      }
    });
    att(m, 'head', mb => {
      mb.loft([{ y: -0.04, rx: o.r * 0.9, rz: o.r * 0.9 }, { y: 0.0, rx: o.cap, rz: o.cap }, { y: 0.07, rx: o.cap * 0.95, rz: o.cap * 0.95 }, { y: 0.16, rx: o.cap * 0.7, rz: o.cap * 0.7 }, { y: 0.21, rx: o.cap * 0.3, rz: o.cap * 0.3 }],
        { sides: 10, color: o.capCol });
      disc(mb, [0, -0.005, 0], [0, -1, 0], o.cap * 0.95, o.cap * 0.95, o.under, 10);
    });
    m.height = o.h + 0.2;
    return m;
  }
  def('search_crown', (a) => mushroom(a, { h: 0.62, r: 0.085, segs: 3, cap: 0.24, capCol: '#c02858', under: '#6a2a70', root: '#6a3aa8', stalk: ['#8a2020', '#a03020'], gum: '#e08a30', tooth: '#f0f0f0' }));
  def('battery_cap', (a) => mushroom(a, { h: 0.7, r: 0.08, segs: 4, cap: 0.22, capCol: '#9038c8', under: '#502080', root: '#402060', stalk: ['#3a2a50', '#50406a'], gum: '#d0d0e0', tooth: '#f8f8ff' }));

  // Bagnadrana: green turtle-shell back on thick purple legs, long neck, horned dragon head
  def('bagnadrana', (a) => {
    const m = rig(a);
    const G = '#3a8a52', GL = '#58a868', P = '#5a3a98', PD = '#3a2468', N = '#7a9a58';
    m.bone('body', 'root', [0, 0.55, 0]);
    m.bone('head', 'body', [0, 0.72, 0.5]);
    m.bone('jaw', 'head', [0, -0.03, 0.08]);
    m.bone('tail', 'body', [0, 0.05, -0.55]);
    [['legFL', 1, 1], ['legFR', -1, 1], ['legBL', 1, -1], ['legBR', -1, -1]].forEach(([n, sx, sz]) => m.bone(n, 'body', [sx * 0.34, -0.05, sz * 0.36]));
    att(m, 'body', mb => {
      ell(mb, 0, 0, 0, 0.42, 0.22, 0.6, P, 8, 5);
      // faceted shell
      mb.loft([{ y: 0.02, rx: 0.52, rz: 0.72 }, { y: 0.2, rx: 0.48, rz: 0.66 }, { y: 0.38, rx: 0.3, rz: 0.44 }, { y: 0.46, rx: 0.08, rz: 0.1 }], { sides: 8, color: G, smooth: false });
      for (let i = 0; i < 8; i++) { const an = (i / 8) * PI * 2 + PI / 8; disc(mb, [C(an) * 0.4, 0.28, S(an) * 0.54], [C(an), 0.9, S(an)], 0.12, 0.12, GL, 6); }
      // purple spines on the back
      tube(mb, [0.1, 0.3, -0.2], [0.35, 1.1, -0.75], 0.04, 0.01, '#7050b8', 5);
      tube(mb, [-0.05, 0.3, -0.25], [-0.15, 0.9, -0.95], 0.035, 0.008, '#6a48b0', 5);
      // neck
      limb(mb, [[0, 0.1, 0.45], [0, 0.35, 0.58], [0, 0.62, 0.55], [0, 0.72, 0.5]], [0.13, 0.1, 0.08, 0.075], N, 7);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0.05, 0.09, 0.08, 0.12, '#4a9a70', 7, 5);
      mb.frustum(0, -0.01, 0.13, 0.12, 0.1, 0.08, 0.06, 0.07, '#4a9a70');
      mb.box(0, 0.0, 0.22, 0.07, 0.05, 0.08, '#4a9a70');
      eye(mb, 0.06, 0.08, 0.11, 0.018, '#f0e040', '#300000'); eye(mb, -0.06, 0.08, 0.11, 0.018, '#f0e040', '#300000');
      spike(mb, [0, 0.1, 0.02], [0, 1, -0.6], 0.22, 0.04, '#d0c890', 4);
      LR(s => spike(mb, [s * 0.07, 0.07, -0.02], [s * 0.6, 0.4, -1], 0.14, 0.025, '#d0c890', 4));
    });
    att(m, 'jaw', mb => { mb.box(0, -0.03, 0.1, 0.1, 0.03, 0.18, '#3a7a58'); teeth(mb, [-0.04, -0.01, 0.17], [0.04, -0.01, 0.17], 3, 0.03, [0, 1, 0], '#f0f0e0'); });
    ['legFL', 'legFR', 'legBL', 'legBR'].forEach((n, i) => att(m, n, mb => {
      const sx = i % 2 ? -1 : 1;
      mb.loft([{ y: 0.05, rx: 0.13, rz: 0.14 }, { y: -0.25, rx: 0.12, rz: 0.13 }, { y: -0.45, rx: 0.1, rz: 0.11 }, { y: -0.55, rx: 0.12, rz: 0.14 }], { sides: 6, color: P, smooth: false });
      for (let k = -1; k <= 1; k++) spike(mb, [sx * 0.02 + k * 0.06, -0.52, 0.1], [k * 0.3, -0.3, 1], 0.08, 0.025, '#c8c0e8', 3);
    }));
    att(m, 'tail', mb => limb(mb, [[0, 0, 0], [0, -0.1, -0.35], [0, -0.3, -0.6]], [0.1, 0.06, 0.01], PD, 6));
    m.height = 1.35; m.lungeScale = 0.8;
    return m;
  });

  // Cokatolis: tall white-lilac cockerel on stilt legs, magenta crest, spiky tail plume
  def('cokatolis', (a) => {
    const m = rig(a);
    const W = '#dcdcf4', L = '#a8a8e0', P = '#6a60b8', Lg = '#9890b0';
    m.bone('body', 'root', [0, 0.95, 0]);
    m.bone('head', 'body', [0, 0.55, 0.3]);
    m.bone('jaw', 'head', [0, 0.0, 0.1]);
    m.bone('tail', 'body', [0, 0.1, -0.3]);
    m.bone('wingL', 'body', [0.18, 0.12, 0]); m.bone('wingR', 'body', [-0.18, 0.12, 0]);
    m.bone('legFL', 'body', [0.1, -0.12, 0]); m.bone('legFR', 'body', [-0.1, -0.12, 0]);
    att(m, 'body', mb => {
      mb.push(); mb.rotate(0.5, 0, 0);
      ell(mb, 0, 0, 0, 0.25, 0.34, 0.27, W, 8, 6, (i, j) => j > 3 ? L : j > 2 ? '#c0c0ec' : W);
      mb.pop();
      limb(mb, [[0, 0.15, 0.15], [0, 0.35, 0.26], [0, 0.55, 0.3]], [0.12, 0.085, 0.07], W, 7);
      // spiky back plumage sweeping up and back
      for (let i = 0; i < 10; i++) { const s = i % 2 ? 1 : -1, k = Math.floor(i / 2); mb.blade([s * 0.12, 0.12 - k * 0.05, -0.05 - k * 0.04], [s * 0.7, 0.6 - k * 0.1, -0.6], 0.38 - k * 0.03, 0.07, 0.02, k % 2 ? L : W, null, '#f4f4ff'); }
      // ruff of spiky feathers on the chest
      for (let i = 0; i < 7; i++) { const an = -0.9 + i * 0.3; spike(mb, [S(an) * 0.14, 0.2, C(an) * 0.18 + 0.1], [S(an) * 0.6, -0.4, C(an)], 0.14, 0.035, i % 2 ? W : L, 3); }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.03, 0.03, 0.08, 0.09, 0.1, W, 7, 5);
      eye(mb, 0.05, 0.06, 0.08, 0.02, '#f8f8f8', '#200000'); eye(mb, -0.05, 0.06, 0.08, 0.02, '#f8f8f8', '#200000');
      mb.push(); mb.translate(0, 0.03, 0.11); mb.rotate(PI / 2 - 0.2, 0, 0); mb.prism(0, 0, 0, 0.035, 0, 0.1, 4, '#f0c020'); mb.pop();
      blades(mb, [[[0, 0.1, 0.04], [0, 1, 0.1], 0.2, 0.05], [[0, 0.1, 0.0], [0, 1, -0.4], 0.26, 0.04], [[0, 0.09, -0.04], [0, 0.6, -1], 0.22, 0.04]], '#d02878', '#f070b0');
    });
    att(m, 'jaw', mb => { ell(mb, 0, -0.06, 0.02, 0.025, 0.04, 0.02, '#d02020', 5, 3); });
    att(m, 'tail', mb => {
      for (let i = 0; i < 9; i++) { const an = -0.8 + i * 0.2; mb.blade([S(an) * 0.08, 0, 0], [S(an) * 0.9, 0.5 + C(an) * 0.4, -1], 0.35 + (i % 2) * 0.12, 0.06, 0.015, i % 2 ? L : W, null, '#f0f0ff'); }
    });
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      for (let i = 0; i < 5; i++) mb.blade([s * 0.02, -i * 0.04, 0.05 - i * 0.03], [s * 0.35, -0.5, -1], 0.3 - i * 0.02, 0.07, 0.015, i % 2 ? L : P, null, W);
    }));
    const leg = meshOf(mb => {
      limb(mb, [[0, 0, 0], [0, -0.35, -0.12], [0, -0.82, 0.0]], [0.05, 0.03, 0.022], [W, Lg], 5);
      for (let k = -1; k <= 1; k++) spike(mb, [0, -0.82, 0.0], [k * 0.5, -0.15, 1], 0.14, 0.015, Lg, 3);
      spike(mb, [0, -0.82, 0], [0, -0.1, -1], 0.08, 0.012, Lg, 3);
    });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 1.75; m.lungeScale = 0.8;
    return m;
  });

  // Bomb: floating red ball of fire with slanted yellow eyes and a big toothy grin
  def('bomb', (a) => {
    const m = rig(a); m.floats = true;
    const R = '#d02410', RD = '#8a1008', F = '#f07818', FY = '#f8d040';
    m.bone('body', 'root', [0, 1.05, 0]);
    m.bone('head', 'body', [0, 0, 0]);
    m.bone('jaw', 'head', [0, -0.12, 0.3]);
    m.bone('armL', 'body', [0.42, 0, 0.05]); m.bone('armR', 'body', [-0.42, 0, 0.05]);
    att(m, 'body', mb => {
      ell(mb, 0, 0, 0, 0.44, 0.42, 0.4, R, 10, 7, (i, j) => j > 4 ? RD : j < 2 ? sh(R, 0.12) : R);
      // flame crest around the top and back
      for (let i = 0; i < 14; i++) {
        const an = (i / 14) * PI * 2, up = 0.55 + 0.45 * S(an);
        const p = [C(an) * 0.3, 0.28 + 0.06 * up, S(an) * 0.28 - 0.05];
        mb.blade(p, [C(an) * 0.8, 0.9, S(an) * 0.5 - 0.3], 0.18 + 0.1 * ((i * 7) % 3), 0.12, 0.04, F, null, FY);
      }
      for (let i = 0; i < 6; i++) { const an = PI + (i / 5 - 0.5) * 1.6; mb.blade([C(an) * 0.36, -0.05, S(an) * 0.3 - 0.1], [C(an), 0.2, -0.6], 0.2, 0.12, 0.04, F, null, FY); }
    });
    att(m, 'head', mb => {
      LR(s => {
        mb.push(); mb.translate(s * 0.15, 0.1, 0.36); mb.rotate(-0.25, s * 0.35, s * 0.35);
        mb.sphere(0, 0, 0, 0.11, 0.06, 0.04, FY, 8, 4, false); mb.sphere(s * -0.02, -0.005, 0.03, 0.035, 0.035, 0.02, '#1a1000', 6, 3, false);
        mb.pop();
        mb.blade([s * 0.05, 0.2, 0.36], [s * 1, 0.25, 0.2], 0.2, 0.05, 0.03, RD);   // angry brow
      });
      mb.push(); mb.translate(0, -0.1, 0.32); mb.rotate(-0.2, 0, 0); mb.sphere(0, 0, 0, 0.24, 0.1, 0.08, '#3a0808', 10, 4, false); mb.pop();
      teeth(mb, [-0.2, -0.05, 0.38], [0.2, -0.05, 0.38], 7, 0.06, [0, -1, 0.1], '#f4f0e0', 0.025);
    });
    att(m, 'jaw', mb => teeth(mb, [-0.16, 0.0, 0.07], [0.16, 0.0, 0.07], 6, 0.06, [0, 1, 0.1], '#f4f0e0', 0.025));
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => { mb.blade([0, 0, 0], [s, 0.3, 0.3], 0.26, 0.13, 0.05, F, null, FY); mb.blade([0, -0.05, 0], [s, -0.2, 0.4], 0.2, 0.1, 0.04, F, null, FY); }));
    m.height = 1.5; m.lungeScale = 1.1;
    return m;
  });

  // 2-Faced: two floating heads circling each other - a blue-capped clown and a red demon
  def('2_faced', (a) => {
    const m = rig(a); m.floats = true;
    m.bone('body', 'root', [0, 0.95, 0]);
    m.bone('head', 'body', [0, -0.08, 0.1]);
    m.bone('jaw', 'head', [0, -0.08, 0.14]);
    m.bone('armL', 'body', [0, 0, 0]);
    att(m, 'head', mb => {
      ell(mb, 0, 0, 0, 0.21, 0.21, 0.2, '#f0e6e6', 10, 7, (i, j) => j > 4 ? '#d8c8d0' : '#f0e6e6');
      // blue jester cap with white trim
      mb.sphere(0, 0.04, -0.02, 0.24, 0.24, 0.23, '#2448c8', 10, 7, true, (i, j) => j === 2 ? '#f0f0f0' : '#2448c8', 3);
      LR(s => { spike(mb, [s * 0.14, 0.12, -0.02], [s * 1, 0.1, -0.2], 0.12, 0.05, '#2448c8', 4); ball(mb, [s * 0.26, 0.13, -0.04], 0.03, '#f0f0f0'); });
      LR(s => {
        mb.push(); mb.translate(s * 0.075, 0.03, 0.18); mb.rotate(-0.1, s * 0.3, 0);
        mb.sphere(0, 0, 0, 0.055, 0.05, 0.025, '#f0d020', 8, 4, false); mb.sphere(0, 0, 0.018, 0.025, 0.028, 0.012, '#101010', 6, 3, false);
        mb.pop();
        ell(mb, s * 0.13, -0.06, 0.15, 0.035, 0.025, 0.02, '#e05070', 5, 3);
      });
    });
    att(m, 'jaw', mb => {
      mb.push(); mb.rotate(-0.25, 0, 0); mb.sphere(0, 0, 0, 0.12, 0.045, 0.03, '#c01830', 8, 4, false); mb.sphere(0, 0.004, 0.012, 0.09, 0.025, 0.02, '#f8f0f0', 8, 3, false); mb.pop();
    });
    att(m, 'armL', mb => {
      const c = [0.12, 0.34, -0.2];
      ell(mb, c[0], c[1], c[2], 0.19, 0.19, 0.18, '#a82018', 9, 6, (i, j) => j > 3 ? '#701008' : '#a82018');
      LR(s => { eye(mb, c[0] + s * 0.07, c[1] + 0.05, c[2] + 0.15, 0.03, '#f0e030', '#200000'); mb.blade([c[0] + s * 0.03, c[1] + 0.1, c[2] + 0.15], [s, 0.3, 0.1], 0.1, 0.03, 0.02, '#601008'); });
      mb.push(); mb.translate(c[0], c[1] - 0.07, c[2] + 0.14); mb.rotate(-0.2, 0, 0);
      mb.sphere(0, 0, 0, 0.12, 0.05, 0.04, '#300808', 8, 4, false);
      mb.pop();
      teeth(mb, [c[0] - 0.1, c[1] - 0.045, c[2] + 0.17], [c[0] + 0.1, c[1] - 0.045, c[2] + 0.17], 6, 0.04, [0, -1, 0], '#f0ead8', 0.018);
      teeth(mb, [c[0] - 0.09, c[1] - 0.1, c[2] + 0.16], [c[0] + 0.09, c[1] - 0.1, c[2] + 0.16], 5, 0.04, [0, 1, 0], '#f0ead8', 0.018);
      spike(mb, [c[0], c[1] + 0.17, c[2]], [0, 1, -0.3], 0.1, 0.04, '#701008', 4);
    });
    m.onPose = (mm) => { mm.b('body').rot[1] += S((FF7.frame || 0) * 0.02) * 0.5; };
    m.height = 1.35; m.lungeScale = 1.0;
    return m;
  });

  // Death Claw: pale bio-mech with a skull head and a crown of long claw arms around its back
  def('death_claw', (a) => {
    const m = rig(a);
    const P = '#b4bca8', PD = '#6a7868', T = '#2a6a70', B = '#e8e2d0';
    m.bone('body', 'root', [0, 0.95, 0]);
    m.bone('head', 'body', [0, 0.42, 0.12]);
    m.bone('jaw', 'head', [0, -0.05, 0.06]);
    m.bone('armL', 'body', [0.26, 0.32, 0.02]); m.bone('armR', 'body', [-0.26, 0.32, 0.02]);
    m.bone('legFL', 'body', [0.15, -0.12, 0]); m.bone('legFR', 'body', [-0.15, -0.12, 0]);
    m.bone('wingL', 'body', [0.1, 0.35, -0.12]); m.bone('wingR', 'body', [-0.1, 0.35, -0.12]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.15, rx: 0.2, rz: 0.15 }, { y: 0.05, rx: 0.17, rz: 0.13 }, { y: 0.28, rx: 0.26, rz: 0.18 }, { y: 0.42, rx: 0.2, rz: 0.14 }], { sides: 6, color: P, smooth: false });
      mb.loft([{ y: 0.1, rx: 0.12, rz: 0.08, z: 0.1 }, { y: 0.34, rx: 0.16, rz: 0.08, z: 0.12 }], { sides: 6, color: PD, smooth: false });
      ell(mb, 0, 0.3, -0.12, 0.18, 0.16, 0.12, PD, 6, 4);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.07, 0, 0.11, 0.11, 0.12, B, 7, 5);
      LR(s => { ell(mb, s * 0.045, 0.07, 0.1, 0.03, 0.028, 0.02, '#201818', 6, 3); ball(mb, [s * 0.045, 0.07, 0.115], 0.012, '#f02020'); });
      mb.box(0, 0.0, 0.1, 0.05, 0.03, 0.02, '#302020');
    });
    att(m, 'jaw', mb => { mb.box(0, -0.02, 0.03, 0.12, 0.04, 0.1, B); teeth(mb, [-0.04, 0.0, 0.08], [0.04, 0.0, 0.08], 4, 0.02, [0, 1, 0], '#fff'); });
    const claw = (s, pts, r) => (mb) => {
      limb(mb, pts, [r, r * 0.8, r * 0.6, r * 0.3], [P, P, T], 5);
      const e = pts[pts.length - 1], d = V.sub(e, pts[pts.length - 2]);
      spike(mb, e, d, 0.16, r * 0.5, T, 4);
    };
    LR(s => att(m, s > 0 ? 'armL' : 'armR', claw(s, [[0, 0, 0], [s * 0.18, -0.2, 0.1], [s * 0.12, -0.42, 0.25], [s * 0.1, -0.5, 0.42]], 0.06)));
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      [[0.5, 0.55, -0.1], [0.7, 0.15, -0.2], [0.6, -0.25, -0.1], [0.3, 0.75, -0.3]].forEach((d) => {
        const e = [s * d[0], d[1], d[2]], mid = [s * d[0] * 0.5, d[1] * 0.5 + 0.12, d[2] * 0.5];
        claw(s, [[0, 0, 0], mid, e, V.add(e, [s * 0.08, -0.12, 0.08])], 0.045)(mb);
      });
    }));
    const leg = (s) => meshOf(mb => {
      limb(mb, [[0, 0, 0], [s * 0.06, -0.38, 0.1], [s * 0.08, -0.8, -0.02]], [0.1, 0.085, 0.07], [P, PD], 6);
      mb.rbox(s * 0.08, -0.36, 0.14, 0.12, 0.14, 0.06, PD, 0.3);
      mb.rbox(s * 0.08, -0.8, 0.06, 0.16, 0.08, 0.24, PD, 0.3);
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 1.65; m.lungeScale = 0.7;
    return m;
  });

  // Dyne: Barret's old friend - a broad brawler in a white tank top under a dark brown vest, red neckerchief and
  // pendant, a grey angular pad on the gun shoulder, a long grey gun-arm on the left, green trousers
  // (styleOver: null keeps the white top: the cast preset's battle style would otherwise bare his chest)
  def('dyne', (a) => human({ base: 'dyne', _id: 'dyne_b', styleOver: null, skin: '#b87a52', hair: '#3a2a4a', top: '#e4e2d8', sleeve: 'skin', vestColor: '#4a3624',
    bottom: '#2e5a3a', pants: 'baggy', boots: '#8a5a28', gloves: '#b87a52', bracer: '#6a3a8a', belt: '#2a2018', build: 'big',
    extras: ['dyneVest', 'gunarmL', 'belt', 'stubble', 'necklace', 'scarf', 'pauldronL'], scarfColor: '#b02020', scarfTailLen: 0.22, pauldron: '#8a8a90', pauldronSq: 4, pauldronScale: 0.95,
    gunColor: '#7a7a82', barrelColor: '#3a3a40', barrels: 1, barrelLen: 1.7, face: { brow: 3 }, eyes: '#302018' }, 1.75));

  // Spencer: gliding green-scaled lizard with lilac manta wings and yellow back spikes
  def('spencer', (a) => {
    const m = rig(a); m.floats = true;
    const G = '#2a7a5a', GD = '#1a4a3a', Y = '#c8c040', W = '#c898e0';
    m.bone('body', 'root', [0, 0.85, 0], [0.15, 0, 0]);
    m.bone('head', 'body', [0, 0.05, 0.38]);
    m.bone('jaw', 'head', [0, -0.03, 0.08]);
    m.bone('tail', 'body', [0, 0, -0.35]);
    m.bone('wingL', 'body', [0.1, 0.04, 0.05]); m.bone('wingR', 'body', [-0.1, 0.04, 0.05]);
    att(m, 'body', mb => {
      ell(mb, 0, 0, 0, 0.14, 0.12, 0.4, G, 8, 5, (i, j) => j > 3 ? GD : G);
      for (let i = 0; i < 6; i++) mb.blade([0, 0.1, 0.25 - i * 0.1], [0, 1, -0.5], 0.14 - i * 0.01, 0.07, 0.02, Y, null, '#f0e080');
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.02, 0.06, 0.08, 0.07, 0.14, G, 7, 5);
      LR(s => { eye(mb, s * 0.05, 0.05, 0.12, 0.015, '#f0e040', '#300000'); spike(mb, [s * 0.04, 0.06, 0.0], [s * 0.4, 0.5, -1], 0.16, 0.02, Y, 3); spike(mb, [s * 0.07, 0.0, 0.02], [s * 1, 0.1, -0.6], 0.12, 0.02, Y, 3); });
    });
    att(m, 'jaw', mb => { mb.box(0, -0.02, 0.08, 0.08, 0.025, 0.14, '#1a5a40'); });
    att(m, 'tail', mb => limb(mb, [[0, 0, 0], [0, 0.02, -0.35], [0, 0.08, -0.7], [0, 0.18, -0.95]], [0.09, 0.06, 0.035, 0.01], G, 6));
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const e = [[0, 0, 0.25], [s * 0.45, 0.2, 0.22], [s * 1.0, 0.5, 0.0], [s * 0.75, 0.3, -0.25], [s * 0.45, 0.12, -0.2], [s * 0.3, 0.06, -0.4], [0, 0, -0.3]];
      fan2(mb, [s * 0.05, 0, 0], e, W, '#9a70b8');
      tube(mb, [0, 0, 0.2], [s * 1.0, 0.5, 0.0], 0.025, 0.008, '#e0c0f0', 4);
    }));
    m.height = 1.2; m.lungeScale = 1.2;
    return m;
  });

  // Flapbeat: skeletal pale bird with enormous red-orange fingered bat wings
  def('flapbeat', (a) => {
    const m = rig(a); m.floats = true;
    const B = '#d8d0e8', BD = '#9088a8', R = '#d83850', O = '#e89030';
    m.bone('body', 'root', [0, 1.2, 0]);
    m.bone('head', 'body', [0, 0.36, 0.06]);
    m.bone('tail', 'body', [0, -0.22, -0.03]);
    m.bone('wingL', 'body', [0.07, 0.2, 0]); m.bone('wingR', 'body', [-0.07, 0.2, 0]);
    m.bone('legFL', 'body', [0.05, -0.18, 0.02]); m.bone('legFR', 'body', [-0.05, -0.18, 0.02]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.2, rx: 0.04, rz: 0.04 }, { y: -0.05, rx: 0.08, rz: 0.07 }, { y: 0.12, rx: 0.1, rz: 0.08 }, { y: 0.25, rx: 0.06, rz: 0.05 }], { sides: 6, color: B });
      for (let i = 0; i < 4; i++) mb.loft([{ y: -0.02 + i * 0.07, rx: 0.1 - Math.abs(i - 1.5) * 0.012, rz: 0.085 }, { y: 0.01 + i * 0.07, rx: 0.1 - Math.abs(i - 1.5) * 0.012, rz: 0.085 }], { sides: 6, color: BD, capTop: false, capBottom: false });
      limb(mb, [[0, 0.24, 0], [0, 0.32, 0.04], [0, 0.36, 0.06]], [0.035, 0.03, 0.03], B, 5);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.03, 0.02, 0.05, 0.05, 0.07, B, 6, 4);
      tube(mb, [0, 0.02, 0.07], [0, -0.01, 0.2], 0.02, 0.003, BD, 4);
      spike(mb, [0, 0.07, -0.02], [0, 0.6, -1], 0.14, 0.015, B, 3);
      LR(s => ball(mb, [s * 0.03, 0.04, 0.06], 0.012, '#c02030'));
    });
    att(m, 'tail', mb => limb(mb, [[0, 0, 0], [0, -0.25, -0.02], [0, -0.5, 0.03], [0.02, -0.7, 0.0]], [0.025, 0.018, 0.012, 0.004], B, 4));
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const E = [s * 0.28, 0.12, -0.02], Wr = [s * 0.55, 0.05, -0.05];
      limb(mb, [[0, 0, 0], E, Wr], [0.025, 0.02, 0.015], B, 4);
      const tips = [[s * 0.95, 0.55, -0.1], [s * 1.05, 0.2, -0.12], [s * 0.98, -0.15, -0.1], [s * 0.75, -0.42, -0.08], [s * 0.45, -0.5, -0.05]];
      const edge = [[0, -0.28, 0]];
      tips.forEach((t, i) => { tube(mb, Wr, t, 0.012, 0.004, BD, 4); edge.push(t); if (i < tips.length - 1) edge.push(lerp3(lerp3(t, tips[i + 1], 0.5), Wr, 0.35)); });
      edge.push(E); edge.push([0, 0, 0]);
      edge.reverse();
      for (let i = 0; i < edge.length - 1; i++) tri2(mb, Wr, edge[i], edge[i + 1], i % 2 ? R : O, sh(i % 2 ? R : O, -0.25));
      tri2(mb, [0, 0, 0], [0, -0.28, 0], Wr, R, sh(R, -0.25));
    }));
    const leg = meshOf(mb => { limb(mb, [[0, 0, 0], [0, -0.25, 0.05], [0, -0.5, 0.0]], [0.018, 0.014, 0.008], B, 4); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 1.75; m.lungeScale = 1.0;
    return m;
  });

  // Joker: floating jester in a tattered teal robe with a skull mask and a drooping fool's cap
  def('joker', (a) => {
    const m = rig(a); m.floats = true;
    const T = '#1e5058', TL = '#2e7078', TD = '#123238', M = '#e8dca0';
    m.bone('body', 'root', [0, 0.72, 0]);
    m.bone('head', 'body', [0, 0.72, 0.02]);
    m.bone('armL', 'body', [0.2, 0.6, 0]); m.bone('armR', 'body', [-0.2, 0.6, 0]);
    att(m, 'body', mb => {
      // robe: flared tattered skirt
      mb.loft([{ y: 0.66, rx: 0.12, rz: 0.1 }, { y: 0.45, rx: 0.17, rz: 0.13 }, { y: 0.2, rx: 0.15, rz: 0.12 }, { y: -0.3, rx: 0.26, rz: 0.22 }, { y: -0.6, rx: 0.34, rz: 0.28 }],
        { sides: 10, color: T, capBottom: false });
      for (let i = 0; i < 10; i++) { const an = i / 10 * PI * 2; mb.blade([C(an) * 0.32, -0.55, S(an) * 0.27], [C(an) * 0.3, -1, S(an) * 0.3], 0.16 + (i % 3) * 0.05, 0.16, 0.02, TD); }
      // ruff collar
      for (let i = 0; i < 10; i++) { const an = i / 10 * PI * 2; mb.blade([0, 0.66, 0], [C(an), -0.2, S(an)], 0.2, 0.12, 0.02, i % 2 ? TL : '#c8b060'); }
      // the cane held across the body
      tube(mb, [0.45, 0.42, 0.22], [-0.4, 0.15, 0.18], 0.018, 0.018, '#e0c040', 5);
      ball(mb, [0.45, 0.42, 0.22], 0.035, '#f0e070');
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.1, 0.02, 0.09, 0.12, 0.09, M, 7, 5);
      LR(s => { ell(mb, s * 0.035, 0.12, 0.08, 0.025, 0.03, 0.015, '#201810', 6, 3); });
      mb.box(0, 0.02, 0.085, 0.07, 0.02, 0.01, '#302010');
      // fool's cap: two drooping horns with bells
      mb.sphere(0, 0.14, 0, 0.11, 0.1, 0.1, T, 8, 5, true, null, 3);
      LR(s => { limb(mb, [[s * 0.06, 0.2, 0], [s * 0.2, 0.3, -0.04], [s * 0.3, 0.22, -0.06], [s * 0.33, 0.08, -0.05]], [0.06, 0.045, 0.025, 0.012], T, 5); ball(mb, [s * 0.33, 0.06, -0.05], 0.025, '#e0c040'); });
      limb(mb, [[0, 0.22, -0.03], [0, 0.36, -0.12], [0, 0.34, -0.26]], [0.05, 0.03, 0.01], TL, 5);
    });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.1, -0.2, 0.1], [s * 0.05, -0.25, 0.25]], [0.05, 0.04, 0.03], [T, TL], 6);
      for (let i = -1; i <= 1; i++) spike(mb, [s * 0.05, -0.25, 0.25], [s * 0.2 + i * 0.3, 0.1, 1], 0.1, 0.01, '#d0c8a0', 3);
    }));
    m.height = 1.85; m.lungeScale = 1.0;
    return m;
  });

  // ---- Harpy: rearing three-headed chimera - a massive tawny lion body up on thick hind legs with taloned bird feet,
  // big clawed forepaws raised, pale grey-brown feathered wings, a pale goat head with dark curling ram horns, a
  // lion head with white horns, a black dragon head at its left shoulder and a green snake for a tail
  def('harpy', (a) => {
    const m = rig(a);
    const T = '#8a6a48', TL = '#a88a60', TD = '#5a4030', W = '#8a7a70', WT = '#b0a498', H = '#dcd8dc', HD = '#202838', Tal = '#c07840', Sn = '#2a7a40';
    const P = 0.5;
    m.bone('body', 'root', [0, 0.95, -0.3], [P, 0, 0]);
    m.bone('chest', 'body', [0, 0.95, 0.05], [-P, 0, 0]);
    m.bone('head', 'chest', [-0.14, 0.36, 0.1]);
    m.bone('jaw', 'head', [0, -0.08, 0.14]);
    m.bone('tail', 'body', [0, -0.3, -0.28], [-P, 0, 0]);
    m.bone('wingL', 'body', [0.24, 0.82, -0.22], [-P, 0, 0]); m.bone('wingR', 'body', [-0.24, 0.82, -0.22], [-P, 0, 0]);
    m.bone('legFL', 'body', [0.36, 0.7, 0.2], [-P, 0, 0]); m.bone('legFR', 'body', [-0.36, 0.7, 0.2], [-P, 0, 0]);
    m.bone('legBL', 'root', [0.3, 0.95, -0.38]); m.bone('legBR', 'root', [-0.3, 0.95, -0.38]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.36, rx: 0.34, rz: 0.34 }, { y: 0.1, rx: 0.4, rz: 0.38 }, { y: 0.55, rx: 0.47, rz: 0.42, color: TL }, { y: 0.86, rx: 0.4, rz: 0.36 }, { y: 1.04, rx: 0.26, rz: 0.26 }], { sides: 7, color: T });
      ell(mb, 0, 0.45, 0.28, 0.3, 0.34, 0.16, TL, 5, 3);                                       // muscular chest
    });
    att(m, 'chest', mb => {
      tube(mb, [-0.08, -0.05, 0], [-0.14, 0.32, 0.1], 0.16, 0.12, H, 5);                        // goat neck
      // lion head (its left of centre): dark mane, tawny face, white horns
      const L = [0.24, 0.2, 0.18];
      ell(mb, L[0], L[1] + 0.02, L[2] - 0.06, 0.24, 0.24, 0.2, '#6a3020', 6, 4);
      ell(mb, L[0], L[1], L[2] + 0.02, 0.16, 0.16, 0.17, '#a06a38', 5, 4);
      ell(mb, L[0], L[1] - 0.05, L[2] + 0.16, 0.09, 0.08, 0.09, '#b08050', 5, 3);
      LR(s => {
        mb.sweep(mb.curvePts([[L[0] + s * 0.1, L[1] + 0.12, L[2]], [L[0] + s * 0.26, L[1] + 0.3, L[2] - 0.06], [L[0] + s * 0.3, L[1] + 0.46, L[2] + 0.06]], 1), [0.055, 0.05, 0.04, 0.025, 0], { sides: 4, color: '#e8e0d0' });
        ball(mb, [L[0] + s * 0.06, L[1] + 0.05, L[2] + 0.15], 0.018, '#f0c020', 5, 3);
      });
      teeth(mb, [L[0] - 0.07, L[1] - 0.09, L[2] + 0.23], [L[0] + 0.07, L[1] - 0.09, L[2] + 0.23], 4, 0.05, [0, -1, 0], '#fff');
      // black dragon head on a short neck at its left shoulder
      const D = [0.6, 0.02, 0.26];
      tube(mb, [0.3, -0.12, 0.0], D, 0.14, 0.1, '#2a2a30', 4);
      ell(mb, D[0], D[1], D[2], 0.12, 0.11, 0.14, '#2a2a30', 5, 3);
      mb.frustum(D[0] + 0.02, D[1] - 0.03, D[2] + 0.14, 0.14, 0.1, 0.1, 0.07, 0.16, '#34343c');
      ball(mb, [D[0] + 0.08, D[1] + 0.05, D[2] + 0.1], 0.018, '#e02020', 5, 3);
      teeth(mb, [D[0] - 0.02, D[1] - 0.06, D[2] + 0.26], [D[0] + 0.1, D[1] - 0.06, D[2] + 0.24], 4, 0.05, [0, -1, 0], '#fff');
      for (let k = 0; k < 3; k++) spike(mb, [D[0] - 0.02 + k * 0.03, D[1] + 0.08, D[2] - 0.06 - k * 0.06], [0.4, 0.6, -1], 0.16, 0.03, '#4a4a58', 3);
    });
    // pale goat head with dark ram horns curling up and round
    att(m, 'head', mb => {
      ell(mb, 0, 0.06, 0.04, 0.13, 0.18, 0.15, H, 6, 4);
      ell(mb, 0, -0.06, 0.14, 0.08, 0.1, 0.1, sh(H, -0.06), 5, 3);                            // muzzle
      LR(s => {
        ball(mb, [s * 0.07, 0.08, 0.13], 0.018, '#e02020', 5, 3);
        mb.sweep(mb.curvePts([[s * 0.08, 0.18, -0.02], [s * 0.24, 0.34, -0.1], [s * 0.4, 0.28, -0.02], [s * 0.42, 0.12, 0.1], [s * 0.32, 0.04, 0.16]], 1),
          [0.06, 0.058, 0.055, 0.05, 0.045, 0.04, 0.034, 0.026, 0.01], { sides: 4, color: HD });
      });
    });
    att(m, 'jaw', mb => mb.box(0, -0.05, 0.08, 0.1, 0.03, 0.12, sh(H, -0.15)));
    // snake tail curling round its right side, head rising at the front
    att(m, 'tail', mb => {
      const pts = mb.curvePts([[0, 0, 0], [-0.3, -0.2, -0.4], [-0.78, 0.0, -0.3], [-0.95, 0.42, 0.18], [-0.82, 0.8, 0.55]], 1), n = pts.length;
      mb.sweep(pts, pts.map((p, i) => 0.12 - i * 0.006), { sides: 4, color: Sn, colors: (k) => k < 2 ? TD : Sn });
      const hd = pts[n - 1];
      ell(mb, hd[0] + 0.02, hd[1] + 0.04, hd[2] + 0.1, 0.09, 0.07, 0.15, Sn, 5, 3);
      ell(mb, hd[0] + 0.02, hd[1] - 0.02, hd[2] + 0.16, 0.07, 0.03, 0.11, '#c02020', 5, 3);
      LR(s => ball(mb, [hd[0] + 0.02 + s * 0.05, hd[1] + 0.09, hd[2] + 0.16], 0.016, '#f0e020'));
      teeth(mb, [hd[0] - 0.03, hd[1] + 0.01, hd[2] + 0.24], [hd[0] + 0.07, hd[1] + 0.01, hd[2] + 0.24], 3, 0.04, [0, -1, 0], '#fff');
    });
    // big pale grey-brown feathered wings (solid fans of broad feathers)
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const E = [s * 0.4, 0.38, -0.2], Wr = [s * 0.95, 0.72, -0.34];
      tube(mb, [0, 0, 0], E, 0.08, 0.06, TD, 4); tube(mb, E, Wr, 0.06, 0.04, TD, 4);
      for (let i = 0; i < 11; i++) {
        const t = i / 10, d = [s * (0.15 + t * 0.7), -1 + t * 0.7, -0.45];
        mb.blade(lerp3([s * 0.08, 0.02, -0.1], Wr, t), d, 0.5 + 0.35 * S(t * PI), 0.24, 0.04, i % 2 ? W : sh(W, -0.08), V.cross(d, [0, 0, 1]), WT);   // broad feathers laid flat in the wing plane
      }
    }));
    // forelegs: massive arms with clawed paws, both raised off the ground
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      const el = s > 0 ? [s * 0.14, -0.45, 0.16] : [s * 0.1, -0.36, 0.26], pw = s > 0 ? [s * 0.2, -0.72, 0.58] : [s * 0.06, -0.14, 0.58];
      ball(mb, [0, 0, 0], 0.2, TL, 5, 4);
      tube(mb, [0, 0, 0], el, 0.18, 0.14, TL, 5); ball(mb, el, 0.14, T, 5, 3);
      tube(mb, el, pw, 0.15, 0.11, T, 5);
      ell(mb, pw[0], pw[1], pw[2] + 0.05, 0.14, 0.12, 0.15, TL, 5, 3);
      for (let k = -1; k <= 1; k++) spike(mb, [pw[0] + k * 0.07, pw[1] - 0.04, pw[2] + 0.17], [k * 0.2, -0.4, 1], 0.12, 0.035, '#4a5a78', 3);
    }));
    // thick hind legs on taloned bird feet
    LR(s => att(m, s > 0 ? 'legBL' : 'legBR', mb => {
      const kn = [s * 0.05, -0.42, 0.26], an = [s * 0.05, -0.8, -0.1];
      ell(mb, 0, -0.06, 0.04, 0.24, 0.3, 0.3, T, 5, 4);
      tube(mb, [0, -0.1, 0.06], kn, 0.2, 0.15, T, 5); ball(mb, kn, 0.15, TL, 5, 3);
      tube(mb, kn, an, 0.14, 0.1, T, 5);
      for (let k = -1; k <= 1; k++) { const t = [an[0] + k * 0.12, -0.92, an[2] + 0.28]; tube(mb, an, t, 0.07, 0.05, Tal, 4); spike(mb, t, [k * 0.2, -0.3, 1], 0.1, 0.03, '#303030', 3); }
      tube(mb, an, [an[0], -0.92, an[2] - 0.18], 0.06, 0.04, Tal, 4);
    }));
    m.height = 2.55; m.lungeScale = 0.9;
    return m;
  });

  // ---- Grand Horn: hulking olive hunchback, torso pitched forward under huge spiky green shoulder plates, the horned
  // green head sunk between them, massive spiked forearms hanging to the knees, thick bent legs with bone spikes
  def('grand_horn', (a) => {
    const m = rig(a);
    const O = '#8a7a28', OL = '#a89838', OD = '#6a5a1c', G = '#5a8a2a', GD = '#3e6a1c', B = '#e8e0e8';
    const P = 0.35;
    m.bone('body', 'root', [0, 1.08, -0.05], [P, 0, 0]);
    m.bone('head', 'body', [0, 0.66, 0.26], [-P + 0.1, 0, 0]);
    m.bone('jaw', 'head', [0, -0.05, 0.12]);
    m.bone('armL', 'body', [0.56, 0.5, 0.04], [-P, 0, 0]); m.bone('armR', 'body', [-0.56, 0.5, 0.04], [-P, 0, 0]);
    m.bone('legFL', 'root', [0.26, 1.0, -0.1]); m.bone('legFR', 'root', [-0.26, 1.0, -0.1]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.2, rx: 0.32, rz: 0.26 }, { y: 0.1, rx: 0.4, rz: 0.32 }, { y: 0.42, rx: 0.58, rz: 0.4, color: OL }, { y: 0.62, rx: 0.54, rz: 0.37 }, { y: 0.76, rx: 0.26, rz: 0.22 }], { sides: 8, color: O, smooth: false });
      ell(mb, 0, 0.3, 0.26, 0.3, 0.24, 0.14, OL, 6, 3);                                       // chest
      ell(mb, 0, -0.02, 0.2, 0.26, 0.2, 0.12, OD, 6, 3);                                      // belly
      LR(s => {
        // huge green shoulder plates rising past the head
        mb.blade([s * 0.42, 0.62, -0.02], [s * 0.35, 1, -0.15], 0.72, 0.5, 0.14, G, [1, -s * 0.35, 0], GD);
        mb.blade([s * 0.5, 0.56, -0.12], [s * 0.9, 0.55, -0.45], 0.55, 0.4, 0.1, GD, [-s * 0.55, 0.9, 0], G);
        for (let i = 0; i < 3; i++) spike(mb, [s * (0.3 + i * 0.08), 0.5 - i * 0.12, -0.2 - i * 0.04], [s * 0.5, 0.5, -1], 0.26, 0.06, B, 4);
      });
      for (let i = 0; i < 4; i++) spike(mb, [0, 0.6 - i * 0.18, -0.34], [0, 0.4, -1], 0.24, 0.06, B, 4);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.06, 0.06, 0.19, 0.17, 0.19, G, 7, 4);
      mb.frustum(0, -0.03, 0.2, 0.2, 0.15, 0.12, 0.1, 0.12, G);
      LR(s => { limb(mb, [[s * 0.12, 0.16, 0], [s * 0.27, 0.34, -0.02], [s * 0.32, 0.56, 0.05], [s * 0.26, 0.7, 0.12]], [0.07, 0.06, 0.04, 0.006], B, 5); ball(mb, [s * 0.08, 0.12, 0.22], 0.022, '#f0e040', 5, 3); });
      mb.blade([0, 0.2, 0.2], [0, -0.5, 1], 0.12, 0.2, 0.06, GD);                             // brow
      ell(mb, 0, -0.01, 0.25, 0.09, 0.06, 0.05, '#b02070', 5, 3);                              // pink maw
    });
    att(m, 'jaw', mb => { mb.box(0, -0.05, 0.12, 0.18, 0.06, 0.17, G); teeth(mb, [-0.06, -0.02, 0.2], [0.06, -0.02, 0.2], 3, 0.05, [0, 1, 0], B); });
    // arms hang from broad shoulders to huge spiked forearms and fists at knee height
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      const el = [s * 0.22, -0.42, -0.02], wr = [s * 0.2, -0.86, 0.3];
      ball(mb, [0, 0, 0], 0.22, O, 6, 4);
      tube(mb, [0, 0, 0], el, 0.19, 0.16, O, 6); ball(mb, el, 0.16, OL, 6, 3);
      mb.sweep([el, lerp3(el, wr, 0.4), wr], [0.17, 0.24, 0.16], { sides: 7, color: OL });
      ell(mb, wr[0], wr[1] - 0.08, wr[2] + 0.06, 0.17, 0.15, 0.17, O, 6, 3);
      for (let k = 0; k < 3; k++) spike(mb, [wr[0] + s * (k - 1) * 0.07, wr[1] - 0.14, wr[2] + 0.2], [s * 0.1 * (k - 1), -0.5, 1], 0.18, 0.04, B, 3);
      spike(mb, lerp3(el, wr, 0.35), [s * 0.6, 0.1, -0.8], 0.3, 0.07, B, 4);
      spike(mb, lerp3(el, wr, 0.6), [s * 1, -0.1, 0.1], 0.26, 0.06, B, 4);
      spike(mb, el, [s * 0.3, 0.2, -1], 0.24, 0.06, B, 4);
    }));
    // thick bent legs, spiked knees and clawed feet
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      const kn = [s * 0.08, -0.46, 0.24], an = [s * 0.1, -0.9, 0.0];
      tube(mb, [0, 0, 0], kn, 0.23, 0.18, O, 6); ball(mb, kn, 0.18, OL, 6, 3);
      tube(mb, kn, an, 0.18, 0.13, O, 6);
      mb.rbox(an[0], -0.96, 0.1, 0.26, 0.14, 0.38, OL, 0.3);
      for (let k = -1; k <= 1; k++) spike(mb, [an[0] + k * 0.08, -0.98, 0.28], [k * 0.3, -0.2, 1], 0.16, 0.04, B, 3);
      spike(mb, V.add(kn, [0, 0, 0.1]), [s * 0.2, 0.1, 1], 0.26, 0.07, B, 4);
      spike(mb, [an[0], -0.8, -0.05], [s * 0.4, 0, -1], 0.2, 0.05, B, 4);
    }));
    m.height = 2.4; m.lungeScale = 0.8;
    return m;
  });

  // Gagighandi / Under Lizard: squatting finned lizard with a long tail raised behind
  function sitLizard(a, o) {
    const m = rig(a);
    const B = o.body, BL = o.belly, F = o.fin;
    m.bone('body', 'root', [0, 0.1, 0]);
    m.bone('head', 'body', [0, 0.95, 0.12]);
    m.bone('jaw', 'head', [0, -0.03, 0.12]);
    m.bone('tail', 'body', [0, 0.1, -0.3]);
    m.bone('armL', 'body', [0.16, 0.62, 0.15]); m.bone('armR', 'body', [-0.16, 0.62, 0.15]);
    m.bone('legFL', 'body', [0.22, 0.2, 0.02]); m.bone('legFR', 'body', [-0.22, 0.2, 0.02]);
    att(m, 'body', mb => {
      mb.loft([{ y: 0.0, rx: 0.3, rz: 0.26 }, { y: 0.25, rx: 0.36, rz: 0.32 }, { y: 0.55, rx: 0.26, rz: 0.24, z: 0.03 }, { y: 0.8, rx: 0.14, rz: 0.14, z: 0.08 }, { y: 0.98, rx: 0.1, rz: 0.1, z: 0.1 }], { sides: 8, color: B });
      mb.loft([{ y: 0.05, rx: 0.2, rz: 0.1, z: 0.2 }, { y: 0.45, rx: 0.18, rz: 0.1, z: 0.2 }, { y: 0.8, rx: 0.08, rz: 0.06, z: 0.14 }], { sides: 6, color: BL });
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0.04, 0.12, 0.11, 0.14, B, 7, 5);
      mb.frustum(0, -0.02, 0.14, 0.14, 0.1, 0.09, 0.07, 0.08, B);
      LR(s => {
        eye(mb, s * 0.07, 0.08, 0.12, 0.018, '#f0e060', '#201000');
        tri2(mb, [s * 0.1, 0.06, 0.0], [s * 0.3, 0.2, -0.04], [s * 0.26, -0.05, -0.06], F, sh(F, -0.2));
        tri2(mb, [s * 0.1, 0.06, 0.0], [s * 0.34, 0.08, -0.08], [s * 0.26, -0.05, -0.06], sh(F, 0.1), sh(F, -0.2));
        spike(mb, [s * 0.04, 0.13, -0.02], [s * 0.1, 1, -0.4], 0.2, 0.02, '#f0f0f0', 4);
      });
    });
    att(m, 'jaw', mb => mb.box(0, -0.03, 0.08, 0.12, 0.03, 0.14, BL));
    att(m, 'tail', mb => limb(mb, [[0, 0, 0], [0, 0.25, -0.35], [0, 0.75, -0.6], [0, 1.3, -0.72], [0, 1.65, -0.7]], [0.12, 0.09, 0.06, 0.035, 0.008], [B, B, o.tail || B], 6));
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => { limb(mb, [[0, 0, 0], [s * 0.06, -0.14, 0.1], [s * 0.04, -0.2, 0.2]], [0.04, 0.035, 0.03], B, 5); for (let k = -1; k <= 1; k++) spike(mb, [s * 0.04, -0.2, 0.2], [k * 0.3, -0.5, 1], 0.05, 0.01, '#f0f0f0', 3); }));
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      ell(mb, s * 0.06, 0.02, 0.05, 0.14, 0.2, 0.22, B, 7, 5);
      limb(mb, [[s * 0.08, -0.05, 0.1], [s * 0.1, -0.2, 0.28]], [0.07, 0.05], B, 5);
      mb.rbox(s * 0.1, -0.24, 0.35, 0.12, 0.06, 0.24, B, 0.3);
      for (let k = -1; k <= 1; k++) spike(mb, [s * 0.1 + k * 0.04, -0.25, 0.46], [k * 0.3, -0.2, 1], 0.06, 0.015, '#f0e8d8', 3);
    }));
    m.height = 1.3; m.lungeScale = 0.9;
    return m;
  }
  def('gagighandi', (a) => sitLizard(a, { body: '#30b898', belly: '#60e0c0', fin: '#c090d8' }));
  def('under_lizard', (a) => sitLizard(a, { body: '#d07820', belly: '#e8a040', fin: '#9090d8', tail: '#b03020' }));

  // Touch Me / Toxic Frog: upright frog with big eyes, pale belly and coloured limbs
  function frog(a, o) {
    const m = rig(a);
    m.bone('body', 'root', [0, 0.3, 0], [0.05, 0, 0]);
    m.bone('head', 'body', [0, 0.28, 0.02]);
    m.bone('jaw', 'head', [0, -0.01, 0.06]);
    m.bone('armL', 'body', [0.12, 0.2, 0.05], [0, 0, 0.5]); m.bone('armR', 'body', [-0.12, 0.2, 0.05], [0, 0, -0.5]);
    m.bone('legFL', 'body', [0.12, -0.05, -0.02]); m.bone('legFR', 'body', [-0.12, -0.05, -0.02]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.1, rx: 0.1, rz: 0.1 }, { y: 0.0, rx: 0.17, rz: 0.15 }, { y: 0.14, rx: 0.16, rz: 0.13 }, { y: 0.3, rx: 0.13, rz: 0.11 }], { sides: 8, color: o.body });
      ell(mb, 0, 0.06, 0.07, 0.12, 0.15, 0.08, o.belly, 7, 5);
      mb.loft([{ y: -0.02, rx: 0.05, rz: 0.04, z: -0.12 }, { y: 0.28, rx: 0.05, rz: 0.04, z: -0.1 }], { sides: 5, color: o.limb });
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0.02, 0.15, 0.1, 0.13, o.body, 8, 5);
      LR(s => { ell(mb, s * 0.08, 0.1, 0.04, 0.05, 0.05, 0.05, o.limb, 6, 4); eye(mb, s * 0.085, 0.11, 0.08, 0.025, '#e8e8f0', '#1a2a8a'); });
    });
    att(m, 'jaw', mb => { ell(mb, 0, -0.02, 0.0, 0.13, 0.035, 0.1, o.belly, 8, 4); mb.box(0, 0.0, 0.08, 0.16, 0.008, 0.02, '#302030'); });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => { limb(mb, [[0, 0, 0], [s * 0.08, 0.1, 0.02], [s * 0.1, 0.22, 0.05]], [0.035, 0.03, 0.025], o.limb, 5); for (let k = -1; k <= 1; k++) spike(mb, [s * 0.1, 0.22, 0.05], [k * 0.4 + s * 0.2, 1, 0], 0.05, 0.012, o.limb, 3); }));
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.1, -0.02, 0.1], [s * 0.1, -0.24, 0.02]], [0.06, 0.045, 0.035], o.limb, 5);
      mb.box(s * 0.12, -0.24, 0.08, 0.1, 0.02, 0.16, o.limb);
    }));
    m.height = 0.7; m.lungeScale = 1.1;
    return m;
  }
  def('touch_me', (a) => frog(a, { body: '#70c4b8', belly: '#a8e0d0', limb: '#e0b020' }));
  def('toxic_frog', (a) => frog(a, { body: '#9a88c0', belly: '#c8b8e0', limb: '#d8c870' }));

  // ================================================================== Gongaga / Cosmo area

  // Kimara Bug: long-legged green mantis-fly with orange wings and yellow compound eyes
  def('kimara_bug', (a) => {
    const m = rig(a);
    const G = '#5a9a28', GD = '#3a6a1a', O = 'rgba(230,140,40,0.85)';
    m.bone('body', 'root', [0, 0.95, 0], [-0.5, 0, 0]);
    m.bone('head', 'body', [0, 0.36, 0.05]);
    m.bone('wingL', 'body', [0.06, 0.25, -0.06]); m.bone('wingR', 'body', [-0.06, 0.25, -0.06]);
    m.bone('armL', 'body', [0.08, 0.26, 0.08]); m.bone('armR', 'body', [-0.08, 0.26, 0.08]);
    [['legFL', 1, 0.12], ['legFR', -1, 0.12], ['legBL', 1, -0.05], ['legBR', -1, -0.05]].forEach(([n, sx, y]) => m.bone(n, 'body', [sx * 0.08, y, 0]));
    att(m, 'body', mb => {
      mb.loft([{ y: -0.45, rx: 0.04, rz: 0.04 }, { y: -0.3, rx: 0.1, rz: 0.1 }, { y: -0.05, rx: 0.12, rz: 0.11 }, { y: 0.05, rx: 0.08, rz: 0.08 }, { y: 0.15, rx: 0.1, rz: 0.1 }, { y: 0.3, rx: 0.08, rz: 0.08 }],
        { sides: 7, color: G });
      for (let i = 0; i < 3; i++) mb.loft([{ y: -0.28 + i * 0.1, rx: 0.115, rz: 0.105 }, { y: -0.25 + i * 0.1, rx: 0.115, rz: 0.105 }], { sides: 7, color: '#7a3a60', capTop: false, capBottom: false });
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0.03, 0.08, 0.08, 0.08, G, 7, 5);
      LR(s => { ell(mb, s * 0.07, 0.07, 0.06, 0.05, 0.05, 0.05, '#e0c020', 6, 4); ball(mb, [s * 0.05, 0.1, 0.1], 0.02, '#c02020'); });
      tube(mb, [0, 0.0, 0.08], [0.02, -0.12, 0.2], 0.025, 0.006, '#e8e0d0', 5);
      LR(s => limb(mb, [[s * 0.03, 0.1, 0.02], [s * 0.12, 0.32, 0.0], [s * 0.2, 0.4, -0.08]], [0.012, 0.008, 0.004], GD, 3));
    });
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      poly2(mb, [[0, 0, 0], [s * 0.35, 0.15, -0.2], [s * 0.75, 0.05, -0.4], [s * 0.5, -0.12, -0.45], [s * 0.12, -0.08, -0.15]], O, 'rgba(180,90,30,0.85)');
    }), null);
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => { limb(mb, [[0, 0, 0], [s * 0.1, 0.15, 0.15], [s * 0.12, -0.05, 0.3]], [0.025, 0.02, 0.012], G, 5); spike(mb, [s * 0.12, -0.05, 0.3], [0, -1, 0.3], 0.08, 0.01, GD, 3); }));
    [['legFL', 1, 1], ['legFR', -1, 1], ['legBL', 1, -1], ['legBR', -1, -1]].forEach(([n, sx, sz]) => att(m, n, mb => {
      limb(mb, [[0, 0, 0], [sx * 0.4, 0.2, sz * 0.05 + 0.1], [sx * 0.6, -0.55, sz * 0.25 - 0.15]], [0.025, 0.02, 0.008], [G, GD], 4);
    }));
    m.height = 1.45; m.lungeScale = 0.9;
    return m;
  });

  // Flower Prong: grows from a bud (a) to a bulb on a stalk (b) to a spiked, eye-stalked flower (c)
  def('flower_prong', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 0, 0]); m.bone('head', 'body', [0, 0.16, 0.02]);
    att(m, 'body', mb => {
      mb.loft([{ y: 0, rx: 0.3, rz: 0.28 }, { y: 0.05, rx: 0.2, rz: 0.19 }, { y: 0.08, rx: 0.1, rz: 0.1 }], { sides: 9, color: '#6a4a2a' });
      for (let i = 0; i < 6; i++) { const an = i / 6 * PI * 2; mb.blade([C(an) * 0.05, 0.07, S(an) * 0.05], [C(an), 0.35, S(an)], 0.24, 0.1, 0.02, '#3a9a2a', null, '#8ac040'); }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.06, 0, 0.1, 0.09, 0.1, '#6ab830', 8, 5);
      LR(s => { ell(mb, s * 0.05, 0.12, 0.05, 0.03, 0.03, 0.03, '#c0e040', 6, 3); ball(mb, [s * 0.05, 0.13, 0.075], 0.012, '#c02020'); });
      tube(mb, [0, 0.14, -0.02], [0.02, 0.4, -0.06], 0.012, 0.004, '#e070b0', 4);
    });
    m.height = 0.55; m.lungeScale = 0.3;
    return m;
  });
  function prongStalk(mb, h, n) {
    for (let k = 0; k < n; k++) {
      const y = k * h / n, r = 0.06 - k * 0.004;
      mb.loft([{ y, rx: r * 0.7, rz: r * 0.7 }, { y: y + h / n * 0.5, rx: r * 1.3, rz: r * 1.3 }, { y: y + h / n, rx: r * 0.7, rz: r * 0.7 }], { sides: 7, color: k % 2 ? '#d04020' : '#e87030' });
    }
  }
  def('flower_prong_b', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 0, 0]); m.bone('head', 'body', [0, 0.9, 0]);
    att(m, 'body', mb => {
      mb.loft([{ y: 0, rx: 0.4, rz: 0.36 }, { y: 0.06, rx: 0.28, rz: 0.25 }, { y: 0.1, rx: 0.12, rz: 0.12 }], { sides: 9, color: '#6a4a2a' });
      prongStalk(mb, 0.9, 5);
      LR(s => { tri2(mb, [0, 0.62, 0], [s * 0.35, 0.72, 0.1], [s * 0.3, 0.55, -0.05], '#5a7a20', '#3a5a10'); tri2(mb, [0, 0.62, 0], [s * 0.25, 0.7, -0.25], [s * 0.1, 0.55, -0.2], '#6a8a28', '#3a5a10'); });
    });
    att(m, 'head', mb => {
      mb.loft([{ y: 0, rx: 0.06, rz: 0.06 }, { y: 0.12, rx: 0.17, rz: 0.16 }, { y: 0.26, rx: 0.16, rz: 0.15 }, { y: 0.4, rx: 0.08, rz: 0.08 }, { y: 0.46, rx: 0.02, rz: 0.02 }], { sides: 8, color: '#d8e870' });
      for (let i = 0; i < 4; i++) { const an = i / 4 * PI * 2 + 0.4; tri2(mb, [C(an) * 0.05, 0.05, S(an) * 0.05], [C(an) * 0.22, 0.2, S(an) * 0.22], [C(an + 0.8) * 0.15, 0.12, S(an + 0.8) * 0.15], '#a8c040', '#6a8a20'); }
      limb(mb, [[0, 0.44, 0], [0.02, 0.6, 0.0], [0.05, 0.72, -0.04]], [0.02, 0.014, 0.006], '#e078b8', 4);
    });
    m.height = 1.55; m.lungeScale = 0.3;
    return m;
  });
  def('flower_prong_c', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 0, 0]); m.bone('head', 'body', [0, 1.1, 0]);
    m.bone('armL', 'head', [0.25, 0.4, 0]); m.bone('armR', 'head', [-0.25, 0.4, 0]);
    att(m, 'body', mb => {
      mb.loft([{ y: 0, rx: 0.55, rz: 0.5 }, { y: 0.07, rx: 0.4, rz: 0.36 }, { y: 0.12, rx: 0.16, rz: 0.16 }], { sides: 9, color: '#6a4a2a' });
      prongStalk(mb, 0.7, 4);
      // drooping dark leaf skirt
      for (let i = 0; i < 7; i++) { const an = i / 7 * PI * 2; tri2(mb, [C(an) * 0.08, 1.02, S(an) * 0.08], [C(an + 0.35) * 0.5, 0.5, S(an + 0.35) * 0.5], [C(an - 0.35) * 0.5, 0.5, S(an - 0.35) * 0.5], '#5a6a20', '#3a4a10'); }
      mb.loft([{ y: 0.7, rx: 0.1, rz: 0.1 }, { y: 1.1, rx: 0.08, rz: 0.08 }], { sides: 7, color: '#c8d040' });
      for (let k = 0; k < 4; k++) mb.loft([{ y: 0.75 + k * 0.09, rx: 0.1, rz: 0.1 }, { y: 0.79 + k * 0.09, rx: 0.12, rz: 0.12 }, { y: 0.83 + k * 0.09, rx: 0.1, rz: 0.1 }], { sides: 7, color: '#d8e050' });
    });
    att(m, 'head', mb => {
      mb.loft([{ y: 0, rx: 0.1, rz: 0.1 }, { y: 0.15, rx: 0.3, rz: 0.28 }, { y: 0.4, rx: 0.36, rz: 0.34 }, { y: 0.62, rx: 0.26, rz: 0.24 }, { y: 0.76, rx: 0.06, rz: 0.06 }], { sides: 9, color: '#b8d040' });
      for (let j = 0; j < 4; j++) for (let i = 0; i < 7; i++) {
        const an = (i + j * 0.5) / 7 * PI * 2, y = 0.15 + j * 0.15, r = [0.3, 0.35, 0.34, 0.26][j];
        spike(mb, [C(an) * r, y, S(an) * r], [C(an), 0.2, S(an)], 0.09, 0.03, '#c02020', 3);
      }
    });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.25, 0.3, 0.05], [s * 0.55, 0.32, 0.1], [s * 0.65, 0.12, 0.15]], [0.035, 0.03, 0.025, 0.02], '#b8b050', 5);
      ell(mb, s * 0.66, 0.05, 0.16, 0.07, 0.07, 0.07, '#e8a0b0', 7, 5);
      ball(mb, [s * 0.66, 0.02, 0.22], 0.025, '#802040');
    }));
    m.height = 2.1; m.lungeScale = 0.3;
    return m;
  });

  // Heavy Tank: green horned brute riding a huge grey roller drum
  def('heavy_tank', (a) => {
    const m = rig(a);
    const G = '#1e7a5a', GL = '#2e9a72', GD = '#145a40', D = '#4a4e6a';
    m.bone('body', 'root', [0, 0.95, -0.15]);
    m.bone('head', 'body', [0, 0.72, 0.2]);
    m.bone('jaw', 'head', [0, -0.05, 0.12]);
    m.bone('armL', 'body', [0.52, 0.5, 0.1]); m.bone('armR', 'body', [-0.52, 0.5, 0.1]);
    att(m, 'root', mb => {
      // roller drum
      mb.push(); mb.translate(0, 0.42, 0.25); mb.rotate(0, 0, PI / 2);
      mb.loft([{ y: -0.95, rx: 0.36, rz: 0.36 }, { y: -0.85, rx: 0.42, rz: 0.42 }, { y: 0.85, rx: 0.42, rz: 0.42 }, { y: 0.95, rx: 0.36, rz: 0.36 }], { sides: 10, color: D });
      disc(mb, [0, -0.96, 0], [0, -1, 0], 0.28, 0.28, '#b0582a', 8); disc(mb, [0, 0.96, 0], [0, 1, 0], 0.28, 0.28, '#b0582a', 8);
      mb.pop();
      mb.box(0, 0.42, 0.68, 0.24, 0.2, 0.04, '#2aa8a0'); mb.box(0, 0.42, 0.7, 0.14, 0.12, 0.02, '#c04818');
      LR(s => { spike(mb, [s * 0.2, 0.12, 0.6], [s * 0.3, -0.2, 1], 0.14, 0.05, '#e0c020', 3); spike(mb, [s * 0.1, 0.1, 0.62], [0, -0.3, 1], 0.12, 0.05, '#c03020', 3); });
    });
    att(m, 'body', mb => {
      mb.loft([{ y: -0.2, rx: 0.36, rz: 0.3 }, { y: 0.2, rx: 0.48, rz: 0.36 }, { y: 0.55, rx: 0.56, rz: 0.4 }, { y: 0.78, rx: 0.3, rz: 0.26 }], { sides: 9, color: G, smooth: false });
      for (let i = 0; i < 8; i++) { const an = PI * (0.15 + 0.7 * i / 7); mb.blade([C(an) * 0.4, 0.6, -0.1 - S(an) * 0.1], [C(an), 0.9, -0.6], 0.35, 0.2, 0.06, i % 2 ? G : GL); }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.05, 0.05, 0.2, 0.17, 0.2, GL, 8, 5);
      LR(s => { limb(mb, [[s * 0.12, 0.12, 0.05], [s * 0.25, 0.3, 0.12], [s * 0.24, 0.42, 0.25]], [0.06, 0.05, 0.01], '#e8e8e0', 5); eye(mb, s * 0.08, 0.08, 0.2, 0.02, '#f0d020', '#200000'); });
    });
    att(m, 'jaw', mb => { mb.box(0, -0.04, 0.1, 0.2, 0.06, 0.16, GD); disc(mb, [0, 0.0, 0.17], [0, 0.3, 1], 0.07, 0.04, '#e03030', 6); });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.18, -0.35, 0.25], [s * 0.1, -0.5, 0.55]], [0.16, 0.13, 0.11], [G, GL], 7);
      ell(mb, s * 0.1, -0.55, 0.62, 0.13, 0.1, 0.13, G, 6, 4);
      for (let k = -1; k <= 1; k++) spike(mb, [s * 0.1 + k * 0.06, -0.62, 0.72], [k * 0.2, -0.8, 0.5], 0.1, 0.025, '#d8e8d8', 3);
    }));
    m.height = 2.0; m.lungeScale = 0.6;
    return m;
  });

  // Crown Lance: violet jellyfish trailing long pink tentacles
  def('crown_lance', (a) => {
    const m = rig(a); m.floats = true;
    const P = '#5a2a8a', PL = '#8a50c0', T = '#b86898';
    m.bone('body', 'root', [0, 1.55, 0]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.1, rx: 0.2, rz: 0.2 }, { y: -0.02, rx: 0.26, rz: 0.26 }, { y: 0.14, rx: 0.24, rz: 0.24 }, { y: 0.3, rx: 0.15, rz: 0.15 }, { y: 0.38, rx: 0.04, rz: 0.04 }], { sides: 10, color: P });
      for (let i = 0; i < 5; i++) { const an = i / 5 * PI * 2; mb.blade([C(an) * 0.22, 0.02, S(an) * 0.22], [C(an) * 0.3, 1, S(an) * 0.3], 0.22, 0.08, 0.03, PL, { radial: [0, 0.1, 0] }, '#e0a0ff'); }
      for (let i = 0; i < 12; i++) { const an = i / 12 * PI * 2; tube(mb, [C(an) * 0.18, -0.08, S(an) * 0.18], [C(an) * 0.34, -0.35, S(an) * 0.34], 0.006, 0.002, '#9070a0', 3); }
    });
    for (let i = 0; i < 5; i++) {
      const an = i / 5 * PI * 2 + 0.3;
      m.bone('t' + i, 'body', [C(an) * 0.08, -0.1, S(an) * 0.08], [0.12 * S(an), 0, -0.12 * C(an)]);
      att(m, 't' + i, mb => limb(mb, [[0, 0, 0], [C(an) * 0.08, -0.5, S(an) * 0.08], [C(an) * 0.12, -1.0, S(an) * 0.12], [C(an) * 0.1, -1.42, S(an) * 0.1]], [0.03, 0.025, 0.018, 0.006], T, 4));
    }
    m.height = 1.95; m.lungeScale = 1.0;
    return m;
  });

  // ---- Skeeskee (and its cousin Shake): navy penguin-bird with a peach lower belly, a white bib painted with a kanji
  // (Shake: checkers), a big fan of red crest blades with green frills behind it, and spread feathered wing-arms
  function crestBird(a, o) {
    const m = rig(a);
    m.bone('body', 'root', [0, 0.62, 0]);
    m.bone('head', 'body', [0, 0.4, 0.08]);
    m.bone('jaw', 'head', [0, 0.0, 0.12]);
    m.bone('wingL', 'body', [0.26, 0.2, 0]); m.bone('wingR', 'body', [-0.26, 0.2, 0]);
    m.bone('legFL', 'body', [0.12, -0.3, 0.02]); m.bone('legFR', 'body', [-0.12, -0.3, 0.02]);
    m.bone('tail', 'body', [0, -0.2, -0.25]);
    att(m, 'body', mb => {
      ell(mb, 0, 0, 0, 0.3, 0.38, 0.27, o.body, 9, 6, (i, j) => j > 3 ? (i % 3 ? o.belly : o.body) : o.body);
      // white bib with a black kanji
      mb.loft([{ y: -0.26, rx: 0.2, rz: 0.08, z: 0.19 }, { y: 0.0, rx: 0.23, rz: 0.09, z: 0.23 }, { y: 0.22, rx: 0.16, rz: 0.07, z: 0.2 }], { sides: 8, color: o.bib });
      const k = '#101010', z = 0.33;
      if (o.check) { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) mb.box(-0.09 + i * 0.06, 0.1 - j * 0.07, z - Math.abs(j - 1.5) * 0.01, 0.055, 0.06, 0.01, '#1a2a6a'); } else {
      // 怒 ("rage"): 奴 over 心 as brush strokes on the curved bib (stroke ends in a 32x32 grid)
      const P = (u, v) => [-0.13 + u / 32 * 0.26, 0.13 - v / 32 * 0.3], zAt = (x, y) => z - 0.005 - 0.6 * (x * x + y * y);
      const stroke = (u0, v0, u1, v1) => { const a0 = P(u0, v0), a1 = P(u1, v1), mx = (a0[0] + a1[0]) / 2, my = (a0[1] + a1[1]) / 2;
        mb.push(); mb.translate(mx, my, zAt(mx, my)); mb.rotate(0, 0, Math.atan2(a1[1] - a0[1], a1[0] - a0[0])); mb.box(0, 0, 0, Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) + 0.012, 0.02, 0.01, k); mb.pop(); };
      [[6, 3, 13, 14], [12, 4, 6, 13], [4, 8, 15, 8], [17, 4, 27, 4], [26, 4, 18, 14], [19, 7, 28, 14], [7, 20, 9, 27], [9, 27, 15, 28], [15, 28, 22, 28], [22, 28, 24, 24],
        [4, 22, 6, 26], [14, 18, 16, 22], [25, 18, 28, 23]].forEach(q => stroke(...q)); }
      for (let i = 0; i < 6; i++) { const an = PI * (0.25 + 0.5 * i / 5); spike(mb, [C(an) * 0.24, -0.3, S(an) * 0.2], [C(an) * 0.5, -0.6, S(an)], 0.12, 0.05, o.bib, 3); }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.06, 0, 0.17, 0.15, 0.16, o.body, 8, 5);
      LR(s => { eye(mb, s * 0.08, 0.1, 0.12, 0.03, '#f8f8f8', '#101040'); mb.blade([s * 0.03, 0.15, 0.13], [s, 0.4, 0.2], 0.1, 0.03, 0.015, '#c02020'); });
      mb.push(); mb.translate(0, 0.04, 0.14); mb.rotate(PI / 2 - 0.2, 0, 0); mb.prism(0, 0, 0, 0.06, 0, 0.16, 4, o.beak); mb.pop();
      // tall fan of broad red crest blades (orange tips), green frills sweeping back behind it
      for (let i = 0; i < 9; i++) { const an = -0.85 + i * 0.2125, d = [S(an) * 0.7, 1, -0.25]; mb.blade([S(an) * 0.05, 0.16, 0.0], d, 0.4 + (1 - Math.abs(an)) * 0.18, 0.13, 0.04, i % 2 ? o.crest : sh(o.crest, -0.15), [C(an), -S(an) * 0.7, 0], o.crestTip || '#f06020'); }
      LR(s => { for (let k = 0; k < 2; k++) { const d = [s * (0.8 + k * 0.3), 0.75 - k * 0.3, -0.6]; mb.blade([s * 0.08, 0.12 - k * 0.05, -0.08], d, 0.36 - k * 0.06, 0.15, 0.03, o.frill, [0, 1, 0.5], '#a0e040'); } });
    });
    att(m, 'jaw', mb => { mb.push(); mb.translate(0, 0.02, 0.0); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0, 0, 0.04, 0, 0.12, 4, sh(o.beak, -0.2)); mb.pop(); });
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      for (let i = 0; i < 5; i++) { const d = [s * (0.7 + i * 0.05), -0.45 - i * 0.12, 0.1]; mb.blade([0, -i * 0.05, 0.05 - i * 0.03], d, 0.38 - i * 0.03, 0.14, 0.03, i % 2 ? o.body : sh(o.body, 0.12), [-d[1], d[0], 0], o.tip); }
    }));
    att(m, 'tail', mb => { for (let i = -2; i <= 2; i++) mb.blade([i * 0.04, 0, 0], [i * 0.4, 0.2, -1], 0.25, 0.08, 0.02, o.body, null, o.tip); });
    const leg = meshOf(mb => { limb(mb, [[0, 0, 0], [0, -0.18, 0.02], [0, -0.3, 0.02]], [0.035, 0.03, 0.025], o.feet, 5); mb.box(0, -0.31, 0.08, 0.1, 0.03, 0.16, o.feet); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 1.75; m.lungeScale = 1.1;
    return m;
  }
  def('skeeskee', (a) => crestBird(a, { body: '#1a1c3a', belly: '#e0b8a8', bib: '#f0e8f0', beak: '#e8c030', crest: '#d02020', frill: '#40b040', feet: '#e08a20', tip: '#3a3a6a' }));
  // Disc 2 (Gaea's Cliff): FF7 reuses the Skeeskee model for Headbomber - yellow body, pale blue shorts, orange beak and
  // feet, a blue crest and green side feathers
  def('headbomber', (a) => crestBird(a, { body: '#f0cc2a', belly: '#a8c8e0', bib: '#f4f4f0', beak: '#e87a20', crest: '#2a4ad0', crestTip: '#6a8af0', frill: '#40b040', feet: '#e87a20', tip: '#c8a018' }));

  // Bagrisk: green basilisk crouched on thin legs, tail curled overhead, spiral-ringed eyes
  def('bagrisk', (a) => {
    const m = rig(a);
    const G = '#2a9a3a', GD = '#1a6a28';
    m.bone('body', 'root', [0, 0.42, 0]);
    m.bone('head', 'body', [0, 0.08, 0.36]);
    m.bone('jaw', 'head', [0, -0.05, 0.08]);
    m.bone('tail', 'body', [0, 0.05, -0.3]);
    [['legFL', 1, 1], ['legFR', -1, 1], ['legBL', 1, -1], ['legBR', -1, -1]].forEach(([n, sx, sz]) => m.bone(n, 'body', [sx * 0.12, -0.02, sz * 0.2]));
    att(m, 'body', mb => ell(mb, 0, 0, 0, 0.14, 0.12, 0.34, G, 8, 5, (i, j) => j > 3 ? GD : G));
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0.03, 0.14, 0.12, 0.12, G, 8, 5);
      LR(s => {
        disc(mb, [s * 0.09, 0.09, 0.09], [s * 0.5, 0.2, 1], 0.06, 0.06, '#e8d020', 8);
        disc(mb, [s * 0.095, 0.09, 0.1], [s * 0.5, 0.2, 1], 0.042, 0.042, '#c03020', 8);
        disc(mb, [s * 0.1, 0.09, 0.105], [s * 0.5, 0.2, 1], 0.025, 0.025, '#e8d020', 6);
        tube(mb, [s * 0.05, 0.14, 0.0], [s * 0.1, 0.32, -0.04], 0.012, 0.004, '#c02020', 3);
      });
      mb.blade([0, 0.15, 0.0], [0, 1, -0.2], 0.18, 0.06, 0.02, '#d82020', null, '#f0e020');
    });
    att(m, 'jaw', mb => { mb.box(0, -0.02, 0.05, 0.14, 0.04, 0.1, '#c02030'); teeth(mb, [-0.05, 0.0, 0.1], [0.05, 0.0, 0.1], 4, 0.03, [0, 1, 0], '#fff'); });
    att(m, 'tail', mb => limb(mb, [[0, 0, 0], [0, 0.2, -0.3], [0, 0.6, -0.35], [0, 0.85, -0.15], [0, 0.82, 0.05]], [0.07, 0.05, 0.04, 0.03, 0.01], G, 5));
    [['legFL', 1, 1], ['legFR', -1, 1], ['legBL', 1, -1], ['legBR', -1, -1]].forEach(([n, sx, sz]) => att(m, n, mb => {
      limb(mb, [[0, 0, 0], [sx * 0.2, 0.18, sz * 0.05], [sx * 0.32, -0.42, sz * 0.12]], [0.04, 0.03, 0.02], [G, GD], 5);
      for (let k = -1; k <= 1; k++) spike(mb, [sx * 0.32, -0.42, sz * 0.12], [k * 0.4 + sx * 0.3, -0.1, 1], 0.07, 0.012, GD, 3);
    }));
    m.height = 1.25; m.lungeScale = 1.1;
    return m;
  });

  // Desert Sahagin: sandy fish-man with a violet fish head and a silver trident
  def('desert_sahagin', (a) => {
    const m = rig(a);
    const O = '#b8862a', OD = '#7a5818', F = '#9a3a8a';
    m.bone('body', 'root', [0, 0.9, 0], [0.25, 0, 0]);
    m.bone('head', 'body', [0, 0.5, 0.08]);
    m.bone('jaw', 'head', [0, -0.03, 0.12]);
    m.bone('armL', 'body', [0.24, 0.38, 0.02]); m.bone('armR', 'body', [-0.24, 0.38, 0.02]);
    m.bone('legFL', 'body', [0.14, -0.12, 0]); m.bone('legFR', 'body', [-0.14, -0.12, 0]);
    m.bone('tail', 'body', [0, -0.05, -0.2]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.16, rx: 0.18, rz: 0.15 }, { y: 0.1, rx: 0.2, rz: 0.17 }, { y: 0.35, rx: 0.26, rz: 0.2 }, { y: 0.48, rx: 0.14, rz: 0.12 }], { sides: 8, color: O });
      ell(mb, 0, 0.12, 0.12, 0.13, 0.18, 0.08, '#d8b060', 6, 4);
      for (let i = 0; i < 4; i++) mb.blade([0, 0.42 - i * 0.12, -0.16], [0, 0.4, -1], 0.14, 0.12, 0.02, '#4a8a48');
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.08, 0.06, 0.18, 0.17, 0.22, F, 8, 5, (i, j) => j < 2 ? '#3a9a60' : F);
      LR(s => { eye(mb, s * 0.13, 0.12, 0.16, 0.03, '#40d0c0', '#101010'); tri2(mb, [s * 0.1, 0.02, -0.02], [s * 0.25, 0.1, -0.12], [s * 0.2, -0.06, -0.1], '#4a8a48', '#2a5a28'); });
    });
    att(m, 'jaw', mb => { mb.box(0, -0.03, 0.08, 0.14, 0.04, 0.14, '#c0a060'); teeth(mb, [-0.05, 0.0, 0.14], [0.05, 0.0, 0.14], 4, 0.03, [0, 1, 0], '#fff'); });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.12, -0.25, 0.1], [s * 0.05, -0.35, 0.3]], [0.07, 0.055, 0.045], O, 6);
      ell(mb, s * 0.05, -0.37, 0.34, 0.05, 0.05, 0.06, OD, 6, 4);
      if (s < 0) {
        tube(mb, [s * 0.05, -0.37, -0.5], [s * 0.05, -0.37, 0.95], 0.015, 0.015, '#c8c8d8', 5);
        for (let k = -1; k <= 1; k++) spike(mb, [s * 0.05 + k * 0.06, -0.37, 0.95], [k * 0.15, 0, 1], 0.2, 0.015, '#e0e0f0', 3);
        tube(mb, [s * 0.05 - 0.07, -0.37, 0.95], [s * 0.05 + 0.07, -0.37, 0.95], 0.012, 0.012, '#c8c8d8', 4);
      }
    }));
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.06, -0.38, 0.2], [s * 0.08, -0.78, 0.02]], [0.09, 0.07, 0.05], O, 6);
      mb.box(s * 0.08, -0.8, 0.1, 0.12, 0.04, 0.22, OD);
    }));
    att(m, 'tail', mb => limb(mb, [[0, 0, 0], [0, -0.3, -0.25], [0, -0.7, -0.3]], [0.08, 0.05, 0.01], O, 5));
    m.height = 1.7; m.lungeScale = 1.0;
    return m;
  });

  // ---- Griffin: stocky lion-bodied hawk - crimson barrel body on short thick tan legs with big talons, a large hawk
  // head with a hooked yellow beak and a spiky black crest over a mane of long golden feathers, big solid dark slate
  // wings with cream under-feathers
  def('griffin', (a) => {
    const m = rig(a);
    const R = '#8a1848', RD = '#5e1034', Y = '#d8b848', YL = '#f0e090', W = '#2a3a50', WL = '#4a5a78', L = '#b89a78', LD = '#8a7058', Cr = '#f0e8c0';
    m.bone('body', 'root', [0, 0.78, 0], [-0.12, 0, 0]);
    m.bone('head', 'body', [0, 0.78, 0.46], [0.12, 0, 0]);
    m.bone('jaw', 'head', [0, -0.03, 0.2]);
    m.bone('tail', 'body', [0, 0.02, -0.62]);
    m.bone('wingL', 'body', [0.24, 0.42, 0.12]); m.bone('wingR', 'body', [-0.24, 0.42, 0.12]);
    [['legFL', 1, 0.34, 0.0], ['legFR', -1, 0.34, 0.0], ['legBL', 1, -0.4, 0.0], ['legBR', -1, -0.4, 0.0]].forEach(([n, sx, z, y]) => m.bone(n, 'body', [sx * 0.24, y, z], [0.12, 0, 0]));
    att(m, 'body', mb => {
      mb.push(); mb.rotate(PI / 2 - 0.2, 0, 0);
      mb.loft([{ y: -0.66, rx: 0.26, rz: 0.26 }, { y: -0.3, rx: 0.36, rz: 0.36 }, { y: 0.15, rx: 0.4, rz: 0.4 }, { y: 0.5, rx: 0.38, rz: 0.42 }, { y: 0.7, rx: 0.22, rz: 0.26 }], { sides: 7, color: R });
      mb.pop();
      tube(mb, [0, 0.35, 0.42], [0, 0.78, 0.5], 0.24, 0.16, R, 5);                              // neck
      // mane of long golden feathers falling over neck and chest
      for (let i = 0; i < 16; i++) {
        const row = i < 8, an = PI * (0.08 + 0.84 * (i % 8) / 7), r = row ? 0.2 : 0.26, y = row ? 0.74 : 0.48;
        const p = [C(an) * r, y, 0.42 + S(an) * r * 0.9], d = [C(an) * 0.4, -1, 0.25 + S(an) * 0.5];
        mb.blade(p, d, row ? 0.46 : 0.42, 0.2, 0.04, row ? Y : sh(Y, -0.1), [-S(an), 0, C(an)], YL);
      }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.06, 0.04, 0.18, 0.2, 0.21, Y, 6, 4);
      ell(mb, 0, 0.02, 0.2, 0.1, 0.1, 0.06, '#c01818', 5, 3);                                  // red face patch
      mb.sweep(mb.curvePts([[0, 0.06, 0.18], [0, 0.06, 0.34], [0, -0.04, 0.44], [0, -0.14, 0.42]], 1), [[0.07, 0.06], [0.065, 0.055], [0.055, 0.045], [0.04, 0.035], [0.028, 0.024], [0.015, 0.012], [0, 0]], { sides: 4, color: '#e0a020' });  // hooked beak
      LR(s => ball(mb, [s * 0.1, 0.1, 0.16], 0.024, '#f0e040', 5, 3));
      for (let i = 0; i < 9; i++) { const an = -1.1 + i * 0.275; mb.blade([S(an) * 0.08, 0.2, -0.02], [S(an) * 0.8, 1, -0.45], 0.36 + (i % 2) * 0.08, 0.11, 0.04, '#141418', null, '#30303a'); }
    });
    att(m, 'jaw', mb => mb.sweep([[0, 0.0, 0.08], [0, -0.04, 0.18], [0, -0.06, 0.24]], [[0.05, 0.03], [0.035, 0.02], [0, 0]], { sides: 4, color: '#c08018' }));
    att(m, 'tail', mb => { mb.sweep(mb.curvePts([[0, 0, 0], [0, -0.25, -0.3], [0, -0.2, -0.65], [0, 0.05, -0.85]], 1), [0.08, 0.075, 0.07, 0.06, 0.05, 0.045, 0.04], { sides: 4, color: L }); ell(mb, 0, 0.1, -0.9, 0.08, 0.12, 0.08, RD, 5, 3); });
    // big solid wings: dark slate membrane slab raised up and back, cream under-feathers along the lower edge
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const E = [s * 0.4, 0.5, -0.2], Wr = [s * 0.8, 1.05, -0.3], T1 = [s * 1.35, 1.35, -0.45], T2 = [s * 1.5, 0.75, -0.6], T3 = [s * 1.1, 0.25, -0.65], T4 = [s * 0.45, -0.05, -0.5];
      tube(mb, [0, 0, 0], E, 0.1, 0.08, W, 4); ball(mb, E, 0.08, WL, 5, 3); tube(mb, E, Wr, 0.08, 0.06, W, 4); tube(mb, Wr, T1, 0.06, 0.02, W, 4);
      fan2(mb, Wr, [T1, T2, T3], WL, W); fan2(mb, E, [Wr, T3, T4], W, sh(W, -0.2)); tri2(mb, [0, 0, 0], E, T4, W, sh(W, -0.2));
      for (let i = 0; i < 6; i++) {
        const t = i / 5, p = lerp3(T4, T2, t), d = [s * (0.1 + 0.4 * t), -1, -0.3];
        mb.blade(p, d, 0.34 + 0.14 * S(t * PI), 0.22, 0.03, Cr, V.cross(d, [0, 0, 1]), '#fffff0');
      }
    }));
    // short thick lion legs ending in big pale talons
    ['legFL', 'legFR', 'legBL', 'legBR'].forEach((n, i) => att(m, n, mb => {
      const back = i > 1, sx = i % 2 ? -1 : 1;
      const kn = back ? [sx * 0.03, -0.3, -0.1] : [sx * 0.03, -0.36, 0.06], an = back ? [sx * 0.03, -0.62, 0.02] : [sx * 0.03, -0.64, 0.06];
      ell(mb, 0, -0.02, 0, back ? 0.2 : 0.17, back ? 0.26 : 0.2, back ? 0.24 : 0.2, back ? R : L, 5, 4);
      tube(mb, [0, 0, 0], kn, 0.17, 0.13, L, 5); ball(mb, kn, 0.13, L, 5, 3);
      tube(mb, kn, an, 0.13, 0.1, L, 5);
      ell(mb, an[0], an[1] - 0.04, an[2] + 0.06, 0.12, 0.07, 0.14, LD, 5, 3);
      for (let k = -1; k <= 1; k++) spike(mb, [an[0] + k * 0.06, an[1] - 0.07, an[2] + 0.16], [k * 0.3, -0.5, 1], 0.14, 0.035, '#e8e0d0', 3);
      spike(mb, [an[0], an[1] - 0.06, an[2] - 0.06], [0, -0.5, -1], 0.1, 0.03, '#e8e0d0', 3);
    }));
    m.height = 2.55; m.lungeScale = 0.9;
    return m;
  });

  // Heg: upright segmented violet worm with a yellow fanged head and green thorn tail
  def('heg', (a) => {
    const m = rig(a);
    const P = '#5a4a9a', PD = '#3a2a6a', Y = '#c8a830';
    const L = 0.26;
    att(m, 'root', mb => { for (let i = 0; i < 4; i++) { const an = i / 4 * PI * 2; spike(mb, [C(an) * 0.12, 0.02, S(an) * 0.12 - 0.1], [C(an) * 0.3, 1, S(an) * 0.3], 0.2, 0.03, '#40b040', 3); } limb(mb, [[0.2, 0.05, -0.05], [0.1, 0.05, -0.1], [0, 0.1, -0.1]], [0.04, 0.07, 0.1], PD, 6); });
    let parent = 'root';
    for (let i = 0; i < 6; i++) {
      m.bone('seg' + i, parent, i === 0 ? [0, 0.08, -0.1] : [0, L, 0], [i === 0 ? 0.05 : (i === 4 ? 0.3 : i === 5 ? 0.4 : -0.05), 0, 0]);
      att(m, 'seg' + i, mb => mb.loft([{ y: 0, rx: 0.09, rz: 0.08 }, { y: L * 0.5, rx: 0.11, rz: 0.1 }, { y: L, rx: 0.09, rz: 0.08 }], { sides: 7, color: i % 2 ? P : sh(P, 0.1), smooth: false }));
      parent = 'seg' + i;
    }
    m.bone('head', parent, [0, L, 0], [0.5, 0, 0]);
    m.bone('jaw', 'head', [0, 0.05, 0.1]);
    att(m, 'head', mb => {
      ell(mb, 0, 0.1, 0.04, 0.16, 0.15, 0.17, Y, 8, 5);
      LR(s => eye(mb, s * 0.08, 0.17, 0.14, 0.028, '#f0f0f0', '#101010'));
      mb.box(0, 0.05, 0.12, 0.2, 0.05, 0.1, '#5a1010');
      teeth(mb, [-0.08, 0.07, 0.18], [0.08, 0.07, 0.18], 5, 0.045, [0, -1, 0.2], '#fff');
    });
    att(m, 'jaw', mb => { mb.box(0, -0.03, 0.06, 0.18, 0.05, 0.16, sh(Y, -0.25)); teeth(mb, [-0.07, 0.0, 0.13], [0.07, 0.0, 0.13], 4, 0.04, [0, 1, 0.2], '#fff'); });
    m.height = 1.75; m.lungeScale = 0.9;
    return m;
  });

  // Gi Spector: skeletal violet ghost of the Gi with a blue lens head, tattered tan cape and a staff
  def('gi_spector', (a) => {
    const m = rig(a); m.floats = true;
    const P = '#6a5ab0', PD = '#403070', T = '#a08a60';
    m.bone('body', 'root', [0, 0.9, 0]);
    m.bone('head', 'body', [0, 0.52, 0.02]);
    m.bone('armL', 'body', [0.16, 0.42, 0]); m.bone('armR', 'body', [-0.16, 0.42, 0]);
    m.bone('legFL', 'body', [0.07, -0.08, 0]); m.bone('legFR', 'body', [-0.07, -0.08, 0]);
    att(m, 'body', mb => {
      for (let i = 0; i < 4; i++) mb.loft([{ y: 0.12 + i * 0.08, rx: 0.1, rz: 0.07 }, { y: 0.17 + i * 0.08, rx: 0.12, rz: 0.08 }], { sides: 6, color: P });
      tube(mb, [0, -0.08, 0], [0, 0.46, 0], 0.03, 0.03, PD, 5);
      mb.loft([{ y: -0.1, rx: 0.1, rz: 0.07 }, { y: 0.02, rx: 0.12, rz: 0.08 }], { sides: 6, color: '#3a8a40' });
      // tattered cape over the shoulders
      for (let i = 0; i < 7; i++) { const an = PI * (0.9 + 1.2 * i / 6); mb.blade([C(an) * 0.14, 0.46, S(an) * 0.1], [C(an) * 0.5, -1, S(an) * 0.3 - 0.2], 0.35 + (i % 2) * 0.12, 0.14, 0.02, i % 2 ? T : '#8a7048'); }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.08, 0, 0.09, 0.1, 0.09, P, 7, 5);
      disc(mb, [0, 0.09, 0.08], [0, 0, 1], 0.065, 0.07, '#2a70e0', 8);
      disc(mb, [0, 0.09, 0.09], [0, 0, 1], 0.03, 0.035, '#a0e0ff', 6);
      limb(mb, [[0.03, 0.17, 0], [0.06, 0.3, -0.03], [0.1, 0.34, 0]], [0.008, 0.006, 0.003], '#e05020', 3);
    });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.1, -0.22, 0.02], [s * 0.1, -0.4, 0.12]], [0.03, 0.025, 0.02], P, 5);
      if (s > 0) { tube(mb, [s * 0.1, -0.9, 0.15], [s * 0.1, 0.25, 0.1], 0.015, 0.015, '#8a6a30', 5); ell(mb, s * 0.1, 0.3, 0.1, 0.05, 0.08, 0.05, '#e0c020', 6, 4); mb.blade([s * 0.1, 0.35, 0.1], [0.3, 1, 0], 0.12, 0.06, 0.02, '#d04080'); }
    }));
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.03, -0.35, 0.06], [s * 0.03, -0.72, -0.02]], [0.03, 0.025, 0.02], P, 5);
      mb.box(s * 0.03, -0.74, 0.03, 0.05, 0.04, 0.12, '#c08030');
    }));
    m.height = 1.75; m.lungeScale = 1.0;
    return m;
  });

  // Stinger: huge spider - small green domed body on very long, high-kneed thin legs
  def('stinger', (a) => {
    const m = rig(a);
    const G = '#1a6a48', GD = '#0e4030';
    m.bone('body', 'root', [0, 1.35, 0]);
    m.bone('head', 'body', [0, 0, 0.14]);
    m.bone('jaw', 'head', [0, -0.05, 0.06]);
    att(m, 'body', mb => {
      ell(mb, 0, 0.02, -0.05, 0.2, 0.13, 0.22, G, 8, 5, (i, j) => j > 2 ? GD : G);
      for (let i = 0; i < 8; i++) { const an = PI * (0.1 + 0.8 * i / 7); spike(mb, [C(an) * 0.18, 0.02, S(an) * 0.08 + 0.05], [C(an) * 0.4, -1, 0.5], 0.08, 0.02, '#e8d8c0', 3); }
    });
    att(m, 'head', mb => { LR(s => { eye(mb, s * 0.06, 0.02, 0.1, 0.025, '#f0a020', '#300000'); eye(mb, s * 0.1, 0.05, 0.05, 0.018, '#f0a020', '#300000'); }); });
    att(m, 'jaw', mb => LR(s => spike(mb, [s * 0.04, 0, 0.05], [s * 0.2, -1, 0.3], 0.1, 0.02, '#f0e0d0', 3)));
    const legs = [['legFL', 1, 0.5], ['legFR', -1, 0.5], ['legBL', 1, -0.6], ['legBR', -1, -0.6], ['armL', 1, 1.2], ['armR', -1, 1.2]];
    legs.forEach(([n, sx, ang]) => {
      m.bone(n, 'body', [sx * 0.12, 0, S(ang) * 0.1]);
      att(m, n, mb => {
        const d = [sx * C(ang * 0.8), 0, S(ang * 0.8)];
        const knee = [d[0] * 0.55, 0.85, d[2] * 0.55], foot = [d[0] * 1.2, -1.35, d[2] * 1.2];
        limb(mb, [[0, 0, 0], knee, foot], [0.025, 0.02, 0.008], [G, '#2a8a5a'], 4);
        spike(mb, lerp3(knee, foot, 0.93), V.sub(foot, knee), 0.2, 0.02, '#2a9a60', 4);
      });
    });
    m.height = 2.3; m.lungeScale = 0.6;
    return m;
  });

  // Gi Nattak: chieftain spirit of the Gi - feather headdress, green feather mantle, red breastplate,
  // bony segmented tail instead of legs, long red spear
  def('gi_nattak', (a) => {
    const m = rig(a); m.floats = true;
    const B = '#4a4ea8', BD = '#2a2e6a', G = '#6a9a60', GL = '#9ac088', R = '#c02028', Bo = '#d8d0b0', Gd = '#d0a840';
    m.bone('body', 'root', [0, 1.25, 0]);
    m.bone('head', 'body', [0, 0.95, 0.04]);
    m.bone('armL', 'body', [0.42, 0.8, 0]); m.bone('armR', 'body', [-0.42, 0.8, 0]);
    m.bone('tail', 'body', [0, -0.15, 0]);
    att(m, 'body', mb => {
      // ribbed blue torso
      mb.loft([{ y: -0.2, rx: 0.14, rz: 0.1 }, { y: 0.2, rx: 0.2, rz: 0.14 }, { y: 0.6, rx: 0.32, rz: 0.2 }, { y: 0.85, rx: 0.36, rz: 0.2 }, { y: 0.95, rx: 0.16, rz: 0.12 }], { sides: 8, color: B });
      for (let i = 0; i < 5; i++) mb.loft([{ y: 0.1 + i * 0.12, rx: 0.2 + i * 0.03, rz: 0.15 }, { y: 0.14 + i * 0.12, rx: 0.21 + i * 0.03, rz: 0.155 }], { sides: 8, color: BD, capTop: false, capBottom: false });
      // red breastplate with a gold rim and white gem, hung with pale fangs
      mb.panel([[-0.2, 0.86], [0.2, 0.86], [0.18, 0.4], [0, 0.26], [-0.18, 0.4]], 0.2, 0.03, Gd);
      mb.panel([[-0.16, 0.82], [0.16, 0.82], [0.14, 0.42], [0, 0.31], [-0.14, 0.42]], 0.22, 0.02, R);
      mb.panel([[-0.06, 0.72], [0.06, 0.72], [0.08, 0.62], [0.06, 0.52], [-0.06, 0.52], [-0.08, 0.62]], 0.235, 0.02, '#e8e0c8');
      for (let i = 0; i < 6; i++) spike(mb, [-0.15 + i * 0.06, 0.3, 0.2], [0, -1, 0.1], 0.2, 0.025, i % 2 ? '#f0e8f0' : R, 3);
      // shoulder yokes: spiked bony balls
      LR(s => { ell(mb, s * 0.42, 0.84, 0.0, 0.12, 0.1, 0.12, '#b8a070', 6, 4); for (let k = 0; k < 5; k++) spike(mb, [s * 0.42, 0.84, 0], [s * C(k * 0.8 - 0.4), S(k * 0.8 - 0.4), 0.3 * (k % 2 ? 1 : -1)], 0.18, 0.04, '#d8c080', 3); });
      // green feather mantle, spread wide from the shoulders down past the knees
      const top = [], hem = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8, an = PI * (1.05 + 0.9 * t); top.push([C(an) * 0.5, 0.9, S(an) * 0.22 + 0.02]); hem.push([C(an) * 0.95, -0.35, S(an) * 0.4 - 0.05]); }
      strip2(mb, top, hem, G, sh(G, -0.3));
      for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
        const t = i / 8, an = PI * (1.0 + t), r = 0.46 + row * 0.18, y = 0.9 - row * 0.4;
        mb.blade([C(an) * r, y, S(an) * r * 0.45 + 0.04], [C(an) * (0.5 + row * 0.2), -1, S(an) * 0.3], 0.62 + row * 0.1, 0.34, 0.04, (row + i) % 2 ? G : GL, [C(an + PI / 2), 0, S(an + PI / 2)], '#d0e8c0');
      }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.08, 0.02, 0.1, 0.13, 0.1, '#28306a', 7, 5);
      ell(mb, 0, 0.05, 0.08, 0.075, 0.09, 0.04, '#303848', 6, 4);
      LR(s => ball(mb, [s * 0.035, 0.08, 0.115], 0.014, '#40e0d0'));
      mb.loft([{ y: 0.14, rx: 0.13, rz: 0.12 }, { y: 0.21, rx: 0.14, rz: 0.13 }], { sides: 10, color: '#30b8a8' });
      mb.panel([[-0.035, 0.28], [0.035, 0.28], [0, 0.19]], 0.13, 0.02, R);
      // white feather crown with a tall central quill
      for (let i = 0; i < 11; i++) { const an = -1.25 + i * 0.25; mb.blade([S(an) * 0.11, 0.2, -0.03], [S(an) * 1.2, 1, -0.25], 0.36 + (i === 5 ? 0.3 : 0), 0.08, 0.02, i === 5 ? '#b08050' : (i % 2 ? '#e8e8f0' : '#a8a8b8')); }
      // curved red horns
      LR(s => limb(mb, [[s * 0.11, 0.18, 0], [s * 0.3, 0.12, 0.02], [s * 0.42, 0.24, 0.04], [s * 0.46, 0.36, 0.02]], [0.035, 0.03, 0.02, 0.005], '#b02030', 4));
    });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.12, -0.38, 0.08], [s * 0.06, -0.66, 0.24]], [0.07, 0.06, 0.05], [B, BD], 6);
      ell(mb, s * 0.06, -0.7, 0.28, 0.07, 0.07, 0.07, '#5a4aa8', 6, 4);
      for (let k = -1; k <= 1; k++) spike(mb, [s * 0.06 + k * 0.03, -0.74, 0.32], [k * 0.3, -1, 0.4], 0.1, 0.015, '#d0c8f0', 3);
      if (s < 0) {   // the great spear
        tube(mb, [s * 0.06, -1.5, 0.3], [s * 0.06, 1.15, 0.2], 0.028, 0.028, '#8a2018', 5);
        mb.blade([s * 0.06, 1.15, 0.2], [0, 1, 0], 0.55, 0.1, 0.05, R);
        for (let k = 0; k < 4; k++) mb.blade([s * 0.06, 0.25, 0.28], [C(k * 1.6), -0.3, S(k * 1.6)], 0.2, 0.06, 0.02, '#e8d8b0');
        for (let k = 0; k < 4; k++) mb.blade([s * 0.06, -0.8, 0.29], [C(k * 1.6) * 0.4, -1, S(k * 1.6) * 0.4], 0.6, 0.08, 0.02, k % 2 ? '#e0e0f0' : '#b02030');
      }
    }));
    att(m, 'tail', mb => {
      const pts = [[0, 0, 0], [0, -0.25, -0.02], [0, -0.5, 0.02], [0.03, -0.75, 0.0], [0.04, -0.98, -0.04], [0.02, -1.2, 0.0]];
      for (let i = 0; i < pts.length - 1; i++) { ell(mb, pts[i][0], pts[i][1] - 0.1, pts[i][2], 0.08 - i * 0.009, 0.1, 0.07 - i * 0.007, i % 2 ? Bo : sh(Bo, -0.1), 6, 4); LR(s => spike(mb, [pts[i][0] + s * 0.06, pts[i][1] - 0.1, pts[i][2]], [s, -0.2, 0], 0.06, 0.015, Bo, 3)); }
      ball(mb, [0.02, -1.0, 0.07], 0.02, '#e02020');
      LR(s => { mb.panel([[s * 0.06, -0.35], [s * 0.16, -0.35], [s * 0.18, -1.0], [s * 0.1, -1.05]].map(p => p), 0.06, 0.02, R); });
    });
    m.height = 2.8; m.lungeScale = 0.8;
    return m;
  });

  // ---- Soul Fire: Gi Nattak's floating spirit flame - a plain glowing flat lozenge (hexagonal, pointed top and
  // bottom) in bright yellow-orange with a pale yellow core and a red lower rim, flickering as it bobs
  def('soul_fire', (a) => {
    const m = rig(a); m.floats = true;
    m.bone('body', 'root', [0, 1.35, 0]);
    const gc = FF7.glColor, core = gc('#ffe870'), mid = gc('#f8b020'), rim = gc('#f08018'), red = gc('#e03010'), tip = gc('#f04020');
    att(m, 'body', mb => {
      // outline: top tip, upper sides, lower sides, bottom tip (x, y); z bulges out to a ridge at the core
      const O = [[0, 0.55], [0.23, 0.22], [0.24, -0.12], [0, -0.46], [-0.24, -0.12], [-0.23, 0.22]];
      const cols = [tip, rim, rim, red, rim, rim];
      const ring = O.map(([x, y]) => [x, y, 0]), mids = O.map(([x, y]) => [x * 0.5, y * 0.5 + 0.02, 0.07]);
      LR(f => {   // front (f = 1) and back faces
        const c = [0, 0.03, 0.1 * f], z = (p) => [p[0], p[1], p[2] * f];
        for (let i = 0; i < 6; i++) {
          const j = (i + 1) % 6, a = z(mids[i]), b = z(mids[j]);
          const w = f > 0 ? (p, q, r, cp, cq, cr) => mb.tri(p, q, r, [cp, cq, cr]) : (p, q, r, cp, cq, cr) => mb.tri(p, r, q, [cp, cr, cq]);
          w(c, a, b, core, mid, mid);
          w(a, ring[i], ring[j], mid, cols[i], cols[j]); w(a, ring[j], b, mid, cols[j], mid);
        }
      });
    }, { unlit: true });
    // gentle flicker: the flame stretches and narrows
    m.onPose = (mm) => { const t = (FF7.frame || 0) * 0.25, b = mm.bones.body; b.scl[1] = 1 + 0.06 * S(t) + 0.03 * S(t * 2.3); b.scl[0] = 1 - 0.04 * S(t + 1); };
    m.height = 1.95; m.lungeScale = 1.2;
    return m;
  });

  // ================================================================== Nibelheim / Mt. Nibel
  // Nibel Wolf: brown maned wolf with a shaggy lion-like ruff
  def('nibel_wolf', (a) => {
    const m = rig(a);
    const B = '#7a5230', BL = '#9a6a40', BD = '#4a3018';
    m.bone('body', 'root', [0, 0.72, 0], [0.12, 0, 0]);
    m.bone('head', 'body', [0, 0.1, 0.5], [0.25, 0, 0]);
    m.bone('jaw', 'head', [0, -0.08, 0.1]);
    m.bone('tail', 'body', [0, 0.1, -0.5], [-0.6, 0, 0]);
    [['legFL', 1, 0.34], ['legFR', -1, 0.34], ['legBL', 1, -0.36], ['legBR', -1, -0.36]].forEach(([n, sx, z]) => m.bone(n, 'body', [sx * 0.15, -0.05, z]));
    att(m, 'body', mb => {
      mb.push(); mb.rotate(PI / 2, 0, 0);
      mb.loft([{ y: -0.5, rx: 0.15, rz: 0.16 }, { y: -0.2, rx: 0.19, rz: 0.2 }, { y: 0.2, rx: 0.22, rz: 0.24 }, { y: 0.45, rx: 0.2, rz: 0.22 }], { sides: 7, color: B, smooth: false });
      mb.pop();
      // shaggy mane blades
      for (let i = 0; i < 16; i++) { const an = PI * (-0.1 + 1.2 * (i % 8) / 7), row = i >> 3; mb.blade([C(an) * 0.2, 0.05 + S(an) * 0.18, 0.28 - row * 0.2], [C(an) * 0.8, S(an) * 0.8 + 0.3, -0.7], 0.3 - row * 0.05, 0.14, 0.04, row ? B : BL, null, '#b88a58'); }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.02, 0.02, 0.13, 0.12, 0.13, BL, 7, 5);
      mb.frustum(0, -0.06, 0.1, 0.12, 0.1, 0.08, 0.07, 0.1, BL);
      mb.box(0, -0.01, 0.22, 0.07, 0.06, 0.06, BD);
      LR(s => { spike(mb, [s * 0.08, 0.1, -0.02], [s * 0.3, 1, -0.2], 0.12, 0.04, '#c07860', 4); eye(mb, s * 0.06, 0.04, 0.12, 0.015, '#e0e020', '#200000'); });
    });
    att(m, 'jaw', mb => { mb.box(0, -0.02, 0.1, 0.1, 0.03, 0.14, '#c02030'); teeth(mb, [-0.035, 0.0, 0.16], [0.035, 0.0, 0.16], 3, 0.03, [0, 1, 0], '#fff'); });
    att(m, 'tail', mb => { for (let i = 0; i < 4; i++) mb.blade([0, 0, 0], [(i - 1.5) * 0.25, -1, -0.3], 0.35, 0.1, 0.05, i % 2 ? B : BL); });
    ['legFL', 'legFR', 'legBL', 'legBR'].forEach((n, i) => att(m, n, mb => {
      const f = i < 2;
      limb(mb, [[0, 0, 0], [0, -0.3, f ? 0.04 : -0.1], [0, -0.52, f ? 0.02 : -0.02], [0, -0.7, 0.04]], [0.07, 0.05, 0.04, 0.04], [B, BD], 5);
      mb.box(0, -0.7, 0.08, 0.08, 0.04, 0.12, BD);
      for (let k = -1; k <= 1; k++) spike(mb, [k * 0.025, -0.71, 0.14], [0, -0.2, 1], 0.04, 0.01, '#40c0c0', 3);
    }));
    m.height = 1.15; m.lungeScale = 1.2;
    return m;
  });

  // Valron (and its look-alike Gorky): gargoyle with a blue torso, horned head, bat wings and magenta legs
  function gargoyle(a, o) {
    const m = rig(a);
    m.bone('body', 'root', [0, 1.02, 0], [0.3, 0, 0]);
    m.bone('head', 'body', [0, 0.55, 0.12]);
    m.bone('jaw', 'head', [0, -0.03, 0.12]);
    m.bone('armL', 'body', [0.3, 0.42, 0.05]); m.bone('armR', 'body', [-0.3, 0.42, 0.05]);
    m.bone('legFL', 'body', [0.14, -0.1, 0]); m.bone('legFR', 'body', [-0.14, -0.1, 0]);
    m.bone('wingL', 'body', [0.12, 0.45, -0.15]); m.bone('wingR', 'body', [-0.12, 0.45, -0.15]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.15, rx: 0.16, rz: 0.13 }, { y: 0.1, rx: 0.17, rz: 0.14 }, { y: 0.35, rx: 0.3, rz: 0.2 }, { y: 0.52, rx: 0.24, rz: 0.17 }, { y: 0.6, rx: 0.1, rz: 0.1 }], { sides: 8, color: o.body });
      ell(mb, 0, -0.12, 0, 0.17, 0.1, 0.14, o.legs, 7, 4);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.06, 0.04, 0.12, 0.12, 0.15, o.body, 7, 5);
      mb.frustum(0, 0.0, 0.14, 0.12, 0.1, 0.08, 0.06, 0.08, o.body);
      LR(s => { eye(mb, s * 0.05, 0.08, 0.15, 0.02, '#f02020', '#200000'); limb(mb, [[s * 0.06, 0.14, 0], [s * 0.1, 0.24, -0.12], [s * 0.08, 0.3, -0.3]], [0.04, 0.03, 0.005], o.horn, 5); });
    });
    att(m, 'jaw', mb => { mb.box(0, -0.03, 0.08, 0.11, 0.04, 0.12, sh(o.body, -0.2)); teeth(mb, [-0.04, 0.0, 0.13], [0.04, 0.0, 0.13], 3, 0.03, [0, 1, 0], '#fff'); });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      ell(mb, 0, 0, 0, 0.1, 0.1, 0.1, o.body, 6, 4);
      limb(mb, [[0, 0, 0], [s * 0.12, -0.3, 0.02], [s * 0.1, -0.55, 0.18]], [0.08, 0.07, 0.05], o.body, 6);
      ell(mb, s * 0.1, -0.6, 0.22, 0.06, 0.06, 0.07, o.body, 6, 4);
      for (let k = -1; k <= 1; k++) spike(mb, [s * 0.1 + k * 0.03, -0.62, 0.26], [k * 0.3, -0.8, 0.6], 0.1, 0.015, '#e8e8f0', 3);
      spike(mb, [s * 0.14, -0.3, -0.04], [s * 0.3, 0.2, -1], 0.14, 0.03, '#e8e8f0', 3);
    }));
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.06, -0.42, 0.18], [s * 0.06, -0.72, -0.08], [s * 0.06, -0.9, 0.02]], [0.1, 0.07, 0.05, 0.05], o.legs, 6);
      for (let k = -1; k <= 1; k++) spike(mb, [s * 0.06 + k * 0.04, -0.92, 0.04], [k * 0.3, -0.2, 1], 0.1, 0.02, '#e8e8f0', 3);
    }));
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const E = [s * 0.35, 0.35, -0.2], Wr = [s * 0.7, 0.65, -0.3];
      limb(mb, [[0, 0, 0], E, Wr], [0.04, 0.03, 0.02], o.wingBone, 4);
      const tips = [[s * 1.2, 0.85, -0.25], [s * 1.35, 0.35, -0.3], [s * 1.1, -0.05, -0.25], [s * 0.7, -0.2, -0.2]];
      const edge = [[0, -0.1, 0]];
      tips.slice().reverse().forEach((t, i, arr) => { tube(mb, Wr, t, 0.015, 0.004, o.wingBone, 3); edge.push(t); if (i < arr.length - 1) edge.push(lerp3(lerp3(t, arr[i + 1], 0.5), Wr, 0.3)); });
      for (let i = 0; i < edge.length - 1; i++) tri2(mb, Wr, edge[i], edge[i + 1], o.wing, o.wing2);
      tri2(mb, [0, 0, 0], E, Wr, o.wing, o.wing2); tri2(mb, [0, 0, 0], Wr, [0, -0.1, 0], o.wing, o.wing2);
    }));
    m.height = 2.0; m.lungeScale = 1.0;
    return m;
  }
  def('valron', (a) => gargoyle(a, { body: '#3a44c8', legs: '#b02860', horn: '#6a3aa0', wingBone: '#c05030', wing: '#8a3aa8', wing2: '#c86030' }));

  // Mirage: floating hand mirror with a gilded octagonal frame
  def('mirage', (a) => {
    const m = rig(a); m.floats = true;
    const G = '#c8a040';
    m.bone('body', 'root', [0, 1.0, 0], [0, 0, 0.12]);
    m.bone('head', 'body', [0, 0.35, 0]);
    att(m, 'head', mb => {
      const R = 0.3, n = 8, ring = [], inner = [];
      for (let i = 0; i < n; i++) { const an = (i + 0.5) / n * PI * 2; ring.push([C(an) * R * 0.85, S(an) * R, 0]); inner.push([C(an) * R * 0.74, S(an) * R * 0.88, 0.015]); }
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; tube(mb, ring[i], ring[j], 0.03, 0.03, G, 5); ball(mb, ring[i], 0.035, '#e0c060'); spike(mb, ring[i], [ring[i][0], ring[i][1], 0], 0.07, 0.02, '#e8d080', 3); }
      poly2(mb, inner, '#a8d8f0', '#607890');
      poly2(mb, inner.map(p => [p[0] * 0.5 - 0.05, p[1] * 0.5 + 0.08, 0.02]), '#e0f4ff', '#607890');
      mb.panel(inner.map(p => [p[0], p[1]]), -0.015, 0.02, '#8a7040');
    });
    att(m, 'body', mb => {
      tube(mb, [0, 0.08, 0], [0, -0.45, 0], 0.035, 0.03, '#a0a0a8', 6);
      tube(mb, [0, 0.08, 0], [0, 0.0, 0], 0.06, 0.05, G, 6);
      ell(mb, 0, -0.5, 0, 0.06, 0.06, 0.06, '#f0d020', 7, 5);
      spike(mb, [0, -0.55, 0], [0, -1, 0], 0.08, 0.03, '#f0d020', 4);
    });
    m.height = 1.75; m.lungeScale = 1.2;
    return m;
  });

  // Dorky Face: grinning jack-o'-lantern head with a pink bow and a white ruffled skirt
  def('dorky_face', (a) => {
    const m = rig(a); m.floats = true;
    const O = '#e05818', OD = '#a03808';
    m.bone('body', 'root', [0, 0.55, 0]);
    m.bone('head', 'body', [0, 0.35, 0]);
    m.bone('jaw', 'head', [0, 0.0, 0.18]);
    att(m, 'body', mb => {
      mb.loft([{ y: 0.12, rx: 0.05, rz: 0.05 }, { y: 0.04, rx: 0.13, rz: 0.13 }, { y: -0.12, rx: 0.2, rz: 0.2 }], { sides: 12, color: '#f0f0f8', capBottom: false, smooth: false });
      for (let i = 0; i < 12; i++) { const an = i / 12 * PI * 2; mb.blade([C(an) * 0.06, 0.1, S(an) * 0.06], [C(an) * 0.7, -1, S(an) * 0.7], 0.3, 0.1, 0.02, i % 2 ? '#f4f4ff' : '#c8c8e0', { radial: [0, 0.1, 0] }); }
      tube(mb, [0, 0.12, 0], [0, 0.2, 0], 0.03, 0.03, '#6a8a30', 5);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.0, 0, 0.26, 0.2, 0.24, O, 12, 6, (i) => i % 2 ? O : sh(O, 0.1));
      LR(s => {
        mb.push(); mb.translate(s * 0.09, 0.05, 0.215); mb.rotate(-0.2, s * 0.3, s * 0.3); mb.sphere(0, 0, 0, 0.05, 0.03, 0.02, '#401008', 6, 3, false); mb.pop();
        tri2(mb, [0, 0.2, 0], [s * 0.14, 0.3, 0.02], [s * 0.12, 0.2, -0.02], '#f070a0', '#c04070');
        tri2(mb, [0, 0.2, 0], [s * 0.14, 0.28, 0.0], [s * 0.1, 0.24, 0.06], '#f890c0', '#c04070');
      });
      ball(mb, [0, 0.21, 0], 0.03, '#f070a0');
    });
    att(m, 'jaw', mb => { mb.push(); mb.translate(0, -0.06, 0.03); mb.rotate(-0.4, 0, 0); mb.sphere(0, 0, 0, 0.14, 0.045, 0.02, '#401008', 8, 3, false); mb.pop(); teeth(mb, [-0.08, -0.04, 0.05], [0.08, -0.04, 0.05], 3, 0.03, [0, -1, 0], '#f0c040', 0.02); });
    m.height = 1.15; m.lungeScale = 1.2;
    return m;
  });

  // Jersey: a living scale - masked, skull-jawed face on a baluster column holding a balance beam
  def('jersey', (a) => {
    const m = rig(a);
    const Gd = '#b88a30', Gr = '#3a7a40', R = '#c02020';
    m.bone('body', 'root', [0, 0.0, 0]);
    m.bone('head', 'body', [0, 0.55, 0]);
    m.bone('jaw', 'head', [0, -0.05, 0.08]);
    m.bone('armL', 'body', [0, 1.3, 0], [0, 0, -0.25]);
    att(m, 'body', mb => {
      mb.loft([{ y: 0, rx: 0.18, rz: 0.18 }, { y: 0.1, rx: 0.12, rz: 0.12 }, { y: 0.35, rx: 0.07, rz: 0.07 }, { y: 0.45, rx: 0.1, rz: 0.1 }], { sides: 8, color: '#5a5a5a' });
      mb.loft([{ y: 0.85, rx: 0.07, rz: 0.07 }, { y: 0.95, rx: 0.12, rz: 0.12 }, { y: 1.05, rx: 0.06, rz: 0.06 }, { y: 1.15, rx: 0.1, rz: 0.1 }, { y: 1.25, rx: 0.05, rz: 0.05 }, { y: 1.35, rx: 0.05, rz: 0.05 }], { sides: 8, color: Gd });
    });
    att(m, 'head', mb => {
      mb.loft([{ y: -0.1, rx: 0.13, rz: 0.12 }, { y: 0.05, rx: 0.15, rz: 0.14 }, { y: 0.2, rx: 0.14, rz: 0.13 }, { y: 0.3, rx: 0.12, rz: 0.11 }], { sides: 8, color: Gr });
      mb.box(0, 0.12, 0.12, 0.24, 0.09, 0.05, R);
      LR(s => ell(mb, s * 0.055, 0.12, 0.15, 0.035, 0.02, 0.01, '#101010', 6, 3));
      mb.box(0, 0.26, 0.12, 0.26, 0.04, 0.04, R);
      ell(mb, 0, 0.0, 0.07, 0.1, 0.07, 0.08, '#e8e0d0', 6, 4);
    });
    att(m, 'jaw', mb => { mb.box(0, -0.06, 0.02, 0.14, 0.06, 0.08, '#e8e0d0'); for (let i = -2; i <= 2; i++) mb.box(i * 0.025, -0.02, 0.065, 0.015, 0.03, 0.01, '#302020'); });
    att(m, 'armL', mb => {
      tube(mb, [-0.8, 0, 0], [0.8, 0, 0], 0.03, 0.03, '#5a7a30', 6);
      spike(mb, [0, 0.02, 0], [0, 1, 0], 0.3, 0.06, '#d0c0a0', 4);
      LR(s => {
        ball(mb, [s * 0.82, 0, 0], 0.06, '#3a8a60'); spike(mb, [s * 0.85, 0, 0], [s, 0.3, 0], 0.12, 0.04, '#d88060', 4);
        const pan = [s * 0.7, -0.62, 0];
        [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]].forEach(([dx, dz]) => tube(mb, [s * 0.7, 0, 0], [pan[0] + dx, pan[1], dz], 0.006, 0.006, '#303030', 3));
        mb.loft([{ y: pan[1] - 0.06, rx: 0.1, rz: 0.1, x: pan[0] }, { y: pan[1], rx: 0.22, rz: 0.22, x: pan[0] }], { sides: 10, color: '#d8a830' });
      });
    });
    m.height = 1.9; m.lungeScale = 0.5;
    return m;
  });

  // Ghirofelgo: a crescent-moon cradle swinging on a chain, ridden by a blond drummer
  def('ghirofelgo', (a) => {
    const m = rig(a); m.floats = true;
    const G = '#284a30', W = '#e0e8e8';
    m.bone('body', 'root', [0, 0.95, 0]);
    m.bone('head', 'body', [0, 0.38, 0.0]);
    m.bone('armL', 'body', [0.08, 0.3, 0.05]);
    att(m, 'body', mb => {
      // crescent: a curved hull, pale underneath and a dark ragged rim
      const n = 10, top = [], bot = [], rim = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, an = PI * (0.08 + 0.84 * t), x = -C(an) * 0.75, yb = -S(an) * 0.42, yt = -S(an) * 0.18 + 0.02;
        const w = 0.12 + 0.2 * S(t * PI);
        bot.push([x, yb, 0]); top.push([x, yt, w]); rim.push([x, yt, -w]);
      }
      strip2(mb, bot, top, W, '#9aa0a0'); strip2(mb, rim, bot, W, '#9aa0a0'); strip2(mb, top, rim, G, sh(G, -0.3));
      for (let i = 1; i < n; i++) { spike(mb, top[i], [0, 0.6, 1], 0.1, 0.03, G, 3); spike(mb, rim[i], [0, 0.6, -1], 0.1, 0.03, G, 3); }
      // chain up to the sky
      for (let i = 0; i < 9; i++) { mb.push(); mb.translate(0.02, 0.35 + i * 0.13, 0); mb.rotate(0, i * 0.8, 0); mb.frustum(0, 0, 0, 0.001, 0.001, 0.06, 0.02, 0.06, '#6a3a8a'); mb.frustum(0, 0.06, 0, 0.06, 0.02, 0.001, 0.001, 0.06, '#8a5aaa'); mb.pop(); }
      spike(mb, [0, -0.42, 0], [0, -1, 0], 0.18, 0.05, '#6a3a8a', 4);
      // rider's body and drum
      ell(mb, 0, 0.12, -0.02, 0.09, 0.14, 0.08, '#c89060', 6, 4);
      limb(mb, [[0.05, 0.02, 0], [0.1, 0.05, 0.15], [0.1, -0.12, 0.2]], [0.04, 0.035, 0.03], '#2a3a8a', 5);
      limb(mb, [[-0.05, 0.02, 0], [-0.1, 0.05, 0.15], [-0.1, -0.12, 0.2]], [0.04, 0.035, 0.03], '#2a3a8a', 5);
      mb.push(); mb.translate(0, 0.08, 0.16); mb.rotate(PI / 2, 0, 0); mb.prism(0, -0.05, 0, 0.09, 0.09, 0.1, 10, '#c02030'); mb.prism(0, 0.05, 0, 0.092, 0.092, 0.01, 10, '#f0f0f0'); mb.pop();
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.0, 0.02, 0.07, 0.08, 0.07, '#e0b080', 6, 4);
      for (let i = 0; i < 7; i++) mb.blade([0, 0.04, -0.01], [(i - 3) * 0.12 - 0.3, 0.6, -0.6 - (i % 2) * 0.3], 0.18, 0.05, 0.02, '#f0e060');
    });
    att(m, 'armL', mb => { limb(mb, [[0, 0, 0], [0.1, 0.18, 0.02], [0.05, 0.4, 0.0]], [0.025, 0.02, 0.018], '#c89060', 5); });
    m.height = 2.3; m.lungeScale = 0.8;
    return m;
  });

  // Black Bat: violet bat with broad gold-edged wings
  def('black_bat', (a) => {
    const m = rig(a); m.floats = true;
    const P = '#4a2a7a', PD = '#2a1848', Y = '#c8a020';
    m.bone('body', 'root', [0, 1.3, 0]);
    m.bone('head', 'body', [0, 0.14, 0.04]);
    m.bone('wingL', 'body', [0.06, 0.08, 0]); m.bone('wingR', 'body', [-0.06, 0.08, 0]);
    m.bone('legFL', 'body', [0.04, -0.12, 0]); m.bone('legFR', 'body', [-0.04, -0.12, 0]);
    att(m, 'body', mb => ell(mb, 0, 0, 0, 0.08, 0.14, 0.07, P, 7, 5, (i, j) => j > 3 ? PD : P));
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0.02, 0.07, 0.06, 0.07, P, 6, 4);
      LR(s => { spike(mb, [s * 0.04, 0.08, 0.0], [s * 0.4, 1, -0.1], 0.12, 0.03, P, 3); ball(mb, [s * 0.03, 0.05, 0.08], 0.012, '#f02020'); });
      LR(s => spike(mb, [s * 0.015, 0.0, 0.08], [0, -1, 0.3], 0.03, 0.008, '#fff', 3));
    });
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const E = [s * 0.3, 0.2, -0.02], Wr = [s * 0.55, 0.35, -0.04];
      limb(mb, [[0, 0, 0], E, Wr], [0.02, 0.016, 0.012], PD, 4);
      const tips = [[s * 1.0, 0.75, -0.04], [s * 1.1, 0.3, -0.05], [s * 0.95, -0.05, -0.05], [s * 0.6, -0.22, -0.03]];
      const edge = [[0, -0.12, 0]];
      tips.slice().reverse().forEach((t, i, arr) => { tube(mb, Wr, t, 0.01, 0.003, Y, 3); edge.push(t); if (i < arr.length - 1) edge.push(lerp3(lerp3(t, arr[i + 1], 0.5), Wr, 0.3)); });
      for (let i = 0; i < edge.length - 1; i++) tri2(mb, Wr, edge[i], edge[i + 1], P, PD);
      tri2(mb, [0, 0, 0], E, Wr, P, PD); tri2(mb, [0, 0, 0], Wr, [0, -0.12, 0], P, PD);
      spike(mb, E, [s * 0.2, 1, 0], 0.07, 0.01, Y, 3);
    }));
    const leg = meshOf(mb => { limb(mb, [[0, 0, 0], [0, -0.1, 0.02]], [0.012, 0.008], PD, 4); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 1.55; m.lungeScale = 1.3;
    return m;
  });

  // ---- Ying / Yang: one bulky, hunched two-headed body (the PS1 draws them as a single conjoined creature).
  // Each id is a complete torso with its own grub-like hooded head (Ying pink-white, Yang pale blue, red eyes),
  // an orange chest pad, long thick clawed arms and a teal/purple shoulder frill; Yang is anchored on Ying's
  // left so the two torsos fuse shoulder to shoulder. While both live each twin hides its inner arm + frill and
  // its outer leg (two heads, two arms, two legs, like the original); a lone survivor grows them back and reads
  // as a complete one-headed creature.
  function yingYang(a, twin) {
    const m = rig(a);
    const B = '#b4a48c', BL = '#cbbca2', BD = '#8a7a64', O = '#e0802c', Cl = '#ece4d4';
    const skin = twin === 'ying' ? '#e8c8c8' : '#b0c0e0', eyeC = '#d01818';
    const inner = twin === 'ying' ? 1 : -1;                // Yang stands on Ying's left (+x)
    const P = 0.28;                                        // forward hunch of the torso
    m.bone('body', 'root', [0, 1.05, 0], [P, 0, 0]);
    m.bone('head', 'body', [0, 0.72, 0.05], [-P + 0.15, 0, 0]);
    m.bone('jaw', 'head', [0, 0.33, 0.16]);
    m.bone('armL', 'body', [0.37, 0.6, 0], [-P, 0, 0]); m.bone('armR', 'body', [-0.37, 0.6, 0], [-P, 0, 0]);
    m.bone('finL', 'body', [0.24, 0.64, -0.12]); m.bone('finR', 'body', [-0.24, 0.64, -0.12]);
    m.bone('legFL', 'root', [0.16, 1.0, -0.02]); m.bone('legFR', 'root', [-0.16, 1.0, -0.02]);
    // torso: narrow ribbed waist flaring to a broad chest and hunched shoulders
    const rings = [[-0.16, 0.18, 0.14, B], [0.0, 0.22, 0.17, B], [0.07, 0.235, 0.18, BD], [0.1, 0.22, 0.17, B], [0.17, 0.25, 0.19, BD], [0.2, 0.24, 0.18, B],
      [0.27, 0.28, 0.2, BD], [0.3, 0.29, 0.2, B], [0.46, 0.37, 0.24, B], [0.62, 0.42, 0.25, BL], [0.74, 0.3, 0.2, B], [0.84, 0.16, 0.15, B]];
    att(m, 'body', mb => {
      mb.loft(rings.map(([y, rx, rz, color]) => ({ y, rx, rz, color })), { sides: 9, color: B });
      ell(mb, 0, -0.1, 0.0, 0.25, 0.16, 0.18, BD, 7, 4);                                   // pelvis
      ell(mb, 0, 0.5, 0.17, 0.3, 0.15, 0.1, O, 7, 4);                                       // orange chest pad
      LR(s => ell(mb, s * 0.34, 0.64, 0.0, 0.16, 0.15, 0.17, BL, 7, 4));                   // hunched shoulder knots
    });
    // teal/purple frills fanning from behind the shoulders
    LR(s => att(m, s > 0 ? 'finL' : 'finR', mb => {
      for (let i = 0; i < 5; i++) mb.blade([s * 0.03 * i, -0.06 * i, 0], [s * (0.55 + 0.1 * i), 0.4 - 0.34 * i, -0.5], 0.6 + 0.06 * (i % 3), 0.26, 0.04, i % 2 ? '#6a4a90' : '#3a8080', null, i % 2 ? '#3a2a5a' : '#1e4a4a');
    }));
    // grub-like head rising out of a hood of neck folds
    att(m, 'head', mb => {
      mb.loft([{ y: -0.08, rx: 0.2, rz: 0.17 }, { y: 0.06, rx: 0.17, rz: 0.15, color: BD }, { y: 0.1, rx: 0.17, rz: 0.155 }, { y: 0.22, rx: 0.155, rz: 0.145 }, { y: 0.3, rx: 0.15, rz: 0.13 }],
        { sides: 8, color: B, capTop: false });
      ell(mb, 0, 0.38, 0.03, 0.145, 0.23, 0.15, skin, 7, 5, (i, j) => j <= 1 ? sh(skin, 0.08) : skin);
      LR(s => ell(mb, s * 0.055, 0.42, 0.155, 0.024, 0.02, 0.012, eyeC, 6, 3));
      ell(mb, 0, 0.48, 0.14, 0.05, 0.02, 0.03, sh(skin, 0.1), 5, 3);                       // brow bump
      // hood of skin folds wrapping the back and sides of the head
      mb.loft([{ y: 0.26, rx: 0.165, rz: 0.155 }, { y: 0.4, rx: 0.15, rz: 0.14 }], { sides: 8, color: BL, arc: [PI * 0.95, PI * 2.05], smooth: false });
    });
    att(m, 'jaw', mb => { mb.box(0, -0.01, 0.0, 0.07, 0.012, 0.02, '#402424'); });
    // long thick arms: bulging forearms and three long pale claws reaching past the knees
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      const el = [s * 0.08, -0.5, -0.06], wr = [s * 0.07, -1.1, 0.12];
      tube(mb, [0, 0, 0], el, 0.14, 0.1, B, 6); ball(mb, el, 0.11, BL, 6, 3);
      mb.sweep([el, lerp3(el, wr, 0.45), wr], [0.11, 0.15, 0.08], { sides: 6, color: B });
      ell(mb, wr[0], wr[1] - 0.04, wr[2] + 0.02, 0.08, 0.09, 0.08, BD, 5, 3);
      for (let k = -1; k <= 1; k++) {
        const b0 = [wr[0] + s * k * 0.035, wr[1] - 0.08, wr[2] + 0.04];
        mb.sweep([b0, V.add(b0, [s * k * 0.02, -0.16, 0.06]), V.add(b0, [s * k * 0.03, -0.3, 0.02])], [0.022, 0.016, 0], { sides: 4, color: Cl });
      }
    }));
    // bent legs with long clawed feet
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      const kn = [s * 0.03, -0.5, 0.1], an = [s * 0.02, -0.92, -0.06];
      tube(mb, [0, 0, 0], kn, 0.16, 0.12, B, 6); ball(mb, kn, 0.12, BL, 6, 3);
      tube(mb, kn, an, 0.12, 0.08, B, 6); ball(mb, an, 0.08, BD, 5, 3);
      for (let k = -1; k <= 1; k++) {
        const t = [an[0] + s * k * 0.07, -1.0, an[2] + 0.22 - Math.abs(k) * 0.04];
        tube(mb, an, t, 0.045, 0.03, BL, 4); spike(mb, t, [s * k * 0.2, -0.2, 1], 0.09, 0.022, Cl, 3);
      }
      spike(mb, an, [0, -0.3, -1], 0.12, 0.03, Cl, 3);                                      // heel spur
    }));
    // fused while the twin lives: hide the inner arm + frill and the outer leg; regrow them as it fades out
    let mate = null;
    const mateId = twin === 'ying' ? 'yang' : 'ying';
    const fused = [inner > 0 ? 'armL' : 'armR', inner > 0 ? 'finL' : 'finR', inner > 0 ? 'legFR' : 'legFL'];
    m.onPose = (mm) => {
      if (!mate) {
        try { const t = FF7.sceneMgr.top(); if (t && t.isBattle && (t.enemies || []).some(e => e.model === mm)) mate = t.enemies.find(e => e.id === mateId && e.model) || null; } catch (e) { mate = null; }
      }
      const k = mate && !mate.hidden && mate.model.visible !== false ? clamp(mate.model.alpha, 0, 1) : 0;
      const g = Math.max(0.01, 1 - k), lean = inner * 0.2 * k;
      fused.forEach(n => { const b = mm.bones[n]; b.visible = g > 0.03; b.scl[0] = b.scl[1] = b.scl[2] = g; });
      // the torsos splay apart from one shared waist; heads and arms stay upright, the kept leg steps under it
      mm.bones.body.rot[2] += lean; mm.bones.head.rot[2] -= lean; mm.bones.armL.rot[2] -= lean; mm.bones.armR.rot[2] -= lean;
      mm.bones[inner > 0 ? 'legFL' : 'legFR'].pos[0] -= inner * 0.1 * k;
    };
    m.height = 2.35; m.lungeScale = 0.9;
    if (twin === 'yang') FF7.creatures.anchor(m, 'ying', [0.46, 0, 0]);
    return m;
  }
  def('ying', (a) => yingYang(a, 'ying'));
  def('yang', (a) => yingYang(a, 'yang'));

  // ---- Dragon / Red Dragon: big winged dragons leaning far forward onto planted forelimbs; neck rising from the
  // shoulders to a horned head, belly plates down the chest, a long heavy tail trailing along the ground and
  // curling at the tip, wings raised high with a spiky leading edge
  function dragonBeast(a, o) {
    const m = rig(a);
    const B = o.body, BL = o.bodyL, BD = o.bodyD, P = 0.75;
    m.bone('body', 'root', [0, 1.3, -0.3], [P, 0, 0]);
    m.bone('neck', 'body', [0, 1.3, 0.05], [-P, 0, 0]);
    m.bone('head', 'neck', [0, 0.7, 0.42], [0.2, 0, 0]);
    m.bone('jaw', 'head', [0, -0.08, 0.16]);
    m.bone('armL', 'body', [0.5, 1.05, 0.12], [-P, 0, 0]); m.bone('armR', 'body', [-0.5, 1.05, 0.12], [-P, 0, 0]);
    m.bone('legBL', 'root', [0.48, 1.25, -0.45]); m.bone('legBR', 'root', [-0.48, 1.25, -0.45]);
    m.bone('tail', 'body', [0, -0.3, -0.2], [-P, 0, 0]);
    m.bone('wingL', 'body', [0.3, 1.05, -0.3], [-P, 0, 0]); m.bone('wingR', 'body', [-0.3, 1.05, -0.3], [-P, 0, 0]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.45, rx: 0.5, rz: 0.44 }, { y: 0.0, rx: 0.68, rz: 0.58 }, { y: 0.55, rx: 0.7, rz: 0.58 }, { y: 1.0, rx: 0.52, rz: 0.44 }, { y: 1.4, rx: 0.28, rz: 0.26 }], { sides: 7, color: B, smooth: false });
      const bands = o.bands ? (i) => (i % 2 ? o.belly : o.bands) : () => o.belly;
      mb.loft([{ y: -0.35, rx: 0.38, rz: 0.2, z: 0.4 }, { y: 0.0, rx: 0.5, rz: 0.24, z: 0.45 }, { y: 0.35, rx: 0.52, rz: 0.25, z: 0.45 }, { y: 0.7, rx: 0.45, rz: 0.22, z: 0.4 }, { y: 1.05, rx: 0.32, rz: 0.18, z: 0.3 }, { y: 1.35, rx: 0.16, rz: 0.1, z: 0.16 }]
        .map((r, i) => Object.assign(r, { color: bands(i) })), { sides: 6, color: o.belly });
      for (let i = 0; i < 6; i++) spike(mb, [0, 1.25 - i * 0.3, -0.38 - (i > 2 ? 0.06 : 0)], [0, 0.4, -1], 0.3, 0.07, o.spine, 3);
    });
    att(m, 'neck', mb => {
      mb.sweep([[0, -0.1, -0.05], [0, 0.3, 0.12], [0, 0.72, 0.42]], [0.3, 0.24, 0.18], { sides: 6, color: B });
      mb.sweep([[0, -0.02, 0.18], [0, 0.34, 0.3], [0, 0.66, 0.54]], [[0.2, 0.08], [0.17, 0.07], [0.12, 0.05]], { sides: 4, color: o.belly });
      for (let i = 0; i < 3; i++) spike(mb, [0, 0.12 + i * 0.22, -0.2 + i * 0.12], [0, 0.4, -1], 0.24, 0.06, o.spine, 3);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.08, 0.05, 0.24, 0.21, 0.26, BL, 6, 4);
      mb.frustum(0, 0.0, 0.24, 0.28, 0.2, 0.18, 0.13, 0.18, BL);
      mb.box(0, 0.02, 0.44, 0.18, 0.11, 0.14, BL);
      LR(s => {
        ball(mb, [s * 0.13, 0.17, 0.25], 0.03, o.eye, 5, 3);
        mb.sweep([[s * 0.12, 0.22, 0.0], [s * 0.2, 0.46, -0.14], [s * 0.24, 0.64, -0.34]], [0.07, 0.05, 0], { sides: 5, color: o.horn });
        for (let k = 0; k < 2; k++) spike(mb, [s * (0.18 + k * 0.03), 0.08, -0.04 - k * 0.1], [s * 1, 0.25, -0.6], 0.24 - k * 0.05, 0.045, o.spine, 4);
      });
      teeth(mb, [-0.08, -0.04, 0.5], [0.08, -0.04, 0.5], 5, 0.06, [0, -1, 0], '#fff');
    });
    att(m, 'jaw', mb => { mb.box(0, -0.05, 0.2, 0.2, 0.07, 0.3, o.mouth); teeth(mb, [-0.08, 0.0, 0.32], [0.08, 0.0, 0.32], 5, 0.05, [0, 1, 0], '#fff'); });
    // forelimbs planted on the ground ahead of the chest
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      const el = [s * 0.3, -0.8, 0.12], wr = [s * 0.24, -1.72, 0.5];
      ball(mb, [0, 0, 0], 0.3, B, 5, 4);
      tube(mb, [0, 0, 0], el, 0.26, 0.2, B, 5); ball(mb, el, 0.2, BL, 5, 3);
      tube(mb, el, wr, 0.2, 0.14, BL, 5);
      ell(mb, wr[0], wr[1] - 0.12, wr[2] + 0.1, 0.17, 0.11, 0.2, B, 5, 3);
      for (let k = -1; k <= 1; k++) spike(mb, [wr[0] + k * 0.1, wr[1] - 0.16, wr[2] + 0.26], [k * 0.3, -0.7, 0.8], 0.26, 0.05, o.claw, 3);
      spike(mb, el, [s * 0.3, 0.2, -1], 0.26, 0.06, o.spine, 3);
    }));
    // haunches and bent hind legs
    LR(s => att(m, s > 0 ? 'legBL' : 'legBR', mb => {
      const kn = [s * 0.06, -0.55, 0.32], an = [s * 0.06, -1.02, -0.12];
      ell(mb, 0, -0.08, 0.05, 0.28, 0.4, 0.38, B, 5, 4);
      tube(mb, [0, -0.1, 0.05], kn, 0.24, 0.18, B, 5); ball(mb, kn, 0.18, BL, 5, 3);
      tube(mb, kn, an, 0.17, 0.12, B, 5);
      tube(mb, an, [s * 0.06, -1.22, 0.1], 0.12, 0.1, BL, 4);
      for (let k = -1; k <= 1; k++) spike(mb, [s * 0.06 + k * 0.1, -1.24, 0.14], [k * 0.3, -0.3, 1], 0.28, 0.055, o.claw, 3);
    }));
    // long heavy tail trailing along the ground, curling up at the tip
    att(m, 'tail', mb => {
      const pts = mb.curvePts([[0, 0, 0], [0, -0.55, -0.55], [0.12, -0.98, -1.35], [0.45, -1.05, -2.25], [0.95, -0.95, -2.95], [1.35, -0.6, -3.2]], 1), n = pts.length;
      mb.sweep(pts, pts.map((p, i) => 0.36 * Math.pow(1 - i / (n - 1), 0.8) + 0.015), { sides: 5, color: B, colors: (k) => k > n - 5 ? BD : B });
      for (let i = 1; i < n - 2; i += 1) { const d = V.norm(V.sub(pts[i + 1], pts[i - 1])); spike(mb, V.add(pts[i], [0, 0.3 * Math.pow(1 - i / (n - 1), 0.8), 0]), [d[0] * 0.5, 1, d[2] * 0.5], 0.26 - i * 0.015, 0.05, o.spine, 3); }
    });
    // wings raised high: arm, four finger bones and a membrane, spikes along the leading edge
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const E = [s * 0.6, 0.8, -0.3], Wr = [s * 1.1, 1.5, -0.2];
      tube(mb, [0, 0, 0], E, 0.12, 0.09, B, 4); ball(mb, E, 0.09, BL, 5, 3); tube(mb, E, Wr, 0.09, 0.06, B, 4);
      const tips = [[s * 1.95, 1.9, -0.3], [s * 2.45, 1.15, -0.5], [s * 2.2, 0.35, -0.65], [s * 1.35, -0.1, -0.6]];
      const edge = [[0, -0.25, -0.1]];
      tips.slice().reverse().forEach((t, i, arr) => { tube(mb, Wr, t, 0.045, 0.012, B, 4); edge.push(t); if (i < arr.length - 1) edge.push(lerp3(lerp3(t, arr[i + 1], 0.5), Wr, 0.3)); });
      for (let i = 0; i < edge.length - 1; i++) tri2(mb, Wr, edge[i], edge[i + 1], o.wing, sh(o.wing, -0.25));
      tri2(mb, [0, 0, 0], E, Wr, o.wing, sh(o.wing, -0.25)); tri2(mb, [0, 0, 0], Wr, [0, -0.25, -0.1], o.wing, sh(o.wing, -0.25));
      // spiky fringe along the leading edge (shoulder - elbow - wrist - first finger)
      const lead = [[0, 0, 0], E, Wr, tips[0]];
      for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) {
        const p = lerp3(lead[j], lead[j + 1], (k + 0.5) / 3);
        mb.blade(p, [s * (0.2 + j * 0.3), 1, -0.3], 0.36 - j * 0.04, 0.16, 0.04, (j + k) % 2 ? o.fringe : o.fringe2, null, o.fringe2);
      }
    }));
    // the stock clips swing the tail down and rock the body, which would bury this ground-trailing tail: keep the
    // tail level with the world and turn the attack swing into a lift
    m.onPose = (mm) => { const t = mm.bones.tail, dB = mm.bones.body.rot[0] - P, dT = t.rot[0] + P; t.rot[0] = -P - dT * 0.6 - dB; };
    m.height = 4.45; m.scale = o.scale || 1; m.lungeScale = 0.6;
    return m;
  }
  // Dragon (Mt. Nibel): green with a purple belly, grey horns, green wings with an orange/yellow spiked edge
  def('dragon', (a) => dragonBeast(a, { body: '#3a5a1c', bodyL: '#4a7228', bodyD: '#2a4414', belly: '#6a2a5a', spine: '#e08020', horn: '#9098b8', claw: '#c090e0',
    eye: '#40e0e0', mouth: '#c03020', wing: '#3a6a20', fringe: '#e08020', fringe2: '#f0c030' }));

  // Sonic Speed: ochre-bodied raptor with long swept magenta wings
  def('sonic_speed', (a) => {
    const m = rig(a); m.floats = true;
    const B = '#b8883a', R = '#c03a4a', W = '#b050a8', WL = '#d078c0';
    m.bone('body', 'root', [0, 1.2, 0], [0.5, 0, 0]);
    m.bone('head', 'body', [0, 0.1, 0.36], [-0.4, 0, 0]);
    m.bone('wingL', 'body', [0.12, 0.12, 0.1]); m.bone('wingR', 'body', [-0.12, 0.12, 0.1]);
    m.bone('tail', 'body', [0, 0, -0.3]);
    m.bone('legFL', 'body', [0.08, -0.12, 0.05]); m.bone('legFR', 'body', [-0.08, -0.12, 0.05]);
    att(m, 'body', mb => { ell(mb, 0, 0, 0, 0.15, 0.14, 0.34, B, 8, 5, (i, j) => j > 3 ? '#8a6020' : B); limb(mb, [[0, 0.04, 0.2], [0, 0.1, 0.36]], [0.09, 0.07], R, 6); });
    att(m, 'head', mb => {
      ell(mb, 0, 0.02, 0.03, 0.08, 0.08, 0.1, R, 7, 5);
      mb.push(); mb.translate(0, 0.0, 0.11); mb.rotate(PI / 2 + 0.3, 0, 0); mb.prism(0, 0, 0, 0.035, 0, 0.12, 4, '#e8a020'); mb.pop();
      LR(s => ball(mb, [s * 0.05, 0.05, 0.08], 0.014, '#f0f040'));
      mb.blade([0, 0.07, -0.02], [0, 0.4, -1], 0.2, 0.05, 0.02, R);
    });
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const pts = [[0, 0, 0.15], [s * 0.4, 0.25, 0.0], [s * 0.9, 0.35, -0.35], [s * 1.25, 0.3, -0.75], [s * 0.7, 0.12, -0.45], [s * 0.35, 0.02, -0.3], [0, 0, -0.2]];
      fan2(mb, [s * 0.05, 0, 0], pts, W, WL);
      tube(mb, [0, 0, 0.1], [s * 0.4, 0.25, 0.0], 0.03, 0.02, R, 4); tube(mb, [s * 0.4, 0.25, 0.0], [s * 1.25, 0.3, -0.75], 0.02, 0.005, WL, 4);
    }));
    att(m, 'tail', mb => { for (let i = -1; i <= 1; i++) mb.blade([i * 0.03, 0, 0], [i * 0.3, -0.1, -1], 0.4, 0.08, 0.02, W, null, WL); });
    const leg = meshOf(mb => { limb(mb, [[0, 0, 0], [0, -0.18, 0.08], [0, -0.3, 0.02]], [0.035, 0.025, 0.02], '#a8a040', 5); for (let k = -1; k <= 1; k++) spike(mb, [0, -0.3, 0.02], [k * 0.4, -0.4, 1], 0.08, 0.015, '#e0e0e0', 3); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 1.55; m.lungeScale = 1.3;
    return m;
  });

  // ---- Twin Brain family (Twin Brain, Chekhov, Vargid Police): one hovering stake-shaped body that tapers from
  // a chest bulge to a single hooked point, a distinct boxy head with six diamond eyes and two bent horn lobes,
  // a diamond pattern down the front and four long curling arms with clawed hands
  function twinBrain(a, o) {
    const m = rig(a); m.floats = true;
    const BD = sh(o.body, -0.22), BL = sh(o.body, 0.12);
    m.bone('body', 'root', [0, 0.42, 0]);
    m.bone('head', 'body', [0, 1.3, 0.01]);
    m.bone('armL', 'body', [0.15, 1.12, 0.02]); m.bone('armR', 'body', [-0.15, 1.12, 0.02]);
    m.bone('t0', 'body', [0.11, 0.8, 0.03]); m.bone('t1', 'body', [-0.11, 0.8, 0.03]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.28, rx: 0.012, rz: 0.012, color: BD }, { y: 0.05, rx: 0.05, rz: 0.045, color: BD }, { y: 0.45, rx: 0.09, rz: 0.075 }, { y: 0.85, rx: 0.15, rz: 0.11 },
        { y: 1.12, rx: 0.2, rz: 0.14, rzf: 0.16, color: BL }, { y: 1.3, rx: 0.16, rz: 0.12 }], { sides: 8, color: o.body });
      // diamond pattern down the front, shrinking toward the point
      const rzAt = (y) => y > 0.85 ? 0.11 + (y - 0.85) / 0.27 * 0.05 : y > 0.45 ? 0.075 + (y - 0.45) / 0.4 * 0.035 : 0.045 + (y - 0.05) / 0.4 * 0.03;
      for (let i = 0; i < 7; i++) {
        const y = 1.12 - i * 0.12, w = 0.055 - i * 0.005, h = 0.07 - i * 0.004;
        mb.panel([[0, y + h], [w, y], [0, y - h], [-w, y]], 0.924 * rzAt(y + h * 0.8) + 0.006, 0.014, o.mark);
      }
      // hooked pointed foot
      mb.lock([0, -0.2, 0], [0, -1, 0.25], [0, -0.35, 1], 0.36, 0.07, 0.04, o.claw, null, o.tip || '#d8b060');
    });
    att(m, 'head', mb => {
      mb.loft([{ y: -0.02, rx: 0.15, rz: 0.12 }, { y: 0.16, rx: 0.17, rz: 0.125 }, { y: 0.36, rx: 0.22, rz: 0.12, color: BL }, { y: 0.44, rx: 0.18, rz: 0.1 }], { sides: 8, color: o.body, sq: 3 });
      // six slanted diamond eyes in three rows
      for (let r = 0; r < 3; r++) LR(s => {
        const x = s * (0.075 + r * 0.004), y = 0.34 - r * 0.08, w = 0.055, h = 0.026;
        mb.panel([[x - w, y - s * 0.014], [x, y + h], [x + w, y + s * 0.014], [x, y - h]], 0.135, 0.02, o.eye);
      });
      mb.panel([[-0.035, 0.1], [0.035, 0.1], [0, 0.03]], 0.13, 0.014, BD);                 // chin notch
      // two thick horn lobes: up, then bent outward like folded ears
      LR(s => mb.sweep([[s * 0.08, 0.4, -0.02], [s * 0.11, 0.58, -0.04], [s * 0.18, 0.68, -0.03], [s * 0.32, 0.66, 0.02]], [[0.065, 0.045], [0.06, 0.04], [0.055, 0.035], [0.02, 0.015]], { sides: 6, color: o.lobe }));
    });
    // four long arms: out from the body, a bent elbow, forearm curling down and in, three hooked claws
    const arm = (s, up) => meshOf(mb => {
      const L = up ? 1 : 0.8;
      const p = [[0, 0, 0], [s * 0.36 * L, 0.06, 0.06], [s * 0.5 * L, -0.12 * L, 0.14], [s * 0.46 * L, -0.34 * L, 0.24], [s * 0.36 * L, -0.42 * L, 0.3]];
      limb(mb, p, [0.05, 0.042, 0.038, 0.032, 0.026], [o.body, o.body, o.body, sh(o.claw, 0.1)], 6);
      const w = p[4];
      for (let k = -1; k <= 1; k++) mb.lock(w, [s * 0.1 * k - s * 0.3, -1, 0.2 + 0.2 * k], [-s * 0.6, -0.2, 0.3], 0.14, 0.03, 0.02, o.claw, null, o.tip || '#d8b060');
    });
    m.attach('armL', arm(1, true)); m.attach('armR', arm(-1, true));
    m.attach('t0', arm(1, false)); m.attach('t1', arm(-1, false));
    m.height = 2.5; m.lungeScale = 1.0;
    return m;
  }
  def('twin_brain', (a) => twinBrain(a, { body: '#8a80c8', lobe: '#5a3aa8', mark: '#7a1830', claw: '#c050c0', eye: '#f0d020' }));
  // Disc 1 (Shinra HQ escape): FF7 reuses the Twin Brain model for Vargid Police, in peach with red eyes
  def('vargid_police', (a) => twinBrain(a, { body: '#e8a088', lobe: '#7a3aa0', mark: '#4a2268', claw: '#9a50c0', eye: '#e01818' }));

  // ---- Zuu: giant blue roc lunging forward on huge solid feathered wings (dark coverts over broad blue flight
  // feathers), a big head with a large hooked yellow beak, red eye mask and a row of pink-red crest spikes down the
  // neck, blue thighs and orange legs thrust forward with pink talons out
  def('zuu', (a) => {
    const m = rig(a); m.floats = true;
    const B = '#2a4aa0', BL = '#3a70c8', BD = '#1a2a6a', Y = '#e0a020', Bk = '#f0b020';
    m.bone('body', 'root', [0, 1.8, 0], [0.55, 0, 0]);
    m.bone('head', 'body', [0, 0.5, 0.12], [-0.25, 0, 0]);
    m.bone('jaw', 'head', [0, -0.04, 0.2]);
    m.bone('wingL', 'body', [0.24, 0.3, 0.02], [-0.55, 0, 0]); m.bone('wingR', 'body', [-0.24, 0.3, 0.02], [-0.55, 0, 0]);
    m.bone('tail', 'body', [0, -0.4, -0.1]);
    m.bone('legFL', 'body', [0.16, -0.3, 0.12], [-0.55, 0, 0]); m.bone('legFR', 'body', [-0.16, -0.3, 0.12], [-0.55, 0, 0]);
    att(m, 'body', mb => {
      ell(mb, 0, 0, 0, 0.32, 0.48, 0.3, B, 8, 6, (i, j) => j > 3 ? BD : B);
      ell(mb, 0, 0.1, 0.16, 0.22, 0.3, 0.14, BL, 7, 4);                                        // breast
      tube(mb, [0, 0.3, 0.05], [0, 0.52, 0.12], 0.18, 0.15, B, 7);                             // neck
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.06, 0.04, 0.24, 0.22, 0.26, B, 8, 5);
      LR(s => { ell(mb, s * 0.12, 0.1, 0.18, 0.09, 0.06, 0.06, '#c02030', 6, 4); eye(mb, s * 0.14, 0.11, 0.21, 0.03, '#f0f0f0', '#c02020'); });   // red eye mask
      mb.sweep(mb.curvePts([[0, 0.08, 0.2], [0, 0.08, 0.4], [0, -0.04, 0.56], [0, -0.18, 0.55]], 2), [[0.1, 0.09], [0.095, 0.085], [0.08, 0.07], [0.06, 0.05], [0.04, 0.035], [0.02, 0.018], [0, 0]], { sides: 5, color: Bk });
      for (let i = 0; i < 7; i++) spike(mb, [0, 0.24 - i * 0.05, 0.08 - i * 0.07], [0, 1, -0.5], 0.2 - i * 0.012, 0.045, i % 2 ? '#e02060' : '#f03050', 3);
    });
    att(m, 'jaw', mb => { mb.sweep([[0, 0.0, 0.02], [0, -0.04, 0.18], [0, -0.06, 0.28]], [[0.07, 0.04], [0.05, 0.03], [0, 0]], { sides: 4, color: '#c08018' }); teeth(mb, [-0.04, 0.0, 0.1], [0.04, 0.0, 0.1], 3, 0.03, [0, 1, 0], '#fff'); });
    // huge wings: a dark arm, a band of dark coverts, then broad overlapping blue flight feathers
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const E = [s * 0.62, 0.4, -0.1], Wr = [s * 1.28, 0.5, -0.16], T = [s * 1.8, 0.36, -0.22];
      tube(mb, [0, 0, 0], E, 0.13, 0.1, BD, 6); ball(mb, E, 0.1, BD, 6, 4); tube(mb, E, Wr, 0.1, 0.07, BD, 6); tube(mb, Wr, T, 0.07, 0.02, BD, 5);
      const arm = (t) => t < 0.35 ? lerp3([0, 0, 0], E, t / 0.35) : t < 0.7 ? lerp3(E, Wr, (t - 0.35) / 0.35) : lerp3(Wr, T, (t - 0.7) / 0.3);
      for (let i = 0; i < 13; i++) {
        const t = i / 12, p = V.add(arm(t), [0, -0.06, 0.02]), d = [s * (0.05 + t * 1.2), -1 + t * 0.6, -0.15];
        mb.blade(p, d, 0.56 + 0.28 * S(t * PI) + 0.12 * t, 0.32, 0.04, i % 2 ? BL : sh(BL, -0.08), V.cross(d, [0, 0, 1]), '#6ab0f0');
        if (i % 2 === 0 && i < 12) mb.blade(V.add(arm(t + 0.04), [0, 0.0, 0.04]), d, 0.3, 0.34, 0.04, BD, V.cross(d, [0, 0, 1]), B);   // coverts
      }
    }));
    att(m, 'tail', mb => { for (let i = -2; i <= 2; i++) { const d = [i * 0.3, -1, -0.5]; mb.blade([i * 0.06, 0, 0], d, 0.55, 0.18, 0.03, BL, [1, 0, 0], '#6ab0f0'); } });
    // legs thrust forward, talons out
    const leg = (s) => meshOf(mb => {
      const kn = [s * 0.04, -0.2, 0.28], an = [s * 0.02, -0.5, 0.5];
      ell(mb, 0, -0.04, 0.06, 0.14, 0.18, 0.16, BD, 6, 4);
      tube(mb, [0, -0.05, 0.06], kn, 0.11, 0.08, BD, 6); ball(mb, kn, 0.08, Y, 6, 4);
      tube(mb, kn, an, 0.07, 0.055, Y, 6);
      for (let k = -1; k <= 1; k++) { const t = [an[0] + k * 0.1, an[1] - 0.12, an[2] + 0.16]; tube(mb, an, t, 0.04, 0.03, Y, 4); spike(mb, t, [k * 0.2, -1, 0.4], 0.12, 0.03, '#f090a0', 3); }
      tube(mb, an, [an[0], an[1] - 0.1, an[2] - 0.12], 0.035, 0.025, Y, 4);
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 2.8; m.lungeScale = 0.9;
    return m;
  });

  // Kyuvilduns: leggy green grasshopper-mantis with a pointed red-eyed head
  def('kyuvilduns', (a) => {
    const m = rig(a);
    const G = '#3a9a30', GD = '#2a6a20', L = '#7ac040';
    m.bone('body', 'root', [0, 0.62, 0], [-0.45, 0, 0]);
    m.bone('head', 'body', [0, 0.4, 0.05], [0.8, 0, 0]);
    m.bone('armL', 'body', [0.08, 0.3, 0.06]); m.bone('armR', 'body', [-0.08, 0.3, 0.06]);
    m.bone('legBL', 'body', [0.1, -0.05, 0]); m.bone('legBR', 'body', [-0.1, -0.05, 0]);
    m.bone('legFL', 'body', [0.08, 0.15, 0.05]); m.bone('legFR', 'body', [-0.08, 0.15, 0.05]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.35, rx: 0.04, rz: 0.04 }, { y: -0.15, rx: 0.11, rz: 0.1 }, { y: 0.15, rx: 0.12, rz: 0.1 }, { y: 0.4, rx: 0.08, rz: 0.07 }], { sides: 6, color: G, smooth: false });
      LR(s => tri2(mb, [s * 0.05, 0.3, -0.08], [s * 0.15, -0.35, -0.12], [s * 0.02, -0.3, -0.14], L, GD));
    });
    att(m, 'head', mb => {
      mb.loft([{ y: 0, rx: 0.07, rz: 0.07 }, { y: 0.12, rx: 0.08, rz: 0.06 }, { y: 0.3, rx: 0.02, rz: 0.02 }], { sides: 6, color: G });
      LR(s => { ball(mb, [s * 0.06, 0.1, 0.03], 0.025, '#e02020'); limb(mb, [[s * 0.03, 0.12, -0.03], [s * 0.2, 0.4, -0.3], [s * 0.3, 0.7, -0.6]], [0.008, 0.006, 0.003], GD, 3); });
    });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => limb(mb, [[0, 0, 0], [s * 0.1, 0.15, 0.15], [s * 0.12, -0.08, 0.28]], [0.025, 0.02, 0.01], G, 4)));
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => limb(mb, [[0, 0, 0], [s * 0.25, 0.05, 0.2], [s * 0.3, -0.45, 0.35]], [0.02, 0.018, 0.008], G, 4)));
    LR(s => att(m, s > 0 ? 'legBL' : 'legBR', mb => limb(mb, [[0, 0, 0], [s * 0.2, 0.45, -0.25], [s * 0.3, -0.35, -0.55]], [0.04, 0.025, 0.01], [L, G], 4)));
    m.height = 1.2; m.lungeScale = 1.3;
    return m;
  });

  // ---- Screamer (and its look-alike Staniv): massive grey gorilla-brute - huge chest and shoulders with a wide low
  // head sunk between them, a big red shield-face emblem (gold rim) on the chest, thick arms with banded forearms and
  // long hooked claws, thighs flaring into shaggy green lower legs; one arm raised with a spiked club (Screamer) or a
  // ball and chain (Staniv, who also wears green fur patches)
  function gorilla(a, o) {
    const m = rig(a);
    const B = o.body, BD = sh(o.body, -0.18), BL = sh(o.body, 0.1);
    m.bone('body', 'root', [0, 1.15, 0], [0.22, 0, 0]);
    m.bone('head', 'body', [0, 0.8, 0.2], [-0.12, 0, 0]);
    m.bone('jaw', 'head', [0, -0.06, 0.14]);
    m.bone('armL', 'body', [0.58, 0.62, 0.04], [-0.22, 0, 0.12]); m.bone('armR', 'body', [-0.58, 0.62, 0.04], [-2.4, 0, -0.2]);
    m.bone('legFL', 'root', [0.26, 1.08, -0.04]); m.bone('legFR', 'root', [-0.26, 1.08, -0.04]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.26, rx: 0.34, rz: 0.26 }, { y: 0.14, rx: 0.42, rz: 0.32 }, { y: 0.5, rx: 0.62, rz: 0.42, color: BL }, { y: 0.74, rx: 0.56, rz: 0.38 }, { y: 0.88, rx: 0.3, rz: 0.26 }], { sides: 9, color: B, smooth: false });
      mb.loft([{ y: -0.3, rx: 0.36, rz: 0.28 }, { y: -0.06, rx: 0.4, rz: 0.3 }], { sides: 9, color: o.hip });
      // shield-shaped red face emblem with a gold rim on the chest
      const z = 0.46;
      mb.panel([[-0.17, 0.66], [0.17, 0.66], [0.15, 0.44], [0, 0.3], [-0.15, 0.44]], z, 0.04, o.crestRim);
      mb.panel([[-0.13, 0.63], [0.13, 0.63], [0.12, 0.45], [0, 0.34], [-0.12, 0.45]], z + 0.025, 0.03, o.crest);
      LR(s => mb.box(s * 0.05, 0.55, z + 0.045, 0.05, 0.02, 0.01, '#200808'));
      mb.box(0, 0.44, z + 0.045, 0.08, 0.018, 0.01, '#200808');
      // green fur hanging over chest sides, shoulders and belly (Staniv)
      if (o.fur) {
        LR(s => { for (let i = 0; i < 6; i++) mb.blade([s * (0.2 + i * 0.07), 0.76 - i * 0.07, 0.34 - i * 0.05], [s * 0.3, -1, 0.35], 0.42, 0.26, 0.05, i % 2 ? o.fur : sh(o.fur, 0.1), [1, 0, -s * 0.3], sh(o.fur, -0.25)); });
        for (let i = 0; i < 5; i++) mb.blade([(i - 2) * 0.13, 0.22, 0.36], [(i - 2) * 0.2, -1, 0.3], 0.34, 0.2, 0.05, i % 2 ? o.fur : sh(o.fur, 0.1), [1, 0, 0], sh(o.fur, -0.25));
      }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0.04, 0.27, 0.16, 0.22, B, 8, 5);
      ell(mb, 0, 0.1, 0.18, 0.24, 0.05, 0.08, BD, 7, 3);                                       // heavy brow
      LR(s => ball(mb, [s * 0.09, 0.07, 0.24], 0.022, '#f0f0f0'));
    });
    att(m, 'jaw', mb => { ell(mb, 0, -0.03, 0.06, 0.2, 0.06, 0.14, BD, 7, 3); teeth(mb, [-0.07, 0.0, 0.17], [0.07, 0.0, 0.17], 4, 0.035, [0, 1, 0], '#fff'); });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      const el = [s * 0.12, -0.44, 0.02], wr = [s * 0.1, -0.92, 0.14];
      ball(mb, [s * 0.04, 0, 0], 0.24, BL, 7, 5);
      if (o.fur) for (let i = 0; i < 4; i++) { const an = (i / 4) * PI * 2; mb.blade([s * 0.04 + C(an) * 0.2, -0.1, S(an) * 0.2], [C(an) * 0.4, -1, S(an) * 0.4], 0.34, 0.2, 0.05, i % 2 ? o.fur : sh(o.fur, 0.1), [-S(an), 0, C(an)], sh(o.fur, -0.25)); }   // shaggy shoulder
      tube(mb, [0, 0, 0], el, 0.18, 0.15, B, 7); ball(mb, el, 0.15, B, 6, 4);
      tube(mb, el, wr, 0.16, 0.13, o.arm, 7);
      for (let k = 0; k < 5; k++) { const p = lerp3(el, wr, 0.15 + k * 0.17); mb.push(); mb.translate(p[0], p[1], p[2]); mb.loft([{ y: -0.03, rx: 0.165 - k * 0.006, rz: 0.165 - k * 0.006 }, { y: 0.03, rx: 0.155 - k * 0.006, rz: 0.155 - k * 0.006 }], { sides: 7, color: o.band, capTop: false, capBottom: false }); mb.pop(); }
      ell(mb, wr[0], wr[1] - 0.08, wr[2] + 0.02, 0.12, 0.1, 0.12, o.arm, 6, 4);
      for (let k = -1; k <= 1; k++) mb.sweep(mb.curvePts([[wr[0] + k * 0.06, wr[1] - 0.14, wr[2] + 0.06], [wr[0] + k * 0.08, wr[1] - 0.3, wr[2] + 0.14], [wr[0] + k * 0.08, wr[1] - 0.44, wr[2] + 0.06]], 1), [0.035, 0.025, 0], { sides: 4, color: o.claw });
      if (s < 0 && o.flail) {
        for (let k = 0; k < 7; k++) { mb.push(); mb.translate(wr[0], wr[1] - 0.12 - k * 0.09, wr[2] + 0.1 + k * 0.05); mb.rotate(0.4, k * 1.2, 0); mb.frustum(0, 0, 0, 0.001, 0.001, 0.08, 0.03, 0.05, '#4a4a52'); mb.frustum(0, 0.05, 0, 0.08, 0.03, 0.001, 0.001, 0.05, '#5a5a62'); mb.pop(); }
        ell(mb, wr[0], wr[1] - 0.86, wr[2] + 0.5, 0.24, 0.24, 0.24, o.club, 8, 6);
        for (let k = 0; k < 8; k++) { const an = k / 8 * PI * 2; spike(mb, [wr[0] + C(an) * 0.22, wr[1] - 0.86 + S(an) * 0.22, wr[2] + 0.5], [C(an), S(an), 0.1], 0.12, 0.04, sh(o.club, 0.3), 3); }
      } else if (s < 0) {
        tube(mb, [wr[0], wr[1] - 0.06, wr[2] + 0.04], [wr[0], wr[1] - 0.16, wr[2] + 0.8], 0.04, 0.06, o.club, 6);
        ell(mb, wr[0], wr[1] - 0.2, wr[2] + 0.92, 0.16, 0.16, 0.16, o.club, 7, 5);
        for (let k = 0; k < 6; k++) { const an = k / 6 * PI * 2; spike(mb, [wr[0] + C(an) * 0.14, wr[1] - 0.2 + S(an) * 0.14, wr[2] + 0.92], [C(an), S(an), 0.2], 0.12, 0.035, sh(o.club, 0.3), 3); }
      }
    }));
    // thick thighs flaring into shaggy lower legs
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      const kn = [s * 0.05, -0.46, 0.1];
      tube(mb, [0, 0, 0], kn, 0.2, 0.16, B, 7); ball(mb, kn, 0.16, B, 6, 4);
      mb.loft([{ y: kn[1], rx: 0.17, rz: 0.17, x: kn[0], z: kn[2] }, { y: -0.78, rx: 0.22, rz: 0.22, x: s * 0.06, z: 0.04 }, { y: -1.06, rx: 0.3, rz: 0.32, x: s * 0.07, z: 0.06 }], { sides: 8, color: o.leg });
      for (let k = 0; k < 9; k++) { const an = k / 9 * PI * 2; mb.blade([s * 0.07 + C(an) * 0.26, -0.92, 0.06 + S(an) * 0.28], [C(an) * 0.5, -1, S(an) * 0.5], 0.18, 0.14, 0.04, k % 2 ? o.leg : sh(o.leg, -0.15), [-S(an), 0, C(an)]); }
    }));
    m.height = 3.4; m.lungeScale = 0.8;
    return m;
  }
  def('screamer', (a) => gorilla(a, { body: '#7a8090', arm: '#4a4466', band: '#34304a', hip: '#3a3e4a', leg: '#2a5a3a', crest: '#c02030', crestRim: '#c89030', claw: '#303038', club: '#303038' }));

  // ---- Lost Number: hunched ape-demon, torso pitched far forward, long arms, split down the middle: its right
  // half red with a huge swept-back spiky mane, an orange-yellow scythe forearm and a spike leg, its left half
  // purple with a ridged skull, toothy grin and green claws; gold chest. At half HP it TRANSFORMS into one
  // complete creature: lost_number_b (Magical Half: all-red maned beast, limbs grading to orange, green claws)
  // or lost_number_c (Physical Half: all-purple brute with a huge wide fanged head, green claws).
  function lostNumber(a, part) {
    const m = rig(a);
    const Rd = '#c81818', RdL = '#e02020', RdD = '#8a1010', Or = '#e05818', Am = '#f0a020', Yl = '#f0c840',
      Pu = '#6a28c0', PuL = '#8a44e0', PuD = '#40187a', Gd = part === 'mag' ? '#b07018' : '#d89020', Gr = '#1a8a50', GrD = '#0e5a34',
      Cl = '#e8b890', Ey = '#f0c020', Mo = '#3a0808', Th = '#f4f0e0';
    const kind = (s) => part === 'mag' ? 'R' : part === 'phys' ? 'P' : (s < 0 ? 'R' : 'P');
    const colX = (x) => kind(x < 0 ? -1 : 1) === 'R' ? Rd : Pu;
    const P = part === 'phys' ? 0.5 : part === 'mag' ? 0.72 : 0.8;          // forward pitch of the torso
    const hy = 1.12, hz = -0.25, L = 0.9;
    const hash = (i) => { const v = S(i * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); };
    m.bone('body', 'root', [0, hy, hz], [P, 0, 0]);
    m.bone('head', 'body', [0, L + 0.02, part === 'phys' ? 0.12 : 0.18], [-P + 0.15, 0, 0]);
    m.bone('jaw', 'head', [0, -0.08, 0.12]);
    m.bone('armL', 'body', [0.52, L * 0.82, 0.05], [-P, 0, 0]); m.bone('armR', 'body', [-0.52, L * 0.82, 0.05], [-P, 0, 0]);
    m.bone('legFL', 'root', [0.34, hy - 0.06, hz - 0.05]); m.bone('legFR', 'root', [-0.34, hy - 0.06, hz - 0.05]);
    // ---- torso: deep barrel, broad shoulders, gold V down the chest
    const rings = [[-0.22, 0.3, 0.26], [0.1, 0.4, 0.34], [0.42, 0.52, 0.42], [0.72, 0.6, 0.44], [0.92, 0.44, 0.36], [1.04, 0.22, 0.22]];
    att(m, 'body', mb => {
      mb.loft(rings.map(([y, rx, rz], j) => ({ y, rx, rz, rzf: rz * (j >= 2 && j <= 3 ? 1.12 : 1), colors: (i, n) => {
        const an = PI / n + (i + 0.5) * PI * 2 / n, fr = S(an);
        const w = [0, 0.14, 0.42, 0.62, 0.36, 0][j];                      // half-width of the gold V (in cos units)
        if (fr > 0.3 && Math.abs(C(an)) < w) return j === 1 ? sh(Gd, -0.15) : Gd;
        return colX(C(an));
      } })), { sides: 10, smooth: false, color: part === 'phys' ? PuD : part === 'mag' ? RdD : '#5a1850' });
      // mane down the red half of the back
      const backs = part === 'phys' ? [] : part === 'mag' ? [1, -1] : [-1];
      backs.forEach(s => { for (let i = 0; i < 5; i++) {
        const y = 0.95 - i * 0.2, bx = s * (0.14 + 0.1 * (i % 2)), h = hash(i + (s > 0 ? 7 : 0));
        mb.lock([bx, y, -0.26], [s * 0.6, -0.3, -1], [s * 0.7, -1, -0.4], 0.85 - i * 0.07 + h * 0.15, 0.26, 0.06, i % 2 ? RdD : Rd, null, RdL);
      } });
    });
    // ---- head
    att(m, 'head', mb => {
      if (part === 'phys') {
        // huge wide head: ridged brow, slanted yellow eyes, a row of white fangs
        const zS = (x, y) => 0.1 + 0.42 * Math.sqrt(Math.max(0, 1 - (x / 0.52) ** 2 - ((y - 0.1) / 0.38) ** 2));   // face surface
        ell(mb, 0, 0.1, 0.1, 0.52, 0.38, 0.42, Pu, 10, 7, (i, j) => j <= 1 ? PuL : Pu);
        ell(mb, 0, 0.23, 0.44, 0.4, 0.08, 0.1, PuL, 8, 4);                 // brow ridge
        LR(s => {
          mb.blade([s * 0.34, 0.3, zS(0.34, 0.3) - 0.02], [-s, -0.5, 0.3], 0.3, 0.13, 0.09, PuD);   // angry V brow
          mb.blade([s * 0.22, 0.44, 0.16], [s * 0.3, 0.1, -1], 0.42, 0.15, 0.07, PuD);              // skull ridges
          mb.push(); mb.translate(s * 0.18, 0.12, zS(0.18, 0.12) - 0.005); mb.rotate(0, 0, s * 0.4);
          mb.sphere(0, 0, 0, 0.13, 0.05, 0.035, Ey, 6, 4, false);
          mb.pop();
        });
        mb.blade([0, 0.47, 0.22], [0, 0.12, -1], 0.48, 0.16, 0.08, PuD);                 // central ridge
        spike(mb, [0, 0.03, zS(0, 0.03) - 0.02], [0, -0.7, 0.6], 0.09, 0.05, '#200830', 3);   // nose notch
        ell(mb, 0, -0.1, zS(0, -0.1) - 0.05, 0.4, 0.05, 0.07, Mo, 10, 4);                      // mouth
        for (let i = 0; i < 9; i++) { const x = -0.3 + i * 0.075; spike(mb, [x, -0.07, zS(x, -0.07) + 0.01], [0, -1, 0.15], 0.08 + (i % 2) * 0.03, 0.02, Th, 3); }
        LR(s => spike(mb, [s * 0.36, -0.04, zS(0.36, -0.04) + 0.01], [s * 0.1, -1, 0.15], 0.19, 0.03, Th, 3));  // long corner fangs
      } else if (part === 'mag') {
        // the face hides in the mane: dark red-brown mask, yellow eyes, a starburst of red blades
        ell(mb, 0, 0.06, 0.1, 0.3, 0.26, 0.3, '#6a2410', 8, 6);
        LR(s => { mb.push(); mb.translate(s * 0.12, 0.07, 0.37); mb.rotate(0, 0, s * 0.3); mb.sphere(0, 0, 0, 0.06, 0.025, 0.03, Ey, 6, 4, false); mb.pop(); });
        ell(mb, 0, -0.1, 0.34, 0.16, 0.035, 0.05, Mo, 8, 3);
        teeth(mb, [-0.12, -0.08, 0.37], [0.12, -0.08, 0.37], 5, 0.05, [0, -1, 0.1], Th, 0.014);
        for (let i = 0; i < 18; i++) {                                                   // radial crown
          const t = (i % 9) / 8, back = i >= 9, an = -1.95 + t * 3.9, h = hash(i + 20);
          const d = [S(an) * 1.1, C(an) * 0.6 + 0.15, back ? -1 : -0.35 - h * 0.2];
          mb.lock([S(an) * 0.22, 0.1 + C(an) * 0.2, back ? -0.08 : 0.08], d, [d[0] * 1.1, d[1] - 0.45, d[2] - 0.2], (back ? 0.85 : 0.72) + h * 0.3, back ? 0.26 : 0.22, 0.06, i % 3 ? Rd : RdL, null, i % 2 ? RdL : '#f04030');
        }
        for (let i = 0; i < 7; i++) {                                                     // bangs over the face
          const x = -0.24 + i * 0.08, h = hash(i + 50);
          mb.lock([x, 0.24, 0.2], [x * 0.8, 0.2, 1], [x * 1.4, -1, 0.35], 0.34 + h * 0.18, 0.13, 0.04, i % 2 ? Rd : RdD, null, RdL);
        }
      } else {
        // split head: purple ridged skull and grin on the left, red half buried in the mane on the right
        ell(mb, 0, 0.08, 0.12, 0.3, 0.25, 0.3, Pu, 10, 7, (i, j, p) => p[0] < -0.02 ? '#9a3a14' : j <= 1 ? PuL : Pu);
        mb.blade([0.1, 0.3, 0.2], [0.05, -0.55, 1], 0.3, 0.2, 0.1, PuL);                // pointed purple brow-beak
        for (let k = 0; k < 3; k++) mb.blade([0.08 + k * 0.07, 0.3 - k * 0.04, 0.12 - k * 0.04], [0.35, 0.5, -1], 0.3, 0.09, 0.06, PuD);  // ridges
        mb.blade([0.28, 0.2, 0.3], [-1, -0.45, 0.3], 0.2, 0.08, 0.06, PuD);             // brow over the purple eye
        LR(s => { mb.push(); mb.translate(s * 0.14, 0.1, 0.38); mb.rotate(0, 0, s * 0.35); mb.sphere(0, 0, 0, 0.065, 0.026, 0.03, Ey, 6, 4, false); mb.pop(); });
        ell(mb, 0, -0.08, 0.34, 0.22, 0.04, 0.06, Mo, 8, 3);
        teeth(mb, [-0.18, -0.05, 0.38], [0.2, -0.05, 0.38], 7, 0.08, [0, -1, 0.1], Th, 0.016);
        // the mane: swept back and out from the red half
        for (let i = 0; i < 18; i++) {
          const layer = i % 3, th = 0.12 + Math.floor(i / 3) * 0.3, h = hash(i + 3);         // th: angle from the crown towards -x
          const base = [-S(th) * 0.24, 0.1 + C(th) * 0.24, 0.14 - layer * 0.12];
          const d = [-S(th) * 0.8 - 0.45, C(th) * 0.45 + 0.2 - layer * 0.15, -1];
          mb.lock(base, d, [d[0] - 0.15, d[1] - 0.45, d[2] - 0.2], 0.95 + h * 0.3 - layer * 0.12, 0.27, 0.06, layer === 1 ? RdD : Rd, null, layer === 0 ? RdL : '#f04030');
        }
        for (let i = 0; i < 4; i++) mb.lock([-0.02 - i * 0.07, 0.3, 0.26], [-0.3, 0.3, 1], [-0.3, -1, 0.3], 0.34, 0.14, 0.04, i % 2 ? RdD : Rd, null, RdL);  // locks over the red eye
      }
    });
    att(m, 'jaw', mb => {
      const w = part === 'phys' ? 0.42 : 0.24, zc = part === 'phys' ? 0.16 : 0.14, ry = part === 'phys' ? 0.12 : 0.08;
      ell(mb, 0, -0.06, zc, w, ry, w * 0.82, Pu, 8, 4, (i, j, p) => colX(p[0]) === Rd ? '#b0561c' : PuD);
      const tz = zc + w * 0.82 * 0.87 + 0.01;
      teeth(mb, [-w * 0.6, -0.06 + ry * 0.5, tz - w * 0.12], [w * 0.6, -0.06 + ry * 0.5, tz - w * 0.12], part === 'phys' ? 7 : 5, 0.05, [0, 1, 0.1], Th, 0.014);
    });
    // ---- arms (frames world-aligned)
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      const k = kind(s), big = part === 'phys' ? 1.12 : 1;
      ball(mb, [s * 0.04, 0.02, 0], 0.24 * big, k === 'R' ? Rd : Pu, 8, 5);
      if (k === 'R' && !part) {
        // right arm: red shoulder into an orange elbow and a long yellow scythe forearm, red fur hanging below
        const el = [s * 0.5, -0.3, 0.25];
        mb.sweep([[0, 0, 0], [s * 0.26, -0.12, 0.12], el], [0.18, 0.16, 0.14], { sides: 7, color: Or, colors: (q) => [Rd, Or][q] });
        ball(mb, el, 0.15, Or, 7, 4);
        mb.sweep(mb.curvePts([el, [s * 0.66, -0.62, 0.42], [s * 0.64, -0.98, 0.58], [s * 0.42, -1.22, 0.7]], 2), [[0.14, 0.07], [0.15, 0.07], [0.14, 0.06], [0.12, 0.05], [0.09, 0.04], [0.05, 0.03], [0, 0]],
          { sides: 6, color: Am, colors: (q) => [Am, Am, Yl, Yl, '#f0d070', '#e0a0d0'][q] });
        for (let i = 0; i < 5; i++) mb.lock([s * (0.08 + i * 0.09), -0.1 - i * 0.05, 0.02 - (i % 2) * 0.08], [s * 0.3, -1, -0.35], [s * 0.1, -1, 0.1], 0.6 + (i % 3) * 0.08, 0.2, 0.05, i % 2 ? RdD : Rd, null, RdL);
        return;
      }
      // clawed arm: upper arm, elbow, forearm, big green hand with long tan-tipped fingers
      const up = k === 'R' ? [Rd, Or] : [Pu, PuD], fore = k === 'R' ? Am : part === 'phys' ? Gr : PuD;
      const el = [s * 0.26, -0.5, 0.1], wr = [s * 0.22, -0.98, 0.34];
      tube(mb, [0, 0, 0], el, 0.19 * big, 0.15 * big, up[0], 7); ball(mb, el, 0.16 * big, up[0], 7, 4);
      tube(mb, el, wr, 0.15 * big, 0.12 * big, fore, 7);
      if (part === 'phys') spike(mb, V.add(el, [s * 0.1, 0, -0.05]), [s * 0.6, 0.3, -0.5], 0.16, 0.05, Cl, 3);   // elbow spur
      ell(mb, wr[0], wr[1] - 0.1, wr[2] + 0.08, 0.16 * big, 0.14 * big, 0.17 * big, Gr, 7, 5);
      for (let f = -1; f <= 1; f++) {
        const b0 = [wr[0] + f * 0.08, wr[1] - 0.16, wr[2] + 0.18], b1 = [wr[0] + f * 0.11, wr[1] - 0.36, wr[2] + 0.26];
        limb(mb, [b0, b1], [0.05, 0.035], GrD, 4);
        spike(mb, b1, [0, -1, 0.3], 0.1, 0.03, Cl, 3);
      }
    }));
    // ---- legs: thick bent legs; the red leg of the whole Lost Number ends in a yellow spike
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      const k = kind(s), kn = [s * 0.08, -0.45, 0.28], an = [s * 0.06, -0.98, -0.1];
      if (k === 'R' && !part) {
        mb.sweep([[0, 0.05, 0], kn, an, [s * 0.05, -hy + 0.06, 0.12]], [0.22, 0.17, 0.12, 0], { sides: 7, color: Rd, colors: (q) => [Rd, Or, Yl][q] });
        ball(mb, kn, 0.17, Rd, 7, 4);
        return;
      }
      mb.sweep([[0, 0.05, 0], kn, an], [0.23, 0.18, 0.13], { sides: 7, color: k === 'R' ? Or : PuD, colors: (q) => k === 'R' ? [Rd, Or][q] : [Pu, PuD][q] });
      ball(mb, kn, 0.18, k === 'R' ? Rd : Pu, 7, 4);
      mb.rbox(an[0], -hy + 0.1, an[2] + 0.12, 0.3, 0.14, 0.36, Gr, 0.3);
      for (let f = -1.5; f <= 1.5; f++) spike(mb, [an[0] + f * 0.07, -hy + 0.06, an[2] + 0.3], [0, -0.2, 1], 0.11, 0.035, Cl, 3);
    }));
    m.height = part === 'phys' ? 2.45 : part === 'mag' ? 2.65 : 2.55; m.scale = 1.1; m.lungeScale = 0.8;
    return m;
  }
  def('lost_number', (a) => lostNumber(a, null));
  def('lost_number_b', (a) => lostNumber(a, 'mag'));
  def('lost_number_c', (a) => lostNumber(a, 'phys'));

  // ---- Materia Keeper (and its red recolour Stilva): a big hunched crab-demon. Bulky body pitched forward, a small
  // snouted head with a red maw held low in front, a spined tail arching up over the back, two thick segmented
  // scythe arms raised high ending in long hooked claws, four thick crooked legs planted on long pointed claws,
  // rows of spikes along back, arms and thighs
  function materiaKeeper(a, o) {
    const m = rig(a);
    const T = o.body, TL = sh(T, 0.14), TD = sh(T, -0.3), Cl = o.claw, Ct = o.clawTip, Sp = o.spike;
    const P = 0.25, lo = !!o.lo, sd = (n) => lo ? Math.max(4, n - 2) : n, rg = (n) => lo ? Math.max(3, n - 1) : n;   // lo: regular-enemy detail (Stilva)
    m.bone('body', 'root', [0, 1.55, 0], [P, 0, 0]);
    m.bone('head', 'body', [0, -0.18, 0.86], [-P + 0.25, 0, 0]);
    m.bone('jaw', 'head', [0, -0.08, 0.14]);
    m.bone('tail', 'body', [0, 0.4, -0.55], [-P, 0, 0]);
    m.bone('armL', 'body', [0.58, 0.32, 0.3], [-P, 0, 0]); m.bone('armR', 'body', [-0.58, 0.32, 0.3], [-P, 0, 0]);
    [['legFL', 1, 1], ['legFR', -1, 1], ['legBL', 1, -1], ['legBR', -1, -1]].forEach(([n, sx, sz]) => m.bone(n, 'body', [sx * 0.52, -0.3, sz * 0.4], [-P, 0, 0]));
    const spikeRow = (mb, a0, a1, n0, up, len, r) => { const n = lo ? Math.max(2, n0 - 2) : n0; for (let i = 0; i < n; i++) spike(mb, lerp3(a0, a1, (i + 0.5) / n), up, len * (1 - 0.3 * Math.abs(i / (n - 1 || 1) - 0.5)), r, Sp, 3); };
    // a long hooked claw: sweeps along ctrl points, bone-coloured grading to a dark tip
    const hook = (mb, ctrl, r) => { const pts = mb.curvePts(ctrl, lo ? 1 : 2), n = pts.length; mb.sweep(pts, pts.map((p, i) => r * (1 - i / (n - 1))), { sides: sd(6), color: Cl, colors: (k) => k >= n - 3 ? Ct : Cl }); };
    att(m, 'body', mb => {
      ell(mb, 0, 0, 0, 0.74, 0.62, 0.88, T, sd(10), rg(7), (i, j) => j >= 4 ? TD : j <= 1 ? TL : T);
      ell(mb, 0, 0.34, -0.12, 0.58, 0.4, 0.58, TL, sd(8), rg(5));                                     // hunched back
      ell(mb, 0, -0.32, 0.46, 0.4, 0.3, 0.38, TD, sd(8), rg(5));                                      // chest under the head
      spikeRow(mb, [0, 0.68, 0.35], [0, 0.6, -0.6], 6, [0, 1, -0.35], 0.55, 0.065);
      LR(s => spikeRow(mb, [s * 0.36, 0.56, 0.3], [s * 0.46, 0.44, -0.55], 5, [s * 0.5, 1, -0.4], 0.44, 0.055));
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0.06, 0.26, 0.21, 0.3, T, sd(8), rg(5));
      ell(mb, 0, -0.01, 0.36, 0.14, 0.11, 0.24, TL, sd(7), rg(4));                                     // snout
      LR(s => { ell(mb, s * 0.13, 0.11, 0.26, 0.04, 0.025, 0.02, o.eye, 5, 3); spike(mb, [s * 0.1, 0.14, 0.0], [s * 0.4, 1, -0.6], 0.28, 0.04, o.crest || Sp, 3); });
      if (o.crest) LR(s => spike(mb, [s * 0.06, 0.16, 0.08], [s * 0.2, 1, -0.1], 0.3, 0.05, o.crest, 4));
      teeth(mb, [-0.1, -0.08, 0.46], [0.1, -0.08, 0.46], 4, 0.06, [0, -1, 0.1], '#f0f0e0', 0.016);
    });
    att(m, 'jaw', mb => { ell(mb, 0, -0.05, 0.22, 0.15, 0.06, 0.28, o.mouth, sd(7), rg(3)); teeth(mb, [-0.09, 0.0, 0.42], [0.09, 0.0, 0.42], 3, 0.05, [0, 1, 0.1], '#f0f0e0', 0.014); });
    // spined tail arching over the back
    att(m, 'tail', mb => {
      const pts = mb.curvePts([[0, 0, 0], [0, 0.42, -0.42], [0, 0.78, -0.28], [0, 0.9, 0.12], [0, 0.78, 0.48]], lo ? 1 : 2), n = pts.length;
      mb.sweep(pts, pts.map((p, i) => 0.24 * (1 - i / n) + 0.04), { sides: sd(7), color: T, colors: (k) => k % 2 ? T : TL });
      for (let i = 1; i < n - 1; i++) { const d = V.sub(pts[i + 1], pts[i - 1]); spike(mb, pts[i], [0, d[2], -d[1]], 0.46 - i * 0.03, 0.05, Sp, 3); }
    });
    // thick scythe arms raised high: upper arm up and out, forearm out and forward, a long hooked claw
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      const el = [s * 0.62, 0.78, -0.1], wr = [s * 1.55, 0.95, 0.3];
      ball(mb, [0, 0, 0], 0.27, T, sd(8), rg(5));
      tube(mb, [0, 0, 0], el, 0.27, 0.22, T, sd(8)); ball(mb, el, 0.23, TL, sd(8), rg(5));
      mb.sweep([el, lerp3(el, wr, 0.45).map((v, k) => v + (k === 1 ? 0.14 : 0)), wr], [0.22, 0.29, 0.17], { sides: sd(8), color: TL });
      spikeRow(mb, [s * 0.1, 0.3, -0.05], [s * 0.5, 0.8, -0.1], 3, [s * 0.1, 1, -0.4], 0.38, 0.05);
      spikeRow(mb, [s * 0.75, 1.1, -0.02], [s * 1.45, 1.12, 0.26], 4, [0, 1, -0.3], 0.36, 0.05);
      ell(mb, wr[0], wr[1], wr[2], 0.17, 0.15, 0.17, TD, sd(7), rg(4));
      hook(mb, [wr, [s * 1.95, 0.95, 0.65], [s * 2.2, 0.72, 1.15], [s * 2.15, 0.4, 1.45]], 0.14);     // great claw
      hook(mb, [V.add(wr, [0, -0.08, 0]), [s * 1.8, 0.55, 0.6], [s * 1.8, 0.35, 0.9]], 0.08);         // small claw
    }));
    // four thick crooked legs: thigh up and out to a high knee, shin down onto a long pointed claw
    [['legFL', 1, 1], ['legFR', -1, 1], ['legBL', 1, -1], ['legBR', -1, -1]].forEach(([n, sx, sz]) => att(m, n, mb => {
      const kn = [sx * 0.62, -0.12, sz * 0.42], an = [sx * 1.0, -0.72, sz * 0.72];
      ball(mb, [0, 0, 0], 0.28, T, sd(7), rg(5));
      tube(mb, [0, 0, 0], kn, 0.28, 0.23, T, sd(7)); ball(mb, kn, 0.23, TL, sd(7), rg(4));
      tube(mb, kn, an, 0.23, 0.16, TD, sd(7)); ball(mb, an, 0.16, TD, sd(6), rg(4));
      hook(mb, [an, [sx * 1.18, -1.05, sz * 0.9], [sx * 1.26, -1.36, sz * 1.02]], 0.15);               // claw foot
      LR(k => spike(mb, V.add(an, [0, -0.05, k * 0.08]), [sx * 0.3, -1, sz * 0.2 + k * 0.4], 0.36, 0.05, Cl, 4));   // side claws
      spikeRow(mb, [sx * 0.12, 0.2, sz * 0.1], [sx * 0.55, 0.1, sz * 0.4], 3, [sx * 0.2, 1, -sz * 0.3], 0.3, 0.045);
    }));
    // the stock clips swing arms about x, which would only twist these sideways scythes: turn most of that swing
    // into raising the scythes (attack / cast rear them up, idle bobs them)
    m.onPose = (mm) => LR(s => { const b = mm.bones[s > 0 ? 'armL' : 'armR'], d = b.rot[0] + P; b.rot[0] = -P + d * 0.25; b.rot[2] -= s * d * 0.4; });
    m.scale = o.scale; m.height = 3.45; m.lungeScale = 0.6;
    return m;
  }
  def('materia_keeper', (a) => materiaKeeper(a, { body: '#1a6a78', claw: '#e8d8b0', clawTip: '#c86a70', spike: '#e89020', mouth: '#a02030', eye: '#f040a0', scale: 1 }));
  // Disc 2 (Gaea's Cliff): FF7 reuses the Materia Keeper model for Stilva, in crimson with dark grey hooked claws
  def('stilva', (a) => materiaKeeper(a, { body: '#b02438', claw: '#48484f', clawTip: '#8a8a94', spike: '#e8d040', mouth: '#401018', eye: '#f0e040', crest: '#f0f0f0', scale: 0.85, lo: true }));

  // ---- Bahba Velamyu: fleshy pink mouth-creature slung low between four thick, muscular arched legs whose knees
  // rise high above it, a ring of fangs round its red maw, a long purple-banded stalk rising from its back
  def('bahba_velamyu', (a) => {
    const m = rig(a);
    const P = '#d88070', PL = '#e8a090', PD = '#a85048';
    m.bone('body', 'root', [0, 0.72, 0]);
    m.bone('head', 'body', [0, -0.05, 0.14]);
    m.bone('tail', 'body', [0, 0.16, -0.1]);
    [['legFL', 1, 1], ['legFR', -1, 1], ['legBL', 1, -1], ['legBR', -1, -1]].forEach(([n, sx, sz]) => m.bone(n, 'body', [sx * 0.14, 0.06, sz * 0.1]));
    att(m, 'body', mb => ell(mb, 0, 0, 0, 0.24, 0.25, 0.22, P, 8, 6, (i, j) => j > 3 ? PD : j < 2 ? PL : P));
    att(m, 'head', mb => {
      disc(mb, [0, -0.02, 0.16], [0, -0.25, 1], 0.19, 0.19, PL, 10);
      disc(mb, [0, -0.02, 0.18], [0, -0.25, 1], 0.13, 0.13, '#a01020', 10);
      for (let i = 0; i < 16; i++) { const an = i / 16 * PI * 2; spike(mb, [C(an) * 0.125, -0.02 + S(an) * 0.125, 0.185], [-C(an), -S(an), 0.3], 0.08, 0.018, '#f8f0f0', 3); }
    });
    att(m, 'tail', mb => mb.sweep(mb.curvePts([[0, 0, 0], [0.04, 0.5, -0.1], [0.1, 1.0, -0.05], [0.12, 1.4, 0.05], [0.1, 1.75, 0.1]], 1),
      [0.09, 0.07, 0.05, 0.03, 0.006], { sides: 6, color: P, colors: (k) => ['#b86070', '#7a3a8a', '#9a5aaa', '#c07888'][k] }));
    // thick arched legs: muscular thigh up and out to a knee high above the body, long shin down to a pale claw
    [['legFL', 1, 1], ['legFR', -1, 1], ['legBL', 1, -1], ['legBR', -1, -1]].forEach(([n, sx, sz]) => att(m, n, mb => {
      const k = [sx * 0.42, 0.5, sz * 0.22], f = [sx * 0.66, -0.72, sz * 0.44];
      mb.sweep([[0, 0, 0], lerp3([0, 0, 0], k, 0.5).map((v, i) => v + (i === 1 ? 0.06 : 0)), k], [0.11, 0.14, 0.1], { sides: 7, color: P });
      ball(mb, k, 0.11, PL, 7, 4);
      mb.sweep([k, lerp3(k, f, 0.4).map((v, i) => v + (i === 0 ? sx * 0.05 : 0)), f], [0.1, 0.11, 0.06], { sides: 7, color: PL });
      spike(mb, f, [sx * 0.3, -0.3, sz], 0.16, 0.04, '#f0e0e0', 3);
      spike(mb, f, [-sx * 0.3, -0.3, sz * 0.3], 0.12, 0.035, '#f0e0e0', 3);
    }));
    m.height = 2.5; m.lungeScale = 1.0;
    return m;
  });

  // Palmer: Shinra's portly space chief in a mustard-ochre suit, waving a Mako gun
  def('palmer', (a) => {
    const m = human({ base: 'palmer', _id: 'palmer_b', top: '#a8842c', sleeve: '#a8842c', bottom: '#9a7826', hair: '#b8b8b8', skin: '#e8b890', bowColor: '#f0d020',
      extras: ['suitShirt', 'bowtie'], weapon: 'gun', face: { mouth: 'open', brow: 2 } }, 1.6);
    m.attach('torso', meshOf(mb => { const H = m.H; LR(s => { for (let i = 0; i < 2; i++) ball(mb, [s * 0.035, H.TT * (0.35 + i * 0.2), H.pr.chestRZ * 1.5], 0.006, '#f0e040'); }); }));
    return m;
  });

  // Thunderbird: dark grey-green bird with ragged wings and a long thin beak
  def('thunderbird', (a) => {
    const m = rig(a); m.floats = true;
    const B = '#4a5048', BL = '#6a7068', BD = '#2a302a';
    m.bone('body', 'root', [0, 1.3, 0], [-0.2, 0, 0]);
    m.bone('head', 'body', [0, 0.25, 0.08]);
    m.bone('wingL', 'body', [0.1, 0.14, 0]); m.bone('wingR', 'body', [-0.1, 0.14, 0]);
    m.bone('tail', 'body', [0, -0.22, -0.05]);
    m.bone('legFL', 'body', [0.06, -0.16, 0.05]); m.bone('legFR', 'body', [-0.06, -0.16, 0.05]);
    att(m, 'body', mb => { ell(mb, 0, 0, 0, 0.15, 0.24, 0.14, B, 8, 6, (i, j) => j > 3 ? BD : B); for (let i = 0; i < 8; i++) { const an = i / 8 * PI * 2; mb.blade([C(an) * 0.1, -0.12, S(an) * 0.09], [C(an) * 0.3, -1, S(an) * 0.3], 0.22, 0.08, 0.02, i % 2 ? B : BD); } });
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0.02, 0.08, 0.08, 0.09, B, 7, 5);
      tube(mb, [0, 0.03, 0.08], [0, -0.06, 0.34], 0.02, 0.003, '#d02020', 4);
      LR(s => ball(mb, [s * 0.05, 0.06, 0.07], 0.014, '#f0f040'));
      mb.blade([0, 0.1, -0.02], [0, 0.5, -1], 0.16, 0.05, 0.02, BD);
    });
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const arm = [[0, 0, 0], [s * 0.3, 0.2, -0.04], [s * 0.62, 0.3, -0.08], [s * 0.9, 0.22, -0.12]];
      limb(mb, arm, [0.035, 0.03, 0.022, 0.01], B, 5);
      fan2(mb, [s * 0.05, -0.15, -0.02], [[0, 0.02, 0], ...arm.slice(1)], B, BD);
      const f = [];
      for (let i = 0; i < 8; i++) { const t = i / 7; f.push([lerp3(arm[1], arm[3], t), [s * (0.15 + t * 0.6), -1, -0.25], 0.25 + 0.15 * S(t * PI) + t * 0.08, 0.08]); }
      blades(mb, f, BL, '#909890');
    }));
    att(m, 'tail', mb => blades(mb, [-2, -1, 0, 1, 2].map(i => [[i * 0.03, 0, 0], [i * 0.25, -1, -0.2], 0.38 - Math.abs(i) * 0.04, 0.08]), B, BL));
    const leg = meshOf(mb => { limb(mb, [[0, 0, 0], [0, -0.12, 0.05], [0, -0.16, 0.12]], [0.018, 0.014, 0.01], '#c0a030', 4); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = 1.65; m.lungeScale = 1.0;
    return m;
  });

  // Razor Weed: black stalk with a pair of yellow eyes, crowned by a burst of golden razor leaves
  def('razor_weed', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('head', 'body', [0, 0.72, 0]);
    att(m, 'body', mb => {
      for (let i = 0; i < 6; i++) { const an = i / 6 * PI * 2; limb(mb, [[0, 0.05, 0], [C(an) * 0.18, 0.02, S(an) * 0.18], [C(an) * 0.3, 0, S(an) * 0.3]], [0.02, 0.012, 0.004], '#a02820', 3); }
      mb.loft([{ y: 0.03, rx: 0.07, rz: 0.07 }, { y: 0.3, rx: 0.09, rz: 0.09 }, { y: 0.6, rx: 0.08, rz: 0.08 }, { y: 0.74, rx: 0.1, rz: 0.1 }], { sides: 7, color: '#1a1a22' });
      LR(s => ell(mb, s * 0.035, 0.45, 0.075, 0.022, 0.016, 0.012, '#f0c020', 6, 3));
      for (let i = 0; i < 4; i++) mb.loft([{ y: 0.1 + i * 0.12, rx: 0.095, rz: 0.095 }, { y: 0.12 + i * 0.12, rx: 0.095, rz: 0.095 }], { sides: 7, color: '#3a3a48', capTop: false, capBottom: false });
    });
    att(m, 'head', mb => {
      for (let i = 0; i < 14; i++) { const an = i / 14 * PI * 2, up = 0.6 + (i % 3) * 0.2; mb.blade([C(an) * 0.05, 0, S(an) * 0.05], [C(an) * 0.35, up, S(an) * 0.35], 0.4 + (i % 4) * 0.08, 0.08, 0.02, i % 2 ? '#e0b020' : '#c89018', null, i % 3 ? '#f8e060' : '#e04020'); }
    });
    m.height = 1.3; m.lungeScale = 0.4;
    return m;
  });

  // flat double-sided serrated blade from base along dir (width across `side`), saw teeth on the +side edge
  function sawBlade(mb, base, dir, side, len, w, col, tip, n) {
    const d = V.norm(dir), sd = V.norm(side), P = (u, v) => V.add(base, V.add(V.scale(d, u * len), V.scale(sd, v)));
    const cAt = (u) => mix(col, tip, u);
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, w0 = w * (1 - u0 * 0.75), w1 = w * (1 - u1 * 0.75);
      const b0 = P(u0, -w0 * 0.4), b1 = P(u1, -w1 * 0.4), f0 = P(u0, w0 * 0.6), f1 = P(u1, w1 * 0.6);
      if (i === n - 1) { const t = P(1.12, 0.05 * w); tri2(mb, b0, f0, t, cAt(u0)); continue; }
      tri2(mb, b0, f0, f1, cAt(u0)); tri2(mb, b0, f1, b1, cAt(u0));
      tri2(mb, f0, P(u1 + 0.02, w1 * 0.6 + w * 0.32), f1, sh(cAt(u1), -0.1));   // saw tooth leaning tip-ward
    }
  }
  // ---- Edgehead / Cripshay (one PS1 model): small crouching gremlin quadruped with a wide flat-faced head, heavy
  // brow, small yellow eyes and pointed ears, thick bent legs; Edgehead is sage green with two yellow serrated
  // blades (one rising from the head, one sweeping back as the tail), Cripshay pink with big bat ears and two long
  // teal serrated blades rising behind the head
  function gremlin(a, o) {
    const m = rig(a);
    const Sk = o.skin, D = o.dark, crip = o.kind === 'crip';
    m.bone('body', 'root', [0, 0.55, 0], [0.15, 0, 0]);
    m.bone('head', 'body', [0, 0.22, 0.4], [-0.15, 0, 0]);
    m.bone('jaw', 'head', [0, -0.08, 0.2]);
    m.bone('tail', 'body', [0, 0.05, -0.4]);
    [['legFL', 1, 0.24], ['legFR', -1, 0.24], ['legBL', 1, -0.24], ['legBR', -1, -0.24]].forEach(([n, sx, z]) => m.bone(n, 'body', [sx * 0.24, -0.08, z], [-0.15, 0, 0]));
    att(m, 'body', mb => {
      ell(mb, 0, 0.02, 0, 0.34, 0.3, 0.44, Sk, 9, 6, (i, j) => j >= 4 ? D : Sk);
      ell(mb, 0, 0.12, 0.26, 0.3, 0.2, 0.16, sh(Sk, 0.06), 8, 4);                          // hunched shoulders
      for (let i = 0; i < 5; i++) spike(mb, [0, 0.28 - i * 0.03, 0.2 - i * 0.14], [0, 1, -0.5], 0.14 - i * 0.015, 0.04, o.spikes, 3);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0.08, 0.34, 0.25, 0.27, Sk, 9, 6);
      LR(s => ell(mb, s * 0.2, -0.04, 0.2, 0.13, 0.11, 0.12, Sk, 7, 4));                    // jowls
      ell(mb, 0, 0.14, 0.28, 0.3, 0.07, 0.09, D, 8, 4);                                      // heavy brow
      LR(s => { mb.push(); mb.translate(s * 0.12, 0.08, 0.33); mb.rotate(0, 0, s * 0.3); mb.sphere(0, 0, 0, 0.065, 0.038, 0.025, o.eye, 6, 4, false); mb.pop(); });
      ell(mb, 0, 0.0, 0.35, 0.05, 0.035, 0.03, D, 6, 3);                                      // snub nose
      ell(mb, 0, -0.09, 0.3, 0.17, 0.025, 0.04, '#301818', 8, 3);                              // wide frowning mouth
      LR(s => mb.blade([s * 0.24, 0.14, 0.0], [s * 0.9, 0.85, -0.35], o.ear, crip ? 0.26 : 0.16, 0.05, Sk, null, D));   // pointed ears
      if (crip) LR(s => sawBlade(mb, [s * 0.14, 0.22, -0.12], [s * 0.35, 1, -0.25], [-s, 0, 0.2], 1.5, 0.28, o.blade, o.tip, 6));
      else sawBlade(mb, [-0.14, 0.24, -0.04], [-0.35, 1, 0.3], [1, 0.1, 0.2], 1.0, 0.32, o.blade, o.tip, 4);   // blade rising from the head
    });
    att(m, 'jaw', mb => ell(mb, 0, -0.04, 0.04, 0.16, 0.06, 0.1, sh(Sk, -0.08), 7, 3));
    att(m, 'tail', mb => {
      tube(mb, [0, 0, 0], [0.05, 0.12, -0.2], 0.1, 0.07, Sk, 6);
      if (!crip) sawBlade(mb, [0.05, 0.1, -0.18], [0.45, 0.75, -1], [0, 1, 0.4], 1.4, 0.3, o.blade, o.tip, 6);   // long serrated tail blade
      else for (let i = 0; i < 3; i++) spike(mb, [0.03, 0.08, -0.15], [(i - 1) * 0.6, 0.3, -1], 0.18, 0.04, o.spikes, 3);
    });
    // thick bent legs (frames world-aligned): bulldog elbows in front, haunches behind
    ['legFL', 'legFR', 'legBL', 'legBR'].forEach((n, i) => att(m, n, mb => {
      const sx = i % 2 ? -1 : 1, front = i < 2;
      const kn = front ? [sx * 0.08, -0.2, 0.02] : [sx * 0.06, -0.18, 0.14], ft = front ? [sx * 0.04, -0.42, 0.1] : [sx * 0.04, -0.42, -0.02];
      ball(mb, [0, 0, 0], front ? 0.14 : 0.17, Sk, 7, 4);
      tube(mb, [0, 0, 0], kn, front ? 0.12 : 0.15, 0.1, Sk, 6); ball(mb, kn, 0.1, Sk, 6, 4);
      tube(mb, kn, ft, 0.1, 0.075, front ? Sk : D, 6);
      mb.rbox(ft[0], ft[1] - 0.02, ft[2] + 0.06, 0.16, 0.07, 0.2, D, 0.3);
      for (let k = -1; k <= 1; k++) spike(mb, [ft[0] + k * 0.05, ft[1] - 0.03, ft[2] + 0.15], [0, -0.2, 1], 0.06, 0.02, o.claw, 3);
    }));
    m.scale = o.scale; m.height = o.h; m.lungeScale = 1.1;
    return m;
  }
  def('edgehead', (a) => gremlin(a, { kind: 'edge', skin: '#7aa880', dark: '#4e7454', blade: '#d8c020', tip: '#f0e070', eye: '#f0e020', spikes: '#8a60a0', claw: '#e0e0c8', ear: 0.2, scale: 0.4, h: 1.95 }));
  // Disc 1 (Train Graveyard): FF7 reuses the Edgehead model for Cripshay, in pink with bat ears and teal blades
  def('cripshay', (a) => gremlin(a, { kind: 'crip', skin: '#e0a8a8', dark: '#b07878', blade: '#60b0a0', tip: '#b0e8d8', eye: '#f0e020', spikes: '#e8e8e8', claw: '#f0e8e8', ear: 0.42, scale: 0.4, h: 2.45 }));

  // Bizarre Bug: hovering horned beetle with big yellow-green leaf wings and thin red legs
  def('bizarre_bug', (a) => {
    const m = rig(a); m.floats = true;
    const Sh = '#c0a870', ShD = '#8a7040', R = '#a02818';
    m.bone('body', 'root', [0, 1.1, 0], [-0.6, 0, 0]);
    m.bone('head', 'body', [0, -0.05, 0.25]);
    m.bone('wingL', 'body', [0.08, 0.08, 0.0]); m.bone('wingR', 'body', [-0.08, 0.08, 0.0]);
    [['legFL', 1, 0.12], ['legFR', -1, 0.12], ['legBL', 1, -0.08], ['legBR', -1, -0.08]].forEach(([n, sx, z]) => m.bone(n, 'body', [sx * 0.08, -0.08, z]));
    att(m, 'body', mb => { ell(mb, 0, 0, 0, 0.14, 0.12, 0.24, Sh, 8, 5, (i, j) => j > 3 ? ShD : Sh); });
    att(m, 'head', mb => {
      ell(mb, 0, 0, 0.04, 0.1, 0.08, 0.09, Sh, 7, 4);
      LR(s => { ball(mb, [s * 0.06, 0.02, 0.1], 0.02, '#202020'); limb(mb, [[s * 0.03, 0.05, 0.08], [s * 0.08, 0.2, 0.12], [s * 0.05, 0.28, 0.05]], [0.015, 0.01, 0.004], R, 3); });
      tube(mb, [0, 0.0, 0.1], [0, -0.1, 0.2], 0.03, 0.005, ShD, 4);
    });
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      poly2(mb, [[0, 0, 0], [s * 0.15, 0.3, -0.05], [s * 0.35, 0.6, -0.1], [s * 0.45, 0.5, -0.12], [s * 0.35, 0.15, -0.08]], '#c8c030', '#8a8a20');
      poly2(mb, [[0, 0, 0], [s * 0.35, 0.15, -0.08], [s * 0.45, 0.5, -0.12], [s * 0.5, 0.2, -0.1]], '#d8a020', '#8a6a10');
    }));
    ['legFL', 'legFR', 'legBL', 'legBR'].forEach((n, i) => att(m, n, mb => { const sx = i % 2 ? -1 : 1; limb(mb, [[0, 0, 0], [sx * 0.2, 0.0, 0.05], [sx * 0.25, -0.2, 0.1], [sx * 0.3, -0.3, 0.05]], [0.015, 0.012, 0.008, 0.004], R, 3); }));
    m.height = 1.5; m.lungeScale = 1.2;
    return m;
  });

  // Tail Vault: crouching pink insectoid with a crest of iridescent pink-to-teal crystal spikes
  def('tail_vault', (a) => {
    const m = rig(a);
    const P = '#b8607a', PL = '#d88098', PD = '#7a3a50';
    m.bone('body', 'root', [0, 0.5, 0]);
    m.bone('head', 'body', [0, 0.02, 0.45]);
    m.bone('jaw', 'head', [0, -0.05, 0.08]);
    [['legFL', 1, 0.3], ['legFR', -1, 0.3], ['legBL', 1, -0.25], ['legBR', -1, -0.25]].forEach(([n, sx, z]) => m.bone(n, 'body', [sx * 0.22, 0, z]));
    att(m, 'body', mb => {
      ell(mb, 0, 0, 0, 0.26, 0.18, 0.46, P, 8, 5, (i, j) => j > 3 ? PD : P);
      const crys = [[0, 0.9, -0.3, 0.9], [0.12, 0.75, -0.1, 0.7], [-0.12, 0.8, -0.2, 0.75], [0.2, 0.5, 0.0, 0.5], [-0.2, 0.55, -0.05, 0.55], [0.05, 0.6, 0.15, 0.5], [-0.05, 0.45, 0.3, 0.4], [0.15, 0.4, -0.35, 0.45]];
      crys.forEach(([x, up, z, len]) => { mb.push(); mb.translate(x, 0.12, z); mb.blade([0, 0, 0], [x * 1.5, up, -0.2], len, 0.14, 0.08, '#e070c0', null, '#50f0e0'); mb.pop(); });
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0, 0.04, 0.12, 0.1, 0.12, PL, 7, 5);
      LR(s => ball(mb, [s * 0.06, 0.04, 0.12], 0.02, '#40e080'));
      teeth(mb, [-0.06, -0.04, 0.15], [0.06, -0.04, 0.15], 5, 0.035, [0, -1, 0], '#fff');
    });
    att(m, 'jaw', mb => { mb.box(0, -0.02, 0.05, 0.12, 0.03, 0.1, '#802040'); });
    ['legFL', 'legFR', 'legBL', 'legBR'].forEach((n, i) => att(m, n, mb => {
      const sx = i % 2 ? -1 : 1, f = i < 2 ? 1 : -1;
      limb(mb, [[0, 0, 0], [sx * 0.3, 0.2, f * 0.15], [sx * 0.5, -0.48, f * 0.3]], [0.05, 0.04, 0.02], [P, PL], 5);
    }));
    m.height = 1.3; m.lungeScale = 1.1;
    return m;
  });

  // Adamantaimai: giant tortoise with a dark blue-grey domed shell and an olive beaked head
  def('adamantaimai', (a) => {
    const m = rig(a);
    const Sh = '#34405a', ShL = '#4a5a78', O = '#8a7a28', OL = '#a8983a';
    m.bone('body', 'root', [0, 0.72, 0]);
    m.bone('head', 'body', [0, 0.05, 0.95], [0.1, 0, 0]);
    m.bone('jaw', 'head', [0, -0.08, 0.15]);
    [['legFL', 1, 0.5], ['legFR', -1, 0.5], ['legBL', 1, -0.5], ['legBR', -1, -0.5]].forEach(([n, sx, z]) => m.bone(n, 'body', [sx * 0.55, -0.1, z]));
    m.bone('tail', 'body', [0, -0.05, -0.95]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.2, rx: 0.95, rz: 1.05 }, { y: 0.0, rx: 1.05, rz: 1.15 }, { y: 0.4, rx: 0.95, rz: 1.02 }, { y: 0.75, rx: 0.65, rz: 0.72 }, { y: 0.95, rx: 0.25, rz: 0.28 }], { sides: 10, color: Sh, smooth: false });
      for (let i = 0; i < 10; i++) { const an = (i + 0.5) / 10 * PI * 2; disc(mb, [C(an) * 0.78, 0.45, S(an) * 0.85], [C(an), 0.9, S(an)], 0.22, 0.22, ShL, 6); }
      disc(mb, [0, 0.9, 0], [0, 1, 0], 0.26, 0.26, ShL, 6);
      mb.loft([{ y: -0.3, rx: 0.9, rz: 0.95 }, { y: -0.15, rx: 0.96, rz: 1.02 }], { sides: 10, color: OL });
      tube(mb, [0, -0.02, 0.8], [0, 0.05, 1.0], 0.28, 0.24, O, 7);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.06, 0.1, 0.26, 0.24, 0.3, O, 8, 5);
      mb.push(); mb.translate(0, 0.02, 0.36); mb.rotate(PI / 2 + 0.3, 0, 0); mb.prism(0, 0, 0, 0.1, 0.02, 0.16, 6, '#c8c8b8'); mb.pop();
      LR(s => { eye(mb, s * 0.14, 0.14, 0.28, 0.03, '#f0e040', '#200000'); limb(mb, [[s * 0.18, 0.2, 0.05], [s * 0.35, 0.22, -0.05], [s * 0.35, 0.05, 0.08]], [0.06, 0.05, 0.02], '#d8d8c8', 5); });
    });
    att(m, 'jaw', mb => { mb.box(0, -0.06, 0.12, 0.3, 0.08, 0.26, '#6a3030'); teeth(mb, [-0.1, -0.02, 0.24], [0.1, -0.02, 0.24], 5, 0.05, [0, 1, 0], '#fff'); });
    ['legFL', 'legFR', 'legBL', 'legBR'].forEach((n, i) => att(m, n, mb => {
      const sx = i % 2 ? -1 : 1;
      mb.loft([{ y: 0.1, rx: 0.24, rz: 0.26, x: sx * 0.1 }, { y: -0.35, rx: 0.22, rz: 0.24, x: sx * 0.15 }, { y: -0.6, rx: 0.26, rz: 0.28, x: sx * 0.15 }], { sides: 7, color: O, smooth: false });
      for (let k = -1; k <= 1; k++) spike(mb, [sx * 0.15 + k * 0.12, -0.58, 0.24], [k * 0.2, -0.2, 1], 0.14, 0.05, '#e8e8e0', 3);
    }));
    att(m, 'tail', mb => limb(mb, [[0, 0, 0], [0, -0.2, -0.3], [0, -0.35, -0.45]], [0.15, 0.08, 0.02], O, 5));
    m.height = 2.0; m.lungeScale = 0.4;
    return m;
  });

  // ---- Foulander: bulky red-brown beast on thick clawed legs, a purple mane with yellow trim over its shoulders, and at
  // its front a big yellow demon mask (red nose, bared teeth, dark brows, tall red crest) framed by a red ruff and a
  // pale fan, a gold collar, a long green tongue and a red-edged green tabard hanging down the chest
  def('foulander', (a) => {
    const m = rig(a);
    const Br = '#7a3030', BrL = '#9a4a40', BrD = '#5a2020', Y = '#e8d020', R = '#c02020', Gr = '#2a8a3a', Pu = '#5a2a6a', Gd = '#d8a020';
    m.bone('body', 'root', [0, 0.8, 0]);
    m.bone('head', 'body', [0, 0.78, 0.42]);
    m.bone('jaw', 'head', [0, -0.1, 0.16]);
    m.bone('tail', 'body', [0, 0.12, -0.6]);
    [['legFL', 1, 0.36], ['legFR', -1, 0.36], ['legBL', 1, -0.4], ['legBR', -1, -0.4]].forEach(([n, sx, z]) => m.bone(n, 'body', [sx * 0.24, -0.08, z]));
    att(m, 'body', mb => {
      mb.push(); mb.rotate(PI / 2, 0, 0);
      mb.loft([{ y: -0.62, rx: 0.26, rz: 0.28 }, { y: -0.25, rx: 0.33, rz: 0.34 }, { y: 0.2, rx: 0.36, rz: 0.36 }, { y: 0.5, rx: 0.3, rz: 0.32 }], { sides: 8, color: Br, smooth: false });
      mb.pop();
      // purple mane over the shoulders, trimmed yellow
      ell(mb, 0, 0.2, 0.12, 0.44, 0.3, 0.42, Pu, 8, 5, (i, j) => j >= 3 ? Y : Pu);
      mb.loft([{ y: 0.1, rx: 0.24, rz: 0.2, z: 0.38 }, { y: 0.5, rx: 0.22, rz: 0.18, z: 0.4 }, { y: 0.76, rx: 0.16, rz: 0.14, z: 0.42 }], { sides: 8, color: Pu });
      // gold collar edged red, green tabard with a red border hanging to the knees
      mb.loft([{ y: 0.56, rx: 0.34, rz: 0.3, z: 0.42, color: R }, { y: 0.6, rx: 0.36, rz: 0.32, z: 0.43, color: Gd }, { y: 0.7, rx: 0.3, rz: 0.26, z: 0.42 }], { sides: 9, color: Gd });
      mb.panel([[-0.19, 0.58], [0.19, 0.58], [0.2, -0.42], [0, -0.52], [-0.2, -0.42]], 0.64, 0.03, R);
      mb.panel([[-0.14, 0.55], [0.14, 0.55], [0.15, -0.38], [0, -0.46], [-0.15, -0.38]], 0.665, 0.03, Gr);
      // big pale fan behind the head
      const c = [0, 0.96, 0.3], fanPts = [];
      for (let i = 0; i <= 8; i++) { const an = PI * (0.02 + 0.96 * i / 8); fanPts.push([C(an) * 0.62, c[1] + S(an) * 0.62, 0.28]); }
      for (let i = 0; i < 8; i++) tri2(mb, [0, c[1] - 0.05, 0.32], fanPts[i], fanPts[i + 1], i % 2 ? '#e0e0b8' : '#c8c8a0', '#a8a888');
    });
    att(m, 'head', mb => {
      // yellow demon mask
      mb.frustum(0, -0.02, 0.06, 0.4, 0.26, 0.34, 0.22, 0.34, Y);
      ell(mb, 0, 0.1, 0.18, 0.2, 0.12, 0.08, sh(Y, 0.1), 7, 4);
      ell(mb, 0, 0.02, 0.26, 0.06, 0.05, 0.05, R, 6, 4);                                       // red nose
      LR(s => {
        mb.blade([s * 0.2, 0.18, 0.2], [-s, -0.35, 0.2], 0.2, 0.07, 0.05, '#301010');           // dark brows
        mb.push(); mb.translate(s * 0.09, 0.1, 0.23); mb.rotate(0, 0, -s * 0.3); mb.sphere(0, 0, 0, 0.06, 0.028, 0.02, '#d01010', 6, 4, false); mb.pop();
        mb.blade([s * 0.2, 0.08, 0.05], [s, 0.3, -0.3], 0.22, 0.14, 0.03, '#6aa080', null, '#4a8060');   // green ear flaps
      });
      mb.blade([0, 0.12, 0.02], [0, 1, -0.12], 0.62, 0.18, 0.05, R, null, '#e05020');            // tall red crest
      mb.blade([0, 0.12, 0.06], [0, 1, -0.12], 0.52, 0.09, 0.05, '#f0a020', null, '#f0d040');
      // red ruff of blades framing the lower face
      for (let i = 0; i < 11; i++) { const an = PI * (0.02 + 0.96 * i / 10), d = [C(an) * 1.2, -0.25 - S(an) * 0.5, 0.35]; mb.blade([C(an) * 0.16, -0.04, 0.18], d, 0.34, 0.12, 0.03, i % 2 ? R : '#901818', [-d[1], d[0], 0], '#401010'); }
    });
    att(m, 'jaw', mb => {
      mb.box(0, 0.02, 0.1, 0.2, 0.04, 0.05, '#401010');
      teeth(mb, [-0.08, 0.04, 0.12], [0.08, 0.04, 0.12], 5, 0.04, [0, -1, 0], '#fff', 0.014);
      mb.sweep([[0, 0.0, 0.12], [0, -0.22, 0.2], [0.02, -0.48, 0.22], [0.03, -0.66, 0.18]], [0.04, 0.035, 0.03, 0.015], { sides: 5, color: '#70d060' });   // long green tongue
    });
    att(m, 'tail', mb => { mb.sweep([[0, 0, 0], [0, 0.18, -0.28], [0, 0.32, -0.46]], [0.07, 0.05, 0.03], { sides: 5, color: BrL }); mb.blade([0, 0.3, -0.45], [0, 0.6, -1], 0.24, 0.1, 0.03, '#a02060'); });
    // thick clawed legs
    ['legFL', 'legFR', 'legBL', 'legBR'].forEach((n, i) => att(m, n, mb => {
      const front = i < 2, kn = [0, -0.36, front ? 0.06 : -0.14], an = [0, -0.66, 0.04];
      ell(mb, 0, 0.0, 0.0, 0.17, 0.22, 0.2, BrL, 7, 4);
      tube(mb, [0, 0, 0], kn, 0.15, 0.12, BrL, 7); ball(mb, kn, 0.12, Br, 6, 4);
      tube(mb, kn, an, 0.12, 0.09, Br, 7);
      mb.rbox(0, -0.7, 0.08, 0.18, 0.08, 0.22, BrD, 0.3);
      for (let k = -1; k <= 1; k++) spike(mb, [k * 0.06, -0.72, 0.2], [k * 0.3, -0.2, 1], 0.12, 0.03, '#e8e0e0', 3);
    }));
    m.height = 2.4; m.lungeScale = 1.0;
    return m;
  });

  // Garuda: bird-headed demon standing on orange talons, red hooded cape, butterfly wings, spiked flail
  def('garuda', (a) => {
    const m = rig(a);
    const T = '#2a5a78', R = '#b01830', O = '#c86018', Br = '#6a4a28';
    m.bone('body', 'root', [0, 1.0, 0], [0.1, 0, 0]);
    m.bone('head', 'body', [0, 0.62, 0.04]);
    m.bone('armL', 'body', [0.24, 0.52, 0]); m.bone('armR', 'body', [-0.24, 0.52, 0]);
    m.bone('legFL', 'body', [0.12, -0.1, 0]); m.bone('legFR', 'body', [-0.12, -0.1, 0]);
    m.bone('wingL', 'body', [0.08, 0.55, -0.15]); m.bone('wingR', 'body', [-0.08, 0.55, -0.15]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.15, rx: 0.16, rz: 0.12 }, { y: 0.1, rx: 0.16, rz: 0.12 }, { y: 0.4, rx: 0.22, rz: 0.14 }, { y: 0.6, rx: 0.14, rz: 0.1 }], { sides: 8, color: T });
      mb.loft([{ y: -0.2, rx: 0.2, rz: 0.15 }, { y: 0.02, rx: 0.18, rz: 0.13 }], { sides: 8, color: Br });
      // red hood/cape around the torso front
      mb.loft([{ y: 0.72, rx: 0.2, rz: 0.16, z: 0.02 }, { y: 0.4, rx: 0.26, rz: 0.18, z: 0.03 }, { y: 0.1, rx: 0.22, rz: 0.16, z: 0.04 }], { sides: 10, color: R, capTop: false, capBottom: false });
      mb.panel([[-0.05, 0.3], [0.05, 0.3], [0, 0.05]], 0.2, 0.02, '#e0c020');
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.06, 0.02, 0.09, 0.1, 0.09, R, 7, 5);
      mb.push(); mb.translate(0, 0.04, 0.09); mb.rotate(PI / 2 + 0.4, 0, 0); mb.prism(0, 0, 0, 0.03, 0, 0.09, 4, '#e0a020'); mb.pop();
      LR(s => { ball(mb, [s * 0.04, 0.09, 0.08], 0.02, '#f0e040'); ball(mb, [s * 0.04, 0.09, 0.095], 0.01, '#101010'); limb(mb, [[s * 0.03, 0.14, 0], [s * 0.1, 0.3, 0.0], [s * 0.14, 0.36, 0.02]], [0.01, 0.008, 0.02], '#e0c020', 3); });
      mb.blade([0, 0.15, 0], [0, 1, 0.1], 0.22, 0.05, 0.03, '#e8c020');
    });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.12, -0.2, 0.08], [s * 0.2, -0.1, 0.22]], [0.045, 0.04, 0.035], T, 5);
      ball(mb, [s * 0.21, -0.08, 0.26], 0.05, '#3a7a98');
      if (s > 0) { tube(mb, [s * 0.21, -0.08, 0.26], [s * 0.0, -0.05, 0.35], 0.012, 0.012, '#a0a0a0', 4); for (let k = 0; k < 4; k++) spike(mb, [s * 0.0, -0.05, 0.35], [C(k * 1.6), S(k * 1.6), 0.3], 0.07, 0.015, '#c0c0c8', 3); }
    }));
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.05, -0.4, -0.12], [s * 0.05, -0.85, 0.02]], [0.07, 0.04, 0.035], [Br, O], 5);
      for (let k = -1; k <= 1; k++) limb(mb, [[s * 0.05, -0.85, 0.02], [s * 0.05 + k * 0.07, -0.9, 0.14]], [0.02, 0.01], O, 4);
    }));
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      poly2(mb, [[0, 0, 0], [s * 0.3, 0.55, -0.1], [s * 0.5, 0.75, -0.15], [s * 0.6, 0.45, -0.18], [s * 0.4, 0.1, -0.1]], '#d0b0e0', '#9a80b0');
      poly2(mb, [[0, 0, 0], [s * 0.4, 0.1, -0.1], [s * 0.5, -0.25, -0.12], [s * 0.2, -0.3, -0.06]], '#c098d0', '#8a70a0');
      tube(mb, [s * 0.1, 0.1, -0.02], [s * 0.45, 0.6, -0.14], 0.01, 0.005, '#e070a0', 3);
    }));
    m.height = 1.95; m.lungeScale = 1.0;
    return m;
  });

  // Jayjujayme: fat caterpillar grading green to red with a spiky crest and a tiny striped fan-tail
  def('jayjujayme', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('head', 'body', [0, 0.35, 0.42]);
    const cols = ['#20c040', '#40b030', '#a0a020', '#d06018', '#d02818', '#c01830'];
    att(m, 'body', mb => {
      for (let i = 0; i < 6; i++) {
        const t = i / 5, y = 0.2 + t * 0.9, z = 0.3 - t * 0.55 + t * t * 0.25, r = 0.26 - t * 0.02;
        ell(mb, 0, y, z, r, 0.2, r, cols[i], 8, 5);
      }
      for (let i = 0; i < 11; i++) { const an = PI * (0.1 + 0.8 * i / 10); spike(mb, [C(an) * 0.18, 1.2 + S(an) * 0.05, 0.02], [C(an) * 0.8, 0.8, 0.2], 0.2, 0.04, i % 2 ? '#f0e8c0' : '#e0a060', 3); }
      for (let i = 0; i < 5; i++) { const an = PI * (0.2 + 0.6 * i / 4); tri2(mb, [0, 0.12, -0.2], [C(an) * 0.2, 0.12 + S(an) * 0.18, -0.35], [C(an + 0.3) * 0.2, 0.12 + S(an + 0.3) * 0.18, -0.35], i % 2 ? '#f0f0f0' : '#8a1860', '#6a1040'); }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0, 0, 0.18, 0.16, 0.14, '#20c048', 8, 5);
      LR(s => { eye(mb, s * 0.08, 0.04, 0.12, 0.025, '#f0f040', '#101010'); limb(mb, [[s * 0.1, -0.05, 0.05], [s * 0.2, -0.12, 0.1]], [0.02, 0.01], '#108030', 3); });
      mb.box(0, -0.06, 0.13, 0.08, 0.02, 0.01, '#104010');
    });
    m.height = 1.4; m.lungeScale = 0.8;
    return m;
  });

  // ================================================================== Rocket Town / Wutai
  // Attack Squad: Shinra trooper in a red-orange jumpsuit and hood with a yellow beaked mask, pistol drawn
  def('attack_squad', (a) => human({ base: 'mp', _id: 'attack_squad', facePaint: null, torso: null, noEars: false, bootCuff: null, straps: '#141418', hairStyle: 'helmet', helmetColor: '#c83a1c', hair: '#c83a1c', top: '#c84020', sleeve: '#c84020', bottom: '#b83418',
    boots: '#2a2a30', gloves: '#6a6a70', belt: '#2a2a50', extras: ['mask', 'belt', 'vestArmor'], armorColor: '#2a3470', maskColor: '#d8b820', weapon: 'gun' }, 1.72));

  // Rapps: Wutai's wyvern boss - green-yellow body, magenta limbs, huge gold wings, spiked tail club
  def('rapps', (a) => {
    const m = rig(a); m.floats = true;
    const G = '#8aa830', GD = '#5a7a20', M = '#b0206a', Y = '#d8b030', Gy = '#6a7a90';
    m.bone('body', 'root', [0, 2.1, 0], [0.1, 0, 0]);
    m.bone('head', 'body', [0, 0.85, 0.08]);
    m.bone('jaw', 'head', [0, 0.05, 0.1]);
    m.bone('armL', 'body', [0.2, 0.55, 0.05]); m.bone('armR', 'body', [-0.2, 0.55, 0.05]);
    m.bone('legFL', 'body', [0.16, -0.1, 0.0]); m.bone('legFR', 'body', [-0.16, -0.1, 0.0]);
    m.bone('wingL', 'body', [0.2, 0.62, -0.12]); m.bone('wingR', 'body', [-0.2, 0.62, -0.12]);
    m.bone('tail', 'body', [0, -0.15, -0.05]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.2, rx: 0.14, rz: 0.12 }, { y: 0.15, rx: 0.2, rz: 0.15 }, { y: 0.45, rx: 0.26, rz: 0.18 }, { y: 0.65, rx: 0.18, rz: 0.14 }], { sides: 8, color: G, smooth: false });
      limb(mb, [[0, 0.62, 0.02], [0, 0.78, 0.1], [0, 0.88, 0.08]], [0.1, 0.07, 0.06], GD, 6);
    });
    att(m, 'head', mb => {
      // long curved grey-blue skull-beak sweeping up and forward
      limb(mb, [[0, 0, 0], [0, 0.18, 0.12], [0, 0.3, 0.32], [0, 0.25, 0.55], [0, 0.1, 0.68]], [0.07, 0.08, 0.06, 0.04, 0.01], [Gy, Gy, '#8a9ab0', '#a8b8c8'], 6);
      LR(s => { ball(mb, [s * 0.06, 0.2, 0.18], 0.018, '#f02020'); limb(mb, [[s * 0.04, 0.26, 0.08], [s * 0.1, 0.5, -0.05], [s * 0.12, 0.62, 0.05]], [0.02, 0.012, 0.003], '#d8d0b0', 4); });
    });
    att(m, 'jaw', mb => tube(mb, [0, 0, 0], [0, -0.05, 0.32], 0.03, 0.005, Gy, 4));
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.12, -0.25, 0.1], [s * 0.1, -0.45, 0.2]], [0.05, 0.04, 0.03], M, 5);
      for (let k = -1; k <= 1; k++) spike(mb, [s * 0.1, -0.45, 0.2], [k * 0.3, -1, 0.3], 0.1, 0.012, '#f0f0f0', 3);
    }));
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.08, -0.3, 0.12], [s * 0.1, -0.55, -0.02], [s * 0.12, -0.75, 0.05]], [0.08, 0.06, 0.04, 0.03], M, 5);
      for (let k = -1; k <= 1; k++) spike(mb, [s * 0.12, -0.75, 0.05], [k * 0.4, -0.6, 0.6], 0.12, 0.015, '#f0f0f0', 3);
    }));
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const E = [s * 0.55, 0.5, -0.2], Wr = [s * 1.05, 0.85, -0.3];
      limb(mb, [[0, 0, 0], E, Wr], [0.05, 0.04, 0.03], M, 4);
      const tips = [[s * 1.3, 1.25, -0.3], [s * 2.05, 0.95, -0.35], [s * 1.9, 0.35, -0.35], [s * 1.5, -0.15, -0.3], [s * 0.8, -0.35, -0.2]];
      const edge = [[s * 0.05, -0.25, -0.05]];
      tips.slice().reverse().forEach((t, i, arr) => { tube(mb, Wr, t, 0.02, 0.006, M, 3); edge.push(t); if (i < arr.length - 1) edge.push(lerp3(lerp3(t, arr[i + 1], 0.5), Wr, 0.3)); });
      for (let i = 0; i < edge.length - 1; i++) tri2(mb, Wr, edge[i], edge[i + 1], Y, '#a08020');
      tri2(mb, [0, 0, 0], E, Wr, Y, '#a08020'); tri2(mb, [0, 0, 0], Wr, edge[0], Y, '#a08020');
    }));
    att(m, 'tail', mb => {
      const p = [[0, 0, 0], [0, -0.45, -0.05], [0.05, -0.95, 0.0], [0.1, -1.4, 0.05], [0.05, -1.7, 0.0]];
      limb(mb, p, [0.08, 0.06, 0.045, 0.035, 0.03], [G, G, '#a8a040', M], 6);
      ell(mb, 0.05, -1.78, 0.0, 0.07, 0.1, 0.07, M, 6, 4);
      for (let k = 0; k < 6; k++) { const an = k / 6 * PI * 2; spike(mb, [0.05 + C(an) * 0.06, -1.78, S(an) * 0.06], [C(an), -0.2, S(an)], 0.1, 0.02, '#f0f0f0', 3); }
    });
    m.height = 3.0; m.lungeScale = 0.8;
    return m;
  });

  // Pagoda: Gorky (power) - blue gargoyle with golden wings
  def('gorky', (a) => { const m = gargoyle(a, { body: '#3a3ab0', legs: '#8a1a5a', horn: '#d8b030', wingBone: '#d8a020', wing: '#c8a030', wing2: '#8a6a18' }); m.floats = true; m.b('root').offset[1] = 0.25; return m; });
  // Shake (speed): Skeeskee-type bird in navy with a checkered bib and a red/green crest
  def('shake', (a) => crestBird(a, { body: '#1a2a6a', belly: '#e0b890', bib: '#e8e8f0', beak: '#e8c030', crest: '#d02020', frill: '#40b040', feet: '#e8b020', tip: '#50a030', check: true }));
  // Chekhov (magic): Twin Brain-type floater in indigo with a row of yellow eyes
  def('chekhov', (a) => twinBrain(a, { body: '#5a4aa8', lobe: '#3a2a80', mark: '#8a1a3a', claw: '#c03050', eye: '#f0d020', tip: '#d8a0e0' }));
  // Staniv: Screamer-type gorilla, pale grey with green legs, swinging an iron ball on a chain
  def('staniv', (a) => gorilla(a, { body: '#b8bcc4', arm: '#9a9ea8', band: '#5a5e6a', hip: '#2a6a3a', leg: '#2a6a3a', fur: '#2a6a3a', crest: '#c02030', crestRim: '#181818', claw: '#6a4a90', club: '#6a6e78', flail: true }));

  // ---- Godo (Wutai pagoda): a wide crouching demon-warrior dominated by a huge three-faced head - a red fanged demon
  // face in front, a gold face on its right side and a blue one behind, under an orange headband and purple topknot;
  // green chest with a golden V collar hung with bells, a long ornate red apron to the knees, green hands wielding a
  // trident and a scimitar, big curled boots
  def('godo', (a) => {
    const m = rig(a);
    const R = '#c02020', RD = '#8a1414', Gd = '#d8b030', Gr = '#2a9a40', Br = '#8a4a20', Bl = '#3040a0';
    m.bone('body', 'root', [0, 1.0, 0]);
    m.bone('head', 'body', [0, 0.56, 0.04]);
    m.bone('jaw', 'head', [0, 0.14, 0.3]);
    m.bone('armL', 'body', [0.32, 0.46, 0]); m.bone('armR', 'body', [-0.32, 0.46, 0]);
    m.bone('legFL', 'body', [0.17, -0.1, 0]); m.bone('legFR', 'body', [-0.17, -0.1, 0]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.18, rx: 0.26, rz: 0.18 }, { y: 0.12, rx: 0.22, rz: 0.16 }, { y: 0.4, rx: 0.3, rz: 0.19 }, { y: 0.56, rx: 0.22, rz: 0.15 }], { sides: 8, color: R });
      ell(mb, 0, 0.36, 0.08, 0.2, 0.16, 0.12, Gr, 7, 4);                                       // green chest
      mb.loft([{ y: 0.4, rx: 0.34, rz: 0.22 }, { y: 0.56, rx: 0.24, rz: 0.17 }], { sides: 8, color: Gd, capBottom: false });   // golden collar
      mb.panel([[-0.28, 0.48], [-0.16, 0.48], [0, 0.24], [0, 0.16]], 0.225, 0.03, Gd); mb.panel([[0, 0.16], [0, 0.24], [0.16, 0.48], [0.28, 0.48]], 0.225, 0.03, Gd);
      LR(s => { for (let i = 0; i < 4; i++) tube(mb, [s * (0.1 + i * 0.02), 0.44, 0.21], [s * (0.1 + i * 0.02), 0.24, 0.24], 0.016, 0.016, i % 2 ? '#f0f0f0' : R, 4); });   // bells
      // long ornate apron to the knees: red panel, pale lace border, patterned centre strip
      mb.panel([[-0.17, 0.02], [0.17, 0.02], [0.2, -0.72], [0, -0.8], [-0.2, -0.72]], 0.19, 0.02, '#f0a0a0');
      mb.panel([[-0.14, 0.0], [0.14, 0.0], [0.17, -0.68], [0, -0.75], [-0.17, -0.68]], 0.205, 0.02, '#c05050');
      mb.panel([[-0.05, -0.02], [0.05, -0.02], [0.05, -0.7], [-0.05, -0.7]], 0.22, 0.01, '#e8d0c0');
      for (let i = 0; i < 5; i++) mb.box(0, -0.1 - i * 0.13, 0.23, 0.07, 0.03, 0.01, RD);
      mb.loft([{ y: -0.45, rx: 0.34, rz: 0.24 }, { y: -0.05, rx: 0.26, rz: 0.18 }], { sides: 8, color: '#3a3030', capTop: false });   // dark skirt
    });
    // the huge three-faced head
    att(m, 'head', mb => {
      ell(mb, 0, 0.3, 0, 0.32, 0.34, 0.3, Gd, 9, 6);
      // front: red demon face with a wide open fanged mouth
      ell(mb, -0.04, 0.3, 0.2, 0.26, 0.26, 0.18, R, 8, 5);
      LR(s => { mb.push(); mb.translate(-0.04 + s * 0.11, 0.42, 0.35); mb.rotate(0, 0, -s * 0.3); mb.sphere(0, 0, 0, 0.06, 0.035, 0.02, '#f0e040', 6, 4, false); mb.pop();
        mb.lock([-0.04 + s * 0.15, 0.52, 0.18], [s * 0.6, 1, -0.2], [s * 1, 0.4, -0.3], 0.32, 0.08, 0.05, Bl, null, '#101848'); });  // dark blue horns
      ell(mb, -0.04, 0.2, 0.36, 0.2, 0.08, 0.06, '#401010', 8, 3);                                 // maw
      teeth(mb, [-0.2, 0.25, 0.37], [0.12, 0.25, 0.37], 7, 0.08, [0, -1, 0.15], '#f0f0f0', 0.022);
      // its right side: a gold face in profile with a long ear
      ell(mb, -0.3, 0.3, 0.02, 0.06, 0.2, 0.18, '#e8c040', 7, 4);
      ball(mb, [-0.35, 0.36, 0.08], 0.03, '#101010'); ell(mb, -0.34, 0.24, 0.12, 0.03, 0.03, 0.05, '#b08020', 5, 3);
      mb.blade([-0.3, 0.34, -0.1], [-0.4, -0.3, -1], 0.24, 0.12, 0.04, '#e8c040');
      // behind: a blue face
      ell(mb, 0, 0.3, -0.28, 0.2, 0.22, 0.06, Bl, 7, 4); LR(s => ball(mb, [s * 0.08, 0.36, -0.33], 0.03, '#f0e040'));
      // orange headband, purple topknot
      mb.loft([{ y: 0.55, rx: 0.3, rz: 0.28 }, { y: 0.66, rx: 0.22, rz: 0.2 }, { y: 0.74, rx: 0.12, rz: 0.11 }], { sides: 9, color: '#e07820' });
      spike(mb, [0, 0.74, 0], [0, 1, 0], 0.2, 0.07, '#b070d8', 4);
    });
    att(m, 'jaw', mb => { ell(mb, -0.04, -0.04, 0.02, 0.18, 0.06, 0.1, RD, 7, 3); teeth(mb, [-0.14, 0.0, 0.08], [0.08, 0.0, 0.08], 5, 0.06, [0, 1, 0.1], '#f0f0f0', 0.018); });
    // red arms, green clawed hands: trident in its right hand, scimitar in its left
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      const el = [s * 0.24, -0.16, 0.06], wr = [s * 0.34, 0.06, 0.2];
      ball(mb, [0, 0, 0], 0.13, R, 7, 4);
      tube(mb, [0, 0, 0], el, 0.1, 0.08, R, 6); ball(mb, el, 0.08, R, 6, 4); tube(mb, el, wr, 0.08, 0.07, Gr, 6);
      ell(mb, wr[0], wr[1] + 0.04, wr[2] + 0.02, 0.09, 0.09, 0.08, Gr, 6, 4);
      for (let k = 0; k < 3; k++) spike(mb, [wr[0], wr[1] + 0.08, wr[2] + 0.04], [s * 0.4, 1, 0.3 * (k - 1)], 0.12, 0.025, Gr, 3);
      if (s < 0) {   // trident
        tube(mb, [wr[0], -0.45, wr[2]], [wr[0], 0.75, wr[2]], 0.02, 0.02, Gd, 4);
        for (let k = -1; k <= 1; k++) spike(mb, [wr[0] + k * 0.07, 0.75, wr[2]], [k * 0.3, 1, 0], 0.2, 0.018, Gd, 3);
        tube(mb, [wr[0] - 0.08, 0.75, wr[2]], [wr[0] + 0.08, 0.75, wr[2]], 0.016, 0.016, Gd, 3);
      } else {       // scimitar
        const pts = [[wr[0], wr[1] + 0.06, wr[2]], [wr[0] + 0.06, wr[1] + 0.36, wr[2] + 0.02], [wr[0] + 0.04, wr[1] + 0.66, wr[2] + 0.02], [wr[0] - 0.08, wr[1] + 0.9, wr[2]]];
        strip2(mb, pts, pts.map((p, i) => [p[0] + 0.1 * S((i / 3) * PI * 0.8), p[1] - 0.04, p[2]]), '#a8c0e0', '#4a6090');
        mb.box(wr[0], wr[1] + 0.06, wr[2], 0.14, 0.03, 0.05, '#e0a020');
      }
    }));
    // wide crouched stance, thick legs, big curled boots
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      const kn = [s * 0.26, -0.42, 0.14], an = [s * 0.38, -0.82, 0.02];
      tube(mb, [0, 0, 0], kn, 0.14, 0.11, R, 7); ball(mb, kn, 0.11, R, 6, 4);
      tube(mb, kn, an, 0.11, 0.09, Gr, 7);
      mb.sweep(mb.curvePts([[an[0], an[1] - 0.04, an[2] - 0.08], [an[0] + s * 0.06, an[1] - 0.08, an[2] + 0.12], [an[0] + s * 0.14, an[1] - 0.06, an[2] + 0.32], [an[0] + s * 0.2, an[1] + 0.08, an[2] + 0.4]], 2),
        [[0.1, 0.08], [0.11, 0.09], [0.1, 0.08], [0.08, 0.06], [0.06, 0.045], [0.035, 0.03], [0, 0]], { sides: 6, color: Br });
    }));
    m.height = 2.55; m.lungeScale = 0.9;
    return m;
  });

  // Slaps: a swarm of tiny red winged insects
  def('slaps', (a) => {
    const m = rig(a); m.floats = true;
    m.bone('body', 'root', [0, 1.1, 0]);
    const pos = [[0, 0.1, 0], [0.22, 0.2, -0.1], [-0.2, 0.25, 0.05], [0.12, -0.12, 0.12], [-0.15, -0.08, -0.12], [0.3, -0.05, 0.05], [-0.32, 0.05, -0.02], [0.05, 0.35, -0.08], [-0.05, -0.28, 0.02]];
    pos.forEach((p, i) => {
      const n = 't' + i;
      m.bone(n, 'body', p, [0, i * 0.7, 0]);
      att(m, n, mb => {
        ell(mb, 0, 0, 0, 0.018, 0.018, 0.05, '#a01810', 5, 3);
        ball(mb, [0, 0.005, 0.055], 0.018, '#c02810');
        LR(s => tri2(mb, [0, 0.01, 0.01], [s * 0.1, 0.06, -0.02], [s * 0.08, 0.03, -0.06], 'rgba(240,120,60,0.9)', 'rgba(180,70,30,0.9)'));
        tube(mb, [0, 0, -0.05], [0, -0.01, -0.09], 0.01, 0.002, '#e05020', 3);
      });
    });
    m.height = 1.5; m.lungeScale = 1.5;
    return m;
  });

  // ---- Dual Horn: hulking dark-brown ape-bull knuckle-walking on huge arms, torso pitched far forward, the navy-faced
  // head sunk low between massive shoulders under two broad yellow crescent horns, red eyes and a yellow-toothed
  // grin, purple-red chest patches, a whip tail curling up behind
  def('dual_horn', (a) => {
    const m = rig(a);
    const B = '#5a4a38', BL = '#6e5c44', BD = '#3e3226', F = '#28304a', H = '#d8c040', HT = '#f0e080', Tt = '#f0e040';
    const P = 0.75;
    m.bone('body', 'root', [0, 1.2, -0.3], [P, 0, 0]);
    m.bone('head', 'body', [0, 0.86, 0.36], [-P + 0.05, 0, 0]);
    m.bone('jaw', 'head', [0, -0.12, 0.16]);
    m.bone('armL', 'body', [0.62, 0.62, 0.1], [-P, 0, 0]); m.bone('armR', 'body', [-0.62, 0.62, 0.1], [-P, 0, 0]);
    m.bone('legFL', 'root', [0.34, 1.1, -0.45]); m.bone('legFR', 'root', [-0.34, 1.1, -0.45]);
    m.bone('tail', 'body', [0, -0.28, -0.3], [-P, 0, 0]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.32, rx: 0.45, rz: 0.4 }, { y: 0.2, rx: 0.6, rz: 0.5 }, { y: 0.6, rx: 0.8, rz: 0.56, color: BL }, { y: 0.9, rx: 0.6, rz: 0.48 }, { y: 1.06, rx: 0.3, rz: 0.3 }], { sides: 7, color: B, smooth: false });
      LR(s => ell(mb, s * 0.22, 0.45, 0.42, 0.26, 0.3, 0.14, s > 0 ? '#6a2a4a' : '#7a2a3a', 7, 4));   // chest patches
      ell(mb, 0, 0.1, 0.36, 0.3, 0.26, 0.14, '#4a2a3e', 5, 3);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.0, 0.08, 0.32, 0.27, 0.28, F, 6, 4);
      ell(mb, 0, -0.1, 0.26, 0.24, 0.16, 0.16, sh(F, 0.08), 5, 3);                            // muzzle
      ell(mb, 0, 0.12, 0.24, 0.3, 0.07, 0.1, BD, 6, 3);                                       // heavy brow
      LR(s => {
        mb.push(); mb.translate(s * 0.13, 0.06, 0.3); mb.rotate(0, 0, -s * 0.3); mb.sphere(0, 0, 0, 0.06, 0.028, 0.03, '#f02020', 6, 4, false); mb.pop();
        // broad crescent horn sweeping out and up
        mb.sweep(mb.curvePts([[s * 0.2, 0.14, 0.0], [s * 0.6, 0.2, 0.05], [s * 0.92, 0.46, 0.1], [s * 0.98, 0.82, 0.18]], 1),
          [[0.2, 0.12], [0.2, 0.12], [0.19, 0.1], [0.16, 0.09], [0.12, 0.07], [0.07, 0.04], [0, 0]], { sides: 4, color: H, colors: (k) => k >= 4 ? HT : H });
      });
      teeth(mb, [-0.18, -0.1, 0.4], [0.18, -0.1, 0.4], 9, 0.07, [0, -1, 0.15], Tt, 0.025);
    });
    att(m, 'jaw', mb => { ell(mb, 0, -0.04, 0.14, 0.24, 0.07, 0.2, '#5a1818', 5, 3); teeth(mb, [-0.16, 0.0, 0.3], [0.16, 0.0, 0.3], 7, 0.06, [0, 1, 0.1], Tt, 0.02); ell(mb, 0, -0.1, 0.12, 0.22, 0.06, 0.18, F, 5, 3); });
    // huge knuckle-walking arms: fists planted on the ground ahead
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      const el = [s * 0.2, -0.7, 0.18], wr = [s * 0.14, -1.28, 0.45];
      ball(mb, [0, 0, 0], 0.38, B, 6, 4);
      tube(mb, [0, 0, 0], el, 0.32, 0.25, B, 6); ball(mb, el, 0.25, BL, 5, 3);
      mb.sweep([el, lerp3(el, wr, 0.4), wr], [0.25, 0.28, 0.2], { sides: 6, color: BL });
      mb.rbox(wr[0], wr[1] - 0.14, wr[2] + 0.06, 0.34, 0.26, 0.34, BD, 0.35);                      // fist
      for (let k = -1; k <= 1; k++) spike(mb, [wr[0] + k * 0.09, wr[1] - 0.2, wr[2] + 0.23], [k * 0.2, -0.3, 1], 0.1, 0.04, '#d8d0c0', 3);
    }));
    // short thick hind legs
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      const kn = [s * 0.05, -0.5, 0.26], an = [s * 0.05, -0.98, -0.1];
      ell(mb, 0, -0.05, 0.02, 0.3, 0.34, 0.34, B, 5, 4);
      tube(mb, [0, -0.1, 0.05], kn, 0.27, 0.21, B, 5); ball(mb, kn, 0.21, BL, 5, 3);
      tube(mb, kn, an, 0.2, 0.15, B, 5);
      mb.rbox(an[0], -1.03, an[2] + 0.12, 0.3, 0.14, 0.4, BD, 0.3);
      for (let k = -1; k <= 1; k++) spike(mb, [an[0] + k * 0.09, -1.05, an[2] + 0.32], [k * 0.3, -0.2, 1], 0.12, 0.04, '#d8d0c0', 3);
    }));
    att(m, 'tail', mb => mb.sweep(mb.curvePts([[0, 0, 0], [0, 0.18, -0.5], [0, 0.66, -0.82], [0, 1.08, -0.62], [0, 1.15, -0.3]], 1), [0.12, 0.11, 0.1, 0.09, 0.08, 0.07, 0.06, 0.05, 0.03], { sides: 4, color: '#8a7a68' }));
    m.height = 2.4; m.lungeScale = 0.7;
    return m;
  });

  // ---- Tonadu: dark maroon dragon-bird leaning forward on huge solid violet feathered wings with a gold leading-edge
  // bone, an arched neck crested with yellow spikes, a big blue-purple snout with a magenta eye and an open red maw of
  // yellow fangs, purple legs with red talons, a long tail
  def('tonadu', (a) => {
    const m = rig(a); m.floats = true;
    const Rd = '#5a1a1a', RdL = '#7a2a28', Y = '#e0c040', Pu = '#7a50c0', PuL = '#a888e8', Gd = '#c0a030', Sn = '#5040a0', Cl = '#5a3aa0';
    m.bone('body', 'root', [0, 1.85, 0], [0.5, 0, 0]);
    m.bone('head', 'body', [0, 0.72, 0.2], [-0.3, 0, 0]);
    m.bone('jaw', 'head', [0, -0.1, 0.26]);
    m.bone('wingL', 'body', [0.26, 0.42, -0.08], [-0.5, 0, 0]); m.bone('wingR', 'body', [-0.26, 0.42, -0.08], [-0.5, 0, 0]);
    m.bone('legFL', 'body', [0.22, -0.22, 0.05], [-0.5, 0, 0]); m.bone('legFR', 'body', [-0.22, -0.22, 0.05], [-0.5, 0, 0]);
    m.bone('tail', 'body', [0, -0.34, -0.18]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.4, rx: 0.26, rz: 0.24 }, { y: 0.0, rx: 0.38, rz: 0.34 }, { y: 0.38, rx: 0.34, rz: 0.3 }, { y: 0.62, rx: 0.18, rz: 0.16, z: 0.12 }], { sides: 8, color: Rd, smooth: false });
      ell(mb, 0, 0.05, 0.18, 0.26, 0.3, 0.17, '#6a4a20', 7, 4);                                  // ochre belly
      mb.sweep(mb.curvePts([[0, 0.55, 0.1], [0, 0.78, 0.0], [0, 0.86, 0.18]], 2), [0.16, 0.15, 0.14, 0.13, 0.12], { sides: 7, color: RdL });   // arched neck
      for (let i = 0; i < 6; i++) spike(mb, [0, 0.5 + i * 0.07, -0.12 + (i > 3 ? 0.1 : 0)], [0, 1, -0.6], 0.2, 0.04, Y, 3);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.06, 0.06, 0.2, 0.19, 0.24, RdL, 8, 5);
      mb.sweep([[0, 0.03, 0.14], [0, 0.02, 0.32], [0, -0.02, 0.46]], [[0.14, 0.12], [0.11, 0.09], [0.06, 0.05]], { sides: 6, color: Sn });   // blue-purple snout
      LR(s => { mb.push(); mb.translate(s * 0.12, 0.12, 0.2); mb.rotate(0, 0, -s * 0.3); mb.sphere(0, 0, 0, 0.045, 0.025, 0.02, '#f040c0', 6, 4, false); mb.pop(); });
      for (let i = 0; i < 5; i++) spike(mb, [0, 0.18, 0.08 - i * 0.08], [0, 1, -0.4], 0.24, 0.045, Y, 3);
      teeth(mb, [-0.08, -0.08, 0.4], [0.08, -0.08, 0.4], 5, 0.07, [0, -1, 0], Y, 0.02);
    });
    att(m, 'jaw', mb => { mb.box(0, -0.04, 0.1, 0.16, 0.05, 0.24, '#a02030'); teeth(mb, [-0.07, 0.0, 0.18], [0.07, 0.0, 0.18], 4, 0.05, [0, 1, 0], Y, 0.018); });
    // huge solid violet wings: gold leading-edge bone, broad overlapping feathers
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      const E = [s * 0.62, 0.5, -0.14], Wr = [s * 1.25, 0.72, -0.2], T = [s * 1.85, 0.62, -0.28];
      tube(mb, [0, 0, 0], E, 0.12, 0.09, Gd, 6); ball(mb, E, 0.09, Gd, 6, 4); tube(mb, E, Wr, 0.09, 0.065, Gd, 6); tube(mb, Wr, T, 0.065, 0.02, Gd, 5);
      const arm = (t) => t < 0.35 ? lerp3([0, 0, 0], E, t / 0.35) : t < 0.7 ? lerp3(E, Wr, (t - 0.35) / 0.35) : lerp3(Wr, T, (t - 0.7) / 0.3);
      for (let i = 0; i < 13; i++) {
        const t = i / 12, d = [s * (0.05 + t * 1.2), -1 + t * 0.65, -0.15];
        mb.blade(V.add(arm(t), [0, -0.05, 0.02]), d, 0.62 + 0.3 * S(t * PI) + 0.12 * t, 0.34, 0.04, i % 2 ? Pu : sh(Pu, -0.1), V.cross(d, [0, 0, 1]), PuL);
      }
    }));
    // purple legs with red talons
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      const kn = [s * 0.04, -0.3, 0.2], an = [s * 0.04, -0.62, 0.3];
      ell(mb, 0, -0.04, 0.04, 0.16, 0.2, 0.18, Rd, 6, 4);
      tube(mb, [0, -0.05, 0.04], kn, 0.14, 0.1, Rd, 6); ball(mb, kn, 0.1, Cl, 6, 4);
      tube(mb, kn, an, 0.09, 0.07, Cl, 6);
      for (let k = -1; k <= 1; k++) { const t = [an[0] + k * 0.1, an[1] - 0.1, an[2] + 0.15]; tube(mb, an, t, 0.045, 0.03, Cl, 4); spike(mb, t, [k * 0.2, -1, 0.4], 0.14, 0.03, '#e02020', 3); }
    }));
    att(m, 'tail', mb => mb.sweep(mb.curvePts([[0, 0, 0], [0, -0.4, -0.3], [0, -0.7, -0.7], [0.1, -0.8, -1.15]], 2), [0.16, 0.14, 0.12, 0.1, 0.07, 0.04, 0.01], { sides: 6, color: Rd }));
    m.height = 3.1; m.lungeScale = 0.8;
    return m;
  });

  // ---- Doorbull: a horned, masked orange demon rider fused to the back of a hulking blue-black panther - massive
  // shoulders and forelegs, big clawed paws, a large panther head with a roaring red jaw; the rider has a broad chest
  // with a white V band and thick arms reaching out to big grey claws
  def('doorbull', (a) => {
    const m = rig(a);
    const Bk = '#3a3a5a', BkL = '#5a5a80', BkD = '#26263c', O = '#c86a20', OL = '#e08a38', W = '#e8e0e8', G = '#8a8aa0';
    m.bone('body', 'root', [0, 0.95, 0]);
    m.bone('jaw', 'body', [0, -0.05, 0.86]);
    m.bone('head', 'body', [0, 1.14, 0.08]);
    m.bone('armL', 'body', [0.38, 0.98, 0.06]); m.bone('armR', 'body', [-0.38, 0.98, 0.06]);
    m.bone('tail', 'body', [0, 0.15, -0.7], [-0.9, 0, 0]);
    [['legFL', 1, 0.44], ['legFR', -1, 0.44], ['legBL', 1, -0.46], ['legBR', -1, -0.46]].forEach(([n, sx, z]) => m.bone(n, 'body', [sx * 0.28, -0.08, z]));
    att(m, 'body', mb => {
      // panther: barrel body with a high shoulder hump
      mb.push(); mb.rotate(PI / 2, 0, 0);
      mb.loft([{ y: -0.72, rx: 0.3, rz: 0.3 }, { y: -0.35, rx: 0.36, rz: 0.36 }, { y: 0.1, rx: 0.38, rz: 0.4 }, { y: 0.45, rx: 0.44, rz: 0.46, color: BkL }, { y: 0.66, rx: 0.3, rz: 0.34 }], { sides: 7, color: Bk, smooth: false });
      mb.pop();
      // big panther head: ears with orange insides, red eyes, fangs
      ell(mb, 0, 0.1, 0.74, 0.25, 0.22, 0.24, BkL, 6, 4);
      mb.frustum(0, 0.0, 0.9, 0.24, 0.16, 0.18, 0.12, 0.16, Bk);
      ell(mb, 0, 0.05, 1.02, 0.06, 0.04, 0.03, '#141420', 5, 3);                                 // nose
      LR(s => {
        mb.push(); mb.translate(s * 0.1, 0.16, 0.93); mb.rotate(0, 0, s * 0.35); mb.sphere(0, 0, 0, 0.045, 0.022, 0.02, '#f02020', 6, 4, false); mb.pop();
        mb.blade([s * 0.16, 0.26, 0.66], [s * 0.4, 1, -0.2], 0.2, 0.16, 0.05, Bk, null, BkD);
        mb.blade([s * 0.16, 0.26, 0.69], [s * 0.4, 1, -0.2], 0.15, 0.1, 0.02, '#c85020');
        spike(mb, [s * 0.08, -0.06, 1.0], [0, -1, 0.1], 0.1, 0.025, '#fff', 3);                   // upper fangs
      });
      // rider torso rising from the panther's back: broad orange chest with a white V band
      mb.loft([{ y: 0.3, rx: 0.2, rz: 0.16, z: 0.08 }, { y: 0.6, rx: 0.24, rz: 0.16, z: 0.08 }, { y: 0.86, rx: 0.34, rz: 0.2, z: 0.07, color: OL }, { y: 1.0, rx: 0.3, rz: 0.18, z: 0.06 }, { y: 1.1, rx: 0.14, rz: 0.1, z: 0.06 }], { sides: 7, color: O });
      mb.panel([[-0.3, 0.98], [-0.18, 0.98], [0, 0.8], [0, 0.7]], 0.28, 0.03, W); mb.panel([[0, 0.7], [0, 0.8], [0.18, 0.98], [0.3, 0.98]], 0.28, 0.03, W);
      LR(s => ell(mb, s * 0.34, 0.96, 0.06, 0.15, 0.13, 0.15, OL, 7, 4));                       // shoulder balls
    });
    att(m, 'jaw', mb => { ell(mb, 0, -0.08, 0.06, 0.16, 0.05, 0.16, '#c01830', 5, 3); teeth(mb, [-0.1, -0.05, 0.14], [0.1, -0.05, 0.14], 5, 0.05, [0, 1, 0], '#fff'); });
    att(m, 'head', mb => {
      ell(mb, 0, 0.1, 0.02, 0.12, 0.14, 0.12, O, 5, 4);
      ell(mb, 0, 0.08, 0.1, 0.08, 0.1, 0.05, '#3a5ab0', 5, 3);                                    // blue face
      LR(s => { ball(mb, [s * 0.04, 0.12, 0.14], 0.014, '#f02020'); mb.blade([s * 0.1, 0.16, 0.0], [s * 1, 0.6, -0.2], 0.3, 0.2, 0.04, W, [0, 1, 0.3], '#c8c8d8'); });
      spike(mb, [0, 0.22, 0.06], [0, 1, 0.3], 0.16, 0.05, W, 4);
    });
    // thick rider arms reaching out to big grey clawed hands
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      const el = [s * 0.3, -0.2, 0.16], wr = [s * 0.5, -0.26, 0.5];
      tube(mb, [0, 0, 0], el, 0.11, 0.09, O, 5); ball(mb, el, 0.09, OL, 5, 3);
      tube(mb, el, wr, 0.09, 0.08, G, 5);
      ell(mb, wr[0] + s * 0.04, wr[1], wr[2] + 0.06, 0.1, 0.08, 0.12, G, 5, 3);
      for (let k = -1.5; k <= 1.5; k++) spike(mb, [wr[0] + s * 0.06, wr[1] - 0.02 + k * 0.03, wr[2] + 0.16], [s * 0.3, -0.5 + k * 0.2, 1], 0.14, 0.025, '#e0e0e0', 3);
    }));
    att(m, 'tail', mb => mb.sweep(mb.curvePts([[0, 0, 0], [0, 0.4, -0.08], [0, 0.85, 0.05], [0, 1.15, 0.2]], 1), [0.08, 0.075, 0.07, 0.06, 0.05, 0.04, 0.02], { sides: 4, color: Bk }));
    // hulking panther legs: heavy shoulders and forearms, big paws with white claws
    ['legFL', 'legFR', 'legBL', 'legBR'].forEach((n, i) => att(m, n, mb => {
      const f = i < 2, sx = i % 2 ? -1 : 1;
      const kn = f ? [sx * 0.04, -0.42, -0.06] : [sx * 0.04, -0.36, -0.2], an = [sx * 0.04, -0.74, f ? 0.06 : -0.02];
      ell(mb, sx * 0.02, 0.0, 0.0, f ? 0.22 : 0.24, f ? 0.3 : 0.3, f ? 0.26 : 0.3, f ? BkL : Bk, 5, 4);
      tube(mb, [0, -0.05, 0], kn, f ? 0.19 : 0.2, 0.14, f ? BkL : Bk, 5); ball(mb, kn, 0.14, Bk, 5, 3);
      tube(mb, kn, an, 0.14, 0.11, Bk, 5);
      mb.rbox(an[0], -0.8, an[2] + 0.08, 0.24, 0.1, 0.28, BkD, 0.3);
      for (let k = -1.5; k <= 1.5; k++) spike(mb, [an[0] + k * 0.055, -0.82, an[2] + 0.22], [0, -0.2, 1], 0.1, 0.025, '#e8e0d8', 3);
    }));
    m.height = 2.4; m.lungeScale = 1.0;
    return m;
  });

  // Ancient Dragon: small upright teal wyvern with yellow wings and bone horns
  def('ancient_dragon', (a) => {
    const m = rig(a); m.floats = true;
    const G = '#3a7a2a', T = '#2a9a98', Y = '#e0c828', YD = '#a09018';
    m.bone('body', 'root', [0, 1.5, 0]);
    m.bone('head', 'body', [0, 0.55, 0.08]);
    m.bone('jaw', 'head', [0, -0.03, 0.12]);
    m.bone('armL', 'body', [0.15, 0.4, 0.05]); m.bone('armR', 'body', [-0.15, 0.4, 0.05]);
    m.bone('legFL', 'body', [0.12, -0.1, 0]); m.bone('legFR', 'body', [-0.12, -0.1, 0]);
    m.bone('wingL', 'body', [0.12, 0.45, -0.1]); m.bone('wingR', 'body', [-0.12, 0.45, -0.1]);
    m.bone('tail', 'body', [0, -0.15, -0.08]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.15, rx: 0.14, rz: 0.12 }, { y: 0.15, rx: 0.16, rz: 0.14 }, { y: 0.42, rx: 0.14, rz: 0.12 }, { y: 0.55, rx: 0.08, rz: 0.08 }], { sides: 8, color: G });
      mb.loft([{ y: -0.1, rx: 0.1, rz: 0.06, z: 0.09 }, { y: 0.42, rx: 0.1, rz: 0.06, z: 0.08 }], { sides: 6, color: T });
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0.05, 0.08, 0.08, 0.13, G, 7, 5);
      LR(s => { ball(mb, [s * 0.05, 0.08, 0.12], 0.015, '#f02020'); limb(mb, [[s * 0.04, 0.1, 0.0], [s * 0.08, 0.26, -0.06], [s * 0.1, 0.32, -0.02]], [0.02, 0.014, 0.003], '#e8e0c8', 4); });
    });
    att(m, 'jaw', mb => { mb.box(0, -0.02, 0.06, 0.07, 0.02, 0.1, '#2a5a1a'); });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => { limb(mb, [[0, 0, 0], [s * 0.06, -0.15, 0.1], [s * 0.04, -0.25, 0.18]], [0.035, 0.03, 0.02], G, 5); }));
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => { limb(mb, [[0, 0, 0], [s * 0.04, -0.25, 0.12], [s * 0.04, -0.55, -0.02]], [0.06, 0.045, 0.035], G, 5); spike(mb, [s * 0.04, -0.55, -0.02], [0, -1, 0.1], 0.12, 0.03, '#303050', 3); }));
    LR(s => att(m, s > 0 ? 'wingL' : 'wingR', mb => {
      poly2(mb, [[0, 0, 0], [s * 0.3, 0.45, -0.1], [s * 0.6, 0.6, -0.15], [s * 0.75, 0.2, -0.15], [s * 0.55, -0.1, -0.1], [s * 0.2, -0.15, -0.05]], Y, YD);
      poly2(mb, [[0, 0, 0], [s * 0.2, -0.15, -0.05], [s * 0.55, -0.1, -0.1], [s * 0.7, -0.25, -0.08]], '#e8a020', YD);
      tube(mb, [0, 0, 0], [s * 0.6, 0.6, -0.15], 0.02, 0.008, G, 4);
    }));
    att(m, 'tail', mb => limb(mb, [[0, 0, 0], [0, -0.3, -0.1], [0, -0.55, 0.0]], [0.07, 0.04, 0.01], G, 5));
    m.height = 2.2; m.lungeScale = 1.0;
    return m;
  });

  // 8 Eye: a heaped mound of crimson folds covered in staring eyes
  def('8_eye', (a) => {
    const m = rig(a);
    const R = '#b01830', RL = '#d03050', RD = '#7a1020';
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('head', 'body', [0, 0.95, 0]);
    const eyeAt = (mb, p, n, sz) => {
      along(mb, p, n);
      mb.sphere(0, 0, 0, sz, sz * 0.25, sz * 0.45, '#f0f0f4', 8, 3, false);
      mb.sphere(0, sz * 0.1, 0, sz * 0.25, sz * 0.2, sz * 0.25, '#1a1a2a', 6, 3, false);
      mb.pop();
    };
    att(m, 'body', mb => {
      const tiers = [[0.0, 0.85, 0.75], [0.25, 0.75, 0.66], [0.5, 0.6, 0.55], [0.72, 0.42, 0.4]];
      tiers.forEach(([y, rx, rz], k) => {
        mb.loft([{ y, rx, rz }, { y: y + 0.12, rx: rx * 1.04, rz: rz * 1.04 }, { y: y + 0.3, rx: rx * 0.8, rz: rz * 0.8 }], { sides: 10, color: k % 2 ? R : RL, phase: k * 0.3, smooth: false });
        for (let i = 0; i < 7; i++) { const an = (i + k * 0.5) / 7 * PI * 2; if (S(an) < -0.3) continue; eyeAt(mb, [C(an) * rx * 1.02, y + 0.14, S(an) * rz * 1.02], [C(an), 0.15, S(an)], 0.09 - k * 0.008); }
        for (let i = 0; i < 10; i++) { const an = (i + 0.3) / 10 * PI * 2; mb.blade([C(an) * rx * 0.95, y + 0.12, S(an) * rz * 0.95], [C(an), -0.6, S(an)], 0.14, 0.14, 0.03, RD); }
      });
    });
    att(m, 'head', mb => {
      mb.loft([{ y: -0.05, rx: 0.3, rz: 0.28 }, { y: 0.15, rx: 0.3, rz: 0.28 }, { y: 0.35, rx: 0.16, rz: 0.15 }, { y: 0.42, rx: 0.05, rz: 0.05 }], { sides: 8, color: '#d04a78' });
      for (let i = 0; i < 3; i++) { const an = PI * (0.3 + 0.2 * i); eyeAt(mb, [C(an) * 0.3, 0.12 + (i % 2) * 0.08, S(an) * 0.28], [C(an), 0.2, S(an)], 0.07); }
    });
    m.height = 1.4; m.lungeScale = 0.4;
    return m;
  });

  // Jemnezmy: a siren in the form of a long-haired blonde woman in an orange swimsuit
  def('jemnezmy', (a) => human({ base: 'woman', _id: 'jemnezmy', female: true, skin: '#f0c8a8', hair: '#e0c878', hairStyle: 'long', hairLen: 1.6, top: '#e88a18', sleeve: 'skin',
    bottom: '#e88a18', skirt: false, pants: 'shorts', legs: 'skin', boots: '#f0c8a8', shoes: true, eyes: '#406080', face: { mouth: 'smile' },
    topColors: (ring) => ring >= 3 ? '#f0c8a8' : null }, 1.72));

  // Red Dragon (Temple of the Ancients): the dragonBeast pose in crimson, a tan belly with dark segment bands, gold
  // horns, pale lilac wing membranes edged with white spikes
  def('red_dragon', (a) => dragonBeast(a, { body: '#b01820', bodyL: '#c42a2a', bodyD: '#700c10', belly: '#a8702c', bands: '#7a4a1c', spine: '#e8e0f0', horn: '#e0c040',
    claw: '#e8e0e0', eye: '#f0e040', mouth: '#700c10', wing: '#d8c8d8', fringe: '#e8e0f0', fringe2: '#b8a8c8', scale: 1.05 }));

  // ---- Demons Gate: a lanky, spidery orange reptile lunging diagonally out of the temple wall - long ribbed body with
  // dark rib gaps, a green segmented carapace crest running over an orange wedge skull with a huge fanged grin and
  // cyan eyes, long three-jointed arms ending in hooked blue-steel claws
  def('demons_gate', (a) => {
    const m = rig(a);
    const O = '#d06a20', OL = '#e8903a', OD = '#6a2a0c', G = '#6a8a2a', GD = '#4a6a1a', Cl = '#a8b0c8', ClD = '#5a6aa0';
    const P = 1.85;                                        // the body axis runs out of the wall and down
    m.bone('body', 'root', [0, 3.0, -0.95], [P, 0, 0]);
    m.bone('head', 'body', [0, 1.78, 0.1], [-P + 0.3, 0, 0]);
    m.bone('jaw', 'head', [0, -0.27, 0.4]);
    m.bone('armL', 'body', [0.42, 1.3, 0.12], [-P, 0, 0]); m.bone('armR', 'body', [-0.42, 1.3, 0.12], [-P, 0, 0]);
    att(m, 'root', mb => {
      // the wall/gate the demon bursts from
      mb.box(0, 2.1, -1.1, 3.6, 4.2, 0.5, { side: '#6a2a20', front: '#8a3a2a', top: '#5a2018' });
      for (let r = 0; r < 7; r++) mb.box(0, 0.3 + r * 0.6, -0.84, 3.6, 0.04, 0.02, '#4a1a14');
      mb.box(0, 2.3, -0.84, 1.8, 2.2, 0.04, '#2a0a10');
    });
    att(m, 'body', mb => {
      mb.loft([{ y: -0.3, rx: 0.34, rz: 0.3 }, { y: 0.3, rx: 0.42, rz: 0.34 }, { y: 0.9, rx: 0.5, rz: 0.38 }, { y: 1.4, rx: 0.44, rz: 0.34 }, { y: 1.75, rx: 0.24, rz: 0.22 }], { sides: 8, color: O, smooth: false });
      // ribbed flanks and back: raised plates with dark gaps between them
      for (let i = 0; i < 7; i++) {
        const y = 0.1 + i * 0.2, r = 0.44 + 0.08 * S((i / 6) * PI);
        mb.loft([{ y, rx: r, rz: r * 0.8 }, { y: y + 0.1, rx: r + 0.04, rz: r * 0.8 + 0.04 }, { y: y + 0.13, rx: r - 0.06, rz: r * 0.8 - 0.06 }], { sides: 8, color: i % 2 ? OL : O, arc: [PI * 0.95, PI * 2.05] });
        mb.loft([{ y: y + 0.13, rx: r - 0.05, rz: r * 0.8 - 0.05 }, { y: y + 0.2, rx: r - 0.05, rz: r * 0.8 - 0.05 }], { sides: 8, color: OD, arc: [PI * 1.05, PI * 1.95] });
      }
    });
    att(m, 'head', mb => {
      mb.push(); mb.scale(1.35);
      // green segmented carapace from the neck over the skull
      for (let i = 0; i < 7; i++) {
        const z = -0.5 + i * 0.1, r = 0.2 + 0.05 * S((i / 6) * PI);
        mb.push(); mb.rotate(PI / 2, 0, 0);
        mb.loft([{ y: z, rx: r, rz: r * 0.9, z: -0.06 }, { y: z + 0.08, rx: r + 0.03, rz: r * 0.9 + 0.03, z: -0.06 }, { y: z + 0.1, rx: r - 0.02, rz: r * 0.9 - 0.02, z: -0.06 }], { sides: 8, color: i % 2 ? G : GD, arc: [PI * 0.9, PI * 2.1] });
        mb.pop();
      }
      // orange wedge skull with the grin
      ell(mb, 0, -0.06, 0.12, 0.22, 0.18, 0.26, O, 8, 5);
      mb.sweep([[0, -0.08, 0.2], [0, -0.12, 0.38], [0, -0.16, 0.5]], [[0.2, 0.13], [0.16, 0.1], [0.08, 0.06]], { sides: 6, color: OL });
      LR(s => { mb.push(); mb.translate(s * 0.11, -0.02, 0.36); mb.rotate(0, 0, -s * 0.4); mb.sphere(0, 0, 0, 0.05, 0.022, 0.02, '#40e0f0', 6, 4, false); mb.pop(); });
      teeth(mb, [-0.16, -0.2, 0.36], [0.16, -0.2, 0.36], 9, 0.1, [0, -1, 0.1], '#f0f0f0', 0.022);
      mb.pop();
    });
    att(m, 'jaw', mb => { ell(mb, 0, -0.06, 0.02, 0.24, 0.08, 0.22, OD, 7, 3); teeth(mb, [-0.19, -0.02, 0.14], [0.19, -0.02, 0.14], 8, 0.12, [0, 1, 0.1], '#f0f0f0', 0.026); });
    // long lanky arms: shoulder, a high elbow, a long forearm reaching down and out, hooked steel claws
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      const el = [s * 0.75, 0.25, 0.35], wr = [s * 1.0, -0.7, 0.95];
      ball(mb, [0, 0, 0], 0.2, O, 7, 4);
      tube(mb, [0, 0, 0], el, 0.17, 0.13, O, 7); ball(mb, el, 0.13, OL, 6, 4);
      tube(mb, el, wr, 0.13, 0.09, OL, 7);
      ell(mb, wr[0], wr[1] - 0.06, wr[2] + 0.04, 0.12, 0.12, 0.13, OD, 6, 4);
      for (let k = -1.5; k <= 1.5; k++) {
        const b0 = [wr[0] + k * 0.08, wr[1] - 0.12, wr[2] + 0.1];
        mb.sweep(mb.curvePts([b0, V.add(b0, [k * 0.04, 0.02, 0.3]), V.add(b0, [k * 0.06, -0.25, 0.5]), V.add(b0, [k * 0.06, -0.6, 0.42])], 2),
          [0.06, 0.055, 0.05, 0.045, 0.035, 0.02, 0], { sides: 5, color: Cl, colors: (q) => q % 2 ? ClD : Cl });
      }
    }));
    m.height = 4.2; m.lungeScale = 0.4;
    return m;
  });

  // ---- Vlakorados: great crimson beast crouched low in a lunge: long horizontal body, head thrust forward and low
  // with long pale bone horns swept back and blue spikes behind them, strong forelimbs clawing the ground, bent hind
  // legs, blue dorsal spikes and a tail curling up over the rump to a pale bone hook (Bone Village area)
  def('vlakorados', (a) => {
    const m = rig(a);
    const R = '#9a2a3a', RL = '#b8403c', RD = '#6a1a2a', Bl = '#3a70c8', Bn = '#c8c8a0';
    m.bone('body', 'root', [0, 1.25, -0.2], [0.12, 0, 0]);
    m.bone('head', 'body', [0, 0.18, 1.1], [0.05, 0, 0]);
    m.bone('jaw', 'head', [0, -0.1, 0.18]);
    m.bone('armL', 'body', [0.44, -0.12, 0.72], [-0.12, 0, 0]); m.bone('armR', 'body', [-0.44, -0.12, 0.72], [-0.12, 0, 0]);
    m.bone('legBL', 'root', [0.46, 1.2, -0.72]); m.bone('legBR', 'root', [-0.46, 1.2, -0.72]);
    m.bone('tail', 'body', [0, 0.12, -0.85], [-0.12, 0, 0]);
    att(m, 'body', mb => {
      mb.push(); mb.rotate(PI / 2, 0, 0);
      mb.loft([{ y: -0.95, rx: 0.4, rz: 0.36 }, { y: -0.5, rx: 0.5, rz: 0.46 }, { y: 0.2, rx: 0.56, rz: 0.52 }, { y: 0.75, rx: 0.62, rz: 0.56, color: RL }, { y: 1.05, rx: 0.4, rz: 0.4 }, { y: 1.25, rx: 0.26, rz: 0.28 }], { sides: 8, color: R, smooth: false });
      mb.pop();
      LR(s => { ell(mb, s * 0.34, 0.12, 0.72, 0.3, 0.34, 0.36, RL, 6, 3); spike(mb, [s * 0.5, 0.1, 0.8], [s * 0.6, -0.2, 1], 0.45, 0.07, Bn, 4); });   // shoulder plates + bone spur
      for (let i = 0; i < 8; i++) spike(mb, [0, 0.52 - Math.abs(i - 3) * 0.03, 0.85 - i * 0.24], [(i % 2 ? 0.35 : -0.35), 1, -0.45], 0.38 - i * 0.02, 0.06, Bl, 3);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.06, 0.08, 0.25, 0.22, 0.3, R, 7, 4);
      mb.frustum(0, -0.05, 0.3, 0.3, 0.2, 0.2, 0.14, 0.2, R);
      ell(mb, 0, 0.16, 0.2, 0.22, 0.06, 0.14, RD, 6, 3);                                          // brow
      LR(s => {
        ball(mb, [s * 0.14, 0.12, 0.3], 0.03, '#f0e040', 5, 3);
        // long pale bone horns curving up and back
        mb.sweep(mb.curvePts([[s * 0.14, 0.2, 0.0], [s * 0.3, 0.44, -0.28], [s * 0.36, 0.62, -0.68], [s * 0.3, 0.8, -1.0]], 1), [0.08, 0.075, 0.065, 0.05, 0.035, 0.02, 0.0], { sides: 4, color: Bn });
        for (let k = 0; k < 3; k++) spike(mb, [s * 0.12, 0.2 - k * 0.1, -0.12 - k * 0.04], [s * 0.4, 0.6, -1], 0.34 - k * 0.05, 0.05, Bl, 3);
      });
      teeth(mb, [-0.11, -0.06, 0.48], [0.11, -0.06, 0.48], 6, 0.07, [0, -1, 0], '#fff');
    });
    att(m, 'jaw', mb => { mb.box(0, -0.05, 0.2, 0.26, 0.08, 0.36, RD); teeth(mb, [-0.1, 0.0, 0.35], [0.1, 0.0, 0.35], 5, 0.06, [0, 1, 0], '#fff'); });
    // strong forelimbs reaching down and forward, blue claws gripping the ground
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      const el = [s * 0.12, -0.45, -0.08], wr = [s * 0.1, -0.86, 0.34];
      ball(mb, [0, 0, 0], 0.22, R, 6, 4);
      tube(mb, [0, 0, 0], el, 0.2, 0.15, R, 6); ball(mb, el, 0.15, RL, 6, 3);
      tube(mb, el, wr, 0.15, 0.1, R, 6);
      ell(mb, wr[0], wr[1] - 0.06, wr[2] + 0.06, 0.12, 0.08, 0.14, RD, 5, 3);
      for (let k = -1; k <= 1; k++) spike(mb, [wr[0] + k * 0.07, wr[1] - 0.08, wr[2] + 0.16], [k * 0.3, -0.9, 0.6], 0.2, 0.035, Bl, 3);
    }));
    // crouched hind legs
    LR(s => att(m, s > 0 ? 'legBL' : 'legBR', mb => {
      const kn = [s * 0.06, -0.5, 0.32], an = [s * 0.06, -0.95, -0.22];
      ell(mb, 0, -0.08, 0.05, 0.28, 0.42, 0.38, R, 6, 4);
      tube(mb, [0, -0.2, 0.08], kn, 0.22, 0.16, R, 6); ball(mb, kn, 0.16, RL, 6, 3);
      tube(mb, kn, an, 0.15, 0.11, RD, 6);
      tube(mb, an, [s * 0.06, -1.14, 0.08], 0.11, 0.09, RD, 5);
      for (let k = -1; k <= 1; k++) spike(mb, [s * 0.06 + k * 0.09, -1.18, 0.12], [k * 0.3, -0.3, 1], 0.24, 0.045, Bl, 3);
      spike(mb, an, [s * 0.2, 0.1, -1], 0.26, 0.05, Bn, 4);                                        // heel spur
      spike(mb, V.add(kn, [s * 0.08, 0.1, -0.1]), [s * 0.5, 0.3, -1], 0.26, 0.045, Bl, 3);
    }));
    // tail curling up over the rump to a pale bone hook
    att(m, 'tail', mb => {
      const pts = mb.curvePts([[0, 0, 0], [0, 0.2, -0.6], [0, 0.75, -1.05], [0, 1.28, -0.95], [0, 1.55, -0.58]], 1), n = pts.length;
      mb.sweep(pts, pts.map((p, i) => 0.32 * (1 - i / n) + 0.05), { sides: 6, color: R, colors: (k) => k > n - 4 ? RD : R });
      mb.sweep(mb.curvePts([pts[n - 1], [0, 1.63, -0.33], [0, 1.5, -0.12], [0, 1.32, -0.08]], 1), [0.08, 0.075, 0.065, 0.05, 0.035, 0.02, 0], { sides: 4, color: Bn });
      for (let i = 1; i < n - 1; i += 2) { const d = V.sub(pts[i + 1], pts[i - 1]); spike(mb, pts[i], [0, d[2], -d[1]], 0.26, 0.05, Bl, 3); }
    });
    m.height = 3.2; m.lungeScale = 0.6;
    return m;
  });

  // Trickplay: little red squirrel-beast with a huge bushy tail, perched on its burrow mound
  def('trickplay', (a) => {
    const m = rig(a);
    const R = '#c83818', O = '#e87838', Y = '#f0b060';
    m.bone('body', 'root', [0, 0.55, 0]);
    m.bone('head', 'body', [0, 0.28, 0.08]);
    m.bone('tail', 'body', [0, -0.05, -0.15]);
    m.bone('armL', 'body', [0.1, 0.12, 0.1]); m.bone('armR', 'body', [-0.1, 0.12, 0.1]);
    att(m, 'root', mb => {
      mb.loft([{ y: 0, rx: 0.8, rz: 0.7 }, { y: 0.3, rx: 0.65, rz: 0.55 }, { y: 0.45, rx: 0.4, rz: 0.36 }], { sides: 8, color: '#5a3a28', smooth: false });
      for (let i = 0; i < 10; i++) { const an = i / 10 * PI * 2; ell(mb, C(an) * 0.55, 0.25, S(an) * 0.48, 0.1, 0.06, 0.1, i % 2 ? '#6a3a6a' : '#4a2a20', 5, 3); }
    });
    att(m, 'body', mb => {
      ell(mb, 0, 0.05, 0, 0.14, 0.18, 0.13, R, 7, 5);
      ell(mb, 0, 0.04, 0.08, 0.09, 0.12, 0.06, Y, 6, 4);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0.03, 0.11, 0.1, 0.11, R, 7, 5);
      LR(s => { eye(mb, s * 0.05, 0.06, 0.11, 0.02, '#f0f0f0', '#101010'); spike(mb, [s * 0.07, 0.12, -0.01], [s * 0.3, 1, -0.1], 0.1, 0.035, O, 3); });
      mb.box(0, 0.0, 0.14, 0.04, 0.03, 0.02, '#401008');
    });
    att(m, 'tail', mb => {
      const p = [[0, 0, 0], [0, 0.2, -0.2], [0, 0.55, -0.25], [0, 0.8, -0.05], [0, 0.78, 0.1]];
      limb(mb, p, [0.1, 0.14, 0.15, 0.1, 0.03], [R, O, O, Y], 7);
      for (let i = 0; i < 8; i++) { const t = (i + 0.5) / 8, q = lerp3(p[1], p[3], t); LR(s => mb.blade(q, [s * 0.8, 0.4, -0.3], 0.18, 0.1, 0.03, i % 2 ? O : R, null, Y)); }
    });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => limb(mb, [[0, 0, 0], [s * 0.04, -0.08, 0.06]], [0.03, 0.025], R, 5)));
    m.height = 1.35; m.lungeScale = 0.6;
    return m;
  });

  // Hungry: pale cyan ghost-blob with a pointed head, orange eyes and a gaping mouth with a pink tongue
  def('hungry', (a) => {
    const m = rig(a);
    const W = '#c8f0f0', WD = '#80b8c0', T = '#e05080';
    m.bone('body', 'root', [0, 0.25, 0]);
    m.bone('head', 'body', [0, 0.85, 0]);
    m.bone('jaw', 'body', [0, 0.52, 0.28]);
    m.bone('armL', 'body', [0.36, 0.55, 0], [0, 0, -0.3]); m.bone('armR', 'body', [-0.36, 0.55, 0], [0, 0, 0.3]);
    m.bone('legFL', 'body', [0.16, 0.05, 0]); m.bone('legFR', 'body', [-0.16, 0.05, 0]);
    att(m, 'body', mb => {
      mb.loft([{ y: 0.0, rx: 0.2, rz: 0.2 }, { y: 0.15, rx: 0.36, rz: 0.34 }, { y: 0.45, rx: 0.4, rz: 0.36 }, { y: 0.75, rx: 0.3, rz: 0.28 }, { y: 0.9, rx: 0.18, rz: 0.18 }], { sides: 10, color: W });
      mb.push(); mb.translate(0, 0.6, 0.3); mb.rotate(-0.2, 0, 0); mb.sphere(0, 0, 0, 0.2, 0.09, 0.08, '#3a1040', 10, 4, false); mb.pop();
      teeth(mb, [-0.15, 0.67, 0.36], [0.15, 0.67, 0.36], 6, 0.05, [0, -1, 0], '#fff');
    });
    att(m, 'head', mb => {
      mb.loft([{ y: 0, rx: 0.18, rz: 0.18 }, { y: 0.2, rx: 0.1, rz: 0.1, z: -0.02 }, { y: 0.5, rx: 0.01, rz: 0.01, z: -0.12 }], { sides: 8, color: W });
      LR(s => eye(mb, s * 0.1, 0.05, 0.16, 0.035, '#f08020', '#101010'));
    });
    att(m, 'jaw', mb => { limb(mb, [[0, 0, 0], [0.05, -0.05, 0.12], [0.08, -0.2, 0.2], [0.05, -0.35, 0.18]], [0.07, 0.07, 0.06, 0.03], T, 6); });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.3, 0.05, 0.05], [s * 0.5, 0.2, 0.08]], [0.06, 0.045, 0.03], W, 5);
      for (let k = -1; k <= 1; k++) spike(mb, [s * 0.5, 0.2, 0.08], [s * 0.6, 0.3 + k * 0.5, 0.2], 0.1, 0.015, WD, 3);
    }));
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => { limb(mb, [[0, 0, 0], [s * 0.1, -0.15, 0.05], [s * 0.15, -0.25, 0.1]], [0.07, 0.05, 0.03], W, 5); spike(mb, [s * 0.15, -0.25, 0.1], [s * 0.3, -0.2, 1], 0.12, 0.03, '#e05050', 3); }));
    m.height = 1.5; m.lungeScale = 0.8;
    return m;
  });

  // ---- Acrophies: a hermit-crab pair - a low, wide green shell with a dark purple-rimmed opening, a violet star spike
  // on its flank and a teal fanged head rising from the top; a red crab peers from under the shell front (yellow eyes,
  // fangs) with spiky red-orange legs sprawling out to one side and a pink fan claw raised
  def('acrophies', (a) => {
    const m = rig(a);
    const G = '#4a7a60', GD = '#2a4a3a', T = '#4a8a90', P = '#8a40c0', Rd = '#c02010', Or = '#d05010', Pk = '#f080a0';
    m.bone('body', 'root', [0, 0.62, 0]);
    m.bone('head', 'body', [-0.15, 0.5, 0.18]);
    m.bone('jaw', 'head', [0, 0.4, 0.17]);
    m.bone('armL', 'body', [0.62, 0.05, 0.45]);
    m.bone('legFL', 'body', [0.55, -0.3, 0.45]); m.bone('legBL', 'body', [0.7, -0.35, 0.05]);
    att(m, 'body', mb => {
      // the shell: a low wide mound with a coiled hump and a dark opening rimmed with purple crystals
      ell(mb, 0, 0, 0, 1.15, 0.58, 0.78, G, 10, 6, (i, j) => j >= 4 ? GD : G);
      ell(mb, -0.4, 0.34, -0.18, 0.55, 0.36, 0.5, sh(G, 0.06), 8, 5);
      disc(mb, [-1.0, -0.02, 0.28], [-0.8, 0, 0.6], 0.34, 0.26, '#141018', 10);
      for (let i = 0; i < 9; i++) { const an = i / 9 * PI * 2; mb.blade([-1.0 + S(an) * 0.2 * 0.6, -0.02 + C(an) * 0.26, 0.28 + S(an) * 0.2 * 0.8], [-0.7 + S(an) * 0.3, C(an), 0.5 + S(an) * 0.3], 0.26, 0.12, 0.04, i % 2 ? P : '#b080e0', null, '#e0c0ff'); }
      // violet star spike on the flank
      for (let i = 0; i < 5; i++) { const an = i / 5 * PI * 2; mb.blade([-0.2, 0.05, 0.76], [S(an), C(an), 0.25], 0.32, 0.14, 0.05, P, [C(an), -S(an), 0], '#4a2090'); }
      // the red crab peering out from under the shell front
      ell(mb, 0.3, -0.36, 0.72, 0.3, 0.2, 0.24, Rd, 8, 5);
      LR(s => ell(mb, 0.3 + s * 0.1, -0.26, 0.92, 0.035, 0.03, 0.02, '#f0e020', 5, 3));
      teeth(mb, [0.12, -0.42, 0.94], [0.48, -0.42, 0.94], 6, 0.08, [0, -1, 0.1], '#f0f0e0', 0.02);
    });
    // teal fanged head rising from the shell top, maw open to the sky
    att(m, 'head', mb => {
      mb.push(); mb.scale(1.45);
      mb.sweep([[0, -0.1, 0], [0, 0.12, 0.04], [0, 0.26, 0.1]], [0.24, 0.22, 0.2], { sides: 8, color: T });
      ell(mb, 0, 0.28, 0.12, 0.22, 0.12, 0.2, '#901830', 7, 4);
      teeth(mb, [-0.14, 0.3, 0.24], [0.14, 0.3, 0.24], 5, 0.07, [0, 1, 0.2], '#f0f0e0', 0.02);
      LR(s => ball(mb, [s * 0.14, 0.26, 0.2], 0.025, '#f02020'));
      mb.pop();
    });
    att(m, 'jaw', mb => { ell(mb, 0, 0.11, -0.03, 0.29, 0.14, 0.23, T, 7, 4); teeth(mb, [-0.17, 0.03, 0.12], [0.17, 0.03, 0.12], 4, 0.1, [0, -1, 0.2], '#f0f0e0', 0.028); });
    // pink fan claw raised high
    att(m, 'armL', mb => {
      tube(mb, [0, 0, 0], [0.12, 0.45, 0.02], 0.1, 0.08, Pk, 6);
      for (let i = 0; i < 7; i++) { const an = -0.9 + i * 0.3, d = [S(an) * 0.8 + 0.2, 1, 0.1]; mb.blade([0.12, 0.45, 0.02], d, 0.38 + (i % 2) * 0.1, 0.12, 0.03, i % 2 ? Pk : '#d86090', [C(an), -S(an) * 0.8, 0], '#ffc0d0'); }
    });
    // spiky segmented crab legs sprawling out to the side
    const crabLegs = (list) => (mb) => list.forEach(([dir, len], k) => {
      const j0 = [0, 0, 0], j1 = V.add(j0, V.scale(V.norm([dir[0], 0.8, dir[2]]), len * 0.45)), j2 = V.add(j1, V.scale(V.norm([dir[0], -0.6, dir[2]]), len * 0.55));
      tube(mb, j0, j1, 0.09, 0.07, k % 2 ? Or : Rd, 6); ball(mb, j1, 0.07, Rd, 6, 3); tube(mb, j1, j2, 0.07, 0.02, k % 2 ? Rd : Or, 6);
      spike(mb, lerp3(j0, j1, 0.6), [0, 1, -0.2], 0.16, 0.035, Or, 3); spike(mb, lerp3(j1, j2, 0.4), [dir[0], 0.4, dir[2]], 0.14, 0.03, Or, 3);
    });
    att(m, 'legFL', mb => crabLegs([[[1, 0, 0.6], 1.25], [[1, 0, 0.2], 1.4], [[1, 0, 0.9], 1.0]])(mb));
    att(m, 'legBL', mb => crabLegs([[[1, 0, -0.2], 1.35], [[0.9, 0, -0.6], 1.1]])(mb));
    m.height = 1.7; m.lungeScale = 0.6;
    return m;
  });

  // Grimguard: pink goblin-imp with pointed ears, a big red oval shield and a flaming mace
  def('grimguard', (a) => {
    const m = rig(a);
    const P = '#e8b0c0', PD = '#c08090', Gr = '#3aa040';
    m.bone('body', 'root', [0, 0.52, 0]);
    m.bone('head', 'body', [0, 0.36, 0.02]);
    m.bone('armL', 'body', [0.14, 0.3, 0]); m.bone('armR', 'body', [-0.14, 0.3, 0]);
    m.bone('legFL', 'body', [0.07, -0.05, 0]); m.bone('legFR', 'body', [-0.07, -0.05, 0]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.08, rx: 0.1, rz: 0.08 }, { y: 0.15, rx: 0.1, rz: 0.08 }, { y: 0.34, rx: 0.13, rz: 0.09 }], { sides: 8, color: P });
      mb.loft([{ y: 0.0, rx: 0.11, rz: 0.09 }, { y: 0.05, rx: 0.11, rz: 0.09 }], { sides: 8, color: '#3060d0' });
      mb.panel([[-0.05, 0.3], [0.05, 0.3], [0, 0.2]], 0.1, 0.02, '#e0c020');
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.1, 0.01, 0.13, 0.13, 0.12, P, 8, 5);
      LR(s => { eye(mb, s * 0.05, 0.12, 0.1, 0.025, '#e8a020', '#301000'); tri2(mb, [s * 0.1, 0.13, 0], [s * 0.34, 0.26, -0.04], [s * 0.12, 0.05, -0.02], P, PD); });
      spike(mb, [0, 0.22, 0], [0, 1, -0.2], 0.12, 0.02, '#5040a0', 3);
      mb.box(0, 0.03, 0.11, 0.04, 0.01, 0.01, '#6a2030');
    });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.1, -0.15, 0.06], [s * 0.14, -0.2, 0.18]], [0.03, 0.025, 0.022], P, 5);
      if (s > 0) {
        // big oval shield
        mb.push(); mb.translate(s * 0.22, -0.1, 0.2); mb.rotate(0, s * 0.5, 0);
        mb.sphere(0, 0, 0, 0.03, 0.4, 0.22, Gr, 10, 6, false, null);
        mb.sphere(0.012, 0, 0, 0.025, 0.36, 0.19, '#d06048', 10, 6, true);
        mb.pop();
      } else {
        mb.loft([{ y: -0.2, rx: 0.03, rz: 0.03, x: s * 0.14, z: 0.18 }, { y: 0.15, rx: 0.02, rz: 0.02, x: s * 0.14, z: 0.18 }], { sides: 5, color: '#8a6030' });
        ell(mb, s * 0.14, 0.18, 0.18, 0.05, 0.05, 0.05, '#e0a020', 6, 4);
        for (let k = 0; k < 5; k++) spike(mb, [s * 0.14, 0.2, 0.18], [C(k * 1.3), 1, S(k * 1.3)], 0.08, 0.015, '#f06020', 3);
        mb.loft([{ y: 0.1, rx: 0.035, rz: 0.035, x: s * 0.14, z: 0.18 }, { y: 0.13, rx: 0.035, rz: 0.035, x: s * 0.14, z: 0.18 }], { sides: 5, color: '#3060d0' });
      }
    }));
    LR(s => att(m, s > 0 ? 'legFL' : 'legFR', mb => {
      limb(mb, [[0, 0, 0], [s * 0.04, -0.22, 0.03], [s * 0.05, -0.42, 0.0]], [0.04, 0.035, 0.03], [P, Gr], 5);
      mb.blade([s * 0.05, -0.44, 0.0], [s * 0.2, 0.1, 1], 0.14, 0.08, 0.05, Gr);
    }));
    m.height = 1.1; m.lungeScale = 1.1;
    return m;
  });

  // @@END
})();
