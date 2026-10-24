// The Ancient Forest's living set pieces (js/maps/c12b/part3.js): giant pitcher flowers that snap shut into steps
// or hold a frog as a catapult, the Large Flytrap, beehives, frogs, hollow trees, the stamens and vine ropes the
// party swings on. Props in the js/field/tiles.js sense (mb, x, y, z, s, th, nb, o); the ones that change shape
// (pitcher, flytrap) are field objects whose options the scripts animate (o.k, o.lie...) with o.stateKey naming
// the shape (js/field/field.js builds each shape once).
(function () {
  const F = FF7.field, P = F.props, K = F.propKit, U = FF7.util;
  const sh = K.sh, rnd = K.rnd, beam = K.beam;
  const PI = Math.PI;

  // a lathe: rings of [height, radius] stacked into frustums (y up), colour per band
  function lathe(mb, x, y, z, prof, n, col) {
    for (let i = 0; i + 1 < prof.length; i++) {
      const [h0, r0] = prof[i], [h1, r1] = prof[i + 1];
      mb.prism(x, y + h0, z, r0, r1, h1 - h0, n, typeof col === 'function' ? col(i) : col, true, false, i === 0);
    }
  }

  // ------------------------------------------------------------------ pitcher flower
  // A giant pitcher: a bulb narrowing to a neck, a red lip round the mouth and a lid leaf hinged at the back.
  // o.k 0 (lid up, mouth gaping) .. 1 (lid shut flat over the mouth: a step you can stand on); o.sunk: it grows out
  // of a ravine or a stream with its mouth at ground level (its two leaves along the gap stiffen level as it shuts);
  // o.frog: a frog squats in its mouth (the catapult). o.col body, o.col2 lip.
  P.pitcher = (mb, x, y, z, s, th, nb, o = {}) => {
    const k = U.clamp(o.k || 0, 0, 1), body = o.col || '#5a9a3a', lip = o.col2 || '#b83048', vein = '#7a2a3a';
    const H = 0.95, rimY = o.sunk ? y + 0.02 : y + H, b = rimY - H, R = 0.22;
    lathe(mb, x, b, z, [[0, 0.1], [0.12, 0.22], [0.32, 0.27], [0.55, 0.23], [0.78, 0.17], [0.9, 0.19], [H - 0.02, R]], 10,
      i => i % 2 ? body : sh(body, -0.06));
    for (let i = 0; i < 9; i++) {   // reddish speckles on the bulb
      const a = rnd(x, z, i) * PI * 2, h = 0.15 + rnd(x, z, i + 20) * 0.5, r = 0.235 + (h < 0.4 ? 0.03 : -0.02);
      mb.sphere(x + Math.sin(a) * r, b + h, z + Math.cos(a) * r, 0.035, 0.05, 0.035, vein, 5, 3, true);
    }
    for (let i = 0; i < 14; i++) {   // the ribbed red lip round the mouth
      const an = i / 14 * PI * 2;
      mb.sphere(x + Math.sin(an) * (R + 0.005), rimY - 0.012, z + Math.cos(an) * (R + 0.005), 0.055, 0.032, 0.055, i % 2 ? lip : sh(lip, -0.12), 6, 3, true);
    }
    mb.prism(x, rimY - 0.08, z, R - 0.02, R - 0.02, 0.02, 10, '#141c0a', false, true, false);   // the dark mouth
    if (o.frog) P.frog(mb, x, rimY - 0.1, z + 0.02, s, th, nb, { size: 0.85 });
    // the lid: hinged at the back of the lip, swinging from near upright down over the mouth
    const a = (1 - k) * 1.6;
    mb.push(); mb.translate(x, rimY + 0.02, z - R); mb.rotate(-a, 0, 0);
    mb.sphere(0, 0.012, R + 0.02, R + 0.03, 0.03, R + 0.04, sh(body, 0.12), 10, 4, true);
    mb.sphere(0, -0.006, R + 0.02, R + 0.01, 0.018, R + 0.02, sh(body, -0.12), 10, 3, true);   // its underside
    mb.sphere(0, -0.012, R + 0.02, R * 0.45, 0.012, R * 0.5, sh(lip, -0.2), 8, 3, true);        // with a red blotch
    mb.pop();
    // leaves
    if (o.sunk) {
      [-1, 1].forEach(e => {   // north / south, along the gap: hanging down into it, then level once shut
        mb.push(); mb.translate(x, rimY - 0.02, z + e * (R + 0.02)); mb.rotate(e * (1 - k) * 1.1, 0, 0);
        mb.sphere(0, 0, e * 0.16, 0.19, 0.025, 0.18, sh(body, 0.06), 8, 3, true); mb.pop();
      });
    } else {
      for (let i = 0; i < 4; i++) {   // a rosette on the ground
        const an = i / 4 * PI * 2 + 0.4;
        mb.push(); mb.translate(x, y + 0.02, z); mb.rotate(0, an, 0); mb.sphere(0, 0, 0.32, 0.11, 0.02, 0.24, sh(body, i % 2 ? 0.05 : -0.05), 7, 3, true); mb.pop();
      }
    }
  };

  // ------------------------------------------------------------------ frog
  // Squat body with a pale belly, bulging yellow eyes, folded back legs. o.size (1 = 0.2 m tall), faces south.
  P.frog = (mb, x, y, z, s, th, nb, o = {}) => {
    const k = o.size || 1, c = o.col || '#4a9a38', belly = o.col2 || '#c8e070';
    mb.push(); mb.translate(x, y, z);
    const S = (v) => v * k;
    mb.sphere(0, S(0.1), 0, S(0.13), S(0.095), S(0.16), c, 10, 6, true, (i, j) => j > 3 ? belly : c);
    mb.sphere(0, S(0.13), S(0.1), S(0.1), S(0.07), S(0.09), sh(c, 0.06), 8, 5, true);   // head
    [-1, 1].forEach(e => {
      mb.sphere(e * S(0.06), S(0.2), S(0.12), S(0.042), S(0.042), S(0.042), '#e8e040', 6, 4, true);   // eyes
      mb.sphere(e * S(0.07), S(0.205), S(0.155), S(0.018), S(0.02), S(0.012), '#101010', 5, 3);
      mb.sphere(e * S(0.13), S(0.08), S(-0.06), S(0.06), S(0.07), S(0.11), sh(c, -0.08), 7, 4, true);   // folded thigh
      mb.sphere(e * S(0.15), S(0.015), S(0.02), S(0.05), S(0.015), S(0.08), sh(c, -0.15), 6, 3, true);   // back foot
      mb.prism(e * S(0.08), 0, S(0.12), S(0.022), S(0.02), S(0.08), 5, sh(c, -0.1));   // front leg
      mb.sphere(e * S(0.085), S(0.008), S(0.15), S(0.03), S(0.01), S(0.03), sh(c, -0.15), 5, 3, true);
    });
    mb.box(0, S(0.115), S(0.185), S(0.12), S(0.008), S(0.01), '#1e3010');   // the mouth line
    mb.pop();
  };

  // ------------------------------------------------------------------ beehive
  // A banded papery hive with a dark entrance and a few bees; o.hang: a stub of branch on top.
  P.beehive = (mb, x, y, z, s, th, nb, o = {}) => {
    const k = o.size || 1, c = o.col || '#d8a040';
    const prof = [[0, 0.03], [0.05, 0.12], [0.11, 0.18], [0.18, 0.205], [0.25, 0.2], [0.32, 0.17], [0.38, 0.12], [0.43, 0.06], [0.46, 0.02]]
      .map(([h, r]) => [h * k, r * k]);
    lathe(mb, x, y, z, prof, 10, i => i % 2 ? c : sh(c, -0.14));
    mb.sphere(x, y + 0.14 * k, z + 0.19 * k, 0.05 * k, 0.04 * k, 0.02 * k, '#2a1808', 6, 4, true);   // entrance
    if (o.hang) beam(mb, [x, y + 0.44 * k, z], [x, y + 0.62 * k, z], 0.025 * k, '#5a4028', 5);
    for (let i = 0; i < 4; i++) {   // bees
      const a = rnd(x, z, i) * PI * 2, h = (0.1 + rnd(x, z, i + 5) * 0.35) * k, r = 0.28 * k;
      mb.sphere(x + Math.sin(a) * r, y + h, z + Math.cos(a) * r, 0.022 * k, 0.018 * k, 0.03 * k, i % 2 ? '#f0c020' : '#302010', 5, 3);
    }
  };

  // ------------------------------------------------------------------ Large Flytrap
  // A stalk with a rosette, and a head of two spiky lobes hinged along an east-west midrib. o.k 0 (jaws gaping up,
  // red inside) .. 1 (shut); o.hive: a beehive clamped between them (they can't quite close); o.lie 0..1: the shut
  // head and stalk sag over to lie on the ground (the way past is open). o.col lobes, o.col2 inside.
  P.flytrap = (mb, x, y, z, s, th, nb, o = {}) => {
    const k = U.clamp(o.k || 0, 0, 1), c = o.col || '#5a9a30', red = o.col2 || '#c83040', tooth = '#e0e8b0';
    for (let i = 0; i < 5; i++) {   // rosette
      const an = i / 5 * PI * 2 + 0.3;
      mb.push(); mb.translate(x, y + 0.02, z); mb.rotate(0, an, 0); mb.sphere(0, 0, 0.3, 0.12, 0.025, 0.26, sh(c, i % 2 ? 0.05 : -0.08), 7, 3, true); mb.pop();
    }
    mb.push(); mb.translate(x, y, z); mb.rotate(0, 0, -(o.lie || 0) * 1.25);
    const stalkH = 0.42;
    mb.prism(0, 0, 0, 0.06, 0.045, stalkH, 7, sh(c, -0.12), true);
    const phi = o.hive ? U.lerp(0.95, 0.3, k) : U.lerp(0.95, 0.06, k);   // each lobe's tilt from upright
    const RX = 0.3, RZ = 0.23;
    [[1, -(PI / 2 - phi)], [-1, -(PI / 2 + phi)]].forEach(([side, rx]) => {
      mb.push(); mb.translate(0, stalkH, 0); mb.rotate(rx, 0, 0);
      // lobe local: flat in x-z, running from the hinge (z 0) out to z 2*RZ; +y is its inner face for the south
      // lobe (side 1) and its outer face for the north one
      mb.sphere(0, 0, RZ, RX, 0.04, RZ, c, 12, 5, true);
      mb.sphere(0, side * 0.025, RZ * 1.02, RX * 0.88, 0.02, RZ * 0.86, red, 12, 4, true);   // the red trap face
      for (let i = 0; i < 9; i++) {   // teeth along the rim
        const t = -1 + i / 4, px = t * RX * 0.9, pz = RZ + Math.sqrt(Math.max(0, 1 - t * t * 0.81)) * RZ;
        mb.spike([px, 0, pz - 0.02], [t * 0.3, side * 0.35, 1], 0.13, 0.014, 4, tooth);
      }
      mb.pop();
    });
    if (o.hive) P.beehive(mb, 0, stalkH + 0.02, 0, s, th, nb, { size: 0.8 });
    mb.pop();
  };

  // ------------------------------------------------------------------ hollow tree
  // A thick old trunk with buttress roots, a dark hollow at its foot facing south, and a broken, leafy crown.
  P.hollowtree = (mb, x, y, z, s, th, nb, o = {}) => {
    const bark = o.col || '#5a4430', leaf = o.col2 || '#3a6a28', H = o.h || 1.9;
    mb.prism(x, y, z, 0.36, 0.26, H, 9, bark, true, true, false);
    for (let i = 0; i < 7; i++) {   // bark ridges
      const a = i / 7 * PI * 2 + 0.2;
      beam(mb, [x + Math.sin(a) * 0.34, y, z + Math.cos(a) * 0.34], [x + Math.sin(a) * 0.25, y + H * 0.95, z + Math.cos(a) * 0.25], 0.025, sh(bark, -0.18), 4);
    }
    for (let i = 0; i < 5; i++) {   // roots
      const a = i / 5 * PI * 2 + 0.9;
      mb.spike([x + Math.sin(a) * 0.28, y + 0.12, z + Math.cos(a) * 0.28], [Math.sin(a), -0.35, Math.cos(a)], 0.34, 0.08, 5, sh(bark, -0.06));
    }
    mb.sphere(x, y + 0.36, z + 0.3, 0.17, 0.24, 0.06, sh(bark, 0.14), 8, 5, true);   // the hollow's worn lip
    mb.sphere(x, y + 0.35, z + 0.325, 0.13, 0.2, 0.05, '#120a04', 8, 5, true);      // and its dark inside
    [[0.8, 0.35, 0.3], [-0.9, 0.3, -0.2], [0.1, 0.4, -0.9]].forEach(([dx, dy, dz], i) => {   // broken branches with leaves
      const a = [x + dx * 0.2, y + H * 0.92, z + dz * 0.2], b = [x + dx * 0.75, y + H + dy * 1.2, z + dz * 0.75];
      beam(mb, a, b, 0.05, sh(bark, 0.05), 5);
      mb.sphere(b[0], b[1] + 0.08, b[2], 0.34, 0.24, 0.34, sh(leaf, i * 0.05), 7, 5, true);
    });
    mb.sphere(x, y + H + 0.12, z, 0.3, 0.1, 0.3, sh(bark, -0.25), 8, 3, true);   // the jagged broken top
  };

  // ------------------------------------------------------------------ stamen / vine rope
  // A long pink stamen drooping from a canopy flower (o.top m) down to a fat pollen-covered anther (o.bottom m).
  P.stamen = (mb, x, y, z, s, th, nb, o = {}) => {
    const top = y + (o.top || 3.2), bot = y + (o.bottom || 0.6), c = o.col || '#e070a8';
    const pts = [0, 0.35, 0.7, 1].map(t => [x + Math.sin(t * 2.2) * 0.12, U.lerp(top, bot, t), z + t * 0.08]);
    for (let i = 0; i + 1 < pts.length; i++) beam(mb, pts[i], pts[i + 1], 0.032 - i * 0.004, sh(c, -i * 0.05), 6);
    const e = pts[pts.length - 1];
    mb.sphere(e[0], e[1] - 0.12, e[2], 0.08, 0.17, 0.08, '#f0c830', 8, 6, true);   // the anther
    for (let i = 0; i < 6; i++) { const a = rnd(x, z, i) * PI * 2; mb.sphere(e[0] + Math.sin(a) * 0.08, e[1] - 0.05 - rnd(x, z, i + 3) * 0.2, e[2] + Math.cos(a) * 0.08, 0.02, 0.02, 0.02, '#f8e070', 4, 3); }
    for (let i = 0; i < 6; i++) {   // the flower it hangs from
      const an = i / 6 * PI * 2;
      mb.push(); mb.translate(pts[0][0], top, pts[0][2]); mb.rotate(0, an, 0); mb.rotate(0.5, 0, 0);
      mb.sphere(0, 0, 0.4, 0.18, 0.03, 0.42, sh('#d05090', i % 2 ? 0.08 : -0.04), 8, 3, true); mb.pop();
    }
  };
  // Two vines twisted into a rope, hanging from o.top down to o.bottom (m), with a few leaves.
  P.vinerope = (mb, x, y, z, s, th, nb, o = {}) => {
    const top = y + (o.top || 3), bot = y + (o.bottom || 0.3), c = o.col || '#4a6a28', n = 10;
    [0, PI].forEach(ph => {
      let prev = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = ph + t * PI * 5, p = [x + Math.cos(a) * 0.035, U.lerp(top, bot, t), z + Math.sin(a) * 0.035];
        if (prev) beam(mb, prev, p, 0.022, sh(c, ph ? -0.08 : 0.04), 5);
        prev = p;
      }
    });
    for (let i = 0; i < 5; i++) { const t = 0.15 + i * 0.17, a = rnd(x, z, i) * PI * 2; mb.sphere(x + Math.cos(a) * 0.08, U.lerp(top, bot, t), z + Math.sin(a) * 0.08, 0.07, 0.015, 0.045, sh(c, 0.12), 6, 3, true); }
  };

  // a hollow tree as a tile (legend Y in the forest): solid
  K.def('hollowtree', { prop: 'hollowtree' });
})();
