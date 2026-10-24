// Dedicated low-poly battle models for the Disc 1 part A enemies (js/data/enemies_d1a.js): Midgar
// (No. 1 / No. 5 reactors, slums, Wall Market, sewers, Train Graveyard, Sector 7 pillar, Shinra HQ,
// the expressway), the grasslands / Chocobo Farm / marsh, Mythril Mine, Fort Condor, Junon and the
// cargo ship.
// Modelled after the PS1 battle models in references/Final Fantasy 7 (1997)/Bestiary.png. Units are
// metres (Cloud = 1.7 tall in battle); every model faces +z with its feet at y = 0 and uses the generic
// enemy bone names (root body head jaw tail wingL wingR armL armR legFL legFR legBL legBR t0..t7 seg0..)
// so the stock clips (e_idle e_attack e_cast e_hurt) animate it. Human enemies reuse the character
// builder (battle style, 1.0 tall -> scale 1.7).
(function () {
  if (!FF7.creatures) return;
  const U = FF7.util, V = FF7.V3, MB = FF7.MeshBuilder, sh = U.shade, mix = U.mix;
  const PI = Math.PI, S = Math.sin, C = Math.cos;
  const MODELS = FF7.creatures.MODELS = FF7.creatures.MODELS || {};
  const def = (id, fn) => { MODELS[id] = fn; };
  const meshOf = (fn, o) => { const mb = new MB(); fn(mb); return mb.build(o); };
  const rig = (look) => FF7.creatures.base(new FF7.Model(), look || {});
  const att = (m, bone, fn, opts) => m.attach(bone, meshOf(fn), null, opts || null);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const LR = (fn) => { fn(1); fn(-1); };
  const TWO_SIDED = { cull: false };

  // ------------------------------------------------------------------ mesh helpers
  // push a transform whose local +y runs from point a along direction d
  function along(mb, a, d) {
    const n = V.norm(d);
    mb.push(); mb.translate(a[0], a[1], a[2]);
    mb.rotate(0, Math.atan2(n[0], n[2]), 0); mb.rotate(Math.acos(clamp(n[1], -1, 1)), 0, 0);
  }
  // tapered tube from a to b (radii r0 -> r1); f = z/x radius ratio of the cross-section
  function tube(mb, a, b, r0, r1, col, sides, f, sq) {
    const d = V.sub(b, a), L = V.len(d);
    if (L < 1e-6) return;
    along(mb, a, d);
    mb.loft([{ y: 0, rx: r0, rz: r0 * (f || 1) }, { y: L, rx: r1, rz: r1 * (f || 1) }], { sides: sides || 6, color: col, sq });
    mb.pop();
  }
  // polyline limb through pts with radii rs (joint balls hide the seams); col may be an array per segment
  function limb(mb, pts, rs, col, sides, joints) {
    for (let i = 0; i < pts.length - 1; i++) {
      const c = Array.isArray(col) ? col[Math.min(i, col.length - 1)] : col;
      tube(mb, pts[i], pts[i + 1], rs[i], rs[i + 1], c, sides);
      if (joints !== false && i > 0) mb.sphere(pts[i][0], pts[i][1], pts[i][2], rs[i] * 1.05, rs[i] * 1.05, rs[i] * 1.05, c, 6, 4, true);
    }
  }
  // smooth swept tube along a polyline: continuous rings (parallel-transport frames), radius per point
  // (number or [rx, ry]); colFn(i, k) optional per-ring/side colour
  function sweep(mb, pts, rs, col, sides, colFn, caps) {
    sides = sides || 8;
    const n = pts.length;
    const T = pts.map((p, i) => V.norm(V.sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)])));
    let up = Math.abs(T[0][1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    let N = V.norm(V.cross(V.cross(T[0], up), T[0]));
    const rings = [];
    for (let i = 0; i < n; i++) {
      if (i > 0) { const b = V.cross(N, T[i]); N = V.norm(V.cross(T[i], b)); }
      const B = V.cross(T[i], N);
      const r = typeof rs === 'number' ? rs : rs[i], rx = Array.isArray(r) ? r[0] : r, ry = Array.isArray(r) ? r[1] : r;
      const ring = [];
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * PI * 2 + PI / sides;
        const o = V.add(V.scale(N, C(a) * ry), V.scale(B, S(a) * rx));
        ring.push({ p: V.add(pts[i], o), n: V.norm(V.add(V.scale(N, C(a) / (ry || 1e-3)), V.scale(B, S(a) / (rx || 1e-3)))) });
      }
      rings.push(ring);
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) {
      const k2 = (k + 1) % sides, a = rings[i][k], b = rings[i][k2], c = rings[i + 1][k2], d = rings[i + 1][k];
      const cc = colFn ? colFn(i, k) : (Array.isArray(col) ? col[Math.min(i, col.length - 1)] : col);
      mb.quad(a.p, b.p, c.p, d.p, cc, null, [a.n, b.n, c.n, d.n]);
    }
    if (caps !== false) {
      const c0 = Array.isArray(col) ? col[0] : (colFn ? colFn(0, 0) : col), c1 = Array.isArray(col) ? col[col.length - 1] : (colFn ? colFn(n - 2, 0) : col);
      for (let k = 0; k < sides; k++) {
        const k2 = (k + 1) % sides;
        mb.tri(pts[0], rings[0][k2].p, rings[0][k].p, c0);
        mb.tri(pts[n - 1], rings[n - 1][k].p, rings[n - 1][k2].p, c1);
      }
    }
  }
  // points on a quadratic / cubic bezier
  const bez = (p0, p1, p2, n) => { const r = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; r.push([0, 1, 2].map(k => u * u * p0[k] + 2 * u * t * p1[k] + t * t * p2[k])); } return r; };
  const bez3 = (p0, p1, p2, p3, n) => { const r = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; r.push([0, 1, 2].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k])); } return r; };
  const taper = (n, r0, r1, pw) => { const r = []; for (let i = 0; i <= n; i++) r.push(r0 + (r1 - r0) * Math.pow(i / n, pw || 1)); return r; };
  // horizontal loft along +z: rings { z, w (half width), h (half height), y (centre height), x?, sq?, color? }
  function hloft(mb, rings, opts) {
    mb.push(); mb.rotate(PI / 2, 0, 0);
    mb.loft(rings.map(r => ({ y: r.z, rx: r.w, rz: r.h, x: r.x || 0, z: -(r.y || 0), sq: r.sq, color: r.color, colors: r.colors, rzf: r.hb, rzb: r.ht })), opts);
    mb.pop();
  }
  const ball = (mb, p, r, col, seg, rings) => mb.sphere(p[0], p[1], p[2], r, r, r, col, seg || 6, rings || 4, true);
  const ell = (mb, x, y, z, rx, ry, rz, col, seg, rings, fn) => mb.sphere(x, y, z, rx, ry, rz, col, seg || 8, rings || 6, true, fn);
  const spike = (mb, p, d, len, r, col, n) => mb.spike(p, d, len, r, n || 4, col);
  // double-sided triangle / polygon (thin membranes: wings, fins, blades)
  function tri2(mb, a, b, c, c1, c2) { mb.tri(a, b, c, c1); mb.tri(a, c, b, c2 || c1); }
  function poly2(mb, pts, c1, c2) { for (let i = 1; i < pts.length - 1; i++) tri2(mb, pts[0], pts[i], pts[i + 1], c1, c2); }
  // row of teeth from a to b pointing along dir
  function teeth(mb, a, b, n, len, dir, col, r) { for (let i = 0; i < n; i++) spike(mb, lerp3(a, b, (i + 0.5) / n), dir, len, r || len * 0.35, col || '#f0ece0', 3); }
  // glowing eye (unlit-looking bright ellipsoid)
  const eye = (mb, x, y, z, r, col) => mb.sphere(x, y, z, r, r, r * 0.6, col, 6, 4, false);
  // flat disc facing direction n
  function disc(mb, p, n, rx, rz, col, seg, th) { along(mb, p, n); mb.sphere(0, 0, 0, rx, th || Math.min(rx, rz) * 0.15, rz, col, seg || 8, 4, false); mb.pop(); }
  // wheel (cylinder along x)
  function wheel(mb, x, y, z, r, w, col, hub, n) {
    mb.push(); mb.translate(x, y, z); mb.rotate(0, 0, PI / 2);
    mb.prism(0, -w / 2, 0, r, r, w, n || 10, col);
    if (hub) mb.prism(0, -w / 2 - 0.01, 0, r * 0.45, r * 0.45, w + 0.02, 6, hub);
    mb.pop();
  }

  // 0 -> 1 -> 0 envelope while the model plays the given clip (drives extra bones in onPose)
  function clipK(mm, name) {
    if (mm.clipName !== name || !mm.clip) return 0;
    return S(Math.min(1, mm.t / (mm.clip.dur || 1)) * PI);
  }
  // gun recoil on bones gunL/gunR (+ optional pincers clawL/clawR snapping down on attack)
  function gunPose(mm) {
    const k = clipK(mm, 'e_attack'), c = clipK(mm, 'e_cast');
    ['gunL', 'gunR'].forEach((g, i) => { const b = mm.bones[g]; if (b) { b.pos[2] -= (i ? S(mm.t * 1.7) : S(mm.t * 1.7 + 1)) * k * 0.12; b.rot[0] -= c * 0.4; } });
    ['clawL', 'clawR'].forEach((g, i) => { const b = mm.bones[g]; if (b) { b.rot[0] += k * 0.9 + S((FF7.frame || 0) * 0.08 + i) * 0.06; } });
  }

  // ------------------------------------------------------------------ human enemies
  // battle-style character (1.0 tall) scaled to real size; spec.custom(m, H) can add meshes
  function human(id, spec, o) {
    o = o || {};
    const m = FF7.chars3d.build(Object.assign({ enemyModel: id }, spec), { style: 'battle' });
    if (o.weapon) m.weaponMesh = meshOf(o.weapon);
    m.showWeapon(true); m.enemyHuman = true; m.play('battle');
    m.scale = o.scale || 1.7;
    if (o.attack) m.anims.attack = o.attack;
    return m;
  }
  // band of armour/cloth around the head between height fractions y0..y1 (front arc only if arc < PI)
  function headBand(mb, H, y0, y1, s, col, arc, zOff) {
    const n = 12, a0 = PI / 2 - (arc || PI), a1 = PI / 2 + (arc || PI);
    const prof = (yf) => { const w = yf > 0.85 ? 0.44 : yf > 0.6 ? 0.53 : yf > 0.35 ? 0.5 : yf > 0.15 ? 0.43 : 0.33; return w; };
    for (let i = 0; i < n; i++) {
      const aa = a0 + (a1 - a0) * i / n, ab = a0 + (a1 - a0) * (i + 1) / n;
      const P = (a, yf) => [C(a) * H.hw * prof(yf) * s, yf * H.hh, S(a) * H.hd * prof(yf) * s + (zOff || 0) * H.hd];
      mb.quad(P(aa, y0), P(aa, y1), P(ab, y1), P(ab, y0), col);
    }
  }
  // closed helmet dome over the head
  function helmet(mb, H, col, o) {
    o = o || {};
    const s = o.s || 1.16, cut = o.cut != null ? o.cut : 0.55;
    ell(mb, 0, H.hh * (o.y || 0.62), -H.hd * 0.02, H.hw * 0.56 * s, H.hh * 0.5 * s, H.hd * 0.56 * s, col, 10, 6, (i, j) => j < 2 ? sh(col, 0.12) : col);
    if (o.rim) mb.loft([{ y: H.hh * cut, rx: H.hw * 0.6 * s, rz: H.hd * 0.62 * s }, { y: H.hh * (cut + 0.06), rx: H.hw * 0.62 * s, rz: H.hd * 0.64 * s }], { sides: 12, color: o.rim });
  }

  // ------------------------------------------------------------------ shared rigs
  // Guard Hound family (Guard Hound, Blood Taste, Dark Nation): prowling panther with a massive angular chest and
  // shoulders, a thin waist, the head carried low and forward with an open red jaw, thick legs, and two whip
  // tentacles rising from the shoulders and arching back over the body (they lash forward on attack)
  function hound(look, P) {
    const m = rig(look);
    const C1 = P.c1, C2 = P.c2 || sh(C1, -0.3), C3 = P.c3 || sh(C1, 0.15);
    const k = P.size || 1, legH = 0.6 * k;
    m.bone('body', 'root', [0, legH + 0.01 * k, 0]);
    m.bone('head', 'body', [0, 0.0, 0.74 * k], [0.12, 0, 0]);
    m.bone('jaw', 'head', [0, -0.03 * k, 0.06 * k]);
    m.bone('tail', 'body', [0, 0.3 * k, 0.24 * k]);
    [['FL', 1, 1, 0.34], ['FR', -1, 1, 0.34], ['BL', 1, -1, 0.42], ['BR', -1, -1, 0.42]].forEach(([n, sx, sz, z]) => m.bone('leg' + n, 'body', [sx * (sz > 0 ? 0.17 : 0.12) * k, 0, sz * z * k]));
    att(m, 'body', mb => {
      // faceted torso: heavy chest and shoulders tapering to a thin waist and a small rump
      hloft(mb, [
        { z: -0.58 * k, w: 0.08 * k, h: 0.08 * k, y: 0.02 * k },
        { z: -0.46 * k, w: 0.15 * k, h: 0.15 * k, y: 0.03 * k },
        { z: -0.22 * k, w: 0.12 * k, h: 0.12 * k, y: 0.02 * k },
        { z: 0.06 * k, w: 0.2 * k, h: 0.22 * k, y: 0.08 * k },
        { z: 0.28 * k, w: 0.27 * k, h: 0.28 * k, y: 0.12 * k, color: C3 },
        { z: 0.46 * k, w: 0.22 * k, h: 0.22 * k, y: 0.06 * k },
        { z: 0.6 * k, w: 0.12 * k, h: 0.13 * k, y: 0.02 * k },
      ], { sides: 6, color: C1, smooth: false });
      // angular shoulder plates, belly shade, neck down to the low head
      LR(s => { mb.blade([s * 0.2 * k, 0.22 * k, 0.34 * k], [s * 0.5, 0.5, -1], 0.34 * k, 0.24 * k, 0.07 * k, C3, null, C1); mb.blade([s * 0.24 * k, 0.1 * k, 0.26 * k], [s * 0.4, -1, 0.3], 0.26 * k, 0.2 * k, 0.07 * k, C1, null, C2); });
      ell(mb, 0, -0.1 * k, 0.2 * k, 0.14 * k, 0.1 * k, 0.24 * k, C2, 6, 4);
      tube(mb, [0, 0.08 * k, 0.52 * k], [0, 0.02 * k, 0.74 * k], 0.12 * k, 0.1 * k, C1, 6);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.03 * k, 0.02 * k, 0.12 * k, 0.1 * k, 0.12 * k, C1, 7, 4);
      hloft(mb, [{ z: 0.04 * k, w: 0.1 * k, h: 0.08 * k, y: 0.02 * k }, { z: 0.16 * k, w: 0.07 * k, h: 0.055 * k, y: 0.0 }, { z: 0.24 * k, w: 0.045 * k, h: 0.035 * k, y: -0.01 * k }], { sides: 6, color: C1, smooth: false });
      LR(s => {
        mb.blade([s * 0.07 * k, 0.1 * k, -0.02 * k], [s * 0.4, 1, -0.25], 0.15 * k, 0.09 * k, 0.025 * k, C1, null, sh(C1, 0.2));
        eye(mb, s * 0.06 * k, 0.06 * k, 0.12 * k, 0.02 * k, P.eye || '#f0e040');
      });
      mb.rbox(0, -0.03 * k, 0.12 * k, 0.1 * k, 0.04 * k, 0.16 * k, P.mouth || '#b02020', 0.3);
      teeth(mb, [-0.035 * k, -0.02 * k, 0.2 * k], [0.035 * k, -0.02 * k, 0.2 * k], 3, 0.03 * k, [0, -1, 0.1], '#f0f0e0', 0.008 * k);
    });
    att(m, 'jaw', mb => {
      hloft(mb, [{ z: 0, w: 0.07 * k, h: 0.03 * k, y: -0.04 * k }, { z: 0.16 * k, w: 0.04 * k, h: 0.02 * k, y: -0.05 * k }], { sides: 6, color: C1 });
      mb.rbox(0, -0.025 * k, 0.08 * k, 0.07 * k, 0.015 * k, 0.12 * k, P.mouth || '#b02020', 0.3);
      LR(s => spike(mb, [s * 0.028 * k, -0.02 * k, 0.12 * k], [0, 1, 0.2], 0.04 * k, 0.01 * k, '#f0f0e0', 3));
    });
    // two whip tentacles from the shoulder tops, rising and arching back over the body
    att(m, 'tail', mb => LR(s => {
      const pts = bez3([s * 0.08 * k, 0, 0], [s * 0.16 * k, 0.36 * k, -0.02 * k], [s * 0.18 * k, 0.58 * k, -0.5 * k], [s * 0.1 * k, 0.46 * k, -1.02 * k], 8);
      sweep(mb, pts, taper(8, 0.06 * k, 0.014 * k), s > 0 ? C1 : sh(C1, -0.1), 5);
      mb.blade(pts[8], V.sub(pts[8], pts[7]), 0.12 * k, 0.06 * k, 0.02 * k, C3);
    }));
    m.onPose = (mm) => { const q = clipK(mm, 'e_attack'); mm.b('tail').rot[0] += q * 3.0; mm.b('body').rot[0] -= q * 0.2; };   // lash forward over the head
    // thick legs with a visible elbow / hock, big paws
    const leg = (front) => meshOf(mb => {
      const pts = front ? [[0, 0.04 * k, 0], [0, -legH * 0.42, 0.04 * k], [0, -legH * 0.72, -0.03 * k], [0, -legH + 0.03 * k, 0.03 * k]]
        : [[0, 0.04 * k, 0], [0, -legH * 0.32, -0.14 * k], [0, -legH * 0.72, -0.08 * k], [0, -legH + 0.03 * k, 0.0]];
      limb(mb, pts, front ? [0.11 * k, 0.07 * k, 0.05 * k, 0.045 * k] : [0.13 * k, 0.07 * k, 0.05 * k, 0.045 * k], C1, 6);
      mb.rbox(0, -legH + 0.025 * k, 0.05 * k, 0.09 * k, 0.05 * k, 0.14 * k, C2, 0.3);
      LR(s => spike(mb, [s * 0.025 * k, -legH + 0.02 * k, 0.12 * k], [0, -0.3, 1], 0.04 * k, 0.012 * k, '#d8d8d0', 3));
    });
    m.attach('legFL', leg(true)); m.attach('legFR', leg(true)); m.attach('legBL', leg(false)); m.attach('legBR', leg(false));
    m.height = legH + 0.62 * k; m.lungeScale = 1.2;
    return m;
  }

  // ------------------------------------------------------------------ Shinra infantry kit
  // MP, Grenade Combatant, Marine and SOLDIER 3rd/2nd/1st: one kit built from our own attachments on the chars3d
  // body (independent of the field presets): a hooded helmet with a peaked brow, a visor band with a glowing slit,
  // a beak-like face guard (or an open chin for SOLDIER), square pauldrons, knee pads, and a crouched combat
  // stance played as custom clips (m.clips inf_*; the pose table is m.infPose).
  function shinraHood(m, H, P) {
    const hw = H.hw, hh = H.hh, hd = H.hd, HC = P.hood, HD = sh(P.hood, -0.2);
    const r = (y, rx, rz, o) => Object.assign({ y: hh * y, rx: hw * rx, rz: hd * rz }, o || {});
    const sk = P.skirt != null ? P.skirt : -0.3, low = [r(sk, 0.9, 0.8, { z: -hd * 0.12, color: HD }), r(sk * 0.13, 0.7, 0.64, { z: -hd * 0.05 }), r(0.36, 0.66, 0.62, { z: -hd * 0.02 })];
    const vy = P.visorY || [0.42, 0.62], vz = P.visorZ || 0.68;
    att(m, 'head', mb => {
      // crown with a peaked brow ledge over the visor
      mb.loft([r(0.34, 0.66, 0.62, { z: -hd * 0.02 }), r(0.62, 0.68, 0.64), r(0.66, 0.7, 0.64, { rzf: hd * 0.86 }), r(0.78, 0.66, 0.62, { rzf: hd * 0.78 }),
        r(0.92, 0.54, 0.54, { rzf: hd * 0.62 }), r(1.03, 0.3, 0.34, { z: -hd * 0.04 }), r(1.07, 0.06, 0.06, { z: -hd * 0.05 })],
      { sides: 12, sq: 2.4, color: HC, capBottom: false });
      if (!P.openChin) mb.loft(low, { sides: 12, sq: 2.4, color: HC, capTop: false });
      // visor band across the eyes (SOLDIER: a deeper goggle plate over eyes and nose)
      mb.loft([r(vy[0], 0.69, vz - 0.03), r(vy[1], 0.69, vz)], { sides: 12, sq: 2.4, color: P.visor, arc: [PI / 2 - 1.05, PI / 2 + 1.05] });
      // face guard: a gold beak from under the visor down over the chin onto the collar
      if (P.guard) mb.loft([r(0.46, 0.52, 0.3, { rzf: hd * 0.72 }), r(0.22, 0.5, 0.3, { rzf: hd * 0.9 }), r(-0.06, 0.38, 0.26, { rzf: hd * 0.8 }), r(-0.3, 0.14, 0.12, { rzf: hd * 0.5, z: hd * 0.08 })],
        { sides: 8, sq: 1.5, phase: 0, color: P.guard });
    });
    // SOLDIER: hood sides and neck guard, open at the front so the chin shows
    if (P.openChin) att(m, 'head', mb => mb.loft(low, { sides: 12, sq: 2.4, color: HC, arc: [PI / 2 + 0.75, PI * 2.5 - 0.75] }), TWO_SIDED);
    // glowing slit in the visor
    if (P.slit) att(m, 'head', mb => { const y0 = vy[0] + (vy[1] - vy[0]) * 0.36;
      mb.loft([r(y0, 0.7, vz - 0.008), r(y0 + (vy[1] - vy[0]) * 0.28, 0.7, vz + 0.006)], { sides: 12, sq: 2.4, color: P.slit, arc: [PI / 2 - 0.75, PI / 2 + 0.75] }); }, { unlit: true });
  }
  function infKit(m, H, P) {
    shinraHood(m, H, P);
    const pr = H.pr, k = P.padScale || 1;
    // square shoulder pads riding on the upper arms
    if (P.pauldron) LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => mb.loft([
      { y: -0.056 * k, rx: 0.05 * k, rz: 0.052 * k, x: s * 0.016 }, { y: -0.012 * k, rx: 0.062 * k, rz: 0.06 * k, x: s * 0.012 },
      { y: 0.026 * k, rx: 0.05 * k, rz: 0.05 * k, x: s * 0.005 }, { y: 0.044 * k, rx: 0.02 * k, rz: 0.024 * k }],
    { sides: 8, sq: 3.2, color: P.pauldron, capBottom: false }), TWO_SIDED));
    if (P.knee) LR(s => att(m, s > 0 ? 'shinL' : 'shinR', mb => mb.rbox(0, -0.012, 0.064, 0.062, 0.056, 0.024, P.knee, 0.35)));
    if (P.bracer) LR(s => att(m, s > 0 ? 'foreL' : 'foreR', mb => mb.loft([{ y: -H.fo * 0.35, rx: 0.03, rz: 0.028 }, { y: -H.fo * 1.02, rx: 0.034, rz: 0.031 }], { sides: 8, color: P.bracer })));
    att(m, 'torso', mb => {
      const bw = pr.waistRX * 1.14 * H.bw, bd = pr.waistRZ * 1.18 * H.bd, bh = H.TT * 0.13;
      mb.loft([{ y: -0.004, rx: bw, rz: bd }, { y: bh, rx: bw, rz: bd }], { sides: 10, color: P.belt || '#2a2a30' });
      mb.rbox(0, bh * 0.5, bd, 0.036, bh * 0.9, 0.012, P.buckle || '#c8a030', 0.25);
      if (P.collar) mb.loft([{ y: H.TT * 0.84, rx: pr.chestRX * 0.9 * H.bw, rz: pr.chestRZ * 1.02 * H.bd }, { y: H.TT + pr.neck * 0.7, rx: pr.chestRX * 0.46, rz: pr.chestRZ * 0.62 }], { sides: 10, color: P.collar });
    });
    if (P.custom) P.custom(m, H);
  }
  // crouched combat stance: t torso pitch, L / R [thigh, shin] pitch, sp leg spread, hd head pitch,
  // arm [armR x, foreR x, armR z, armL x, foreL x, armL z, armR y, armL y, foreR y, foreL y]; the hips drop so
  // the lower foot stays on the floor
  function infCrouch(m, br, over) {
    const P = over ? Object.assign({}, m.infPose, over) : m.infPose, H = m.H, sp = P.sp;
    const ext = (l) => H.thigh * C(sp) * C(l[0]) + H.shin * (C(l[1]) * C(sp) * C(l[0]) - S(l[1]) * S(l[0]));
    m.b('hips').pos[1] = Math.max(ext(P.L), ext(P.R)) - (H.thigh + H.shin) + br * 0.004;
    m.b('hips').pos[2] = -(P.back || 0);
    [['L', P.L, 1], ['R', P.R, -1]].forEach(([s, l, q]) => {
      m.b('thigh' + s).rot[0] = l[0]; m.b('thigh' + s).rot[2] = q * sp; m.b('shin' + s).rot[0] = l[1];
      m.b('foot' + s).rot[0] = -(l[0] + l[1]); m.b('foot' + s).rot[2] = -q * sp * 0.8;
    });
    m.b('torso').rot[0] = P.t + br * 0.02; m.b('head').rot[0] = P.hd;
    const a = P.arm;
    m.b('armR').rot[0] = a[0]; m.b('foreR').rot[0] = a[1]; m.b('armR').rot[2] = a[2];
    m.b('armL').rot[0] = a[3]; m.b('foreL').rot[0] = a[4]; m.b('armL').rot[2] = a[5];
    m.b('armR').rot[1] = a[6] || 0; m.b('armL').rot[1] = a[7] || 0; m.b('foreR').rot[1] = a[8] || 0; m.b('foreL').rot[1] = a[9] || 0;
    return P;
  }
  // blend the crouch through keyframes [phase, arm[6], torso offset] (attack swings)
  function infKeys(m, p, keys) {
    let i = 0; while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1], t = clamp((p - a[0]) / ((b[0] - a[0]) || 1), 0, 1), e = t * t * (3 - 2 * t);
    const P = m.infPose, arm = P.arm.map((v, j) => { const va = a[1] && a[1][j] != null ? a[1][j] : v, vb = b[1] && b[1][j] != null ? b[1][j] : v; return va + (vb - va) * e; });
    return infCrouch(m, 0, { arm, t: P.t + (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * e });
  }
  const INF_CLIPS = {
    inf_battle: { dur: 70, fn(m, p) { infCrouch(m, S(p * PI * 2)); } },
    inf_attack: { dur: 30, loop: false, fn(m, p) {
      infKeys(m, p, m.infPose.atk);
      if (m.infPose.recoil && p > 0.35 && p < 0.8) { const r = S(p * 60) * 0.05; m.b('armR').rot[0] += r; m.b('armL').rot[0] += r; m.b('torso').rot[0] -= Math.abs(r) * 0.5; }
    } },
    inf_cast: { dur: 36, loop: false, fn(m, p) { const k = S(Math.min(1, p) * PI), P = m.infPose; infCrouch(m, 0, { arm: [P.arm[0], P.arm[1], P.arm[2], -2.5 * k + P.arm[3] * (1 - k), -0.2 * k + P.arm[4] * (1 - k), P.arm[5] * (1 - k)], t: P.t - 0.15 * k }); m.b('head').rot[0] -= 0.25 * k; } },
    inf_hurt: { dur: 18, loop: false, fn(m, p) { const k = S(Math.min(1, p) * PI), P = infCrouch(m, 0); m.b('torso').rot[0] = P.t - 0.5 * k; m.b('head').rot[0] = P.hd - 0.35 * k; m.b('hips').pos[2] = -k * 0.05; m.b('armL').rot[0] += k * 0.5; m.b('armR').rot[0] += k * 0.5; } },
    inf_dead: { dur: 30, loop: false, fn(m, p) { const k = Math.min(1, p) * Math.min(1, p); infCrouch(m, 0); m.b('hips').rot[0] = -1.2 * k; m.b('hips').pos[1] -= 0.12 * k; m.b('torso').rot[0] -= 0.3 * k; } },
  };
  // fill LM with the inverse of the weapon bone's current world rotation, so a weapon mesh drawn upright in world
  // axes (+z forward, +y up, grip at the origin) keeps that orientation in the current pose
  function uprightLM(m, LM) {
    m.update(0); m.computeWorld();
    const W = m.bones.weapon.world, ax = V.norm([W[0], W[1], W[2]]), ay = V.norm([W[4], W[5], W[6]]), az = V.norm([W[8], W[9], W[10]]);
    LM.set([ax[0], ay[0], az[0], 0, ax[1], ay[1], az[1], 0, ax[2], ay[2], az[2], 0, 0, 0, 0, 1]);
    return LM;
  }
  // P: { hood, visor, slit, guard, openChin, pauldron, knee, collar, belt, pose, weapon, height }; the weapon is
  // authored in the idle stance's upright frame (+z forward, +y up, grip at the origin) and mounted with the
  // inverse of the hand's rest rotation, so it points where it was drawn
  function infantry(id, P, spec, scale) {
    const m = human(id, Object.assign({ skin: '#f0c49c', hairStyle: 'none', noEars: true, shoes: false, collarColor: null, pants: 'baggy', bootsTall: true, extras: [],
      custom: (mm, H) => infKit(mm, H, P) }, spec), { scale: scale || 1.7 });
    m.infPose = P.pose; m.clips = INF_CLIPS;
    Object.assign(m.anims, { idle: 'inf_battle', battle: 'inf_battle', attack: 'inf_attack', hurt: 'inf_hurt', cast: 'inf_cast', item: 'inf_cast', dead: 'inf_dead', defend: 'inf_battle', weak: 'inf_battle' });
    const wm = P.weapon ? meshOf(P.weapon) : null, LM = new Float32Array(16);
    m.weaponMesh = wm;
    m.showWeapon = (on) => { m.bones.weapon.meshes = on && wm ? [{ mesh: wm, m: LM, opts: TWO_SIDED }] : []; };
    // (re)mount the weapon for the current m.infPose
    m.infMount = () => { m.play('inf_battle', { restart: true }); uprightLM(m, LM); };
    m.infMount(); m.showWeapon(true);
    m.height = P.height || 0.9;
    return m;
  }
  // MP / Marine crouch: knees wide, torso over the knees, gun forward in both hands
  const INF_GUN = { t: 0.22, L: [-1.2, 1.5], R: [-0.8, 1.35], sp: 0.46, hd: -0.2, arm: [-0.95, -0.75, 0, -1.1, -0.8, 0, 0.45, -0.55], recoil: true,
    atk: [[0], [0.25, [-1.4, -0.3, 0, -1.55, -0.35, 0, 0.4, -0.5], -0.06], [0.8, [-1.4, -0.3, 0, -1.55, -0.35, 0, 0.4, -0.5], -0.06], [1]] };
  // submachine gun (MP) / assault rifle (Marine), drawn pointing forward
  function infGun(mb, len, G) {
    mb.rbox(0, -0.03, -0.004, 0.022, 0.058, 0.03, G, 0.25);                       // pistol grip
    mb.rbox(0, 0.012, 0.03 + len * 0.3, 0.032, 0.048, 0.1 + len * 0.6, G, 0.2);    // receiver
    mb.rbox(0, -0.04, 0.1, 0.018, 0.075, 0.028, sh(G, -0.3), 0.2);                // magazine
    tube(mb, [0, 0.016, 0.08 + len * 0.9], [0, 0.016, 0.16 + len * 1.3], 0.009, 0.008, '#16161a', 6);   // barrel
    mb.rbox(0, 0.004, -0.07, 0.022, 0.036, 0.09, G, 0.2);                         // stock
  }

  // ================================================================== No. 1 Reactor / station
  // ---- MP: teal hooded helmet with red visor and gold face guard, steel-teal uniform, white pads, gold knees, SMG
  def('mp', () => infantry('mp', { hood: '#3a7294', visor: '#161a24', slit: '#ff2a20', guard: '#d8b030', pauldron: '#dce4e8', knee: '#d8b030', collar: '#2a3a7a', belt: '#2a3a6a',
    pose: INF_GUN, weapon: mb => infGun(mb, 0.12, '#30323a'), height: 0.9 }, {
    top: '#5f8fa0', sleeve: '#5f8fa0', bottom: '#5f8fa0', boots: '#23252e', bootCuff: '#c8a030', gloves: '#6a4a30',
    torso: (Pt) => { Pt.band(0.88, 1.0, '#2a3a7a'); Pt.poly([[-0.34, 1.0], [-0.16, 1.0], [0.3, 0.12], [0.14, 0.12]], '#2a3a7a'); },
  }));

  def('guard_hound', (a) => hound(a, { c1: '#243463', c2: '#141c3a', c3: '#3a5090', eye: '#f0e040', size: 1.2 }));

  // ---- Mono Drive: small floating drone — pink dome, rainbow petal fins, striped stalk
  function drone(look, P) {
    const m = rig(look); m.floats = true;
    m.bone('body', 'root', [0, 1.05, 0]); m.bone('head', 'body', [0, 0.12, 0]);
    att(m, 'body', mb => {
      ell(mb, 0, 0.0, 0, 0.1, 0.08, 0.1, P.c2, 8, 5);
      for (let i = 0; i < 12; i++) { const y = -0.08 - i * 0.04; ell(mb, 0, y, 0, 0.018, 0.022, 0.018, i % 2 ? P.s1 : P.s2, 5, 3); }
    });
    att(m, 'head', mb => { ell(mb, 0, 0.02, 0, 0.09, 0.08, 0.09, P.c1, 8, 5); if (P.top) ell(mb, 0, 0.1, 0, 0.04, 0.03, 0.04, P.top, 6, 3); });
    const cols = P.fins;
    for (let i = 0; i < 6; i++) {
      const an = i / 6 * PI * 2;
      m.bone('t' + i, 'body', [S(an) * 0.08, -0.02, C(an) * 0.08], [0, an, 0]);
      att(m, 't' + i, mb => {
        const pts = bez([0, 0, 0], [0, 0.02, 0.2], [0, -0.22, 0.28], 6);
        sweep(mb, pts, [[0.05, 0.015], [0.05, 0.014], [0.045, 0.012], [0.04, 0.012], [0.03, 0.01], [0.02, 0.008], [0.004, 0.004]], cols[i % cols.length], 6);
      });
    }
    m.height = 1.3; m.lungeScale = 0.8;
    return m;
  }
  def('mono_drive', (a) => drone(a, { c1: '#e088b0', c2: '#70b060', top: '#f0c0d0', fins: ['#60c070', '#e0d040', '#40a0d0', '#d06060', '#60c070', '#a060d0'], s1: '#e8e0e0', s2: '#c04060' }));
  def('scrutin_eye', (a) => { const m = drone(a, { c1: '#8a50b8', c2: '#6a3a9a', top: '#e8d030', fins: ['#8a4ab0', '#6a3aa0', '#9a60c0'], s1: '#e0e050', s2: '#40a060' }); m.scale = 1.25; return m; });

  // ---- Grunt / Special Combatant / Senior Grunt: hunched trooper in a deep sumo squat — torso pitched
  //      forward, neck jutting, white helmet with a visor band and grey mask, huge cylinder claw gauntlets
  //      held low in front, thick bent legs (one model, three palettes)
  function grunt(look, P) {
    const m = rig(look);
    const B = P.body, D = sh(P.body, -0.35), L = sh(P.body, 0.15), W = '#e8ecf0', GN = P.gaunt || '#c8ccd4', GD = '#e0c050';
    const HUNCH = 0.45, tp = (x, y, z) => [x, y * C(HUNCH) - z * S(HUNCH), y * S(HUNCH) + z * C(HUNCH)]; // torso frame -> body
    m.bone('body', 'root', [0, 0.64, 0]);
    m.bone('head', 'body', tp(0, 0.56, 0.24));
    m.bone('armL', 'body', tp(0.3, 0.46, 0)); m.bone('armR', 'body', tp(-0.3, 0.46, 0));
    m.bone('legFL', 'body', [0.15, -0.02, 0]); m.bone('legFR', 'body', [-0.15, -0.02, 0]);
    att(m, 'body', mb => {
      mb.push(); mb.rotate(HUNCH, 0, 0);
      // narrow waist, big chest and shoulders
      mb.loft([{ y: -0.06, rx: 0.16, rz: 0.12 }, { y: 0.08, rx: 0.14, rz: 0.11 }, { y: 0.24, rx: 0.2, rz: 0.14 }, { y: 0.4, rx: 0.3, rz: 0.17, rzf: 0.2 }, { y: 0.52, rx: 0.28, rz: 0.15 }, { y: 0.6, rx: 0.1, rz: 0.08 }], { sides: 8, color: B });
      LR(s => { ell(mb, s * 0.11, 0.4, 0.13, 0.11, 0.09, 0.07, L, 6, 4); ell(mb, s * 0.3, 0.47, 0.0, 0.14, 0.12, 0.13, B, 7, 5); });
      for (let i = 0; i < 3; i++) mb.box(0, 0.13 + i * 0.07, 0.12, 0.14, 0.04, 0.04, i % 2 ? L : B);
      mb.pop();
      mb.loft([{ y: -0.12, rx: 0.2, rz: 0.14 }, { y: 0.0, rx: 0.19, rz: 0.13 }], { sides: 8, color: D });
    });
    att(m, 'head', mb => {
      tube(mb, [0, -0.02, -0.12], [0, 0.04, 0.0], 0.07, 0.07, D, 6);
      ell(mb, 0, 0.08, 0.0, 0.125, 0.13, 0.125, W, 8, 5);
      mb.loft([{ y: 0.08, rx: 0.131, rz: 0.131 }, { y: 0.135, rx: 0.131, rz: 0.131 }], { sides: 10, color: P.visor });
      mb.rbox(0, 0.03, 0.09, 0.17, 0.1, 0.08, '#b8bcc4', 0.3);
      LR(s => ell(mb, s * 0.05, 0.03, 0.13, 0.032, 0.032, 0.015, '#8a8e98', 6, 3));
      LR(s => mb.box(s * 0.075, 0.21, -0.01, 0.06, 0.05, 0.07, '#c8ccd4'));
    });
    // arms: short thick upper arm to a huge claw gauntlet (cylinder) held low in front, pointing forward
    const arm = (s) => meshOf(mb => {
      ell(mb, 0, 0, 0, 0.11, 0.1, 0.11, B, 6, 4);
      const el = [s * 0.04, -0.3, 0.12];
      limb(mb, [[0, 0, 0], el], [0.085, 0.08], B, 7);
      along(mb, V.add(el, [0, -0.02, -0.08]), [-s * 0.22, -0.55, 1]);
      mb.prism(0, 0, 0, 0.155, 0.165, 0.44, 8, GN);
      mb.prism(0, 0.11, 0, 0.17, 0.17, 0.05, 8, sh(GN, -0.25)); mb.prism(0, 0.29, 0, 0.17, 0.17, 0.04, 8, sh(GN, -0.25));
      mb.prism(0, 0.44, 0, 0.13, 0.09, 0.04, 8, sh(GN, -0.4));
      mb.box(0, 0.22, 0.16, 0.1, 0.18, 0.04, sh(GN, 0.15));
      for (let i = 0; i < 3; i++) { const a2 = i / 3 * PI * 2 + PI / 2; mb.lock([C(a2) * 0.1, 0.45, S(a2) * 0.1], [C(a2) * 0.4, 1, S(a2) * 0.4], [-C(a2) * 0.4, 0.6, -S(a2) * 0.4], 0.22, 0.06, 0.035, GD, null, '#f8f0c0'); }
      mb.pop();
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    // deep squat: thighs out and forward, knees wide, shins back down to the feet (gold toe spike)
    const leg = (s) => meshOf(mb => {
      const kn = [s * 0.3, -0.2, 0.16], an = [s * 0.34, -0.54, -0.02];
      limb(mb, [[0, 0, 0], kn, an], [0.13, 0.11, 0.08], B, 7);
      ball(mb, kn, 0.12, L);
      mb.frustum(an[0], -0.6, an[2] + 0.05, 0.14, 0.26, 0.12, 0.2, 0.1, { side: D, top: B });
      spike(mb, [an[0], -0.57, an[2] + 0.18], [0, -0.1, 1], 0.09, 0.03, GD, 3);
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    // the feet stay planted while the torso pitches in the clips; cast raises the gauntlets to aim, not overhead
    m.onPose = (mm) => {
      const Bn = mm.bones, kc = clipK(mm, 'e_cast');
      if (Bn.body) ['legFL', 'legFR'].forEach(n => { if (Bn[n]) Bn[n].rot[0] -= Bn.body.rot[0]; });
      ['armL', 'armR'].forEach(n => { if (Bn[n]) Bn[n].rot[0] += kc * 1.2; });
    };
    m.height = 1.3; m.lungeScale = 1.2;
    return m;
  }
  def('grunt', (a) => grunt(a, { body: '#3a64c8', visor: '#2a4ab8' }));
  def('special_combatant', (a) => grunt(a, { body: '#c42020', visor: '#c01818' }));
  // Disc 2 (Junon / Underwater Reactor): FF7 reuses the Grunt model for the Senior Grunt
  def('senior_grunt', (a) => grunt(a, { body: '#2e7a6c', visor: '#e0a020', gaunt: '#d8d8c8' }));

  // ---- 1st Ray / Laser Cannon: turret on one jointed leg — big angular faceted body, cylinder on top, two big
  //      wing blades in a V, cannon pointing forward, side fin, rear plate, crossbar hip and a pointed foot
  function rayTurret(look, P) {
    const m = rig(look);
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('head', 'body', [0, 1.14, 0]);
    att(m, 'body', mb => {
      // jointed leg: pointed foot -> dark knee block -> thigh -> crossbar hip -> short post
      const tip = [0.14, 0, 0.02], kn = [-0.1, 0.5, 0.0], hip = [0.02, 0.98, 0];
      obox(mb, tip, kn, 0.03, 0.03, 0.1, 0.1, P.leg);
      obox(mb, kn, hip, 0.1, 0.1, 0.09, 0.09, P.leg);
      mb.push(); mb.translate(kn[0], kn[1], kn[2]); mb.rotate(0, 0, -0.4); mb.box(0, 0, 0, 0.16, 0.14, 0.15, P.joint); mb.pop();
      mb.box(0.02, 1.0, 0, 0.52, 0.08, 0.08, P.bar);
      LR(s => mb.box(0.02 + s * 0.26, 1.0, 0, 0.04, 0.1, 0.1, P.joint));
      mb.box(0.02, 1.08, 0, 0.1, 0.12, 0.1, P.joint);
    });
    att(m, 'head', mb => {
      // angular faceted body (~0.48 wide x 0.52 tall)
      mb.sphere(0, 0.2, 0, 0.25, 0.27, 0.23, P.body, 6, 3, false, (i, j) => j === 0 ? sh(P.body, 0.18) : j === 2 ? sh(P.body, -0.25) : P.body);
      mb.prism(0, 0.4, -0.02, 0.075, 0.075, 0.22, 6, P.top);
      // two big wing blades in a V, collared at the base
      LR(s => {
        const b = [s * 0.12, 0.34, -0.08], d = [s * 0.6, 1, -0.28];
        mb.blade(b, d, 0.74, 0.18, 0.06, P.fin, [1, -s * 0.6, 0], sh(P.fin, 0.12));
        mb.blade(b, d, 0.22, 0.21, 0.08, P.finBase, [1, -s * 0.6, 0]);
      });
      // cannon forward (slightly to the model's left), side fin, rear plate, rod below
      mb.push(); mb.translate(0.1, 0.16, 0.16); mb.rotate(PI / 2, 0, 0);
      mb.prism(0, 0, 0, 0.075, 0.07, 0.34, 7, P.gun); mb.prism(0, 0.3, 0, 0.085, 0.085, 0.06, 7, P.gunRing); mb.prism(0, 0.36, 0, 0.04, 0.04, 0.005, 6, '#101010');
      mb.pop();
      mb.blade([0.2, 0.26, 0.04], [0.5, 1, 0.2], 0.36, 0.1, 0.04, P.fin2, [1, -0.5, 0], sh(P.fin2, 0.2));
      mb.blade([-0.14, 0.14, -0.12], [-0.8, 0.1, -0.6], 0.34, 0.2, 0.04, P.back, [0, 1, 0]);
      mb.blade([0.14, 0.04, 0.06], [0.3, -1, 0.3], 0.32, 0.05, 0.04, P.rod, [1, 0, 0]);
    });
    m.height = 2.1; m.lungeScale = 0.3;
    return m;
  }
  def('1st_ray', (a) => rayTurret(a, { body: '#1e7a70', top: '#e0c030', fin: '#d02818', finBase: '#e8c030', fin2: '#e05020', gun: '#b02818', gunRing: '#e07040', back: '#505058', rod: '#3050c0',
    leg: '#b86a38', joint: '#5a3020', bar: '#b86a38' }));
  def('laser_cannon', (a) => rayTurret(a, { body: '#d83830', top: '#a898e0', fin: '#2040e0', finBase: '#a07040', fin2: '#40a0e0', gun: '#d8d8e8', gunRing: '#9898b0', back: '#a07040', rod: '#2a4a8a',
    leg: '#c0b8e0', joint: '#2a3a5a', bar: '#e0e0e8' }));

  // ---- Sweeper / Custom Sweeper / Death Machine: squat heavy "bulldog" mech — wide hull pitched forward,
  //      toothed gatling grille with two tubes on top, onion dome at the back, big box gun arms with grey
  //      bands, short thick bent legs on huge fanned claw feet (one model, three palettes)
  function sweeper(look, P) {
    const m = rig(look);
    const G = P.metal, D = sh(P.metal, -0.35), L = sh(P.metal, 0.18), PN = P.panel, GN = P.gun, TR = P.trim;
    m.bone('body', 'root', [0, 0.92, 0]);
    m.bone('head', 'body', [0, 0.74, -0.34]);
    m.bone('gunL', 'body', [0.72, 0.3, 0.08]); m.bone('gunR', 'body', [-0.72, 0.3, 0.08]);
    // gun recoil; the feet stay planted while the hull pitches
    m.onPose = (mm) => { gunPose(mm); const B = mm.bones; if (B.body) ['legFL', 'legFR'].forEach(n => { if (B[n]) B[n].rot[0] -= B.body.rot[0]; }); };
    m.bone('legFL', 'body', [0.36, 0.02, -0.08]); m.bone('legFR', 'body', [-0.36, 0.02, -0.08]);
    att(m, 'body', mb => {
      // hull: a wide wedge, lower and narrower at the front (pitched forward like a bulldog)
      mb.push(); mb.translate(0, 0.38, 0); mb.rotate(0.34, 0, 0);
      mb.frustum(0, -0.34, 0, 1.08, 0.86, 1.16, 0.92, 0.7, { side: G, front: G, back: D, top: L, bottom: D });
      // back plate + angular shoulder armour in the panel colour, trim edging
      mb.frustum(0, 0.36, -0.08, 1.0, 0.7, 0.8, 0.5, 0.12, { side: sh(PN, -0.15), top: PN });
      LR(s => {
        mb.frustum(s * 0.55, -0.1, 0.02, 0.2, 0.78, 0.14, 0.64, 0.5, { side: L, top: sh(L, 0.12), front: G, back: D });
        mb.box(s * 0.62, 0.06, 0.02, 0.04, 0.3, 0.6, PN);
        mb.box(s * 0.44, 0.37, 0.3, 0.26, 0.05, 0.3, TR);
      });
      // gatling grille "mouth": frame, black throat, fangs, two tubes on top
      mb.box(0, -0.02, 0.47, 0.7, 0.5, 0.1, TR);
      mb.box(0, -0.02, 0.51, 0.56, 0.38, 0.04, '#18181c');
      for (let i = 0; i < 5; i++) { const x = (i - 2) * 0.1; mb.loft([{ y: 0.14, rx: 0.036, rz: 0.03, x, z: 0.53 }, { y: -0.08, rx: 0.034, rz: 0.028, x, z: 0.54 }, { y: -0.18, rx: 0.004, rz: 0.004, x, z: 0.54 }], { sides: 5, color: P.teeth }); }
      LR(s => { mb.prism(s * 0.14, 0.2, 0.44, 0.075, 0.075, 0.2, 7, P.tubes); mb.prism(s * 0.14, 0.4, 0.44, 0.05, 0.05, 0.01, 6, sh(P.tubes, -0.4)); });
      mb.pop();
      // hip block
      mb.frustum(0, -0.12, -0.08, 0.7, 0.5, 0.86, 0.6, 0.2, D);
    });
    att(m, 'head', mb => {
      // onion dome on the back with a blue crystal antenna
      mb.loft([{ y: -0.04, rx: 0.24, rz: 0.24 }, { y: 0.1, rx: 0.32, rz: 0.32 }, { y: 0.24, rx: 0.26, rz: 0.26 }, { y: 0.36, rx: 0.12, rz: 0.12 }, { y: 0.46, rx: 0.06, rz: 0.06 }, { y: 0.54, rx: 0.0, rz: 0.0 }], { sides: 8, color: P.dome });
      mb.loft([{ y: 0.0, rx: 0.325, rz: 0.325 }, { y: 0.06, rx: 0.33, rz: 0.33 }], { sides: 8, color: sh(P.dome, -0.3) });
      mb.prism(0.14, 0.18, 0.04, 0.035, 0.035, 0.2, 5, '#40405a');
      spike(mb, [0.14, 0.36, 0.04], [0, 1, 0], 0.16, 0.05, P.ant, 4); spike(mb, [0.14, 0.38, 0.04], [0, -1, 0], 0.04, 0.05, P.ant, 4);
    });
    // big box guns: gun-colour boxes with grey bands, a red lamp and a dark muzzle
    const cannon = (s) => meshOf(mb => {
      mb.box(s * 0.08, 0, 0.12, 0.38, 0.42, 0.92, GN);
      mb.box(s * 0.08, 0.215, 0.12, 0.3, 0.02, 0.84, sh(GN, 0.18));
      [-0.14, 0.18].forEach(z => mb.box(s * 0.08, 0, 0.12 + z, 0.41, 0.45, 0.08, P.band));
      mb.box(s * 0.08, 0, 0.6, 0.3, 0.32, 0.06, P.band);
      mb.push(); mb.translate(s * 0.08, 0, 0.62); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0, 0, 0.08, 0.08, 0.06, 8, '#18181c'); mb.pop();
      spike(mb, [s * 0.28, 0.06, 0.3], [s, 0, 0], 0.08, 0.06, '#e03020', 4);
      mb.box(s * -0.1, 0.02, -0.18, 0.14, 0.24, 0.3, D);
    });
    m.attach('gunL', cannon(1)); m.attach('gunR', cannon(-1));
    // short, thick bent legs (knee forward) on huge fanned claw feet
    const leg = (s) => meshOf(mb => {
      const hip = [0, 0, 0], knee = [s * 0.08, -0.4, 0.22], ank = [s * 0.04, -0.8, -0.04];
      limb(mb, [hip, knee, ank], [0.19, 0.16, 0.13], [G, D], 7);
      obox(mb, [s * 0.06, 0.02, 0.02], [s * 0.1, -0.32, 0.22], 0.36, 0.34, 0.3, 0.26, PN);
      ball(mb, knee, 0.17, P.band);
      mb.frustum(ank[0], -0.9, ank[2] + 0.04, 0.3, 0.34, 0.24, 0.26, 0.14, D);
      for (let i = 0; i < 6; i++) { const an = (i - 2.5) * 0.3; mb.blade([ank[0], -0.86, ank[2] + 0.08], [S(an), -0.14, C(an)], 0.62, 0.11, 0.04, P.feet, [0, 1, 0], P.feetTip); }
      for (let i = -1; i <= 1; i += 2) mb.blade([ank[0], -0.86, ank[2] - 0.06], [i * 0.35, -0.12, -1], 0.34, 0.1, 0.04, P.feet, [0, 1, 0], P.feetTip);
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 2.2; m.lungeScale = 0.6;
    return m;
  }
  def('sweeper', (a) => sweeper(a, { metal: '#5a6478', panel: '#8a5a38', gun: '#b0602a', band: '#6a6e78', trim: '#b4b8c2', teeth: '#f0f0f0', tubes: '#7060c0',
    dome: '#b8a078', ant: '#6080e8', feet: '#e8e0c8', feetTip: '#c8b890' }));
  def('custom_sweeper', (a) => sweeper(a, { metal: '#2e4a44', panel: '#3a5a40', gun: '#4a5054', band: '#8a9098', trim: '#c0a040', teeth: '#f0f0ec', tubes: '#9ea4ac',
    dome: '#6a8a70', ant: '#a0e0d0', feet: '#d8c070', feetTip: '#a08a40' }));
  // Disc 2 (Junon / Underwater Reactor): FF7 reuses the Sweeper model for the Death Machine
  def('death_machine', (a) => sweeper(a, { metal: '#6a6c78', panel: '#5a2a3a', gun: '#4a2440', band: '#8a8a96', trim: '#9a9aa6', teeth: '#d0c060', tubes: '#8a8c98',
    dome: '#b09a70', ant: '#5070d0', feet: '#e0dccc', feetTip: '#b0a890' }));

  // ================================================================== Guard Scorpion (boss)
  // oriented tapered box from a to b (local +y along a->b): w = width (horizontal, across), d = depth; w1/d1 at b
  function obox(mb, a, b, w0, d0, w1, d1, col) { const dv = V.sub(b, a), L = V.len(dv); if (L < 1e-6) return; along(mb, a, dv); mb.frustum(0, 0, 0, w0, d0, w1, d1, L, col); mb.pop(); }
  // ---- Guard Scorpion: compact red-orange armoured crab mech on 4 thick red claw legs per side (gold hip
  //      pods, black knees, purple tips), long gun arms, chest screen, green face, turret, and a thick
  //      segmented tail arcing over the back to a blue-white blade. m.tailUp (the Tail Laser stance) cocks it.
  def('guard_scorpion', (a) => {
    const m = rig(a);
    const RED = '#c84020', DR = '#a02818', OR = '#e06a30', GOLD = '#e8b830', BLK = '#2a2430', ST = '#9ea2b2', PU = '#7040a0';
    m.bone('body', 'root', [0, 1.5, 0]);
    m.bone('head', 'body', [0, 0.84, 0.5]);
    m.bone('tail', 'body', [0, 0.9, -0.5]);
    m.bone('armL', 'body', [0.82, 1.08, 0.1]); m.bone('armR', 'body', [-0.82, 1.08, 0.1]);
    [['FL', 1, 1], ['FR', -1, 1], ['BL', 1, -1], ['BR', -1, -1]].forEach(([n, sx, sz]) => m.bone('leg' + n, 'body', [sx * 0.45, 0, sz * 0.3]));
    att(m, 'body', mb => {
      // black pelvis core with a gold belt (the leg pods plug into it)
      mb.loft([{ y: -0.34, rx: 0.4, rz: 0.36 }, { y: -0.1, rx: 0.6, rz: 0.54 }, { y: 0.2, rx: 0.62, rz: 0.55 }], { sides: 8, sq: 3, color: BLK });
      mb.loft([{ y: 0.18, rx: 0.64, rz: 0.57 }, { y: 0.34, rx: 0.64, rz: 0.57 }], { sides: 8, sq: 3, color: GOLD });
      // red chest block: gold-framed dark screen, red slit lamps, gold bumper
      mb.frustum(0, 0.3, 0.02, 1.0, 0.86, 1.12, 0.94, 0.56, { side: RED, front: RED, back: DR, top: DR, bottom: DR });
      mb.box(0, 0.58, 0.49, 0.44, 0.38, 0.04, DR);
      mb.box(0, 0.58, 0.51, 0.32, 0.28, 0.02, GOLD);
      mb.box(0, 0.58, 0.525, 0.24, 0.2, 0.02, '#1e4e4a');
      LR(s => mb.box(s * 0.36, 0.62, 0.48, 0.16, 0.035, 0.02, '#ff3a2a'));
      mb.box(0, 0.36, 0.48, 1.0, 0.08, 0.08, GOLD); mb.box(0, 0.46, 0.49, 0.8, 0.04, 0.04, BLK);
      // upper carapace overhanging the face, gold chevron on the front, dark red shoulder blocks
      const CAR = [{ y: 0.84, rx: 0.64, rz: 0.46, z: -0.06 }, { y: 1.04, rx: 0.82, rz: 0.64, z: 0.0 }, { y: 1.26, rx: 0.74, rz: 0.6, z: 0 }, { y: 1.4, rx: 0.44, rz: 0.36, z: -0.04 }, { y: 1.46, rx: 0.2, rz: 0.16, z: -0.06 }];
      mb.loft(CAR, { sides: 8, sq: 2.6, color: RED });
      mb.loft([{ y: 1.02, rx: 0.835, rz: 0.655 }, { y: 1.08, rx: 0.835, rz: 0.655 }], { sides: 8, sq: 2.6, color: DR });
      // point on the carapace front surface at (x, y), pushed out by e
      const onCar = (x, y, e) => {
        let k = 0; while (k < CAR.length - 2 && CAR[k + 1].y < y) k++;
        const r0 = CAR[k], r1 = CAR[k + 1], f = clamp((y - r0.y) / (r1.y - r0.y), 0, 1);
        const rx = r0.rx + (r1.rx - r0.rx) * f, rz = r0.rz + (r1.rz - r0.rz) * f, z0 = r0.z + (r1.z - r0.z) * f;
        return [x, y, z0 + rz * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(x) / rx), 2.6)), 1 / 2.6) + (e || 0.03)];
      };
      LR(s => {
        // chevron arm: a strip from the centre-bottom up to the outer top, following the surface
        for (let i = 0; i < 3; i++) {
          const u0 = i / 3, u1 = (i + 1) / 3, P = (u, v) => onCar(s * (0.05 + u * 0.46 + v * 0.14), 0.9 + u * 0.4 - v * 0.06, 0.03);
          const q = [P(u0, 0), P(u1, 0), P(u1, 1), P(u0, 1)];
          if (s > 0) mb.quad(q[0], q[3], q[2], q[1], GOLD); else mb.quad(q[0], q[1], q[2], q[3], GOLD);
        }
        mb.rbox(s * 0.72, 1.06, 0.04, 0.34, 0.46, 0.56, DR, 0.2);
        mb.box(s * 0.72, 1.3, 0.04, 0.26, 0.04, 0.44, GOLD);
        spike(mb, [s * 0.38, 1.36, -0.12], [s * 0.2, 1, -0.2], 0.2, 0.05, ST, 4);
      });
      mb.frustum(0, 0.94, 0.5, 0.16, 0.1, 0.08, 0.06, 0.34, OR);
      // turret on top: gold collar, orange cone, cyan lens
      mb.prism(0, 1.44, -0.06, 0.2, 0.2, 0.06, 8, GOLD);
      mb.prism(0, 1.5, -0.06, 0.17, 0.05, 0.3, 8, OR);
      spike(mb, [0, 1.79, -0.06], [0, 1, 0.2], 0.12, 0.04, '#60e0f0', 4);
      LR(s => obox(mb, [s * 0.2, 1.44, -0.12], [s * 0.26, 1.62, -0.14], 0.05, 0.05, 0.04, 0.04, ST));
      // front centre stinger under the chest
      spike(mb, [0, -0.2, 0.36], [0, -1, 0.12], 1.05, 0.17, '#3c4058', 5);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0, 0.02, 0.25, 0.16, 0.14, '#5a8a68', 8, 5);
      LR(s => eye(mb, s * 0.1, 0.02, 0.14, 0.045, '#d8f040'));
      obox(mb, [0, 0.1, 0.04], [0, 0.12, 0.2], 0.52, 0.08, 0.46, 0.06, ST);
      mb.box(0, -0.13, 0.08, 0.32, 0.08, 0.14, '#5a2a6a');
    });
    // gun arms: thick orange tubes up-out from the shoulders, forward and down to a grey muzzle + hook fingers
    const arm = (s) => meshOf(mb => {
      const pts = bez3([0, 0, 0], [s * 0.45, 0.5, 0.1], [s * 0.78, 0.35, 0.75], [s * 0.58, -0.72, 1.3], 9);
      sweep(mb, pts, pts.map((p, i) => [0.2 - i * 0.004, 0.23 - i * 0.006]), [DR, RED, OR, RED, OR, OR, RED, OR, RED], 6);
      for (let i = 4; i < 8; i++) spike(mb, V.add(pts[i], [-s * 0.1, -0.12, 0]), [-s * 0.8, -0.6, 0.2], 0.15, 0.06, GOLD, 3);
      const tip = pts[9];
      along(mb, tip, V.sub(pts[9], pts[8]));
      mb.prism(0, -0.04, 0, 0.17, 0.15, 0.2, 6, '#6a6c7a'); mb.prism(0, 0.16, 0, 0.09, 0.09, 0.08, 6, '#18181c');
      for (let i = -1; i <= 1; i++) mb.blade([i * 0.07, 0.02, -0.12], [i * 0.3, 0.6, -1], 0.2, 0.05, 0.03, '#b8bcc8');
      mb.pop();
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    // tail: 9 boxy armour segments over a black spine, arcing up and over the back; blue-white blade tip
    att(m, 'tail', mb => {
      const pts = bez3([0, 0, 0], [0, 0.55, -0.7], [0, 1.4, -0.65], [0, 1.25, 0.18], 9);
      sweep(mb, pts, taper(9, 0.2, 0.12), BLK, 6);
      for (let i = 0; i < 9; i++) {
        const p0 = lerp3(pts[i], pts[i + 1], -0.12), p1 = lerp3(pts[i], pts[i + 1], 0.98), w = 0.56 - i * 0.026, d = 0.5 - i * 0.026, c = i % 2 ? RED : OR;
        obox(mb, p0, p1, w, d, w * 0.86, d * 0.84, { side: c, front: sh(c, -0.12), back: sh(c, 0.12), top: DR, bottom: DR });
      }
      const t = pts[9];
      ball(mb, t, 0.19, '#6a6c7a');
      eye(mb, t[0], t[1] - 0.05, t[2] + 0.17, 0.06, '#ff3030');
      for (let i = -1; i <= 1; i++) mb.blade([t[0] + i * 0.09, t[1], t[2] + 0.05], [i * 0.35, -0.55, 1], 0.6 - Math.abs(i) * 0.1, 0.13, 0.05, '#e0ecff', null, '#7090d8');
    });
    // legs: gold hip pod -> black knee -> thick red cone claw curving down to a purple tip (2 legs per bone)
    const leg = (s, front) => meshOf(mb => {
      const bo = [s * 0.45, 0, front ? 0.3 : -0.3];
      (front ? [0.5, 1.12] : [1.8, 2.45]).forEach(an => {
        const R = (r, y) => [s * S(an) * r - bo[0], y, C(an) * r - bo[2]];
        obox(mb, R(0.42, 0.0), R(1.02, 0.18), 0.46, 0.5, 0.38, 0.42, { side: GOLD, front: BLK, back: GOLD, top: BLK, bottom: BLK, left: sh(GOLD, -0.2), right: sh(GOLD, -0.2) });
        obox(mb, R(0.62, 0.3), R(1.0, 0.36), 0.3, 0.1, 0.26, 0.08, ST);
        ball(mb, R(1.12, 0.16), 0.2, BLK);
        const pts = [R(1.12, 0.2), R(1.32, -0.06), R(1.52, -0.54), R(1.66, -1.04), R(1.72, -1.5)];
        sweep(mb, pts, [0.2, 0.28, 0.23, 0.13, 0.0], [RED, RED, mix(RED, PU, 0.45), PU], 5);
      });
    });
    m.attach('legFL', leg(1, true)); m.attach('legFR', leg(-1, true)); m.attach('legBL', leg(1, false)); m.attach('legBR', leg(-1, false));
    // the tail jabs forward over the body on attack (the stock clip only winds it back); tailUp cocks it;
    // the arms aim instead of swinging to the sky; the legs stay planted while the body pitches
    m.onPose = (mm) => {
      const B = mm.bones, k = clipK(mm, 'e_attack'), kc = clipK(mm, 'e_cast');
      if (B.tail) B.tail.rot[0] += k * 1.4 + (mm.tailUp ? 0.35 : 0);
      ['armL', 'armR'].forEach(n => { if (B[n]) B[n].rot[0] += k * 0.8 + kc * 1.5; });
      if (B.body) ['legFL', 'legFR', 'legBL', 'legBR'].forEach(n => { if (B[n]) B[n].rot[0] -= B.body.rot[0]; });
    };
    m.height = 3.8; m.lungeScale = 0.5;
    return m;
  });

  // ================================================================== No. 5 Reactor / Sector 7 undercity
  // ---- Grashtrike / Head Hunter: upright mantis bug (~1.1 m) — broad angular carapace over the shoulders,
  //      orange-brown belly, long down-turned snout, whip antennae, clawed forelimbs, and a thick curled
  //      segmented abdomen with a fin tip (one model, two palettes)
  function mantisBug(look, P) {
    const m = rig(look);
    const T = P.body, TL = P.plate, Y = P.belly, AB = P.abd;
    m.bone('body', 'root', [0, 0.26, 0]);
    m.bone('head', 'body', [0, 0.52, 0.08]);
    m.bone('armL', 'body', [0.14, 0.4, 0.08]); m.bone('armR', 'body', [-0.14, 0.4, 0.08]);
    m.bone('tail', 'body', [0, -0.02, -0.02]);
    att(m, 'body', mb => {
      // thorax: narrow waist flaring to broad angular shoulders, orange belly plates in front
      mb.push(); mb.rotate(0.15, 0, 0);
      mb.loft([{ y: -0.06, rx: 0.1, rz: 0.08 }, { y: 0.16, rx: 0.12, rz: 0.09 }, { y: 0.36, rx: 0.19, rz: 0.11 }, { y: 0.46, rx: 0.2, rz: 0.11 }, { y: 0.54, rx: 0.08, rz: 0.07 }], { sides: 8, sq: 2.6, color: T });
      for (let i = 0; i < 4; i++) ell(mb, 0, 0.04 + i * 0.1, 0.07, 0.09 - i * 0.004, 0.055, 0.045, i % 2 ? Y : sh(Y, -0.12), 6, 3);
      // carapace: pauldron plates flaring out and down, jagged fringe down the back
      LR(s => {
        mb.blade([s * 0.12, 0.5, 0.0], [s * 0.9, -0.5, -0.1], 0.3, 0.2, 0.04, TL, [0, 0.3, 1], T);
        mb.blade([s * 0.1, 0.46, -0.06], [s * 0.6, -0.8, -0.4], 0.34, 0.18, 0.04, sh(TL, -0.1), null, T);
        for (let i = 0; i < 3; i++) mb.blade([s * 0.1, 0.34 - i * 0.12, -0.06], [s * 0.8, -0.5, -0.5], 0.16, 0.1, 0.03, TL, null, sh(T, -0.2));
      });
      mb.pop();
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.03, 0.0, 0.07, 0.07, 0.07, T, 7, 5);
      // long snout, curving down in front of the chest
      sweep(mb, bez([0, 0.02, 0.05], [0, 0.0, 0.16], [0, -0.14, 0.22], 4), taper(4, 0.035, 0.008), T, 5);
      mb.blade([0, 0.07, -0.02], [0, 0.6, -1], 0.12, 0.1, 0.03, TL, [1, 0, 0]);
      LR(s => {
        eye(mb, s * 0.05, 0.05, 0.05, 0.025, P.eye);
        sweep(mb, bez([s * 0.025, 0.08, 0.02], [s * 0.08, 0.26, 0.02], [s * 0.18, 0.34, -0.06], 4), taper(4, 0.012, 0.006), '#262634', 4);
        mb.blade([s * 0.18, 0.34, -0.06], [s * 0.4, 1, -0.1], 0.07, 0.03, 0.012, '#e0d040');
      });
    });
    // forelimbs: teal upper arm, long forearm in the claw-arm colour, serrated claw at the tip
    const arm = (s) => meshOf(mb => {
      const el = [s * 0.1, -0.12, 0.08], wr = [s * 0.1, -0.36, 0.12];
      limb(mb, [[0, 0, 0], el], [0.045, 0.04], T, 6);
      obox(mb, el, wr, 0.08, 0.07, 0.06, 0.05, P.fore);
      mb.blade(wr, [0, -1, 0.15], 0.16, 0.07, 0.03, P.claw, [1, 0, 0]);
      for (let i = 0; i < 3; i++) spike(mb, lerp3(el, wr, 0.3 + i * 0.25), [s * 0.2, -0.3, 1], 0.05, 0.015, P.claw, 3);
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    // thick curled abdomen: segments swinging down, out to the side and up, teal plates on top, fin tip
    att(m, 'tail', mb => {
      const pts = bez3([0, 0, 0], [0.08, -0.26, -0.08], [0.34, -0.24, -0.26], [0.46, 0.08, -0.22], 8);
      for (let i = 0; i <= 8; i++) {
        const r = 0.15 - i * 0.011, p = pts[i];
        ell(mb, p[0], p[1], p[2], r, r * 0.85, r, i % 2 ? AB : sh(AB, -0.15), 6, 4);
        if (i > 0 && i < 8) ell(mb, p[0] - 0.02, p[1] + r * 0.45, p[2] - 0.03, r * 0.75, r * 0.4, r * 0.75, i % 2 ? T : TL, 6, 3);
      }
      mb.blade(pts[8], [0.3, 1, 0.1], 0.18, 0.13, 0.03, P.fin, [0, 0, 1], sh(P.fin, 0.2));
      mb.blade(pts[8], [0.8, 0.5, 0.2], 0.14, 0.1, 0.03, P.fin, [0, 0, 1], sh(P.fin, 0.2));
    });
    m.height = 1.1; m.lungeScale = 1;
    return m;
  }
  def('grashtrike', (a) => mantisBug(a, { body: '#48a0b0', plate: '#58b8c4', belly: '#c07820', abd: '#c08030', fore: '#7a40a0', claw: '#c02020', eye: '#f0d020', fin: '#e8a040' }));
  // Disc 2 (Mideel area): FF7 reuses the Grashtrike model for the Head Hunter
  def('head_hunter', (a) => mantisBug(a, { body: '#2a8a2a', plate: '#3aa03a', belly: '#8a4a20', abd: '#9a5a28', fore: '#3a9a90', claw: '#d04a80', eye: '#e050f0', fin: '#e07020' }));

  // ---- Chuse Tank / Malldancer: floating seahorse — segmented S-curved body, tube snout, big fan crest on the
  //      head, dorsal fin, small side fins and a long tail curling forward (one model, two palettes)
  function seahorse(look, P) {
    const m = rig(look); m.floats = true;
    const G = P.body, GD = sh(P.body, -0.25);
    m.bone('body', 'root', [0, 0.62, 0]); m.bone('head', 'body', [0, 0.64, 0.06]); m.bone('tail', 'body', [0, -0.04, 0.02]);
    att(m, 'body', mb => {
      const pts = bez3([0, -0.04, 0.02], [0, 0.2, 0.2], [0, 0.46, -0.08], [0, 0.64, 0.06], 7);
      const rs = [0.08, 0.11, 0.12, 0.11, 0.1, 0.085, 0.075, 0.07];
      sweep(mb, pts, rs.map(r => [r, r * 0.95]), null, 7, (i) => i % 2 ? G : sh(G, 0.1));
      // lighter belly ridges on the front, darker segment rings
      for (let i = 1; i < 7; i++) { ell(mb, 0, pts[i][1], pts[i][2] + rs[i] * 0.72, rs[i] * 0.65, 0.025, 0.04, sh(G, 0.25), 5, 3); mb.loft([{ y: pts[i][1] - 0.012, rx: rs[i] * 1.03, rz: rs[i] * 1.0, z: pts[i][2] }, { y: pts[i][1] + 0.012, rx: rs[i] * 1.03, rz: rs[i] * 1.0, z: pts[i][2] }], { sides: 7, color: GD, capTop: false, capBottom: false }); }
      // dorsal fin fan down the back
      for (let i = 0; i < 4; i++) mb.blade([0, 0.12 + i * 0.1, pts[2 + i][2] - rs[2 + i] * 0.8], [0, 0.3 - i * 0.2, -1], 0.13, 0.1, 0.02, P.fin, [0, 1, 0], sh(P.fin, 0.2));
      // small side fins at the neck
      LR(s => mb.blade([s * 0.07, 0.5, 0.02], [s, 0.2, -0.4], 0.12, 0.08, 0.02, P.fin, [0, 1, 0], sh(P.fin, 0.2)));
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.02, 0.0, 0.09, 0.09, 0.1, G, 7, 5);
      hloft(mb, [{ z: 0.04, w: 0.05, h: 0.05, y: 0.0 }, { z: 0.18, w: 0.03, h: 0.03, y: -0.04 }, { z: 0.26, w: 0.035, h: 0.035, y: -0.06 }], { sides: 6, color: G });
      LR(s => { ell(mb, s * 0.065, 0.04, 0.04, 0.03, 0.03, 0.02, sh(G, 0.25), 5, 3); eye(mb, s * 0.075, 0.04, 0.045, 0.015, '#181818'); });
      // big fan crest sweeping back from the top of the head
      for (let i = 0; i < 6; i++) { const dy = 1 - i * 0.2, dz = -0.25 - i * 0.25; mb.blade([0, 0.07 - i * 0.02, -0.03 - i * 0.025], [0, dy, dz], 0.32 - Math.abs(i - 1.5) * 0.025, 0.15, 0.02, i % 2 ? P.crest : sh(P.crest, 0.1), [0, -dz, dy], P.crestTip); }
    });
    // long tail curling forward under the body
    att(m, 'tail', mb => {
      const pts = bez3([0, 0, 0], [0, -0.32, -0.08], [0.04, -0.58, 0.12], [0, -0.44, 0.3], 8);
      sweep(mb, pts, taper(8, 0.08, 0.015), null, 6, (i) => i % 2 ? G : GD);
    });
    m.height = 1.65; m.scale = P.size || 0.8; m.lungeScale = 1;
    return m;
  }
  def('chuse_tank', (a) => seahorse(a, { body: '#3a9a40', fin: '#e0c840', crest: '#e0c840', crestTip: '#f4ec98' }));
  // Disc 1 (Bone Village region): FF7 reuses the Chuse Tank model for the Malldancer (gold, pink fan crest)
  def('malldancer', (a) => seahorse(a, { body: '#c0a020', fin: '#e06080', crest: '#e06080', crestTip: '#f8c0d8', size: 0.86 }));

  // ---- Blugu / Bloatfloat: floating puffer — round body with a small pouting mouth and small glowing eyes,
  //      two long feelers, big fan fins at the sides, a beard of long spines underneath (one model, two palettes;
  //      the shape follows the old Bloatfloat, with bigger fins)
  function puffer(look, P) {
    const m = rig(look); m.floats = true;
    const B = P.body, BD = sh(P.body, -0.3);
    m.bone('body', 'root', [0, 1.0, 0]); m.bone('head', 'body', [0, 0, 0]);
    m.bone('wingL', 'body', [0.22, 0.02, -0.04]); m.bone('wingR', 'body', [-0.22, 0.02, -0.04]);
    att(m, 'body', mb => {
      ell(mb, 0, 0, 0, 0.26, 0.23, 0.26, B, 10, 6, (i, j) => j > 3 ? BD : j < 1 ? sh(B, 0.18) : B);
      // beard of long spines underneath, radiating down and out
      for (let i = 0; i < 14; i++) { const an = i / 14 * PI * 2; spike(mb, [C(an) * 0.13, -0.15, S(an) * 0.13 + 0.03], [C(an) * 0.6, -1, S(an) * 0.6 + 0.15], 0.26 + (i % 3) * 0.06, 0.028, P.spines[i % P.spines.length], 3); }
      spike(mb, [0, 0.21, -0.02], [0, 1, -0.3], 0.1, 0.035, BD, 4);
      // two long feelers
      LR(s => { sweep(mb, bez([s * 0.08, 0.18, 0.04], [s * 0.3, 0.5, 0.06], [s * 0.5, 0.62, -0.1], 4), taper(4, 0.022, 0.006), P.feeler, 4); });
    });
    att(m, 'head', mb => {
      LR(s => { ell(mb, s * 0.1, 0.05, 0.215, 0.035, 0.03, 0.02, sh(B, -0.2), 5, 3); eye(mb, s * 0.1, 0.05, 0.228, 0.02, P.eye); });
      ell(mb, 0, -0.05, 0.245, 0.05, 0.03, 0.03, sh(B, 0.12), 6, 3);
      mb.box(0, -0.05, 0.27, 0.06, 0.012, 0.01, '#301808');
    });
    // big fan fins: a membrane fan with darker ribs
    const fin = (s) => meshOf(mb => {
      const tip = (i) => { const an = 0.9 - i * 0.4; return [s * (0.12 + C(an) * 0.26), S(an) * 0.42, -0.14 - C(an) * 0.22]; };
      for (let i = 0; i < 4; i++) tri2(mb, [0, 0, 0], tip(i), tip(i + 1), i % 2 ? P.fin : sh(P.fin, 0.1), sh(P.fin, -0.2));
      for (let i = 0; i < 5; i++) mb.blade([0, 0, 0], tip(i), V.len(tip(i)) * 1.04, 0.04, 0.03, sh(P.fin, -0.2), null, P.finTip);
    });
    m.attach('wingL', fin(1)); m.attach('wingR', fin(-1));
    m.height = 1.25; m.scale = P.size || 1; m.lungeScale = 1;
    return m;
  }
  def('blugu', (a) => puffer(a, { body: '#3a58d8', eye: '#f0c020', feeler: '#2030a0', fin: '#d86020', finTip: '#f0a040', spines: ['#40c0c0', '#30a0b0'] }));
  // Disc 1 (Mt. Corel): FF7 reuses the Blugu model for the Bloatfloat (orange puffer, green fins, purple spines)
  def('bloatfloat', (a) => puffer(a, { body: '#c07818', eye: '#f0e020', feeler: '#d8a050', fin: '#3a9a3a', finTip: '#7ac050', spines: ['#8a2aa8', '#c040c0'], size: 0.8 }));

  // ---- Smogger / Slalom / Gas Ducter: chunky hunched gas robot — thick U-shaped exhaust pipe over a box head
  //      (capped ends puffing smoke), plated body with a big octagonal chest plate, one huge box fist reaching
  //      forward with an exhaust pipe hanging from it, segmented legs (one model, three palettes)
  function smogBot(look, P) {
    const m = rig(look);
    const G = P.body, D = sh(P.body, -0.3), Y = P.pipe;
    m.bone('body', 'root', [0, 0.92, 0]);
    m.bone('head', 'body', [0, 0.66, 0.16]);
    m.bone('armL', 'body', [0.42, 0.48, 0.06]); m.bone('armR', 'body', [-0.42, 0.46, 0.02]);
    m.bone('legFL', 'body', [0.17, 0, 0]); m.bone('legFR', 'body', [-0.17, 0, 0]);
    att(m, 'body', mb => {
      mb.push(); mb.rotate(0.3, 0, 0);
      // plated torso: waist, wide chest block, shoulder blocks; big octagonal chest plate
      mb.frustum(0, -0.1, 0, 0.36, 0.3, 0.46, 0.36, 0.2, D);
      mb.frustum(0, 0.1, 0, 0.5, 0.4, 0.66, 0.46, 0.46, { side: G, top: sh(G, 0.15), front: G, back: D, bottom: D });
      mb.push(); mb.translate(0, 0.32, 0.24); mb.rotate(PI / 2, 0, 0); mb.prism(0, -0.04, 0, 0.26, 0.24, 0.1, 8, P.plate); mb.pop();
      LR(s => { mb.rbox(s * 0.38, 0.5, 0.0, 0.26, 0.22, 0.34, G, 0.2); mb.box(s * 0.38, 0.62, 0.0, 0.2, 0.03, 0.26, sh(G, 0.2)); });
      mb.frustum(0, 0.56, 0.02, 0.3, 0.26, 0.2, 0.18, 0.1, P.band);
      mb.pop();
      mb.frustum(0, -0.2, -0.02, 0.4, 0.3, 0.36, 0.28, 0.14, P.limb);
    });
    att(m, 'head', mb => {
      mb.rbox(0, 0.1, 0.0, 0.28, 0.24, 0.26, P.head, 0.2);
      mb.box(0, 0.08, 0.13, 0.18, 0.05, 0.02, '#18201c');
      // thick U exhaust pipe: out to each side, then up; dark caps and smoke puffs at the ends
      const half = (s) => [[0, 0.14, 0], [s * 0.3, 0.14, 0], [s * 0.5, 0.2, 0], [s * 0.58, 0.36, 0], [s * 0.57, 0.5, 0]];
      sweep(mb, half(-1).reverse().concat(half(1).slice(1)), 0.13, Y, 8);
      LR(s => {
        obox(mb, [s * 0.57, 0.48, 0], [s * 0.54, 0.66, 0], 0.34, 0.34, 0.3, 0.3, P.cap);
        ball(mb, [s * 0.52, 0.79, 0], 0.1, P.smoke); ball(mb, [s * 0.45, 0.88, -0.04], 0.07, P.smoke);
      });
    });
    // armL: reaching arm, huge box fist with an exhaust pipe hanging from it
    att(m, 'armL', mb => {
      limb(mb, [[0, 0, 0], [0.12, -0.16, 0.12], [0.16, -0.24, 0.3]], [0.09, 0.09, 0.09], [P.limb, G], 6);
      mb.push(); mb.translate(0.2, -0.28, 0.5); mb.rotate(-0.2, 0, 0.1);
      mb.box(0, 0, 0, 0.44, 0.4, 0.46, P.fist); mb.box(0, 0.21, 0.0, 0.36, 0.02, 0.38, sh(P.fist, 0.2)); mb.box(0, 0, -0.2, 0.46, 0.42, 0.06, P.band);
      mb.pop();
      sweep(mb, [[0.24, -0.4, 0.46], [0.3, -0.6, 0.4], [0.32, -0.8, 0.22], [0.28, -0.86, 0.02]], 0.11, Y, 7);
      obox(mb, [0.28, -0.86, 0.06], [0.28, -0.86, -0.08], 0.26, 0.26, 0.24, 0.24, P.band);
    });
    // armR: hanging segmented arm with a smaller box fist
    att(m, 'armR', mb => {
      limb(mb, [[0, 0, 0], [-0.08, -0.26, 0.06], [-0.08, -0.5, 0.14]], [0.09, 0.08, 0.075], [P.limb, G], 6);
      ball(mb, [-0.08, -0.26, 0.06], 0.1, G);
      mb.rbox(-0.08, -0.62, 0.16, 0.24, 0.24, 0.26, P.fist, 0.2);
    });
    // segmented legs: limb-colour thigh, body-colour knee plate and shin, foot wedge
    const leg = (s) => meshOf(mb => {
      mb.rbox(s * 0.03, -0.18, 0.02, 0.18, 0.3, 0.2, P.limb, 0.2);
      mb.rbox(s * 0.05, -0.38, 0.06, 0.2, 0.14, 0.22, G, 0.2);
      mb.rbox(s * 0.05, -0.6, 0.02, 0.15, 0.3, 0.16, sh(P.limb, -0.12), 0.2);
      mb.frustum(s * 0.05, -0.92, 0.06, 0.24, 0.36, 0.16, 0.22, 0.16, { side: P.foot, top: sh(P.foot, 0.15) });
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    // the feet stay planted while the torso pitches in the clips
    m.onPose = (mm) => { const B = mm.bones; if (B.body) ['legFL', 'legFR'].forEach(n => { if (B[n]) B[n].rot[0] -= B.body.rot[0]; }); };
    m.height = 2.5; m.scale = 0.92; m.lungeScale = 0.8;
    return m;
  }
  def('smogger', (a) => smogBot(a, { body: '#30a060', plate: '#1a9a80', head: '#40c0a8', pipe: '#e0d040', cap: '#1e6030', fist: '#20a888', band: '#9098a0', limb: '#e0c840', foot: '#20a888', smoke: '#d8d8e0' }));
  // Disc 2 (Junon / Underwater Reactor): FF7 reuses the Smogger model for the Slalom (crimson / lilac)
  def('slalom', (a) => smogBot(a, { body: '#c0405a', plate: '#9a9cb0', head: '#c0405a', pipe: '#d4cce8', cap: '#2a6a40', fist: '#c0405a', band: '#e8e8f0', limb: '#b8b8cc', foot: '#c0405a', smoke: '#e0dce8' }));
  // Disc 2 (Corel train): Gas Ducter — PROVISIONAL, no reference found; built as a Smogger-family palette swap
  // in olive / brass with lime gas (its old colours)
  def('gas_ducter', (a) => smogBot(a, { body: '#6e7c52', plate: '#c0b88a', head: '#4a5638', pipe: '#c0b070', cap: '#3a4428', fist: '#4a5638', band: '#8a8c70', limb: '#a8a078', foot: '#4a5638', smoke: '#b8f070' }));

  def('blood_taste', (a) => hound(a, { c1: '#7a2814', c2: '#4a140a', c3: '#a04020', eye: '#f0e040', mouth: '#8a30c0', size: 1.15 }));

  // ---- Proto Machinegun / Machine Gun / Quick Machine Gun: column turret (~1.15 m) — tapered pedestal, U-shaped
  //      yoke cradling a boxy gun housing with a 6-barrel gatling, an angled hood plate over the top, a hose to
  //      the floor (one model, three palettes)
  function gatlingTurret(look, P) {
    const m = rig(look);
    m.bone('body', 'root', [0, 0, 0]); m.bone('head', 'body', [0, 0.76, 0]);
    att(m, 'body', mb => {
      mb.prism(0, 0, 0, 0.3, 0.28, 0.06, 8, '#28242c');
      mb.frustum(0, 0.06, 0, 0.46, 0.4, 0.24, 0.22, 0.56, { side: P.col, front: sh(P.col, 0.1), back: sh(P.col, -0.25), top: P.col });
      mb.prism(0, 0.6, 0, 0.14, 0.16, 0.06, 8, P.yoke);
      // U yoke rising from the column to both sides of the housing
      sweep(mb, [[-0.27, 0.94, 0], [-0.27, 0.76, 0], [-0.2, 0.66, 0], [0, 0.63, 0], [0.2, 0.66, 0], [0.27, 0.76, 0], [0.27, 0.94, 0]], 0.05, P.yoke, 6);
      LR(s => ball(mb, [s * 0.27, 0.9, 0], 0.07, sh(P.yoke, -0.2)));
      // hose from the housing down to the floor
      sweep(mb, bez3([0.12, 0.86, -0.18], [0.36, 0.8, -0.34], [0.36, 0.3, -0.24], [0.38, 0.0, -0.12], 8), taper(8, 0.028, 0.022), P.hose, 5);
    });
    att(m, 'head', mb => {
      mb.box(0, 0.14, -0.02, 0.4, 0.28, 0.42, P.housing);
      LR(s => mb.box(s * 0.21, 0.12, 0.0, 0.05, 0.2, 0.3, P.side));
      // gatling: barrel cluster between two rings, coloured tips
      mb.push(); mb.translate(0, 0.14, 0.18); mb.rotate(PI / 2, 0, 0);
      mb.prism(0, 0, 0, 0.13, 0.13, 0.06, 8, P.ring);
      for (let i = 0; i < 6; i++) { const an = i / 6 * PI * 2; mb.prism(C(an) * 0.075, 0.04, S(an) * 0.075, 0.03, 0.03, 0.34, 5, P.barrel); mb.prism(C(an) * 0.075, 0.38, S(an) * 0.075, 0.032, 0.032, 0.02, 5, P.tips); }
      mb.prism(0, 0.3, 0, 0.13, 0.13, 0.05, 8, P.ring);
      mb.pop();
      // angled hood plate sloping from the back up over the gun
      obox(mb, [0, 0.2, -0.32], [0, 0.36, 0.22], 0.46, 0.04, 0.4, 0.03, { side: P.hood, front: sh(P.hood, 0.15), back: sh(P.hood, -0.2) });
    });
    m.height = 1.15; m.lungeScale = 0.2;
    return m;
  }
  def('proto_machinegun', (a) => gatlingTurret(a, { col: '#a09a30', yoke: '#4a4a6a', housing: '#8a8428', side: '#c0b848', hood: '#6a50a0', barrel: '#2a2a30', ring: '#7a6aa0', tips: '#e0c040', hose: '#5a2a70' }));
  def('machine_gun', (a) => gatlingTurret(a, { col: '#707a78', yoke: '#9aa0a8', housing: '#a8b0a8', side: '#c8d0d0', hood: '#5a6060', barrel: '#202024', ring: '#50505a', tips: '#8a8a90', hose: '#a06030' }));
  // Disc 2 (Junon / Underwater Reactor): FF7 reuses the Machine Gun model for the Quick Machine Gun
  def('quick_machine_gun', (a) => gatlingTurret(a, { col: '#8a5a30', yoke: '#3a2a58', housing: '#3a2a58', side: '#a8a0c8', hood: '#4a3a70', barrel: '#3a3a44', ring: '#50505a', tips: '#b09040', hose: '#b09040' }));

  // ================================================================== Air Buster (boss)
  def('air_buster', (a) => {
    const m = rig(a);
    // Shinra's anti-personnel robot: rounded teal barrel chest with a green scoop plate and red vents, big rounded
    // shoulder pods, thick grey-white arms with big white hands, navy waist ring over red hoses, dark hex base
    const SL = '#2a6a6a', DK = '#1e3440', W = '#e4e8ec', GR = '#8a9aa0', OR = '#c86a40', BR = '#8a3a2a', GG = '#4e8e7a', NV = '#2a3a6a';
    m.bone('body', 'root', [0, 1.85, 0]);
    m.bone('head', 'body', [0, 0.78, 0.2]);
    m.bone('armL', 'body', [1.02, 0.36, 0.05], [0, 0, 0.12]); m.bone('armR', 'body', [-1.02, 0.36, 0.05], [0, 0, -0.12]);
    att(m, 'root', mb => {
      mb.push(); mb.rotate(0, PI / 6, 0); mb.prism(0, 0, 0, 1.25, 1.15, 0.3, 6, '#24464c'); mb.prism(0, 0.3, 0, 1.15, 1.1, 0.04, 6, '#3a6068'); mb.pop();
      for (let i = 0; i < 4; i++) { const an = i / 4 * PI * 2 + PI / 4; spike(mb, [S(an) * 0.85, 0.3, C(an) * 0.85], [0, 1, 0], 0.24, 0.08, '#b0a0e8', 4); }
      // red hoses and the dark column up to the waist
      for (let i = -1; i <= 1; i++) sweep(mb, [[i * 0.24, 0.32, 0.3], [i * 0.2, 0.7, 0.28], [i * 0.15, 1.2, 0.18]], 0.075, BR, 6);
      mb.loft([{ y: 0.3, rx: 0.34, rz: 0.34, z: -0.08 }, { y: 1.2, rx: 0.28, rz: 0.28, z: -0.08 }], { sides: 8, color: DK });
    });
    att(m, 'body', mb => {
      // navy waist ring and pelvis
      mb.loft([{ y: -0.95, rx: 0.42, rz: 0.4 }, { y: -0.72, rx: 0.86, rz: 0.72 }, { y: -0.5, rx: 0.94, rz: 0.78 }, { y: -0.36, rx: 0.8, rz: 0.66 }], { sides: 12, color: NV, sq: 2.4 });
      // rounded barrel chest
      mb.loft([{ y: -0.4, rx: 0.72, rz: 0.6 }, { y: -0.05, rx: 0.86, rz: 0.7 }, { y: 0.4, rx: 0.9, rz: 0.72 }, { y: 0.72, rx: 0.72, rz: 0.6 }, { y: 0.86, rx: 0.4, rz: 0.36 }], { sides: 12, sq: 2.3, color: SL, colors: (i, n) => i > n * 0.2 && i < n * 0.3 ? sh(SL, 0.1) : null });
      // green scoop plate with red vent tubes
      ell(mb, 0, 0.12, 0.52, 0.6, 0.52, 0.32, GG, 10, 6, (i, j) => j < 2 ? sh(GG, 0.18) : j > 4 ? sh(GG, -0.2) : GG);
      for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 0.2; sweep(mb, [[x, 0.42, 0.72], [x * 1.05, 0.1, 0.8], [x * 1.1, -0.26, 0.64]], [0.07, 0.075, 0.06], BR, 6, (q, k2) => k2 < 3 ? '#b04a38' : BR); }
      mb.loft([{ y: -0.42, rx: 0.78, rz: 0.66 }, { y: -0.3, rx: 0.8, rz: 0.68 }], { sides: 12, sq: 2.3, color: DK });
      // big rounded shoulder pods with white front stripes
      LR(s => {
        ell(mb, s * 0.98, 0.5, -0.02, 0.44, 0.5, 0.52, SL, 10, 6, (i, j) => j < 2 ? sh(SL, 0.14) : j > 4 ? sh(SL, -0.15) : SL);
        mb.rbox(s * 0.66, 0.46, 0.5, 0.1, 0.7, 0.1, W, 0.3);
        mb.rbox(s * 1.3, 0.5, -0.02, 0.1, 0.56, 0.62, sh(SL, -0.12), 0.3);
      });
      // back stacks: tall rust chimney (model's right), short orange cylinder (left)
      mb.rbox(-0.38, 1.12, -0.38, 0.42, 1.2, 0.34, OR, 0.15);
      mb.rbox(-0.38, 1.4, -0.2, 0.24, 0.5, 0.02, '#101014', 0.1);
      mb.push(); mb.translate(0.62, 0.95, -0.32); mb.rotate(-0.25, 0, -0.3); mb.prism(0, 0, 0, 0.13, 0.13, 0.62, 8, '#d08030'); mb.prism(0, 0.62, 0, 0.14, 0.14, 0.06, 8, '#303038'); mb.pop();
    });
    att(m, 'head', mb => {
      mb.rbox(0, 0.14, 0, 0.3, 0.42, 0.32, '#343c4a', 0.25);
      mb.rbox(0, 0.22, 0.16, 0.22, 0.06, 0.02, '#f02030', 0.2);
      LR(s => mb.rbox(s * 0.05, 0.08, 0.16, 0.05, 0.035, 0.02, '#e0e0e0', 0.2));
    });
    const arm = (s) => meshOf(mb => {
      // short grey upper arm under the pod, dark elbow, thick grey forearm, big white hand
      const el = [s * 0.14, -0.62, 0.02], wr = [s * 0.12, -1.1, 0.28];
      limb(mb, [[0, -0.2, 0], el], [0.2, 0.19], GR, 8);
      ball(mb, el, 0.22, '#303844', 7, 5);
      sweep(mb, [el, lerp3(el, wr, 0.5), wr], [0.2, 0.23, 0.2], W, 8, (i, k2) => k2 >= 5 ? sh(W, -0.15) : W);
      mb.rbox(wr[0], wr[1] - 0.16, wr[2] + 0.04, 0.34, 0.3, 0.36, W, 0.3);
      for (let i = 0; i < 4; i++) limb(mb, [[wr[0] + (i - 1.5) * 0.08, wr[1] - 0.28, wr[2] + 0.14], [wr[0] + (i - 1.5) * 0.085, wr[1] - 0.46, wr[2] + 0.2], [wr[0] + (i - 1.5) * 0.085, wr[1] - 0.56, wr[2] + 0.1]], [0.045, 0.04, 0.032], [W, '#3a4460'], 6);
      limb(mb, [[wr[0] - s * 0.12, wr[1] - 0.12, wr[2] + 0.16], [wr[0] - s * 0.2, wr[1] - 0.26, wr[2] + 0.28]], [0.05, 0.04], W, 6);
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    m.height = 3.6; m.lungeScale = 0.35;
    return m;
  });

  // ================================================================== Sector 5-6 slums / Wall Market
  // ---- Whole Eater / Zolokalter: mouth-bulb spider — big round mouth ringed with white fangs and glowing
  //      diamond spots, segmented brown abdomen, a curved jagged blade-tail rising from the back, small palps
  //      beside the mouth, four long spider legs with coloured tips (one model, two palettes)
  function mouthSpider(look, P) {
    const m = rig(look);
    const PU = P.head, AB = P.abd;
    m.bone('body', 'root', [0, 0.55, 0]); m.bone('head', 'body', [0, 0.08, 0.26]); m.bone('jaw', 'head', [0, 0, 0.22]);
    m.bone('tail', 'body', [0, 0.12, -0.34]);
    m.bone('armL', 'body', [0.2, -0.02, 0.36]); m.bone('armR', 'body', [-0.2, -0.02, 0.36]);
    [['FL', 1, 1], ['FR', -1, 1], ['BL', 1, -1], ['BR', -1, -1]].forEach(([n, sx, sz]) => m.bone('leg' + n, 'body', [sx * 0.2, 0.02, sz * 0.12]));
    att(m, 'body', mb => {
      // segmented abdomen behind the mouth
      for (let i = 0; i < 4; i++) ell(mb, 0, 0.02 + i * 0.02, 0.06 - i * 0.14, 0.24 - i * 0.02, 0.2 - i * 0.015, 0.12, i % 2 ? AB : sh(AB, -0.15), 8, 4);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.05, 0.02, 0.32, 0.31, 0.27, PU, 10, 6, (i, j) => j < 2 ? sh(PU, 0.2) : j > 4 ? sh(PU, -0.2) : PU);
      for (let i = 0; i < 10; i++) { const an = i / 10 * PI * 2 + 0.3; mb.push(); mb.translate(C(an) * 0.27, 0.05 + S(an) * 0.26, 0.17); mb.rotate(0, 0, PI / 4); mb.box(0, 0, 0, 0.05, 0.05, 0.04, P.spot); mb.pop(); }
    });
    att(m, 'jaw', mb => {
      disc(mb, [0, 0.05, 0.01], [0, 0, 1], 0.21, 0.21, '#1a0820', 10, 0.02);
      for (let i = 0; i < 11; i++) { const an = i / 11 * PI * 2; spike(mb, [C(an) * 0.2, 0.05 + S(an) * 0.2, 0.03], [-C(an), -S(an), 0.35], 0.13, 0.03, '#f4f4f8', 3); }
    });
    // curved blade tail: flat, jagged along the inner edge, rising up and over
    att(m, 'tail', mb => {
      const pts = bez3([0, 0, 0], [0, 0.55, -0.4], [0, 1.15, -0.2], [0, 1.3, 0.22], 8);
      sweep(mb, pts, pts.map((p, i) => [0.05 - i * 0.004, 0.11 - i * 0.011]), null, 5, (i) => mix(P.tail, P.tailTip, i / 8));
      for (let i = 1; i < 8; i += 2) { const d = V.norm(V.sub(pts[i + 1], pts[i - 1])); spike(mb, pts[i], V.add([0, -d[2], d[1]], V.scale(d, -0.3)), 0.12, 0.035, mix(P.tail, P.tailTip, i / 8), 3); }
      spike(mb, pts[8], V.norm(V.sub(pts[8], pts[7])), 0.2, 0.04, P.tailTip, 4);
    });
    // small palps beside the mouth
    const palp = (s) => meshOf(mb => { limb(mb, [[0, 0, 0], [s * 0.2, 0.1, 0.05], [s * 0.34, -0.06, 0.12]], [0.035, 0.03, 0.02], sh(PU, 0.1), 5); spike(mb, [s * 0.34, -0.06, 0.12], [s * 0.3, -1, 0.3], 0.1, 0.02, P.tip, 3); });
    m.attach('armL', palp(1)); m.attach('armR', palp(-1));
    // long spider legs: knee up high, then down to a long coloured spike tip
    const leg = (s, f) => meshOf(mb => {
      const kn = [s * 0.34, 0.24, f * 0.16], ft = [s * 0.5, -0.2, f * 0.26];
      limb(mb, [[0, 0, 0], kn, ft], [0.045, 0.04, 0.03], P.leg, 5);
      obox(mb, ft, [s * 0.54, -0.55, f * 0.3], 0.07, 0.07, 0.01, 0.01, P.tip);
    });
    m.attach('legFL', leg(1, 1)); m.attach('legFR', leg(-1, 1)); m.attach('legBL', leg(1, -1)); m.attach('legBR', leg(-1, -1));
    // the feet stay planted while the body pitches in the clips
    m.onPose = (mm) => { const B = mm.bones; if (B.body) ['legFL', 'legFR', 'legBL', 'legBR'].forEach(n => { if (B[n]) B[n].rot[0] -= B.body.rot[0]; }); };
    m.height = 2.0; m.lungeScale = 1;
    return m;
  }
  def('whole_eater', (a) => mouthSpider(a, { head: '#5a2a80', abd: '#6a4028', spot: '#e8d840', tail: '#c898c0', tailTip: '#f4e8f0', leg: '#c8a878', tip: '#6a5aa0' }));
  // Disc 2 (Gaea's Cliff): FF7 reuses the Whole Eater model for the Zolokalter
  def('zolokalter', (a) => mouthSpider(a, { head: '#5a2a78', abd: '#6a3a24', spot: '#60e060', tail: '#58a040', tailTip: '#c0e080', leg: '#c0502a', tip: '#50e040' }));

  // ---- Hedgehog Pie / Boundfat: pot-bellied imp — pear body with a pale belly, frog-like head jutting forward
  //      with heavy brows, slanted glowing eyes and a wide toothy grin, spikes down the back, thin clawed arms,
  //      crouched frog legs (one model, two palettes)
  function pieImp(look, P) {
    const m = rig(look);
    const B = P.body, BD = sh(P.body, -0.3);
    m.bone('body', 'root', [0, 0.4, 0]); m.bone('head', 'body', [0, 0.2, 0.12]); m.bone('jaw', 'head', [0, -0.04, 0.12]);
    m.bone('armL', 'body', [0.26, 0.1, 0.08]); m.bone('armR', 'body', [-0.26, 0.1, 0.08]);
    m.bone('legFL', 'body', [0.16, -0.18, 0]); m.bone('legFR', 'body', [-0.16, -0.18, 0]);
    att(m, 'body', mb => {
      ell(mb, 0, 0.0, 0, 0.3, 0.3, 0.28, B, 10, 6, (i, j) => j > 4 ? BD : B);
      ell(mb, 0, -0.08, 0.13, 0.24, 0.22, 0.17, P.belly, 8, 5);
      // spikes: a dorsal row plus bigger fans on the back of the shoulders
      for (let i = 0; i < 6; i++) { const an = 0.35 + i * 0.33; spike(mb, [0, C(an) * 0.28, -S(an) * 0.25], [0, C(an) + 0.4, -S(an)], 0.22 - Math.abs(i - 2) * 0.03, 0.05, i % 2 ? P.spike : sh(P.spike, 0.15), 4); }
      LR(s => { for (let i = 0; i < 3; i++) spike(mb, [s * 0.2, 0.14 - i * 0.14, -0.16], [s * 0.9, 0.3 - i * 0.35, -0.6], 0.26 - i * 0.03, 0.06, i % 2 ? sh(P.spike, 0.15) : P.spike, 4); });
    });
    att(m, 'head', mb => {
      // wide, flat, forward-jutting head
      hloft(mb, [{ z: -0.14, w: 0.18, h: 0.12, y: 0.02 }, { z: 0.02, w: 0.22, h: 0.13, y: 0.03 }, { z: 0.14, w: 0.2, h: 0.1, y: 0.01 }, { z: 0.2, w: 0.14, h: 0.06, y: 0.0 }], { sides: 8, color: B });
      LR(s => {
        // heavy slanted brow over a slanted glowing eye
        mb.push(); mb.translate(s * 0.09, 0.09, 0.15); mb.rotate(0, 0, -s * 0.4); mb.box(0, 0.025, 0, 0.12, 0.04, 0.07, sh(B, -0.12)); mb.pop();
        mb.push(); mb.translate(s * 0.085, 0.065, 0.175); mb.rotate(0, 0, -s * 0.4); mb.sphere(0, 0, 0, P.eyeR, P.eyeR * 0.4, 0.02, P.eye, 6, 3, false); mb.pop();
      });
      // grin: dark mouth with an upper row of teeth
      mb.box(0, -0.03, 0.17, 0.26, 0.06, 0.06, '#281018');
      teeth(mb, [-0.12, 0.0, 0.2], [0.12, 0.0, 0.2], 8, 0.04, [0, -1, 0.1], '#f8f4e8', 0.014);
    });
    att(m, 'jaw', mb => {
      hloft(mb, [{ z: -0.1, w: 0.17, h: 0.04 }, { z: 0.08, w: 0.14, h: 0.035, y: -0.01 }], { sides: 6, color: BD });
      teeth(mb, [-0.11, 0.02, 0.08], [0.11, 0.02, 0.08], 8, 0.035, [0, 1, 0.1], '#f8f4e8', 0.013);
    });
    const arm = (s) => meshOf(mb => {
      limb(mb, [[0, 0, 0], [s * 0.16, -0.02, 0.1], [s * 0.26, -0.16, 0.16]], [0.045, 0.04, 0.035], B, 5);
      for (let i = -1; i <= 1; i++) spike(mb, [s * 0.26, -0.16, 0.16], [s * 0.3 + i * 0.3, -0.7, 0.6], 0.1, 0.015, P.claw, 3);
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    // crouched frog legs: thigh out, knee up, shin down to long clawed feet
    const leg = (s) => meshOf(mb => {
      const kn = [s * 0.14, -0.04, 0.1], an = [s * 0.18, -0.2, 0.0];
      limb(mb, [[0, 0, 0], kn, an], [0.08, 0.06, 0.045], B, 6);
      obox(mb, [an[0], -0.21, an[2] - 0.04], [an[0], -0.21, an[2] + 0.14], 0.09, 0.03, 0.12, 0.02, BD);
      for (let i = -1; i <= 1; i++) spike(mb, [an[0] + i * 0.035, -0.21, an[2] + 0.13], [i * 0.4, -0.1, 1], 0.07, 0.014, P.claw, 3);
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 0.82; m.scale = 1.08; m.lungeScale = 1.2;
    return m;
  }
  def('hedgehog_pie', (a) => pieImp(a, { body: '#d83838', belly: '#e080a8', spike: '#8040b0', eye: '#40f040', eyeR: 0.05, claw: '#e8c030' }));
  // Disc 1 (Bone Village / Corral Valley): FF7 reuses the Hedgehog Pie model for the Boundfat
  def('boundfat', (a) => pieImp(a, { body: '#c8b020', belly: '#d8c8e8', spike: '#40a0b0', eye: '#e040e0', eyeR: 0.06, claw: '#8a40c0' }));

  // ---- Vice / Prowler / Bandit: hunched ape-like slum thug — bone-white skull mask, mohawk, big shoulders,
  //      long arms with chunky fingerless gloves, bare torso under an open vest, baggy pants, spiky boots
  //      (one model, three palettes; Bandit adds a pot belly and purple armour pads)
  function thug(look, P) {
    const m = rig(look);
    const SK = P.skin, SD = sh(P.skin, -0.18), VS = P.vest, MK = '#d8d0b0', PT = P.pants, GL = P.gloves, BT = P.boots;
    const HUNCH = 0.38, sp = (x, y, z) => [x, y * C(HUNCH) - z * S(HUNCH), y * S(HUNCH) + z * C(HUNCH)]; // torso frame -> body
    const shL = sp(0.3, 0.42, 0);
    m.bone('body', 'root', [0, 0.7, 0]);
    m.bone('head', 'body', sp(0, 0.5, 0.1));
    m.bone('armL', 'body', shL); m.bone('armR', 'body', [-shL[0], shL[1], shL[2]]);
    m.bone('legFL', 'body', [0.13, 0, -0.02]); m.bone('legFR', 'body', [-0.13, 0, -0.02]);
    att(m, 'body', mb => {
      mb.push(); mb.rotate(HUNCH, 0, 0);
      const bel = P.belly ? 0.3 : 0.2;
      // bare torso: narrow waist, (pot) belly, wide hunched chest and shoulders
      mb.loft([{ y: -0.06, rx: 0.2, rz: 0.15 }, { y: 0.1, rx: 0.23, rz: 0.17, rzf: bel }, { y: 0.26, rx: 0.27, rz: 0.18, rzf: bel * 0.85 }, { y: 0.4, rx: 0.31, rz: 0.18 }, { y: 0.5, rx: 0.2, rz: 0.13 }, { y: 0.56, rx: 0.1, rz: 0.08 }],
        { sides: 8, color: SK });
      // open vest: covers the sides and back, open at the front, light edge trim
      const arc = [PI / 2 + 0.55, PI / 2 + PI * 2 - 0.55];
      mb.loft([{ y: 0.02, rx: 0.225, rz: 0.17 }, { y: 0.26, rx: 0.285, rz: 0.2 }, { y: 0.41, rx: 0.325, rz: 0.2 }, { y: 0.5, rx: 0.22, rz: 0.15 }], { sides: 10, arc, color: VS });
      LR(s => { const a0 = s > 0 ? arc[0] : arc[1]; mb.loft([{ y: 0.03, rx: 0.228, rz: 0.172 }, { y: 0.26, rx: 0.288, rz: 0.202 }, { y: 0.41, rx: 0.328, rz: 0.202 }], { sides: 1, arc: [a0 - 0.12 * s, a0], color: P.trim }); });
      // big deltoids
      LR(s => ell(mb, s * 0.3, 0.4, 0.0, 0.14, 0.12, 0.13, P.pads ? VS : SK, 7, 5));
      if (P.pads) LR(s => { ell(mb, s * 0.31, 0.45, 0.0, 0.16, 0.09, 0.15, VS, 7, 4); mb.box(s * 0.3, 0.46, 0.14, 0.2, 0.03, 0.03, P.trim); });
      mb.pop();
      // belt + baggy seat
      mb.loft([{ y: -0.1, rx: 0.23, rz: 0.18 }, { y: 0.02, rx: 0.22, rz: 0.17 }], { sides: 8, color: sh(PT, -0.3) });
      ell(mb, 0, -0.12, -0.02, 0.24, 0.13, 0.19, PT, 8, 4);
    });
    att(m, 'head', mb => {
      // low, forward head: skull, bone mask over the face with dark eye holes, mohawk
      ell(mb, 0, 0.06, -0.01, 0.11, 0.12, 0.115, SK, 8, 5);
      hloft(mb, [{ z: -0.02, w: 0.105, h: 0.1, y: 0.03 }, { z: 0.07, w: 0.108, h: 0.095, y: 0.02 }, { z: 0.115, w: 0.085, h: 0.075, y: 0.0 }, { z: 0.135, w: 0.05, h: 0.045, y: -0.01 }], { sides: 8, color: MK });
      mb.frustum(0, 0.03, 0.115, 0.04, 0.04, 0.025, 0.03, 0.08, sh(MK, -0.1));
      LR(s => { ell(mb, s * 0.045, 0.09, 0.105, 0.03, 0.022, 0.012, '#201810', 5, 3); eye(mb, s * 0.045, 0.09, 0.114, 0.009, '#f0e8c0'); });
      mb.box(0, 0.12, 0.09, 0.16, 0.02, 0.04, sh(SK, -0.25));
      for (let i = 0; i < 5; i++) mb.blade([0, 0.16 - i * 0.012, 0.07 - i * 0.05], [0, 1, 0.25 - i * 0.28], 0.13 + (i === 1 || i === 2 ? 0.05 : 0), 0.07, 0.03, P.tuft, [0, 0, 1], sh(P.tuft, 0.3));
    });
    // long ape arms: bare upper arm, elbow, chunky fingerless glove with tan fingers, hanging to the knee
    const arm = (s) => meshOf(mb => {
      const el = [s * 0.08, -0.3, 0.06], wr = [s * 0.06, -0.58, 0.14];
      limb(mb, [[0, 0, 0], el, wr], [0.085, 0.07, 0.065], SK, 7);
      obox(mb, lerp3(el, wr, 0.45), V.add(wr, [0, -0.06, 0.02]), 0.17, 0.16, 0.19, 0.18, GL);
      mb.rbox(wr[0], wr[1] - 0.1, wr[2] + 0.02, 0.13, 0.1, 0.12, GL, 0.3);
      for (let i = -1; i <= 1; i++) spike(mb, [wr[0] + i * 0.035, wr[1] - 0.14, wr[2] + 0.06], [i * 0.15, -1, 0.35], 0.1, 0.022, SK, 4);
      spike(mb, [wr[0] - s * 0.06, wr[1] - 0.1, wr[2] + 0.06], [-s * 0.4, -0.6, 0.6], 0.07, 0.022, SK, 4);
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    // bent-knee legs in baggy pants, chunky angular boots with cuff spikes
    const leg = (s) => meshOf(mb => {
      const kn = [s * 0.06, -0.33, 0.1], an = [s * 0.04, -0.6, -0.02];
      sweep(mb, [[0, 0.02, 0], [s * 0.03, -0.15, 0.06], kn, lerp3(kn, an, 0.55), an], [0.13, 0.15, 0.14, 0.12, 0.09], PT, 7);
      mb.frustum(an[0], -0.7, an[2] + 0.05, 0.19, 0.32, 0.17, 0.2, 0.14, { side: BT, top: sh(BT, 0.12), front: sh(BT, -0.1) });
      mb.frustum(an[0], -0.58, an[2] + 0.0, 0.17, 0.17, 0.15, 0.15, 0.08, sh(BT, -0.15));
      for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + PI / 4; spike(mb, [an[0] + C(a) * 0.08, -0.55, an[2] + S(a) * 0.08], [C(a), 0.5, S(a)], 0.09, 0.03, BT, 3); }
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    // the feet stay planted while the torso pitches in the clips
    m.onPose = (mm) => { const B = mm.bones; if (B.body) ['legFL', 'legFR'].forEach(n => { if (B[n]) B[n].rot[0] -= B.body.rot[0]; }); };
    m.height = 1.46; m.scale = P.size || 1; m.lungeScale = 1.1;
    return m;
  }
  def('vice', (a) => thug(a, { skin: '#a8704a', vest: '#2a64d8', trim: '#e0dcc8', pants: '#2a7a50', gloves: '#d02020', boots: '#b82030', tuft: '#e03030' }));
  def('prowler', (a) => thug(a, { skin: '#9a6a44', vest: '#3a9a30', trim: '#e0d890', pants: '#c8b830', gloves: '#e0b030', boots: '#20a090', tuft: '#e8e030', size: 1.1 }));
  // Disc 1 (Corel area): FF7 reuses the Vice model for the Bandit (pink skin, purple armour vest, pot belly)
  def('bandit', (a) => thug(a, { skin: '#d8949a', vest: '#7a40c0', trim: '#40c0a0', pants: '#6a30a0', gloves: '#7a40c0', boots: '#8a50d0', tuft: '#9a60e0', belly: true, pads: true, size: 1.22 }));

  // ---- Hell House: a living house — red roof, tooth-door mouth, white lamp eye, blue arms and legs
  function hellHouse(look, standing) {
    const m = rig(look);
    const WALL = '#d8b8a8', BEAM = '#8a6a58', ROOF = '#d04060', BL = '#3a58b0';
    const lift = standing ? 0.75 : 0.35;
    m.bone('body', 'root', [0, lift, 0]); m.bone('head', 'body', [0, 1.1, 0]); m.bone('jaw', 'body', [0, 0.3, 0.66]);
    m.bone('armL', 'body', [0.8, 0.7, 0.2]); m.bone('armR', 'body', [-0.8, 0.7, 0.2]);
    m.bone('legFL', 'body', [0.5, 0, 0.4]); m.bone('legFR', 'body', [-0.5, 0, 0.4]); m.bone('legBL', 'body', [0.5, 0, -0.4]); m.bone('legBR', 'body', [-0.5, 0, -0.4]);
    att(m, 'body', mb => {
      mb.box(0, 0.55, 0, 1.55, 1.1, 1.3, { side: WALL, front: sh(WALL, 0.05), top: WALL, bottom: BEAM });
      [0.08, 0.6, 1.08].forEach(y => mb.box(0, y, 0, 1.6, 0.1, 1.35, BEAM));
      [-0.78, 0.78].forEach(x => [-0.66, 0.66].forEach(z => mb.box(x, 0.55, z, 0.1, 1.1, 0.1, BEAM)));
      mb.box(0, 0.32, 0.64, 0.5, 0.4, 0.04, '#301818');       // door (mouth)
      teeth(mb, [-0.22, 0.52, 0.67], [0.22, 0.52, 0.67], 6, 0.12, [0, -1, 0.1], '#f0f0f0', 0.035);
      mb.box(-0.48, 0.82, 0.66, 0.34, 0.3, 0.03, '#2a2040');
      ell(mb, 0.42, 0.8, 0.62, 0.22, 0.22, 0.2, '#e8ecf8', 8, 6);   // lamp "eye"
      mb.box(0.42, 0.6, 0.68, 0.14, 0.12, 0.06, '#3a58b0');
    });
    att(m, 'jaw', mb => { teeth(mb, [-0.22, -0.15, 0.03], [0.22, -0.15, 0.03], 6, 0.1, [0, 1, 0.1], '#f0f0f0', 0.03); });
    att(m, 'head', mb => {
      const W = 0.95, D = 0.8, Hh = 0.75;
      // gabled roof (front/back slopes) with gable walls
      [1, -1].forEach(sz => {
        mb.quad([-W, 0, sz * D], [W, 0, sz * D], [W, Hh, 0], [-W, Hh, 0], ROOF);
        mb.quad([-W, Hh, 0], [W, Hh, 0], [W, 0, sz * D], [-W, 0, sz * D], sh(ROOF, -0.3));
      });
      LR(s => { mb.tri([s * 0.9, 0, -D * 0.9], [s * 0.9, 0, D * 0.9], [s * 0.9, Hh * 0.95, 0], s > 0 ? WALL : WALL); mb.tri([s * 0.9, 0, D * 0.9], [s * 0.9, 0, -D * 0.9], [s * 0.9, Hh * 0.95, 0], WALL); });
      mb.box(-0.35, 0.3, 0.45, 0.4, 0.25, 0.3, '#2a2030');
      mb.frustum(-0.35, 0.42, 0.45, 0.5, 0.36, 0.1, 0.1, 0.3, ROOF);
      spike(mb, [0.1, Hh - 0.05, 0], [0, 1, 0], 0.5, 0.14, '#e0a0c0', 4);
      spike(mb, [0.7, 0.4, 0.1], [0.3, 1, 0], 0.4, 0.12, '#f0a060', 4);
    }, TWO_SIDED);
    const arm = (s) => meshOf(mb => { limb(mb, [[0, 0, 0], [s * 0.3, 0.1, 0.1], [s * 0.45, -0.15, 0.35]], [0.1, 0.09, 0.08], BL, 6); mb.rbox(s * 0.47, -0.2, 0.42, 0.16, 0.14, 0.14, '#e8e8f0', 0.3); for (let i = -1; i <= 1; i++) spike(mb, [s * 0.47 + i * 0.05, -0.2, 0.48], [i * 0.3, 0.3, 1], 0.14, 0.025, '#f0f0f0', 3); });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    const leg = meshOf(mb => { limb(mb, [[0, 0, 0], [0, -lift * 0.55, 0.03], [0, -lift + 0.06, 0]], [0.09, 0.08, 0.07], BL, 6); mb.rbox(0, -lift + 0.04, 0.05, 0.2, 0.08, 0.26, '#2a3a8a', 0.3); });
    ['FL', 'FR', 'BL', 'BR'].forEach(n => m.attach('leg' + n, leg));
    m.height = lift + 2.2; m.lungeScale = 0.5;
    return m;
  }
  def('hell_house', (a) => hellHouse(a, false));
  def('hell_house_b', (a) => hellHouse(a, true));

  def('corneos_lackey', () => human('corneos_lackey', {
    base: 'man', skin: '#e0b088', hair: '#3a2a20', hairStyle: 'cap', capColor: '#3a7a40', top: '#3a5ab0', sleeve: '#8a6a4a', vestColor: '#8a6a4a',
    bottom: '#4a7a48', pants: 'baggy', boots: '#6a4a2a', gloves: '#e0b088', extras: ['vest', 'belt'], belt: '#5a3a20',
    custom: (m, H) => { att(m, 'head', mb => headBand(mb, H, 0.02, 0.42, 1.1, '#2a3a5a', PI * 0.6)); att(m, 'handL', mb => ell(mb, 0, -0.05, 0.03, 0.03, 0.035, 0.03, '#e0c030', 6, 4)); },
  }, { weapon: mb => { mb.rbox(0, -0.02, 0.03, 0.03, 0.08, 0.06, '#3a3a40', 0.2); mb.loft([{ y: 0.0, rx: 0.012, rz: 0.012, z: 0.05 }, { y: 0.26, rx: 0.012, rz: 0.012, z: 0.05 }], { sides: 5, color: '#8a8e96' }); }, scale: 1.75, attack: 'shoot' }));

  // ---- Scotch (Corneo's thug boss): ordinary build, green jacket with white cuffs, dark trousers, short brown hair,
  // cyan shades (Model Reference, 01-midgar_093)
  def('scotch', () => human('scotch', {
    base: 'man', skin: '#e0b088', hair: '#6a4020', hairStyle: 'short', face: { brow: 2, mouth: 'frown' }, top: '#2e7a3a', sleeve: '#2e7a3a',
    bottom: '#1a2a1a', pants: 'tight', boots: '#c8c8d0', shoes: true, gloves: '#e0b088', wristband: '#e4e8e4', collarColor: '#e8e8e4', extras: ['belt', 'shades'], glassColor: '#60d0e0', belt: '#1a2a1a', buckle: '#b0b0b8',
    torso: (Pt) => { Pt.line(0, 0.02, 0, 0.9, 1.6, '#1e5a28'); Pt.band(0.4, 0.46, '#246a30'); },
    custom: (m, H) => att(m, 'head', mb => headBand(mb, H, 0.5, 0.63, 1.1, '#60d0e0', PI * 0.42)),
  }, { scale: 1.75, attack: 'punch' }));

  // ================================================================== Sewers
  // ---- Aps: hulking teal sewer brute hunched far forward — lumpy hump of back and shoulders, big horse-like head
  // jutting low in front with a leather bridle, gaping toothy jaw and long purple tongue, brown harness and
  // loincloth, massive arms (gold chain shackle), short legs, spiny tail arching up behind
  def('aps', (a) => {
    const m = rig(a);
    const B = '#40a8b8', D = '#2a7684', HN = '#b08a7a', PU = '#9a2a9a', ST = '#5a3a20', GD = '#e0b030';
    m.bone('body', 'root', [0, 1.2, 0], [0.6, 0, 0]);
    m.bone('head', 'body', [0, 0.78, 0.62], [-0.55, 0, 0]); m.bone('jaw', 'head', [0, -0.02, 0.12]);
    m.bone('armL', 'body', [0.82, 0.6, 0.18], [-0.62, 0, 0.1]); m.bone('armR', 'body', [-0.82, 0.6, 0.18], [-0.62, 0, -0.1]);
    m.bone('tail', 'body', [0, -0.12, -0.42], [-0.6, 0, 0]);
    m.bone('legFL', 'root', [0.4, 0.92, -0.22]); m.bone('legFR', 'root', [-0.4, 0.92, -0.22]);
    att(m, 'body', mb => {
      ell(mb, 0, 0.05, 0.02, 0.6, 0.52, 0.5, D, 9, 6);                                            // belly / hips
      ell(mb, 0, 0.62, -0.08, 0.86, 0.56, 0.66, B, 10, 6, (i, j) => j < 2 ? sh(B, 0.15) : B);     // hump
      LR(s => { ell(mb, s * 0.66, 0.66, 0.16, 0.46, 0.46, 0.46, B, 9, 5, (i, j) => j < 2 ? sh(B, 0.12) : B); ell(mb, s * 0.34, 1.02, -0.12, 0.38, 0.32, 0.38, sh(B, 0.08), 7, 4); ell(mb, s * 0.2, 0.3, -0.5, 0.3, 0.28, 0.2, sh(B, -0.05), 6, 4); });
      ell(mb, 0, 1.12, 0.2, 0.34, 0.24, 0.3, sh(B, 0.1), 7, 4);
      // leather harness crossing the chest, belt with a gold ring, loincloth
      LR(s => sweep(mb, [[s * 0.62, 0.98, 0.34], [s * 0.3, 0.6, 0.6], [-s * 0.06, 0.24, 0.62], [-s * 0.38, -0.1, 0.52]], [0.06, 0.06, 0.06, 0.06], ST, 5));
      mb.loft([{ y: -0.26, rx: 0.56, rz: 0.46 }, { y: -0.12, rx: 0.6, rz: 0.5 }], { sides: 10, color: ST });
      disc(mb, [0, 0.26, 0.64], [0, 0.3, 1], 0.12, 0.12, GD, 8, 0.04);
      for (let i = 0; i < 3; i++) mb.blade([(i - 1) * 0.2, -0.24, 0.5], [(i - 1) * 0.2, -1, 0.35], 0.5, 0.3, 0.05, i === 1 ? ST : sh(ST, 0.12), [1, 0, 0]);
      spike(mb, [0, 1.1, -0.35], [0, 0.6, -1], 0.4, 0.15, '#b0a070', 4);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.14, -0.04, 0.34, 0.3, 0.34, B, 8, 5);
      // long horse-like muzzle
      hloft(mb, [{ z: 0.06, w: 0.3, h: 0.19, y: 0.16 }, { z: 0.32, w: 0.25, h: 0.15, y: 0.13 }, { z: 0.5, w: 0.2, h: 0.13, y: 0.11 }, { z: 0.6, w: 0.14, h: 0.09, y: 0.1 }], { sides: 8, color: B });
      mb.blade([0, 0.34, 0.12], [0, 0.35, 1], 0.2, 0.46, 0.08, sh(B, -0.15), [1, 0, 0]);          // heavy brow
      LR(s => {
        eye(mb, s * 0.19, 0.28, 0.22, 0.04, '#f0e040');
        sweep(mb, bez3([s * 0.24, 0.3, -0.1], [s * 0.55, 0.42, -0.2], [s * 0.66, 0.66, -0.12], [s * 0.58, 0.86, 0.04], 6), taper(6, 0.1, 0.02), HN, 6);
        ball(mb, [s * 0.26, 0.1, 0.46], 0.05, GD);                                                  // bridle rings
      });
      // bridle straps round the muzzle and up behind the eyes
      hloft(mb, [{ z: 0.36, w: 0.27, h: 0.165, y: 0.13 }, { z: 0.42, w: 0.26, h: 0.16, y: 0.12 }], { sides: 8, color: '#2a2018' });
      LR(s => sweep(mb, [[s * 0.26, 0.12, 0.42], [s * 0.3, 0.24, 0.18], [s * 0.3, 0.3, -0.06]], 0.025, '#2a2018', 4, null, false));
      mb.rbox(0, 0.02, 0.36, 0.4, 0.12, 0.42, PU, 0.3);                                             // mouth
      teeth(mb, [-0.2, 0.04, 0.54], [0.2, 0.04, 0.54], 8, 0.1, [0, -1, 0.15], '#f8f0e0', 0.028);
      LR(s => teeth(mb, [s * 0.22, 0.04, 0.2], [s * 0.22, 0.04, 0.46], 3, 0.08, [0, -1, 0], '#f8f0e0', 0.024));
    });
    att(m, 'jaw', mb => {
      hloft(mb, [{ z: -0.06, w: 0.26, h: 0.08, y: -0.08 }, { z: 0.28, w: 0.22, h: 0.07, y: -0.12 }, { z: 0.46, w: 0.15, h: 0.05, y: -0.12 }], { sides: 8, color: B });
      teeth(mb, [-0.16, -0.05, 0.4], [0.16, -0.05, 0.4], 7, 0.09, [0, 1, 0.15], '#f8f0e0', 0.026);
      // long purple tongue lolling out and down
      sweep(mb, bez3([0, -0.06, 0.12], [0.04, -0.08, 0.5], [0.14, -0.55, 0.5], [0.2, -0.95, 0.34], 8), taper(8, 0.07, 0.03), PU, 6);
      LR(s => sweep(mb, [[s * 0.22, -0.1, 0.32], [s * 0.3, -0.5, 0.28], [s * 0.26, -0.9, 0.2]], 0.018, '#2a2018', 4, null, false));   // reins
    });
    // spiny tail arching up behind, two pale blades at the tip
    att(m, 'tail', mb => {
      const pts = bez3([0, 0, 0], [0, -0.1, -0.6], [0, 0.8, -0.85], [0, 1.35, -0.6], 10);
      sweep(mb, pts, taper(10, 0.2, 0.06), '#4a6040', 6, (i) => i % 3 === 1 ? '#5a7048' : '#4a6040');
      for (let i = 2; i < 10; i += 1) mb.blade(pts[i], [i % 2 ? 0.6 : -0.6, 0.3, -1], 0.34 - i * 0.015, 0.2, 0.04, '#b08a3a', null, '#d0b060');
      LR(s => mb.blade(pts[10], [s * 0.2, 1, 0.15], 0.5, 0.14, 0.05, '#c8d4e8', null, '#8898c0'));
    });
    const arm = (s) => meshOf(mb => {
      const el = [s * 0.14, -0.5, 0.08], wr = [s * 0.12, -0.94, 0.3];
      limb(mb, [[0, 0, 0], el, wr], [0.32, 0.27, 0.26], B, 8);
      ell(mb, el[0] + s * 0.06, el[1] + 0.12, el[2] - 0.02, 0.26, 0.24, 0.26, sh(B, 0.06), 7, 4);   // bicep lump
      ell(mb, wr[0], wr[1] - 0.14, wr[2] + 0.06, 0.28, 0.22, 0.3, B, 8, 5);
      for (let i = 0; i < 4; i++) spike(mb, [wr[0] + (i - 1.5) * 0.11, wr[1] - 0.26, wr[2] + 0.28], [0, -0.5, 1], 0.14, 0.045, '#e8e0d0', 3);
      if (s < 0) {   // shackle and a trailing gold chain
        mb.loft([{ y: wr[1] + 0.04, rx: 0.28, rz: 0.28, x: wr[0], z: wr[2] }, { y: wr[1] + 0.16, rx: 0.29, rz: 0.29, x: wr[0], z: wr[2] }], { sides: 8, color: sh(GD, -0.25) });
        for (let i = 0; i < 5; i++) disc(mb, [wr[0] + s * 0.2 + s * i * 0.05, wr[1] - 0.05 - i * 0.1, wr[2] - 0.1 - i * 0.04], [i % 2, 0, (i + 1) % 2], 0.06, 0.06, GD, 6, 0.018);
      }
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    const leg = (s) => meshOf(mb => {
      const kn = [s * 0.1, -0.42, 0.26], an = [s * 0.12, -0.84, 0.04];
      limb(mb, [[0, 0, 0], kn, an], [0.34, 0.28, 0.22], D, 8);
      mb.rbox(an[0], an[1] - 0.03, an[2] + 0.12, 0.36, 0.14, 0.44, D, 0.35);
      for (let i = -1; i <= 1; i++) spike(mb, [an[0] + i * 0.11, an[1] - 0.05, an[2] + 0.34], [i * 0.2, -0.2, 1], 0.1, 0.04, '#e8e0d0', 3);
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 2.9; m.lungeScale = 0.6;
    return m;
  });

  // ---- Sahagin: shelled green fish-man with a trident
  def('sahagin', (a) => {
    const m = rig(a);
    const G = '#58b040', Y = '#e0b040', BE = '#f0e0c0';
    m.bone('body', 'root', [0, 0.72, 0]); m.bone('head', 'body', [0, 0.6, 0.1]); m.bone('jaw', 'head', [0, -0.04, 0.12]);
    m.bone('armL', 'body', [0.24, 0.45, 0.04]); m.bone('armR', 'body', [-0.24, 0.45, 0.04]);
    m.bone('legFL', 'body', [0.14, 0, 0]); m.bone('legFR', 'body', [-0.14, 0, 0]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.05, rx: 0.2, rz: 0.16 }, { y: 0.25, rx: 0.24, rz: 0.2 }, { y: 0.5, rx: 0.2, rz: 0.17 }, { y: 0.6, rx: 0.1, rz: 0.1 }], { sides: 8, color: G });
      ell(mb, 0, 0.22, 0.12, 0.16, 0.24, 0.1, BE, 7, 5);
      ell(mb, 0, 0.3, -0.22, 0.3, 0.36, 0.16, Y, 8, 5, (i, j) => j % 2 ? Y : sh(Y, -0.2));   // shell
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.06, 0.04, 0.16, 0.13, 0.17, G, 8, 5);
      LR(s => { ell(mb, s * 0.1, 0.14, 0.08, 0.05, 0.05, 0.05, '#e0e040', 6, 4); eye(mb, s * 0.11, 0.15, 0.12, 0.02, '#202010'); });
      spike(mb, [0, 0.16, -0.05], [0, 0.5, -1], 0.2, 0.05, '#e06040', 4);
    });
    att(m, 'jaw', mb => { hloft(mb, [{ z: -0.05, w: 0.14, h: 0.04 }, { z: 0.12, w: 0.11, h: 0.03, y: -0.01 }], { sides: 6, color: BE }); });
    const arm = (s) => meshOf(mb => { limb(mb, [[0, 0, 0], [s * 0.12, -0.2, 0.05], [s * 0.1, -0.38, 0.2]], [0.05, 0.045, 0.04], G, 6); ell(mb, s * 0.1, -0.42, 0.22, 0.05, 0.05, 0.05, G, 6, 4); });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    att(m, 'armR', mb => { tube(mb, [-0.1, -0.42, -0.4], [-0.1, -0.42, 0.75], 0.016, 0.016, '#8a8070', 5); for (let i = -1; i <= 1; i++) spike(mb, [-0.1 + i * 0.05, -0.42, 0.75], [i * 0.2, 0, 1], 0.14, 0.015, '#d0d0d8', 3); mb.box(-0.1, -0.42, 0.75, 0.12, 0.02, 0.02, '#d0d0d8'); });
    const leg = (s) => meshOf(mb => { limb(mb, [[0, 0, 0], [s * 0.08, -0.3, 0.14], [s * 0.1, -0.68, 0]], [0.08, 0.06, 0.045], G, 6); for (let i = -1; i <= 1; i++) spike(mb, [s * 0.1, -0.7, 0.02], [i * 0.4, -0.1, 1], 0.14, 0.03, G, 3); });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 1.55; m.lungeScale = 1;
    return m;
  });

  // ---- crabs: Ceasar (orange, toothy face), Castanets (purple, big white pincers)
  function crab(look, P) {
    const m = rig(look);
    const k = P.size || 1;
    m.bone('body', 'root', [0, 0.45 * k, 0]); m.bone('head', 'body', [0, 0.05 * k, 0.32 * k]);
    m.bone('clawL', 'body', [0.38 * k, 0.1 * k, 0.25 * k]); m.bone('clawR', 'body', [-0.38 * k, 0.1 * k, 0.25 * k]); m.onPose = gunPose;
    [['FL', 1, 1], ['FR', -1, 1], ['BL', 1, -1], ['BR', -1, -1]].forEach(([n, sx, sz]) => m.bone('leg' + n, 'body', [sx * 0.35 * k, 0, sz * 0.1 * k]));
    att(m, 'body', mb => {
      ell(mb, 0, 0, 0, 0.5 * k, 0.22 * k, 0.4 * k, P.shell, 10, 5, (i, j) => j < 2 ? sh(P.shell, 0.15) : j > 3 ? P.under : P.shell);
      for (let i = 0; i < 6; i++) { const an = (i / 5 - 0.5) * 2.4; mb.blade([S(an) * 0.4 * k, 0.12 * k, C(an) * 0.3 * k - 0.05 * k], [S(an), 0.5, C(an) * 0.4], 0.28 * k, 0.16 * k, 0.05 * k, P.spike, { radial: [0, 0, 0] }); }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0, 0, 0.26 * k, 0.12 * k, 0.1 * k, P.face, 8, 5);
      LR(s => { spike(mb, [s * 0.1 * k, 0.08 * k, 0], [s * 0.2, 1, 0.3], 0.12 * k, 0.02 * k, P.shell, 4); eye(mb, s * 0.12 * k, 0.2 * k, 0.03 * k, 0.03 * k, P.eye); });
      mb.rbox(0, -0.03 * k, 0.09 * k, 0.28 * k, 0.07 * k, 0.03 * k, '#301818', 0.3);
      teeth(mb, [-0.13 * k, 0, 0.1 * k], [0.13 * k, 0, 0.1 * k], 7, 0.04 * k, [0, -1, 0.1], '#f8f0e0', 0.012 * k);
    });
    const arm = (s) => meshOf(mb => {
      limb(mb, [[0, 0, 0], [s * 0.3 * k, 0.25 * k, 0.1 * k], [s * 0.35 * k, 0.5 * k, 0.35 * k]], [0.07 * k, 0.06 * k, 0.07 * k], P.shell, 6);
      // pincer: two big blades
      mb.blade([s * 0.35 * k, 0.5 * k, 0.35 * k], [s * 0.1, 0.9, 0.5], 0.42 * k, 0.2 * k, 0.07 * k, P.claw, [1, 0, 0], P.clawTip);
      mb.blade([s * 0.35 * k, 0.5 * k, 0.35 * k], [s * 0.4, 0.3, 1], 0.3 * k, 0.14 * k, 0.06 * k, P.claw, [1, 0, 0], P.clawTip);
    });
    m.attach('clawL', arm(1)); m.attach('clawR', arm(-1));
    const leg = (s, f) => meshOf(mb => { for (let i = 0; i < 2; i++) { const z = (f > 0 ? 0.05 : -0.1) * k - i * 0.1 * k; limb(mb, [[0, 0, z], [s * 0.3 * k, 0.12 * k, z + f * 0.05 * k], [s * 0.45 * k, -0.45 * k, z + f * 0.12 * k]], [0.035 * k, 0.03 * k, 0.01 * k], P.leg, 5); } });
    m.attach('legFL', leg(1, 1)); m.attach('legFR', leg(-1, 1)); m.attach('legBL', leg(1, -1)); m.attach('legBR', leg(-1, -1));
    m.height = 1.2 * k; m.lungeScale = 1;
    return m;
  }
  def('ceasar', (a) => crab(a, { shell: '#e06030', under: '#b04020', spike: '#f08040', face: '#b0c050', eye: '#f0f040', claw: '#f07040', clawTip: '#f0d0a0', leg: '#e05830' }));

  // ================================================================== Train Graveyard
  // ---- Eligor: ghostly charioteer — hooded skull rider on a red beast body between spiked wheels
  def('eligor', (a) => {
    const m = rig(a);
    const CL = '#d8c8a8', R = '#a02428', W = '#e8e4dc', DK = '#3a3040';
    m.bone('body', 'root', [0, 0.95, 0]); m.bone('head', 'body', [0, 1.05, 0.05]);
    m.bone('armL', 'body', [0.3, 0.85, 0.05]); m.bone('armR', 'body', [-0.3, 0.85, 0.05]);
    att(m, 'root', mb => LR(s => {
      wheel(mb, s * 0.85, 0.66, 0, 0.5, 0.16, '#6a5a50', '#b0a890', 12);
      for (let i = 0; i < 10; i++) { const an = i / 10 * PI * 2; mb.blade([s * 0.95, 0.66 + S(an) * 0.3, C(an) * 0.3], [0, S(an), C(an)], 0.5, 0.18, 0.05, W, [1, 0, 0], '#c8c8d8'); }
    }));
    att(m, 'body', mb => {
      // red beast body
      hloft(mb, [{ z: -0.6, w: 0.25, h: 0.25, y: 0.05 }, { z: -0.2, w: 0.35, h: 0.32, y: 0.1 }, { z: 0.3, w: 0.33, h: 0.35, y: 0.18 }, { z: 0.6, w: 0.2, h: 0.2, y: 0.3 }], { sides: 8, color: R });
      LR(s => { limb(mb, [[s * 0.18, 0, 0.35], [s * 0.2, -0.45, 0.45], [s * 0.2, -0.9, 0.4]], [0.08, 0.06, 0.05], R, 6); limb(mb, [[s * 0.18, 0, -0.45], [s * 0.2, -0.45, -0.55], [s * 0.2, -0.9, -0.45]], [0.08, 0.06, 0.05], R, 6); });
      ell(mb, 0, 0.6, 0.62, 0.14, 0.14, 0.18, R, 7, 4);
      LR(s => spike(mb, [s * 0.08, 0.7, 0.6], [s * 0.3, 1, -0.3], 0.2, 0.03, W, 4));
      // rider: hooded cloak torso
      mb.loft([{ y: 0.35, rx: 0.34, rz: 0.3 }, { y: 0.65, rx: 0.28, rz: 0.22 }, { y: 1.0, rx: 0.2, rz: 0.16 }, { y: 1.1, rx: 0.08, rz: 0.08 }], { sides: 8, color: CL });
      mb.loft([{ y: 0.55, rx: 0.2, rz: 0.1, z: 0.14 }, { y: 0.95, rx: 0.14, rz: 0.08, z: 0.1 }], { sides: 6, color: '#8a2a8a' });
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.1, -0.02, 0.18, 0.2, 0.18, CL, 8, 5);
      spike(mb, [0, 0.25, -0.05], [0, 1, -0.6], 0.3, 0.12, CL, 5);
      ell(mb, 0, 0.06, 0.1, 0.09, 0.11, 0.07, '#806070', 6, 4);
      LR(s => eye(mb, s * 0.04, 0.09, 0.16, 0.02, '#ff2020'));
    });
    const arm = (s) => meshOf(mb => { limb(mb, [[0, 0, 0], [s * 0.18, -0.2, 0.15], [s * 0.2, -0.3, 0.4]], [0.07, 0.06, 0.05], CL, 6); for (let i = -1; i <= 1; i++) spike(mb, [s * 0.2, -0.3, 0.4], [s * 0.1 + i * 0.25, 0.2, 1], 0.14, 0.015, '#e0d0e0', 3); });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    m.height = 2.6; m.lungeScale = 0.9;
    return m;
  });

  // ---- Ghost: pale squid-headed spirit with a trailing tail
  def('ghost', (a) => {
    const m = rig(a); m.floats = true;
    const W = '#e8f0f0', D = '#98a8b0';
    const ghostOpts = { blend: 'alpha', tint: [1, 1, 1, 0.82] };
    m.bone('body', 'root', [0, 0.95, 0]); m.bone('head', 'body', [0, 0.35, 0.05]);
    m.bone('armL', 'body', [0.15, 0.2, 0.05]); m.bone('armR', 'body', [-0.15, 0.2, 0.05]); m.bone('tail', 'body', [0, -0.1, 0]);
    m.attach('body', meshOf(mb => { mb.loft([{ y: -0.1, rx: 0.12, rz: 0.1 }, { y: 0.15, rx: 0.14, rz: 0.11 }, { y: 0.35, rx: 0.1, rz: 0.1 }], { sides: 8, color: W }); }), null, ghostOpts);
    m.attach('head', meshOf(mb => {
      mb.loft([{ y: -0.05, rx: 0.14, rz: 0.12 }, { y: 0.2, rx: 0.2, rz: 0.17 }, { y: 0.5, rx: 0.17, rz: 0.15 }, { y: 0.68, rx: 0.06, rz: 0.06 }], { sides: 10, color: W });
      LR(s => ell(mb, s * 0.08, 0.2, 0.15, 0.045, 0.06, 0.03, '#202830', 6, 4));
      for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 0.06; sweep(mb, bez([x, -0.02, 0.08], [x * 1.4, -0.2, 0.18], [x * 1.8, -0.4, 0.1], 5), taper(5, 0.025, 0.006), W, 5); }
    }), null, ghostOpts);
    m.attach('tail', meshOf(mb => sweep(mb, bez3([0, 0, 0], [0, -0.5, -0.1], [0.3, -0.6, -0.4], [0.5, -0.85, -0.6], 8), taper(8, 0.12, 0.01), W, 7)), null, ghostOpts);
    const arm = (s) => meshOf(mb => { sweep(mb, bez([0, 0, 0], [s * 0.3, -0.05, 0.1], [s * 0.4, -0.35, 0.2], 5), taper(5, 0.04, 0.015), D, 5); for (let i = -1; i <= 1; i++) spike(mb, [s * 0.4, -0.35, 0.2], [i * 0.3, -1, 0.3], 0.1, 0.01, W, 3); });
    m.attach('armL', arm(1), null, ghostOpts); m.attach('armR', arm(-1), null, ghostOpts);
    m.height = 1.9; m.lungeScale = 1;
    return m;
  });

  // ---- Deenglow: slender teal wisp with big jagged pink wings
  def('deenglow', (a) => {
    const m = rig(a); m.floats = true;
    const T = '#40c0c0', PK = '#e04890', OR = '#f0a040';
    m.bone('body', 'root', [0, 1.1, 0]); m.bone('head', 'body', [0, 0.3, 0.05]);
    m.bone('wingL', 'body', [0.06, 0.2, -0.03]); m.bone('wingR', 'body', [-0.06, 0.2, -0.03]); m.bone('tail', 'body', [0, -0.15, 0]);
    att(m, 'body', mb => { mb.loft([{ y: -0.15, rx: 0.05, rz: 0.05 }, { y: 0.1, rx: 0.08, rz: 0.07 }, { y: 0.3, rx: 0.05, rz: 0.05 }], { sides: 6, color: T }); LR(s => limb(mb, [[s * 0.05, 0.2, 0.03], [s * 0.12, 0.0, 0.1], [s * 0.1, -0.15, 0.15]], [0.02, 0.018, 0.012], T, 5)); });
    att(m, 'head', mb => { ell(mb, 0, 0.05, 0.02, 0.06, 0.07, 0.08, T, 7, 4); spike(mb, [0, 0.08, 0.06], [0, -0.3, 1], 0.12, 0.02, OR, 4); LR(s => eye(mb, s * 0.035, 0.07, 0.07, 0.012, '#f0f040')); for (let i = 0; i < 3; i++) mb.blade([0, 0.1, -0.02], [(i - 1) * 0.3, 1, -0.6], 0.14, 0.04, 0.01, OR); });
    att(m, 'tail', mb => sweep(mb, bez3([0, 0, 0], [0, -0.3, 0.05], [0.08, -0.5, -0.1], [0.05, -0.75, 0.05], 7), taper(7, 0.04, 0.008), T, 5));
    const wing = (s) => meshOf(mb => {
      const pts = [[0, 0, 0], [s * 0.35, 0.35, -0.05], [s * 0.7, 0.45, -0.1], [s * 0.6, 0.15, -0.08], [s * 0.85, 0.05, -0.1], [s * 0.55, -0.1, -0.06], [s * 0.6, -0.35, -0.05], [s * 0.25, -0.15, -0.03]];
      for (let i = 1; i < pts.length - 1; i++) tri2(mb, pts[0], pts[i], pts[i + 1], i % 2 ? PK : sh(PK, 0.15), sh(PK, -0.2));
      for (let i = 1; i < pts.length; i += 2) spike(mb, [pts[i][0] * 0.9, pts[i][1] * 0.9, pts[i][2]], V.sub(pts[i], [0, 0, 0]), 0.15, 0.01, OR, 3);
    });
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    m.height = 1.8; m.lungeScale = 1;
    return m;
  });

  // ================================================================== Sector 7 pillar / Shinra
  // ---- Aero Combatant: slim crimson-magenta trooper with green piping, red helmet with a dark visor, a propeller
  // pack with two big white prism rotor blades over the head, and an orange arm gun
  function aero(id, flying) {
    const M = '#7a1a50', GP = '#30c070';
    const m = human(id, {
      base: 'man', build: 'slim', skin: '#f0c49c', hair: '#6a1840', hairStyle: 'none', noEars: true, top: M, sleeve: M, bottom: M, pants: 'tight', boots: '#20a0a0', bootsTall: true, gloves: '#20a0a0',
      extras: ['belt'], belt: '#e07030', collarColor: null,
      torso: (Pt) => { Pt.line(-0.3, 1.0, -0.12, 0.05, 2, GP); Pt.line(0.3, 1.0, 0.12, 0.05, 2, GP); Pt.band(0.9, 1.0, sh(M, -0.2)); },
      custom: (m, H) => {
        att(m, 'head', mb => { helmet(mb, H, '#c02030', { s: 1.12, y: 0.6 }); headBand(mb, H, 0.42, 0.66, 1.16, '#1a1620', PI * 0.55); headBand(mb, H, 0.04, 0.4, 1.1, '#a01828', PI * 0.35); });
        // green piping bands on the limbs
        ['foreR', 'shinL', 'shinR'].forEach(b => att(m, b, mb => { const L = b[0] === 's' ? H.shin : H.fo, r = b[0] === 's' ? 0.034 : 0.028; [0.3, 0.62].forEach(f => mb.loft([{ y: -L * f, rx: r, rz: r }, { y: -L * f - 0.012, rx: r, rz: r }], { sides: 8, color: GP })); }));
        att(m, 'back', mb => {
          mb.rbox(0, 0, -0.03, 0.12, 0.14, 0.06, '#e07030', 0.3);
          mb.loft([{ y: 0, rx: 0.012, rz: 0.012, z: -0.04 }, { y: 0.34, rx: 0.012, rz: 0.012, z: -0.04 }], { sides: 5, color: '#606068' });
        });
        att(m, 'foreL', mb => { mb.loft([{ y: -0.02, rx: 0.035, rz: 0.035 }, { y: -0.2, rx: 0.042, rz: 0.042 }], { sides: 7, color: '#e07030' }); mb.loft([{ y: -0.2, rx: 0.018, rz: 0.018 }, { y: -0.3, rx: 0.015, rz: 0.015 }], { sides: 5, color: '#404048' }); });
      },
    }, { scale: 1.75, attack: 'shoot' });
    // rotor on its own bone over the head: orange hub, two broad white prism blades (diamond section)
    m.bone('rotor', 'back', [0, 0.35, -0.04]);
    m.attach('rotor', meshOf(mb => {
      ball(mb, [0, 0, 0], 0.028, '#e07030');
      LR(s => { mb.push(); mb.rotate(0, 0, -s * PI / 2); mb.rotate(0, 0.25, 0);
        mb.loft([{ y: 0.02, rx: 0.035, rz: 0.01 }, { y: 0.1, rx: 0.08, rz: 0.017 }, { y: 0.44, rx: 0.075, rz: 0.015 }, { y: 0.5, rx: 0.03, rz: 0.008 }], { sides: 4, phase: 0, color: '#f0f0f4', colors: (i) => i % 2 ? '#c8ccd8' : null });
        mb.pop(); });
    }));
    m.onPose = (mm) => { mm.b('rotor').rot[1] = (FF7.frame || 0) * 0.35; };
    if (flying) { m.b('hips').offset[1] += 0.18; m.floats = true; }
    m.height = flying ? 1.3 : 1.2;
    return m;
  }
  def('aero_combatant', () => aero('aero_combatant', true));
  def('aero_combatant_b', () => aero('aero_combatant_b', false));

  // ---- Pyramid: Reno's energy prison — a wide (base ~2.5 m), glowing, see-through amber pyramid: unlit faces
  //      at alpha ~0.5 (both sides drawn), brighter apex, bright gold edges and a glowing base
  def('pyramid', (a) => {
    const m = rig(a);
    m.bone('body', 'root', [0, 0, 0]);
    const r = 1.76, h = 2.3, top = [0, h, 0], base = [0, 1, 2, 3].map(i => [C(i * PI / 2 + PI / 4) * r, 0.01, S(i * PI / 2 + PI / 4) * r]);
    const col = FF7.glColor;
    m.attach('body', meshOf(mb => {
      for (let i = 0; i < 4; i++) { const b0 = base[i], b1 = base[(i + 1) % 4]; mb.tri(b1, b0, top, [col('#ffc828'), col('#ffc828'), col('#fff4b0')]); }
      mb.quad(base[3], base[2], base[1], base[0], '#f0b828');
    }, { unlit: true }), null, { blend: 'alpha', tint: [1, 1, 1, 0.5], cull: false });
    att(m, 'body', mb => {
      for (let i = 0; i < 4; i++) { tube(mb, base[i], top, 0.035, 0.022, '#fff0a0', 4); tube(mb, base[i], base[(i + 1) % 4], 0.03, 0.03, '#f8d860', 4); }
    }, { unlit: true });
    m.height = 2.3; m.lungeScale = 0;
    return m;
  });

  // ---- Grenade Combatant: Shinra infantry kit in blue with grey pads, crouched with a grenade cocked overhead
  def('grenade_combatant', () => infantry('grenade_combatant', { hood: '#34529e', visor: '#161a24', slit: '#ff2a20', guard: '#d8b030', pauldron: '#a0a4b0', knee: '#d8b030', collar: '#1e2a5a', belt: '#2a2a30',
    pose: { t: 0.2, L: [-1.15, 1.5], R: [-0.7, 1.3], sp: 0.44, hd: -0.2, arm: [-1.55, -2.0, -0.2, -1.25, -0.35, 0.05, -0.8, -0.35],
      atk: [[0], [0.3, [-1.8, -2.35, -0.2, -1.1, -0.3, 0.1, -0.95, -0.35], -0.12], [0.5, [-1.0, -0.15, -0.1, -0.5, -0.6, 0.2, 0.1, -0.2], 0.3], [0.75, [-1.0, -0.15, -0.1, -0.5, -0.6, 0.2, 0.1, -0.2], 0.3], [1]] },
    // hand grenade: olive egg with a ribbed band, spoon and pin ring
    weapon: mb => { ell(mb, 0, 0.035, 0.012, 0.036, 0.044, 0.036, '#4a6a3a', 8, 6); mb.loft([{ y: 0.03, rx: 0.038, rz: 0.038, z: 0.012 }, { y: 0.042, rx: 0.038, rz: 0.038, z: 0.012 }], { sides: 8, color: '#3a5028' });
      mb.rbox(0, 0.085, 0.012, 0.02, 0.018, 0.02, '#a0a0a8', 0.3); mb.rbox(0, 0.06, -0.026, 0.012, 0.05, 0.008, '#a0a0a8', 0.3); ell(mb, 0.018, 0.094, 0.012, 0.012, 0.012, 0.004, '#c0c0c8', 6, 3); },
    height: 0.92 }, {
    top: '#3a5aa8', sleeve: '#3a5aa8', bottom: '#3a5aa8', boots: '#1e1e24', gloves: '#1e1e24', straps: '#c8a050',
  }));

  // ================================================================== Shinra HQ
  // ---- Mighty Grunt: hulking red powered-armour suit (Type B: the slim pilot suit on roller skates)
  def('mighty_grunt', (a) => {
    const m = rig(a);
    const R = '#d02830', RD = '#8a1820', G = '#3a3a44', L = '#e86068';
    m.bone('body', 'root', [0, 1.2, 0]); m.bone('head', 'body', [0, 0.78, 0.02]);
    m.bone('armL', 'body', [0.52, 0.55, 0]); m.bone('armR', 'body', [-0.52, 0.55, 0]);
    m.bone('legFL', 'body', [0.24, -0.15, 0]); m.bone('legFR', 'body', [-0.24, -0.15, 0]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.2, rx: 0.3, rz: 0.26 }, { y: 0.1, rx: 0.42, rz: 0.34 }, { y: 0.5, rx: 0.5, rz: 0.38 }, { y: 0.75, rx: 0.36, rz: 0.3 }], { sides: 8, color: R });
      mb.rbox(0, 0.32, 0.3, 0.38, 0.34, 0.14, G, 0.3);
      ell(mb, 0, 0.3, 0.37, 0.08, 0.08, 0.04, L, 6, 4);
      mb.rbox(0, -0.18, 0, 0.5, 0.18, 0.4, G, 0.3);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.1, 0, 0.2, 0.2, 0.2, R, 8, 5, (i, j) => j < 2 ? L : R);
      mb.rbox(0, 0.06, 0.16, 0.2, 0.08, 0.06, G, 0.3);
      LR(s => eye(mb, s * 0.05, 0.07, 0.2, 0.02, '#40c0ff'));
      mb.blade([0, 0.26, 0.05], [0, 1, 0.5], 0.22, 0.1, 0.04, R, [1, 0, 0], L);
    });
    const arm = (s) => meshOf(mb => {
      ell(mb, s * 0.08, 0.02, 0, 0.26, 0.24, 0.26, R, 8, 5, (i, j) => j < 2 ? L : R);
      limb(mb, [[s * 0.1, -0.1, 0], [s * 0.14, -0.45, 0.05]], [0.09, 0.08], G, 6);
      mb.push(); mb.translate(s * 0.14, -0.7, 0.1); mb.rotate(0.3, 0, 0);
      mb.prism(0, -0.25, 0, 0.16, 0.15, 0.5, 8, R); mb.prism(0, -0.32, 0, 0.05, 0.05, 0.08, 6, '#101010'); mb.pop();
      LR(t => spike(mb, [s * 0.14 + t * 0.08, -0.95, 0.2], [0, -1, 0.3], 0.12, 0.03, '#c0c0c8', 3));
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    const leg = (s) => meshOf(mb => {
      limb(mb, [[0, 0, 0], [s * 0.05, -0.45, 0.08], [s * 0.05, -0.95, 0]], [0.16, 0.15, 0.12], [G, R], 7);
      mb.rbox(s * 0.05, -0.55, 0.05, 0.3, 0.4, 0.3, R, 0.3);
      mb.rbox(s * 0.05, -1.0, 0.08, 0.34, 0.14, 0.5, RD, 0.25);
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 2.45; m.lungeScale = 0.8;
    return m;
  });
  def('mighty_grunt_b', () => human('mighty_grunt_b', {
    base: 'man', build: 'slim', skin: '#8a98b0', hair: '#8a98b0', hairStyle: 'none', top: '#8a98b0', sleeve: '#8a98b0', bottom: '#7a88a0', pants: 'tight', boots: '#4a5468', bootsTall: true, gloves: '#6a7488', noEars: true,
    extras: ['belt'], belt: '#c02030',
    custom: (m, H) => {
      att(m, 'head', mb => { helmet(mb, H, '#9aa8c0', { s: 1.12, y: 0.55 }); headBand(mb, H, 0.35, 0.7, 1.16, '#202838', PI * 0.5); });
      ['thighL', 'thighR', 'armL', 'armR'].forEach(b => att(m, b, mb => ball(mb, [0, 0, 0], 0.04, '#c02030')));
      ['footL', 'footR'].forEach(b => att(m, b, mb => { mb.rbox(0, -0.05, 0.02, 0.06, 0.02, 0.14, '#3a3a44', 0.3); wheel(mb, 0, -0.07, 0.07, 0.015, 0.04, '#c02030'); wheel(mb, 0, -0.07, -0.03, 0.015, 0.04, '#c02030'); }));
      ['foreL', 'foreR'].forEach(b => att(m, b, mb => spike(mb, [0, -0.08, -0.03], [0, -0.3, -1], 0.08, 0.012, '#c8d0e0', 3)));
    },
  }, { scale: 1.9, attack: 'punch' }));

  // ---- Moth Slasher / Crazy Saw: blade robot riding a spiked ball — hooded beaked head, pentagonal chest plate,
  //      big shoulder pads, twin backpack tanks, thick arms ending in blade fans; the ball has a black band and
  //      a ring of long spikes (one model, two palettes)
  function slasherBot(look, P) {
    const m = rig(look);
    const B = P.body, D = P.dark;
    m.bone('body', 'root', [0, 1.36, 0]); m.bone('head', 'body', [0, 0.56, 0.1]);
    m.bone('armL', 'body', [0.44, 0.36, 0.02]); m.bone('armR', 'body', [-0.44, 0.36, 0.02]);
    att(m, 'root', mb => {
      // the ball: band of black patches around the middle, ring of long spikes
      ell(mb, 0, 0.5, 0, 0.5, 0.5, 0.5, P.ball, 10, 7, (i, j) => (j === 3 || (j === 2 && i % 3 === 0) || (j === 4 && i % 3 === 1)) ? P.patch : j < 2 ? sh(P.ball, 0.12) : P.ball);
      for (let i = 0; i < 8; i++) { const an = i / 8 * PI * 2 + 0.2; mb.blade([C(an) * 0.42, 0.48, S(an) * 0.42], [C(an), -0.05, S(an)], 0.62, 0.12, 0.04, P.blade, [0, 1, 0], P.bladeTip); }
    });
    att(m, 'body', mb => {
      // torso: narrow waist on the ball, wide chest
      mb.loft([{ y: -0.4, rx: 0.14, rz: 0.12 }, { y: -0.14, rx: 0.2, rz: 0.17 }, { y: 0.2, rx: 0.34, rz: 0.24 }, { y: 0.42, rx: 0.3, rz: 0.2 }, { y: 0.56, rx: 0.14, rz: 0.12 }], { sides: 8, color: B });
      mb.loft([{ y: -0.34, rx: 0.17, rz: 0.15 }, { y: -0.22, rx: 0.18, rz: 0.16 }], { sides: 8, color: D });
      // pentagonal chest plate
      mb.push(); mb.translate(0, 0.2, 0.2); mb.rotate(PI / 2 - 0.2, 0, 0); mb.prism(0, 0, 0, 0.28, 0.22, 0.08, 5, P.chest); mb.pop();
      // shoulder pads with accent lights
      LR(s => { mb.rbox(s * 0.38, 0.4, 0.0, 0.3, 0.26, 0.36, B, 0.25); mb.box(s * 0.53, 0.38, 0.06, 0.03, 0.12, 0.18, P.acc); });
      // twin backpack tanks
      LR(s => {
        mb.prism(s * 0.2, -0.05, -0.3, 0.13, 0.13, 0.6, 8, P.tank);
        mb.prism(s * 0.2, 0.1, -0.3, 0.135, 0.135, 0.05, 8, P.acc); mb.prism(s * 0.2, 0.4, -0.3, 0.135, 0.135, 0.05, 8, P.acc);
        mb.prism(s * 0.2, 0.55, -0.3, 0.1, 0.06, 0.08, 8, P.tankCap);
      });
    });
    att(m, 'head', mb => {
      // hooded bird head with a long beak
      ell(mb, 0, 0.12, -0.02, 0.15, 0.16, 0.16, P.hood, 8, 5);
      mb.blade([0, 0.26, -0.06], [0, 0.4, -1], 0.2, 0.14, 0.05, P.hood, [1, 0, 0]);
      hloft(mb, [{ z: 0.06, w: 0.08, h: 0.07, y: 0.1 }, { z: 0.22, w: 0.05, h: 0.05, y: 0.04 }, { z: 0.34, w: 0.01, h: 0.01, y: -0.06 }], { sides: 6, color: P.beak });
      LR(s => eye(mb, s * 0.075, 0.15, 0.12, 0.022, P.eye));
    });
    // thick arms: upper arm, armoured forearm, fan of three blades
    const arm = (s) => meshOf(mb => {
      const el = [s * 0.14, -0.26, 0.06], wr = [s * 0.2, -0.46, 0.26];
      limb(mb, [[0, 0, 0], el], [0.1, 0.09], D, 7);
      obox(mb, el, wr, 0.17, 0.16, 0.15, 0.14, P.fore);
      ball(mb, el, 0.1, B);
      for (let i = 0; i < 3; i++) mb.blade(wr, [s * (0.3 + i * 0.3), -0.3 + i * 0.25, 1], 0.5, 0.1, 0.03, P.blade, [0, 1, 0], P.bladeTip);
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    m.height = 2.35; m.lungeScale = 1;
    return m;
  }
  def('moth_slasher', (a) => slasherBot(a, { body: '#7a7ac8', dark: '#4a4a90', chest: '#e0a020', hood: '#3a4a98', beak: '#e0a030', acc: '#40c8e8', tank: '#8a8ad0', tankCap: '#40c8e8',
    ball: '#8a88d0', patch: '#141420', blade: '#d8d8f8', bladeTip: '#8080d0', eye: '#40e0ff', fore: '#8a5030' }));
  // Disc 2 (Midgar raid): FF7 reuses the Moth Slasher model for the Crazy Saw (silver with red accents)
  def('crazy_saw', (a) => slasherBot(a, { body: '#c8c8d4', dark: '#6a6a80', chest: '#dcdce6', hood: '#b0b0c0', beak: '#d8d8e8', acc: '#c02020', tank: '#b8b8c8', tankCap: '#c02020',
    ball: '#e8e8f0', patch: '#141420', blade: '#e4e4f4', bladeTip: '#9090a8', eye: '#e02020', fore: '#8a8aa0' }));

  // ---- Sword Dance: floating crescent of ribbed blade plates (deep blue -> cyan) curled like a C with the open
  //      side forward, lavender-white spikes along both edges; one brown/teal mechanical head with a red eye at
  //      the lower end, the upper end tapering to a point
  def('sword_dance', (a) => {
    const m = rig(a); m.floats = true;
    const R = 0.66, N = 16, A0 = PI / 3, A1 = PI * 5 / 3, TWIST = 0.35;
    const CY = '#30c0e8', DB = '#2070c0', HB = '#7a5030', HT = '#30a090';
    // arc from the top-front, over the top, round the back and under to the bottom-front (y-z plane)
    const ang = (t) => A0 + (A1 - A0) * t;
    const P = (t) => [0, S(ang(t)) * R, C(ang(t)) * R];
    const Nr = (t) => [0, S(ang(t)), C(ang(t))];                 // outward (convex side)
    const Tg = (t) => [0, C(ang(t)), -S(ang(t))];                // along the arc
    const head = V.add(P(1), V.scale(Tg(1), 0.12));
    m.bone('body', 'root', [0, 1.12, 0], [0, TWIST, 0]);
    m.bone('head', 'body', head);
    // quad with its front face turned toward dir
    const q = (mb, A, B, Cc, D, col, dir) => { const n = V.cross(V.sub(B, A), V.sub(Cc, A)); if (V.dot(n, dir) >= 0) mb.quad(A, B, Cc, D, col); else mb.quad(D, Cc, B, A, col); };
    att(m, 'body', mb => {
      for (let i = 0; i < N; i++) {
        const ta = (i + 0.06) / N, tb = (i + 0.94) / N, tm = (i + 0.5) / N;
        const w = (t) => 0.44 * Math.min(1, 0.2 + t * 4), th = (t) => 0.15 * Math.min(1, 0.3 + t * 3.5);
        const c = mix(DB, CY, tm);
        const corner = (t, sx, sn) => V.add(V.add(P(t), [sx * w(t) / 2, 0, 0]), V.scale(Nr(t), sn * th(t) / 2));
        const [a0, a1, a2, a3] = [corner(ta, -1, 1), corner(ta, 1, 1), corner(ta, 1, -1), corner(ta, -1, -1)];
        const [b0, b1, b2, b3] = [corner(tb, -1, 1), corner(tb, 1, 1), corner(tb, 1, -1), corner(tb, -1, -1)];
        const nm = Nr(tm), tg = Tg(tm);
        q(mb, a0, a1, b1, b0, sh(c, -0.18), nm);                        // outer (convex) face
        q(mb, a3, a2, b2, b3, sh(c, 0.14), V.scale(nm, -1));            // inner face, seen through the open side
        q(mb, a1, a2, b2, b1, c, [1, 0, 0]); q(mb, a0, a3, b3, b0, c, [-1, 0, 0]);
        q(mb, a0, a1, a2, a3, sh(c, -0.3), V.scale(tg, -1)); q(mb, b0, b1, b2, b3, sh(c, -0.3), tg);
        // lavender-white spikes on both edges, outward on the convex side and inward on the concave side
        LR(s => {
          const e = V.add(P(tm), [s * w(tm) * 0.45, 0, 0]);
          spike(mb, V.add(e, V.scale(nm, th(tm) * 0.4)), V.add(nm, [s * 0.45, 0, 0]), 0.1 + w(tm) * 0.3, 0.03, '#e8e4f8', 3);
          if (i > 1) spike(mb, V.sub(e, V.scale(nm, th(tm) * 0.4)), V.add(V.scale(nm, -1), [s * 0.3, 0, 0]), 0.14, 0.025, '#c8c0e8', 3);
        });
      }
      // the upper end tapers to a point
      spike(mb, P(0.01), V.scale(Tg(0), -1), 0.3, 0.05, '#d8d4f0', 4);
    });
    // brown mechanical head with teal plates, red eye facing forward, white spikes
    att(m, 'head', mb => {
      mb.rbox(0, 0.02, 0.04, 0.34, 0.3, 0.38, HB, 0.25);
      LR(s => { mb.blade([s * 0.16, 0.04, 0.02], [s, 0.3, -0.4], 0.24, 0.2, 0.04, HT, [0, 1, 0], sh(HT, 0.2)); mb.box(s * 0.1, 0.18, 0.08, 0.1, 0.04, 0.2, HT); });
      ell(mb, 0, 0.04, 0.22, 0.09, 0.08, 0.04, '#301810', 6, 3);
      eye(mb, 0, 0.04, 0.24, 0.06, '#e02020');
      mb.box(0, -0.1, 0.18, 0.2, 0.06, 0.08, sh(HB, -0.2));
      for (let i = 0; i < 4; i++) spike(mb, [(i - 1.5) * 0.08, 0.16, -0.06], [(i - 1.5) * 0.3, 1, -0.5], 0.16, 0.03, '#f0f0f8', 3);
    });
    m.height = 2.05; m.scale = 0.85; m.lungeScale = 1;
    return m;
  });

  // ---- Hammer Blaster: robot on a coiled stalk rising from a floor plate, swinging a hammer
  def('hammer_blaster', (a) => {
    const m = rig(a);
    const G = '#9aa0b0', D = '#2a2c34', W = '#e8ecf0';
    m.bone('body', 'root', [0, 1.55, 0]); m.bone('head', 'body', [0, 0.38, 0.05]);
    m.bone('armL', 'body', [0.3, 0.2, 0]); m.bone('armR', 'body', [-0.3, 0.2, 0]);
    att(m, 'root', mb => {
      mb.prism(0, 0, 0, 0.6, 0.55, 0.08, 12, '#d8dce4'); mb.prism(0, 0.08, 0, 0.35, 0.3, 0.06, 10, '#7a808a');
      const pts = bez3([0, 0.1, 0], [0.35, 0.5, -0.1], [-0.3, 0.9, 0.05], [0, 1.35, 0], 10);
      for (let i = 0; i < pts.length; i++) ell(mb, pts[i][0], pts[i][1], pts[i][2], 0.1, 0.07, 0.1, i % 2 ? D : '#5a5e6a', 7, 4);
    });
    att(m, 'body', mb => {
      mb.loft([{ y: -0.25, rx: 0.12, rz: 0.1 }, { y: 0.0, rx: 0.2, rz: 0.15 }, { y: 0.25, rx: 0.3, rz: 0.18 }, { y: 0.35, rx: 0.12, rz: 0.1 }], { sides: 8, color: G });
      mb.rbox(0, 0.05, 0.14, 0.2, 0.2, 0.06, D, 0.3);
      LR(s => ell(mb, s * 0.28, 0.24, 0, 0.13, 0.12, 0.14, W, 7, 4));
    });
    att(m, 'head', mb => { ell(mb, 0, 0.06, 0, 0.1, 0.1, 0.11, W, 8, 5); mb.rbox(0, 0.05, 0.09, 0.14, 0.04, 0.04, '#e02020', 0.3); LR(s => spike(mb, [s * 0.06, 0.12, -0.02], [s * 0.4, 1, -0.4], 0.12, 0.02, '#c0c0c8', 3)); });
    att(m, 'armR', mb => {
      limb(mb, [[0, 0, 0], [-0.12, -0.25, 0.05], [-0.1, -0.45, 0.2]], [0.06, 0.05, 0.05], D, 6);
      tube(mb, [-0.1, -0.45, 0.2], [-0.1, 0.25, 0.35], 0.025, 0.025, '#6a5040', 6);
      mb.push(); mb.translate(-0.1, 0.32, 0.36); mb.rotate(0, 0, PI / 2); mb.prism(0, -0.2, 0, 0.12, 0.12, 0.4, 8, '#e0e4ec'); mb.prism(0, -0.22, 0, 0.13, 0.13, 0.04, 8, '#3a70c0'); mb.prism(0, 0.18, 0, 0.13, 0.13, 0.04, 8, '#3a70c0'); mb.pop();
    });
    att(m, 'armL', mb => { limb(mb, [[0, 0, 0], [0.15, -0.3, 0.05], [0.15, -0.55, 0.15]], [0.06, 0.05, 0.05], D, 6); for (let i = -1; i <= 1; i++) spike(mb, [0.15, -0.58, 0.15], [i * 0.4, -1, 0.3], 0.14, 0.02, '#e0b030', 3); });
    m.height = 2.5; m.lungeScale = 0.4;
    return m;
  });

  // ---- Warning Board: yellow sign on a striped stand, orange screen with a red burst and a white hand
  const warnTex = (() => { let t = null; return () => {
    if (t) return t;
    const T = FF7.tex; t = T.create(64, 64, '#f07818');
    const star = []; for (let i = 0; i < 24; i++) { const r = i % 2 ? 14 : 24, an = i / 24 * PI * 2; star.push([32 + C(an) * r, 38 + S(an) * r]); }
    T.fillPoly(t, star, '#e81818');
    T.fillEllipse(t, 32, 42, 9, 8, '#f8f0e8');
    for (let i = 0; i < 4; i++) T.fillRect(t, 23 + i * 5, 24, 3.5, 14, '#f8f0e8');
    T.fillPoly(t, [[20, 40], [24, 36], [28, 42], [24, 46]], '#f8f0e8');
    T.fillRect(t, 10, 4, 18, 3, '#fff0d0'); T.fillRect(t, 36, 4, 18, 3, '#fff0d0'); T.fillRect(t, 12, 10, 14, 2, '#fff0d0'); T.fillRect(t, 38, 10, 14, 2, '#fff0d0');
    return t;
  }; })();
  def('warning_board', (a) => {
    const m = rig(a);
    const Y = '#f0c020', BL = '#2848b0', T = '#2aa0a0';
    m.bone('body', 'root', [0, 0, 0]); m.bone('head', 'body', [0, 1.55, 0]);
    att(m, 'body', mb => {
      mb.frustum(0, 0, 0.1, 1.5, 0.9, 1.2, 0.6, 0.2, { side: T, top: sh(T, 0.2), front: T });
      mb.rbox(0, 0.45, 0, 0.9, 0.5, 0.45, '#d8d8e0', 0.2);
      for (let i = 0; i < 5; i++) mb.box(-0.3 + i * 0.15, 0.5, 0.23, 0.07, 0.18, 0.02, '#101010');
      mb.box(0, 0.5, 0.22, 0.8, 0.22, 0.01, Y);
      mb.box(0, 0.78, 0.0, 1.0, 0.1, 0.4, '#e02020');
      mb.rbox(0, 0.95, -0.1, 0.4, 0.4, 0.3, '#303038', 0.3);
    });
    att(m, 'head', mb => {
      mb.rbox(0, 0, 0, 1.3, 1.3, 0.35, Y, 0.1);
      LR(s => [1, -1].forEach(t => { mb.tri([s * 0.66, t * 0.66, 0.19], [s * 0.36, t * 0.66, 0.19], [s * 0.66, t * 0.36, 0.19], BL); mb.rbox(s * 0.68, t * 0.68, 0, 0.14, 0.14, 0.38, BL, 0.3); }));
      LR(s => { mb.prism(s * 0.45, 0.65, 0, 0.08, 0.08, 0.14, 8, '#f09020'); ball(mb, [s * 0.45, 0.8, 0], 0.08, '#f0a030'); });
    });
    const screen = meshOf(mb => mb.plane(0, 0, 0.19, 0.95, 0.95, '#ffffff', [0, 0, 1, 1]), { unlit: true });
    screen.tex = warnTex(); screen.alphaTest = 0.01;
    m.attach('head', screen);
    m.height = 2.4; m.lungeScale = 0;
    return m;
  });

  // ---- SOLDIER 3rd / 2nd / 1st: one model with rank palettes (FF7 reuses it): dark hood with a grey-green goggle
  // visor over an open chin, rank-coloured top with a grey chest band, bare arms with white gauntlets, big dark
  // pauldrons, baggy rank trousers, tan boots; wide ready stance with a broad curved blade held two-handed
  // broad curved blade from the grip along d (flat face towards n): lens section, bowed edge, short hilt
  function broadBlade(mb, d, n, len, wid, col, col2) {
    d = V.norm(d); const w = V.norm(V.cross(n, d)), nn = V.norm(V.cross(d, w)), base = V.scale(d, 0.035);
    const st = [[0, 0.5, 0.3], [0.14, 0.92, 0.42], [0.36, 1.0, 0.4], [0.6, 0.8, 0.3], [0.82, 0.45, 0.16], [1, 0.02, 0.02]];   // [t, edge, spine] half-widths
    const ring = st.map(([t, e, s]) => { const c = V.add(V.add(base, V.scale(d, t * len)), V.scale(w, S(t * PI) * wid * 0.15)), th = wid * 0.1 * (1 - t * 0.8);
      return [V.add(c, V.scale(w, e * wid)), V.add(c, V.scale(nn, th)), V.add(c, V.scale(w, -s * wid)), V.add(c, V.scale(nn, -th))]; });
    for (let i = 0; i < ring.length - 1; i++) for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; mb.quad(ring[i][k], ring[i][k2], ring[i + 1][k2], ring[i + 1][k], k === 1 || k === 2 ? col2 : col); }
    mb.quad(ring[0][3], ring[0][2], ring[0][1], ring[0][0], col2);
    tube(mb, V.scale(d, -0.07), V.scale(d, 0.03), 0.011, 0.012, '#3a2a24', 6);
    mb.push(); along(mb, V.scale(d, 0.03), d); mb.rbox(0, 0, 0, 0.05, 0.016, 0.026, '#9a9aa4', 0.3); mb.pop();
  }
  function soldierClass(id, R) {
    return infantry(id, { hood: '#4a4e56', visor: '#5a7868', visorY: [0.3, 0.64], visorZ: 0.76, openChin: true, skirt: -0.16, pauldron: '#4e5652', padScale: 1.25, bracer: '#c8ccd2', belt: '#2a2a30', buckle: '#d0a030',
      pose: { t: 0.16, L: [-0.42, 0.62], R: [0.12, 0.42], sp: 0.3, hd: -0.1, arm: [-0.45, -1.05, 0.1, -0.5, -1.1, -0.1, 0.55, -0.7],
        atk: [[0], [0.35, [-2.5, -0.5, 0, -2.4, -0.6, 0, 0.3, -0.3], -0.2], [0.58, [-0.6, -0.3, 0, -0.65, -0.4, 0, 0.4, -0.45], 0.32], [0.8, [-0.6, -0.3, 0, -0.65, -0.4, 0, 0.4, -0.45], 0.32], [1]] },
      weapon: mb => broadBlade(mb, [0.62, 0.66, 0.42], [0, 0.1, 1], 0.32, 0.068, R.blade, sh(R.blade, -0.25)), height: 0.98 }, {
      top: R.top, sleeve: 'skin', bottom: R.pants, boots: '#8a7446', gloves: '#c8ccd2', pelvisColor: R.pants,
      torso: (Pt) => { Pt.band(0.52, 0.78, '#8a8c94'); Pt.band(0.5, 0.53, '#5a5c64'); },
    });
  }
  def('soldier_3rd', () => soldierClass('soldier_3rd', { top: '#2a3480', pants: '#2a38a0', blade: '#d8dce4' }));
  // Disc 2/3: FF7 reuses the SOLDIER:3rd model for 2nd and 1st class with the red and purple palettes
  def('soldier_2nd', () => soldierClass('soldier_2nd', { top: '#5a1a22', pants: '#6a1a1c', blade: '#c8c0e0' }));
  def('soldier_1st', () => soldierClass('soldier_1st', { top: '#3a2a4a', pants: '#3a2a52', blade: '#5a6a64' }));

  // ---- Sample:H0512: Hojo's specimen — hulking hunched pink-red beast: a huge toothy maw at the front with a
  //      small squid face beside it, grey-violet segmented spiked shell over the back and left shoulder, swollen
  //      purple sacs on the left arm, pale claw hand and a yellow/purple fin on the right, thick bent legs
  def('sample_h0512', (a) => {
    const m = rig(a);
    const F = '#c87080', FD = '#8a4050', SH = '#8a7aa0', PU = '#5a2a88', W = '#f4f0ec', R = '#b83048', TL = '#40a0a8';
    const HUNCH = 0.5, tp = (x, y, z) => [x, y * C(HUNCH) - z * S(HUNCH), y * S(HUNCH) + z * C(HUNCH)]; // torso frame -> body
    m.bone('body', 'root', [0, 1.12, 0]);
    m.bone('head', 'body', tp(-0.14, 0.86, 0.3)); m.bone('jaw', 'head', [0, -0.1, 0.1]);
    m.bone('armL', 'body', tp(0.5, 0.64, 0)); m.bone('armR', 'body', tp(-0.5, 0.64, 0));
    m.bone('tail', 'body', tp(-0.5, 0.52, -0.06));
    m.bone('legFL', 'body', [0.26, -0.04, 0]); m.bone('legFR', 'body', [-0.26, -0.04, 0]);
    att(m, 'body', mb => {
      mb.push(); mb.rotate(HUNCH, 0, 0);
      // massive torso, flesh darkening toward the hips
      mb.loft([{ y: -0.22, rx: 0.32, rz: 0.26, color: FD }, { y: 0.08, rx: 0.36, rz: 0.3, color: sh(F, -0.15) }, { y: 0.42, rx: 0.52, rz: 0.36, color: F }, { y: 0.7, rx: 0.48, rz: 0.32, color: F }, { y: 0.9, rx: 0.22, rz: 0.2, color: F }],
        { sides: 9, color: F });
      ell(mb, 0.04, 0.3, 0.22, 0.26, 0.28, 0.14, sh(F, 0.12), 7, 4);
      // grey-violet segmented shell over the back and the left shoulder, spiked along the top
      const arc = bez3([-0.3, 0.72, -0.2], [0.0, 1.02, -0.28], [0.42, 0.98, -0.12], [0.62, 0.62, 0.06], 5);
      arc.forEach((p, i) => { const c = i % 2 ? SH : sh(SH, 0.12); ell(mb, p[0], p[1], p[2], 0.34 - i * 0.02, 0.24, 0.3, c, 8, 5, (ii, j) => j > 3 ? sh(SH, -0.25) : c); });
      arc.forEach((p, i) => { if (i < 5) spike(mb, lerp3(p, arc[i + 1], 0.5), [0.2 * (i - 2), 1, -0.3], 0.22, 0.06, '#d8d0c0', 4); });
      spike(mb, [0.66, 0.5, 0.2], [1, 0.2, 0.3], 0.2, 0.05, '#d8d0c0', 4); spike(mb, [-0.36, 0.56, -0.36], [-0.4, 0.3, -1], 0.2, 0.05, '#d8d0c0', 4);
      mb.pop();
    });
    att(m, 'head', mb => {
      // the maw: red ball with a gaping green mouth ringed by big white fangs
      ell(mb, 0, 0.1, 0, 0.36, 0.33, 0.32, R, 9, 6, (i, j) => j < 2 ? sh(R, 0.18) : j > 4 ? sh(R, -0.2) : R);
      ell(mb, 0, 0.02, 0.2, 0.25, 0.17, 0.14, '#1a4a30', 8, 4);
      for (let i = 0; i < 7; i++) { const an = PI * (0.12 + 0.76 * i / 6); spike(mb, [C(an) * 0.25, 0.12 + S(an) * 0.06, 0.28 - Math.abs(C(an)) * 0.08], [-C(an) * 0.3, -1, 0.35], 0.17, 0.05, W, 3); }
      // small squid face beside it: tentacles, yellow eye, curved horn, red feeler
      ell(mb, 0.36, 0.2, 0.06, 0.14, 0.13, 0.12, '#8a90b0', 7, 4);
      eye(mb, 0.4, 0.24, 0.16, 0.025, '#f0e040');
      for (let i = 0; i < 5; i++) sweep(mb, bez([0.3 + i * 0.03, 0.12, 0.12], [0.3 + i * 0.05, -0.05, 0.2], [0.26 + i * 0.07, -0.2, 0.14], 3), taper(3, 0.025, 0.006), '#5a6090', 4);
      mb.lock([0.36, 0.3, 0.02], [0.1, 1, -0.2], [0.2, 0.3, -1], 0.42, 0.07, 0.05, '#6a6aa0', null, '#c0c8e0');
      sweep(mb, bez([0.44, 0.28, -0.02], [0.56, 0.44, -0.06], [0.62, 0.4, -0.2], 3), taper(3, 0.02, 0.008), '#d02030', 4);
    });
    att(m, 'jaw', mb => {
      hloft(mb, [{ z: -0.18, w: 0.3, h: 0.08 }, { z: 0.08, w: 0.26, h: 0.07, y: -0.02 }, { z: 0.22, w: 0.18, h: 0.05, y: -0.03 }], { sides: 8, color: sh(R, -0.1) });
      for (let i = 0; i < 6; i++) { const x = -0.2 + i * 0.08; spike(mb, [x, 0.02, 0.18 - Math.abs(x) * 0.3], [0, 1, 0.25], 0.14, 0.045, W, 3); }
    });
    // right arm: thick pink arm down to a pale lilac claw hand; a yellow/purple fin fan behind the shoulder
    att(m, 'armR', mb => {
      const el = [-0.12, -0.42, 0.14], wr = [-0.1, -0.8, 0.3];
      limb(mb, [[0, 0, 0], el, wr], [0.17, 0.14, 0.11], [F, sh(F, -0.1)], 7);
      ell(mb, wr[0], wr[1] - 0.08, wr[2] + 0.02, 0.12, 0.14, 0.1, '#c8b8e0', 6, 4);
      for (let i = -1; i <= 1; i++) mb.lock([wr[0] + i * 0.06, wr[1] - 0.18, wr[2] + 0.04], [i * 0.3, -1, 0.5], [i * 0.2, -0.3, 1], 0.36, 0.05, 0.04, '#d8c8f0', null, '#f0e8ff');
    });
    att(m, 'tail', mb => {
      // membrane fan: yellow panels with purple ribs
      const tip = (i) => { const an = 1.0 - i * 0.42, L = 0.85 - i * 0.06; return [-C(an) * L, S(an) * L, -0.28 * L]; };
      for (let i = 0; i < 4; i++) tri2(mb, [0, 0, 0], tip(i), tip(i + 1), i % 2 ? '#d8b028' : '#e8c838', '#a08020');
      for (let i = 0; i < 5; i++) mb.blade([0, 0, 0], tip(i), V.len(tip(i)) * 1.05, 0.06, 0.04, '#7a3aa0', null, '#b070d0');
    });
    // left arm: swollen purple sacs with teal barbs, teal claws below
    att(m, 'armL', mb => {
      limb(mb, [[0, 0, 0], [0.1, -0.3, 0.1]], [0.16, 0.14], F, 7);
      ell(mb, 0.16, -0.36, 0.14, 0.3, 0.32, 0.28, PU, 8, 5, (i, j) => j > 3 ? '#3a1a60' : j < 2 ? '#7a4ab0' : PU);
      ell(mb, 0.2, -0.78, 0.22, 0.3, 0.3, 0.28, PU, 8, 5, (i, j) => j > 3 ? '#3a1a60' : j < 2 ? '#7a4ab0' : PU);
      for (let i = 0; i < 3; i++) spike(mb, [0.44, -0.9 + i * 0.26, 0.1], [1, 0, -0.4], 0.16, 0.05, TL, 3);
      for (let i = -1; i <= 1; i++) spike(mb, [0.2 + i * 0.08, -1.04, 0.3], [i * 0.3, -1, 0.4], 0.18, 0.04, TL, 3);
    });
    // thick bent legs, darker flesh, teal toe claws
    const leg = (s) => meshOf(mb => {
      const kn = [s * 0.08, -0.5, 0.26], an = [s * 0.06, -1.0, -0.04];
      limb(mb, [[0, 0, 0], kn, an], [0.2, 0.16, 0.12], [FD, sh(FD, -0.12)], 7);
      ball(mb, kn, 0.17, FD);
      for (let i = -1; i <= 1; i++) spike(mb, [an[0] + i * 0.07, -1.04, an[2] + 0.06], [i * 0.4, -0.15, 1], 0.24, 0.06, TL, 3);
      spike(mb, [an[0], -1.04, an[2] - 0.06], [0, -0.1, -1], 0.14, 0.05, TL, 3);
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    // the feet stay planted while the torso pitches in the clips; cast reaches forward rather than overhead
    m.onPose = (mm) => {
      const B = mm.bones, kc = clipK(mm, 'e_cast');
      if (B.body) ['legFL', 'legFR'].forEach(n => { if (B[n]) B[n].rot[0] -= B.body.rot[0]; });
      ['armL', 'armR'].forEach(n => { if (B[n]) B[n].rot[0] += kc * 1.3; });
    };
    m.height = 2.32; m.scale = 1.12; m.lungeScale = 0.8;
    return m;
  });
  // ---- Sample:H0512-opt: yellow dome on black spike legs, maroon face ring with a teal gem eye on the front
  def('sample_h0512_opt', (a) => {
    const m = rig(a);
    const Y = '#f0c830', K = '#202028', MR = '#6a2030';
    m.bone('body', 'root', [0, 0.38, 0]); m.bone('head', 'body', [0, -0.05, 0.3]);
    [['FL', 1, 1], ['FR', -1, 1], ['BL', 1, -1], ['BR', -1, -1]].forEach(([n, sx, sz]) => m.bone('leg' + n, 'body', [sx * 0.2, -0.1, sz * 0.18]));
    att(m, 'body', mb => {
      mb.sphere(0, 0.0, 0, 0.35, 0.34, 0.35, Y, 10, 6, true, (i, j) => j < 1 ? sh(Y, 0.2) : Y, 3);
      mb.prism(0, -0.12, 0, 0.33, 0.37, 0.13, 10, MR);
      mb.prism(0, -0.2, 0, 0.24, 0.33, 0.08, 10, K);
      for (let i = 0; i < 8; i++) { const an = i / 8 * PI * 2 + PI / 8; spike(mb, [C(an) * 0.33, -0.06, S(an) * 0.33], [C(an), 0.1, S(an)], 0.16, 0.045, K, 4); }
    });
    att(m, 'head', mb => { disc(mb, [0, 0, 0.02], [0, 0.1, 1], 0.1, 0.1, '#302028', 8, 0.03); eye(mb, 0, 0, 0.05, 0.065, '#20c0a8'); });
    const leg = (s, f) => meshOf(mb => { ball(mb, [0, 0, 0], 0.06, K); spike(mb, [0, 0, 0], [s * 0.55, -1, f * 0.45], 0.36, 0.06, K, 4); });
    m.attach('legFL', leg(1, 1)); m.attach('legFR', leg(-1, 1)); m.attach('legBL', leg(1, -1)); m.attach('legBR', leg(-1, -1));
    m.height = 0.72; m.lungeScale = 1.2;
    return m;
  });

  // ---- Brain Pod: purple jar-body with a round window, a bald head on top, stubby robot legs
  def('brain_pod', (a) => {
    const m = rig(a);
    const PU = '#5a3aa8', T = '#40a898';
    m.bone('body', 'root', [0, 0.75, 0]); m.bone('head', 'body', [0, 0.45, 0]);
    m.bone('armL', 'body', [0.38, 0.2, 0]); m.bone('armR', 'body', [-0.38, 0.2, 0]);
    m.bone('legFL', 'body', [0.16, -0.35, 0]); m.bone('legFR', 'body', [-0.16, -0.35, 0]);
    att(m, 'body', mb => {
      ell(mb, 0, 0, 0, 0.42, 0.42, 0.38, PU, 10, 7, (i, j) => j < 2 ? sh(PU, 0.2) : j > 4 ? sh(PU, -0.25) : PU);
      mb.push(); mb.translate(0, 0, 0.3); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0, 0, 0.26, 0.26, 0.1, 8, '#303848'); mb.prism(0, 0.05, 0, 0.22, 0.22, 0.07, 8, T); mb.pop();
      mb.prism(0, 0.35, 0, 0.16, 0.12, 0.1, 8, '#c0c0c8');
    });
    att(m, 'head', mb => { ell(mb, 0, 0.12, 0, 0.12, 0.14, 0.12, '#f0b8a8', 8, 5); LR(s => eye(mb, s * 0.045, 0.14, 0.1, 0.015, '#302020')); mb.rbox(0, 0.06, 0.11, 0.05, 0.015, 0.01, '#903030', 0.3); });
    att(m, 'armL', mb => { sweep(mb, bez3([0, 0, 0], [0.25, 0.1, 0], [0.35, 0.4, 0.1], [0.2, 0.6, 0.2], 6), taper(6, 0.04, 0.03), '#5ab0d0', 6); disc(mb, [0.2, 0.68, 0.2], [0, 1, 0.3], 0.1, 0.1, '#9060c0', 8, 0.03); });
    att(m, 'armR', mb => { sweep(mb, bez([0, 0, 0], [-0.2, -0.1, 0.1], [-0.25, -0.3, 0.25], 5), taper(5, 0.04, 0.035), '#5ab0d0', 6); ell(mb, -0.25, -0.35, 0.28, 0.06, 0.06, 0.06, '#e8e8f0', 6, 4); });
    const leg = (s) => meshOf(mb => { limb(mb, [[0, 0, 0], [s * 0.05, -0.2, 0.05], [s * 0.05, -0.38, 0]], [0.05, 0.045, 0.04], '#8a8a98', 6); mb.rbox(s * 0.05, -0.38, 0.05, 0.12, 0.06, 0.18, '#40404a', 0.3); });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 1.6; m.lungeScale = 1;
    return m;
  });

  // ---- wolves / lions: stocky quadruped with spiky fur (Zenene, Kalm Fang)
  function wolf(look, P) {
    const m = rig(look);
    const C1 = P.c1, C2 = P.c2, k = P.size || 1, legH = 0.45 * k;
    m.bone('body', 'root', [0, legH + 0.1 * k, 0]);
    m.bone('head', 'body', [0, 0.14 * k, 0.45 * k]); m.bone('jaw', 'head', [0, -0.05 * k, 0.08 * k]);
    m.bone('tail', 'body', [0, 0.1 * k, -0.42 * k]);
    [['FL', 1, 1], ['FR', -1, 1], ['BL', 1, -1], ['BR', -1, -1]].forEach(([n, sx, sz]) => m.bone('leg' + n, 'body', [sx * 0.13 * k, 0, sz * 0.3 * k]));
    att(m, 'body', mb => {
      hloft(mb, [{ z: -0.45 * k, w: 0.1 * k, h: 0.1 * k, y: 0.04 * k }, { z: -0.3 * k, w: 0.18 * k, h: 0.17 * k }, { z: 0.05 * k, w: 0.17 * k, h: 0.17 * k }, { z: 0.3 * k, w: 0.2 * k, h: 0.21 * k, y: 0.04 * k }, { z: 0.48 * k, w: 0.12 * k, h: 0.13 * k, y: 0.12 * k }], { sides: 8, color: C1 });
      ell(mb, 0, -0.12 * k, 0.1 * k, 0.12 * k, 0.07 * k, 0.28 * k, C2, 6, 4);
      // spiky fur / mane along the back and neck
      for (let i = 0; i < 9; i++) { const z = -0.35 * k + i * 0.1 * k, big = z > 0.15 * k; LR(s => mb.blade([s * 0.08 * k, 0.14 * k + (big ? 0.06 * k : 0), z], [s * 0.6, 1, -0.5], (big ? 0.3 : 0.18) * k, (big ? 0.12 : 0.08) * k, 0.03 * k, big ? P.mane : C1, null, big ? P.maneTip : sh(C1, 0.15))); }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.03 * k, 0, 0.13 * k, 0.12 * k, 0.13 * k, P.face || C1, 8, 5);
      hloft(mb, [{ z: 0.05 * k, w: 0.09 * k, h: 0.07 * k }, { z: 0.2 * k, w: 0.06 * k, h: 0.05 * k, y: -0.02 * k }], { sides: 6, color: P.face || C1 });
      ball(mb, [0, -0.01 * k, 0.21 * k], 0.025 * k, '#201818');
      LR(s => { mb.blade([s * 0.08 * k, 0.1 * k, -0.02 * k], [s * 0.5, 1, -0.3], 0.12 * k, 0.07 * k, 0.02 * k, C1); eye(mb, s * 0.06 * k, 0.06 * k, 0.11 * k, 0.018 * k, P.eye || '#f0e040'); });
      if (P.mane) for (let i = 0; i < 10; i++) { const an = i / 10 * PI * 2; mb.blade([C(an) * 0.1 * k, 0.04 * k + S(an) * 0.1 * k, -0.04 * k], [C(an), S(an), -0.6], 0.2 * k, 0.1 * k, 0.03 * k, i % 2 ? P.mane : P.maneTip, { radial: [0, 0.04 * k, 0] }); }
    });
    att(m, 'jaw', mb => { hloft(mb, [{ z: 0, w: 0.07 * k, h: 0.03 * k }, { z: 0.12 * k, w: 0.04 * k, h: 0.02 * k, y: -0.01 * k }], { sides: 6, color: '#c02828' }); teeth(mb, [-0.04 * k, 0.01 * k, 0.1 * k], [0.04 * k, 0.01 * k, 0.1 * k], 3, 0.04 * k, [0, 1, 0], '#f0f0e0'); });
    att(m, 'tail', mb => { const pts = bez([0, 0, 0], [0, 0.1 * k, -0.25 * k], [0, -0.1 * k, -0.45 * k], 5); sweep(mb, pts, taper(5, 0.05 * k, 0.02 * k), C1, 6); mb.blade(pts[5], [0, -0.3, -1], 0.15 * k, 0.1 * k, 0.03 * k, P.maneTip || C2); });
    const leg = (front) => meshOf(mb => {
      const pts = front ? [[0, 0, 0], [0, -legH * 0.5, 0.03 * k], [0, -legH + 0.03 * k, 0.02 * k]] : [[0, 0, 0], [0, -legH * 0.45, -0.1 * k], [0, -legH + 0.03 * k, 0]];
      limb(mb, pts, [0.075 * k, 0.05 * k, 0.04 * k], C1, 6);
      mb.rbox(0, -legH + 0.02 * k, 0.04 * k, 0.08 * k, 0.05 * k, 0.12 * k, C1, 0.3);
      for (let i = -1; i <= 1; i++) spike(mb, [i * 0.025 * k, -legH + 0.01 * k, 0.1 * k], [0, -0.2, 1], 0.05 * k, 0.012 * k, '#f0f0e0', 3);
    });
    m.attach('legFL', leg(true)); m.attach('legFR', leg(true)); m.attach('legBL', leg(false)); m.attach('legBR', leg(false));
    m.height = legH + 0.45 * k; m.lungeScale = 1.2;
    return m;
  }

  // ---- Zenene / Sneaky Step (FF7 reuses one model): hunched angular mustard hyena with a big grinning head framed
  // by a long hanging mane (red / blue), a gem on the brow, a row of tall back spikes and long shoulder quills,
  // purple lower hind legs, and a fanged maw in one forepaw
  function hyena(look, P) {
    const m = rig(look);
    const Y = P.body, YD = sh(P.body, -0.3), SP = P.spike, MN = P.mane, M2 = sh(P.mane, 0.15), LO = P.legLow, k = P.size || 1;
    m.bone('body', 'root', [0, 0.82 * k, 0], [-0.12, 0, 0]);
    m.bone('head', 'body', [0, 0.1 * k, 0.52 * k], [0.22, 0, 0]);
    m.bone('jaw', 'head', [0, -0.024 * k, 0.07 * k]);
    m.bone('tail', 'body', [0, 0.02 * k, -0.42 * k]);
    [['FL', 1, 0.28], ['FR', -1, 0.28], ['BL', 1, -0.3], ['BR', -1, -0.3]].forEach(([n, sx, z]) => m.bone('leg' + n, 'body', [sx * (z > 0 ? 0.15 : 0.13) * k, -0.02 * k, z * k], [z > 0 ? 0.12 : 0.12, 0, 0]));
    att(m, 'body', mb => {
      hloft(mb, [{ z: -0.44 * k, w: 0.1 * k, h: 0.11 * k, y: -0.02 * k }, { z: -0.26 * k, w: 0.17 * k, h: 0.17 * k }, { z: 0.0, w: 0.15 * k, h: 0.17 * k, y: 0.04 * k },
        { z: 0.2 * k, w: 0.21 * k, h: 0.23 * k, y: 0.09 * k }, { z: 0.38 * k, w: 0.17 * k, h: 0.19 * k, y: 0.08 * k }, { z: 0.52 * k, w: 0.1 * k, h: 0.11 * k, y: 0.08 * k }],
      { sides: 6, color: Y, smooth: false });
      ell(mb, 0, -0.1 * k, 0.12 * k, 0.12 * k, 0.07 * k, 0.24 * k, YD, 6, 4);
      for (let i = 0; i < 6; i++) spike(mb, [0, (0.24 - i * 0.02) * k, (0.3 - i * 0.12) * k], [(i % 2 ? 0.25 : -0.25), 1, -0.45], (0.38 - i * 0.035) * k, 0.055 * k, i % 2 ? SP : sh(SP, 0.15), 4);
      LR(s => { mb.blade([s * 0.14 * k, 0.2 * k, 0.26 * k], [s * 0.45, 0.35, -1], 0.62 * k, 0.07 * k, 0.025 * k, SP, null, sh(SP, 0.3)); mb.blade([s * 0.16 * k, 0.12 * k, 0.18 * k], [s * 0.6, 0.1, -1], 0.5 * k, 0.06 * k, 0.02 * k, sh(SP, -0.1), null, SP); });
    });
    att(m, 'head', mb => {
      mb.push(); mb.scale(1.2, 1.2, 1.2);
      hloft(mb, [{ z: -0.12 * k, w: 0.13 * k, h: 0.13 * k, y: 0.06 * k }, { z: 0.04 * k, w: 0.18 * k, h: 0.16 * k, y: 0.06 * k }, { z: 0.18 * k, w: 0.15 * k, h: 0.11 * k, y: 0.03 * k }, { z: 0.28 * k, w: 0.09 * k, h: 0.06 * k, y: 0.01 * k }],
        { sides: 6, color: Y, smooth: false });
      // dark mask stripes, eyes, brow gem
      LR(s => { mb.blade([s * 0.04 * k, 0.15 * k, 0.16 * k], [s * 0.15, -1, 0.35], 0.16 * k, 0.035 * k, 0.02 * k, P.face, null, P.face); mb.sphere(s * 0.075 * k, 0.12 * k, 0.17 * k, 0.026 * k, 0.026 * k, 0.016 * k, P.eye, 5, 3, false); });
      mb.box(0, 0.1 * k, 0.26 * k, 0.07 * k, 0.1 * k, 0.03 * k, P.face);
      ell(mb, 0, 0.19 * k, 0.13 * k, 0.03 * k, 0.03 * k, 0.02 * k, P.gem, 5, 3);
      // wide grin: upper fangs
      mb.box(0, -0.01 * k, 0.16 * k, 0.24 * k, 0.05 * k, 0.2 * k, '#5a1018');
      teeth(mb, [-0.12 * k, 0.0, 0.22 * k], [0.12 * k, 0.0, 0.22 * k], 7, 0.06 * k, [0, -1, 0.1], '#f4f0e8', 0.018 * k);
      LR(s => spike(mb, [s * 0.12 * k, 0.0, 0.18 * k], [0, -1, 0.2], 0.1 * k, 0.022 * k, '#f4f0e8', 3));
      // long mane hanging round the sides and back of the head, crown cap
      ell(mb, 0, 0.17 * k, -0.03 * k, 0.19 * k, 0.12 * k, 0.18 * k, MN, 7, 3);
      for (let i = 0; i < 9; i++) {
        const an = PI / 2 + 0.75 + i / 8 * (PI * 2 - 1.5), b = [C(an) * 0.17 * k, 0.17 * k, S(an) * 0.16 * k - 0.03 * k];
        mb.lock(b, [C(an) * 0.6, -0.5, S(an) * 0.5], [C(an) * 0.15, -1, S(an) * 0.2 - 0.1], (0.4 + (i % 2) * 0.06) * k, 0.12 * k, 0.035 * k, i % 2 ? MN : M2, null, sh(MN, -0.15));
      }
      mb.pop();
    });
    att(m, 'jaw', mb => {
      mb.push(); mb.scale(1.2, 1.2, 1.2);
      hloft(mb, [{ z: -0.02 * k, w: 0.13 * k, h: 0.04 * k, y: -0.05 * k }, { z: 0.2 * k, w: 0.09 * k, h: 0.03 * k, y: -0.06 * k }], { sides: 6, color: Y });
      mb.box(0, -0.03 * k, 0.1 * k, 0.18 * k, 0.02 * k, 0.18 * k, '#7a1820');
      teeth(mb, [-0.1 * k, -0.02 * k, 0.18 * k], [0.1 * k, -0.02 * k, 0.18 * k], 6, 0.05 * k, [0, 1, 0.1], '#f4f0e8', 0.016 * k);
      mb.pop();
    });
    att(m, 'tail', mb => sweep(mb, bez([0, 0, 0], [0, 0.1 * k, -0.25 * k], [0, -0.05 * k, -0.45 * k], 4), taper(4, 0.05 * k, 0.012 * k), YD, 5));
    // angular legs: long mustard forelegs with big clawed paws (a fanged maw in the right one), hind legs purple below the hock
    const leg = (front, s, maw) => meshOf(mb => {
      if (front) {
        sweep(mb, [[0, 0.04 * k, 0], [s * 0.03 * k, -0.34 * k, 0.08 * k], [s * 0.02 * k, -0.66 * k, 0.02 * k]], [0.085 * k, 0.065 * k, 0.055 * k], [Y, sh(Y, -0.12)], 6);
        mb.box(s * 0.02 * k, -0.7 * k, 0.07 * k, 0.14 * k, 0.08 * k, 0.2 * k, maw ? LO : Y);
        if (maw) { mb.box(s * 0.02 * k, -0.7 * k, 0.17 * k, 0.1 * k, 0.05 * k, 0.03 * k, '#a01820'); teeth(mb, [s * 0.02 * k - 0.05 * k, -0.68 * k, 0.17 * k], [s * 0.02 * k + 0.05 * k, -0.68 * k, 0.17 * k], 4, 0.04 * k, [0, -1, 0.2], '#f4f0e8', 0.012 * k); }
        for (let q = -1; q <= 1; q++) spike(mb, [s * 0.02 * k + q * 0.045 * k, -0.73 * k, 0.16 * k], [q * 0.3, -0.3, 1], 0.09 * k, 0.02 * k, '#f0ece0', 3);
      } else {
        sweep(mb, [[0, 0.04 * k, 0], [s * 0.04 * k, -0.28 * k, -0.14 * k], [s * 0.03 * k, -0.62 * k, -0.06 * k], [s * 0.03 * k, -0.72 * k, 0.0]], [0.11 * k, 0.065 * k, 0.045 * k, 0.04 * k], [Y, LO, LO], 6);
        mb.box(s * 0.03 * k, -0.73 * k, 0.05 * k, 0.12 * k, 0.05 * k, 0.18 * k, LO);
        for (let q = -1; q <= 1; q++) spike(mb, [s * 0.03 * k + q * 0.04 * k, -0.75 * k, 0.13 * k], [q * 0.3, -0.3, 1], 0.08 * k, 0.018 * k, '#e8e4ec', 3);
      }
    });
    m.attach('legFL', leg(true, 1, false)); m.attach('legFR', leg(true, -1, true)); m.attach('legBL', leg(false, 1)); m.attach('legBR', leg(false, -1));
    m.height = 1.3 * k; m.lungeScale = 1.2;
    return m;
  }
  def('zenene', (a) => hyena(a, { body: '#8a7a28', spike: '#402060', mane: '#d02818', legLow: '#6a2040', face: '#2a2010', eye: '#f0e040', gem: '#40d0a0' }));
  // Disc 1 (Cave of the Gi, moved from enemy_models_d1b.js): FF7 reuses the Zenene model for Sneaky Step with the blue mane
  def('sneaky_step', (a) => hyena(a, { body: '#8a7020', spike: '#9080d0', mane: '#2a5ab0', legLow: '#5a3a8a', face: '#2a2010', eye: '#f040a0', gem: '#f0f0f0' }));

  // ---- Hundred Gunner: wide squat gun platform — dark hull with a hex-framed slit visor, a long cannon across the
  // top, a big six-barrel gatling on each side, four ribbed orange pumpkin-shell stabilisers at the corners
  def('hundred_gunner', (a) => {
    const m = rig(a);
    const D = '#2e3238', D2 = '#3e444c', BK = '#18181c', OR = '#c86020', TL = '#2a8a7a', GB = '#9aa0a8';
    m.bone('body', 'root', [0, 0, 0]); m.bone('head', 'body', [0, 2.35, -0.1]);
    m.bone('gunL', 'body', [1.02, 1.62, 0.1]); m.bone('gunR', 'body', [-1.02, 1.62, 0.1]);
    m.onPose = (mm) => { gunPose(mm); mm.b('body').rot[0] *= 0.25; };   // the hull pivots at the floor: keep its pitch small
    att(m, 'body', mb => {
      // wide ribbed chassis with the front light panel
      mb.rbox(0, 0.5, 0, 2.5, 0.72, 1.9, D, 0.15);
      for (let i = 0; i < 4; i++) mb.rbox((i - 1.5) * 0.5, 0.9, 0.2, 0.26, 0.14, 1.3, i % 2 ? D2 : BK, 0.2);
      mb.rbox(0, 0.46, 0.92, 1.3, 0.46, 0.06, '#24282e', 0.1);
      LR(s => { mb.push(); mb.translate(s * 0.42, 0.5, 0.96); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0, 0, 0.12, 0.12, 0.04, 5, '#f0c030'); mb.pop(); });
      for (let i = -1; i <= 1; i++) mb.rbox(i * 0.12, 0.44, 0.96, 0.07, 0.2, 0.03, '#101014', 0.1);
      // squat hull: hex face frame with the slit visor, teal trim, red band
      mb.frustum(0, 0.96, -0.05, 1.8, 1.4, 1.5, 1.2, 1.36, { side: D2, front: D, top: sh(D2, 0.12) });
      mb.rbox(0, 1.02, 0, 1.9, 0.12, 1.5, '#c02020', 0.1);
      mb.push(); mb.translate(0, 1.68, 0.64); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0, 0, 0.36, 0.3, 0.1, 6, '#3a3a58'); mb.prism(0, 0.1, 0, 0.3, 0.26, 0.02, 6, BK); mb.pop();
      mb.rbox(0, 1.76, 0.76, 0.4, 0.07, 0.03, '#f0c020', 0.2); mb.rbox(0, 1.7, 0.77, 0.34, 0.05, 0.03, '#e02020', 0.2);
      poly2(mb, [[-0.22, 1.52, 0.77], [0.22, 1.52, 0.77], [0.3, 1.14, 0.8], [-0.3, 1.14, 0.8]], '#1c1c22');
      LR(s => { tube(mb, [s * 0.36, 1.2, 0.72], [s * 0.32, 2.0, 0.6], 0.03, 0.03, TL, 5); tube(mb, [s * 0.32, 2.0, 0.6], [s * 0.1, 2.2, 0.52], 0.03, 0.03, TL, 5); });
    });
    // top: a long cannon lying across the hull on brackets
    att(m, 'head', mb => {
      mb.rbox(0, 0.05, 0, 1.2, 0.26, 0.9, BK, 0.2);
      mb.push(); mb.translate(0, 0.32, -0.8); mb.rotate(PI / 2, 0, 0);
      mb.prism(0, 0, 0, 0.2, 0.2, 2.1, 8, '#4a5058'); mb.prism(0, 2.1, 0, 0.14, 0.14, 0.3, 8, GB); mb.prism(0, 2.4, 0, 0.1, 0.1, 0.02, 6, BK);
      for (let i = 0; i < 4; i++) mb.prism(0, 0.3 + i * 0.4, 0, 0.23, 0.23, 0.08, 8, '#6a7078');
      mb.pop();
      LR(s => mb.rbox(s * 0.3, 0.2, 0.1, 0.12, 0.24, 0.3, '#5a6068', 0.2));
      LR(s => mb.blade([s * 0.5, 0.1, -0.35], [s * 0.6, 0.6, -1], 0.6, 0.3, 0.06, '#5a5a48', null, '#8a8a70'));
    });
    // six-barrel gatlings (white hex barrels) in side housings
    const gat = (s) => meshOf(mb => {
      mb.rbox(s * 0.12, 0, -0.35, 0.55, 0.62, 0.8, D2, 0.2);
      mb.push(); mb.translate(s * 0.2, 0, -0.1); mb.rotate(PI / 2, 0, 0);
      mb.prism(0, 0, 0, 0.36, 0.36, 0.3, 8, BK);
      for (let i = 0; i < 6; i++) { const an = i / 6 * PI * 2, r = 0.21; mb.prism(C(an) * r, 0.1, S(an) * r, 0.09, 0.09, 1.25, 6, '#6a7078'); mb.prism(C(an) * r, 1.3, S(an) * r, 0.12, 0.12, 0.2, 6, '#f4f4f8'); }
      mb.prism(0, 0.3, 0, 0.1, 0.1, 1.1, 6, '#6a7078');
      for (let i = 0; i < 2; i++) mb.prism(0, 0.5 + i * 0.5, 0, 0.3, 0.3, 0.06, 8, '#3a3e46');
      mb.pop();
    });
    m.attach('gunL', gat(1)); m.attach('gunR', gat(-1));
    // ribbed orange pumpkin-shell stabilisers at the four corners, ribs radiating from the outer tip
    att(m, 'body', mb => [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
      const c = [sx * 1.25, 0.52, sz * 0.82], d = [sx, 0.12, sz * 0.7];
      along(mb, c, d); mb.sphere(0, 0, 0, 0.56, 0.46, 0.56, OR, 12, 6, false, (i) => i % 2 ? OR : sh(OR, -0.32)); mb.pop();
      tube(mb, [sx * 0.9, 0.5, sz * 0.62], c, 0.1, 0.1, BK, 6);
    }));
    m.height = 3.0; m.lungeScale = 0;
    return m;
  });

  // ---- Heli Gunner: hovering teal pod with a gear eye, four broad pale rotor blades, two olive gun arms with
  // twin barrels, and a pointed keel
  def('heli_gunner', (a) => {
    const m = rig(a); m.floats = true;
    const T = '#288a8a', GR = '#708aa0', PL = '#e8e4c8', OR = '#e07040', OL = '#8a8c6c';
    m.bone('body', 'root', [0, 1.55, 0]); m.bone('head', 'body', [0, 0.55, 0]);
    m.bone('armL', 'body', [0.58, 0.12, 0]); m.bone('armR', 'body', [-0.58, 0.12, 0]);
    att(m, 'body', mb => {
      ell(mb, 0, 0, 0, 0.55, 0.5, 0.5, T, 10, 7, (i, j) => j < 2 ? sh(T, 0.2) : T);
      disc(mb, [0, 0.05, 0.47], [0, 0, 1], 0.22, 0.22, '#e0dcc8', 12, 0.05);
      for (let i = 0; i < 10; i++) { const an = i / 10 * PI * 2; mb.rbox(C(an) * 0.22, 0.05 + S(an) * 0.22, 0.5, 0.06, 0.06, 0.04, '#d0c8b0', 0.3); }
      ell(mb, 0, 0.05, 0.52, 0.13, 0.13, 0.05, OR, 8, 5);
      mb.loft([{ y: -0.3, rx: 0.36, rz: 0.36 }, { y: -0.75, rx: 0.2, rz: 0.2 }], { sides: 8, color: '#c86048' });
      spike(mb, [0, -0.75, 0], [0, -1, 0], 0.35, 0.12, '#e8e8f0', 6);
      mb.loft([{ y: -0.32, rx: 0.4, rz: 0.4 }, { y: -0.25, rx: 0.42, rz: 0.42 }], { sides: 10, color: '#1a5a5a' });
      for (let i = 0; i < 6; i++) spike(mb, [(i - 2.5) * 0.08, -0.25, 0.4], [0, -1, 0.3], 0.1, 0.02, '#e0a0a0', 3);
    });
    // rotor: hub and four broad leaf-shaped pale blades (solid slabs, slightly pitched)
    att(m, 'head', mb => {
      mb.prism(0, -0.12, 0, 0.18, 0.16, 0.22, 8, PL); mb.prism(0, 0.1, 0, 0.24, 0.2, 0.08, 8, sh(PL, -0.15));
      for (let i = 0; i < 4; i++) {
        mb.push(); mb.translate(0, 0.16, 0); mb.rotate(0, i / 4 * PI * 2 + 0.4, 0); mb.rotate(0.22, 0, 0); mb.rotate(0, 0, 0.45); mb.rotate(-PI / 2, 0, 0);
        mb.panel([[-0.07, 0.12], [0.07, 0.12], [0.19, 0.6], [0.16, 1.05], [0.02, 1.36], [-0.12, 1.1], [-0.16, 0.55]], 0, 0.035, PL, sh(PL, -0.25));
        mb.pop();
      }
    }, TWO_SIDED);
    m.onPose = (mm) => { mm.b('head').rot[1] += (FF7.frame || 0) * 0.3; };
    const arm = (s) => meshOf(mb => {
      mb.rbox(s * 0.14, 0.02, 0, 0.36, 0.42, 0.46, OL, 0.3);                           // olive shoulder block
      tube(mb, [s * 0.2, -0.1, 0], [s * 0.36, -0.6, 0.06], 0.11, 0.1, GR, 8);
      mb.rbox(s * 0.38, -0.7, 0.1, 0.3, 0.46, 0.32, OL, 0.3);                           // gun housing
      LR(t => tube(mb, [s * 0.38 + t * 0.07, -0.8, 0.2], [s * 0.4 + t * 0.07, -1.12, 0.34], 0.045, 0.04, '#1c1c22', 6));   // twin barrels
      mb.rbox(s * 0.38, -0.5, 0.27, 0.2, 0.12, 0.04, '#c86040', 0.3);
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    m.height = 2.6; m.lungeScale = 0.4;
    return m;
  });

  // ---- Rufus: white coat; his grey shotgun hangs at his right side, barrel down and forward past the fingers
  def('rufus', () => {
    const m = human('rufus', { base: 'rufus', top: '#f0f0ea', coatColor: '#f0f0ea', sleeve: '#f0f0ea', bottom: '#e8e8e0',
      custom: (mm, H) => att(mm, 'torso', mb => { mb.quad([-0.03, H.TT * 0.98, 0.066], [0.03, H.TT * 0.98, 0.066], [0.01, H.TT * 0.5, 0.072], [-0.01, H.TT * 0.5, 0.072], '#2a2a34'); }, TWO_SIDED),
    }, { scale: 1.8, attack: 'shoot' });
    // drawn in the idle stance's upright frame (grip at the origin): barrel down-forward, short stock up behind the fist
    const wm = meshOf(mb => {
      const d = V.norm([0, -0.8, 0.6]);
      mb.push(); along(mb, [0, 0, 0], d);
      mb.rbox(0, -0.05, 0, 0.026, 0.12, 0.034, '#5a5a62', 0.25);                     // stock / grip behind the fist
      mb.rbox(0, 0.07, 0, 0.03, 0.14, 0.04, '#4a4a52', 0.2);                         // receiver
      mb.loft([{ y: 0.12, rx: 0.013, rz: 0.013, x: 0, z: -0.008 }, { y: 0.46, rx: 0.012, rz: 0.012, x: 0, z: -0.008 }], { sides: 6, color: '#3a3a42' });   // barrel
      mb.loft([{ y: 0.14, rx: 0.016, rz: 0.012, z: 0.014 }, { y: 0.3, rx: 0.016, rz: 0.012, z: 0.014 }], { sides: 6, color: '#5a5a62' });              // pump
      mb.pop();
    });
    const LM = uprightLM(m, new Float32Array(16));
    m.weaponMesh = wm;
    m.showWeapon = (on) => { m.bones.weapon.meshes = on ? [{ mesh: wm, m: LM, opts: TWO_SIDED }] : []; };
    m.showWeapon(true);
    return m;
  });
  def('dark_nation', (a) => hound(a, { c1: '#2c4450', c2: '#18262e', c3: '#3a5a6a', eye: '#f0e040', size: 1.25 }));

  // ================================================================== Midgar expressway
  // ---- Motor Ball: two huge spiked black wheels (dark hex panels with teal rims) around an olive-grey armoured cab
  // with a rounded helmet head whose dark face hole shows a skull, and a shovel-claw arm on its right
  def('motor_ball', (a) => {
    const m = rig(a);
    const BK = '#1a1c24', OG = '#7a8070', OD = '#565c50', LV = '#9a98b0', SP = '#c8c050', SK = '#b8bca8';
    m.bone('body', 'root', [0, 1.4, 0]); m.bone('head', 'body', [0, 0.7, 0.3]);
    m.bone('wheelL', 'body', [1.0, -0.2, 0]); m.bone('wheelR', 'body', [-1.0, -0.2, 0]);
    m.bone('armR', 'body', [-0.58, 0.35, 0.35]);
    m.onPose = (mm) => { const r = (FF7.frame || 0) * 0.05; mm.b('wheelL').rot[0] = r; mm.b('wheelR').rot[0] = r; };
    const whl = (s) => meshOf(mb => {
      mb.push(); mb.rotate(0, 0, PI / 2);
      mb.prism(0, -0.45, 0, 1.05, 1.05, 0.9, 12, BK);
      mb.pop();
      for (let i = 0; i < 6; i++) { const an = i / 6 * PI * 2; along(mb, [s * 0.46, S(an) * 0.65, C(an) * 0.65], [s, 0, 0]); mb.prism(0, 0, 0, 0.36, 0.36, 0.02, 6, '#2a6a70'); mb.prism(0, 0.01, 0, 0.3, 0.3, 0.02, 6, '#3a2a4a'); mb.pop(); }
      for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) { const an = (i + r * 0.5) / 12 * PI * 2; spike(mb, [s * (-0.3 + r * 0.3), S(an) * 1.03, C(an) * 1.03], [0, S(an), C(an)], 0.2, 0.06, SP, 4); }
    });
    m.attach('wheelL', whl(1)); m.attach('wheelR', whl(-1));
    att(m, 'body', mb => {
      // armoured cab: rounded olive-grey hull, big shoulder armour, lavender side plates, dark underside
      mb.loft([{ y: -0.45, rx: 0.5, rz: 0.6 }, { y: -0.1, rx: 0.62, rz: 0.72 }, { y: 0.35, rx: 0.66, rz: 0.7 }, { y: 0.62, rx: 0.5, rz: 0.52 }], { sides: 10, sq: 2.6, color: OG });
      LR(s => { ell(mb, s * 0.52, 0.5, 0.05, 0.3, 0.26, 0.36, OG, 8, 5, (i, j) => j < 2 ? sh(OG, 0.15) : OG); mb.rbox(s * 0.66, 0.0, 0.05, 0.1, 0.6, 0.9, LV, 0.3); });
      mb.rbox(0, -0.5, 0.1, 1.0, 0.24, 1.2, OD, 0.2);
      mb.loft([{ y: 0.52, rx: 0.42, rz: 0.42, z: 0.26 }, { y: 0.66, rx: 0.46, rz: 0.46, z: 0.28 }], { sides: 12, color: '#c8b050' });   // gold collar ring
      LR(s => { tube(mb, [s * 0.3, 0.5, -0.4], [s * 0.4, 1.25, -0.78], 0.12, 0.11, '#8a7a60', 8); tube(mb, [s * 0.4, 1.25, -0.78], [s * 0.41, 1.3, -0.8], 0.11, 0.11, '#101010', 8); });
    });
    att(m, 'head', mb => {
      // rounded helmet with a deep face hole; a skull peers out of the dark
      ell(mb, 0, 0.2, -0.14, 0.42, 0.44, 0.42, OG, 10, 6, (i, j) => j < 2 ? sh(OG, 0.15) : j > 4 ? OD : OG);
      mb.push(); mb.translate(0, 0.14, 0.18); mb.rotate(PI / 2, 0, 0);
      mb.prism(0, 0, 0, 0.3, 0.3, 0.2, 12, '#0c0e10'); mb.prism(0, 0.2, 0, 0.34, 0.3, 0.06, 12, OD, false, false, false);   // face hole with a thick rim
      mb.pop();
      ell(mb, 0, 0.13, 0.4, 0.2, 0.23, 0.12, SK, 8, 5, (i, j) => j < 2 ? sh(SK, 0.1) : SK);                // skull
      LR(s => ell(mb, s * 0.085, 0.2, 0.49, 0.055, 0.06, 0.03, '#101010', 6, 4));
      mb.rbox(0, 0.1, 0.51, 0.05, 0.05, 0.03, '#2a2a2a', 0.3);
      for (let i = 0; i < 5; i++) mb.rbox((i - 2) * 0.042, -0.02, 0.48, 0.03, 0.08, 0.03, '#e8e8dc', 0.3);
      spike(mb, [0, 0.56, -0.1], [0, 1, -0.4], 0.26, 0.08, OD, 4);
      LR(s => mb.blade([s * 0.32, 0.4, -0.08], [s * 0.6, 1, -0.5], 0.36, 0.2, 0.06, OD, null, OG));
    });
    // shovel-claw arm reaching forward on the right
    att(m, 'armR', mb => {
      limb(mb, [[0, 0, 0], [-0.2, -0.2, 0.35], [-0.18, -0.5, 0.7]], [0.12, 0.1, 0.09], '#6a7890', 7);
      mb.push(); along(mb, [-0.18, -0.5, 0.7], [0, -0.6, 1]); mb.rbox(0, 0.12, 0, 0.36, 0.24, 0.08, '#9aa4b8', 0.25); mb.pop();
      for (let i = -1; i <= 1; i++) spike(mb, [-0.18 + i * 0.11, -0.68, 0.92], [0, -0.7, 1], 0.14, 0.04, '#d8dce4', 3);
    });
    m.height = 3.0; m.lungeScale = 1.2;
    return m;
  });

  // ---- Devil Ride: possessed chopper — long fork, small front wheel, armoured rear, magenta skeletal rider
  def('devil_ride', (a) => {
    const m = rig(a);
    const NV = '#28304e', R = '#c02030', FK = '#a8a8d0', MG = '#e03088';
    m.bone('body', 'root', [0, 0.55, -0.3]); m.bone('head', 'body', [0, 0.95, 0.15]);
    m.bone('armL', 'body', [0.18, 0.75, 0.2]); m.bone('armR', 'body', [-0.18, 0.75, 0.2]);
    att(m, 'root', mb => {
      wheel(mb, 0, 0.5, -0.45, 0.5, 0.34, '#1a1a22', '#6a6a78', 12);
      wheel(mb, 0, 0.22, 1.9, 0.22, 0.1, '#1a1a22', '#e07020', 10);
      LR(s => tube(mb, [s * 0.1, 0.22, 1.9], [s * 0.1, 1.35, 0.55], 0.025, 0.025, FK, 6));
      LR(s => tube(mb, [s * 0.1, 1.35, 0.55], [s * 0.28, 1.5, 0.35], 0.02, 0.02, '#c8c8e0', 5));
      ball(mb, [0, 1.3, 0.55], 0.06, '#e8e8f8');
    });
    att(m, 'body', mb => {
      hloft(mb, [{ z: -0.65, w: 0.2, h: 0.2, y: 0.25 }, { z: -0.3, w: 0.36, h: 0.32, y: 0.25 }, { z: 0.2, w: 0.3, h: 0.28, y: 0.3 }, { z: 0.55, w: 0.18, h: 0.18, y: 0.45 }], { sides: 8, color: NV });
      hloft(mb, [{ z: -0.2, w: 0.38, h: 0.2, y: 0.5 }, { z: 0.35, w: 0.3, h: 0.16, y: 0.55 }], { sides: 8, color: R });
      LR(s => { tube(mb, [s * 0.3, 0.3, -0.5], [s * 0.35, 0.45, -1.0], 0.06, 0.05, '#8a8a98', 6); spike(mb, [s * 0.35, 0.55, -0.2], [s, 0.3, -0.5], 0.3, 0.05, '#c8c8d8', 4); });
      for (let i = 0; i < 4; i++) spike(mb, [0, 0.6, -0.4 + i * 0.2], [0, 1, -0.5], 0.25, 0.05, '#c8c8d8', 4);
      // rider torso
      mb.loft([{ y: 0.6, rx: 0.14, rz: 0.1 }, { y: 0.8, rx: 0.2, rz: 0.12 }, { y: 0.95, rx: 0.1, rz: 0.08 }], { sides: 8, color: MG });
    });
    att(m, 'head', mb => { ell(mb, 0, 0.08, 0, 0.1, 0.12, 0.11, '#f0e8f0', 8, 5); LR(s => eye(mb, s * 0.04, 0.1, 0.09, 0.02, '#e02040')); teeth(mb, [-0.05, 0.02, 0.1], [0.05, 0.02, 0.1], 4, 0.04, [0, -1, 0.3], '#303040', 0.012); spike(mb, [0, 0.18, -0.02], [0, 0.4, -1], 0.25, 0.05, MG, 4); });
    const arm = (s) => meshOf(mb => { limb(mb, [[0, 0, 0], [s * 0.15, 0.25, 0.1], [s * 0.1, 0.62, 0.35]], [0.035, 0.03, 0.025], MG, 5); });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    m.height = 1.9; m.lungeScale = 1.3;
    return m;
  });

  // ================================================================== Grasslands / Chocobo Farm / marsh
  // (custom_sweeper is defined with the Sweeper builder)
  def('kalm_fang', (a) => wolf(a, { c1: '#a898c8', c2: '#d8d0e8', mane: '#b8a8d8', maneTip: '#d0c0f0', eye: '#f0e040', size: 1.15 }));
  // (prowler is defined with the Vice builder, thug())

  // ---- Elfadunk: hulking cyan elephant-beast with two great horns, a trunk and an orange spiked fringe
  def('elfadunk', (a) => {
    const m = rig(a);
    const T = '#58c8d0', TD = '#3898a8', H = '#f0ecd8', OR = '#e09040';
    m.bone('body', 'root', [0, 1.05, 0]); m.bone('head', 'body', [0, 0.1, 0.72]); m.bone('jaw', 'head', [0, -0.15, 0.2]);
    [['FL', 1, 1], ['FR', -1, 1], ['BL', 1, -1], ['BR', -1, -1]].forEach(([n, sx, sz]) => m.bone('leg' + n, 'body', [sx * 0.42, -0.3, sz * 0.42]));
    att(m, 'body', mb => {
      hloft(mb, [{ z: -0.75, w: 0.4, h: 0.4 }, { z: -0.4, w: 0.66, h: 0.6, y: 0.1 }, { z: 0.2, w: 0.7, h: 0.68, y: 0.15 }, { z: 0.6, w: 0.5, h: 0.5, y: 0.15 }, { z: 0.8, w: 0.3, h: 0.3, y: 0.1 }], { sides: 8, color: T, smooth: false });
      for (let i = 0; i < 6; i++) { const z = -0.5 + i * 0.22; LR(s => mb.blade([s * 0.35, 0.65, z], [s * 0.6, 1, 0], 0.22, 0.25, 0.06, sh(T, 0.12), null, T)); }
      for (let i = 0; i < 14; i++) { const an = i / 14 * PI * 2; spike(mb, [C(an) * 0.6, -0.5, S(an) * 0.65], [C(an) * 0.3, -1, S(an) * 0.3], 0.25, 0.07, OR, 3); }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0, 0, 0.36, 0.34, 0.3, T, 8, 5);
      LR(s => { eye(mb, s * 0.2, 0.08, 0.24, 0.05, '#f0e020'); sweep(mb, bez([s * 0.2, 0.15, 0.05], [s * 0.45, 0.6, 0.0], [s * 0.4, 1.05, -0.15], 6), taper(6, 0.1, 0.02), H, 6); mb.blade([s * 0.25, -0.1, 0.2], [s * 0.3, -0.3, 1], 0.35, 0.08, 0.06, H); });
      sweep(mb, bez3([0, -0.05, 0.25], [0, -0.3, 0.55], [0, -0.7, 0.45], [0, -0.9, 0.55], 7), taper(7, 0.12, 0.06), TD, 7);
    });
    att(m, 'jaw', mb => { hloft(mb, [{ z: -0.05, w: 0.12, h: 0.04 }, { z: 0.1, w: 0.08, h: 0.03 }], { sides: 6, color: '#b03040' }); });
    const leg = meshOf(mb => { limb(mb, [[0, 0, 0], [0, -0.4, 0.02], [0, -0.75, 0]], [0.22, 0.2, 0.19], T, 7); for (let i = -1; i <= 1; i++) spike(mb, [i * 0.1, -0.72, 0.15], [0, -0.3, 1], 0.12, 0.05, H, 3); });
    ['FL', 'FR', 'BL', 'BR'].forEach(n => m.attach('leg' + n, leg));
    m.height = 2.3; m.lungeScale = 0.9;
    return m;
  });

  // ---- Mu: burrowing squirrel peeking out of a dirt mound
  def('mu', (a) => {
    const m = rig(a);
    const F = '#e8c0a8', W = '#f0e8d8', DI = '#8a7050';
    m.bone('body', 'root', [0, 0.34, 0]); m.bone('head', 'body', [0, 0.28, 0.1]); m.bone('tail', 'body', [0, 0.05, -0.15]);
    m.bone('armL', 'body', [0.1, 0.12, 0.1]); m.bone('armR', 'body', [-0.1, 0.12, 0.1]);
    att(m, 'root', mb => { mb.frustum(0, 0, 0, 1.2, 1.0, 0.8, 0.62, 0.34, { side: DI, top: sh(DI, 0.15), front: DI }); for (let i = 0; i < 10; i++) { const an = i / 10 * PI * 2; ell(mb, C(an) * 0.42, 0.33, S(an) * 0.34, 0.06, 0.04, 0.06, i % 2 ? '#a08868' : '#6a5438', 5, 3); } });
    att(m, 'body', mb => { ell(mb, 0, 0.1, 0, 0.14, 0.18, 0.13, F, 8, 5); ell(mb, 0, 0.08, 0.08, 0.09, 0.12, 0.06, W, 6, 4); });
    att(m, 'head', mb => {
      ell(mb, 0, 0.04, 0, 0.12, 0.11, 0.11, F, 8, 5); ell(mb, 0, 0.0, 0.08, 0.06, 0.05, 0.05, W, 6, 4);
      LR(s => { eye(mb, s * 0.055, 0.06, 0.09, 0.022, '#3060d0'); mb.blade([s * 0.07, 0.1, -0.02], [s * 0.3, 1, -0.1], 0.1, 0.06, 0.02, F); });
      ball(mb, [0, 0.02, 0.13], 0.015, '#402020');
    });
    att(m, 'tail', mb => { for (let i = 0; i < 7; i++) { const an = (i / 6 - 0.5) * 1.6; mb.blade([0, 0, 0], [S(an) * 0.5, 1, -0.4 + C(an) * 0.1], 0.5 - Math.abs(i - 3) * 0.04, 0.16, 0.06, i % 2 ? W : '#f8f4ec', null, '#e8d8c8'); } });
    const arm = (s) => meshOf(mb => limb(mb, [[0, 0, 0], [s * 0.03, -0.08, 0.06], [s * 0.02, -0.12, 0.1]], [0.03, 0.025, 0.02], F, 5));
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    m.height = 1.1; m.lungeScale = 0.6;
    return m;
  });

  // ---- Mandragora: walking root — tuft of long leaves over a little stalk face on thin red legs
  def('mandragora', (a) => {
    const m = rig(a);
    const G = '#58b038', Y = '#c8d040', R = '#c03028';
    m.bone('body', 'root', [0, 0.22, 0]); m.bone('head', 'body', [0, 0.28, 0]);
    [['FL', 1, 1], ['FR', -1, 1], ['BL', 1, -1], ['BR', -1, -1]].forEach(([n, sx, sz]) => m.bone('leg' + n, 'body', [sx * 0.04, 0, sz * 0.04]));
    att(m, 'body', mb => { mb.loft([{ y: -0.02, rx: 0.06, rz: 0.06 }, { y: 0.15, rx: 0.07, rz: 0.07 }, { y: 0.3, rx: 0.06, rz: 0.06 }], { sides: 6, color: Y }); LR(s => eye(mb, s * 0.03, 0.2, 0.06, 0.014, '#e02020')); mb.rbox(0, 0.12, 0.06, 0.04, 0.015, 0.01, '#402010', 0.3); });
    att(m, 'head', mb => { for (let i = 0; i < 11; i++) { const an = i / 11 * PI * 2, lean = 0.25 + (i % 3) * 0.1; mb.blade([C(an) * 0.03, 0, S(an) * 0.03], [C(an) * lean, 1, S(an) * lean], 0.55 + (i % 4) * 0.08, 0.07, 0.015, i % 3 ? G : '#88d040', null, i % 2 ? '#e8e060' : '#a0e050'); } });
    const leg = (s, f) => meshOf(mb => limb(mb, [[0, 0, 0], [s * 0.16, 0.06, f * 0.12], [s * 0.26, -0.22, f * 0.2]], [0.012, 0.01, 0.006], R, 4));
    m.attach('legFL', leg(1, 1)); m.attach('legFR', leg(-1, 1)); m.attach('legBL', leg(1, -1)); m.attach('legBR', leg(-1, -1));
    m.height = 1.05; m.lungeScale = 1;
    return m;
  });

  // ---- Levrikon / Epiolnis: tall claw-winged bird — ragged feathered body tilted up, S-curved neck with a
  //      beaked crested head, wings ending in big clawed hands held forward, long legs on huge taloned feet
  //      (one model, two palettes)
  function clawBird(look, P) {
    const m = rig(look);
    const B = P.body, BD = sh(P.body, -0.25), BL = sh(P.body, 0.14);
    m.bone('body', 'root', [0, 1.27, 0]); m.bone('head', 'body', [0, 1.0, 0.46], [0.5, 0, 0]); m.bone('tail', 'body', [0, -0.02, -0.36]);
    m.bone('armL', 'body', [0.36, 0.2, 0.18]); m.bone('armR', 'body', [-0.36, 0.2, 0.18]);
    m.bone('legFL', 'body', [0.14, -0.2, -0.02]); m.bone('legFR', 'body', [-0.14, -0.2, -0.02]);
    att(m, 'body', mb => {
      mb.push(); mb.rotate(-0.3, 0, 0);
      ell(mb, 0, 0, 0, 0.42, 0.42, 0.48, B, 9, 6, (i, j) => j > 3 ? BD : B);
      LR(s => { for (let i = 0; i < 3; i++) mb.blade([s * 0.3, 0.2 - i * 0.14, -0.2], [s * 0.7, 0.3 - i * 0.3, -0.7], 0.3, 0.16, 0.03, i % 2 ? BL : B, null, BD); });
      // ragged feather fringe round the lower body
      for (let i = 0; i < 11; i++) { const an = i / 11 * PI * 2; mb.blade([C(an) * 0.37, -0.16, S(an) * 0.42], [C(an) * 0.8, -1, S(an) * 0.8], 0.32, 0.2, 0.03, i % 2 ? BL : B, { radial: [0, -0.16, 0] }, BD); }
      mb.pop();
      // S-curved neck: up, forward, up again to the head
      sweep(mb, bez3([0, 0.26, 0.3], [0, 0.72, 0.12], [0, 0.78, 0.62], [0, 1.0, 0.46], 8), taper(8, 0.09, 0.055), P.neck, 6);
    });
    att(m, 'tail', mb => { for (let i = 0; i < 5; i++) mb.blade([0, 0, 0], [(i - 2) * 0.35, -0.3, -1], 0.36, 0.12, 0.03, i % 2 ? BL : B, null, BD); });
    att(m, 'head', mb => {
      ell(mb, 0, 0.02, 0, 0.07, 0.07, 0.08, P.neck, 7, 4);
      // long beak pointing forward and down
      hloft(mb, [{ z: 0.04, w: 0.045, h: 0.04, y: 0.0 }, { z: 0.2, w: 0.025, h: 0.025, y: -0.06 }, { z: 0.34, w: 0.006, h: 0.006, y: -0.13 }], { sides: 5, color: P.beak });
      LR(s => { eye(mb, s * 0.05, 0.04, 0.04, 0.014, P.eye); if (P.cheek) ell(mb, s * 0.045, -0.03, 0.06, 0.03, 0.03, 0.02, P.cheek, 5, 3); });
      for (let i = 0; i < 7; i++) spike(mb, [0, 0.06, -0.03], [(i - 3) * 0.28, 1, -0.6], 0.27 - Math.abs(i - 3) * 0.025, 0.03, i % 2 ? P.crest : P.crest2, 3);
    });
    // wing-arms: ragged wing feathers from the shoulder, forearm to a big clawed hand held forward
    const arm = (s) => meshOf(mb => {
      for (let i = 0; i < 4; i++) mb.blade([0, 0.02, 0], [s * 0.5, -0.5 - i * 0.25, -0.6 + i * 0.25], 0.36 - i * 0.03, 0.14, 0.03, i % 2 ? B : BL, null, BD);
      const hd = [s * 0.16, -0.2, 0.42];
      limb(mb, [[0, 0, 0], [s * 0.12, -0.02, 0.18], hd], [0.06, 0.055, 0.05], B, 6);
      ell(mb, hd[0], hd[1] - 0.02, hd[2] + 0.02, 0.14, 0.09, 0.13, P.hand, 7, 4);
      for (let i = 0; i < 4; i++) mb.lock([hd[0] + (i - 1.5) * 0.065, hd[1] - 0.05, hd[2] + 0.1], [(i - 1.5) * 0.2, -0.6, 1], [(i - 1.5) * 0.1, -1, 0.2], 0.32, 0.06, 0.045, P.claw, null, sh(P.claw, 0.3));
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    // long legs (ankle bending back) on huge feet: three long forward toes and a back toe, white talons
    const leg = (s) => meshOf(mb => {
      const kn = [s * 0.02, -0.5, -0.16], an = [s * 0.02, -1.0, 0.0];
      limb(mb, [[0, 0, 0], kn, an], [0.07, 0.055, 0.045], P.leg, 6);
      ball(mb, kn, 0.065, sh(P.leg, -0.15));
      for (let i = -1; i <= 1; i++) { const d = V.norm([i * 0.45, -0.12, 1]), tip = V.add(an, V.scale(d, 0.36)); obox(mb, an, tip, 0.06, 0.05, 0.035, 0.03, P.leg); spike(mb, tip, [d[0], -0.5, d[2]], 0.08, 0.02, '#f4f0ec', 3); }
      obox(mb, an, V.add(an, [0, -0.02, -0.18]), 0.05, 0.04, 0.03, 0.03, P.leg); spike(mb, V.add(an, [0, -0.02, -0.18]), [0, -0.5, -1], 0.06, 0.02, '#f4f0ec', 3);
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    // the feet stay planted while the body pitches in the clips
    m.onPose = (mm) => { const Bn = mm.bones; if (Bn.body) ['legFL', 'legFR'].forEach(n => { if (Bn[n]) Bn[n].rot[0] -= Bn.body.rot[0]; }); };
    m.height = 2.6; m.scale = P.size || 1; m.lungeScale = 1;
    return m;
  }
  def('levrikon', (a) => clawBird(a, { body: '#6a5a38', neck: '#d898b8', beak: '#c880a8', leg: '#c07090', crest: '#f04080', crest2: '#f08040', eye: '#f0e040', hand: '#9a8a58', claw: '#9a60d0', size: 0.92 }));
  // Disc 2 (Ancient Forest): FF7 reuses the Levrikon model for the Epiolnis
  def('epiolnis', (a) => clawBird(a, { body: '#1a3a30', neck: '#2a60c0', beak: '#2a60c0', leg: '#2a4a9a', crest: '#e0602a', crest2: '#f0c030', eye: '#f0e040', cheek: '#e04090', hand: '#c0b060', claw: '#b070e0', size: 1.0 }));

  // ================================================================== Midgar Zolom (the marsh serpent)
  def('midgar_zolom', (a) => {
    const m = rig(a);
    const OL = '#8a9a60', PA = '#b0b8a0', BE = '#e0d8a0', HD = '#a8b0a8', OR = '#c88060';
    // coiled body on the ground
    att(m, 'root', mb => {
      const pts = [];
      for (let i = 0; i <= 22; i++) { const an = -0.6 + i / 22 * PI * 2.3, r = 1.35 - i * 0.02; pts.push([C(an) * r, 0.32 + (i > 18 ? (i - 18) * 0.12 : 0), -0.3 + S(an) * r * 0.8]); }
      pts.push([0.05, 1.0, 0.15]);
      sweep(mb, pts, pts.map((p, i) => [0.36 - i * 0.004, 0.3]), OL, 8, (i, k) => (k === 3 || k === 4) ? BE : (i % 2 ? OL : sh(OL, 0.1)));
      ell(mb, pts[0][0], pts[0][1], pts[0][2], 0.2, 0.2, 0.2, OL, 6, 4);
    });
    // rising neck in segments (seg0..seg5) for the sway
    const segLen = 0.62;
    let parent = 'root';
    for (let i = 0; i < 6; i++) {
      m.bone('seg' + i, parent, i === 0 ? [0.05, 1.0, 0.15] : [0, segLen, 0], [[-0.12, 0, 0], [-0.1, 0, 0], [0.05, 0, 0], [0.15, 0, 0], [0.18, 0, 0], [0.12, 0, 0]][i]);
      const r0 = 0.34 - i * 0.02, r1 = 0.34 - (i + 1) * 0.02;
      att(m, 'seg' + i, mb => {
        mb.loft([{ y: -0.04, rx: r0, rz: r0 * 0.9 }, { y: segLen * 0.5, rx: (r0 + r1) / 2 + 0.02, rz: r0 * 0.92 }, { y: segLen + 0.02, rx: r1, rz: r1 * 0.9 }], { sides: 8, color: OL, colors: (k, n) => (k === 1 || k === 2) ? BE : OL });
        for (let j = 0; j < 3; j++) mb.loft([{ y: j * segLen / 3, rx: r0 * 0.7, rz: r0 * 0.3, z: r0 * 0.72 }, { y: j * segLen / 3 + 0.04, rx: r0 * 0.7, rz: r0 * 0.3, z: r0 * 0.72 }], { sides: 6, color: sh(BE, -0.15) });
      });
      parent = 'seg' + i;
    }
    m.bone('head', parent, [0, segLen, 0.05], [0.75, 0, 0]);
    m.bone('jaw', 'head', [0, -0.08, 0.15]);
    att(m, 'head', mb => {
      mb.push(); mb.scale(1.5, 1.5, 1.5);
      // cobra hood: broad flattened spade flaring behind and around the head
      mb.push(); mb.translate(0, -0.05, -0.18); mb.rotate(-1.35, 0, 0);
      mb.loft([{ y: -0.45, rx: 0.3, rz: 0.12 }, { y: -0.1, rx: 0.62, rz: 0.16 }, { y: 0.3, rx: 0.66, rz: 0.16 }, { y: 0.6, rx: 0.42, rz: 0.13 }, { y: 0.78, rx: 0.12, rz: 0.08 }], { sides: 10, color: HD, colors: (k, n) => (k === 2 || k === 7) ? OR : k > 4 ? sh(HD, -0.12) : HD });
      mb.pop();
      hloft(mb, [{ z: -0.2, w: 0.28, h: 0.2, y: 0.05 }, { z: 0.15, w: 0.25, h: 0.17, y: 0.05 }, { z: 0.45, w: 0.16, h: 0.1, y: 0.0 }, { z: 0.58, w: 0.08, h: 0.06, y: -0.02 }], { sides: 8, color: PA });
      LR(s => { eye(mb, s * 0.19, 0.12, 0.25, 0.035, '#f0e020'); mb.blade([s * 0.17, 0.18, 0.2], [s * 0.2, 0.3, -1], 0.35, 0.12, 0.05, HD); });
      mb.pop();
    });
    att(m, 'jaw', mb => {
      mb.push(); mb.scale(1.5, 1.5, 1.5);
      hloft(mb, [{ z: -0.1, w: 0.22, h: 0.06, y: -0.05 }, { z: 0.45, w: 0.12, h: 0.04, y: -0.06 }], { sides: 6, color: BE });
      LR(s => spike(mb, [s * 0.1, -0.02, 0.4], [0, 1, 0.1], 0.14, 0.025, '#f8f8f0', 3));
      sweep(mb, bez([0, -0.04, 0.3], [0, -0.06, 0.6], [0, -0.2, 0.8], 4), taper(4, 0.025, 0.01), '#c03060', 4);
      mb.pop();
    });
    m.height = 5.2; m.lungeScale = 0.9;
    return m;
  });

  // ---- Chocobo (wild)
  def('chocobo', (a) => {
    const m = rig(a);
    const Y = '#f4d848', Y2 = '#e8c030', BK = '#f09838', LG = '#c8a060';
    m.bone('body', 'root', [0, 1.02, 0]); m.bone('head', 'body', [0, 0.72, 0.28]); m.bone('tail', 'body', [0, 0.12, -0.32]);
    m.bone('wingL', 'body', [0.25, 0.15, 0.05]); m.bone('wingR', 'body', [-0.25, 0.15, 0.05]);
    m.bone('legFL', 'body', [0.13, -0.2, 0]); m.bone('legFR', 'body', [-0.13, -0.2, 0]);
    att(m, 'body', mb => {
      ell(mb, 0, 0.05, 0, 0.32, 0.36, 0.38, Y, 10, 6, (i, j) => j > 3 ? Y2 : Y);
      sweep(mb, bez([0, 0.3, 0.2], [0, 0.55, 0.3], [0, 0.75, 0.28], 5), taper(5, 0.13, 0.09), Y, 7);
      for (let i = 0; i < 4; i++) mb.blade([0, 0.35 + i * 0.1, 0.34], [0, -0.4, 1], 0.12, 0.1, 0.03, Y2);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.05, 0.02, 0.12, 0.13, 0.14, Y, 8, 5);
      hloft(mb, [{ z: 0.1, w: 0.07, h: 0.05, y: 0.02 }, { z: 0.25, w: 0.02, h: 0.02, y: -0.01 }], { sides: 6, color: BK });
      LR(s => { ell(mb, s * 0.085, 0.09, 0.08, 0.025, 0.03, 0.015, '#f0f0f8', 5, 3); eye(mb, s * 0.09, 0.09, 0.09, 0.016, '#2050d0'); });
      [[-0.4, 1, -0.3], [0, 1, -0.2], [0.4, 1, -0.3]].forEach(d => mb.blade([d[0] * 0.05, 0.15, 0], d, 0.24, 0.06, 0.02, Y, null, '#f8e888'));
    });
    att(m, 'tail', mb => { for (let i = 0; i < 7; i++) { const an = (i / 6 - 0.5) * 1.8; mb.blade([0, 0, 0], [S(an), 0.9 + C(an) * 0.2, -0.6], 0.5, 0.12, 0.03, i % 2 ? Y : Y2, null, '#fff0a0'); } });
    const wing = (s) => meshOf(mb => { for (let i = 0; i < 3; i++) mb.blade([0, 0, 0], [s * 0.4, -0.3 - i * 0.2, -1], 0.35, 0.12, 0.03, i % 2 ? Y2 : Y); });
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    const leg = (s) => meshOf(mb => {
      ell(mb, 0, -0.05, 0, 0.12, 0.16, 0.13, Y, 7, 4);
      limb(mb, [[0, -0.15, 0], [s * 0.02, -0.5, -0.1], [s * 0.02, -0.8, 0]], [0.05, 0.035, 0.03], LG, 6);
      for (let i = -1; i <= 1; i++) mb.blade([s * 0.02, -0.8, 0], [i * 0.5, -0.15, 1], 0.18, 0.05, 0.03, '#f0e8e0', null, '#ffffff');
      mb.blade([s * 0.02, -0.8, 0], [0, -0.1, -1], 0.1, 0.04, 0.03, '#f0e8e0');
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 1.95; m.lungeScale = 1;
    return m;
  });
  def('chocobo_b', (a) => MODELS.chocobo(a));
  def('chocobo_c', (a) => MODELS.chocobo(a));
  ['chocobo_l22', 'chocobo_l29', 'chocobo_l30', 'chocobo_l33', 'chocobo_l36'].forEach(id => def(id, (a) => MODELS.chocobo(a)));   // (the other areas' levels)

  // ================================================================== Mythril Mine
  // ---- Madouge: pink ape-brute with a crest on its chest, banded gauntlets and a spiked club
  def('madouge', (a) => {
    const m = rig(a);
    const PK = '#f0b0b8', OL = '#a0a040', BD = '#6a6070';
    m.bone('body', 'root', [0, 1.15, 0]); m.bone('head', 'body', [0, 0.78, 0.12]);
    m.bone('armL', 'body', [0.45, 0.6, 0]); m.bone('armR', 'body', [-0.45, 0.6, 0]);
    m.bone('legFL', 'body', [0.2, -0.1, 0]); m.bone('legFR', 'body', [-0.2, -0.1, 0]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.2, rx: 0.3, rz: 0.24, color: OL }, { y: 0.05, rx: 0.32, rz: 0.26 }, { y: 0.45, rx: 0.46, rz: 0.32 }, { y: 0.72, rx: 0.36, rz: 0.26 }], { sides: 8, color: PK, smooth: false });
      disc(mb, [0, 0.45, 0.31], [0, 0.1, 1], 0.13, 0.15, '#d8a030', 6, 0.03);
      disc(mb, [0, 0.45, 0.33], [0, 0.1, 1], 0.1, 0.12, '#4040a0', 6, 0.03);
      ell(mb, 0, 0.44, 0.35, 0.05, 0.06, 0.02, '#e03030', 5, 3);
    });
    att(m, 'head', mb => { ell(mb, 0, 0.05, 0, 0.17, 0.14, 0.17, PK, 8, 5); LR(s => eye(mb, s * 0.07, 0.08, 0.15, 0.022, '#4060e0')); mb.rbox(0, -0.01, 0.15, 0.12, 0.03, 0.04, sh(PK, -0.3), 0.3); });
    const arm = (s) => meshOf(mb => {
      ell(mb, 0, 0, 0, 0.18, 0.17, 0.18, PK, 7, 4);
      limb(mb, [[0, 0, 0], [s * 0.1, -0.4, 0.05]], [0.12, 0.11], PK, 7);
      for (let i = 0; i < 5; i++) mb.loft([{ y: -0.42 - i * 0.08, rx: 0.13, rz: 0.12, x: s * 0.1, z: 0.05 }, { y: -0.47 - i * 0.08, rx: 0.12, rz: 0.11, x: s * 0.1, z: 0.05 }], { sides: 8, color: i % 2 ? '#c8c0b0' : BD });
      for (let i = -1; i <= 1; i++) sweep(mb, bez([s * 0.1 + i * 0.05, -0.82, 0.08], [s * 0.1 + i * 0.07, -0.98, 0.15], [s * 0.1 + i * 0.07, -1.05, 0.05], 3), taper(3, 0.02, 0.006), '#3a3030', 4);
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    att(m, 'armR', mb => { tube(mb, [-0.1, -0.9, 0.05], [-0.1, -0.3, 0.9], 0.025, 0.025, '#403830', 5); mb.push(); along(mb, [-0.1, -0.2, 1.05], [0, 0.6, 0.8]); mb.loft([{ y: -0.2, rx: 0.08, rz: 0.08 }, { y: 0.2, rx: 0.1, rz: 0.1 }], { sides: 6, color: '#8a8070' }); for (let i = 0; i < 6; i++) spike(mb, [0, (i % 3 - 1) * 0.12, 0], [C(i), 0, S(i)], 0.1, 0.025, '#d0d0d8', 3); mb.pop(); mb.pop(); });
    const leg = (s) => meshOf(mb => { limb(mb, [[0, 0, 0], [s * 0.08, -0.5, 0.06], [s * 0.1, -0.98, 0]], [0.17, 0.16, 0.18], OL, 7); mb.frustum(s * 0.1, -1.15, 0.04, 0.34, 0.42, 0.26, 0.3, 0.2, '#6a8a30'); });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 2.3; m.lungeScale = 0.9;
    return m;
  });

  // ---- Crawler: upright cave larva with a fanged face and a curled spiny tail-end
  def('crawler', (a) => {
    const m = rig(a);
    const SK = '#98a8b8', TN = '#c8b070', BL = '#5aa0d0';
    m.bone('body', 'root', [0, 0.3, 0]);
    let parent = 'body';
    for (let i = 0; i < 5; i++) {
      m.bone('seg' + i, parent, i === 0 ? [0, 0.1, 0] : [0, 0.3, 0], [[-0.3, 0, 0], [-0.15, 0, 0], [0.2, 0, 0], [0.3, 0, 0], [0.25, 0, 0]][i]);
      att(m, 'seg' + i, mb => { mb.loft([{ y: -0.02, rx: 0.13, rz: 0.12 }, { y: 0.15, rx: 0.15, rz: 0.13 }, { y: 0.31, rx: 0.13, rz: 0.12 }], { sides: 7, color: i % 2 ? SK : TN, smooth: false }); });
      parent = 'seg' + i;
    }
    m.bone('head', parent, [0, 0.3, 0.02], [0.25, 0, 0]); m.bone('jaw', 'head', [0, 0.02, 0.14]);
    att(m, 'head', mb => {
      ell(mb, 0, 0.12, 0.04, 0.16, 0.15, 0.16, SK, 8, 5);
      LR(s => eye(mb, s * 0.08, 0.2, 0.15, 0.025, '#e02020'));
      mb.rbox(0, 0.05, 0.16, 0.18, 0.08, 0.06, '#402030', 0.3);
      teeth(mb, [-0.08, 0.09, 0.19], [0.08, 0.09, 0.19], 5, 0.05, [0, -1, 0.1], '#f0f0f0', 0.015);
    });
    att(m, 'body', mb => {
      const pts = bez3([0, 0, 0], [0, -0.25, 0.1], [0.2, -0.25, 0.4], [0.3, -0.05, 0.45], 7);
      sweep(mb, pts, taper(7, 0.14, 0.03), TN, 7);
      for (let i = 1; i < 7; i++) spike(mb, pts[i], [0.3, 1, 0.2], 0.12, 0.03, BL, 3);
      LR(s => spike(mb, [s * 0.1, 0.1, 0], [s, -0.5, 0.2], 0.3, 0.05, BL, 4));
    });
    m.height = 2.0; m.lungeScale = 1;
    return m;
  });

  // ---- Ark Dragon: small flying dragon — yellow-green body, lilac belly, big pink-violet wings
  def('ark_dragon', (a) => {
    const m = rig(a); m.floats = true;
    const Y = '#b0c030', LI = '#c8a8e0', PK = '#e8a0c0', PU = '#9a70c8';
    m.bone('body', 'root', [0, 1.15, 0]); m.bone('head', 'body', [0, 0.4, 0.15]); m.bone('jaw', 'head', [0, -0.03, 0.1]);
    m.bone('wingL', 'body', [0.12, 0.28, -0.05]); m.bone('wingR', 'body', [-0.12, 0.28, -0.05]); m.bone('tail', 'body', [0, -0.25, -0.05]);
    m.bone('armL', 'body', [0.14, 0.2, 0.08]); m.bone('armR', 'body', [-0.14, 0.2, 0.08]);
    m.bone('legFL', 'body', [0.1, -0.2, 0]); m.bone('legFR', 'body', [-0.1, -0.2, 0]);
    att(m, 'body', mb => { mb.loft([{ y: -0.25, rx: 0.1, rz: 0.09 }, { y: 0.05, rx: 0.14, rz: 0.12 }, { y: 0.3, rx: 0.12, rz: 0.1 }, { y: 0.42, rx: 0.06, rz: 0.06 }], { sides: 8, color: Y }); ell(mb, 0, 0.05, 0.08, 0.09, 0.2, 0.06, LI, 6, 4); });
    att(m, 'head', mb => {
      ell(mb, 0, 0.05, 0.02, 0.08, 0.08, 0.1, Y, 7, 4);
      hloft(mb, [{ z: 0.05, w: 0.06, h: 0.04, y: 0.04 }, { z: 0.2, w: 0.03, h: 0.02, y: 0.03 }], { sides: 6, color: Y });
      LR(s => { spike(mb, [s * 0.04, 0.1, -0.02], [s * 0.3, 1, -0.6], 0.16, 0.02, '#f0f0e0', 4); eye(mb, s * 0.05, 0.08, 0.08, 0.013, '#e02040'); });
    });
    att(m, 'jaw', mb => hloft(mb, [{ z: 0, w: 0.04, h: 0.015 }, { z: 0.1, w: 0.02, h: 0.01 }], { sides: 5, color: Y }));
    att(m, 'tail', mb => { const pts = bez3([0, 0, 0], [0, -0.3, -0.05], [0.1, -0.5, -0.3], [0.05, -0.6, -0.6], 7); sweep(mb, pts, taper(7, 0.06, 0.01), Y, 6); mb.blade(pts[7], [0, -0.2, -1], 0.15, 0.1, 0.02, '#f0e040'); });
    const wing = (s) => meshOf(mb => {
      const root = [0, 0, 0], p = [[s * 0.35, 0.5, -0.1], [s * 0.9, 0.55, -0.15], [s * 0.75, 0.15, -0.12], [s * 0.95, -0.15, -0.1], [s * 0.45, -0.1, -0.05]];
      tri2(mb, root, p[0], p[1], PK, sh(PK, -0.2)); tri2(mb, root, p[1], p[2], LI, sh(LI, -0.2)); tri2(mb, root, p[2], p[3], '#e8b080', sh(PK, -0.2)); tri2(mb, root, p[3], p[4], PU, sh(PU, -0.2));
      tube(mb, root, p[1], 0.02, 0.01, Y, 4);
    });
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    const arm = (s) => meshOf(mb => limb(mb, [[0, 0, 0], [s * 0.08, -0.1, 0.08], [s * 0.06, -0.2, 0.14]], [0.025, 0.02, 0.015], Y, 5));
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    const leg = (s) => meshOf(mb => { limb(mb, [[0, 0, 0], [s * 0.05, -0.15, 0.08], [s * 0.05, -0.32, 0.02]], [0.04, 0.03, 0.02], Y, 5); spike(mb, [s * 0.05, -0.32, 0.02], [0, -1, 0.3], 0.08, 0.02, PU, 3); });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 1.9; m.lungeScale = 1.2;
    return m;
  });
  def('castanets', (a) => crab(a, { shell: '#9a88d0', under: '#6a58a8', spike: '#b8a8e8', face: '#c0b0e0', eye: '#40e0ff', claw: '#e8e8f4', clawTip: '#ffffff', leg: '#8a78c0', size: 0.95 }));

  // ================================================================== Junon area
  // ---- Hell Rider VR2: grey armoured robot rider with a big hexagonal mace, mounted on a hulking red saurian that
  // stands on thick hind legs (torso pitched up, ochre belly, lavender back spikes, toothy maw with white tusks)
  def('hell_rider_vr2', (a) => {
    const m = rig(a);
    const R = '#a82830', RD = '#6a1420', Y = '#d8a830', PU = '#9a70d0', TK = '#e8e4d0', G = '#5a6068', GL = '#7a8088', D = '#2a2e34', UP = -0.7;
    m.bone('body', 'root', [0, 1.05, 0], [UP, 0, 0]);
    m.bone('head', 'body', [0, 0.08, 0.86], [-UP, 0, 0]); m.bone('jaw', 'head', [0, -0.06, 0.08]);
    m.bone('tail', 'body', [0, -0.08, -0.55], [-UP * 0.6, 0, 0]);
    m.bone('rider', 'body', [0, 0.42, -0.08], [-UP, 0, 0]);
    m.bone('armL', 'rider', [0.22, 0.56, 0.0]); m.bone('armR', 'rider', [-0.22, 0.56, 0.0]);
    m.bone('legFL', 'root', [0.36, 0.95, -0.28]); m.bone('legFR', 'root', [-0.36, 0.95, -0.28]);
    att(m, 'body', mb => {
      // barrel torso along +z (pitched up by the bone): rump -> belly -> chest -> thick neck
      hloft(mb, [{ z: -0.62, w: 0.26, h: 0.26 }, { z: -0.3, w: 0.42, h: 0.42 }, { z: 0.15, w: 0.46, h: 0.46 }, { z: 0.5, w: 0.34, h: 0.34, y: 0.02 }, { z: 0.78, w: 0.24, h: 0.24, y: 0.04 }], { sides: 8, color: R });
      // ochre belly and chest plate on the underside, lavender spikes down the back
      ell(mb, 0, -0.26, 0.12, 0.34, 0.24, 0.56, Y, 7, 4, (i, j) => j > 2 ? sh(Y, -0.2) : Y);
      for (let i = 0; i < 7; i++) spike(mb, [0, 0.4 - Math.abs(i - 3) * 0.02, -0.5 + i * 0.2], [0, 1, -0.4], 0.26 - Math.abs(i - 3) * 0.02, 0.06, PU, 3);
      LR(s => { for (let i = 0; i < 2; i++) spike(mb, [s * 0.36, 0.2, 0.34 + i * 0.2], [s, 0.6, -0.3], 0.17, 0.05, PU, 3); });
      // short forelimbs held in front of the chest
      LR(s => { sweep(mb, [[s * 0.34, -0.2, 0.5], [s * 0.4, -0.5, 0.52], [s * 0.34, -0.62, 0.76]], [0.13, 0.11, 0.08], R, 5); for (let i = -1; i <= 1; i++) spike(mb, [s * 0.34 + i * 0.05, -0.64, 0.82], [i * 0.3, -0.6, 1], 0.1, 0.025, PU, 3); });
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.1, -0.02, 0.26, 0.22, 0.26, R, 6, 4);
      hloft(mb, [{ z: 0.05, w: 0.26, h: 0.14, y: 0.08 }, { z: 0.3, w: 0.22, h: 0.1, y: 0.06 }, { z: 0.44, w: 0.14, h: 0.07, y: 0.04 }], { sides: 6, color: R });
      mb.box(0, 0.0, 0.22, 0.4, 0.1, 0.34, '#4a1830');                                              // maw
      teeth(mb, [-0.18, 0.03, 0.4], [0.18, 0.03, 0.4], 6, 0.09, [0, -1, 0.1], '#f0f0e0', 0.022);
      LR(s => {
        mb.sphere(s * 0.16, 0.2, 0.2, 0.035, 0.035, 0.02, '#f0e030', 5, 3, false);
        spike(mb, [s * 0.12, 0.26, -0.08], [s * 0.3, 1, -0.6], 0.24, 0.05, PU, 3);
        // big white tusks curving out and up from the jaw corners (teal band at the root)
        ball(mb, [s * 0.24, -0.02, 0.2], 0.06, '#3a8a7a', 5, 3);
        sweep(mb, bez3([s * 0.24, -0.02, 0.2], [s * 0.46, -0.08, 0.26], [s * 0.6, 0.06, 0.24], [s * 0.56, 0.28, 0.1], 4), taper(4, 0.065, 0.012), TK, 5);
      });
    });
    att(m, 'jaw', mb => { hloft(mb, [{ z: -0.02, w: 0.24, h: 0.07, y: -0.06 }, { z: 0.36, w: 0.16, h: 0.05, y: -0.07 }], { sides: 6, color: RD }); teeth(mb, [-0.14, -0.02, 0.32], [0.14, -0.02, 0.32], 5, 0.08, [0, 1, 0.1], '#f0f0e0', 0.02); });
    att(m, 'tail', mb => sweep(mb, bez3([0, 0, 0], [0, -0.1, -0.4], [0.1, -0.36, -0.72], [0.22, -0.34, -1.02], 6), taper(6, 0.24, 0.04), R, 6));
    m.onPose = (mm) => { mm.b('tail').rot[0] += clipK(mm, 'e_attack') * 0.8 + clipK(mm, 'e_hurt') * 0.3 + clipK(mm, 'e_cast') * 0.5; };   // the heavy tail stays off the floor
    // thick hind legs: thigh forward to the knee, shin back to the ankle, clawed foot
    const leg = (s) => meshOf(mb => {
      const kn = [s * 0.06, -0.42, 0.28], an = [s * 0.08, -0.82, -0.04];
      sweep(mb, [[0, 0.04, 0], kn, an], [0.26, 0.19, 0.13], [R, sh(R, -0.1)], 6);
      mb.box(an[0], an[1] - 0.06, an[2] + 0.12, 0.26, 0.12, 0.36, R);
      for (let i = -1; i <= 1; i++) spike(mb, [an[0] + i * 0.08, an[1] - 0.08, an[2] + 0.3], [i * 0.3, -0.3, 1], 0.14, 0.035, PU, 3);
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    // rider: bulky grey armour, straddling the back, horned helmet with green eyes
    att(m, 'rider', mb => {
      mb.loft([{ y: 0.0, rx: 0.17, rz: 0.14 }, { y: 0.2, rx: 0.15, rz: 0.12 }, { y: 0.42, rx: 0.22, rz: 0.15 }, { y: 0.58, rx: 0.24, rz: 0.15 }, { y: 0.66, rx: 0.1, rz: 0.08 }], { sides: 6, color: G });
      mb.loft([{ y: 0.2, rx: 0.165, rz: 0.13 }, { y: 0.28, rx: 0.165, rz: 0.13 }], { sides: 6, color: D, capTop: false, capBottom: false });
      mb.box(0, 0.42, 0.13, 0.26, 0.2, 0.06, GL);
      ell(mb, 0, 0.78, 0.0, 0.12, 0.13, 0.13, G, 6, 4);
      mb.box(0, 0.76, 0.1, 0.18, 0.1, 0.06, D); LR(s => { mb.sphere(s * 0.045, 0.78, 0.13, 0.02, 0.02, 0.012, '#40ff60', 4, 3, false); spike(mb, [s * 0.09, 0.86, -0.02], [s * 0.6, 1, -0.2], 0.16, 0.04, GL, 3); });
      // legs straddling the saurian's flanks
      LR(s => { sweep(mb, [[s * 0.1, 0.02, 0.0], [s * 0.34, -0.06, 0.2], [s * 0.4, -0.42, 0.12]], [0.08, 0.075, 0.06], G, 5); mb.box(s * 0.4, -0.48, 0.18, 0.1, 0.1, 0.2, D); });
    });
    const riderArm = (s, mace) => meshOf(mb => {
      ell(mb, 0, 0.02, 0, 0.1, 0.09, 0.1, GL, 6, 3);
      sweep(mb, [[0, 0, 0], [s * 0.1, -0.24, 0.08], [s * 0.08, -0.3, 0.32]], [0.06, 0.058, 0.05], G, 5);
      mb.box(s * 0.08, -0.3, 0.36, 0.1, 0.1, 0.1, D);
      if (mace) {   // chunky mace held upright: thick shaft, big hexagonal spiked head
        tube(mb, [s * 0.08, -0.62, 0.36], [s * 0.08, 0.72, 0.36], 0.035, 0.035, '#9a9aa4', 5);
        mb.prism(s * 0.08, 0.72, 0.36, 0.16, 0.16, 0.28, 6, '#c8c8d0'); mb.prism(s * 0.08, 0.72, 0.36, 0.18, 0.18, 0.05, 6, '#7a7a84');
        for (let i = 0; i < 6; i++) { const an = i / 6 * PI * 2; spike(mb, [s * 0.08 + C(an) * 0.15, 0.86, 0.36 + S(an) * 0.15], [C(an), 0.2, S(an)], 0.12, 0.035, '#e8e8f0', 3); }
        spike(mb, [s * 0.08, 1.0, 0.36], [0, 1, 0], 0.14, 0.04, '#e8e8f0', 3);
      }
    });
    m.attach('armR', riderArm(-1, true)); m.attach('armL', riderArm(1, false));
    m.height = 2.5; m.lungeScale = 1.1;
    return m;
  });

  // solid leaf / membrane from base along d with its face towards n: lens section through stations [dist, half-width]
  // (front face colour cf, back face cb) — for wings and fins that must read at battle distance
  function leaf(mb, base, d, n, st, th, cf, cb) {
    d = V.norm(d); const w = V.norm(V.cross(d, n)), nn = V.norm(V.cross(w, d));
    const ring = st.map(([t, hw], i) => { const c = V.add(base, V.scale(d, t)), tk = th * (i === 0 || i === st.length - 1 ? 0.4 : 1);
      return [V.add(c, V.scale(w, hw)), V.add(c, V.scale(nn, tk)), V.add(c, V.scale(w, -hw)), V.add(c, V.scale(nn, -tk))]; });
    for (let i = 0; i < ring.length - 1; i++) for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; mb.quad(ring[i][k2], ring[i][k], ring[i + 1][k], ring[i + 1][k2], k < 2 ? cf : cb); }
    return ring;
  }
  // ---- Zemzelett: stocky dark-green bird standing on thick grey legs — big grey-white chest, wedge head with swept
  // red horn blades and a red eye mask, club-like wings raised in a V (cream fronts, dark-blue edge spikes), and an
  // orange-to-red flame tail trailing on the ground
  def('zemzelett', (a) => {
    const m = rig(a);
    const G = '#4a7a30', W = '#d8dce0', R = '#d02030', CR = '#e8e8c8', YG = '#b8c050';
    m.bone('body', 'root', [0, 0.78, 0]); m.bone('head', 'body', [0, 0.6, 0.08]);
    m.bone('wingL', 'body', [0.3, 0.42, -0.04]); m.bone('wingR', 'body', [-0.3, 0.42, -0.04]); m.bone('tail', 'body', [0, -0.08, -0.22]);
    m.bone('legFL', 'body', [0.16, -0.18, 0]); m.bone('legFR', 'body', [-0.16, -0.18, 0]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.24, rx: 0.28, rz: 0.24 }, { y: 0.12, rx: 0.36, rz: 0.28 }, { y: 0.44, rx: 0.33, rz: 0.26 }, { y: 0.6, rx: 0.16, rz: 0.14 }], { sides: 8, color: G });
      ell(mb, 0, 0.08, 0.16, 0.28, 0.38, 0.14, W, 8, 5, (i, j) => j > 3 ? sh(W, -0.15) : W);
    });
    att(m, 'head', mb => {
      hloft(mb, [{ z: -0.12, w: 0.12, h: 0.12, y: 0.06 }, { z: 0.02, w: 0.17, h: 0.14, y: 0.06 }, { z: 0.14, w: 0.12, h: 0.1, y: 0.04 }, { z: 0.22, w: 0.05, h: 0.05, y: 0.02 }], { sides: 6, color: G, smooth: false });
      mb.rbox(0, 0.08, 0.13, 0.26, 0.05, 0.06, R, 0.3);                                       // red eye mask
      LR(s => {
        eye(mb, s * 0.07, 0.08, 0.17, 0.02, '#f0f040');
        leaf(mb, [s * 0.08, 0.14, 0.02], [s * 0.9, 0.75, -0.5], [0, 0.3, 1], [[0, 0.03], [0.12, 0.08], [0.3, 0.07], [0.44, 0.0]], 0.02, R, sh(R, -0.2));   // swept horn blades
      });
      spike(mb, [0, 0.02, 0.2], [0, -0.7, 1], 0.1, 0.035, '#e06030', 4);
    });
    // club-like wings raised in a V: solid cream membranes with a yellow-green back and edge, dark-blue edge spikes
    const wing = (s) => meshOf(mb => {
      const d = [s * 0.72, 0.8, -0.1];
      sweep(mb, [[0, 0, 0], [s * 0.14, 0.2, -0.02]], [0.1, 0.09], G, 7);
      const r = leaf(mb, [s * 0.1, 0.1, 0], d, [0, 0.1, 1], [[0, 0.07], [0.22, 0.15], [0.55, 0.24], [0.85, 0.26], [1.05, 0.2], [1.18, 0.04]], 0.06, CR, YG);
      for (let i = 1; i < r.length - 1; i++) spike(mb, r[i][s > 0 ? 0 : 2], V.norm([s, 0.3, 0]), 0.14, 0.04, '#303890', 3);
      sweep(mb, r.map(q => q[s > 0 ? 0 : 2]), 0.025, YG, 4, null, false);
    });
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    // flame tail lying on the ground, split into three tongues
    att(m, 'tail', mb => {
      const pts = bez3([0, 0, 0], [0, -0.3, -0.3], [0.2, -0.62, -0.6], [0.4, -0.7, -1.0], 7);
      sweep(mb, pts, taper(7, 0.1, 0.05), '#f09030', 6, (i) => i > 4 ? '#e05020' : '#f09030');
      for (let i = -1; i <= 1; i++) mb.blade(pts[7], [0.3 + i * 0.5, 0.05, -1], 0.36 - Math.abs(i) * 0.1, 0.12, 0.03, '#d03020', [0, 1, 0], '#f07030');
    });
    const leg = (s) => meshOf(mb => { ell(mb, 0, -0.26, 0.02, 0.14, 0.26, 0.14, '#c0c4cc', 7, 4); mb.rbox(0, -0.54, 0.06, 0.16, 0.06, 0.2, '#a8acb4', 0.3); for (let i = -1; i <= 1; i++) spike(mb, [i * 0.05, -0.56, 0.14], [i * 0.3, -0.3, 1], 0.08, 0.025, '#f0f0f0', 3); });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.onPose = (mm) => { mm.b('tail').rot[0] += clipK(mm, 'e_attack') * 0.8; };   // the tail lies on the ground
    m.height = 2.1; m.lungeScale = 1;
    return m;
  });

  // ---- Nerosuferoth: angular yellow-olive bird-dino — hunched faceted body with a grey chest plate, hooked
  //      beak, red wattle, tall green crest horn, green wings spread back, red-orange clawed arms and legs,
  //      long pointed tail
  def('nerosuferoth', (a) => {
    const m = rig(a);
    const Y = '#c09a30', YD = '#8a6a20', G = '#50a050', R = '#d84828', PU = '#8060d0';
    m.bone('body', 'root', [0, 0.7, 0]); m.bone('head', 'body', [0, 0.46, 0.22]); m.bone('tail', 'body', [0, -0.04, -0.16]);
    m.bone('wingL', 'body', [0.12, 0.3, -0.06]); m.bone('wingR', 'body', [-0.12, 0.3, -0.06]);
    m.bone('armL', 'body', [0.13, 0.28, 0.1]); m.bone('armR', 'body', [-0.13, 0.28, 0.1]);
    m.bone('legFL', 'body', [0.1, -0.08, 0]); m.bone('legFR', 'body', [-0.1, -0.08, 0]);
    att(m, 'body', mb => {
      mb.push(); mb.rotate(0.4, 0, 0);
      mb.loft([{ y: -0.14, rx: 0.12, rz: 0.12 }, { y: 0.1, rx: 0.16, rz: 0.15 }, { y: 0.32, rx: 0.12, rz: 0.11 }, { y: 0.46, rx: 0.07, rz: 0.07 }], { sides: 5, color: Y, smooth: false });
      mb.frustum(0, -0.06, 0.1, 0.14, 0.06, 0.1, 0.05, 0.34, '#8a8a92');
      mb.pop();
    });
    att(m, 'head', mb => {
      hloft(mb, [{ z: -0.08, w: 0.07, h: 0.07, y: 0.02 }, { z: 0.04, w: 0.075, h: 0.075, y: 0.03 }, { z: 0.1, w: 0.05, h: 0.05, y: 0.01 }], { sides: 5, color: Y, smooth: false });
      // hooked beak, red wattle, blue eyes, tall green crest horn
      sweep(mb, bez([0, 0.02, 0.08], [0, 0.03, 0.2], [0, -0.07, 0.24], 3), [[0.035, 0.03], [0.025, 0.022], [0.012, 0.01], [0.002, 0.002]], '#e0b830', 4);
      spike(mb, [0, -0.04, 0.06], [0, -1, 0.3], 0.1, 0.03, R, 4);
      LR(s => eye(mb, s * 0.05, 0.05, 0.06, 0.016, '#40a8f0'));
      mb.blade([0, 0.07, -0.02], [0, 1, -0.45], 0.32, 0.08, 0.03, G, [1, 0, 0], '#a0e060');
    });
    // green wings spread back and out (~0.5 m)
    const wing = (s) => meshOf(mb => {
      const tip = (i) => [s * (0.3 + i * 0.05), 0.3 - i * 0.16, -0.36 - i * 0.04];
      for (let i = 0; i < 3; i++) tri2(mb, [0, 0, 0], tip(i), tip(i + 1), i % 2 ? G : sh(G, 0.12), sh(G, -0.2));
      for (let i = 0; i < 4; i++) mb.blade([0, 0, 0], tip(i), V.len(tip(i)) * 1.1, 0.05, 0.03, sh(G, -0.15), null, '#90d070');
    });
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    const arm = (s) => meshOf(mb => { limb(mb, [[0, 0, 0], [s * 0.06, -0.12, 0.06], [s * 0.05, -0.22, 0.14]], [0.035, 0.03, 0.025], R, 5); for (let i = -1; i <= 1; i++) spike(mb, [s * 0.05, -0.22, 0.14], [i * 0.3, -0.8, 0.6], 0.07, 0.014, PU, 3); });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    att(m, 'tail', mb => { const pts = bez([0, 0, 0], [0, -0.1, -0.35], [0, -0.02, -0.75], 5); sweep(mb, pts, taper(5, 0.08, 0.004), null, 4, (i) => i % 2 ? Y : YD); });
    // digitigrade legs: yellow thigh, red-orange shin, clawed orange feet
    const leg = (s) => meshOf(mb => {
      const kn = [s * 0.05, -0.22, 0.1], an = [s * 0.05, -0.44, -0.06];
      limb(mb, [[0, 0, 0], kn], [0.06, 0.045], Y, 5);
      limb(mb, [kn, an, [s * 0.05, -0.6, 0.0]], [0.045, 0.035, 0.03], R, 5);
      for (let i = -1; i <= 1; i++) { obox(mb, [s * 0.05, -0.6, 0.0], [s * 0.05 + i * 0.05, -0.61, 0.12], 0.035, 0.025, 0.025, 0.02, R); spike(mb, [s * 0.05 + i * 0.05, -0.61, 0.12], [i * 0.3, -0.3, 1], 0.05, 0.012, PU, 3); }
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.onPose = (mm) => { const Bn = mm.bones; if (Bn.body) ['legFL', 'legFR'].forEach(n => { if (Bn[n]) Bn[n].rot[0] -= Bn.body.rot[0]; }); };
    m.height = 1.5; m.scale = 0.9; m.lungeScale = 1.2;
    return m;
  });

  // ---- Formula: great purple bird with huge pink-lilac wings
  def('formula', (a) => {
    const m = rig(a); m.floats = true;
    const PU = '#6a2ab0', PK = '#e080c8', LI = '#b8a0f0', Y = '#e8c040';
    m.bone('body', 'root', [0, 1.1, 0]); m.bone('head', 'body', [0, 0.1, 0.42]); m.bone('tail', 'body', [0, 0, -0.35]);
    m.bone('wingL', 'body', [0.18, 0.12, 0]); m.bone('wingR', 'body', [-0.18, 0.12, 0]);
    m.bone('legFL', 'body', [0.1, -0.2, 0.1]); m.bone('legFR', 'body', [-0.1, -0.2, 0.1]);
    att(m, 'body', mb => hloft(mb, [{ z: -0.4, w: 0.1, h: 0.1 }, { z: -0.1, w: 0.22, h: 0.24 }, { z: 0.2, w: 0.24, h: 0.26, y: 0.02 }, { z: 0.42, w: 0.12, h: 0.12, y: 0.08 }], { sides: 8, color: PU }));
    att(m, 'head', mb => { ell(mb, 0, 0.05, 0.02, 0.1, 0.1, 0.12, '#a02070', 7, 4); hloft(mb, [{ z: 0.08, w: 0.05, h: 0.04, y: 0.03 }, { z: 0.26, w: 0.01, h: 0.01, y: -0.03 }], { sides: 5, color: '#f0b040' }); LR(s => eye(mb, s * 0.06, 0.08, 0.08, 0.015, '#f0e040')); });
    att(m, 'tail', mb => { for (let i = 0; i < 5; i++) mb.blade([0, 0, 0], [(i - 2) * 0.3, 0.05, -1], 0.5, 0.12, 0.02, i % 2 ? PK : LI); });
    const wing = (s) => meshOf(mb => {
      const p = [[s * 0.5, 0.35, 0.1], [s * 1.2, 0.55, -0.05], [s * 1.7, 0.45, -0.25], [s * 1.1, 0.1, -0.3], [s * 0.4, -0.05, -0.25]];
      tube(mb, [0, 0, 0], p[0], 0.08, 0.05, PU, 6); tube(mb, p[0], p[2], 0.05, 0.02, PK, 5);
      tri2(mb, [0, 0, 0], p[0], p[4], PK, sh(PK, -0.2)); tri2(mb, p[0], p[1], p[4], LI, sh(LI, -0.2)); tri2(mb, p[1], p[3], p[4], PK, sh(PK, -0.2)); tri2(mb, p[1], p[2], p[3], '#f0c0e8', sh(PK, -0.2));
    });
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    const leg = (s) => meshOf(mb => { limb(mb, [[0, 0, 0], [s * 0.03, -0.15, 0.05], [s * 0.03, -0.3, 0.1]], [0.04, 0.03, 0.025], Y, 5); for (let i = -1; i <= 1; i++) spike(mb, [s * 0.03, -0.3, 0.1], [i * 0.4, -0.6, 1], 0.1, 0.015, '#f0f0e0', 3); });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 1.8; m.lungeScale = 1.2;
    return m;
  });

  // ---- Capparwire: angular orange-brown head on knobbly bent legs, wide white-toothed grin, purple eyes, and two big
  // thorny vine antlers arching up and out from the crown (olive-brown to green, purple thorns)
  def('capparwire', (a) => {
    const m = rig(a);
    const TN = '#b06a30', D = '#7a4a20', OL = '#8a7a30', G = '#60c040', PU = '#8040c0';
    m.bone('body', 'root', [0, 0.55, 0]); m.bone('head', 'body', [0, 0.2, 0.02]); m.bone('jaw', 'head', [0, 0.02, 0.12]);
    m.bone('armL', 'head', [0.17, 0.41, -0.05]); m.bone('armR', 'head', [-0.17, 0.41, -0.05]);
    m.bone('legFL', 'body', [0.1, -0.04, 0]); m.bone('legFR', 'body', [-0.1, -0.04, 0]);
    att(m, 'body', mb => mb.loft([{ y: -0.1, rx: 0.12, rz: 0.1 }, { y: 0.1, rx: 0.09, rz: 0.08 }, { y: 0.24, rx: 0.12, rz: 0.1 }], { sides: 6, color: D }));
    att(m, 'head', mb => {
      mb.push(); mb.scale(1.22, 1.22, 1.22);
      // faceted head: broad cheeks, pointed brow ridge, wide grin
      mb.loft([{ y: 0.0, rx: 0.14, rz: 0.12 }, { y: 0.1, rx: 0.3, rz: 0.22, rzf: 0.28 }, { y: 0.22, rx: 0.3, rz: 0.22, rzf: 0.26 }, { y: 0.34, rx: 0.2, rz: 0.18, rzf: 0.22 }, { y: 0.42, rx: 0.08, rz: 0.08 }], { sides: 8, color: TN, smooth: false, colors: (i) => i === 1 || i === 2 ? sh(TN, 0.12) : null });
      mb.blade([0, 0.34, 0.16], [0, 0.4, 1], 0.14, 0.2, 0.05, sh(TN, 0.18), [1, 0, 0]);
      LR(s => { eye(mb, s * 0.11, 0.26, 0.21, 0.045, '#a030b0'); mb.blade([s * 0.1, 0.3, 0.19], [s * 0.4, 0.3, 1], 0.08, 0.1, 0.03, sh(TN, -0.2)); });
      mb.rbox(0, 0.12, 0.24, 0.3, 0.07, 0.06, '#f0f0f0', 0.3);                                      // tooth band
      mb.rbox(0, 0.09, 0.23, 0.27, 0.02, 0.06, '#3a1a10', 0.2);
      mb.pop();
    });
    att(m, 'jaw', mb => { hloft(mb, [{ z: -0.06, w: 0.26, h: 0.05, y: 0.02 }, { z: 0.12, w: 0.2, h: 0.04, y: 0.02 }], { sides: 6, color: TN }); mb.rbox(0, 0.05, 0.13, 0.3, 0.045, 0.05, '#e8e8e8', 0.3); });
    // thorny vine antlers: thick, rising then arching out, thorns along the top
    const antler = (s) => meshOf(mb => {
      const pts = bez3([0, 0, 0], [s * 0.08, 0.42, -0.02], [s * 0.5, 0.62, 0.0], [s * 0.95, 0.66, 0.04], 10);
      pts.push([s * 1.08, 0.8, 0.05]);
      const cols = (i) => i < 4 ? OL : i < 8 ? mix(OL, G, (i - 3) / 5) : G;
      sweep(mb, pts, taper(11, 0.065, 0.016), OL, 6, (i) => cols(i));
      for (let i = 1; i < 11; i++) { const dn = V.norm(V.sub(pts[i + 1] || pts[i], pts[i - 1])); spike(mb, pts[i], V.norm(V.add([0, 1, 0], V.scale(dn, 0.4))), 0.17 - i * 0.006, 0.042, i % 2 ? PU : cols(i), 3); }
      for (let i = 2; i < 10; i += 3) spike(mb, pts[i], [s * 0.2, -0.6, 0.6], 0.09, 0.022, cols(i), 3);
    });
    m.attach('armL', antler(1)); m.attach('armR', antler(-1));
    // knobbly bent legs with thorn knobs and splayed toes
    const leg = (s) => meshOf(mb => {
      const kn = [s * 0.14, -0.24, 0.1], an = [s * 0.12, -0.5, -0.02];
      limb(mb, [[0, 0, 0], kn, an], [0.06, 0.05, 0.04], [TN, D], 6);
      LR(t => spike(mb, lerp3(kn, an, 0.3 + (t + 1) * 0.2), [s * 0.8, 0.2 * t, 0.4], 0.07, 0.025, D, 3));
      for (let i = -1; i <= 1; i++) spike(mb, [an[0], -0.52, an[2] + 0.02], [i * 0.6, -0.1, 1], 0.13, 0.025, TN, 3);
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 1.9; m.lungeScale = 1;
    return m;
  });

  // ---- Mystery Ninja (Yuffie): her big four-bladed shuriken held at her side, flat face to the front
  def('mystery_ninja', () => {
    const m = human('mystery_ninja', { base: 'yuffie' }, { scale: 1.6, attack: 'slash' });
    const wm = meshOf(mb => {
      const n = V.norm([0.3, 0.05, 1]), u = V.norm(V.cross([0, 1, 0], n)), v = V.cross(n, u), c = [0.02, 0.0, 0.02];
      mb.push(); along(mb, V.sub(c, V.scale(n, 0.012)), n); mb.prism(0, 0, 0, 0.055, 0.055, 0.024, 10, '#5a5e68'); mb.prism(0, 0.024, 0, 0.03, 0.03, 0.006, 8, '#c8a040'); mb.pop();
      for (let i = 0; i < 4; i++) {
        const an = i * PI / 2 + PI / 4, d = V.add(V.scale(u, C(an)), V.scale(v, S(an))), sw = V.add(V.scale(u, C(an + 0.5)), V.scale(v, S(an + 0.5)));
        leaf(mb, V.add(c, V.scale(d, 0.04)), V.add(d, V.scale(sw, 0.25)), n, [[0, 0.045], [0.06, 0.062], [0.14, 0.045], [0.22, 0.016], [0.26, 0.0]], 0.009, '#d8dce4', '#a8acb8');
      }
    });
    const LM = uprightLM(m, new Float32Array(16));
    m.weaponMesh = wm;
    m.showWeapon = (on) => { m.bones.weapon.meshes = on ? [{ mesh: wm, m: LM, opts: TWO_SIDED }] : []; };
    m.showWeapon(true);
    return m;
  });

  // ---- CMD. Grand Horn (Fort Condor commander): hulking crimson ogre hunched forward, small horned head sunk
  // between huge finned shoulders, lavender chest plates, gold loincloth, knuckle-dragging arms with massive
  // forearms and long white claws, short bent legs
  function grandHorn(look, P) {
    const m = rig(look);
    const R = P.c1, R2 = P.c2, SK = P.skin, W = '#ece4ee', HN = '#e0d4b4', Y = '#c89a30', k = P.size || 1;
    m.bone('body', 'root', [0, 1.12 * k, 0], [0.42, 0, 0]);
    m.bone('head', 'body', [0, 0.6 * k, 0.4 * k], [-0.3, 0, 0]); m.bone('jaw', 'head', [0, -0.02 * k, 0.1 * k]);
    m.bone('armL', 'body', [0.66 * k, 0.5 * k, 0.06 * k], [-0.42, 0, 0.08]); m.bone('armR', 'body', [-0.66 * k, 0.5 * k, 0.06 * k], [-0.42, 0, -0.08]);
    m.bone('legFL', 'root', [0.3 * k, 1.0 * k, -0.12 * k]); m.bone('legFR', 'root', [-0.3 * k, 1.0 * k, -0.12 * k]);
    att(m, 'body', mb => {
      // barrel torso widening into the shoulder yoke, hump on the back
      mb.loft([{ y: -0.32 * k, rx: 0.34 * k, rz: 0.3 * k }, { y: 0.0, rx: 0.44 * k, rz: 0.36 * k }, { y: 0.3 * k, rx: 0.58 * k, rz: 0.42 * k },
        { y: 0.56 * k, rx: 0.7 * k, rz: 0.44 * k }, { y: 0.74 * k, rx: 0.46 * k, rz: 0.34 * k }, { y: 0.84 * k, rx: 0.16 * k, rz: 0.16 * k }], { sides: 10, color: R });
      ell(mb, 0, 0.58 * k, -0.22 * k, 0.46 * k, 0.34 * k, 0.3 * k, R2, 8, 5);
      // lavender pectoral plates and belly plate
      LR(s => ell(mb, s * 0.22 * k, 0.36 * k, 0.3 * k, 0.27 * k, 0.26 * k, 0.17 * k, SK, 8, 5, (i, j) => j < 2 ? sh(SK, 0.12) : SK));
      ell(mb, 0, 0.02, 0.3 * k, 0.24 * k, 0.2 * k, 0.12 * k, sh(SK, -0.12), 7, 4);
      // huge shoulder masses with red fins and white spikes
      LR(s => {
        ell(mb, s * 0.6 * k, 0.56 * k, 0.02, 0.34 * k, 0.32 * k, 0.34 * k, R, 9, 5, (i, j) => j < 2 ? sh(R, 0.12) : R);
        mb.blade([s * 0.62 * k, 0.8 * k, -0.06 * k], [s * 0.35, 1, -0.3], 0.52 * k, 0.4 * k, 0.12 * k, R2, null, R);
        mb.blade([s * 0.36 * k, 0.78 * k, -0.18 * k], [s * 0.2, 1, -0.5], 0.36 * k, 0.28 * k, 0.1 * k, R2, null, R);
        for (let i = 0; i < 3; i++) spike(mb, [s * (0.78 + i * 0.04) * k, (0.42 + i * 0.12) * k, (0.2 - i * 0.14) * k], [s, 0.2, 0.4 - i * 0.3], 0.26 * k, 0.06 * k, W, 3);
      });
      // gold loincloth flaps
      for (let i = 0; i < 5; i++) { const an = PI * (0.25 + i * 0.125); mb.blade([C(an) * 0.3 * k, -0.24 * k, S(an) * 0.28 * k], [C(an) * 0.4, -1, S(an) * 0.6], 0.42 * k, 0.2 * k, 0.05 * k, Y, null, sh(Y, -0.2)); }
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.06 * k, 0, 0.17 * k, 0.16 * k, 0.18 * k, R, 8, 5);
      hloft(mb, [{ z: 0.02, w: 0.15 * k, h: 0.1 * k, y: 0.08 * k }, { z: 0.16 * k, w: 0.12 * k, h: 0.08 * k, y: 0.07 * k }, { z: 0.24 * k, w: 0.07 * k, h: 0.05 * k, y: 0.05 * k }], { sides: 8, color: R });
      mb.blade([0, 0.2 * k, 0.1 * k], [0, 0.3, 1], 0.16 * k, 0.24 * k, 0.05 * k, R2, [1, 0, 0]);   // brow ridge
      LR(s => {
        eye(mb, s * 0.07 * k, 0.12 * k, 0.17 * k, 0.025 * k, '#80f0e0');
        sweep(mb, bez3([s * 0.1 * k, 0.16 * k, -0.02], [s * 0.34 * k, 0.24 * k, -0.02], [s * 0.42 * k, 0.46 * k, 0.02], [s * 0.36 * k, 0.66 * k, -0.08 * k], 6), taper(6, 0.075 * k, 0.012 * k), HN, 6);
      });
      if (P.crest) sweep(mb, bez([0, 0.2 * k, 0.04 * k], [0, 0.42 * k, 0.06 * k], [0, 0.5 * k, -0.1 * k], 4), taper(4, 0.055 * k, 0.01 * k), HN, 6);
      mb.rbox(0, 0.0, 0.16 * k, 0.16 * k, 0.07 * k, 0.12 * k, '#c02878', 0.3);   // open mouth
      teeth(mb, [-0.09 * k, 0.03 * k, 0.24 * k], [0.09 * k, 0.03 * k, 0.24 * k], 5, 0.05 * k, [0, -1, 0.2], '#f0ece0', 0.015 * k);
    });
    att(m, 'jaw', mb => { hloft(mb, [{ z: -0.04 * k, w: 0.14 * k, h: 0.05 * k, y: -0.04 * k }, { z: 0.14 * k, w: 0.11 * k, h: 0.04 * k, y: -0.05 * k }], { sides: 8, color: R2 });
      teeth(mb, [-0.08 * k, -0.01, 0.12 * k], [0.08 * k, -0.01, 0.12 * k], 4, 0.045 * k, [0, 1, 0.2], '#f0ece0', 0.014 * k); });
    // arms: thick upper arm, huge forearm with spikes, big hand with four long curved claws near the ground
    const arm = (s) => meshOf(mb => {
      const el = [s * 0.1 * k, -0.46 * k, 0.04 * k], wr = [s * 0.12 * k, -0.96 * k, 0.2 * k];
      limb(mb, [[0, 0, 0], el], [0.2 * k, 0.17 * k], R, 8);
      sweep(mb, [el, lerp3(el, wr, 0.45), wr], [0.18 * k, 0.26 * k, 0.24 * k], R2, 8, (i, q) => q < 3 ? sh(R2, 0.15) : R2);
      ball(mb, el, 0.18 * k, R);
      for (let i = 0; i < 4; i++) spike(mb, lerp3(el, wr, 0.2 + i * 0.2).map((v, q) => v + (q === 0 ? s * 0.2 * k : 0)), [s, -0.1, -0.2 + i * 0.1], 0.2 * k, 0.05 * k, W, 3);
      ell(mb, wr[0], wr[1] - 0.1 * k, wr[2] + 0.06 * k, 0.24 * k, 0.16 * k, 0.24 * k, R2, 8, 5);
      for (let i = 0; i < 4; i++) { const x = wr[0] + (i - 1.5) * 0.11 * k; mb.lock([x, wr[1] - 0.14 * k, wr[2] + 0.2 * k], [(i - 1.5) * 0.15, -0.2, 1], [(i - 1.5) * 0.1, -1, 0.35], 0.46 * k, 0.12 * k, 0.09 * k, W, null, '#c8b8d0'); }
      mb.lock([wr[0] - s * 0.2 * k, wr[1] - 0.06 * k, wr[2] + 0.06 * k], [-s, -0.3, 0.6], [-s * 0.3, -1, 0.5], 0.3 * k, 0.08 * k, 0.06 * k, W);   // thumb claw
    });
    m.attach('armL', arm(1)); m.attach('armR', arm(-1));
    // short bent legs, clawed feet
    const leg = (s) => meshOf(mb => {
      const kn = [s * 0.08 * k, -0.46 * k, 0.26 * k], an = [s * 0.1 * k, -0.9 * k, 0.02 * k];
      limb(mb, [[0, 0, 0], kn, an], [0.26 * k, 0.21 * k, 0.17 * k], [R, R2], 8);
      for (let i = 0; i < 2; i++) spike(mb, lerp3(kn, an, 0.3 + i * 0.35).map((v, q) => v + (q === 0 ? s * 0.18 * k : 0)), [s, 0, 0.3], 0.16 * k, 0.045 * k, W, 3);
      mb.rbox(an[0], an[1] - 0.04 * k, an[2] + 0.1 * k, 0.3 * k, 0.12 * k, 0.36 * k, R2, 0.35);
      for (let i = -1; i <= 1; i++) mb.lock([an[0] + i * 0.1 * k, an[1] - 0.04 * k, an[2] + 0.26 * k], [i * 0.2, 0, 1], [i * 0.2, -0.8, 0.6], 0.22 * k, 0.08 * k, 0.06 * k, W);
    });
    m.attach('legFL', leg(1)); m.attach('legFR', leg(-1));
    m.height = 2.35 * k; m.lungeScale = 0.9;
    return m;
  }
  // one crimson palette for all three commanders (FF7 reuses the model)
  const CMD_HORN = { c1: '#9a2428', c2: '#6a1818', skin: '#b8a0cc' };
  def('cmdgrand_horn', (a) => grandHorn(a, CMD_HORN));
  def('cmdgrand_horn_b', (a) => grandHorn(a, Object.assign({ size: 1.05 }, CMD_HORN)));
  // Disc 2 (Fort Condor): FF7 reuses the CMD.Grand Horn model; this one is a little bigger with a centre horn
  def('cmd_grand_horn_3', (a) => grandHorn(a, Object.assign({ size: 1.15, crest: true }, CMD_HORN)));

  // ================================================================== Junon beach: Bottomswell
  // ---- Bottomswell: serpentine teal-green flying sea-dragon — segmented body rising to a pink-crested dragon
  //      head with long white/pink blade fins, 4 long thin pale-blue legs dangling, swept teal back fins and a
  //      long flat dark-blue tail fin with light-blue diamonds, bone spikes and a red end frill
  def('bottomswell', (a) => {
    const m = rig(a); m.floats = true;
    const T1 = '#1a6a70', T2 = '#2a8a70', PK = '#d04080', GF = '#3a9a70', NV = '#1e2a60', LB = '#8aa0c8', W = '#eef0f6', BONE = '#f0e0d0';
    m.bone('body', 'root', [0, 2.6, 0]);
    m.bone('head', 'body', [0, 0.72, 1.1]); m.bone('jaw', 'head', [0, -0.11, 0.14]);
    m.bone('tail', 'body', [-0.12, -0.08, -1.0]);
    m.bone('wingL', 'body', [0.2, 0.36, 0.2]); m.bone('wingR', 'body', [-0.2, 0.36, 0.2]);
    m.bone('armL', 'body', [0.26, -0.3, 0.35]); m.bone('armR', 'body', [-0.26, -0.3, 0.35]);
    m.bone('legBL', 'body', [0.24, -0.28, -0.3]); m.bone('legBR', 'body', [-0.24, -0.28, -0.3]);
    att(m, 'body', mb => {
      // segmented body: tail root -> shoulders -> neck rising to the head
      const pts = bez3([-0.12, -0.08, -1.1], [-0.12, -0.12, -0.1], [0, 0.0, 0.65], [0, 0.72, 1.1], 9);
      const rs = [0.27, 0.38, 0.45, 0.47, 0.44, 0.38, 0.32, 0.28, 0.25, 0.22];
      sweep(mb, pts, rs.map(r => [r, r * 0.92]), null, 7, (i, k) => (i % 2 ? T2 : T1));
      // angular armour plates down the back and flanks (lighter teal-green)
      for (let i = 1; i < 9; i++) {
        const p = pts[i], d = V.norm(V.sub(pts[i + 1], pts[i - 1]));
        mb.blade(V.add(p, [0, rs[i] * 0.8, 0]), V.add([0, 0.9, 0], V.scale(d, -1.2)), 0.3 + rs[i] * 0.4, 0.26, 0.05, sh(T2, 0.12), [1, 0, 0], T1);
        if (i < 7) LR(s => mb.blade(V.add(p, [s * rs[i] * 0.8, 0.02, 0]), V.add([s * 0.7, 0.2, 0], V.scale(d, -1)), 0.24 + rs[i] * 0.3, 0.2, 0.04, T2, null, sh(T1, -0.2)));
      }
      // pale underbelly plates
      for (let i = 2; i < 8; i++) ell(mb, pts[i][0], pts[i][1] - rs[i] * 0.75, pts[i][2], rs[i] * 0.6, 0.06, 0.13, '#5aa8a0', 6, 3);
    });
    att(m, 'head', mb => {
      mb.push(); mb.scale(1.4);
      // dragon skull: magenta crest on top, green face and a long snout
      const top = (i, n) => S(PI / n * 2 + i / n * PI * 2) < -0.3 ? PK : null; // loft sides facing up
      hloft(mb, [{ z: -0.16, w: 0.15, h: 0.15, y: 0.02, colors: top }, { z: 0.04, w: 0.19, h: 0.17, y: 0.04, colors: top }, { z: 0.26, w: 0.15, h: 0.12, y: 0.0, colors: top }, { z: 0.48, w: 0.1, h: 0.08, y: -0.04 }, { z: 0.62, w: 0.06, h: 0.05, y: -0.06 }],
        { sides: 8, color: GF });
      hloft(mb, [{ z: -0.1, w: 0.12, h: 0.06, y: 0.16 }, { z: 0.14, w: 0.15, h: 0.07, y: 0.17 }, { z: 0.42, w: 0.07, h: 0.04, y: 0.05 }], { sides: 6, color: PK });
      LR(s => {
        eye(mb, s * 0.14, 0.08, 0.14, 0.045, '#d8f030');
        // cheek plates (green) and the long white/pink blade fins sweeping back
        mb.blade([s * 0.16, 0.0, 0.1], [s * 0.6, -0.2, -1], 0.34, 0.14, 0.04, GF, null, T1);
        for (let i = 0; i < 3; i++) mb.blade([s * 0.13, 0.1 + i * 0.04, 0.06 - i * 0.08], [s * (0.75 - i * 0.14), -0.08 + i * 0.2, -1], 1.2 - i * 0.12, 0.14, 0.04, W, [0, 1, 0.2], i === 1 ? '#f0a0c8' : '#e05090');
        // red frill fanning behind the head
        for (let i = 0; i < 3; i++) mb.blade([s * 0.1, 0.02 - i * 0.07, -0.12], [s * (0.5 + i * 0.25), 0.5 - i * 0.5, -0.6], 0.36, 0.14, 0.03, '#c02838', null, '#f06080');
      });
      // crest horns
      for (let i = 0; i < 3; i++) mb.blade([0, 0.22, 0.12 - i * 0.12], [0, 1, -0.5 - i * 0.3], 0.34 - i * 0.05, 0.12, 0.04, PK, [1, 0, 0], '#f0b0d0');
      teeth(mb, [-0.08, -0.05, 0.5], [0.08, -0.05, 0.5], 4, 0.06, [0, -1, 0.2], '#f8f8f0', 0.018);
      mb.pop();
    });
    att(m, 'jaw', mb => {
      mb.push(); mb.scale(1.4);
      hloft(mb, [{ z: -0.08, w: 0.13, h: 0.05 }, { z: 0.2, w: 0.08, h: 0.035, y: -0.02 }, { z: 0.4, w: 0.04, h: 0.025, y: -0.03 }], { sides: 6, color: '#c05070' });
      teeth(mb, [-0.06, 0.01, 0.3], [0.06, 0.01, 0.3], 3, 0.05, [0, 1, 0.2], '#f8f8f0', 0.015);
      mb.pop();
    });
    // long flat dark-blue tail fin: light-blue diamonds on both sides, bone spikes on top, red end frill
    att(m, 'tail', mb => {
      const pts = bez3([0, 0, 0], [0.2, -0.45, -0.75], [0.85, -0.75, -1.35], [1.35, -0.4, -1.9], 10);
      const hs = taper(10, 0.36, 0.16);
      sweep(mb, pts, hs.map(h => [0.09, h]), NV, 6);
      for (let i = 1; i < 10; i++) {
        const p = pts[i], h = hs[i];
        const d = V.norm(V.sub(pts[i + 1], pts[i - 1])), bn = V.norm(V.cross(d, [0, 1, 0]));
        const dia = (e, r, col, nrm) => { const A = V.add(e, [0, r, 0]), B2 = V.add(e, V.scale(d, r)), Cc = V.add(e, [0, -r, 0]), D2 = V.sub(e, V.scale(d, r)); if (V.dot(V.cross(V.sub(B2, A), V.sub(Cc, A)), nrm) >= 0) mb.quad(A, B2, Cc, D2, col); else mb.quad(D2, Cc, B2, A, col); };
        LR(s => { const nrm = V.scale(bn, s); dia(V.add(p, V.scale(nrm, 0.095)), h * 0.44, '#8ac0f0', nrm); dia(V.add(p, V.scale(nrm, 0.1)), h * 0.24, NV, nrm); });
        spike(mb, V.add(p, [0, h * 0.9, 0]), [0, 1, -0.35], 0.3 - i * 0.012, 0.045, BONE, 3);
      }
      const t = pts[10];
      for (let i = 0; i < 5; i++) mb.blade(t, [0, 0.9 - i * 0.45, -1], 0.5 - Math.abs(i - 2) * 0.06, 0.2, 0.03, '#d04060', [1, 0, 0], '#f09098');
    });
    // swept teal back fins (wing-like), fading to blue with a lime tip
    const fin = (s) => meshOf(mb => {
      mb.lock([0, 0, 0], [s * 0.35, 1, -0.45], [s * 0.2, 0.15, -1], 1.9, 0.5, 0.07, '#28a8a0', [0, 0, 1], '#a0e040');
      mb.lock([0, -0.05, -0.12], [s * 0.6, 0.6, -0.8], [s * 0.3, -0.15, -1], 1.4, 0.36, 0.06, '#2860b8', [0, 0.4, 1], '#40c0a0');
    });
    m.attach('wingL', fin(1)); m.attach('wingR', fin(-1));
    // 4 long thin pale-blue insect legs hanging down and forward (front pair on the arm bones)
    const leg = (s, f) => meshOf(mb => {
      const pts = [[0, 0, 0], [s * 0.36, -0.08, 0.1 + f * 0.12], [s * 0.5, -0.9, 0.62 + f * 0.12], [s * 0.42, -1.85, 1.2 + f * 0.2]];
      limb(mb, pts, [0.08, 0.07, 0.055, 0.012], LB, 5);
      ball(mb, pts[1], 0.08, sh(LB, -0.2)); ball(mb, pts[2], 0.065, sh(LB, -0.2));
    });
    m.attach('armL', leg(1, 1)); m.attach('armR', leg(-1, 1)); m.attach('legBL', leg(1, -1)); m.attach('legBR', leg(-1, -1));
    // cast: the front legs lift instead of swinging over the head
    m.onPose = (mm) => { const kc = clipK(mm, 'e_cast'); ['armL', 'armR'].forEach(n => { if (mm.bones[n]) mm.bones[n].rot[0] += kc * 1.3; }); };
    m.height = 4.0; m.lungeScale = 0.7;
    return m;
  });
  // ---- Waterpolo: the water bubble that traps a party member — a smooth, clear pale-cyan sphere (alpha ~0.35,
  //      both sides drawn), a bright rim ring facing the party and white highlights
  def('waterpolo', (a) => {
    const m = rig(a); m.floats = true;
    m.bone('body', 'root', [0, 0.95, 0]);
    m.attach('body', meshOf(mb => mb.sphere(0, 0, 0, 0.85, 0.85, 0.85, '#a8e8ff', 16, 12, true, (i, j) => mix('#d4f6ff', '#78c8ec', j / 11)), { unlit: true }), null, { blend: 'alpha', tint: [1, 1, 1, 0.35], cull: false });
    // bright bubble edge: a thin ring just inside the silhouette, seen from the front
    m.attach('body', meshOf(mb => { const pts = []; for (let i = 0; i <= 24; i++) { const an = i / 24 * PI * 2; pts.push([C(an) * 0.83, S(an) * 0.83, 0.05]); } sweep(mb, pts, 0.035, '#e8fbff', 5, null, false); }, { unlit: true }), null, { blend: 'alpha', tint: [1, 1, 1, 0.5] });
    att(m, 'body', mb => { ell(mb, 0.3, 0.4, 0.62, 0.14, 0.09, 0.04, '#ffffff', 8, 4); ell(mb, 0.47, 0.2, 0.6, 0.05, 0.04, 0.02, '#ffffff', 6, 3); }, { unlit: true });
    m.height = 1.8; m.lungeScale = 0;
    return m;
  });

  // ================================================================== Cargo ship
  // ---- Marine: Shinra infantry kit (blue hood, gold face guard, grey armour vest, gold knees), crouched with an
  // assault rifle held low and diagonally across the body
  def('marine', () => infantry('marine', { hood: '#2a4aa8', visor: '#161a24', slit: '#ff2a20', guard: '#d8b030', pauldron: '#6a7aa0', knee: '#d8b030', collar: '#1a2a70', belt: '#c8a050', buckle: '#8a6a30',
    pose: { t: 0.24, L: [-1.2, 1.5], R: [-0.75, 1.35], sp: 0.46, hd: -0.2, arm: [-0.55, -1.05, 0.05, -0.62, -0.72, 0.05, 0.25, -0.1], recoil: true,
      atk: [[0], [0.25, [-1.2, -0.52, 0, -1.5, -0.35, 0, -0.3, -0.75], -0.06], [0.8, [-1.2, -0.52, 0, -1.5, -0.35, 0, -0.3, -0.75], -0.06], [1]] },
    weapon: mb => { mb.push(); mb.rotate(0.18, 0.55, 0); infGun(mb, 0.3, '#3c3e48'); mb.pop(); }, height: 0.92 }, {
    top: '#5a6a90', sleeve: '#2a4a9a', bottom: '#2a4a9a', boots: '#18181e', gloves: '#18181e', straps: '#d0b060',
  }));

  // ================================================================== Palette-swap families (other discs)
  // These families live here with their builder; the members were moved in from enemy_models_d1b.js / d23.js.
  // ---- Velcher Task / Diablo (FF7 reuses one model): long, low, bulldog-like winged quadruped with massive
  // forequarters, the head sunk at the front between huge cheek pouches, a wide fanged maw over a big throat pouch,
  // two horns, short thick clawed legs and bat wings raised from the shoulders
  function velcher(look, P) {
    const m = rig(look);
    const B = P.body, BD = P.dark || sh(P.body, -0.3), J = P.jowl, k = P.size || 1;
    m.bone('body', 'root', [0, 0.6 * k, 0]);
    m.bone('head', 'body', [0, 0.1 * k, 0.66 * k], [0.08, 0, 0]); m.bone('jaw', 'head', [0, -0.05 * k, 0.1 * k]);
    m.bone('wingL', 'body', [0.24 * k, 0.36 * k, 0.1 * k]); m.bone('wingR', 'body', [-0.24 * k, 0.36 * k, 0.1 * k]);
    m.bone('tail', 'body', [0, 0.02 * k, -0.56 * k]);
    [['FL', 1, 0.34], ['FR', -1, 0.34], ['BL', 1, -0.42], ['BR', -1, -0.42]].forEach(([n, sx, z]) => m.bone('leg' + n, 'body', [sx * (z > 0 ? 0.34 : 0.3) * k, -0.1 * k, z * k]));
    att(m, 'body', mb => {
      hloft(mb, [{ z: -0.58 * k, w: 0.26 * k, h: 0.24 * k, y: 0.02 * k }, { z: -0.28 * k, w: 0.38 * k, h: 0.34 * k, y: 0.04 * k }, { z: 0.08 * k, w: 0.48 * k, h: 0.42 * k, y: 0.1 * k },
        { z: 0.36 * k, w: 0.52 * k, h: 0.44 * k, y: 0.12 * k }, { z: 0.58 * k, w: 0.38 * k, h: 0.32 * k, y: 0.08 * k }], { sides: 8, color: B });
      LR(s => ell(mb, s * 0.36 * k, 0.3 * k, 0.3 * k, 0.26 * k, 0.26 * k, 0.28 * k, B, 7, 4, (i, j) => j < 2 ? sh(B, 0.12) : B));
      ell(mb, 0, -0.2 * k, 0.02 * k, 0.34 * k, 0.18 * k, 0.48 * k, P.belly, 7, 3);
      for (let i = 0; i < 4; i++) spike(mb, [0, (0.38 - i * 0.04) * k, (0.2 - i * 0.2) * k], [0, 1, -0.6], 0.14 * k, 0.05 * k, BD, 4);
    });
    att(m, 'head', mb => {
      ell(mb, 0, 0.08 * k, 0.0, 0.24 * k, 0.2 * k, 0.24 * k, B, 8, 5);
      mb.blade([0, 0.22 * k, 0.14 * k], [0, 0.35, 1], 0.14 * k, 0.3 * k, 0.06 * k, BD, [1, 0, 0]);             // heavy brow
      LR(s => {
        ell(mb, s * 0.28 * k, 0.02 * k, 0.06 * k, 0.17 * k, 0.18 * k, 0.17 * k, J, 7, 4, (i, j) => j < 2 ? sh(J, 0.12) : J);   // cheek pouches
        mb.sphere(s * 0.09 * k, 0.16 * k, 0.2 * k, 0.028 * k, 0.028 * k, 0.017 * k, P.eye, 5, 3, false);
        spike(mb, [s * 0.1 * k, 0.24 * k, -0.02 * k], [s * 0.25, 1, -0.3], 0.3 * k, 0.055 * k, P.horn, 4);
        spike(mb, [s * 0.16 * k, -0.04 * k, 0.26 * k], [0, -1, 0.2], 0.12 * k, 0.03 * k, '#f8f4ec', 3);   // big fangs
      });
      ell(mb, 0, -0.24 * k, 0.1 * k, 0.24 * k, 0.2 * k, 0.18 * k, J, 7, 4, (i, j) => j > 2 ? sh(J, -0.2) : J);   // throat pouch
      mb.box(0, -0.02 * k, 0.18 * k, 0.36 * k, 0.08 * k, 0.16 * k, '#6a1020');
      teeth(mb, [-0.14 * k, -0.02 * k, 0.26 * k], [0.14 * k, -0.02 * k, 0.26 * k], 8, 0.06 * k, [0, -1, 0.1], '#f8f4ec', 0.017 * k);
    });
    att(m, 'jaw', mb => {
      hloft(mb, [{ z: -0.02 * k, w: 0.2 * k, h: 0.05 * k, y: -0.06 * k }, { z: 0.2 * k, w: 0.16 * k, h: 0.04 * k, y: -0.07 * k }], { sides: 8, color: J });
      mb.box(0, -0.035 * k, 0.1 * k, 0.28 * k, 0.02 * k, 0.18 * k, '#c02020');
      teeth(mb, [-0.12 * k, -0.03 * k, 0.18 * k], [0.12 * k, -0.03 * k, 0.18 * k], 6, 0.05 * k, [0, 1, 0.1], '#f8f4ec', 0.015 * k);
    });
    // bat wings raised from the shoulders: arm bones and a scalloped membrane
    const wing = (s) => meshOf(mb => {
      const E = [s * 0.3 * k, 0.45 * k, -0.1 * k], Wr = [s * 0.56 * k, 0.95 * k, -0.22 * k];
      limb(mb, [[0, 0, 0], E, Wr], [0.06 * k, 0.045 * k, 0.035 * k], P.wingBone, 5);
      const tips = [[s * 1.15 * k, 1.2 * k, -0.34 * k], [s * 1.22 * k, 0.7 * k, -0.34 * k], [s * 0.98 * k, 0.28 * k, -0.28 * k], [s * 0.5 * k, 0.12 * k, -0.18 * k]];
      tips.forEach(t => tube(mb, Wr, t, 0.03 * k, 0.012 * k, P.wingBone, 4));
      const edge = [Wr];
      tips.forEach((t, i) => { edge.push(t); if (i < tips.length - 1) edge.push(lerp3(lerp3(t, tips[i + 1], 0.5), Wr, 0.28)); });
      for (let i = 1; i < edge.length - 1; i++) tri2(mb, Wr, edge[i], edge[i + 1], P.wing, sh(P.wing, -0.3));
      tri2(mb, [0, 0, 0], E, Wr, P.wing, sh(P.wing, -0.3)); tri2(mb, [0, 0, 0], Wr, tips[3], P.wing, sh(P.wing, -0.3));
    });
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    att(m, 'tail', mb => sweep(mb, bez([0, 0, 0], [0, -0.05 * k, -0.25 * k], [0, -0.2 * k, -0.4 * k], 4), taper(4, 0.09 * k, 0.02 * k), B, 6));
    const leg = (front, s) => meshOf(mb => {
      const pts = front ? [[0, 0, 0], [s * 0.05 * k, -0.26 * k, 0.07 * k], [s * 0.05 * k, -0.44 * k, 0.03 * k]] : [[0, 0, 0], [s * 0.05 * k, -0.2 * k, -0.12 * k], [s * 0.05 * k, -0.44 * k, 0.0]];
      sweep(mb, pts, front ? [0.15 * k, 0.125 * k, 0.1 * k] : [0.17 * k, 0.12 * k, 0.1 * k], [B, BD], 7);
      mb.box(s * 0.05 * k, -0.46 * k, 0.08 * k, 0.2 * k, 0.08 * k, 0.24 * k, B);
      for (let q = -1; q <= 1; q++) spike(mb, [s * 0.05 * k + q * 0.06 * k, -0.48 * k, 0.2 * k], [q * 0.3, -0.3, 1], 0.1 * k, 0.03 * k, P.claw, 3);
    });
    m.attach('legFL', leg(true, 1)); m.attach('legFR', leg(true, -1)); m.attach('legBL', leg(false, 1)); m.attach('legBR', leg(false, -1));
    m.onPose = (mm) => { mm.b('body').rot[0] += -clipK(mm, 'e_attack') * 0.22 + clipK(mm, 'e_hurt') * 0.14 + clipK(mm, 'e_cast') * 0.17; };   // keep the paws on the floor
    m.height = 1.3 * k; m.lungeScale = 1;
    return m;
  }
  // Disc 1 (Rocket Town area, moved from enemy_models_d1b.js): the family's base model
  def('velcher_task', (a) => velcher(a, { body: '#7a8a20', dark: '#4a5a10', jowl: '#c02818', belly: '#8a6a70', horn: '#e0d8c8', eye: '#f0e020', wing: '#e07028', wingBone: '#a04818', claw: '#f0e8d8' }));
  // Disc 2/3 (moved from enemy_models_d23.js): FF7 reuses the Velcher Task model for Diablo in purple and gold
  def('diablo', (a) => velcher(a, { body: '#6020a0', dark: '#3a0e70', jowl: '#c09020', belly: '#7a4a9a', horn: '#d0c030', eye: '#40ffe0', wing: '#a0306a', wingBone: '#5a1a70', claw: '#d0c030', size: 1.15 }));

  // ---- Bullmotor / Hard Attacker (FF7 reuses one model): spiked ball body on a finned jet skirt, a small one-eyed
  // dome head with a periscope, stubby arms, and two thick splayed exhaust horns (a tan stack under a crystal tip)
  function bullmotor(look, P) {
    const m = rig(look);
    const k = P.size || 1, BD = P.body, SK = P.skirt;
    m.bone('body', 'root', [0, 0.66 * k, 0]);
    m.bone('head', 'body', [0, 0.4 * k, 0.14 * k]);
    m.bone('armL', 'body', [0.42 * k, 0.0, 0.1 * k]); m.bone('armR', 'body', [-0.42 * k, 0.0, 0.1 * k]);
    m.bone('wingL', 'body', [0.2 * k, 0.26 * k, -0.2 * k]); m.bone('wingR', 'body', [-0.2 * k, 0.26 * k, -0.2 * k]);
    att(m, 'body', mb => {
      ell(mb, 0, 0, 0, 0.46 * k, 0.43 * k, 0.43 * k, BD, 10, 7, (i, j) => j > 4 ? SK : j < 2 ? sh(BD, 0.12) : BD);
      for (let j = 1; j < 6; j++) for (let i = 0; i < 9; i++) {
        const th = j / 6 * PI, ph = (i + (j % 2) * 0.5) / 9 * PI * 2, n = [S(th) * C(ph), C(th), S(th) * S(ph)];
        spike(mb, [n[0] * 0.43 * k, n[1] * 0.41 * k, n[2] * 0.41 * k], n, 0.15 * k, 0.055 * k, P.spike, 4);
      }
      // jet skirt with four fins
      mb.loft([{ y: -0.26 * k, rx: 0.38 * k, rz: 0.38 * k }, { y: -0.5 * k, rx: 0.3 * k, rz: 0.3 * k }, { y: -0.6 * k, rx: 0.1 * k, rz: 0.1 * k }], { sides: 9, color: SK });
      for (let i = 0; i < 4; i++) { const an = i / 4 * PI * 2 + PI / 4; mb.blade([C(an) * 0.3 * k, -0.34 * k, S(an) * 0.3 * k], [C(an), -0.5, S(an)], 0.3 * k, 0.22 * k, 0.05 * k, SK, { radial: [0, -0.34 * k, 0] }, sh(SK, -0.25)); }
    });
    // thick splayed exhaust horns
    const horn = (s) => meshOf(mb => {
      mb.push(); along(mb, [0, 0, 0], [s * 0.45, 1, -0.22]);
      mb.loft([{ y: -0.05 * k, rx: 0.17 * k, rz: 0.15 * k }, { y: 0.42 * k, rx: 0.13 * k, rz: 0.12 * k }], { sides: 7, color: P.horn });
      mb.loft([{ y: 0.42 * k, rx: 0.15 * k, rz: 0.13 * k }, { y: 0.62 * k, rx: 0.12 * k, rz: 0.1 * k }, { y: 0.86 * k, rx: 0.025 * k, rz: 0.025 * k }], { sides: 6, color: P.hornTip, colors: (i) => i === 1 ? sh(P.hornTip, 0.2) : null });
      mb.pop();
    });
    m.attach('wingL', horn(1)); m.attach('wingR', horn(-1));
    att(m, 'head', mb => {
      ell(mb, 0, 0.08 * k, 0, 0.15 * k, 0.14 * k, 0.14 * k, P.head, 8, 5);
      disc(mb, [0, 0.1 * k, 0.13 * k], [0, 0.1, 1], 0.08 * k, 0.08 * k, '#f0e020', 8);
      disc(mb, [0, 0.1 * k, 0.145 * k], [0, 0.1, 1], 0.05 * k, 0.05 * k, P.eye, 8);
      tube(mb, [0.02 * k, 0.18 * k, -0.04 * k], [0.04 * k, 0.42 * k, -0.06 * k], 0.028 * k, 0.022 * k, '#a0a0a8', 6);
      tube(mb, [0.04 * k, 0.42 * k, -0.06 * k], [0.12 * k, 0.46 * k, -0.06 * k], 0.028 * k, 0.028 * k, '#a0a0a8', 6);
    });
    LR(s => att(m, s > 0 ? 'armL' : 'armR', mb => { limb(mb, [[0, 0, 0], [s * 0.12 * k, -0.12 * k, 0.12 * k], [s * 0.1 * k, -0.18 * k, 0.28 * k]], [0.07 * k, 0.055 * k, 0.045 * k], BD, 6); ball(mb, [s * 0.1 * k, -0.18 * k, 0.3 * k], 0.065 * k, SK); }));
    m.onPose = (mm) => { mm.b('wingL').rot[2] *= 0.15; mm.b('wingR').rot[2] *= 0.15; };   // the horns only quiver (the stock clips flap wing bones)
    m.height = 1.45 * k; m.lungeScale = 0.8;
    return m;
  }
  // Disc 1 (Corel Prison, moved from enemy_models_d1b.js): the family's base model
  def('bullmotor', (a) => bullmotor(a, { body: '#4a3aa0', skirt: '#9a2040', spike: '#8a88d8', horn: '#a08070', hornTip: '#8a88d8', head: '#2a5a9a', eye: '#e02080' }));
  // Disc 2/3 (moved from enemy_models_d23.js): FF7 reuses the Bullmotor model for Hard Attacker in red with white horns, about the same size
  def('hard_attacker', (a) => bullmotor(a, { body: '#b02020', skirt: '#d06020', spike: '#8a8ad0', horn: '#e8e0e8', hornTip: '#d06020', head: '#c02030', eye: '#40a0ff', size: 1.05 }));

  // ---- Cactuar / Cactuer (FF7 reuses one model): green capsule body leaning into its run, three-dot face, a red
  // tuft of hairs, one arm bent up and the other bent down, one knee lifted
  function cactuar(look, P) {
    const m = rig(look);
    const G = P.body, GD = sh(P.body, -0.25), k = P.size || 1, DOT = '#1a2a10';
    m.bone('body', 'root', [0, 0.4 * k, 0], [0.15, 0, -0.06]);
    m.bone('head', 'body', [0, 0.3 * k, 0]);
    m.bone('armL', 'body', [0.11 * k, 0.16 * k, 0]); m.bone('armR', 'body', [-0.11 * k, 0.12 * k, 0]);
    m.bone('legFL', 'body', [0.06 * k, -0.14 * k, 0]); m.bone('legFR', 'body', [-0.06 * k, -0.14 * k, 0]);
    att(m, 'body', mb => {
      mb.loft([{ y: -0.2 * k, rx: 0.03 * k, rz: 0.03 * k }, { y: -0.17 * k, rx: 0.09 * k, rz: 0.08 * k }, { y: -0.1 * k, rx: 0.12 * k, rz: 0.1 * k }, { y: 0.24 * k, rx: 0.125 * k, rz: 0.105 * k },
        { y: 0.36 * k, rx: 0.1 * k, rz: 0.085 * k }, { y: 0.42 * k, rx: 0.05 * k, rz: 0.045 * k }], { sides: 8, color: G, colors: (i) => i % 2 ? sh(G, -0.06) : null });
      for (let i = 0; i < 8; i++) { const an = i / 8 * PI * 2 + PI / 8; mb.loft([{ y: -0.08 * k, rx: 0.008 * k, rz: 0.008 * k, x: C(an) * 0.126 * k, z: S(an) * 0.106 * k }, { y: 0.3 * k, rx: 0.008 * k, rz: 0.008 * k, x: C(an) * 0.12 * k, z: S(an) * 0.1 * k }], { sides: 3, color: GD }); }
    });
    att(m, 'head', mb => {
      LR(s => ell(mb, s * 0.042 * k, 0.0, 0.1 * k, 0.022 * k, 0.03 * k, 0.012 * k, DOT, 6, 3));
      ell(mb, 0, -0.08 * k, 0.1 * k, 0.016 * k, 0.034 * k, 0.012 * k, DOT, 6, 3);
      for (let i = -1; i <= 1; i++) spike(mb, [i * 0.02 * k, 0.11 * k, -0.01 * k], [i * 0.45, 1, -0.15], 0.1 * k, 0.012 * k, P.tuft, 3);
    });
    // bent arms (elbow at a right angle): left up, right down
    const arm = (s, up) => meshOf(mb => { limb(mb, [[0, 0, 0], [s * 0.15 * k, 0.0, 0.02 * k], [s * 0.15 * k, (up ? 0.15 : -0.15) * k, 0.03 * k]], [0.045 * k, 0.045 * k, 0.04 * k], G, 6); ball(mb, [s * 0.15 * k, (up ? 0.15 : -0.15) * k, 0.03 * k], 0.04 * k, G, 6, 3); });
    m.attach('armL', arm(1, true)); m.attach('armR', arm(-1, false));
    // running legs: left planted back, right knee lifted forward
    m.attach('legFL', meshOf(mb => { limb(mb, [[0, 0, 0], [0.01 * k, -0.14 * k, -0.04 * k], [0.01 * k, -0.25 * k, -0.07 * k]], [0.05 * k, 0.05 * k, 0.045 * k], G, 6); ball(mb, [0.01 * k, -0.25 * k, -0.07 * k], 0.045 * k, G, 6, 3); }));
    m.attach('legFR', meshOf(mb => { limb(mb, [[0, 0, 0], [-0.02 * k, -0.06 * k, 0.12 * k], [-0.02 * k, -0.19 * k, 0.12 * k]], [0.05 * k, 0.05 * k, 0.045 * k], G, 6); ball(mb, [-0.02 * k, -0.19 * k, 0.12 * k], 0.045 * k, G, 6, 3); }));
    m.height = 0.85 * k; m.lungeScale = 1.3;
    return m;
  }
  // Disc 1 (Corel Desert, moved from enemy_models_d1b.js): the family's base model
  def('cactuar', (a) => cactuar(a, { body: '#78bc3c', tuft: '#c82020' }));
  // Disc 2/3 (moved from enemy_models_d23.js): FF7 reuses the Cactuar model for Cactuer
  def('cactuer', (a) => cactuar(a, { body: '#78bc3c', tuft: '#c82020', size: 1.05 }));

  // ---- Land Worm / Sea Worm (FF7 reuses one model): a massive smooth worm whose rear lies on the ground behind it,
  // rearing up and arching forward so the flared, toothed maw faces the party, with a mane of long spikes on the
  // top and back of the head
  function bigWorm(look, P) {
    const m = rig(look);
    const k = P.size || 1, B = P.body, BD = sh(P.body, -0.2);
    m.bone('body', 'root', [0, 0, -0.3 * k]);
    const up = bez3([0, 0.0, 0], [0, 1.3 * k, 0], [0, 2.5 * k, -0.02 * k], [0, 2.45 * k, 0.85 * k], 10);
    m.bone('head', 'body', up[10], [PI / 2 + 0.22, 0, 0]);
    m.bone('jaw', 'head', [0, 0.46 * k, 0]);
    att(m, 'root', mb => {
      // rear body lying on the ground behind, ending in a spiky tail foot
      const tail = bez3([0, 0.56 * k, -0.3 * k], [0, 0.48 * k, -1.0 * k], [0.25 * k, 0.32 * k, -1.5 * k], [0.55 * k, 0.26 * k, -2.1 * k], 7);
      sweep(mb, tail, taper(7, 0.56 * k, 0.24 * k), P.tail || BD, 9, (i, q) => q > 5 ? sh(P.tail || BD, -0.15) : (P.tail || BD));
      for (let i = 0; i < 5; i++) spike(mb, tail[7], V.norm([C(i * 1.25) * 0.8, Math.abs(S(i * 1.25)) * 0.6 + 0.25, -0.8]), 0.32 * k, 0.07 * k, P.tailSpike || P.spike[0], 4);
      if (P.mound) { mb.loft([{ y: 0, rx: 1.1 * k, rz: 1.0 * k, z: -0.3 * k }, { y: 0.16 * k, rx: 0.86 * k, rz: 0.8 * k, z: -0.3 * k }, { y: 0.3 * k, rx: 0.7 * k, rz: 0.66 * k, z: -0.3 * k }], { sides: 10, color: P.mound }); for (let i = 0; i < 7; i++) { const an = i / 7 * PI * 2; ell(mb, C(an) * 0.95 * k, 0.05 * k, S(an) * 0.88 * k - 0.3 * k, 0.18 * k, 0.09 * k, 0.15 * k, sh(P.mound, -0.12), 5, 3); } }
    });
    // rearing, arching body: one continuous thick sweep (belly stripe on the front)
    att(m, 'body', mb => sweep(mb, up, [0.78, 0.8, 0.78, 0.74, 0.7, 0.66, 0.64, 0.62, 0.6, 0.6, 0.6].map(r => r * k), B, 10, (i, q) => q >= 4 && q <= 6 ? P.belly : (i % 2 ? sh(B, -0.05) : B)));
    // flared head tube along its local +y, mane of spikes on the top / back (local -z is up)
    att(m, 'head', mb => {
      mb.loft([{ y: -0.1 * k, rx: 0.6 * k, rz: 0.6 * k }, { y: 0.2 * k, rx: 0.66 * k, rz: 0.64 * k }, { y: 0.44 * k, rx: 0.74 * k, rz: 0.72 * k }, { y: 0.5 * k, rx: 0.7 * k, rz: 0.68 * k }], { sides: 12, color: P.head || B, capTop: false });
      for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) {
        const an = PI + 0.35 + i / 8 * (PI - 0.7) + r * 0.12, y = (0.36 - r * 0.2) * k, rr = (0.72 - r * 0.05) * k;
        const b = [C(an) * rr, y, S(an) * rr], d = [C(an) * 0.9, -0.75, S(an) * 0.9 - 0.25];
        mb.blade(b, d, (0.64 - r * 0.1 - Math.abs(i - 4) * 0.03) * k, 0.2 * k, 0.06 * k, P.spike[(i + r) % P.spike.length], { radial: [0, y, 0] }, P.spikeTip || sh(P.spike[(i + r) % P.spike.length], 0.25));
      }
    });
    // maw: dark gullet ringed with teeth pointing inward
    att(m, 'jaw', mb => {
      disc(mb, [0, -0.02 * k, 0], [0, 1, 0], 0.64 * k, 0.62 * k, P.maw, 12, 0.03 * k);
      disc(mb, [0, 0.0, 0], [0, 1, 0], 0.3 * k, 0.3 * k, '#140810', 10, 0.03 * k);
      for (let r = 0; r < 2; r++) for (let i = 0; i < 14; i++) { const an = (i + r * 0.5) / 14 * PI * 2, rr = (0.6 - r * 0.16) * k; spike(mb, [C(an) * rr, 0.02 * k, S(an) * rr], [-C(an), 0.45, -S(an)], (0.16 - r * 0.03) * k, 0.035 * k, P.teeth, 3); }
    });
    m.onPose = (mm) => { const b = mm.b('body'), r = b.rot[0]; b.rot[0] = 0; mm.b('head').rot[0] += r * 1.5; };   // the base stays planted: body sway goes into the head
    m.height = 3.3 * k; m.lungeScale = 0.4;
    return m;
  }
  // Disc 1 (Corel Desert, moved from enemy_models_d1b.js): the family's base model
  def('land_worm', (a) => bigWorm(a, { body: '#d88a2a', belly: '#e8a848', tail: '#b87020', mound: '#b89058', spike: ['#8a9a38', '#6a7a28', '#9aaa48'], maw: '#801020', teeth: '#f4f0e0' }));
  // Disc 2/3 (moved from enemy_models_d23.js): FF7 reuses the Land Worm model for Sea Worm in purple with a flame-coloured mane
  def('sea_worm', (a) => bigWorm(a, { body: '#3e3478', belly: '#5a50a0', head: '#40408a', tail: '#5a1a2a', tailSpike: '#8a3040', spike: ['#e04a20', '#f0a020', '#c02030'], spikeTip: '#40a040', maw: '#3040a0', teeth: '#f0a0b0', size: 1.22 }));

})();
