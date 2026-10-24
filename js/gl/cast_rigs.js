// Party/cast costume extras + special (non-human) rigs: Red XIII, Cait Sith, chocobos, moogles,
// dogs (incl. Rufus' Dark Nation), cats, birds, ghosts. Loaded after cast_models.js.
(function () {
  const U = FF7.util, V = FF7.V3;
  const C3 = FF7.chars3d;
  const sh = U.shade;
  const meshOf = C3.meshOf;
  const EXTRA = C3.EXTRA, P = C3.PRESETS, RIGS = C3.RIGS, HAIR = C3.HAIR;
  const { cap, headPt, ringAt, fringe } = C3.hairKit;
  const deg = (d) => d * Math.PI / 180;
  const att = (m, bone, fn, opts) => m.attach(bone, meshOf(fn), null, opts || null);
  const QUAD_ANIMS = { idle: 'q_idle', walk: 'q_walk', run: 'q_run', battle: 'q_battle', attack: 'q_attack', hurt: 'q_hurt', dead: 'q_dead', cast: 'q_cast', item: 'q_cast', victory: 'q_victory', weak: 'q_battle', defend: 'q_battle' };
  const HUM_ANIMS = { idle: 'idle', walk: 'walk', run: 'run', battle: 'battle', attack: 'punch', hurt: 'hurt', dead: 'dead', cast: 'cast', item: 'item', victory: 'victory', weak: 'weak', defend: 'defend' };
  // thin dark decal strokes on a surface (tattoos): segments in a local 2D frame (u right, v up) at `o`
  function strokes(mb, o, uAx, vAx, segs, w, color) {
    const n = V.norm(V.cross(uAx, vAx));
    segs.forEach(([u0, v0, u1, v1]) => {
      const a = V.add(o, V.add(V.scale(uAx, u0), V.scale(vAx, v0))), b = V.add(o, V.add(V.scale(uAx, u1), V.scale(vAx, v1)));
      const d = V.norm(V.sub(b, a)), sd = V.scale(V.norm(V.cross(n, d)), w / 2);
      // both sides: a mirrored frame (uAx pointing -x for the other half of a face) flips the winding,
      // which used to cull the mirrored eye / whiskers
      mb.quad(V.sub(a, sd), V.add(a, sd), V.add(b, sd), V.sub(b, sd), color);
      mb.quad(V.sub(b, sd), V.add(b, sd), V.add(a, sd), V.sub(a, sd), color);
    });
  }
  C3.strokes = strokes;

  // ================================================================== party costume extras
  // Barret: long open leather vest (to the hips) with a pale fleece collar down the lapels, boxy vest
  // shoulders with a jagged fleece edge, grey belly bands, skull tattoo on the left arm (battle). The FF7 field
  // model differs: a tall stand-up collar round the back of his head, lapels the colour of the vest, one wide grey
  // band over the belly and bare, ball-shaped deltoids (no shoulder pads).
  EXTRA.barretVest = (m, H, a) => {
    const vc = a.vestColor || '#8a7a54', pr = H.pr, TT = H.TT, fur = a.furColor || sh(vc, 0.12), bw = H.bw, bd = H.bd;
    const op = a.vestOpen || 30, arc = [deg(90 + op), deg(450 - op)];
    // (battle: a thick sheepskin vest that stands well off the body and flares to the shoulders - the PS1 battle
    // model's massive wedge of an upper body; kx / kz / ks widen, deepen and broaden it)
    const kx = H.battle ? 1.06 : 1, kc = H.battle ? 1.14 : 1, kz = H.battle ? 1.2 : 1, ks = H.battle ? 1.3 : 1;   // (waist, chest, depth, shoulders)
    const shR = Math.max(pr.chestRX * 1.1 * bw, H.shX * 1.1) * ks;
    const R = [{ y: -0.004, rx: pr.waistRX * 1.16 * bw * kx, rz: pr.waistRZ * 1.2 * bd * kz }, { y: TT * 0.3, rx: pr.waistRX * 1.18 * bw * kx, rz: pr.waistRZ * 1.24 * bd * kz }, { y: TT * 0.58, rx: pr.chestRX * 1.12 * bw * kc, rz: pr.chestRZ * 1.14 * bd * kz }, { y: TT * 0.8, rx: pr.chestRX * 1.16 * bw * kc * 1.06, rz: pr.chestRZ * 1.1 * bd * kz }, { y: TT * 0.96, rx: shR, rz: pr.chestRZ * 0.96 * bd * kz }, { y: TT * 1.05, rx: pr.chestRX * 0.72 * bw * kc, rz: pr.chestRZ * 0.8 * bd * kz }];
    const vpt = (y, an, k) => { let i = 0; while (i < R.length - 2 && y > R[i + 1].y) i++; const t = U.clamp((y - R[i].y) / (R[i + 1].y - R[i].y), 0, 1); const rx = U.lerp(R[i].rx, R[i + 1].rx, t), rz = U.lerp(R[i].rz, R[i + 1].rz, t); return [Math.cos(deg(an)) * rx * k, y, Math.sin(deg(an)) * rz * k]; };
    att(m, 'torso', mb => {
      mb.loft(R, { sides: 14, color: vc, arc });
      // fleece collar: a thick roll round the back of the neck that runs down both lapels to the belly (battle); in the
      // field a tall stand-up collar flaring up beside the head to the ears
      if (H.battle) mb.loft([{ y: TT * 0.9, rx: pr.chestRX * 0.86 * bw, rz: pr.chestRZ * 1.0 * bd }, { y: TT * 1.04, rx: pr.chestRX * 0.84 * bw, rz: pr.chestRZ * 0.98 * bd }, { y: TT * 1.14, rx: pr.chestRX * 0.62 * bw, rz: pr.chestRZ * 0.74 * bd }], { sides: 12, color: fur, arc: [deg(90 + op + 4), deg(450 - op - 4)] });
      else mb.loft([{ y: TT * 0.8, rx: shR * 1.02, rz: pr.chestRZ * 1.12 * bd }, { y: TT * 0.98, rx: shR * 0.9, rz: pr.chestRZ * 1.08 * bd, z: -0.004 }, { y: TT + pr.neck + H.hh * 0.2, rx: H.hw * 0.84, rz: H.hd * 0.76, z: -H.hd * 0.1 }, { y: TT + pr.neck + H.hh * 0.6, rx: H.hw * 0.92, rz: H.hd * 0.82, z: -H.hd * 0.16 }], { sides: 12, color: fur, arc: [deg(90 + op + 12), deg(450 - op - 12)], capTop: false, capBottom: false });
      [1, -1].forEach(s => {
        const e = 90 - s * op, o = 90 - s * (op + 26);   // lapel from the opening edge outwards, wide at the collar, narrowing to the belly
        const ys = [TT * 0.98, TT * 0.7, TT * 0.42, TT * 0.2], ws = [1, 0.8, 0.5, 0.15];
        for (let j = 0; j < ys.length - 1; j++) {
          const A = vpt(ys[j], e, 1.03), B = vpt(ys[j], U.lerp(e, o, ws[j]), 1.04), C = vpt(ys[j + 1], U.lerp(e, o, ws[j + 1]), 1.04), D = vpt(ys[j + 1], e, 1.03);
          mb.quad(A, B, C, D, j % 2 ? sh(fur, -0.05) : fur);
        }
      });
      // wide grey metal belt bands round the belly (one broad band in the field)
      if (!H.battle) mb.loft([{ y: -0.002, rx: pr.waistRX * 1.2 * bw, rz: pr.waistRZ * 1.26 * bd }, { y: TT * 0.46, rx: pr.waistRX * 1.24 * bw, rz: pr.waistRZ * 1.3 * bd }], { sides: 12, color: a.bandColor || '#a4a4aa' });
      else [0.1, 0.2, 0.3].forEach((y, i) => mb.loft([{ y: TT * (y - 0.045), rx: pr.waistRX * (1.22 - i * 0.02) * bw, rz: pr.waistRZ * (1.28 - i * 0.02) * bd }, { y: TT * (y + 0.045), rx: pr.waistRX * (1.22 - i * 0.02) * bw, rz: pr.waistRZ * (1.28 - i * 0.02) * bd }], { sides: 12, color: i % 2 ? sh(a.bandColor || '#a4a4aa', -0.12) : (a.bandColor || '#a4a4aa') }));
      // jagged fleece tufts along the shoulder seams
      if (H.battle) for (const s of [1, -1]) for (let i = 0; i < 4; i++) {
        const x = s * shR * (0.55 + i * 0.13), z = pr.chestRZ * bd * (0.5 - i * 0.28);
        mb.blade([x, TT * 1.0, z], [s * 0.35, 1, (i - 1.5) * 0.25], TT * (H.battle ? 0.2 : 0.16), pr.chestRX * 0.3 * bw, 0.01, fur, { radial: [0, TT * 0.8, 0] });
      }
    }, { cull: false });
    // the vest skirt hangs over the hips (open at the front)
    att(m, 'hips', mb => { mb.loft([{ y: H.pel + 0.004, rx: pr.waistRX * 1.16 * bw * kx, rz: pr.waistRZ * 1.2 * bd * kz }, { y: -0.004, rx: H.hipW * 1.18 * kx, rz: pr.waistRZ * 1.3 * bd * kz }, { y: -H.thigh * (H.battle ? 0.3 : 0.26), rx: H.hipW * 1.36 * kx, rz: pr.waistRZ * 1.5 * bd * kz }], { sides: 14, color: sh(vc, -0.06), arc }); }, { cull: false });
    // boxy vest shoulders over the deltoids, with a jagged fleece hem (battle); big bare ball deltoids in the field
    if (!H.battle) ['armL', 'armR'].forEach((b, k) => att(m, b, mb => { const r = H.pr.armR * H.as, s = k ? -1 : 1; mb.sphere(s * r * 0.15, -r * 0.1, 0, r * 1.45, r * 1.5, r * 1.42, a.skin, 8, 5, false); }));
    else ['armL', 'armR'].forEach((b, k) => att(m, b, mb => {
      const r = H.pr.armR * H.as, s = k ? -1 : 1;
      const lo = H.battle ? -r * 0.35 : -r * 0.8;
      mb.loft([{ y: r * 1.25, rx: r * 1.1, rz: r * 1.2, x: -s * r * 0.35 }, { y: r * 0.6, rx: r * 1.5, rz: r * 1.46, x: s * r * 0.05 }, { y: lo, rx: r * 1.44, rz: r * 1.38, x: s * r * 0.12 }], { sides: 8, color: vc, sq: 2.8, capBottom: false });
      for (let i = 0; i < 6; i++) { const an = deg(i * 60 + 20); mb.blade([s * r * 0.12 + Math.cos(an) * r * 1.36, lo + r * 0.1, Math.sin(an) * r * 1.3], [Math.cos(an) * 0.35, -1, Math.sin(an) * 0.35], r * (H.battle ? 0.6 : 0.5), r * 0.9, r * 0.12, fur, { radial: [0, lo, 0] }); }
    }, { cull: false }));
    // skull tattoo on the left upper arm
    att(m, 'armL', mb => { const r = H.pr.armR * H.as; const o = [r * 1.12, -H.up * 0.6, r * 0.3]; strokes(mb, o, [0, 0, -1], [0, 1, 0], [[-0.5, 0.5, 0.5, 0.5], [-0.5, 0.5, -0.5, -0.2], [0.5, 0.5, 0.5, -0.2], [-0.5, -0.2, 0.5, -0.2], [-0.2, -0.2, -0.2, -0.5], [0.2, -0.2, 0.2, -0.5]].map(q => q.map(v => v * r * 1.1)), r * 0.25, '#2a1a10'); });
  };
  // Barret's left forearm: a straight grey metal cuff and a dark wrist band (no flare, the fist stays visible)
  EXTRA.barretBracer = (m, H, a) => att(m, 'foreL', mb => {
    const r = H.pr.foreR * H.as * (H.battle ? 1 : 0.95), g = a.bracerL || '#8a8a90';
    mb.loft([{ y: -H.fo * 0.22, rx: r * 1.22, rz: r * 1.16 }, { y: -H.fo * 0.3, rx: r * 1.3, rz: r * 1.24 }, { y: -H.fo * 0.66, rx: r * 1.3, rz: r * 1.24 }, { y: -H.fo * 0.72, rx: r * 1.22, rz: r * 1.16 }], { sides: 8, color: g, sq: 2.6 });
    mb.loft([{ y: -H.fo * 0.72, rx: r * 1.14, rz: r * 1.1 }, { y: -H.fo * 1.02, rx: r * 1.12, rz: r * 1.08 }], { sides: 8, color: a.wristL || '#2a2a32' });
  });
  // belt pouches (Biggs, Wedge)
  EXTRA.beltPouches = (m, H, a) => att(m, 'torso', mb => { const pr = H.pr, f = a.build === 'fat' ? 1.22 : 1; (a.pouches || [-0.6, -0.2, 0.3, 0.7]).forEach(t => { const an = Math.PI / 2 + t; mb.rbox(Math.cos(an) * pr.waistRX * 1.2 * H.bw * f, H.TT * 0.02, Math.sin(an) * pr.waistRZ * 1.26 * H.bd * f, pr.waistRX * 0.34, H.TT * 0.14, pr.waistRZ * 0.3, a.pouchColor || sh(a.belt || '#6a3418', -0.1), 0.3); }); });
  // chest harness: straps over both shoulders (holding the shoulder pads) + a diagonal bandolier (Wedge)
  EXTRA.harness = (m, H, a) => att(m, 'torso', mb => {
    const pr = H.pr, TT = H.TT, c = a.harnessColor || '#6a3418', f = a.build === 'fat' ? 1.18 : 1;
    const zf = (y) => (y > 0.5 ? pr.chestRZ : pr.waistRZ * 1.2) * H.bd * f * 1.1;
    const strap = (x0, y0, x1, y1, w, back) => { const s = back ? -1 : 1; const A = [x0 * H.bw * f, TT * y0, s * zf(y0)], B = [x1 * H.bw * f, TT * y1, s * zf(y1)]; const d = [B[0] - A[0], B[1] - A[1]], L = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / L * w / 2, d[0] / L * w / 2]; const q = [[A[0] + n[0], A[1] + n[1], A[2]], [A[0] - n[0], A[1] - n[1], A[2]], [B[0] - n[0], B[1] - n[1], B[2]], [B[0] + n[0], B[1] + n[1], B[2]]]; if (back) mb.quad(q[3], q[2], q[1], q[0], c); else mb.quad(q[0], q[1], q[2], q[3], c); };
    const w = pr.chestRX * 0.2;
    [1, -1].forEach(sd => { strap(sd * pr.chestRX * 0.62, 1.02, sd * pr.chestRX * 0.5, 0.12, w, false); strap(sd * pr.chestRX * 0.62, 1.02, sd * pr.chestRX * 0.45, 0.12, w, true); });
    if (a.harnessBandolier !== false) { strap(-pr.chestRX * 0.75, 0.98, pr.waistRX * 0.95, 0.14, w * 1.4, false); for (let i = 0; i < 4; i++) { const t = 0.25 + i * 0.16; mb.rbox(U.lerp(-pr.chestRX * 0.75, pr.waistRX * 0.95, t) * H.bw * f, TT * U.lerp(0.98, 0.14, t), zf(U.lerp(0.98, 0.14, t)) + 0.004, w * 0.8, w * 1.1, w * 0.6, '#2a2a2e', 0.3); } }
  }, { cull: false });
  // Yuffie: dark shoulder pad (right), long cream arm guard (left), orange wrist guards, garter straps
  // (a.guardScale enlarges the arm guard: the FF7 field model's is a big block from the shoulder to below the hip,
  // with the dark shoulder piece on top of it rather than on the right shoulder)
  EXTRA.yuffieGuard = (m, H, a) => {
    const r = H.pr.armR * H.as, g = a.guardScale || 1;
    if (g > 1) att(m, 'armL', mb => { mb.sphere(r * 0.5, r * 0.5, 0, r * 1.6 * g, r * 1.3 * g, r * 1.7 * g, '#3a3e42', 8, 5, true, null, 3); });
    else att(m, 'armR', mb => { mb.sphere(0, r * 0.3, 0, r * 1.7, r * 1.6, r * 1.6, '#1c2a2e', 8, 5, true, null, 3); });
    att(m, 'armL', mb => { mb.loft([{ y: r * 0.8, rx: r * 1.5 * g, rz: r * 1.7 * g, x: r * 0.3 * g }, { y: -H.up * 0.5, rx: r * 1.9 * g, rz: r * 2.1 * g, x: r * 0.5 * g }, { y: -H.up * 1.02, rx: r * 1.8 * g, rz: r * 2.0 * g, x: r * 0.5 * g }], { sides: 8, color: '#e4dcc4', sq: 2.6 }); }, { cull: false });
    att(m, 'foreL', mb => { const q = H.pr.foreR * H.as; mb.loft([{ y: 0.01, rx: q * 1.9 * g, rz: q * 2.0 * g, x: q * 0.5 * g }, { y: -H.fo * 0.7, rx: q * 1.75 * g, rz: q * 1.9 * g, x: q * 0.5 * g }, { y: -H.fo * (g > 1 ? 1.55 : 0.9), rx: q * 1.3 * g, rz: q * 1.3 * g, x: q * 0.3 * g }], { sides: 8, color: '#e4dcc4', sq: 2.6 }); mb.loft([{ y: -H.fo * 0.72, rx: q * 1.2, rz: q * 1.15 }, { y: -H.fo * 1.0, rx: q * 1.15, rz: q * 1.1 }], { sides: 8, color: '#e8781c' }); });
    att(m, 'foreR', mb => { const q = H.pr.foreR * H.as; mb.loft([{ y: -H.fo * 0.55, rx: q * 1.2, rz: q * 1.15 }, { y: -H.fo * 1.0, rx: q * 1.15, rz: q * 1.1 }], { sides: 8, color: '#e8781c' }); });
    // left thigh band + long dark stocking on the left leg, blue garter straps
    att(m, 'thighL', mb => { const t = H.pr.thighR; mb.loft([{ y: -H.thigh * 0.55, rx: t * 1.02, rz: t * 0.98 }, { y: -H.thigh * 0.68, rx: t * 1.0, rz: t * 0.96 }], { sides: 8, color: '#2a2a2a' }); mb.loft([{ y: -H.thigh * 0.68, rx: t * 0.96, rz: t * 0.94 }, { y: -H.thigh - 0.004, rx: H.pr.shinR * 1.05, rz: H.pr.shinR * 1.02 }], { sides: 8, color: '#7a3a24' }); });
    att(m, 'shinL', mb => { const q = H.pr.shinR; mb.loft([{ y: 0.004, rx: q * 1.12, rz: q * 1.1 }, { y: -H.shin * 0.45, rx: q * 1.1, rz: q * 1.08 }], { sides: 8, color: '#7a3a24' }); });
    // back headband tails
    att(m, 'head', mb => { [1, -1].forEach(s => { if (a.tailsDown) mb.blade(headPt(H, deg(270 + s * 12), a.bandY || 0.72, 1.3), [s * 0.3, -1, -0.35], H.hh * (s > 0 ? 0.9 : 0.7), H.hw * 0.14, H.hd * 0.03, '#1c3a2a', [1, 0, 0]); else mb.blade(headPt(H, deg(270 + s * 12), 0.76, 1.16), [s * 0.5, -0.3, -1], H.hh * 0.55, H.hw * 0.12, H.hd * 0.03, '#1c3a2a'); }); });
  };
  // Vincent: golden gauntlet over the left forearm (claw fingers come from 'clawL')
  EXTRA.vincentClaw = (m, H, a) => {
    const g = a.clawColor || '#c8a030';
    att(m, 'foreL', mb => { const q = H.pr.foreR * H.as; mb.loft([{ y: 0.02, rx: q * 1.25, rz: q * 1.2 }, { y: -H.fo * 0.5, rx: q * 1.5, rz: q * 1.4 }, { y: -H.fo * 1.0, rx: q * 1.3, rz: q * 1.25 }], { sides: 8, color: g, sq: 2.6 }); for (let i = 0; i < 3; i++) mb.blade([q * 1.3, -H.fo * (0.2 + i * 0.25), 0], [1, -0.4, 0], q * 0.9, q * 0.9, q * 0.3, sh(g, -0.1), [0, 0, 1]); });
    att(m, 'armL', mb => { const r = H.pr.armR * H.as; mb.sphere(0, -H.up * 0.85, 0, r * 1.35, r * 1.3, r * 1.3, g, 7, 4, true); });
  };
  EXTRA.clawL = () => {};   // fingers built by the hand builder
  // Sephiroth: high black collar (open at the front)
  EXTRA.sephCollar = (m, H, a) => att(m, 'torso', mb => { mb.loft([{ y: H.TT * 0.86, rx: H.pr.chestRX * 0.9 * H.bw, rz: H.pr.chestRZ * 1.02 * H.bd }, { y: H.TT + H.pr.neck + H.hh * 0.12, rx: H.pr.chestRX * 0.72 * H.bw, rz: H.pr.chestRZ * 0.9 * H.bd }], { sides: 12, color: '#24242c', arc: [deg(90 + 38), deg(450 - 38)] }); }, { cull: false });

  // Shinra infantry (Model Reference r1c7): a tall hood-like helmet with a rounded point that comes down over
  // the neck, a dark faceplate with red V goggles and an orange mouth guard
  HAIR.shinraHelmet = (mb, H, a) => {
    const c = a.helmetColor || '#3a5a9a', lt = sh(c, 0.12), dk = sh(c, -0.25);
    const { hw, hh, hd } = H;
    cap(mb, H, c, { front: 0.58, sides: -0.1, back: -0.3, scale: 1.18, frontW: 40, light: lt, hang: 0.62 });
    const r = ringAt(H, hh * 0.9);
    // the tall rounded crown, leaning back a little
    mb.loft([{ y: hh * 0.84, rx: r.rx * 1.2, rz: r.rz * 1.22, z: r.z }, { y: hh * 1.08, rx: r.rx * 1.14, rz: r.rz * 1.16, z: r.z - hd * 0.03 }, { y: hh * 1.3, rx: r.rx * 0.86, rz: r.rz * 0.9, z: r.z - hd * 0.07 }, { y: hh * 1.44, rx: r.rx * 0.42, rz: r.rz * 0.46, z: r.z - hd * 0.1 }, { y: hh * 1.5, rx: r.rx * 0.08, rz: r.rz * 0.1, z: r.z - hd * 0.12 }], { sides: 12, color: c });
    mb.blade([0, hh * 0.98, hd * 0.5], [0, 0.6, -1], hh * 0.75, hw * 0.12, hd * 0.1, lt, [1, 0, 0]);   // crest ridge
    // hood skirt down over the neck (open at the front so the mouth guard shows)
    mb.loft([{ y: hh * 0.3, rx: hw * 0.6, rz: hd * 0.6, z: -hd * 0.04 }, { y: -hh * 0.05, rx: hw * 0.64, rz: hd * 0.64, z: -hd * 0.07 }, { y: -hh * 0.22, rx: hw * 0.72, rz: hd * 0.68, z: -hd * 0.1 }], { sides: 12, color: c, arc: [deg(128), deg(412)] });
    // dark brow rim over the faceplate
    const r6 = ringAt(H, hh * 0.6);
    mb.loft([{ y: hh * 0.61, rx: r6.rx * 1.22, rz: r6.rz * 1.24, z: r6.z }, { y: hh * 0.55, rx: r6.rx * 1.2, rz: r6.rz * 1.22, z: r6.z }], { sides: 12, color: dk, arc: [deg(20), deg(160)] });
    // orange mouth guard (geometry, so it still reads at field scale)
    if (a.mouthGuard !== false) { const p = headPt(H, deg(90), 0.2, 1.0); mb.sphere(p[0], p[1], p[2] + hd * 0.01, hw * 0.3, hh * 0.19, hd * 0.16, a.mouthGuard || '#d88a20', 8, 5, true); }
  };
  EXTRA.infantryMask = () => {};   // painted via facePaint (see presets below)
  const infantryFace = (d) => {
    const { Pg, R, ey } = d;
    R(0, 0, 64, 64, '#1e2230');
    Pg([[25, ey - 9], [39, ey - 9], [32, ey - 3]], '#ff2a1a');                                   // red point at the top of the plate
    Pg([[7, ey - 4], [30, ey + 1], [29, ey + 6], [9, ey + 2]], '#ff2a1a'); Pg([[57, ey - 4], [34, ey + 1], [35, ey + 6], [55, ey + 2]], '#ff2a1a');   // the V goggles
    Pg([[11, ey - 2], [26, ey + 1.5], [26, ey + 3], [12, ey + 0.5]], '#ff8060'); Pg([[53, ey - 2], [38, ey + 1.5], [38, ey + 3], [52, ey + 0.5]], '#ff8060');
    Pg([[16, ey + 9], [48, ey + 9], [41, 63], [23, 63]], '#d88a20');
  };
  // Shinra MP (01-midgar_005, Bestiary "MP"): round blue helmet with a dark visor and a neck flap over a
  // yellow face guard
  HAIR.mpHelmet = (mb, H, a) => {
    const c = a.helmetColor || '#3a74b4', lt = sh(c, 0.12);
    const { hw, hh, hd } = H;
    cap(mb, H, c, { front: 0.62, sides: 0.3, back: -0.1, scale: 1.2, frontW: 50, light: lt });
    const rv = ringAt(H, hh * 0.55);
    mb.loft([{ y: hh * 0.66, rx: rv.rx * 1.21, rz: rv.rz * 1.27, z: rv.z }, { y: hh * 0.47, rx: rv.rx * 1.17, rz: rv.rz * 1.25, z: rv.z }], { sides: 10, color: '#1a2030', arc: [deg(22), deg(158)] });   // visor
    const rb = ringAt(H, hh * 0.66);
    mb.loft([{ y: hh * 0.68, rx: rb.rx * 1.24, rz: rb.rz * 1.42, z: rb.z + hd * 0.02 }, { y: hh * 0.64, rx: rb.rx * 1.24, rz: rb.rz * 1.42, z: rb.z + hd * 0.02 }], { sides: 10, color: sh(c, -0.12), arc: [deg(30), deg(150)] });   // brim
    mb.loft([{ y: hh * 0.42, rx: hw * 0.62, rz: hd * 0.6, z: -hd * 0.02 }, { y: -hh * 0.12, rx: hw * 0.68, rz: hd * 0.64, z: -hd * 0.08 }], { sides: 10, color: c, arc: [deg(165), deg(375)] });   // neck flap
  };
  EXTRA.mpMask = () => {};
  C3.faces = C3.faces || {};
  const mpFace = (d) => { const { R, Pg, E, ey } = d, g = d.spec.guardColor || '#dcb432'; Pg([[3, ey + 3], [61, ey + 3], [55, 64], [9, 64]], g); Pg([[22, ey + 13], [42, ey + 13], [39, ey + 17], [25, ey + 17]], sh(g, -0.25)); R(0, ey - 10, 64, 13, '#1a2030'); E(22, ey - 2, 3.4, 1.8, '#ff4030'); E(42, ey - 2, 3.4, 1.8, '#ff4030'); };
  C3.faces.infantry = infantryFace; C3.faces.mp = mpFace;
  // knee pads (MPs)
  EXTRA.kneepads = (m, H, a) => ['shinL', 'shinR'].forEach(b => att(m, b, mb => { const r = H.pr.thighR * (a.pants === 'baggy' ? 1.42 : 1.05); mb.rbox(0, -H.shin * 0.06, r * 1.0, r * 1.1, H.shin * 0.22, r * 0.45, a.kneeColor || '#c8a030', 0.35); }));
  // Reno: shirt tails hanging out below the jacket
  EXTRA.shirtTails = (m, H, a) => att(m, 'torso', mb => { const pr = H.pr; [1, -1].forEach(s => mb.quad([s * pr.waistRX * 0.05, 0.01, pr.waistRZ * 1.1], [s * pr.waistRX * 0.55, 0.01, pr.waistRZ * 1.05], [s * pr.waistRX * 0.45, -H.pel - H.thigh * 0.3, pr.waistRZ * 1.2], [s * pr.waistRX * 0.08, -H.pel - H.thigh * 0.38, pr.waistRZ * 1.25], '#f0f0f0')); }, { cull: false });
  EXTRA.pocketSquare = (m, H, a) => att(m, 'torso', mb => { mb.tri([H.pr.chestRX * 0.45 * H.bw, H.TT * 0.72, H.pr.chestRZ * 1.08 * H.bd], [H.pr.chestRX * 0.72 * H.bw, H.TT * 0.72, H.pr.chestRZ * 1.02 * H.bd], [H.pr.chestRX * 0.6 * H.bw, H.TT * 0.8, H.pr.chestRZ * 1.04 * H.bd], '#f4f4f4'); }, { cull: false });
  // Rufus: closed white coat top with a standing collar; Corneo: red coat with a big fur collar
  EXTRA.rufusCoat = (m, H, a) => { EXTRA.jacket(m, H, Object.assign({}, a, { jacket: a.coatColor || '#e8e8f0', jacketOpen: 5, jacketSleeves: true })); EXTRA.collarUp(m, H, Object.assign({}, a, { collarUp: a.coatColor || '#e8e8f0' })); };
  EXTRA.corneoCoat = (m, H, a) => { EXTRA.jacket(m, H, Object.assign({}, a, { jacket: '#b81e26', jacketOpen: 40, jacketHem: 0.45 })); };
  EXTRA.dyneVest = (m, H, a) => { EXTRA.jacket(m, H, Object.assign({}, a, { jacket: '#2a2020', jacketOpen: 34, jacketSleeves: false })); att(m, 'torso', mb => { mb.loft([{ y: H.TT * 0.9, rx: H.pr.chestRX * 0.95 * H.bw, rz: H.pr.chestRZ * 1.0 * H.bd }, { y: H.TT * 1.12, rx: H.pr.chestRX * 0.85 * H.bw, rz: H.pr.chestRZ * 0.92 * H.bd }], { sides: 12, color: '#2a2020', arc: [deg(125), deg(415)] }); }, { cull: false }); };
  EXTRA.haori = (m, H, a) => { EXTRA.jacket(m, H, Object.assign({}, a, { jacket: '#4a2a6a', jacketOpen: 26, jacketHem: 0.5, jacketSleeves: false })); };
  EXTRA.coatSleeves = () => {};
  EXTRA.heideggerTrim = (m, H, a) => { ['armL', 'armR'].forEach(b => att(m, b, mb => { const r = H.pr.armR * H.as; mb.rbox(0, r * 1.05, 0, r * 2.4, r * 0.35, r * 2.0, '#d0b040', 0.2); })); };
  EXTRA.presidentButtons = () => {};
  EXTRA.wedgeSash = () => {};
  EXTRA.elmyraSash = (m, H, a) => { att(m, 'torso', mb => { const pr = H.pr; mb.loft([{ y: -0.012, rx: pr.waistRX * 1.16 * H.bw, rz: pr.waistRZ * 1.2 * H.bd }, { y: H.TT * 0.2, rx: pr.waistRX * 1.16 * H.bw, rz: pr.waistRZ * 1.2 * H.bd }], { sides: 12, color: '#8a4aa8' }); mb.blade([pr.waistRX * 0.5 * H.bw, 0, pr.waistRZ * 1.2 * H.bd], [0.2, -1, 0.2], H.thigh * 0.8, pr.waistRX * 0.6, 0.006, '#8a4aa8', [1, 0, 0]); }); };
  EXTRA.bugenhagenOrb = (m, H, a) => { att(m, 'hips', mb => { const r = H.pr.hipRX * 1.25; mb.sphere(0, -H.hipsY + 0.03 + r, 0.0, r, r, r, '#40c050', 10, 6, true); });   /* small orb under the robe, just above the floor */ ['thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'].forEach(b => { if (m.bones[b]) m.bones[b].meshes = []; }); };
  EXTRA.sailorCollar = (m, H, a) => att(m, 'torso', mb => { const pr = H.pr, TT = H.TT; mb.quad([-pr.chestRX * 0.75 * H.bw, TT * 1.0, -pr.chestRZ * 0.7 * H.bd], [pr.chestRX * 0.75 * H.bw, TT * 1.0, -pr.chestRZ * 0.7 * H.bd], [pr.chestRX * 0.8 * H.bw, TT * 0.6, -pr.chestRZ * 1.1 * H.bd], [-pr.chestRX * 0.8 * H.bw, TT * 0.6, -pr.chestRZ * 1.1 * H.bd], a.collarColor || '#2a4aa0'); [1, -1].forEach(s => mb.blade([s * 0.004, TT * 0.85, pr.chestRZ * 0.98 * H.bd], [s * 0.3, -1, 0.2], TT * 0.3, pr.chestRX * 0.3, 0.006, '#d02020', [1, 0, 0])); }, { cull: false });

  // --- preset refinements that need the helpers above
  Object.assign(P.soldier, { noEars: true, facePaint: infantryFace, headBackColor: '#1e2230', face: { eyes: 'none', nose: false, mouth: 'none', brow: false } });
  Object.assign(P.soldier_red, { noEars: true, facePaint: infantryFace, headBackColor: '#1e2230', face: { eyes: 'none', nose: false, mouth: 'none', brow: false } });
  Object.assign(P.young_cloud, { noEars: true, facePaint: infantryFace, headBackColor: '#1e2230', face: { eyes: 'none', nose: false, mouth: 'none', brow: false } });
  Object.assign(P.mp, { noEars: true, facePaint: mpFace, headBackColor: '#dcb432', face: { eyes: 'none', nose: false, mouth: 'none', brow: false } });
  P.barret.torso = (Pt, a) => { Pt.band(0.04, 0.36, a.bandColor || '#a4a4aa'); };
  P.president.torso = (Pt) => { [[-0.2, 0.6], [0.2, 0.6], [-0.2, 0.35], [0.2, 0.35]].forEach(([x, y]) => Pt.poly([[x, y + 0.07], [x + 0.06, y], [x, y - 0.07], [x - 0.06, y]], '#e8e8f0')); };
  P.wedge.torso = null;   // harness is modelled (EXTRA.harness)
  P.wedge.extras = P.wedge.extras.concat(['harness']);
  P.biggs.extras = P.biggs.extras.concat(['harness']); P.biggs.harnessColor = '#6a3a1e'; P.biggs.harnessBandolier = false;
  P.tifa.torso = (Pt) => { Pt.band(0.93, 1.0, '#e0e0de'); };
  P.yuffie.torso = (Pt) => { Pt.poly([[0.5, 1.0], [0.75, 1.0], [-0.2, 0.3], [-0.45, 0.3]], '#1a1a1a'); Pt.poly([[-0.5, 1.0], [-0.75, 1.0], [0.2, 0.3], [0.45, 0.3]], '#1a1a1a', true); };

  // ================================================================== Red XIII (quadruped)
  // Field (matched to FF7's field model, references/overworld models): a lean, long-legged lion with a deep chest,
  // the head carried low in front of the shoulders, a tall dark-red crest fin over the neck, a dark stripe down the
  // spine, a few orange tufts at the cheeks (no ruff all round the face), big wedge paws with gold bands above them,
  // and a long tail held straight out behind that ends in a dark-red diamond tuft.
  function redField(m, a) {
    let C1 = '#d65a1e', C2 = '#e88040', MANE = '#b01c10', CREST = '#8a1410', GOLD = '#d8b030', DARK = '#3a1208', NOSE = '#1a0c08';
    const k = 1.25;
    // (a.stone: a statue of him, every colour a shade of the stone: Kupomon's Route 14)
    if (a && a.stone) { const s = a.stone, sh = FF7.util.shade; C1 = s; C2 = sh(s, 0.08); MANE = sh(s, -0.12); CREST = sh(s, -0.2); GOLD = sh(s, 0.04); DARK = sh(s, -0.3); NOSE = sh(s, -0.4); }
    const bodyY = 0.33, fl = [0.115, 0.0, 0.13], bl = [0.1, 0.05, -0.2];
    m.bone('body', null, [0, bodyY, 0]);
    m.bone('head', 'body', [0, 0.03, 0.44], [0.08, 0, 0]);
    m.bone('tail', 'body', [0, 0.06, -0.29]);
    m.bone('legFL', 'body', fl); m.bone('legFR', 'body', [-fl[0], fl[1], fl[2]]);
    m.bone('legBL', 'body', bl); m.bone('legBR', 'body', [-bl[0], bl[1], bl[2]]);
    const path = [[0, 0.05, -0.31], [0, 0.06, -0.26], [0, 0.045, -0.14], [0, 0.03, -0.02], [0, 0.02, 0.1], [0, 0.05, 0.18], [0, 0.08, 0.22]];
    const rad = [[0.045, 0.04], [0.1, 0.09], [0.09, 0.085], [0.1, 0.1], [0.12, 0.125], [0.1, 0.11], [0.065, 0.07]];
    m.attach('body', meshOf(mb => {
      mb.sweep(path, rad, { sides: 10, color: C1, colors: (q, i, n) => (i > n * 0.6 && i < n * 0.9) ? C2 : null, up: [0, 1, 0] });
      mb.sweep([[0, 0.06, 0.16], [0, 0.07, 0.27], [0, 0.05, 0.38]], [[0.08, 0.09], [0.07, 0.08], [0.065, 0.07]], { sides: 8, color: C1 });
      // the crest: two tall dark-red fins over the neck and shoulders, sweeping back
      mb.blade([0, 0.12, 0.32], [0, 0.55, -1], 0.36, 0.12, 0.03, CREST, [0, 1, 0.55], MANE);
      mb.blade([0, 0.12, 0.2], [0, 0.35, -1], 0.26, 0.09, 0.03, MANE, [0, 1, 0.35]);
      // dark stripe down the spine to the tail (flat, lying on the back)
      [[0.16, 0.14], [0.02, 0.12], [-0.12, 0.11], [-0.24, 0.1]].forEach(([z, y]) => mb.blade([0, y, z + 0.06], [0, -0.1, -1], 0.15, 0.05, 0.012, CREST, [1, 0, 0]));
      // XIII tattoo on the left shoulder + stripes on the haunches
      const shp = path[4], hp = path[1], sr = rad[4], hr = rad[1];
      strokes(mb, [sr[0] * 0.98, shp[1] + 0.02, shp[2] - 0.01], [0, 0, -1], [0, 1, 0], [[-0.02, 0.02, 0.0, -0.02], [0.0, 0.02, -0.02, -0.02], [0.008, 0.02, 0.008, -0.02], [0.016, 0.02, 0.016, -0.02], [0.024, 0.02, 0.024, -0.02]].map(q => q.map(v => v * 1.2)), 0.005, DARK);
      [1, -1].forEach(sd => strokes(mb, [sd * hr[0] * 0.95, hp[1] + 0.01, hp[2] - 0.01], [0, 0, sd], [0, 1, 0], [[-0.03, 0.03, -0.03, -0.02], [-0.015, 0.035, -0.015, -0.025], [0.0, 0.035, 0.0, -0.025], [0.015, 0.035, 0.015, -0.025], [-0.035, 0.04, 0.03, 0.04]], 0.006, DARK));
    }), null, { cull: false });
    // head: broad blocky face, blunt muzzle, dark nose; orange cheek tufts, ears, a tall crest on the forehead and dark
    // locks swept back over the crown, two dark-red spikes hanging below the jaw, grey feather (left), beads (right)
    m.attach('head', meshOf(mb => {
      mb.sweep([[0, 0.012 * k, -0.085 * k], [0, 0.015 * k, -0.02 * k], [0, 0.01 * k, 0.045 * k], [0, -0.002 * k, 0.085 * k]], [[0.07 * k, 0.068 * k], [0.1 * k, 0.088 * k], [0.092 * k, 0.08 * k], [0.07 * k, 0.062 * k]], { sides: 8, color: C1, up: [0, 1, 0] });
      mb.sweep([[0, -0.028 * k, 0.06 * k], [0, -0.03 * k, 0.1 * k], [0, -0.034 * k, 0.125 * k]], [[0.058 * k, 0.042 * k], [0.052 * k, 0.036 * k], [0.044 * k, 0.03 * k]], { sides: 8, color: C2, up: [0, 1, 0] });
      mb.sweep([[0, -0.06 * k, 0.04 * k], [0, -0.066 * k, 0.1 * k]], [[0.04 * k, 0.018 * k], [0.03 * k, 0.012 * k]], { sides: 6, color: sh(C2, -0.06), up: [0, 1, 0] });
      mb.blade([0, -0.006 * k, 0.13 * k], [0, -1, 0.25], 0.03 * k, 0.045 * k, 0.014 * k, NOSE, [1, 0, 0]);
      strokes(mb, [0, -0.052 * k, 0.126 * k], [1, 0, 0], [0, 1, 0], [[-0.03, 0.004, 0, 0], [0, 0, 0.03, 0.004], [0, 0, 0, 0.02]].map(q => q.map(v => v * k)), 0.004 * k, DARK);
      mb.rbox(0.042 * k, 0.03 * k, 0.078 * k, 0.034 * k, 0.014 * k, 0.012 * k, '#f0d040', 0.3); mb.rbox(0.048 * k, 0.03 * k, 0.083 * k, 0.012 * k, 0.014 * k, 0.008 * k, NOSE, 0.3);
      strokes(mb, [0.042 * k, 0.045 * k, 0.086 * k], [1, 0, -0.3], [0, 1, 0], [[-0.022, -0.006, 0.02, 0.004]].map(q => q.map(v => v * k)), 0.007 * k, DARK);
      strokes(mb, [-0.045 * k, 0.03 * k, 0.083 * k], [-1, 0, -0.35], [0, 1, 0], [[-0.02, -0.02, 0.02, 0.02], [-0.02, 0.02, 0.02, -0.02]].map(q => q.map(v => v * k)), 0.007 * k, DARK);
      for (const sd of [1, -1]) {
        [[70, 0.07], [100, 0.085], [128, 0.065]].forEach(([d, L], i) => { const ps = deg(d); mb.blade([sd * Math.sin(ps) * 0.085 * k, Math.cos(ps) * 0.07 * k + 0.008 * k, -0.01 * k], [sd * Math.sin(ps), Math.cos(ps) * 0.7, -0.45], L * k, 0.065 * k, 0.022 * k, i === 1 ? sh(C1, -0.06) : C1, { radial: [0, 0.01 * k, 0] }, MANE); });
        mb.blade([sd * 0.055 * k, 0.07 * k, -0.02 * k], [sd * 0.45, 1, -0.2], 0.08 * k, 0.06 * k, 0.018 * k, C1, null, sh(C1, -0.15));   // ears
        mb.blade([sd * 0.07 * k, -0.045 * k, -0.02 * k], [sd * 0.15, -1, -0.1], 0.09 * k, 0.04 * k, 0.02 * k, MANE, [1, 0, 0], CREST);   // spikes hanging below the jaw
      }
      mb.blade([0, 0.07 * k, 0.02 * k], [0, 1, 0.08], 0.13 * k, 0.045 * k, 0.04 * k, CREST, [1, 0, 0]);   // tall crest on the forehead
      mb.blade([0, 0.078 * k, -0.01 * k], [0, 0.35, -1], 0.2 * k, 0.07 * k, 0.03 * k, MANE, [0, 1, 0.35], CREST);
      mb.blade([0.02 * k, 0.07 * k, -0.04 * k], [0.25, 0.15, -1], 0.16 * k, 0.06 * k, 0.03 * k, CREST, [0, 1, 0]);
      mb.blade([-0.02 * k, 0.07 * k, -0.04 * k], [-0.25, 0.15, -1], 0.16 * k, 0.06 * k, 0.03 * k, CREST, [0, 1, 0]);
      mb.blade([0.05 * k, 0.06 * k, -0.03 * k], [0.55, 1, -0.45], 0.2 * k, 0.045 * k, 0.014 * k, '#b8bcc8', null, '#8a8e9a');   // feather
      for (let i = 0; i < 3; i++) mb.sphere(-0.092 * k, -0.02 * k - i * 0.022 * k, 0.0, 0.01 * k, 0.01 * k, 0.01 * k, i % 2 ? '#e8e8f0' : '#3060c0', 5, 3);
    }));
    // tail held straight out behind, ending in a dark-red diamond tuft
    m.attach('tail', meshOf(mb => {
      mb.sweep([[0, 0, 0.02], [0, 0.012, -0.2], [0, 0.012, -0.38], [0, 0.004, -0.47]], [0.024, 0.02, 0.018, 0.018], { sides: 6, color: C1 });
      mb.push(); mb.translate(0, 0.004, -0.6); mb.rotate(Math.PI / 2, 0, 0);
      mb.loft([{ y: -0.15, rx: 0.004, rz: 0.004 }, { y: 0, rx: 0.08, rz: 0.09 }, { y: 0.15, rx: 0.004, rz: 0.004 }], { sides: 4, color: CREST, phase: 0 });
      mb.pop();
    }));
    // legs from the shoulder / hip to the ground (the paw soles land on y = 0); the hind legs are digitigrade
    const leg = (front) => meshOf(mb => {
      const r = front ? fl : bl, H = bodyY + r[1];
      const path = front ? [[0, 0.03, 0.0], [0, -H * 0.45, -0.01], [0, -H * 0.78, 0.01], [0, -H + 0.03, 0.02]] : [[0, 0.03, 0.0], [0, -H * 0.35, 0.04], [0, -H * 0.62, -0.05], [0, -H + 0.03, -0.01]];
      mb.sweep(path, front ? [[0.052, 0.07], [0.04, 0.045], [0.033, 0.036], [0.033, 0.036]] : [[0.058, 0.085], [0.042, 0.05], [0.034, 0.036], [0.034, 0.036]], { sides: 7, color: C1, up: [0, 0, 1] });
      const bz = front ? 0.015 : -0.02, by = front ? 0.12 : 0.13;
      mb.loft([{ y: -H + by, rx: 0.037, rz: 0.04, z: bz }, { y: -H + by - 0.045, rx: 0.037, rz: 0.04, z: bz }], { sides: 8, color: GOLD });
      // big wedge paw: tall at the back, sloping down to three toes at the front
      mb.push(); mb.translate(0, -H, 0);
      mb.rbox(0, 0.028, 0.035, 0.1, 0.056, 0.13, sh(C1, -0.1), 0.35);
      mb.rbox(0, 0.06, 0.0, 0.07, 0.05, 0.07, sh(C1, -0.04), 0.35);
      for (let i = -1; i <= 1; i++) mb.rbox(i * 0.032, 0.02, 0.1, 0.03, 0.04, 0.04, sh(C1, -0.18), 0.4);
      mb.pop();
    });
    m.attach('legFL', leg(true)); m.attach('legFR', leg(true)); const bk = leg(false); m.attach('legBL', bk); m.attach('legBR', bk);
    m.height = bodyY + 0.37;
    m.anims = QUAD_ANIMS;
    // the long tail stays near level (the shared quadruped clips raise it steeply)
    const A = FF7.anims, S = Math.sin;
    m.clips = {
      q_idle: { dur: 90, fn(mm, p) { A.q_idle.fn(mm, p); mm.b('tail').rot[0] = 0.06 + S(p * Math.PI * 2) * 0.05; } },
      q_walk: { dur: 30, fn(mm, p) { A.q_walk.fn(mm, p); mm.b('tail').rot[0] = 0.08 + S(p * Math.PI * 2) * 0.06; } },
      q_run: { dur: 18, fn(mm, p) { A.q_run.fn(mm, p); mm.b('tail').rot[0] = 0.12; } },
    };
    m.showWeapon = () => {};
    return m;
  }
  RIGS.redxiii = function (a, style) {
    const m = new FF7.Model(); m.app = a; m.rig = 'quad';
    const battle = style === 'battle';
    if (!battle) return redField(m, a);
    const C1 = '#d65a1e', C2 = '#e88040', MANE = '#b01c10', CREST = '#8a1410', GOLD = '#d8b030', DARK = '#3a1208', NOSE = '#1a0c08';
    // body layout: bodyY = height of the body bone; head, neck, leg roots and tail are relative to it
    const L = battle
      ? { bodyY: 0.27, k: 1.3, head: [0, 0.035, 0.37], neck: [[0, 0.04, 0.22], [0, 0.05, 0.3], [0, 0.04, 0.36]],
        path: [[0, 0.1, -0.38], [0, 0.1, -0.29], [0, 0.07, -0.16], [0, 0.03, 0.0], [0, 0.02, 0.14], [0, 0.04, 0.25], [0, 0.05, 0.31]],
        rad: [[0.05, 0.05], [0.1, 0.115], [0.085, 0.095], [0.095, 0.11], [0.115, 0.14], [0.11, 0.13], [0.075, 0.085]],
        fl: [0.1, -0.02, 0.22], bl: [0.085, 0.07, -0.26], tail: [0, 0.12, -0.36] }
      : { bodyY: 0.2, k: 1.0, head: [0, 0.13, 0.25], neck: [[0, 0.04, 0.12], [0, 0.1, 0.19], [0, 0.13, 0.23]],
        path: [[0, 0.03, -0.24], [0, 0.035, -0.17], [0, 0.02, -0.06], [0, 0.015, 0.04], [0, 0.03, 0.12], [0, 0.05, 0.18], [0, 0.08, 0.21]],
        rad: [[0.05, 0.05], [0.1, 0.105], [0.09, 0.095], [0.1, 0.11], [0.11, 0.125], [0.1, 0.115], [0.07, 0.08]],
        fl: [0.068, -0.03, 0.12], bl: [0.072, 0.0, -0.15], tail: [0, 0.05, -0.23] };
    const k = L.k, spl = battle ? 0.12 : 0;   // spl: outward splay of the front legs in the crouch
    m.bone('body', null, [0, L.bodyY, 0]);
    m.bone('head', 'body', L.head);
    m.bone('tail', 'body', L.tail, [0.5, 0, 0]);
    m.bone('legFL', 'body', [L.fl[0], L.fl[1], L.fl[2]], [0, 0, spl]); m.bone('legFR', 'body', [-L.fl[0], L.fl[1], L.fl[2]], [0, 0, -spl]);
    m.bone('legBL', 'body', [L.bl[0], L.bl[1], L.bl[2]]); m.bone('legBR', 'body', [-L.bl[0], L.bl[1], L.bl[2]]);
    m.attach('body', meshOf(mb => {
      mb.sweep(L.path, L.rad, { sides: 10, color: C1, colors: (q, i, n) => (i > n * 0.6 && i < n * 0.9) ? C2 : null, up: [0, 1, 0] });
      mb.sweep(L.neck, [[0.085, 0.095], [0.08, 0.085], [0.07, 0.075]], { sides: 8, color: C1 });
      // thick mane: broad dark-red locks sweeping back from behind the head down the neck and spine
      const n0 = L.neck[2], sp = L.path[2];
      for (let i = 0; i < 6; i++) {
        const t = i / 5, z = U.lerp(n0[2] - 0.02, sp[2], t), y = U.lerp(n0[1] + 0.07, sp[1] + (battle ? 0.1 : 0.09), t);
        mb.blade([0, y, z], [0, 0.5 - t * 0.3, -1], (battle ? 0.2 : 0.15) * (1 - t * 0.45), (battle ? 0.12 : 0.1) * (1 - t * 0.3), 0.03, i % 2 ? MANE : CREST, [1, 0, 0]);
      }
      for (const sd of [1, -1]) for (let i = 0; i < 4; i++) {
        const t = i / 3, z = U.lerp(n0[2] - 0.02, n0[2] - 0.14, t), y = U.lerp(n0[1] + 0.02, n0[1] - 0.04, t);
        mb.blade([sd * 0.06, y, z], [sd * 0.9, 0.35, -0.6], (battle ? 0.15 : 0.12) * (1 - t * 0.35), 0.075, 0.02, i % 2 ? MANE : sh(C1, -0.1), { radial: [0, y - 0.02, z] }, MANE);
      }
      // chest ruff under the chin
      for (let i = 0; i < 3; i++) mb.blade([(i - 1) * 0.045, n0[1] - 0.06, n0[2] + 0.02], [(i - 1) * 0.3, -1, 0.35], battle ? 0.1 : 0.08, 0.06, 0.02, C1, [1, 0, 0], sh(C1, 0.1));
      // shoulder blades stand up in the battle crouch
      if (battle) [1, -1].forEach(sd => mb.sphere(sd * 0.075, 0.1, 0.2, 0.05, 0.05, 0.08, C1, 6, 4));
      // XIII tattoo on the left shoulder + stripes on the haunches
      const shp = L.path[4], hp = L.path[1], sr = L.rad[4], hr = L.rad[1];
      strokes(mb, [sr[0] * 0.98, shp[1] + 0.02, shp[2] + 0.02], [0, 0, -1], [0, 1, 0], [[-0.02, 0.02, 0.0, -0.02], [0.0, 0.02, -0.02, -0.02], [0.008, 0.02, 0.008, -0.02], [0.016, 0.02, 0.016, -0.02], [0.024, 0.02, 0.024, -0.02]].map(q => q.map(v => v * 1.2)), 0.005, DARK);
      [1, -1].forEach(sd => strokes(mb, [sd * hr[0] * 0.95, hp[1] + 0.01, hp[2] - 0.02], [0, 0, sd], [0, 1, 0], [[-0.03, 0.03, -0.03, -0.02], [-0.015, 0.035, -0.015, -0.025], [0.0, 0.035, 0.0, -0.025], [0.015, 0.035, 0.015, -0.025], [-0.035, 0.04, 0.03, 0.04]].map(q => q.map(v => v * (battle ? 1.2 : 1))), 0.006, DARK));
    }), null, { cull: false });
    // head: wide flat lion face with a short blunt muzzle and a dark triangle nose, a ruff of mane spikes
    // framing the face, the tall dark crest, ears, X scar over the right eye, feathers (left) + beads (right)
    m.attach('head', meshOf(mb => {
      mb.sweep([[0, 0.012 * k, -0.085 * k], [0, 0.015 * k, -0.02 * k], [0, 0.01 * k, 0.045 * k], [0, -0.002 * k, 0.085 * k]], [[0.07 * k, 0.068 * k], [0.1 * k, 0.088 * k], [0.092 * k, 0.08 * k], [0.07 * k, 0.062 * k]], { sides: 8, color: C1, up: [0, 1, 0] });
      mb.sweep([[0, -0.028 * k, 0.06 * k], [0, -0.03 * k, 0.1 * k], [0, -0.034 * k, 0.125 * k]], [[0.058 * k, 0.042 * k], [0.052 * k, 0.036 * k], [0.044 * k, 0.03 * k]], { sides: 8, color: C2, up: [0, 1, 0] });   // blunt muzzle
      mb.sweep([[0, -0.06 * k, 0.04 * k], [0, -0.066 * k, 0.1 * k]], [[0.04 * k, 0.018 * k], [0.03 * k, 0.012 * k]], { sides: 6, color: sh(C2, -0.06), up: [0, 1, 0] });   // lower jaw
      mb.blade([0, -0.006 * k, 0.13 * k], [0, -1, 0.25], 0.03 * k, 0.045 * k, 0.014 * k, NOSE, [1, 0, 0]);   // nose
      strokes(mb, [0, -0.052 * k, 0.126 * k], [1, 0, 0], [0, 1, 0], [[-0.03, 0.004, 0, 0], [0, 0, 0.03, 0.004], [0, 0, 0, 0.02]].map(q => q.map(v => v * k)), 0.004 * k, DARK);
      // eyes: left open (yellow) under a hard brow, right closed under the X scar
      mb.rbox(0.042 * k, 0.03 * k, 0.078 * k, 0.034 * k, 0.014 * k, 0.012 * k, '#f0d040', 0.3); mb.rbox(0.048 * k, 0.03 * k, 0.083 * k, 0.012 * k, 0.014 * k, 0.008 * k, NOSE, 0.3);
      strokes(mb, [0.042 * k, 0.045 * k, 0.086 * k], [1, 0, -0.3], [0, 1, 0], [[-0.022, -0.006, 0.02, 0.004]].map(q => q.map(v => v * k)), 0.007 * k, DARK);
      strokes(mb, [-0.045 * k, 0.03 * k, 0.083 * k], [-1, 0, -0.35], [0, 1, 0], [[-0.02, -0.02, 0.02, 0.02], [-0.02, 0.02, 0.02, -0.02]].map(q => q.map(v => v * k)), 0.007 * k, DARK);
      // ruff: spikes all round the face, dark red on top, orange with red tips down the sides
      for (let i = 0; i < 11; i++) {
        const ps = deg(-125 + i * 25);
        if (Math.abs(ps) < 0.35) continue;
        const up = Math.cos(ps) > 0.4;
        mb.blade([Math.sin(ps) * 0.085 * k, Math.cos(ps) * 0.075 * k + 0.01 * k, 0.0], [Math.sin(ps), Math.cos(ps) * 0.9, -0.55], (0.08 + (i % 2) * 0.025) * k, 0.07 * k, 0.022 * k, up ? MANE : C1, { radial: [0, 0.01 * k, 0] }, up ? CREST : MANE);
      }
      [1, -1].forEach(sd => mb.blade([sd * 0.055 * k, 0.07 * k, -0.02 * k], [sd * 0.4, 1, -0.25], 0.085 * k, 0.06 * k, 0.018 * k, C1, null, MANE));   // ears
      // the tall dark-red crest over the forehead + the white feathers on the left
      mb.blade([0, 0.075 * k, 0.0], [0, 1, -0.25], (battle ? 0.13 : 0.17) * k, 0.07 * k, 0.05 * k, CREST, [1, 0, 0]);
      mb.blade([0, 0.07 * k, -0.04 * k], [0, 0.8, -0.8], 0.12 * k, 0.065 * k, 0.04 * k, MANE, [1, 0, 0]);
      mb.blade([0.04 * k, 0.07 * k, -0.02 * k], [0.4, 1, -0.4], 0.2 * k, 0.045 * k, 0.012 * k, '#e8e8f0', null, '#9a8ae0');
      mb.blade([0.055 * k, 0.06 * k, -0.035 * k], [0.65, 0.9, -0.5], 0.17 * k, 0.035 * k, 0.012 * k, '#d8d8f0', null, '#7060c0');
      for (let i = 0; i < 3; i++) mb.sphere(-0.092 * k, -0.02 * k - i * 0.022 * k, 0.0, 0.01 * k, 0.01 * k, 0.01 * k, i % 2 ? '#e8e8f0' : '#3060c0', 5, 3);
    }));
    // tail with the flame tip
    const ts = battle ? 1 : 0.8;
    m.attach('tail', meshOf(mb => { const pts = mb.curvePts([[0, 0, 0], [0, 0.1 * ts, -0.12 * ts], [0, 0.26 * ts, -0.2 * ts], [0, 0.38 * ts, -0.16 * ts]], 2); mb.sweep(pts, pts.map((p, i) => 0.026 * ts * (1 - i / pts.length * 0.5)), { sides: 6, color: C1 }); }));
    m.attach('tail', meshOf(mb => { const t = [0, 0.38 * ts, -0.16 * ts]; [[0, 1, 0.3, 0.16, '#ffb020'], [0.3, 1, 0.1, 0.12, '#ff7010'], [-0.3, 1, 0.1, 0.12, '#ff7010'], [0, 0.8, -0.3, 0.1, '#ffe060']].forEach(([x, y, z, l, c]) => mb.blade(t, [x, y, z], l * ts, 0.07 * ts, 0.05 * ts, c, null, '#fff0a0')); }), null, { unlit: true });
    // legs run from the shoulder / hip to the ground: the paw soles land exactly on y = 0 in the rest pose.
    // Battle front legs reach forward and out in the crouch, the hind legs are digitigrade.
    const leg = (front, sd) => meshOf(mb => {
      const r = front ? L.fl : L.bl, sp = front ? spl : 0, H = (L.bodyY + r[1]) / Math.cos(sp);
      const path = front
        ? (battle ? [[0, 0.03, 0.0], [0, -H * 0.4, -0.05], [0, -H * 0.78, 0.02], [0, -H + 0.02, 0.06]] : [[0, 0.03, 0.0], [0, -H * 0.45, 0.0], [0, -H * 0.8, 0.005], [0, -H + 0.02, 0.012]])
        : (battle ? [[0, 0.03, 0.0], [0, -H * 0.35, 0.07], [0, -H * 0.7, -0.05], [0, -H + 0.02, -0.02]] : [[0, 0.03, -0.01], [0, -H * 0.4, 0.02], [0, -H * 0.8, -0.005], [0, -H + 0.02, 0.005]]);
      const t0 = (front ? 0.065 : 0.085) * (battle ? 1 : 1.05), t1 = battle ? 0.042 : 0.048;
      mb.sweep(path, [[t0, t0 * 1.15], [t1 * 1.1, t1 * 1.2], [t1 * 0.85, t1 * 0.9], [t1 * 0.85, t1 * 0.9]], { sides: 7, color: C1, up: [0, 0, 1] });
      const bz = path[2][2] * 0.7 + path[3][2] * 0.3;
      mb.loft([{ y: -H * 0.62, rx: t1 * 1.0, rz: t1 * 1.05, z: bz }, { y: -H * 0.76, rx: t1 * 0.98, rz: t1 * 1.03, z: bz }], { sides: 8, color: GOLD });
      const pz = path[3][2] + 0.022, pw = battle ? 0.07 : 0.075, ph = battle ? 0.032 : 0.036;
      mb.push(); mb.translate(0, -H, 0); mb.rotate(0, 0, -(sd || 0) * sp);   // the paw stays level when the leg is splayed
      mb.rbox(0, ph * 0.5, pz, pw, ph, battle ? 0.09 : 0.095, sh(C1, -0.12), 0.4);
      for (let i = -1; i <= 1; i++) mb.rbox(i * pw * 0.3, ph * 0.35, pz + 0.045, pw * 0.26, ph * 0.7, 0.02, sh(C1, -0.2), 0.4);   // toes
      mb.pop();
    });
    m.attach('legFL', leg(true, 1)); m.attach('legFR', leg(true, -1)); const bl = leg(false); m.attach('legBL', bl); m.attach('legBR', bl);
    m.height = L.bodyY + L.head[1] + 0.1 * k;
    m.anims = QUAD_ANIMS;
    // battle idle keeps the crouch (head low, tail raised) instead of the generic quadruped stance
    if (battle) m.clips = { q_battle: { dur: 60, fn(mm, p) { const br = Math.sin(p * Math.PI * 2); mm.b('body').pos[1] = br * 0.005; mm.b('head').rot[0] = 0.12 + br * 0.02; mm.b('tail').rot[0] = 0.8 + br * 0.1; } } };
    m.showWeapon = () => {};
    return m;
  };
  P.redxiii = { rig: 'redxiii', fieldScale: 1.12 };

  // ================================================================== Cait Sith (the crowned cat riding the big moogle)
  RIGS.caitsith = function (a, style) {
    const m = new FF7.Model(); m.app = a; m.rig = 'human';
    const battle = style === 'battle';
    // field (matched to FF7's field model): about 25% smaller than before next to the party, the moogle a big round
    // ball with a flat brow ledge over small slit eyes and a small fanged mouth, grey horn nubs, spread bat wings, cone
    // arms that reach the ground, round hip lobes, big flat triangular feet pointing forward, a flat tail and the
    // zip on its back
    const s = battle ? 1.05 : 0.8;
    const W = a.c1 || (battle ? '#f4e2e6' : '#eeeaee'), D = sh(W, -0.1), WING = '#4a1e62';
    m.bone('hips', null, [0, 0.16 * s, 0]);
    m.bone('torso', 'hips', [0, 0, 0]);
    m.bone('head', 'torso', battle ? [0, 0.7 * s, -0.02 * s] : [0, 0.58 * s, -0.15 * s]);   // the cat (in the field its body sits down inside the moogle's head)
    const ax = battle ? 0.3 : 0.31, ay = battle ? 0.46 : 0.52, ar = battle ? 0.55 : 0.08;
    m.bone('armL', 'torso', [ax * s, ay * s, 0.02 * s], [0, 0, ar]); m.bone('foreL', 'armL', [0, -0.13 * s, 0]); m.bone('handL', 'foreL', [0, -0.12 * s, 0]);
    m.bone('armR', 'torso', [-ax * s, ay * s, 0.02 * s], [0, 0, -ar]); m.bone('foreR', 'armR', [0, -0.13 * s, 0]); m.bone('handR', 'foreR', [0, -0.12 * s, 0]);
    m.bone('thighL', 'hips', [0.15 * s, 0, 0], [0, -0.35, 0]); m.bone('shinL', 'thighL', [0, -0.06 * s, 0]); m.bone('footL', 'shinL', [0, -0.06 * s, 0]);
    m.bone('thighR', 'hips', [-0.15 * s, 0, 0], [0, 0.35, 0]); m.bone('shinR', 'thighR', [0, -0.06 * s, 0]); m.bone('footR', 'shinR', [0, -0.06 * s, 0]);
    if (!battle) m.attach('torso', meshOf(mb => {
      mb.loft([{ y: -0.12 * s, rx: 0.16 * s, rz: 0.16 * s }, { y: -0.02 * s, rx: 0.34 * s, rz: 0.33 * s, z: 0.02 * s }, { y: 0.16 * s, rx: 0.43 * s, rz: 0.41 * s, z: 0.04 * s }, { y: 0.34 * s, rx: 0.42 * s, rz: 0.39 * s, z: 0.03 * s },
        { y: 0.48 * s, rx: 0.37 * s, rz: 0.34 * s, z: 0.01 * s }, { y: 0.58 * s, rx: 0.32 * s, rz: 0.29 * s }, { y: 0.66 * s, rx: 0.27 * s, rz: 0.24 * s }, { y: 0.7 * s, rx: 0.14 * s, rz: 0.12 * s }], { sides: 12, color: W, sq: 2.2 });
      mb.loft([{ y: 0.585 * s, rx: 0.335 * s, rz: 0.31 * s }, { y: 0.61 * s, rx: 0.35 * s, rz: 0.33 * s, z: 0.01 * s }], { sides: 12, color: sh(W, 0.03), sq: 2.2 });   // brow ledge
      [1, -1].forEach(sd => {
        mb.rbox(sd * 0.075 * s, 0.53 * s, 0.322 * s, 0.024 * s, 0.05 * s, 0.014 * s, '#141418', 0.3);   // slit eyes
        mb.blade([sd * 0.055 * s, 0.44 * s, 0.37 * s], [sd * 0.1, -1, 0.3], 0.035 * s, 0.022 * s, 0.012 * s, '#f8f8f4');   // little fangs
        mb.blade([sd * 0.2 * s, 0.63 * s, 0.05 * s], [sd * 0.5, 1, 0.1], 0.1 * s, 0.06 * s, 0.05 * s, '#b0b0b8', [0, 0, 1]);   // horn nubs
        const b = [sd * 0.16 * s, 0.62 * s, -0.2 * s], P = (x, y, z) => [sd * x * s, y * s, z * s];   // spread bat wings
        mb.tri(b, P(0.5, 0.8, -0.27), P(0.58, 0.62, -0.28), WING); mb.tri(b, P(0.58, 0.62, -0.28), P(0.48, 0.48, -0.26), sh(WING, -0.1)); mb.tri(b, P(0.48, 0.48, -0.26), P(0.3, 0.46, -0.23), WING);
        mb.blade(P(0.5, 0.8, -0.27), [sd * 0.2, 1, 0], 0.04 * s, 0.018 * s, 0.012 * s, '#e0c880');
      });
      mb.rbox(0, 0.452 * s, 0.366 * s, 0.13 * s, 0.014 * s, 0.012 * s, '#4a2a34', 0.3);   // small mouth
      mb.blade([0, -0.06 * s, -0.3 * s], [0, -0.3, -1], 0.34 * s, 0.14 * s, 0.03 * s, W, [1, 0, 0]);   // flat tail
      strokes(mb, [0, 0.26 * s, -0.375 * s], [-1, 0, 0], [0, 1, 0], [[0, -0.16 * s, 0, 0.14 * s], [-0.05 * s, 0.08 * s, 0, 0.15 * s], [0.05 * s, 0.08 * s, 0, 0.15 * s]], 0.028 * s, '#3a3a40');   // the zip
    }), null, { cull: false });
    // moogle body: big pear with a flat-topped head section, tiny slit eyes, little fangs, stubby ears, bat wings
    if (battle) m.attach('torso', meshOf(mb => {
      mb.loft([{ y: -0.06 * s, rx: 0.2 * s, rz: 0.18 * s }, { y: 0.04 * s, rx: 0.38 * s, rz: 0.33 * s }, { y: 0.2 * s, rx: 0.43 * s, rz: 0.37 * s }, { y: 0.36 * s, rx: 0.38 * s, rz: 0.33 * s }, { y: 0.5 * s, rx: 0.3 * s, rz: 0.27 * s }, { y: 0.6 * s, rx: 0.27 * s, rz: 0.25 * s }, { y: 0.68 * s, rx: 0.25 * s, rz: 0.22 * s }, { y: 0.71 * s, rx: 0.15 * s, rz: 0.13 * s }], { sides: 12, color: W, sq: 2.3 });
      // face: wide open red mouth with little fangs at the corners, angry dark brows (no visible eyes)
      mb.push(); mb.translate(0, 0.565 * s, 0.24 * s); mb.scale(1, 1, 0.45);
      mb.sphere(0, 0, 0, 0.16 * s, 0.05 * s, 0.05 * s, '#c4262e', 10, 5, true, (i, j) => j < 2 ? '#8a1018' : '#c4262e');
      mb.pop();
      mb.rbox(0, 0.595 * s, 0.25 * s, 0.24 * s, 0.012 * s, 0.012 * s, '#f4f0f0', 0.3);            // upper teeth line
      [1, -1].forEach(sd => {
        mb.blade([sd * 0.15 * s, 0.592 * s, 0.235 * s], [sd * 0.15, -1, 0.5], 0.042 * s, 0.026 * s, 0.014 * s, '#f0e0a0');   // fangs
        mb.push(); mb.translate(sd * 0.1 * s, 0.655 * s, 0.222 * s); mb.rotate(-0.35, sd * 0.35, 0);
        mb.panel([[-0.065, -0.014], [0.07, -0.002], [0.085, 0.034], [-0.045, 0.012]].map(p => [sd * p[0] * s, p[1] * s]), 0, 0.012 * s, '#4a2a4a');
        mb.pop();
        mb.blade([sd * 0.2 * s, 0.7 * s, 0.05 * s], [sd * 0.8, 0.6, 0], 0.08 * s, 0.07 * s, 0.05 * s, W, [0, 0, 1]);   // ear nubs
      });
      // small dark purple bat wings behind the head
      [1, -1].forEach(sd => {
        const b = [sd * 0.14 * s, 0.64 * s, -0.16 * s];
        mb.tri(b, [sd * 0.36 * s, 0.8 * s, -0.24 * s], [sd * 0.4 * s, 0.64 * s, -0.22 * s], WING);
        mb.tri(b, [sd * 0.4 * s, 0.64 * s, -0.22 * s], [sd * 0.34 * s, 0.52 * s, -0.2 * s], sh(WING, -0.15));
        mb.blade([sd * 0.36 * s, 0.8 * s, -0.24 * s], [sd * 0.2, 1, 0], 0.04 * s, 0.018 * s, 0.012 * s, '#e0c880');
      });
    }), null, { cull: false });
    // the cat (Model Reference r9c2, ff7gif03, caitsithref): black cat with a white muzzle and chest, big pointed
    // ears, gold crown, red cape, white gloves and red boots, standing on the moogle's head. The field cat is
    // mostly head (the body hides behind the moogle's brow); in battle the whole cat stands up, the megaphone
    // raised in its right hand.
    const kh = s * (battle ? 1.55 : 2.7), kb = s * (battle ? 1.55 : 1.35);
    const BK = '#1c1c22', WH = '#f4f4f4', RED = '#c02020', GOLD = '#e8c030';
    const hy = 0.1 * kb + 0.045 * kh;   // head centre above the cat's feet
    m.attach('head', meshOf(mb => {
      mb.loft([{ y: 0.0, rx: 0.036 * kb, rz: 0.03 * kb }, { y: 0.05 * kb, rx: 0.042 * kb, rz: 0.034 * kb }, { y: 0.09 * kb, rx: 0.036 * kb, rz: 0.03 * kb }, { y: 0.108 * kb, rx: 0.02 * kb, rz: 0.018 * kb }], { sides: 8, color: BK });
      mb.loft([{ y: 0.015 * kb, rx: 0.022 * kb, rz: 0.01 * kb, z: 0.026 * kb }, { y: 0.085 * kb, rx: 0.018 * kb, rz: 0.01 * kb, z: 0.026 * kb }], { sides: 6, color: WH });   // white chest
      mb.loft([{ y: 0.1 * kb, rx: 0.045 * kb, rz: 0.038 * kb, z: -0.004 * kb }, { y: -0.035 * kb, rx: 0.085 * kb, rz: 0.066 * kb, z: -0.024 * kb }], { sides: 8, color: RED, capTop: false, capBottom: false, arc: [deg(125), deg(415)] });   // cape
      mb.loft([{ y: 0.1 * kb, rx: 0.05 * kb, rz: 0.042 * kb }, { y: 0.085 * kb, rx: 0.056 * kb, rz: 0.046 * kb }], { sides: 8, color: RED });   // collar
      // legs + big red boots
      [1, -1].forEach(sd => { mb.loft([{ y: 0.02 * kb, rx: 0.014 * kb, rz: 0.014 * kb, x: sd * 0.02 * kb }, { y: -0.02 * kb, rx: 0.013 * kb, rz: 0.013 * kb, x: sd * 0.022 * kb }], { sides: 6, color: BK }); mb.rbox(sd * 0.024 * kb, -0.03 * kb, 0.01 * kb, 0.03 * kb, 0.024 * kb, 0.045 * kb, RED, 0.4); });
      mb.loft([{ y: 0.01 * kb, rx: 0.02 * kb, rz: 0.012 * kb }, { y: 0.03 * kb, rx: 0.009 * kb, rz: 0.009 * kb, z: -0.05 * kb }], { sides: 5, color: BK });   // tail root
      mb.sweep(mb.curvePts([[0, 0.02 * kb, -0.03 * kb], [0, 0.0, -0.07 * kb], [0.02 * kb, 0.04 * kb, -0.1 * kb], [0.03 * kb, 0.08 * kb, -0.09 * kb]], 2), [0.008 * kb, 0.008 * kb, 0.007 * kb, 0.006 * kb, 0.005 * kb, 0.004 * kb, 0], { sides: 4, color: BK });   // tail
      mb.loft([{ y: 0.085 * kb, rx: 0.012 * kb, rz: 0.012 * kb, x: 0.045 * kb }, { y: 0.03 * kb, rx: 0.011 * kb, rz: 0.011 * kb, x: 0.05 * kb }], { sides: 6, color: BK });   // left arm (the right one has its own bone)
      mb.sphere(0.05 * kb, 0.025 * kb, 0.004 * kb, 0.016 * kb, 0.016 * kb, 0.016 * kb, WH, 6, 4, true);
      // head: black with a white muzzle, big pointed ears, gold crown. Field: a wider, flatter head with a white face
      // over the whole front and big ears spread out sideways (white inside)
      const fh = battle ? 1 : 0.72;
      mb.sphere(0, hy, 0.004 * kh, 0.06 * kh, 0.053 * kh * fh, 0.05 * kh, BK, 10, 6, true);
      if (battle) mb.sphere(0, hy - 0.014 * kh, 0.024 * kh, 0.045 * kh, 0.034 * kh, 0.032 * kh, WH, 8, 5, true);
      else mb.sphere(0, hy - 0.006 * kh, 0.02 * kh, 0.054 * kh, 0.034 * kh, 0.036 * kh, WH, 8, 5, true);
      [1, -1].forEach(sd => {
        if (battle) mb.blade([sd * 0.036 * kh, hy + 0.03 * kh, -0.004 * kh], [sd * 0.6, 1, -0.05], 0.075 * kh, 0.055 * kh, 0.014 * kh, BK, null, sh(BK, 0.15));
        else { mb.blade([sd * 0.04 * kh, hy + 0.018 * kh, -0.006 * kh], [sd * 1, 0.85, -0.05], 0.068 * kh, 0.06 * kh, 0.012 * kh, BK, [0, 1, 0], sh(BK, 0.15)); mb.blade([sd * 0.042 * kh, hy + 0.018 * kh, 0.004 * kh], [sd * 1, 0.85, 0], 0.052 * kh, 0.042 * kh, 0.006 * kh, '#dcdce0', [0, 1, 0]); }
        mb.rbox(sd * 0.022 * kh, hy + 0.004 * kh, 0.052 * kh, 0.02 * kh, 0.006 * kh, 0.004 * kh, '#101014', 0.3);   // closed / narrow eyes
        mb.rbox(sd * 0.022 * kh, hy + 0.014 * kh, 0.05 * kh, 0.022 * kh, 0.004 * kh, 0.004 * kh, sh(BK, -0.3), 0.3);   // brows
      });
      mb.rbox(0, hy - 0.024 * kh, 0.056 * kh, 0.016 * kh, battle ? 0.012 * kh : 0.004 * kh, 0.004 * kh, battle ? '#901818' : '#a02020', 0.3);   // mouth (open in battle)
      mb.sphere(0, hy - 0.006 * kh, 0.056 * kh, 0.006 * kh, 0.005 * kh, 0.004 * kh, '#e07080', 5, 3, true);   // nose
      const cy = hy + (battle ? 0.046 : 0.034) * kh;
      mb.loft([{ y: cy, rx: 0.026 * kh, rz: 0.026 * kh }, { y: cy + 0.022 * kh, rx: 0.03 * kh, rz: 0.03 * kh }], { sides: 5, color: GOLD, capTop: false });
      for (let i = 0; i < 5; i++) { const an = i * Math.PI * 2 / 5; mb.blade([Math.cos(an) * 0.028 * kh, cy + 0.018 * kh, Math.sin(an) * 0.028 * kh], [0, 1, 0], 0.02 * kh, 0.014 * kh, 0.004 * kh, GOLD); }
    }), null, { cull: false });
    // the cat's right arm on its own bone: raised with the megaphone in battle, down at its side in the field
    m.bone('catArmR', 'head', [-0.045 * kb, 0.088 * kb, 0.004 * kb], battle ? [-0.5, 0, -2.5] : [0, 0, -0.35]);
    m.attach('catArmR', meshOf(mb => { mb.loft([{ y: 0.006 * kb, rx: 0.013 * kb, rz: 0.013 * kb }, { y: -0.055 * kb, rx: 0.011 * kb, rz: 0.011 * kb }], { sides: 6, color: BK }); mb.sphere(0, -0.062 * kb, 0, 0.016 * kb, 0.016 * kb, 0.016 * kb, WH, 6, 4, true); }));
    m.bone('weapon', 'catArmR', [0, -0.062 * kb, 0.0]);
    if (!battle) {   // field: cone arms standing on the ground, round hip lobes, flat triangular feet
      const arm = meshOf(mb => { mb.rbox(0, 0.05 * s, 0, 0.1 * s, 0.07 * s, 0.1 * s, W, 0.3); mb.loft([{ y: 0.03 * s, rx: 0.06 * s, rz: 0.06 * s }, { y: -0.3 * s, rx: 0.1 * s, rz: 0.09 * s }, { y: -0.62 * s, rx: 0.13 * s, rz: 0.11 * s }], { sides: 6, color: W, sq: 2.6 }); });
      const thigh = meshOf(mb => mb.sphere(0, 0.03 * s, 0.02 * s, 0.17 * s, 0.14 * s, 0.18 * s, D, 8, 5, true));
      const foot = meshOf(mb => {   // a wedge lying on the ground: tall at the heel, running out to a point at the toe
        const g = -0.04 * s, hl = [-0.15 * s, g, -0.08 * s], hr = [0.15 * s, g, -0.08 * s], ht = [0, g + 0.13 * s, -0.08 * s], toe = [0, g, 0.5 * s];
        mb.tri(hl, hr, ht, D); mb.tri(hl, toe, hr, D); mb.tri(hl, ht, toe, W); mb.tri(hr, toe, ht, sh(W, -0.04));
      });
      ['L', 'R'].forEach(sd => { m.attach('arm' + sd, arm); m.attach('thigh' + sd, thigh); m.attach('foot' + sd, foot, null, { cull: false }); });
    } else {
      const arm = meshOf(mb => mb.loft([{ y: 0.05 * s, rx: 0.08 * s, rz: 0.07 * s }, { y: -0.13 * s, rx: 0.1 * s, rz: 0.08 * s }], { sides: 8, color: W }));
      const fore = meshOf(mb => mb.loft([{ y: 0.0, rx: 0.1 * s, rz: 0.08 * s }, { y: -0.12 * s, rx: 0.12 * s, rz: 0.085 * s }], { sides: 8, color: W }));
      const hand = meshOf(mb => mb.rbox(0, -0.05 * s, 0, 0.16 * s, 0.13 * s, 0.12 * s, W, 0.4));
      const thigh = meshOf(mb => mb.loft([{ y: 0.03, rx: 0.1 * s, rz: 0.1 * s }, { y: -0.06 * s, rx: 0.09 * s, rz: 0.09 * s }], { sides: 8, color: W }));
      const shin = meshOf(mb => mb.loft([{ y: 0, rx: 0.09 * s, rz: 0.09 * s }, { y: -0.06 * s, rx: 0.085 * s, rz: 0.085 * s }], { sides: 8, color: W }));
      const foot = meshOf(mb => mb.rbox(0, -0.01 * s, 0.07 * s, 0.22 * s, 0.06 * s, 0.34 * s, D, 0.35));   // sole on the ground
      ['L', 'R'].forEach(sd => { m.attach('arm' + sd, arm); m.attach('fore' + sd, fore); m.attach('hand' + sd, hand); m.attach('thigh' + sd, thigh); m.attach('shin' + sd, shin); m.attach('foot' + sd, foot); });
    }
    m.weaponMesh = meshOf(mb => { mb.push(); mb.rotate(-0.7, 0, 0); C3.WEAPON.megaphone(mb, kb * 0.8); mb.pop(); });   // held up, the bell tipped forward
    m.showWeapon = function (on) { m.bones.weapon.meshes = on ? [{ mesh: m.weaponMesh, m: null, opts: { cull: false } }] : []; };
    m.height = 1.0 * s;
    m.anims = HUM_ANIMS;
    // the humanoid clips bend knees and drop the hips, which pushed the moogle's big flat feet into the floor:
    // keep the feet planted (small shuffles only) and never lower the body below its rest height
    m.onPose = (mm) => {
      if (/dead|lie/.test(mm.clipName || '')) return;   // (falling over is fine)
      const k = /walk|run/.test(mm.clipName || '') ? 0.3 : 0;
      ['thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'].forEach(n => { const b = mm.bones[n]; b.rot[0] = b.rest[0] + (b.rot[0] - b.rest[0]) * k; b.rot[2] = b.rest[2]; });
      const h = mm.bones.hips; h.pos[1] = Math.max(h.pos[1], 0); h.rot[0] *= 0.3;
    };
    return m;
  };
  P.caitsith = { rig: 'caitsith' };

  // ================================================================== Chocobo
  RIGS.chocobo = function (a) {
    const m = new FF7.Model(); m.app = a; m.rig = 'human';
    // Matched to FF7's field / world map model (references/overworld models): a compact egg-shaped body, a slim
    // S-curved neck, a big round head with a large hooked beak and a crest of four feathers, wings folded at the sides
    // as fans of long feathers, a tall fan of narrow tail feathers raised behind, feathered thighs over long thin dark
    // legs set a little apart, and three spread toes with long pale talons. The back stays at the rider's seat height.
    const Y = a.c1 || '#f2d24a', Y2 = a.c2 || '#dcae2a', BK = a.c3 || '#e8a030', LEG = a.legColor || '#5a4630', TAL = a.talon || '#e0e8f0';
    m.bone('hips', null, [0, 0.62, 0]); m.bone('torso', 'hips', [0, 0, 0]); m.bone('head', 'torso', [0, 0.46, 0.28], [-0.1, 0, 0]);
    m.bone('armL', 'torso', [0.16, 0.1, 0.06]); m.bone('armR', 'torso', [-0.16, 0.1, 0.06]);
    m.bone('thighL', 'hips', [0.11, -0.06, 0.02], [0, 0, 0.13]); m.bone('shinL', 'thighL', [0, -0.26, 0.02]); m.bone('footL', 'shinL', [0, -0.28, 0], [0, 0, -0.13]);
    m.bone('thighR', 'hips', [-0.11, -0.06, 0.02], [0, 0, -0.13]); m.bone('shinR', 'thighR', [0, -0.26, 0.02]); m.bone('footR', 'shinR', [0, -0.28, 0], [0, 0, 0.13]);
    m.attach('torso', meshOf(mb => {
      mb.sweep([[0, 0.1, -0.26], [0, 0.05, -0.18], [0, 0.03, -0.02], [0, 0.05, 0.14], [0, 0.12, 0.25]], [[0.07, 0.07], [0.17, 0.16], [0.2, 0.2], [0.19, 0.2], [0.12, 0.13]], { sides: 10, color: Y, up: [0, 1, 0] });
      mb.sweep(mb.curvePts([[0, 0.12, 0.22], [0, 0.26, 0.31], [0, 0.38, 0.29], [0, 0.47, 0.27]], 2), [0.12, 0.1, 0.085, 0.075, 0.068, 0.064, 0.062], { sides: 8, color: Y });
      // tall fan of tail feathers, spread sideways and from nearly level to steeply raised
      for (let i = 0; i < 6; i++) { const el = deg(24 + i * 9); mb.blade([(i - 2.5) * 0.025, 0.1, -0.22], [(i - 2.5) * 0.16, Math.sin(el), -Math.cos(el)], 0.5 - Math.abs(i - 2.5) * 0.03, 0.085, 0.018, i % 2 ? Y2 : Y, { radial: [0, 0.2, -0.1] }); }
      // breast feathers
      for (let i = 0; i < 4; i++) mb.blade([(i - 1.5) * 0.06, 0.1, 0.27], [(i - 1.5) * 0.25, -1, 0.35], 0.13, 0.07, 0.02, sh(Y, 0.06), { radial: [0, 0.1, 0.05] });
    }));
    m.attach('head', meshOf(mb => {
      mb.sphere(0, 0.06, 0.02, 0.12, 0.115, 0.15, Y, 10, 6, true);
      mb.sweep([[0, 0.04, 0.12], [0, 0.025, 0.22], [0, -0.015, 0.3], [0, -0.075, 0.33]], [[0.075, 0.06], [0.062, 0.046], [0.036, 0.028], [0.004, 0.004]], { sides: 6, color: BK, up: [0, 1, 0] });   // big hooked beak
      [1, -1].forEach(sd => { mb.rbox(sd * 0.1, 0.1, 0.08, 0.012, 0.042, 0.036, '#f4f4f4', 0.3); mb.rbox(sd * 0.106, 0.1, 0.084, 0.008, 0.03, 0.024, a.eye || '#2a4ab0', 0.3); });
      [[0, 0.16, -0.01, [0, 1, 0.05]], [0.045, 0.15, -0.04, [0.3, 1, -0.35]], [-0.045, 0.15, -0.04, [-0.3, 1, -0.35]], [0, 0.14, -0.08, [0, 0.8, -0.8]]].forEach(([x, y, z, d]) => mb.blade([x, y, z], d, 0.2, 0.06, 0.025, Y2, [1, 0, 0], Y));   // crest
    }));
    // wings folded at the sides: fans of long feathers pointing back and down, their tips flaring out
    const wing = (sd) => meshOf(mb => { [[0.44, -0.3, 0.22], [0.38, -0.6, 0.18], [0.3, -0.95, 0.15]].forEach(([L, dy, w], i) => mb.blade([sd * 0.02, 0.03 - i * 0.02, 0.07 - i * 0.03], [sd * 0.3, dy, -1], L, w, 0.03, i % 2 ? Y : Y2, [0, 1, -0.3], i % 2 ? Y2 : Y)); });
    m.attach('armL', wing(1)); m.attach('armR', wing(-1));
    const thigh = meshOf(mb => {
      mb.loft([{ y: 0.06, rx: 0.1, rz: 0.13 }, { y: -0.07, rx: 0.095, rz: 0.115 }, { y: -0.17, rx: 0.06, rz: 0.07 }, { y: -0.2, rx: 0.036, rz: 0.036, color: LEG }, { y: -0.27, rx: 0.034, rz: 0.034 }], { sides: 8, color: Y });
      for (let i = 0; i < 4; i++) { const an = deg(i * 90 + 45); mb.blade([Math.cos(an) * 0.07, -0.12, Math.sin(an) * 0.08], [Math.cos(an) * 0.25, -1, Math.sin(an) * 0.25], 0.1, 0.1, 0.02, i % 2 ? Y2 : Y, { radial: [0, -0.12, 0] }); }   // feathered edge
    });
    const shin = meshOf(mb => mb.loft([{ y: 0, rx: 0.034, rz: 0.034 }, { y: -0.28, rx: 0.024, rz: 0.024 }], { sides: 6, color: LEG }));
    const foot = meshOf(mb => { for (let i = -1; i <= 1; i++) mb.blade([0, -0.004, 0], [i * 0.6, -0.08, 1], 0.2, 0.045, 0.024, LEG, null, TAL); mb.blade([0, -0.004, 0], [0, -0.08, -1], 0.11, 0.035, 0.022, LEG, null, TAL); });
    ['L', 'R'].forEach(sd => { m.attach('thigh' + sd, thigh); m.attach('shin' + sd, shin); m.attach('foot' + sd, foot); });
    m.height = 1.3;
    m.anims = { idle: 'idle', walk: 'walk', run: 'run', battle: 'idle', attack: 'kick', hurt: 'hurt', dead: 'dead', cast: 'idle', item: 'idle', victory: 'jump', weak: 'idle', defend: 'idle' };
    m.showWeapon = () => {};
    return m;
  };
  P.chocobo = { rig: 'chocobo' };
  P.chocobo_black = { rig: 'chocobo', c1: '#303038', c2: '#202028', c3: '#e0c040', eye: '#c02020' };
  P.chocobo_gold = { rig: 'chocobo', c1: '#e0b030', c2: '#c8841c', c3: '#f09020' };   // rich gold with an orange shade

  // ================================================================== Moogle
  // Matched to FF7's Mog (references/overworld models): a big round head (half the height) with short pointed cat
  // ears, closed eyes, a small red nose and whiskers on a round body with a jagged chest tuft, short cone arms, big
  // round feet, a small tail and red bat wings spread sideways from the upper back. FF7's moogles have no pompom.
  RIGS.moogle = function (a, style) {
    const m = new FF7.Model(); m.app = a; m.rig = 'human';
    const W = a.c1 || '#e8f0dc', D = sh(W, -0.1), T = 0.72, WG = a.wing || '#d05c5c', PK = '#d5738f';
    m.bone('hips', null, [0, 0.14 * T, 0]); m.bone('torso', 'hips', [0, 0, 0]); m.bone('head', 'torso', [0, 0.36 * T, 0.01 * T]);
    m.bone('armL', 'torso', [0.2 * T, 0.37 * T, 0.03 * T], [0, 0, 0.4]); m.bone('foreL', 'armL', [0, -0.15 * T, 0]); m.bone('handL', 'foreL', [0, -0.1 * T, 0]);
    m.bone('armR', 'torso', [-0.2 * T, 0.37 * T, 0.03 * T], [0, 0, -0.4]); m.bone('foreR', 'armR', [0, -0.15 * T, 0]); m.bone('handR', 'foreR', [0, -0.1 * T, 0]);
    m.bone('thighL', 'hips', [0.14 * T, 0, 0]); m.bone('shinL', 'thighL', [0, -0.03 * T, 0]); m.bone('footL', 'shinL', [0, -0.03 * T, 0]);
    m.bone('thighR', 'hips', [-0.14 * T, 0, 0]); m.bone('shinR', 'thighR', [0, -0.03 * T, 0]); m.bone('footR', 'shinR', [0, -0.03 * T, 0]);
    m.bone('weapon', 'handR', [0, -0.02, 0]);
    m.attach('torso', meshOf(mb => {
      mb.loft([{ y: -0.1 * T, rx: 0.15 * T, rz: 0.14 * T }, { y: 0, rx: 0.24 * T, rz: 0.23 * T }, { y: 0.13 * T, rx: 0.265 * T, rz: 0.25 * T }, { y: 0.26 * T, rx: 0.24 * T, rz: 0.23 * T }, { y: 0.36 * T, rx: 0.19 * T, rz: 0.18 * T }, { y: 0.42 * T, rx: 0.1 * T, rz: 0.1 * T }], { sides: 10, color: W, smooth: false });
      for (let i = 0; i < 5; i++) mb.blade([(i - 2) * 0.05 * T, 0.3 * T, 0.2 * T], [(i - 2) * 0.35, -1, 0.35], (i % 2 ? 0.12 : 0.16) * T, 0.08 * T, 0.03 * T, i % 2 ? D : W, { radial: [0, 0.2 * T, 0] });   // chest tuft
      mb.blade([0, 0.0, -0.22 * T], [0, 0.6, -1], 0.14 * T, 0.07 * T, 0.05 * T, W, [1, 0, 0]);   // small tail
      [1, -1].forEach(sd => {   // red bat wings spread sideways from the upper back
        const P = (x, y, z) => [sd * x * T, y * T, z * T], B = P(0.06, 0.4, -0.14), P0 = P(0.2, 0.52, -0.22), P1 = P(0.4, 0.56, -0.3), P2 = P(0.33, 0.44, -0.27), Q = P(0.27, 0.36, -0.25), P3 = P(0.2, 0.42, -0.22), R = P(0.13, 0.33, -0.19);
        mb.tri(B, P0, P3, WG); mb.tri(P0, P1, P2, sh(WG, 0.06)); mb.tri(P0, P2, P3, sh(WG, -0.08)); mb.tri(P2, Q, P3, WG); mb.tri(B, P3, R, sh(WG, 0.04));
      });
    }), null, { cull: false });
    // a.shade: the whole head lost in darkness under a hood or a mage's hat (the Black Mage look: no face, only the two
    // glowing eyes the caller adds), ears and all, no nose, mouth or whiskers
    const HW = a.shade || W;
    m.attach('head', meshOf(mb => {
      mb.loft([{ y: -0.02 * T, rx: 0.15 * T, rz: 0.14 * T }, { y: 0.05 * T, rx: 0.21 * T, rz: 0.19 * T, z: 0.01 * T }, { y: 0.2 * T, rx: 0.225 * T, rz: 0.21 * T, z: 0.01 * T }, { y: 0.34 * T, rx: 0.2 * T, rz: 0.19 * T }, { y: 0.42 * T, rx: 0.13 * T, rz: 0.13 * T }, { y: 0.45 * T, rx: 0.04 * T, rz: 0.04 * T }], { sides: 10, color: HW, sq: 2.3, smooth: false });
      [1, -1].forEach(sd => {
        mb.blade([sd * 0.15 * T, 0.37 * T, -0.01 * T], [sd * 0.55, 1, 0], 0.13 * T, 0.11 * T, 0.03 * T, HW, [0, 0, 1]);   // pointed cat ears
        if (a.shade) return;
        mb.blade([sd * 0.15 * T, 0.37 * T, 0.008 * T], [sd * 0.55, 1, 0], 0.1 * T, 0.07 * T, 0.01 * T, PK, [0, 0, 1]);
        strokes(mb, [sd * 0.075 * T, 0.235 * T, 0.222 * T], [sd, 0, 0], [0, 1, 0], [[-0.035 * T, 0, 0, -0.012 * T], [0, -0.012 * T, 0.035 * T, 0]], 0.01 * T, '#141418');   // closed eyes
        strokes(mb, [sd * 0.08 * T, 0.16 * T, 0.215 * T], [sd, 0, -0.3], [0, 1, 0], [[0, 0.01 * T, 0.09 * T, 0.03 * T], [0, -0.01 * T, 0.09 * T, -0.02 * T]], 0.005 * T, '#303030');   // whiskers
      });
      if (a.shade) return;
      mb.sphere(0, 0.165 * T, 0.225 * T, 0.035 * T, 0.03 * T, 0.03 * T, a.c2 || '#d23d3d', 6, 4, false);   // red nose
      mb.rbox(0, 0.115 * T, 0.212 * T, 0.03 * T, 0.012 * T, 0.01 * T, '#6a2a2a', 0.3);   // small mouth
    }));
    const arm = meshOf(mb => mb.loft([{ y: 0.03 * T, rx: 0.06 * T, rz: 0.06 * T }, { y: -0.15 * T, rx: 0.065 * T, rz: 0.06 * T }], { sides: 6, color: W, smooth: false }));
    const fore = meshOf(mb => mb.loft([{ y: 0.01 * T, rx: 0.065 * T, rz: 0.06 * T }, { y: -0.1 * T, rx: 0.06 * T, rz: 0.055 * T }], { sides: 6, color: W, smooth: false }));
    const paw = meshOf(mb => mb.sphere(0, -0.02 * T, 0.01 * T, 0.055 * T, 0.05 * T, 0.055 * T, W, 6, 4, false));
    const thigh = meshOf(mb => mb.loft([{ y: 0.03 * T, rx: 0.07 * T, rz: 0.07 * T }, { y: -0.04 * T, rx: 0.07 * T, rz: 0.07 * T }], { sides: 6, color: W, smooth: false }));
    const foot = meshOf(mb => mb.sphere(0, -0.005 * T, 0.05 * T, 0.13 * T, 0.075 * T, 0.18 * T, D, 8, 5, false));   // big round foot, sole on the ground
    ['L', 'R'].forEach(sd => { m.attach('arm' + sd, arm); m.attach('fore' + sd, fore); m.attach('hand' + sd, paw); m.attach('thigh' + sd, thigh); m.attach('foot' + sd, foot); });
    m.height = T;
    m.anims = HUM_ANIMS;
    m.showWeapon = () => {};
    return m;
  };
  P.moogle = { rig: 'moogle' };

  // ================================================================== dog / cat / bird (small quadrupeds), Dark Nation
  RIGS.dog = function (a) {
    const m = new FF7.Model(); m.app = a; m.rig = 'quad';
    const s = a.small ? 0.55 : (a.scale || 0.8), C1 = a.c1 || '#a07040', C2 = a.c2 || '#f0e0c0';
    const legH = 0.22 * s;
    m.bone('body', null, [0, legH + 0.05 * s, 0]); m.bone('head', 'body', [0, 0.09 * s, 0.2 * s]); m.bone('tail', 'body', [0, 0.05 * s, -0.2 * s], [0.5, 0, 0]);
    m.bone('legFL', 'body', [0.06 * s, 0, 0.13 * s]); m.bone('legFR', 'body', [-0.06 * s, 0, 0.13 * s]); m.bone('legBL', 'body', [0.06 * s, 0, -0.13 * s]); m.bone('legBR', 'body', [-0.06 * s, 0, -0.13 * s]);
    m.attach('body', meshOf(mb => {
      mb.sweep([[0, 0.02 * s, -0.22 * s], [0, 0.01 * s, -0.12 * s], [0, 0.0, 0.06 * s], [0, 0.02 * s, 0.16 * s], [0, 0.06 * s, 0.22 * s]], [[0.04 * s, 0.04 * s], [0.07 * s, 0.075 * s], [0.07 * s, 0.075 * s], [0.08 * s, 0.09 * s], [0.05 * s, 0.05 * s]], { sides: 8, color: C1, up: [0, 1, 0] });
      if (a.darkNation) for (const sd of [1, -1]) { const b = [sd * 0.06 * s, 0.07 * s, 0.1 * s]; mb.sweep(mb.curvePts([b, [sd * 0.1 * s, 0.12 * s, 0.04 * s], [sd * 0.12 * s, 0.14 * s, -0.06 * s], [sd * 0.08 * s, 0.1 * s, -0.14 * s]], 2), [0.012 * s, 0.011 * s, 0.01 * s, 0.008 * s, 0.006 * s, 0.004 * s, 0], { sides: 5, color: a.c3 || '#3a4a9a' }); }
    }));
    m.attach('head', meshOf(mb => {
      mb.sphere(0, 0.03 * s, 0.03 * s, 0.065 * s, 0.06 * s, 0.07 * s, C1, 8, 5, true);
      mb.rbox(0, 0.0, 0.1 * s, 0.05 * s, 0.045 * s, 0.08 * s, C2, 0.35);
      mb.rbox(0, 0.018 * s, 0.14 * s, 0.022 * s, 0.018 * s, 0.015 * s, '#1a1010', 0.4);
      [1, -1].forEach(sd => { mb.blade([sd * 0.04 * s, 0.07 * s, 0], [sd * 0.3, 1, -0.2], (a.darkNation ? 0.08 : 0.06) * s, 0.035 * s, 0.01 * s, sh(C1, -0.15)); mb.rbox(sd * 0.035 * s, 0.045 * s, 0.075 * s, 0.015 * s, 0.012 * s, 0.006, a.eyes || '#101010', 0.3); });
    }));
    m.attach('tail', meshOf(mb => { mb.push(); mb.rotate(-1.2, 0, 0); mb.loft([{ y: 0, rx: 0.018 * s, rz: 0.018 * s }, { y: (a.darkNation ? 0.24 : 0.16) * s, rx: 0.01 * s, rz: 0.01 * s }], { sides: 5, color: C1 }); mb.pop(); }));
    const L = legH + 0.05 * s;   // leg root to the ground (the paw sole lands on y = 0)
    const leg = meshOf(mb => { mb.loft([{ y: 0.02, rx: 0.03 * s, rz: 0.035 * s }, { y: -L * 0.5, rx: 0.024 * s, rz: 0.026 * s }, { y: -L + 0.01 * s, rx: 0.022 * s, rz: 0.024 * s }], { sides: 6, color: C1 }); mb.rbox(0, -L + 0.01 * s, 0.012 * s, 0.035 * s, 0.02 * s, 0.045 * s, C2, 0.3); });
    ['legFL', 'legFR', 'legBL', 'legBR'].forEach(n => m.attach(n, leg));
    m.height = legH + 0.2 * s;
    m.anims = QUAD_ANIMS;
    m.showWeapon = () => {};
    return m;
  };
  P.dog = { rig: 'dog', c1: '#a07040', c2: '#f0e0c0' };
  // Cat: small, low and long-tailed: short legs, round head with pointed ears, white chest, muzzle and paws
  RIGS.cat = function (a) {
    const m = new FF7.Model(); m.app = a; m.rig = 'quad';
    const s = a.scale || 0.5, C1 = a.c1 || '#8a8a8a', C2 = a.c2 || '#f0f0f0', D = sh(C1, -0.2);
    const legH = 0.11 * s, bodyY = legH + 0.05 * s;
    m.bone('body', null, [0, bodyY, 0]); m.bone('head', 'body', [0, 0.08 * s, 0.17 * s]); m.bone('tail', 'body', [0, 0.04 * s, -0.17 * s], [0.3, 0, 0]);
    m.bone('legFL', 'body', [0.05 * s, -0.02 * s, 0.11 * s]); m.bone('legFR', 'body', [-0.05 * s, -0.02 * s, 0.11 * s]);
    m.bone('legBL', 'body', [0.05 * s, -0.01 * s, -0.11 * s]); m.bone('legBR', 'body', [-0.05 * s, -0.01 * s, -0.11 * s]);
    m.attach('body', meshOf(mb => {
      mb.sweep([[0, 0.02 * s, -0.19 * s], [0, 0.02 * s, -0.12 * s], [0, 0.0, 0.0], [0, 0.02 * s, 0.1 * s], [0, 0.05 * s, 0.16 * s]], [[0.03 * s, 0.03 * s], [0.06 * s, 0.065 * s], [0.055 * s, 0.06 * s], [0.06 * s, 0.07 * s], [0.04 * s, 0.045 * s]], { sides: 8, color: C1, up: [0, 1, 0] });
      mb.sphere(0, -0.01 * s, 0.11 * s, 0.035 * s, 0.045 * s, 0.05 * s, C2, 6, 4, true);   // white chest
      if (a.stripes !== false) for (let i = 0; i < 3; i++) strokes(mb, [0, 0.066 * s, (-0.1 + i * 0.07) * s], [1, 0, 0], [0, 0, 1], [[-0.04, 0, 0.04, 0]].map(q => q.map(v => v * s)), 0.012 * s, D);
      // Dark Nation: two thick tentacle whips rising from the shoulders and arcing back over the body
      if (a.tentacles) for (const sd of [1, -1]) { const pts = mb.curvePts([[sd * 0.04 * s, 0.05 * s, 0.1 * s], [sd * 0.09 * s, 0.17 * s, 0.05 * s], [sd * 0.12 * s, 0.24 * s, -0.08 * s], [sd * 0.1 * s, 0.2 * s, -0.22 * s], [sd * 0.07 * s, 0.1 * s, -0.3 * s]], 2); mb.sweep(pts, pts.map((q, i) => 0.024 * s * (1 - i / (pts.length - 1)) + 0.002 * s), { sides: 6, color: a.c3 || C1 }); }
    }), null, { cull: false });
    m.attach('head', meshOf(mb => {
      mb.sphere(0, 0.03 * s, 0.02 * s, 0.065 * s, 0.058 * s, 0.058 * s, C1, 8, 6, true);
      mb.sphere(0, 0.012 * s, 0.065 * s, 0.032 * s, 0.024 * s, 0.022 * s, C2, 6, 4, true);   // muzzle
      mb.sphere(0, 0.026 * s, 0.084 * s, 0.008 * s, 0.006 * s, 0.005 * s, a.tentacles ? '#101418' : '#e08090', 5, 3, true);   // nose
      [1, -1].forEach(sd => {
        mb.blade([sd * 0.036 * s, 0.07 * s, 0.01 * s], [sd * 0.35, 1, 0.05], 0.05 * s, 0.045 * s, 0.012 * s, C1, [0, 0, 1], sh(C1, 0.1));   // pointed ears
        mb.rbox(sd * 0.026 * s, 0.04 * s, 0.069 * s, 0.018 * s, 0.014 * s, 0.006 * s, a.eyes || '#b0d040', 0.3); mb.rbox(sd * 0.026 * s, 0.04 * s, 0.072 * s, 0.004 * s, 0.013 * s, 0.004 * s, '#101010', 0.3);
        if (!a.tentacles) strokes(mb, [sd * 0.03 * s, 0.012 * s, 0.075 * s], [sd, 0, 0.3], [0, 1, 0], [[0, 0, 0.05, 0.008], [0, -0.006, 0.05, -0.01]].map(q => q.map(v => v * s)), 0.002 * s, '#f8f8f8');   // whiskers
      });
    }));
    m.attach('tail', meshOf(mb => { const pts = mb.curvePts([[0, 0, 0], [0, 0.02 * s, -0.1 * s], [0, 0.12 * s, -0.2 * s], [0, 0.24 * s, -0.2 * s]], 2); mb.sweep(pts, pts.map((p, i) => 0.014 * s * (1 - i / pts.length * 0.4)), { sides: 5, color: C1, colors: (q, i, n) => q >= pts.length - 3 ? D : null }); }));
    const leg = meshOf(mb => { const H = legH + 0.03 * s; mb.loft([{ y: 0.02 * s, rx: 0.026 * s, rz: 0.03 * s }, { y: -H * 0.5, rx: 0.018 * s, rz: 0.02 * s }, { y: -H + 0.012 * s, rx: 0.016 * s, rz: 0.018 * s }], { sides: 6, color: C1 }); mb.rbox(0, -H + 0.009 * s, 0.01 * s, 0.03 * s, 0.018 * s, 0.04 * s, C2, 0.4); });
    const legB = meshOf(mb => { const H = legH + 0.04 * s; mb.loft([{ y: 0.02 * s, rx: 0.03 * s, rz: 0.04 * s }, { y: -H * 0.5, rx: 0.02 * s, rz: 0.022 * s, z: -0.012 * s }, { y: -H + 0.012 * s, rx: 0.016 * s, rz: 0.018 * s }], { sides: 6, color: C1 }); mb.rbox(0, -H + 0.009 * s, 0.01 * s, 0.03 * s, 0.018 * s, 0.04 * s, C2, 0.4); });
    m.attach('legFL', leg); m.attach('legFR', leg); m.attach('legBL', legB); m.attach('legBR', legB);
    m.height = bodyY + 0.2 * s;
    m.anims = QUAD_ANIMS;
    m.showWeapon = () => {};
    return m;
  };
  // Bird: round body, small head with a beak, folded wings (on the back leg bones, so they flap), tail fan and
  // two thin legs with three toes. It hops when walking and flaps when running.
  RIGS.bird = function (a) {
    const m = new FF7.Model(); m.app = a; m.rig = 'quad';
    const s = a.scale || 0.5, C1 = a.c1 || '#f0f0f0', C2 = a.c2 || '#a0a0a0', BK = a.beak || '#e8a030';
    const legH = 0.1 * s, bodyY = legH + 0.07 * s;
    m.bone('body', null, [0, bodyY, 0], [-0.25, 0, 0]); m.bone('head', 'body', [0, 0.06 * s, 0.075 * s]); m.bone('tail', 'body', [0, 0.01 * s, -0.09 * s]);
    m.bone('legFL', 'body', [0.03 * s, -0.035 * s, 0.0], [0.25, 0, 0]); m.bone('legFR', 'body', [-0.03 * s, -0.035 * s, 0.0], [0.25, 0, 0]);   // the two legs
    m.bone('legBL', 'body', [0.06 * s, 0.03 * s, 0.03 * s]); m.bone('legBR', 'body', [-0.06 * s, 0.03 * s, 0.03 * s]);   // the wings
    m.attach('body', meshOf(mb => { mb.sphere(0, 0, 0, 0.07 * s, 0.07 * s, 0.1 * s, C1, 8, 6, true); mb.sphere(0, -0.02 * s, 0.03 * s, 0.055 * s, 0.05 * s, 0.07 * s, sh(C1, 0.04), 6, 4, true); }));
    m.attach('head', meshOf(mb => {
      mb.sphere(0, 0.02 * s, 0.01 * s, 0.045 * s, 0.045 * s, 0.045 * s, C1, 8, 5, true);
      mb.sphere(0, -0.02 * s, -0.01 * s, 0.035 * s, 0.035 * s, 0.035 * s, C1, 6, 4, true);   // neck
      mb.push(); mb.translate(0, 0.015 * s, 0.045 * s); mb.rotate(Math.PI / 2 + 0.15, 0, 0); mb.loft([{ y: 0, rx: 0.014 * s, rz: 0.011 * s }, { y: 0.04 * s, rx: 0.002 * s, rz: 0.002 * s }], { sides: 5, color: BK }); mb.pop();
      [1, -1].forEach(sd => mb.rbox(sd * 0.03 * s, 0.028 * s, 0.032 * s, 0.006 * s, 0.012 * s, 0.01 * s, '#101010', 0.3));
    }));
    m.attach('tail', meshOf(mb => { for (let i = -1; i <= 1; i++) mb.blade([i * 0.012 * s, 0, 0], [i * 0.35, 0.3, -1], 0.08 * s, 0.035 * s, 0.008 * s, i ? C2 : sh(C2, -0.08), [0, 1, 0]); }));
    const wing = (sd) => meshOf(mb => { mb.blade([0, 0, 0.02 * s], [sd * 0.15, -0.2, -1], 0.13 * s, 0.07 * s, 0.012 * s, C2, [0, 1, 0], sh(C2, -0.15)); mb.blade([sd * 0.005 * s, -0.01 * s, 0.0], [sd * 0.1, -0.35, -1], 0.1 * s, 0.05 * s, 0.01 * s, sh(C2, 0.08), [0, 1, 0]); });
    m.attach('legBL', wing(1)); m.attach('legBR', wing(-1));
    const leg = meshOf(mb => { const H = legH + 0.036 * s; mb.loft([{ y: 0.01 * s, rx: 0.012 * s, rz: 0.014 * s, color: C1 }, { y: -H * 0.35, rx: 0.005 * s, rz: 0.005 * s }, { y: -H, rx: 0.004 * s, rz: 0.004 * s }], { sides: 4, color: BK }); mb.push(); mb.translate(0, -H, 0); for (let i = -1; i <= 1; i++) mb.blade([0, 0.003 * s, 0], [i * 0.45, 0, 1], 0.035 * s, 0.008 * s, 0.006 * s, BK, [0, 1, 0]); mb.blade([0, 0.003 * s, 0], [0, 0, -1], 0.02 * s, 0.008 * s, 0.006 * s, BK, [0, 1, 0]); mb.pop(); });
    m.attach('legFL', leg); m.attach('legFR', leg);
    m.height = bodyY + 0.14 * s;
    m.anims = QUAD_ANIMS;
    // bird gaits: hop and bob the head when walking, flap the wings when running / flying off
    m.clips = {
      q_idle: { dur: 90, fn(mm, p) { const k = Math.max(0, Math.sin(p * Math.PI * 6)) * (p > 0.5 ? 1 : 0); mm.b('head').rot[0] = k * 0.6; mm.b('tail').rot[0] = Math.sin(p * Math.PI * 2) * 0.1; } },
      q_walk: { dur: 16, fn(mm, p) { const s1 = Math.sin(p * Math.PI * 2); mm.b('body').pos[1] = Math.abs(s1) * 0.02 * s; mm.b('legFL').rot[0] = 0.25 + s1 * 0.35; mm.b('legFR').rot[0] = 0.25 - s1 * 0.35; mm.b('head').pos[2] = Math.cos(p * Math.PI * 2) * 0.01 * s; } },
      q_run: { dur: 10, fn(mm, p) { const f = Math.sin(p * Math.PI * 2); mm.b('legBL').rot[2] = 0.3 + f * 0.9; mm.b('legBR').rot[2] = -0.3 - f * 0.9; mm.b('body').pos[1] = 0.02 * s + f * 0.01 * s; mm.b('legFL').rot[0] = 0.9; mm.b('legFR').rot[0] = 0.9; } },
    };
    m.showWeapon = () => {};
    return m;
  };
  P.cat = { rig: 'cat', c1: '#8a8a8a', c2: '#f0f0f0' };
  P.bird = { rig: 'bird', c1: '#f0f0f0', c2: '#a0a0a0' };
  RIGS.ghost = function (a) {
    const m = new FF7.Model(); m.rig = 'quad'; m.app = a;
    m.bone('body', null, [0, 0.4, 0]); m.bone('head', 'body', [0, 0.2, 0]); m.bone('tail', 'body', [0, 0, 0]);
    ['legFL', 'legFR', 'legBL', 'legBR'].forEach(n => m.bone(n, 'body', [0, 0, 0]));
    m.attach('body', meshOf(mb => { mb.loft([{ y: -0.35, rx: 0.03, rz: 0.03 }, { y: -0.1, rx: 0.18, rz: 0.18 }, { y: 0.15, rx: 0.2, rz: 0.2 }, { y: 0.35, rx: 0.12, rz: 0.12 }, { y: 0.42, rx: 0.02, rz: 0.02 }], { sides: 10, color: a.c1 || '#c0e0f0' }); [1, -1].forEach(sd => mb.rbox(sd * 0.07, 0.22, 0.19, 0.04, 0.06, 0.01, a.c3 || '#202040', 0.3)); }), null, { blend: 'alpha', tint: [1, 1, 1, 0.8] });
    m.height = 0.9;
    m.anims = QUAD_ANIMS;
    m.showWeapon = () => {};
    return m;
  };
  P.ghost = { rig: 'ghost', c1: '#c0e0f0', c3: '#202040' };
})();
