// Mog's House (Wonder Square's machine, js/maps/c6a/part3.js): a visual novel in a 3D storybook Moogle Hollow.
// Mog loves Mog-Mog, who lives up in the Great Tree; in seven days, at the Festival of Stars, whoever flies up to
// her with a star-flower may win her heart - and Moglin, the fastest wings in the Hollow, means to. Each day the
// player picks what Mog does (a Kupo Nut: wings and belly; flying practice: wings, and it burns the belly off, but
// not on an empty stomach; a visit to Mog-Mog: heart; Grandpa Kupo's advice costs nothing). Five endings.
//   opts: {} . Result { won (ending 1 or 5), ending, name, score }
// OK advances / chooses; hold ✕ to fast-forward. The story is a generator (FF7.Coroutine) yielding waitables.
(function () {
  const U = FF7.util, R = FF7.render, GL = FF7.GL, M4 = FF7.M4, MG = FF7.minigames, ui = MG.ui;
  const W = FF7.W, H = FF7.H;
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DAYS = 7, NEED_WINGS = 5, MAX_BELLY = 3;
  const ENDINGS = { 1: 'Wings of Love', 2: 'Splash!', 3: 'Grounded', 4: 'Tongue-Tied', 5: 'Kupo Forever' };
  MG.mogEndings = ENDINGS;

  // ------------------------------------------------------------------ the moogles
  const LOOKS = {
    mog: { name: 'Mog', fur: '#fbf8f2', pom: '#e02030', wing: '#8a58c8', col: '#ffffff' },
    mogmog: { name: 'Mog-Mog', fur: '#fff0f5', pom: '#ff64ae', wing: '#c270dc', col: '#ffa0d0', bow: true, size: 0.92 },
    grandpa: { name: 'Grandpa Kupo', fur: '#ebe5d8', pom: '#a84444', wing: '#6a5a86', col: '#e0d0a0', beard: true, cane: true },
    moglin: { name: 'Moglin', fur: '#fffbf2', pom: '#ffc418', wing: '#4a6ee0', col: '#ffd860', scarf: true, wings: 1.25 },
    kid1: { fur: '#fbf8f2', pom: '#40b0ff', wing: '#8a58c8', size: 0.8 },
    kid2: { fur: '#fbf8f2', pom: '#60d060', wing: '#8a58c8', size: 0.85 },
    kid3: { fur: '#f6f0ea', pom: '#ff9030', wing: '#9a60b0', size: 0.9 },
    kid4: { fur: '#fbf8f2', pom: '#b070ff', wing: '#7a58c8', size: 0.82 },
  };
  const meshCache = {};
  function moogleMeshes(id) {
    if (meshCache[id]) return meshCache[id];
    const o = LOOKS[id];
    const body = MG.mesh(mb => {
      mb.sphere(0, 0.27, 0, 0.19, 0.21, 0.17, o.fur, 10, 8, true);                                   // body
      mb.sphere(0, 0.6, 0.01, 0.235, 0.205, 0.205, o.fur, 12, 8, true);                              // head
      [-1, 1].forEach(k => mb.sphere(k * 0.1, 0.05, 0.03, 0.07, 0.05, 0.09, o.fur, 6, 4, true));      // feet
      [-1, 1].forEach(k => mb.sphere(k * 0.18, 0.3, 0.05, 0.05, 0.08, 0.05, o.fur, 6, 4, true));      // arms
      [-1, 1].forEach(k => mb.spike([k * 0.15, 0.72, -0.01], [k * 0.55, 0.85, -0.1], 0.11, 0.05, 4, o.fur));   // ears
      mb.sphere(0, 0.57, 0.205, 0.05, 0.036, 0.03, '#f28a9a', 6, 4, true);                           // nose
      [-1, 1].forEach(k => mb.sphere(k * 0.08, 0.64, 0.19, 0.02, 0.028, 0.012, '#2a1a1a', 6, 4, true));        // eyes
      if (o.bow) {   // Mog-Mog: lashes, rosy cheeks, a flower by her ear
        [-1, 1].forEach(k => { mb.box(k * 0.1, 0.67, 0.19, 0.035, 0.008, 0.008, '#2a1a1a'); mb.sphere(k * 0.13, 0.57, 0.17, 0.03, 0.018, 0.01, '#ffa0c0', 6, 3, true); });
        [0, 1.26, 2.51, 3.77, 5.03].forEach(a => mb.sphere(-0.17 + Math.cos(a) * 0.035, 0.74 + Math.sin(a) * 0.035, 0.05, 0.026, 0.026, 0.015, '#ffd0e8', 5, 3, true));
        mb.sphere(-0.17, 0.74, 0.06, 0.018, 0.018, 0.012, '#ffd040', 5, 3, true);
      }
      if (o.beard) {   // Grandpa: a long beard, bushy brows, a cane
        mb.spike([0, 0.52, 0.16], [0, -1, 0.35], 0.26, 0.09, 6, '#d8d2c6');
        [-1, 1].forEach(k => mb.box(k * 0.085, 0.69, 0.19, 0.07, 0.025, 0.02, '#f4f0e8'));
        mb.box(0.24, 0.24, 0.08, 0.025, 0.5, 0.025, '#7a5230'); mb.box(0.21, 0.49, 0.08, 0.08, 0.025, 0.025, '#7a5230');
      }
      if (o.scarf) {   // Moglin: a red scarf, its tail flying
        mb.prism(0, 0.4, 0.01, 0.17, 0.17, 0.06, 10, '#d02a2a', true); mb.box(-0.12, 0.34, -0.14, 0.06, 0.16, 0.03, '#d02a2a');
        [-1, 1].forEach(k => mb.box(k * 0.08, 0.675, 0.19, 0.05, 0.012, 0.01, '#2a1a1a'));        // (a cocky squint)
      }
    });
    const wing = MG.mesh(mb => {   // (a bat wing, spreading +x and back; mirrored for the left)
      mb.tri([0, 0, 0], [0.26, 0.15, -0.06], [0.22, -0.02, -0.05], o.wing);
      mb.tri([0, 0, 0], [0.22, -0.02, -0.05], [0.1, -0.12, -0.03], o.wing);
      mb.box(0.13, 0.075, -0.03, 0.26, 0.015, 0.015, '#4a3060');
    }, { cull: false });
    const pom = MG.mesh(mb => { mb.box(0, 0.09, 0, 0.012, 0.18, 0.012, '#3a3030'); mb.sphere(0, 0.2, 0, 0.055, 0.055, 0.055, o.pom, 8, 6, true); });
    return (meshCache[id] = { body, wing, pom });
  }

  // ------------------------------------------------------------------ Moogle Hollow (one diorama; shots frame parts)
  const SPOTS = { house: [-2.2, 0, -0.4], stump: [-0.6, 0, 0.9], pond: [1.0, 0, 1.5], grandpa: [-4.4, 0, -2.4], field: [3.0, 0, 0.6], tree: [4.4, 0, -4.4], top: [4.4, 4.05, -4.0] };
  let envMesh = null, glowMesh = null, props = null;
  function hollow() {
    if (envMesh) return;
    const rnd = MG.rng('mog-hollow');
    envMesh = MG.mesh(mb => {
      mb.floor(-12, -12, 12, 10, 0, '#6aa848');
      for (let i = 0; i < 70; i++) { const x = -11 + rnd() * 22, z = -11 + rnd() * 20, r = 0.4 + rnd() * 1.2; mb.prism(x, 0.002, z, r, r, 0.004, 8, rnd() < 0.5 ? '#78b454' : '#5e9a40', false, true, false); }
      // the path from Mog's door past the pond to the field and the tree
      [[-2.2, -0.1], [-1.4, 0.4], [-0.3, 0.3], [0.8, 0.4], [2.0, 0.2], [3.2, -0.6], [3.8, -1.8], [4.1, -3.0]].forEach(([x, z]) => mb.prism(x, 0.005, z, 0.45, 0.45, 0.004, 10, '#c8b078', false, true, false));
      // Mog's house: a round hut, a red cone roof, a round door and window
      const [hx, , hz] = SPOTS.house;
      mb.prism(hx, 0, hz - 0.5, 0.55, 0.5, 0.75, 12, '#e8d4a8', true); mb.prism(hx, 0.72, hz - 0.5, 0.72, 0, 0.62, 12, '#c04a3a', true);
      mb.prism(hx, 0.001, hz - 0.5 + 0.47, 0.17, 0.17, 0.02, 10, '#6a4428', true); mb.box(hx, 0.24, hz - 0.03, 0.26, 0.46, 0.03, '#7a5030');
      mb.box(hx + 0.32, 0.45, hz - 0.1, 0.16, 0.16, 0.03, '#ffe8a0'); mb.box(hx, 1.5, hz - 0.5, 0.05, 0.25, 0.05, '#5a4030');
      mb.box(hx - 0.7, 0.3, hz + 0.2, 0.08, 0.6, 0.08, '#8a6a40'); mb.box(hx - 0.7, 0.62, hz + 0.2, 0.2, 0.14, 0.14, '#3a70c0');   // the mailbox
      // the practice stump
      const [sx, , sz] = SPOTS.stump;
      mb.prism(sx, 0, sz, 0.34, 0.3, 0.32, 10, '#7a5230', true); mb.prism(sx, 0.32, sz, 0.28, 0.28, 0.005, 10, '#c8a070', false, true, false);
      // the pond
      const [px, , pz] = SPOTS.pond;
      mb.prism(px, 0.004, pz, 1.05, 1.05, 0.006, 16, '#8ab870', false, true, false); mb.prism(px, 0.008, pz, 0.95, 0.95, 0.006, 16, '#3a78c0', false, true, false);
      [[0.3, 0.2], [-0.4, -0.3], [0.1, -0.5]].forEach(([a, b]) => mb.prism(px + a, 0.014, pz + b, 0.14, 0.14, 0.004, 8, '#4aa048', false, true, false));   // lily pads
      // Grandpa's hut: older, a grey roof, a lantern
      const [gx, , gz] = SPOTS.grandpa;
      mb.prism(gx, 0, gz - 0.5, 0.6, 0.55, 0.7, 10, '#c8b890', true); mb.prism(gx, 0.68, gz - 0.5, 0.78, 0, 0.55, 10, '#6a6a70', true);
      mb.box(gx, 0.24, gz - 0.02, 0.26, 0.46, 0.03, '#5a3a24'); mb.box(gx + 0.45, 0.5, gz + 0.1, 0.03, 1.0, 0.03, '#4a3a2a');
      // the flower field
      for (let i = 0; i < 60; i++) {
        const [fx, , fz] = SPOTS.field, x = fx - 1.1 + rnd() * 2.2, z = fz - 1.0 + rnd() * 2.0;
        mb.box(x, 0.05, z, 0.01, 0.1, 0.01, '#3a7a2a'); mb.sphere(x, 0.11, z, 0.035, 0.03, 0.035, ['#ff80b0', '#ffe060', '#ffffff', '#b080ff', '#ff6040'][i % 5], 5, 3, true);
      }
      // the Great Tree on its hill, the platform in its branches
      const [tx, , tz] = SPOTS.tree;
      mb.sphere(tx, -0.6, tz, 2.4, 1.4, 2.4, '#5e9a40', 12, 6, true);
      mb.prism(tx, 0.4, tz, 0.5, 0.32, 4.2, 10, '#7a5230', true);
      [[0, 6.0, -0.2, 1.7], [-1.2, 5.6, 0.1, 1.2], [1.2, 5.7, -0.4, 1.3], [0.3, 5.6, -1.3, 1.1], [-0.3, 6.8, -0.5, 1.1]].forEach(([a, b, c, r]) => mb.sphere(tx + a, b, tz + c, r, r * 0.8, r, '#3f8a38', 10, 6, true));
      mb.box(tx, 4.0, tz + 0.4, 1.8, 0.1, 1.4, { top: '#b08858', side: '#7a5a38' });                                 // the platform
      [[-0.85, 0.5], [0.85, 0.5], [-0.85, 1.05], [0.85, 1.05]].forEach(([a, b]) => mb.box(tx + a, 4.2, tz + b, 0.05, 0.4, 0.05, '#7a5a38'));
      mb.box(tx, 4.38, tz + 1.08, 1.75, 0.04, 0.04, '#7a5a38');
      for (let i = 0; i < 12; i++) mb.box(tx + 0.55, 0.4 + i * 0.3, tz + 0.52, 0.22, 0.04, 0.06, '#8a6a40');           // the ladder rungs
      // trees round the edge, a fence, rocks
      for (let i = 0; i < 22; i++) {
        const a = i / 22 * Math.PI * 2, r = 8.5 + rnd() * 2, x = Math.cos(a) * r, z = Math.sin(a) * r - 1;
        mb.prism(x, 0, z, 0.14, 0.1, 0.9, 6, '#7a5230', true); mb.sphere(x, 1.3, z, 0.7, 0.8, 0.7, rnd() < 0.5 ? '#3f8a38' : '#4a9a40', 8, 6, true);
      }
      for (let i = 0; i < 8; i++) mb.box(-3.6 + i * 0.35, 0.18, 1.9, 0.05, 0.36, 0.05, '#a08050');
      mb.box(-2.4, 0.3, 1.9, 2.5, 0.04, 0.04, '#a08050');
      [[1.8, -1.6], [-1.0, -2.8], [5.8, 1.6]].forEach(([x, z]) => mb.sphere(x, 0.12, z, 0.3, 0.2, 0.25, '#9a9a90', 6, 4, false));
    });
    glowMesh = MG.mesh(mb => {   // the festival: lanterns round the platform and strung down the tree
      const [tx, , tz] = SPOTS.tree;
      const cols = ['#ffd060', '#ff80c0', '#80e0ff', '#ffb040'];
      for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; mb.sphere(tx + Math.cos(a) * 1.25, 4.75 + Math.sin(a * 3) * 0.1, tz + 0.4 + Math.sin(a) * 0.9, 0.06, 0.075, 0.06, cols[i % 4], 6, 4, true); }
      for (let i = 0; i < 14; i++) { const k = i / 13; mb.sphere(lerp(tx - 1.6, tx + 1.6, k), 3.4 - Math.sin(k * Math.PI) * 0.5, tz + 1.6, 0.06, 0.08, 0.06, cols[i % 4], 6, 4, true); }
      mb.box(SPOTS.house[0] + 0.32, 0.45, SPOTS.house[2] - 0.08, 0.16, 0.16, 0.02, '#ffe070');
      mb.box(SPOTS.grandpa[0] + 0.45, 1.02, SPOTS.grandpa[2] + 0.1, 0.1, 0.1, 0.1, '#ffd050');
    }, { unlit: true });
    props = {
      nut: MG.mesh(mb => { mb.sphere(0, 0, 0, 0.06, 0.07, 0.06, '#9a6a3a', 7, 5, true); mb.sphere(0, 0.06, 0, 0.045, 0.02, 0.045, '#6a4a2a', 6, 3, true); }),
      flower: MG.mesh(mb => { mb.box(0, 0.08, 0, 0.012, 0.16, 0.012, '#3a8a2a'); [0, 1.26, 2.51, 3.77, 5.03].forEach(a => mb.sphere(Math.cos(a) * 0.04, 0.17 + Math.sin(a) * 0.04, 0, 0.03, 0.03, 0.015, '#fff4a0', 5, 3, true)); mb.sphere(0, 0.17, 0.01, 0.022, 0.022, 0.02, '#ff9ad0', 5, 3, true); }, { unlit: true }),
    };
  }
  const TIMES = {   // sky gradient, light, ambient
    morning: { sky: ['#8ac8f4', '#fff2d8'], light: [0.95, 0.9, 0.8], amb: [0.52, 0.52, 0.56] },
    day: { sky: ['#6ab4f0', '#e8f4ff'], light: [1.0, 0.97, 0.9], amb: [0.55, 0.55, 0.58] },
    dusk: { sky: ['#6a5aa0', '#ffa070'], light: [1.0, 0.72, 0.52], amb: [0.45, 0.4, 0.48] },
    night: { sky: ['#0a0c28', '#2a2458'], light: [0.75, 0.68, 0.72], amb: [0.44, 0.4, 0.5] },
  };
  // the surface under a point: the platform in the tree, the stump, or the ground
  function groundY(p) {
    const T = SPOTS.tree, S = SPOTS.stump;
    if (p[1] >= 3.95 && Math.abs(p[0] - T[0]) < 0.9 && Math.abs(p[2] - (T[2] + 0.4)) < 0.7) return 4.06;
    if (p[1] >= 0.3 && Math.hypot(p[0] - S[0], p[2] - S[2]) < 0.3) return 0.33;
    return 0.01;
  }
  // camera shots: [eye, look at]
  const SHOTS = {
    wide: [[0.6, 5.2, 8.4], [0.6, 1.2, -1.2]],
    house: [[-1.25, 1.2, 2.5], [-2.05, 0.55, -0.2]],
    stump: [[0.35, 1.7, 3.5], [-0.6, 1.0, 0.8]],
    pond: [[0.9, 1.5, 4.0], [1.0, 0.3, 1.4]],
    grandpa: [[-3.5, 1.25, -0.4], [-4.3, 0.55, -2.1]],
    field: [[3.0, 1.2, 3.5], [3.0, 0.62, 0.8]],
    tree: [[2.2, 1.6, 2.6], [4.3, 3.4, -3.6]],
    top: [[4.0, 4.9, -1.4], [4.4, 4.35, -3.7]],
    festival: [[2.4, 2.2, 3.6], [4.0, 2.2, -3.0]],
    base: [[3.75, 1.25, 1.9], [4.0, 0.6, -1.0]],
  };

  // ------------------------------------------------------------------ the game
  class MogHouse {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      hollow();
      this.st = { day: 1, wings: 0, belly: 0, heart: 0, visits: 0, fed: 0, practiced: 0 };
      this.time = 'morning'; this.eye = SHOTS.wide[0].slice(); this.at = SHOTS.wide[1].slice(); this.shotTo = null;
      this.actors = {};
      this.box = null; this.menu = null; this.card = null; this.pops = []; this.status = false;
      this.co = new FF7.Coroutine(story(this), { name: 'mog_house' });
      this.stars = Array.from({ length: 60 }, (_, i) => [((i * 97) % 640), ((i * 53) % 220) + 10, (i % 3) + 1]);
    }
    begin() { }
    // ---- the story's commands (waitables)
    actor(id, pos, yaw) { const a = this.actors[id] || (this.actors[id] = { id, pos: [0, 0, 0], yaw: 0, anim: 'idle', t: 0, visible: true, look: LOOKS[id] }); if (pos) a.pos = pos.slice(); if (yaw != null) a.yaw = yaw; a.visible = true; a.move = null; return a; }
    hide(id) { if (this.actors[id]) this.actors[id].visible = false; return 1; }
    anim(id, name) { const a = this.actors[id]; if (a) { a.anim = name; a.t = 0; } return 1; }
    moveTo(id, to, frames, arc) { const a = this.actors[id]; if (!a) return 1; a.move = { from: a.pos.slice(), to: to.slice(), n: frames, t: 0, arc: arc || 0 }; a.yaw = Math.atan2(to[0] - a.pos[0], to[2] - a.pos[2]); return frames; }
    // two talking: each faces the other, turned partly toward the camera (where the current shot ends)
    converse(a, b, k = 0.45) {
      const E = this.shotTo ? this.shotTo.e1 : this.eye;
      [[a, b], [b, a]].forEach(([p, q]) => {
        const A = this.actors[p], B = this.actors[q]; if (!A || !B) return;
        const toB = Math.atan2(B.pos[0] - A.pos[0], B.pos[2] - A.pos[2]), toC = Math.atan2(E[0] - A.pos[0], E[2] - A.pos[2]);
        let d = toC - toB; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        A.yaw = toB + d * k;
      });
      return 1;
    }
    face(id, yaw) { const a = this.actors[id]; if (a) a.yaw = typeof yaw === 'string' ? Math.atan2(this.actors[yaw].pos[0] - a.pos[0], this.actors[yaw].pos[2] - a.pos[2]) : yaw; return 1; }
    shot(name, frames = 40, custom) {
      const s = custom || SHOTS[name];
      if (!frames) { this.eye = s[0].slice(); this.at = s[1].slice(); this.shotTo = null; return 1; }
      this.shotTo = { e0: this.eye.slice(), a0: this.at.slice(), e1: s[0], a1: s[1], n: frames, t: 0 };
      return frames;
    }
    tod(name) { this.time = name; return 1; }
    say(who, text) { this.box = { who, text, n: 0, done: false }; return this.box; }
    narr(text) { return this.say(null, text); }
    choose(prompt, options, tag) { this.box = { who: null, text: prompt, n: prompt.length, done: true, sticky: true }; this.menu = { options, idx: 0, done: false, result: 0, tag }; return this.menu; }
    title(big, sub, foot) { this.card = { big, sub, foot, done: false, t: 0 }; return this.card; }
    pop(text, col) { this.pops.push({ text, col: col || '#ffe060', t: 0 }); return 1; }
    hearts(id, n = 6) { const a = this.actors[id]; if (a) for (let i = 0; i < n; i++) this.fx.add([a.pos[0] + (Math.random() - 0.5) * 0.3, a.pos[1] + 0.85, a.pos[2]], [(Math.random() - 0.5) * 0.01, 0.012 + Math.random() * 0.01, 0], 60, '#ff70b0', 0.07, -0.0001, 'add'); return 1; }
    music(id) { try { FF7.audio.play(id, { fade: 30 }); } catch (e) { } return 1; }
    // ---- frame
    update(I) {
      this.t++; this.fx.update();
      const fast = I.held('cancel');
      if (this.shotTo) { const s = this.shotTo; s.t++; const k = clamp(s.t / s.n, 0, 1), e = k * k * (3 - 2 * k); for (let i = 0; i < 3; i++) { this.eye[i] = lerp(s.e0[i], s.e1[i], e); this.at[i] = lerp(s.a0[i], s.a1[i], e); } if (s.t >= s.n) this.shotTo = null; }
      for (const id in this.actors) {
        const a = this.actors[id]; a.t++;
        if (a.move) { const m = a.move; m.t++; const k = clamp(m.t / m.n, 0, 1); for (let i = 0; i < 3; i++) a.pos[i] = lerp(m.from[i], m.to[i], k); a.pos[1] += Math.sin(k * Math.PI) * m.arc; if (m.t >= m.n) a.move = null; }
      }
      this.pops = this.pops.filter(p => ++p.t < 90);
      if (this.card) { this.card.t++; if (this.card.t > 30 && (I.pressed('ok') || (fast && this.card.t > 50))) { this.card.done = true; this.card = null; MG.sfx('confirm', 0.5); } }
      else if (this.menu) {
        const m = this.menu;
        if (I.repeat('up')) { m.idx = (m.idx + m.options.length - 1) % m.options.length; MG.sfx('cursor'); }
        if (I.repeat('down')) { m.idx = (m.idx + 1) % m.options.length; MG.sfx('cursor'); }
        if (I.pressed('ok')) { m.result = m.idx; m.done = true; this.menu = null; this.box = null; MG.sfx('confirm'); }
      } else if (this.box && !this.box.sticky) {
        const b = this.box, len = b.text.length;
        b.n = Math.min(len, b.n + (fast ? 8 : 1.4));
        if (b.n >= len) b.full = (b.full || 0) + 1;
        if (I.pressed('ok')) { if (b.n < len) b.n = len; else { b.done = true; this.box = null; } }
        else if (fast && b.full > 6) { b.done = true; this.box = null; }
      }
      if (!this.co.done) this.co.update();
      else if (!this.result) { this.done = true; }
    }
    // (the Demo and the tests) mash through the text; the week that ends best: nut, practice, nut, practice, nut,
    // then two visits (and the promise)
    bot() {
      if (this.card) return this.t % 8 === 0 ? ['ok'] : [];
      if (this.menu) {
        const m = this.menu, want = typeof this.botPick === 'function' ? this.botPick(m) : 0;
        if (m.idx !== want) return this.t % 3 === 0 ? [want > m.idx ? 'down' : 'up'] : [];
        return this.t % 6 === 0 ? ['ok'] : [];
      }
      if (this.box && !this.box.sticky) return this.t % (this.opts.botRate || 5) === 0 ? ['ok'] : [];
      return [];
    }
    botPick(m) {
      if (m.tag === 'day') {   // (a plan entry 'advice>feed': ask Grandpa first, then feed)
        const plan = this.opts.botPlan || ['feed', 'practice', 'feed', 'practice', 'feed', 'visit', 'visit'], e = plan[this.st.day - 1] || 'visit';
        let want = e;
        if (e.includes('>')) want = this.advisedDay === this.st.day ? e.split('>')[1] : 'advice';
        return Math.max(0, m.keys.indexOf(want));
      }
      if (m.tag === 'promise') return this.opts.botPromise || 0;
      return 0;
    }
    render() {
      const T = TIMES[this.time] || TIMES.day;
      MG.sky(T.sky[0], T.sky[1]);
      if (this.time === 'night') { const c = R.ctx; this.stars.forEach(([x, y, s], i) => { c.globalAlpha = 0.5 + 0.5 * Math.sin(this.t * 0.05 + i); c.fillStyle = '#ffffff'; c.fillRect(x, y, s, s); }); c.globalAlpha = 1; }
      this.cam.set(this.eye, this.at, 42, 0.05, 80);
      GL.begin({ clear: [0, 0, 0, 0], fog: { color: T.sky[1] === '#2a2458' ? [0.1, 0.1, 0.2] : [0.85, 0.9, 0.95], near: 14, far: 40 }, light: { dir: [-0.35, -0.85, -0.4], color: T.light, ambient: T.amb } });
      this.cam.apply();
      GL.draw(envMesh, null);
      if (this.time === 'night' || this.time === 'dusk') GL.draw(glowMesh, null);
      for (const id in this.actors) this.drawMoogle(this.actors[id]);
      for (const id in this.actors) { const a = this.actors[id]; if (a.visible && a.hold) MG.put(props[a.hold], this.handPos(a), [0, a.yaw, 0], a.hold === 'flower' ? 1 : 0.9); }
      this.fx.draw();
      GL.end();
      this.renderUI();
    }
    handPos(a) { const s = (a.look.size || 1), c = Math.cos(a.yaw), n = Math.sin(a.yaw); return [a.pos[0] + (0.2 * c + 0.12 * n) * s, a.pos[1] + 0.34 * s + (a.bob || 0), a.pos[2] + (-0.2 * n + 0.12 * c) * s]; }
    drawMoogle(a) {
      if (!a.visible) return;
      const M = moogleMeshes(a.id), s = a.look.size || 1, t = a.t, belly = a.id === 'mog' ? this.st.belly : 0;
      const talking = this.box && !this.box.sticky && this.box.who === a.id && this.box.n < this.box.text.length;
      let bob = Math.sin(t * 0.08) * 0.008, pitch = 0, flap = Math.sin(t * 0.12) * 0.12;
      if (talking) bob += Math.abs(Math.sin(t * 0.35)) * 0.025;
      if (a.anim === 'flap' || a.anim === 'fly') { flap = Math.sin(t * 0.9) * 0.9; if (a.anim === 'flap') bob += Math.abs(Math.sin(t * 0.3)) * 0.06; }
      if (a.anim === 'happy') { bob += Math.abs(Math.sin(t * 0.25)) * 0.07; flap = Math.sin(t * 0.5) * 0.5; }
      if (a.anim === 'sad') { pitch = 0.25; flap = -0.3; bob *= 0.3; }
      if (a.anim === 'eat') { bob += Math.abs(Math.sin(t * 0.4)) * 0.02; }
      if (a.anim === 'dizzy') { pitch = Math.sin(t * 0.2) * 0.25; }
      a.bob = bob;
      const P = M4.trs(M4.create(), [a.pos[0], a.pos[1] + bob, a.pos[2]], [pitch, a.yaw, 0], [s * (1 + 0.07 * belly), s, s * (1 + 0.07 * belly)]);
      MG.putIn(P, M.body, [0, 0, 0]);
      const ws = a.look.wings || 1;
      [-1, 1].forEach(k => MG.putIn(P, M.wing, [k * 0.09, 0.4, -0.14], [0, k * -(0.5 + flap * 0.45), k * (0.25 + flap * 0.35)], [k * ws, ws, ws]));
      MG.putIn(P, M.pom, [0, 0.78, -0.03], [Math.sin(t * 0.07) * 0.18, 0, Math.sin(t * 0.05) * 0.25]);
      MG.shadow(a.pos[0], groundY(a.pos), a.pos[2], 0.2 * s, a.pos[1] - groundY(a.pos) < 0.05 ? 0.3 : 0.15);
    }
    renderUI() {
      const c = R.ctx;
      // the week (while planning)
      if (this.status) {
        const s = this.st;
        R.window(10, 10, 236, 108);
        R.text(`Day ${Math.min(s.day, DAYS)} of ${DAYS}`, 22, 18, { size: 15, color: '#ffe060' });
        const row = (y, label, n, max, on, off, col) => {
          R.text(label, 22, y, { size: 13, color: R.COL.cyan });
          const k = clamp(n, 0, max), a = on.repeat(k);
          R.text(a, 92, y - 2, { size: 16, color: col }); R.text(off.repeat(max - k), 92 + R.measure(a, 16), y - 2, { size: 16, color: '#5a5f78' });
          if (n > max) R.text('+' + (n - max), 96 + R.measure(on.repeat(max), 16), y, { size: 12, color: col });
        };
        row(44, 'Wings', s.wings, NEED_WINGS, '★', '☆', '#ffe060');
        row(66, 'Belly', s.belly, 5, '●', '○', s.belly > MAX_BELLY ? '#ff8060' : '#f0d0a0');
        row(88, 'Heart', s.heart, 3, '♥', '♡', '#ff80b0');
      }
      // floating changes over Mog
      const mog = this.actors.mog;
      if (mog && mog.visible) this.pops.forEach((p, i) => { const q = this.cam.project([mog.pos[0], mog.pos[1] + 1.0 + p.t * 0.004, mog.pos[2]]); if (q.visible) { c.globalAlpha = clamp(2 - p.t / 45, 0, 1); R.text(p.text, q.x, q.y - i * 20, { size: 16, align: 'center', color: p.col, weight: '700' }); c.globalAlpha = 1; } });
      // the text box, its name tag
      if (this.box) {
        const b = this.box, look = b.who && LOOKS[b.who];
        R.window(18, H - 128, W - 36, 114);
        if (look) { const nw = R.measure(look.name, 15) + 28; R.window(30, H - 150, nw, 30); R.text(look.name, 44, H - 144, { size: 15, color: look.col || '#ffffff' }); }
        const shown = b.text.slice(0, Math.floor(b.n));
        R.wrap(shown, W - 80, 17).slice(0, 4).forEach((l, i) => R.text(l, 38, H - 114 + i * 24, { size: 17, color: b.who ? '#ffffff' : '#e8dcc0' }));
        if (!b.sticky && b.n >= b.text.length && (this.t >> 4) % 2) R.text('▼', W - 40, H - 34, { size: 14, color: '#ffe060' });
      }
      if (this.menu) {
        const m = this.menu, w = Math.max(...m.options.map(o => R.measure(o, 16))) + 60, h = 18 + m.options.length * 28, x = W - w - 24, y = H - 138 - h;
        R.window(x, y, w, h);
        m.options.forEach((o, i) => { R.text(o, x + 38, y + 11 + i * 28, { size: 16 }); if (i === m.idx) R.cursor(x + 30, y + 21 + i * 28); });
      }
      if (this.card) {
        const k = this.card;
        c.fillStyle = 'rgba(10,6,20,0.72)'; c.fillRect(0, 0, W, H);
        ui.big(k.big, 150, '#ffe8a0', 40); if (k.sub) ui.big(k.sub, 205, '#ffb0d8', 22);
        if (k.foot) R.text(k.foot, W / 2, 262, { size: 15, align: 'center', color: '#d0c8e0' });
        if (k.t > 30 && (this.t >> 4) % 2) R.text('▼', W / 2, 320, { size: 16, align: 'center', color: '#ffe060' });
      }
    }
    resultTitle(r) { return r.won ? 'THE END' : 'THE END...?'; }
    resultRows(r) { return [['Ending', `${r.ending}: ${r.name}`], ['Endings found', `${r.found} / 5`]]; }
  }

  // ------------------------------------------------------------------ the story
  function* story(g) {
    const S = g.st;
    const say = (who, text) => g.say(who, text), narr = (text) => g.narr(text);
    // ---- the prologue
    g.music('caitsith'); g.tod('morning');
    g.actor('mog', [SPOTS.house[0] + 0.1, 0, SPOTS.house[2] + 0.35], 0.4);
    g.actor('mogmog', [SPOTS.top[0], SPOTS.top[1], SPOTS.top[2] + 0.2], 0.3);
    yield g.title("MOG'S HOUSE", 'A Moogle Love Story', `${MG.btn('ok')}: next    Hold ${MG.btn('cancel')}: fast-forward`);
    yield g.shot('wide', 0);
    yield narr('Deep in Moogle Hollow, where the Kupo Nut trees grow, there lived a little moogle named Mog.');
    yield g.shot('house', 60);
    yield say('mog', 'Kupo... What a beautiful morning.');
    yield narr('Mog had a secret. Every morning, he gazed up at the Great Tree on the hill...');
    yield g.shot('top', 60);
    g.anim('mogmog', 'happy');
    yield narr('...where the loveliest moogle in all the Hollow made her home among the branches. Her name was Mog-Mog.');
    g.anim('mogmog', 'idle');
    yield g.shot('house', 50);
    g.anim('mog', 'flap');
    yield say('mog', "Sigh... If only I could fly up there, kupo. But my wings are so tiny...");
    g.anim('mog', 'sad');
    yield narr('Like every moogle, Mog had wings. Unlike most moogles, his had never lifted him any higher than a tree stump.');
    g.actor('grandpa', [SPOTS.house[0] - 1.6, 0, SPOTS.house[2] + 0.6], Math.PI / 2);
    yield g.moveTo('grandpa', [SPOTS.house[0] - 0.55, 0, SPOTS.house[2] + 0.45], 50);
    g.converse('mog', 'grandpa'); g.anim('mog', 'idle');
    yield say('grandpa', 'Ho ho! Mooning at the Great Tree again, young Mog?');
    yield say('mog', "G-Grandpa Kupo! I wasn't... I mean... kupo...");
    yield say('grandpa', 'Seven days from now is the Festival of Stars. At moonrise, Mog-Mog will wait atop the Great Tree.');
    yield say('grandpa', 'And by old tradition, whoever flies up to her with a star-flower may ask for her heart.');
    g.anim('mog', 'flap');
    yield say('mog', "Seven days?! But I can't even fly as high as my mailbox, kupo!");
    g.anim('mog', 'idle');
    g.actor('moglin', [SPOTS.house[0] + 3, 2.2, SPOTS.house[2] + 1.5], -1.4); g.anim('moglin', 'fly');
    yield g.moveTo('moglin', [SPOTS.house[0] + 0.75, 0, SPOTS.house[2] + 0.7], 45, 0.4);
    g.anim('moglin', 'happy'); g.converse('mog', 'moglin');
    yield say('moglin', "Did somebody say \"can't fly\"? Kupo-ho!");
    yield narr('Moglin. The fastest wings in the Hollow, and he never let anyone forget it.');
    g.anim('moglin', 'idle');
    yield say('moglin', "Don't strain those little wings, Mog. I'll be the one flying up to Mog-Mog at the festival. See ya!");
    g.anim('moglin', 'fly');
    yield g.moveTo('moglin', [SPOTS.tree[0], 4.6, SPOTS.tree[2] + 1.5], 70, 0.6);
    g.hide('moglin'); g.anim('mog', 'sad');
    yield say('mog', 'Kuuuupo...');
    g.converse('mog', 'grandpa');
    yield say('grandpa', "Chin up, lad. Seven days is plenty - if you spend them wisely.");
    yield say('grandpa', 'Wings grow strong on Kupo Nuts. But mind your belly! A round moogle is a grounded moogle. Practice burns it off.');
    yield say('grandpa', "And wings are nothing without heart. Go and see her, now and then. And come ask me, if you're ever unsure.");
    g.anim('mog', 'happy');
    yield say('mog', "I'll do it, kupo! I'll fly up there if it's the last thing I do!");
    g.hide('grandpa'); g.anim('mog', 'idle');
    yield narr(`And so began the most important week of Mog's life. (Wings: at least ${NEED_WINGS}. Belly: no more than ${MAX_BELLY} by the festival. Heart: see her.)`);

    // ---- the week
    for (S.day = 1; S.day <= DAYS; S.day++) {
      g.tod('morning'); g.music('caitsith');
      g.actor('mog', [SPOTS.house[0] + 0.1, 0, SPOTS.house[2] + 0.35], 0.4); g.anim('mog', 'idle'); g.actors.mog.hold = null;
      g.hide('mogmog'); g.hide('grandpa');
      yield g.shot('house', 30);
      g.status = true;
      yield g.title(`Day ${S.day}`, S.day === DAYS ? 'The last day before the festival' : ['A bright morning', 'Birdsong in the Hollow', 'A breezy morning', 'Dew on the flowers', 'Clouds like Kupo Nuts', 'Sunshine and butterflies'][S.day - 1]);
      let acted = false;
      while (!acted) {
        const opts = [['feed', 'Feed him a Kupo Nut'], ['practice', 'Flying practice'], ['visit', 'Visit Mog-Mog'], ['advice', 'Ask Grandpa Kupo (free)']];
        const m = g.choose(`Day ${S.day}. What should Mog do today?`, opts.map(o => o[1]), 'day');
        m.keys = opts.map(o => o[0]);
        const pick = m.keys[yield m];
        if (pick === 'advice') { yield* advice(g); continue; }
        acted = true;
        if (pick === 'feed') yield* feed(g);
        else if (pick === 'practice') yield* practice(g);
        else yield* visit(g);
      }
      g.tod('dusk'); g.music('goodnight');
      g.actor('mog', [SPOTS.house[0] + 0.1, 0, SPOTS.house[2] + 0.35], 0.4); g.anim('mog', 'idle'); g.hide('mogmog');
      yield g.shot('house', 30);
      yield narr(S.day < DAYS ? `The sun sets on day ${S.day}. ${DAYS - S.day} day${DAYS - S.day === 1 ? '' : 's'} until the festival.` : 'The sun sets on the last day. Tomorrow night: the Festival of Stars.');
      g.status = false;
    }

    // ---- the festival
    g.status = false;
    g.tod('night'); g.music('fireworks');
    g.hide('grandpa');
    g.actor('mogmog', [SPOTS.top[0], SPOTS.top[1], SPOTS.top[2] + 0.2], 0.2);
    const base = [SPOTS.tree[0] - 0.4, 0, SPOTS.tree[2] + 2.9];
    g.actor('mog', [base[0] - 0.3, 0, base[2] + 0.4], Math.PI);
    g.actor('grandpa', [base[0] - 1.1, 0, base[2] + 0.8], Math.PI - 0.4);
    g.actor('moglin', [base[0] + 0.6, 0, base[2] + 0.5], Math.PI + 0.3);
    [['kid1', -1.5, -0.55], ['kid2', 1.5, -0.45], ['kid3', -0.75, -1.0], ['kid4', 0.8, -0.95]].forEach(([id, x, z]) => g.actor(id, [base[0] + x, 0, base[2] + z], Math.PI));
    yield g.shot('festival', 0);
    yield g.title('The Festival of Stars', 'The night of the eighth day');
    yield narr('Lanterns glowed in the Great Tree. The whole Hollow had gathered, and high on the platform, Mog-Mog waited.');
    yield g.shot('base', 40);
    g.converse('mog', 'grandpa');
    yield say('grandpa', "Here, lad. A star-flower. It's moonrise. Now or never!");
    g.actors.mog.hold = 'flower';
    g.anim('moglin', 'happy'); g.converse('mog', 'moglin');
    yield say('moglin', "Go on then, Mog. Take your best shot. I'll be right behind you. Kupo-ho!");
    g.anim('moglin', 'idle'); g.face('mog', Math.PI - 0.5);
    yield say('mog', 'Here goes... kupo!');
    g.anim('mog', 'flap');
    yield 50;
    const wings = S.wings >= NEED_WINGS, light = S.belly <= MAX_BELLY;
    let ending;
    if (!wings) {
      // ---- Grounded
      yield g.moveTo('mog', [base[0] - 0.3, 0.5, base[2] + 0.2], 40);
      yield say('mog', 'Come on... come ON, kupo...!');
      g.anim('mog', 'dizzy');
      yield g.moveTo('mog', [base[0] - 0.3, 0, base[2] + 0.3], 25);
      g.anim('mog', 'sad');
      yield narr("Mog's little wings beat and beat... but they just weren't strong enough.");
      g.anim('moglin', 'fly');
      yield say('moglin', 'My turn! Watch and learn!');
      yield g.shot('top', 40);
      yield g.moveTo('moglin', [SPOTS.top[0] + 0.45, SPOTS.top[1], SPOTS.top[2] + 0.3], 60, 0.8);
      g.anim('moglin', 'happy'); g.face('moglin', 'mogmog'); g.face('mogmog', 'moglin');
      yield say('moglin', 'A star-flower for the star of the Hollow, kupo!');
      yield say('mogmog', "Oh... Thank you, Moglin. That's... very sweet.");
      yield narr('Mog-Mog glanced down at the little moogle on the ground, just for a moment. Then she took the flower.');
      yield g.shot('festival', 40);
      g.music('goodnight');
      yield narr('Mog watched them from below, the star-flower wilting in his paw. Next year, he promised himself. Next year.');
      ending = 3;
    } else if (!light) {
      // ---- Splash!
      g.anim('mog', 'fly');
      yield g.moveTo('mog', [base[0] - 0.2, 1.6, base[2]], 60);
      yield say('mog', "I'm flying! I'm really... urp... too... many... nuts...!");
      g.anim('mog', 'dizzy');
      yield g.shot('pond', 40);
      yield g.moveTo('mog', [SPOTS.pond[0], 0.02, SPOTS.pond[2]], 70, 0.8);
      for (let i = 0; i < 24; i++) g.fx.add([SPOTS.pond[0], 0.1, SPOTS.pond[2]], [(Math.random() - 0.5) * 0.05, 0.03 + Math.random() * 0.04, (Math.random() - 0.5) * 0.05], 40, '#a0d0ff', 0.08, 0.002, 'alpha');
      MG.sfx('fire2', 0.5);
      yield narr('SPLASH!');
      g.anim('mog', 'sad');
      yield say('mog', '...Kupo. Blub.');
      yield narr('The whole Hollow roared with laughter. Even Mog-Mog giggled, though she hid it behind her paw.');
      g.anim('moglin', 'fly');
      yield g.moveTo('moglin', [SPOTS.top[0] + 0.45, SPOTS.top[1], SPOTS.top[2] + 0.3], 60, 0.8);
      g.music('goodnight');
      yield narr('And while Mog paddled back to shore, Moglin flew up to the platform, star-flower in paw.');
      ending = 2;
    } else {
      // ---- he flies
      g.anim('mog', 'fly');
      yield g.moveTo('mog', [base[0] - 0.2, 1.4, base[2]], 50);
      yield narr('Mog flapped once. Twice. And then the ground simply... let go of him.');
      yield g.shot('top', 60);
      yield g.moveTo('mog', [SPOTS.top[0] - 0.45, SPOTS.top[1], SPOTS.top[2] + 0.35], 90, 0.5);
      g.anim('mog', 'idle'); g.converse('mog', 'mogmog', 0.4);
      g.anim('mogmog', 'happy');
      yield say('mogmog', 'Mog! You... you flew! All the way up here!');
      g.anim('mogmog', 'idle');
      if (S.heart < 2) {
        // ---- Tongue-Tied
        yield say('mog', 'I... um... I...');
        yield narr("He'd practised the words all week. Now not a single one would come out.");
        yield say('mog', '...Nice... lanterns, kupo.');
        g.actor('moglin', [SPOTS.top[0] + 0.5, SPOTS.top[1], SPOTS.top[2] + 0.5], -1.2);
        yield say('moglin', "Excuse me! Pardon me! A star-flower for the lady, kupo!");
        yield say('mogmog', "...Oh. Thank you, Moglin.");
        g.music('goodnight');
        yield narr('Some things take more than strong wings to say. Mog flew home that night, the flower still in his paw.');
        ending = 4;
      } else {
        // ---- Wings of Love (and, with all his heart, Kupo Forever)
        yield say('mog', 'Mog-Mog... I flew all the way up here to give you this. And to tell you...');
        g.actors.mog.hold = null; g.actors.mogmog.hold = 'flower';
        yield say('mog', 'I love you, kupo!');
        g.hearts('mogmog', 10); g.anim('mogmog', 'happy');
        yield say('mogmog', 'Oh, Mog... I was hoping so much that it would be you.');
        g.hearts('mog', 8); g.anim('mog', 'happy');
        g.actor('moglin', [SPOTS.top[0] + 0.5, SPOTS.top[1], SPOTS.top[2] + 0.5], -1.2);
        yield say('moglin', "Wha-?! ...Well. Kupo. That was some flying, Mog. I guess the best moogle won.");
        yield g.shot('festival', 50);
        yield narr('Down below, the whole Hollow cheered. Grandpa Kupo wiped a tear from his beard.');
        yield say('grandpa', 'Ho ho! That’s my boy!');
        if (S.heart >= 3) {
          yield g.shot('top', 40);
          yield say('mogmog', 'Mog... will you fly with me? Just once around the stars?');
          g.hide('moglin');
          g.anim('mog', 'fly'); g.anim('mogmog', 'fly');
          const T = SPOTS.tree;
          // (the camera travels round the outside with them, looking in at the pair)
          const chase = (a, r, n) => g.shot('custom', n, [[T[0] + Math.cos(a) * (r + 3.4), 6.5, T[2] + Math.sin(a) * (r + 3.4)], [T[0] + Math.cos(a) * r, 5.8, T[2] + Math.sin(a) * r]]);
          yield chase(0, 3.1, 50);
          for (let lap = 0; lap < 2; lap++) for (let i = 0; i <= 8; i++) {
            const a = i / 8 * Math.PI * 2, r = 3.1;
            chase(a - 0.15, r, 22);
            g.moveTo('mog', [T[0] + Math.cos(a) * r, 5.7 + Math.sin(a * 2) * 0.3, T[2] + Math.sin(a) * r], 22);
            yield g.moveTo('mogmog', [T[0] + Math.cos(a - 0.25) * r, 5.8 + Math.sin(a * 2) * 0.3, T[2] + Math.sin(a - 0.25) * r], 22);
            if (i % 2 === 0) { g.hearts('mog', 3); for (let f = 0; f < 10; f++) g.fx.add([T[0] + (Math.random() - 0.5) * 6, 7 + Math.random() * 2, T[2] + (Math.random() - 0.5) * 6], [(Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02], 50, ['#ffe060', '#ff80c0', '#80e0ff'][f % 3], 0.12, 0.0005, 'add'); }
          }
          yield narr('And every year after, on the night of the Festival of Stars, two moogles could be seen dancing among the lanterns.');
          ending = 5;
        } else ending = 1;
      }
    }
    // ---- the end
    const bit = 1 << (ending - 1), was = FF7.state && FF7.state.vars ? (FF7.state.vars.mog_endings || 0) : 0;
    const now = was | bit, found = [0, 1, 2, 3, 4].filter(i => now & (1 << i)).length;
    g.status = false;
    yield g.title('THE END', `Ending ${ending}: ${ENDINGS[ending]}`, (was & bit ? '' : 'A new ending!  ') + `Endings found: ${found} / 5`);
    g.result = { won: ending === 1 || ending === 5, ending, name: ENDINGS[ending], found, endings: now, score: ending };
    g.done = true;
  }
  // ---- a day's activities
  function* feed(g) {
    const S = g.st;
    yield g.shot('house', 25);
    g.actors.mog.hold = 'nut'; g.anim('mog', 'eat');
    yield g.narr(S.belly >= 4 ? 'Mog squeezes down one more Kupo Nut. Just barely.' : 'Mog cracks open a crunchy Kupo Nut and munches away happily.');
    g.actors.mog.hold = null;
    S.wings++; S.belly++; S.fed++;
    g.pop('+1 Wings', '#ffe060'); g.pop('+1 Belly', '#f0c090');
    MG.sfx('item', 0.5);
    if (S.belly >= 5) { g.anim('mog', 'dizzy'); yield g.say('mog', "Hic! I can barely waddle, kupo..."); }
    else if (S.belly > MAX_BELLY) { g.anim('mog', 'idle'); yield g.say('mog', 'Hic! My tummy is getting awfully round, kupo...'); }
    else { g.anim('mog', 'happy'); yield g.say('mog', ['Mmm! I can feel it in my wings, kupo!', 'Crunchy! My wings are tingling!', 'One more nut, one step closer to Mog-Mog!'][S.fed % 3]); }
    g.anim('mog', 'idle');
  }
  function* practice(g) {
    const S = g.st;
    g.actor('mog', [SPOTS.stump[0], 0.33, SPOTS.stump[2]], 0.3);
    yield g.shot('stump', 30);
    if (S.belly <= 0) {
      g.anim('mog', 'sad');
      yield g.narr('Mog climbs onto the old stump and flaps... but his tummy rumbles louder than his wings.');
      yield g.say('mog', 'Too... hungry... to fly, kupo...');
      yield g.narr('(An empty belly means no practice. Feed him first!)');
      g.anim('mog', 'idle');
      return;
    }
    g.anim('mog', 'flap');
    yield g.narr('Mog climbs onto the old stump, takes a deep breath, and FLAPS!');
    const up = 0.33 + 0.25 + Math.min(S.wings, 5) * 0.12;
    g.anim('mog', 'fly');
    yield g.moveTo('mog', [SPOTS.stump[0], up, SPOTS.stump[2]], 30);
    yield Math.min(90, 20 + S.wings * 15);
    g.anim('mog', 'flap');
    yield g.moveTo('mog', [SPOTS.stump[0] + 0.5, 0, SPOTS.stump[2] + 0.35], 22);
    S.wings++; S.belly--; S.practiced++;
    g.pop('+1 Wings', '#ffe060'); g.pop('-1 Belly', '#a0e0ff');
    MG.sfx('item', 0.5);
    g.anim('mog', 'happy');
    yield g.say('mog', S.wings >= NEED_WINGS ? 'I looped the stump twice! My wings feel so strong, kupo!' : S.wings >= 3 ? 'Three whole seconds in the air! Did you see, kupo?' : 'I hovered for a whole second! That counts as flying, right, kupo?');
    g.anim('mog', 'idle');
  }
  function* visit(g) {
    const S = g.st;
    g.tod('day');
    g.actor('mogmog', [SPOTS.field[0] + 0.32, 0, SPOTS.field[2] + 0.75], -0.8); g.anim('mogmog', 'idle');
    g.actor('mog', [SPOTS.field[0] - 1.2, 0, SPOTS.field[2] + 1.1], 1.2);
    yield g.shot('field', 30);
    yield g.moveTo('mog', [SPOTS.field[0] - 0.32, 0, SPOTS.field[2] + 0.8], 30);
    g.converse('mog', 'mogmog');
    S.visits++;
    let gain = 1;
    if (S.visits === 1) {
      yield g.say('mogmog', 'Oh! Hello, Mog. Out picking flowers too, kupo?');
      yield g.say('mog', "Y-yes! I mean, I was just... these flowers are pretty. Like you. I mean - kupo!");
      g.hearts('mogmog', 5); g.anim('mogmog', 'happy');
      yield g.say('mogmog', "Hee hee! You're funny, Mog.");
    } else if (S.visits === 2) {
      yield g.say('mogmog', "Mog! I was hoping you'd come by today.");
      if (S.belly >= 4) yield g.say('mogmog', "...Have you been eating a lot of Kupo Nuts lately? Hee hee.");
      yield g.say('mogmog', "Are you going to the Festival of Stars? I love it... all the lanterns. I always dreamed someone would fly up to me.");
      const m = g.choose('What does Mog say?', ["I'll fly up to you! I promise, kupo!", "I'll... try, kupo.", "Moglin's faster than me..."], 'promise');
      const c = yield m;
      if (c === 0) { gain = 2; g.hearts('mogmog', 8); g.anim('mogmog', 'happy'); yield g.say('mogmog', "...Really? Then I'll be waiting for you, Mog. Only you."); }
      else if (c === 1) { yield g.say('mogmog', "Then I'll be watching for you, kupo."); }
      else { gain = 0; g.anim('mog', 'sad'); yield g.say('mogmog', "...Oh. I see. Well... maybe I'll see you there."); }
    } else {
      yield g.narr('They pick flowers together and talk about everything and nothing, until the shadows grow long.');
      g.anim('mogmog', 'happy'); g.hearts('mogmog', 5);
      yield g.say('mogmog', "Here - for you. So you don't forget me, kupo.");
      g.anim('mog', 'happy');
      yield g.say('mog', "I could never forget you, kupo!");
    }
    S.heart = clamp(S.heart + gain, 0, 3);
    if (gain) g.pop(`+${gain} Heart`, '#ff80b0');
    g.anim('mog', 'idle'); g.anim('mogmog', 'idle');
  }
  function* advice(g) {
    const S = g.st;
    g.advisedDay = S.day;
    g.actor('grandpa', [SPOTS.grandpa[0] + 0.1, 0, SPOTS.grandpa[2] + 0.45], 0.6);
    g.actor('mog', [SPOTS.grandpa[0] + 0.75, 0, SPOTS.grandpa[2] + 0.95], -2.4);
    yield g.shot('grandpa', 30);
    g.converse('mog', 'grandpa');
    yield g.say('mog', 'Grandpa Kupo... how am I doing, kupo?');
    const left = DAYS - S.day + 1, need = Math.max(0, NEED_WINGS - S.wings);
    if (need > left) yield g.say('grandpa', "Hmm... I won't lie to you, lad. Those wings need more days than you've got. But never stop trying!");
    else if (need > 0) yield g.say('grandpa', `Your wings need ${need} more good day${need === 1 ? '' : 's'} of work. Nuts or practice - both make them stronger.`);
    else yield g.say('grandpa', 'Your wings are ready, lad! Strong as any in the Hollow.');
    if (S.belly > MAX_BELLY) yield g.say('grandpa', `But look at that tummy! Practice will burn it off - you'll want it at ${MAX_BELLY} or less by the festival.`);
    else if (S.belly === 0 && need > 0) yield g.say('grandpa', 'And an empty belly is no good for practice. Eat a nut before you train.');
    if (S.heart < 2) yield g.say('grandpa', S.visits ? 'Go and see her again. Tell her how you feel - or at least tell her you’ll come!' : "Have you even spoken to her yet? Wings carry you up; it's heart that makes her listen.");
    else yield g.say('grandpa', 'And she already has a soft spot for you, ho ho! I can tell.');
    yield g.shot('house', 30);
    g.actor('mog', [SPOTS.house[0] + 0.1, 0, SPOTS.house[2] + 0.35], 0.4);
    g.hide('grandpa');
  }

  MG.register('mog_house', {
    title: "Mog's House",
    music: () => 'caitsith',
    pause: false,
    help: () => ({ title: "MOG'S HOUSE",
      lines: ["A moogle love story in seven days. Each day, choose what Mog does: eat a Kupo Nut, practise flying, or visit Mog-Mog. Grandpa Kupo's advice is free.",
        'Strong wings, a light belly and an honest heart... Five endings to find.'],
      controls: [[['ok'], 'Next / choose'], [['up', '/', 'down'], 'Pick'], [['cancel'], 'Fast-forward (hold)']] }),
    create: (opts) => new MogHouse(opts),
  });
})();
