// Kupomon's robot moogles (docs/KUPOMON.md): FF7's moogle rig (js/gl/cast_rigs.js RIGS.moogle) dressed for its job.
// Every robot moogle has the classic pom-pom on a little antenna (the FF1-6 moogles' pom, as a robot part) and a
// badge on its chest in its type's colour; the job adds a hat, a robe or armour and a weapon (KP.JOBS[job].look).
//   KP.moogleModel(speciesId) -> FF7.Model; FF7.creatures.MODELS['kp_' + id] too, so a field actor can be
//   { enemy: 'kp_<id>', scale } (the starters in their pods, moogles on the routes).
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};
  const T = 0.72, PI = Math.PI;
  const sh = (c, k) => FF7.util.shade(c, k);
  const meshOf = (fn, o) => { const mb = new FF7.MeshBuilder(); fn(mb); return mb.build(o); };
  const glowOf = (fn) => meshOf(fn, { unlit: true });

  // ------------------------------------------------------------------ hats (on the head bone: the head runs y 0..0.45T,
  // the face looks down +z)
  const HATS = {
    none() {},
    witch(mb, L) {   // the Black Mage's straw hat: a wide brim and a cone with a bent tip
      const c = L.g2 || '#d8c070';
      mb.prism(0, 0.33 * T, -0.01 * T, 0.36 * T, 0.36 * T, 0.025 * T, 12, c, false);
      mb.loft([{ y: 0.35 * T, rx: 0.2 * T, rz: 0.2 * T }, { y: 0.55 * T, rx: 0.13 * T, rz: 0.13 * T, z: -0.02 * T }, { y: 0.72 * T, rx: 0.06 * T, rz: 0.06 * T, z: -0.07 * T }, { y: 0.8 * T, rx: 0.015 * T, rz: 0.015 * T, z: -0.14 * T }], { sides: 10, color: c, smooth: false });
    },
    horned(mb, L) {  // the Magus: the straw hat with two curling horns
      HATS.witch(mb, L);
      [1, -1].forEach(s => mb.sweep([[s * 0.14 * T, 0.48 * T, 0], [s * 0.26 * T, 0.6 * T, -0.02 * T], [s * 0.3 * T, 0.75 * T, -0.06 * T], [s * 0.24 * T, 0.82 * T, -0.08 * T]], 0.035 * T, { sides: 6, color: '#2a1a1a' }));
    },
    hood(mb, L) {    // the White Mage's hood: a shell over the head's top and back, red zigzags round its edge, a peak
      const c = L.g1 || '#f2f0ea', t = L.g2 || '#c02838';
      mb.loft([{ y: 0.06 * T, rx: 0.25 * T, rz: 0.23 * T, z: -0.04 * T }, { y: 0.22 * T, rx: 0.26 * T, rz: 0.24 * T, z: -0.03 * T }, { y: 0.38 * T, rx: 0.22 * T, rz: 0.21 * T, z: -0.03 * T }, { y: 0.5 * T, rx: 0.1 * T, rz: 0.1 * T, z: -0.06 * T }, { y: 0.56 * T, rx: 0.02 * T, rz: 0.02 * T, z: -0.1 * T }], { sides: 10, color: c, smooth: false, arc: [PI * 0.62, PI * 2.38] });
      for (let i = 0; i < 7; i++) { const a = PI * 0.7 + i * (PI * 1.6 / 6), x = Math.cos(a) * 0.255 * T, z = Math.sin(a) * 0.235 * T - 0.04 * T; mb.tri([x * 0.97, 0.06 * T, z], [x * 1.03, 0.06 * T, z], [x, 0.13 * T, z], t); }
    },
    mitre(mb, L) {   // the White Wizard: a tall rounded hat with a gold band
      const c = L.g1 || '#fff8ea', g = L.g2 || '#d8b040';
      mb.loft([{ y: 0.3 * T, rx: 0.2 * T, rz: 0.19 * T }, { y: 0.34 * T, rx: 0.21 * T, rz: 0.2 * T }, { y: 0.62 * T, rx: 0.15 * T, rz: 0.1 * T }, { y: 0.74 * T, rx: 0.04 * T, rz: 0.04 * T }], { sides: 10, color: c, smooth: false });
      mb.loft([{ y: 0.31 * T, rx: 0.215 * T, rz: 0.205 * T }, { y: 0.36 * T, rx: 0.215 * T, rz: 0.205 * T }], { sides: 10, color: g, smooth: false });
    },
    helm(mb, L) {    // the Warrior: a steel dome and a red plume
      mb.sphere(0, 0.33 * T, 0, 0.215 * T, 0.13 * T, 0.205 * T, L.g2 || '#a8a8b0', 10, 5, false);
      mb.blade([0, 0.44 * T, -0.02 * T], [0, 0.5, -1], 0.22 * T, 0.06 * T, 0.03 * T, L.g1 || '#b03028', [1, 0, 0]);
    },
    crest(mb, L) {   // the Gladiator: the dome and a tall fan crest
      mb.sphere(0, 0.33 * T, 0, 0.215 * T, 0.13 * T, 0.205 * T, L.g2 || '#b8b8c0', 10, 5, false);
      mb.panel([[0, 0.42 * T], [0.12 * T, 0.62 * T], [-0.02 * T, 0.68 * T], [-0.18 * T, 0.5 * T], [-0.14 * T, 0.42 * T]].map(([z, y]) => [z, y]), 0, 0.03 * T, L.g1 || '#c8902a');
    },
    kabuto(mb, L) {  // the Samurai: a dark dome, flared neck flaps and a gold crescent on the brow
      // (the dome follows the head's own square-ish shape: a round ball narrowing below its middle let the head's
      // corners show through, white at its sides; the user, 2026-10-04, Shogunpom "its head is seeping through")
      const c = L.g1 || '#7a1a20', g = L.g2 || '#d8c070';
      lof(mb, [hed(0.25, 0.02), hed(0.34, 0.026), hed(0.41, 0.022), hed(0.445, 0.016), [0.47, 0.001]], c, { sides: 12 });
      lof(mb, [hed(0.3, 0.028), hed(0.22, 0.09)], sh(c, -0.1), { arc: [PI * 0.7, PI * 2.3] });
      [1, -1].forEach(s => mb.blade([s * 0.04 * T, 0.42 * T, 0.18 * T], [s * 0.8, 1, 0.2], 0.2 * T, 0.04 * T, 0.015 * T, g, [0, 0, 1]));
    },
    band(mb, L) {    // the Monk: a headband and its trailing ties
      const c = L.g1 || '#d88a30';
      mb.loft([{ y: 0.24 * T, rx: 0.228 * T, rz: 0.215 * T, z: 0.01 * T }, { y: 0.29 * T, rx: 0.222 * T, rz: 0.21 * T, z: 0.01 * T }], { sides: 12, color: c, smooth: false });
      [1, -1].forEach(s => mb.blade([s * 0.03 * T, 0.26 * T, -0.21 * T], [s * 0.4, -0.6, -1], 0.18 * T, 0.04 * T, 0.01 * T, c, [0, 1, 0]));
    },
    bandana(mb, L) { // the Thief: a bandana over the top, knotted at the back
      const c = L.g1 || '#3a6a3a';
      mb.loft([{ y: 0.25 * T, rx: 0.23 * T, rz: 0.22 * T, z: 0.0 }, { y: 0.36 * T, rx: 0.2 * T, rz: 0.19 * T }, { y: 0.44 * T, rx: 0.1 * T, rz: 0.1 * T }], { sides: 10, color: c, smooth: false });
      mb.sphere(0, 0.3 * T, -0.22 * T, 0.05 * T, 0.04 * T, 0.04 * T, sh(c, -0.1), 6, 4, false);
      [1, -1].forEach(s => mb.blade([s * 0.02 * T, 0.29 * T, -0.24 * T], [s * 0.5, -1, -0.6], 0.14 * T, 0.04 * T, 0.01 * T, c, [0, 0, 1]));
    },
    mask(mb, L) {    // the Ninja: a hood and a mask over the lower face
      HATS.bandana(mb, L);
      mb.loft([{ y: 0.04 * T, rx: 0.2 * T, rz: 0.2 * T, z: 0.02 * T }, { y: 0.19 * T, rx: 0.218 * T, rz: 0.212 * T, z: 0.02 * T }], { sides: 10, color: L.g1 || '#2a2a3a', smooth: false });
    },
    feather(mb, L) { // the Ranger: a peaked cap and a long feather
      const c = L.g1 || '#3a7a3a';
      mb.loft([{ y: 0.3 * T, rx: 0.22 * T, rz: 0.21 * T }, { y: 0.42 * T, rx: 0.16 * T, rz: 0.17 * T, z: -0.02 * T }, { y: 0.5 * T, rx: 0.02 * T, rz: 0.08 * T, z: -0.08 * T }], { sides: 10, color: c, smooth: false });
      mb.blade([0.14 * T, 0.4 * T, -0.04 * T], [0.4, 1, -0.8], 0.3 * T, 0.05 * T, 0.01 * T, '#c03030', [1, 0, 0]);
    },
    tricorne(mb, L) { // the Cannoneer: a three-cornered hat
      const c = L.g1 || '#2a3a6a';
      mb.prism(0, 0.32 * T, 0, 0.3 * T, 0.3 * T, 0.03 * T, 3, c, false);
      mb.loft([{ y: 0.33 * T, rx: 0.19 * T, rz: 0.18 * T }, { y: 0.46 * T, rx: 0.15 * T, rz: 0.14 * T }, { y: 0.48 * T, rx: 0.02 * T, rz: 0.02 * T }], { sides: 10, color: c, smooth: false });
      mb.sphere(0, 0.36 * T, 0.2 * T, 0.03 * T, 0.03 * T, 0.01 * T, L.g2 || '#c8a040', 6, 4, false);
    },
    leafhat(mb, L) { // the Geomancer: a broad floppy hat with a big leaf
      const c = L.g2 || '#c8a050';
      mb.loft([{ y: 0.3 * T, rx: 0.34 * T, rz: 0.34 * T }, { y: 0.34 * T, rx: 0.26 * T, rz: 0.26 * T }, { y: 0.46 * T, rx: 0.16 * T, rz: 0.16 * T }, { y: 0.5 * T, rx: 0.02 * T, rz: 0.02 * T }], { sides: 12, color: c, smooth: false });
      mb.blade([0.06 * T, 0.48 * T, 0], [0.3, 1, 0.2], 0.22 * T, 0.1 * T, 0.01 * T, L.g1 || '#4a7a3a', [0, 0, 1]);
    },
    pelt(mb, L) {    // the Beastmaster: a wolf pelt over the head, ears up
      const c = L.g1 || '#7a5a30';
      mb.loft([{ y: 0.2 * T, rx: 0.25 * T, rz: 0.24 * T, z: -0.03 * T }, { y: 0.36 * T, rx: 0.22 * T, rz: 0.21 * T, z: -0.03 * T }, { y: 0.47 * T, rx: 0.08 * T, rz: 0.1 * T, z: 0.02 * T }], { sides: 10, color: c, smooth: false, arc: [PI * 0.6, PI * 2.4] });
      [1, -1].forEach(s => mb.blade([s * 0.12 * T, 0.44 * T, 0.02 * T], [s * 0.4, 1, 0], 0.14 * T, 0.09 * T, 0.03 * T, sh(c, -0.15), [0, 0, 1]));
      mb.sphere(0, 0.42 * T, 0.16 * T, 0.06 * T, 0.04 * T, 0.07 * T, sh(c, 0.1), 6, 4, false);   // the snout over the brow
    },
    cap(mb, L) {     // the Bard: a floppy beret with a feather
      const c = L.g1 || '#a03070';
      mb.sphere(0.03 * T, 0.38 * T, -0.02 * T, 0.23 * T, 0.07 * T, 0.22 * T, c, 10, 5, false);
      mb.blade([-0.12 * T, 0.42 * T, -0.06 * T], [-0.6, 1, -0.6], 0.24 * T, 0.05 * T, 0.01 * T, L.g2 || '#e8c040', [1, 0, 0]);
    },
    beret(mb, L) {   // the Mime: a black beret
      mb.sphere(0.04 * T, 0.39 * T, 0, 0.2 * T, 0.06 * T, 0.2 * T, L.g2 || '#2a2a2a', 10, 5, false);
    },
    ribbon(mb, L) {  // the Dancer: a big bow on top
      const c = L.g1 || '#e050a0';
      [1, -1].forEach(s => mb.blade([0, 0.44 * T, 0], [s, 0.4, 0], 0.18 * T, 0.12 * T, 0.03 * T, c, [0, 0, 1]));
      mb.sphere(0, 0.45 * T, 0, 0.04 * T, 0.04 * T, 0.04 * T, sh(c, -0.1), 6, 4, false);
    },
  };

  // ------------------------------------------------------------------ bodies (on the torso: it runs y -0.1T..0.42T)
  const BODIES = {
    robe(mb, L) {     // a robe to the feet, flaring
      const c = L.g1 || '#2a4a8a';
      mb.loft([{ y: 0.33 * T, rx: 0.22 * T, rz: 0.21 * T }, { y: 0.15 * T, rx: 0.285 * T, rz: 0.27 * T }, { y: -0.04 * T, rx: 0.3 * T, rz: 0.29 * T }, { y: -0.16 * T, rx: 0.32 * T, rz: 0.31 * T }], { sides: 12, color: c, smooth: false });
      mb.loft([{ y: -0.16 * T, rx: 0.322 * T, rz: 0.312 * T }, { y: -0.12 * T, rx: 0.322 * T, rz: 0.312 * T }], { sides: 12, color: L.g2 ? sh(L.g2, -0.05) : sh(c, 0.2), smooth: false });
    },
    armor(mb, L) {    // a breastplate, pauldrons and a belt
      const m = L.g2 || '#a8a8b0';
      mb.loft([{ y: 0.05 * T, rx: 0.255 * T, rz: 0.245 * T }, { y: 0.16 * T, rx: 0.275 * T, rz: 0.262 * T }, { y: 0.3 * T, rx: 0.25 * T, rz: 0.24 * T }], { sides: 12, color: m, smooth: false });
      [1, -1].forEach(s => mb.sphere(s * 0.21 * T, 0.36 * T, 0.03 * T, 0.09 * T, 0.06 * T, 0.09 * T, sh(m, -0.08), 8, 4, false));
      mb.loft([{ y: 0.0, rx: 0.25 * T, rz: 0.24 * T }, { y: 0.05 * T, rx: 0.256 * T, rz: 0.246 * T }], { sides: 12, color: L.g1 || '#b03028', smooth: false });
    },
    gi(mb, L) {       // a martial artist's sash
      mb.loft([{ y: 0.02 * T, rx: 0.25 * T, rz: 0.24 * T }, { y: 0.07 * T, rx: 0.258 * T, rz: 0.248 * T }], { sides: 12, color: L.g1 || '#d88a30', smooth: false });
      [1, -1].forEach(s => mb.blade([s * 0.08 * T, 0.04 * T, 0.24 * T], [s * 0.3, -1, 0.2], 0.12 * T, 0.04 * T, 0.01 * T, L.g1 || '#d88a30', [0, 0, 1]));
    },
    vest(mb, L) {     // a short vest
      mb.loft([{ y: 0.08 * T, rx: 0.262 * T, rz: 0.252 * T }, { y: 0.2 * T, rx: 0.272 * T, rz: 0.26 * T }, { y: 0.33 * T, rx: 0.235 * T, rz: 0.225 * T }], { sides: 12, color: L.g1 || '#3a7a3a', smooth: false, arc: [-PI * 0.32, PI * 1.32] });
    },
    scarf(mb, L) {    // a scarf at the neck, one end flying
      const c = L.g1 || '#d8b060';
      mb.loft([{ y: 0.33 * T, rx: 0.21 * T, rz: 0.2 * T }, { y: 0.4 * T, rx: 0.16 * T, rz: 0.16 * T }], { sides: 10, color: c, smooth: false });
      mb.blade([0.06 * T, 0.36 * T, -0.17 * T], [0.6, -0.4, -1], 0.2 * T, 0.06 * T, 0.01 * T, c, [0, 1, 0]);
    },
    stripes(mb, L) {  // the Mime: black and white bands
      for (let i = 0; i < 4; i++) { const y = (0.0 + i * 0.08) * T; mb.loft([{ y, rx: 0.262 * T, rz: 0.252 * T }, { y: y + 0.035 * T, rx: 0.264 * T, rz: 0.254 * T }], { sides: 12, color: i % 2 ? (L.g1 || '#f0f0f0') : (L.g2 || '#2a2a2a'), smooth: false }); }
    },
    skirt(mb, L) {    // the Dancer: a short flared skirt
      mb.loft([{ y: 0.06 * T, rx: 0.255 * T, rz: 0.245 * T }, { y: -0.08 * T, rx: 0.34 * T, rz: 0.33 * T }], { sides: 14, color: L.g1 || '#e050a0', smooth: false });
    },
  };

  // ------------------------------------------------------------------ weapons (on the weapon bone in the right paw, up)
  const WEAPONS = {
    none() {},
    sword(mb, L) {   // (a big one for its size: Moglin loves it)
      mb.box(0, 0.33 * T, 0.02 * T, 0.075 * T, 0.56 * T, 0.016 * T, '#d8dce4'); mb.tri([-0.037 * T, 0.61 * T, 0.02 * T], [0.037 * T, 0.61 * T, 0.02 * T], [0, 0.7 * T, 0.02 * T], '#d8dce4');
      mb.box(0, 0.04 * T, 0.02 * T, 0.2 * T, 0.035 * T, 0.04 * T, L.g1 || '#b03028'); mb.box(0, -0.03 * T, 0.02 * T, 0.04 * T, 0.11 * T, 0.04 * T, '#5a3a20');
    },
    greatsword(mb, L) { mb.box(0, 0.3 * T, 0.02 * T, 0.08 * T, 0.55 * T, 0.016 * T, '#d0d4dc'); mb.box(0, 0.03 * T, 0.02 * T, 0.18 * T, 0.03 * T, 0.04 * T, L.g1 || '#c8902a'); mb.box(0, -0.03 * T, 0.02 * T, 0.035 * T, 0.1 * T, 0.035 * T, '#5a3a20'); },
    katana(mb) { mb.box(0, 0.26 * T, 0.02 * T, 0.028 * T, 0.48 * T, 0.01 * T, '#e8ecf0'); mb.prism(0, 0.0, 0.02 * T, 0.04 * T, 0.04 * T, 0.012 * T, 8, '#d8c070', false); mb.box(0, -0.04 * T, 0.02 * T, 0.03 * T, 0.1 * T, 0.03 * T, '#2a2a2a'); },
    dagger(mb) { mb.box(0, 0.11 * T, 0.02 * T, 0.035 * T, 0.16 * T, 0.01 * T, '#d8dce4'); mb.box(0, 0.02 * T, 0.02 * T, 0.08 * T, 0.02 * T, 0.025 * T, '#8a6a30'); },
    claw(mb) { for (let i = -1; i <= 1; i++) mb.blade([i * 0.03 * T, 0.0, 0.05 * T], [i * 0.15, 0.3, 1], 0.12 * T, 0.02 * T, 0.008 * T, '#c8ccd4', [0, 1, 0]); },
    shuriken(mb) { for (let i = 0; i < 4; i++) { mb.push(); mb.rotate(0, 0, i * PI / 2); mb.blade([0, 0.04 * T, 0.03 * T], [0, 1, 0], 0.08 * T, 0.04 * T, 0.008 * T, '#b8bcc4', [0, 0, 1]); mb.pop(); } },
    rod(mb, L) { mb.box(0, 0.16 * T, 0.02 * T, 0.025 * T, 0.32 * T, 0.025 * T, '#6a4a2a'); mb.sphere(0, 0.34 * T, 0.02 * T, 0.045 * T, 0.045 * T, 0.045 * T, L.g2 || '#d8c070', 8, 5, false); },
    staff(mb, L) { mb.box(0, 0.22 * T, 0.02 * T, 0.028 * T, 0.6 * T, 0.028 * T, '#8a6a3a'); mb.sphere(0, 0.55 * T, 0.02 * T, 0.06 * T, 0.06 * T, 0.06 * T, L.g2 || '#c02838', 8, 5, false); },
    bow(mb) { const pts = []; for (let i = 0; i <= 6; i++) { const a = -PI * 0.4 + i * PI * 0.8 / 6; pts.push([0, Math.sin(a) * 0.28 * T + 0.1 * T, Math.cos(a) * 0.1 * T + 0.02 * T]); } mb.sweep(pts, 0.012 * T, { sides: 5, color: '#7a4a20' }); mb.box(0, 0.1 * T, 0.03 * T, 0.004, 0.5 * T, 0.004, '#e8e8e0'); },
    cannon(mb, L) { mb.push(); mb.translate(0, 0.06 * T, 0.06 * T); mb.rotate(PI / 2, 0, 0); mb.prism(0, -0.1 * T, 0, 0.06 * T, 0.05 * T, 0.32 * T, 8, '#3a3a40', false); mb.pop(); mb.sphere(0, 0.06 * T, -0.05 * T, 0.07 * T, 0.07 * T, 0.07 * T, L.g2 || '#c8a040', 8, 5, false); },
    bell(mb, L) { mb.box(0, 0.08 * T, 0.02 * T, 0.02 * T, 0.14 * T, 0.02 * T, '#6a4a2a'); mb.loft([{ y: 0.16 * T, rx: 0.02 * T, rz: 0.02 * T }, { y: 0.2 * T, rx: 0.05 * T, rz: 0.05 * T }, { y: 0.28 * T, rx: 0.08 * T, rz: 0.08 * T }], { sides: 10, color: L.g2 || '#c8a050', smooth: false }); },
    whip(mb) { const pts = []; for (let i = 0; i <= 8; i++) pts.push([Math.sin(i * 0.9) * 0.08 * T, i * 0.05 * T, Math.cos(i * 0.9) * 0.06 * T]); mb.sweep(pts, 0.012 * T, { sides: 5, color: '#5a3a1a' }); },
    // a small golden harp, big enough to read as one (the user, 2026-10-04: "What is that instrument that she's suppose to
    // be holding?": it was a curve, a bar and three hair-thin strings, pale on a pale moogle): the column it's held by, a
    // curved neck over the top, a slanted soundboard, six strings, a gem at the neck's tip; gold whatever the job's colours
    harp(mb, L) {
      const gold = '#e0b040', dark = '#b8862a', z = 0.02 * T;
      mb.sweep([[0, -0.02 * T, z], [0, 0.36 * T, z]], 0.017 * T, { sides: 6, color: gold });                                      // (the column)
      mb.sweep([[0, 0.36 * T, z], [0.07 * T, 0.41 * T, z], [0.15 * T, 0.37 * T, z], [0.22 * T, 0.33 * T, z]], 0.016 * T, { sides: 6, color: gold });   // (the neck)
      mb.sweep([[0.02 * T, -0.02 * T, z], [0.22 * T, 0.31 * T, z]], [0.03 * T, 0.018 * T], { sides: 6, color: dark });            // (the soundboard)
      for (let i = 0; i < 6; i++) { const x = (0.04 + i * 0.03) * T, top = (0.395 - i * 0.012) * T, bot = (0.02 + i * 0.05) * T; mb.box(x, (top + bot) / 2, z, 0.006 * T, top - bot, 0.006 * T, '#fff4d8'); }   // (the strings)
      mb.sphere(0.22 * T, 0.34 * T, z, 0.025 * T, 0.025 * T, 0.025 * T, L.g1 || '#2a8ab0', 6, 4, false);                       // (a gem at the neck's tip)
    },
    fans(mb, L) { mb.push(); mb.translate(0, 0.08 * T, 0.03 * T); for (let i = 0; i < 5; i++) mb.blade([0, 0, 0], [(i - 2) * 0.35, 1, 0], 0.13 * T, 0.05 * T, 0.006 * T, i % 2 ? (L.g1 || '#e050a0') : (L.g2 || '#f0d060'), [0, 0, 1]); mb.pop(); },
  };

  // how each is held in the right paw. The paw hangs at the end of an arm splayed out 0.4 rad, its "up" running back up
  // the arm: a weapon built pointing up would sit inside the arm. Blades are tipped forward and up, out in front;
  // staves stand upright (the splay undone) just in front of the arm, gripped a third of the way up.
  const GRIP = {
    none: { at: [0, 0, 0], rot: [0, 0, 0] },
    sword: { at: [0, -0.02, 0.05], rot: [1.15, 0, 0.4] }, greatsword: { at: [0, -0.02, 0.05], rot: [1.05, 0, 0.4] },
    katana: { at: [0, -0.02, 0.05], rot: [1.2, 0, 0.4] }, dagger: { at: [0, -0.02, 0.05], rot: [1.3, 0, 0.4] },
    rod: { at: [0, -0.1, 0.03], rot: [0.12, 0, 0.4] }, staff: { at: [0, -0.2, 0], rot: [0, 0, 0.4] },   // (through the paw, not 0.09 in front of it: the poles stood beside the paw)
    bow: { at: [0, -0.14, 0], rot: [0, 0, 0.4] }, bell: { at: [0, -0.02, 0.06], rot: [1.25, 0, 0.4] },
    whip: { at: [0, -0.02, 0.06], rot: [1.1, 0, 0.4] }, harp: { at: [0, -0.04, 0.02], rot: [0.2, 0, 0.4] },
    fans: { at: [0, -0.02, 0.06], rot: [1.0, 0, 0.4] }, claw: { at: [0, 0, 0.02], rot: [-0.6, 0, 0.4] },
    shuriken: { at: [0, -0.02, 0.06], rot: [0.2, 0, 0.4] }, cannon: { at: [0, 0.04, 0.04], rot: [0, 0, 0.4] },
  };
  // a long pole with no grip of its own in the tables below (the user, 2026-10-04: "needs to be holding its weapon"):
  // upright, the splay undone, straight through the paw's middle, gripped a third of the way up. Found by their shape:
  // a long thin shaft from the paw up; the tables' own STAFF and POLE hold them the same way now
  GRIP.pole = { at: [0, -0.2, 0], rot: [0, 0, 0.4] };
  ['scepter', 'fishrod', 'harpoon', 'pitchfork', 'scythe', 'spear', 'lanternpole', 'gearstaff', 'orbstaff', 'clockstaff', 'pendulum', 'crozier', 'broom',
    'skullstaff', 'totem', 'ankh', 'net', 'pushbroom', 'mop', 'quarterstaff', 'ringstaff', 'feedpole', 'shovel', 'firebrand', 'elemstaff', 'lightningrod',
    'nethercore', 'fanstaff', 'magicbrush', 'leafrod', 'umbrella', 'trident', 'astrolabe', 'starglobe', 'moonstaff', 'spade', 'crook',
    'walkstaff', 'oakstaff', 'gnarled', 'vaultpole', 'flag'].forEach(w => { if (!GRIP[w]) GRIP[w] = GRIP.pole; });

  // ================================================================== the full roster's gear (js/kupomon/kp_dex.js jobs)
  // Written in T units through the shorthands below. A part builder gets (mb, L, g): g is a second builder whose parts
  // glow (lamps, crystals, eyes, gems), attached unlit.
  const tt = (p) => p.map(v => v * T);
  const bx = (mb, x, y, z, w, h, d, c) => mb.box(x * T, y * T, z * T, w * T, h * T, d * T, c);
  const el = (mb, x, y, z, rx, ry, rz, c, seg = 8, rings = 5) => mb.sphere(x * T, y * T, z * T, rx * T, ry * T, rz * T, c, seg, rings, false);
  const ball = (mb, x, y, z, r, c, seg = 6) => mb.sphere(x * T, y * T, z * T, r * T, r * T, r * T, c, seg, 4, false);
  const dome = (mb, x, y, z, rx, ry, rz, c, seg = 10) => mb.sphere(x * T, y * T, z * T, rx * T, ry * T, rz * T, c, seg, 6, false, null, 3);
  const cyl = (mb, x, y, z, r0, r1, h, c, n = 8) => mb.prism(x * T, y * T, z * T, r0 * T, r1 * T, h * T, n, c, false);
  // loft rings [y, rx, rz?, z?, x?, colour or colours(i, n)?]
  const lof = (mb, rings, c, o) => mb.loft(rings.map(r => { const q = { y: r[0] * T, rx: r[1] * T, rz: (r[2] == null ? r[1] : r[2]) * T, z: (r[3] || 0) * T, x: (r[4] || 0) * T }; if (typeof r[5] === 'function') q.colors = r[5]; else if (r[5]) q.color = r[5]; return q; }), Object.assign({ sides: 10, color: c, smooth: false }, o || {}));
  const bl = (mb, p, d, len, w, th, c, side, tip) => mb.blade(tt(p), d, len * T, w * T, th * T, c, side && side.radial ? { radial: tt(side.radial) } : side, tip);
  const sw = (mb, pts, r, c, o) => mb.sweep(pts.map(tt), Array.isArray(r) ? r.map(v => (Array.isArray(v) ? tt(v) : v * T)) : r * T, Object.assign({ sides: 6, color: c, smooth: false }, o || {}));
  const spk = (mb, p, d, len, r, c, n = 5) => mb.spike(tt(p), d, len * T, r * T, n, c);
  const pan = (mb, pts, z, th, c, back) => mb.panel(pts.map(tt), z * T, th * T, c, back);
  const tri = (mb, a, b, c, col) => mb.tri(tt(a), tt(b), tt(c), col);
  const xf = (mb, t, r, fn) => { mb.push(); mb.translate(t[0] * T, t[1] * T, t[2] * T); if (r) mb.rotate(r[0], r[1], r[2]); fn(); mb.pop(); };
  const zcyl = (mb, x, y, z, r0, r1, len, c, n = 8) => xf(mb, [x, y, z], [PI / 2, 0, 0], () => cyl(mb, 0, 0, 0, r0, r1, len, c, n));   // along +z
  const loop = (cx, cy, cz, r, n, plane = 'xz', r2) => { const p = []; for (let i = 0; i <= n; i++) { const a = i / n * PI * 2, u = Math.cos(a) * r, v = Math.sin(a) * (r2 || r); p.push(plane === 'xz' ? [cx + u, cy, cz + v] : plane === 'xy' ? [cx + u, cy + v, cz] : [cx, cy + v, cz + u]); } return p; };
  // a five-petal flower facing +z ('xy'), up ('xz') or out to the side ('zy')
  const flower = (mb, x, y, z, r, petal, mid, plane = 'xy') => {
    const at = (u, v) => (plane === 'xy' ? [x + u, y + v, z] : plane === 'xz' ? [x + u, y, z + v] : [x, y + v, z + u]);
    for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; ball(mb, ...at(Math.cos(a) * r, Math.sin(a) * r), r * 0.72, petal, 5); }
    const o = r * 0.3; ball(mb, plane === 'zy' ? x + Math.sign(x || 1) * o : x, plane === 'xz' ? y + o : y, plane === 'xy' ? z + o : z, r * 0.6, mid || '#ffe060', 5);
  };
  const gear = (mb, x, y, z, r, th, c, n = 8) => { zcyl(mb, x, y, z - th / 2, r, r, th, c, 12); for (let i = 0; i < n; i++) xf(mb, [x, y, z], [0, 0, i / n * PI * 2], () => bx(mb, 0, r + 0.014, 0, r * 0.45, 0.034, th, c)); zcyl(mb, x, y, z - th / 2 - 0.004, r * 0.32, r * 0.32, th + 0.008, sh(c, -0.25), 8); };
  // a tapering tube along a smoothed curve (horns, tails, tendrils)
  const curve = (mb, pts, r0, r1, c, segs = 3) => { const P = mb.curvePts(pts, segs), n = P.length - 1; sw(mb, P, P.map((p, i) => r0 + (r1 - r0) * i / n), c); };
  // a brim ring from radius r0 out to r1 at height y, its edge lifted by curl(angle)
  const brim = (mb, y, r0, r1, c, curl, n = 16, z = 0) => { for (let i = 0; i < n; i++) { const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2, P = (a, r, k) => [Math.cos(a) * r, y + (k ? curl(a) : 0), z + Math.sin(a) * r]; tri(mb, P(a0, r0, 0), P(a0, r1, 1), P(a1, r1, 1), c); tri(mb, P(a0, r0, 0), P(a1, r1, 1), P(a1, r0, 0), c); } };
  // the bare robot's outlines (js/gl/cast_rigs.js RIGS.moogle) to fit clothes round: [y, rx, rz, z] rings of the torso and
  // the head. tor(y, pad) / hed(y, pad): a loft ring just outside it at that height
  const TORSO = [[-0.1, 0.15, 0.14, 0], [0, 0.24, 0.23, 0], [0.13, 0.265, 0.25, 0], [0.26, 0.24, 0.23, 0], [0.36, 0.19, 0.18, 0], [0.42, 0.1, 0.1, 0]];
  const HEAD = [[-0.02, 0.15, 0.14, 0], [0.05, 0.21, 0.19, 0.01], [0.2, 0.225, 0.21, 0.01], [0.34, 0.2, 0.19, 0], [0.42, 0.13, 0.13, 0], [0.45, 0.04, 0.04, 0]];
  const along = (P, y) => { let i = 0; while (i < P.length - 2 && y > P[i + 1][0]) i++; const a = P[i], b = P[i + 1], k = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0]))); return [1, 2, 3].map(j => a[j] + (b[j] - a[j]) * k); };
  const tor = (y, pad = 0.015, extra) => { const [rx, rz, z] = along(TORSO, y); return [y, rx + pad, rz + pad, z, 0, extra]; };
  const hed = (y, pad = 0.012, extra) => { const [rx, rz, z] = along(HEAD, y); return [y, rx * 1.06 + pad, rz * 1.06 + pad, z, 0, extra]; };
  const STEEL = '#b8bcc8', DARK = '#26262c', GOLD = '#d8b040', WOOD = '#8a5a30', IVORY = '#f0e8d0', WHITE = '#f4f4f2';
  const OPEN = [PI * 0.62, PI * 2.38];   // a loft arc that leaves the front open: a hood's face, a coat's front
  // a hood over the head and down the back of the neck (rz grows a little at the back), open at the face
  // a shadowed face (the Black Mage family, the head dark under the hood: the user, 2026-10-04, FF9's black mages for
  // the look) opens its hood wider, the whole face a void with two eyes in it; a hood's narrow slit hid all but a sliver
  let SHADE = false;
  const faceOpen = (arc) => SHADE && arc ? [Math.max(arc[0], PI * 0.74), Math.min(arc[1], PI * 2.26)] : arc;
  // (every hood shows the face: a slit narrower than the eyes hid half the face at any turn; wider still for a shadowed one)
  const hoodArc = (arc) => [Math.max(arc[0], PI * 0.7), Math.min(arc[1], PI * 2.3)];
  const hood = (mb, c, top = 0.52, arc = OPEN, low = 0.04) => lof(mb, [hed(low, 0.035), hed(0.2, 0.04), hed(0.36, 0.03), [top - 0.04, 0.12, 0.12, -0.04], [top, 0.001, 0.001, -0.05]], c, { arc: faceOpen(hoodArc(arc)) });
  const split = (a, b) => (i, n) => (Math.cos(PI / n + (i + 0.5) * 2 * PI / n) > 0 ? a : b);   // left half / right half

  Object.assign(HATS, {
    onion(mb, L) {   // the Onion Knight's onion-bulb helm; the pom-pom sprouts from its tip between two leaves
      const m = L.g2 || STEEL;
      lof(mb, [hed(0.27, 0.016), [0.34, 0.25, 0.24], [0.43, 0.2, 0.19], [0.5, 0.09, 0.09], [0.555, 0.012, 0.012]], m);
      lof(mb, [hed(0.26, 0.02), hed(0.3, 0.02)], sh(m, -0.2));
      [1, -1].forEach(s => bl(mb, [0, 0.53, 0], [s * 0.8, 0.55, 0], 0.12, 0.05, 0.012, L.g1 || '#5a9a3a', [0, 0, 1]));
    },
    bucket(mb, L) {  // the Fisher's bucket hat, a lure hooked in its band
      const c = L.g2 || '#d8c890';
      lof(mb, [[0.27, 0.31, 0.3], hed(0.31, 0.014), [0.43, 0.2, 0.19], [0.465, 0.07, 0.07], [0.47, 0.001]], c);
      lof(mb, [hed(0.31, 0.018), hed(0.35, 0.018)], L.g1 || '#6a7a4a');
      ball(mb, 0.15, 0.34, 0.17, 0.024, '#e04030'); spk(mb, [0.15, 0.32, 0.17], [0, -1, 0.3], 0.05, 0.008, STEEL, 4);
    },
    souwester(mb, L) { // the Harpooner's rain hat: a deep crown and a brim that runs long down the back
      const c = L.g1 || '#e8c030';
      dome(mb, 0, 0.29, 0, 0.236, 0.18, 0.226, c);
      lof(mb, [[0.25, 0.3, 0.29, -0.06], hed(0.29, 0.015)], sh(c, -0.06));
    },
    beanie(mb, L) {  // the Chemist's knit cap, turned up, a white cross on the front
      const c = L.g1 || '#4a7a5a';
      dome(mb, 0, 0.28, 0, 0.236, 0.2, 0.226, c);
      lof(mb, [hed(0.27, 0.02), hed(0.32, 0.02)], sh(c, -0.12));
      bx(mb, 0, 0.37, 0.205, 0.07, 0.022, 0.02, WHITE); bx(mb, 0, 0.37, 0.205, 0.022, 0.07, 0.02, WHITE);
    },
    goggles(mb, L, g) { // the Alchemist's brass goggles on its brow, a strap round the head
      const b = L.g2 || '#b08a3a';
      lof(mb, [hed(0.3, 0.012), hed(0.335, 0.012)], '#4a3a2a');
      [1, -1].forEach(s => { zcyl(mb, s * 0.075, 0.335, 0.15, 0.05, 0.05, 0.075, b, 8); el(g, s * 0.075, 0.335, 0.226, 0.04, 0.04, 0.006, '#a8e8f0', 8, 4); });
      bx(mb, 0, 0.335, 0.2, 0.06, 0.016, 0.016, b);
    },
    straw(mb, L) {   // the Farmer's wide straw hat with a red band
      const c = L.g2 || '#e0c070';
      cyl(mb, 0, 0.3, 0, 0.4, 0.38, 0.02, c, 14);
      lof(mb, [hed(0.3, 0.01), [0.42, 0.19, 0.18], [0.46, 0.15, 0.14], [0.465, 0.001]], c);
      lof(mb, [hed(0.31, 0.016), hed(0.36, 0.016)], '#c03030');
    },
    harvest(mb, L) { // the Harvester's broad cone of a sun hat, a sheaf of wheat tucked in
      const c = L.g2 || '#d8b050';
      lof(mb, [[0.29, 0.42, 0.42], [0.33, 0.3, 0.3], [0.5, 0.05, 0.05], [0.52, 0.001]], c, { sides: 12 });
      [-0.3, 0, 0.3].forEach(a => bl(mb, [0.18, 0.36, -0.06], [0.6 + a, 1, -0.4], 0.2, 0.03, 0.01, '#e8c860', [0, 0, 1], '#c89830'));
    },
    hoodcape(mb, L) { // the Archer's hood, its long point trailing, a red feather
      const c = L.g1 || '#4a8a3a';
      hood(mb, c, 0.52);
      bl(mb, [0, 0.47, -0.08], [0, -0.35, -1], 0.26, 0.12, 0.05, c, [1, 0, 0]);
      bl(mb, [0.13, 0.42, -0.06], [0.5, 1, -0.6], 0.24, 0.045, 0.01, '#d03030', [1, 0, 0]);
    },
    scope(mb, L, g) { // the Sniper's beret and a scope over one eye
      mb.sphere(-0.03 * T, 0.385 * T, -0.02 * T, 0.225 * T, 0.075 * T, 0.215 * T, L.g1 || '#4a5a3a', 10, 5, false);
      lof(mb, [hed(0.3, 0.012), hed(0.33, 0.012)], '#2a2a2a');
      zcyl(mb, -0.075, 0.235, 0.17, 0.038, 0.042, 0.1, '#34343a', 8); el(g, -0.075, 0.235, 0.271, 0.032, 0.032, 0.005, '#ff3030', 8, 4);
      bx(mb, -0.075, 0.29, 0.2, 0.02, 0.07, 0.02, '#34343a');
    },
    earflap(mb, L) { // the Hunter's check cap: flaps down over the ears, a short bill
      const c = L.g1 || '#b03030', st = (i) => (i % 2 ? c : sh(c, -0.25));
      lof(mb, [hed(0.27, 0.02, st), [0.4, 0.2, 0.19, 0, 0, st], [0.46, 0.08, 0.08], [0.47, 0.001]], c);
      [1, -1].forEach(s => el(mb, s * 0.22, 0.22, -0.02, 0.035, 0.09, 0.08, sh(c, -0.1), 6, 4));
      el(mb, 0, 0.3, 0.2, 0.15, 0.015, 0.1, sh(c, -0.2), 8, 4);
    },
    coonskin(mb, L) { // the Trapper's fur cap with a striped tail down its back
      const c = L.g1 || '#9a7a4a';
      lof(mb, [hed(0.27, 0.02), [0.4, 0.235, 0.225], [0.46, 0.16, 0.15], [0.47, 0.001]], c);
      sw(mb, [[0, 0.36, -0.2], [0.02, 0.3, -0.26], [0.04, 0.22, -0.29], [0.05, 0.14, -0.29], [0.06, 0.06, -0.27], [0.06, 0.0, -0.24]], [0.05, 0.052, 0.05, 0.045, 0.035, 0.012], c, { colors: (k) => (k % 2 ? '#3a2a1a' : c) });
    },
    leafcrown(mb, L) { // the Dryad's wreath of leaves and a pink flower over one ear
      const c = L.g1 || '#5aa04a';
      for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2, x = Math.cos(a), z = Math.sin(a); bl(mb, [x * 0.215, 0.33, z * 0.205], [x, 0.8, z], 0.13, 0.065, 0.012, i % 2 ? c : sh(c, 0.14), { radial: [0, 0.33, 0] }); }
      flower(mb, 0.19, 0.38, 0.1, 0.03, L.g2 || '#f0a0c0', '#ffe060', 'zy');
    },
    topper(mb, L) {  // the Juggler's little top hat, cocked to one side
      const c = L.g1 || '#d04040';
      xf(mb, [0.03, 0.4, 0], [0, 0, -0.3], () => { cyl(mb, 0, 0, 0, 0.18, 0.18, 0.016, sh(c, -0.25), 12); cyl(mb, 0, 0, 0, 0.115, 0.125, 0.17, c, 10); cyl(mb, 0, 0.02, 0, 0.12, 0.122, 0.035, L.g2 || '#f0d040', 10); });
    },
    jester(mb, L) {  // the Jester's two-pointed cap, a bell on each point
      const a = L.g1 || '#7a3ac0', b = L.g2 || '#f0c030', h = split(a, b);
      lof(mb, [hed(0.27, 0.018, h), [0.4, 0.21, 0.2, 0, 0, h], [0.46, 0.09, 0.09], [0.47, 0.001]], a);
      [[1, a], [-1, b]].forEach(([s, c]) => { sw(mb, [[s * 0.05, 0.42, 0], [s * 0.18, 0.53, -0.02], [s * 0.32, 0.52, -0.04], [s * 0.4, 0.4, -0.05]], [0.1, 0.075, 0.04, 0.008], c); ball(mb, s * 0.405, 0.375, -0.05, 0.032, GOLD); });
    },
    hachigane(mb, L) { // the Genin's headband with its steel plate, the ties flying behind
      const c = L.g1 || '#3a4a7a';
      lof(mb, [hed(0.27, 0.014), hed(0.33, 0.014)], c, { sides: 12 });
      xf(mb, [0, 0.3, 0.214], [-0.25, 0, 0], () => { bx(mb, 0, 0, 0, 0.13, 0.05, 0.016, L.g2 || '#a8acb4'); bx(mb, 0, 0, 0.009, 0.05, 0.01, 0.004, DARK); });
      [1, -1].forEach(s => bl(mb, [s * 0.03, 0.3, -0.21], [s * 0.6, -0.3, -1], 0.2, 0.045, 0.01, c, [0, 1, 0]));
    },
    kunoichi(mb, L) { // the Kunoichi's hood, a high tail of cloth and a flower pin
      const c = L.g1 || '#a02040';
      lof(mb, [hed(0.27, 0.018), [0.38, 0.22, 0.21], [0.45, 0.11, 0.11], [0.47, 0.001]], c);
      sw(mb, [[0, 0.43, -0.08], [0, 0.55, -0.15], [0, 0.56, -0.27], [0.01, 0.45, -0.36], [0.02, 0.32, -0.38]], [0.05, 0.046, 0.04, 0.03, 0.006], sh(c, -0.12));
      flower(mb, 0.17, 0.37, 0.13, 0.022, L.g2 || '#f0b0c8', '#ffe060');
    },
    kettle(mb, L) {  // the Squire's kettle hat: a steel dome, a wide flat brim, a ridge over the top
      const m = L.g2 || STEEL;
      dome(mb, 0, 0.3, 0, 0.236, 0.18, 0.226, m);
      cyl(mb, 0, 0.29, 0, 0.32, 0.3, 0.02, sh(m, -0.1), 12);
      sw(mb, [[0, 0.32, 0.22], [0, 0.48, 0], [0, 0.32, -0.22]], 0.014, sh(m, 0.12));
    },
    visor(mb, L) {   // the Knight's helm, its visor raised, a plume behind
      const m = L.g2 || STEEL;
      dome(mb, 0, 0.29, 0, 0.238, 0.2, 0.228, m);
      lof(mb, [hed(0.1, 0.03), hed(0.29, 0.024)], sh(m, -0.06), { arc: [PI * 0.75, PI * 2.25] });
      xf(mb, [0, 0.42, 0.18], [-0.55, 0, 0], () => { bx(mb, 0, 0, 0, 0.3, 0.08, 0.03, sh(m, -0.1)); bx(mb, 0, 0, 0.016, 0.2, 0.012, 0.004, DARK); });
      bl(mb, [0, 0.47, -0.05], [0, 0.6, -1], 0.26, 0.08, 0.04, L.g1 || '#3a5aa8', [1, 0, 0]);
    },
    paladin(mb, L) { // the Paladin's winged helm, a gold crest and gold wings
      const m = L.g2 || '#eceef4', gd = L.g1 || GOLD;
      dome(mb, 0, 0.29, 0, 0.238, 0.2, 0.228, m);
      lof(mb, [hed(0.12, 0.03), hed(0.29, 0.024)], m, { arc: [PI * 0.75, PI * 2.25] });
      xf(mb, [0, 0, 0], [0, PI / 2, 0], () => pan(mb, [[-0.16, 0.41], [0.17, 0.41], [0.12, 0.5], [-0.06, 0.56], [-0.18, 0.47]], 0, 0.02, gd));
      [1, -1].forEach(s => { for (let k = 0; k < 3; k++) bl(mb, [s * 0.21, 0.36, -0.03], [s * (0.6 + k * 0.25), 0.9 - k * 0.35, -0.5], 0.2 - k * 0.03, 0.06, 0.01, gd, [0, 0, 1]); });
    },
    spectacles(mb) { // the Mediator's round glasses, and a pencil behind its ear
      const f = '#3a2a1a';
      [1, -1].forEach(s => sw(mb, loop(s * 0.075, 0.24, 0.232, 0.046, 10, 'xy'), 0.007, f, { sides: 4 }));
      sw(mb, [[-0.03, 0.245, 0.236], [0, 0.255, 0.24], [0.03, 0.245, 0.236]], 0.006, f, { sides: 4 });
      [1, -1].forEach(s => sw(mb, [[s * 0.12, 0.24, 0.225], [s * 0.19, 0.25, 0.12], [s * 0.215, 0.26, 0.0]], 0.006, f, { sides: 4 }));
      xf(mb, [0.19, 0.33, 0.03], [0.3, 0, 0.7], () => { cyl(mb, 0, -0.08, 0, 0.012, 0.012, 0.16, '#e8c040', 6); cyl(mb, 0, 0.08, 0, 0.012, 0, 0.03, '#e8c8a0', 6); });
    },
    laurel(mb, L) {  // the Orator's laurel wreath
      const c = '#5a9a3a';
      [1, -1].forEach(s => { for (let k = 0; k < 7; k++) { const a = -PI / 2 + s * (k / 6) * (PI - 0.4), x = Math.cos(a), z = Math.sin(a); bl(mb, [x * 0.218, 0.33 + k * 0.004, z * 0.208], [-s * Math.sin(a), 0.3, s * Math.cos(a)], 0.09, 0.045, 0.01, k % 2 ? c : sh(c, 0.15), { radial: [0, 0.33, 0] }); } });
    },
    sailor(mb, L) {  // the Sailor's white cap, its brim rolled up, a navy band and ribbons
      const c = L.g1 || '#2a4a9a';
      lof(mb, [hed(0.29, 0.014), [0.32, 0.27, 0.26], [0.35, 0.24, 0.23], [0.36, 0.215, 0.205], [0.44, 0.175, 0.165], [0.455, 0.001]], WHITE);
      lof(mb, [[0.36, 0.218, 0.208], [0.39, 0.212, 0.202]], c);
      [1, -1].forEach(s => bl(mb, [s * 0.03, 0.36, -0.2], [s * 0.3, -1, -0.4], 0.14, 0.035, 0.008, c, [1, 0, 0]));
    },
    captain(mb, L) { // the Captain's peaked cap: a wide navy crown, a gold band and badge, a black peak
      const c = L.g1 || '#1a2a5a', gd = L.g2 || GOLD;
      lof(mb, [hed(0.29, 0.012), [0.38, 0.25, 0.24, -0.01], [0.43, 0.262, 0.252, -0.02], [0.45, 0.001, 0.001, -0.02]], c);
      lof(mb, [hed(0.29, 0.018), hed(0.33, 0.018)], gd);
      el(mb, 0, 0.3, 0.2, 0.16, 0.014, 0.1, '#141418', 8, 4);
      ball(mb, 0, 0.38, 0.235, 0.026, gd);
    },
    pirate(mb) {     // the Pirate's black tricorne with a skull, and an eyepatch
      const c = '#22222a';
      HATS.tricorne(mb, { g1: c, g2: c });
      ball(mb, 0, 0.39, 0.165, 0.034, '#f0f0e8'); [1, -1].forEach(s => ball(mb, s * 0.012, 0.392, 0.197, 0.009, '#141418', 4));
      el(mb, 0.075, 0.235, 0.226, 0.036, 0.032, 0.012, '#141418', 8, 4);
      sw(mb, [[0.105, 0.255, 0.21], [0.17, 0.3, 0.13], [0.2, 0.33, 0.0]], 0.006, '#141418', { sides: 4 });
      sw(mb, [[0.045, 0.255, 0.225], [-0.06, 0.31, 0.2], [-0.16, 0.34, 0.1]], 0.006, '#141418', { sides: 4 });
    },
    feathercap(mb, L) { // the Sky Pirate's cavalier hat, its brim pinned up one side, a long plume
      const c = L.g1 || '#7a4a2a';
      brim(mb, 0.31, 0.2, 0.32, sh(c, -0.12), (a) => (Math.cos(a) > 0 ? Math.cos(a) * 0.12 : 0));
      lof(mb, [hed(0.3, 0.012), [0.43, 0.2, 0.19], [0.46, 0.1, 0.1], [0.47, 0.001]], c);
      bl(mb, [0.18, 0.4, 0.02], [0.35, 0.45, -1], 0.36, 0.1, 0.012, L.g2 || '#d8c8a0', [0, 1, 0]);
      ball(mb, 0.23, 0.38, 0.06, 0.025, GOLD);
    },
    chococrest(mb, L) { // the Chocobo Rider's riding cap and a crest of yellow chocobo feathers
      const c = L.crest || '#f0c830';
      dome(mb, 0, 0.29, 0, 0.236, 0.17, 0.226, '#7a5030');
      for (let i = 0; i < 4; i++) bl(mb, [0, 0.43, 0.04 - i * 0.05], [0, 1, -0.6 - i * 0.25], 0.19 - i * 0.02, 0.06, 0.024, i % 2 ? c : sh(c, 0.1), [1, 0, 0]);
      el(mb, 0, 0.3, 0.2, 0.13, 0.014, 0.085, '#5a3820', 8, 4);
    },
    chocohelm(mb, L) { // the Chocobo Knight's helm with a tall crest of yellow feathers
      const m = L.g2 || STEEL, c = L.g1 || '#e8c030';
      dome(mb, 0, 0.29, 0, 0.238, 0.2, 0.228, m);
      lof(mb, [hed(0.13, 0.03), hed(0.29, 0.024)], m, { arc: [PI * 0.75, PI * 2.25] });
      for (let i = 0; i < 5; i++) bl(mb, [0, 0.46, 0.08 - i * 0.05], [0, 1, -0.3 - i * 0.3], 0.25 - i * 0.025, 0.07, 0.026, i % 2 ? c : sh(c, 0.12), [1, 0, 0]);
    },
    mohawk(mb, L) {  // the Berserker's red crest of fur and its war paint
      const c = L.g1 || '#c03020';
      for (let i = 0; i < 8; i++) { const f = 0.35 + i * 0.32, z = Math.cos(f) * 0.2, y = 0.33 + Math.sin(f) * 0.12; bl(mb, [0, y, z], [0, Math.sin(f), Math.cos(f) * 0.6], 0.15 - Math.abs(i - 3.5) * 0.012, 0.07, 0.03, i % 2 ? c : sh(c, -0.15), [0, -Math.cos(f), Math.sin(f)]); }
      [1, -1].forEach(s => [0.2, 0.17].forEach(y => xf(mb, [s * 0.13, y, 0.18], [0, s * 0.6, 0], () => bx(mb, 0, 0, 0, 0.06, 0.013, 0.01, c))));
    },
    viking(mb, L) {  // the Viking's horned helm and its nose guard
      const m = L.g1 || '#9a9aa0';
      dome(mb, 0, 0.29, 0, 0.238, 0.2, 0.228, m);
      lof(mb, [hed(0.29, 0.026), hed(0.32, 0.026)], '#7a5a30');
      bx(mb, 0, 0.29, 0.222, 0.03, 0.1, 0.02, m);
      [1, -1].forEach(s => sw(mb, [[s * 0.2, 0.37, 0], [s * 0.3, 0.43, 0.01], [s * 0.36, 0.53, 0.02], [s * 0.35, 0.63, 0.0]], [0.045, 0.04, 0.028, 0.004], IVORY));
    },
    lampcap(mb, L) { // the Lamplighter's flat cap
      const c = L.g1 || '#3a4a6a';
      lof(mb, [hed(0.29, 0.012), [0.36, 0.25, 0.26, 0.03], [0.41, 0.2, 0.21, 0.03], [0.43, 0.001, 0.001, 0.03]], c);
      el(mb, 0, 0.3, 0.2, 0.14, 0.014, 0.09, sh(c, -0.15), 8, 4);
    },
    lighthouse(mb, L, g) { // the Beacon's crown: a little striped lighthouse, its lamp lit
      const r = '#c83030';
      lof(mb, [hed(0.28, 0.014), [0.4, 0.16, 0.16]], WHITE);
      [[0.4, 0.46, r], [0.46, 0.52, WHITE], [0.52, 0.58, r]].forEach(([y0, y1, c]) => cyl(mb, 0, y0, 0, 0.13 - (y0 - 0.4) * 0.4, 0.13 - (y1 - 0.4) * 0.4, y1 - y0, c, 10));
      cyl(mb, 0, 0.58, 0, 0.12, 0.12, 0.012, DARK, 10);
      for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; bx(mb, Math.cos(a) * 0.08, 0.63, Math.sin(a) * 0.08, 0.012, 0.09, 0.012, DARK); }
      ball(g, 0, 0.63, 0, 0.068, L.g2 || '#ffe070', 8);
      cyl(mb, 0, 0.675, 0, 0.11, 0, 0.08, r, 10);
    },
    hardhat(mb, L, g) { // the Miner's hard hat with a lamp on the front
      const c = L.g2 || '#e8c020';
      dome(mb, 0, 0.3, 0, 0.24, 0.18, 0.23, c);
      cyl(mb, 0, 0.3, 0.02, 0.28, 0.27, 0.018, sh(c, -0.06), 12);
      sw(mb, [[0, 0.3, 0.235], [0, 0.48, 0], [0, 0.3, -0.235]], 0.016, sh(c, 0.1));
      zcyl(mb, 0, 0.385, 0.17, 0.04, 0.046, 0.065, '#5a5a60', 8); el(g, 0, 0.385, 0.237, 0.036, 0.036, 0.006, '#fff4b0', 8, 4);
    },
    shellhelm(mb, L) { // the Guardian's spiral seashell helm
      const c = L.g2 || '#d8c8a0', rings = [];
      for (let i = 0; i <= 7; i++) { const t = i / 7, a = t * PI * 2.4, b = hed(0.28, 0.02); rings.push([0.28 + t * 0.34, b[1] * (1 - t * 0.94), b[2] * (1 - t * 0.94), Math.sin(a) * 0.05 * t, Math.cos(a) * 0.05 * t, i % 2 ? c : sh(c, -0.14)]); }
      lof(mb, rings, c);
    },
    welder(mb) {     // the Tinker's welding mask, flipped up on its brow
      lof(mb, [hed(0.3, 0.012), hed(0.335, 0.012)], '#5a4030');
      xf(mb, [0, 0.44, 0.1], [-1.0, 0, 0], () => { bx(mb, 0, 0, 0, 0.3, 0.22, 0.04, '#3a3a40'); bx(mb, 0, 0.0, 0.022, 0.17, 0.05, 0.01, '#2a6a4a'); });
      [1, -1].forEach(s => ball(mb, s * 0.2, 0.34, 0.06, 0.03, '#5a5a60'));
    },
    engcap(mb, L) {  // the Engineer's striped railway cap
      const c = L.g1 || '#3a5a8a', st = (i) => (i % 2 ? WHITE : c);
      lof(mb, [hed(0.29, 0.012, st), [0.38, 0.252, 0.25, 0.01, 0, st], [0.43, 0.19, 0.19, 0.01], [0.445, 0.001, 0.001, 0.01]], c, { sides: 12 });
      el(mb, 0, 0.3, 0.2, 0.14, 0.014, 0.09, sh(c, -0.2), 8, 4);
    },
    gearcrown(mb, L) { // the Artificer's crown of cogs, a big gear standing on top
      const gd = L.g2 || '#d0a040';
      lof(mb, [hed(0.29, 0.016), hed(0.37, 0.016)], gd, { sides: 12 });
      for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2, b = hed(0.37, 0.016); bx(mb, Math.cos(a) * b[1], 0.39, Math.sin(a) * b[2], 0.04, 0.04, 0.04, gd); }
      gear(mb, 0, 0.53, 0, 0.1, 0.03, sh(gd, 0.12));
    },
    armyhelm(mb, L) { // the Gunner's round army helmet and its chin strap
      const c = L.g1 || '#5a6a3a';
      dome(mb, 0, 0.29, 0, 0.25, 0.2, 0.24, c);
      lof(mb, [[0.27, 0.272, 0.262], [0.3, 0.25, 0.24]], sh(c, -0.1));
      [1, -1].forEach(s => sw(mb, [[s * 0.22, 0.27, 0.02], [s * 0.18, 0.1, 0.1], [s * 0.08, 0.03, 0.17], [0, 0.02, 0.18]], 0.008, '#4a3a20', { sides: 4 }));
    },
    shades(mb) {     // the Gun-Arm's shades and a red headband
      [1, -1].forEach(s => xf(mb, [s * 0.075, 0.24, 0.226], [0, s * 0.3, 0], () => bx(mb, 0, 0, 0, 0.1, 0.05, 0.012, '#141418')));
      bx(mb, 0, 0.25, 0.236, 0.06, 0.012, 0.01, '#141418');
      lof(mb, [hed(0.3, 0.012), hed(0.34, 0.012)], '#b02020');
    },
    tophat(mb, L) {  // the Puppeteer's tall top hat
      const c = '#1e1a24';
      cyl(mb, 0, 0.39, 0, 0.27, 0.27, 0.018, c, 14);
      cyl(mb, 0, 0.39, 0, 0.165, 0.18, 0.3, c, 12);
      cyl(mb, 0, 0.42, 0, 0.17, 0.172, 0.045, L.g1 || '#4a2a5a', 12);
    },
    bluemask(mb, L) { // the Blue Mage's hood and the gold mask over its eyes
      const c = L.g1 || '#2a5ab0';
      hood(mb, c, 0.54);
      lof(mb, [hed(0.2, 0.026), hed(0.29, 0.024)], L.g2 || '#d8c070', { arc: [PI * 0.1, PI * 0.9] });
      [1, -1].forEach(s => el(mb, s * 0.075, 0.245, 0.238, 0.036, 0.011, 0.004, '#141418', 6, 3));
    },
    plumed(mb, L, g) { // the Blue Wizard's tall cap with three feathers and a gem
      const c = L.g1 || '#1a2a7a';
      lof(mb, [hed(0.28, 0.016), [0.4, 0.22, 0.21, -0.01], [0.55, 0.14, 0.13, -0.05], [0.64, 0.04, 0.04, -0.1], [0.66, 0.001, 0.001, -0.11]], c);
      lof(mb, [hed(0.28, 0.022), hed(0.32, 0.022)], GOLD);
      ball(g, 0, 0.36, 0.232, 0.03, L.g2 || '#40c0e0');
      [-1, 0, 1].forEach(k => bl(mb, [0.12, 0.42, -0.05], [0.4 + k * 0.3, 1, -0.5 + k * 0.2], 0.26 - Math.abs(k) * 0.05, 0.05, 0.01, k ? WHITE : (L.g2 || '#40c0e0'), [0, 0, 1]));
    },
    redmage(mb, L) { // the Red Mage's wide-brimmed hat and its long white feather
      const c = L.g1 || '#c02838';
      xf(mb, [0, 0.31, 0], [0.08, 0, -0.1], () => cyl(mb, 0, 0, 0, 0.36, 0.34, 0.02, sh(c, -0.1), 14));
      lof(mb, [hed(0.3, 0.012), [0.42, 0.21, 0.2], [0.48, 0.13, 0.12], [0.49, 0.001]], c);
      bl(mb, [0.19, 0.42, 0.04], [-0.35, 0.32, -1], 0.42, 0.1, 0.014, L.g2 || '#f4f0e8', [1, 0.3, -0.3]);
    },
    redwizard(mb, L, g) { // the Red Wizard: a wider brim, a gold band, two feathers and a gem
      const c = L.g1 || '#a01828', gd = L.g2 || '#e8c040';
      xf(mb, [0, 0.31, 0], [0.08, 0, -0.1], () => cyl(mb, 0, 0, 0, 0.42, 0.4, 0.022, sh(c, -0.1), 16));
      lof(mb, [hed(0.3, 0.012), [0.44, 0.21, 0.2], [0.5, 0.13, 0.12], [0.51, 0.001]], c);
      lof(mb, [hed(0.31, 0.018), hed(0.35, 0.018)], gd);
      bl(mb, [0.19, 0.42, 0.04], [-0.35, 0.32, -1], 0.46, 0.11, 0.014, WHITE, [1, 0.3, -0.3]);
      bl(mb, [0.2, 0.43, 0.06], [-0.1, 0.5, -1], 0.34, 0.08, 0.012, gd, [1, 0.3, -0.1]);
      ball(g, 0.12, 0.34, 0.2, 0.025, '#ff3050');
    },
    sage(mb, L, g) { // the Sage's tall two-tone hat with a gem, split down the middle
      const a = L.g1 || '#8a2a6a', b = L.g2 || '#4060c0', h = split(a, b);
      lof(mb, [hed(0.28, 0.016, h), [0.46, 0.2, 0.19, -0.02, 0, h], [0.68, 0.07, 0.07, -0.06, 0, h], [0.76, 0.001, 0.001, -0.1]], a);
      lof(mb, [hed(0.28, 0.022), hed(0.32, 0.022)], GOLD);
      ball(g, 0, 0.37, 0.228, 0.032, '#ff3040');
    },
    parka(mb, L) {   // the Ice Climber's hood, a thick roll of white fur round the face
      const c = L.g1 || '#d84a30', A = [PI * 0.66, PI * 2.34], cs = -Math.cos(A[0]), sn = Math.sin(A[0]);
      lof(mb, [hed(0.04, 0.04), hed(0.2, 0.045), hed(0.36, 0.035), [0.48, 0.13, 0.13, -0.05], [0.52, 0.001, 0.001, -0.06]], c, { arc: A });
      const edge = (y, s) => { const r = hed(y, 0.04 + 0.005 * Math.min(1, y / 0.2)); return [s * cs * r[1], y, r[3] + sn * r[2]]; };
      const side = (s) => [0.06, 0.16, 0.26, 0.34].map(y => edge(y, s));
      curve(mb, [...side(-1).reverse(), [-0.05, 0.43, 0.13], [0.05, 0.43, 0.13], ...side(1)], 0.042, 0.042, WHITE);
    },
    yeti(mb, L) {    // the Yeti's shaggy white head of fur and two little horns
      const c = L.g1 || '#f4f8ff';
      dome(mb, 0, 0.29, 0, 0.24, 0.19, 0.23, c);
      for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2, x = Math.cos(a), z = Math.sin(a); if (z > 0.7) continue; bl(mb, [x * 0.235, 0.34, z * 0.225], [x * 0.45, -1, z * 0.45], 0.15, 0.08, 0.02, i % 2 ? c : sh(c, -0.06), { radial: [0, 0.34, 0] }); }
      [1, -1].forEach(s => sw(mb, [[s * 0.14, 0.43, 0.02], [s * 0.2, 0.51, 0.05], [s * 0.22, 0.57, 0.0]], [0.035, 0.025, 0.004], L.g2 || '#7a9ac0'));
    },
    headgear(mb, L) { // the Pugilist's padded headguard
      const c = L.g1 || '#c03030';
      lof(mb, [hed(0.08, 0.03), hed(0.25, 0.03), hed(0.38, 0.025), [0.46, 0.12, 0.12, -0.02], [0.49, 0.001, 0.001, -0.02]], c, { arc: [PI * 0.7, PI * 2.3] });
      lof(mb, [hed(0.29, 0.03), hed(0.35, 0.03)], c, { arc: [PI * 0.15, PI * 0.85] });
      [1, -1].forEach(s => el(mb, s * 0.205, 0.15, 0.08, 0.05, 0.08, 0.065, sh(c, -0.08), 6, 4));
      sw(mb, [[-0.14, 0.42, 0.02], [0, 0.47, 0.02], [0.14, 0.42, 0.02]], 0.016, WHITE, { sides: 4 });
    },
    topknot(mb, L, g) { // the Master's cloth topknot bound in gold, and a red jewel on its brow
      ball(mb, 0, 0.5, -0.04, 0.075, L.g2 || '#7a2a2a', 8);
      lof(mb, [[0.43, 0.062, 0.062, -0.03], [0.47, 0.064, 0.064, -0.035]], L.g1 || GOLD);
      [1, -1].forEach(s => bl(mb, [s * 0.03, 0.5, -0.1], [s * 0.4, -0.8, -1], 0.16, 0.04, 0.01, L.g2 || '#7a2a2a', [0, 1, 0]));
      ball(g, 0, 0.33, 0.196, 0.022, '#ff4040');
    },
    sallet(mb, L) {  // the Lancer's sallet: a steel cap with a long tail flaring over the neck
      const m = L.g2 || STEEL;
      dome(mb, 0, 0.29, 0, 0.238, 0.2, 0.228, m);
      lof(mb, [[0.1, 0.28, 0.28, -0.06], hed(0.3, 0.024)], m, { arc: [PI * 1.02, PI * 1.98] });
      lof(mb, [hed(0.28, 0.028), hed(0.31, 0.028)], L.g1 || '#4a6aa0');
    },
    dragoon(mb, L) { // the Dragoon's dragon helm: a snout over the brow, swept horns, fins
      const c = L.g1 || '#5a3aa0', m = L.g2 || '#6a7ab8';
      dome(mb, 0, 0.29, 0, 0.238, 0.2, 0.228, c);
      lof(mb, [hed(0.14, 0.03), hed(0.29, 0.024)], c, { arc: [PI * 0.75, PI * 2.25] });
      xf(mb, [0, 0.37, 0.15], [PI / 2 - 0.25, 0, 0], () => cyl(mb, 0, 0, 0, 0.09, 0.0, 0.2, m, 4));
      [1, -1].forEach(s => { sw(mb, [[s * 0.12, 0.42, -0.04], [s * 0.2, 0.52, -0.16], [s * 0.22, 0.56, -0.3]], [0.035, 0.025, 0.003], m); bl(mb, [s * 0.22, 0.3, -0.02], [s * 0.6, 0.3, -1], 0.16, 0.08, 0.01, m, [0, 1, 0]); });
    },
    flightcap(mb, L, g) { // Highwind's leather flying helmet with its goggles up on the brow
      const c = '#7a5030', b = '#b08a3a';
      dome(mb, 0, 0.27, 0, 0.24, 0.21, 0.23, c);
      [1, -1].forEach(s => el(mb, s * 0.22, 0.2, 0.0, 0.03, 0.1, 0.08, sh(c, -0.1), 6, 4));
      [1, -1].forEach(s => { zcyl(mb, s * 0.075, 0.37, 0.16, 0.048, 0.048, 0.075, b, 8); el(g, s * 0.075, 0.37, 0.236, 0.038, 0.038, 0.006, '#a8d8f0', 8, 4); });
      bx(mb, 0, 0.37, 0.215, 0.06, 0.016, 0.016, b);
    },
    darkhelm(mb, L) { // the Dark Squire's black open helm, cheek guards and a spike
      const m = L.g2 || '#3a3a48';
      dome(mb, 0, 0.29, 0, 0.238, 0.2, 0.228, m);
      lof(mb, [hed(0.12, 0.03), hed(0.29, 0.024)], m, { arc: [PI * 0.72, PI * 2.28] });
      spk(mb, [0, 0.46, 0], [0, 1, 0], 0.12, 0.03, sh(m, 0.2), 6);
      lof(mb, [hed(0.29, 0.03), hed(0.31, 0.03)], L.g1 || '#5a1a2a');
    },
    darkknight(mb, L, g) { // the Dark Knight's closed horned helm, its eyes burning through the slit
      const m = L.g2 || '#2a2a36';
      dome(mb, 0, 0.28, 0.02, 0.244, 0.21, 0.25, m);
      lof(mb, [[0.04, 0.24, 0.245, 0.03], [0.28, 0.246, 0.25, 0.02]], m);
      bx(mb, 0, 0.235, 0.27, 0.2, 0.026, 0.01, '#0a0a0e');
      [1, -1].forEach(s => el(g, s * 0.07, 0.235, 0.276, 0.03, 0.011, 0.005, L.eyes || '#ff3030', 6, 3));
      [1, -1].forEach(s => sw(mb, [[s * 0.18, 0.38, 0.05], [s * 0.3, 0.46, 0.12], [s * 0.34, 0.6, 0.12], [s * 0.3, 0.7, 0.06]], [0.045, 0.035, 0.02, 0.003], '#1a1a22'));
      spk(mb, [0, 0.47, -0.02], [0, 1, -0.3], 0.1, 0.025, '#1a1a22', 5);
    },
    headwrap(mb, L) { // the Nomad's wrapped headcloth, a veil over its nose and mouth, a tail behind
      const c = L.g1 || '#c8a070';
      lof(mb, [hed(0.27, 0.02), [0.38, 0.24, 0.23], [0.45, 0.15, 0.15], [0.48, 0.001]], c);
      lof(mb, [[0.03, 0.2, 0.235, 0.035], [0.2, 0.232, 0.24, 0.03]], sh(c, -0.08), { arc: [PI * 0.1, PI * 0.9] });
      bl(mb, [0, 0.3, -0.22], [0.3, -1, -0.5], 0.24, 0.08, 0.01, c, [1, 0, 0]);
    },
    turban(mb, L, g) { // the Raider's big turban, a jewel and a plume
      const c = L.g1 || '#a03020';
      lof(mb, [hed(0.27, 0.02), [0.33, 0.27, 0.26], [0.42, 0.26, 0.25], [0.5, 0.17, 0.16], [0.54, 0.001]], c, { sides: 12 });
      sw(mb, [[-0.25, 0.33, 0.05], [-0.1, 0.42, 0.24], [0.12, 0.47, 0.2], [0.24, 0.47, 0.0]], 0.026, sh(c, -0.14));
      ball(g, 0, 0.38, 0.262, 0.032, '#40d0ff');
      bl(mb, [0, 0.4, 0.25], [0, 1, 0.1], 0.17, 0.05, 0.01, L.g2 || '#e0c060', [1, 0, 0]);
    },
    cactus(mb, L) {  // the Cactus Guard's own little cactus: arms, spines and a pink flower
      const c = L.g1 || '#5a9a3a';
      lof(mb, [[0.38, 0.09, 0.09], [0.58, 0.085, 0.085], [0.64, 0.05, 0.05], [0.66, 0.001]], c, { sides: 8 });
      [1, -1].forEach(s => sw(mb, [[s * 0.06, 0.48, 0], [s * 0.15, 0.48, 0], [s * 0.16, 0.58, 0]], 0.035, c));
      for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; spk(mb, [Math.cos(a) * 0.085, 0.45 + (i % 3) * 0.05, Math.sin(a) * 0.085], [Math.cos(a), 0.2, Math.sin(a)], 0.035, 0.006, '#f4f0c8', 3); }
      flower(mb, 0, 0.665, 0, 0.026, L.g2 || '#f070a0', '#ffe060', 'xz');
    },
    fedora(mb, L) {  // the Gambler's fedora, a playing card tucked in its band
      const c = L.g1 || '#2a2a2a';
      xf(mb, [0, 0.33, 0], [0.06, 0, 0], () => cyl(mb, 0, 0, 0, 0.32, 0.3, 0.018, sh(c, -0.05), 14));
      lof(mb, [hed(0.32, 0.014), [0.44, 0.2, 0.19], [0.48, 0.15, 0.12], [0.475, 0.001, 0.001]], c);
      lof(mb, [hed(0.33, 0.02), hed(0.37, 0.02)], L.g2 || '#c03030');
      xf(mb, [0.16, 0.41, 0.12], [0, 0.85, 0.2], () => { bx(mb, 0, 0, 0, 0.06, 0.085, 0.004, WHITE); bx(mb, 0, 0, 0.003, 0.02, 0.02, 0.002, '#c02020'); });
    },
    flamehood(mb, L) { // the Sorcerer's hood, its peak flickering up like a flame
      const c = L.g1 || '#c04a20', f = L.g2 || '#ffb040';
      hood(mb, c, 0.5);
      [[0, 0.2, 0, -0.2], [0.07, 0.15, 0.5, -0.3], [-0.07, 0.15, -0.5, -0.1], [0.02, 0.12, 0.2, 0.3]].forEach(([x, len, dx, dz]) => bl(mb, [x, 0.44, -0.05], [dx, 1, dz], len, 0.08, 0.03, c, [1, 0, 0], f));
    },
    archmage(mb, L, g) { // the Archmage's towering wizard hat: a wide brim, a tall cone, gold stars
      const c = L.g1 || '#5a2a8a';
      cyl(mb, 0, 0.33, 0, 0.4, 0.38, 0.02, sh(c, -0.12), 14);
      lof(mb, [hed(0.33, 0.012), [0.55, 0.14, 0.13, -0.02], [0.8, 0.06, 0.06, -0.06], [0.95, 0.001, 0.001, -0.12]], c);
      lof(mb, [hed(0.34, 0.018), hed(0.38, 0.018)], GOLD);
      [[0.1, 0.46, 0.12], [-0.08, 0.6, 0.08], [0.05, 0.72, 0.03], [-0.12, 0.5, -0.1]].forEach(([x, y, z]) => ball(g, x, y, z, 0.018, '#ffe060', 4));
    },
    nemes(mb, L) {   // the Tomb Guardian's striped pharaoh headcloth and the gold cobra on its brow
      const a = L.g1 || '#2a4aa0', b = L.g2 || '#d8b040', st = (i) => (i % 2 ? a : b);
      lof(mb, [hed(0.28, 0.016, st), [0.42, 0.2, 0.19, -0.01, 0, st], [0.47, 0.06, 0.06, -0.03], [0.48, 0.001]], a, { sides: 14 });
      lof(mb, [[-0.04, 0.32, 0.27, -0.04, 0, st], hed(0.28, 0.016)], a, { sides: 14, arc: [PI * 0.72, PI * 2.28] });
      bl(mb, [0, 0.33, 0.21], [0, 1, 0.3], 0.08, 0.035, 0.02, b, [1, 0, 0]); ball(mb, 0, 0.41, 0.235, 0.018, b);
    },
    hourglass(mb, L) { // the Time Mage's hat, a little hourglass on top with its sand running
      const c = L.g1 || '#6a3a8a', gd = L.g2 || GOLD, gl = '#dcecf4';
      cyl(mb, 0, 0.32, 0, 0.3, 0.29, 0.02, sh(c, -0.12), 14);
      lof(mb, [hed(0.31, 0.014), [0.46, 0.15, 0.14], [0.52, 0.075, 0.075]], c);
      cyl(mb, 0, 0.52, 0, 0.078, 0.078, 0.015, gd, 8); cyl(mb, 0, 0.535, 0, 0.06, 0.008, 0.07, gl, 8); cyl(mb, 0, 0.605, 0, 0.008, 0.06, 0.07, gl, 8); cyl(mb, 0, 0.675, 0, 0.078, 0.078, 0.015, gd, 8);
      cyl(mb, 0, 0.535, 0, 0.042, 0.006, 0.036, '#e8c060', 8);
      for (let k = 0; k < 3; k++) { const a = k / 3 * PI * 2; bx(mb, Math.cos(a) * 0.068, 0.6, Math.sin(a) * 0.068, 0.012, 0.15, 0.012, gd); }
    },
    clockhat(mb, L) { // the Chronomancer's tall hat: a clock face on the front, a gear at the side
      const c = L.g1 || '#3a2a6a', gd = L.g2 || '#e8c040';
      cyl(mb, 0, 0.38, 0, 0.27, 0.27, 0.018, sh(c, -0.12), 14);
      cyl(mb, 0, 0.38, 0, 0.165, 0.185, 0.3, c, 12);
      zcyl(mb, 0, 0.53, 0.163, 0.09, 0.09, 0.02, gd, 12); zcyl(mb, 0, 0.53, 0.17, 0.078, 0.078, 0.02, WHITE, 12);
      xf(mb, [0, 0.53, 0.192], [0, 0, 0.5], () => bx(mb, 0, 0.025, 0, 0.01, 0.055, 0.004, DARK)); xf(mb, [0, 0.53, 0.192], [0, 0, -1.9], () => bx(mb, 0, 0.018, 0, 0.012, 0.04, 0.004, DARK));
      xf(mb, [0.18, 0.47, 0], [0, PI / 2, 0], () => gear(mb, 0, 0, 0, 0.055, 0.02, gd, 7));
    },
    mortarboard(mb, L) { // the Arithmetician's square scholar's cap and a gold tassel
      const c = L.g1 || '#2a2a3a', gd = L.g2 || GOLD;
      dome(mb, 0, 0.3, 0, 0.236, 0.155, 0.226, c);
      xf(mb, [0, 0.46, 0], [0, PI / 4, 0], () => bx(mb, 0, 0, 0, 0.42, 0.02, 0.42, c));
      ball(mb, 0, 0.475, 0, 0.022, gd);
      sw(mb, [[0, 0.475, 0], [0.2, 0.47, 0.06], [0.24, 0.4, 0.07]], 0.007, gd, { sides: 4 }); cyl(mb, 0.24, 0.33, 0.07, 0.022, 0.006, 0.07, gd, 6);
    },
    veil(mb, L, g) { // the Oracle's soft veil over its head and down its back, a gold circlet and a gem
      const c = L.g1 || '#7a5ab0';
      lof(mb, [[-0.06, 0.29, 0.28, -0.07], hed(0.2, 0.04), hed(0.36, 0.03), [0.47, 0.1, 0.1, -0.02], [0.49, 0.001]], c, { arc: [PI * 0.66, PI * 2.34] });
      lof(mb, [hed(0.29, 0.016), hed(0.31, 0.016)], GOLD);
      ball(g, 0, 0.3, 0.234, 0.025, L.g2 || '#c0e0ff');
    },
    seer(mb, L, g) { // the Seer's tall pointed cowl with an open eye on its brow
      const c = L.g1 || '#3a2a5a';
      lof(mb, [hed(0.04, 0.04), hed(0.2, 0.045), hed(0.38, 0.035), [0.6, 0.08, 0.08, -0.08], [0.72, 0.001, 0.001, -0.14]], c, { arc: [PI * 0.62, PI * 2.38] });
      xf(mb, [0, 0.5, 0.075], [-0.5, 0, 0], () => el(mb, 0, 0, 0, 0.06, 0.035, 0.015, WHITE, 8, 4)); xf(g, [0, 0.5, 0.075], [-0.5, 0, 0], () => el(g, 0, 0, 0.012, 0.024, 0.024, 0.008, L.g2 || '#a0f0ff', 6, 4));
    },
    horn(mb, L) {    // the Caller's headband and the little summoner's horn on its brow
      lof(mb, [hed(0.29, 0.012), hed(0.32, 0.012)], L.g1 || '#3a8a6a');
      curve(mb, [[0, 0.32, 0.18], [0, 0.43, 0.235], [0, 0.54, 0.22]], 0.045, 0.004, IVORY);
    },
    hornhood(mb, L) { // the Summoner's hood with gold trim, its horn poking through the brow
      const c = L.g1 || '#2a6a8a';
      hood(mb, c, 0.52);
      lof(mb, [hed(0.3, 0.042), hed(0.33, 0.042)], L.g2 || GOLD, { arc: [PI * 0.22, PI * 0.78] });
      sw(mb, [[0, 0.34, 0.17], [0, 0.46, 0.235], [0, 0.58, 0.215]], [0.045, 0.03, 0.003], IVORY);
    },
    horncrown(mb, L, g) { // the Evoker's crown of five horns, their tips aglow
      lof(mb, [hed(0.29, 0.016), hed(0.34, 0.016)], GOLD, { sides: 12 });
      for (let i = 0; i < 5; i++) { const a = PI / 2 + (i - 2) * 0.55, x = Math.cos(a), z = Math.sin(a), top = 0.52 - Math.abs(i - 2) * 0.03; sw(mb, [[x * 0.22, 0.33, z * 0.21], [x * 0.25, 0.43, z * 0.24], [x * 0.24, top, z * 0.23]], [0.03, 0.02, 0.004], IVORY); ball(g, x * 0.24, top + 0.01, z * 0.23, 0.018, L.g2 || '#60f0e0', 4); }
    },
    propeller(mb, L) { // the Kite Flier's quartered beanie with a propeller on top
      const a = L.g1 || '#e04040', b = L.g2 || '#40a0e0', q = (i, n) => (Math.floor(((i + 0.5) / n) * 4) % 2 ? a : b);
      lof(mb, [hed(0.28, 0.016, q), [0.38, 0.22, 0.21, 0, 0, q], [0.45, 0.13, 0.12, 0, 0, q], [0.47, 0.001]], a, { sides: 12 });
      el(mb, 0, 0.3, 0.2, 0.13, 0.014, 0.085, b, 8, 4);
      cyl(mb, 0, 0.46, 0, 0.012, 0.012, 0.08, '#f0d040', 6);
      [1, -1].forEach(s => xf(mb, [0, 0.545, 0], [0, 0.4, 0], () => bl(mb, [0, 0, 0], [s, 0, 0], 0.17, 0.05, 0.012, '#f0d040', [0, 0, 1])));
    },
    skyhelm(mb, L) { // the Skydiver's round helmet and a big tinted visor
      const c = L.g1 || '#e07020';
      dome(mb, 0, 0.25, -0.01, 0.25, 0.235, 0.24, c);
      lof(mb, [hed(0.1, 0.04), hed(0.26, 0.032)], c, { arc: [PI * 0.8, PI * 2.2] });
      lof(mb, [[0.2, 0.25, 0.25, 0.02], [0.33, 0.24, 0.236, 0.02]], '#2a3a5a', { arc: [PI * 0.15, PI * 0.85] });
      sw(mb, [[0, 0.33, 0.235], [0, 0.49, 0], [0, 0.33, -0.235]], 0.02, WHITE, { sides: 4 });
    },
    rider(mb, L) {   // the Dragon Rider's scaled green hood with two little horns and a ridge of spines
      const c = L.g1 || '#3a7a4a';
      hood(mb, c, 0.52, [PI * 0.64, PI * 2.36]);
      for (let k = 0; k < 4; k++) spk(mb, [0, 0.46 - k * 0.1, -0.08 - k * 0.06], [0, 0.4, -1], 0.06, 0.025, L.g2 || '#c8a040', 4);
      [1, -1].forEach(s => sw(mb, [[s * 0.13, 0.42, 0.06], [s * 0.18, 0.5, 0.02], [s * 0.2, 0.55, -0.06]], [0.03, 0.02, 0.003], IVORY));
    },
    coif(mb, L) {    // the Cleric's plain white coif with a blue band across the brow
      const c = L.g1 || '#f0ece0';
      hood(mb, c, 0.5, [PI * 0.66, PI * 2.34], 0.0);
      lof(mb, [hed(0.3, 0.04), hed(0.335, 0.04)], L.g2 || '#4a7ad0', { arc: [PI * 0.26, PI * 0.74] });
    },
    bishop(mb, L) {  // the Bishop's tall pointed mitre with a gold cross, its ribbons behind
      const c = L.g1 || '#f8f4ea', gd = L.g2 || GOLD;
      lof(mb, [hed(0.3, 0.012), [0.5, 0.2, 0.12], [0.7, 0.09, 0.03], [0.76, 0.001, 0.001]], c);
      lof(mb, [hed(0.3, 0.018), hed(0.34, 0.018)], gd);
      bx(mb, 0, 0.5, 0.126, 0.025, 0.12, 0.01, gd); bx(mb, 0, 0.52, 0.126, 0.08, 0.025, 0.01, gd);
      [1, -1].forEach(s => bl(mb, [s * 0.06, 0.32, -0.21], [s * 0.1, -1, -0.2], 0.2, 0.05, 0.01, c, [1, 0, 0], gd));
    },
    sunhat(mb, L) {  // the Florist's floppy sun hat, a green ribbon and flowers
      const c = L.g2 || '#f0d8a0';
      lof(mb, [[0.28, 0.36, 0.35], [0.31, 0.3, 0.29], hed(0.33, 0.012), [0.43, 0.19, 0.18], [0.46, 0.08, 0.08], [0.465, 0.001]], c, { sides: 14 });
      lof(mb, [hed(0.33, 0.018), hed(0.37, 0.018)], L.g1 || '#5a9a5a');
      flower(mb, 0.15, 0.37, 0.17, 0.026, '#ff80b0'); flower(mb, 0.21, 0.36, 0.06, 0.02, '#ffe060', '#e08020', 'zy');
    },
    flowercrown(mb, L) { // the Flower Maiden's crown of flowers and a big pink bow behind
      const cols = ['#ff80b0', '#ffe060', WHITE, '#c080ff'], c = L.g1 || '#e070a0';
      for (let i = 0; i < 9; i++) { const a = PI / 2 + (i - 4) * 0.4, b = hed(0.34, 0.02); flower(mb, Math.cos(a) * b[1], 0.34, Math.sin(a) * b[2], 0.022, cols[i % 4], '#ffd040', Math.abs(i - 4) > 2 ? 'zy' : 'xy'); }
      [1, -1].forEach(s => { bl(mb, [0, 0.36, -0.22], [s, 0.5, -0.4], 0.17, 0.13, 0.03, c, [0, 0, 1]); bl(mb, [0, 0.34, -0.23], [s * 0.3, -1, -0.3], 0.18, 0.06, 0.01, c, [1, 0, 0]); });
      ball(mb, 0, 0.36, -0.225, 0.035, sh(c, -0.1));
    },
    crooked(mb, L) { // the Swamp Witch's crooked hat: a wide brim, a bent and patched cone, a buckle
      const c = L.g1 || '#3a5a3a';
      xf(mb, [0, 0.31, 0], [0.05, 0, 0.06], () => cyl(mb, 0, 0, 0, 0.36, 0.34, 0.02, sh(c, -0.12), 12));
      lof(mb, [hed(0.31, 0.012), [0.48, 0.15, 0.14, 0, 0.03], [0.6, 0.1, 0.1, -0.04, -0.04], [0.72, 0.05, 0.05, 0.0, 0.05], [0.82, 0.001, 0.001, -0.05, 0.1]], c);
      lof(mb, [hed(0.32, 0.018), hed(0.37, 0.018)], '#2a2a20');
      bx(mb, 0, 0.345, 0.212, 0.06, 0.05, 0.012, GOLD);
      xf(mb, [0.08, 0.55, 0.075], [0, 0.6, 0.2], () => bx(mb, 0, 0, 0, 0.05, 0.05, 0.01, '#8a6a3a'));
    },
    shawl(mb, L) {   // the Hag's ragged headscarf, knotted under the chin
      const c = L.g1 || '#4a3a5a';
      hood(mb, c, 0.5, [PI * 0.68, PI * 2.32], -0.02);
      ball(mb, 0, 0.0, 0.17, 0.045, sh(c, -0.1));
      [1, -1].forEach(s => bl(mb, [s * 0.02, -0.01, 0.18], [s * 0.4, -1, 0.3], 0.12, 0.05, 0.01, c, [1, 0, 0]));
    },
    cowl(mb, L) {    // the Night Stalker's bat cowl: tall pointed ears and a mask round the eyes
      const c = L.g1 || '#2a2a3a';
      dome(mb, 0, 0.27, 0, 0.24, 0.21, 0.23, c);
      lof(mb, [hed(0.2, 0.022), hed(0.28, 0.02)], c, { arc: [PI * 0.1, PI * 0.9] });
      [1, -1].forEach(s => el(mb, s * 0.075, 0.24, 0.238, 0.036, 0.014, 0.005, '#f0f0f0', 6, 3));
      [1, -1].forEach(s => bl(mb, [s * 0.13, 0.42, 0], [s * 0.35, 1, 0], 0.22, 0.12, 0.03, c, [0, 0, 1]));
    },
    vampire(mb) {    // the Vampire's slicked-back black hair, a sharp widow's peak on its brow
      const c = '#1a1a22';
      dome(mb, 0, 0.3, -0.01, 0.238, 0.19, 0.228, c);
      el(mb, 0, 0.335, 0.115, 0.07, 0.08, 0.1, c, 8, 5);
      [1, -1].forEach(s => bl(mb, [s * 0.1, 0.45, -0.1], [s * 0.2, -0.3, -1], 0.16, 0.08, 0.02, c, [1, 0, 0]));
    },
    sheet(mb, L) {   // the Phantom's sheet over its head, two eye holes cut in it
      const c = L.g1 || '#f4f6ff';
      lof(mb, [[-0.04, 0.27, 0.27, 0.01], [0.2, 0.25, 0.25, 0.02], [0.34, 0.218, 0.212, 0.0], [0.44, 0.13, 0.13], [0.5, 0.001]], c, { sides: 12 });
      [1, -1].forEach(s => el(mb, s * 0.075, 0.25, 0.258, 0.03, 0.042, 0.01, L.g2 || '#1a1a2a', 6, 4));
    },
    tattered(mb, L) { // the Specter's tattered dark hood, its ragged points hanging
      const c = L.g1 || '#3a3a4a';
      lof(mb, [hed(0.0, 0.05), hed(0.2, 0.05), hed(0.4, 0.035), [0.55, 0.08, 0.08, -0.12], [0.62, 0.001, 0.001, -0.2]], c, { arc: faceOpen([PI * 0.7, PI * 2.3]) });
      for (let i = 0; i < 7; i++) { const a = PI * 0.8 + i * PI * 1.4 / 6, x = Math.cos(a) * 0.22, z = Math.sin(a) * 0.22; tri(mb, [x - 0.03, 0.01, z], [x + 0.03, 0.01, z], [x * 1.05, -0.08 - (i % 2) * 0.04, z * 1.05], c); }
    },
    loupe(mb, L, g) { // the Clockmaker's headband, a jeweller's loupe over one eye and a spare lens flipped up
      const b = L.g2 || '#d0a040';
      lof(mb, [hed(0.3, 0.012), hed(0.335, 0.012)], '#4a3a2a');
      zcyl(mb, -0.075, 0.235, 0.18, 0.046, 0.034, 0.085, b, 8); el(g, -0.075, 0.235, 0.266, 0.028, 0.028, 0.005, '#c0f0ff', 8, 4);
      xf(mb, [0.075, 0.35, 0.18], [-1.2, 0, 0], () => cyl(mb, 0, 0, 0, 0.035, 0.03, 0.05, b, 8));
      bx(mb, -0.075, 0.29, 0.2, 0.015, 0.06, 0.015, b);
    },
    gearhelm(mb, L) { // the Chrono-Engineer's brass helmet: a gear for a crest and a clock on its brow
      const gd = L.g2 || '#d8c070';
      dome(mb, 0, 0.29, 0, 0.238, 0.19, 0.228, gd);
      lof(mb, [hed(0.28, 0.026), hed(0.31, 0.026)], sh(gd, -0.3));
      xf(mb, [0, 0.47, 0], [0, PI / 2, 0], () => gear(mb, 0, 0, 0, 0.1, 0.025, sh(gd, -0.12), 8));
      zcyl(mb, 0, 0.38, 0.17, 0.05, 0.05, 0.03, WHITE, 10); bx(mb, 0, 0.395, 0.202, 0.008, 0.03, 0.004, DARK); bx(mb, 0.01, 0.38, 0.202, 0.025, 0.008, 0.004, DARK);
    },
    wolfears(mb, L) { // the Werebeast's wolf ears and a shaggy cap of fur
      const c = L.g1 || '#6a5a4a';
      dome(mb, 0, 0.31, -0.02, 0.232, 0.16, 0.222, c);
      [1, -1].forEach(s => { bl(mb, [s * 0.12, 0.42, 0.0], [s * 0.35, 1, 0.1], 0.2, 0.12, 0.05, c, [0, 0, 1]); bl(mb, [s * 0.12, 0.42, 0.014], [s * 0.35, 1, 0.1], 0.14, 0.07, 0.01, '#e8a0a0', [0, 0, 1]); });
      for (let i = 0; i < 9; i++) { const a = PI * 1.1 + i * PI * 0.8 / 8, x = Math.cos(a), z = Math.sin(a); bl(mb, [x * 0.22, 0.36, z * 0.21], [x * 0.5, -0.6, z], 0.13, 0.07, 0.02, sh(c, i % 2 ? -0.1 : 0.05), { radial: [0, 0.36, 0] }); }
    },
    galian(mb, L) {  // Galian's great curling ram horns and a wild mane
      const c = L.g1 || '#6a4a9a', h = L.g2 || '#e8e0d0';
      [1, -1].forEach(s => curve(mb, [[s * 0.15, 0.4, -0.02], [s * 0.27, 0.49, -0.08], [s * 0.35, 0.42, -0.14], [s * 0.34, 0.3, -0.1], [s * 0.28, 0.25, -0.01], [s * 0.26, 0.31, 0.05]], 0.05, 0.008, h));
      for (let i = 0; i < 9; i++) { const z = 0.12 - i * 0.045, y = 0.44 - Math.max(0, i - 3) * 0.035; bl(mb, [0, y, z], [(i % 3 - 1) * 0.3, 0.8, -0.7], 0.17, 0.08, 0.03, i % 2 ? c : sh(c, 0.12), [1, 0, 0]); }
    },
    skullhood(mb, L) { // the Necromancer's black hood, a skull mask pushed up on top
      const c = L.g1 || '#1a2a1a';
      hood(mb, c, 0.52, [PI * 0.64, PI * 2.36]);
      el(mb, 0, 0.45, 0.07, 0.1, 0.085, 0.09, IVORY, 8, 5);
      [1, -1].forEach(s => el(mb, s * 0.036, 0.46, 0.152, 0.022, 0.026, 0.012, '#101010', 6, 4));
      bx(mb, 0, 0.39, 0.12, 0.08, 0.03, 0.06, IVORY);
    },
    robohead(mb, L, g) { // MOG Mk.I's boxy robot head: riveted plates, a screen face with lamp eyes; the red nose pokes through
      const c = L.g1 || '#8a8e96', t = L.g2 || '#e0a020';
      bx(mb, 0, 0.2, 0.01, 0.48, 0.42, 0.47, c);
      bx(mb, 0, 0.27, 0.247, 0.36, 0.12, 0.01, '#1a2228');
      [1, -1].forEach(s => bx(g, s * 0.08, 0.27, 0.254, 0.07, 0.04, 0.006, '#ffd040'));
      bx(mb, 0, 0.42, 0.01, 0.5, 0.03, 0.49, t);
      [1, -1].forEach(s => { ball(mb, s * 0.252, 0.22, 0.01, 0.045, t); [[0.18, 0.4], [0.18, 0.02], [-0.18, 0.4], [-0.18, 0.02]].forEach(([x, y]) => ball(mb, x, y, 0.246, 0.012, sh(c, -0.25), 4)); });
    },
    robohead2(mb, L, g) { // MOG Mk.II's rounded robot head: a white shell, a red stripe, a visor with big glowing eyes, fins
      const c = L.g1 || '#e8e8f0', t = L.g2 || '#d03030';
      mb.rbox(0, 0.2 * T, 0.01 * T, 0.48 * T, 0.42 * T, 0.47 * T, c, 0.3);
      bx(mb, 0, 0.415, 0.01, 0.07, 0.02, 0.42, t);
      bx(mb, 0, 0.275, 0.246, 0.36, 0.13, 0.012, '#141a24');
      [1, -1].forEach(s => { el(g, s * 0.08, 0.275, 0.254, 0.034, 0.042, 0.005, '#60d0ff', 8, 4); bl(mb, [s * 0.24, 0.3, 0], [s, 0.6, -0.2], 0.12, 0.1, 0.02, t, [0, 0, 1]); });
    },
    mystic(mb, L, g) { // the Mystic Knight's turban-helm: steel under a red wrap, a long red feather
      const c = L.g1 || '#c02838';
      dome(mb, 0, 0.29, 0, 0.238, 0.19, 0.228, STEEL);
      lof(mb, [hed(0.28, 0.024), [0.34, 0.255, 0.245], [0.39, 0.225, 0.215]], c, { sides: 12 });
      ball(g, 0, 0.35, 0.25, 0.028, '#40e0ff');
      bl(mb, [0, 0.44, -0.04], [0.1, 0.5, -1], 0.32, 0.08, 0.012, c, [1, 0, 0]);
    },
    dragonhelm(mb, L, g) { // the Dragon Knight's helm, a dragon's head for a crest, gold wing fins
      const c = L.g1 || '#2a6a5a', gd = L.g2 || GOLD;
      dome(mb, 0, 0.29, 0, 0.238, 0.2, 0.228, c);
      lof(mb, [hed(0.13, 0.03), hed(0.29, 0.024)], c, { arc: [PI * 0.75, PI * 2.25] });
      el(mb, 0, 0.47, 0.06, 0.07, 0.06, 0.14, sh(c, 0.12), 8, 5);
      [1, -1].forEach(s => { ball(g, s * 0.04, 0.5, 0.15, 0.014, '#ffd040', 4); sw(mb, [[s * 0.04, 0.51, 0.0], [s * 0.07, 0.56, -0.08], [s * 0.08, 0.57, -0.16]], [0.02, 0.014, 0.002], gd); bl(mb, [s * 0.22, 0.32, -0.02], [s * 0.5, 0.6, -1], 0.2, 0.09, 0.01, gd, [0, 1, 0]); });
    },
    shaman(mb, L) {  // the Beastcaller's antler headdress hung with feathers
      lof(mb, [hed(0.29, 0.014), hed(0.33, 0.014)], L.g1 || '#8a5a30');
      [1, -1].forEach(s => {
        sw(mb, [[s * 0.14, 0.38, 0], [s * 0.24, 0.5, -0.02], [s * 0.28, 0.64, -0.04]], [0.026, 0.02, 0.006], IVORY);
        sw(mb, [[s * 0.22, 0.47, -0.02], [s * 0.18, 0.58, 0.02]], [0.015, 0.004], IVORY); sw(mb, [[s * 0.26, 0.57, -0.03], [s * 0.34, 0.63, 0.0]], [0.012, 0.003], IVORY);
        bl(mb, [s * 0.22, 0.3, 0.06], [s * 0.2, -1, 0.1], 0.14, 0.04, 0.008, L.g2 || '#30a8a0', [1, 0, 0], WHITE);
      });
    },
    wig(mb) {        // the Maestro's powdered wig: rolled curls at the sides, a ribboned tail
      const c = '#f4f0ea';
      dome(mb, 0, 0.3, -0.01, 0.238, 0.18, 0.228, c);
      [0.21, 0.29].forEach(y => [1, -1].forEach(s => el(mb, s * 0.225, y, -0.02, 0.045, 0.038, 0.085, sh(c, -0.04), 8, 4)));
      sw(mb, [[0, 0.3, -0.2], [0, 0.18, -0.25], [0, 0.06, -0.24]], [0.045, 0.035, 0.02], c);
      ball(mb, 0, 0.25, -0.24, 0.025, '#1a1a2a'); [1, -1].forEach(s => bl(mb, [0, 0.25, -0.24], [s, 0.3, -0.2], 0.07, 0.05, 0.01, '#1a1a2a', [0, 1, 0]));
    },
    cowboy(mb, L) {  // the Gunslinger's cowboy hat, its brim curled up at the sides
      const c = L.g1 || '#8a5a30';
      brim(mb, 0.32, 0.2, 0.36, sh(c, -0.08), (a) => Math.pow(Math.cos(a), 2) * 0.09);
      lof(mb, [hed(0.31, 0.012), [0.45, 0.19, 0.17], [0.49, 0.13, 0.08], [0.475, 0.001, 0.001]], c);
      lof(mb, [hed(0.32, 0.02), hed(0.36, 0.02)], '#3a2418');
    },
    templar(mb, L) { // the Templar's flat-topped great helm, an eye slit and a red cross on its face
      const c = L.g1 || '#f0ece0', r = L.g2 || '#c02828';
      lof(mb, [[0.03, 0.25, 0.25, 0.025], [0.44, 0.238, 0.238, 0.0], [0.47, 0.001, 0.001]], c);
      bx(mb, 0, 0.245, 0.27, 0.2, 0.022, 0.01, '#141418');
      bx(mb, 0, 0.2, 0.272, 0.03, 0.3, 0.008, r); bx(mb, 0, 0.33, 0.262, 0.16, 0.03, 0.008, r);
    },
    jcrest(mb, L, g) { // Project J's alien crest of swept tendrils, a red eye on its brow
      const c = L.g1 || '#5a6a9a';
      for (let k = -2; k <= 2; k++) { curve(mb, [[k * 0.05, 0.42, 0.05], [k * 0.09, 0.53, -0.08], [k * 0.13, 0.55, -0.22], [k * 0.15, 0.47, -0.33]], 0.038, 0.01, sh(c, -0.1 + Math.abs(k) * 0.05)); ball(g, k * 0.15, 0.465, -0.335, 0.016, L.g2 || '#d03040', 4); }
      el(mb, 0, 0.35, 0.18, 0.065, 0.04, 0.022, '#2a1a2a'); el(g, 0, 0.35, 0.198, 0.042, 0.028, 0.01, L.g2 || '#d03040'); ball(g, 0, 0.35, 0.208, 0.012, '#ffe0e0', 4);
    },
    ultima(mb, L, g) { // Ultima's crown: a gold band and five glowing crystal spires
      lof(mb, [hed(0.29, 0.016), hed(0.35, 0.018)], L.g2 || '#e8d070', { sides: 12 });
      for (let i = 0; i < 5; i++) { const a = PI / 2 + (i - 2) * 0.6, b = hed(0.34, 0.012); xf(g, [Math.cos(a) * b[1], 0.34, Math.sin(a) * b[2]], null, () => cyl(g, 0, 0, 0, 0.032, 0, 0.22 - Math.abs(i - 2) * 0.045, L.g1 || '#40e0a0', 4)); }
    },
    omegahelm(mb, L, g) { // Omega's armoured helm: a heavy visor, a great forward horn, a red eye slit
      const c = L.g1 || '#5a6070';
      lof(mb, [[0.02, 0.26, 0.26, 0.025], [0.3, 0.252, 0.252, 0.01], [0.42, 0.18, 0.18], [0.47, 0.001]], c, { sides: 8 });
      bx(g, 0, 0.25, 0.285, 0.24, 0.03, 0.01, L.g2 || '#ff4030');
      xf(mb, [0, 0.38, 0.17], [PI / 2 - 0.6, 0, 0], () => cyl(mb, 0, 0, 0, 0.05, 0, 0.26, sh(c, 0.15), 6));
      [1, -1].forEach(s => bl(mb, [s * 0.24, 0.3, -0.05], [s * 0.6, 0.5, -1], 0.2, 0.1, 0.03, sh(c, -0.1), [0, 1, 0]));
    },
    bahamut(mb, L, g) { // Bahamut's dragon crown: a snouted helm, four swept horns, glowing eyes
      const c = L.g1 || '#2a2a4a', h = '#d8d0c0';
      dome(mb, 0, 0.3, 0, 0.238, 0.18, 0.228, c);
      xf(mb, [0, 0.39, 0.16], [PI / 2 - 0.3, 0, 0], () => cyl(mb, 0, 0, 0, 0.07, 0.01, 0.15, sh(c, 0.12), 5));
      [1, -1].forEach(s => { sw(mb, [[s * 0.12, 0.42, -0.02], [s * 0.22, 0.52, -0.14], [s * 0.26, 0.56, -0.32]], [0.04, 0.03, 0.003], h); sw(mb, [[s * 0.18, 0.36, -0.06], [s * 0.3, 0.4, -0.18], [s * 0.36, 0.38, -0.32]], [0.035, 0.025, 0.003], h); el(g, s * 0.05, 0.41, 0.2, 0.02, 0.012, 0.008, L.g2 || '#60c0ff', 6, 3); });
    },
    crown(mb, L, g) { // the Mog King's great gold crown: tall points, jewels and a red velvet cap
      const gd = L.g2 || '#f0c030', cap = L.g1 || '#c02838';
      dome(mb, 0, 0.36, 0, 0.2, 0.15, 0.19, cap);
      lof(mb, [hed(0.31, 0.02), [0.42, 0.255, 0.245]], gd, { sides: 12 });
      for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2 + PI / 16, x = Math.cos(a), z = Math.sin(a); spk(mb, [x * 0.25, 0.41, z * 0.24], [x * 0.15, 1, z * 0.15], 0.13, 0.04, gd, 4); ball(mb, x * 0.27, 0.545, z * 0.26, 0.018, gd, 4); ball(g, x * 0.245, 0.37, z * 0.235, 0.02, i % 2 ? '#ff3040' : '#40a0ff', 4); }
    },
  });

  // ------------------------------------------------------------------ bodies (torso space: -0.1..0.42, the type badge on the
  // chest at y 0.17: clothes leave it showing)
  const capeOf = (mb, c, low = -0.1, flare = 0.05) => lof(mb, [[0.38, 0.2, 0.2, -0.02], [0.2, 0.28, 0.275, -0.04], [low, 0.31 + flare, 0.3 + flare, -0.06]], c, { arc: [PI * 0.96, PI * 2.04] });
  const rag = (mb, y, r, c, n = 14, len = 0.06, skip) => { for (let i = 0; i < n; i++) { const a = i / n * PI * 2, x = Math.cos(a), z = Math.sin(a); if (skip && skip(a)) continue; tri(mb, [x * r - z * 0.03, y, z * r + x * 0.03], [x * r + z * 0.03, y, z * r - x * 0.03], [x * r * 1.05, y - len * (0.6 + (i % 3) * 0.3), z * r * 1.05], c); } };
  Object.assign(BODIES, {
    satchel(mb, L) { // the Chemist's satchel: a strap from shoulder to hip (above the badge), a bag with a red cross
      const c = L.g2 || '#a07040';
      sw(mb, [[0.18, 0.38, 0.12], [0.06, 0.31, 0.23], [-0.1, 0.25, 0.235], [-0.22, 0.12, 0.17], [-0.25, 0.04, 0.1]], 0.014, sh(c, -0.2), { sides: 4 });
      xf(mb, [-0.255, 0.0, 0.08], [0, 0, 0.1], () => { bx(mb, 0, 0, 0, 0.07, 0.12, 0.15, c); bx(mb, -0.037, 0, 0, 0.005, 0.05, 0.015, '#d03030'); bx(mb, -0.037, 0, 0, 0.005, 0.015, 0.05, '#d03030'); });
      lof(mb, [tor(0.0, 0.01), tor(0.04, 0.014)], sh(c, -0.25));
    },
    coat(mb, L) {    // a long coat, open down the front, with a collar
      const c = L.g1 || '#3a4a6a';
      lof(mb, [tor(0.36, 0.02), tor(0.26, 0.022), tor(0.12, 0.026), tor(0.0, 0.026), [-0.14, 0.29, 0.28]], c, { arc: OPEN });
      lof(mb, [tor(0.34, 0.02), [0.44, 0.2, 0.19, -0.02]], sh(c, -0.12), { arc: [PI * 0.8, PI * 2.2] });
    },
    overalls(mb, L) { // dungarees: trousers round the hips, a small bib, straps up either side of the badge, brass buttons
      const c = L.g1 || '#4a6aa0';
      lof(mb, [[-0.11, 0.2, 0.19], tor(-0.02, 0.014), tor(0.06, 0.014)], c);
      lof(mb, [tor(0.04, 0.016), tor(0.1, 0.016)], c, { arc: [PI * 0.33, PI * 0.67] });
      [1, -1].forEach(s => { sw(mb, [[s * 0.1, 0.1, 0.262], [s * 0.12, 0.25, 0.236], [s * 0.1, 0.36, 0.17], [s * 0.09, 0.4, -0.04], [s * 0.1, 0.3, -0.22], [s * 0.1, 0.12, -0.25]], 0.016, c, { sides: 4 }); ball(mb, s * 0.1, 0.1, 0.27, 0.017, GOLD); });
    },
    quiver(mb, L) {  // a quiver of arrows on the back, its strap across the chest (above the badge)
      const c = L.g2 || '#8a5a2a';
      xf(mb, [0.1, 0.16, -0.27], [-0.25, 0, -0.35], () => { cyl(mb, 0, -0.14, 0, 0.055, 0.062, 0.32, c, 8); for (let i = 0; i < 4; i++) bl(mb, [(i % 2 - 0.5) * 0.045, 0.18, i > 1 ? 0.022 : -0.022], [0, 1, 0], 0.09, 0.035, 0.008, i % 2 ? '#e8e8e0' : '#d03030', [1, 0, 0]); });
      sw(mb, [[-0.17, 0.37, 0.12], [-0.06, 0.3, 0.232], [0.1, 0.25, 0.235], [0.24, 0.1, 0.15], [0.2, 0.0, -0.15]], 0.014, sh(c, -0.2), { sides: 4 });
    },
    leafskirt(mb, L) { // the Dryad's skirt of leaves and a leafy collar
      const c = L.g1 || '#5aa04a';
      for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2, x = Math.cos(a), z = Math.sin(a); bl(mb, [x * 0.25, 0.06, z * 0.24], [x * 0.45, -1, z * 0.45], 0.17, 0.1, 0.012, i % 2 ? c : sh(c, 0.12), { radial: [0, 0.06, 0] }); }
      for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2, x = Math.cos(a), z = Math.sin(a); bl(mb, [x * 0.19, 0.39, z * 0.18], [x * 0.7, -0.45, z * 0.7], 0.1, 0.06, 0.01, i % 2 ? sh(c, 0.1) : c, { radial: [0, 0.39, 0] }); }
    },
    diamonds(mb, L) { // the Juggler's harlequin tunic in two colours
      const a = L.g1 || '#d04040', b = L.g2 || '#f0d040', ch = (j) => (i) => ((i + j) % 2 ? a : b);
      lof(mb, [tor(-0.04, 0.014, ch(0)), tor(0.05, 0.016, ch(1)), tor(0.14, 0.012, ch(0)), tor(0.24, 0.014, ch(1)), tor(0.34, 0.015)], a);
    },
    ruff(mb, L) {    // the Jester's tunic and a pleated white ruff at its neck
      BODIES.diamonds(mb, L);
      for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; bl(mb, [Math.cos(a) * 0.17, 0.39, Math.sin(a) * 0.16], [Math.cos(a), 0.15 * (i % 2 ? 1 : -1), Math.sin(a)], 0.11, 0.07, 0.02, i % 2 ? '#f8f8f0' : '#e4e4dc', { radial: [0, 0.39, 0] }); }
    },
    sash(mb, L) {    // a wide sash at the waist, tied in a bow at the side
      const c = L.g1 || '#a02040';
      lof(mb, [tor(-0.01, 0.014), tor(0.08, 0.016)], c);
      [1, -1].forEach(s => bl(mb, [0.25, 0.04, 0.06], [0.6, s * 0.6, 0.3], 0.1, 0.06, 0.02, c, [0, 0, 1]));
      bl(mb, [0.25, 0.02, 0.06], [0.3, -1, 0.2], 0.16, 0.05, 0.01, sh(c, -0.1), [0, 0, 1]);
    },
    tabard(mb, L) {  // a tabard skirt hanging front and back from a belt, shoulder pieces; the job's emblem if it has one
      const c = L.g1 || '#3a6ac8';
      lof(mb, [tor(0.0, 0.012), tor(0.06, 0.014)], '#5a3a20');
      pan(mb, [[-0.11, 0.04], [0.11, 0.04], [0.09, -0.13], [-0.09, -0.13]], 0.258, 0.016, c); pan(mb, [[-0.11, 0.04], [0.11, 0.04], [0.09, -0.13], [-0.09, -0.13]], -0.248, 0.016, c);
      [1, -1].forEach(s => el(mb, s * 0.17, 0.37, 0.0, 0.085, 0.04, 0.11, c, 8, 4));
      if (L.emblem === 'cross') { const e = L.g2 || GOLD; bx(mb, 0, -0.04, 0.268, 0.026, 0.12, 0.006, e); bx(mb, 0, -0.005, 0.268, 0.08, 0.026, 0.006, e); }
    },
    plate(mb, L) {   // full plate: breastplate, layered pauldrons, a gorget and a skirt of tassets
      const m = L.g2 || STEEL;
      BODIES.armor(mb, L);
      [1, -1].forEach(s => el(mb, s * 0.22, 0.33, 0.03, 0.115, 0.075, 0.115, sh(m, 0.06), 8, 4));
      lof(mb, [tor(0.02, 0.018), [-0.1, 0.27, 0.26]], sh(m, -0.12), { sides: 12 });
      lof(mb, [tor(0.34, 0.016), [0.42, 0.16, 0.15]], m);
    },
    bowtie(mb, L) {  // the Mediator's waistcoat, collar and bow tie
      BODIES.vest(mb, { g1: L.g2 || '#6a4a2a' });
      [1, -1].forEach(s => { tri(mb, [0, 0.31, 0.226], [s * 0.07, 0.34, 0.215], [s * 0.07, 0.285, 0.232], L.g1 || '#c04060'); tri(mb, [0, 0.33, 0.222], [s * 0.06, 0.36, 0.205], [s * 0.05, 0.31, 0.226], WHITE); });
      ball(mb, 0, 0.31, 0.226, 0.018, sh(L.g1 || '#c04060', -0.15));
    },
    toga(mb, L) {    // the Orator's toga, draped from one shoulder, a green sash along its fold
      const c = L.g1 || '#f0ece0';
      lof(mb, [tor(0.38, 0.02), tor(0.24, 0.022), tor(0.08, 0.026), [-0.08, 0.27, 0.26], [-0.14, 0.3, 0.29]], c, { arc: OPEN });
      const P = [[0.2, 0.36, 0.06], [0.25, 0.2, 0.14], [0.17, 0.06, 0.255], [-0.04, 0.0, 0.27], [-0.22, -0.05, 0.2]];
      sw(mb, P, 0.035, sh(c, -0.05)); sw(mb, P.map(p => [p[0] * 1.04, p[1] + 0.02, p[2] * 1.04]), 0.012, L.g2 || '#7a3a8a', { sides: 4 });
      lof(mb, [[-0.14, 0.302, 0.292], [-0.1, 0.29, 0.28]], L.g2 || '#7a3a8a', { arc: OPEN });
    },
    sailorcollar(mb, L) { // the Sailor's square collar down its back, a red neckerchief in front
      const c = L.g1 || '#2a4a9a';
      xf(mb, [0, 0.33, -0.19], [0.35, 0, 0], () => { bx(mb, 0, 0, 0, 0.3, 0.2, 0.015, c); bx(mb, 0, -0.07, -0.009, 0.26, 0.012, 0.004, WHITE); });
      [1, -1].forEach(s => tri(mb, [s * 0.16, 0.37, 0.12], [s * 0.02, 0.28, 0.235], [s * 0.14, 0.3, 0.2], c));
      ball(mb, 0, 0.3, 0.226, 0.026, '#d03030'); [1, -1].forEach(s => bl(mb, [0, 0.29, 0.232], [s * 0.25, -1, 0.15], 0.08, 0.035, 0.01, '#d03030', [1, 0, 0]));
    },
    longcoat(mb, L) { // a long coat with tails, open in front; gold epaulettes and buttons
      const c = L.g1 || '#1a2a5a', gd = L.g2 || GOLD;
      BODIES.coat(mb, L);
      [1, -1].forEach(s => { bl(mb, [s * 0.08, -0.06, -0.27], [s * 0.1, -1, -0.3], 0.12, 0.1, 0.02, c, [1, 0, 0]); el(mb, s * 0.2, 0.375, 0.02, 0.075, 0.025, 0.075, gd, 8, 4); for (let k = 0; k < 4; k++) bl(mb, [s * (0.15 + k * 0.035), 0.37, 0.05], [0, -1, 0], 0.04, 0.012, 0.006, gd, [1, 0, 0]); [0.24, 0.14, 0.04].forEach(y => { const r = tor(y, 0.03); ball(mb, s * r[1] * 0.37, y, r[2] * 0.93, 0.015, gd, 4); }); });
    },
    jacket(mb, L) {  // a short flying jacket, open, with a thick fleece collar and a band at the hem
      const c = L.g1 || '#7a4a2a';
      lof(mb, [tor(0.36, 0.02), tor(0.24, 0.022), tor(0.1, 0.026), tor(0.0, 0.024)], c, { arc: OPEN });
      lof(mb, [tor(-0.01, 0.026), tor(0.04, 0.028)], sh(c, -0.18), { arc: OPEN });
      for (let i = 0; i < 12; i++) { const a = PI * 0.75 + i * PI * 1.5 / 11; ball(mb, Math.cos(a) * 0.2, 0.39, Math.sin(a) * 0.19, 0.045, L.g2 || '#e8dcc0'); }
    },
    furs(mb, L) {    // a fur pelt over the shoulders and a belt with a big buckle
      const c = L.pelt || L.g2 || '#8a6a40';
      lof(mb, [[0.43, 0.12, 0.12], tor(0.36, 0.035), tor(0.28, 0.045)], c);
      for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2, r = tor(0.28, 0.045); bl(mb, [Math.cos(a) * r[1], 0.29, Math.sin(a) * r[2]], [Math.cos(a) * 0.3, -1, Math.sin(a) * 0.3], 0.07, 0.07, 0.02, i % 2 ? c : sh(c, -0.12), { radial: [0, 0.29, 0] }); }
      lof(mb, [tor(0.0, 0.012), tor(0.06, 0.014)], '#4a3020');
      bx(mb, 0, 0.03, 0.262, 0.07, 0.05, 0.012, GOLD);
    },
    raincoat(mb, L) { // the Harpooner's long oilskin coat, toggled shut
      const c = L.g1 || '#e8c030';
      lof(mb, [tor(0.36, 0.018), tor(0.24, 0.014), tor(0.12, 0.012), tor(0.0, 0.016), [-0.14, 0.29, 0.28]], c);
      [0.06, -0.04, 0.27].forEach(y => { const r = tor(y, 0.02); bx(mb, 0, y, r[2], 0.05, 0.015, 0.015, '#5a3a20'); });
      lof(mb, [tor(0.34, 0.02), [0.43, 0.2, 0.19, -0.02]], sh(c, -0.1), { arc: [PI * 0.8, PI * 2.2] });
    },
    hivis(mb, L) {   // the Foreman's hi-vis vest with two reflective bands
      const c = L.g1 || '#ff8a20';
      BODIES.vest(mb, { g1: c });
      [0.095, 0.245].forEach(y => lof(mb, [tor(y, 0.02), tor(y + 0.025, 0.02)], '#e4e8f0', { arc: [-PI * 0.32, PI * 1.32] }));
    },
    carapace(mb, L) { // the Guardian's great domed shell on its back, plated, with a rim
      const c = L.g1 || '#3a8a7a';
      el(mb, 0, 0.16, -0.1, 0.32, 0.31, 0.24, c, 10, 6);
      [[0, 0.26, -0.335], [0.15, 0.14, -0.3], [-0.15, 0.14, -0.3], [0, 0.04, -0.32], [0.17, 0.3, -0.25], [-0.17, 0.3, -0.25]].forEach(([x, y, z]) => el(mb, x, y, z, 0.07, 0.07, 0.025, sh(c, -0.16), 6, 4));
      lof(mb, [[-0.02, 0.29, 0.28, -0.04], [0.02, 0.3, 0.29, -0.04]], L.g2 || '#d8c8a0', { arc: [PI * 1.0, PI * 2.0] });
    },
    bandolier(mb, L) { // an ammo belt from shoulder to hip (above the badge), its cartridges in a row, and a belt
      const b = L.g2 || '#c0a040', P = [[-0.17, 0.37, 0.12], [-0.08, 0.31, 0.225], [0.06, 0.255, 0.24], [0.2, 0.13, 0.2], [0.25, 0.0, 0.08]];
      sw(mb, P, 0.022, '#4a3a20', { sides: 4 });
      for (let k = 0; k < 6; k++) { const t = 0.12 + k * 0.14, i = Math.min(P.length - 2, Math.floor(t * (P.length - 1))), f = t * (P.length - 1) - i, p = [0, 1, 2].map(j => P[i][j] + (P[i + 1][j] - P[i][j]) * f); cyl(mb, p[0] * 1.06, p[1] - 0.03, p[2] * 1.08, 0.012, 0.009, 0.06, b, 6); }
      lof(mb, [tor(-0.01, 0.012), tor(0.05, 0.014)], '#4a3a20');
    },
    tailcoat(mb, L) { // a tailcoat: short in front, two long tails behind, its lapels
      const c = L.g1 || '#1e1a24';
      lof(mb, [tor(0.36, 0.02), tor(0.24, 0.022), tor(0.1, 0.026), tor(0.04, 0.026)], c, { arc: OPEN });
      [1, -1].forEach(s => { bl(mb, [s * 0.07, 0.06, -0.255], [s * 0.15, -1, -0.25], 0.21, 0.1, 0.02, c, [1, 0, 0]); tri(mb, [s * 0.09, 0.34, 0.2], [s * 0.05, 0.22, 0.25], [s * 0.13, 0.26, 0.23], sh(c, 0.15)); });
    },
    cape(mb, L) {    // a short cape over the shoulders and down the back, its stand-up collar
      const c = L.g1 || '#c02838';
      capeOf(mb, c, 0.02, 0.02);
      lof(mb, [tor(0.36, 0.02), [0.45, 0.22, 0.21, -0.02]], sh(c, -0.12), { arc: [PI * 0.85, PI * 2.15] });
      [1, -1].forEach(s => ball(mb, s * 0.13, 0.37, 0.13, 0.02, GOLD, 4));
    },
    puffer(mb, L) {  // the Ice Climber's puffy quilted jacket with white trim
      const c = L.g1 || '#d84a30';
      [0.0, 0.1, 0.2, 0.3].forEach((y, k) => lof(mb, [tor(y, 0.014), tor(y + 0.05, 0.04), tor(y + 0.1, 0.014)], k % 2 ? c : sh(c, -0.06), { arc: [-PI * 0.32, PI * 1.32] }));
      lof(mb, [tor(-0.02, 0.03), tor(0.01, 0.03)], WHITE);
    },
    shaggy(mb, L) {  // the Yeti's shaggy coat: rows of long fur hanging down
      const c = L.g1 || '#f4f8ff';
      [0.36, 0.22, 0.08].forEach((y, k) => { const r = tor(y, 0.02); for (let i = 0; i < 14; i++) { const a = (i + k * 0.5) / 14 * PI * 2; if (Math.sin(a) > 0.82) continue; bl(mb, [Math.cos(a) * r[1], y, Math.sin(a) * r[2]], [Math.cos(a) * 0.25, -1, Math.sin(a) * 0.25], 0.15, 0.08, 0.02, i % 2 ? c : sh(c, -0.07), { radial: [0, y, 0] }); } });
    },
    trunks(mb, L) {  // the Pugilist's boxing trunks, white waistband, a gold title belt
      const c = L.g1 || '#c03030';
      lof(mb, [[-0.11, 0.2, 0.19], tor(-0.04, 0.016), tor(0.04, 0.016)], c);
      lof(mb, [tor(0.04, 0.016), tor(0.08, 0.016)], L.g2 || WHITE);
      el(mb, 0, 0.0, 0.25, 0.07, 0.045, 0.015, GOLD, 8, 4);
    },
    beads(mb, L) {   // the Master's great prayer beads and a gold sash
      BODIES.gi(mb, { g1: L.g1 || GOLD });
      for (let i = 0; i < 14; i++) { const a = i / 14 * PI * 2, y = 0.36 - Math.max(0, Math.sin(a)) * 0.08, r = tor(y, 0.03); ball(mb, Math.cos(a) * r[1], y, Math.sin(a) * r[2], 0.03, i === 3 ? GOLD : (L.g2 || '#7a2a2a')); }
    },
    darkplate(mb, L) { // the Dark Knight's black armour: a breastplate, spiked pauldrons and a skirt of plates
      const m = L.g2 || '#2a2a36';
      BODIES.armor(mb, { g1: L.g1, g2: m });
      [1, -1].forEach(s => { el(mb, s * 0.22, 0.34, 0.02, 0.12, 0.08, 0.12, sh(m, 0.08), 8, 4); [0, 1, 2].forEach(k => spk(mb, [s * (0.2 + k * 0.05), 0.4, 0.04 - k * 0.04], [s * 0.6, 1, 0], 0.09, 0.022, '#1a1a22', 4)); });
      lof(mb, [tor(0.02, 0.018), [-0.1, 0.28, 0.27]], sh(m, -0.1), { sides: 12 });
    },
    poncho(mb, L) {  // a striped poncho, slit open at the front
      const c = L.g1 || '#c8a070', s2 = L.g2 || '#8a4a30';
      lof(mb, [[0.42, 0.14, 0.14, 0, 0, c], [0.34, 0.27, 0.26, 0, 0, s2], [0.27, 0.33, 0.32, 0, 0, c], [0.2, 0.37, 0.36, 0, 0, s2], [0.17, 0.38, 0.37]], c, { arc: [PI * 0.62, PI * 2.38], sides: 14 });
      rag(mb, 0.17, 0.375, s2, 18, 0.05, (a) => Math.sin(a) > 0.92);
    },
    needles(mb, L) { // the Cactus Guard's spines all over and darker ridges down its body
      const c = L.g1 || '#5a9a3a';
      for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2 + PI / 10; sw(mb, [-0.06, 0.05, 0.18, 0.32].map(y => { const r = tor(y, 0.004); return [Math.cos(a) * r[1], y, Math.sin(a) * r[2]]; }), 0.012, sh(c, -0.12), { sides: 4 }); }
      for (let i = 0; i < 26; i++) { const a = i * 2.4, y = -0.04 + (i % 7) * 0.055, r = tor(y, 0); if (Math.sin(a) > 0.8 && y > 0.1 && y < 0.24) continue; spk(mb, [Math.cos(a) * r[1], y, Math.sin(a) * r[2]], [Math.cos(a), 0.2, Math.sin(a)], 0.05, 0.007, '#f4f0c8', 3); }
    },
    waistcoat(mb, L) { // the Gambler's red waistcoat with a watch chain, a white collar and a black bow
      const c = L.g2 || '#c03030';
      BODIES.vest(mb, { g1: c });
      sw(mb, [[0.13, 0.08, 0.255], [0.06, 0.04, 0.27], [-0.04, 0.06, 0.265]], 0.006, GOLD, { sides: 4 });
      [1, -1].forEach(s => { tri(mb, [0, 0.31, 0.226], [s * 0.07, 0.34, 0.215], [s * 0.07, 0.285, 0.232], L.g1 || '#2a2a2a'); tri(mb, [0, 0.33, 0.222], [s * 0.06, 0.36, 0.205], [s * 0.05, 0.31, 0.226], WHITE); });
    },
    mantle(mb, L) {  // a long robe and a tall collar standing up behind the head
      BODIES.robe(mb, L);
      lof(mb, [tor(0.34, 0.03), [0.5, 0.25, 0.24, -0.05], [0.6, 0.29, 0.27, -0.08]], sh(L.g1 || '#5a2a8a', -0.1), { arc: [PI * 0.95, PI * 2.05] });
      [1, -1].forEach(s => el(mb, s * 0.19, 0.36, 0.02, 0.1, 0.05, 0.12, L.g2 || GOLD, 8, 4));
    },
    wraps(mb, L) {   // the Tomb Guardian's bandages, a broad gold-and-blue collar
      [-0.06, 0.0, 0.06, 0.12, 0.24, 0.3].forEach((y, k) => lof(mb, [tor(y, 0.012), tor(y + 0.045, 0.014)], k % 2 ? '#e8e0c8' : '#d8ceb0'));
      [[0.34, 0.03, L.g2 || GOLD], [0.37, 0.025, L.g1 || '#2a4aa0'], [0.395, 0.02, L.g2 || GOLD]].forEach(([y, p, c]) => lof(mb, [tor(y, p + 0.02), tor(y + 0.025, p + 0.02)], c));
      bl(mb, [0.12, 0.02, 0.23], [0.3, -1, 0.3], 0.14, 0.03, 0.006, '#e8e0c8', [1, 0, 0]);
    },
    chute(mb, L) {   // the Skydiver's parachute pack on its back and the straps across its chest
      const c = L.g1 || '#e07020';
      xf(mb, [0, 0.18, -0.29], [0.1, 0, 0], () => { mb.rbox(0, 0, 0, 0.36 * T, 0.32 * T, 0.12 * T, c, 0.3); bx(mb, 0, -0.05, -0.062, 0.12, 0.05, 0.01, L.g2 || WHITE); });
      [1, -1].forEach(s => sw(mb, [[s * 0.12, 0.38, -0.1], [s * 0.12, 0.38, 0.12], [s * 0.1, 0.3, 0.225], [s * 0.08, 0.06, 0.26]], 0.016, '#2a2a30', { sides: 4 }));
      lof(mb, [tor(0.0, 0.012), tor(0.05, 0.014)], '#2a2a30');
    },
    scale(mb, L) {   // scaled armour: rows of overlapping scales, a gold belt
      const c = L.g1 || '#3a7a4a';
      [0.36, 0.3, 0.06, 0.0].forEach((y, k) => { const r = tor(y, 0.02); for (let i = 0; i < 14; i++) { const a = (i + k * 0.5) / 14 * PI * 2; if (Math.sin(a) > 0.85 && y > 0.05 && y < 0.3) continue; bl(mb, [Math.cos(a) * r[1], y, Math.sin(a) * r[2]], [Math.cos(a) * 0.3, -1, Math.sin(a) * 0.3], 0.08, 0.075, 0.015, k % 2 ? c : sh(c, 0.12), { radial: [0, y, 0] }); } });
      lof(mb, [tor(0.12, 0.016), tor(0.26, 0.016)], sh(c, -0.12), { arc: [PI * 0.62, PI * 2.38] });
      lof(mb, [tor(-0.04, 0.02), tor(0.0, 0.022)], L.g2 || GOLD);
    },
    dress(mb, L) {   // the Flower Maiden's long dress and a short jacket over it
      const c = L.g1 || '#e070a0', j = L.g2 || '#c03040';
      lof(mb, [tor(0.1, 0.014), tor(0.0, 0.02), [-0.08, 0.3, 0.29], [-0.16, 0.34, 0.33]], c, { sides: 12 });
      lof(mb, [[-0.16, 0.342, 0.332], [-0.13, 0.342, 0.332]], WHITE, { sides: 12 });
      lof(mb, [tor(0.37, 0.02), tor(0.26, 0.024), tor(0.17, 0.026)], j, { arc: [PI * 0.66, PI * 2.34] });
    },
    rags(mb, L) {    // a tattered robe with a ragged hem and patches
      const c = L.g1 || '#3a5a3a';
      BODIES.robe(mb, { g1: c, g2: c });
      rag(mb, -0.16, 0.32, sh(c, -0.1), 16, 0.06);
      [[0.15, 0.05, 0.28], [-0.2, -0.05, 0.23]].forEach(([x, y, z]) => xf(mb, [x, y, z], [0, Math.atan2(x, z), 0], () => bx(mb, 0, 0, 0, 0.06, 0.06, 0.01, L.g2 || '#6a4a2a')));
    },
    cloak(mb, L) {   // a dark cloak from the shoulders to the ground, its high collar
      const c = L.g1 || '#2a2a3a';
      capeOf(mb, c, -0.16, 0.06);
      lof(mb, [tor(0.36, 0.02), [0.47, 0.24, 0.23, -0.03]], sh(c, 0.1), { arc: [PI * 0.85, PI * 2.15] });
      rag(mb, -0.16, 0.36, c, 14, 0.05, (a) => Math.sin(a) > -0.1);
    },
    vampcape(mb, L) { // the Vampire's cape, black without and red within, a tall pointed collar and a medallion
      const c = L.g1 || '#1a1a22', r = L.g2 || '#b01828';
      capeOf(mb, c, -0.15, 0.08);
      xf(mb, [0, 0, 0.012], null, () => capeOf(mb, r, -0.15, 0.06));
      [1, -1].forEach(s => { tri(mb, [s * 0.05, 0.36, -0.17], [s * 0.26, 0.38, -0.05], [s * 0.3, 0.62, -0.12], r); tri(mb, [s * 0.05, 0.36, -0.175], [s * 0.3, 0.62, -0.13], [s * 0.04, 0.6, -0.22], c); });
      sw(mb, [[-0.13, 0.36, 0.13], [0, 0.29, 0.225], [0.13, 0.36, 0.13]], 0.006, GOLD, { sides: 4 }); ball(mb, 0, 0.28, 0.232, 0.025, r);
    },
    sheet(mb, L) {   // the Phantom's sheet hanging to the ground, a wavy hem
      const c = L.g1 || '#f4f6ff';
      lof(mb, [tor(0.38, 0.02), tor(0.24, 0.026), tor(0.1, 0.03), [-0.06, 0.3, 0.29], [-0.15, 0.34, 0.33]], c, { sides: 12 });
      rag(mb, -0.15, 0.335, c, 12, 0.04);
    },
    shroud(mb, L) {  // the Specter's long tattered shroud
      const c = L.g1 || '#3a3a4a';
      lof(mb, [tor(0.38, 0.022), tor(0.24, 0.026), tor(0.12, 0.026), [-0.04, 0.3, 0.29], [-0.15, 0.34, 0.33]], c, { arc: [PI * 0.6, PI * 2.4], sides: 12 });
      rag(mb, -0.15, 0.335, c, 18, 0.09, (a) => Math.sin(a) > 0.95);
    },
    clockwork(mb, L) { // the Chrono-Engineer's tool belt, a clock face on its belly and gears at its shoulders
      const gd = L.g2 || '#d8c070', c = L.g1 || '#8a6a3a';
      lof(mb, [tor(0.08, 0.012), tor(0.12, 0.014)], c);
      zcyl(mb, 0, 0.02, 0.215, 0.07, 0.07, 0.03, gd, 12); zcyl(mb, 0, 0.02, 0.225, 0.06, 0.06, 0.03, WHITE, 12);
      bx(mb, 0, 0.04, 0.257, 0.008, 0.04, 0.004, DARK); bx(mb, 0.012, 0.02, 0.257, 0.03, 0.008, 0.004, DARK);
      [1, -1].forEach(s => xf(mb, [s * 0.2, 0.36, 0.0], [0, PI / 2, 0], () => gear(mb, 0, 0, 0, 0.065, 0.025, gd, 8)));
    },
    mane(mb, L) {    // Galian's great shaggy mane round its neck and shoulders
      const c = L.g1 || '#6a4a9a';
      [0.42, 0.34, 0.27].forEach((y, k) => { const r = tor(Math.min(0.4, y), 0.03); for (let i = 0; i < 16; i++) { const a = (i + k * 0.5) / 16 * PI * 2; bl(mb, [Math.cos(a) * r[1], y, Math.sin(a) * r[2]], [Math.cos(a) * 0.6, -0.7, Math.sin(a) * 0.6], 0.15, 0.08, 0.025, i % 2 ? c : sh(c, 0.14), { radial: [0, y, 0] }); } });
    },
    robobody(mb, L, g) { // the MOG robots' boxy body shell: a chest panel with lights (round the badge), bolts, a belt
      const c = L.g1 || '#8a8e96', t = L.g2 || '#e0a020';
      if (L.hat === 'robohead2') mb.rbox(0, 0.15 * T, 0, 0.56 * T, 0.42 * T, 0.5 * T, c, 0.25); else bx(mb, 0, 0.15, 0, 0.56, 0.42, 0.5, c);
      [1, -1].forEach(s => { bx(g, s * 0.12, 0.28, 0.252, 0.04, 0.025, 0.006, s > 0 ? '#60ff80' : '#ff5050'); ball(mb, s * 0.25, 0.32, 0.0, 0.035, t); });
      bx(mb, 0, -0.045, 0, 0.57, 0.025, 0.51, t);
      [[0.22, 0.32], [-0.22, 0.32], [0.22, 0.0], [-0.22, 0.0]].forEach(([x, y]) => ball(mb, x, y, 0.252, 0.012, sh(c, -0.3), 4));
    },
    apron(mb, L) {   // a tool apron at the waist, its pocket stuffed with tools
      const c = L.g1 || '#8a5a30';
      lof(mb, [tor(0.04, 0.012), tor(0.08, 0.014)], sh(c, -0.2));
      pan(mb, [[-0.15, 0.06], [0.15, 0.06], [0.14, -0.13], [-0.14, -0.13]], 0.262, 0.016, c);
      bx(mb, 0, -0.04, 0.275, 0.2, 0.06, 0.012, sh(c, -0.12));
      [[-0.06, 0.03, '#b8bcc8'], [0.0, 0.02, '#e8c040'], [0.06, 0.04, '#c03030']].forEach(([x, h, col]) => bx(mb, x, -0.01 + h / 2, 0.278, 0.018, 0.06 + h, 0.012, col));
    },
    tendrils(mb, L, g) { // Project J's tendrils curling out of its back, glowing veins
      const c = L.g1 || '#5a6a9a';
      for (let k = 0; k < 5; k++) { const s = k % 2 ? 1 : -1, sp = 0.08 + k * 0.05; sw(mb, [[s * 0.06, 0.28 - k * 0.04, -0.2], [s * (0.15 + sp), 0.2 - k * 0.05, -0.32], [s * (0.25 + sp), 0.05 - k * 0.04, -0.3], [s * (0.3 + sp), -0.05 - k * 0.03, -0.18]], [0.04, 0.03, 0.02, 0.003], sh(c, -0.1 + k * 0.04)); }
      [[0.12, 0.05, 0.245], [-0.16, 0.0, 0.215], [0.2, 0.26, 0.17]].forEach(([x, y, z]) => el(g, x, y, z, 0.02, 0.012, 0.006, L.g2 || '#d03040', 6, 3));
    },
    core(mb, L, g) { // Ultima's crystal armour: shards over the shoulders, a gold belt, a glowing core low on its belly
      const cr = L.g1 || '#40e0a0', gd = L.g2 || '#e8d070';
      [1, -1].forEach(s => { for (let k = 0; k < 3; k++) xf(g, [s * (0.17 + k * 0.05), 0.37 - k * 0.04, 0.02 - k * 0.02], [0, 0, -s * (0.5 + k * 0.3)], () => cyl(g, 0, 0, 0, 0.035, 0, 0.14 - k * 0.025, cr, 4)); });
      lof(mb, [tor(0.0, 0.016), tor(0.06, 0.018)], gd);
      el(g, 0, 0.03, 0.262, 0.04, 0.03, 0.012, cr, 8, 4);
      lof(mb, [tor(0.34, 0.018), [0.42, 0.17, 0.16]], gd);
    },
    omegaplate(mb, L, g) { // Omega's heavy armour: chunky plates, big shoulder blocks with exhaust pipes, red vents
      const c = L.g1 || '#5a6070', v = L.g2 || '#ff4030';
      BODIES.armor(mb, { g1: sh(c, -0.25), g2: c });
      [1, -1].forEach(s => { mb.rbox(s * 0.25 * T, 0.33 * T, 0.0, 0.18 * T, 0.14 * T, 0.22 * T, sh(c, 0.08), 0.2); cyl(mb, s * 0.27, 0.38, -0.08, 0.025, 0.025, 0.12, DARK, 6); bx(g, s * 0.33, 0.33, 0.04, 0.008, 0.06, 0.1, v); });
      lof(mb, [tor(0.02, 0.02), [-0.1, 0.28, 0.27]], sh(c, -0.15), { sides: 8 });
      [-0.06, 0, 0.06].forEach(x => bx(g, x, -0.02, 0.272, 0.03, 0.012, 0.006, v));
    },
    royal(mb, L) {   // the Mog King's royal robe: a long red cape with an ermine collar and a gold chain
      const c = L.g1 || '#c02838', gd = L.g2 || '#f0c030';
      capeOf(mb, c, -0.16, 0.08);
      for (let i = 0; i < 14; i++) { const a = PI * 0.7 + i * PI * 1.6 / 13; ball(mb, Math.cos(a) * 0.205, 0.38, Math.sin(a) * 0.195, 0.05, '#f8f8f4'); if (i % 3 === 1) ball(mb, Math.cos(a) * 0.24, 0.385, Math.sin(a) * 0.23, 0.012, '#141418', 4); }
      sw(mb, [[-0.15, 0.36, 0.12], [-0.08, 0.3, 0.215], [0, 0.27, 0.235], [0.08, 0.3, 0.215], [0.15, 0.36, 0.12]], 0.01, gd, { sides: 4 });
    },
  });

  // ------------------------------------------------------------------ weapons (the right paw's weapon bone): blades and
  // hafts are built up the +y axis from the grip, staves up from a little below it, guns along +z, held things round it
  Object.assign(WEAPONS, {
    shortsword(mb, L) { bx(mb, 0, 0.2, 0.02, 0.06, 0.32, 0.014, '#d8dce4'); tri(mb, [-0.03, 0.36, 0.02], [0.03, 0.36, 0.02], [0, 0.43, 0.02], '#d8dce4'); bx(mb, 0, 0.035, 0.02, 0.15, 0.03, 0.035, L.g1 || '#3a6ac8'); bx(mb, 0, -0.03, 0.02, 0.035, 0.1, 0.035, '#5a3a20'); },
    cutlass(mb, L) { pan(mb, [[-0.03, 0.04], [0.03, 0.04], [0.055, 0.28], [0.01, 0.4], [-0.035, 0.28]], 0.02, 0.012, '#d8dce4'); sw(mb, [[-0.04, 0.03, 0.02], [-0.06, -0.04, 0.02], [-0.02, -0.09, 0.02], [0.03, -0.08, 0.02]], 0.01, GOLD, { sides: 4 }); bx(mb, 0, -0.03, 0.02, 0.035, 0.09, 0.035, '#3a2418'); },
    saber(mb, L) { pan(mb, [[-0.016, 0.04], [0.016, 0.04], [0.03, 0.4], [-0.005, 0.5], [-0.02, 0.38]], 0.02, 0.01, '#e8ecf0'); sw(mb, [[-0.03, 0.03, 0.02], [-0.05, -0.04, 0.02], [-0.02, -0.1, 0.02]], 0.009, L.g2 || GOLD, { sides: 4 }); bx(mb, 0, 0.03, 0.02, 0.1, 0.02, 0.03, L.g2 || GOLD); bx(mb, 0, -0.03, 0.02, 0.032, 0.09, 0.032, '#f4f0e8'); },
    scimitar(mb, L) { pan(mb, [[-0.025, 0.04], [0.02, 0.04], [0.075, 0.3], [0.035, 0.42], [-0.03, 0.3]], 0.02, 0.012, '#e0e4ea'); bx(mb, 0, 0.03, 0.02, 0.14, 0.02, 0.035, L.g2 || GOLD); bx(mb, 0, -0.03, 0.02, 0.032, 0.09, 0.032, '#5a2a1a'); },
    rapier(mb, L, g) { bx(mb, 0, 0.27, 0.02, 0.016, 0.48, 0.01, '#e8ecf4'); el(mb, 0, 0.03, 0.02, 0.05, 0.02, 0.05, L.g2 || GOLD, 8, 4); sw(mb, [[0.0, 0.03, 0.06], [-0.05, -0.03, 0.05], [-0.01, -0.09, 0.02]], 0.007, L.g2 || GOLD, { sides: 4 }); bx(mb, 0, -0.03, 0.02, 0.03, 0.09, 0.03, '#3a2418'); if (L.glow) bx(g, 0, 0.27, 0.02, 0.024, 0.46, 0.004, L.glow); },
    darksword(mb, L, g) { const d = '#2a2a36'; pan(mb, [[-0.05, 0.05], [0.05, 0.05], [0.06, 0.2], [0.04, 0.24], [0.06, 0.34], [0.0, 0.52], [-0.06, 0.34], [-0.04, 0.28], [-0.06, 0.18]], 0.02, 0.02, d); pan(g, [[-0.01, 0.06], [0.01, 0.06], [0.01, 0.42], [0, 0.48], [-0.01, 0.42]], 0.031, 0.002, L.eyes || '#ff3030'); bx(mb, 0, 0.04, 0.02, 0.2, 0.03, 0.04, '#1a1a22'); [1, -1].forEach(s => spk(mb, [s * 0.1, 0.04, 0.02], [s, 0.4, 0], 0.06, 0.016, '#1a1a22', 4)); bx(mb, 0, -0.03, 0.02, 0.035, 0.1, 0.035, L.g1 || '#7a1a2a'); },
    flamesword(mb, L, g) { bx(mb, 0, 0.27, 0.02, 0.06, 0.44, 0.014, '#d8dce4'); [0, 1, 2, 3].forEach(k => bl(g, [(k % 2 ? 0.03 : -0.03), 0.12 + k * 0.1, 0.02], [(k % 2 ? 1 : -1) * 0.4, 1, 0], 0.11, 0.05, 0.02, '#ff8020', [0, 0, 1], '#ffe060')); bx(mb, 0, 0.04, 0.02, 0.18, 0.03, 0.04, L.g2 || GOLD); bx(mb, 0, -0.03, 0.02, 0.035, 0.1, 0.035, '#5a2a1a'); },
    tanto(mb, L) { bx(mb, 0, 0.12, 0.02, 0.03, 0.18, 0.01, '#e8ecf0'); tri(mb, [-0.015, 0.21, 0.02], [0.015, 0.21, 0.02], [0.015, 0.25, 0.02], '#e8ecf0'); zcyl(mb, 0, 0.025, 0.012, 0.035, 0.035, 0.016, GOLD, 10); bx(mb, 0, -0.03, 0.02, 0.03, 0.09, 0.03, L.g1 || '#a02040'); },
    kunai(mb, L) { pan(mb, [[0, 0.03], [0.035, 0.08], [0, 0.22], [-0.035, 0.08]], 0.02, 0.012, '#c8ccd4'); bx(mb, 0, -0.02, 0.02, 0.025, 0.08, 0.025, L.g1 || '#3a4a7a'); sw(mb, loop(0, -0.085, 0.02, 0.025, 8, 'xy'), 0.006, '#c8ccd4', { sides: 4 }); },
    needle(mb) { cyl(mb, 0, 0.0, 0.02, 0.018, 0.0, 0.5, '#e8ecf0', 6); sw(mb, loop(0, -0.04, 0.02, 0.03, 8, 'xy', 0.05), 0.008, '#e8ecf0', { sides: 4 }); },
    boomerang(mb) { xf(mb, [0, 0.03, 0.04], [0, 0, 0], () => { [0.55, -0.55].forEach(a => xf(mb, [0, 0, 0], [0, 0, a], () => { bx(mb, 0, 0.13, 0, 0.065, 0.27, 0.02, '#d89040'); bx(mb, 0, 0.25, 0.006, 0.066, 0.04, 0.02, '#c03030'); })); bx(mb, 0, 0.02, 0, 0.07, 0.06, 0.022, '#c03030'); }); },
    mace(mb, L) { bx(mb, 0, 0.12, 0.02, 0.025, 0.3, 0.025, '#8a6a3a'); ball(mb, 0, 0.3, 0.02, 0.055, L.g2 || '#c8ccd4', 8); for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; spk(mb, [Math.cos(a) * 0.05, 0.3, 0.02 + Math.sin(a) * 0.05], [Math.cos(a), 0, Math.sin(a)], 0.035, 0.015, '#d8dce4', 4); } },
    axe(mb, L) { bx(mb, 0, 0.12, 0.02, 0.028, 0.34, 0.028, '#7a5030'); pan(mb, [[0.0, 0.2], [0.13, 0.15], [0.15, 0.27], [0.13, 0.34], [0.0, 0.3]], 0.02, 0.016, '#c8ccd4'); },
    greataxe(mb, L) { bx(mb, 0, 0.16, 0.02, 0.03, 0.5, 0.03, '#6a4020'); [1, -1].forEach(s => pan(mb, [[0.0, 0.28], [s * 0.15, 0.22], [s * 0.18, 0.36], [s * 0.15, 0.48], [0.0, 0.42]], 0.02, 0.018, '#c8ccd4')); spk(mb, [0, 0.41, 0.02], [0, 1, 0], 0.08, 0.02, '#c8ccd4', 4); bx(mb, 0, 0.0, 0.02, 0.04, 0.05, 0.04, L.g1 || '#c03020'); },
    iceaxe(mb, L) { bx(mb, 0, 0.12, 0.02, 0.024, 0.32, 0.024, '#5a5a62'); spk(mb, [0, 0.28, 0.02], [1, -0.25, 0], 0.13, 0.018, '#d0d4dc', 4); spk(mb, [0, 0.28, 0.02], [-1, 0, 0], 0.07, 0.022, '#d0d4dc', 4); ball(mb, 0, -0.04, 0.02, 0.02, '#ff5050'); },
    pick(mb, L) { bx(mb, 0, 0.12, 0.02, 0.028, 0.34, 0.028, '#8a6a3a'); [1, -1].forEach(s => sw(mb, [[0, 0.3, 0.02], [s * 0.08, 0.31, 0.02], [s * 0.15, 0.26, 0.02]], [0.024, 0.018, 0.004], '#8a8e96')); },
    wrench(mb, L) { bx(mb, 0, 0.13, 0.02, 0.04, 0.3, 0.02, L.g2 || '#b8b8c0'); bx(mb, 0, 0.3, 0.02, 0.12, 0.04, 0.022, L.g2 || '#b8b8c0'); [1, -1].forEach(s => bx(mb, s * 0.045, 0.35, 0.02, 0.03, 0.08, 0.022, L.g2 || '#b8b8c0')); bx(mb, 0, -0.02, 0.02, 0.05, 0.08, 0.03, '#c03030'); },
    windkey(mb, L) { bx(mb, 0, 0.14, 0.02, 0.025, 0.24, 0.025, L.g2 || GOLD); [1, -1].forEach(s => el(mb, s * 0.06, -0.01, 0.02, 0.06, 0.04, 0.012, L.g2 || GOLD, 8, 4)); bx(mb, 0.025, 0.25, 0.02, 0.05, 0.05, 0.02, L.g2 || GOLD); },
    baton(mb) { cyl(mb, 0, 0.0, 0.02, 0.008, 0.004, 0.3, '#f8f8f4', 6); el(mb, 0, -0.01, 0.02, 0.022, 0.04, 0.022, '#3a2418', 6, 4); },
    bauble(mb, L) { bx(mb, 0, 0.12, 0.02, 0.02, 0.28, 0.02, '#3a2418'); ball(mb, 0, 0.3, 0.02, 0.045, '#f0e8dc', 8); [[1, L.g1 || '#7a3ac0'], [-1, L.g2 || '#f0c030']].forEach(([s, c]) => { sw(mb, [[s * 0.02, 0.33, 0.02], [s * 0.07, 0.38, 0.02], [s * 0.1, 0.34, 0.02]], [0.025, 0.018, 0.004], c); ball(mb, s * 0.1, 0.33, 0.02, 0.012, GOLD, 4); }); },
    scepter(mb, L, g) { const gd = L.g2 || '#f0c030'; cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.42, gd, 6); ball(mb, 0, 0.36, 0.02, 0.05, gd, 8); ball(g, 0, 0.36, 0.068, 0.02, '#ff3040', 4); bx(mb, 0, 0.44, 0.02, 0.014, 0.07, 0.014, gd); bx(mb, 0, 0.45, 0.02, 0.05, 0.014, 0.014, gd); ball(mb, 0, -0.09, 0.02, 0.025, gd); },
    sprig(mb, L) { sw(mb, [[0, -0.06, 0.02], [0.01, 0.12, 0.02], [-0.01, 0.3, 0.02]], [0.014, 0.012, 0.008], '#6a4a2a'); for (let k = 0; k < 4; k++) bl(mb, [0, 0.12 + k * 0.05, 0.02], [(k % 2 ? 1 : -1), 0.5, 0], 0.07, 0.04, 0.008, L.g1 || '#5aa04a', [0, 0, 1]); flower(mb, -0.01, 0.32, 0.02, 0.026, L.g2 || '#f0a0c0', '#ffe060'); },
    fishrod(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.016, 0.006, 0.66, '#8a6a3a', 6); zcyl(mb, 0.02, 0.06, 0.0, 0.03, 0.03, 0.04, '#5a5a62', 8); sw(mb, [[0, 0.58, 0.02], [0.0, 0.4, 0.1], [0.0, 0.25, 0.14]], 0.003, '#f0f0f0', { sides: 3 }); ball(mb, 0, 0.24, 0.14, 0.025, '#e04030'); ball(mb, 0, 0.27, 0.14, 0.018, WHITE); },
    harpoon(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.62, '#7a5a3a', 6); cyl(mb, 0, 0.54, 0.02, 0.03, 0, 0.13, '#c8ccd4', 4); [1, -1].forEach(s => spk(mb, [0, 0.58, 0.02], [s, -1, 0], 0.06, 0.012, '#c8ccd4', 3)); sw(mb, loop(0, 0.06, 0.02, 0.04, 8, 'xz'), 0.01, '#d8c890', { sides: 4 }); },
    pitchfork(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.015, 0.015, 0.58, '#8a6a3a', 6); bx(mb, 0, 0.5, 0.02, 0.14, 0.02, 0.02, '#8a8e96'); [-1, 0, 1].forEach(k => cyl(mb, k * 0.06, 0.5, 0.02, 0.01, 0.002, 0.14, '#9a9ea6', 4)); },
    scythe(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.64, '#6a4a2a', 6); sw(mb, [[0, 0.54, 0.02], [0.08, 0.58, 0.04], [0.18, 0.56, 0.06], [0.26, 0.5, 0.06]], [[0.006, 0.03], [0.006, 0.035], [0.005, 0.025], [0.002, 0.004]], '#c8ccd4'); },
    spear(mb, L) { cyl(mb, 0, -0.1, 0.02, 0.015, 0.015, 0.66, L.shaft || '#8a6a3a', 6); pan(mb, [[0, 0.54], [0.035, 0.6], [0, 0.72], [-0.035, 0.6]], 0.02, 0.016, '#d8dce4'); bx(mb, 0, 0.545, 0.02, 0.07, 0.015, 0.02, L.g2 || GOLD); bl(mb, [0, 0.53, 0.02], [0.2, -1, 0.2], 0.08, 0.035, 0.01, L.g1 || '#c03030', [1, 0, 0]); },
    lance(mb, L) { cyl(mb, 0, -0.06, 0.02, 0.02, 0.02, 0.12, '#5a3a20', 6); cyl(mb, 0, 0.06, 0.02, 0.07, 0.03, 0.04, L.g2 || STEEL, 10); cyl(mb, 0, 0.1, 0.02, 0.035, 0.004, 0.5, L.g1 || '#e8c030', 8); },
    walkstaff(mb, L) { sw(mb, [[0, -0.08, 0.02], [0.01, 0.2, 0.02], [-0.01, 0.45, 0.02], [0.03, 0.56, 0.02]], [0.018, 0.016, 0.016, 0.02], '#7a5a3a'); bl(mb, [0.0, 0.46, 0.02], [0.5, -1, 0.3], 0.14, 0.05, 0.01, L.g2 || '#8a4a30', [1, 0, 0]); ball(mb, 0.0, 0.47, 0.02, 0.025, L.g2 || '#8a4a30'); },
    lanternpole(mb, L, g) { cyl(mb, 0, -0.08, 0.02, 0.014, 0.014, 0.66, '#3a3a40', 6); sw(mb, [[0, 0.58, 0.02], [0.08, 0.62, 0.02], [0.12, 0.56, 0.02]], 0.008, '#3a3a40', { sides: 4 }); WEAPONS.lantern(mb, L, g, [0.12, 0.47, 0.02]); },
    lantern(mb, L, g, at) { const [x, y, z] = at || [0, -0.12, 0.04]; cyl(mb, x, y - 0.06, z, 0.045, 0.045, 0.012, DARK, 6); for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + PI / 4; bx(mb, x + Math.cos(a) * 0.04, y, z + Math.sin(a) * 0.04, 0.008, 0.11, 0.008, DARK); } ball(g, x, y, z, 0.038, L.g2 || '#ffd860', 8); cyl(mb, x, y + 0.055, z, 0.05, 0.01, 0.04, DARK, 6); sw(mb, [[x, y + 0.095, z], [x, y + 0.13, z]], 0.006, DARK, { sides: 4 }); },
    gearstaff(mb, L, g) { cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.56, '#5a3a2a', 6); gear(mb, 0, 0.55, 0.02, 0.08, 0.025, L.g2 || '#d0a040', 8); ball(g, 0, 0.55, 0.04, 0.022, '#40e0ff', 6); },
    orbstaff(mb, L, g) { cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.58, '#3a2418', 6); [0, 1, 2].forEach(k => { const a = k / 3 * PI * 2; sw(mb, [[0, 0.48, 0.02], [Math.cos(a) * 0.05, 0.53, 0.02 + Math.sin(a) * 0.05], [Math.cos(a) * 0.03, 0.6, 0.02 + Math.sin(a) * 0.03]], [0.01, 0.008, 0.003], '#3a2418', { sides: 4 }); }); ball(g, 0, 0.56, 0.02, 0.05, L.g2 || '#ff8030', 8); },
    clockstaff(mb, L) { const gd = L.g2 || GOLD; cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.54, '#3a2418', 6); zcyl(mb, 0, 0.53, 0.0, 0.085, 0.085, 0.03, gd, 12); zcyl(mb, 0, 0.53, 0.01, 0.072, 0.072, 0.03, WHITE, 12); xf(mb, [0, 0.53, 0.042], [0, 0, 0.6], () => bx(mb, 0, 0.025, 0, 0.008, 0.05, 0.004, DARK)); xf(mb, [0, 0.53, 0.042], [0, 0, -1.6], () => bx(mb, 0, 0.018, 0, 0.01, 0.036, 0.004, DARK)); },
    pendulum(mb, L) { const gd = L.g2 || '#e8c040'; cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.6, '#2a1a3a', 6); sw(mb, [[0, 0.52, 0.02], [0.05, 0.6, 0.02], [0.12, 0.58, 0.02], [0.14, 0.52, 0.02]], 0.012, gd, { sides: 4 }); sw(mb, [[0.14, 0.52, 0.02], [0.13, 0.38, 0.02]], 0.004, gd, { sides: 3 }); zcyl(mb, 0.13, 0.35, 0.01, 0.035, 0.035, 0.02, gd, 10); },
    crozier(mb, L) { const gd = L.g2 || GOLD; cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.58, gd, 6); sw(mb, [[0, 0.48, 0.02], [0.0, 0.58, 0.02], [0.06, 0.64, 0.02], [0.12, 0.6, 0.02], [0.11, 0.53, 0.02], [0.06, 0.53, 0.02]], [0.018, 0.018, 0.016, 0.014, 0.012, 0.008], gd); ball(mb, 0, 0.48, 0.02, 0.03, gd); },
    broom(mb, L) { cyl(mb, 0, -0.04, 0.02, 0.014, 0.014, 0.6, '#6a4a2a', 6); sw(mb, loop(0, -0.04, 0.02, 0.03, 8, 'xz'), 0.008, '#8a3a2a', { sides: 4 }); cyl(mb, 0, -0.22, 0.02, 0.09, 0.03, 0.18, '#c8a860', 10); },
    gnarled(mb, L, g) { sw(mb, [[0, -0.08, 0.02], [0.02, 0.12, 0.02], [-0.02, 0.3, 0.02], [0.03, 0.46, 0.02], [-0.02, 0.56, 0.02], [0.04, 0.6, 0.02]], [0.02, 0.018, 0.02, 0.016, 0.018, 0.01], '#4a3a2a'); ball(g, -0.01, 0.55, 0.05, 0.022, L.eyes || '#ff60c0', 6); },
    skullstaff(mb, L, g) { cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.54, '#2a2a22', 6); el(mb, 0, 0.53, 0.02, 0.06, 0.055, 0.06, IVORY, 8, 5); bx(mb, 0, 0.48, 0.04, 0.05, 0.025, 0.04, IVORY); [1, -1].forEach(s => el(g, s * 0.022, 0.535, 0.07, 0.014, 0.016, 0.008, L.eyes || '#80ff60', 6, 3)); },
    totem(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.02, 0.02, 0.52, '#7a5030', 6); el(mb, 0, 0.5, 0.03, 0.05, 0.06, 0.05, '#8a5a30', 8, 4); [1, -1].forEach(s => { ball(mb, s * 0.025, 0.52, 0.075, 0.012, '#141418', 4); bl(mb, [s * 0.03, 0.42, 0.04], [s * 0.3, -1, 0.1], 0.12, 0.035, 0.008, L.g2 || '#30a8a0', [1, 0, 0], WHITE); }); spk(mb, [0, 0.55, 0.03], [0, 1, 0], 0.07, 0.03, IVORY, 4); },
    ankh(mb, L) { const gd = L.g2 || GOLD; cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.42, gd, 6); bx(mb, 0, 0.34, 0.02, 0.16, 0.03, 0.025, gd); sw(mb, loop(0, 0.42, 0.02, 0.045, 10, 'xy', 0.065), 0.014, gd, { sides: 4 }); },
    net(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.014, 0.014, 0.5, '#7a5a3a', 6); sw(mb, loop(0, 0.53, 0.02, 0.1, 10, 'xz'), 0.008, '#5a5a62', { sides: 4 }); for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; sw(mb, [[Math.cos(a) * 0.1, 0.53, 0.02 + Math.sin(a) * 0.1], [0, 0.4, 0.02]], 0.003, '#e8e0c8', { sides: 3 }); } },
    longbow(mb, L) { const pts = []; for (let i = 0; i <= 8; i++) { const a = -PI * 0.42 + i * PI * 0.84 / 8; pts.push([0, Math.sin(a) * 0.36 + 0.12, Math.cos(a) * 0.1 + 0.02]); } sw(mb, pts, 0.013, L.g2 || '#7a4a20', { sides: 5 }); bx(mb, 0, 0.12, 0.05, 0.004, 0.64, 0.004, '#e8e8e0'); bx(mb, 0, 0.12, 0.12, 0.03, 0.05, 0.03, '#5a3a20'); },
    crossbow(mb, L) { bx(mb, 0, 0.02, 0.1, 0.035, 0.035, 0.3, '#5a3a20'); bx(mb, 0, 0.0, -0.02, 0.03, 0.08, 0.04, '#5a3a20'); sw(mb, [[-0.16, 0.03, 0.17], [0, 0.03, 0.24], [0.16, 0.03, 0.17]], 0.011, '#3a3a40', { sides: 4 }); bx(mb, 0, 0.03, 0.2, 0.3, 0.003, 0.003, '#e8e8e0'); zcyl(mb, 0, 0.055, 0.04, 0.012, 0.012, 0.12, '#2a2a2a', 6); },
    pistol(mb, L) { zcyl(mb, 0, 0.04, 0.0, 0.018, 0.016, 0.2, '#5a5a62', 8); bx(mb, 0, 0.04, -0.01, 0.035, 0.04, 0.06, GOLD); xf(mb, [0, 0.0, -0.03], [0.5, 0, 0], () => bx(mb, 0, -0.03, 0, 0.032, 0.08, 0.04, '#6a3a20')); },
    revolver(mb, L) { zcyl(mb, 0, 0.05, 0.04, 0.016, 0.016, 0.16, '#5a5a62', 8); zcyl(mb, 0, 0.045, -0.0, 0.035, 0.035, 0.05, '#3a3a40', 6); xf(mb, [0, 0.0, -0.03], [0.35, 0, 0], () => bx(mb, 0, -0.04, 0, 0.032, 0.09, 0.045, L.g2 || '#c8a070')); bx(mb, 0, 0.075, 0.19, 0.008, 0.015, 0.01, '#5a5a62'); },
    rifle(mb, L) { zcyl(mb, 0, 0.05, 0.0, 0.016, 0.016, 0.36, '#3a3a40', 8); bx(mb, 0, 0.04, 0.02, 0.04, 0.045, 0.14, L.g2 || '#a08040'); xf(mb, [0, 0.02, -0.06], [-0.25, 0, 0], () => bx(mb, 0, 0, -0.03, 0.04, 0.06, 0.12, L.g2 || '#a08040')); bx(mb, 0, 0.08, 0.06, 0.02, 0.02, 0.06, '#2a2a2a'); },
    gatling(mb, L) { zcyl(mb, 0, 0.0, -0.06, 0.075, 0.07, 0.14, L.g1 || '#3a3a40', 10); zcyl(mb, 0, 0.0, 0.08, 0.06, 0.06, 0.05, L.g2 || '#c0a040', 10); for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; zcyl(mb, Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0.1, 0.014, 0.014, 0.2, '#5a5a62', 6); } zcyl(mb, 0, 0.0, 0.28, 0.06, 0.06, 0.02, '#2a2a30', 10); },
    wavecannon(mb, L, g) { zcyl(mb, 0, 0.0, -0.08, 0.085, 0.08, 0.18, L.g1 || '#5a6070', 8); zcyl(mb, 0, 0.0, 0.1, 0.08, 0.1, 0.16, sh(L.g1 || '#5a6070', 0.1), 8); zcyl(g, 0, 0.0, 0.26, 0.065, 0.065, 0.012, L.g2 || '#ff4030', 10); [1, -1].forEach(s => bx(g, s * 0.09, 0.0, 0.1, 0.01, 0.03, 0.12, L.g2 || '#ff4030')); },
    flask(mb, L, g) { ball(g, 0, 0.0, 0.03, 0.05, L.liquid || '#50c8ff', 8); el(mb, 0, 0.0, 0.03, 0.058, 0.058, 0.058, '#e0f0f4', 8, 5); cyl(mb, 0, 0.05, 0.03, 0.018, 0.018, 0.06, '#e0f0f4', 6); cyl(mb, 0, 0.11, 0.03, 0.021, 0.021, 0.02, '#a07040', 6); },
    book(mb, L) { bx(mb, 0, 0.02, 0.05, 0.03, 0.14, 0.11, L.g1 || '#c04060'); bx(mb, 0.003, 0.02, 0.05, 0.026, 0.13, 0.1, '#f4f0e0'); bx(mb, -0.012, 0.02, 0.05, 0.008, 0.14, 0.11, sh(L.g1 || '#c04060', -0.2)); },
    megaphone(mb, L) { zcyl(mb, 0, 0.04, 0.0, 0.025, 0.07, 0.18, L.g2 || '#5a9a3a', 10); zcyl(mb, 0, 0.04, 0.17, 0.072, 0.072, 0.012, WHITE, 10); bx(mb, 0, -0.01, 0.04, 0.025, 0.08, 0.025, DARK); },
    anchor(mb, L) { cyl(mb, 0, -0.32, 0.04, 0.016, 0.016, 0.3, '#5a5a62', 6); sw(mb, loop(0, -0.0, 0.04, 0.03, 8, 'xy'), 0.01, '#5a5a62', { sides: 4 }); bx(mb, 0, -0.06, 0.04, 0.12, 0.02, 0.02, '#5a5a62'); sw(mb, [[-0.12, -0.24, 0.04], [-0.08, -0.32, 0.04], [0, -0.34, 0.04], [0.08, -0.32, 0.04], [0.12, -0.24, 0.04]], 0.016, '#5a5a62', { sides: 4 }); [1, -1].forEach(s => spk(mb, [s * 0.12, -0.24, 0.04], [s * 0.3, 1, 0], 0.04, 0.02, '#5a5a62', 4)); },
    cards(mb, L) { for (let k = 0; k < 5; k++) xf(mb, [0, 0.0, 0.05 + k * 0.002], [0, 0, (k - 2) * 0.28], () => { bx(mb, 0, 0.07, 0, 0.06, 0.09, 0.003, WHITE); bx(mb, 0, 0.09, 0.002, 0.016, 0.016, 0.002, k % 2 ? (L.g2 || '#c03030') : '#141418'); }); },
    orb(mb, L, g) { cyl(mb, 0, -0.03, 0.04, 0.035, 0.045, 0.03, GOLD, 8); ball(g, 0, 0.05, 0.04, 0.055, L.g2 || '#c0e0ff', 8); },
    abacus(mb, L) { const w = '#6a4020'; bx(mb, 0, 0.12, 0.04, 0.16, 0.015, 0.02, w); bx(mb, 0, -0.02, 0.04, 0.16, 0.015, 0.02, w); [1, -1].forEach(s => bx(mb, s * 0.08, 0.05, 0.04, 0.015, 0.15, 0.02, w)); for (let r = 0; r < 4; r++) { const y = 0.0 + r * 0.035; bx(mb, 0, y, 0.04, 0.15, 0.004, 0.004, '#c8c0b0'); for (let k = 0; k < 3; k++) el(mb, -0.05 + k * 0.02 + (r % 2) * 0.04, y, 0.04, 0.009, 0.012, 0.012, k % 2 ? (L.g2 || GOLD) : '#c03030', 6, 3); } },
    wateringcan(mb, L) { cyl(mb, 0, -0.08, 0.04, 0.06, 0.055, 0.1, L.g1 || '#5a9a5a', 10); xf(mb, [0, -0.06, 0.08], [-0.9, 0, 0], () => cyl(mb, 0, 0, 0, 0.014, 0.01, 0.13, L.g1 || '#5a9a5a', 6)); sw(mb, [[0, 0.02, 0.0], [0, 0.06, 0.04], [0, 0.02, 0.08]], 0.01, sh(L.g1 || '#5a9a5a', -0.2), { sides: 4 }); },
    puppet(mb, L) { xf(mb, [0, 0.02, 0.05], null, () => { bx(mb, 0, 0, 0, 0.14, 0.015, 0.015, '#6a4020'); bx(mb, 0, 0, 0, 0.015, 0.015, 0.1, '#6a4020'); [[-0.07, 0], [0.07, 0], [0, 0.05]].forEach(([x, z]) => sw(mb, [[x, 0, z], [x * 0.5, -0.16, z * 0.4]], 0.002, '#e8e8e0', { sides: 3 })); ball(mb, 0, -0.2, 0.01, 0.035, L.g2 || '#d8c070', 6); ball(mb, 0, -0.15, 0.01, 0.03, '#f0e0d0', 6); ball(mb, 0, -0.115, 0.01, 0.01, '#ff4040', 4); }); },
    balls(mb) { [['#e04040', -0.06, 0.14], ['#f0d040', 0.0, 0.22], ['#4070e0', 0.06, 0.14]].forEach(([c, x, y]) => ball(mb, x, y, 0.06, 0.035, c, 8)); },
    flute(mb, L) { cyl(mb, 0, -0.04, 0.02, 0.014, 0.014, 0.26, L.g2 || '#e8d8a0', 6); for (let k = 0; k < 3; k++) ball(mb, 0, 0.1 + k * 0.04, 0.034, 0.006, '#3a2418', 4); cyl(mb, 0, 0.22, 0.02, 0.018, 0.03, 0.03, L.g2 || '#e8d8a0', 6); },
    kite(mb, L) { sw(mb, [[0, 0.0, 0.03], [-0.08, 0.2, 0.04], [-0.16, 0.38, 0.04]], 0.003, '#f0f0f0', { sides: 3 }); xf(mb, [-0.2, 0.5, 0.04], [0.15, -0.3, 0.25], () => { mb.scale(1.4, 1.4, 1.4); pan(mb, [[0, -0.1], [0.07, 0], [0, 0.12], [-0.07, 0]], 0, 0.006, L.g1 || '#e04040', L.g2 || '#40a0e0'); bx(mb, 0, 0.01, 0.006, 0.006, 0.22, 0.004, '#8a6a3a'); bx(mb, 0, 0.0, 0.006, 0.14, 0.006, 0.004, '#8a6a3a'); [0, 1, 2].forEach(k => bl(mb, [0, -0.1 - k * 0.04, 0], [0, -1, 0], 0.03, 0.025, 0.004, k % 2 ? (L.g2 || '#40a0e0') : (L.g1 || '#e04040'), [1, 0, 0])); }); },
    drill(mb, L) { bx(mb, 0, 0.04, 0.03, 0.06, 0.07, 0.13, '#e8b020'); xf(mb, [0, 0.0, -0.01], [0.35, 0, 0], () => bx(mb, 0, -0.04, 0, 0.04, 0.09, 0.045, '#2a2a30')); zcyl(mb, 0, 0.04, 0.095, 0.022, 0.022, 0.03, '#5a5a62', 8); zcyl(mb, 0, 0.04, 0.125, 0.02, 0.0, 0.12, '#c8ccd4', 6); for (let k = 0; k < 3; k++) xf(mb, [0, 0.04, 0.14 + k * 0.03], [0, 0, k * 1.1], () => bx(mb, 0, 0, 0, 0.045 - k * 0.01, 0.006, 0.006, '#9a9ea6')); },
    gloves(mb, L, g, y0 = 0.008) { ball(mb, 0, y0, 0.015, 0.08, L.g1 || '#c03030', 8); lof(mb, [[y0 + 0.05, 0.062, 0.062], [y0 + 0.1, 0.066, 0.066]], L.g2 || WHITE, { sides: 8 }); },
  });
  // how each new weapon is held (see GRIP above)
  const BLADE = { at: [0, -0.02, 0.05], rot: [1.15, 0, 0.4] }, SHORT = { at: [0, -0.02, 0.05], rot: [1.3, 0, 0.4] }, HAFT = { at: [0, -0.02, 0.06], rot: [1.25, 0, 0.4] };
  // (staves and poles upright through the paw's middle: 0.09 in front of it they stood off beside the paw, never in it;
  // the user, 2026-10-04, "needs to be holding its weapon")
  const STAFF = { at: [0, -0.2, 0], rot: [0, 0, 0.4] }, POLE = { at: [0, -0.26, 0], rot: [0, 0, 0.4] }, ROD = { at: [0, -0.1, 0.03], rot: [0.12, 0, 0.4] };
  const HELD = { at: [0, -0.04, 0.07], rot: [0, 0, 0.4] }, GUN = { at: [0, 0.0, 0.05], rot: [0, 0, 0.4] }, FIST = { at: [0, 0, 0], rot: [0, 0, 0] };
  Object.assign(GRIP, {
    shortsword: BLADE, cutlass: BLADE, saber: BLADE, scimitar: BLADE, rapier: BLADE, darksword: { at: [0, -0.02, 0.05], rot: [1.05, 0, 0.4] }, flamesword: BLADE,
    tanto: SHORT, kunai: SHORT, needle: { at: [0, -0.02, 0.05], rot: [1.2, 0, 0.4] }, baton: SHORT, flute: { at: [0, -0.02, 0.06], rot: [0.9, 0, 0.4] },
    boomerang: HELD, mace: HAFT, axe: HAFT, greataxe: { at: [0, -0.06, 0.06], rot: [1.0, 0, 0.4] }, iceaxe: HAFT, pick: HAFT, wrench: HAFT, windkey: HAFT, bauble: HAFT,
    scepter: ROD, sprig: ROD, ankh: ROD,
    fishrod: { at: [0, -0.18, 0], rot: [0.55, 0, 0.4] }, harpoon: POLE, pitchfork: POLE, scythe: POLE, spear: POLE, lance: { at: [0, -0.08, 0], rot: [0.8, 0, 0.4] },
    walkstaff: STAFF, lanternpole: POLE, gearstaff: STAFF, orbstaff: STAFF, clockstaff: STAFF, pendulum: STAFF, crozier: STAFF, broom: STAFF, gnarled: STAFF,
    skullstaff: STAFF, totem: STAFF, net: { at: [0, -0.16, 0], rot: [0.45, 0, 0.4] }, longbow: { at: [0, -0.16, 0], rot: [0, 0, 0.4] },
    crossbow: GUN, drill: GUN, pistol: GUN, revolver: GUN, rifle: GUN, megaphone: GUN, gatling: FIST, wavecannon: FIST, gloves: FIST,
    flask: HELD, book: HELD, anchor: { at: [0, 0.0, 0.06], rot: [0, 0, 0.4] }, cards: HELD, orb: HELD, abacus: HELD, wateringcan: HELD, puppet: HELD, balls: HELD,
    lantern: { at: [0, 0.0, 0.05], rot: [0, 0, 0.4] }, kite: HELD,
  });

  // ------------------------------------------------------------------ shields (on the left forearm, facing out and forward)
  const SHIELDS = {
    round: { at: [0.075, -0.06, 0.03], turn: 1.0, build(mb, L) { zcyl(mb, 0, 0, -0.01, 0.13, 0.13, 0.02, L.g1 || WOOD, 12); sw(mb, loop(0, 0, 0.01, 0.13, 12, 'xy'), 0.012, L.g2 || STEEL, { sides: 4 }); ball(mb, 0, 0, 0.015, 0.035, L.g2 || STEEL, 6); } },
    kite: { at: [0.08, -0.07, 0.03], turn: 1.0, build(mb, L) { const P = [[0, 0.13], [0.11, 0.1], [0.1, -0.02], [0, -0.17], [-0.1, -0.02], [-0.11, 0.1]]; pan(mb, P.map(([x, y]) => [x * 1.1, y * 1.08]), -0.006, 0.014, L.g2 || STEEL); pan(mb, P, 0.004, 0.012, L.g1 || '#3a5aa8'); if (L.emblem === 'cross') { bx(mb, 0, -0.01, 0.013, 0.025, 0.2, 0.006, L.g2 === '#c02828' ? L.g2 : GOLD); bx(mb, 0, 0.04, 0.013, 0.12, 0.025, 0.006, L.g2 === '#c02828' ? L.g2 : GOLD); } else ball(mb, 0, 0.03, 0.012, 0.025, GOLD, 6); } },
    tower: { at: [0.09, -0.06, 0.03], turn: 0.9, build(mb, L) { mb.rbox(0, 0, 0, 0.24 * T, 0.36 * T, 0.03 * T, L.g1 || '#3a8a7a', 0.3); [[0.08, 0.14], [-0.08, 0.14], [0.08, -0.14], [-0.08, -0.14]].forEach(([x, y]) => ball(mb, x, y, 0.016, 0.012, L.g2 || '#d8c8a0', 4)); el(mb, 0, 0, 0.016, 0.06, 0.07, 0.01, L.g2 || '#d8c8a0', 8, 4); } },
  };
  // the second boxing glove, on the left paw
  const OFFHAND = { gloves: (mb, L, g) => WEAPONS.gloves(mb, L, g, -0.02) };

  // ------------------------------------------------------------------ extras: halos, wings, a pet dragon
  const EXTRAS = {
    halo: { bone: 'head', build(mb, L, g) { xf(g, [0, 0.7, -0.02], [-0.2, 0, 0], () => sw(g, loop(0, 0, 0, 0.15, 16, 'xz'), 0.014, L.halo || '#ffe880', { sides: 4 })); } },
    dragonpet: { bone: 'torso', build(mb, L, g) {   // a baby dragon perched on the left shoulder
      const c = L.g1 || '#3a7a4a';
      xf2(mb, g, [0.31, 0.4, 0.05], [0, -0.5, 0], () => { mb.scale(1.35, 1.35, 1.35); g.scale(1.35, 1.35, 1.35);
        el(mb, 0, 0.04, 0, 0.05, 0.05, 0.065, c, 8, 4); el(mb, 0, 0.12, 0.05, 0.04, 0.035, 0.05, c, 8, 4); el(mb, 0, 0.11, 0.1, 0.022, 0.018, 0.03, sh(c, 0.1), 6, 3);
        [1, -1].forEach(s => { ball(g, s * 0.02, 0.135, 0.085, 0.009, '#ffd040', 4); spk(mb, [s * 0.02, 0.15, 0.03], [s * 0.2, 1, -0.6], 0.04, 0.01, IVORY, 3); tri(mb, [s * 0.03, 0.07, -0.01], [s * 0.15, 0.16, -0.06], [s * 0.12, 0.04, -0.07], sh(c, -0.1)); });
        sw(mb, [[0, 0.02, -0.05], [0.02, -0.02, -0.12], [0.06, -0.06, -0.14]], [0.025, 0.015, 0.003], c);
      });
    } },
    onewing: { bone: 'torso', build(mb) {   // a single great black wing from the left of the back
      for (let k = 0; k < 9; k++) { const a = 0.15 + k * 0.17, d = [Math.cos(a) * 0.9, Math.sin(a), -0.35]; bl(mb, [0.08, 0.38, -0.2], d, 0.28 + Math.sin(k / 8 * PI) * 0.18, 0.08, 0.02, k % 2 ? '#1a1a22' : '#2a2a36', [0, 0, 1], '#3a3a4a'); }
      sw(mb, [[0.06, 0.38, -0.18], [0.22, 0.5, -0.26], [0.36, 0.62, -0.3]], [0.03, 0.025, 0.012], '#141418');
    } },
    crystalwings: { bone: 'torso', build(mb, L, g) {   // fans of glowing crystal shards from the back
      [1, -1].forEach(s => { for (let k = 0; k < 5; k++) { const a = 0.3 + k * 0.28; xf(g, [s * 0.08, 0.36, -0.2], [-0.35, 0, -s * (PI / 2 - a)], () => cyl(g, 0, 0, 0, 0.035, 0, 0.3 + (k === 2 ? 0.12 : k % 2 ? 0.06 : 0), k % 2 ? (L.g1 || '#40e0a0') : '#a0fff0', 4)); } });
    } },
    dragonwings: { bone: 'torso', build(mb, L, g) {   // great membranous dragon wings, their spars and claws
      const c = L.g1 || '#2a2a4a', m = sh(c, 0.12), e = L.g2 || '#60c0ff';
      [1, -1].forEach(s => {
        const P = (x, y, z) => [s * x, y, z], R = P(0.08, 0.38, -0.2), E = P(0.32, 0.6, -0.34), H = P(0.6, 0.72, -0.38), F = [P(0.62, 0.42, -0.42), P(0.52, 0.22, -0.4), P(0.34, 0.14, -0.34)];
        sw(mb, [R, E, H], [0.03, 0.025, 0.01], c); F.forEach(f => sw(mb, [E, f], [0.015, 0.004], c));
        tri(mb, R, E, F[2], m); tri(mb, E, F[1], F[2], m); tri(mb, E, F[0], F[1], sh(m, -0.08)); tri(mb, E, H, F[0], m);
        spk(mb, H, [s * 0.4, 1, 0], 0.06, 0.015, IVORY, 3); ball(g, ...P(0.32, 0.6, -0.33), 0.016, e, 4);
      });
    } },
  };

  // ================================================================== the second Kupodex's gear (js/kupomon/kp_dex2.js jobs)
  // a soft crown over the top of the head (caps, hoods, hair), from y0 up to a point
  const crownOf = (mb, c, y0 = 0.28, top = 0.47, pad = 0.016, o) => lof(mb, [hed(y0, pad), [Math.min(0.4, y0 + 0.11), 0.226 + pad, 0.216 + pad], [top - 0.03, 0.12, 0.115], [top, 0.001, 0.001]], c, o);
  // hair over the top and back of the head, the face left open
  const hairOf = (mb, c, top = 0.47, short) => { crownOf(mb, c, 0.27, top, 0.02); if (short) lof(mb, [hed(0.12, 0.018), hed(0.2, 0.022), hed(0.3, 0.02)], c, { arc: [PI * 0.9, PI * 2.1] }); else lof(mb, [hed(0.05, 0.022), hed(0.2, 0.026), hed(0.3, 0.022)], c, { arc: [PI * 0.72, PI * 2.28] }); };
  // a band round the head at y
  const bandOf = (mb, y, h, c, pad = 0.018, o) => lof(mb, [hed(y, pad), hed(y + h, pad)], c, Object.assign({ sides: 12 }, o || {}));
  // dark glasses over the eyes
  const shadesOf = (mb, c = '#1e1e26', w = 0.048, h = 0.034) => { [1, -1].forEach(s => el(mb, s * 0.075, 0.24, 0.236, w, h, 0.01, c, 8, 4)); bx(mb, 0, 0.25, 0.24, 0.05, 0.012, 0.01, c); };
  // a ring of puffy balls (fur trim, ruffs, wool)
  // the same transform on a part and its glowing part
  const xf2 = (mb, g, t, r, fn) => xf(mb, t, r, () => xf(g, t, r, fn));
  const puffs = (mb, y, rx, rz, r, c, n = 12, a0 = 0, a1 = PI * 2, c2) => { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / n; ball(mb, Math.cos(a) * rx, y, Math.sin(a) * rz, r, c2 && i % 2 ? c2 : c, 6); } };
  Object.assign(HATS, {
    // ---- Freelancer
    ballcap(mb, L) {   // the Tourist's ball cap, its bill to the front, and sunglasses
      const c = L.g2 || '#40b0e0';
      lof(mb, [hed(0.28, 0.014), [0.38, 0.232, 0.222], [0.44, 0.15, 0.145], [0.465, 0.001]], c, { sides: 12 });
      el(mb, 0, 0.29, 0.21, 0.16, 0.014, 0.12, sh(c, -0.18), 8, 4); ball(mb, 0, 0.462, 0, 0.022, sh(c, -0.18));
      shadesOf(mb);
    },
    explorer(mb, L) {  // the Wayfarer's wide traveling hat, its brim drooping, a cord and a green feather
      const c = L.g2 || '#8a5a30';
      brim(mb, 0.31, 0.2, 0.38, sh(c, -0.08), (a) => -0.02 - Math.abs(Math.sin(a)) * 0.03);
      lof(mb, [hed(0.3, 0.012), [0.43, 0.2, 0.19], [0.475, 0.13, 0.1], [0.47, 0.001, 0.001]], c);
      bandOf(mb, 0.31, 0.035, L.g1 || '#5a7a3a', 0.02);
      bl(mb, [0.17, 0.36, -0.06], [0.5, 0.8, -0.6], 0.22, 0.05, 0.01, '#7ac040', [1, 0, 0]);
    },
    toque(mb, L) {     // the Cook's short pleated chef's hat
      const pl = (i) => (i % 2 ? WHITE : '#e2e2dc');
      lof(mb, [hed(0.29, 0.014, pl), [0.36, 0.22, 0.21, 0, 0, pl], [0.44, 0.25, 0.24, 0, 0, pl], [0.5, 0.25, 0.24], [0.53, 0.18, 0.17], [0.545, 0.001]], WHITE, { sides: 12 });
      bandOf(mb, 0.29, 0.04, L.g2 || '#d03030', 0.02);
    },
    tallchef(mb, L) {  // the Chef's tall toque, puffed at the top
      const pl = (i) => (i % 2 ? WHITE : '#e2e2dc');
      lof(mb, [hed(0.29, 0.014, pl), [0.4, 0.2, 0.19, 0, 0, pl], [0.58, 0.21, 0.2, -0.01, 0, pl], [0.66, 0.27, 0.26, -0.02, 0, pl], [0.73, 0.25, 0.24, -0.02], [0.77, 0.15, 0.14, -0.02], [0.78, 0.001, 0.001, -0.02]], WHITE, { sides: 12 });
    },
    grandtoque(mb, L, g) { // the Gourmet's towering toque with a gold band and a star
      const pl = (i) => (i % 2 ? WHITE : '#e6e2d8');
      lof(mb, [hed(0.29, 0.014, pl), [0.45, 0.2, 0.19, 0, 0, pl], [0.68, 0.22, 0.21, -0.02, 0, pl], [0.78, 0.3, 0.29, -0.03, 0, pl], [0.86, 0.27, 0.26, -0.03], [0.9, 0.15, 0.14, -0.03], [0.91, 0.001, 0.001, -0.03]], WHITE, { sides: 12 });
      bandOf(mb, 0.3, 0.05, L.g2 || '#d8a020', 0.022);
      xf(g, [0, 0.43, 0.232], null, () => pan(g, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => { const a = PI / 2 + k * PI / 5, r = k % 2 ? 0.018 : 0.042; return [Math.cos(a) * r, Math.sin(a) * r]; }), 0, 0.008, '#ffe060'));
    },
    kerchief(mb, L) {  // the Sweeper's polka-dot headscarf, knotted up on top at the front
      const c = L.g2 || '#e04040', dots = (i) => (i % 3 ? c : WHITE);
      lof(mb, [hed(0.27, 0.018, dots), [0.38, 0.235, 0.225, 0, 0, dots], [0.44, 0.15, 0.145], [0.465, 0.001]], c, { sides: 12 });
      [1, -1].forEach(s => bl(mb, [0, 0.43, 0.1], [s * 0.8, 0.6, 0.2], 0.1, 0.07, 0.025, c, [0, 0, 1]));
      ball(mb, 0, 0.43, 0.11, 0.03, sh(c, -0.1));
    },
    workcap(mb, L) {   // the Custodian's flat work cap with a brass badge
      const c = L.g1 || '#5a6a4a';
      lof(mb, [hed(0.29, 0.012), [0.37, 0.245, 0.235, 0.01], [0.42, 0.245, 0.235, 0.01], [0.43, 0.001, 0.001, 0.01]], c, { sides: 12 });
      el(mb, 0, 0.3, 0.205, 0.15, 0.014, 0.1, sh(c, -0.2), 8, 4);
      ball(mb, 0, 0.36, 0.24, 0.026, L.g2 || GOLD, 6);
    },
    pagecap(mb, L) {   // the Page's bowl cut and a little cap with a long feather
      hairOf(mb, '#8a5a30', 0.46);
      lof(mb, [hed(0.29, 0.03), [0.4, 0.2, 0.19, 0.03, 0.06], [0.45, 0.12, 0.11, 0.03, 0.06], [0.46, 0.001, 0.001, 0.03, 0.06]], L.g1 || '#3a6ac8');
      bl(mb, [0.12, 0.42, 0.0], [0.3, 0.7, -1], 0.26, 0.05, 0.012, L.g2 || '#e8c040', [1, 0, 0]);
    },
    mogknight(mb, L) { // the Mog Knight's round helm, open at the face, a gold rim and a red tassel on top
      const m = L.g2 || STEEL;
      dome(mb, 0, 0.29, 0, 0.24, 0.2, 0.23, m);
      lof(mb, [hed(0.1, 0.03), hed(0.29, 0.024)], m, { arc: [PI * 0.72, PI * 2.28] });
      lof(mb, [hed(0.28, 0.03), hed(0.31, 0.03)], GOLD, { arc: [PI * 0.1, PI * 0.9] });
      sw(mb, [[0, 0.44, 0.0], [0, 0.5, -0.02]], [0.03, 0.02], GOLD);
      [[0, 0.56, -0.02], [0.04, 0.53, -0.06], [-0.04, 0.53, -0.06], [0, 0.52, -0.1], [0.03, 0.5, 0.03], [-0.03, 0.5, 0.03]].forEach(([x, y, z]) => ball(mb, x, y, z, 0.04, L.g1 || '#c02838', 6));
    },
    // ---- Warrior
    shinrahelm(mb, L, g) { // the Trooper's round infantry helmet, its goggles dark
      const c = '#4a5a7a';
      dome(mb, 0, 0.27, 0, 0.25, 0.22, 0.24, c);
      lof(mb, [hed(0.25, 0.04), hed(0.29, 0.04)], sh(c, -0.15));
      lof(mb, [hed(0.21, 0.03), hed(0.27, 0.03)], '#1a1a22', { arc: [PI * 0.12, PI * 0.88] });
      [1, -1].forEach(s => el(g, s * 0.075, 0.24, 0.258, 0.04, 0.02, 0.006, '#ff4a3a', 6, 3));
      [1, -1].forEach(s => el(mb, s * 0.205, 0.14, 0.06, 0.03, 0.08, 0.07, sh(c, -0.1), 6, 4));
    },
    cloudspikes(mb, L) { // SOLDIER's spiky hair, swept up and back
      const c = L.g2 || '#f0dc70', d = sh(c, -0.12);
      hairOf(mb, c, 0.45);
      [[0, 0.44, 0.02, [0, 1, 0.3], 0.2], [0.1, 0.42, 0.0, [0.5, 1, -0.2], 0.18], [-0.1, 0.42, 0.0, [-0.5, 1, -0.2], 0.18], [0.0, 0.42, -0.12, [0, 0.7, -1], 0.2],
        [0.16, 0.36, -0.08, [0.8, 0.5, -0.6], 0.17], [-0.16, 0.36, -0.08, [-0.8, 0.5, -0.6], 0.17], [0.08, 0.32, 0.17, [0.3, -0.3, 1], 0.12], [-0.06, 0.33, 0.17, [-0.2, -0.4, 1], 0.12]]
        .forEach(([x, y, z, d2, len], k) => bl(mb, [x, y, z], d2, len, 0.1, 0.05, k % 2 ? d : c, null));
    },
    zackspikes(mb, L) { // First Class: black spikes swept straight back, one long bang over the brow
      const c = L.g2 || '#1a1a22', d = sh(c, 0.12);
      hairOf(mb, c, 0.45);
      for (let k = 0; k < 7; k++) { const x = (k - 3) * 0.06, y = 0.4 - Math.abs(k - 3) * 0.035; bl(mb, [x, y, 0.0], [x * 2, 0.45, -1], 0.26 - Math.abs(k - 3) * 0.02, 0.1, 0.05, k % 2 ? d : c, null); }
      bl(mb, [0.05, 0.36, 0.18], [0.3, -1, 0.5], 0.16, 0.05, 0.02, c, null);
    },
    kasa(mb, L) {      // the Wanderer's deep woven straw hat, tied under the chin
      const c = L.g1 || '#c8a860', w = (i) => (i % 2 ? c : sh(c, -0.08));
      lof(mb, [[0.22, 0.38, 0.38, 0, 0, w], [0.3, 0.33, 0.33, 0, 0, w], [0.42, 0.22, 0.22, 0, 0, w], [0.5, 0.1, 0.1], [0.53, 0.001]], c, { sides: 14 });
      lof(mb, [[0.21, 0.385, 0.385], [0.23, 0.385, 0.385]], sh(c, -0.35), { sides: 14 });
      [1, -1].forEach(s => sw(mb, [[s * 0.2, 0.28, 0.02], [s * 0.16, 0.12, 0.1], [s * 0.06, 0.04, 0.17]], 0.007, '#5a3a2a', { sides: 4 }));
    },
    ronintail(mb, L) { // the Parivir's black hair in a high tail, a red cloth band
      const c = '#1e1a22';
      hairOf(mb, c, 0.46);
      sw(mb, [[0, 0.44, -0.08], [0, 0.56, -0.12], [0, 0.6, -0.2], [0.02, 0.5, -0.3], [0.04, 0.36, -0.32]], [0.05, 0.05, 0.045, 0.03, 0.006], c);
      bandOf(mb, 0.29, 0.04, L.g2 || '#8a2a2a', 0.03);
      [1, -1].forEach(s => bl(mb, [s * 0.02, 0.31, -0.23], [s * 0.4, -0.6, -1], 0.17, 0.04, 0.01, L.g2 || '#8a2a2a', [0, 1, 0]));
    },
    saintband(mb, L) { // the Sword Saint's white hair, a long tail down its back, a gold brow plate
      const c = '#eceae4', gd = L.g2 || GOLD;
      hairOf(mb, c, 0.46);
      sw(mb, [[0, 0.3, -0.22], [0, 0.18, -0.28], [0.02, 0.04, -0.3], [0.03, -0.08, -0.28]], [0.06, 0.05, 0.04, 0.01], c);
      bandOf(mb, 0.3, 0.035, WHITE, 0.03);
      xf(mb, [0, 0.318, 0.236], [-0.25, 0, 0], () => { bx(mb, 0, 0, 0, 0.12, 0.05, 0.014, gd); bx(mb, 0, 0, 0.009, 0.02, 0.05, 0.004, '#c02828'); });
    },
    stocking(mb, L) {  // the Woodcutter's orange knit stocking cap, its long tip flopping behind
      const c = '#d8762a', rib = (i) => (i % 2 ? c : sh(c, -0.1));
      lof(mb, [hed(0.27, 0.02, rib), hed(0.31, 0.022), [0.4, 0.22, 0.21, -0.02], [0.47, 0.13, 0.12, -0.06]], c, { sides: 12, capTop: false });
      lof(mb, [hed(0.27, 0.024, rib), hed(0.32, 0.026)], sh(c, -0.18), { sides: 12 });
      sw(mb, [[0, 0.47, -0.06], [0.02, 0.5, -0.16], [0.04, 0.45, -0.26], [0.05, 0.36, -0.3]], [0.12, 0.08, 0.05, 0.02], c);
      ball(mb, 0.05, 0.34, -0.3, 0.04, sh(c, -0.18));
    },
    ravagerhelm(mb, L) { // the Ravager's dark iron helm: two great tusks forward, a ridge of spikes
      const m = '#3a3a40';
      dome(mb, 0, 0.29, 0, 0.24, 0.2, 0.23, m);
      lof(mb, [hed(0.12, 0.03), hed(0.29, 0.024)], m, { arc: [PI * 0.72, PI * 2.28] });
      bandOf(mb, 0.28, 0.03, L.g1 || '#5a2a2a', 0.03);
      [1, -1].forEach(s => curve(mb, [[s * 0.18, 0.3, 0.12], [s * 0.27, 0.32, 0.22], [s * 0.26, 0.42, 0.32]], 0.04, 0.004, IVORY));
      for (let k = 0; k < 5; k++) spk(mb, [0, 0.47 - k * 0.04, 0.08 - k * 0.07], [0, 1, -0.3 - k * 0.3], 0.09, 0.025, '#2a2a30', 4);
    },
    // ---- Knight
    mailcoif(mb, L) {  // the Shield Bearer's chainmail hood, open at the face, a cloth band
      const m = L.g2 || STEEL, ring = (i) => (i % 2 ? m : sh(m, -0.14));
      lof(mb, [[-0.04, 0.3, 0.28, -0.04, 0, ring], hed(0.08, 0.035, ring), hed(0.2, 0.04, ring), hed(0.34, 0.03, ring), [0.45, 0.13, 0.13, -0.02], [0.49, 0.001]], m, { sides: 14, arc: [PI * 0.66, PI * 2.34] });
      bandOf(mb, 0.3, 0.035, L.g1 || '#6a8ac0', 0.045, { arc: [PI * 0.2, PI * 0.8] });
    },
    agrias(mb, L, g) { // the Holy Knight's golden hair, a silver circlet and a long braid down its back
      const c = '#f0d070';
      hairOf(mb, c, 0.46);
      [1, -1].forEach(s => bl(mb, [s * 0.16, 0.33, 0.14], [s * 0.3, -1, 0.3], 0.18, 0.06, 0.02, c, null));
      for (let k = 0; k < 6; k++) ball(mb, 0, 0.26 - k * 0.07, -0.24 - k * 0.012, 0.045 - k * 0.003, k % 2 ? c : sh(c, -0.08), 6);
      bandOf(mb, 0.31, 0.025, '#d8dce4', 0.026);
      ball(g, 0, 0.325, 0.245, 0.02, '#80c0ff', 6);
    },
    flattop(mb, L) {   // the Bouncer's flat-top haircut and dark glasses
      const c = '#2a2420';
      lof(mb, [hed(0.3, 0.012), [0.4, 0.21, 0.2], [0.5, 0.2, 0.19], [0.505, 0.001]], c, { sides: 8, sq: 4 });
      lof(mb, [hed(0.06, 0.016), hed(0.2, 0.02), hed(0.31, 0.014)], c, { arc: [PI * 0.8, PI * 2.2] });
      shadesOf(mb, '#141418', 0.055, 0.028);
    },
    bascinet(mb, L) {  // the Defender's pointed bascinet, its snouted visor shut
      const m = L.g2 || '#9a9ea8';
      lof(mb, [hed(0.04, 0.03), hed(0.2, 0.034), hed(0.34, 0.03), [0.5, 0.1, 0.1, -0.03], [0.58, 0.001, 0.001, -0.06]], m, { sides: 12 });
      xf(mb, [0, 0.21, 0.2], [PI / 2, 0, 0], () => { mb.scale(1, 1, 0.8); cyl(mb, 0, 0, 0, 0.17, 0.02, 0.17, sh(m, 0.06), 8); });
      [0.2, 0.24].forEach(y => bx(mb, 0, y, 0.33, 0.12, 0.012, 0.03, '#141418'));
      lof(mb, [hed(0.04, 0.035), hed(0.08, 0.035)], L.g1 || '#7a3a20', { sides: 12 });
    },
    beeveil(mb, L) {   // the Beekeeper's wide hat with a mesh veil hanging all round
      const c = L.g1 || '#f4f2e8';
      cyl(mb, 0, 0.36, 0, 0.36, 0.34, 0.02, c, 16);
      lof(mb, [hed(0.36, 0.012), [0.46, 0.17, 0.16], [0.49, 0.001]], c);
      for (let i = 0; i < 26; i++) { const a = i / 26 * PI * 2, x = Math.cos(a), z = Math.sin(a); sw(mb, [[x * 0.335, 0.36, z * 0.335], [x * 0.3, 0.16, z * 0.3 + 0.01], [x * 0.27, 0.04, z * 0.27 + 0.02]], 0.005, '#4a4a4a', { sides: 3 }); }
      sw(mb, loop(0, 0.04, 0.02, 0.27, 20, 'xz'), 0.01, '#d8d8d0', { sides: 4 });
      bandOf(mb, 0.37, 0.03, L.g2 || '#e8b020', 0.02);
    },
    beehelm(mb, L) {   // the Queensguard's striped helm and two antennae
      const y = L.g1 || '#e8b020', k = L.g2 || '#1a1a1a';
      lof(mb, [hed(0.12, 0.03), hed(0.2, 0.032, null), hed(0.28, 0.03), [0.38, 0.215, 0.205], [0.44, 0.15, 0.14], [0.47, 0.001]].map((r, i) => (r[5] = i % 2 ? k : y, r)), y, { arc: [PI * 0.72, PI * 2.28] });
      dome(mb, 0, 0.36, 0, 0.21, 0.11, 0.2, y);
      [1, -1].forEach(s => { curve(mb, [[s * 0.06, 0.44, 0.08], [s * 0.1, 0.56, 0.12], [s * 0.14, 0.64, 0.08]], 0.012, 0.008, k); ball(mb, s * 0.14, 0.65, 0.07, 0.03, k); });
    },
    leonhart(mb, L) {  // the Gunbreaker's shaggy brown hair, and a scar across the brow
      const c = '#6a4a30', d = sh(c, -0.12);
      hairOf(mb, c, 0.46);
      for (let k = 0; k < 7; k++) { const a = PI * 0.25 + k * PI * 0.5 / 6, x = Math.cos(a) * 0.2, z = Math.sin(a) * 0.2; bl(mb, [x, 0.38, z], [x * 2, -0.9, z * 2], 0.14, 0.07, 0.025, k % 2 ? d : c, null); }
      for (let k = 0; k < 6; k++) { const a = PI * 1.1 + k * PI * 0.8 / 5; bl(mb, [Math.cos(a) * 0.21, 0.3, Math.sin(a) * 0.2], [Math.cos(a), -0.8, Math.sin(a)], 0.14, 0.08, 0.025, k % 2 ? d : c, null); }
      xf(mb, [0.0, 0.27, 0.236], [0, 0, -0.7], () => bx(mb, 0, 0, 0, 0.1, 0.008, 0.006, '#c87878'));
    },
  });
  Object.assign(BODIES, {
    // ---- Freelancer
    aloha(mb, L) {     // the Tourist's flowery shirt, worn loose
      const c = L.g1 || '#e05050';
      lof(mb, [tor(0.37, 0.016), tor(0.26, 0.018), tor(0.12, 0.016), tor(0.0, 0.02), [-0.06, 0.25, 0.24]], c, { arc: [PI * 0.56, PI * 2.44] });
      [[0.14, 0.3], [-0.16, 0.24], [0.19, 0.06], [-0.2, 0.02], [0.05, 0.36]].forEach(([x, y]) => { const r = tor(y, 0.02), z = Math.sqrt(Math.max(0, 1 - (x * x) / (r[1] * r[1]))) * r[2]; flower(mb, x, y, z, 0.022, k(x), '#ffe060'); });
      [[0.2, 0.2], [-0.05, 0.08], [0.0, 0.3]].forEach(([a, y]) => { const r = tor(y, 0.02); flower(mb, Math.cos(PI * 1.5 + a) * r[1], y, Math.sin(PI * 1.5 + a) * r[2], 0.024, WHITE, '#ffe060'); });
      function k(x) { return x > 0 ? WHITE : '#ffd040'; }
    },
    backpack(mb, L) {  // the Wayfarer's big rucksack, a bedroll on top, its straps over the shoulders
      const c = L.g2 || '#8a5a30';
      xf(mb, [0, 0.16, -0.31], [0.08, 0, 0], () => { mb.rbox(0, 0, 0, 0.34 * T, 0.36 * T, 0.16 * T, L.g1 || '#5a7a3a', 0.3); bx(mb, 0, -0.06, -0.085, 0.2, 0.1, 0.02, sh(L.g1 || '#5a7a3a', -0.12)); });
      xf(mb, [-0.2, 0.4, -0.31], [0, 0, -PI / 2], () => { cyl(mb, 0, 0, 0, 0.06, 0.06, 0.4, '#b05a3a', 10); [0.08, 0.32].forEach(y => cyl(mb, 0, y, 0, 0.062, 0.062, 0.02, '#5a3a20', 10)); });
      [1, -1].forEach(s => sw(mb, [[s * 0.12, 0.38, -0.16], [s * 0.13, 0.4, 0.06], [s * 0.12, 0.32, 0.2], [s * 0.12, 0.12, 0.25], [s * 0.15, 0.0, 0.2]], 0.016, sh(c, -0.1), { sides: 4 }));
    },
    chefcoat(mb, L) {  // a white double-breasted chef's coat, two rows of buttons, a neckerchief
      const c = L.g1 || '#f4f4f0';
      lof(mb, [tor(0.37, 0.016), tor(0.26, 0.016), tor(0.13, 0.012), tor(0.0, 0.016), [-0.09, 0.25, 0.24]], c, { sides: 12 });
      lof(mb, [tor(0.36, 0.02), [0.43, 0.15, 0.15]], c, { sides: 12 });
      [1, -1].forEach(s => [0.06, 0.26, 0.0].forEach(y => { const r = tor(y, 0.018); ball(mb, s * 0.1, y, r[2] * 0.93, 0.016, '#c8c8c0', 4); }));
      [1, -1].forEach(s => bl(mb, [0, 0.37, 0.18], [s * 0.4, -1, 0.5], 0.1, 0.06, 0.012, L.g2 || '#d03030', [1, 0, 0]));
      ball(mb, 0, 0.375, 0.18, 0.03, L.g2 || '#d03030');
    },
    keybelt(mb, L) {   // the Custodian's work vest and a belt hung with a great ring of keys
      BODIES.vest(mb, { g1: L.g1 || '#5a6a4a' });
      lof(mb, [tor(-0.01, 0.014), tor(0.05, 0.016)], '#3a2a1a');
      sw(mb, loop(0.255, -0.04, 0.08, 0.05, 10, 'zy'), 0.008, L.g2 || GOLD, { sides: 4 });
      [[-0.03, 0.4], [0.02, -0.3], [0.06, 0.2]].forEach(([dz, r]) => xf(mb, [0.265, -0.07, 0.08 + dz], [r, 0, 0], () => { bx(mb, 0, -0.03, 0, 0.012, 0.06, 0.02, '#b8bcc8'); bx(mb, 0, -0.055, 0.012, 0.012, 0.012, 0.012, '#b8bcc8'); }));
    },
    doublet(mb, L) {   // the Page's striped doublet, puffed shoulders and a small white collar
      const a = L.g1 || '#3a6ac8', b = L.g2 || '#e8c040', st = (i) => (i % 2 ? a : b);
      lof(mb, [tor(0.36, 0.016, st), tor(0.24, 0.018, st), tor(0.12, 0.014, st), tor(0.0, 0.018, st), [-0.08, 0.25, 0.24]], a, { sides: 12 });
      [1, -1].forEach(s => el(mb, s * 0.22, 0.35, 0.03, 0.09, 0.07, 0.09, st(s > 0 ? 1 : 0), 8, 4));
      puffs(mb, 0.4, 0.15, 0.14, 0.03, WHITE, 10);
    },
    // ---- Warrior
    trooper(mb, L) {   // the Trooper's padded blue uniform: a vest, shoulder pads and a belt of pouches
      const c = L.g1 || '#2a4a8a';
      lof(mb, [tor(0.37, 0.016), tor(0.26, 0.02), tor(0.12, 0.016), tor(0.0, 0.018), [-0.09, 0.25, 0.24]], c, { sides: 12 });
      [1, -1].forEach(s => el(mb, s * 0.21, 0.36, 0.02, 0.1, 0.05, 0.1, sh(c, 0.12), 8, 4));
      lof(mb, [tor(-0.02, 0.022), tor(0.04, 0.024)], '#3a3a40');
      [-0.16, 0.16, -0.06].forEach(x => { const r = tor(0.0, 0.03); bx(mb, x, 0.0, Math.sqrt(1 - x * x / (r[1] * r[1])) * r[2], 0.06, 0.06, 0.03, '#4a4a34'); });
    },
    soldier(mb, L) {   // SOLDIER's uniform: a high-necked sweater, crossed straps, a belt and a big pauldron
      const c = L.g1 || '#4a3a7a', m = '#9aa0ac';
      lof(mb, [[0.44, 0.13, 0.13], tor(0.36, 0.016), tor(0.24, 0.018), tor(0.12, 0.014), tor(0.0, 0.016), [-0.09, 0.25, 0.24]], c, { sides: 12 });
      [1, -1].forEach(s => sw(mb, [[s * 0.12, 0.38, 0.12], [s * 0.1, 0.26, 0.235], [s * 0.04, 0.08, 0.27]], 0.012, '#3a2a1a', { sides: 4 }));
      lof(mb, [tor(-0.02, 0.022), tor(0.04, 0.024)], '#3a2a1a'); bx(mb, 0, 0.01, 0.272, 0.06, 0.05, 0.012, m);
      (L.hat === 'zackspikes' ? [1, -1] : [1]).forEach(s => { el(mb, s * 0.23, 0.36, 0.02, 0.13, 0.08, 0.12, m, 8, 4); el(mb, s * 0.26, 0.32, 0.02, 0.11, 0.06, 0.11, sh(m, -0.12), 8, 4); });
    },
    mino(mb, L) {      // the Wanderer's straw rain cape, layer on layer, tied at the neck
      const c = L.g1 || '#c8a860';
      [0.38, 0.27, 0.16].forEach((y, k) => { const r = tor(y, 0.03 + k * 0.012); for (let i = 0; i < 18; i++) { const a = (i + k * 0.5) / 18 * PI * 2; if (Math.sin(a) > 0.55) continue; bl(mb, [Math.cos(a) * r[1], y, Math.sin(a) * r[2]], [Math.cos(a) * 0.2, -1, Math.sin(a) * 0.2], 0.16, 0.07, 0.015, (i + k) % 2 ? c : sh(c, -0.1), { radial: [0, y, 0] }); } });
      lof(mb, [tor(0.03, 0.012), tor(0.08, 0.014)], L.g2 || '#5a4a3a');
      sw(mb, [[-0.1, 0.38, 0.13], [0, 0.35, 0.18], [0.1, 0.38, 0.13]], 0.01, '#5a3a2a', { sides: 4 });
    },
    hakama(mb, L) {    // a kimono top, its lapels crossed in a V, over wide pleated hakama trousers
      const c = L.g1 || '#3a3a5a', hk = L.g2 || '#8a2a2a', pl = (i) => (i % 2 ? hk : sh(hk, -0.1));
      lof(mb, [tor(0.37, 0.016), tor(0.26, 0.018), tor(0.12, 0.014), tor(0.02, 0.016)], c, { arc: [PI * 0.62, PI * 2.38] });
      [1, -1].forEach(s => sw(mb, [[s * 0.11, 0.38, 0.12], [s * 0.07, 0.24, 0.23], [-s * 0.03, 0.04, 0.26]], 0.02, WHITE, { sides: 4 }));
      lof(mb, [tor(0.06, 0.02, pl), tor(0.0, 0.03, pl), [-0.08, 0.3, 0.29, 0, 0, pl], [-0.16, 0.33, 0.32]], hk, { sides: 14 });
      lof(mb, [tor(0.03, 0.03), tor(0.08, 0.03)], L.cape ? sh(L.cape, -0.1) : '#2a2a30');
    },
    plaid(mb, L) {     // the Woodcutter's checked flannel shirt
      const a = L.g1 || '#c03030', b = L.g2 || '#2a2a2a', ck = (j) => (i) => ((i + j) % 2 ? a : b);
      lof(mb, [tor(0.37, 0.016, ck(0)), tor(0.3, 0.017, ck(1)), tor(0.22, 0.018, ck(0)), tor(0.14, 0.016, ck(1)), tor(0.06, 0.016, ck(0)), tor(-0.02, 0.018, ck(1)), [-0.08, 0.25, 0.24]], a, { sides: 12 });
      [1, -1].forEach(s => bl(mb, [s * 0.04, 0.4, 0.13], [s * 0.6, -1, 0.6], 0.09, 0.07, 0.01, a, [0, 0, 1]));
    },
    // ---- Knight
    security(mb, L) {  // the Bouncer's black tee with a yellow SECURITY band across the chest and back
      const c = L.g1 || '#1a1a22';
      lof(mb, [tor(0.37, 0.016), tor(0.26, 0.016), tor(0.13, 0.012), tor(0.0, 0.016), [-0.08, 0.25, 0.24]], c, { sides: 12 });
      lof(mb, [tor(0.27, 0.022), tor(0.32, 0.022)], L.g2 || '#e8c020', { sides: 12 });
      [1, -1].forEach(s => el(mb, s * 0.21, 0.35, 0.02, 0.08, 0.05, 0.08, c, 8, 4));
    },
    beesuit(mb, L) {   // the Beekeeper's puffy white suit, its cuffs taped
      const c = L.g1 || '#f4f2e8';
      [0.0, 0.1, 0.2, 0.3].forEach((y, k) => lof(mb, [tor(y, 0.014), tor(y + 0.05, 0.036), tor(y + 0.1, 0.014)], k % 2 ? c : sh(c, -0.05), { sides: 12 }));
      lof(mb, [[-0.1, 0.24, 0.23], tor(-0.02, 0.03), tor(0.01, 0.03)], c, { sides: 12 });
      lof(mb, [tor(0.02, 0.034), tor(0.05, 0.034)], L.g2 || '#e8b020', { sides: 12 });
    },
    beearmor(mb, L) {  // the Queensguard's striped breastplate and round pauldrons
      const y = L.g1 || '#e8b020', k = L.g2 || '#1a1a1a', st = (i) => i;
      lof(mb, [tor(0.0, 0.02, y), tor(0.07, 0.024, k), tor(0.12, 0.024, y), tor(0.2, 0.024, k), tor(0.26, 0.022, y), tor(0.33, 0.02)].map(r => { const c = r[5]; r[5] = null; r.color = c; return r; }).map(r => [r[0], r[1], r[2], r[3], r[4], r.color]), y, { sides: 12 });
      [1, -1].forEach(s => { el(mb, s * 0.22, 0.36, 0.02, 0.11, 0.07, 0.11, y, 8, 4); el(mb, s * 0.24, 0.32, 0.02, 0.1, 0.05, 0.1, k, 8, 4); });
      lof(mb, [tor(-0.04, 0.026), [-0.1, 0.26, 0.25]], k, { sides: 12 });
    },
    furcollar(mb, L) { // the Gunbreaker's black jacket, open, a white fur collar and two belts slung low
      const c = L.g1 || '#1a1a22';
      lof(mb, [tor(0.36, 0.02), tor(0.24, 0.022), tor(0.1, 0.026), tor(0.0, 0.024)], c, { arc: OPEN });
      puffs(mb, 0.39, 0.2, 0.19, 0.045, L.g2 || '#f0f0f0', 14, PI * 0.72, PI * 2.28, '#e0e0dc');
      [[0.0, 0.2], [-0.04, -0.2]].forEach(([y, t]) => xf(mb, [0, y, 0], [t * 0.4, 0, t], () => lof(mb, [tor(0.0, 0.03), tor(0.025, 0.03)], '#2a2018', { sides: 12 })));
    },
  });
  Object.assign(WEAPONS, {
    // ---- Freelancer
    camera(mb, L) { bx(mb, 0, 0.04, 0.03, 0.13, 0.08, 0.06, '#2a2a30'); zcyl(mb, 0, 0.04, 0.06, 0.03, 0.026, 0.05, '#5a5a62', 10); zcyl(mb, 0, 0.04, 0.105, 0.022, 0.022, 0.006, '#80c0ff', 10); bx(mb, 0.04, 0.09, 0.03, 0.04, 0.02, 0.03, '#c0c0c8'); sw(mb, [[-0.065, 0.06, 0.03], [-0.09, 0.15, 0.0], [0, 0.22, -0.03], [0.09, 0.15, 0.0], [0.065, 0.06, 0.03]], 0.006, '#e05050', { sides: 3 }); },
    ladle(mb, L) { cyl(mb, 0, -0.04, 0.02, 0.012, 0.012, 0.32, '#c8ccd4', 6); xf(mb, [0, 0.31, 0.04], [PI, 0, 0], () => dome(mb, 0, 0, 0, 0.06, 0.05, 0.06, '#c8ccd4', 8)); bx(mb, 0, -0.04, 0.02, 0.026, 0.06, 0.026, '#6a4a2a'); },
    fryingpan(mb, L) { cyl(mb, 0, -0.06, 0.02, 0.016, 0.016, 0.16, '#3a2418', 6); xf(mb, [0, 0.2, 0.02], [PI / 2, 0, 0], () => { cyl(mb, 0, -0.01, 0, 0.11, 0.12, 0.03, '#2a2a30', 12); cyl(mb, 0, 0.012, 0, 0.1, 0.1, 0.004, '#4a4a52', 12); }); },
    cloche(mb, L) { cyl(mb, 0, 0.0, 0.06, 0.15, 0.15, 0.012, '#c8ccd4', 14); dome(mb, 0, 0.012, 0.06, 0.12, 0.1, 0.12, '#e0e4ec', 12); ball(mb, 0, 0.12, 0.06, 0.02, L.g2 || GOLD); },
    pushbroom(mb, L) { cyl(mb, 0, -0.32, 0.02, 0.014, 0.014, 0.6, '#8a6a3a', 6); bx(mb, 0, -0.32, 0.02, 0.26, 0.04, 0.05, L.g2 || '#e04040'); for (let k = 0; k < 9; k++) bx(mb, -0.12 + k * 0.03, -0.37, 0.02, 0.014, 0.06, 0.04, '#d8c080'); },
    mop(mb, L) { cyl(mb, 0, -0.26, 0.02, 0.014, 0.014, 0.66, '#5a8ac0', 6); cyl(mb, 0, -0.29, 0.02, 0.045, 0.04, 0.04, '#b8bcc8', 8); for (let k = 0; k < 14; k++) { const a = k / 14 * PI * 2, r = 0.03 + (k % 2) * 0.012; sw(mb, [[Math.cos(a) * r, -0.28, 0.02 + Math.sin(a) * r], [Math.cos(a) * (r + 0.025), -0.36, 0.02 + Math.sin(a) * (r + 0.025)], [Math.cos(a) * (r + 0.035), -0.42, 0.02 + Math.sin(a) * (r + 0.035)]], [0.022, 0.02, 0.016], k % 3 ? '#ece8dc' : '#d8d2c0', { sides: 4 }); } },
    scroll(mb, L) { xf(mb, [0, 0.05, 0.06], [0, 0, PI / 2], () => { cyl(mb, 0, -0.1, 0, 0.035, 0.035, 0.2, '#f0e6c8', 10); [-0.1, 0.1].forEach(y => cyl(mb, 0, y - 0.01, 0, 0.04, 0.04, 0.02, '#8a5a30', 10)); cyl(mb, 0, -0.012, 0, 0.037, 0.037, 0.024, L.g1 || '#c02838', 10); }); },
    // ---- Warrior
    bayonet(mb, L) { zcyl(mb, 0, 0.05, 0.0, 0.014, 0.014, 0.34, '#3a3a40', 8); bx(mb, 0, 0.035, 0.03, 0.04, 0.045, 0.16, '#5a4a3a'); xf(mb, [0, 0.02, -0.07], [-0.25, 0, 0], () => bx(mb, 0, 0, -0.02, 0.04, 0.06, 0.1, '#5a4a3a')); xf(mb, [0, 0.05, 0.34], [PI / 2, 0, 0], () => pan(mb, [[-0.012, 0], [0.012, 0], [0, 0.14]], 0, 0.006, '#d8dce4')); },
    broadsword(mb, L) { bx(mb, 0, 0.3, 0.02, 0.09, 0.5, 0.016, '#d0d4dc'); tri(mb, [-0.045, 0.55, 0.02], [0.045, 0.55, 0.02], [0, 0.63, 0.02], '#d0d4dc'); bx(mb, 0, 0.045, 0.02, 0.17, 0.03, 0.04, '#5a5a62'); bx(mb, 0, -0.03, 0.02, 0.035, 0.11, 0.035, '#2a2a30'); },
    buster(mb, L) { const b = '#b8bcc8'; xf(mb, [0, 0, 0.02], [0, PI / 2 - 0.35, 0], () => { pan(mb, [[-0.065, 0.06], [0.065, 0.06], [0.065, 0.6], [0.0, 0.7], [-0.065, 0.62]], 0, 0.022, b); bx(mb, 0.058, 0.33, 0.0, 0.012, 0.52, 0.026, '#e4e8f0'); [0.12, 0.2].forEach(y => zcyl(mb, -0.03, y, -0.016, 0.015, 0.015, 0.032, '#2a2a30', 8)); bx(mb, 0, 0.045, 0, 0.16, 0.035, 0.05, '#4a4a52'); bx(mb, 0, -0.05, 0, 0.035, 0.15, 0.035, '#3a2418'); }); },
    bokken(mb, L) { sw(mb, [[0, 0.04, 0.02], [0.0, 0.25, 0.02], [0.02, 0.45, 0.02], [0.05, 0.6, 0.02]], [[0.012, 0.022], [0.012, 0.022], [0.011, 0.02], [0.006, 0.012]], '#c89a5a', { sides: 4 }); zcyl(mb, 0, 0.035, 0.012, 0.035, 0.035, 0.016, '#1a1a1a', 10); bx(mb, 0, -0.03, 0.02, 0.028, 0.1, 0.028, '#a07040'); },
    nodachi(mb, L) { sw(mb, [[0, 0.04, 0.02], [0.0, 0.3, 0.02], [0.02, 0.56, 0.02], [0.05, 0.74, 0.02]], [[0.006, 0.02], [0.006, 0.02], [0.005, 0.018], [0.002, 0.006]], '#e8ecf0', { sides: 4 }); zcyl(mb, 0, 0.035, 0.012, 0.04, 0.04, 0.016, GOLD, 10); bx(mb, 0, -0.06, 0.02, 0.03, 0.16, 0.03, L.g2 || '#8a2a2a'); },
    excalibur(mb, L, g) { const gd = L.g2 || GOLD; bx(mb, 0, 0.32, 0.02, 0.08, 0.5, 0.016, '#f0f4ff'); tri(mb, [-0.04, 0.57, 0.02], [0.04, 0.57, 0.02], [0, 0.66, 0.02], '#f0f4ff'); bx(g, 0, 0.32, 0.029, 0.02, 0.48, 0.003, '#fff4c0'); [1, -1].forEach(s => bl(mb, [s * 0.03, 0.05, 0.02], [s, 0.5, 0], 0.12, 0.05, 0.02, gd, [0, 0, 1])); ball(g, 0, 0.05, 0.035, 0.022, '#60c0ff', 6); bx(mb, 0, -0.04, 0.02, 0.035, 0.12, 0.035, '#f4f0e8'); ball(mb, 0, -0.11, 0.02, 0.025, gd); },
    cleaver(mb, L) { bx(mb, 0, 0.0, 0.02, 0.035, 0.18, 0.035, '#3a2418'); pan(mb, [[-0.02, 0.08], [0.17, 0.08], [0.19, 0.38], [0.04, 0.42], [-0.02, 0.36]], 0.02, 0.022, '#9aa0a8'); bx(mb, 0.18, 0.23, 0.031, 0.012, 0.28, 0.004, '#d8dce4'); zcyl(mb, 0.13, 0.36, 0.005, 0.02, 0.02, 0.032, '#2a2a30', 8); },
    // ---- Knight
    bigshield(mb, L) { const P = [[0, 0.2], [0.15, 0.17], [0.15, 0.0], [0, -0.22], [-0.15, 0.0], [-0.15, 0.17]]; xf(mb, [0.04, 0.04, 0.1], null, () => { pan(mb, P.map(([x, y]) => [x * 1.08, y * 1.06]), -0.008, 0.016, L.g2 || STEEL); pan(mb, P, 0.006, 0.014, L.g1 || '#6a8ac0'); bx(mb, 0, 0.0, 0.016, 0.03, 0.3, 0.006, L.g2 || STEEL); bx(mb, 0, 0.05, 0.016, 0.22, 0.03, 0.006, L.g2 || STEEL); }); },
    holysword(mb, L, g) { bx(mb, 0, 0.3, 0.02, 0.07, 0.48, 0.014, '#e8ecf8'); tri(mb, [-0.035, 0.54, 0.02], [0.035, 0.54, 0.02], [0, 0.63, 0.02], '#e8ecf8'); bx(g, 0, 0.3, 0.028, 0.016, 0.46, 0.003, '#c0e0ff'); [1, -1].forEach(s => { for (let k = 0; k < 3; k++) bl(mb, [s * 0.03, 0.04, 0.02], [s, 0.25 + k * 0.3, -0.1], 0.1 - k * 0.02, 0.035, 0.01, GOLD, [0, 0, 1]); }); bx(mb, 0, -0.03, 0.02, 0.032, 0.1, 0.032, '#3a5ab0'); },
    clipboard(mb, L) { bx(mb, 0, 0.06, 0.06, 0.13, 0.17, 0.012, '#a07040'); bx(mb, 0, 0.05, 0.068, 0.11, 0.13, 0.004, WHITE); for (let k = 0; k < 4; k++) bx(mb, 0, 0.09 - k * 0.025, 0.071, 0.08, 0.006, 0.002, '#5a5a62'); bx(mb, 0, 0.145, 0.07, 0.05, 0.02, 0.016, '#b8bcc8'); },
    smoker(mb, L) { cyl(mb, 0, -0.02, 0.07, 0.04, 0.04, 0.12, '#b8b0a0', 10); cyl(mb, 0, 0.1, 0.07, 0.04, 0.012, 0.05, '#b8b0a0', 10); xf(mb, [-0.05, 0.03, 0.07], [0, 0, 0], () => bx(mb, 0, 0, 0, 0.03, 0.1, 0.06, '#7a5030')); [[0.02, 0.2, 0.07, 0.025], [0.05, 0.26, 0.06, 0.03], [0.02, 0.33, 0.05, 0.035]].forEach(([x, y, z, r]) => ball(mb, x, y, z, r, '#e8e8f0')); },
    stinger(mb, L) { cyl(mb, 0, -0.06, 0.02, 0.02, 0.02, 0.12, '#1a1a1a', 6); cyl(mb, 0, 0.06, 0.02, 0.07, 0.07, 0.03, L.g2 || '#1a1a1a', 10); [0, 1, 2, 3, 4].forEach(k => cyl(mb, 0, 0.09 + k * 0.1, 0.02, 0.05 - k * 0.01, 0.04 - k * 0.01 > 0 ? 0.04 - k * 0.01 : 0.004, 0.1, k % 2 ? (L.g2 || '#1a1a1a') : (L.g1 || '#e8b020'), 8)); },
    gunblade(mb, L) { pan(mb, [[-0.03, 0.08], [0.035, 0.08], [0.04, 0.5], [0.0, 0.58], [-0.03, 0.5]], 0.02, 0.012, '#d0d4dc'); bx(mb, 0.0, 0.3, 0.027, 0.008, 0.4, 0.004, '#3a3a44'); xf(mb, [0, 0.04, 0.02], null, () => { zcyl(mb, 0, 0, -0.03, 0.04, 0.04, 0.06, '#4a4a52', 6); bx(mb, 0, 0.0, 0.0, 0.08, 0.05, 0.05, '#3a3a40'); }); xf(mb, [0, -0.02, 0.02], [0.3, 0, 0], () => bx(mb, 0, -0.04, -0.01, 0.034, 0.1, 0.04, '#2a2018')); },
  });
  Object.assign(GRIP, {
    camera: HELD, ladle: HAFT, fryingpan: HAFT, cloche: { at: [0, 0.0, 0.06], rot: [0, 0, 0.4] }, pushbroom: POLE, mop: POLE, scroll: HELD,
    bayonet: GUN, broadsword: BLADE, buster: { at: [0, -0.02, 0.05], rot: [1.0, 0, 0.4] }, bokken: BLADE, nodachi: { at: [0, -0.02, 0.05], rot: [1.1, 0, 0.4] }, excalibur: BLADE, cleaver: HAFT,
    bigshield: { at: [0, 0.0, 0.04], rot: [0, 0, 0.4] }, holysword: BLADE, clipboard: HELD, smoker: HELD, stinger: { at: [0, -0.08, 0], rot: [0.8, 0, 0.4] }, gunblade: BLADE,
  });
  Object.assign(EXTRAS, {
    bees: { bone: 'torso', build(mb) {   // three bees buzzing round its shoulders
      [[0.36, 0.5, 0.1], [-0.38, 0.44, -0.05], [0.12, 0.62, -0.25]].forEach(([x, y, z], k) => xf(mb, [x, y, z], [0, k * 1.3, 0.3], () => { el(mb, 0, 0, 0, 0.03, 0.022, 0.04, '#f0c020', 6, 4); el(mb, 0, 0, -0.012, 0.031, 0.023, 0.012, '#1a1a1a', 6, 3); [1, -1].forEach(s => el(mb, s * 0.025, 0.025, 0, 0.025, 0.006, 0.014, '#e8f4ff', 6, 3)); }));
    } },
    beewings: { bone: 'torso', build(mb) {   // a bee's clear wings on its back
      [1, -1].forEach(s => [[0.5, 0.26], [0.15, 0.2]].forEach(([a, len]) => xf(mb, [s * 0.08, 0.34, -0.22], [0, 0, s * a], () => el(mb, s * 0.0, len / 2, -0.03, 0.06, len / 2, 0.006, '#d8ecf8', 8, 4))));
    } },
  });

  Object.assign(HATS, {
    // ---- Monk
    skullcap(mb, L) {  // the Initiate's little round skullcap
      dome(mb, 0, 0.36, -0.01, 0.17, 0.11, 0.16, L.g2 || '#8a4a20');
      lof(mb, [[0.355, 0.172, 0.162, -0.01], [0.38, 0.17, 0.16, -0.01]], sh(L.g2 || '#8a4a20', -0.2), { sides: 10 });
    },
    lotus(mb, L, g) {  // the Disciple's gold circlet and a pink lotus blooming on top
      bandOf(mb, 0.3, 0.03, L.g2 || GOLD, 0.022);
      ball(g, 0, 0.318, 0.236, 0.018, '#ff6040');
      xf(mb, [0, 0.43, 0.08], [0.35, 0, 0], () => { for (let k = 0; k < 2; k++) for (let i = 0; i < 7; i++) { const a = (i + k * 0.5) / 7 * PI * 2; bl(mb, [Math.cos(a) * 0.035, 0.0, Math.sin(a) * 0.035], [Math.cos(a) * (0.9 - k * 0.45), 1, Math.sin(a) * (0.9 - k * 0.45)], 0.13 - k * 0.025, 0.07, 0.014, k ? '#ffb0d0' : '#ff70a8', { radial: [0, 0, 0] }, k ? WHITE : '#ffd0e4'); } ball(mb, 0, 0.03, 0, 0.032, '#ffe060'); });
    },
    whitemonk(mb, L) { // the White Monk's white cloth hood with a red trim and a gold disc on its brow
      hood(mb, L.g1 || '#dde2ee', 0.5);
      lof(mb, [hed(0.03, 0.04), hed(0.1, 0.045)], L.g2 || '#c03030', { arc: OPEN });
      bandOf(mb, 0.3, 0.028, L.g2 || '#c03030', 0.044, { arc: [PI * 0.2, PI * 0.8] });
      xf(mb, [0, 0.33, 0.25], [-0.2, 0, 0], () => zcyl(mb, 0, 0, -0.006, 0.03, 0.03, 0.012, GOLD, 10));
    },
    chonmage(mb, L) {  // the sumo's oiled black hair, its folded topknot fanned on top
      const c = '#18161c';
      hairOf(mb, c, 0.44, true);
      sw(mb, [[0, 0.43, -0.14], [0, 0.48, -0.06], [0, 0.49, 0.06]], [0.035, 0.03, 0.025], c);
      xf(mb, [0, 0.49, 0.08], [0.3, 0, 0], () => pan(mb, [[-0.07, 0.0], [0.07, 0.0], [0.04, 0.05], [-0.04, 0.05]].map(([x, y]) => [x, y]), 0, 0.02, c));
    },
    sweatband(mb, L) { // the Wrestler's terry-cloth headband with a stripe
      bandOf(mb, 0.27, 0.07, WHITE, 0.026);
      bandOf(mb, 0.295, 0.02, L.g1 || '#2a4ab0', 0.03);
    },
    luchamask(mb, L) { // the Luchador's full mask: gold-rimmed eyes, flames on the brow, laces behind
      const c = L.g1 || '#d02040', gd = L.g2 || '#f0c030';
      lof(mb, [hed(-0.01, 0.016), hed(0.05, 0.018), hed(0.2, 0.02), hed(0.34, 0.018), [0.42, 0.15, 0.15], [0.46, 0.05, 0.05], [0.465, 0.001]], c, { sides: 12 });
      [1, -1].forEach(s => { xf(mb, [s * 0.075, 0.245, 0.236], [0, s * 0.3, s * -0.35], () => { el(mb, 0, 0, 0, 0.06, 0.035, 0.012, gd, 8, 4); el(mb, 0, 0, 0.008, 0.045, 0.024, 0.008, WHITE, 8, 4); el(mb, 0, 0, 0.012, 0.02, 0.018, 0.006, '#141418', 6, 3); }); });
      [[-0.1, 0.3], [0, 0.32], [0.1, 0.3]].forEach(([x, y], k) => bl(mb, [x, y, 0.22], [x * 2, 1, 0.3], 0.12 + (k === 1 ? 0.04 : 0), 0.06, 0.01, gd, [0, 0, 1]));
      el(mb, 0, 0.12, 0.222, 0.05, 0.03, 0.012, sh(c, -0.25), 8, 4);
      [0.2, 0.26, 0.32].forEach(y => bx(mb, 0, y, -0.226, 0.07, 0.01, 0.01, WHITE));
    },
    plaster(mb, L) {   // the Brawler's bandage round its head, a crossed plaster on its brow
      xf(mb, [0, 0.31, 0], [0, 0, 0.12], () => lof(mb, [hed(0, 0.02), hed(0.05, 0.02)].map(r => (r[0] = r[0], r)), WHITE, { sides: 12 }));
      [0.6, -0.6].forEach(r => xf(mb, [0.1, 0.36, 0.2], [-0.55, 0, r], () => { bx(mb, 0, 0, 0, 0.14, 0.04, 0.008, '#f0c8a0'); bx(mb, 0, 0, 0.005, 0.04, 0.03, 0.004, '#d8a888'); }));
      [1, -1].forEach(s => bl(mb, [-0.18, 0.31, -0.12], [-0.4, -0.5 * s, -1], 0.1, 0.04, 0.01, WHITE, [0, 1, 0]));
    },
    lanistahelm(mb, L) { // the Lanista's bronze gladiator helm: a wide brim, a grilled visor and a crest
      const b = L.g2 || '#c8a040';
      dome(mb, 0, 0.28, 0, 0.245, 0.22, 0.235, b);
      brim(mb, 0.29, 0.22, 0.33, sh(b, -0.1), (a) => (Math.sin(a) > 0 ? 0.03 : -0.04));
      for (let i = -3; i <= 3; i++) sw(mb, [[i * 0.035, 0.29, 0.25], [i * 0.035, 0.08, 0.235]], 0.007, sh(b, -0.25), { sides: 4 });
      sw(mb, [[-0.13, 0.2, 0.22], [0, 0.2, 0.26], [0.13, 0.2, 0.22]], 0.007, sh(b, -0.25), { sides: 4 });
      pan(mb, [[0.22, 0.42], [0.1, 0.62], [-0.1, 0.64], [-0.26, 0.48], [-0.2, 0.42]].map(([z, y]) => [z, y]), 0, 0.02, L.g1 || '#8a5a30');
    },
    // ---- Thief
    newsboy(mb, L) {   // the Pickpocket's tweed newsboy cap, pulled low, a button on top
      const c = L.g1 || '#6a5a4a', tw = (i) => (i % 2 ? c : sh(c, -0.08));
      lof(mb, [hed(0.29, 0.014, tw), [0.36, 0.25, 0.25, 0.03, 0, tw], [0.42, 0.22, 0.22, 0.04], [0.44, 0.001, 0.001, 0.04]], c, { sides: 12 });
      el(mb, 0, 0.3, 0.21, 0.14, 0.014, 0.09, sh(c, -0.18), 8, 4); ball(mb, 0, 0.44, 0.04, 0.02, sh(c, -0.18));
    },
    catmask(mb, L) {   // the Cat Burglar's black hood with cat ears and a mask round its eyes
      const c = L.g1 || '#1a1a22';
      dome(mb, 0, 0.27, 0, 0.24, 0.21, 0.23, c);
      lof(mb, [hed(0.2, 0.022), hed(0.28, 0.02)], c, { arc: [PI * 0.1, PI * 0.9] });
      [1, -1].forEach(s => el(mb, s * 0.075, 0.24, 0.24, 0.034, 0.016, 0.005, '#f0e8a0', 6, 3));
      [1, -1].forEach(s => { bl(mb, [s * 0.12, 0.43, 0.02], [s * 0.4, 1, 0.1], 0.16, 0.13, 0.03, c, [0, 0, 1]); bl(mb, [s * 0.12, 0.43, 0.034], [s * 0.4, 1, 0.1], 0.1, 0.07, 0.01, '#e890a8', [0, 0, 1]); });
    },
    disguise(mb, L) {  // the Spy's trilby and its disguise: big glasses, a false nose and a bushy mustache
      const c = L.g1 || '#b8a070';
      xf(mb, [0, 0.33, 0], [0.06, 0, 0], () => cyl(mb, 0, 0, 0, 0.3, 0.29, 0.016, sh(c, -0.1), 14));
      lof(mb, [hed(0.32, 0.014), [0.43, 0.19, 0.18], [0.47, 0.13, 0.1], [0.465, 0.001, 0.001]], c);
      bandOf(mb, 0.33, 0.035, '#3a2a1a', 0.02);
      [1, -1].forEach(s => sw(mb, loop(s * 0.075, 0.245, 0.24, 0.042, 10, 'xy'), 0.009, '#141418', { sides: 4 }));
      sw(mb, [[-0.03, 0.25, 0.245], [0, 0.26, 0.25], [0.03, 0.25, 0.245]], 0.008, '#141418', { sides: 4 });
      el(mb, 0, 0.18, 0.25, 0.04, 0.04, 0.035, '#f0b0a0', 8, 4);
      [1, -1].forEach(s => el(mb, s * 0.045, 0.135, 0.235, 0.05, 0.022, 0.02, '#3a2a1a', 8, 4));
    },
    earpiece(mb, L) {  // the Agent's slicked-back hair, dark glasses and a coiled earpiece
      const c = '#1a1a20';
      hairOf(mb, c, 0.45, true);
      shadesOf(mb, '#0a0a10', 0.05, 0.03);
      ball(mb, 0.215, 0.2, 0.06, 0.02, '#2a2a30');
      sw(mb, [[0.215, 0.19, 0.06], [0.22, 0.12, 0.05], [0.2, 0.05, 0.02], [0.16, -0.02, -0.02]], 0.005, '#c8ccd4', { sides: 3 });
    },
    reno(mb, L, g) {   // the Turk's spiky red hair in a long tail, goggles up on its brow
      const c = '#c83020', d = sh(c, -0.12);
      hairOf(mb, c, 0.46);
      for (let k = 0; k < 6; k++) { const a = PI * 0.3 + k * PI * 0.4 / 5; bl(mb, [Math.cos(a) * 0.2, 0.4, Math.sin(a) * 0.18], [Math.cos(a), 0.7, Math.sin(a) * 0.6], 0.12, 0.07, 0.025, k % 2 ? d : c, null); }
      sw(mb, [[0, 0.3, -0.22], [0, 0.16, -0.27], [0.01, 0.0, -0.28], [0.02, -0.12, -0.24]], [0.04, 0.035, 0.025, 0.006], c);
      bandOf(mb, 0.34, 0.025, '#2a2a30', 0.03);
      [1, -1].forEach(s => { zcyl(mb, s * 0.075, 0.37, 0.16, 0.045, 0.045, 0.07, '#5a5a62', 8); el(g, s * 0.075, 0.37, 0.232, 0.036, 0.036, 0.006, '#80e0ff', 8, 4); });
    },
    // ---- Dragoon
    wyvernhood(mb, L) { // the Wyvern Keeper's hood made like a wyvern's head: eyes, little horns, a row of teeth
      const c = L.g1 || '#4a8a5a';
      hood(mb, c, 0.52);
      el(mb, 0, 0.4, 0.14, 0.17, 0.06, 0.12, sh(c, 0.08), 8, 4);
      [1, -1].forEach(s => { ball(mb, s * 0.09, 0.45, 0.18, 0.03, '#f0e070'); ball(mb, s * 0.09, 0.455, 0.205, 0.012, '#141418', 4); spk(mb, [s * 0.1, 0.47, 0.0], [s * 0.3, 1, -0.6], 0.09, 0.025, IVORY, 4); });
      for (let i = -3; i <= 3; i++) spk(mb, [i * 0.04, 0.35, 0.25 - Math.abs(i) * 0.012], [0, -1, 0.2], 0.035, 0.012, WHITE, 3);
    },
    dkhorns(mb, L, g) { // the Dragonkin's swept horns, a crest of white hair and a gold gem
      const c = '#f4f2ee';
      hairOf(mb, c, 0.45);
      for (let k = 0; k < 5; k++) bl(mb, [(k - 2) * 0.05, 0.42, 0.02 - Math.abs(k - 2) * 0.03], [(k - 2) * 0.3, 0.6, -1], 0.17, 0.07, 0.03, k % 2 ? c : sh(c, -0.06), null);
      [1, -1].forEach(s => curve(mb, [[s * 0.15, 0.38, 0.06], [s * 0.24, 0.45, -0.04], [s * 0.28, 0.5, -0.18], [s * 0.26, 0.56, -0.3]], 0.04, 0.005, L.g2 || GOLD));
      ball(g, 0, 0.33, 0.238, 0.022, '#60c0ff', 6);
    },
    falconcap(mb, L) { // the Falconer's leather cap, a crest of brown feathers sweeping back
      const c = L.g1 || '#6a4a2a';
      lof(mb, [hed(0.27, 0.016), [0.38, 0.235, 0.225], [0.44, 0.15, 0.145], [0.465, 0.001]], c, { sides: 12 });
      el(mb, 0, 0.3, 0.2, 0.14, 0.014, 0.09, sh(c, -0.2), 8, 4);
      for (let k = 0; k < 5; k++) bl(mb, [0, 0.45 - k * 0.02, 0.06 - k * 0.06], [0, 0.5, -1], 0.18 - k * 0.015, 0.05, 0.02, k % 2 ? '#8a5a30' : '#d8c8a0', [1, 0, 0], '#3a2a1a');
    },
    raptorhelm(mb, L, g) { // the Raptor's eagle helm: a hooked beak over its brow, feathers swept back
      const c = L.g1 || '#7a5030';
      dome(mb, 0, 0.29, 0, 0.24, 0.2, 0.23, c);
      lof(mb, [hed(0.14, 0.03), hed(0.29, 0.024)], c, { arc: [PI * 0.75, PI * 2.25] });
      sw(mb, [[0, 0.44, 0.12], [0, 0.45, 0.26], [0, 0.4, 0.36], [0, 0.31, 0.37], [0, 0.27, 0.33]], [[0.075, 0.06], [0.065, 0.055], [0.045, 0.04], [0.02, 0.018], [0.004, 0.004]], L.g2 || '#e8c040');
      [1, -1].forEach(s => { el(mb, s * 0.09, 0.42, 0.2, 0.035, 0.025, 0.02, WHITE, 6, 3); ball(g, s * 0.1, 0.42, 0.215, 0.012, '#ffb020', 4); for (let k = 0; k < 4; k++) bl(mb, [s * 0.2, 0.36 - k * 0.05, -0.04], [s * 0.4, 0.1, -1], 0.18, 0.06, 0.015, k % 2 ? WHITE : sh(c, 0.1), [0, 1, 0]); });
    },
    sportvisor(mb, L) { // the Hurdler's sun visor and a sweatband
      const c = L.g1 || '#e04040';
      bandOf(mb, 0.28, 0.05, c, 0.022);
      el(mb, 0, 0.3, 0.21, 0.17, 0.014, 0.12, sh(c, 0.1), 8, 4);
    },
    winghead(mb, L) {  // the Pole Vaulter's headband with a little white wing at each side
      bandOf(mb, 0.28, 0.04, L.g2 || '#ffd040', 0.022);
      [1, -1].forEach(s => { for (let k = 0; k < 4; k++) bl(mb, [s * 0.235, 0.31, -0.02], [s * 0.5, 0.9 - k * 0.32, -0.7], 0.2 - k * 0.03, 0.07, 0.012, k % 2 ? '#dfe6f2' : WHITE, [0, 0, 1], '#c8d4ea'); });
    },
    earmuffs(mb, L) {  // the Sledder's fluffy earmuffs on a band over the top
      sw(mb, [[-0.22, 0.24, 0], [-0.17, 0.4, 0], [0, 0.48, 0], [0.17, 0.4, 0], [0.22, 0.24, 0]], 0.014, L.g1 || '#e04040', { sides: 5 });
      [1, -1].forEach(s => el(mb, s * 0.235, 0.24, 0, 0.055, 0.08, 0.08, '#ff90b0', 8, 5));
    },
    boarderhat(mb, L, g) { // the Snowboarder's beanie with its goggles strapped on
      const c = L.g1 || '#3a8ad0', rib = (i) => (i % 2 ? c : sh(c, -0.1));
      lof(mb, [hed(0.27, 0.02, rib), [0.4, 0.235, 0.225], [0.46, 0.15, 0.14], [0.47, 0.001]], c, { sides: 12 });
      bandOf(mb, 0.33, 0.04, '#2a2a30', 0.028);
      xf2(mb, g, [0, 0.35, 0.235], [-0.2, 0, 0], () => { bx(mb, 0, 0, 0, 0.22, 0.075, 0.03, '#2a2a30'); bx(g, 0, 0, 0.016, 0.19, 0.055, 0.006, L.g2 || '#f0a020'); });
    },
  });
  Object.assign(BODIES, {
    // ---- Monk
    monkrobe(mb, L) {  // a saffron robe, its skirt to the knee and a cloth sash over one shoulder
      const c = L.g1 || '#e88a20';
      lof(mb, [tor(0.1, 0.014), tor(0.0, 0.02), [-0.08, 0.28, 0.27], [-0.14, 0.31, 0.3]], c, { sides: 12 });
      sw(mb, [[-0.24, 0.02, 0.14], [-0.17, 0.12, 0.22], [-0.06, 0.24, 0.235], [0.08, 0.34, 0.19], [0.18, 0.4, 0.06], [0.12, 0.38, -0.14], [-0.05, 0.26, -0.24], [-0.2, 0.12, -0.18]], 0.035, sh(c, -0.1), { sides: 5 });
      lof(mb, [tor(0.06, 0.016), tor(0.1, 0.018)], L.g2 || '#8a4a20');
    },
    whitegi(mb, L) {   // the White Monk's pale gi, its lapels crossed, a red belt tied at the front
      const c = L.g1 || '#dde2ee', r = L.g2 || '#c03030';
      lof(mb, [tor(0.37, 0.016), tor(0.26, 0.018), tor(0.12, 0.014), tor(0.02, 0.016), [-0.1, 0.27, 0.26]], c, { sides: 12 });
      [1, -1].forEach(s => sw(mb, [[s * 0.11, 0.38, 0.13], [s * 0.07, 0.26, 0.23], [-s * 0.05, 0.06, 0.26]], 0.018, r, { sides: 4 }));
      lof(mb, [tor(0.02, 0.026), tor(0.065, 0.028)], r);
      [1, -1].forEach(s => bl(mb, [s * 0.03, 0.04, 0.27], [s * 0.3, -1, 0.15], 0.12, 0.035, 0.01, r, [1, 0, 0]));
    },
    mawashi(mb, L) {   // the sumo's heavy belt wrapped round the hips, its fringe of cords in front
      const c = L.g1 || '#3a3a6a';
      lof(mb, [[-0.1, 0.17, 0.16], tor(-0.04, 0.022), tor(0.05, 0.022)], c, { sides: 12 });
      lof(mb, [tor(0.0, 0.026), tor(0.03, 0.026)], sh(c, -0.2));
      for (let i = -3; i <= 3; i++) { const x = i * 0.035, r = tor(-0.02, 0.026); sw(mb, [[x, -0.02, Math.sqrt(1 - x * x / (r[1] * r[1])) * r[2]], [x * 1.05, -0.12, Math.sqrt(1 - x * x / (r[1] * r[1])) * r[2] + 0.02]], 0.01, sh(c, 0.1), { sides: 4 }); }
    },
    tsuna(mb, L) {     // the Yokozuna's belt and its great white rope, paper zigzags hanging in front
      BODIES.mawashi(mb, L);
      const R = (y) => tor(y, 0.07);
      for (let i = 0; i < 2; i++) sw(mb, loop(0, 0.07 + i * 0.012, 0, R(0.07)[1] + 0.01, 20, 'xz', R(0.07)[2] + 0.01).map(p => [p[0], p[1] + Math.sin(Math.atan2(p[2], p[0]) * 6 + i * 2) * 0.008, p[2]]), 0.032 - i * 0.008, i ? '#e8e4d8' : WHITE, { sides: 6 });
      [-0.12, 0, 0.12].forEach(x => { const z = Math.sqrt(1 - x * x / (R(0.07)[1] * R(0.07)[1])) * (R(0.07)[2] + 0.03); [0, 1, 2].forEach(k => xf(mb, [x + (k % 2 ? 0.015 : -0.015), 0.04 - k * 0.04, z], null, () => bx(mb, 0, 0, 0, 0.03, 0.04, 0.006, WHITE))); });
    },
    singlet(mb, L) {   // the Wrestler's one-piece singlet with its straps over the shoulders
      const c = L.g1 || '#2a4ab0';
      lof(mb, [[-0.11, 0.2, 0.19], tor(-0.04, 0.016), tor(0.1, 0.014), tor(0.24, 0.016)], c, { sides: 12 });
      lof(mb, [tor(0.24, 0.016), tor(0.32, 0.016)], c, { arc: [PI * 0.62, PI * 1.38] });
      [1, -1].forEach(s => sw(mb, [[s * 0.14, 0.24, 0.2], [s * 0.15, 0.36, 0.12], [s * 0.14, 0.4, 0.0], [s * 0.14, 0.34, -0.15], [s * 0.15, 0.24, -0.2]], 0.02, c, { sides: 4 }));
      [1, -1].forEach(s => lof(mb, [tor(-0.04 + s * 0.0, 0.02), tor(-0.02, 0.02)], L.g2 || '#e8e8e8', { arc: s > 0 ? [-PI * 0.4, PI * 0.4] : [PI * 0.6, PI * 1.4] }));
    },
    luchacape(mb, L, g) { // the Luchador's short cape, its tights and a gold title belt
      const c = L.g1 || '#d02040', gd = L.g2 || '#f0c030';
      capeOf(mb, c, -0.02, 0.03);
      lof(mb, [tor(0.36, 0.02), [0.45, 0.23, 0.22, -0.02]], gd, { arc: [PI * 0.85, PI * 2.15] });
      lof(mb, [[-0.11, 0.2, 0.19], tor(-0.04, 0.016), tor(0.02, 0.016)], sh(c, -0.25), { sides: 12 });
      lof(mb, [tor(0.0, 0.026), tor(0.06, 0.028)], gd);
      el(mb, 0, 0.03, 0.262, 0.08, 0.05, 0.016, gd, 8, 4); ball(g, 0, 0.03, 0.276, 0.022, '#ff4060', 6);
    },
    tanktop(mb, L) {   // the Brawler's tank top and baggy black shorts
      const c = L.g2 || '#d84a2a';
      lof(mb, [tor(0.04, 0.016), tor(0.14, 0.014), tor(0.26, 0.016)], c, { sides: 12 });
      [1, -1].forEach(s => sw(mb, [[s * 0.12, 0.26, 0.21], [s * 0.13, 0.37, 0.12], [s * 0.13, 0.4, 0.0], [s * 0.13, 0.36, -0.13], [s * 0.12, 0.26, -0.21]], 0.022, c, { sides: 4 }));
      lof(mb, [[-0.12, 0.22, 0.21], tor(-0.03, 0.03), tor(0.05, 0.022)], L.g1 || '#3a3a3a', { sides: 12 });
    },
    harness(mb, L) {   // the Lanista's crossed leather straps, a bronze boss, and a skirt of leather strips
      const c = L.g1 || '#8a5a30', b = L.g2 || '#c8a040';
      [1, -1].forEach(s => sw(mb, [[s * 0.16, 0.4, -0.06], [s * 0.15, 0.37, 0.13], [s * 0.04, 0.3, 0.236], [-s * 0.14, 0.18, 0.23], [-s * 0.24, 0.06, 0.12]], 0.02, c, { sides: 4 }));
      ball(mb, 0, 0.3, 0.245, 0.03, b);
      lof(mb, [tor(0.0, 0.016), tor(0.06, 0.018)], sh(c, -0.15));
      for (let i = 0; i < 14; i++) { const a = i / 14 * PI * 2, r = tor(0.0, 0.02); bl(mb, [Math.cos(a) * r[1], 0.0, Math.sin(a) * r[2]], [Math.cos(a) * 0.2, -1, Math.sin(a) * 0.2], 0.12, 0.06, 0.012, i % 2 ? c : sh(c, -0.1), { radial: [0, 0, 0] }, b); }
      [1, -1].forEach(s => el(mb, s * 0.22, 0.36, 0.02, 0.1, 0.05, 0.1, b, 8, 4));
    },
    // ---- Thief
    catsuit(mb, L) {   // the Cat Burglar's black suit, a long cat tail and a loot sack on its back
      const c = L.g1 || '#1a1a22';
      lof(mb, [[-0.1, 0.2, 0.19], tor(0.0, 0.016), tor(0.12, 0.014), tor(0.26, 0.016), tor(0.37, 0.016)], c, { sides: 12 });
      curve(mb, [[0, 0.0, -0.22], [0.06, -0.05, -0.34], [0.14, 0.04, -0.42], [0.16, 0.2, -0.4], [0.1, 0.28, -0.36]], 0.035, 0.012, c);
      el(mb, -0.06, 0.24, -0.33, 0.13, 0.15, 0.1, '#8a7a5a', 8, 5); sw(mb, [[-0.12, 0.38, -0.3], [-0.06, 0.4, -0.3], [0.0, 0.38, -0.3]], 0.015, '#5a4a30', { sides: 4 });
      sw(mb, [[-0.2, 0.36, 0.1], [-0.05, 0.31, 0.23], [0.15, 0.2, 0.22], [0.2, 0.05, 0.1]], 0.012, '#5a4a30', { sides: 4 });
    },
    trench(mb, L) {    // the Spy's long trench coat, belted, its collar turned up
      const c = L.g1 || '#b8a070';
      lof(mb, [tor(0.37, 0.02), tor(0.26, 0.022), tor(0.12, 0.024), tor(0.0, 0.026), [-0.12, 0.3, 0.29], [-0.17, 0.32, 0.31]], c, { arc: OPEN, sides: 12 });
      lof(mb, [tor(0.36, 0.024), [0.47, 0.23, 0.22, -0.02]], sh(c, -0.08), { arc: [PI * 0.66, PI * 2.34] });
      lof(mb, [tor(0.02, 0.03), tor(0.06, 0.032)], sh(c, -0.25), { arc: OPEN });
      [1, -1].forEach(s => { [0.26, 0.12].forEach(y => { const r = tor(y, 0.03); ball(mb, s * r[1] * 0.42, y, r[2] * 0.9, 0.014, '#3a2a1a', 4); }); });
    },
    suit(mb, L) {      // a sharp suit jacket, open over a white shirt; a slim tie if the job wears one
      const c = L.g1 || '#1a1a22';
      lof(mb, [tor(0.37, 0.018), tor(0.26, 0.02), tor(0.12, 0.022), tor(0.0, 0.024), [-0.07, 0.27, 0.26]], c, { arc: [PI * 0.6, PI * 2.4], sides: 12 });
      [1, -1].forEach(s => tri(mb, [s * 0.1, 0.38, 0.17], [s * 0.04, 0.2, 0.26], [s * 0.15, 0.27, 0.22], sh(c, 0.12)));
      [1, -1].forEach(s => tri(mb, [0, 0.39, 0.16], [s * 0.07, 0.4, 0.13], [s * 0.04, 0.33, 0.21], WHITE));
      if (L.tie) { const r = tor(0.3, 0.02); sw(mb, [[0, 0.37, 0.19], [0, 0.3, r[2] + 0.004], [0, 0.23, tor(0.23, 0.02)[2] + 0.004]], [[0.018, 0.006], [0.022, 0.006], [0.004, 0.004]], L.tie, { sides: 4 }); }
      else { [1, -1].forEach(s => bl(mb, [s * 0.02, 0.06, 0.25], [s * 0.2, -1, 0.3], 0.12, 0.07, 0.01, WHITE, [1, 0, 0])); }
    },
    // ---- Dragoon
    featherarmor(mb, L) { // the Raptor's feathered mantle: rows of long feathers over the shoulders and back
      const c = L.g1 || '#7a5030';
      [0.4, 0.33, 0.26].forEach((y, k) => { const r = tor(y, 0.025); for (let i = 0; i < 16; i++) { const a = (i + k * 0.5) / 16 * PI * 2; if (Math.sin(a) > 0.45) continue; bl(mb, [Math.cos(a) * r[1], y, Math.sin(a) * r[2]], [Math.cos(a) * 0.4, -1, Math.sin(a) * 0.4], 0.16, 0.07, 0.015, (i + k) % 2 ? c : sh(c, 0.12), { radial: [0, y, 0] }, k === 2 ? WHITE : null); } });
      lof(mb, [tor(0.0, 0.018), tor(0.05, 0.02)], L.g2 || '#e8c040');
    },
    jersey(mb, L) {    // an athlete's running vest with a number on the back, and shorts
      const c = L.g1 || '#e04040', w = L.g2 || '#f0f0f0';
      lof(mb, [tor(0.06, 0.016), tor(0.14, 0.014), tor(0.26, 0.016)], c, { sides: 12 });
      lof(mb, [tor(0.26, 0.016), tor(0.33, 0.016)], c, { arc: [PI * 0.62, PI * 1.38] }); lof(mb, [tor(0.26, 0.016), tor(0.33, 0.016)], c, { arc: [-PI * 0.38, PI * 0.38] });
      lof(mb, [tor(0.26, 0.016), tor(0.36, 0.016)], c, { arc: [PI * 1.15, PI * 1.85] });
      xf(mb, [0, 0.18, -0.265], null, () => { bx(mb, 0, 0, 0, 0.16, 0.12, 0.008, w); bx(mb, 0, 0.035, -0.006, 0.07, 0.016, 0.006, '#141418'); xf(mb, [0.0, -0.005, -0.006], [0, 0, -0.45], () => bx(mb, 0, 0, 0, 0.016, 0.085, 0.006, '#141418')); });
      lof(mb, [[-0.12, 0.22, 0.21], tor(-0.02, 0.022), tor(0.06, 0.018)], w, { sides: 12 });
      lof(mb, [tor(0.03, 0.022), tor(0.06, 0.022)], c, { sides: 12 });
    },
    hoodie(mb, L) {    // the Snowboarder's baggy hoodie, its hood down, a front pocket
      const c = L.g1 || '#3a8ad0';
      lof(mb, [tor(0.37, 0.02), tor(0.26, 0.024), tor(0.13, 0.02), tor(0.0, 0.028), [-0.1, 0.27, 0.26]], c, { sides: 12 });
      lof(mb, [[0.3, 0.2, 0.2, -0.14], [0.42, 0.24, 0.2, -0.16], [0.46, 0.16, 0.12, -0.2]], sh(c, -0.1), { arc: [PI * 1.1, PI * 1.9] });
      const r = tor(0.04, 0.03); pan(mb, [[-0.12, 0.09], [0.12, 0.09], [0.15, -0.03], [-0.15, -0.03]], r[2] + 0.002, 0.01, sh(c, -0.14));
      [1, -1].forEach(s => sw(mb, [[s * 0.04, 0.38, 0.19], [s * 0.05, 0.3, 0.24]], 0.006, WHITE, { sides: 3 }));
    },
  });
  Object.assign(WEAPONS, {
    // ---- Monk
    quarterstaff(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.018, 0.018, 0.7, '#a07040', 6); [0.0, 0.58].forEach(y => cyl(mb, 0, y, 0.02, 0.021, 0.021, 0.04, L.g2 || '#8a4a20', 6)); },
    ringstaff(mb, L) { const gd = L.g2 || GOLD; cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.62, '#3a2418', 6); sw(mb, loop(0, 0.6, 0.02, 0.06, 12, 'xy', 0.07), 0.012, gd, { sides: 4 }); [1, -1].forEach(s => sw(mb, loop(s * 0.055, 0.56, 0.02, 0.022, 8, 'xy'), 0.006, gd, { sides: 4 })); spk(mb, [0, 0.66, 0.02], [0, 1, 0], 0.05, 0.015, gd, 4); },
    handwraps(mb, L, g, y0 = 0.0) { ball(mb, 0, y0, 0.015, 0.068, L.weapon === 'handwraps' && L.hat === 'whitemonk' ? WHITE : WHITE, 8); [0.03, 0.06].forEach(d => lof(mb, [[y0 + d, 0.06, 0.06], [y0 + d + 0.018, 0.062, 0.062]], '#d8d0c0', { sides: 8 })); if (L.glow) sw(g, loop(0, y0, 0.015, 0.075, 12, 'xz'), 0.008, L.glow, { sides: 4 }); },
    cestus(mb, L, g, y0 = 0.0) { ball(mb, 0, y0, 0.015, 0.072, L.g1 || '#8a5a30', 8); lof(mb, [[y0 + 0.04, 0.064, 0.064], [y0 + 0.1, 0.068, 0.068]], sh(L.g1 || '#8a5a30', -0.15), { sides: 8 }); for (let i = 0; i < 4; i++) spk(mb, [(i - 1.5) * 0.03, y0 - 0.05, 0.05], [0, -0.6, 1], 0.04, 0.012, L.g2 || '#c8a040', 4); },
    // ---- Thief
    coinpurse(mb, L) { el(mb, 0, -0.04, 0.05, 0.06, 0.07, 0.06, '#7a5a3a', 8, 5); sw(mb, [[0, 0.03, 0.05], [0, 0.07, 0.05]], 0.018, '#7a5a3a'); sw(mb, loop(0, 0.03, 0.05, 0.022, 8, 'xz'), 0.006, '#e8c040', { sides: 3 }); xf(mb, [0.05, 0.06, 0.06], [0.3, 0, 0.5], () => zcyl(mb, 0, 0, -0.005, 0.03, 0.03, 0.01, GOLD, 10)); },
    grapple(mb, L) { for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2; sw(mb, [[0, 0.06, 0.05], [Math.cos(a) * 0.04, 0.1, 0.05 + Math.sin(a) * 0.04], [Math.cos(a) * 0.06, 0.06, 0.05 + Math.sin(a) * 0.06]], [0.012, 0.01, 0.004], '#9aa0a8'); } cyl(mb, 0, -0.02, 0.05, 0.014, 0.014, 0.1, '#9aa0a8', 6); for (let k = 0; k < 3; k++) sw(mb, loop(0, -0.04 - k * 0.025, 0.05, 0.06, 10, 'xz'), 0.01, '#c8b080', { sides: 4 }); },
    newspaper(mb, L) { xf(mb, [0, 0.1, 0.07], [0, 0, 0.1], () => { pan(mb, [[-0.11, -0.08], [0.11, -0.08], [0.11, 0.08], [-0.11, 0.08]], 0, 0.006, '#e8e4d8'); for (let k = 0; k < 5; k++) bx(mb, -0.04 + (k % 2) * 0.08, 0.05 - k * 0.025, 0.004, 0.08, 0.008, 0.002, '#6a6a70'); bx(mb, 0, 0.065, 0.004, 0.18, 0.02, 0.002, '#2a2a30'); [1, -1].forEach(s => el(mb, s * 0.035, 0.02, 0.004, 0.014, 0.01, 0.003, '#141418', 6, 3)); }); },
    briefcase(mb, L) { bx(mb, 0, -0.06, 0.04, 0.17, 0.12, 0.05, '#1a1a20'); bx(mb, 0, -0.06, 0.066, 0.17, 0.004, 0.004, '#3a3a40'); sw(mb, [[-0.03, 0.0, 0.04], [-0.02, 0.03, 0.04], [0.02, 0.03, 0.04], [0.03, 0.0, 0.04]], 0.008, '#3a3a40', { sides: 4 }); [1, -1].forEach(s => bx(mb, s * 0.05, -0.005, 0.068, 0.02, 0.014, 0.006, GOLD)); },
    emrod(mb, L, g) { cyl(mb, 0, -0.04, 0.02, 0.018, 0.018, 0.1, '#2a2a30', 6); [0, 1, 2].forEach(k => cyl(mb, 0, 0.06 + k * 0.1, 0.02, 0.014 - k * 0.002, 0.013 - k * 0.002, 0.1, '#9aa0a8', 6)); ball(g, 0, 0.37, 0.02, 0.022, '#60e0ff', 6); [0, 1, 2].forEach(k => { const a = k * 2.1; bl(g, [0, 0.37, 0.02], [Math.cos(a), 0.4, Math.sin(a)], 0.05, 0.01, 0.004, '#c0f0ff', [0, 1, 0]); }); },
    // ---- Dragoon
    feedpole(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.014, 0.014, 0.66, '#8a6a3a', 6); sw(mb, [[0, 0.58, 0.02], [0.06, 0.6, 0.06], [0.1, 0.52, 0.08]], 0.006, '#c8b080', { sides: 3 }); xf(mb, [0.1, 0.46, 0.08], [0.3, 0, 0.4], () => { el(mb, 0, 0, 0, 0.05, 0.07, 0.05, '#a0502a', 8, 5); cyl(mb, 0, 0.05, 0, 0.012, 0.012, 0.06, IVORY, 6); ball(mb, 0, 0.115, 0, 0.02, IVORY, 6); }); },
    gauntlet(mb, L) { ball(mb, 0, 0.0, 0.015, 0.075, L.g1 || '#6a4a2a', 8); lof(mb, [[0.03, 0.07, 0.07], [0.1, 0.085, 0.085]], sh(L.g1 || '#6a4a2a', 0.15), { sides: 8 }); },
    relaybaton(mb, L) { zcyl(mb, 0, 0.02, -0.06, 0.022, 0.022, 0.16, L.g2 === '#f0f0f0' ? '#f0d040' : '#f0d040', 8); },
    vaultpole(mb, L) { sw(mb, mb.curvePts([[0, -0.36, 0.02], [0.02, 0.1, 0.04], [0.06, 0.5, 0.08], [0.12, 0.84, 0.1]], 3).map(p => p.map(v => v / T)), 0.014, '#3a7ad0', { sides: 5 }); [-0.36, 0.84].forEach((y, k) => ball(mb, k ? 0.12 : 0, y, k ? 0.1 : 0.02, 0.02, L.g2 || '#ffd040')); },
    sled(mb, L) { xf(mb, [0, -0.12, 0.06], [0.1, 0, 0], () => { bx(mb, 0, 0, 0, 0.14, 0.34, 0.02, '#a0602a'); [1, -1].forEach(s => sw(mb, [[s * 0.06, -0.17, -0.03], [s * 0.06, 0.15, -0.03], [s * 0.06, 0.22, 0.0], [s * 0.06, 0.2, 0.04]], 0.01, L.g1 || '#e04040', { sides: 4 })); sw(mb, [[-0.05, 0.16, 0.02], [0, 0.26, 0.04], [0.05, 0.16, 0.02]], 0.004, '#e8e0c8', { sides: 3 }); }); },
    snowboard(mb, L, g) { xf(mb, [0, -0.06, 0.07], [0, 0, 0.12], () => { mb.rbox(0, 0, 0, 0.16 * T, 0.62 * T, 0.02 * T, L.g1 || '#3a8ad0', 0.5); bx(mb, 0, 0.0, 0.011, 0.04, 0.5, 0.004, L.g2 || '#f0a020'); [-0.12, 0.12].forEach(y => bx(mb, 0, y, -0.016, 0.1, 0.04, 0.02, '#2a2a30')); }); },
  });
  Object.assign(GRIP, {
    quarterstaff: POLE, ringstaff: STAFF, handwraps: FIST, cestus: FIST,
    coinpurse: HELD, grapple: HELD, newspaper: HELD, briefcase: { at: [0, 0.0, 0.05], rot: [0, 0, 0.4] }, emrod: BLADE,
    feedpole: POLE, gauntlet: FIST, relaybaton: HELD, vaultpole: { at: [0, -0.2, 0], rot: [0.2, 0, 0.4] }, sled: HELD, snowboard: HELD,
  });
  Object.assign(OFFHAND, { handwraps: (mb, L, g) => WEAPONS.handwraps(mb, L, g, -0.02), cestus: (mb, L, g) => WEAPONS.cestus(mb, L, g, -0.02) });
  Object.assign(EXTRAS, {
    smallwings: { bone: 'torso', build(mb, L, g) {   // small pale dragon wings, their spars gold
      const c = L.g1 || '#e8e4f0', m = sh(c, -0.06), sp2 = L.g2 || GOLD;
      [1, -1].forEach(s => {
        const P = (x, y, z) => [s * x, y, z], R = P(0.07, 0.36, -0.2), E = P(0.22, 0.52, -0.3), H = P(0.4, 0.6, -0.33), F = [P(0.42, 0.42, -0.36), P(0.3, 0.3, -0.33)];
        sw(mb, [R, E, H], [0.022, 0.018, 0.006], sp2); F.forEach(f => sw(mb, [E, f], [0.012, 0.004], sp2));
        tri(mb, R, E, F[1], m); tri(mb, E, F[0], F[1], c); tri(mb, E, H, F[0], m);
      });
    } },
    featherwings: { bone: 'torso', build(mb, L) {   // feathered bird wings, half spread
      const c = L.g1 || '#7a5030';
      [1, -1].forEach(s => { for (let k = 0; k < 7; k++) { const a = 0.2 + k * 0.2; bl(mb, [s * 0.08, 0.36, -0.22], [s * Math.cos(a), Math.sin(a) * 0.9 - 0.2, -0.45], 0.24 + Math.sin(k / 6 * PI) * 0.14, 0.07, 0.015, k % 2 ? c : sh(c, 0.14), [0, 0, 1], k > 4 ? WHITE : null); } });
    } },
    falcon: { bone: 'torso', build(mb, L, g) {   // a falcon perched on the left shoulder
      xf(mb, [0.31, 0.41, 0.04], [0, -0.4, 0], () => { mb.scale(1.35, 1.35, 1.35);
        el(mb, 0, 0.06, 0, 0.045, 0.06, 0.05, '#8a5a30', 8, 5); el(mb, 0, 0.055, 0.02, 0.035, 0.045, 0.035, '#e8dcc0', 8, 4);
        ball(mb, 0, 0.13, 0.01, 0.035, '#5a3a20', 8); spk(mb, [0, 0.125, 0.04], [0, -0.4, 1], 0.03, 0.012, '#f0c030', 4);
        [1, -1].forEach(s => bl(mb, [s * 0.04, 0.08, -0.01], [s * 0.2, -1, -0.4], 0.09, 0.05, 0.012, '#6a4020', [0, 0, 1]));
        bl(mb, [0, 0.02, -0.04], [0, -0.6, -1], 0.08, 0.05, 0.01, '#5a3a20', [1, 0, 0]);
      });
      xf(g, [0.31, 0.41, 0.04], [0, -0.4, 0], () => { g.scale(1.35, 1.35, 1.35); [1, -1].forEach(s => ball(g, s * 0.018, 0.14, 0.035, 0.008, '#ffd040', 4)); });
    } },
  });

  Object.assign(HATS, {
    // ---- Ranger
    swimcap(mb, L) {   // the Bodyboarder's tight swim cap with its goggles pushed up
      const c = L.g1 || '#20b090';
      lof(mb, [hed(0.22, 0.012), hed(0.32, 0.014), [0.41, 0.17, 0.165], [0.455, 0.06, 0.06], [0.46, 0.001]], c, { sides: 12 });
      bandOf(mb, 0.33, 0.016, '#2a2a30', 0.02);
      [1, -1].forEach(s => { xf(mb, [s * 0.07, 0.36, 0.2], [-0.5, 0, 0], () => { zcyl(mb, 0, 0, -0.01, 0.04, 0.04, 0.03, L.g2 || '#ff7040', 8); zcyl(mb, 0, 0, 0.015, 0.032, 0.032, 0.008, '#a0e0ff', 8); }); });
    },
    surfhair(mb, L) {  // the Surfer's shaggy sun-bleached hair, a shell necklace's beads in the fringe
      const c = '#f0d888', d = sh(c, -0.1);
      hairOf(mb, c, 0.46);
      for (let k = 0; k < 9; k++) { const a = PI * 0.15 + k * PI * 0.7 / 8; bl(mb, [Math.cos(a) * 0.2, 0.37, Math.sin(a) * 0.19], [Math.cos(a) * 1.4, -0.9, Math.sin(a) * 1.2], 0.13, 0.07, 0.022, k % 2 ? d : c, null); }
      for (let k = 0; k < 7; k++) { const a = PI * 1.05 + k * PI * 0.9 / 6; bl(mb, [Math.cos(a) * 0.21, 0.3, Math.sin(a) * 0.2], [Math.cos(a), -0.9, Math.sin(a)], 0.15, 0.08, 0.025, k % 2 ? d : c, null); }
    },
    snorkel(mb, L) {   // the Snorkeler's dive mask over its eyes and a snorkel up one side
      const c = L.g1 || '#20b0e0';
      xf(mb, [0, 0.24, 0.225], null, () => { mb.rbox(0, 0, 0, 0.24 * T, 0.11 * T, 0.05 * T, c, 0.4); bx(mb, 0, 0, 0.026, 0.19, 0.075, 0.006, '#c8f0ff'); });
      bandOf(mb, 0.22, 0.03, c, 0.018);
      sw(mb, [[-0.2, 0.2, 0.08], [-0.24, 0.32, 0.06], [-0.24, 0.48, 0.04]], 0.018, L.g2 || '#ffd040', { sides: 6 });
      cyl(mb, -0.24, 0.47, 0.04, 0.026, 0.026, 0.04, '#ff5030', 8);
    },
    divehelm(mb, L, g) { // the Deep Diver's brass diving helmet: portholes, bolts and a heavy collar
      const b = L.g1 || '#c8903a';
      el(mb, 0, 0.23, 0.0, 0.3, 0.31, 0.29, b, 12, 8);
      zcyl(mb, 0, 0.22, 0.24, 0.12, 0.12, 0.06, sh(b, -0.1), 12); zcyl(g, 0, 0.22, 0.298, 0.1, 0.1, 0.006, '#80d0ff', 12);
      [1, -1].forEach(s => xf2(mb, g, [s * 0.27, 0.24, 0.0], [0, 0, s * PI / 2], () => { cyl(mb, 0, 0, 0, 0.07, 0.07, 0.05, sh(b, -0.1), 10); cyl(g, 0, 0.05, 0, 0.055, 0.055, 0.004, '#80d0ff', 10); }));
      for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; ball(mb, Math.cos(a) * 0.125, 0.22 + Math.sin(a) * 0.125, 0.3, 0.012, sh(b, -0.3), 4); }
      lof(mb, [[-0.04, 0.27, 0.26], [0.02, 0.29, 0.28]], sh(b, -0.15), { sides: 12 });
    },
    shako(mb, L) {     // the Fusilier's tall shako with a peak, a badge and a plume
      const c = '#1e1e28';
      lof(mb, [hed(0.3, 0.012), [0.45, 0.2, 0.19], [0.6, 0.21, 0.2], [0.605, 0.001]], c, { sides: 12 });
      el(mb, 0, 0.31, 0.2, 0.15, 0.014, 0.1, '#141418', 8, 4);
      xf(mb, [0, 0.46, 0.2], [-0.1, 0, 0], () => { pan(mb, [[0, 0.06], [0.05, 0.0], [0, -0.06], [-0.05, 0.0]], 0, 0.01, GOLD); });
      sw(mb, [[0, 0.59, 0.17], [0, 0.66, 0.18], [0, 0.72, 0.17]], [0.03, 0.035, 0.01], L.g2 || '#f0f0f0');
      lof(mb, [[0.3, 0.232, 0.222], [0.33, 0.232, 0.222]], L.g1 || '#c02828', { sides: 12 });
    },
    musketeer(mb, L) { // the Flintlock's broad cavalier hat, a great white plume curling over its brim
      const c = L.g1 || '#2a4a3a';
      cyl(mb, 0, 0.32, 0, 0.36, 0.35, 0.018, sh(c, -0.1), 16);
      lof(mb, [hed(0.32, 0.012), [0.43, 0.19, 0.18], [0.46, 0.12, 0.11], [0.465, 0.001]], c);
      bandOf(mb, 0.33, 0.03, L.g2 || GOLD, 0.02);
      curve(mb, [[-0.1, 0.38, 0.15], [0.12, 0.42, 0.14], [0.28, 0.4, 0.0], [0.3, 0.33, -0.18], [0.22, 0.26, -0.3]], 0.05, 0.015, WHITE);
      curve(mb, [[-0.08, 0.4, 0.13], [0.1, 0.45, 0.1], [0.24, 0.44, -0.04]], 0.035, 0.01, '#d8e8f0');
    },
    // ---- Black Mage
    flamecrown(mb, L, g) { // the Pyromancer's dark hood ringed with a crown of flames
      hood(mb, L.g1 || '#a02010', 0.48);
      for (let i = 0; i < 9; i++) { const a = PI * 0.15 + i * PI * 0.7 / 8, x = Math.cos(a), z = Math.sin(a), len = 0.12 + (i % 2) * 0.06 + (i === 4 ? 0.06 : 0); bl(g, [x * 0.2, 0.38, z * 0.18], [x * 0.3, 1, z * 0.3], len, 0.06, 0.025, '#ff6a20', [-z, 0, x], '#ffe060'); }
    },
    trapperhat(mb, L) { // the Ice Sculptor's fur-lined trapper hat, its flaps down over the ears
      const c = L.g1 || '#4a6a9a';
      lof(mb, [hed(0.27, 0.02), [0.38, 0.235, 0.225], [0.45, 0.15, 0.14], [0.47, 0.001]], c, { sides: 12 });
      puffs(mb, 0.3, 0.235, 0.225, 0.034, WHITE, 9, PI * 0.2, PI * 0.8, '#e8eef4');
      [1, -1].forEach(s => { el(mb, s * 0.225, 0.2, 0.0, 0.04, 0.1, 0.09, c, 6, 4); el(mb, s * 0.235, 0.15, 0.0, 0.035, 0.05, 0.08, WHITE, 6, 4); });
    },
    elemcirclet(mb, L, g) { // the Elementalist's silver circlet set with four gems, one for each element
      bandOf(mb, 0.3, 0.028, '#d8dce4', 0.024);
      [['#ff4020', -0.25], ['#40a0ff', -0.08], ['#ffe040', 0.08], ['#40d060', 0.25]].forEach(([c, a]) => { const r = hed(0.31, 0.03); ball(g, Math.sin(a * 2) * r[1], 0.315, Math.cos(a * 2) * r[2], 0.022, c, 6); });
      for (let k = 0; k < 3; k++) bl(mb, [(k - 1) * 0.05, 0.32, 0.23], [(k - 1) * 0.4, 1, 0.1], 0.1 - Math.abs(k - 1) * 0.03, 0.03, 0.01, '#d8dce4', [0, 0, 1]);
    },
    safetyhelm(mb, L) { // the Electrician's white hard hat with a lightning bolt on the front
      dome(mb, 0, 0.3, 0, 0.24, 0.18, 0.23, '#f0f0ec');
      cyl(mb, 0, 0.3, 0.02, 0.28, 0.27, 0.018, '#dcdcd6', 12);
      xf(mb, [0, 0.39, 0.205], [-0.55, 0, 0], () => pan(mb, [[0.02, 0.06], [-0.03, 0.0], [0.0, 0.0], [-0.02, -0.06], [0.03, 0.01], [0.0, 0.01]], 0, 0.01, L.g1 || '#e8c020'));
    },
    stormhood(mb, L, g) { // the Stormcaller's dark hood, a lightning bolt standing up from its crown
      hood(mb, L.g1 || '#2a2a4a', 0.52);
      xf(g, [0, 0.52, -0.05], [0, PI / 2, 0], () => pan(g, [[0.03, 0.2], [-0.04, 0.08], [0.0, 0.08], [-0.03, 0.0], [0.05, 0.11], [0.01, 0.11]], 0, 0.02, L.g2 || '#ffe040'));
      bandOf(mb, 0.28, 0.02, L.g2 || '#ffe040', 0.045, { arc: [PI * 0.15, PI * 0.85] });
    },
    netherhood(mb, L, g) { // the Netherseer's tall dark hood, curling to a point, violet flames at its edge
      const c = L.g1 || '#2a1a3a';
      lof(mb, [hed(0.0, 0.05), hed(0.2, 0.05), hed(0.4, 0.035), [0.58, 0.09, 0.09, -0.08], [0.7, 0.04, 0.04, -0.18], [0.72, 0.001, 0.001, -0.26]], c, { arc: faceOpen([PI * 0.66, PI * 2.34]) });
      for (let i = 0; i < 6; i++) { const a = PI * 0.75 + i * PI * 0.1; bl(g, [Math.cos(a) * 0.24, 0.05 + i * 0.06, Math.sin(a) * 0.24 + 0.02], [0.2, 1, 0.3], 0.07, 0.03, 0.01, L.g2 || '#c060ff', [0, 0, 1], '#f0c0ff'); }
      for (let i = 0; i < 6; i++) { const a = PI * 2.25 - i * PI * 0.1; bl(g, [Math.cos(a) * 0.24, 0.05 + i * 0.06, Math.sin(a) * 0.24 + 0.02], [-0.2, 1, 0.3], 0.07, 0.03, 0.01, L.g2 || '#c060ff', [0, 0, 1], '#f0c0ff'); }
    },
    // ---- White Mage
    lgvisor(mb, L) {   // the Lifeguard's red visor with a white cross, and sun cream on its nose
      const c = L.g1 || '#d83030';
      bandOf(mb, 0.28, 0.06, c, 0.022);
      el(mb, 0, 0.31, 0.21, 0.19, 0.016, 0.14, sh(c, 0.08), 8, 4);
      xf(mb, [0, 0.31, 0.236], [-0.15, 0, 0], () => { bx(mb, 0, 0, 0, 0.05, 0.016, 0.006, WHITE); bx(mb, 0, 0, 0, 0.016, 0.05, 0.006, WHITE); });
      el(mb, 0, 0.19, 0.24, 0.025, 0.012, 0.012, WHITE, 6, 3);
    },
    rescuehelm(mb, L) { // the Coastguard's orange rescue helmet with a white reflective band
      const c = L.g1 || '#ff7020';
      dome(mb, 0, 0.27, 0, 0.25, 0.22, 0.24, c);
      lof(mb, [hed(0.25, 0.04), hed(0.28, 0.04)], sh(c, -0.12));
      lof(mb, [[0.34, 0.23, 0.22], [0.37, 0.215, 0.205]], WHITE, { sides: 12 });
      [1, -1].forEach(s => sw(mb, [[s * 0.22, 0.26, 0.02], [s * 0.18, 0.1, 0.1], [s * 0.07, 0.02, 0.17], [0, 0.02, 0.18]], 0.008, '#2a2a30', { sides: 4 }));
    },
    millcap(mb, L) {   // the Miller's floppy flour-dusted cloth cap, a brown band round it
      const c = '#f4f0e6';
      lof(mb, [hed(0.29, 0.016), [0.36, 0.26, 0.25], [0.42, 0.26, 0.25, -0.01, 0.02], [0.47, 0.17, 0.16, -0.01, 0.03], [0.48, 0.001, 0.001, -0.01, 0.03]], c, { sides: 12 });
      bandOf(mb, 0.29, 0.03, L.g2 || '#a07040', 0.02);
    },
    pinwheel(mb, L) {  // the Aeromancer's soft cap with a pinwheel spinning on top
      const c = L.g1 || '#40a0a0';
      lof(mb, [hed(0.28, 0.016), [0.4, 0.235, 0.225], [0.45, 0.15, 0.14], [0.465, 0.001]], c, { sides: 12 });
      cyl(mb, 0, 0.45, 0, 0.012, 0.012, 0.12, '#d8dce4', 6);
      xf(mb, [0, 0.58, 0.012], [0, 0, 0.3], () => { ['#ff5050', '#ffd040', '#40c0ff', '#60d060'].forEach((cc, k) => xf(mb, [0, 0, 0], [0, 0, k * PI / 2], () => tri(mb, [0, 0, 0], [0.1, 0.0, 0], [0.08, 0.08, 0], cc))); ball(mb, 0, 0, 0.004, 0.014, WHITE, 4); });
    },
    herbhat(mb, L) {   // the Salve-Maker's straw cap stuck with sprigs of herbs and a red flower
      const c = '#d8c080';
      lof(mb, [[0.28, 0.3, 0.29], hed(0.31, 0.014), [0.43, 0.2, 0.19], [0.46, 0.09, 0.09], [0.47, 0.001]], c, { sides: 12 });
      bandOf(mb, 0.31, 0.03, L.g1 || '#5a8a4a', 0.02);
      [[0.16, -0.3], [0.19, 0.0], [0.15, 0.3]].forEach(([x, r], k) => { for (let i = 0; i < 3; i++) bl(mb, [x, 0.34 + i * 0.03, 0.08 - k * 0.07], [0.5, 1, r], 0.08, 0.035, 0.008, k % 2 ? '#4a9a3a' : '#7ac050', [0, 0, 1]); });
      flower(mb, 0.21, 0.35, 0.1, 0.02, '#ff4060', '#ffe060', 'zy');
    },
    seraph(mb, L, g) { // the Seraph's golden laurel and a gem on its brow
      const gd = L.g2 || '#e8c040';
      [1, -1].forEach(s => { for (let k = 0; k < 6; k++) { const a = -PI / 2 + s * (k / 5) * (PI - 0.5), x = Math.cos(a), z = Math.sin(a); bl(mb, [x * 0.222, 0.32 + k * 0.004, z * 0.212], [-s * Math.sin(a), 0.35, s * Math.cos(a)], 0.08, 0.04, 0.01, k % 2 ? gd : sh(gd, 0.12), { radial: [0, 0.32, 0] }); } });
      ball(g, 0, 0.33, 0.238, 0.024, '#80e0ff', 6);
    },
  });
  Object.assign(BODIES, {
    // ---- Ranger
    rashguard(mb, L) { // the Bodyboarder's swim shirt with a slanting stripe, and swim shorts
      const c = L.g1 || '#20b090';
      lof(mb, [tor(0.37, 0.014), tor(0.26, 0.016), tor(0.13, 0.012), tor(0.02, 0.016)], c, { sides: 12 });
      xf(mb, [0, 0.27, 0], [0, 0, 0.35], () => lof(mb, [tor(0.0, 0.026), tor(0.04, 0.026)].map(r => (r[0] -= 0, r)), L.g2 || '#ff7040', { sides: 12 }));
      lof(mb, [[-0.12, 0.22, 0.21], tor(-0.02, 0.024), tor(0.04, 0.02)], L.g2 || '#ff7040', { sides: 12 });
    },
    boardshorts(mb, L) { // the Surfer's flowery board shorts and a necklace of shells
      const c = L.g1 || '#ff6040';
      lof(mb, [[-0.12, 0.22, 0.21], tor(-0.03, 0.028), tor(0.05, 0.02)], c, { sides: 12 });
      [[0.12, -0.04], [-0.14, -0.06], [0.0, -0.08], [0.2, 0.0], [-0.2, 0.0]].forEach(([x, y]) => { const r = tor(y, 0.03); flower(mb, x, y, Math.sqrt(Math.max(0, 1 - x * x / (r[1] * r[1]))) * r[2], 0.016, WHITE, '#ffd040'); });
      for (let i = 0; i < 11; i++) { const a = PI * 0.15 + i * PI * 0.7 / 10, r = tor(0.36, 0.02); ball(mb, Math.cos(a) * r[1], 0.35 - Math.sin(a) * 0.04, Math.sin(a) * r[2], 0.016, i % 2 ? '#f4e8d0' : (L.g2 || '#40c0e0'), 4); }
    },
    swimring(mb, L) {  // the Snorkeler's striped rubber ring round its waist
      for (let i = 0; i < 12; i++) { const a0 = i / 12 * PI * 2, a1 = (i + 1) / 12 * PI * 2, R = 0.31; sw(mb, [[Math.cos(a0) * R, 0.03, Math.sin(a0) * R], [Math.cos((a0 + a1) / 2) * R, 0.03, Math.sin((a0 + a1) / 2) * R], [Math.cos(a1) * R, 0.03, Math.sin(a1) * R]], 0.065, i % 2 ? WHITE : (L.g2 || '#ffd040'), { sides: 8, capStart: false, capEnd: false }); }
    },
    divesuit(mb, L) {  // the Deep Diver's rubber suit, its brass collar, a weight belt and the air hose
      const c = L.g2 || '#3a4a5a', b = L.g1 || '#c8903a';
      lof(mb, [[-0.1, 0.21, 0.2], tor(0.0, 0.018), tor(0.13, 0.016), tor(0.26, 0.018), tor(0.36, 0.02)], c, { sides: 12 });
      lof(mb, [tor(0.3, 0.04), tor(0.38, 0.04), [0.42, 0.2, 0.19]], b, { sides: 12 });
      for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2 + PI / 8, r = tor(0.34, 0.05); ball(mb, Math.cos(a) * r[1], 0.34, Math.sin(a) * r[2], 0.014, sh(b, -0.3), 4); }
      lof(mb, [tor(-0.02, 0.026), tor(0.04, 0.028)], '#2a2a2a'); [-0.12, 0.12].forEach(x => { const r = tor(0.01, 0.03); bx(mb, x, 0.01, Math.sqrt(1 - x * x / (r[1] * r[1])) * r[2], 0.06, 0.05, 0.03, '#6a6a72'); });
      sw(mb, [[0.0, 0.3, -0.26], [0.1, 0.18, -0.34], [0.2, 0.0, -0.32], [0.3, -0.08, -0.2]], 0.02, '#2a2a30');
    },
    redcoat(mb, L) {   // the Fusilier's red coat, white belts crossed over the chest, gold buttons
      const c = L.g1 || '#c02828', w = L.g2 || '#f0f0f0';
      lof(mb, [tor(0.37, 0.016), tor(0.26, 0.018), tor(0.12, 0.016), tor(0.0, 0.02), [-0.1, 0.27, 0.26]], c, { sides: 12 });
      [1, -1].forEach(s => sw(mb, [[s * 0.16, 0.38, 0.1], [s * 0.1, 0.3, 0.23], [-s * 0.08, 0.12, 0.27], [-s * 0.22, 0.0, 0.16]], 0.016, w, { sides: 4 }));
      lof(mb, [tor(0.0, 0.026), tor(0.04, 0.026)], w); [0.32, 0.06].forEach(y => { const r = tor(y, 0.02); ball(mb, 0, y, r[2] + 0.005, 0.014, GOLD, 4); });
      [1, -1].forEach(s => el(mb, s * 0.21, 0.37, 0.02, 0.08, 0.025, 0.08, GOLD, 8, 4));
    },
    // ---- Black Mage
    soot(mb, L) {      // the Stoker's dark singlet, a neckerchief and smudges of soot
      const c = L.g1 || '#2a2a30';
      lof(mb, [tor(0.02, 0.016), tor(0.14, 0.014), tor(0.26, 0.016)], c, { sides: 12 });
      [1, -1].forEach(s => sw(mb, [[s * 0.12, 0.26, 0.21], [s * 0.13, 0.37, 0.12], [s * 0.13, 0.4, 0.0], [s * 0.13, 0.36, -0.13], [s * 0.12, 0.26, -0.21]], 0.02, c, { sides: 4 }));
      lof(mb, [[-0.11, 0.2, 0.19], tor(-0.03, 0.024), tor(0.03, 0.02)], '#4a3a2a', { sides: 12 });
      ball(mb, 0, 0.37, 0.17, 0.03, '#c03020'); [1, -1].forEach(s => bl(mb, [0, 0.37, 0.17], [s * 0.4, -1, 0.4], 0.08, 0.05, 0.01, '#c03020', [1, 0, 0]));
      [[0.18, 0.32, 0.14], [-0.2, 0.2, 0.16]].forEach(([x, y, z]) => el(mb, x, y, z, 0.05, 0.03, 0.03, '#5a5a62', 6, 3));
    },
    emberrobe(mb, L, g) { // the Pyromancer's robe, its hem licked by flames
      BODIES.robe(mb, { g1: L.g1 || '#a02010', g2: '#3a1008' });
      for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2, x = Math.cos(a), z = Math.sin(a); bl(g, [x * 0.325, -0.14, z * 0.315], [x * 0.25, 1, z * 0.25], 0.09 + (i % 3) * 0.04, 0.06, 0.012, '#ff6a20', { radial: [0, -0.14, 0] }, '#ffd040'); }
    },
    toolbelt(mb, L) {  // the Electrician's work shirt and a tool belt: pliers, a screwdriver, a coil of wire
      lof(mb, [tor(0.37, 0.016), tor(0.26, 0.016), tor(0.13, 0.012), tor(0.02, 0.016)], '#3a5a8a', { sides: 12 });
      lof(mb, [tor(-0.01, 0.022), tor(0.05, 0.024)], '#5a3a20');
      xf(mb, [0.25, 0.0, 0.1], [0, 0.5, 0], () => { bx(mb, 0, -0.03, 0, 0.04, 0.08, 0.08, '#7a5030'); bx(mb, 0, 0.03, 0.02, 0.012, 0.08, 0.012, '#e8c020'); bx(mb, 0, 0.04, -0.02, 0.014, 0.06, 0.02, '#d03030'); });
      sw(mb, loop(-0.27, -0.02, 0.06, 0.05, 10, 'zy'), 0.012, L.g1 || '#e8c020', { sides: 4 }); sw(mb, loop(-0.275, -0.02, 0.06, 0.035, 10, 'zy'), 0.012, L.g1 || '#e8c020', { sides: 4 });
    },
    // ---- White Mage
    whistle(mb, L) {   // the Lifeguard's red swim top and a whistle on a cord
      const c = L.g1 || '#d83030';
      lof(mb, [tor(0.04, 0.016), tor(0.14, 0.014), tor(0.26, 0.016)], c, { sides: 12 });
      [1, -1].forEach(s => sw(mb, [[s * 0.12, 0.26, 0.21], [s * 0.13, 0.37, 0.12], [s * 0.13, 0.4, 0.0], [s * 0.13, 0.36, -0.13], [s * 0.12, 0.26, -0.21]], 0.022, c, { sides: 4 }));
      lof(mb, [[-0.11, 0.2, 0.19], tor(-0.03, 0.024), tor(0.05, 0.02)], '#f0d040', { sides: 12 });
      sw(mb, [[-0.12, 0.39, 0.1], [-0.06, 0.31, 0.21], [0.0, 0.28, 0.235], [0.06, 0.31, 0.21], [0.12, 0.39, 0.1]], 0.006, WHITE, { sides: 3 });
      xf(mb, [0, 0.27, 0.25], null, () => { cyl(mb, 0, -0.03, 0, 0.022, 0.022, 0.05, '#c8ccd4', 8); zcyl(mb, 0, 0.0, 0.0, 0.01, 0.01, 0.04, '#c8ccd4', 6); });
    },
    lifejacket(mb, L) { // the Coastguard's puffy orange life jacket with reflective bands and buckles
      const c = L.g1 || '#ff7020';
      lof(mb, [tor(0.4, 0.03), tor(0.3, 0.045), tor(0.18, 0.04), tor(0.06, 0.04), tor(0.0, 0.03)], c, { arc: [PI * 0.6, PI * 2.4], sides: 12 });
      [0.1, 0.28].forEach(y => lof(mb, [tor(y, 0.05), tor(y + 0.03, 0.05)], '#e4e8f0', { arc: [PI * 0.6, PI * 2.4], sides: 12 }));
      [0.04, 0.2].forEach(y => { const r = tor(y, 0.05); bx(mb, 0, y, r[2] - 0.01, 0.12, 0.02, 0.01, '#2a2a30'); });
      lof(mb, [tor(0.4, 0.04), [0.47, 0.2, 0.19, -0.02]], sh(c, -0.1), { arc: [PI * 0.75, PI * 2.25] });
    },
    smock(mb, L) {     // the Miller's long white smock, dusted with flour, a brown neckerchief
      const c = L.g1 || '#f0ece0', dust = (i) => (i % 4 === 1 ? '#fcfaf4' : c);
      lof(mb, [tor(0.37, 0.016, dust), tor(0.26, 0.018, dust), tor(0.12, 0.02, dust), [-0.04, 0.29, 0.28, 0, 0, dust], [-0.15, 0.32, 0.31]], c, { sides: 12 });
      lof(mb, [[-0.15, 0.322, 0.312], [-0.12, 0.322, 0.312]], sh(c, -0.1), { sides: 12 });
      ball(mb, 0, 0.37, 0.17, 0.03, L.g2 || '#a07040'); [1, -1].forEach(s => bl(mb, [0, 0.37, 0.17], [s * 0.4, -1, 0.4], 0.08, 0.05, 0.01, L.g2 || '#a07040', [1, 0, 0]));
      [[0.16, 0.28], [-0.12, 0.04], [0.2, -0.02]].forEach(([x, y]) => { const r = tor(y, 0.025); el(mb, x, y, Math.sqrt(Math.max(0, 1 - x * x / (r[1] * r[1]))) * r[2], 0.04, 0.03, 0.01, WHITE, 6, 3); });
    },
    windcape(mb, L) {  // the Aeromancer's light cape and long ribbons streaming out on the wind
      const c = L.g1 || '#40a0a0';
      capeOf(mb, c, 0.06, 0.03);
      [[0.1, 0.38, '#f0f0f0'], [-0.1, 0.38, sh(c, 0.2)], [0.0, 0.3, c]].forEach(([x, y, cc], k) => sw(mb, [[x, y, -0.2], [x * 2 + 0.05, y + 0.02, -0.35], [x * 3 - 0.05, y - 0.04, -0.5], [x * 4 + 0.08, y + 0.02, -0.62]], [[0.006, 0.03], [0.006, 0.03], [0.005, 0.025], [0.002, 0.006]], cc, { sides: 4 }));
      lof(mb, [tor(0.04, 0.016), tor(0.08, 0.018)], L.g2 || '#f0f0f0');
    },
  });
  Object.assign(WEAPONS, {
    // ---- Ranger
    bodyboard(mb, L) { xf(mb, [0, -0.04, 0.07], [0, 0, 0.15], () => { mb.rbox(0, 0, 0, 0.2 * T, 0.32 * T, 0.03 * T, L.g2 || '#ff7040', 0.5); bx(mb, 0, 0.06, 0.016, 0.16, 0.03, 0.004, WHITE); }); sw(mb, [[0, 0.02, 0.05], [0.05, -0.05, 0.09]], 0.004, '#2a2a30', { sides: 3 }); },
    surfboard(mb, L) { xf(mb, [0, 0.02, 0.07], [0, 0, 0.1], () => { lof(mb, [[-0.36, 0.01, 0.01], [-0.3, 0.06, 0.015], [0.0, 0.085, 0.018], [0.3, 0.06, 0.015], [0.42, 0.005, 0.008]].map(([y, rx, rz]) => [y, rx, rz]), L.g2 || '#40c0e0', { sides: 10 }); bx(mb, 0, 0.0, 0.019, 0.02, 0.66, 0.004, L.g1 || '#ff6040'); spk(mb, [0, -0.26, -0.015], [0, 0.2, -1], 0.06, 0.02, '#2a2a30', 3); }); },
    speargun(mb, L) { zcyl(mb, 0, 0.04, -0.04, 0.025, 0.025, 0.3, '#3a4a5a', 8); xf(mb, [0, 0.0, -0.04], [-0.3, 0, 0], () => bx(mb, 0, -0.04, 0, 0.03, 0.09, 0.04, '#2a2a30')); zcyl(mb, 0, 0.04, 0.26, 0.006, 0.006, 0.16, '#c8ccd4', 6); xf(mb, [0, 0.04, 0.42], [PI / 2, 0, 0], () => { cyl(mb, 0, 0, 0, 0.018, 0, 0.05, '#d8dce4', 4); [1, -1].forEach(s => spk(mb, [0, 0.01, 0], [s, -1, 0], 0.03, 0.006, '#d8dce4', 3)); }); },
    musket(mb, L) { zcyl(mb, 0, 0.05, -0.02, 0.014, 0.012, 0.46, '#5a5a62', 8); bx(mb, 0, 0.035, 0.08, 0.04, 0.04, 0.24, '#7a4a2a'); xf(mb, [0, 0.02, -0.08], [-0.2, 0, 0], () => bx(mb, 0, 0, -0.03, 0.045, 0.07, 0.12, '#7a4a2a')); bx(mb, 0.024, 0.07, 0.0, 0.01, 0.03, 0.02, GOLD); },
    flintpistol(mb, L, g, y0 = 0) { xf(mb, [0, y0, 0], null, () => { zcyl(mb, 0, 0.05, 0.0, 0.014, 0.012, 0.18, '#5a5a62', 8); bx(mb, 0, 0.04, 0.02, 0.036, 0.034, 0.08, '#7a4a2a'); xf(mb, [0, 0.0, -0.03], [0.45, 0, 0], () => bx(mb, 0, -0.03, 0, 0.034, 0.08, 0.04, '#7a4a2a')); ball(mb, 0, 0.0 - 0.07, -0.06, 0.018, L.g2 || GOLD); bx(mb, 0.022, 0.07, -0.01, 0.008, 0.03, 0.02, L.g2 || GOLD); }); },
    // ---- Black Mage
    shovel(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.5, '#7a5030', 6); xf(mb, [0, -0.12, 0.04], [0.3, 0, 0], () => { bx(mb, 0, -0.06, 0, 0.14, 0.14, 0.012, '#4a4a52'); [1, -1].forEach(s => bx(mb, s * 0.07, -0.06, 0.012, 0.012, 0.14, 0.03, '#4a4a52')); }); sw(mb, loop(0, 0.44, 0.02, 0.035, 8, 'xy', 0.025), 0.01, '#3a2418', { sides: 4 }); },
    firebrand(mb, L, g) { cyl(mb, 0, -0.08, 0.02, 0.016, 0.02, 0.56, '#3a1a10', 6); cyl(mb, 0, 0.46, 0.02, 0.035, 0.03, 0.04, L.g2 || '#ff9020', 8); for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; bl(g, [Math.cos(a) * 0.02, 0.5, 0.02 + Math.sin(a) * 0.02], [Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3], 0.1 + (i % 2) * 0.04, 0.05, 0.03, '#ff6a20', [-Math.sin(a), 0, Math.cos(a)], '#ffe060'); } },
    chisel(mb, L, g, off) { if (off) { cyl(mb, 0, -0.02, 0.04, 0.012, 0.012, 0.12, '#7a5030', 6); xf(mb, [0, 0.12, 0.04], [0, 0, PI / 2], () => cyl(mb, 0, -0.04, 0, 0.028, 0.028, 0.08, '#8a8e96', 8)); return; } bx(mb, 0, 0.0, 0.02, 0.03, 0.1, 0.03, '#7a5030'); cyl(mb, 0, 0.05, 0.02, 0.01, 0.01, 0.12, '#c8ccd4', 6); bx(mb, 0, 0.19, 0.02, 0.04, 0.04, 0.006, '#d8dce4'); el(g, 0.1, 0.22, 0.08, 0.03, 0.04, 0.03, '#c0ecff', 6, 4); },
    elemstaff(mb, L, g) { cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.6, '#d8dce4', 6); sw(mb, loop(0, 0.58, 0.02, 0.07, 12, 'xz'), 0.01, '#d8dce4', { sides: 4 }); ['#ff4020', '#40a0ff', '#ffe040', '#40d060'].forEach((c, k) => { const a = k / 4 * PI * 2 + PI / 4; ball(g, Math.cos(a) * 0.07, 0.58, 0.02 + Math.sin(a) * 0.07, 0.025, c, 6); }); spk(mb, [0, 0.58, 0.02], [0, 1, 0], 0.1, 0.02, '#d8dce4', 4); },
    plug(mb, L) { bx(mb, 0, 0.04, 0.05, 0.08, 0.08, 0.05, '#2a2a30'); [1, -1].forEach(s => bx(mb, s * 0.022, 0.11, 0.05, 0.012, 0.06, 0.006, '#d8c070')); sw(mb, [[0, 0.0, 0.05], [0.02, -0.08, 0.06], [0.08, -0.12, 0.04], [0.06, -0.2, 0.0], [-0.02, -0.22, 0.02]], 0.012, '#2a2a30', { sides: 4 }); },
    lightningrod(mb, L, g) { cyl(mb, 0, -0.08, 0.02, 0.014, 0.014, 0.62, '#8a8e96', 6); [1, -1].forEach(s => sw(mb, [[0, 0.5, 0.02], [s * 0.06, 0.56, 0.02], [s * 0.06, 0.66, 0.02]], 0.01, '#8a8e96', { sides: 4 })); spk(mb, [0, 0.54, 0.02], [0, 1, 0], 0.14, 0.012, '#c8ccd4', 4); xf(g, [0.02, 0.72, 0.02], null, () => pan(g, [[0.03, 0.14], [-0.03, 0.05], [0.0, 0.05], [-0.03, -0.02], [0.04, 0.08], [0.01, 0.08]], 0, 0.012, L.g2 || '#ffe040')); },
    nethercore(mb, L, g) { cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.56, '#1a1220', 6); for (let k = 0; k < 4; k++) { const a = k / 4 * PI * 2; sw(mb, [[0, 0.46, 0.02], [Math.cos(a) * 0.07, 0.52, 0.02 + Math.sin(a) * 0.07], [Math.cos(a) * 0.04, 0.62, 0.02 + Math.sin(a) * 0.04]], [0.012, 0.01, 0.002], '#1a1220'); } ball(g, 0, 0.55, 0.02, 0.045, L.g2 || '#c060ff', 8); },
    // ---- White Mage
    lifering(mb, L) { for (let i = 0; i < 8; i++) { const a0 = i / 8 * PI * 2, a1 = (i + 1) / 8 * PI * 2, R = 0.09; sw(mb, [[Math.cos(a0) * R, 0.04 + Math.sin(a0) * R, 0.09], [Math.cos((a0 + a1) / 2) * R, 0.04 + Math.sin((a0 + a1) / 2) * R, 0.09], [Math.cos(a1) * R, 0.04 + Math.sin(a1) * R, 0.09]], 0.032, i % 2 ? WHITE : (L.g1 || '#d83030'), { sides: 6, capStart: false, capEnd: false }); } },
    flare(mb, L, g) { cyl(mb, 0, -0.06, 0.04, 0.02, 0.02, 0.18, '#c02020', 8); cyl(mb, 0, -0.08, 0.04, 0.024, 0.024, 0.04, '#2a2a30', 8); ball(g, 0, 0.14, 0.04, 0.035, '#ff8040', 6); ball(g, 0, 0.17, 0.04, 0.022, '#ffe080', 6); [[0.02, 0.24, 0.03, 0.03], [-0.02, 0.31, 0.01, 0.038], [0.03, 0.39, -0.01, 0.045]].forEach(([x, y, z, r]) => ball(mb, x, y, 0.04 + z, r, '#d0c8c8', 6)); },
    flail(mb, L) { cyl(mb, 0, -0.06, 0.02, 0.016, 0.016, 0.34, '#a07040', 6); sw(mb, [[0, 0.28, 0.02], [0.03, 0.31, 0.02], [0.06, 0.29, 0.02]], 0.008, '#5a3a20', { sides: 4 }); xf(mb, [0.06, 0.29, 0.02], [0, 0, -1.9], () => cyl(mb, 0, 0, 0, 0.018, 0.018, 0.2, '#c89a5a', 6)); },
    fanstaff(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.58, '#d8dce4', 6); for (let i = 0; i < 7; i++) { const a = -PI * 0.35 + i * PI * 0.7 / 6; bl(mb, [0, 0.5, 0.02], [Math.sin(a), Math.cos(a), 0], 0.16, 0.06, 0.008, i % 2 ? (L.g1 || '#40a0a0') : (L.g2 || '#f0f0f0'), [0, 0, 1]); } ball(mb, 0, 0.5, 0.025, 0.02, GOLD); },
    mortar(mb, L) { xf(mb, [0, 0.0, 0.07], null, () => { lof(mb, [[-0.05, 0.05, 0.05], [0.0, 0.075, 0.075], [0.05, 0.08, 0.08]], '#9a9a90', { sides: 10, capTop: false }); cyl(mb, 0, 0.03, 0, 0.065, 0.065, 0.004, '#5a8a3a', 10); xf(mb, [0.02, 0.03, 0.0], [0, 0, -0.5], () => { cyl(mb, 0, 0, 0, 0.016, 0.022, 0.13, '#c8c4b8', 6); }); }); },
  });
  Object.assign(GRIP, {
    bodyboard: HELD, surfboard: HELD, speargun: GUN, musket: GUN, flintpistol: GUN,
    shovel: POLE, firebrand: STAFF, chisel: HAFT, elemstaff: STAFF, plug: HELD, lightningrod: STAFF, nethercore: STAFF,
    lifering: HELD, flare: HELD, flail: HAFT, fanstaff: STAFF, mortar: HELD,
  });
  Object.assign(OFFHAND, { flintpistol: (mb, L, g) => WEAPONS.flintpistol(mb, L, g, -0.02), chisel: (mb, L, g) => WEAPONS.chisel(mb, L, g, true) });
  Object.assign(EXTRAS, {
    sixwings: { bone: 'torso', build(mb, L) {   // the Seraph's six white feathered wings
      [1, -1].forEach(s => [[0.75, 0.36, 7], [0.25, 0.3, 6], [-0.35, 0.22, 5]].forEach(([tilt, len, n]) => { for (let k = 0; k < n; k++) { const a = tilt - 0.5 + k * 0.18; bl(mb, [s * 0.07, 0.34, -0.22], [s * Math.cos(a), Math.sin(a), -0.4], len * (0.6 + Math.sin(k / (n - 1) * PI) * 0.4), 0.07, 0.014, k % 2 ? '#f8f6f0' : '#e8e4d8', [0, 0, 1], '#fff8e0'); } }));
    } },
  });

  Object.assign(HATS, {
    // ---- Red Mage
    fencingmask(mb, L) { // the Fencer's mesh mask over its face, a white bib below
      const m = '#3a3e48';
      lof(mb, [[0.02, 0.2, 0.2, 0.06], [0.14, 0.235, 0.235, 0.05], [0.3, 0.235, 0.235, 0.04], [0.4, 0.19, 0.19, 0.02]], m, { sides: 14, arc: [PI * 0.08, PI * 0.92], capTop: false, capBottom: false });
      for (let k = 0; k < 5; k++) sw(mb, [[-0.2, 0.08 + k * 0.06, 0.2], [0, 0.08 + k * 0.06, 0.296], [0.2, 0.08 + k * 0.06, 0.2]], 0.005, '#8a8e98', { sides: 3 });
      for (let k = -2; k <= 2; k++) { const x = k * 0.07; sw(mb, [[x, 0.03, 0.27 - Math.abs(k) * 0.02], [x, 0.2, 0.298 - Math.abs(k) * 0.02], [x, 0.36, 0.26 - Math.abs(k) * 0.02]], 0.005, '#8a8e98', { sides: 3 }); }
      lof(mb, [[-0.02, 0.17, 0.15, 0.1], [0.04, 0.22, 0.2, 0.08]], WHITE, { arc: [PI * 0.1, PI * 0.9] });
      bandOf(mb, 0.3, 0.025, '#2a2a30', 0.02);
    },
    domino(mb, L) {    // the Spellsword's purple domino mask and a tilted beret with a plume
      const c = L.g1 || '#5a1a3a';
      xf(mb, [0, 0.245, 0.232], null, () => { pan(mb, [[-0.15, 0.03], [-0.02, 0.02], [0, 0.0], [0.02, 0.02], [0.15, 0.03], [0.14, -0.035], [0.02, -0.03], [-0.02, -0.03], [-0.14, -0.035]], 0, 0.012, c); [1, -1].forEach(s => el(mb, s * 0.075, 0.0, 0.008, 0.03, 0.014, 0.004, '#141418', 6, 3)); });
      xf(mb, [0.04, 0.39, -0.02], [0, 0, -0.25], () => { el(mb, 0, 0, 0, 0.22, 0.06, 0.21, c, 10, 5); ball(mb, 0, 0.05, 0, 0.018, L.g2 || GOLD); });
      bl(mb, [-0.12, 0.42, -0.06], [-0.5, 1, -0.6], 0.24, 0.05, 0.01, L.g2 || '#e8c040', [1, 0, 0], WHITE);
    },
    runecirclet(mb, L, g) { // the Rune Knight's silver brow plate and three glowing runes floating round its head
      const r = L.g2 || '#60e0ff';
      lof(mb, [hed(0.27, 0.02), hed(0.33, 0.022)], '#b8bcc8', { sides: 12, arc: [-PI * 0.1, PI * 1.1] });
      xf2(mb, g, [0, 0.31, 0.235], [-0.2, 0, 0], () => { pan(mb, [[0, 0.07], [0.04, 0.0], [0, -0.03], [-0.04, 0.0]], 0, 0.012, '#d8dce4'); pan(g, [[0, 0.05], [0.02, 0.0], [0, -0.015], [-0.02, 0.0]], 0.008, 0.004, r); });
      [-0.7, 0.0, 0.7].forEach((a, k) => xf(g, [Math.sin(a) * 0.3, 0.52 + (k % 2) * 0.04, Math.cos(a) * 0.12 - 0.05], [0, a, 0.2 * (k - 1)], () => { bx(g, 0, 0, 0, 0.05, 0.07, 0.008, r); }));
    },
    artberet(mb, L) {  // the Painter's big floppy beret, splashed with paint, a brush tucked over one ear
      const c = L.g1 || '#c03040';
      xf(mb, [0.05, 0.39, -0.01], [0, 0, -0.2], () => { el(mb, 0, 0, 0, 0.26, 0.07, 0.25, c, 12, 5); cyl(mb, 0, 0.05, 0, 0.012, 0.006, 0.04, sh(c, -0.2), 6); });
      [['#40a0ff', 0.12, 0.43, 0.12], ['#ffd030', -0.06, 0.45, 0.16], ['#40c060', 0.2, 0.41, -0.04]].forEach(([cc, x, y, z]) => el(mb, x, y, z, 0.035, 0.012, 0.03, cc, 6, 3));
      xf(mb, [-0.2, 0.3, 0.05], [0.2, 0, 0.9], () => { cyl(mb, 0, -0.1, 0, 0.01, 0.01, 0.2, '#c89a5a', 6); cyl(mb, 0, 0.1, 0, 0.014, 0.004, 0.05, '#40a0ff', 6); });
    },
    pictohat(mb, L, g) { // the Pictomancer's wide hat, paint dripping from its brim, a great brush for a plume
      const c = L.g1 || '#2a2a4a';
      xf(mb, [0, 0.32, 0], [0.05, 0, 0.1], () => cyl(mb, 0, 0, 0, 0.38, 0.36, 0.02, sh(c, -0.1), 16));
      lof(mb, [hed(0.32, 0.012), [0.44, 0.19, 0.18], [0.5, 0.13, 0.12], [0.52, 0.001]], c);
      ['#ff4060', '#ffd030', '#40c0ff', '#60e070', '#c070ff'].forEach((cc, k) => { const a = PI * 0.3 + k * PI * 0.35; sw(mb, [[Math.cos(a) * 0.34, 0.33 + Math.cos(a) * 0.035, Math.sin(a) * 0.34], [Math.cos(a) * 0.35, 0.27 + Math.cos(a) * 0.035, Math.sin(a) * 0.35]], [0.016, 0.01], cc, { sides: 4 }); });
      xf2(mb, g, [0.16, 0.44, -0.04], [0.5, 0, -0.6], () => { cyl(mb, 0, 0, 0, 0.014, 0.014, 0.26, '#c89a5a', 6); bx(mb, 0, 0.27, 0, 0.04, 0.03, 0.03, '#b8bcc8'); cyl(g, 0, 0.28, 0, 0.026, 0.004, 0.09, L.g2 || '#ff60a0', 6); });
    },
    monocle(mb, L, g) { // the Arcanist's neat parted hair and a monocle on a gold chain
      const c = '#5a4a3a';
      hairOf(mb, c, 0.46, true);
      bl(mb, [0.03, 0.4, 0.15], [-0.8, -0.3, 0.3], 0.2, 0.1, 0.03, c, null);
      sw(mb, loop(0.075, 0.24, 0.238, 0.045, 12, 'xy'), 0.008, GOLD, { sides: 4 }); el(g, 0.075, 0.24, 0.236, 0.04, 0.04, 0.004, '#d0f0ff', 8, 3);
      sw(mb, [[0.115, 0.22, 0.236], [0.17, 0.15, 0.2], [0.2, 0.06, 0.16], [0.2, 0.0, 0.14]], 0.004, GOLD, { sides: 3 });
    },
    quillcap(mb, L) {  // the Scholar's soft academic cap, a gold tassel and a quill pen tucked in
      const c = L.g1 || '#3a3a6a';
      el(mb, 0.02, 0.4, -0.01, 0.25, 0.07, 0.24, c, 12, 5);
      bandOf(mb, 0.32, 0.04, sh(c, -0.2), 0.016);
      sw(mb, [[0.02, 0.46, -0.01], [0.15, 0.44, 0.08], [0.2, 0.34, 0.12]], 0.007, L.g2 || GOLD, { sides: 4 }); cyl(mb, 0.2, 0.28, 0.12, 0.02, 0.006, 0.06, L.g2 || GOLD, 6);
      bl(mb, [-0.16, 0.36, 0.08], [-0.4, 1, -0.5], 0.26, 0.06, 0.008, WHITE, [1, 0, 0], '#d8d8e0');
    },
    rabbithat(mb, L) { // the Trickster's tall top hat, a white rabbit peeping out of the top
      const c = L.g1 || '#1a1a26';
      cyl(mb, 0, 0.38, 0, 0.27, 0.27, 0.018, c, 14);
      cyl(mb, 0, 0.38, 0, 0.17, 0.18, 0.28, c, 12, false, false);
      cyl(mb, 0, 0.42, 0, 0.172, 0.175, 0.045, L.g2 || '#c02838', 12);
      el(mb, 0, 0.71, 0.02, 0.1, 0.08, 0.09, WHITE, 8, 5);
      [1, -1].forEach(s => { bl(mb, [s * 0.04, 0.77, 0.0], [s * 0.3, 1, -0.1], 0.16, 0.055, 0.02, WHITE, [0, 0, 1]); bl(mb, [s * 0.04, 0.77, 0.012], [s * 0.3, 1, -0.1], 0.11, 0.028, 0.006, '#f0a0b8', [0, 0, 1]); ball(mb, s * 0.035, 0.73, 0.1, 0.012, '#c02838', 4); });
      ball(mb, 0, 0.705, 0.11, 0.012, '#f0a0b8', 4);
    },
    halfmask(mb, L, g) { // the Illusionist's tall starry hat and a silver mask over half its face
      const c = L.g1 || '#4a2a7a';
      cyl(mb, 0, 0.33, 0, 0.32, 0.31, 0.018, sh(c, -0.12), 14);
      lof(mb, [hed(0.33, 0.012), [0.55, 0.15, 0.14, -0.03, 0.03], [0.75, 0.07, 0.07, -0.08, -0.03], [0.86, 0.001, 0.001, -0.14, 0.05]], c);
      [[0.1, 0.45, 0.13], [-0.09, 0.55, 0.08], [0.04, 0.66, 0.0], [-0.13, 0.42, 0.1]].forEach(([x, y, z]) => ball(g, x, y, z, 0.016, L.g2 || '#80f0e0', 4));
      lof(mb, [hed(0.15, 0.022), hed(0.33, 0.02)], '#d8dce8', { arc: [PI * 0.0, PI * 0.5] });
      el(mb, 0.075, 0.245, 0.24, 0.035, 0.016, 0.006, '#141418', 6, 3);
    },
    greenhat(mb, L) {  // the Green Mage's floppy pointed hat, a leaf on its band and a curling tip
      const c = L.g1 || '#3a8a3a';
      cyl(mb, 0, 0.32, 0, 0.3, 0.29, 0.018, sh(c, -0.12), 14);
      lof(mb, [hed(0.32, 0.012), [0.5, 0.16, 0.15, -0.02], [0.64, 0.08, 0.08, -0.08, 0.04], [0.7, 0.03, 0.03, -0.16, 0.1], [0.68, 0.001, 0.001, -0.22, 0.14]], c);
      bandOf(mb, 0.33, 0.03, L.g2 || '#e8d070', 0.02);
      bl(mb, [0.15, 0.35, 0.13], [0.6, 0.6, 0.6], 0.12, 0.07, 0.01, '#7ad050', [0, 0, 1]); bl(mb, [0.15, 0.35, 0.13], [0.9, 0.2, 0.3], 0.09, 0.05, 0.01, '#5ab040', [0, 0, 1]);
    },
    // ---- Summoner
    coinscarf(mb, L) { // the Medium's headscarf tied behind, a row of gold coins hanging over the brow
      const c = L.g1 || '#6a2a7a';
      lof(mb, [hed(0.25, 0.022), [0.38, 0.24, 0.23], [0.45, 0.15, 0.14], [0.47, 0.001]], c, { sides: 12 });
      for (let i = 0; i < 9; i++) { const a = PI * 0.15 + i * PI * 0.7 / 8, r = hed(0.27, 0.03); xf(mb, [Math.cos(a) * r[1], 0.26, Math.sin(a) * r[2]], [0, -a + PI / 2, 0], () => zcyl(mb, 0, 0, -0.004, 0.018, 0.018, 0.008, L.g2 || GOLD, 8)); }
      ball(mb, 0, 0.3, -0.24, 0.04, sh(c, -0.1)); [1, -1].forEach(s => bl(mb, [s * 0.02, 0.29, -0.25], [s * 0.4, -1, -0.5], 0.16, 0.06, 0.01, c, [1, 0, 0]));
    },
    spiritmask(mb, L, g) { // the Shaman's carved wooden spirit mask, feathers rising from its crown
      const w = L.g1 || '#7a4a2a';
      xf2(mb, g, [0, 0.22, 0.2], null, () => { el(mb, 0, 0, 0.0, 0.2, 0.25, 0.08, w, 10, 6); [1, -1].forEach(s => { el(mb, s * 0.075, 0.04, 0.07, 0.04, 0.03, 0.012, '#141418', 6, 3); ball(g, s * 0.075, 0.04, 0.08, 0.012, L.g2 || '#40d0c0', 4); bx(mb, s * 0.12, -0.08, 0.06, 0.02, 0.08, 0.01, L.g2 || '#40d0c0'); }); el(mb, 0, -0.1, 0.07, 0.06, 0.02, 0.01, '#141418', 6, 3); bx(mb, 0, 0.13, 0.065, 0.12, 0.02, 0.01, '#c03030'); });
      for (let k = 0; k < 5; k++) bl(mb, [(k - 2) * 0.05, 0.44, 0.14], [(k - 2) * 0.25, 1, -0.1], 0.18 - Math.abs(k - 2) * 0.02, 0.05, 0.01, k % 2 ? WHITE : '#c03030', [0, 0, 1], '#2a2a2a');
    },
    raincloud(mb, L, g) { // the Rainmaker's own little rain cloud, floating over its head
      [[0, 0.66, 0, 0.09], [0.09, 0.64, 0.02, 0.07], [-0.09, 0.64, -0.01, 0.075], [0.04, 0.7, -0.04, 0.07], [-0.04, 0.69, 0.05, 0.065]].forEach(([x, y, z, r]) => ball(mb, x, y, z, r, '#b8c0cc', 8));
      [[0.06, 0.55, 0.03], [-0.07, 0.53, 0.0], [0.0, 0.5, -0.05], [0.1, 0.5, -0.03], [-0.03, 0.56, 0.07]].forEach(([x, y, z]) => xf(g, [x, y, z], [PI, 0, 0], () => cyl(g, 0, 0, 0, 0.012, 0.0, 0.035, '#60a0ff', 4)));
    },
    wavecrown(mb, L, g) { // the Hydromancer's crown of curling waves, a pearl at its front
      const c = L.g2 || '#60e0ff', d = L.g1 || '#1a5a9a';
      bandOf(mb, 0.29, 0.04, d, 0.02);
      for (let i = 0; i < 7; i++) { const a = PI * 0.1 + i * PI * 0.8 / 6, r = hed(0.32, 0.02), x = Math.cos(a) * r[1], z = Math.sin(a) * r[2]; curve(mb, [[x, 0.32, z], [x * 1.05, 0.42, z * 1.05], [x * 0.9, 0.48, z * 0.9 + 0.03], [x * 0.85, 0.44, z * 0.85 + 0.05]], 0.03, 0.006, i % 2 ? c : WHITE); }
      ball(g, 0, 0.31, 0.25, 0.024, '#f4f0ff', 6);
    },
    // ---- Time Mage
    nightcap(mb, L, g) { // the Stargazer's starry nightcap, its long tip flopping down behind
      const c = L.g1 || '#2a3a7a';
      lof(mb, [hed(0.27, 0.02), hed(0.31, 0.022), [0.4, 0.22, 0.21, -0.02], [0.47, 0.13, 0.12, -0.06]], c, { sides: 12, capTop: false });
      sw(mb, [[0, 0.47, -0.06], [0.03, 0.5, -0.16], [0.08, 0.42, -0.26], [0.12, 0.3, -0.28]], [0.12, 0.08, 0.05, 0.02], c);
      ball(mb, 0.12, 0.28, -0.28, 0.035, L.g2 || '#ffe060');
      [[0.12, 0.38, 0.17], [-0.15, 0.4, 0.12], [0.0, 0.45, 0.06], [0.18, 0.36, -0.08]].forEach(([x, y, z]) => xf(g, [x, y, z], [0, Math.atan2(x, z), 0], () => pan(g, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => { const a = PI / 2 + k * PI / 5, r = k % 2 ? 0.01 : 0.024; return [Math.cos(a) * r, Math.sin(a) * r]; }), 0, 0.004, L.g2 || '#ffe060')));
    },
    observatory(mb, L) { // the Astrologist's hat like an observatory dome, its shutter open and a telescope poking out
      const c = L.g1 || '#2a2a5a';
      cyl(mb, 0, 0.32, 0, 0.27, 0.27, 0.06, sh(c, -0.1), 14);
      dome(mb, 0, 0.38, 0, 0.26, 0.22, 0.26, '#c8ccd8', 12);
      xf(mb, [0, 0.38, 0], [0.55, 0, 0], () => bx(mb, 0, 0.13, 0.08, 0.08, 0.22, 0.2, '#1a1a2a'));
      xf(mb, [0, 0.52, 0.06], [-0.9, 0, 0], () => { cyl(mb, 0, 0, 0, 0.032, 0.04, 0.22, L.g2 || GOLD, 8); });
    },
    skyseer(mb, L, g) { // the Skyseer's sky-blue headdress, white wings at its sides and a gold star
      const c = '#8ac0f0';
      hood(mb, c, 0.5, [PI * 0.66, PI * 2.34]);
      [1, -1].forEach(s => { for (let k = 0; k < 4; k++) bl(mb, [s * 0.24, 0.34, -0.04], [s * 0.6, 0.9 - k * 0.3, -0.5], 0.2 - k * 0.03, 0.06, 0.012, k % 2 ? '#e8f0fa' : WHITE, [0, 0, 1]); });
      xf(g, [0, 0.36, 0.245], [-0.2, 0, 0], () => pan(g, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => { const a = PI / 2 + k * PI / 5, r = k % 2 ? 0.016 : 0.04; return [Math.cos(a) * r, Math.sin(a) * r]; }), 0, 0.008, L.g2 || '#ffe080'));
    },
    fishbowl(mb, L, g) { // the Space Cadet's glass fishbowl helmet: a gleaming hoop and a sealed collar
      sw(g, loop(0, 0.22, 0.01, 0.3, 24, 'xy', 0.32), 0.006, '#c8f0ff', { sides: 3 });
      sw(g, loop(0, 0.22, 0.01, 0.3, 24, 'zy', 0.32), 0.006, '#c8f0ff', { sides: 3 });
      sw(g, [[-0.16, 0.42, 0.22], [-0.08, 0.48, 0.26], [0.02, 0.5, 0.27]], 0.01, WHITE, { sides: 3 });
      lof(mb, [[-0.06, 0.27, 0.26], [0.0, 0.29, 0.28]], L.g2 || '#e04040', { sides: 14 });
    },
    spacehelm(mb, L, g) { // the Astronaut's white helmet and its mirrored gold visor
      const c = L.g1 || '#f4f4f8';
      el(mb, 0, 0.23, 0, 0.29, 0.3, 0.28, c, 12, 8);
      lof(mb, [[0.08, 0.255, 0.255, 0.06], [0.22, 0.29, 0.28, 0.05], [0.36, 0.25, 0.24, 0.04]], '#d8a830', { arc: [PI * 0.18, PI * 0.82], capTop: false, capBottom: false });
      [1, -1].forEach(s => { cyl(mb, s * 0.28, 0.24, 0.0, 0.03, 0.03, 0.04, '#c8ccd4', 8); ball(g, s * 0.29, 0.3, 0.06, 0.012, s > 0 ? '#60ff80' : '#ff5050', 4); });
      lof(mb, [[-0.06, 0.27, 0.26], [0.0, 0.29, 0.28]], L.g2 || '#3a6ad0', { sides: 14 });
    },
    lunar(mb, L, g) {  // the Lunarian's long silver hair and a crescent moon on its brow
      const c = '#e0e2ec';
      hairOf(mb, c, 0.46);
      sw(mb, [[0, 0.3, -0.22], [0, 0.14, -0.28], [0.01, -0.02, -0.29], [0.02, -0.14, -0.27]], [0.08, 0.07, 0.05, 0.01], c);
      xf(g, [0, 0.42, 0.2], [-0.35, 0, PI / 2], () => { for (let k = 0; k < 8; k++) { const a = -PI * 0.75 + k * PI * 1.5 / 7, a2 = a + PI * 1.5 / 7, m = [Math.cos((a + a2) / 2) * 0.075 + 0.035, Math.sin((a + a2) / 2) * 0.075, 0]; tri(g, [Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0], [Math.cos(a2) * 0.12, Math.sin(a2) * 0.12, 0], m, L.g2 || '#c0c8ff'); tri(g, [Math.cos(a2) * 0.12, Math.sin(a2) * 0.12, 0], [Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0], m, L.g2 || '#c0c8ff'); } });
    },
    headlamp(mb, L, g) { // the Digger's headlamp on an elastic band, and a smudge of dirt
      bandOf(mb, 0.28, 0.035, '#3a3a40', 0.016);
      zcyl(mb, 0, 0.3, 0.2, 0.045, 0.05, 0.05, L.g2 || '#e8c060', 8); el(g, 0, 0.3, 0.252, 0.038, 0.038, 0.006, '#fff4b0', 8, 4);
      el(mb, -0.11, 0.18, 0.2, 0.04, 0.025, 0.02, '#8a7050', 6, 3);
    },
    pith(mb, L) {      // the Archaeologist's pith helmet with a dark band
      const c = L.g1 || '#c8b080';
      dome(mb, 0, 0.3, 0, 0.25, 0.2, 0.24, c);
      lof(mb, [[0.29, 0.25, 0.24], [0.24, 0.33, 0.33, 0.0]], sh(c, -0.06), { sides: 14 });
      bandOf(mb, 0.3, 0.035, L.g2 || '#6a4a2a', 0.024);
      ball(mb, 0, 0.5, 0, 0.022, sh(c, -0.1));
    },
    anemometer(mb, L) { // the Forecaster's cap with a spinning anemometer on top
      const c = L.g1 || '#3a8ad0';
      lof(mb, [hed(0.28, 0.014), [0.38, 0.232, 0.222], [0.44, 0.15, 0.145], [0.465, 0.001]], c, { sides: 12 });
      el(mb, 0, 0.29, 0.21, 0.15, 0.014, 0.11, sh(c, -0.18), 8, 4);
      cyl(mb, 0, 0.45, 0, 0.01, 0.01, 0.12, '#c8ccd4', 6);
      for (let k = 0; k < 3; k++) { const a = k / 3 * PI * 2; sw(mb, [[0, 0.57, 0], [Math.cos(a) * 0.09, 0.57, Math.sin(a) * 0.09]], 0.006, '#c8ccd4', { sides: 3 }); xf(mb, [Math.cos(a) * 0.1, 0.57, Math.sin(a) * 0.1], [0, -a, PI / 2], () => dome(mb, 0, 0, 0, 0.03, 0.03, 0.03, '#f0f0f0', 6)); }
    },
    umbrellahat(mb, L) { // the Meteorologist's striped umbrella hat
      const a = L.g1 || '#e04040', b = L.g2 || '#f0f0f0';
      bandOf(mb, 0.28, 0.03, '#2a2a30', 0.016);
      [1, -1].forEach(s => sw(mb, [[s * 0.2, 0.3, 0], [s * 0.1, 0.42, 0], [0, 0.48, 0]], 0.008, '#2a2a30', { sides: 3 }));
      lof(mb, [[0.44, 0.4, 0.4, 0, 0, (i) => (i % 2 ? a : b)], [0.54, 0.2, 0.2], [0.58, 0.001]], a, { sides: 10, capBottom: false });
      cyl(mb, 0, 0.57, 0, 0.012, 0.006, 0.06, '#2a2a30', 6);
    },
  });
  Object.assign(BODIES, {
    // ---- Red Mage
    fencingjacket(mb, L) { // the Fencer's padded jacket, fastened down one side, a red stripe
      const c = '#dfe6ee';
      lof(mb, [tor(0.37, 0.016), tor(0.26, 0.018), tor(0.13, 0.016), tor(0.0, 0.018), [-0.08, 0.26, 0.25]], c, { sides: 12 });
      sw(mb, [[-0.14, 0.38, 0.12], [-0.12, 0.26, 0.226], [-0.14, 0.1, 0.25], [-0.17, -0.02, 0.24]], 0.012, L.g2 || '#c02838', { sides: 4 });
      lof(mb, [tor(0.36, 0.02), [0.44, 0.15, 0.15]], c, { sides: 12 });
    },
    duelcoat(mb, L) {  // the Spellsword's frock coat with gold trim and a white jabot
      const c = L.g1 || '#5a1a3a', gd = L.g2 || GOLD;
      lof(mb, [tor(0.37, 0.018), tor(0.26, 0.02), tor(0.12, 0.022), tor(0.0, 0.026), [-0.14, 0.3, 0.29]], c, { arc: [PI * 0.6, PI * 2.4], sides: 12 });
      [1, -1].forEach(s => sw(mb, [0.36, 0.24, 0.12, 0.0].map(y => { const r = tor(y, 0.024); return [s * r[1] * 0.36, y, r[2] * 0.92]; }), 0.008, gd, { sides: 4 }));
      for (let k = 0; k < 4; k++) bl(mb, [0, 0.39 - k * 0.025, 0.17 + k * 0.02], [0, -0.6, 1], 0.05, 0.08 - k * 0.01, 0.01, WHITE, [1, 0, 0]);
    },
    runeplate(mb, L, g) { // the Rune Knight's light armor traced with glowing runes
      const c = L.g1 || '#2a3a6a', r = L.g2 || '#60e0ff';
      BODIES.armor(mb, { g1: sh(c, -0.2), g2: c });
      [1, -1].forEach(s => { el(mb, s * 0.22, 0.36, 0.02, 0.1, 0.06, 0.1, sh(c, 0.15), 8, 4); [0.08, 0.13, 0.22].forEach(y => { const t = tor(y, 0.03); bx(g, s * t[1] * 0.55, y, t[2] * 0.82, 0.03, 0.012, 0.004, r); }); bx(g, s * 0.26, 0.38, 0.06, 0.006, 0.04, 0.04, r); });
      lof(mb, [tor(0.02, 0.02), [-0.1, 0.27, 0.26]], sh(c, -0.1), { sides: 12 });
    },
    paintsmock(mb, L) { // the Painter's loose smock, splattered all over, a red bow at the neck
      const c = '#cfe0f0';
      lof(mb, [tor(0.37, 0.016), tor(0.26, 0.018), tor(0.12, 0.02), [-0.04, 0.29, 0.28], [-0.13, 0.31, 0.3]], c, { sides: 12 });
      [['#ff4060', 0.15, 0.3], ['#ffd030', -0.18, 0.24], ['#40c060', 0.2, 0.04], ['#4080ff', -0.1, -0.06], ['#c070ff', 0.04, -0.1], ['#ff8030', -0.22, 0.08]].forEach(([cc, x, y]) => { const r = tor(y, 0.024); el(mb, x, y, Math.sqrt(Math.max(0, 1 - x * x / (r[1] * r[1]))) * r[2], 0.03, 0.022, 0.008, cc, 6, 3); });
      [1, -1].forEach(s => bl(mb, [0, 0.38, 0.17], [s, 0.2, 0.3], 0.07, 0.06, 0.02, L.g1 || '#c03040', [0, 1, 0])); ball(mb, 0, 0.38, 0.17, 0.022, L.g1 || '#c03040');
    },
    pictocoat(mb, L, g) { // the Pictomancer's long coat, its hem banded in every color, paint pots at the belt
      const c = L.g1 || '#2a2a4a', rb = ['#ff4060', '#ffd030', '#60e070', '#40c0ff', '#c070ff'];
      lof(mb, [tor(0.37, 0.018), tor(0.26, 0.02), tor(0.12, 0.024), tor(0.0, 0.026), [-0.1, 0.29, 0.28]], c, { arc: OPEN, sides: 12 });
      lof(mb, [[-0.1, 0.292, 0.282], [-0.15, 0.31, 0.3]], c, { arc: OPEN, sides: 15 }); lof(mb, [[-0.15, 0.312, 0.302], [-0.17, 0.314, 0.304, 0, 0, (i) => rb[i % 5]]].reverse(), c, { arc: OPEN, sides: 15 });
      lof(mb, [tor(0.03, 0.03), tor(0.07, 0.03)], '#5a3a20', { arc: OPEN });
      [0.75, 1.0, 1.25].forEach((a, k) => { const r = tor(0.04, 0.05); xf2(mb, g, [Math.cos(PI * a) * r[1], 0.0, Math.sin(PI * a) * r[2]], null, () => { cyl(mb, 0, -0.03, 0, 0.025, 0.025, 0.05, '#e8e4dc', 8); cyl(g, 0, 0.02, 0, 0.022, 0.022, 0.006, rb[k + 1], 8); }); });
    },
    magiccape(mb, L) { // the Trickster's black cape lined in red, a white collar and a red bow tie
      const c = L.g1 || '#1a1a26', r = L.g2 || '#c02838';
      capeOf(mb, c, -0.12, 0.05);
      xf(mb, [0, 0, 0.012], null, () => capeOf(mb, r, -0.12, 0.035));
      lof(mb, [tor(0.36, 0.02), [0.46, 0.22, 0.21, -0.02]], c, { arc: [PI * 0.8, PI * 2.2] });
      [1, -1].forEach(s => { tri(mb, [0, 0.36, 0.2], [s * 0.07, 0.39, 0.18], [s * 0.07, 0.33, 0.21], r); tri(mb, [0, 0.38, 0.19], [s * 0.06, 0.41, 0.16], [s * 0.05, 0.36, 0.2], WHITE); });
      ball(mb, 0, 0.36, 0.205, 0.016, sh(r, -0.2));
    },
    // ---- Summoner
    fringe(mb, L) {    // the Medium's fringed shawl over its shoulders and a long string of beads
      const c = L.g1 || '#6a2a7a';
      lof(mb, [[0.43, 0.13, 0.13], tor(0.36, 0.032), tor(0.26, 0.045), tor(0.18, 0.05)], c, { sides: 12 });
      for (let i = 0; i < 24; i++) { const a = i / 24 * PI * 2, r = tor(0.18, 0.05); sw(mb, [[Math.cos(a) * r[1], 0.18, Math.sin(a) * r[2]], [Math.cos(a) * r[1] * 1.02, 0.1, Math.sin(a) * r[2] * 1.02]], 0.006, L.g2 || GOLD, { sides: 3 }); }
      for (let i = 0; i < 9; i++) { const a = PI * 0.25 + i * PI * 0.5 / 8; ball(mb, Math.cos(a) * 0.17, 0.12 - Math.sin(a) * 0.06, Math.sin(a) * 0.28, 0.015, i % 2 ? '#40c0a0' : '#e04060', 4); }
    },
    starcoat(mb, L, g) { // the Skyseer's long robe sprinkled with gold stars, a pale blue mantle
      const c = L.g1 || '#2a4a8a';
      BODIES.robe(mb, { g1: c, g2: L.g2 || '#ffe080' });
      lof(mb, [[0.43, 0.14, 0.14], tor(0.36, 0.03), tor(0.27, 0.045)], '#8ac0f0', { sides: 12 });
      [[0.18, 0.06], [-0.2, 0.0], [0.08, -0.1], [-0.08, -0.12], [0.24, -0.08], [-0.26, -0.1]].forEach(([x, y]) => { const R = 0.3 + (0.04 - y) * 0.2; const z = Math.sqrt(Math.max(0, R * R - x * x)); xf(g, [x, y, z], [0, Math.atan2(x, z), 0], () => pan(g, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => { const a = PI / 2 + k * PI / 5, r = k % 2 ? 0.01 : 0.024; return [Math.cos(a) * r, Math.sin(a) * r]; }), 0, 0.004, L.g2 || '#ffe080')); });
    },
    // ---- Time Mage
    spacesuit(mb, L, g) { // a white space suit with colored stripes, shoulder patches and a control box
      const c = L.g1 || '#f0f0f4', s2 = L.g2 || '#e04040';
      lof(mb, [[-0.1, 0.21, 0.2], tor(0.0, 0.022), tor(0.13, 0.02), tor(0.26, 0.022), tor(0.36, 0.022)], c, { sides: 12 });
      lof(mb, [tor(0.27, 0.026), tor(0.3, 0.026)], s2, { sides: 12 });
      [1, -1].forEach(s => { el(mb, s * 0.21, 0.35, 0.02, 0.09, 0.06, 0.09, sh(c, -0.06), 8, 4); el(mb, s * 0.24, 0.3, 0.05, 0.03, 0.03, 0.01, s2, 6, 3); });
      const r = tor(0.0, 0.03); bx(mb, 0, 0.0, r[2] + 0.01, 0.14, 0.06, 0.03, '#c8ccd4'); [-0.04, 0, 0.04].forEach((x, k) => ball(g, x, 0.0, r[2] + 0.027, 0.01, ['#ff5050', '#ffd040', '#60ff80'][k], 4));
      lof(mb, [tor(-0.05, 0.028), tor(-0.02, 0.028)], '#8a8e96', { sides: 12 });
    },
    safari(mb, L) {    // the Archaeologist's khaki safari jacket, four flapped pockets and a belt
      const c = L.g1 || '#c8b080';
      lof(mb, [tor(0.37, 0.018), tor(0.26, 0.02), tor(0.12, 0.02), tor(0.0, 0.024), [-0.1, 0.27, 0.26]], c, { arc: [PI * 0.56, PI * 2.44], sides: 12 });
      [[0.14, 0.28], [-0.14, 0.28], [0.15, 0.04], [-0.15, 0.04]].forEach(([x, y]) => { const r = tor(y, 0.026); const z = Math.sqrt(Math.max(0, 1 - x * x / (r[1] * r[1]))) * r[2]; xf(mb, [x, y, z], [0, Math.atan2(x, z), 0], () => { bx(mb, 0, 0, 0, 0.07, 0.07, 0.01, sh(c, -0.06)); bx(mb, 0, 0.03, 0.006, 0.072, 0.02, 0.01, sh(c, -0.14)); }); });
      lof(mb, [tor(0.08, 0.026), tor(0.12, 0.026)], L.g2 || '#6a4a2a', { arc: [PI * 0.56, PI * 2.44] });
    },
  });
  Object.assign(WEAPONS, {
    // ---- Red Mage
    foil(mb, L) { cyl(mb, 0, 0.06, 0.02, 0.006, 0.004, 0.46, '#e8ecf4', 4); ball(mb, 0, 0.52, 0.02, 0.012, '#2a2a30', 4); xf(mb, [0, 0.06, 0.02], [PI, 0, 0], () => dome(mb, 0, 0, 0, 0.055, 0.035, 0.055, '#c8ccd4', 10)); bx(mb, 0, 0.0, 0.02, 0.026, 0.1, 0.026, '#2a2a30'); },
    runesword(mb, L, g) { bx(mb, 0, 0.3, 0.02, 0.07, 0.48, 0.016, '#c8ccd8'); tri(mb, [-0.035, 0.54, 0.02], [0.035, 0.54, 0.02], [0, 0.62, 0.02], '#c8ccd8'); for (let k = 0; k < 5; k++) bx(g, 0, 0.12 + k * 0.08, 0.03, k % 2 ? 0.03 : 0.018, 0.035, 0.003, L.g2 || '#60e0ff'); bx(mb, 0, 0.04, 0.02, 0.18, 0.03, 0.04, L.g1 || '#2a3a6a'); bx(mb, 0, -0.03, 0.02, 0.035, 0.1, 0.035, '#3a2418'); ball(g, 0, -0.09, 0.02, 0.02, L.g2 || '#60e0ff', 4); },
    paintbrush(mb, L, g, off) { if (off) { xf(mb, [0, -0.02, 0.07], [PI / 2 - 0.4, 0, 0], () => { el(mb, 0, 0, 0, 0.11, 0.08, 0.012, '#c89a5a', 10, 4); ['#ff4060', '#ffd030', '#40a0ff', '#40c060'].forEach((cc, k) => { const a = k * 0.9 - 0.3; el(mb, Math.cos(a) * 0.07, Math.sin(a) * 0.045, 0.01, 0.018, 0.014, 0.006, cc, 6, 3); }); }); return; } cyl(mb, 0, -0.06, 0.02, 0.012, 0.012, 0.36, '#c89a5a', 6); cyl(mb, 0, 0.3, 0.02, 0.016, 0.016, 0.03, '#b8bcc8', 6); cyl(mb, 0, 0.33, 0.02, 0.018, 0.003, 0.07, L.g1 || '#c03040', 6); },
    magicbrush(mb, L, g) { cyl(mb, 0, -0.08, 0.02, 0.018, 0.018, 0.56, '#3a2418', 6); cyl(mb, 0, 0.48, 0.02, 0.026, 0.026, 0.04, GOLD, 8); ['#ff4060', '#ffd030', '#40c0ff', '#60e070'].forEach((cc, k) => cyl(g, 0, 0.52 + k * 0.03, 0.02, 0.032 - k * 0.006, 0.026 - k * 0.006, 0.03, cc, 8)); ball(g, 0, 0.66, 0.02, 0.012, L.g2 || '#ff60a0', 4); },
    grimoire(mb, L, g) { xf(mb, [0, 0.04, 0.08], [-0.5, 0, 0], () => { [1, -1].forEach(s => xf(mb, [0, 0, 0], [0, s * 0.35, 0], () => { bx(mb, s * 0.065, 0, 0, 0.13, 0.16, 0.012, L.g1 || '#2a6a5a'); bx(mb, s * 0.062, 0, 0.008, 0.12, 0.15, 0.006, '#f4ecd8'); })); }); xf(g, [0, 0.14, 0.12], [-0.5, 0, 0], () => { sw(g, loop(0, 0, 0, 0.05, 10, 'xz'), 0.006, L.g2 || GOLD, { sides: 3 }); ball(g, 0, 0.0, 0, 0.016, L.g2 || '#e8c040', 4); }); },
    wand(mb, L) { cyl(mb, 0, -0.02, 0.02, 0.012, 0.012, 0.26, '#141418', 6); cyl(mb, 0, 0.2, 0.02, 0.013, 0.013, 0.05, WHITE, 6); cyl(mb, 0, -0.04, 0.02, 0.013, 0.013, 0.03, WHITE, 6); },
    mirror(mb, L, g) { cyl(mb, 0, -0.04, 0.04, 0.014, 0.014, 0.14, '#c8ccd4', 6); xf2(mb, g, [0, 0.18, 0.04], null, () => { sw(mb, loop(0, 0, 0, 0.07, 14, 'xy', 0.09), 0.012, '#d8dce4', { sides: 4 }); el(g, 0, 0, 0.0, 0.066, 0.086, 0.006, L.g2 || '#80f0e0', 10, 4); }); },
    leafrod(mb, L, g) { cyl(mb, 0, -0.06, 0.02, 0.014, 0.014, 0.44, '#7a5030', 6); [[0.6, 0.5], [-0.6, 0.5], [0, 1]].forEach(([dx, dy]) => bl(mb, [0, 0.36, 0.02], [dx, dy, 0], 0.14, 0.08, 0.01, '#5ab040', [0, 0, 1])); ball(g, 0, 0.4, 0.04, 0.032, '#a0ff80', 6); },
    // ---- Summoner
    candle(mb, L, g) { cyl(mb, 0, -0.02, 0.05, 0.05, 0.03, 0.02, L.g2 || GOLD, 10); cyl(mb, 0, 0.0, 0.05, 0.012, 0.012, 0.04, L.g2 || GOLD, 6); cyl(mb, 0, 0.04, 0.05, 0.028, 0.028, 0.012, L.g2 || GOLD, 10); cyl(mb, 0, 0.05, 0.05, 0.02, 0.02, 0.11, '#f4ecd8', 8); xf(g, [0, 0.17, 0.05], null, () => { el(g, 0, 0.025, 0, 0.018, 0.035, 0.018, '#ffb040', 6, 4); el(g, 0, 0.02, 0, 0.01, 0.02, 0.01, '#fff4c0', 6, 3); }); sw(mb, [[0.05, 0.0, 0.05], [0.09, 0.03, 0.05], [0.07, 0.07, 0.05]], 0.007, L.g2 || GOLD, { sides: 4 }); },
    rattle(mb, L) { cyl(mb, 0, -0.04, 0.02, 0.014, 0.014, 0.18, '#7a5030', 6); el(mb, 0, 0.2, 0.02, 0.06, 0.075, 0.06, '#c8904a', 8, 5); [0.17, 0.23].forEach(y => lof(mb, [[y, 0.062, 0.062, 0.02], [y + 0.012, 0.062, 0.062, 0.02]], '#c03030', { sides: 8 })); [1, -1].forEach(s => bl(mb, [s * 0.02, 0.13, 0.02], [s * 0.5, -1, 0], 0.1, 0.03, 0.006, WHITE, [0, 0, 1], '#2a2a2a')); },
    umbrella(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.01, 0.01, 0.6, '#2a2a30', 6); sw(mb, [[0, -0.08, 0.02], [0.0, -0.12, 0.02], [0.04, -0.13, 0.02]], 0.01, '#5a3a20', { sides: 4 }); lof(mb, [[0.42, 0.28, 0.28, 0.02, 0, (i) => (i % 2 ? (L.g1 || '#4a7ad0') : (L.g2 || '#ffd040'))], [0.5, 0.18, 0.18, 0.02], [0.54, 0.001, 0.001, 0.02]], L.g1 || '#4a7ad0', { sides: 8, capBottom: false }); },
    trident(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.015, 0.015, 0.62, L.g2 || '#60e0ff', 6); bx(mb, 0, 0.53, 0.02, 0.14, 0.02, 0.02, '#c8ccd4'); [-1, 0, 1].forEach(k => { sw(mb, [[k * 0.065, 0.53, 0.02], [k * 0.07, 0.62, 0.02]], 0.01, '#c8ccd4', { sides: 4 }); spk(mb, [k * 0.07, 0.62, 0.02], [0, 1, 0], 0.05, 0.016, '#d8dce4', 4); }); },
    // ---- Time Mage
    telescope(mb, L) { xf(mb, [0, 0.04, 0.06], [-0.7, 0, 0], () => { cyl(mb, 0, -0.06, 0, 0.022, 0.022, 0.1, '#a07040', 8); cyl(mb, 0, 0.04, 0, 0.03, 0.03, 0.1, L.g2 || GOLD, 8); cyl(mb, 0, 0.14, 0, 0.038, 0.038, 0.09, '#a07040', 8); cyl(mb, 0, 0.23, 0, 0.042, 0.042, 0.012, L.g2 || GOLD, 8); }); },
    astrolabe(mb, L, g) { const gd = L.g2 || GOLD; cyl(mb, 0, -0.08, 0.02, 0.014, 0.014, 0.52, '#3a2418', 6); xf2(mb, g, [0, 0.52, 0.02], null, () => { sw(mb, loop(0, 0, 0, 0.09, 16, 'xy'), 0.008, gd, { sides: 4 }); sw(mb, loop(0, 0, 0, 0.09, 16, 'zy'), 0.008, gd, { sides: 4 }); xf(mb, [0, 0, 0], [0.4, 0, 0.3], () => sw(mb, loop(0, 0, 0, 0.075, 14, 'xz'), 0.007, sh(gd, -0.15), { sides: 4 })); ball(g, 0, 0, 0, 0.028, '#ffe880', 6); }); },
    starglobe(mb, L, g) { cyl(mb, 0, -0.08, 0.02, 0.015, 0.015, 0.56, '#d8dce4', 6); xf2(mb, g, [0, 0.55, 0.02], null, () => { ball(g, 0, 0, 0, 0.06, '#80c0ff', 8); xf(mb, [0, 0, 0], [0.5, 0, 0.3], () => sw(mb, loop(0, 0, 0, 0.085, 16, 'xz'), 0.008, L.g2 || '#ffe080', { sides: 4 })); [[0.1, 0.06, 0], [-0.08, -0.05, 0.05], [0.0, 0.1, -0.06]].forEach(([x, y, z]) => ball(g, x, y, z, 0.012, '#fff4c0', 4)); }); },
    raygun(mb, L, g) { zcyl(mb, 0, 0.05, -0.02, 0.03, 0.022, 0.12, '#c8ccd4', 8); zcyl(mb, 0, 0.05, 0.1, 0.022, 0.012, 0.06, '#c8ccd4', 8); [0.0, 0.04].forEach(z => xf(mb, [0, 0.05, z], null, () => sw(mb, loop(0, 0, 0, 0.034, 10, 'xy'), 0.006, L.g2 || '#e04040', { sides: 3 }))); ball(g, 0, 0.05, 0.17, 0.016, '#60ff80', 6); [1, -1].forEach(s => tri(mb, [0, 0.05, -0.02], [s * 0.05, 0.08, -0.04], [0, 0.05, 0.03], L.g2 || '#e04040')); xf(mb, [0, 0.02, -0.02], [0.4, 0, 0], () => bx(mb, 0, -0.03, 0, 0.028, 0.07, 0.035, '#e04040')); },
    flag(mb, L, g) { cyl(mb, 0, -0.18, 0.02, 0.01, 0.01, 0.78, '#c8ccd4', 6); ball(mb, 0, 0.61, 0.02, 0.016, '#c8ccd4'); pan(mb, [[0.0, 0.58], [0.2, 0.58], [0.2, 0.44], [0.0, 0.44]], 0.02, 0.006, L.g2 || '#3a6ad0'); xf(mb, [0.1, 0.51, 0.026], null, () => pan(mb, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => { const a = PI / 2 + k * PI / 5, r = k % 2 ? 0.012 : 0.03; return [Math.cos(a) * r, Math.sin(a) * r]; }), 0, 0.004, WHITE)); },
    moonstaff(mb, L, g) { cyl(mb, 0, -0.08, 0.02, 0.015, 0.015, 0.58, '#d8dce4', 6); xf2(mb, g, [0, 0.58, 0.02], null, () => { for (let k = 0; k < 8; k++) { const a = -PI * 0.75 + k * PI * 1.5 / 7, a2 = a + PI * 1.5 / 7; tri(mb, [Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0], [Math.cos(a2) * 0.09, Math.sin(a2) * 0.09, 0], [Math.cos((a + a2) / 2) * 0.06 + 0.025, Math.sin((a + a2) / 2) * 0.06, 0], '#e8ecf8'); tri(mb, [Math.cos(a2) * 0.09, Math.sin(a2) * 0.09, 0], [Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0], [Math.cos((a + a2) / 2) * 0.06 + 0.025, Math.sin((a + a2) / 2) * 0.06, 0], '#e8ecf8'); } ball(g, -0.02, 0.0, 0.0, 0.025, L.g2 || '#a0b0ff', 6); }); },
    spade(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.44, '#a07040', 6); sw(mb, [[-0.04, 0.36, 0.02], [0, 0.4, 0.02], [0.04, 0.36, 0.02]], 0.012, '#3a3a40', { sides: 4 }); pan(mb, [[-0.06, -0.08], [0.06, -0.08], [0.06, -0.2], [0, -0.25], [-0.06, -0.2]], 0.02, 0.014, '#8a8e96'); },
    magnifier(mb, L, g) { xf2(mb, g, [0, 0.0, 0.06], [-0.3, 0, 0.3], () => { cyl(mb, 0, -0.04, 0, 0.014, 0.014, 0.11, '#3a2418', 6); xf2(mb, g, [0, 0.13, 0], null, () => { sw(mb, loop(0, 0, 0, 0.06, 14, 'xy'), 0.012, L.g2 || GOLD, { sides: 4 }); el(g, 0, 0, 0, 0.056, 0.056, 0.006, '#d8f4ff', 10, 4); }); }); },
    pointer(mb, L) { cyl(mb, 0, -0.02, 0.02, 0.014, 0.01, 0.12, '#2a2a30', 6); cyl(mb, 0, 0.1, 0.02, 0.006, 0.004, 0.36, '#c8ccd4', 4); ball(mb, 0, 0.46, 0.02, 0.014, '#e04040', 4); },
    weatherballoon(mb, L) { sw(mb, [[0, 0.0, 0.05], [-0.03, 0.14, 0.06], [-0.06, 0.3, 0.06], [-0.1, 0.44, 0.05]], 0.003, '#e8e8e8', { sides: 3 }); el(mb, -0.12, 0.53, 0.05, 0.09, 0.1, 0.09, '#f4f4f0', 10, 6); bx(mb, -0.04, 0.2, 0.06, 0.045, 0.045, 0.045, L.g1 || '#e04040'); },
  });
  Object.assign(GRIP, {
    foil: BLADE, runesword: BLADE, paintbrush: HAFT, magicbrush: STAFF, grimoire: HELD, wand: SHORT, mirror: HELD, leafrod: ROD,
    candle: HELD, rattle: HAFT, umbrella: { at: [0, -0.1, 0], rot: [0.15, 0, 0.4] }, trident: POLE,
    telescope: HELD, astrolabe: STAFF, starglobe: STAFF, raygun: GUN, flag: POLE, moonstaff: STAFF, spade: POLE, magnifier: HELD, pointer: { at: [0, -0.02, 0.05], rot: [1.0, 0, 0.4] }, weatherballoon: HELD,
  });
  Object.assign(OFFHAND, { paintbrush: (mb, L, g) => WEAPONS.paintbrush(mb, L, g, true) });
  Object.assign(EXTRAS, {
    fairy: { bone: 'torso', build(mb, L, g) {   // a tiny fairy fluttering by the Scholar's shoulder
      xf(mb, [0.32, 0.58, 0.08], null, () => { el(mb, 0, 0, 0, 0.025, 0.04, 0.025, '#f8e8f0', 6, 4); ball(mb, 0, 0.055, 0, 0.022, '#fce8d8', 6); ball(mb, 0, 0.07, -0.008, 0.02, '#f0d070', 6); });
      [1, -1].forEach(s => [[0.6, 0.06], [-0.3, 0.04]].forEach(([a, len]) => xf(g, [0.32 + s * 0.015, 0.6, 0.06], [0, 0, s * a], () => el(g, s * len * 0.6, 0.02, 0, len * 0.7, 0.025, 0.004, '#c0f0ff', 6, 3))));
    } },
    jetpack: { bone: 'torso', build(mb, L, g) {   // the Astronaut's twin tanks, their nozzles glowing
      [1, -1].forEach(s => { cyl(mb, s * 0.08, 0.04, -0.3, 0.06, 0.06, 0.3, '#c8ccd4', 10); dome(mb, s * 0.08, 0.34, -0.3, 0.06, 0.04, 0.06, '#c8ccd4', 10); cyl(mb, s * 0.08, -0.02, -0.3, 0.035, 0.05, 0.06, '#5a5a62', 8); xf(g, [s * 0.08, -0.03, -0.3], [PI, 0, 0], () => cyl(g, 0, 0, 0, 0.035, 0.0, 0.09, '#ffb040', 6)); });
      bx(mb, 0, 0.2, -0.28, 0.1, 0.16, 0.06, L.g2 || '#3a6ad0');
    } },
    wisps: { bone: 'torso', build(mb, L, g) {   // spirit wisps drifting round the Shaman
      [[0.36, 0.5, 0.12], [-0.4, 0.36, 0.0], [0.2, 0.7, -0.22]].forEach(([x, y, z], k) => { ball(g, x, y, z, 0.035, L.g2 || '#40d0c0', 6); sw(g, [[x, y, z], [x - 0.04, y - 0.05, z - 0.04], [x - 0.06, y - 0.12, z - 0.02]], [0.025, 0.015, 0.002], L.g2 || '#40d0c0', { sides: 4 }); });
    } },
  });

  Object.assign(HATS, {
    // ---- Bard
    choircap(mb, L) {  // the Chorister's red skullcap and a big red bow under its chin
      dome(mb, 0, 0.35, -0.01, 0.2, 0.12, 0.19, L.g1 || '#a02030');
      ball(mb, 0, 0.47, -0.01, 0.02, sh(L.g1 || '#a02030', -0.2));
      [1, -1].forEach(s => bl(mb, [0, 0.0, 0.17], [s, 0.25, 0.2], 0.08, 0.07, 0.02, L.g1 || '#a02030', [0, 1, 0])); ball(mb, 0, 0.0, 0.18, 0.022, sh(L.g1 || '#a02030', -0.15));
    },
    tiara(mb, L, g) {  // the Soprano's hair swept up in a bun, a silver tiara set with gems
      const c = '#8a5a3a';
      hairOf(mb, c, 0.45, true);
      el(mb, 0, 0.44, -0.1, 0.1, 0.08, 0.09, c, 8, 5);
      lof(mb, [hed(0.33, 0.02), hed(0.35, 0.02)], '#d8dce4', { arc: [PI * 0.15, PI * 0.85] });
      [-2, -1, 0, 1, 2].forEach(k => { const a = PI / 2 + k * 0.32, r = hed(0.35, 0.02); spk(mb, [Math.cos(a) * r[1], 0.35, Math.sin(a) * r[2]], [Math.cos(a) * 0.2, 1, Math.sin(a) * 0.2], 0.05 + (k === 0 ? 0.03 : 0), 0.012, '#d8dce4', 4); ball(g, Math.cos(a) * r[1], 0.36, Math.sin(a) * r[2] + 0.005, 0.01, k % 2 ? '#80c0ff' : '#ff80c0', 4); });
    },
    plume(mb, L, g) {  // the Diva's tall headdress of pink plumes on a jeweled gold band
      const p = L.g2 || '#ff80c0';
      bandOf(mb, 0.31, 0.035, L.g1 || '#d8a020', 0.02);
      ball(g, 0, 0.33, 0.245, 0.024, '#ff3060', 6);
      [-2, -1, 0, 1, 2].forEach(k => curve(mb, [[k * 0.04, 0.36, 0.14 - Math.abs(k) * 0.04], [k * 0.08, 0.52, 0.12 - Math.abs(k) * 0.04], [k * 0.12 + 0.02, 0.66 - Math.abs(k) * 0.05, 0.06 - Math.abs(k) * 0.04], [k * 0.16 + 0.05, 0.7 - Math.abs(k) * 0.08, -0.02]], 0.04, 0.008, k % 2 ? p : sh(p, 0.15)));
    },
    harmonica(mb, L) { // the Busker's tilted bowler and a harmonica on a wire brace at its mouth
      const c = L.g1 || '#8a5a30';
      xf(mb, [0.03, 0.38, 0], [0, 0, -0.2], () => { cyl(mb, 0, 0, 0, 0.26, 0.26, 0.016, sh(c, -0.1), 14); dome(mb, 0, 0.012, 0, 0.18, 0.13, 0.17, c, 12); bandOf(mb, 0.0, 0.0, c); });
      sw(mb, [[-0.2, 0.08, 0.1], [-0.16, 0.12, 0.22], [0, 0.12, 0.27], [0.16, 0.12, 0.22], [0.2, 0.08, 0.1]], 0.006, '#c8ccd4', { sides: 3 });
      bx(mb, 0, 0.12, 0.275, 0.12, 0.03, 0.03, '#c8ccd4'); for (let k = 0; k < 5; k++) bx(mb, -0.045 + k * 0.0225, 0.12, 0.292, 0.01, 0.012, 0.004, '#3a3a40');
    },
    rockstar(mb, L) {  // the Rock Star's spiked hair and a pair of star-shaped shades
      const c = L.g2 || '#ff3060';
      hairOf(mb, '#1a1a22', 0.44, true);
      for (let k = 0; k < 7; k++) bl(mb, [0, 0.44 - Math.abs(k - 3) * 0.01, 0.12 - k * 0.05], [0, 1, 0.3 - k * 0.15], 0.17 - Math.abs(k - 3) * 0.015, 0.08, 0.03, k % 2 ? c : sh(c, -0.15), [1, 0, 0]);
      [1, -1].forEach(s => xf(mb, [s * 0.075, 0.24, 0.238], null, () => pan(mb, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => { const a = PI / 2 + k * PI / 5, r = k % 2 ? 0.022 : 0.05; return [Math.cos(a) * r, Math.sin(a) * r]; }), 0, 0.01, '#141418')));
      bx(mb, 0, 0.25, 0.242, 0.04, 0.01, 0.01, '#141418');
    },
    partyhat(mb, L) {  // the Partygoer's striped cone of a party hat, a pom on its tip
      const a = L.g1 || '#e04080', b = L.g2 || '#40c0f0';
      xf(mb, [0.03, 0.4, 0.0], [0, 0, -0.15], () => { lof(mb, [[0, 0.11, 0.11, 0, 0, (i) => (i % 2 ? a : b)], [0.12, 0.07, 0.07, 0, 0, (i) => (i % 2 ? b : a)], [0.24, 0.001, 0.001]], a, { sides: 10 }); ball(mb, 0, 0.25, 0, 0.03, '#ffe040'); });
      sw(mb, [[-0.14, 0.42, 0.0], [-0.2, 0.2, 0.06], [-0.12, 0.04, 0.16]], 0.004, WHITE, { sides: 3 });
    },
    partycrown(mb, L, g) { // the Party Host's gold paper crown
      const gd = L.g2 || '#e8c040';
      lof(mb, [hed(0.3, 0.02), hed(0.36, 0.02)], gd, { sides: 14 });
      for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2, r = hed(0.36, 0.02); tri(mb, [Math.cos(a - 0.3) * r[1], 0.36, Math.sin(a - 0.3) * r[2]], [Math.cos(a + 0.3) * r[1], 0.36, Math.sin(a + 0.3) * r[2]], [Math.cos(a) * r[1], 0.43, Math.sin(a) * r[2]], gd); tri(mb, [Math.cos(a + 0.3) * r[1], 0.36, Math.sin(a + 0.3) * r[2]], [Math.cos(a - 0.3) * r[1], 0.36, Math.sin(a - 0.3) * r[2]], [Math.cos(a) * r[1], 0.43, Math.sin(a) * r[2]], sh(gd, -0.15)); if (i % 2) ball(g, Math.cos(a) * r[1] * 1.02, 0.33, Math.sin(a) * r[2] * 1.02, 0.012, i % 4 === 1 ? '#ff4060' : '#40c0ff', 4); }
    },
    ringhat(mb, L) {   // the Ringmaster's tall red top hat, flaring at the crown, a gold band
      const c = L.g1 || '#c02028';
      cyl(mb, 0, 0.38, 0, 0.29, 0.29, 0.02, sh(c, -0.25), 14);
      cyl(mb, 0, 0.38, 0, 0.17, 0.2, 0.32, c, 12);
      cyl(mb, 0, 0.42, 0, 0.175, 0.18, 0.05, L.g2 || GOLD, 12);
    },
    // ---- Beast
    woolhood(mb, L) {  // the Shepherd's brown cloth hood, trimmed with a woolly roll round the face
      hood(mb, L.g1 || '#8a6a4a', 0.5);
      const A = OPEN, cs = -Math.cos(A[0]), sn = Math.sin(A[0]);
      [0.06, 0.16, 0.26, 0.34].forEach(y => { const r = hed(y, 0.04); [1, -1].forEach(s => ball(mb, s * cs * r[1], y, r[3] + sn * r[2], 0.04, L.g2 || '#f4f0e4', 6)); });
      [-0.06, 0.0, 0.06].forEach(x => ball(mb, x, 0.42, 0.12, 0.04, L.g2 || '#f4f0e4', 6));
    },
    sheephat(mb, L) {  // the Animist's fluffy sheep hat: a cap of wool, floppy ears and two curled horns
      const w = L.g2 || '#fffaf0';
      for (let k = 0; k < 3; k++) puffs(mb, 0.32 + k * 0.05, 0.22 - k * 0.05, 0.21 - k * 0.05, 0.05 - k * 0.005, w, 10 - k * 2, 0, PI * 2, '#ece6d8');
      ball(mb, 0, 0.47, 0, 0.05, w);
      [1, -1].forEach(s => { el(mb, s * 0.25, 0.3, 0.03, 0.06, 0.025, 0.035, '#3a3a40', 6, 3); curve(mb, [[s * 0.15, 0.4, 0.06], [s * 0.22, 0.44, 0.1], [s * 0.25, 0.38, 0.14], [s * 0.21, 0.34, 0.12]], 0.025, 0.008, '#c8a878'); });
    },
    flowerpot(mb, L) { // the Gardener's terracotta flowerpot for a hat, a sprout and a flower growing from it
      const t = L.g2 || '#c0663a';
      cyl(mb, 0, 0.38, 0, 0.17, 0.2, 0.14, t, 12); cyl(mb, 0, 0.5, 0, 0.21, 0.21, 0.04, sh(t, 0.08), 12); cyl(mb, 0, 0.535, 0, 0.18, 0.18, 0.006, '#5a3a20', 12);
      cyl(mb, 0, 0.54, 0, 0.008, 0.008, 0.12, '#4a8a3a', 4); [1, -1].forEach(s => bl(mb, [0, 0.6, 0], [s, 0.5, 0], 0.07, 0.04, 0.008, '#5ab040', [0, 0, 1]));
      flower(mb, 0, 0.67, 0.0, 0.028, '#ff80b0', '#ffe060');
    },
    hedgehat(mb, L) {  // the Topiarist's hedge, clipped into a little chocobo, growing on its head
      const c = L.g1 || '#3a6a3a', l = sh(c, 0.12), leafy = (i, n) => (i % 2 ? c : l);
      lof(mb, [hed(0.28, 0.02, leafy), [0.38, 0.235, 0.225, 0, 0, leafy], [0.44, 0.16, 0.15], [0.46, 0.001]], c, { sides: 12 });
      el(mb, 0, 0.53, -0.02, 0.09, 0.08, 0.12, l, 8, 5); el(mb, 0, 0.64, 0.06, 0.05, 0.06, 0.05, c, 8, 5); spk(mb, [0, 0.64, 0.1], [0, -0.2, 1], 0.05, 0.02, L.g2 || '#e0b030', 4);
      for (let k = 0; k < 3; k++) bl(mb, [0, 0.55, -0.12], [0, 0.6 + k * 0.3, -1], 0.08, 0.04, 0.02, c, [1, 0, 0]);
      [1, -1].forEach(s => ball(mb, s * 0.03, 0.67, 0.095, 0.008, '#141418', 4));
    },
    mushroom(mb, L) {  // the Forager's big red mushroom cap with white spots
      const c = L.g1 || '#c03030';
      lof(mb, [[0.33, 0.3, 0.29], [0.38, 0.29, 0.28], [0.48, 0.22, 0.21], [0.56, 0.1, 0.1], [0.58, 0.001]], c, { sides: 14 });
      lof(mb, [[0.33, 0.3, 0.29], [0.33, 0.12, 0.12]], '#f0e8d0', { sides: 14 });
      [[0.0, 0.53, 0.08], [0.15, 0.45, 0.14], [-0.17, 0.45, 0.1], [0.2, 0.42, -0.08], [-0.1, 0.48, -0.15], [0.05, 0.5, -0.16]].forEach(([x, y, z]) => el(mb, x, y, z, 0.035, 0.018, 0.035, WHITE, 6, 3));
    },
    twigcrown(mb, L) { // the Druid's crown of twigs and leaves, berries tucked in
      const w = L.g2 || '#8a5a30';
      bandOf(mb, 0.3, 0.03, w, 0.02);
      for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2, x = Math.cos(a), z = Math.sin(a); sw(mb, [[x * 0.23, 0.32, z * 0.22], [x * 0.26, 0.42, z * 0.25], [x * 0.3, 0.5, z * 0.28]], [0.012, 0.009, 0.003], w, { sides: 4 }); bl(mb, [x * 0.26, 0.42, z * 0.25], [x, 0.6, z], 0.08, 0.05, 0.01, i % 2 ? (L.g1 || '#4a7a3a') : '#6aa040', { radial: [0, 0.42, 0] }); }
      [[0.12, 0.34, 0.2], [-0.15, 0.34, 0.18], [0.0, 0.34, 0.24]].forEach(([x, y, z]) => ball(mb, x, y, z, 0.018, '#c02040', 4));
    },
    beastmask(mb, L) { // the Morpher's monster mask pushed up on its head: horns, glaring eyes and teeth
      const c = L.g1 || '#6a3a8a';
      xf(mb, [0, 0.42, 0.06], [-0.6, 0, 0], () => { el(mb, 0, 0, 0, 0.2, 0.14, 0.12, c, 10, 5); [1, -1].forEach(s => { el(mb, s * 0.08, 0.04, 0.1, 0.035, 0.02, 0.012, '#ffe040', 6, 3); curve(mb, [[s * 0.15, 0.06, 0.0], [s * 0.24, 0.12, -0.02], [s * 0.26, 0.22, -0.06]], 0.035, 0.005, IVORY); }); for (let i = -2; i <= 2; i++) spk(mb, [i * 0.035, -0.06, 0.1], [0, -1, 0.2], 0.035, 0.012, WHITE, 3); el(mb, 0, -0.02, 0.1, 0.12, 0.03, 0.03, sh(c, -0.3), 6, 3); });
    },
    stetson(mb, L) {   // the Cowboy's tall ten-gallon hat, its brim curled, a band with a star
      const c = L.g1 || '#f0ece0';
      brim(mb, 0.33, 0.2, 0.4, sh(c, -0.08), (a) => Math.pow(Math.cos(a), 2) * 0.1);
      lof(mb, [hed(0.32, 0.012), [0.5, 0.2, 0.18], [0.56, 0.15, 0.1], [0.54, 0.001, 0.001]], c);
      bandOf(mb, 0.33, 0.04, L.g2 || '#7a4a2a', 0.02);
      xf(mb, [0, 0.355, 0.23], null, () => pan(mb, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => { const a = PI / 2 + k * PI / 5, r = k % 2 ? 0.012 : 0.03; return [Math.cos(a) * r, Math.sin(a) * r]; }), 0, 0.008, GOLD));
    },
    // ---- Machinist
    lightbulb(mb, L, g) { // the Inventor's wild tufts of hair and a light bulb glowing over its head: an idea!
      const c = '#e8e8ec';
      for (let k = 0; k < 7; k++) { const a = PI * 0.8 + k * PI * 1.4 / 6; bl(mb, [Math.cos(a) * 0.2, 0.36, Math.sin(a) * 0.19], [Math.cos(a), 0.4, Math.sin(a)], 0.12, 0.07, 0.03, k % 2 ? c : '#c8c8d0', null); }
      shadesOf(mb, '#3a3a40', 0.044, 0.04);
      [1, -1].forEach(s => el(mb, s * 0.075, 0.24, 0.244, 0.036, 0.03, 0.004, '#d0f0ff', 8, 3));
      el(g, 0, 0.68, 0.06, 0.07, 0.08, 0.07, '#fff6a0', 10, 6); cyl(mb, 0, 0.57, 0.06, 0.035, 0.035, 0.05, '#b8bcc8', 8);
    },
    gadgethelm(mb, L, g) { // the Gadgeteer's helmet: a magnifier on a swing arm, an antenna with a blinking light
      const m = L.g2 || '#5a5a62';
      dome(mb, 0, 0.28, 0, 0.245, 0.21, 0.235, m);
      lof(mb, [hed(0.26, 0.03), hed(0.3, 0.03)], L.g1 || '#d06020');
      sw(mb, [[0.2, 0.36, 0.0], [0.22, 0.32, 0.12], [0.12, 0.27, 0.2]], 0.01, '#b8bcc8', { sides: 4 }); zcyl(mb, 0.075, 0.245, 0.21, 0.045, 0.045, 0.03, L.g1 || '#d06020', 8); el(g, 0.075, 0.245, 0.242, 0.038, 0.038, 0.004, '#c0f0ff', 8, 3);
      cyl(mb, -0.08, 0.46, -0.03, 0.008, 0.006, 0.16, '#b8bcc8', 4); ball(g, -0.08, 0.63, -0.03, 0.022, '#ff4040', 6);
      xf(mb, [-0.22, 0.32, 0.02], [0, PI / 2, 0], () => gear(mb, 0, 0, 0, 0.05, 0.02, '#c8a040', 7));
    },
    tekhelm(mb, L, g) { // the Magitek pilot's armored helm: a glowing visor slit and two antennae
      const c = L.g1 || '#6a5a7a';
      lof(mb, [[0.02, 0.26, 0.26, 0.02], [0.2, 0.27, 0.27, 0.02], [0.36, 0.23, 0.22], [0.46, 0.12, 0.12], [0.49, 0.001]], c, { sides: 8 });
      bx(g, 0, 0.25, 0.285, 0.26, 0.04, 0.012, L.g2 || '#ff60c0');
      [1, -1].forEach(s => { cyl(mb, s * 0.14, 0.43, -0.02, 0.012, 0.006, 0.14, '#3a3a44', 4); ball(g, s * 0.14, 0.58, -0.02, 0.015, L.g2 || '#ff60c0', 4); bx(mb, s * 0.27, 0.2, 0.0, 0.03, 0.12, 0.14, sh(c, -0.2)); });
    },
  });
  Object.assign(BODIES, {
    // ---- Bard
    surplice(mb, L) {  // the Chorister's red cassock to the floor, a lace-edged white surplice over it
      const c = L.g1 || '#a02030', w = L.g2 || '#efe4cc';
      lof(mb, [tor(0.1, 0.014), tor(0.0, 0.02), [-0.08, 0.29, 0.28], [-0.16, 0.32, 0.31]], c, { sides: 12 });
      lof(mb, [tor(0.37, 0.018), tor(0.26, 0.02), tor(0.14, 0.03), [0.04, 0.3, 0.29]], w, { sides: 12 });
      rag(mb, 0.04, 0.3, w, 18, 0.025);
      puffs(mb, 0.4, 0.15, 0.14, 0.026, WHITE, 12);
    },
    gown(mb, L) {      // a long opera gown flaring to the floor, a sash and a string of pearls
      const c = L.g1 || '#5a7ad0';
      lof(mb, [tor(0.34, 0.016), tor(0.26, 0.018), tor(0.14, 0.016), [0.02, 0.29, 0.28], [-0.08, 0.34, 0.33], [-0.16, 0.38, 0.37]], c, { sides: 14 });
      lof(mb, [[-0.16, 0.382, 0.372], [-0.13, 0.38, 0.37]], sh(c, 0.2), { sides: 14 });
      lof(mb, [tor(0.06, 0.03), tor(0.1, 0.03)], L.g2 || '#e8e8f8', { sides: 14 });
      for (let i = 0; i < 11; i++) { const a = PI * 0.15 + i * PI * 0.7 / 10, r = tor(0.36, 0.02); ball(mb, Math.cos(a) * r[1], 0.355 - Math.sin(a) * 0.035, Math.sin(a) * r[2], 0.014, '#f4f0ec', 4); }
    },
    onemanband(mb, L) { // the Busker's one-moogle band: a bass drum on its back, cymbals on top, braces
      const c = L.g2 || '#d04040';
      xf(mb, [0, 0.16, -0.36], [PI / 2, 0, 0], () => { cyl(mb, 0, -0.07, 0, 0.2, 0.2, 0.14, '#f0e8d0', 14); [-0.07, 0.07].forEach(y => cyl(mb, 0, y - 0.01, 0, 0.21, 0.21, 0.02, c, 14)); });
      xf(mb, [0, 0.4, -0.36], null, () => { cyl(mb, 0, -0.06, 0, 0.008, 0.008, 0.1, '#8a8e96', 4); cyl(mb, 0, 0.04, 0, 0.09, 0.02, 0.012, '#e0c050', 12); });
      [1, -1].forEach(s => sw(mb, [[s * 0.12, 0.38, -0.16], [s * 0.13, 0.4, 0.06], [s * 0.12, 0.3, 0.21], [s * 0.12, 0.08, 0.26], [s * 0.13, -0.02, 0.22]], 0.014, '#5a3a20', { sides: 4 }));
    },
    leather(mb, L) {   // the Rock Star's black leather jacket, open, studded shoulders and a chain
      const c = L.g1 || '#1a1a22';
      lof(mb, [tor(0.37, 0.02), tor(0.26, 0.022), tor(0.12, 0.024), tor(0.0, 0.026)], c, { arc: OPEN, sides: 12 });
      lof(mb, [tor(0.36, 0.024), [0.44, 0.2, 0.19, -0.02]], c, { arc: [PI * 0.75, PI * 2.25] });
      [1, -1].forEach(s => { el(mb, s * 0.21, 0.36, 0.02, 0.09, 0.05, 0.09, c, 8, 4); for (let k = 0; k < 4; k++) spk(mb, [s * (0.16 + k * 0.035), 0.39 - k * 0.012, 0.03], [s * 0.3, 1, 0.1], 0.03, 0.01, '#c8ccd4', 4); });
      sw(mb, [[0.2, 0.02, 0.17], [0.12, -0.04, 0.24], [0.0, -0.02, 0.27]], 0.008, '#c8ccd4', { sides: 3 });
    },
    streamers(mb, L) { // the Partygoer's party streamers draped every which way, and confetti
      const cols = ['#e04080', '#40c0f0', '#ffd040', '#60e070'];
      [[0.38, 0.12], [0.2, -0.22], [0.06, 0.2]].forEach(([y, t], k) => xf(mb, [0, y, 0], [t, k, -t * 0.5], () => { const P = loop(0, 0, 0, tor(y, 0.03)[1] + 0.01, 20, 'xz', tor(y, 0.03)[2] + 0.01).map((p, i) => [p[0], p[1] + Math.sin(i * 1.3) * 0.015, p[2]]); sw(mb, P, P.map(() => [0.004, 0.02]), cols[k], { sides: 4 }); }));
      [[0.12, 0.3, 0.2], [-0.16, 0.06, 0.22], [0.2, 0.0, 0.17], [-0.06, 0.36, 0.18], [0.0, -0.06, 0.26]].forEach(([x, y, z], k) => bx(mb, x, y, z, 0.02, 0.02, 0.006, cols[k % 4]));
    },
    tuxedo(mb, L) {    // the Party Host's velvet tuxedo, satin lapels and a bow tie
      const c = L.g1 || '#6a2a8a', gd = L.g2 || '#e8c040';
      lof(mb, [tor(0.37, 0.018), tor(0.26, 0.02), tor(0.12, 0.022), tor(0.0, 0.024), [-0.06, 0.27, 0.26]], c, { arc: [PI * 0.6, PI * 2.4], sides: 12 });
      [1, -1].forEach(s => tri(mb, [s * 0.1, 0.38, 0.17], [s * 0.04, 0.2, 0.26], [s * 0.15, 0.27, 0.22], gd));
      [1, -1].forEach(s => bl(mb, [0, 0.37, 0.2], [s, 0.15, 0.2], 0.06, 0.05, 0.02, '#141418', [0, 1, 0])); ball(mb, 0, 0.37, 0.205, 0.014, '#141418');
      [1, -1].forEach(s => bl(mb, [s * 0.08, 0.04, -0.25], [s * 0.1, -1, -0.3], 0.14, 0.1, 0.02, c, [1, 0, 0]));
    },
    ringcoat(mb, L) {  // the Ringmaster's red tailcoat, gold frogging across the chest, gold epaulettes
      const c = L.g1 || '#c02028', gd = L.g2 || GOLD;
      BODIES.tailcoat(mb, { g1: c });
      [0.33, 0.27, 0.07].forEach(y => { const r = tor(y, 0.024); [1, -1].forEach(s => sw(mb, [[s * r[1] * 0.25, y, r[2] * 0.97], [s * r[1] * 0.55, y, r[2] * 0.83]], 0.008, gd, { sides: 4 })); });
      [1, -1].forEach(s => { el(mb, s * 0.2, 0.375, 0.02, 0.075, 0.025, 0.075, gd, 8, 4); for (let k = 0; k < 4; k++) bl(mb, [s * (0.15 + k * 0.035), 0.37, 0.05], [0, -1, 0], 0.04, 0.012, 0.006, gd, [1, 0, 0]); });
    },
    // ---- Beast
    fleece(mb, L) {    // a sheepskin jerkin, woolly at the collar and hem, a rope belt
      const w = L.g2 || '#f4f0e4', c = L.g1 || '#8a6a4a';
      lof(mb, [tor(0.04, 0.018), tor(0.14, 0.02), tor(0.26, 0.022), tor(0.35, 0.02)], c, { arc: [-PI * 0.36, PI * 1.36], sides: 12 });
      puffs(mb, 0.37, 0.2, 0.19, 0.04, w, 12, -PI * 0.36, PI * 1.36, sh(w, -0.06)); puffs(mb, 0.05, 0.275, 0.26, 0.035, w, 16, -PI * 0.36, PI * 1.36, sh(w, -0.06));
      [1, -1].forEach(s => el(mb, s * 0.22, 0.34, 0.02, 0.08, 0.06, 0.08, w, 8, 4));
      lof(mb, [tor(0.0, 0.02), tor(0.03, 0.022)], '#c8a870');
    },
    basket(mb, L) {    // the Forager's wicker basket on its back, mushrooms poking out, and its straps
      const w = L.g2 || '#c8a060', weave = (i) => (i % 2 ? w : sh(w, -0.15));
      xf(mb, [0, 0.1, -0.33], [0.15, 0, 0], () => { lof(mb, [[-0.12, 0.13, 0.1, 0, 0, weave], [0.0, 0.15, 0.11, 0, 0, weave], [0.12, 0.16, 0.12, 0, 0, weave], [0.2, 0.17, 0.13]], w, { sides: 10, capTop: false }); [[0.04, 0.22, 0.03, '#c03030'], [-0.06, 0.2, -0.02, '#d8b070'], [0.09, 0.19, -0.04, '#c03030']].forEach(([x, y, z, cc]) => { cyl(mb, x, y - 0.06, z, 0.012, 0.012, 0.06, '#f0e8d0', 6); dome(mb, x, y, z, 0.04, 0.03, 0.04, cc, 8); }); });
      [1, -1].forEach(s => sw(mb, [[s * 0.12, 0.38, -0.16], [s * 0.13, 0.4, 0.06], [s * 0.12, 0.3, 0.21], [s * 0.15, 0.12, 0.24], [s * 0.2, 0.0, 0.15]], 0.012, sh(w, -0.3), { sides: 4 }));
    },
    leafcloak(mb, L) { // the Druid's cloak of overlapping leaves, from its shoulders to the ground
      const c = L.g1 || '#4a7a3a';
      [0.4, 0.3, 0.2, 0.1, 0.0, -0.1].forEach((y, k) => { const r = tor(Math.max(-0.1, y), 0.03 + k * 0.012); for (let i = 0; i < 14; i++) { const a = (i + k * 0.5) / 14 * PI * 2; if (Math.sin(a) > (k < 2 ? 0.6 : 0.3)) continue; bl(mb, [Math.cos(a) * (r[1] + k * 0.008), y, Math.sin(a) * (r[2] + k * 0.008)], [Math.cos(a) * 0.25, -1, Math.sin(a) * 0.25], 0.13, 0.09, 0.012, (i + k) % 3 ? c : sh(c, 0.15), { radial: [0, y, 0] }); } });
      ball(mb, 0, 0.39, 0.17, 0.025, L.g2 || '#8a5a30');
    },
    patchfur(mb, L) {  // the Morpher's patchwork of borrowed hides: fur, scales and spots, and a lizard tail
      const pal = [L.g1 || '#6a3a8a', L.g2 || '#7a6a3a', '#4a7a5a', '#a05a3a'];
      lof(mb, [tor(-0.06, 0.016, (i) => pal[i % 4]), tor(0.06, 0.018, (i) => pal[(i + 1) % 4]), tor(0.18, 0.016, (i) => pal[(i + 2) % 4]), tor(0.3, 0.018, (i) => pal[(i + 3) % 4]), tor(0.38, 0.018)], pal[0], { sides: 8 });
      for (let i = 0; i < 6; i++) { const a = PI * 1.1 + i * 0.25, r = tor(0.2, 0.03); spk(mb, [Math.cos(a) * r[1], 0.3 - i * 0.05, Math.sin(a) * r[2]], [Math.cos(a), 0.4, Math.sin(a)], 0.05, 0.02, '#e8e0c8', 4); }
      curve(mb, [[0, 0.02, -0.22], [0.04, -0.06, -0.34], [0.1, -0.06, -0.46], [0.18, 0.0, -0.52]], 0.05, 0.008, pal[2]);
    },
    chaps(mb, L) {     // the Cowpoke's fringed leather chaps, a vest and a red neckerchief
      const c = L.g2 || '#8a4a2a';
      [1, -1].forEach(s => { lof(mb, [[-0.12, 0.13, 0.13, 0.02, s * 0.12], [0.02, 0.15, 0.14, 0.03, s * 0.12]], c, { sides: 8, arc: s > 0 ? [-PI * 0.6, PI * 0.8] : [PI * 0.2, PI * 1.6] }); for (let k = 0; k < 5; k++) sw(mb, [[s * (0.25 + 0.002 * k), -0.1 + k * 0.03, 0.04], [s * 0.29, -0.11 + k * 0.03, 0.04]], 0.006, sh(c, 0.15), { sides: 3 }); });
      BODIES.vest(mb, { g1: sh(c, 0.15) });
      ball(mb, 0, 0.37, 0.17, 0.03, '#c02828'); [1, -1].forEach(s => bl(mb, [0, 0.37, 0.17], [s * 0.4, -1, 0.4], 0.08, 0.06, 0.01, '#c02828', [1, 0, 0]));
    },
    ranchvest(mb, L) { // the Cowboy's sheepskin vest, a great gold belt buckle and a neckerchief
      const c = L.g2 || '#7a4a2a';
      BODIES.vest(mb, { g1: c });
      [1, -1].forEach(s => sw(mb, [0.33, 0.24, 0.14, 0.08].map(y => { const r = tor(y, 0.02); return [s * r[1] * 0.5, y, r[2] * 0.88]; }), 0.016, '#f4f0e4', { sides: 4 }));
      lof(mb, [tor(-0.01, 0.022), tor(0.05, 0.024)], '#3a2418');
      const r = tor(0.02, 0.03); el(mb, 0, 0.02, r[2], 0.07, 0.045, 0.014, GOLD, 8, 4);
      ball(mb, 0, 0.37, 0.17, 0.03, '#3a6ab0'); [1, -1].forEach(s => bl(mb, [0, 0.37, 0.17], [s * 0.4, -1, 0.4], 0.08, 0.06, 0.01, '#3a6ab0', [1, 0, 0]));
    },
    // ---- Machinist
    gadgetpack(mb, L, g) { // the Gadgeteer's backpack of gears, coils and an antenna
      const c = L.g1 || '#d06020';
      xf(mb, [0, 0.18, -0.31], [0.08, 0, 0], () => { mb.rbox(0, 0, 0, 0.32 * T, 0.32 * T, 0.14 * T, '#5a5a62', 0.25); bx(mb, 0, 0.05, -0.075, 0.2, 0.12, 0.01, c); });
      [[0.1, 0.32, -0.36, 0.06], [-0.08, 0.28, -0.38, 0.05]].forEach(([x, y, z, r]) => xf(mb, [x, y, z], [0, 0, 0], () => gear(mb, 0, 0, 0, r, 0.02, '#c8a040', 8)));
      sw(mb, [[-0.12, 0.3, -0.3], [-0.16, 0.42, -0.34], [-0.14, 0.52, -0.3]], 0.01, '#b8bcc8', { sides: 4 }); ball(g, -0.14, 0.54, -0.3, 0.02, '#60ff80', 4);
      for (let k = 0; k < 4; k++) sw(mb, loop(0.15, 0.1 + k * 0.025, -0.34, 0.025, 8, 'xz'), 0.006, '#c87040', { sides: 3 });
      [1, -1].forEach(s => sw(mb, [[s * 0.12, 0.38, -0.16], [s * 0.13, 0.4, 0.06], [s * 0.12, 0.3, 0.21], [s * 0.15, 0.12, 0.24], [s * 0.2, 0.0, 0.15]], 0.012, '#3a3a40', { sides: 4 }));
    },
    tekarmor(mb, L, g) { // Magitek armor: a heavy frame round its body, a magicite core aglow, pipes and vents
      const c = L.g1 || '#6a5a7a', v = L.g2 || '#ff60c0';
      lof(mb, [[-0.1, 0.27, 0.26], tor(0.0, 0.03), tor(0.13, 0.028), tor(0.26, 0.03), tor(0.36, 0.028)], c, { sides: 8, sq: 3 });
      [1, -1].forEach(s => { mb.rbox(s * 0.26 * T, 0.32 * T, 0.0, 0.16 * T, 0.14 * T, 0.2 * T, sh(c, 0.1), 0.25); zcyl(mb, s * 0.26, 0.4, -0.02, 0.025, 0.025, 0.14, '#3a3a44', 6); bx(g, s * 0.34, 0.32, 0.04, 0.008, 0.05, 0.08, v); });
      sw(mb, [[-0.1, 0.36, -0.24], [-0.14, 0.44, -0.3], [-0.1, 0.5, -0.28]], 0.02, '#3a3a44'); sw(mb, [[0.1, 0.36, -0.24], [0.14, 0.44, -0.3], [0.1, 0.5, -0.28]], 0.02, '#3a3a44');
      el(g, 0, 0.03, tor(0.03, 0.03)[2] + 0.005, 0.045, 0.035, 0.014, v, 8, 4);
    },
  });
  Object.assign(WEAPONS, {
    // ---- Bard
    bouquet(mb, L) { xf(mb, [0, 0.04, 0.06], [-0.2, 0, 0], () => { cyl(mb, 0, -0.1, 0, 0.012, 0.06, 0.16, '#f0ecf4', 8); [[0, 0.09, 0], [0.04, 0.07, 0.02], [-0.04, 0.07, 0.01], [0.02, 0.08, -0.03], [-0.02, 0.1, 0.03]].forEach(([x, y, z], k) => ball(mb, x, y, z, 0.028, k % 2 ? '#e02040' : '#ff6080', 6)); [1, -1].forEach(s => bl(mb, [s * 0.04, 0.05, 0], [s, 0.4, 0], 0.05, 0.03, 0.006, '#4a9a3a', [0, 0, 1])); }); },
    microphone(mb, L) { cyl(mb, 0, -0.04, 0.04, 0.014, 0.018, 0.14, '#2a2a30', 8); el(mb, 0, 0.13, 0.04, 0.032, 0.04, 0.032, '#c8ccd4', 8, 5); cyl(mb, 0, 0.09, 0.04, 0.024, 0.024, 0.012, L.g1 || '#d8a020', 8); sw(mb, [[0, -0.04, 0.04], [0.02, -0.12, 0.06], [0.08, -0.16, 0.02], [0.1, -0.24, -0.04]], 0.006, '#2a2a30', { sides: 3 }); },
    guitar(mb, L) { xf(mb, [0, 0.0, 0.1], [0, 0, 0.9], () => { el(mb, 0, -0.06, 0, 0.09, 0.08, 0.03, '#c8843a', 10, 4); el(mb, 0, 0.05, 0, 0.07, 0.06, 0.03, '#c8843a', 10, 4); el(mb, 0, -0.01, 0.025, 0.025, 0.025, 0.006, '#3a2418', 8, 3); bx(mb, 0, 0.2, 0.0, 0.03, 0.22, 0.02, '#5a3a20'); bx(mb, 0, 0.33, 0.0, 0.04, 0.05, 0.02, '#3a2418'); for (let k = 0; k < 3; k++) bx(mb, -0.008 + k * 0.008, 0.14, 0.012, 0.002, 0.26, 0.002, '#e8e8e8'); }); },
    eguitar(mb, L) { xf(mb, [0, 0.0, 0.1], [0, 0, 0.9], () => { pan(mb, [[0.0, 0.0], [0.12, -0.16], [0.06, -0.16], [0.0, -0.06], [-0.06, -0.16], [-0.12, -0.16]], 0, 0.03, L.g2 || '#ff3060'); bx(mb, 0, -0.06, 0.018, 0.05, 0.03, 0.006, '#141418'); bx(mb, 0, 0.13, 0.0, 0.028, 0.26, 0.02, '#2a2a30'); xf(mb, [0, 0.29, 0], [0, 0, 0.3], () => bx(mb, 0, 0, 0, 0.03, 0.07, 0.02, L.g2 || '#ff3060')); }); },
    noisemaker(mb, L) { xf(mb, [0, 0.04, 0.06], [-1.3, 0, 0], () => { cyl(mb, 0, -0.04, 0, 0.014, 0.018, 0.08, L.g2 || '#40c0f0', 8); cyl(mb, 0, 0.04, 0, 0.016, 0.02, 0.1, L.g1 || '#e04080', 6); sw(mb, [[0, 0.14, 0], [0, 0.22, 0.01], [0.0, 0.26, -0.02], [0, 0.24, -0.05], [0, 0.21, -0.04]], [[0.022, 0.003], [0.022, 0.003], [0.02, 0.003], [0.016, 0.003], [0.01, 0.003]], '#ffd040', { sides: 4 }); }); },
    cake(mb, L, g) { xf2(mb, g, [0, 0.0, 0.07], null, () => { cyl(mb, 0, 0, 0, 0.12, 0.12, 0.012, '#e8e8f0', 14); cyl(mb, 0, 0.012, 0, 0.09, 0.09, 0.07, '#f8e8d8', 12); cyl(mb, 0, 0.082, 0, 0.092, 0.092, 0.014, '#ff90c0', 12); for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; ball(mb, Math.cos(a) * 0.088, 0.075, Math.sin(a) * 0.088, 0.012, '#ff90c0', 4); } [-0.04, 0.0, 0.04].forEach(x => { cyl(mb, x, 0.096, 0.0, 0.006, 0.006, 0.04, x ? '#40c0ff' : '#ffd040', 4); el(g, x, 0.148, 0.0, 0.008, 0.014, 0.008, '#ffb040', 4, 3); }); }); },
    // ---- Beast
    crook(mb, L) { cyl(mb, 0, -0.08, 0.02, 0.016, 0.016, 0.6, '#8a6a3a', 6); sw(mb, [[0, 0.5, 0.02], [0.0, 0.6, 0.02], [0.05, 0.66, 0.02], [0.11, 0.64, 0.02], [0.12, 0.56, 0.02]], [0.016, 0.016, 0.015, 0.014, 0.01], '#8a6a3a'); },
    shears(mb, L) { [0.18, -0.18].forEach((r, k) => xf(mb, [0, 0.02, 0.04], [0, 0, r], () => { bx(mb, 0, -0.06, 0, 0.022, 0.1, 0.02, k ? '#d03030' : '#e04040'); pan(mb, [[-0.012, 0.0], [0.012, 0.0], [0.006, 0.18], [0.0, 0.2]], 0, 0.008, '#c8ccd4'); })); ball(mb, 0, 0.02, 0.05, 0.012, '#8a8e96'); },
    hedgetrimmer(mb, L) { bx(mb, 0, 0.03, 0.04, 0.08, 0.07, 0.14, L.g2 || '#e0b030'); xf(mb, [0, 0.0, -0.01], [0.35, 0, 0], () => bx(mb, 0, -0.04, 0, 0.04, 0.08, 0.04, '#2a2a30')); bx(mb, 0, 0.03, 0.26, 0.012, 0.03, 0.32, '#8a8e96'); for (let k = 0; k < 9; k++) bx(mb, 0, 0.03, 0.13 + k * 0.032, 0.03, 0.05, 0.01, '#c8ccd4'); },
    shroom(mb, L) { xf(mb, [0, 0.0, 0.07], null, () => { cyl(mb, 0, -0.04, 0, 0.022, 0.03, 0.12, '#f0e8d0', 8); lof(mb, [[0.08, 0.09, 0.09], [0.12, 0.085, 0.085], [0.16, 0.05, 0.05], [0.17, 0.001]], L.g1 || '#c03030', { sides: 10 }); [[0.04, 0.14, 0.04], [-0.05, 0.13, 0.02], [0.0, 0.15, -0.05]].forEach(([x, y, z]) => ball(mb, x, y, z, 0.014, WHITE, 4)); }); },
    oakstaff(mb, L) { sw(mb, [[0, -0.08, 0.02], [0.02, 0.15, 0.02], [-0.02, 0.36, 0.02], [0.02, 0.54, 0.02], [0.0, 0.62, 0.02]], [0.022, 0.02, 0.02, 0.018, 0.012], '#6a4a2a'); for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2; bl(mb, [0, 0.6, 0.02], [Math.cos(a), 0.6, Math.sin(a)], 0.09, 0.05, 0.01, k % 2 ? (L.g1 || '#4a7a3a') : '#6aa040', [0, 1, 0]); } xf(mb, [0.04, 0.54, 0.05], null, () => { el(mb, 0, 0, 0, 0.022, 0.03, 0.022, '#a07040', 6, 4); dome(mb, 0, 0.012, 0, 0.026, 0.02, 0.026, '#6a4a2a', 6); }); },
    lasso(mb, L) { for (let k = 0; k < 3; k++) sw(mb, loop(0, -0.02 - k * 0.02, 0.06, 0.05 + k * 0.005, 10, 'xy'), 0.01, '#c8a870', { sides: 4 }); sw(mb, [[0.05, 0.0, 0.06], [0.1, 0.1, 0.08], [0.12, 0.22, 0.06]], 0.008, '#c8a870', { sides: 4 }); sw(mb, loop(0.12, 0.3, 0.06, 0.11, 14, 'xz', 0.09), 0.008, '#c8a870', { sides: 4 }); },
    // ---- Machinist
    screwdriver(mb, L) { cyl(mb, 0, -0.06, 0.02, 0.026, 0.024, 0.12, L.g2 || '#3a6ad0', 8); cyl(mb, 0, 0.06, 0.02, 0.008, 0.008, 0.2, '#c8ccd4', 6); bx(mb, 0, 0.27, 0.02, 0.02, 0.03, 0.004, '#c8ccd4'); },
    springgun(mb, L) { bx(mb, 0, 0.04, 0.02, 0.05, 0.06, 0.12, L.g1 || '#d06020'); xf(mb, [0, 0.0, -0.02], [0.4, 0, 0], () => bx(mb, 0, -0.03, 0, 0.032, 0.08, 0.04, '#3a3a40')); const P = []; for (let i = 0; i <= 24; i++) { const a = i * 0.8; P.push([Math.cos(a) * 0.022, 0.04 + Math.sin(a) * 0.022, 0.08 + i * 0.006]); } sw(mb, P, 0.004, '#c8ccd4', { sides: 3 }); ball(mb, 0, 0.04, 0.25, 0.045, '#e02020', 8); bx(mb, 0, 0.04, 0.215, 0.05, 0.03, 0.02, WHITE); },
    tekcannon(mb, L, g) { zcyl(mb, 0, 0.0, -0.08, 0.07, 0.065, 0.16, L.g1 || '#6a5a7a', 8); zcyl(mb, 0, 0.0, 0.08, 0.04, 0.045, 0.14, '#3a3a44', 8); zcyl(g, 0, 0.0, 0.22, 0.032, 0.032, 0.008, L.g2 || '#ff60c0', 8); [1, -1].forEach(s => bx(mb, s * 0.06, 0.0, 0.02, 0.012, 0.04, 0.16, sh(L.g1 || '#6a5a7a', -0.2))); },
  });
  Object.assign(GRIP, {
    bouquet: HELD, microphone: HELD, guitar: HELD, eguitar: HELD, noisemaker: HELD, cake: { at: [0, 0.0, 0.06], rot: [0, 0, 0.4] },
    crook: POLE, shears: HELD, hedgetrimmer: GUN, shroom: HELD, oakstaff: STAFF, lasso: HELD,
    screwdriver: SHORT, springgun: GUN, tekcannon: FIST,
  });

  // ------------------------------------------------------------------ the model
  KP.moogleModel = function (id, opts = {}) {
    const S = KP.SPECIES[id] || {}, J = KP.JOBS[S.job] || KP.JOBS.freelancer, L = Object.assign({}, J.look, S.look || {});
    // (a shadowed face: the whole head dark under the hood, not a black patch on a white face; the user, 2026-10-04)
    const m = FF7.chars3d.build({ rig: 'moogle', c1: S.fur || '#f0ece0', c2: S.nose || '#d23d3d', wing: S.wing || '#c84a4a', shade: L.shadowFace ? '#0e0c12' : null }, { style: opts.style || 'battle' });
    const tcol = KP.TYPE_COLORS[S.type] || '#a8a8a0';
    // the robot parts: the pom-pom on its antenna, and the type badge on the chest
    m.attach('head', meshOf(mb => { mb.box(0, 0.5 * T, 0, 0.012 * T, 0.12 * T, 0.012 * T, '#8a8e96'); }));
    m.attach('head', glowOf(mb => mb.sphere(0, 0.6 * T, 0, 0.055 * T, 0.055 * T, 0.055 * T, S.pom || '#ff4a6a', 8, 6, true)));
    // (the plate is built round its own centre, then stood up on the chest: built in place, the turn swung it out to the floor)
    m.attach('torso', meshOf(mb => { mb.prism(0, -0.006 * T, 0, 0.052 * T, 0.052 * T, 0.012 * T, 10, '#d8d8e0', false); }), FF7.M4.trs(FF7.M4.create(), [0, 0.17 * T, 0.258 * T], [PI / 2, 0, 0], [1, 1, 1]));
    m.attach('torso', glowOf(mb => mb.sphere(0, 0.17 * T, 0.27 * T, 0.036 * T, 0.036 * T, 0.012 * T, tcol, 8, 4, false)));
    // the job: hat, body, weapon, and any shield, cape and extras. Each part may add a second mesh that glows (lamps, gems)
    const part = (bone, fn, mat) => {
      const mb = new FF7.MeshBuilder(), g = new FF7.MeshBuilder(); fn(mb, g);
      if (mb.vertexCount) m.attach(bone, mb.build(), mat || null, { cull: false });
      if (g.vertexCount) m.attach(bone, g.build({ unlit: true }), mat || null, { cull: false });
    };
    const hat = HATS[L.hat] || HATS.none, body = BODIES[L.body], weapon = WEAPONS[L.weapon] || WEAPONS.none;
    SHADE = !!L.shadowFace; try { part('head', (mb, g) => hat(mb, L, g)); } finally { SHADE = false; }
    if (body) part('torso', (mb, g) => body(mb, L, g));
    // its stage in its job line: each evolution is bigger and grander (Pokemon's: a new silhouette, not a new colour)
    const st = KP.stageOf ? KP.stageOf(id) : { n: 1, of: 1, legend: false };
    const gp = GRIP[L.weapon] || GRIP.none, wk = st.legend ? 1.3 : st.of === 1 || st.n === 1 ? 1 : st.n === st.of ? 1.28 : 1.14;
    // (the grip's height slides the weapon along its own length, after the turn: slid along the forearm instead, a staff
    // turned upright ended up a paw's width off to the side of the paw, never in it; the user, 2026-10-04)
    const gm = FF7.M4.trs(FF7.M4.create(), [gp.at[0] * T, 0, gp.at[2] * T], gp.rot, [wk, wk, wk]);
    FF7.M4.mul(gm, gm, FF7.M4.trs(FF7.M4.create(), [0, gp.at[1] * T, 0], [0, 0, 0], [1, 1, 1]));
    // weaponAt 'pom': the item floats over the pom-pom on its antenna instead of in the paw (Phoenix Down's candle:
    // the user, 2026-10-04, "the candle should be floating over its pompom antenna")
    if (L.weaponAt === 'pom') part('head', (mb, g) => weapon(mb, L, g), FF7.M4.trs(FF7.M4.create(), [0, 0.705 * T, -0.05 * T * wk], [0, 0, 0], [wk, wk, wk]));
    else part('weapon', (mb, g) => weapon(mb, L, g), gm);
    // a shield on the left forearm (built facing +z, then turned out and forward, the arm's splay undone), or a second glove
    const sd = SHIELDS[L.shield];
    if (sd) part('foreL', (mb, g) => { mb.rotate(0, 0, -0.4); mb.rotate(0, sd.turn, 0); sd.build(mb, L, g); }, FF7.M4.trs(FF7.M4.create(), sd.at.map(v => v * T), [0, 0, 0], [1, 1, 1]));
    if (OFFHAND[L.weapon]) part('handL', (mb, g) => OFFHAND[L.weapon](mb, L, g));
    if (L.cape) part('torso', (mb) => capeOf(mb, L.cape));
    (L.extra || []).forEach(k => { const e = EXTRAS[k]; if (e) part(e.bone, (mb, g) => e.build(mb, L, g)); });
    if (L.shadowFace) {   // the Black Mage family: the head lost in shadow (the rig's shade), two glowing eyes (yellow unless the job says)
      m.attach('head', glowOf(mb => [1, -1].forEach(s => mb.sphere(s * 0.07 * T, 0.21 * T, 0.222 * T, 0.034 * T, 0.024 * T, 0.012 * T, L.eyes || '#ffe040', 6, 4, false))));
    }
    if (L.fangs) part('head', (mb) => [1, -1].forEach(s => spk(mb, [s * 0.02, 0.12, 0.215], [0, -1, 0.25], 0.035, 0.01, '#f8f8f8', 4)));
    stageParts(m, part, S, L, st, tcol);
    if (L.mount) mountOn(m, L.mount);
    // (a two-stage line's second form is its final: it gets the final's size and dress)
    m.growth = st.legend ? 1.3 : st.of === 1 ? 1.06 : st.n === 1 ? 0.86 : st.n === st.of ? (st.of === 2 ? 1.16 : 1.22) : 1.05;
    m.kpSpecies = id;
    return m;
  };
  // ------------------------------------------------------------------ mounts
  // look.mount: { kind: 'chocobo' | 'wolf', col: 'black' | 'gold' | (yellow), size, rider, fat } (the user, 2026-10-04: Kurokweh's and
  // Goldkweh's dex say they ride a chocobo, "but I dont see a black chocobo"). FF7's own chocobo (the cast rig, matched
  // to the field model) is copied in under the moogle bone by bone, scaled to it, and the moogle sits on its back with
  // its legs astride, a little smaller (rider: Cait Sith on his big moogle, the mount the big one). The bird walks when
  // the moogle walks; a fat one is wider and rounder (the Fat Chocobo)
  // the mounts: the model, the bone the rider sits on, the legs (with their walk phase) and the head; size and rider
  // are the defaults (a full chocobo, the rider a little smaller), fat widens the body bone and its children
  const MOUNTS = {
    chocobo: { build: (mt) => FF7.chars3d.build(mt.col === 'black' ? 'chocobo_black' : mt.col === 'gold' ? 'chocobo_gold' : 'chocobo', { style: 'battle' }),
      body: 'torso', hips: 'hips', legs: [['thighL', 1], ['thighR', -1]], shins: [['shinL', 1], ['shinR', -1]], head: 'head', size: 0.85, seatZ: -0.06 },
    wolf: { build: () => FF7.creatures.MODELS.nibel_wolf(),   // (FF7's Nibel Wolf: the Wolf Rider's)
      body: 'body', hips: 'root', legs: [['legFL', 1], ['legBR', 1], ['legFR', -1], ['legBL', -1]], shins: [], head: 'head', size: 0.72, seatZ: -0.04,
      back: 1.04 },   // (its back given: the fur's spikes stand up above it and would sit the rider on their tips)
  };
  function mountOn(m, mt) {
    const M4 = FF7.M4, K = MOUNTS[mt.kind] || MOUNTS.chocobo, c = K.build(mt);
    const k = mt.size || K.size, r = mt.rider || 0.72, fat = mt.fat ? [1.6, 1.25, 1.35] : [1, 1, 1], root = m.root;
    for (const b of c.order) {
      const f = b.parent && b.parent.name === K.body ? fat : /^thigh/.test(b.name) ? [fat[0], 1, 1] : [1, 1, 1];
      m.bone('mt_' + b.name, b.parent ? 'mt_' + b.parent.name : null, b.offset.map((v, i) => v * k * f[i]), b.rest);
      const sc = M4.trs(M4.create(), [0, 0, 0], [0, 0, 0], b.name === K.body ? fat.map(v => v * k) : [k, k, k]);
      for (const a of b.meshes) m.attach('mt_' + b.name, a.mesh, a.m ? M4.mul(M4.create(), sc, a.m) : sc, a.opts);
    }
    m.root = root;   // (the moogle's hips stay the model's root: the mount is a second, unmoving root under it)
    // the seat: the top of the mount's back, measured from its own mesh along its spine, a little behind the middle
    const z0 = K.seatZ * k * fat[2];
    m.computeWorld();
    let back = 0;
    for (const a of m.bones['mt_' + K.body].meshes) {
      const W = a.m ? M4.mul(M4.create(), m.bones['mt_' + K.body].world, a.m) : m.bones['mt_' + K.body].world, P = a.mesh.pos;
      for (let i = 0; i < P.length; i += 3) { const q = M4.transformPoint(W, [P[i], P[i + 1], P[i + 2]]); if (Math.abs(q[0]) < 0.1 * k && Math.abs(q[2] - z0) < 0.14 * k && q[1] > back) back = q[1]; }
    }
    if (K.back) back = K.back * k; else if (!back) back = 0.7 * k;
    const h = m.bones.hips;
    h.offset = [h.offset[0], back + 0.04 * r, h.offset[2] + z0];
    m.height = (m.height || 0.72) * r + back;
    m.mounted = true;
    const was = m.onPose;
    m.onPose = (mm) => {
      if (was) was(mm);
      mm.bones.hips.scl[0] = mm.bones.hips.scl[1] = mm.bones.hips.scl[2] = r;   // (the rider's size: every bone of it hangs from the hips)
      // astride: thighs out to the mount's flanks and a little forward, whatever the clip does with them
      const B = mm.bones; B.thighL.rot[0] = -0.35; B.thighL.rot[2] = 1.15; B.thighR.rot[0] = -0.35; B.thighR.rot[2] = -1.15;
      B.shinL.rot[0] = B.shinR.rot[0] = 0.3; B.footL.rot[0] = B.footR.rot[0] = 0;
      B.hips.pos[1] = Math.max(B.hips.pos[1], -0.01);
      // the mount: walks with the moogle's walk, a gentle breath otherwise
      const clip = mm.clipName || '', ph = (mm.t || 0) / ((mm.clip && mm.clip.dur) || 60) * Math.PI * 2, run = /run/.test(clip);
      if (/walk|run/.test(clip)) {
        const sw = Math.sin(ph) * (run ? 0.7 : 0.45);
        K.legs.forEach(([n, sg]) => { const b = B['mt_' + n]; if (b) b.rot[0] = b.rest[0] - sg * sw; });
        K.shins.forEach(([n, sg]) => { const b = B['mt_' + n]; if (b) b.rot[0] = Math.max(0, sg * Math.cos(ph)) * 0.6; });
        const mh = B['mt_' + K.hips]; if (mh) { mh.pos[1] = Math.abs(Math.cos(ph)) * 0.02 * k; B.hips.pos[1] += mh.pos[1]; }
      }
      const hd = B['mt_' + K.head]; if (hd) hd.rot[0] = hd.rest[0] + Math.sin((mm.t || 0) * 0.05) * 0.06;
    };
  }
  // a species' place in its line: n (1, 2, 3), of (the line's stages), legend (the one-of-a-kind ones)
  let PRE_N = -1, PRE_OF = {};   // (each kind's earlier stage, built once for the species there are)
  KP.stageOf = function (id) {
    const N = Object.keys(KP.SPECIES).length;
    if (N !== PRE_N) { PRE_N = N; PRE_OF = {}; for (const k of Object.keys(KP.SPECIES)) { const e = KP.SPECIES[k].evo; if (e && e.to) PRE_OF[e.to] = k; } }
    let n = 1, q = id;
    for (let i = 0; i < 4 && PRE_OF[q]; i++) { n++; q = PRE_OF[q]; }
    let of = n; for (let e = (KP.SPECIES[id] || {}).evo; e && of < 5; e = (KP.SPECIES[e.to] || {}).evo) of++;
    return { n, of, legend: ((KP.SPECIES[id] || {}).rate || 120) <= 5 };
  };
  // what each stage adds over the one before: the second stage grows its wings and takes a mantle in its job's colour
  // and a bigger pom-pom; the third a grand pair of wings over those, a longer mantle, pauldrons, a crown of light round
  // the pom-pom and a bright core on its chest (a job that brings its own wings keeps them)
  const OWN_WINGS = ['onewing', 'crystalwings', 'dragonwings', 'beewings', 'smallwings', 'featherwings', 'sixwings', 'fairy', 'jetpack'];
  const wingsOf = (mb, col, k, lift, back) => [1, -1].forEach(sd => {
    const P = (x, y, z) => [sd * x * k * T, (0.42 + (y - 0.42) * k + lift) * T, (z - back) * T];
    const B = P(0.06, 0.4, -0.14), P0 = P(0.2, 0.52, -0.22), P1 = P(0.4, 0.56, -0.3), P2 = P(0.33, 0.44, -0.27), Q = P(0.27, 0.36, -0.25), P3 = P(0.2, 0.42, -0.22), R = P(0.13, 0.33, -0.19);
    mb.tri(B, P0, P3, col); mb.tri(P0, P1, P2, sh(col, 0.06)); mb.tri(P0, P2, P3, sh(col, -0.08)); mb.tri(P2, Q, P3, col); mb.tri(B, P3, R, sh(col, 0.04));
  });
  function stageParts(m, part, S, L, st, tcol) {
    const n = st.legend || (st.n === st.of && st.of > 1) ? 3 : st.n;   // (3: a final's dress)
    if (n < 2 && st.of > 1) return;                      // (a first stage stays small and plain)
    if (st.of === 1 && !st.legend) return;               // (one-stage kinds: as they are)
    const wing = S.wing || '#c84a4a', c1 = L.g1 || tcol, c2 = L.g2 || '#e8c040', ownWings = (L.extra || []).some(k => OWN_WINGS.includes(k));
    if (!ownWings) part('torso', (mb) => { wingsOf(mb, wing, n >= 3 ? 1.7 : 1.4, n >= 3 ? 0.04 : 0.02, 0.02); if (n >= 3) wingsOf(mb, sh(wing, 0.12), 1.25, 0.2, 0.05); });
    if (!L.cape) part('torso', (mb) => capeOf(mb, sh(c1, -0.05), n >= 3 ? -0.2 : 0.05, n >= 3 ? 0.08 : 0.03));
    // the pom-pom, bigger (and at the last stage a ring of light round it), where a hat doesn't cover it
    const bare = !L.hat || L.hat === 'none';
    if (bare) m.attach('head', glowOf(mb => mb.sphere(0, 0.62 * T, 0, (n >= 3 ? 0.085 : 0.07) * T, (n >= 3 ? 0.085 : 0.07) * T, (n >= 3 ? 0.085 : 0.07) * T, S.pom || '#ff4a6a', 8, 6, true)));
    if (n >= 3) {
      if (bare) m.attach('head', glowOf(mb => { mb.push(); mb.translate(0, 0.62 * T, 0); mb.rotate(0.35, 0, 0); for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; mb.sphere(Math.cos(a) * 0.13 * T, 0, Math.sin(a) * 0.13 * T, 0.018 * T, 0.018 * T, 0.018 * T, c2, 5, 3, true); } mb.pop(); }));
      // pauldrons on both shoulders, and a bright core on the chest
      ['armL', 'armR'].forEach(b => part(b, (mb) => { mb.sphere(0, 0.02 * T, 0, 0.1 * T, 0.07 * T, 0.1 * T, c2, 8, 5, true); mb.sphere(0, 0.06 * T, 0, 0.06 * T, 0.03 * T, 0.06 * T, sh(c2, -0.2), 6, 4, true); }));
      m.attach('torso', glowOf(mb => mb.sphere(0, 0.17 * T, 0.272 * T, 0.05 * T, 0.05 * T, 0.016 * T, tcol, 8, 4, false)));
    }
  }
  // field actors: { enemy: 'kp_<species>', scale }
  FF7.creatures.MODELS = FF7.creatures.MODELS || {};
  Object.keys(KP.SPECIES || {}).forEach(id => { FF7.creatures.MODELS['kp_' + id] = () => { const m = KP.moogleModel(id, { style: 'field' }); m.enemyHuman = true; return m; }; });
})();
